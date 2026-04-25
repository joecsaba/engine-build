import { useState, useCallback } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Printer, Clipboard, Check } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface State {
  // Step 1: Cam card specs
  intDuration050: string;
  exhDuration050: string;
  intMaxLift: string;
  exhMaxLift: string;
  lsa: string;
  cardICL: string;
  // Step 2: TDC
  tdcReadingCW: string;
  tdcReadingCCW: string;
  // Step 3: Measured events
  ivoMeasured: string;
  ivcMeasured: string;
  // Step 6: Peak lift
  peakLiftAngle: string;
}

const DEFAULT: State = {
  intDuration050: "224",
  exhDuration050: "230",
  intMaxLift: "0.480",
  exhMaxLift: "0.484",
  lsa: "110",
  cardICL: "106",
  tdcReadingCW: "10",
  tdcReadingCCW: "10",
  ivoMeasured: "4",
  ivcMeasured: "40",
  peakLiftAngle: "",
};

// ── Calculations ───────────────────────────────────────────────────────────────

function calc(s: State) {
  const n = (v: string) => parseFloat(v) || 0;

  // Step 1
  const intDur050 = n(s.intDuration050);
  const exhDur050 = n(s.exhDuration050);
  const lsa = n(s.lsa);
  const cardICL = n(s.cardICL);
  const cardExhCL = 2 * lsa - cardICL;

  // Step 2: TDC
  const readCW = n(s.tdcReadingCW);
  const readCCW = n(s.tdcReadingCCW);
  const tdcOffset = (readCW - readCCW) / 2;
  const tdcAverage = (readCW + readCCW) / 2;
  const tdcReadingsDiff = Math.abs(readCW - readCCW);

  // Step 3: Measured valve events
  const ivoMeasured = n(s.ivoMeasured);
  const ivcMeasured = n(s.ivcMeasured);
  const measuredDuration = ivoMeasured + 180 + ivcMeasured;
  const durationDiff = Math.abs(measuredDuration - intDur050);

  // Step 4: Measured ICL
  const measuredICL = (ivcMeasured + 180 - ivoMeasured) / 2;
  const iclDifference = measuredICL - cardICL;

  // Step 6: Peak lift verification
  const peakAngle = s.peakLiftAngle ? n(s.peakLiftAngle) : null;
  const peakLiftVariance = peakAngle !== null ? Math.abs(peakAngle - measuredICL) : null;

  return {
    intDur050, exhDur050, lsa, cardICL, cardExhCL,
    readCW, readCCW, tdcOffset, tdcAverage, tdcReadingsDiff,
    ivoMeasured, ivcMeasured, measuredDuration, durationDiff,
    measuredICL, iclDifference,
    peakAngle, peakLiftVariance,
  };
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function getICLStatus(diff: number): { label: string; detail: string; color: string; bg: string } {
  const absDiff = Math.abs(diff);
  const direction = diff > 0 ? "retarded" : "advanced";

  if (absDiff <= 1) return {
    label: "On spec",
    detail: "Cam is installed per cam card spec (within tolerance).",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  };
  if (absDiff <= 3) return {
    label: `Slightly ${direction}`,
    detail: `Cam is slightly ${direction}. This is within typical timing chain tolerance. Consider verifying against the cam builder's recommendation for your specific application.`,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  };
  if (absDiff <= 6) return {
    label: `Meaningfully ${direction}`,
    detail: `Cam is meaningfully ${direction}. Consider an offset bushing to correct.`,
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  };
  return {
    label: "Large offset — recheck TDC",
    detail: "Large timing offset detected. RE-VERIFY YOUR TDC MEASUREMENT FIRST — this is the single most common source of degreeing error. Then consider offset bushing or different timing gear.",
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
    text: `Cloyes Hex-A-Just or similar multi-position timing gear. Install at the ${absDiff.toFixed(0)}\u00b0 ${direction} position to ${targetICL}.`,
    color: "text-gray-900",
    bg: "bg-white border-gray-200",
  };

  if (absDiff <= 8) return {
    text: `Offset bushing. Use a ${Math.round(absDiff)}\u00b0 ${direction} bushing to shift cam timing by the required amount. Comp Cams offset bushings come in 2\u00b0, 4\u00b0, 6\u00b0, 8\u00b0 sizes. Pick the one matching the correction needed.`,
    color: "text-gray-900",
    bg: "bg-white border-gray-200",
  };

  return {
    text: "This is likely a TDC measurement error, not a real cam offset. Re-do Step 2 with a fresh piston stop installation. If the error persists, check for: slipping degree wheel, wrong timing gear installation (dot-to-dot?), cam installed 180\u00b0 out (exhaust lobe being measured as intake).",
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CamDegreeingCalculator() {
  const [s, setS] = useState<State>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = useCallback(<K extends keyof State>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setS(prev => ({ ...prev, [k]: e.target.value })),
  []);

  const C = calc(s);
  const iclStatus = getICLStatus(C.iclDifference);
  const hwRec = getHardwareRec(C.iclDifference);

  // ── Build Sheet ──

  const buildSheet = () => {
    const lines = [
      "=== CAM DEGREEING — BUILD SHEET ===",
      "",
      "CAM CARD SPECS",
      `Intake Duration at 0.050": ${s.intDuration050}\u00b0`,
      `Exhaust Duration at 0.050": ${s.exhDuration050}\u00b0`,
      `Intake Max Lift: ${s.intMaxLift}"`,
      `Exhaust Max Lift: ${s.exhMaxLift}"`,
      `LSA: ${s.lsa}\u00b0`,
      `Card ICL: ${s.cardICL}\u00b0 ATDC`,
      `Card Exhaust CL: ${C.cardExhCL.toFixed(1)}\u00b0 BTDC`,
      "",
      "TDC VERIFICATION",
      `Reading CW: ${s.tdcReadingCW}\u00b0  |  Reading CCW: ${s.tdcReadingCCW}\u00b0`,
      `TDC Offset: ${C.tdcOffset >= 0 ? "+" : ""}${C.tdcOffset.toFixed(1)}\u00b0`,
      "",
      "MEASURED VALVE EVENTS (at 0.050\")",
      `IVO: ${s.ivoMeasured}\u00b0 BTDC  |  IVC: ${s.ivcMeasured}\u00b0 ABDC`,
      `Measured Duration: ${C.measuredDuration}\u00b0 (card: ${s.intDuration050}\u00b0)`,
      "",
      "INTAKE CENTERLINE COMPARISON",
      `Measured ICL: ${C.measuredICL.toFixed(1)}\u00b0 ATDC`,
      `Card ICL: ${C.cardICL}\u00b0 ATDC`,
      `Difference: ${C.iclDifference >= 0 ? "+" : ""}${C.iclDifference.toFixed(1)}\u00b0 (${C.iclDifference > 0 ? "retarded" : C.iclDifference < 0 ? "advanced" : "on spec"})`,
      `Status: ${iclStatus.label}`,
    ];

    if (C.peakAngle !== null) {
      lines.push(
        "",
        "PEAK-LIFT VERIFICATION",
        `Peak Lift ICL: ${C.peakAngle.toFixed(1)}\u00b0 ATDC`,
        `Variance from 0.050" ICL: ${C.peakLiftVariance!.toFixed(1)}\u00b0`,
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
    <div className="max-w-4xl mx-auto">
      <div className="px-4 space-y-5">
        <div>
          <SEOHead
            title="Cam Degreeing Calculator"
            description="Step-by-step cam degreeing guide with intake centerline calculator. Verify cam timing, find true TDC, measure valve events, and get offset bushing recommendations. Free tool for engine builders."
            canonical="/calculators/cam-degreeing"
            keywords="cam degreeing calculator, degree camshaft, intake centerline calculator, cam timing verification, offset bushing calculator, piston stop TDC, degreeing cam, cam installation tool"
          />
          <h1 className="text-3xl font-bold mb-1">Cam Degreeing Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Step-by-step workflow: verify TDC, measure valve events, compare to cam card, and get correction recommendations.
          </p>
        </div>

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
                <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Lift & Timing</p>
                <Field label="Intake Max Valve Lift (inches)">
                  <Input type="number" step="0.001" value={s.intMaxLift} onChange={set("intMaxLift")} />
                </Field>
                <Field label="Exhaust Max Valve Lift (inches)">
                  <Input type="number" step="0.001" value={s.exhMaxLift} onChange={set("exhMaxLift")} />
                </Field>
              </div>
              <Field label="Lobe Separation Angle — LSA (degrees)" hint="Found on your cam card. Angle between intake and exhaust lobe centerlines.">
                <Input type="number" step="0.5" value={s.lsa} onChange={set("lsa")} />
              </Field>
              <Field label='Advertised ICL (degrees ATDC)' hint='Cam card says "installed at X° ATDC" — this is the target if installed straight up.'>
                <Input type="number" step="0.5" value={s.cardICL} onChange={set("cardICL")} />
              </Field>
            </div>

            {/* Step 1 output summary */}
            <div className="bg-[#1a1a1a] text-white rounded-xl p-5 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Card ICL (target)</div>
                  <div className="text-2xl font-bold text-[#E85D04] mt-1">{C.cardICL}\u00b0 ATDC</div>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Card Exhaust CL</div>
                  <div className="text-2xl font-bold text-white mt-1">{C.cardExhCL.toFixed(1)}\u00b0 BTDC</div>
                  <div className="text-xs text-gray-500 mt-0.5">2 \u00d7 LSA \u2212 ICL = {(2 * C.lsa).toFixed(0)} \u2212 {C.cardICL} = {C.cardExhCL.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── STEP 2: Find True TDC ─────────────────────────── */}
        <Section title="Step 2 — Find True TDC Using a Piston Stop">
          <div className="space-y-5">
            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p>
                The timing pointer on your damper is usually off by 1\u20133 degrees. Before degreeing your cam, establish true TDC using a piston stop.
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
                  <div className="text-2xl font-bold mt-1">{C.tdcAverage.toFixed(1)}\u00b0</div>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">TDC Offset from Pointer</div>
                  <div className="text-2xl font-bold text-[#E85D04] mt-1">{Math.abs(C.tdcOffset).toFixed(1)}\u00b0</div>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Rotate Pointer</div>
                  <div className="text-2xl font-bold mt-1">
                    {C.tdcOffset === 0 ? "No correction" : `${Math.abs(C.tdcOffset).toFixed(1)}\u00b0 ${C.tdcOffset > 0 ? "CW" : "CCW"}`}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                TDC offset = (CW \u2212 CCW) / 2 = ({C.readCW} \u2212 {C.readCCW}) / 2 = {C.tdcOffset >= 0 ? "+" : ""}{C.tdcOffset.toFixed(1)}\u00b0
              </div>
            </div>

            {/* TDC Warning */}
            {C.tdcReadingsDiff > 3 && (
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                <p className="font-bold text-yellow-700">Readings differ significantly ({C.tdcReadingsDiff.toFixed(1)}\u00b0 apart)</p>
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
              <p>
                Install a dial indicator on the #1 intake lifter (or on the retainer if measuring at the valve). Rotate the engine clockwise. As the intake lobe begins lifting the lifter, watch the dial indicator. When it reads exactly <strong>0.050 inch</strong> above the base circle, read the degree wheel.
              </p>
              <p>
                Continue rotating. The lifter peaks, then descends. When it returns to exactly <strong>0.050 inch</strong> above the base circle on the closing ramp, read the degree wheel again.
              </p>
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
                  <div className="text-3xl font-bold text-[#E85D04] mt-1">{C.measuredDuration}\u00b0</div>
                  <div className="text-xs text-gray-500 mt-0.5">IVO + 180 + IVC = {C.ivoMeasured} + 180 + {C.ivcMeasured} = {C.measuredDuration}\u00b0</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Card Duration</div>
                  <div className="text-3xl font-bold text-white mt-1">{C.intDur050}\u00b0</div>
                </div>
              </div>
            </div>

            {C.durationDiff > 5 && (
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                <p className="font-bold text-yellow-700">Measured duration differs from cam card by {C.durationDiff.toFixed(0)}\u00b0</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Double-check your dial indicator calibration and make sure you're reading at exactly 0.050 inch lift. A large discrepancy usually means the indicator isn't zeroed on the base circle or is measuring at the wrong lift point.
                </p>
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
                <div className="text-3xl font-bold text-[#E85D04]">{C.measuredICL.toFixed(1)}\u00b0</div>
                <div className="text-xs text-gray-500">ATDC</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Card ICL</div>
                <div className="text-3xl font-bold text-gray-900">{C.cardICL}\u00b0</div>
                <div className="text-xs text-gray-500">ATDC</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center sm:col-span-2">
                <div className="text-xs text-gray-500 mb-1">Difference</div>
                <div className="text-3xl font-bold text-[#E85D04]">{C.iclDifference >= 0 ? "+" : ""}{C.iclDifference.toFixed(1)}\u00b0</div>
                <div className="text-xs text-gray-500">
                  {C.iclDifference > 0 ? "cam is retarded" : C.iclDifference < 0 ? "cam is advanced" : "on spec"}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4 space-y-1 text-xs text-muted-foreground">
              <p>Measured ICL = (IVC + 180 \u2212 IVO) / 2 = ({C.ivcMeasured} + 180 \u2212 {C.ivoMeasured}) / 2 = {C.measuredICL.toFixed(1)}\u00b0</p>
              <p>Difference = Measured ICL \u2212 Card ICL = {C.measuredICL.toFixed(1)} \u2212 {C.cardICL} = {C.iclDifference >= 0 ? "+" : ""}{C.iclDifference.toFixed(1)}\u00b0</p>
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
                  Your cam is installed within 1\u00b0 of the cam card spec. This is within measurement precision — don't install an offset bushing for a 1\u00b0 difference, you'll just introduce different tolerance errors.
                </p>
              </div>
            ) : hwRec && (
              <div className={`p-4 rounded-lg border ${hwRec.bg}`}>
                <p className={`font-bold ${hwRec.color}`}>
                  {Math.abs(C.iclDifference) > 8 ? "Re-verify TDC first" : `Recommended: ${Math.abs(C.iclDifference).toFixed(0)}\u00b0 ${C.iclDifference > 0 ? "advance" : "retard"} correction`}
                </p>
                <p className="text-sm mt-2 text-muted-foreground">{hwRec.text}</p>
              </div>
            )}

            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p><strong>Why "advance" corrects a retarded cam:</strong> If the measured ICL is higher than the card spec (e.g., 110\u00b0 vs 106\u00b0), valve events happen later in crank rotation than designed. An advance bushing or gear position shifts events earlier, bringing the ICL back down to the target.</p>
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
                      <div className="text-2xl font-bold text-[#E85D04] mt-1">{C.peakAngle.toFixed(1)}\u00b0 ATDC</div>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">0.050" ICL (Step 4)</div>
                      <div className="text-2xl font-bold text-white mt-1">{C.measuredICL.toFixed(1)}\u00b0 ATDC</div>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <div className="text-xs text-gray-400">Variance</div>
                      <div className="text-2xl font-bold text-white mt-1">{C.peakLiftVariance!.toFixed(1)}\u00b0</div>
                    </div>
                  </div>
                </div>

                {C.peakLiftVariance! > 2 && (
                  <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="font-bold text-yellow-700">Lobe appears asymmetric ({C.peakLiftVariance!.toFixed(1)}\u00b0 variance)</p>
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
                  <ResultRow label='Intake Duration at 0.050"' value={`${s.intDuration050}\u00b0`} />
                  <ResultRow label='Exhaust Duration at 0.050"' value={`${s.exhDuration050}\u00b0`} />
                  <ResultRow label="Intake Max Lift" value={`${s.intMaxLift}"`} />
                  <ResultRow label="Exhaust Max Lift" value={`${s.exhMaxLift}"`} />
                  <ResultRow label="LSA" value={`${s.lsa}\u00b0`} />
                  <ResultRow label="Card ICL" value={`${s.cardICL}\u00b0 ATDC`} />
                  <ResultRow label="Card Exhaust CL" value={`${C.cardExhCL.toFixed(1)}\u00b0 BTDC`} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Measurements & Results</CardTitle></CardHeader>
                <CardContent className="space-y-0.5">
                  <ResultRow label="TDC Offset" value={`${C.tdcOffset === 0 ? "0" : (C.tdcOffset >= 0 ? "+" : "") + C.tdcOffset.toFixed(1)}\u00b0`} sub={C.tdcOffset === 0 ? "Pointer is accurate" : `Rotate pointer ${Math.abs(C.tdcOffset).toFixed(1)}\u00b0 ${C.tdcOffset > 0 ? "CW" : "CCW"}`} />
                  <ResultRow label='IVO at 0.050"' value={`${s.ivoMeasured}\u00b0 BTDC`} />
                  <ResultRow label='IVC at 0.050"' value={`${s.ivcMeasured}\u00b0 ABDC`} />
                  <ResultRow label="Measured Duration" value={`${C.measuredDuration}\u00b0`} sub={`Card: ${s.intDuration050}\u00b0`} />
                  <ResultRow label="Measured ICL" value={`${C.measuredICL.toFixed(1)}\u00b0 ATDC`} />
                  <ResultRow label="Difference from Card" value={`${C.iclDifference >= 0 ? "+" : ""}${C.iclDifference.toFixed(1)}\u00b0`} sub={iclStatus.label} />
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

        {/* ── Educational Note ───────────────────────────────── */}
        <Card className="mt-8 mx-4">
          <CardHeader>
            <CardTitle className="text-lg">Why Degree Your Camshaft</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
            <p>
              Manufacturing tolerances in cam blanks, keyways, and timing chains can stack to 2\u20136\u00b0 of error even on a brand-new timing set. Degreeing verifies the cam is actually installed where the cam card says it should be. This is usually the difference between a dog of an engine and a strong one \u2014 or, in extreme cases, between a safe build and a bent-valve event.
            </p>
            <h3 className="text-sm font-semibold text-foreground mt-4">Advance vs. Retard Effects</h3>
            <p>
              Advancing the cam by 4\u00b0 typically gains 4\u20136 ft-lb of peak torque at low RPM and loses 3\u20135 HP at peak HP. Retarding does the opposite. This trade-off is why some cam grinders sell the same lobe at different ICLs depending on application.
            </p>
            <h3 className="text-sm font-semibold text-foreground mt-4">Why Most Street Engines Benefit from Some Advance</h3>
            <p>
              Factory cams are usually ground with the ICL advanced 2\u20134\u00b0 from the design spec to favor low-RPM torque. Builders who install the cam "straight up" (exactly per card) often feel the engine is lazy at low RPM vs factory feel.
            </p>
            <h3 className="text-sm font-semibold text-foreground mt-4">The Two Most Common Degreeing Errors</h3>
            <p>
              Not establishing true TDC with a piston stop (the damper pointer can be off 1\u20133\u00b0). Not removing all slack from the degree wheel before reading (backlash adds 0.5\u20131\u00b0 of error on every reading).
            </p>
            <h3 className="text-sm font-semibold text-foreground mt-4">When to Stop Chasing Perfection</h3>
            <p>
              A 1\u00b0 difference from card spec is within measurement precision. Don't install an offset bushing for 1\u00b0 \u2014 you'll just introduce different tolerance errors. 3\u00b0 of difference is worth correcting on a race engine; 2\u00b0 is the threshold on a street build.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
