import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";

function getOctaneRec(cr: number): { label: string; color: string; bg: string } {
  if (cr <= 9.5) return { label: "Regular 87 octane", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (cr <= 10.5) return { label: "Premium 91 octane", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (cr <= 12.5) return { label: "Premium 93 octane", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" };
  return { label: "Race fuel required (100+)", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function CompressionRatioCalculator() {
  const [bore, setBore] = useState("4.030");
  const [stroke, setStroke] = useState("3.480");
  const [gasketBore, setGasketBore] = useState("4.100");
  const [gasketThick, setGasketThick] = useState("0.051");
  const [deckHeight, setDeckHeight] = useState("0.010");
  const [pistonVolume, setPistonVolume] = useState("-5.0");
  const [chamberVolume, setChamberVolume] = useState("64");
  const [ivc, setIvc] = useState("60");
  const [atmPressure, setAtmPressure] = useState("14.7");

  const b = parseFloat(bore) || 0;
  const s = parseFloat(stroke) || 0;
  const gb = parseFloat(gasketBore) || 0;
  const gt = parseFloat(gasketThick) || 0;
  const dh = parseFloat(deckHeight) || 0;
  const pv = parseFloat(pistonVolume) || 0;
  const cv = parseFloat(chamberVolume) || 0;
  const ivcDeg = parseFloat(ivc) || 0;
  const atm = parseFloat(atmPressure) || 14.7;

  const cylinderVol = (b / 2) ** 2 * Math.PI * s * 16.387064;
  const gasketVol = (gb / 2) ** 2 * Math.PI * gt * 16.387064;
  const deckVol = (b / 2) ** 2 * Math.PI * dh * 16.387064;
  // Dish volume (negative) adds to clearance → lowers CR
  // Dome volume (positive) subtracts from clearance → raises CR
  const totalClearance = cv + gasketVol + deckVol - pv;
  const staticCR = totalClearance > 0 ? (cylinderVol + totalClearance) / totalClearance : 0;

  const ivcFactor = 1 - (Math.cos((ivcDeg * Math.PI) / 180) + 1) / 2;
  const effectiveStroke = s * (1 - ivcFactor * 0.5);
  const dynamicDisp = (b / 2) ** 2 * Math.PI * effectiveStroke * 16.387064;
  const dynamicCR = totalClearance > 0 ? (dynamicDisp + totalClearance) / totalClearance : 0;

  const octane = getOctaneRec(staticCR);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Compression Ratio Calculator"
        description="Calculate static and dynamic compression ratio for any engine. Includes octane recommendations, detonation risk zones, and side-by-side comparison. Free engine builder tool."
        canonical="/calculators/compression-ratio"
        keywords="compression ratio calculator, static compression ratio, dynamic compression ratio, octane calculator, engine detonation, engine builder"
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
              <Field label="Atmospheric Pressure (PSI)" value={atmPressure} onChange={setAtmPressure} step="0.1" />
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
