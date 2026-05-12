import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ---------- types ---------- */

interface Manufacturer {
  slug: string;
  name: string;
  country: string;
}

interface Family {
  family_slug: string;
  manufacturer_slug: string;
  manufacturer_name: string;
  family_name: string;
  configuration: string | null;
  engine_count: number;
}

interface TorqueStep {
  step: number;
  ft_lbs: number | null;
  nm: number | null;
  angle: number | null;
  notes: string | null;
}

interface TorqueSpec {
  component: string;
  display_name: string;
  lubricant: string | null;
  bolt_type: string | null;
  reusable: boolean;
  steps: TorqueStep[];
}

interface Vehicle {
  name: string;
  year_start: number | null;
  year_end: number | null;
}

interface Variant {
  code: string;
  description: string | null;
}

interface HeadData {
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

interface ClearanceData {
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

interface InductionData {
  type: string | null;
  carb_make: string | null;
  carb_model: string | null;
  intake_manifold_pn: string | null;
}

interface Engine {
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
  vehicles: Vehicle[];
  variants: Variant[];
  torque_specs: TorqueSpec[] | null;
  head: HeadData | null;
  induction: InductionData | null;
  clearances: ClearanceData | null;
}

interface FamilyData {
  family: string;
  manufacturer: string;
  configuration: string | null;
  engines: Engine[];
}

interface VinResult {
  Make: string;
  Model: string;
  ModelYear: string;
  EngineModel: string;
  DisplacementCI: string;
  DisplacementL: string;
  EngineCylinders: string;
  FuelTypePrimary: string;
  EngineConfiguration: string;
  ValveTrainDesign: string;
  EngineHP: string;
}

/* ---------- helpers ---------- */

function formatBoltType(bt: string | null): string {
  if (!bt) return "\u2014";
  return bt
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function engineLabel(e: Engine): string {
  const parts: string[] = [];
  if (e.variants?.length) parts.push(e.variants.map((v) => v.code).join(" / "));
  if (e.displacement_l) parts.push(`${e.displacement_l}L`);
  if (e.displacement_ci) parts.push(`(${e.displacement_ci} ci)`);
  if (e.advertised_hp) parts.push(`\u2014 ${e.advertised_hp} HP`);
  return parts.join(" ") || e.engine_id;
}

function stepSummary(step: TorqueStep): string {
  const parts: string[] = [];
  if (step.ft_lbs != null) parts.push(`${step.ft_lbs} ft-lbs`);
  if (step.nm != null) parts.push(`${step.nm} Nm`);
  if (step.angle != null) parts.push(`+ ${step.angle}\u00B0`);
  if (step.notes) parts.push(`(${step.notes})`);
  return parts.join(" / ") || "\u2014";
}

const DISCLAIMER_TEXT =
  "Our torque specifications are validated against a minimum of two independent sources. However, it is the responsibility of each individual to verify all torque specifications against their factory service manual before use. Torque values may vary by production year, casting, and thread condition. Engine-build.com is not liable for any damages resulting from the use of these specifications.";

/* ---------- component ---------- */

export default function TorqueSpecs() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);

  const [selectedMfr, setSelectedMfr] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<"ftlbs" | "nm">("ftlbs");

  // VIN decoder state
  const [vinInput, setVinInput] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [vinError, setVinError] = useState("");
  const [vinMessage, setVinMessage] = useState("");


