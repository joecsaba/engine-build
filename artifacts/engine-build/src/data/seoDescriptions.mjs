// Meta description builders shared by scripts/prerender.mjs and the React pages.
//
// These two lived in both places and drifted. The prerenderer emitted one
// sentence, <SEOHead> emitted another, and the version a crawler saw was never
// the version in the component — which is how "the American Motors American
// Motors 195ci" survived in the client copy after being fixed in the build.
// One definition, imported by both, so they cannot disagree again.
//
// Descriptions have a window, not a floor: Bing flags both ends and Google
// truncates around 155-160 characters.

export const DESC_MAX = 158;
export const DESC_MIN = 110;

// Lengths are measured AFTER HTML escaping, because that is what ends up in the
// file and what an analyzer reading the markup counts. An inch mark costs six
// characters as &quot;, not one, and engine descriptions carry two of them:
//
//   Chevrolet LS1 ... 3.9" bore x 3.622" stroke ...
//   decoded 158  ->  raw 168
//
// 535 pages sat over 160 raw while measuring 158 decoded. Bing's own numbers
// point the same way: it reported exactly one "Title too long", and exactly one
// title exceeds 65 characters once &amp; is counted as five.
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Length of `s` once escaped for HTML — what actually lands in the markup. */
export function encodedLength(s) {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]).length;
}

/**
 * Join `parts` into a description that fits DESC_MAX, most important first.
 *
 * A part may be a string, or an array of alternative phrasings ordered longest
 * to shortest — the longest that still fits wins. Without alternatives a tail
 * sentence three characters too long is dropped whole, which is what left the
 * manufacturer hubs at 85 characters when 155 was available.
 */
export function clampDesc(parts) {
  let out = "";
  for (const part of parts.filter(Boolean)) {
    const options = Array.isArray(part) ? part.filter(Boolean) : [part];
    const fits = options.find(
      (o) => (out ? encodedLength(out) + 1 + encodedLength(o) : encodedLength(o)) <= DESC_MAX,
    );
    // Order carries meaning, so a slot that cannot fit ends the description
    // rather than being skipped over to reach a later, less important one.
    if (!fits) break;
    out = out ? `${out} ${fits}` : fits;
  }
  // Nothing fit: take the first part and trim it at a word boundary.
  if (!out && parts.length) {
    const first = parts.flat().find(Boolean) ?? "";
    // Trim whole words until the ESCAPED string fits. Slicing to DESC_MAX
    // characters first is not enough — escaping can push it back over.
    out = first;
    while (out && encodedLength(out) > DESC_MAX) {
      const cut = out.replace(/\s+\S*$/, "");
      out = cut && cut !== out ? cut : out.slice(0, -1);
    }
    if (out !== first) out = `${out.replace(/[\s,;:·-]+$/, "")}…`;
  }
  return out;
}

/**
 * "American Motors 195ci" already carries the manufacturer, so prefixing it
 * again reads as "the American Motors American Motors 195ci".
 */
export function familyPhrase(manufacturerName, familyName) {
  return familyName.toLowerCase().startsWith(manufacturerName.toLowerCase())
    ? familyName
    : `${manufacturerName} ${familyName}`;
}

/** Family hub. `fam` needs manufacturerName, familyName and engines[]. */
export function familyDescription(fam) {
  const phrase = familyPhrase(fam.manufacturerName, fam.familyName);
  // A family whose engines all share one bore and stroke leads with it: that is
  // what "buick 455 bore and stroke" is asking.
  const metricFirst = !INCH_MAKERS.has(fam.manufacturerSlug);
  const bsIn = familyBoreStroke(fam, "in"), bsMm = familyBoreStroke(fam, "mm");
  if (bsIn) {
    const n = fam.engines.length;
    return clampDesc([
      `${phrase} specs: ${metricFirst ? bsMm : bsIn} (${metricFirst ? bsIn : bsMm}) bore and stroke${n > 1 ? `, shared by all ${n} versions` : ""}.`,
      ["Displacement, compression and factory ratings for each, plus rod ratio and piston speed.",
       "Displacement, compression and factory ratings, plus rod ratio.",
       "Displacement, compression and factory ratings."],
    ]);
  }
  // 193 families hold a single engine, so "all 1 engines, compared side by
  // side" needs a different sentence rather than a plural hack.
  return fam.engines.length === 1
    ? clampDesc([
        `Bore, stroke, displacement and compression for the ${phrase}.`,
        ["Plus rod ratio, mean piston speed and cylinder head specs where published.",
         "Plus rod ratio, piston speed and cylinder head specs where published.",
         "Plus rod ratio and head specs where published."],
        "Free, no signup.",
      ])
    : clampDesc([
        `Bore, stroke, displacement and compression for all ${fam.engines.length} ${phrase} engines, compared side by side.`,
        ["Plus rod ratio, piston speed and cylinder head specs where published.",
         "Plus rod ratio and head specs where published.",
         "Free spec reference."],
      ]);
}

