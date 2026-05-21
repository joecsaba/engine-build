// Curated bore/stroke/cylinder data for the 15 platforms users can pick as
// their default in /settings. Used by build-aware calculators to pre-fill
// inputs when prefs.defaultPlatform is set.
//
// Values are the most common factory specs for each platform. Stroker/destroker
// builds will need manual overrides — that's what the inputs are for.

export interface PlatformSpec {
  slug: string;
  label: string;
  bore: string;       // inches, string for direct input use
  stroke: string;     // inches
  cylinders: string;  // count, string for direct input use
  rodLength?: string; // inches (where commonly known)
  redline?: string;   // RPM
}

const SPECS: PlatformSpec[] = [
  { slug: "sbc350",        label: "Small Block Chevy 350", bore: "4.000", stroke: "3.480", cylinders: "8", rodLength: "5.700", redline: "5500" },
  { slug: "bbc454",        label: "Big Block Chevy 454",   bore: "4.250", stroke: "4.000", cylinders: "8", rodLength: "6.135", redline: "5500" },
  { slug: "ls1",           label: "LS1 5.7L",              bore: "3.898", stroke: "3.622", cylinders: "8", rodLength: "6.098", redline: "6500" },
  { slug: "ls3",           label: "LS3 6.2L",              bore: "4.065", stroke: "3.622", cylinders: "8", rodLength: "6.098", redline: "6600" },
  { slug: "lt1",           label: "LT1 6.2L Gen V",        bore: "4.065", stroke: "3.622", cylinders: "8", rodLength: "6.098", redline: "6600" },
  { slug: "coyote50",      label: "Ford Coyote 5.0L",      bore: "3.630", stroke: "3.650", cylinders: "8", rodLength: "5.933", redline: "7500" },
  { slug: "godzilla",      label: "Ford Godzilla 7.3L",    bore: "4.220", stroke: "3.976", cylinders: "8", rodLength: "6.609", redline: "5800" },
  { slug: "sbf302",        label: "Ford 302 Windsor",      bore: "4.000", stroke: "3.000", cylinders: "8", rodLength: "5.090", redline: "5800" },
  { slug: "modular46",     label: "Ford 4.6L Modular",     bore: "3.552", stroke: "3.543", cylinders: "8", rodLength: "5.933", redline: "6500" },
  { slug: "hemi57",        label: "5.7L Hemi",             bore: "3.917", stroke: "3.578", cylinders: "8", rodLength: "6.243", redline: "5800" },
  { slug: "hemi64",        label: "6.4L Hemi",             bore: "4.090", stroke: "3.720", cylinders: "8", rodLength: "6.243", redline: "6400" },
  { slug: "cummins59",     label: "Cummins 5.9L 24V",      bore: "4.020", stroke: "4.720", cylinders: "6", rodLength: "7.560", redline: "3200" },
  { slug: "cummins67",     label: "Cummins 6.7L ISB",      bore: "4.213", stroke: "4.880", cylinders: "6", rodLength: "7.992", redline: "3200" },
  { slug: "duramax66",     label: "Duramax 6.6L",          bore: "4.055", stroke: "3.898", cylinders: "8", rodLength: "6.417", redline: "3500" },
  { slug: "powerstroke67", label: "Power Stroke 6.7L",     bore: "3.898", stroke: "4.252", cylinders: "8", rodLength: "6.654", redline: "3500" },
];

export const PLATFORM_SPECS: Record<string, PlatformSpec> = Object.fromEntries(
  SPECS.map((s) => [s.slug, s]),
);

export function platformSpec(slug: string | null | undefined): PlatformSpec | null {
  if (!slug) return null;
  return PLATFORM_SPECS[slug] ?? null;
}
