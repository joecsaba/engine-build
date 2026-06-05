import { useState, useMemo } from "react";
import { useUnitDirection } from "@/hooks/useUnitDirection";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import wrenchSizeContent from "@/data/calculatorContent/wrench-size-converter.mjs";

const MM_PER_INCH = 25.4;

interface SaeSize {
  label: string;
  decimalIn: number;
  numerator: number;
  denominator: number;
  whole: number;
}

function makeSae(whole: number, num: number, denom: number): SaeSize {
  const decimalIn = whole + num / denom;
  const label = whole > 0
    ? (num === 0 ? `${whole}"` : `${whole}-${num}/${denom}"`)
    : `${num}/${denom}"`;
  return { label, decimalIn, numerator: num, denominator: denom, whole };
}

// Standard SAE combination/socket wrench sizes that ship in a typical set.
const SAE_SIZES: SaeSize[] = [
  makeSae(0, 1, 4),    // 1/4"
  makeSae(0, 9, 32),   // 9/32"
  makeSae(0, 5, 16),   // 5/16"
  makeSae(0, 11, 32),  // 11/32"
  makeSae(0, 3, 8),    // 3/8"
  makeSae(0, 7, 16),   // 7/16"
  makeSae(0, 1, 2),    // 1/2"
  makeSae(0, 9, 16),   // 9/16"
  makeSae(0, 5, 8),    // 5/8"
  makeSae(0, 11, 16),  // 11/16"
  makeSae(0, 3, 4),    // 3/4"
  makeSae(0, 13, 16),  // 13/16"
  makeSae(0, 7, 8),    // 7/8"
  makeSae(0, 15, 16),  // 15/16"
  makeSae(1, 0, 1),    // 1"
  makeSae(1, 1, 16),   // 1-1/16"
  makeSae(1, 1, 8),    // 1-1/8"
  makeSae(1, 3, 16),   // 1-3/16"
  makeSae(1, 1, 4),    // 1-1/4"
  makeSae(1, 5, 16),   // 1-5/16"
  makeSae(1, 3, 8),    // 1-3/8"
  makeSae(1, 7, 16),   // 1-7/16"
  makeSae(1, 1, 2),    // 1-1/2"
];

// Standard metric combination/socket wrench sizes that ship in a typical set.
const METRIC_SIZES_MM: number[] = [
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 34, 36, 38, 41,
];

interface Match {
  bestSae: SaeSize;
  bestMetric: number;
  gapMm: number;
  gapIn: number;
  tier: "interchangeable" | "close" | "loose" | "no-match";
  note: string;
}

function classify(gapMm: number): { tier: Match["tier"]; note: string } {
  const gapIn = gapMm / MM_PER_INCH;
  if (gapMm <= 0.20) {
    return {
      tier: "interchangeable",
      note: `Within ${gapMm.toFixed(2)} mm (${(gapIn * 1000).toFixed(1)} thou) — these are functionally the same size. Either wrench fits.`,
    };
  }
  if (gapMm <= 0.40) {
    return {
      tier: "close",
      note: `Off by ${gapMm.toFixed(2)} mm (${(gapIn * 1000).toFixed(1)} thou) — usable in a pinch but slightly loose. Risk of rounding the fastener under heavy torque.`,
    };
  }
  if (gapMm <= 0.80) {
    return {
      tier: "loose",
      note: `Off by ${gapMm.toFixed(2)} mm (${(gapIn * 1000).toFixed(1)} thou) — too loose to trust. Will slip or round the fastener.`,
    };
  }
  return {
    tier: "no-match",
    note: `Off by ${gapMm.toFixed(2)} mm (${(gapIn * 1000).toFixed(1)} thou) — no equivalent in the other system.`,
  };
}

function tierColor(tier: Match["tier"]): string {
  switch (tier) {
    case "interchangeable": return "text-emerald-400";
    case "close":           return "text-amber-400";
    case "loose":           return "text-orange-400";
    case "no-match":        return "text-red-400";
  }
}

function tierBadge(tier: Match["tier"]): string {
  switch (tier) {
    case "interchangeable": return "Interchangeable";
    case "close":           return "Close — usable in a pinch";
    case "loose":           return "Too loose — will slip";
    case "no-match":        return "No equivalent";
  }
}

function findClosestMetric(targetMm: number): { size: number; gapMm: number } {
  let best = METRIC_SIZES_MM[0];
  let bestGap = Math.abs(METRIC_SIZES_MM[0] - targetMm);
  for (const m of METRIC_SIZES_MM) {
    const g = Math.abs(m - targetMm);
    if (g < bestGap) {
      best = m;
      bestGap = g;
    }
  }
  return { size: best, gapMm: bestGap };
}

