import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────

type FuelId =
  | "gas-pure" | "gas-e10" | "gas-e15"
  | "e85" | "e98" | "e100"
  | "methanol" | "nitromethane"
  | "diesel" | "propane" | "cng" | "custom";

type InputMode = "lambda" | "afr" | "gasscale";

// ── Fuel data ───────────────────────────────────────────────────────────────────

interface FuelDef { label: string; short: string; stoich: number }

const FUELS: Record<Exclude<FuelId, "e85" | "custom">, FuelDef> = {
  "gas-pure":     { label: "Gasoline (pure E0 / race fuel)", short: "Gas (E0)",  stoich: 14.70 },
  "gas-e10":      { label: "Gasoline (E10 pump gas)",        short: "Gas (E10)", stoich: 14.08 },
  "gas-e15":      { label: "Gasoline (E15 pump gas)",        short: "Gas (E15)", stoich: 13.79 },
  "e98":          { label: "E98 race fuel",                  short: "E98",       stoich: 9.08  },
  "e100":         { label: "E100 pure ethanol",              short: "E100",      stoich: 9.008 },
  "methanol":     { label: "Methanol (M100)",                short: "Methanol",  stoich: 6.47  },
  "nitromethane": { label: "Nitromethane",                   short: "Nitro",     stoich: 1.70  },
  "diesel":       { label: "Diesel",                         short: "Diesel",    stoich: 14.50 },
  "propane":      { label: "Propane (LPG)",                  short: "Propane",   stoich: 15.67 },
  "cng":          { label: "Natural Gas (CNG)",              short: "CNG",       stoich: 17.20 },
};

const PRIMARY: FuelId[] = ["gas-e10", "e85", "methanol", "diesel"];
const OTHER: FuelId[] = ["gas-pure", "gas-e15", "e98", "e100", "nitromethane", "propane", "cng", "custom"];

// ── Helpers ─────────────────────────────────────────────────────────────────────

// Fixes IEEE 754 display rounding (e.g., 0.85*14.7 → "12.50" not "12.49")
function fmt(val: number, d: number): string {
  const f = 10 ** d;
  return (Math.round(val * f + 1e-9) / f).toFixed(d);
}

// Linear blend by volume fraction — matches COBB Tuning, ECMTuning, HP Tuners.
function getStoich(id: FuelId, ethPct: number, gasBase: number, customVal: number): number {
  if (id === "gas-pure") return gasBase;
  if (id === "e85") return gasBase * (1 - ethPct / 100) + 9.008 * (ethPct / 100);
  if (id === "custom") return customVal > 0.5 && customVal <= 30 ? customVal : 14.7;
  return FUELS[id].stoich;
}

function getFuelLabel(id: FuelId, ethPct: number): string {
  if (id === "e85") return `E85 (${ethPct}% ethanol)`;
  if (id === "custom") return "Custom fuel";
  return FUELS[id].label;
}

function getFuelShort(id: FuelId): string {
  if (id === "e85") return "E85";
  if (id === "custom") return "Custom";
  return FUELS[id].short;
}

// ── Lambda condition zones ──────────────────────────────────────────────────────

