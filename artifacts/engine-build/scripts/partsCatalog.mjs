// Build-time parts catalog for the engine builder and build planner.
//
// Merges the per-manufacturer extracts in scripts/parts-catalog/out/*.json
// (repo root; produced by the extractors described in
// scripts/parts-catalog/CLOUD_TASKS.md) into one catalog split by engine
// family:
//
//   public/data/parts/index.json          families, categories, brands, counts
//   public/data/parts/<family-slug>.json  the records that fit that family
//   public/data/parts/universal.json      records with no engine family
//                                         (length-selected pushrods, springs…)
//
// The UI loads universal.json plus the one family file a build needs, so a
// picker never downloads the whole catalog (~9 MB raw).
//
// Rules applied here, and nowhere else:
//   - family names are normalized through FAMILY_ALIASES; anything still
//     outside KNOWN_FAMILIES is kept under its catalog heading and listed in
//     the merge report, never dropped;
//   - one record per (brand, part number, family) — the extractors already
//     emit a part once per family it fits, duplicates across files are
//     reported and the first kept;
//   - Mark IV and Gen VI big-block Chevy stay separate families (the cam
//     fitment data already distinguishes them); extractors emit interchangeable
//     parts under both;
//   - numeric-looking spec strings are coerced to numbers and reported;
//   - `emissions` is carried through as `em` (omitted when null). Internal
//     parts have none; injectors/turbos/tuners carry oem_replacement,
//     carb_eo:<no>, no_eo_race_only or unknown. The UI must never present a
//     no_eo_race_only part as a street recommendation.
//
// Facts only: brand, part number, dimensions, fitment, source. No prices.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "..", "..", "..", "scripts", "parts-catalog", "out");
const OUT_DIR = resolve(__dirname, "..", "public", "data", "parts");
const REPORT = resolve(SRC_DIR, "_merge_report.md");

// Families the planner knows how to match to an engine (cam-fitment.json
// vocabulary plus the diesel platforms). Everything else is "other".
export const KNOWN_FAMILIES = [
  "Small-block Chevy", "Small-block Chevy 305/350", "Chevy Mark IV big block", "Chevy Gen VI big block",
  "Chevy W-series 348/409", "Chevy 8.1L Vortec big block", "GM LS", "GM LT (Gen V)",
  "Chevy inline-6", "Chevy 292 inline-6", "Chevy 90° V6 200/229/262", "Chevy 60° V6 2.8/3.1",
  "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE", "Ford 429/460", "Ford Y-block",
  "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Ford 240/300 inline-6", "Ford 140-250",
  "Ford 144-250 inline-6", "Ford Flathead V8", "Ford EcoBoost", "Ford 2300 OHC (Lima)",
  "Mopar LA small block", "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi",
  "Chrysler 392 Hemi", "Chrysler early Hemi 331/354", "Chrysler Gen III Hemi 5.7/6.1",
  "Chrysler Gen III Hemi 6.2/6.4", "Mopar Slant Six", "Dodge Viper V10",
  "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350", "Buick 215/300/340 V8",
  "Buick V6 181-252", "Buick Nailhead", "Buick/Olds 215-340", "Cadillac 368-500",
  "AMC V8", "AMC/Jeep inline-6",
  "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7", "Duramax 6.6",
  "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7",
  "Universal",
];

// Catalog headings the extractors kept verbatim → canonical family.
const FAMILY_ALIASES = {
  "Ford EcoBoost 1.6": "Ford EcoBoost", "Ford EcoBoost 1.6L": "Ford EcoBoost",
  "Ford EcoBoost 2.0": "Ford EcoBoost", "Ford EcoBoost 2.0L": "Ford EcoBoost",
  "Ford EcoBoost 2.3": "Ford EcoBoost", "Ford EcoBoost 2.3L": "Ford EcoBoost",
  "Ford EcoBoost 3.5": "Ford EcoBoost",
  "Dodge Viper V10 Gen IV": "Dodge Viper V10", "Dodge Viper V10 Gen 1-3": "Dodge Viper V10",
  "CHRY TOP ALCOHOL MECHANICAL ROLLER LIFTERS": "Top Alcohol Hemi",
  "Reverse Rotation High Pressure Pumps": "Universal",
  "GMC 6.5L diesel": "GM 6.2/6.5 diesel",
  "Ford 4.2L V6": "Ford 3.8/4.2 V6",
};

