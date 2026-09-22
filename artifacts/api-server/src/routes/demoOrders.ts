import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, ordersTable, providerProfilesTable } from "@workspace/db";
import { ensureDevelopmentDemoProvider } from "../lib/demoFixture";
import { requireAuth } from "../middleware/requireAuth";
import { parseResponse, providerTransitionSource } from "./provider";

const router: IRouter = Router();

router.post("/demo/orders/:id/respond", requireAuth, async (req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    await ensureDevelopmentDemoProvider();
    const decision = parseResponse(req.body);
    const orderId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const assigned = await db
      .select({ isDemo: providerProfilesTable.isDemo })
      .from(ordersTable)
      .innerJoin(
        providerProfilesTable,
        eq(providerProfilesTable.id, ordersTable.providerId),
      )
      .where(
        and(
          eq(ordersTable.id, orderId),
          eq(ordersTable.userId, req.userId),
          eq(ordersTable.kind, "service"),
          eq(providerProfilesTable.isDemo, true),
        ),
      )
      .limit(1);
    if (!assigned[0]) {
      res.status(403).json({
        error: "Only the creator of a demo-provider request may test a response",
      });
      return;
    }
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
          eq(ordersTable.userId, req.userId),
          eq(ordersTable.status, fromStatus),
        ),
      )
      .returning();
    if (!order) {
      res.status(409).json({ error: "Demo request was already responded to" });
      return;
    }
    res.json({
      testMode: true,
      testStatus: `TEST_${order.status.toUpperCase()}`,
      order: {
        id: order.id,
        status: order.status,
        responseReason: order.responseReason,
        respondedAt: order.respondedAt?.toISOString() ?? null,
        cancellationReason: order.cancellationReason,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        cancelledBy: order.cancelledBy,
        completedAt: order.completedAt?.toISOString() ?? null,
      },
    });
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
});

export default router;