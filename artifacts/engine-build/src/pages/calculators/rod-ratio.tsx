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

// TDC-zoom path. Samples a narrow window around TDC (±degHalfRange of crank
// rotation) and maps to a Y range from 0 to topFraction of stroke (e.g.
// 0.02 = top 2% of stroke). This amplifies the visual difference between rod
// lengths in the dwell zone — where the differences actually live.
function buildTdcZoomPath(
  stroke: number,
  rodLength: number,
  width: number,
  height: number,
  degHalfRange = 40,
  topFraction = 0.02,
  samples = 241,
): string {
  const cmds: string[] = [];
  let started = false;
  for (let i = 0; i < samples; i++) {
    // Sample symmetrically around TDC: from -degHalfRange to +degHalfRange
    const deg = -degHalfRange + (i / (samples - 1)) * (2 * degHalfRange);
    const x = pistonDisplacement((deg * Math.PI) / 180, stroke, rodLength);
    const fracFromTdc = x / stroke; // 0 at TDC, grows downward
    if (fracFromTdc > topFraction) {
      // Clip — once outside the zoom window, lift the pen.
      started = false;
      continue;
    }
    const px = ((deg + degHalfRange) / (2 * degHalfRange)) * width;
    // Y: 0 at top (TDC), height at bottom (topFraction down from TDC)
    const py = (fracFromTdc / topFraction) * height;
    cmds.push(`${started ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`);
    started = true;
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

// One-click preset comparisons that load BOTH the stroke and rod lengths for
// a realistic engine swap. The data is what builders actually consider —
// upgrading stock rods to a common aftermarket length on a known platform.
interface PlatformPreset {
  label: string;
  blurb: string;
  stroke: string;
  currentRod: string;
  compareRod: string;
}
const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    label: 'SBC 350: 5.700" → 6.000"',
    blurb: "Stock 350 rod vs the popular 383-stroker 6-inch upgrade",
    stroke: "3.480",
    currentRod: "5.700",
    compareRod: "6.000",
  },
  {
    label: 'SBC 383 stroker: 5.700" → 6.000"',
    blurb: 'Same rods, but on a 3.750" stroker crank — bigger angle change',
    stroke: "3.750",
    currentRod: "5.700",
    compareRod: "6.000",
  },
  {
    label: 'LS1 / LS3: 6.098" → 6.125"',
    blurb: "Stock LS rod vs the common 6.125 aftermarket upgrade",
    stroke: "3.622",
    currentRod: "6.098",
    compareRod: "6.125",
  },
  {
    label: 'LS7: 6.067" → 6.300"',
    blurb: "Stock LS7 titanium vs a race-style long-rod build",
    stroke: "4.000",
    currentRod: "6.067",
    compareRod: "6.300",
  },
  {
    label: 'BBC 454: 6.135" → 6.385"',
    blurb: "Stock big-block rod vs common aftermarket length",
    stroke: "4.000",
    currentRod: "6.135",
    compareRod: "6.385",
  },
  {
    label: 'NHRA Pro Stock 500ci: 6.480" → 6.120"',
    blurb: "Old-school 1.80 rod ratio vs modern 1.70 — Pro Stock went SHORTER to chase RPM.",
    stroke: "3.600",
    currentRod: "6.480",
    compareRod: "6.120",
  },
];

