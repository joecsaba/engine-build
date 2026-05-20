import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 1 cubic inch = 16.387064 cm³ (exact: 2.54³)
const CC_PER_CI = 16.387064;

interface RefRow {
  cc: string;
  ci: string;
  use: string;
}

const referenceData: RefRow[] = [
  { cc: "30", ci: "1.831", use: "Chamber dish (small)" },
  { cc: "45", ci: "2.746", use: "Common SBC chamber" },
  { cc: "55", ci: "3.356", use: "Common LSx / BBC chamber" },
  { cc: "62", ci: "3.783", use: "Larger BBC chamber" },
  { cc: "75", ci: "4.577", use: "Large head chamber" },
  { cc: "-8", ci: "-0.488", use: "Common piston dome (negative)" },
  { cc: "-12", ci: "-0.732", use: "Domed piston (high CR)" },
  { cc: "+5", ci: "+0.305", use: "Dish piston (positive volume)" },
  { cc: "+18", ci: "+1.098", use: "Deep-dish piston (low CR / boost)" },
  { cc: "1000", ci: "61.0", use: "1.0 liter displacement" },
  { cc: "5000", ci: "305.1", use: "Approx. 305 SBC" },
  { cc: "5700", ci: "347.9", use: "5.7L = 350" },
  { cc: "6200", ci: "378.3", use: "6.2L LS3" },
];

export default function CcCiConverter() {
  const [direction, setDirection] = useState<"cc-to-ci" | "ci-to-cc">("cc-to-ci");
  const [inputValue, setInputValue] = useState("");

  const parsed = parseFloat(inputValue);
  const hasInput = inputValue.trim() !== "" && !isNaN(parsed);

  let result = 0;
  if (hasInput) {
    result = direction === "cc-to-ci" ? parsed / CC_PER_CI : parsed * CC_PER_CI;
  }

  function loadRef(cc: string) {
    setDirection("cc-to-ci");
    setInputValue(cc);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="CC ↔ Cubic Inch Converter"
        description="Convert between cubic centimeters and cubic inches. Useful for combustion chamber volume, piston dome/dish volume, and engine displacement."
        canonical="/calculators/cc-ci-converter"
        keywords="cc to ci, cubic centimeters to cubic inches, chamber volume converter, piston dome volume, engine displacement converter"
      />
      <h1 className="text-3xl font-bold mb-2">CC ↔ Cubic Inch Converter</h1>
      <p className="text-muted-foreground mb-8">1 cubic inch = 16.387064 cc (exact). For chamber volumes, piston dome/dish, and engine displacement.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Convert</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "cc-to-ci" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("cc-to-ci")}
                >
                  CC → Cubic Inch
                </button>
                <button
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${direction === "ci-to-cc" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("ci-to-cc")}
                >
                  Cubic Inch → CC
                </button>
              </div>

              <div className="space-y-1">
                <Label>{direction === "cc-to-ci" ? "Cubic centimeters (cc / cm³)" : "Cubic inches"}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={direction === "cc-to-ci" ? "62" : "3.78"}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="font-mono text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>{direction === "cc-to-ci" ? "Cubic Inches" : "CC"}</CardTitle></CardHeader>
            <CardContent>
              {hasInput ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-5xl font-bold font-mono text-primary tracking-wide">
                      {result.toFixed(direction === "cc-to-ci" ? 3 : 2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{direction === "cc-to-ci" ? "cubic inches" : "cc (cm³)"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Liters</p>
                      <p className="font-mono font-semibold text-amber-400">
                        {direction === "cc-to-ci"
                          ? (parsed / 1000).toFixed(3)
                          : (result / 1000).toFixed(3)} L
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Fluid Ounces (US)</p>
                      <p className="font-mono font-semibold text-amber-400">
                        {direction === "cc-to-ci"
                          ? (parsed / 29.5735).toFixed(3)
                          : (result / 29.5735).toFixed(3)} fl oz
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Enter a value to convert</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Common Engine Volumes</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">CC</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">CI</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Use</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceData.map(row => (
                    <tr key={row.cc + row.use} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td
                        className="py-2 pr-3 text-primary cursor-pointer hover:underline font-semibold"
                        onClick={() => loadRef(row.cc.replace("+", ""))}
                      >
                        {row.cc}
                      </td>
                      <td className="py-2 pr-3">{row.ci}</td>
                      <td className="py-2 font-sans text-muted-foreground text-xs">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any CC value to load it. Negative = piston dome (subtracts from chamber); positive = dish (adds).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
