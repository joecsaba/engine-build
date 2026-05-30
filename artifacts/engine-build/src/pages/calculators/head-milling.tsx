import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import headMillingContent from "@/data/calculatorContent/head-milling.mjs";

/* ── Engine layout types ────────────────────────────────────────── */

type EngineLayout = "inline" | "v-engine" | "flat";
type ValvetrainType = "ohv" | "sohc" | "dohc";
type UnitSystem = "imperial" | "metric";

/* ── Engine presets ─────────────────────────────────────────────── */

interface EnginePreset {
  label: string;
  layout: EngineLayout;
  valvetrain: ValvetrainType;
  bore: number;        // mm
  chamberCC: number;
  sprocketPD: number;  // cam sprocket pitch diameter, mm
  vAngle: number;      // degrees (0 for inline/flat)
  maxMill: number;     // mm, manufacturer max
  notes: string;
}

const ENGINE_PRESETS: Record<string, EnginePreset> = {
  custom: {
    label: "Custom / Enter Manually",
    layout: "inline", valvetrain: "dohc", bore: 86, chamberCC: 50, sprocketPD: 100, vAngle: 0, maxMill: 0.50, notes: "",
  },
  // Subaru Boxer
  ej25_sohc: {
    label: "Subaru EJ25 SOHC",
    layout: "flat", valvetrain: "sohc", bore: 99.5, chamberCC: 53, sprocketPD: 95, vAngle: 180, maxMill: 0.30, notes: "Aftermarket race-shop max 0.30mm. Subaru FSM grinding limit is 0.10mm (warpage 0.05mm). Head gasket failures common — minimal cleanup cuts preferred.",
  },
  ej25_dohc: {
    label: "Subaru EJ25 DOHC (STI/WRX)",
    layout: "flat", valvetrain: "dohc", bore: 99.5, chamberCC: 50, sprocketPD: 95, vAngle: 180, maxMill: 0.25, notes: "Turbo applications — watch effective CR closely. AVCS timing affected.",
  },
  ez30: {
    label: "Subaru EZ30 Flat-6",
    layout: "flat", valvetrain: "dohc", bore: 89.2, chamberCC: 48, sprocketPD: 95, vAngle: 180, maxMill: 0.25, notes: "Flat-6 with timing chain. Both banks affected asymmetrically — driver side ~3x more retard than passenger.",
  },
  ez36: {
    label: "Subaru EZ36 Flat-6",
    layout: "flat", valvetrain: "dohc", bore: 92, chamberCC: 49, sprocketPD: 95, vAngle: 180, maxMill: 0.25, notes: "AVCS on both intake and exhaust. Very tight milling tolerance.",
  },
  // Honda
  b16a: {
    label: "Honda B16A DOHC VTEC",
    layout: "inline", valvetrain: "dohc", bore: 81, chamberCC: 42, sprocketPD: 100, vAngle: 0, maxMill: 0.50, notes: "~1° retard per 0.30mm milled. Popular for NA high-rev builds.",
  },
  b18c: {
    label: "Honda B18C (GSR/Type R)",
    layout: "inline", valvetrain: "dohc", bore: 81, chamberCC: 43, sprocketPD: 100, vAngle: 0, maxMill: 0.50, notes: "High compression stock — watch P2V clearance.",
  },
  k20a: {
    label: "Honda K20A/K24",
    layout: "inline", valvetrain: "dohc", bore: 86, chamberCC: 46, sprocketPD: 105, vAngle: 0, maxMill: 0.50, notes: "Chain-driven. i-VTEC timing affected by milling.",
  },
  d16: {
    label: "Honda D16 SOHC",
    layout: "inline", valvetrain: "sohc", bore: 75, chamberCC: 41, sprocketPD: 100, vAngle: 0, maxMill: 0.50, notes: "~1° retard per 0.30mm. Belt-driven.",
  },
  // Toyota
  "2jz": {
    label: "Toyota 2JZ-GTE/GE",
    layout: "inline", valvetrain: "dohc", bore: 86, chamberCC: 52, sprocketPD: 110, vAngle: 0, maxMill: 0.50, notes: "Belt-driven DOHC. Popular turbo platform — keep CR in check.",
  },
  "1jz": {
    label: "Toyota 1JZ-GTE",
    layout: "inline", valvetrain: "dohc", bore: 86, chamberCC: 49, sprocketPD: 110, vAngle: 0, maxMill: 0.50, notes: "Similar to 2JZ head design.",
  },
  "4age": {
    label: "Toyota 4A-GE",
    layout: "inline", valvetrain: "dohc", bore: 81, chamberCC: 42, sprocketPD: 95, vAngle: 0, maxMill: 0.50, notes: "Belt-driven. 20V version has VVT.",
  },
  // Nissan
  sr20det: {
    label: "Nissan SR20DET",
    layout: "inline", valvetrain: "dohc", bore: 86, chamberCC: 47, sprocketPD: 105, vAngle: 0, maxMill: 0.50, notes: "Chain-driven. Popular turbo platform.",
  },
  rb26dett: {
    label: "Nissan RB26DETT",
    layout: "inline", valvetrain: "dohc", bore: 86, chamberCC: 48, sprocketPD: 110, vAngle: 0, maxMill: 0.40, notes: "Belt-driven. Twin-turbo — watch effective CR.",
  },
  // BMW
  s50_s52: {
    label: "BMW S50/S52 (M3)",
    layout: "inline", valvetrain: "dohc", bore: 86, chamberCC: 47, sprocketPD: 105, vAngle: 0, maxMill: 0.50, notes: "Chain-driven DOHC. VANOS timing affected.",
  },
  // Mitsubishi
  "4g63": {
    label: "Mitsubishi 4G63 (Evo)",
    layout: "inline", valvetrain: "dohc", bore: 85, chamberCC: 47, sprocketPD: 100, vAngle: 0, maxMill: 0.40, notes: "Belt-driven. MIVEC on later versions. AERA aftermarket spec is 0.38mm head-only; Mitsubishi FSM is 0.20mm combined head+block. Prior 0.50mm value exceeded AERA — lowered to 0.40 for safety.",
  },
  // Ford
  coyote: {
    label: "Ford 5.0 Coyote DOHC",
    layout: "v-engine", valvetrain: "dohc", bore: 92.2, chamberCC: 52, sprocketPD: 115, vAngle: 90, maxMill: 0.40, notes: "Chain-driven DOHC V8. Ti-VCT timing affected on both banks.",
  },
  mod46: {
    label: "Ford 4.6/5.4 Mod Motor SOHC",
    layout: "v-engine", valvetrain: "sohc", bore: 90.2, chamberCC: 51, sprocketPD: 110, vAngle: 90, maxMill: 0.40, notes: "Chain-driven. Intake manifold alignment critical on V-config.",
  },
  // GM
  northstar: {
    label: "GM Northstar 4.6L DOHC",
    layout: "v-engine", valvetrain: "dohc", bore: 93, chamberCC: 52, sprocketPD: 110, vAngle: 90, maxMill: 0.40, notes: "Chain-driven DOHC V8.",
  },
  // Porsche
  porsche_flat6: {
    label: "Porsche 911 Flat-6 (996/997)",
    layout: "flat", valvetrain: "dohc", bore: 96, chamberCC: 55, sprocketPD: 105, vAngle: 180, maxMill: 0.30, notes: "Chain-driven. VarioCam timing affected. Asymmetric bank retard.",
  },
};

