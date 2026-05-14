import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, shopsTable, shopRatingsTable, shopPricingTable, pricingSubmissionsTable, shopEditSuggestionsTable } from "@workspace/db";

const router: IRouter = Router();

// ─── Auth helpers ───────────────────────────────────────────────────────────
const ADMIN_EMAILS = new Set([
  "joecsaba@gmail.com",
]);

interface AuthInfo {
  email: string | null;
  isAdmin: boolean;
  isSignedIn: boolean;
}

function getAuth(req: any): AuthInfo {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { email: null, isAdmin: false, isSignedIn: false };
    }
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const email = (payload.email as string)?.toLowerCase() ?? null;
    return {
      email,
      isAdmin: !!email && ADMIN_EMAILS.has(email),
      isSignedIn: !!email,
    };
  } catch {
    return { email: null, isAdmin: false, isSignedIn: false };
  }
}

function requireAuth(req: any, res: any): AuthInfo | null {
  const auth = getAuth(req);
  if (!auth.isSignedIn) {
    res.status(401).json({ success: false, message: "You must be signed in to do this." });
    return null;
  }
  return auth;
}

function requireAdmin(req: any, res: any): AuthInfo | null {
  const auth = getAuth(req);
  if (!auth.isAdmin) {
    res.status(403).json({ success: false, message: "Admin access required." });
    return null;
  }
  return auth;
}

// Haversine distance in miles between two lat/lng pairs
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Public: list shops ──────────────────────────────────────────────────────
router.get("/directory/shops", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const state = req.query.state as string | undefined;
  const specialty = req.query.specialty as string | undefined;
  const service = req.query.service as string | undefined;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : null;

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

  // Compute distance for every shop with coords (when radius search active)
  const radiusActive = lat !== null && lng !== null && radius !== null && !isNaN(lat) && !isNaN(lng) && !isNaN(radius);
  const distanceMap = new Map<number, number>();
  if (radiusActive) {
    for (const s of shops) {
      if (s.lat != null && s.lng != null) {
        distanceMap.set(s.id, distanceMiles(lat, lng, s.lat, s.lng));
      }
    }
  }

  let filtered = shops;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(s2 =>
      s2.name.toLowerCase().includes(s) ||
      s2.city.toLowerCase().includes(s) ||
      s2.state.toLowerCase().includes(s) ||
      (s2.description ?? "").toLowerCase().includes(s) ||
      (s2.address ?? "").toLowerCase().includes(s) ||
      (s2.zip ?? "").includes(s)
    );
  }
  if (state) filtered = filtered.filter(s2 => s2.state.toLowerCase() === state.toLowerCase());
  if (specialty) filtered = filtered.filter(s2 => s2.specialties.some(sp => sp.toLowerCase().includes(specialty.toLowerCase())));
  if (service) filtered = filtered.filter(s2 => (s2.services ?? []).some(sv => sv.toLowerCase().includes(service.toLowerCase())));

  if (radiusActive) {
    // Keep only shops within radius (exclude shops with no coords)
    filtered = filtered.filter(s => {
      const d = distanceMap.get(s.id);
      return d !== undefined && d <= radius!;
    });
    // Sort by distance ascending
    filtered.sort((a, b) => (distanceMap.get(a.id) ?? Infinity) - (distanceMap.get(b.id) ?? Infinity));
  }

  res.json(filtered.map(s => ({
    id: s.id,
    name: s.name,
    address: s.address,
    city: s.city,
    state: s.state,
    zip: s.zip,
    phone: s.phone,
    email: s.email,
    website: s.website,
    description: s.description,
    specialties: s.specialties,
    services: s.services ?? [],
    turnaroundTime: s.turnaroundTime,
    lat: s.lat,
    lng: s.lng,
    source: s.source,
    avgRating: ratingMap.get(s.id)?.avgRating ?? null,
    ratingCount: ratingMap.get(s.id)?.ratingCount ?? 0,
    distanceMiles: radiusActive ? distanceMap.get(s.id) ?? null : null,
  })));
});

// ─── Public: geocode user input (Census for addresses, Nominatim for city/ZIP) ──
async function geocodeViaCensus(address: string): Promise<{ lat: number; lng: number; matched: string } | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const resp = await fetch(url.toString());
  if (!resp.ok) return null;
  const data: any = await resp.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  const c = match.coordinates ?? {};
  if (c.y == null || c.x == null) return null;
  return { lat: c.y, lng: c.x, matched: match.matchedAddress ?? address };
}

async function geocodeViaNominatim(address: string): Promise<{ lat: number; lng: number; matched: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const resp = await fetch(url.toString(), {
    headers: { "User-Agent": "engine-build.com directory (admin@engine-build.com)" },
  });
  if (!resp.ok) return null;
  const data: any = await resp.json();
  const match = data?.[0];
  if (!match) return null;
  return {
    lat: parseFloat(match.lat),
    lng: parseFloat(match.lon),
    matched: match.display_name ?? address,
  };
}

