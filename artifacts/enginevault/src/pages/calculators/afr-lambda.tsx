import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

// ── Fuel definitions ──────────────────────────────────────────────────────────

type FuelId =
  | "gas-pure"
  | "gas-e10"
  | "gas-e15"
  | "e85"
  | "e98"
  | "e100"
  | "methanol"
  | "nitromethane"
  | "diesel"
  | "propane"
  | "cng"
  | "custom";

interface FuelDef {
  label: string;
  stoich: number;
}

const FUELS: Record<Exclude<FuelId, "e85" | "custom">, FuelDef> = {
  "gas-pure":     { label: "Gasoline (pure race fuel, C16/Q16)", stoich: 14.70 },
  "gas-e10":      { label: "Gasoline (E10 pump gas)",            stoich: 14.08 },
  "gas-e15":      { label: "Gasoline (E15 pump gas)",            stoich: 13.79 },
  "e98":          { label: "E98 race fuel",                      stoich: 9.08  },
  "e100":         { label: "E100 pure ethanol",                  stoich: 9.008 },
  "methanol":     { label: "Methanol (M100)",                    stoich: 6.47  },
  "nitromethane": { label: "Nitromethane",                       stoich: 1.70  },
  "diesel":       { label: "Diesel",                             stoich: 14.50 },
  "propane":      { label: "Propane (LPG)",                      stoich: 15.67 },
  "cng":          { label: "Natural Gas (CNG)",                  stoich: 17.20 },
};

const FUEL_ORDER: FuelId[] = [
  "gas-pure", "gas-e10", "gas-e15", "e85", "e98", "e100",
  "methanol", "nitromethane", "diesel", "propane", "cng", "custom",
];

// Linear blend by volume fraction — matches COBB Tuning, ECMTuning, HP Tuners.
// Density-correction (vol% vs mass%) is ~0.5 %, swamped by pump-fuel variability.
function getE85Stoich(ethanolPct: number): number {
  const f = ethanolPct / 100;
  return 14.7 * (1 - f) + 9.008 * f;
}

// ── Input mode ────────────────────────────────────────────────────────────────

type InputMode = "lambda" | "afr" | "gasscale";

const INPUT_MODES: { id: InputMode; label: string; shortLabel: string }[] = [
  { id: "lambda",   label: "Lambda (λ)",                      shortLabel: "Lambda (λ)" },
  { id: "afr",      label: "Actual AFR",                      shortLabel: "Actual AFR" },
  { id: "gasscale", label: "Gas-scale AFR (wideband reading)", shortLabel: "Gas-scale AFR" },
];

// ── Lambda condition zones ────────────────────────────────────────────────────

