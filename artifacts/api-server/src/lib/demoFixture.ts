import { db, providerProfilesTable, usersTable } from "@workspace/db";

export const DEMO_PROVIDER_ID = "__wareef_development_demo_provider__";

export async function ensureDevelopmentDemoProvider() {
  if (process.env.NODE_ENV !== "development") return;

  await db
    .insert(usersTable)
    .values({
      id: DEMO_PROVIDER_ID,
      role: "provider_owner",
      displayName: "TEST / مختص تجريبي",
      onboardingComplete: true,
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        role: "provider_owner",
        displayName: "TEST / مختص تجريبي",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(providerProfilesTable)
    .values({
      id: DEMO_PROVIDER_ID,
      approved: true,
      status: "approved",
      shopName: "TEST / مختص تجريبي",
      description:
        "Development-only test specialist / مختص تجريبي للاختبار فقط",
      serviceIds: ["soil", "party", "maintenance", "trim", "plant", "custom"],
      servicePrices: {},
      rating: null,
      distanceKm: null,
      earliestAvailableAt: null,
      isDemo: true,
      reviewedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: providerProfilesTable.id,
      set: {
        approved: true,
        status: "approved",
        shopName: "TEST / مختص تجريبي",
        description:
          "Development-only test specialist / مختص تجريبي للاختبار فقط",
        serviceIds: ["soil", "party", "maintenance", "trim", "plant", "custom"],
        servicePrices: {},
        rating: null,
        distanceKm: null,
        earliestAvailableAt: null,
        isDemo: true,
        statusReason: null,
        updatedAt: new Date(),
      },
    });
}