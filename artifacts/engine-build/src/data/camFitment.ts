// Match a build to the Howards cams that fit it.
//
// Fitment comes from public/data/cam-fitment.json (scripts/camFitment.mjs):
// each cam's engine family as a manufacturer group, a list of displacements,
// a cylinder count and a model-year range. Specs come from cam-catalog.json,
// joined by normalised part number.

export interface CamFit {
  p: string;
  fam: string;
  g: string[];
  ci: number[];
  cyl: number | null;
  ls: boolean;
  y0: number | null;
  y1: number | null;
  fit: string;
}

export interface BuildEngine {
  mfr: string;            // manufacturer slug prefix from the build
  ci: number | null;      // computed from the build's own bore/stroke/cylinders
  cyl: number | null;
  isLS: boolean;
  yearFrom: number | null;
  yearTo: number | null;
}

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const QUICK_MFR: Record<string, string> = { sbc350: "chevrolet", bbc454: "chevrolet" };

/** What the cam matcher needs to know about this build, from its own fields. */
export function buildEngine(engineSlug: string | undefined, fields: Record<string, string>): BuildEngine {
  const slug = (engineSlug ?? "").toLowerCase();
  const mfr = QUICK_MFR[slug] ?? slug.split("_")[0];
  const bore = parseFloat(fields["shortBlock.bore"] || "");
  const stroke = parseFloat(fields["shortBlock.stroke"] || "");
  const cyl = parseInt(fields["shortBlock.cylinders"] || "", 10);
  const ok = Number.isFinite(bore) && Number.isFinite(stroke) && Number.isFinite(cyl);
  const ci = ok ? Math.round(bore * bore * stroke * 0.7854 * cyl) : null;
  // LS engines share displacements with older GM V8s (346 vs 350, and the 402
  // and 427 with the big block), so identify them by geometry: LS strokes are
  // 3.267, 3.622 and 4.000 (the last only with a 4.125 bore — the big-block 427
  // is 4.25 x 3.76).
  const chevy = ["chevrolet", "chevr", "chevy", "gmc"].includes(mfr);
  const isLS = chevy && ok && (near(stroke, 3.622) || near(stroke, 3.267) || (near(stroke, 4.0) && near(bore, 4.125)));
  const y0 = parseInt(fields["engine.yearFrom"] || "", 10);
  const y1 = parseInt(fields["engine.yearTo"] || fields["engine.yearFrom"] || "", 10);
  return {
    mfr,
    ci,
    cyl: Number.isFinite(cyl) ? cyl : null,
    isLS,
    yearFrom: Number.isFinite(y0) ? y0 : null,
    yearTo: Number.isFinite(y1) ? y1 : null,
  };
}

/** Does this cam fit this build? Year is checked only when the build has one. */
export function camFits(f: CamFit, e: BuildEngine): boolean {
  if (!e.mfr || !f.g.some((g) => e.mfr === g || e.mfr.startsWith(g))) return false;
  if (f.ls !== e.isLS) return false;
  if (f.cyl != null && e.cyl != null && f.cyl !== e.cyl) return false;
  // ±1 absorbs rounding (a 350 computes to 349.8); ±2 would let a 348 W-engine cam
  // match a small-block 350.
  if (e.ci == null || !f.ci.some((c) => Math.abs(c - e.ci!) <= 1)) return false;
  if (e.yearFrom != null && f.y0 != null) {
    const camTo = f.y1 ?? 9999;
    if (e.yearTo! < f.y0 || e.yearFrom > camTo) return false;
  }
  return true;
}

export const normPart = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
