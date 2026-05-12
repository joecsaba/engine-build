import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dieselEnginePlatformsTable, dieselCamProfilesTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * GET /api/diesel-valve-relief/platforms
 * Returns all diesel engine platforms with their cam profiles nested.
 */
router.get("/diesel-valve-relief/platforms", async (_req, res): Promise<void> => {
  const platforms = await db
    .select()
    .from(dieselEnginePlatformsTable)
    .orderBy(dieselEnginePlatformsTable.sortOrder);

  const cams = await db
    .select()
    .from(dieselCamProfilesTable)
    .orderBy(dieselCamProfilesTable.sortOrder);

  // Group cams by platform_id
  const camsByPlatform = new Map<number, typeof cams>();
  for (const cam of cams) {
    const existing = camsByPlatform.get(cam.platformId) ?? [];
    existing.push(cam);
    camsByPlatform.set(cam.platformId, existing);
  }

  const result = platforms.map(p => ({
    id: p.id,
    slug: p.slug,
    label: p.label,
    manufacturer: p.manufacturer,
    platform: p.platform,
    years: p.years,
    valveCount: p.valveCount,
    stockPistonProtrusion: p.stockPistonProtrusion,
    stockValveFaceDepth: p.stockValveFaceDepth,
    cams: (camsByPlatform.get(p.id) ?? []).map(c => ({
      id: c.id,
      label: c.label,
      manufacturer: c.manufacturer,
      partNumber: c.partNumber,
      intakeDuration: c.intakeDuration,
      exhaustDuration: c.exhaustDuration,
      intakeLift: c.intakeLift,
      exhaustLift: c.exhaustLift,
      lsa: c.lsa,
      valveReliefRequired: c.valveReliefRequired,
      reliefDepth: c.reliefDepth,
      requiresUpgradedSprings: c.requiresUpgradedSprings,
      requiresUpgradedPushrods: c.requiresUpgradedPushrods,
      maxPistonProtrusion: c.maxPistonProtrusion,
      minValveFaceDepth: c.minValveFaceDepth,
      notes: c.notes,
    })),
  }));

  res.json(result);
});

/**
 * GET /api/diesel-valve-relief/platforms/:slug
 * Returns a single platform with its cam profiles.
 */
router.get("/diesel-valve-relief/platforms/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [platform] = await db
    .select()
    .from(dieselEnginePlatformsTable)
    .where(eq(dieselEnginePlatformsTable.slug, slug));

  if (!platform) {
    res.status(404).json({ error: "Platform not found" });
    return;
  }

  const cams = await db
    .select()
    .from(dieselCamProfilesTable)
    .where(eq(dieselCamProfilesTable.platformId, platform.id))
    .orderBy(dieselCamProfilesTable.sortOrder);

  res.json({
    id: platform.id,
    slug: platform.slug,
    label: platform.label,
    manufacturer: platform.manufacturer,
    platform: platform.platform,
    years: platform.years,
    valveCount: platform.valveCount,
    stockPistonProtrusion: platform.stockPistonProtrusion,
    stockValveFaceDepth: platform.stockValveFaceDepth,
    cams: cams.map(c => ({
      id: c.id,
      label: c.label,
      manufacturer: c.manufacturer,
      partNumber: c.partNumber,
      intakeDuration: c.intakeDuration,
      exhaustDuration: c.exhaustDuration,
      intakeLift: c.intakeLift,
      exhaustLift: c.exhaustLift,
      lsa: c.lsa,
      valveReliefRequired: c.valveReliefRequired,
      reliefDepth: c.reliefDepth,
      requiresUpgradedSprings: c.requiresUpgradedSprings,
      requiresUpgradedPushrods: c.requiresUpgradedPushrods,
      maxPistonProtrusion: c.maxPistonProtrusion,
      minValveFaceDepth: c.minValveFaceDepth,
      notes: c.notes,
    })),
  });
});

export default router;
