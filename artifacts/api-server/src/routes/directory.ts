import { Router, type IRouter } from "express";
import { eq, ilike, or, avg, count, sql } from "drizzle-orm";
import { db, shopsTable, shopRatingsTable, shopPricingTable, pricingSubmissionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/directory/shops", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const state = req.query.state as string | undefined;
  const specialty = req.query.specialty as string | undefined;

  const shops = await db.select().from(shopsTable).where(eq(shopsTable.approved, 1));

  const ratings = await db
    .select({
      shopId: shopRatingsTable.shopId,
      avgRating: sql<number>`round(avg(${shopRatingsTable.rating})::numeric, 1)`,
      ratingCount: sql<number>`count(*)::int`,
    })
    .from(shopRatingsTable)
    .groupBy(shopRatingsTable.shopId);

  const ratingMap = new Map(ratings.map(r => [r.shopId, r]));

  let filtered = shops;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(s2 =>
      s2.name.toLowerCase().includes(s) ||
      s2.city.toLowerCase().includes(s) ||
      s2.state.toLowerCase().includes(s) ||
      (s2.description ?? "").toLowerCase().includes(s)
    );
  }
  if (state) {
    filtered = filtered.filter(s2 => s2.state.toLowerCase() === state.toLowerCase());
  }
  if (specialty) {
    filtered = filtered.filter(s2 => s2.specialties.some(sp => sp.toLowerCase().includes(specialty.toLowerCase())));
  }

  res.json(filtered.map(s => ({
    id: s.id,
    name: s.name,
    city: s.city,
    state: s.state,
    specialties: s.specialties,
    turnaroundTime: s.turnaroundTime,
    phone: s.phone,
    website: s.website,
    description: s.description,
    avgRating: ratingMap.get(s.id)?.avgRating ?? null,
    ratingCount: ratingMap.get(s.id)?.ratingCount ?? 0,
  })));
});

router.post("/directory/shops/submit", async (req, res): Promise<void> => {
  const { name, city, state, specialties, turnaroundTime, phone, website, description } = req.body;

  if (!name || !city || !state || !specialties) {
    res.status(400).json({ success: false, message: "Missing required fields" });
    return;
  }

  await db.insert(shopsTable).values({
    name,
    city,
    state,
    specialties: Array.isArray(specialties) ? specialties : [specialties],
    turnaroundTime: turnaroundTime ?? "2-3 weeks",
    phone: phone ?? null,
    website: website ?? null,
    description: description ?? null,
    approved: 0,
  });

  res.status(201).json({ success: true, message: "Shop submitted for review. It will appear after approval." });
});

router.post("/directory/shops/:id/ratings", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shopId = parseInt(raw, 10);

  if (isNaN(shopId)) {
    res.status(400).json({ success: false, message: "Invalid shop id" });
    return;
  }

  const { rating, comment } = req.body;
  const ratingNum = parseInt(rating, 10);

  if (!rating || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    return;
  }

  await db.insert(shopRatingsTable).values({
    shopId,
    rating: ratingNum,
    comment: comment ?? null,
  });

  res.status(201).json({ success: true, message: "Rating submitted. Thank you!" });
});

router.get("/shop-pricing", async (_req, res): Promise<void> => {
  const pricing = await db.select().from(shopPricingTable).orderBy(shopPricingTable.category, shopPricingTable.service);
  res.json(pricing.map(p => ({
    id: p.id,
    service: p.service,
    category: p.category,
    lowPrice: p.lowPrice,
    avgPrice: p.avgPrice,
    highPrice: p.highPrice,
    unit: p.unit,
    notes: p.notes,
  })));
});

router.post("/shop-pricing/submit", async (req, res): Promise<void> => {
  const { service, price, region, shopName } = req.body;

  if (!service || !price || !region) {
    res.status(400).json({ success: false, message: "Missing required fields" });
    return;
  }

  await db.insert(pricingSubmissionsTable).values({
    service,
    price: parseInt(price, 10),
    region,
    shopName: shopName ?? null,
  });

  res.status(201).json({ success: true, message: "Pricing data submitted. Thank you!" });
});

export default router;
