import { useState, useMemo } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Application =
  | "stock"
  | "perf-na"
  | "high-na"
  | "nitrous-50"
  | "nitrous-150"
  | "nitrous-250"
  | "turbo-10"
  | "turbo-20"
  | "turbo-20plus"
  | "sc-roots"
  | "sc-centrifugal"
  | "diesel";

type RingMaterial = "cast-iron" | "moly" | "steel" | "stainless";

interface MultiplierRow {
  top: number;
  second: number;
  oilMin: number;
  oilMax: number;
}

// ── Multiplier Table ───────────────────────────────────────────────────────────

const multiplierTable: Record<Application, MultiplierRow> = {
  "stock":          { top: 0.0035, second: 0.0045, oilMin: 0.015, oilMax: 0.025 },
  "perf-na":        { top: 0.0040, second: 0.0050, oilMin: 0.015, oilMax: 0.025 },
  "high-na":        { top: 0.0045, second: 0.0050, oilMin: 0.015, oilMax: 0.025 },
  "nitrous-50":     { top: 0.0055, second: 0.0060, oilMin: 0.015, oilMax: 0.025 },
  "nitrous-150":    { top: 0.0060, second: 0.0065, oilMin: 0.015, oilMax: 0.025 },
  "nitrous-250":    { top: 0.0070, second: 0.0075, oilMin: 0.020, oilMax: 0.030 },
  "turbo-10":       { top: 0.0050, second: 0.0055, oilMin: 0.015, oilMax: 0.025 },
  "turbo-20":       { top: 0.0055, second: 0.0060, oilMin: 0.015, oilMax: 0.025 },
  "turbo-20plus":   { top: 0.0065, second: 0.0070, oilMin: 0.020, oilMax: 0.030 },
  "sc-roots":       { top: 0.0055, second: 0.0060, oilMin: 0.015, oilMax: 0.025 },
  "sc-centrifugal": { top: 0.0060, second: 0.0065, oilMin: 0.015, oilMax: 0.025 },
  "diesel":         { top: 0.0075, second: 0.0080, oilMin: 0.020, oilMax: 0.030 },
};

const applicationLabels: Record<Application, string> = {
  "stock":          "Stock replacement / mild street",
  "perf-na":        "Performance street NA",
  "high-na":        "High-performance NA (10.5:1+ CR)",
  "nitrous-50":     "Nitrous: 50\u2013150 shot",
  "nitrous-150":    "Nitrous: 150\u2013250 shot",
  "nitrous-250":    "Nitrous: 250+ shot",
  "turbo-10":       "Turbo street (under 10 psi)",
  "turbo-20":       "Turbo performance (10\u201320 psi)",
  "turbo-20plus":   "Turbo race (20+ psi)",
  "sc-roots":       "Supercharged (Roots / TVS / Whipple)",
  "sc-centrifugal": "Supercharged (Centrifugal)",
  "diesel":         "Diesel / extreme boost (30+ psi)",
};

const materialLabels: Record<RingMaterial, string> = {
  "cast-iron": "Cast iron / ductile iron",
  "moly":      "Moly-faced (plasma or chrome)",
  "steel":     "Steel (gas-nitrided)",
  "stainless": "Stainless / tool steel (M2)",
};

// ── Warning Logic ──────────────────────────────────────────────────────────────

interface Warning {
  level: "red" | "yellow";
  message: string;
}

