import { Router, type IRouter } from "express";
import { and, arrayContains, eq } from "drizzle-orm";
import {
  GetServiceProviderResponse,
  GetServiceProvidersQueryParams,
  GetServiceProvidersResponse,
} from "@workspace/api-zod";
import { db, providerProfilesTable, usersTable } from "@workspace/db";
import { ensureDevelopmentDemoProvider } from "../lib/demoFixture";

const router: IRouter = Router();

function providerOutput(row: {
  id: string;
  name: string;
  serviceIds: string[];
  rating: number | null;
  distanceKm: number | null;
  earliestAvailableAt: Date | null;
  imageUrl: string | null;
  servicePrices: Record<string, number | null>;
  isDemo: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    serviceIds: row.serviceIds,
    rating: row.rating,
    distanceKm: row.distanceKm,
    earliestAvailableAt: row.earliestAvailableAt?.toISOString() ?? null,
    servicePrices: row.servicePrices,
    isDemo: row.isDemo,
    ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
  };
}

const projection = {
  id: providerProfilesTable.id,
  name: providerProfilesTable.shopName,
  serviceIds: providerProfilesTable.serviceIds,
  rating: providerProfilesTable.rating,
  distanceKm: providerProfilesTable.distanceKm,
  earliestAvailableAt: providerProfilesTable.earliestAvailableAt,
  imageUrl: providerProfilesTable.imageUrl,
  servicePrices: providerProfilesTable.servicePrices,
  isDemo: providerProfilesTable.isDemo,
};

router.get("/service-providers", async (req, res, next) => {
  try {
    await ensureDevelopmentDemoProvider();
    const parsed = GetServiceProvidersQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid serviceId" });
      return;
    }
    const filters = [
      eq(providerProfilesTable.approved, true),
      eq(providerProfilesTable.status, "approved"),
      eq(usersTable.role, "provider_owner"),
    ];
    if (process.env.NODE_ENV !== "development") {
      filters.push(eq(providerProfilesTable.isDemo, false));
    }
    if (parsed.data.serviceId) {
      filters.push(
        arrayContains(providerProfilesTable.serviceIds, [
          parsed.data.serviceId,
        ]),
      );
    }
    const rows = await db
      .select(projection)
      .from(providerProfilesTable)
      .innerJoin(usersTable, eq(usersTable.id, providerProfilesTable.id))
      .where(and(...filters));
    res.json(
      GetServiceProvidersResponse.parse({
        providers: rows.map(providerOutput),
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/service-providers/:providerId", async (req, res, next) => {
  try {
    await ensureDevelopmentDemoProvider();
    const [row] = await db
      .select(projection)
      .from(providerProfilesTable)
      .innerJoin(usersTable, eq(usersTable.id, providerProfilesTable.id))
      .where(
        and(
          eq(providerProfilesTable.id, req.params.providerId),
          eq(providerProfilesTable.approved, true),
          eq(providerProfilesTable.status, "approved"),
          eq(usersTable.role, "provider_owner"),
          ...(process.env.NODE_ENV === "development"
            ? []
            : [eq(providerProfilesTable.isDemo, false)]),
        ),
      )
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Approved provider not found" });
      return;
    }
    res.json(GetServiceProviderResponse.parse(providerOutput(row)));
  } catch (error) {
    next(error);
  }
});

export default router;