import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, enginesTable, clearanceSpecsTable, torqueSpecsTable, buildsTable, fieldEntriesTable } from "@workspace/db";

const router: IRouter = Router();

// ─── Spec key mapping: DB name patterns → component spec key ──────────────────
// Each entry: [component key, label, category pattern, name pattern (partial match)]
const SPEC_KEY_MAP: Array<[string, string, string, string]> = [
  ["mainBearingClearance", "Main bearing oil clearance",   "main bearing", "main bearing"],
  ["rodBearingClearance",  "Rod bearing oil clearance",    "rod bearing",  "rod bearing"],
  ["pistonToWall",         "Piston-to-wall clearance",     "pistons",      "piston-to-wall"],
  ["crankEndplay",         "Crankshaft endplay",           "crankshaft",   "end play"],
  ["ringGapTop",           "Top ring end gap",             "piston rings", "top ring end gap"],
  ["ringGapSecond",        "Second ring end gap",          "piston rings", "second ring end gap"],
  ["ringGapOil",           "Oil ring end gap",             "piston rings", "oil ring end gap"],
  ["valveStemClearanceInt","Valve stem clearance (intake)","valvetrain",   "intake"],
  ["valveStemClearanceExh","Valve stem clearance (exhaust)","valvetrain",  "exhaust"],
  ["camEndplay",           "Cam endplay",                  "crankshaft",   "cam endplay"],
];

// Per-engine fallback specs used when DB data doesn't fully cover all keys
const FALLBACK_SPECS: Record<string, Record<string, { min: number; max: number; unit: string }>> = {
  ls1: {
    mainBearingClearance:  { min: 0.0018, max: 0.0025, unit: "in" },
    rodBearingClearance:   { min: 0.0019, max: 0.0025, unit: "in" },
    pistonToWall:          { min: 0.0007, max: 0.0021, unit: "in" },
    crankEndplay:          { min: 0.001,  max: 0.012,  unit: "in" },
    ringGapTop:            { min: 0.010,  max: 0.020,  unit: "in" },
    ringGapSecond:         { min: 0.016,  max: 0.028,  unit: "in" },
    ringGapOil:            { min: 0.006,  max: 0.020,  unit: "in" },
    valveStemClearanceInt: { min: 0.001,  max: 0.0026, unit: "in" },
    valveStemClearanceExh: { min: 0.001,  max: 0.0026, unit: "in" },
    camEndplay:            { min: 0.001,  max: 0.012,  unit: "in" },
  },
  sbc350: {
    mainBearingClearance:  { min: 0.0013, max: 0.0025, unit: "in" },
    rodBearingClearance:   { min: 0.0013, max: 0.0035, unit: "in" },
    pistonToWall:          { min: 0.0007, max: 0.0017, unit: "in" },
    crankEndplay:          { min: 0.002,  max: 0.006,  unit: "in" },
    ringGapTop:            { min: 0.010,  max: 0.020,  unit: "in" },
    ringGapSecond:         { min: 0.013,  max: 0.025,  unit: "in" },
    ringGapOil:            { min: 0.015,  max: 0.055,  unit: "in" },
    valveStemClearanceInt: { min: 0.001,  max: 0.0027, unit: "in" },
    valveStemClearanceExh: { min: 0.001,  max: 0.0027, unit: "in" },
    camEndplay:            { min: 0.001,  max: 0.005,  unit: "in" },
  },
  coyote50: {
    mainBearingClearance:  { min: 0.0009, max: 0.0024, unit: "in" },
    rodBearingClearance:   { min: 0.0006, max: 0.0024, unit: "in" },
    pistonToWall:          { min: 0.0004, max: 0.0008, unit: "in" },
    crankEndplay:          { min: 0.002,  max: 0.012,  unit: "in" },
    ringGapTop:            { min: 0.006,  max: 0.014,  unit: "in" },
    ringGapSecond:         { min: 0.012,  max: 0.022,  unit: "in" },
    ringGapOil:            { min: 0.006,  max: 0.026,  unit: "in" },
    valveStemClearanceInt: { min: 0.0008, max: 0.0027, unit: "in" },
    valveStemClearanceExh: { min: 0.0018, max: 0.0037, unit: "in" },
    camEndplay:            { min: 0.001,  max: 0.008,  unit: "in" },
  },
};

