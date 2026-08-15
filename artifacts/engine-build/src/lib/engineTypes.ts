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

  head: unknown | null;
  clearances: unknown | null;
  vehicles: EngineVehicle[];
  variants: EngineVariant[];
  variantCount: number;
}

export interface EngineFamilyDoc {
  url: string;
  familyName: string;
  manufacturerName: string;
  manufacturerUrl: string;
  configuration: string | null;
  engines: EngineRecord[];
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
