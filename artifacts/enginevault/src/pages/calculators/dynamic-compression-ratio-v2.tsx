import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Info, Fuel, Activity, Gauge, Calculator, ArrowRightLeft, HelpCircle } from "lucide-react";

/* ─── types ─── */
type CalcMode = "forward" | "solve_chamber" | "solve_ivc";
type CrInputMode = "parts" | "known";
type IvcMethod = "0050" | "seat" | "duration";
type LashType = "hydraulic" | "solid";
type HeadType = "iron_trad" | "iron_fast" | "alum_trad" | "alum_fast";

/* ─── constants ─── */
const CID_TO_CC = 16.387064;

/* ─── octane lookup table ─── */
const OCTANE_TABLE: { max: number; values: [number, number, number, number] }[] = [
  { max: 140, values: [87, 87, 87, 87] },
  { max: 160, values: [87, 87, 87, 87] },
  { max: 175, values: [89, 87, 87, 87] },
  { max: 190, values: [91, 89, 89, 87] },
  { max: 205, values: [93, 91, 91, 89] },
  { max: 220, values: [100, 93, 93, 91] },
  { max: 240, values: [110, 100, 100, 93] },
  { max: Infinity, values: [112, 110, 110, 100] },
];

const HEAD_COL: Record<HeadType, number> = { iron_trad: 0, iron_fast: 1, alum_trad: 2, alum_fast: 3 };

function lookupOctane(crankingActual: number, head: HeadType): number {
  const col = HEAD_COL[head];
  for (const row of OCTANE_TABLE) {
    if (crankingActual < row.max) return row.values[col];
  }
  return 112;
}