/** Manufacturer hub. `m` needs name, engineCount and families[]. */
export function manufacturerDescription(m) {
  return clampDesc([
    `Bore, stroke, displacement and compression for ${m.engineCount} ${m.name} engines across ${m.families.length} families.`,
    ["Free reference with rod ratio, piston speed and cylinder head specs where published.",
     "Free reference with rod ratio, piston speed and head specs where published.",
     "Free reference with rod ratio and head specs where published.",
     "Free spec reference, no signup."],
  ]);
}

// ---------------------------------------------------------------------------
// Engine spec pages: <title> and meta description.
//
// Search Console (Jul–Oct 2026): 513 of the 723 engine pages Google showed got
// no clicks, many from positions 6–9 for exact searches like "d16z6 specs" or
// "buick 455 bore and stroke". The old title promised "Bore, Stroke,
// Compression" without giving any of them; these put the numbers in the title
// and description so the result answers the search before the click.
// Shared by scripts/prerender.mjs and src/pages/engines/engine.tsx.

export const TITLE_MAX = 46; // plus " | Engine-build.com" = 65

// American makers quote bore and stroke in inches; everyone else in millimetres.
const INCH_MAKERS = new Set(["chevrolet", "gmc", "pontiac", "oldsmobile", "buick", "cadillac", "saturn",
  "ford", "mercury", "lincoln", "dodge", "plymouth", "chrysler", "ram", "jeep", "american_motors", "amc",
  "international", "studebaker", "packard", "hudson", "nash", "desoto", "cummins", "duramax", "navistar"]);

const inch = (v) => {
  const s = Number(v).toFixed(3).replace(/0$/, "");
  return s.replace(/(\.\d\d)0$/, "$1");
};
const mm = (v) => String(Math.round(Number(v) * 25.4 * 10) / 10).replace(/\.0$/, "");

function boreStroke(e, unit) {
  if (e.bore_in == null || e.stroke_in == null) return null;
  return unit === "in" ? `${inch(e.bore_in)} x ${inch(e.stroke_in)} in` : `${mm(e.bore_in)} x ${mm(e.stroke_in)} mm`;
}

const liters = (l) => (Number.isInteger(Number(l)) ? Number(l).toFixed(1) : String(l));

function hpText(e) {
  if (e.hpMin == null) return null;
  return e.hpMax == null || e.hpMax === e.hpMin ? `${e.hpMin} hp` : `${e.hpMin}-${e.hpMax} hp`;
}

/** Name used in the title and description (seoTitle already avoids a doubled maker). */
export function engineSeoName(e) {
  return (e.seoTitle ?? `${e.manufacturerName} ${e.displayName}`).trim();
}

/** "Honda D16Z6 Specs: 75 x 90 mm, 125 hp", or a shorter form that fits TITLE_MAX. */
export function engineSeoTitle(e) {
  const base = `${engineSeoName(e)} Specs`;
  const unit = INCH_MAKERS.has(e.manufacturerSlug) ? "in" : "mm";
  const bs = boreStroke(e, unit), hp = hpText(e);
  const tails = [bs && hp && `: ${bs}, ${hp}`, bs && `: ${bs}`, " — Bore, Stroke, Compression", ": Bore, Stroke, CR", ""];
  for (const t of tails) if (t != null && t !== false && encodedLength(base + t) <= TITLE_MAX) return base + t;
  // The name alone is too long: drop a parenthetical list such as
  // "(194/230/250/292)". Trimming words instead would make sibling pages
  // identical (the hydraulic- and solid-lifter Ramjet 283s), which costs more
  // than a few characters over the budget.
  return `${engineSeoName(e).replace(/\s*\([^)]*\/[^)]*\)/g, "")} Specs`;
}

