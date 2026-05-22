import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import decimalFractionContent from "@/data/calculatorContent/decimal-fraction-inch.mjs";

function reduceFraction(num: number, denom: number): { num: number; denom: number } {
  let n = num;
  let d = denom;
  while (n % 2 === 0 && d % 2 === 0) {
    n /= 2;
    d /= 2;
  }
  return { num: n, denom: d };
}

function decimalToFraction(decimal: number, denom: number): { display: string; error: number } {
  const sign = decimal < 0 ? -1 : 1;
  const abs = Math.abs(decimal);
  const totalParts = Math.round(abs * denom);
  if (totalParts === 0) return { display: "0", error: abs };
  const whole = Math.floor(totalParts / denom);
  const remainder = totalParts % denom;
  const exact = (sign * totalParts) / denom;
  const error = Math.abs(decimal - exact);
  const signStr = sign < 0 ? "-" : "";
  if (remainder === 0) return { display: `${signStr}${whole}`, error };
  const reduced = reduceFraction(remainder, denom);
  if (whole === 0) return { display: `${signStr}${reduced.num}/${reduced.denom}`, error };
  return { display: `${signStr}${whole}-${reduced.num}/${reduced.denom}`, error };
}

function parseFractionInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Try direct number first
  const direct = parseFloat(trimmed);
  if (!isNaN(direct) && !/[\/\s]/.test(trimmed)) return direct;
  // Match "W-N/D", "W N/D", or "N/D"
  const m = trimmed.match(/^(-?\d+)?[-\s]?(\d+)\/(\d+)$/);
  if (!m) return null;
  const whole = m[1] ? parseInt(m[1], 10) : 0;
  const num = parseInt(m[2], 10);
  const denom = parseInt(m[3], 10);
  if (denom === 0) return null;
  const sign = whole < 0 || m[1]?.startsWith("-") ? -1 : 1;
  return sign * (Math.abs(whole) + num / denom);
}

interface RefRow {
  fraction: string;
  decimal: string;
  mm: string;
  use: string;
}

const referenceData: RefRow[] = [
  { fraction: "1/64", decimal: "0.0156", mm: "0.397", use: "Finest common machinist fraction" },
  { fraction: "1/32", decimal: "0.0313", mm: "0.794", use: "—" },
  { fraction: "1/16", decimal: "0.0625", mm: "1.588", use: "—" },
  { fraction: "3/32", decimal: "0.0938", mm: "2.381", use: "—" },
  { fraction: "1/8", decimal: "0.1250", mm: "3.175", use: "Common bolt size" },
  { fraction: "5/32", decimal: "0.1563", mm: "3.969", use: "—" },
  { fraction: "3/16", decimal: "0.1875", mm: "4.763", use: "—" },
  { fraction: "7/32", decimal: "0.2188", mm: "5.556", use: "—" },
  { fraction: "1/4", decimal: "0.2500", mm: "6.350", use: "Common bolt size" },
  { fraction: "9/32", decimal: "0.2813", mm: "7.144", use: "—" },
  { fraction: "5/16", decimal: "0.3125", mm: "7.938", use: "3/8-16 tap drill" },
  { fraction: "11/32", decimal: "0.3438", mm: "8.731", use: "—" },
  { fraction: "3/8", decimal: "0.3750", mm: "9.525", use: "Common bolt size" },
  { fraction: "13/32", decimal: "0.4063", mm: "10.319", use: "—" },
  { fraction: "7/16", decimal: "0.4375", mm: "11.113", use: "—" },
  { fraction: "1/2", decimal: "0.5000", mm: "12.700", use: "Common bolt size" },
  { fraction: "9/16", decimal: "0.5625", mm: "14.288", use: "—" },
  { fraction: "5/8", decimal: "0.6250", mm: "15.875", use: "—" },
  { fraction: "11/16", decimal: "0.6875", mm: "17.463", use: "—" },
  { fraction: "3/4", decimal: "0.7500", mm: "19.050", use: "Common bolt size" },
  { fraction: "13/16", decimal: "0.8125", mm: "20.638", use: "—" },
  { fraction: "7/8", decimal: "0.8750", mm: "22.225", use: "—" },
  { fraction: "15/16", decimal: "0.9375", mm: "23.813", use: "—" },
  { fraction: "1", decimal: "1.0000", mm: "25.400", use: "Exact inch" },
];

