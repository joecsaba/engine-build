import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ArrowRightLeft } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, ComposedChart,
} from "recharts";

/* ══════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ══════════════════════════════════════════════════════════════════ */

type CalcMode = "cam-to-spring" | "spring-to-cam";

type CamType = "hyd-flat" | "hyd-roller" | "solid-flat" | "solid-roller";

interface CamTypeSpec {
  label: string;
  seatMin: number;
  seatMax: number;
  openMin: number;
  openMax: number;
  maxSeatWarn: number;       // above this seat pressure, warn about lobe wear
  typicalAggressiveness: number; // 0-1 scale, affects valve float estimate
}

const CAM_TYPES: Record<CamType, CamTypeSpec> = {
  "hyd-flat":     { label: "Hydraulic flat tappet",   seatMin: 85,  seatMax: 115, openMin: 220, openMax: 280,  maxSeatWarn: 130, typicalAggressiveness: 0.35 },
  "hyd-roller":   { label: "Hydraulic roller",        seatMin: 120, seatMax: 170, openMin: 260, openMax: 400,  maxSeatWarn: 999, typicalAggressiveness: 0.55 },
  "solid-flat":   { label: "Solid flat tappet",       seatMin: 130, seatMax: 170, openMin: 280, openMax: 380,  maxSeatWarn: 180, typicalAggressiveness: 0.50 },
  "solid-roller": { label: "Solid roller",            seatMin: 170, seatMax: 400, openMin: 350, openMax: 1000, maxSeatWarn: 999, typicalAggressiveness: 0.75 },
};

type SpringType = "single" | "single-beehive" | "dual" | "triple";

const SPRING_TYPE_LABELS: Record<SpringType, string> = {
  "single":        "Single (OEM / mild street)",
  "single-beehive": "Beehive / Conical (street-performance)",
  "dual":          "Dual (performance / race)",
  "triple":        "Triple (extreme race)",
};

/* Typical effective mass at the valve (grams) by spring type.
   These are average values for a typical V8 pushrod engine.
   Real values depend on specific components. */
const SPRING_MASS_GRAMS: Record<SpringType, number> = {
  "single": 55,
  "single-beehive": 45,
  "dual": 85,
  "triple": 120,
};

interface EnginePreset {
  label: string;
  valveWeightInt: number;   // intake valve weight, grams
  valveWeightExh: number;   // exhaust valve weight, grams
  retainerWeight: number;   // grams (per valve, steel)
  lockWeight: number;       // grams (pair)
  stockRockerRatio: number;
  stockRockerWeight: number; // grams (steel stamped)
  stemDiameter: string;
  defaultSpringType: SpringType;
}

const ENGINE_PRESETS: Record<string, EnginePreset> = {
  custom: {
    label: "Custom / Enter manually",
    valveWeightInt: 100, valveWeightExh: 85,
    retainerWeight: 28, lockWeight: 8,
    stockRockerRatio: 1.5, stockRockerWeight: 95,
    stemDiameter: "11/32\"",
    defaultSpringType: "single",
  },
  sbc: {
    label: "Chevy Small Block (SBC 283-400)",
    valveWeightInt: 105, valveWeightExh: 88,
    retainerWeight: 28, lockWeight: 8,
    stockRockerRatio: 1.5, stockRockerWeight: 95,
    stemDiameter: "11/32\"",
    defaultSpringType: "single",
  },
  bbc: {
    label: "Chevy Big Block (BBC 396-454)",
    valveWeightInt: 145, valveWeightExh: 125,
    retainerWeight: 35, lockWeight: 10,
    stockRockerRatio: 1.7, stockRockerWeight: 120,
    stemDiameter: "3/8\"",
    defaultSpringType: "dual",
  },
  ls: {
    label: "GM LS / Gen III-IV (4.8-7.0L)",
    valveWeightInt: 90, valveWeightExh: 78,
    retainerWeight: 20, lockWeight: 6,
    stockRockerRatio: 1.7, stockRockerWeight: 85,
    stemDiameter: "8mm",
    defaultSpringType: "single-beehive",
  },
  lt: {
    label: "GM LT / Gen V (LT1, LT4, L86)",
    valveWeightInt: 82, valveWeightExh: 70,
    retainerWeight: 18, lockWeight: 6,
    stockRockerRatio: 1.8, stockRockerWeight: 80,
    stemDiameter: "8mm",
    defaultSpringType: "single-beehive",
  },
  sbf: {
    label: "Ford Small Block (SBF 260-351W)",
    valveWeightInt: 110, valveWeightExh: 92,
    retainerWeight: 30, lockWeight: 8,
    stockRockerRatio: 1.6, stockRockerWeight: 100,
    stemDiameter: "11/32\"",
    defaultSpringType: "single",
  },
  bbf: {
    label: "Ford Big Block (FE/385/460)",
    valveWeightInt: 155, valveWeightExh: 135,
    retainerWeight: 38, lockWeight: 10,
    stockRockerRatio: 1.76, stockRockerWeight: 130,
    stemDiameter: "3/8\"",
    defaultSpringType: "dual",
  },
  coyote: {
    label: "Ford 5.0 Coyote (DOHC)",
    valveWeightInt: 72, valveWeightExh: 62,
    retainerWeight: 16, lockWeight: 5,
    stockRockerRatio: 1.0, stockRockerWeight: 0,
    stemDiameter: "6mm",
    defaultSpringType: "single-beehive",
  },
  moparLA: {
    label: "Mopar LA (273-360)",
    valveWeightInt: 112, valveWeightExh: 95,
    retainerWeight: 30, lockWeight: 8,
    stockRockerRatio: 1.5, stockRockerWeight: 100,
    stemDiameter: "11/32\"",
    defaultSpringType: "single",
  },
  moparRB: {
    label: "Mopar B/RB (383-440)",
    valveWeightInt: 150, valveWeightExh: 130,
    retainerWeight: 36, lockWeight: 10,
    stockRockerRatio: 1.5, stockRockerWeight: 115,
    stemDiameter: "3/8\"",
    defaultSpringType: "dual",
  },
  moparHemi: {
    label: "Mopar 426 Hemi / Gen III Hemi",
    valveWeightInt: 148, valveWeightExh: 128,
    retainerWeight: 32, lockWeight: 9,
    stockRockerRatio: 1.5, stockRockerWeight: 110,
    stemDiameter: "3/8\"",
    defaultSpringType: "dual",
  },
  pontiac: {
    label: "Pontiac V8 (326-455)",
    valveWeightInt: 128, valveWeightExh: 108,
    retainerWeight: 32, lockWeight: 9,
    stockRockerRatio: 1.5, stockRockerWeight: 105,
    stemDiameter: "11/32\"",
    defaultSpringType: "single",
  },
  buick: {
    label: "Buick V8 (300-455)",
    valveWeightInt: 125, valveWeightExh: 105,
    retainerWeight: 30, lockWeight: 8,
    stockRockerRatio: 1.55, stockRockerWeight: 100,
    stemDiameter: "11/32\"",
    defaultSpringType: "single",
  },
  olds: {
    label: "Oldsmobile V8 (330-455)",
    valveWeightInt: 130, valveWeightExh: 110,
    retainerWeight: 32, lockWeight: 9,
    stockRockerRatio: 1.5, stockRockerWeight: 105,
    stemDiameter: "3/8\"",
    defaultSpringType: "single",
  },
};

