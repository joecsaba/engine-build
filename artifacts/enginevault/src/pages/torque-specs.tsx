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

interface Engine {
  engine_id: string;
  year: number | null;
  displacement_ci: number | null;
  displacement_l: number | null;
  num_cylinders: number | null;
  bore_in: number | null;
  stroke_in: number | null;
  compression_ratio: number | null;
  advertised_hp: number | null;
  fuel_type: string | null;
  block_material: string | null;
  head_material: string | null;
  valvetrain: string | null;
  vehicles: Vehicle[];
  variants: Variant[];
  torque_specs: TorqueSpec[] | null;
  head: Record<string, unknown> | null;
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
        title="Engine Data — Engine-Build.com"
        description="Engine specifications, head data, and torque specs for 2,400+ engines across 36 manufacturers. Look up bore, stroke, compression ratio, HP, and more. VIN decoder included."
        canonical="/engine-data"
        keywords="engine specs, engine data, engine specifications lookup, bore stroke, compression ratio, torque specs, engine database"
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

          {/* No torque specs message */}
          {activeEngine && !hasSpecs && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-lg">Torque specs for this engine are still being verified.</p>
                <p className="text-sm mt-2">We require a minimum of two independent sources before publishing torque data. Check back soon.</p>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer - shown at top of specs area */}
          {activeEngine && hasSpecs && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              <strong>Disclaimer:</strong> {DISCLAIMER_TEXT}
            </div>
          )}

          {/* Torque specs section */}
          {activeEngine && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 flex items-start gap-3">
              <span className="text-blue-500 text-lg leading-none mt-0.5">&#9432;</span>
              <p>Torque specifications are still under development. We are actively collecting and cross-referencing data from multiple sources to ensure accuracy. Thank you for your patience as we build out this section.</p>
            </div>
          )}

          {activeEngine && hasSpecs && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Torque Specifications</CardTitle>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setUnits("ftlbs")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${units === "ftlbs" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-muted-foreground hover:text-[#1a1a1a]"}`}
                  >
                    ft-lbs
                  </button>
                  <button
                    onClick={() => setUnits("nm")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${units === "nm" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-muted-foreground hover:text-[#1a1a1a]"}`}
                  >
                    Nm
                  </button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-3 px-3 font-semibold">Component</th>
                      <th className="text-right py-3 px-3 font-semibold whitespace-nowrap">{units === "ftlbs" ? "ft-lbs" : "Nm"}</th>
                      <th className="text-left py-3 px-3 font-semibold">Lubricant</th>
                      <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Bolt Type</th>
                      <th className="text-left py-3 px-3 font-semibold">Steps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs!.map((spec) => {
                      const isMultiStep = spec.steps.length > 1;
                      const singleStep = spec.steps[0];

                      return (
                        <tr key={spec.component} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3 font-medium">{spec.display_name}</td>

                          {!isMultiStep ? (
                            <td className="py-3 px-3 text-right tabular-nums font-semibold">
                              {units === "ftlbs"
                                ? (singleStep?.ft_lbs != null ? singleStep.ft_lbs : "\u2014")
                                : (singleStep?.nm != null ? singleStep.nm : "\u2014")}
                            </td>
                          ) : (
                            <td className="py-3 px-3 text-right text-muted-foreground text-xs">multi-step</td>
                          )}

                          <td className="py-3 px-3 capitalize">{spec.lubricant ?? "\u2014"}</td>
                          <td className="py-3 px-3 whitespace-nowrap">{formatBoltType(spec.bolt_type)}</td>

                          <td className="py-3 px-3">
                            {!isMultiStep && singleStep?.angle != null && (
                              <span className="text-[#E85D04] font-medium">+ {singleStep.angle}&deg;</span>
                            )}
                            {!isMultiStep && singleStep?.angle == null && "\u2014"}
                            {isMultiStep && (
                              <div className="space-y-1">
                                {spec.steps.map((s) => (
                                  <div key={s.step} className="flex items-baseline gap-1.5">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E85D04]/10 text-[#E85D04] text-xs font-bold shrink-0">
                                      {s.step}
                                    </span>
                                    <span className="text-xs">
                                      {units === "ftlbs"
                                        ? (s.ft_lbs != null ? `${s.ft_lbs} ft-lbs` : "")
                                        : (s.nm != null ? `${s.nm} Nm` : "")}
                                      {s.angle != null ? ` + ${s.angle}\u00B0` : ""}
                                      {s.notes ? ` (${s.notes})` : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
