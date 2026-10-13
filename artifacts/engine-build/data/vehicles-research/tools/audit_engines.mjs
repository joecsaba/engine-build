// Audit the engine database and vehicle links for internal contradictions.
// Usage (from artifacts/engine-build): VEHICLE_DRAFTS=1 node <this file> > audit.txt
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const root = process.cwd();
const { loadEngineData } = await import(pathToFileURL(resolve(root, "scripts/engineData.mjs")).href);
const v = await import(pathToFileURL(resolve(root, "scripts/vehicleData.mjs")).href);
const d = loadEngineData();
const vs = v.loadVehicles();
v.linkVehicles(vs, d);

const out = { geometry: [], square: [], familyMixedCyl: [], familyMixedEra: [], linkCyl: [], linkEra: [], linkCi: [] };

// 1. geometry: computed displacement vs stated
for (const e of d.engines) {
  const { bore_in: b, stroke_in: s, num_cylinders: n, displacement_ci: ci } = e;
  if (b && s && n && ci) {
    const calc = 0.7853982 * b * b * s * n;
    const err = Math.abs(calc - ci) / ci;
    if (err > 0.02) out.geometry.push({ url: e.url, ci, calc: +calc.toFixed(1), bore: b, stroke: s, cyl: n, err: +(err * 100).toFixed(1) });
    if (b === s) out.square.push({ url: e.url, ci, bore: b, stroke: s });
  }
}

// 2. families: mixed cylinder counts, or records decades apart under a named (non -ci) family
const byFam = new Map();
for (const e of d.engines) { if (!byFam.has(e.familyUrl)) byFam.set(e.familyUrl, []); byFam.get(e.familyUrl).push(e); }
for (const [url, recs] of byFam) {
  const cyls = [...new Set(recs.map((e) => e.num_cylinders).filter(Boolean))];
  if (cyls.length > 1) out.familyMixedCyl.push({ url, cyls, engines: recs.map((e) => `${Math.round(e.displacement_ci)}ci/${e.num_cylinders}cyl/${e.yearMin ?? "?"}`) });
  const ys = recs.flatMap((e) => [e.yearMin, e.yearMax]).filter(Boolean);
  if (ys.length && Math.max(...ys) - Math.min(...ys) > 45 && !/-\d+ci$/.test(url))
    out.familyMixedEra.push({ url, years: [Math.min(...ys), Math.max(...ys)], engines: recs.map((e) => `${Math.round(e.displacement_ci)}ci/${e.yearMin ?? "?"}`) });
}

// 3. vehicle links: cylinders and era of what a row lands on
const engByUrl = new Map(d.engines.map((e) => [e.url, e]));
const seen = new Set();
for (const x of vs) for (const ve of x.engines) {
  if (ve.race || ve.electric || ve.noLink) continue;
  const target = ve.engineUrl ? [engByUrl.get(ve.engineUrl)] : (byFam.get(ve.familyUrl) ?? []).filter((e) => Math.round(e.displacement_ci) === ve.cid);
  if (!target.length || !target[0]) continue;
  const key = `${x.model}|${ve.cid}|${ve.engineUrl ?? ve.familyUrl}`;
  if (seen.has(key)) continue; seen.add(key);
  const row = { vehicle: `${x.draft ? "DRAFT " : ""}${x.make} ${x.model}`, year: ve.year, engine: ve.name, link: ve.engineUrl ?? ve.familyUrl };
  if (ve.cyl && target.every((e) => e.num_cylinders && e.num_cylinders !== ve.cyl)) out.linkCyl.push({ ...row, targetCyl: target.map((e) => e.num_cylinders) });
  const near = target.some((e) => e.yearMin == null || (ve.year >= e.yearMin - 12 && ve.year <= (e.yearMax ?? e.yearMin) + 12));
  if (!near) out.linkEra.push({ ...row, targetYears: target.map((e) => [e.yearMin, e.yearMax]) });
  if (ve.engineUrl && Math.round(engByUrl.get(ve.engineUrl).displacement_ci) !== ve.cid) out.linkCi.push(row);
}
for (const [k, list] of Object.entries(out)) {
  console.log(`\n## ${k} (${list.length})`);
  for (const r of list) console.log(JSON.stringify(r));
}
