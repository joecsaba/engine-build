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

import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { loadNhraEngines, geoKey } from "./nhraData.mjs";
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


// Facts computed from an engine's own dimensions.
//
// These are the numbers a builder derives by hand from bore, stroke and rod
// length, and each one differs per engine because it is arithmetic on that
// engine's figures — not a template with the name swapped. They also answer
// real queries ("is the LS1 oversquare", "LS7 piston speed") that the bare
// spec table does not.
//
// Piston speed is quoted at a fixed 6,000 RPM reference because redline is not
// in the dataset; stating the RPM makes the figure checkable rather than
// implying we know where this engine actually revs to.
function derivedFor(e) {
  const out = [];
  const { bore_in: b, stroke_in: s, num_cylinders: c, displacement_ci: d, rod_ratio: rr, compression_ratio: cr } = e;

  if (b != null && s != null) {
    const ratio = b / s;
    const character =
      ratio >= 1.05 ? "oversquare — bore exceeds stroke, which favours higher RPM and larger valves"
      : ratio <= 0.95 ? "undersquare — stroke exceeds bore, which favours low-end torque"
      : "square — bore and stroke are within 5%, a balanced compromise";
    out.push({ label: "Bore/stroke character", value: `${ratio.toFixed(3)} — ${character}` });
  }

  if (s != null) {
    // Mean piston speed (ft/min) = 2 * stroke(in) * RPM / 12
    const fpm = Math.round((2 * s * 6000) / 12);
    const note = fpm > 4500 ? "above the 4,500 ft/min mark where most production bottom ends are considered at their limit"
      : fpm > 3500 ? "in the range typical of performance street engines"
      : "conservative for a street engine";
    out.push({ label: "Mean piston speed at 6,000 RPM", value: `${fpm.toLocaleString()} ft/min — ${note}` });
  }

  if (rr != null) {
    const note = rr >= 1.75 ? "long — less side loading on the cylinder wall, favours high RPM"
      : rr <= 1.55 ? "short — more side loading and piston dwell at TDC, typical of stroker combinations"
      : "moderate — the range most production V8s fall in";
    out.push({ label: "Rod ratio", value: `${rr} — ${note}` });
  }

  if (d != null && c != null) {
    out.push({ label: "Displacement per cylinder", value: `${(d / c).toFixed(1)} ci` });
  }

  if (cr != null) {
    const note = cr >= 11 ? "high enough that pump premium or better is normally required"
      : cr >= 9.5 ? "in the range that usually runs on pump premium"
      : "low by modern standards, generally happy on regular pump fuel";
    out.push({ label: "Static compression", value: `${cr}:1 — ${note}` });
  }

  return out;
}

