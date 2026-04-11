import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buildsTable = pgTable("builds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("New Engine Build"),
  engineSlug: text("engine_slug").notNull(),
  userId: text("user_id").notNull().default("guest"),
  planTier: text("plan_tier").notNull().default("free"),
  stateJson: text("state_json").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fieldEntriesTable = pgTable("field_entries", {
  id: serial("id").primaryKey(),
  buildId: integer("build_id").notNull(),
  fieldKey: text("field_key").notNull(),
  value: text("value").notNull(),
  userId: text("user_id").notNull().default("guest"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuildSchema = createInsertSchema(buildsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuild = z.infer<typeof insertBuildSchema>;
export type Build = typeof buildsTable.$inferSelect;

export const insertFieldEntrySchema = createInsertSchema(fieldEntriesTable).omit({ id: true, updatedAt: true });
export type InsertFieldEntry = z.infer<typeof insertFieldEntrySchema>;
export type FieldEntry = typeof fieldEntriesTable.$inferSelect;