router.get("/directory/geocode", async (req, res): Promise<void> => {
  const address = req.query.address as string | undefined;
  if (!address || address.trim().length < 2) {
    res.status(400).json({ success: false, message: "Address is required" });
    return;
  }
  try {
    // Try Census first (best for street addresses)
    let result = await geocodeViaCensus(address).catch(() => null);
    // Fall back to Nominatim (handles city/ZIP/landmarks)
    if (!result) {
      result = await geocodeViaNominatim(address).catch(() => null);
    }
    if (!result) {
      res.status(404).json({ success: false, message: "Could not find that location. Try a more specific address." });
      return;
    }
    res.json({
      success: true,
      lat: result.lat,
      lng: result.lng,
      matched: result.matched,
    });
  } catch {
    res.status(500).json({ success: false, message: "Geocoding service error" });
  }
});

// ─── Authenticated: submit a new shop (goes to pending queue) ───────────────
router.post("/directory/shops/submit", async (req, res): Promise<void> => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const { name, address, city, state, zip, phone, email, website, description, specialties, services, turnaroundTime } = req.body;

  if (!name || !city || !state) {
    res.status(400).json({ success: false, message: "Missing required fields" });
    return;
  }

  await db.insert(shopsTable).values({
    name,
    address: address ?? null,
    city,
    state,
    zip: zip ?? null,
    phone: phone ?? null,
    email: email ?? null,
    website: website ?? null,
    description: description ?? null,
    specialties: Array.isArray(specialties) ? specialties : specialties ? [specialties] : [],
    services: Array.isArray(services) ? services : services ? [services] : [],
    turnaroundTime: turnaroundTime ?? "Contact for estimate",
    source: "user",
    approved: 0,
    submitterEmail: auth.email,
  });

  res.status(201).json({ success: true, message: "Shop submitted for review. It will appear after approval." });
});

// ─── Public: submit rating (anyone) ─────────────────────────────────────────
router.post("/directory/shops/:id/ratings", async (req, res): Promise<void> => {
  const shopId = parseInt(String(req.params.id), 10);
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

// ─── Authenticated: suggest an edit ─────────────────────────────────────────
router.post("/directory/shops/:id/suggest-edit", async (req, res): Promise<void> => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const shopId = parseInt(String(req.params.id), 10);
  if (isNaN(shopId)) {
    res.status(400).json({ success: false, message: "Invalid shop id" });
    return;
  }
  const { field, oldValue, newValue, submitterNote } = req.body;
  if (!field || !newValue) {
    res.status(400).json({ success: false, message: "Field and new value are required" });
    return;
  }
  await db.insert(shopEditSuggestionsTable).values({
    shopId,
    field,
    oldValue: oldValue ?? null,
    newValue,
    submitterNote: submitterNote ?? null,
    submitterEmail: auth.email,
  });
  res.status(201).json({ success: true, message: "Edit suggestion submitted. Thank you!" });
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS — require admin email
// ════════════════════════════════════════════════════════════════════════════

// Get all pending shop submissions
router.get("/admin/shops/pending", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const pending = await db.select().from(shopsTable)
    .where(eq(shopsTable.approved, 0))
    .orderBy(desc(shopsTable.createdAt));
  res.json(pending);
});

// Approve a pending shop (with optional edits)
router.post("/admin/shops/:id/approve", async (req, res): Promise<void> => {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const shopId = parseInt(String(req.params.id), 10);
  if (isNaN(shopId)) {
    res.status(400).json({ success: false, message: "Invalid shop id" });
    return;
  }
  const updates = req.body ?? {};
  const allowed: any = {
    approved: 1,
    updatedAt: new Date(),
  };
  for (const k of ["name", "address", "city", "state", "zip", "phone", "email", "website", "description", "specialties", "services", "turnaroundTime"]) {
    if (k in updates) allowed[k] = updates[k];
  }
  await db.update(shopsTable).set(allowed).where(eq(shopsTable.id, shopId));
  res.json({ success: true, message: "Shop approved." });
});

// Reject (delete) a pending shop
router.post("/admin/shops/:id/reject", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const shopId = parseInt(String(req.params.id), 10);
  if (isNaN(shopId)) {
    res.status(400).json({ success: false, message: "Invalid shop id" });
    return;
  }
  await db.delete(shopsTable).where(eq(shopsTable.id, shopId));
  res.json({ success: true, message: "Shop rejected and removed." });
});

// Get list of all shops (admin view, includes pending)
router.get("/admin/shops", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const search = (req.query.search as string | undefined)?.toLowerCase();
  const all = await db.select().from(shopsTable).orderBy(desc(shopsTable.updatedAt));
  const filtered = search
    ? all.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.city.toLowerCase().includes(search) ||
        (s.state ?? "").toLowerCase().includes(search))
    : all;
  res.json(filtered);
});

