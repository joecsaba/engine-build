import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBuildContext } from "@/context/BuildContext";
import { Info } from "lucide-react";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import { HelpSidebar } from "@/components/calculators/HelpCard";
import valveSpringContent from "@/data/calculatorContent/valve-spring.mjs";

/* ── Application safety margins ───────────────────────────────── */

type AppType = "street" | "performance" | "race" | "extreme";

const appMargins: Record<AppType, { label: string; margin: number }> = {
  street:      { label: "Street",           margin: 0.060 },
  performance: { label: "Performance",      margin: 0.070 },
  race:        { label: "Race",             margin: 0.080 },
  extreme:     { label: "Extreme / Drag",   margin: 0.100 },
};

/* ── Common rocker ratios ─────────────────────────────────────── */

const rockerPresets = [
  { value: "1.500", label: "1.5:1 (SBC, Pontiac, Mopar LA/B/RB/Hemi)" },
  { value: "1.550", label: "1.55:1 (Buick 350/455)" },
  { value: "1.600", label: "1.6:1 (SBF Windsor, Olds SB, Buick, AMC, Gen III Hemi)" },
  { value: "1.650", label: "1.65:1 (Cadillac 472/500, Pontiac SD)" },
  { value: "1.700", label: "1.7:1 (BBC, LS1/LS2/LS3/LS6)" },
  { value: "1.730", label: "1.73:1 (Ford Cleveland/FE 390/428)" },
  { value: "1.760", label: "1.76:1 (Ford FE 352/427)" },
  { value: "1.800", label: "1.8:1 (LS7/LS9, Olds Rocket BB)" },
  { value: "custom", label: "Custom ratio..." },
];

/* ── Cam type pressure ranges ─────────────────────────────────── */

type CamType = "hyd-flat" | "hyd-roller-street" | "hyd-roller-perf" | "solid-flat" | "solid-roller-street" | "solid-roller-race" | "solid-roller-extreme";

const camTypes: Record<CamType, { label: string; seatMin: number; seatMax: number; openMin: number; openMax: number }> = {
  "hyd-flat":              { label: "Hydraulic flat tappet",             seatMin: 85,  seatMax: 115, openMin: 240, openMax: 280  },
  "hyd-roller-street":     { label: "Hydraulic roller (street)",        seatMin: 120, seatMax: 145, openMin: 300, openMax: 350  },
  "hyd-roller-perf":       { label: "Hydraulic roller (performance)",   seatMin: 140, seatMax: 170, openMin: 350, openMax: 400  },
  "solid-flat":            { label: "Solid flat tappet",                seatMin: 130, seatMax: 160, openMin: 330, openMax: 380  },
  "solid-roller-street":   { label: "Solid roller (street, 6500 RPM max)", seatMin: 180, seatMax: 230, openMin: 480, openMax: 560  },
  "solid-roller-race":     { label: "Solid roller (race, 6500-8000 RPM)",  seatMin: 230, seatMax: 300, openMin: 600, openMax: 750  },
  "solid-roller-extreme":  { label: "Solid roller (extreme, 8000+ RPM)",   seatMin: 300, seatMax: 400, openMin: 750, openMax: 1000 },
};

/* ── Stock shim sizes ─────────────────────────────────────────── */

const SHIM_SIZES = [0.090, 0.060, 0.030, 0.015];

function getShimCombo(target: number): { shims: number[]; total: number } {
  const shims: number[] = [];
  let remaining = target;

  for (const size of SHIM_SIZES) {
    while (remaining >= size - 0.001) {
      shims.push(size);
      remaining -= size;
      remaining = Math.round(remaining * 1000) / 1000;
    }
  }

  const total = shims.reduce((a, b) => a + b, 0);
  return { shims, total };
}

function formatShimCombo(shims: number[]): string {
  if (shims.length === 0) return "No shim needed";
  const counts: Record<string, number> = {};
  for (const s of shims) {
    const key = s.toFixed(3);
    counts[key] = (counts[key] || 0) + 1;
  }
  const parts = Object.entries(counts).map(([size, count]) => `${count}\u00d7 ${size}"`);
  return parts.join(" + ");
}

/* ── Zone helpers ──────────────────────────────────────────────── */

function getBindZone(clearance: number, margin: number): { label: string; color: string; bg: string; message: string } {
  if (clearance < 0) {
    return {
      label: "INTERFERENCE",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Physical impossibility \u2014 coils would overlap. The valve cannot open this far with this spring.",
    };
  }
  if (clearance < margin - 0.010) {
    return {
      label: "WILL COIL BIND",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Spring will coil-bind or be dangerously close at max lift. Options: shorter installed height, taller coil-bind spring, less lift, or different spring.",
    };
  }
  if (clearance < margin) {
    return {
      label: "MARGINAL",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      message: "Clearance is within 0.010\" of the minimum safety margin. Verify measurements carefully and consider a spring with more travel.",
    };
  }
  return {
    label: "SAFE",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    message: "Adequate clearance to coil bind for this application.",
  };
}

function getRetainerZone(clearance: number): { label: string; color: string; bg: string; message: string } {
  if (clearance < 0) {
    return {
      label: "INTERFERENCE",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Retainer will contact the seal or guide at max lift. The valve cannot open this far without destroying the seal.",
    };
  }
  if (clearance < 0.050) {
    return {
      label: "TOO CLOSE",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Below the 0.050\" minimum. Retainer will damage or destroy the valve seal at RPM. Options: shorter valve, taller seal, machined spring seat, shorter-body retainer, or less lift.",
    };
  }
  if (clearance < 0.060) {
    return {
      label: "MARGINAL",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      message: "Between 0.050\" and 0.060\". Will likely survive on a street engine but has no margin for valvetrain deflection or thermal growth. Most manufacturers recommend 0.060\" minimum.",
    };
  }
  return {
    label: "SAFE",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    message: "Adequate clearance between retainer and seal.",
  };
}

