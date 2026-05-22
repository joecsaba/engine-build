import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import torqueConverterStallContent from "@/data/calculatorContent/torque-converter-stall.mjs";

/* ─── Transmission Data ─── */
const TRANS_DATA: Record<string, { label: string; first: number; od: number | null }> = {
  "th350":  { label: "TH350", first: 2.52, od: null },
  "th400":  { label: "TH400", first: 2.48, od: null },
  "4l60e":  { label: "4L60E / 700R4", first: 3.06, od: 0.70 },
  "4l80e":  { label: "4L80E", first: 2.48, od: 0.75 },
  "aod":    { label: "AOD", first: 2.40, od: 0.67 },
  "c4":     { label: "C4", first: 2.46, od: null },
  "c6":     { label: "C6", first: 2.46, od: null },
  "e4od":   { label: "E4OD", first: 2.71, od: 0.71 },
  "4r70w":  { label: "4R70W", first: 2.84, od: 0.70 },
  "48re":   { label: "48RE (Dodge)", first: 2.45, od: 0.69 },
  "custom": { label: "Custom", first: 2.48, od: null },
};

/* ─── Cam Powerband Lookup ─── */
const CAM_POWERBAND: [number, number, string][] = [
  [204, 1500, "Stock / RV cam"],
  [214, 2000, "Mild street"],
  [224, 2800, "Street performance"],
  [236, 3500, "Street-strip"],
  [248, 4500, "Aggressive strip"],
  [260, 5500, "Full race"],
  [999, 6500, "Pro race"],
];

/* ─── Power Adder Options ─── */
const POWER_ADDER_OPTIONS: { value: string; label: string; adj: number }[] = [
  { value: "none", label: "None", adj: 0 },
  { value: "nitrous_low", label: "Nitrous \u2264150 shot", adj: -300 },
  { value: "nitrous_high", label: "Nitrous 150+ shot", adj: -600 },
  { value: "turbo_low", label: "Turbo <10 psi", adj: -300 },
  { value: "turbo_high", label: "Turbo 10+ psi", adj: -700 },
  { value: "sc_centrifugal", label: "Supercharger Centrifugal", adj: -300 },
  { value: "sc_pd", label: "Supercharger Positive Displacement", adj: -500 },
];

/* ─── Helpers ─── */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function fmt(val: number): string {
  return Math.round(val).toLocaleString();
}

