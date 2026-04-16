import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Printer, Clipboard, Check } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type LifterType = "hydraulic_flat" | "hydraulic_roller" | "solid_flat" | "solid_roller";
type ManifoldType = "dual_plane" | "single_plane" | "tunnel_ram" | "tbi_stock";

interface State {
  intAdv: string; exhAdv: string;
  int050: string; exh050: string;
  intLCA: string; exhLCA: string;
  advance: string;
  intLift: string; exhLift: string;
  lifterType: LifterType; valveLash: string;
  oemRocker: string; custom1Rocker: string; custom2Rocker: string;
  displacement: string; cylinders: string;
  intakeValveDia: string; valvesPerCyl: string;
  compressionRatio: string; valveAngle: string;
  manifold: ManifoldType;
  stroke: string; rodLength: string; bore: string;
}

const DEFAULT: State = {
  intAdv: "270", exhAdv: "276",
  int050: "224", exh050: "230",
  intLCA: "108", exhLCA: "116",
  advance: "4",
  intLift: "0.360", exhLift: "0.370",
  lifterType: "hydraulic_flat", valveLash: "0.000",
  oemRocker: "1.5", custom1Rocker: "1.6", custom2Rocker: "1.7",
  displacement: "350", cylinders: "8",
  intakeValveDia: "2.02", valvesPerCyl: "2",
  compressionRatio: "10.0", valveAngle: "0",
  manifold: "dual_plane",
  stroke: "3.48", rodLength: "5.7", bore: "4.00",
};

const LASH_DEFAULTS: Record<LifterType, string> = {
  hydraulic_flat: "0.000", hydraulic_roller: "0.000",
  solid_flat: "0.020", solid_roller: "0.015",
};

const LIFTER_LABELS: Record<LifterType, string> = {
  hydraulic_flat: "Hydraulic Flat Tappet",
  hydraulic_roller: "Hydraulic Roller",
  solid_flat: "Solid Flat Tappet",
  solid_roller: "Solid Roller",
};

const MANIFOLD_LABELS: Record<ManifoldType, string> = {
  dual_plane: "Dual Plane", single_plane: "Single Plane",
  tunnel_ram: "Tunnel Ram", tbi_stock: "TBI / Stock",
};

// ── Calculations ───────────────────────────────────────────────────────────────

