// Usage: node links_for.mjs <make>/<slug> ...  (from artifacts/engine-build) — prints each row's link
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const root = process.cwd();
const v = await import(pathToFileURL(resolve(root, "scripts/vehicleData.mjs")).href);
const { loadEngineData } = await import(pathToFileURL(resolve(root, "scripts/engineData.mjs")).href);
const vs = v.loadVehicles(); v.linkVehicles(vs, loadEngineData());
for (const want of process.argv.slice(2)) {
  const x = vs.find((x) => `${x.makeSlug}/${x.slug}` === want);
  if (!x) { console.log("missing", want); continue; }
  const seen = new Map();
  for (const e of x.engines) {
    const k = `${e.name} | ${e.desc || e.code || ""} | ${e.hp ?? "-"} -> ${e.engineUrl || (e.familyUrl ? "FAMILY " + e.familyUrl : "NONE")}${e.linkTier ? " t" + e.linkTier : ""}`;
    seen.set(k, [...(seen.get(k) ?? []), e.year]);
  }
  console.log("==", want);
  for (const [k, ys] of seen) console.log(` ${Math.min(...ys)}-${Math.max(...ys)} ${k}`);
}
