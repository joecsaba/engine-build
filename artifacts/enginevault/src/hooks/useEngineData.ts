/**
 * Shared hook for loading engine data from the static JSON files.
 * All calculators should use this instead of hardcoding engine specs.
 *
 * Data is exported from Postgres via export-and-deploy.sh and lives
 * in /data/manufacturers.json, /data/families.json, and
 * /data/engines/{manufacturer}/{family}.json
 */

import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types matching the JSON export format ──────────────────────────

export interface Manufacturer {
  slug: string;
  name: string;
  country: string;
}

export interface Family {
  family_slug: string;
  manufacturer_slug: string;
  manufacturer_name: string;
  family_name: string;
  configuration: string | null;
  engine_count: number;
}

export interface HeadData {
  head_cc: number | null;
  intake_valve_dia: number | null;
  exhaust_valve_dia: number | null;
  valve_stem_dia: number | null;
  rocker_ratio: number | null;
  lifter_type: string | null;
  cam_intake_lift: number | null;
  cam_exhaust_lift: number | null;
  spring_type: string | null;
  head_gasket_thickness: number | null;
}

export interface ClearanceData {
  main_journal: number | null;
  rod_journal: number | null;
  main_clearance_min: number | null;
  main_clearance_max: number | null;
  rod_clearance_min: number | null;
  rod_clearance_max: number | null;
  piston_wall_min: number | null;
  piston_wall_max: number | null;
  crank_endplay_min: number | null;
  crank_endplay_max: number | null;
  ring_gap_top: string | null;
  ring_gap_second: string | null;
  ring_gap_oil: string | null;
}

export interface InductionData {
  type: string | null;
  carb_make: string | null;
  carb_model: string | null;
  intake_manifold_pn: string | null;
}

export interface Vehicle {
  name: string;
  year_start: number | null;
  year_end: number | null;
}

export interface Variant {
  code: string;
  description: string | null;
}

export interface EngineRecord {
  engine_id: string;
  year: number | null;
  displacement_ci: number | null;
  displacement_l: number | null;
  num_cylinders: number | null;
  configuration: string | null;
  bore_in: number | null;
  bore_mm: number | null;
  stroke_in: number | null;
  stroke_mm: number | null;
  rod_length_in: number | null;
  deck_height_in: number | null;
  compression_ratio: number | null;
  advertised_hp: number | null;
  fuel_type: string | null;
  block_material: string | null;
  head_material: string | null;
  valvetrain: string | null;
  valves_per_cylinder: number | null;
  cam_type: string | null;
  firing_order: string | null;
  oil_capacity_qt: number | null;
  coolant_capacity_qt: number | null;
  nhra_verified: boolean | null;
  vehicles: Vehicle[] | null;
  variants: Variant[] | null;
  head: HeadData | null;
  induction: InductionData | null;
  clearances: ClearanceData | null;
}

export interface FamilyData {
  family: string;
  manufacturer: string;
  configuration: string | null;
  engines: EngineRecord[];
}

// ── Cache to avoid re-fetching ─────────────────────────────────────

const cache: {
  manufacturers: Manufacturer[] | null;
  families: Family[] | null;
  familyData: Record<string, FamilyData>;
} = {
  manufacturers: null,
  families: null,
  familyData: {},
};

// ── Hook: useManufacturers ─────────────────────────────────────────

