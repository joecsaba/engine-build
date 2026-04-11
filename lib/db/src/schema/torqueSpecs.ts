import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const torqueSpecsTable = pgTable("torque_specs", {
  id: serial("id").primaryKey(),
  engineId: integer("engine_id").notNull(),
  category: text("category").notNull().default("General"),
  fastener: text("fastener").notNull(),
  ftLbs: text("ft_lbs").notNull(),
  nm: text("nm").notNull(),
  sequence: text("sequence"),
  lubricant: text("lubricant").notNull().default("dry"),
  torqueToYield: boolean("torque_to_yield").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTorqueSpecSchema = createInsertSchema(torqueSpecsTable).omit({ id: true, createdAt: true });
export type InsertTorqueSpec = z.infer<typeof insertTorqueSpecSchema>;
export type TorqueSpec = typeof torqueSpecsTable.$inferSelect;
