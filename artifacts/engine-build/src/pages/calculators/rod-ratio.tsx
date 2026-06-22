import { useState, useEffect, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import { HelpSidebar } from "@/components/calculators/HelpCard";
import rodRatioContent from "@/data/calculatorContent/rod-ratio.mjs";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { BuildBanner } from "@/components/BuildBanner";
import { Info } from "lucide-react";
import { useReferenceEngines } from "@/hooks/useEngineData";
import { useDefaultPlatform } from "@/hooks/useDefaultPlatform";

const commonEngines = [
  { name: "Chevy 350 (SBC)", stroke: "3.480", rod: "5.700", ratio: 1.638 },
  { name: "GM LS1 5.7L", stroke: "3.622", rod: "6.098", ratio: 1.684 },
  { name: "GM LS3 6.2L", stroke: "3.622", rod: "6.098", ratio: 1.684 },
  { name: "GM LS7 7.0L", stroke: "4.000", rod: "6.067", ratio: 1.517 },
  { name: "Chevy 454 (BBC)", stroke: "4.000", rod: "6.535", ratio: 1.634 },
  { name: "Ford 302 Windsor", stroke: "3.000", rod: "5.090", ratio: 1.697 },
  { name: "Ford 351 Windsor", stroke: "3.500", rod: "5.956", ratio: 1.702 },
  { name: "Ford 5.0 Coyote", stroke: "3.661", rod: "5.933", ratio: 1.620 },
  { name: "Honda B16A", stroke: "3.386", rod: "5.394", ratio: 1.594 },
  { name: "Honda K24A", stroke: "3.740", rod: "6.378", ratio: 1.705 },
  { name: "Toyota 2JZ-GTE", stroke: "3.386", rod: "5.709", ratio: 1.687 },
];

function getRatioZone(ratio: number): { label: string; color: string; position: number } {
  const position = Math.max(0, Math.min(100, ((ratio - 1.4) / 0.7) * 100));
  if (ratio < 1.55) return { label: "Low ratio — High side loading, more piston wear", color: "text-orange-600", position };
  if (ratio < 1.65) return { label: "Acceptable — Typical OEM range", color: "text-yellow-600", position };
  if (ratio <= 1.85) return { label: "Ideal range — Good balance of dwell and side load", color: "text-green-600", position };
  if (ratio <= 2.0) return { label: "High ratio — Reduced side loading, smoother piston motion", color: "text-blue-600", position };
  return { label: "Very high ratio — Diminishing returns, packaging issues", color: "text-purple-600", position };
}

// Distance of piston below TDC for a given crank angle (radians).
// Standard slider-crank equation: x(θ) = r(1 - cosθ) + L(1 - √(1 - (r/L)²sin²θ))
// where r = stroke/2 and L = rod length. Returns the same units as stroke/L.
function pistonDisplacement(crankAngleRad: number, stroke: number, rodLength: number): number {
  const r = stroke / 2;
  const L = rodLength;
  const sin = Math.sin(crankAngleRad);
  const cos = Math.cos(crankAngleRad);
  return r * (1 - cos) + L * (1 - Math.sqrt(1 - (r / L) ** 2 * sin ** 2));
}

// Dwell in degrees of crank rotation where the piston stays within
// `thresholdFraction` of stroke from TDC (or BDC). 0.005 = within 0.5% of stroke.
function computeDwell(stroke: number, rodLength: number, thresholdFraction = 0.005) {
  const step = 0.25; // degrees, fine enough for accurate counts
  const threshold = thresholdFraction * stroke;
  let tdc = 0;
  let bdc = 0;
  for (let deg = 0; deg < 360; deg += step) {
    const x = pistonDisplacement((deg * Math.PI) / 180, stroke, rodLength);
    if (x < threshold) tdc += step;
    if (x > stroke - threshold) bdc += step;
  }
  return { tdcDeg: tdc, bdcDeg: bdc };
}

// Build an SVG path string for a piston-position curve over 0-360° crank.
// Y is normalized so 1 = TDC (top) and 0 = BDC (bottom).
function buildCurvePath(stroke: number, rodLength: number, width: number, height: number, samples = 361): string {
  const cmds: string[] = [];
  for (let i = 0; i < samples; i++) {
    const deg = (i / (samples - 1)) * 360;
    const x = pistonDisplacement((deg * Math.PI) / 180, stroke, rodLength);
    const normalized = 1 - x / stroke; // 1 = TDC, 0 = BDC
    const px = (i / (samples - 1)) * width;
    const py = (1 - normalized) * height;
    cmds.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return cmds.join(" ");
}

// Rod angle (degrees, signed) vs crank angle. The rod angle φ from cylinder
// centerline at crank angle θ satisfies sin(φ) = (r/L)·sin(θ). Peak rod
// angle is arcsin(r/L), occurring at θ = 90° and 270°. Side load on the
// piston skirt scales with tan(φ) — so this curve IS the side-load shape,
// just in friendlier units (degrees instead of force ratio).
function computeRodAngleSeries(stroke: number, rodLength: number, samples = 361): number[] {
  const r = stroke / 2;
  const ratio = r / rodLength;
  const angles: number[] = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / (samples - 1)) * 2 * Math.PI;
    const phi = Math.asin(ratio * Math.sin(theta));
    angles.push((phi * 180) / Math.PI); // degrees
  }
  return angles;
}

