import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import headerSizingContent from "@/data/calculatorContent/header-sizing.mjs";

/* ── Constants ────────────────────────────────────────────────────── */

const STANDARD_PRIMARY_ODS = [1.25, 1.375, 1.5, 1.625, 1.75, 1.875, 2.0, 2.125, 2.25, 2.375, 2.5];
const STANDARD_COLLECTOR_IDS = [2.5, 3.0, 3.5, 4.0];

const WALL_GAUGES: { value: string; label: string; thickness: number }[] = [
  { value: "18ga", label: '18 ga (0.049")', thickness: 0.049 },
  { value: "16ga", label: '16 ga (0.060")', thickness: 0.060 },
  { value: "14ga", label: '14 ga (0.075")', thickness: 0.075 },
];

interface EnginePreset {
  label: string;
  displacement: string;
  cylinders: string;
  torqueRpm: string;
  hpRpm: string;
}

const ENGINE_PRESETS: EnginePreset[] = [
  { label: "SBC 350 Street",   displacement: "350", cylinders: "8", torqueRpm: "4500", hpRpm: "5500" },
  { label: "SBC 383 Stroker",  displacement: "383", cylinders: "8", torqueRpm: "4800", hpRpm: "5800" },
  { label: "BBC 454",          displacement: "454", cylinders: "8", torqueRpm: "4200", hpRpm: "5200" },
  { label: "LS1 5.7L",         displacement: "346", cylinders: "8", torqueRpm: "5000", hpRpm: "6000" },
  { label: "LS3 6.2L",         displacement: "376", cylinders: "8", torqueRpm: "5200", hpRpm: "6200" },
  { label: "SBF 302",          displacement: "302", cylinders: "8", torqueRpm: "4800", hpRpm: "5800" },
  { label: "SBF 351W",         displacement: "351", cylinders: "8", torqueRpm: "4500", hpRpm: "5500" },
  { label: "Inline 4 2.0L",    displacement: "122", cylinders: "4", torqueRpm: "5000", hpRpm: "6500" },
  { label: "Inline 6 4.0L",    displacement: "242", cylinders: "6", torqueRpm: "4000", hpRpm: "5000" },
];

