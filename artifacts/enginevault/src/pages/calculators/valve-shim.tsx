import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Info, Plus, Trash2, AlertTriangle, ArrowRightLeft, CheckCircle } from "lucide-react";

/* ── Constants ───────────────────────────────────────────────────── */

const MM_PER_INCH = 25.4;

type UnitSystem = "mm" | "in";
type OutputMode = "mm" | "in" | "both";
type ShimSource = "standard" | "custom";

interface MyShimEntry {
  id: number;
  value: string;
  unit: UnitSystem;
}

let nextShimId = 1;

/** Generate shim sizes from a range and increment */
function generateShimSizes(min: number, max: number, increment: number): number[] {
  const sizes: number[] = [];
  for (let s = min; s <= max + 0.001; s += increment) {
    sizes.push(Math.round(s * 1000) / 1000);
  }
  return sizes;
}

type ShimIncrement = "0.025" | "0.020" | "0.050" | "0.010";

const SHIM_INCREMENT_OPTIONS: Record<ShimIncrement, { label: string; min: number; max: number; step: number }> = {
  "0.025": { label: "0.025 mm increments", min: 1.200, max: 3.500, step: 0.025 },
  "0.020": { label: "0.020 mm increments", min: 1.200, max: 3.500, step: 0.020 },
  "0.050": { label: "0.050 mm increments", min: 1.200, max: 3.500, step: 0.050 },
  "0.010": { label: "0.010 mm increments", min: 1.200, max: 3.500, step: 0.010 },
};

/** Default standard shim list */
const STANDARD_SHIM_SIZES_MM = generateShimSizes(1.200, 3.500, 0.025);


/* ── Conversion helpers ─────────────────────────────────────────── */

function toMm(value: number, unit: UnitSystem): number {
  return unit === "in" ? value * MM_PER_INCH : value;
}

function fromMm(mm: number, unit: UnitSystem): number {
  return unit === "in" ? mm / MM_PER_INCH : mm;
}

function fmtVal(mm: number, unit: UnitSystem): string {
  if (unit === "in") return (mm / MM_PER_INCH).toFixed(4);
  return mm.toFixed(3);
}

function fmtUnit(unit: UnitSystem): string {
  return unit === "mm" ? "mm" : "in";
}

/** Format a mm value according to the output mode */
function fmtDual(mm: number, mode: OutputMode): string {
  const mmStr = mm.toFixed(3) + " mm";
  const inStr = (mm / MM_PER_INCH).toFixed(4) + " in";
  if (mode === "mm") return mmStr;
  if (mode === "in") return inStr;
  return mmStr + "  /  " + inStr;
}

/* ── Shim math ──────────────────────────────────────────────────── */

/**
 * For both SOB and SUB:
 *   New shim = Current shim − (Measured clearance − Desired clearance)
 *
 * If measured clearance is too large → need THICKER shim (new > current)
 * If measured clearance is too small → need THINNER shim (new < current)
 */
function calcNewShimMm(currentShimMm: number, measuredClearanceMm: number, targetClearanceMm: number): number {
  return currentShimMm - (measuredClearanceMm - targetClearanceMm);
}

function findNearestShim(targetMm: number, shimList?: number[]): { exact: boolean; shimMm: number } | null {
  const list = shimList ?? STANDARD_SHIM_SIZES_MM;
  if (list.length === 0) return null;
  if (targetMm <= 0) return { exact: false, shimMm: list[0] };
  let best = list[0];
  let bestDist = Math.abs(targetMm - best);
  for (const s of list) {
    const dist = Math.abs(targetMm - s);
    if (dist < bestDist) {
      best = s;
      bestDist = dist;
    }
  }
  return { exact: bestDist < 0.001, shimMm: best };
}

function findBracketingShims(targetMm: number): { lower: number | null; upper: number | null } {
  let lower: number | null = null;
  let upper: number | null = null;
  for (const s of STANDARD_SHIM_SIZES_MM) {
    if (s <= targetMm + 0.001) lower = s;
    if (s >= targetMm - 0.001 && upper === null) upper = s;
  }
  return { lower, upper };
}

/* ── Valve row type ────────────────────────────────────────────── */

interface ValveRow {
  id: number;
  label: string;
  side: "intake" | "exhaust";
  measuredClearance: string;
  measuredClearanceUnit: UnitSystem;
  currentShim: string;
  currentShimUnit: UnitSystem;
}

let nextId = 1;
function makeValve(label: string, side: "intake" | "exhaust"): ValveRow {
  return {
    id: nextId++,
    label,
    side,
    measuredClearance: "",
    measuredClearanceUnit: "in",
    currentShim: "",
    currentShimUnit: "mm",
  };
}

