import { Router, type IRouter } from "express";
import { eq, desc, ilike } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/articles", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "10", 10) || 10, 50);
  const offset = parseInt((req.query.offset as string) ?? "0", 10) || 0;
  const category = req.query.category as string | undefined;

  let query = db.select({
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
    .orderBy(desc(articlesTable.publishedAt))
    .limit(limit)
    .offset(offset);

  const rows = await (category
    ? db.select({
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
        .where(eq(articlesTable.category, category))
        .orderBy(desc(articlesTable.publishedAt))
        .limit(limit)
        .offset(offset)
    : query);

  res.json(rows.map(a => ({
    ...a,
    publishedAt: a.publishedAt.toISOString(),
  })));
});

router.get("/articles/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.slug, slug));
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.json({
    ...article,
    publishedAt: article.publishedAt.toISOString(),
    tags: article.tags ?? [],
  });
});

export default router;
