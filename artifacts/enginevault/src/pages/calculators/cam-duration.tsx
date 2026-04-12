import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CamDurationCalculator() {
  const [advDuration, setAdvDuration] = useState("224");
  const [dur050, setDur050] = useState("196");
  const [checkClearance, setCheckClearance] = useState("0.006");
  const [liftAtValve, setLiftAtValve] = useState("0.480");
  const [rockerRatio, setRockerRatio] = useState("1.5");

  const adv = parseFloat(advDuration) || 0;
  const d050 = parseFloat(dur050) || 0;
  const cc = parseFloat(checkClearance) || 0.006;
  const lav = parseFloat(liftAtValve) || 0;
  const rr = parseFloat(rockerRatio) || 1;

  const liftPerDeg = lav / (adv / 2);
  const dur004 = adv + ((0.004 - cc) / liftPerDeg * 2);
  const dur200 = d050 - ((0.200 - 0.050) / liftPerDeg * 2);
  const liftAtLobe = lav / rr;
  const grossLift = liftAtLobe * rr;
  const lsaEstimate = (adv - d050) / 2 + 110;
  const overlapEstimate = d050 - 2 * lsaEstimate;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Camshaft Duration Converter</h1>
      <p className="text-muted-foreground mb-8">Convert between advertised, 0.050", and 0.200" duration. Calculate lobe and valve lift from rocker ratio.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Cam Specs</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Advertised Duration (degrees)</Label>
                <Input type="number" step="1" value={advDuration} onChange={e => setAdvDuration(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Duration at 0.050" (degrees)</Label>
                <Input type="number" step="1" value={dur050} onChange={e => setDur050(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Checking Clearance (inches)</Label>
                <Input type="number" step="0.001" value={checkClearance} onChange={e => setCheckClearance(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Lift at the Valve (inches)</Label>
                <Input type="number" step="0.001" value={liftAtValve} onChange={e => setLiftAtValve(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Rocker Arm Ratio</Label>
                <Input type="number" step="0.01" value={rockerRatio} onChange={e => setRockerRatio(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Duration Conversions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ResultRow label='Duration @ 0.004" (Advertised)' value={`${dur004.toFixed(1)}°`} />
              <ResultRow label='Duration @ 0.050"' value={`${d050}°`} />
              <ResultRow label='Duration @ 0.200" (est.)' value={`${Math.max(0, dur200).toFixed(1)}°`} />
              <ResultRow label="Lobe Lift" value={`${liftAtLobe.toFixed(4)}"`} />
              <ResultRow label="Gross Valve Lift" value={`${grossLift.toFixed(4)}"`} />
              <ResultRow label="Est. LSA" value={`~${lsaEstimate.toFixed(0)}°`} />
              <ResultRow
                label={`Est. Overlap @ 0.050"`}
                value={overlapEstimate >= 0 ? `~${overlapEstimate.toFixed(0)}°` : `${overlapEstimate.toFixed(0)}° (neg. overlap)`}
                highlight={overlapEstimate > 0}
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
