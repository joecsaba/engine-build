import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getOctaneRec(cr: number): { label: string; color: string; bg: string } {
  if (cr <= 9.5) return { label: "Regular 87 octane", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (cr <= 10.5) return { label: "Premium 91 octane", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (cr <= 12.5) return { label: "Premium 93 octane", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" };
  return { label: "Race fuel required (100+)", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function CompressionRatioCalculator() {
  const [bore, setBore] = useState("4.000");
  const [stroke, setStroke] = useState("3.480");
  const [gasketBore, setGasketBore] = useState("4.100");
  const [gasketThick, setGasketThick] = useState("0.041");
  const [deckHeight, setDeckHeight] = useState("0.000");
  const [pistonVolume, setPistonVolume] = useState("0");
  const [chamberVolume, setChamberVolume] = useState("64");
  const [ivc, setIvc] = useState("63");
  const [rodLength, setRodLength] = useState("5.700");

  const b = parseFloat(bore) || 0;
  const s = parseFloat(stroke) || 0;
  const gb = parseFloat(gasketBore) || 0;
  const gt = parseFloat(gasketThick) || 0;
  const dh = parseFloat(deckHeight) || 0;
  const pv = parseFloat(pistonVolume) || 0;
  const cv = parseFloat(chamberVolume) || 0;
  const ivcDeg = parseFloat(ivc) || 0;
  const rl = parseFloat(rodLength) || 0;

  const cylinderVol = (b / 2) ** 2 * Math.PI * s * 16.387064;
  const gasketVol = (gb / 2) ** 2 * Math.PI * gt * 16.387064;
  const deckVol = (b / 2) ** 2 * Math.PI * dh * 16.387064;
  const totalClearance = cv + gasketVol + deckVol - pv;
  const staticCR = totalClearance > 0 ? (cylinderVol + totalClearance) / totalClearance : 0;

  // Pat Kelley dynamic CR algorithm with rod length
  const ivcRad = (ivcDeg * Math.PI) / 180;
  const halfStroke = s / 2;
  const rd = halfStroke * Math.sin(ivcRad);
  const rr = halfStroke * Math.cos(ivcRad);
  const pr1 = rl > 0 ? Math.sqrt(rl * rl - rd * rd) : 0;
  const pr2 = pr1 - rr;
  const effectiveStroke = halfStroke + rl - pr2;
  const dynamicCR = s > 0 ? staticCR * Math.pow(effectiveStroke / s, 1.3) : 0;

  const octane = getOctaneRec(staticCR);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Compression Ratio Calculator"
        description="Calculate static and dynamic compression ratio with octane recommendations. Enter bore, stroke, chamber volume, and piston dish. Free engine builder tool."
        canonical="/calculators/compression-ratio"
        keywords="compression ratio calculator, static compression ratio, dynamic compression ratio, engine compression calculator, chamber volume calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Compression Ratio Calculator</h1>
      <p className="text-muted-foreground mb-8">Static and dynamic compression ratio with octane recommendations.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Engine Dimensions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Bore (inches)" value={bore} onChange={setBore} step="0.001" />
              <Field label="Stroke (inches)" value={stroke} onChange={setStroke} step="0.001" />
              <Field label="Head Chamber Volume (cc)" value={chamberVolume} onChange={setChamberVolume} step="0.1" />
              <Field label="Piston Dish/Dome Volume (cc — dome = positive, dish = negative)" value={pistonVolume} onChange={setPistonVolume} step="0.1" />
              <Field label="Gasket Bore (inches)" value={gasketBore} onChange={setGasketBore} step="0.001" />
              <Field label="Gasket Thickness (inches)" value={gasketThick} onChange={setGasketThick} step="0.001" />
              <Field label="Deck Height (inches, positive=piston below deck)" value={deckHeight} onChange={setDeckHeight} step="0.001" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dynamic CR Inputs</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Intake Valve Closing (degrees ABDC)" value={ivc} onChange={setIvc} step="1" />
              <Field label="Connecting Rod Length (inches)" value={rodLength} onChange={setRodLength} step="0.001" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Static Compression Ratio</p>
                <p className="text-5xl font-bold text-primary">{staticCR.toFixed(2)}:1</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Dynamic Compression Ratio</p>
                <p className="text-5xl font-bold text-white">{dynamicCR.toFixed(2)}:1</p>
              </div>
              <div className={`p-3 rounded-lg border ${octane.bg}`}>
                <p className="text-xs font-medium text-gray-600 mb-1">Recommended Fuel</p>
                <p className={`font-bold ${octane.color}`}>{octane.label}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Comparison</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Ratio</th>
                    <th className="text-right py-2">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Static CR</td>
                    <td className="text-right font-bold py-2">{staticCR.toFixed(2)}:1</td>
                    <td className="text-right py-2">—</td>
                  </tr>
                  <tr>
                    <td className="py-2">Dynamic CR</td>
                    <td className="text-right font-bold py-2">{dynamicCR.toFixed(2)}:1</td>
                    <td className="text-right text-muted-foreground py-2">{(dynamicCR - staticCR).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Why Dynamic CR Matters</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Dynamic compression ratio is the <em>actual</em> compression ratio after accounting for when the intake valve closes. Because the intake valve stays open past BDC, some mixture is pushed back out before compression begins.
              </p>
              <p>
                <strong>This is what causes detonation</strong> — not the static CR. A cam with late intake valve closing (high IVC) dramatically lowers effective compression, allowing a higher static ratio without knock. This is how performance engines run 11:1 static CR on pump gas.
              </p>
              <p>Ideal dynamic CR for pump gas: <strong>7.5–8.5:1</strong></p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Compression Ratio: What Engine Builders Need to Know</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Compression ratio is the relationship between the total cylinder volume at bottom dead center and the remaining clearance volume at top dead center. Static compression ratio is calculated from fixed dimensions — bore, stroke, head chamber volume, gasket thickness, piston dome or dish volume, and deck clearance. But it is the dynamic compression ratio that actually determines whether your engine will detonate on a given fuel, because it accounts for how late the intake valve closes and how much charge escapes before the cylinder is truly sealed.
          </p>
          <p>
            A stock small block Chevy 350 with 64cc chamber heads and flat-top pistons runs approximately 10.8:1 static compression — too high for 87-octane pump gas without a cam that closes the intake valve late enough to bleed off effective pressure. Swapping to 76cc Vortec heads drops that same engine to roughly 8.5:1 static, which is safe on regular fuel with almost any cam. Chamber volume has the single largest effect on compression ratio, followed by piston dish/dome volume and gasket thickness. A difference of just 0.010" in compressed gasket thickness can shift CR by 0.1 to 0.2 points.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Pump Gas Compression Limits</h3>
          <p>
            For 87-octane fuel, keep static CR below 9.5:1. For 91-octane premium, 10.5:1 is generally safe with a street cam. With 93-octane and a performance cam that closes the intake valve past 60 degrees ABDC, many builders safely run 11:1 or higher static CR because the dynamic CR stays in the 7.5-8.5:1 range. Always calculate dynamic CR before finalizing your head gasket and piston combination.
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
