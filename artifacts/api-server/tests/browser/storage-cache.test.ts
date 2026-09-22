import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { Readable } from "node:stream";
import test from "node:test";
import express from "express";
import { chromium, type Page } from "playwright-core";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "@workspace/db";
import { requireAuthWith } from "../../src/middleware/requireAuth";
import { ObjectStorageService } from "../../src/lib/objectStorage";
import { privateObjectCachePolicy, servePrivateObject } from "../../src/routes/storage";

// Real HTTP + Chromium cache; only identity, persistence and object bytes are fixtures.
// Never use page.route/context.route: Playwright routing disables HTTP caching.
test("Chromium rechecks canonical photos after cancellation with its cache enabled", { timeout: 60_000 }, async (t) => {
  const owner = "cache-fixture-owner";
  const provider = "cache-fixture-provider";
  const ownerToken = createHash("sha256").update(owner).digest("base64url");
  const bookings = [
    { name: "customer-cancels", status: "accepted" },
    { name: "provider-cancels", status: "accepted" },
    { name: "provider-completes", status: "accepted" },
  ].map((booking) => ({
    ...booking,
    path: `/objects/uploads/${ownerToken}/${booking.name}`,
  }));
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  t.mock.method(db, "select", () => ({
    from() { return this; },
    innerJoin() { return this; },
    where(predicate: Parameters<PgDialect["sqlToQuery"]>[0]) {
      const { params } = new PgDialect().sqlToQuery(predicate);
      return Promise.resolve(bookings
        .filter((booking) => params.includes(provider) && params.includes(booking.status))
        .map((booking) => ({ customerId: owner, booking: { photoPaths: [booking.path] } })));
    },
  }));
  t.mock.method(ObjectStorageService.prototype, "isClaimedBy", async (_path, user) => user === owner);
  t.mock.method(ObjectStorageService.prototype, "getFile", async () => ({}));
  let downloads = 0;
  t.mock.method(ObjectStorageService.prototype, "download", async () => {
    downloads++;
    return { contentType: "image/png", size: png.length, stream: Readable.from(png) };
  });

  const requests = new Map<string, number>();
  let controlRequests = 0;
  const app = express();
  app.get("/", (_req, res) => res.type("html").send("<!doctype html><title>Photo cache regression</title>"));
  app.get("/cache-control.png", (_req, res) => {
    controlRequests++;
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.type("png").send(png);
  });
  app.get("/api/storage/objects/*path", (req, _res, next) => {
    requests.set(req.path, (requests.get(req.path) ?? 0) + 1);
    next();
  }, privateObjectCachePolicy,
  // Test-only cookie reader on a loopback server; no real accounts or auth bypass in the app.
  requireAuthWith((req) => req.headers.cookie?.match(/fixture-user=([^;]+)/)?.[1]),
  servePrivateObject);
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
    || (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined);
  const browser = await chromium.launch({ executablePath, headless: true });
  t.after(() => browser.close());
  const providerContext = await browser.newContext();
  const ownerContext = await browser.newContext();
  for (const [context, user] of [[providerContext, provider], [ownerContext, owner]] as const) {
    await context.addCookies([{ name: "fixture-user", value: user, url: origin }]);
  }
  const providerPage = await providerContext.newPage();
  const ownerPage = await ownerContext.newPage();
  await Promise.all([providerPage.goto(origin), ownerPage.goto(origin)]);

  async function readPhoto(page: Page, path: string) {
    // Browser fetch defaults, exact stable URL, no headers/nonces/cache override/reload.
    return page.evaluate(async (url) => {
      const response = await fetch(url);
      return {
        status: response.status,
        bytes: Array.from(new Uint8Array(await response.arrayBuffer())),
        policy: response.headers.get("cache-control"),
      };
    }, path);
  }
  async function imageLoads(page: Page, path: string) {
    return page.evaluate((url) => new Promise<boolean>((resolve) => {
      const img = document.createElement("img");
      img.onload = () => { img.remove(); resolve(true); };
      img.onerror = () => { img.remove(); resolve(false); };
      img.src = url;
      document.body.append(img);
    }), path);
  }
  // Positive control prevents a false pass from an accidentally disabled browser cache.
  for (let i = 0; i < 2; i++) {
    assert.equal((await readPhoto(providerPage, "/cache-control.png")).status, 200);
  }
  assert.equal(controlRequests, 1, "second cacheable response must come from Chromium cache");

  for (const booking of bookings) {
    const path = `/api/storage${booking.path}`;
    for (const page of [providerPage, ownerPage]) {
      const response = await readPhoto(page, path);
      assert.equal(response.status, 200);
      assert.deepEqual(response.bytes, [...png]);
      assert.equal(response.policy, "private, no-store");
      assert.equal(await imageLoads(page, path), true);
    }
    // Independent accepted -> terminal fixtures; never completed -> cancelled.
    booking.status = booking.name === "provider-completes" ? "completed" : "cancelled";
    const beforeRequests = requests.get(path)!;
    const beforeDownloads = downloads;
    const expected = booking.status === "cancelled" ? 403 : 200;
    const after = await readPhoto(providerPage, path);
    assert.equal(after.status, expected, booking.name);
    assert.equal(after.policy, "private, no-store");
    assert.equal(requests.get(path), beforeRequests + 1, "canonical URL must reach authorization again");
    if (expected === 403) {
      assert.notDeepEqual(after.bytes, [...png]);
      assert.equal(downloads, beforeDownloads, "denied request must not read private bytes");
    } else {
      assert.deepEqual(after.bytes, [...png]);
    }
    assert.equal(await imageLoads(providerPage, path), expected === 200, "new image must not reuse cancelled photo");
    const ownerAfter = await readPhoto(ownerPage, path);
    assert.equal(ownerAfter.status, 200, "customer retains their own photo");
    assert.deepEqual(ownerAfter.bytes, [...png]);
    assert.equal(await imageLoads(ownerPage, path), true);
  }
});