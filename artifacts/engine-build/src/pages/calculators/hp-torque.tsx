import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import hpTorqueContent from "@/data/calculatorContent/hp-torque.mjs";
import { Info } from "lucide-react";

export default function HpTorqueCalculator() {
  const [hp, setHp] = useState("400");
  const [torque, setTorque] = useState("");
  const [rpm, setRpm] = useState("5252");

  const rpmNum = parseFloat(rpm) || 5252;
  const CROSSOVER = 5252;

  let calculatedHP = 0;
  let calculatedTorque = 0;

  if (hp && !torque) {
    calculatedHP = parseFloat(hp) || 0;
    calculatedTorque = (calculatedHP * CROSSOVER) / rpmNum;
  } else if (torque && !hp) {
    calculatedTorque = parseFloat(torque) || 0;
    calculatedHP = (calculatedTorque * rpmNum) / CROSSOVER;
  } else if (hp && torque) {
    calculatedHP = parseFloat(hp) || 0;
    calculatedTorque = parseFloat(torque) || 0;
  }

  const ftLbs = calculatedTorque;
  const nm = ftLbs * 1.35582;
  const kgm = ftLbs * 0.138255;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="HP to Torque Calculator | Horsepower & Torque Converter"
        description="Convert between horsepower and torque at any RPM. Free HP to torque calculator with Nm and kg-m conversions for engine builders and tuners."
        canonical="/calculators/hp-torque"
        keywords="hp to torque calculator, torque to horsepower, horsepower calculator, torque converter calculator, engine power calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Horsepower &amp; Torque Converter</h1>
      <p className="text-muted-foreground mb-8">Bidirectional HP↔Torque conversion with unit conversions. Enter HP or Torque — leave the other blank to calculate it.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Horsepower (HP) — leave blank to calculate</Label>
              <Input type="number" step="1" value={hp} placeholder="e.g. 400" onChange={e => setHp(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Torque (ft-lbs) — leave blank to calculate</Label>
              <Input type="number" step="1" value={torque} placeholder="e.g. 400" onChange={e => setTorque(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>RPM</Label>
              <Input type="number" step="100" value={rpm} onChange={e => setRpm(e.target.value)} />
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-mono font-medium">HP = (Torque × RPM) ÷ 5,252</p>
              <p className="text-muted-foreground mt-1 text-xs">The constant 5,252 comes from the conversion between ft-lbs and horsepower (1 HP = 550 ft-lbs/sec × 2π). At exactly 5,252 RPM, horsepower and torque are always equal.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Horsepower</p>
                <p className="text-5xl font-bold text-primary">{calculatedHP.toFixed(1)} HP</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Torque</p>
                <p className="text-5xl font-bold">{calculatedTorque.toFixed(1)} ft-lbs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Torque Unit Conversions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">ft-lbs</span>
                <span className="font-bold">{ftLbs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Newton-meters (Nm)</span>
                <span className="font-bold">{nm.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">kg-m</span>
                <span className="font-bold">{kgm.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>The 5,252 Crossover</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>At <strong>5,252 RPM</strong>, horsepower and torque are always numerically equal. This is a mathematical constant, not an engine property. Every engine's power and torque curves cross at this exact RPM.</p>
              {rpmNum === 5252 && (
                <p className="mt-2 text-primary font-medium">You're at the crossover RPM — HP equals Torque here by definition.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      </div>{/* end left column */}

      <aside className="xl:w-80 shrink-0 space-y-6">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-[#E85D04]" />
              Quick Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">The Formula</h4>
              <p>HP = (Torque x RPM) / 5,252. The constant comes from converting ft-lbs/min to horsepower (550 ft-lbs/sec x 60 / 2pi).</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">The 5,252 Crossover</h4>
              <p>At exactly 5,252 RPM, HP and torque are always numerically equal. Below that, torque is higher; above it, HP is higher.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Torque vs HP</h4>
              <p>Torque is the twisting force. Horsepower is the rate of work. High-revving engines make big HP from modest torque by delivering it faster.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Reference Power Curves</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>LT-1 350 (1970):</span><span className="font-mono">370HP/380TQ</span></li>
                <li className="flex justify-between"><span>LS3 6.2L:</span><span className="font-mono">430HP/424TQ</span></li>
                <li className="flex justify-between"><span>400 ft-lbs @ 3000:</span><span className="font-mono">= 228 HP</span></li>
                <li className="flex justify-between"><span>75 ft-lbs @ 12000:</span><span className="font-mono">= 171 HP</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <CalculatorContent data={hpTorqueContent} title="HP & Torque" />
    </div>
  );
}