function getLambdaZone(l: number): { label: string; sub: string; color: string; bg: string } {
  if (l > 1.10) return { label: "LEAN \u2014 Detonation or burn-through risk", sub: "", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  if (l >= 1.00) return { label: "Lean cruise", sub: "OK for part-throttle cruise", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (l >= 0.95) return { label: "Stoichiometric", sub: "Closed-loop / emissions", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (l >= 0.85) return { label: "Power target (NA)", sub: "Typical NA WOT target", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (l >= 0.75) return { label: "Power (boost/nitrous)", sub: "Typical power-adder WOT target", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "RICH \u2014 Check for over-fueling", sub: "", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

// ── Reference & sweep data ──────────────────────────────────────────────────────

const REF_ROWS = [
  { cond: "Stoich (closed loop, cruise)", lambda: "1.00",      gs: "14.7",      notes: "EFI closed-loop range" },
  { cond: "Idle (NA)",                    lambda: "0.95\u20131.00", gs: "14.0\u201314.7",  notes: "" },
  { cond: "Cruise, light load",           lambda: "0.95\u20131.05", gs: "14.0\u201315.4",  notes: "Lean for mpg" },
  { cond: "WOT NA, 91 octane",            lambda: "0.85\u20130.88", gs: "12.5\u201313.0",  notes: "" },
  { cond: "WOT NA, race gas",             lambda: "0.82\u20130.85", gs: "12.0\u201312.5",  notes: "Cooler, safer" },
  { cond: "WOT boost, pump gas",          lambda: "0.75\u20130.80", gs: "11.0\u201311.8",  notes: "Critical" },
  { cond: "WOT boost, E85",               lambda: "0.75\u20130.80", gs: "11.0\u201311.8",  notes: "Same \u03bb, half the AFR" },
  { cond: "WOT methanol",                 lambda: "0.85\u20130.90", gs: "12.5\u201313.2",  notes: "Tolerates leaner \u03bb" },
];

const SWEEP = [
  { l: 0.95, label: "Lean cruise" },
  { l: 0.90, label: "NA cruise/power" },
  { l: 0.85, label: "NA WOT" },
  { l: 0.80, label: "Boost target" },
  { l: 0.75, label: "Aggressive boost" },
];

// ── Input modes ─────────────────────────────────────────────────────────────────

const MODES: { id: InputMode; short: string }[] = [
  { id: "lambda",   short: "Lambda (\u03bb)" },
  { id: "afr",      short: "Actual AFR" },
  { id: "gasscale", short: "Gas-scale AFR" },
];

// ── localStorage ────────────────────────────────────────────────────────────────

const LS_KEY = "engine-build-afr-input-mode";

function loadMode(): InputMode {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s === "lambda" || s === "afr" || s === "gasscale") return s;
  } catch { /* SSR / blocked storage */ }
  return "lambda";
}

// ── Initialization ──────────────────────────────────────────────────────────────

const INIT_LAMBDA = 0.85;
const INIT_STOICH = 14.08; // E10 default
const INIT_MODE = loadMode();

function initInputValue(): string {
  if (INIT_MODE === "afr") return fmt(INIT_LAMBDA * INIT_STOICH, 2);
  if (INIT_MODE === "gasscale") return fmt(INIT_LAMBDA * 14.7, 2);
  return INIT_LAMBDA.toFixed(3);
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function AfrLambdaCalculator() {
  // Core state
  const [fuelId, setFuelId] = useState<FuelId>("gas-e10");
  const [ethPct, setEthPct] = useState(70);
  const [customStoich, setCustomStoich] = useState("14.70");
  const [gasBase, setGasBase] = useState(14.7);
  const [inputMode, setInputMode] = useState<InputMode>(INIT_MODE);
  const [lambda, setLambda] = useState(INIT_LAMBDA);
  const [inputValue, setInputValue] = useState(initInputValue);

  // UI toggles
  const [showOther, setShowOther] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);

  // Compare-two-fuels state
  const [cmpFuelB, setCmpFuelB] = useState<FuelId>("e85");
  const [cmpEthB, setCmpEthB] = useState(85);
  const [cmpCustomB, setCmpCustomB] = useState("14.70");

  // Ethanol estimation state
  const [estGs, setEstGs] = useState("12.50");
  const [estEth, setEstEth] = useState(70);

  // Debounced lambda for badge color (Upgrade J)
  const [dbLambda, setDbLambda] = useState(INIT_LAMBDA);

  // ── Derived values ──
  const csNum = parseFloat(customStoich) || 14.7;
  const stoich = getStoich(fuelId, ethPct, gasBase, csNum);
  const actualAfr = lambda * stoich;
  const gasScaleAfr = lambda * 14.7;
  const zone = getLambdaZone(dbLambda);
  const volPct = (14.7 / stoich - 1) * 100;
  const label = getFuelLabel(fuelId, ethPct);
  const isOtherFuel = OTHER.includes(fuelId);

  // Compare derived
  const csBNum = parseFloat(cmpCustomB) || 14.7;
  const stoichB = getStoich(cmpFuelB, cmpEthB, gasBase, csBNum);
  const labelB = getFuelLabel(cmpFuelB, cmpEthB);
  const volPctB = (14.7 / stoichB - 1) * 100;

  // Ethanol estimation derived
  const estLambdaVal = (parseFloat(estGs) || 0) / 14.7;
  const estStoichVal = gasBase * (1 - estEth / 100) + 9.008 * (estEth / 100);
  const estAfrVal = estLambdaVal * estStoichVal;

  // WOT warnings
  const alcoholFuels: FuelId[] = ["e85", "e98", "e100", "methanol"];
  const isHighLambdaAlcohol = lambda > 0.95 && alcoholFuels.includes(fuelId);

  // ── Effects ──

  // Persist input mode to localStorage
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, inputMode); } catch { /* noop */ }
  }, [inputMode]);

  // Debounce badge color
  useEffect(() => {
    const t = setTimeout(() => setDbLambda(lambda), 200);
    return () => clearTimeout(t);
  }, [lambda]);

  // ── Handlers ──

  // Sync inputValue when fuel config changes (preserves lambda — Upgrade B)
  function syncInputForStoich(newStoich: number) {
    if (inputMode === "afr") {
      setInputValue(fmt(lambda * newStoich, 2));
    }
  }

  function selectFuel(id: FuelId) {
    setFuelId(id);
    if (PRIMARY.includes(id)) setShowOther(false);
    const newStoich = getStoich(id, ethPct, gasBase, csNum);
    if (inputMode === "afr") setInputValue(fmt(lambda * newStoich, 2));
  }

  function handleEthPct(pct: number) {
    setEthPct(pct);
    if (inputMode === "afr" && fuelId === "e85") {
      const s = gasBase * (1 - pct / 100) + 9.008 * (pct / 100);
      setInputValue(fmt(lambda * s, 2));
    }
  }

  function handleGasBase(base: number) {
    setGasBase(base);
    if (inputMode === "afr") {
      const s = getStoich(fuelId, ethPct, base, csNum);
      setInputValue(fmt(lambda * s, 2));
    }
  }

  function handleCustomStoich(val: string) {
    setCustomStoich(val);
    if (inputMode === "afr" && fuelId === "custom") {
      const cs = parseFloat(val) || 14.7;
      const s = cs > 0.5 && cs <= 30 ? cs : 14.7;
      setInputValue(fmt(lambda * s, 2));
    }
  }

  function handleInput(val: string) {
    setInputValue(val);
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    let l: number;
    if (inputMode === "lambda") l = num;
    else if (inputMode === "afr") l = stoich > 0 ? num / stoich : 0;
    else l = num / 14.7;
    setLambda(Math.max(0.5, Math.min(1.5, l)));
  }

  function handleMode(m: InputMode) {
    setInputMode(m);
    if (m === "lambda") setInputValue(lambda.toFixed(3));
    else if (m === "afr") setInputValue(fmt(lambda * stoich, 2));
    else setInputValue(fmt(lambda * 14.7, 2));
  }

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="AFR Lambda Multi-Fuel Converter"
        description="Convert between Lambda, actual AFR, and gas-scale wideband AFR for any fuel — gasoline, E85, methanol, nitromethane, CNG, and custom blends. Free real-time calculator for engine tuners."
        canonical="/calculators/afr-lambda"
        keywords="AFR calculator, lambda calculator, wideband AFR converter, E85 AFR, methanol AFR, gas scale AFR, stoichiometric AFR, air fuel ratio calculator, lambda to AFR"
      />
      <h1 className="text-3xl font-bold mb-2">AFR / Lambda Multi-Fuel Converter</h1>
      <p className="text-muted-foreground mb-8">Convert between Lambda, actual AFR, and gas-scale wideband AFR for any fuel.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ──────────── LEFT COLUMN: INPUTS ──────────── */}
        <div className="space-y-4">

          {/* Fuel Selection */}
          <Card>
            <CardHeader><CardTitle>Fuel Selection</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Quick-select buttons (Upgrade D) */}
              <div className="flex flex-wrap gap-2">
                {PRIMARY.map((id) => (
                  <button
                    key={id}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      fuelId === id
                        ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                        : "bg-white text-muted-foreground border-gray-200 hover:border-[#E85D04]"
                    }`}
                    onClick={() => selectFuel(id)}
                  >
                    {getFuelShort(id)}
                  </button>
                ))}
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    isOtherFuel
                      ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                      : "bg-white text-muted-foreground border-gray-200 hover:border-[#E85D04]"
                  }`}
                  onClick={() => setShowOther(!showOther)}
                >
                  {isOtherFuel ? getFuelShort(fuelId) : "Other\u2026"}
                </button>
              </div>

              {/* Other fuels dropdown */}
              {(showOther || isOtherFuel) && (
                <Select value={isOtherFuel ? fuelId : undefined} onValueChange={(v) => selectFuel(v as FuelId)}>
                  <SelectTrigger><SelectValue placeholder="Select fuel\u2026" /></SelectTrigger>
                  <SelectContent>
                    {OTHER.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id === "custom" ? "Custom (enter stoich)" : FUELS[id as Exclude<FuelId, "e85" | "custom">].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* E85 ethanol slider */}
              {fuelId === "e85" && (
                <div className="space-y-2">
                  <Label>Actual ethanol content: {ethPct}%</Label>
                  <input
                    type="range" min={51} max={85} value={ethPct}
                    onChange={(e) => handleEthPct(parseInt(e.target.value))}
                    className="w-full accent-[#E85D04]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>51% (winter)</span>
                    <span>85% (summer)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At {ethPct}% actual ethanol, this E85 has a stoich AFR of {stoich.toFixed(2)}:1
                  </p>
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                    Pump E85 varies seasonally. Winter blends can contain as little as 51% ethanol in northern states; summer blends run up to 85%. Use a flex-fuel sensor for real-time ethanol content. Don't trust the pump label.
                  </div>
                </div>
              )}

              {/* Custom stoich input */}
              {fuelId === "custom" && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Stoichiometric AFR (0.5\u201330)</Label>
                  <Input type="number" step="0.01" min="0.5" max="30" value={customStoich} onChange={(e) => handleCustomStoich(e.target.value)} />
                </div>
              )}

              {/* Stoich display for fixed fuels */}
              {fuelId !== "e85" && fuelId !== "custom" && (
                <p className="text-xs text-muted-foreground">Stoich AFR: {stoich.toFixed(2)}:1</p>
              )}

              {/* Gas baseline toggle (Upgrade A) */}
              <div className="pt-3 border-t">
                <Label className="text-xs text-muted-foreground">E0 gasoline reference</Label>
                <div className="flex rounded-md border overflow-hidden mt-1">
                  {[{ val: 14.7, label: "14.7 (COBB / HP Tuners)" }, { val: 14.64, label: "14.64 (ECMTuning)" }].map((opt) => (
                    <button
                      key={opt.val}
                      className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
                        gasBase === opt.val
                          ? "bg-[#1a1a1a] text-white"
                          : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => handleGasBase(opt.val)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Affects pure gasoline and E85 blend stoich. Gas-scale AFR always uses 14.7.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* WOT Safety Warning (Upgrade I) */}
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
            <strong>WOT warning:</strong> Lambda 1.00 (stoichiometric) is for closed-loop cruise only. At WOT or under boost, target Lambda 0.80\u20130.88 for safety. Stoich at high load can melt pistons.
          </div>

          {/* Input Mode */}
          <Card>
            <CardHeader><CardTitle>Input Mode</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Segmented control */}
              <div className="flex rounded-lg border overflow-hidden" role="radiogroup" aria-label="Input mode">
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    role="radio"
                    aria-checked={inputMode === mode.id}
                    tabIndex={inputMode === mode.id ? 0 : -1}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${
                      inputMode === mode.id
                        ? "bg-[#1a1a1a] text-white"
                        : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => handleMode(mode.id)}
                    onKeyDown={(e) => {
                      const idx = MODES.findIndex((m) => m.id === mode.id);
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        handleMode(MODES[(idx + 1) % MODES.length].id);
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        handleMode(MODES[(idx - 1 + MODES.length) % MODES.length].id);
                      }
                    }}
                  >
                    {mode.short}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <Label>
                  {inputMode === "lambda" && "Lambda (\u03bb)"}
                  {inputMode === "afr" && `Actual AFR (${label})`}
                  {inputMode === "gasscale" && "Gas-scale AFR (wideband reading)"}
                </Label>
                <Input
                  type="number"
                  step={inputMode === "lambda" ? "0.001" : "0.01"}
                  value={inputValue}
                  onChange={(e) => handleInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {inputMode === "lambda" && "Universal ratio \u2014 1.000 = stoichiometric on any fuel"}
                  {inputMode === "afr" && "True air-to-fuel mass ratio for the selected fuel"}
                  {inputMode === "gasscale" && "What your wideband O\u2082 sensor displays (always based on gasoline stoich 14.7)"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ──────────── RIGHT COLUMN: RESULTS ──────────── */}
        <div className="space-y-4">

          {/* Main results */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${inputMode === "lambda" ? "bg-white/10 ring-1 ring-primary" : ""}`}>
                  <p className="text-gray-400 text-sm">Lambda (\u03bb)</p>
                  <p className="text-4xl font-bold text-primary">{lambda.toFixed(3)}</p>
                </div>
                <div className={`p-4 rounded-lg ${inputMode === "afr" ? "bg-white/10 ring-1 ring-primary" : ""}`}>
                  <p className="text-gray-400 text-sm">Actual AFR</p>
                  <p className="text-4xl font-bold">{fmt(actualAfr, 2)}:1</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
                <div className={`p-4 rounded-lg ${inputMode === "gasscale" ? "bg-white/10 ring-1 ring-primary" : ""}`}>
                  <p className="text-gray-400 text-sm">Gas-scale AFR</p>
                  <p className="text-4xl font-bold">{fmt(gasScaleAfr, 2)}:1</p>
                  <p className="text-xs text-gray-500 mt-1">Wideband display</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Condition badge */}
          <div className={`p-4 rounded-lg border ${zone.bg}`}>
            <p className={`font-bold ${zone.color}`}>{zone.label}</p>
            {zone.sub && <p className="text-sm mt-1 text-muted-foreground">{zone.sub}</p>}
          </div>

          {/* Dynamic alcohol warning (Upgrade I) */}
          {isHighLambdaAlcohol && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
              <strong>Warning:</strong> On {label}, target Lambda 0.78\u20130.85 at high load. Higher Lambda is dangerous despite the cooler combustion characteristics.
            </div>
          )}

          {/* Volume comparison (Upgrade F) */}
          <Card>
            <CardHeader><CardTitle>Fuel Volume vs. Gasoline</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                At the same air mass and same Lambda, this fuel requires:
              </p>
              <p className="text-3xl font-bold">
                {volPct >= 0 ? "+" : ""}{volPct.toFixed(1)}%
                <span className="text-base font-normal text-muted-foreground ml-2">volume flow vs. gasoline</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This is how much more fuel volume the system must flow per unit of air mass. Use this to size injectors, pumps, and rails when switching fuels.
              </p>
            </CardContent>
          </Card>

          {/* How to Read This */}
          <Card>
            <CardHeader><CardTitle>How to Read This</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Your wideband always shows gas-scale AFR</strong> \u2014 it multiplies Lambda by 14.7 regardless of fuel. A reading of {fmt(gasScaleAfr, 1)} on your gauge means Lambda {lambda.toFixed(3)}, which on {label} is an actual AFR of {fmt(actualAfr, 2)}:1.
              </p>
              <p>
                When switching fuels, target the <strong>same Lambda</strong>, not the same AFR number. The actual AFR will change dramatically but engine conditions will not.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ──────────── COLLAPSIBLE SECTIONS ──────────── */}

      {/* Compare Two Fuels (Upgrade G) */}
      <Section title="Compare Two Fuels at the Same Lambda" open={compareOpen} toggle={() => setCompareOpen(!compareOpen)}>
        <p className="text-sm text-muted-foreground mb-4">Both fuels at Lambda {lambda.toFixed(3)} \u2014 gas-scale AFR is identical, actual combustion is very different.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fuel A: current fuel (read-only) */}
          <div className="p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold mb-3">{label}</p>
            <ResultRow label="Actual AFR" value={`${fmt(lambda * stoich, 2)}:1`} />
            <ResultRow label="Gas-scale AFR" value={`${fmt(lambda * 14.7, 2)}:1`} accent />
            <ResultRow label="Volume vs. gas" value={`${volPct >= 0 ? "+" : ""}${volPct.toFixed(1)}%`} />
          </div>
          {/* Fuel B: user-selectable */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="mb-3">
              <Select value={cmpFuelB} onValueChange={(v) => setCmpFuelB(v as FuelId)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...PRIMARY, ...OTHER].map((id) => (
                    <SelectItem key={id} value={id}>
                      {id === "e85" ? "E85 \u2014 variable ethanol" : id === "custom" ? "Custom" : FUELS[id as Exclude<FuelId, "e85" | "custom">].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cmpFuelB === "e85" && (
              <div className="mb-3 space-y-1">
                <Label className="text-xs text-muted-foreground">Ethanol: {cmpEthB}%</Label>
                <input type="range" min={51} max={85} value={cmpEthB} onChange={(e) => setCmpEthB(parseInt(e.target.value))} className="w-full accent-[#E85D04]" />
              </div>
            )}
            {cmpFuelB === "custom" && (
              <div className="mb-3 space-y-1">
                <Label className="text-xs text-muted-foreground">Stoich AFR</Label>
                <Input type="number" step="0.01" value={cmpCustomB} onChange={(e) => setCmpCustomB(e.target.value)} className="h-8 text-sm" />
              </div>
            )}
            <ResultRow label="Actual AFR" value={`${fmt(lambda * stoichB, 2)}:1`} />
            <ResultRow label="Gas-scale AFR" value={`${fmt(lambda * 14.7, 2)}:1`} accent />
            <ResultRow label="Volume vs. gas" value={`${volPctB >= 0 ? "+" : ""}${volPctB.toFixed(1)}%`} />
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-3">
          Both fuels read <strong>{fmt(lambda * 14.7, 2)}</strong> on a wideband. The actual combustion is very different.
        </p>
      </Section>

      {/* Lambda Sweep Table (Upgrade H) */}
      <Section title="Lambda Range Table" open={sweepOpen} toggle={() => setSweepOpen(!sweepOpen)}>
        <p className="text-sm text-muted-foreground mb-3">Five common Lambda targets for {label} (stoich {stoich.toFixed(2)}:1):</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Lambda</th>
                <th className="text-left py-2">Condition</th>
                <th className="text-right py-2">Actual AFR</th>
                <th className="text-right py-2">Gas-scale</th>
                <th className="text-right py-2">Vol vs. gas</th>
              </tr>
            </thead>
            <tbody>
              {SWEEP.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-bold">{row.l.toFixed(2)}</td>
                  <td className="py-2">{row.label}</td>
                  <td className="text-right py-2 font-medium">{fmt(row.l * stoich, 2)}:1</td>
                  <td className="text-right py-2">{fmt(row.l * 14.7, 2)}:1</td>
                  <td className="text-right py-2">+{volPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Reference Table */}
      <Section title="Target AFR / Lambda by Operating Condition" open={refOpen} toggle={() => setRefOpen(!refOpen)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Condition</th>
                <th className="text-right py-2">Lambda target</th>
                <th className="text-right py-2">Gas-scale AFR</th>
                <th className="text-left py-2 pl-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {REF_ROWS.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-medium">{row.cond}</td>
                  <td className="text-right py-2">{row.lambda}</td>
                  <td className="text-right py-2">{row.gs}</td>
                  <td className="text-left py-2 pl-4 text-muted-foreground">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Estimate Ethanol Content (Upgrade L) */}
      <Section title="Estimate Actual Ethanol Content" open={estOpen} toggle={() => setEstOpen(!estOpen)}>
        <p className="text-sm text-muted-foreground mb-4">
          For tuners without a flex-fuel sensor. Enter your wideband reading, then adjust the ethanol slider to see what your actual AFR would be at different blend levels.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Wideband reading (gas-scale AFR)</Label>
              <Input type="number" step="0.01" value={estGs} onChange={(e) => setEstGs(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estimated ethanol content: {estEth}%</Label>
              <input type="range" min={0} max={100} value={estEth} onChange={(e) => setEstEth(parseInt(e.target.value))} className="w-full accent-[#E85D04]" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% (pure gas)</span>
                <span>100% (pure ethanol)</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inferred Lambda</span>
                <span className="font-bold">{estLambdaVal > 0 ? estLambdaVal.toFixed(3) : "\u2014"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Blend stoich AFR</span>
                <span className="font-bold">{estStoichVal.toFixed(2)}:1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Actual AFR at {estEth}% ethanol</span>
                <span className="font-bold">{estLambdaVal > 0 ? fmt(estAfrVal, 2) : "\u2014"}:1</span>
              </div>
            </div>
            {estLambdaVal > 1.10 && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                Lambda {estLambdaVal.toFixed(3)} is dangerously lean at any load.
              </div>
            )}
            {estLambdaVal > 0 && estLambdaVal <= 1.10 && (
              <p className="text-xs text-muted-foreground">
                If your fuel is {estEth}% ethanol, a gas-scale reading of {estGs} means your engine is running at {fmt(estAfrVal, 2)}:1 actual AFR.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ──────────── EDUCATIONAL ──────────── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Lambda, AFR, and Wideband Readings</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            A wideband O&#x2082; sensor measures the percentage of oxygen remaining in the exhaust stream and converts that into a Lambda value &mdash; the ratio of actual air-fuel mixture to the stoichiometric (chemically perfect) ratio for a given fuel. The controller then multiplies Lambda by 14.7 (gasoline&rsquo;s stoich) to display &ldquo;AFR&rdquo; on your gauge. This gas-scale reading is hardwired regardless of what fuel you are actually burning. That is why a guy running E85 sees 12.5 on his wideband at WOT instead of the 8&ndash;9:1 actual AFR he expects &mdash; the gauge is not wrong, it is simply speaking in gasoline units.
          </p>
          <p>
            Lambda is the universal, fuel-agnostic way to express mixture richness. Lambda 1.000 means stoichiometric on any fuel &mdash; gasoline, E85, methanol, propane, anything. Lambda 0.85 means the mixture is 15% richer than stoich, again on any fuel. This is why professional tuners and OEM calibrators work in Lambda rather than AFR: it makes every target, every table, and every log directly comparable across fuels without conversion. A naturally aspirated engine making peak power at Lambda 0.85 does so whether it is burning gasoline (actual AFR 12.5:1) or methanol (actual AFR 5.5:1).
          </p>
          <p>
            The practical takeaway: when you switch fuels &mdash; gasoline to E85, E85 to methanol &mdash; do not target the same AFR number. Target the same Lambda. If your NA engine made peak power at Lambda 0.85 on gasoline (12.5:1 AFR), target Lambda 0.85 on E85 as well. Your wideband will still read 12.5 gas-scale, but the actual AFR will drop to roughly 8.9:1 because E85&rsquo;s stoich is so much lower. The engine does not care about the AFR number &mdash; it cares about the oxygen-to-fuel balance, which is exactly what Lambda describes.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Sources and Methodology</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            The stoichiometric AFR values in this calculator are derived from balanced combustion stoichiometry (Heywood, <em>Internal Combustion Engine Fundamentals</em>, Ch. 3) and cross-referenced against published calibration data from COBB Tuning (Subaru DIT WRX CAN Flex Fuel Tuning Guide), ECMTuning (DSM E85 wiki), and HP Tuners. Ethanol-blend stoich is computed using the industry-standard linear interpolation by volume fraction between the selected E0 baseline ({gasBase === 14.64 ? "14.64" : "14.7"}:1) and E100 (9.008:1) &mdash; the same method used by COBB, MoTeC, Haltech, Holley EFI, and MaxxECU flex-fuel calibrations.
          </p>
          <p>
            The linear volume-fraction blend introduces a ~0.5% systematic error versus a rigorous mass-fraction calculation (because ethanol at 0.789 g/mL is denser than gasoline at ~0.74 g/mL), but every major EFI manufacturer uses this same simplification because real-world pump-fuel ethanol content varies by &plusmn;10% seasonally (ASTM D5798 permits 51&ndash;83% ethanol in &ldquo;E85&rdquo;), which is 20&times; larger than the density-correction error. Lambda targets, condition zones, and the gas-scale AFR convention (&lambda; &times; 14.7) follow the definitions used by AEM, Innovate Motorsports, and HP Academy.
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

function ResultRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-bold text-sm ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