type RetainerMaterial = "steel" | "chromoly" | "titanium";

const RETAINER_MATERIAL_FACTOR: Record<RetainerMaterial, { label: string; factor: number }> = {
  steel:    { label: "Steel (stock)",     factor: 1.0 },
  chromoly: { label: "Chromoly (performance)", factor: 0.85 },
  titanium: { label: "Titanium (race)",   factor: 0.45 },
};

type ValveMaterial = "stainless" | "inconel" | "titanium";

const VALVE_MATERIAL_FACTOR: Record<ValveMaterial, { label: string; factor: number }> = {
  stainless: { label: "Stainless steel (standard)",    factor: 1.0 },
  inconel:   { label: "Inconel (exhaust, high-temp)",  factor: 1.05 },
  titanium:  { label: "Titanium (race, lightweight)",   factor: 0.57 },
};

const ROCKER_PRESETS = [
  { value: "1.000", label: "1.0:1 (DOHC / direct acting)" },
  { value: "1.500", label: "1.5:1 (stock SBF, Mopar, Pontiac)" },
  { value: "1.550", label: "1.55:1 (stock Buick)" },
  { value: "1.600", label: "1.6:1 (stock SBC, common aftermarket)" },
  { value: "1.650", label: "1.65:1 (common LS, perf SBC)" },
  { value: "1.700", label: "1.7:1 (stock LS/BBC intake, perf SBC)" },
  { value: "1.750", label: "1.75:1 (pro SBC/LS)" },
  { value: "1.760", label: "1.76:1 (stock FE Ford)" },
  { value: "1.800", label: "1.8:1 (high-ratio, stock LT)" },
  { value: "custom", label: "Custom ratio..." },
];

/* ══════════════════════════════════════════════════════════════════
   CALCULATION FUNCTIONS
   ══════════════════════════════════════════════════════════════════ */

/** Net valve lift after rocker and lash */
function netValveLift(lobeLift: number, rockerRatio: number, lash: number): number {
  return lobeLift * rockerRatio - lash;
}

/** Required open pressure at the valve */
function requiredOpenPressure(
  effectiveMassGrams: number,
  maxRPM: number,
  liftInches: number,
  durationAt050: number,
  aggressiveness: number,
): number {
  // Simplified nose acceleration model:
  //   acceleration ≈ (lift * (RPM * 6)^2) / (duration_seconds/2)^2
  //   but we use a practical heuristic validated against published data.
  //
  // The key insight: inertia force = mass * accel, and accel ∝ RPM^2 * lift / duration^2
  // We scale by aggressiveness (cam profile shape factor)
  const effectiveMassLbs = effectiveMassGrams / 453.6;
  const omega = (maxRPM * 2 * Math.PI) / 60; // rad/s for one crank revolution
  // Convert duration at 0.050 to approximate ramp duration in radians
  // The nose region is roughly 40% of the total duration
  const durationRad = (durationAt050 * Math.PI) / 180;
  const noseRad = durationRad * 0.4;
  // Peak acceleration at nose ≈ lift / (noseRad / omega)^2 * shape factor
  const noseTime = noseRad / (omega / 2); // time for cam nose (divide omega by 2 since cam turns at half crank speed)
  if (noseTime <= 0) return 0;
  const peakAccel = liftInches / (noseTime * noseTime) * (0.5 + aggressiveness * 0.8);
  // Inertia force = mass * accel / 386.4 (gravity conversion for lbs-in system)
  const inertiaForce = effectiveMassLbs * peakAccel;
  // Required spring force at nose = inertia force * safety factor (1.3)
  return inertiaForce * 1.3;
}

/** Effective valvetrain mass at the valve (grams) */
function effectiveValvetrainMass(
  valveWeight: number,
  retainerWeight: number,
  lockWeight: number,
  springMass: number,
  rockerWeight: number,
  rockerRatio: number,
): number {
  // Components at the valve side: valve + retainer + locks + 1/2 spring mass
  // Rocker contribution: 1/3 of rocker mass * ratio^2 (reflected to valve side)
  const valveSide = valveWeight + retainerWeight + lockWeight + springMass * 0.5;
  const rockerContribution = rockerRatio > 0 ? rockerWeight * 0.33 * rockerRatio * rockerRatio : 0;
  return valveSide + rockerContribution;
}

/** Estimated valve float RPM — the RPM at which spring force can no longer control the valve */
function estimateValveFloatRPM(
  openPressureLbs: number,
  effectiveMassGrams: number,
  liftInches: number,
  durationAt050: number,
  aggressiveness: number,
): number {
  // Binary search for the RPM where required open pressure equals available open pressure
  let lo = 2000;
  let hi = 15000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const required = requiredOpenPressure(effectiveMassGrams, mid, liftInches, durationAt050, aggressiveness);
    if (required < openPressureLbs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round((lo + hi) / 2 / 50) * 50; // round to nearest 50 RPM
}

/** Generate spring force vs inertia force data across RPM range */
function generateForceVsRPMData(
  seatPressure: number,
  springRate: number,
  liftInches: number,
  effectiveMassGrams: number,
  durationAt050: number,
  aggressiveness: number,
  maxRPMRange: number,
): { rpm: number; springForce: number; inertiaForce: number }[] {
  const openPressure = seatPressure + springRate * liftInches;
  const data: { rpm: number; springForce: number; inertiaForce: number }[] = [];
  const step = 250;
  for (let rpm = 2000; rpm <= maxRPMRange; rpm += step) {
    const inertiaForce = requiredOpenPressure(effectiveMassGrams, rpm, liftInches, durationAt050, aggressiveness) / 1.3; // remove safety factor for raw comparison
    data.push({
      rpm,
      springForce: openPressure,
      inertiaForce: Math.round(inertiaForce),
    });
  }
  return data;
}

/* ══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════════ */

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-0.5">{children}</p>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
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
      {open && <div className="p-5 bg-white space-y-5">{children}</div>}
    </div>
  );
}

function ResultRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex justify-between items-start gap-2 py-2 border-b border-white/10 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="text-right">
        <span className={`font-bold ${color || "text-white"}`}>{value}</span>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </div>
    </div>
  );
}