function getWarnings(app: Application, mat: RingMaterial, bore: number): Warning[] {
  const warnings: Warning[] = [];

  // Moly + high nitrous
  if ((app === "nitrous-150" || app === "nitrous-250") && mat === "moly") {
    warnings.push({
      level: "red",
      message: "Moly rings not recommended above 150 shot. Plasma coating can flake under thermal shock, scoring the cylinder. Use steel rings.",
    });
  }

  // Cast iron + extreme heat
  if ((app === "nitrous-250" || app === "turbo-20plus" || app === "diesel") && mat === "cast-iron") {
    warnings.push({
      level: "red",
      message: "Cast iron rings lack thermal stability for this application. Steel or stainless required for long-term reliability.",
    });
  }

  // Moly + high boost
  if ((app === "turbo-20plus" || app === "sc-centrifugal") && mat === "moly") {
    warnings.push({
      level: "yellow",
      message: "Consider upgrading to steel rings for best durability at this boost level.",
    });
  }

  // Small bore + diesel
  if (bore < 3.5 && app === "diesel") {
    warnings.push({
      level: "yellow",
      message: "Unusual combination \u2014 verify this matches your engine. Small-bore diesels typically use specific ring packages from the OEM.",
    });
  }

  // Large bore + NA street
  if (bore > 4.5 && app === "stock") {
    warnings.push({
      level: "yellow",
      message: "Large bore with stock/street application produces a large gap. Verify this matches your build \u2014 most big-bore engines are performance builds.",
    });
  }

  return warnings;
}

// ── Workflow Text ──────────────────────────────────────────────────────────────