function octaneColor(oct: number): { text: string; bg: string; border: string } {
  if (oct <= 91) return { text: "text-green-700", bg: "bg-green-50", border: "border-green-200" };
  if (oct <= 93) return { text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" };
  return { text: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
}

/* ─── piston position (slider-crank) ─── */
function pistonPositionBelowTDC(thetaDeg: number, r: number, l: number): number {
  const thetaRad = (thetaDeg * Math.PI) / 180;
  return r * (1 - Math.cos(thetaRad)) + l - Math.sqrt(l * l - r * r * Math.sin(thetaRad) * Math.sin(thetaRad));
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function DynamicCompressionRatioV2() {
  /* ─── Mode ─── */
  const [calcMode, setCalcMode] = useState<CalcMode>("forward");

  /* ─── Static CR input mode ─── */
  const [crInputMode, setCrInputMode] = useState<CrInputMode>("parts");

  /* ─── Engine geometry (shared) ─── */
  const [bore, setBore] = useState("4.030");
  const [stroke, setStroke] = useState("3.480");
  const [rodLength, setRodLength] = useState("5.700");

  /* ─── Static CR from parts ─── */
  const [chamberVolume, setChamberVolume] = useState("64");
  const [pistonVolume, setPistonVolume] = useState("0");
  const [gasketBore, setGasketBore] = useState("4.100");
  const [gasketThick, setGasketThick] = useState("0.041");
  const [deckClearance, setDeckClearance] = useState("0.000");

  /* ─── Static CR known ─── */
  const [knownStaticCR, setKnownStaticCR] = useState("9.3");

  /* ─── Cam timing ─── */
  const [ivcMethod, setIvcMethod] = useState<IvcMethod>("0050");
  const [ivc0050, setIvc0050] = useState("57");
  const [lashType, setLashType] = useState<LashType>("hydraulic");
  const [ivcSeat, setIvcSeat] = useState("72");
  const [intakeDuration, setIntakeDuration] = useState("224");
  const [lsa, setLsa] = useState("110");
  const [icl, setIcl] = useState("106");
  const [camAdvanceInput, setCamAdvanceInput] = useState("0");

  /* ─── Head type ─── */
  const [headType, setHeadType] = useState<HeadType>("iron_fast");

  /* ─── Boost ─── */
  const [isBoosted, setIsBoosted] = useState(false);

  /* ─── Cam advance slider ─── */
  const [camAdvanceSlider, setCamAdvanceSlider] = useState(0);

  /* ─── Reverse-solve target ─── */
  const [targetDCR, setTargetDCR] = useState("8.0");

  /* ═══════════════════════════════════════════════════════════
     DERIVED CALCULATIONS
     ═══════════════════════════════════════════════════════════ */
  const results = useMemo(() => {
    const b = parseFloat(bore) || 0;
    const s = parseFloat(stroke) || 0;
    const rl = parseFloat(rodLength) || 0;
    const r = s / 2;

    /* ── Static CR calculation ── */
    let staticCR = 0;
    let cylinderVol = 0;
    let gasketVol = 0;
    let deckVol = 0;
    let totalClearance = 0;

    const boreArea = Math.PI * (b / 2) * (b / 2);
    const vTotal = boreArea * s; // cu in

    if (crInputMode === "parts") {
      const cv = parseFloat(chamberVolume) || 0;
      const pv = parseFloat(pistonVolume) || 0;
      const gb = parseFloat(gasketBore) || 0;
      const gt = parseFloat(gasketThick) || 0;
      const dc = parseFloat(deckClearance) || 0;

      cylinderVol = vTotal * CID_TO_CC;
      gasketVol = Math.PI * (gb / 2) * (gb / 2) * gt * CID_TO_CC;
      deckVol = boreArea * dc * CID_TO_CC;
      totalClearance = cv + gasketVol + deckVol - pv; // cc (dome positive reduces clearance via negative pv input, dish negative)
      staticCR = totalClearance > 0 ? (cylinderVol + totalClearance) / totalClearance : 0;
    } else {
      staticCR = parseFloat(knownStaticCR) || 0;
    }

    /* ── Effective IVC ── */
    let effectiveIVC = 0;
    let ivc0050Computed: number | null = null;

    if (ivcMethod === "0050") {
      const ivcVal = parseFloat(ivc0050) || 0;
      const adj = lashType === "hydraulic" ? 15 : 5;
      effectiveIVC = ivcVal + adj;
    } else if (ivcMethod === "seat") {
      effectiveIVC = parseFloat(ivcSeat) || 0;
    } else {
      const dur = parseFloat(intakeDuration) || 0;
      const iclVal = parseFloat(icl) || 0;
      const camAdv = parseFloat(camAdvanceInput) || 0;
      const effectiveICL = iclVal - camAdv;
      ivc0050Computed = effectiveICL + dur / 2 - 180;
      const adj = lashType === "hydraulic" ? 15 : 5;
      effectiveIVC = ivc0050Computed + adj;
    }

    const finalIVC = effectiveIVC - camAdvanceSlider;
    const crankAngleFromTDC = 180 + finalIVC;
    const pistonPos = (s > 0 && rl > 0) ? pistonPositionBelowTDC(crankAngleFromTDC, r, rl) : 0;
    const effectiveStroke = pistonPos;

    const vEff = boreArea * effectiveStroke;
    const vC = staticCR > 1 ? vTotal / (staticCR - 1) : 0;

    /* ── Forward DCR ── */
    const dcr = vC > 0 ? (vEff + vC) / vC : 0;
    const crankingTheoretical = dcr > 0 ? 14.7 * Math.pow(dcr, 1.3) - 14.7 : 0;
    const crankingActual = crankingTheoretical * 0.85;
    const octane = lookupOctane(crankingActual, headType);

    /* ── Reverse solve: target DCR → required chamber volume ── */
    const tDCR = parseFloat(targetDCR) || 0;
    // DCR = (vEff + vC) / vC  →  vC = vEff / (DCR - 1)
    // staticCR = (vTotal + vC_cc) / vC_cc  where vC_cc = vC * CID_TO_CC
    // But vC (cu in) = vTotal / (staticCR - 1), and we want to find chamber vol
    // Working backwards: vC_needed_cuin = vEff / (targetDCR - 1)
    // staticCR_needed = (vTotal / vC_needed_cuin) + 1
    // vC_needed_cc = vC_needed_cuin * CID_TO_CC
    // chamberVol_needed = vC_needed_cc - gasketVol - deckVol + pistonVol
    let solvedChamberCC = 0;
    let solvedStaticCR = 0;
    if (tDCR > 1 && vEff > 0) {
      const vCNeeded = vEff / (tDCR - 1); // cu in
      solvedStaticCR = vTotal > 0 ? (vTotal / vCNeeded) + 1 : 0;
      if (crInputMode === "parts") {
        const pv = parseFloat(pistonVolume) || 0;
        solvedChamberCC = vCNeeded * CID_TO_CC - gasketVol - deckVol + pv;
      } else {
        solvedChamberCC = vCNeeded * CID_TO_CC;
      }
    }

    /* ── Reverse solve: target DCR → required IVC ── */
    // DCR = (vEff + vC) / vC  →  vEff = vC * (DCR - 1)
    // vEff = boreArea * effectiveStroke  →  effectiveStroke = vC * (DCR - 1) / boreArea
    // Then we need to reverse the slider-crank to find theta from effectiveStroke
    // Use binary search since the formula isn't easily invertible
    let solvedIVC = 0;
    if (tDCR > 1 && vC > 0 && boreArea > 0 && s > 0 && rl > 0) {
      const neededEffStroke = vC * (tDCR - 1) / boreArea;
      if (neededEffStroke <= s && neededEffStroke >= 0) {
        // Binary search: find ABDC angle where piston position = neededEffStroke
        // At 0° ABDC (BDC), piston is at stroke (max). As ABDC increases, piston rises.
        let lo = 0, hi = 120; // reasonable ABDC range
        for (let i = 0; i < 50; i++) {
          const mid = (lo + hi) / 2;
          const pos = pistonPositionBelowTDC(180 + mid, r, rl);
          if (pos > neededEffStroke) lo = mid;
          else hi = mid;
        }
        solvedIVC = (lo + hi) / 2;
      }
    }

    return {
      staticCR,
      cylinderVol, gasketVol, deckVol, totalClearance,
      effectiveIVC: finalIVC,
      crankAngleFromTDC,
      pistonPos, effectiveStroke,
      vEff, vTotal, vC,
      dcr, crankingTheoretical, crankingActual, octane,
      ivc0050Computed,
      physicalStroke: s,
      solvedChamberCC, solvedStaticCR, solvedIVC,
    };
  }, [bore, stroke, rodLength, crInputMode, chamberVolume, pistonVolume, gasketBore, gasketThick, deckClearance, knownStaticCR, ivcMethod, ivc0050, lashType, ivcSeat, intakeDuration, lsa, icl, camAdvanceInput, headType, camAdvanceSlider, targetDCR]);

  const oct = octaneColor(results.octane);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Compression Ratio Calculator — Static & Dynamic CR with Octane Recommendations"
        description="Calculate static and dynamic compression ratio from your parts or cam card. Three IVC input methods, cranking pressure prediction, octane recommendations by head type, reverse-solve mode, and interactive cam advance slider."
        canonical="/calculators/dynamic-compression-ratio-v2"
        keywords="compression ratio calculator, dynamic compression ratio, static compression ratio, DCR calculator, cranking pressure, intake valve closing, cam timing compression, octane recommendation, chamber volume calculator"
      />

      <h1 className="text-3xl font-bold mb-2">Compression Ratio Calculator</h1>
      <p className="text-muted-foreground mb-6">
        Static CR from your parts, dynamic CR from your cam, cranking pressure, and octane recommendations — all in one place.
      </p>

      {/* ─── MODE SELECTOR ─── */}
      <div className="mb-6">
        <div className="flex rounded-lg border overflow-hidden max-w-2xl">
          {([
            ["forward", "Calculate CR", Calculator],
            ["solve_chamber", "Solve for Chamber Volume", ArrowRightLeft],
            ["solve_ivc", "Solve for Cam / IVC", ArrowRightLeft],
          ] as [CalcMode, string, typeof Calculator][]).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setCalcMode(key)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                calcMode === key
                  ? "bg-[#E85D04] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {calcMode === "forward" && "Enter your parts and cam specs → get static CR, dynamic CR, cranking pressure, and octane recommendation."}
          {calcMode === "solve_chamber" && "Set a target DCR → find what chamber volume (and static CR) you need with your current cam."}
          {calcMode === "solve_ivc" && "Set a target DCR → find what IVC / cam timing you need with your current compression ratio."}
        </p>
      </div>

      {/* ─── BOOST WARNING ─── */}
      {isBoosted && (
        <div className="mb-6 p-4 rounded-lg border-2 border-red-500 bg-red-50 flex gap-3 items-start">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-lg mb-1">Not Valid for Boosted Engines</p>
            <p className="text-red-700 text-sm">
              DCR is not a reliable predictor for boosted engines. DCR math assumes atmospheric intake pressure.
              Under boost, cranking pressure and detonation risk are dominated by manifold pressure, intake air
              temperature, and fuel octane — not DCR. For boosted engines, use knock-limited compression tables
              from your fuel octane rating and expected boost level. This tool is for naturally aspirated engines only.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ═══════════════════════════════════════════════
           LEFT: INPUTS
           ═══════════════════════════════════════════════ */}
        <div className="space-y-6">

          {/* ── Reverse-solve target (shown when in solve mode) ── */}
          {calcMode !== "forward" && (
            <Card className="border-[#E85D04] bg-[#E85D04]/5">
              <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-[#E85D04]" /> Target DCR</CardTitle></CardHeader>
              <CardContent>
                <Field label="Target Dynamic Compression Ratio" value={targetDCR} onChange={setTargetDCR} step="0.1" />
                <p className="text-xs text-muted-foreground mt-2">
                  Pump gas sweet spot: 7.5–8.5:1 DCR. Enter your target and we'll solve for the part you need.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Engine Geometry ── */}
          <Card>
            <CardHeader><CardTitle>Engine Dimensions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Bore (inches)" value={bore} onChange={setBore} step="0.001" hint="Measured or from piston box. Overbores: add to stock (e.g. 4.000 + 0.030 = 4.030)." />
              <Field label="Stroke (inches)" value={stroke} onChange={setStroke} step="0.001" hint="Stock or from crank specs. Common SBC: 3.480 (350), 3.750 (383)." />
              <Field label="Connecting Rod Length (inches)" value={rodLength} onChange={setRodLength} step="0.001" hint="Stock SBC: 5.700, LS: 6.098, SBF 302: 5.090, BBC: 6.135. On aftermarket rod box." />
            </CardContent>
          </Card>

          {/* ── Static CR Section ── */}
          <Card>
            <CardHeader>
              <CardTitle>Static Compression Ratio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle: calculate from parts vs enter known CR */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setCrInputMode("parts")}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    crInputMode === "parts" ? "bg-[#E85D04] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Calculate from Parts
                </button>
                <button
                  onClick={() => setCrInputMode("known")}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    crInputMode === "known" ? "bg-[#E85D04] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  I Know My Static CR
                </button>
              </div>

              {crInputMode === "parts" ? (
                <div className="space-y-3">
                  <Field label="Head Chamber Volume (cc)" value={chamberVolume} onChange={setChamberVolume} step="0.1"
                    hint="From head manufacturer specs or casting number lookup. Measure by cc'ing for accuracy." />
                  <Field label="Piston Dish/Dome Volume (cc)" value={pistonVolume} onChange={setPistonVolume} step="0.1"
                    hint="Dome = positive, dish = negative. On aftermarket piston spec sheet. Flat-top = 0. Stock pistons: cc the piston or check the service manual." />
                  <Field label="Gasket Bore (inches)" value={gasketBore} onChange={setGasketBore} step="0.001"
                    hint="On gasket packaging. Usually 0.015–0.070 larger than bore." />
                  <Field label="Compressed Gasket Thickness (inches)" value={gasketThick} onChange={setGasketThick} step="0.001"
                    hint="COMPRESSED thickness, not uncompressed. On gasket packaging — look for 'compressed' spec." />
                  <Field label="Deck Clearance (inches)" value={deckClearance} onChange={setDeckClearance} step="0.001"
                    hint="Piston-to-deck gap. Positive = piston below deck (typical). Zero-deck = 0.000. Requires dial indicator to measure — if unknown, 0.000 is a safe starting point." />

                  {/* Static CR result inline */}
                  {results.staticCR > 0 && (
                    <div className="p-3 rounded-lg bg-gray-50 border">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium text-muted-foreground">Calculated Static CR</span>
                        <span className="text-2xl font-bold">{results.staticCR.toFixed(2)}:1</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Cylinder: {results.cylinderVol.toFixed(1)}cc</span>
                        <span>Gasket: {results.gasketVol.toFixed(1)}cc</span>
                        <span>Deck: {results.deckVol.toFixed(1)}cc</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Static Compression Ratio" value={knownStaticCR} onChange={setKnownStaticCR} step="0.1"
                    hint="If you already know your static CR from a previous calculation or build sheet, enter it here." />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Cam Timing ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Cam Timing — IVC Input
                <Tooltip text="IVC (Intake Valve Closing) is the single most important cam spec for DCR. It's on your cam card — look for 'IVC' under the valve events section." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calcMode === "solve_ivc" ? (
                <div className="p-3 rounded bg-[#E85D04]/10 border border-[#E85D04]/30 text-sm">
                  <p className="font-medium text-[#E85D04]">Solve mode active</p>
                  <p className="text-muted-foreground mt-1">
                    The cam timing section is not needed — we're calculating what IVC you need to hit your target DCR.
                    The result is shown in the output panel.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex rounded-lg border overflow-hidden">
                    {([
                      ["0050", "IVC at 0.050\""],
                      ["seat", "IVC seat-to-seat"],
                      ["duration", "Duration + LSA + ICL"],
                    ] as [IvcMethod, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setIvcMethod(key)}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          ivcMethod === key
                            ? "bg-[#E85D04] text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <MethodHint method={ivcMethod} />

                  {ivcMethod === "0050" && (
                    <div className="space-y-3">
                      <Field label="IVC degrees ABDC (at 0.050&quot; tappet lift)" value={ivc0050} onChange={setIvc0050} step="1"
                        hint="On your cam card under 'Valve Events' or 'Timing at 0.050'. Look for 'IVC' — it's in degrees ABDC." />
                      <LashSelector lashType={lashType} setLashType={setLashType} />
                    </div>
                  )}

                  {ivcMethod === "seat" && (
                    <Field label="IVC degrees ABDC at seat contact" value={ivcSeat} onChange={setIvcSeat} step="1"
                      hint="Actual valve seating point. Rarely on cam cards — usually requires degree wheel measurement or manufacturer data. If you only have 0.050&quot; data, use that tab instead." />
                  )}

                  {ivcMethod === "duration" && (
                    <div className="space-y-3">
                      <Field label="Intake Duration at 0.050&quot; (degrees)" value={intakeDuration} onChange={setIntakeDuration} step="1"
                        hint="Always on the cam card. Common range: 190–250°. This is NOT advertised duration." />
                      <Field label="Lobe Separation Angle (LSA)" value={lsa} onChange={setLsa} step="0.5"
                        hint="On cam card. Typical street: 110–114°. Race: 106–110°." />
                      <Field label="Intake Centerline (ICL)" value={icl} onChange={setIcl} step="1"
                        hint="On cam card as 'Intake Centerline' or 'Intake Lobe Center'. If not listed: ICL = LSA minus advance (e.g. LSA 110 with 4° advance = ICL 106)." />
                      <Field label="Cam Advance/Retard (degrees, positive = advance)" value={camAdvanceInput} onChange={setCamAdvanceInput} step="1"
                        hint="If cam card says 'ground with X° advance', enter that number. If installed straight-up on LSA, enter 0." />
                      <LashSelector lashType={lashType} setLashType={setLashType} />
                      {results.ivc0050Computed !== null && (
                        <div className="p-3 rounded bg-gray-50 border text-sm">
                          <span className="text-muted-foreground">Computed IVC at 0.050&quot;:</span>{" "}
                          <span className="font-bold">{results.ivc0050Computed.toFixed(1)}° ABDC</span>
                          <p className="text-xs text-muted-foreground mt-1">Verify this matches the IVC on your cam card to confirm your inputs are correct.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Head Type ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Head Type
                <Tooltip text="Aluminum heads dissipate heat faster than iron, reducing detonation risk. Fast-burn chambers (heart-shaped, D-shaped) burn more completely, also reducing knock tendency. This shifts your octane requirement." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  ["iron_trad", "Iron — Traditional Chamber", "Open/bathtub: stock SBC, BBF, Mopar wedge"],
                  ["iron_fast", "Iron — Fast-Burn", "Vortec, SBC Bowtie, late Mopar Magnum"],
                  ["alum_trad", "Aluminum — Traditional", "Older aftermarket, Edelbrock Performer"],
                  ["alum_fast", "Aluminum — Modern/Fast-Burn", "LS, Gen III Hemi, Coyote, BBC rect port, AFR, TFS"],
                ] as [HeadType, string, string][]).map(([key, label, examples]) => (
                  <button
                    key={key}
                    onClick={() => setHeadType(key)}
                    className={`px-3 py-2.5 rounded-lg text-left transition-colors border ${
                      headType === key
                        ? "bg-[#E85D04] text-white border-[#E85D04]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#E85D04]/50"
                    }`}
                  >
                    <span className="text-sm font-medium block">{label}</span>
                    <span className={`text-xs block mt-0.5 ${headType === key ? "text-white/70" : "text-gray-400"}`}>{examples}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Boost ── */}
          <Card>
            <CardHeader><CardTitle>Forced Induction</CardTitle></CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBoosted}
                  onChange={(e) => setIsBoosted(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#E85D04] focus:ring-[#E85D04]"
                />
                <span className="text-sm font-medium">This engine is boosted (turbo/supercharged)</span>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════
           RIGHT: OUTPUTS
           ═══════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* ── Static CR result (when calculating from parts) ── */}
          {crInputMode === "parts" && (
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Static Compression Ratio</CardTitle></CardHeader>
              <CardContent>
                <p className="text-5xl font-bold text-white">{results.staticCR.toFixed(2)}<span className="text-2xl">:1</span></p>
                <p className="text-xs text-gray-400 mt-2">Geometric ratio from bore, stroke, chamber, gasket, piston, and deck clearance.</p>
              </CardContent>
            </Card>
          )}

          {/* ── DCR result ── */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5" /> Dynamic Compression Ratio</CardTitle></CardHeader>
            <CardContent>
              <p className="text-6xl font-bold text-[#E85D04]">{results.dcr.toFixed(2)}<span className="text-3xl">:1</span></p>
              {results.dcr > 10 && (
                <div className="mt-3 p-2 rounded bg-red-900/30 border border-red-500/50 text-red-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> Very high DCR — race gas or methanol territory
                </div>
              )}
              {results.dcr > 9 && results.dcr <= 10 && (
                <div className="mt-3 p-2 rounded bg-yellow-900/30 border border-yellow-500/50 text-yellow-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> High DCR — verify head chamber design and fuel octane match
                </div>
              )}
              {results.dcr > 0 && results.dcr < 7 && (
                <div className="mt-3 p-2 rounded bg-blue-900/30 border border-blue-500/50 text-blue-300 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" /> Low DCR — engine will tolerate pump gas but low-RPM performance may suffer
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── REVERSE SOLVE RESULTS ── */}
          {calcMode === "solve_chamber" && results.solvedChamberCC > 0 && (
            <Card className="border-[#E85D04] bg-[#E85D04]/5">
              <CardHeader><CardTitle className="flex items-center gap-2 text-[#E85D04]"><ArrowRightLeft className="w-5 h-5" /> Required Chamber Volume</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-4xl font-bold">{results.solvedChamberCC.toFixed(1)} <span className="text-xl font-normal text-muted-foreground">cc</span></p>
                <p className="text-sm text-muted-foreground">
                  To hit {parseFloat(targetDCR).toFixed(1)}:1 DCR with your current cam timing, you need{" "}
                  <strong>{results.solvedChamberCC.toFixed(1)}cc</strong> chamber volume
                  (static CR of <strong>{results.solvedStaticCR.toFixed(2)}:1</strong>).
                </p>
                <p className="text-xs text-muted-foreground">
                  This accounts for your gasket, deck clearance, and piston volume. Shop for heads with this chamber size, or have your machinist cc the heads to verify.
                </p>
              </CardContent>
            </Card>
          )}

          {calcMode === "solve_ivc" && results.solvedIVC > 0 && (
            <Card className="border-[#E85D04] bg-[#E85D04]/5">
              <CardHeader><CardTitle className="flex items-center gap-2 text-[#E85D04]"><ArrowRightLeft className="w-5 h-5" /> Required IVC Timing</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-4xl font-bold">{results.solvedIVC.toFixed(1)}° <span className="text-xl font-normal text-muted-foreground">ABDC (seat-to-seat)</span></p>
                <p className="text-sm font-medium">{Math.max(0, results.solvedIVC - 15).toFixed(0)}° ABDC at 0.050" (hydraulic)</p>
                <p className="text-sm font-medium">{Math.max(0, results.solvedIVC - 5).toFixed(0)}° ABDC at 0.050" (solid)</p>
                <p className="text-sm text-muted-foreground mt-2">
                  To hit {parseFloat(targetDCR).toFixed(1)}:1 DCR with your current {results.staticCR.toFixed(1)}:1 static CR,
                  your cam needs to close the intake valve at approximately <strong>{results.solvedIVC.toFixed(0)}° ABDC</strong> (seat-to-seat).
                </p>
                <p className="text-xs text-muted-foreground">
                  When shopping for cams, look for an IVC at 0.050" of roughly {Math.max(0, results.solvedIVC - 15).toFixed(0)}° ABDC (hydraulic) on the cam card.
                  Longer duration cams have later IVC — look at cam specs where intake duration at 0.050" is in the {
                    results.solvedIVC - 15 < 50 ? "190–210°" : results.solvedIVC - 15 < 65 ? "210–230°" : "230–250°"
                  } range.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Cranking Pressure ── */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Cranking Pressure</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Theoretical</span>
                <span className="text-2xl font-bold">{Math.round(results.crankingTheoretical)} PSI</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Actual estimate (~85%)</span>
                <span className="text-2xl font-bold">{Math.round(results.crankingActual)} PSI</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">A compression test should read approximately the actual estimate value.</p>
              {results.crankingActual > 220 && (
                <div className="p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> Requires race fuel or methanol/E85 for detonation control
                </div>
              )}
              {results.crankingActual > 0 && results.crankingActual < 120 && (
                <div className="p-2 rounded bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" /> Cranking pressure is low for typical gasoline engines — check inputs if unexpected
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Octane Recommendation ── */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Fuel className="w-5 h-5" /> Octane Recommendation</CardTitle></CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border ${oct.bg} ${oct.border}`}>
                <p className={`text-3xl font-bold ${oct.text}`}>
                  {results.octane >= 100 ? `${results.octane}+` : results.octane} <span className="text-lg font-normal">octane (R+M/2)</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {results.octane <= 87 && "Regular pump gas (87) is sufficient."}
                {results.octane > 87 && results.octane <= 91 && "Mid-grade or premium pump gas recommended. Available at most stations."}
                {results.octane > 91 && results.octane <= 93 && "Premium 93 octane required. Not available in all areas — verify local availability."}
                {results.octane > 93 && "Race fuel or alternative fuel (E85, methanol) required. Not available at standard fuel stations."}
              </p>
            </CardContent>
          </Card>

          {/* ── Cam Advance Slider ── */}
          {calcMode === "forward" && (
            <Card className="border-[#E85D04]/30">
              <CardHeader><CardTitle>Try Different Cam Advance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Retard</span>
                  <span className="text-lg font-bold text-[#E85D04]">
                    {camAdvanceSlider > 0 ? "+" : ""}{camAdvanceSlider}°
                  </span>
                  <span className="text-sm text-muted-foreground">Advance</span>
                </div>
                <Slider
                  min={-8}
                  max={8}
                  step={1}
                  value={[camAdvanceSlider]}
                  onValueChange={([v]) => setCamAdvanceSlider(v)}
                />
                <p className="text-xs text-muted-foreground">
                  Advancing the cam raises DCR (earlier IVC traps more charge). Retarding lowers DCR.
                  Some builders use 4° advance/retard intentionally to tune DCR into their target octane range.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Intermediate Values ── */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Intermediate Values</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  <IntRow label="Static CR" value={`${results.staticCR.toFixed(2)}:1`} />
                  <IntRow label="Effective IVC used" value={`${results.effectiveIVC.toFixed(1)}° ABDC`} />
                  <IntRow label="Crank angle at IVC (from TDC)" value={`${results.crankAngleFromTDC.toFixed(1)}°`} />
                  <IntRow label="Piston position at IVC" value={`${results.pistonPos.toFixed(3)}" below TDC`} />
                  <IntRow label="Effective stroke" value={`${results.effectiveStroke.toFixed(3)}" (vs ${results.physicalStroke.toFixed(3)}" physical)`} />
                  <IntRow label="Effective displacement / cyl" value={`${results.vEff.toFixed(2)} cu in`} />
                  <IntRow label="Total displacement / cyl" value={`${results.vTotal.toFixed(2)} cu in`} />
                  <IntRow label="Clearance volume" value={`${(results.vC * CID_TO_CC).toFixed(1)} cc (${results.vC.toFixed(3)} cu in)`} />
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
         EDUCATIONAL SECTION
         ═══════════════════════════════════════════════ */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Static & Dynamic Compression Ratio</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Static compression ratio is a pure geometric calculation — the total cylinder volume at BDC divided by the clearance volume at TDC. It depends only on bore, stroke, chamber volume, gasket thickness, piston dome/dish, and deck clearance. Static CR tells you nothing about the camshaft. It's the number stamped on the spec sheet, and it's what most people mean when they say "compression ratio." But it's only half the story.
          </p>
          <p>
            Dynamic compression ratio (DCR) accounts for the fact that the intake valve stays open past bottom dead center. As the piston begins its compression stroke, the valve is still off its seat — some of the intake charge flows back out through the open valve into the manifold. Compression doesn't truly begin until the valve seats. The bigger the cam (longer duration), the later the valve closes, and the more charge escapes. A cam with IVC at 80° ABDC loses significantly more charge than a mild cam closing at 55° ABDC. The effective stroke — the piston travel that actually compresses the mixture — can be 20–30% shorter than the physical stroke on a big cam.
          </p>
          <p>
            This is why cam selection and compression ratio are inseparable decisions. A mild cam on a 10:1 static CR engine might produce a DCR around 8.5:1, requiring 93 octane. The same 10:1 engine with an aggressive cam drops to 7.5:1 DCR and runs safely on 87. Experienced builders exploit this intentionally — they pick aggressive cam profiles to shift DCR into the pump-gas-friendly range (7.5–8.5:1) while keeping static CR high for peak power. Cam advance and retard fine-tune it further: advancing the cam 4° raises DCR by roughly 0.2–0.3 points.
          </p>
          <p>
            Everything above applies to naturally aspirated engines only. Under boost, DCR becomes unreliable because intake manifold pressure is no longer atmospheric. Even 10 PSI of boost can effectively double the cylinder pressure the engine sees at cranking speed. For boosted engines, detonation risk is dominated by manifold pressure, intake air temperature, and intercooler efficiency — not cam timing. Use effective-compression-vs-boost reference tables matched to your fuel octane and expected boost level.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function Field({ label, value, onChange, step, hint }: {
  label: string; value: string; onChange: (v: string) => void; step?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {hint && <Tooltip text={hint} />}
      </Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="More info"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

function LashSelector({ lashType, setLashType }: { lashType: LashType; setLashType: (v: LashType) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        Lash Type
        <Tooltip text="Hydraulic lifters have more ramp before full lift, so the valve effectively closes ~15° later than the 0.050&quot; spec. Solid lifters have a shorter ramp (~5°). This adjustment converts your cam card's 0.050&quot; IVC to approximate seat-closing." />
      </Label>
      <div className="flex gap-2">
        <button
          onClick={() => setLashType("hydraulic")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            lashType === "hydraulic" ? "bg-[#E85D04] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Hydraulic
        </button>
        <button
          onClick={() => setLashType("solid")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            lashType === "solid" ? "bg-[#E85D04] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Solid
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {lashType === "hydraulic" ? "Adds +15° to 0.050\" IVC to estimate seat closing." : "Adds +5° to 0.050\" IVC to estimate seat closing."}
      </p>
    </div>
  );
}

function MethodHint({ method }: { method: IvcMethod }) {
  if (method === "0050") return (
    <div className="p-2.5 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
      <strong>Best for most builders.</strong> Your cam card lists IVC at 0.050" tappet lift under "Valve Events." We'll add the lash ramp correction automatically.
    </div>
  );
  if (method === "seat") return (
    <div className="p-2.5 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
      <strong>Use if you've degreed the cam</strong> or have seat-to-seat timing from the manufacturer. This is the actual closing point — no correction applied.
    </div>
  );
  return (
    <div className="p-2.5 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
      <strong>Use if you don't have IVC directly</strong> but know intake duration, LSA, and intake centerline from your cam card. We'll calculate IVC for you.
    </div>
  );
}

function IntRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 text-muted-foreground">{label}</td>
      <td className="py-1.5 text-right font-mono font-medium">{value}</td>
    </tr>
  );
}
