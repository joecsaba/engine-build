// Merged engine list for the Engine Builder's "Engine Database" picker.
//
// The raw dataset (public/data/engines/) repeats the same engine for every
// model year: 48 records for the Ford 302, 46 for the Chevy 350. Picking an
// engine to build should not mean scrolling past 46 copies. This merges records
// that are physically the same engine and keeps what actually changes between
// them as "versions" — so the builder only asks which year when the answer
// changes something you build with.
//
// Merge key: family + bore + stroke + cylinders + valvetrain. Valvetrain is in
// the key because a SOHC and a DOHC engine with the same bore and stroke are
// different engines. Records with no bore or stroke on file are never merged —
// without geometry there is no safe way to say two records are the same.
//
// Versions inside a merged engine are grouped by the specs a build depends on:
// compression ratio and chamber volume. Rated horsepower is NOT a build input
// (and much of its year-to-year movement is the 1972 switch from gross to net
// ratings), so engines that differ only in rated hp get one version and the
// builder never asks.
//
// This feeds ONLY the builder. The spec pages are built by engineData.mjs from
// the same raw files and are deliberately unchanged.
//
// Output: public/data/builder-engines/<mfr>/<family>.json and counts.json.
// Generated at build time; gitignored alongside engine-pages/.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "..", "public", "data", "engines");
const OUT = resolve(__dirname, "..", "public", "data", "builder-engines");

const r3 = (v) => (v == null || v === "" ? null : Math.round(Number(v) * 1000) / 1000);
const r1 = (v) => (v == null || v === "" ? null : Math.round(Number(v) * 10) / 10);
const fillScore = (e) => Object.values(e).filter((v) => v != null && v !== "" && !(Array.isArray(v) && !v.length)).length;

function rangeLabel(lo, hi) {
  if (lo == null) return null;
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

function mergeFamily(engines) {
  const groups = new Map();
  for (const e of engines) {
    const geo = e.bore_in != null && e.stroke_in != null;
    const key = geo
      ? [r3(e.bore_in), r3(e.stroke_in), e.num_cylinders ?? "", e.valvetrain ?? ""].join("|")
      : `solo|${e.engine_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const out = [];
  for (const [key, recs] of groups) {
    // Versions: one per distinct (compression, chamber cc).
    const vmap = new Map();
    for (const e of recs) {
      const vkey = `${r1(e.compression_ratio) ?? "?"}|${e.head?.head_cc ?? "?"}`;
      if (!vmap.has(vkey)) vmap.set(vkey, []);
      vmap.get(vkey).push(e);
    }
    const versions = [...vmap.values()].map((vs) => {
      const years = vs.map((e) => e.year).filter((y) => y != null).map(Number).sort((a, b) => a - b);
      const codes = [...new Set(vs.flatMap((e) => (e.variants || []).map((v) => v.code)).filter(Boolean))];
      const hps = vs.map((e) => e.advertised_hp).filter((h) => h != null).map(Number).sort((a, b) => a - b);
      const rep = [...vs].sort((a, b) => fillScore(b) - fillScore(a))[0];
      return {
        engine_id: rep.engine_id, // the record the build sheet loads defaults from
        yearMin: years[0] ?? null,
        yearMax: years[years.length - 1] ?? null,
        codes,
        compression_ratio: rep.compression_ratio ?? null,
        head_cc: rep.head?.head_cc ?? null,
        hpMin: hps[0] ?? null,
        hpMax: hps[hps.length - 1] ?? null,
      };
    }).sort((a, b) => (a.yearMin ?? 9999) - (b.yearMin ?? 9999) || String(a.codes[0] ?? "").localeCompare(String(b.codes[0] ?? "")));

    for (const v of versions) {
      const when = rangeLabel(v.yearMin, v.yearMax) ?? (v.codes.length ? v.codes.join(" / ") : null);
      // One decimal for display: the source carries conversion noise (9.002).
      const crText = v.compression_ratio != null ? `${Number(v.compression_ratio).toFixed(1)}:1` : null;
      const bits = [when, crText, v.head_cc != null ? `${v.head_cc} cc chambers` : null];
      v.label = bits.filter(Boolean).join(" · ") || "Standard";
    }

    const all = recs;
    const rep = [...all].sort((a, b) => fillScore(b) - fillScore(a))[0];
    const years = all.map((e) => e.year).filter((y) => y != null).map(Number);
    const hps = all.map((e) => e.advertised_hp).filter((h) => h != null).map(Number);
    const codes = [...new Set(all.flatMap((e) => (e.variants || []).map((v) => v.code)).filter(Boolean))];
    const disp = rep.displacement_l != null ? `${rep.displacement_l}L` : null;
    const ci = rep.displacement_ci != null ? `${Math.round(rep.displacement_ci)} ci` : null;
    const yr = years.length ? rangeLabel(Math.min(...years), Math.max(...years)) : null;
    const codeLabel = codes.length && codes.length <= 3 ? codes.join("/") : null;

    out.push({
      id: key.startsWith("solo|") ? rep.engine_id : `${rep.engine_id}~m`,
      label: [codeLabel, disp, ci && `(${ci})`, rep.valvetrain, /diesel/i.test(rep.fuel_type ?? "") ? "Diesel" : null, yr].filter(Boolean).join(" "),
      engine_id: rep.engine_id,
      bore_in: rep.bore_in ?? null,
      stroke_in: rep.stroke_in ?? null,
      displacement_ci: rep.displacement_ci ?? null,
      displacement_l: rep.displacement_l ?? null,
      num_cylinders: rep.num_cylinders ?? null,
      valvetrain: rep.valvetrain ?? null,
      fuel_type: rep.fuel_type ?? null,
      hpMin: hps.length ? Math.min(...hps) : null,
      hpMax: hps.length ? Math.max(...hps) : null,
      recordCount: all.length,
      // The builder asks "which year/version?" only when versions differ in
      // something you build with.
      needsVersion: versions.length > 1,
      versionPrompt: versions.every((v) => v.yearMin != null) ? "Which year?" : "Which version?",
      versions,
    });
  }
  return out.sort((a, b) => (a.displacement_ci ?? 0) - (b.displacement_ci ?? 0) || a.label.localeCompare(b.label));
}

export function writeBuilderEngines() {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  const counts = {};
  let rawTotal = 0, mergedTotal = 0, asking = 0;
  for (const mfr of readdirSync(SRC)) {
    const dir = resolve(SRC, mfr);
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const d = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
      const engines = d.engines || [];
      const merged = mergeFamily(engines);
      const fam = file.replace(/\.json$/, "");
      mkdirSync(resolve(OUT, mfr), { recursive: true });
      writeFileSync(resolve(OUT, mfr, `${fam}.json`), JSON.stringify({ family: d.family, engines: merged }));
      counts[`${mfr}/${fam}`] = merged.length;
      rawTotal += engines.length;
      mergedTotal += merged.length;
      asking += merged.filter((m) => m.needsVersion).length;
    }
  }
  writeFileSync(resolve(OUT, "counts.json"), JSON.stringify(counts));
  return { rawTotal, mergedTotal, asking };
}

// Allow `node scripts/builderEngines.mjs` for a quick look.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(writeBuilderEngines());
}