// Quick edit: update any shop
router.patch("/admin/shops/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const shopId = parseInt(String(req.params.id), 10);
  if (isNaN(shopId)) {
    res.status(400).json({ success: false, message: "Invalid shop id" });
    return;
  }
  const updates = req.body ?? {};
  const allowed: any = { updatedAt: new Date() };
  for (const k of ["name", "address", "city", "state", "zip", "phone", "email", "website", "description", "specialties", "services", "turnaroundTime", "approved"]) {
    if (k in updates) allowed[k] = updates[k];
  }
  await db.update(shopsTable).set(allowed).where(eq(shopsTable.id, shopId));
  res.json({ success: true, message: "Shop updated." });
});

// Delete a shop (admin)
router.delete("/admin/shops/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const shopId = parseInt(String(req.params.id), 10);
  if (isNaN(shopId)) {
    res.status(400).json({ success: false, message: "Invalid shop id" });
    return;
  }
  await db.delete(shopsTable).where(eq(shopsTable.id, shopId));
  res.json({ success: true, message: "Shop deleted." });
});

// Get pending edit suggestions
router.get("/admin/shop-edits", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const pending = await db.select().from(shopEditSuggestionsTable)
    .where(eq(shopEditSuggestionsTable.status, "pending"))
    .orderBy(desc(shopEditSuggestionsTable.createdAt));

  // Enrich with shop name + current value of the field
  const shopIds = [...new Set(pending.map(p => p.shopId))];
  const shops = shopIds.length > 0
    ? await db.select().from(shopsTable).where(sql`${shopsTable.id} = ANY(${shopIds})`)
    : [];
  const shopMap = new Map(shops.map(s => [s.id, s]));

  res.json(pending.map(p => {
    const shop = shopMap.get(p.shopId);
    let currentValue: any = null;
    if (shop && p.field in shop) {
      currentValue = (shop as any)[p.field];
    }
    return {
      id: p.id,
      shopId: p.shopId,
      shopName: shop?.name ?? "(deleted shop)",
      field: p.field,
      oldValue: p.oldValue,
      currentValue,
      newValue: p.newValue,
      submitterNote: p.submitterNote,
      submitterEmail: p.submitterEmail,
      createdAt: p.createdAt,
    };
  }));
});

// Apply an edit suggestion to the shop
router.post("/admin/shop-edits/:id/apply", async (req, res): Promise<void> => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const editId = parseInt(String(req.params.id), 10);
  if (isNaN(editId)) {
    res.status(400).json({ success: false, message: "Invalid edit id" });
    return;
  }
  const [edit] = await db.select().from(shopEditSuggestionsTable).where(eq(shopEditSuggestionsTable.id, editId)).limit(1);
  if (!edit) {
    res.status(404).json({ success: false, message: "Edit not found" });
    return;
  }
  // Allow overriding the value to apply (admin may want to clean it up before saving)
  const valueToApply = req.body?.value ?? edit.newValue;

  // Only allow updating known fields
  const allowedFields = ["name", "address", "city", "state", "zip", "phone", "email", "website", "description", "turnaroundTime"];
  const arrayFields = ["specialties", "services"];
  const updates: any = { updatedAt: new Date() };

  if (allowedFields.includes(edit.field)) {
    updates[edit.field] = valueToApply;
  } else if (arrayFields.includes(edit.field)) {
    // Expect comma-separated string or array
    if (Array.isArray(valueToApply)) {
      updates[edit.field] = valueToApply;
    } else {
      updates[edit.field] = String(valueToApply).split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  } else {
    res.status(400).json({ success: false, message: `Unknown field "${edit.field}"` });
    return;
  }

  await db.update(shopsTable).set(updates).where(eq(shopsTable.id, edit.shopId));
  await db.update(shopEditSuggestionsTable)
    .set({ status: "applied", reviewedAt: new Date(), reviewedBy: auth.email })
    .where(eq(shopEditSuggestionsTable.id, editId));

  res.json({ success: true, message: "Edit applied." });
});

// Reject an edit suggestion
router.post("/admin/shop-edits/:id/reject", async (req, res): Promise<void> => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const editId = parseInt(String(req.params.id), 10);
  if (isNaN(editId)) {
    res.status(400).json({ success: false, message: "Invalid edit id" });
    return;
  }
  await db.update(shopEditSuggestionsTable)
    .set({ status: "rejected", reviewedAt: new Date(), reviewedBy: auth.email })
    .where(eq(shopEditSuggestionsTable.id, editId));
  res.json({ success: true, message: "Edit rejected." });
});

// ─── Pricing endpoints (unchanged) ──────────────────────────────────────────
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
