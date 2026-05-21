// =============================================================================
// engine-build "me" Lambda — user preferences + saved presets
// =============================================================================
// Endpoints:
//   GET    /api/me/preferences
//   PUT    /api/me/preferences
//   GET    /api/me/presets[?calcSlug=xxx]
//   POST   /api/me/presets
//   PUT    /api/me/presets/:id
//   DELETE /api/me/presets/:id
//
// Backed by the user_preferences and user_calc_presets tables in Postgres
// (Supabase). Mirrors the lambda-directory pattern: raw `pg`, lazy-init pool,
// SSL with rejectUnauthorized:false.
//
// Env vars:
//   RDS_HOST, RDS_PORT, RDS_DB, RDS_USER, RDS_PASSWORD   (same as lambda-directory)
//
// Auth: Cognito JWT in Authorization: Bearer header. Decoded without verification
// (same trust model as lambda-directory; HTTPS is the perimeter).
// =============================================================================

import pg from "pg";
const { Pool } = pg;

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT || "5432", 10),
      database: process.env.RDS_DB,
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

const MAX_NAME_LEN = 80;
const MAX_PRESETS_PER_CALC = 50;
const RECENTS_MAX = 20;

const DEFAULT_PREFS = {
  displayName: null,
  defaultUnits: "imperial",
  defaultPlatform: null,
  favorites: [],
  recents: [],
  sidebarTools: [],
  settings: {},
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getUserId(event) {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function sanitizeName(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_NAME_LEN ? trimmed.slice(0, MAX_NAME_LEN) : trimmed;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Map a DB row (snake_case) to the camelCase shape the frontend expects.
function prefRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    displayName: row.display_name,
    defaultUnits: row.default_units,
    defaultPlatform: row.default_platform,
    favorites: row.favorites ?? [],
    recents: row.recents ?? [],
    sidebarTools: row.sidebar_tools ?? [],
    settings: row.settings ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function presetRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    calcSlug: row.calc_slug,
    name: row.name,
    state: row.state ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// /api/me/preferences
// ---------------------------------------------------------------------------

async function getPreferences(userId) {
  const db = getPool();
  const { rows } = await db.query(
    "SELECT * FROM user_preferences WHERE user_id = $1",
    [userId],
  );
  return rows[0] ? prefRow(rows[0]) : { ...DEFAULT_PREFS, userId };
}

async function putPreferences(userId, body) {
  const patch = {};

  if (typeof body.displayName === "string" || body.displayName === null) {
    patch.display_name = body.displayName;
  }
  if (body.defaultUnits === "imperial" || body.defaultUnits === "metric") {
    patch.default_units = body.defaultUnits;
  }
  if (typeof body.defaultPlatform === "string" || body.defaultPlatform === null) {
    patch.default_platform = body.defaultPlatform;
  }
  if (Array.isArray(body.favorites)) {
    patch.favorites = JSON.stringify(body.favorites.filter(s => typeof s === "string"));
  }
  if (Array.isArray(body.recents)) {
    patch.recents = JSON.stringify(
      body.recents
        .filter(r => r && typeof r.slug === "string" && typeof r.ts === "string")
        .slice(0, RECENTS_MAX),
    );
  }
  if (Array.isArray(body.sidebarTools)) {
    patch.sidebar_tools = JSON.stringify(body.sidebarTools.filter(s => typeof s === "string"));
  }
  if (isPlainObject(body.settings)) {
    patch.settings = JSON.stringify(body.settings);
  }

  const cols = Object.keys(patch);
  if (cols.length === 0) {
    return response(400, { error: "No valid preference fields in body" });
  }

  const db = getPool();
  const insertCols = ["user_id", ...cols];
  const insertVals = [userId, ...cols.map(c => patch[c])];
  const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(", ");
  const updateAssignments = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");

  const { rows } = await db.query(
    `INSERT INTO user_preferences (${insertCols.join(", ")})
     VALUES (${placeholders})
     ON CONFLICT (user_id)
     DO UPDATE SET ${updateAssignments}, updated_at = NOW()
     RETURNING *`,
    insertVals,
  );

  return response(200, prefRow(rows[0]));
}

// ---------------------------------------------------------------------------
// /api/me/presets
// ---------------------------------------------------------------------------

async function listPresets(userId, calcSlug) {
  const db = getPool();
  const sql = calcSlug
    ? "SELECT * FROM user_calc_presets WHERE user_id = $1 AND calc_slug = $2 ORDER BY name ASC"
    : "SELECT * FROM user_calc_presets WHERE user_id = $1 ORDER BY name ASC";
  const args = calcSlug ? [userId, calcSlug] : [userId];
  const { rows } = await db.query(sql, args);
  return response(200, rows.map(presetRow));
}

async function createPreset(userId, body) {
  const calcSlug = typeof body.calcSlug === "string" ? body.calcSlug : null;
  const name = sanitizeName(body.name);
  const state = isPlainObject(body.state) ? body.state : null;
  if (!calcSlug) return response(400, { error: "calcSlug is required" });
  if (!name)     return response(400, { error: "name is required" });
  if (!state)    return response(400, { error: "state must be a JSON object" });

  const db = getPool();
  const countRes = await db.query(
    "SELECT COUNT(*)::int AS n FROM user_calc_presets WHERE user_id = $1 AND calc_slug = $2",
    [userId, calcSlug],
  );
  if (countRes.rows[0].n >= MAX_PRESETS_PER_CALC) {
    return response(400, { error: `Limit reached (${MAX_PRESETS_PER_CALC} presets per calculator). Delete one first.` });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO user_calc_presets (user_id, calc_slug, name, state)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, calcSlug, name, JSON.stringify(state)],
    );
    return response(201, presetRow(rows[0]));
  } catch (err) {
    if (err?.code === "23505") {
      return response(409, { error: `A preset named "${name}" already exists on this calculator.` });
    }
    throw err;
  }
}

async function updatePreset(userId, id, body) {
  const db = getPool();
  const owned = await db.query(
    "SELECT id, user_id FROM user_calc_presets WHERE id = $1",
    [id],
  );
  if (owned.rows.length === 0) return response(404, { error: "Preset not found" });
  if (owned.rows[0].user_id !== userId) return response(403, { error: "Not authorized" });

  const patch = {};
  if (body.name !== undefined) {
    const name = sanitizeName(body.name);
    if (!name) return response(400, { error: "name must be a non-empty string" });
    patch.name = name;
  }
  if (body.state !== undefined) {
    if (!isPlainObject(body.state)) return response(400, { error: "state must be a JSON object" });
    patch.state = JSON.stringify(body.state);
  }
  const cols = Object.keys(patch);
  if (cols.length === 0) return response(400, { error: "No fields to update" });

  const setClauses = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const values = cols.map(c => patch[c]);
  values.push(id);

  try {
    const { rows } = await db.query(
      `UPDATE user_calc_presets
       SET ${setClauses}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    );
    return response(200, presetRow(rows[0]));
  } catch (err) {
    if (err?.code === "23505") {
      return response(409, { error: "A preset with that name already exists on this calculator." });
    }
    throw err;
  }
}

async function deletePreset(userId, id) {
  const db = getPool();
  const owned = await db.query(
    "SELECT user_id FROM user_calc_presets WHERE id = $1",
    [id],
  );
  if (owned.rows.length === 0) return response(404, { error: "Preset not found" });
  if (owned.rows[0].user_id !== userId) return response(403, { error: "Not authorized" });

  await db.query("DELETE FROM user_calc_presets WHERE id = $1", [id]);
  return response(200, { success: true });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.rawPath || event.path || "";

  if (method === "OPTIONS") return response(200, {});

  const userId = getUserId(event);

  // Preferences ----------------------------------------------------------------
  if (path === "/api/me/preferences") {
    if (method === "GET") {
      // Guests get defaults without 401 (matches Express behavior).
      if (!userId) return response(200, { ...DEFAULT_PREFS, userId: "guest" });
      try {
        const prefs = await getPreferences(userId);
        return response(200, prefs);
      } catch (err) {
        console.error("preferences GET error:", err);
        return response(500, { error: "Internal server error" });
      }
    }
    if (method === "PUT") {
      if (!userId) return response(401, { error: "Sign-in required to save preferences" });
      try {
        const body = JSON.parse(event.body || "{}");
        return await putPreferences(userId, body);
      } catch (err) {
        console.error("preferences PUT error:", err);
        return response(500, { error: "Internal server error" });
      }
    }
  }

  // Presets list/create --------------------------------------------------------
  if (path === "/api/me/presets") {
    if (method === "GET") {
      if (!userId) return response(200, []);
      try {
        const calcSlug = event.queryStringParameters?.calcSlug || null;
        return await listPresets(userId, calcSlug);
      } catch (err) {
        console.error("presets GET error:", err);
        return response(500, { error: "Internal server error" });
      }
    }
    if (method === "POST") {
      if (!userId) return response(401, { error: "Sign-in required to save presets" });
      try {
        const body = JSON.parse(event.body || "{}");
        return await createPreset(userId, body);
      } catch (err) {
        console.error("presets POST error:", err);
        return response(500, { error: "Internal server error" });
      }
    }
  }

  // Presets update/delete by id ------------------------------------------------
  const presetMatch = path.match(/^\/api\/me\/presets\/(\d+)$/);
  if (presetMatch) {
    if (!userId) return response(401, { error: "Sign-in required" });
    const id = parseInt(presetMatch[1], 10);
    try {
      if (method === "PUT") {
        const body = JSON.parse(event.body || "{}");
        return await updatePreset(userId, id, body);
      }
      if (method === "DELETE") {
        return await deletePreset(userId, id);
      }
    } catch (err) {
      console.error("preset id route error:", err);
      return response(500, { error: "Internal server error" });
    }
  }

  return response(404, { error: "Not found" });
}
