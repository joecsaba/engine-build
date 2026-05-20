import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ThreadStandard = "imperial" | "metric";

interface ImperialTap {
  tap: string;          // e.g. "1/4-20"
  tpi: number;
  majorDia: number;     // inches
  drill75: string;      // 75% thread drill (size or number/letter)
  drill75Dec: number;   // decimal inches
  drill50: string;      // 50% thread drill
  drill50Dec: number;
}

interface MetricTap {
  tap: string;          // e.g. "M8 × 1.25"
  pitch: number;        // mm
  majorDia: number;     // mm
  drill75Mm: number;    // 75% thread drill in mm
  drill50Mm: number;
}

const imperialTaps: ImperialTap[] = [
  { tap: "#4-40 UNC", tpi: 40, majorDia: 0.112, drill75: "#43", drill75Dec: 0.0890, drill50: "#41", drill50Dec: 0.0960 },
  { tap: "#6-32 UNC", tpi: 32, majorDia: 0.138, drill75: "#36", drill75Dec: 0.1065, drill50: "#33", drill50Dec: 0.1130 },
  { tap: "#8-32 UNC", tpi: 32, majorDia: 0.164, drill75: "#29", drill75Dec: 0.1360, drill50: "#28", drill50Dec: 0.1405 },
  { tap: "#10-24 UNC", tpi: 24, majorDia: 0.190, drill75: "#25", drill75Dec: 0.1495, drill50: "#20", drill50Dec: 0.1610 },
  { tap: "#10-32 UNF", tpi: 32, majorDia: 0.190, drill75: "#21", drill75Dec: 0.1590, drill50: "#19", drill50Dec: 0.1660 },
  { tap: "1/4-20 UNC", tpi: 20, majorDia: 0.250, drill75: "#7", drill75Dec: 0.2010, drill50: "#1", drill50Dec: 0.2280 },
  { tap: "1/4-28 UNF", tpi: 28, majorDia: 0.250, drill75: "#3", drill75Dec: 0.2130, drill50: "7/32", drill50Dec: 0.2188 },
  { tap: "5/16-18 UNC", tpi: 18, majorDia: 0.3125, drill75: "F", drill75Dec: 0.2570, drill50: "J", drill50Dec: 0.2770 },
  { tap: "5/16-24 UNF", tpi: 24, majorDia: 0.3125, drill75: "I", drill75Dec: 0.2720, drill50: "9/32", drill50Dec: 0.2813 },
  { tap: "3/8-16 UNC", tpi: 16, majorDia: 0.375, drill75: "5/16", drill75Dec: 0.3125, drill50: "Q", drill50Dec: 0.3320 },
  { tap: "3/8-24 UNF", tpi: 24, majorDia: 0.375, drill75: "Q", drill75Dec: 0.3320, drill50: "11/32", drill50Dec: 0.3438 },
  { tap: "7/16-14 UNC", tpi: 14, majorDia: 0.4375, drill75: "U", drill75Dec: 0.3680, drill50: "X", drill50Dec: 0.3970 },
  { tap: "7/16-20 UNF", tpi: 20, majorDia: 0.4375, drill75: "25/64", drill75Dec: 0.3906, drill50: "13/32", drill50Dec: 0.4063 },
  { tap: "1/2-13 UNC", tpi: 13, majorDia: 0.500, drill75: "27/64", drill75Dec: 0.4219, drill50: "29/64", drill50Dec: 0.4531 },
  { tap: "1/2-20 UNF", tpi: 20, majorDia: 0.500, drill75: "29/64", drill75Dec: 0.4531, drill50: "15/32", drill50Dec: 0.4688 },
  { tap: "9/16-12 UNC", tpi: 12, majorDia: 0.5625, drill75: "31/64", drill75Dec: 0.4844, drill50: "33/64", drill50Dec: 0.5156 },
  { tap: "9/16-18 UNF", tpi: 18, majorDia: 0.5625, drill75: "33/64", drill75Dec: 0.5156, drill50: "17/32", drill50Dec: 0.5313 },
  { tap: "5/8-11 UNC", tpi: 11, majorDia: 0.625, drill75: "17/32", drill75Dec: 0.5313, drill50: "9/16", drill50Dec: 0.5625 },
  { tap: "5/8-18 UNF", tpi: 18, majorDia: 0.625, drill75: "37/64", drill75Dec: 0.5781, drill50: "19/32", drill50Dec: 0.5938 },
  { tap: "3/4-10 UNC", tpi: 10, majorDia: 0.750, drill75: "21/32", drill75Dec: 0.6563, drill50: "11/16", drill50Dec: 0.6875 },
  { tap: "3/4-16 UNF", tpi: 16, majorDia: 0.750, drill75: "11/16", drill75Dec: 0.6875, drill50: "45/64", drill50Dec: 0.7031 },
  { tap: "7/8-9 UNC", tpi: 9, majorDia: 0.875, drill75: "49/64", drill75Dec: 0.7656, drill50: "51/64", drill50Dec: 0.7969 },
  { tap: "7/8-14 UNF", tpi: 14, majorDia: 0.875, drill75: "13/16", drill75Dec: 0.8125, drill50: "53/64", drill50Dec: 0.8281 },
  { tap: "1\"-8 UNC", tpi: 8, majorDia: 1.000, drill75: "7/8", drill75Dec: 0.8750, drill50: "59/64", drill50Dec: 0.9219 },
  { tap: "1\"-12 UNF", tpi: 12, majorDia: 1.000, drill75: "59/64", drill75Dec: 0.9219, drill50: "15/16", drill50Dec: 0.9375 },
];

