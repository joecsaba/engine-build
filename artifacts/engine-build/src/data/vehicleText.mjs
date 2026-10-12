// Wording shared by the vehicle pages and the "Factory cars" lists, used by both
// the prerender (scripts/prerender.mjs) and the React pages, so the text Google
// indexes and the text a visitor sees come from one definition.

/** "396 V8 (L78)" */
export function vehicleEngineLabel(e) {
  return e.code ? `${e.name} (${e.code})` : e.name;
}

/** "375 hp gross" / "245 hp net" */
export function hpText(e) {
  if (e.hp == null) return "—";
  return `${e.hp} hp ${e.hpBasis === "net" ? "net" : "gross"}`;
}

/** One row of a "Factory cars" list: "1969, L78, 375 hp" */
export function factoryCarLabel(r) {
  return [r.year, r.code, r.hp != null ? `${r.hp} hp` : null].filter(Boolean).join(", ");
}
