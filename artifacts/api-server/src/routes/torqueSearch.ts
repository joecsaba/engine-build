import { Router, type IRouter } from "express";
import { ilike, or, eq, sql } from "drizzle-orm";
import { db, torqueSpecsTable, enginesTable, engineFamiliesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/torque-specs/search", async (req, res): Promise<void> => {
  const q = Array.isArray(req.query.q) ? req.query.q[0] : (req.query.q as string);
  const limitRaw = req.query.limit as string;
  const limit = Math.min(parseInt(limitRaw ?? "20", 10) || 20, 100);

  if (!q || q.trim().length < 1) {
    res.json([]);
    return;
  }

  const term = `%${q.trim()}%`;

  const rows = await db
    .select({
      id: torqueSpecsTable.id,
      engineId: torqueSpecsTable.engineId,
      fastener: torqueSpecsTable.fastener,
      ftLbs: torqueSpecsTable.ftLbs,
      nm: torqueSpecsTable.nm,
      sequence: torqueSpecsTable.sequence,
      lubricant: torqueSpecsTable.lubricant,
      torqueToYield: torqueSpecsTable.torqueToYield,
      engineName: enginesTable.name,
      familySlug: engineFamiliesTable.slug,
    })
    .from(torqueSpecsTable)
    .innerJoin(enginesTable, eq(torqueSpecsTable.engineId, enginesTable.id))
    .innerJoin(engineFamiliesTable, eq(enginesTable.familyId, engineFamiliesTable.id))
    .where(
      or(
        ilike(torqueSpecsTable.fastener, term),
        ilike(enginesTable.name, term),
        ilike(engineFamiliesTable.name, term)
      )
    )
    .limit(limit);

  res.json(rows.map(r => ({
    id: r.id,
    engine: r.engineName,
    engineId: r.engineId,
    familySlug: r.familySlug,
    fastener: r.fastener,
    ftLbs: r.ftLbs,
    nm: r.nm,
    sequence: r.sequence,
    lubricant: r.lubricant,
    torqueToYield: r.torqueToYield,
  })));
});

export default router;
