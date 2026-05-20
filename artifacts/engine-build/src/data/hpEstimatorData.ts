/**
 * HP & Torque Estimator Data
 *
 * Baseline numbers and component modifiers derived from published dyno results,
 * magazine tests, and common builder combinations. Each platform's stock baseline
 * is the factory-rated output (or a widely-accepted crate-engine number). Modifiers
 * are expressed as multipliers against the baseline — they compound to give an
 * estimated peak HP and torque.
 *
 * Sources: GM Performance Parts, Ford Performance, Westech Automotive dyno tests,
 * Engine Masters magazine, Hot Rod magazine dyno sessions, and community-aggregated
 * dyno sheets.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EnginePlatform {
  id: string;
  name: string;
  family: string;
  displacement: number; // cubic inches
  cylinders: number;
  stockHp: number;
  stockTorque: number;
  peakHpRpm: number;
  peakTqRpm: number;
  maxReasonableHp: number; // NA ceiling before reliability concerns
  stockEfficiency: number; // 0–1: how optimized the factory config already is (higher = less room to gain per mod)
  notes: string;
}

export interface ComponentOption {
  id: string;
  label: string;
  description: string;
  hpMultiplier: number;   // 1.0 = no change
  tqMultiplier: number;
  peakRpmShift: number;   // positive = higher RPM peak
  tier: "stock" | "mild" | "moderate" | "aggressive" | "race";
}

export interface ComponentCategory {
  id: string;
  name: string;
  description: string;
  options: ComponentOption[];
}

export interface ReferenceBuild {
  name: string;
  platform: string;       // matches EnginePlatform.id
  hp: number;
  torque: number;
  rpm: number;
  heads: string;
  cam: string;
  intake: string;
  exhaust: string;
  compression: string;
  induction: string;
  source: string;
}

// ── Engine Platforms ───────────────────────────────────────────────────────────

export const enginePlatforms: EnginePlatform[] = [
  {
    id: "sbc-350",
    name: "Chevy 350 (5.7L)",
    family: "Small Block Chevy",
    displacement: 350,
    cylinders: 8,
    stockHp: 210,
    stockTorque: 300,
    peakHpRpm: 4400,
    peakTqRpm: 2800,
    maxReasonableHp: 500,
    stockEfficiency: 0.0,
    notes: "Most common V8 ever built. Huge aftermarket. Stock 76cc iron heads flow ~160 CFM.",
  },
  {
    id: "sbc-383",
    name: "Chevy 383 Stroker",
    family: "Small Block Chevy",
    displacement: 383,
    cylinders: 8,
    stockHp: 350,
    stockTorque: 400,
    peakHpRpm: 5200,
    peakTqRpm: 3800,
    maxReasonableHp: 550,
    stockEfficiency: 0.50,
    notes: "350 block + 400 crank. Baseline assumes typical crate-engine spec — mods are relative to that starting point.",
  },
  {
    id: "bbc-454",
    name: "Chevy 454 (7.4L)",
    family: "Big Block Chevy",
    displacement: 454,
    cylinders: 8,
    stockHp: 270,
    stockTorque: 395,
    peakHpRpm: 4400,
    peakTqRpm: 2800,
    maxReasonableHp: 650,
    stockEfficiency: 0.0,
    notes: "Big displacement makes torque easily. Oval port vs rectangle port heads matter hugely.",
  },
  {
    id: "ls1-346",
    name: "LS1 (5.7L)",
    family: "GM LS",
    displacement: 346,
    cylinders: 8,
    stockHp: 350,
    stockTorque: 365,
    peakHpRpm: 5600,
    peakTqRpm: 4400,
    maxReasonableHp: 550,
    stockEfficiency: 0.30,
    notes: "Cathedral port heads, 10.1:1 CR. Responds extremely well to cam and heads.",
  },
  {
    id: "ls3-376",
    name: "LS3 (6.2L)",
    family: "GM LS",
    displacement: 376,
    cylinders: 8,
    stockHp: 430,
    stockTorque: 424,
    peakHpRpm: 5900,
    peakTqRpm: 4600,
    maxReasonableHp: 600,
    stockEfficiency: 0.55,
    notes: "Rectangle port L92-style heads flow 315+ CFM. Excellent out of the box.",
  },
  {
    id: "ls-53",
    name: "GM 5.3L (LM7/L33)",
    family: "GM LS",
    displacement: 325,
    cylinders: 8,
    stockHp: 295,
    stockTorque: 335,
    peakHpRpm: 5200,
    peakTqRpm: 4000,
    maxReasonableHp: 500,
    stockEfficiency: 0.25,
    notes: "Junkyard LS swap king. Cathedral port. Often stroked to 383ci with LS7 crank.",
  },
  {
    id: "sbf-302",
    name: "Ford 302 (5.0L)",
    family: "Small Block Ford",
    displacement: 302,
    cylinders: 8,
    stockHp: 225,
    stockTorque: 300,
    peakHpRpm: 4600,
    peakTqRpm: 3200,
    maxReasonableHp: 450,
    stockEfficiency: 0.0,
    notes: "Fox body staple. Stock E7TE heads are restrictive — heads are the #1 upgrade.",
  },
  {
    id: "coyote-50",
    name: "Ford Coyote 5.0L",
    family: "Ford Modular",
    displacement: 302,
    cylinders: 8,
    stockHp: 460,
    stockTorque: 420,
    peakHpRpm: 7000,
    peakTqRpm: 4600,
    maxReasonableHp: 600,
    stockEfficiency: 0.50,
    notes: "DOHC 4-valve. Makes power up top. Cam phasers provide variable valve timing. Hard to beat NA.",
  },
  {
    id: "sbc-lt1",
    name: "LT1 (5.7L, Gen II)",
    family: "Small Block Chevy",
    displacement: 350,
    cylinders: 8,
    stockHp: 300,
    stockTorque: 340,
    peakHpRpm: 5000,
    peakTqRpm: 3600,
    maxReasonableHp: 475,
    stockEfficiency: 0.10,
    notes: "Reverse-flow cooling, Optispark. Better heads than old 350 — flows ~195 CFM stock.",
  },
  {
    id: "mopar-360",
    name: "Mopar 360 (5.9L)",
    family: "Chrysler LA",
    displacement: 360,
    cylinders: 8,
    stockHp: 245,
    stockTorque: 335,
    peakHpRpm: 4400,
    peakTqRpm: 3200,
    maxReasonableHp: 475,
    stockEfficiency: 0.0,
    notes: "Open-chamber heads. Magnum heads (1992+) are a big improvement. Good torque motor.",
  },
  {
    id: "hemi-57",
    name: "Mopar 5.7L Hemi",
    family: "Chrysler Hemi",
    displacement: 345,
    cylinders: 8,
    stockHp: 375,
    stockTorque: 410,
    peakHpRpm: 5600,
    peakTqRpm: 4200,
    maxReasonableHp: 550,
    stockEfficiency: 0.30,
    notes: "Modern Hemi with MDS. VVT on later models. Responds well to cam-only builds.",
  },
  {
    id: "hemi-64",
    name: "Mopar 6.4L (392) Hemi",
    family: "Chrysler Hemi",
    displacement: 392,
    cylinders: 8,
    stockHp: 485,
    stockTorque: 475,
    peakHpRpm: 6000,
    peakTqRpm: 4200,
    maxReasonableHp: 650,
    stockEfficiency: 0.40,
    notes: "SRT engine. Already has good heads and a solid cam from factory. Hard to beat without boost.",
  },
];

// ── Component Categories ──────────────────────────────────────────────────────

export const headOptions: ComponentOption[] = [
  { id: "stock",       label: "Stock / OEM",              description: "Factory heads, as-cast or lightly cleaned up",                        hpMultiplier: 1.00, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "stock" },
  { id: "ported-stock", label: "Ported Stock Heads",      description: "Bowl work, gasket match, cleanup. +15-30 CFM",                       hpMultiplier: 1.08, tqMultiplier: 1.05, peakRpmShift: 200,  tier: "mild" },
  { id: "budget-alum",  label: "Budget Aluminum Heads",   description: "Dart SHP, Trick Flow GenX 185, World S/R — 200-220 CFM",             hpMultiplier: 1.18, tqMultiplier: 1.10, peakRpmShift: 400,  tier: "moderate" },
  { id: "mid-alum",     label: "Performance Aluminum",    description: "AFR 195/210, TFS Twisted Wedge, Edelbrock E-CNC — 230-260 CFM",      hpMultiplier: 1.30, tqMultiplier: 1.15, peakRpmShift: 600,  tier: "moderate" },
  { id: "cnc-alum",     label: "CNC-Ported Aluminum",     description: "AFR Eliminator, Dart Pro 1, TFS High Port — 270-310 CFM",            hpMultiplier: 1.45, tqMultiplier: 1.20, peakRpmShift: 800,  tier: "aggressive" },
  { id: "race-heads",   label: "Race / Fully Ported",     description: "Brodix, All Pro, custom CNC — 310+ CFM, race-only",                  hpMultiplier: 1.60, tqMultiplier: 1.22, peakRpmShift: 1200, tier: "race" },
];

export const camOptions: ComponentOption[] = [
  { id: "stock",     label: "Stock Cam",                  description: "Factory camshaft profile",                                             hpMultiplier: 1.00, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "stock" },
  { id: "rv",        label: "RV / Towing Cam",            description: "~200/200 duration @ .050, low overlap. Idles smooth, strong low-end", hpMultiplier: 1.04, tqMultiplier: 1.06, peakRpmShift: -200, tier: "mild" },
  { id: "mild",      label: "Mild Street Cam",            description: "~210/218 @ .050, .480/.500 lift. Choppy idle, good street manners",    hpMultiplier: 1.12, tqMultiplier: 1.08, peakRpmShift: 300,  tier: "mild" },
  { id: "moderate",  label: "Moderate Street/Strip",      description: "~224/230 @ .050, .510/.530 lift. Lumpy idle, needs converter",         hpMultiplier: 1.22, tqMultiplier: 1.10, peakRpmShift: 600,  tier: "moderate" },
  { id: "hot-st",    label: "Hot Street / Strip Cam",     description: "~232/240 @ .050, .550/.570 lift. Rough idle, stall converter needed",  hpMultiplier: 1.32, tqMultiplier: 1.08, peakRpmShift: 900,  tier: "aggressive" },
  { id: "race",      label: "Race / Solid Roller",        description: "~248+/256+ @ .050, .600+ lift. Race-only, high RPM power band",        hpMultiplier: 1.45, tqMultiplier: 1.02, peakRpmShift: 1500, tier: "race" },
];

export const intakeOptions: ComponentOption[] = [
  { id: "stock",     label: "Stock Intake Manifold",      description: "Factory intake — designed for emissions and low-RPM torque",           hpMultiplier: 1.00, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "stock" },
  { id: "dual-pln",  label: "Aftermarket Dual-Plane",     description: "Edelbrock Performer, Weiand Stealth — strong mid-range",              hpMultiplier: 1.06, tqMultiplier: 1.06, peakRpmShift: 200,  tier: "mild" },
  { id: "air-gap",   label: "Air-Gap Dual-Plane",         description: "Edelbrock Performer RPM Air-Gap — best all-around street manifold",   hpMultiplier: 1.10, tqMultiplier: 1.06, peakRpmShift: 300,  tier: "moderate" },
  { id: "single-pln",label: "Single-Plane",               description: "Edelbrock Victor Jr, Holley Strip Dominator — top-end power",         hpMultiplier: 1.14, tqMultiplier: 0.98, peakRpmShift: 600,  tier: "aggressive" },
  { id: "tunnel-ram",label: "Tunnel Ram / IR",            description: "Tunnel ram or individual runner — race manifold, high RPM only",       hpMultiplier: 1.18, tqMultiplier: 0.94, peakRpmShift: 1000, tier: "race" },
];

export const exhaustOptions: ComponentOption[] = [
  { id: "stock",    label: "Stock Manifolds",             description: "Cast iron exhaust manifolds — restrictive but quiet",                   hpMultiplier: 1.00, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "stock" },
  { id: "shorty",   label: "Shorty Headers",              description: "1-5/8\" shorty headers — easy install, mild improvement",               hpMultiplier: 1.05, tqMultiplier: 1.03, peakRpmShift: 100,  tier: "mild" },
  { id: "long-tb",  label: "Long Tube Headers",           description: "1-3/4\" to 1-7/8\" long tubes — significant mid/top-end gain",          hpMultiplier: 1.10, tqMultiplier: 1.06, peakRpmShift: 300,  tier: "moderate" },
  { id: "lg-race",  label: "Race Long Tubes",             description: "2\"+ primaries, merge collectors, no cats — maximum flow",              hpMultiplier: 1.14, tqMultiplier: 1.08, peakRpmShift: 500,  tier: "aggressive" },
];

export const compressionOptions: ComponentOption[] = [
  { id: "low",      label: "Low (8.0-8.5:1)",            description: "Conservative — safe on pump gas with boost or lots of timing",         hpMultiplier: 0.92, tqMultiplier: 0.94, peakRpmShift: 0,    tier: "stock" },
  { id: "stock",    label: "Stock (9.0-9.5:1)",           description: "Factory spec for most engines — 87-91 octane",                        hpMultiplier: 1.00, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "stock" },
  { id: "mild",     label: "Street (10.0-10.5:1)",        description: "Requires 91-93 octane. Good street improvement",                      hpMultiplier: 1.05, tqMultiplier: 1.04, peakRpmShift: 0,    tier: "mild" },
  { id: "high",     label: "High (11.0-11.5:1)",          description: "93 octane minimum. Best for NA performance builds",                   hpMultiplier: 1.10, tqMultiplier: 1.08, peakRpmShift: 100,  tier: "moderate" },
  { id: "race",     label: "Race (12.0:1+)",              description: "Race gas or E85 required. Maximum NA thermal efficiency",              hpMultiplier: 1.15, tqMultiplier: 1.10, peakRpmShift: 200,  tier: "aggressive" },
];

export const inductionOptions: ComponentOption[] = [
  { id: "na",        label: "Naturally Aspirated",         description: "No forced induction — all power from displacement and breathing",     hpMultiplier: 1.00, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "stock" },
  { id: "nos-75",    label: "75-shot Nitrous",             description: "75 HP wet shot — mild, safe on stock internals for most engines",     hpMultiplier: 1.18, tqMultiplier: 1.15, peakRpmShift: 0,    tier: "mild" },
  { id: "nos-150",   label: "150-shot Nitrous",            description: "150 HP shot — forged internals recommended, fuel system upgrade",     hpMultiplier: 1.35, tqMultiplier: 1.30, peakRpmShift: 0,    tier: "moderate" },
  { id: "sc-6psi",   label: "Supercharger (6 PSI)",        description: "Roots or centrifugal at 6 PSI — ~40% power increase, bolt-on",       hpMultiplier: 1.40, tqMultiplier: 1.38, peakRpmShift: 200,  tier: "moderate" },
  { id: "sc-10psi",  label: "Supercharger (10 PSI)",       description: "10 PSI — needs fuel system, intercooler, forged bottom end",          hpMultiplier: 1.60, tqMultiplier: 1.55, peakRpmShift: 300,  tier: "aggressive" },
  { id: "turbo-8",   label: "Turbo (8 PSI)",               description: "Single turbo at 8 PSI — broad power gain, needs supporting mods",    hpMultiplier: 1.50, tqMultiplier: 1.50, peakRpmShift: 200,  tier: "moderate" },
  { id: "turbo-15",  label: "Turbo (15 PSI)",              description: "15 PSI — serious build, forged everything, standalone EFI",           hpMultiplier: 1.85, tqMultiplier: 1.80, peakRpmShift: 400,  tier: "aggressive" },
  { id: "turbo-25",  label: "Turbo (25+ PSI)",             description: "Big power — full race build, built trans, roll cage territory",       hpMultiplier: 2.30, tqMultiplier: 2.20, peakRpmShift: 500,  tier: "race" },
];

export const fuelSystemOptions: ComponentOption[] = [
  { id: "tbi",        label: "Stock TBI (~200 CFM)",           description: "GM throttle body injection — restrictive on anything over 250 HP",   hpMultiplier: 0.88, tqMultiplier: 0.92, peakRpmShift: -300, tier: "stock" },
  { id: "2bbl",       label: "2-Barrel Carb (~350 CFM)",       description: "Rochester 2GC, Holley 2300 — adequate for stock or mild builds",     hpMultiplier: 0.94, tqMultiplier: 0.96, peakRpmShift: -200, tier: "stock" },
  { id: "4bbl-small", label: "4-Barrel Small (500-600 CFM)",   description: "Q-Jet, Holley 4160 600 — fits most mild street builds",              hpMultiplier: 0.98, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "mild" },
  { id: "4bbl-street",label: "4-Barrel Street (650-750 CFM)",  description: "Holley 4150, Edelbrock AVS2, Demon 625-750 — the street sweet spot", hpMultiplier: 1.00, tqMultiplier: 1.00, peakRpmShift: 0,    tier: "mild" },
  { id: "4bbl-dp",    label: "Double Pumper (700-850 CFM)",    description: "Holley 4150 HP, mechanical secondaries — instant throttle response", hpMultiplier: 1.02, tqMultiplier: 0.99, peakRpmShift: 200,  tier: "moderate" },
  { id: "4bbl-race",  label: "Race Carb (950+ CFM)",           description: "Holley Dominator 4500, 1050+ CFM — drag race and open track",        hpMultiplier: 1.04, tqMultiplier: 0.96, peakRpmShift: 500,  tier: "aggressive" },
  { id: "efi-mp",     label: "Multi-Port EFI",                 description: "Port injection — precise fueling, no CFM restriction, self-tuning",  hpMultiplier: 1.03, tqMultiplier: 1.03, peakRpmShift: 0,    tier: "mild" },
  { id: "efi-itb",    label: "ITB / Individual Throttle Bodies",description: "One throttle per cylinder — maximum airflow and throttle response", hpMultiplier: 1.06, tqMultiplier: 1.00, peakRpmShift: 400,  tier: "race" },
];

export const componentCategories: ComponentCategory[] = [
  { id: "heads",       name: "Cylinder Heads",     description: "Heads are the single biggest factor in NA power",        options: headOptions },
  { id: "cam",         name: "Camshaft",           description: "Determines the RPM range and personality of the engine",  options: camOptions },
  { id: "intake",      name: "Intake Manifold",    description: "Must match the heads and cam to avoid bottlenecks",       options: intakeOptions },
  { id: "fuel",        name: "Fuel System",        description: "Carb/TBI/EFI — must flow enough air or it caps your HP",  options: fuelSystemOptions },
  { id: "exhaust",     name: "Exhaust",            description: "Headers let the engine breathe out what the heads breathe in", options: exhaustOptions },
  { id: "compression", name: "Compression Ratio",  description: "Higher CR = more thermal efficiency (needs better fuel)", options: compressionOptions },
  { id: "induction",   name: "Forced Induction",   description: "Boost, nitrous, or naturally aspirated",                  options: inductionOptions },
];

// ── Spec → Multiplier Conversion ──────────────────────────────────────────────
// These functions convert real part specs (from manufacturer datasheets) into
// the same multiplier format used by the dropdown tiers. They use piecewise
// linear interpolation anchored to the known tier values.

function lerp(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/** Convert intake port flow (CFM @ 28" H2O) to head multipliers */
export function headFlowToMultiplier(cfm: number): ComponentOption {
  const hp = lerp(cfm, [[140, 0.95], [160, 1.00], [180, 1.08], [210, 1.18], [245, 1.30], [290, 1.45], [330, 1.60], [370, 1.70]]);
  const tq = lerp(cfm, [[140, 0.97], [160, 1.00], [180, 1.05], [210, 1.10], [245, 1.15], [290, 1.20], [330, 1.22], [370, 1.24]]);
  const rpm = lerp(cfm, [[140, -100], [160, 0], [180, 200], [210, 400], [245, 600], [290, 800], [330, 1200], [370, 1400]]);
  const tier = cfm < 170 ? "stock" : cfm < 200 ? "mild" : cfm < 260 ? "moderate" : cfm < 310 ? "aggressive" : "race";
  return { id: "custom-heads", label: `Custom (${cfm} CFM)`, description: `${cfm} CFM @ 28" H2O`, hpMultiplier: hp, tqMultiplier: tq, peakRpmShift: Math.round(rpm), tier };
}

