import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <SEOHead
        title="Horsepower & Torque Converter"
        description="Convert between horsepower and torque at any RPM. Bidirectional HP to torque calculator with Nm and kg-m conversions. Free engine builder tool."
        canonical="/calculators/hp-torque"
        keywords="hp to torque calculator, torque to horsepower, horsepower calculator, torque converter calculator, engine power calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Horsepower &amp; Torque Converter</h1>
      <p className="text-muted-foreground mb-8">Bidirectional HP↔Torque conversion with unit conversions. Enter HP or Torque — leave the other blank to calculate it.</p>

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

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Horsepower and Torque: The 5252 RPM Crossover</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            The relationship between horsepower and torque is defined by a single equation: HP = Torque (ft-lbs) times RPM divided by 5,252. This constant comes from the unit conversion between foot-pounds per minute and the definition of one horsepower (550 ft-lbs per second times 60 seconds, divided by 2 times pi). Because of this formula, every engine's horsepower and torque curves cross at exactly 5,252 RPM — at that speed, the two numbers are always equal. Below 5,252 RPM, torque is always numerically higher than horsepower. Above it, horsepower exceeds torque.
          </p>
          <p>
            For engine builders, this relationship matters when choosing components. Torque is what accelerates the vehicle — it is the twisting force at the crankshaft. Horsepower is the rate at which that torque is delivered over time, which is why high-revving engines can make big horsepower numbers despite modest torque. A truck engine making 400 lb-ft at 3,000 RPM produces 228 HP. A sport bike engine making 75 lb-ft at 12,000 RPM produces 171 HP from far less torque simply because it delivers it so quickly.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Classic Power Curves</h3>
          <p>
            The 1970 Chevrolet LT-1 350 was rated at 370 HP at 6,000 RPM and 380 lb-ft at 4,000 RPM — a broad, usable power band. Working backward: 380 lb-ft at 4,000 RPM = 289 HP, and 370 HP at 6,000 RPM = 324 lb-ft. A modern LS3 makes 430 HP at 5,900 RPM and 424 lb-ft at 4,600 RPM. When comparing engines, always note the RPM — a torque number without an RPM is meaningless.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
