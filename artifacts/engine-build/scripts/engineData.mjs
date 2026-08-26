// Build-time index over the engine dataset in public/data/engines/.
//
// Turns 2,374 raw engine records into the route set that prerender.mjs emits
// and that the React pages consume:
//
//   /engines/<mfr>                      36 manufacturer hubs
//   /engines/<mfr>/<family>            455 family hubs
//   /engines/<mfr>/<family>/<engine>  ~1420 engine pages
//
// Two rules govern what becomes a page, both aimed at staying the right side of
// Google's scaled-content policy:
//
// 1. One page per DISTINCT GEOMETRY, not per record. 1,408 of the 2,374 records
//    are near-duplicates — same bore/stroke/displacement/cylinders/CR, differing
//    only by model year or advertised HP (chevrolet-350ci alone has a 14-record
//    cluster). Those collapse into a single page that lists the variants in a
//    table, which is both more useful and not a doorway page.
//
// 2. A record needs all four core dimensions to be published at all. Everything
//    in the current dataset clears this, but it keeps a future sparse import
//    from silently minting empty pages.
//
// Torque specs are deliberately NOT surfaced anywhere here — that dataset is on
// hold (1,315 malformed torque_to_yield entries) and must not reach search.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "..", "public");
const DATA = resolve(PUBLIC, "data");

