// Vehicle pages: which factory engines each model offered, by model year.
//
//   /vehicles                         index of models
//   /vehicles/<make>                  one make's models
//   /vehicles/<make>/<model>          every year of one model, by generation
//
// Source data is hand-curated in data/vehicles/<make>/<model>.json (committed).
// Every engine-year in it was confirmed by at least three reputable sources
// (NHRA Stock Car Classification Guides, factory material such as GM Heritage
// Center information kits and sales brochures, marque registries, the EPA,
// established publications). Entries that did not reach three sources, or that
// sources disagree on, are kept in the file under "excluded" for the audit
// trail and are never rendered.
//
// This module also links each vehicle engine to the engine spec pages and
// builds the reverse lists ("Factory cars with this engine") that the engine
// and family pages show. The link is made at two levels:
//   - engine page: same manufacturer group, same cubic inches, and a
//     variant with the same model year and rated hp;
//   - family page: the displacement family ("Chevrolet 350ci") when no single
//     engine page can be picked with confidence.
// Displacement must match exactly (to the cubic inch); no match, no link.

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "data", "vehicles");
const OUT = resolve(ROOT, "public", "data", "vehicle-pages");

// Which engine-dataset manufacturers can supply a vehicle make's engines.
// Corporate engines were filed under whichever brand the source used, so a
// Plymouth's 440 may live under Chrysler or Dodge.
const ENGINE_MAKERS = {
  chevrolet: ["chevrolet", "gmc"],
  pontiac: ["pontiac", "chevrolet"],
  oldsmobile: ["oldsmobile", "chevrolet"],
  buick: ["buick", "chevrolet"],
  ford: ["ford", "mercury", "lincoln"],
  mercury: ["mercury", "ford"],
  dodge: ["dodge", "chrysler", "plymouth"],
  plymouth: ["plymouth", "chrysler", "dodge"],
  chrysler: ["chrysler", "dodge", "plymouth"],
};

// Exact cubic inches only. Allowing ±1 linked the Camaro's 230 inline-six to
// the 231 (3.8 V6) family; an engine with no exact match gets no link.
const sameCi = (a, b) => a != null && b != null && Math.round(a) === b;

export function loadVehicles() {
  if (!existsSync(SRC)) return [];
  const out = [];
  for (const make of readdirSync(SRC)) {
    const dir = resolve(SRC, make);
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
      const v = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
      // A model stays a draft until every year of it is verified; drafts build
      // only for local review (VEHICLE_DRAFTS=1), never into a deploy.
      if (v.draft && !process.env.VEHICLE_DRAFTS) continue;
      v.makeSlug = make;
      v.slug = f.replace(/\.json$/, "");
      v.url = `/vehicles/${make}/${v.slug}`;
      v.makeUrl = `/vehicles/${make}`;
      v.engines.sort((a, b) => a.year - b.year || a.cid - b.cid || (a.hp ?? 0) - (b.hp ?? 0));
      const years = v.engines.map((e) => e.year);
      v.yearMin = Math.min(...years);
      v.yearMax = Math.max(...years);
      out.push(v);
    }
  }
  return out.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
}

/**
 * Link vehicle engines to engine/family pages and attach the reverse lists.
 * Mutates engineData.engines[*].factoryCars and engineData.families[*].factoryCars
 * so writeRuntimeData() and the prerender carry them; call before both.
 */
