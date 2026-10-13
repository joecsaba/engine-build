// Vehicle engines with no engine or family page to link to: the engine spec to-do list.
// Usage (from artifacts/engine-build): VEHICLE_DRAFTS=1 node data/vehicles-research/tools/engine_gaps.mjs
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const root = process.cwd();
const v = await import(pathToFileURL(resolve(root, "scripts/vehicleData.mjs")).href);
const { loadEngineData } = await import(pathToFileURL(resolve(root, "scripts/engineData.mjs")).href);
const vs = v.loadVehicles();
v.linkVehicles(vs, loadEngineData());
const gaps = new Map();
for (const x of vs) for (const e of x.engines) {
  if (e.engineUrl || e.familyUrl || e.race || e.electric || e.cid == null) continue;
  const k = `${e.cid} ci | ${e.name} | ${e.desc || e.code || ""}${e.diesel ? " | diesel" : ""}`;
  if (!gaps.has(k)) gaps.set(k, { years: [], models: new Set(), rows: 0 });
  const g = gaps.get(k);
  g.years.push(e.year); g.models.add(`${x.make} ${x.model}`); g.rows++;
}
for (const [k, g] of [...gaps].sort((a, b) => b[1].rows - a[1].rows))
  console.log(`- ${k} — ${Math.min(...g.years)}–${Math.max(...g.years)}, ${g.rows} rows: ${[...g.models].join(", ")}`);