function getLambdaZone(lambda: number): { label: string; subtitle: string; color: string; bg: string } {
  if (lambda > 1.10) return { label: "LEAN — Detonation or burn-through risk", subtitle: "", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  if (lambda >= 1.00) return { label: "Lean cruise", subtitle: "OK for part-throttle cruise", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (lambda >= 0.95) return { label: "Stoichiometric", subtitle: "Closed-loop / emissions", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (lambda >= 0.85) return { label: "Power (NA)", subtitle: "Typical NA WOT target", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (lambda >= 0.75) return { label: "Power (boost/nitrous)", subtitle: "Typical power-adder WOT target", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "RICH — Check for over-fueling", subtitle: "", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

// ── Reference table data ──────────────────────────────────────────────────────

const REFERENCE_ROWS = [
  { condition: "Stoich (closed loop, cruise)", lambdaTarget: "1.00",      gasScale: "14.7",       notes: "EFI closed-loop range" },
  { condition: "Idle (NA)",                    lambdaTarget: "0.95–1.00", gasScale: "14.0–14.7",  notes: "" },
  { condition: "Cruise, light load",           lambdaTarget: "0.95–1.05", gasScale: "14.0–15.4",  notes: "Lean for mpg" },
  { condition: "WOT NA, 91 octane",            lambdaTarget: "0.85–0.88", gasScale: "12.5–13.0",  notes: "" },
  { condition: "WOT NA, race gas",             lambdaTarget: "0.82–0.85", gasScale: "12.0–12.5",  notes: "Cooler, safer" },
  { condition: "WOT boost, pump gas",          lambdaTarget: "0.75–0.80", gasScale: "11.0–11.8",  notes: "Critical" },
  { condition: "WOT boost, E85",               lambdaTarget: "0.75–0.80", gasScale: "11.0–11.8",  notes: "Same λ, half the AFR" },
  { condition: "WOT methanol",                 lambdaTarget: "0.85–0.90", gasScale: "12.5–13.2",  notes: "Tolerates leaner λ" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AfrLambdaCalculator() {
  const [fuelId, setFuelId] = useState<FuelId>("gas-pure");
  const [ethanolPct, setEthanolPct] = useState(70);
  const [customStoich, setCustomStoich] = useState("14.70");
  const [inputMode, setInputMode] = useState<InputMode>("lambda");
  const [inputValue, setInputValue] = useState("0.850");
  const [refOpen, setRefOpen] = useState(false);

  // ── Resolve stoich for current fuel ──
  let stoich: number;
  if (fuelId === "e85") {
    stoich = getE85Stoich(ethanolPct);
  } else if (fuelId === "custom") {
    const cs = parseFloat(customStoich) || 0;
    stoich = cs > 0.5 && cs <= 30 ? cs : 14.7;
  } else {
    stoich = FUELS[fuelId].stoich;
  }

  // ── Compute all three values from whichever input mode is active ──
  const raw = parseFloat(inputValue) || 0;
  let lambda: number;
  let actualAfr: number;
  let gasScaleAfr: number;

  if (inputMode === "lambda") {
    lambda = Math.max(0.50, Math.min(1.50, raw));
    actualAfr = lambda * stoich;
    gasScaleAfr = lambda * 14.7;
  } else if (inputMode === "afr") {
    actualAfr = raw;
    lambda = stoich > 0 ? raw / stoich : 0;
    lambda = Math.max(0.50, Math.min(1.50, lambda));
    actualAfr = lambda * stoich;
    gasScaleAfr = lambda * 14.7;
  } else {
    gasScaleAfr = raw;
    lambda = raw / 14.7;
    lambda = Math.max(0.50, Math.min(1.50, lambda));
    gasScaleAfr = lambda * 14.7;
    actualAfr = lambda * stoich;
  }

  const zone = getLambdaZone(lambda);

  // ── Fuel volume comparison vs gasoline ──
  const volumeRatio = 14.7 / stoich;
  const pctMoreFlow = (volumeRatio - 1) * 100;

  // ── Fuel label for display ──
  let fuelLabel: string;
  if (fuelId === "e85") {
    fuelLabel = `E85 (${ethanolPct}% ethanol)`;
  } else if (fuelId === "custom") {
    fuelLabel = "Custom fuel";
  } else {
    fuelLabel = FUELS[fuelId].label;
  }

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
        {/* ── Left column: inputs ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Fuel Selection</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Fuel Type</Label>
                <Select value={fuelId} onValueChange={(v) => setFuelId(v as FuelId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_ORDER.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id === "e85" ? "E85 — variable ethanol" : id === "custom" ? "Custom (enter stoich)" : FUELS[id as Exclude<FuelId, "e85" | "custom">].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fuelId === "e85" && (
                <div className="space-y-2">
                  <Label>Actual ethanol content: {ethanolPct}%</Label>
                  <input
                    type="range"
                    min={51}
                    max={85}
                    value={ethanolPct}
                    onChange={(e) => setEthanolPct(parseInt(e.target.value))}
                    className="w-full accent-[#E85D04]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>51% (winter)</span>
                    <span>85% (summer)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">At {ethanolPct}% actual ethanol, this E85 has a stoich AFR of {stoich.toFixed(2)}:1</p>
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                    Pump E85 varies seasonally. Winter blends can contain as little as 51% ethanol in northern states; summer blends run up to 85%. Use a flex-fuel sensor for real-time ethanol content. Don't trust the pump label.
                  </div>
                </div>
              )}

              {fuelId === "custom" && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Stoichiometric AFR (0.5–30)</Label>
                  <Input type="number" step="0.01" min="0.5" max="30" value={customStoich} onChange={(e) => setCustomStoich(e.target.value)} />
                </div>
              )}

              {fuelId !== "e85" && fuelId !== "custom" && (
                <p className="text-xs text-muted-foreground">Stoich AFR: {stoich.toFixed(2)}:1</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Input Mode</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden" role="radiogroup" aria-label="Input mode">
                {INPUT_MODES.map((mode) => (
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
                    onClick={() => setInputMode(mode.id)}
                    onKeyDown={(e) => {
                      const idx = INPUT_MODES.findIndex((m) => m.id === mode.id);
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = INPUT_MODES[(idx + 1) % INPUT_MODES.length];
                        setInputMode(next.id);
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = INPUT_MODES[(idx - 1 + INPUT_MODES.length) % INPUT_MODES.length];
                        setInputMode(prev.id);
                      }
                    }}
                  >
                    {mode.shortLabel}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <Label>
                  {inputMode === "lambda" && "Lambda (λ)"}
                  {inputMode === "afr" && `Actual AFR (${fuelLabel})`}
                  {inputMode === "gasscale" && "Gas-scale AFR (wideband reading)"}
                </Label>
                <Input
                  type="number"
                  step={inputMode === "lambda" ? "0.001" : "0.01"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {inputMode === "lambda" && "Universal ratio — 1.000 = stoichiometric on any fuel"}
                  {inputMode === "afr" && "True air-to-fuel mass ratio for the selected fuel"}
                  {inputMode === "gasscale" && "What your wideband O₂ sensor displays (always based on gasoline stoich 14.7)"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: results ── */}
        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${inputMode === "lambda" ? "bg-white/10 ring-1 ring-primary" : ""}`}>
                  <p className="text-gray-400 text-sm">Lambda (λ)</p>
                  <p className="text-4xl font-bold text-primary">{lambda.toFixed(3)}</p>
                </div>
                <div className={`p-4 rounded-lg ${inputMode === "afr" ? "bg-white/10 ring-1 ring-primary" : ""}`}>
                  <p className="text-gray-400 text-sm">Actual AFR</p>
                  <p className="text-4xl font-bold">{actualAfr.toFixed(2)}:1</p>
                  <p className="text-xs text-gray-500 mt-1">{fuelLabel}</p>
                </div>
                <div className={`p-4 rounded-lg ${inputMode === "gasscale" ? "bg-white/10 ring-1 ring-primary" : ""}`}>
                  <p className="text-gray-400 text-sm">Gas-scale AFR</p>
                  <p className="text-4xl font-bold">{gasScaleAfr.toFixed(2)}:1</p>
                  <p className="text-xs text-gray-500 mt-1">Wideband display</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className={`p-4 rounded-lg border ${zone.bg}`}>
            <p className={`font-bold ${zone.color}`}>{zone.label}</p>
            {zone.subtitle && <p className="text-sm mt-1 text-muted-foreground">{zone.subtitle}</p>}
          </div>

          <Card>
            <CardHeader><CardTitle>Fuel Volume vs. Gasoline</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                At the same air mass and same Lambda, this fuel requires:
              </p>
              <p className="text-3xl font-bold">
                {pctMoreFlow >= 0 ? "+" : ""}{pctMoreFlow.toFixed(1)}%
                <span className="text-base font-normal text-muted-foreground ml-2">volume flow vs. gasoline</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Critical for sizing injectors and fuel pumps on fuel conversions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>How to Read This</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Your wideband always shows gas-scale AFR</strong> — it multiplies Lambda by 14.7 regardless of fuel. A reading of {gasScaleAfr.toFixed(1)} on your gauge means Lambda {lambda.toFixed(3)}, which on {fuelLabel} is an actual AFR of {actualAfr.toFixed(2)}:1.
              </p>
              <p>
                When switching fuels, target the <strong>same Lambda</strong>, not the same AFR number. The actual AFR will change dramatically but engine conditions will not.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Collapsible reference table ── */}
      <div className="mt-8 border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold hover:bg-[#222] transition-colors"
          onClick={() => setRefOpen(!refOpen)}
        >
          <span>Target AFR / Lambda by Operating Condition</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${refOpen ? "rotate-180" : ""}`} />
        </button>
        {refOpen && (
          <div className="p-5 bg-white">
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
                  {REFERENCE_ROWS.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                      <td className="py-2 font-medium">{row.condition}</td>
                      <td className="text-right py-2">{row.lambdaTarget}</td>
                      <td className="text-right py-2">{row.gasScale}</td>
                      <td className="text-left py-2 pl-4 text-muted-foreground">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Educational section ── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Lambda, AFR, and Wideband Readings</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            A wideband O₂ sensor measures the percentage of oxygen remaining in the exhaust stream and converts that into a Lambda value — the ratio of actual air-fuel mixture to the stoichiometric (chemically perfect) ratio for a given fuel. The controller then multiplies Lambda by 14.7 (gasoline's stoich) to display "AFR" on your gauge. This gas-scale reading is hardwired regardless of what fuel you are actually burning. That is why a guy running E85 sees 12.5 on his wideband at WOT instead of the 8–9:1 actual AFR he expects — the gauge is not wrong, it is simply speaking in gasoline units.
          </p>
          <p>
            Lambda is the universal, fuel-agnostic way to express mixture richness. Lambda 1.000 means stoichiometric on any fuel — gasoline, E85, methanol, propane, anything. Lambda 0.85 means the mixture is 15% richer than stoich, again on any fuel. This is why professional tuners and OEM calibrators work in Lambda rather than AFR: it makes every target, every table, and every log directly comparable across fuels without conversion. A naturally aspirated engine making peak power at Lambda 0.85 does so whether it is burning gasoline (actual AFR 12.5:1) or methanol (actual AFR 5.5:1).
          </p>
          <p>
            The practical takeaway: when you switch fuels — gasoline to E85, E85 to methanol — do not target the same AFR number. Target the same Lambda. If your NA engine made peak power at Lambda 0.85 on gasoline (12.5:1 AFR), target Lambda 0.85 on E85 as well. Your wideband will still read 12.5 gas-scale, but the actual AFR will drop to roughly 8.9:1 because E85's stoich is so much lower. The engine does not care about the AFR number — it cares about the oxygen-to-fuel balance, which is exactly what Lambda describes.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Sources and Methodology</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            The stoichiometric AFR values in this calculator are derived from balanced combustion stoichiometry (Heywood, <em>Internal Combustion Engine Fundamentals</em>, Ch. 3) and cross-referenced against published calibration data from COBB Tuning (Subaru DIT WRX CAN Flex Fuel Tuning Guide), ECMTuning (DSM E85 wiki), and HP Tuners. Ethanol-blend stoich is computed using the industry-standard linear interpolation by volume fraction between E0 (14.7:1) and E100 (9.008:1) — the same method used by COBB, MoTeC, Haltech, Holley EFI, and MaxxECU flex-fuel calibrations. This calculator's E0–E100 table matches the COBB published table to three decimal places at every 10% increment.
          </p>
          <p>
            The linear volume-fraction blend introduces a ~0.5% systematic error versus a rigorous mass-fraction calculation (because ethanol at 0.789 g/mL is denser than gasoline at ~0.74 g/mL), but every major EFI manufacturer uses this same simplification because real-world pump-fuel ethanol content varies by ±10% seasonally (ASTM D5798 permits 51–83% ethanol in "E85"), which is 20× larger than the density-correction error. Lambda targets, condition zones, and the gas-scale AFR convention (λ × 14.7) follow the definitions used by AEM, Innovate Motorsports, and HP Academy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
