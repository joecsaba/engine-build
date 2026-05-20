import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Info } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────

type CalculatorMode = "assessment" | "smoke-predictor" | "boost-fuel-balance";
type InputUnit = "lambda" | "afr";
type MeasurementCondition = "idle" | "light-cruise" | "moderate-load" | "heavy-load" | "full-throttle" | "sled-pull";
type TurboSetup = "stock-single" | "upgraded-single" | "compound" | "na";
type FuelInputMethod = "injection-qty" | "nozzle-size";
type InjectionUnit = "mm3" | "mg";
type PumpType = "stock" | "modified" | "race";

// ── Constants ───────────────────────────────────────────────────────────────────

const DIESEL_STOICH = 14.5; // No. 2 diesel stoichiometric AFR (14.5:1 per Bosch, Schiller Tuning, HP Academy)
const DIESEL_DENSITY = 0.832; // kg/L — No. 2 diesel fuel density

// ── Engine platform data (shared across diesel calculators) ─────────────────────

interface PlatformDef {
  label: string;
  cid: number;
  cylinders: number;
  maxRpm: number;
  fuelSystem: string;
  notes: string;
}

const PLATFORMS: Record<string, PlatformDef> = {
  "12v-cummins":     { label: "5.9L 12-Valve Cummins (6BT)",     cid: 359, cylinders: 6, maxRpm: 3200, fuelSystem: "P-pump mechanical", notes: "Mechanical injection — nozzle size and pump governor determine fuel delivery." },
  "24v-cummins":     { label: "5.9L 24-Valve Cummins (ISB)",     cid: 359, cylinders: 6, maxRpm: 3400, fuelSystem: "VP44 / Common Rail", notes: "VP44 ('98.5-'02) or CP3 common rail ('03+). Scanner can read injection quantity." },
  "6.7-cummins":     { label: "6.7L Cummins (ISB 6.7)",          cid: 408, cylinders: 6, maxRpm: 3600, fuelSystem: "CP3 Common Rail",    notes: "High-pressure common rail. Scanner reads injection quantity in mm\u00B3/stroke." },
  "duramax-early":   { label: "6.6L Duramax (LB7/LLY/LBZ/LMM)", cid: 403, cylinders: 8, maxRpm: 3400, fuelSystem: "CP3 Common Rail",    notes: "Bosch CP3 common rail. LB7 injectors are body-mounted." },
  "duramax-late":    { label: "6.6L Duramax (LML/L5P)",          cid: 403, cylinders: 8, maxRpm: 3500, fuelSystem: "CP4 / Denso Common Rail", notes: "LML uses CP4.2. L5P uses Denso HP4. Scanner reads injection quantity." },
  "7.3-powerstroke": { label: "7.3L Powerstroke",                 cid: 444, cylinders: 8, maxRpm: 3300, fuelSystem: "HEUI",               notes: "Hydraulically actuated electronic unit injectors. Nozzle size matters." },
  "6.0-powerstroke": { label: "6.0L Powerstroke",                 cid: 365, cylinders: 8, maxRpm: 3600, fuelSystem: "HEUI",               notes: "HEUI injection. Injector flow depends on ICP (injection control pressure)." },
  "6.4-powerstroke": { label: "6.4L Powerstroke",                 cid: 390, cylinders: 8, maxRpm: 3600, fuelSystem: "Piezo Common Rail",  notes: "Piezo common rail injectors. Scanner reads injection quantity." },
  "6.7-powerstroke": { label: "6.7L Powerstroke",                 cid: 406, cylinders: 8, maxRpm: 3500, fuelSystem: "Bosch Common Rail",  notes: "Bosch CP4.2 high-pressure common rail. Scanner reads injection quantity." },
  "custom":          { label: "Custom Diesel Engine",             cid: 0,   cylinders: 6, maxRpm: 3400, fuelSystem: "Unknown",            notes: "" },
};

// ── Nozzle / injector sizes ─────────────────────────────────────────────────────

interface NozzleDef {
  label: string;
  fuelFlowMm3: number; // mm\u00B3/stroke at max pump output
  group: string;
}

const NOZZLE_GROUPS = [
  "Mechanical (P-pump / VE Cummins)",
  "Cummins Common Rail",
  "HEUI (7.3L / 6.0L Powerstroke)",
  "Duramax",
  "Powerstroke Common Rail",
];

const NOZZLE_SIZES: NozzleDef[] = [
  // Mechanical (P-pump / VE Cummins)
  { label: "Stock 5\u00D70.012\" (12V Cummins)",       fuelFlowMm3: 80,  group: NOZZLE_GROUPS[0] },
  { label: "5\u00D70.014\" (mild tow tune)",            fuelFlowMm3: 100, group: NOZZLE_GROUPS[0] },
  { label: "5\u00D70.016\" (street performance)",       fuelFlowMm3: 125, group: NOZZLE_GROUPS[0] },
  { label: "5\u00D70.018\" (hot street / 400-500 HP)",  fuelFlowMm3: 155, group: NOZZLE_GROUPS[0] },
  { label: "5\u00D70.020\" (500-600 HP)",               fuelFlowMm3: 190, group: NOZZLE_GROUPS[0] },
  { label: "5\u00D70.022\" (600-700 HP race)",          fuelFlowMm3: 230, group: NOZZLE_GROUPS[0] },
  { label: "Marine 5\u00D70.024\" (700+ HP sled pull)", fuelFlowMm3: 275, group: NOZZLE_GROUPS[0] },
  // Cummins Common Rail
  { label: "Stock CR injectors (5.9L '03-'07)",       fuelFlowMm3: 120, group: NOZZLE_GROUPS[1] },
  { label: "Stock CR injectors (6.7L Cummins)",       fuelFlowMm3: 135, group: NOZZLE_GROUPS[1] },
  { label: "30% over CR injectors",                   fuelFlowMm3: 160, group: NOZZLE_GROUPS[1] },
  { label: "60% over CR injectors",                   fuelFlowMm3: 195, group: NOZZLE_GROUPS[1] },
  { label: "100% over CR injectors",                  fuelFlowMm3: 240, group: NOZZLE_GROUPS[1] },
  { label: "150% over CR injectors",                  fuelFlowMm3: 300, group: NOZZLE_GROUPS[1] },
  { label: "200% over CR injectors (race)",           fuelFlowMm3: 360, group: NOZZLE_GROUPS[1] },
  // HEUI (7.3 / 6.0 Powerstroke)
  { label: "Stock HEUI (7.3L)",                       fuelFlowMm3: 100, group: NOZZLE_GROUPS[2] },
  { label: "Stage 1 HEUI (7.3L, 160/0)",              fuelFlowMm3: 130, group: NOZZLE_GROUPS[2] },
  { label: "Stage 2 HEUI (7.3L, 200/100)",            fuelFlowMm3: 165, group: NOZZLE_GROUPS[2] },
  { label: "Stage 3 HEUI (7.3L, 250/200)",            fuelFlowMm3: 210, group: NOZZLE_GROUPS[2] },
  { label: "Stock HEUI (6.0L)",                       fuelFlowMm3: 110, group: NOZZLE_GROUPS[2] },
  { label: "Stage 1 HEUI (6.0L, 155/75)",             fuelFlowMm3: 140, group: NOZZLE_GROUPS[2] },
  { label: "Stage 2 HEUI (6.0L, 190/100)",            fuelFlowMm3: 175, group: NOZZLE_GROUPS[2] },
  // Duramax
  { label: "Stock Duramax LB7 injectors",             fuelFlowMm3: 115, group: NOZZLE_GROUPS[3] },
  { label: "Stock Duramax LBZ/LMM injectors",         fuelFlowMm3: 125, group: NOZZLE_GROUPS[3] },
  { label: "Stock Duramax L5P injectors",              fuelFlowMm3: 140, group: NOZZLE_GROUPS[3] },
  { label: "45% over Duramax injectors",               fuelFlowMm3: 185, group: NOZZLE_GROUPS[3] },
  { label: "100% over Duramax injectors",              fuelFlowMm3: 250, group: NOZZLE_GROUPS[3] },
  // Powerstroke CR
  { label: "Stock 6.4L Powerstroke injectors",         fuelFlowMm3: 130, group: NOZZLE_GROUPS[4] },
  { label: "Stock 6.7L Powerstroke injectors",         fuelFlowMm3: 145, group: NOZZLE_GROUPS[4] },
  { label: "30% over 6.7L Powerstroke",                fuelFlowMm3: 190, group: NOZZLE_GROUPS[4] },
];

