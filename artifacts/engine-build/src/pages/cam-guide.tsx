import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import type { CamRecommendation } from "@/context/BuildContext";
import { useBuildContext } from "@/context/BuildContext";
import { BuildBanner } from "@/components/BuildBanner";
import VizardCamCalculator from "@/pages/calculators/cam-duration";
import ValvetrainBuilder from "@/pages/calculators/valvetrain-builder";

type CamTypeKey = "hydraulic_flat" | "hydraulic_roller" | "solid_flat" | "solid_roller";

const CAM_SPRING_SPECS: Record<CamTypeKey, {
  name: string;
  minSeat: number;
  maxSeat: number;
  rpmFactor: number;
  baseOpen: number;
  springType: string;
  note: string;
}> = {
  hydraulic_flat: {
    name: "Hydraulic Flat Tappet",
    minSeat: 90, maxSeat: 120,
    rpmFactor: 0.038, baseOpen: 240,
    springType: "Single with damper",
    note: "Flat tappet lobe is limited by lobe radius. High seat pressure can cause premature lobe wear. Keep seat load in the 90–120 lb range and use a ZDDP-fortified oil.",
  },
  hydraulic_roller: {
    name: "Hydraulic Roller",
    minSeat: 110, maxSeat: 145,
    rpmFactor: 0.045, baseOpen: 280,
    springType: "Dual-wound (over 0.540\" lift)",
    note: "Most common performance street cam. Open pressure requirement climbs with RPM. Above 0.560\" lift a quality dual spring is strongly recommended.",
  },
  solid_flat: {
    name: "Solid Flat Tappet",
    minSeat: 130, maxSeat: 165,
    rpmFactor: 0.055, baseOpen: 340,
    springType: "Dual-wound",
    note: "No hydraulic preload — the spring must control lash ramp precisely. Higher seat pressure prevents lash chatter and float on the closing ramp at rpm.",
  },
  solid_roller: {
    name: "Solid Roller",
    minSeat: 160, maxSeat: 220,
    rpmFactor: 0.070, baseOpen: 480,
    springType: "Dual or triple with Ti retainers",
    note: "Aggressive lobe profiles demand the most from valve springs. Inadequate open pressure on a solid roller will cause valve float that destroys the engine at high RPM.",
  },
};


type CalcResult = {
  text: string;
  structured: CamRecommendation;
};

function calcRecommended(inputs: Record<string, string>): CalcResult | null {
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

  const overlapMin = minDuration - 2 * lsaMax;
  const overlapMax = maxDuration - 2 * lsaMin;

  const text = `Based on your combination, the recommended camshaft is approximately:

• Duration at 0.050": ${minDuration}°–${maxDuration}°
• LSA: ${lsaMin}°–${lsaMax}°  
• Valve Lift: ${liftRange}
• Estimated Overlap: ${overlapMin}°–${overlapMax}°

WHY THESE NUMBERS:
${rpmPeak > 5500 ? `• Your ${rpmPeak} RPM target requires the longer duration (${minDuration}–${maxDuration}°) to keep the valves open long enough to fill the cylinders at speed. ` : `• Your ${rpmPeak} RPM target favors shorter duration for better low-end torque and drivability. `}${cr > 10.5 ? `• Your ${cr}:1 compression ratio benefits from a slightly wider LSA (${lsaMin}°–${lsaMax}°) to reduce cylinder pressure at low RPM and prevent detonation on pump gas. ` : ""}${asp !== "na" ? `• Forced induction application calls for a wider LSA — boost already fills the cylinders, and more overlap bleeds pressure. Less duration is often better for boosted engines. ` : ""}${use === "daily" ? `• Daily driver use favors shorter duration and wider LSA for better idle quality, lower RPM torque, and drivability. ` : ""}${trans === "auto" && stall < 2500 ? `• With an automatic and low stall converter (<2500 RPM), keep duration modest — a big cam with a stock converter feels like driving in sand. ` : ""}`;

  return {
    text,
    structured: {
      durationRange: `${minDuration}°–${maxDuration}°`,
      lsaRange: `${lsaMin}°–${lsaMax}°`,
      liftRange,
      summary: `${minDuration}°–${maxDuration}° dur · ${lsaMin}°–${lsaMax}° LSA · ${liftRange} lift · ~${overlapMin}–${overlapMax}° overlap`,
      savedAt: Date.now(),
    },
  };
}