export function hyphenate(s) {
  return String(s)
    .replace(/_/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function stripPrefix(id, prefix) {
  return prefix && id.startsWith(prefix + "_") ? id.slice(prefix.length + 1) : null;
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Title-case an engine or family slug for display: "honda-k-series" -> "Honda K Series"
function titleize(s) {
  return String(s)
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (/^[a-z]\d|^\d/.test(w) || w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}


// Deep links from an engine into the calculators, with its numbers already in
// the query string. Computed here so the prerendered HTML and the React page
// emit the same links from one definition — these are also the internal links
// that carry crawl equity from 1,346 engine pages into the calculators.
//
// Param names are the contract read by usePrefill() in src/hooks/usePrefill.ts.
// A link is only emitted when the engine has the inputs that calculator needs;
// landing on an empty form is worse than no link.
function calcLinksFor(e) {
  const qs = (params) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === "") continue;
      p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const links = [];
  if (e.bore_in != null && e.stroke_in != null && e.num_cylinders != null) {
    links.push({ label: "Displacement calculator", href: `/calculators/displacement${qs({ bore: e.bore_in, stroke: e.stroke_in, cylinders: e.num_cylinders })}` });
  }
  if (e.bore_in != null && e.stroke_in != null) {
    links.push({ label: "Compression ratio calculator", href: `/calculators/compression-ratio${qs({ bore: e.bore_in, stroke: e.stroke_in, cylinders: e.num_cylinders, targetCr: e.compression_ratio })}` });
    links.push({ label: "Piston ring gap calculator", href: `/calculators/ring-gap${qs({ bore: e.bore_in })}` });
  }
  if (e.stroke_in != null) {
    links.push({ label: "Piston speed calculator", href: `/calculators/piston-speed${qs({ stroke: e.stroke_in })}` });
  }
  if (e.rod_length_in != null && e.stroke_in != null) {
    links.push({ label: "Rod ratio calculator", href: `/calculators/rod-ratio${qs({ rod: e.rod_length_in, stroke: e.stroke_in })}` });
  }
  if (e.displacement_ci != null) {
    links.push({ label: "Carburetor CFM calculator", href: `/calculators/carb-cfm-sizing${qs({ displacement: e.displacement_ci })}` });
  }
  return links;
}

/**
 * Read the whole dataset and return { manufacturers, families, engines }.
 * Every entry carries the `url` it will be published at.
 */
export function loadEngineData() {
  const families = JSON.parse(readFileSync(resolve(DATA, "families.json"), "utf8"));
  const manufacturers = JSON.parse(readFileSync(resolve(DATA, "manufacturers.json"), "utf8"));

  const mfrByslug = new Map(manufacturers.map((m) => [m.slug, m]));
  const outFamilies = [];
  const outEngines = [];
  // URL segment -> real family_slug, so the React page can find the JSON file.
  const familyIndex = {};

  for (const f of families) {
    const file = resolve(DATA, "engines", f.manufacturer_slug, `${f.family_slug}.json`);
    if (!existsSync(file)) continue;

    let doc;
    try {
      doc = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }

    const mfrSeg = hyphenate(f.manufacturer_slug);
    const famSeg = hyphenate(stripPrefix(f.family_slug, f.manufacturer_slug) ?? f.family_slug);
    const famUrl = `/engines/${mfrSeg}/${famSeg}`;
    familyIndex[`${mfrSeg}/${famSeg}`] = {
      manufacturer_slug: f.manufacturer_slug,
      family_slug: f.family_slug,
    };

    // --- collapse records that describe the same physical engine ------------
    const groups = new Map();
    for (const e of doc.engines ?? []) {
      if (!e.engine_id) continue;
      // Core dimensions required to publish.
      if (num(e.bore_in) == null || num(e.stroke_in) == null ||
          num(e.displacement_ci) == null || num(e.num_cylinders) == null) continue;
      const key = [e.bore_in, e.stroke_in, e.displacement_ci, e.num_cylinders, e.compression_ratio].join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }

    const usedSlugs = new Set();
    const famEngines = [];

    for (const group of groups.values()) {
      // Representative record = the one with the most populated fields, so the
      // page leads with the best-documented member of the cluster.
      const rep = group
        .slice()
        .sort((a, b) => Object.values(b).filter((v) => v != null).length -
                        Object.values(a).filter((v) => v != null).length)[0];

      // Slug priority:
      //  1. a variant code shared by the whole cluster ("K20A", "LS1") — what a
      //     builder actually calls the engine, and what they search for;
      //  2. for a lone record, its own id with the family/manufacturer prefix
      //     stripped;
      //  3. for a multi-record cluster with no code, the geometry itself. Naming
      //     such a page after one member ("chevr-2014-350-530hp") would be a lie
      //     — it covers every year in the cluster.
      const sharedCode = (() => {
        const codeSets = group.map((e) => new Set((e.variants ?? []).map((v) => v.code).filter(Boolean)));
        if (!codeSets.length || codeSets.some((s) => s.size === 0)) return null;
        const common = [...codeSets[0]].filter((c) => codeSets.every((s) => s.has(c)));
        return common.length === 1 ? common[0] : null;
      })();

      const geomSlug = () => {
        const d = rep.displacement_ci != null ? `${Math.round(rep.displacement_ci)}ci` : "engine";
        const b = rep.bore_in != null ? `${rep.bore_in.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}` : null;
        const s = rep.stroke_in != null ? `${rep.stroke_in.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}` : null;
        return b && s ? `${d}-${b}x${s}` : d;
      };

      let slug = hyphenate(
        sharedCode ??
        (group.length === 1
          ? (stripPrefix(rep.engine_id, f.family_slug) ??
             stripPrefix(rep.engine_id, f.manufacturer_slug) ??
             rep.engine_id)
          : geomSlug())
      );
      // Disambiguate with compression ratio, then fall back to the raw id.
      if (usedSlugs.has(slug) && rep.compression_ratio != null) {
        slug = hyphenate(`${slug}-${String(rep.compression_ratio).replace(".", "-")}cr`);
      }
      if (usedSlugs.has(slug)) slug = hyphenate(rep.engine_id);
      usedSlugs.add(slug);

      // Variants = the collapsed cluster, shown as a table on the page.
      const variants = group
        .map((e) => ({
          engine_id: e.engine_id,
          year: e.year ?? null,
          hp: num(e.advertised_hp),
          codes: (e.variants ?? []).map((v) => v.code).filter(Boolean),
        }))
        .sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || (a.hp ?? 0) - (b.hp ?? 0));

      // Union the vehicle fitment across the cluster.
      const vehicles = [];
      const seenVeh = new Set();
      for (const e of group) {
        for (const v of e.vehicles ?? []) {
          const k = v.name;
          if (!k || seenVeh.has(k)) continue;
          seenVeh.add(k);
          vehicles.push(v);
        }
      }

      const hps = group.map((e) => num(e.advertised_hp)).filter((v) => v != null);
      const years = group.map((e) => e.year).filter(Boolean);

      // Display name follows the same logic as the slug, but reads like a human
      // wrote it. A geometry-derived slug must not become "350CI-4X3.48".
      const famNameEarly = f.family_name || titleize(famSeg);
      const displayName = sharedCode
        ? sharedCode
        : group.length === 1
          ? titleize(slug)
          : `${famNameEarly} · ${rep.bore_in?.toFixed(3)}" × ${rep.stroke_in?.toFixed(3)}"` +
            (rep.compression_ratio != null ? ` · ${rep.compression_ratio}:1` : "");
      const famName = famNameEarly;
      const mfrName = f.manufacturer_name || mfrByslug.get(f.manufacturer_slug)?.name || titleize(mfrSeg);

      famEngines.push({
        url: `${famUrl}/${slug}`,
        slug,
        engine_id: rep.engine_id,
        displayName,
        familyName: famName,
        familySlug: f.family_slug,
        familyUrl: famUrl,
        manufacturerName: mfrName,
        manufacturerSlug: f.manufacturer_slug,
        manufacturerUrl: `/engines/${mfrSeg}`,
        // geometry
        bore_in: num(rep.bore_in),
        stroke_in: num(rep.stroke_in),
        bore_mm: num(rep.bore_mm),
        stroke_mm: num(rep.stroke_mm),
        displacement_ci: num(rep.displacement_ci),
        displacement_l: num(rep.displacement_l),
        num_cylinders: num(rep.num_cylinders),
        compression_ratio: num(rep.compression_ratio),
        rod_length_in: num(rep.rod_length_in),
        deck_height_in: num(rep.deck_height_in),
        // description
        configuration: rep.configuration ?? doc.configuration ?? null,
        block_material: rep.block_material ?? null,
        head_material: rep.head_material ?? null,
        valvetrain: rep.valvetrain ?? null,
        valves_per_cylinder: num(rep.valves_per_cylinder),
        cam_type: rep.cam_type ?? null,
        fuel_type: rep.fuel_type ?? null,
        induction: rep.induction ?? null,
        firing_order: rep.firing_order ?? null,
        oil_capacity_qt: num(rep.oil_capacity_qt),
        coolant_capacity_qt: num(rep.coolant_capacity_qt),
        // derived
        rod_ratio: num(rep.rod_length_in) && num(rep.stroke_in)
          ? +(rep.rod_length_in / rep.stroke_in).toFixed(3) : null,
        boreStrokeRatio: num(rep.bore_in) && num(rep.stroke_in)
          ? +(rep.bore_in / rep.stroke_in).toFixed(3) : null,
        hpMin: hps.length ? Math.min(...hps) : null,
        hpMax: hps.length ? Math.max(...hps) : null,
        yearMin: years.length ? Math.min(...years) : null,
        yearMax: years.length ? Math.max(...years) : null,
        // Cylinder head specs, whitelisted to the four fields that hold real
        // per-engine data. head_cc, valve_stem_dia, rocker_ratio, lifter_type,
        // spring_type and head_gasket_thickness exist in the source but are
        // empty on every record, so they are not carried through.
        head: (() => {
          const h = rep.head;
          if (!h) return null;
          const out = {};
          for (const k of ["intake_valve_dia", "exhaust_valve_dia", "cam_intake_lift", "cam_exhaust_lift"]) {
            if (num(h[k]) != null) out[k] = num(h[k]);
          }
          return Object.keys(out).length ? out : null;
        })(),

        // `clearances` is deliberately NOT carried through. Like torque, that
        // block is templated rather than measured — 372 engines share 4-9
        // distinct values per field, and the figures skew dangerously tight
        // (LS7 piston-to-wall stored as 0.0005-0.0018" against a real spec
        // nearer 0.0045-0.0055"). Dropping it here means it cannot reach a
        // page by accident. See [[project_torque_data_hold]] for the parallel.
        vehicles,
        variants,
        variantCount: group.length,
      });
      famEngines[famEngines.length - 1].calcLinks = calcLinksFor(famEngines[famEngines.length - 1]);
    }

    if (!famEngines.length) continue;

    famEngines.sort((a, b) => (b.displacement_ci ?? 0) - (a.displacement_ci ?? 0));

    outFamilies.push({
      url: famUrl,
      familySlug: f.family_slug,
      familyName: f.family_name || titleize(famSeg),
      manufacturerName: f.manufacturer_name || mfrByslug.get(f.manufacturer_slug)?.name || titleize(mfrSeg),
      manufacturerSlug: f.manufacturer_slug,
      manufacturerUrl: `/engines/${mfrSeg}`,
      configuration: f.configuration ?? doc.configuration ?? null,
      engines: famEngines,
    });
    outEngines.push(...famEngines);
  }

  // Manufacturer hubs, only for manufacturers that actually have families.
  const byMfr = new Map();
  for (const fam of outFamilies) {
    if (!byMfr.has(fam.manufacturerUrl)) {
      byMfr.set(fam.manufacturerUrl, {
        url: fam.manufacturerUrl,
        name: fam.manufacturerName,
        slug: fam.manufacturerSlug,
        country: mfrByslug.get(fam.manufacturerSlug)?.country ?? null,
        families: [],
      });
    }
    byMfr.get(fam.manufacturerUrl).families.push(fam);
  }
  const outManufacturers = [...byMfr.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const m of outManufacturers) {
    m.families.sort((a, b) => a.familyName.localeCompare(b.familyName));
    m.engineCount = m.families.reduce((n, f) => n + f.engines.length, 0);
  }

  // ---- related engines -----------------------------------------------------
  // Cross-links between engine pages, computed once the full set is known.
  //
  // Two jobs: they give crawlers paths between 1,346 pages that previously only
  // connected upward through their family hub, and they give a reader landing
  // on one engine somewhere to go next — which is the lever on pages per
  // session, currently 1.7.
  //
  // Ordering is nearest-displacement first within the family (the engines
  // someone is genuinely cross-shopping), then the same manufacturer, then
  // anything close in size. Displacement is the axis builders actually compare
  // on, so a 350 sits next to a 383 rather than next to an unrelated 4-cylinder.
  const byDisp = outEngines
    .filter((e) => e.displacement_ci != null)
    .sort((a, b) => a.displacement_ci - b.displacement_ci);

  const brief = (e) => ({
    url: e.url,
    displayName: e.displayName,
    familyName: e.familyName,
    manufacturerName: e.manufacturerName,
    displacement_ci: e.displacement_ci,
  });

  for (const e of outEngines) {
    const picked = [];
    const seen = new Set([e.url]);
    const take = (candidates, limit) => {
      for (const c of candidates) {
        if (picked.length >= limit) break;
        if (seen.has(c.url)) continue;
        seen.add(c.url);
        picked.push(brief(c));
      }
    };
    const near = (pool) =>
      e.displacement_ci == null
        ? pool
        : pool
            .slice()
            .sort((a, b) =>
              Math.abs((a.displacement_ci ?? 1e9) - e.displacement_ci) -
              Math.abs((b.displacement_ci ?? 1e9) - e.displacement_ci));

    take(near(outEngines.filter((x) => x.familyUrl === e.familyUrl)), 4);
    take(near(outEngines.filter((x) => x.manufacturerSlug === e.manufacturerSlug)), 6);
    if (e.displacement_ci != null) take(near(byDisp), 8);
    e.relatedEngines = picked;
  }

  return { manufacturers: outManufacturers, families: outFamilies, engines: outEngines, familyIndex };
}

/**
 * Emit the runtime data the React pages fetch.
 *
 * One file per family under public/data/engine-pages/<mfr>/<family>.json,
 * holding the already-processed engines. The alternative — having the client
 * re-derive slugs, clusters and display names from the raw dataset — would mean
 * maintaining the logic above in two languages and guarantees drift.
 *
 * Generated at build time; the directory is gitignored.
 */
export function writeRuntimeData({ manufacturers, families }) {
  const outDir = resolve(DATA, "engine-pages");
  mkdirSync(outDir, { recursive: true });

  for (const fam of families) {
    const [, , mfrSeg, famSeg] = fam.url.split("/");
    const dir = resolve(outDir, mfrSeg);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, `${famSeg}.json`),
      JSON.stringify({
        url: fam.url,
        familyName: fam.familyName,
        manufacturerName: fam.manufacturerName,
        manufacturerUrl: fam.manufacturerUrl,
        configuration: fam.configuration,
        engines: fam.engines,
      }),
      "utf8"
    );
  }

  // Manufacturer hubs: families only, no engine payload.
  writeFileSync(
    resolve(outDir, "manufacturers.json"),
    JSON.stringify(
      manufacturers.map((m) => ({
        url: m.url,
        name: m.name,
        country: m.country,
        engineCount: m.engineCount,
        families: m.families.map((f) => ({
          url: f.url,
          familyName: f.familyName,
          configuration: f.configuration,
          engineCount: f.engines.length,
        })),
      }))
    ),
    "utf8"
  );

  return families.length + 1;
}
