import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Unit = "f" | "c" | "k";

function fToC(f: number) { return (f - 32) * (5 / 9); }
function cToF(c: number) { return c * (9 / 5) + 32; }

interface RefRow {
  f: string;
  c: string;
  use: string;
  zone?: "cold" | "normal" | "hot" | "danger";
}

const referenceData: RefRow[] = [
  { f: "32", c: "0", use: "Water freezes (coolant won't flow)", zone: "cold" },
  { f: "70", c: "21", use: "Cold start / ambient (shop)", zone: "cold" },
  { f: "160", c: "71", use: "Engine just warming up", zone: "cold" },
  { f: "180", c: "82", use: "Stat opens (low-temp t-stat)", zone: "normal" },
  { f: "195", c: "91", use: "OEM thermostat operating temp", zone: "normal" },
  { f: "212", c: "100", use: "Water boils at 1 atm", zone: "normal" },
  { f: "230", c: "110", use: "Hot but acceptable (pressurized)", zone: "hot" },
  { f: "250", c: "121", use: "Oil pan typical max", zone: "hot" },
  { f: "260", c: "127", use: "Too hot — check cooling", zone: "danger" },
  { f: "300", c: "149", use: "Risk of detonation, oil breakdown", zone: "danger" },
  { f: "1200", c: "649", use: "Diesel EGT cruise", zone: "normal" },
  { f: "1450", c: "788", use: "Gasoline NA EGT (WOT)", zone: "normal" },
  { f: "1500", c: "816", use: "Diesel sustained EGT max", zone: "hot" },
  { f: "1600", c: "871", use: "Diesel peak — back off", zone: "danger" },
];

const zoneColor = {
  cold: "text-blue-400",
  normal: "text-emerald-400",
  hot: "text-amber-400",
  danger: "text-red-400",
};

export default function TemperatureConverter() {
  const [activeUnit, setActiveUnit] = useState<Unit>("f");
  const [value, setValue] = useState("");

  const parsed = parseFloat(value);
  const hasInput = value.trim() !== "" && !isNaN(parsed);

  let f = 0, c = 0;
  if (hasInput) {
    switch (activeUnit) {
      case "f": f = parsed; c = fToC(parsed); break;
      case "c": c = parsed; f = cToF(parsed); break;
      case "k": c = parsed - 273.15; f = cToF(c); break;
    }
  }
  const k = c + 273.15;

  function loadRef(fValue: string) {
    setActiveUnit("f");
    setValue(fValue);
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
        title="Temperature Converter — °F · °C · K"
        description="Convert between Fahrenheit, Celsius, and Kelvin. Includes common engine reference temperatures: coolant, oil, EGT."
        canonical="/calculators/temperature-converter"
        keywords="F to C, Fahrenheit to Celsius, Kelvin converter, EGT converter, coolant temperature, oil temperature converter"
      />
      <h1 className="text-3xl font-bold mb-2">Temperature Converter</h1>
      <p className="text-muted-foreground mb-8">Fahrenheit, Celsius, and Kelvin with reference temperatures for coolant, oil, and EGT.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Enter Temperature</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-1 rounded-lg border overflow-hidden">
                {([
                  { u: "f" as Unit, label: "°F" },
                  { u: "c" as Unit, label: "°C" },
                  { u: "k" as Unit, label: "Kelvin" },
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
                <Label>Value in {activeUnit === "f" ? "°F" : activeUnit === "c" ? "°C" : "Kelvin"}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
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
              <div className="grid grid-cols-3 gap-3">
                <UnitRow unit="f" label="Fahrenheit" val={f} precision={1} />
                <UnitRow unit="c" label="Celsius" val={c} precision={1} />
                <UnitRow unit="k" label="Kelvin" val={k} precision={1} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Engine Reference Temperatures</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">°F</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">°C</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Use</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceData.map(row => (
                    <tr key={row.f + row.use} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td
                        className={`py-2 pr-3 cursor-pointer hover:underline font-semibold ${row.zone ? zoneColor[row.zone] : "text-primary"}`}
                        onClick={() => loadRef(row.f)}
                      >
                        {row.f}°
                      </td>
                      <td className="py-2 pr-3">{row.c}°</td>
                      <td className="py-2 font-sans text-muted-foreground text-xs">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Click any °F value to load it. Color: <span className="text-blue-500">cold</span>, <span className="text-emerald-600">normal</span>, <span className="text-amber-600">hot</span>, <span className="text-red-500">danger</span>.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
