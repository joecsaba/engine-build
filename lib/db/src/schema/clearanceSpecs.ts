import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clearanceSpecsTable = pgTable("clearance_specs", {
  id: serial("id").primaryKey(),
  engineId: integer("engine_id").notNull(),
  category: text("category").notNull().default("General"),
  name: text("name").notNull(),
  factoryMin: text("factory_min").notNull(),
  factoryMax: text("factory_max").notNull(),
  performanceMin: text("performance_min"),
  performanceMax: text("performance_max"),
  unit: text("unit").notNull().default("inches"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClearanceSpecSchema = createInsertSchema(clearanceSpecsTable).omit({ id: true, createdAt: true });
export type InsertClearanceSpec = z.infer<typeof insertClearanceSpecSchema>;
export type ClearanceSpec = typeof clearanceSpecsTable.$inferSelect;
