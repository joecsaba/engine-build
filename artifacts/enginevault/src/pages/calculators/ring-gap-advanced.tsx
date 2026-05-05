import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Copy, Check, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { BuildBanner } from "@/components/BuildBanner";

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

type DieselEngine =
  | "generic"
  | "cummins-59-12v"
  | "cummins-59-24v"
  | "cummins-67"
  | "powerstroke-73"
  | "powerstroke-60"
  | "powerstroke-64"
  | "duramax-66";

interface MultiplierRow {
  top: number;
  second: number;
  oilMin: number; // flat minimum gap in inches (NOT per inch of bore)
}

// ── Diesel Engine Presets (absolute gap specs from OEM / aftermarket data) ────

interface DieselPreset {
  label: string;
  bore: number;
  topMin: number;
  topMax: number;
  secondMin: number;
  secondMax: number;
  oilMin: number;
  oilMax: number;
  notes: string;
}

const dieselPresets: Record<DieselEngine, DieselPreset> = {
  "generic": {
    label: "Generic diesel — use OEM specs if available",
    bore: 0,
    topMin: 0, topMax: 0,
    secondMin: 0, secondMax: 0,
    oilMin: 0, oilMax: 0,
    notes: "Generic diesel multipliers applied. Diesel engines often have very different ring gap specs than gasoline engines — always check your service manual.",
  },
  "cummins-59-12v": {
    label: "Cummins 5.9L 6BT (12-valve)",
    bore: 4.016,
    topMin: 0.010, topMax: 0.014,
    secondMin: 0.033, secondMax: 0.045,
    oilMin: 0.010, oilMax: 0.022,
    notes: "The large second ring gap (0.033\u20130.045\") is intentional — Cummins uses a ~3:1 second-to-top ratio to equalize inter-ring pressures and aid oil control. Do NOT close the second ring gap to gasoline specs.",
  },
  "cummins-59-24v": {
    label: "Cummins 5.9L ISB (24-valve)",
    bore: 4.016,
    topMin: 0.010, topMax: 0.014,
    secondMin: 0.033, secondMax: 0.045,
    oilMin: 0.010, oilMax: 0.022,
    notes: "Same ring gap specs as the 12-valve 6BT. The 24V ISB uses identical bore and ring specifications. The massive second ring gap is by design.",
  },
  "cummins-67": {
    label: "Cummins 6.7L ISB (2007.5+)",
    bore: 4.210,
    topMin: 0.012, topMax: 0.018,
    secondMin: 0.035, secondMax: 0.049,
    oilMin: 0.010, oilMax: 0.024,
    notes: "Larger bore than the 5.9L but follows the same diesel ring gap philosophy with a very large second ring gap.",
  },
  "powerstroke-73": {
    label: "Ford / Navistar 7.3L T444E Powerstroke",
    bore: 4.110,
    topMin: 0.014, topMax: 0.024,
    secondMin: 0.062, secondMax: 0.072,
    oilMin: 0.012, oilMax: 0.024,
    notes: "The 7.3L has an extremely large second ring gap (0.062\u20130.072\"). This is one of the most extreme examples of the diesel second-ring philosophy. Navistar designed this to equalize land pressures.",
  },
  "powerstroke-60": {
    label: "Ford 6.0L Powerstroke (VT365)",
    bore: 3.740,
    topMin: 0.011, topMax: 0.031,
    secondMin: 0.056, secondMax: 0.076,
    oilMin: 0.009, oilMax: 0.029,
    notes: "Large second ring gap follows the International / Navistar diesel pattern. Always verify against your specific ring set — aftermarket sets may differ.",
  },
  "powerstroke-64": {
    label: "Ford 6.4L Powerstroke",
    bore: 3.876,
    topMin: 0.012, topMax: 0.028,
    secondMin: 0.055, secondMax: 0.075,
    oilMin: 0.010, oilMax: 0.028,
    notes: "Similar to other Powerstroke engines with a very large second ring gap. Ford/International spec — verify against your ring set.",
  },
  "duramax-66": {
    label: "GM Duramax 6.6L (LBZ / LLY / LML / L5P)",
    bore: 4.055,
    topMin: 0.012, topMax: 0.020,
    secondMin: 0.018, secondMax: 0.028,
    oilMin: 0.010, oilMax: 0.020,
    notes: "Duramax uses a smaller second ring gap than Cummins or Powerstroke, but it is still larger than the top ring. Check your specific generation — early and late Duramax have slightly different specs.",
  },
};

