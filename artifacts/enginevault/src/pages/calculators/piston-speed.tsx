import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { BuildBanner } from "@/components/BuildBanner";
import { Info } from "lucide-react";
import { useManufacturers, useFamilies, useFamilyEngines } from "@/hooks/useEngineData";

const refEngines = [
  { name: "Stock SBC 350 (5500 RPM redline)", stroke: 3.48, rpm: 5500, meanFpm: 3190 },
  { name: "LS1 5.7L (6500 RPM redline)", stroke: 3.622, rpm: 6500, meanFpm: 3924 },
  { name: "LS7 7.0L (7100 RPM redline)", stroke: 4.000, rpm: 7100, meanFpm: 4733 },
  { name: "Ford 302 Windsor (6500 RPM)", stroke: 3.000, rpm: 6500, meanFpm: 3250 },
  { name: "Honda K20A (8000 RPM)", stroke: 3.386, rpm: 8000, meanFpm: 4515 },
  { name: "Toyota 2JZ-GTE (7000 RPM)", stroke: 3.386, rpm: 7000, meanFpm: 3951 },
  { name: "Drag race SBC (8500+ RPM)", stroke: 3.250, rpm: 8500, meanFpm: 4604 },
  { name: "NASCAR Cup V8 (~9000 RPM)", stroke: 3.480, rpm: 9000, meanFpm: 5220 },
];