// Computed context for a family hub.
//
// Hubs were the thinnest pages on the site — median 82 words, 438 of 473 under
// 150 — because a hub is a comparison table, and a table of one or two rows says
// almost nothing. 193 families hold a single engine.
//
// Everything here is arithmetic over the family's own members, so a one-engine
// family reads differently from a nineteen-engine one, and a family spanning
// 40 years of iron reads differently from a single modern casting. No sentence
// is emitted unless the data supports it.
function familyContext(fam) {
  const es = fam.engines;
  const nums = (f) => es.map((e) => e[f]).filter((v) => v != null);
  const rng = (f, dp = 0) => {
    const v = nums(f);
    if (!v.length) return null;
    const lo = Math.min(...v), hi = Math.max(...v);
    return lo === hi ? lo.toFixed(dp) : `${lo.toFixed(dp)}–${hi.toFixed(dp)}`;
  };

  const facts = [];
  const disp = nums("displacement_ci");
  if (disp.length) {
    const lo = Math.min(...disp), hi = Math.max(...disp);
    facts.push(["Displacement", lo === hi ? `${lo} ci` : `${lo}–${hi} ci`]);
  }
  const cyl = [...new Set(nums("num_cylinders"))].sort((a, b) => a - b);
  if (cyl.length) facts.push(["Cylinders", cyl.join(", ")]);
  const bore = rng("bore_in", 3), stroke = rng("stroke_in", 3);
  if (bore) facts.push(["Bore", `${bore}"`]);
  if (stroke) facts.push(["Stroke", `${stroke}"`]);
  const cr = rng("compression_ratio", 1);
  if (cr) facts.push(["Compression", `${cr}:1`]);
  const hp = [...nums("hpMin"), ...nums("hpMax")];
  if (hp.length) {
    const lo = Math.min(...hp), hi = Math.max(...hp);
    facts.push(["Advertised power", lo === hi ? `${lo} hp` : `${lo}–${hi} hp`]);
  }
  const yrs = [...nums("yearMin"), ...nums("yearMax")];
  if (yrs.length) {
    const lo = Math.min(...yrs), hi = Math.max(...yrs);
    facts.push(["Years", lo === hi ? `${lo}` : `${lo}–${hi}`]);
  }
  const withHead = es.filter((e) => e.head).length;
  if (withHead) facts.push(["Cylinder head data", `${withHead} of ${es.length} engines`]);

  // What actually varies across the family — the question a hub should answer.
  const notes = [];
  const bores = new Set(nums("bore_in").map((v) => v.toFixed(4)));
  const strokes = new Set(nums("stroke_in").map((v) => v.toFixed(4)));
  if (es.length > 1) {
    if (bores.size === 1 && strokes.size > 1) {
      notes.push(`Every engine here shares a ${nums("bore_in")[0]}" bore; displacement varies by stroke alone, which is the signature of a family built on one block with different cranks.`);
    } else if (strokes.size === 1 && bores.size > 1) {
      notes.push(`Stroke is constant at ${nums("stroke_in")[0]}" across the family — the displacement spread comes from bore, so these share a crank and differ in the block.`);
    } else if (bores.size > 1 && strokes.size > 1) {
      notes.push(`Both bore and stroke vary across the family, so these are separate castings rather than variations on one block.`);
    }
    const crv = nums("compression_ratio");
    if (crv.length > 1) {
      const lo = Math.min(...crv), hi = Math.max(...crv);
      if (hi - lo >= 1.5) {
        notes.push(`Compression spans ${lo}:1 to ${hi}:1, so fuel requirements differ meaningfully between members — worth checking before assuming parts interchange.`);
      }
    }
  } else if (es.length === 1) {
    const e = es[0];
    const bits = [];
    if (e.displacement_ci != null) bits.push(`${e.displacement_ci} ci`);
    if (e.num_cylinders != null) bits.push(`${e.num_cylinders} cylinders`);
    if (e.bore_in != null && e.stroke_in != null) bits.push(`a ${e.bore_in}" × ${e.stroke_in}" bore and stroke`);
    if (bits.length) notes.push(`This family is represented by a single engine in the database: ${bits.join(", ")}.`);
  }

  const os = es.filter((e) => e.boreStrokeRatio != null && e.boreStrokeRatio >= 1.05).length;
  const us = es.filter((e) => e.boreStrokeRatio != null && e.boreStrokeRatio <= 0.95).length;
  if (os && !us) notes.push(`${os === es.length ? "All" : `${os} of ${es.length}`} are oversquare — bore larger than stroke, which favours revs over low-end torque.`);
  else if (us && !os) notes.push(`${us === es.length ? "All" : `${us} of ${es.length}`} are undersquare — stroke larger than bore, favouring torque low in the range.`);
  else if (os && us) notes.push(`The family mixes oversquare and undersquare designs, so members behave quite differently despite sharing a name.`);

  return { facts, notes };
}

