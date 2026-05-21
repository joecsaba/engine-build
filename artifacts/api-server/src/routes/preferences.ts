import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";

const router: IRouter = Router();

// ─── Helper: extract userId from Authorization header (Cognito JWT) ──────────
// Same pattern as builds.ts. Returns "guest" if no/invalid token.
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

const DEFAULT_PREFS = {
  displayName: null as string | null,
  defaultUnits: "imperial",
  defaultPlatform: null as string | null,
  favorites: [] as string[],
  recents: [] as Array<{ slug: string; ts: string }>,
  sidebarTools: [] as string[],
  settings: {} as Record<string, unknown>,
};

const RECENTS_MAX = 20;

// ─── GET /api/me/preferences ──────────────────────────────────────────────────
// Returns the signed-in user's preferences, or defaults for guests / brand-new
// users. Always returns 200 with a fully-shaped object — the client never has
// to handle a missing-record case.
router.get("/me/preferences", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (userId === "guest") {
    res.json({ ...DEFAULT_PREFS, userId: "guest" });
    return;
  }

  const [row] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId));

  if (!row) {
    res.json({ ...DEFAULT_PREFS, userId });
    return;
  }

  res.json(row);
});

// ─── PUT /api/me/preferences ──────────────────────────────────────────────────
// Upserts the user's preferences. Body accepts any subset of:
//   displayName, defaultUnits, defaultPlatform, favorites, recents,
//   sidebarTools, settings
// Unspecified fields keep their existing value (or default).
router.put("/me/preferences", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (userId === "guest") {
    res.status(401).json({ error: "Sign-in required to save preferences" });
    return;
  }

  const body = req.body ?? {};
  const patch: Record<string, unknown> = {};

  if (typeof body.displayName === "string" || body.displayName === null) {
    patch.displayName = body.displayName;
  }
  if (body.defaultUnits === "imperial" || body.defaultUnits === "metric") {
    patch.defaultUnits = body.defaultUnits;
  }
  if (typeof body.defaultPlatform === "string" || body.defaultPlatform === null) {
    patch.defaultPlatform = body.defaultPlatform;
  }
  if (Array.isArray(body.favorites)) {
    patch.favorites = body.favorites.filter((s: unknown) => typeof s === "string");
  }
  if (Array.isArray(body.recents)) {
    patch.recents = body.recents
      .filter((r: any) => r && typeof r.slug === "string" && typeof r.ts === "string")
      .slice(0, RECENTS_MAX);
  }
  if (Array.isArray(body.sidebarTools)) {
    patch.sidebarTools = body.sidebarTools.filter((s: unknown) => typeof s === "string");
  }
  if (body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)) {
    patch.settings = body.settings;
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No valid preference fields in body" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId));

  let row;
  if (!existing) {
    [row] = await db
      .insert(userPreferencesTable)
      .values({ userId, ...patch })
      .returning();
  } else {
    [row] = await db
      .update(userPreferencesTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(userPreferencesTable.userId, userId))
      .returning();
  }

  res.json(row);
});

export default router;
