import assert from "node:assert/strict";
import test from "node:test";
import { initialCustomerValues } from "../src/lib/currentUser";

test("lazy account initialization relies on the database customer default", () => {
  const values = initialCustomerValues("clerk-user", "New customer");
  assert.deepEqual(values, {
    id: "clerk-user",
    displayName: "New customer",
  });
  assert.equal("role" in values, false);
});