/* ── Layout labels ──────────────────────────────────────────────── */

const LAYOUT_LABELS: Record<EngineLayout, string> = {
  inline: "Inline",
  "v-engine": "V-Engine",
  flat: "Flat / Boxer",
};

const VALVETRAIN_LABELS: Record<ValvetrainType, string> = {
  ohv: "OHV (Pushrod)",
  sohc: "SOHC",
  dohc: "DOHC",
};

/* ── Calculation helpers ────────────────────────────────────────── */

function mmToInch(mm: number): number { return mm / 25.4; }
function inchToMm(inch: number): number { return inch * 25.4; }

/** Volume removed by milling (cc) */
function volumeRemoved(boreMm: number, depthMm: number): number {
  return (Math.PI / 4) * boreMm * boreMm * depthMm / 1000;
}

/** Cam timing retard in degrees at the sprocket */
function camRetardDeg(milledMm: number, sprocketPitchDiaMm: number): number {
  if (sprocketPitchDiaMm <= 0) return 0;
  const circumference = Math.PI * sprocketPitchDiaMm;
  return (milledMm / circumference) * 360;
}

/** Intake manifold face correction for V-engines (mm to cut from intake face) */
function intakeManifoldCorrection(milledMm: number, vAngleDeg: number): number {
  if (vAngleDeg <= 0 || vAngleDeg >= 180) return 0;
  // The intake face sits at half the V-angle from vertical
  // Correction = milled * cos(halfAngle)  (approx 0.95:1 for 90° V)
  const halfAngleRad = (vAngleDeg / 2) * (Math.PI / 180);
  return milledMm * Math.cos(halfAngleRad);
}

