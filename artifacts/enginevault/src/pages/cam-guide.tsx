import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/PageHeader";

const mistakes = [
  { num: 1, title: "Choosing cam by LSA alone", desc: "LSA is just one factor. Duration, lift, and your specific combo all matter more." },
  { num: 2, title: "Too much cam for the compression ratio", desc: "High-overlap cams bleed cylinder pressure at low RPM. If your CR is under 9:1, a big cam won't make power." },
  { num: 3, title: "Ignoring torque converter stall speed (auto trans)", desc: "Your converter must stall at or above your cam's power band. A big cam with a stock 1400 RPM stall = sluggish." },
  { num: 4, title: "Not matching cam to heads and intake", desc: "A cam that flows 750+ CFM heads into a stock intake is waste. Match all three." },
  { num: 5, title: "Skipping the cam break-in procedure (flat tappet)", desc: "Flat tappet cams require an immediate 2000 RPM 20-minute break-in. Skip it and you'll wipe the lobes." },
  { num: 6, title: "Installing a cam without degreeing it", desc: "Even cams marked 'straight up' can be off by 2-4 degrees from the grinder. Degree it." },
  { num: 7, title: "Using wrong oil for flat tappet cams", desc: "Modern API SM/SN oil has insufficient ZDDP. Use cam break-in additive or purpose-built break-in oil." },
  { num: 8, title: "Neglecting valve spring specs", desc: "A cam with higher lift often needs stiffer springs. Coil bind or spring float kills power and destroys valvetrain." },
  { num: 9, title: "Matching cam to RPM peak instead of RPM range", desc: "You don't live at peak power. Choose cam that makes the car fun to drive at your typical driving RPM." },
  { num: 10, title: "Assuming advertised specs are comparable between manufacturers", desc: "Advertised duration is measured at different checking clearances. Always compare at 0.050\" lift." },
];

function calcRecommended(inputs: Record<string, string>): string | null {
  const disp = parseFloat(inputs.displacement);
  const cr = parseFloat(inputs.compressionRatio);
  const cfm = parseFloat(inputs.headFlow);
  const rpmPeak = parseFloat(inputs.rpmPeak);
  const trans = inputs.transmission;
  const stall = parseFloat(inputs.stall);
  const use = inputs.use;
  const asp = inputs.aspiration;

  if (!disp || !cr || !rpmPeak) return null;

  let minDuration = 200;
  let maxDuration = 220;
  let lsaMin = 110;
  let lsaMax = 114;
  let liftRange = "0.480\"–0.520\"";

  if (rpmPeak > 6000) { minDuration += 15; maxDuration += 20; lsaMin -= 2; }
  else if (rpmPeak > 5000) { minDuration += 8; maxDuration += 10; }

  if (cr > 11) { lsaMin++; lsaMax++; }
  if (asp === "turbo" || asp === "supercharged") { lsaMin += 4; lsaMax += 4; minDuration -= 5; }

  if (use === "daily") { minDuration -= 8; maxDuration -= 8; lsaMin += 2; }
  if (use === "drag") { minDuration += 5; maxDuration += 5; lsaMin -= 2; }

  if (trans === "auto" && stall < 2500) { minDuration -= 5; maxDuration -= 5; lsaMin += 2; }

  if (cfm > 250) { minDuration += 5; maxDuration += 5; liftRange = "0.520\"–0.580\""; }

  return `Based on your combination, the recommended camshaft is approximately:

• Duration at 0.050": ${minDuration}°–${maxDuration}°
• LSA: ${lsaMin}°–${lsaMax}°  
• Valve Lift: ${liftRange}

WHY THESE NUMBERS:
${rpmPeak > 5500 ? `• Your ${rpmPeak} RPM target requires the longer duration (${minDuration}–${maxDuration}°) to keep the valves open long enough to fill the cylinders at speed. ` : `• Your ${rpmPeak} RPM target favors shorter duration for better low-end torque and drivability. `}${cr > 10.5 ? `• Your ${cr}:1 compression ratio benefits from a slightly wider LSA (${lsaMin}°–${lsaMax}°) to reduce cylinder pressure at low RPM and prevent detonation on pump gas. ` : ""}${asp !== "na" ? `• Forced induction application calls for a wider LSA — boost already fills the cylinders, and more overlap bleeds pressure. Less duration is often better for boosted engines. ` : ""}${use === "daily" ? `• Daily driver use favors shorter duration and wider LSA for better idle quality, lower RPM torque, and drivability. ` : ""}${trans === "auto" && stall < 2500 ? `• With an automatic and low stall converter (<2500 RPM), keep duration modest — a big cam with a stock converter feels like driving in sand. ` : ""}`;
}

