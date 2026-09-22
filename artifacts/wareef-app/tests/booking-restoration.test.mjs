import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const customerSource = await readFile(new URL("../src/pages/customer.tsx", import.meta.url), "utf8");
const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("active service booking wins over home and legacy cart restoration", () => {
  assert.match(
    customerSource,
    /bookingDraft && \(initialView === undefined \|\| initialView === "review"\)[\s\S]*\? "booking"[\s\S]*restored\?\.items\.length/,
  );
});

test("Clerk return recognizes the persistent service booking draft", () => {
  assert.match(appSource, /localStorage\.getItem\('wareef_service_booking_v2'\)[\s\S]*'\/review'/);
});

test("saved request history renders provider and structured booking details", () => {
  assert.match(customerSource, /order\.providerId/);
  assert.match(customerSource, /order\.booking\.taskIds/);
  assert.match(customerSource, /order\.booking\.preferredTime/);
  assert.match(customerSource, /order\.booking\.needs/);
});