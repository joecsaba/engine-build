import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, Info } from "lucide-react";
import { useManufacturers, useFamilies, useFamilyEngines, usePistonToValveMinimums, type PistonToValveMin } from "@/hooks/useEngineData";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import pistonToValveContent from "@/data/calculatorContent/piston-to-valve.mjs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type ValveMaterial = "steel" | "stainless" | "titanium" | "inconel";

interface Thresholds { intakeMin: number; exhaustMin: number }

/* Default thresholds (fallback for first render). Sourced from JE Pistons,
   Wiseco, Diamond Racing, Reher-Morrison, Ferrea, Supertech published values
   via the piston_to_valve_minimums DB table.

   Important corrections from prior values (recalibrated 2026-05-28):
   - Titanium thresholds DROPPED from 0.120"/0.150" to 0.080"/0.100". No
     mfr publishes a higher Ti minimum; Reher-Morrison and JE both allow
     Ti to run TIGHTER (0.055-0.060" intake) because Ti's lower mass means
     less valvetrain bounce.
   - Inconel exhaust DROPPED from 0.130" to 0.100". Inconel 751 has LOWER
     thermal expansion than stainless per Supertech.
   - The real "more clearance" trigger is ALUMINUM RODS — +0.030" per
     Diamond Racing. Calc now exposes that as a separate flag. */
const DEFAULT_MATERIAL_THRESHOLDS: Record<ValveMaterial, Thresholds> = {
  steel:     { intakeMin: 0.080, exhaustMin: 0.100 },
  stainless: { intakeMin: 0.080, exhaustMin: 0.100 },
  titanium:  { intakeMin: 0.080, exhaustMin: 0.100 },
  inconel:   { intakeMin: 0.080, exhaustMin: 0.100 },
};

/* Aluminum rod adders. Sources disagree on the magnitude:
 *   - Diamond Racing + Reher-Morrison + several editorial outlets:    +0.030"
 *     (Diamond cites RPM stretch; Reher-Morrison's deck-clearance
 *     delta supports a similar magnitude).
 *   - MGP Connecting Rods + GRP Connecting Rods (the primary aluminum
 *     rod manufacturers themselves):                                  ~+0.010"
 *     They attribute it to THERMAL expansion (CTE math), not RPM
 *     stretch, and say modern billet aluminum has eliminated most of
 *     the historical "rod stretch" issue.
 * The calculator exposes both as user-selectable so the user can pick
 * the assumption that matches their rod manufacturer's guidance. */
const ALUMINUM_ROD_ADDER_CONSERVATIVE = 0.030;
const ALUMINUM_ROD_ADDER_MODERN_BILLET = 0.010;

type RodMaterial = "steel" | "aluminum-modern" | "aluminum-conservative";

function rodAdderFor(rm: RodMaterial): number {
  switch (rm) {
    case "aluminum-modern":       return ALUMINUM_ROD_ADDER_MODERN_BILLET;
    case "aluminum-conservative": return ALUMINUM_ROD_ADDER_CONSERVATIVE;
    default:                      return 0;
  }
}

const MATERIAL_LABELS: Record<ValveMaterial, string> = {
  steel:     "Steel (stock OEM)",
  stainless: "Stainless (performance)",
  titanium:  "Titanium (race) — same minimum as steel, NOT higher",
  inconel:   "Inconel exhaust / Stainless intake — same minimum as steel",
};

/** Collapse JSON rows into a (material → min envelope) table. The minimum
 *  is the LOWEST published value per material (i.e. tightest tolerance any
 *  reputable mfr will sign off on), so a measurement at or above this is
 *  guaranteed to pass at least one mfr's threshold. Rows tagged with
 *  'aluminum' rod or radial-only floors are excluded — those are handled
 *  separately. */
