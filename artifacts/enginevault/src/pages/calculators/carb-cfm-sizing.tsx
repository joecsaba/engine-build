import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { ChevronDown, AlertTriangle, Info, Lightbulb, Gauge, Calculator } from "lucide-react";

// ── Available carb sizes (real Holley / Edelbrock catalog sizes) ──────
// Verified against current Holley, Edelbrock, and Demon catalogs.
// 735 removed (no real product). 770, 870, 1150 added (Holley Street Avenger / Dominator).
const CARB_SIZES = [390, 450, 500, 525, 570, 600, 650, 670, 700, 750, 770, 780, 800, 830, 850, 870, 950, 1050, 1150];

// ── Vizard Correction Factor data ────────────────────────────────────
// Calibrated from David Vizard's published worked examples in
// "How to Super Tune and Modify Holley Carburetors":
//   - 482ci, race-ported heads, 248° cam → CF=1.065
//   - 306ci, race-ported heads, 258° cam → CF=1.07
// Other head categories are scaled proportionally above/below the race baseline.
type VizardHeadType = "stock" | "pocket" | "street" | "race" | "toprace" | "prostock";

const VIZARD_HEAD_LABELS: Record<VizardHeadType, { label: string; desc: string }> = {
  stock:    { label: "Stock OE (pre-1990 design)",           desc: "Factory cast iron heads, no port work" },
  pocket:   { label: "Pocket-ported / Vortec / Aftermarket", desc: "Pocket-ported pre-1990 or stock Vortec/aftermarket aluminum heads" },
  street:   { label: "Street-ported heads",                  desc: "Professional street port job, good bowl work" },
  race:     { label: "Race-ported conventional heads",       desc: "Full race port — Dart Iron Eagle, AFR, similar" },
  toprace:  { label: "Top-of-the-line race-ported",          desc: "Best available race port — Dart Pro 1, Brodix Race-Rite, etc." },
  prostock: { label: "ProStock / NASCAR Cup heads",          desc: "Purpose-built pro-level castings — ProStock, Cup Car, etc." },
};

// CF = base + (camDuration - 220) * slope
// Derived by solving the two Vizard book examples simultaneously for "race" heads,
// then spacing other head types at proportional offsets.
const VIZARD_CF_DATA: Record<VizardHeadType, { base: number; slope: number }> = (() => {
  // From Vizard's book: race heads at 248° → CF=1.065, race heads at 258° → CF=1.07
  // Solving: base + 28*slope = 1.065, base + 38*slope = 1.07 → slope=0.0005, base=1.051
  const raceBase = 1.051;
  const raceSlope = 0.0005;
  return {
    stock:    { base: raceBase - 0.18, slope: raceSlope * 0.7 },
    pocket:   { base: raceBase - 0.12, slope: raceSlope * 0.8 },
    street:   { base: raceBase - 0.06, slope: raceSlope * 0.9 },
    race:     { base: raceBase,        slope: raceSlope },
    toprace:  { base: raceBase + 0.06, slope: raceSlope * 1.1 },
    prostock: { base: raceBase + 0.12, slope: raceSlope * 1.2 },
  };
})();

function vizardCorrectionFactor(camDuration050: number, headType: VizardHeadType): number {
  const data = VIZARD_CF_DATA[headType];
  const cf = data.base + (camDuration050 - 220) * data.slope;
  return Math.max(0.75, Math.min(1.20, cf));
}

function vizardCfmCalc(cid: number, peakPowerRpm: number, camDuration050: number, headType: VizardHeadType) {
  const rpm = peakPowerRpm + 200; // Vizard's rule: use peak power RPM + 200
  const cf = vizardCorrectionFactor(camDuration050, headType);
  const cfm = (cid * rpm * cf) / 3456;
  return { cfm, cf, rpm };
}

// ── Types ────────────────────────────────────────────────────────────
type VeMode = "vizard" | "preset" | "advanced";
type BuildLevel = "stock" | "mild" | "hot" | "race" | "custom";
type IntakeStyle = "single4" | "dualquad" | "single2";
type IntendedUse = "street" | "streetstrip" | "race";
type IntakeManifold = "stock" | "dualplane" | "singleplane" | "tunnelram" | "ir";
type ExhaustType = "manifolds" | "shorty" | "longtube" | "longtube_large";
type ValvesPerCyl = "2" | "3" | "4";

// ── Build level presets ──────────────────────────────────────────────
const BUILD_LEVELS: { value: BuildLevel; label: string; ve: number; desc: string }[] = [
  { value: "stock", label: "Stock / unmodified", ve: 0.80, desc: "Factory cam, heads, intake, exhaust manifolds" },
  { value: "mild", label: "Mild street (bolt-ons)", ve: 0.85, desc: "Headers, mild cam, intake, stock heads" },
  { value: "hot", label: "Hot street (heads & cam)", ve: 0.90, desc: "Aftermarket heads, cam, intake" },
  { value: "race", label: "Full race (ported, solid cam)", ve: 0.95, desc: "Ported heads, big cam, built bottom end" },
  { value: "custom", label: "Custom VE%", ve: 0.85, desc: "Enter your own VE percentage" },
];

// ── Intake manifold VE modifiers ─────────────────────────────────────
// These are additive adjustments vs a stock 2-barrel/4-barrel log manifold.
// Based on common dyno test data — a single plane adds top-end VE but
// hurts low-RPM signal; a tunnel ram is similar but more extreme.
const INTAKE_VE_ADJUST: Record<IntakeManifold, { adj: number; rpmBias: "low" | "mid" | "top"; label: string; desc: string }> = {
  stock:       { adj: 0,     rpmBias: "low",  label: "Stock / OE",                    desc: "Factory intake (log-style, heat crossover)" },
  dualplane:   { adj: 0.02,  rpmBias: "mid",  label: "Dual-plane performance",        desc: "Edelbrock Performer, Weiand Stealth — good signal, broad torque" },
  singleplane: { adj: 0.04,  rpmBias: "top",  label: "Single-plane (open plenum)",    desc: "Edelbrock Victor, Holley Strip Dominator — best top-end flow" },
  tunnelram:   { adj: 0.05,  rpmBias: "top",  label: "Tunnel ram",                    desc: "High-rise dual-carb — maximum top-end airflow" },
  ir:          { adj: 0.06,  rpmBias: "top",  label: "Individual runners (IR / ITB)",  desc: "Weber/Hilborn style — maximum VE at tuned RPM" },
};

