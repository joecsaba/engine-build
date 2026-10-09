// Parts catalog for the build sheet.
//
// The build sheet lets a signed-in user record an engine build section by
// section. This module answers one question for each section: "which parts do
// we know fit THIS engine?" — so the builder can offer real part numbers
// instead of a blank text box.
//
// Today the data is the planner catalog in buildParts.ts / dieselParts.ts
// (191 gasoline parts across SBC 350, LS1, LS3 and Ford 302, plus six diesel
// platforms). The full Summit Racing catalog is planned. Everything the UI
// needs goes through the three functions below, so swapping in a bigger
// catalog means changing this file's data source, not the build sheet.
//
// Engines with no catalog coverage are never blocked: the section shows its
// normal fields plus a note that part numbers are coming.

import { PLATFORMS, type EnginePlatform, type Part, type PartCategory } from "./buildParts";

// ─── Which platform is this build? ───────────────────────────────────────────
//
// Database engine ids are too inconsistent to match by name
// ("buick_1979_350_155hp" is not a small-block Chevy), so gasoline platforms
// are identified by manufacturer plus bore and stroke — the geometry that
// actually decides whether a crank, rod or piston fits. Diesel platforms are
// identified by name, because their ids are consistent and their parts are
// generation-specific in ways bore and stroke don't capture.

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

export function platformForBuild(engineSlug: string | undefined, fields: Record<string, string>): EnginePlatform | null {
  const slug = (engineSlug ?? "").toLowerCase();
  const byId = (id: string) => PLATFORMS.find((p) => p.id === id) ?? null;

  // Diesel, by name
  if (slug.includes("cummins")) {
    if (/67|6\.7|6_7/.test(slug)) return byId("cummins67");
    if (/12v/.test(slug)) return byId("cummins12v");
  }
  if (slug.includes("duramax")) return byId("duramax66");
  if (/powerstroke|power_stroke/.test(slug)) {
    if (/73|7\.3/.test(slug)) return byId("ford73ps");
    if (/60|6\.0/.test(slug)) return byId("ford60ps");
    if (/67|6\.7/.test(slug)) return byId("ford67ps");
  }

  // Quick-pick slugs from the "Popular Engines" list
  if (slug === "sbc350") return byId("sbc350");
  if (slug === "ford_302") return byId("ford302");

  // Gasoline, by manufacturer + geometry
  const bore = parseFloat(fields["shortBlock.bore"] || "");
  const stroke = parseFloat(fields["shortBlock.stroke"] || "");
  const mfr = slug.split("_")[0];
  const isChevy = mfr === "chevrolet" || mfr === "chevy" || mfr === "chevr" || slug.startsWith("sbc");
  if (Number.isFinite(bore) && Number.isFinite(stroke)) {
    if (isChevy && near(stroke, 3.622) && near(bore, 3.898, 0.015)) return byId("ls1");
    if (isChevy && near(stroke, 3.622) && near(bore, 4.065, 0.015)) return byId("ls3");
    if (isChevy && near(stroke, 3.48) && near(bore, 4.0, 0.035)) return byId("sbc350");
    if (mfr === "ford" && near(stroke, 3.0) && near(bore, 4.0, 0.035)) return byId("ford302");
  }
  if (slug === "chevrolet_ls1" || slug === "chevrolet_ls6") return byId("ls1");
  if (slug === "chevrolet_ls3") return byId("ls3");
  return null;
}

// ─── Which catalog categories belong in which build section? ─────────────────

const GROUP_TO_SECTION: Record<string, string> = {
  "Rotating Assembly": "rotatingAssembly",
  "Bottom End": "rotatingAssembly",
  "Machine Work": "machineWork",
  "Oiling System": "shortBlock",
  "Cylinder Heads": "heads",
  "Gaskets & Seals": "heads",
  "Head & Sealing": "heads",
  "Valvetrain": "valvetrain",
  "Induction": "intake",
  "Forced Induction": "intake",
  "Fuel System": "intake",
  "Induction & Cooling": "intake",
  "Exhaust & Intake": "intake",
  "Engine Management": "intake",
  "Cooling & EGR": "intake",
};

function sectionForCategory(c: PartCategory): string | null {
  if (c.id === "camshaft") return "cam";
  return GROUP_TO_SECTION[c.group] ?? null;
}

/** Catalog categories (with their parts) that belong in a build section, for this platform. */
export function categoriesForSection(platform: EnginePlatform | null, sectionId: string): PartCategory[] {
  if (!platform) return [];
  return platform.categories.filter((c) => sectionForCategory(c) === sectionId && c.parts.length > 0);
}

// ─── How a pick is stored on the build ───────────────────────────────────────
//
// Each pick writes three fields. The label and part number are stored, not just
// the id, so the build sheet still reads correctly after the catalog changes —
// a build saved today must not go blank when Summit's catalog replaces this one.

export const pickKeys = (categoryId: string) => ({
  id: `parts.${categoryId}`,
  label: `parts.${categoryId}.label`,
  partNumber: `parts.${categoryId}.pn`,
});

export function pickFields(categoryId: string, part: Part | null): Record<string, string> {
  const k = pickKeys(categoryId);
  if (!part) return { [k.id]: "", [k.label]: "", [k.partNumber]: "" };
  return { [k.id]: part.id, [k.label]: `${part.brand} ${part.name}`.trim(), [k.partNumber]: part.partNumber ?? "" };
}

/** Every saved pick on a build, in a stable order, for the build sheet summary. */
export function savedPicks(fields: Record<string, string>): { categoryId: string; label: string; partNumber: string }[] {
  return Object.keys(fields)
    .filter((k) => /^parts\.[^.]+$/.test(k) && fields[k])
    .sort()
    .map((k) => {
      const categoryId = k.slice("parts.".length);
      const keys = pickKeys(categoryId);
      return { categoryId, label: fields[keys.label] || fields[k], partNumber: fields[keys.partNumber] || "" };
    });
}

// ─── Where to check price ────────────────────────────────────────────────────
//
// No prices are shown in the builder: the planner's prices are typed in by hand
// and go stale. Instead each part links to a current search.

export function summitSearchUrl(part: Part): string {
  const q = part.partNumber ? `${part.brand} ${part.partNumber}` : `${part.brand} ${part.name}`;
  return `https://www.summitracing.com/search?keyword=${encodeURIComponent(q)}`;
}
