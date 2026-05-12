import { useState, useEffect, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { Info } from "lucide-react";

/* ─── Constants ─── */
const SPEED_CONSTANT = 336.13; // 63360 / (60 × π)

/* ─── Transmission Data ─── */
interface TransmissionDef {
  name: string;
  type: "Auto" | "Manual";
  gears: { label: string; ratio: number }[];
}

const TRANSMISSIONS: TransmissionDef[] = [
  {
    name: "Powerglide",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 1.76 },
      { label: "2nd", ratio: 1.00 },
    ],
  },
  {
    name: "TH350",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.52 },
      { label: "2nd", ratio: 1.52 },
      { label: "3rd", ratio: 1.00 },
    ],
  },
  {
    name: "TH400",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.48 },
      { label: "2nd", ratio: 1.48 },
      { label: "3rd", ratio: 1.00 },
    ],
  },
  {
    name: "700R4 / 4L60E",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 3.06 },
      { label: "2nd", ratio: 1.63 },
      { label: "3rd", ratio: 1.00 },
      { label: "4th (OD)", ratio: 0.70 },
    ],
  },
  {
    name: "4L80E",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.48 },
      { label: "2nd", ratio: 1.48 },
      { label: "3rd", ratio: 1.00 },
      { label: "4th (OD)", ratio: 0.75 },
    ],
  },
  {
    name: "200-4R",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.74 },
      { label: "2nd", ratio: 1.57 },
      { label: "3rd", ratio: 1.00 },
      { label: "4th (OD)", ratio: 0.67 },
    ],
  },
  {
    name: "C4",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.46 },
      { label: "2nd", ratio: 1.46 },
      { label: "3rd", ratio: 1.00 },
    ],
  },
  {
    name: "C6",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.46 },
      { label: "2nd", ratio: 1.46 },
      { label: "3rd", ratio: 1.00 },
    ],
  },
  {
    name: "AOD / AODE",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.40 },
      { label: "2nd", ratio: 1.47 },
      { label: "3rd", ratio: 1.00 },
      { label: "4th (OD)", ratio: 0.67 },
    ],
  },
  {
    name: "4R70W",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.84 },
      { label: "2nd", ratio: 1.55 },
      { label: "3rd", ratio: 1.00 },
      { label: "4th (OD)", ratio: 0.70 },
    ],
  },
  {
    name: "48RE (Mopar)",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 2.45 },
      { label: "2nd", ratio: 1.45 },
      { label: "3rd", ratio: 1.00 },
      { label: "4th (OD)", ratio: 0.69 },
    ],
  },
  {
    name: "68RFE (Mopar)",
    type: "Auto",
    gears: [
      { label: "1st", ratio: 3.23 },
      { label: "2nd", ratio: 1.84 },
      { label: "3rd", ratio: 1.41 },
      { label: "4th", ratio: 1.00 },
      { label: "5th", ratio: 0.82 },
      { label: "6th (OD)", ratio: 0.63 },
    ],
  },
  {
    name: "T5 (Mustang 5.0)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 3.35 },
      { label: "2nd", ratio: 1.93 },
      { label: "3rd", ratio: 1.29 },
      { label: "4th", ratio: 1.00 },
      { label: "5th (OD)", ratio: 0.68 },
    ],
  },
  {
    name: "T45 (Mustang GT)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 3.37 },
      { label: "2nd", ratio: 1.99 },
      { label: "3rd", ratio: 1.33 },
      { label: "4th", ratio: 1.00 },
      { label: "5th (OD)", ratio: 0.67 },
    ],
  },
  {
    name: "TKO-500",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 3.27 },
      { label: "2nd", ratio: 1.97 },
      { label: "3rd", ratio: 1.34 },
      { label: "4th", ratio: 1.00 },
      { label: "5th (OD)", ratio: 0.68 },
    ],
  },
  {
    name: "TKO-600 (0.82 OD)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 2.87 },
      { label: "2nd", ratio: 1.89 },
      { label: "3rd", ratio: 1.28 },
      { label: "4th", ratio: 1.00 },
      { label: "5th (OD)", ratio: 0.82 },
    ],
  },
  {
    name: "TKO-600 (0.64 OD)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 2.87 },
      { label: "2nd", ratio: 1.89 },
      { label: "3rd", ratio: 1.28 },
      { label: "4th", ratio: 1.00 },
      { label: "5th (OD)", ratio: 0.64 },
    ],
  },
  {
    name: "TKX (close ratio)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 2.87 },
      { label: "2nd", ratio: 1.89 },
      { label: "3rd", ratio: 1.28 },
      { label: "4th", ratio: 1.00 },
      { label: "5th (OD)", ratio: 0.68 },
    ],
  },
  {
    name: "TKX (wide ratio)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 3.27 },
      { label: "2nd", ratio: 1.98 },
      { label: "3rd", ratio: 1.34 },
      { label: "4th", ratio: 1.00 },
      { label: "5th (OD)", ratio: 0.72 },
    ],
  },
  {
    name: "T56 Magnum (close ratio)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 2.66 },
      { label: "2nd", ratio: 1.78 },
      { label: "3rd", ratio: 1.30 },
      { label: "4th", ratio: 1.00 },
      { label: "5th", ratio: 0.80 },
      { label: "6th (OD)", ratio: 0.63 },
    ],
  },
  {
    name: "T56 Magnum (wide ratio)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 2.97 },
      { label: "2nd", ratio: 2.10 },
      { label: "3rd", ratio: 1.46 },
      { label: "4th", ratio: 1.00 },
      { label: "5th", ratio: 0.74 },
      { label: "6th (OD)", ratio: 0.50 },
    ],
  },
  {
    name: "TR-6060 (Camaro SS)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 3.01 },
      { label: "2nd", ratio: 2.07 },
      { label: "3rd", ratio: 1.43 },
      { label: "4th", ratio: 1.00 },
      { label: "5th", ratio: 0.84 },
      { label: "6th (OD)", ratio: 0.57 },
    ],
  },
  {
    name: "TR-6060 (Corvette / CTS-V)",
    type: "Manual",
    gears: [
      { label: "1st", ratio: 2.66 },
      { label: "2nd", ratio: 1.78 },
      { label: "3rd", ratio: 1.30 },
      { label: "4th", ratio: 1.00 },
      { label: "5th", ratio: 0.80 },
      { label: "6th (OD)", ratio: 0.63 },
    ],
  },
];

