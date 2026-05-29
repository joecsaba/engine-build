import { useState } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RingType = "top" | "second" | "oil";
type AppType = "na-street" | "na-perf" | "fi-street" | "full-race" | "diesel";

/* Per-inch-of-bore multipliers for top + second ring; oil rail uses a flat
   minimum gap (not per-inch). Recalibrated 2026-05-28 against manufacturer
   sources (Mahle Motorsports, Wiseco, JE Pistons, Total Seal, CP-Carrillo,
   ICON) — see scripts/validate-ring-gap-sources.md for the reference table.

   Notes on second-ring logic:
   - Street: second ≈ top. OK because there's no inter-ring pressure issue.
   - FI street & race: per Mahle Motorsports current guidance, second is set
     EQUAL TO (not tighter than) the top ring to vent inter-ring pressure.
     CP-Carrillo recommends second = top + 0.004"-0.008" for race. Splitting
     the difference: second = top for FI/race rather than tighter. */
const gapMultipliers: Record<AppType, Record<RingType, { perInch: [number, number] } | { flat: [number, number] }>> = {
  "na-street":   { top: { perInch: [0.0040, 0.0050] }, second: { perInch: [0.0040, 0.0050] }, oil: { flat: [0.015, 0.055] } },
  "na-perf":     { top: { perInch: [0.0045, 0.0055] }, second: { perInch: [0.0045, 0.0055] }, oil: { flat: [0.015, 0.055] } },
  "fi-street":   { top: { perInch: [0.0060, 0.0070] }, second: { perInch: [0.0060, 0.0070] }, oil: { flat: [0.015, 0.055] } },
  "full-race":   { top: { perInch: [0.0070, 0.0080] }, second: { perInch: [0.0070, 0.0080] }, oil: { flat: [0.015, 0.055] } },
  "diesel":      { top: { perInch: [0.0060, 0.0095] }, second: { perInch: [0.0055, 0.0085] }, oil: { flat: [0.015, 0.055] } },
};

