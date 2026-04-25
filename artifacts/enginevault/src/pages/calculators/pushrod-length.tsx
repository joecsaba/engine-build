import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ── Platform data ──────────────────────────────────────────────── */

const platforms = [
  { value: "sbc350",      label: "SBC 350",                        stock: 7.794 },
  { value: "bbc454-int",  label: "BBC 454 (intake)",               stock: 8.280 },
  { value: "bbc454-exh",  label: "BBC 454 (exhaust)",              stock: 9.252 },
  { value: "ls1",         label: "LS1 / LS6",                      stock: 7.400 },
  { value: "ls2",         label: "LS2 / LS3",                      stock: 7.400 },
  { value: "ls7",         label: "LS7",                            stock: 7.800 },
  { value: "lsa",         label: "LSA / LS9",                      stock: 7.400 },
  { value: "lsx",         label: "LSX / Gen 4 Truck",              stock: 7.400 },
  { value: "sbf302",      label: "SBF 302 (roller cam)",           stock: 6.272 },
  { value: "sbf302ft",    label: "SBF 302 (flat tappet)",          stock: 6.905 },
  { value: "sbf351w-ft",  label: "SBF 351W (flat tappet)",         stock: 8.150 },
  { value: "sbf351w-rl",  label: "SBF 351W (roller, '94–'97)",     stock: 7.567 },
  { value: "hemi57-int",  label: "Gen III Hemi 5.7 (intake)",      stock: 6.610 },
  { value: "hemi57-exh",  label: "Gen III Hemi 5.7 (exhaust)",     stock: 7.840 },
  { value: "hemi57v-int", label: "Gen III Hemi 5.7 VVT (intake)",  stock: 6.800 },
  { value: "hemi57v-exh", label: "Gen III Hemi 5.7 VVT (exhaust)", stock: 8.100 },
  { value: "custom",      label: "Custom",                         stock: 0 },
];

const lsPlatforms = [
  { value: "ls-std",   label: "LS1 / LS6 / LS2 / LS3",  stock: 7.400 },
  { value: "ls-7",     label: "LS7",                     stock: 7.800 },
  { value: "ls-a9",    label: "LSA / LS9",               stock: 7.400 },
  { value: "ls-truck", label: "Truck LS",                stock: 7.400 },
  { value: "ls-custom",label: "Custom",                  stock: 0 },
];

const preloadTurns = [
  { value: "0",     label: "0 (zero lash only)", turns: 0 },
  { value: "0.125", label: "1/8 turn",           turns: 0.125 },
  { value: "0.25",  label: "1/4 turn",           turns: 0.25 },
  { value: "0.375", label: "3/8 turn",           turns: 0.375 },
  { value: "0.5",   label: "1/2 turn",           turns: 0.5 },
  { value: "0.75",  label: "3/4 turn",           turns: 0.75 },
  { value: "1",     label: "1 full turn",        turns: 1 },
];

const studThreads = [
  { value: "7/16-20", label: "7/16-20",        perTurn: 0.050 },
  { value: "3/8-24",  label: "3/8-24",         perTurn: 1 / 24 },
  { value: "M8-1.0",  label: "M8-1.0 (LS metric)", perTurn: 1 / 25.4 },
];

const lsCommonLengths = [7.350, 7.375, 7.400, 7.425, 7.450, 7.750, 7.775, 7.800, 7.825, 7.850];

/* ── Helpers ────────────────────────────────────────────────────── */

function roundToNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function nearestStockLengths(calculated: number, count: number): { shorter: number[]; longer: number[] } {
  const increment = 0.025;
  const rounded = roundToNearest(calculated, increment);
  const shorter: number[] = [];
  const longer: number[] = [];
  for (let i = 1; i <= count; i++) {
    shorter.push(+(rounded - i * increment).toFixed(3));
    longer.push(+(rounded + i * increment).toFixed(3));
  }
  return { shorter: shorter.reverse(), longer };
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-0.5">{children}</p>;
}

function ResultRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="font-bold text-gray-900">{value}</span>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────────── */