/* ── Result type ────────────────────────────────────────────────── */

interface ShimMatch {
  exact: boolean;
  shimMm: number;
  resultingClearanceMm: number;
  inSpec: boolean;
}

interface ValveResult {
  valve: ValveRow;
  measuredMm: number;
  currentShimMm: number;
  targetMm: number;
  newShimMm: number;
  nearestShim: { exact: boolean; shimMm: number };
  bracket: { lower: number | null; upper: number | null };
  resultingClearanceMm: number;
  status: "in-spec" | "tight" | "loose" | "no-shim-available";
  direction: "thicker" | "thinner" | "same";
  bestFromMyShims: ShimMatch | null;
}

/* ── Main component ─────────────────────────────────────────────── */

export default function ValveShimCalculator() {
  /* ── Global settings ── */
  const [outputMode, setOutputMode] = useState<OutputMode>("both");

  /* ── Spec inputs ── */
  const [intakeSpecMin, setIntakeSpecMin] = useState("");
  const [intakeSpecMax, setIntakeSpecMax] = useState("");
  const [exhaustSpecMin, setExhaustSpecMin] = useState("");
  const [exhaustSpecMax, setExhaustSpecMax] = useState("");
  const [specUnit, setSpecUnit] = useState<UnitSystem>("mm");

  /* ── Available shims ── */
  const [shimSource, setShimSource] = useState<ShimSource>("standard");
  const [shimIncrement, setShimIncrement] = useState<ShimIncrement>("0.025");
  const [myShims, setMyShims] = useState<MyShimEntry[]>([]);

  /** Active standard shim list based on selected increment */
  const activeStandardShims = useMemo(() => {
    const opt = SHIM_INCREMENT_OPTIONS[shimIncrement];
    return generateShimSizes(opt.min, opt.max, opt.step);
  }, [shimIncrement]);

  function addMyShim() {
    setMyShims(prev => [...prev, { id: nextShimId++, value: "", unit: "mm" }]);
  }

  function removeMyShim(id: number) {
    setMyShims(prev => prev.filter(s => s.id !== id));
  }

  function updateMyShim(id: number, patch: Partial<MyShimEntry>) {
    setMyShims(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  /** Parse custom shim entries to mm values */
  const myShimsMm = useMemo(() => {
    return myShims
      .map(s => {
        const val = parseFloat(s.value);
        if (!val || val <= 0) return null;
        return toMm(val, s.unit);
      })
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
  }, [myShims]);

  /* ── Valve rows ── */
  const [valves, setValves] = useState<ValveRow[]>(() => [
    makeValve("Intake 1", "intake"),
    makeValve("Intake 2", "intake"),
    makeValve("Exhaust 1", "exhaust"),
    makeValve("Exhaust 2", "exhaust"),
  ]);

  /* ── Valve row CRUD ── */
  function addValve(side: "intake" | "exhaust") {
    const count = valves.filter(v => v.side === side).length;
    const label = side === "intake" ? `Intake ${count + 1}` : `Exhaust ${count + 1}`;
    setValves(prev => [...prev, makeValve(label, side)]);
  }

  function removeValve(id: number) {
    setValves(prev => prev.filter(v => v.id !== id));
  }

  function updateValve(id: number, patch: Partial<ValveRow>) {
    setValves(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
  }

  /* ── Compute results ── */
  const results: ValveResult[] = useMemo(() => {
    const intMinMm = toMm(parseFloat(intakeSpecMin) || 0, specUnit);
    const intMaxMm = toMm(parseFloat(intakeSpecMax) || 0, specUnit);
    const exhMinMm = toMm(parseFloat(exhaustSpecMin) || 0, specUnit);
    const exhMaxMm = toMm(parseFloat(exhaustSpecMax) || 0, specUnit);

    return valves.map(v => {
      const measuredMm = toMm(parseFloat(v.measuredClearance) || 0, v.measuredClearanceUnit);
      const currentShimMm = toMm(parseFloat(v.currentShim) || 0, v.currentShimUnit);

      const specMin = v.side === "intake" ? intMinMm : exhMinMm;
      const specMax = v.side === "intake" ? intMaxMm : exhMaxMm;
      const targetMm = (specMin + specMax) / 2;

      const newShimMm = calcNewShimMm(currentShimMm, measuredMm, targetMm);
      const nearestShimResult = findNearestShim(newShimMm, activeStandardShims);
      const nearestShim = nearestShimResult ?? { exact: false, shimMm: 0 };
      const bracket = findBracketingShims(newShimMm);

      // What clearance would the nearest available shim actually give?
      const resultingClearanceMm = measuredMm - (currentShimMm - nearestShim.shimMm);

      let status: ValveResult["status"] = "in-spec";
      if (resultingClearanceMm < specMin - 0.005) status = "tight";
      else if (resultingClearanceMm > specMax + 0.005) status = "loose";

      if (nearestShim.shimMm < activeStandardShims[0] || nearestShim.shimMm > activeStandardShims[activeStandardShims.length - 1]) {
        status = "no-shim-available";
      }

      const diff = nearestShim.shimMm - currentShimMm;
      let direction: ValveResult["direction"] = "same";
      if (diff > 0.005) direction = "thicker";
      else if (diff < -0.005) direction = "thinner";

      // Best match from user's available shims
      let bestFromMyShims: ShimMatch | null = null;
      if (shimSource === "custom" && myShimsMm.length > 0 && currentShimMm > 0 && measuredMm > 0) {
        const myMatch = findNearestShim(newShimMm, myShimsMm);
        if (myMatch) {
          const myClearance = measuredMm - (currentShimMm - myMatch.shimMm);
          bestFromMyShims = {
            exact: myMatch.exact,
            shimMm: myMatch.shimMm,
            resultingClearanceMm: myClearance,
            inSpec: myClearance >= specMin - 0.005 && myClearance <= specMax + 0.005,
          };
        }
      }

      return { valve: v, measuredMm, currentShimMm, targetMm, newShimMm, nearestShim, bracket, resultingClearanceMm, status, direction, bestFromMyShims };
    });
  }, [valves, intakeSpecMin, intakeSpecMax, exhaustSpecMin, exhaustSpecMax, specUnit, shimSource, myShimsMm, activeStandardShims]);

  /* ── Shim swap suggestions ── */
  const swapSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    // Check if any valve that needs a thicker shim could swap with one that needs thinner
    const needsThicker = results.filter(r => r.direction === "thicker" && r.currentShimMm > 0);
    const needsThinner = results.filter(r => r.direction === "thinner" && r.currentShimMm > 0);

    for (const thick of needsThicker) {
      for (const thin of needsThinner) {
        if (thick.valve.side === thin.valve.side) continue; // only across intake/exhaust
        // Would swapping help? Check if thin's current shim is closer to thick's needed
        const thickNeeds = thick.newShimMm;
        const thinNeeds = thin.newShimMm;
        const thickHas = thick.currentShimMm;
        const thinHas = thin.currentShimMm;

        // If thin's current shim is closer to what thick needs than buying new
        if (Math.abs(thinHas - thickNeeds) < Math.abs(thick.nearestShim.shimMm - thickNeeds) &&
            Math.abs(thickHas - thinNeeds) < Math.abs(thin.nearestShim.shimMm - thinNeeds)) {
          suggestions.push(
            `Consider swapping: ${thick.valve.label} (has ${thickHas.toFixed(3)} mm) ↔ ${thin.valve.label} (has ${thinHas.toFixed(3)} mm) — both get closer to target`
          );
        }
      }
    }
    return suggestions;
  }, [results]);

  /* ── Check if we have enough data for results ── */
  const hasSpecs = (parseFloat(intakeSpecMin) > 0 || parseFloat(exhaustSpecMin) > 0);
  const hasValveData = valves.some(v => parseFloat(v.measuredClearance) > 0 && parseFloat(v.currentShim) > 0);

  /* ── Render helpers ── */
  function statusBadge(status: ValveResult["status"]) {
    switch (status) {
      case "in-spec": return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> In spec</span>;
      case "tight": return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3" /> Slightly tight</span>;
      case "loose": return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3" /> Slightly loose</span>;
      case "no-shim-available": return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3" /> No standard shim</span>;
    }
  }

  function directionBadge(dir: ValveResult["direction"]) {
    switch (dir) {
      case "thicker": return <span className="text-xs font-semibold text-orange-600">↑ Go thicker</span>;
      case "thinner": return <span className="text-xs font-semibold text-blue-600">↓ Go thinner</span>;
      case "same": return <span className="text-xs font-semibold text-green-600">= No change</span>;
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Valve Shim Calculator — Bucket & Shim Clearance Tool | EngineVault"
        description="Calculate replacement valve shim sizes for shim-over-bucket and shim-under-bucket engines. Supports mm and inch inputs, multi-valve entry, shim swap suggestions, and nearest available shim size lookup."
        canonical="/calculators/valve-shim"
        keywords="valve shim calculator, bucket shim calculator, valve clearance calculator, shim over bucket, shim under bucket, motorcycle valve adjustment, valve shim size, OHC valve adjustment"
      />

      <h1 className="text-3xl font-bold mb-2">Valve Shim Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Calculate replacement shim sizes for shim-over-bucket (SOB) and shim-under-bucket (SUB) valvetrains.
        Enter measurements in mm or inches — the calculator handles the conversion.
      </p>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* ── Left column: inputs + results ── */}
        <div className="flex-1 min-w-0 space-y-8">

          {/* ── Engine preset + global settings ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#E85D04]" />
                Engine & Spec Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Clearance Spec</Label>
                  <Select value={specUnit} onValueChange={(v) => setSpecUnit(v as UnitSystem)}>
                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="in">inches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Intake Min ({fmtUnit(specUnit)})</Label>
                    <Input type="number" step="0.001" value={intakeSpecMin} onChange={e => setIntakeSpecMin(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Intake Max ({fmtUnit(specUnit)})</Label>
                    <Input type="number" step="0.001" value={intakeSpecMax} onChange={e => setIntakeSpecMax(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Exhaust Min ({fmtUnit(specUnit)})</Label>
                    <Input type="number" step="0.001" value={exhaustSpecMin} onChange={e => setExhaustSpecMin(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Exhaust Max ({fmtUnit(specUnit)})</Label>
                    <Input type="number" step="0.001" value={exhaustSpecMax} onChange={e => setExhaustSpecMax(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Available shims ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#E85D04]" />
                Available Shims
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Choose standard catalog sizes, or enter the shims you actually have on hand so the calculator picks the best one from your stash.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={shimSource === "custom" ? "custom" : shimIncrement}
                onValueChange={(v) => {
                  if (v === "custom") {
                    setShimSource("custom");
                  } else {
                    setShimSource("standard");
                    setShimIncrement(v as ShimIncrement);
                  }
                }}
              >
                <SelectTrigger className="w-full md:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SHIM_INCREMENT_OPTIONS).map(([key, opt]) => (
                    <SelectItem key={key} value={key}>{opt.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">My Shims (enter what I have)</SelectItem>
                </SelectContent>
              </Select>

              {shimSource === "standard" && (
                <p className="text-xs text-muted-foreground">
                  Range: {SHIM_INCREMENT_OPTIONS[shimIncrement].min.toFixed(3)} – {SHIM_INCREMENT_OPTIONS[shimIncrement].max.toFixed(3)} mm ({activeStandardShims.length} sizes)
                </p>
              )}

              {shimSource === "custom" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">My Shim Inventory</Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#E85D04]" onClick={addMyShim}>
                      <Plus className="w-3 h-3" /> Add Shim
                    </Button>
                  </div>

                  {myShims.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No shims added yet. Click "Add Shim" to enter the shims you have available.</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {myShims.map(s => (
                      <div key={s.id} className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.001"
                          value={s.value}
                          onChange={e => updateMyShim(s.id, { value: e.target.value })}
                          placeholder=""
                          className="h-8 text-sm flex-1"
                        />
                        <Select value={s.unit} onValueChange={(v) => updateMyShim(s.id, { unit: v as UnitSystem })}>
                          <SelectTrigger className="w-14 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mm">mm</SelectItem>
                            <SelectItem value="in">in</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 shrink-0" onClick={() => removeMyShim(s.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {myShimsMm.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {myShimsMm.length} shim{myShimsMm.length !== 1 ? "s" : ""} entered: {myShimsMm.map(s => s.toFixed(3) + " mm").join(", ")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Valve measurements ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Valve Measurements</CardTitle>
                <Select value={outputMode} onValueChange={(v) => setOutputMode(v as OutputMode)}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Results in mm + in</SelectItem>
                    <SelectItem value="mm">Results in mm only</SelectItem>
                    <SelectItem value="in">Results in inches only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Each valve's clearance and shim can use different units. Always mic your current shim — never trust the stamped number.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Intake valves */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Intake Valves</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#E85D04]" onClick={() => addValve("intake")}>
                    <Plus className="w-3 h-3" /> Add Intake
                  </Button>
                </div>
                {valves.filter(v => v.side === "intake").map(v => {
                  const r = results.find(r => r.valve.id === v.id);
                  const specMin = toMm(parseFloat(intakeSpecMin) || 0, specUnit);
                  const specMax = toMm(parseFloat(intakeSpecMax) || 0, specUnit);
                  return <ValveInputRow key={v.id} valve={v} result={r} specMin={specMin} specMax={specMax} outputMode={outputMode} onUpdate={(p) => updateValve(v.id, p)} onRemove={() => removeValve(v.id)} canRemove={valves.filter(x => x.side === "intake").length > 1} />;
                })}
              </div>

              <div className="border-t my-4" />

              {/* Exhaust valves */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Exhaust Valves</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#E85D04]" onClick={() => addValve("exhaust")}>
                    <Plus className="w-3 h-3" /> Add Exhaust
                  </Button>
                </div>
                {valves.filter(v => v.side === "exhaust").map(v => {
                  const r = results.find(r => r.valve.id === v.id);
                  const specMin = toMm(parseFloat(exhaustSpecMin) || 0, specUnit);
                  const specMax = toMm(parseFloat(exhaustSpecMax) || 0, specUnit);
                  return <ValveInputRow key={v.id} valve={v} result={r} specMin={specMin} specMax={specMax} outputMode={outputMode} onUpdate={(p) => updateValve(v.id, p)} onRemove={() => removeValve(v.id)} canRemove={valves.filter(x => x.side === "exhaust").length > 1} />;
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Results ── */}
          {hasSpecs && hasValveData && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Results</h2>

              {/* Per-valve result cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.filter(r => r.currentShimMm > 0 && r.measuredMm > 0).map(r => {
                  const specMin = r.valve.side === "intake"
                    ? toMm(parseFloat(intakeSpecMin) || 0, specUnit)
                    : toMm(parseFloat(exhaustSpecMin) || 0, specUnit);
                  const specMax = r.valve.side === "intake"
                    ? toMm(parseFloat(intakeSpecMax) || 0, specUnit)
                    : toMm(parseFloat(exhaustSpecMax) || 0, specUnit);
                  const clearanceInSpec = r.resultingClearanceMm >= specMin - 0.005 && r.resultingClearanceMm <= specMax + 0.005;
                  const currentInSpec = r.measuredMm >= specMin - 0.005 && r.measuredMm <= specMax + 0.005;

                  return (
                    <Card key={r.valve.id} className="bg-[#1a1a1a] text-white overflow-hidden">
                      {/* Header bar */}
                      <div className={`px-4 py-2 text-sm font-semibold ${r.valve.side === "intake" ? "bg-blue-600" : "bg-red-600"}`}>
                        {r.valve.label} — {r.valve.side === "intake" ? "Intake" : "Exhaust"}
                      </div>

                      <CardContent className="pt-4 space-y-4">
                        {/* Current status */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs">Measured Clearance</p>
                            <p className="font-mono font-bold text-lg">{fmtDual(r.measuredMm, outputMode)}</p>
                            <p className={`text-xs font-semibold mt-0.5 ${currentInSpec ? "text-green-400" : r.measuredMm < specMin ? "text-red-400" : "text-yellow-400"}`}>
                              {currentInSpec ? "Currently in spec" : r.measuredMm < specMin ? "Too tight" : "Too loose"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Current Shim (mic'd)</p>
                            <p className="font-mono font-bold text-lg">{fmtDual(r.currentShimMm, outputMode)}</p>
                          </div>
                        </div>

                        {/* The answer — what shim to buy */}
                        {r.direction === "same" ? (
                          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 text-center">
                            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
                            <p className="text-green-400 font-semibold">No change needed</p>
                            <p className="text-xs text-gray-400">This valve is within spec</p>
                          </div>
                        ) : (
                          <div className="bg-[#E85D04]/10 border border-[#E85D04]/30 rounded-lg p-4">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Replace with</p>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <p className="text-3xl font-bold font-mono text-[#E85D04]">{r.nearestShim.shimMm.toFixed(3)}</p>
                              <p className="text-lg text-gray-400">mm</p>
                              {(outputMode === "both" || outputMode === "in") && (
                                <>
                                  <span className="text-gray-600 text-lg">/</span>
                                  <p className="text-3xl font-bold font-mono text-[#E85D04]">{(r.nearestShim.shimMm / MM_PER_INCH).toFixed(4)}</p>
                                  <p className="text-lg text-gray-400">in</p>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {directionBadge(r.direction)}
                              <span className="text-xs text-gray-400">
                                {r.direction === "thicker"
                                  ? `+${(r.nearestShim.shimMm - r.currentShimMm).toFixed(3)} mm from current`
                                  : `${(r.nearestShim.shimMm - r.currentShimMm).toFixed(3)} mm from current`
                                }
                              </span>
                            </div>
                            {!r.nearestShim.exact && (
                              <p className="text-xs text-gray-500 mt-2">
                                Ideal: {r.newShimMm.toFixed(3)} mm — nearest standard size: {r.nearestShim.shimMm.toFixed(3)} mm
                              </p>
                            )}
                          </div>
                        )}

                        {/* Resulting clearance */}
                        {r.direction !== "same" && (
                          <div className="flex items-center justify-between text-sm border-t border-gray-800 pt-3">
                            <span className="text-gray-400">New clearance with this shim:</span>
                            <div className="text-right">
                              <span className={`font-mono font-bold ${clearanceInSpec ? "text-green-400" : "text-yellow-400"}`}>
                                {fmtDual(r.resultingClearanceMm, outputMode)}
                              </span>
                              <div className="mt-0.5">{statusBadge(r.status)}</div>
                            </div>
                          </div>
                        )}

                        {/* Spec range reminder */}
                        <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
                          Spec: {fmtDual(specMin, outputMode)} – {fmtDual(specMax, outputMode)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Swap suggestions */}
              {swapSuggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
                  <p className="text-sm font-semibold text-blue-800 flex items-center gap-1"><ArrowRightLeft className="w-4 h-4" /> Shim Swap Suggestion</p>
                  {swapSuggestions.map((s, i) => <p key={i} className="text-xs text-blue-700">{s}</p>)}
                </div>
              )}

              {/* Shopping list */}
              {(() => {
                const needed = results.filter(r => r.direction !== "same" && r.currentShimMm > 0 && r.measuredMm > 0);
                if (needed.length === 0) return null;
                const shimCounts: Record<string, { mm: number; count: number }> = {};
                for (const r of needed) {
                  const key = r.nearestShim.shimMm.toFixed(3);
                  if (!shimCounts[key]) shimCounts[key] = { mm: r.nearestShim.shimMm, count: 0 };
                  shimCounts[key].count++;
                }
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Shopping List</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.values(shimCounts).map(({ mm, count }) => (
                          <div key={mm} className="bg-gray-50 border rounded-lg px-4 py-3 text-center">
                            <div className="font-mono text-xl font-bold text-[#E85D04]">{mm.toFixed(3)} mm</div>
                            {(outputMode === "both" || outputMode === "in") && <div className="font-mono text-base font-bold text-[#E85D04]">{(mm / MM_PER_INCH).toFixed(4)} in</div>}
                            <div className="text-sm text-muted-foreground mt-1">Qty: {count}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
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
                <h4 className="font-semibold text-foreground mb-1">The Formula</h4>
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  New Shim = Current Shim − (Measured Gap − Target Gap)
                </p>
                <p className="mt-1 text-xs">
                  If your gap is <span className="font-semibold">too large</span> → you need a <span className="font-semibold text-orange-600">thicker</span> shim.
                  If your gap is <span className="font-semibold">too small</span> → you need a <span className="font-semibold text-blue-600">thinner</span> shim.
                </p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">SOB vs SUB</h4>
                <p className="text-xs"><span className="font-semibold">Shim Over Bucket:</span> Shim sits on top of the bucket. Can swap shims without pulling the cam — use a special tool to depress the bucket.</p>
                <p className="text-xs mt-1"><span className="font-semibold">Shim Under Bucket:</span> Shim sits under the bucket on the valve stem. Must remove camshaft to access shims. More common on modern engines.</p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Unit Tips</h4>
                <p className="text-xs">Specs are almost always in <span className="font-semibold">mm</span>. In the US, most machinists measure clearance with imperial feeler gauges or calipers. This calculator lets you mix units freely — enter each measurement in whatever unit you read it in.</p>
                <p className="text-xs mt-1 font-semibold text-[#E85D04]">1 mm = 0.03937 in</p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Always Mic Your Shims</h4>
                <p className="text-xs">Never trust the number stamped on the shim. Worn, lapped, and aftermarket shims frequently differ from their markings. Use a micrometer to measure the actual thickness of every shim you remove.</p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Measuring Tips</h4>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>Engine must be at TDC on the compression stroke for that cylinder</li>
                  <li>Measure with the engine cold (room temperature)</li>
                  <li>Use feeler gauges — the correct size should slide in with light drag</li>
                  <li>Check each valve twice to confirm your reading</li>
                  <li>If between two feeler gauges, record the larger one</li>
                </ul>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Common Shim Sizes</h4>
                <p className="text-xs">Standard OEM/aftermarket shims (Hot Cams, ProX, Wiseco) come in 0.025 mm increments from 1.200 mm to 3.500 mm. Larger sizes available in 0.050 mm increments above 3.000 mm.</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* ── Educational content ── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Valve Shim Adjustment</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Overhead cam (OHC) engines with bucket-and-shim valvetrains use thin metal discs — shims — to set the clearance between the cam lobe and the bucket (tappet).
            As the valve seat and valve face wear over time, the clearance decreases. This is why exhaust valves tend to tighten faster than intakes — they run hotter and
            the seat wears more aggressively. If left unchecked, tight clearance leads to burned valves, lost compression, and expensive top-end repairs.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">How the Calculation Works</h3>
          <p>
            The formula is the same for both shim-over-bucket and shim-under-bucket designs: <span className="font-mono">New Shim = Current Shim − (Measured Clearance − Desired Clearance)</span>.
            If your measured clearance is larger than the target (loose), the formula yields a number bigger than your current shim — meaning you need a thicker shim to take up the slack.
            If your measured clearance is smaller than the target (tight), you need a thinner shim to restore the gap.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Shim-Over-Bucket vs Shim-Under-Bucket</h3>
          <p>
            <span className="font-semibold">Shim-Over-Bucket (SOB)</span> engines place the shim on top of the bucket, between the cam lobe and the tappet.
            The advantage is that you can change shims with a special depressor tool without removing the camshaft — you push the bucket down, slide the shim out with a magnet or pick, and drop the new one in.
            This makes SOB engines much faster to adjust. Most early Japanese sportbikes and many dirt bikes (Yamaha YZ/WR, Honda CRF, Kawasaki KX, Suzuki RM-Z) use SOB designs.
          </p>
          <p>
            <span className="font-semibold">Shim-Under-Bucket (SUB)</span> engines place the shim under the bucket, sitting directly on the valve stem tip.
            To change a shim, you must remove the camshaft, lift out the bucket, swap the shim, and reassemble. This is significantly more labor-intensive, which makes getting the calculation right
            the first time even more important. Most modern sportbikes (Yamaha R6/R1, Honda CBR, Kawasaki ZX) and many automotive OHC engines (Toyota, Honda K-series, Subaru) use SUB designs.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Common Mistakes to Avoid</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-semibold">Trusting the stamped number:</span> Shims wear. The number stamped on the shim is the nominal size when it was manufactured. Always measure the actual thickness with a micrometer.</li>
            <li><span className="font-semibold">Mixing units:</span> Service manuals give specs in mm. American machinists often measure with imperial tools. Converting in your head is where most math errors happen — let the calculator handle it.</li>
            <li><span className="font-semibold">Getting the sign wrong:</span> A bigger gap needs a thicker shim. A smaller gap needs a thinner shim. The formula handles this automatically, but it's the most common hand-calculation error.</li>
            <li><span className="font-semibold">Not measuring at TDC:</span> If the cam lobe is pushing on the bucket at all, your clearance reading will be wrong. Rotate to TDC on the compression stroke for the cylinder you're checking.</li>
            <li><span className="font-semibold">Measuring hot:</span> Clearance specs assume a cold engine (room temperature). Measuring a warm engine gives inaccurate readings — thermal expansion changes the clearance.</li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4">Shim Swapping Strategy</h3>
          <p>
            Before ordering new shims, check whether you can swap shims between valves to get multiple valves into spec at once. For example, if one intake valve needs a thicker shim and one exhaust valve needs a thinner shim,
            the existing shims might be a better match swapped. This calculator checks for viable swaps automatically and suggests them when found. This can save you money and a second trip to the parts counter.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Valve input row sub-component ─────────────────────────────── */

function ValveInputRow({
  valve,
  result,
  specMin,
  specMax,
  outputMode,
  onUpdate,
  onRemove,
  canRemove,
}: {
  valve: ValveRow;
  result?: ValveResult;
  specMin: number;
  specMax: number;
  outputMode: OutputMode;
  onUpdate: (patch: Partial<ValveRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const hasData = result && result.measuredMm > 0 && result.currentShimMm > 0 && specMax > 0;
  const clearanceInSpec = hasData ? (result.resultingClearanceMm >= specMin - 0.005 && result.resultingClearanceMm <= specMax + 0.005) : false;

  return (
    <div className="rounded-lg border bg-gray-50/50 overflow-hidden">
      {/* Input row */}
      <div className="flex flex-wrap items-end gap-3 p-3">
        {/* Label */}
        <div className="space-y-1 w-24">
          <Label className="text-xs text-muted-foreground">Label</Label>
          <Input
            value={valve.label}
            onChange={e => onUpdate({ label: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        {/* Measured clearance */}
        <div className="space-y-1 flex-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Measured Clearance</Label>
          <div className="flex gap-1">
            <Input
              type="number"
              step="0.0001"
              value={valve.measuredClearance}
              onChange={e => onUpdate({ measuredClearance: e.target.value })}
              placeholder=""
              className="h-8 text-sm flex-1"
            />
            <Select value={valve.measuredClearanceUnit} onValueChange={(v) => onUpdate({ measuredClearanceUnit: v as UnitSystem })}>
              <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">mm</SelectItem>
                <SelectItem value="in">in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current shim */}
        <div className="space-y-1 flex-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Current Shim (mic'd)</Label>
          <div className="flex gap-1">
            <Input
              type="number"
              step="0.001"
              value={valve.currentShim}
              onChange={e => onUpdate({ currentShim: e.target.value })}
              placeholder=""
              className="h-8 text-sm flex-1"
            />
            <Select value={valve.currentShimUnit} onValueChange={(v) => onUpdate({ currentShimUnit: v as UnitSystem })}>
              <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">mm</SelectItem>
                <SelectItem value="in">in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Remove */}
        {canRemove && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* ── Inline result — always visible ── */}
      <div className={`px-3 py-2 border-t flex items-center justify-between gap-4 ${
        !hasData
          ? "bg-gray-100 text-gray-400"
          : result!.direction === "same"
            ? "bg-green-50"
            : "bg-[#1a1a1a] text-white"
      }`}>
        {!hasData ? (
          /* Waiting state */
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider">Replace with</span>
            <span className="text-xl font-bold font-mono">—</span>
            <span className="text-xs">Enter clearance and shim above</span>
          </div>
        ) : result!.direction === "same" ? (
          /* In spec */
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">In spec — no shim change needed</span>
            <span className="text-xs text-green-600 font-mono">({fmtDual(result!.measuredMm, outputMode)})</span>
          </div>
        ) : (
          /* Needs new shim */
          <>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">Replace with</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold font-mono text-[#E85D04]">{result!.nearestShim.shimMm.toFixed(3)}</span>
                  <span className="text-sm text-gray-400">mm</span>
                  {(outputMode === "both" || outputMode === "in") && (
                    <>
                      <span className="text-gray-600 text-sm">/</span>
                      <span className="text-2xl font-bold font-mono text-[#E85D04]">{(result!.nearestShim.shimMm / MM_PER_INCH).toFixed(4)}</span>
                      <span className="text-sm text-gray-400">in</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs space-y-0.5">
                {result!.direction === "thicker"
                  ? <span className="text-orange-400 font-semibold">↑ Thicker</span>
                  : <span className="text-blue-400 font-semibold">↓ Thinner</span>
                }
                <p className="text-gray-500">
                  {result!.direction === "thicker" ? "+" : ""}{(result!.nearestShim.shimMm - result!.currentShimMm).toFixed(3)} mm
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p className="text-gray-400">New clearance</p>
              <p className={`font-mono font-bold text-base ${clearanceInSpec ? "text-green-400" : "text-yellow-400"}`}>
                {fmtDual(result!.resultingClearanceMm, outputMode)}
              </p>
              <p className="text-gray-500">Spec: {fmtDual(specMin, outputMode)} – {fmtDual(specMax, outputMode)}</p>
            </div>
          </>
        )}
      </div>

      {/* ── Best from my shims ── */}
      {hasData && result!.bestFromMyShims && result!.direction !== "same" && (
        <div className={`px-3 py-2 border-t flex items-center justify-between gap-4 ${
          result!.bestFromMyShims.inSpec
            ? "bg-green-900 text-white"
            : "bg-gray-800 text-white"
        }`}>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider leading-none mb-0.5" style={{ color: result!.bestFromMyShims.inSpec ? "#86efac" : "#9ca3af" }}>
                {result!.bestFromMyShims.inSpec ? "✓ Best from your shims" : "Closest from your shims"}
              </p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-2xl font-bold font-mono ${result!.bestFromMyShims.inSpec ? "text-green-300" : "text-yellow-300"}`}>
                  {result!.bestFromMyShims.shimMm.toFixed(3)}
                </span>
                <span className="text-sm text-gray-400">mm</span>
                {(outputMode === "both" || outputMode === "in") && (
                  <>
                    <span className="text-gray-600 text-sm">/</span>
                    <span className={`text-2xl font-bold font-mono ${result!.bestFromMyShims.inSpec ? "text-green-300" : "text-yellow-300"}`}>
                      {(result!.bestFromMyShims.shimMm / MM_PER_INCH).toFixed(4)}
                    </span>
                    <span className="text-sm text-gray-400">in</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="text-gray-400">Clearance with this shim</p>
            <p className={`font-mono font-bold text-base ${result!.bestFromMyShims.inSpec ? "text-green-300" : "text-yellow-300"}`}>
              {fmtDual(result!.bestFromMyShims.resultingClearanceMm, outputMode)}
            </p>
            {!result!.bestFromMyShims.inSpec && (
              <p className="text-yellow-400 text-[10px]">Outside spec — order recommended size above</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
