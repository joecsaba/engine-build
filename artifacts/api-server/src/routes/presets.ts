import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, userCalcPresetsTable } from "@workspace/db";

const router: IRouter = Router();

// Same JWT pattern as builds.ts / preferences.ts
function getUserId(req: any): string {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return "guest";
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub ?? "guest";
  } catch {
    return "guest";
  }
}

const MAX_NAME_LEN = 80;
const MAX_PRESETS_PER_CALC = 50;

function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_NAME_LEN) return trimmed.slice(0, MAX_NAME_LEN);
  return trimmed;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ─── GET /api/me/presets?calcSlug=xxx ─────────────────────────────────────────
// List presets for the signed-in user. Filter by calcSlug if provided.
router.get("/me/presets", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (userId === "guest") {
    res.json([]);
    return;
  }
  const calcSlug = typeof req.query.calcSlug === "string" ? req.query.calcSlug : null;

  const rows = await db
    .select()
    .from(userCalcPresetsTable)
    .where(
      calcSlug
        ? and(eq(userCalcPresetsTable.userId, userId), eq(userCalcPresetsTable.calcSlug, calcSlug))
        : eq(userCalcPresetsTable.userId, userId),
    )
    .orderBy(asc(userCalcPresetsTable.name));

  res.json(rows);
});

// ─── POST /api/me/presets ─────────────────────────────────────────────────────
// Create a new preset. Body: { calcSlug, name, state }
router.post("/me/presets", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (userId === "guest") {
    res.status(401).json({ error: "Sign-in required to save presets" });
    return;
  }
  const calcSlug = typeof req.body?.calcSlug === "string" ? req.body.calcSlug : null;
  const name = sanitizeName(req.body?.name);
  const state = isPlainObject(req.body?.state) ? req.body.state : null;

  if (!calcSlug) { res.status(400).json({ error: "calcSlug is required" }); return; }
  if (!name)     { res.status(400).json({ error: "name is required" }); return; }
  if (!state)    { res.status(400).json({ error: "state must be a JSON object" }); return; }

  // Enforce per-calc cap so a runaway client can't fill the table.
  const existing = await db
    .select({ id: userCalcPresetsTable.id })
    .from(userCalcPresetsTable)
    .where(and(eq(userCalcPresetsTable.userId, userId), eq(userCalcPresetsTable.calcSlug, calcSlug)));
  if (existing.length >= MAX_PRESETS_PER_CALC) {
    res.status(400).json({ error: `Limit reached (${MAX_PRESETS_PER_CALC} presets per calculator). Delete one first.` });
    return;
  }

  try {
    const [row] = await db
      .insert(userCalcPresetsTable)
      .values({ userId, calcSlug, name, state })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    // Unique-violation on (user_id, calc_slug, name)
    if (err?.code === "23505") {
      res.status(409).json({ error: `A preset named "${name}" already exists on this calculator.` });
      return;
    }
    throw err;
  }
});

// ─── PUT /api/me/presets/:id ──────────────────────────────────────────────────
// Update name and/or state. Cannot change ownership or calc_slug.
router.put("/me/presets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid preset id" }); return; }

  const userId = getUserId(req);
  if (userId === "guest") {
    res.status(401).json({ error: "Sign-in required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userCalcPresetsTable)
    .where(eq(userCalcPresetsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Preset not found" }); return; }
  if (existing.userId !== userId) { res.status(403).json({ error: "Not authorized" }); return; }

  const patch: Record<string, unknown> = {};
  if (req.body?.name !== undefined) {
    const name = sanitizeName(req.body.name);
    if (!name) { res.status(400).json({ error: "name must be a non-empty string" }); return; }
    patch.name = name;
  }
  if (req.body?.state !== undefined) {
    if (!isPlainObject(req.body.state)) { res.status(400).json({ error: "state must be a JSON object" }); return; }
    patch.state = req.body.state;
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  patch.updatedAt = new Date();

  try {
    const [row] = await db
      .update(userCalcPresetsTable)
      .set(patch)
      .where(eq(userCalcPresetsTable.id, id))
      .returning();
    res.json(row);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: `A preset with that name already exists on this calculator.` });
      return;
    }
    throw err;
  }
});

// ─── DELETE /api/me/presets/:id ───────────────────────────────────────────────
router.delete("/me/presets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid preset id" }); return; }

  const userId = getUserId(req);
  if (userId === "guest") {
    res.status(401).json({ error: "Sign-in required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userCalcPresetsTable)
    .where(eq(userCalcPresetsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Preset not found" }); return; }
  if (existing.userId !== userId) { res.status(403).json({ error: "Not authorized" }); return; }

  await db.delete(userCalcPresetsTable).where(eq(userCalcPresetsTable.id, id));
  res.json({ success: true });
});

export default router;