/** Convert cam duration at .050" (intake) to cam multipliers */
export function camDurationToMultiplier(dur050: number): ComponentOption {
  const hp = lerp(dur050, [[180, 0.98], [190, 1.00], [200, 1.04], [210, 1.12], [224, 1.22], [236, 1.32], [252, 1.45], [270, 1.55]]);
  const tq = lerp(dur050, [[180, 0.98], [190, 1.00], [200, 1.06], [210, 1.08], [224, 1.10], [236, 1.08], [252, 1.02], [270, 0.96]]);
  const rpm = lerp(dur050, [[180, -300], [190, 0], [200, -200], [210, 300], [224, 600], [236, 900], [252, 1500], [270, 2000]]);
  const tier = dur050 < 200 ? "stock" : dur050 < 218 ? "mild" : dur050 < 232 ? "moderate" : dur050 < 248 ? "aggressive" : "race";
  return { id: "custom-cam", label: `Custom (${dur050}° @ .050)`, description: `${dur050}° duration @ .050"`, hpMultiplier: hp, tqMultiplier: tq, peakRpmShift: Math.round(rpm), tier };
}

/** Adjust head/cam multiplier based on valve lift (inches, at the valve) */
export function valveLiftFactor(lift: number): { hp: number; tq: number } {
  const hp = lerp(lift, [[0.400, 0.93], [0.450, 0.96], [0.500, 1.00], [0.550, 1.03], [0.600, 1.06], [0.650, 1.07], [0.700, 1.08]]);
  const tq = lerp(lift, [[0.400, 0.95], [0.450, 0.97], [0.500, 1.00], [0.550, 1.02], [0.600, 1.03], [0.650, 1.04], [0.700, 1.04]]);
  return { hp, tq };
}

