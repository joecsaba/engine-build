// Shape of the build-time engine data emitted by scripts/engineData.mjs into
// public/data/engine-pages/. Keep in sync with the object literal built in
// loadEngineData() there.

export interface EngineVehicle {
  name: string;
  year_start: number | null;
  year_end: number | null;
}

export interface EngineVariant {
  engine_id: string;
  year: number | null;
  hp: number | null;
  codes: string[];
}

export interface EngineRecord {
  url: string;
  slug: string;
  engine_id: string;
  displayName: string;
  /** Concise, searchable <title>. displayName is for lists, this is for search. */
  seoTitle?: string;
  /** Facts computed from this engine's own dimensions. */
  derived?: { label: string; value: string }[];
  familyName: string;
  familySlug: string;
  familyUrl: string;
  manufacturerName: string;
  manufacturerSlug: string;
  manufacturerUrl: string;

  bore_in: number | null;
  stroke_in: number | null;
  bore_mm: number | null;
  stroke_mm: number | null;
  displacement_ci: number | null;
  displacement_l: number | null;
  num_cylinders: number | null;
  compression_ratio: number | null;
  rod_length_in: number | null;
  deck_height_in: number | null;

  configuration: string | null;
  block_material: string | null;
  head_material: string | null;
  valvetrain: string | null;
  valves_per_cylinder: number | null;
  cam_type: string | null;
  fuel_type: string | null;
  induction: string | null;
  firing_order: string | null;
  oil_capacity_qt: number | null;
  coolant_capacity_qt: number | null;

  rod_ratio: number | null;
  boreStrokeRatio: number | null;
  hpMin: number | null;
  hpMax: number | null;
  yearMin: number | null;
  yearMax: number | null;

  calcLinks: { href: string; label: string }[];

  /** Whitelisted head specs. Empty source fields are not carried through. */
  head: {
    intake_valve_dia?: number;
    exhaust_valve_dia?: number;
    /** Combustion chamber volume, cc. From the NHRA blueprints. */
    head_cc?: number;
    rocker_ratio?: number;
    lifter_type?: string;
  } | null;
  /**
   * Piston-to-deck clearance at TDC, inches. NHRA records this for class
   * legality and labels it "deck height" — it is NOT block deck height, which
   * is ~9". Median here is 0.010".
   */
  piston_deck_clearance?: number | null;
  /** Provenance, shown on the page. */
  sources?: string[];
  /** Nearest-displacement engines, family first. Cross-links between pages. */
  relatedEngines: {
    url: string;
    displayName: string;
    familyName: string;
    manufacturerName: string;
    displacement_ci: number | null;
  }[];
  vehicles: EngineVehicle[];
  /** Verified factory installations (scripts/vehicleData.mjs). */
  factoryCars?: FactoryCarGroup[];
  variants: EngineVariant[];
  variantCount: number;
  /** Where this engine sits in its family; feeds the computed prose. */
  familyStats?: {
    count: number;
    minCi: number | null;
    maxCi: number | null;
    rank: "largest" | "smallest" | "middle" | "only";
  };
}

export interface EngineFamilyDoc {
  url: string;
  familyName: string;
  manufacturerName: string;
  manufacturerUrl: string;
  configuration: string | null;
  factoryCars?: FactoryCarGroup[];
  engines: EngineRecord[];
}

/** One vehicle model in a "Factory cars with this engine" list. */
export interface FactoryCarGroup {
  vehicle: string;
  url: string;
  rows: { vehicle: string; url: string; year: number; hp: number | null; hpBasis: string; code: string | null }[];
}

export interface ManufacturerSummary {
  url: string;
  name: string;
  country: string | null;
  engineCount: number;
  families: {
    url: string;
    familyName: string;
    configuration: string | null;
    engineCount: number;
  }[];
}
