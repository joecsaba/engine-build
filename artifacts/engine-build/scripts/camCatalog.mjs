// Build-time cam catalog for the engine builder's part-number lookup.
//
// Merges two sources into public/data/cam-catalog.json:
//   - CAM_DATABASE (src/data/camDatabase.ts, via camData.mjs) — the 81
//     hand-verified grinds behind the Cam Selector and /cams pages
//   - scripts/howards_cams.json — Howards Cams' full catalog, scraped from
//     each product page by scripts/scrape_howards_cams.py
//
// The builder stores lift as LOBE lift (buildFieldDefs: "Lift Intake (at
// lobe)"), but manufacturers publish VALVE lift at the engine's stock rocker
// ratio. Each record therefore carries `rr`, the ratio its lift was quoted at,
// so the picker can convert. Where the ratio can't be determined from the
// fitment, `rr` is null and the picker falls back to the build's own rocker
// ratio — it never guesses silently.
//
// Records use short keys; ~3,500 cams is ~1 MB raw, ~150 KB gzipped, fetched
// only when someone opens the picker.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCams } from "./camData.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOWARDS = resolve(__dirname, "..", "..", "..", "scripts", "howards_cams.json");
const OUT = resolve(__dirname, "..", "public", "data", "cam-catalog.json");

// Stock rocker ratio per CAM_DATABASE platform (the ratio its lift is quoted at).
const PLATFORM_RR = {
  sbc: 1.5, bbc: 1.7, ls: 1.7, sbf: 1.6, ford_385: 1.73, cleveland: 1.73,
  mopar_sb: 1.5, mopar_bb: 1.5, pontiac: 1.5,
};

// CAM_DATABASE lifter codes → the builder's cam.type values.
const LIFTER_TO_TYPE = {
  hyd_flat: "hydraulic_flat", hyd_roller: "hydraulic_roller",
  solid_flat: "solid_flat", solid_roller: "solid_roller",
};

// Howards fitment ("Make Engine") → stock rocker ratio. First match wins, so
// more specific patterns come first. Unmatched → null (see header).
const HOWARDS_RR = [
  // Before the LS rule, which would otherwise catch "Gen III Hemi".
  [/(Mopar|Chrysler|Dodge|Plymouth|Jeep|Ram).*\b(5\.7|6\.1|6\.4|Hemi)\b/i, 1.65],
  [/\bLS\d?\b|Gen ?(III|IV|3|4)\b|4\.8|5\.3|6\.0|6\.2|Vortec 4800|Vortec 5300|Vortec 6000/i, 1.7],
  [/Chev.*\b(348|409)\b/i, 1.75],
  [/Chev.*\b(396|402|427|454|496|502|Mark ?IV|Gen ?6|Big Block)/i, 1.7],
  [/Chev.*\b(262|265|267|283|302|305|307|327|350|383|400)\b|Small Block Chev/i, 1.5],
  [/Chev.*\b(200|229|231|262|4\.3)\b.*V-?6|Chev.*V-?6.*\b(200|229|262|4\.3)\b/i, 1.5],
  [/Ford.*\b(351C|351M|Cleveland|335|400M|429|460|370|385)\b/i, 1.73],
  [/Ford.*\b(352|360|390|406|410|427|428|FE)\b/i, 1.76],
  [/Ford.*\b(221|260|289|302|351W|351 ?Windsor|5\.0|5\.8|Small Block)\b/i, 1.6],
  [/(Mopar|Chrysler|Dodge|Plymouth).*\b(273|318|340|360|383|400|413|426|440|LA|Magnum|B\b|RB)/i, 1.5],
  [/Pontiac/i, 1.5],
  [/Olds/i, 1.6],
  [/Buick/i, 1.6],
  [/AMC|American Motors/i, 1.6],
];

function howardsRR(make, engine, yearFrom) {
  const fit = `${make ?? ""} ${engine ?? ""}`;
  // "LT1" is both the 1992-97 Gen II small block (1.5) and the 2014+ Gen V (1.8).
  if (/\bLT[124]\b|\bGen ?V\b/i.test(fit)) return yearFrom && yearFrom >= 2013 ? 1.8 : 1.5;
  for (const [re, rr] of HOWARDS_RR) if (re.test(fit)) return rr;
  return null;
}