/** Spec-first description: size, bore x stroke in both units, compression, rating, years, cars. */
export function engineSeoDescription(e) {
  const name = engineSeoName(e).replace(/\s+\d+(?:\.\d+)?:1$/, "");
  const metricFirst = !INCH_MAKERS.has(e.manufacturerSlug);
  const size = e.displacement_ci != null
    ? (metricFirst && e.displacement_l != null ? `${liters(e.displacement_l)}L (${e.displacement_ci} ci)` : `${e.displacement_ci} ci${e.displacement_l != null ? ` (${liters(e.displacement_l)}L)` : ""}`)
    : null;
  const bsIn = boreStroke(e, "in"), bsMm = boreStroke(e, "mm");
  const bs = bsIn ? `${metricFirst ? bsMm : bsIn} (${metricFirst ? bsIn : bsMm}) bore and stroke` : null;
  const cyl = e.num_cylinders != null ? `${e.num_cylinders}-cylinder` : null;
  const lead = [size && cyl ? `${size} ${cyl}` : size ?? cyl, bs, e.compression_ratio != null ? `${e.compression_ratio}:1 compression` : null].filter(Boolean);
  const hp = hpText(e);
  const years = e.yearMin != null ? (e.yearMax != null && e.yearMax !== e.yearMin ? `${e.yearMin}–${e.yearMax}` : `${e.yearMin}`) : null;
  const cars = (e.factoryCars ?? []).map((c) => c.vehicle).filter(Boolean);
  // an empty slot would end the description (clampDesc stops at a slot that cannot fit)
  const slot = (opts) => { const o = opts.filter(Boolean); return o.length ? o : null; };
  return clampDesc([
    lead.length ? `${name} specs: ${lead.join(", ")}.` : `${name} specs.`,
    slot([hp && years && `Rated ${hp}, ${years}.`, hp && `Rated ${hp}.`, years && `Built ${years}.`]),
    slot([cars.length > 1 && `Used in the ${cars[0]} and ${cars[1]}.`, cars.length && `Used in the ${cars[0]}.`]),
    // construction facts and the computed figures share one slot, so a short
    // fact never crowds out the closing sentence
    [...buildFacts(e).flatMap((f) => [`${f} Rod ratio and piston speed worked out.`, `${f} Rod ratio and piston speed.`]),
     "Rod ratio and piston speed worked out.", "Rod ratio and piston speed.", ...buildFacts(e)],
  ]);
}

/** Bore x stroke when every engine in a family shares it, else null. */
function familyBoreStroke(fam, unit) {
  const all = fam.engines ?? [];
  const es = all.filter((e) => e.bore_in != null && e.stroke_in != null);
  if (!es.length || es.length !== all.length) return null;
  const same = es.every((e) => Math.abs(e.bore_in - es[0].bore_in) <= 0.002 && Math.abs(e.stroke_in - es[0].stroke_in) <= 0.002);
  return same ? boreStroke(es[0], unit) : null;
}

/** "Buick 455ci Specs: 4.312 x 3.90 in" when the family shares one geometry; else the name. */
export function familySeoTitle(fam) {
  const base = familyPhrase(fam.manufacturerName, fam.familyName);
  const short = base.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const bs = familyBoreStroke(fam, INCH_MAKERS.has(fam.manufacturerSlug) ? "in" : "mm");
  const options = [bs && `${base} Specs: ${bs}`, bs && `${short} Specs: ${bs}`,
    `${base} Engine Specs`, `${short} Engine Specs`, `${short} Specs`].filter(Boolean);
  return options.find((t) => encodedLength(t) <= TITLE_MAX) ?? options[options.length - 1];
}

/** "DOHC, aluminum block and heads." and shorter forms, from fields on file only. */
function buildFacts(e) {
  const vt = e.valvetrain ? String(e.valvetrain) : null;
  const blk = e.block_material ? String(e.block_material).toLowerCase() : null;
  const hd = e.head_material ? String(e.head_material).toLowerCase() : null;
  const metal = blk && hd ? (blk === hd ? `${blk} block and heads` : `${blk} block, ${hd} heads`) : blk ? `${blk} block` : hd ? `${hd} heads` : null;
  const fo = e.firing_order ? `firing order ${e.firing_order}` : null;
  const full = [vt, metal, fo].filter(Boolean);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const out = [];
  for (let n = full.length; n >= 1; n--) out.push(`${cap(full.slice(0, n).join(", "))}.`);
  return out;
}