const REFERENCE_TABLE = [
  { engine: "SBC 350 street",  hp: "250-350",  primary: '1-5/8"',         length: '30-34"', collector: '3.0"' },
  { engine: "SBC 350 perf",    hp: "350-450",  primary: '1-3/4"',         length: '28-32"', collector: '3.0-3.5"' },
  { engine: "BBC 454",         hp: "350-500",  primary: '1-7/8"-2"',      length: '32-38"', collector: '3.5"' },
  { engine: "LS1 / LS3",       hp: "350-500",  primary: '1-3/4"-1-7/8"',  length: '30-36"', collector: '3.0-3.5"' },
  { engine: "SBF 302",         hp: "225-300",  primary: '1-5/8"',         length: '28-32"', collector: '2.5-3.0"' },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function snapToNearest(value: number, sizes: number[]): number {
  let closest = sizes[0];
  let minDiff = Math.abs(value - sizes[0]);
  for (const s of sizes) {
    const diff = Math.abs(value - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest;
}

function fractionLabel(od: number): string {
  const fractions: Record<number, string> = {
    1.25: '1-1/4"', 1.375: '1-3/8"', 1.5: '1-1/2"', 1.625: '1-5/8"',
    1.75: '1-3/4"', 1.875: '1-7/8"', 2.0: '2"', 2.125: '2-1/8"',
    2.25: '2-1/4"', 2.375: '2-3/8"', 2.5: '2-1/2"',
    3.0: '3"', 3.5: '3-1/2"', 4.0: '4"',
  };
  return fractions[od] ?? `${od.toFixed(3)}"`;
}

function velocityColor(v: number): string {
  if (v < 200 || v > 400) return "text-red-400";
  if (v >= 240 && v <= 350) return "text-green-400";
  return "text-yellow-400";
}

function velocityLabel(v: number): string {
  if (v < 200) return "Too slow — poor scavenging";
  if (v > 400) return "Too fast — excessive backpressure";
  if (v >= 240 && v <= 350) return "Optimal range";
  if (v < 240) return "Slightly slow — acceptable for mild street";
  return "Slightly fast — acceptable for high-RPM use";
}

/* ── Component ────────────────────────────────────────────────────── */

export default function HeaderSizingCalculator() {
  const [displacement, setDisplacement] = useState("350");
  const [cylinders, setCylinders] = useState("8");
  const [torqueRpm, setTorqueRpm] = useState("4500");
  const [hpRpm, setHpRpm] = useState("5500");
  const [evo, setEvo] = useState("70");
  const [advDuration, setAdvDuration] = useState("");
  const [egt, setEgt] = useState("1200");
  const [ve, setVe] = useState("85");
  const [targetVelocity, setTargetVelocity] = useState("300");
  const [wallGauge, setWallGauge] = useState("16ga");
  const [headerConfig, setHeaderConfig] = useState("4-into-1");
  const [preset, setPreset] = useState("");

  /* ── Derived values ─────────────────────────────────────────────── */

  const numCyl = parseInt(cylinders) || 8;
  const disp = parseFloat(displacement) || 0;
  const rpmTorque = parseFloat(torqueRpm) || 0;
  const rpmHp = parseFloat(hpRpm) || 0;
  const egtF = parseFloat(egt) || 1200;
  const vePercent = parseFloat(ve) || 85;
  const velocity = parseFloat(targetVelocity) || 300;
  const wall = WALL_GAUGES.find(g => g.value === wallGauge)?.thickness ?? 0.060;

  // EVO: use explicit value, or auto-calculate from advertised duration
  const effectiveEvo = (() => {
    const evoVal = parseFloat(evo);
    if (!isNaN(evoVal) && evoVal > 0) return evoVal;
    const dur = parseFloat(advDuration);
    if (!isNaN(dur) && dur > 0) return (dur / 2) - 10;
    return 70; // fallback
  })();

  // Speed of sound in exhaust gas
  const tRankine = egtF + 460;
  const speedOfSound = 49.03 * Math.sqrt(tRankine);

  // Effective exhaust cam duration
  const ecd = 360 - effectiveEvo;

  // Primary tube lengths (2nd, 3rd, 4th harmonics)
  const tubeLength2 = rpmTorque > 0 ? (speedOfSound * ecd) / (2 * rpmTorque * 6) - 3 : 0;
  const tubeLength3 = rpmTorque > 0 ? (speedOfSound * ecd) / (3 * rpmTorque * 6) - 3 : 0;
  const tubeLength4 = rpmTorque > 0 ? (speedOfSound * ecd) / (4 * rpmTorque * 6) - 3 : 0;

  // Primary tube diameter
  const cidPerCyl = numCyl > 0 ? disp / numCyl : 0;
  const area = velocity > 0 ? (cidPerCyl * rpmHp * (vePercent / 100)) / (velocity * 294) : 0;
  const primaryID = Math.sqrt(area * 1.2732);
  const primaryOD = primaryID + 2 * wall;

  // Snap to nearest standard OD
  const snappedOD = snapToNearest(primaryOD, STANDARD_PRIMARY_ODS);
  const snappedID = snappedOD - 2 * wall;
  const snappedArea = (Math.PI / 4) * snappedID * snappedID;
  const actualVelocity = snappedArea > 0 ? (cidPerCyl * rpmHp * (vePercent / 100)) / (snappedArea * 294) : 0;

  // Collector sizing
  const collectorID = 2.0 * primaryID;
  const collectorOD = collectorID + 2 * wall;
  const snappedCollectorID = snapToNearest(collectorID, STANDARD_COLLECTOR_IDS);

  // Tri-Y merge stage 1
  const merge1ID = 1.414 * primaryID;
  const merge1OD = merge1ID + 2 * wall;
  const snappedMerge1ID = snapToNearest(merge1ID, STANDARD_PRIMARY_ODS.concat([2.5, 3.0]));

  // Collector length
  const rawCollectorLength = 0.5 * tubeLength2;
  const collectorLength = Math.max(12, Math.min(18, rawCollectorLength));

  // Bowling's cross-check (V8 only)
  const bowlingLength = numCyl === 8 && rpmHp > 0 && snappedOD > 0
    ? (disp * 1900) / (rpmHp * snappedOD * snappedOD)
    : null;

  const isValid = disp > 0 && rpmTorque > 0 && rpmHp > 0;

  function applyPreset(label: string) {
    setPreset(label);
    const p = ENGINE_PRESETS.find(e => e.label === label);
    if (!p) return;
    setDisplacement(p.displacement);
    setCylinders(p.cylinders);
    setTorqueRpm(p.torqueRpm);
    setHpRpm(p.hpRpm);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Exhaust Header Tube Length & Diameter Calculator | EngineVault"
        description="Calculate optimal exhaust header primary tube length and diameter using acoustic harmonic tuning. Includes collector sizing, standard tube snap, and Bowling's cross-check for V8 engines."
        canonical="/calculators/header-sizing"
        keywords="header tube length calculator, exhaust header sizing, primary tube diameter, header collector sizing, acoustic tuning exhaust, header calculator"
      />

      <h1 className="text-3xl font-bold mb-2">Exhaust Header Tube Length & Diameter Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Calculate optimal primary tube length (acoustic harmonic tuning), tube diameter (flow-based), and collector sizing.
        Results snap to standard tube sizes with velocity cross-checks.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* ── Inputs Card ──────────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            {/* Engine Preset */}
            <div className="space-y-1">
              <Label>Engine Preset (optional)</Label>
              <Select value={preset} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue placeholder="Select a preset..." /></SelectTrigger>
                <SelectContent>
                  {ENGINE_PRESETS.map(p => (
                    <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Displacement */}
            <div className="space-y-1">
              <Label>Engine Displacement (cubic inches)</Label>
              <Input type="number" step="1" value={displacement} onChange={e => setDisplacement(e.target.value)} />
            </div>

            {/* Number of Cylinders */}
            <div className="space-y-1">
              <Label>Number of Cylinders</Label>
              <Select value={cylinders} onValueChange={setCylinders}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["4", "5", "6", "8", "10", "12"].map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Peak Torque RPM */}
            <div className="space-y-1">
              <Label>Peak Torque RPM</Label>
              <Input type="number" step="100" value={torqueRpm} onChange={e => setTorqueRpm(e.target.value)} />
              <p className="text-xs text-muted-foreground">Used for primary tube length calculation</p>
            </div>

            {/* Peak HP RPM */}
            <div className="space-y-1">
              <Label>Peak HP RPM</Label>
              <Input type="number" step="100" value={hpRpm} onChange={e => setHpRpm(e.target.value)} />
              <p className="text-xs text-muted-foreground">Used for primary tube diameter calculation</p>
            </div>

            {/* EVO */}
            <div className="space-y-1">
              <Label>Exhaust Valve Opening (degrees BBDC)</Label>
              <Input type="number" step="1" value={evo} onChange={e => setEvo(e.target.value)} />
              <p className="text-xs text-muted-foreground">If unknown, leave blank and enter advertised exhaust duration below</p>
            </div>

            {/* Advertised Duration */}
            <div className="space-y-1">
              <Label>Advertised Exhaust Duration (optional)</Label>
              <Input type="number" step="1" value={advDuration} onChange={e => setAdvDuration(e.target.value)} placeholder="e.g. 270" />
              <p className="text-xs text-muted-foreground">
                If provided and EVO is blank, auto-calculates: EVO = (duration / 2) - 10
              </p>
            </div>

            {/* EGT */}
            <div className="space-y-1">
              <Label>Exhaust Gas Temperature (°F)</Label>
              <Input type="number" step="50" value={egt} onChange={e => setEgt(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                NA street: 1100-1200 | NA race: 1200-1400 | Turbo: 1400-1600
              </p>
            </div>

            {/* Volumetric Efficiency */}
            <div className="space-y-1">
              <Label>Volumetric Efficiency (%)</Label>
              <Input type="number" step="1" value={ve} onChange={e => setVe(e.target.value)} />
            </div>

            {/* Target Gas Velocity */}
            <div className="space-y-1">
              <Label>Target Gas Velocity (ft/s)</Label>
              <Input type="number" step="10" value={targetVelocity} onChange={e => setTargetVelocity(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Street: 240-300 ft/s | Race: 300-350 ft/s
              </p>
            </div>

            {/* Wall Thickness */}
            <div className="space-y-1">
              <Label>Wall Thickness (gauge)</Label>
              <Select value={wallGauge} onValueChange={setWallGauge}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WALL_GAUGES.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Header Configuration */}
            <div className="space-y-1">
              <Label>Header Configuration</Label>
              <Select value={headerConfig} onValueChange={setHeaderConfig}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4-into-1">4-into-1</SelectItem>
                  <SelectItem value="4-2-1">4-2-1 Tri-Y</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Results Card ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {!isValid ? (
                <p className="text-gray-400">Enter valid displacement and RPM values to see results.</p>
              ) : (
                <>
                  {/* Primary Tube Sizing */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Primary Tube Sizing</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-gray-400">Calculated ID:</span>
                      <span className="font-mono">{primaryID.toFixed(3)}"</span>
                      <span className="text-gray-400">Calculated OD:</span>
                      <span className="font-mono">{primaryOD.toFixed(3)}"</span>
                      <span className="text-gray-400">Nearest Standard OD:</span>
                      <span className="text-2xl font-bold text-primary">{fractionLabel(snappedOD)}</span>
                      <span className="text-gray-400">Standard ID:</span>
                      <span className="font-mono">{snappedID.toFixed(3)}"</span>
                    </div>
                  </div>

                  {/* Actual Gas Velocity */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Gas Velocity at Standard Size</h3>
                    <p className={`text-3xl font-bold ${velocityColor(actualVelocity)}`}>
                      {actualVelocity.toFixed(0)} ft/s
                    </p>
                    <p className={`text-sm ${velocityColor(actualVelocity)}`}>
                      {velocityLabel(actualVelocity)}
                    </p>
                  </div>

                  {/* Tube Lengths */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Primary Tube Lengths</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="font-mono text-lg font-bold">{tubeLength2.toFixed(1)}"</span>
                          <span className="text-gray-400 text-sm ml-2">2nd Harmonic</span>
                        </div>
                        <span className="text-xs text-green-400">Best for long-tube headers</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="font-mono text-lg font-bold">{tubeLength3.toFixed(1)}"</span>
                          <span className="text-gray-400 text-sm ml-2">3rd Harmonic</span>
                        </div>
                        <span className="text-xs text-yellow-400">Mid-length headers</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="font-mono text-lg font-bold">{tubeLength4.toFixed(1)}"</span>
                          <span className="text-gray-400 text-sm ml-2">4th Harmonic</span>
                        </div>
                        <span className="text-xs text-gray-400">Block-hugger / shorty headers</span>
                      </div>
                    </div>
                  </div>

                  {/* Collector Sizing */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Collector Sizing {headerConfig === "4-2-1" ? "(Tri-Y)" : "(4-into-1)"}
                    </h3>
                    {headerConfig === "4-2-1" && (
                      <div className="mb-3 pb-3 border-b border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Merge Stage 1 (pair merge)</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-gray-400">Merge ID:</span>
                          <span className="font-mono">{merge1ID.toFixed(3)}"</span>
                          <span className="text-gray-400">Merge OD:</span>
                          <span className="font-mono">{merge1OD.toFixed(3)}"</span>
                          <span className="text-gray-400">Nearest Standard:</span>
                          <span className="font-bold">{fractionLabel(snappedMerge1ID)}</span>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-400">Collector ID:</span>
                      <span className="font-mono">{collectorID.toFixed(3)}"</span>
                      <span className="text-gray-400">Collector OD:</span>
                      <span className="font-mono">{collectorOD.toFixed(3)}"</span>
                      <span className="text-gray-400">Nearest Standard:</span>
                      <span className="font-bold text-primary">{fractionLabel(snappedCollectorID)}</span>
                      <span className="text-gray-400">Collector Length:</span>
                      <span className="font-mono">{collectorLength.toFixed(1)}"</span>
                    </div>
                  </div>

                  {/* Bowling's Cross-Check */}
                  {bowlingLength !== null && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Cross-Check (V8 Only)</h3>
                      <div className="grid grid-cols-2 gap-x-4 text-sm">
                        <span className="text-gray-400">Bowling's Empirical Length:</span>
                        <span className="font-mono">{bowlingLength.toFixed(1)}"</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Sanity check — should be in the same ballpark as the 2nd harmonic length ({tubeLength2.toFixed(1)}").
                      </p>
                    </div>
                  )}

                  {/* Speed of Sound / ECD info */}
                  <div className="border-t border-gray-700 pt-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Intermediate Values</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Effective EVO:</span>
                      <span>{effectiveEvo.toFixed(0)}° BBDC</span>
                      <span>Exhaust Cam Duration:</span>
                      <span>{ecd.toFixed(0)}° crank</span>
                      <span>Speed of Sound (exhaust):</span>
                      <span>{speedOfSound.toFixed(0)} ft/s</span>
                      <span>CID per Cylinder:</span>
                      <span>{cidPerCyl.toFixed(1)} ci</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Reference Table ────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader><CardTitle>Reference: Common Header Sizes by Engine</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left p-3">Engine</th>
                  <th className="text-right p-3">HP Range</th>
                  <th className="text-right p-3">Primary OD</th>
                  <th className="text-right p-3">Length</th>
                  <th className="text-right p-3">Collector</th>
                </tr>
              </thead>
              <tbody>
                {REFERENCE_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                    <td className="p-3">{row.engine}</td>
                    <td className="text-right p-3">{row.hp}</td>
                    <td className="text-right p-3">{row.primary}</td>
                    <td className="text-right p-3">{row.length}</td>
                    <td className="text-right p-3">{row.collector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CalculatorContent data={headerSizingContent} title="Header Sizing" />
    </div>
  );
}
