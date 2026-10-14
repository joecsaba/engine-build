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