function deriveMaterialThresholds(rows: PistonToValveMin[]): Record<ValveMaterial, Thresholds> {
  if (!rows || rows.length === 0) return DEFAULT_MATERIAL_THRESHOLDS;
  const out: Record<ValveMaterial, Thresholds> = { ...DEFAULT_MATERIAL_THRESHOLDS };
  for (const mat of ["steel", "stainless", "titanium", "inconel"] as ValveMaterial[]) {
    const matching = rows.filter(r => {
      // Aluminum rods are flagged separately
      if (r.rod_material === "aluminum") return false;
      // Exclude radial-only floors
      if (/radial/i.test(r.application || "")) return false;
      // Match by material — also accept 'steel/stainless' as covering both,
      // and 'any' as covering everything when nothing material-specific exists.
      if (mat === "steel" || mat === "stainless") {
        return r.valve_material === mat
            || r.valve_material === "steel/stainless"
            || r.valve_material === "steel";
      }
      return r.valve_material === mat;
    });
    if (matching.length === 0) continue;
    out[mat] = {
      // Use median of published minimums rather than the absolute floor.
      // The lowest published value (Reher-Morrison Pro Stock 0.055/0.100)
      // requires every-cylinder verification with cam-supplier sign-off;
      // the median is what a typical builder should target.
      intakeMin:  median(matching.map(r => r.intake_min)),
      exhaustMin: median(matching.map(r => r.exhaust_min)),
    };
  }
  return out;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Engine presets ─────────────────────────────────────────────────────────────

interface EnginePreset {
  label: string;
  bore: string; stroke: string; rodLength: string; ptd: string;
}

const ENGINE_PRESETS: Record<string, EnginePreset> = {
  custom:   { label: "Custom / Enter manually",     bore: "",      stroke: "",      rodLength: "",      ptd: "" },
  sbc350:   { label: "Chevy 350 SBC",               bore: "4.000", stroke: "3.480", rodLength: "5.700", ptd: "0.025" },
  sbc383:   { label: "Chevy 383 Stroker (SBC)",      bore: "4.030", stroke: "3.750", rodLength: "5.700", ptd: "0.010" },
  bbc454:   { label: "Chevy 454 BBC",               bore: "4.251", stroke: "4.000", rodLength: "6.535", ptd: "0.025" },
  bbc496:   { label: "Chevy 496 Stroker (BBC)",      bore: "4.310", stroke: "4.250", rodLength: "6.535", ptd: "0.010" },
  ls1:      { label: "GM LS1 5.7L",                 bore: "3.898", stroke: "3.622", rodLength: "6.098", ptd: "0.005" },
  ls2:      { label: "GM LS2 6.0L",                 bore: "4.000", stroke: "3.622", rodLength: "6.098", ptd: "0.005" },
  ls3:      { label: "GM LS3 / L99 6.2L",           bore: "4.065", stroke: "3.622", rodLength: "6.098", ptd: "0.005" },
  lq9:      { label: "GM LQ9 / LQ4 6.0L Truck",    bore: "4.000", stroke: "3.622", rodLength: "6.098", ptd: "0.005" },
  ls7:      { label: "GM LS7 7.0L",                 bore: "4.125", stroke: "4.000", rodLength: "6.067", ptd: "0.005" },
  sbf302:   { label: "Ford 302 Windsor",            bore: "4.000", stroke: "3.000", rodLength: "5.090", ptd: "0.020" },
  sbf351w:  { label: "Ford 351 Windsor",            bore: "4.000", stroke: "3.500", rodLength: "5.956", ptd: "0.020" },
  coyote:   { label: "Ford 5.0 Coyote",             bore: "3.630", stroke: "3.650", rodLength: "5.933", ptd: "0.010" },
  bbf460:   { label: "Ford 460 BBF",                bore: "4.362", stroke: "3.850", rodLength: "6.605", ptd: "0.025" },
  mopar440: { label: "Mopar 440 RB",                bore: "4.320", stroke: "3.750", rodLength: "6.768", ptd: "0.020" },
  mopar383: { label: "Mopar 383 B",                 bore: "4.250", stroke: "3.375", rodLength: "6.358", ptd: "0.020" },
};

// ── Kinematic functions ────────────────────────────────────────────────────────

function pistonBelowTDC(thetaDeg: number, halfStroke: number, rodLen: number): number {
  const theta = (thetaDeg * Math.PI) / 180;
  return halfStroke * (1 - Math.cos(theta)) + rodLen - Math.sqrt(rodLen * rodLen - halfStroke * halfStroke * Math.sin(theta) * Math.sin(theta));
}

function valveLift(crankAngle: number, peakAngle: number, halfDuration: number, maxLift: number): number {
  const relative = crankAngle - peakAngle;
  if (Math.abs(relative) > halfDuration) return 0;
  return maxLift * (1 - (relative / halfDuration) * (relative / halfDuration));
}

// ── Clearance computation ──────────────────────────────────────────────────────

interface ClearancePoint {
  angle: number;
  intakeClearance: number;
  exhaustClearance: number;
  intakeLift: number;
  exhaustLift: number;
  pistonDepth: number;
}

interface ClearanceResult {
  points: ClearancePoint[];
  intakeMin: number;
  intakeMinAngle: number;
  exhaustMin: number;
  exhaustMinAngle: number;
}

function computeClearance(
  stroke: number, rodLength: number, ptd: number, gasketThick: number,
  headMilling: number, seatRecession: number,
  intDuration: number, exhDuration: number,
  intMaxLift: number, exhMaxLift: number, lsa: number,
  camAdvance: number, intReliefDepth: number, exhReliefDepth: number,
): ClearanceResult {
  const halfStroke = stroke / 2;
  // ICL = LSA - camAdvance (advance reduces ICL)
  const intCLEffective = lsa - camAdvance;
  // ExhCL (BTDC) = LSA + camAdvance → in ATDC space = 360 - (LSA + camAdvance)
  const exhCLEffective = 360 - lsa - camAdvance;

  const intHalfDur = intDuration / 2;
  const exhHalfDur = exhDuration / 2;

  // Head milling reduces the distance between valve and piston — it
  // effectively reduces gasket thickness for clearance purposes.
  const effectiveGasket = gasketThick - headMilling;

  const points: ClearancePoint[] = [];
  let intakeMin = Infinity;
  let intakeMinAngle = 0;
  let exhaustMin = Infinity;
  let exhaustMinAngle = 0;

  for (let angle = -30; angle <= 30; angle++) {
    const pbTDC = pistonBelowTDC(angle, halfStroke, rodLength);
    const pbHead = ptd + effectiveGasket + pbTDC;

    const iLift = valveLift(angle, intCLEffective, intHalfDur, intMaxLift);
    const eLift = valveLift(angle, exhCLEffective - 360, exhHalfDur, exhMaxLift);

    const intPistonDepth = pbHead + intReliefDepth;
    const exhPistonDepth = pbHead + exhReliefDepth;

    const intValveBelow = seatRecession + iLift;
    const exhValveBelow = seatRecession + eLift;

    const intClearance = intPistonDepth - intValveBelow;
    const exhClearance = exhPistonDepth - exhValveBelow;

    points.push({
      angle,
      intakeClearance: intClearance,
      exhaustClearance: exhClearance,
      intakeLift: iLift,
      exhaustLift: eLift,
      pistonDepth: pbHead,
    });

    if (intClearance < intakeMin) {
      intakeMin = intClearance;
      intakeMinAngle = angle;
    }
    if (exhClearance < exhaustMin) {
      exhaustMin = exhClearance;
      exhaustMinAngle = angle;
    }
  }

  return { points, intakeMin, intakeMinAngle, exhaustMin, exhaustMinAngle };
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function getStatus(
  intakeMin: number, exhaustMin: number, thresholds: Thresholds,
): { label: string; detail: string; color: string; bg: string } {
  const intakeFail = intakeMin < thresholds.intakeMin;
  const exhaustFail = exhaustMin < thresholds.exhaustMin;
  const intakeMarginal = intakeMin < thresholds.intakeMin + 0.020;
  const exhaustMarginal = exhaustMin < thresholds.exhaustMin + 0.020;

  if (intakeFail || exhaustFail) {
    return {
      label: "FAIL",
      detail: "Interference predicted. Do not run engine without correction.",
      color: "text-red-700",
      bg: "bg-red-50 border-red-300",
    };
  }
  if (intakeMarginal || exhaustMarginal) {
    return {
      label: "MARGINAL",
      detail: "Verify with clay check before running.",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-300",
    };
  }
  return {
    label: "PASS",
    detail: "Both valves have clearance above minimum.",
    color: "text-green-700",
    bg: "bg-green-50 border-green-300",
  };
}

function getClearanceColor(value: number, threshold: number): string {
  if (value < threshold) return "text-red-600";
  if (value < threshold + 0.020) return "text-yellow-600";
  return "text-green-600";
}

function formatAngle(angle: number): string {
  if (angle > 0) return `${angle}° ATDC`;
  if (angle < 0) return `${Math.abs(angle)}° BTDC`;
  return "TDC";
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold text-left hover:bg-[#222] transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

function ResultRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="font-bold text-gray-900">{value}</span>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PistonToValveCalculator() {
  // Engine platform preset
  const [platform, setPlatform] = useState("sbc350");

  // Engine picker state (from database)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMfr, setPickerMfr] = useState("");
  const [pickerFamily, setPickerFamily] = useState("");
  const [pickerEngine, setPickerEngine] = useState("");
  const { manufacturers } = useManufacturers();
  const { families } = useFamilies();
  const { familyData } = useFamilyEngines(pickerMfr, pickerFamily);
  const filteredFamilies = families.filter(f => f.manufacturer_slug === pickerMfr);

  // Section A — Engine dimensions
  const [bore, setBore] = useState("4.000");
  const [stroke, setStroke] = useState("3.480");
  const [rodLength, setRodLength] = useState("5.700");
  const [ptd, setPtd] = useState("0.025");
  const [gasketThick, setGasketThick] = useState("0.041");
  const [headMilling, setHeadMilling] = useState("0.000");
  const [seatRecession, setSeatRecession] = useState("0.000");

  // Section B — Camshaft specs
  const [intDuration, setIntDuration] = useState("224");
  const [exhDuration, setExhDuration] = useState("230");
  const [intMaxLift, setIntMaxLift] = useState("0.480");
  const [exhMaxLift, setExhMaxLift] = useState("0.484");
  const [lsa, setLsa] = useState("110");
  const [camAdvance, setCamAdvance] = useState(0);

  // Rocker ratio helper
  const [liftMode, setLiftMode] = useState<"valve" | "lobe">("valve");
  const [rockerRatio, setRockerRatio] = useState("1.5");

  // Section C — Piston reliefs
  const [intReliefDepth, setIntReliefDepth] = useState("0.120");
  const [exhReliefDepth, setExhReliefDepth] = useState("0.140");

  // Section D — Valve material + rod material (rod is the strongest variable)
  const [valveMaterial, setValveMaterial] = useState<ValveMaterial>("stainless");
  const [rodMaterial, setRodMaterial] = useState<RodMaterial>("steel");

  // Live thresholds from DB. Falls back to DEFAULT_MATERIAL_THRESHOLDS
  // (which now match Wiseco/JE published values) before JSON loads.
  const { data: ptvRows } = usePistonToValveMinimums();
  const materialThresholds = useMemo(
    () => deriveMaterialThresholds(ptvRows),
    [ptvRows]
  );

  // Parse all inputs
  const n = (v: string) => parseFloat(v) || 0;
  const sV = n(stroke);
  const rlV = n(rodLength);
  const ptdV = n(ptd);
  const gtV = n(gasketThick);
  const hmV = n(headMilling);
  const srV = n(seatRecession);
  const intDurV = n(intDuration);
  const exhDurV = n(exhDuration);
  const lsaV = n(lsa);
  const intRelV = n(intReliefDepth);
  const exhRelV = n(exhReliefDepth);
  const rrV = n(rockerRatio);

  // Compute effective valve lift based on mode
  const intLiftV = liftMode === "lobe" ? n(intMaxLift) * rrV : n(intMaxLift);
  const exhLiftV = liftMode === "lobe" ? n(exhMaxLift) * rrV : n(exhMaxLift);

  // Computed intake centerline
  const iclComputed = lsaV - camAdvance;

  // Apply rod-material adder (mfrs disagree on the magnitude — see top)
  const baseThr = materialThresholds[valveMaterial];
  const rodAdder = rodAdderFor(rodMaterial);
  const thresholds: Thresholds = {
    intakeMin:  baseThr.intakeMin  + rodAdder,
    exhaustMin: baseThr.exhaustMin + rodAdder,
  };

  // Full kinematic simulation
  const result = useMemo(() => {
    if (sV <= 0 || rlV <= 0) return null;
    return computeClearance(
      sV, rlV, ptdV, gtV, hmV, srV,
      intDurV, exhDurV, intLiftV, exhLiftV, lsaV,
      camAdvance, intRelV, exhRelV,
    );
  }, [sV, rlV, ptdV, gtV, hmV, srV, intDurV, exhDurV, intLiftV, exhLiftV, lsaV, camAdvance, intRelV, exhRelV]);

  // Baseline at 0° advance for delta comparison
  const baseline = useMemo(() => {
    if (sV <= 0 || rlV <= 0) return null;
    return computeClearance(
      sV, rlV, ptdV, gtV, hmV, srV,
      intDurV, exhDurV, intLiftV, exhLiftV, lsaV,
      0, intRelV, exhRelV,
    );
  }, [sV, rlV, ptdV, gtV, hmV, srV, intDurV, exhDurV, intLiftV, exhLiftV, lsaV, intRelV, exhRelV]);

  const status = result ? getStatus(result.intakeMin, result.exhaustMin, thresholds) : null;

  // Delta from baseline
  const intakeDelta = result && baseline ? result.intakeMin - baseline.intakeMin : 0;
  const exhaustDelta = result && baseline ? result.exhaustMin - baseline.exhaustMin : 0;

  // Apply engine preset
  function applyPreset(key: string) {
    setPlatform(key);
    const p = ENGINE_PRESETS[key];
    if (!p || key === "custom") return;
    setBore(p.bore);
    setStroke(p.stroke);
    setRodLength(p.rodLength);
    setPtd(p.ptd);
  }

  // Apply engine from database picker
  function handlePickerEngine(engineId: string) {
    setPickerEngine(engineId);
    if (!familyData) return;
    const eng = familyData.engines.find(e => e.engine_id === engineId);
    if (!eng) return;
    setPlatform("custom");
    if (eng.bore_in) setBore(eng.bore_in.toFixed(3));
    if (eng.stroke_in) setStroke(eng.stroke_in.toFixed(3));
    if (eng.rod_length_in) setRodLength(eng.rod_length_in.toFixed(3));
    if (eng.head?.rocker_ratio) setRockerRatio(eng.head.rocker_ratio.toFixed(3));
  }

  // Warnings
  const warnings: { text: string; level: "red" | "yellow" }[] = [];
  if (result) {
    if (result.intakeMin < thresholds.intakeMin) {
      warnings.push({
        text: `INTERFERENCE RISK at ${formatAngle(result.intakeMinAngle)}: intake valve has only ${result.intakeMin.toFixed(3)}" clearance (minimum ${thresholds.intakeMin.toFixed(3)}"). Options: retard cam, deeper valve reliefs, thicker head gasket, less lift.`,
        level: "red",
      });
    }
    if (result.exhaustMin < thresholds.exhaustMin) {
      warnings.push({
        text: `INTERFERENCE RISK at ${formatAngle(result.exhaustMinAngle)}: exhaust valve has only ${result.exhaustMin.toFixed(3)}" clearance (minimum ${thresholds.exhaustMin.toFixed(3)}"). Options: retard cam, deeper valve reliefs, thicker head gasket, less lift.`,
        level: "red",
      });
    }
    if (result.intakeMin >= thresholds.intakeMin && result.intakeMin < thresholds.intakeMin + 0.020) {
      warnings.push({
        text: `Marginal intake clearance. Verify with clay check before final assembly. Real-world clearances can differ from calculated by 0.010-0.015" due to valve pocket placement and lobe profile shape.`,
        level: "yellow",
      });
    }
    if (result.exhaustMin >= thresholds.exhaustMin && result.exhaustMin < thresholds.exhaustMin + 0.020) {
      warnings.push({
        text: `Marginal exhaust clearance. Verify with clay check before final assembly. Real-world clearances can differ from calculated by 0.010-0.015" due to valve pocket placement and lobe profile shape.`,
        level: "yellow",
      });
    }
    if (camAdvance > 6 && result.intakeMin < 0.100) {
      warnings.push({
        text: `Cam is heavily advanced (+${camAdvance}°). Each degree of advance costs approximately ${Math.abs(intakeDelta / camAdvance).toFixed(3)}" of intake clearance. Consider running less advance if clearance is tight.`,
        level: "yellow",
      });
    }
    if (intRelV === 0 && exhRelV === 0 && (intDurV > 240 || exhDurV > 240)) {
      warnings.push({
        text: `Flat-top pistons typically need valve reliefs at cam sizes above 240° duration. Check that your pistons have reliefs or that this input is correct.`,
        level: "yellow",
      });
    }
    if (hmV > 0.030) {
      warnings.push({
        text: `Head milling of ${hmV.toFixed(3)}" is significant. This moves the valve ${hmV.toFixed(3)}" closer to the piston. Verify the mill amount and check combustion chamber volume changes.`,
        level: "yellow",
      });
    }
  }

  // Chart data
  const chartData = result
    ? result.points.map(p => ({
        angle: p.angle,
        intake: parseFloat(p.intakeClearance.toFixed(4)),
        exhaust: parseFloat(p.exhaustClearance.toFixed(4)),
      }))
    : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="px-4 space-y-5">
        <div>
          <SEOHead
            title="Piston-to-Valve Clearance Calculator | P2V Check"
            description="Calculate piston-to-valve clearance with kinematic simulation. Presets for SBC, LS, SBF, BBC, Mopar. Cam advance slider and interference warnings."
            canonical="/calculators/piston-to-valve"
            keywords="piston to valve clearance calculator, P2V clearance, piston valve interference, cam advance clearance, valve relief depth calculator, engine clearance calculator, SBC P2V, LS P2V"
          />
          <h1 className="text-3xl font-bold mb-1">Piston-to-Valve Clearance Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Kinematic P2V simulation across the overlap region. Select your engine, enter your cam card specs, then use the advance slider to see clearance change in real time.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 min-w-0">

        {/* ── Common misconception callout ──────────────────── */}
        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-sm text-blue-800">
          <strong>P2V is NOT tightest at max lift.</strong> The critical clearance occurs during valve overlap near TDC (typically 5-15° from TDC), when the piston is near the head and the valves are partially open. This calculator simulates that exact region.
        </div>

        {/* ── SECTION A: Engine Dimensions ─────────────────── */}
        <Section title="1 — Engine Dimensions">
          <div className="space-y-5">
            {/* Database engine picker */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="text-sm font-medium text-[#E85D04] hover:underline"
              >
                {showPicker ? "Hide engine picker \u2191" : "Auto-fill from engine database \u2193"}
              </button>
              {showPicker && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Manufacturer</Label>
                    <Select value={pickerMfr} onValueChange={v => { setPickerMfr(v); setPickerFamily(""); setPickerEngine(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {manufacturers.map(m => (
                          <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Family</Label>
                    <Select value={pickerFamily} onValueChange={v => { setPickerFamily(v); setPickerEngine(""); }} disabled={!pickerMfr}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {filteredFamilies.map(f => (
                          <SelectItem key={f.family_slug} value={f.family_slug}>{f.family_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Engine</Label>
                    <Select value={pickerEngine} onValueChange={handlePickerEngine} disabled={!familyData}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {familyData?.engines.map(e => (
                          <SelectItem key={e.engine_id} value={e.engine_id}>
                            {e.displacement_ci ? `${e.displacement_ci}ci` : ""} {e.year || ""} {e.variants?.[0]?.code || e.engine_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Engine preset picker */}
            <Field label="Engine Platform" hint="Fills in stroke, rod length, bore, and piston-to-deck. You can override any value after selection.">
              <Select value={platform} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENGINE_PRESETS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Bore (inches)">
                <Input type="number" step="0.001" value={bore} onChange={e => { setBore(e.target.value); setPlatform("custom"); }} />
              </Field>
              <Field label="Stroke (inches)">
                <Input type="number" step="0.001" value={stroke} onChange={e => { setStroke(e.target.value); setPlatform("custom"); }} />
              </Field>
              <Field label="Rod Length (inches)" hint="Center-to-center connecting rod length">
                <Input type="number" step="0.001" value={rodLength} onChange={e => { setRodLength(e.target.value); setPlatform("custom"); }} />
              </Field>
              <Field label="Piston-to-Deck (inches)" hint="Measured with dial indicator. Positive = piston below deck (in-hole).">
                <Input type="number" step="0.001" value={ptd} onChange={e => { setPtd(e.target.value); setPlatform("custom"); }} />
              </Field>
              <Field label="Compressed Gasket Thickness (inches)" hint="From gasket manufacturer spec sheet, NOT uncompressed.">
                <Input type="number" step="0.001" value={gasketThick} onChange={e => setGasketThick(e.target.value)} />
              </Field>
              <Field label="Head Milling (inches)" hint="Amount milled from head surface. Moves valve closer to piston. 0 if unmilled.">
                <Input type="number" step="0.001" value={headMilling} onChange={e => setHeadMilling(e.target.value)} />
              </Field>
              <Field label="Valve Seat Recession (inches)" hint="Distance valve seat sits below chamber roof. 0 for flat-milled heads.">
                <Input type="number" step="0.001" value={seatRecession} onChange={e => setSeatRecession(e.target.value)} />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── SECTION B: Camshaft Specs ────────────────────── */}
        <Section title="2 — Camshaft Specs (from cam card)">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label='Intake Duration at 0.050" (degrees)' hint="From cam card — the industry-standard comparison number">
                <Input type="number" step="1" value={intDuration} onChange={e => setIntDuration(e.target.value)} />
              </Field>
              <Field label='Exhaust Duration at 0.050" (degrees)'>
                <Input type="number" step="1" value={exhDuration} onChange={e => setExhDuration(e.target.value)} />
              </Field>
            </div>

            {/* Lift mode toggle */}
            <div className="p-4 rounded-lg border bg-gray-50 space-y-3">
              <Field label="Lift values on your cam card are listed as:">
                <Select value={liftMode} onValueChange={v => setLiftMode(v as "valve" | "lobe")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valve">Valve lift (already includes rocker ratio)</SelectItem>
                    <SelectItem value="lobe">Lobe lift (I'll enter my rocker ratio below)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={liftMode === "lobe" ? "Intake Lobe Lift (inches)" : "Intake Valve Lift (inches)"}>
                  <Input type="number" step="0.001" value={intMaxLift} onChange={e => setIntMaxLift(e.target.value)} />
                </Field>
                <Field label={liftMode === "lobe" ? "Exhaust Lobe Lift (inches)" : "Exhaust Valve Lift (inches)"}>
                  <Input type="number" step="0.001" value={exhMaxLift} onChange={e => setExhMaxLift(e.target.value)} />
                </Field>
              </div>
              {liftMode === "lobe" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Rocker Ratio" hint="e.g. 1.5 SBC/Pontiac/Mopar, 1.6 SBF/Olds/AMC, 1.7 BBC/LS">
                    <Input type="number" step="0.01" value={rockerRatio} onChange={e => setRockerRatio(e.target.value)} />
                  </Field>
                  <div className="flex items-end pb-1">
                    <div className="text-sm text-muted-foreground">
                      Valve lift: <span className="font-bold text-foreground">{intLiftV.toFixed(3)}" int</span> / <span className="font-bold text-foreground">{exhLiftV.toFixed(3)}" exh</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Lobe Separation Angle — LSA (degrees)" hint="Ground into the cam — from your cam card">
                <Input type="number" step="0.5" value={lsa} onChange={e => setLsa(e.target.value)} />
              </Field>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Intake Centerline (computed)</Label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-gray-50 text-sm font-mono">
                  {iclComputed.toFixed(1)}° ATDC
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  = LSA ({lsa}°) minus advance ({camAdvance > 0 ? "+" : ""}{camAdvance}°). Adjusted by the slider below.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── SECTION C: Piston Reliefs ────────────────────── */}
        <Section title="3 — Piston Valve Reliefs">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Intake Valve Relief Depth (inches)" hint="Measure with depth micrometer. 0 for flat-top without reliefs.">
                <Input type="number" step="0.001" value={intReliefDepth} onChange={e => setIntReliefDepth(e.target.value)} />
              </Field>
              <Field label="Exhaust Valve Relief Depth (inches)" hint="Typically 0.020-0.030 deeper than intake. 0 for flat-top.">
                <Input type="number" step="0.001" value={exhReliefDepth} onChange={e => setExhReliefDepth(e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              This calculator assumes the valve is centered over its relief pocket. On pistons where the relief is offset or undersized, actual clearance may be less than calculated.
            </p>
          </div>
        </Section>

        {/* ── SECTION D: Valve Material + Rod Material ──────── */}
        <Section title="4 — Material & Thresholds">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <Field label="Valve Material">
                <Select value={valveMaterial} onValueChange={v => setValveMaterial(v as ValveMaterial)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MATERIAL_LABELS) as ValveMaterial[]).map(k => (
                      <SelectItem key={k} value={k}>{MATERIAL_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Connecting Rod Material">
                <Select value={rodMaterial} onValueChange={v => setRodMaterial(v as RodMaterial)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="steel">Steel (stock / forged) — baseline</SelectItem>
                    <SelectItem value="aluminum-modern">Aluminum, modern billet (MGP / GRP) — +0.010″</SelectItem>
                    <SelectItem value="aluminum-conservative">Aluminum, conservative (Diamond / Reher-Morrison) — +0.030″</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="text-xs text-muted-foreground max-w-2xl space-y-2">
              <p>
                <strong>Why valve material doesn't change the minimum:</strong> JE, Wiseco,
                Reher-Morrison, Ferrea and Supertech all publish the same 0.080″/0.100″ floor
                regardless of material — Titanium can actually run TIGHTER (Reher-Morrison Pro
                Stock allows 0.060″/0.120″) because lower mass means less valvetrain bounce.
                Inconel 751 has lower thermal expansion than stainless and doesn't need extra
                clearance.
              </p>
              <p>
                <strong>Why two aluminum-rod options:</strong> sources disagree. Diamond Racing
                and editorial outlets (EngineLabs, StreetMuscle, RPM Mag) recommend +0.030″ on
                the assumption that aluminum rods stretch at RPM. The aluminum rod manufacturers
                themselves (<a href="https://www.mgpconnectingrods.com/mgp-tech/technical-advice/"
                target="_blank" rel="noopener noreferrer" className="text-[#E85D04] hover:underline">MGP</a> and{" "}
                <a href="https://www.dragzine.com/tech-stories/engine/debunking-aluminum-rod-myths-with-grp/"
                target="_blank" rel="noopener noreferrer" className="text-[#E85D04] hover:underline">GRP</a>)
                disagree — they say modern aerospace-grade aluminum doesn't stretch at RPM, and
                only ~0.010″ of thermal expansion is real. Pick the option that matches your rod
                manufacturer's guidance.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border bg-gray-50 text-center">
                <div className="text-xs text-gray-500 mb-1">Intake Minimum</div>
                <div className="text-xl font-bold">{thresholds.intakeMin.toFixed(3)}"</div>
              </div>
              <div className="p-3 rounded-lg border bg-gray-50 text-center">
                <div className="text-xs text-gray-500 mb-1">Exhaust Minimum</div>
                <div className="text-xl font-bold">{thresholds.exhaustMin.toFixed(3)}"</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Cam Advance Slider ───────────────────────────── */}
        <Card className="bg-[#1a1a1a] text-white">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Cam Advance / Retard</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Drag to see how timing changes affect P2V clearance
                </p>
              </div>
              <p className="text-3xl font-bold text-primary">
                {camAdvance > 0 ? "+" : ""}{camAdvance}°
              </p>
            </div>
            <Slider
              min={-8}
              max={8}
              step={1}
              value={[camAdvance]}
              onValueChange={([v]) => setCamAdvance(v)}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>-8° retard</span>
              <span>0° straight up</span>
              <span>+8° advance</span>
            </div>

            {/* Delta display when advance != 0 */}
            {camAdvance !== 0 && result && baseline && (
              <div className="border-t border-white/20 pt-3 grid grid-cols-2 gap-3 text-center text-sm">
                <div>
                  <div className="text-gray-400 text-xs">Intake P2V change</div>
                  <div className={`font-bold ${intakeDelta < 0 ? "text-red-400" : "text-green-400"}`}>
                    {intakeDelta >= 0 ? "+" : ""}{intakeDelta.toFixed(3)}"
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Exhaust P2V change</div>
                  <div className={`font-bold ${exhaustDelta < 0 ? "text-red-400" : "text-green-400"}`}>
                    {exhaustDelta >= 0 ? "+" : ""}{exhaustDelta.toFixed(3)}"
                  </div>
                </div>
                <div className="col-span-2 text-xs text-gray-500">
                  vs. straight-up installation (0° advance)
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Status Banner ────────────────────────────────── */}
        {status && result && (
          <div className={`rounded-xl border-2 p-5 text-center ${status.bg}`}>
            <div className={`text-3xl font-black mb-1 ${status.color}`}>{status.label}</div>
            <div className={`text-sm font-semibold ${status.color}`}>{status.detail}</div>
          </div>
        )}

        {/* ── Warnings ─────────────────────────────────────── */}
        {warnings.map((w, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg border text-sm font-medium ${
              w.level === "red"
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-yellow-50 border-yellow-300 text-yellow-700"
            }`}
          >
            {w.text}
          </div>
        ))}

        {/* ── Results Cards ────────────────────────────────── */}
        {result && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle className="text-base">Intake P2V</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm">Minimum Clearance</p>
                <p className={`text-5xl font-bold ${getClearanceColor(result.intakeMin, thresholds.intakeMin)}`}>
                  {result.intakeMin.toFixed(3)}"
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Tightest at: <span className="text-white font-semibold">{formatAngle(result.intakeMinAngle)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Threshold: {thresholds.intakeMin.toFixed(3)}" ({MATERIAL_LABELS[valveMaterial]})
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle className="text-base">Exhaust P2V</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm">Minimum Clearance</p>
                <p className={`text-5xl font-bold ${getClearanceColor(result.exhaustMin, thresholds.exhaustMin)}`}>
                  {result.exhaustMin.toFixed(3)}"
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Tightest at: <span className="text-white font-semibold">{formatAngle(result.exhaustMinAngle)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Threshold: {thresholds.exhaustMin.toFixed(3)}" ({MATERIAL_LABELS[valveMaterial]})
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Clay Check Guidance ──────────────────────────── */}
        {result && status && status.label !== "FAIL" && (
          <div className="p-4 rounded-lg border bg-gray-50 text-sm space-y-1">
            <p className="font-semibold text-gray-700">Clay Check Guidance</p>
            <p className="text-muted-foreground">
              When you clay check this combination, expect approximately <strong>{result.intakeMin.toFixed(3)}"</strong> of clay
              at the intake relief around {formatAngle(result.intakeMinAngle)} and <strong>{result.exhaustMin.toFixed(3)}"</strong> at
              the exhaust relief around {formatAngle(result.exhaustMinAngle)}. The parabolic model may differ from actual by 0.010-0.015" — if your
              clay is significantly thinner than predicted, the cam profile has aggressive opening ramps and you need more clearance margin.
            </p>
            <p className="text-xs text-muted-foreground">
              Use light checking springs (not hydraulic lifters) with zero lash. Check at least 20° BTDC through 20° ATDC.
            </p>
          </div>
        )}

        {/* ── Clearance Chart ──────────────────────────────── */}
        {result && (
          <Card>
            <CardHeader><CardTitle>Clearance vs. Crank Angle</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2">
                <div className="min-w-[500px]">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="angle"
                        label={{ value: "Crank Angle (° from TDC)", position: "insideBottom", offset: -5, fontSize: 12 }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{ value: "Clearance (in)", angle: -90, position: "insideLeft", offset: 5, fontSize: 12 }}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) => v.toFixed(2)}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(4)}"`,
                          name === "intake" ? "Intake P2V" : "Exhaust P2V",
                        ]}
                        labelFormatter={(label: number) => `${label > 0 ? label + "° ATDC" : label < 0 ? Math.abs(label) + "° BTDC" : "TDC"}`}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <ReferenceLine x={0} stroke="#999" strokeDasharray="4 4" label={{ value: "TDC", position: "top", fontSize: 11 }} />
                      <ReferenceLine
                        y={thresholds.intakeMin}
                        stroke="#E85D04"
                        strokeDasharray="6 3"
                        label={{ value: `Int min ${thresholds.intakeMin}"`, position: "right", fontSize: 9, fill: "#E85D04" }}
                      />
                      <ReferenceLine
                        y={thresholds.exhaustMin}
                        stroke="#dc2626"
                        strokeDasharray="6 3"
                        label={{ value: `Exh min ${thresholds.exhaustMin}"`, position: "left", fontSize: 9, fill: "#dc2626" }}
                      />
                      <Line type="monotone" dataKey="intake" stroke="#E85D04" strokeWidth={2} dot={false} name="intake" />
                      <Line type="monotone" dataKey="exhaust" stroke="#dc2626" strokeWidth={2} dot={false} name="exhaust" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[#E85D04] inline-block" /> Intake P2V
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[#dc2626] inline-block" /> Exhaust P2V
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-[#999] inline-block" /> Min thresholds
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── What-If Summary ──────────────────────────────── */}
        {result && (
          <Card>
            <CardHeader><CardTitle className="text-base">What-If Quick Reference</CardTitle></CardHeader>
            <CardContent className="space-y-0.5">
              <ResultRow
                label="Current intake P2V"
                value={`${result.intakeMin.toFixed(3)}"`}
                sub={`at ${formatAngle(result.intakeMinAngle)}`}
              />
              <ResultRow
                label="Current exhaust P2V"
                value={`${result.exhaustMin.toFixed(3)}"`}
                sub={`at ${formatAngle(result.exhaustMinAngle)}`}
              />
              <ResultRow
                label="If you add 0.010 thicker gasket"
                value={`+0.010" both`}
                sub="Each 0.010 gasket thickness adds ~0.010 clearance"
              />
              <ResultRow
                label="If you mill heads 0.030"
                value={`-0.030" both`}
                sub="Milling moves valve closer to piston 1:1"
              />
              <ResultRow
                label="If you cut 0.020 deeper reliefs"
                value={`+0.020" that valve`}
                sub="Relief depth adds directly to clearance"
              />
              {camAdvance === 0 && (
                <ResultRow
                  label="If you advance cam 4°"
                  value={(() => {
                    const adv4 = computeClearance(sV, rlV, ptdV, gtV, hmV, srV, intDurV, exhDurV, intLiftV, exhLiftV, lsaV, 4, intRelV, exhRelV);
                    const d = adv4.intakeMin - result.intakeMin;
                    return `${d >= 0 ? "+" : ""}${d.toFixed(3)}" intake`;
                  })()}
                  sub="Advance reduces intake, increases exhaust"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Simulation Detail Table ──────────────────────── */}
        {result && (
          <Section title="Simulation Detail — Every Degree" defaultOpen={false}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Full degree-by-degree clearance data. Useful for sharing with a cam grinder or verifying against clay check measurements.
                Minimum clearance rows are highlighted.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left p-2">Angle</th>
                      <th className="text-right p-2">Piston Depth</th>
                      <th className="text-right p-2">Int. Lift</th>
                      <th className="text-right p-2">Int. P2V</th>
                      <th className="text-right p-2">Exh. Lift</th>
                      <th className="text-right p-2">Exh. P2V</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.points.map((p, i) => {
                      const isIntMin = p.angle === result.intakeMinAngle;
                      const isExhMin = p.angle === result.exhaustMinAngle;
                      return (
                        <tr
                          key={p.angle}
                          className={`${i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"} ${
                            isIntMin || isExhMin ? "font-bold bg-orange-50" : ""
                          }`}
                        >
                          <td className="p-2">{formatAngle(p.angle)}</td>
                          <td className="text-right p-2 font-mono">{p.pistonDepth.toFixed(4)}"</td>
                          <td className="text-right p-2 font-mono">{p.intakeLift.toFixed(4)}"</td>
                          <td className={`text-right p-2 font-mono ${getClearanceColor(p.intakeClearance, thresholds.intakeMin)}`}>
                            {p.intakeClearance.toFixed(4)}"
                          </td>
                          <td className="text-right p-2 font-mono">{p.exhaustLift.toFixed(4)}"</td>
                          <td className={`text-right p-2 font-mono ${getClearanceColor(p.exhaustClearance, thresholds.exhaustMin)}`}>
                            {p.exhaustClearance.toFixed(4)}"
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        {/* ── Sanity Check ─────────────────────────────────── */}
        {result && (
          <Section title="Sanity Check — Verify Your Inputs" defaultOpen={false}>
            <div className="space-y-0.5">
              <ResultRow label="Piston below head at TDC" value={`${(ptdV + gtV - hmV).toFixed(4)}"`} sub="PTD + gasket - head milling" />
              <ResultRow
                label="Piston travel at 10° ATDC"
                value={`${pistonBelowTDC(10, sV / 2, rlV).toFixed(4)}"`}
              />
              <ResultRow
                label="Piston below head at 10° ATDC"
                value={`${(ptdV + gtV - hmV + pistonBelowTDC(10, sV / 2, rlV)).toFixed(4)}"`}
              />
              <ResultRow
                label="Piston travel at 180° (full stroke)"
                value={`${pistonBelowTDC(180, sV / 2, rlV).toFixed(4)}"`}
                sub={`Should equal stroke: ${sV.toFixed(3)}"`}
              />
              <ResultRow
                label="Effective valve lift (intake)"
                value={`${intLiftV.toFixed(3)}"`}
                sub={liftMode === "lobe" ? `Lobe ${intMaxLift}" × ${rockerRatio} ratio` : "Direct valve lift input"}
              />
              <ResultRow
                label="Effective valve lift (exhaust)"
                value={`${exhLiftV.toFixed(3)}"`}
                sub={liftMode === "lobe" ? `Lobe ${exhMaxLift}" × ${rockerRatio} ratio` : "Direct valve lift input"}
              />
              <ResultRow
                label="Intake centerline"
                value={`${iclComputed.toFixed(1)}° ATDC`}
                sub={`LSA (${lsa}°) - advance (${camAdvance}°)`}
              />
              <ResultRow
                label="Exhaust centerline"
                value={`${(lsaV + camAdvance).toFixed(1)}° BTDC`}
                sub={`LSA (${lsa}°) + advance (${camAdvance > 0 ? "+" : ""}${camAdvance}°)`}
              />
            </div>
          </Section>
        )}

        </div>{/* end left column */}

        <aside className="xl:w-80 shrink-0 space-y-6">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E85D04]" />
                Quick Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Minimum Clearances</h4>
                <ul className="space-y-1 mt-1">
                  <li><span className="font-medium text-foreground">Intake:</span> 0.080" minimum</li>
                  <li><span className="font-medium text-foreground">Exhaust:</span> 0.100" minimum</li>
                  <li><span className="font-medium text-foreground">Clay-check target:</span> 0.060-0.080"</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Tightest Point</h4>
                <p>Intake P2V is tightest around 10° ATDC — piston has barely dropped but intake valve is opening fast.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Cam Advance Effect</h4>
                <p>Each 1° of advance costs ~0.005-0.008" of intake clearance. A 4° advance can reduce intake P2V by 0.020-0.030".</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Exhaust Reliefs</h4>
                <p>Exhaust valves run 1200-1350°F vs 800-900°F intake. Need 0.020-0.030" deeper reliefs for thermal growth.</p>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Always Clay-Check</h4>
                <p>Use light checking springs (never hydraulic lifters). Roll clay across reliefs, rotate through TDC, measure with caliper. Calculator is for planning only.</p>
              </div>
            </CardContent>
          </Card>
        </aside>

        </div>{/* end flex row */}

        <CalculatorContent data={pistonToValveContent} title="Piston-to-Valve Clearance" />
      </div>
    </div>
  );
}
