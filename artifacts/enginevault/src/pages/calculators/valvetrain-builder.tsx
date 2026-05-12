import { useState, useMemo, useCallback } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ArrowRightLeft, Lock, Unlock, Info } from "lucide-react";
import { useManufacturers, useFamilies, useFamilyEngines } from "@/hooks/useEngineData";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, ComposedChart,
} from "recharts";

/* ══════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ══════════════════════════════════════════════════════════════════ */

type CalcMode = "cam-to-spring" | "spring-to-cam";

type ValvetrainArch = "pushrod" | "sohc-rocker" | "dohc-direct" | "dohc-finger";

interface ValvetrainArchSpec {
  label: string;
  description: string;
  hasRocker: boolean;
  hasPushrod: boolean;
  hasLifter: boolean;
  hasBucket: boolean;
  hasFollower: boolean;
  hasHLA: boolean;
}

const VALVETRAIN_ARCHS: Record<ValvetrainArch, ValvetrainArchSpec> = {
  pushrod: {
    label: "Pushrod + Rocker Arm",
    description: "SBC, BBC, LS, SBF, Mopar, Pontiac, Olds, Buick, etc.",
    hasRocker: true, hasPushrod: true, hasLifter: true,
    hasBucket: false, hasFollower: false, hasHLA: false,
  },
  "sohc-rocker": {
    label: "SOHC with Rocker Arm",
    description: "Honda D-series, Ford 4.6/5.4 2V, many older OHC engines",
    hasRocker: true, hasPushrod: false, hasLifter: false,
    hasBucket: false, hasFollower: false, hasHLA: true,
  },
  "dohc-direct": {
    label: "DOHC Direct-Acting (Bucket/Shim)",
    description: "Toyota 2JZ, Honda B-series, BMW N54, Miata BP, etc.",
    hasRocker: false, hasPushrod: false, hasLifter: false,
    hasBucket: true, hasFollower: false, hasHLA: false,
  },
  "dohc-finger": {
    label: "DOHC Finger Follower",
    description: "Ford Coyote/Voodoo, BMW S-series, many modern engines",
    hasRocker: false, hasPushrod: false, hasLifter: false,
    hasBucket: false, hasFollower: true, hasHLA: true,
  },
};

type CamType =
  | "hyd-flat" | "hyd-roller" | "solid-flat" | "solid-roller"
  | "ohc-bucket" | "ohc-finger-hyd" | "ohc-finger-solid"
  | "sohc-rocker-hyd" | "sohc-rocker-solid";

interface CamTypeSpec {
  label: string;
  seatMin: number;
  seatMax: number;
  openMin: number;
  openMax: number;
  maxSeatWarn: number;
  typicalAggressiveness: number;
  arch: ValvetrainArch[];
  lashType: "hydraulic" | "solid";
}

const CAM_TYPES: Record<CamType, CamTypeSpec> = {
  // Pushrod
  "hyd-flat":          { label: "Hydraulic flat tappet",          seatMin: 85,  seatMax: 130, openMin: 220, openMax: 280,  maxSeatWarn: 130, typicalAggressiveness: 0.35, arch: ["pushrod"],      lashType: "hydraulic" },
  "hyd-roller":        { label: "Hydraulic roller",               seatMin: 120, seatMax: 170, openMin: 260, openMax: 400,  maxSeatWarn: 999, typicalAggressiveness: 0.55, arch: ["pushrod"],      lashType: "hydraulic" },
  "solid-flat":        { label: "Solid flat tappet",              seatMin: 130, seatMax: 170, openMin: 280, openMax: 380,  maxSeatWarn: 180, typicalAggressiveness: 0.50, arch: ["pushrod"],      lashType: "solid" },
  "solid-roller":      { label: "Solid roller",                   seatMin: 170, seatMax: 400, openMin: 350, openMax: 1000, maxSeatWarn: 999, typicalAggressiveness: 0.75, arch: ["pushrod"],      lashType: "solid" },
  // SOHC
  "sohc-rocker-hyd":   { label: "SOHC hydraulic (rocker arm)",    seatMin: 40,  seatMax: 100, openMin: 120, openMax: 300,  maxSeatWarn: 999, typicalAggressiveness: 0.60, arch: ["sohc-rocker"], lashType: "hydraulic" },
  "sohc-rocker-solid": { label: "SOHC solid (rocker arm)",        seatMin: 50,  seatMax: 120, openMin: 150, openMax: 350,  maxSeatWarn: 999, typicalAggressiveness: 0.65, arch: ["sohc-rocker"], lashType: "solid" },
  // DOHC direct-acting
  "ohc-bucket":        { label: "DOHC direct-acting (bucket/shim)", seatMin: 25, seatMax: 80,  openMin: 80,  openMax: 250,  maxSeatWarn: 999, typicalAggressiveness: 0.68, arch: ["dohc-direct"], lashType: "solid" },
  // DOHC finger follower
  "ohc-finger-hyd":    { label: "DOHC finger follower (hydraulic)", seatMin: 35, seatMax: 90,  openMin: 100, openMax: 300,  maxSeatWarn: 999, typicalAggressiveness: 0.78, arch: ["dohc-finger"], lashType: "hydraulic" },
  "ohc-finger-solid":  { label: "DOHC finger follower (solid)",    seatMin: 40, seatMax: 100, openMin: 120, openMax: 350,  maxSeatWarn: 999, typicalAggressiveness: 0.82, arch: ["dohc-finger"], lashType: "solid" },
};

type SpringType = "single-small" | "single" | "single-beehive" | "dual" | "triple";

const SPRING_TYPE_LABELS: Record<SpringType, string> = {
  "single-small":  "Single small (OHC 4-cyl stock)",
  "single":        "Single (OHV stock / OHC V6-V8)",
  "single-beehive": "Beehive / Conical (street-performance)",
  "dual":          "Dual (performance / race)",
  "triple":        "Triple (extreme race)",
};