function getSpeedZone(fpm: number): { label: string; color: string; bg: string } {
  if (fpm < 2500) return { label: "Conservative — well within limits", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
  if (fpm < 3500) return { label: "Normal street use — safe", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (fpm < 4500) return { label: "Caution — Performance territory, quality parts needed", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "Extreme — Race use only, premium components required", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function PistonSpeedCalculator() {
  const [stroke, setStroke] = useBuildField("shortBlock.stroke", "3.622");
  const [rpm, setRpm] = useBuildField("meta.targetRPM", "6500");
  const { activeBuild, setField: setBuildField } = useBuildContext();

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
    if (eng.stroke_in) setStroke(eng.stroke_in.toFixed(3));
  };

  const s = parseFloat(stroke) || 0;
  const r = parseFloat(rpm) || 0;

  const meanFpm = (2 * s * r) / 12;
  const peakFpm = meanFpm * (Math.PI / 2);

  const zone = getSpeedZone(meanFpm);

  // Write results back to build
  useEffect(() => {
    if (activeBuild && meanFpm > 0) {
      setBuildField("computed.pistonSpeedMean", meanFpm.toFixed(0));
      setBuildField("computed.pistonSpeedPeak", peakFpm.toFixed(0));
    }
  }, [meanFpm, activeBuild?.id]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Piston Speed Calculator | Mean & Peak FPM"
        description="Calculate mean and peak piston speed in feet per minute. Color-coded safety zones for street and race engines. Free tool for engine builders."
        canonical="/calculators/piston-speed"
        keywords="piston speed calculator, mean piston speed, peak piston speed, engine RPM limit calculator, piston velocity calculator"
      />
      <BuildBanner savedFields={[
        { label: "Mean Speed", key: "computed.pistonSpeedMean", value: meanFpm > 0 ? meanFpm.toFixed(0) : "", suffix: " FPM" },
        { label: "Peak Speed", key: "computed.pistonSpeedPeak", value: peakFpm > 0 ? peakFpm.toFixed(0) : "", suffix: " FPM" },
      ]} />
      <h1 className="text-3xl font-bold mb-2">Piston Speed Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate mean and peak piston speed in feet per minute. Color-coded safety zones for street and race applications.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
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
            <div className="space-y-1">
              <Label>Stroke (inches)</Label>
              <Input type="number" step="0.001" value={stroke} onChange={e => setStroke(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>RPM</Label>
              <Input type="number" step="100" value={rpm} onChange={e => setRpm(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Mean Piston Speed</p>
                <p className="text-5xl font-bold text-primary">{meanFpm.toFixed(0)}</p>
                <p className="text-gray-400 text-sm">ft/min</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Peak Piston Speed</p>
                <p className="text-3xl font-bold">{peakFpm.toFixed(0)} ft/min</p>
              </div>
            </CardContent>
          </Card>

          <div className={`p-4 rounded-lg border ${zone.bg}`}>
            <p className={`font-bold ${zone.color}`}>{zone.label}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Reference: Common Engine Redlines</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left p-3">Engine</th>
                  <th className="text-right p-3">Stroke</th>
                  <th className="text-right p-3">Redline</th>
                  <th className="text-right p-3">Mean FPM</th>
                </tr>
              </thead>
              <tbody>
                {refEngines.map((e, i) => {
                  const fpm = (2 * e.stroke * e.rpm) / 12;
                  const z = getSpeedZone(fpm);
                  return (
                    <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                      <td className="p-3">{e.name}</td>
                      <td className="text-right p-3">{e.stroke}"</td>
                      <td className="text-right p-3">{e.rpm.toLocaleString()}</td>
                      <td className={`text-right p-3 font-bold ${z.color}`}>{fpm.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
              <p>Mean FPM = (2 x Stroke x RPM) / 12. Peak speed is approximately 1.6x mean for typical rod ratios.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Safety Zones</h4>
              <ul className="space-y-1 mt-1">
                <li><span className="font-medium text-foreground">&lt; 3,500 FPM:</span> Safe for stock components</li>
                <li><span className="font-medium text-foreground">3,500-4,500:</span> Forged pistons, quality rod bolts required</li>
                <li><span className="font-medium text-foreground">&gt; 4,500:</span> Race-only, premium rotating assembly</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Why It Matters</h4>
              <p>Piston speed is the real RPM limiter. Higher speed = thinner rod bearing oil film, ring flutter risk, and exponentially climbing inertial loads.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Common Engines at Redline</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>SBC 350 @ 5500:</span><span className="font-mono">3,190 FPM</span></li>
                <li className="flex justify-between"><span>LS1 @ 6500:</span><span className="font-mono">3,924 FPM</span></li>
                <li className="flex justify-between"><span>LS7 @ 7100:</span><span className="font-mono">4,733 FPM</span></li>
                <li className="flex justify-between"><span>Ford 302 @ 6500:</span><span className="font-mono">3,250 FPM</span></li>
                <li className="flex justify-between"><span>Honda K20 @ 8000:</span><span className="font-mono">4,515 FPM</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Mean Piston Speed and Engine RPM Limits</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Mean piston speed (MPS) is the average velocity of the piston as it travels up and down the bore, calculated as (2 x Stroke x RPM) / 12, expressed in feet per minute. It is the primary factor limiting how fast an engine can safely rev. Pistons, rings, rod bearings, and wrist pins all have material limits, and exceeding safe piston speeds leads to ring flutter, bearing failure, and ultimately catastrophic connecting rod failure.
          </p>
          <p>
            Safe piston speed zones are well established: below 3,500 FPM is comfortable for street engines with standard components, 3,500-4,500 FPM is the performance range requiring quality forged components, and above 4,500 FPM is race-only territory demanding the best rods, pistons, and fasteners available. A Chevy 350 with its 3.480" stroke reaches 3,480 FPM at 6,000 RPM — right at the street limit. Push it to 7,000 RPM and you are at 4,060 FPM, firmly in performance territory.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Why Short Strokes Rev Higher</h3>
          <p>
            A shorter stroke means less piston travel per revolution, which directly reduces mean piston speed at any given RPM. The Ford 302 with its 3.000" stroke only reaches 3,250 FPM at 6,500 RPM — well within safe limits. This is why short-stroke engines like the 302, Honda B16, and Ferrari flat-plane V8s can safely rev to 7,000-9,000 RPM, while long-stroke torque motors like the BBC 454 (4.000" stroke) hit 4,000 FPM at just 6,000 RPM. When planning your rev limit, calculate MPS first and work backward to a safe RPM ceiling for your components.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
