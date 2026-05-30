import { useState, useCallback } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Printer, Clipboard, Check, Info } from "lucide-react";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import camDegreeingContent from "@/data/calculatorContent/cam-degreeing.mjs";

// ── Types ──────────────────────────────────────────────────────────────────────

type ICLMode = "direct" | "from-advance";

interface State {
  // Step 1: Cam card specs
  intDuration050: string;
  exhDuration050: string;
  intMaxLift: string;
  exhMaxLift: string;
  lsa: string;
  iclMode: ICLMode;
  cardICL: string;
  cardAdvance: string;
  // Step 1: Optional cam card valve events
  cardIO050: string;
  cardIC050: string;
  cardEO050: string;
  cardEC050: string;
  // Step 2: TDC
  tdcReadingCW: string;
  tdcReadingCCW: string;
  // Step 3: Measured intake events
  ivoMeasured: string;
  ivcMeasured: string;
  // Exhaust measurement (optional)
  evoMeasured: string;
  evcMeasured: string;
  // Peak lift verification
  peakLiftAngle: string;
}

const DEFAULT: State = {
  intDuration050: "224",
  exhDuration050: "230",
  intMaxLift: "0.480",
  exhMaxLift: "0.484",
  lsa: "110",
  iclMode: "from-advance",
  cardICL: "106",
  cardAdvance: "4",
  cardIO050: "",
  cardIC050: "",
  cardEO050: "",
  cardEC050: "",
  tdcReadingCW: "10",
  tdcReadingCCW: "10",
  ivoMeasured: "4",
  ivcMeasured: "40",
  evoMeasured: "",
  evcMeasured: "",
  peakLiftAngle: "",
};

// ── Calculations ───────────────────────────────────────────────────────────────