/** Convert header primary tube OD (inches) to exhaust multipliers */
export function headerSizeToMultiplier(od: number): ComponentOption {
  const hp = lerp(od, [[1.50, 1.00], [1.625, 1.05], [1.75, 1.10], [1.875, 1.12], [2.0, 1.14], [2.25, 1.15]]);
  const tq = lerp(od, [[1.50, 1.00], [1.625, 1.03], [1.75, 1.06], [1.875, 1.07], [2.0, 1.08], [2.25, 1.08]]);
  const rpm = lerp(od, [[1.50, 0], [1.625, 100], [1.75, 300], [1.875, 400], [2.0, 500], [2.25, 600]]);
  const tier = od <= 1.5 ? "stock" : od < 1.7 ? "mild" : od < 1.9 ? "moderate" : "aggressive";
  return { id: "custom-exhaust", label: `Custom (${od}" primaries)`, description: `${od}" primary tubes`, hpMultiplier: hp, tqMultiplier: tq, peakRpmShift: Math.round(rpm), tier };
}

/** Fuel system CFM cap — returns multiplier ≤ 1.0 if carb can't support the airflow */
export function fuelSystemCfmCap(carbCfm: number, displacementCi: number, peakRpm: number, ve: number = 0.85): number {
  const requiredCfm = (displacementCi * peakRpm * ve) / 3456;
  if (carbCfm >= requiredCfm) return 1.0;
  // Gentle curve — a slightly undersized carb doesn't lose proportionally
  const ratio = carbCfm / requiredCfm;
  return 0.3 + 0.7 * ratio; // never below 30%, and tapers the penalty
}