const workflowSteps = [
  "Place ring squarely in bore (use a piston to push it in ~1/2\" deep)",
  "Measure current gap with feeler gauges",
  "If gap is less than target: file carefully with a ring filer",
  "Use light, even strokes \u2014 a few thousandths max per pass",
  "Keep ring square; check frequently with feeler gauges",
  "Deburr with a fine stone after final fit",
  "Test-fit ring in bore again \u2014 should slide in freely",
  "Repeat for all rings, filing TOP rings for top gap and SECOND rings for second gap",
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function RingGapAdvancedCalculator() {
  const [bore, setBore] = useState("4.030");
  const [boreMm, setBoreMm] = useState("");
  const [boreUnits, setBoreUnits] = useState<"in" | "mm">("in");
  const [app, setApp] = useState<Application>("perf-na");
  const [material, setMaterial] = useState<RingMaterial>("moly");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Advanced override sliders — initialized from the table
  const defaults = multiplierTable[app];
  const [topOverride, setTopOverride] = useState<number | null>(null);
  const [secondOverride, setSecondOverride] = useState<number | null>(null);

  // Reset overrides when application changes
  const [lastApp, setLastApp] = useState<Application>(app);
  if (app !== lastApp) {
    setLastApp(app);
    setTopOverride(null);
    setSecondOverride(null);
  }

  const b = parseFloat(bore) || 0;

  const topMult = topOverride ?? defaults.top;
  const secondMult = secondOverride ?? defaults.second;

  // Assertion: second must always be >= top
  const effectiveSecondMult = Math.max(secondMult, topMult);

  const topGap = b * topMult;
  const secondGap = b * effectiveSecondMult;
  const oilGapMin = b * defaults.oilMin;
  const oilGapMax = b * defaults.oilMax;

  // Enforce minimum practical gap
  const minPracticalGap = 0.010;

  const warnings = useMemo(() => getWarnings(app, material, b), [app, material, b]);

  // Small gap warning
  const smallGapWarning = topGap > 0 && topGap < minPracticalGap;

  const [copied, setCopied] = useState(false);

  function handleBoreChange(val: string) {
    setBore(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setBoreMm((num * 25.4).toFixed(2));
    }
  }

  function handleBoreMmChange(val: string) {
    setBoreMm(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setBore((num / 25.4).toFixed(4));
    }
  }

  function copyWorkflow() {
    const text = "Filing ring gaps: step by step\n" + workflowSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatThousandths(val: number): string {
    return Math.round(val * 1000).toString();
  }

  function formatInches(val: number): string {
    return val.toFixed(3);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <SEOHead
        title="Piston Ring Gap Calculator"
        description="Application-specific piston ring end gap calculator for NA, nitrous, turbo, supercharged, and diesel builds. Per-ring outputs, material warnings, and file-gap workflow."
        canonical="/calculators/ring-gap"
        keywords="piston ring gap calculator, advanced ring gap, turbo ring gap, nitrous ring gap, diesel ring gap, ring material, file ring gap"
      />

      <h1 className="text-3xl font-bold mb-1">Piston Ring Gap Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Application-specific ring gap for every ring position. Covers NA, nitrous, turbo, supercharged, and diesel builds with material compatibility warnings.
      </p>

      {/* ── Inputs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Bore with unit toggle */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Bore Size</Label>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setBoreUnits("in")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${boreUnits === "in" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-muted-foreground hover:text-[#1a1a1a]"}`}
                  >
                    inches
                  </button>
                  <button
                    onClick={() => setBoreUnits("mm")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${boreUnits === "mm" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-muted-foreground hover:text-[#1a1a1a]"}`}
                  >
                    mm
                  </button>
                </div>
              </div>
              {boreUnits === "in" ? (
                <Input type="number" step="0.001" value={bore} onChange={e => handleBoreChange(e.target.value)} />
              ) : (
                <Input type="number" step="0.01" value={boreMm} placeholder="e.g. 102.36" onChange={e => handleBoreMmChange(e.target.value)} />
              )}
            </div>

            {/* Application */}
            <div className="space-y-1">
              <Label>Application</Label>
              <Select value={app} onValueChange={(v) => setApp(v as Application)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(applicationLabels) as Application[]).map(key => (
                    <SelectItem key={key} value={key}>{applicationLabels[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Material */}
            <div className="space-y-1">
              <Label>Ring Material</Label>
              <Select value={material} onValueChange={(v) => setMaterial(v as RingMaterial)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(materialLabels) as RingMaterial[]).map(key => (
                    <SelectItem key={key} value={key}>{materialLabels[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-1 text-sm font-medium text-[#E85D04] hover:underline mt-2"
            >
              {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced: Override multipliers
            </button>

            {advancedOpen && (
              <div className="space-y-4 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Top Ring Multiplier</Label>
                    <span className="font-mono text-[#E85D04] font-bold">{(topOverride ?? defaults.top).toFixed(4)}</span>
                  </div>
                  <Slider
                    min={0.003}
                    max={0.010}
                    step={0.0005}
                    value={[topOverride ?? defaults.top]}
                    onValueChange={([v]) => setTopOverride(v)}
                  />
                  <p className="text-xs text-muted-foreground">Default for this application: {defaults.top.toFixed(4)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Second Ring Multiplier</Label>
                    <span className="font-mono text-[#E85D04] font-bold">{(secondOverride ?? defaults.second).toFixed(4)}</span>
                  </div>
                  <Slider
                    min={0.003}
                    max={0.010}
                    step={0.0005}
                    value={[secondOverride ?? defaults.second]}
                    onValueChange={([v]) => setSecondOverride(v)}
                  />
                  <p className="text-xs text-muted-foreground">Default for this application: {defaults.second.toFixed(4)}</p>
                </div>
                <button
                  onClick={() => { setTopOverride(null); setSecondOverride(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Reset to application defaults
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Result Cards ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Top Ring */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 font-medium">Top Ring Gap</CardTitle>
            </CardHeader>
            <CardContent>
              {boreUnits === "in" ? (
                <>
                  <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{formatThousandths(topGap)}</p>
                  <p className="text-sm text-gray-400 mt-1">thousandths ({formatInches(topGap)}")</p>
                </>
              ) : (
                <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{(topGap * 25.4).toFixed(2)} mm</p>
              )}
            </CardContent>
          </Card>

          {/* Second Ring */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 font-medium">Second Ring Gap</CardTitle>
            </CardHeader>
            <CardContent>
              {boreUnits === "in" ? (
                <>
                  <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{formatThousandths(secondGap)}</p>
                  <p className="text-sm text-gray-400 mt-1">thousandths ({formatInches(secondGap)}")</p>
                </>
              ) : (
                <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{(secondGap * 25.4).toFixed(2)} mm</p>
              )}
            </CardContent>
          </Card>

          {/* Oil Rails */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 font-medium">Oil Rail Gap</CardTitle>
            </CardHeader>
            <CardContent>
              {boreUnits === "in" ? (
                <>
                  <p className="text-4xl font-bold text-[#E85D04] tabular-nums">
                    {formatThousandths(oilGapMin)}<span className="text-2xl text-gray-500"> – </span>{formatThousandths(oilGapMax)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">thousandths ({formatInches(oilGapMin)}" – {formatInches(oilGapMax)}")</p>
                </>
              ) : (
                <p className="text-4xl font-bold text-[#E85D04] tabular-nums">
                  {(oilGapMin * 25.4).toFixed(2)}<span className="text-2xl text-gray-500"> – </span>{(oilGapMax * 25.4).toFixed(2)} mm
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">File to within this range</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Warnings ───────────────────────────────────────────────────────── */}
      {(warnings.length > 0 || smallGapWarning) && (
        <div className="space-y-3 mb-8">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                w.level === "red"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
              }`}
            >
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${w.level === "red" ? "text-red-600" : "text-yellow-600"}`} />
              <p className="text-sm font-medium">{w.message}</p>
            </div>
          ))}
          {smallGapWarning && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-600" />
              <p className="text-sm font-medium">
                Calculated top ring gap is below 0.010". At this size, filing becomes impractical and measurement error is significant. Double-check your bore size.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── File-Gap Workflow ──────────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filing Ring Gaps: Step by Step</CardTitle>
            <button
              onClick={copyWorkflow}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            {workflowSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ── Educational Content ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding Piston Ring End Gap</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>
            Piston rings expand as the engine heats to operating temperature. The end gap is the cold clearance that allows for this expansion. If the gap is too tight, the ring ends butt together under heat, and the ring has nowhere to go — it buckles outward, breaks the ring land off the piston, and can score or crack the cylinder wall. This is one of the most common causes of catastrophic engine failure in fresh builds. Too much gap allows combustion gases to blow past the ring (blowby), reducing power, pressurizing the crankcase, and contaminating the oil with combustion byproducts.
          </p>
          <p>
            Power adders — turbochargers, superchargers, and nitrous — dump significantly more heat into the combustion chamber than a naturally aspirated engine. The piston ring sees higher peak temperatures, expands more, and needs a larger cold gap to avoid thermal lock-up. A turbo engine making 20 psi of boost can see cylinder temperatures 200–400°F higher than the same engine naturally aspirated. Nitrous is even more aggressive — the oxygen-enriched charge burns faster and hotter, creating extreme thermal shock that can crack or delaminate ring coatings not designed for it.
          </p>
          <p>
            Ring material matters because different metals respond to heat differently. Cast iron was the standard for decades — inexpensive and adequate for stock applications, but it warps under rapid thermal cycling and is brittle under high loads. Moly-faced (molybdenum-filled) rings improved durability and oil retention significantly, but the plasma-sprayed moly coating can delaminate under the thermal shock of high nitrous or extreme boost. Steel and stainless steel rings (gas-nitrided or tool steel like M2) are dimensionally stable even under extreme conditions — they cost more, but they hold their shape and survive where cast iron and moly cannot.
          </p>
        </CardContent>
      </Card>

      {/* ── Multiplier Reference Table ─────────────────────────────────────── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Ring Gap Multiplier Reference</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Application</th>
                <th className="pb-2 pr-4 font-semibold text-right">Top (per in.)</th>
                <th className="pb-2 pr-4 font-semibold text-right">Second (per in.)</th>
                <th className="pb-2 font-semibold text-right">Oil Rails</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {(Object.keys(multiplierTable) as Application[]).map(key => {
                const row = multiplierTable[key];
                const isActive = key === app;
                return (
                  <tr key={key} className={`border-b last:border-0 ${isActive ? "bg-[#E85D04]/5 font-medium text-foreground" : ""}`}>
                    <td className="py-2 pr-4">{applicationLabels[key]}</td>
                    <td className="py-2 pr-4 text-right font-mono">{row.top.toFixed(4)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{row.second.toFixed(4)}</td>
                    <td className="py-2 text-right font-mono">{row.oilMin.toFixed(3)}–{row.oilMax.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
}
