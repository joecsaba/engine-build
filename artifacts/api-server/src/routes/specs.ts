import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, engineFamiliesTable, enginesTable, torqueSpecsTable, clearanceSpecsTable, castingNumbersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/specs/families", async (_req, res): Promise<void> => {
  const families = await db.select().from(engineFamiliesTable).orderBy(engineFamiliesTable.name);
  const counts = await db
    .select({ familyId: enginesTable.familyId, count: sql<number>`count(*)::int` })
    .from(enginesTable)
    .groupBy(enginesTable.familyId);

  const countMap = new Map(counts.map(c => [c.familyId, c.count]));

  const result = families.map(f => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    manufacturer: f.manufacturer,
    description: f.description,
    imageUrl: f.imageUrl,
    engineCount: countMap.get(f.id) ?? 0,
  }));

  res.json(result);
});

router.get("/specs/families/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [family] = await db.select().from(engineFamiliesTable).where(eq(engineFamiliesTable.slug, slug));
  if (!family) {
    res.status(404).json({ error: "Engine family not found" });
    return;
  }

  const engines = await db.select().from(enginesTable).where(eq(enginesTable.familyId, family.id)).orderBy(enginesTable.name);

  res.json({
    id: family.id,
    slug: family.slug,
    name: family.name,
    manufacturer: family.manufacturer,
    description: family.description,
    engines: engines.map(e => ({
      id: e.id,
      name: e.name,
      years: e.years,
      displacement: e.displacement,
      horsepower: e.horsepower,
      applications: e.applications,
    })),
  });
});

router.get("/specs/engines/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid engine id" });
    return;
  }

  const [engine] = await db.select().from(enginesTable).where(eq(enginesTable.id, id));
  if (!engine) {
    res.status(404).json({ error: "Engine not found" });
    return;
  }

  const [family] = await db.select().from(engineFamiliesTable).where(eq(engineFamiliesTable.id, engine.familyId));

  const torqueSpecs = await db.select().from(torqueSpecsTable).where(eq(torqueSpecsTable.engineId, id));
  const clearanceSpecs = await db.select().from(clearanceSpecsTable).where(eq(clearanceSpecsTable.engineId, id));
  const castingNumbers = await db.select().from(castingNumbersTable).where(eq(castingNumbersTable.engineId, id));

  res.json({
    id: engine.id,
    name: engine.name,
    familyName: family?.name ?? "",
    familySlug: family?.slug ?? "",
    years: engine.years,
    displacement: engine.displacement,
    bore: engine.bore,
    stroke: engine.stroke,
    compression: engine.compression,
    horsepower: engine.horsepower,
    torque: engine.torque,
    firingOrder: engine.firingOrder,
    rodLength: engine.rodLength,
    rodRatio: engine.rodRatio,
    deckHeight: engine.deckHeight,
    applications: engine.applications,
    torqueSpecs: torqueSpecs.map(t => ({
      fastener: t.fastener,
      ftLbs: t.ftLbs,
      nm: t.nm,
      sequence: t.sequence,
      lubricant: t.lubricant,
      torqueToYield: t.torqueToYield,
    })),
    clearanceSpecs: clearanceSpecs.map(c => ({
      name: c.name,
      factoryMin: c.factoryMin,
      factoryMax: c.factoryMax,
      performanceMin: c.performanceMin,
      performanceMax: c.performanceMax,
      unit: c.unit,
    })),
    castingNumbers: castingNumbers.map(c => ({
      casting: c.casting,
      description: c.description,
      years: c.years,
      type: c.type,
    })),
  });
});

router.get("/specs/popular", async (_req, res): Promise<void> => {
  const engines = await db
    .select()
    .from(enginesTable)
    .where(eq(enginesTable.isPopular, 1))
    .limit(8);

  const families = await db.select().from(engineFamiliesTable);
  const familyMap = new Map(families.map(f => [f.id, f]));

  res.json(engines.map(e => ({
    id: e.id,
    name: e.name,
    familySlug: familyMap.get(e.familyId)?.slug ?? "",
    displacement: e.displacement,
    applications: e.applications,
  })));
});

export default router;
