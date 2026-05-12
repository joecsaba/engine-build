import { pgTable, text, serial, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Diesel engine platforms for the valve relief calculator.
 * One row per engine variant (e.g. "5.9L 12-Valve 6BT 1989–1998").
 */
export const dieselEnginePlatformsTable = pgTable("diesel_engine_platforms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  manufacturer: text("manufacturer").notNull(),
  platform: text("platform").notNull(),
  years: text("years").notNull(),
  valveCount: text("valve_count").notNull(),
  stockPistonProtrusion: numeric("stock_piston_protrusion", { precision: 6, scale: 4 }).notNull(),
  stockValveFaceDepth: numeric("stock_valve_face_depth", { precision: 6, scale: 4 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDieselEnginePlatformSchema = createInsertSchema(dieselEnginePlatformsTable).omit({ id: true, createdAt: true });
export type InsertDieselEnginePlatform = z.infer<typeof insertDieselEnginePlatformSchema>;
export type DieselEnginePlatform = typeof dieselEnginePlatformsTable.$inferSelect;

/**
 * Aftermarket cam profiles for diesel engines.
 * Each cam belongs to a platform via platform_id FK.
 */
export const dieselCamProfilesTable = pgTable("diesel_cam_profiles", {
  id: serial("id").primaryKey(),
  platformId: integer("platform_id").notNull(),
  label: text("label").notNull(),
  manufacturer: text("manufacturer").notNull(),
  partNumber: text("part_number").notNull(),
  intakeDuration: integer("intake_duration").notNull(),
  exhaustDuration: integer("exhaust_duration").notNull(),
  intakeLift: numeric("intake_lift", { precision: 5, scale: 3 }).notNull(),
  exhaustLift: numeric("exhaust_lift", { precision: 5, scale: 3 }).notNull(),
  lsa: integer("lsa").notNull(),
  valveReliefRequired: boolean("valve_relief_required").notNull().default(false),
  reliefDepth: numeric("relief_depth", { precision: 5, scale: 3 }).notNull().default("0"),
  requiresUpgradedSprings: boolean("requires_upgraded_springs").notNull().default(false),
  requiresUpgradedPushrods: boolean("requires_upgraded_pushrods").notNull().default(false),
  maxPistonProtrusion: numeric("max_piston_protrusion", { precision: 6, scale: 4 }),
  minValveFaceDepth: numeric("min_valve_face_depth", { precision: 6, scale: 4 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDieselCamProfileSchema = createInsertSchema(dieselCamProfilesTable).omit({ id: true, createdAt: true });
export type InsertDieselCamProfile = z.infer<typeof insertDieselCamProfileSchema>;
export type DieselCamProfile = typeof dieselCamProfilesTable.$inferSelect;
