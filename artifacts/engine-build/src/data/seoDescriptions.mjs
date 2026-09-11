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
    const fits = options.find((o) => (out ? out.length + 1 + o.length : o.length) <= DESC_MAX);
    // Order carries meaning, so a slot that cannot fit ends the description
    // rather than being skipped over to reach a later, less important one.
    if (!fits) break;
    out = out ? `${out} ${fits}` : fits;
  }
  // Nothing fit: take the first part and trim it at a word boundary.
  if (!out && parts.length) {
    const first = parts.flat().find(Boolean) ?? "";
    out = first.length <= DESC_MAX ? first : first.slice(0, DESC_MAX).replace(/\s+\S*$/, "") + "…";
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