/* ─── Component ─── */
export default function TorqueConverterStallCalculator() {
  // Engine & Cam
  const [peakHp, setPeakHp] = useState("350");
  const [rpmAtPeakHp, setRpmAtPeakHp] = useState("5500");
  const [peakTorque, setPeakTorque] = useState("380");
  const [rpmAtPeakTorque, setRpmAtPeakTorque] = useState("4000");
  const [camDuration, setCamDuration] = useState("220");
  const [lsa, setLsa] = useState("112");
  const [powerAdder, setPowerAdder] = useState("none");

  // Vehicle & Driveline
  const [vehicleWeight, setVehicleWeight] = useState("3400");
  const [tireDiameter, setTireDiameter] = useState("26");
  const [rearGear, setRearGear] = useState("3.73");
  const [transmission, setTransmission] = useState("th400");
  const [firstGearRatio, setFirstGearRatio] = useState("2.48");
  const [odRatio, setOdRatio] = useState("");
  const [transBrake, setTransBrake] = useState("no");
  const [primaryUse, setPrimaryUse] = useState("street-strip");

  // Converter Verification (collapsible)
  const [showVerification, setShowVerification] = useState(false);
  const [kFactor, setKFactor] = useState("");
  const [advertisedStall, setAdvertisedStall] = useState("");

  // Handle transmission change — auto-fill first gear and OD
  const handleTransChange = (val: string) => {
    setTransmission(val);
    const td = TRANS_DATA[val];
    if (td) {
      setFirstGearRatio(td.first.toFixed(2));
      setOdRatio(td.od !== null ? td.od.toFixed(2) : "");
    }
  };

  // Parse inputs
  const hp = parseFloat(peakHp) || 0;
  const hpRpm = parseFloat(rpmAtPeakHp) || 0;
  const tq = parseFloat(peakTorque) || 0;
  const tqRpm = parseFloat(rpmAtPeakTorque) || 0;
  const camDur = parseFloat(camDuration) || 0;
  const lsaVal = parseFloat(lsa) || 0;
  const weight = parseFloat(vehicleWeight) || 0;
  const tire = parseFloat(tireDiameter) || 0;
  const gear = parseFloat(rearGear) || 0;
  const firstGear = parseFloat(firstGearRatio) || 0;
  const od = parseFloat(odRatio) || 0;
  const kf = parseFloat(kFactor) || 0;
  const advStall = parseFloat(advertisedStall) || 0;

  const hasOd = od > 0 && od < 1;
  const paOption = POWER_ADDER_OPTIONS.find(o => o.value === powerAdder) || POWER_ADDER_OPTIONS[0];

  // ─── Step 1: Powerband from cam duration ───
  let powerbandStart = 2800;
  let camCharacter = "Street performance";
  for (const [threshold, rpm, desc] of CAM_POWERBAND) {
    if (camDur <= threshold) {
      powerbandStart = rpm;
      camCharacter = desc;
      break;
    }
  }

  // ─── Step 2: LSA adjustment ───
  let lsaAdj = 0;
  if (lsaVal <= 108) lsaAdj = 400;
  else if (lsaVal <= 110) lsaAdj = 200;
  else if (lsaVal <= 112) lsaAdj = 100;
  else if (lsaVal <= 114) lsaAdj = 0;
  else if (lsaVal <= 116) lsaAdj = -100;
  else lsaAdj = -200;

  // ─── Step 3: Power adder adjustment ───
  const paAdj = paOption.adj;

  // ─── Step 4: Weight adjustment ───
  let wtAdj = 0;
  if (weight < 2800) wtAdj = -200;
  else if (weight < 3400) wtAdj = 0;
  else if (weight < 4000) wtAdj = 200;
  else if (weight < 4500) wtAdj = 300;
  else wtAdj = 400;

  // ─── Step 5: Calculate recommendation ───
  let baseStall = powerbandStart + 500;
  let recommendedStall = baseStall + lsaAdj + paAdj + wtAdj;

  if (transBrake === "yes") {
    recommendedStall = Math.max(recommendedStall, tqRpm + 300);
  }

  recommendedStall = clamp(recommendedStall, 1800, 7000);
  const rangeLow = recommendedStall - 200;
  const rangeHigh = recommendedStall + 200;

  // ─── Step 6: Converter diameter ───
  let converterDiameter = "11-12 inch (stock)";
  if (recommendedStall >= 6000) converterDiameter = "7 inch";
  else if (recommendedStall >= 4000) converterDiameter = "8 inch";
  else if (recommendedStall >= 3000) converterDiameter = "9-10 inch";
  else if (recommendedStall >= 2500) converterDiameter = "10-11 inch";

  // ─── Step 7: K-Factor prediction ───
  const predictedStall = kf > 0 && tq > 0 ? kf * Math.sqrt(tq) : 0;

  // ─── Driveline calculations ───
  const launchSpeedMph = (firstGear > 0 && gear > 0 && tire > 0)
    ? (recommendedStall * tire) / (firstGear * gear * 336)
    : 0;

  const cruiseRpm60 = (hasOd && tire > 0) ? (60 * gear * od * 336) / tire : 0;
  const cruiseRpm70 = (hasOd && tire > 0) ? (70 * gear * od * 336) / tire : 0;

  const effectiveLaunchTorque = tq * 2.1 * firstGear * gear;

  // ─── Converter slip diagnostic ───
  let matchAssessment = "";
  let matchColor = "";
  if (advStall > 0) {
    if (advStall < rangeLow - 300) {
      matchAssessment = "Too low — engine will bog off the line. The converter locks up before the engine reaches its powerband.";
      matchColor = "text-red-400";
    } else if (advStall > rangeHigh + 500) {
      matchAssessment = "Too high — excessive slip and heat. The converter will generate excessive heat during normal driving and may shorten its life.";
      matchColor = "text-red-400";
    } else if (advStall >= rangeLow && advStall <= rangeHigh) {
      matchAssessment = "Good match — the advertised stall falls within the recommended range for your combination.";
      matchColor = "text-green-400";
    } else {
      matchAssessment = "Acceptable — not ideal but workable. The converter is close to the recommended range and should perform adequately.";
      matchColor = "text-yellow-400";
    }
  }

  // ─── Warnings ───
  const warnings: { msg: string; type: "warn" | "info" }[] = [];

  if (recommendedStall > tqRpm + 500) {
    warnings.push({
      msg: "Warning: Converter may slip past peak torque. The recommended stall speed exceeds peak torque RPM by more than 500 RPM, which means the engine will be past its torque peak when the converter locks up.",
      type: "warn",
    });
  }
  if (recommendedStall < powerbandStart) {
    warnings.push({
      msg: "Warning: Engine will bog at launch. The recommended stall speed is below the cam's effective powerband, meaning the engine won't be making meaningful power when the converter stalls.",
      type: "warn",
    });
  }
  if (cruiseRpm70 > 2800) {
    warnings.push({
      msg: `Note: Highway RPM will be elevated at ${fmt(cruiseRpm70)} RPM at 70 mph. Consider a deeper overdrive ratio or numerically lower rear gears for highway comfort.`,
      type: "info",
    });
  }
  if (!hasOd && primaryUse === "street") {
    warnings.push({
      msg: "Consider a transmission with overdrive for highway driving. A non-overdrive transmission combined with street use will result in high cruise RPM and poor fuel economy.",
      type: "info",
    });
  }

  const hasInputs = hp > 0 && tq > 0 && camDur > 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Torque Converter Stall Speed Calculator & Selection Guide"
        description="Calculate the ideal torque converter stall speed for your engine combo. Uses cam timing, LSA, vehicle weight, power adders, and driveline data to recommend stall speed and converter diameter."
        canonical="/calculators/torque-converter-stall"
        keywords="torque converter stall speed calculator, converter selection guide, stall speed recommendation, torque converter sizing, cam duration stall speed, converter diameter calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Torque Converter Stall Speed Calculator</h1>
      <p className="text-muted-foreground mb-6">
        Calculate the ideal stall speed and converter diameter for your engine, cam, and driveline combination. All results update live as you change inputs.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── INPUT COLUMN ─── */}
        <div className="space-y-4">
          {/* Engine & Cam */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Engine & Cam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Peak Horsepower</Label>
                  <Input type="number" step="10" value={peakHp} onChange={e => setPeakHp(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">RPM at Peak HP</Label>
                  <Input type="number" step="100" value={rpmAtPeakHp} onChange={e => setRpmAtPeakHp(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Peak Torque (lb-ft)</Label>
                  <Input type="number" step="10" value={peakTorque} onChange={e => setPeakTorque(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">RPM at Peak Torque</Label>
                  <Input type="number" step="100" value={rpmAtPeakTorque} onChange={e => setRpmAtPeakTorque(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cam Duration Intake @0.050"</Label>
                  <Input type="number" step="2" value={camDuration} onChange={e => setCamDuration(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Lobe Separation Angle</Label>
                  <Input type="number" step="1" value={lsa} onChange={e => setLsa(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Power Adder</Label>
                <Select value={powerAdder} onValueChange={setPowerAdder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POWER_ADDER_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle & Driveline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vehicle & Driveline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vehicle Weight (lbs w/ driver)</Label>
                  <Input type="number" step="100" value={vehicleWeight} onChange={e => setVehicleWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tire Diameter (inches)</Label>
                  <Input type="number" step="0.5" value={tireDiameter} onChange={e => setTireDiameter(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rear Gear Ratio</Label>
                  <Input type="number" step="0.01" value={rearGear} onChange={e => setRearGear(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Transmission</Label>
                  <Select value={transmission} onValueChange={handleTransChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRANS_DATA).map(([key, td]) => (
                        <SelectItem key={key} value={key}>{td.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">First Gear Ratio</Label>
                  <Input type="number" step="0.01" value={firstGearRatio} onChange={e => setFirstGearRatio(e.target.value)} />
                </div>
                {hasOd && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Overdrive Ratio</Label>
                    <Input type="number" step="0.01" value={odRatio} onChange={e => setOdRatio(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Trans Brake</Label>
                  <Select value={transBrake} onValueChange={setTransBrake}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Primary Use</Label>
                  <Select value={primaryUse} onValueChange={setPrimaryUse}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street</SelectItem>
                      <SelectItem value="street-strip">Street-Strip</SelectItem>
                      <SelectItem value="drag">Drag Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Converter Verification (collapsible) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                <button
                  onClick={() => setShowVerification(!showVerification)}
                  className="flex items-center gap-2 text-left w-full"
                >
                  <span className="text-xs">{showVerification ? "\u25BC" : "\u25B6"}</span>
                  Converter Verification (Optional)
                </button>
              </CardTitle>
            </CardHeader>
            {showVerification && (
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Converter K-Factor (if known)</Label>
                  <Input type="number" step="0.1" value={kFactor} onChange={e => setKFactor(e.target.value)} placeholder="e.g. 155" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Advertised Stall Speed (RPM)</Label>
                  <Input type="number" step="100" value={advertisedStall} onChange={e => setAdvertisedStall(e.target.value)} placeholder="e.g. 3000" />
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* ─── RESULTS COLUMN ─── */}
        <div className="space-y-4">
          {hasInputs && (
            <>
              {/* Primary Recommendation */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader>
                  <CardTitle>Recommended Converter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Recommended Stall Range</p>
                    <p className="text-4xl font-bold text-[#E85D04]">{fmt(rangeLow)} - {fmt(rangeHigh)} RPM</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400">Converter Diameter</p>
                      <p className="text-lg font-semibold">{converterDiameter}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400">Cam Character</p>
                      <p className="text-lg font-semibold">{camCharacter}</p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="p-3 rounded-lg bg-white/5 space-y-1">
                    <p className="text-xs text-gray-400 font-semibold mb-2">How the Recommendation Was Built</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Base (from cam):</span>
                      <span>{fmt(baseStall)} RPM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">LSA Adjustment:</span>
                      <span className={lsaAdj >= 0 ? "text-orange-400" : "text-green-400"}>
                        {lsaAdj >= 0 ? "+" : ""}{fmt(lsaAdj)} RPM
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Power Adder:</span>
                      <span className={paAdj >= 0 ? "text-orange-400" : "text-green-400"}>
                        {paAdj >= 0 ? "+" : ""}{fmt(paAdj)} RPM
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Weight:</span>
                      <span className={wtAdj >= 0 ? "text-orange-400" : "text-green-400"}>
                        {wtAdj >= 0 ? "+" : ""}{fmt(wtAdj)} RPM
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-1 mt-1">
                      <span>= Final:</span>
                      <span className="text-[#E85D04]">{fmt(recommendedStall)} RPM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Driveline Analysis */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader>
                  <CardTitle className="text-base">Driveline Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400">Launch Speed at Stall (1st Gear)</p>
                      <p className="text-lg font-semibold">{launchSpeedMph.toFixed(1)} mph</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400">Effective Launch Torque</p>
                      <p className="text-lg font-semibold">{fmt(effectiveLaunchTorque)} lb-ft</p>
                      <p className="text-xs text-gray-500">at wheels (through converter)</p>
                    </div>
                    {hasOd && (
                      <>
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-gray-400">Cruise RPM at 60 mph</p>
                          <p className={`text-lg font-semibold ${cruiseRpm60 > 2800 ? "text-yellow-400" : "text-green-400"}`}>
                            {fmt(cruiseRpm60)} RPM
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-gray-400">Cruise RPM at 70 mph</p>
                          <p className={`text-lg font-semibold ${cruiseRpm70 > 2800 ? "text-yellow-400" : "text-green-400"}`}>
                            {fmt(cruiseRpm70)} RPM
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* K-Factor Prediction */}
              {kf > 0 && predictedStall > 0 && (
                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader>
                    <CardTitle className="text-base">K-Factor Prediction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Predicted Actual Stall (K x sqrt of torque):</span>
                      <span className="font-semibold text-[#E85D04]">{fmt(predictedStall)} RPM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">vs Recommended ({fmt(rangeLow)}-{fmt(rangeHigh)}):</span>
                      <span className={`font-semibold ${
                        predictedStall >= rangeLow && predictedStall <= rangeHigh
                          ? "text-green-400"
                          : Math.abs(predictedStall - recommendedStall) < 500
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}>
                        {predictedStall >= rangeLow && predictedStall <= rangeHigh
                          ? "Good match"
                          : Math.abs(predictedStall - recommendedStall) < 500
                          ? "Close — acceptable"
                          : predictedStall < rangeLow
                          ? "Too low for your combo"
                          : "Too high for your combo"
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Advertised Stall Assessment */}
              {advStall > 0 && matchAssessment && (
                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader>
                    <CardTitle className="text-base">Advertised Stall Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Advertised Stall:</span>
                      <span className="font-semibold">{fmt(advStall)} RPM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Recommended Range:</span>
                      <span className="font-semibold">{fmt(rangeLow)} - {fmt(rangeHigh)} RPM</span>
                    </div>
                    <div className={`p-3 rounded-lg mt-2 text-sm ${
                      matchColor === "text-green-400" ? "bg-green-500/10 border border-green-500/30" :
                      matchColor === "text-yellow-400" ? "bg-yellow-500/10 border border-yellow-500/30" :
                      "bg-red-500/10 border border-red-500/30"
                    }`}>
                      <p className={matchColor}>{matchAssessment}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="space-y-2">
                  {warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-sm ${
                        w.type === "warn"
                          ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
                          : "bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {w.msg}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Reference Tables ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Converter Diameter vs Stall Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 font-semibold text-foreground">Diameter</th>
                    <th className="text-left py-2 px-2 font-semibold text-foreground">Stall Range</th>
                    <th className="text-left py-2 pl-2 font-semibold text-foreground">Application</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['12"', "1,800-2,200", "Stock / mild"],
                    ['11"', "2,500-3,000", "Street performance"],
                    ['10"', "2,500-4,000", "Street-strip"],
                    ['9"', "3,000-5,000", "Racing"],
                    ['8"', "4,000-7,000", "Bracket racing"],
                    ['7"', "6,000-9,000", "Drag only"],
                  ].map(([dia, range, app], i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-2 font-medium text-foreground">{dia}</td>
                      <td className="py-2 px-2">{range} RPM</td>
                      <td className="py-2 pl-2">{app}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cam Duration and Powerband Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 font-semibold text-foreground">Duration @0.050"</th>
                    <th className="text-left py-2 px-2 font-semibold text-foreground">Powerband Start</th>
                    <th className="text-left py-2 pl-2 font-semibold text-foreground">Character</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {CAM_POWERBAND.filter(([t]) => t < 999).map(([threshold, rpm, desc], i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-2 font-medium text-foreground">{"\u2264"}{threshold}\u00b0</td>
                      <td className="py-2 px-2">{rpm.toLocaleString()} RPM</td>
                      <td className="py-2 pl-2">{desc}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-2 font-medium text-foreground">{">"}260\u00b0</td>
                    <td className="py-2 px-2">6,500 RPM</td>
                    <td className="py-2 pl-2">Pro race</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Educational Content ─── */}
      <CalculatorContent data={torqueConverterStallContent} title="Torque Converter Stall" />
      {false && (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Torque Converter Stall Speed</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-sm font-semibold text-foreground mt-0">What Stall Speed Means</h3>
          <p>
            Stall speed is the RPM at which the torque converter stops multiplying torque and begins to couple the engine directly to the transmission. Below the stall speed, the converter acts as a fluid coupling that multiplies engine torque (typically by a factor of 1.8 to 2.5x). Above it, the converter locks up and spins at nearly the same speed as the engine. Think of it as the RPM threshold where the converter transitions from "slipping and multiplying" to "locked and transmitting." The goal is to match this transition point to the beginning of your engine's power band so the car launches with the engine already making good power.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Flash Stall vs Footbrake Stall</h3>
          <p>
            There are two ways to measure stall speed, and they give different numbers for the same converter. Footbrake stall is measured by holding the brake pedal and pressing the throttle to wide-open — the RPM where the engine stabilizes is the footbrake stall. Flash stall is the RPM the engine flashes to during a full-throttle launch or trans-brake release. Flash stall is always higher than footbrake stall, typically by 300-800 RPM. When converter manufacturers advertise a stall speed, they may be quoting either number. A converter advertised at "3,000 stall" might flash to 3,500 or higher. Always clarify which measurement the manufacturer is using, and remember that flash stall is what actually matters for launch performance.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Why Cam Timing is the #1 Factor</h3>
          <p>
            The camshaft determines where your engine makes power. A big cam that makes no power below 4,000 RPM needs a converter that stalls at 4,000+ so the engine is already in its powerband when you launch. A stock cam that makes good torque at 2,000 RPM works great with a mild 2,200 RPM converter. This is the single most important variable in converter selection. The most common mistake in street-strip builds is installing a big cam and then using a stock or mild converter — the engine bogs off the line because it's forced to launch at 1,800 RPM in a powerband that doesn't start until 3,500. Match the converter to the cam, not to the advertised horsepower number.
          </p>

          <h3 className="text-sm font-semibold text-foreground">How LSA Affects Converter Behavior</h3>
          <p>
            Lobe Separation Angle affects idle vacuum, low-RPM torque characteristics, and how the engine loads the converter. A tight LSA (106-110) produces a choppy idle, lower vacuum, and a peakier torque curve — the engine doesn't make smooth torque at low RPM, so it needs a higher-stall converter to get past the dead zone. A wide LSA (114-116) produces smoother idle vacuum and a broader torque curve, meaning the engine makes usable torque at lower RPM and can tolerate a lower-stall converter. This is why two cams with identical duration can need different converters — the one with the tighter LSA needs more stall to compensate for its peaky low-end behavior.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Power Adders Need Less Stall</h3>
          <p>
            Nitrous, turbos, and superchargers add torque that "flashes" the converter harder — the extra torque at any given RPM pushes the converter through its stall point faster. A naturally aspirated engine making 380 lb-ft might need a 3,200 RPM converter, but the same engine with a 150-shot of nitrous or 10 psi of boost could need only 2,500-2,800 RPM because the additional torque does the work of a higher-stall converter. Positive displacement superchargers (Roots, twin-screw) are the most dramatic because they make boost at idle RPM, providing instant torque multiplication. Centrifugal superchargers and turbos with lag need slightly more stall than a comparable positive displacement setup because their boost builds with RPM rather than being available immediately.
          </p>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
