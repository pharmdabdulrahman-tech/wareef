// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "provider_owner",
  "admin",
]);

export const preferredLanguageEnum = pgEnum("preferred_language", ["ar", "en"]);

export const providerStatusEnum = pgEnum("provider_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  role: userRoleEnum("role").notNull().default("customer"),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  city: text("city"),
  preferredLanguage: preferredLanguageEnum("preferred_language")
    .notNull()
    .default("ar"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const providerProfilesTable = pgTable(
  "provider_profiles",
  {
    id: text("id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    approved: boolean("approved").notNull().default(false),
    status: providerStatusEnum("status").notNull().default("draft"),
    shopName: text("shop_name").notNull().default(""),
    description: text("description").notNull().default(""),
    serviceIds: text("service_ids").array().notNull().default([]),
    servicePrices: jsonb("service_prices")
      .$type<Record<string, number | null>>()
      .notNull()
      .default({}),
    rating: doublePrecision("rating"),
    distanceKm: doublePrecision("distance_km"),
    earliestAvailableAt: timestamp("earliest_available_at", {
      withTimezone: true,
    }),
    imageUrl: text("image_url"),
    statusReason: text("status_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("provider_profiles_approved_idx").on(table.approved),
    index("provider_profiles_status_idx").on(table.status),
  ],
);

export type ProviderProfile = typeof providerProfilesTable.$inferSelect;
export type InsertProviderProfile = typeof providerProfilesTable.$inferInsert;

export const orderKindEnum = pgEnum("order_kind", ["service", "product"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "accepted",
  "rejected",
  "completed",
  "cancelled",
]);
export const cancellationActorEnum = pgEnum("cancellation_actor", [
  "customer",
  "provider",
]);

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
};

export type ServiceBookingNeeds = {
  approximateAreaM2?: number;
  shrubCount?: number;
  standingTreeCount?: number;
  stumpOrRootAreaCount?: number;
  treeAccessDetails?: string;
};

export type ServiceBooking = {
  gardenName?: string;
  location: string;
  taskIds: string[];
  notes?: string;
  needs?: ServiceBookingNeeds;
  preferredTime: string;
  photoPaths?: string[];
};

export const ordersTable = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: orderKindEnum("kind").notNull(),
    items: jsonb("items").$type<OrderItem[]>().notNull(),
    details: text("details"),
    providerId: text("provider_id").references(() => providerProfilesTable.id),
    booking: jsonb("booking").$type<ServiceBooking>(),
    status: orderStatusEnum("status").notNull().default("pending"),
    responseReason: text("response_reason"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: cancellationActorEnum("cancelled_by"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_user_id_idempotency_key_unique").on(
      table.userId,
      table.idempotencyKey,
    ),
    index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export type Order = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;