export default function PushrodLengthCalculator() {
  /* Tab 1 state */
  const [platform, setPlatform] = useState("ls1");
  const [customStock, setCustomStock] = useState("7.400");
  const [headMill, setHeadMill] = useState("0");
  const [blockMill, setBlockMill] = useState("0");
  const [gasketChange, setGasketChange] = useState("0");
  const [camReduction, setCamReduction] = useState("0");

  /* Tab 2 state */
  const [checkerLength, setCheckerLength] = useState("");
  const [lifterType, setLifterType] = useState("hydraulic");
  const [studThread, setStudThread] = useState("7/16-20");
  const [preloadTurn, setPreloadTurn] = useState("0.5");

  /* Tab 3 state */
  const [lsPlatform, setLsPlatform] = useState("ls-std");
  const [lsCustomStock, setLsCustomStock] = useState("7.400");
  const [lsHeadMill, setLsHeadMill] = useState("0");
  const [lsBlockMill, setLsBlockMill] = useState("0");
  const [lsGasketChange, setLsGasketChange] = useState("0");
  const [lsCamReduction, setLsCamReduction] = useState("0");

  /* ── Tab 1 calculations ─────────────────────────────────────── */
  const stockLength = platform === "custom"
    ? (parseFloat(customStock) || 0)
    : (platforms.find(p => p.value === platform)?.stock ?? 0);

  const hm = parseFloat(headMill) || 0;
  const bm = parseFloat(blockMill) || 0;
  const gc = parseFloat(gasketChange) || 0;
  const cr = parseFloat(camReduction) || 0;

  const newLength = stockLength - hm - bm + gc + cr;
  const delta = newLength - stockLength;
  const recommended = roundToNearest(newLength, 0.025);
  const nearby = nearestStockLengths(newLength, 3);

  /* ── Tab 2 calculations ─────────────────────────────────────── */
  const cl = parseFloat(checkerLength) || 0;
  const thread = studThreads.find(t => t.value === studThread)!;
  const turns = preloadTurns.find(t => t.value === preloadTurn)!;
  const preloadDistance = lifterType === "hydraulic" ? thread.perTurn * turns.turns : 0;
  const finalCheckerLength = cl > 0 ? cl + preloadDistance : 0;

  /* ── Tab 3 calculations ─────────────────────────────────────── */
  const lsStock = lsPlatform === "ls-custom"
    ? (parseFloat(lsCustomStock) || 0)
    : (lsPlatforms.find(p => p.value === lsPlatform)?.stock ?? 0);

  const lsHm = parseFloat(lsHeadMill) || 0;
  const lsBm = parseFloat(lsBlockMill) || 0;
  const lsGc = parseFloat(lsGasketChange) || 0;
  const lsCr = parseFloat(lsCamReduction) || 0;

  const lsHydraulic = lsStock - lsHm - lsBm + lsGc + lsCr;
  const lsSolid = lsHydraulic - 0.050;
  const lsRelevantLengths = lsCommonLengths.filter(len =>
    Math.abs(len - lsHydraulic) <= 0.100
  );
  const lsDisplayLengths = lsRelevantLengths.length > 0 ? lsRelevantLengths : lsCommonLengths;
  const lsClosest = lsDisplayLengths.reduce((a, b) =>
    Math.abs(b - lsHydraulic) < Math.abs(a - lsHydraulic) ? b : a
  );

  /* ── Copy handler ───────────────────────────────────────────── */
  function handleCopyWorkflow() {
    const text = [
      "Pushrod Length Checker Workflow",
      "================================",
      "",
      "Step 1: Prepare the engine",
      "- Short-block fully assembled",
      "- One cylinder fully dressed: valves, springs, retainers, head, gasket",
      "- Rocker studs/mounts installed",
      "- Lifter for the cylinder being measured installed",
      "",
      "Step 2: Install adjustable checker pushrod",
      "- Comp Cams: 0.140\" gauge ball",
      "- Trend: 0.125\" gauge ball",
      "- Manton: check product page",
      "",
      "Step 3: Set baseline length",
      "- Turn cam to base circle (both valves closed for this cylinder)",
      "- Back off adjuster until pushrod has play",
      "- Extend slowly until rocker sits on base circle with zero lash",
      "",
      "Step 4: Mark witness pattern",
      "- Sharpie across the entire valve tip",
      "- Rotate engine two full revolutions by hand",
      "- Observe wiped pattern on valve tip",
      "",
      "Step 5: Evaluate pattern",
      "- Pattern should be 30-50% of valve tip width, roughly centered",
      "- Toward exhaust side: pushrod too short — lengthen",
      "- Toward intake side: pushrod too long — shorten",
      "- Repeat steps 3-4 until centered",
      "",
      "Step 6: Measure checker",
      "- Remove checker without changing length",
      "- Measure over ball ends with caliper",
      "",
      "Step 7: Add preload (hydraulic lifters only)",
      cl > 0 ? `- Checker length: ${cl.toFixed(3)}"` : "- Checker length: ___",
      lifterType === "hydraulic"
        ? `- Preload: ${preloadDistance.toFixed(4)}" (${turns.label} on ${studThread})`
        : "- Solid lifter: no preload added",
      finalCheckerLength > 0
        ? `- Final pushrod length: ${finalCheckerLength.toFixed(3)}"`
        : "",
    ].join("\n");

    navigator.clipboard.writeText(text);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Pushrod Length Calculator"
        description="Calculate correct pushrod length for LS, SBC, BBC, SBF, and Hemi engines. Delta-from-stock calculator, checker pushrod workflow, and LS non-adjustable rocker guide."
        canonical="/calculators/pushrod-length"
        keywords="pushrod length calculator, LS pushrod length, SBC pushrod length, checker pushrod, pushrod preload, rocker geometry, hydraulic lifter preload"
      />
      <h1 className="text-3xl font-bold mb-2">Pushrod Length Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate the correct pushrod length for your engine combination using delta-from-stock or checker pushrod methods.</p>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <p className="text-yellow-700 font-bold text-sm">This calculator provides estimates only. Always verify with an adjustable checker pushrod before ordering. Aftermarket rockers (Harland Sharp, Yella Terra, Jesel, etc.) have different trunnion heights that change pushrod length requirements — use the rocker manufacturer's recommendation.</p>
      </div>

      <Tabs defaultValue="delta" className="space-y-6">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="delta" className="text-xs sm:text-sm py-2">Delta from Stock</TabsTrigger>
          <TabsTrigger value="checker" className="text-xs sm:text-sm py-2">Checker Workflow</TabsTrigger>
          <TabsTrigger value="ls" className="text-xs sm:text-sm py-2">LS Non-Adjustable</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 1: DELTA FROM STOCK                               */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="delta">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Engine Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {platforms.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}{p.value !== "custom" ? ` (stock ${p.stock}")` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {platform === "custom" && (
                  <div className="space-y-1">
                    <Label>Stock Pushrod Length (inches)</Label>
                    <Input type="number" step="0.001" value={customStock} onChange={e => setCustomStock(e.target.value)} />
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Head Mill Amount (inches)</Label>
                  <Input type="number" step="0.001" value={headMill} onChange={e => setHeadMill(e.target.value)} />
                  <Hint>Positive = material removed. Milling makes pushrod shorter.</Hint>
                </div>

                <div className="space-y-1">
                  <Label>Block Mill Amount (inches)</Label>
                  <Input type="number" step="0.001" value={blockMill} onChange={e => setBlockMill(e.target.value)} />
                  <Hint>Positive = material removed. Milling makes pushrod shorter.</Hint>
                </div>

                <div className="space-y-1">
                  <Label>Gasket Thickness Change from Stock (inches)</Label>
                  <Input type="number" step="0.001" value={gasketChange} onChange={e => setGasketChange(e.target.value)} />
                  <Hint>Positive = thicker than stock. Thicker gasket makes pushrod longer.</Hint>
                </div>

                <div className="space-y-1">
                  <Label>Cam Base Circle Reduction from Stock (inches)</Label>
                  <Input type="number" step="0.001" value={camReduction} onChange={e => setCamReduction(e.target.value)} />
                  <Hint>Positive = new cam has smaller base circle. Smaller base circle = lifter sits lower = LONGER pushrod needed. Most aftermarket cams have a smaller base circle than stock.</Hint>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Estimated Pushrod Length</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Calculated Length</p>
                    <p className="text-5xl font-bold text-primary">{newLength.toFixed(3)}"</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Delta from Stock</p>
                    <p className="text-2xl font-bold">{delta >= 0 ? "+" : ""}{delta.toFixed(3)}"</p>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-gray-400 text-sm">Recommended Purchase Length (nearest 0.025")</p>
                    <p className="text-3xl font-bold text-primary">{recommended.toFixed(3)}"</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Nearest Available Lengths</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {nearby.shorter.map(len => (
                      <div key={len} className="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm">
                        <span className="text-gray-500">{len.toFixed(3)}"</span>
                        <span className="text-xs text-muted-foreground">shorter</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 bg-primary/10 rounded px-2 my-1">
                      <span className="font-bold text-primary">{recommended.toFixed(3)}"</span>
                      <span className="text-xs font-semibold text-primary">recommended</span>
                    </div>
                    {nearby.longer.map(len => (
                      <div key={len} className="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm">
                        <span className="text-gray-500">{len.toFixed(3)}"</span>
                        <span className="text-xs text-muted-foreground">longer</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Standard retail (Summit, JEGS) typically stocks 0.050" increments. Trend Performance and specialty vendors stock 0.025" increments.</p>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">new = stock − head_mill − block_mill + gasket_change + cam_base_circle_reduction</p>
                <p className="text-muted-foreground mt-1 text-xs">{stockLength.toFixed(3)} − {hm.toFixed(3)} − {bm.toFixed(3)} + {gc.toFixed(3)} + {cr.toFixed(3)} = {newLength.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 2: CHECKER WORKFLOW                               */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="checker">
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={handleCopyWorkflow}
                className="text-sm text-primary hover:underline font-medium"
              >
                Copy workflow to clipboard
              </button>
            </div>

            {/* Step 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-bold">1</span>
                  Prepare the Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1 ml-11">
                <p>Short-block fully assembled</p>
                <p>One cylinder fully dressed: valves, springs, retainers, head, gasket</p>
                <p>Rocker studs/mounts installed</p>
                <p>Lifter for the cylinder being measured installed</p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-bold">2</span>
                  Install Adjustable Checker Pushrod
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground ml-11">
                <p className="mb-2">Use the correct ball size for your intended pushrod brand:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-gray-50 p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Comp Cams</div>
                    <div className="text-lg font-bold text-foreground">0.140"</div>
                    <div className="text-xs text-gray-500">gauge ball</div>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Trend</div>
                    <div className="text-lg font-bold text-foreground">0.125"</div>
                    <div className="text-xs text-gray-500">gauge ball</div>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Manton</div>
                    <div className="text-lg font-bold text-foreground">Varies</div>
                    <div className="text-xs text-gray-500">check product page</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-bold">3</span>
                  Set Baseline Length
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1 ml-11">
                <p>Turn cam to base circle for the lifter being measured (both valves closed for this cylinder)</p>
                <p>Back off adjuster/checker until pushrod has some play</p>
                <p>Extend slowly until rocker sits on base circle with zero lash</p>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-bold">4</span>
                  Mark Witness Pattern
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1 ml-11">
                <p>Use a Sharpie across the entire valve tip</p>
                <p>Rotate engine two full revolutions by hand</p>
                <p>Observe wiped pattern on valve tip</p>
              </CardContent>
            </Card>

            {/* Step 5 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-bold">5</span>
                  Evaluate Pattern
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm ml-11 space-y-2">
                <p className="text-muted-foreground">Pattern should be 30-50% of valve tip width, roughly centered on valve tip.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="text-orange-700 font-semibold text-sm">Pattern toward exhaust side</p>
                    <p className="text-orange-600 text-xs">Pushrod too short — lengthen checker</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-blue-700 font-semibold text-sm">Pattern toward intake side</p>
                    <p className="text-blue-600 text-xs">Pushrod too long — shorten checker</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">Repeat steps 3–4 until pattern is centered.</p>
              </CardContent>
            </Card>

            {/* Step 6 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-bold">6</span>
                  Measure Checker
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1 ml-11">
                <p>Remove the checker carefully without changing length</p>
                <p>Measure over the ball ends with a caliper</p>
                <p className="font-medium text-foreground">This is your "checker length"</p>
              </CardContent>
            </Card>

            {/* Step 7 — Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E85D04] text-white flex items-center justify-center text-sm font-bold">7</span>
                  Add Hydraulic Lifter Preload (if applicable)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 ml-11">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Checker Length Measured (inches)</Label>
                    <Input type="number" step="0.001" placeholder="e.g. 7.385" value={checkerLength} onChange={e => setCheckerLength(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Lifter Type</Label>
                    <Select value={lifterType} onValueChange={setLifterType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid (no preload)</SelectItem>
                        <SelectItem value="hydraulic">Hydraulic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {lifterType === "hydraulic" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Stud Thread Size</Label>
                      <Select value={studThread} onValueChange={setStudThread}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {studThreads.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Hint>{thread.perTurn.toFixed(4)}" per full turn</Hint>
                    </div>
                    <div className="space-y-1">
                      <Label>Desired Preload Turns from Zero Lash</Label>
                      <Select value={preloadTurn} onValueChange={setPreloadTurn}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {preloadTurns.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {cl > 0 && (
                  <Card className="bg-[#1a1a1a] text-white">
                    <CardContent className="pt-6 space-y-3">
                      {lifterType === "hydraulic" && (
                        <div>
                          <p className="text-gray-400 text-sm">Preload Distance Added</p>
                          <p className="text-2xl font-bold">{preloadDistance.toFixed(4)}"</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {thread.perTurn.toFixed(4)}" per turn x {turns.turns} turns
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400 text-sm">Final Pushrod Length to Order</p>
                        <p className="text-4xl font-bold text-primary">{finalCheckerLength.toFixed(3)}"</p>
                        {lifterType === "solid" && (
                          <p className="text-xs text-gray-500 mt-0.5">Solid lifter — checker length is your pushrod length</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-mono font-medium">preload = per_turn_distance x turns_from_zero_lash</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    7/16-20: 0.0500"/turn &middot; 3/8-24: 0.0417"/turn &middot; M8-1.0: 0.0394"/turn
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 3: LS NON-ADJUSTABLE                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="ls">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700 font-bold text-sm">For LS engines with non-adjustable rockers. The pushrod length IS the adjustment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>LS Variant</Label>
                  <Select value={lsPlatform} onValueChange={setLsPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {lsPlatforms.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}{p.value !== "ls-custom" ? ` (stock ${p.stock}")` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {lsPlatform === "ls-custom" && (
                  <div className="space-y-1">
                    <Label>Stock Pushrod Length (inches)</Label>
                    <Input type="number" step="0.001" value={lsCustomStock} onChange={e => setLsCustomStock(e.target.value)} />
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Head Milled (inches)</Label>
                  <Input type="number" step="0.001" value={lsHeadMill} onChange={e => setLsHeadMill(e.target.value)} />
                  <Hint>Positive = material removed.</Hint>
                </div>

                <div className="space-y-1">
                  <Label>Block Milled (inches)</Label>
                  <Input type="number" step="0.001" value={lsBlockMill} onChange={e => setLsBlockMill(e.target.value)} />
                  <Hint>Positive = material removed.</Hint>
                </div>

                <div className="space-y-1">
                  <Label>Gasket Thickness vs Stock (inches)</Label>
                  <Input type="number" step="0.001" value={lsGasketChange} onChange={e => setLsGasketChange(e.target.value)} />
                  <Hint>Positive = thicker than stock gasket.</Hint>
                </div>

                <div className="space-y-1">
                  <Label>Cam Base Circle Reduction from Stock (inches)</Label>
                  <Input type="number" step="0.001" value={lsCamReduction} onChange={e => setLsCamReduction(e.target.value)} />
                  <Hint>Positive = new cam has smaller base circle. Most aftermarket LS cams have a smaller base circle than stock — lifter sits lower, requiring a longer pushrod.</Hint>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Recommended Pushrod Length</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-gray-400 text-sm">Hydraulic (standard preload)</p>
                    <p className="text-4xl font-bold text-primary">{lsHydraulic.toFixed(3)}"</p>
                    <p className="text-xs text-gray-500 mt-0.5">Assumes stock LS lifter with 0.030–0.070" preload range</p>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-gray-400 text-sm">Solid Roller Conversion (zero preload)</p>
                    <p className="text-3xl font-bold">{lsSolid.toFixed(3)}"</p>
                    <p className="text-xs text-gray-500 mt-0.5">Subtracts 0.050" approximate half-travel adjustment</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Common LS Pushrod Lengths</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {lsDisplayLengths.map(len => (
                      <div
                        key={len}
                        className={`flex justify-between items-center py-2 px-2 rounded text-sm ${
                          len === lsClosest
                            ? "bg-primary/10 font-bold text-primary"
                            : "border-b border-gray-100"
                        }`}
                      >
                        <span>{len.toFixed(3)}"</span>
                        {len === lsClosest && <span className="text-xs font-semibold">closest to calculated</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-gray-50 border rounded-lg p-4 space-y-1 text-sm">
                <p><strong>LS Preload Note:</strong> LS hydraulic lifters are designed for 0.030–0.070" preload with stock geometry. Most builders target 0.050" preload (half-travel of lifter internal plunger).</p>
                <p className="text-muted-foreground text-xs">Milling heads shortens the valvetrain stack, so a shorter pushrod is needed. Example: LS1 heads milled 0.010" → use a 7.390" pushrod. Heads milled 0.030" → use a 7.370" pushrod.</p>
                <p className="text-muted-foreground text-xs mt-1"><strong>Common gotcha:</strong> Many builders mill heads AND switch to a thicker aftermarket gasket AND install a cam with a smaller base circle at the same time. These changes work against each other — the thicker gasket and smaller base circle both push pushrod length longer, while milling pushes it shorter. Always calculate all changes together.</p>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4 text-sm">
                <p><strong>Lifter Brand Variation:</strong> Stock LS, Morel, Johnson, and Crane hydraulic lifters each have slightly different installed heights — up to 0.020" variation. Always verify with a checker pushrod when changing lifter brands.</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  EDUCATIONAL NOTE                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Pushrod Length</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Pushrod length determines where the rocker arm tip contacts the valve stem throughout the lift cycle. The correct length positions the roller tip (or stamped tip on OEM rockers) centered on the valve stem at approximately half-lift, maintaining proper rocker geometry. On engines with adjustable rockers, pushrod length also sets hydraulic lifter preload — the amount the lifter's internal plunger is compressed from its free position. On solid lifter setups, the correct pushrod length establishes zero lash at base circle.
          </p>
          <p>
            Running the wrong pushrod length causes the rocker tip to sweep too far to one side of the valve stem. This creates a side load on the valve that accelerates guide wear, increases stem friction, and can lead to premature valve seal failure. On the rocker side, incorrect geometry increases stress on rocker studs and can cause studs to pull out of aluminum heads under high-RPM use. On race engines with aggressive cam profiles, a pushrod that's significantly too long or too short can bind the rocker, causing bent pushrods or broken rocker arms. None of these failures are immediately catastrophic, but all of them shorten engine life.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Two Schools of Thought</h3>
          <p>
            Some builders set pushrod length by marking the valve tip with a Sharpie and reading the witness pattern left by the rocker tip (the checker pushrod method). Others measure the rocker tip position relative to the valve stem at exactly half-lift, aiming for the roller tip to be at 90 degrees to the stem centerline. In practice, both methods produce nearly identical pushrod lengths — typically within 0.010" of each other on most rocker geometries. The witness pattern method is more accessible in a home shop because it doesn't require a degree wheel or dial indicator setup.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">LS-Specific Considerations</h3>
          <p>
            LS engines use non-adjustable net-lash rockers, which means the pushrod is the only component that controls lifter preload. There is no adjusting nut to turn. If anything in the valvetrain stack changes — head milling, block milling, gasket thickness, cam base circle, or lifter brand — the pushrod length must change to compensate. "Just use stock pushrods" doesn't work if anything in the stack has changed. Even a 0.010" head cut requires a different pushrod to maintain the factory 0.030–0.070" preload window. Custom-length pushrods are inexpensive and readily available in 0.025" increments from most performance parts suppliers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
