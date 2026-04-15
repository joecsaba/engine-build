import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";

const refEngines = [
  { name: "Stock SBC 350 (5500 RPM redline)", stroke: 3.48, rpm: 5500, meanFpm: 3190 },
  { name: "LS1 5.7L (6500 RPM redline)", stroke: 3.622, rpm: 6500, meanFpm: 3924 },
  { name: "LS7 7.0L (7100 RPM redline)", stroke: 4.000, rpm: 7100, meanFpm: 4733 },
  { name: "Ford 302 Windsor (6500 RPM)", stroke: 3.000, rpm: 6500, meanFpm: 3250 },
  { name: "Honda K20A (8000 RPM)", stroke: 3.386, rpm: 8000, meanFpm: 4515 },
  { name: "Toyota 2JZ-GTE (7000 RPM)", stroke: 3.386, rpm: 7000, meanFpm: 3951 },
  { name: "Drag race SBC (8500+ RPM)", stroke: 3.250, rpm: 8500, meanFpm: 4604 },
  { name: "NASCAR Cup V8 (~9000 RPM)", stroke: 3.480, rpm: 9000, meanFpm: 5220 },
];

function getSpeedZone(fpm: number): { label: string; color: string; bg: string } {
  if (fpm < 2500) return { label: "Conservative — well within limits", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
  if (fpm < 3500) return { label: "Normal street use — safe", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (fpm < 4500) return { label: "Caution — Performance territory, quality parts needed", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "Extreme — Race use only, premium components required", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function PistonSpeedCalculator() {
  const [stroke, setStroke] = useState("3.622");
  const [rpm, setRpm] = useState("6500");

  const s = parseFloat(stroke) || 0;
  const r = parseFloat(rpm) || 0;

  const meanFpm = (2 * s * r) / 12;
  const peakFpm = meanFpm * (Math.PI / 2);

  const zone = getSpeedZone(meanFpm);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <SEOHead
        title="Piston Speed Calculator"
        description="Calculate mean and peak piston speed in feet per minute. Color-coded safety zones for street and race applications. Reference table of common engine redlines."
        canonical="/calculators/piston-speed"
        keywords="piston speed calculator, mean piston speed, peak piston speed, feet per minute, engine RPM limit, safe piston speed"
      />
      <h1 className="text-3xl font-bold mb-2">Piston Speed Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate mean and peak piston speed in feet per minute. Color-coded safety zones for street and race applications.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Stroke (inches)</Label>
              <Input type="number" step="0.001" value={stroke} onChange={e => setStroke(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>RPM</Label>
              <Input type="number" step="100" value={rpm} onChange={e => setRpm(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Mean Piston Speed</p>
                <p className="text-5xl font-bold text-primary">{meanFpm.toFixed(0)}</p>
                <p className="text-gray-400 text-sm">ft/min</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Peak Piston Speed</p>
                <p className="text-3xl font-bold">{peakFpm.toFixed(0)} ft/min</p>
              </div>
            </CardContent>
          </Card>

          <div className={`p-4 rounded-lg border ${zone.bg}`}>
            <p className={`font-bold ${zone.color}`}>{zone.label}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Reference: Common Engine Redlines</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left p-3">Engine</th>
                  <th className="text-right p-3">Stroke</th>
                  <th className="text-right p-3">Redline</th>
                  <th className="text-right p-3">Mean FPM</th>
                </tr>
              </thead>
              <tbody>
                {refEngines.map((e, i) => {
                  const fpm = (2 * e.stroke * e.rpm) / 12;
                  const z = getSpeedZone(fpm);
                  return (
                    <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                      <td className="p-3">{e.name}</td>
                      <td className="text-right p-3">{e.stroke}"</td>
                      <td className="text-right p-3">{e.rpm.toLocaleString()}</td>
                      <td className={`text-right p-3 font-bold ${z.color}`}>{fpm.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