function calc(s: State) {
  const n = (v: string) => parseFloat(v) || 0;

  // Step 1
  const intDur050 = n(s.intDuration050);
  const exhDur050 = n(s.exhDuration050);
  const lsa = n(s.lsa);

  // ICL: either entered directly or derived from LSA − Advance
  const cardICL = s.iclMode === "direct" ? n(s.cardICL) : lsa - n(s.cardAdvance);
  const cardAdvance = lsa - cardICL;
  const cardExhCL = 2 * lsa - cardICL;

  // Optional cam card valve events
  const hasCardEvents = !!(s.cardIO050 && s.cardIC050);
  const cardIO050 = n(s.cardIO050);
  const cardIC050 = n(s.cardIC050);
  const cardEO050 = n(s.cardEO050);
  const cardEC050 = n(s.cardEC050);
  const hasCardExhEvents = !!(s.cardEO050 && s.cardEC050);

  // Step 2: TDC
  const readCW = n(s.tdcReadingCW);
  const readCCW = n(s.tdcReadingCCW);
  const tdcOffset = (readCW - readCCW) / 2;
  const tdcAverage = (readCW + readCCW) / 2;
  const tdcReadingsDiff = Math.abs(readCW - readCCW);

  // Step 3: Measured intake valve events
  const ivoMeasured = n(s.ivoMeasured);
  const ivcMeasured = n(s.ivcMeasured);
  const measuredDuration = ivoMeasured + 180 + ivcMeasured;
  const durationDiff = Math.abs(measuredDuration - intDur050);

  // Step 4: Measured ICL
  const measuredICL = (ivcMeasured + 180 - ivoMeasured) / 2;
  const iclDifference = measuredICL - cardICL;

  // Cam card valve event comparison (if card events were entered)
  const ivoDiff = hasCardEvents ? ivoMeasured - cardIO050 : null;
  const ivcDiff = hasCardEvents ? ivcMeasured - cardIC050 : null;

  // Exhaust measurement (optional)
  const hasExhaust = !!(s.evoMeasured && s.evcMeasured);
  const evoMeasured = n(s.evoMeasured);
  const evcMeasured = n(s.evcMeasured);
  const measuredExhDuration = hasExhaust ? evoMeasured + 180 + evcMeasured : null;
  const exhDurationDiff = measuredExhDuration !== null ? Math.abs(measuredExhDuration - exhDur050) : null;
  const measuredExhCL = hasExhaust ? (evoMeasured + 180 - evcMeasured) / 2 : null;
  const measuredLSA = measuredExhCL !== null ? (measuredICL + measuredExhCL) / 2 : null;
  const lsaDiff = measuredLSA !== null ? measuredLSA - lsa : null;

  // Exhaust card event comparison
  const evoDiff = hasExhaust && hasCardExhEvents ? evoMeasured - cardEO050 : null;
  const evcDiff = hasExhaust && hasCardExhEvents ? evcMeasured - cardEC050 : null;

  // Peak lift verification
  const peakAngle = s.peakLiftAngle ? n(s.peakLiftAngle) : null;
  const peakLiftVariance = peakAngle !== null ? Math.abs(peakAngle - measuredICL) : null;

  return {
    intDur050, exhDur050, lsa, cardICL, cardAdvance, cardExhCL,
    hasCardEvents, cardIO050, cardIC050, cardEO050, cardEC050, hasCardExhEvents,
    readCW, readCCW, tdcOffset, tdcAverage, tdcReadingsDiff,
    ivoMeasured, ivcMeasured, measuredDuration, durationDiff,
    measuredICL, iclDifference,
    ivoDiff, ivcDiff,
    hasExhaust, evoMeasured, evcMeasured,
    measuredExhDuration, exhDurationDiff, measuredExhCL, measuredLSA, lsaDiff,
    evoDiff, evcDiff,
    peakAngle, peakLiftVariance,
  };
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function getICLStatus(diff: number): { label: string; detail: string; color: string; bg: string } {
  const absDiff = Math.abs(diff);
  const direction = diff > 0 ? "retarded" : "advanced";

  if (absDiff <= 1) return {
    label: "On spec",
    detail: "Cam is installed per cam card spec. COMP Cams and the major cam houses treat ≤1° as on-spec for any application.",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  };
  if (absDiff <= 2) return {
    label: `Slightly ${direction} (street-OK)`,
    detail: `Cam is slightly ${direction}. Per COMP Cams: 2° off spec on a high-performance street application is of no concern. Race builds (Reher-Morrison, Pro Stock) want this corrected to 0°.`,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  };
  if (absDiff <= 4) return {
    label: `Verify against builder spec`,
    detail: `Cam is ${absDiff.toFixed(1)}° ${direction}. This sits at the limit of modern factory timing-set stack-up (Cloyes notes ~4° spread is normal). Verify against your cam builder's recommendation for your specific application before correcting.`,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  };
  if (absDiff <= 6) return {
    label: `Meaningfully ${direction}`,
    detail: `Cam is meaningfully ${direction}. Consider an offset bushing or multi-position timing gear (Cloyes Hex-A-Just) to correct.`,
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  };
  return {
    label: "Large offset — recheck TDC",
    detail: "Large timing offset detected. RE-VERIFY YOUR TDC MEASUREMENT FIRST — this is the single most common source of degreeing error. Most offset-bushing kits top out at 8°. Iron-vs-aluminum block thermal effects on cam-to-crank centerline are negligible (little metal between cam tunnel and crank tunnel) — that is NOT the cause of a large measured offset.",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  };
}

function getHardwareRec(diff: number): { text: string; color: string; bg: string } | null {
  const absDiff = Math.abs(diff);
  const direction = diff > 0 ? "advance" : "retard";
  const targetICL = diff > 0 ? "bring ICL earlier" : "bring ICL later";

  if (absDiff <= 1) return null;

  if (absDiff <= 4) return {
    text: `Cloyes Hex-A-Just or similar multi-position timing gear. Install at the ${absDiff.toFixed(0)}° ${direction} position to ${targetICL}.`,
    color: "text-gray-900",
    bg: "bg-white border-gray-200",
  };

  if (absDiff <= 8) return {
    text: `Offset bushing. Use a ${Math.round(absDiff)}° ${direction} bushing to shift cam timing by the required amount. Comp Cams offset bushings come in 2°, 4°, 6°, 8° sizes. Pick the one matching the correction needed.`,
    color: "text-gray-900",
    bg: "bg-white border-gray-200",
  };

  return {
    text: "This is likely a TDC measurement error, not a real cam offset. Re-do Step 2 with a fresh piston stop installation. If the error persists, check for: slipping degree wheel, wrong timing gear installation (dot-to-dot?), cam installed 180° out (exhaust lobe being measured as intake).",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  };
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

function EventDiffBadge({ diff, unit }: { diff: number; unit: string }) {
  const absDiff = Math.abs(diff);
  const color = absDiff <= 1 ? "text-green-700 bg-green-50" : absDiff <= 3 ? "text-blue-700 bg-blue-50" : "text-yellow-700 bg-yellow-50";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${color}`}>
      {diff >= 0 ? "+" : ""}{diff.toFixed(1)}° {unit}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CamDegreeingCalculator() {
  const [s, setS] = useState<State>(DEFAULT);
  const [copied, setCopied] = useState(false);
  const [showCardEvents, setShowCardEvents] = useState(false);

  const set = useCallback(<K extends keyof State>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setS(prev => ({ ...prev, [k]: e.target.value })),
  []);

  const setICLMode = (mode: ICLMode) => {
    setS(prev => {
      const lsa = parseFloat(prev.lsa) || 0;
      if (mode === "direct") {
        // Switching to direct: compute ICL from current advance
        const adv = parseFloat(prev.cardAdvance) || 0;
        return { ...prev, iclMode: mode, cardICL: (lsa - adv).toFixed(0) };
      } else {
        // Switching to from-advance: compute advance from current ICL
        const icl = parseFloat(prev.cardICL) || 0;
        return { ...prev, iclMode: mode, cardAdvance: (lsa - icl).toFixed(0) };
      }
    });
  };

  const C = calc(s);
  const iclStatus = getICLStatus(C.iclDifference);
  const hwRec = getHardwareRec(C.iclDifference);

  // ── Build Sheet ──

  const buildSheet = () => {
    const lines = [
      "=== CAM DEGREEING — BUILD SHEET ===",
      "",
      "CAM CARD SPECS",
      `Intake Duration at 0.050": ${s.intDuration050}°`,
      `Exhaust Duration at 0.050": ${s.exhDuration050}°`,
      `Intake Max Lift: ${s.intMaxLift}"`,
      `Exhaust Max Lift: ${s.exhMaxLift}"`,
      `LSA: ${s.lsa}°`,
      `Advance: ${C.cardAdvance.toFixed(1)}°`,
      `Card ICL: ${C.cardICL.toFixed(1)}° ATDC`,
      `Card Exhaust CL: ${C.cardExhCL.toFixed(1)}° BTDC`,
      "",
      "TDC VERIFICATION",
      `Reading CW: ${s.tdcReadingCW}°  |  Reading CCW: ${s.tdcReadingCCW}°`,
      `TDC Offset: ${C.tdcOffset >= 0 ? "+" : ""}${C.tdcOffset.toFixed(1)}°`,
      "",
      "MEASURED INTAKE EVENTS (at 0.050\")",
      `IVO: ${s.ivoMeasured}° BTDC  |  IVC: ${s.ivcMeasured}° ABDC`,
      `Measured Duration: ${C.measuredDuration}° (card: ${s.intDuration050}°)`,
      "",
      "INTAKE CENTERLINE COMPARISON",
      `Measured ICL: ${C.measuredICL.toFixed(1)}° ATDC`,
      `Card ICL: ${C.cardICL.toFixed(1)}° ATDC`,
      `Difference: ${C.iclDifference >= 0 ? "+" : ""}${C.iclDifference.toFixed(1)}° (${C.iclDifference > 0 ? "retarded" : C.iclDifference < 0 ? "advanced" : "on spec"})`,
      `Status: ${iclStatus.label}`,
    ];

    if (C.hasExhaust) {
      lines.push(
        "",
        "MEASURED EXHAUST EVENTS (at 0.050\")",
        `EVO: ${s.evoMeasured}° BBDC  |  EVC: ${s.evcMeasured}° ATDC`,
        `Measured Exhaust Duration: ${C.measuredExhDuration}°  (card: ${s.exhDuration050}°)`,
        `Measured Exhaust CL: ${C.measuredExhCL!.toFixed(1)}° BTDC`,
        `Measured LSA: ${C.measuredLSA!.toFixed(1)}°  (card: ${s.lsa}°, diff: ${C.lsaDiff! >= 0 ? "+" : ""}${C.lsaDiff!.toFixed(1)}°)`,
      );
    }

    if (C.peakAngle !== null) {
      lines.push(
        "",
        "PEAK-LIFT VERIFICATION",
        `Peak Lift ICL: ${C.peakAngle.toFixed(1)}° ATDC`,
        `Variance from 0.050" ICL: ${C.peakLiftVariance!.toFixed(1)}°`,
      );
    }

    lines.push(
      "",
      "Generated by Engine-build.com Cam Degreeing Calculator",
      "engine-build.com",
    );

    return lines.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildSheet()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="px-4 space-y-5">
        <div>
          <SEOHead
            title="Cam Degreeing Calculator | Intake Centerline & TDC"
            description="Step-by-step cam degreeing guide with intake centerline calculator. Verify cam timing, find true TDC, and get offset bushing recommendations."
            canonical="/calculators/cam-degreeing"
            keywords="cam degreeing calculator, degree camshaft, intake centerline calculator, cam timing verification, offset bushing calculator, piston stop TDC, degreeing cam, cam installation tool"
          />
          <h1 className="text-3xl font-bold mb-1">Cam Degreeing Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Step-by-step workflow: verify TDC, measure valve events, compare to cam card, and get correction recommendations.
          </p>
          <div className="p-3 rounded-lg border border-[#E85D04]/30 bg-[#E85D04]/5">
            <p className="text-sm">
              <strong>Still choosing a cam?</strong>{" "}
              <Link href="/calculators/cam-duration" className="text-[#E85D04] font-medium hover:underline">
                Use the Advanced Cam Calculator
              </Link>
              {" "}to analyze valve events, overlap, LSA recommendations, and dynamic compression ratio before you buy.
            </p>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 min-w-0">

        {/* ── STEP 1: Cam Card Specs ─────────────────────────── */}
        <Section title="Step 1 — Enter Your Cam Card Specs">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Duration at 0.050"</p>
                <Field label='Intake Duration at 0.050" (degrees)'>
                  <Input type="number" step="1" value={s.intDuration050} onChange={set("intDuration050")} />
                </Field>
                <Field label='Exhaust Duration at 0.050" (degrees)'>
                  <Input type="number" step="1" value={s.exhDuration050} onChange={set("exhDuration050")} />
                </Field>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Lift</p>
                <Field label="Intake Max Valve Lift (inches)" hint="Gross valve lift from your cam card (lobe lift × rocker ratio)">
                  <Input type="number" step="0.001" value={s.intMaxLift} onChange={set("intMaxLift")} />
                </Field>
                <Field label="Exhaust Max Valve Lift (inches)">
                  <Input type="number" step="0.001" value={s.exhMaxLift} onChange={set("exhMaxLift")} />
                </Field>
              </div>
            </div>

            {/* LSA & ICL with mode toggle */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Timing — LSA & Intake Centerline</p>

              <Field label="Lobe Separation Angle — LSA (degrees)" hint="Always on your cam card. The angle between intake and exhaust lobe centerlines — ground into the cam and cannot be changed.">
                <Input type="number" step="0.5" value={s.lsa} onChange={set("lsa")} />
              </Field>

              {/* ICL input mode toggle */}
              <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">How does your cam card specify the installed position?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setICLMode("from-advance")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${s.iclMode === "from-advance" ? "bg-[#E85D04] text-white" : "bg-white border text-gray-600 hover:bg-gray-100"}`}
                  >
                    LSA + Advance
                  </button>
                  <button
                    onClick={() => setICLMode("direct")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${s.iclMode === "direct" ? "bg-[#E85D04] text-white" : "bg-white border text-gray-600 hover:bg-gray-100"}`}
                  >
                    ICL directly
                  </button>
                </div>

                {s.iclMode === "from-advance" ? (
                  <Field label="Cam Advance (degrees)" hint='Your card may say "4° advance" or "installed at 4° advance." If it says "straight up" or "0° advance," enter 0.'>
                    <Input type="number" step="0.5" value={s.cardAdvance} onChange={set("cardAdvance")} />
                  </Field>
                ) : (
                  <Field label="Intake Centerline — ICL (degrees ATDC)" hint='Some cards say "intake centerline 106°" or "installed at 106° ATDC."'>
                    <Input type="number" step="0.5" value={s.cardICL} onChange={set("cardICL")} />
                  </Field>
                )}

                <div className="text-xs text-muted-foreground bg-white rounded p-2 border space-y-1">
                  <p><strong>ICL = LSA − Advance.</strong> If your card says LSA 110 with 4° advance, your target ICL is 106° ATDC.</p>
                  <p>LSA is ground into the cam and never changes. Advance/retard shifts the ICL by installing the cam earlier or later relative to the crankshaft. The ICL is what you verify when degreeing.</p>
                </div>
              </div>
            </div>

            {/* Optional cam card valve events */}
            <div>
              <button
                onClick={() => setShowCardEvents(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-[#E85D04] hover:text-[#d04f00] transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCardEvents ? "rotate-180" : ""}`} />
                Optional: Enter cam card valve events at 0.050"
              </button>
              {showCardEvents && (
                <div className="mt-3 space-y-4 pl-1">
                  <p className="text-xs text-muted-foreground">
                    If your cam card lists the four valve events at 0.050", enter them here. Your measured values in Steps 3 and 3b will be compared directly against these.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="IO (° BTDC)">
                      <Input type="number" step="0.5" value={s.cardIO050} onChange={set("cardIO050")} placeholder="—" />
                    </Field>
                    <Field label="IC (° ABDC)">
                      <Input type="number" step="0.5" value={s.cardIC050} onChange={set("cardIC050")} placeholder="—" />
                    </Field>
                    <Field label="EO (° BBDC)">
                      <Input type="number" step="0.5" value={s.cardEO050} onChange={set("cardEO050")} placeholder="—" />
                    </Field>
                    <Field label="EC (° ATDC)">
                      <Input type="number" step="0.5" value={s.cardEC050} onChange={set("cardEC050")} placeholder="—" />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1 output summary */}
            <div className="bg-[#1a1a1a] text-white rounded-xl p-5 space-y-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Card ICL (target)</div>
                  <div className="text-2xl font-bold text-[#E85D04] mt-1">{C.cardICL.toFixed(1)}° ATDC</div>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Advance</div>
                  <div className="text-2xl font-bold text-white mt-1">{C.cardAdvance.toFixed(1)}°</div>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Card Exhaust CL</div>
                  <div className="text-2xl font-bold text-white mt-1">{C.cardExhCL.toFixed(1)}° BTDC</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                ICL = LSA − Advance = {C.lsa} − {C.cardAdvance.toFixed(1)} = {C.cardICL.toFixed(1)}  ·  Exhaust CL = 2 × LSA − ICL = {(2 * C.lsa).toFixed(0)} − {C.cardICL.toFixed(1)} = {C.cardExhCL.toFixed(1)}
              </div>
            </div>
          </div>
        </Section>

        {/* ── STEP 2: Find True TDC ─────────────────────────── */}
        <Section title="Step 2 — Find True TDC Using a Piston Stop">
          <div className="space-y-5">
            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p>
                The timing pointer on your damper is usually off by 1–3 degrees. Before degreeing your cam, establish true TDC using a piston stop.
              </p>
              <p>
                Install a piston stop (a bolt that sticks down into the spark plug hole to prevent the piston from reaching TDC). Rotate the crank <strong>clockwise</strong> until the piston hits the stop. Note the degree. Then rotate <strong>counter-clockwise</strong> past the other side until the piston hits again. Note that degree too. True TDC is exactly halfway between the two readings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Reading 1 — Clockwise (degrees)" hint="Degrees from damper TDC mark when piston hits stop rotating CW">
                <Input type="number" step="0.5" value={s.tdcReadingCW} onChange={set("tdcReadingCW")} />
              </Field>
              <Field label="Reading 2 — Counter-Clockwise (degrees)" hint="Degrees from damper TDC mark when piston hits stop rotating CCW">
                <Input type="number" step="0.5" value={s.tdcReadingCCW} onChange={set("tdcReadingCCW")} />
              </Field>
            </div>

            {/* TDC Results */}
            <div className="bg-[#1a1a1a] text-white rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Average of Readings</div>
                  <div className="text-2xl font-bold mt-1">{C.tdcAverage.toFixed(1)}°</div>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">TDC Offset from Pointer</div>
                  <div className="text-2xl font-bold text-[#E85D04] mt-1">{Math.abs(C.tdcOffset).toFixed(1)}°</div>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Rotate Pointer</div>
                  <div className="text-2xl font-bold mt-1">
                    {C.tdcOffset === 0 ? "No correction" : `${Math.abs(C.tdcOffset).toFixed(1)}° ${C.tdcOffset > 0 ? "CW" : "CCW"}`}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                TDC offset = (CW − CCW) / 2 = ({C.readCW} − {C.readCCW}) / 2 = {C.tdcOffset >= 0 ? "+" : ""}{C.tdcOffset.toFixed(1)}°
              </div>
            </div>

            {/* TDC Warning */}
            {C.tdcReadingsDiff > 3 && (
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                <p className="font-bold text-yellow-700">Readings differ significantly ({C.tdcReadingsDiff.toFixed(1)}° apart)</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  This usually means the degree wheel is slipping. Re-verify that the wheel is securely mounted to the crank snout.
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* ── STEP 3: Measure IVO/IVC ───────────────────────── */}
        <Section title='Step 3 — Measure Intake Valve Events at 0.050"'>
          <div className="space-y-5">
            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-gray-700">Opening/Closing Method (measures valve events directly at 0.050" above the base circle)</p>
              <p>
                Install a dial indicator on the #1 intake lifter (or on the retainer if measuring at the valve). Zero the indicator with the lifter resting on the base circle (fully down). Rotate the engine in its normal direction of rotation. As the intake lobe begins lifting the lifter, watch the dial indicator. When it reads exactly <strong>0.050 inch</strong> above the base circle, read the degree wheel.
              </p>
              <p>
                Continue rotating. The lifter peaks, then descends. When it returns to exactly <strong>0.050 inch</strong> above the base circle on the closing ramp, read the degree wheel again.
              </p>
            </div>

            {/* Checking lifter & rotation warnings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-sm font-semibold text-blue-700">Use a solid checking lifter</p>
                <p className="text-xs text-blue-600 mt-1">
                  Hydraulic lifters bleed down during slow manual rotation, giving false readings. Use a solid checking lifter, or flip a hydraulic lifter upside down (mechanic's trick). Remove valve springs and use checking springs so you can turn the crank by hand.
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-sm font-semibold text-blue-700">Always rotate in normal direction</p>
                <p className="text-xs text-blue-600 mt-1">
                  Take your final readings while rotating in the engine's normal direction of rotation (clockwise viewed from the front on most V8s). This takes up timing chain slack. If you reverse direction, backlash adds 0.5–1° of error.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label='IVO at 0.050" (degrees BTDC)' hint="Intake valve opening — degrees before top dead center">
                <Input type="number" step="0.5" value={s.ivoMeasured} onChange={set("ivoMeasured")} />
              </Field>
              <Field label='IVC at 0.050" (degrees ABDC)' hint="Intake valve closing — degrees after bottom dead center">
                <Input type="number" step="0.5" value={s.ivcMeasured} onChange={set("ivcMeasured")} />
              </Field>
            </div>

            {/* Duration sanity check */}
            <div className="bg-[#1a1a1a] text-white rounded-xl p-5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-400">Measured Intake Duration at 0.050"</div>
                  <div className="text-3xl font-bold text-[#E85D04] mt-1">{C.measuredDuration}°</div>
                  <div className="text-xs text-gray-500 mt-0.5">IVO + 180 + IVC = {C.ivoMeasured} + 180 + {C.ivcMeasured} = {C.measuredDuration}°</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Card Duration</div>
                  <div className="text-3xl font-bold text-white mt-1">{C.intDur050}°</div>
                </div>
              </div>
            </div>

            {/* Card event comparison if entered */}
            {C.hasCardEvents && (
              <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Cam card event comparison</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">IVO: measured {C.ivoMeasured}° vs card {C.cardIO050}°</span>
                    <EventDiffBadge diff={C.ivoDiff!} unit="" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">IVC: measured {C.ivcMeasured}° vs card {C.cardIC050}°</span>
                    <EventDiffBadge diff={C.ivcDiff!} unit="" />
                  </div>
                </div>
              </div>
            )}

            {C.durationDiff > 5 && (
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                <p className="font-bold text-yellow-700">Measured duration differs from cam card by {C.durationDiff.toFixed(0)}°</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Double-check your dial indicator calibration and make sure you're reading at exactly 0.050 inch lift. A large discrepancy usually means the indicator isn't zeroed on the base circle or is measuring at the wrong lift point.
                </p>
              </div>
            )}

            <div className="bg-gray-50 border rounded-lg p-3 text-xs text-muted-foreground">
              <p><strong>Note:</strong> If you watched a YouTube tutorial that found peak lift first, then measured 0.050" drop on each side — that's the "Centerline Method." It produces the same result as this Opening/Closing method. The difference is reference point: we measure 0.050" rise from the base circle. Both are valid at 0.050" checking height.</p>
            </div>
          </div>
        </Section>

        {/* ── STEP 3b: Optional Exhaust Measurement ─────────── */}
        <Section title='Step 3b (Optional) — Measure Exhaust Valve Events at 0.050"' defaultOpen={false}>
          <div className="space-y-5">
            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p>
                Most builders only degree the intake lobe — if the intake centerline is correct, the exhaust follows because the LSA is ground into the cam. However, measuring the exhaust lobe too lets you <strong>verify the cam was ground correctly</strong> by checking that the actual LSA matches the card.
              </p>
              <p>
                Move your dial indicator to the #1 exhaust lifter and repeat the same procedure. Record the exhaust opening and closing points at 0.050" lift.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label='EVO at 0.050" (degrees BBDC)' hint="Exhaust valve opening — degrees before bottom dead center">
                <Input type="number" step="0.5" value={s.evoMeasured} onChange={set("evoMeasured")} placeholder="Optional" />
              </Field>
              <Field label='EVC at 0.050" (degrees ATDC)' hint="Exhaust valve closing — degrees after top dead center">
                <Input type="number" step="0.5" value={s.evcMeasured} onChange={set("evcMeasured")} placeholder="Optional" />
              </Field>
            </div>

            {C.hasExhaust && (
              <div className="space-y-4">
                <div className="bg-[#1a1a1a] text-white rounded-xl p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">Exhaust Duration</div>
                      <div className="text-xl font-bold text-white mt-1">{C.measuredExhDuration}°</div>
                      <div className="text-xs text-gray-500">card: {C.exhDur050}°</div>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">Exhaust CL</div>
                      <div className="text-xl font-bold text-[#E85D04] mt-1">{C.measuredExhCL!.toFixed(1)}° BTDC</div>
                      <div className="text-xs text-gray-500">card: {C.cardExhCL.toFixed(1)}°</div>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">Measured LSA</div>
                      <div className="text-xl font-bold text-[#E85D04] mt-1">{C.measuredLSA!.toFixed(1)}°</div>
                      <div className="text-xs text-gray-500">card: {C.lsa}°</div>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">LSA Difference</div>
                      <div className="text-xl font-bold text-white mt-1">{C.lsaDiff! >= 0 ? "+" : ""}{C.lsaDiff!.toFixed(1)}°</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Exhaust CL = (EVO + 180 − EVC) / 2  ·  Measured LSA = (ICL + Exhaust CL) / 2 = ({C.measuredICL.toFixed(1)} + {C.measuredExhCL!.toFixed(1)}) / 2 = {C.measuredLSA!.toFixed(1)}°
                  </div>
                </div>

                {/* Card exhaust event comparison if entered */}
                {C.hasCardExhEvents && (
                  <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Cam card exhaust event comparison</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">EVO: measured {C.evoMeasured}° vs card {C.cardEO050}°</span>
                        <EventDiffBadge diff={C.evoDiff!} unit="" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">EVC: measured {C.evcMeasured}° vs card {C.cardEC050}°</span>
                        <EventDiffBadge diff={C.evcDiff!} unit="" />
                      </div>
                    </div>
                  </div>
                )}

                {C.exhDurationDiff !== null && C.exhDurationDiff > 5 && (
                  <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="font-bold text-yellow-700">Exhaust duration differs from card by {C.exhDurationDiff.toFixed(0)}°</p>
                    <p className="text-sm mt-1 text-muted-foreground">Check indicator calibration and verify you're measuring the exhaust lobe, not the intake.</p>
                  </div>
                )}

                {Math.abs(C.lsaDiff!) > 2 && (
                  <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="font-bold text-yellow-700">Measured LSA differs from card by {Math.abs(C.lsaDiff!).toFixed(1)}°</p>
                    <p className="text-sm mt-1 text-muted-foreground">
                      LSA is ground into the cam and should not change with installation. A significant difference may indicate a grinding error, or that you're measuring at slightly different lift points on the intake vs exhaust lobes. Re-verify both measurements before contacting the cam manufacturer.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* ── STEP 4: Compare ICL ───────────────────────────── */}
        <Section title="Step 4 — Compare Measured ICL to Cam Card">
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Measured ICL</div>
                <div className="text-3xl font-bold text-[#E85D04]">{C.measuredICL.toFixed(1)}°</div>
                <div className="text-xs text-gray-500">ATDC</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Card ICL</div>
                <div className="text-3xl font-bold text-gray-900">{C.cardICL.toFixed(1)}°</div>
                <div className="text-xs text-gray-500">ATDC</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center sm:col-span-2">
                <div className="text-xs text-gray-500 mb-1">Difference</div>
                <div className="text-3xl font-bold text-[#E85D04]">{C.iclDifference >= 0 ? "+" : ""}{C.iclDifference.toFixed(1)}°</div>
                <div className="text-xs text-gray-500">
                  {C.iclDifference > 0 ? "cam is retarded" : C.iclDifference < 0 ? "cam is advanced" : "on spec"}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4 space-y-1 text-xs text-muted-foreground">
              <p>Measured ICL = (IVC + 180 − IVO) / 2 = ({C.ivcMeasured} + 180 − {C.ivoMeasured}) / 2 = {C.measuredICL.toFixed(1)}°</p>
              <p>Difference = Measured ICL − Card ICL = {C.measuredICL.toFixed(1)} − {C.cardICL.toFixed(1)} = {C.iclDifference >= 0 ? "+" : ""}{C.iclDifference.toFixed(1)}°</p>
            </div>

            {/* Status badge */}
            <div className={`p-4 rounded-lg border ${iclStatus.bg}`}>
              <p className={`font-bold ${iclStatus.color}`}>{iclStatus.label}</p>
              <p className="text-sm mt-1 text-muted-foreground">{iclStatus.detail}</p>
            </div>
          </div>
        </Section>

        {/* ── STEP 5: Hardware Recommendation ───────────────── */}
        <Section title="Step 5 — Correction Options">
          <div className="space-y-5">
            {Math.abs(C.iclDifference) <= 1 ? (
              <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                <p className="font-bold text-green-700">No correction needed</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Your cam is installed within 1° of the cam card spec. This is within measurement precision — don't install an offset bushing for a 1° difference, you'll just introduce different tolerance errors.
                </p>
              </div>
            ) : hwRec && (
              <div className={`p-4 rounded-lg border ${hwRec.bg}`}>
                <p className={`font-bold ${hwRec.color}`}>
                  {Math.abs(C.iclDifference) > 8 ? "Re-verify TDC first" : `Recommended: ${Math.abs(C.iclDifference).toFixed(0)}° ${C.iclDifference > 0 ? "advance" : "retard"} correction`}
                </p>
                <p className="text-sm mt-2 text-muted-foreground">{hwRec.text}</p>
              </div>
            )}

            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p><strong>Why "advance" corrects a retarded cam:</strong> If the measured ICL is higher than the card spec (e.g., 110° vs 106°), valve events happen later in crank rotation than designed. An advance bushing or gear position shifts events earlier, bringing the ICL back down to the target.</p>
            </div>
          </div>
        </Section>

        {/* ── STEP 6: Lift Method (Optional) ────────────────── */}
        <Section title="Step 6 (Advanced) — Verify with Lift Method" defaultOpen={false}>
          <div className="space-y-5">
            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p>
                For asymmetric lobes (common in race cams with different opening and closing ramps), the 0.050 inch method may give a different ICL than the peak-lift method. If you have a high-quality dial indicator and careful setup, you can also find peak lift directly.
              </p>
              <p>
                Rotate the engine to find the crank angle where the intake lifter is at maximum height. Record this angle.
              </p>
            </div>

            <Field label="Peak Intake Lift Crank Angle (degrees ATDC)" hint="Leave blank to skip this verification">
              <Input type="number" step="0.5" value={s.peakLiftAngle} onChange={set("peakLiftAngle")} placeholder="Optional" />
            </Field>

            {C.peakAngle !== null && (
              <div className="space-y-3">
                <div className="bg-[#1a1a1a] text-white rounded-xl p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">Peak-Lift ICL</div>
                      <div className="text-2xl font-bold text-[#E85D04] mt-1">{C.peakAngle.toFixed(1)}° ATDC</div>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">0.050" ICL (Step 4)</div>
                      <div className="text-2xl font-bold text-white mt-1">{C.measuredICL.toFixed(1)}° ATDC</div>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">Variance</div>
                      <div className="text-2xl font-bold text-white mt-1">{C.peakLiftVariance!.toFixed(1)}°</div>
                    </div>
                  </div>
                </div>

                {C.peakLiftVariance! > 2 && (
                  <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="font-bold text-yellow-700">Lobe appears asymmetric ({C.peakLiftVariance!.toFixed(1)}° variance)</p>
                    <p className="text-sm mt-1 text-muted-foreground">
                      For cams near P2V limits or near race-level RPM, peak-lift ICL is more reliable than 0.050 inch ICL for valve event timing decisions.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* ── Build Sheet Summary ────────────────────────────── */}
        <Section title="Build Sheet Summary">
          <div className="space-y-5" id="printable-summary">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Card>
                <CardHeader><CardTitle className="text-base">Cam Card Specs</CardTitle></CardHeader>
                <CardContent className="space-y-0.5">
                  <ResultRow label='Intake Duration at 0.050"' value={`${s.intDuration050}°`} />
                  <ResultRow label='Exhaust Duration at 0.050"' value={`${s.exhDuration050}°`} />
                  <ResultRow label="Intake Max Lift" value={`${s.intMaxLift}"`} />
                  <ResultRow label="Exhaust Max Lift" value={`${s.exhMaxLift}"`} />
                  <ResultRow label="LSA" value={`${s.lsa}°`} />
                  <ResultRow label="Advance" value={`${C.cardAdvance.toFixed(1)}°`} />
                  <ResultRow label="Card ICL" value={`${C.cardICL.toFixed(1)}° ATDC`} />
                  <ResultRow label="Card Exhaust CL" value={`${C.cardExhCL.toFixed(1)}° BTDC`} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Measurements & Results</CardTitle></CardHeader>
                <CardContent className="space-y-0.5">
                  <ResultRow label="TDC Offset" value={`${C.tdcOffset === 0 ? "0" : (C.tdcOffset >= 0 ? "+" : "") + C.tdcOffset.toFixed(1)}°`} sub={C.tdcOffset === 0 ? "Pointer is accurate" : `Rotate pointer ${Math.abs(C.tdcOffset).toFixed(1)}° ${C.tdcOffset > 0 ? "CW" : "CCW"}`} />
                  <ResultRow label='IVO at 0.050"' value={`${s.ivoMeasured}° BTDC`} />
                  <ResultRow label='IVC at 0.050"' value={`${s.ivcMeasured}° ABDC`} />
                  <ResultRow label="Measured Duration" value={`${C.measuredDuration}°`} sub={`Card: ${s.intDuration050}°`} />
                  <ResultRow label="Measured ICL" value={`${C.measuredICL.toFixed(1)}° ATDC`} />
                  <ResultRow label="Difference from Card" value={`${C.iclDifference >= 0 ? "+" : ""}${C.iclDifference.toFixed(1)}°`} sub={iclStatus.label} />
                  {C.hasExhaust && (
                    <>
                      <ResultRow label="Measured Exhaust CL" value={`${C.measuredExhCL!.toFixed(1)}° BTDC`} />
                      <ResultRow label="Measured LSA" value={`${C.measuredLSA!.toFixed(1)}°`} sub={`Card: ${s.lsa}°, diff: ${C.lsaDiff! >= 0 ? "+" : ""}${C.lsaDiff!.toFixed(1)}°`} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

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

            <p className="text-xs text-center text-muted-foreground">engine-build.com</p>
          </div>
        </Section>

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
                <h4 className="font-semibold text-foreground mb-1">Why Degree the Cam?</h4>
                <p>Manufacturing tolerances in blanks, keyways, and chains can stack 2-6 degrees of error. Degreeing verifies actual vs. spec installation.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Advance vs Retard</h4>
                <ul className="space-y-1 mt-1">
                  <li><span className="font-medium text-foreground">+4° advance:</span> +4-6 ft-lb low RPM, -3-5 HP peak</li>
                  <li><span className="font-medium text-foreground">Retard:</span> Opposite — more top-end, less low-end</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Common Errors</h4>
                <ul className="space-y-1 mt-1">
                  <li>Not using piston stop for true TDC (damper pointer can be off 1-3°)</li>
                  <li>Chain backlash adding 0.5-1° per reading</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Correction Thresholds</h4>
                <p>1° = within measurement precision, ignore it. 2° = correct on street builds. 3°+ = always correct.</p>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Street Engine Tip</h4>
                <p>Factory cams are typically ground 2-4° advanced from design spec. Installing "straight up" per card may feel lazy at low RPM vs factory feel.</p>
              </div>
            </CardContent>
          </Card>
        </aside>

        </div>{/* end flex row */}

        <CalculatorContent data={camDegreeingContent} title="Cam Degreeing" />
      </div>
    </div>
  );
}