export function linkVehicles(vehicles, engineData) {
  const stats = { engines: 0, enginePage: 0, familyPage: 0, none: 0 };
  const famByUrl = new Map(engineData.families.map((f) => [f.url, f]));
  for (const e of engineData.engines) e.factoryCars = [];
  for (const f of engineData.families) f.factoryCars = [];

  for (const v of vehicles) {
    const makers = ENGINE_MAKERS[v.makeSlug] ?? [v.makeSlug];
    const pool = engineData.engines.filter((e) => makers.includes(e.manufacturerSlug));
    for (const ve of v.engines) {
      stats.engines++;
      if (ve.race) continue; // race-only packages don't get spec links
      let cands = pool.filter((e) => sameCi(e.displacement_ci, ve.cid) &&
        (ve.cyl == null || e.num_cylinders == null || e.num_cylinders === ve.cyl));
      // Same manufacturer first: a Pontiac 400 must not borrow a Chevy 400.
      const own = cands.filter((e) => e.manufacturerSlug === makers[0]);
      if (own.length) cands = own;

      const exact = cands.filter((e) => (e.variants ?? []).some((x) => x.year === ve.year && x.hp === ve.hp));
      const engine = exact.length === 1 ? exact[0] : null;

      // Family: the displacement family most of the candidates belong to,
      // preferring the conventional "<mfr>-<ci>ci" hub.
      const famCount = new Map();
      for (const e of engine ? [engine] : cands) famCount.set(e.familyUrl, (famCount.get(e.familyUrl) ?? 0) + 1);
      const famUrl = [...famCount.entries()]
        .sort((a, b) => Number(/-\d+ci$/.test(b[0])) - Number(/-\d+ci$/.test(a[0])) || b[1] - a[1])[0]?.[0] ?? null;

      ve.engineUrl = engine?.url ?? null;
      ve.familyUrl = famUrl;
      ve.familyName = famUrl ? famByUrl.get(famUrl)?.familyName ?? null : null;
      if (engine) stats.enginePage++; else if (famUrl) stats.familyPage++; else stats.none++;

      const car = {
        vehicle: `${v.make} ${v.model}`,
        url: `${v.url}#${ve.year}`,
        year: ve.year,
        hp: ve.hp,
        hpBasis: ve.hpBasis,
        code: ve.code ?? null,
      };
      if (engine) engine.factoryCars.push(car);
      if (famUrl) famByUrl.get(famUrl)?.factoryCars.push(car);
    }
  }
  // Present each reverse list grouped by vehicle, years ascending.
  const tidy = (list) => {
    const by = new Map();
    for (const c of list) {
      const k = c.vehicle;
      if (!by.has(k)) by.set(k, { vehicle: k, url: c.url.split("#")[0], rows: [] });
      by.get(k).rows.push(c);
    }
    return [...by.values()]
      .map((g) => ({ ...g, rows: g.rows.sort((a, b) => a.year - b.year || (a.hp ?? 0) - (b.hp ?? 0)) }))
      .sort((a, b) => a.rows[0].year - b.rows[0].year);
  };
  for (const e of engineData.engines) e.factoryCars = tidy(e.factoryCars);
  for (const f of engineData.families) f.factoryCars = tidy(f.factoryCars);
  return stats;
}

/** Compress a run of years into "1967–1969" / "1970, 1972". */
export function yearSpan(years) {
  const ys = [...new Set(years)].sort((a, b) => a - b);
  const parts = [];
  let s = ys[0], p = ys[0];
  for (const y of ys.slice(1).concat([null])) {
    if (y === p + 1) { p = y; continue; }
    parts.push(s === p ? `${s}` : `${s}–${p}`);
    s = p = y;
  }
  return parts.join(", ");
}

/** What the React pages fetch. Generated at build time; gitignored. */
export function writeVehicleRuntime(vehicles) {
  // Start clean: a model removed or set back to draft must not linger.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const index = vehicles.map((v) => ({
    make: v.make, model: v.model, url: v.url, makeUrl: v.makeUrl, makeSlug: v.makeSlug,
    yearMin: v.yearMin, yearMax: v.yearMax,
    generations: v.generations.map((g) => ({ name: g.name, years: g.years })),
    engineCount: v.engines.filter((e) => !e.race).length,
  }));
  writeFileSync(resolve(OUT, "index.json"), JSON.stringify(index), "utf8");
  for (const v of vehicles) {
    const dir = resolve(OUT, v.makeSlug);
    mkdirSync(dir, { recursive: true });
    const { excluded, ...pub } = v; // the audit trail stays out of the runtime
    writeFileSync(resolve(dir, `${v.slug}.json`), JSON.stringify(pub), "utf8");
  }
  return vehicles.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { loadEngineData } = await import("./engineData.mjs");
  const vehicles = loadVehicles();
  const stats = linkVehicles(vehicles, loadEngineData());
  console.log(stats);
  for (const v of vehicles) for (const e of v.engines)
    if (!e.engineUrl && !e.race) console.log(`  ${v.model} ${e.year} ${e.cid}/${e.hp} -> ${e.familyUrl ?? "NO LINK"}`);
}
