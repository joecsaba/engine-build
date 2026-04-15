import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RingType = "top" | "second" | "oil";
type AppType = "na-street" | "na-perf" | "fi-street" | "full-race";

const gapMultipliers: Record<AppType, Record<RingType, [number, number]>> = {
  "na-street":   { top: [0.004, 0.005], second: [0.004, 0.005], oil: [0.015, 0.030] },
  "na-perf":     { top: [0.005, 0.006], second: [0.005, 0.006], oil: [0.015, 0.030] },
  "fi-street":   { top: [0.006, 0.007], second: [0.005, 0.006], oil: [0.015, 0.030] },
  "full-race":   { top: [0.007, 0.009], second: [0.006, 0.008], oil: [0.015, 0.030] },
};

function getZone(actual: number, min: number, max: number): { label: string; color: string; bg: string } {
  if (actual < min * 0.85) return { label: "Too Tight — Risk of ring land damage!", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  if (actual < min) return { label: "Slightly tight — verify before use", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (actual <= max) return { label: "OK — Within specification", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (actual <= max * 1.15) return { label: "Slightly loose — acceptable for mild use", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "Too Loose — Excessive blowby and oil consumption", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function RingGapCalculator() {
  const [bore, setBore] = useState("4.030");
  const [ringType, setRingType] = useState<RingType>("top");
  const [appType, setAppType] = useState<AppType>("na-street");
  const [actualGap, setActualGap] = useState("");

  const b = parseFloat(bore) || 0;
  const [minMult, maxMult] = gapMultipliers[appType][ringType];
  const minGap = b * minMult;
  const maxGap = b * maxMult;

  const actualGapNum = parseFloat(actualGap);
  const zone = actualGap && !isNaN(actualGapNum) ? getZone(actualGapNum, minGap, maxGap) : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Piston Ring End Gap Calculator</h1>
      <p className="text-muted-foreground mb-8">Application-specific ring gap recommendations with color-coded zones.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Bore Size (inches)</Label>
              <Input type="number" step="0.001" value={bore} onChange={e => setBore(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Ring Type</Label>
              <Select value={ringType} onValueChange={(v) => setRingType(v as RingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top Compression Ring</SelectItem>
                  <SelectItem value="second">Second Compression Ring</SelectItem>
                  <SelectItem value="oil">Oil Control Ring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Application</Label>
              <Select value={appType} onValueChange={(v) => setAppType(v as AppType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="na-street">Naturally Aspirated Street</SelectItem>
                  <SelectItem value="na-perf">NA Performance</SelectItem>
                  <SelectItem value="fi-street">Forced Induction Street</SelectItem>
                  <SelectItem value="full-race">Full Race</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Actual Gap Measured (inches, optional)</Label>
              <Input type="number" step="0.001" placeholder="e.g. 0.018" value={actualGap} onChange={e => setActualGap(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Recommended Gap</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Inches</p>
                <p className="text-4xl font-bold text-primary">{minGap.toFixed(3)}" – {maxGap.toFixed(3)}"</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Millimeters</p>
                <p className="text-2xl font-bold">{(minGap * 25.4).toFixed(2)} – {(maxGap * 25.4).toFixed(2)} mm</p>
              </div>
            </CardContent>
          </Card>

          {zone && (
            <div className={`p-4 rounded-lg border ${zone.bg}`}>
              <p className={`font-bold ${zone.color}`}>{zone.label}</p>
              <p className="text-sm mt-1 text-muted-foreground">Your gap: {actualGapNum.toFixed(3)}" | Spec: {minGap.toFixed(3)}"–{maxGap.toFixed(3)}"</p>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Why Gap Matters</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Too Tight:</strong> As the piston ring heats up and expands, the ends butt together. This causes the ring to "land" in its groove, breaking the ring land and potentially destroying the piston and cylinder wall.</p>
              <p><strong>Too Loose:</strong> Excessive gap allows combustion gases to blow past the ring (blowby), reducing power, increasing oil consumption, and contaminating the oil with combustion products.</p>
              <p>Forced induction and high-heat applications need more gap because rings run hotter and expand more.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
