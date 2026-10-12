// Private source lookup. The public pages don't show sources, but every
// engine-year on a vehicle page and every spec on an engine page we add is
// backed by 3+ independent sources recorded in the repo. This prints them.
//
//   node scripts/vehicleSources.mjs camaro              every year of a model
//   node scripts/vehicleSources.mjs camaro 1969         one year
//   node scripts/vehicleSources.mjs camaro 1969 396     one engine
//   node scripts/vehicleSources.mjs camaro --excluded   what was left off, and why
//   node scripts/vehicleSources.mjs engine chrysler-400 an engine spec page's sources
//
// Vehicle data: data/vehicles/<make>/<model>.json (sources stripped from what
// the site serves). Full research notes: data/vehicles-research/verify/.
// Engine spec sources: data/engine-sources/<id>.json.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [what, a, b] = process.argv.slice(2);

if (!what) {
  console.log("usage: node scripts/vehicleSources.mjs <model> [year] [cid] | <model> --excluded | engine <id>");
  process.exit(1);
}

if (what === "engine") {
  const dir = resolve(ROOT, "data", "engine-sources");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  const hit = files.filter((f) => !a || f.includes(a));
  if (!hit.length) { console.log(`no engine source file matching "${a ?? ""}" in data/engine-sources/`); process.exit(1); }
  for (const f of hit) {
    const d = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
    console.log(`\n${d.name ?? f}`);
    for (const [field, v] of Object.entries(d.fields ?? {})) {
      console.log(`  ${field}: ${v.value}`);
      for (const s of v.sources ?? []) console.log(`      - ${s.name}${s.url ? `  ${s.url}` : ""}${s.says ? `\n        "${s.says}"` : ""}`);
      if (v.note) console.log(`      note: ${v.note}`);
    }
  }
  process.exit(0);
}

const base = resolve(ROOT, "data", "vehicles");
let file = null;
for (const make of readdirSync(base)) {
  const p = resolve(base, make, `${what}.json`);
  if (existsSync(p)) file = p;
}
if (!file) { console.log(`no vehicle "${what}" in data/vehicles/`); process.exit(1); }
const v = JSON.parse(readFileSync(file, "utf8"));

if (a === "--excluded") {
  console.log(`${v.make} ${v.model}: ${v.excluded.length} engine-years left off\n`);
  for (const e of v.excluded) console.log(`  ${e.year} ${e.name} ${e.hp ?? ""} hp — ${e.reason}${e.researchNote ? `\n      ${e.researchNote}` : ""}`);
  process.exit(0);
}

const year = a ? Number(a) : null;
const cid = b ? Number(b) : null;
const rows = v.engines.filter((e) => (!year || e.year === year) && (!cid || e.cid === cid));
console.log(`${v.make} ${v.model}: ${rows.length} engine-years\n`);
for (const e of rows) {
  const hp = e.hpRange ? `${e.hpRange[0]}–${e.hpRange[1]}` : e.hp;
  console.log(`${e.yearLabel ?? e.year}  ${e.name}${e.code ? ` (${e.code})` : ""}  ${hp} hp ${e.hpBasis}  — ${e.sourceCount} independent sources`);
  if (e.nhra) console.log("    - NHRA Stock Car Classification Guides  https://www.nhraracer.com/stockcarclassification");
  for (const s of e.sources ?? []) console.log(`    - ${s.name}  ${s.url}`);
}
console.log(`\nWhat each source says: data/vehicles-research/verify/ (search for the year and cid).`);
