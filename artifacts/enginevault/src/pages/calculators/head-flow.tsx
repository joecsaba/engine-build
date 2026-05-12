import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Info } from "lucide-react";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";

// ── Constants ───────────────────────────────────────────────────────────────────

// SuperFlow theoretical max: 146 CFM per sq.in. of valve area at 28" H2O
const THEORETICAL_CFM_PER_SQIN = 146;

// Lift increments for full flow curve (inches)
const LIFT_INCREMENTS = [
  0.100, 0.150, 0.200, 0.250, 0.300, 0.350, 0.400,
  0.450, 0.500, 0.550, 0.600, 0.650, 0.700,
];

// ── Head database ───────────────────────────────────────────────────────────────
// All flow numbers at 28" H2O test pressure, peak intake CFM from manufacturer
// data sheets and published flow bench tests.

interface HeadDef {
  name: string;
  family: string;
  intakeCfm: number;
  exhaustCfm: number;
  valveDia: number;     // intake valve diameter inches
  runnerVol: number;    // cc (0 = unknown)
  notes: string;
}

const HEAD_DATABASE: HeadDef[] = [
  // SBC
  { name: "SBC Vortec 062 (stock)",        family: "SBC",  intakeCfm: 218, exhaustCfm: 160, valveDia: 1.940, runnerVol: 170, notes: "Stock casting, great base for porting" },
  { name: "SBC AFR 195 Eliminator",        family: "SBC",  intakeCfm: 270, exhaustCfm: 200, valveDia: 2.050, runnerVol: 195, notes: "Street CNC, 262-280 depending on version" },
  { name: "SBC AFR 220 Eliminator",        family: "SBC",  intakeCfm: 300, exhaustCfm: 222, valveDia: 2.100, runnerVol: 220, notes: "Race-street, excellent mid-lift" },
  { name: "SBC Dart Pro 1 227",            family: "SBC",  intakeCfm: 315, exhaustCfm: 230, valveDia: 2.080, runnerVol: 227, notes: "CNC competition head" },
  // LS
  { name: "LS Cathedral Port 241 (stock)", family: "LS",   intakeCfm: 235, exhaustCfm: 175, valveDia: 2.000, runnerVol: 200, notes: "LS1/LS6 stock casting, 228-244 range" },
  { name: "LS Cathedral Port (ported)",    family: "LS",   intakeCfm: 275, exhaustCfm: 205, valveDia: 2.020, runnerVol: 210, notes: "CNC ported cathedral, varies by shop" },
  { name: "LS Rectangular Port L92/LS3",   family: "LS",   intakeCfm: 315, exhaustCfm: 235, valveDia: 2.165, runnerVol: 260, notes: "Stock LS3/L92, 310-350 range at 0.600\"" },
  { name: "LS Rectangular Port (ported)",  family: "LS",   intakeCfm: 370, exhaustCfm: 275, valveDia: 2.165, runnerVol: 270, notes: "CNC ported rect port LS3/L92" },
  // BBC
  { name: "BBC Oval Port 781 (stock)",     family: "BBC",  intakeCfm: 260, exhaustCfm: 190, valveDia: 2.190, runnerVol: 270, notes: "Stock 781 casting, 255-265 range" },
  { name: "BBC Rectangle Port 049 (stock)", family: "BBC", intakeCfm: 300, exhaustCfm: 220, valveDia: 2.190, runnerVol: 320, notes: "Stock open-chamber rect port" },
  { name: "BBC AFR 305 Magnum",            family: "BBC",  intakeCfm: 360, exhaustCfm: 265, valveDia: 2.250, runnerVol: 305, notes: "CNC competition oval port" },
  // Ford SBF
  { name: "Ford GT40 / GT40P (stock)",     family: "SBF",  intakeCfm: 190, exhaustCfm: 140, valveDia: 1.940, runnerVol: 165, notes: "Explorer/Mustang GT40, 190-195 range" },
  { name: "Ford TFS Twisted Wedge 170",    family: "SBF",  intakeCfm: 250, exhaustCfm: 185, valveDia: 2.020, runnerVol: 170, notes: "Peaks ~251 at 0.500-0.600\" lift" },
  { name: "Ford TFS High Port 240",        family: "SBF",  intakeCfm: 290, exhaustCfm: 215, valveDia: 2.080, runnerVol: 240, notes: "Race head, big runner" },
];

// ── Flow Coefficient colors ─────────────────────────────────────────────────────

function getFlowCoeffLabel(pct: number): { label: string; color: string } {
  if (pct < 60) return { label: "Room to improve", color: "text-yellow-600" };
  if (pct < 75) return { label: "Good street head", color: "text-green-600" };
  if (pct < 85) return { label: "Well-ported", color: "text-blue-600" };
  return { label: "Race-level", color: "text-purple-600" };
}

// ── Calculation engine ──────────────────────────────────────────────────────────

interface QuickResults {
  correctedIntakeCfm: number;
  correctedExhaustCfm: number;
  hpLow: number;
  hpHigh: number;
  hpPerLiter: number;
  flowCoefficient: number;    // percentage 0-100
  flowCoeffLabel: string;
  flowCoeffColor: string;
  exhaustIntakeRatio: number; // percentage
  cfmPerCi: number;           // CFM per cubic inch per cylinder
  portVelocity: number | null; // ft/sec, null if no area provided
  warnings: string[];
}

