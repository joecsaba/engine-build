// Give every vehicle engine a specific engine page (user request 2026-10-13: a row
// for the 1994 S-10's 4.3 L35 must land on the L35, not on the family list).
//
// For each vehicle row that only reaches a family page, build an engine record from
//   - the row's verified facts: model year, rated hp, engine code, cylinders, fuel
//   - the family's verified geometry: bore and stroke of its records with the same
//     cubic inches and cylinder count, used only when they all agree
// Records carry page_code (the engine code, or the description) so engineData groups
// each code onto its own page that lists every year it was offered.
// Records are written to the family's data file (created for NHRA-only families),
// and families.json is updated. Re-running replaces earlier generated records.
//
// Usage (from artifacts/engine-build): VEHICLE_DRAFTS=1 node data/vehicles-research/tools/vehicle_engine_records.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

import { readdirSync, unlinkSync } from "node:fs";
const root = process.cwd();
const ENG = resolve(root, "public/data/engines");
const FAMS = resolve(root, "public/data/families.json");
const GEN = "vehicle-pages";            // marks generated records so a re-run can replace them

// Re-runs start clean: drop earlier generated records before the data is loaded,
// otherwise their pages would count as existing links and be thrown away below.
for (const mfr of readdirSync(ENG)) for (const fn of readdirSync(resolve(ENG, mfr)).filter((n) => n.endsWith(".json"))) {
  const p = resolve(ENG, mfr, fn);
  const txt = readFileSync(p, "utf8");
  if (!txt.includes(`"${GEN}"`)) continue;
  const doc = JSON.parse(txt);
  const kept = doc.engines.filter((e) => e.origin !== GEN);
  if (!kept.length && doc.generated_family) { unlinkSync(p); continue; }
  doc.engines = kept;
  writeFileSync(p, dumpDoc(doc) + "\n");
}
function dumpDoc(o) {
  return Array.isArray(o) ? "[" + o.map(dumpDoc).join(", ") + "]"
    : o && typeof o === "object" ? "{" + Object.entries(o).map(([k, x]) => `${JSON.stringify(k)} : ${dumpDoc(x)}`).join(", ") + "}"
    : JSON.stringify(o);
}
const v = await import(pathToFileURL(resolve(root, "scripts/vehicleData.mjs")).href);
const { loadEngineData } = await import(pathToFileURL(resolve(root, "scripts/engineData.mjs")).href);
const r3 = (x) => Math.round(x * 1000) / 1000;
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// Start from data without earlier generated records.
const files = new Map();               // rel path -> doc
const readDoc = (rel) => {
  if (!files.has(rel)) {
    const p = resolve(ENG, rel);
    const doc = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
    if (doc) doc.engines = doc.engines.filter((e) => e.origin !== GEN);
    files.set(rel, doc);
  }
  return files.get(rel);
};

const d = loadEngineData();
const vs = v.loadVehicles();
v.linkVehicles(vs, d);
const famByUrl = new Map(d.families.map((f) => [f.url, f]));
const byFam = new Map();
for (const e of d.engines) {
  if (!byFam.has(e.familyUrl)) byFam.set(e.familyUrl, []);
  byFam.get(e.familyUrl).push(e);
}

