import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MM_PER_INCH = 25.4;

interface RefRow {
  pitchMm: string;
  tpi: string;
  example: string;
}

const referenceData: RefRow[] = [
  { pitchMm: "0.5", tpi: "50.8", example: "M3 fine" },
  { pitchMm: "0.7", tpi: "36.3", example: "M4 coarse" },
  { pitchMm: "0.8", tpi: "31.8", example: "M5 coarse" },
  { pitchMm: "1.0", tpi: "25.4", example: "M6 coarse, M8 fine" },
  { pitchMm: "1.25", tpi: "20.3", example: "M8 coarse, M10 fine" },
  { pitchMm: "1.27", tpi: "20.0", example: "1/4-20 UNC" },
  { pitchMm: "1.411", tpi: "18.0", example: "5/16-18 UNC" },
  { pitchMm: "1.5", tpi: "16.9", example: "M10 coarse, M12 fine" },
  { pitchMm: "1.588", tpi: "16.0", example: "3/8-16 UNC" },
  { pitchMm: "1.75", tpi: "14.5", example: "M12 coarse, 7/16-14 UNC" },
  { pitchMm: "1.954", tpi: "13.0", example: "1/2-13 UNC" },
  { pitchMm: "2.0", tpi: "12.7", example: "M14/M16 coarse, 9/16-12 UNC" },
  { pitchMm: "2.309", tpi: "11.0", example: "5/8-11 UNC" },
  { pitchMm: "2.5", tpi: "10.16", example: "M18/M20 coarse, 3/4-10 UNC" },
  { pitchMm: "2.822", tpi: "9.0", example: "7/8-9 UNC" },
  { pitchMm: "3.0", tpi: "8.47", example: "M24 coarse" },
  { pitchMm: "3.175", tpi: "8.0", example: "1\"-8 UNC" },
];

export default function ThreadPitchConverter() {
  const [direction, setDirection] = useState<"mm-to-tpi" | "tpi-to-mm">("mm-to-tpi");
  const [inputValue, setInputValue] = useState("");

  const parsed = parseFloat(inputValue);
  const hasInput = inputValue.trim() !== "" && !isNaN(parsed) && parsed > 0;

  let result = 0;
  if (hasInput) {
    result = direction === "mm-to-tpi" ? MM_PER_INCH / parsed : MM_PER_INCH / parsed;
  }

  function loadRef(pitchMm: string) {
    setDirection("mm-to-tpi");
    setInputValue(pitchMm);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Thread Pitch Converter — TPI ↔ Metric"
        description="Convert thread pitch between imperial TPI and metric millimeters. Look up the metric equivalent of UNC/UNF threads and vice versa."
        canonical="/calculators/thread-pitch-converter"
        keywords="TPI to mm, metric thread pitch, thread pitch converter, UNC pitch, M8 pitch, thread pitch chart"
      />
      <h1 className="text-3xl font-bold mb-2">Thread Pitch Converter — TPI ↔ Metric</h1>
      <p className="text-muted-foreground mb-8">TPI × pitch (mm) = 25.4. Identify a thread when you only have one or the other.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Convert</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "mm-to-tpi" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("mm-to-tpi")}
                >
                  Metric Pitch → TPI
                </button>
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "tpi-to-mm" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("tpi-to-mm")}
                >
                  TPI → Metric Pitch
                </button>
              </div>

              <div className="space-y-1">
                <Label>{direction === "mm-to-tpi" ? "Pitch (mm)" : "Threads per inch"}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={direction === "mm-to-tpi" ? "1.5" : "20"}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="font-mono text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>{direction === "mm-to-tpi" ? "Threads Per Inch" : "Metric Pitch"}</CardTitle></CardHeader>
            <CardContent>
              {hasInput ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-5xl font-bold font-mono text-primary tracking-wide">
                      {result.toFixed(direction === "mm-to-tpi" ? 2 : 3)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{direction === "mm-to-tpi" ? "TPI" : "mm pitch"}</p>
                  </div>
                  <p className="text-xs text-gray-500 font-mono pt-2 border-t border-gray-700">
                    {direction === "mm-to-tpi"
                      ? `1 thread every ${(parsed).toFixed(3)} mm = ${result.toFixed(2)} per 25.4 mm`
                      : `${parsed} per inch = 1 thread every ${result.toFixed(3)} mm`}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Enter a value to convert</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Common Thread Pitches</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Pitch (mm)</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">TPI</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Example</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceData.map(row => (
                    <tr key={row.pitchMm + row.example} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td
                        className="py-2 pr-3 text-primary cursor-pointer hover:underline font-semibold"
                        onClick={() => loadRef(row.pitchMm)}
                      >
                        {row.pitchMm}
                      </td>
                      <td className="py-2 pr-3">{row.tpi}</td>
                      <td className="py-2 font-sans text-muted-foreground text-xs">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any pitch to load it into the converter.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
