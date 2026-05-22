import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import anFittingContent from "@/data/calculatorContent/an-fitting-size.mjs";

interface AnSize {
  dash: string;          // e.g. "-6"
  tubeInch: string;      // tube OD in inches (fractional)
  tubeMm: string;        // tube OD in mm
  threadJic: string;     // JIC 37° flare thread
  threadOrb: string;     // O-ring boss (SAE) thread
  hoseId: string;        // typical hose inside diameter
  use: string;
}

const sizes: AnSize[] = [
  { dash: "-3", tubeInch: "3/16", tubeMm: "4.76", threadJic: "3/8-24 UNF", threadOrb: "3/8-24 UNF", hoseId: "1/8", use: "Brake lines, gauges, vac lines" },
  { dash: "-4", tubeInch: "1/4", tubeMm: "6.35", threadJic: "7/16-20 UNF", threadOrb: "7/16-20 UNF", hoseId: "3/16", use: "Brake, clutch, vac lines, gauge feeds" },
  { dash: "-5", tubeInch: "5/16", tubeMm: "7.94", threadJic: "1/2-20 UNF", threadOrb: "1/2-20 UNF", hoseId: "1/4", use: "Less common — power steering" },
  { dash: "-6", tubeInch: "3/8", tubeMm: "9.53", threadJic: "9/16-18 UNF", threadOrb: "9/16-18 UNF", hoseId: "5/16", use: "Fuel feed/return (most builds)" },
  { dash: "-8", tubeInch: "1/2", tubeMm: "12.70", threadJic: "3/4-16 UNF", threadOrb: "3/4-16 UNF", hoseId: "7/16", use: "Fuel (high HP), oil cooler, AC" },
  { dash: "-10", tubeInch: "5/8", tubeMm: "15.88", threadJic: "7/8-14 UNF", threadOrb: "7/8-14 UNF", hoseId: "9/16", use: "Oil cooler, oil drain, AC, large fuel" },
  { dash: "-12", tubeInch: "3/4", tubeMm: "19.05", threadJic: "1-1/16-12 UN", threadOrb: "1-1/16-12 UN", hoseId: "11/16", use: "Turbo oil drain, dry sump scavenge" },
  { dash: "-16", tubeInch: "1", tubeMm: "25.40", threadJic: "1-5/16-12 UN", threadOrb: "1-5/16-12 UN", hoseId: "7/8", use: "Dry sump, water pump bypass" },
  { dash: "-20", tubeInch: "1-1/4", tubeMm: "31.75", threadJic: "1-5/8-12 UN", threadOrb: "1-5/8-12 UN", hoseId: "1-1/8", use: "Heat exchanger, large coolant" },
  { dash: "-24", tubeInch: "1-1/2", tubeMm: "38.10", threadJic: "1-7/8-12 UN", threadOrb: "1-7/8-12 UN", hoseId: "1-3/8", use: "Heat exchangers, industrial" },
];

export default function AnFittingSize() {
  const [selected, setSelected] = useState<string>("-6");
  const match = sizes.find(s => s.dash === selected)!;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="AN Fitting Size Chart"
        description="AN / JIC fitting dash sizes with tube OD in inches and mm, JIC 37° flare thread, and O-ring boss (ORB) thread. Built for fuel system, oil cooler, and turbo plumbing."
        canonical="/calculators/an-fitting-size"
        keywords="AN fitting chart, -6AN thread size, dash 8 AN, JIC fitting thread, ORB thread chart, AN to inch, AN fitting sizes"
      />
      <h1 className="text-3xl font-bold mb-2">AN Fitting Size Chart</h1>
      <p className="text-muted-foreground mb-8">Dash size → tube OD, JIC 37° flare thread, and O-ring boss (ORB) thread. The "AN" dash number is the tube OD in 1/16" increments.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Pick AN Size</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Dash size</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sizes.map(s => <SelectItem key={s.dash} value={s.dash}>{s.dash} AN</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>{match.dash} AN</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Tube OD</p>
                  <p className="text-4xl font-bold font-mono text-primary tracking-wide">{match.tubeInch}"</p>
                  <p className="text-sm text-gray-400 mt-1 font-mono">{match.tubeMm} mm</p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-700">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">JIC 37° Flare Thread</p>
                    <p className="font-mono font-semibold text-amber-400 text-lg">{match.threadJic}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">O-Ring Boss (ORB) Thread</p>
                    <p className="font-mono font-semibold text-amber-400 text-lg">{match.threadOrb}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Typical Hose ID</p>
                    <p className="font-mono font-semibold text-white">{match.hoseId}"</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 italic">{match.use}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>AN Size Chart</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">AN</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tube OD</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">MM</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">JIC Thread</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {sizes.map(row => (
                    <tr
                      key={row.dash}
                      className={`border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${selected === row.dash ? "bg-muted/50" : ""}`}
                      onClick={() => setSelected(row.dash)}
                    >
                      <td className="py-2 pr-3 text-primary font-semibold">{row.dash}</td>
                      <td className="py-2 pr-3">{row.tubeInch}"</td>
                      <td className="py-2 pr-3">{row.tubeMm}</td>
                      <td className="py-2 pr-3 text-xs">{row.threadJic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any row to select. AN dash number = tube OD in 1/16" increments (e.g. -6 = 6/16" = 3/8").</p>
          </CardContent>
        </Card>
      </div>

      <CalculatorContent data={anFittingContent} title="AN Fitting Size" />
    </div>
  );
}