// ── Diesel lambda zones (NOT the same as gasoline!) ─────────────────────────────

interface DieselLambdaZone {
  label: string;
  sub: string;
  smoke: string;
  color: string;
  bg: string;
  textClass: string;
}

function getDieselLambdaZone(l: number): DieselLambdaZone {
  if (l >= 2.0) return {
    label: "Very lean \u2014 normal for idle and light cruise",
    sub: "Maximum fuel efficiency. Clean exhaust.",
    smoke: "Clear",
    color: "#166534", bg: "bg-green-100 border-green-300", textClass: "text-green-800",
  };
  if (l >= 1.5) return {
    label: "Lean \u2014 normal for moderate driving",
    sub: "Clean exhaust. Good efficiency. Normal under moderate load.",
    smoke: "Clear",
    color: "#15803d", bg: "bg-green-50 border-green-200", textClass: "text-green-700",
  };
  if (l >= 1.3) return {
    label: "Moderate \u2014 good power zone for diesel",
    sub: "Normal under load. Slight haze possible on hard acceleration.",
    smoke: "Slight haze on tip-in",
    color: "#4d7c0f", bg: "bg-lime-50 border-lime-200", textClass: "text-lime-700",
  };
  if (l >= 1.2) return {
    label: "Rich for diesel \u2014 near smoke threshold",
    sub: "Visible puff on tip-in. More air (bigger turbo) would help.",
    smoke: "Visible puff, light haze under load",
    color: "#a16207", bg: "bg-yellow-50 border-yellow-200", textClass: "text-yellow-700",
  };
  if (l >= 1.1) return {
    label: "At smoke limit \u2014 continuous visible smoke",
    sub: "Over-fueled for available air. Increase boost or reduce fuel.",
    smoke: "Continuous light-to-moderate smoke",
    color: "#c2410c", bg: "bg-orange-50 border-orange-200", textClass: "text-orange-700",
  };
  if (l >= 1.0) return {
    label: "Over-fueled \u2014 heavy black smoke",
    sub: "Wasting fuel. High EGTs. Power is air-limited, not fuel-limited.",
    smoke: "Heavy black smoke",
    color: "#dc2626", bg: "bg-red-50 border-red-200", textClass: "text-red-700",
  };
  return {
    label: "DANGER \u2014 excess fuel cannot burn",
    sub: "Extreme smoke and EGTs. Engine damage risk. Reduce fuel immediately.",
    smoke: "Extreme \u2014 unburned fuel in exhaust",
    color: "#991b1b", bg: "bg-red-100 border-red-400", textClass: "text-red-900",
  };
}

// ── Expected lambda ranges by condition ─────────────────────────────────────────

interface ExpectedRange {
  label: string;
  min: number;
  max: number;
}

