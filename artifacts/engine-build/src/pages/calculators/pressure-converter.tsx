import { useState } from "react";
import { useUnitDirection } from "@/hooks/useUnitDirection";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import pressureConverterContent from "@/data/calculatorContent/pressure-converter.mjs";

// Conversions per psi (NIST):
// 1 psi = 0.0689476 bar
// 1 psi = 6.89476 kPa
// 1 psi = 0.0680460 atm
// 1 psi = 2.03602 inHg
// 1 psi = 27.7076 inH2O
const PSI_TO_BAR = 0.0689476;
const PSI_TO_KPA = 6.89476;
const PSI_TO_ATM = 0.0680460;
const PSI_TO_INHG = 2.03602;

type Unit = "psi" | "bar" | "kpa" | "atm" | "inhg";

interface RefRow {
  psi: string;
  bar: string;
  kpa: string;
  use: string;
}

const referenceData: RefRow[] = [
  { psi: "1", bar: "0.069", kpa: "6.9", use: "Light vacuum/boost gauge resolution" },
  { psi: "5", bar: "0.345", kpa: "34.5", use: "Mild boost (turbo factory)" },
  { psi: "7.25", bar: "0.500", kpa: "50", use: "0.5 bar — common low-boost" },
  { psi: "10", bar: "0.690", kpa: "69", use: "Stock turbo passenger car" },
  { psi: "14.5", bar: "1.000", kpa: "100", use: "1 bar — atmospheric / boost reference" },
  { psi: "15", bar: "1.034", kpa: "103", use: "Mild performance boost" },
  { psi: "20", bar: "1.379", kpa: "138", use: "Mid boost on stock internals" },
  { psi: "29", bar: "2.000", kpa: "200", use: "2 bar — drag/race builds" },
  { psi: "30", bar: "2.068", kpa: "207", use: "Forged-bottom-end territory" },
  { psi: "44", bar: "3.000", kpa: "300", use: "3 bar — race/built engine" },
  { psi: "60", bar: "4.137", kpa: "414", use: "Oil pressure (hot, redline)" },
  { psi: "100", bar: "6.895", kpa: "690", use: "Fuel rail pressure (PFI)" },
];

export default function PressureConverter() {
  const [activeUnit, setActiveUnit] = useUnitDirection<Unit>({
    imperial: "psi",
    metric: "bar",
  });
  const [value, setValue] = useState("");

  const parsed = parseFloat(value);
  const hasInput = value.trim() !== "" && !isNaN(parsed);

  let psi = 0;
  if (hasInput) {
    switch (activeUnit) {
      case "psi": psi = parsed; break;
      case "bar": psi = parsed / PSI_TO_BAR; break;
      case "kpa": psi = parsed / PSI_TO_KPA; break;
      case "atm": psi = parsed / PSI_TO_ATM; break;
      case "inhg": psi = parsed / PSI_TO_INHG; break;
    }
  }

  const results = {
    psi,
    bar: psi * PSI_TO_BAR,
    kpa: psi * PSI_TO_KPA,
    atm: psi * PSI_TO_ATM,
    inhg: psi * PSI_TO_INHG,
  };

  function loadRef(psiValue: string) {
    setActiveUnit("psi");
    setValue(psiValue);
  }

  function UnitRow({ unit, label, val, precision }: { unit: Unit; label: string; val: number; precision: number }) {
    const isActive = activeUnit === unit;
    return (
      <div className={`p-3 rounded-lg border ${isActive ? "border-primary bg-primary/5" : "border-gray-700"}`}>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</p>
        <p className={`text-xl font-bold font-mono ${isActive ? "text-primary" : "text-amber-400"} tracking-wide`}>
          {hasInput ? val.toFixed(precision) : "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Pressure Converter — PSI · Bar · kPa"
        description="Convert between psi, bar, kPa, atmospheres, and inches of mercury. For boost gauges, oil pressure, fuel pressure, and atmospheric reference."
        canonical="/calculators/pressure-converter"
        keywords="psi to bar, psi to kPa, boost pressure converter, bar to psi, kPa converter, inHg vacuum, oil pressure conversion"
      />
      <h1 className="text-3xl font-bold mb-2">Pressure Converter</h1>
      <p className="text-muted-foreground mb-8">PSI, bar, kPa, atm, and inHg — for boost gauges, oil pressure, and fuel rail conversions.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Enter Pressure</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-1 rounded-lg border overflow-hidden">
                {([
                  { u: "psi" as Unit, label: "PSI" },
                  { u: "bar" as Unit, label: "Bar" },
                  { u: "kpa" as Unit, label: "kPa" },
                  { u: "atm" as Unit, label: "Atm" },
                  { u: "inhg" as Unit, label: "inHg" },
                ]).map(({ u, label }) => (
                  <button
                    key={u}
                    className={`py-2.5 px-2 text-sm font-medium transition-colors ${activeUnit === u ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    onClick={() => setActiveUnit(u)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <Label>Value in {activeUnit === "psi" ? "PSI" : activeUnit === "bar" ? "Bar" : activeUnit === "kpa" ? "kPa" : activeUnit === "atm" ? "Atmospheres" : "inHg"}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="font-mono text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>All Units</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <UnitRow unit="psi" label="PSI" val={results.psi} precision={2} />
                <UnitRow unit="bar" label="Bar" val={results.bar} precision={3} />
                <UnitRow unit="kpa" label="kPa" val={results.kpa} precision={1} />
                <UnitRow unit="atm" label="Atmospheres" val={results.atm} precision={3} />
                <UnitRow unit="inhg" label="inHg" val={results.inhg} precision={2} />
              </div>
              <p className="text-xs text-gray-500 mt-4 italic">Gauge pressure (above atmosphere). For absolute pressure, add 14.7 psi / 1.013 bar.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Common Engine Pressures</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">PSI</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Bar</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">kPa</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Use</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceData.map(row => (
                    <tr key={row.psi + row.use} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td
                        className="py-2 pr-3 text-primary cursor-pointer hover:underline font-semibold"
                        onClick={() => loadRef(row.psi)}
                      >
                        {row.psi}
                      </td>
                      <td className="py-2 pr-3">{row.bar}</td>
                      <td className="py-2 pr-3">{row.kpa}</td>
                      <td className="py-2 font-sans text-muted-foreground text-xs">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any PSI value to load it into the converter.</p>
          </CardContent>
        </Card>
      </div>

      <CalculatorContent data={pressureConverterContent} title="Pressure Converter" />
    </div>
  );
}
