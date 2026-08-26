// Validated loader for the NHRA Stock/Super Stock blueprint scrape in
// workflows/data/nhra_blueprints/ (376 files, 1,739 records, parsed from
// nhra.net/tech_specs/engine/blueprints/*.rtf).
//
// The blueprints are an authoritative source — they are the spec sheets NHRA
// uses to police class legality — but the parse has defects. Every rule below
// comes from a validation pass over the whole set, and each one drops data
// rather than guessing at a correction:
//
//   1. Two-digit year pivot bug. CHEV-55.rtf parsed as year 2055, not 1955.
//      Affects 34 records across 1949-1959. Fixed, not dropped: the file name
//      is unambiguous.
//   2. Broken dimensions. 26 records fail a displacement cross-check
//      (pi/4 * bore^2 * stroke * cylinders vs the stated figure). One Pontiac
//      207ci computes to 142.6ci because stroke parsed as 2.31" instead of
//      3.31". Dropped — a wrong bore or stroke is worse than a missing engine.
//   3. Impossible chamber volumes. 11 records carry head_cc between 6.6 and
//      10.3, which is not a combustion chamber. Field dropped for those.
//   4. Impossible compression. 8 records at 23.5:1, diesel territory for what
//      are gasoline stock-class engines. Field dropped.
//   5. Duplicate engine_ids. 51 ids appear 2-3 times, some with conflicting
//      specs (chevr_1965_396_375hp differs between files). Newest source year
//      wins; identical copies collapse silently.
//
// Deliberately NOT trusted:
//   - `deck_height` is not deck height. Median 0.010", 82% under 0.030", max
//     0.341" — that is piston-to-deck CLEARANCE, which is what NHRA measures
//     for legality. A block deck height is ~9". It is exposed under its real
//     name, `piston_deck_clearance`, and never mapped to deck_height_in.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLUEPRINTS = resolve(__dirname, "..", "..", "..", "workflows", "data", "nhra_blueprints");

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** CHEV-55 parsed as 2055. Anything past this year is the pivot bug. */
function fixYear(year) {
  const y = num(year);
  if (y == null) return null;
  if (y >= 2040 && y <= 2059) return y - 100; // 2055 -> 1955
  if (y < 1900 || y > 2030) return null;
  return y;
}

/** Stated displacement must agree with bore/stroke/cylinders within 3%. */
function dimensionsAgree(r) {
  const b = num(r.bore_in), s = num(r.stroke_in), c = num(r.num_cylinders), d = num(r.displacement_ci);
  if (b == null || s == null || c == null || d == null || d <= 0) return null; // unknown, not failed
  const calc = (Math.PI / 4) * b * b * s * c;
  return Math.abs(calc - d) / d <= 0.03;
}

export function loadNhraEngines() {
  if (!existsSync(BLUEPRINTS)) return { engines: [], stats: { available: false } };

  const raw = [];
  for (const file of readdirSync(BLUEPRINTS).filter((f) => f.endsWith(".json"))) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(join(BLUEPRINTS, file), "utf8"));
    } catch {
      continue;
    }
    for (const e of doc.engines ?? []) {
      if (!e.engine_id) continue;
      raw.push({ ...e, _sourceFile: doc.source_file ?? file, _sourceUrl: doc.source_url ?? null });
    }
  }

  const stats = {
    available: true, raw: raw.length,
    yearFixed: 0, droppedDimensions: 0, droppedNoDimensions: 0,
    strippedHeadCc: 0, strippedCr: 0, duplicatesCollapsed: 0,
  };

  // ---- clean each record ---------------------------------------------------
  const cleaned = [];
  for (const r of raw) {
    const yearRaw = num(r.year);
    const year = fixYear(r.year);
    if (year != null && yearRaw != null && year !== yearRaw) stats.yearFixed++;

    const agree = dimensionsAgree(r);
    if (agree === false) { stats.droppedDimensions++; continue; }
    if (agree === null) { stats.droppedNoDimensions++; continue; }

    let head_cc = num(r.head_cc);
    if (head_cc != null && (head_cc < 35 || head_cc > 130)) { head_cc = null; stats.strippedHeadCc++; }

    let cr = num(r.compression_ratio);
    if (cr != null && (cr < 6 || cr > 15)) { cr = null; stats.strippedCr++; }

    const rocker = num(r.rocker_ratio);
    const lifter = typeof r.lifter_type === "string" && ["hydraulic", "mechanical"].includes(r.lifter_type)
      ? r.lifter_type : null;

    // NHRA's "deck_height" is piston-to-deck clearance. Sanity-bound it and
    // keep the honest name.
    let pdc = num(r.deck_height);
    if (pdc != null && (pdc < 0 || pdc > 0.5)) pdc = null;

    cleaned.push({
      engine_id: r.engine_id,
      manufacturer: r.manufacturer ?? null,
      year,
      displacement_ci: num(r.displacement_ci),
      num_cylinders: num(r.num_cylinders),
      bore_in: num(r.bore_in),
      stroke_in: num(r.stroke_in),
      rod_length_in: num(r.rod_length_in),
      compression_ratio: cr,
      advertised_hp: num(r.advertised_hp),
      induction: r.induction ?? null,
      carb_make: r.carb_make ?? null,
      head_cc,
      rocker_ratio: rocker,
      lifter_type: lifter,
      intake_valve_dia: num(r.intake_valve),
      exhaust_valve_dia: num(r.exhaust_valve),
      cam_intake_lift: num(r.cam_intake_lift),
      cam_exhaust_lift: num(r.cam_exhaust_lift),
      piston_deck_clearance: pdc,
      _sourceFile: r._sourceFile,
      _sourceUrl: r._sourceUrl,
    });
  }

  // ---- resolve duplicate ids: newest source year wins -----------------------
  const byId = new Map();
  for (const r of cleaned) {
    const prev = byId.get(r.engine_id);
    if (!prev) { byId.set(r.engine_id, r); continue; }
    stats.duplicatesCollapsed++;
    if ((r.year ?? 0) > (prev.year ?? 0)) byId.set(r.engine_id, r);
  }

  const engines = [...byId.values()];
  stats.clean = engines.length;
  stats.withHeadCc = engines.filter((e) => e.head_cc != null).length;
  stats.withRocker = engines.filter((e) => e.rocker_ratio != null).length;
  stats.withLifter = engines.filter((e) => e.lifter_type != null).length;
  stats.withPdc = engines.filter((e) => e.piston_deck_clearance != null).length;

  return { engines, stats };
}

/** Geometry key used to match an NHRA record against a published engine. */
export function geoKey(bore, stroke, cylinders) {
  if (bore == null || stroke == null || cylinders == null) return null;
  return `${Number(bore).toFixed(3)}|${Number(stroke).toFixed(3)}|${Number(cylinders)}`;
}
