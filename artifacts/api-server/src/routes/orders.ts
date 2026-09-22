import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  CreateOrderResponse,
  GetOrdersResponse,
} from "@workspace/api-zod";
import {
  db,
  ordersTable,
  providerProfilesTable,
  usersTable,
  type Order,
  type ServiceBooking,
} from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";
import { ensureDevelopmentDemoProvider } from "../lib/demoFixture";
import {
  allowsIncompleteDemoBooking,
  orderRequestHash,
  parseOrderRequest,
  validateServiceRequestDetails,
} from "../lib/orderRequest";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();
export const customerCancellableStatuses = ["pending", "accepted"] as const;

function createdOutput(order: Order) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
  };
}

function orderOutput(order: Order) {
  return {
    id: order.id,
    kind: order.kind,
    items: order.items,
    details: order.details,
    providerId: order.providerId,
    booking: order.booking,
    status: order.status,
    responseReason: order.responseReason,
    respondedAt: order.respondedAt,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt,
    cancelledBy: order.cancelledBy,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
  };
}

export function parseCustomerCancellation(
  body: unknown,
): { status: "cancelled"; reason: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Invalid cancellation");
  }
  const value = body as Record<string, unknown>;
  if (
    Object.keys(value).some((key) => !["status", "reason"].includes(key)) ||
    value.status !== "cancelled" ||
    typeof value.reason !== "string"
  ) {
    throw new Error("Invalid cancellation");
  }
  const reason = value.reason.trim();
  if (!reason || reason.length > 1000) {
    throw new Error("A cancellation reason is required");
  }
  return { status: "cancelled", reason };
}

router.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const body = parseOrderRequest(req.body);
    let serviceProviderId: string | undefined;
    let serviceBooking: ServiceBooking | undefined;
    if (body.kind === "service") {
      if (!body.providerId || !body.booking) {
        throw new Error("Invalid order request");
      }
      serviceProviderId = body.providerId;
      await ensureDevelopmentDemoProvider();
      serviceBooking = {
        ...body.booking,
        preferredTime: body.booking.preferredTime,
      };
      const provider = await db
        .select({
          id: providerProfilesTable.id,
          serviceIds: providerProfilesTable.serviceIds,
          isDemo: providerProfilesTable.isDemo,
        })
        .from(providerProfilesTable)
        .innerJoin(usersTable, eq(usersTable.id, providerProfilesTable.id))
        .where(
          and(
            eq(providerProfilesTable.id, serviceProviderId),
            eq(providerProfilesTable.approved, true),
            eq(providerProfilesTable.status, "approved"),
            eq(usersTable.role, "provider_owner"),
            ...(process.env.NODE_ENV === "development"
              ? []
              : [eq(providerProfilesTable.isDemo, false)]),
          ),
        )
        .limit(1);
      const supported = new Set(provider[0]?.serviceIds ?? []);
      if (
        !provider[0] ||
        body.items.some((item) => !supported.has(item.id))
      ) {
        res.status(409).json({
          error: "Provider is not approved for every selected service",
        });
        return;
      }
      validateServiceRequestDetails(
        body,
        allowsIncompleteDemoBooking(provider[0].isDemo),
      );
      for (const path of serviceBooking.photoPaths ?? []) {
        await storage.claimForOwner(path, req.userId);
      }
    }
    const hash = orderRequestHash(body);
    const [created] = await db
      .insert(ordersTable)
      .values({
        id: randomUUID(),
        userId: req.userId,
        kind: body.kind,
        items: body.items,
        details: body.details,
        providerId: serviceProviderId,
        booking: serviceBooking,
        idempotencyKey: body.idempotencyKey,
        requestHash: hash,
      })
      .onConflictDoNothing({
        target: [ordersTable.userId, ordersTable.idempotencyKey],
      })
      .returning();

    const order =
      created ??
      (await db.query.ordersTable.findFirst({
        where: and(
          eq(ordersTable.userId, req.userId),
          eq(ordersTable.idempotencyKey, body.idempotencyKey),
        ),
      }));

    if (!order) {
      throw new Error("Idempotent order could not be loaded");
    }
    if (order.requestHash !== hash) {
      res.status(409).json({
        error: "Idempotency key was already used with a different request",
      });
      return;
    }

    res.status(201).json(CreateOrderResponse.parse(createdOutput(order)));
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "ZodError" || error.message === "Invalid order request")
    ) {
      res.status(400).json({ error: "Invalid order request" });
      return;
    }
    if (
      error instanceof Error &&
      (error.message === "Photo path is not owned by the customer" ||
        error.message === "Invalid photo object" ||
        error instanceof ObjectNotFoundError)
    ) {
      res.status(400).json({ error: "Invalid or unavailable photo path" });
      return;
    }
    next(error);
  }
});

router.get("/orders", requireAuth, async (req, res, next) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.userId))
      .orderBy(desc(ordersTable.createdAt));
    res.json(GetOrdersResponse.parse({ orders: orders.map(orderOutput) }));
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id", requireAuth, async (req, res, next) => {
  try {
    const cancellation = parseCustomerCancellation(req.body);
    const orderId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const now = new Date();
    const [order] = await db
      .update(ordersTable)
      .set({
        status: cancellation.status,
        cancellationReason: cancellation.reason,
        cancelledAt: now,
        cancelledBy: "customer",
      })
      .where(
        and(
          eq(ordersTable.id, orderId),
          eq(ordersTable.userId, req.userId),
          eq(ordersTable.kind, "service"),
          inArray(ordersTable.status, [...customerCancellableStatuses]),
        ),
      )
      .returning();
    if (!order) {
      res.status(409).json({
        error: "Booking cannot be cancelled or was already updated",
      });
      return;
    }
    res.json({ order: orderOutput(order) });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Invalid cancellation" ||
        error.message === "A cancellation reason is required")
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

export default router;