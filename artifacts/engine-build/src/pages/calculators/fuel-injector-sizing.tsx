import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { Link } from "wouter";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import { HelpSidebar } from "@/components/calculators/HelpCard";
import fuelInjectorSizingContent from "@/data/calculatorContent/fuel-injector-sizing.mjs";

// ── Types ───────────────────────────────────────────────────────────────────────

type FuelType = "gas-e10" | "gas-e0" | "e85" | "methanol" | "diesel";
type Aspiration = "na" | "turbo" | "supercharged";

// ── Constants ───────────────────────────────────────────────────────────────────

// BSFC values (lb/hp-hr) — conservative end of range for safety margin.
// Sources: HP Academy, Injector Dynamics tech articles, EFI University.
const BSFC_MAP: Record<FuelType, Record<Aspiration, number>> = {
  "gas-e10":  { na: 0.50, turbo: 0.60, supercharged: 0.58 },
  "gas-e0":   { na: 0.48, turbo: 0.58, supercharged: 0.56 },
  "e85":      { na: 0.72, turbo: 0.88, supercharged: 0.82 },
  "methanol": { na: 1.60, turbo: 1.80, supercharged: 1.70 },
  "diesel":   { na: 0.40, turbo: 0.38, supercharged: 0.40 },
};

const FUEL_LABELS: Record<FuelType, string> = {
  "gas-e10":  "Pump Gasoline (E10)",
  "gas-e0":   "Pure Gasoline (E0 / Race Gas)",
  "e85":      "E85 (Flex Fuel)",
  "methanol": "Methanol (M100)",
  "diesel":   "Diesel",
};

const FUEL_STOICH: Record<FuelType, number> = {
  "gas-e10": 14.08,
  "gas-e0":  14.70,
  "e85":     9.76,
  "methanol": 6.47,
  "diesel":  14.60,
};

// Real injector sizes available from DeatschWerks, Injector Dynamics, Fuel Injector Clinic (lb/hr)
const AVAILABLE_SIZES = [19, 24, 28, 30, 33, 36, 39, 42, 47, 52, 60, 72, 80, 95, 105, 120, 160, 200, 225];

// 1 lb/hr = 10.5 cc/min (standard conversion for gasoline-density injectors)
const LB_TO_CC = 10.5;

