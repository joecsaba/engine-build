import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Info } from "lucide-react";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import ignitionTimingContent from "@/data/calculatorContent/ignition-timing-curve.mjs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, ComposedChart, Legend,
} from "recharts";

/* ══════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ══════════════════════════════════════════════════════════════════ */

interface EnginePreset {
  label: string;
  initial: number;
  mechTotal: number;
  mechStartRpm: number;
  mechFullRpm: number;
  vacAdvance: number;
  vacStartInHg: number;
  vacFullInHg: number;
}

const PRESETS: EnginePreset[] = [
  { label: "SBC 350 Mild Street",       initial: 12, mechTotal: 24, mechStartRpm: 800,  mechFullRpm: 2800, vacAdvance: 10, vacStartInHg: 7,  vacFullInHg: 15 },
  { label: "SBC 383 Stroker",           initial: 10, mechTotal: 22, mechStartRpm: 900,  mechFullRpm: 3000, vacAdvance: 12, vacStartInHg: 7,  vacFullInHg: 15 },
  { label: "BBC 454 Street",            initial: 10, mechTotal: 22, mechStartRpm: 800,  mechFullRpm: 2500, vacAdvance: 10, vacStartInHg: 7,  vacFullInHg: 14 },
  { label: "SBF 302 / 5.0",             initial: 12, mechTotal: 22, mechStartRpm: 800,  mechFullRpm: 2800, vacAdvance: 10, vacStartInHg: 7,  vacFullInHg: 15 },
  { label: "LS1 / LS3 (reference)",     initial: 15, mechTotal: 21, mechStartRpm: 800,  mechFullRpm: 3200, vacAdvance: 0,  vacStartInHg: 0,  vacFullInHg: 0  },
  { label: "SBC Hot Street / Cam",      initial: 14, mechTotal: 22, mechStartRpm: 1000, mechFullRpm: 3200, vacAdvance: 8,  vacStartInHg: 8,  vacFullInHg: 15 },
  { label: "Boosted SBC (8 psi)",       initial: 10, mechTotal: 12, mechStartRpm: 800,  mechFullRpm: 2400, vacAdvance: 0,  vacStartInHg: 0,  vacFullInHg: 0  },
  { label: "Boosted LS (10 psi)",       initial: 10, mechTotal: 14, mechStartRpm: 800,  mechFullRpm: 2800, vacAdvance: 0,  vacStartInHg: 0,  vacFullInHg: 0  },
  { label: "Mopar 360 / 340",           initial: 12, mechTotal: 22, mechStartRpm: 800,  mechFullRpm: 2800, vacAdvance: 10, vacStartInHg: 7,  vacFullInHg: 15 },
  { label: "Pontiac 400 / 455",         initial: 10, mechTotal: 24, mechStartRpm: 800,  mechFullRpm: 2600, vacAdvance: 12, vacStartInHg: 7,  vacFullInHg: 14 },
];