export default function CamGuide() {
  const [cam1, setCam1] = useState({ duration: "218", lsa: "112", lift: "0.520" });
  const [cam2, setCam2] = useState({ duration: "232", lsa: "108", lift: "0.580" });
  const [inputs, setInputs] = useState<Record<string, string>>({
    displacement: "", compressionRatio: "", headFlow: "", rpmIdle: "", rpmPeak: "",
    transmission: "manual", stall: "", weight: "", gear: "", aspiration: "na", use: "weekend"
  });
  const [result, setResult] = useState<string | null>(null);

  const setInput = (key: string, val: string) => setInputs(prev => ({ ...prev, [key]: val }));

  const handleCalc = () => setResult(calcRecommended(inputs));

  const dur1 = parseFloat(cam1.duration) || 0;
  const dur2 = parseFloat(cam2.duration) || 0;
  const lsa1 = parseFloat(cam1.lsa) || 0;
  const lsa2 = parseFloat(cam2.lsa) || 0;

  return (
    <div>
      <PageHeader
        eyebrow="Camshaft"
        title="Camshaft Selection Guide"
        subtitle="The systematic approach to selecting the right cam for your combo. Not a magic cam picker — a real guide to understanding the decision."
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
      {/* Section 1: Understanding Cam Specs */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Section 1: Understanding Cam Specs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { term: "Duration at 0.050\"", def: "The industry-standard measurement of how many crankshaft degrees the valve is open more than 0.050\" lift. This is the only number you can reliably compare between cam brands." },
            { term: "Advertised Duration", def: "Duration measured at a low lift point (varies by manufacturer — 0.004\" to 0.006\"). NOT comparable between brands. Used for marketing." },
            { term: "Lift", def: "Maximum distance the valve opens, in inches. Determined by: lobe lift × rocker ratio. More lift generally means more airflow potential, but valve springs, geometry, and head port size all limit the useful lift." },
            { term: "Lobe Separation Angle (LSA)", def: "The angle between the intake and exhaust lobe centerlines, measured in camshaft degrees. Affects overlap, idle quality, and power band. Narrow LSA = more overlap, peakier power, rough idle. Wide LSA = less overlap, smoother idle, better vacuum, broader power." },
            { term: "Intake Centerline (ICL)", def: "The crankshaft degree position at which the intake lobe reaches maximum lift (after TDC). Installing a cam advanced or retarded from this spec shifts the power band up or down in RPM." },
            { term: "Overlap", def: "The period in crankshaft degrees when both intake AND exhaust valves are simultaneously open. More overlap = more power potential at high RPM, worse idle, worse low-end torque, lower vacuum. The cam that sounds like a race car at idle has lots of overlap." },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              <p className="font-bold mb-1">{item.term}</p>
              <p className="text-sm text-muted-foreground">{item.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Cam Comparison */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Section 2: Cam Profile Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[{ label: "Cam A", data: cam1, set: setCam1 }, { label: "Cam B", data: cam2, set: setCam2 }].map(({ label, data, set }) => (
            <Card key={label}>
              <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Duration at 0.050" (degrees)</Label>
                  <Input type="number" value={data.duration} onChange={e => set(p => ({ ...p, duration: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>LSA (degrees)</Label>
                  <Input type="number" value={data.lsa} onChange={e => set(p => ({ ...p, lsa: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Lift at valve (inches)</Label>
                  <Input type="number" step="0.001" value={data.lift} onChange={e => set(p => ({ ...p, lift: e.target.value }))} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Comparison Analysis</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Duration difference:</strong> Cam B is {Math.abs(dur2 - dur1)}° {dur2 > dur1 ? "longer" : "shorter"}. {dur2 > dur1 ? "Cam B will need more RPM to make power. It will idle rougher and likely need a higher stall converter if using an automatic." : "Cam A will make more low-end torque and idle better, while Cam B peaks higher in the RPM range."}</p>
            <p><strong>LSA difference:</strong> Cam {lsa1 < lsa2 ? "A" : "B"} has the tighter LSA ({Math.min(lsa1, lsa2)}°). The tighter-LSA cam will have {Math.abs(lsa2 - lsa1) * 2}° more overlap, resulting in a rougher idle, lower engine vacuum, and a narrower (but potentially higher) power peak.</p>
            <p><strong>Lift difference:</strong> {parseFloat(cam2.lift) > parseFloat(cam1.lift) ? `Cam B has ${((parseFloat(cam2.lift) - parseFloat(cam1.lift)) * 1000).toFixed(0)} thou more lift. Verify your valve springs can handle ${cam2.lift}" lift without coil bind.` : `Cam A has higher lift. Both require adequate spring rate and geometry check.`}</p>
          </CardContent>
        </Card>
      </section>

      {/* Section 3: Cam Selection Checklist */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Section 3: Cam Selection Checklist</h2>
        <Card className="mb-6">
          <CardHeader><CardTitle>Your Combo</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Displacement (ci)</Label>
              <Input placeholder="e.g. 383" value={inputs.displacement} onChange={e => setInput("displacement", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Compression Ratio</Label>
              <Input placeholder="e.g. 10.5" value={inputs.compressionRatio} onChange={e => setInput("compressionRatio", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Head Flow (CFM at 0.500" lift)</Label>
              <Input placeholder="e.g. 220" value={inputs.headFlow} onChange={e => setInput("headFlow", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Target RPM Peak</Label>
              <Input placeholder="e.g. 6000" value={inputs.rpmPeak} onChange={e => setInput("rpmPeak", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Transmission</Label>
              <Select value={inputs.transmission} onValueChange={v => setInput("transmission", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inputs.transmission === "auto" && (
              <div className="space-y-1">
                <Label>Converter Stall Speed (RPM)</Label>
                <Input placeholder="e.g. 2800" value={inputs.stall} onChange={e => setInput("stall", e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Aspiration</Label>
              <Select value={inputs.aspiration} onValueChange={v => setInput("aspiration", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="na">Naturally Aspirated</SelectItem>
                  <SelectItem value="turbo">Turbocharged</SelectItem>
                  <SelectItem value="supercharged">Supercharged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Primary Use</Label>
              <Select value={inputs.use} onValueChange={v => setInput("use", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Driver</SelectItem>
                  <SelectItem value="weekend">Weekend Cruise</SelectItem>
                  <SelectItem value="drag">Drag Racing</SelectItem>
                  <SelectItem value="road-race">Road Racing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <button onClick={handleCalc} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors mb-6">
          Get Cam Recommendation
        </button>

        {result && (
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Recommendation</CardTitle></CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">{result}</pre>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section 4: Common Mistakes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Section 4: Top 10 Cam Selection Mistakes</h2>
        <div className="space-y-3">
          {mistakes.map(m => (
            <div key={m.num} className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">{m.num}</div>
              <div>
                <p className="font-bold">{m.title}</p>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Flat Tappet vs Roller */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Section 5: Flat Tappet vs. Roller Cam</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border">Factor</th>
                <th className="text-left p-3 border">Flat Tappet (Hydraulic)</th>
                <th className="text-left p-3 border">Hydraulic Roller</th>
                <th className="text-left p-3 border">Solid Roller</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Cost", "$100–$400", "$400–$1,000", "$800–$2,500"],
                ["Durability", "Good (with proper oil)", "Excellent", "Excellent (with maintenance)"],
                ["Break-in required", "Yes — critical 20-min 2000 RPM", "No", "No"],
                ["ZDDP oil required", "Yes — API SM/SN is insufficient", "No", "No"],
                ["Max RPM", "~6,500 (typical street)", "~7,000+", "8,000+ (race)"],
                ["Lift rate", "Limited by lobe radius constraints", "Aggressive — faster lift possible", "Most aggressive"],
                ["Adjustability", "Non-adjustable (hydraulic)", "Non-adjustable", "Regular lash adjustment needed"],
                ["Best for", "Budget builds, stock replacement, vintage", "Most performance street builds", "Race engines, high-RPM builds"],
              ].map(([factor, ...vals], i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <td className="p-3 border font-medium">{factor}</td>
                  {vals.map((v, j) => <td key={j} className="p-3 border">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>ZDDP Warning for Flat Tappet Cams:</strong> Modern API SM and SN engine oils have reduced zinc dialkyldithiophosphate (ZDDP) to protect catalytic converters. This is fatal for flat tappet cams. Use Driven HR3, Valvoline VR1, or add a ZDDP supplement (COMP Cams, ZDDPlus) for the first 1,000 miles minimum.
        </div>
      </section>
      </div>
    </div>
  );
}
