import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CamProfile {
  adv: string;
  dur050: string;
  lift: string;
  rockerRatio: string;
}

function computeProfile(p: CamProfile, cc: number) {
  const adv = parseFloat(p.adv) || 0;
  const d050 = parseFloat(p.dur050) || 0;
  const lav = parseFloat(p.lift) || 0;
  const rr = parseFloat(p.rockerRatio) || 1;
  const liftPerDeg = adv > 0 && lav > 0 ? lav / (adv / 2) : 0;
  return {
    adv, d050, lav, rr,
    dur004: liftPerDeg > 0 ? adv + ((0.004 - cc) / liftPerDeg * 2) : 0,
    dur200: liftPerDeg > 0 ? d050 - ((0.200 - 0.050) / liftPerDeg * 2) : 0,
    liftAtLobe: rr > 0 ? lav / rr : 0,
    grossLift: lav,
  };
}

function ProfileInputs({ title, profile, setProfile }: {
  title: string;
  profile: CamProfile;
  setProfile: (p: CamProfile) => void;
}) {
  const set = (key: keyof CamProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile({ ...profile, [key]: e.target.value });
  return (
    <div>
      {title && <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider mb-3">{title}</p>}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Advertised Duration (°)</Label>
          <Input type="number" step="1" value={profile.adv} onChange={set("adv")} />
        </div>
        <div className="space-y-1">
          <Label>Duration at 0.050" (°)</Label>
          <Input type="number" step="1" value={profile.dur050} onChange={set("dur050")} />
        </div>
        <div className="space-y-1">
          <Label>Lift at Valve (inches)</Label>
          <Input type="number" step="0.001" value={profile.lift} onChange={set("lift")} />
        </div>
        <div className="space-y-1">
          <Label>Rocker Arm Ratio</Label>
          <Input type="number" step="0.01" value={profile.rockerRatio} onChange={set("rockerRatio")} />
        </div>
      </div>
    </div>
  );
}

function ProfileResults({ label, calc }: { label: string; calc: ReturnType<typeof computeProfile> }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider mb-3">{label}</p>
      <div className="space-y-2">
        <ResultRow label='Adv. Duration @ 0.004"' value={`${calc.dur004.toFixed(1)}°`} />
        <ResultRow label='Duration @ 0.050"' value={`${calc.d050}°`} />
        <ResultRow label='Duration @ 0.200" (est.)' value={`${Math.max(0, calc.dur200).toFixed(1)}°`} />
        <ResultRow label="Lobe Lift" value={`${calc.liftAtLobe.toFixed(4)}"`} />
        <ResultRow label="Gross Valve Lift" value={`${calc.grossLift.toFixed(4)}"`} />
      </div>
    </div>
  );
}

export default function CamDurationCalculator() {
  const [dualPattern, setDualPattern] = useState(false);
  const [checkClearance, setCheckClearance] = useState("0.006");

  const [single, setSingle] = useState<CamProfile>({
    adv: "224", dur050: "196", lift: "0.480", rockerRatio: "1.5",
  });
  const [intake, setIntake] = useState<CamProfile>({
    adv: "228", dur050: "208", lift: "0.520", rockerRatio: "1.5",
  });
  const [exhaust, setExhaust] = useState<CamProfile>({
    adv: "236", dur050: "218", lift: "0.490", rockerRatio: "1.5",
  });
  const [lsaInput, setLsaInput] = useState("112");

  const cc = parseFloat(checkClearance) || 0.006;
  const lsaNum = parseFloat(lsaInput) || 110;

  const singleCalc = computeProfile(single, cc);
  const singleLsaEst = singleCalc.adv > 0 ? (singleCalc.adv - singleCalc.d050) / 2 + 110 : 0;
  const singleOverlap = singleCalc.d050 - 2 * singleLsaEst;

  const intCalc = computeProfile(intake, cc);
  const exhCalc = computeProfile(exhaust, cc);
  const dualOverlap = (intCalc.d050 + exhCalc.d050) / 2 - 2 * lsaNum;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Camshaft Duration Converter</h1>
      <p className="text-muted-foreground mb-6">Convert between advertised, 0.050", and 0.200" duration. Calculate lobe and valve lift from rocker ratio.</p>

      <div className="flex items-center gap-3 mb-8 p-3 rounded-lg border bg-muted/40">
        <button
          onClick={() => setDualPattern(!dualPattern)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${dualPattern ? "bg-[#E85D04]" : "bg-gray-300"}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${dualPattern ? "left-6" : "left-1"}`} />
        </button>
        <div>
          <span className="font-semibold text-sm">Dual Pattern Cam</span>
          <span className="text-xs text-muted-foreground ml-2">
            {dualPattern ? "Separate intake and exhaust specs" : "Toggle on if your cam has different intake and exhaust duration or lift"}
          </span>
        </div>
      </div>

      {!dualPattern ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Cam Specs</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <ProfileInputs title="" profile={single} setProfile={setSingle} />
                <div className="space-y-1 pt-2 border-t">
                  <Label>Checking Clearance (inches)</Label>
                  <Input type="number" step="0.001" value={checkClearance} onChange={e => setCheckClearance(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Duration Conversions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <ResultRow label='Duration @ 0.004" (Advertised)' value={`${singleCalc.dur004.toFixed(1)}°`} />
                <ResultRow label='Duration @ 0.050"' value={`${singleCalc.d050}°`} />
                <ResultRow label='Duration @ 0.200" (est.)' value={`${Math.max(0, singleCalc.dur200).toFixed(1)}°`} />
                <ResultRow label="Lobe Lift" value={`${singleCalc.liftAtLobe.toFixed(4)}"`} />
                <ResultRow label="Gross Valve Lift" value={`${singleCalc.grossLift.toFixed(4)}"`} />
                <ResultRow label="Est. LSA" value={`~${singleLsaEst.toFixed(0)}°`} />
                <ResultRow
                  label={`Est. Overlap @ 0.050"`}
                  value={singleOverlap >= 0 ? `~${singleOverlap.toFixed(0)}°` : `${singleOverlap.toFixed(0)}° (neg. overlap)`}
                  highlight={singleOverlap > 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Why Measurement Points Differ</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>Advertised duration</strong> is measured at different checking clearances by different manufacturers — making direct comparison impossible.</p>
                <p><strong>Duration at 0.050"</strong> is the industry-standard comparison point. Always compare cams at 0.050" lift.</p>
                <p><strong>Duration at 0.200"</strong> describes the "meat" of the lobe — how long the valve is substantially open.</p>
                <p>The <strong>lobe separation angle (LSA)</strong> controls overlap — how much both valves are open simultaneously. Tighter LSA = more idle lope, peakier power. Wider LSA = smoother idle, better vacuum, less overlap.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Intake Specs</CardTitle></CardHeader>
              <CardContent>
                <ProfileInputs title="" profile={intake} setProfile={setIntake} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Exhaust Specs</CardTitle></CardHeader>
              <CardContent>
                <ProfileInputs title="" profile={exhaust} setProfile={setExhaust} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Shared Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Checking Clearance (inches)</Label>
                <Input type="number" step="0.001" value={checkClearance} onChange={e => setCheckClearance(e.target.value)} />
                <p className="text-xs text-muted-foreground">Used to convert from advertised to 0.050" duration</p>
              </div>
              <div className="space-y-1">
                <Label>LSA — Lobe Separation Angle (°)</Label>
                <Input type="number" step="0.5" value={lsaInput} onChange={e => setLsaInput(e.target.value)} />
                <p className="text-xs text-muted-foreground">Enter the cam card LSA for accurate overlap calculation</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Intake Results</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <ProfileResults label="" calc={intCalc} />
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Exhaust Results</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <ProfileResults label="" calc={exhCalc} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#E85D04]/40">
            <CardHeader><CardTitle>Combined — Overlap Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-center mb-2">
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <div className="text-xs text-gray-500 mb-1">Intake @ 0.050"</div>
                  <div className="text-xl font-bold">{intCalc.d050}°</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <div className="text-xs text-gray-500 mb-1">Exhaust @ 0.050"</div>
                  <div className="text-xl font-bold">{exhCalc.d050}°</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <div className="text-xs text-gray-500 mb-1">LSA</div>
                  <div className="text-xl font-bold">{lsaNum}°</div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border text-center ${dualOverlap > 0 ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"}`}>
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Valve Overlap @ 0.050"</div>
                <div className={`text-4xl font-bold ${dualOverlap > 50 ? "text-red-600" : dualOverlap > 25 ? "text-orange-600" : dualOverlap > 0 ? "text-green-700" : "text-blue-600"}`}>
                  {dualOverlap >= 0 ? `${dualOverlap.toFixed(0)}°` : `${dualOverlap.toFixed(0)}°`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {dualOverlap > 50 ? "Race level — rough idle, requires high stall / manual" :
                   dualOverlap > 25 ? "Performance street — noticeable idle lope" :
                   dualOverlap > 0 ? "Mild performance — smooth idle with a hint of cam" :
                   "Negative overlap — ultra-smooth idle, diesel-level vacuum"}
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Formula: (Int dur + Exh dur) ÷ 2 − (2 × LSA) = ({intCalc.d050} + {exhCalc.d050}) ÷ 2 − (2 × {lsaNum}) = {dualOverlap.toFixed(1)}°
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Intake Lift Difference</p>
                  <p className="font-semibold">{intCalc.lav > exhCalc.lav ? `+${((intCalc.lav - exhCalc.lav) * 1000).toFixed(0)} thou more than exhaust` : intCalc.lav < exhCalc.lav ? `${((intCalc.lav - exhCalc.lav) * 1000).toFixed(0)} thou less than exhaust` : "Equal lift"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Duration Difference</p>
                  <p className="font-semibold">{intCalc.d050 > exhCalc.d050 ? `Intake is ${intCalc.d050 - exhCalc.d050}° longer` : intCalc.d050 < exhCalc.d050 ? `Exhaust is ${exhCalc.d050 - intCalc.d050}° longer` : "Equal duration"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center border-b border-white/10 pb-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-bold ${highlight ? "text-[#E85D04]" : "text-primary"}`}>{value}</span>
    </div>
  );
}