const REFERENCE_TABLE = [
  { combo: "Stock 350, 9.0:1, 87 oct",         initial: "8-10",  total: "32-36", vacuum: "8-12",  notes: "Factory-style timing" },
  { combo: "350, 9.5:1, mild cam, 91 oct",      initial: "10-14", total: "34-36", vacuum: "8-12",  notes: "Typical street build" },
  { combo: "383 stroker, 10.0:1, 91 oct",       initial: "12-14", total: "34-36", vacuum: "8-10",  notes: "Watch for knock" },
  { combo: "BBC 454, 8.5:1, mild cam",          initial: "10-12", total: "32-34", vacuum: "10-12", notes: "Low compression = more advance" },
  { combo: "SBF 302, 9.5:1, 91 oct",            initial: "12-14", total: "34-36", vacuum: "8-12",  notes: "" },
  { combo: "LS1 stock, 10.25:1, 91 oct",        initial: "15",    total: "36",    vacuum: "—",     notes: "Electronic, no distributor" },
  { combo: "10:1+, boosted, pump gas",           initial: "8-10",  total: "20-24", vacuum: "—",     notes: "Pull timing under boost" },
  { combo: "9:1 boosted, E85",                   initial: "10-12", total: "26-30", vacuum: "—",     notes: "E85 tolerates more advance" },
  { combo: "High comp NA, 11:1+, race gas",      initial: "14-16", total: "30-34", vacuum: "0-6",   notes: "Fast burn = less needed" },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function parseNum(s: string, fallback: number): number {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : fallback;
}

/** Centrifugal advance as a function of RPM (linear ramp between start and full) */
function mechAdvanceAtRpm(rpm: number, startRpm: number, fullRpm: number, totalDeg: number): number {
  if (rpm <= startRpm) return 0;
  if (rpm >= fullRpm) return totalDeg;
  return totalDeg * (rpm - startRpm) / (fullRpm - startRpm);
}

/**
 * Vacuum advance as a function of manifold vacuum.
 * At WOT, vacuum drops to 0-2 inHg → no vacuum advance.
 * At part throttle / cruise, vacuum is high (12-20 inHg) → full vacuum advance.
 */
function vacAdvanceAtVac(vacInHg: number, startInHg: number, fullInHg: number, totalDeg: number): number {
  if (totalDeg <= 0 || fullInHg <= startInHg) return 0;
  if (vacInHg <= startInHg) return 0;
  if (vacInHg >= fullInHg) return totalDeg;
  return totalDeg * (vacInHg - startInHg) / (fullInHg - startInHg);
}

/* Generate chart data points */
function generateCurveData(
  initial: number,
  mechTotal: number,
  mechStartRpm: number,
  mechFullRpm: number,
  vacAdvanceDeg: number,
  vacStartInHg: number,
  vacFullInHg: number,
) {
  const points: {
    rpm: number;
    wot: number;
    partThrottle: number;
    cruise: number;
    initial: number;
    mechOnly: number;
  }[] = [];

  // RPM steps: every 200 from 0 to 7000
  for (let rpm = 0; rpm <= 7000; rpm += 200) {
    const mech = mechAdvanceAtRpm(rpm, mechStartRpm, mechFullRpm, mechTotal);
    // WOT: ~1 inHg vacuum → essentially no vacuum advance
    const vacWot = vacAdvanceAtVac(1, vacStartInHg, vacFullInHg, vacAdvanceDeg);
    // Part throttle: ~10 inHg vacuum (moderate vacuum advance)
    const vacPart = vacAdvanceAtVac(10, vacStartInHg, vacFullInHg, vacAdvanceDeg);
    // Cruise: ~16 inHg vacuum (full or near-full vacuum advance)
    const vacCruise = vacAdvanceAtVac(16, vacStartInHg, vacFullInHg, vacAdvanceDeg);

    points.push({
      rpm,
      initial: initial,
      mechOnly: Math.round((mech) * 10) / 10,
      wot: Math.round((initial + mech + vacWot) * 10) / 10,
      partThrottle: Math.round((initial + mech + vacPart) * 10) / 10,
      cruise: Math.round((initial + mech + vacCruise) * 10) / 10,
    });
  }
  return points;
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function IgnitionTimingCurveCalculator() {
  // Core state
  const [initial, setInitial] = useState("12");
  const [mechTotal, setMechTotal] = useState("24");
  const [mechStartRpm, setMechStartRpm] = useState("800");
  const [mechFullRpm, setMechFullRpm] = useState("2800");
  const [vacAdvance, setVacAdvance] = useState("10");
  const [vacStartInHg, setVacStartInHg] = useState("7");
  const [vacFullInHg, setVacFullInHg] = useState("15");

  // UI
  const [refOpen, setRefOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Derived
  const ini = parseNum(initial, 12);
  const mt = parseNum(mechTotal, 24);
  const mStart = parseNum(mechStartRpm, 800);
  const mFull = parseNum(mechFullRpm, 2800);
  const va = parseNum(vacAdvance, 10);
  const vs = parseNum(vacStartInHg, 7);
  const vf = parseNum(vacFullInHg, 15);

  const totalWot = ini + mt;
  const totalCruise = ini + mt + va;

  const chartData = useMemo(
    () => generateCurveData(ini, mt, mStart, mFull, va, vs, vf),
    [ini, mt, mStart, mFull, va, vs, vf],
  );

  // Warnings
  const warnings: string[] = [];
  if (totalWot > 40) warnings.push(`Total WOT timing of ${totalWot.toFixed(1)}° is aggressive — verify on the dyno with knock detection.`);
  if (totalCruise > 52) warnings.push(`Total cruise timing of ${totalCruise.toFixed(1)}° is very high — verify manifold vacuum readings.`);
  if (ini < 4) warnings.push("Very low initial timing — engine may be hard to start.");
  if (ini > 20) warnings.push("Very high initial timing — may cause kick-back on start.");
  if (mFull <= mStart) warnings.push("Full-advance RPM must be higher than start RPM.");
  if (mt <= 0 && va <= 0) warnings.push("No mechanical or vacuum advance — timing will be fixed.");

  function applyPreset(idx: string) {
    const p = PRESETS[parseInt(idx)];
    if (!p) return;
    setInitial(String(p.initial));
    setMechTotal(String(p.mechTotal));
    setMechStartRpm(String(p.mechStartRpm));
    setMechFullRpm(String(p.mechFullRpm));
    setVacAdvance(String(p.vacAdvance));
    setVacStartInHg(String(p.vacStartInHg));
    setVacFullInHg(String(p.vacFullInHg));
  }

  return (
    <div>
      <SEOHead
        title="Ignition Timing Advance Curve Calculator"
        description="Visualize your ignition timing advance curve. Input initial timing, centrifugal mechanical advance, and vacuum advance to see total timing vs RPM at WOT, part throttle, and cruise."
        canonical="/calculators/ignition-timing-curve"
        keywords="ignition timing calculator, advance curve, mechanical advance, vacuum advance, total timing, distributor recurve, ignition advance curve, timing curve visualizer"
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        {/* Header */}
        <div>
          <a href="/calculators/power-fuel" className="text-sm text-[#E85D04] hover:underline">&larr; Power, Fuel &amp; Forced Induction</a>
          <h1 className="text-3xl font-bold mt-2">Ignition Timing Advance Curve</h1>
          <p className="text-muted-foreground mt-1">
            Visualize how initial, mechanical (centrifugal), and vacuum advance combine to produce your total timing curve.
            Adjust the inputs below and see the result in real time.
          </p>
        </div>

        {/* Preset selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Engine Preset</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={applyPreset}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Select a starting point..." />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Presets load typical starting-point values. Always verify with a timing light and listen for detonation.
            </p>
          </CardContent>
        </Card>

        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Initial + Mechanical */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Initial &amp; Mechanical Advance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="initial">Initial Timing (degrees BTDC)</Label>
                <Input id="initial" type="number" inputMode="decimal" value={initial} onChange={e => setInitial(e.target.value)} min={0} max={30} step={1} />
                <p className="text-xs text-muted-foreground mt-1">Set with a timing light, distributor locked / mechanical disconnected.</p>
              </div>
              <div>
                <Label htmlFor="mechTotal">Mechanical Advance (total degrees)</Label>
                <Input id="mechTotal" type="number" inputMode="decimal" value={mechTotal} onChange={e => setMechTotal(e.target.value)} min={0} max={40} step={1} />
                <p className="text-xs text-muted-foreground mt-1">Centrifugal advance from weights &amp; springs in the distributor.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mechStartRpm">Advance Starts (RPM)</Label>
                  <Input id="mechStartRpm" type="number" inputMode="numeric" value={mechStartRpm} onChange={e => setMechStartRpm(e.target.value)} min={0} max={5000} step={100} />
                </div>
                <div>
                  <Label htmlFor="mechFullRpm">All-In (RPM)</Label>
                  <Input id="mechFullRpm" type="number" inputMode="numeric" value={mechFullRpm} onChange={e => setMechFullRpm(e.target.value)} min={0} max={6000} step={100} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                "All-in" is the RPM where mechanical advance is fully deployed. Typically 2400-3200 RPM for street engines.
              </p>
            </CardContent>
          </Card>

          {/* Vacuum Advance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Vacuum Advance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vacAdvance">Vacuum Advance (total degrees)</Label>
                <Input id="vacAdvance" type="number" inputMode="decimal" value={vacAdvance} onChange={e => setVacAdvance(e.target.value)} min={0} max={20} step={1} />
                <p className="text-xs text-muted-foreground mt-1">Additional advance from manifold vacuum at part throttle / cruise. Set to 0 for boosted engines or no vacuum canister.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vacStartInHg">Starts At (inHg)</Label>
                  <Input id="vacStartInHg" type="number" inputMode="decimal" value={vacStartInHg} onChange={e => setVacStartInHg(e.target.value)} min={0} max={20} step={1} />
                </div>
                <div>
                  <Label htmlFor="vacFullInHg">Full At (inHg)</Label>
                  <Input id="vacFullInHg" type="number" inputMode="decimal" value={vacFullInHg} onChange={e => setVacFullInHg(e.target.value)} min={0} max={22} step={1} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Manifold vacuum ranges: idle 15-20 inHg, cruise 12-18 inHg, WOT 0-2 inHg. At WOT there is no vacuum advance.
              </p>

              {/* Summary box */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <h4 className="font-semibold text-sm">Timing Summary</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Initial:</span>
                  <span className="font-mono font-semibold">{ini.toFixed(1)}°</span>
                  <span className="text-muted-foreground">+ Mechanical:</span>
                  <span className="font-mono font-semibold">{mt.toFixed(1)}°</span>
                  <span className="text-muted-foreground">= Total WOT:</span>
                  <span className={`font-mono font-bold ${totalWot > 38 ? "text-red-600" : "text-green-700"}`}>{totalWot.toFixed(1)}°</span>
                  <span className="text-muted-foreground">+ Vacuum:</span>
                  <span className="font-mono font-semibold">{va.toFixed(1)}°</span>
                  <span className="text-muted-foreground">= Total Cruise:</span>
                  <span className={`font-mono font-bold ${totalCruise > 50 ? "text-red-600" : "text-green-700"}`}>{totalCruise.toFixed(1)}°</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-800 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Advance Curve — Total Timing vs. RPM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Three scenarios: <strong>WOT</strong> (wide-open throttle, ~0 inHg vacuum — no vacuum advance),{" "}
              <strong>Part Throttle</strong> (~10 inHg — partial vacuum advance), and{" "}
              <strong>Cruise</strong> (~16 inHg — full vacuum advance). The dashed line shows initial timing.
            </p>
            <div className="overflow-x-auto -mx-2">
              <div className="min-w-[540px]">
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="rpm"
                      label={{ value: "Engine RPM", position: "insideBottom", offset: -5, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                    />
                    <YAxis
                      label={{ value: "Degrees BTDC", angle: -90, position: "insideLeft", offset: 5, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                      domain={[0, (dataMax: number) => Math.ceil((dataMax + 4) / 5) * 5]}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          wot: "WOT (no vacuum)",
                          partThrottle: "Part Throttle (~10 inHg)",
                          cruise: "Cruise (~16 inHg)",
                          initial: "Initial Timing",
                        };
                        return [`${value}°`, labels[name] || name];
                      }}
                      labelFormatter={(label: number) => `${label.toLocaleString()} RPM`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    {/* Mechanical all-in reference line */}
                    <ReferenceLine
                      x={mFull}
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      label={{ value: `All-in: ${mFull}`, position: "top", fontSize: 10, fill: "#9ca3af" }}
                    />
                    {/* Initial timing baseline */}
                    <Line
                      type="monotone"
                      dataKey="initial"
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="6 3"
                      dot={false}
                      name="initial"
                    />
                    {/* Cruise (highest — with full vacuum advance) */}
                    {va > 0 && (
                      <Area
                        type="monotone"
                        dataKey="cruise"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="#22c55e"
                        fillOpacity={0.06}
                        dot={false}
                        name="cruise"
                      />
                    )}
                    {/* Part throttle */}
                    {va > 0 && (
                      <Line
                        type="monotone"
                        dataKey="partThrottle"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="partThrottle"
                      />
                    )}
                    {/* WOT (lowest — no vacuum advance) */}
                    <Line
                      type="monotone"
                      dataKey="wot"
                      stroke="#E85D04"
                      strokeWidth={2.5}
                      dot={false}
                      name="wot"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Custom legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-[#E85D04] inline-block" /> WOT (no vacuum)
              </span>
              {va > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 bg-[#3b82f6] inline-block" /> Part Throttle (~10 inHg)
                </span>
              )}
              {va > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 bg-[#22c55e] inline-block" /> Cruise (~16 inHg)
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-gray-400 inline-block" /> Initial Timing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 border-t border-dashed border-gray-400 inline-block" /> Mechanical All-In
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Data table */}
        <Card>
          <CardHeader>
            <CardTitle>Timing by RPM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-semibold">RPM</th>
                    <th className="py-2 pr-4 font-semibold">Mech. Advance</th>
                    <th className="py-2 pr-4 font-semibold">WOT Total</th>
                    {va > 0 && <th className="py-2 pr-4 font-semibold">Part Throttle</th>}
                    {va > 0 && <th className="py-2 pr-4 font-semibold">Cruise</th>}
                  </tr>
                </thead>
                <tbody>
                  {chartData.filter(d => d.rpm % 400 === 0 || d.rpm === 0).map(d => (
                    <tr key={d.rpm} className="border-b border-gray-100">
                      <td className="py-1.5 pr-4 font-mono">{d.rpm.toLocaleString()}</td>
                      <td className="py-1.5 pr-4 font-mono">{d.mechOnly.toFixed(1)}°</td>
                      <td className="py-1.5 pr-4 font-mono font-semibold text-[#E85D04]">{d.wot.toFixed(1)}°</td>
                      {va > 0 && <td className="py-1.5 pr-4 font-mono text-blue-600">{d.partThrottle.toFixed(1)}°</td>}
                      {va > 0 && <td className="py-1.5 pr-4 font-mono text-green-600">{d.cruise.toFixed(1)}°</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setHowOpen(o => !o)}>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChevronDown className={`w-4 h-4 transition-transform ${howOpen ? "rotate-180" : ""}`} />
              How Ignition Advance Works
            </CardTitle>
          </CardHeader>
          {howOpen && (
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>
                <strong>Total ignition timing</strong> is the sum of three components:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Initial timing</strong> — the base advance set at idle with a timing light. This is your starting point, typically 8-16° BTDC for street engines.
                </li>
                <li>
                  <strong>Mechanical (centrifugal) advance</strong> — provided by weights and springs inside the distributor. As RPM increases, the weights swing out and add advance. The spring rate determines how quickly advance comes in.
                  The "all-in" point is the RPM where the weights hit their stops and no more advance is added.
                </li>
                <li>
                  <strong>Vacuum advance</strong> — a diaphragm connected to manifold vacuum adds timing at part throttle and cruise, when the engine is under light load and can tolerate more advance for better efficiency and lower temperatures.
                  At WOT, manifold vacuum drops to near zero, so vacuum advance disappears exactly when you don't want it.
                </li>
              </ul>
              <p>
                <strong>Why it matters:</strong> The air-fuel mixture takes time to burn (roughly 40-60 crank degrees). At higher RPM, the piston moves faster, so the spark must fire earlier (more advance) to reach peak cylinder pressure at the optimal ~14-18° ATDC.
                Too little advance leaves power on the table; too much causes detonation (knock) which can destroy pistons and bearings.
              </p>
              <p>
                <strong>Boosted engines</strong> typically run significantly less total timing (often 18-26° total) because higher cylinder pressures speed up the burn and lower the knock threshold.
                Vacuum advance is not used — there's no manifold vacuum under boost.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Rules of thumb */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setRulesOpen(o => !o)}>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChevronDown className={`w-4 h-4 transition-transform ${rulesOpen ? "rotate-180" : ""}`} />
              Rules of Thumb
            </CardTitle>
          </CardHeader>
          {rulesOpen && (
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>Higher compression ratio = faster burn = less advance needed. ~36° total for 9:1, ~32-34° for 10:1, ~28-30° for 11:1+ on pump gas.</li>
                <li>Mechanical advance should be "all-in" by 2400-3200 RPM for most street engines. If it comes in too late, the engine will feel sluggish mid-range.</li>
                <li>Vacuum advance typically adds 8-15° at cruise, improving fuel economy and reducing exhaust temperatures. It's free power at part throttle.</li>
                <li>MBT (Minimum advance for Best Torque): the optimal timing for peak torque. Going ±5° from MBT costs only ~1% torque, giving a useful tuning window.</li>
                <li>Peak cylinder pressure should occur at 14-18° ATDC for maximum torque output.</li>
                <li>Open-chamber heads (wedge, bathtub) burn slower and typically need 2-4° more advance than comparable closed-chamber or heart-shaped designs.</li>
                <li>E85 and methanol are more knock-resistant — they can tolerate 2-6° more advance than gasoline at the same compression.</li>
                <li>Altitude reduces air density, reducing knock tendency. Some tuners add 1-2° per 2,000 ft of elevation.</li>
                <li><strong>Always start conservative and add timing gradually.</strong> A few degrees less than optimal costs a tiny amount of power; a few degrees too much can destroy an engine.</li>
              </ul>
            </CardContent>
          )}
        </Card>

        {/* Reference table */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setRefOpen(o => !o)}>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChevronDown className={`w-4 h-4 transition-transform ${refOpen ? "rotate-180" : ""}`} />
              Reference: Typical Timing by Engine Combo
            </CardTitle>
          </CardHeader>
          {refOpen && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4 font-semibold">Engine / Combo</th>
                      <th className="py-2 pr-4 font-semibold">Initial</th>
                      <th className="py-2 pr-4 font-semibold">Total WOT</th>
                      <th className="py-2 pr-4 font-semibold">Vacuum</th>
                      <th className="py-2 pr-4 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFERENCE_TABLE.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1.5 pr-4">{r.combo}</td>
                        <td className="py-1.5 pr-4 font-mono">{r.initial}°</td>
                        <td className="py-1.5 pr-4 font-mono">{r.total}°</td>
                        <td className="py-1.5 pr-4 font-mono">{r.vacuum}°</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                These are starting points only. Final timing must be verified on the engine with a timing light,
                knock detection, and ideally dyno tuning. Every combination is different.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          This calculator provides educational starting points only. Incorrect ignition timing can cause severe engine damage.
          Always verify timing with proper instruments and watch for detonation.
        </p>
      </div>

      <CalculatorContent data={ignitionTimingContent} title="Ignition Timing Curve" />
    </div>
  );
}
