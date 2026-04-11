import { useState } from "react";
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
    </div>
  );
}
