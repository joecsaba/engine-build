import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ── Fuel limits ─────────────────────────────────────────────────── */

const FUEL_LIMITS: Record<string, { label: string; maxECR: number; octane: number }> = {
  "87":       { label: "Regular 87",   maxECR: 9.5,  octane: 87  },
  "89":       { label: "Mid-Grade 89", maxECR: 10.0, octane: 89  },
  "91":       { label: "Premium 91",   maxECR: 10.5, octane: 91  },
  "93":       { label: "Premium 93",   maxECR: 11.0, octane: 93  },
  "e85":      { label: "E85",          maxECR: 15.0, octane: 105 },
  "100":      { label: "Race 100",     maxECR: 13.0, octane: 100 },
  "110":      { label: "Race 110",     maxECR: 14.5, octane: 110 },
  "methanol": { label: "Methanol",     maxECR: 17.0, octane: 129 },
};

/* ── Safety assessment ───────────────────────────────────────────── */

function getSafety(ecr: number, maxECR: number): { label: string; color: string; bg: string } {
  if (ecr < maxECR * 0.85) return { label: "Safe zone",                             color: "text-green-700",  bg: "bg-green-50 border-green-200" };
  if (ecr < maxECR)        return { label: "Approaching limit",                     color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (ecr < maxECR * 1.1)  return { label: "At limit — careful tuning required",    color: "text-orange-700", bg: "bg-orange-50 border-orange-200" };
  return                           { label: "Exceeds safe limit — detonation risk",  color: "text-red-700",    bg: "bg-red-50 border-red-200" };
}

/* ── ECR quick-reference table data ──────────────────────────────── */

const REF_CRS = [7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0];
const REF_BOOSTS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

function ecrAt(scr: number, boostPsi: number): string {
  const patm = 14.696;
  return (scr * (1 + boostPsi / patm)).toFixed(1);
}

/* ── Altitude presets ────────────────────────────────────────────── */

const ALTITUDE_REFS = [
  { name: "Sea Level",     ft: 0 },
  { name: "Denver, CO",    ft: 5280 },
  { name: "Bonneville, UT", ft: 4215 },
  { name: "Mexico City",   ft: 7350 },
];

/* ── Component ───────────────────────────────────────────────────── */

export default function BoostCompressionCalculator() {
  const [staticCR, setStaticCR] = useState("9.0");
  const [boostInput, setBoostInput] = useState("10");
  const [boostUnit, setBoostUnit] = useState("psi");
  const [fuelType, setFuelType] = useState("93");
  const [altitude, setAltitude] = useState("0");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bore, setBore] = useState("4.000");
  const [stroke, setStroke] = useState("3.480");
  const [rodLength, setRodLength] = useState("5.700");
  const [ivc, setIvc] = useState("63");

  // Parse inputs
  const scr = parseFloat(staticCR) || 0;
  const boostRaw = parseFloat(boostInput) || 0;
  const alt = parseFloat(altitude) || 0;
  const fuel = FUEL_LIMITS[fuelType] ?? FUEL_LIMITS["93"];

  // Convert boost to PSI
  let boostPsi = boostRaw;
  if (boostUnit === "bar") boostPsi = boostRaw * 14.5038;
  else if (boostUnit === "kpa") boostPsi = boostRaw / 6.89476;

  // Altitude-corrected atmospheric pressure
  const pAtm = 14.696 * Math.pow(1 - 0.0000068753 * alt, 5.2559);

  // Main calculations
  const ecr = scr * (1 + boostPsi / pAtm);
  const map = boostPsi + pAtm;
  const pressureRatio = pAtm > 0 ? map / pAtm : 0;
  const maxSafeBoost = pAtm > 0 ? ((fuel.maxECR / scr) - 1) * pAtm : 0;
  const maxSafeCR = boostPsi >= 0 && pAtm > 0 ? fuel.maxECR / (1 + boostPsi / pAtm) : 0;

  // Dynamic CR (advanced)
  const s = parseFloat(stroke) || 0;
  const rl = parseFloat(rodLength) || 0;
  const ivcDeg = parseFloat(ivc) || 0;
  const b = parseFloat(bore) || 0;

  const ivcRad = (ivcDeg * Math.PI) / 180;
  const halfStroke = s / 2;
  const rd = halfStroke * Math.sin(ivcRad);
  const rr = halfStroke * Math.cos(ivcRad);
  const pr1 = rl > 0 ? Math.sqrt(rl * rl - rd * rd) : 0;
  const pr2 = pr1 - rr;
  const effectiveStroke = halfStroke + rl - pr2;
  const dcr = s > 0 ? scr * Math.pow(effectiveStroke / s, 1.3) : 0;
  const bdcr = dcr * (1 + boostPsi / pAtm);

  const safety = getSafety(ecr, fuel.maxECR);
  const hasBoost = boostPsi > 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Boost / Effective Compression Ratio Calculator"
        description="Calculate effective compression ratio under boost. Enter static CR, boost pressure, fuel type, and altitude. Includes dynamic CR, safety limits, and max boost reverse-solve. Free engine builder tool."
        canonical="/calculators/boost-compression"
        keywords="effective compression ratio calculator, boost compression ratio, ECR calculator, turbo compression ratio, supercharger compression, boost detonation calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Boost / Effective Compression Ratio Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate how boost affects your effective compression ratio, with safety limits by fuel type and altitude correction.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Inputs ──────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Engine &amp; Boost</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Static Compression Ratio" value={staticCR} onChange={setStaticCR} step="0.1" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Boost Pressure</Label>
                  <Input type="number" step="0.5" value={boostInput} onChange={e => setBoostInput(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Select value={boostUnit} onValueChange={setBoostUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="psi">PSI</SelectItem>
                      <SelectItem value="bar">BAR</SelectItem>
                      <SelectItem value="kpa">kPa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fuel Type</Label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FUEL_LIMITS).map(([key, f]) => (
                      <SelectItem key={key} value={key}>{f.label} ({f.octane} octane)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Field label="Altitude (feet)" value={altitude} onChange={setAltitude} step="100" />
              <div className="flex flex-wrap gap-2 mt-1">
                {ALTITUDE_REFS.map(a => (
                  <button
                    key={a.name}
                    className="text-xs px-2 py-1 rounded border bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    onClick={() => setAltitude(String(a.ft))}
                  >
                    {a.name} ({a.ft.toLocaleString()} ft)
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Advanced — Dynamic CR</CardTitle>
                <button
                  className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${showAdvanced ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide" : "Show"}
                </button>
              </div>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-3">
                <Field label="Bore (inches)" value={bore} onChange={setBore} step="0.001" />
                <Field label="Stroke (inches)" value={stroke} onChange={setStroke} step="0.001" />
                <Field label="Connecting Rod Length (inches)" value={rodLength} onChange={setRodLength} step="0.001" />
                <Field label="Intake Valve Closing (degrees ABDC)" value={ivc} onChange={setIvc} step="1" />
              </CardContent>
            )}
          </Card>
        </div>

        {/* ── Right: Results ────────────────────────────────────── */}
        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Primary: ECR */}
              <div>
                <p className="text-gray-400 text-sm">Effective Compression Ratio</p>
                <p className="text-5xl font-bold text-primary">{ecr.toFixed(2)}:1</p>
              </div>

              {/* Safety badge */}
              <div className={`p-3 rounded-lg border ${safety.bg}`}>
                <p className="text-xs font-medium text-gray-600 mb-1">{fuel.label} — Safety Assessment</p>
                <p className={`font-bold ${safety.color}`}>{safety.label}</p>
                <p className="text-xs text-gray-500 mt-1">Max safe ECR for {fuel.label}: {fuel.maxECR.toFixed(1)}:1</p>
              </div>

              {/* Secondary outputs */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Manifold Pressure (MAP)</p>
                  <p className="font-mono font-semibold text-white">{map.toFixed(1)} PSI</p>
                  <p className="font-mono text-xs text-gray-400">{(map * 6.89476).toFixed(1)} kPa</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Pressure Ratio</p>
                  <p className="font-mono font-semibold text-white">{pressureRatio.toFixed(2)}:1</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Max Safe Boost ({fuel.label})</p>
                  <p className="font-mono font-semibold text-amber-400">{maxSafeBoost > 0 ? maxSafeBoost.toFixed(1) : "—"} PSI</p>
                  <p className="font-mono text-xs text-gray-400">{maxSafeBoost > 0 ? (maxSafeBoost / 14.5038).toFixed(2) : "—"} BAR</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Max Safe Static CR</p>
                  <p className="font-mono font-semibold text-amber-400">{hasBoost && maxSafeCR > 0 ? maxSafeCR.toFixed(1) : "—"}:1</p>
                  <p className="font-mono text-xs text-gray-400">at {boostPsi.toFixed(1)} PSI boost</p>
                </div>
              </div>

              {/* Atmospheric pressure at altitude */}
              {alt > 0 && (
                <div className="pt-3 border-t border-gray-700">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Atmospheric Pressure at {Number(alt).toLocaleString()} ft</p>
                  <p className="font-mono font-semibold text-gray-300">{pAtm.toFixed(2)} PSI <span className="text-xs text-gray-500">(sea level = 14.696)</span></p>
                </div>
              )}

              {/* Dynamic CR (advanced only) */}
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Dynamic CR</p>
                    <p className="font-mono font-semibold text-white">{dcr.toFixed(2)}:1</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Boosted Dynamic CR</p>
                    <p className="font-mono font-semibold text-primary">{bdcr.toFixed(2)}:1</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Altitude reference */}
          <Card>
            <CardHeader><CardTitle>Altitude Reference</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Location</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">Altitude</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">Atm. Pressure</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {ALTITUDE_REFS.map(a => {
                    const p = 14.696 * Math.pow(1 - 0.0000068753 * a.ft, 5.2559);
                    return (
                      <tr key={a.name} className="border-b last:border-0">
                        <td className="py-1.5 font-sans">{a.name}</td>
                        <td className="py-1.5 text-right">{a.ft.toLocaleString()} ft</td>
                        <td className="py-1.5 text-right">{p.toFixed(2)} PSI</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── ECR Quick-Reference Table ─────────────────────────────── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">ECR Quick-Reference Table (Sea Level)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-2 text-left font-medium text-muted-foreground uppercase tracking-wider">SCR \ Boost</th>
                  {REF_BOOSTS.map(b => (
                    <th key={b} className="pb-2 px-1 text-center font-medium text-muted-foreground">{b} PSI</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REF_CRS.map(cr => (
                  <tr key={cr} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 font-semibold">{cr.toFixed(1)}:1</td>
                    {REF_BOOSTS.map(bp => {
                      const val = parseFloat(ecrAt(cr, bp));
                      let cellColor = "text-green-600";
                      if (val >= 11.0) cellColor = "text-yellow-600";
                      if (val >= 13.0) cellColor = "text-orange-600";
                      if (val >= 15.0) cellColor = "text-red-600";
                      return (
                        <td key={bp} className={`py-1.5 px-1 text-center ${cellColor}`}>{ecrAt(cr, bp)}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Values assume sea-level atmospheric pressure (14.696 PSI). At higher altitudes, ECR is higher for the same boost reading because ambient pressure is lower.
          </p>
        </CardContent>
      </Card>

      {/* ── Educational Content ───────────────────────────────────── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Boost and Effective Compression: What Engine Builders Need to Know</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Effective compression ratio (ECR) is the actual compression ratio your engine sees under boost. A naturally aspirated engine with a 9:1 static compression ratio compresses the air-fuel mixture by a factor of 9. But when a turbo or supercharger forces additional air into the cylinder above atmospheric pressure, the charge is already pre-compressed before the piston even starts its compression stroke. The result is an effective compression ratio significantly higher than the static number stamped on the piston box.
          </p>
          <p>
            The relationship is straightforward: ECR equals the static compression ratio multiplied by the ratio of total manifold pressure (boost plus atmosphere) divided by atmospheric pressure. At sea level with 10 PSI of boost and a 9:1 static CR, your engine sees an effective 15.1:1 compression ratio. That is well above what 93-octane pump gas can handle without detonation, which is why most turbocharged street engines run lower static compression ratios in the 8.0-8.5:1 range.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Why Dynamic CR Matters More Than Static CR</h3>
          <p>
            Static compression ratio is measured from bottom dead center to top dead center, but the intake valve does not close at BDC. On most performance cams, the intake valve closes 50-70 degrees after bottom dead center. Until that valve closes, the cylinder is not sealed and some of the charge escapes. The dynamic compression ratio accounts for this by calculating the effective stroke — the piston travel after the intake valve actually closes. This is a much better predictor of detonation than static CR, especially with aggressive cam profiles that close the intake valve very late.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Altitude Effects</h3>
          <p>
            Atmospheric pressure drops at higher altitudes. A boost gauge reads pressure above ambient, so 10 PSI of boost in Denver (where ambient is about 12.1 PSI) produces less total manifold pressure than 10 PSI in Miami (14.7 PSI ambient). However, the effective compression ratio is actually <em>higher</em> at altitude for the same gauge boost, because the denominator in the ECR formula — atmospheric pressure — is smaller. Builders at altitude should account for this when selecting a compression ratio and boost target.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Rule of Thumb</h3>
          <p>
            On 93-octane pump gas with a modern EFI system and good intercooling, keep your effective compression ratio under 12.5:1 for a reliable street engine. E85 provides a massive safety margin — its high octane rating and charge cooling effect allow effective compression ratios up to 15:1 in well-tuned setups. If you are running pump gas and want more boost, lower your static compression ratio. If you want to keep your high-compression pistons, switch to a higher-octane fuel.
          </p>
        </CardContent>
      </Card>
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
