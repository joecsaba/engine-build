import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MM_PER_INCH = 25.4; // exact by international definition

function toFraction(decimalInches: number, denom: number): string {
  const totalParts = Math.round(decimalInches * denom);
  if (totalParts === 0) return '0"';
  const whole = Math.floor(totalParts / denom);
  let num = totalParts % denom;
  if (num === 0) return whole + '"';
  let d = denom;
  while (num % 2 === 0 && d % 2 === 0) {
    num /= 2;
    d /= 2;
  }
  if (whole > 0) return `${whole}-${num}/${d}"`;
  return `${num}/${d}"`;
}

interface RefRow {
  mm: string;
  inches: string;
  fraction: string;
  use: string;
}

const referenceData: RefRow[] = [
  { mm: "0.025", inches: '0.0010"', fraction: "—", use: "1 thou / typical bearing clearance" },
  { mm: "0.0508", inches: '0.0020"', fraction: "—", use: "Piston-to-wall clearance" },
  { mm: "0.254", inches: '0.0100"', fraction: "—", use: "10 thou / common overbore step" },
  { mm: "0.508", inches: '0.0200"', fraction: "—", use: "20 thou / .020 over bore" },
  { mm: "0.762", inches: '0.0300"', fraction: "—", use: "30 thou / .030 over bore" },
  { mm: "1.0", inches: '0.0394"', fraction: "—", use: "1mm metric reference" },
  { mm: "1.588", inches: '0.0625"', fraction: '1/16"', use: "—" },
  { mm: "3.175", inches: '0.1250"', fraction: '1/8"', use: "—" },
  { mm: "6.35", inches: '0.2500"', fraction: '1/4"', use: "Common bolt size" },
  { mm: "9.525", inches: '0.3750"', fraction: '3/8"', use: "Common bolt size" },
  { mm: "12.7", inches: '0.5000"', fraction: '1/2"', use: "Common bolt size" },
  { mm: "25.4", inches: '1.0000"', fraction: '1"', use: "Exact inch" },
];

export default function MmInchConverter() {
  const [direction, setDirection] = useState<"mm-to-in" | "in-to-mm">("mm-to-in");
  const [inputValue, setInputValue] = useState("");
  const [precision, setPrecision] = useState("4");

  const precisionNum = parseInt(precision, 10);
  const parsed = parseFloat(inputValue);
  const hasInput = inputValue.trim() !== "" && !isNaN(parsed);

  let result = 0;
  if (hasInput) {
    result = direction === "mm-to-in" ? parsed / MM_PER_INCH : parsed * MM_PER_INCH;
  }

  const resolution = Math.pow(10, -precisionNum) / 2;
  const toleranceLabel = direction === "mm-to-in"
    ? `± ${resolution.toFixed(precisionNum + 1)}"`
    : `± ${resolution.toFixed(precisionNum + 1)} mm`;

  function loadRef(mm: string) {
    setDirection("mm-to-in");
    setInputValue(mm);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="MM ↔ Inch Converter"
        description="High-precision millimeter to inch converter for machinists and engine builders. Selectable decimal places, fractional readout, and common reference table."
        canonical="/calculators/mm-inch-converter"
        keywords="mm to inches, millimeter to inch converter, machinist converter, precision conversion, mm to decimal inches"
      />
      <h1 className="text-3xl font-bold mb-2">MM ↔ Inch Converter</h1>
      <p className="text-muted-foreground mb-8">Precision conversion — 1 inch = 25.4 mm exactly (international standard since 1959)</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Converter */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Convert</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Direction toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "mm-to-in" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("mm-to-in")}
                >
                  MM → Inches
                </button>
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "in-to-mm" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("in-to-mm")}
                >
                  Inches → MM
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{direction === "mm-to-in" ? "Millimeters" : "Inches"}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={direction === "mm-to-in" ? "0.00" : "0.0000"}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    className="font-mono text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Decimal Places</Label>
                  <Select value={precision} onValueChange={setPrecision}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">0.0</SelectItem>
                      <SelectItem value="2">0.00</SelectItem>
                      <SelectItem value="3">0.000</SelectItem>
                      <SelectItem value="4">0.0000</SelectItem>
                      <SelectItem value="5">0.00000</SelectItem>
                      <SelectItem value="6">0.000000</SelectItem>
                      <SelectItem value="7">0.0000000</SelectItem>
                      <SelectItem value="8">0.00000000</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{toleranceLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>{direction === "mm-to-in" ? "Inches" : "Millimeters"}</CardTitle></CardHeader>
            <CardContent>
              {hasInput ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-5xl font-bold font-mono text-primary tracking-wide">
                      {result.toFixed(precisionNum)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{direction === "mm-to-in" ? "inches" : "mm"}</p>
                  </div>
                  {direction === "mm-to-in" && result > 0 && (
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-700">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Nearest 1/64"</p>
                        <p className="font-mono font-semibold text-amber-400">{toFraction(result, 64)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Nearest 1/32"</p>
                        <p className="font-mono font-semibold text-amber-400">{toFraction(result, 32)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Nearest 1/16"</p>
                        <p className="font-mono font-semibold text-amber-400">{toFraction(result, 16)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Enter a value to convert</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Reference Table */}
        <Card>
          <CardHeader><CardTitle>Commonly Used References</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">MM</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Inches</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fraction</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Common Use</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceData.map(row => (
                    <tr key={row.mm} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td
                        className="py-2 pr-3 text-primary cursor-pointer hover:underline font-semibold"
                        onClick={() => loadRef(row.mm)}
                      >
                        {row.mm}
                      </td>
                      <td className="py-2 pr-3">{row.inches}</td>
                      <td className="py-2 pr-3">{row.fraction}</td>
                      <td className="py-2 font-sans text-muted-foreground text-xs">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any MM value to load it into the converter.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