function StatusBanner({ label, message, level }: { label: string; message: string; level: "green" | "yellow" | "red" }) {
  const colors = {
    green:  "bg-green-50 border-green-300 text-green-700",
    yellow: "bg-yellow-50 border-yellow-300 text-yellow-700",
    red:    "bg-red-50 border-red-300 text-red-700",
  };
  return (
    <div className={`rounded-xl border-2 p-5 ${colors[level]}`}>
      <div className="text-2xl font-black mb-1">{label}</div>
      <div className="text-sm font-medium">{message}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function ValvetrainBuilderCalculator() {
  /* ── Mode ────────────────────────────────────────────────────── */
  const [mode, setMode] = useState<CalcMode>("cam-to-spring");

  /* ── Engine platform ────────────────────────────────────────── */
  const [platform, setPlatform] = useState("sbc");
  const preset = ENGINE_PRESETS[platform] || ENGINE_PRESETS.custom;

  /* ── Cam inputs ─────────────────────────────────────────────── */
  const [camType, setCamType] = useState<CamType>("hyd-flat");
  const [lobeLiftInt, setLobeLiftInt] = useState("0.300");
  const [lobeLiftExh, setLobeLiftExh] = useState("0.300");
  const [durationInt, setDurationInt] = useState("212");
  const [durationExh, setDurationExh] = useState("218");
  const [liftInputMode, setLiftInputMode] = useState<"lobe" | "valve">("lobe");

  /* ── Rocker ─────────────────────────────────────────────────── */
  const [rockerPreset, setRockerPreset] = useState(preset.stockRockerRatio.toFixed(3));
  const [customRatio, setCustomRatio] = useState(preset.stockRockerRatio.toFixed(3));
  const [rockerWeightOverride, setRockerWeightOverride] = useState("");

  /* ── Lifter type / lash ─────────────────────────────────────── */
  const [lifterType, setLifterType] = useState<"hydraulic" | "solid">("hydraulic");
  const [lashInt, setLashInt] = useState("0.016");
  const [lashExh, setLashExh] = useState("0.020");

  /* ── Component weights ──────────────────────────────────────── */
  const [valveMaterial, setValveMaterial] = useState<ValveMaterial>("stainless");
  const [retainerMaterial, setRetainerMaterial] = useState<RetainerMaterial>("steel");
  const [valveWeightIntOverride, setValveWeightIntOverride] = useState("");
  const [valveWeightExhOverride, setValveWeightExhOverride] = useState("");
  const [retainerWeightOverride, setRetainerWeightOverride] = useState("");
  const [showWeightOverrides, setShowWeightOverrides] = useState(false);

  /* ── Target RPM ─────────────────────────────────────────────── */
  const [targetRPM, setTargetRPM] = useState("6000");

  /* ── Spring type ────────────────────────────────────────────── */
  const [springType, setSpringType] = useState<SpringType>(preset.defaultSpringType);

  /* ── Reverse mode: spring inputs ────────────────────────────── */
  const [revSeatPressure, setRevSeatPressure] = useState("130");
  const [revOpenPressure, setRevOpenPressure] = useState("340");
  const [revInstalledHeight, setRevInstalledHeight] = useState("1.800");
  const [revCoilBindHeight, setRevCoilBindHeight] = useState("1.150");

  /* ── Spring spec inputs (forward mode) ──────────────────────── */
  const [springSeatPressure, setSpringSeatPressure] = useState("");
  const [springRateInput, setSpringRateInput] = useState("");
  const [springInstalledHeight, setSpringInstalledHeight] = useState("1.800");
  const [springCoilBindHeight, setSpringCoilBindHeight] = useState("1.150");

  /* ── Derived values ─────────────────────────────────────────── */
  const rockerRatio = rockerPreset === "custom"
    ? (parseFloat(customRatio) || 1.5)
    : (parseFloat(rockerPreset) || 1.5);

  const rockerWeight = rockerWeightOverride
    ? (parseFloat(rockerWeightOverride) || preset.stockRockerWeight)
    : preset.stockRockerWeight;

  const lashValInt = lifterType === "solid" ? (parseFloat(lashInt) || 0) : 0;
  const lashValExh = lifterType === "solid" ? (parseFloat(lashExh) || 0) : 0;

  const lobeLiftIntV = parseFloat(lobeLiftInt) || 0;
  const lobeLiftExhV = parseFloat(lobeLiftExh) || 0;

  // Net valve lift
  const valveLiftInt = liftInputMode === "lobe"
    ? netValveLift(lobeLiftIntV, rockerRatio, lashValInt)
    : lobeLiftIntV - lashValInt;
  const valveLiftExh = liftInputMode === "lobe"
    ? netValveLift(lobeLiftExhV, rockerRatio, lashValExh)
    : lobeLiftExhV - lashValExh;

  const maxValveLift = Math.max(valveLiftInt, valveLiftExh);

  const durationIntV = parseFloat(durationInt) || 0;
  const durationExhV = parseFloat(durationExh) || 0;
  const maxDuration = Math.max(durationIntV, durationExhV);

  const targetRPMv = parseFloat(targetRPM) || 6000;

  // Component weights with material adjustments
  const valveFactorInt = VALVE_MATERIAL_FACTOR[valveMaterial].factor;
  const valveFactorExh = valveMaterial === "inconel" ? VALVE_MATERIAL_FACTOR.inconel.factor : valveFactorInt;
  const retainerFactor = RETAINER_MATERIAL_FACTOR[retainerMaterial].factor;

  const valveWtInt = valveWeightIntOverride
    ? (parseFloat(valveWeightIntOverride) || preset.valveWeightInt)
    : preset.valveWeightInt * valveFactorInt;
  const valveWtExh = valveWeightExhOverride
    ? (parseFloat(valveWeightExhOverride) || preset.valveWeightExh)
    : preset.valveWeightExh * valveFactorExh;
  const retainerWt = retainerWeightOverride
    ? (parseFloat(retainerWeightOverride) || preset.retainerWeight)
    : preset.retainerWeight * retainerFactor;
  const lockWt = preset.lockWeight;
  const springMass = SPRING_MASS_GRAMS[springType];

  // Effective mass (use intake side — typically heavier valve)
  const effectiveMass = effectiveValvetrainMass(
    valveWtInt, retainerWt, lockWt, springMass, rockerWeight, rockerRatio
  );

  const camSpec = CAM_TYPES[camType];

  /* ══════════════════════════════════════════════════════════════
     FORWARD MODE: cam → spring requirements
     ══════════════════════════════════════════════════════════════ */
  const forwardResults = useMemo(() => {
    if (mode !== "cam-to-spring" || maxValveLift <= 0 || maxDuration <= 0) return null;

    const reqOpen = requiredOpenPressure(
      effectiveMass, targetRPMv, maxValveLift, maxDuration, camSpec.typicalAggressiveness
    );

    // Minimum open pressure: max of RPM-based requirement and cam type minimum
    const minOpen = Math.max(reqOpen, camSpec.openMin);

    // Derive seat pressure: assume a typical spring rate to back-calculate
    // Use a conservative approach: seat pressure should be within cam type range
    const targetSeatMin = camSpec.seatMin;
    const targetSeatMax = camSpec.seatMax;
    const targetSeatMid = (targetSeatMin + targetSeatMax) / 2;

    // Required spring rate to achieve the open pressure from the seat pressure
    const reqRate = maxValveLift > 0 ? (minOpen - targetSeatMid) / maxValveLift : 0;

    // Coil bind: recommend minimum installed height
    const safetyMargin = 0.060;
    const minSpringTravel = maxValveLift + safetyMargin;

    return {
      requiredOpenPressure: Math.round(minOpen),
      recommendedSeatMin: Math.round(targetSeatMin),
      recommendedSeatMax: Math.round(targetSeatMax),
      requiredSpringRate: Math.round(reqRate),
      minSpringTravel,
      effectiveMass: Math.round(effectiveMass),
      valveLiftInt: valveLiftInt,
      valveLiftExh: valveLiftExh,
    };
  }, [mode, maxValveLift, maxDuration, effectiveMass, targetRPMv, camSpec, valveLiftInt, valveLiftExh]);

  /* ── Forward mode: optional spring spec check ───────────────── */
  const springCheck = useMemo(() => {
    if (mode !== "cam-to-spring") return null;
    const seat = parseFloat(springSeatPressure) || 0;
    const rate = parseFloat(springRateInput) || 0;
    const ih = parseFloat(springInstalledHeight) || 0;
    const cbh = parseFloat(springCoilBindHeight) || 0;

    if (seat <= 0 || rate <= 0 || maxValveLift <= 0) return null;

    const openP = seat + rate * maxValveLift;
    const compressedH = ih - maxValveLift;
    const bindClearance = compressedH - cbh;
    const floatRPM = estimateValveFloatRPM(
      openP, effectiveMass, maxValveLift, maxDuration, camSpec.typicalAggressiveness
    );

    // Pressure checks
    const seatOk = seat >= camSpec.seatMin && seat <= camSpec.seatMax;
    const openOk = openP >= (forwardResults?.requiredOpenPressure || camSpec.openMin);
    const bindOk = ih > 0 && cbh > 0 ? bindClearance >= 0.060 : true;
    const rpmOk = floatRPM > targetRPMv * 1.1; // 10% safety margin above target

    // RPM chart data
    const chartMax = Math.max(targetRPMv + 2000, floatRPM + 1500);
    const chartData = generateForceVsRPMData(
      seat, rate, maxValveLift, effectiveMass, maxDuration, camSpec.typicalAggressiveness,
      Math.min(chartMax, 12000)
    );

    return {
      openPressure: Math.round(openP),
      seatPressure: Math.round(seat),
      bindClearance: ih > 0 && cbh > 0 ? bindClearance : null,
      floatRPM,
      seatOk, openOk, bindOk, rpmOk,
      chartData,
      chartMax: Math.min(chartMax, 12000),
    };
  }, [mode, springSeatPressure, springRateInput, springInstalledHeight, springCoilBindHeight,
      maxValveLift, maxDuration, effectiveMass, camSpec, targetRPMv, forwardResults]);

  /* ══════════════════════════════════════════════════════════════
     REVERSE MODE: spring → cam envelope
     ══════════════════════════════════════════════════════════════ */
  const reverseResults = useMemo(() => {
    if (mode !== "spring-to-cam") return null;
    const seat = parseFloat(revSeatPressure) || 0;
    const open = parseFloat(revOpenPressure) || 0;
    const ih = parseFloat(revInstalledHeight) || 0;
    const cbh = parseFloat(revCoilBindHeight) || 0;

    if (seat <= 0 || open <= 0) return null;

    // Spring rate from seat/open and an assumed lift
    // We need to determine what lift range these springs support
    const safetyMargin = 0.060;
    const maxLiftFromBind = ih > 0 && cbh > 0 ? ih - cbh - safetyMargin : 999;

    // For each potential lift, what's the spring rate?
    // We'll check lifts from 0.350 to 0.700 in 0.025 steps
    const liftEnvelope: { lift: number; rate: number; maxRPM: number; camTypes: string[] }[] = [];

    for (let lift = 0.350; lift <= 0.700; lift += 0.025) {
      if (lift > maxLiftFromBind) break;

      // At this lift, what's the actual rate needed?
      const rate = (open - seat) / lift;

      // What RPM can this spring support at this lift?
      // Test with common durations (210-260 at 0.050)
      const testDuration = 220; // middle ground
      const floatRPM = estimateValveFloatRPM(
        open, effectiveMass, lift, testDuration, 0.5
      );

      // Which cam types match this pressure range?
      const matchingTypes: string[] = [];
      for (const [, spec] of Object.entries(CAM_TYPES)) {
        if (seat >= spec.seatMin * 0.85 && seat <= spec.seatMax * 1.15 &&
            open >= spec.openMin * 0.85 && open <= spec.openMax * 1.15) {
          matchingTypes.push(spec.label);
        }
      }

      liftEnvelope.push({
        lift: parseFloat(lift.toFixed(3)),
        rate: Math.round(rate),
        maxRPM: floatRPM,
        camTypes: matchingTypes,
      });
    }

    // Maximum safe lift from coil bind
    const maxSafeLift = Math.min(maxLiftFromBind, 0.700);

    // Matching cam types based on pressure
    const matchingCamTypes: string[] = [];
    for (const [, spec] of Object.entries(CAM_TYPES)) {
      if (seat >= spec.seatMin * 0.85 && seat <= spec.seatMax * 1.15 &&
          open >= spec.openMin * 0.85 && open <= spec.openMax * 1.15) {
        matchingCamTypes.push(spec.label);
      }
    }

    // Warning: over-sprung for flat tappet
    const flatTappetWarn = seat > 130;

    return {
      maxSafeLift: parseFloat(maxSafeLift.toFixed(3)),
      maxLiftFromBind: parseFloat(maxLiftFromBind.toFixed(3)),
      liftEnvelope,
      matchingCamTypes,
      flatTappetWarn,
      springRate: maxSafeLift > 0 ? Math.round((open - seat) / maxSafeLift) : 0,
    };
  }, [mode, revSeatPressure, revOpenPressure, revInstalledHeight, revCoilBindHeight, effectiveMass]);

  /* ── Warnings ───────────────────────────────────────────────── */
  const warnings: { text: string; level: "red" | "yellow" }[] = [];

  if (mode === "cam-to-spring" && forwardResults) {
    if (camType === "hyd-flat" && forwardResults.requiredOpenPressure > 280) {
      warnings.push({
        text: "High open pressure for a hydraulic flat tappet cam. Spring pressures above ~280 lbs open will accelerate cam lobe wear. Consider switching to a roller cam or reducing RPM target.",
        level: "red",
      });
    }
    if (camType === "hyd-flat" && forwardResults.recommendedSeatMax > CAM_TYPES["hyd-flat"].maxSeatWarn) {
      warnings.push({
        text: `Seat pressure above ${CAM_TYPES["hyd-flat"].maxSeatWarn} lbs on a flat tappet cam risks premature lobe wear. Use proper break-in oil (high ZDDP) and verify lifter preload.`,
        level: "yellow",
      });
    }
    if (maxValveLift > 0.600 && springType === "single") {
      warnings.push({
        text: "Valve lift above 0.600\" typically requires dual springs for adequate control. Single springs may not have enough travel or rate at this lift.",
        level: "yellow",
      });
    }
    if (targetRPMv > 7000 && (springType === "single" || springType === "single-beehive")) {
      warnings.push({
        text: "RPM targets above 7000 generally require dual or triple springs for adequate valve control. Single/beehive springs may reach their rate limit.",
        level: "yellow",
      });
    }
    if (springCheck && !springCheck.rpmOk) {
      warnings.push({
        text: `Estimated valve float at ${springCheck.floatRPM.toLocaleString()} RPM is too close to your ${targetRPMv.toLocaleString()} RPM target. You need springs with higher open pressure or lighter valvetrain components.`,
        level: "red",
      });
    }
    if (springCheck && springCheck.bindClearance !== null && !springCheck.bindOk) {
      warnings.push({
        text: `Coil bind clearance is only ${springCheck.bindClearance.toFixed(3)}". Minimum safe clearance is 0.060". The valve cannot open to full lift with this spring — use a spring with more travel or reduce lift.`,
        level: "red",
      });
    }
    if (springCheck && !springCheck.seatOk) {
      const dir = (parseFloat(springSeatPressure) || 0) < camSpec.seatMin ? "below" : "above";
      warnings.push({
        text: `Seat pressure is ${dir} the recommended range (${camSpec.seatMin}-${camSpec.seatMax} lbs) for a ${camSpec.label} cam.`,
        level: dir === "below" ? "red" : "yellow",
      });
    }
  }

  if (mode === "spring-to-cam" && reverseResults) {
    if (reverseResults.flatTappetWarn) {
      warnings.push({
        text: "These spring pressures exceed safe limits for hydraulic flat tappet cams (seat > 130 lbs). Only use with roller or solid flat tappet cams.",
        level: "yellow",
      });
    }
    if (reverseResults.maxLiftFromBind < 0.400) {
      warnings.push({
        text: `Maximum safe lift is only ${reverseResults.maxLiftFromBind.toFixed(3)}" before coil bind. This severely limits cam selection. Consider springs with more available travel.`,
        level: "red",
      });
    }
    if (reverseResults.matchingCamTypes.length === 0) {
      warnings.push({
        text: "These spring pressures don't match any standard cam type range. Verify your seat and open pressure values.",
        level: "red",
      });
    }
  }

  /* ── Apply engine preset ────────────────────────────────────── */
  function applyPreset(key: string) {
    setPlatform(key);
    const p = ENGINE_PRESETS[key];
    if (!p) return;
    setRockerPreset(p.stockRockerRatio.toFixed(3));
    setCustomRatio(p.stockRockerRatio.toFixed(3));
    setRockerWeightOverride("");
    setValveWeightIntOverride("");
    setValveWeightExhOverride("");
    setRetainerWeightOverride("");
    setSpringType(p.defaultSpringType);
    // Reset lifter type based on cam
    if (camType === "hyd-flat" || camType === "hyd-roller") {
      setLifterType("hydraulic");
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-4 space-y-5 pb-12">
        <div>
          <SEOHead
            title="Valvetrain RPM Builder Calculator"
            description="Dynamic engine valvetrain calculator. Enter your cam, rockers, and target RPM to get valve spring requirements — or enter your springs to find what cams they support. Valve float estimation, coil bind check, pressure validation, and RPM safety graph."
            canonical="/calculators/valvetrain-builder"
            keywords="valvetrain calculator, valve spring selector, cam spring match, valve float calculator, engine RPM calculator, rocker ratio calculator, valve spring pressure, coil bind, cam selection, engine build calculator"
          />
          <h1 className="text-3xl font-bold mb-1">Valvetrain RPM Builder</h1>
          <p className="text-sm text-muted-foreground">
            Match your cam, rockers, springs, and target RPM as a complete system.
            Change any parameter and see how it ripples through the entire valvetrain.
          </p>
        </div>

        {/* ── Mode Toggle ─────────────────────────────────────── */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("cam-to-spring")}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${
              mode === "cam-to-spring"
                ? "border-[#E85D04] bg-[#E85D04]/10 text-[#E85D04]"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            I have a cam {"\u2192"} find springs
          </button>
          <button
            onClick={() => setMode("spring-to-cam")}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${
              mode === "spring-to-cam"
                ? "border-[#E85D04] bg-[#E85D04]/10 text-[#E85D04]"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            I have springs {"\u2192"} find cam limits
          </button>
        </div>

        {mode === "cam-to-spring" && (
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-sm text-blue-800">
            <strong>How it works:</strong> Enter your cam specs, rocker ratio, and target RPM. The calculator determines what spring pressures, rates, and travel your valvetrain needs — then validates a specific spring if you have one in mind.
          </div>
        )}

        {mode === "spring-to-cam" && (
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-sm text-blue-800">
            <strong>Reverse mode:</strong> Enter the springs you already have. The calculator shows what range of cam lift, duration, and RPM your springs can safely handle — and which cam types are compatible with your seat and open pressures.
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 1: Engine Platform
            ══════════════════════════════════════════════════════ */}
        <Section title="1 — Engine Platform">
          <Field label="Engine Family" hint="Auto-fills valve weights, retainer weights, rocker ratio, and stem diameter. You can override any value.">
            <Select value={platform} onValueChange={applyPreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ENGINE_PRESETS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {platform !== "custom" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-2 rounded border bg-gray-50 text-center">
                <div className="text-xs text-gray-500">Intake Valve</div>
                <div className="font-bold">{Math.round(preset.valveWeightInt * valveFactorInt)}g</div>
              </div>
              <div className="p-2 rounded border bg-gray-50 text-center">
                <div className="text-xs text-gray-500">Exhaust Valve</div>
                <div className="font-bold">{Math.round(preset.valveWeightExh * valveFactorExh)}g</div>
              </div>
              <div className="p-2 rounded border bg-gray-50 text-center">
                <div className="text-xs text-gray-500">Retainer</div>
                <div className="font-bold">{Math.round(preset.retainerWeight * retainerFactor)}g</div>
              </div>
              <div className="p-2 rounded border bg-gray-50 text-center">
                <div className="text-xs text-gray-500">Stem</div>
                <div className="font-bold">{preset.stemDiameter}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Valve Material" hint="Affects valve weight. Titanium saves ~43% weight.">
              <Select value={valveMaterial} onValueChange={v => setValveMaterial(v as ValveMaterial)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(VALVE_MATERIAL_FACTOR) as [ValveMaterial, typeof VALVE_MATERIAL_FACTOR[ValveMaterial]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Retainer Material" hint="Affects retainer weight. Titanium saves ~55% weight.">
              <Select value={retainerMaterial} onValueChange={v => setRetainerMaterial(v as RetainerMaterial)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(RETAINER_MATERIAL_FACTOR) as [RetainerMaterial, typeof RETAINER_MATERIAL_FACTOR[RetainerMaterial]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Spring Type" hint="Affects spring mass and typical pressure range.">
            <Select value={springType} onValueChange={v => setSpringType(v as SpringType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(SPRING_TYPE_LABELS) as [SpringType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Weight overrides */}
          <button
            type="button"
            className="text-xs text-primary hover:underline font-medium"
            onClick={() => setShowWeightOverrides(o => !o)}
          >
            {showWeightOverrides ? "Hide weight overrides \u2191" : "Override component weights (if you've weighed your parts) \u2193"}
          </button>

          {showWeightOverrides && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
              <Field label="Intake Valve (grams)" hint={`Default: ${Math.round(preset.valveWeightInt * valveFactorInt)}g`}>
                <Input type="number" step="1" placeholder={String(Math.round(preset.valveWeightInt * valveFactorInt))} value={valveWeightIntOverride} onChange={e => setValveWeightIntOverride(e.target.value)} />
              </Field>
              <Field label="Exhaust Valve (grams)" hint={`Default: ${Math.round(preset.valveWeightExh * valveFactorExh)}g`}>
                <Input type="number" step="1" placeholder={String(Math.round(preset.valveWeightExh * valveFactorExh))} value={valveWeightExhOverride} onChange={e => setValveWeightExhOverride(e.target.value)} />
              </Field>
              <Field label="Retainer (grams)" hint={`Default: ${Math.round(preset.retainerWeight * retainerFactor)}g`}>
                <Input type="number" step="1" placeholder={String(Math.round(preset.retainerWeight * retainerFactor))} value={retainerWeightOverride} onChange={e => setRetainerWeightOverride(e.target.value)} />
              </Field>
            </div>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════
            SECTION 2: Rocker Arms
            ══════════════════════════════════════════════════════ */}
        <Section title="2 — Rocker Arms">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Rocker Ratio" hint="Higher ratio = more lift = more spring demand. Each 0.1 increase raises effective mass at the valve.">
              <Select value={rockerPreset} onValueChange={v => { setRockerPreset(v); if (v !== "custom") setPlatform("custom"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROCKER_PRESETS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {rockerPreset === "custom" && (
              <Field label="Custom Ratio">
                <Input type="number" step="0.01" value={customRatio} onChange={e => setCustomRatio(e.target.value)} />
              </Field>
            )}
            <Field label="Rocker Arm Weight (grams, optional)" hint={`Default: ${preset.stockRockerWeight}g (stock). Full roller = ~130-180g, shaft mount = ~200-280g`}>
              <Input type="number" step="1" placeholder={String(preset.stockRockerWeight)} value={rockerWeightOverride} onChange={e => setRockerWeightOverride(e.target.value)} />
            </Field>
          </div>

          {/* Rocker ratio impact display */}
          {rockerRatio !== preset.stockRockerRatio && platform !== "custom" && (
            <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-sm text-yellow-800">
              Changing rocker ratio from {preset.stockRockerRatio}:1 to {rockerRatio}:1 increases valve lift
              by {((rockerRatio / preset.stockRockerRatio - 1) * 100).toFixed(1)}% and raises the effective
              valvetrain mass at the valve by {((rockerRatio * rockerRatio / (preset.stockRockerRatio * preset.stockRockerRatio) - 1) * 100).toFixed(1)}% (ratio{"\u00B2"} effect on rocker contribution).
            </div>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════
            SECTION 3: Camshaft (forward mode) or Springs (reverse)
            ══════════════════════════════════════════════════════ */}
        {mode === "cam-to-spring" ? (
          <>
            <Section title="3 — Camshaft Specs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Cam Type" hint="Determines safe pressure ranges and lobe wear limits.">
                  <Select value={camType} onValueChange={v => {
                    setCamType(v as CamType);
                    setLifterType(v.startsWith("hyd") ? "hydraulic" : "solid");
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(CAM_TYPES) as [CamType, CamTypeSpec][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Lift values are listed as:">
                  <Select value={liftInputMode} onValueChange={v => setLiftInputMode(v as "lobe" | "valve")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lobe">Cam lobe lift (will multiply by rocker ratio)</SelectItem>
                      <SelectItem value="valve">Valve lift (already includes rocker ratio)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={liftInputMode === "lobe" ? "Intake Lobe Lift (inches)" : "Intake Valve Lift (inches)"} hint="From your cam card">
                  <Input type="number" step="0.001" value={lobeLiftInt} onChange={e => setLobeLiftInt(e.target.value)} />
                </Field>
                <Field label={liftInputMode === "lobe" ? "Exhaust Lobe Lift (inches)" : "Exhaust Valve Lift (inches)"} hint="From your cam card">
                  <Input type="number" step="0.001" value={lobeLiftExh} onChange={e => setLobeLiftExh(e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label='Intake Duration at 0.050" (degrees)' hint="Industry-standard measurement from cam card">
                  <Input type="number" step="1" value={durationInt} onChange={e => setDurationInt(e.target.value)} />
                </Field>
                <Field label='Exhaust Duration at 0.050" (degrees)'>
                  <Input type="number" step="1" value={durationExh} onChange={e => setDurationExh(e.target.value)} />
                </Field>
              </div>

              {lifterType === "solid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Intake Valve Lash (inches)" hint="Hot lash from cam card. Typical: 0.012\u20130.024 in">
                    <Input type="number" step="0.001" value={lashInt} onChange={e => setLashInt(e.target.value)} />
                  </Field>
                  <Field label="Exhaust Valve Lash (inches)" hint="Typical: 0.016\u20130.028 in">
                    <Input type="number" step="0.001" value={lashExh} onChange={e => setLashExh(e.target.value)} />
                  </Field>
                </div>
              )}

              {/* Computed lift display */}
              {(lobeLiftIntV > 0 || lobeLiftExhV > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-gray-50 text-center">
                    <div className="text-xs text-gray-500">Net Intake Valve Lift</div>
                    <div className="text-xl font-bold">{valveLiftInt.toFixed(3)}"</div>
                    {liftInputMode === "lobe" && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {lobeLiftIntV.toFixed(3)} {"\u00D7"}{rockerRatio.toFixed(3)}{lashValInt > 0 ? ` - ${lashValInt.toFixed(3)}` : ""} = {valveLiftInt.toFixed(3)}
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded-lg border bg-gray-50 text-center">
                    <div className="text-xs text-gray-500">Net Exhaust Valve Lift</div>
                    <div className="text-xl font-bold">{valveLiftExh.toFixed(3)}"</div>
                    {liftInputMode === "lobe" && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {lobeLiftExhV.toFixed(3)} {"\u00D7"}{rockerRatio.toFixed(3)}{lashValExh > 0 ? ` - ${lashValExh.toFixed(3)}` : ""} = {valveLiftExh.toFixed(3)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* ── Target RPM ──────────────────────────────────── */}
            <Section title="4 — Target RPM">
              <Field label="Maximum Intended RPM" hint="The highest RPM you plan to spin the engine. The valvetrain must maintain control at this speed with a 10% safety margin.">
                <Input type="number" step="100" value={targetRPM} onChange={e => setTargetRPM(e.target.value)} />
              </Field>
              {targetRPMv > 7500 && (
                <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-sm text-yellow-800">
                  RPM targets above 7500 require careful attention to every gram of valvetrain weight.
                  Titanium retainers, lightweight valves, and high-quality springs become critical.
                </div>
              )}
            </Section>

            {/* ══════════════════════════════════════════════════
                RESULTS: Spring Requirements
                ══════════════════════════════════════════════════ */}
            {forwardResults && (
              <>
                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-[#E85D04]" />
                      Spring Requirements for Your Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <ResultRow
                      label="Minimum Open Pressure"
                      value={`${forwardResults.requiredOpenPressure} lbs`}
                      sub={`At ${maxValveLift.toFixed(3)}" valve lift`}
                      color="text-[#E85D04]"
                    />
                    <ResultRow
                      label="Recommended Seat Pressure"
                      value={`${forwardResults.recommendedSeatMin} - ${forwardResults.recommendedSeatMax} lbs`}
                      sub={`Range for ${camSpec.label}`}
                    />
                    <ResultRow
                      label="Minimum Spring Rate"
                      value={`${forwardResults.requiredSpringRate} lb/in`}
                      sub="To achieve open pressure from mid-range seat"
                    />
                    <ResultRow
                      label="Minimum Spring Travel"
                      value={`${forwardResults.minSpringTravel.toFixed(3)}"`}
                      sub='Max lift + 0.060" coil bind margin'
                    />
                    <ResultRow
                      label="Effective Valvetrain Mass"
                      value={`${forwardResults.effectiveMass}g`}
                      sub={`${(forwardResults.effectiveMass / 28.35).toFixed(1)} oz at the valve`}
                    />
                  </CardContent>
                </Card>

                {/* ── Validate a specific spring ──────────────── */}
                <Section title="5 — Validate a Specific Spring (optional)">
                  <p className="text-sm text-muted-foreground mb-4">
                    Have a specific spring in mind? Enter its specs to see if it meets your requirements.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Seat Pressure (lbs)" hint="From spring spec card at installed height">
                      <Input type="number" step="1" placeholder="e.g. 130" value={springSeatPressure} onChange={e => setSpringSeatPressure(e.target.value)} />
                    </Field>
                    <Field label="Spring Rate (lb/in)" hint="From spring spec card, or calculate: (open-seat)/lift">
                      <Input type="number" step="1" placeholder="e.g. 340" value={springRateInput} onChange={e => setSpringRateInput(e.target.value)} />
                    </Field>
                    <Field label="Installed Height (inches)" hint="Height when assembled on the head">
                      <Input type="number" step="0.001" value={springInstalledHeight} onChange={e => setSpringInstalledHeight(e.target.value)} />
                    </Field>
                    <Field label="Coil Bind Height (inches)" hint="From spring manufacturer datasheet">
                      <Input type="number" step="0.001" value={springCoilBindHeight} onChange={e => setSpringCoilBindHeight(e.target.value)} />
                    </Field>
                  </div>

                  {springCheck && (
                    <div className="space-y-4 mt-4">
                      {/* Pass/fail grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`p-3 rounded-lg border text-center ${springCheck.seatOk ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                          <div className="text-xs text-gray-500 mb-1">Seat Pressure</div>
                          <div className={`text-lg font-bold ${springCheck.seatOk ? "text-green-700" : "text-red-700"}`}>
                            {springCheck.seatPressure} lbs
                          </div>
                          <div className={`text-xs font-semibold ${springCheck.seatOk ? "text-green-600" : "text-red-600"}`}>
                            {springCheck.seatOk ? "PASS" : "FAIL"}
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg border text-center ${springCheck.openOk ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                          <div className="text-xs text-gray-500 mb-1">Open Pressure</div>
                          <div className={`text-lg font-bold ${springCheck.openOk ? "text-green-700" : "text-red-700"}`}>
                            {springCheck.openPressure} lbs
                          </div>
                          <div className={`text-xs font-semibold ${springCheck.openOk ? "text-green-600" : "text-red-600"}`}>
                            {springCheck.openOk ? "PASS" : `NEED ${forwardResults.requiredOpenPressure}+`}
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg border text-center ${springCheck.bindOk ? "bg-green-50 border-green-300" : springCheck.bindClearance === null ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-300"}`}>
                          <div className="text-xs text-gray-500 mb-1">Coil Bind</div>
                          <div className={`text-lg font-bold ${springCheck.bindOk ? "text-green-700" : springCheck.bindClearance === null ? "text-gray-400" : "text-red-700"}`}>
                            {springCheck.bindClearance !== null ? `${springCheck.bindClearance.toFixed(3)}"` : "---"}
                          </div>
                          <div className={`text-xs font-semibold ${springCheck.bindOk ? "text-green-600" : springCheck.bindClearance === null ? "text-gray-400" : "text-red-600"}`}>
                            {springCheck.bindClearance !== null ? (springCheck.bindOk ? "SAFE" : "BIND RISK") : "N/A"}
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg border text-center ${springCheck.rpmOk ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                          <div className="text-xs text-gray-500 mb-1">Valve Float RPM</div>
                          <div className={`text-lg font-bold ${springCheck.rpmOk ? "text-green-700" : "text-red-700"}`}>
                            {springCheck.floatRPM.toLocaleString()}
                          </div>
                          <div className={`text-xs font-semibold ${springCheck.rpmOk ? "text-green-600" : "text-red-600"}`}>
                            {springCheck.rpmOk ? `${Math.round((springCheck.floatRPM / targetRPMv - 1) * 100)}% margin` : "TOO LOW"}
                          </div>
                        </div>
                      </div>

                      {/* RPM Safety Chart */}
                      <Card>
                        <CardHeader><CardTitle>Spring Force vs. Inertia Force</CardTitle></CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground mb-3">
                            Valve float occurs where the inertia force curve crosses above the spring force line.
                            Your target RPM should be well below the crossover point.
                          </p>
                          <div className="overflow-x-auto -mx-2">
                            <div className="min-w-[500px]">
                              <ResponsiveContainer width="100%" height={300}>
                                <ComposedChart data={springCheck.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis
                                    dataKey="rpm"
                                    label={{ value: "Engine RPM", position: "insideBottom", offset: -5, fontSize: 12 }}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                                  />
                                  <YAxis
                                    label={{ value: "Force (lbs)", angle: -90, position: "insideLeft", offset: 5, fontSize: 12 }}
                                    tick={{ fontSize: 11 }}
                                  />
                                  <Tooltip
                                    formatter={(value: number, name: string) => [
                                      `${value} lbs`,
                                      name === "springForce" ? "Spring Open Force" : "Inertia Force",
                                    ]}
                                    labelFormatter={(label: number) => `${label.toLocaleString()} RPM`}
                                    contentStyle={{ fontSize: 12 }}
                                  />
                                  <ReferenceLine
                                    x={targetRPMv}
                                    stroke="#E85D04"
                                    strokeWidth={2}
                                    strokeDasharray="6 3"
                                    label={{ value: `Target: ${targetRPMv.toLocaleString()}`, position: "top", fontSize: 10, fill: "#E85D04" }}
                                  />
                                  <ReferenceLine
                                    x={springCheck.floatRPM}
                                    stroke="#dc2626"
                                    strokeWidth={2}
                                    strokeDasharray="6 3"
                                    label={{ value: `Float: ~${springCheck.floatRPM.toLocaleString()}`, position: "top", fontSize: 10, fill: "#dc2626" }}
                                  />
                                  <Line type="monotone" dataKey="springForce" stroke="#22c55e" strokeWidth={2.5} dot={false} name="springForce" />
                                  <Area type="monotone" dataKey="inertiaForce" stroke="#dc2626" strokeWidth={2} fill="#dc2626" fillOpacity={0.08} dot={false} name="inertiaForce" />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className="w-4 h-0.5 bg-[#22c55e] inline-block" /> Spring Open Force
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-4 h-0.5 bg-[#dc2626] inline-block" /> Inertia Force
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#E85D04] inline-block" /> Target RPM
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </Section>
              </>
            )}
          </>
        ) : (
          /* ══════════════════════════════════════════════════════
             REVERSE MODE: Spring → Cam Envelope
             ══════════════════════════════════════════════════════ */
          <>
            <Section title="3 — Your Spring Specs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Seat Pressure (lbs)" hint="Pressure at installed height from spring spec card">
                  <Input type="number" step="1" value={revSeatPressure} onChange={e => setRevSeatPressure(e.target.value)} />
                </Field>
                <Field label="Open Pressure (lbs)" hint="Pressure at max rated lift from spring spec card">
                  <Input type="number" step="1" value={revOpenPressure} onChange={e => setRevOpenPressure(e.target.value)} />
                </Field>
                <Field label="Installed Height (inches)" hint="Assembled height on the head">
                  <Input type="number" step="0.001" value={revInstalledHeight} onChange={e => setRevInstalledHeight(e.target.value)} />
                </Field>
                <Field label="Coil Bind Height (inches)" hint="From spring manufacturer datasheet">
                  <Input type="number" step="0.001" value={revCoilBindHeight} onChange={e => setRevCoilBindHeight(e.target.value)} />
                </Field>
              </div>
            </Section>

            {reverseResults && (
              <>
                {/* ── Overall status ───────────────────────────── */}
                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-[#E85D04]" />
                      What Your Springs Can Handle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <ResultRow
                      label="Maximum Safe Valve Lift"
                      value={`${reverseResults.maxSafeLift.toFixed(3)}"`}
                      sub='Installed height - coil bind - 0.060" margin'
                      color="text-[#E85D04]"
                    />
                    <ResultRow
                      label="Spring Rate"
                      value={`~${reverseResults.springRate} lb/in`}
                      sub="Derived from seat & open pressure at max lift"
                    />
                    <ResultRow
                      label="Compatible Cam Types"
                      value={reverseResults.matchingCamTypes.length > 0 ? reverseResults.matchingCamTypes.join(", ") : "None match"}
                      color={reverseResults.matchingCamTypes.length > 0 ? "text-green-400" : "text-red-400"}
                    />
                  </CardContent>
                </Card>

                {/* ── Cam lift/RPM envelope table ──────────────── */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cam Lift {"&"} RPM Envelope</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      For each potential valve lift, this shows the effective spring rate and estimated maximum RPM your springs can support.
                      Cells are color-coded: green = good margin, yellow = marginal, red = unsafe.
                    </p>
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Valve Lift</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Eff. Rate</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Est. Max RPM</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Cam Types</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reverseResults.liftEnvelope.map((row) => {
                            const rpmColor = row.maxRPM >= 7000 ? "text-green-700" : row.maxRPM >= 5500 ? "text-yellow-700" : "text-red-700";
                            return (
                              <tr key={row.lift} className="border-b hover:bg-gray-50">
                                <td className="px-3 py-1.5 font-mono font-bold">{row.lift.toFixed(3)}"</td>
                                <td className="px-3 py-1.5 text-right font-mono">{row.rate} lb/in</td>
                                <td className={`px-3 py-1.5 text-right font-bold ${rpmColor}`}>
                                  {row.maxRPM.toLocaleString()}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-gray-500">
                                  {row.camTypes.length > 0 ? row.camTypes.join(", ") : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Reverse mode: what cam lobe lift does that translate to? ── */}
                <div className="p-4 rounded-lg border bg-gray-50 text-sm space-y-2">
                  <p className="font-semibold text-gray-700">Converting to Cam Lobe Lift</p>
                  <p className="text-muted-foreground">
                    Your max safe valve lift of <strong>{reverseResults.maxSafeLift.toFixed(3)}"</strong> with
                    a <strong>{rockerRatio.toFixed(2)}:1</strong> rocker ratio means your cam lobe lift
                    should not exceed <strong>{(reverseResults.maxSafeLift / rockerRatio).toFixed(3)}"</strong>.
                  </p>
                  {lifterType === "solid" && (
                    <p className="text-muted-foreground">
                      Adding lash back ({lashValInt.toFixed(3)}" intake), the gross lobe lift limit
                      is <strong>{((reverseResults.maxSafeLift + lashValInt) / rockerRatio).toFixed(3)}"</strong>.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Warnings ──────────────────────────────────────── */}
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

        {/* ── Effective mass breakdown ─────────────────────── */}
        <Section title="Valvetrain Mass Breakdown" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-4">
            Every gram matters at high RPM. Inertia forces increase with the <strong>square</strong> of engine speed — doubling RPM quadruples the force trying to throw the valve off the cam.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
              <span className="text-gray-600">Intake Valve ({VALVE_MATERIAL_FACTOR[valveMaterial].label})</span>
              <span className="font-bold">{Math.round(valveWtInt)}g</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
              <span className="text-gray-600">Retainer ({RETAINER_MATERIAL_FACTOR[retainerMaterial].label})</span>
              <span className="font-bold">{Math.round(retainerWt)}g</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
              <span className="text-gray-600">Locks (pair)</span>
              <span className="font-bold">{lockWt}g</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
              <span className="text-gray-600">Spring mass contribution ({"\u00D7"}0.5)</span>
              <span className="font-bold">{Math.round(springMass * 0.5)}g <span className="text-xs text-gray-400">of {springMass}g</span></span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
              <span className="text-gray-600">Rocker contribution ({"\u00D7"}0.33 {"\u00D7"} ratio{"\u00B2"})</span>
              <span className="font-bold">{Math.round(rockerWeight * 0.33 * rockerRatio * rockerRatio)}g <span className="text-xs text-gray-400">of {rockerWeight}g</span></span>
            </div>
            <div className="flex justify-between py-2 text-sm border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">Total Effective Mass at Valve</span>
              <span className="font-bold text-[#E85D04] text-lg">{Math.round(effectiveMass)}g <span className="text-sm text-gray-500">({(effectiveMass / 28.35).toFixed(1)} oz)</span></span>
            </div>
          </div>

          {/* Weight savings comparison */}
          {(valveMaterial !== "titanium" || retainerMaterial !== "titanium") && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border text-sm text-muted-foreground">
              <p className="font-semibold text-gray-700 mb-1">What if you went lighter?</p>
              {valveMaterial !== "titanium" && (
                <p>Titanium valves would save ~{Math.round(valveWtInt - preset.valveWeightInt * VALVE_MATERIAL_FACTOR.titanium.factor)}g per valve ({Math.round((1 - VALVE_MATERIAL_FACTOR.titanium.factor / valveFactorInt) * 100)}% reduction)</p>
              )}
              {retainerMaterial !== "titanium" && (
                <p>Titanium retainers would save ~{Math.round(retainerWt - preset.retainerWeight * RETAINER_MATERIAL_FACTOR.titanium.factor)}g per retainer ({Math.round((1 - RETAINER_MATERIAL_FACTOR.titanium.factor / retainerFactor) * 100)}% reduction)</p>
              )}
            </div>
          )}
        </Section>

        {/* ── Educational section ──────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Understanding Valvetrain Dynamics</CardTitle></CardHeader>
          <CardContent className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>
              The valvetrain is a system, not a collection of independent parts. Your cam profile determines how aggressively the valve opens and closes. The springs must generate enough force to keep the valve following the cam lobe through the entire RPM range — especially during the deceleration phase over the nose, where inertia tries to throw the valve away from the cam.
            </p>
            <p>
              <strong>Why RPM matters so much:</strong> Inertia forces increase with the <em>square</em> of engine speed. An engine spinning 7,000 RPM generates 4{"\u00D7"} the valve inertia force of the same engine at 3,500 RPM. This is why springs that work fine at 5,500 RPM may cause valve float at 6,500 RPM — a modest 18% increase in RPM produces a 40% increase in inertia force.
            </p>
            <p>
              <strong>The rocker ratio trap:</strong> Upgrading from 1.5:1 to 1.7:1 rockers increases valve lift by 13%, which sounds great. But it also increases the effective mass at the valve by 28% (ratio squared effect), meaning your springs need to work significantly harder. Always recalculate spring requirements after a rocker ratio change.
            </p>
            <p>
              <strong>Too much spring is also dangerous:</strong> On flat tappet cams, excessive spring pressure accelerates cam lobe and lifter wear. The lifter face and cam lobe are in sliding contact with only an oil film between them. Above ~130 lbs seat pressure on a flat tappet, lobe wear becomes a real risk — especially with modern low-ZDDP oils.
            </p>
            <p>
              <strong>About this calculator's estimates:</strong> Valve float RPM is estimated using a simplified cam acceleration model. Real valve float depends on the exact cam lobe profile shape (acceleration ramps), which varies significantly between manufacturers. Aggressive profiles (fast opening rates) will float earlier than conservative profiles of the same lift and duration. Always verify with the cam manufacturer's spring recommendation as a baseline.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