// ── Exhaust VE modifiers ─────────────────────────────────────────────
// Exhaust restriction is a major VE killer on stock engines. Headers
// improve scavenging and reversion pulse timing.
const EXHAUST_VE_ADJUST: Record<ExhaustType, { adj: number; label: string; desc: string }> = {
  manifolds:     { adj: 0,     label: "Cast iron manifolds",       desc: "Factory exhaust manifolds — restrictive" },
  shorty:        { adj: 0.02,  label: "Shorty headers",            desc: "Block-hugger / shorty — modest improvement" },
  longtube:      { adj: 0.04,  label: "Long-tube headers",         desc: 'Standard 1-5/8" to 1-3/4" primaries — good scavenging' },
  longtube_large:{ adj: 0.06,  label: "Long-tube (large primary)", desc: '1-7/8"+ primaries — race-oriented, best top-end' },
};

// ── Base VE from valve count (same model as turbo-finder) ────────────
const VE_BASE: Record<string, number> = {
  "2": 0.80,
  "3": 0.88,
  "4": 0.92,
};

// ── Cam duration → VE bonus (piecewise, same as turbo-finder) ────────
// Stock ~190° = 0%, mild 210° = +2%, moderate 224° = +5%,
// hot 236° = +7%, race 252° = +10%
function camVeBonus(dur050: number): number {
  if (dur050 <= 190) return 0;
  if (dur050 <= 210) return ((dur050 - 190) / 20) * 0.02;
  if (dur050 <= 224) return 0.02 + ((dur050 - 210) / 14) * 0.03;
  if (dur050 <= 236) return 0.05 + ((dur050 - 224) / 12) * 0.02;
  if (dur050 <= 252) return 0.07 + ((dur050 - 236) / 16) * 0.03;
  return 0.10;
}

// ── LSA → VE adjustment ──────────────────────────────────────────────
// Tighter LSA = more overlap = better scavenging at high RPM but
// worse idle quality and low-RPM VE. Standard street LSA is 112-114°.
// Race engines run 106-110°. This is a small adjustment factor.
function lsaVeAdjust(lsa: number): number {
  // Baseline = 112° (typical street performance)
  // Wider LSA (114-116) = slightly less peak VE, better idle
  // Tighter LSA (106-110) = slightly more peak VE, rough idle
  if (lsa >= 116) return -0.01;
  if (lsa >= 114) return 0;
  if (lsa >= 112) return 0.005;
  if (lsa >= 110) return 0.01;
  if (lsa >= 108) return 0.015;
  return 0.02; // very tight, race-only
}

// ── Head flow → derived VE ───────────────────────────────────────────
// If someone has flow bench data, this is much more accurate than presets.
// VE ≈ (headFlowCfm × cylinders × correction) / ((CID × RPM) / 3456)
// The correction accounts for valve open time vs steady-state bench flow.
function deriveVeFromHeadFlow(
  headFlowCfm: number,
  testPressure: number,
  cid: number,
  rpm: number,
  cylinders: number,
): number {
  // Normalize to 28" H2O test pressure (industry standard)
  const correctedFlow = headFlowCfm * Math.sqrt(28 / testPressure);
  const maxTheoreticalCfm = (cid * rpm) / 3456;
  if (maxTheoreticalCfm <= 0) return 0.85;
  const headCapacityCfm = correctedFlow * cylinders;
  // Head flow at steady state overstates what the engine actually uses because
  // the valve isn't at max lift for the entire intake stroke. Typical ratio of
  // actual engine airflow to theoretical head capacity is 0.45-0.55 depending
  // on cam timing (longer duration = closer to 0.55).
  const flowRatio = headCapacityCfm / maxTheoreticalCfm;
  const ve = flowRatio * 0.50;
  return Math.max(0.65, Math.min(1.05, ve));
}

// ── Altitude density correction ──────────────────────────────────────
// Air density drops ~3% per 1000 ft. A carb sized at sea level will be
// oversized at altitude because the air is thinner.
function altitudeDensityRatio(altFt: number): number {
  // Standard atmosphere: pressure ratio = (1 - 0.0000068753 × alt)^5.2559
  // Density also drops with temp, but pressure is the dominant factor.
  return Math.pow(1 - 0.0000068753 * altFt, 5.2559);
}

// ── Helpers ──────────────────────────────────────────────────────────

function findNearestCarb(cfm: number, biasDown: boolean): number {
  if (cfm <= CARB_SIZES[0]) return CARB_SIZES[0];
  if (cfm >= CARB_SIZES[CARB_SIZES.length - 1]) return CARB_SIZES[CARB_SIZES.length - 1];
  let closest = CARB_SIZES[0];
  let closestDiff = Math.abs(cfm - closest);
  for (const size of CARB_SIZES) {
    const diff = Math.abs(cfm - size);
    if (biasDown) {
      if (size <= cfm) { closest = size; closestDiff = diff; }
      else if (diff < closestDiff * 0.3) { closest = size; closestDiff = diff; }
    } else {
      if (diff < closestDiff) { closest = size; closestDiff = diff; }
    }
  }
  return closest;
}

function getNextSizeDown(size: number): number | null {
  const idx = CARB_SIZES.indexOf(size);
  return idx > 0 ? CARB_SIZES[idx - 1] : null;
}

function getUseFactor(use: IntendedUse): { min: number; max: number; label: string } {
  switch (use) {
    case "street": return { min: 0.90, max: 0.95, label: "90-95%" };
    case "streetstrip": return { min: 0.95, max: 1.00, label: "95-100%" };
    case "race": return { min: 1.00, max: 1.05, label: "100%+" };
  }
}

function pct(v: number): string { return (v * 100).toFixed(1) + "%"; }

// ── Component ────────────────────────────────────────────────────────