function findClosestSae(targetMm: number): { sae: SaeSize; gapMm: number } {
  let best = SAE_SIZES[0];
  let bestGap = Math.abs(SAE_SIZES[0].decimalIn * MM_PER_INCH - targetMm);
  for (const s of SAE_SIZES) {
    const g = Math.abs(s.decimalIn * MM_PER_INCH - targetMm);
    if (g < bestGap) {
      best = s;
      bestGap = g;
    }
  }
  return { sae: best, gapMm: bestGap };
}

// Reference chart — every SAE wrench paired with closest metric + interchange tier.
interface RefRow {
  sae: SaeSize;
  decimalIn: number;
  sizeMm: number;
  closestMetric: number;
  gapMm: number;
  tier: Match["tier"];
}

const referenceChart: RefRow[] = SAE_SIZES.map((sae) => {
  const sizeMm = sae.decimalIn * MM_PER_INCH;
  const m = findClosestMetric(sizeMm);
  const { tier } = classify(m.gapMm);
  return {
    sae,
    decimalIn: sae.decimalIn,
    sizeMm,
    closestMetric: m.size,
    gapMm: m.gapMm,
    tier,
  };
});

type Direction = "sae-to-metric" | "metric-to-sae" | "measure";

export default function WrenchSizeConverter() {
  const [direction, setDirection] = useUnitDirection<Direction>({
    imperial: "sae-to-metric",
    metric: "metric-to-sae",
  });

  // Picker state — one for SAE, one for metric
  const [saePick, setSaePick] = useState<string>("");      // index into SAE_SIZES
  const [metricPick, setMetricPick] = useState<string>(""); // index into METRIC_SIZES_MM

  // Free-form custom input
  const [customMm, setCustomMm] = useState("");
  const [customIn, setCustomIn] = useState("");

  // Measure mode (calipers / tape) — separate state so it doesn't collide
  const [measureUnit, setMeasureUnit] = useState<"mm" | "in">("mm");
  const [measureValue, setMeasureValue] = useState("");

  const match: Match | null = useMemo(() => {
    let sourceMm: number | null = null;

    if (direction === "sae-to-metric") {
      if (customIn.trim() !== "" && !isNaN(parseFloat(customIn))) {
        sourceMm = parseFloat(customIn) * MM_PER_INCH;
      } else if (saePick !== "") {
        const s = SAE_SIZES[parseInt(saePick, 10)];
        sourceMm = s.decimalIn * MM_PER_INCH;
      }
    } else if (direction === "metric-to-sae") {
      if (customMm.trim() !== "" && !isNaN(parseFloat(customMm))) {
        sourceMm = parseFloat(customMm);
      } else if (metricPick !== "") {
        sourceMm = METRIC_SIZES_MM[parseInt(metricPick, 10)];
      }
    } else {
      // measure mode
      const v = parseFloat(measureValue);
      if (measureValue.trim() !== "" && !isNaN(v)) {
        sourceMm = measureUnit === "mm" ? v : v * MM_PER_INCH;
      }
    }

    if (sourceMm == null) return null;

    const m = findClosestMetric(sourceMm);
    const s = findClosestSae(sourceMm);
    const { tier, note } = direction === "sae-to-metric"
      ? classify(m.gapMm)
      : direction === "metric-to-sae"
        ? classify(s.gapMm)
        : classify(Math.min(m.gapMm, s.gapMm)); // measure mode: best of either

    return {
      bestSae: s.sae,
      bestMetric: m.size,
      gapMm: direction === "sae-to-metric" ? m.gapMm
            : direction === "metric-to-sae" ? s.gapMm
            : Math.min(m.gapMm, s.gapMm),
      gapIn: ((direction === "sae-to-metric" ? m.gapMm
            : direction === "metric-to-sae" ? s.gapMm
            : Math.min(m.gapMm, s.gapMm))) / MM_PER_INCH,
      tier,
      note,
    };
  }, [direction, saePick, metricPick, customMm, customIn, measureUnit, measureValue]);

  // For measure mode we need the per-system tiers individually so we can show
  // both options with their own fit badges.
  const measureBreakdown = useMemo(() => {
    if (direction !== "measure") return null;
    const v = parseFloat(measureValue);
    if (measureValue.trim() === "" || isNaN(v)) return null;
    const sourceMm = measureUnit === "mm" ? v : v * MM_PER_INCH;
    const m = findClosestMetric(sourceMm);
    const s = findClosestSae(sourceMm);
    const metricCls = classify(m.gapMm);
    const saeCls = classify(s.gapMm);
    return {
      sourceMm,
      metric: { size: m.size, gapMm: m.gapMm, ...metricCls },
      sae: { sae: s.sae, gapMm: s.gapMm, ...saeCls },
    };
  }, [direction, measureValue, measureUnit]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Wrench Size Converter — SAE ↔ Metric + Measure with Calipers"
        description="Convert SAE (inch) wrench sizes to metric (mm) and back, or measure the bolt head across the flats with calipers / tape and get the right wrench from either set. Shows the gap in mm and thousandths and whether the swap is safe under torque."
        canonical="/calculators/wrench-size-converter"
        keywords="wrench size converter, SAE to metric wrench, metric to SAE wrench, measure bolt head wrench size, identify wrench size with calipers, socket size conversion, wrench equivalent chart, 5/8 to 16mm, 3/4 to 19mm"
      />

      <h1 className="text-3xl font-bold mb-2">Wrench Size Converter — SAE ↔ Metric</h1>
      <p className="text-muted-foreground mb-8">
        Pick a wrench in one system, get the closest match in the other — or measure the bolt head with calipers and we'll tell you which wrench to grab from either set.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Converter */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Convert</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Direction toggle */}
              <div className="flex rounded-lg border overflow-hidden text-xs sm:text-sm">
                <button
                  className={`flex-1 py-2.5 px-2 sm:px-3 font-medium transition-colors ${direction === "sae-to-metric" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("sae-to-metric")}
                >
                  SAE → Metric
                </button>
                <button
                  className={`flex-1 py-2.5 px-2 sm:px-3 font-medium transition-colors border-l ${direction === "metric-to-sae" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("metric-to-sae")}
                >
                  Metric → SAE
                </button>
                <button
                  className={`flex-1 py-2.5 px-2 sm:px-3 font-medium transition-colors border-l ${direction === "measure" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  onClick={() => setDirection("measure")}
                >
                  Measure with calipers
                </button>
              </div>

              {direction === "sae-to-metric" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>SAE Wrench Size</Label>
                    <Select value={saePick} onValueChange={(v) => { setSaePick(v); setCustomIn(""); }}>
                      <SelectTrigger><SelectValue placeholder="Pick a SAE size..." /></SelectTrigger>
                      <SelectContent>
                        {SAE_SIZES.map((s, i) => (
                          <SelectItem key={s.label} value={String(i)}>
                            {s.label} ({s.decimalIn.toFixed(4)}")
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Or enter a custom inch value</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.500"
                      value={customIn}
                      onChange={(e) => { setCustomIn(e.target.value); setSaePick(""); }}
                      className="font-mono"
                    />
                  </div>
                </div>
              )}

              {direction === "metric-to-sae" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Metric Wrench Size</Label>
                    <Select value={metricPick} onValueChange={(v) => { setMetricPick(v); setCustomMm(""); }}>
                      <SelectTrigger><SelectValue placeholder="Pick a metric size..." /></SelectTrigger>
                      <SelectContent>
                        {METRIC_SIZES_MM.map((m, i) => (
                          <SelectItem key={m} value={String(i)}>
                            {m} mm
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Or enter a custom mm value</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="13"
                      value={customMm}
                      onChange={(e) => { setCustomMm(e.target.value); setMetricPick(""); }}
                      className="font-mono"
                    />
                  </div>
                </div>
              )}

              {direction === "measure" && (
                <div className="space-y-3">
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
                    <strong>Measure across the flats</strong> of the bolt head (or nut) — the flat-to-flat distance, not the corner-to-corner distance. Bolt heads typically run 0.1–0.2 mm (4–8 thou) <em>under</em> nominal — that's expected.
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label>Measured Across Flats</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={measureUnit === "mm" ? "12.9" : "0.495"}
                        value={measureValue}
                        onChange={(e) => setMeasureValue(e.target.value)}
                        className="font-mono text-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Unit</Label>
                      <Select value={measureUnit} onValueChange={(v) => setMeasureUnit(v as "mm" | "in")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="in">inches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader>
              <CardTitle>
                {direction === "measure"
                  ? "Recommended Wrench"
                  : `Closest ${direction === "sae-to-metric" ? "Metric" : "SAE"} Wrench`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {direction === "measure" && measureBreakdown ? (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    You measured <span className="font-mono text-amber-400">{measureBreakdown.sourceMm.toFixed(2)} mm</span> · <span className="font-mono text-amber-400">{(measureBreakdown.sourceMm / MM_PER_INCH).toFixed(4)}"</span>
                  </p>
                  {/* Metric pick */}
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">From the metric set</p>
                    <p className="text-3xl font-bold font-mono text-primary">{measureBreakdown.metric.size} mm</p>
                    <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${tierColor(measureBreakdown.metric.tier)}`}>
                      {tierBadge(measureBreakdown.metric.tier)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{measureBreakdown.metric.note}</p>
                  </div>
                  {/* SAE pick */}
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">From the SAE set</p>
                    <p className="text-3xl font-bold font-mono text-primary">{measureBreakdown.sae.sae.label}</p>
                    <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${tierColor(measureBreakdown.sae.tier)}`}>
                      {tierBadge(measureBreakdown.sae.tier)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{measureBreakdown.sae.note}</p>
                  </div>
                  {/* Hint about which to prefer */}
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-xs text-gray-400">
                      <strong className="text-amber-400">Tip:</strong>{" "}
                      {measureBreakdown.metric.gapMm < measureBreakdown.sae.gapMm
                        ? `Metric is the closer fit (Δ ${measureBreakdown.metric.gapMm.toFixed(2)} mm vs SAE ${measureBreakdown.sae.gapMm.toFixed(2)} mm) — this is almost certainly a metric bolt.`
                        : measureBreakdown.sae.gapMm < measureBreakdown.metric.gapMm
                          ? `SAE is the closer fit (Δ ${measureBreakdown.sae.gapMm.toFixed(2)} mm vs metric ${measureBreakdown.metric.gapMm.toFixed(2)} mm) — this is almost certainly an SAE bolt.`
                          : `Equal fit either way — likely one of the truly-interchangeable pairs (3/4"=19mm, 5/8"=16mm, etc.).`
                      }
                    </p>
                  </div>
                </div>
              ) : match && direction !== "measure" ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-5xl font-bold font-mono text-primary tracking-wide">
                      {direction === "sae-to-metric" ? `${match.bestMetric} mm` : match.bestSae.label}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {direction === "sae-to-metric"
                        ? `Exact ${(match.bestMetric).toFixed(2)} mm = ${(match.bestMetric / MM_PER_INCH).toFixed(4)}"`
                        : `Exact ${match.bestSae.label} = ${(match.bestSae.decimalIn * MM_PER_INCH).toFixed(2)} mm`
                      }
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-700 space-y-2">
                    <p className={`text-sm font-bold uppercase tracking-wider ${tierColor(match.tier)}`}>
                      {tierBadge(match.tier)}
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">{match.note}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {direction === "measure"
                    ? "Measure the bolt head across the flats and enter the value above."
                    : "Pick a wrench size or enter a value to convert."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Reference Chart */}
        <Card>
          <CardHeader><CardTitle>SAE ↔ Metric Wrench Chart</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">SAE</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Decimal</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">≈ MM</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fit</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {referenceChart.map((row, i) => {
                    const tierClass =
                      row.tier === "interchangeable" ? "text-emerald-700 bg-emerald-50" :
                      row.tier === "close"           ? "text-amber-700 bg-amber-50" :
                      row.tier === "loose"           ? "text-orange-700 bg-orange-50" :
                                                       "text-red-700 bg-red-50";
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td
                          className="py-2 pr-3 text-primary cursor-pointer hover:underline font-semibold"
                          onClick={() => {
                            setDirection("sae-to-metric");
                            setSaePick(String(SAE_SIZES.findIndex(s => s.label === row.sae.label)));
                            setCustomIn("");
                          }}
                        >
                          {row.sae.label}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{row.decimalIn.toFixed(4)}"</td>
                        <td className="py-2 pr-3">{row.closestMetric} mm</td>
                        <td className="py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tierClass}`}>
                            {row.tier === "interchangeable" ? "Same"
                              : row.tier === "close" ? "Close"
                              : row.tier === "loose" ? "Loose"
                              : "—"}
                            {row.tier !== "no-match" && ` · Δ ${row.gapMm.toFixed(2)}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Click any SAE size to load it into the converter. "Same" = within 0.20 mm (≈8 thou). "Close" = 0.20–0.40 mm — works on light fasteners, will round a torqued bolt.
            </p>
          </CardContent>
        </Card>
      </div>

      <CalculatorContent data={wrenchSizeContent} title="Wrench Size Converter" />
    </div>
  );
}