// ── Reference Builds ──────────────────────────────────────────────────────────
// Real-world dyno-verified combinations from magazine tests and builder logs

export const referenceBuilds: ReferenceBuild[] = [
  // SBC 350
  {
    name: "Budget 350 Combo",
    platform: "sbc-350",
    hp: 310, torque: 355, rpm: 5200,
    heads: "budget-alum", cam: "mild", intake: "dual-pln", exhaust: "shorty", compression: "stock", induction: "na",
    source: "Hot Rod Budget Build 2019",
  },
  {
    name: "350 Street Machine",
    platform: "sbc-350",
    hp: 400, torque: 410, rpm: 5500,
    heads: "mid-alum", cam: "moderate", intake: "air-gap", exhaust: "long-tb", compression: "mild", induction: "na",
    source: "Engine Masters S3E7",
  },
  {
    name: "350 Weekend Warrior",
    platform: "sbc-350",
    hp: 460, torque: 425, rpm: 6000,
    heads: "cnc-alum", cam: "hot-st", intake: "single-pln", exhaust: "long-tb", compression: "high", induction: "na",
    source: "Westech Dyno, Car Craft 2020",
  },

  // SBC 383
  {
    name: "383 Street/Strip",
    platform: "sbc-383",
    hp: 430, torque: 465, rpm: 5400,
    heads: "mid-alum", cam: "moderate", intake: "air-gap", exhaust: "long-tb", compression: "mild", induction: "na",
    source: "Chevy High Performance Mag",
  },
  {
    name: "383 Torque Monster",
    platform: "sbc-383",
    hp: 475, torque: 500, rpm: 5600,
    heads: "cnc-alum", cam: "moderate", intake: "air-gap", exhaust: "long-tb", compression: "high", induction: "na",
    source: "Engine Masters S5E2",
  },
  {
    name: "383 Procharged Street",
    platform: "sbc-383",
    hp: 620, torque: 580, rpm: 5800,
    heads: "mid-alum", cam: "moderate", intake: "single-pln", exhaust: "long-tb", compression: "stock", induction: "sc-6psi",
    source: "Super Chevy Dyno Day",
  },

  // LS1
  {
    name: "LS1 Cam-Only",
    platform: "ls1-346",
    hp: 420, torque: 405, rpm: 6000,
    heads: "ported-stock", cam: "moderate", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "GM High-Tech Performance Mag",
  },
  {
    name: "LS1 Heads & Cam",
    platform: "ls1-346",
    hp: 490, torque: 440, rpm: 6200,
    heads: "mid-alum", cam: "hot-st", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "LS1Tech Dyno Compilation",
  },

  // LS3
  {
    name: "LS3 Cam-Only",
    platform: "ls3-376",
    hp: 500, torque: 470, rpm: 6200,
    heads: "stock", cam: "moderate", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "Westech LS3 Cam Test",
  },
  {
    name: "LS3 Full-Build NA",
    platform: "ls3-376",
    hp: 570, torque: 490, rpm: 6500,
    heads: "cnc-alum", cam: "hot-st", intake: "single-pln", exhaust: "lg-race", compression: "high", induction: "na",
    source: "Engine Masters S7E4",
  },

  // BBC 454
  {
    name: "454 Budget Brawler",
    platform: "bbc-454",
    hp: 410, torque: 500, rpm: 5000,
    heads: "ported-stock", cam: "mild", intake: "dual-pln", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "Hot Rod Garage S4E12",
  },
  {
    name: "454 Street Bruiser",
    platform: "bbc-454",
    hp: 525, torque: 560, rpm: 5400,
    heads: "mid-alum", cam: "moderate", intake: "air-gap", exhaust: "long-tb", compression: "mild", induction: "na",
    source: "Chevy High Performance Mag",
  },

  // SBF 302
  {
    name: "5.0 Fox Body Build",
    platform: "sbf-302",
    hp: 325, torque: 340, rpm: 5400,
    heads: "budget-alum", cam: "mild", intake: "air-gap", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "5.0 Mustang & Super Fords",
  },
  {
    name: "302 Stroker Street",
    platform: "sbf-302",
    hp: 400, torque: 380, rpm: 6000,
    heads: "mid-alum", cam: "moderate", intake: "single-pln", exhaust: "long-tb", compression: "high", induction: "na",
    source: "Muscle Mustangs & Fast Fords",
  },

  // Coyote
  {
    name: "Coyote Bolt-Ons",
    platform: "coyote-50",
    hp: 505, torque: 440, rpm: 7200,
    heads: "stock", cam: "mild", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "AmericanMuscle Dyno Test",
  },
  {
    name: "Coyote Supercharged",
    platform: "coyote-50",
    hp: 700, torque: 560, rpm: 7000,
    heads: "stock", cam: "stock", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "sc-10psi",
    source: "Roush Phase 2 Package",
  },

  // Modern Hemi
  {
    name: "5.7 Hemi Cam-Only",
    platform: "hemi-57",
    hp: 430, torque: 440, rpm: 5800,
    heads: "stock", cam: "moderate", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "ModernMopar Dyno Day",
  },
  {
    name: "6.4 Hemi Supercharged",
    platform: "hemi-64",
    hp: 725, torque: 660, rpm: 6200,
    heads: "stock", cam: "mild", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "sc-6psi",
    source: "Whipple Gen 5 Kit Dyno",
  },

  // Mopar 360
  {
    name: "360 Magnum Street",
    platform: "mopar-360",
    hp: 340, torque: 400, rpm: 5200,
    heads: "ported-stock", cam: "mild", intake: "dual-pln", exhaust: "long-tb", compression: "stock", induction: "na",
    source: "Mopar Muscle Magazine",
  },

  // GM 5.3
  {
    name: "5.3 Junkyard Turbo",
    platform: "ls-53",
    hp: 500, torque: 480, rpm: 5600,
    heads: "stock", cam: "mild", intake: "stock", exhaust: "long-tb", compression: "stock", induction: "turbo-8",
    source: "Junkyard LS Turbo Build - Roadkill",
  },
];