export default function CarbCfmSizingCalculator() {
  // Build context
  const [savedDisplacement] = useBuildField("computed.displacement", "");
  const { activeBuild, setField } = useBuildContext();

  // ── Core inputs ────────────────────────────────────────────────────
  const [displacementUnit, setDisplacementUnit] = useState<"ci" | "liters">("ci");
  const [displacement, setDisplacement] = useState(savedDisplacement || "350");
  const [rpm, setRpm] = useState("5500");
  const [cylinders, setCylinders] = useState("8");
  const [intakeStyle, setIntakeStyle] = useState<IntakeStyle>("single4");
  const [intendedUse, setIntendedUse] = useState<IntendedUse>("street");

  // ── VE mode toggle ─────────────────────────────────────────────────
  const [veMode, setVeMode] = useState<VeMode>("vizard");

  // ── Vizard mode inputs ─────────────────────────────────────────────
  const [vizardCam, setVizardCam] = useState("");
  const [vizardHeadType, setVizardHeadType] = useState<VizardHeadType>("race");

  // Preset mode
  const [buildLevel, setBuildLevel] = useState<BuildLevel>("mild");
  const [customVe, setCustomVe] = useState(85);

  // Advanced mode inputs
  const [valvesPerCyl, setValvesPerCyl] = useState<ValvesPerCyl>("2");
  const [camDuration050, setCamDuration050] = useState("");
  const [camLsa, setCamLsa] = useState("");
  const [headFlowCfm, setHeadFlowCfm] = useState("");
  const [headTestPressure, setHeadTestPressure] = useState("28");
  const [intakeManifold, setIntakeManifold] = useState<IntakeManifold>("dualplane");
  const [exhaustType, setExhaustType] = useState<ExhaustType>("manifolds");
  const [altitude, setAltitude] = useState("0");

  // Collapsible sections
  const [educationOpen, setEducationOpen] = useState(false);
  const [combosOpen, setCombosOpen] = useState(false);

  // Sync displacement from build context
  useEffect(() => {
    if (savedDisplacement && parseFloat(savedDisplacement) > 0) {
      setDisplacement(savedDisplacement);
      setDisplacementUnit("ci");
    }
  }, [savedDisplacement]);

  // ── Parse inputs ───────────────────────────────────────────────────
  const rawDisp = parseFloat(displacement) || 0;
  const cid = displacementUnit === "liters" ? rawDisp * 61.024 : rawDisp;
  const rpmVal = parseFloat(rpm) || 0;
  const cylVal = parseInt(cylinders) || 8;
  const altVal = parseFloat(altitude) || 0;
  const camDur = camDuration050 ? parseFloat(camDuration050) : null;
  const lsa = camLsa ? parseFloat(camLsa) : null;
  const headFlow = headFlowCfm ? parseFloat(headFlowCfm) : null;
  const headTestP = parseFloat(headTestPressure) || 28;

  // ── Calculate VE ───────────────────────────────────────────────────
  // VE breakdown for display
  type VeBreakdown = {
    base: number;
    baseSource: string;
    camAdj: number | null;
    lsaAdj: number | null;
    intakeAdj: number;
    exhaustAdj: number;
    headFlowDerived: boolean;
    final: number;
  };

  let veBreakdown: VeBreakdown;

  if (veMode === "preset") {
    const levelDef = BUILD_LEVELS.find(l => l.value === buildLevel)!;
    const baseVe = buildLevel === "custom" ? customVe / 100 : levelDef.ve;
    veBreakdown = {
      base: baseVe,
      baseSource: buildLevel === "custom" ? "Custom" : levelDef.label,
      camAdj: null,
      lsaAdj: null,
      intakeAdj: 0,
      exhaustAdj: 0,
      headFlowDerived: false,
      final: baseVe,
    };
  } else {
    // Advanced mode: build VE from parts
    let base: number;
    let baseSource: string;
    let headFlowDerived = false;

    if (headFlow && headFlow > 0 && cid > 0 && rpmVal > 0) {
      // Head flow data overrides base VE — most accurate method
      base = deriveVeFromHeadFlow(headFlow, headTestP, cid, rpmVal, cylVal);
      baseSource = `Head flow (${headFlow} CFM @ ${headTestP}" H2O)`;
      headFlowDerived = true;
    } else {
      // Start from valves-per-cylinder baseline
      base = VE_BASE[valvesPerCyl] ?? 0.80;
      baseSource = `${valvesPerCyl}-valve baseline`;
    }

    const camAdj = camDur && camDur > 0 ? camVeBonus(camDur) : null;
    const lsaAdj = lsa && lsa > 0 ? lsaVeAdjust(lsa) : null;
    const intakeAdj = INTAKE_VE_ADJUST[intakeManifold].adj;
    const exhaustAdj = EXHAUST_VE_ADJUST[exhaustType].adj;

    let finalVe = base;
    // If VE was derived from head flow, cam/intake/exhaust are already
    // baked into the flow bench number to some degree. Apply reduced
    // adjustments for intake and exhaust (the head was tested on a bench,
    // not on the actual manifold), and still apply cam adjustment since
    // cam timing isn't reflected in steady-state flow bench data.
    if (headFlowDerived) {
      if (camAdj !== null) finalVe += camAdj;
      if (lsaAdj !== null) finalVe += lsaAdj;
      // Intake and exhaust still matter but at reduced impact since
      // flow bench data already captures port efficiency
      finalVe += intakeAdj * 0.5;
      finalVe += exhaustAdj * 0.5;
    } else {
      if (camAdj !== null) finalVe += camAdj;
      if (lsaAdj !== null) finalVe += lsaAdj;
      finalVe += intakeAdj;
      finalVe += exhaustAdj;
    }

    // Some well-developed NA race engines exceed 100% VE through tuned-runner
    // resonance effects (ram tuning, acoustic wave tuning). Cap at 105%.
    finalVe = Math.max(0.65, Math.min(1.05, finalVe));

    veBreakdown = {
      base,
      baseSource,
      camAdj: headFlowDerived ? camAdj : camAdj,
      lsaAdj,
      intakeAdj: headFlowDerived ? intakeAdj * 0.5 : intakeAdj,
      exhaustAdj: headFlowDerived ? exhaustAdj * 0.5 : exhaustAdj,
      headFlowDerived,
      final: finalVe,
    };
  }

  const ve = veBreakdown.final;

  // ── Vizard mode calculation ────────────────────────────────────────
  const vizardCamVal = vizardCam ? parseFloat(vizardCam) : 0;
  const vizardResult = vizardCamVal > 0 && cid > 0 && rpmVal > 0
    ? vizardCfmCalc(cid, rpmVal, vizardCamVal, vizardHeadType)
    : null;

  // ── CFM Calculation ────────────────────────────────────────────────
  // CFM = (CID x RPM x VE) / 3456
  const calculatedCfm = veMode === "vizard"
    ? (vizardResult?.cfm ?? 0)
    : (cid * rpmVal * ve) / 3456;

  // Altitude correction: thinner air means the engine breathes less,
  // so the carb should be sized for actual air density, not sea level.
  const densityRatio = altitudeDensityRatio(altVal);
  const altCorrectedCfm = calculatedCfm * densityRatio;
  const useAltCorrection = veMode === "advanced" && altVal > 500;
  const effectiveCalculatedCfm = useAltCorrection ? altCorrectedCfm : calculatedCfm;

  // Adjust for intake style
  let effectiveCfm = effectiveCalculatedCfm;
  if (intakeStyle === "single2") {
    effectiveCfm = effectiveCalculatedCfm / 0.707;
  }

  // Apply use factor for recommendation
  const useFactor = getUseFactor(intendedUse);
  const recommendedCfm = effectiveCalculatedCfm * ((useFactor.min + useFactor.max) / 2);

  // For dual-quad, each carb handles half
  const dualQuadPerCarb = effectiveCalculatedCfm / 2;

  // Find nearest carb sizes
  const biasDown = intendedUse === "street";
  let recommendedSize: number;
  let dualQuadSize: number;

  if (intakeStyle === "dualquad") {
    recommendedSize = findNearestCarb(dualQuadPerCarb, biasDown);
    dualQuadSize = recommendedSize;
  } else if (intakeStyle === "single2") {
    recommendedSize = findNearestCarb(effectiveCfm, biasDown);
    dualQuadSize = findNearestCarb(dualQuadPerCarb, biasDown);
  } else {
    recommendedSize = findNearestCarb(recommendedCfm, biasDown);
    dualQuadSize = findNearestCarb(dualQuadPerCarb, biasDown);
  }

  const streetAlternative = getNextSizeDown(recommendedSize);
  const valid = cid > 0 && rpmVal > 0 && (veMode !== "vizard" || vizardCamVal > 0);

  // Head flow per cylinder demand — useful sanity check
  const cfmPerCyl = valid ? effectiveCalculatedCfm / cylVal : 0;

  // Write result to build context
  useEffect(() => {
    if (activeBuild && valid && effectiveCalculatedCfm > 0) {
      setField("computed.carbCfm", effectiveCalculatedCfm.toFixed(0));
    }
  }, [effectiveCalculatedCfm, activeBuild?.id]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Carburetor CFM Calculator | What Size Carb Do I Need?"
        description="Calculate the right carburetor size for your engine. Estimates VE from cam duration, head flow, intake, and exhaust data. Real carb sizes from Holley and Edelbrock."
        canonical="/calculators/carb-cfm-sizing"
        keywords="carburetor sizing calculator, carb CFM calculator, what size carb do I need, Holley carburetor size, 4 barrel carb calculator, carb sizing from cam specs"
      />

      <h1 className="text-3xl font-bold mb-2">Carburetor / CFM Sizing Calculator</h1>
      <p className="text-muted-foreground mb-6">
        Size your carburetor using David Vizard's correction-factor method (simplest — just needs cam
        duration and head type), a quick build-level estimate, or the advanced parts-based VE calculator.
      </p>

      {/* ── VE Mode Toggle ─────────────────────────────────────────── */}
      <div className="flex rounded-lg border overflow-hidden mb-8">
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            veMode === "vizard" ? "bg-[#E85D04] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setVeMode("vizard")}
        >
          Simple — Vizard Method
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            veMode === "preset" ? "bg-[#E85D04] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setVeMode("preset")}
        >
          Quick — Build Level
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            veMode === "advanced" ? "bg-[#E85D04] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setVeMode("advanced")}
        >
          Advanced — Parts
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── LEFT: Inputs ──────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Core Engine Specs */}
          <Card>
            <CardHeader>
              <CardTitle>Engine Specs</CardTitle>
              <CardDescription>Basic engine data for the CFM formula.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Displacement */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Engine Displacement</Label>
                  <div className="flex rounded-md border overflow-hidden text-xs">
                    <button
                      className={`px-2 py-1 transition-colors ${displacementUnit === "ci" ? "bg-[#E85D04] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                      onClick={() => {
                        if (displacementUnit === "liters") {
                          const ci = (parseFloat(displacement) || 0) * 61.024;
                          setDisplacement(ci > 0 ? ci.toFixed(0) : "");
                          setDisplacementUnit("ci");
                        }
                      }}
                    >
                      CID
                    </button>
                    <button
                      className={`px-2 py-1 transition-colors ${displacementUnit === "liters" ? "bg-[#E85D04] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                      onClick={() => {
                        if (displacementUnit === "ci") {
                          const liters = (parseFloat(displacement) || 0) / 61.024;
                          setDisplacement(liters > 0 ? liters.toFixed(1) : "");
                          setDisplacementUnit("liters");
                        }
                      }}
                    >
                      Liters
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  step={displacementUnit === "ci" ? "1" : "0.1"}
                  value={displacement}
                  onChange={(e) => setDisplacement(e.target.value)}
                  placeholder={displacementUnit === "ci" ? "350" : "5.7"}
                />
              </div>

              {/* RPM */}
              <div className="space-y-2">
                <Label>Peak Power RPM</Label>
                <Input
                  type="number"
                  step="100"
                  value={rpm}
                  onChange={(e) => setRpm(e.target.value)}
                  placeholder="5500"
                />
                <p className="text-xs text-muted-foreground">
                  {veMode === "vizard"
                    ? "Your target power peak — Vizard's method adds +200 RPM automatically."
                    : "Your target power peak, not your redline."}
                </p>
              </div>

              {/* Cylinders */}
              <div className="space-y-2">
                <Label>Cylinders</Label>
                <Select value={cylinders} onValueChange={setCylinders}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 cylinder</SelectItem>
                    <SelectItem value="6">6 cylinder</SelectItem>
                    <SelectItem value="8">8 cylinder</SelectItem>
                    <SelectItem value="10">10 cylinder</SelectItem>
                    <SelectItem value="12">12 cylinder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ── Vizard Mode ────────────────────────────────────────── */}
          {veMode === "vizard" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Vizard Correction Factor
                </CardTitle>
                <CardDescription>
                  David Vizard's method uses cam duration and cylinder head quality to determine a
                  single correction factor (CF) — no guessing at VE%. From his book
                  "How to Super Tune and Modify Holley Carburetors".
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted/50 px-4 py-3 text-center font-mono text-sm">
                  CFM = (CID &times; (Peak RPM + 200) &times; CF) &divide; 3,456
                </div>
                <div className="space-y-2">
                  <Label>Cam Duration at .050" Lift (degrees)</Label>
                  <Input
                    type="number"
                    step="2"
                    min="180"
                    max="280"
                    placeholder="e.g. 224"
                    value={vizardCam}
                    onChange={(e) => setVizardCam(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    From your cam card — stock ~190°, mild street ~210°, hot street ~230°, race ~248°+
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Cylinder Head Type</Label>
                  <Select value={vizardHeadType} onValueChange={(v) => setVizardHeadType(v as VizardHeadType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(VIZARD_HEAD_LABELS) as [VizardHeadType, { label: string; desc: string }][]).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {VIZARD_HEAD_LABELS[vizardHeadType].desc}
                  </p>
                </div>
                {vizardCam && parseFloat(vizardCam) > 0 && (
                  <div className="rounded-md border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Correction Factor (CF)</p>
                    <p className="text-2xl font-bold">
                      {vizardCorrectionFactor(parseFloat(vizardCam), vizardHeadType).toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {vizardCam}° cam with {VIZARD_HEAD_LABELS[vizardHeadType].label.toLowerCase()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── VE: Preset Mode ──────────────────────────────────── */}
          {veMode === "preset" && (
            <Card>
              <CardHeader>
                <CardTitle>Build Level</CardTitle>
                <CardDescription>Quick VE estimate based on general build level.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Select value={buildLevel} onValueChange={(v) => setBuildLevel(v as BuildLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILD_LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label} {l.value !== "custom" && `(${(l.ve * 100).toFixed(0)}% VE)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {buildLevel !== "custom" && (
                    <p className="text-xs text-muted-foreground">
                      {BUILD_LEVELS.find(l => l.value === buildLevel)?.desc}
                    </p>
                  )}

                  {buildLevel === "custom" && (
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Volumetric Efficiency</span>
                        <span className="font-medium text-foreground">{customVe}%</span>
                      </div>
                      <Slider
                        value={[customVe]}
                        onValueChange={(v) => setCustomVe(v[0])}
                        min={65}
                        max={105}
                        step={1}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>65%</span>
                        <span>105%</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── VE: Advanced Mode ────────────────────────────────── */}
          {veMode === "advanced" && (
            <>
              {/* Cylinder Head */}
              <Card>
                <CardHeader>
                  <CardTitle>Cylinder Heads</CardTitle>
                  <CardDescription>
                    Head flow data gives the most accurate VE estimate. If you don't have flow
                    bench numbers, the calculator will estimate from your valve count and other parts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Valves per Cylinder</Label>
                    <Select value={valvesPerCyl} onValueChange={(v) => setValvesPerCyl(v as ValvesPerCyl)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2-valve (most pushrod V8s)</SelectItem>
                        <SelectItem value="3">3-valve (Ford 4.6 3V, etc.)</SelectItem>
                        <SelectItem value="4">4-valve (DOHC, LS7-style)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Intake Flow (CFM per port)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="50"
                        max="500"
                        placeholder="e.g. 220"
                        value={headFlowCfm}
                        onChange={(e) => setHeadFlowCfm(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Peak CFM from flow bench — leave blank if unknown
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Test Pressure</Label>
                      <Select value={headTestPressure} onValueChange={setHeadTestPressure}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10" H2O</SelectItem>
                          <SelectItem value="25">25" H2O</SelectItem>
                          <SelectItem value="28">28" H2O (standard)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Camshaft */}
              <Card>
                <CardHeader>
                  <CardTitle>Camshaft</CardTitle>
                  <CardDescription>
                    Cam duration and LSA directly affect how much air the engine can pull in.
                    Enter your cam card specs if you have them.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Intake Duration @ .050"</Label>
                      <Input
                        type="number"
                        step="2"
                        min="170"
                        max="280"
                        placeholder="e.g. 224"
                        value={camDuration050}
                        onChange={(e) => setCamDuration050(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        From cam card — stock ~190°, mild ~210°, hot ~230°, race ~250°
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Lobe Separation Angle (LSA)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="104"
                        max="118"
                        placeholder="e.g. 112"
                        value={camLsa}
                        onChange={(e) => setCamLsa(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Typical street 112-114° · race 106-110°
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Intake & Exhaust */}
              <Card>
                <CardHeader>
                  <CardTitle>Intake & Exhaust</CardTitle>
                  <CardDescription>
                    The intake manifold and exhaust system significantly affect how much air
                    actually reaches the cylinders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Intake Manifold</Label>
                    <Select value={intakeManifold} onValueChange={(v) => setIntakeManifold(v as IntakeManifold)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(INTAKE_VE_ADJUST).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {INTAKE_VE_ADJUST[intakeManifold].desc}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Exhaust</Label>
                    <Select value={exhaustType} onValueChange={(v) => setExhaustType(v as ExhaustType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXHAUST_VE_ADJUST).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {EXHAUST_VE_ADJUST[exhaustType].desc}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Altitude */}
              <Card>
                <CardHeader>
                  <CardTitle>Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Altitude (feet above sea level)</Label>
                    <Input
                      type="number"
                      step="500"
                      min="0"
                      max="12000"
                      placeholder="0"
                      value={altitude}
                      onChange={(e) => setAltitude(e.target.value)}
                    />
                    {altVal > 500 && (
                      <p className="text-xs text-muted-foreground">
                        Air density at {altVal.toLocaleString()} ft is {(densityRatio * 100).toFixed(1)}% of sea level.
                        Carb sizing will be adjusted for thinner air. You'll also need to re-jet
                        (roughly -1 jet size per 2,000 ft).
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Carburetor Options */}
          <Card>
            <CardHeader>
              <CardTitle>Carburetor Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Intake Style */}
              <div className="space-y-2">
                <Label>Intake Style</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "single4" as IntakeStyle, label: "Single 4-bbl" },
                    { value: "dualquad" as IntakeStyle, label: "Dual-quad" },
                    { value: "single2" as IntakeStyle, label: "Single 2-bbl" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        intakeStyle === opt.value
                          ? "bg-[#E85D04] text-white border-[#E85D04]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#E85D04]"
                      }`}
                      onClick={() => setIntakeStyle(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intended Use */}
              <div className="space-y-2">
                <Label>Intended Use</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "street" as IntendedUse, label: "Street / daily" },
                    { value: "streetstrip" as IntendedUse, label: "Street/strip" },
                    { value: "race" as IntendedUse, label: "Full race" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        intendedUse === opt.value
                          ? "bg-[#E85D04] text-white border-[#E85D04]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#E85D04]"
                      }`}
                      onClick={() => setIntendedUse(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Street use recommends {getUseFactor(intendedUse).label} of calculated CFM for better drivability.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────── */}
        <div className="space-y-4">
          {!valid && (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center text-muted-foreground">
                Enter your engine specs to see results.
              </CardContent>
            </Card>
          )}

          {valid && (
            <>
              {/* Primary Results */}
              <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm font-medium opacity-80">Calculated CFM</p>
                    <p className="text-4xl font-bold">{effectiveCalculatedCfm.toFixed(0)}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {veMode === "vizard" && vizardResult
                        ? `(${cid.toFixed(0)} CID × ${vizardResult.rpm} RPM × ${vizardResult.cf.toFixed(4)} CF) / 3456`
                        : `(${cid.toFixed(0)} CID × ${rpmVal} RPM × ${pct(ve)} VE) / 3456`}
                      {useAltCorrection && ` × ${(densityRatio * 100).toFixed(1)}% density`}
                    </p>
                    {veMode === "vizard" && vizardResult && (
                      <p className="text-xs opacity-70 mt-0.5">
                        Vizard method: Peak RPM + 200 = {vizardResult.rpm} · CF = {vizardResult.cf.toFixed(4)}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium opacity-80">
                      Recommended Carb Size
                      {intakeStyle === "dualquad" && " (each carb)"}
                    </p>
                    <p className="text-4xl font-bold">{recommendedSize} CFM</p>
                    {intakeStyle === "dualquad" && (
                      <p className="text-xs opacity-70 mt-1">
                        Two {recommendedSize} CFM carbs on a dual-quad / tunnel ram
                      </p>
                    )}
                  </div>

                  {intakeStyle !== "dualquad" && streetAlternative && intendedUse !== "race" && recommendedSize > 500 && (
                    <div className="border-t border-white/20 pt-4">
                      <p className="text-sm font-medium opacity-80">Street-Friendly Alternative</p>
                      <p className="text-2xl font-bold">{streetAlternative} CFM</p>
                      <p className="text-xs opacity-70 mt-1">
                        Better part-throttle drivability and fuel economy for street use
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── VE Breakdown (advanced mode) ─────────────────── */}
              {veMode === "advanced" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      VE Estimate Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{veBreakdown.baseSource}</span>
                        <span className="font-medium">{pct(veBreakdown.base)}</span>
                      </div>
                      {veBreakdown.camAdj !== null && veBreakdown.camAdj !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cam duration ({camDuration050}° @ .050")</span>
                          <span className="font-medium text-green-600">+{pct(veBreakdown.camAdj)}</span>
                        </div>
                      )}
                      {veBreakdown.lsaAdj !== null && veBreakdown.lsaAdj !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">LSA ({camLsa}°)</span>
                          <span className={`font-medium ${veBreakdown.lsaAdj >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {veBreakdown.lsaAdj >= 0 ? "+" : ""}{pct(veBreakdown.lsaAdj)}
                          </span>
                        </div>
                      )}
                      {veBreakdown.intakeAdj !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{INTAKE_VE_ADJUST[intakeManifold].label}</span>
                          <span className="font-medium text-green-600">+{pct(veBreakdown.intakeAdj)}</span>
                        </div>
                      )}
                      {veBreakdown.exhaustAdj !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{EXHAUST_VE_ADJUST[exhaustType].label}</span>
                          <span className="font-medium text-green-600">+{pct(veBreakdown.exhaustAdj)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                        <span>Estimated VE</span>
                        <span>{pct(ve)}</span>
                      </div>
                      {veBreakdown.headFlowDerived && (
                        <p className="text-xs text-muted-foreground mt-1">
                          VE derived from head flow data. Intake and exhaust adjustments are reduced
                          since the flow bench already captures port efficiency.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Secondary Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Carb Size Strip */}
                  <div>
                    <p className="text-sm font-medium mb-2">Available Carb Sizes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CARB_SIZES.map((size) => {
                        const isRecommended = size === recommendedSize;
                        const isAlt = size === streetAlternative && intendedUse !== "race";
                        return (
                          <span
                            key={size}
                            className={`px-2 py-1 text-xs rounded-md border font-medium ${
                              isRecommended
                                ? "bg-[#E85D04] text-white border-[#E85D04]"
                                : isAlt
                                ? "bg-[#E85D04]/10 text-[#E85D04] border-[#E85D04]/30"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}
                          >
                            {size}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-[#E85D04] inline-block" /> Recommended
                      </span>
                      {streetAlternative && intendedUse !== "race" && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-[#E85D04]/20 border border-[#E85D04]/30 inline-block" /> Street alternative
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Per-cylinder airflow */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Airflow per Cylinder</p>
                      <p className="text-lg font-bold">{cfmPerCyl.toFixed(1)} CFM</p>
                      <p className="text-xs text-muted-foreground">({cylVal} cylinders)</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{veMode === "vizard" ? "Correction Factor" : "VE Used"}</p>
                      <p className="text-lg font-bold">
                        {veMode === "vizard" && vizardResult ? vizardResult.cf.toFixed(4) : pct(ve)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {veMode === "vizard" ? "Vizard CF method" : veMode === "advanced" ? "from parts data" : "from build level"}
                      </p>
                    </div>
                  </div>

                  {/* Altitude correction */}
                  {useAltCorrection && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Altitude Correction</p>
                      <p className="text-sm">
                        Sea-level CFM: <span className="font-bold">{calculatedCfm.toFixed(0)}</span>
                        {" → "}At {altVal.toLocaleString()} ft: <span className="font-bold">{altCorrectedCfm.toFixed(0)}</span>
                        <span className="text-muted-foreground"> ({(densityRatio * 100).toFixed(1)}% air density)</span>
                      </p>
                    </div>
                  )}

                  {/* Dual-quad info (when single 4bbl selected) */}
                  {intakeStyle === "single4" && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">If You Ran Dual Quads</p>
                      <p className="text-sm">
                        Each carb: <span className="font-bold">{dualQuadPerCarb.toFixed(0)} CFM</span>
                        {" → "}nearest size: <span className="font-bold">{dualQuadSize} CFM</span> each
                      </p>
                    </div>
                  )}

                  {/* 2-barrel note */}
                  {intakeStyle === "single2" && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">2-Barrel Note</p>
                      <p className="text-sm text-muted-foreground">
                        2-barrel and 4-barrel carbs are rated at different test pressures (3.0" Hg vs 1.5" Hg).
                        A 2-barrel flows about 70.7% of an equivalently-rated 4-barrel (the square root of 2).
                        The recommended size above accounts for this conversion.
                      </p>
                    </div>
                  )}

                  {/* Head flow sanity check */}
                  {veMode === "advanced" && headFlowCfm && Number(headFlowCfm) > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Head Flow vs Demand</p>
                      <p className="text-sm">
                        Your heads flow <span className="font-bold">{headFlowCfm} CFM/port</span>.
                        At {rpmVal} RPM, each cylinder demands <span className="font-bold">{cfmPerCyl.toFixed(0)} CFM</span>.
                        {Number(headFlowCfm) < cfmPerCyl * 0.9 && (
                          <span className="text-yellow-700 font-medium"> Heads may be a bottleneck — consider porting or larger runners.</span>
                        )}
                        {Number(headFlowCfm) > cfmPerCyl * 1.5 && (
                          <span className="text-muted-foreground"> Heads have significant flow headroom at this RPM.</span>
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Warnings ────────────────────────────────────────── */}
              {effectiveCalculatedCfm > 850 && intendedUse === "street" && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Overcarburetion Warning</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        A {effectiveCalculatedCfm.toFixed(0)} CFM requirement is very large for street use. Carburetors
                        that are too big lose venturi signal strength at part throttle, causing lazy throttle
                        response, stumbling off idle, and poor fuel economy. Consider the street-friendly
                        alternative above, or verify that your RPM and build level are accurate.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rpmVal < 4500 && cid < 300 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex gap-2">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Consider a 2-Barrel</p>
                      <p className="text-sm text-blue-700 mt-1">
                        For a small-displacement engine under 4500 RPM, a 2-barrel carburetor often
                        provides better signal strength, crisper throttle response, and improved fuel
                        economy compared to a 4-barrel.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {ve > 0.95 && rpmVal < 5500 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">VE Sanity Check</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        A VE above 95% is typical of a dedicated race engine with ported heads and
                        a large cam. If this is a street build, try 85-90% VE for a more realistic
                        recommendation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {veMode === "advanced" && camDur && camDur > 240 && intendedUse === "street" && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Big Cam + Street Use</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        A cam with {camDur}° duration at .050" is aggressive for street use. The engine
                        will have a rough idle and weak vacuum signal below 2500 RPM. This can make
                        carburetor tuning more difficult — the carb may need modified idle circuits
                        and a larger idle air bleed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {veMode === "advanced" && intakeManifold === "singleplane" && intendedUse === "street" && rpmVal < 5000 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex gap-2">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Single-Plane on the Street</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Single-plane intakes sacrifice low-RPM torque and throttle response for top-end
                        power. Below 5000 RPM, a dual-plane intake will make more torque and drive better
                        on the street. Consider a dual-plane like the Edelbrock Performer RPM if your
                        peak power is under 5000 RPM.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Educational Sections ─────────────────────────────────── */}
      <Section
        title="How the CFM Formula Works"
        open={educationOpen}
        toggle={() => setEducationOpen(!educationOpen)}
      >
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            The standard carburetor sizing formula is <strong>CFM = (CID x RPM x VE) / 3456</strong>.
            The constant 3456 comes from two factors: a four-stroke engine completes one intake stroke
            every two crankshaft revolutions (so you divide by 2), and there are 1,728 cubic inches
            in one cubic foot (so you divide by 1,728). Multiply those together: 2 x 1,728 = 3,456.
            This gives you the theoretical airflow in cubic feet per minute that the engine demands
            at a given RPM.
          </p>
          <p>
            <strong>Volumetric Efficiency (VE)</strong> is a correction factor that accounts for how
            completely the cylinders actually fill with air. A stock engine with a mild cam, cast iron
            heads, and a factory intake manifold typically achieves 75-80% VE. Bolt-on upgrades like
            headers, a performance intake, and a mild cam push VE to 80-85%. Aftermarket aluminum
            heads, a well-matched cam, and a good intake can reach 85-90%. Full race engines with
            ported heads, big cams, and optimized runners can hit 90-100%. Some well-developed
            NA race engines can actually exceed 100% VE through tuned-runner resonance effects
            (acoustic wave tuning in the intake and exhaust), but this requires very specific
            header and runner lengths matched to a narrow RPM band.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">What Affects VE?</h3>
          <p>
            <strong>Camshaft:</strong> Duration and LSA are the biggest VE factors. A longer-duration
            cam holds the intake valve open longer, which allows more air in at high RPM — but hurts
            low-RPM filling because the piston starts pushing air back out the still-open valve (reversion).
            A stock cam (~190° @ .050") keeps the valve open just long enough for good low-RPM fill.
            A 224° cam improves mid-range and top-end breathing substantially. Past 240°, you're
            trading street manners for peak power. LSA (lobe separation angle) controls overlap — tighter
            LSA means more overlap, which improves scavenging at high RPM but hurts idle quality.
          </p>
          <p>
            <strong>Cylinder heads:</strong> Port flow capacity sets the ceiling on VE. If your heads
            can only flow 180 CFM per port but your engine demands 220 CFM per cylinder, the heads are
            the bottleneck and no cam or intake will fix it. This is why the Advanced mode lets you enter
            flow bench data — it's the most accurate way to estimate VE.
          </p>
          <p>
            <strong>Intake manifold:</strong> A dual-plane manifold splits the plenum into two halves,
            giving each side strong signal strength and good torque from 1500-5500 RPM. A single-plane
            manifold uses one open plenum — all 8 cylinders share the same volume, which allows better
            top-end flow but weakens the signal at low RPM. Single-planes typically add 2-5% VE at
            peak RPM compared to dual-planes.
          </p>
          <p>
            <strong>Exhaust:</strong> Stock cast iron manifolds are restrictive and create back-pressure
            that fights the intake stroke. Shorty headers are a modest improvement. Long-tube headers
            with properly-sized primaries improve scavenging and can add 3-6% VE. The header primary
            diameter should match the engine's displacement and RPM range — too large and you lose
            low-RPM scavenging velocity.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Why Bigger Isn't Always Better</h3>
          <p>
            This is the single most common mistake in carburetor selection. A carburetor works by
            creating a pressure drop (vacuum signal) through its venturi bores. This signal pulls
            fuel from the boosters and mixes it with the incoming air. When a carb is properly sized,
            the venturi signal is strong across the RPM range, delivering crisp throttle response and
            accurate fuel metering.
          </p>
          <p>
            An oversized carburetor has larger venturi bores, which means the air moves slower at
            part throttle. Slower air = weaker signal = less fuel pulled from the boosters. The result
            is a flat spot off idle, lazy throttle response, hesitation during tip-in, and generally
            poor drivability around town. The engine might make a few more HP at wide-open throttle
            on a dyno, but it drives terribly on the street. The commonly cited guidance from Holley
            and other manufacturers is that street engines actually run best at 90-95% of the
            calculated CFM. A slightly "undersized" carb maintains strong signal strength and makes
            the engine feel much more responsive.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Dual-Quad & Tunnel Ram Sizing</h3>
          <p>
            For dual-quad (two 4-barrel carbs) or tunnel ram setups, each carburetor handles half
            the total airflow. Calculate your total CFM requirement normally, then divide by two to
            find the size for each carb. Dual-quad setups can improve mid-range torque because the
            primary carb provides strong signal at part throttle, while the secondary carb opens
            under heavy load.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Carburetor Spacers</h3>
          <p>
            A carb spacer (typically 1" or 2" tall) mounts between the carburetor and the intake
            manifold. <strong>Open spacers</strong> (a single open plenum) add plenum volume and
            tend to improve top-end airflow and horsepower. <strong>4-hole spacers</strong> (with
            four separate holes matching the throttle bores) maintain the divided-runner effect longer,
            improving signal strength, low-end torque, and throttle response. For street engines, a
            4-hole spacer is usually the better choice. For race engines chasing peak HP, an open
            spacer works better. Either type also helps insulate the carb from intake manifold heat,
            reducing fuel percolation and vapor lock.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Quick Sanity Check: 1.5 CFM per Cubic Inch</h3>
          <p>
            A widely-used rule of thumb from Summit Racing and other sources: multiply your displacement
            by <strong>1.5 for a stock/street engine</strong> or <strong>1.8+ for a modified engine</strong>.
            A stock 350 x 1.5 = 525 CFM (a 600 carb is plenty). A built 383 x 1.8 = 689 CFM (750 carb territory).
            This won't replace the full formula, but it's a fast gut-check.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Vacuum vs Mechanical Secondaries</h3>
          <p>
            Most 4-barrel carbs come in two styles: <strong>vacuum secondary</strong> (the rear barrels
            open automatically based on engine demand) and <strong>mechanical secondary / double pumper</strong>
            (the rear barrels open via direct linkage). For street engines, especially with an automatic
            transmission, vacuum secondaries are almost always the better choice. They open the secondaries
            only when the engine can actually use the extra airflow, preventing the bog that happens when
            mechanical secondaries open too early. Double pumpers are best suited for manual-transmission
            cars operating mostly above 3500 RPM — drag cars, road course cars, and dedicated race builds.
            If you're daily-driving or street/strip, pick a vacuum secondary carb.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Altitude Matters</h3>
          <p>
            Air density drops about 3% for every 1,000 feet of elevation. An engine at 5,000 feet
            above sea level is breathing air that's roughly 83% as dense as sea-level air. This means
            the engine physically moves less air mass per cycle, and a carb sized for sea level will
            be oversized at altitude. If you live at altitude, use the Advanced mode's altitude input
            to get a corrected recommendation.
          </p>
          <p>
            <strong>Important:</strong> Altitude affects jetting separately from carb size. The general
            rule is to decrease one Holley jet size for every 2,000 feet of elevation gain (each jet
            size is roughly a 3.5% fuel flow change). Even with a correctly-sized carb, running sea-level
            jetting at 5,000+ feet will cause the engine to run rich, foul plugs, and waste fuel.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Forced Induction Note</h3>
          <p>
            This calculator is designed for naturally aspirated engines. Blown or turbocharged engines
            push air into the cylinders under pressure, which means effective VE can exceed 100% —
            commonly 110-170% depending on boost level. Carb sizing for forced induction uses a modified
            formula that accounts for boost pressure: multiply the NA CFM requirement by (atmospheric
            pressure + boost pressure) / atmospheric pressure. A 350 that needs 600 CFM naturally
            aspirated at 8 PSI of boost would need roughly 600 x (14.7 + 8) / 14.7 = 926 CFM.
            Blow-through carb setups (like Holley's 4150/4500 series in a blow-through hat) are
            specialized — consult a turbo carb specialist for proper sizing.
          </p>
        </div>
      </Section>

      <Section
        title="Common Engine & Carb Combinations"
        open={combosOpen}
        toggle={() => setCombosOpen(!combosOpen)}
      >
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p className="mb-3">
            These are real-world carb sizes that work well for common engine builds, based on
            widespread builder experience and manufacturer recommendations:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold text-foreground">Engine Combo</th>
                  <th className="text-left py-2 pr-4 font-semibold text-foreground">Displacement</th>
                  <th className="text-left py-2 pr-4 font-semibold text-foreground">Typical Cam</th>
                  <th className="text-left py-2 font-semibold text-foreground">Recommended Carb</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr><td className="py-2 pr-4">Stock 305 Chevy</td><td className="py-2 pr-4">305 CID</td><td className="py-2 pr-4">~190° @ .050"</td><td className="py-2">500-600 CFM</td></tr>
                <tr><td className="py-2 pr-4">Mild 350 Chevy</td><td className="py-2 pr-4">350 CID</td><td className="py-2 pr-4">~210° @ .050"</td><td className="py-2">600-650 CFM</td></tr>
                <tr><td className="py-2 pr-4">383 Stroker (street)</td><td className="py-2 pr-4">383 CID</td><td className="py-2 pr-4">~218° @ .050"</td><td className="py-2">650-750 CFM</td></tr>
                <tr><td className="py-2 pr-4">383 Stroker (race)</td><td className="py-2 pr-4">383 CID</td><td className="py-2 pr-4">~236° @ .050"</td><td className="py-2">750-850 CFM</td></tr>
                <tr><td className="py-2 pr-4">454 BBC (street)</td><td className="py-2 pr-4">454 CID</td><td className="py-2 pr-4">~218° @ .050"</td><td className="py-2">750-800 CFM</td></tr>
                <tr><td className="py-2 pr-4">454 BBC (race)</td><td className="py-2 pr-4">454 CID</td><td className="py-2 pr-4">~242° @ .050"</td><td className="py-2">850-950 CFM</td></tr>
                <tr><td className="py-2 pr-4">Ford 302 (street)</td><td className="py-2 pr-4">302 CID</td><td className="py-2 pr-4">~204° @ .050"</td><td className="py-2">500-600 CFM</td></tr>
                <tr><td className="py-2 pr-4">Ford 351W (hot street)</td><td className="py-2 pr-4">351 CID</td><td className="py-2 pr-4">~224° @ .050"</td><td className="py-2">650-750 CFM</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs">
            These ranges assume typical build levels. A bone-stock 350 with a 2-barrel intake does
            fine with a 500 CFM 2-barrel. A 350 with heads, cam, and intake wants 600-650. Always
            match the carb to your actual build level — not just displacement. The cam column shows
            typical intake duration at .050" for each build level.
          </p>
        </div>
      </Section>
    </div>
  );
}

// ── Collapsible Section ──────────────────────────────────────────────
function Section({ title, open, toggle, children }: {
  title: string;
  open: boolean;
  toggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold hover:bg-[#222] transition-colors"
        onClick={toggle}
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}
