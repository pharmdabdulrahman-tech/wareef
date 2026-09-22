import assert from "node:assert/strict";
import test from "node:test";
import type { Order } from "@workspace/db";
import { providerCanAccessPrivateBooking } from "../src/lib/bookingAccess";
import {
  requireRoleWith,
} from "../src/middleware/requireAuth";
import {
  parseResponse,
  providerOrderOutput,
  providerTransitionSource,
} from "../src/routes/provider";

function responseRecorder() {
  let status: number | undefined;
  let body: unknown;
  return {
    response: {
      status(code: number) {
        status = code;
        return this;
      },
      json(value: unknown) {
        body = value;
        return this;
      },
    },
    result: () => ({ status, body }),
  };
}

test("database role middleware rejects a customer from owner/admin surfaces", async () => {
  const [, roleMiddleware] = requireRoleWith(
    async () => "customer",
    "provider_owner",
  );
  const recorder = responseRecorder();
  let nextCalled = false;
  await roleMiddleware(
    { userId: "customer-a" } as Parameters<typeof roleMiddleware>[0],
    recorder.response as Parameters<typeof roleMiddleware>[1],
    (() => {
      nextCalled = true;
    }) as Parameters<typeof roleMiddleware>[2],
  );
  assert.deepEqual(recorder.result(), {
    status: 403,
    body: { error: "Forbidden" },
  });
  assert.equal(nextCalled, false);
});

test("database role middleware admits only the requested server role", async () => {
  const [, roleMiddleware] = requireRoleWith(
    async () => "provider_owner",
    "provider_owner",
  );
  const recorder = responseRecorder();
  let nextCalled = false;
  await roleMiddleware(
    { userId: "owner-a" } as Parameters<typeof roleMiddleware>[0],
    recorder.response as Parameters<typeof roleMiddleware>[1],
    (() => {
      nextCalled = true;
    }) as Parameters<typeof roleMiddleware>[2],
  );
  assert.equal(recorder.result().status, undefined);
  assert.equal(nextCalled, true);
});

const baseOrder: Order = {
  id: "7a355933-fd71-4711-b1a6-838aaa2cc56a",
  userId: "customer-a",
  kind: "service",
  items: [{ id: "maintenance", name: "Maintenance", quantity: 1 }],
  details: null,
  providerId: "owner-a",
  booking: {
    location: "Exact private address",
    taskIds: ["cleaning"],
    preferredTime: "2026-09-30T12:00:00.000Z",
    photoPaths: ["/objects/uploads/private/photo"],
  },
  status: "pending",
  responseReason: null,
  respondedAt: null,
  cancellationReason: null,
  cancelledAt: null,
  cancelledBy: null,
  completedAt: null,
  idempotencyKey: "test-key",
  requestHash: "hash",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
};

test("provider privacy transitions expose exact address/photos only after acceptance", () => {
  const pending = providerOrderOutput(baseOrder, "owner-a");
  assert.equal(pending.booking?.location, null);
  assert.deepEqual(pending.booking?.photoPaths, []);

  const rejected = providerOrderOutput(
    {
      ...baseOrder,
      status: "rejected",
      responseReason: "Outside service area",
    },
    "owner-a",
  );
  assert.equal(rejected.booking?.location, null);
  assert.deepEqual(rejected.booking?.photoPaths, []);

  const accepted = providerOrderOutput(
    {
      ...baseOrder,
      status: "accepted",
      respondedAt: new Date("2026-09-02T00:00:00.000Z"),
    },
    "owner-a",
  );
  assert.equal(accepted.booking?.location, "Exact private address");
  assert.deepEqual(accepted.booking?.photoPaths, [
    "/objects/uploads/private/photo",
  ]);
  const completed = providerOrderOutput(
    { ...baseOrder, status: "completed" },
    "owner-a",
  );
  assert.equal(completed.booking?.location, "Exact private address");
  assert.deepEqual(completed.booking?.photoPaths, [
    "/objects/uploads/private/photo",
  ]);
  const cancelled = providerOrderOutput(
    { ...baseOrder, status: "cancelled" },
    "owner-a",
  );
  assert.equal(cancelled.booking?.location, null);
  assert.deepEqual(cancelled.booking?.photoPaths, []);
  assert.throws(
    () => providerOrderOutput(baseOrder, "different-owner"),
    /not assigned/,
  );
});

test("responses are bounded and rejection requires a reason", () => {
  assert.deepEqual(parseResponse({ status: "accepted" }), {
    status: "accepted",
    reason: null,
  });
  assert.throws(() => parseResponse({ status: "rejected" }));
  assert.deepEqual(
    parseResponse({ status: "rejected", reason: "Outside service area" }),
    { status: "rejected", reason: "Outside service area" },
  );
  assert.throws(() =>
    parseResponse({ status: "accepted", role: "provider_owner" }),
  );
  assert.deepEqual(parseResponse({ status: "completed" }), {
    status: "completed",
    reason: null,
  });
  assert.throws(() => parseResponse({ status: "cancelled", reason: "   " }));
  assert.deepEqual(parseResponse({ status: "cancelled", reason: "Customer asked" }), {
    status: "cancelled",
    reason: "Customer asked",
  });
  assert.throws(() =>
    parseResponse({ status: "cancelled", reason: "x".repeat(1001) }),
  );
});

test("provider stale terminal retries cannot match the atomic source predicate", () => {
  assert.equal(providerTransitionSource("accepted"), "pending");
  assert.equal(providerTransitionSource("rejected"), "pending");
  assert.equal(providerTransitionSource("completed"), "accepted");
  assert.equal(providerTransitionSource("cancelled"), "accepted");
  assert.notEqual("completed", providerTransitionSource("completed"));
  assert.notEqual("cancelled", providerTransitionSource("cancelled"));
});

test("canonical private booking access survives completion but not cancellation", () => {
  assert.equal(providerCanAccessPrivateBooking("pending"), false);
  assert.equal(providerCanAccessPrivateBooking("accepted"), true);
  assert.equal(providerCanAccessPrivateBooking("completed"), true);
  assert.equal(providerCanAccessPrivateBooking("cancelled"), false);
  assert.equal(providerCanAccessPrivateBooking("rejected"), false);
});