function getPressureZone(value: number, min: number, max: number): { label: string; color: string; bg: string } {
  if (value >= min && value <= max) {
    return { label: "Within range", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  }
  const lowThreshold = min * 0.90;
  const highThreshold = max * 1.10;
  if (value >= lowThreshold && value < min) {
    return { label: "Slightly below range", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  }
  if (value > max && value <= highThreshold) {
    return { label: "Slightly above range", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  }
  if (value < lowThreshold) {
    return { label: "Under-sprung", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  }
  return { label: "Over-sprung", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

/* ── Lift converter sub-component ─────────────────────────────── */

function LiftConverter({ id, onLiftCalculated }: { id: string; onLiftCalculated: (lift: string) => void }) {
  const [open, setOpen] = useState(false);
  const [lobeLift, setLobeLift] = useState("");
  const [rockerPreset, setRockerPreset] = useState("1.600");
  const [customRatio, setCustomRatio] = useState("1.600");
  const [lifterType, setLifterType] = useState<"hydraulic" | "solid">("hydraulic");
  const [lash, setLash] = useState("0.020");

  const ratio = rockerPreset === "custom" ? (parseFloat(customRatio) || 0) : (parseFloat(rockerPreset) || 0);
  const ll = parseFloat(lobeLift) || 0;
  const grossLift = ll * ratio;
  const lashVal = lifterType === "solid" ? (parseFloat(lash) || 0) : 0;
  const netLift = grossLift - lashVal;

  function applyLift() {
    if (netLift > 0) {
      onLiftCalculated(netLift.toFixed(3));
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-primary hover:underline font-medium"
        onClick={() => setOpen(true)}
      >
        Have cam lobe lift instead? Calculate valve lift &darr;
      </button>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Cam Lift &rarr; Valve Lift</p>
        <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(false)}>Hide</button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Cam Lobe Lift (inches)</Label>
        <Input id={`lobe-${id}`} type="number" step="0.001" placeholder="e.g. 0.300" value={lobeLift} onChange={e => setLobeLift(e.target.value)} />
        <Hint>From your cam card — listed as "lobe lift" or "cam lift"</Hint>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Rocker Ratio</Label>
        <Select value={rockerPreset} onValueChange={setRockerPreset}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {rockerPresets.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rockerPreset === "custom" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Custom Ratio</Label>
          <Input type="number" step="0.01" value={customRatio} onChange={e => setCustomRatio(e.target.value)} />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Lifter Type</Label>
        <Select value={lifterType} onValueChange={v => setLifterType(v as "hydraulic" | "solid")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hydraulic">Hydraulic (no lash subtracted)</SelectItem>
            <SelectItem value="solid">Solid (subtract valve lash)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lifterType === "solid" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Valve Lash (inches)</Label>
          <Input type="number" step="0.001" value={lash} onChange={e => setLash(e.target.value)} />
          <Hint>Hot lash from your cam card. Typical: 0.012\u20130.024" intake, 0.016\u20130.028" exhaust</Hint>
        </div>
      )}

      {ll > 0 && ratio > 0 && (
        <div className="bg-white border rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gross valve lift</span>
            <span className="font-bold">{grossLift.toFixed(3)}"</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{ll.toFixed(3)} x {ratio.toFixed(3)} = {grossLift.toFixed(3)}</p>
          {lifterType === "solid" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net valve lift (minus lash)</span>
                <span className="font-bold">{netLift.toFixed(3)}"</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{grossLift.toFixed(3)} - {lashVal.toFixed(3)} = {netLift.toFixed(3)}</p>
            </>
          )}
          <button
            type="button"
            onClick={applyLift}
            className="w-full mt-2 px-3 py-1.5 rounded-md bg-[#E85D04] hover:bg-[#d04f00] text-white text-sm font-semibold transition-colors"
          >
            Use {netLift.toFixed(3)}" as valve lift
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Spring rate derivation sub-component ─────────────────────── */

function RateCalculator({ onRateCalculated }: { onRateCalculated: (rate: string) => void }) {
  const [open, setOpen] = useState(false);
  const [seatP, setSeatP] = useState("");
  const [openP, setOpenP] = useState("");
  const [lift, setLift] = useState("");

  const sp = parseFloat(seatP) || 0;
  const op = parseFloat(openP) || 0;
  const l = parseFloat(lift) || 0;
  const derivedRate = l > 0 ? (op - sp) / l : 0;

  function applyRate() {
    if (derivedRate > 0) {
      onRateCalculated(derivedRate.toFixed(0));
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-primary hover:underline font-medium"
        onClick={() => setOpen(true)}
      >
        Don't know your spring rate? Calculate from seat &amp; open pressure &darr;
      </button>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Derive Spring Rate</p>
        <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(false)}>Hide</button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Seat Pressure (lb)</Label>
        <Input type="number" step="1" placeholder="e.g. 120" value={seatP} onChange={e => setSeatP(e.target.value)} />
        <Hint>Pressure at installed height (from spring spec card)</Hint>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Open Pressure (lb)</Label>
        <Input type="number" step="1" placeholder="e.g. 340" value={openP} onChange={e => setOpenP(e.target.value)} />
        <Hint>Pressure at max lift height (from spring spec card)</Hint>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Valve Lift Used for Open Pressure (inches)</Label>
        <Input type="number" step="0.001" placeholder="e.g. 0.600" value={lift} onChange={e => setLift(e.target.value)} />
        <Hint>The lift at which the manufacturer measured open pressure</Hint>
      </div>

      {sp > 0 && op > 0 && l > 0 && (
        <div className="bg-white border rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Derived spring rate</span>
            <span className="font-bold">{derivedRate.toFixed(0)} lb/in</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">({op.toFixed(0)} - {sp.toFixed(0)}) / {l.toFixed(3)} = {derivedRate.toFixed(1)}</p>
          <button
            type="button"
            onClick={applyRate}
            className="w-full mt-2 px-3 py-1.5 rounded-md bg-[#E85D04] hover:bg-[#d04f00] text-white text-sm font-semibold transition-colors"
          >
            Use {derivedRate.toFixed(0)} lb/in as spring rate
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Spring measurement diagram ──────────────────────────────── */

function SpringMeasurementDiagram() {
  // Spring geometry
  const springTop = 30;
  const springBot = 260;
  const springH = springBot - springTop;
  const cx = 180; // center x of spring
  const coilODHalf = 65; // half of OD visual
  const wireR = 7; // wire visual radius
  const numCoils = 7; // visual coils (5.5 active + ~1.5 dead)
  const coilSpacing = springH / (numCoils + 0.5);

  // Build coil paths (sine-wave style cross section)
  const coilPaths: string[] = [];
  for (let i = 0; i <= numCoils; i++) {
    const y = springTop + i * coilSpacing;
    // Each coil is an arc from left to right
    coilPaths.push(`M ${cx - coilODHalf} ${y} Q ${cx} ${y + coilSpacing * 0.5} ${cx + coilODHalf} ${y}`);
    if (i < numCoils) {
      coilPaths.push(`M ${cx + coilODHalf} ${y} Q ${cx} ${y + coilSpacing * 0.5} ${cx - coilODHalf} ${y + coilSpacing}`);
    }
  }

  const deadCoilY1 = springBot - coilSpacing * 0.5;
  const deadCoilY2 = springBot;

  return (
    <svg viewBox="0 0 420 310" className="w-full max-w-[420px] mx-auto" aria-label="Valve spring measurement diagram">
      {/* Background plates (top and bottom) */}
      <rect x={cx - coilODHalf - 15} y={springTop - 8} width={(coilODHalf + 15) * 2} height={8} rx={2} fill="#888" opacity={0.3} />
      <rect x={cx - coilODHalf - 15} y={springBot} width={(coilODHalf + 15) * 2} height={8} rx={2} fill="#888" opacity={0.3} />

      {/* Coil wire - draw as thick stroked paths */}
      {coilPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#555" strokeWidth={wireR * 2} strokeLinecap="round" />
      ))}
      {/* Wire highlight for 3D effect */}
      {coilPaths.map((d, i) => (
        <path key={`h-${i}`} d={d} fill="none" stroke="#999" strokeWidth={wireR * 0.8} strokeLinecap="round" />
      ))}

      {/* Dead coils shading */}
      <rect x={cx - coilODHalf - 5} y={deadCoilY1} width={(coilODHalf + 5) * 2} height={coilSpacing * 0.8} fill="#E85D04" opacity={0.12} rx={3} />
      <text x={cx} y={deadCoilY1 + coilSpacing * 0.45} textAnchor="middle" className="fill-[#E85D04] text-[9px] font-semibold">dead coils</text>

      {/* ── FREE LENGTH dimension (left side) ── */}
      <line x1={55} y1={springTop} x2={55} y2={springBot} stroke="#E85D04" strokeWidth={1.5} markerStart="url(#arrowUp)" markerEnd="url(#arrowDown)" />
      <line x1={50} y1={springTop} x2={cx - coilODHalf - 20} y2={springTop} stroke="#E85D04" strokeWidth={0.5} strokeDasharray="3,2" />
      <line x1={50} y1={springBot} x2={cx - coilODHalf - 20} y2={springBot} stroke="#E85D04" strokeWidth={0.5} strokeDasharray="3,2" />
      <text x={52} y={(springTop + springBot) / 2 - 6} textAnchor="middle" className="fill-[#E85D04] text-[11px] font-bold" transform={`rotate(-90, 52, ${(springTop + springBot) / 2})`}>
        Free Length
      </text>

      {/* ── OD dimension (bottom) ── */}
      <line x1={cx - coilODHalf} y1={springBot + 25} x2={cx + coilODHalf} y2={springBot + 25} stroke="#2563eb" strokeWidth={1.5} markerStart="url(#arrowLeft)" markerEnd="url(#arrowRight)" />
      <line x1={cx - coilODHalf} y1={springBot + 8} x2={cx - coilODHalf} y2={springBot + 30} stroke="#2563eb" strokeWidth={0.5} strokeDasharray="3,2" />
      <line x1={cx + coilODHalf} y1={springBot + 8} x2={cx + coilODHalf} y2={springBot + 30} stroke="#2563eb" strokeWidth={0.5} strokeDasharray="3,2" />
      <text x={cx} y={springBot + 43} textAnchor="middle" className="fill-[#2563eb] text-[11px] font-bold">Outside Diameter (OD)</text>

      {/* ── Wire diameter callout (right side, zoomed bubble) ── */}
      {(() => {
        const wireY = springTop + coilSpacing * 2;
        const bubbleX = 330;
        const bubbleY = 50;
        return (
          <>
            {/* Leader line from coil to bubble */}
            <line x1={cx + coilODHalf + 5} y1={wireY} x2={bubbleX - 28} y2={bubbleY + 20} stroke="#16a34a" strokeWidth={1} strokeDasharray="4,2" />
            {/* Zoom bubble */}
            <circle cx={bubbleX} cy={bubbleY + 20} r={28} fill="white" stroke="#16a34a" strokeWidth={1.5} />
            {/* Wire cross-section inside bubble */}
            <circle cx={bubbleX} cy={bubbleY + 20} r={12} fill="#888" opacity={0.4} />
            <circle cx={bubbleX} cy={bubbleY + 20} r={12} fill="none" stroke="#16a34a" strokeWidth={1.5} />
            {/* Diameter line across wire */}
            <line x1={bubbleX - 12} y1={bubbleY + 20} x2={bubbleX + 12} y2={bubbleY + 20} stroke="#16a34a" strokeWidth={1.5} markerStart="url(#arrowLeftG)" markerEnd="url(#arrowRightG)" />
            <text x={bubbleX} y={bubbleY + 60} textAnchor="middle" className="fill-[#16a34a] text-[10px] font-bold">Wire</text>
            <text x={bubbleX} y={bubbleY + 71} textAnchor="middle" className="fill-[#16a34a] text-[10px] font-bold">Diameter</text>
          </>
        );
      })()}

      {/* ── Active coils callout (right side) ── */}
      {(() => {
        const acTop = springTop + coilSpacing * 0.3;
        const acBot = deadCoilY1 - coilSpacing * 0.1;
        const acX = cx + coilODHalf + 30;
        return (
          <>
            <line x1={acX} y1={acTop} x2={acX} y2={acBot} stroke="#9333ea" strokeWidth={1.5} markerStart="url(#arrowUpP)" markerEnd="url(#arrowDownP)" />
            <text x={acX + 4} y={(acTop + acBot) / 2 - 6} className="fill-[#9333ea] text-[10px] font-bold" transform={`rotate(-90, ${acX + 4}, ${(acTop + acBot) / 2})`} textAnchor="middle">
              Active Coils
            </text>
            {/* Brace ticks */}
            <line x1={acX - 4} y1={acTop} x2={acX + 4} y2={acTop} stroke="#9333ea" strokeWidth={1} />
            <line x1={acX - 4} y1={acBot} x2={acX + 4} y2={acBot} stroke="#9333ea" strokeWidth={1} />
          </>
        );
      })()}

      {/* ── Coil bind callout (far left) ── */}
      {(() => {
        const bindH = springBot - (springH * 0.45); // visual bind height position
        return (
          <>
            <line x1={25} y1={bindH} x2={25} y2={springBot} stroke="#dc2626" strokeWidth={1.5} markerStart="url(#arrowUpR)" markerEnd="url(#arrowDownR)" />
            <line x1={20} y1={bindH} x2={45} y2={bindH} stroke="#dc2626" strokeWidth={0.5} strokeDasharray="3,2" />
            <text x={22} y={(bindH + springBot) / 2 - 6} textAnchor="middle" className="fill-[#dc2626] text-[9px] font-bold" transform={`rotate(-90, 22, ${(bindH + springBot) / 2})`}>
              Coil Bind
            </text>
          </>
        );
      })()}

      {/* Arrow markers */}
      <defs>
        {/* Orange arrows (free length) */}
        <marker id="arrowUp" viewBox="0 0 6 6" refX={3} refY={0} markerWidth={6} markerHeight={6} orient="auto"><path d="M0,6 L3,0 L6,6" fill="#E85D04" /></marker>
        <marker id="arrowDown" viewBox="0 0 6 6" refX={3} refY={6} markerWidth={6} markerHeight={6} orient="auto"><path d="M0,0 L3,6 L6,0" fill="#E85D04" /></marker>
        {/* Blue arrows (OD) */}
        <marker id="arrowLeft" viewBox="0 0 6 6" refX={0} refY={3} markerWidth={6} markerHeight={6} orient="auto"><path d="M6,0 L0,3 L6,6" fill="#2563eb" /></marker>
        <marker id="arrowRight" viewBox="0 0 6 6" refX={6} refY={3} markerWidth={6} markerHeight={6} orient="auto"><path d="M0,0 L6,3 L0,6" fill="#2563eb" /></marker>
        {/* Green arrows (wire) */}
        <marker id="arrowLeftG" viewBox="0 0 6 6" refX={0} refY={3} markerWidth={5} markerHeight={5} orient="auto"><path d="M6,0 L0,3 L6,6" fill="#16a34a" /></marker>
        <marker id="arrowRightG" viewBox="0 0 6 6" refX={6} refY={3} markerWidth={5} markerHeight={5} orient="auto"><path d="M0,0 L6,3 L0,6" fill="#16a34a" /></marker>
        {/* Purple arrows (active coils) */}
        <marker id="arrowUpP" viewBox="0 0 6 6" refX={3} refY={0} markerWidth={5} markerHeight={5} orient="auto"><path d="M0,6 L3,0 L6,6" fill="#9333ea" /></marker>
        <marker id="arrowDownP" viewBox="0 0 6 6" refX={3} refY={6} markerWidth={5} markerHeight={5} orient="auto"><path d="M0,0 L3,6 L6,0" fill="#9333ea" /></marker>
        {/* Red arrows (coil bind) */}
        <marker id="arrowUpR" viewBox="0 0 6 6" refX={3} refY={0} markerWidth={5} markerHeight={5} orient="auto"><path d="M0,6 L3,0 L6,6" fill="#dc2626" /></marker>
        <marker id="arrowDownR" viewBox="0 0 6 6" refX={3} refY={6} markerWidth={5} markerHeight={5} orient="auto"><path d="M0,0 L3,6 L6,0" fill="#dc2626" /></marker>
      </defs>
    </svg>
  );
}

/* ── Component ────────────────────────────────────────────────── */

export default function ValveSpringCalculator() {
  const { activeBuild, getField, setField: setBuildField } = useBuildContext();

  /* Tab 1: Coil Bind Check */
  const [installedHeight, setInstalledHeight] = useState("1.800");
  const [coilBindHeight, setCoilBindHeight] = useState("1.150");
  const [maxLift, setMaxLift] = useState("0.480");
  const [appType, setAppType] = useState<AppType>("street");

  /* Tab 2: Max Safe Lift */
  const [mslInstalled, setMslInstalled] = useState("1.800");
  const [mslBindHeight, setMslBindHeight] = useState("1.150");
  const [mslAppType, setMslAppType] = useState<AppType>("street");

  /* Tab 3: Shimming */
  const [measuredHeight, setMeasuredHeight] = useState("1.825");
  const [targetHeight, setTargetHeight] = useState("1.800");

  /* Tab 4: Pressure Check */
  const [springRate, setSpringRate] = useState("320");
  const [seatPressure, setSeatPressure] = useState("115");
  const [pressureLift, setPressureLift] = useState("0.480");
  const [camType, setCamType] = useState<CamType>("hyd-flat");
  const [pressureTableOpen, setPressureTableOpen] = useState(false);

  /* Tab 5: Retainer-to-Seal */
  const [retainerToSeal, setRetainerToSeal] = useState("");
  const [retainerLift, setRetainerLift] = useState("0.480");

  /* Tab 7: Spring ID */
  const [sidFreeLength, setSidFreeLength] = useState("");
  const [sidOD, setSidOD] = useState("");
  const [sidWireDia, setSidWireDia] = useState("");
  const [sidActiveCoils, setSidActiveCoils] = useState("");
  const [sidStyle, setSidStyle] = useState<"single" | "dual" | "beehive">("single");
  const [sidCoilBind, setSidCoilBind] = useState("");
  const [sidPressure1, setSidPressure1] = useState("");
  const [sidHeight1, setSidHeight1] = useState("");
  const [sidPressure2, setSidPressure2] = useState("");
  const [sidHeight2, setSidHeight2] = useState("");

  /* Tab 6: What-If Height */
  const [wiSpecHeight, setWiSpecHeight] = useState("1.800");
  const [wiSpecSeatPressure, setWiSpecSeatPressure] = useState("130");
  const [wiSpringRate, setWiSpringRate] = useState("320");
  const [wiCustomHeight, setWiCustomHeight] = useState("");
  const [wiValveLift, setWiValveLift] = useState("0.500");
  const [wiCamType, setWiCamType] = useState<CamType>("hyd-roller-street");

  // Pre-fill from build data
  useEffect(() => {
    if (!activeBuild) return;
    const liftInt = getField("cam.liftInt");
    const rockerRatio = getField("valvetrain.rockerRatio");
    if (liftInt && rockerRatio) {
      const valveLift = (parseFloat(liftInt) * parseFloat(rockerRatio)).toFixed(3);
      setMaxLift(valveLift);
      setPressureLift(valveLift);
      setRetainerLift(valveLift);
      setWiValveLift(valveLift);
    } else if (liftInt) {
      setMaxLift(liftInt);
      setPressureLift(liftInt);
      setRetainerLift(liftInt);
    }
    const seatP = getField("valvetrain.springSeatPressure");
    if (seatP) {
      setSeatPressure(seatP);
      setWiSpecSeatPressure(seatP);
    }
    const openP = getField("valvetrain.springOpenPressure");
    if (openP) setSpringRate(openP); // approximate
  }, [activeBuild?.id]);

  /* ── Tab 1 calculations ─────────────────────────────────────── */
  const ih = parseFloat(installedHeight) || 0;
  const cbh = parseFloat(coilBindHeight) || 0;
  const ml = parseFloat(maxLift) || 0;
  const margin = appMargins[appType].margin;

  const compressedHeight = ih - ml;
  const clearance = compressedHeight - cbh;
  const bindZone = getBindZone(clearance, margin);

  /* ── Tab 2 calculations ─────────────────────────────────────── */
  const mslIh = parseFloat(mslInstalled) || 0;
  const mslCbh = parseFloat(mslBindHeight) || 0;
  const mslMargin = appMargins[mslAppType].margin;
  const maxSafeLift = mslIh - mslCbh - mslMargin;

  /* ── Tab 3 calculations ─────────────────────────────────────── */
  const mh = parseFloat(measuredHeight) || 0;
  const th = parseFloat(targetHeight) || 0;
  const shimRequired = mh - th;
  const shimCombo = getShimCombo(Math.max(0, shimRequired));
  const actualAfterShim = shimRequired > 0 ? mh - shimCombo.total : mh;

  /* ── Tab 4 calculations ─────────────────────────────────────── */
  const rate = parseFloat(springRate) || 0;
  const seat = parseFloat(seatPressure) || 0;
  const pLift = parseFloat(pressureLift) || 0;
  const openPressure = seat + rate * pLift;
  const cam = camTypes[camType];
  const seatZone = getPressureZone(seat, cam.seatMin, cam.seatMax);
  const openZone = getPressureZone(openPressure, cam.openMin, cam.openMax);

  function getCombinedPressureZone(): { label: string; color: string; bg: string } {
    const zones = [seatZone, openZone];
    const hasRed = zones.some(z => z.color === "text-red-700");
    const hasYellow = zones.some(z => z.color === "text-yellow-700");
    if (hasRed) return { label: "Outside recommended range", color: "text-red-700", bg: "bg-red-50 border-red-200" };
    if (hasYellow) return { label: "Near edge of recommended range", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
    return { label: "Within recommended range", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  }

  const combinedZone = getCombinedPressureZone();

  /* ── Tab 5 calculations ─────────────────────────────────────── */
  const rts = parseFloat(retainerToSeal) || 0;
  const rl = parseFloat(retainerLift) || 0;
  const retainerClearance = rts - rl;
  const retainerZone = getRetainerZone(retainerClearance);

  /* ── Tab 6 calculations ─────────────────────────────────────── */
  const wiSpecH = parseFloat(wiSpecHeight) || 0;
  const wiSpecSeat = parseFloat(wiSpecSeatPressure) || 0;
  const wiRate = parseFloat(wiSpringRate) || 0;
  const wiCustomH = parseFloat(wiCustomHeight) || 0;
  const wiLift = parseFloat(wiValveLift) || 0;
  const wiCam = camTypes[wiCamType];

  // Height change: shorter install = more preload = higher pressure
  const wiHeightDelta = wiSpecH - wiCustomH; // positive = shorter = more pressure
  const wiNewSeat = wiSpecSeat + wiRate * wiHeightDelta;
  const wiNewOpen = wiNewSeat + wiRate * wiLift;
  const wiHasResult = wiCustomH > 0 && wiSpecH > 0 && wiSpecSeat > 0 && wiRate > 0;

  const wiSeatZone = wiHasResult ? getPressureZone(wiNewSeat, wiCam.seatMin, wiCam.seatMax) : null;
  const wiOpenZone = wiHasResult && wiLift > 0 ? getPressureZone(wiNewOpen, wiCam.openMin, wiCam.openMax) : null;

  function getWiCombinedZone(): { label: string; color: string; bg: string } | null {
    if (!wiSeatZone) return null;
    const zones = [wiSeatZone, wiOpenZone].filter(Boolean) as { label: string; color: string; bg: string }[];
    const hasRed = zones.some(z => z.color === "text-red-700");
    const hasYellow = zones.some(z => z.color === "text-yellow-700");
    if (hasRed) return { label: "Outside recommended range", color: "text-red-700", bg: "bg-red-50 border-red-200" };
    if (hasYellow) return { label: "Near edge of recommended range", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
    return { label: "Within recommended range", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  }

  const wiCombinedZone = getWiCombinedZone();

  /* ── Tab 7 calculations ─────────────────────────────────────── */
  const sidFL = parseFloat(sidFreeLength) || 0;
  const sidODv = parseFloat(sidOD) || 0;
  const sidWire = parseFloat(sidWireDia) || 0;
  const sidCoils = parseFloat(sidActiveCoils) || 0;
  const sidID = sidODv > 0 && sidWire > 0 ? sidODv - 2 * sidWire : 0;
  const sidDeadCoils = 1.5; // typical closed-end ground springs
  const sidEstBind = sidWire > 0 && sidCoils > 0 ? sidWire * (sidCoils + sidDeadCoils) : 0;
  const sidActualBind = parseFloat(sidCoilBind) || 0;
  const sidBindHeight = sidActualBind > 0 ? sidActualBind : sidEstBind;

  // Rate derivation
  const sidP1 = parseFloat(sidPressure1) || 0;
  const sidH1 = parseFloat(sidHeight1) || 0;
  const sidP2 = parseFloat(sidPressure2) || 0;
  const sidH2 = parseFloat(sidHeight2) || 0;

  let sidRate = 0;
  let sidRateMethod = "";
  if (sidP1 > 0 && sidH1 > 0 && sidP2 > 0 && sidH2 > 0 && sidH1 !== sidH2) {
    // Two-point method: rate = pressure difference / height difference
    sidRate = Math.abs(sidP2 - sidP1) / Math.abs(sidH1 - sidH2);
    sidRateMethod = "two-point";
  } else if (sidP1 > 0 && sidH1 > 0 && sidFL > 0 && sidH1 < sidFL) {
    // One-point method: rate = pressure / deflection from free length
    sidRate = sidP1 / (sidFL - sidH1);
    sidRateMethod = "one-point";
  }

  // Common installed heights for the table
  const sidHeights = [1.700, 1.750, 1.800, 1.850, 1.900, 1.950, 2.000, 2.050, 2.100];
  const sidLifts = [0.400, 0.450, 0.500, 0.550, 0.600, 0.650];

  function sidSeatAt(height: number): number | null {
    if (sidRate <= 0 || sidFL <= 0) return null;
    const deflection = sidFL - height;
    if (deflection <= 0) return null;
    return sidRate * deflection;
  }

  function sidOpenAt(height: number, lift: number): number | null {
    const seatP = sidSeatAt(height);
    if (seatP === null) return null;
    return seatP + sidRate * lift;
  }

  function sidMatchCamTypes(seatP: number, openP: number): string[] {
    const matches: string[] = [];
    for (const [, c] of Object.entries(camTypes) as [CamType, typeof camTypes[CamType]][]) {
      const seatOk = seatP >= c.seatMin * 0.85 && seatP <= c.seatMax * 1.15;
      const openOk = openP >= c.openMin * 0.85 && openP <= c.openMax * 1.15;
      if (seatOk && openOk) matches.push(c.label);
    }
    return matches;
  }

  // Retainer ID compatibility
  function sidRetainerFit(id: number): string {
    if (id <= 0) return "";
    if (id >= 0.990 && id <= 1.070) return "Standard small-block Chevy (1.055\" locator ID)";
    if (id >= 1.070 && id <= 1.130) return "Common aftermarket (1.100\" locator ID)";
    if (id >= 1.200 && id <= 1.280) return "Large spring / Ford (1.250\" locator ID)";
    if (id >= 1.280 && id <= 1.350) return "Oversized (1.300\" locator ID)";
    if (id >= 1.390 && id <= 1.480) return "Large dual spring (1.437\" locator ID)";
    if (id >= 1.480 && id <= 1.570) return "Extra large dual/triple (1.500\"+ locator ID)";
    return "Non-standard — measure your retainer locator carefully";
  }

  const sidHasBasic = sidFL > 0 && sidODv > 0 && sidWire > 0;
  const sidHasRate = sidRate > 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Valve Spring Calculator | Coil Bind, Pressure & Shims"
        description="Check coil bind clearance, calculate max safe valve lift, figure shim combinations, verify seat and open pressures, and check retainer-to-seal clearance. Free engine builder tool."
        canonical="/calculators/valve-spring"
        keywords="valve spring calculator, coil bind calculator, valve spring pressure, valve spring shim calculator, max valve lift, seat pressure, open pressure, spring rate calculator, retainer to seal clearance"
      />
      <h1 className="text-3xl font-bold mb-2">Valve Spring Calculator</h1>
      <p className="text-muted-foreground mb-8">Coil bind check, max safe lift, shimming guide, pressure verification, and retainer-to-seal clearance for any cam type.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <Tabs defaultValue="bind" className="space-y-6">
        <TabsList className="w-full grid grid-cols-7 h-auto">
          <TabsTrigger value="bind" className="text-xs sm:text-sm py-2">Coil Bind</TabsTrigger>
          <TabsTrigger value="max-lift" className="text-xs sm:text-sm py-2">Max Lift</TabsTrigger>
          <TabsTrigger value="shimming" className="text-xs sm:text-sm py-2">Shimming</TabsTrigger>
          <TabsTrigger value="pressure" className="text-xs sm:text-sm py-2">Pressure</TabsTrigger>
          <TabsTrigger value="retainer" className="text-xs sm:text-sm py-2">Retainer</TabsTrigger>
          <TabsTrigger value="what-if" className="text-xs sm:text-sm py-2">What If</TabsTrigger>
          <TabsTrigger value="spring-id" className="text-xs sm:text-sm py-2">Spring ID</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 1: COIL BIND CHECK                                */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="bind">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Spring Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={installedHeight} onChange={e => setInstalledHeight(e.target.value)} />
                  <Hint>From spring manufacturer spec or measured at assembly. Aluminum heads grow 0.005\u20130.008" when hot, reducing this value.</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Coil Bind Height (inches)</Label>
                  <Input type="number" step="0.001" value={coilBindHeight} onChange={e => setCoilBindHeight(e.target.value)} />
                  <Hint>From spring manufacturer datasheet \u2014 not a calculated value</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Max Valve Lift (inches)</Label>
                  <Input type="number" step="0.001" value={maxLift} onChange={e => setMaxLift(e.target.value)} />
                  <Hint>At the valve, after rocker ratio. Not cam lobe lift.</Hint>
                </div>

                {ml > 0 && ml < 0.350 && (
                  <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="text-yellow-700 text-sm font-bold">Did you enter cam lobe lift by mistake?</p>
                    <p className="text-xs text-muted-foreground mt-1">A value under 0.350" is unusual for valve lift. Most valve lifts are 0.450\u20130.650". If you entered your cam lobe lift, multiply it by your rocker ratio first, or use the converter below.</p>
                  </div>
                )}

                <LiftConverter id="bind" onLiftCalculated={setMaxLift} />

                <div className="space-y-1">
                  <Label>Application</Label>
                  <Select value={appType} onValueChange={v => setAppType(v as AppType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street (0.060" margin)</SelectItem>
                      <SelectItem value="performance">Performance (0.070" margin)</SelectItem>
                      <SelectItem value="race">Race (0.080" margin)</SelectItem>
                      <SelectItem value="extreme">Extreme / Drag (0.100" margin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Compressed Height at Max Lift</p>
                    <p className="text-3xl font-bold">{compressedHeight.toFixed(3)}"</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Clearance to Coil Bind</p>
                    <p className="text-5xl font-bold text-primary">{clearance.toFixed(3)}"</p>
                    <p className="text-gray-400 text-xs mt-1">Required margin: {margin.toFixed(3)}" ({appMargins[appType].label})</p>
                  </div>
                </CardContent>
              </Card>

              <div className={`p-4 rounded-lg border ${bindZone.bg}`}>
                <p className={`font-bold text-lg ${bindZone.color}`}>{bindZone.label}</p>
                <p className="text-sm mt-1 text-muted-foreground">{bindZone.message}</p>
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">compressed = installed - lift = {ih.toFixed(3)} - {ml.toFixed(3)} = {compressedHeight.toFixed(3)}</p>
                <p className="font-mono font-medium mt-1">clearance = compressed - bind = {compressedHeight.toFixed(3)} - {cbh.toFixed(3)} = {clearance.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 2: MAX SAFE LIFT                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="max-lift">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Spring Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={mslInstalled} onChange={e => setMslInstalled(e.target.value)} />
                  <Hint>Aluminum heads grow 0.005\u20130.008" when hot, reducing this value.</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Coil Bind Height (inches)</Label>
                  <Input type="number" step="0.001" value={mslBindHeight} onChange={e => setMslBindHeight(e.target.value)} />
                  <Hint>From spring manufacturer datasheet</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Application</Label>
                  <Select value={mslAppType} onValueChange={v => setMslAppType(v as AppType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street (0.060" margin)</SelectItem>
                      <SelectItem value="performance">Performance (0.070" margin)</SelectItem>
                      <SelectItem value="race">Race (0.080" margin)</SelectItem>
                      <SelectItem value="extreme">Extreme / Drag (0.100" margin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Maximum Safe Valve Lift</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Max Lift ({appMargins[mslAppType].label})</p>
                    <p className="text-5xl font-bold text-primary">{maxSafeLift.toFixed(3)}"</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>All Application Levels</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted">
                          <th className="text-left p-3">Application</th>
                          <th className="text-right p-3">Margin</th>
                          <th className="text-right p-3">Max Lift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.entries(appMargins) as [AppType, { label: string; margin: number }][]).map(([key, { label, margin: m }], i) => {
                          const lift = mslIh - mslCbh - m;
                          return (
                            <tr key={key} className={`${i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"} ${key === mslAppType ? "font-bold" : ""}`}>
                              <td className="p-3">{label}</td>
                              <td className="text-right p-3">{m.toFixed(3)}"</td>
                              <td className={`text-right p-3 font-bold ${key === mslAppType ? "text-primary" : ""}`}>{lift.toFixed(3)}"</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">max_lift = installed - bind - margin = {mslIh.toFixed(3)} - {mslCbh.toFixed(3)} - {mslMargin.toFixed(3)} = {maxSafeLift.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 3: SHIMMING                                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="shimming">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Measured Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={measuredHeight} onChange={e => setMeasuredHeight(e.target.value)} />
                  <Hint>What you actually measured after assembly</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Target Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={targetHeight} onChange={e => setTargetHeight(e.target.value)} />
                  <Hint>From cam card or spring manufacturer recommendation</Hint>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {shimRequired < 0 ? (
                <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                  <p className="font-bold text-lg text-red-700">Cannot Shim Down</p>
                  <p className="text-sm mt-1 text-muted-foreground">Measured height ({mh.toFixed(3)}") is less than target ({th.toFixed(3)}"). You cannot reduce installed height with shims. Options: different retainer, different valve locks, or machine the spring seat deeper.</p>
                </div>
              ) : (
                <>
                  <Card className="bg-[#1a1a1a] text-white">
                    <CardHeader><CardTitle>Shim Required</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-gray-400 text-sm">Required Shim Thickness</p>
                        <p className="text-5xl font-bold text-primary">{shimRequired.toFixed(3)}"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Recommended Combination</p>
                        {shimCombo.shims.length > 0 ? (
                          <>
                            <p className="text-2xl font-bold">{formatShimCombo(shimCombo.shims)}</p>
                            <p className="text-gray-400 text-xs mt-1">Total: {shimCombo.total.toFixed(3)}"</p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold">No shim needed</p>
                        )}
                      </div>
                      {shimCombo.total > 0 && Math.abs(shimRequired - shimCombo.total) > 0.001 && (
                        <div className="border-t border-gray-700 pt-3">
                          <p className="text-gray-400 text-sm">Remainder Not Covered by Stock Shims</p>
                          <p className="text-xl font-bold text-yellow-400">{(shimRequired - shimCombo.total).toFixed(3)}"</p>
                          <p className="text-gray-400 text-xs mt-1">This amount is below the smallest stock shim (0.015"). The nearest combination overshoots or undershoots slightly.</p>
                        </div>
                      )}
                      <div className="border-t border-gray-700 pt-3">
                        <p className="text-gray-400 text-sm">Actual Installed Height After Shimming</p>
                        <p className="text-3xl font-bold">{actualAfterShim.toFixed(3)}"</p>
                      </div>
                    </CardContent>
                  </Card>

                  {shimRequired > 0 && shimRequired < 0.015 && (
                    <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                      <p className="font-bold text-yellow-700">Below Minimum Shim</p>
                      <p className="text-sm mt-1 text-muted-foreground">Required shim ({shimRequired.toFixed(3)}") is less than the smallest stock shim (0.015"). You may not need to shim, or use a 0.015" shim to get closer to target.</p>
                    </div>
                  )}
                </>
              )}

              <Card>
                <CardHeader><CardTitle>Stock Shim Sizes</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {SHIM_SIZES.slice().reverse().map(size => (
                      <div key={size} className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-lg font-bold">{size.toFixed(3)}"</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Standard valve spring shim thicknesses. Combine as needed to reach target.</p>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">shim = measured - target = {mh.toFixed(3)} - {th.toFixed(3)} = {shimRequired.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 4: PRESSURE CHECK                                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="pressure">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Spring Rate (lb/in)</Label>
                  <Input type="number" step="1" value={springRate} onChange={e => setSpringRate(e.target.value)} />
                </div>

                <RateCalculator onRateCalculated={(r) => setSpringRate(r)} />

                <div className="space-y-1">
                  <Label>Seat Pressure at Installed Height (lb)</Label>
                  <Input type="number" step="1" value={seatPressure} onChange={e => setSeatPressure(e.target.value)} />
                  <Hint>Measured at installed height, not free length</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Max Valve Lift (inches)</Label>
                  <Input type="number" step="0.001" value={pressureLift} onChange={e => setPressureLift(e.target.value)} />
                  <Hint>At the valve, after rocker ratio. Not cam lobe lift.</Hint>
                </div>

                {pLift > 0 && pLift < 0.350 && (
                  <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="text-yellow-700 text-sm font-bold">Did you enter cam lobe lift by mistake?</p>
                    <p className="text-xs text-muted-foreground mt-1">A value under 0.350" is unusual for valve lift. If you entered your cam lobe lift, multiply it by your rocker ratio first, or use the converter below.</p>
                  </div>
                )}

                <LiftConverter id="pressure" onLiftCalculated={setPressureLift} />

                <div className="space-y-1">
                  <Label>Cam Type</Label>
                  <Select value={camType} onValueChange={v => setCamType(v as CamType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(camTypes) as [CamType, typeof cam][]).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Open Pressure at Max Lift</p>
                    <p className="text-5xl font-bold text-primary">{openPressure.toFixed(0)} lb</p>
                    <p className="text-gray-400 text-xs mt-1">Range for {cam.label}: {cam.openMin}\u2013{cam.openMax} lb</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Seat Pressure</p>
                    <p className="text-3xl font-bold">{seat.toFixed(0)} lb</p>
                    <p className="text-gray-400 text-xs mt-1">Range for {cam.label}: {cam.seatMin}\u2013{cam.seatMax} lb</p>
                  </div>
                </CardContent>
              </Card>

              <div className={`p-4 rounded-lg border ${combinedZone.bg}`}>
                <p className={`font-bold text-lg ${combinedZone.color}`}>{combinedZone.label}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={seatZone.color}>Seat pressure: {seatZone.label} ({cam.seatMin}\u2013{cam.seatMax} lb)</p>
                  <p className={openZone.color}>Open pressure: {openZone.label} ({cam.openMin}\u2013{cam.openMax} lb)</p>
                </div>
              </div>

              {(camType === "hyd-flat" || camType === "hyd-roller-street" || camType === "hyd-roller-perf") && openZone.color === "text-red-700" && openPressure > cam.openMax && (
                <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                  <p className="font-bold text-red-700">Over-sprung Warning</p>
                  <p className="text-sm mt-1 text-muted-foreground">
                    {camType === "hyd-flat"
                      ? "Hydraulic flat tappet cams are extremely sensitive to excessive spring pressure. Over-sprung flat tappet cams scuff and wipe lobes rapidly \u2014 often within the first 20 minutes of break-in. This is the single most common spring mistake in flat tappet builds."
                      : "Excessive spring pressure on hydraulic lifters causes the lifter to collapse under load, losing lift at RPM. The hydraulic mechanism cannot hold against pressures above its design range."}
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">open = seat + (rate x lift) = {seat.toFixed(0)} + ({rate.toFixed(0)} x {pLift.toFixed(3)}) = {openPressure.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Note: assumes linear spring rate. Most springs are progressive above 60\u201370% travel, so actual open pressure is typically 5\u201310% higher than calculated.</p>
              </div>

              {/* Collapsible pressure reference table */}
              <Card>
                <CardHeader>
                  <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => setPressureTableOpen(!pressureTableOpen)}
                  >
                    <CardTitle>Pressure Range Reference</CardTitle>
                    <span className="text-muted-foreground text-sm">{pressureTableOpen ? "\u25b2 Hide" : "\u25bc Show"}</span>
                  </button>
                </CardHeader>
                {pressureTableOpen && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted">
                            <th className="text-left p-3">Cam Type</th>
                            <th className="text-right p-3">Seat (lb)</th>
                            <th className="text-right p-3">Open (lb)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Object.entries(camTypes) as [CamType, typeof cam][]).map(([key, c], i) => (
                            <tr key={key} className={`${i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"} ${key === camType ? "font-bold" : ""}`}>
                              <td className="p-3">{c.label}</td>
                              <td className="text-right p-3">{c.seatMin}\u2013{c.seatMax}</td>
                              <td className="text-right p-3">{c.openMin}\u2013{c.openMax}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 5: RETAINER-TO-SEAL CLEARANCE                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="retainer">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Retainer-to-Seal Distance at Rest (inches)</Label>
                  <Input type="number" step="0.001" placeholder="e.g. 0.550" value={retainerToSeal} onChange={e => setRetainerToSeal(e.target.value)} />
                  <Hint>Measure from the bottom of the retainer to the top of the valve seal with the valve closed. Use a caliper or depth mic.</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Max Valve Lift (inches)</Label>
                  <Input type="number" step="0.001" value={retainerLift} onChange={e => setRetainerLift(e.target.value)} />
                  <Hint>At the valve, after rocker ratio. Not cam lobe lift.</Hint>
                </div>

                {rl > 0 && rl < 0.350 && (
                  <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="text-yellow-700 text-sm font-bold">Did you enter cam lobe lift by mistake?</p>
                    <p className="text-xs text-muted-foreground mt-1">A value under 0.350" is unusual for valve lift. If you entered your cam lobe lift, multiply it by your rocker ratio first, or use the converter below.</p>
                  </div>
                )}

                <LiftConverter id="retainer" onLiftCalculated={setRetainerLift} />

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm font-bold">How to measure</p>
                  <p className="text-xs text-muted-foreground mt-1">With the spring, retainer, and locks installed on a fully assembled head (valve closed), measure the gap between the bottom face of the retainer and the top of the valve seal or the top of the valve guide boss \u2014 whichever is taller. A depth micrometer or small ruler works. This is the total travel available before the retainer contacts the seal.</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {rts > 0 ? (
                <>
                  <Card className="bg-[#1a1a1a] text-white">
                    <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-gray-400 text-sm">Clearance at Max Lift</p>
                        <p className="text-5xl font-bold text-primary">{retainerClearance.toFixed(3)}"</p>
                        <p className="text-gray-400 text-xs mt-1">Minimum recommended: 0.060"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Max Safe Lift (0.060" margin)</p>
                        <p className="text-3xl font-bold">{(rts - 0.060).toFixed(3)}"</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className={`p-4 rounded-lg border ${retainerZone.bg}`}>
                    <p className={`font-bold text-lg ${retainerZone.color}`}>{retainerZone.label}</p>
                    <p className="text-sm mt-1 text-muted-foreground">{retainerZone.message}</p>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-sm">Enter your retainer-to-seal measurement to see results. This is a physical measurement taken on the assembled head.</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Why This Matters</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>When the valve opens, the retainer moves down toward the valve seal. If the retainer contacts the seal, it destroys the seal immediately \u2014 causing oil to pour down the valve guide into the combustion chamber. On high-lift cams this is a common and expensive oversight.</p>
                  <p>If clearance is too tight, your options are: shorter-body retainer (Comp, Manley make these), shorter valve seal, machined spring pocket (moves the retainer up), or less valve lift.</p>
                  <p className="font-medium text-foreground">This is a separate check from coil bind. A spring can have plenty of coil bind clearance and still have the retainer hit the seal.</p>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">clearance = retainer_to_seal - lift = {rts.toFixed(3)} - {rl.toFixed(3)} = {retainerClearance.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>
        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 6: WHAT-IF HEIGHT                                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="what-if">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Spring Specs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Spec Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={wiSpecHeight} onChange={e => setWiSpecHeight(e.target.value)} />
                  <Hint>The installed height the manufacturer rates the spring at — from the spring spec card</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Seat Pressure at Spec Height (lb)</Label>
                  <Input type="number" step="1" value={wiSpecSeatPressure} onChange={e => setWiSpecSeatPressure(e.target.value)} />
                  <Hint>Seat pressure listed on the spring spec card at the spec installed height</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Spring Rate (lb/in)</Label>
                  <Input type="number" step="1" value={wiSpringRate} onChange={e => setWiSpringRate(e.target.value)} />
                  <Hint>From the spring spec card. If not listed, use the Pressure tab's rate calculator to derive it.</Hint>
                </div>

                <RateCalculator onRateCalculated={(r) => setWiSpringRate(r)} />

                <div className="border-t pt-4 space-y-4">
                  <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Your Setup</p>

                  <div className="space-y-1">
                    <Label>Custom Installed Height (inches)</Label>
                    <Input type="number" step="0.001" placeholder="e.g. 1.750" value={wiCustomHeight} onChange={e => setWiCustomHeight(e.target.value)} />
                    <Hint>The height you want to install the spring at — shorter adds preload, taller removes it</Hint>
                  </div>

                  <div className="space-y-1">
                    <Label>Max Valve Lift (inches)</Label>
                    <Input type="number" step="0.001" value={wiValveLift} onChange={e => setWiValveLift(e.target.value)} />
                    <Hint>At the valve, after rocker ratio. Used to calculate open pressure.</Hint>
                  </div>

                  {wiLift > 0 && wiLift < 0.350 && (
                    <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                      <p className="text-yellow-700 text-sm font-bold">Did you enter cam lobe lift by mistake?</p>
                      <p className="text-xs text-muted-foreground mt-1">A value under 0.350" is unusual for valve lift. If you entered your cam lobe lift, multiply it by your rocker ratio first, or use the converter below.</p>
                    </div>
                  )}

                  <LiftConverter id="what-if" onLiftCalculated={setWiValveLift} />

                  <div className="space-y-1">
                    <Label>Cam Type</Label>
                    <Select value={wiCamType} onValueChange={v => setWiCamType(v as CamType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(camTypes) as [CamType, typeof wiCam][]).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Hint>Used to check if pressures fall within the recommended range</Hint>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {wiHasResult ? (
                <>
                  <Card className="bg-[#1a1a1a] text-white">
                    <CardHeader><CardTitle>Pressures at {wiCustomH.toFixed(3)}" Installed Height</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-gray-400 text-sm">Seat Pressure</p>
                        <p className="text-5xl font-bold text-primary">{wiNewSeat.toFixed(0)} lb</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {wiHeightDelta > 0
                            ? `+${(wiRate * wiHeightDelta).toFixed(0)} lb from installing ${wiHeightDelta.toFixed(3)}" shorter than spec`
                            : wiHeightDelta < 0
                            ? `${(wiRate * wiHeightDelta).toFixed(0)} lb from installing ${Math.abs(wiHeightDelta).toFixed(3)}" taller than spec`
                            : "Same as spec height"}
                        </p>
                        <p className="text-gray-400 text-xs">Range for {wiCam.label}: {wiCam.seatMin}–{wiCam.seatMax} lb</p>
                      </div>
                      {wiLift > 0 && (
                        <div>
                          <p className="text-gray-400 text-sm">Open Pressure at {wiLift.toFixed(3)}" Lift</p>
                          <p className="text-5xl font-bold text-primary">{wiNewOpen.toFixed(0)} lb</p>
                          <p className="text-gray-400 text-xs mt-1">Range for {wiCam.label}: {wiCam.openMin}–{wiCam.openMax} lb</p>
                        </div>
                      )}
                      <div className="border-t border-gray-700 pt-3">
                        <p className="text-gray-400 text-sm">Original Spec</p>
                        <p className="text-lg font-bold">{wiSpecSeat.toFixed(0)} lb seat @ {wiSpecH.toFixed(3)}"</p>
                        {wiLift > 0 && (
                          <p className="text-lg font-bold">{(wiSpecSeat + wiRate * wiLift).toFixed(0)} lb open @ {wiLift.toFixed(3)}" lift</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {wiCombinedZone && (
                    <div className={`p-4 rounded-lg border ${wiCombinedZone.bg}`}>
                      <p className={`font-bold text-lg ${wiCombinedZone.color}`}>{wiCombinedZone.label}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        {wiSeatZone && <p className={wiSeatZone.color}>Seat pressure: {wiSeatZone.label} ({wiCam.seatMin}–{wiCam.seatMax} lb)</p>}
                        {wiOpenZone && <p className={wiOpenZone.color}>Open pressure: {wiOpenZone.label} ({wiCam.openMin}–{wiCam.openMax} lb)</p>}
                      </div>
                    </div>
                  )}

                  {wiNewSeat < 0 && (
                    <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                      <p className="font-bold text-red-700">Negative Seat Pressure</p>
                      <p className="text-sm mt-1 text-muted-foreground">At this installed height the spring has no preload — it would be loose on the seat. The spring is too short for this height, or you need a longer free-length spring.</p>
                    </div>
                  )}

                  {(wiCamType === "hyd-flat" || wiCamType === "hyd-roller-street" || wiCamType === "hyd-roller-perf") && wiOpenZone?.color === "text-red-700" && wiNewOpen > wiCam.openMax && (
                    <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                      <p className="font-bold text-red-700">Over-sprung Warning</p>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {wiCamType === "hyd-flat"
                          ? "Hydraulic flat tappet cams are extremely sensitive to excessive spring pressure. Over-sprung flat tappet cams scuff and wipe lobes rapidly — often within the first 20 minutes of break-in."
                          : "Excessive spring pressure on hydraulic lifters causes the lifter to collapse under load, losing lift at RPM."}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <p className="font-mono font-medium">height_change = spec - custom = {wiSpecH.toFixed(3)} - {wiCustomH.toFixed(3)} = {wiHeightDelta.toFixed(3)}</p>
                    <p className="font-mono font-medium">new_seat = spec_seat + (rate × change) = {wiSpecSeat.toFixed(0)} + ({wiRate.toFixed(0)} × {wiHeightDelta.toFixed(3)}) = {wiNewSeat.toFixed(0)}</p>
                    {wiLift > 0 && (
                      <p className="font-mono font-medium">new_open = new_seat + (rate × lift) = {wiNewSeat.toFixed(0)} + ({wiRate.toFixed(0)} × {wiLift.toFixed(3)}) = {wiNewOpen.toFixed(0)}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Assumes linear spring rate. Actual pressures may be 5–10% higher at deep compression due to progressive spring behavior.</p>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-sm">Enter your spring specs and a custom installed height to see what pressures you'd get. This lets you figure out if a spring will work at a height it wasn't designed for — like running a taller or shorter installed height than the manufacturer intended.</p>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Common scenarios:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Machined heads or valve job changed your installed height</li>
                        <li>Running a spring from a different application</li>
                        <li>Want more seat pressure by shimming shorter</li>
                        <li>Need to know if an available spring will work in your heads</li>
                        <li>Checking pressures after a valve/retainer swap changed geometry</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>How This Works</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Valve springs are rated at a specific installed height. When you install them shorter (by shimming or machining), you compress the spring more at rest, which increases the preload — raising both seat and open pressure. Installing taller does the opposite.</p>
                  <p>The math is straightforward: every 0.001" of height change multiplied by the spring rate gives you the pressure change. A 320 lb/in spring installed 0.050" shorter gains 16 lb of seat pressure and 16 lb of open pressure.</p>
                  <p className="font-medium text-foreground">This calculator assumes linear spring rate. Real springs are slightly progressive at deep compression, so actual open pressures at high lift may be 5–10% higher than calculated.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 7: SPRING ID                                      */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="spring-id">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Physical Measurements</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Free Length (inches)</Label>
                    <Input type="number" step="0.001" placeholder="e.g. 2.100" value={sidFreeLength} onChange={e => setSidFreeLength(e.target.value)} />
                    <Hint>Overall height with no load — set the spring on a flat surface and measure with calipers</Hint>
                  </div>
                  <div className="space-y-1">
                    <Label>Outside Diameter (inches)</Label>
                    <Input type="number" step="0.001" placeholder="e.g. 1.550" value={sidOD} onChange={e => setSidOD(e.target.value)} />
                    <Hint>Measure at the widest point of the coils with calipers</Hint>
                  </div>
                  <div className="space-y-1">
                    <Label>Wire Diameter (inches)</Label>
                    <Input type="number" step="0.001" placeholder="e.g. 0.177" value={sidWireDia} onChange={e => setSidWireDia(e.target.value)} />
                    <Hint>Measure the thickness of the wire itself with calipers or a micrometer</Hint>
                  </div>
                  <div className="space-y-1">
                    <Label>Active Coils (count)</Label>
                    <Input type="number" step="0.5" placeholder="e.g. 5.5" value={sidActiveCoils} onChange={e => setSidActiveCoils(e.target.value)} />
                    <Hint>Count the coils that are not touching the flat ends. The flat ground ends are "dead" coils.</Hint>
                  </div>
                  <div className="space-y-1">
                    <Label>Spring Style</Label>
                    <Select value={sidStyle} onValueChange={v => setSidStyle(v as "single" | "dual" | "beehive")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single spring (one coil)</SelectItem>
                        <SelectItem value="dual">Dual / nested (spring inside a spring)</SelectItem>
                        <SelectItem value="beehive">Beehive (tapered — wider at bottom, narrower at top)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Coil Bind Height (inches) — optional</Label>
                    <Input type="number" step="0.001" placeholder="Leave blank to estimate" value={sidCoilBind} onChange={e => setSidCoilBind(e.target.value)} />
                    <Hint>If you can compress it to solid in a vise and measure, enter it here. Otherwise we'll estimate from wire diameter and coil count.</Hint>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Where to Measure</CardTitle></CardHeader>
                <CardContent>
                  <SpringMeasurementDiagram />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                    <p><span className="font-bold text-[#E85D04]">Free Length</span> — top to bottom, no load</p>
                    <p><span className="font-bold text-[#2563eb]">OD</span> — widest point across the coils</p>
                    <p><span className="font-bold text-[#16a34a]">Wire Diameter</span> — thickness of the wire itself</p>
                    <p><span className="font-bold text-[#9333ea]">Active Coils</span> — count coils not touching the flat ends</p>
                    <p><span className="font-bold text-[#dc2626]">Coil Bind</span> — height when fully compressed (optional)</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Pressure Readings (optional)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">If you have access to a spring tester, enter one or two readings. Two readings give a more accurate rate. Without these, we can only report physical dimensions.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pressure Reading 1 (lb)</Label>
                      <Input type="number" step="1" placeholder="e.g. 130" value={sidPressure1} onChange={e => setSidPressure1(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">At Height 1 (inches)</Label>
                      <Input type="number" step="0.001" placeholder="e.g. 1.800" value={sidHeight1} onChange={e => setSidHeight1(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pressure Reading 2 (lb)</Label>
                      <Input type="number" step="1" placeholder="e.g. 290" value={sidPressure2} onChange={e => setSidPressure2(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">At Height 2 (inches)</Label>
                      <Input type="number" step="0.001" placeholder="e.g. 1.300" value={sidHeight2} onChange={e => setSidHeight2(e.target.value)} />
                    </div>
                  </div>
                  <Hint>One reading: rate is derived from free length deflection. Two readings: rate is derived directly from the pressure difference — more accurate.</Hint>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Physical profile */}
              {sidHasBasic ? (
                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader><CardTitle>Spring Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Free Length</p>
                        <p className="text-2xl font-bold">{sidFL.toFixed(3)}"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Style</p>
                        <p className="text-2xl font-bold capitalize">{sidStyle}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Outside Diameter</p>
                        <p className="text-2xl font-bold">{sidODv.toFixed(3)}"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Inside Diameter</p>
                        <p className="text-2xl font-bold">{sidID.toFixed(3)}"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Wire Diameter</p>
                        <p className="text-2xl font-bold">{sidWire.toFixed(3)}"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Active Coils</p>
                        <p className="text-2xl font-bold">{sidCoils}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <p className="text-gray-400 text-sm">
                        Coil Bind Height {sidActualBind > 0 ? "(measured)" : "(estimated)"}
                      </p>
                      <p className="text-3xl font-bold text-primary">{sidBindHeight.toFixed(3)}"</p>
                      {sidActualBind <= 0 && (
                        <p className="text-gray-400 text-xs mt-1">
                          Estimated: {sidWire.toFixed(3)}" wire x {(sidCoils + sidDeadCoils).toFixed(1)} total coils = {sidEstBind.toFixed(3)}"
                        </p>
                      )}
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <p className="text-gray-400 text-sm">Available Travel (from free)</p>
                      <p className="text-2xl font-bold">{(sidFL - sidBindHeight).toFixed(3)}"</p>
                    </div>

                    {sidID > 0 && (
                      <div className="border-t border-gray-700 pt-3">
                        <p className="text-gray-400 text-sm">Retainer Compatibility</p>
                        <p className="text-lg font-bold">{sidRetainerFit(sidID)}</p>
                      </div>
                    )}

                    {sidHasRate && (
                      <div className="border-t border-gray-700 pt-3">
                        <p className="text-gray-400 text-sm">
                          Spring Rate ({sidRateMethod === "two-point" ? "from two readings" : "from one reading"})
                        </p>
                        <p className="text-3xl font-bold text-primary">{sidRate.toFixed(0)} lb/in</p>
                        {sidRateMethod === "two-point" ? (
                          <p className="text-gray-400 text-xs mt-1">
                            ({sidP2.toFixed(0)} - {sidP1.toFixed(0)}) / ({sidH1.toFixed(3)} - {sidH2.toFixed(3)}) = {sidRate.toFixed(1)} lb/in
                          </p>
                        ) : (
                          <p className="text-gray-400 text-xs mt-1">
                            {sidP1.toFixed(0)} / ({sidFL.toFixed(3)} - {sidH1.toFixed(3)}) = {sidRate.toFixed(1)} lb/in
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-sm">Enter at least free length, outside diameter, and wire diameter to see your spring's profile. Add pressure readings from a spring tester for rate, pressure, and application matching.</p>
                  </CardContent>
                </Card>
              )}

              {/* Pressure table at common installed heights */}
              {sidHasRate && (
                <Card>
                  <CardHeader><CardTitle>Seat Pressure at Common Heights</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted">
                            <th className="text-left p-2">Installed Height</th>
                            <th className="text-right p-2">Seat Pressure</th>
                            <th className="text-right p-2">Bind Clearance</th>
                            <th className="text-left p-2">Best Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sidHeights.filter(h => h < sidFL).map((h, i) => {
                            const seatP = sidSeatAt(h);
                            if (seatP === null || seatP <= 0) return null;
                            const openAt500 = sidOpenAt(h, 0.500);
                            const matches = openAt500 !== null ? sidMatchCamTypes(seatP, openAt500) : [];
                            const bindClear = h - sidBindHeight;
                            const bindColor = bindClear < 0.060 ? "text-red-700" : bindClear < 0.080 ? "text-yellow-700" : "text-green-700";
                            return (
                              <tr key={h} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                                <td className="p-2 font-mono">{h.toFixed(3)}"</td>
                                <td className="text-right p-2 font-bold">{seatP.toFixed(0)} lb</td>
                                <td className={`text-right p-2 font-bold ${bindColor}`}>{bindClear.toFixed(3)}"</td>
                                <td className="p-2 text-xs text-muted-foreground">{matches.length > 0 ? matches[0] : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Best match is based on seat + open pressure at 0.500" lift. Bind clearance is installed height minus coil bind — needs at least 0.060" for street use.</p>
                  </CardContent>
                </Card>
              )}

              {/* Open pressure grid */}
              {sidHasRate && (
                <Card>
                  <CardHeader><CardTitle>Open Pressure Grid</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted">
                            <th className="text-left p-2">Height</th>
                            {sidLifts.map(l => (
                              <th key={l} className="text-right p-2">{l.toFixed(3)}" lift</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sidHeights.filter(h => h < sidFL).map((h, i) => {
                            const seatP = sidSeatAt(h);
                            if (seatP === null || seatP <= 0) return null;
                            return (
                              <tr key={h} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                                <td className="p-2 font-mono">{h.toFixed(3)}"</td>
                                {sidLifts.map(l => {
                                  const op = sidOpenAt(h, l);
                                  const compH = h - l;
                                  const tooClose = compH - sidBindHeight < 0.060;
                                  return (
                                    <td key={l} className={`text-right p-2 font-bold ${tooClose ? "text-red-700" : ""}`}>
                                      {op !== null ? `${op.toFixed(0)}` : "—"}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Values in red exceed coil bind safety margin at that height/lift combination. All pressures in lb.</p>
                  </CardContent>
                </Card>
              )}

              {/* Max safe lift at each height */}
              {sidHasBasic && sidBindHeight > 0 && (
                <Card>
                  <CardHeader><CardTitle>Max Safe Lift by Installed Height</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted">
                            <th className="text-left p-2">Installed Height</th>
                            <th className="text-right p-2">Max Lift (street)</th>
                            <th className="text-right p-2">Max Lift (race)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sidHeights.filter(h => h < sidFL && h - sidBindHeight > 0).map((h, i) => {
                            const streetLift = h - sidBindHeight - 0.060;
                            const raceLift = h - sidBindHeight - 0.080;
                            return (
                              <tr key={h} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                                <td className="p-2 font-mono">{h.toFixed(3)}"</td>
                                <td className={`text-right p-2 font-bold ${streetLift < 0.400 ? "text-red-700" : streetLift < 0.500 ? "text-yellow-700" : "text-green-700"}`}>
                                  {streetLift > 0 ? `${streetLift.toFixed(3)}"` : "—"}
                                </td>
                                <td className={`text-right p-2 font-bold ${raceLift < 0.400 ? "text-red-700" : raceLift < 0.500 ? "text-yellow-700" : "text-green-700"}`}>
                                  {raceLift > 0 ? `${raceLift.toFixed(3)}"` : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Street margin: 0.060". Race margin: 0.080". Red = under 0.400" lift, yellow = under 0.500".</p>
                  </CardContent>
                </Card>
              )}

              {!sidHasRate && sidHasBasic && (
                <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                  <p className="font-bold text-blue-700">Add pressure readings for full analysis</p>
                  <p className="text-sm mt-1 text-muted-foreground">Without at least one pressure reading from a spring tester, we can only show physical dimensions, coil bind, and max safe lift. With pressure data we can calculate the rate and show seat/open pressures at every installed height plus application matching.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
              <h4 className="font-semibold text-foreground mb-1">Seat vs Open Pressure</h4>
              <p>Seat pressure seals the valve against combustion. Open pressure prevents float at RPM. Both must be correct for the cam profile.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Coil Bind Safety</h4>
              <ul className="space-y-1 mt-1">
                <li><span className="font-medium text-foreground">Street:</span> 0.060" min above bind</li>
                <li><span className="font-medium text-foreground">Race:</span> 0.080" min above bind</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Over-Sprung Danger</h4>
              <p>Excessive pressure wipes flat-tappet cams in minutes. Hydraulic lifters pump down under excess load, causing intermittent misfires.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Shimming Rule</h4>
              <p>Equalize all 16 springs within 0.010" of each other. Shim to the shortest installed height. Use 0.015/0.030/0.060/0.090" shims.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">RPM Upgrades</h4>
              <p>Titanium retainers reduce valve-side mass 40-50%, raising safe RPM limit 500-800 RPM without changing springs.</p>
            </div>
          </CardContent>
        </Card>
      </HelpSidebar>

      </div>{/* end flex row */}

      <CalculatorContent data={valveSpringContent} title="Valve Springs" />
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-0.5">{children}</p>;
}
