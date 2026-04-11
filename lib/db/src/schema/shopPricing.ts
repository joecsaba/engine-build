import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopPricingTable = pgTable("shop_pricing", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  category: text("category").notNull(),
  lowPrice: integer("low_price").notNull(),
  avgPrice: integer("avg_price").notNull(),
  highPrice: integer("high_price").notNull(),
  unit: text("unit").notNull().default("per job"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pricingSubmissionsTable = pgTable("pricing_submissions", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  price: integer("price").notNull(),
  region: text("region").notNull(),
  shopName: text("shop_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShopPricingSchema = createInsertSchema(shopPricingTable).omit({ id: true, createdAt: true });
export type InsertShopPricing = z.infer<typeof insertShopPricingSchema>;
export type ShopPricing = typeof shopPricingTable.$inferSelect;

export const insertPricingSubmissionSchema = createInsertSchema(pricingSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertPricingSubmission = z.infer<typeof insertPricingSubmissionSchema>;
