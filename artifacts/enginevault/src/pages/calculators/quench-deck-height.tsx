import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type InputMode = "measured" | "calculated";
type RodMaterial = "steel" | "aluminum" | "titanium";

// ── Zone classifiers ──────────────────────────────────────────────────────────

const ROD_QUENCH_RANGES: Record<RodMaterial, { min: number; max: number; label: string }> = {
  steel:    { min: 0.035, max: 0.045, label: "Steel rods — 0.035\"-0.045\" ideal" },
  aluminum: { min: 0.050, max: 0.060, label: "Aluminum rods — 0.050\"-0.060\" (thermal expansion)" },
  titanium: { min: 0.035, max: 0.045, label: "Titanium rods — 0.035\"-0.045\" ideal" },
};

function getQuenchZone(q: number, rod: RodMaterial): { label: string; color: string; bg: string } {
  const range = ROD_QUENCH_RANGES[rod];
  if (q < 0.025) return { label: "TOO TIGHT — Piston-to-head risk", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  if (q < range.min - 0.010) return { label: "Very tight — pro build only", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (q >= range.min && q <= range.max) return { label: "IDEAL", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (q < range.min) return { label: "Tight — verify with dial indicator", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (q <= range.max + 0.010) return { label: "Acceptable", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (q <= 0.065) return { label: "Loose — reduced benefit", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "LOST — No quench effect", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

function getPtdLabel(ptd: number): { text: string; color: string } {
  if (ptd > 0.0005) return { text: "In the hole (piston below deck)", color: "text-gray-400" };
  if (ptd < -0.0005) return { text: "Above deck (piston protrudes)", color: "text-yellow-400" };
  return { text: "Zero deck", color: "text-gray-400" };
}

// ── Common gasket thicknesses ─────────────────────────────────────────────────

const STOCKED_GASKETS = [0.015, 0.020, 0.028, 0.039, 0.041, 0.045, 0.051, 0.065];

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold text-left hover:bg-[#222] transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Core math ─────────────────────────────────────────────────────────────────

const CU_IN_TO_CC = 16.387064;

function calcFromPtd(
  bore: number, stroke: number, ptd: number,
  chamberCC: number, pistonCC: number, gasketDia: number, gasketThick: number,
) {
  const quench = ptd + gasketThick;
  const gasketCC = Math.PI * (gasketDia / 2) ** 2 * gasketThick * CU_IN_TO_CC;
  const deckCC = Math.PI * (bore / 2) ** 2 * ptd * CU_IN_TO_CC;
  const totalChamberCC = chamberCC + gasketCC + deckCC + pistonCC;
  const dispPerCylCC = Math.PI * (bore / 2) ** 2 * stroke * CU_IN_TO_CC;
  const cr = totalChamberCC > 0 ? (dispPerCylCC + totalChamberCC) / totalChamberCC : 0;

  return { ptd, quench, gasketCC, deckCC, totalChamberCC, dispPerCylCC, cr };
}

function calcPtdFromDims(stroke: number, rod: number, ch: number, deckHt: number) {
  return deckHt - (stroke / 2 + rod + ch);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function QuenchDeckHeightCalculator() {
  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>("measured");

  // Measured mode: direct PTD entries (up to 8 cylinders)
  const [ptdValues, setPtdValues] = useState(["0.025"]);
  const [activeCylCount, setActiveCylCount] = useState("1");

  // Calculated mode: engine dimensions
  const [bore, setBore] = useState("4.030");
  const [stroke, setStroke] = useState("3.480");
  const [rod, setRod] = useState("5.700");
  const [ch, setCh] = useState("1.560");
  const [deckHt, setDeckHt] = useState("9.025");

  // Shared inputs
  const [chamberVol, setChamberVol] = useState("64");
  const [pistonVol, setPistonVol] = useState("-5");
  const [gasketDia, setGasketDia] = useState("4.100");
  const [gasketThick, setGasketThick] = useState("0.041");
  const [rodMaterial, setRodMaterial] = useState<RodMaterial>("steel");

  // Recommendation slider
  const [targetQuench, setTargetQuench] = useState("0.040");

  // Parse shared
  const b = parseFloat(bore) || 0;
  const s = parseFloat(stroke) || 0;
  const r = parseFloat(rod) || 0;
  const c = parseFloat(ch) || 0;
  const dh = parseFloat(deckHt) || 0;
  const cv = parseFloat(chamberVol) || 0;
  const pv = parseFloat(pistonVol) || 0;
  const gd = parseFloat(gasketDia) || 0;
  const gt = parseFloat(gasketThick) || 0;
  const tq = parseFloat(targetQuench) || 0.040;
  const cylCount = Math.min(8, Math.max(1, parseInt(activeCylCount) || 1));

  // Resolve PTD based on mode
  let effectivePtd: number;
  let perCylPtds: number[] = [];

  if (inputMode === "measured") {
    perCylPtds = Array.from({ length: cylCount }, (_, i) =>
      parseFloat(ptdValues[i] ?? ptdValues[0] ?? "0") || 0
    );
    // Use the TIGHTEST cylinder (smallest PTD = closest to head)
    effectivePtd = Math.min(...perCylPtds);
  } else {
    effectivePtd = calcPtdFromDims(s, r, c, dh);
  }

  const C = calcFromPtd(b, s, effectivePtd, cv, pv, gd, gt);
  const quenchZone = getQuenchZone(C.quench, rodMaterial);
  const ptdLabel = getPtdLabel(C.ptd);

  // Stroke/rod ratio for warnings
  const strokeRodRatio = r > 0 ? s / r : 0;

  // Thick gasket trap warning
  const thickGasketTrap = C.quench > 0.055 && C.cr < 9.5;

  // Update a single cylinder's PTD value
  const setCylPtd = (idx: number, val: string) => {
    setPtdValues(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  // ── Gasket comparison table (ALL stocked gaskets) ──
  const gasketTable = STOCKED_GASKETS.map(thick => {
    const result = calcFromPtd(b, s, effectivePtd, cv, pv, gd, thick);
    const zone = getQuenchZone(result.quench, rodMaterial);
    return { thick, quench: result.quench, cr: result.cr, zone };
  });

  // ── Gasket recommendation ──
  const idealGasketThick = tq - effectivePtd;
  const idealResult = calcFromPtd(b, s, effectivePtd, cv, pv, gd, idealGasketThick);

  // ── Milling preview ──
  const millHead010 = calcFromPtd(b, s, effectivePtd, cv - 1.5, pv, gd, gt);
  const millBlock010 = calcFromPtd(b, s, effectivePtd - 0.010, cv, pv, gd, gt);
  const thinnerGasket = calcFromPtd(b, s, effectivePtd, cv, pv, gd, 0.028);

  // Per-cylinder spread (measured mode)
  const ptdSpread = perCylPtds.length > 1 ? Math.max(...perCylPtds) - Math.min(...perCylPtds) : 0;
  const tightestCyl = perCylPtds.length > 1 ? perCylPtds.indexOf(Math.min(...perCylPtds)) + 1 : 1;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Quench & Deck Height Calculator"
        description="Calculate piston-to-deck clearance, quench distance, and compression ratio simultaneously. Compare gasket thicknesses side by side. Free engine builder tool."
        canonical="/calculators/quench-deck-height"
        keywords="quench calculator, deck height calculator, piston to deck clearance, squish calculator, quench distance, compression ratio calculator, engine quench"
      />
      <h1 className="text-3xl font-bold mb-2">Quench &amp; Deck Height Calculator</h1>
      <p className="text-muted-foreground mb-8">Pick the right gasket: see quench and compression ratio update together as you change thickness.</p>

      {/* ── Warnings ── */}
      {C.quench < 0.025 && (
        <div className="mb-4 p-4 rounded-lg border bg-red-50 border-red-300">
          <p className="font-bold text-red-700">Piston-to-head contact risk</p>
          <p className="text-sm text-red-600 mt-1">Stroker engines especially should not go below 0.030" to allow for piston rock at TDC. Current quench: {C.quench.toFixed(3)}"</p>
        </div>
      )}

      {C.ptd < -0.0005 && gt < 0.050 && (
        <div className="mb-4 p-4 rounded-lg border bg-yellow-50 border-yellow-200">
          <p className="font-bold text-yellow-700">Piston protrudes above deck</p>
          <p className="text-sm text-yellow-600 mt-1">Verify clearance against gasket fire ring and head face. PTD: {C.ptd.toFixed(4)}", gasket: {gt.toFixed(3)}"</p>
        </div>
      )}

      {strokeRodRatio > 0.6 && inputMode === "calculated" && (
        <div className="mb-4 p-4 rounded-lg border bg-blue-50 border-blue-200">
          <p className="font-bold text-blue-700">Stroker build detected</p>
          <p className="text-sm text-blue-600 mt-1">Piston rock at TDC may be significant (stroke/rod = {strokeRodRatio.toFixed(3)}). Add 0.008"-0.015" safety margin to calculated quench. Measure actual rock with a dial indicator during assembly.</p>
        </div>
      )}

      {thickGasketTrap && (
        <div className="mb-4 p-4 rounded-lg border bg-orange-50 border-orange-200">
          <p className="font-bold text-orange-700">Thick gasket trap</p>
          <p className="text-sm text-orange-600 mt-1">Your quench is loose ({C.quench.toFixed(3)}") and CR is modest ({C.cr.toFixed(1)}:1). A thicker gasket lowers compression but also kills quench — an engine with 9.5:1 and tight quench (0.040") will resist detonation better than this combo. Consider a thinner gasket with smaller chambers instead.</p>
        </div>
      )}

      {C.cr > 11.0 && (
        <div className="mb-4 p-4 rounded-lg border bg-yellow-50 border-yellow-200">
          <p className="font-bold text-yellow-700">High compression ratio ({C.cr.toFixed(2)}:1)</p>
          <p className="text-sm text-yellow-600 mt-1">Verify aluminum heads, good chamber design, and high-octane fuel before running.</p>
        </div>
      )}

      {/* ── Input Mode Selector ── */}
      <div className="flex rounded-lg border overflow-hidden mb-6">
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            inputMode === "measured"
              ? "bg-[#1a1a1a] text-white"
              : "bg-white text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setInputMode("measured")}
        >
          <span className="block font-semibold">I measured my deck height</span>
          <span className="block text-xs mt-0.5 opacity-75">Enter dial indicator readings</span>
        </button>
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            inputMode === "calculated"
              ? "bg-[#1a1a1a] text-white"
              : "bg-white text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setInputMode("calculated")}
        >
          <span className="block font-semibold">Calculate from dimensions</span>
          <span className="block text-xs mt-0.5 opacity-75">Use catalog specs</span>
        </button>
      </div>

      {/* ── Inputs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left column: PTD source */}
        {inputMode === "measured" ? (
          <Card>
            <CardHeader>
              <CardTitle>Measured Piston-to-Deck</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Enter dial indicator reading for each cylinder. Uses the tightest (smallest) value.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Field label="Cylinders measured">
                  <Select value={activeCylCount} onValueChange={v => setActiveCylCount(v)}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 4, 6, 8].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {cylCount === 1 ? (
                <Field label="Piston-to-deck (inches)" hint="Positive = in the hole, negative = above deck">
                  <Input
                    type="number"
                    step="0.001"
                    value={ptdValues[0] ?? "0.025"}
                    onChange={e => setCylPtd(0, e.target.value)}
                  />
                </Field>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: cylCount }, (_, i) => (
                      <div key={i} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Cyl #{i + 1}</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={ptdValues[i] ?? ptdValues[0] ?? "0.025"}
                          onChange={e => setCylPtd(i, e.target.value)}
                          className={perCylPtds[i] === Math.min(...perCylPtds) && cylCount > 1 ? "ring-2 ring-[#E85D04]/40" : ""}
                        />
                      </div>
                    ))}
                  </div>
                  {cylCount > 1 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                      <p>Tightest: <strong className="text-foreground">Cyl #{tightestCyl} at {Math.min(...perCylPtds).toFixed(4)}"</strong> (used for calculation)</p>
                      <p>Spread: {ptdSpread.toFixed(4)}" across {cylCount} cylinders{ptdSpread > 0.010 && <span className="text-yellow-600 font-semibold"> — significant variation, check for machining issues</span>}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-3 space-y-3">
                <Field label="Bore (inches)" hint="For volume calculations">
                  <Input type="number" step="0.001" value={bore} onChange={e => setBore(e.target.value)} />
                </Field>
                <Field label="Stroke (inches)" hint="For displacement calculation">
                  <Input type="number" step="0.001" value={stroke} onChange={e => setStroke(e.target.value)} />
                </Field>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Engine Dimensions</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Calculated PTD can differ 0.005"-0.015" from measured. Always verify with a dial indicator.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Bore (inches)">
                <Input type="number" step="0.001" value={bore} onChange={e => setBore(e.target.value)} />
              </Field>
              <Field label="Stroke (inches)">
                <Input type="number" step="0.001" value={stroke} onChange={e => setStroke(e.target.value)} />
              </Field>
              <Field label="Connecting Rod Length (inches)" hint="Center-to-center">
                <Input type="number" step="0.001" value={rod} onChange={e => setRod(e.target.value)} />
              </Field>
              <Field label="Piston Compression Height (inches)" hint="Wrist pin center to piston crown">
                <Input type="number" step="0.001" value={ch} onChange={e => setCh(e.target.value)} />
              </Field>
              <Field label="Block Deck Height (inches)" hint="Crank centerline to deck surface">
                <Input type="number" step="0.001" value={deckHt} onChange={e => setDeckHt(e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        )}

        {/* Right column: Volumes, gasket, rod material */}
        <Card>
          <CardHeader><CardTitle>Volumes &amp; Gasket</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Head Chamber Volume (cc)">
              <Input type="number" step="0.1" value={chamberVol} onChange={e => setChamberVol(e.target.value)} />
            </Field>
            <Field label="Piston Volume (cc — positive = dish, negative = dome/reliefs)" hint="Flat-tops with valve reliefs are usually -2 to -8 cc">
              <Input type="number" step="0.1" value={pistonVol} onChange={e => setPistonVol(e.target.value)} />
            </Field>
            <Field label="Gasket Fire-Ring Diameter (inches)">
              <Input type="number" step="0.001" value={gasketDia} onChange={e => setGasketDia(e.target.value)} />
            </Field>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Gasket Compressed Thickness (inches)</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {STOCKED_GASKETS.map(thick => {
                  const isActive = Math.abs(gt - thick) < 0.0005;
                  return (
                    <button
                      key={thick}
                      onClick={() => setGasketThick(thick.toFixed(3))}
                      className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-[#E85D04] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {thick.toFixed(3)}"
                    </button>
                  );
                })}
              </div>
              <Input type="number" step="0.001" value={gasketThick} onChange={e => setGasketThick(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-0.5">Use compressed thickness, not catalog thickness</p>
            </div>
            <Field label="Connecting Rod Material" hint={ROD_QUENCH_RANGES[rodMaterial].label}>
              <Select value={rodMaterial} onValueChange={v => setRodMaterial(v as RodMaterial)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="steel">Steel Rods</SelectItem>
                  <SelectItem value="aluminum">Aluminum Rods</SelectItem>
                  <SelectItem value="titanium">Titanium Rods</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* ── Output panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Panel 1: Clearances */}
        <Card className="bg-[#1a1a1a] text-white">
          <CardHeader><CardTitle>Clearances</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Piston-to-Deck{inputMode === "measured" && cylCount > 1 ? ` (Cyl #${tightestCyl} — tightest)` : ""}</p>
              <p className="text-5xl font-bold text-white">{C.ptd.toFixed(4)}"</p>
              <p className={`text-sm mt-1 ${ptdLabel.color}`}>{ptdLabel.text}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Quench (at gasket fire ring)</p>
              <p className="text-5xl font-bold text-primary">{C.quench.toFixed(4)}"</p>
              <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${quenchZone.bg} ${quenchZone.color}`}>
                {quenchZone.label}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel 2: Compression ratio */}
        <Card className="bg-[#1a1a1a] text-white">
          <CardHeader><CardTitle>Compression Ratio</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center mb-5">
              <p className="text-gray-400 text-sm">Static CR</p>
              <p className="text-5xl font-bold text-primary">{C.cr.toFixed(2)}:1</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span className="text-gray-400">Head chamber</span>
                <span className="font-mono">{cv.toFixed(2)} cc</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span className="text-gray-400">Compressed gasket</span>
                <span className="font-mono">{C.gasketCC.toFixed(2)} cc</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span className="text-gray-400">Deck volume</span>
                <span className="font-mono">{C.deckCC >= 0 ? "+" : ""}{C.deckCC.toFixed(2)} cc</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span className="text-gray-400">Piston volume</span>
                <span className="font-mono">{pv >= 0 ? "+" : ""}{pv.toFixed(2)} cc</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1.5 pt-1">
                <span className="text-gray-400 font-semibold">Total clearance volume</span>
                <span className="font-mono font-semibold">{C.totalChamberCC.toFixed(2)} cc</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-400">Displacement per cylinder</span>
                <span className="font-mono">{C.dispPerCylCC.toFixed(2)} cc</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Gasket comparison table ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Gasket Comparison — All Common Thicknesses</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Click any row to select that gasket. Color shows quench quality for {rodMaterial} rods.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left p-3">Compressed Thickness</th>
                  <th className="text-right p-3">Quench</th>
                  <th className="text-left p-3 pl-4">Rating</th>
                  <th className="text-right p-3">Static CR</th>
                </tr>
              </thead>
              <tbody>
                {gasketTable.map((row, i) => {
                  const isActive = Math.abs(gt - row.thick) < 0.0005;
                  return (
                    <tr
                      key={i}
                      onClick={() => setGasketThick(row.thick.toFixed(3))}
                      className={`border-b cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#E85D04]/10 ring-1 ring-inset ring-[#E85D04]/30"
                          : i % 2 === 0 ? "hover:bg-muted/50" : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <td className="p-3 font-semibold">{row.thick.toFixed(3)}"{isActive && <span className="text-[#E85D04] ml-2 text-xs">selected</span>}</td>
                      <td className="text-right p-3 font-mono">{row.quench.toFixed(3)}"</td>
                      <td className={`p-3 pl-4 text-xs font-semibold ${row.zone.color}`}>{row.zone.label}</td>
                      <td className="text-right p-3 font-bold">{row.cr.toFixed(2)}:1</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Gasket Recommendation ── */}
      <Section title="Recommend a Gasket for Me">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Target Quench: {parseFloat(targetQuench).toFixed(3)}"</Label>
            <input
              type="range"
              min={0.030}
              max={0.060}
              step={0.001}
              value={targetQuench}
              onChange={e => setTargetQuench(e.target.value)}
              className="w-full accent-[#E85D04]"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.030" (tight)</span>
              <span>0.045" (ideal)</span>
              <span>0.060" (loose)</span>
            </div>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4">
            <p className="text-sm">
              To achieve <strong>{tq.toFixed(3)}"</strong> quench on this engine, use a{" "}
              <strong>{idealGasketThick.toFixed(3)}"</strong> compressed gasket.
              {" "}Resulting CR: <strong>{idealResult.cr.toFixed(2)}:1</strong>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Closest stocked gaskets</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(() => {
                const sorted = [...gasketTable]
                  .map(g => ({ ...g, diff: Math.abs(g.quench - tq) }))
                  .sort((a, b) => a.diff - b.diff)
                  .slice(0, 3)
                  .sort((a, b) => a.thick - b.thick);
                const closestThick = sorted.reduce((best, g) => g.diff < best.diff ? g : best, sorted[0]).thick;

                return sorted.map(g => {
                  const isClosest = g.thick === closestThick;
                  return (
                    <button
                      key={g.thick}
                      onClick={() => setGasketThick(g.thick.toFixed(3))}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        isClosest
                          ? "border-[#E85D04] bg-orange-50 ring-2 ring-[#E85D04]/20"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="text-lg font-bold">{g.thick.toFixed(3)}" gasket</div>
                      <div className="text-sm text-muted-foreground mt-1">Quench: {g.quench.toFixed(3)}"</div>
                      <div className={`text-xs font-semibold mt-0.5 ${g.zone.color}`}>{g.zone.label}</div>
                      <div className="text-sm text-muted-foreground">CR: {g.cr.toFixed(2)}:1</div>
                      {isClosest && <div className="text-xs font-semibold text-[#E85D04] mt-1">Closest to target</div>}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Milling Preview ── */}
      <div className="mt-5">
        <Section title="Want Higher Compression?">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Three common ways to raise compression. Each scenario shows before/after CR and quench effect.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mill heads */}
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-semibold text-sm">Mill heads 0.010"</p>
                <p className="text-xs text-muted-foreground">Removes ~1.5 cc from chamber</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chamber</span>
                    <span>{cv.toFixed(1)} &rarr; {(cv - 1.5).toFixed(1)} cc</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quench</span>
                    <span>{C.quench.toFixed(3)}" &rarr; {millHead010.quench.toFixed(3)}" <span className="text-green-600">(same)</span></span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>CR</span>
                    <span>{C.cr.toFixed(2)} &rarr; <span className="text-[#E85D04]">{millHead010.cr.toFixed(2)}:1</span></span>
                  </div>
                </div>
              </div>

              {/* Mill block */}
              {(() => {
                const blockQuenchZone = getQuenchZone(millBlock010.quench, rodMaterial);
                const quenchWarning = millBlock010.quench < 0.025;
                return (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold text-sm">Mill block 0.010"</p>
                    <p className="text-xs text-muted-foreground">Reduces deck height, tightens quench</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deck</span>
                        <span>{effectivePtd.toFixed(3)}" &rarr; {(effectivePtd - 0.010).toFixed(3)}" PTD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quench</span>
                        <span>
                          {C.quench.toFixed(3)}" &rarr; {millBlock010.quench.toFixed(3)}"{" "}
                          {quenchWarning
                            ? <span className="text-red-600">(too tight!)</span>
                            : <span className="text-green-600">(tighter)</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>CR</span>
                        <span>{C.cr.toFixed(2)} &rarr; <span className="text-[#E85D04]">{millBlock010.cr.toFixed(2)}:1</span></span>
                      </div>
                    </div>
                    {quenchWarning && (
                      <p className={`text-xs font-semibold ${blockQuenchZone.color}`}>Quench enters danger zone</p>
                    )}
                  </div>
                );
              })()}

              {/* Thinner gasket */}
              {(() => {
                const thinQuenchZone = getQuenchZone(thinnerGasket.quench, rodMaterial);
                const quenchWarning = thinnerGasket.quench < 0.025;
                return (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold text-sm">Thinner gasket (0.028")</p>
                    <p className="text-xs text-muted-foreground">Reduces clearance volume, tightens quench</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gasket</span>
                        <span>{gt.toFixed(3)}" &rarr; 0.028"</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quench</span>
                        <span>
                          {C.quench.toFixed(3)}" &rarr; {thinnerGasket.quench.toFixed(3)}"{" "}
                          {quenchWarning
                            ? <span className="text-red-600">(too tight!)</span>
                            : <span className="text-green-600">(tighter)</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>CR</span>
                        <span>{C.cr.toFixed(2)} &rarr; <span className="text-[#E85D04]">{thinnerGasket.cr.toFixed(2)}:1</span></span>
                      </div>
                    </div>
                    {quenchWarning && (
                      <p className={`text-xs font-semibold ${thinQuenchZone.color}`}>Quench enters danger zone</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </Section>
      </div>

      {/* ── Educational note ── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Quench Explained: What Every Engine Builder Should Know</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Quench — also called squish — is the clearance between the flat portion of the piston crown and the flat portion of the cylinder head at top dead center. When the piston reaches TDC, the narrow gap between these two flat surfaces creates a high-velocity jet that pushes the air-fuel mixture toward the spark plug and across the combustion chamber. This turbulence homogenizes the charge, promotes complete combustion, and dramatically reduces the tendency to detonate. Tighter quench is one of the simplest and most effective ways to make an engine more detonation-resistant without changing compression ratio.
          </p>
          <p>
            The ideal quench range for most street builds with steel connecting rods is 0.035" to 0.045". Aluminum rods expand more with heat and require 0.050" to 0.060" minimum clearance. Below 0.025" is dangerous regardless of rod material — the piston can physically contact the head, especially in stroker engines where the connecting rod angle creates lateral piston rock at TDC. Above 0.060", the quench effect is essentially gone because the gap is too large to generate useful turbulence. Most factory engines run 0.060" to 0.080" quench because it is cheaper to hold loose tolerances across a production line.
          </p>
          <p>
            Builders who tighten quench from a factory-typical 0.070" down to 0.040" typically reclaim 0.5 to 1.0 point of effective detonation resistance — meaning the engine can tolerate roughly that much more static compression ratio on the same fuel without knock. This is free power. The key is measuring actual piston-to-deck clearance with a dial indicator at assembly time, not relying on catalog numbers. Measure every cylinder — piston heights routinely vary 0.008" to 0.025" across a set, and the tightest cylinder is the one that matters. Gasket compressed thickness, not catalog (unloaded) thickness, determines the final quench dimension. This calculator uses compressed thickness for exactly that reason.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
