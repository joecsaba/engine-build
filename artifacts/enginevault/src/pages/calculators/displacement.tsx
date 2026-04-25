import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DisplacementCalculator() {
  const [bore, setBore] = useState("4.000");
  const [stroke, setStroke] = useState("3.480");
  const [cylinders, setCylinders] = useState("8");

  const b = parseFloat(bore) || 0;
  const s = parseFloat(stroke) || 0;
  const c = parseInt(cylinders) || 0;

  // Displacement = (bore * bore * stroke * 0.7854) * cylinders
  const cubicInches = (b * b * s * 0.7854) * c;
  const cc = cubicInches * 16.387064;
  const liters = cc / 1000;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <SEOHead
        title="Engine Displacement Calculator"
        description="Calculate engine displacement in cubic inches, CCs, and liters from bore, stroke, and cylinder count. Free tool for engine builders."
        canonical="/calculators/displacement"
        keywords="engine displacement calculator, cubic inch calculator, bore stroke calculator, engine size calculator, CID calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Engine Displacement Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate engine displacement in cubic inches, CCs, and liters.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Engine Specs</CardTitle>
            <CardDescription>Enter your bore, stroke, and cylinder count.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bore (inches)</Label>
              <Input type="number" step="0.001" value={bore} onChange={(e) => setBore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stroke (inches)</Label>
              <Input type="number" step="0.001" value={stroke} onChange={(e) => setStroke(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cylinders</Label>
              <Input type="number" step="1" value={cylinders} onChange={(e) => setCylinders(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium opacity-80">Cubic Inches (CID)</p>
              <p className="text-4xl font-bold">{cubicInches.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Liters (L)</p>
              <p className="text-4xl font-bold">{liters.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Cubic Centimeters (CC)</p>
              <p className="text-4xl font-bold">{cc.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Engine Displacement</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Engine displacement is the total swept volume of all pistons in an engine, calculated from bore diameter, stroke length, and cylinder count. It is the single most fundamental specification in any engine build because it directly determines the engine's airflow requirements, camshaft selection, fuel system sizing, and ultimately its power potential. The formula is simple: bore squared times stroke times 0.7854 (pi/4) times the number of cylinders.
          </p>
          <p>
            For engine builders, displacement matters most when planning overbores and stroker combinations. A standard small block Chevy 350 uses a 4.000" bore and 3.480" stroke across 8 cylinders for 349.8 cubic inches. Boring that block +0.030" to 4.030" increases displacement to 355 cubic inches. A common 383 stroker uses that same +0.030" overbore with a 3.750" stroke crankshaft, yielding 383 cubic inches from the same block. On the LS platform, the LS1 runs a 3.898" bore and 3.622" stroke for 346 cubic inches (5.7L), while the LS3 opens the bore to 4.065" for 376 cubic inches (6.2L).
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Common Displacement Reference</h3>
          <p>
            Ford 302 Windsor: 4.000" x 3.000" = 302ci. Ford 351W: 4.000" x 3.500" = 351ci. BBC 454: 4.251" x 4.000" = 454ci. Mopar 440: 4.320" x 3.750" = 440ci. Displacement in liters is cubic inches divided by 61.024 — so a 350 is 5.74L and a 454 is 7.44L.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
