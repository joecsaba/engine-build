import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function hpLossColor(loss: number): string {
  if (loss < 3) return "text-green-400";
  if (loss < 6) return "text-yellow-400";
  if (loss < 10) return "text-orange-400";
  return "text-red-400";
}

function hpLossLabel(loss: number): string {
  if (loss < 3) return "Minimal loss";
  if (loss < 6) return "Moderate loss";
  if (loss < 10) return "Significant loss";
  return "Severe loss";
}

export default function DensityAltitudeCalculator() {
  const [temperature, setTemperature] = useState("85");
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F");
  const [pressure, setPressure] = useState("29.92");
  const [pressureUnit, setPressureUnit] = useState<"inHg" | "mb">("inHg");
  const [elevation, setElevation] = useState("0");
  const [humidityMethod, setHumidityMethod] = useState<"rh" | "dewpoint">("rh");
  const [humidityValue, setHumidityValue] = useState("50");
  const [observedHP, setObservedHP] = useState("");
  const [observedTQ, setObservedTQ] = useState("");

  // Parse inputs
  const tempNum = parseFloat(temperature);
  const pressNum = parseFloat(pressure);
  const elevNum = parseFloat(elevation);
  const humNum = parseFloat(humidityValue);
  const obsHP = parseFloat(observedHP);
  const obsTQ = parseFloat(observedTQ);

  const hasInputs = !isNaN(tempNum) && !isNaN(pressNum) && !isNaN(elevNum) && !isNaN(humNum);
  const hasHP = observedHP.trim() !== "" && !isNaN(obsHP);
  const hasTQ = observedTQ.trim() !== "" && !isNaN(obsTQ);

  // Convert to SI
  const T_C = tempUnit === "F" ? (tempNum - 32) * 5 / 9 : tempNum;
  const T_F = tempUnit === "F" ? tempNum : tempNum * 9 / 5 + 32;
  const T_K = T_C + 273.15;
  const AS_mb = pressureUnit === "inHg" ? pressNum * 33.8639 : pressNum;
  const elev_m = elevNum * 0.3048;

  // Station Pressure from Altimeter Setting
  const Pa_mb = Math.pow(
    Math.pow(AS_mb, 0.190263) - 8.417286e-5 * elev_m,
    1 / 0.190263
  );

  // Saturation Vapor Pressure (Arden Buck)
  const Ps = 6.1121 * Math.exp((18.678 - T_C / 234.5) * T_C / (257.14 + T_C));

  // Actual Vapor Pressure
  let Pv: number;
  if (humidityMethod === "rh") {
    Pv = (humNum / 100) * Ps;
  } else {
    const Td_C = tempUnit === "F" ? (humNum - 32) * 5 / 9 : humNum;
    Pv = 6.1121 * Math.exp((18.678 - Td_C / 234.5) * Td_C / (257.14 + Td_C));
  }

  // Dry Air Pressure
  const Pd = Pa_mb - Pv;

  // Air Density (moist air)
  const Rd = 287.05;
  const Rv = 461.495;
  const Pa_Pa = Pa_mb * 100;
  const Pv_Pa = Pv * 100;
  const Pd_Pa = Pa_Pa - Pv_Pa;
  const D = (Pd_Pa / (Rd * T_K)) + (Pv_Pa / (Rv * T_K));

  // Density Altitude
  const DA_km = 44.33 * (1 - Math.pow(D / 1.2250, 0.190263));
  const DA_ft = DA_km * 3280.84;

  // SAE J1349 Correction Factor
  const Ca = (990 / Pd) * Math.sqrt(T_K / 298.15);
  const CF_J1349 = 1.18 * Ca - 0.18;

  // SAE J607 Correction Factor
  const P_inHg_station = Pa_mb / 33.8639;
  const CF_J607 = Math.pow(29.92 / P_inHg_station, 1.2) * Math.pow((T_F + 460) / 520, 0.6);

  // DIN 70020 Correction Factor
  const CF_DIN = (1013 / Pa_mb) * Math.sqrt(T_K / 293.15);

  // Relative Horsepower
  const RelHP_pct = (1 / CF_J1349) * 100;
  const HP_loss_pct = 100 - RelHP_pct;

  // Corrected HP/Torque
  const corrHP_J1349 = hasHP ? obsHP * CF_J1349 : 0;
  const corrHP_J607 = hasHP ? obsHP * CF_J607 : 0;
  const corrHP_DIN = hasHP ? obsHP * CF_DIN : 0;
  const corrTQ_J1349 = hasTQ ? obsTQ * CF_J1349 : 0;
  const corrTQ_J607 = hasTQ ? obsTQ * CF_J607 : 0;
  const corrTQ_DIN = hasTQ ? obsTQ * CF_DIN : 0;

  // Relative Air Density
  const RelDensity_pct = (D / 1.2250) * 100;

  // O2 Partial Pressure
  const PO2 = 0.2095 * (Pa_mb - Pv);

  // Unit conversions for display
  const D_lbft3 = D * 0.062428;
  const stationInHg = Pa_mb / 33.8639;
  const vaporInHg = Pv / 33.8639;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Density Altitude & HP Correction Calculator"
        description="Calculate density altitude, air density, and horsepower correction factors (SAE J1349, J607, DIN 70020). Essential for dyno tuning, drag racing, and track day performance prediction."
        canonical="/calculators/density-altitude"
        keywords="density altitude calculator, horsepower correction factor, SAE J1349, SAE J607, DIN 70020, dyno correction, air density, drag racing weather"
      />
      <h1 className="text-3xl font-bold mb-2">Density Altitude & HP Correction Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Calculate density altitude, air density, and corrected horsepower using SAE J1349, J607, and DIN 70020 standards
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Inputs */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Weather Conditions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Temperature */}
              <div className="space-y-1">
                <Label>Temperature</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="85"
                    value={temperature}
                    onChange={e => setTemperature(e.target.value)}
                    className="font-mono flex-1"
                  />
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      className={`px-3 py-2 text-sm font-medium transition-colors ${tempUnit === "F" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      onClick={() => setTempUnit("F")}
                    >
                      °F
                    </button>
                    <button
                      className={`px-3 py-2 text-sm font-medium transition-colors ${tempUnit === "C" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      onClick={() => setTempUnit("C")}
                    >
                      °C
                    </button>
                  </div>
                </div>
              </div>

              {/* Barometric Pressure */}
              <div className="space-y-1">
                <Label>Barometric Pressure (Altimeter Setting)</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="29.92"
                    value={pressure}
                    onChange={e => setPressure(e.target.value)}
                    className="font-mono flex-1"
                  />
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      className={`px-3 py-2 text-sm font-medium transition-colors ${pressureUnit === "inHg" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      onClick={() => setPressureUnit("inHg")}
                    >
                      inHg
                    </button>
                    <button
                      className={`px-3 py-2 text-sm font-medium transition-colors ${pressureUnit === "mb" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      onClick={() => setPressureUnit("mb")}
                    >
                      mb
                    </button>
                  </div>
                </div>
              </div>

              {/* Elevation */}
              <div className="space-y-1">
                <Label>Elevation (ft)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={elevation}
                  onChange={e => setElevation(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Needed to convert altimeter setting to station pressure</p>
              </div>

              {/* Humidity Method */}
              <div className="space-y-1">
                <Label>Humidity Input Method</Label>
                <Select value={humidityMethod} onValueChange={(v) => setHumidityMethod(v as "rh" | "dewpoint")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rh">Relative Humidity (%)</SelectItem>
                    <SelectItem value="dewpoint">Dew Point Temperature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Humidity Value */}
              <div className="space-y-1">
                <Label>{humidityMethod === "rh" ? "Relative Humidity (%)" : `Dew Point Temperature (°${tempUnit})`}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={humidityMethod === "rh" ? "50" : "65"}
                  value={humidityValue}
                  onChange={e => setHumidityValue(e.target.value)}
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Observed Power */}
          <Card>
            <CardHeader><CardTitle>Observed Power (Optional)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Observed HP</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 450"
                    value={observedHP}
                    onChange={e => setObservedHP(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Observed Torque (lb-ft)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 420"
                    value={observedTQ}
                    onChange={e => setObservedTQ(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Enter dyno readings to see corrected values across all three standards</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
              {hasInputs ? (
                <div className="space-y-6">
                  {/* Primary outputs */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Density Altitude</p>
                    <p className="text-5xl font-bold font-mono text-primary tracking-wide">
                      {DA_ft.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Relative HP</p>
                      <p className="text-2xl font-bold font-mono text-amber-400">
                        {RelHP_pct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">of rated power</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">HP Loss</p>
                      <p className={`text-2xl font-bold font-mono ${hpLossColor(HP_loss_pct)}`}>
                        {HP_loss_pct > 0 ? "-" : "+"}{Math.abs(HP_loss_pct).toFixed(1)}%
                      </p>
                      <p className={`text-xs ${hpLossColor(HP_loss_pct)}`}>{hpLossLabel(HP_loss_pct)}</p>
                    </div>
                  </div>

                  {/* Secondary outputs */}
                  <div className="pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Air Density</p>
                      <p className="font-mono font-semibold">{D.toFixed(4)} kg/m³</p>
                      <p className="font-mono text-sm text-gray-400">{D_lbft3.toFixed(4)} lb/ft³</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Relative Air Density</p>
                      <p className="font-mono font-semibold">{RelDensity_pct.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">vs. std 1.225 kg/m³</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Station Pressure</p>
                      <p className="font-mono font-semibold">{stationInHg.toFixed(2)} inHg</p>
                      <p className="font-mono text-sm text-gray-400">{Pa_mb.toFixed(1)} mb</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Vapor Pressure</p>
                      <p className="font-mono font-semibold">{vaporInHg.toFixed(3)} inHg</p>
                      <p className="font-mono text-sm text-gray-400">{Pv.toFixed(2)} mb</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">O₂ Partial Pressure</p>
                      <p className="font-mono font-semibold">{PO2.toFixed(1)} mb</p>
                    </div>
                  </div>

                  {/* Correction Factors */}
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Correction Factors</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400">SAE J1349</p>
                        <p className="font-mono font-bold text-lg text-primary">{CF_J1349.toFixed(4)}</p>
                        <p className="text-[10px] text-gray-500">Current US std</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400">SAE J607</p>
                        <p className="font-mono font-bold text-lg text-amber-400">{CF_J607.toFixed(4)}</p>
                        <p className="text-[10px] text-gray-500">Older "STD"</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400">DIN 70020</p>
                        <p className="font-mono font-bold text-lg text-blue-400">{CF_DIN.toFixed(4)}</p>
                        <p className="text-[10px] text-gray-500">European</p>
                      </div>
                    </div>
                  </div>

                  {/* Corrected HP/TQ */}
                  {(hasHP || hasTQ) && (
                    <div className="pt-4 border-t border-gray-700">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Corrected Power</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700 text-left">
                              <th className="pb-2 font-medium text-gray-400 text-xs">Standard</th>
                              {hasHP && <th className="pb-2 font-medium text-gray-400 text-xs">Corrected HP</th>}
                              {hasTQ && <th className="pb-2 font-medium text-gray-400 text-xs">Corrected TQ</th>}
                            </tr>
                          </thead>
                          <tbody className="font-mono">
                            <tr className="border-b border-gray-800">
                              <td className="py-2 text-primary font-semibold">J1349</td>
                              {hasHP && <td className="py-2">{corrHP_J1349.toFixed(1)} hp</td>}
                              {hasTQ && <td className="py-2">{corrTQ_J1349.toFixed(1)} lb-ft</td>}
                            </tr>
                            <tr className="border-b border-gray-800">
                              <td className="py-2 text-amber-400 font-semibold">J607</td>
                              {hasHP && <td className="py-2">{corrHP_J607.toFixed(1)} hp</td>}
                              {hasTQ && <td className="py-2">{corrTQ_J607.toFixed(1)} lb-ft</td>}
                            </tr>
                            <tr>
                              <td className="py-2 text-blue-400 font-semibold">DIN</td>
                              {hasHP && <td className="py-2">{corrHP_DIN.toFixed(1)} hp</td>}
                              {hasTQ && <td className="py-2">{corrTQ_DIN.toFixed(1)} lb-ft</td>}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Enter weather conditions to calculate</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reference Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <Card>
          <CardHeader><CardTitle>Correction Standards Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Standard</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ref Temp</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ref Pressure</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Humidity</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-3 font-semibold">SAE J1349</td>
                    <td className="py-2 pr-3 font-mono">77°F</td>
                    <td className="py-2 pr-3 font-mono">29.235 inHg</td>
                    <td className="py-2 pr-3">Corrected</td>
                    <td className="py-2 text-muted-foreground text-xs">Current US standard</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-3 font-semibold">SAE J607</td>
                    <td className="py-2 pr-3 font-mono">60°F</td>
                    <td className="py-2 pr-3 font-mono">29.92 inHg</td>
                    <td className="py-2 pr-3">Ignored</td>
                    <td className="py-2 text-muted-foreground text-xs">Older "STD" dyno standard</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold">DIN 70020</td>
                    <td className="py-2 pr-3 font-mono">68°F</td>
                    <td className="py-2 pr-3 font-mono">29.92 inHg</td>
                    <td className="py-2 pr-3">Ignored</td>
                    <td className="py-2 text-muted-foreground text-xs">European standard</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Impact Reference</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Condition</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">HP Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-3">+10°F temperature</td>
                    <td className="py-2 font-mono text-yellow-600">~-3% HP</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-3">+1,000 ft altitude</td>
                    <td className="py-2 font-mono text-yellow-600">~-3% HP</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-3">100% humidity (hot day)</td>
                    <td className="py-2 font-mono text-yellow-600">~-1% HP</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">Denver, CO (5,280 ft, 90°F)</td>
                    <td className="py-2 font-mono text-red-500">~-20% HP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Educational Content */}
      <div className="mt-12 space-y-8">
        <Card>
          <CardHeader><CardTitle>What Is Density Altitude?</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Density altitude is the altitude at which the current air density would be found in the International Standard
              Atmosphere (ISA). It combines the effects of temperature, pressure, and humidity into a single number that
              directly correlates with engine performance. An engine at sea level on a hot, humid day may perform as if it
              were at 3,000 ft or higher.
            </p>
            <p>
              For naturally aspirated engines, power output is directly proportional to air density. Every molecule of oxygen
              that enters the cylinder contributes to combustion. When density altitude increases, fewer oxygen molecules are
              available per intake stroke, resulting in less fuel burned and less power produced. Forced-induction engines are
              affected too, though the turbo or supercharger can partially compensate by increasing manifold pressure.
            </p>
            <p>
              Density altitude matters at the drag strip (ET prediction), on the dyno (comparing pulls on different days),
              and for engine tuning (richer mixtures may be needed on dense days, leaner on thin-air days). Tracking density
              altitude is the single most useful weather metric for any racer or tuner.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dew Point vs. Relative Humidity</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Relative humidity is the most common humidity measurement, but it has a major limitation: it changes with
              temperature. A reading of 50% RH at 80°F represents far more moisture than 50% RH at 60°F. This makes it
              unreliable for comparing conditions across different parts of a race day as temperatures change.
            </p>
            <p>
              Dew point temperature is an absolute measure of moisture in the air. A dew point of 65°F means the same
              amount of water vapor regardless of the current air temperature. For trackside use, dew point is the more
              accurate and consistent input. Many professional racing weather stations report dew point directly. If you
              have a choice, always use dew point for the most accurate correction factor.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>SAE J1349 vs. J607: Why the Numbers Differ</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              SAE J607 was the original US correction standard, referencing 60°F and 29.92 inHg (sea level standard day).
              It uses a simple pressure-temperature formula and ignores humidity entirely. Because its reference conditions
              are cooler and at a higher pressure than typical dyno conditions, J607 tends to produce corrected numbers that
              are approximately 4% higher than J1349 for the same observed reading. This is not a measurement error -- it
              is simply a different reference point.
            </p>
            <p>
              SAE J1349 (current standard since 2004 revision) references 77°F and 990 mb (29.235 inHg), and it accounts
              for water vapor pressure. This makes it more physically accurate and produces more conservative (lower) corrected
              numbers. When comparing dyno sheets, always check which standard was used. A "500 hp" pull on J607 is roughly
              equivalent to a "480 hp" pull on J1349.
            </p>
            <p>
              DIN 70020 is the European equivalent, referencing 20°C (68°F) and 1013 mb. It typically produces numbers between
              J1349 and J607. European manufacturers commonly rate their engines to DIN.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Practical Applications</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Dyno comparisons:</strong> Record weather conditions for every dyno pull. Use this calculator to
              normalize all runs to the same standard. A 5 hp gain between pulls means nothing if density altitude dropped
              by 1,000 ft between sessions.
            </p>
            <p>
              <strong>Drag strip ET prediction:</strong> Track your car's performance alongside density altitude. Most
              consistent bracket racers keep a log of DA vs. ET. A 100 ft change in density altitude typically shifts ET
              by about 0.01 seconds in the quarter mile for a 10-second car.
            </p>
            <p>
              <strong>Jetting and tuning:</strong> Carbureted engines need richer jetting on low-DA days (dense air) and
              leaner jetting on high-DA days. EFI cars with wideband feedback will self-adjust, but the target AFR and
              timing map may still benefit from DA-aware calibration for maximum power.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