const slug = (s) => s.toLowerCase().replace(/°/g, "deg").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Brand spellings that differ between extractors (a reseller listing names the
// maker slightly differently than the maker's own store).
const BRAND_ALIASES = { "S&S Diesel": "S&S Diesel Motorsport" };

// Spec values are passed through as the extractors typed them. The extractors
// already emit dimensions as numbers; every numeric-looking STRING seen so far
// has been a code (alloy 4032, material 4340, carb flange 4150, SFI 18.1, ring
// set and variant part numbers), so nothing is converted here. Null and empty
// values are dropped, and numeric-looking strings are counted for the report
// so a new extractor that forgets to type its numbers shows up there.
const NUMERIC_RE = /^-?\d+(\.\d+)?"?$/;
function prune(spec, stats) {
  const out = {};
  for (const [k, v] of Object.entries(spec ?? {})) {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    if (typeof v === "string" && NUMERIC_RE.test(v.trim())) stats.numericStrings[k] = (stats.numericStrings[k] ?? 0) + 1;
    out[k] = v;
  }
  return out;
}

function brandSlug(m) {
  return slug(m).replace(/-+/g, "-");
}

export function buildPartsCatalog(extraDirs = []) {
  const stats = { files: 0, records: 0, dupes: [], numericStrings: {}, unknownFamilies: new Map(), byBrand: {}, byCat: {}, byFam: {}, em: {} };
  if (!existsSync(SRC_DIR)) {
    return { ...stats, families: 0, skipped: `no source dir ${SRC_DIR}` };
  }
  const files = readdirSync(SRC_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();
  const seen = new Set();
  const byFamily = new Map(); // fam -> records
  const brands = new Map();   // brand -> count
  const sources = [];

  for (const file of files) {
    const doc = JSON.parse(readFileSync(resolve(SRC_DIR, file), "utf8"));
    stats.files++;
    sources.push({ file: basename(file), extracted: doc.extracted ?? null, count: doc.count ?? doc.parts?.length ?? 0 });
    for (let r of doc.parts ?? []) {
      if (!r.m || !r.p || !r.cat || !r.fit?.fam) continue;
      const rawFam = String(r.fit.fam).trim();
      const fam = FAMILY_ALIASES[rawFam] ?? rawFam;
      r = { ...r, m: BRAND_ALIASES[r.m] ?? r.m };
      const key = `${r.m}|${r.p}|${fam}`;
      if (seen.has(key)) {
        stats.dupes.push(`${key} (${file})`);
        continue;
      }
      seen.add(key);
      if (!KNOWN_FAMILIES.includes(fam)) stats.unknownFamilies.set(fam, (stats.unknownFamilies.get(fam) ?? 0) + 1);

      const fit = {};
      for (const k of ["ci", "cyl", "y0", "y1", "notes"]) if (r.fit[k] !== null && r.fit[k] !== undefined && r.fit[k] !== "") fit[k] = r.fit[k];
      const rec = {
        id: `${brandSlug(r.m)}:${r.p}`,
        m: r.m,
        p: r.p,
        cat: r.cat,
        name: r.name ?? "",
        fit,
        spec: prune(r.spec, stats),
        src: { doc: r.src?.doc ?? "", ed: r.src?.edition ?? "", url: r.src?.url ?? "" },
      };
      if (r.emissions) rec.em = r.emissions;

      if (!byFamily.has(fam)) byFamily.set(fam, []);
      byFamily.get(fam).push(rec);
      brands.set(r.m, (brands.get(r.m) ?? 0) + 1);
      stats.records++;
      stats.byBrand[r.m] = (stats.byBrand[r.m] ?? 0) + 1;
      stats.byCat[r.cat] = (stats.byCat[r.cat] ?? 0) + 1;
      stats.byFam[fam] = (stats.byFam[fam] ?? 0) + 1;
      if (rec.em) stats.em[rec.em.startsWith("carb_eo") ? "carb_eo" : rec.em] = (stats.em[rec.em.startsWith("carb_eo") ? "carb_eo" : rec.em] ?? 0) + 1;
    }
  }

  const generated = new Date().toISOString().slice(0, 10);
  const famEntries = [...byFamily.entries()].sort((a, b) => b[1].length - a[1].length);
  const index = {
    generated,
    records: stats.records,
    brands: [...brands.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => ({ m, n })),
    categories: Object.fromEntries(Object.entries(stats.byCat).sort((a, b) => b[1] - a[1])),
    families: famEntries.map(([fam, recs]) => {
      const cats = {};
      for (const r of recs) cats[r.cat] = (cats[r.cat] ?? 0) + 1;
      return { fam, slug: slug(fam), known: KNOWN_FAMILIES.includes(fam), n: recs.length, cats, file: `${slug(fam)}.json` };
    }),
    sources,
  };

  const outDirs = [OUT_DIR, ...extraDirs.map((d) => resolve(d, "parts"))];
  for (const dir of outDirs) {
    // Stale family files from a previous build must not survive a rename.
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "index.json"), JSON.stringify(index), "utf8");
    for (const [fam, recs] of famEntries) {
      writeFileSync(resolve(dir, `${slug(fam)}.json`), JSON.stringify({ fam, generated, parts: recs }), "utf8");
    }
  }

  // Merge report next to the sources, for the humans doing QA.
  const lines = [
    `# Parts catalog merge report (${generated})`,
    "",
    `Generated by \`artifacts/engine-build/scripts/partsCatalog.mjs\` from ${stats.files} files in \`scripts/parts-catalog/out/\`.`,
    "",
    `- Records: **${stats.records}** across ${brands.size} brands and ${byFamily.size} families (${index.families.filter((f) => f.known).length} known to the planner)`,
    `- Duplicate (brand, part, family) rows skipped: ${stats.dupes.length}`,
    `- Numeric-looking strings left as strings (codes, not dimensions): ${Object.entries(stats.numericStrings).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
    `- Emissions flags: ${Object.entries(stats.em).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
    "",
    "## Records per brand",
    "",
    ...Object.entries(stats.byBrand).sort((a, b) => b[1] - a[1]).map(([m, n]) => `- ${m}: ${n}`),
    "",
    "## Records per category",
    "",
    ...Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${c}: ${n}`),
    "",
    "## Known families",
    "",
    ...index.families.filter((f) => f.known).map((f) => `- ${f.fam}: ${f.n} (${Object.entries(f.cats).map(([c, n]) => `${c} ${n}`).join(", ")})`),
    "",
    "## Families outside the planner vocabulary (kept under the catalog heading)",
    "",
    ...(index.families.filter((f) => !f.known).map((f) => `- ${f.fam}: ${f.n}`)),
    "",
    "## Duplicates skipped",
    "",
    ...(stats.dupes.length ? stats.dupes.map((d) => `- ${d}`) : ["- none"]),
    "",
  ];
  writeFileSync(REPORT, lines.join("\n"), "utf8");

  return { ...stats, families: byFamily.size, known: index.families.filter((f) => f.known).length, outDir: OUT_DIR, report: REPORT };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const r = buildPartsCatalog();
  if (r.skipped) {
    console.log(`parts-catalog: skipped (${r.skipped})`);
  } else {
    console.log(`parts-catalog: ${r.records} records, ${Object.keys(r.byBrand).length} brands, ${r.families} families (${r.known} known) -> ${r.outDir}`);
    console.log(`  ${r.dupes.length} duplicates skipped; report at ${r.report}`);
  }
}
