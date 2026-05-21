import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name"),
  defaultUnits: text("default_units").notNull().default("imperial"),
  defaultPlatform: text("default_platform"),
  favorites: jsonb("favorites").notNull().default([]).$type<string[]>(),
  recents: jsonb("recents").notNull().default([]).$type<RecentEntry[]>(),
  sidebarTools: jsonb("sidebar_tools").notNull().default([]).$type<string[]>(),
  settings: jsonb("settings").notNull().default({}).$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export interface RecentEntry {
  slug: string;
  ts: string;
}

export const insertUserPreferencesSchema = createInsertSchema(userPreferencesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferencesTable.$inferSelect;
