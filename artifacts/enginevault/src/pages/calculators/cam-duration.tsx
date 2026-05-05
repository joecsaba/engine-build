import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Printer, Clipboard, Check } from "lucide-react";
import { useBuildContext } from "@/context/BuildContext";
import { BuildBanner } from "@/components/BuildBanner";

// ── Types ──────────────────────────────────────────────────────────────────────

type LifterType = "hydraulic_flat" | "hydraulic_roller" | "solid_flat" | "solid_roller";
interface State {
  intAdv: string; exhAdv: string;
  int050: string; exh050: string;
  lsa: string;
  advance: string;
  intLift: string; exhLift: string;
  lifterType: LifterType; valveLash: string;
  oemRocker: string; custom1Rocker: string; custom2Rocker: string;
  displacement: string; cylinders: string;
  intakeValveDia: string; valvesPerCyl: string;
  compressionRatio: string;
  stroke: string; rodLength: string; bore: string;
}

const DEFAULT: State = {
  intAdv: "270", exhAdv: "276",
  int050: "224", exh050: "230",
  lsa: "112",
  advance: "4",
  intLift: "0.540", exhLift: "0.555",
  lifterType: "hydraulic_flat", valveLash: "0.000",
  oemRocker: "1.5", custom1Rocker: "1.6", custom2Rocker: "1.7",
  displacement: "350", cylinders: "8",
  intakeValveDia: "2.02", valvesPerCyl: "2",
  compressionRatio: "10.0",
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

// ── Calculations ───────────────────────────────────────────────────────────────

function calc(s: State) {
  const n = (v: string) => parseFloat(v) || 0;
  const intAdv = n(s.intAdv), exhAdv = n(s.exhAdv);
  const int050 = n(s.int050), exh050 = n(s.exh050);
  const lsa = n(s.lsa);
  const advance = n(s.advance);
  const intValveLift = n(s.intLift), exhValveLift = n(s.exhLift);
  const oemR = n(s.oemRocker), c1R = n(s.custom1Rocker), c2R = n(s.custom2Rocker);
  const intLift = oemR > 0 ? intValveLift / oemR : 0;
  const exhLift = oemR > 0 ? exhValveLift / oemR : 0;
  const disp = n(s.displacement), cyls = n(s.cylinders);
  const valveDia = n(s.intakeValveDia);
  const cr = n(s.compressionRatio);
  const stroke = n(s.stroke), rodLen = n(s.rodLength);

  const intCenter = lsa - advance;
  const exhCenter = lsa + advance;

  // Valve events
  const IO_BTDC = intAdv / 2 - intCenter;
  const IC_ABDC = intAdv / 2 - (180 - intCenter);
  const EO_BBDC = exhAdv / 2 - (180 - exhCenter);
  const EC_ATDC = exhAdv / 2 - exhCenter;
  const overlap = IO_BTDC + EC_ATDC;

  // Rocker lift table
  const rockerRow = (r: number) => ({
    ratio: r,
    intValveLift: intLift * r,
    exhValveLift: exhLift * r,
  });

  // Vizard LSA formula — cubes per inch of valve diameter (Ch. 10, p107)
  const dispPerCyl = cyls > 0 ? disp / cyls : 0;
  const cubesPerIn = valveDia > 0 ? dispPerCyl / valveDia : 0;

  // LSA from Vizard's dyno-derived chart
  // Verified: 302→111°, 350→108°, 383→106°
  const baseLCA = Math.round(Math.max(100, Math.min(116, 108 - (cubesPerIn - 21.66))));

  // CR adjustment: +0.75° per ratio above 10.5:1 (Vizard Ch. 10, p106)
  const crAdj = cr > 10.5 ? Math.round((cr - 10.5) * 0.75) : 0;

  const recommendedLSA = baseLCA + crAdj;
  const lsaDiff = lsa - recommendedLSA;

  // Dynamic compression ratio (Pat Kelley algorithm with rod length)
  // Use IVC from 0.050" duration (not advertised) + lash ramp correction
  // to estimate the actual seat-closing point where compression begins.
  // Hydraulic lifters: +15° ramp, solid lifters: +5° ramp.
  const isHydraulic = s.lifterType.startsWith("hydraulic");
  const lashAdj = isHydraulic ? 15 : 5;
  const intCenter050 = lsa - advance;
  const IC_ABDC_050 = int050 / 2 - (180 - intCenter050);
  const ivcDeg = IC_ABDC_050 + lashAdj;
  const ivcRad = (ivcDeg * Math.PI) / 180;
  const halfStroke = stroke / 2;
  const rd = halfStroke * Math.sin(ivcRad);
  const rr = halfStroke * Math.cos(ivcRad);
  const pr1 = rodLen > 0 ? Math.sqrt(rodLen * rodLen - rd * rd) : 0;
  const pr2 = pr1 - rr;
  const effectiveStroke = halfStroke + rodLen - pr2;
  const pistonRise = stroke - effectiveStroke;
  const dynamicCR = stroke > 0 ? cr * Math.pow(effectiveStroke / stroke, 1.3) : 0;

  return {
    intCenter, exhCenter,
    IO_BTDC, IC_ABDC, EO_BBDC, EC_ATDC, overlap,
    rockers: [rockerRow(oemR), rockerRow(c1R), rockerRow(c2R)],
    dispPerCyl, cubesPerIn,
    baseLCA, crAdj, recommendedLSA, lsaDiff,
    pistonRise, effectiveStroke, dynamicCR,
    intLift, exhLift, intValveLift, exhValveLift,
    int050, exh050, intAdv, exhAdv,
    lsa, advance, cr,
    oemR, c1R, c2R,
    IC_ABDC_050, ivcDeg, isHydraulic,
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
  const { activeBuild, getField, setField: setBuildField } = useBuildContext();
  const [s, setS] = useState<State>(DEFAULT);
  const [copied, setCopied] = useState(false);
  const [buildSynced, setBuildSynced] = useState(false);

  // Sync build fields → calculator state when build data is available
  const buildFields = activeBuild?.fields;
  useEffect(() => {
    if (!activeBuild || !buildFields || buildSynced) return;
    // Wait until fields are actually loaded (not just empty shell from localStorage)
    const hasFields = Object.keys(buildFields).length > 0;
    if (!hasFields) return;

    const updates: Partial<State> = {};
    const map: [keyof State, string][] = [
      ["int050", "cam.durationInt"], ["exh050", "cam.durationExh"],
      ["lsa", "cam.lsa"], ["intLift", "cam.liftInt"], ["exhLift", "cam.liftExh"],
      ["advance", "cam.advance"], ["bore", "shortBlock.bore"],
      ["stroke", "shortBlock.stroke"], ["rodLength", "rotatingAssembly.rodLength"],
      ["displacement", "computed.displacement"], ["cylinders", "shortBlock.cylinders"],
    ];
    for (const [stateKey, buildKey] of map) {
      const val = buildFields[buildKey];
      if (val) (updates as Record<string, string>)[stateKey] = val;
    }
    const camType = buildFields["cam.type"] as LifterType | undefined;
    if (camType && LASH_DEFAULTS[camType]) {
      updates.lifterType = camType;
      updates.valveLash = LASH_DEFAULTS[camType];
    }
    if (Object.keys(updates).length > 0) {
      setS(prev => ({ ...prev, ...updates }));
    }
    setBuildSynced(true);
  }, [activeBuild?.id, buildFields]);

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
      `LSA: ${s.lsa}°`,
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
      "VIZARD RECOMMENDED LSA",
      `Recommended: ${C.recommendedLSA}°  |  Actual: ${s.lsa}°  |  Diff: ${C.lsaDiff > 0 ? "+" : ""}${C.lsaDiff.toFixed(1)}°`,
      "",
      "DYNAMIC COMPRESSION",
      `Static CR: ${s.compressionRatio}:1  |  Dynamic CR: ${C.dynamicCR.toFixed(2)}:1`,
      `IVC at 0.050": ${C.IC_ABDC_050.toFixed(1)}° ABDC  |  Seat IVC: ${C.ivcDeg.toFixed(1)}° ABDC (${C.isHydraulic ? "hydraulic +15°" : "solid +5°"})`,
      `Rating: ${dcrCat.label}`,
      "",
      "VALVE LIFT TABLE",
      `OEM ${s.oemRocker}:1 — Int ${(C.intLift * C.oemR).toFixed(4)}" / Exh ${(C.exhLift * C.oemR).toFixed(4)}"`,
      `Custom ${s.custom1Rocker}:1 — Int ${(C.intLift * C.c1R).toFixed(4)}" / Exh ${(C.exhLift * C.c1R).toFixed(4)}"`,
      `Custom ${s.custom2Rocker}:1 — Int ${(C.intLift * C.c2R).toFixed(4)}" / Exh ${(C.exhLift * C.c2R).toFixed(4)}"`,
      "",
      "Generated by Engine-build.com Advanced Cam Calculator",
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
      <div className="px-4 space-y-5">
      <div>
        <SEOHead
          title="Cam Duration & Timing Calculator | Overlap, LSA, DCR"
          description="Cam timing calculator with valve events, overlap, LSA recommendations, dynamic compression ratio, and rocker lift table. Free camshaft timing calculator."
          canonical="/calculators/cam-duration"
          keywords="cam duration calculator, cam timing calculator, valve overlap calculator, LSA calculator, camshaft calculator, advanced cam calculator, camshaft timing calculator, valve event calculator, cam overlap calculator"
        />
        <BuildBanner savedFields={[
          { label: "Overlap", key: "computed.camOverlap", value: C.overlap > 0 ? C.overlap.toFixed(1) : "", suffix: "\u00B0" },
          { label: "Dynamic CR", key: "computed.dynamicCR", value: C.dynamicCR > 0 ? C.dynamicCR.toFixed(2) : "", suffix: ":1" },
        ]} />
        <h1 className="text-3xl font-bold mb-1">Advanced Cam Calculator</h1>
        <p className="text-sm text-muted-foreground">
          Full cam analysis: valve events, overlap, LSA recommendations, dynamic compression ratio, and rocker lift table.
        </p>
        <div className="p-3 rounded-lg border border-[#E85D04]/30 bg-[#E85D04]/5">
          <p className="text-sm">
            <strong>Already installed the cam?</strong>{" "}
            <Link href="/calculators/cam-degreeing" className="text-[#E85D04] font-medium hover:underline">
              Use the Cam Degreeing Calculator
            </Link>
            {" "}to verify your intake centerline with a degree wheel and get offset bushing recommendations.
          </p>
        </div>
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
            <Field label="Lobe Separation Angle — LSA (°)" hint="Angle between intake and exhaust lobe centerlines. Found on your cam card.">
              <Input type="number" step="0.5" value={s.lsa} onChange={set("lsa")} />
            </Field>
            <Field label="Cam Advance / Retard (°)" hint="Positive = advanced (more timing area at low RPM). Default 0.">
              <Input type="number" step="0.5" value={s.advance} onChange={set("advance")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Intake Valve Lift (in)" hint="Valve lift with stock rocker ratio">
                <Input type="number" step="0.001" value={s.intLift} onChange={set("intLift")} />
              </Field>
              <Field label="Exhaust Valve Lift (in)" hint="Valve lift with stock rocker ratio">
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
            <Field label="OEM Rocker Ratio" hint="Stock ratio (e.g. 1.5 SBC/Pontiac/Mopar, 1.6 SBF/Olds/AMC, 1.7 BBC/LS)">
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
                <tr className="bg-amber-50 border-b border-amber-200"><td className="p-3 font-semibold">Cam Lobe Lift</td><td className="p-3 text-center font-mono">{C.intLift.toFixed(4)}"</td><td className="p-3 text-center font-mono">{C.exhLift.toFixed(4)}"</td></tr>
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
              { label: "Intake Centerline", value: C.intCenter.toFixed(1), unit: "° ATDC" },
              { label: "Exhaust Centerline", value: C.exhCenter.toFixed(1), unit: "° BTDC" },
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
              Advancing or retarding the cam changes all these events. A {s.advance}° advance moves the intake centerline from {s.lsa}° to {C.intCenter.toFixed(1)}°.
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

        </div>
      </Section>

      {/* ── SECTION 5: Vizard LSA Formula ────────────────── */}
      <Section title="5 — Vizard's Recommended LSA Formula">
        <div className="space-y-5">
          <div className="text-xs italic text-muted-foreground border-b pb-3">
            Formula and methodology from David Vizard's{" "}
            <a
              href="https://amzn.to/4cMoisN"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#E85D04] transition-colors"
            >
              <em>How to Build Horsepower</em>
            </a>
            . To learn more,{" "}
            <a
              href="https://amzn.to/4cMoisN"
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
          </div>

          <div className="bg-[#1a1a1a] text-white rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-white/10 rounded p-2">
                <div className="text-gray-400">Disp / Cylinder</div>
                <div className="font-bold mt-0.5">{C.dispPerCyl.toFixed(1)} ci</div>
              </div>
              <div className="bg-white/10 rounded p-2">
                <div className="text-gray-400">Cubes / in Valve Dia</div>
                <div className="font-bold mt-0.5">{C.cubesPerIn.toFixed(1)}</div>
              </div>
              <div className="bg-white/10 rounded p-2">
                <div className="text-gray-400">Base LSA</div>
                <div className="font-bold mt-0.5">{C.baseLCA}°</div>
              </div>
            </div>

            <div className="space-y-1 text-sm border-t border-white/20 pt-3">
              <ResultRowDark label="Base LSA (from chart)" value={`${C.baseLCA}°`} />
              <ResultRowDark label={`CR adjustment (CR = ${s.compressionRatio})`} value={`${C.crAdj >= 0 ? "+" : ""}${C.crAdj}°`} />
            </div>

            <div className="border-t border-white/20 pt-3 text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Vizard Recommended LSA</div>
              <div className="text-5xl font-black text-[#E85D04] my-1">{C.recommendedLSA}°</div>
              <div className={`text-sm font-semibold ${Math.abs(C.lsaDiff) <= 2 ? "text-green-400" : "text-amber-400"}`}>
                {Math.abs(C.lsaDiff) <= 2
                  ? `✓ Your LSA of ${s.lsa}° is on target`
                  : C.lsaDiff > 0
                    ? `Your LSA (${s.lsa}°) is ${C.lsaDiff.toFixed(1)}° wider than recommended — cam will have less overlap`
                    : `Your LSA (${s.lsa}°) is ${Math.abs(C.lsaDiff).toFixed(1)}° tighter than recommended — cam will have more overlap`}
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] text-white rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-gray-300 mb-2">
                The LSA recommendation formula above is from David Vizard's <em className="text-[#E85D04]">How to Build Horsepower</em> — one of the most thorough technical references on building performance engines.
              </p>
              <a
                href="https://amzn.to/4cMoisN"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#E85D04] hover:bg-[#d04f00] text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Get the Book on Amazon →
              </a>
              <p className="text-xs text-gray-500 mt-1">Affiliate link — we may earn a small commission at no extra cost to you</p>
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
            <p>IVC at 0.050" = {C.IC_ABDC_050.toFixed(1)}° ABDC  →  lash ramp ({C.isHydraulic ? "+15° hydraulic" : "+5° solid"})  →  seat IVC = {C.ivcDeg.toFixed(1)}° ABDC</p>
            <p>Piston rise at IVC = {C.pistonRise.toFixed(4)}" (Pat Kelley algorithm using {s.rodLength}" rod length)</p>
            <p>Effective stroke = {parseFloat(s.stroke).toFixed(3)}" − {C.pistonRise.toFixed(4)}" = {C.effectiveStroke.toFixed(4)}"</p>
            <p>Dynamic CR = {s.compressionRatio} × ({C.effectiveStroke.toFixed(4)} / {s.stroke})^1.3 = {C.dynamicCR.toFixed(2)}:1</p>
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
                <ResultRow label="LSA (Lobe Separation Angle)" value={`${s.lsa}°`} />
                <ResultRow label="Intake Lobe Centerline" value={`${C.intCenter.toFixed(1)}° ATDC`} sub={`LSA (${s.lsa}°) − Advance (${s.advance}°)`} />
                <ResultRow label="Exhaust Lobe Centerline" value={`${C.exhCenter.toFixed(1)}° BTDC`} sub={`LSA (${s.lsa}°) + Advance (${s.advance}°)`} />
                <ResultRow label="Cam Advance/Retard" value={`${s.advance}°`} />
                <ResultRow label="Intake / Exhaust Lift" value={`${s.intLift}" / ${s.exhLift}"`} />
                <ResultRow label="Cam Lobe Lift (Int / Exh)" value={`${C.intLift.toFixed(4)}" / ${C.exhLift.toFixed(4)}"`} />
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
              <CardHeader><CardTitle className="text-base">LSA Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-0.5">
                <ResultRow label="Vizard Recommended LSA" value={`${C.recommendedLSA}°`} />
                <ResultRow label="Your LSA" value={`${s.lsa}°`} />
                <ResultRow
                  label="Difference"
                  value={`${C.lsaDiff > 0 ? "+" : ""}${C.lsaDiff.toFixed(1)}°`}
                  sub={Math.abs(C.lsaDiff) <= 2 ? "On target" : C.lsaDiff > 0 ? "Wider (less overlap)" : "Tighter (more overlap)"}
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
      <Card className="mt-8 mx-4">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Camshaft Timing</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            This calculator provides a complete cam timing analysis including valve events, overlap, lobe centerlines, dynamic compression ratio, and LSA recommendations. The LSA recommendation in Section 5 uses a formula from David Vizard's <em>How to Build Horsepower</em> that determines the optimal lobe separation angle based on the ratio of per-cylinder displacement to intake valve diameter — a relationship that reflects how efficiently the engine can fill each cylinder.
          </p>
          <p>
            Overlap is the period when both intake and exhaust valves are open simultaneously, measured in crankshaft degrees. More overlap improves high-RPM scavenging but kills idle quality and low-speed vacuum. Duration at 0.050" lift is the industry-standard comparison point — advertised duration numbers vary between manufacturers and are not reliable for comparing cams across brands. The lobe separation angle is ground into the camshaft and cannot be changed after manufacturing, making it the most critical spec to get right when ordering a cam.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Common Camshaft Specifications</h3>
          <p>
            COMP Cams XE274H: 274/286 advertised duration, 224/230 at 0.050", 110 degree LSA, approximately 60 degrees of overlap — a classic street/strip small block cam. Milder street cams like the XE262H run 212/218 at 0.050" on a 110 LSA with around 38 degrees of overlap and good idle quality. For a 350ci SBC with 2.02" intake valves, the Vizard formula recommends approximately 108 degrees LSA. For a 302ci Ford with 1.94" valves, it recommends roughly 111 degrees.
          </p>
        </CardContent>
      </Card>
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