/* ─── Common Axle Ratios ─── */
const COMMON_RATIOS = [
  { ratio: 2.73, cat: "Economy" },
  { ratio: 3.08, cat: "Economy" },
  { ratio: 3.23, cat: "Street" },
  { ratio: 3.42, cat: "Street" },
  { ratio: 3.55, cat: "Performance" },
  { ratio: 3.73, cat: "Performance" },
  { ratio: 3.90, cat: "Street/Strip" },
  { ratio: 4.10, cat: "Street/Strip" },
  { ratio: 4.11, cat: "Street/Strip" },
  { ratio: 4.30, cat: "Strip" },
  { ratio: 4.56, cat: "Strip" },
  { ratio: 4.88, cat: "Drag/Off-road" },
  { ratio: 5.13, cat: "Drag/Off-road" },
  { ratio: 5.38, cat: "Off-road" },
];

/* ─── Common Tire Sizes ─── */
const TIRE_PRESETS = [
  { label: "P255/60R15 (26.0\")", diameter: 26.0 },
  { label: "P275/60R15 (27.0\")", diameter: 27.0 },
  { label: "P275/40R17 (25.7\")", diameter: 25.7 },
  { label: "275/35R18 (25.6\")", diameter: 25.6 },
  { label: "28×10.5-15 drag (28.0\")", diameter: 28.0 },
  { label: "P235/75R15 truck (28.9\")", diameter: 28.9 },
  { label: "33×12.5R15 (33.0\")", diameter: 33.0 },
  { label: "P245/45R17 (25.7\")", diameter: 25.7 },
  { label: "26×8.5-15 drag (26.0\")", diameter: 26.0 },
];

/* ─── Helpers ─── */
function calcSpeed(rpm: number, tireDia: number, axleRatio: number, transRatio: number): number {
  return (rpm * tireDia) / (axleRatio * transRatio * SPEED_CONSTANT);
}

function calcRpm(mph: number, tireDia: number, axleRatio: number, transRatio: number): number {
  return (mph * axleRatio * transRatio * SPEED_CONSTANT) / tireDia;
}

