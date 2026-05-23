import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import { HelpSidebar } from "@/components/calculators/HelpCard";
import displacementContent from "@/data/calculatorContent/displacement.mjs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { BuildBanner } from "@/components/BuildBanner";
import { Info } from "lucide-react";
import { useManufacturers, useFamilies, useFamilyEngines } from "@/hooks/useEngineData";
import { PresetBar } from "@/components/presets/PresetBar";
import { useDefaultPlatform } from "@/hooks/useDefaultPlatform";

export default function DisplacementCalculator() {
  const platform = useDefaultPlatform();
  const [bore, setBore] = useBuildField("shortBlock.bore", platform?.bore ?? "4.000");
  const [stroke, setStroke] = useBuildField("shortBlock.stroke", platform?.stroke ?? "3.480");
  const [cylinders, setCylinders] = useBuildField("shortBlock.cylinders", platform?.cylinders ?? "8");
  const { activeBuild, setField } = useBuildContext();

  // Engine picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMfr, setPickerMfr] = useState("");
  const [pickerFamily, setPickerFamily] = useState("");
  const [pickerEngine, setPickerEngine] = useState("");
  const { manufacturers } = useManufacturers();
  const { families } = useFamilies();
  const { familyData } = useFamilyEngines(pickerMfr, pickerFamily);

  const filteredFamilies = families.filter(f => f.manufacturer_slug === pickerMfr);

  const handlePickerEngine = (engineId: string) => {
    setPickerEngine(engineId);
    if (!familyData) return;
    const eng = familyData.engines.find(e => e.engine_id === engineId);
    if (!eng) return;
    if (eng.bore_in) setBore(eng.bore_in.toFixed(3));
    if (eng.stroke_in) setStroke(eng.stroke_in.toFixed(3));
    if (eng.num_cylinders) setCylinders(String(eng.num_cylinders));
  };

  const b = parseFloat(bore) || 0;
  const s = parseFloat(stroke) || 0;
  const c = parseInt(cylinders) || 0;

  // Displacement = (bore * bore * stroke * 0.7854) * cylinders
  const cubicInches = (b * b * s * 0.7854) * c;
  const cc = cubicInches * 16.387064;
  const liters = cc / 1000;

  // Write computed displacement back to active build
  useEffect(() => {
    if (activeBuild && cubicInches > 0) {
      setField("computed.displacement", cubicInches.toFixed(1));
    }
  }, [cubicInches, activeBuild?.id]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Engine Displacement Calculator | Cubic Inches, CC & Liters"
        description="Calculate engine displacement in cubic inches, CCs, and liters from bore, stroke, and cylinder count. Free tool for engine builders."
        canonical="/calculators/displacement"
        keywords="engine displacement calculator, cubic inch calculator, bore stroke calculator, engine size calculator, CID calculator"
      />
      <BuildBanner savedFields={[
        { label: "Displacement", key: "computed.displacement", value: cubicInches > 0 ? cubicInches.toFixed(1) : "", suffix: " ci" },
        { label: "Liters", key: "computed.displacementL", value: liters > 0 ? liters.toFixed(2) : "", suffix: "L" },
      ]} />
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <h1 className="text-3xl font-bold">Engine Displacement Calculator</h1>
        <PresetBar
          calcSlug="displacement"
          state={{ bore, stroke, cylinders }}
          onLoad={(s) => {
            if (typeof s.bore === "string") setBore(s.bore);
            if (typeof s.stroke === "string") setStroke(s.stroke);
            if (typeof s.cylinders === "string") setCylinders(s.cylinders);
          }}
        />
      </div>
      <p className="text-muted-foreground mb-8">Calculate engine displacement in cubic inches, CCs, and liters.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Engine Specs</CardTitle>
            <CardDescription>Enter your bore, stroke, and cylinder count.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="text-sm font-medium text-[#E85D04] hover:underline"
              >
                {showPicker ? "Hide engine picker \u2191" : "Auto-fill from engine database \u2193"}
              </button>
              {showPicker && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Manufacturer</Label>
                    <Select value={pickerMfr} onValueChange={v => { setPickerMfr(v); setPickerFamily(""); setPickerEngine(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {manufacturers.map(m => (
                          <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Family</Label>
                    <Select value={pickerFamily} onValueChange={v => { setPickerFamily(v); setPickerEngine(""); }} disabled={!pickerMfr}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {filteredFamilies.map(f => (
                          <SelectItem key={f.family_slug} value={f.family_slug}>{f.family_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Engine</Label>
                    <Select value={pickerEngine} onValueChange={handlePickerEngine} disabled={!familyData}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {familyData?.engines.map(e => (
                          <SelectItem key={e.engine_id} value={e.engine_id}>
                            {e.displacement_ci ? `${e.displacement_ci}ci` : ""} {e.year || ""} {e.variants?.[0]?.code || e.engine_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
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

      </div>{/* end left column */}

      <HelpSidebar className="xl:w-80 shrink-0 space-y-6">
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
              <p>Bore² x Stroke x 0.7854 x Cylinders = Displacement (cubic inches). Divide by 61.024 for liters.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Why It Matters</h4>
              <p>Displacement determines airflow needs, cam selection, fuel system sizing, and power potential. It's the starting point for every build decision.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Overbore Effect</h4>
              <p>Boring +0.030" on a 4.000" bore adds ~5 cubic inches on a V8. A 383 stroker uses +0.030" bore with a 3.750" stroke crank.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Common Engines</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>SBC 350:</span><span className="font-mono">4.000" x 3.480"</span></li>
                <li className="flex justify-between"><span>383 Stroker:</span><span className="font-mono">4.030" x 3.750"</span></li>
                <li className="flex justify-between"><span>LS1 5.7L:</span><span className="font-mono">3.898" x 3.622"</span></li>
                <li className="flex justify-between"><span>LS3 6.2L:</span><span className="font-mono">4.065" x 3.622"</span></li>
                <li className="flex justify-between"><span>Ford 302:</span><span className="font-mono">4.000" x 3.000"</span></li>
                <li className="flex justify-between"><span>BBC 454:</span><span className="font-mono">4.251" x 4.000"</span></li>
                <li className="flex justify-between"><span>Mopar 440:</span><span className="font-mono">4.320" x 3.750"</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </HelpSidebar>

      </div>{/* end flex row */}

      <CalculatorContent data={displacementContent} title="Engine Displacement" />
    </div>
  );
}
