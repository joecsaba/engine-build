import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const enginesTable = pgTable("engines", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull(),
  slug: text("slug"),
  name: text("name").notNull(),
  years: text("years").notNull(),
  displacement: text("displacement").notNull(),
  bore: text("bore"),
  stroke: text("stroke"),
  compression: text("compression"),
  horsepower: text("horsepower"),
  torque: text("torque"),
  firingOrder: text("firing_order"),
  rodLength: text("rod_length"),
  rodRatio: text("rod_ratio"),
  deckHeight: text("deck_height"),
  applications: text("applications"),
  isPopular: integer("is_popular").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEngineSchema = createInsertSchema(enginesTable).omit({ id: true, createdAt: true });
export type InsertEngine = z.infer<typeof insertEngineSchema>;
export type Engine = typeof enginesTable.$inferSelect;