// ── Multiplier Table (gasoline applications) ──────────────────────────────────

const multiplierTable: Record<Application, MultiplierRow> = {
  "stock":          { top: 0.0035, second: 0.0045, oilMin: 0.015 },
  "perf-na":        { top: 0.0040, second: 0.0050, oilMin: 0.015 },
  "high-na":        { top: 0.0045, second: 0.0050, oilMin: 0.015 },
  "nitrous-50":     { top: 0.0055, second: 0.0060, oilMin: 0.015 },
  "nitrous-150":    { top: 0.0060, second: 0.0065, oilMin: 0.015 },
  "nitrous-250":    { top: 0.0070, second: 0.0075, oilMin: 0.015 },
  "turbo-10":       { top: 0.0050, second: 0.0055, oilMin: 0.015 },
  "turbo-20":       { top: 0.0055, second: 0.0060, oilMin: 0.015 },
  "turbo-20plus":   { top: 0.0065, second: 0.0070, oilMin: 0.015 },
  "sc-roots":       { top: 0.0055, second: 0.0060, oilMin: 0.015 },
  "sc-centrifugal": { top: 0.0060, second: 0.0065, oilMin: 0.015 },
  "diesel":         { top: 0.0060, second: 0.0070, oilMin: 0.015 },
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
  "diesel":         "Diesel (select engine below)",
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

function getWarnings(app: Application, mat: RingMaterial, bore: number, dieselEngine: DieselEngine): Warning[] {
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

  // Diesel with generic preset
  if (app === "diesel" && dieselEngine === "generic") {
    warnings.push({
      level: "yellow",
      message: "Generic diesel multipliers are a rough guideline only. Diesel engines often have vastly different ring gap specs than gasoline engines \u2014 the second ring gap is typically 2\u20134x larger than the top ring. Always use your engine's OEM service manual specs.",
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
  const [bore, setBore] = useBuildField("machineWork.finalBore", "4.030");
  const { activeBuild, setField: setBuildField } = useBuildContext();
  const [boreMm, setBoreMm] = useState("");
  const [boreUnits, setBoreUnits] = useState<"in" | "mm">("in");
  const [app, setApp] = useState<Application>("perf-na");
  const [material, setMaterial] = useState<RingMaterial>("moly");
  const [dieselEngine, setDieselEngine] = useState<DieselEngine>("generic");
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

  // Auto-fill bore when a specific diesel engine is selected
  useEffect(() => {
    if (app === "diesel" && dieselEngine !== "generic") {
      const preset = dieselPresets[dieselEngine];
      if (preset.bore > 0) {
        setBore(preset.bore.toFixed(4));
        setBoreMm((preset.bore * 25.4).toFixed(2));
      }
    }
  }, [dieselEngine]);

  const b = parseFloat(bore) || 0;

  // Determine if we're using a specific diesel preset with absolute specs
  const isDieselPreset = app === "diesel" && dieselEngine !== "generic";
  const activeDieselPreset = isDieselPreset ? dieselPresets[dieselEngine] : null;

  // Calculate gaps
  let topGap: number;
  let secondGap: number;
  let oilGapMin: number;
  let topGapLabel: string;
  let secondGapLabel: string;
  let oilGapLabel: string;

  if (activeDieselPreset) {
    // Diesel preset: use absolute OEM specs (not per-inch multipliers)
    topGap = (activeDieselPreset.topMin + activeDieselPreset.topMax) / 2;
    secondGap = (activeDieselPreset.secondMin + activeDieselPreset.secondMax) / 2;
    oilGapMin = activeDieselPreset.oilMin;
    topGapLabel = `${formatInches(activeDieselPreset.topMin)}" \u2013 ${formatInches(activeDieselPreset.topMax)}"`;
    secondGapLabel = `${formatInches(activeDieselPreset.secondMin)}" \u2013 ${formatInches(activeDieselPreset.secondMax)}"`;
    oilGapLabel = `${formatInches(activeDieselPreset.oilMin)}" \u2013 ${formatInches(activeDieselPreset.oilMax)}"`;
  } else {
    // Gasoline / generic diesel: use per-inch multipliers
    const topMult = topOverride ?? defaults.top;
    const secondMult = secondOverride ?? defaults.second;
    const effectiveSecondMult = Math.max(secondMult, topMult);

    topGap = b * topMult;
    secondGap = b * effectiveSecondMult;
    oilGapMin = defaults.oilMin; // flat minimum, NOT multiplied by bore
    topGapLabel = "";
    secondGapLabel = "";
    oilGapLabel = "";
  }

  // Enforce minimum practical gap
  const minPracticalGap = 0.010;

  const warnings = useMemo(() => getWarnings(app, material, b, dieselEngine), [app, material, b, dieselEngine]);

  // Small gap warning
  const smallGapWarning = topGap > 0 && topGap < minPracticalGap;

  // Write computed ring gaps back to active build
  useEffect(() => {
    if (activeBuild && topGap > 0) {
      setBuildField("computed.ringGapTop", topGap.toFixed(4));
      setBuildField("computed.ringGapSecond", secondGap.toFixed(4));
    }
  }, [topGap, secondGap, activeBuild?.id]);

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
        canonical="/calculators/ring-gap-advanced"
        keywords="piston ring gap calculator, advanced ring gap, turbo ring gap, nitrous ring gap, diesel ring gap, cummins ring gap, powerstroke ring gap, duramax ring gap, ring material, file ring gap"
      />

      <BuildBanner savedFields={[
        { label: "Top Ring Gap", key: "computed.ringGapTop", value: topGap > 0 ? topGap.toFixed(4) : "", suffix: "\"" },
        { label: "Second Ring Gap", key: "computed.ringGapSecond", value: secondGap > 0 ? secondGap.toFixed(4) : "", suffix: "\"" },
      ]} />
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

            {/* Diesel Engine Selector — only shown when diesel is selected */}
            {app === "diesel" && (
              <div className="space-y-1">
                <Label>Diesel Engine</Label>
                <Select value={dieselEngine} onValueChange={(v) => setDieselEngine(v as DieselEngine)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generic">Generic diesel (use multipliers)</SelectItem>
                    <SelectItem value="cummins-59-12v">Cummins 5.9L 6BT (12-valve)</SelectItem>
                    <SelectItem value="cummins-59-24v">Cummins 5.9L ISB (24-valve)</SelectItem>
                    <SelectItem value="cummins-67">Cummins 6.7L ISB (2007.5+)</SelectItem>
                    <SelectItem value="powerstroke-73">Ford 7.3L Powerstroke</SelectItem>
                    <SelectItem value="powerstroke-60">Ford 6.0L Powerstroke</SelectItem>
                    <SelectItem value="powerstroke-64">Ford 6.4L Powerstroke</SelectItem>
                    <SelectItem value="duramax-66">GM Duramax 6.6L</SelectItem>
                  </SelectContent>
                </Select>
                {activeDieselPreset && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard bore: {activeDieselPreset.bore.toFixed(3)}" ({(activeDieselPreset.bore * 25.4).toFixed(1)} mm)
                  </p>
                )}
              </div>
            )}

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

            {/* Advanced toggle — hidden for diesel presets since they use absolute specs */}
            {!isDieselPreset && (
              <>
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
              </>
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
              {activeDieselPreset ? (
                <>
                  <p className="text-3xl font-bold text-[#E85D04] tabular-nums">{topGapLabel}</p>
                  <p className="text-sm text-gray-400 mt-1">OEM spec</p>
                </>
              ) : boreUnits === "in" ? (
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
              {activeDieselPreset ? (
                <>
                  <p className="text-3xl font-bold text-[#E85D04] tabular-nums">{secondGapLabel}</p>
                  <p className="text-sm text-gray-400 mt-1">OEM spec</p>
                </>
              ) : boreUnits === "in" ? (
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
              {activeDieselPreset ? (
                <>
                  <p className="text-3xl font-bold text-[#E85D04] tabular-nums">{oilGapLabel}</p>
                  <p className="text-sm text-gray-400 mt-1">OEM spec</p>
                </>
              ) : boreUnits === "in" ? (
                <>
                  <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{formatThousandths(oilGapMin)}</p>
                  <p className="text-sm text-gray-400 mt-1">minimum ({formatInches(oilGapMin)}")</p>
                </>
              ) : (
                <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{(oilGapMin * 25.4).toFixed(2)} mm</p>
              )}
              {!activeDieselPreset && (
                <p className="text-xs text-gray-500 mt-2">Minimum gap — oil rails are less critical than compression rings. Do not file the expander.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Diesel Preset Notes ────────────────────────────────────────────── */}
      {activeDieselPreset && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 mb-8">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          <div className="text-sm">
            <p className="font-semibold mb-1">{activeDieselPreset.label}</p>
            <p>{activeDieselPreset.notes}</p>
          </div>
        </div>
      )}

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

      {/* ── Diesel Ring Gap Comparison Table ───────────────────────────────── */}
      {app === "diesel" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Diesel Engine Ring Gap Comparison</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <p className="text-sm text-muted-foreground mb-4">
              Diesel engines use fundamentally different ring gap ratios than gasoline engines. Most diesels run a second ring gap 2&ndash;4x larger than the top ring to equalize inter-ring pressures and aid oil control. <strong>Do not apply gasoline ring gap formulas to diesel engines.</strong>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-semibold">Engine</th>
                  <th className="pb-2 pr-4 font-semibold">Bore</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Top Ring</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Second Ring</th>
                  <th className="pb-2 font-semibold text-right">Oil Ring</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {(Object.keys(dieselPresets) as DieselEngine[]).filter(k => k !== "generic").map(key => {
                  const p = dieselPresets[key];
                  const isActive = key === dieselEngine;
                  return (
                    <tr key={key} className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${isActive ? "bg-[#E85D04]/5 font-medium text-foreground" : ""}`}
                        onClick={() => setDieselEngine(key)}>
                      <td className="py-2 pr-4">{p.label}</td>
                      <td className="py-2 pr-4 font-mono">{p.bore.toFixed(3)}"</td>
                      <td className="py-2 pr-4 text-right font-mono">{p.topMin.toFixed(3)}\u2013{p.topMax.toFixed(3)}"</td>
                      <td className="py-2 pr-4 text-right font-mono">{p.secondMin.toFixed(3)}\u2013{p.secondMax.toFixed(3)}"</td>
                      <td className="py-2 text-right font-mono">{p.oilMin.toFixed(3)}\u2013{p.oilMax.toFixed(3)}"</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
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

          <h3 className="text-sm font-semibold text-foreground mt-6">Oil Ring Rails vs. Compression Rings</h3>
          <p>
            Oil ring rails are responsible for scraping oil off the cylinder wall, not sealing combustion pressure. Their gap is far less critical than compression ring gaps. Most manufacturers (Mahle, Hastings, Wiseco, CP-Carrillo) specify oil rail gap as a flat <strong>0.015" minimum</strong> regardless of bore size — it is not calculated as a per-inch-of-bore multiplier like compression rings. Excessive oil ring gap slightly reduces oil scraping efficiency but does not cause compression loss. Too-tight oil ring gap can cause the same butting/seizure problems as compression rings. The oil ring expander (the wavy spring between the two thin rails) should never be filed — only the thin steel rails get gapped.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-6">Diesel Engines: A Different Animal</h3>
          <p>
            Diesel engines use fundamentally different ring gap ratios than gasoline engines. The standard gasoline formula of "0.004" per inch of bore" does <strong>not</strong> apply to most diesels. Diesel engines typically use a tight top ring and a very large second ring — roughly a 3:1 ratio of second-to-top ring gap. For example, the Cummins 5.9L 6BT specs a top ring of 0.010"–0.014" but a second ring of 0.033"–0.045". The Ford 7.3L Powerstroke is even more extreme: 0.062"–0.072" on the second ring.
          </p>
          <p>
            This is a deliberate design choice. Diesel engines operate at higher compression ratios and temperatures. The large second ring gap equalizes inter-ring pressures, prevents the top ring from being destabilized by trapped pressure, and allows oil to reach the top ring for lubrication (diesel fuel provides no cylinder wall lubrication, unlike gasoline). Engine Professional magazine published a specific technical bulletin warning rebuilders about Cummins ring gaps, because machinists unfamiliar with diesel specs would assume the large second ring gap was an error and try to "correct" it — causing ring failure.
          </p>
        </CardContent>
      </Card>

      {/* ── Multiplier Reference Table ─────────────────────────────────────── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Gasoline Engine Ring Gap Multiplier Reference</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="text-sm text-muted-foreground mb-4">
            Multiplied by bore diameter in inches. Oil rail gap is a flat minimum (not per inch of bore).
          </p>
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
              {(Object.keys(multiplierTable) as Application[]).filter(k => k !== "diesel").map(key => {
                const row = multiplierTable[key];
                const isActive = key === app;
                return (
                  <tr key={key} className={`border-b last:border-0 ${isActive ? "bg-[#E85D04]/5 font-medium text-foreground" : ""}`}>
                    <td className="py-2 pr-4">{applicationLabels[key]}</td>
                    <td className="py-2 pr-4 text-right font-mono">{row.top.toFixed(4)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{row.second.toFixed(4)}</td>
                    <td className="py-2 text-right font-mono">{row.oilMin.toFixed(3)}" min</td>
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
