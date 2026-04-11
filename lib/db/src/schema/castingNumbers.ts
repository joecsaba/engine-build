import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const castingNumbersTable = pgTable("casting_numbers", {
  id: serial("id").primaryKey(),
  engineId: integer("engine_id").notNull(),
  casting: text("casting").notNull(),
  description: text("description").notNull(),
  years: text("years").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCastingNumberSchema = createInsertSchema(castingNumbersTable).omit({ id: true, createdAt: true });
export type InsertCastingNumber = z.infer<typeof insertCastingNumberSchema>;
export type CastingNumber = typeof castingNumbersTable.$inferSelect;