/* ── Component ──────────────────────────────────────────────────── */

export default function HeadMillingCalculator() {
  // Unit system
  const [units, setUnits] = useState<UnitSystem>("imperial");
  const isMetric = units === "metric";

  // Preset
  const [preset, setPreset] = useState("custom");

  // Engine config
  const [layout, setLayout] = useState<EngineLayout>("inline");
  const [valvetrain, setValvetrain] = useState<ValvetrainType>("dohc");
  const [vAngle, setVAngle] = useState("90");

  // Dimensional inputs (stored internally as mm)
  const [bore, setBore] = useState("86");
  const [chamberCC, setChamberCC] = useState("50");
  const [currentCR, setCurrentCR] = useState("10.0");
  const [sprocketPD, setSprocketPD] = useState("100");
  const [millingDepth, setMillingDepth] = useState(isMetric ? "0.25" : "0.010");
  const [maxMill, setMaxMill] = useState("0.50");
  const [p2vIntake, setP2vIntake] = useState("2.5");
  const [p2vExhaust, setP2vExhaust] = useState("3.0");
  const [hgThickness, setHgThickness] = useState("1.2");

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEducation, setShowEducation] = useState(false);

  // Preset application
  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === "custom") return;
    const p = ENGINE_PRESETS[key];
    if (!p) return;
    setLayout(p.layout);
    setValvetrain(p.valvetrain);
    setBore(isMetric ? p.bore.toFixed(1) : mmToInch(p.bore).toFixed(3));
    setChamberCC(p.chamberCC.toFixed(0));
    setSprocketPD(isMetric ? p.sprocketPD.toFixed(0) : mmToInch(p.sprocketPD).toFixed(3));
    setVAngle(p.vAngle.toString());
    setMaxMill(isMetric ? p.maxMill.toFixed(2) : mmToInch(p.maxMill).toFixed(4));
  };

  // Parse all inputs to mm for calculation
  const boreMm = isMetric ? (parseFloat(bore) || 0) : inchToMm(parseFloat(bore) || 0);
  const millMm = isMetric ? (parseFloat(millingDepth) || 0) : inchToMm(parseFloat(millingDepth) || 0);
  const sprocketMm = isMetric ? (parseFloat(sprocketPD) || 0) : inchToMm(parseFloat(sprocketPD) || 0);
  const maxMillMm = isMetric ? (parseFloat(maxMill) || 0) : inchToMm(parseFloat(maxMill) || 0);
  const chamberVol = parseFloat(chamberCC) || 0;
  const cr = parseFloat(currentCR) || 0;
  const vAng = parseFloat(vAngle) || 0;
  const p2vIn = isMetric ? (parseFloat(p2vIntake) || 0) : inchToMm(parseFloat(p2vIntake) || 0);
  const p2vEx = isMetric ? (parseFloat(p2vExhaust) || 0) : inchToMm(parseFloat(p2vExhaust) || 0);
  const hgMm = isMetric ? (parseFloat(hgThickness) || 0) : inchToMm(parseFloat(hgThickness) || 0);

  // ── Core calculations ──
  const results = useMemo(() => {
    const volRemoved = volumeRemoved(boreMm, millMm);
    const newChamberCC = Math.max(chamberVol - volRemoved, 0.1);

    // New CR: CR = (swept + clearance) / clearance
    // Old: cr = (swept + chamberVol) / chamberVol  =>  swept = chamberVol * (cr - 1)
    const swept = chamberVol * (cr - 1);
    const newCR = swept > 0 ? (swept + newChamberCC) / newChamberCC : 0;

    // Cam timing retard (OHC only)
    const isOHC = valvetrain === "sohc" || valvetrain === "dohc";
    const camRetard = isOHC ? camRetardDeg(millMm, sprocketMm) : 0;

    // For boxer/flat engines, asymmetric retard
    // Driver side sees ~3x the retard due to chain routing
    const isFlat = layout === "flat";
    const bankRetardPassenger = isFlat ? camRetard * 0.5 : camRetard;
    const bankRetardDriver = isFlat ? camRetard * 1.5 : camRetard;

    // Valve-to-piston clearance change (1:1 reduction)
    const newP2vIntake = p2vIn - millMm;
    const newP2vExhaust = p2vEx - millMm;

    // Pushrod length change (OHV only — shorten by milling amount)
    const pushrodChange = valvetrain === "ohv" ? -millMm : 0;

    // Intake manifold face correction (V-engines only)
    const intakeCorrection = layout === "v-engine" ? intakeManifoldCorrection(millMm, vAng) : 0;

    // Compensating head gasket thickness
    const compensatingHG = hgMm + millMm;

    // Exceeds max milling?
    const exceedsMax = maxMillMm > 0 && millMm > maxMillMm;

    return {
      volRemoved,
      newChamberCC,
      newCR,
      crChange: newCR - cr,
      camRetard,
      bankRetardPassenger,
      bankRetardDriver,
      isOHC,
      isFlat,
      newP2vIntake,
      newP2vExhaust,
      pushrodChange,
      intakeCorrection,
      compensatingHG,
      exceedsMax,
    };
  }, [boreMm, millMm, sprocketMm, chamberVol, cr, valvetrain, layout, vAng, p2vIn, p2vEx, maxMillMm, hgMm]);

  // ── Warnings ──
  const warnings = useMemo(() => {
    const w: { severity: "red" | "yellow" | "blue"; msg: string }[] = [];

    if (results.exceedsMax) {
      w.push({ severity: "red", msg: `Milling depth exceeds manufacturer maximum of ${isMetric ? maxMillMm.toFixed(2) + " mm" : mmToInch(maxMillMm).toFixed(4) + "\""}.` });
    }
    if (results.newP2vIntake < 2.0 && p2vIn > 0) {
      w.push({ severity: "red", msg: `Intake valve-to-piston clearance drops to ${results.newP2vIntake.toFixed(2)} mm (${mmToInch(results.newP2vIntake).toFixed(3)}") — minimum is 2.0 mm (0.080").` });
    } else if (results.newP2vIntake < 2.5 && p2vIn > 0) {
      w.push({ severity: "yellow", msg: `Intake P2V clearance is tight at ${results.newP2vIntake.toFixed(2)} mm (${mmToInch(results.newP2vIntake).toFixed(3)}"). Clay-check recommended.` });
    }
    if (results.newP2vExhaust < 2.5 && p2vEx > 0) {
      w.push({ severity: "red", msg: `Exhaust valve-to-piston clearance drops to ${results.newP2vExhaust.toFixed(2)} mm (${mmToInch(results.newP2vExhaust).toFixed(3)}") — minimum is 2.5 mm (0.100").` });
    } else if (results.newP2vExhaust < 3.0 && p2vEx > 0) {
      w.push({ severity: "yellow", msg: `Exhaust P2V clearance is tight at ${results.newP2vExhaust.toFixed(2)} mm (${mmToInch(results.newP2vExhaust).toFixed(3)}"). Clay-check recommended.` });
    }
    if (results.isOHC && results.camRetard > 2.0) {
      w.push({ severity: "yellow", msg: `Cam timing retard of ${results.camRetard.toFixed(2)}° is significant. Adjustable cam gears or offset dowels recommended.` });
    }
    if (results.isOHC && results.camRetard > 4.0) {
      w.push({ severity: "red", msg: `Cam timing retard of ${results.camRetard.toFixed(2)}° is excessive. Correction is mandatory — use adjustable cam sprockets, offset dowels, or a thicker head gasket.` });
    }
    if (results.newCR > 12.5) {
      w.push({ severity: "yellow", msg: `New compression ratio of ${results.newCR.toFixed(2)}:1 is very high. Verify fuel octane requirements.` });
    }
    if (results.isFlat && millMm > 0) {
      w.push({ severity: "blue", msg: "Flat/boxer engine: cam retard is asymmetric between banks. Driver-side bank typically sees ~3x more retard than passenger side due to chain routing." });
    }
    if (layout === "v-engine" && results.intakeCorrection > 0) {
      w.push({ severity: "blue", msg: `V-engine: intake manifold face should be milled ${isMetric ? results.intakeCorrection.toFixed(3) + " mm" : mmToInch(results.intakeCorrection).toFixed(4) + "\""} to maintain port alignment.` });
    }
    return w;
  }, [results, p2vIn, p2vEx, isMetric, maxMillMm, millMm, layout]);

  const presetData = ENGINE_PRESETS[preset];

  const depthLabel = isMetric ? "mm" : "inches";
  const dimLabel = isMetric ? "mm" : "inches";

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Head Milling Calculator — CR, Cam Timing & Clearance"
        description="Calculate how cylinder head milling affects compression ratio, OHC cam timing retard, valve-to-piston clearance, and intake manifold alignment. Presets for Subaru boxer, Honda, Toyota, Nissan, BMW, Ford, and Porsche engines."
        canonical="/calculators/head-milling"
        keywords="head milling calculator, cylinder head milling, cam timing retard, head milling compression ratio, OHC head milling, subaru head milling, boxer engine milling, valve to piston clearance milling, head milling cam timing change"
      />

      <h1 className="text-3xl font-bold mb-2">Head Milling Calculator</h1>
      <p className="text-muted-foreground mb-8">
        See exactly how milling your cylinder heads changes compression ratio, cam timing, valve clearances, and manifold alignment — all in one place. Critical for any OHC engine, and especially for flat/boxer layouts where the timing effects are asymmetric between banks.
      </p>

      {/* ── Warnings ─────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="space-y-2 mb-6">
          {warnings.map((w, i) => {
            const bg = w.severity === "red" ? "bg-red-50 border-red-300 text-red-800"
              : w.severity === "yellow" ? "bg-yellow-50 border-yellow-300 text-yellow-800"
              : "bg-blue-50 border-blue-300 text-blue-800";
            const Icon = w.severity === "blue" ? Info : AlertTriangle;
            return (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${bg}`}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{w.msg}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Inputs ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Unit toggle */}
          <div className="flex gap-2">
            <button
              className={`flex-1 text-sm py-2 rounded border font-medium transition-colors ${!isMetric ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              onClick={() => { setUnits("imperial"); setMillingDepth("0.010"); }}
            >
              Imperial (inches)
            </button>
            <button
              className={`flex-1 text-sm py-2 rounded border font-medium transition-colors ${isMetric ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              onClick={() => { setUnits("metric"); setMillingDepth("0.25"); }}
            >
              Metric (mm)
            </button>
          </div>

          {/* Engine preset */}
          <Card>
            <CardHeader><CardTitle className="text-base">Engine Preset</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={preset} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENGINE_PRESETS).map(([key, p]) => (
                    <SelectItem key={key} value={key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {preset !== "custom" && presetData?.notes && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <strong>Note:</strong> {presetData.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engine config */}
          <Card>
            <CardHeader><CardTitle className="text-base">Engine Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Engine Layout</Label>
                <Select value={layout} onValueChange={(v) => setLayout(v as EngineLayout)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LAYOUT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valvetrain</Label>
                <Select value={valvetrain} onValueChange={(v) => setValvetrain(v as ValvetrainType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VALVETRAIN_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {layout === "v-engine" && (
                <Field label="V-Angle (degrees)" value={vAngle} onChange={setVAngle} step="1" />
              )}
            </CardContent>
          </Card>

          {/* Dimensions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dimensions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label={`Cylinder Bore (${dimLabel})`} value={bore} onChange={setBore} step={isMetric ? "0.1" : "0.001"} />
              <Field label="Combustion Chamber Volume (cc)" value={chamberCC} onChange={setChamberCC} step="0.5" />
              <Field label="Current Compression Ratio" value={currentCR} onChange={setCurrentCR} step="0.1" />
              <div className="p-3 rounded border bg-orange-50 border-orange-200">
                <Field label={`Amount to Mill (${depthLabel})`} value={millingDepth} onChange={setMillingDepth} step={isMetric ? "0.01" : "0.001"} />
              </div>
              {(valvetrain === "sohc" || valvetrain === "dohc") && (
                <Field label={`Cam Sprocket Pitch Diameter (${dimLabel})`} value={sprocketPD} onChange={setSprocketPD} step={isMetric ? "1" : "0.1"} />
              )}
              <Field label={`Manufacturer Max Milling (${depthLabel})`} value={maxMill} onChange={setMaxMill} step={isMetric ? "0.01" : "0.001"} />
            </CardContent>
          </Card>

          {/* Advanced — P2V & head gasket */}
          <Card>
            <CardHeader>
              <button className="flex items-center justify-between w-full" onClick={() => setShowAdvanced(!showAdvanced)}>
                <CardTitle className="text-base">Clearances &amp; Head Gasket</CardTitle>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-3">
                <Field label={`Current Intake P2V Clearance (${dimLabel})`} value={p2vIntake} onChange={setP2vIntake} step={isMetric ? "0.1" : "0.001"} />
                <Field label={`Current Exhaust P2V Clearance (${dimLabel})`} value={p2vExhaust} onChange={setP2vExhaust} step={isMetric ? "0.1" : "0.001"} />
                <Field label={`Current Head Gasket Thickness (${dimLabel})`} value={hgThickness} onChange={setHgThickness} step={isMetric ? "0.1" : "0.001"} />
              </CardContent>
            )}
          </Card>
        </div>

        {/* ── Right: Results ────────────────────────────────────── */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader className="pb-3"><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              {/* CR + Chamber */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">New Compression Ratio</p>
                  <p className="text-4xl font-bold text-[#E85D04] tabular-nums leading-tight">{results.newCR > 0 ? results.newCR.toFixed(2) : "—"}:1</p>
                  <p className="text-xs text-gray-500">was {cr.toFixed(1)}:1 — <span className="text-[#E85D04]">+{results.crChange > 0 ? results.crChange.toFixed(2) : "0.00"}</span></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">New Chamber Volume</p>
                  <p className="text-4xl font-bold text-white tabular-nums leading-tight">{results.newChamberCC.toFixed(1)}<span className="text-lg text-gray-400 ml-1">cc</span></p>
                  <p className="text-xs text-gray-500">removed {results.volRemoved.toFixed(2)} cc</p>
                </div>
              </div>

              {/* Cam timing (OHC only) */}
              {results.isOHC && (
                <div className="pt-3 mt-3 border-t border-gray-700">
                  {results.isFlat ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Cam Retard (avg)</p>
                          <p className="text-2xl font-bold text-[#E85D04] tabular-nums leading-tight">{results.camRetard.toFixed(2)}°</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Passenger Bank</p>
                          <p className="font-mono font-semibold text-amber-400 text-xl tabular-nums leading-tight">{results.bankRetardPassenger.toFixed(2)}°</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Driver Bank</p>
                          <p className="font-mono font-semibold text-red-400 text-xl tabular-nums leading-tight">{results.bankRetardDriver.toFixed(2)}°</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">Driver bank sees ~3x retard due to chain routing. Verify with degree wheel.</p>
                    </>
                  ) : (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Cam Timing Retard</p>
                      <p className="text-3xl font-bold text-[#E85D04] tabular-nums leading-tight">{results.camRetard.toFixed(2)}°</p>
                      <p className="text-[10px] text-gray-600">All cam events shift later by this amount</p>
                    </div>
                  )}
                </div>
              )}

              {/* P2V clearance */}
              {showAdvanced && (p2vIn > 0 || p2vEx > 0) && (
                <div className="grid grid-cols-2 gap-4 pt-3 mt-3 border-t border-gray-700">
                  {p2vIn > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Intake P2V</p>
                      <p className={`text-xl font-bold tabular-nums leading-tight ${results.newP2vIntake < 2.0 ? "text-red-400" : results.newP2vIntake < 2.5 ? "text-yellow-400" : "text-green-400"}`}>
                        {isMetric ? results.newP2vIntake.toFixed(2) + " mm" : mmToInch(results.newP2vIntake).toFixed(3) + "\""}
                      </p>
                      <p className="text-[10px] text-gray-600">was {isMetric ? p2vIn.toFixed(2) + " mm" : (parseFloat(p2vIntake) || 0).toFixed(3) + "\""}</p>
                    </div>
                  )}
                  {p2vEx > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Exhaust P2V</p>
                      <p className={`text-xl font-bold tabular-nums leading-tight ${results.newP2vExhaust < 2.5 ? "text-red-400" : results.newP2vExhaust < 3.0 ? "text-yellow-400" : "text-green-400"}`}>
                        {isMetric ? results.newP2vExhaust.toFixed(2) + " mm" : mmToInch(results.newP2vExhaust).toFixed(3) + "\""}
                      </p>
                      <p className="text-[10px] text-gray-600">was {isMetric ? p2vEx.toFixed(2) + " mm" : (parseFloat(p2vExhaust) || 0).toFixed(3) + "\""}</p>
                    </div>
                  )}
                </div>
              )}

              {/* OHV: pushrod */}
              {valvetrain === "ohv" && (
                <div className="pt-3 mt-3 border-t border-gray-700">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Shorten Pushrods By</p>
                  <p className="text-xl font-bold text-[#E85D04] tabular-nums leading-tight">
                    {isMetric ? Math.abs(results.pushrodChange).toFixed(2) + " mm" : mmToInch(Math.abs(results.pushrodChange)).toFixed(4) + "\""}
                  </p>
                </div>
              )}

              {/* V-engine: intake manifold */}
              {layout === "v-engine" && results.intakeCorrection > 0 && (
                <div className="grid grid-cols-2 gap-4 pt-3 mt-3 border-t border-gray-700">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Mill Intake Face</p>
                    <p className="text-xl font-bold text-[#E85D04] tabular-nums leading-tight">
                      {isMetric ? results.intakeCorrection.toFixed(3) + " mm" : mmToInch(results.intakeCorrection).toFixed(4) + "\""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Front/Rear Trim</p>
                    <p className="text-xl font-bold text-white tabular-nums leading-tight">
                      {isMetric ? (results.intakeCorrection * 1.5).toFixed(3) + " mm" : mmToInch(results.intakeCorrection * 1.5).toFixed(4) + "\""}
                    </p>
                    <p className="text-[10px] text-gray-600">~1.5x intake face</p>
                  </div>
                </div>
              )}

              {/* Head gasket compensation */}
              {showAdvanced && (
                <div className="pt-3 mt-3 border-t border-gray-700">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Compensating Head Gasket</p>
                  <p className="text-xl font-bold text-[#E85D04] tabular-nums leading-tight">
                    {isMetric ? results.compensatingHG.toFixed(2) + " mm" : mmToInch(results.compensatingHG).toFixed(4) + "\""}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    stock ({isMetric ? hgMm.toFixed(2) + " mm" : (parseFloat(hgThickness) || 0).toFixed(3) + "\""}) + milled ({isMetric ? millMm.toFixed(2) + " mm" : (parseFloat(millingDepth) || 0) + "\""})
                  </p>
                </div>
              )}

              {/* Inline warnings */}
              {warnings.length > 0 && (
                <div className="space-y-1.5 pt-3 mt-3 border-t border-gray-700">
                  {warnings.map((w, i) => {
                    const colors = w.severity === "red" ? "bg-red-900/40 border-red-700/50 text-red-300"
                      : w.severity === "yellow" ? "bg-yellow-900/30 border-yellow-700/40 text-yellow-300"
                      : "bg-blue-900/30 border-blue-700/40 text-blue-300";
                    const Icon = w.severity === "blue" ? Info : AlertTriangle;
                    return (
                      <div key={i} className={`flex items-start gap-1.5 px-2 py-1.5 rounded border text-[11px] leading-tight ${colors}`}>
                        <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{w.msg}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Full-width reference section below the grid ────────── */}

      {/* Correction methods */}
      {results.isOHC && results.camRetard > 0.5 && (
        <Card className="mt-8">
          <CardHeader><CardTitle className="text-base">Cam Timing Correction Methods</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-semibold">Adjustable Cam Gears / Sprockets</p>
                  <p className="text-muted-foreground">Best solution — allows infinite adjustment within range (typically ±5–10°). Available for most OHC engines. Set with a degree wheel.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <div>
                  <p className="font-semibold">Offset Dowel Pins</p>
                  <p className="text-muted-foreground">Available in 2–9° increments. Press into the cam gear to offset timing. Cheaper than adjustable gears.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <div>
                  <p className="font-semibold">Thicker Head Gasket</p>
                  <p className="text-muted-foreground">
                    Use a gasket {isMetric ? results.compensatingHG.toFixed(2) + " mm" : mmToInch(results.compensatingHG).toFixed(3) + "\""} thick to restore original cam-to-crank distance. Also restores original CR. Aftermarket MLS gaskets are available in various thicknesses.
                  </p>
                </div>
              </div>
              {results.isFlat && (
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <div>
                    <p className="font-semibold">Eccentric Idlers (Boxer-Specific)</p>
                    <p className="text-muted-foreground">Crawford-style eccentric idler bearings allow per-bank timing adjustment. Essential for flat engines where banks are affected asymmetrically.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick-reference table: retard per milling depth */}
      <Card className="mt-8">
        <CardHeader><CardTitle className="text-base">Cam Retard vs. Milling Depth Reference</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Sprocket PD</th>
                  {[0.005, 0.010, 0.015, 0.020, 0.025, 0.030].map(d => (
                    <th key={d} className="pb-2 px-1 text-center font-medium text-muted-foreground">{d}"</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[85, 95, 100, 105, 110, 115].map(pd => (
                  <tr key={pd} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 font-semibold">{pd} mm</td>
                    {[0.005, 0.010, 0.015, 0.020, 0.025, 0.030].map(d => {
                      const ret = camRetardDeg(inchToMm(d), pd);
                      let color = "text-green-600";
                      if (ret >= 1.5) color = "text-yellow-600";
                      if (ret >= 3.0) color = "text-orange-600";
                      if (ret >= 4.5) color = "text-red-600";
                      return <td key={d} className={`py-1.5 px-1 text-center ${color}`}>{ret.toFixed(2)}°</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Green = minimal correction needed. Yellow = adjustable gears recommended. Orange/red = correction mandatory.
          </p>
        </CardContent>
      </Card>

      {/* CR change table */}
      <Card className="mt-8">
        <CardHeader><CardTitle className="text-base">Compression Ratio Change by Bore &amp; Milling Depth</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Bore</th>
                  {[0.005, 0.010, 0.015, 0.020, 0.025, 0.030].map(d => (
                    <th key={d} className="pb-2 px-1 text-center font-medium text-muted-foreground">{d}"</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '3.000" (76mm)', mm: 76.2 },
                  { label: '3.500" (89mm)', mm: 88.9 },
                  { label: '3.622" (92mm)', mm: 92.0 },
                  { label: '3.900" (99mm)', mm: 99.1 },
                  { label: '4.000" (102mm)', mm: 101.6 },
                  { label: '4.125" (105mm)', mm: 104.8 },
                ].map(b => (
                  <tr key={b.label} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 font-semibold font-sans text-xs">{b.label}</td>
                    {[0.005, 0.010, 0.015, 0.020, 0.025, 0.030].map(d => {
                      const vol = volumeRemoved(b.mm, inchToMm(d));
                      return <td key={d} className="py-1.5 px-1 text-center">{vol.toFixed(2)} cc</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Volume removed per cylinder. Subtract from chamber CCs, then recalculate CR.
          </p>
        </CardContent>
      </Card>

      {/* ── Max-mill values disclaimer ─────────────────────────────── */}
      <Card className="mt-4 border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">About the per-platform max-mill values</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            The per-engine max-mill values are <strong className="text-foreground">aftermarket / race-shop
            consensus</strong> (AERA, Cometic, DSPORT, builder forums) — not OEM factory service limits.
            OEM factory service manuals publish much tighter numbers (0.05-0.20 mm warpage / 0.10-0.20 mm
            grinding limit) because they're written for warranty service, not power-building.
          </p>
          <p>
            <strong className="text-foreground">Rule of thumb for OEM-conservative builds:</strong> use roughly
            1/3 of the displayed max-mill value. The Subaru FSM, for instance, allows 0.10 mm on EJ25 where
            the aftermarket consensus goes to 0.30 mm.
          </p>
          <p>
            <strong className="text-foreground">Gasket-thickness compensation:</strong> 1 mm thicker MLS head
            gasket recovers most of what milling adds to compression. Cometic stocks 0.018″-0.140″ MLS gaskets
            for most platforms — use the gasket to land on your target CR rather than maximizing mill depth.
          </p>
        </CardContent>
      </Card>

      <CalculatorContent data={headMillingContent} title="Head Milling" />
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" step={step} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
