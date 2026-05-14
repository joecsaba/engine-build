import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  description: text("description"),
  specialties: text("specialties").array().notNull().default([]),
  services: text("services").array().notNull().default([]),
  turnaroundTime: text("turnaround_time").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  source: text("source").notNull().default("user"),
  approved: integer("approved").notNull().default(1),
  submitterEmail: text("submitter_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopRatingsTable = pgTable("shop_ratings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopEditSuggestionsTable = pgTable("shop_edit_suggestions", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  submitterNote: text("submitter_note"),
  submitterEmail: text("submitter_email"),
  status: text("status").notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true, updatedAt: true, approved: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;

export const insertShopRatingSchema = createInsertSchema(shopRatingsTable).omit({ id: true, createdAt: true });
export type InsertShopRating = z.infer<typeof insertShopRatingSchema>;
export type ShopRating = typeof shopRatingsTable.$inferSelect;

export const insertShopEditSuggestionSchema = createInsertSchema(shopEditSuggestionsTable).omit({ id: true, createdAt: true, status: true });
export type InsertShopEditSuggestion = z.infer<typeof insertShopEditSuggestionSchema>;
export type ShopEditSuggestion = typeof shopEditSuggestionsTable.$inferSelect;