// Per-engine torque data keyed by torque fastener category/name
const FALLBACK_TORQUE: Record<string, Record<string, string>> = {
  ls1: {
    headBolts:      "Long: 22 ft-lb + 90° + 70°; Short: 22 ft-lb + 90°",
    mainCaps:       "Inner 2-bolt: 15 ft-lb + 80°; Outer: 18 ft-lb + 110°",
    rodBolts:       "ARP: 45 ft-lb (lubed); OEM TTY: 18 ft-lb + 75°",
    oilPan:         "18 ft-lb",
    intakeManifold: "8 ft-lb (sequence: center-out)",
  },
  sbc350: {
    headBolts:      "Short: 65 ft-lb; Long: 65 ft-lb (sequence: inside-out)",
    mainCaps:       "70 ft-lb (2-bolt); 105 ft-lb (4-bolt outer)",
    rodBolts:       "OEM: 45 ft-lb; ARP: 45 ft-lb (lubed)",
    oilPan:         "15 ft-lb",
    intakeManifold: "35 ft-lb (sequence: center-out)",
  },
  coyote50: {
    headBolts:      "Stage 1: 30 ft-lb; Stage 2: +90°; Stage 3: +90°",
    mainCaps:       "Main cap: 20 ft-lb + 90°; Side bolts: 18 ft-lb",
    rodBolts:       "18 ft-lb + 90°",
    oilPan:         "89 in-lb",
    intakeManifold: "89 in-lb",
  },
};

// ─── Cylinder counts by slug ──────────────────────────────────────────────────
const CYLINDER_COUNTS: Record<string, number> = {
  ls1: 8, sbc350: 8, coyote50: 8,
};

function matchDbSpec(
  dbSpecs: { category: string; name: string; factoryMin: string; factoryMax: string; unit: string }[],
  categoryPattern: string,
  namePattern: string,
): { min: number; max: number; unit: string } | null {
  const cat = categoryPattern.toLowerCase();
  const nam = namePattern.toLowerCase();

  // Prefer exact or strongest category + name match
  for (const spec of dbSpecs) {
    const dbCat = spec.category.toLowerCase();
    const dbName = spec.name.toLowerCase();
    if (dbCat.includes(cat) && dbName.includes(nam)) {
      const min = parseFloat(spec.factoryMin);
      const max = parseFloat(spec.factoryMax);
      if (!isNaN(min) && !isNaN(max)) {
        const unit = spec.unit === "inches" ? "in" : spec.unit;
        return { min, max, unit };
      }
    }
  }
  return null;
}

function buildTorqueFromDb(
  dbTorque: { category: string; fastener: string; ftLbs: string }[],
  slug: string,
): Record<string, string> {
  const torqueMap: Record<string, string> = {};

  const catMaps: [string, string, string[]][] = [
    ["headBolts",      "Head Bolts",      ["cylinder head"]],
    ["mainCaps",       "Main Cap Bolts",  ["main bearing", "main cap"]],
    ["rodBolts",       "Rod Bolts",       ["connecting rod", "rod bolt"]],
    ["oilPan",         "Oil Pan Bolts",   ["oiling", "oil pan"]],
    ["intakeManifold", "Intake Manifold", ["intake"]],
  ];

  for (const [key, , patterns] of catMaps) {
    for (const spec of dbTorque) {
      const cat = spec.category.toLowerCase();
      const fas = spec.fastener.toLowerCase();
      const matched = patterns.some(p => cat.includes(p) || fas.includes(p));
      if (matched && !torqueMap[key]) {
        torqueMap[key] = `${spec.fastener}: ${spec.ftLbs}`;
        break;
      }
    }
    // Fall back to static data for missing keys
    if (!torqueMap[key] && FALLBACK_TORQUE[slug]?.[key]) {
      torqueMap[key] = FALLBACK_TORQUE[slug][key];
    }
  }

  return torqueMap;
}

// ─── GET /api/engines/:slug ───────────────────────────────────────────────────