function getZone(actual: number, min: number, max: number): { label: string; color: string; bg: string } {
  if (actual < min * 0.85) return { label: "Too Tight — Risk of ring land damage!", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  if (actual < min) return { label: "Slightly tight — verify before use", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (actual <= max) return { label: "OK — Within specification", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (actual <= max * 1.15) return { label: "Slightly loose — acceptable for mild use", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "Too Loose — Excessive blowby and oil consumption", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function RingGapCalculator() {
  const [bore, setBore] = useState("4.030");
  const [ringType, setRingType] = useState<RingType>("top");
  const [appType, setAppType] = useState<AppType>("na-street");
  const [actualGap, setActualGap] = useState("");

  const b = parseFloat(bore) || 0;
  const entry = gapMultipliers[appType][ringType];
  const isFlat = "flat" in entry;
  const [minVal, maxVal] = isFlat ? entry.flat : entry.perInch;
  const minGap = isFlat ? minVal : b * minVal;
  const maxGap = isFlat ? maxVal : b * maxVal;

  const actualGapNum = parseFloat(actualGap);
  const zone = actualGap && !isNaN(actualGapNum) ? getZone(actualGapNum, minGap, maxGap) : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <SEOHead
        title="Piston Ring End Gap Calculator"
        description="Calculate correct piston ring end gap for your bore size and application. Covers NA street, NA performance, forced induction, and race builds."
        canonical="/calculators/ring-gap"
        keywords="piston ring gap calculator, ring end gap, piston ring clearance, ring gap chart, engine ring gap specs"
      />
      <h1 className="text-3xl font-bold mb-2">Piston Ring End Gap Calculator</h1>
      <p className="text-muted-foreground mb-4">Application-specific ring gap recommendations with color-coded zones.</p>
      <div className="p-3 rounded-lg border border-[#E85D04]/30 bg-[#E85D04]/5 mb-8">
        <p className="text-sm">
          <Link href="/calculators/ring-gap-advanced" className="text-[#E85D04] font-medium hover:underline">
            See our upgraded version with application-specific recommendations
          </Link>
          {" "}&mdash; per-ring outputs for NA, nitrous, turbo, supercharged & diesel builds with material warnings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Bore Size (inches)</Label>
              <Input type="number" step="0.001" value={bore} onChange={e => setBore(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Ring Type</Label>
              <Select value={ringType} onValueChange={(v) => setRingType(v as RingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top Compression Ring</SelectItem>
                  <SelectItem value="second">Second Compression Ring</SelectItem>
                  <SelectItem value="oil">Oil Control Ring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Application</Label>
              <Select value={appType} onValueChange={(v) => setAppType(v as AppType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="na-street">Naturally Aspirated Street</SelectItem>
                  <SelectItem value="na-perf">NA Performance</SelectItem>
                  <SelectItem value="fi-street">Forced Induction Street (turbo / supercharger)</SelectItem>
                  <SelectItem value="full-race">Full Race (gasoline, FI or nitrous)</SelectItem>
                  <SelectItem value="diesel">Diesel (turbo, high-output Cummins / Duramax / Power Stroke)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Actual Gap Measured (inches, optional)</Label>
              <Input type="number" step="0.001" placeholder="e.g. 0.018" value={actualGap} onChange={e => setActualGap(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Recommended Gap</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Inches</p>
                {ringType === "oil" ? (
                  <p className="text-4xl font-bold text-primary">{minGap.toFixed(3)}" minimum</p>
                ) : (
                  <p className="text-4xl font-bold text-primary">{minGap.toFixed(3)}" – {maxGap.toFixed(3)}"</p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Millimeters</p>
                {ringType === "oil" ? (
                  <p className="text-2xl font-bold">{(minGap * 25.4).toFixed(2)} mm minimum</p>
                ) : (
                  <p className="text-2xl font-bold">{(minGap * 25.4).toFixed(2)} – {(maxGap * 25.4).toFixed(2)} mm</p>
                )}
              </div>
              {ringType === "oil" && (
                <p className="text-xs text-gray-400">Oil rail gap is a flat minimum — not calculated per inch of bore. Do not file the expander.</p>
              )}
            </CardContent>
          </Card>

          {zone && (
            <div className={`p-4 rounded-lg border ${zone.bg}`}>
              <p className={`font-bold ${zone.color}`}>{zone.label}</p>
              <p className="text-sm mt-1 text-muted-foreground">Your gap: {actualGapNum.toFixed(3)}" | Spec: {minGap.toFixed(3)}"–{maxGap.toFixed(3)}"</p>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Why Gap Matters</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Too Tight:</strong> As the piston ring heats up and expands, the ends butt together. This causes the ring to "land" in its groove, breaking the ring land and potentially destroying the piston and cylinder wall.</p>
              <p><strong>Too Loose:</strong> Excessive gap allows combustion gases to blow past the ring (blowby), reducing power, increasing oil consumption, and contaminating the oil with combustion products.</p>
              <p>Forced induction and high-heat applications need more gap because rings run hotter and expand more.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Piston Ring End Gap Specifications</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Piston ring end gap is the clearance between the two ends of a piston ring when it is seated in the cylinder bore. This gap must be precisely set because piston rings expand as the engine reaches operating temperature. If the gap is too tight, the ring ends butt together and the ring has nowhere to go — it breaks the ring land off the piston, scores the cylinder wall, and can destroy the entire short block in seconds. This is one of the most common causes of catastrophic engine failure in fresh builds.
          </p>
          <p>
            The general rule for naturally aspirated street engines is 0.0040" of gap per inch of bore diameter for the top compression ring. On a 4.000" bore, that works out to 0.016" minimum. Most ring manufacturers recommend 0.0040" to 0.0050" per inch for the top ring on NA applications, giving a range of 0.016" to 0.020" on a standard 4.000" bore. Forced induction engines run significantly more gap — typically 0.0060" to 0.0070" per inch for the top ring — because turbo and supercharged engines generate far more cylinder heat, causing greater ring expansion. On that same 4.000" bore with a turbo, you would gap the top ring at 0.024" to 0.028".
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Ring Gap Quick Reference</h3>
          <p>
            For a common 4.030" overbored SBC: NA street top ring = 0.016"-0.020", NA performance = 0.018"-0.022", forced induction street = 0.024"-0.028", full race gasoline = 0.028"-0.032", high-output diesel = 0.024"-0.038". On modern race builds the second ring is set equal to or slightly larger than the top ring (Mahle Motorsports / CP-Carrillo current guidance) to vent inter-ring pressure that would otherwise lift the top ring off its land. Always file-fit rings to your actual bore measurement — never trust the gap straight out of the box.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Sources</h3>
          <p>
            Multipliers cross-checked against Mahle Motorsports ring gap minimums chart, Wiseco ring installation guide, JE Pistons ring instruction sheets, Total Seal application guide, and CP-Carrillo installation specifications. Diesel range derived from Total Seal Severe Duty Diesel specs (Cummins / Duramax) and Mahle diesel-turbo recs (top 0.0060", second 0.0055").
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