const made = new Map();                 // rel -> Map(engine_id -> record)
const skipped = [];
for (const x of vs) for (const ve of x.engines) {
  if ((ve.engineUrl && ve.linkTier !== 3) || !ve.familyUrl || ve.race || ve.electric || ve.noLink || ve.cid == null) continue;
  const fam = famByUrl.get(ve.familyUrl);
  if (!fam) continue;
  // the family's geometry for this size; skip unless every record agrees
  const same = (byFam.get(ve.familyUrl) ?? []).filter((e) =>
    Math.round(e.displacement_ci) === ve.cid && (ve.cyl == null || e.num_cylinders === ve.cyl) &&
    e.bore_in != null && e.stroke_in != null && (/diesel/i.test(e.fuel_type ?? "") === !!ve.diesel));
  // figures within 0.01 in are the same engine (4.000 vs 4.001 bore); different
  // engines of one size (Buick vs Chevrolet 350) differ by far more and are skipped
  const close = (a, b) => Math.abs(a.bore_in - b.bore_in) <= 0.01 && Math.abs(a.stroke_in - b.stroke_in) <= 0.01;
  // prefer records from nearby model years: a 1994 4.3 takes its figures from the
  // 1988-1996 4.3s, not from a 1975 V8 or an odd 1985 record in the same size family
  const near = same.filter((e) => e.yearMin != null &&
    ve.year >= e.yearMin - 6 && ve.year <= (e.yearMax ?? e.yearMin) + 6);
  if (near.length && near.every((e) => close(e, near[0]))) same.splice(0, same.length, ...near);
  if (!same.length || !same.every((e) => close(e, same[0]))) {
    skipped.push(`${x.model} ${ve.year} ${ve.cid} -> ${ve.familyUrl} (${same.length ? "different engines" : "no geometry"})`); continue;
  }
  const tally = new Map();
  for (const e of same) { const k = `${r3(e.bore_in)}x${r3(e.stroke_in)}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
  const best = [...tally].sort((a, b) => b[1] - a[1])[0][0];
  const g = same.find((e) => `${r3(e.bore_in)}x${r3(e.stroke_in)}` === best);
  const rel = `${fam.manufacturerSlug}/${fam.familySlug}.json`;
  const code = (ve.code || ve.desc || "").trim() || null;
  // an existing page already carries this engine code: link there, don't duplicate it
  // (only a page that lists this model year counts; an undated page is no substitute)
  if (code && (byFam.get(ve.familyUrl) ?? []).some((e) => !e.generated && (e.variants ?? []).some((x) =>
      x.year === ve.year && (x.codes ?? []).some((c) => String(c).toUpperCase() === code.toUpperCase())))) continue;
  const id = `${slugify(fam.familySlug)}_veh_${ve.year}_${ve.cid}_${ve.hp ?? "na"}${code ? "_" + slugify(code) : ""}`;
  if (!made.has(rel)) made.set(rel, new Map());
  if (made.get(rel).has(id)) continue;
  made.get(rel).set(id, {
    engine_id: id, year: ve.year, displacement_ci: g.displacement_ci, displacement_l: g.displacement_l ?? null,
    num_cylinders: g.num_cylinders, bore_in: g.bore_in, stroke_in: g.stroke_in, rod_length_in: g.rod_length_in ?? null,
    compression_ratio: null, advertised_hp: ve.hp ?? null, fuel_type: ve.diesel ? "diesel" : (g.fuel_type ?? "gas"),
    firing_order: g.firing_order ?? null, block_material: g.block_material ?? null, head_material: g.head_material ?? null,
    valvetrain: g.valvetrain ?? null, nhra_verified: false, vehicles: null,
    variants: [{ code, description: null }], head: null, clearances: null, torque_specs: null,
    // the family's default layout can be another engine's (the 262 family is a V8 and a V6)
    configuration: /\bV-?6\b/.test(ve.name) ? "V6" : /\bV-?8\b/.test(ve.name) ? "V8" : /\bV-?10\b/.test(ve.name) ? "V10"
      : /inline-six|straight-six/i.test(ve.name) ? "I6" : /inline-four/i.test(ve.name) ? "I4"
      : /inline-three/i.test(ve.name) ? "I3" : null,
    page_code: code ?? `${ve.cid}ci`, origin: GEN,
  });
}

// One page per engine code: rows can take their figures from slightly different
// records (4.000 vs 4.001 bore), so give every record of a code the most common set.
for (const recs of made.values()) {
  const byCode = new Map();
  for (const r of recs.values()) {
    const k = `${r.page_code}|${r.num_cylinders}|${r.fuel_type}`;
    if (!byCode.has(k)) byCode.set(k, []);
    byCode.get(k).push(r);
  }
  for (const list of byCode.values()) {
    const tally = new Map();
    for (const r of list) {
      const k = JSON.stringify([r.bore_in, r.stroke_in, r.displacement_ci, r.displacement_l]);
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    const [b, s, ci, l] = JSON.parse([...tally].sort((a, b) => b[1] - a[1])[0][0]);
    for (const r of list) Object.assign(r, { bore_in: b, stroke_in: s, displacement_ci: ci, displacement_l: l });
  }
}

// the engine files' own style: json.dumps(separators=(", ", " : "))
const dump = (o) => Array.isArray(o) ? "[" + o.map(dump).join(", ") + "]"
  : o && typeof o === "object" ? "{" + Object.entries(o).map(([k, x]) => `${JSON.stringify(k)} : ${dump(x)}`).join(", ") + "}"
  : JSON.stringify(o);
const asciiOnly = (s) => s.replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

// write
const famList = JSON.parse(readFileSync(FAMS, "utf8"));
const famIdx = new Map(famList.map((f) => [`${f.manufacturer_slug}/${f.family_slug}.json`, f]));
let added = 0;
for (const [rel, recs] of made) {
  let doc = readDoc(rel);
  const fam = d.families.find((f) => `${f.manufacturerSlug}/${f.familySlug}.json` === rel);
  if (!doc) doc = { family: fam.familyName, manufacturer: fam.manufacturerName, configuration: fam.configuration ?? null,
                    generated_family: true, engines: [] };
  doc.engines.push(...recs.values());
  added += recs.size;
  mkdirSync(dirname(resolve(ENG, rel)), { recursive: true });
  writeFileSync(resolve(ENG, rel), dump(doc) + "\n");
  if (famIdx.has(rel)) famIdx.get(rel).engine_count = doc.engines.length;
  else {
    const entry = { family_slug: fam.familySlug, manufacturer_slug: fam.manufacturerSlug, manufacturer_name: fam.manufacturerName,
                    family_name: fam.familyName, configuration: fam.configuration ?? null, engine_count: doc.engines.length };
    famList.push(entry); famIdx.set(rel, entry);
  }
}
const raw = readFileSync(FAMS, "utf8");
const ser = (f) => raw.includes("\\u") ? asciiOnly(JSON.stringify(f)) : JSON.stringify(f);
writeFileSync(FAMS, "[" + famList.map(ser).join(", \n ") + "]" + (raw.endsWith("\n") ? "\n" : ""));
console.log(`generated ${added} records in ${made.size} family files; skipped ${skipped.length} rows (no single geometry)`);
for (const s of skipped.slice(0, 40)) console.log("  skip", s);
