// Wording shared by the vehicle pages and the "Factory cars" lists, used by both
// the prerender (scripts/prerender.mjs) and the React pages, so the text Google
// indexes and the text a visitor sees come from one definition.

/** "396 V8 (L78)" */
export function vehicleEngineLabel(e) {
  return e.code ? `${e.name} (${e.code})` : e.name;
}

/** "375 hp gross" / "245 hp net" / "88–93 hp net" when sources publish different ratings */
export function hpText(e) {
  if (e.hp == null && !e.hpRange) return "—";
  const v = e.hpRange ? `${e.hpRange[0]}–${e.hpRange[1]}` : e.hp;
  if (e.electric) return `${v} hp`;
  // Porsche quoted many US ratings only in metric (DIN) horsepower
  if (e.hpBasis === "din") return `${v} PS (DIN)`;
  return `${v} hp ${e.hpBasis === "net" ? "net" : "gross"}`;
}

/** One row of a "Factory cars" list: "1969, L78, 375 hp" */
export function factoryCarLabel(r) {
  const unit = r.hpBasis === "din" ? "PS" : "hp";
  const hp = r.hpRange ? `${r.hpRange[0]}–${r.hpRange[1]} ${unit}` : r.hp != null ? `${r.hp} ${unit}` : null;
  return [r.year, r.code, hp].filter(Boolean).join(", ");
}

/**
 * Calculators a reader of a vehicle page most often needs next, shown under
 * the year tables. These are also the internal links that help the calculators
 * rank (Search Console, Oct 2026: displacement averaged position 11.6 on 19k
 * impressions). Engine pages carry prefilled links; a vehicle page spans many
 * engines, so these are plain.
 */
export const VEHICLE_CALC_LINKS = [
  { href: "/calculators/displacement", label: "Engine displacement from bore and stroke" },
  { href: "/calculators/compression-ratio", label: "Static and dynamic compression ratio" },
  { href: "/calculators/cam-selector", label: "Which camshaft for your build" },
  { href: "/calculators/carb-cfm-sizing", label: "What size carburetor" },
  { href: "/calculators/hp-torque", label: "Horsepower to torque at any RPM" },
  { href: "/calculators/torque-converter-stall", label: "Torque converter stall speed" },
];
