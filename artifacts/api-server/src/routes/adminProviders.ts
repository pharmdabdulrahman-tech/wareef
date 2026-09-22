import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  providerProfilesTable,
  usersTable,
  type ProviderProfile,
} from "@workspace/db";
import { requireRole } from "../middleware/requireAuth";

const router: IRouter = Router();

function output(profile: ProviderProfile, applicantName: string) {
  return {
    id: profile.id,
    applicantName,
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

function parseReview(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Invalid provider review");
  }
  const value = body as Record<string, unknown>;
  if (
    Object.keys(value).some((key) => !["status", "reason"].includes(key)) ||
    !["approved", "rejected", "suspended"].includes(String(value.status)) ||
    (value.reason !== undefined &&
      (typeof value.reason !== "string" || value.reason.length > 2000))
  ) {
    throw new Error("Invalid provider review");
  }
  const status = value.status as "approved" | "rejected" | "suspended";
  const reason =
    typeof value.reason === "string" && value.reason.trim()
      ? value.reason.trim()
      : null;
  if (status !== "approved" && !reason) {
    throw new Error("A rejection or suspension reason is required");
  }
  return { status, reason };
}

router.get(
  "/admin/providers",
  ...requireRole("admin"),
  async (_req, res, next) => {
    try {
      const rows = await db
        .select({ profile: providerProfilesTable, applicantName: usersTable.displayName })
        .from(providerProfilesTable)
        .innerJoin(usersTable, eq(usersTable.id, providerProfilesTable.id))
        .where(eq(providerProfilesTable.isDemo, false))
        .orderBy(asc(providerProfilesTable.createdAt));
      res.json({
        providers: rows.map(({ profile, applicantName }) =>
          output(profile, applicantName),
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/providers/:id",
  ...requireRole("admin"),
  async (req, res, next) => {
    try {
      const review = parseReview(req.body);
      const providerId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const result = await db.transaction(async (tx) => {
        const existing = await tx.query.providerProfilesTable.findFirst({
          where: eq(providerProfilesTable.id, providerId),
        });
        if (!existing || existing.isDemo) return null;

        const [profile] = await tx
          .update(providerProfilesTable)
          .set({
            status: review.status,
            approved: review.status === "approved",
            statusReason: review.reason,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(providerProfilesTable.id, providerId))
          .returning();
        const [user] = await tx
          .update(usersTable)
          .set({
            role:
              review.status === "approved" ? "provider_owner" : "customer",
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, providerId))
          .returning({ displayName: usersTable.displayName });
        return user ? output(profile, user.displayName) : null;
      });
      if (!result) {
        res.status(404).json({ error: "Provider application not found" });
        return;
      }
      res.json({ provider: result });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "Invalid provider review" ||
          error.message === "A rejection or suspension reason is required")
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  },
);

export { parseReview };
export default router;