const metricTaps: MetricTap[] = [
  { tap: "M3 × 0.5", pitch: 0.5, majorDia: 3, drill75Mm: 2.5, drill50Mm: 2.7 },
  { tap: "M3.5 × 0.6", pitch: 0.6, majorDia: 3.5, drill75Mm: 2.9, drill50Mm: 3.1 },
  { tap: "M4 × 0.7", pitch: 0.7, majorDia: 4, drill75Mm: 3.3, drill50Mm: 3.5 },
  { tap: "M5 × 0.8", pitch: 0.8, majorDia: 5, drill75Mm: 4.2, drill50Mm: 4.4 },
  { tap: "M6 × 1.0", pitch: 1.0, majorDia: 6, drill75Mm: 5.0, drill50Mm: 5.2 },
  { tap: "M7 × 1.0", pitch: 1.0, majorDia: 7, drill75Mm: 6.0, drill50Mm: 6.2 },
  { tap: "M8 × 1.25", pitch: 1.25, majorDia: 8, drill75Mm: 6.8, drill50Mm: 7.1 },
  { tap: "M8 × 1.0", pitch: 1.0, majorDia: 8, drill75Mm: 7.0, drill50Mm: 7.2 },
  { tap: "M10 × 1.5", pitch: 1.5, majorDia: 10, drill75Mm: 8.5, drill50Mm: 8.8 },
  { tap: "M10 × 1.25", pitch: 1.25, majorDia: 10, drill75Mm: 8.8, drill50Mm: 9.0 },
  { tap: "M12 × 1.75", pitch: 1.75, majorDia: 12, drill75Mm: 10.2, drill50Mm: 10.6 },
  { tap: "M12 × 1.5", pitch: 1.5, majorDia: 12, drill75Mm: 10.5, drill50Mm: 10.8 },
  { tap: "M14 × 2.0", pitch: 2.0, majorDia: 14, drill75Mm: 12.0, drill50Mm: 12.4 },
  { tap: "M14 × 1.5", pitch: 1.5, majorDia: 14, drill75Mm: 12.5, drill50Mm: 12.8 },
  { tap: "M16 × 2.0", pitch: 2.0, majorDia: 16, drill75Mm: 14.0, drill50Mm: 14.4 },
  { tap: "M16 × 1.5", pitch: 1.5, majorDia: 16, drill75Mm: 14.5, drill50Mm: 14.8 },
  { tap: "M18 × 2.5", pitch: 2.5, majorDia: 18, drill75Mm: 15.5, drill50Mm: 16.0 },
  { tap: "M20 × 2.5", pitch: 2.5, majorDia: 20, drill75Mm: 17.5, drill50Mm: 18.0 },
  { tap: "M22 × 2.5", pitch: 2.5, majorDia: 22, drill75Mm: 19.5, drill50Mm: 20.0 },
  { tap: "M24 × 3.0", pitch: 3.0, majorDia: 24, drill75Mm: 21.0, drill50Mm: 21.5 },
];

