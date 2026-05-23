import { useState, useEffect, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import { HelpSidebar } from "@/components/calculators/HelpCard";
import rodRatioContent from "@/data/calculatorContent/rod-ratio.mjs";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { BuildBanner } from "@/components/BuildBanner";
import { Info } from "lucide-react";
import { useReferenceEngines } from "@/hooks/useEngineData";
import { useDefaultPlatform } from "@/hooks/useDefaultPlatform";

const commonEngines = [
  { name: "Chevy 350 (SBC)", stroke: "3.480", rod: "5.700", ratio: 1.638 },
  { name: "GM LS1 5.7L", stroke: "3.622", rod: "6.098", ratio: 1.684 },
  { name: "GM LS3 6.2L", stroke: "3.622", rod: "6.098", ratio: 1.684 },
  { name: "GM LS7 7.0L", stroke: "4.000", rod: "6.067", ratio: 1.517 },
  { name: "Chevy 454 (BBC)", stroke: "4.000", rod: "6.535", ratio: 1.634 },
  { name: "Ford 302 Windsor", stroke: "3.000", rod: "5.090", ratio: 1.697 },
  { name: "Ford 351 Windsor", stroke: "3.500", rod: "5.956", ratio: 1.702 },
  { name: "Ford 5.0 Coyote", stroke: "3.661", rod: "5.933", ratio: 1.620 },
  { name: "Honda B16A", stroke: "3.386", rod: "5.394", ratio: 1.594 },
  { name: "Honda K24A", stroke: "3.740", rod: "6.378", ratio: 1.705 },
  { name: "Toyota 2JZ-GTE", stroke: "3.386", rod: "5.709", ratio: 1.687 },
];

function getRatioZone(ratio: number): { label: string; color: string; position: number } {
  const position = Math.max(0, Math.min(100, ((ratio - 1.4) / 0.7) * 100));
  if (ratio < 1.55) return { label: "Low ratio — High side loading, more piston wear", color: "text-orange-600", position };
  if (ratio < 1.65) return { label: "Acceptable — Typical OEM range", color: "text-yellow-600", position };
  if (ratio <= 1.85) return { label: "Ideal range — Good balance of dwell and side load", color: "text-green-600", position };
  if (ratio <= 2.0) return { label: "High ratio — Reduced side loading, smoother piston motion", color: "text-blue-600", position };
  return { label: "Very high ratio — Diminishing returns, packaging issues", color: "text-purple-600", position };
}

export default function RodRatioCalculator() {
  const platform = useDefaultPlatform();
  const [stroke, setStroke] = useBuildField("shortBlock.stroke", platform?.stroke ?? "3.622");
  const [rodLength, setRodLength] = useBuildField("rotatingAssembly.rodLength", platform?.rodLength ?? "6.098");
  const { activeBuild, setField } = useBuildContext();

  const s = parseFloat(stroke) || 0;
  const r = parseFloat(rodLength) || 1;
  const ratio = s > 0 ? r / s : 0;
  const zone = getRatioZone(ratio);

  // Merge hardcoded engines with JSON database engines
  const { engines: jsonEngines, loading: jsonLoading } = useReferenceEngines();
  const mergedEngines = useMemo(() => {
    const hardcoded = commonEngines.map(e => ({ ...e }));
    const seen = new Set(hardcoded.map(e => `${e.stroke}-${e.rod}`));
    for (const je of jsonEngines) {
      if (!je.rodLength) continue;
      const key = `${je.stroke.toFixed(3)}-${je.rodLength.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = je.rodLength / je.stroke;
      hardcoded.push({
        name: je.name,
        stroke: je.stroke.toFixed(3),
        rod: je.rodLength.toFixed(3),
        ratio: parseFloat(r.toFixed(3)),
      });
    }
    return hardcoded;
  }, [jsonEngines]);

  useEffect(() => {
    if (activeBuild && ratio > 0) {
      setField("computed.rodRatio", ratio.toFixed(3));
    }
  }, [ratio, activeBuild?.id]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Rod Ratio Calculator | Connecting Rod to Stroke"
        description="Calculate your connecting rod ratio (L/S) and see where it falls in the performance spectrum. Compare against common engines like SBC 350, LS1, Ford 302, 2JZ."
        canonical="/calculators/rod-ratio"
        keywords="rod ratio calculator, connecting rod ratio, rod length stroke ratio, engine rod ratio, L/S ratio calculator"
      />
      <BuildBanner savedFields={[
        { label: "Rod Ratio", key: "computed.rodRatio", value: ratio > 0 ? ratio.toFixed(3) : "" },
      ]} />
      <h1 className="text-3xl font-bold mb-2">Connecting Rod Ratio Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate your connecting rod ratio and see where it falls in the performance spectrum.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Stroke (inches)</Label>
              <Input type="number" step="0.001" value={stroke} onChange={e => setStroke(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Connecting Rod Length (inches)</Label>
              <Input type="number" step="0.001" value={rodLength} onChange={e => setRodLength(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] text-white">
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-1">Rod Ratio (L/S)</p>
            <p className="text-6xl font-bold text-primary mb-4">{ratio.toFixed(3)}</p>
            
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>1.4 (Low)</span>
                <span>1.7–1.8 (Ideal)</span>
                <span>2.0+ (High)</span>
              </div>
              <div className="relative h-3 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 rounded-full">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-primary shadow-lg transition-all"
                  style={{ left: `calc(${zone.position}% - 8px)` }}
                />
              </div>
            </div>

            <p className={`text-sm font-medium ${zone.color}`}>{zone.label}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle>What Rod Ratio Affects</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Piston Dwell at TDC</p>
            <p className="text-muted-foreground">Longer rods increase dwell time at TDC, giving combustion gases more time to act on the piston. This generally improves cylinder pressure and power.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Piston Side Loading</p>
            <p className="text-muted-foreground">Shorter rods create greater angle between rod and cylinder bore, increasing side thrust on the piston skirt. This causes more wear and friction.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Piston Speed</p>
            <p className="text-muted-foreground">Longer rods smooth out piston velocity through the stroke, reducing peak piston speed and the stress/friction that comes with it.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-semibold mb-1">Block Height</p>
            <p className="text-muted-foreground">Longer rods require either a taller block, shorter piston, or reduced compression height. This affects overall engine package dimensions.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Common Engine Comparison{jsonLoading ? " (loading database...)" : ""}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Engine</th>
                  <th className="text-right py-2">Stroke</th>
                  <th className="text-right py-2">Rod Length</th>
                  <th className="text-right py-2">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {mergedEngines.map((e, i) => (
                  <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                    <td className="py-2 font-medium">{e.name}</td>
                    <td className="text-right py-2">{e.stroke}"</td>
                    <td className="text-right py-2">{e.rod}"</td>
                    <td className={`text-right py-2 font-bold ${Math.abs(e.ratio - ratio) < 0.05 ? "text-primary" : ""}`}>{e.ratio.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      </div>{/* end left column */}

      <HelpSidebar className="xl:w-80 shrink-0 space-y-6">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-[#E85D04]" />
              Quick Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">What Is Rod Ratio?</h4>
              <p>Rod center-to-center length divided by stroke (L/S). Affects piston dwell, side loading, and acceleration through the stroke.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Ideal Range</h4>
              <p>1.6–1.8 covers most performance engines. Above 1.8 gives diminishing returns with packaging challenges. Below 1.55 increases piston wear.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Stroker Warning</h4>
              <p>A 383 SBC stroker with stock 5.700" rods drops to 1.520:1. Upgrade to 6.000" rods to bring it back to 1.600:1.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Higher Ratio Trade-offs</h4>
              <p>Longer rods need a taller block or shorter piston compression height. Short pistons are weaker and more expensive.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Common Ratios</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>SBC 350:</span><span className="font-mono">1.638</span></li>
                <li className="flex justify-between"><span>LS1 5.7L:</span><span className="font-mono">1.684</span></li>
                <li className="flex justify-between"><span>Ford 302:</span><span className="font-mono">1.697</span></li>
                <li className="flex justify-between"><span>Honda K24A:</span><span className="font-mono">1.705</span></li>
                <li className="flex justify-between"><span>Toyota 2JZ:</span><span className="font-mono">1.687</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </HelpSidebar>

      </div>{/* end flex row */}

      <CalculatorContent data={rodRatioContent} title="Connecting Rod Ratio" />
    </div>
  );
}