router.get("/engines/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;

  if (!FALLBACK_SPECS[slug]) {
    res.status(404).json({ error: "Engine not found" });
    return;
  }

  // Load engine row from DB by slug column
  const [engine] = await db
    .select()
    .from(enginesTable)
    .where(eq(enginesTable.slug, slug));

  if (!engine) {
    res.status(404).json({ error: "Engine not found in database" });
    return;
  }

  // Load clearance and torque specs from DB
  const dbClearanceSpecs = await db
    .select()
    .from(clearanceSpecsTable)
    .where(eq(clearanceSpecsTable.engineId, engine.id));

  const dbTorqueSpecs = await db
    .select()
    .from(torqueSpecsTable)
    .where(eq(torqueSpecsTable.engineId, engine.id));

  // Build the component-expected specs shape
  const specs: Record<string, { min: number; max: number; unit: string; label: string }> = {};

  for (const [key, label, catPattern, namePattern] of SPEC_KEY_MAP) {
    const dbMatch = matchDbSpec(dbClearanceSpecs, catPattern, namePattern);
    if (dbMatch) {
      specs[key] = { ...dbMatch, label };
    } else {
      // Fall back to static reference data for this engine
      const fb = FALLBACK_SPECS[slug]?.[key];
      if (fb) specs[key] = { ...fb, label };
    }
  }

  // Build torque specs from DB + fallback
  const torque = buildTorqueFromDb(dbTorqueSpecs, slug);

  // Derive bore/stroke/displacement/firing order from engine row
  // The enginesTable has these fields directly
  const cylinders = CYLINDER_COUNTS[slug] ?? 8;

  res.json({
    name: engine.name,
    bore: engine.bore ?? "",
    stroke: engine.stroke ?? "",
    displacement: engine.displacement,
    firingOrder: engine.firingOrder ?? "",
    cylinders,
    specs,
    torque,
  });
});

// ─── POST /api/builds ─────────────────────────────────────────────────────────

router.post("/builds", async (req, res): Promise<void> => {
  const { name, engineSlug, planTier, stateJson, userId } = req.body;
  if (!engineSlug) {
    res.status(400).json({ error: "engineSlug is required" });
    return;
  }
  const [build] = await db.insert(buildsTable).values({
    name: name ?? "New Engine Build",
    engineSlug,
    planTier: planTier ?? "free",
    stateJson: typeof stateJson === "string" ? stateJson : JSON.stringify(stateJson ?? {}),
    userId: userId ?? "guest",
  }).returning();
  res.status(201).json(build);
});

// ─── PUT /api/builds/:id ─────────────────────────────────────────────────────

router.put("/builds/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid build id" });
    return;
  }
  const { name, stateJson, planTier } = req.body;
  const [build] = await db
    .update(buildsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(planTier !== undefined && { planTier }),
      ...(stateJson !== undefined && { stateJson: typeof stateJson === "string" ? stateJson : JSON.stringify(stateJson) }),
      updatedAt: new Date(),
    })
    .where(eq(buildsTable.id, id))
    .returning();
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }
  res.json(build);
});

// ─── GET /api/builds/:id ─────────────────────────────────────────────────────

router.get("/builds/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid build id" });
    return;
  }
  const [build] = await db.select().from(buildsTable).where(eq(buildsTable.id, id));
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }
  const fields = await db.select().from(fieldEntriesTable).where(eq(fieldEntriesTable.buildId, id));
  res.json({ ...build, fields });
});

// ─── POST /api/builds/:buildId/fields ────────────────────────────────────────

router.post("/builds/:buildId/fields", async (req, res): Promise<void> => {
  const buildId = parseInt(req.params.buildId, 10);
  if (isNaN(buildId)) {
    res.status(400).json({ error: "Invalid buildId" });
    return;
  }
  const { fieldKey, value, userId } = req.body;
  if (!fieldKey || value === undefined) {
    res.status(400).json({ error: "fieldKey and value are required" });
    return;
  }
  const existing = await db.select({ id: fieldEntriesTable.id })
    .from(fieldEntriesTable)
    .where(and(eq(fieldEntriesTable.buildId, buildId), eq(fieldEntriesTable.fieldKey, fieldKey)));

  let entry;
  if (existing.length > 0) {
    [entry] = await db.update(fieldEntriesTable)
      .set({ value: String(value), userId: userId ?? "guest", updatedAt: new Date() })
      .where(eq(fieldEntriesTable.id, existing[0].id))
      .returning();
  } else {
    [entry] = await db.insert(fieldEntriesTable).values({
      buildId,
      fieldKey,
      value: String(value),
      userId: userId ?? "guest",
    }).returning();
  }
  res.status(201).json(entry);
});

export default router;