function howardsType(camType) {
  const t = (camType ?? "").toLowerCase();
  const roller = t.includes("roller");
  if (t.includes("hydraulic")) return roller ? "hydraulic_roller" : "hydraulic_flat";
  if (t.includes("mechanical") || t.includes("solid")) return roller ? "solid_roller" : "solid_flat";
  return null;
}

const pos = (n) => (typeof n === "number" && n > 0 ? n : null);

/**
 * Howards prints the key specs twice per product: in the spec table and again
 * in the description ("Lift: .447 / .447, Duration @ .050: 223 / 223,
 * Centerline: 108"). ~1.4% of pages contradict themselves. Returns which
 * numbers can't be trusted; same policy as camDatabase.ts — a cam whose
 * @.050 duration or lift is in doubt is left out, and a doubtful ICL is
 * blanked so advance isn't filled from it.
 */
function howardsConflicts(h) {
  const d = h.description ?? "";
  const dur = d.match(/Duration @ \.050:\s*(\d+)\s*\/\s*(\d+)/i);
  const lift = d.match(/Lift:\s*(\d*\.\d+)\s*\/\s*(\d*\.\d+)/i);
  const cl = d.match(/Centerline:\s*(\d+)/i);
  const off = (a, b, tol = 0) => b != null && Math.abs(parseFloat(a) - b) > tol;
  return {
    core:
      (dur && (off(dur[1], h.int050) || off(dur[2], h.exh050))) ||
      (lift && (off(lift[1], h.liftInt, 0.0015) || off(lift[2], h.liftExh, 0.0015))) ||
      (pos(h.advInt) && h.advInt <= h.int050) ||
      (pos(h.advExh) && pos(h.exh050) && h.advExh <= h.exh050),
    icl: Boolean(cl && off(cl[1], h.icl)),
  };
}

/**
 * @param {string[]} extraDirs  also write cam-catalog.json here. prerender
 *   passes dist/public/data: it runs after `vite build` has already copied
 *   public/, so a file only written to public/ would miss this deploy.
 */
export function buildCamCatalog(extraDirs = []) {
  const cams = [];

  for (const c of loadCams().cams) {
    cams.push({
      m: c.mfr, p: c.part, f: c.family,
      fit: c.platformLabel,
      ty: LIFTER_TO_TYPE[c.lifter] ?? null,
      i: c.int050, e: c.exh050,
      ai: null, ae: null,
      li: c.liftInt, le: c.liftExh,
      rr: PLATFORM_RR[c.platform] ?? null,
      lsa: c.lsa, icl: null,
      rl: c.rpmLo, rh: c.rpmHi,
      src: c.url,
    });
  }

  let howards = 0;
  const rejected = [];
  if (existsSync(HOWARDS)) {
    const seen = new Set(cams.map((c) => `${c.m}|${c.p}`));
    for (const h of JSON.parse(readFileSync(HOWARDS, "utf8"))) {
      // A cam record is only useful to the builder with its @.050 durations and LSA.
      if (!h.part || !pos(h.int050) || !pos(h.lsa)) continue;
      const key = `Howards Cams|${h.part}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const conflict = howardsConflicts(h);
      if (conflict.core) {
        rejected.push(h.part);
        continue;
      }
      const fit = [h.make, h.engine, h.years].filter(Boolean).join(" ");
      cams.push({
        m: "Howards Cams", p: h.part, f: h.series,
        fit,
        ty: howardsType(h.camType),
        i: h.int050, e: pos(h.exh050),
        ai: pos(h.advInt), ae: pos(h.advExh),
        li: pos(h.liftInt), le: pos(h.liftExh),
        rr: howardsRR(h.make, h.engine, h.yearFrom),
        lsa: h.lsa, icl: conflict.icl ? null : pos(h.icl),
        rl: h.rpmLo, rh: h.rpmHi,
        src: h.url,
      });
      howards++;
    }
  }

  const json = JSON.stringify({ generated: new Date().toISOString().slice(0, 10), cams });
  for (const file of [OUT, ...extraDirs.map((d) => resolve(d, "cam-catalog.json"))]) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, json, "utf8");
  }
  return { total: cams.length, howards, rejected };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const r = buildCamCatalog();
  console.log(`cam-catalog: ${r.total} cams (${r.howards} Howards) -> ${OUT}`);
  if (r.rejected.length) console.log(`  left out ${r.rejected.length} self-contradicting Howards pages: ${r.rejected.join(", ")}`);
}
