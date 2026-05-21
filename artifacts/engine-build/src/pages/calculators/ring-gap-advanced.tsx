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
import { useRingGapSpecs, useRingGapMultipliers, useGasEngineRingRefs, type RingGapSpec, type RingGapMultiplier } from "@/hooks/useEngineData";
import { useDefaultPlatform } from "@/hooks/useDefaultPlatform";
import { PresetBar } from "@/components/presets/PresetBar";

// ── Types ──────────────────────────────────────────────────────────────────────

type FuelType = "gas" | "diesel";
type RingMaterial = "cast-iron" | "moly" | "steel" | "stainless";
type PistonMaterial = "cast" | "hypereutectic" | "forged-4032" | "forged-2618" | "billet";

interface MultiplierRow {
  top: number;
  second: number;
  oilMin: number;
}

const pistonMaterialLabels: Record<PistonMaterial, string> = {
  "cast": "Cast aluminum (stock replacement)",
  "hypereutectic": "Hypereutectic (high-silicon cast \u2014 KB, Speed Pro, etc.)",
  "forged-4032": "Forged 4032 alloy (street/strip)",
  "forged-2618": "Forged 2618 alloy (race / forced induction)",
  "billet": "Billet (4032 or 2618 \u2014 custom)",
};

const pistonMaterialGapFactor: Record<PistonMaterial, number> = {
  "cast": 1.0,
  "hypereutectic": 1.40,   // 40% increase per KB/UEM recommendation
  "forged-4032": 1.0,
  "forged-2618": 1.0,
  "billet": 1.0,
};

const pistonToWallClearance: Record<PistonMaterial, { min: number; max: number; label: string }> = {
  "cast": { min: 0.0010, max: 0.0020, label: "0.001\"-0.002\" \u2014 tight fit, low expansion" },
  "hypereutectic": { min: 0.0008, max: 0.0015, label: "0.0008\"-0.0015\" \u2014 tightest, low expansion (high silicon)" },
  "forged-4032": { min: 0.0020, max: 0.0030, label: "0.002\"-0.003\" \u2014 moderate expansion" },
  "forged-2618": { min: 0.0035, max: 0.0050, label: "0.0035\"-0.005\" \u2014 high expansion, noisier cold" },
  "billet": { min: 0.0020, max: 0.0050, label: "0.002\"-0.005\" \u2014 depends on alloy (4032 or 2618)" },
};

// ── Hardcoded Fallbacks (used when DB data hasn't loaded yet) ─────────────────

const fallbackGasMultipliers: Record<string, MultiplierRow> = {
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
};