function calculateQuick(
  peakIntakeCfm: number,
  peakExhaustCfm: number,
  testPressure: number,
  displacementCi: number,
  cylinders: number,
  intakeValveDia: number,
  peakLift: number,
  targetRpm: number,
  portArea: number | null,
): QuickResults {
  const warnings: string[] = [];

  // Step 1: Correct flow to 28" H2O standard
  const correctedIntakeCfm = peakIntakeCfm * Math.sqrt(28 / testPressure);
  const correctedExhaustCfm = peakExhaustCfm * Math.sqrt(28 / testPressure);

  // Step 2: HP potential using SuperFlow's 0.257 formula
  // HP = Peak CFM × 0.257 × Number of Cylinders
  // This gives a mid-range estimate. We show ±10% for the range.
  const hpMid = correctedIntakeCfm * 0.257 * cylinders;
  const hpLow = hpMid * 0.90;  // typical VE, average cam
  const hpHigh = hpMid * 1.10;  // well-matched cam/intake

  // HP per liter
  const displacementL = displacementCi / 61.024;
  const hpPerLiter = hpMid / displacementL;

  // Step 3: Flow coefficient
  const valveArea = Math.PI * Math.pow(intakeValveDia / 2, 2);
  const theoreticalMax = valveArea * THEORETICAL_CFM_PER_SQIN;
  const flowCoefficient = (correctedIntakeCfm / theoreticalMax) * 100;
  const { label: flowCoeffLabel, color: flowCoeffColor } = getFlowCoeffLabel(flowCoefficient);

  // Step 4: Exhaust/intake ratio
  const exhaustIntakeRatio = peakExhaustCfm > 0 ? (correctedExhaustCfm / correctedIntakeCfm) * 100 : 0;

  // Step 5: CFM per cubic inch (per cylinder)
  const ciPerCyl = displacementCi / cylinders;
  const cfmPerCi = correctedIntakeCfm / ciPerCyl;

  // Step 6: Port velocity (if area provided)
  let portVelocity: number | null = null;
  if (portArea && portArea > 0) {
    portVelocity = (correctedIntakeCfm * 2.4) / portArea;
  }

  // Warnings
  if (correctedIntakeCfm > 350 && displacementCi < 350) {
    warnings.push("These heads may be too big for your displacement — port velocity will be low, hurting low-RPM throttle response and torque.");
  }
  if (exhaustIntakeRatio > 0 && exhaustIntakeRatio < 65) {
    warnings.push("Exhaust flow is low relative to intake (" + exhaustIntakeRatio.toFixed(0) + "%). Consider exhaust port work, larger exhaust valves, or better headers.");
  }
  if (testPressure <= 10 && peakIntakeCfm > 180) {
    warnings.push("Flow numbers at 10\" H₂O are typically much lower than at 28\". Your intake CFM of " + peakIntakeCfm + " seems high for 10\" — double-check your test pressure.");
  }
  if (peakLift > 0.600) {
    warnings.push("Valve lift above 0.600\" requires a roller cam, high-rate valve springs, and hardened retainers. Make sure your valvetrain supports this lift.");
  }
  if (portVelocity !== null && portVelocity < 160) {
    warnings.push("Port velocity is only " + portVelocity.toFixed(0) + " ft/sec — the ports are oversized for this flow level. Expect lazy throttle response and weak low-RPM torque.");
  }

  return {
    correctedIntakeCfm,
    correctedExhaustCfm,
    hpLow,
    hpHigh,
    hpPerLiter,
    flowCoefficient,
    flowCoeffLabel,
    flowCoeffColor,
    exhaustIntakeRatio,
    cfmPerCi,
    portVelocity,
    warnings,
  };
}

// ── Full curve analysis ─────────────────────────────────────────────────────────

interface CurveResults extends QuickResults {
  avgIntakeCfm: number;
  avgExhaustCfm: number;
  peakToAvgRatio: number;
  curveHpLow: number;
  curveHpHigh: number;
  intakeData: { lift: number; cfm: number }[];
  exhaustData: { lift: number; cfm: number }[];
  maxLift: number;
}

