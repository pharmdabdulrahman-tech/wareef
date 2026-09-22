/*
 * Browser-harness test for Wareef's authenticated profile journey.
 *
 * Run in the supported Playwright test harness where `page`, `newBrowserContext`,
 * `signInClerkUser`, `expect`, `nanoid`, and `REPLIT_DEV_DOMAIN` are available.
 * Load this file, then await runWareefAccountProfileJourney(). It creates
 * a fresh synthetic identity and does not contain credentials, session tokens,
 * or Clerk implementation details.
 */
async function runWareefAccountProfileJourney() {
  const baseURL = `https://${REPLIT_DEV_DOMAIN}`;
  const identity = {
    firstName: "Wareef",
    lastName: "E2E",
    email: `wareef-${nanoid(12)}@example.com`,
  };
  const values = {
    name: `Wareef UI ${nanoid(8)}`,
    phone: `+1415555${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
    city: "Jeddah",
  };
  const context = await newBrowserContext({ baseURL, timezoneId: "UTC" });
  const page = await context.newPage();
  const api = (tab, method, path, body) => tab.evaluate(async ({ method, path, body }) => {
    const response = await fetch(path, {
      method, headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }, { method, path, body });
  const assertPrivate = async (tab) => {
    for (const [method, path] of [
      ["GET", "/api/me"], ["GET", "/api/me/security-summary"], ["PATCH", "/api/me"],
    ]) {
      expect((await api(tab, method, path, method === "PATCH" ? { displayName: "Unauthorized edit" } : undefined)).status).toBe(401);
    }
  };
  await page.goto(`${baseURL}/`);
  await assertPrivate(page);
  const signInUrl = await signInClerkUser({
    ...identity,
    ttl: 3600,
    basePath: "/account",
  });
  await page.goto(signInUrl);
  await expect(page.getByTestId("input-display-name")).toBeVisible();
  const initial = await api(page, "GET", "/api/me");
  expect(initial.status).toBe(200);
  expect(initial.data.role).toBe("customer");
  for (const role of ["admin", "provider"]) {
    const attempt = await api(page, "PATCH", "/api/me", { role, id: "user_protected_field_attempt" });
    expect([200, 400, 403, 422]).toContain(attempt.status);
    const unchanged = await api(page, "GET", "/api/me");
    expect(unchanged.data.id).toBe(initial.data.id);
    expect(unchanged.data.role).toBe("customer");
  }
  await page.getByTestId("input-display-name").fill(values.name);
  await page.getByTestId("input-phone").fill(values.phone);
  await page.getByTestId("input-city").fill(values.city);
  await page.getByTestId("button-save").click();
  await expect(page.getByTestId("button-save")).toHaveText(/Saved|تم الحفظ/);
  await page.reload();
  await expect(page.getByTestId("input-display-name")).toHaveValue(values.name);
  await expect(page.getByTestId("input-phone")).toHaveValue(values.phone);
  await expect(page.getByTestId("input-city")).toHaveValue(values.city);
  await page.getByTestId("button-sign-out").click();
  await expect(page.getByTestId("link-sign-in")).toBeVisible();
  await assertPrivate(page);

  const freshContext = await newBrowserContext({ baseURL, timezoneId: "UTC" });
  const freshPage = await freshContext.newPage();
  const freshSignInUrl = await signInClerkUser({
    ...identity,
    ttl: 3600,
    basePath: "/account",
  });
  await freshPage.goto(freshSignInUrl);
  await expect(freshPage.getByTestId("input-display-name")).toHaveValue(values.name);
  await expect(freshPage.getByTestId("input-phone")).toHaveValue(values.phone);
  await expect(freshPage.getByTestId("input-city")).toHaveValue(values.city);
  const restored = await api(freshPage, "GET", "/api/me");
  expect(restored.data.id).toBe(initial.data.id);
  expect(restored.data.role).toBe("customer");
  await context.close();
  await freshContext.close();
  return { identity, values };
}