const SPRING_MASS_GRAMS: Record<SpringType, number> = {
  "single-small": 30,
  "single": 55,
  "single-beehive": 50,
  "dual": 90,
  "triple": 120,
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
  { value: "1.050", label: "1.05:1 (DOHC finger follower)" },
  { value: "1.200", label: "1.2:1 (SOHC / finger follower)" },
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

/* Default component weights by architecture (grams) — used as placeholders */
const ARCH_DEFAULTS: Record<ValvetrainArch, {
  intakeValve: number; exhaustValve: number; retainer: number; lockWeight: number;
  rockerWeight: number; rockerRatio: number;
  pushrodWeight: number; lifterWeight: number;
  bucketWeight: number; shimWeight: number;
  followerWeight: number; hlaWeight: number;
  defaultSpringType: SpringType;
}> = {
  pushrod: {
    intakeValve: 105, exhaustValve: 88, retainer: 28, lockWeight: 8,
    rockerWeight: 95, rockerRatio: 1.5,
    pushrodWeight: 65, lifterWeight: 30,
    bucketWeight: 0, shimWeight: 0,
    followerWeight: 0, hlaWeight: 0,
    defaultSpringType: "single",
  },
  "sohc-rocker": {
    intakeValve: 70, exhaustValve: 58, retainer: 15, lockWeight: 6,
    rockerWeight: 80, rockerRatio: 1.5,
    pushrodWeight: 0, lifterWeight: 0,
    bucketWeight: 0, shimWeight: 0,
    followerWeight: 0, hlaWeight: 20,
    defaultSpringType: "single",
  },
  "dohc-direct": {
    intakeValve: 55, exhaustValve: 45, retainer: 10, lockWeight: 4,
    rockerWeight: 0, rockerRatio: 1.0,
    pushrodWeight: 0, lifterWeight: 0,
    bucketWeight: 28, shimWeight: 4,
    followerWeight: 0, hlaWeight: 0,
    defaultSpringType: "single-small",
  },
  "dohc-finger": {
    intakeValve: 72, exhaustValve: 60, retainer: 14, lockWeight: 5,
    rockerWeight: 0, rockerRatio: 1.0,
    pushrodWeight: 0, lifterWeight: 0,
    bucketWeight: 0, shimWeight: 0,
    followerWeight: 45, hlaWeight: 20,
    defaultSpringType: "single-beehive",
  },
};

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
  // Work in SI (kg, meters, seconds) to avoid lbs-mass vs lbs-force confusion.
  const massKg = effectiveMassGrams / 1000;
  const liftM = liftInches * 0.0254;
  const omega = (maxRPM * 2 * Math.PI) / 60;         // crank rad/s
  const camOmega = omega / 2;                          // cam turns at half crank speed
  const durationRad = (durationAt050 * Math.PI) / 180; // duration in cam radians
  const noseRad = durationRad * 0.4;                   // nose region ≈ 40% of duration
  const noseTime = noseRad / camOmega;                  // time to traverse nose (seconds)
  if (noseTime <= 0) return 0;
  // Sinusoidal nose model: peak deceleration = lift × (π / noseTime)²
  // Real cam profiles don't reach pure sinusoidal peak acceleration.
  // The base factor ~0.50 represents this reduction. Aggressiveness adds a
  // small correction (0.15 range) — more aggressive lobe profiles produce
  // slightly higher peak acceleration, but most of the real-world variation
  // comes from RPM, lift, mass, and duration, not profile shape.
  const peakAccel = liftM * Math.pow(Math.PI / noseTime, 2) * (0.50 + aggressiveness * 0.15);
  const forceN = massKg * peakAccel;                    // F = ma (Newtons)
  const forceLbs = forceN / 4.448;                      // convert N → lbs
  return forceLbs * 1.3;                                // 1.3× safety factor
}

/**
 * Effective valvetrain mass at the valve (grams).
 *
 * Formulas by architecture:
 *   Pushrod:     valve + retainer + locks + ⅓·spring + ⅓·rocker·R² + (lifter + ⅓·pushrod) / R²
 *   SOHC rocker: valve + retainer + locks + ⅓·spring + ⅓·rocker·R² + HLA_moving / R²
 *   DOHC direct: valve + retainer + locks + ⅓·spring + bucket + shim
 *   DOHC finger: valve + retainer + locks + ⅓·spring + ⅓·follower·R² + HLA_moving / R²
 *
 * The ⅓ factor for springs, rockers, followers, and pushrods accounts for
 * distributed mass — one end stationary, one end moving. Energy conservation
 * shows ⅓ is more accurate than ½ (Tilden Technologies).
 */
function effectiveValvetrainMass(
  arch: ValvetrainArch,
  valveWeight: number,
  retainerWeight: number,
  lockWeight: number,
  springMass: number,
  rockerWeight: number,
  rockerRatio: number,
  pushrodWeight: number,
  lifterWeight: number,
  bucketWeight: number,
  shimWeight: number,
  followerWeight: number,
  hlaWeight: number,
): number {
  // Components at the valve side (always present)
  const valveSide = valveWeight + retainerWeight + lockWeight + springMass * (1 / 3);

  const R = rockerRatio > 0 ? rockerRatio : 1;
  const R2 = R * R;

  switch (arch) {
    case "pushrod": {
      const rockerContrib = rockerWeight * (1 / 3) * R2;
      // Lifter moves at cam velocity = valve velocity / R. Pushrod is distributed (⅓).
      const camSideContrib = (lifterWeight + pushrodWeight * (1 / 3)) / R2;
      return valveSide + rockerContrib + camSideContrib;
    }
    case "sohc-rocker": {
      const rockerContrib = rockerWeight * (1 / 3) * R2;
      // HLA moving portion (~50% of total HLA mass) is at the pivot/cam side
      const hlaMoving = hlaWeight * 0.5;
      const hlaContrib = hlaMoving / R2;
      return valveSide + rockerContrib + hlaContrib;
    }
    case "dohc-direct": {
      // Bucket and shim move 1:1 with the valve — full mass
      return valveSide + bucketWeight + shimWeight;
    }
    case "dohc-finger": {
      // Finger follower is a lever like a rocker: ⅓ mass × R²
      const followerContrib = followerWeight * (1 / 3) * R2;
      // HLA is at the pivot end (cam side) — reflected mass
      const hlaMoving = hlaWeight * 0.5;
      const hlaContrib = hlaMoving / R2;
      return valveSide + followerContrib + hlaContrib;
    }
  }
}

