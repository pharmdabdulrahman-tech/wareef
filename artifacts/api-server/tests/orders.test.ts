import assert from "node:assert/strict";
import test from "node:test";
import {
  allowsIncompleteDemoBooking,
  orderRequestHash,
  parseOrderRequest,
  validateServiceRequestDetails,
} from "../src/lib/orderRequest";
import { requireAuthWith } from "../src/middleware/requireAuth";
import {
  customerCancellableStatuses,
  parseCustomerCancellation,
} from "../src/routes/orders";

const validRequest = {
  kind: "product" as const,
  items: [{ id: "garden-care", name: "Garden care", quantity: 1 }],
  details: "Please call before arriving",
  idempotencyKey: "request-1",
};

const validServiceRequest = {
  kind: "service" as const,
  providerId: "approved-provider",
  items: [
    { id: "maintenance", name: "Garden cleaning & maintenance", quantity: 1 },
  ],
  booking: {
    gardenName: "Home garden",
    location: "Al Olaya, Riyadh",
    taskIds: ["cleaning"],
    needs: { approximateAreaM2: 80 },
    preferredTime: "2026-06-15T16:00:00.000Z",
    photoPaths: ["/objects/uploads/owner-token/photo-id"],
  },
  idempotencyKey: "service-request-1",
};

test("order validation accepts the bounded contract", () => {
  assert.deepEqual(parseOrderRequest(validRequest), validRequest);
});

test("service requests require provider, structured booking and assessment fields", () => {
  const parsed = parseOrderRequest(validServiceRequest);
  validateServiceRequestDetails(parsed, false);
  assert.equal(parsed.providerId, "approved-provider");
  assert.equal(parsed.booking?.preferredTime, "2026-06-15T16:00:00.000Z");

  assert.throws(() =>
    parseOrderRequest({ ...validServiceRequest, providerId: undefined }),
  );
  assert.throws(() =>
    parseOrderRequest({ ...validServiceRequest, booking: undefined }),
  );
  assert.throws(() =>
    validateServiceRequestDetails(
      parseOrderRequest({
        ...validServiceRequest,
        booking: { ...validServiceRequest.booking, photoPaths: [] },
      }),
      false,
    ),
  );
  assert.throws(() =>
    validateServiceRequestDetails(
      parseOrderRequest({
        ...validServiceRequest,
        booking: { ...validServiceRequest.booking, needs: undefined },
      }),
      false,
    ),
  );
  assert.throws(() =>
    validateServiceRequestDetails(
      parseOrderRequest({
        ...validServiceRequest,
        booking: { ...validServiceRequest.booking, preferredTime: "not-a-time" },
      }),
      false,
    ),
  );
});

test("verified development demo permits a zero-detail booking only", () => {
  const zeroDetailRequest = parseOrderRequest({
    ...validServiceRequest,
    booking: {
      location: "",
      taskIds: [],
      preferredTime: "",
    },
  });

  assert.doesNotThrow(() => validateServiceRequestDetails(zeroDetailRequest, true));
  assert.throws(() => validateServiceRequestDetails(zeroDetailRequest, false));
  assert.equal(allowsIncompleteDemoBooking(true, "development"), true);
  assert.equal(allowsIncompleteDemoBooking(false, "development"), false);
  assert.equal(allowsIncompleteDemoBooking(true, "production"), false);
  assert.throws(() =>
    parseOrderRequest({
      ...validServiceRequest,
      isDemo: true,
      booking: { location: "", taskIds: [], preferredTime: "" },
    }),
  );
});

test("tree and stump assessment tasks remain inspection-specific", () => {
  assert.throws(() =>
    validateServiceRequestDetails(
      parseOrderRequest({
        ...validServiceRequest,
        booking: {
          ...validServiceRequest.booking,
          taskIds: ["trees"],
          needs: { standingTreeCount: 1 },
        },
      }),
      false,
    ),
  );
  assert.doesNotThrow(() =>
    validateServiceRequestDetails(
      parseOrderRequest({
        ...validServiceRequest,
        booking: {
          ...validServiceRequest.booking,
          taskIds: ["trees", "stumps"],
          needs: {
            standingTreeCount: 1,
            stumpOrRootAreaCount: 2,
            treeAccessDetails: "Narrow gate and a wall nearby",
          },
        },
      }),
      false,
    ),
  );
});

test("legacy product requests reject service-only fields", () => {
  assert.throws(() =>
    parseOrderRequest({ ...validRequest, providerId: "provider" }),
  );
});

test("order validation rejects invalid quantities, empty items, and unknown identity", () => {
  assert.throws(() =>
    parseOrderRequest({
      ...validRequest,
      items: [{ ...validRequest.items[0], quantity: 0 }],
    }),
  );
  assert.throws(() => parseOrderRequest({ ...validRequest, items: [] }));
  assert.throws(() =>
    parseOrderRequest({ ...validRequest, userId: "client-supplied-user" }),
  );
});

test("idempotency hash is stable and changes with the request payload", () => {
  const parsed = parseOrderRequest(validRequest);
  assert.equal(orderRequestHash(parsed), orderRequestHash(parsed));
  assert.notEqual(
    orderRequestHash(parsed),
    orderRequestHash(
      parseOrderRequest({
        ...validRequest,
        items: [{ ...validRequest.items[0], quantity: 2 }],
      }),
    ),
  );
});

test("authentication middleware rejects a request without Clerk identity", () => {
  let status: number | undefined;
  let body: unknown;
  let nextCalled = false;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };

  const middleware = requireAuthWith(() => null);
  middleware(
    {} as Parameters<typeof middleware>[0],
    response as Parameters<typeof middleware>[1],
    (() => {
      nextCalled = true;
    }) as Parameters<typeof middleware>[2],
  );

  assert.equal(status, 401);
  assert.deepEqual(body, { error: "Unauthorized" });
  assert.equal(nextCalled, false);
});

test("customer cancellation accepts only a bounded nonblank reason", () => {
  assert.deepEqual(
    parseCustomerCancellation({
      status: "cancelled",
      reason: "  Plans changed  ",
    }),
    { status: "cancelled", reason: "Plans changed" },
  );
  assert.throws(() =>
    parseCustomerCancellation({ status: "cancelled", reason: "   " }),
  );
  assert.throws(() =>
    parseCustomerCancellation({
      status: "cancelled",
      reason: "x".repeat(1001),
    }),
  );
  assert.throws(() =>
    parseCustomerCancellation({ status: "completed", reason: "No" }),
  );
  assert.throws(() =>
    parseCustomerCancellation({
      status: "cancelled",
      reason: "No",
      userId: "other-customer",
    }),
  );
});

test("customer terminal retries cannot satisfy the atomic source-state predicate", () => {
  assert.equal(customerCancellableStatuses.includes("pending"), true);
  assert.equal(customerCancellableStatuses.includes("accepted"), true);
  assert.equal(
    customerCancellableStatuses.includes(
      "completed" as (typeof customerCancellableStatuses)[number],
    ),
    false,
  );
  assert.equal(
    customerCancellableStatuses.includes(
      "cancelled" as (typeof customerCancellableStatuses)[number],
    ),
    false,
  );
});