function calculateCurve(
  intakeFlows: Record<number, number>,
  exhaustFlows: Record<number, number>,
  testPressure: number,
  displacementCi: number,
  cylinders: number,
  intakeValveDia: number,
  targetRpm: number,
  portArea: number | null,
): CurveResults | null {
  // Collect non-zero entries
  const intakeEntries: { lift: number; cfm: number }[] = [];
  const exhaustEntries: { lift: number; cfm: number }[] = [];

  for (const lift of LIFT_INCREMENTS) {
    const iCfm = intakeFlows[lift] || 0;
    const eCfm = exhaustFlows[lift] || 0;
    if (iCfm > 0) intakeEntries.push({ lift, cfm: iCfm * Math.sqrt(28 / testPressure) });
    if (eCfm > 0) exhaustEntries.push({ lift, cfm: eCfm * Math.sqrt(28 / testPressure) });
  }

  if (intakeEntries.length < 3) return null;

  const maxLift = intakeEntries[intakeEntries.length - 1].lift;
  const peakIntake = Math.max(...intakeEntries.map((e) => e.cfm));
  const peakExhaust = exhaustEntries.length > 0 ? Math.max(...exhaustEntries.map((e) => e.cfm)) : 0;

  // Average flow across curve
  const avgIntake = intakeEntries.reduce((s, e) => s + e.cfm, 0) / intakeEntries.length;
  const avgExhaust = exhaustEntries.length > 0 ? exhaustEntries.reduce((s, e) => s + e.cfm, 0) / exhaustEntries.length : 0;

  const peakToAvgRatio = peakIntake / avgIntake;

  // HP from average flow (more accurate than peak)
  const hpMidCurve = avgIntake * 0.257 * cylinders;
  const curveHpLow = hpMidCurve * 0.92;
  const curveHpHigh = hpMidCurve * 1.12;

  // Run quick calc for the other metrics using peak values
  const quick = calculateQuick(
    peakIntake, peakExhaust, 28, // already corrected
    displacementCi, cylinders, intakeValveDia, maxLift, targetRpm, portArea,
  );

  return {
    ...quick,
    avgIntakeCfm: avgIntake,
    avgExhaustCfm: avgExhaust,
    peakToAvgRatio,
    curveHpLow,
    curveHpHigh,
    intakeData: intakeEntries,
    exhaustData: exhaustEntries,
    maxLift,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(n: number, d: number) { return n.toFixed(d); }

function getHpPerLiterLabel(hpl: number): string {
  if (hpl < 60) return "mild street";
  if (hpl < 80) return "street performance";
  if (hpl < 120) return "hot street / street-strip";
  if (hpl < 180) return "race";
  return "pro-level";
}

function getPortVelocityLabel(v: number): string {
  if (v < 180) return "Low — ports oversized";
  if (v < 220) return "Street — good idle/response";
  if (v < 260) return "Street/strip — balanced";
  if (v < 320) return "Race — aggressive";
  return "Very high — verify port size";
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function HeadFlowCalculator() {
  // Mode
  const [mode, setMode] = useState<"quick" | "full">("quick");

  // Quick Estimate inputs (build-context integrated)
  const [peakIntakeStr, setPeakIntake] = useBuildField("heads.peakIntakeCfm", "250");
  const [peakExhaustStr, setPeakExhaust] = useBuildField("heads.peakExhaustCfm", "180");
  const [testPressureStr, setTestPressure] = useState("28");
  const [displacementStr, setDisplacement] = useBuildField("computed.displacement", "350");
  const [cylindersStr, setCylinders] = useBuildField("shortBlock.cylinders", "8");
  const [valveDiaStr, setValveDia] = useBuildField("heads.intakeValveDia", "2.020");
  const [peakLiftStr, setPeakLift] = useBuildField("heads.peakValveLift", "0.500");
  const [targetRpmStr, setTargetRpm] = useBuildField("shortBlock.targetRpm", "6000");

  // Optional advanced
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [portAreaStr, setPortArea] = useState("");

  // Full flow curve data
  const [intakeFlows, setIntakeFlows] = useState<Record<number, string>>({});
  const [exhaustFlows, setExhaustFlows] = useState<Record<number, string>>({});

  // Collapsible sections
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [formulasOpen, setFormulasOpen] = useState(false);

  // Build context for writing back
  const { activeBuild, setField } = useBuildContext();

  // Parse
  const peakIntake = parseFloat(peakIntakeStr) || 0;
  const peakExhaust = parseFloat(peakExhaustStr) || 0;
  const testPressure = parseFloat(testPressureStr) || 28;
  const displacement = parseFloat(displacementStr) || 0;
  const cylinders = parseInt(cylindersStr) || 8;
  const valveDia = parseFloat(valveDiaStr) || 2.02;
  const peakLift = parseFloat(peakLiftStr) || 0.5;
  const targetRpm = parseInt(targetRpmStr) || 6000;
  const portArea = portAreaStr ? parseFloat(portAreaStr) : null;

  // Quick calculation
  const quickValid = peakIntake > 0 && displacement > 0;
  const quickResults = useMemo(() => {
    if (!quickValid) return null;
    return calculateQuick(peakIntake, peakExhaust, testPressure, displacement, cylinders, valveDia, peakLift, targetRpm, portArea);
  }, [peakIntake, peakExhaust, testPressure, displacement, cylinders, valveDia, peakLift, targetRpm, portArea, quickValid]);

  // Full curve calculation
  const curveResults = useMemo(() => {
    if (mode !== "full") return null;
    const iFlows: Record<number, number> = {};
    const eFlows: Record<number, number> = {};
    for (const lift of LIFT_INCREMENTS) {
      iFlows[lift] = parseFloat(intakeFlows[lift] || "0") || 0;
      eFlows[lift] = parseFloat(exhaustFlows[lift] || "0") || 0;
    }
    return calculateCurve(iFlows, eFlows, testPressure, displacement, cylinders, valveDia, targetRpm, portArea);
  }, [mode, intakeFlows, exhaustFlows, testPressure, displacement, cylinders, valveDia, targetRpm, portArea]);

  // Active results (curve takes priority when in full mode and valid)
  const results = mode === "full" && curveResults ? curveResults : quickResults;

  // Write back to build context
  if (activeBuild && results) {
    const hpEst = mode === "full" && curveResults
      ? Math.round((curveResults.curveHpLow + curveResults.curveHpHigh) / 2)
      : Math.round((results.hpLow + results.hpHigh) / 2);
    setField("computed.headFlowCfm", results.correctedIntakeCfm.toFixed(0));
    setField("computed.headFlowHpEstimate", hpEst.toString());
  }

  // Head comparison — compute HP potential for each head at the user's displacement
  const headComparison = useMemo(() => {
    if (displacement <= 0 || cylinders <= 0) return [];
    return HEAD_DATABASE.map((h) => {
      const hpMid = h.intakeCfm * 0.257 * cylinders;
      const ratio = h.exhaustCfm / h.intakeCfm * 100;
      return { ...h, hpEstimate: hpMid, exhaustRatio: ratio };
    });
  }, [displacement, cylinders]);

  // Paste handler for flow curve
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const lines = text.trim().split(/\n/);
    const newIntake: Record<number, string> = { ...intakeFlows };
    const newExhaust: Record<number, string> = { ...exhaustFlows };

    lines.forEach((line, idx) => {
      if (idx >= LIFT_INCREMENTS.length) return;
      const cols = line.split(/[\t,]+/).map((s) => s.trim());
      const lift = LIFT_INCREMENTS[idx];
      if (cols[0]) newIntake[lift] = cols[0];
      if (cols[1]) newExhaust[lift] = cols[1];
    });

    setIntakeFlows(newIntake);
    setExhaustFlows(newExhaust);
    e.preventDefault();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Cylinder Head Flow Calculator — CFM to HP"
        description="Calculate horsepower potential from cylinder head flow bench numbers. Converts CFM to HP, calculates flow coefficient, intake/exhaust ratio, and port velocity. Compare your heads against popular SBC, LS, BBC, and Ford heads."
        canonical="/calculators/head-flow"
        keywords="cylinder head flow calculator, CFM to HP calculator, head flow bench numbers, how much HP from cylinder heads, flow coefficient calculator, intake exhaust flow ratio"
      />
      <h1 className="text-3xl font-bold mb-2">Cylinder Head Flow Calculator</h1>
      <p className="text-muted-foreground mb-8">Convert flow bench CFM to horsepower potential. Analyze flow coefficient, exhaust ratio, and compare against popular heads.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      {/* Mode Toggle */}
      <div className="flex rounded-lg border overflow-hidden mb-8 max-w-lg">
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "quick" ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setMode("quick")}
        >
          Quick Estimate
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "full" ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setMode("full")}
        >
          Full Flow Curve Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ──────────── LEFT COLUMN: INPUTS ──────────── */}
        <div className="space-y-4">

          {/* Flow Data */}
          <Card>
            <CardHeader>
              <CardTitle>Head Flow Data</CardTitle>
              <CardDescription>
                {mode === "quick"
                  ? "Enter peak flow from your flow bench sheet or manufacturer spec."
                  : "Enter CFM at each lift increment from your flow bench printout."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "quick" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Peak Intake CFM</Label>
                      <Input type="number" step="1" min="50" max="600" value={peakIntakeStr} onChange={(e) => setPeakIntake(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Intake flow at max lift</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Peak Exhaust CFM</Label>
                      <Input type="number" step="1" min="0" max="500" value={peakExhaustStr} onChange={(e) => setPeakExhaust(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Optional — for ratio analysis</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Test Pressure</Label>
                    <Select value={testPressureStr} onValueChange={setTestPressure}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="28">28" H₂O (US standard)</SelectItem>
                        <SelectItem value="25">25" H₂O</SelectItem>
                        <SelectItem value="10">10" H₂O</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Check your flow sheet — most US shops test at 28"</p>
                  </div>
                </>
              ) : (
                <div onPaste={handlePaste}>
                  <p className="text-xs text-muted-foreground mb-3">Enter CFM values at each lift. You can paste two columns (intake, exhaust) from a spreadsheet.</p>
                  <div className="space-y-2">
                    <Label>Test Pressure</Label>
                    <Select value={testPressureStr} onValueChange={setTestPressure}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="28">28" H₂O (US standard)</SelectItem>
                        <SelectItem value="25">25" H₂O</SelectItem>
                        <SelectItem value="10">10" H₂O</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium w-24">Lift (in)</th>
                          <th className="px-3 py-2 text-left font-medium">Intake CFM</th>
                          <th className="px-3 py-2 text-left font-medium">Exhaust CFM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {LIFT_INCREMENTS.map((lift) => (
                          <tr key={lift} className="border-t">
                            <td className="px-3 py-1.5 font-mono text-muted-foreground">{lift.toFixed(3)}</td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className="h-8 text-sm"
                                placeholder="—"
                                value={intakeFlows[lift] || ""}
                                onChange={(e) => setIntakeFlows({ ...intakeFlows, [lift]: e.target.value })}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className="h-8 text-sm"
                                placeholder="—"
                                value={exhaustFlows[lift] || ""}
                                onChange={(e) => setExhaustFlows({ ...exhaustFlows, [lift]: e.target.value })}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Leave rows blank below your max lift. Minimum 3 data points required.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engine Specs */}
          <Card>
            <CardHeader>
              <CardTitle>Engine Specs</CardTitle>
              <CardDescription>Displacement and head dimensions for HP and flow coefficient calculation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Engine Displacement (CID)</Label>
                  <Input type="number" step="1" min="50" value={displacementStr} onChange={(e) => setDisplacement(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Number of Cylinders</Label>
                  <Select value={cylindersStr} onValueChange={setCylinders}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["4", "6", "8", "10", "12"].map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Intake Valve Diameter (in)</Label>
                  <Input type="number" step="0.001" min="1" max="3" value={valveDiaStr} onChange={(e) => setValveDia(e.target.value)} />
                  <p className="text-xs text-muted-foreground">From head spec sheet</p>
                </div>
                <div className="space-y-2">
                  <Label>Peak Valve Lift (in)</Label>
                  <Input type="number" step="0.001" min="0.1" max="0.900" value={peakLiftStr} onChange={(e) => setPeakLift(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Cam lift × rocker ratio</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target RPM</Label>
                <Input type="number" step="100" min="2000" max="10000" value={targetRpmStr} onChange={(e) => setTargetRpm(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Inputs */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 font-medium text-sm hover:bg-muted transition-colors"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <span>Port Velocity Inputs (optional)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </button>
            {advancedOpen && (
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">If you know your intake port cross-section area, enter it here for port velocity analysis.</p>
                <div className="space-y-2">
                  <Label className="text-xs">Intake Port Cross-Section Area (sq.in.)</Label>
                  <Input type="number" step="0.01" min="0.5" max="8" placeholder="e.g. 2.50" value={portAreaStr} onChange={(e) => setPortArea(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Measured at the smallest point (usually the pushrod pinch or the short-turn radius). Typical SBC: 1.8–2.4 sq.in., LS: 2.2–3.0 sq.in., BBC: 2.8–4.0 sq.in.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ──────────── RIGHT COLUMN: RESULTS ──────────── */}
        <div className="space-y-4">

          {!results && (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center text-muted-foreground">
                Enter your head flow data and engine specs to see results.
              </CardContent>
            </Card>
          )}

          {results && (
            <>
              {/* HP Potential */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Estimated HP Potential</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">
                        {mode === "full" && curveResults ? "HP from Average Flow" : "HP from Peak Flow"}
                      </p>
                      <p className="text-3xl font-bold text-[#E85D04]">
                        {mode === "full" && curveResults
                          ? `${fmt(curveResults.curveHpLow, 0)}–${fmt(curveResults.curveHpHigh, 0)}`
                          : `${fmt(results.hpLow, 0)}–${fmt(results.hpHigh, 0)}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        HP range (low = typical VE, high = well-matched cam/intake)
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">HP per Liter</p>
                      <p className="text-3xl font-bold">{fmt(results.hpPerLiter, 1)}</p>
                      <p className="text-xs text-gray-500">{getHpPerLiterLabel(results.hpPerLiter)}</p>
                    </div>
                  </div>
                  {testPressure !== 28 && (
                    <p className="mt-3 text-xs text-gray-400">
                      Flow corrected from {testPressure}" to 28" H₂O: {fmt(results.correctedIntakeCfm, 1)} CFM intake
                      {results.correctedExhaustCfm > 0 ? `, ${fmt(results.correctedExhaustCfm, 1)} CFM exhaust` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Flow Analysis */}
              <Card>
                <CardHeader><CardTitle>Flow Analysis</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">Flow Coefficient</p>
                      <p className={`text-2xl font-bold ${results.flowCoeffColor}`}>{fmt(results.flowCoefficient, 1)}%</p>
                      <p className="text-xs text-muted-foreground">{results.flowCoeffLabel}</p>
                    </div>
                    {results.exhaustIntakeRatio > 0 && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">Exhaust / Intake Ratio</p>
                        <p className={`text-2xl font-bold ${
                          results.exhaustIntakeRatio >= 70 ? "text-green-600" : results.exhaustIntakeRatio >= 65 ? "text-yellow-600" : "text-red-600"
                        }`}>{fmt(results.exhaustIntakeRatio, 1)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {results.exhaustIntakeRatio >= 75 ? "Excellent for NA" : results.exhaustIntakeRatio >= 70 ? "Good for NA" : results.exhaustIntakeRatio >= 65 ? "Acceptable" : "Low — consider exhaust work"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">CFM per Cubic Inch</p>
                      <p className="text-2xl font-bold">{fmt(results.cfmPerCi, 2)}</p>
                      <p className="text-xs text-muted-foreground">per cylinder (normalized)</p>
                    </div>
                    {results.portVelocity !== null && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">Port Velocity</p>
                        <p className={`text-2xl font-bold ${
                          results.portVelocity >= 180 && results.portVelocity <= 260 ? "text-green-600" : "text-yellow-600"
                        }`}>{fmt(results.portVelocity, 0)} ft/s</p>
                        <p className="text-xs text-muted-foreground">{getPortVelocityLabel(results.portVelocity)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Full Curve Results */}
              {mode === "full" && curveResults && (
                <Card>
                  <CardHeader><CardTitle>Flow Curve Analysis</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <p className="text-xs text-muted-foreground">Avg Intake</p>
                        <p className="text-xl font-bold">{fmt(curveResults.avgIntakeCfm, 1)}</p>
                        <p className="text-xs text-muted-foreground">CFM</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <p className="text-xs text-muted-foreground">Avg Exhaust</p>
                        <p className="text-xl font-bold">{curveResults.avgExhaustCfm > 0 ? fmt(curveResults.avgExhaustCfm, 1) : "—"}</p>
                        <p className="text-xs text-muted-foreground">CFM</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <p className="text-xs text-muted-foreground">Peak/Avg Ratio</p>
                        <p className="text-xl font-bold">{fmt(curveResults.peakToAvgRatio, 2)}×</p>
                        <p className="text-xs text-muted-foreground">{curveResults.peakToAvgRatio > 1.5 ? "Low-lift restriction" : "Even flow curve"}</p>
                      </div>
                    </div>

                    {/* Visual flow curve */}
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Flow Curve (corrected to 28" H₂O)</p>
                      <div className="space-y-1">
                        {curveResults.intakeData.map((pt) => {
                          const maxCfm = Math.max(...curveResults.intakeData.map((d) => d.cfm));
                          const pct = (pt.cfm / maxCfm) * 100;
                          const exPt = curveResults.exhaustData.find((e) => e.lift === pt.lift);
                          const exPct = exPt ? (exPt.cfm / maxCfm) * 100 : 0;
                          return (
                            <div key={pt.lift} className="flex items-center gap-2 text-xs">
                              <span className="w-12 text-right font-mono text-muted-foreground">{pt.lift.toFixed(3)}</span>
                              <div className="flex-1 relative h-5">
                                <div className="absolute inset-y-0 left-0 bg-[#E85D04]/20 rounded-r" style={{ width: `${pct}%` }} />
                                <div className="absolute inset-y-0 left-0 bg-[#E85D04] rounded-r" style={{ width: `${pct}%`, maxWidth: `${pct}%`, opacity: 0.7 }} />
                                {exPct > 0 && (
                                  <div className="absolute inset-y-0 left-0 bg-blue-500/50 rounded-r" style={{ width: `${exPct}%`, top: "60%", height: "40%" }} />
                                )}
                              </div>
                              <span className="w-16 text-right font-mono">{fmt(pt.cfm, 0)}</span>
                              {exPt && <span className="w-14 text-right font-mono text-blue-600">{fmt(exPt.cfm, 0)}</span>}
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#E85D04]/70 rounded" /> Intake</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500/50 rounded" /> Exhaust</span>
                        </div>
                      </div>
                    </div>

                    {curveResults.peakToAvgRatio > 1.45 && (
                      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                        Peak flow is significantly higher than average ({fmt(curveResults.peakToAvgRatio, 2)}×). This head has good top-end flow but may have a restriction at lower lifts — common with big valves or aggressive bowl work. Mid-range torque may suffer.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {results.warnings.length > 0 && (
                <div className="space-y-2">
                  {results.warnings.map((w, i) => (
                    <div key={i} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Cross-links */}
              <div className="p-4 rounded-lg bg-muted/20 border">
                <p className="text-sm font-medium mb-2">Related Calculators</p>
                <div className="flex flex-wrap gap-2">
                  <a href="/calculators/cam-duration" className="text-sm text-[#E85D04] hover:underline">Cam Calculator — match your cam to these heads</a>
                  <span className="text-muted-foreground">·</span>
                  <a href="/calculators/hp-estimator" className="text-sm text-[#E85D04] hover:underline">HP Estimator — full build estimate</a>
                  <span className="text-muted-foreground">·</span>
                  <a href="/calculators/turbo-finder" className="text-sm text-[#E85D04] hover:underline">Turbo Finder — size a turbo for these heads</a>
                </div>
              </div>
            </>
          )}

          {/* ──────────── HEAD COMPARISON TABLE ──────────── */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-[#E85D04]/10 font-medium text-sm hover:bg-[#E85D04]/20 transition-colors"
              onClick={() => setComparisonOpen(!comparisonOpen)}
            >
              <span>Head Comparison Reference ({HEAD_DATABASE.length} popular heads)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${comparisonOpen ? "rotate-180" : ""}`} />
            </button>
            {comparisonOpen && (
              <div className="p-4 overflow-x-auto">
                <p className="text-xs text-muted-foreground mb-3">
                  All flow numbers at 28" H₂O. HP estimate uses your {cylinders}-cylinder configuration with the SuperFlow formula.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-2 py-2 font-medium">Head</th>
                      <th className="px-2 py-2 font-medium text-right">Intake</th>
                      <th className="px-2 py-2 font-medium text-right">Exhaust</th>
                      <th className="px-2 py-2 font-medium text-right">Ratio</th>
                      <th className="px-2 py-2 font-medium text-right">Est. HP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headComparison.map((h) => {
                      const isYours = results && Math.abs(h.intakeCfm - results.correctedIntakeCfm) < 15;
                      return (
                        <tr key={h.name} className={`border-b ${isYours ? "bg-[#E85D04]/5" : ""}`}>
                          <td className="px-2 py-2">
                            <span className="font-medium">{h.name}</span>
                            <br />
                            <span className="text-xs text-muted-foreground">{h.notes}</span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono">{h.intakeCfm}</td>
                          <td className="px-2 py-2 text-right font-mono">{h.exhaustCfm}</td>
                          <td className="px-2 py-2 text-right font-mono">{fmt(h.exhaustRatio, 0)}%</td>
                          <td className="px-2 py-2 text-right font-mono font-bold">{fmt(h.hpEstimate, 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {results && (
                  <div className="mt-3 p-2 rounded bg-[#E85D04]/5 text-sm">
                    Your heads: <strong>{fmt(results.correctedIntakeCfm, 0)} CFM</strong> intake → <strong>{fmt((results.hpLow + results.hpHigh) / 2, 0)} HP</strong> estimated
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ──────────── FORMULAS ──────────── */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 font-medium text-sm hover:bg-muted transition-colors"
              onClick={() => setFormulasOpen(!formulasOpen)}
            >
              <span>Formulas & Methodology</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${formulasOpen ? "rotate-180" : ""}`} />
            </button>
            {formulasOpen && (
              <div className="p-5 space-y-4 text-sm">
                <div>
                  <p className="font-medium">HP from Peak Flow (SuperFlow formula)</p>
                  <p className="font-mono text-xs bg-muted/30 p-2 rounded mt-1">HP = Peak CFM × 0.257 × Number of Cylinders</p>
                  <p className="text-xs text-muted-foreground mt-1">Source: SuperFlow SF-600/SF-1020 documentation. Accurate for NA engines up to ~700 HP / 7,000 RPM at 28" H₂O.</p>
                </div>
                <div>
                  <p className="font-medium">Test Pressure Correction</p>
                  <p className="font-mono text-xs bg-muted/30 p-2 rounded mt-1">Corrected CFM = Measured CFM × √(28 / Test Pressure)</p>
                  <p className="text-xs text-muted-foreground mt-1">Derived from Bernoulli's equation — flow is proportional to the square root of the pressure differential.</p>
                </div>
                <div>
                  <p className="font-medium">Flow Coefficient</p>
                  <p className="font-mono text-xs bg-muted/30 p-2 rounded mt-1">Flow Coefficient = Actual CFM / (Valve Area × 146 CFM/sq.in.)</p>
                  <p className="text-xs text-muted-foreground mt-1">146 CFM/sq.in. is the theoretical maximum for a perfect orifice at 28" H₂O (SuperFlow). Good street heads: 60–75%. Well-ported: 75–85%. Race: 85%+.</p>
                </div>
                <div>
                  <p className="font-medium">Port Velocity</p>
                  <p className="font-mono text-xs bg-muted/30 p-2 rounded mt-1">Velocity (ft/sec) = CFM × 2.4 / Port Area (sq.in.)</p>
                  <p className="text-xs text-muted-foreground mt-1">Street targets: 180–220 ft/sec. Street/strip: 220–260 ft/sec. Race: 250–320 ft/sec.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────── EDUCATIONAL SECTION ──────────── */}
      <div className="mt-10 border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-medium hover:bg-[#2a2a2a] transition-colors"
          onClick={() => setEducationOpen(!educationOpen)}
        >
          <span>Understanding Cylinder Head Flow</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${educationOpen ? "rotate-180" : ""}`} />
        </button>
        {educationOpen && (
          <div className="p-6 prose prose-sm max-w-none">
            <h3>How Flow Bench Numbers Translate to Horsepower</h3>
            <p>
              An internal combustion engine is fundamentally an air pump. The more air it can ingest, mix with fuel, and expel, the more power it makes. Of all the components in an engine, the cylinder heads are the single biggest restriction to airflow. The intake ports, valves, bowls, chambers, and exhaust ports collectively determine how much air gets in and out of each cylinder on every cycle.
            </p>
            <p>
              Flow bench testing measures a head's airflow capacity in cubic feet per minute (CFM) at a standardized pressure drop — typically 28 inches of water column in the US. The SuperFlow formula <code>HP = CFM × 0.257 × cylinders</code> is a well-validated empirical relationship that converts this bench number to an HP estimate. It works because the relationship between airflow capacity and power output is remarkably linear for naturally aspirated engines up to about 700 HP.
            </p>

            <h3>Why Peak CFM Is Misleading</h3>
            <p>
              When people compare heads, they almost always compare peak flow — the CFM number at maximum valve lift. But the engine doesn't spend most of its time at maximum lift. The valve opens from the seat, reaches peak lift, and closes again. The flow across this entire lift curve determines real-world power.
            </p>
            <p>
              Consider two heads: Head A flows 280 CFM at 0.600" but only 180 CFM at 0.300". Head B flows 260 CFM at 0.600" but 220 CFM at 0.300". Head B will almost certainly make more mid-range torque and may even make more peak HP, because the <em>average</em> flow across the lift curve is higher. The valve spends most of its travel time below peak lift — flow at 0.200"–0.400" lift is where the engine lives most of the time.
            </p>
            <p>
              This is why the "Full Flow Curve" mode in this calculator is more accurate. When you enter flow at every lift increment, the average flow — the area under the curve — gives a much better picture of what the heads will actually deliver.
            </p>

            <h3>The Port Velocity Tradeoff</h3>
            <p>
              Bigger ports flow more air — but only at high RPM and high valve lift. At low RPM and low lift, the air velocity through an oversized port drops too low to maintain a strong pressure signal. This kills throttle response, idle quality, and low-RPM torque.
            </p>
            <p>
              This is why a 180cc runner SBC head often makes more power on a 350 than a 230cc runner head at street RPMs. The smaller runner maintains higher air velocity, which keeps the fuel atomized and the intake charge moving efficiently. The bigger runner only pays off above 5,500–6,000 RPM where the engine can actually use all that airflow capacity.
            </p>
            <p>
              Ideal port velocity at peak flow is 180–220 ft/sec for a street engine that needs good idle and mid-range torque, 220–260 ft/sec for street/strip, and 250–320 ft/sec for dedicated race applications where idle quality and low-RPM drivability don't matter.
            </p>

            <h3>Test Pressure Matters</h3>
            <p>
              Flow bench numbers are not directly comparable between different test pressures. A head tested at 28" H₂O will show higher CFM numbers than the same head tested at 10" H₂O — not because the head flows differently, but because the higher test pressure pushes more air through the same restriction.
            </p>
            <p>
              The correction follows the square root of the pressure ratio (from Bernoulli's equation): <code>Corrected CFM = Measured CFM × √(28 / Test Pressure)</code>. A head that flows 150 CFM at 10" H₂O corrects to about 251 CFM at 28" — a 67% increase. Always check the test pressure on your flow sheet before comparing numbers.
            </p>

            <h3>The Heads Are Only as Good as the Cam</h3>
            <p>
              A head that flows 300 CFM at 0.600" lift is wasted if your cam only opens 0.480". The head's peak flow potential is never reached because the valve never opens far enough to get there. The cam-head match is one of the most critical relationships in an engine build.
            </p>
            <p>
              Look at your head's flow curve: where does the flow plateau? If it's still climbing at 0.500" and your cam only opens 0.480", you're leaving flow (and power) on the table. Conversely, if the flow plateaus at 0.450" and your cam opens to 0.550", you're carrying the weight and cost of a bigger cam profile without gaining any additional airflow. Match the cam to the heads — use our <a href="/calculators/cam-duration" className="text-[#E85D04] hover:underline">Cam Calculator</a> to find the right profile for your heads.
            </p>
          </div>
        )}
      </div>

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
              <h4 className="font-semibold text-foreground mb-1">CFM to HP Formula</h4>
              <p>HP = Peak CFM x 0.257 x Cylinders. This SuperFlow formula is well-validated for NA engines up to ~700 HP.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Exhaust-to-Intake Ratio</h4>
              <p>Target 72-80% of intake flow. Below 65% = exhaust is the bottleneck. Consider exhaust port work or larger valves.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Port Velocity Targets</h4>
              <p>Street: 180-220 ft/sec. Street/strip: 220-260 ft/sec. Race: 250-320 ft/sec. Too low = lazy throttle response.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Flow Coefficient Grades</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>{"<"} 60%:</span><span>Room to improve</span></li>
                <li className="flex justify-between"><span>60-75%:</span><span>Good street head</span></li>
                <li className="flex justify-between"><span>75-85%:</span><span>Well-ported</span></li>
                <li className="flex justify-between"><span>{">"} 85%:</span><span>Race-level</span></li>
              </ul>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Good Peak Flow Numbers</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>Stock Vortec SBC:</span><span className="font-mono">218 CFM</span></li>
                <li className="flex justify-between"><span>AFR 195 SBC:</span><span className="font-mono">270 CFM</span></li>
                <li className="flex justify-between"><span>Stock LS3:</span><span className="font-mono">315 CFM</span></li>
                <li className="flex justify-between"><span>Ported LS3:</span><span className="font-mono">370 CFM</span></li>
                <li className="flex justify-between"><span>TFS Twisted Wedge:</span><span className="font-mono">250 CFM</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Cylinder Head Airflow and Power Potential</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Cylinder head airflow is the single greatest determinant of an engine's power potential. The widely validated SuperFlow formula — HP = Peak CFM x 0.257 x Cylinders — gives a reliable estimate for naturally aspirated engines. A set of heads flowing 270 CFM per port on a V8 yields approximately 555 HP potential (270 x 0.257 x 8). Stock Vortec SBC heads flow about 218 CFM, limiting a 350 to roughly 448 HP. Aftermarket heads like the AFR 195 flow 270 CFM, and ported LS3 heads can exceed 370 CFM.
          </p>
          <p>
            The exhaust-to-intake flow ratio is equally important. Target 72-80% of intake flow on the exhaust side. Below 65%, the exhaust port becomes the bottleneck — the cylinder cannot clear spent gases fast enough for the next intake charge. This shows up as poor scavenging, high exhaust temperatures, and a power plateau that no amount of intake porting will fix. Exhaust port work or larger exhaust valves are the solution.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Match the Heads to the Cam</h3>
          <p>
            A head that flows 300 CFM at 0.600" lift is wasted if your cam only opens the valve 0.480". The head's peak flow potential is never reached because the valve never opens far enough. Look at the flow curve: if flow is still climbing at your cam's maximum lift, you are leaving power on the table and may benefit from a higher-lift cam or higher-ratio rockers. Conversely, if flow plateaus at 0.450" and your cam opens to 0.550", you are carrying the cost and complexity of a bigger cam profile with no airflow benefit. Port velocity matters too — target 180-220 ft/sec for street builds and 250-320 ft/sec for race applications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