/** Estimated valve float RPM */
function estimateValveFloatRPM(
  openPressureLbs: number,
  effectiveMassGrams: number,
  liftInches: number,
  durationAt050: number,
  aggressiveness: number,
): number {
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
  return Math.round((lo + hi) / 2 / 50) * 50;
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
    const inertiaForce = requiredOpenPressure(effectiveMassGrams, rpm, liftInches, durationAt050, aggressiveness) / 1.3;
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

/* ── Reactive Slider with Lock ────────────────────────────────── */

function LockableSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  locked,
  onToggleLock,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  locked: boolean;
  onToggleLock: () => void;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const display = formatValue ? formatValue(value) : `${value}`;
  return (
    <div className={`p-3 rounded-lg border transition-colors ${locked ? "bg-gray-100 border-gray-300" : "bg-white border-[#E85D04]/30"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${locked ? "text-gray-500" : "text-[#E85D04]"}`}>
            {display} {unit}
          </span>
          <button
            type="button"
            onClick={onToggleLock}
            className={`p-1 rounded transition-colors ${locked ? "bg-gray-300 text-gray-600" : "bg-[#E85D04]/10 text-[#E85D04] hover:bg-[#E85D04]/20"}`}
            title={locked ? "Unlock this parameter" : "Lock this parameter"}
          >
            {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={locked}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${locked ? "accent-gray-400 opacity-50" : "accent-[#E85D04]"}`}
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function ValvetrainBuilderCalculator() {
  /* ── Mode ────────────────────────────────────────────────────── */
  const [mode, setMode] = useState<CalcMode>("cam-to-spring");

  /* ── Engine picker state (from database) ─────────────────────── */
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMfr, setPickerMfr] = useState("");
  const [pickerFamily, setPickerFamily] = useState("");
  const [pickerEngine, setPickerEngine] = useState("");
  const { manufacturers } = useManufacturers();
  const { families } = useFamilies();
  const { familyData } = useFamilyEngines(pickerMfr, pickerFamily);
  const filteredFamilies = families.filter(f => f.manufacturer_slug === pickerMfr);

  /* ── Architecture ───────────────────────────────────────────── */
  const [arch, setArch] = useState<ValvetrainArch>("pushrod");
  const archSpec = VALVETRAIN_ARCHS[arch];
  const defaults = ARCH_DEFAULTS[arch];

  /* ── Cam inputs ─────────────────────────────────────────────── */
  const availableCamTypes = Object.entries(CAM_TYPES).filter(([, spec]) => spec.arch.includes(arch)) as [CamType, CamTypeSpec][];
  const [camType, setCamType] = useState<CamType>("hyd-flat");
  const [lobeLiftInt, setLobeLiftInt] = useState("0.300");
  const [lobeLiftExh, setLobeLiftExh] = useState("0.300");
  const [durationInt, setDurationInt] = useState("212");
  const [durationExh, setDurationExh] = useState("218");
  const [liftInputMode, setLiftInputMode] = useState<"lobe" | "valve">("lobe");

  /* ── Rocker ─────────────────────────────────────────────────── */
  const [rockerPreset, setRockerPreset] = useState(defaults.rockerRatio.toFixed(3));
  const [customRatio, setCustomRatio] = useState(defaults.rockerRatio.toFixed(3));
  const [rockerWeightInput, setRockerWeightInput] = useState("");

  /* ── Lifter type / lash ─────────────────────────────────────── */
  const [lashInt, setLashInt] = useState("0.016");
  const [lashExh, setLashExh] = useState("0.020");

  /* ── Component weights ──────────────────────────────────────── */
  const [valveMaterial, setValveMaterial] = useState<ValveMaterial>("stainless");
  const [retainerMaterial, setRetainerMaterial] = useState<RetainerMaterial>("steel");
  const [valveWeightIntInput, setValveWeightIntInput] = useState("");
  const [valveWeightExhInput, setValveWeightExhInput] = useState("");
  const [retainerWeightInput, setRetainerWeightInput] = useState("");
  const [lockWeightInput, setLockWeightInput] = useState("");

  /* ── Architecture-specific weights ─────────────────────────── */
  const [pushrodWeightInput, setPushrodWeightInput] = useState("");
  const [lifterWeightInput, setLifterWeightInput] = useState("");
  const [bucketWeightInput, setBucketWeightInput] = useState("");
  const [shimWeightInput, setShimWeightInput] = useState("");
  const [followerWeightInput, setFollowerWeightInput] = useState("");
  const [hlaWeightInput, setHlaWeightInput] = useState("");

  /* ── Target RPM ─────────────────────────────────────────────── */
  const [targetRPM, setTargetRPM] = useState("6000");

  /* ── Spring type ────────────────────────────────────────────── */
  const [springType, setSpringType] = useState<SpringType>(defaults.defaultSpringType);

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

  /* ── What-If slider locks ──────────────────────────────────── */
  const [lockRPM, setLockRPM] = useState(false);
  const [lockValveWeight, setLockValveWeight] = useState(false);
  const [lockRockerRatio, setLockRockerRatio] = useState(false);
  const [lockSpringPressure, setLockSpringPressure] = useState(false);

  /* Slider state for What-If panel */
  const [sliderRPM, setSliderRPM] = useState(6000);
  const [sliderValveWeight, setSliderValveWeight] = useState(100);
  const [sliderRockerRatio, setSliderRockerRatio] = useState(1.5);
  const [sliderSpringOpen, setSliderSpringOpen] = useState(300);

  /* ── Apply architecture ─────────────────────────────────────── */
  function applyArch(newArch: ValvetrainArch) {
    setArch(newArch);
    const d = ARCH_DEFAULTS[newArch];
    // Set default cam type for this architecture
    const firstCam = Object.entries(CAM_TYPES).find(([, spec]) => spec.arch.includes(newArch));
    if (firstCam) setCamType(firstCam[0] as CamType);
    setSpringType(d.defaultSpringType);

    if (newArch === "dohc-direct") {
      setRockerPreset("1.000");
      setCustomRatio("1.000");
      setLiftInputMode("valve");
    } else if (newArch === "dohc-finger") {
      setRockerPreset("1.050");
      setCustomRatio("1.050");
      setLiftInputMode("valve");
    } else if (newArch === "sohc-rocker") {
      setRockerPreset("1.500");
      setCustomRatio("1.500");
      setLiftInputMode("lobe");
    } else {
      setRockerPreset(d.rockerRatio.toFixed(3));
      setCustomRatio(d.rockerRatio.toFixed(3));
      setLiftInputMode("lobe");
    }
    // Clear all weight overrides
    setRockerWeightInput("");
    setValveWeightIntInput("");
    setValveWeightExhInput("");
    setRetainerWeightInput("");
    setLockWeightInput("");
    setPushrodWeightInput("");
    setLifterWeightInput("");
    setBucketWeightInput("");
    setShimWeightInput("");
    setFollowerWeightInput("");
    setHlaWeightInput("");
  }

  /* ── Apply engine from database picker ─────────────────────── */
  function handlePickerEngine(engineId: string) {
    setPickerEngine(engineId);
    if (!familyData) return;
    const eng = familyData.engines.find(e => e.engine_id === engineId);
    if (!eng) return;
    // Auto-fill rocker ratio from head data
    if (eng.head?.rocker_ratio) {
      const rr = eng.head.rocker_ratio.toFixed(3);
      setRockerPreset(rr);
      setCustomRatio(rr);
    }
    // Auto-fill lifter type if available
    if (eng.head?.lifter_type) {
      const lt = eng.head.lifter_type.toLowerCase();
      if (lt.includes("hydraulic") && lt.includes("roller")) setCamType("hyd-roller");
      else if (lt.includes("hydraulic") && lt.includes("flat")) setCamType("hyd-flat");
      else if (lt.includes("solid") && lt.includes("roller")) setCamType("solid-roller");
      else if (lt.includes("solid") && lt.includes("flat")) setCamType("solid-flat");
      else if (lt.includes("hydraulic")) setCamType("hyd-roller");
    }
    // Set architecture based on valvetrain type
    if (eng.valvetrain) {
      const vt = eng.valvetrain.toLowerCase();
      if (vt.includes("ohv") || vt.includes("pushrod")) applyArch("pushrod");
      else if (vt.includes("sohc")) applyArch("sohc-rocker");
      else if (vt.includes("dohc")) applyArch("dohc-direct");
    }
  }

  /* ── Derived values ─────────────────────────────────────────── */
  const camSpec = CAM_TYPES[camType];
  const lifterType = camSpec.lashType;

  const rockerRatio = archSpec.hasRocker || arch === "dohc-finger"
    ? (rockerPreset === "custom" ? (parseFloat(customRatio) || 1.0) : (parseFloat(rockerPreset) || 1.0))
    : 1.0;

  const rockerWeight = rockerWeightInput
    ? (parseFloat(rockerWeightInput) || defaults.rockerWeight)
    : defaults.rockerWeight;

  const lashValInt = lifterType === "solid" ? (parseFloat(lashInt) || 0) : 0;
  const lashValExh = lifterType === "solid" ? (parseFloat(lashExh) || 0) : 0;

  const lobeLiftIntV = parseFloat(lobeLiftInt) || 0;
  const lobeLiftExhV = parseFloat(lobeLiftExh) || 0;

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

  const valveWtInt = valveWeightIntInput
    ? (parseFloat(valveWeightIntInput) || defaults.intakeValve)
    : defaults.intakeValve * valveFactorInt;
  const valveWtExh = valveWeightExhInput
    ? (parseFloat(valveWeightExhInput) || defaults.exhaustValve)
    : defaults.exhaustValve * valveFactorExh;
  const retainerWt = retainerWeightInput
    ? (parseFloat(retainerWeightInput) || defaults.retainer)
    : defaults.retainer * retainerFactor;
  const lockWt = lockWeightInput
    ? (parseFloat(lockWeightInput) || defaults.lockWeight)
    : defaults.lockWeight;
  const springMass = SPRING_MASS_GRAMS[springType];

  // Architecture-specific weights
  const pushrodWt = pushrodWeightInput ? (parseFloat(pushrodWeightInput) || defaults.pushrodWeight) : defaults.pushrodWeight;
  const lifterWt = lifterWeightInput ? (parseFloat(lifterWeightInput) || defaults.lifterWeight) : defaults.lifterWeight;
  const bucketWt = bucketWeightInput ? (parseFloat(bucketWeightInput) || defaults.bucketWeight) : defaults.bucketWeight;
  const shimWt = shimWeightInput ? (parseFloat(shimWeightInput) || defaults.shimWeight) : defaults.shimWeight;
  const followerWt = followerWeightInput ? (parseFloat(followerWeightInput) || defaults.followerWeight) : defaults.followerWeight;
  const hlaWt = hlaWeightInput ? (parseFloat(hlaWeightInput) || defaults.hlaWeight) : defaults.hlaWeight;

  // Effective mass (use intake side — typically heavier valve)
  const effectiveMass = effectiveValvetrainMass(
    arch, valveWtInt, retainerWt, lockWt, springMass,
    rockerWeight, rockerRatio,
    pushrodWt, lifterWt,
    bucketWt, shimWt,
    followerWt, hlaWt,
  );

  /* ══════════════════════════════════════════════════════════════
     FORWARD MODE: cam → spring requirements
     ══════════════════════════════════════════════════════════════ */
  const forwardResults = useMemo(() => {
    if (mode !== "cam-to-spring" || maxValveLift <= 0 || maxDuration <= 0) return null;

    const reqOpen = requiredOpenPressure(
      effectiveMass, targetRPMv, maxValveLift, maxDuration, camSpec.typicalAggressiveness
    );

    const minOpen = Math.max(reqOpen, camSpec.openMin);

    const targetSeatMin = camSpec.seatMin;
    const targetSeatMax = camSpec.seatMax;
    const targetSeatMid = (targetSeatMin + targetSeatMax) / 2;

    const reqRate = maxValveLift > 0 ? (minOpen - targetSeatMid) / maxValveLift : 0;

    const safetyMargin = 0.060;
    const minSpringTravel = maxValveLift + safetyMargin;

    return {
      requiredOpenPressure: Math.round(minOpen),
      recommendedSeatMin: Math.round(targetSeatMin),
      recommendedSeatMax: Math.round(targetSeatMax),
      requiredSpringRate: Math.round(reqRate),
      minSpringTravel,
      effectiveMass: Math.round(effectiveMass),
      valveLiftInt,
      valveLiftExh,
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

    const seatOk = seat >= camSpec.seatMin && seat <= camSpec.seatMax;
    const openOk = openP >= (forwardResults?.requiredOpenPressure || camSpec.openMin);
    const bindOk = ih > 0 && cbh > 0 ? bindClearance >= 0.060 : true;
    const rpmOk = floatRPM > targetRPMv * 1.1;

    const chartMax = Math.max(targetRPMv + 2000, floatRPM + 1500);
    const chartData = generateForceVsRPMData(
      seat, rate, maxValveLift, effectiveMass, maxDuration, camSpec.typicalAggressiveness,
      Math.min(chartMax, 15000)
    );

    return {
      openPressure: Math.round(openP),
      seatPressure: Math.round(seat),
      bindClearance: ih > 0 && cbh > 0 ? bindClearance : null,
      floatRPM,
      seatOk, openOk, bindOk, rpmOk,
      chartData,
      chartMax: Math.min(chartMax, 15000),
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

    const safetyMargin = 0.060;
    const maxLiftFromBind = ih > 0 && cbh > 0 ? ih - cbh - safetyMargin : 999;

    const liftEnvelope: { lift: number; rate: number; maxRPM: number; camTypes: string[] }[] = [];

    for (let lift = 0.200; lift <= 0.700; lift += 0.025) {
      if (lift > maxLiftFromBind) break;

      const rate = (open - seat) / lift;
      const testDuration = 220;
      const floatRPM = estimateValveFloatRPM(
        open, effectiveMass, lift, testDuration, camSpec.typicalAggressiveness
      );

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

    const maxSafeLift = Math.min(maxLiftFromBind, 0.700);

    const matchingCamTypes: string[] = [];
    for (const [, spec] of Object.entries(CAM_TYPES)) {
      if (seat >= spec.seatMin * 0.85 && seat <= spec.seatMax * 1.15 &&
          open >= spec.openMin * 0.85 && open <= spec.openMax * 1.15) {
        matchingCamTypes.push(spec.label);
      }
    }

    const flatTappetWarn = seat > 130 && arch === "pushrod";

    return {
      maxSafeLift: parseFloat(maxSafeLift.toFixed(3)),
      maxLiftFromBind: parseFloat(maxLiftFromBind.toFixed(3)),
      liftEnvelope,
      matchingCamTypes,
      flatTappetWarn,
      springRate: maxSafeLift > 0 ? Math.round((open - seat) / maxSafeLift) : 0,
    };
  }, [mode, revSeatPressure, revOpenPressure, revInstalledHeight, revCoilBindHeight, effectiveMass, camSpec, arch]);

  /* ══════════════════════════════════════════════════════════════
     WHAT-IF EXPLORER
     ══════════════════════════════════════════════════════════════ */

  // Sync sliders from main inputs whenever they change
  const syncSliders = useCallback(() => {
    setSliderRPM(targetRPMv);
    setSliderValveWeight(Math.round(valveWtInt));
    setSliderRockerRatio(rockerRatio);
    if (forwardResults) {
      setSliderSpringOpen(forwardResults.requiredOpenPressure);
    }
  }, [targetRPMv, valveWtInt, rockerRatio, forwardResults]);

  // What-If computed results
  const whatIfResults = useMemo(() => {
    if (mode !== "cam-to-spring" || maxValveLift <= 0 || maxDuration <= 0) return null;

    // Recalculate effective mass with slider valve weight and rocker ratio
    const wiEffMass = effectiveValvetrainMass(
      arch, sliderValveWeight, retainerWt, lockWt, springMass,
      rockerWeight, sliderRockerRatio,
      pushrodWt, lifterWt,
      bucketWt, shimWt,
      followerWt, hlaWt,
    );

    // Recalculate lift with slider rocker ratio
    const wiLift = liftInputMode === "lobe"
      ? netValveLift(lobeLiftIntV, sliderRockerRatio, lashValInt)
      : lobeLiftIntV - lashValInt;
    const wiLiftExh = liftInputMode === "lobe"
      ? netValveLift(lobeLiftExhV, sliderRockerRatio, lashValExh)
      : lobeLiftExhV - lashValExh;
    const wiMaxLift = Math.max(wiLift, wiLiftExh);

    if (wiMaxLift <= 0) return null;

    const reqOpen = requiredOpenPressure(
      wiEffMass, sliderRPM, wiMaxLift, maxDuration, camSpec.typicalAggressiveness
    );
    const minOpen = Math.max(reqOpen, camSpec.openMin);

    const floatRPM = estimateValveFloatRPM(
      sliderSpringOpen, wiEffMass, wiMaxLift, maxDuration, camSpec.typicalAggressiveness
    );

    const rpmMargin = sliderRPM > 0 ? ((floatRPM / sliderRPM) - 1) * 100 : 0;

    return {
      effectiveMass: Math.round(wiEffMass),
      requiredOpenPressure: Math.round(minOpen),
      valveLift: wiMaxLift,
      floatRPM,
      rpmMargin: Math.round(rpmMargin),
      rpmSafe: rpmMargin >= 10,
    };
  }, [mode, arch, sliderRPM, sliderValveWeight, sliderRockerRatio, sliderSpringOpen,
      maxValveLift, maxDuration, camSpec, liftInputMode, lobeLiftIntV, lobeLiftExhV,
      lashValInt, lashValExh, retainerWt, lockWt, springMass, rockerWeight,
      pushrodWt, lifterWt, bucketWt, shimWt, followerWt, hlaWt]);

  /* ── Warnings ───────────────────────────────────────────────── */
  const warnings: { text: string; level: "red" | "yellow" }[] = [];

  if (mode === "cam-to-spring" && forwardResults) {
    if ((camType === "hyd-flat" || camType === "solid-flat") && forwardResults.requiredOpenPressure > 280) {
      warnings.push({
        text: "High open pressure for a flat tappet cam. Spring pressures above ~280 lbs open will accelerate cam lobe wear. Consider switching to a roller cam or reducing RPM target.",
        level: "red",
      });
    }
    if (camType === "hyd-flat" && forwardResults.recommendedSeatMax > CAM_TYPES["hyd-flat"].maxSeatWarn) {
      warnings.push({
        text: `Seat pressure above ${CAM_TYPES["hyd-flat"].maxSeatWarn} lbs on a hydraulic flat tappet cam risks premature lobe wear. Use proper break-in oil (high ZDDP) and verify lifter preload.`,
        level: "yellow",
      });
    }
    if (maxValveLift > 0.600 && (springType === "single" || springType === "single-small")) {
      warnings.push({
        text: "Valve lift above 0.600\" typically requires dual springs for adequate control. Single springs may not have enough travel or rate at this lift.",
        level: "yellow",
      });
    }
    if (targetRPMv > 7000 && (springType === "single" || springType === "single-small" || springType === "single-beehive")) {
      warnings.push({
        text: "RPM targets above 7000 generally require dual or triple springs for adequate valve control.",
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

  /* ── Mass breakdown helper ─────────────────────────────────── */
  function massBreakdownRows(): { label: string; value: number; detail?: string }[] {
    const rows: { label: string; value: number; detail?: string }[] = [
      { label: `Intake Valve (${VALVE_MATERIAL_FACTOR[valveMaterial].label})`, value: Math.round(valveWtInt) },
      { label: `Retainer (${RETAINER_MATERIAL_FACTOR[retainerMaterial].label})`, value: Math.round(retainerWt) },
      { label: "Locks (pair)", value: lockWt },
      { label: "Spring mass (\u00D7\u2153)", value: Math.round(springMass * (1 / 3)), detail: `of ${springMass}g` },
    ];

    const R = rockerRatio;
    const R2 = R * R;

    switch (arch) {
      case "pushrod":
        rows.push({ label: `Rocker (\u00D7\u2153 \u00D7 ${R.toFixed(2)}\u00B2)`, value: Math.round(rockerWeight * (1 / 3) * R2), detail: `of ${rockerWeight}g` });
        rows.push({ label: `Lifter (reflected \u00F7 ${R.toFixed(2)}\u00B2)`, value: Math.round(lifterWt / R2), detail: `of ${lifterWt}g` });
        rows.push({ label: `Pushrod (\u00D7\u2153, reflected \u00F7 ${R.toFixed(2)}\u00B2)`, value: Math.round(pushrodWt * (1 / 3) / R2), detail: `of ${pushrodWt}g` });
        break;
      case "sohc-rocker":
        rows.push({ label: `Rocker (\u00D7\u2153 \u00D7 ${R.toFixed(2)}\u00B2)`, value: Math.round(rockerWeight * (1 / 3) * R2), detail: `of ${rockerWeight}g` });
        rows.push({ label: `HLA moving (\u00F7 ${R.toFixed(2)}\u00B2)`, value: Math.round(hlaWt * 0.5 / R2), detail: `of ${hlaWt}g total` });
        break;
      case "dohc-direct":
        rows.push({ label: "Bucket tappet (1:1)", value: Math.round(bucketWt) });
        rows.push({ label: "Shim (1:1)", value: Math.round(shimWt) });
        break;
      case "dohc-finger":
        rows.push({ label: `Finger follower (\u00D7\u2153 \u00D7 ${R.toFixed(2)}\u00B2)`, value: Math.round(followerWt * (1 / 3) * R2), detail: `of ${followerWt}g` });
        rows.push({ label: `HLA moving (\u00F7 ${R.toFixed(2)}\u00B2)`, value: Math.round(hlaWt * 0.5 / R2), detail: `of ${hlaWt}g total` });
        break;
    }

    return rows;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="px-4 space-y-5 pb-12">
        <div>
          <SEOHead
            title="Valvetrain RPM Builder Calculator"
            description="Dynamic engine valvetrain calculator for pushrod, SOHC, and DOHC engines. Enter your cam, rockers, and target RPM to get valve spring requirements — or enter your springs to find what cams they support. Valve float estimation, coil bind check, pressure validation, and RPM safety graph."
            canonical="/calculators/valvetrain-builder"
            keywords="valvetrain calculator, valve spring selector, cam spring match, valve float calculator, engine RPM calculator, rocker ratio calculator, valve spring pressure, coil bind, cam selection, engine build calculator, DOHC valvetrain, OHC spring calculator"
          />
          <h1 className="text-3xl font-bold mb-1">Valvetrain RPM Builder</h1>
          <p className="text-sm text-muted-foreground">
            Match your cam, springs, and target RPM as a complete system.
            Works for pushrod, SOHC, and DOHC engines — change any parameter and see how it ripples through the entire valvetrain.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 min-w-0 space-y-5">

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
            <strong>How it works:</strong> Enter your cam specs, component weights, and target RPM. The calculator determines what spring pressures, rates, and travel your valvetrain needs — then validates a specific spring if you have one in mind.
          </div>
        )}

        {mode === "spring-to-cam" && (
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-sm text-blue-800">
            <strong>Reverse mode:</strong> Enter the springs you already have. The calculator shows what range of cam lift, duration, and RPM your springs can safely handle — and which cam types are compatible.
          </div>
        )}

        {/* ── Engine Picker from Database ──────────────────── */}
        <div className="p-3 bg-gray-50 rounded-lg border">
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

        {/* ══════════════════════════════════════════════════════
            SECTION 1: Valvetrain Architecture
            ══════════════════════════════════════════════════════ */}
        <Section title="1 — Valvetrain Architecture">
          <Field label="Valvetrain Type" hint="Determines which components are in the system and how mass is reflected to the valve.">
            <Select value={arch} onValueChange={v => applyArch(v as ValvetrainArch)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(VALVETRAIN_ARCHS) as [ValvetrainArch, ValvetrainArchSpec][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="text-xs text-muted-foreground p-2 bg-gray-50 rounded-lg">
            {archSpec.description}
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════
            SECTION 2: Component Weights
            ══════════════════════════════════════════════════════ */}
        <Section title="2 — Component Weights">
          <p className="text-sm text-muted-foreground">
            Weigh your actual parts if possible. Default values are typical starting points for this valvetrain type — your parts will vary.
          </p>

          {/* Valve & retainer materials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Valve Material" hint="Affects default valve weight. Titanium saves ~43%.">
              <Select value={valveMaterial} onValueChange={v => setValveMaterial(v as ValveMaterial)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(VALVE_MATERIAL_FACTOR) as [ValveMaterial, typeof VALVE_MATERIAL_FACTOR[ValveMaterial]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Retainer Material" hint="Affects default retainer weight. Titanium saves ~55%.">
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

          {/* Core weights — always shown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Intake Valve (g)" hint={`Default: ${Math.round(defaults.intakeValve * valveFactorInt)}g`}>
              <Input type="number" step="1" placeholder={String(Math.round(defaults.intakeValve * valveFactorInt))} value={valveWeightIntInput} onChange={e => setValveWeightIntInput(e.target.value)} />
            </Field>
            <Field label="Exhaust Valve (g)" hint={`Default: ${Math.round(defaults.exhaustValve * valveFactorExh)}g`}>
              <Input type="number" step="1" placeholder={String(Math.round(defaults.exhaustValve * valveFactorExh))} value={valveWeightExhInput} onChange={e => setValveWeightExhInput(e.target.value)} />
            </Field>
            <Field label="Retainer (g)" hint={`Default: ${Math.round(defaults.retainer * retainerFactor)}g`}>
              <Input type="number" step="1" placeholder={String(Math.round(defaults.retainer * retainerFactor))} value={retainerWeightInput} onChange={e => setRetainerWeightInput(e.target.value)} />
            </Field>
            <Field label="Locks/Keepers (g)" hint={`Default: ${defaults.lockWeight}g (pair)`}>
              <Input type="number" step="1" placeholder={String(defaults.lockWeight)} value={lockWeightInput} onChange={e => setLockWeightInput(e.target.value)} />
            </Field>
          </div>

          {/* Spring type */}
          <Field label="Spring Type" hint="Affects spring mass in the system.">
            <Select value={springType} onValueChange={v => setSpringType(v as SpringType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(SPRING_TYPE_LABELS) as [SpringType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Architecture-specific weights */}
          {arch === "pushrod" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-200">
              <p className="col-span-full text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Pushrod-Specific Components</p>
              <Field label="Pushrod Weight (g)" hint={`Default: ${defaults.pushrodWeight}g. 5/16\u2033 chromoly ~50g, 3/8\u2033 ~65g`}>
                <Input type="number" step="1" placeholder={String(defaults.pushrodWeight)} value={pushrodWeightInput} onChange={e => setPushrodWeightInput(e.target.value)} />
              </Field>
              <Field label="Lifter/Tappet Weight (g)" hint={`Default: ${defaults.lifterWeight}g. Hyd flat ~28g, hyd roller ~110g, solid roller ~90g`}>
                <Input type="number" step="1" placeholder={String(defaults.lifterWeight)} value={lifterWeightInput} onChange={e => setLifterWeightInput(e.target.value)} />
              </Field>
              <Field label="Rocker Arm Weight (g)" hint={`Default: ${defaults.rockerWeight}g. Stamped ~95g, roller ~130g, shaft ~200g+`}>
                <Input type="number" step="1" placeholder={String(defaults.rockerWeight)} value={rockerWeightInput} onChange={e => setRockerWeightInput(e.target.value)} />
              </Field>
            </div>
          )}

          {arch === "sohc-rocker" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-200">
              <p className="col-span-full text-xs font-semibold text-[#E85D04] uppercase tracking-wider">SOHC-Specific Components</p>
              <Field label="Rocker Arm Weight (g)" hint={`Default: ${defaults.rockerWeight}g`}>
                <Input type="number" step="1" placeholder={String(defaults.rockerWeight)} value={rockerWeightInput} onChange={e => setRockerWeightInput(e.target.value)} />
              </Field>
              <Field label="HLA Weight (g)" hint={`Default: ${defaults.hlaWeight}g total. ~50% is moving mass.`}>
                <Input type="number" step="1" placeholder={String(defaults.hlaWeight)} value={hlaWeightInput} onChange={e => setHlaWeightInput(e.target.value)} />
              </Field>
            </div>
          )}

          {arch === "dohc-direct" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-200">
              <p className="col-span-full text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Bucket Tappet Components</p>
              <Field label="Bucket Weight (g)" hint={`Default: ${defaults.bucketWeight}g. Shimless ~28g, with shim pocket ~35g`}>
                <Input type="number" step="1" placeholder={String(defaults.bucketWeight)} value={bucketWeightInput} onChange={e => setBucketWeightInput(e.target.value)} />
              </Field>
              <Field label="Shim Weight (g)" hint={`Default: ${defaults.shimWeight}g. 0 if shimless bucket`}>
                <Input type="number" step="1" placeholder={String(defaults.shimWeight)} value={shimWeightInput} onChange={e => setShimWeightInput(e.target.value)} />
              </Field>
            </div>
          )}

          {arch === "dohc-finger" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-200">
              <p className="col-span-full text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Finger Follower Components</p>
              <Field label="Finger Follower Weight (g)" hint={`Default: ${defaults.followerWeight}g. Coyote ~51g, Voodoo ~44g, compact 4-cyl ~35g`}>
                <Input type="number" step="1" placeholder={String(defaults.followerWeight)} value={followerWeightInput} onChange={e => setFollowerWeightInput(e.target.value)} />
              </Field>
              <Field label="HLA Weight (g)" hint={`Default: ${defaults.hlaWeight}g total. ~50% is moving mass.`}>
                <Input type="number" step="1" placeholder={String(defaults.hlaWeight)} value={hlaWeightInput} onChange={e => setHlaWeightInput(e.target.value)} />
              </Field>
            </div>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════
            SECTION 3: Rocker/Ratio (if applicable)
            ══════════════════════════════════════════════════════ */}
        {(archSpec.hasRocker || arch === "dohc-finger") && (
          <Section title={`3 — ${arch === "dohc-finger" ? "Finger Follower Ratio" : "Rocker Arms"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label={arch === "dohc-finger" ? "Follower Ratio" : "Rocker Ratio"}
                hint={arch === "dohc-finger"
                  ? "Most finger followers are close to 1.0:1 — check your engine's spec. Higher ratio = more lift = more spring demand."
                  : "Higher ratio = more lift = more spring demand. Each 0.1 increase raises effective mass at the valve."
                }
              >
                <Select value={rockerPreset} onValueChange={v => setRockerPreset(v)}>
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
            </div>
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 4: Cam Specs (forward) or Springs (reverse)
            ══════════════════════════════════════════════════════ */}
        {mode === "cam-to-spring" ? (
          <>
            <Section title={`${archSpec.hasRocker || arch === "dohc-finger" ? "4" : "3"} — Camshaft Specs`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Cam Type" hint="Determines safe pressure ranges and aggressiveness.">
                  <Select value={camType} onValueChange={v => setCamType(v as CamType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableCamTypes.map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {(archSpec.hasRocker || arch === "dohc-finger") && (
                  <Field label="Lift values are listed as:">
                    <Select value={liftInputMode} onValueChange={v => setLiftInputMode(v as "lobe" | "valve")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lobe">Cam lobe lift (will multiply by ratio)</SelectItem>
                        <SelectItem value="valve">Valve lift (already includes ratio)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={liftInputMode === "lobe" && (archSpec.hasRocker || arch === "dohc-finger") ? "Intake Lobe Lift (inches)" : "Intake Valve Lift (inches)"} hint="From your cam card">
                  <Input type="number" step="0.001" value={lobeLiftInt} onChange={e => setLobeLiftInt(e.target.value)} />
                </Field>
                <Field label={liftInputMode === "lobe" && (archSpec.hasRocker || arch === "dohc-finger") ? "Exhaust Lobe Lift (inches)" : "Exhaust Valve Lift (inches)"} hint="From your cam card">
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
                  <Field label="Intake Valve Lash (inches)" hint="Hot lash from cam card. Typical: 0.012\u20130.024\u2033">
                    <Input type="number" step="0.001" value={lashInt} onChange={e => setLashInt(e.target.value)} />
                  </Field>
                  <Field label="Exhaust Valve Lash (inches)" hint="Typical: 0.016\u20130.028\u2033">
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
                    {liftInputMode === "lobe" && (archSpec.hasRocker || arch === "dohc-finger") && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {lobeLiftIntV.toFixed(3)} {"\u00D7"}{rockerRatio.toFixed(3)}{lashValInt > 0 ? ` - ${lashValInt.toFixed(3)}` : ""} = {valveLiftInt.toFixed(3)}
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded-lg border bg-gray-50 text-center">
                    <div className="text-xs text-gray-500">Net Exhaust Valve Lift</div>
                    <div className="text-xl font-bold">{valveLiftExh.toFixed(3)}"</div>
                    {liftInputMode === "lobe" && (archSpec.hasRocker || arch === "dohc-finger") && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {lobeLiftExhV.toFixed(3)} {"\u00D7"}{rockerRatio.toFixed(3)}{lashValExh > 0 ? ` - ${lashValExh.toFixed(3)}` : ""} = {valveLiftExh.toFixed(3)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* ── Target RPM ──────────────────────────────────── */}
            <Section title={`${archSpec.hasRocker || arch === "dohc-finger" ? "5" : "4"} — Target RPM`}>
              <Field label="Maximum Intended RPM" hint="The highest RPM you plan to spin the engine. The valvetrain must maintain control at this speed with a 10% safety margin.">
                <Input type="number" step="100" value={targetRPM} onChange={e => setTargetRPM(e.target.value)} />
              </Field>
              {targetRPMv > 7500 && (
                <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-sm text-yellow-800">
                  RPM targets above 7500 require careful attention to every gram of valvetrain weight.
                  Titanium retainers, lightweight valves, and high-quality springs become critical.
                </div>
              )}
              {targetRPMv > 9000 && arch === "pushrod" && (
                <div className="p-3 rounded-lg border bg-red-50 border-red-300 text-sm text-red-700">
                  9000+ RPM on a pushrod engine is extremely demanding. Pushrod flex and lifter mass become major limiting factors. Consider lightweight pushrods, reduced lifter mass, and very high-rate springs.
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
                <Section title={`${archSpec.hasRocker || arch === "dohc-finger" ? "6" : "5"} — Validate a Specific Spring (optional)`}>
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

                {/* ══════════════════════════════════════════════
                    WHAT-IF EXPLORER
                    ══════════════════════════════════════════════ */}
                <Section title="What-If Explorer" defaultOpen={false}>
                  <p className="text-sm text-muted-foreground mb-2">
                    Lock the parameters you want to keep fixed, then slide the others to see how changes ripple through the system in real time.
                  </p>
                  <button
                    type="button"
                    onClick={syncSliders}
                    className="text-xs text-[#E85D04] hover:underline font-semibold mb-4 block"
                  >
                    Sync sliders from current inputs above
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <LockableSlider
                      label="Target RPM"
                      value={sliderRPM}
                      min={3000}
                      max={arch === "pushrod" ? 10000 : 12000}
                      step={100}
                      unit="RPM"
                      locked={lockRPM}
                      onToggleLock={() => setLockRPM(l => !l)}
                      onChange={setSliderRPM}
                      formatValue={v => v.toLocaleString()}
                    />
                    <LockableSlider
                      label="Intake Valve Weight"
                      value={sliderValveWeight}
                      min={20}
                      max={200}
                      step={1}
                      unit="g"
                      locked={lockValveWeight}
                      onToggleLock={() => setLockValveWeight(l => !l)}
                      onChange={setSliderValveWeight}
                    />
                    {(archSpec.hasRocker || arch === "dohc-finger") && (
                      <LockableSlider
                        label={arch === "dohc-finger" ? "Follower Ratio" : "Rocker Ratio"}
                        value={sliderRockerRatio}
                        min={arch === "dohc-finger" ? 0.9 : 1.0}
                        max={arch === "dohc-finger" ? 1.2 : 2.0}
                        step={0.01}
                        unit=":1"
                        locked={lockRockerRatio}
                        onToggleLock={() => setLockRockerRatio(l => !l)}
                        onChange={setSliderRockerRatio}
                        formatValue={v => v.toFixed(2)}
                      />
                    )}
                    <LockableSlider
                      label="Spring Open Pressure"
                      value={sliderSpringOpen}
                      min={arch === "dohc-direct" ? 60 : arch === "dohc-finger" ? 80 : 150}
                      max={arch === "dohc-direct" ? 400 : 1000}
                      step={5}
                      unit="lbs"
                      locked={lockSpringPressure}
                      onToggleLock={() => setLockSpringPressure(l => !l)}
                      onChange={setSliderSpringOpen}
                    />
                  </div>

                  {/* What-If results */}
                  {whatIfResults && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg border bg-gray-50 text-center">
                          <div className="text-xs text-gray-500">Eff. Mass</div>
                          <div className="text-lg font-bold">{whatIfResults.effectiveMass}g</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-gray-50 text-center">
                          <div className="text-xs text-gray-500">Valve Lift</div>
                          <div className="text-lg font-bold">{whatIfResults.valveLift.toFixed(3)}"</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-gray-50 text-center">
                          <div className="text-xs text-gray-500">Required Open</div>
                          <div className="text-lg font-bold text-[#E85D04]">{whatIfResults.requiredOpenPressure} lbs</div>
                        </div>
                        <div className={`p-3 rounded-lg border text-center ${whatIfResults.rpmSafe ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                          <div className="text-xs text-gray-500">Float RPM</div>
                          <div className={`text-lg font-bold ${whatIfResults.rpmSafe ? "text-green-700" : "text-red-700"}`}>
                            {whatIfResults.floatRPM.toLocaleString()}
                          </div>
                          <div className={`text-xs font-semibold ${whatIfResults.rpmSafe ? "text-green-600" : "text-red-600"}`}>
                            {whatIfResults.rpmMargin >= 0 ? `+${whatIfResults.rpmMargin}%` : `${whatIfResults.rpmMargin}%`} margin
                          </div>
                        </div>
                      </div>

                      {!whatIfResults.rpmSafe && (
                        <div className="p-3 rounded-lg border bg-red-50 border-red-300 text-sm text-red-700">
                          At these settings, valve float occurs before your target RPM. Reduce RPM, lighten components, or increase spring pressure.
                        </div>
                      )}
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
                                  {row.camTypes.length > 0 ? row.camTypes.join(", ") : "\u2014"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Reverse mode: lobe lift conversion ── */}
                {(archSpec.hasRocker || arch === "dohc-finger") && rockerRatio !== 1.0 && (
                  <div className="p-4 rounded-lg border bg-gray-50 text-sm space-y-2">
                    <p className="font-semibold text-gray-700">Converting to Cam Lobe Lift</p>
                    <p className="text-muted-foreground">
                      Your max safe valve lift of <strong>{reverseResults.maxSafeLift.toFixed(3)}"</strong> with
                      a <strong>{rockerRatio.toFixed(2)}:1</strong> ratio means your cam lobe lift
                      should not exceed <strong>{(reverseResults.maxSafeLift / rockerRatio).toFixed(3)}"</strong>.
                    </p>
                    {lifterType === "solid" && (
                      <p className="text-muted-foreground">
                        Adding lash back ({lashValInt.toFixed(3)}" intake), the gross lobe lift limit
                        is <strong>{((reverseResults.maxSafeLift + lashValInt) / rockerRatio).toFixed(3)}"</strong>.
                      </p>
                    )}
                  </div>
                )}
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
            {massBreakdownRows().map((row, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
                <span className="text-gray-600">{row.label}</span>
                <span className="font-bold">{row.value}g {row.detail && <span className="text-xs text-gray-400">{row.detail}</span>}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-sm border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">Total Effective Mass at Valve</span>
              <span className="font-bold text-[#E85D04] text-lg">{Math.round(effectiveMass)}g <span className="text-sm text-gray-500">({(effectiveMass / 28.35).toFixed(1)} oz)</span></span>
            </div>
          </div>
        </Section>

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
                <h4 className="font-semibold text-foreground mb-1">Valve Float Causes</h4>
                <p>Inertia force increases with RPM squared. 18% more RPM = 40% more inertia. Springs must overcome this force at the cam nose.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Rocker Ratio Trap</h4>
                <p>1.5:1 to 1.7:1 = +13% lift but +28% effective mass at the valve (ratio squared). Always recalculate springs after a ratio change.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Flat Tappet Limit</h4>
                <p>Above ~130 lbs seat pressure on flat tappet = accelerated lobe wear, especially with low-ZDDP oils. Roller cams have no practical spring limit.</p>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Spring Pressure Ranges</h4>
                <ul className="space-y-1 mt-1 text-xs">
                  <li className="flex justify-between"><span>Hyd flat tappet:</span><span className="font-mono">85-130 lbs seat</span></li>
                  <li className="flex justify-between"><span>Hyd roller:</span><span className="font-mono">120-170 lbs seat</span></li>
                  <li className="flex justify-between"><span>Solid flat:</span><span className="font-mono">130-170 lbs seat</span></li>
                  <li className="flex justify-between"><span>Solid roller:</span><span className="font-mono">170-400 lbs seat</span></li>
                </ul>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Mass Targets (per valve)</h4>
                <ul className="space-y-1 mt-1 text-xs">
                  <li className="flex justify-between"><span>Stock pushrod:</span><span className="font-mono">~105g intake</span></li>
                  <li className="flex justify-between"><span>Ti valves:</span><span className="font-mono">~60g intake</span></li>
                  <li className="flex justify-between"><span>DOHC bucket:</span><span className="font-mono">~55g intake</span></li>
                  <li className="flex justify-between"><span>Ti retainers:</span><span className="font-mono">45% of steel</span></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </aside>

        </div>{/* end flex row */}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Valvetrain Geometry and Component Selection</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
            <p>
              The valvetrain is a mechanical chain that transmits motion from the camshaft lobe to the valve. In a pushrod engine, this chain includes the cam lobe, lifter, pushrod, rocker arm, and valve. Every component in this chain affects the final valve motion — changing any one part requires verifying that the rest of the system still works correctly. The rocker arm ratio multiplies the cam lobe lift, so a 0.300" lobe lift with a 1.6:1 rocker produces 0.480" of valve lift. Switching to 1.7:1 rockers on the same cam jumps to 0.510" — a free lift increase, but one that requires checking valve spring capacity, retainer-to-seal clearance, and piston-to-valve clearance.
            </p>
            <p>
              Valve float occurs when the valve spring cannot close the valve fast enough to follow the cam's closing ramp at high RPM. The inertia forces acting on the valve increase with the square of engine speed — an 18% increase in RPM (from 5,500 to 6,500) increases the force on the valve by 40%. This is why high-RPM engines need progressively stiffer springs, lighter valves, and lighter retainers. Titanium retainers weigh 40-50% less than steel and can add 500-800 RPM of safe operating range on the same springs.
            </p>
            <h3 className="text-sm font-semibold text-foreground mt-4">Flat Tappet vs. Roller Cam Considerations</h3>
            <p>
              Flat tappet cams have a practical spring pressure limit of approximately 130 lbs on the seat. Above this, accelerated cam lobe wear becomes a serious concern, especially with modern low-ZDDP motor oils. Roller cams eliminate this friction concern entirely — the roller lifter rides on a needle bearing instead of sliding contact, allowing spring pressures of 170-400+ lbs on the seat without lobe wear. This is why roller cams dominate performance applications: they permit the aggressive lobe profiles and high spring pressures needed for serious RPM and power. If you are building a flat tappet engine, use a dedicated break-in oil with high ZDDP content and stay within the spring pressure limits recommended by the cam manufacturer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