function calc(s: State) {
  const n = (v: string) => parseFloat(v) || 0;
  const intAdv = n(s.intAdv), exhAdv = n(s.exhAdv);
  const int050 = n(s.int050), exh050 = n(s.exh050);
  const intLCA = n(s.intLCA), exhLCA = n(s.exhLCA);
  const advance = n(s.advance);
  const intLift = n(s.intLift), exhLift = n(s.exhLift);
  const oemR = n(s.oemRocker), c1R = n(s.custom1Rocker), c2R = n(s.custom2Rocker);
  const disp = n(s.displacement), cyls = n(s.cylinders);
  const valveDia = n(s.intakeValveDia), vpCyl = n(s.valvesPerCyl);
  const cr = n(s.compressionRatio), vAngle = n(s.valveAngle);
  const stroke = n(s.stroke), rodLen = n(s.rodLength);

  // Intake centerline adjusted for advance/retard
  const intCenter = intLCA - advance;
  const exhCenter = exhLCA + advance;

  // Valve events
  const IO_BTDC = intAdv / 2 - intCenter;
  const IC_ABDC = intAdv / 2 - (180 - intCenter);
  const EO_BBDC = exhAdv / 2 - exhCenter;
  const EC_ATDC = exhAdv / 2 - (180 - exhCenter);
  const overlap = IO_BTDC + EC_ATDC;

  // Rocker lift table
  const rockerRow = (r: number) => ({
    ratio: r,
    intValveLift: intLift * r,
    exhValveLift: exhLift * r,
  });

  // Vizard LCA formula
  const dispPerCyl = cyls > 0 ? disp / cyls : 0;
  const valveRadius = valveDia / 2;
  const valveArea = Math.PI * valveRadius * valveRadius * (vpCyl >= 4 ? 2 : 1);
  const cubesPerIn2 = valveArea > 0 ? dispPerCyl / valveArea : 0;

  let baseLCA = 110;
  if (cubesPerIn2 < 15) baseLCA = 100;
  else if (cubesPerIn2 < 18) baseLCA = 104;
  else if (cubesPerIn2 < 21) baseLCA = 106;
  else if (cubesPerIn2 < 24) baseLCA = 108;
  else if (cubesPerIn2 < 27) baseLCA = 110;
  else if (cubesPerIn2 < 30) baseLCA = 112;
  else baseLCA = 114;

  let crAdj = 0;
  if (cr < 9.5) crAdj = 2;
  else if (cr <= 10.5) crAdj = 0;
  else if (cr <= 12) crAdj = -1;
  else crAdj = -2;

  const vaAdj = vAngle > 10 ? 2 : 0;

  let manifoldAdj = 0;
  if (s.manifold === "single_plane") manifoldAdj = -1;
  else if (s.manifold === "tunnel_ram") manifoldAdj = -2;
  else if (s.manifold === "tbi_stock") manifoldAdj = 2;

  const recommendedLCA = baseLCA + crAdj + vaAdj + manifoldAdj;
  const lcaDiff = intLCA - recommendedLCA;

  // Dynamic compression ratio
  // IVC_deg = degrees after BDC the intake closes (IC_ABDC)
  const ivcDeg = IC_ABDC;
  const ivcRad = (ivcDeg * Math.PI) / 180;
  // piston rise from BDC = (stroke/2) × (1 - cos(IVC))
  const pistonRise = stroke > 0 ? (stroke / 2) * (1 - Math.cos(ivcRad)) : 0;
  const effectiveStroke = stroke - pistonRise;
  const gamma = 1.3;
  const dynamicCR = stroke > 0 ? cr * Math.pow(effectiveStroke / stroke, gamma) : 0;

  return {
    intCenter, exhCenter,
    IO_BTDC, IC_ABDC, EO_BBDC, EC_ATDC, overlap,
    rockers: [rockerRow(oemR), rockerRow(c1R), rockerRow(c2R)],
    dispPerCyl, valveArea, cubesPerIn2,
    baseLCA, crAdj, vaAdj, manifoldAdj, recommendedLCA, lcaDiff,
    pistonRise, effectiveStroke, dynamicCR,
    intLift, exhLift, int050, exh050, intAdv, exhAdv,
    intLCA, exhLCA, advance, cr,
    oemR, c1R, c2R,
  };
}

// ── Overlap category ───────────────────────────────────────────────────────────

