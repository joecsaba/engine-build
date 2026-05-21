import { pgTable, text, serial, jsonb, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userCalcPresetsTable = pgTable("user_calc_presets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  calcSlug: text("calc_slug").notNull(),
  name: text("name").notNull(),
  state: jsonb("state").notNull().default({}).$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userCalcNameUnique: unique("user_calc_presets_user_calc_name_unique").on(
    table.userId, table.calcSlug, table.name,
  ),
  userCalcIdx: index("idx_user_calc_presets_user_calc").on(table.userId, table.calcSlug),
}));

export const insertUserCalcPresetSchema = createInsertSchema(userCalcPresetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserCalcPreset = z.infer<typeof insertUserCalcPresetSchema>;
export type UserCalcPreset = typeof userCalcPresetsTable.$inferSelect;