// Build SVG path for rod-angle / side-load curve. Centered at height/2 (y=0)
// with the +peak (one direction of rod swing) at top and -peak (other
// direction) at bottom. Common-scale normalization so two rod lengths can
// be compared on the same axis.
function buildRodAnglePath(angles: number[], commonMaxAbs: number, width: number, height: number): string {
  const cmds: string[] = [];
  const N = angles.length;
  const scale = (height / 2) * 0.9;
  for (let i = 0; i < N; i++) {
    const px = (i / (N - 1)) * width;
    const normalized = angles[i] / commonMaxAbs; // ~-1 to +1
    const py = height / 2 - normalized * scale;
    cmds.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return cmds.join(" ");
}

// Piston acceleration vs crank angle. Returns d²x/dθ² (units: inches per
// radian²) at each of `samples` crank angles between 0 and 360°.
// Computed via central finite difference of the analytical position function
// — simpler than the closed-form 2nd derivative and well-behaved for plotting.
function computeAccelSeries(stroke: number, rodLength: number, samples = 361): number[] {
  const positions: number[] = [];
  for (let i = 0; i < samples; i++) {
    const deg = (i / (samples - 1)) * 360;
    positions.push(pistonDisplacement((deg * Math.PI) / 180, stroke, rodLength));
  }
  const accels: number[] = [];
  const dtheta = (2 * Math.PI) / (samples - 1);
  const N = samples - 1; // periodic period (sample N = sample 0)
  for (let i = 0; i < samples; i++) {
    const im = (i - 1 + N) % N;
    const ip = (i + 1) % N;
    accels.push((positions[ip] - 2 * positions[i] + positions[im]) / (dtheta * dtheta));
  }
  return accels;
}

// Build SVG path for an acceleration curve. The curve is centered vertically
// at height/2 (the y=0 line) and scaled by `commonMaxAbs` so multiple curves
// can be overlaid on a comparable scale.
function buildAccelPath(accels: number[], commonMaxAbs: number, width: number, height: number): string {
  const cmds: string[] = [];
  const N = accels.length;
  // Use 90% of the half-height so peaks don't touch the chart edges.
  const scale = (height / 2) * 0.9;
  for (let i = 0; i < N; i++) {
    const px = (i / (N - 1)) * width;
    const normalized = accels[i] / commonMaxAbs; // ~-1 to +1
    const py = height / 2 - normalized * scale;
    cmds.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return cmds.join(" ");
}

// Common rod-length presets engine builders compare against the stock rod.
// Triggered by quick-pick chips below the comparison input. Spans from stock
// SBC at the low end up to F1-territory long rods (~7.500") so the user can
// see dramatic visual differences on the charts.
const ROD_PRESETS: Array<{ label: string; length: number }> = [
  { label: '5.700"', length: 5.700 },  // SBC stock
  { label: '5.850"', length: 5.850 },  // Common stroker step
  { label: '6.000"', length: 6.000 },  // Standard performance rod
  { label: '6.098"', length: 6.098 },  // LS / Coyote
  { label: '6.125"', length: 6.125 },  // Common SBC stroker
  { label: '6.200"', length: 6.200 },  // Tall-deck step
  { label: '6.535"', length: 6.535 },  // BBC stock
  { label: '6.700"', length: 6.700 },  // long-rod street/strip
  { label: '7.100"', length: 7.100 },  // big-block race / drag long-rod
  { label: '7.500"', length: 7.500 },  // F1-territory; for dramatic comparison
];

// Interactive piston-dwell chart. Shows two piston-position curves overlaid
// (current rod + a comparison rod) so the user can see how a rod-length
// change shifts the dwell at TDC vs BDC.
function DwellChart({ stroke, rodLength }: { stroke: number; rodLength: number }) {
  // Default comparison rod = current + 0.300" (a common stroker-style upgrade
  // like SBC 5.700" -> 6.000"). Reset if the current rod length changes.
  const [compareRodInput, setCompareRodInput] = useState("");

  // Chart geometry (SVG viewBox units).
  const W = 600;
  const H = 280;
  const M = { top: 16, right: 16, bottom: 32, left: 44 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const validStroke = stroke > 0;
  const validRod = rodLength > 0;
  const currentRatio = validStroke && validRod ? rodLength / stroke : 0;

  // Comparison rod: use user's input if set, otherwise default to current + 0.500"
  // (chosen to be visibly different on the charts — +0.300 was too subtle).
  const compareRodLen = compareRodInput.trim() === ""
    ? (validRod ? rodLength + 0.500 : 0)
    : (parseFloat(compareRodInput) || 0);
  const compareRatio = validStroke && compareRodLen > 0 ? compareRodLen / stroke : 0;

  // Acceleration chart geometry (separate from position chart).
  const accelH = 180;
  const accelPlotH = accelH - M.top - M.bottom;

  const { current, comparison, currentAccel, comparisonAccel, currentSide, comparisonSide } = useMemo(() => {
    if (!validStroke || !validRod) {
      return { current: null, comparison: null, currentAccel: null, comparisonAccel: null, currentSide: null, comparisonSide: null };
    }
    const curAccel = computeAccelSeries(stroke, rodLength);
    const cmpAccel = compareRodLen > 0 ? computeAccelSeries(stroke, compareRodLen) : null;
    const accelMaxAbs = Math.max(
      ...curAccel.map(Math.abs),
      ...(cmpAccel ? cmpAccel.map(Math.abs) : [0]),
    );

    // Rod-angle series (signed degrees). Peak |angle| at θ=90° and 270°.
    const curAngles = computeRodAngleSeries(stroke, rodLength);
    const cmpAngles = compareRodLen > 0 ? computeRodAngleSeries(stroke, compareRodLen) : null;
    const sideMaxAbs = Math.max(
      ...curAngles.map(Math.abs),
      ...(cmpAngles ? cmpAngles.map(Math.abs) : [0]),
    );
    // Peak rod angle = arcsin(r/L), reached at θ=90° (index = (N-1)/4 for 360° span)
    const peakIdx = Math.floor((curAngles.length - 1) / 4);

    return {
      current: {
        path: buildCurvePath(stroke, rodLength, plotW, plotH),
        dwell: computeDwell(stroke, rodLength),
      },
      comparison: compareRodLen > 0 ? {
        path: buildCurvePath(stroke, compareRodLen, plotW, plotH),
        dwell: computeDwell(stroke, compareRodLen),
      } : null,
      currentAccel: {
        path: buildAccelPath(curAccel, accelMaxAbs, plotW, accelPlotH),
        peakTdc: curAccel[0],
        peakBdc: Math.abs(curAccel[Math.floor((curAccel.length - 1) / 2)]),
      },
      comparisonAccel: cmpAccel ? {
        path: buildAccelPath(cmpAccel, accelMaxAbs, plotW, accelPlotH),
        peakTdc: cmpAccel[0],
        peakBdc: Math.abs(cmpAccel[Math.floor((cmpAccel.length - 1) / 2)]),
      } : null,
      currentSide: {
        path: buildRodAnglePath(curAngles, sideMaxAbs, plotW, accelPlotH),
        peakAngle: Math.abs(curAngles[peakIdx]),
        peakSideLoadFactor: Math.abs(Math.tan((curAngles[peakIdx] * Math.PI) / 180)),
      },
      comparisonSide: cmpAngles ? {
        path: buildRodAnglePath(cmpAngles, sideMaxAbs, plotW, accelPlotH),
        peakAngle: Math.abs(cmpAngles[peakIdx]),
        peakSideLoadFactor: Math.abs(Math.tan((cmpAngles[peakIdx] * Math.PI) / 180)),
      } : null,
    };
  }, [stroke, rodLength, compareRodLen, validStroke, validRod, plotW, plotH, accelPlotH]);

  if (!current) {
    return (
      <Card className="mb-8">
        <CardHeader><CardTitle>Piston Dwell Profile</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Enter a stroke and rod length above to see the dwell chart.</p>
        </CardContent>
      </Card>
    );
  }

  // Top-of-stroke dwell band: top 0.5% of the chart (orange tint, near TDC).
  const tdcBandHeight = plotH * 0.005;
  // BDC band: bottom 0.5% of the chart.
  const bdcBandY = plotH * 0.995;

  return (
    <Card className="mb-8">
      <CardHeader><CardTitle>Piston Dwell Profile</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Piston position vs crank angle for one full revolution. Flat regions at top (TDC) and bottom (BDC) are where the piston dwells. Longer rods spread dwell toward TDC; shorter rods toward BDC.
        </p>

        {/* Comparison rod-length input + quick presets */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Label htmlFor="cmp-rod" className="text-sm text-muted-foreground whitespace-nowrap">Compare against rod length:</Label>
            <Input
              id="cmp-rod"
              type="number"
              step="0.025"
              min="4.0"
              max="8.0"
              placeholder={validRod ? (rodLength + 0.500).toFixed(3) : "6.000"}
              value={compareRodInput}
              onChange={(e) => setCompareRodInput(e.target.value)}
              className="w-32 font-mono"
            />
            <span className="text-xs text-muted-foreground">inches</span>
            {compareRodLen > 0 && (
              <span className="text-xs text-muted-foreground">
                = ratio <strong className="font-mono">{compareRatio.toFixed(3)}</strong>
                {validRod && (
                  <> ({compareRodLen > rodLength ? "+" : ""}{(compareRodLen - rodLength).toFixed(3)}" vs your rod)</>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Quick picks:</span>
            {ROD_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setCompareRodInput(p.length.toFixed(3))}
                className={`text-xs px-2 py-1 rounded-md border font-mono transition-colors ${
                  Math.abs(compareRodLen - p.length) < 0.001
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCompareRodInput("")}
              className="text-xs px-2 py-1 rounded-md border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500"
            >
              reset
            </button>
          </div>
        </div>

        {/* Chart 1 — piston POSITION vs crank angle */}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Piston position</p>
        <div className="w-full">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <g transform={`translate(${M.left},${M.top})`}>
              {/* Dwell-zone bands */}
              <rect x={0} y={0} width={plotW} height={tdcBandHeight} fill="#E85D04" opacity={0.08} />
              <rect x={0} y={bdcBandY} width={plotW} height={plotH - bdcBandY} fill="#0369a1" opacity={0.08} />

              {/* Y-axis grid + labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const y = (1 - frac) * plotH;
                return (
                  <g key={frac}>
                    <line x1={0} x2={plotW} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} strokeDasharray={frac === 0 || frac === 1 ? undefined : "2,3"} />
                    <text x={-8} y={y + 4} fontSize={10} textAnchor="end" fill="#6b7280">
                      {frac === 1 ? "TDC" : frac === 0 ? "BDC" : `${(frac * 100).toFixed(0)}%`}
                    </text>
                  </g>
                );
              })}

              {/* X-axis grid + labels (every 90°) */}
              {[0, 90, 180, 270, 360].map((deg) => {
                const x = (deg / 360) * plotW;
                return (
                  <g key={deg}>
                    <line x1={x} x2={x} y1={0} y2={plotH} stroke="#e5e7eb" strokeWidth={1} strokeDasharray={deg === 0 || deg === 360 ? undefined : "2,3"} />
                    <text x={x} y={plotH + 16} fontSize={10} textAnchor="middle" fill="#6b7280">
                      {deg === 0 ? "TDC 0°" : deg === 180 ? "BDC 180°" : deg === 360 ? "TDC 360°" : `${deg}°`}
                    </text>
                  </g>
                );
              })}

              {/* Comparison curve */}
              {comparison && (
                <path d={comparison.path} fill="none" stroke="#475569" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.8} />
              )}

              {/* Current curve */}
              <path d={current.path} fill="none" stroke="#E85D04" strokeWidth={2.25} />
            </g>
          </svg>
        </div>

        {/* Chart 2 — piston ACCELERATION vs crank angle.
            This is where the dwell story is visually obvious: the TDC peak
            shrinks as rod length grows, which IS the dwell-at-TDC benefit. */}
        {currentAccel && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Piston acceleration <span className="text-muted-foreground/70 normal-case font-normal">— peak at TDC visibly shrinks with longer rods (that's dwell)</span>
            </p>
            <svg viewBox={`0 0 ${W} ${accelH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
              <g transform={`translate(${M.left},${M.top})`}>
                {/* Zero-acceleration centerline (heaviest gridline) */}
                <line x1={0} x2={plotW} y1={accelPlotH / 2} y2={accelPlotH / 2} stroke="#9ca3af" strokeWidth={1} />

                {/* ±50% gridlines */}
                {[0.25, 0.75].map((frac) => (
                  <line key={frac} x1={0} x2={plotW} y1={frac * accelPlotH} y2={frac * accelPlotH}
                    stroke="#e5e7eb" strokeWidth={1} strokeDasharray="2,3" />
                ))}

                {/* Y-axis labels: +peak / 0 / -peak */}
                <text x={-8} y={4} fontSize={10} textAnchor="end" fill="#6b7280">+peak (TDC)</text>
                <text x={-8} y={accelPlotH / 2 + 4} fontSize={10} textAnchor="end" fill="#6b7280">0</text>
                <text x={-8} y={accelPlotH + 4} fontSize={10} textAnchor="end" fill="#6b7280">−peak (BDC)</text>

                {/* X-axis grid + labels (every 90°) */}
                {[0, 90, 180, 270, 360].map((deg) => {
                  const x = (deg / 360) * plotW;
                  return (
                    <g key={deg}>
                      <line x1={x} x2={x} y1={0} y2={accelPlotH} stroke="#e5e7eb" strokeWidth={1}
                        strokeDasharray={deg === 0 || deg === 360 ? undefined : "2,3"} />
                      <text x={x} y={accelPlotH + 16} fontSize={10} textAnchor="middle" fill="#6b7280">
                        {deg === 0 ? "TDC 0°" : deg === 180 ? "BDC 180°" : deg === 360 ? "TDC 360°" : `${deg}°`}
                      </text>
                    </g>
                  );
                })}

                {/* Comparison acceleration */}
                {comparisonAccel && (
                  <path d={comparisonAccel.path} fill="none" stroke="#475569" strokeWidth={1.5}
                    strokeDasharray="4,3" opacity={0.8} />
                )}

                {/* Current acceleration */}
                <path d={currentAccel.path} fill="none" stroke="#E85D04" strokeWidth={2.25} />
              </g>
            </svg>

            {/* Peak-acceleration readout — the headline number for this chart */}
            {comparisonAccel && (() => {
              const tdcReductionPct = ((currentAccel.peakTdc - comparisonAccel.peakTdc) / currentAccel.peakTdc) * 100;
              const longer = compareRodLen > rodLength;
              return (
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
                  <p className="text-slate-700">
                    <strong>Peak TDC acceleration:</strong>{" "}
                    <span className="font-mono text-[#E85D04]">{currentAccel.peakTdc.toFixed(2)}</span>{" "}
                    (your rod) vs{" "}
                    <span className="font-mono text-slate-700">{comparisonAccel.peakTdc.toFixed(2)}</span>{" "}
                    (comparison)
                    {" — "}
                    <span className={`font-semibold ${tdcReductionPct > 0 ? "text-emerald-700" : "text-orange-700"}`}>
                      {Math.abs(tdcReductionPct).toFixed(1)}% {tdcReductionPct > 0 ? "lower" : "higher"} with the {longer ? "longer" : "shorter"} rod
                    </span>
                    .
                  </p>
                  <p className="text-slate-500 mt-1">
                    Lower TDC acceleration = piston spends more time near TDC = better cylinder pressure retention during combustion. This is the mechanical reason longer rods feel "easier" on the top end of the engine.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Chart 3 — ROD ANGLE / SIDE LOAD vs crank angle.
            Side load = F_combustion × tan(rod angle), so rod angle IS the
            side-load shape in friendlier units. Peak |angle| = arcsin(r/L).
            For real rod-length comparisons this curve shows MUCH bigger
            visual differences than dwell does — this is where the "longer
            rods reduce piston wear" story lives. */}
        {currentSide && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Rod angle (side load shape) <span className="text-muted-foreground/70 normal-case font-normal">— peak swing = how hard the piston gets shoved into the cylinder wall</span>
            </p>
            <svg viewBox={`0 0 ${W} ${accelH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
              <g transform={`translate(${M.left},${M.top})`}>
                {/* Faint shaded region showing the rod-swing envelope */}
                <rect x={0} y={accelPlotH * 0.05} width={plotW} height={accelPlotH * 0.45} fill="#0369a1" opacity={0.05} />
                <rect x={0} y={accelPlotH * 0.5} width={plotW} height={accelPlotH * 0.45} fill="#dc2626" opacity={0.05} />

                {/* Zero-rod-angle centerline (rod aligned with cylinder) */}
                <line x1={0} x2={plotW} y1={accelPlotH / 2} y2={accelPlotH / 2} stroke="#9ca3af" strokeWidth={1} />

                {/* Y-axis labels: side identification */}
                <text x={-8} y={4} fontSize={10} textAnchor="end" fill="#0369a1">+ (minor)</text>
                <text x={-8} y={accelPlotH / 2 + 4} fontSize={10} textAnchor="end" fill="#6b7280">0° aligned</text>
                <text x={-8} y={accelPlotH + 4} fontSize={10} textAnchor="end" fill="#dc2626">− (major)</text>

                {/* X-axis grid + labels (every 90°) */}
                {[0, 90, 180, 270, 360].map((deg) => {
                  const x = (deg / 360) * plotW;
                  return (
                    <g key={deg}>
                      <line x1={x} x2={x} y1={0} y2={accelPlotH} stroke="#e5e7eb" strokeWidth={1}
                        strokeDasharray={deg === 0 || deg === 360 ? undefined : "2,3"} />
                      <text x={x} y={accelPlotH + 16} fontSize={10} textAnchor="middle" fill="#6b7280">
                        {deg === 0 ? "TDC 0°" : deg === 180 ? "BDC 180°" : deg === 360 ? "TDC 360°" : `${deg}°`}
                      </text>
                    </g>
                  );
                })}

                {/* Comparison rod angle */}
                {comparisonSide && (
                  <path d={comparisonSide.path} fill="none" stroke="#475569" strokeWidth={1.5}
                    strokeDasharray="4,3" opacity={0.8} />
                )}

                {/* Current rod angle */}
                <path d={currentSide.path} fill="none" stroke="#E85D04" strokeWidth={2.25} />
              </g>
            </svg>

            {/* Peak rod-angle + side-load readout. This is the DRAMATIC comparison —
                real rod-length changes shift peak angle by ~1-3° which translates
                to 5-25% peak-side-force reduction. */}
            {comparisonSide && (() => {
              // Side load force ratio compared by tan of peak rod angle.
              const sideReductionPct = ((currentSide.peakSideLoadFactor - comparisonSide.peakSideLoadFactor) / currentSide.peakSideLoadFactor) * 100;
              const longer = compareRodLen > rodLength;
              return (
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
                  <p className="text-slate-700">
                    <strong>Peak rod angle:</strong>{" "}
                    <span className="font-mono text-[#E85D04]">{currentSide.peakAngle.toFixed(2)}°</span>{" "}
                    (your rod) vs{" "}
                    <span className="font-mono text-slate-700">{comparisonSide.peakAngle.toFixed(2)}°</span>{" "}
                    (comparison)
                  </p>
                  <p className="text-slate-700 mt-1">
                    <strong>Peak side load on the cylinder wall:</strong>{" "}
                    <span className={`font-semibold ${sideReductionPct > 0 ? "text-emerald-700" : "text-orange-700"}`}>
                      {Math.abs(sideReductionPct).toFixed(1)}% {sideReductionPct > 0 ? "lower" : "higher"} with the {longer ? "longer" : "shorter"} rod
                    </span>
                    {" "}(side load = combustion force × tan of rod angle).
                  </p>
                  <p className="text-slate-500 mt-1">
                    Side load is the force that mashes the piston skirt into the cylinder wall. The major thrust face (the side opposite the crank rotation during the power stroke) carries 70–80% of this load — it's where most piston-skirt and cylinder-wall wear comes from. Halving rod-angle peak roughly halves wear at the major thrust face.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs">
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-0.5 bg-[#E85D04]" />
            <span>
              Your rod: <strong className="font-mono">{rodLength.toFixed(3)}"</strong>
              {" "}
              <span className="text-muted-foreground">(ratio {currentRatio.toFixed(3)})</span>
            </span>
          </span>
          {comparison && (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-slate-600" />
              <span>
                Comparison: <strong className="font-mono">{compareRodLen.toFixed(3)}"</strong>
                {" "}
                <span className="text-muted-foreground">(ratio {compareRatio.toFixed(3)})</span>
              </span>
            </span>
          )}
          <span className="text-muted-foreground">Shaded bands = within 0.5% of stroke from TDC / BDC.</span>
        </div>

        {/* Dwell readout — two rows of two cells: your rod (TDC + BDC), comparison rod (TDC + BDC) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          {/* Your rod */}
          <div className="rounded-lg border-2 border-[#E85D04]/40 bg-orange-50/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#E85D04] font-bold mb-2">
              Your rod — {rodLength.toFixed(3)}" (ratio {currentRatio.toFixed(3)})
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-orange-900/70">TDC dwell</p>
                <p className="text-lg font-bold font-mono text-orange-900">{current.dwell.tdcDeg.toFixed(1)}°</p>
              </div>
              <div>
                <p className="text-[10px] text-sky-900/70">BDC dwell</p>
                <p className="text-lg font-bold font-mono text-sky-900">{current.dwell.bdcDeg.toFixed(1)}°</p>
              </div>
            </div>
          </div>

          {/* Comparison rod */}
          {comparison ? (
            <div className="rounded-lg border-2 border-slate-400/40 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-700 font-bold mb-2">
                Comparison — {compareRodLen.toFixed(3)}" (ratio {compareRatio.toFixed(3)})
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-600">TDC dwell</p>
                  <p className="text-lg font-bold font-mono text-slate-700">
                    {comparison.dwell.tdcDeg.toFixed(1)}°
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {comparison.dwell.tdcDeg > current.dwell.tdcDeg ? "+" : ""}
                    {(comparison.dwell.tdcDeg - current.dwell.tdcDeg).toFixed(2)}° vs yours
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600">BDC dwell</p>
                  <p className="text-lg font-bold font-mono text-slate-700">
                    {comparison.dwell.bdcDeg.toFixed(1)}°
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {comparison.dwell.bdcDeg > current.dwell.bdcDeg ? "+" : ""}
                    {(comparison.dwell.bdcDeg - current.dwell.bdcDeg).toFixed(2)}° vs yours
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 border border-dashed border-gray-300 p-3 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Enter a comparison rod length above to see the dwell difference.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RodRatioCalculator() {
  const platform = useDefaultPlatform();
  const [stroke, setStroke] = useBuildField("shortBlock.stroke", platform?.stroke ?? "3.622");
  const [rodLength, setRodLength] = useBuildField("rotatingAssembly.rodLength", platform?.rodLength ?? "6.098");
  const { activeBuild, setField } = useBuildContext();

  const s = parseFloat(stroke) || 0;
  const r = parseFloat(rodLength) || 1;
  const ratio = s > 0 ? r / s : 0;
  const zone = getRatioZone(ratio);

  // Merge hardcoded engines with JSON database engines
  const { engines: jsonEngines, loading: jsonLoading } = useReferenceEngines();
  const mergedEngines = useMemo(() => {
    const hardcoded = commonEngines.map(e => ({ ...e }));
    const seen = new Set(hardcoded.map(e => `${e.stroke}-${e.rod}`));
    for (const je of jsonEngines) {
      if (!je.rodLength) continue;
      const key = `${je.stroke.toFixed(3)}-${je.rodLength.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = je.rodLength / je.stroke;
      hardcoded.push({
        name: je.name,
        stroke: je.stroke.toFixed(3),
        rod: je.rodLength.toFixed(3),
        ratio: parseFloat(r.toFixed(3)),
      });
    }
    return hardcoded;
  }, [jsonEngines]);

  useEffect(() => {
    if (activeBuild && ratio > 0) {
      setField("computed.rodRatio", ratio.toFixed(3));
    }
  }, [ratio, activeBuild?.id]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Rod Ratio Calculator | Connecting Rod to Stroke"
        description="Calculate your connecting rod ratio (L/S) and see where it falls in the performance spectrum. Compare against common engines like SBC 350, LS1, Ford 302, 2JZ."
        canonical="/calculators/rod-ratio"
        keywords="rod ratio calculator, connecting rod ratio, rod length stroke ratio, engine rod ratio, L/S ratio calculator"
      />
      <BuildBanner savedFields={[
        { label: "Rod Ratio", key: "computed.rodRatio", value: ratio > 0 ? ratio.toFixed(3) : "" },
      ]} />
      <h1 className="text-3xl font-bold mb-2">Connecting Rod Ratio Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate your connecting rod ratio and see where it falls in the performance spectrum.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Stroke (inches)</Label>
              <Input type="number" step="0.001" value={stroke} onChange={e => setStroke(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Connecting Rod Length (inches)</Label>
              <Input type="number" step="0.001" value={rodLength} onChange={e => setRodLength(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] text-white">
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-1">Rod Ratio (L/S)</p>
            <p className="text-6xl font-bold text-primary mb-4">{ratio.toFixed(3)}</p>
            
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>1.4 (Low)</span>
                <span>1.7–1.8 (Ideal)</span>
                <span>2.0+ (High)</span>
              </div>
              <div className="relative h-3 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 rounded-full">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-primary shadow-lg transition-all"
                  style={{ left: `calc(${zone.position}% - 8px)` }}
                />
              </div>
            </div>

            <p className={`text-sm font-medium ${zone.color}`}>{zone.label}</p>
          </CardContent>
        </Card>
      </div>

      <DwellChart stroke={s} rodLength={r} />

      <Card className="mb-8">
        <CardHeader><CardTitle>What Rod Ratio Affects</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Piston Dwell at TDC</p>
            <p className="text-muted-foreground">Longer rods increase dwell time at TDC, giving combustion gases more time to act on the piston. This generally improves cylinder pressure and power.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Piston Side Loading</p>
            <p className="text-muted-foreground">Shorter rods create greater angle between rod and cylinder bore, increasing side thrust on the piston skirt. This causes more wear and friction.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Piston Speed</p>
            <p className="text-muted-foreground">Longer rods smooth out piston velocity through the stroke, reducing peak piston speed and the stress/friction that comes with it.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Block Height</p>
            <p className="text-muted-foreground">Longer rods require either a taller block, shorter piston, or reduced compression height. This affects overall engine package dimensions.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Common Engine Comparison{jsonLoading ? " (loading database...)" : ""}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Engine</th>
                  <th className="text-right py-2">Stroke</th>
                  <th className="text-right py-2">Rod Length</th>
                  <th className="text-right py-2">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {mergedEngines.map((e, i) => (
                  <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                    <td className="py-2 font-medium">{e.name}</td>
                    <td className="text-right py-2">{e.stroke}"</td>
                    <td className="text-right py-2">{e.rod}"</td>
                    <td className={`text-right py-2 font-bold ${Math.abs(e.ratio - ratio) < 0.05 ? "text-primary" : ""}`}>{e.ratio.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
              <h4 className="font-semibold text-foreground mb-1">What Is Rod Ratio?</h4>
              <p>Rod center-to-center length divided by stroke (L/S). Affects piston dwell, side loading, and acceleration through the stroke.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Ideal Range</h4>
              <p>1.6–1.8 covers most performance engines. Above 1.8 gives diminishing returns with packaging challenges. Below 1.55 increases piston wear.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Stroker Warning</h4>
              <p>A 383 SBC stroker with stock 5.700" rods drops to 1.520:1. Upgrade to 6.000" rods to bring it back to 1.600:1.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Higher Ratio Trade-offs</h4>
              <p>Longer rods need a taller block or shorter piston compression height. Short pistons are weaker and more expensive.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Common Ratios</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>SBC 350:</span><span className="font-mono">1.638</span></li>
                <li className="flex justify-between"><span>LS1 5.7L:</span><span className="font-mono">1.684</span></li>
                <li className="flex justify-between"><span>Ford 302:</span><span className="font-mono">1.697</span></li>
                <li className="flex justify-between"><span>Honda K24A:</span><span className="font-mono">1.705</span></li>
                <li className="flex justify-between"><span>Toyota 2JZ:</span><span className="font-mono">1.687</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </HelpSidebar>

      </div>{/* end flex row */}

      <CalculatorContent data={rodRatioContent} title="Connecting Rod Ratio" />
    </div>
  );
}