function overlapCategory(ov: number) {
  if (ov < 25) return { label: "Very Mild / Towing", color: "text-green-700", bg: "bg-green-50 border-green-300" };
  if (ov < 45) return { label: "Mild Street / Torque", color: "text-green-700", bg: "bg-green-50 border-green-300" };
  if (ov < 65) return { label: "Street Performance", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-300" };
  if (ov < 85) return { label: "Street / Strip", color: "text-orange-700", bg: "bg-orange-50 border-orange-300" };
  return { label: "Race Only", color: "text-red-700", bg: "bg-red-50 border-red-300" };
}

function dcrCategory(dcr: number) {
  if (dcr < 7.5) return { label: "Too low — high detonation resistance", color: "text-blue-700", bg: "bg-blue-50 border-blue-300" };
  if (dcr < 8.5) return { label: "Mild — good for pump gas / boost", color: "text-green-700", bg: "bg-green-50 border-green-300" };
  if (dcr < 9.5) return { label: "Ideal street performance on 91–93 octane", color: "text-green-700", bg: "bg-green-50 border-green-300" };
  if (dcr < 10.5) return { label: "Aggressive — requires premium fuel", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-300" };
  return { label: "Race fuel territory", color: "text-red-700", bg: "bg-red-50 border-red-300" };
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-0.5">{children}</p>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

function ResultRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="font-bold text-gray-900">{value}</span>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold text-left hover:bg-[#222] transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CamDurationCalculator() {
  const [s, setS] = useState<State>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = useCallback(<K extends keyof State>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setS(prev => ({ ...prev, [k]: e.target.value })),
  []);

  const setLifter = (v: LifterType) =>
    setS(prev => ({ ...prev, lifterType: v, valveLash: LASH_DEFAULTS[v] }));

  const C = calc(s);
  const ovCat = overlapCategory(C.overlap);
  const dcrCat = dcrCategory(C.dynamicCR);

  const buildSheet = () => {
    return [
      "=== VIZARD CAM TIMING — BUILD SHEET ===",
      "",
      "CAMSHAFT SPECS",
      `Intake Duration (Adv/0.050): ${s.intAdv}° / ${s.int050}°`,
      `Exhaust Duration (Adv/0.050): ${s.exhAdv}° / ${s.exh050}°`,
      `Intake LCA / Exhaust LCA: ${s.intLCA}° / ${s.exhLCA}°`,
      `Cam Advance/Retard: ${s.advance}°`,
      `Intake / Exhaust Lift: ${s.intLift}" / ${s.exhLift}"`,
      `Lifter Type: ${LIFTER_LABELS[s.lifterType]}`,
      "",
      "VALVE EVENTS",
      `Intake Opens: ${C.IO_BTDC.toFixed(1)}° BTDC`,
      `Intake Closes: ${C.IC_ABDC.toFixed(1)}° ABDC`,
      `Exhaust Opens: ${C.EO_BBDC.toFixed(1)}° BBDC`,
      `Exhaust Closes: ${C.EC_ATDC.toFixed(1)}° ATDC`,
      `Overlap: ${C.overlap.toFixed(1)}° — ${ovCat.label}`,
      "",
      "VIZARD RECOMMENDED LCA",
      `Recommended: ${C.recommendedLCA}°  |  Actual: ${s.intLCA}°  |  Diff: ${C.lcaDiff > 0 ? "+" : ""}${C.lcaDiff.toFixed(1)}°`,
      "",
      "DYNAMIC COMPRESSION",
      `Static CR: ${s.compressionRatio}:1  |  Dynamic CR: ${C.dynamicCR.toFixed(2)}:1`,
      `Rating: ${dcrCat.label}`,
      "",
      "VALVE LIFT TABLE",
      `OEM ${s.oemRocker}:1 — Int ${(C.intLift * C.oemR).toFixed(4)}" / Exh ${(C.exhLift * C.oemR).toFixed(4)}"`,
      `Custom ${s.custom1Rocker}:1 — Int ${(C.intLift * C.c1R).toFixed(4)}" / Exh ${(C.exhLift * C.c1R).toFixed(4)}"`,
      `Custom ${s.custom2Rocker}:1 — Int ${(C.intLift * C.c2R).toFixed(4)}" / Exh ${(C.exhLift * C.c2R).toFixed(4)}"`,
      "",
      "Based on David Vizard's 'How to Build Horsepower'",
      "engine-build.com",
    ].join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildSheet()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Prominent book banner */}
      <div className="bg-[#1a1a1a] text-white rounded-xl mb-6 overflow-hidden">
        <div className="px-6 py-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-5xl shrink-0">📖</div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs uppercase tracking-widest text-[#E85D04] font-semibold mb-1">Inspired by</p>
            <h2 className="text-xl sm:text-2xl font-black mb-2">
              David Vizard's <em className="not-italic text-[#E85D04]">How to Build Horsepower</em>
            </h2>
            <p className="text-gray-300 text-sm mb-4 max-w-lg">
              The formulas and methodology in this calculator come directly from David Vizard's landmark book — one of the most thorough technical references ever written on building performance engines.
            </p>
            <a
              href="https://www.amazon.com/dp/0879384557?tag=YOUR-TAG-HERE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#E85D04] hover:bg-[#d04f00] text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              Get the Book on Amazon →
            </a>
            <p className="text-xs text-gray-500 mt-2">Affiliate link — we may earn a small commission at no extra cost to you</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
      <div>
        <h1 className="text-3xl font-bold mb-1">Vizard Cam Timing Calculator</h1>
        <p className="text-sm text-muted-foreground">
          Full cam analysis: valve events, overlap, LCA recommendations, dynamic compression ratio, and rocker lift table.
        </p>
      </div>

      {/* ── SECTION 1: Cam Inputs ─────────────────────────── */}
      <Section title="1 — Camshaft Inputs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Duration</p>
            <Field label="Advertised Intake Duration (°)" hint="Measured at the manufacturer's specified checking clearance">
              <Input type="number" step="1" value={s.intAdv} onChange={set("intAdv")} />
            </Field>
            <Field label="Advertised Exhaust Duration (°)">
              <Input type="number" step="1" value={s.exhAdv} onChange={set("exhAdv")} />
            </Field>
            <Field label='Intake Duration at 0.050" Lift (°)' hint='Industry-standard comparison point — always compare cams at 0.050"'>
              <Input type="number" step="1" value={s.int050} onChange={set("int050")} />
            </Field>
            <Field label='Exhaust Duration at 0.050" Lift (°)'>
              <Input type="number" step="1" value={s.exh050} onChange={set("exh050")} />
            </Field>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Timing & Lift</p>
            <Field label="Intake Lobe Centerline Angle (°)" hint="Degrees after TDC where the intake lobe reaches peak lift">
              <Input type="number" step="0.5" value={s.intLCA} onChange={set("intLCA")} />
            </Field>
            <Field label="Exhaust Lobe Centerline Angle (°)" hint="Often the same as intake for symmetric cams">
              <Input type="number" step="0.5" value={s.exhLCA} onChange={set("exhLCA")} />
            </Field>
            <Field label="Cam Advance / Retard (°)" hint="Positive = advanced (more timing area at low RPM). Default 0.">
              <Input type="number" step="0.5" value={s.advance} onChange={set("advance")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Intake Lift (in)">
                <Input type="number" step="0.001" value={s.intLift} onChange={set("intLift")} />
              </Field>
              <Field label="Exhaust Lift (in)">
                <Input type="number" step="0.001" value={s.exhLift} onChange={set("exhLift")} />
              </Field>
            </div>
          </div>

          <div className="space-y-4 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-5">
            <Field label="Lifter Type">
              <Select value={s.lifterType} onValueChange={v => setLifter(v as LifterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LIFTER_LABELS) as LifterType[]).map(k => (
                    <SelectItem key={k} value={k}>{LIFTER_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label='Valve Lash (in)' hint={s.lifterType.startsWith("hydraulic") ? 'Hydraulic lifters run zero lash (0.000"). Duration measurement point is 0.006".' : "Solid lifters require a measured running clearance."}>
              <Input type="number" step="0.001" value={s.valveLash} onChange={set("valveLash")}
                readOnly={s.lifterType.startsWith("hydraulic")}
                className={s.lifterType.startsWith("hydraulic") ? "bg-gray-50" : ""} />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── SECTION 2: Rocker / Valve Lift ───────────────── */}
      <Section title="2 — OEM Rocker Ratio & Valve Lift">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="OEM Rocker Ratio" hint="Stock ratio (e.g. 1.5:1 for small block Chevy)">
              <Input type="number" step="0.01" value={s.oemRocker} onChange={set("oemRocker")} />
            </Field>
            <Field label="Custom Ratio 1">
              <Input type="number" step="0.01" value={s.custom1Rocker} onChange={set("custom1Rocker")} />
            </Field>
            <Field label="Custom Ratio 2">
              <Input type="number" step="0.01" value={s.custom2Rocker} onChange={set("custom2Rocker")} />
            </Field>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] text-white">
                  <th className="p-3 text-left rounded-tl-lg">Rocker Ratio</th>
                  <th className="p-3 text-center">Intake Valve Lift</th>
                  <th className="p-3 text-center rounded-tr-lg">Exhaust Valve Lift</th>
                </tr>
              </thead>
              <tbody>
                {C.rockers.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="p-3 font-semibold">{r.ratio.toFixed(2)}:1{i === 0 ? " (OEM)" : ` (Custom ${i})`}</td>
                    <td className="p-3 text-center font-mono">{r.intValveLift.toFixed(4)}"</td>
                    <td className="p-3 text-center font-mono">{r.exhValveLift.toFixed(4)}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <strong>Note:</strong> Higher rocker ratios increase valve lift without changing cam duration. This can be an economical way to improve airflow on a budget.
          </div>
        </div>
      </Section>

      {/* ── SECTION 3: Valve Events ───────────────────────── */}
      <Section title="3 — Valve Event Timing">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Intake Opens", value: C.IO_BTDC.toFixed(1), unit: "° BTDC" },
              { label: "Intake Closes", value: C.IC_ABDC.toFixed(1), unit: "° ABDC" },
              { label: "Exhaust Opens", value: C.EO_BBDC.toFixed(1), unit: "° BBDC" },
              { label: "Exhaust Closes", value: C.EC_ATDC.toFixed(1), unit: "° ATDC" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="rounded-lg border bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="text-2xl font-bold text-[#E85D04]">{value}</div>
                <div className="text-xs text-gray-500">{unit}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 border rounded-lg p-4 space-y-1 text-sm">
            <p>
              <strong>Intake valve closes</strong> at <span className="text-[#E85D04] font-bold">{C.IC_ABDC.toFixed(1)}° ABDC</span>{" "}
              (based on intake centerline of {C.intCenter.toFixed(1)}°).
            </p>
            <p className="text-muted-foreground text-xs">
              Advancing or retarding the cam changes all these events. A {s.advance}° advance moves the intake centerline from {s.intLCA}° to {C.intCenter.toFixed(1)}°.
            </p>
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-3">
            <p>IO BTDC = AdvDuration/2 − IntakeCenterline = {s.intAdv}/2 − {C.intCenter.toFixed(1)} = {C.IO_BTDC.toFixed(1)}°</p>
            <p>IC ABDC = AdvDuration/2 − (180 − IntakeCenterline) = {C.IC_ABDC.toFixed(1)}°</p>
            <p>EO BBDC = ExhDuration/2 − ExhCenterline = {s.exhAdv}/2 − {C.exhCenter.toFixed(1)} = {C.EO_BBDC.toFixed(1)}°</p>
            <p>EC ATDC = ExhDuration/2 − (180 − ExhCenterline) = {C.EC_ATDC.toFixed(1)}°</p>
          </div>
        </div>
      </Section>

      {/* ── SECTION 4: Overlap ────────────────────────────── */}
      <Section title="4 — Overlap Calculator">
        <div className="space-y-4">
          <div className={`rounded-xl border-2 p-6 text-center ${ovCat.bg}`}>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Valve Overlap (crankshaft degrees)</div>
            <div className={`text-6xl font-black mb-2 ${ovCat.color}`}>{C.overlap.toFixed(1)}°</div>
            <div className={`text-base font-semibold ${ovCat.color}`}>{ovCat.label}</div>
            <div className="text-xs text-gray-500 mt-2">
              IO BTDC ({C.IO_BTDC.toFixed(1)}°) + EC ATDC ({C.EC_ATDC.toFixed(1)}°) = {C.overlap.toFixed(1)}°
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 text-xs text-center">
            {[
              { range: "< 25°", label: "Towing", color: "bg-green-100 text-green-800" },
              { range: "25–45°", label: "Mild Street", color: "bg-green-100 text-green-800" },
              { range: "45–65°", label: "St. Perf.", color: "bg-yellow-100 text-yellow-800" },
              { range: "65–85°", label: "St. / Strip", color: "bg-orange-100 text-orange-800" },
              { range: "85–115°", label: "Race", color: "bg-red-100 text-red-800" },
            ].map(({ range, label, color }) => (
              <div key={range} className={`rounded p-2 ${color}`}>
                <div className="font-bold">{range}</div>
                <div>{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <strong>David Vizard:</strong> Overlap is the single most important cam event. Getting it right for your RPM range and engine combination is more critical than duration alone.
          </div>
        </div>
      </Section>

      {/* ── SECTION 5: Vizard LCA Formula ────────────────── */}
      <Section title="5 — Vizard's Recommended LCA Formula">
        <div className="space-y-5">
          <div className="text-xs italic text-muted-foreground border-b pb-3">
            Formula and methodology from David Vizard's{" "}
            <a
              href="https://www.amazon.com/dp/0879384557?tag=YOUR-TAG-HERE"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#E85D04] transition-colors"
            >
              <em>How to Build Horsepower</em>
            </a>
            . To learn more,{" "}
            <a
              href="https://www.amazon.com/dp/0879384557?tag=YOUR-TAG-HERE"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-[#E85D04] transition-colors"
            >
              get the book on Amazon →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Engine Displacement (ci)" hint="Total cubic inch displacement">
              <Input type="number" step="1" value={s.displacement} onChange={set("displacement")} />
            </Field>
            <Field label="Number of Cylinders">
              <Input type="number" step="1" value={s.cylinders} onChange={set("cylinders")} />
            </Field>
            <Field label="Intake Valve Diameter (in)" hint="For 4-valve heads, enter the diameter of one intake valve">
              <Input type="number" step="0.01" value={s.intakeValveDia} onChange={set("intakeValveDia")} />
            </Field>
            <Field label="Valves per Cylinder" hint="2 = conventional, 4 = 4-valve head (e.g. 4.6L Ford Modular)">
              <Select value={s.valvesPerCyl} onValueChange={v => setS(prev => ({ ...prev, valvesPerCyl: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 valves</SelectItem>
                  <SelectItem value="4">4 valves</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Compression Ratio" hint="Static compression ratio from your build spec">
              <Input type="number" step="0.1" value={s.compressionRatio} onChange={set("compressionRatio")} />
            </Field>
            <Field label="Valve Angle (°)" hint="Included valve angle. Parallel = 0. BBC ≈ 26°. Most SBC = 23°.">
              <Input type="number" step="1" value={s.valveAngle} onChange={set("valveAngle")} />
            </Field>
            <Field label="Intake Manifold Type" hint="Affects idle quality and RPM range — Vizard adjusts LCA for manifold type">
              <Select value={s.manifold} onValueChange={v => setS(prev => ({ ...prev, manifold: v as ManifoldType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(MANIFOLD_LABELS) as ManifoldType[]).map(k => (
                    <SelectItem key={k} value={k}>{MANIFOLD_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="bg-[#1a1a1a] text-white rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-white/10 rounded p-2">
                <div className="text-gray-400">Disp / Cylinder</div>
                <div className="font-bold mt-0.5">{C.dispPerCyl.toFixed(1)} ci</div>
              </div>
              <div className="bg-white/10 rounded p-2">
                <div className="text-gray-400">Intake Valve Area</div>
                <div className="font-bold mt-0.5">{C.valveArea.toFixed(3)} in²</div>
              </div>
              <div className="bg-white/10 rounded p-2">
                <div className="text-gray-400">Cubes / in² Valve</div>
                <div className="font-bold mt-0.5">{C.cubesPerIn2.toFixed(1)}</div>
              </div>
              <div className="bg-white/10 rounded p-2">
                <div className="text-gray-400">Base LCA</div>
                <div className="font-bold mt-0.5">{C.baseLCA}°</div>
              </div>
            </div>

            <div className="space-y-1 text-sm border-t border-white/20 pt-3">
              <ResultRowDark label="Base LCA (from lookup)" value={`${C.baseLCA}°`} />
              <ResultRowDark label={`CR adjustment (CR = ${s.compressionRatio})`} value={`${C.crAdj >= 0 ? "+" : ""}${C.crAdj}°`} />
              <ResultRowDark label={`Valve angle adjustment (${s.valveAngle}°)`} value={`+${C.vaAdj}°`} />
              <ResultRowDark label={`Manifold adjustment (${MANIFOLD_LABELS[s.manifold]})`} value={`${C.manifoldAdj >= 0 ? "+" : ""}${C.manifoldAdj}°`} />
            </div>

            <div className="border-t border-white/20 pt-3 text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Vizard Recommended LCA</div>
              <div className="text-5xl font-black text-[#E85D04] my-1">{C.recommendedLCA}°</div>
              <div className={`text-sm font-semibold ${Math.abs(C.lcaDiff) <= 2 ? "text-green-400" : "text-amber-400"}`}>
                {Math.abs(C.lcaDiff) <= 2
                  ? `✓ Your LCA of ${s.intLCA}° is on target`
                  : C.lcaDiff > 0
                    ? `Your LCA (${s.intLCA}°) is ${C.lcaDiff.toFixed(1)}° wider than recommended — cam will have less overlap`
                    : `Your LCA (${s.intLCA}°) is ${Math.abs(C.lcaDiff).toFixed(1)}° tighter than recommended — cam will have more overlap`}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── SECTION 6: Dynamic CR ─────────────────────────── */}
      <Section title="6 — Dynamic Compression Ratio">
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Static compression ratio doesn't tell the full story. Because the intake valve closes after BDC, the effective stroke is shorter than the piston's full travel — giving you the dynamic compression ratio the engine actually sees.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Stroke (in)">
              <Input type="number" step="0.001" value={s.stroke} onChange={set("stroke")} />
            </Field>
            <Field label="Rod Length (in)" hint="Center-to-center connecting rod length">
              <Input type="number" step="0.001" value={s.rodLength} onChange={set("rodLength")} />
            </Field>
            <Field label="Bore (in)" hint="Used for reference — doesn't affect DCR calculation">
              <Input type="number" step="0.001" value={s.bore} onChange={set("bore")} />
            </Field>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4 space-y-2 text-xs text-muted-foreground">
            <p>IVC angle (from BDC) = {C.IC_ABDC.toFixed(1)}°  →  calculated in Section 3 from your cam timing</p>
            <p>Piston rise at IVC = (stroke/2) × (1 − cos {C.IC_ABDC.toFixed(1)}°) = {C.pistonRise.toFixed(4)}"</p>
            <p>Effective stroke = {parseFloat(s.stroke).toFixed(3)}" − {C.pistonRise.toFixed(4)}" = {C.effectiveStroke.toFixed(4)}"</p>
            <p>Dynamic CR = Static CR × (Effective Stroke / Stroke)^1.3 = {s.compressionRatio} × ({C.effectiveStroke.toFixed(4)} / {s.stroke})^1.3</p>
          </div>

          <div className={`rounded-xl border-2 p-6 text-center ${dcrCat.bg}`}>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Dynamic Compression Ratio</div>
            <div className={`text-6xl font-black mb-1 ${dcrCat.color}`}>{C.dynamicCR.toFixed(2)}:1</div>
            <div className={`text-sm font-semibold ${dcrCat.color}`}>{dcrCat.label}</div>
          </div>

          <div className="grid grid-cols-5 gap-1 text-xs text-center">
            {[
              { range: "< 7.5", label: "Boost-ready", color: "bg-blue-100 text-blue-800" },
              { range: "7.5–8.5", label: "Pump gas", color: "bg-green-100 text-green-800" },
              { range: "8.5–9.5", label: "Ideal 91–93", color: "bg-green-100 text-green-800" },
              { range: "9.5–10.5", label: "Premium", color: "bg-yellow-100 text-yellow-800" },
              { range: "> 10.5", label: "Race fuel", color: "bg-red-100 text-red-800" },
            ].map(({ range, label, color }) => (
              <div key={range} className={`rounded p-2 ${color}`}>
                <div className="font-bold">{range}</div>
                <div>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── SECTION 7: Summary / Build Sheet ─────────────── */}
      <Section title="7 — Build Sheet Summary">
        <div className="space-y-5" id="printable-summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle className="text-base">Cam Specs</CardTitle></CardHeader>
              <CardContent className="space-y-0.5">
                <ResultRow label="Intake Duration (Adv / 0.050)" value={`${s.intAdv}° / ${s.int050}°`} />
                <ResultRow label="Exhaust Duration (Adv / 0.050)" value={`${s.exhAdv}° / ${s.exh050}°`} />
                <ResultRow label="Intake / Exhaust LCA" value={`${s.intLCA}° / ${s.exhLCA}°`} />
                <ResultRow label="Cam Advance/Retard" value={`${s.advance}°`} />
                <ResultRow label="Intake / Exhaust Lift" value={`${s.intLift}" / ${s.exhLift}"`} />
                <ResultRow label="Lifter Type" value={LIFTER_LABELS[s.lifterType]} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Valve Events</CardTitle></CardHeader>
              <CardContent className="space-y-0.5">
                <ResultRow label="Intake Opens" value={`${C.IO_BTDC.toFixed(1)}° BTDC`} />
                <ResultRow label="Intake Closes" value={`${C.IC_ABDC.toFixed(1)}° ABDC`} />
                <ResultRow label="Exhaust Opens" value={`${C.EO_BBDC.toFixed(1)}° BBDC`} />
                <ResultRow label="Exhaust Closes" value={`${C.EC_ATDC.toFixed(1)}° ATDC`} />
                <ResultRow label="Overlap" value={`${C.overlap.toFixed(1)}°`} sub={ovCat.label} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">LCA Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-0.5">
                <ResultRow label="Vizard Recommended LCA" value={`${C.recommendedLCA}°`} />
                <ResultRow label="Your Intake LCA" value={`${s.intLCA}°`} />
                <ResultRow
                  label="Difference"
                  value={`${C.lcaDiff > 0 ? "+" : ""}${C.lcaDiff.toFixed(1)}°`}
                  sub={Math.abs(C.lcaDiff) <= 2 ? "On target" : C.lcaDiff > 0 ? "Wider (less overlap)" : "Tighter (more overlap)"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Compression</CardTitle></CardHeader>
              <CardContent className="space-y-0.5">
                <ResultRow label="Static CR" value={`${s.compressionRatio}:1`} />
                <ResultRow label="Dynamic CR" value={`${C.dynamicCR.toFixed(2)}:1`} sub={dcrCat.label} />
                <ResultRow label="IVC Angle" value={`${C.IC_ABDC.toFixed(1)}° ABDC`} />
                <ResultRow label="Piston Rise at IVC" value={`${C.pistonRise.toFixed(4)}"`} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Valve Lift by Rocker Ratio</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 font-semibold">Rocker Ratio</th>
                    <th className="text-center py-1 font-semibold">Intake Valve Lift</th>
                    <th className="text-center py-1 font-semibold">Exhaust Valve Lift</th>
                  </tr>
                </thead>
                <tbody>
                  {C.rockers.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5">{r.ratio.toFixed(2)}:1{i === 0 ? " (OEM)" : ` (Custom ${i})`}</td>
                      <td className="text-center font-mono">{r.intValveLift.toFixed(4)}"</td>
                      <td className="text-center font-mono">{r.exhValveLift.toFixed(4)}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#333] transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Build Sheet
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            engine-build.com
          </p>
        </div>
      </Section>
      </div>
    </div>
  );
}

function ResultRowDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/10 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}
