import { createHash } from "node:crypto";
import { CreateOrderBody } from "@workspace/api-zod";

const allowedOrderKeys = new Set([
  "kind",
  "items",
  "details",
  "providerId",
  "booking",
  "idempotencyKey",
]);
const allowedItemKeys = new Set(["id", "name", "quantity"]);
const allowedBookingKeys = new Set([
  "gardenName",
  "location",
  "taskIds",
  "notes",
  "needs",
  "preferredTime",
  "photoPaths",
]);
const allowedNeedsKeys = new Set([
  "approximateAreaM2",
  "shrubCount",
  "standingTreeCount",
  "stumpOrRootAreaCount",
  "treeAccessDetails",
]);
const maintenanceTaskIds = new Set([
  "cleaning",
  "weeding",
  "mowing",
  "shrubs",
  "trees",
  "stumps",
]);

function hasOnlyKeys(value: unknown, allowed: ReadonlySet<string>) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

export function parseOrderRequest(value: unknown) {
  if (!hasOnlyKeys(value, allowedOrderKeys)) {
    throw new Error("Invalid order request");
  }
  const body = CreateOrderBody.parse(value);
  if (!body.items.every((item) => hasOnlyKeys(item, allowedItemKeys))) {
    throw new Error("Invalid order request");
  }
  if (body.kind === "product") {
    if (body.providerId !== undefined || body.booking !== undefined) {
      throw new Error("Invalid order request");
    }
    return body;
  }
  if (
    !body.providerId ||
    !body.booking ||
    !hasOnlyKeys(body.booking, allowedBookingKeys) ||
    (body.booking.needs !== undefined &&
      !hasOnlyKeys(body.booking.needs, allowedNeedsKeys))
  ) {
    throw new Error("Invalid order request");
  }

  const selectedServices = new Set(body.items.map((item) => item.id));
  const booking = body.booking;
  if (
    booking.taskIds.some((taskId) => !maintenanceTaskIds.has(taskId)) ||
    (!selectedServices.has("maintenance") && booking.taskIds.length > 0)
  ) {
    throw new Error("Invalid order request");
  }

  return body;
}

export function allowsIncompleteDemoBooking(
  providerIsDemo: boolean,
  nodeEnv = process.env.NODE_ENV,
) {
  return providerIsDemo && nodeEnv === "development";
}

export function validateServiceRequestDetails(
  body: ReturnType<typeof parseOrderRequest>,
  allowIncompleteDemoBooking: boolean,
) {
  if (body.kind !== "service" || !body.booking) {
    return;
  }
  if (allowIncompleteDemoBooking) {
    return;
  }

  const selectedServices = new Set(body.items.map((item) => item.id));
  const booking = body.booking;
  if (
    !booking.location.trim() ||
    Number.isNaN(Date.parse(booking.preferredTime))
  ) {
    throw new Error("Invalid order request");
  }
  if (selectedServices.has("maintenance")) {
    if (
      booking.taskIds.length === 0 ||
      !booking.photoPaths?.length
    ) {
      throw new Error("Invalid order request");
    }
    const needs = booking.needs;
    if (
      (booking.taskIds.some((id) =>
        ["cleaning", "weeding", "mowing"].includes(id),
      ) &&
        needs?.approximateAreaM2 === undefined) ||
      (booking.taskIds.includes("shrubs") && needs?.shrubCount === undefined) ||
      (booking.taskIds.includes("trees") &&
        (needs?.standingTreeCount === undefined ||
          !needs.treeAccessDetails?.trim())) ||
      (booking.taskIds.includes("stumps") &&
        (needs?.stumpOrRootAreaCount === undefined ||
          !needs.treeAccessDetails?.trim()))
    ) {
      throw new Error("Invalid order request");
    }
  }
}

export function orderRequestHash(body: ReturnType<typeof parseOrderRequest>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        kind: body.kind,
        items: body.items,
        ...(body.details === undefined ? {} : { details: body.details }),
        ...(body.providerId === undefined ? {} : { providerId: body.providerId }),
        ...(body.booking === undefined ? {} : { booking: body.booking }),
      }),
    )
    .digest("hex");
}