// Manufacturer display name, resolved the same way in both the record build and
// the title build.
function mfrNameEarly(f, mfrByslug, mfrSeg) {
  return f.manufacturer_name || mfrByslug.get(f.manufacturer_slug)?.name || titleize(mfrSeg);
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
      // Records built from the verified vehicle pages carry page_code (the engine
      // code, "L35") so each code gets its own page; older records have none and
      // keep their existing grouping (and URLs).
      const key = [e.bore_in, e.stroke_in, e.displacement_ci, e.num_cylinders, e.compression_ratio].join("|") +
        (e.page_code ? `|${e.page_code}` : "");
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

      // Pages built from the vehicle data with no engine code ("301ci" in 1977-1979
      // Buicks) are named for the size and the years they cover.
      const isGen = group.every((e) => e.origin === "vehicle-pages");
      const genYears = group.map((e) => e.year).filter(Boolean);
      const genSpan = genYears.length ? (Math.min(...genYears) === Math.max(...genYears)
        ? `${Math.min(...genYears)}` : `${Math.min(...genYears)}-${Math.max(...genYears)}`) : "";
      const genSlug = isGen && !sharedCode ? `${rep.page_code ?? geomSlug()}${genSpan ? "-" + genSpan : ""}` : null;
      let slug = hyphenate(
        sharedCode ?? genSlug ??
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
      // A lone record named from an id like "chevr_1975_262_110hp" must not show
      // as "Chevr 1975 262 110HP": say the family, year and rating instead.
      const idLike = /^[a-z]+-\d{4}-\d+-\d+hp$/.test(slug);
      const idName = `${famNameEarly}${rep.year ? ` (${rep.year})` : ""}` +
        (num(rep.advertised_hp) != null ? ` · ${num(rep.advertised_hp)} hp` : "");
      const displayName = sharedCode
        ? sharedCode
        : genSlug
          ? `${famNameEarly}${genSpan ? ` (${genSpan.replace("-", "–")})` : ""}`
        : group.length === 1
          ? (idLike ? idName : titleize(slug))
          : `${famNameEarly} · ${rep.bore_in?.toFixed(3)}" × ${rep.stroke_in?.toFixed(3)}"` +
            (rep.compression_ratio != null ? ` · ${rep.compression_ratio}:1` : "");
      const famName = famNameEarly;

      // The <title> is a different job from the on-page heading. displayName is
      // built to identify an engine unambiguously in a list; used verbatim in a
      // title it produced things like
      //   "Chevrolet Chevrolet 350ci · 4.065" × 3.370" · 12.5:1 Specs"
      // — the manufacturer twice, 60-plus characters of geometry punctuation,
      // and nothing a person would ever type into a search box. That shape was
      // on 444 of 1,472 pages.
      //
      // seoTitle instead leads with what someone searches: the engine code if
      // it has one, otherwise the family, then the single spec that separates
      // this record from its siblings.
      const seoTitle = (() => {
        const startsWithMfr = famNameEarly.toLowerCase().startsWith(mfrNameEarly(f, mfrByslug, mfrSeg).toLowerCase());
        const mfr = mfrNameEarly(f, mfrByslug, mfrSeg);
        if (sharedCode) return `${mfr} ${sharedCode}`;
        if (genSlug) return startsWithMfr ? displayName : `${mfr} ${displayName}`;
        if (group.length === 1 && idLike) return startsWithMfr ? idName : `${mfr} ${idName}`;
        if (group.length === 1) return `${mfr} ${titleize(slug)}`;
        // Cluster: lead with the family, then the most distinguishing figure.
        const base = startsWithMfr ? famNameEarly : `${mfr} ${famNameEarly}`;
        if (rep.compression_ratio != null) return `${base} ${rep.compression_ratio}:1`;
        if (rep.bore_in != null) return `${base} ${rep.bore_in.toFixed(3)}" bore`;
        return base;
      })();
      const mfrName = f.manufacturer_name || mfrByslug.get(f.manufacturer_slug)?.name || titleize(mfrSeg);

      famEngines.push({
        // built from the verified vehicle pages (vehicle_engine_records.mjs); such
        // pages never absorb NHRA rows, which keep their own year-by-year pages
        generated: group.every((e) => e.origin === "vehicle-pages"),
        url: `${famUrl}/${slug}`,
        slug,
        engine_id: rep.engine_id,
        displayName,
        seoTitle,
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
        // the family default only when it fits this record (a 262 family can hold a V8 and a V6)
        configuration: rep.configuration ?? (() => {
          const c = doc.configuration, n = num(rep.num_cylinders);
          const m = /(\d+)/.exec(String(c ?? ""));
          return c && n && m && Number(m[1]) !== n ? null : (c ?? null);
        })(),
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
          // cam_intake_lift / cam_exhaust_lift are NOT carried. The NHRA field is
          // ambiguous — only ~27 of 156 records are plausible as lobe lift and
          // ~28 as valve lift, and 79 of 152 values fall below 0.200", which is
          // not a lift of either kind (some are 0.02, some are 0). Publishing it
          // would put a number on the page that is wrong by a rocker ratio at
          // best and meaningless at worst.
          for (const k of ["intake_valve_dia", "exhaust_valve_dia"]) {
            if (num(h[k]) != null) out[k] = num(h[k]);
          }
          // head_cc, rocker_ratio and lifter_type are empty on every record in
          // public/data/engines. They are backfilled from the NHRA blueprints
          // in the merge pass below.
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
      famEngines[famEngines.length - 1].derived = derivedFor(famEngines[famEngines.length - 1]);
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

  // ---- merge the NHRA blueprints -------------------------------------------
  // Two distinct jobs, both keyed on geometry rather than engine_id, because
  // the ids in public/data/engines and the ids in the blueprints only overlap
  // partially:
  //
  //   ENRICH  an NHRA record whose bore/stroke/cylinders already exists on the
  //           site contributes head_cc, rocker_ratio and lifter_type — three
  //           fields that are present-but-empty on every published record.
  //   ADD     an NHRA record with geometry the site has never carried becomes a
  //           new engine. These are mostly muscle-era Chevrolet, Pontiac, Buick
  //           and AMC iron with no coverage at all.
  //
  // Matching on geometry also means an added engine can never duplicate a page
  // that already exists, which is the rule the whole route set is built on.
  const nhra = loadNhraEngines();
  const nhraStats = { ...nhra.stats, enriched: 0, added: 0, newFamilies: 0 };

  if (nhra.engines.length) {
    const byGeo = new Map();
    for (const e of outEngines) {
      if (e.generated) continue;
      const k = geoKey(e.bore_in, e.stroke_in, e.num_cylinders);
      if (k && !byGeo.has(k)) byGeo.set(k, e);
    }

    const leftovers = [];
    for (const r of nhra.engines) {
      const k = geoKey(r.bore_in, r.stroke_in, r.num_cylinders);
      const target = k ? byGeo.get(k) : null;
      if (!target) { if (k) leftovers.push(r); continue; }
      // An undated family record (a "Buick Small-Block V8 · 340" page with no
      // model years) must not swallow the dated NHRA rows: they still get their
      // own year-by-year "<mfr>-<ci>ci" pages, which is where vehicle rows link.
      if (target.yearMin == null && r.year != null) leftovers.push(r);

      const head = target.head ?? {};
      let touched = false;
      for (const [field, value] of [
        ["head_cc", r.head_cc], ["rocker_ratio", r.rocker_ratio], ["lifter_type", r.lifter_type],
        ["intake_valve_dia", r.intake_valve_dia], ["exhaust_valve_dia", r.exhaust_valve_dia],
      ]) {
        if (value != null && head[field] == null) { head[field] = value; touched = true; }
      }
      if (r.piston_deck_clearance != null && target.piston_deck_clearance == null) {
        target.piston_deck_clearance = r.piston_deck_clearance;
        touched = true;
      }
      if (touched) {
        target.head = Object.keys(head).length ? head : null;
        target.sources = [...new Set([...(target.sources ?? []), "NHRA blueprints"])];
        nhraStats.enriched++;
      }
    }

    // --- add the engines the site has never carried --------------------------
    // Grouped by manufacturer + displacement, matching the existing
    // "<mfr>-<displacement>ci" family convention already used by 142 families.
    const groups = new Map();
    for (const r of leftovers) {
      if (!r.manufacturer || r.displacement_ci == null) continue;
      const mfrSlug = hyphenate(r.manufacturer).replace(/-/g, "_");
      const famSlug = `${hyphenate(r.manufacturer)}-${Math.round(r.displacement_ci)}ci`;
      const key = `${mfrSlug}|${famSlug}`;
      if (!groups.has(key)) groups.set(key, { mfrSlug, famSlug, mfrName: r.manufacturer, records: [] });
      groups.get(key).records.push(r);
    }

    for (const g of groups.values()) {
      const mfrSeg = hyphenate(g.mfrSlug);
      const famSeg = hyphenate(stripPrefix(g.famSlug, hyphenate(g.mfrSlug)) ?? g.famSlug);
      const famUrl = `/engines/${mfrSeg}/${famSeg}`;
      let fam = outFamilies.find((f) => f.url === famUrl);
      if (!fam) {
        fam = {
          url: famUrl,
          familySlug: g.famSlug,
          familyName: `${g.mfrName} ${Math.round(g.records[0].displacement_ci)}ci`,
          manufacturerName: g.mfrName,
          manufacturerSlug: g.mfrSlug,
          manufacturerUrl: `/engines/${mfrSeg}`,
          configuration: null,
          engines: [],
        };
        outFamilies.push(fam);
        nhraStats.newFamilies++;
      }

      // Collapse to distinct geometry, same rule as the main pass.
      const byGeom = new Map();
      for (const r of g.records) {
        const k = [r.bore_in, r.stroke_in, r.displacement_ci, r.num_cylinders, r.compression_ratio].join("|");
        if (!byGeom.has(k)) byGeom.set(k, []);
        byGeom.get(k).push(r);
      }

      const used = new Set(fam.engines.map((e) => e.slug));
      for (const cluster of byGeom.values()) {
        const rep = cluster.slice().sort((a, b) =>
          Object.values(b).filter((v) => v != null).length -
          Object.values(a).filter((v) => v != null).length)[0];

        let slug = hyphenate(`${Math.round(rep.displacement_ci)}ci-${rep.bore_in}x${rep.stroke_in}`);
        if (used.has(slug) && rep.compression_ratio != null) {
          slug = hyphenate(`${slug}-${String(rep.compression_ratio).replace(".", "-")}cr`);
        }
        if (used.has(slug)) slug = hyphenate(rep.engine_id);
        used.add(slug);

        const hps = cluster.map((r) => r.advertised_hp).filter((v) => v != null);
        const years = cluster.map((r) => r.year).filter(Boolean);
        const head = {};
        for (const f of ["intake_valve_dia", "exhaust_valve_dia",
                         "head_cc", "rocker_ratio", "lifter_type"]) {
          if (rep[f] != null) head[f] = rep[f];
        }

        const eng = {
          url: `${famUrl}/${slug}`,
          slug,
          engine_id: rep.engine_id,
          displayName: `${g.mfrName} ${Math.round(rep.displacement_ci)}ci · ${rep.bore_in}" × ${rep.stroke_in}"` +
                       (rep.compression_ratio != null ? ` · ${rep.compression_ratio}:1` : ""),
          seoTitle: `${g.mfrName} ${Math.round(rep.displacement_ci)}ci` +
                    (rep.compression_ratio != null ? ` ${rep.compression_ratio}:1` : ` ${rep.bore_in}" bore`),
          familyName: fam.familyName,
          familySlug: fam.familySlug,
          familyUrl: famUrl,
          manufacturerName: g.mfrName,
          manufacturerSlug: g.mfrSlug,
          manufacturerUrl: `/engines/${mfrSeg}`,
          bore_in: rep.bore_in, stroke_in: rep.stroke_in, bore_mm: null, stroke_mm: null,
          displacement_ci: rep.displacement_ci,
          displacement_l: rep.displacement_ci != null ? +(rep.displacement_ci * 0.0163871).toFixed(1) : null,
          num_cylinders: rep.num_cylinders,
          compression_ratio: rep.compression_ratio,
          rod_length_in: rep.rod_length_in,
          deck_height_in: null,
          piston_deck_clearance: rep.piston_deck_clearance,
          configuration: null,
          block_material: null, head_material: null, valvetrain: null,
          valves_per_cylinder: null, cam_type: null, fuel_type: null,
          induction: rep.induction, firing_order: null,
          oil_capacity_qt: null, coolant_capacity_qt: null,
          rod_ratio: rep.rod_length_in != null && rep.stroke_in
            ? +(rep.rod_length_in / rep.stroke_in).toFixed(3) : null,
          boreStrokeRatio: rep.bore_in != null && rep.stroke_in
            ? +(rep.bore_in / rep.stroke_in).toFixed(3) : null,
          hpMin: hps.length ? Math.min(...hps) : null,
          hpMax: hps.length ? Math.max(...hps) : null,
          yearMin: years.length ? Math.min(...years) : null,
          yearMax: years.length ? Math.max(...years) : null,
          head: Object.keys(head).length ? head : null,
          vehicles: [],
          variants: cluster.map((r) => ({
            engine_id: r.engine_id, year: r.year, hp: r.advertised_hp, codes: [],
          })).sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || (a.hp ?? 0) - (b.hp ?? 0)),
          variantCount: cluster.length,
          sources: ["NHRA blueprints"],
        };
        eng.calcLinks = calcLinksFor(eng);
        eng.derived = derivedFor(eng);
        fam.engines.push(eng);
        outEngines.push(eng);
        nhraStats.added++;
      }
      fam.engines.sort((a, b) => (b.displacement_ci ?? 0) - (a.displacement_ci ?? 0));
    }

    // Manufacturers created by the import need a hub entry too.
    for (const fam of outFamilies) {
      if (!mfrByslug.has(fam.manufacturerSlug)) {
        mfrByslug.set(fam.manufacturerSlug, { slug: fam.manufacturerSlug, name: fam.manufacturerName, country: null });
      }
    }
  }

  for (const fam of outFamilies) fam.context = familyContext(fam);

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
  // Where each engine sits in its family — count, displacement span, and
  // whether this one is the largest, smallest or in between. Feeds the family
  // sentence in src/data/engineNarrative.mjs; carried into the runtime JSON so
  // the React page can say the same thing the prerender does.
  for (const fam of outFamilies) {
    const ds = fam.engines.map((e) => e.displacement_ci).filter((v) => v != null);
    const minCi = ds.length ? Math.min(...ds) : null;
    const maxCi = ds.length ? Math.max(...ds) : null;
    for (const e of fam.engines) {
      const rank = e.displacement_ci == null || minCi === maxCi ? "only"
        : e.displacement_ci === maxCi ? "largest"
        : e.displacement_ci === minCi ? "smallest" : "middle";
      e.familyStats = { count: fam.engines.length, minCi, maxCi, rank };
    }
  }

  const byDisp = outEngines
    .filter((e) => e.displacement_ci != null)
    .sort((a, b) => a.displacement_ci - b.displacement_ci);

  const brief = (e) => ({
    url: e.url,
    displayName: e.displayName,
    familyName: e.familyName,
    manufacturerName: e.manufacturerName,
    // "Chevrolet 350ci · 4.001 × 3.484" already starts with the maker; a bare
    // code ("LT1") does not.
    label: String(e.displayName ?? "").startsWith(`${e.manufacturerName} `)
      ? e.displayName
      : `${e.manufacturerName} ${e.displayName}`,
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

  return { manufacturers: outManufacturers, families: outFamilies, engines: outEngines, familyIndex, nhraStats };
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
  // Start clean: a family that was merged or renamed must not linger.
  rmSync(outDir, { recursive: true, force: true });
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
        factoryCars: fam.factoryCars ?? [],
        // Sources are tracked privately (data/engine-sources/) and not shipped.
        engines: fam.engines.map(({ sources: _s, ...e }) => e),
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
