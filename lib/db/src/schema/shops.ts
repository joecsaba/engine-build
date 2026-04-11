import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  specialties: text("specialties").array().notNull().default([]),
  turnaroundTime: text("turnaround_time").notNull(),
  phone: text("phone"),
  website: text("website"),
  description: text("description"),
  approved: integer("approved").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopRatingsTable = pgTable("shop_ratings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true, approved: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;

export const insertShopRatingSchema = createInsertSchema(shopRatingsTable).omit({ id: true, createdAt: true });
export type InsertShopRating = z.infer<typeof insertShopRatingSchema>;
export type ShopRating = typeof shopRatingsTable.$inferSelect;