const EXPECTED_RANGES: Record<MeasurementCondition, ExpectedRange> = {
  "idle":          { label: "Idle",               min: 3.0, max: 6.0 },
  "light-cruise":  { label: "Light cruise",       min: 2.0, max: 3.5 },
  "moderate-load": { label: "Moderate load",       min: 1.5, max: 2.0 },
  "heavy-load":    { label: "Heavy load / towing", min: 1.3, max: 1.6 },
  "full-throttle": { label: "Full throttle / WOT", min: 1.2, max: 1.5 },
  "sled-pull":     { label: "Sled pull / drag",    min: 1.0, max: 1.2 },
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(val: number, d: number): string {
  const f = 10 ** d;
  return (Math.round(val * f + 1e-9) / f).toFixed(d);
}

function getAtmosphericPressure(altFt: number): number {
  return 14.696 * Math.pow(1 - 0.0000068753 * altFt, 5.2559);
}

/** Estimate mass airflow (lb/min) from engine parameters */
function estimateAirflow(cid: number, rpm: number, boostPsi: number, altFt: number, ambientTempF: number): number {
  const atmosPsi = getAtmosphericPressure(altFt);
  const absolutePsi = atmosPsi + boostPsi;
  // VE estimate for diesel
  const ve = boostPsi <= 20 ? 0.92 : boostPsi <= 30 ? 0.95 : boostPsi <= 40 ? 0.97 : 0.98;
  // Ideal gas correction for temperature
  const tempR = ambientTempF + 459.67;
  const stdTempR = 529.67; // 70\u00B0F standard
  const densityCorrection = stdTempR / tempR;
  // Mass airflow: CID * RPM * VE * (abs pressure / std pressure) * density correction / (2 * 1728)
  // Result in lb/min using standard air density 0.0765 lb/ft\u00B3
  const volumeCfm = (cid * rpm * ve) / (2 * 1728);
  const correctedCfm = volumeCfm * (absolutePsi / 14.696) * densityCorrection;
  return correctedCfm * 0.0765;
}

/** Convert mm\u00B3/stroke to lb/min fuel flow at given RPM and cylinders */
function fuelFlowLbMin(mm3PerStroke: number, rpm: number, cylinders: number): number {
  // mm\u00B3/stroke -> L/min: mm3 * cyl * (rpm/2) / 1_000_000  (4-stroke: 1 injection per 2 revs)
  const litersPerMin = (mm3PerStroke * cylinders * (rpm / 2)) / 1_000_000;
  // L/min * density (kg/L) * 2.20462 (kg->lb)
  return litersPerMin * DIESEL_DENSITY * 2.20462;
}

/** Pump capability multiplier */
function pumpMultiplier(pumpType: PumpType): number {
  if (pumpType === "stock") return 1.0;
  if (pumpType === "modified") return 1.25;
  return 1.5; // race
}

// ── Gauge bar component ─────────────────────────────────────────────────────────

function LambdaGauge({ lambda }: { lambda: number }) {
  // Map lambda to position on a bar from 0.7 (left/danger) to 3.0 (right/lean)
  const minL = 0.7;
  const maxL = 3.0;
  const clamped = Math.max(minL, Math.min(maxL, lambda));
  const pct = ((clamped - minL) / (maxL - minL)) * 100;

  return (
    <div className="mt-4">
      <div className="relative h-6 rounded-full overflow-hidden" style={{
        background: "linear-gradient(to right, #7f1d1d 0%, #dc2626 10%, #ea580c 18%, #eab308 25%, #84cc16 35%, #22c55e 50%, #16a34a 100%)",
      }}>
        <div
          className="absolute top-0 w-1 h-full bg-white border border-black/50 rounded-sm"
          style={{ left: `calc(${pct}% - 2px)`, transition: "left 0.3s ease" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>0.7 (danger)</span>
        <span>1.0 (stoich)</span>
        <span>1.3 (power)</span>
        <span>1.5+</span>
        <span>2.0+ (lean)</span>
      </div>
    </div>
  );
}

// ── Smoke visual bar ────────────────────────────────────────────────────────────

function SmokeBar({ lambda }: { lambda: number }) {
  const minL = 0.7;
  const maxL = 2.0;
  const clamped = Math.max(minL, Math.min(maxL, lambda));
  const pct = ((clamped - minL) / (maxL - minL)) * 100;

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-1">Estimated smoke level</p>
      <div className="relative h-5 rounded-full overflow-hidden" style={{
        background: "linear-gradient(to right, #1a1a1a 0%, #555 25%, #999 40%, #ccc 55%, #e5e5e5 70%, #f5f5f5 100%)",
      }}>
        <div
          className="absolute top-0 w-1.5 h-full bg-[#E85D04] border border-white rounded-sm"
          style={{ left: `calc(${pct}% - 3px)`, transition: "left 0.3s ease" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>Extreme</span>
        <span>Heavy</span>
        <span>Moderate</span>
        <span>Haze</span>
        <span>Clear</span>
      </div>
    </div>
  );
}

// ── Grouped nozzle select ───────────────────────────────────────────────────────

function NozzleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Build grouped items with section headers
  let lastGroup = "";
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select nozzle / injector..." /></SelectTrigger>
      <SelectContent>
        {NOZZLE_SIZES.map((n, i) => {
          const showHeader = n.group !== lastGroup;
          lastGroup = n.group;
          return (
            <div key={i}>
              {showHeader && (
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-muted-foreground tracking-wide border-t first:border-t-0 mt-1 first:mt-0">
                  {n.group}
                </div>
              )}
              <SelectItem value={String(i)}>{n.label} ({n.fuelFlowMm3} mm\u00B3)</SelectItem>
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// ── Platform quick-picker for modes 2 & 3 ───────────────────────────────────────

function PlatformQuickPicker({ onSelect }: { onSelect: (cid: number, cyl: number, rpm: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>Quick-fill from platform</Label>
      <Select onValueChange={(v) => {
        const p = PLATFORMS[v];
        if (p && v !== "custom") onSelect(p.cid, p.cylinders, p.maxRpm);
      }}>
        <SelectTrigger><SelectValue placeholder="Select to auto-fill engine specs..." /></SelectTrigger>
        <SelectContent>
          {Object.entries(PLATFORMS).filter(([k]) => k !== "custom").map(([key, p]) => (
            <SelectItem key={key} value={key}>{p.label} ({p.cid} CI, {p.cylinders}-cyl)</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Fills displacement, cylinders, and RPM from known platform specs.</p>
    </div>
  );
}

// ── Mode definitions ────────────────────────────────────────────────────────────

const MODES: { id: CalculatorMode; short: string; desc: string }[] = [
  { id: "assessment",         short: "Lambda / AFR Assessment",  desc: "Enter your wideband reading \u2014 get diesel-specific interpretation" },
  { id: "smoke-predictor",    short: "Smoke Predictor",          desc: "Enter boost, RPM, and fuel delivery \u2014 predict lambda and smoke" },
  { id: "boost-fuel-balance", short: "Boost-to-Fuel Balance",    desc: "Find if you're air-limited or fuel-limited" },
];

const CONDITIONS: { id: MeasurementCondition; label: string }[] = [
  { id: "idle",          label: "Idle" },
  { id: "light-cruise",  label: "Light cruise" },
  { id: "moderate-load", label: "Moderate load" },
  { id: "heavy-load",    label: "Heavy load / towing" },
  { id: "full-throttle", label: "Full throttle / WOT" },
  { id: "sled-pull",     label: "Sled pull / drag" },
];

const TURBO_SETUPS: { id: TurboSetup; label: string }[] = [
  { id: "stock-single",    label: "Stock single turbo" },
  { id: "upgraded-single", label: "Upgraded single" },
  { id: "compound",        label: "Compound turbos" },
  { id: "na",              label: "Naturally aspirated" },
];

// ── Diesel vs Gas comparison data ───────────────────────────────────────────────

const COMPARISON_TABLE = [
  { condition: "Idle",          gasLambda: "1.0 (stoich)",     dieselLambda: "3.0\u20136.0 (very lean)" },
  { condition: "Cruise",        gasLambda: "1.0\u20131.05",          dieselLambda: "2.0\u20133.5" },
  { condition: "Moderate load", gasLambda: "0.95\u20131.0",          dieselLambda: "1.5\u20132.0" },
  { condition: "Full power",    gasLambda: "0.82\u20130.90 (rich)",  dieselLambda: "1.2\u20131.4 (still lean!)" },
  { condition: "Danger zone",   gasLambda: "<0.75 (too rich)", dieselLambda: "<1.0 (too rich for diesel)" },
];

// ── Component ───────────────────────────────────────────────────────────────────

export default function DieselSmokeLambdaCalculator() {
  // Mode
  const [mode, setMode] = useState<CalculatorMode>("assessment");

  // ── Assessment mode state ──
  const [inputUnit, setInputUnit] = useState<InputUnit>("lambda");
  const [inputValue, setInputValue] = useState("1.30");
  const [lambda, setLambda] = useState(1.30);
  const [condition, setCondition] = useState<MeasurementCondition>("full-throttle");
  const [platform, setPlatform] = useState("12v-cummins");
  const [turboSetup, setTurboSetup] = useState<TurboSetup>("stock-single");

  // ── Smoke predictor state ──
  const [spDisplacement, setSpDisplacement] = useState("359");
  const [spCylinders, setSpCylinders] = useState("6");
  const [spRpm, setSpRpm] = useState("3200");
  const [spBoost, setSpBoost] = useState("30");
  const [spAmbientTemp, setSpAmbientTemp] = useState("70");
  const [spAltitude, setSpAltitude] = useState("0");
  const [spFuelMethod, setSpFuelMethod] = useState<FuelInputMethod>("nozzle-size");
  const [spInjectionQty, setSpInjectionQty] = useState("120");
  const [spInjectionUnit, setSpInjectionUnit] = useState<InjectionUnit>("mm3");
  const [spNozzleIdx, setSpNozzleIdx] = useState("3"); // 5x0.018

  // ── Boost-to-fuel balance state ──
  const [bfDisplacement, setBfDisplacement] = useState("359");
  const [bfCylinders, setBfCylinders] = useState("6");
  const [bfRpm, setBfRpm] = useState("3200");
  const [bfBoost, setBfBoost] = useState("35");
  const [bfNozzleIdx, setBfNozzleIdx] = useState("3");
  const [bfPumpType, setBfPumpType] = useState<PumpType>("stock");
  const [bfAltitude, setBfAltitude] = useState("0");
  const [bfAmbientTemp, setBfAmbientTemp] = useState("70");

  // ── Collapsible sections ──
  const [educationOpen, setEducationOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [rangesOpen, setRangesOpen] = useState(false);

  // ── Debounced lambda for smooth badge transitions ──
  const [dbLambda, setDbLambda] = useState(1.30);

  useEffect(() => {
    const t = setTimeout(() => setDbLambda(lambda), 200);
    return () => clearTimeout(t);
  }, [lambda]);

  // Sync platform to smoke predictor / balance displacement
  function handlePlatformChange(v: string) {
    setPlatform(v);
    const p = PLATFORMS[v];
    if (v !== "custom") {
      setSpDisplacement(String(p.cid));
      setSpCylinders(String(p.cylinders));
      setSpRpm(String(p.maxRpm));
      setBfDisplacement(String(p.cid));
      setBfCylinders(String(p.cylinders));
      setBfRpm(String(p.maxRpm));
    }
  }

  // ── Assessment mode handlers ──

  function handleInput(val: string) {
    setInputValue(val);
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    let l: number;
    if (inputUnit === "lambda") {
      l = num;
    } else {
      l = num / DIESEL_STOICH;
    }
    setLambda(Math.max(0.5, Math.min(8.0, l)));
  }

  function handleUnitSwitch(u: InputUnit) {
    setInputUnit(u);
    if (u === "lambda") {
      setInputValue(lambda.toFixed(2));
    } else {
      setInputValue(fmt(lambda * DIESEL_STOICH, 1));
    }
  }

  // ── Derived: Assessment ──
  const zone = getDieselLambdaZone(dbLambda);
  const afr = lambda * DIESEL_STOICH;
  const expectedRange = EXPECTED_RANGES[condition];
  const inRange = lambda >= expectedRange.min && lambda <= expectedRange.max;

  // ── Derived: Smoke Predictor ──
  const spCid = parseFloat(spDisplacement) || 359;
  const spCyl = parseInt(spCylinders) || 6;
  const spRpmVal = parseInt(spRpm) || 3200;
  const spBoostVal = parseFloat(spBoost) || 30;
  const spTempVal = parseFloat(spAmbientTemp) || 70;
  const spAltVal = parseInt(spAltitude) || 0;

  let spFuelMm3 = 0;
  if (spFuelMethod === "injection-qty") {
    const raw = parseFloat(spInjectionQty) || 0;
    if (spInjectionUnit === "mg") {
      spFuelMm3 = raw / DIESEL_DENSITY; // mg -> mm\u00B3 (1 mm\u00B3 = density mg)
    } else {
      spFuelMm3 = raw;
    }
  } else {
    const nozzle = NOZZLE_SIZES[parseInt(spNozzleIdx)] || NOZZLE_SIZES[3];
    spFuelMm3 = nozzle.fuelFlowMm3;
  }

  const spAirLbMin = estimateAirflow(spCid, spRpmVal, spBoostVal, spAltVal, spTempVal);
  const spFuelLbMin = fuelFlowLbMin(spFuelMm3, spRpmVal, spCyl);
  const spLambda = spFuelLbMin > 0 ? (spAirLbMin / spFuelLbMin) / DIESEL_STOICH : 99;
  const spZone = getDieselLambdaZone(spLambda);
  const spAirLimited = spLambda < 1.3;
  const spImbalancePct = spFuelLbMin > 0 ? Math.abs(1 - (spAirLbMin / (spFuelLbMin * DIESEL_STOICH * 1.3))) * 100 : 0;
  // Estimated HP from air side: HP = airflow * 60 / (BSFC * AFR)
  // Uses AFR=22.0 to match diesel single turbo and compound turbo calculators (industry standard)
  const DIESEL_POWER_AFR = 22.0; // lambda ~1.52 — standard diesel turbo sizing AFR (BorgWarner, HP Academy)
  const DIESEL_BSFC = 0.40;     // lb/hp-hr — matches turbo calculators
  const spEstHp = (spAirLbMin * 60) / (DIESEL_BSFC * DIESEL_POWER_AFR);
  // Reverse calc: max mm3/stroke at lambda 1.2 (smoke threshold) with current air
  const spMaxFuelLbMin_1_2 = spAirLbMin / (1.2 * DIESEL_STOICH);
  const spMaxMm3_1_2 = spCyl > 0 && spRpmVal > 0
    ? (spMaxFuelLbMin_1_2 / (DIESEL_DENSITY * 2.20462)) * 1_000_000 / (spCyl * (spRpmVal / 2))
    : 0;

  // ── Derived: Boost-to-Fuel Balance ──
  const bfCid = parseFloat(bfDisplacement) || 359;
  const bfCyl = parseInt(bfCylinders) || 6;
  const bfRpmVal = parseInt(bfRpm) || 3200;
  const bfBoostVal = parseFloat(bfBoost) || 35;
  const bfAltVal = parseInt(bfAltitude) || 0;
  const bfTempVal = parseFloat(bfAmbientTemp) || 70;
  const bfNozzle = NOZZLE_SIZES[parseInt(bfNozzleIdx)] || NOZZLE_SIZES[3];
  const bfFuelMm3 = bfNozzle.fuelFlowMm3 * pumpMultiplier(bfPumpType);

  const bfAirLbMin = estimateAirflow(bfCid, bfRpmVal, bfBoostVal, bfAltVal, bfTempVal);
  const bfFuelLbMin = fuelFlowLbMin(bfFuelMm3, bfRpmVal, bfCyl);
  const bfLambda = bfFuelLbMin > 0 ? (bfAirLbMin / bfFuelLbMin) / DIESEL_STOICH : 99;
  const bfZone = getDieselLambdaZone(bfLambda);

  // Estimate HP from airflow: HP = airflow * 60 / (BSFC * AFR)
  // Uses AFR=22.0 to match single turbo and compound turbo calculators
  const bfAirHp = (bfAirLbMin * 60) / (DIESEL_BSFC * DIESEL_POWER_AFR);
  const bfFuelHp = (bfFuelLbMin * DIESEL_POWER_AFR * 60) / (DIESEL_BSFC * DIESEL_POWER_AFR);
  const bfBottleneck = bfLambda < 1.3 ? "air" : "fuel";
  const bfOverPct = bfLambda < 1.3
    ? ((1 - bfLambda / 1.3) * 100)
    : ((bfLambda / 1.3 - 1) * 100);

  // Estimate boost needed to match fuel at lambda 1.3
  const bfTargetAirLbMin = bfFuelLbMin * DIESEL_STOICH * 1.3;
  const bfCurrentRatio = bfBoostVal > 0 ? bfTargetAirLbMin / bfAirLbMin : 1;
  const bfNeededBoostPsi = bfBoostVal * bfCurrentRatio;

  // ── Warnings ──
  const assessmentWarnings: string[] = [];
  if (lambda < 1.1 && condition !== "sled-pull") {
    assessmentWarnings.push("Lambda below 1.1 is unsafe for sustained operation. EGTs will be extreme. Reduce fueling or add significant airflow.");
  }
  if (lambda < 1.3 && turboSetup === "stock-single") {
    assessmentWarnings.push("Your stock turbo cannot supply enough air for this fuel level. Upgrading the turbo is more effective than adding more fuel.");
  }
  if (lambda > 2.5 && condition === "full-throttle") {
    assessmentWarnings.push("Very lean at WOT suggests a fueling problem \u2014 possible weak lift pump, plugged filter, or fuel delivery issue. Your engine is making less power than it should.");
  }
  if (inputUnit === "afr" && afr < 14.0) {
    assessmentWarnings.push("An AFR below stoichiometric (14.5:1) on a diesel is extremely dangerous. Verify your wideband is calibrated for diesel fuel, not gasoline.");
  }

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Diesel Smoke Limit / AFR-Lambda Calculator"
        description="Diesel-specific lambda and AFR calculator with smoke prediction, boost-to-fuel balance analysis, and operating range assessment. For Cummins, Duramax, and Powerstroke diesel engines."
        canonical="/calculators/diesel-smoke-lambda"
        keywords="diesel lambda calculator, diesel AFR calculator, diesel smoke limit, diesel air fuel ratio, boost to fuel ratio diesel, diesel tuning lambda, black smoke diesel calculator, diesel wideband"
      />
      <h1 className="text-3xl font-bold mb-2">Diesel Smoke Limit / AFR-Lambda Calculator</h1>
      <p className="text-muted-foreground mb-6">Diesel-specific lambda assessment, smoke prediction, and boost-to-fuel balance. Diesel is NOT gasoline \u2014 lambda 1.3 is a good power target, not 0.85.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      {/* ── Mode Toggle ── */}
      <div className="flex flex-col sm:flex-row rounded-lg border overflow-hidden mb-8">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors text-left ${
              mode === m.id
                ? "bg-[#1a1a1a] text-white"
                : "bg-white text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode(m.id)}
          >
            <span className="block font-semibold">{m.short}</span>
            <span className="block text-xs mt-0.5 opacity-70">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODE 1: LAMBDA / AFR ASSESSMENT                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {mode === "assessment" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: INPUTS */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Lambda / AFR Reading</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Unit toggle */}
                <div className="flex rounded-md border overflow-hidden">
                  {(["lambda", "afr"] as InputUnit[]).map((u) => (
                    <button
                      key={u}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        inputUnit === u
                          ? "bg-[#1a1a1a] text-white"
                          : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => handleUnitSwitch(u)}
                    >
                      {u === "lambda" ? "Lambda (\u03BB)" : "AFR"}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <Label>{inputUnit === "lambda" ? "Lambda (\u03BB)" : "Diesel AFR"}</Label>
                  <Input
                    type="number"
                    step={inputUnit === "lambda" ? "0.01" : "0.1"}
                    value={inputValue}
                    onChange={(e) => handleInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {inputUnit === "lambda"
                      ? "Diesel lambda: 1.0 = stoichiometric (14.5:1 AFR). Normal operating range is 1.2\u20136.0."
                      : `Diesel stoichiometric AFR is ${DIESEL_STOICH}:1. Normal operating range is ${fmt(1.2 * DIESEL_STOICH, 1)}\u2013${fmt(6.0 * DIESEL_STOICH, 0)}:1.`
                    }
                  </p>
                </div>

                {/* Measurement condition */}
                <div className="space-y-2">
                  <Label>Measurement Condition</Label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border overflow-hidden">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.id}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                          condition === c.id
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-white text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => setCondition(c.id)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Engine platform */}
                <div className="space-y-2">
                  <Label>Engine Platform</Label>
                  <Select value={platform} onValueChange={handlePlatformChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORMS).map(([key, p]) => (
                        <SelectItem key={key} value={key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Turbo setup */}
                <div className="space-y-2">
                  <Label>Turbo Setup</Label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border overflow-hidden">
                    {TURBO_SETUPS.map((t) => (
                      <button
                        key={t.id}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                          turboSetup === t.id
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-white text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => setTurboSetup(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diesel-specific safety warning */}
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
              <strong>Diesel is NOT gasoline:</strong> On a diesel, lambda 1.0 is stoichiometric and DANGEROUS under load. Target lambda 1.2\u20131.4 for full power. Lambda below 1.0 means excess fuel that cannot burn \u2014 wasted diesel going out the exhaust as black smoke.
            </div>
          </div>

          {/* RIGHT: RESULTS */}
          <div className="space-y-4">
            {/* Main results */}
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Diesel Lambda Results</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${inputUnit === "lambda" ? "bg-white/10 ring-1 ring-primary" : "bg-white/5"}`}>
                    <p className="text-gray-400 text-sm">Lambda (\u03BB)</p>
                    <p className="text-4xl font-bold text-primary">{lambda.toFixed(2)}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${inputUnit === "afr" ? "bg-white/10 ring-1 ring-primary" : "bg-white/5"}`}>
                    <p className="text-gray-400 text-sm">Diesel AFR</p>
                    <p className="text-4xl font-bold">{fmt(afr, 1)}:1</p>
                    <p className="text-xs text-gray-500 mt-1">Stoich: {DIESEL_STOICH}:1</p>
                  </div>
                </div>
                <LambdaGauge lambda={lambda} />
              </CardContent>
            </Card>

            {/* Condition badge */}
            <div className={`p-4 rounded-lg border ${zone.bg}`}>
              <p className={`font-bold ${zone.textClass}`}>{zone.label}</p>
              <p className="text-sm mt-1 text-muted-foreground">{zone.sub}</p>
              <p className="text-xs mt-2 text-muted-foreground">Estimated exhaust: <strong>{zone.smoke}</strong></p>
            </div>

            {/* Contextual assessment */}
            <Card>
              <CardHeader><CardTitle>Contextual Assessment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {inRange ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                    Your lambda of {lambda.toFixed(2)} at {expectedRange.label.toLowerCase()} is within the expected range ({expectedRange.min.toFixed(1)}\u2013{expectedRange.max.toFixed(1)}) for a turbo diesel. Combustion is clean and efficient.
                  </div>
                ) : lambda < expectedRange.min ? (
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
                    Your lambda of {lambda.toFixed(2)} at {expectedRange.label.toLowerCase()} is too rich. Expected range is {expectedRange.min.toFixed(1)}\u2013{expectedRange.max.toFixed(1)}. Possible causes: aggressive tuning, stuck injector, boost leak reducing airflow, or raised smoke limiter tables.
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                    Your lambda of {lambda.toFixed(2)} at {expectedRange.label.toLowerCase()} is leaner than typical ({expectedRange.min.toFixed(1)}\u2013{expectedRange.max.toFixed(1)}). {condition === "full-throttle" || condition === "heavy-load" ? "This may indicate a fueling problem \u2014 check lift pump, fuel filter, or injection timing." : "This is not harmful but may indicate reduced fueling."}
                  </div>
                )}

                {turboSetup === "na" && lambda < 1.4 && (
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                    A naturally aspirated diesel at lambda {lambda.toFixed(2)} is very rich. NA diesels typically run lambda 1.2\u20131.4 at full power. Without forced induction, the only path to more air is displacement or higher RPM.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warnings */}
            {assessmentWarnings.length > 0 && (
              <div className="space-y-2">
                {assessmentWarnings.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                    <strong>Warning:</strong> {w}
                  </div>
                ))}
              </div>
            )}

            {/* Smoke bar */}
            <Card>
              <CardHeader><CardTitle>Smoke Visibility Estimate</CardTitle></CardHeader>
              <CardContent>
                <SmokeBar lambda={lambda} />
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>\u03BB &gt;1.5 \u2192 Virtually clear exhaust</p>
                  <p>\u03BB 1.3\u20131.5 \u2192 Slight haze under hard acceleration, clears quickly</p>
                  <p>\u03BB 1.2\u20131.3 \u2192 Visible puff on tip-in, light haze under load</p>
                  <p>\u03BB 1.1\u20131.2 \u2192 Continuous light-to-moderate smoke under load</p>
                  <p>\u03BB 1.0\u20131.1 \u2192 Heavy black smoke (\u201Crolling coal\u201D territory)</p>
                  <p>\u03BB &lt;1.0 \u2192 Extreme smoke \u2014 fuel running out the exhaust unburned</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODE 2: SMOKE PREDICTOR                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {mode === "smoke-predictor" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: INPUTS */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engine & Operating Conditions</CardTitle>
                <CardDescription>Select your platform to auto-fill, or enter specs manually.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlatformQuickPicker onSelect={(cid, cyl, rpm) => {
                  setSpDisplacement(String(cid));
                  setSpCylinders(String(cyl));
                  setSpRpm(String(rpm));
                }} />
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Displacement (CID)</Label>
                    <Input type="number" step="1" value={spDisplacement} onChange={(e) => setSpDisplacement(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cylinders</Label>
                    <Select value={spCylinders} onValueChange={setSpCylinders}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["4", "6", "8", "10", "12"].map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>RPM</Label>
                    <Input type="number" step="100" value={spRpm} onChange={(e) => setSpRpm(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Boost Pressure (PSI)</Label>
                  <Input type="number" step="1" value={spBoost} onChange={(e) => setSpBoost(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ambient Temp (\u00B0F)</Label>
                    <Input type="number" step="5" value={spAmbientTemp} onChange={(e) => setSpAmbientTemp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Altitude (ft)</Label>
                    <Input type="number" step="500" value={spAltitude} onChange={(e) => setSpAltitude(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fuel Delivery Estimate</CardTitle>
                <CardDescription>How much fuel is your engine injecting?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Method toggle */}
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                      spFuelMethod === "nozzle-size" ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setSpFuelMethod("nozzle-size")}
                  >
                    I know my nozzle/injector size
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                      spFuelMethod === "injection-qty" ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setSpFuelMethod("injection-qty")}
                  >
                    I know my injection quantity
                  </button>
                </div>

                {spFuelMethod === "injection-qty" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Injection Quantity per Stroke</Label>
                      <div className="flex gap-2">
                        <Input type="number" step="1" value={spInjectionQty} onChange={(e) => setSpInjectionQty(e.target.value)} className="flex-1" />
                        <Select value={spInjectionUnit} onValueChange={(v) => setSpInjectionUnit(v as InjectionUnit)}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mm3">mm\u00B3/stroke</SelectItem>
                            <SelectItem value="mg">mg/stroke</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">Read from scanner data (common rail). Stock 5.9L CR: ~120 mm\u00B3/stroke at WOT.</p>
                    </div>
                    {/* mm3/mg quick reference */}
                    <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                      <strong>Quick conversion:</strong> {spInjectionUnit === "mm3"
                        ? `${spInjectionQty} mm\u00B3 = ${fmt((parseFloat(spInjectionQty) || 0) * DIESEL_DENSITY, 1)} mg (at ${DIESEL_DENSITY} kg/L diesel density)`
                        : `${spInjectionQty} mg = ${fmt((parseFloat(spInjectionQty) || 0) / DIESEL_DENSITY, 1)} mm\u00B3 (at ${DIESEL_DENSITY} kg/L diesel density)`
                      }
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Nozzle / Injector Size</Label>
                    <NozzleSelect value={spNozzleIdx} onChange={setSpNozzleIdx} />
                    <p className="text-xs text-muted-foreground">Max fuel delivery estimate at full pump output.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: RESULTS */}
          <div className="space-y-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Smoke Prediction Results</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-sm">Estimated Lambda</p>
                    <p className={`text-4xl font-bold ${spLambda < 1.0 ? "text-red-400" : spLambda < 1.2 ? "text-orange-400" : "text-primary"}`}>
                      {spLambda > 10 ? ">10" : spLambda.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-sm">Estimated AFR</p>
                    <p className="text-4xl font-bold">
                      {spLambda > 10 ? ">146" : fmt(spLambda * DIESEL_STOICH, 1)}:1
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-xs">Air Mass</p>
                    <p className="text-lg font-bold">{fmt(spAirLbMin, 1)} <span className="text-xs text-gray-500">lb/min</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-xs">Fuel Mass</p>
                    <p className="text-lg font-bold">{fmt(spFuelLbMin, 2)} <span className="text-xs text-gray-500">lb/min</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-xs">Est. Clean HP</p>
                    <p className="text-lg font-bold text-primary">{fmt(spEstHp, 0)} <span className="text-xs text-gray-500">HP</span></p>
                    <p className="text-[10px] text-gray-500">at \u03BB 1.3</p>
                  </div>
                </div>
                <SmokeBar lambda={spLambda} />
              </CardContent>
            </Card>

            {/* Smoke level badge */}
            <div className={`p-4 rounded-lg border ${spZone.bg}`}>
              <p className={`font-bold ${spZone.textClass}`}>{spZone.label}</p>
              <p className="text-sm mt-1 text-muted-foreground">Estimated exhaust: <strong>{spZone.smoke}</strong></p>
            </div>

            {/* Air/Fuel balance */}
            <Card>
              <CardHeader><CardTitle>Air vs. Fuel Balance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {spAirLimited ? (
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
                    <strong>AIR-LIMITED:</strong> Your engine has {fmt(spAirLbMin, 1)} lb/min of air but your fuel delivery demands {fmt(spFuelLbMin * DIESEL_STOICH * 1.3, 1)} lb/min for clean combustion at lambda 1.3. You are air-limited by ~{spImbalancePct.toFixed(0)}%. A turbo upgrade would allow your existing fuel system to make more power cleanly.
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                    <strong>BALANCED or FUEL-LIMITED:</strong> At {fmt(spBoostVal, 0)} PSI boost, your engine has enough air for clean combustion with your current fuel delivery. Lambda {spLambda.toFixed(2)} is in the clean range.
                  </div>
                )}

                {spLambda < 1.1 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                    <strong>Warning:</strong> Predicted lambda {spLambda.toFixed(2)} will produce heavy black smoke and extreme EGTs. Either increase boost significantly or reduce fuel delivery.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reverse calculation: max fuel before smoke */}
            <Card>
              <CardHeader><CardTitle>Max Fuel Before Smoke</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  At {fmt(spBoostVal, 0)} PSI boost and {spRpmVal.toLocaleString()} RPM, your engine flows {fmt(spAirLbMin, 1)} lb/min of air. The maximum fuel you can inject before visible smoke (lambda 1.2):
                </p>
                <div className="p-4 rounded-lg bg-[#E85D04]/10 border border-[#E85D04]/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Max injection qty</p>
                      <p className="text-2xl font-bold">{fmt(spMaxMm3_1_2, 0)} mm\u00B3/stroke</p>
                      <p className="text-xs text-muted-foreground">{fmt(spMaxMm3_1_2 * DIESEL_DENSITY, 0)} mg/stroke</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Clean HP potential</p>
                      <p className="text-2xl font-bold">{fmt(spEstHp, 0)} HP</p>
                      <p className="text-xs text-muted-foreground">BSFC 0.40 / AFR 22</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Fuel above {fmt(spMaxMm3_1_2, 0)} mm\u00B3/stroke at this boost level will produce visible smoke. To inject more fuel cleanly, increase boost (bigger turbo).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODE 3: BOOST-TO-FUEL BALANCE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {mode === "boost-fuel-balance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: INPUTS */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engine & Boost</CardTitle>
                <CardDescription>Select your platform to auto-fill, or enter specs manually.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlatformQuickPicker onSelect={(cid, cyl, rpm) => {
                  setBfDisplacement(String(cid));
                  setBfCylinders(String(cyl));
                  setBfRpm(String(rpm));
                }} />
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Displacement (CID)</Label>
                    <Input type="number" step="1" value={bfDisplacement} onChange={(e) => setBfDisplacement(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cylinders</Label>
                    <Select value={bfCylinders} onValueChange={setBfCylinders}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["4", "6", "8", "10", "12"].map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>RPM</Label>
                    <Input type="number" step="100" value={bfRpm} onChange={(e) => setBfRpm(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Boost Pressure (PSI)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {["20", "25", "30", "35", "40", "45", "50"].map((b) => (
                      <button
                        key={b}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          bfBoost === b
                            ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                            : "bg-white text-muted-foreground border-gray-200 hover:border-[#E85D04]"
                        }`}
                        onClick={() => setBfBoost(b)}
                      >
                        {b} PSI
                      </button>
                    ))}
                  </div>
                  <Input type="number" step="1" value={bfBoost} onChange={(e) => setBfBoost(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ambient Temp (\u00B0F)</Label>
                    <Input type="number" step="5" value={bfAmbientTemp} onChange={(e) => setBfAmbientTemp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Altitude (ft)</Label>
                    <Input type="number" step="500" value={bfAltitude} onChange={(e) => setBfAltitude(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fuel System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nozzle / Injector Size</Label>
                  <NozzleSelect value={bfNozzleIdx} onChange={setBfNozzleIdx} />
                </div>
                <div className="space-y-2">
                  <Label>Injection Pump</Label>
                  <div className="flex rounded-md border overflow-hidden">
                    {(["stock", "modified", "race"] as PumpType[]).map((p) => (
                      <button
                        key={p}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          bfPumpType === p
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-white text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => setBfPumpType(p)}
                      >
                        {p === "stock" ? "Stock" : p === "modified" ? "Modified" : "Built Race"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bfPumpType === "stock" ? "Stock pump output." : bfPumpType === "modified" ? "~25% over stock (governor springs, delivery valves)." : "~50% over stock (full race pump build)."}
                    {" "}Estimated max delivery: {bfFuelMm3.toFixed(0)} mm\u00B3/stroke.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: RESULTS */}
          <div className="space-y-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Boost-to-Fuel Balance</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-xs">Estimated Lambda</p>
                    <p className={`text-3xl font-bold ${bfLambda < 1.0 ? "text-red-400" : bfLambda < 1.2 ? "text-orange-400" : bfLambda < 1.5 ? "text-primary" : "text-green-400"}`}>
                      {bfLambda > 10 ? ">10" : bfLambda.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-xs">Air Mass</p>
                    <p className="text-3xl font-bold">{fmt(bfAirLbMin, 1)}</p>
                    <p className="text-xs text-gray-500">lb/min</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-xs">Fuel Mass</p>
                    <p className="text-3xl font-bold">{fmt(bfFuelLbMin, 2)}</p>
                    <p className="text-xs text-gray-500">lb/min</p>
                  </div>
                </div>
                <LambdaGauge lambda={bfLambda} />
              </CardContent>
            </Card>

            {/* Condition badge */}
            <div className={`p-4 rounded-lg border ${bfZone.bg}`}>
              <p className={`font-bold ${bfZone.textClass}`}>{bfZone.label}</p>
              <p className="text-sm mt-1 text-muted-foreground">Estimated exhaust: <strong>{bfZone.smoke}</strong></p>
            </div>

            {/* Bottleneck analysis */}
            <Card>
              <CardHeader><CardTitle>Bottleneck Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg border ${bfBottleneck === "air" ? "border-orange-300 bg-orange-50" : "border-green-300 bg-green-50"}`}>
                  <p className={`font-bold text-sm ${bfBottleneck === "air" ? "text-orange-800" : "text-green-800"}`}>
                    {bfBottleneck === "air"
                      ? `AIR-LIMITED \u2014 over-fueled by ~${bfOverPct.toFixed(0)}%`
                      : `FUEL-LIMITED or BALANCED \u2014 air surplus of ~${bfOverPct.toFixed(0)}%`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Your {bfNozzle.label} can deliver fuel for ~{fmt(bfFuelLbMin * DIESEL_POWER_AFR * 60 / (DIESEL_BSFC * DIESEL_POWER_AFR), 0)} HP (at AFR 22, BSFC 0.40),
                    but at {fmt(bfBoostVal, 0)} PSI boost your turbo is supplying air for ~{fmt(bfAirHp, 0)} HP.
                  </p>
                </div>

                {bfBottleneck === "air" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Two paths forward:</p>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      <strong>Add air:</strong> Upgrade turbo to reach ~{fmt(bfNeededBoostPsi, 0)} PSI boost to match your fuel delivery at lambda 1.3.
                      {bfNeededBoostPsi > 45 && " This likely requires compound turbos."}
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      <strong>Reduce fuel:</strong> Step down to smaller nozzles/injectors for a clean ~{fmt(bfAirHp, 0)} HP build with your current turbo.
                    </div>
                  </div>
                )}

                {bfLambda < 1.1 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                    <strong>Warning:</strong> Lambda {bfLambda.toFixed(2)} at full fuel delivery will produce heavy smoke and extreme EGTs. This setup is severely air-limited.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLLAPSIBLE SECTIONS                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* Diesel Lambda Ranges Reference */}
      <Section title="Diesel Lambda Operating Ranges" open={rangesOpen} toggle={() => setRangesOpen(!rangesOpen)}>
        <p className="text-sm text-muted-foreground mb-4">Expected diesel lambda ranges by operating condition. These are fundamentally different from gasoline.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Condition</th>
                <th className="text-right py-2">Lambda Range</th>
                <th className="text-right py-2">AFR Range</th>
                <th className="text-left py-2 pl-4">Exhaust</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cond: "Idle",                    lambda: "3.0\u20136.0+",  afr: "44\u201388:1",      smoke: "Clear \u2014 massive excess air" },
                { cond: "Light cruise",            lambda: "2.0\u20133.5",   afr: "29\u201351:1",      smoke: "Clear" },
                { cond: "Moderate load",           lambda: "1.5\u20132.0",   afr: "22\u201329:1",      smoke: "Clear" },
                { cond: "Heavy load / towing",     lambda: "1.3\u20131.6",   afr: "19\u201323:1",      smoke: "Slight haze possible" },
                { cond: "Full power (turbo, clean)", lambda: "1.2\u20131.5", afr: "17.5\u201322:1",    smoke: "Light haze on tip-in" },
                { cond: "Full power (NA)",         lambda: "1.2\u20131.4",   afr: "17.5\u201320:1",    smoke: "Slight haze" },
                { cond: "Smoke threshold",         lambda: "1.1\u20131.2",   afr: "16\u201317.5:1",    smoke: "Continuous visible smoke" },
                { cond: "Max power (with smoke)",  lambda: "1.0\u20131.1",   afr: "14.5\u201316:1",    smoke: "Heavy black smoke (race only)" },
                { cond: "Over-fueled / danger",    lambda: "<1.0",      afr: "<14.5:1",       smoke: "Extreme \u2014 engine damage risk" },
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-medium text-xs">{row.cond}</td>
                  <td className="text-right py-2 font-bold text-xs">{row.lambda}</td>
                  <td className="text-right py-2 text-xs">{row.afr}</td>
                  <td className="text-left py-2 pl-4 text-muted-foreground text-xs">{row.smoke}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Diesel vs Gas Comparison */}
      <Section title="Diesel Lambda vs. Gasoline Lambda" open={comparisonOpen} toggle={() => setComparisonOpen(!comparisonOpen)}>
        <p className="text-sm text-muted-foreground mb-4">The same lambda number means completely different things on diesel vs. gasoline engines.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Condition</th>
                <th className="text-right py-2">Gas Engine Lambda</th>
                <th className="text-right py-2">Diesel Engine Lambda</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_TABLE.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-medium">{row.condition}</td>
                  <td className="text-right py-2">{row.gasLambda}</td>
                  <td className="text-right py-2 font-bold">{row.dieselLambda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-3">
          A gas engine at lambda 0.85 is making peak power. A diesel engine at lambda 0.85 is destroying itself.
        </p>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* EDUCATIONAL SECTION                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="Understanding Diesel Lambda, Smoke, and Boost-to-Fuel Balance" open={educationOpen} toggle={() => setEducationOpen(!educationOpen)}>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Diesel is NOT Gasoline &mdash; Lambda Means Something Different</h3>
          <p>
            On a gasoline engine, you tune to lambda 0.85&ndash;0.90 for peak power and lambda 1.0 for fuel economy. On a diesel, you NEVER want lambda below 1.0. Diesel engines always run lean &mdash; with excess air. The question isn&rsquo;t &ldquo;rich or lean?&rdquo; &mdash; it&rsquo;s &ldquo;how lean?&rdquo; Lambda 1.3 is a good diesel power target. Lambda 0.85, which is a gasoline engine&rsquo;s sweet spot, would be catastrophic on a diesel &mdash; it means 15% more fuel than the engine has air to burn. The unburned fuel turns to soot (black smoke), drives exhaust gas temperatures toward 1,400&deg;F+, and produces zero additional power because there is no oxygen left to combust it.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Where Black Smoke Comes From</h3>
          <p>
            Diesel combustion is heterogeneous &mdash; the fuel and air are not premixed like gasoline. Fuel sprays into compressed air at extremely high pressure (5,000&ndash;30,000 PSI in common rail systems) and burns from the outside of each droplet inward. If there is not enough air around each droplet, the hydrocarbon molecules crack into elemental carbon (soot particles) instead of burning completely to CO&#x2082; and water. This soot is black smoke. More air (bigger turbo, more boost) reduces smoke by ensuring each fuel droplet has enough oxygen to burn completely. Better fuel atomization (higher injection pressure, smaller nozzle holes) also helps because smaller droplets burn more completely.
          </p>

          <h3 className="text-sm font-semibold text-foreground">The &ldquo;Rolling Coal&rdquo; Reality</h3>
          <p>
            Some diesel owners intentionally over-fuel for thick black smoke. From an engineering perspective, this is wasting fuel (unburned diesel going out the exhaust), dramatically increasing EGTs (which destroys turbo seals, cracks pistons, and warps heads), accelerating turbo and engine wear, and producing zero additional power over a properly tuned setup. The power peak on a diesel occurs around lambda 1.1&ndash;1.2. Anything richer than that just makes smoke, not power &mdash; there is literally not enough oxygen in the cylinder to release the energy from the additional fuel. Every pound of diesel going out the exhaust as black soot is a pound of diesel that did not make horsepower.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Why Diesel Tuning Uses Boost-to-Fuel Tables</h3>
          <p>
            In diesel ECU calibration, the &ldquo;smoke limiter&rdquo; or &ldquo;torque limiter&rdquo; maps restrict fuel delivery based on available airflow, measured by MAP and MAF sensors. This is a 3D map: RPM &times; boost pressure &rarr; maximum injection quantity (mm&sup3;/stroke). The smoke limit exists because diesel engines can physically inject far more fuel than they have air to burn &mdash; unlike gasoline engines, which are always air-metered. When tuners &ldquo;raise the smoke limit,&rdquo; they allow more fuel at each boost level. This makes more power but also more smoke and higher EGTs. The physical smoke limit is around lambda 1.1&ndash;1.2 &mdash; below this, combustion efficiency drops rapidly as soot formation overwhelms the oxidation process.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Wideband O&#x2082; on Diesel &mdash; Practical Tips</h3>
          <p>
            Standard wideband O&#x2082; sensors (Bosch LSU 4.9) work on diesel but read very lean at idle and cruise. Most wideband controllers display &ldquo;Lean&rdquo; or &ldquo;---&rdquo; when lambda exceeds 2.0&ndash;3.0, which is normal for a diesel at idle (lambda 3.0&ndash;6.0+). Some controllers (Innovate MTX-L, AEM X-Series) have diesel-specific firmware that extends the lean reading range. The useful wideband data on a diesel is under load: lambda 1.1&ndash;1.8. If your wideband reads rich (lambda &lt;1.0) on a diesel, something is very wrong &mdash; check for a failed injector dumping raw fuel into the cylinder. EGT (pyrometer) is often a better real-time safety indicator than lambda on diesel because the question isn&rsquo;t &ldquo;is it lean or rich?&rdquo; &mdash; it&rsquo;s &ldquo;is it lean enough to keep EGTs safe?&rdquo;
          </p>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <strong>Sources:</strong> HP Academy Practical Diesel Tuning course, Schiller Tuning published diesel AFR guide, Bosch Automotive Handbook (diesel combustion chapter), Innovate Motorsports LC-2 diesel application notes, AEM X-Series diesel configuration guide.
        </div>
      </Section>

      {/* Cross-links */}
      <div className="mt-8 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <strong>Related calculators:</strong>{" "}
        <a href="/calculators/afr-lambda" className="text-primary underline hover:text-[#E85D04]">AFR / Lambda Converter (gasoline)</a>
        {" \u00B7 "}
        <a href="/calculators/diesel-egt-drive-pressure" className="text-primary underline hover:text-[#E85D04]">Diesel EGT & Drive Pressure</a>
        {" \u00B7 "}
        <a href="/calculators/diesel-compound-turbo" className="text-primary underline hover:text-[#E85D04]">Diesel Compound Turbo Sizing</a>
        {" \u00B7 "}
        <a href="/calculators/diesel-injector-nozzle-pop-pressure" className="text-primary underline hover:text-[#E85D04]">Diesel Nozzle & Pop Pressure</a>
      </div>

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
              <h4 className="font-semibold text-foreground mb-1">Diesel vs Gas Lambda</h4>
              <p>Diesel ALWAYS runs lean (excess air). Lambda 1.3 = good power. Lambda 0.85 (gas sweet spot) would destroy a diesel engine.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Smoke Threshold</h4>
              <p>Visible smoke starts around lambda 1.2-1.3. Below 1.2 = heavy black smoke with no additional power. Below 1.0 = catastrophic over-fueling.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Wideband on Diesel</h4>
              <p>Normal idle: lambda 3.0-6.0+. Useful data is under load: lambda 1.1-1.8. Most widebands read "Lean" or "---" at diesel idle.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Diesel Lambda Zones</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>{">"} 2.0:</span><span>Cruise / light load</span></li>
                <li className="flex justify-between"><span>1.5 - 2.0:</span><span>Moderate load</span></li>
                <li className="flex justify-between"><span>1.3 - 1.5:</span><span>Full power, clean</span></li>
                <li className="flex justify-between"><span>1.1 - 1.3:</span><span>Max power, light haze</span></li>
                <li className="flex justify-between"><span>{"<"} 1.1:</span><span>Over-fueled, smoke</span></li>
              </ul>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Diesel AFR Equivalents</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>Lambda 1.3:</span><span className="font-mono">AFR 18.9:1</span></li>
                <li className="flex justify-between"><span>Lambda 1.5:</span><span className="font-mono">AFR 21.8:1</span></li>
                <li className="flex justify-between"><span>Lambda 2.0:</span><span className="font-mono">AFR 29.0:1</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Diesel Smoke, Lambda, and Air-Fuel Balance</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Diesel engines always run lean — they rely on excess air to prevent soot formation and control combustion temperatures. Unlike gasoline engines that target Lambda 1.0 (stoichiometric) at idle and cruise, a diesel at idle runs at Lambda 3.0-6.0 or higher, with useful tuning data only available under load where Lambda drops to the 1.1-1.8 range. A Lambda of 1.3 under full load represents clean, efficient combustion with maximum power and minimal smoke. Below Lambda 1.2, visible black smoke appears as the fuel overwhelms the available air supply.
          </p>
          <p>
            Wideband oxygen sensors work the same on diesel as on gasoline — they measure exhaust oxygen and calculate Lambda. However, most wideband controllers display the reading on a gasoline AFR scale (Lambda x 14.7), which can be confusing. A wideband reading of "18.9:1" on a diesel does not mean the same thing as 18.9:1 on a gas engine. It means Lambda 1.3, which is optimal full-load diesel territory. The actual diesel AFR at Lambda 1.3 is approximately 18.9:1 using diesel's stoichiometric ratio of 14.5:1 — coincidentally close to the gas-scale number in this case.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Smoke Is Wasted Power</h3>
          <p>
            Black smoke is unburned fuel — every particle of soot leaving the tailpipe is energy that was not converted to work. Below Lambda 1.1, adding more fuel produces only smoke, heat, and higher EGTs with zero additional power. The path to more diesel power is always more air first (bigger turbo, compounds, or better intercooling), then more fuel to match. Fuel without air is smoke. Air without fuel is a missed opportunity. The balance point — Lambda 1.2-1.3 under full load — is where diesel engines make clean, reliable, repeatable power.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function Section({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
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