const fallbackGasLabels: Record<string, string> = {
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

function getWarnings(fuelType: FuelType, gasApp: string, mat: RingMaterial, bore: number, dieselEngine: string, pistonMat: PistonMaterial): Warning[] {
  const warnings: Warning[] = [];

  if ((gasApp === "nitrous-150" || gasApp === "nitrous-250" || gasApp === "nitrous-350") && mat === "moly") {
    warnings.push({
      level: "red",
      message: "Moly rings not recommended above 150 shot. Plasma coating can flake under thermal shock, scoring the cylinder. Use steel rings.",
    });
  }

  if ((gasApp === "nitrous-250" || gasApp === "nitrous-350" || gasApp === "turbo-20plus" || gasApp === "turbo-race" || gasApp === "top-fuel") && mat === "cast-iron") {
    warnings.push({
      level: "red",
      message: "Cast iron rings lack thermal stability for this application. Steel or stainless required for long-term reliability.",
    });
  }

  if (fuelType === "diesel" && mat === "cast-iron") {
    warnings.push({
      level: "red",
      message: "Cast iron rings lack thermal stability for diesel applications. Steel or stainless required for long-term reliability.",
    });
  }

  if ((gasApp === "turbo-20plus" || gasApp === "turbo-race" || gasApp === "sc-centrifugal") && mat === "moly") {
    warnings.push({
      level: "yellow",
      message: "Consider upgrading to steel rings for best durability at this boost level.",
    });
  }

  if (bore < 3.5 && fuelType === "diesel") {
    warnings.push({
      level: "yellow",
      message: "Unusual combination \u2014 verify this matches your engine. Small-bore diesels typically use specific ring packages from the OEM.",
    });
  }

  if (bore > 4.5 && gasApp === "stock" && fuelType === "gas") {
    warnings.push({
      level: "yellow",
      message: "Large bore with stock/street application produces a large gap. Verify this matches your build \u2014 most big-bore engines are performance builds.",
    });
  }

  if (pistonMat === "hypereutectic" && (gasApp === "nitrous-50" || gasApp === "nitrous-150" || gasApp === "nitrous-250" || gasApp === "turbo-10" || gasApp === "turbo-20" || gasApp === "turbo-20plus" || gasApp === "sc-roots" || gasApp === "sc-centrifugal")) {
    warnings.push({
      level: "red",
      message: "Hypereutectic pistons are NOT recommended for forced induction or nitrous. They fail by shattering (brittle fracture) \u2014 detonation that a forged piston would survive will destroy a hypereutectic piston. Use forged 2618 for boost/nitrous applications.",
    });
  }

  if (pistonMat === "hypereutectic" && gasApp === "high-na") {
    warnings.push({
      level: "yellow",
      message: "Hypereutectic pistons at high compression (10.5:1+) leave little margin for detonation. Consider forged 4032 for reliability. Ring gap has been increased 40% per KB/UEM specifications.",
    });
  }

  if (pistonMat === "cast" && gasApp !== "stock") {
    warnings.push({
      level: "yellow",
      message: "Standard cast pistons are only recommended for stock replacement builds. Consider hypereutectic or forged for any performance application.",
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

// ── Source label helper ───────────────────────────────────────────────────────

function sourceLabel(source: string): string {
  switch (source) {
    case "oem": return "OEM / Factory";
    case "quickserve": return "Cummins QuickServe";
    case "mahle": return "Mahle";
    default: return source;
  }
}

function applicationLabel(application: string): string {
  switch (application) {
    case "stock": return "Stock";
    case "normal-turbo": return "Turbo (street)";
    case "turbo-race": return "Turbo (race)";
    case "stock-diesel": return "Stock Diesel";
    default: return application;
  }
}

function formatThousandths(val: number): string {
  return Math.round(val * 1000).toString();
}

function formatInches(val: number): string {
  return val.toFixed(3);
}

// ── Diesel source card (shows all 3 ring gaps for one source) ────────────────

function DieselSourceCard({ spec }: { spec: RingGapSpec }) {
  const topMin = Number(spec.top_ring_min);
  const topMax = Number(spec.top_ring_max);
  const secondMin = Number(spec.second_ring_min);
  const secondMax = Number(spec.second_ring_max);
  const oilMin = spec.oil_ring_min != null ? Number(spec.oil_ring_min) : null;
  const oilMax = spec.oil_ring_max != null ? Number(spec.oil_ring_max) : null;

  return (
    <Card className="bg-[#1a1a1a] text-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-white">{sourceLabel(spec.source)}</CardTitle>
          <span className="text-xs bg-[#E85D04]/20 text-[#E85D04] px-2 py-0.5 rounded-full font-medium">
            {applicationLabel(spec.application)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Top Ring</p>
          <p className="text-2xl font-bold text-[#E85D04] tabular-nums">
            {formatInches(topMin)}&ndash;{formatInches(topMax)}"
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Second Ring</p>
          <p className="text-2xl font-bold text-[#E85D04] tabular-nums">
            {formatInches(secondMin)}&ndash;{formatInches(secondMax)}"
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Oil Ring</p>
          <p className="text-2xl font-bold text-[#E85D04] tabular-nums">
            {oilMin != null && oilMax != null ? (
              <>{formatInches(oilMin)}&ndash;{formatInches(oilMax)}"</>
            ) : (
              <span className="text-gray-500">&mdash;</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RingGapAdvancedCalculator() {
  const platform = useDefaultPlatform();
  const [bore, setBore] = useBuildField("machineWork.finalBore", platform?.bore ?? "4.030");
  const { activeBuild, setField: setBuildField } = useBuildContext();
  const [boreMm, setBoreMm] = useState("");
  const [boreUnits, setBoreUnits] = useState<"in" | "mm">("in");
  const [fuelType, setFuelType] = useState<FuelType>("gas");
  const [gasApp, setGasApp] = useState("perf-na");
  const [material, setMaterial] = useState<RingMaterial>("moly");
  const [dieselEngine, setDieselEngine] = useState("");
  const [selectedSpecIndex, setSelectedSpecIndex] = useState<number>(0);
  const [pistonMat, setPistonMat] = useState<PistonMaterial>("forged-4032");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Load DB data
  const { data: dbSpecs } = useRingGapSpecs();
  const { data: dbMultipliers } = useRingGapMultipliers();
  const { data: gasEngineRefs } = useGasEngineRingRefs();

  // ── Gas: build multiplier table from DB or fallback ─────────────────────────
  const gasMultiplierTable = useMemo(() => {
    if (dbMultipliers.length === 0) return fallbackGasMultipliers;
    const table: Record<string, MultiplierRow> = {};
    for (const m of dbMultipliers) {
      if (m.fuel_type === "gas") {
        table[m.application] = {
          top: Number(m.top_multiplier),
          second: Number(m.second_multiplier),
          oilMin: Number(m.oil_min),
        };
      }
    }
    for (const [k, v] of Object.entries(fallbackGasMultipliers)) {
      if (!table[k]) table[k] = v;
    }
    return table;
  }, [dbMultipliers]);

  const gasAppLabels = useMemo(() => {
    if (dbMultipliers.length === 0) return fallbackGasLabels;
    const labels: Record<string, string> = {};
    for (const m of dbMultipliers) {
      if (m.fuel_type === "gas") {
        labels[m.application] = m.label;
      }
    }
    for (const [k, v] of Object.entries(fallbackGasLabels)) {
      if (!labels[k]) labels[k] = v;
    }
    return labels;
  }, [dbMultipliers]);

  // ── Diesel: build engine list from DB specs ─────────────────────────────────
  const dieselEngines = useMemo(() => {
    if (dbSpecs.length === 0) return [] as { slug: string; label: string; bore: number }[];
    const seen = new Map<string, { slug: string; label: string; bore: number }>();
    for (const s of dbSpecs) {
      if (!seen.has(s.platform_slug)) {
        seen.set(s.platform_slug, {
          slug: s.platform_slug,
          label: s.engine_label,
          bore: Number(s.bore_in),
        });
      }
    }
    return Array.from(seen.values());
  }, [dbSpecs]);

  // All specs for the selected diesel engine
  const dieselSpecsForEngine = useMemo(() => {
    if (!dieselEngine) return [];
    return dbSpecs.filter(s => s.platform_slug === dieselEngine);
  }, [dbSpecs, dieselEngine]);

  // The actively selected diesel spec
  const activeDieselSpec = useMemo((): RingGapSpec | null => {
    if (fuelType !== "diesel" || !dieselEngine || dieselSpecsForEngine.length === 0) return null;
    return dieselSpecsForEngine[selectedSpecIndex] || dieselSpecsForEngine[0] || null;
  }, [fuelType, dieselEngine, dieselSpecsForEngine, selectedSpecIndex]);

  // Featured specs: OEM (stock) and Mahle (stock by default) shown side-by-side
  // in the main result area so users see both perspectives at a glance.
  const featuredSpecs = useMemo(() => {
    if (fuelType !== "diesel" || dieselSpecsForEngine.length === 0) {
      return { oem: null as RingGapSpec | null, mahle: null as RingGapSpec | null };
    }
    const oem = dieselSpecsForEngine.find(s => s.source === "oem" && s.application === "stock")
      || dieselSpecsForEngine.find(s => s.source === "oem")
      || null;
    // For Mahle, prefer the application matching the currently selected row (so user can
    // switch Mahle to "turbo-race" via the comparison table and see it update here).
    const activeApp = activeDieselSpec?.source === "mahle" ? activeDieselSpec.application : "stock";
    const mahle = dieselSpecsForEngine.find(s => s.source === "mahle" && s.application === activeApp)
      || dieselSpecsForEngine.find(s => s.source === "mahle" && s.application === "stock")
      || dieselSpecsForEngine.find(s => s.source === "mahle")
      || null;
    return { oem, mahle };
  }, [fuelType, dieselSpecsForEngine, activeDieselSpec]);

  const extraSpecCount = useMemo(() => {
    if (fuelType !== "diesel") return 0;
    const shown = new Set<string>();
    if (featuredSpecs.oem) shown.add(`${featuredSpecs.oem.source}-${featuredSpecs.oem.application}`);
    if (featuredSpecs.mahle) shown.add(`${featuredSpecs.mahle.source}-${featuredSpecs.mahle.application}`);
    return dieselSpecsForEngine.filter(s => !shown.has(`${s.source}-${s.application}`)).length;
  }, [fuelType, dieselSpecsForEngine, featuredSpecs]);

  // Advanced override sliders
  const defaults = gasMultiplierTable[gasApp] || fallbackGasMultipliers["perf-na"];
  const [topOverride, setTopOverride] = useState<number | null>(null);
  const [secondOverride, setSecondOverride] = useState<number | null>(null);

  // Reset overrides when gas application changes
  const [lastGasApp, setLastGasApp] = useState(gasApp);
  if (gasApp !== lastGasApp) {
    setLastGasApp(gasApp);
    setTopOverride(null);
    setSecondOverride(null);
  }

  // Auto-fill bore when a specific diesel engine is selected
  useEffect(() => {
    if (fuelType === "diesel" && dieselEngine) {
      const engine = dieselEngines.find(e => e.slug === dieselEngine);
      if (engine && engine.bore > 0) {
        setBore(engine.bore.toFixed(4));
        setBoreMm((engine.bore * 25.4).toFixed(2));
      }
      setSelectedSpecIndex(0);
    }
  }, [dieselEngine]);

  // Auto-select first diesel engine when switching to diesel
  useEffect(() => {
    if (fuelType === "diesel" && !dieselEngine && dieselEngines.length > 0) {
      setDieselEngine(dieselEngines[0].slug);
    }
  }, [fuelType, dieselEngines]);

  const b = parseFloat(bore) || 0;

  // ── Calculate gaps ──────────────────────────────────────────────────────────
  const isDieselWithSpec = fuelType === "diesel" && dieselEngine && activeDieselSpec !== null;

  let topGap: number;
  let secondGap: number;
  let oilGapMin: number;
  let topGapLabel: string;
  let secondGapLabel: string;
  let oilGapLabel: string;

  if (isDieselWithSpec && activeDieselSpec) {
    topGap = (Number(activeDieselSpec.top_ring_min) + Number(activeDieselSpec.top_ring_max)) / 2;
    secondGap = (Number(activeDieselSpec.second_ring_min) + Number(activeDieselSpec.second_ring_max)) / 2;
    oilGapMin = Number(activeDieselSpec.oil_ring_min) || 0.015;
    topGapLabel = `${formatInches(Number(activeDieselSpec.top_ring_min))}" \u2013 ${formatInches(Number(activeDieselSpec.top_ring_max))}"`;
    secondGapLabel = `${formatInches(Number(activeDieselSpec.second_ring_min))}" \u2013 ${formatInches(Number(activeDieselSpec.second_ring_max))}"`;
    const oilMax = Number(activeDieselSpec.oil_ring_max) || oilGapMin;
    oilGapLabel = `${formatInches(oilGapMin)}" \u2013 ${formatInches(oilMax)}"`;
  } else {
    const topMult = topOverride ?? defaults.top;
    const secondMult = secondOverride ?? defaults.second;
    const effectiveSecondMult = Math.max(secondMult, topMult);
    const pmFactor = pistonMaterialGapFactor[pistonMat];
    topGap = b * topMult * pmFactor;
    secondGap = b * effectiveSecondMult * pmFactor;
    oilGapMin = defaults.oilMin;
    topGapLabel = "";
    secondGapLabel = "";
    oilGapLabel = "";
  }

  const minPracticalGap = 0.010;
  const warnings = useMemo(() => getWarnings(fuelType, gasApp, material, b, dieselEngine, pistonMat), [fuelType, gasApp, material, b, dieselEngine, pistonMat]);
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
    if (!isNaN(num) && num > 0) setBoreMm((num * 25.4).toFixed(2));
  }

  function handleBoreMmChange(val: string) {
    setBoreMm(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) setBore((num / 25.4).toFixed(4));
  }

  function copyWorkflow() {
    const text = "Filing ring gaps: step by step\n" + workflowSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Piston Ring Gap Calculator"
        description="Application-specific piston ring end gap calculator for NA, nitrous, turbo, supercharged, and diesel builds. Per-ring outputs, material warnings, and file-gap workflow."
        canonical="/calculators/ring-gap"
        keywords="piston ring gap calculator, advanced ring gap, turbo ring gap, nitrous ring gap, diesel ring gap, cummins ring gap, powerstroke ring gap, duramax ring gap, ring material, file ring gap, piston material, hypereutectic ring gap, forged piston ring gap, 4032 vs 2618, piston to wall clearance"
      />

      <BuildBanner savedFields={[
        { label: "Top Ring Gap", key: "computed.ringGapTop", value: topGap > 0 ? topGap.toFixed(4) : "", suffix: "\"" },
        { label: "Second Ring Gap", key: "computed.ringGapSecond", value: secondGap > 0 ? secondGap.toFixed(4) : "", suffix: "\"" },
      ]} />
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <h1 className="text-3xl font-bold">Piston Ring Gap Calculator</h1>
        <PresetBar
          calcSlug="ring-gap"
          state={{ bore, boreUnits, fuelType, gasApp, material, dieselEngine, pistonMat }}
          onLoad={(s) => {
            if (typeof s.bore === "string") setBore(s.bore);
            if (s.boreUnits === "in" || s.boreUnits === "mm") setBoreUnits(s.boreUnits);
            if (s.fuelType === "gas" || s.fuelType === "diesel") setFuelType(s.fuelType);
            if (typeof s.gasApp === "string") setGasApp(s.gasApp);
            if (typeof s.material === "string") setMaterial(s.material as RingMaterial);
            if (typeof s.dieselEngine === "string") setDieselEngine(s.dieselEngine);
            if (typeof s.pistonMat === "string") setPistonMat(s.pistonMat as PistonMaterial);
          }}
        />
      </div>
      <p className="text-muted-foreground mb-4">
        Application-specific ring gap for every ring position. Covers NA, nitrous, turbo, supercharged, and diesel builds with material compatibility warnings.
      </p>

      {/* ── Liability disclaimer ────────────────────────────────────────────── */}
      <div className="mb-8 p-4 rounded-lg border-2 border-red-300 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div className="text-sm text-red-900">
            <p className="font-bold mb-1">VERIFY EVERY SPEC BEFORE INSTALLATION</p>
            <p>
              The values shown here are compiled from manufacturer service manuals, Mahle Motorsport
              published minimums, Cummins QuickServe, and AERA technical bulletins. <strong>Always
              cross-check against the spec sheet that ships with your actual ring set</strong> &mdash;
              ring designs change, year-specific variations exist, and aftermarket ring sets may have
              their own published gap requirements that differ from OEM. Incorrect ring gap can cause
              ring butting, scored cylinder walls, catastrophic engine damage, or personal injury.
              This calculator is an engineering reference only. Use at your own risk.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      {/* ── Inputs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            {/* Fuel Type Toggle */}
            <div className="space-y-1">
              <Label>Fuel Type</Label>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setFuelType("gas")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    fuelType === "gas"
                      ? "bg-[#E85D04] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Gasoline
                </button>
                <button
                  onClick={() => setFuelType("diesel")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    fuelType === "diesel"
                      ? "bg-[#E85D04] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Diesel
                </button>
              </div>
            </div>

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

            {/* ── Gas: Application selector ─────────────────────────────────── */}
            {fuelType === "gas" && (
              <div className="space-y-1">
                <Label>Application</Label>
                <Select value={gasApp} onValueChange={(v) => setGasApp(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(gasAppLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Diesel: Engine selector ───────────────────────────────────── */}
            {fuelType === "diesel" && (
              <div className="space-y-1">
                <Label>Diesel Engine</Label>
                <Select value={dieselEngine} onValueChange={(v) => setDieselEngine(v)}>
                  <SelectTrigger><SelectValue placeholder="Select an engine..." /></SelectTrigger>
                  <SelectContent>
                    {dieselEngines.map(eng => (
                      <SelectItem key={eng.slug} value={eng.slug}>{eng.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dieselEngine && dieselEngines.find(e => e.slug === dieselEngine) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard bore: {dieselEngines.find(e => e.slug === dieselEngine)!.bore.toFixed(3)}" ({(dieselEngines.find(e => e.slug === dieselEngine)!.bore * 25.4).toFixed(1)} mm)
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

            {/* Piston Material */}
            <div className="space-y-1">
              <Label>Piston Material</Label>
              <Select value={pistonMat} onValueChange={(v) => setPistonMat(v as PistonMaterial)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(pistonMaterialLabels) as PistonMaterial[]).map(key => (
                    <SelectItem key={key} value={key}>{pistonMaterialLabels[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-0.5">
                Piston-to-wall: {pistonToWallClearance[pistonMat].label}
              </p>
            </div>

            {/* Advanced toggle — gas only */}
            {fuelType === "gas" && (
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
        {fuelType === "diesel" && dieselEngine && (featuredSpecs.oem || featuredSpecs.mahle) ? (
          // Diesel: side-by-side OEM vs Mahle source cards
          <div className="lg:col-span-2 space-y-4">
            <div className={`grid grid-cols-1 ${featuredSpecs.oem && featuredSpecs.mahle ? "md:grid-cols-2" : ""} gap-4`}>
              {featuredSpecs.oem && (
                <DieselSourceCard spec={featuredSpecs.oem} />
              )}
              {featuredSpecs.mahle && (
                <DieselSourceCard spec={featuredSpecs.mahle} />
              )}
            </div>
            {extraSpecCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#E85D04]/5 border border-[#E85D04]/20 text-sm">
                <Info className="w-4 h-4 text-[#E85D04] shrink-0" />
                <span><strong>{extraSpecCount}</strong> additional spec{extraSpecCount !== 1 ? "s" : ""} available in the comparison table below (QuickServe, Mahle turbo-street, Mahle turbo-race) &mdash; click any row to apply it.</span>
              </div>
            )}
          </div>
        ) : (
          // Gas (or diesel with no DB data): traditional 3-card layout
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 font-medium">Top Ring Gap</CardTitle>
              </CardHeader>
              <CardContent>
                {boreUnits === "in" ? (
                  <>
                    <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{formatThousandths(topGap)}</p>
                    <p className="text-sm text-gray-400 mt-1">thousandths ({formatInches(topGap)}")</p>
                    {pistonMat === "hypereutectic" && (
                      <p className="text-xs text-yellow-400 mt-1">Includes 40% hypereutectic increase</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{(topGap * 25.4).toFixed(2)} mm</p>
                    {pistonMat === "hypereutectic" && (
                      <p className="text-xs text-yellow-400 mt-1">Includes 40% hypereutectic increase</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 font-medium">Second Ring Gap</CardTitle>
              </CardHeader>
              <CardContent>
                {boreUnits === "in" ? (
                  <>
                    <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{formatThousandths(secondGap)}</p>
                    <p className="text-sm text-gray-400 mt-1">thousandths ({formatInches(secondGap)}")</p>
                    {pistonMat === "hypereutectic" && (
                      <p className="text-xs text-yellow-400 mt-1">Includes 40% hypereutectic increase</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{(secondGap * 25.4).toFixed(2)} mm</p>
                    {pistonMat === "hypereutectic" && (
                      <p className="text-xs text-yellow-400 mt-1">Includes 40% hypereutectic increase</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 font-medium">Oil Rail Gap</CardTitle>
              </CardHeader>
              <CardContent>
                {boreUnits === "in" ? (
                  <>
                    <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{formatThousandths(oilGapMin)}</p>
                    <p className="text-sm text-gray-400 mt-1">minimum ({formatInches(oilGapMin)}")</p>
                  </>
                ) : (
                  <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{(oilGapMin * 25.4).toFixed(2)} mm</p>
                )}
                <p className="text-xs text-gray-500 mt-2">Minimum gap &mdash; oil rails are less critical than compression rings. Do not file the expander.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Diesel: Selected Spec Notes ────────────────────────────────────── */}
      {isDieselWithSpec && activeDieselSpec && activeDieselSpec.notes && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 mb-8">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          <div className="text-sm">
            <p className="font-semibold mb-1">{activeDieselSpec.engine_label} &mdash; {sourceLabel(activeDieselSpec.source)} ({applicationLabel(activeDieselSpec.application)})</p>
            <p>{activeDieselSpec.notes}</p>
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

      {/* ── Diesel: ALL specs for this engine (click to select) ────────────── */}
      {fuelType === "diesel" && dieselEngine && dieselSpecsForEngine.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">All Ring Gap Specs &mdash; {dieselSpecsForEngine[0].engine_label}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <p className="text-sm text-muted-foreground mb-4">
              All available ring gap data for this engine from multiple sources. OEM specs come from the factory service manual, QuickServe from Cummins' online system, and Mahle from aftermarket ring set documentation. <strong>Click any row to apply those specs above.</strong>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-semibold">Source</th>
                  <th className="pb-2 pr-3 font-semibold">Application</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Top Ring</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Second Ring</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Oil Ring</th>
                  <th className="pb-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {dieselSpecsForEngine.map((spec, i) => {
                  const isActive = i === selectedSpecIndex;
                  return (
                    <tr
                      key={i}
                      className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${isActive ? "bg-[#E85D04]/10 font-medium text-foreground" : ""}`}
                      onClick={() => setSelectedSpecIndex(i)}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          {isActive && <div className="w-2 h-2 rounded-full bg-[#E85D04] shrink-0" />}
                          {sourceLabel(spec.source)}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">{applicationLabel(spec.application)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono">{Number(spec.top_ring_min).toFixed(3)}&ndash;{Number(spec.top_ring_max).toFixed(3)}"</td>
                      <td className="py-2.5 pr-3 text-right font-mono">{Number(spec.second_ring_min).toFixed(3)}&ndash;{Number(spec.second_ring_max).toFixed(3)}"</td>
                      <td className="py-2.5 pr-3 text-right font-mono">
                        {spec.oil_ring_min ? `${Number(spec.oil_ring_min).toFixed(3)}\u2013${Number(spec.oil_ring_max).toFixed(3)}"` : "\u2014"}
                      </td>
                      <td className="py-2.5 text-xs max-w-[250px]" title={spec.notes || ""}>{spec.notes || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Gas Engine OEM Reference Table (gas only) ─────────────────────── */}
      {fuelType === "gas" && gasEngineRefs.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Gas Engine OEM Ring Gap Reference</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Factory service manual specs for {gasEngineRefs.length} popular gas platforms. Click a row to load that engine's bore into the calculator above.
              <strong className="text-foreground"> Note:</strong> Most modern builders consider OEM gas specs loose for performance &mdash; use the Mahle multiplier formula above as the primary recommendation.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-semibold">Family</th>
                  <th className="text-left p-2 font-semibold">Engine</th>
                  <th className="text-right p-2 font-semibold">Bore</th>
                  <th className="text-right p-2 font-semibold">OEM Top</th>
                  <th className="text-right p-2 font-semibold">OEM Second</th>
                  <th className="text-right p-2 font-semibold">OEM Oil</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastFamily = "";
                  return gasEngineRefs.map((eng, i) => {
                    const showFamily = eng.family !== lastFamily;
                    lastFamily = eng.family;
                    const fmtRange = (mn: number | null, mx: number | null) =>
                      mn != null && mx != null
                        ? `${Number(mn).toFixed(3)}–${Number(mx).toFixed(3)}"`
                        : "—";
                    return (
                      <tr key={i} className={`border-b last:border-0 cursor-pointer hover:bg-[#E85D04]/5 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                          onClick={() => {
                            setBore(Number(eng.bore_in).toFixed(3));
                            setBoreMm((Number(eng.bore_in) * 25.4).toFixed(2));
                          }}
                          title={`Click to load ${Number(eng.bore_in).toFixed(3)}" bore`}>
                        <td className="p-2 font-semibold text-xs">{showFamily ? eng.family : ""}</td>
                        <td className="p-2">{eng.engine_name}</td>
                        <td className="p-2 text-right font-mono">{Number(eng.bore_in).toFixed(3)}"</td>
                        <td className="p-2 text-right font-mono text-xs">{fmtRange(eng.oem_top_min, eng.oem_top_max)}</td>
                        <td className="p-2 text-right font-mono text-xs">{fmtRange(eng.oem_second_min, eng.oem_second_max)}</td>
                        <td className="p-2 text-right font-mono text-xs">{fmtRange(eng.oem_oil_min, eng.oem_oil_max)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Sources: GM, Ford, Chrysler, Honda, Toyota, Nissan, Mitsubishi, Subaru, BMW factory service manuals.
              Specifications cited where directly verifiable; some entries reflect platform-standard ranges
              widely accepted across the rebuild community. <strong>Always verify against your specific ring set's spec sheet.</strong>
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── How We Calculate / Formula Reference ───────────────────────────── */}
      <Card className="mb-8 border-[#E85D04]/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-[#E85D04]" />
            How We Calculate These Gaps
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Full transparency on where every number comes from. All formulas and sources are documented below.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Gas formula */}
          <div>
            <h3 className="font-bold text-base mb-2">Gas Engines (Mahle Motorsport 2022 Minimums)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              The formula is <code className="bg-gray-100 px-1.5 py-0.5 rounded text-foreground">Gap = Bore (inches) × Multiplier</code> with a flat minimum of 0.015" on the oil rail. Multipliers vary by application:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted text-foreground">
                  <tr>
                    <th className="text-left p-3 font-semibold">Application</th>
                    <th className="text-right p-3 font-semibold">Top Ring</th>
                    <th className="text-right p-3 font-semibold">Second Ring</th>
                    <th className="text-right p-3 font-semibold">Oil Rail</th>
                    <th className="text-right p-3 font-semibold">Example (4.000" bore)</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t"><td className="p-3">High Performance Street NA</td><td className="text-right p-3 font-mono">Bore × 0.0045</td><td className="text-right p-3 font-mono">Bore × 0.0050</td><td className="text-right p-3 font-mono">0.015" min</td><td className="text-right p-3 font-mono text-foreground">0.018" / 0.020" / 0.015"</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-3">Circle Track / Drag NA</td><td className="text-right p-3 font-mono">Bore × 0.0050</td><td className="text-right p-3 font-mono">Bore × 0.0060</td><td className="text-right p-3 font-mono">0.015" min</td><td className="text-right p-3 font-mono text-foreground">0.020" / 0.024" / 0.015"</td></tr>
                  <tr className="border-t"><td className="p-3">Nitrous ≤ 200hp</td><td className="text-right p-3 font-mono">Bore × 0.0060</td><td className="text-right p-3 font-mono">Bore × 0.0060</td><td className="text-right p-3 font-mono">0.015" min</td><td className="text-right p-3 font-mono text-foreground">0.024" / 0.024" / 0.015"</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-3">Nitrous Race 200hp+</td><td className="text-right p-3 font-mono">Bore × 0.0070</td><td className="text-right p-3 font-mono">Bore × 0.0070</td><td className="text-right p-3 font-mono">0.015" min</td><td className="text-right p-3 font-mono text-foreground">0.028" / 0.028" / 0.015"</td></tr>
                  <tr className="border-t"><td className="p-3">Turbo / Supercharger</td><td className="text-right p-3 font-mono">Bore × 0.0060</td><td className="text-right p-3 font-mono">Bore × 0.0060</td><td className="text-right p-3 font-mono">0.015" min</td><td className="text-right p-3 font-mono text-foreground">0.024" / 0.024" / 0.015"</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-3">Turbo / SC Race</td><td className="text-right p-3 font-mono">Bore × 0.0070</td><td className="text-right p-3 font-mono">Bore × 0.0070</td><td className="text-right p-3 font-mono">0.015" min</td><td className="text-right p-3 font-mono text-foreground">0.028" / 0.028" / 0.015"</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Note from Mahle:</strong> "These ring gap recommendations are to be considered minimums, and some kits will come with larger gaps than the minimum listed in the table directly out of the box."
            </p>
            <p className="text-xs mt-2">
              <strong>Source:</strong> <a href="https://www.us.mahle.com/media/usa/motorsports/2022-ring-minimums-&-instructions-2.pdf" target="_blank" rel="noopener" className="text-[#E85D04] hover:underline">Mahle Motorsport 2022 Ring Minimums &amp; Instructions (PDF)</a>
            </p>
          </div>

          {/* Diesel formula */}
          <div className="border-t pt-5">
            <h3 className="font-bold text-base mb-2">Diesel Engines</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Diesel uses a different formula because second ring philosophy varies between manufacturers. Mahle publishes one universal diesel-turbo minimum; OE specs vary widely by year and ring design.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted text-foreground">
                  <tr>
                    <th className="text-left p-3 font-semibold">Source</th>
                    <th className="text-right p-3 font-semibold">Top Ring</th>
                    <th className="text-right p-3 font-semibold">Second Ring</th>
                    <th className="text-right p-3 font-semibold">Oil Rail</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t"><td className="p-3"><strong>Mahle Diesel-Turbocharged</strong> (the recommended minimum for any modified diesel)</td><td className="text-right p-3 font-mono">Bore × 0.0060</td><td className="text-right p-3 font-mono">Bore × 0.0055</td><td className="text-right p-3 font-mono">0.015" min</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-3">Cummins QuickServe Online tolerance</td><td className="text-right p-3 font-mono">.011-.023"</td><td className="text-right p-3 font-mono">.035-.054"</td><td className="text-right p-3 font-mono">.011-.030"</td></tr>
                  <tr className="border-t"><td className="p-3">Cummins OEM Service Manual (varies by year)</td><td className="text-right p-3 font-mono">See AERA TB070424</td><td className="text-right p-3 font-mono">See AERA TB070424</td><td className="text-right p-3 font-mono">.010-.022"</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-3">Ford / Navistar Powerstroke OEM</td><td className="text-right p-3 font-mono">.011-.031"</td><td className="text-right p-3 font-mono">.056-.076"</td><td className="text-right p-3 font-mono">.009-.029"</td></tr>
                  <tr className="border-t"><td className="p-3">GM Duramax OEM (all variants)</td><td className="text-right p-3 font-mono">.010-.020"</td><td className="text-right p-3 font-mono">.029-.039"</td><td className="text-right p-3 font-mono">.009-.020"</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-900">
              <strong>⚠️ Important:</strong> Many experienced Cummins builders consider the OEM/factory spec too tight for any modified application. The Mahle Diesel-Turbocharged minimum (Bore × 0.006 / 0.0055) is widely considered the safer baseline for any build above stock — even daily-driven trucks with stock tunes under heavy load.
            </div>
            <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
              <strong>Race builds:</strong> If you're building a compound-turbo, sled-pull, or competition diesel, follow the gap spec from your ring manufacturer (Diamond, JE, Total Seal, Mahle Motorsport custom) — they'll provide the right number for the specific cylinder pressure and ring design you're using. This calculator's data is for stock-replacement and street-performance rebuilds.
            </div>
            <p className="text-xs mt-3">
              <strong>Sources:</strong>{" "}
              <a href="https://www.us.mahle.com/media/usa/motorsports/2022-ring-minimums-&-instructions-2.pdf" target="_blank" rel="noopener" className="text-[#E85D04] hover:underline">Mahle 2022 PDF</a>,{" "}
              <a href="http://www.engineprofessional.com/TB/TB032315-2.pdf" target="_blank" rel="noopener" className="text-[#E85D04] hover:underline">AERA TB032315 (Cummins B-series part numbers)</a>,{" "}
              <a href="https://www.engineprofessional.com/TB24/TB070424-1.pdf" target="_blank" rel="noopener" className="text-[#E85D04] hover:underline">AERA TB070424 (1998-2004 Cummins)</a>,{" "}
              <a href="http://www.engineprofessional.com/TB/TB092216-2.pdf" target="_blank" rel="noopener" className="text-[#E85D04] hover:underline">AERA TB092216 (4.5/6.7L coating variants)</a>
            </p>
          </div>

          {/* Piston material */}
          <div className="border-t pt-5">
            <h3 className="font-bold text-base mb-2">Piston Material Adjustment</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Per KB Performance and UEM, <strong>hypereutectic pistons get a 40% larger ring gap</strong> than forged or cast aluminum. This is because the top ring land sits closer to the crown on hypereutectic pistons, exposing the ring to more heat. The calculator applies this multiplier automatically when "Hypereutectic" is selected.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 pl-5 list-disc">
              <li>Cast aluminum: 1.0× (no adjustment)</li>
              <li>Hypereutectic: <strong>1.40×</strong></li>
              <li>Forged 4032: 1.0×</li>
              <li>Forged 2618: 1.0×</li>
              <li>Billet: 1.0×</li>
            </ul>
          </div>

          {/* Override callout */}
          <div className="border-t pt-5">
            <h3 className="font-bold text-base mb-2">Want to Use Your Own Formula?</h3>
            <p className="text-sm text-muted-foreground">
              In the inputs panel above, click <strong>"Advanced: Override multipliers"</strong> to enter custom top and second ring multipliers. Useful if you have ring-set-specific instructions from your manufacturer (JE, Wiseco, Total Seal, etc.) that differ from the Mahle defaults. The calculator will recalculate using your numbers and show the resulting gaps.
            </p>
          </div>
        </CardContent>
      </Card>

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
              <h4 className="font-semibold text-foreground mb-1">Why Gap Matters</h4>
              <p>Too tight: ring ends butt, buckle outward, break ring lands, score cylinder walls. Too loose: blowby reduces power and pressurizes crankcase.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Power Adders</h4>
              <p>Turbo/nitrous engines see 200-400F higher cylinder temps. Rings expand more and need larger cold gaps to prevent thermal lock-up.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Ring Materials</h4>
              <ul className="space-y-1 mt-1">
                <li><span className="font-medium text-foreground">Cast iron:</span> Stock use only, brittle under load</li>
                <li><span className="font-medium text-foreground">Moly-faced:</span> Good durability, can delaminate under extreme heat</li>
                <li><span className="font-medium text-foreground">Steel/Stainless:</span> Best for boost/nitrous, dimensionally stable</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Oil Rails</h4>
              <p>0.015" minimum flat spec regardless of bore. Not per-inch-of-bore. Never file the expander &mdash; only the thin rails.</p>
            </div>
            {fuelType === "diesel" && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Diesel Difference</h4>
                <p>Diesels use tight top ring + very large second ring (3:1 ratio). Cummins 5.9L: top 0.010-0.014", second 0.033-0.045". Do NOT use gasoline formulas.</p>
              </div>
            )}
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">
                {fuelType === "gas" ? "Gas Engine Multipliers" : "Diesel vs. Gas"}
              </h4>
              {fuelType === "gas" ? (
                <>
                  <ul className="space-y-1 mt-1 text-xs">
                    <li className="flex justify-between"><span>Stock NA top:</span><span className="font-mono">0.0040"/in</span></li>
                    <li className="flex justify-between"><span>Perf NA top:</span><span className="font-mono">0.0045"/in</span></li>
                    <li className="flex justify-between"><span>Turbo/SC top:</span><span className="font-mono">0.0055"/in</span></li>
                    <li className="flex justify-between"><span>Nitrous top:</span><span className="font-mono">0.0060"/in</span></li>
                    <li className="flex justify-between"><span>Oil rails:</span><span className="font-mono">0.015" min</span></li>
                  </ul>
                  <p className="text-xs mt-2 text-gray-500">Multiplied by bore diameter in inches. Oil rail gap is a flat minimum (not per inch of bore). Values shown are base specs for forged pistons &mdash; hypereutectic pistons add ~40% to top and second ring gaps per KB/UEM specifications.</p>
                </>
              ) : (
                <p className="text-xs">Diesel ring gaps use absolute specs from the OEM or ring manufacturer &mdash; not per-inch multipliers. Always use the table for your specific engine.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Piston Ring End Gap Specifications</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Piston ring end gap is the clearance between the two ends of a piston ring when installed in the cylinder bore. This gap exists because rings expand as they heat up during engine operation. If the gap is too tight, the ring ends butt together under thermal expansion &mdash; this is called "ring butting" and it can score the cylinder walls, break the ring lands, or seize the piston. It is one of the most catastrophic and preventable failures in engine building.
          </p>
          <p>
            The standard rule of thumb is 0.004" of gap per inch of bore diameter for naturally aspirated engines, and 0.006" per inch for forced induction (turbo or supercharged). For a 4.030" bore NA street engine, that means 0.016" minimum on the top ring. Most builders target 0.016"-0.020" for the top ring on a street NA application to provide a margin of safety. Second rings are typically gapped 0.002"-0.004" wider than the top ring.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">NA vs. Forced Induction Gaps</h3>
          <p>
            Forced induction engines see significantly higher combustion temperatures, which means more thermal expansion. A turbo 4.030" bore engine needs 0.024"-0.026" on the top ring &mdash; nearly 50% more than the NA spec. Nitrous engines should be gapped even wider, at 0.006"-0.007" per inch. Running too tight a gap on a boosted engine is a guaranteed path to ring butting, scuffed bores, and an expensive teardown. Always file-fit your rings to the actual measured bore diameter of each cylinder, not the nominal size.
          </p>
          {fuelType === "diesel" && (
            <>
              <h3 className="text-sm font-semibold text-foreground mt-4">Diesel Ring Gap Philosophy</h3>
              <p>
                Diesel engines use fundamentally different ring gap ratios than gasoline engines. Most diesels run a second ring gap 2&ndash;4x larger than the top ring to equalize inter-ring pressures and aid oil control. For example, the Cummins 5.9L specifies 0.010-0.014" for the top ring but 0.033-0.045" for the second ring. The 7.3L Powerstroke is even more extreme with a second ring gap of 0.062-0.072". <strong>Do not apply gasoline ring gap multipliers to diesel engines</strong> &mdash; always use your engine's OEM service manual or aftermarket ring manufacturer specs.
              </p>
            </>
          )}
          <h3 className="text-sm font-semibold text-foreground mt-6">Piston Material &amp; Ring Gap: Why It Matters</h3>
          <p>
            Piston material directly affects ring gap requirements, but not in the way most builders expect. Hypereutectic pistons (high-silicon cast aluminum, 16&ndash;19% silicon) have <strong>lower</strong> thermal expansion than forged pistons and run tighter piston-to-wall clearance &mdash; but they need <strong>larger</strong> ring gaps. This is because manufacturers like Keith Black (KB) position the top ring land closer to the piston crown for better combustion sealing. That higher position exposes the ring to significantly more heat, causing greater ring expansion. KB and UEM recommend a flat 40% increase over standard ring gap specs for their hypereutectic pistons. Insufficient ring gap on a hypereutectic piston is especially dangerous because hypereutectics fail by shattering (brittle fracture) rather than deforming like a forged piston.
          </p>
          <p>
            Forged pistons come in two primary alloys: <strong>4032</strong> and <strong>2618</strong>. The 4032 alloy has lower thermal expansion (similar to hypereutectic) and can run tighter piston-to-wall clearance (0.002"&ndash;0.003"), making it quieter on cold start and ideal for street/strip builds. The 2618 alloy expands more and requires 0.0035"&ndash;0.005" clearance, but it is far more ductile &mdash; when pushed past its limit, a 2618 piston deforms rather than shattering. This makes 2618 the standard choice for forced induction, nitrous, and racing applications where detonation events are possible. Both alloys use the same ring gap multipliers; the difference is in piston-to-wall clearance and failure behavior, not ring gap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
