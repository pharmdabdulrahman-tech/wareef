import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  providerProfilesTable,
  type Order,
  type ProviderProfile,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { providerCanAccessPrivateBooking } from "../lib/bookingAccess";
import { getOrCreateCurrentUser } from "../lib/currentUser";

const router: IRouter = Router();

type EditableProfile = {
  shopName: string;
  serviceIds: string[];
  description: string;
  earliestAvailableAt: Date | null;
  servicePrices: Record<string, number | null>;
};

function profileOutput(profile: ProviderProfile) {
  return {
    id: profile.id,
    status: profile.status,
    shopName: profile.shopName,
    serviceIds: profile.serviceIds,
    description: profile.description,
    earliestAvailableAt: profile.earliestAvailableAt?.toISOString() ?? null,
    servicePrices: profile.servicePrices,
    statusReason: profile.statusReason,
    submittedAt: profile.submittedAt?.toISOString() ?? null,
    reviewedAt: profile.reviewedAt?.toISOString() ?? null,
    isDemo: profile.isDemo,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function parseEditableProfile(body: unknown): EditableProfile {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Invalid provider profile");
  }
  const value = body as Record<string, unknown>;
  const allowed = new Set([
    "shopName",
    "serviceIds",
    "description",
    "earliestAvailableAt",
    "servicePrices",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error("Invalid provider profile");
  }
  if (
    typeof value.shopName !== "string" ||
    value.shopName.trim().length < 2 ||
    value.shopName.trim().length > 150 ||
    typeof value.description !== "string" ||
    value.description.trim().length < 1 ||
    value.description.length > 5000 ||
    !Array.isArray(value.serviceIds) ||
    value.serviceIds.length < 1 ||
    value.serviceIds.length > 50 ||
    value.serviceIds.some(
      (id) => typeof id !== "string" || id.length < 1 || id.length > 100,
    )
  ) {
    throw new Error("Invalid provider profile");
  }
  const serviceIds = [...new Set(value.serviceIds as string[])];
  if (serviceIds.length !== value.serviceIds.length) {
    throw new Error("Invalid provider profile");
  }
  if (
    !value.servicePrices ||
    typeof value.servicePrices !== "object" ||
    Array.isArray(value.servicePrices)
  ) {
    throw new Error("Invalid provider profile");
  }
  const servicePrices: Record<string, number | null> = {};
  for (const [serviceId, price] of Object.entries(
    value.servicePrices as Record<string, unknown>,
  )) {
    if (
      !serviceIds.includes(serviceId) ||
      (price !== null &&
        (typeof price !== "number" || !Number.isFinite(price) || price < 0))
    ) {
      throw new Error("Invalid provider profile");
    }
    servicePrices[serviceId] = price as number | null;
  }
  for (const serviceId of serviceIds) {
    if (!(serviceId in servicePrices)) servicePrices[serviceId] = null;
  }
  let earliestAvailableAt: Date | null = null;
  if (value.earliestAvailableAt !== null) {
    if (typeof value.earliestAvailableAt !== "string") {
      throw new Error("Invalid provider profile");
    }
    earliestAvailableAt = new Date(value.earliestAvailableAt);
    if (!Number.isFinite(earliestAvailableAt.getTime())) {
      throw new Error("Invalid provider profile");
    }
  }
  return {
    shopName: value.shopName.trim(),
    serviceIds,
    description: value.description.trim(),
    earliestAvailableAt,
    servicePrices,
  };
}

function providerBooking(order: Order) {
  if (!order.booking) return null;
  if (!providerCanAccessPrivateBooking(order.status)) {
    const { location: _location, photoPaths: _photoPaths, ...safe } =
      order.booking;
    return { ...safe, location: null, photoPaths: [] };
  }
  return order.booking;
}

function providerOrderOutput(order: Order, ownerId: string) {
  if (order.providerId !== ownerId) {
    throw new Error("Order is not assigned to this provider owner");
  }
  return {
    id: order.id,
    kind: order.kind,
    items: order.items,
    details: order.details,
    booking: providerBooking(order),
    status: order.status,
    responseReason: order.responseReason,
    respondedAt: order.respondedAt?.toISOString() ?? null,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelledBy: order.cancelledBy,
    completedAt: order.completedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
  };
}

function parseResponse(
  body: unknown,
): {
  status: "accepted" | "rejected" | "completed" | "cancelled";
  reason: string | null;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Invalid response");
  }
  const value = body as Record<string, unknown>;
  if (
    Object.keys(value).some((key) => !["status", "reason"].includes(key)) ||
    !["accepted", "rejected", "completed", "cancelled"].includes(
      value.status as string,
    ) ||
    (value.reason !== undefined &&
      (typeof value.reason !== "string" ||
        value.reason.length >
          (value.status === "cancelled" ? 1000 : 2000)))
  ) {
    throw new Error("Invalid response");
  }
  const reason =
    typeof value.reason === "string" && value.reason.trim()
      ? value.reason.trim()
      : null;
  if ((value.status === "rejected" || value.status === "cancelled") && !reason) {
    throw new Error(
      value.status === "rejected"
        ? "A rejection reason is required"
        : "A cancellation reason is required",
    );
  }
  return {
    status: value.status as
      | "accepted"
      | "rejected"
      | "completed"
      | "cancelled",
    reason,
  };
}

export function providerTransitionSource(
  status: "accepted" | "rejected" | "completed" | "cancelled",
): "pending" | "accepted" {
  return status === "accepted" || status === "rejected" ? "pending" : "accepted";
}

router.get("/provider/profile", requireAuth, async (req, res, next) => {
  try {
    await getOrCreateCurrentUser(req);
    const profile = await db.query.providerProfilesTable.findFirst({
      where: and(
        eq(providerProfilesTable.id, req.userId),
        eq(providerProfilesTable.isDemo, false),
      ),
    });
    res.json({ profile: profile ? profileOutput(profile) : null });
  } catch (error) {
    next(error);
  }
});

router.put("/provider/profile", requireAuth, async (req, res, next) => {
  try {
    const changes = parseEditableProfile(req.body);
    await getOrCreateCurrentUser(req);
    const current = await db.query.providerProfilesTable.findFirst({
      where: eq(providerProfilesTable.id, req.userId),
    });
    if (current?.isDemo) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [profile] = current
      ? await db
          .update(providerProfilesTable)
          .set({ ...changes, updatedAt: new Date() })
          .where(eq(providerProfilesTable.id, req.userId))
          .returning()
      : await db
          .insert(providerProfilesTable)
          .values({ id: req.userId, ...changes })
          .returning();
    res.json({ profile: profileOutput(profile) });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid provider profile") {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.post("/provider/profile/submit", requireAuth, async (req, res, next) => {
  try {
    const [profile] = await db
      .update(providerProfilesTable)
      .set({
        status: "pending",
        approved: false,
        statusReason: null,
        submittedAt: new Date(),
        reviewedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(providerProfilesTable.id, req.userId),
          eq(providerProfilesTable.isDemo, false),
          inArray(providerProfilesTable.status, [
            "draft",
            "rejected",
            "suspended",
          ]),
        ),
      )
      .returning();
    if (!profile) {
      const existing = await db.query.providerProfilesTable.findFirst({
        where: eq(providerProfilesTable.id, req.userId),
      });
      if (!existing) {
        res.status(404).json({ error: "Provider profile not found" });
      } else if (existing.status === "approved" || existing.status === "pending") {
        res.json({ profile: profileOutput(existing) });
      } else {
        res.status(409).json({ error: "Profile cannot be submitted" });
      }
      return;
    }
    res.json({ profile: profileOutput(profile) });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/provider/orders",
  ...requireRole("provider_owner"),
  async (req, res, next) => {
    try {
      const profile = await db.query.providerProfilesTable.findFirst({
        where: and(
          eq(providerProfilesTable.id, req.userId),
          eq(providerProfilesTable.status, "approved"),
          eq(providerProfilesTable.approved, true),
          eq(providerProfilesTable.isDemo, false),
        ),
      });
      if (!profile) {
        res.status(403).json({ error: "Approved provider required" });
        return;
      }
      const orders = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.providerId, req.userId),
            eq(ordersTable.kind, "service"),
          ),
        )
        .orderBy(desc(ordersTable.createdAt));
      res.json({
        orders: orders.map((order) => providerOrderOutput(order, req.userId)),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/provider/orders/:id",
  ...requireRole("provider_owner"),
  async (req, res, next) => {
    try {
      const decision = parseResponse(req.body);
      const orderId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const fromStatus = providerTransitionSource(decision.status);
      const now = new Date();
      const changes =
        decision.status === "accepted" || decision.status === "rejected"
          ? {
              status: decision.status,
              responseReason: decision.reason,
              respondedAt: now,
            }
          : decision.status === "completed"
            ? { status: decision.status, completedAt: now }
            : {
                status: decision.status,
                cancellationReason: decision.reason,
                cancelledAt: now,
                cancelledBy: "provider" as const,
              };
      const [order] = await db
        .update(ordersTable)
        .set(changes)
        .where(
          and(
            eq(ordersTable.id, orderId),
            eq(ordersTable.providerId, req.userId),
            eq(ordersTable.kind, "service"),
            eq(ordersTable.status, fromStatus),
            sql`exists (
              select 1
              from ${providerProfilesTable}
              where ${providerProfilesTable.id} = ${req.userId}
                and ${providerProfilesTable.status} = 'approved'
                and ${providerProfilesTable.approved} = true
                and ${providerProfilesTable.isDemo} = false
            )`,
          ),
        )
        .returning();
      if (!order) {
        res.status(409).json({
          error: "Booking transition conflicts with its current state",
        });
        return;
      }
      res.json({ order: providerOrderOutput(order, req.userId) });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "Invalid response" ||
          error.message === "A rejection reason is required" ||
          error.message === "A cancellation reason is required")
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  },
);

export { parseEditableProfile, parseResponse, providerOrderOutput };
export default router;