export default function DecimalFractionInchConverter() {
  const [direction, setDirection] = useState<"dec-to-frac" | "frac-to-dec">("dec-to-frac");
  const [inputValue, setInputValue] = useState("");
  const [denom, setDenom] = useState("64");

  const denomNum = parseInt(denom, 10);
  let resultLine1 = "";
  let resultLine2 = "";
  let errorLabel = "";
  let hasInput = false;
  let decimalValue = 0;

  if (direction === "dec-to-frac") {
    const parsed = parseFloat(inputValue);
    if (inputValue.trim() !== "" && !isNaN(parsed)) {
      hasInput = true;
      decimalValue = parsed;
      const frac = decimalToFraction(parsed, denomNum);
      resultLine1 = `${frac.display}"`;
      resultLine2 = `${parsed.toFixed(4)}"`;
      errorLabel = `Error: ${frac.error.toFixed(5)}"`;
    }
  } else {
    const parsed = parseFractionInput(inputValue);
    if (parsed !== null) {
      hasInput = true;
      decimalValue = parsed;
      resultLine1 = `${parsed.toFixed(4)}"`;
      resultLine2 = `${(parsed * 25.4).toFixed(3)} mm`;
    }
  }

  function loadRef(fraction: string) {
    setDirection("frac-to-dec");
    setInputValue(fraction);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Decimal ↔ Fraction Inch Converter"
        description="Convert decimal inches to fractional inches and back. Choose precision down to 1/128. Built for machinists who need to read a caliper and pick the right drill."
        canonical="/calculators/decimal-fraction-inch"
        keywords="decimal to fraction, fraction to decimal, inch fractions, machinist converter, 1/64 1/32 1/16, fractional inch chart"
      />
      <h1 className="text-3xl font-bold mb-2">Decimal ↔ Fraction Inch Converter</h1>
      <p className="text-muted-foreground mb-8">Translate between decimal caliper readings and fractional drill/wrench sizes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Convert</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "dec-to-frac" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("dec-to-frac")}
                >
                  Decimal → Fraction
                </button>
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "frac-to-dec" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("frac-to-dec")}
                >
                  Fraction → Decimal
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{direction === "dec-to-frac" ? "Decimal inches" : "Fraction (e.g. 11/32 or 1-1/4)"}</Label>
                  <Input
                    type="text"
                    inputMode={direction === "dec-to-frac" ? "decimal" : "text"}
                    placeholder={direction === "dec-to-frac" ? "0.3437" : "11/32"}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    className="font-mono text-lg"
                  />
                </div>
                {direction === "dec-to-frac" && (
                  <div className="space-y-1">
                    <Label>Nearest fraction</Label>
                    <Select value={denom} onValueChange={setDenom}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">1/8</SelectItem>
                        <SelectItem value="16">1/16</SelectItem>
                        <SelectItem value="32">1/32</SelectItem>
                        <SelectItem value="64">1/64</SelectItem>
                        <SelectItem value="128">1/128</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>{direction === "dec-to-frac" ? "Fractional Inch" : "Decimal Inch"}</CardTitle></CardHeader>
            <CardContent>
              {hasInput ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-5xl font-bold font-mono text-primary tracking-wide">{resultLine1}</p>
                    <p className="text-sm text-gray-400 mt-1">{resultLine2}</p>
                  </div>
                  {errorLabel && (
                    <p className="text-xs text-gray-500 font-mono pt-2 border-t border-gray-700">{errorLabel}</p>
                  )}
                  {direction === "frac-to-dec" && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Thousandths</p>
                        <p className="font-mono font-semibold text-amber-400">{(decimalValue * 1000).toFixed(1)} thou</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Millimeters</p>
                        <p className="font-mono font-semibold text-amber-400">{(decimalValue * 25.4).toFixed(3)} mm</p>
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

        <Card>
          <CardHeader><CardTitle>Standard Fractional Inch Chart</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fraction</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Decimal</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">MM</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Use</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceData.map(row => (
                    <tr key={row.fraction} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td
                        className="py-2 pr-3 text-primary cursor-pointer hover:underline font-semibold"
                        onClick={() => loadRef(row.fraction)}
                      >
                        {row.fraction}"
                      </td>
                      <td className="py-2 pr-3">{row.decimal}"</td>
                      <td className="py-2 pr-3">{row.mm}</td>
                      <td className="py-2 font-sans text-muted-foreground text-xs">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any fraction to load it into the converter.</p>
          </CardContent>
        </Card>
      </div>

      <CalculatorContent data={decimalFractionContent} title="Decimal to Fraction Inch" />
    </div>
  );
}
