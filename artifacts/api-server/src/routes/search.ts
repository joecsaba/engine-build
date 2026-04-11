import { Router, type IRouter } from "express";
import { ilike, or, eq, desc } from "drizzle-orm";
import { db, enginesTable, engineFamiliesTable, articlesTable, torqueSpecsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = Array.isArray(req.query.q) ? req.query.q[0] : (req.query.q as string);

  if (!q || q.trim().length < 2) {
    res.json({ engines: [], articles: [], torqueSpecs: [] });
    return;
  }

  const term = `%${q.trim()}%`;

  const [engines, articles, torqueSpecRows] = await Promise.all([
    db.select({
      id: enginesTable.id,
      name: enginesTable.name,
      years: enginesTable.years,
      displacement: enginesTable.displacement,
      horsepower: enginesTable.horsepower,
      applications: enginesTable.applications,
      familyId: enginesTable.familyId,
    })
      .from(enginesTable)
      .where(
        or(
          ilike(enginesTable.name, term),
          ilike(enginesTable.applications, term),
          ilike(enginesTable.displacement, term)
        )
      )
      .limit(5),

    db.select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      excerpt: articlesTable.excerpt,
      category: articlesTable.category,
      publishedAt: articlesTable.publishedAt,
      readTime: articlesTable.readTime,
      imageUrl: articlesTable.imageUrl,
    })
      .from(articlesTable)
      .where(
        or(
          ilike(articlesTable.title, term),
          ilike(articlesTable.excerpt, term),
          ilike(articlesTable.content, term)
        )
      )
      .orderBy(desc(articlesTable.publishedAt))
      .limit(5),

    db.select({
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
          ilike(enginesTable.name, term)
        )
      )
      .limit(5),
  ]);

  const families = await db.select().from(engineFamiliesTable);
  const familyMap = new Map(families.map(f => [f.id, f]));

  res.json({
    engines: engines.map(e => ({
      id: e.id,
      name: e.name,
      years: e.years,
      displacement: e.displacement,
      horsepower: e.horsepower,
      applications: e.applications,
      familySlug: familyMap.get(e.familyId)?.slug ?? "",
    })),
    articles: articles.map(a => ({
      ...a,
      publishedAt: a.publishedAt.toISOString(),
    })),
    torqueSpecs: torqueSpecRows.map(t => ({
      id: t.id,
      engine: t.engineName,
      engineId: t.engineId,
      familySlug: t.familySlug,
      fastener: t.fastener,
      ftLbs: t.ftLbs,
      nm: t.nm,
      sequence: t.sequence,
      lubricant: t.lubricant,
      torqueToYield: t.torqueToYield,
    })),
  });
});

export default router;