// ─── Comparison scorecard: bar row ──────────────────────────────────────────
// Shows two side-by-side horizontal bars normalized to the larger value, so
// even a 1% difference is visually distinguishable (one bar is clearly
// shorter). Color tells the user whether the comparison is better (green) or
// worse (orange) than their current setup.
interface BarRowProps {
  label: string;
  unit: string;
  currentValue: number;
  comparisonValue: number;
  lowerIsBetter: boolean;
  format?: (v: number) => string;
}
function BarRow({ label, unit, currentValue, comparisonValue, lowerIsBetter, format = (v) => v.toFixed(2) }: BarRowProps) {
  const maxAbs = Math.max(Math.abs(currentValue), Math.abs(comparisonValue));
  const currentPct = maxAbs > 0 ? (Math.abs(currentValue) / maxAbs) * 100 : 0;
  const comparisonPct = maxAbs > 0 ? (Math.abs(comparisonValue) / maxAbs) * 100 : 0;
  const deltaPct = currentValue !== 0 ? ((comparisonValue - currentValue) / currentValue) * 100 : 0;
  const isComparisonBetter = lowerIsBetter
    ? comparisonValue < currentValue
    : comparisonValue > currentValue;
  const deltaColor = isComparisonBetter ? "text-emerald-700" : "text-orange-700";
  const deltaSign = deltaPct >= 0 ? "+" : "";
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className={`text-xs font-bold font-mono ${deltaColor}`}>
          {deltaSign}{deltaPct.toFixed(1)}%
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-16 shrink-0">Your rod</span>
          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
            <div className="h-full bg-[#E85D04] rounded transition-all" style={{ width: `${currentPct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-slate-700 w-20 text-right shrink-0">
            {format(currentValue)}{unit}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-16 shrink-0">Compare</span>
          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
            <div className="h-full bg-blue-600 rounded transition-all" style={{ width: `${comparisonPct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-slate-700 w-20 text-right shrink-0">
            {format(comparisonValue)}{unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Cylinder wear visualization ────────────────────────────────────────────
// Shows a cylinder cross-section with the connecting rod at its PEAK swing
// angle (θ=90° crank, when the rod is at maximum tilt). The major thrust face
// wall (right side, opposite crank rotation during power stroke) is shaded
// red with opacity scaled to the rod's peak side-load factor — and shaded
// RELATIVELY between the two rod choices, so even a 5% load difference
// shows as a visibly different red.
interface CylinderDiagramProps {
  rodLength: number;
  stroke: number;
  peakAngle: number;        // degrees
  peakSideLoad: number;     // tan of peak angle
  loadMaxInPair: number;    // shared with the other cylinder for relative shading
  label: string;
  sublabel: string;
  isPrimary: boolean;
}
function CylinderDiagram({ rodLength, stroke, peakAngle, peakSideLoad, loadMaxInPair, label, sublabel, isPrimary }: CylinderDiagramProps) {
  // SVG canvas
  const W = 160;
  const H = 240;
  // Cylinder geometry — drawn in SVG units, NOT physical scale.
  const cylBore = 60;
  const cylTop = 30;
  const cylBottom = 180;
  const cylLeft = (W - cylBore) / 2;
  const cylRight = cylLeft + cylBore;
  const cylHeight = cylBottom - cylTop;
  const cylCenter = W / 2;

  // Piston at mid-stroke (where peak rod angle occurs at θ=90°)
  const pistonH = 26;
  const pistonY = (cylTop + cylBottom) / 2 - pistonH / 2;
  const pistonPinY = pistonY + pistonH / 2;

  // Rod geometry — draw at the actual peak rod angle, length scaled to bore.
  // Display length is fixed (visual constant) but angle is real.
  const rodDisplayLen = 80;
  const angleRad = (peakAngle * Math.PI) / 180;
  const rodEndX = cylCenter + rodDisplayLen * Math.sin(angleRad);
  const rodEndY = pistonPinY + rodDisplayLen * Math.cos(angleRad);

  // Relative shading: the heavier-loaded cylinder shows ~0.85 opacity, the
  // lighter shows opacity scaled by its share of the pair's max.
  const wearOpacity = loadMaxInPair > 0 ? (peakSideLoad / loadMaxInPair) * 0.85 : 0;
  // Major thrust face = the wall the piston gets pushed into during power stroke
  // (we're showing the +90° rod-swing direction, so right wall = major face).

  // Arrow size scaled to side load magnitude — also relative within the pair.
  const arrowScale = loadMaxInPair > 0 ? peakSideLoad / loadMaxInPair : 0;

  return (
    <div className={`text-center rounded-lg border-2 p-2 ${isPrimary ? "border-[#E85D04]/40 bg-orange-50/40" : "border-blue-400/50 bg-blue-50/40"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isPrimary ? "text-[#E85D04]" : "text-blue-700"}`}>
        {label}
      </p>
      <p className="text-[10px] font-mono text-slate-600 mb-1">{sublabel}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Wall wear shading — major (right) thrust face */}
        <rect x={cylRight} y={cylTop} width={8} height={cylHeight} fill="#dc2626" opacity={wearOpacity} />
        {/* Right wall outline */}
        <rect x={cylRight} y={cylTop} width={8} height={cylHeight} fill="none" stroke="#1f2937" strokeWidth={1.5} />
        {/* Left wall (minor face) — light shading */}
        <rect x={cylLeft - 8} y={cylTop} width={8} height={cylHeight} fill="#0369a1" opacity={wearOpacity * 0.25} />
        <rect x={cylLeft - 8} y={cylTop} width={8} height={cylHeight} fill="none" stroke="#1f2937" strokeWidth={1.5} />

        {/* Cylinder bore (dashed top open) */}
        <line x1={cylLeft} y1={cylTop} x2={cylRight} y2={cylTop} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />

        {/* Piston */}
        <rect x={cylLeft + 2} y={pistonY} width={cylBore - 4} height={pistonH}
          fill="#e2e8f0" stroke="#475569" strokeWidth={1.25} rx={2} />
        {/* Piston rings */}
        <line x1={cylLeft + 2} y1={pistonY + 6} x2={cylRight - 2} y2={pistonY + 6} stroke="#94a3b8" strokeWidth={0.5} />
        <line x1={cylLeft + 2} y1={pistonY + 10} x2={cylRight - 2} y2={pistonY + 10} stroke="#94a3b8" strokeWidth={0.5} />

        {/* Connecting rod at peak angle (the visual differentiator) */}
        <line x1={cylCenter} y1={pistonPinY} x2={rodEndX} y2={rodEndY}
          stroke="#334155" strokeWidth={4} strokeLinecap="round" />
        {/* Piston pin */}
        <circle cx={cylCenter} cy={pistonPinY} r={3} fill="#1f2937" />
        {/* Crank pin */}
        <circle cx={rodEndX} cy={rodEndY} r={4.5} fill="#1f2937" />

        {/* Side-load arrow into the major thrust face */}
        {arrowScale > 0.1 && (
          <g transform={`translate(${cylRight - 2}, ${pistonPinY})`}>
            <line x1={-10 - arrowScale * 8} y1={0} x2={2} y2={0} stroke="#dc2626" strokeWidth={1.5 + arrowScale * 2.5} strokeLinecap="round" />
            <path d={`M -3 -3 L 2 0 L -3 3`} fill="#dc2626" />
          </g>
        )}

        {/* Peak angle text label */}
        <text x={W / 2} y={H - 28} fontSize={11} textAnchor="middle" fill="#1f2937" fontWeight="bold">
          {peakAngle.toFixed(2)}°
        </text>
        <text x={W / 2} y={H - 14} fontSize={9} textAnchor="middle" fill="#6b7280">
          peak rod angle
        </text>
      </svg>
    </div>
  );
}

// Interactive piston-dwell chart. Shows piston position, acceleration, and
// rod angle / side load for the user's current rod + a comparison rod.
interface DwellChartProps {
  stroke: number;
  rodLength: number;
  setStrokeText: (s: string) => void;
  setRodLengthText: (r: string) => void;
}
function DwellChart({ stroke, rodLength, setStrokeText, setRodLengthText }: DwellChartProps) {
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
        // TDC zoom uses a smaller height (the zoom chart is ~half-tall) and
        // a tight crank window so the dwell-region detail is the whole chart.
        tdcZoomPath: buildTdcZoomPath(stroke, rodLength, plotW, 120),
        dwell: computeDwell(stroke, rodLength),
      },
      comparison: compareRodLen > 0 ? {
        path: buildCurvePath(stroke, compareRodLen, plotW, plotH),
        tdcZoomPath: buildTdcZoomPath(stroke, compareRodLen, plotW, 120),
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

        {/* Common platform comparisons — one click loads stroke + both rods. */}
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-[11px] uppercase tracking-wider text-blue-900 font-bold mb-2">
            Common platform comparisons
          </p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_PRESETS.map((p) => {
              const isActive =
                Math.abs(stroke - parseFloat(p.stroke)) < 0.001 &&
                Math.abs(rodLength - parseFloat(p.currentRod)) < 0.001 &&
                compareRodInput.trim() === p.compareRod;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setStrokeText(p.stroke);
                    setRodLengthText(p.currentRod);
                    setCompareRodInput(p.compareRod);
                  }}
                  title={p.blurb}
                  className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
                    isActive
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-white text-blue-900 border-blue-300 hover:bg-blue-100"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-blue-700 mt-2">
            Each preset loads the stroke and both rod lengths so you can see the actual geometric difference for that swap.
          </p>
        </div>

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

        {/* ─── Comparison Summary: Bar scorecard (left) + cylinder viz (right) ─── */}
        {comparison && currentAccel && comparisonAccel && currentSide && comparisonSide && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT — Bar scorecard */}
            <div className="rounded-lg bg-white border-2 border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Comparison scorecard
              </h3>
              <BarRow
                label="Peak side load"
                unit=""
                currentValue={currentSide.peakSideLoadFactor}
                comparisonValue={comparisonSide.peakSideLoadFactor}
                lowerIsBetter
                format={(v) => v.toFixed(3)}
              />
              <BarRow
                label="Peak rod angle"
                unit="°"
                currentValue={currentSide.peakAngle}
                comparisonValue={comparisonSide.peakAngle}
                lowerIsBetter
                format={(v) => v.toFixed(2)}
              />
              <BarRow
                label="Peak TDC acceleration"
                unit=""
                currentValue={currentAccel.peakTdc}
                comparisonValue={comparisonAccel.peakTdc}
                lowerIsBetter
                format={(v) => v.toFixed(2)}
              />
              <BarRow
                label="TDC dwell"
                unit="°"
                currentValue={current.dwell.tdcDeg}
                comparisonValue={comparison.dwell.tdcDeg}
                lowerIsBetter={false}
                format={(v) => v.toFixed(1)}
              />
              <BarRow
                label="BDC dwell"
                unit="°"
                currentValue={current.dwell.bdcDeg}
                comparisonValue={comparison.dwell.bdcDeg}
                lowerIsBetter={false}
                format={(v) => v.toFixed(1)}
              />
              <p className="text-[10px] text-slate-500 mt-3 leading-snug border-t border-slate-200 pt-2">
                Bars normalized to the larger value in each row so small differences are visible.
                Green % = the change helps; orange % = the change hurts.
              </p>
            </div>

            {/* RIGHT — Cylinder wear visualization */}
            <div className="rounded-lg bg-white border-2 border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Cylinder wall loading
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <CylinderDiagram
                  rodLength={rodLength}
                  stroke={stroke}
                  peakAngle={currentSide.peakAngle}
                  peakSideLoad={currentSide.peakSideLoadFactor}
                  loadMaxInPair={Math.max(currentSide.peakSideLoadFactor, comparisonSide.peakSideLoadFactor)}
                  label="Your rod"
                  sublabel={`${rodLength.toFixed(3)}"`}
                  isPrimary
                />
                <CylinderDiagram
                  rodLength={compareRodLen}
                  stroke={stroke}
                  peakAngle={comparisonSide.peakAngle}
                  peakSideLoad={comparisonSide.peakSideLoadFactor}
                  loadMaxInPair={Math.max(currentSide.peakSideLoadFactor, comparisonSide.peakSideLoadFactor)}
                  label="Comparison"
                  sublabel={`${compareRodLen.toFixed(3)}"`}
                  isPrimary={false}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-snug border-t border-slate-200 pt-2">
                Rod is shown at peak swing angle (θ=90° crank). The major thrust face (right wall, red)
                is where 70–80% of skirt wear happens. Wall colors are scaled <em>between the two rods</em>
                so even small differences in peak side load show as different reds.
              </p>
            </div>
          </div>
        )}

        {/* Magnitude-aware verdict — interprets what the scorecard numbers
            mean for builders ("wash, upgrade for other reasons" vs
            "meaningful improvement" vs "race territory"). */}
        {currentSide && comparisonSide && (() => {
          const sideReductionPct = ((currentSide.peakSideLoadFactor - comparisonSide.peakSideLoadFactor) / currentSide.peakSideLoadFactor) * 100;
          const longer = compareRodLen > rodLength;
          const absPct = Math.abs(sideReductionPct);
          let verdict: { tag: string; tagColor: string; line: string };
          if (absPct < 1.5) {
            verdict = {
              tag: "Essentially a wash",
              tagColor: "bg-gray-200 text-gray-800",
              line: `These two rod lengths are geometrically almost identical (peak rod angle within ${Math.abs(currentSide.peakAngle - comparisonSide.peakAngle).toFixed(2)}°). If you're picking between them, the choice should come from material, beam style (I- vs H-beam), bolt grade (stock vs ARP 2000 vs 625+), balance accuracy, and price — not from dwell or side load. The geometry doesn't change in any practical sense.`,
            };
          } else if (absPct < 4) {
            verdict = {
              tag: "Modest improvement",
              tagColor: "bg-amber-100 text-amber-900",
              line: `Real, measurable, but not dramatic. You'd see this as slightly less skirt wear at high mileage. Most builders making this swap are doing it as part of a larger upgrade (new pistons, balance work) where the rod choice is incremental rather than headline.`,
            };
          } else if (absPct < 10) {
            verdict = {
              tag: "Meaningful improvement",
              tagColor: "bg-emerald-100 text-emerald-900",
              line: `Worth doing. This is the magnitude builders feel — less cylinder-wall scoring at sustained high RPM, longer top-end engine life, slightly less ring tilt. The classic SBC 350-to-383-stroker 6"-rod swap lives here.`,
            };
          } else {
            verdict = {
              tag: "Significant — race territory",
              tagColor: "bg-blue-100 text-blue-900",
              line: `Major geometric change. This is the rod-length difference seen in race engines and F1 power units that need to survive at sustained 12,000+ RPM. For street builds it's overkill; packaging usually doesn't allow rods this long without raised cam tunnels or shorter pistons.`,
            };
          }
          return (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
              <p className="text-slate-700">
                <strong>Peak side load on the cylinder wall:</strong>{" "}
                <span className={`font-semibold ${sideReductionPct > 0 ? "text-emerald-700" : "text-orange-700"}`}>
                  {absPct.toFixed(1)}% {sideReductionPct > 0 ? "lower" : "higher"} with the {longer ? "longer" : "shorter"} rod
                </span>
                {" "}(side load = combustion force × tan of rod angle).
              </p>
              <div className="mt-2 flex items-start gap-2">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${verdict.tagColor} whitespace-nowrap shrink-0`}>
                  {verdict.tag}
                </span>
                <p className="text-slate-600 leading-relaxed">{verdict.line}</p>
              </div>
              <p className="text-slate-500 mt-2 leading-relaxed">
                Side load is the force that mashes the piston skirt into the cylinder wall. The major thrust face (the side opposite the crank rotation during the power stroke) carries 70–80% of this load — it's where most piston-skirt and cylinder-wall wear comes from.
              </p>
            </div>
          );
        })()}

        {/* TDC zoom + position/accel/side-load charts removed — they were
            visually flat for realistic rod-length comparisons. The scorecard
            and cylinder viz above carry the comparison story now. Curve-building
            helpers (buildCurvePath, buildTdcZoomPath, buildAccelPath,
            buildRodAnglePath) are still defined above in case we bring graphs
            back, but no longer invoked here. */}
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

      <DwellChart
        stroke={s}
        rodLength={r}
        setStrokeText={setStroke}
        setRodLengthText={setRodLength}
      />

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