export function useManufacturers() {
  const [data, setData] = useState<Manufacturer[]>(cache.manufacturers || []);
  const [loading, setLoading] = useState(!cache.manufacturers);

  useEffect(() => {
    if (cache.manufacturers) { setData(cache.manufacturers); return; }
    fetch(`${BASE}/data/manufacturers.json`)
      .then(r => r.json())
      .then(d => { cache.manufacturers = d; setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { manufacturers: data, loading };
}

// ── Hook: useFamilies ──────────────────────────────────────────────

export function useFamilies() {
  const [data, setData] = useState<Family[]>(cache.families || []);
  const [loading, setLoading] = useState(!cache.families);

  useEffect(() => {
    if (cache.families) { setData(cache.families); return; }
    fetch(`${BASE}/data/families.json`)
      .then(r => r.json())
      .then(d => { cache.families = d; setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { families: data, loading };
}

// ── Hook: useFamilyEngines ─────────────────────────────────────────

export function useFamilyEngines(manufacturerSlug: string, familySlug: string) {
  const key = `${manufacturerSlug}/${familySlug}`;
  const [data, setData] = useState<FamilyData | null>(cache.familyData[key] || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!manufacturerSlug || !familySlug) { setData(null); return; }
    if (cache.familyData[key]) { setData(cache.familyData[key]); return; }

    setLoading(true);
    fetch(`${BASE}/data/engines/${manufacturerSlug}/${familySlug}.json`)
      .then(r => r.json())
      .then(d => { cache.familyData[key] = d; setData(d); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [manufacturerSlug, familySlug]);

  return { familyData: data, loading };
}

// ── Hook: useAllEnginesFlat ────────────────────────────────────────
// Loads ALL families and flattens into a single engine list.
// Useful for calculators that need a searchable engine database.
// WARNING: loads ALL JSON files — use sparingly.

export function useAllEnginesFlat() {
  const { families, loading: famLoading } = useFamilies();
  const [engines, setEngines] = useState<(EngineRecord & { manufacturer: string; family: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (famLoading || families.length === 0) return;

    let cancelled = false;

    async function loadAll() {
      const results: (EngineRecord & { manufacturer: string; family: string })[] = [];
      const uniqueFamilies = families.reduce((acc, f) => {
        const key = `${f.manufacturer_slug}/${f.family_slug}`;
        if (!acc.has(key)) acc.set(key, f);
        return acc;
      }, new Map<string, Family>());

      let loaded = 0;
      for (const [key, f] of uniqueFamilies) {
        if (cancelled) return;
        try {
          let familyData = cache.familyData[key];
          if (!familyData) {
            const res = await fetch(`${BASE}/data/engines/${f.manufacturer_slug}/${f.family_slug}.json`);
            familyData = await res.json();
            cache.familyData[key] = familyData;
          }
          for (const eng of familyData.engines) {
            results.push({ ...eng, manufacturer: familyData.manufacturer, family: familyData.family });
          }
        } catch {}
        loaded++;
        setProgress(Math.round((loaded / uniqueFamilies.size) * 100));
      }

      if (!cancelled) {
        setEngines(results);
        setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [families, famLoading]);

  return { engines, loading, progress };
}

// ── Utility: find engines with clearance data ──────────────────────

export function useEnginesWithClearances() {
  const { families, loading: famLoading } = useFamilies();
  const [platforms, setPlatforms] = useState<{
    label: string;
    engineId: string;
    mainJournal: number;
    rodJournal: number;
    mainClearanceMin: number;
    mainClearanceMax: number;
    rodClearanceMin: number;
    rodClearanceMax: number;
    blockMaterial: string;
    numCylinders: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (famLoading || families.length === 0) return;

    let cancelled = false;

    async function load() {
      const seen = new Set<string>();
      const results: typeof platforms = [];

      // Load a subset of families that are likely to have clearance data
      const domesticMfrs = ["chevrolet", "ford", "chrysler", "pontiac", "buick", "oldsmobile", "american_motors", "gmc"];
      const domesticFamilies = families.filter(f => domesticMfrs.includes(f.manufacturer_slug));

      for (const f of domesticFamilies) {
        if (cancelled) return;
        const key = `${f.manufacturer_slug}/${f.family_slug}`;
        try {
          let familyData = cache.familyData[key];
          if (!familyData) {
            const res = await fetch(`${BASE}/data/engines/${f.manufacturer_slug}/${f.family_slug}.json`);
            familyData = await res.json();
            cache.familyData[key] = familyData;
          }

          for (const eng of familyData.engines) {
            if (!eng.clearances?.main_journal || !eng.clearances?.rod_journal) continue;

            // Group by family to avoid duplicates (same clearances for all engines in a family)
            const familyKey = `${f.manufacturer_slug}-${f.family_slug}`;
            if (seen.has(familyKey)) continue;
            seen.add(familyKey);

            const disp = eng.displacement_ci ? ` ${eng.displacement_ci}ci` : "";
            const label = `${familyData.manufacturer} ${familyData.family}${disp}`;

            results.push({
              label,
              engineId: eng.engine_id,
              mainJournal: eng.clearances.main_journal,
              rodJournal: eng.clearances.rod_journal,
              mainClearanceMin: eng.clearances.main_clearance_min || 0,
              mainClearanceMax: eng.clearances.main_clearance_max || 0,
              rodClearanceMin: eng.clearances.rod_clearance_min || 0,
              rodClearanceMax: eng.clearances.rod_clearance_max || 0,
              blockMaterial: eng.block_material || "iron",
              numCylinders: eng.num_cylinders || 8,
            });
          }
        } catch {}
      }

      if (!cancelled) {
        setPlatforms(results.sort((a, b) => a.label.localeCompare(b.label)));
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [families, famLoading]);

  return { platforms, loading };
}

// ── Utility: get engines for reference tables ──────────────────────
// Returns a curated list of popular engines with bore/stroke/rod data
// for use in reference comparison tables (rod ratio, piston speed, etc.)

export function useReferenceEngines() {
  const { families, loading: famLoading } = useFamilies();
  const [engines, setEngines] = useState<{
    name: string;
    bore: number;
    stroke: number;
    rodLength: number | null;
    displacement: number;
    cylinders: number;
    compression: number | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (famLoading || families.length === 0) return;

    let cancelled = false;

    async function load() {
      const results: typeof engines = [];
      const targetFamilies = [
        "chevrolet/chevrolet_ls",
        "chevrolet/chevrolet_gen_v_lt",
        "ford/ford_small_block_windsor",
        "ford/ford_modular",
      ];

      // Also try common domestic families
      const commonSlugs = families.filter(f =>
        f.family_name.toLowerCase().includes("small block") ||
        f.family_name.toLowerCase().includes("big block") ||
        f.family_name === "LS" ||
        f.family_name.toLowerCase().includes("coyote")
      ).map(f => `${f.manufacturer_slug}/${f.family_slug}`);

      const toLoad = [...new Set([...targetFamilies, ...commonSlugs])];

      for (const key of toLoad) {
        if (cancelled) return;
        const [mfr, fam] = key.split("/");
        try {
          let familyData = cache.familyData[key];
          if (!familyData) {
            const res = await fetch(`${BASE}/data/engines/${mfr}/${fam}.json`);
            if (!res.ok) continue;
            familyData = await res.json();
            cache.familyData[key] = familyData;
          }

          for (const eng of familyData.engines) {
            if (!eng.bore_in || !eng.stroke_in) continue;
            const variant = eng.variants?.[0]?.code || "";
            const disp = eng.displacement_ci ? `${eng.displacement_ci}ci` : "";
            const name = `${familyData.manufacturer} ${variant || familyData.family} ${disp}`.trim();

            results.push({
              name,
              bore: eng.bore_in,
              stroke: eng.stroke_in,
              rodLength: eng.rod_length_in,
              displacement: eng.displacement_ci || 0,
              cylinders: eng.num_cylinders || 8,
              compression: eng.compression_ratio,
            });
          }
        } catch {}
      }

      if (!cancelled) {
        // Deduplicate by displacement + bore + stroke
        const seen = new Set<string>();
        const deduped = results.filter(e => {
          const key = `${e.displacement}-${e.bore}-${e.stroke}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setEngines(deduped.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [families, famLoading]);

  return { engines, loading };
}

// ══════════════════════════════════════════════════════════════════
// SUPPLEMENTAL DATA HOOKS
// These load from standalone JSON files (not per-engine-family)
// ══════════════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────────────

export interface Transmission {
  slug: string;
  name: string;
  type: string;
  speeds: number;
  gear_1: number | null;
  gear_2: number | null;
  gear_3: number | null;
  gear_4: number | null;
  gear_5: number | null;
  gear_6: number | null;
  gear_7: number | null;
  reverse: number | null;
  notes: string | null;
}

export interface TurboModel {
  brand: string;
  model: string;
  frame: string | null;
  compressor_wheel_mm: number | null;
  max_flow_lbmin: number | null;
  max_pressure_ratio: number | null;
  surge_flow_lbmin: number | null;
  turbine_wheel_mm: number | null;
  exhaust_flange: string | null;
  ar_options: string | null;
  hp_range_min: number | null;
  hp_range_max: number | null;
  fuel_type: string | null;
  notes: string | null;
}

export interface HeadFlowProfile {
  name: string;
  manufacturer: string | null;
  engine_family: string | null;
  valve_size_intake: number | null;
  valve_size_exhaust: number | null;
  test_pressure_inwc: number | null;
  peak_intake_cfm: number | null;
  peak_exhaust_cfm: number | null;
  port_type: string | null;
  flow_data: Record<string, { i: number; e: number }> | null;
  notes: string | null;
}

export interface DieselPlatform {
  slug: string;
  name: string;
  engine_family: string | null;
  displacement_ci: number | null;
  cylinders: number | null;
  bore_in: number | null;
  stock_hp: number | null;
  stock_torque: number | null;
  injection_type: string | null;
  supply_pressure_min: number | null;
  supply_pressure_max: number | null;
  max_egt_sustained: number | null;
  max_egt_peak: number | null;
  stock_turbo: string | null;
  nozzle_specs: unknown | null;
  lift_pump_specs: unknown | null;
  notes: string | null;
}

// ── Generic data loader ────────────────────────────────────────────

const supplementalCache: Record<string, unknown> = {};

function useJsonData<T>(filename: string): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>((supplementalCache[filename] as T[]) || []);
  const [loading, setLoading] = useState(!supplementalCache[filename]);

  useEffect(() => {
    if (supplementalCache[filename]) {
      setData(supplementalCache[filename] as T[]);
      setLoading(false);
      return;
    }
    fetch(`${BASE}/data/${filename}`)
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        supplementalCache[filename] = arr;
        setData(arr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filename]);

  return { data, loading };
}

// ── Hooks ──────────────────────────────────────────────────────────

export function useTransmissions() {
  return useJsonData<Transmission>("transmissions.json");
}

export function useTurboModels() {
  return useJsonData<TurboModel>("turbo_models.json");
}

export function useHeadFlowProfiles() {
  return useJsonData<HeadFlowProfile>("head_flow_profiles.json");
}

export function useDieselPlatforms() {
  return useJsonData<DieselPlatform>("diesel_platforms.json");
}

// ── Ring Gap Data ─────────────────────────────────────────────────

export interface RingGapSpec {
  platform_slug: string;
  engine_label: string;
  bore_in: number;
  source: string;
  source_detail: string | null;
  application: string;
  top_ring_min: number;
  top_ring_max: number;
  second_ring_min: number;
  second_ring_max: number;
  oil_ring_min: number | null;
  oil_ring_max: number | null;
  multiplier_top: number | null;
  multiplier_second: number | null;
  notes: string | null;
  sort_order: number;
}

export interface RingGapMultiplier {
  source: string;
  application: string;
  label: string;
  fuel_type: string;
  top_multiplier: number;
  second_multiplier: number;
  oil_min: number;
  notes: string | null;
  sort_order: number;
}

export function useRingGapSpecs() {
  return useJsonData<RingGapSpec>("ring_gap_specs.json");
}

export function useRingGapMultipliers() {
  return useJsonData<RingGapMultiplier>("ring_gap_multipliers.json");
}

// ── Bolt Spec Data ───────────────────────────────────────────────

export interface BoltSpecEntry {
  variant: string | null;
  thread_callout: string;
  diameter_in: number | null;
  diameter_mm: number | null;
  thread_pitch_tpi: number | null;
  thread_pitch_mm: number | null;
  bolt_count: number | null;
  factory_type: string;
  hex_size: string | null;
  common_upgrade: string | null;
  notes: string | null;
}

export interface BoltSpecPlatform {
  slug: string;
  display_name: string;
  manufacturer: string;
  sort_order: number;
  head_bolts: BoltSpecEntry[] | null;
  main_bolts: BoltSpecEntry[] | null;
}

export function useBoltSpecs() {
  return useJsonData<BoltSpecPlatform>("bolt_specs.json");
}