export default function TapDrillLookup() {
  const [standard, setStandard] = useState<ThreadStandard>("imperial");
  const [selected, setSelected] = useState<string>(imperialTaps[5].tap); // 1/4-20

  const imperialMatch = imperialTaps.find(t => t.tap === selected);
  const metricMatch = metricTaps.find(t => t.tap === selected);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Tap Drill Size Lookup"
        description="Find the right drill size for any tap. Imperial UNC/UNF and metric coarse/fine threads with 75% and 50% thread engagement drill sizes."
        canonical="/calculators/tap-drill-lookup"
        keywords="tap drill chart, tap drill size, UNC UNF tap drill, metric tap drill, M8 drill size, 75% thread drill, machinist tap chart"
      />
      <h1 className="text-3xl font-bold mb-2">Tap Drill Size Lookup</h1>
      <p className="text-muted-foreground mb-8">Pick a tap, get the drill. 75% engagement is the standard for steel and aluminum; 50% reduces tap breakage in tough material.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Select Tap</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${standard === "imperial" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => { setStandard("imperial"); setSelected(imperialTaps[5].tap); }}
                >
                  Imperial (UNC/UNF)
                </button>
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${standard === "metric" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => { setStandard("metric"); setSelected(metricTaps[4].tap); }}
                >
                  Metric
                </button>
              </div>

              <div className="space-y-1">
                <Label>Tap Size</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {standard === "imperial"
                      ? imperialTaps.map(t => <SelectItem key={t.tap} value={t.tap}>{t.tap}</SelectItem>)
                      : metricTaps.map(t => <SelectItem key={t.tap} value={t.tap}>{t.tap}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Drill Sizes</CardTitle></CardHeader>
            <CardContent>
              {standard === "imperial" && imperialMatch ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">75% Thread (standard)</p>
                    <p className="text-4xl font-bold font-mono text-primary tracking-wide">{imperialMatch.drill75}</p>
                    <p className="text-sm text-gray-400 mt-1 font-mono">{imperialMatch.drill75Dec.toFixed(4)}" · {(imperialMatch.drill75Dec * 25.4).toFixed(2)} mm</p>
                  </div>
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">50% Thread (easier tapping)</p>
                    <p className="text-2xl font-bold font-mono text-amber-400 tracking-wide">{imperialMatch.drill50}</p>
                    <p className="text-sm text-gray-400 mt-1 font-mono">{imperialMatch.drill50Dec.toFixed(4)}" · {(imperialMatch.drill50Dec * 25.4).toFixed(2)} mm</p>
                  </div>
                  <div className="pt-3 border-t border-gray-700 grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-gray-500">TPI</p><p className="font-mono text-white">{imperialMatch.tpi}</p></div>
                    <div><p className="text-gray-500">Major Ø</p><p className="font-mono text-white">{imperialMatch.majorDia.toFixed(4)}"</p></div>
                  </div>
                </div>
              ) : standard === "metric" && metricMatch ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">75% Thread (standard)</p>
                    <p className="text-4xl font-bold font-mono text-primary tracking-wide">{metricMatch.drill75Mm.toFixed(1)} mm</p>
                    <p className="text-sm text-gray-400 mt-1 font-mono">{(metricMatch.drill75Mm / 25.4).toFixed(4)}"</p>
                  </div>
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">50% Thread (easier tapping)</p>
                    <p className="text-2xl font-bold font-mono text-amber-400 tracking-wide">{metricMatch.drill50Mm.toFixed(1)} mm</p>
                    <p className="text-sm text-gray-400 mt-1 font-mono">{(metricMatch.drill50Mm / 25.4).toFixed(4)}"</p>
                  </div>
                  <div className="pt-3 border-t border-gray-700 grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-gray-500">Pitch</p><p className="font-mono text-white">{metricMatch.pitch} mm</p></div>
                    <div><p className="text-gray-500">Major Ø</p><p className="font-mono text-white">{metricMatch.majorDia} mm</p></div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>{standard === "imperial" ? "Imperial Tap Chart" : "Metric Tap Chart"}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tap</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">75% Drill</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Decimal</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {standard === "imperial" ? (
                    imperialTaps.map(row => (
                      <tr key={row.tap} className={`border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${selected === row.tap ? "bg-muted/50" : ""}`} onClick={() => setSelected(row.tap)}>
                        <td className="py-2 pr-3 text-primary font-semibold">{row.tap}</td>
                        <td className="py-2 pr-3">{row.drill75}</td>
                        <td className="py-2 pr-3">{row.drill75Dec.toFixed(4)}"</td>
                      </tr>
                    ))
                  ) : (
                    metricTaps.map(row => (
                      <tr key={row.tap} className={`border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${selected === row.tap ? "bg-muted/50" : ""}`} onClick={() => setSelected(row.tap)}>
                        <td className="py-2 pr-3 text-primary font-semibold">{row.tap}</td>
                        <td className="py-2 pr-3">{row.drill75Mm.toFixed(1)} mm</td>
                        <td className="py-2 pr-3">{(row.drill75Mm / 25.4).toFixed(4)}"</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any tap to select it.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
