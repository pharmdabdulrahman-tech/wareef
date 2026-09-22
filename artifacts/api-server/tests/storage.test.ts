import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import express from "express";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "@workspace/db";
import { requireAuthWith } from "../src/middleware/requireAuth";
import { ObjectNotFoundError, ObjectStorageService } from "../src/lib/objectStorage";
import { privateObjectCachePolicy, servePrivateObject } from "../src/routes/storage";

test("private photo HTTP responses never cache and recheck terminal access", async (t) => {
  const customer = "synthetic-photo-owner";
  const token = createHash("sha256").update(customer).digest("base64url");
  const objectPath = `/objects/uploads/${token}/photo`;
  let status = "accepted";
  let downloads = 0;
  let missing = false;
  let claimed = true;
  // Evaluate the real route's SQL eligibility parameters against this fixture.
  t.mock.method(db, "select", () => ({
    from() { return this; },
    innerJoin() { return this; },
    where(predicate: Parameters<PgDialect["sqlToQuery"]>[0]) {
      const { params } = new PgDialect().sqlToQuery(predicate);
      assert.ok(params.includes("accepted"));
      assert.ok(params.includes("completed"));
      assert.ok(!params.includes("cancelled"));
      assert.ok(params.includes("service"));
      assert.ok(params.includes("provider_owner"));
      assert.ok(params.includes(true));
      return Promise.resolve(
        params.includes(status) && params.includes("synthetic-specialist")
          ? [{ customerId: customer, booking: { photoPaths: [objectPath] } }]
          : [],
      );
    },
  }));
  t.mock.method(ObjectStorageService.prototype, "isClaimedBy", async (_path, owner) => {
    assert.equal(owner, customer);
    return claimed;
  });
  t.mock.method(ObjectStorageService.prototype, "getFile", async () => {
    if (missing) throw new ObjectNotFoundError();
    return {};
  });
  t.mock.method(ObjectStorageService.prototype, "download", async () => {
    downloads++;
    return { contentType: "image/jpeg", size: 5, stream: Readable.from(Buffer.from("photo")) };
  });
  const app = express();
  app.get(
    "/storage/objects/*path",
    privateObjectCachePolicy,
    requireAuthWith((req) => req.header("x-test-user")),
    servePrivateObject,
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/storage${objectPath}`;
  async function request(user: string | null, expected: number) {
    const response = await fetch(url, {
      headers: user ? { "x-test-user": user } : {},
    });
    assert.equal(response.status, expected);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.text();
    if (expected === 200) {
      assert.equal(response.headers.get("content-type"), "image/jpeg");
      assert.equal(body, "photo");
    } else {
      assert.notEqual(body, "photo");
    }
  }
  await request("synthetic-specialist", 200);
  status = "completed";
  await request("synthetic-specialist", 200);
  status = "cancelled";
  const beforeDenied = downloads;
  await request("synthetic-specialist", 403);
  assert.equal(downloads, beforeDenied);
  await request(customer, 200);
  for (status of ["pending", "rejected"]) {
    await request("synthetic-specialist", 403);
    await request(customer, 200);
  }
  status = "completed";
  await request("unrelated-specialist", 403);
  claimed = false;
  await request("synthetic-specialist", 403);
  await request(null, 401);
  missing = true;
  await request(customer, 404);
});