function rpmColor(rpm: number): string {
  if (rpm <= 2500) return "text-green-500";
  if (rpm <= 3000) return "text-yellow-500";
  if (rpm <= 3500) return "text-orange-500";
  return "text-red-500";
}

function rpmBg(rpm: number): string {
  if (rpm <= 2500) return "bg-green-500/10";
  if (rpm <= 3000) return "bg-yellow-500/10";
  if (rpm <= 3500) return "bg-orange-500/10";
  return "bg-red-500/10";
}

function tireDiameterFromMetric(widthMm: number, aspectRatio: number, rimDia: number): number {
  return (2 * (widthMm * (aspectRatio / 100)) / 25.4) + rimDia;
}

/* ─── Component ─── */
export default function GearRatioCalculator() {
  const [axleRatio, setAxleRatio] = useBuildField("computed.gearRatio", "3.73");
  const [tireDia, setTireDia] = useBuildField("computed.tireDiameter", "26.0");
  const [transIdx, setTransIdx] = useState("3"); // default 700R4/4L60E
  const [mode, setMode] = useState("speed-from-rpm");
  const [inputRpm, setInputRpm] = useState("5500");
  const [peakTorqueRpm, setPeakTorqueRpm] = useState("4000");
  const [inputMph, setInputMph] = useState("70");
  const [compareRatio, setCompareRatio] = useState("4.10");

  // Tire size calculator sub-fields
  const [showTireCalc, setShowTireCalc] = useState(false);
  const [tireWidth, setTireWidth] = useState("275");
  const [tireAspect, setTireAspect] = useState("60");
  const [tireRim, setTireRim] = useState("15");

  // Custom gear overrides
  const [gearOverrides, setGearOverrides] = useState<Record<number, string>>({});

  const { activeBuild, setField } = useBuildContext();

  // Parse values
  const axle = parseFloat(axleRatio) || 3.73;
  const tire = parseFloat(tireDia) || 26.0;
  const rpm = parseFloat(inputRpm) || 5500;
  const torqueRpm = parseFloat(peakTorqueRpm) || 4000;
  const mph = parseFloat(inputMph) || 70;
  const axle2 = parseFloat(compareRatio) || 4.10;

  // Active transmission
  const trans = TRANSMISSIONS[parseInt(transIdx) || 0];
  const gears = useMemo(() =>
    trans.gears.map((g, i) => ({
      ...g,
      ratio: gearOverrides[i] !== undefined ? (parseFloat(gearOverrides[i]) || g.ratio) : g.ratio,
    })),
    [trans, gearOverrides]
  );

  // Top gear (last in list)
  const topGear = gears[gears.length - 1];

  // Write back to build context
  useEffect(() => {
    if (activeBuild && axle > 0) {
      setField("computed.gearRatio", axle.toFixed(2));
    }
  }, [axle, activeBuild?.id]);

  useEffect(() => {
    if (activeBuild && tire > 0) {
      setField("computed.tireDiameter", tire.toFixed(1));
    }
  }, [tire, activeBuild?.id]);

  // Tire size auto-calc
  const calcTireFromMetric = () => {
    const w = parseFloat(tireWidth) || 275;
    const a = parseFloat(tireAspect) || 60;
    const r = parseFloat(tireRim) || 15;
    const d = tireDiameterFromMetric(w, a, r);
    setTireDia(d.toFixed(1));
  };

  // Reset overrides when switching transmissions
  const handleTransChange = (val: string) => {
    setTransIdx(val);
    setGearOverrides({});
  };

  /* ─── RPM vs Speed SVG Chart ─── */
  const chartLines = useMemo(() => {
    const maxMph = 200;
    const maxRpm = 8000;
    const w = 500;
    const h = 280;
    const padL = 50;
    const padB = 30;
    const padT = 10;
    const padR = 10;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const colors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7"];

    const lines = gears.map((g, gi) => {
      const pts: string[] = [];
      for (let s = 0; s <= maxMph; s += 2) {
        const r = calcRpm(s, tire, axle, g.ratio);
        if (r > maxRpm) break;
        const x = padL + (s / maxMph) * plotW;
        const y = padT + plotH - (r / maxRpm) * plotH;
        pts.push(`${x},${y}`);
      }
      return { label: g.label, color: colors[gi % colors.length], points: pts.join(" ") };
    });

    // Y-axis ticks
    const yTicks = [0, 2000, 4000, 6000, 8000].map(r => ({
      rpm: r,
      y: padT + plotH - (r / maxRpm) * plotH,
    }));

    // X-axis ticks
    const xTicks = [0, 50, 100, 150, 200].map(s => ({
      mph: s,
      x: padL + (s / maxMph) * plotW,
    }));

    return { lines, yTicks, xTicks, w, h, padL, padT, padB, plotW, plotH };
  }, [gears, tire, axle]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Gear Ratio / Final Drive Calculator"
        description="Calculate RPM at speed for any axle ratio, tire size, and transmission. Compare gear ratios, see highway cruise RPM, and find the right gears for your build."
        canonical="/calculators/gear-ratio"
        keywords="gear ratio calculator, final drive calculator, RPM at speed calculator, what gears for my car, 4L60E gear ratio chart, tire size vs gear ratio"
      />
      <h1 className="text-3xl font-bold mb-2">Gear Ratio / Final Drive Calculator</h1>
      <p className="text-muted-foreground mb-6">Calculate speed from RPM or RPM from speed for any axle ratio, tire size, and transmission combination.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      {/* ─── Mode Tabs ─── */}
      <Tabs value={mode} onValueChange={setMode} className="mb-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="speed-from-rpm">Speed from RPM</TabsTrigger>
          <TabsTrigger value="rpm-from-speed">RPM from Speed</TabsTrigger>
          <TabsTrigger value="compare">Compare Ratios</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── INPUT COLUMN ─── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Axle Ratio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rear Axle Ratio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="number" step="0.01" value={axleRatio} onChange={e => setAxleRatio(e.target.value)} />
              <div className="flex flex-wrap gap-1">
                {COMMON_RATIOS.map(r => (
                  <button
                    key={r.ratio}
                    onClick={() => setAxleRatio(r.ratio.toFixed(2))}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      parseFloat(axleRatio) === r.ratio
                        ? "bg-[#E85D04] text-white border-[#E85D04]"
                        : "bg-muted border-border hover:border-[#E85D04]"
                    }`}
                  >
                    {r.ratio.toFixed(2)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tire Diameter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tire Diameter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Diameter (inches)</Label>
                <Input type="number" step="0.1" value={tireDia} onChange={e => setTireDia(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-1">
                {TIRE_PRESETS.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setTireDia(t.diameter.toFixed(1))}
                    className="text-xs px-2 py-1 rounded border bg-muted border-border hover:border-[#E85D04] transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTireCalc(!showTireCalc)}
                className="text-xs text-[#E85D04] hover:underline"
              >
                {showTireCalc ? "Hide" : "Calculate from tire size (e.g. 275/60R15)"}
              </button>
              {showTireCalc && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Width (mm)</Label>
                      <Input type="number" value={tireWidth} onChange={e => setTireWidth(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Aspect %</Label>
                      <Input type="number" value={tireAspect} onChange={e => setTireAspect(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rim (in)</Label>
                      <Input type="number" value={tireRim} onChange={e => setTireRim(e.target.value)} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={calcTireFromMetric} className="w-full">
                    Calculate → {tireDiameterFromMetric(parseFloat(tireWidth) || 0, parseFloat(tireAspect) || 0, parseFloat(tireRim) || 0).toFixed(1)}"
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transmission */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transmission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={transIdx} onValueChange={handleTransChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map((t, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                {gears.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">{g.label}</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-7 text-sm"
                      value={gearOverrides[i] !== undefined ? gearOverrides[i] : g.ratio.toFixed(2)}
                      onChange={e => setGearOverrides(prev => ({ ...prev, [i]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mode-specific inputs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {mode === "speed-from-rpm" ? "Engine RPM" : mode === "rpm-from-speed" ? "Target Speed" : "Compare"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(mode === "speed-from-rpm" || mode === "compare") && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Redline RPM</Label>
                    <Input type="number" step="100" value={inputRpm} onChange={e => setInputRpm(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Peak Torque RPM</Label>
                    <Input type="number" step="100" value={peakTorqueRpm} onChange={e => setPeakTorqueRpm(e.target.value)} />
                  </div>
                </>
              )}
              {(mode === "rpm-from-speed" || mode === "compare") && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Target Speed (MPH)</Label>
                  <Input type="number" step="5" value={inputMph} onChange={e => setInputMph(e.target.value)} />
                </div>
              )}
              {mode === "compare" && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Second Axle Ratio</Label>
                  <Input type="number" step="0.01" value={compareRatio} onChange={e => setCompareRatio(e.target.value)} />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[2.73, 3.08, 3.42, 3.55, 3.73, 4.10, 4.56].map(r => (
                      <button
                        key={r}
                        onClick={() => setCompareRatio(r.toFixed(2))}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          parseFloat(compareRatio) === r
                            ? "bg-[#E85D04] text-white border-[#E85D04]"
                            : "bg-muted border-border hover:border-[#E85D04]"
                        }`}
                      >
                        {r.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── RESULTS COLUMN ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Gear Sweep Table */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader>
              <CardTitle>
                {mode === "compare"
                  ? `Gear Comparison: ${axle.toFixed(2)} vs ${axle2.toFixed(2)}`
                  : `${trans.name} with ${axle.toFixed(2)} Gears — ${tire.toFixed(1)}" Tires`}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {mode === "compare"
                  ? `Side-by-side RPM at ${mph} MPH`
                  : mode === "speed-from-rpm"
                  ? `Speed at ${torqueRpm.toLocaleString()} RPM (peak torque) and ${rpm.toLocaleString()} RPM (redline)`
                  : `RPM at ${mph} MPH in each gear`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="text-left py-2 pr-2">Gear</th>
                      <th className="text-right py-2 px-2">Ratio</th>
                      <th className="text-right py-2 px-2">Eff. Ratio</th>
                      {mode === "speed-from-rpm" && (
                        <>
                          <th className="text-right py-2 px-2">MPH @ {(torqueRpm / 1000).toFixed(1)}k</th>
                          <th className="text-right py-2 px-2">MPH @ {(rpm / 1000).toFixed(1)}k</th>
                        </>
                      )}
                      {mode !== "compare" && (
                        <>
                          <th className="text-right py-2 px-2">RPM @ 60</th>
                          <th className="text-right py-2 px-2">RPM @ 70</th>
                        </>
                      )}
                      {mode === "rpm-from-speed" && (
                        <th className="text-right py-2 px-2">RPM @ {mph}</th>
                      )}
                      {mode === "compare" && (
                        <>
                          <th className="text-right py-2 px-2">RPM @ {mph} ({axle.toFixed(2)})</th>
                          <th className="text-right py-2 px-2">RPM @ {mph} ({axle2.toFixed(2)})</th>
                          <th className="text-right py-2 px-2">Diff</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {gears.map((g, i) => {
                      const effRatio = axle * g.ratio;
                      const mphTorque = calcSpeed(torqueRpm, tire, axle, g.ratio);
                      const mphRedline = calcSpeed(rpm, tire, axle, g.ratio);
                      const rpm60 = calcRpm(60, tire, axle, g.ratio);
                      const rpm70 = calcRpm(70, tire, axle, g.ratio);
                      const rpmAtTarget = calcRpm(mph, tire, axle, g.ratio);
                      const rpmAtTarget2 = calcRpm(mph, tire, axle2, g.ratio);
                      const diff = rpmAtTarget2 - rpmAtTarget;

                      return (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-2 pr-2 font-medium">{g.label}</td>
                          <td className="text-right py-2 px-2 text-gray-300">{g.ratio.toFixed(2)}</td>
                          <td className="text-right py-2 px-2 text-gray-300">{effRatio.toFixed(2)}</td>
                          {mode === "speed-from-rpm" && (
                            <>
                              <td className="text-right py-2 px-2">{mphTorque.toFixed(1)}</td>
                              <td className="text-right py-2 px-2 font-semibold">{mphRedline.toFixed(1)}</td>
                            </>
                          )}
                          {mode !== "compare" && (
                            <>
                              <td className={`text-right py-2 px-2 ${rpmColor(rpm60)}`}>{rpm60.toFixed(0)}</td>
                              <td className={`text-right py-2 px-2 font-semibold ${rpmColor(rpm70)}`}>{rpm70.toFixed(0)}</td>
                            </>
                          )}
                          {mode === "rpm-from-speed" && (
                            <td className={`text-right py-2 px-2 font-semibold ${rpmColor(rpmAtTarget)}`}>
                              {rpmAtTarget.toFixed(0)}
                            </td>
                          )}
                          {mode === "compare" && (
                            <>
                              <td className={`text-right py-2 px-2 ${rpmColor(rpmAtTarget)}`}>
                                {rpmAtTarget.toFixed(0)}
                              </td>
                              <td className={`text-right py-2 px-2 ${rpmColor(rpmAtTarget2)}`}>
                                {rpmAtTarget2.toFixed(0)}
                              </td>
                              <td className={`text-right py-2 px-2 font-semibold ${diff > 0 ? "text-orange-400" : "text-green-400"}`}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(0)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Highway Cruise RPM */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Highway Cruise RPM (Top Gear: {topGear.label})</CardTitle>
              <CardDescription>RPM in {topGear.label} ({topGear.ratio.toFixed(2)}) with {axle.toFixed(2)} gears and {tire.toFixed(1)}" tires</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[1500, 2000, 2500, 3000].map(r => {
                  const spd = calcSpeed(r, tire, axle, topGear.ratio);
                  return (
                    <div key={r} className={`p-3 rounded-lg text-center ${rpmBg(r)}`}>
                      <p className="text-xs text-muted-foreground">{r.toLocaleString()} RPM</p>
                      <p className="text-xl font-bold">{spd.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">MPH</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[60, 65, 70, 75].map(s => {
                  const r = calcRpm(s, tire, axle, topGear.ratio);
                  return (
                    <div key={s} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm text-muted-foreground">{s} MPH →</span>
                      <span className={`text-sm font-bold ${rpmColor(r)}`}>{r.toFixed(0)} RPM</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* RPM vs Speed Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">RPM vs Speed Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <svg viewBox={`0 0 ${chartLines.w} ${chartLines.h}`} className="w-full" aria-label="RPM vs Speed chart">
                {/* Grid lines */}
                {chartLines.yTicks.map(t => (
                  <g key={t.rpm}>
                    <line x1={chartLines.padL} y1={t.y} x2={chartLines.padL + chartLines.plotW} y2={t.y} stroke="#333" strokeWidth={0.5} />
                    <text x={chartLines.padL - 4} y={t.y + 4} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>
                      {t.rpm > 0 ? `${(t.rpm / 1000).toFixed(0)}k` : "0"}
                    </text>
                  </g>
                ))}
                {chartLines.xTicks.map(t => (
                  <g key={t.mph}>
                    <line x1={t.x} y1={chartLines.padT} x2={t.x} y2={chartLines.padT + chartLines.plotH} stroke="#333" strokeWidth={0.5} />
                    <text x={t.x} y={chartLines.padT + chartLines.plotH + 14} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>
                      {t.mph}
                    </text>
                  </g>
                ))}
                {/* Axis labels */}
                <text x={chartLines.padL + chartLines.plotW / 2} y={chartLines.h - 2} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10 }}>
                  MPH
                </text>
                <text x={12} y={chartLines.padT + chartLines.plotH / 2} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10 }} transform={`rotate(-90, 12, ${chartLines.padT + chartLines.plotH / 2})`}>
                  RPM
                </text>
                {/* Gear lines */}
                {chartLines.lines.map((line, i) => (
                  <g key={i}>
                    <polyline
                      points={line.points}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={2}
                    />
                    {line.points.length > 0 && (
                      <text
                        x={parseFloat(line.points.split(" ").pop()!.split(",")[0]) + 4}
                        y={parseFloat(line.points.split(" ").pop()!.split(",")[1]) + 3}
                        className="fill-current"
                        style={{ fontSize: 9, fill: line.color }}
                      >
                        {line.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </CardContent>
          </Card>

          {/* Compare Mode Summary */}
          {mode === "compare" && (
            <Card className="border-[#E85D04]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comparison Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const topRpm1 = calcRpm(mph, tire, axle, topGear.ratio);
                  const topRpm2 = calcRpm(mph, tire, axle2, topGear.ratio);
                  const diff = topRpm2 - topRpm1;
                  const firstGear = gears[0];
                  const eff1 = axle * firstGear.ratio;
                  const eff2 = axle2 * firstGear.ratio;
                  const accelGain = ((eff2 - eff1) / eff1) * 100;
                  return (
                    <>
                      <p className="text-sm">
                        With <strong>{axle.toFixed(2)}</strong> gears: <strong className={rpmColor(topRpm1)}>{topRpm1.toFixed(0)} RPM</strong> at {mph} MPH in {topGear.label}
                      </p>
                      <p className="text-sm">
                        With <strong>{axle2.toFixed(2)}</strong> gears: <strong className={rpmColor(topRpm2)}>{topRpm2.toFixed(0)} RPM</strong> at {mph} MPH in {topGear.label}
                      </p>
                      <p className="text-sm font-medium">
                        Difference: <span className={diff > 0 ? "text-orange-500" : "text-green-500"}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(0)} RPM at cruise
                        </span>
                        {accelGain !== 0 && (
                          <span className="text-muted-foreground">
                            , {accelGain > 0 ? "+" : ""}{accelGain.toFixed(1)}% first-gear multiplication
                          </span>
                        )}
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {(() => {
            const rpm70Top = calcRpm(70, tire, axle, topGear.ratio);
            const firstEffective = axle * gears[0].ratio;
            const warnings: { msg: string; type: "warn" | "info" }[] = [];

            if (rpm70Top > 3000) {
              warnings.push({
                msg: `${rpm70Top.toFixed(0)} RPM at 70 MPH in ${topGear.label}. Highway cruise will be loud and fuel-hungry. Consider a taller overdrive or numerically lower gears.`,
                type: "warn",
              });
            }
            if (rpm70Top < 1500) {
              warnings.push({
                msg: `Only ${rpm70Top.toFixed(0)} RPM at 70 MPH. Engine will be lugging at highway speed. Consider numerically higher gears or a different converter.`,
                type: "warn",
              });
            }
            if (firstEffective > 12) {
              warnings.push({
                msg: `First gear effective ratio is ${firstEffective.toFixed(2)}:1 — very aggressive. Watch for tire spin on the street.`,
                type: "info",
              });
            }

            if (warnings.length === 0) return null;

            return (
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm ${
                      w.type === "warn"
                        ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
                        : "bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    {w.msg}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

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
              <p>MPH = (RPM x Tire Diameter) / (Gear Ratio x Axle Ratio x 336). Works for any combination.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Axle Ratio Effect</h4>
              <p>Higher number = more multiplication = quicker acceleration but lower top speed and higher highway RPM.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Tire Size Impact</h4>
              <p>Taller tires act like a lower gear ratio. A 2" taller tire is roughly equivalent to dropping 0.20 from the axle ratio.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Common Axle Ratios</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>Highway cruise:</span><span className="font-mono">2.73-3.08</span></li>
                <li className="flex justify-between"><span>Street/strip:</span><span className="font-mono">3.42-3.73</span></li>
                <li className="flex justify-between"><span>Drag racing:</span><span className="font-mono">4.10-4.56</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Gear Ratio and Final Drive Selection</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Engine RPM at any given speed is determined by: RPM = (Speed x Gear Ratio x Axle Ratio x 336.13) / Tire Diameter. This relationship governs whether your engine is loafing on the highway or screaming at redline. The transmission gear ratio multiplied by the axle (ring and pinion) ratio gives the overall drive ratio, and the tire diameter acts as the final reduction — taller tires effectively lower the ratio, shorter tires raise it.
          </p>
          <p>
            The classic street/strip dilemma is 3.73 versus 4.10 rear gears. With 3.73s and a 28" tire in a 1:1 top gear, 70 MPH puts the engine at about 2,650 RPM — comfortable for highway cruising, good fuel economy, and lower engine wear. Switch to 4.10s and that same 70 MPH is now 2,910 RPM — noticeably busier on the highway but significantly quicker off the line and through the gears because the engine stays closer to its torque peak during acceleration.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Tire Size and Highway RPM</h3>
          <p>
            Tire diameter changes your effective gear ratio without touching the ring and pinion. Going from a 26" tire to a 28" tire with 3.73 gears drops highway RPM by about 7% — equivalent to swapping from 3.73s to roughly 3.46s. This is why drag racers run small-diameter slicks (shorter tire = higher effective ratio for launch) and why tall off-road tires make trucks feel sluggish (lower effective ratio, engine below its torque peak). Always recalculate your cruise RPM when changing tire sizes, and consider a gear swap if you have moved more than 2" in tire diameter from stock.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