// Fuel density for GPH calculation: gasoline ~6.073 lb/gal
const FUEL_DENSITY_LB_GAL: Record<FuelType, number> = {
  "gas-e10": 6.073,
  "gas-e0":  6.073,
  "e85":     6.59,
  "methanol": 6.63,
  "diesel":  7.05,
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(val: number, d: number): string {
  const f = 10 ** d;
  return (Math.round(val * f + 1e-9) / f).toFixed(d);
}

function findRecommendedSize(minSize: number): number {
  for (const size of AVAILABLE_SIZES) {
    if (size >= minSize) return size;
  }
  return AVAILABLE_SIZES[AVAILABLE_SIZES.length - 1];
}

function getDutyCycleColor(dc: number): string {
  if (dc < 75) return "text-green-600";
  if (dc < 80) return "text-yellow-600";
  if (dc < 85) return "text-orange-500";
  return "text-red-600";
}

function getDutyCycleBg(dc: number): string {
  if (dc < 75) return "bg-green-50 border-green-200";
  if (dc < 80) return "bg-yellow-50 border-yellow-200";
  if (dc < 85) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

function getFuelLineSize(hp: number): { size: string; an: string } {
  if (hp < 400) return { size: '5/16"', an: "AN-6" };
  if (hp < 600) return { size: '3/8"', an: "AN-8" };
  return { size: '1/2"', an: "AN-10" };
}

// ── Reference data ──────────────────────────────────────────────────────────────

const SWAP_TABLE = [
  { build: "Stock LS1 (350 HP)",         fuel: "Gas", injector: "24 lb/hr (stock)" },
  { build: "LS1 cam/heads (450 HP)",     fuel: "Gas", injector: "36 lb/hr" },
  { build: "Turbo LS (600 HP)",          fuel: "Gas", injector: "52–60 lb/hr" },
  { build: "Turbo LS (600 HP)",          fuel: "E85", injector: "80–95 lb/hr" },
  { build: "SBC TBI to EFI conversion",  fuel: "Gas", injector: "24–30 lb/hr" },
  { build: "2JZ turbo (500 HP)",         fuel: "Gas", injector: "52 lb/hr" },
  { build: "K-series turbo (400 HP)",    fuel: "Gas", injector: "42–47 lb/hr" },
  { build: "Turbo 4-cyl (300 HP)",       fuel: "E85", injector: "52–60 lb/hr" },
];

// ── Component ───────────────────────────────────────────────────────────────────

export default function FuelInjectorSizingCalculator() {
  // Build context integration
  const [ctxHp] = useBuildField("computed.estimatedHp", "");
  const [ctxCyl] = useBuildField("shortBlock.cylinders", "");
  const { activeBuild, setField } = useBuildContext();

  // Core inputs
  const [targetHp, setTargetHp] = useState(() => (ctxHp && parseFloat(ctxHp) > 0 ? ctxHp : "400"));
  const [cylinders, setCylinders] = useState(() => (ctxCyl && parseInt(ctxCyl) > 0 ? ctxCyl : "8"));
  const [fuelType, setFuelType] = useState<FuelType>("gas-e10");
  const [aspiration, setAspiration] = useState<Aspiration>("na");

  // Advanced inputs
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [maxDutyCycle, setMaxDutyCycle] = useState(80);
  const [baseFuelPressure, setBaseFuelPressure] = useState("43.5");
  const [bsfcOverride, setBsfcOverride] = useState("");
  const [useBsfcOverride, setUseBsfcOverride] = useState(false);

  // Collapsible sections
  const [educationOpen, setEducationOpen] = useState(false);
  const [swapTableOpen, setSwapTableOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);

  // Sync from build context when it changes
  useEffect(() => {
    if (ctxHp && parseFloat(ctxHp) > 0) setTargetHp(ctxHp);
  }, [ctxHp]);
  useEffect(() => {
    if (ctxCyl && parseInt(ctxCyl) > 0) setCylinders(ctxCyl);
  }, [ctxCyl]);

  // ── Calculations ──

  const hp = parseFloat(targetHp) || 0;
  const cyl = parseInt(cylinders) || 0;
  const numInjectors = cyl; // 1 injector per cylinder (port injection)
  const dutyCycleDec = maxDutyCycle / 100;
  const fuelPsi = parseFloat(baseFuelPressure) || 43.5;

  // BSFC selection
  const autoBsfc = BSFC_MAP[fuelType]?.[aspiration] ?? 0.50;
  const bsfc = useBsfcOverride && parseFloat(bsfcOverride) > 0 ? parseFloat(bsfcOverride) : autoBsfc;

  // Fuel pressure correction: injectors rated at 43.5 psi
  const pressureCorrection = Math.sqrt(fuelPsi / 43.5);

  // Primary formula: Injector Size (lb/hr) = (HP × BSFC) / (Num Injectors × Duty Cycle)
  // Then correct for actual fuel pressure
  const rawMinSize = hp > 0 && numInjectors > 0 && dutyCycleDec > 0
    ? (hp * bsfc) / (numInjectors * dutyCycleDec)
    : 0;
  const minSizeCorrected = pressureCorrection > 0 ? rawMinSize / pressureCorrection : rawMinSize;

  const recommendedSize = findRecommendedSize(minSizeCorrected);
  const minSizeCc = minSizeCorrected * LB_TO_CC;
  const recommendedSizeCc = recommendedSize * LB_TO_CC;

  // Duty cycle at recommended size
  const actualDutyCycle = recommendedSize > 0 && numInjectors > 0
    ? ((hp * bsfc) / (numInjectors * recommendedSize * pressureCorrection)) * 100
    : 0;

  // Total fuel flow
  const totalFuelFlow = hp * bsfc; // lb/hr total system
  const fuelFlowPerInjector = numInjectors > 0 ? totalFuelFlow / numInjectors : 0;
  const density = FUEL_DENSITY_LB_GAL[fuelType] ?? 6.073;
  const totalGph = density > 0 ? totalFuelFlow / density : 0;

  // Headroom: max HP at 80% duty with recommended injector
  const maxHpAt80 = numInjectors > 0 && bsfc > 0
    ? (numInjectors * recommendedSize * 0.80 * pressureCorrection) / bsfc
    : 0;
  const headroomHp = maxHpAt80 - hp;

  // Fuel pump sizing: total flow + 20% safety
  const pumpFlowLbHr = totalFuelFlow * 1.2;
  const pumpFlowLph = pumpFlowLbHr / density * 3.785;
  const pumpFlowGph = pumpFlowLbHr / density;

  // Fuel line
  const fuelLine = getFuelLineSize(hp);

  // Write computed results back to build context
  useEffect(() => {
    if (activeBuild && recommendedSize > 0) {
      setField("computed.injectorSize", recommendedSize.toString());
    }
  }, [recommendedSize, activeBuild?.id]);

  // ── Warnings ──

  const warnings: { type: "error" | "warning" | "info"; msg: string }[] = [];

  if (actualDutyCycle > 85) {
    warnings.push({ type: "error", msg: "Injectors above 85% duty cycle lose linearity and can overheat. Size up to the next available injector." });
  }
  if (fuelType === "e85") {
    warnings.push({ type: "info", msg: "E85 requires ~35% more fuel flow than gasoline for the same power. Make sure your fuel pump and lines can support the extra volume." });
  }
  if (fuelType === "methanol") {
    warnings.push({ type: "info", msg: "Methanol requires roughly 2.3× the fuel flow of gasoline. Fuel pump and line upgrades are almost always required." });
  }
  if (hp > 800 && cyl <= 4) {
    warnings.push({ type: "warning", msg: `This is ${Math.round(hp / cyl)}+ HP per cylinder. Verify your target HP is realistic for a ${cyl}-cylinder engine.` });
  }
  if (recommendedSize > 42 && cyl >= 8) {
    warnings.push({ type: "warning", msg: "At this injector size on 8+ cylinders, you'll likely need a fuel pump upgrade beyond the stock unit (e.g., DW300, Walbro 450+, or a return-style system)." });
  }
  if (fuelType === "diesel") {
    warnings.push({ type: "info", msg: "Diesel injector sizing uses different methodology (common rail pressure, nozzle flow number). These results are approximate — consult a diesel-specific tool." });
  }

  const isValid = hp > 0 && numInjectors > 0;

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Fuel Injector Sizing Calculator"
        description="Calculate what size fuel injectors you need for your engine build. Supports gasoline, E85, and methanol with duty cycle analysis and fuel system recommendations."
        canonical="/calculators/fuel-injector-sizing"
        keywords="fuel injector sizing calculator, what size injectors do I need, injector cc to lb/hr, E85 injector size, LS injector upgrade calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Fuel Injector Sizing Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate the right injector size for your target horsepower, fuel type, and aspiration.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ──────────── LEFT COLUMN: INPUTS ──────────── */}
        <div className="space-y-4">

          {/* Primary Inputs */}
          <Card>
            <CardHeader><CardTitle>Engine Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Target HP */}
              <div className="space-y-1">
                <Label>Target Horsepower (crank)</Label>
                <Input
                  type="number"
                  step="5"
                  min="50"
                  max="5000"
                  value={targetHp}
                  onChange={(e) => setTargetHp(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If you know wheel HP, add ~15% for drivetrain loss.
                  {ctxHp && parseFloat(ctxHp) > 0 && (
                    <span className="text-[#E85D04]"> (loaded {ctxHp} HP from your build)</span>
                  )}
                </p>
              </div>

              {/* Number of Cylinders */}
              <div className="space-y-1">
                <Label>Number of Cylinders</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  max="16"
                  value={cylinders}
                  onChange={(e) => setCylinders(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1 injector per cylinder (port injection).
                  {ctxCyl && parseInt(ctxCyl) > 0 && (
                    <span className="text-[#E85D04]"> (loaded from your build)</span>
                  )}
                </p>
              </div>

              {/* Fuel Type */}
              <div className="space-y-1">
                <Label>Fuel Type</Label>
                <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FUEL_LABELS) as FuelType[]).map((id) => (
                      <SelectItem key={id} value={id}>{FUEL_LABELS[id]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Stoich AFR: {FUEL_STOICH[fuelType]}:1
                </p>
              </div>

              {/* Aspiration */}
              <div className="space-y-2">
                <Label>Aspiration</Label>
                <div className="flex rounded-lg border overflow-hidden">
                  {([
                    { id: "na" as Aspiration, label: "Naturally Aspirated" },
                    { id: "turbo" as Aspiration, label: "Turbocharged" },
                    { id: "supercharged" as Aspiration, label: "Supercharged" },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        aspiration === opt.id
                          ? "bg-[#1a1a1a] text-white"
                          : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setAspiration(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  BSFC: {autoBsfc.toFixed(2)} lb/hp-hr
                  {aspiration === "turbo" && " (forced induction burns more fuel per HP)"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Inputs */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-white text-sm font-semibold hover:bg-muted/50 transition-colors"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <span>Advanced Options</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </button>
            {advancedOpen && (
              <div className="p-5 border-t space-y-4">
                {/* Max Duty Cycle */}
                <div className="space-y-2">
                  <Label>Max Duty Cycle: {maxDutyCycle}%</Label>
                  <input
                    type="range"
                    min={75}
                    max={90}
                    step={1}
                    value={maxDutyCycle}
                    onChange={(e) => setMaxDutyCycle(parseInt(e.target.value))}
                    className="w-full accent-[#E85D04]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>75% (conservative)</span>
                    <span>90% (aggressive)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    80% is safe for most applications. Only increase if using return-style fuel rails with adequate cooling.
                  </p>
                </div>

                {/* Base Fuel Pressure */}
                <div className="space-y-1">
                  <Label>Base Fuel Pressure (psi)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="20"
                    max="100"
                    value={baseFuelPressure}
                    onChange={(e) => setBaseFuelPressure(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Most port injection systems: 43.5 psi (3 bar). Stock LS trucks/58 psi returnless: enter 58.
                    Injectors are rated at 43.5 psi — flow scales with √(pressure/43.5).
                  </p>
                </div>

                {/* BSFC Override */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bsfc-override"
                      checked={useBsfcOverride}
                      onChange={(e) => setUseBsfcOverride(e.target.checked)}
                      className="accent-[#E85D04]"
                    />
                    <Label htmlFor="bsfc-override" className="text-sm cursor-pointer">I know my BSFC (from dyno data)</Label>
                  </div>
                  {useBsfcOverride && (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.2"
                        max="3.0"
                        value={bsfcOverride}
                        onChange={(e) => setBsfcOverride(e.target.value)}
                        placeholder={autoBsfc.toFixed(2)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your measured BSFC in lb/hp-hr. Auto value: {autoBsfc.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ──────────── RIGHT COLUMN: RESULTS ──────────── */}
        <div className="space-y-4">

          {/* Primary Results */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
              {isValid ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-sm">Minimum Injector Size</p>
                      <p className="text-3xl font-bold">{fmt(minSizeCorrected, 1)} <span className="text-lg">lb/hr</span></p>
                      <p className="text-sm text-gray-400 mt-1">{fmt(minSizeCc, 0)} cc/min</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/10 ring-1 ring-[#E85D04]">
                      <p className="text-gray-400 text-sm">Recommended Size</p>
                      <p className="text-3xl font-bold text-[#E85D04]">{recommendedSize} <span className="text-lg">lb/hr</span></p>
                      <p className="text-sm text-gray-400 mt-1">{fmt(recommendedSizeCc, 0)} cc/min</p>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg border ${getDutyCycleBg(actualDutyCycle)}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Duty Cycle at Target HP</span>
                      <span className={`text-2xl font-bold ${getDutyCycleColor(actualDutyCycle)}`}>
                        {fmt(actualDutyCycle, 1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          actualDutyCycle < 75 ? "bg-green-500" :
                          actualDutyCycle < 80 ? "bg-yellow-500" :
                          actualDutyCycle < 85 ? "bg-orange-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(actualDutyCycle, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Enter your engine specs to see results.</p>
              )}
            </CardContent>
          </Card>

          {/* Headroom & Secondary Results */}
          {isValid && (
            <Card>
              <CardHeader><CardTitle>Fuel System Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <ResultRow label="Total fuel flow" value={`${fmt(totalFuelFlow, 1)} lb/hr  (${fmt(totalGph, 1)} gal/hr)`} />
                <ResultRow label="Flow per injector" value={`${fmt(fuelFlowPerInjector, 1)} lb/hr`} />
                <ResultRow label="Headroom with recommended injector" value={`+${fmt(headroomHp, 0)} HP before hitting 80% duty`} accent />
                <ResultRow label="Max HP at 80% duty (recommended injector)" value={`${fmt(maxHpAt80, 0)} HP`} />

                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold mb-2">Fuel System Companion</p>
                  <ResultRow label="Minimum fuel pump flow" value={`${fmt(pumpFlowGph, 1)} GPH / ${fmt(pumpFlowLph, 0)} LPH`} />
                  <ResultRow label="Fuel line size" value={`${fuelLine.size} (${fuelLine.an})`} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Injector Sizes Visual */}
          {isValid && (
            <Card>
              <CardHeader><CardTitle>Available Injector Sizes</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SIZES.map((size) => {
                    const isRecommended = size === recommendedSize;
                    const isTooSmall = size < minSizeCorrected;
                    return (
                      <div
                        key={size}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          isRecommended
                            ? "bg-[#E85D04] text-white border-[#E85D04]"
                            : isTooSmall
                            ? "bg-gray-100 text-gray-400 border-gray-200 line-through"
                            : "bg-white text-gray-700 border-gray-200"
                        }`}
                      >
                        {size}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Sizes in lb/hr. <span className="text-[#E85D04] font-medium">Orange</span> = recommended.
                  <span className="line-through ml-1">Strikethrough</span> = too small for your application.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${
                    w.type === "error" ? "bg-red-50 border-red-200 text-red-800" :
                    w.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
                    "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  {w.type === "error" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> :
                   w.type === "warning" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> :
                   <Info className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{w.msg}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cross-link */}
          <div className="p-3 rounded-lg border border-gray-200 text-sm text-muted-foreground">
            <Link href="/calculators/afr-lambda" className="text-[#E85D04] hover:underline font-medium">
              Use our AFR / Lambda calculator
            </Link>{" "}
            to dial in your target air-fuel ratio for {FUEL_LABELS[fuelType]}.
          </div>
        </div>
      </div>

      {/* ──────────── COLLAPSIBLE SECTIONS ──────────── */}

      {/* Common Swap Reference Table */}
      <Section title="Common Injector Swap Reference" open={swapTableOpen} toggle={() => setSwapTableOpen(!swapTableOpen)}>
        <p className="text-sm text-muted-foreground mb-3">Real-world injector sizes used in popular builds:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Build</th>
                <th className="text-left py-2">Fuel</th>
                <th className="text-right py-2">Injector Size</th>
              </tr>
            </thead>
            <tbody>
              {SWAP_TABLE.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-medium">{row.build}</td>
                  <td className="py-2">{row.fuel}</td>
                  <td className="text-right py-2 font-bold">{row.injector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Formulas & Methodology */}
      <Section title="Formulas & Methodology" open={formulaOpen} toggle={() => setFormulaOpen(!formulaOpen)}>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Primary Injector Sizing Formula</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Injector Size (lb/hr) = (HP × BSFC) / (Number of Injectors × Max Duty Cycle)
            </code>
            <p className="mt-1">
              BSFC is Brake Specific Fuel Consumption — how many pounds of fuel the engine burns per horsepower per hour. Turbo engines have higher BSFC because boost enrichment requires extra fuel. E85 and methanol have much higher BSFC because their stoichiometric ratios demand more fuel per unit of air.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Fuel Pressure Correction</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Corrected Flow = Rated Flow × √(Actual Pressure / Rated Pressure)
            </code>
            <p className="mt-1">
              Injectors are rated at a reference pressure (usually 43.5 psi / 3 bar). If your fuel pressure differs — common on LS returnless systems running 58 psi — the actual flow changes with the square root of the pressure ratio.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Unit Conversion</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              1 lb/hr = 10.5 cc/min (for gasoline-density fuels)
            </code>
            <p className="mt-1">
              US aftermarket companies (DeatschWerks, Injector Dynamics, Fuel Injector Clinic) rate in lb/hr. Japanese and European manufacturers (Bosch, Denso) often rate in cc/min. Both are shown in results.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">BSFC Values Used</p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Fuel</th>
                    <th className="text-right py-1">NA</th>
                    <th className="text-right py-1">Turbo</th>
                    <th className="text-right py-1">Supercharged</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(BSFC_MAP) as FuelType[]).map((fuel) => (
                    <tr key={fuel} className="border-b">
                      <td className="py-1 font-medium">{FUEL_LABELS[fuel]}</td>
                      <td className="text-right py-1">{BSFC_MAP[fuel].na}</td>
                      <td className="text-right py-1">{BSFC_MAP[fuel].turbo}</td>
                      <td className="text-right py-1">{BSFC_MAP[fuel].supercharged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1">
              Values are the conservative end of the published range, ensuring injectors are sized with adequate safety margin. Sources: HP Academy, Injector Dynamics, EFI University.
            </p>
          </div>
        </div>
      </Section>

      {/* Educational Section */}
      <Section title="How Fuel Injector Sizing Works" open={educationOpen} toggle={() => setEducationOpen(!educationOpen)}>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">BSFC and Why It Matters</p>
            <p>
              BSFC (Brake Specific Fuel Consumption) tells you how many pounds of fuel the engine burns for each horsepower it makes, per hour. A naturally aspirated gasoline engine typically burns about 0.45–0.50 lb/hp-hr. Turbocharged engines run richer for safety and cooling, so their BSFC climbs to 0.55–0.65 lb/hp-hr. This is the most critical variable in the sizing formula — it determines how much total fuel the engine needs.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Duty Cycle and the 80% Rule</p>
            <p>
              Duty cycle is the percentage of each engine cycle that the injector is held open and flowing fuel. At 100% duty cycle the injector is open continuously — no time to cool, no margin for the ECU to add fuel if conditions change. The industry standard maximum is 80%. This leaves a 20% safety margin for hot days, altitude changes, slightly lean fuel trims, and injector aging. Return-style fuel systems (where cool fuel constantly flows past the injector) can push to 85% in well-engineered setups, but returnless systems should stay at 80%.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Why E85 Needs Bigger Injectors</p>
            <p>
              E85 has a stoichiometric AFR of about 9.76:1 versus gasoline's 14.7:1. That means the engine burns roughly 50% more fuel by mass per unit of air. In practice, with the higher BSFC values of boosted E85 builds, you need about 35–50% more injector capacity than the equivalent gasoline build.
            </p>
            <p className="mt-2">
              <strong>Example:</strong> A 500 HP naturally aspirated gasoline engine needs about 39 lb/hr injectors (8 cylinders, 80% duty). The same 500 HP on E85 needs about 57 lb/hr — you'd buy 60 lb/hr injectors. On a turbo build at 500 HP on E85, the BSFC jumps even higher, pushing you to 69 lb/hr minimum — so 72 lb/hr injectors.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Dead Time and Injector Quality</p>
            <p>
              Every injector has a "dead time" (also called latency or offset) — the milliseconds between the ECU signal and when fuel actually starts flowing. High-quality injectors from Injector Dynamics, DeatschWerks, or Fuel Injector Clinic have consistent, well-characterized dead times across the voltage and pressure range. Cheap injectors have inconsistent dead times that cause rough idle, poor tip-in response, and transition stumbles. Dead time also matters more at high RPM and low pulse widths, where it becomes a larger fraction of total injector on-time.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Return vs. Returnless Fuel Systems</p>
            <p>
              In a return-style system, the fuel pump sends more fuel than the injectors need, and excess fuel returns to the tank through a return line. This keeps the fuel rail cool and at a consistent pressure. A fuel pressure regulator referenced to manifold vacuum maintains constant differential pressure across the injectors — so injector flow stays consistent regardless of boost.
            </p>
            <p className="mt-2">
              Returnless systems (common on modern OEM vehicles) use a pulse-width-modulated fuel pump and no return line. The fuel sits in the rail longer and gets hotter, which is why returnless setups should stay at 80% duty max. High-performance builds making 500+ HP should strongly consider converting to a return-style system.
            </p>
          </div>
        </div>
      </Section>

      </div>{/* end left column */}

      <HelpSidebar className="xl:w-80 shrink-0 space-y-6">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-[#E85D04]" />
              Quick Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">The Formula</h4>
              <p>Injector Size = (HP x BSFC) / (Cylinders x Max Duty Cycle). Target 80% duty cycle max for safety margin.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">BSFC Values</h4>
              <ul className="space-y-1 mt-1">
                <li><span className="font-medium text-foreground">NA gasoline:</span> 0.45-0.50 lb/hr/hp</li>
                <li><span className="font-medium text-foreground">Boosted gas:</span> 0.55-0.60</li>
                <li><span className="font-medium text-foreground">E85:</span> 0.65-0.75</li>
                <li><span className="font-medium text-foreground">Methanol:</span> 1.00-1.20</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Duty Cycle</h4>
              <p>Max 80% for street, 85% for race. Above 85% the injector cannot cool between pulses and atomization degrades.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Fuel Pressure Note</h4>
              <p>Injector flow ratings are at a specific pressure (usually 43.5 psi). Higher pressure increases flow by square root of pressure ratio.</p>
            </div>
          </CardContent>
        </Card>
      </HelpSidebar>

      </div>{/* end flex row */}

      <CalculatorContent data={fuelInjectorSizingContent} title="Fuel Injector Sizing" />
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
      <span className={`font-bold text-sm ${accent ? "text-[#E85D04]" : ""}`}>{value}</span>
    </div>
  );
}