// ── Simple Cam Timing Calculator ──────────────────────────────────────────────

function overlapBadge(ov: number) {
  if (ov < 25)  return { label: "Very Mild / Towing",       bg: "bg-green-50  border-green-300",  text: "text-green-700"  };
  if (ov < 45)  return { label: "Mild Street / Torque",     bg: "bg-green-50  border-green-300",  text: "text-green-700"  };
  if (ov < 65)  return { label: "Street Performance",       bg: "bg-yellow-50 border-yellow-300", text: "text-yellow-700" };
  if (ov < 85)  return { label: "Street / Strip",           bg: "bg-orange-50 border-orange-300", text: "text-orange-700" };
  return              { label: "Race Only",                  bg: "bg-red-50    border-red-300",    text: "text-red-700"    };
}

function SimpleCamTiming() {
  const [intAdv,  setIntAdv]  = useState("270");
  const [exhAdv,  setExhAdv]  = useState("276");
  const [intLCA,  setIntLCA]  = useState("108");
  const [exhLCA,  setExhLCA]  = useState("116");
  const [advance, setAdv]     = useState("4");

  const n = (v: string) => parseFloat(v) || 0;
  const iC  = n(intLCA)  - n(advance);
  const eC  = n(exhLCA)  + n(advance);
  const IO  = n(intAdv) / 2 - iC;
  const IC  = n(intAdv) / 2 - (180 - iC);
  const EO  = n(exhAdv) / 2 - eC;
  const EC  = n(exhAdv) / 2 - (180 - eC);
  const ov  = IO + EC;
  const cat = overlapBadge(ov);

  const fieldCls = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h2 className="text-2xl font-bold mb-1">Simple Cam Timing Calculator</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Enter your cam's duration and lobe centerline angles to instantly see valve events and overlap.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Inputs */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Duration (advertised)</p>
          {[
            { label: "Intake Duration (°)", val: intAdv, set: setIntAdv },
            { label: "Exhaust Duration (°)", val: exhAdv, set: setExhAdv },
          ].map(({ label, val, set }) => (
            <div key={label} className="space-y-1">
              <Label>{label}</Label>
              <input type="number" className={fieldCls} step="1" value={val} onChange={e => set(e.target.value)} />
            </div>
          ))}

          <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider pt-2">Lobe Centerline Angles</p>
          {[
            { label: "Intake LCA (°)", val: intLCA, set: setIntLCA, hint: "Degrees ATDC of peak intake lift" },
            { label: "Exhaust LCA (°)", val: exhLCA, set: setExhLCA, hint: "Degrees BTDC of peak exhaust lift" },
            { label: "Cam Advance / Retard (°)", val: advance, set: setAdv, hint: "Positive = advanced. 0 = straight-up." },
          ].map(({ label, val, set, hint }) => (
            <div key={label} className="space-y-1">
              <Label>{label}</Label>
              <input type="number" className={fieldCls} step="0.5" value={val} onChange={e => set(e.target.value)} />
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Valve Events</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Intake Opens",   value: IO.toFixed(1), unit: "° BTDC" },
              { label: "Intake Closes",  value: IC.toFixed(1), unit: "° ABDC" },
              { label: "Exhaust Opens",  value: EO.toFixed(1), unit: "° BBDC" },
              { label: "Exhaust Closes", value: EC.toFixed(1), unit: "° ATDC" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="rounded-lg border bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="text-xl font-bold text-[#E85D04]">{value}</div>
                <div className="text-xs text-gray-500">{unit}</div>
              </div>
            ))}
          </div>

          <div className={`rounded-xl border-2 p-5 text-center mt-4 ${cat.bg}`}>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Valve Overlap</div>
            <div className={`text-5xl font-black mb-1 ${cat.text}`}>{ov.toFixed(1)}°</div>
            <div className={`text-sm font-semibold ${cat.text}`}>{cat.label}</div>
            <div className="text-xs text-gray-500 mt-2">IO {IO.toFixed(1)}° + EC {EC.toFixed(1)}° = {ov.toFixed(1)}°</div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3 space-y-0.5">
            <p>Intake centerline (adjusted): {iC.toFixed(1)}°</p>
            <p>Exhaust centerline (adjusted): {eC.toFixed(1)}°</p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            Want the full analysis — LSA recommendations, dynamic compression, and rocker lift table?{" "}
            <button className="underline font-semibold" onClick={() => {}}>Switch to Advanced Cam Calculator above.</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VizardTab() {
  return (
    <div>
      <VizardCamCalculator />
    </div>
  );
}

// ── Cam Guide ─────────────────────────────────────────────────────────────────

export default function CamGuide() {
  const { activeBuild, getField, setField: setBuildField } = useBuildContext();
  const searchString = useSearch();
  const fromBuildParam = new URLSearchParams(searchString).get("fromBuild");
  const fromBuildId = fromBuildParam ? parseInt(fromBuildParam, 10) : null;

  const [activeTab, setActiveTab] = useState<"guide" | "simple" | "vizard" | "valvetrain">("guide");
  const [cam1, setCam1] = useState({ duration: "218", lsa: "112", lift: "0.520", intDuration: "218", exhDuration: "224", intLift: "0.520", exhLift: "0.500" });
  const [cam2, setCam2] = useState({ duration: "232", lsa: "108", lift: "0.580", intDuration: "232", exhDuration: "240", intLift: "0.580", exhLift: "0.560" });
  const [dual1, setDual1] = useState(false);
  const [dual2, setDual2] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({
    displacement: "", compressionRatio: "", headFlow: "", rpmIdle: "", rpmPeak: "",
    transmission: "manual", stall: "", weight: "", gear: "", aspiration: "na", use: "weekend"
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [buildPreFilled, setBuildPreFilled] = useState(false);

  // Pre-fill recommender inputs from active build
  const buildFields = activeBuild?.fields;
  useEffect(() => {
    if (!activeBuild || !buildFields || buildPreFilled) return;
    // Wait until fields are actually loaded
    const hasFields = Object.keys(buildFields).length > 0;
    if (!hasFields) return;

    const prefill: Record<string, string> = {};
    const disp = buildFields["computed.displacement"];
    if (disp) prefill.displacement = disp;
    const cr = buildFields["computed.staticCR"];
    if (cr) prefill.compressionRatio = cr;
    const cfm = buildFields["heads.portFlowCFM"];
    if (cfm) prefill.headFlow = cfm;
    const rpm = buildFields["meta.targetRPM"];
    if (rpm) prefill.rpmPeak = rpm;
    const asp = buildFields["meta.aspiration"];
    if (asp) prefill.aspiration = asp;
    const use = buildFields["meta.intendedUse"];
    if (use) prefill.use = use;
    if (Object.keys(prefill).length > 0) {
      setInputs(prev => ({ ...prev, ...prefill }));
    }
    setBuildPreFilled(true);
  }, [activeBuild?.id, buildFields]);

  // Valve spring calculator state
  const [springCamType, setSpringCamType] = useState<CamTypeKey>("hydraulic_roller");
  const [springRpm, setSpringRpm] = useState("6500");
  const [springLift, setSpringLift] = useState("");
  const [showSpringValidation, setShowSpringValidation] = useState(false);
  const [springValidation, setSpringValidation] = useState({
    installedHeight: "", seatPressure: "", springRate: "", coilBindHeight: "",
  });

  const setInput = (key: string, val: string) => setInputs(prev => ({ ...prev, [key]: val }));

  const handleCalc = () => {
    const r = calcRecommended(inputs);
    setResult(r);
    // Write cam recommendation back to the active build
    if (r && activeBuild) {
      const dur = r.structured.durationRange;
      const durMatch = dur.match(/(\d+)/);
      if (durMatch) {
        setBuildField("cam.durationInt", durMatch[1]);
      }
      const lsaMatch = r.structured.lsaRange.match(/(\d+)/);
      if (lsaMatch) {
        setBuildField("cam.lsa", lsaMatch[1]);
      }
      const liftMatch = r.structured.liftRange.match(/([\d.]+)/);
      if (liftMatch) {
        setBuildField("cam.liftInt", liftMatch[1]);
        setBuildField("cam.liftExh", liftMatch[1]);
      }
    }
  };

  const intDur1 = parseFloat(dual1 ? cam1.intDuration : cam1.duration) || 0;
  const exhDur1 = parseFloat(dual1 ? cam1.exhDuration : cam1.duration) || 0;
  const intDur2 = parseFloat(dual2 ? cam2.intDuration : cam2.duration) || 0;
  const exhDur2 = parseFloat(dual2 ? cam2.exhDuration : cam2.duration) || 0;
  const dur1 = (intDur1 + exhDur1) / 2;
  const dur2 = (intDur2 + exhDur2) / 2;
  const lsa1 = parseFloat(cam1.lsa) || 0;
  const lsa2 = parseFloat(cam2.lsa) || 0;
  const maxLift1 = dual1 ? Math.max(parseFloat(cam1.intLift) || 0, parseFloat(cam1.exhLift) || 0) : parseFloat(cam1.lift) || 0;
  const maxLift2 = dual2 ? Math.max(parseFloat(cam2.intLift) || 0, parseFloat(cam2.exhLift) || 0) : parseFloat(cam2.lift) || 0;

  const TABS = [
    { id: "guide",      label: "Cam Selection Guide" },
    { id: "simple",     label: "Simple Cam Timing" },
    { id: "vizard",     label: "Advanced" },
    { id: "valvetrain", label: "Valvetrain RPM" },
  ] as const;

  return (
    <div>
      <SEOHead
        title="Cam Selection Guide | How to Choose a Camshaft"
        description="Systematic camshaft selection guide for street and performance engines. Choose the right cam based on your heads, intake, RPM range, and compression."
        canonical="/cam-guide"
        keywords="cam selection guide, how to choose a camshaft, camshaft selection, cam for my engine, what cam should I run"
      />
      <PageHeader
        eyebrow="Camshaft"
        title="Cam Selection Tool"
        subtitle="Everything you need to choose, analyze, and time a camshaft — from basic valve events to full advanced cam analysis."
      />

      {/* Build context banner */}
      {activeBuild && (
        <div className="container mx-auto max-w-4xl px-4 pt-4">
          <BuildBanner savedFields={[
            { label: "Displacement", key: "computed.displacement", value: buildFields?.["computed.displacement"] ?? "", suffix: " ci" },
            { label: "CR", key: "computed.staticCR", value: buildFields?.["computed.staticCR"] ?? "", suffix: ":1" },
            { label: "Target RPM", key: "meta.targetRPM", value: buildFields?.["meta.targetRPM"] ?? "" },
            { label: "Bore", key: "shortBlock.bore", value: buildFields?.["shortBlock.bore"] ?? "", suffix: "\"" },
            { label: "Stroke", key: "shortBlock.stroke", value: buildFields?.["shortBlock.stroke"] ?? "", suffix: "\"" },
          ]} />
        </div>
      )}

      {/* Tab navigation */}
      <div className="bg-[#1a1a1a] sticky top-0 z-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex gap-2 py-3 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#E85D04] text-white shadow"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simple cam timing tab */}
      {activeTab === "simple" && <SimpleCamTiming />}

      {/* Advanced cam calculator tab */}
      {activeTab === "vizard" && <VizardTab />}

      {/* Valvetrain RPM Builder tab */}
      {activeTab === "valvetrain" && (
        <div className="py-6">
          <ValvetrainBuilder />
        </div>
      )}

      {/* Cam Selection Guide tab */}
      {activeTab === "guide" && <div className="container mx-auto max-w-4xl px-4 py-10">

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
          {([
            { label: "Cam A", data: cam1, set: setCam1, dual: dual1, setDual: setDual1 },
            { label: "Cam B", data: cam2, set: setCam2, dual: dual2, setDual: setDual2 },
          ] as const).map(({ label, data, set, dual, setDual }) => (
            <Card key={label}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{label}</CardTitle>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      onClick={() => setDual(!dual)}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${dual ? "bg-[#E85D04]" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dual ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                    <span className="text-xs text-muted-foreground">Dual Pattern</span>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!dual ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[#E85D04] font-semibold text-xs uppercase tracking-wide">Intake Dur @0.050"</Label>
                        <Input type="number" value={data.intDuration} onChange={e => set(p => ({ ...p, intDuration: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-blue-600 font-semibold text-xs uppercase tracking-wide">Exhaust Dur @0.050"</Label>
                        <Input type="number" value={data.exhDuration} onChange={e => set(p => ({ ...p, exhDuration: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>LSA (degrees)</Label>
                      <Input type="number" value={data.lsa} onChange={e => set(p => ({ ...p, lsa: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[#E85D04] font-semibold text-xs uppercase tracking-wide">Intake Lift (in)</Label>
                        <Input type="number" step="0.001" value={data.intLift} onChange={e => set(p => ({ ...p, intLift: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-blue-600 font-semibold text-xs uppercase tracking-wide">Exhaust Lift (in)</Label>
                        <Input type="number" step="0.001" value={data.exhLift} onChange={e => set(p => ({ ...p, exhLift: e.target.value }))} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1 italic">
                      Dual pattern: Int {data.intDuration}° / Exh {data.exhDuration}° · Int {data.intLift}" / Exh {data.exhLift}"
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Comparison Analysis</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            {/* Overlap display */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              {[
                { label: "Cam A Overlap", dur: dur1, lsa: lsa1 },
                { label: "Cam B Overlap", dur: dur2, lsa: lsa2 },
              ].map(({ label, dur, lsa }) => {
                const ov = dur - 2 * lsa;
                const color = ov > 50 ? "text-red-600" : ov > 25 ? "text-orange-600" : ov > 0 ? "text-green-700" : "text-blue-600";
                const note = ov > 50 ? "Race level" : ov > 25 ? "Performance" : ov > 0 ? "Street perf" : "Neg. overlap";
                return (
                  <div key={label} className="p-3 rounded-lg bg-gray-50 border text-center">
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className={`text-2xl font-bold ${color}`}>{ov > 0 ? `${ov.toFixed(0)}°` : `${ov.toFixed(0)}°`}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{note}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 italic">
              {(dual1 || dual2) ? "Dual pattern: Overlap = (Int dur + Exh dur) ÷ 2 − (2 × LSA)." : "Overlap = Duration@0.050 − (2 × LSA)."}{" "}
              Positive means both valves open simultaneously for that many crankshaft degrees.
            </p>
            <div className="border-t pt-3 space-y-2">
              <p><strong>Duration:</strong> Cam B is {Math.abs(dur2 - dur1)}° {dur2 > dur1 ? "longer" : "shorter"}. {dur2 > dur1 ? "Cam B will need more RPM to make power and will idle rougher." : "Cam A will make more low-end torque and idle better."}</p>
              <p><strong>LSA:</strong> Cam {lsa1 < lsa2 ? "A" : "B"} has the tighter LSA ({Math.min(lsa1, lsa2)}°), giving it {Math.abs((dur1 - 2 * lsa1) - (dur2 - 2 * lsa2)).toFixed(0)}° more overlap — rougher idle, lower vacuum, narrower but potentially higher power peak.</p>
              <p><strong>Lift:</strong> {maxLift2 > maxLift1 ? `Cam B has ${((maxLift2 - maxLift1) * 1000).toFixed(0)} thou more lift. Verify valve springs can handle ${maxLift2.toFixed(3)}" without coil bind.` : maxLift1 > maxLift2 ? `Cam A has ${((maxLift1 - maxLift2) * 1000).toFixed(0)} thou more lift. Verify springs can handle ${maxLift1.toFixed(3)}" without coil bind.` : `Both cams have equal maximum lift (${maxLift1.toFixed(3)}"). Check retainer-to-seal clearance at full lift.`}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 3: Cam Recommender */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Section 3: Cam Selection Recommender</h2>
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
            <CardHeader>
              <CardTitle>Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">{result.text}</pre>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section 4: Valve Spring Requirements */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Section 4: Valve Spring Requirements</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The cam dictates how hard the valve spring must work. Inadequate spring pressure causes valve float — the valve can't follow the closing ramp and bounces. At worst, it contacts the piston. Use this tool to find the minimum spring requirements for your cam and verify that your chosen spring has the right specs.
        </p>

        {(() => {
          const spec = CAM_SPRING_SPECS[springCamType];
          const rpm = parseFloat(springRpm) || 0;
          const lift = parseFloat(springLift) || 0;
          const minOpenReq = Math.max(spec.baseOpen, rpm * spec.rpmFactor);

          const svInst = parseFloat(springValidation.installedHeight);
          const svSeat = parseFloat(springValidation.seatPressure);
          const svRate = parseFloat(springValidation.springRate);
          const svCBH = parseFloat(springValidation.coilBindHeight);

          const hasValidationInputs = svInst > 0 && svSeat > 0 && svRate > 0;
          const calcOpenPressure = hasValidationInputs ? svSeat + (lift * svRate) : null;
          const coilBindClear = (svInst > 0 && lift > 0 && svCBH > 0) ? svInst - lift - svCBH : null;

          const openPressureOk = calcOpenPressure !== null ? calcOpenPressure >= minOpenReq : null;
          const coilBindOk = coilBindClear !== null ? coilBindClear >= 0.060 : null;
          const seatPressureOk = svSeat > 0 ? (svSeat >= spec.minSeat && svSeat <= spec.maxSeat + 20) : null;

          return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader><CardTitle>Your Cam Setup</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label>Cam Type</Label>
                      <Select value={springCamType} onValueChange={v => setSpringCamType(v as CamTypeKey)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hydraulic_flat">Hydraulic Flat Tappet</SelectItem>
                          <SelectItem value="hydraulic_roller">Hydraulic Roller</SelectItem>
                          <SelectItem value="solid_flat">Solid Flat Tappet</SelectItem>
                          <SelectItem value="solid_roller">Solid Roller</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Max RPM</Label>
                      <Input type="number" step="100" placeholder="e.g. 6500" value={springRpm} onChange={e => setSpringRpm(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Valve Lift (inches)</Label>
                      <Input type="number" step="0.001" placeholder="e.g. 0.540" value={springLift} onChange={e => setSpringLift(e.target.value)} />
                      {result && !springLift && (
                        <p className="text-xs text-[#E85D04]">
                          Tip: Your recommender result has lift {result.structured.liftRange} — use the mid-point.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader><CardTitle>Required Spring Specs</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Cam Type</div>
                      <div className="text-lg font-bold text-[#E85D04]">{spec.name}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-400">Seat Pressure</div>
                        <div className="text-2xl font-bold text-white">{spec.minSeat}–{spec.maxSeat} lb</div>
                        <div className="text-xs text-gray-400">at installed height</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Min Open Pressure</div>
                        <div className="text-2xl font-bold text-[#E85D04]">
                          {rpm > 0 ? `${Math.round(minOpenReq)} lb` : "—"}
                        </div>
                        <div className="text-xs text-gray-400">at full lift{rpm > 0 ? ` @ ${rpm.toLocaleString()} RPM` : ""}</div>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <div className="text-xs text-gray-400 mb-1">Recommended Spring Type</div>
                      <div className="text-sm font-medium">{spec.springType}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-6">
                <strong>Note:</strong> {spec.note}
              </div>

              {/* Coil Bind / Open Pressure Explainer */}
              <Card className="mb-6">
                <CardHeader><CardTitle>Understanding the Limits</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-gray-50 border">
                    <div className="font-bold mb-1 text-[#E85D04]">Seat Pressure</div>
                    <p className="text-muted-foreground text-xs">Force keeping the valve closed at rest. Too low = valve bounces open at idle. Too high = premature lobe wear (flat tappet) or excessive valvetrain load.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border">
                    <div className="font-bold mb-1 text-[#E85D04]">Open Pressure</div>
                    <p className="text-muted-foreground text-xs">Force at full valve lift = Seat pressure + (Lift × Spring rate). Must be high enough to decelerate the valve on the closing ramp and prevent float at max RPM.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border">
                    <div className="font-bold mb-1 text-[#E85D04]">Coil Bind Clearance</div>
                    <p className="text-muted-foreground text-xs">Gap between coils at full lift = Installed height − Valve lift − Coil bind height. Minimum 0.060" required. Coil bind at full lift destroys the engine immediately.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Spring Validation Tool */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Validate Your Spring</CardTitle>
                    <button
                      onClick={() => setShowSpringValidation(!showSpringValidation)}
                      className="text-sm text-[#E85D04] hover:underline"
                    >
                      {showSpringValidation ? "Hide" : "Enter spring specs →"}
                    </button>
                  </div>
                </CardHeader>
                {showSpringValidation && (
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">Enter your spring's specs to check if they meet the requirements above.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Installed Height (inches)</Label>
                        <Input type="number" step="0.001" placeholder="e.g. 1.800"
                          value={springValidation.installedHeight}
                          onChange={e => setSpringValidation(p => ({ ...p, installedHeight: e.target.value }))} />
                        <p className="text-xs text-muted-foreground">Spring length from seat to retainer at zero lift</p>
                      </div>
                      <div className="space-y-1">
                        <Label>Seat Pressure (lb)</Label>
                        <Input type="number" step="1" placeholder="e.g. 130"
                          value={springValidation.seatPressure}
                          onChange={e => setSpringValidation(p => ({ ...p, seatPressure: e.target.value }))} />
                        <p className="text-xs text-muted-foreground">Spring load at installed height (from spring card)</p>
                      </div>
                      <div className="space-y-1">
                        <Label>Spring Rate (lb/inch)</Label>
                        <Input type="number" step="1" placeholder="e.g. 380"
                          value={springValidation.springRate}
                          onChange={e => setSpringValidation(p => ({ ...p, springRate: e.target.value }))} />
                        <p className="text-xs text-muted-foreground">lb of force per inch of compression</p>
                      </div>
                      <div className="space-y-1">
                        <Label>Coil Bind Height (inches)</Label>
                        <Input type="number" step="0.001" placeholder="e.g. 1.150"
                          value={springValidation.coilBindHeight}
                          onChange={e => setSpringValidation(p => ({ ...p, coilBindHeight: e.target.value }))} />
                        <p className="text-xs text-muted-foreground">Spring length when fully compressed (all coils touching)</p>
                      </div>
                    </div>

                    {hasValidationInputs && lift > 0 && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <h4 className="font-bold">Validation Results</h4>

                        {/* Open pressure check */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg border ${openPressureOk ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                          {openPressureOk
                            ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          }
                          <div>
                            <div className={`font-semibold text-sm ${openPressureOk ? "text-green-800" : "text-red-800"}`}>
                              Open Pressure: {calcOpenPressure?.toFixed(0)} lb {openPressureOk ? "✓ Adequate" : `✗ Too low (need ≥ ${Math.round(minOpenReq)} lb)`}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {svSeat} lb seat + ({lift}" × {svRate} lb/in) = {calcOpenPressure?.toFixed(0)} lb open
                            </div>
                          </div>
                        </div>

                        {/* Seat pressure check */}
                        {svSeat > 0 && (
                          <div className={`flex items-start gap-3 p-3 rounded-lg border ${seatPressureOk ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
                            {seatPressureOk
                              ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                              : <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                            }
                            <div>
                              <div className={`font-semibold text-sm ${seatPressureOk ? "text-green-800" : "text-yellow-800"}`}>
                                Seat Pressure: {svSeat} lb {seatPressureOk ? `✓ In range (${spec.minSeat}–${spec.maxSeat} lb)` : `⚠ Outside typical range (${spec.minSeat}–${spec.maxSeat} lb)`}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Coil bind check */}
                        {coilBindClear !== null && (
                          <div className={`flex items-start gap-3 p-3 rounded-lg border ${coilBindOk ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                            {coilBindOk
                              ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                              : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            }
                            <div>
                              <div className={`font-semibold text-sm ${coilBindOk ? "text-green-800" : "text-red-800"}`}>
                                Coil Bind Clearance: {coilBindClear.toFixed(3)}" {coilBindOk ? "✓ Safe (≥ 0.060\")" : "✗ DANGER — coil bind at full lift!"}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {svInst}" installed − {lift}" lift − {svCBH}" coil bind = {coilBindClear.toFixed(3)}"
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </>
          );
        })()}
      </section>

      </div>}
    </div>
  );
}
