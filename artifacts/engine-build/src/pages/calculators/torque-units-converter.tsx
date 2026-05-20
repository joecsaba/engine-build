import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Reference values per ft-lb (NIST):
// 1 ft-lb = 1.3558179483 N·m
// 1 ft-lb = 12 in-lb
// 1 ft-lb = 0.13825495 kgf·m
const FTLB_TO_NM = 1.3558179483;
const FTLB_TO_INLB = 12;
const FTLB_TO_KGFM = 0.13825495;

type Unit = "ftlb" | "nm" | "inlb" | "kgfm";

interface RefRow {
  ftlb: string;
  nm: string;
  inlb: string;
  use: string;
}

const referenceData: RefRow[] = [
  { ftlb: "10", nm: "13.6", inlb: "120", use: "Valve cover, small fasteners" },
  { ftlb: "18", nm: "24.4", inlb: "216", use: "Intake manifold (typical)" },
  { ftlb: "25", nm: "33.9", inlb: "300", use: "Oil pan, water pump" },
  { ftlb: "35", nm: "47.5", inlb: "420", use: "Exhaust manifold" },
  { ftlb: "45", nm: "61.0", inlb: "540", use: "Rod bolts (small block, OEM)" },
  { ftlb: "65", nm: "88.1", inlb: "780", use: "Main caps (small block)" },
  { ftlb: "70", nm: "94.9", inlb: "840", use: "Head bolts (SBC OEM stage)" },
  { ftlb: "85", nm: "115.2", inlb: "1020", use: "Head bolts (BBC OEM stage)" },
  { ftlb: "100", nm: "135.6", inlb: "1200", use: "Flywheel, harmonic balancer" },
  { ftlb: "120", nm: "162.7", inlb: "1440", use: "Pulley/crank bolt (large)" },
];

export default function TorqueUnitsConverter() {
  const [activeUnit, setActiveUnit] = useState<Unit>("ftlb");
  const [value, setValue] = useState("");

  const parsed = parseFloat(value);
  const hasInput = value.trim() !== "" && !isNaN(parsed);

  let ftlb = 0;
  if (hasInput) {
    switch (activeUnit) {
      case "ftlb": ftlb = parsed; break;
      case "nm": ftlb = parsed / FTLB_TO_NM; break;
      case "inlb": ftlb = parsed / FTLB_TO_INLB; break;
      case "kgfm": ftlb = parsed / FTLB_TO_KGFM; break;
    }
  }

  const results = {
    ftlb,
    nm: ftlb * FTLB_TO_NM,
    inlb: ftlb * FTLB_TO_INLB,
    kgfm: ftlb * FTLB_TO_KGFM,
  };

  function loadRef(ftlbValue: string) {
    setActiveUnit("ftlb");
    setValue(ftlbValue);
  }

  function UnitRow({ unit, label, val, precision }: { unit: Unit; label: string; val: number; precision: number }) {
    const isActive = activeUnit === unit;
    return (
      <div className={`p-3 rounded-lg border ${isActive ? "border-primary bg-primary/5" : "border-gray-700"}`}>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono ${isActive ? "text-primary" : "text-amber-400"} tracking-wide`}>
          {hasInput ? val.toFixed(precision) : "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Torque Units Converter — ft-lb · Nm · in-lb"
        description="Convert between foot-pounds, Newton-meters, inch-pounds, and kgf·m. Common engine torque references included."
        canonical="/calculators/torque-units-converter"
        keywords="ft-lb to Nm, torque converter, inch pounds to foot pounds, Newton meter converter, engine torque chart"
      />
      <h1 className="text-3xl font-bold mb-2">Torque Units Converter</h1>
      <p className="text-muted-foreground mb-8">Foot-pounds, Newton-meters, inch-pounds, and kgf·m. Pick any unit, enter once, see all four.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Enter Value</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-1 rounded-lg border overflow-hidden">
                {([
                  { u: "ftlb" as Unit, label: "ft-lb" },
                  { u: "nm" as Unit, label: "Nm" },
                  { u: "inlb" as Unit, label: "in-lb" },
                  { u: "kgfm" as Unit, label: "kgf·m" },
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
                <Label>Value in {activeUnit === "ftlb" ? "ft-lb" : activeUnit === "nm" ? "Newton-meters" : activeUnit === "inlb" ? "in-lb" : "kgf·m"}</Label>
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
                <UnitRow unit="ftlb" label="Foot-pounds" val={results.ftlb} precision={2} />
                <UnitRow unit="nm" label="Newton-meters" val={results.nm} precision={2} />
                <UnitRow unit="inlb" label="Inch-pounds" val={results.inlb} precision={1} />
                <UnitRow unit="kgfm" label="kgf · m" val={results.kgfm} precision={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Common Engine Torque References</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">ft-lb</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nm</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">in-lb</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Use</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceData.map(row => (
                    <tr key={row.ftlb + row.use} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td
                        className="py-2 pr-3 text-primary cursor-pointer hover:underline font-semibold"
                        onClick={() => loadRef(row.ftlb)}
                      >
                        {row.ftlb}
                      </td>
                      <td className="py-2 pr-3">{row.nm}</td>
                      <td className="py-2 pr-3">{row.inlb}</td>
                      <td className="py-2 font-sans text-muted-foreground text-xs">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any ft-lb value to load it. Always confirm with the OEM service manual or ARP spec sheet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
