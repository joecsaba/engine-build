import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const engineFamiliesTable = pgTable("engine_families", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEngineFamilySchema = createInsertSchema(engineFamiliesTable).omit({ id: true, createdAt: true });
export type InsertEngineFamily = z.infer<typeof insertEngineFamilySchema>;
export type EngineFamily = typeof engineFamiliesTable.$inferSelect;