  // Load manufacturers + families on mount
  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/data/manufacturers.json`).then((r) => r.json()),
      fetch(`${BASE}/data/families.json`).then((r) => r.json()),
    ]).then(([mfrs, fams]) => {
      setManufacturers(mfrs);
      setFamilies(fams);
    });
  }, []);

  // Filtered families for the selected manufacturer
  const filteredFamilies = families.filter(
    (f) => f.manufacturer_slug === selectedMfr,
  );

  // Load family data when a family is selected
  useEffect(() => {
    if (!selectedMfr || !selectedFamily) {
      setFamilyData(null);
      return;
    }
    setLoading(true);
    fetch(
      `${BASE}/data/engines/${selectedMfr}/${selectedFamily}.json`,
    )
      .then((r) => r.json())
      .then((data: FamilyData) => {
        setFamilyData(data);
        setSelectedEngine("");
      })
      .catch(() => setFamilyData(null))
      .finally(() => setLoading(false));
  }, [selectedMfr, selectedFamily]);

  const engines = familyData?.engines ?? [];
  const activeEngine = engines.find((e) => e.engine_id === selectedEngine) ?? null;
  const specs = activeEngine?.torque_specs;
  const hasSpecs = specs && specs.length > 0;

  /* ---------- VIN decode handler ---------- */
  async function handleVinDecode() {
    const vin = vinInput.trim().toUpperCase();
    setVinResult(null);
    setVinError("");
    setVinMessage("");

    if (vin.length !== 17) {
      setVinError("A valid VIN must be exactly 17 characters.");
      return;
    }

    setVinLoading(true);
    try {
      const resp = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
      );
      if (!resp.ok) throw new Error("API request failed");
      const json = await resp.json();
      const result: VinResult = json.Results?.[0];

      if (!result || (!result.Make && !result.Model)) {
        setVinError("Could not decode this VIN. Please check the number and try again.");
        return;
      }

      setVinResult(result);

      // Try to auto-match manufacturer
      const makeLower = (result.Make || "").toLowerCase();
      const matched = manufacturers.find(
        (m) =>
          m.slug.toLowerCase() === makeLower ||
          m.name.toLowerCase() === makeLower,
      );

      if (matched) {
        setSelectedMfr(matched.slug);
        setSelectedFamily("");
        setSelectedEngine("");
        setFamilyData(null);

        // Try to match engine code to a family
        const engineModel = (result.EngineModel || "").toLowerCase();
        if (engineModel) {
          const matchedFamily = families.find(
            (f) =>
              f.manufacturer_slug === matched.slug &&
              f.family_name.toLowerCase().includes(engineModel),
          );
          if (matchedFamily) {
            setSelectedFamily(matchedFamily.family_slug);
          }
        }
      }

      const engineDesc = [result.Make, result.Model, result.ModelYear]
        .filter(Boolean)
        .join(" ");
      const engineModelStr = result.EngineModel
        ? ` with ${result.EngineModel} engine`
        : "";
      setVinMessage(
        `Engine identified: ${engineDesc}${engineModelStr}. Select the matching engine family below to view torque specs.`,
      );
    } catch {
      setVinError("Failed to decode VIN. Please check your connection and try again.");
    } finally {
      setVinLoading(false);
    }
  }


  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="Engine Specs & Torque Specs | 2,400+ Engines"
        description="Engine specifications, head data, and torque specs for 2,400+ engines across 36 manufacturers. Look up bore, stroke, compression ratio, HP, and more. VIN decoder included."
        canonical="/engine-data"
        keywords="engine specs, engine data, engine specifications lookup, bore stroke, compression ratio, torque specs, engine database, torque specs database, engine specifications lookup, engine torque specs, bolt torque specifications"
      />

      <PageHeader
        eyebrow="Reference"
        title="Engine Data"
        subtitle="Engine specifications for 2,400+ engines across 36 manufacturers. Look up by VIN or select your engine manually."
      />

      {/* Beta banner */}
      <div className="bg-[#E85D04]/10 border-b border-[#E85D04]/20 py-3 px-4">
        <div className="container mx-auto max-w-6xl flex items-center gap-3">
          <span className="bg-[#E85D04] text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide shrink-0">Beta</span>
          <p className="text-sm text-[#1a1a1a]">
            This page is actively under development. We are adding new engines and data regularly. Torque specifications are being validated and will be added as they reach our verification threshold. If you notice any missing data or errors, please let us know via the feedback form on our home page.
          </p>
        </div>
      </div>

      {/* VIN Decoder */}
      <section className="bg-white border-b py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <Card className="border-[#E85D04]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#E85D04]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Decode Your VIN
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your 17-character VIN to automatically identify your engine.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Enter 17-character VIN (e.g., 1G1YY22G965104526)"
                    value={vinInput}
                    onChange={(e) => {
                      setVinInput(e.target.value.toUpperCase());
                      setVinError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleVinDecode();
                    }}
                    maxLength={17}
                    className="font-mono tracking-wider uppercase"
                  />
                </div>
                <button
                  onClick={handleVinDecode}
                  disabled={vinLoading}
                  className="bg-[#E85D04] hover:bg-[#d04f00] text-white font-medium px-6 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {vinLoading ? "Decoding..." : "Decode"}
                </button>
              </div>

              {vinError && (
                <p className="mt-3 text-sm text-red-600 font-medium">{vinError}</p>
              )}

              {vinResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {vinResult.ModelYear && (
                      <div>
                        <span className="text-muted-foreground text-xs">Year</span>
                        <p className="font-medium">{vinResult.ModelYear}</p>
                      </div>
                    )}
                    {vinResult.Make && (
                      <div>
                        <span className="text-muted-foreground text-xs">Make</span>
                        <p className="font-medium">{vinResult.Make}</p>
                      </div>
                    )}
                    {vinResult.Model && (
                      <div>
                        <span className="text-muted-foreground text-xs">Model</span>
                        <p className="font-medium">{vinResult.Model}</p>
                      </div>
                    )}
                    {vinResult.EngineModel && (
                      <div>
                        <span className="text-muted-foreground text-xs">Engine Code</span>
                        <p className="font-medium">{vinResult.EngineModel}</p>
                      </div>
                    )}
                    {(vinResult.DisplacementL || vinResult.DisplacementCI) && (
                      <div>
                        <span className="text-muted-foreground text-xs">Displacement</span>
                        <p className="font-medium">
                          {vinResult.DisplacementL ? `${parseFloat(vinResult.DisplacementL).toFixed(1)}L` : ""}
                          {vinResult.DisplacementL && vinResult.DisplacementCI ? " / " : ""}
                          {vinResult.DisplacementCI ? `${parseFloat(vinResult.DisplacementCI).toFixed(0)} ci` : ""}
                        </p>
                      </div>
                    )}
                    {vinResult.EngineCylinders && (
                      <div>
                        <span className="text-muted-foreground text-xs">Cylinders</span>
                        <p className="font-medium">{vinResult.EngineCylinders}</p>
                      </div>
                    )}
                    {vinResult.EngineHP && (
                      <div>
                        <span className="text-muted-foreground text-xs">HP</span>
                        <p className="font-medium">{vinResult.EngineHP} HP</p>
                      </div>
                    )}
                    {vinResult.FuelTypePrimary && (
                      <div>
                        <span className="text-muted-foreground text-xs">Fuel Type</span>
                        <p className="font-medium">{vinResult.FuelTypePrimary}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {vinMessage && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">{vinMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* OR Divider */}
      <div className="bg-white border-b">
        <div className="container mx-auto max-w-6xl flex items-center gap-4 px-4 py-2">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-sm font-semibold text-muted-foreground tracking-wide">OR SELECT MANUALLY</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>
      </div>

      {/* Manual Selectors */}
      <section className="bg-white border-b py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-4">
            <Label className="text-sm font-semibold">Select Manually</Label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Manufacturer */}
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Select
                value={selectedMfr}
                onValueChange={(v) => {
                  setSelectedMfr(v);
                  setSelectedFamily("");
                  setSelectedEngine("");
                  setFamilyData(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {manufacturers.map((m) => (
                    <SelectItem key={m.slug} value={m.slug}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Family */}
            <div className="space-y-2">
              <Label>Engine Family</Label>
              <Select
                value={selectedFamily}
                onValueChange={(v) => {
                  setSelectedFamily(v);
                  setSelectedEngine("");
                }}
                disabled={!selectedMfr}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedMfr ? "Select family" : "Choose manufacturer first"} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {filteredFamilies.map((f) => (
                    <SelectItem key={f.family_slug} value={f.family_slug}>
                      {f.family_name} ({f.engine_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Engine */}
            <div className="space-y-2">
              <Label>Engine</Label>
              <Select
                value={selectedEngine}
                onValueChange={setSelectedEngine}
                disabled={engines.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={engines.length ? "Select engine" : "Choose family first"} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {engines.map((e) => (
                    <SelectItem key={e.engine_id} value={e.engine_id}>
                      {engineLabel(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Results area */}
      <section className="py-8 px-4 flex-1 bg-gray-50">
        <div className="container mx-auto max-w-6xl space-y-6">
          {loading && (
            <p className="text-center text-muted-foreground py-12">Loading engine data...</p>
          )}

          {!loading && !activeEngine && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">Select a manufacturer, engine family, and engine above to view torque specs.</p>
            </div>
          )}

          {/* Engine details card */}
          {activeEngine && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {familyData?.manufacturer} {activeEngine.variants?.map((v) => v.code).join(" / ")}
                  {activeEngine.displacement_l ? ` \u2014 ${activeEngine.displacement_l}L` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
                  {activeEngine.year && (
                    <div>
                      <span className="text-muted-foreground">Year</span>
                      <p className="font-medium">{activeEngine.year}</p>
                    </div>
                  )}
                  {activeEngine.displacement_ci && (
                    <div>
                      <span className="text-muted-foreground">Displacement</span>
                      <p className="font-medium">{activeEngine.displacement_ci} ci / {activeEngine.displacement_l}L</p>
                    </div>
                  )}
                  {activeEngine.num_cylinders && (
                    <div>
                      <span className="text-muted-foreground">Cylinders</span>
                      <p className="font-medium">{activeEngine.num_cylinders}</p>
                    </div>
                  )}
                  {activeEngine.advertised_hp && (
                    <div>
                      <span className="text-muted-foreground">Advertised HP</span>
                      <p className="font-medium">{activeEngine.advertised_hp} HP</p>
                    </div>
                  )}
                  {activeEngine.compression_ratio && (
                    <div>
                      <span className="text-muted-foreground">Compression</span>
                      <p className="font-medium">{activeEngine.compression_ratio}:1</p>
                    </div>
                  )}
                  {activeEngine.bore_in && activeEngine.stroke_in && (
                    <div>
                      <span className="text-muted-foreground">Bore x Stroke</span>
                      <p className="font-medium">{activeEngine.bore_in}" x {activeEngine.stroke_in}"</p>
                    </div>
                  )}
                  {activeEngine.block_material && (
                    <div>
                      <span className="text-muted-foreground">Block</span>
                      <p className="font-medium capitalize">{activeEngine.block_material}</p>
                    </div>
                  )}
                  {activeEngine.head_material && (
                    <div>
                      <span className="text-muted-foreground">Head</span>
                      <p className="font-medium capitalize">{activeEngine.head_material}</p>
                    </div>
                  )}
                  {activeEngine.valvetrain && (
                    <div>
                      <span className="text-muted-foreground">Valvetrain</span>
                      <p className="font-medium">{activeEngine.valvetrain}</p>
                    </div>
                  )}
                  {activeEngine.fuel_type && (
                    <div>
                      <span className="text-muted-foreground">Fuel</span>
                      <p className="font-medium capitalize">{activeEngine.fuel_type}</p>
                    </div>
                  )}
                  {activeEngine.rod_length_in && (
                    <div>
                      <span className="text-muted-foreground">Rod Length</span>
                      <p className="font-medium">{activeEngine.rod_length_in}"</p>
                    </div>
                  )}
                  {activeEngine.deck_height_in && (
                    <div>
                      <span className="text-muted-foreground">Deck Height</span>
                      <p className="font-medium">{activeEngine.deck_height_in}"</p>
                    </div>
                  )}
                  {activeEngine.cam_type && (
                    <div>
                      <span className="text-muted-foreground">Cam Type</span>
                      <p className="font-medium capitalize">{activeEngine.cam_type}</p>
                    </div>
                  )}
                  {activeEngine.firing_order && (
                    <div>
                      <span className="text-muted-foreground">Firing Order</span>
                      <p className="font-medium font-mono">{activeEngine.firing_order}</p>
                    </div>
                  )}
                  {activeEngine.oil_capacity_qt && (
                    <div>
                      <span className="text-muted-foreground">Oil Capacity</span>
                      <p className="font-medium">{activeEngine.oil_capacity_qt} qt</p>
                    </div>
                  )}
                  {activeEngine.coolant_capacity_qt && (
                    <div>
                      <span className="text-muted-foreground">Coolant Capacity</span>
                      <p className="font-medium">{activeEngine.coolant_capacity_qt} qt</p>
                    </div>
                  )}
                </div>

                {/* Vehicles */}
                {activeEngine.vehicles?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">Applications</span>
                    <p className="text-sm font-medium mt-1">
                      {activeEngine.vehicles
                        .map((v) => {
                          let label = v.name;
                          if (v.year_start && v.year_end) label += ` (${v.year_start}\u2013${v.year_end})`;
                          else if (v.year_start) label += ` (${v.year_start}+)`;
                          return label;
                        })
                        .join(", ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cylinder Head Data */}
          {activeEngine?.head && (Object.values(activeEngine.head).some(v => v != null)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cylinder Head Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
                  {activeEngine.head.head_cc && (
                    <div>
                      <span className="text-muted-foreground">Chamber Volume</span>
                      <p className="font-medium">{activeEngine.head.head_cc} cc</p>
                    </div>
                  )}
                  {activeEngine.head.intake_valve_dia && (
                    <div>
                      <span className="text-muted-foreground">Intake Valve</span>
                      <p className="font-medium">{activeEngine.head.intake_valve_dia}"</p>
                    </div>
                  )}
                  {activeEngine.head.exhaust_valve_dia && (
                    <div>
                      <span className="text-muted-foreground">Exhaust Valve</span>
                      <p className="font-medium">{activeEngine.head.exhaust_valve_dia}"</p>
                    </div>
                  )}
                  {activeEngine.head.valve_stem_dia && (
                    <div>
                      <span className="text-muted-foreground">Valve Stem</span>
                      <p className="font-medium">{activeEngine.head.valve_stem_dia}"</p>
                    </div>
                  )}
                  {activeEngine.head.rocker_ratio && (
                    <div>
                      <span className="text-muted-foreground">Rocker Ratio</span>
                      <p className="font-medium">{activeEngine.head.rocker_ratio}:1</p>
                    </div>
                  )}
                  {activeEngine.head.lifter_type && (
                    <div>
                      <span className="text-muted-foreground">Lifter Type</span>
                      <p className="font-medium capitalize">{activeEngine.head.lifter_type}</p>
                    </div>
                  )}
                  {activeEngine.head.cam_intake_lift && (
                    <div>
                      <span className="text-muted-foreground">Cam Lift (Int/Exh)</span>
                      <p className="font-medium">{activeEngine.head.cam_intake_lift}" / {activeEngine.head.cam_exhaust_lift || "—"}"</p>
                    </div>
                  )}
                  {activeEngine.head.spring_type && (
                    <div>
                      <span className="text-muted-foreground">Spring Type</span>
                      <p className="font-medium capitalize">{activeEngine.head.spring_type}</p>
                    </div>
                  )}
                  {activeEngine.head.head_gasket_thickness && (
                    <div>
                      <span className="text-muted-foreground">Gasket Thickness</span>
                      <p className="font-medium">{activeEngine.head.head_gasket_thickness}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Induction Data */}
          {activeEngine?.induction && (Object.values(activeEngine.induction).some(v => v != null)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Induction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {activeEngine.induction.type && (
                    <div>
                      <span className="text-muted-foreground">Type</span>
                      <p className="font-medium">{activeEngine.induction.type}</p>
                    </div>
                  )}
                  {activeEngine.induction.carb_make && (
                    <div>
                      <span className="text-muted-foreground">Carburetor</span>
                      <p className="font-medium">{activeEngine.induction.carb_make} {activeEngine.induction.carb_model || ""}</p>
                    </div>
                  )}
                  {activeEngine.induction.intake_manifold_pn && (
                    <div>
                      <span className="text-muted-foreground">Intake Manifold P/N</span>
                      <p className="font-medium font-mono">{activeEngine.induction.intake_manifold_pn}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clearance Data */}
          {activeEngine?.clearances && (Object.values(activeEngine.clearances).some(v => v != null)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bearing Clearances & Tolerances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left py-2 px-3 font-semibold">Specification</th>
                        <th className="text-right py-2 px-3 font-semibold">Min</th>
                        <th className="text-right py-2 px-3 font-semibold">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEngine.clearances.main_journal && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Main Journal Diameter</td>
                          <td className="text-right py-2 px-3 font-mono" colSpan={2}>{activeEngine.clearances.main_journal}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.rod_journal && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Rod Journal Diameter</td>
                          <td className="text-right py-2 px-3 font-mono" colSpan={2}>{activeEngine.clearances.rod_journal}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.main_clearance_min != null && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Main Bearing Clearance</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.main_clearance_min}"</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.main_clearance_max}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.rod_clearance_min != null && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Rod Bearing Clearance</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.rod_clearance_min}"</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.rod_clearance_max}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.piston_wall_min != null && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Piston-to-Wall Clearance</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.piston_wall_min}"</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.piston_wall_max}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.crank_endplay_min != null && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Crankshaft Endplay</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.crank_endplay_min}"</td>
                          <td className="text-right py-2 px-3 font-mono">{activeEngine.clearances.crank_endplay_max}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.ring_gap_top && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Ring End Gap (Top)</td>
                          <td className="text-right py-2 px-3 font-mono" colSpan={2}>{activeEngine.clearances.ring_gap_top}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.ring_gap_second && (
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Ring End Gap (Second)</td>
                          <td className="text-right py-2 px-3 font-mono" colSpan={2}>{activeEngine.clearances.ring_gap_second}"</td>
                        </tr>
                      )}
                      {activeEngine.clearances.ring_gap_oil && (
                        <tr>
                          <td className="py-2 px-3 font-medium">Ring End Gap (Oil)</td>
                          <td className="text-right py-2 px-3 font-mono" colSpan={2}>{activeEngine.clearances.ring_gap_oil}"</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Source: Clevite 77 catalog / factory service manual. Always verify against your specific casting and application.</p>
              </CardContent>
            </Card>
          )}

          {/* No torque specs message */}
          {activeEngine && !hasSpecs && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-lg">Torque specs for this engine are still being verified.</p>
                <p className="text-sm mt-2">We require a minimum of two independent sources before publishing torque data. Check back soon.</p>
              </CardContent>
            </Card>
          )}

          {/* Torque specs coming soon */}
          {activeEngine && (
            <Card className="border-dashed border-[#E85D04]/30">
              <CardContent className="py-8 text-center">
                <p className="text-lg font-semibold text-[#1a1a1a] mb-2">Torque Specifications — Coming Soon</p>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  We are actively collecting and cross-referencing torque data from multiple independent sources. Torque specs will be published here once they meet our two-source verification threshold.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Torque table hidden — will be re-enabled when data is verified */}
        </div>
      </section>

      {/* Educational Content */}
      <section className="bg-white border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Understanding Engine Specifications</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
              <p>
                Engine specifications are the foundational measurements that define an engine's identity and performance potential. Bore is the diameter of each cylinder, stroke is the distance the piston travels from bottom dead center to top dead center, and together they determine displacement — the total volume swept by all pistons. A Chevy 350 small block, for example, has a 4.000" bore and 3.480" stroke, giving it 350 cubic inches of displacement. The Ford 302 Windsor uses a smaller 4.000" bore with a shorter 3.000" stroke, while the LS1 5.7L uses a 3.898" bore with a 3.622" stroke. These dimensions aren't just catalog numbers — they determine which pistons, rings, and gaskets fit, what compression ratio is achievable, and how the engine will behave across the RPM range.
              </p>
              <p>
                Compression ratio is the relationship between the cylinder's total volume at bottom dead center and its clearance volume at top dead center. It is calculated from bore, stroke, head chamber volume, piston dish or dome volume, gasket thickness, and deck height. A higher compression ratio extracts more energy from each combustion event, producing more power and efficiency, but also increases the engine's tendency to detonate on lower-octane fuel. Most naturally aspirated street engines run between 9.0:1 and 10.5:1 on pump gas. Forced induction builds typically run lower — 8.5:1 to 9.5:1 — to provide a safety margin against boost-induced detonation. Understanding how each variable contributes to the final ratio is essential when selecting parts for a build.
              </p>
              <p>
                Cylinder head specifications tell you as much about an engine's character as the block dimensions. Chamber volume (measured in cc) directly affects compression ratio — smaller chambers raise compression, larger chambers lower it. The SBC 350 came with heads ranging from 64cc (high-compression) to 76cc (smog-era) chambers. Valve sizes determine airflow potential: a stock SBC 350 uses 1.94" intake and 1.50" exhaust valves, while performance heads might use 2.02" intakes and 1.60" exhausts. Rocker ratio is the mechanical advantage of the rocker arm — a 1.5:1 rocker on a cam with 0.350" lobe lift produces 0.525" valve lift at the valve. Higher-ratio rockers (1.6:1 or 1.7:1) are a common upgrade that increases valve lift without changing the camshaft. Head flow, valve size, and rocker ratio all interact to determine how efficiently the engine breathes.
              </p>
              <p>
                The bore-to-stroke ratio reveals an engine's fundamental character. An "oversquare" engine (bore larger than stroke, like the Ford 302 at 1.333:1) favors high RPM because the shorter stroke means lower piston speed at any given RPM, allowing the engine to rev higher before mechanical limits are reached. An "undersquare" engine (stroke longer than bore, like a 400 SBC at 0.940:1) generates more torque at lower RPM because the longer stroke creates a longer lever arm on the crankshaft. Most performance street engines aim for a ratio near 1.0:1, which provides a balanced combination of torque and RPM capability. The LS1 at 1.076:1 is close to square, which is one reason the LS platform is known for making power across a broad RPM range.
              </p>
              <p>
                Verified data matters because engine specifications varied significantly across production years, casting numbers, and applications — even within the same engine family. A 1970 LT-1 350 and a 1975 L48 350 share the same displacement but have completely different heads, compression ratios, and power output. Our database cross-references multiple independent sources before publishing any specification to ensure accuracy. The VIN decoder feature on this page uses the NHTSA database to identify your exact engine from the vehicle identification number, which narrows down the year, displacement, and engine code so you can find the correct specifications for your specific application rather than relying on generic data for the engine family.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
