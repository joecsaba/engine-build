/** Shapes of public/data/vehicle-pages/*, written by scripts/vehicleData.mjs. */

export interface VehicleSource {
  name: string;
  url: string;
  type?: string | null;
}

export interface VehicleEngine {
  year: number;
  yearLabel?: string;
  gen: string | null;
  cid: number | null;
  cyl: number | null;
  name: string;
  code: string | null;
  /** What the maker or enthusiasts call this version ("426 Street Hemi, dual 4-bbl"). */
  desc?: string | null;
  hp: number | null;
  /** Set when sources agree the engine was offered but publish different ratings. */
  hpRange?: [number, number];
  hpBasis: "gross" | "net";
  electric?: boolean;
  trims: string[];
  note: string | null;
  /** Source fields exist in data/vehicles/ only; the runtime JSON omits them. */
  nhra?: boolean;
  race?: boolean;
  sources?: VehicleSource[];
  sourceCount?: number;
  engineUrl: string | null;
  familyUrl: string | null;
  familyName: string | null;
}

export interface VehicleGeneration {
  key: string;
  name: string;
  years: [number, number];
  intro?: string[];
}

export interface VehicleDoc {
  make: string;
  model: string;
  makeSlug: string;
  slug: string;
  url: string;
  makeUrl: string;
  title: string;
  description: string;
  intro: string[];
  generations: VehicleGeneration[];
  engines: VehicleEngine[];
  sources?: VehicleSource[];
  method?: string;
  yearMin: number;
  yearMax: number;
}

export interface VehicleSummary {
  make: string;
  model: string;
  url: string;
  makeUrl: string;
  makeSlug: string;
  yearMin: number;
  yearMax: number;
  generations: { name: string; years: [number, number] }[];
  engineCount: number;
}
