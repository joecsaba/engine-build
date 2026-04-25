import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ── Application safety margins ───────────────────────────────── */

type AppType = "street" | "performance" | "race" | "extreme";

const appMargins: Record<AppType, { label: string; margin: number }> = {
  street:      { label: "Street",           margin: 0.060 },
  performance: { label: "Performance",      margin: 0.070 },
  race:        { label: "Race",             margin: 0.080 },
  extreme:     { label: "Extreme / Drag",   margin: 0.100 },
};

/* ── Common rocker ratios ─────────────────────────────────────── */

const rockerPresets = [
  { value: "1.500", label: "1.5:1 (stock SBF, some BBC exhaust)" },
  { value: "1.600", label: "1.6:1 (stock SBC, common aftermarket)" },
  { value: "1.650", label: "1.65:1 (common LS, performance SBC)" },
  { value: "1.700", label: "1.7:1 (performance SBC/LS, stock BBC intake)" },
  { value: "1.750", label: "1.75:1 (Pro SBC/LS)" },
  { value: "1.800", label: "1.8:1 (high-ratio SBC/LS, Hemi)" },
  { value: "custom", label: "Custom ratio..." },
];

/* ── Cam type pressure ranges ─────────────────────────────────── */

type CamType = "hyd-flat" | "hyd-roller-street" | "hyd-roller-perf" | "solid-flat" | "solid-roller-street" | "solid-roller-race" | "solid-roller-extreme";

const camTypes: Record<CamType, { label: string; seatMin: number; seatMax: number; openMin: number; openMax: number }> = {
  "hyd-flat":              { label: "Hydraulic flat tappet",             seatMin: 85,  seatMax: 115, openMin: 240, openMax: 280  },
  "hyd-roller-street":     { label: "Hydraulic roller (street)",        seatMin: 120, seatMax: 145, openMin: 300, openMax: 350  },
  "hyd-roller-perf":       { label: "Hydraulic roller (performance)",   seatMin: 140, seatMax: 170, openMin: 350, openMax: 400  },
  "solid-flat":            { label: "Solid flat tappet",                seatMin: 130, seatMax: 160, openMin: 330, openMax: 380  },
  "solid-roller-street":   { label: "Solid roller (street, 6500 RPM max)", seatMin: 180, seatMax: 230, openMin: 480, openMax: 560  },
  "solid-roller-race":     { label: "Solid roller (race, 6500-8000 RPM)",  seatMin: 230, seatMax: 300, openMin: 600, openMax: 750  },
  "solid-roller-extreme":  { label: "Solid roller (extreme, 8000+ RPM)",   seatMin: 300, seatMax: 400, openMin: 750, openMax: 1000 },
};

/* ── Stock shim sizes ─────────────────────────────────────────── */

const SHIM_SIZES = [0.090, 0.060, 0.030, 0.015];

function getShimCombo(target: number): { shims: number[]; total: number } {
  const shims: number[] = [];
  let remaining = target;

  for (const size of SHIM_SIZES) {
    while (remaining >= size - 0.001) {
      shims.push(size);
      remaining -= size;
      remaining = Math.round(remaining * 1000) / 1000;
    }
  }

  const total = shims.reduce((a, b) => a + b, 0);
  return { shims, total };
}

function formatShimCombo(shims: number[]): string {
  if (shims.length === 0) return "No shim needed";
  const counts: Record<string, number> = {};
  for (const s of shims) {
    const key = s.toFixed(3);
    counts[key] = (counts[key] || 0) + 1;
  }
  const parts = Object.entries(counts).map(([size, count]) => `${count}\u00d7 ${size}"`);
  return parts.join(" + ");
}

/* ── Zone helpers ──────────────────────────────────────────────── */

function getBindZone(clearance: number, margin: number): { label: string; color: string; bg: string; message: string } {
  if (clearance < 0) {
    return {
      label: "INTERFERENCE",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Physical impossibility \u2014 coils would overlap. The valve cannot open this far with this spring.",
    };
  }
  if (clearance < margin - 0.010) {
    return {
      label: "WILL COIL BIND",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Spring will coil-bind or be dangerously close at max lift. Options: shorter installed height, taller coil-bind spring, less lift, or different spring.",
    };
  }
  if (clearance < margin) {
    return {
      label: "MARGINAL",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      message: "Clearance is within 0.010\" of the minimum safety margin. Verify measurements carefully and consider a spring with more travel.",
    };
  }
  return {
    label: "SAFE",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    message: "Adequate clearance to coil bind for this application.",
  };
}

function getRetainerZone(clearance: number): { label: string; color: string; bg: string; message: string } {
  if (clearance < 0) {
    return {
      label: "INTERFERENCE",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Retainer will contact the seal or guide at max lift. The valve cannot open this far without destroying the seal.",
    };
  }
  if (clearance < 0.050) {
    return {
      label: "TOO CLOSE",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: "Below the 0.050\" minimum. Retainer will damage or destroy the valve seal at RPM. Options: shorter valve, taller seal, machined spring seat, shorter-body retainer, or less lift.",
    };
  }
  if (clearance < 0.060) {
    return {
      label: "MARGINAL",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      message: "Between 0.050\" and 0.060\". Will likely survive on a street engine but has no margin for valvetrain deflection or thermal growth. Most manufacturers recommend 0.060\" minimum.",
    };
  }
  return {
    label: "SAFE",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    message: "Adequate clearance between retainer and seal.",
  };
}

function getPressureZone(value: number, min: number, max: number): { label: string; color: string; bg: string } {
  if (value >= min && value <= max) {
    return { label: "Within range", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  }
  const lowThreshold = min * 0.90;
  const highThreshold = max * 1.10;
  if (value >= lowThreshold && value < min) {
    return { label: "Slightly below range", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  }
  if (value > max && value <= highThreshold) {
    return { label: "Slightly above range", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  }
  if (value < lowThreshold) {
    return { label: "Under-sprung", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  }
  return { label: "Over-sprung", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

/* ── Lift converter sub-component ─────────────────────────────── */

function LiftConverter({ id, onLiftCalculated }: { id: string; onLiftCalculated: (lift: string) => void }) {
  const [open, setOpen] = useState(false);
  const [lobeLift, setLobeLift] = useState("");
  const [rockerPreset, setRockerPreset] = useState("1.600");
  const [customRatio, setCustomRatio] = useState("1.600");
  const [lifterType, setLifterType] = useState<"hydraulic" | "solid">("hydraulic");
  const [lash, setLash] = useState("0.020");

  const ratio = rockerPreset === "custom" ? (parseFloat(customRatio) || 0) : (parseFloat(rockerPreset) || 0);
  const ll = parseFloat(lobeLift) || 0;
  const grossLift = ll * ratio;
  const lashVal = lifterType === "solid" ? (parseFloat(lash) || 0) : 0;
  const netLift = grossLift - lashVal;

  function applyLift() {
    if (netLift > 0) {
      onLiftCalculated(netLift.toFixed(3));
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-primary hover:underline font-medium"
        onClick={() => setOpen(true)}
      >
        Have cam lobe lift instead? Calculate valve lift &darr;
      </button>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Cam Lift &rarr; Valve Lift</p>
        <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(false)}>Hide</button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Cam Lobe Lift (inches)</Label>
        <Input id={`lobe-${id}`} type="number" step="0.001" placeholder="e.g. 0.300" value={lobeLift} onChange={e => setLobeLift(e.target.value)} />
        <Hint>From your cam card — listed as "lobe lift" or "cam lift"</Hint>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Rocker Ratio</Label>
        <Select value={rockerPreset} onValueChange={setRockerPreset}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {rockerPresets.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rockerPreset === "custom" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Custom Ratio</Label>
          <Input type="number" step="0.01" value={customRatio} onChange={e => setCustomRatio(e.target.value)} />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Lifter Type</Label>
        <Select value={lifterType} onValueChange={v => setLifterType(v as "hydraulic" | "solid")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hydraulic">Hydraulic (no lash subtracted)</SelectItem>
            <SelectItem value="solid">Solid (subtract valve lash)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lifterType === "solid" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Valve Lash (inches)</Label>
          <Input type="number" step="0.001" value={lash} onChange={e => setLash(e.target.value)} />
          <Hint>Hot lash from your cam card. Typical: 0.012\u20130.024" intake, 0.016\u20130.028" exhaust</Hint>
        </div>
      )}

      {ll > 0 && ratio > 0 && (
        <div className="bg-white border rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gross valve lift</span>
            <span className="font-bold">{grossLift.toFixed(3)}"</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{ll.toFixed(3)} x {ratio.toFixed(3)} = {grossLift.toFixed(3)}</p>
          {lifterType === "solid" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net valve lift (minus lash)</span>
                <span className="font-bold">{netLift.toFixed(3)}"</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{grossLift.toFixed(3)} - {lashVal.toFixed(3)} = {netLift.toFixed(3)}</p>
            </>
          )}
          <button
            type="button"
            onClick={applyLift}
            className="w-full mt-2 px-3 py-1.5 rounded-md bg-[#E85D04] hover:bg-[#d04f00] text-white text-sm font-semibold transition-colors"
          >
            Use {netLift.toFixed(3)}" as valve lift
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Spring rate derivation sub-component ─────────────────────── */

function RateCalculator({ onRateCalculated }: { onRateCalculated: (rate: string) => void }) {
  const [open, setOpen] = useState(false);
  const [seatP, setSeatP] = useState("");
  const [openP, setOpenP] = useState("");
  const [lift, setLift] = useState("");

  const sp = parseFloat(seatP) || 0;
  const op = parseFloat(openP) || 0;
  const l = parseFloat(lift) || 0;
  const derivedRate = l > 0 ? (op - sp) / l : 0;

  function applyRate() {
    if (derivedRate > 0) {
      onRateCalculated(derivedRate.toFixed(0));
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-primary hover:underline font-medium"
        onClick={() => setOpen(true)}
      >
        Don't know your spring rate? Calculate from seat &amp; open pressure &darr;
      </button>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#E85D04] uppercase tracking-wider">Derive Spring Rate</p>
        <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(false)}>Hide</button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Seat Pressure (lb)</Label>
        <Input type="number" step="1" placeholder="e.g. 120" value={seatP} onChange={e => setSeatP(e.target.value)} />
        <Hint>Pressure at installed height (from spring spec card)</Hint>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Open Pressure (lb)</Label>
        <Input type="number" step="1" placeholder="e.g. 340" value={openP} onChange={e => setOpenP(e.target.value)} />
        <Hint>Pressure at max lift height (from spring spec card)</Hint>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Valve Lift Used for Open Pressure (inches)</Label>
        <Input type="number" step="0.001" placeholder="e.g. 0.600" value={lift} onChange={e => setLift(e.target.value)} />
        <Hint>The lift at which the manufacturer measured open pressure</Hint>
      </div>

      {sp > 0 && op > 0 && l > 0 && (
        <div className="bg-white border rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Derived spring rate</span>
            <span className="font-bold">{derivedRate.toFixed(0)} lb/in</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">({op.toFixed(0)} - {sp.toFixed(0)}) / {l.toFixed(3)} = {derivedRate.toFixed(1)}</p>
          <button
            type="button"
            onClick={applyRate}
            className="w-full mt-2 px-3 py-1.5 rounded-md bg-[#E85D04] hover:bg-[#d04f00] text-white text-sm font-semibold transition-colors"
          >
            Use {derivedRate.toFixed(0)} lb/in as spring rate
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────── */

export default function ValveSpringCalculator() {
  /* Tab 1: Coil Bind Check */
  const [installedHeight, setInstalledHeight] = useState("1.800");
  const [coilBindHeight, setCoilBindHeight] = useState("1.150");
  const [maxLift, setMaxLift] = useState("0.480");
  const [appType, setAppType] = useState<AppType>("street");

  /* Tab 2: Max Safe Lift */
  const [mslInstalled, setMslInstalled] = useState("1.800");
  const [mslBindHeight, setMslBindHeight] = useState("1.150");
  const [mslAppType, setMslAppType] = useState<AppType>("street");

  /* Tab 3: Shimming */
  const [measuredHeight, setMeasuredHeight] = useState("1.825");
  const [targetHeight, setTargetHeight] = useState("1.800");

  /* Tab 4: Pressure Check */
  const [springRate, setSpringRate] = useState("320");
  const [seatPressure, setSeatPressure] = useState("115");
  const [pressureLift, setPressureLift] = useState("0.480");
  const [camType, setCamType] = useState<CamType>("hyd-flat");
  const [pressureTableOpen, setPressureTableOpen] = useState(false);

  /* Tab 5: Retainer-to-Seal */
  const [retainerToSeal, setRetainerToSeal] = useState("");
  const [retainerLift, setRetainerLift] = useState("0.480");

  /* ── Tab 1 calculations ─────────────────────────────────────── */
  const ih = parseFloat(installedHeight) || 0;
  const cbh = parseFloat(coilBindHeight) || 0;
  const ml = parseFloat(maxLift) || 0;
  const margin = appMargins[appType].margin;

  const compressedHeight = ih - ml;
  const clearance = compressedHeight - cbh;
  const bindZone = getBindZone(clearance, margin);

  /* ── Tab 2 calculations ─────────────────────────────────────── */
  const mslIh = parseFloat(mslInstalled) || 0;
  const mslCbh = parseFloat(mslBindHeight) || 0;
  const mslMargin = appMargins[mslAppType].margin;
  const maxSafeLift = mslIh - mslCbh - mslMargin;

  /* ── Tab 3 calculations ─────────────────────────────────────── */
  const mh = parseFloat(measuredHeight) || 0;
  const th = parseFloat(targetHeight) || 0;
  const shimRequired = mh - th;
  const shimCombo = getShimCombo(Math.max(0, shimRequired));
  const actualAfterShim = shimRequired > 0 ? mh - shimCombo.total : mh;

  /* ── Tab 4 calculations ─────────────────────────────────────── */
  const rate = parseFloat(springRate) || 0;
  const seat = parseFloat(seatPressure) || 0;
  const pLift = parseFloat(pressureLift) || 0;
  const openPressure = seat + rate * pLift;
  const cam = camTypes[camType];
  const seatZone = getPressureZone(seat, cam.seatMin, cam.seatMax);
  const openZone = getPressureZone(openPressure, cam.openMin, cam.openMax);

  function getCombinedPressureZone(): { label: string; color: string; bg: string } {
    const zones = [seatZone, openZone];
    const hasRed = zones.some(z => z.color === "text-red-700");
    const hasYellow = zones.some(z => z.color === "text-yellow-700");
    if (hasRed) return { label: "Outside recommended range", color: "text-red-700", bg: "bg-red-50 border-red-200" };
    if (hasYellow) return { label: "Near edge of recommended range", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
    return { label: "Within recommended range", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  }

  const combinedZone = getCombinedPressureZone();

  /* ── Tab 5 calculations ─────────────────────────────────────── */
  const rts = parseFloat(retainerToSeal) || 0;
  const rl = parseFloat(retainerLift) || 0;
  const retainerClearance = rts - rl;
  const retainerZone = getRetainerZone(retainerClearance);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Valve Spring Calculator"
        description="Check coil bind clearance, calculate max safe valve lift, figure shim combinations, verify seat and open pressures, and check retainer-to-seal clearance. Free engine builder tool."
        canonical="/calculators/valve-spring"
        keywords="valve spring calculator, coil bind calculator, valve spring pressure, valve spring shim calculator, max valve lift, seat pressure, open pressure, spring rate calculator, retainer to seal clearance"
      />
      <h1 className="text-3xl font-bold mb-2">Valve Spring Calculator</h1>
      <p className="text-muted-foreground mb-8">Coil bind check, max safe lift, shimming guide, pressure verification, and retainer-to-seal clearance for any cam type.</p>

      <Tabs defaultValue="bind" className="space-y-6">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="bind" className="text-xs sm:text-sm py-2">Coil Bind</TabsTrigger>
          <TabsTrigger value="max-lift" className="text-xs sm:text-sm py-2">Max Lift</TabsTrigger>
          <TabsTrigger value="shimming" className="text-xs sm:text-sm py-2">Shimming</TabsTrigger>
          <TabsTrigger value="pressure" className="text-xs sm:text-sm py-2">Pressure</TabsTrigger>
          <TabsTrigger value="retainer" className="text-xs sm:text-sm py-2">Retainer</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 1: COIL BIND CHECK                                */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="bind">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Spring Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={installedHeight} onChange={e => setInstalledHeight(e.target.value)} />
                  <Hint>From spring manufacturer spec or measured at assembly. Aluminum heads grow 0.005\u20130.008" when hot, reducing this value.</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Coil Bind Height (inches)</Label>
                  <Input type="number" step="0.001" value={coilBindHeight} onChange={e => setCoilBindHeight(e.target.value)} />
                  <Hint>From spring manufacturer datasheet \u2014 not a calculated value</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Max Valve Lift (inches)</Label>
                  <Input type="number" step="0.001" value={maxLift} onChange={e => setMaxLift(e.target.value)} />
                  <Hint>At the valve, after rocker ratio. Not cam lobe lift.</Hint>
                </div>

                {ml > 0 && ml < 0.350 && (
                  <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="text-yellow-700 text-sm font-bold">Did you enter cam lobe lift by mistake?</p>
                    <p className="text-xs text-muted-foreground mt-1">A value under 0.350" is unusual for valve lift. Most valve lifts are 0.450\u20130.650". If you entered your cam lobe lift, multiply it by your rocker ratio first, or use the converter below.</p>
                  </div>
                )}

                <LiftConverter id="bind" onLiftCalculated={setMaxLift} />

                <div className="space-y-1">
                  <Label>Application</Label>
                  <Select value={appType} onValueChange={v => setAppType(v as AppType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street (0.060" margin)</SelectItem>
                      <SelectItem value="performance">Performance (0.070" margin)</SelectItem>
                      <SelectItem value="race">Race (0.080" margin)</SelectItem>
                      <SelectItem value="extreme">Extreme / Drag (0.100" margin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Compressed Height at Max Lift</p>
                    <p className="text-3xl font-bold">{compressedHeight.toFixed(3)}"</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Clearance to Coil Bind</p>
                    <p className="text-5xl font-bold text-primary">{clearance.toFixed(3)}"</p>
                    <p className="text-gray-400 text-xs mt-1">Required margin: {margin.toFixed(3)}" ({appMargins[appType].label})</p>
                  </div>
                </CardContent>
              </Card>

              <div className={`p-4 rounded-lg border ${bindZone.bg}`}>
                <p className={`font-bold text-lg ${bindZone.color}`}>{bindZone.label}</p>
                <p className="text-sm mt-1 text-muted-foreground">{bindZone.message}</p>
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">compressed = installed - lift = {ih.toFixed(3)} - {ml.toFixed(3)} = {compressedHeight.toFixed(3)}</p>
                <p className="font-mono font-medium mt-1">clearance = compressed - bind = {compressedHeight.toFixed(3)} - {cbh.toFixed(3)} = {clearance.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 2: MAX SAFE LIFT                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="max-lift">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Spring Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={mslInstalled} onChange={e => setMslInstalled(e.target.value)} />
                  <Hint>Aluminum heads grow 0.005\u20130.008" when hot, reducing this value.</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Coil Bind Height (inches)</Label>
                  <Input type="number" step="0.001" value={mslBindHeight} onChange={e => setMslBindHeight(e.target.value)} />
                  <Hint>From spring manufacturer datasheet</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Application</Label>
                  <Select value={mslAppType} onValueChange={v => setMslAppType(v as AppType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street (0.060" margin)</SelectItem>
                      <SelectItem value="performance">Performance (0.070" margin)</SelectItem>
                      <SelectItem value="race">Race (0.080" margin)</SelectItem>
                      <SelectItem value="extreme">Extreme / Drag (0.100" margin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Maximum Safe Valve Lift</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Max Lift ({appMargins[mslAppType].label})</p>
                    <p className="text-5xl font-bold text-primary">{maxSafeLift.toFixed(3)}"</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>All Application Levels</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted">
                          <th className="text-left p-3">Application</th>
                          <th className="text-right p-3">Margin</th>
                          <th className="text-right p-3">Max Lift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.entries(appMargins) as [AppType, { label: string; margin: number }][]).map(([key, { label, margin: m }], i) => {
                          const lift = mslIh - mslCbh - m;
                          return (
                            <tr key={key} className={`${i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"} ${key === mslAppType ? "font-bold" : ""}`}>
                              <td className="p-3">{label}</td>
                              <td className="text-right p-3">{m.toFixed(3)}"</td>
                              <td className={`text-right p-3 font-bold ${key === mslAppType ? "text-primary" : ""}`}>{lift.toFixed(3)}"</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">max_lift = installed - bind - margin = {mslIh.toFixed(3)} - {mslCbh.toFixed(3)} - {mslMargin.toFixed(3)} = {maxSafeLift.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 3: SHIMMING                                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="shimming">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Measured Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={measuredHeight} onChange={e => setMeasuredHeight(e.target.value)} />
                  <Hint>What you actually measured after assembly</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Target Installed Height (inches)</Label>
                  <Input type="number" step="0.001" value={targetHeight} onChange={e => setTargetHeight(e.target.value)} />
                  <Hint>From cam card or spring manufacturer recommendation</Hint>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {shimRequired < 0 ? (
                <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                  <p className="font-bold text-lg text-red-700">Cannot Shim Down</p>
                  <p className="text-sm mt-1 text-muted-foreground">Measured height ({mh.toFixed(3)}") is less than target ({th.toFixed(3)}"). You cannot reduce installed height with shims. Options: different retainer, different valve locks, or machine the spring seat deeper.</p>
                </div>
              ) : (
                <>
                  <Card className="bg-[#1a1a1a] text-white">
                    <CardHeader><CardTitle>Shim Required</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-gray-400 text-sm">Required Shim Thickness</p>
                        <p className="text-5xl font-bold text-primary">{shimRequired.toFixed(3)}"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Recommended Combination</p>
                        {shimCombo.shims.length > 0 ? (
                          <>
                            <p className="text-2xl font-bold">{formatShimCombo(shimCombo.shims)}</p>
                            <p className="text-gray-400 text-xs mt-1">Total: {shimCombo.total.toFixed(3)}"</p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold">No shim needed</p>
                        )}
                      </div>
                      {shimCombo.total > 0 && Math.abs(shimRequired - shimCombo.total) > 0.001 && (
                        <div className="border-t border-gray-700 pt-3">
                          <p className="text-gray-400 text-sm">Remainder Not Covered by Stock Shims</p>
                          <p className="text-xl font-bold text-yellow-400">{(shimRequired - shimCombo.total).toFixed(3)}"</p>
                          <p className="text-gray-400 text-xs mt-1">This amount is below the smallest stock shim (0.015"). The nearest combination overshoots or undershoots slightly.</p>
                        </div>
                      )}
                      <div className="border-t border-gray-700 pt-3">
                        <p className="text-gray-400 text-sm">Actual Installed Height After Shimming</p>
                        <p className="text-3xl font-bold">{actualAfterShim.toFixed(3)}"</p>
                      </div>
                    </CardContent>
                  </Card>

                  {shimRequired > 0 && shimRequired < 0.015 && (
                    <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                      <p className="font-bold text-yellow-700">Below Minimum Shim</p>
                      <p className="text-sm mt-1 text-muted-foreground">Required shim ({shimRequired.toFixed(3)}") is less than the smallest stock shim (0.015"). You may not need to shim, or use a 0.015" shim to get closer to target.</p>
                    </div>
                  )}
                </>
              )}

              <Card>
                <CardHeader><CardTitle>Stock Shim Sizes</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {SHIM_SIZES.slice().reverse().map(size => (
                      <div key={size} className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-lg font-bold">{size.toFixed(3)}"</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Standard valve spring shim thicknesses. Combine as needed to reach target.</p>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">shim = measured - target = {mh.toFixed(3)} - {th.toFixed(3)} = {shimRequired.toFixed(3)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 4: PRESSURE CHECK                                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="pressure">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Spring Rate (lb/in)</Label>
                  <Input type="number" step="1" value={springRate} onChange={e => setSpringRate(e.target.value)} />
                </div>

                <RateCalculator onRateCalculated={(r) => setSpringRate(r)} />

                <div className="space-y-1">
                  <Label>Seat Pressure at Installed Height (lb)</Label>
                  <Input type="number" step="1" value={seatPressure} onChange={e => setSeatPressure(e.target.value)} />
                  <Hint>Measured at installed height, not free length</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Max Valve Lift (inches)</Label>
                  <Input type="number" step="0.001" value={pressureLift} onChange={e => setPressureLift(e.target.value)} />
                  <Hint>At the valve, after rocker ratio. Not cam lobe lift.</Hint>
                </div>

                {pLift > 0 && pLift < 0.350 && (
                  <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="text-yellow-700 text-sm font-bold">Did you enter cam lobe lift by mistake?</p>
                    <p className="text-xs text-muted-foreground mt-1">A value under 0.350" is unusual for valve lift. If you entered your cam lobe lift, multiply it by your rocker ratio first, or use the converter below.</p>
                  </div>
                )}

                <LiftConverter id="pressure" onLiftCalculated={setPressureLift} />

                <div className="space-y-1">
                  <Label>Cam Type</Label>
                  <Select value={camType} onValueChange={v => setCamType(v as CamType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(camTypes) as [CamType, typeof cam][]).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Open Pressure at Max Lift</p>
                    <p className="text-5xl font-bold text-primary">{openPressure.toFixed(0)} lb</p>
                    <p className="text-gray-400 text-xs mt-1">Range for {cam.label}: {cam.openMin}\u2013{cam.openMax} lb</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Seat Pressure</p>
                    <p className="text-3xl font-bold">{seat.toFixed(0)} lb</p>
                    <p className="text-gray-400 text-xs mt-1">Range for {cam.label}: {cam.seatMin}\u2013{cam.seatMax} lb</p>
                  </div>
                </CardContent>
              </Card>

              <div className={`p-4 rounded-lg border ${combinedZone.bg}`}>
                <p className={`font-bold text-lg ${combinedZone.color}`}>{combinedZone.label}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={seatZone.color}>Seat pressure: {seatZone.label} ({cam.seatMin}\u2013{cam.seatMax} lb)</p>
                  <p className={openZone.color}>Open pressure: {openZone.label} ({cam.openMin}\u2013{cam.openMax} lb)</p>
                </div>
              </div>

              {(camType === "hyd-flat" || camType === "hyd-roller-street" || camType === "hyd-roller-perf") && openZone.color === "text-red-700" && openPressure > cam.openMax && (
                <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                  <p className="font-bold text-red-700">Over-sprung Warning</p>
                  <p className="text-sm mt-1 text-muted-foreground">
                    {camType === "hyd-flat"
                      ? "Hydraulic flat tappet cams are extremely sensitive to excessive spring pressure. Over-sprung flat tappet cams scuff and wipe lobes rapidly \u2014 often within the first 20 minutes of break-in. This is the single most common spring mistake in flat tappet builds."
                      : "Excessive spring pressure on hydraulic lifters causes the lifter to collapse under load, losing lift at RPM. The hydraulic mechanism cannot hold against pressures above its design range."}
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">open = seat + (rate x lift) = {seat.toFixed(0)} + ({rate.toFixed(0)} x {pLift.toFixed(3)}) = {openPressure.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Note: assumes linear spring rate. Most springs are progressive above 60\u201370% travel, so actual open pressure is typically 5\u201310% higher than calculated.</p>
              </div>

              {/* Collapsible pressure reference table */}
              <Card>
                <CardHeader>
                  <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => setPressureTableOpen(!pressureTableOpen)}
                  >
                    <CardTitle>Pressure Range Reference</CardTitle>
                    <span className="text-muted-foreground text-sm">{pressureTableOpen ? "\u25b2 Hide" : "\u25bc Show"}</span>
                  </button>
                </CardHeader>
                {pressureTableOpen && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted">
                            <th className="text-left p-3">Cam Type</th>
                            <th className="text-right p-3">Seat (lb)</th>
                            <th className="text-right p-3">Open (lb)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Object.entries(camTypes) as [CamType, typeof cam][]).map(([key, c], i) => (
                            <tr key={key} className={`${i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"} ${key === camType ? "font-bold" : ""}`}>
                              <td className="p-3">{c.label}</td>
                              <td className="text-right p-3">{c.seatMin}\u2013{c.seatMax}</td>
                              <td className="text-right p-3">{c.openMin}\u2013{c.openMax}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB 5: RETAINER-TO-SEAL CLEARANCE                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        <TabsContent value="retainer">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Retainer-to-Seal Distance at Rest (inches)</Label>
                  <Input type="number" step="0.001" placeholder="e.g. 0.550" value={retainerToSeal} onChange={e => setRetainerToSeal(e.target.value)} />
                  <Hint>Measure from the bottom of the retainer to the top of the valve seal with the valve closed. Use a caliper or depth mic.</Hint>
                </div>
                <div className="space-y-1">
                  <Label>Max Valve Lift (inches)</Label>
                  <Input type="number" step="0.001" value={retainerLift} onChange={e => setRetainerLift(e.target.value)} />
                  <Hint>At the valve, after rocker ratio. Not cam lobe lift.</Hint>
                </div>

                {rl > 0 && rl < 0.350 && (
                  <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                    <p className="text-yellow-700 text-sm font-bold">Did you enter cam lobe lift by mistake?</p>
                    <p className="text-xs text-muted-foreground mt-1">A value under 0.350" is unusual for valve lift. If you entered your cam lobe lift, multiply it by your rocker ratio first, or use the converter below.</p>
                  </div>
                )}

                <LiftConverter id="retainer" onLiftCalculated={setRetainerLift} />

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm font-bold">How to measure</p>
                  <p className="text-xs text-muted-foreground mt-1">With the spring, retainer, and locks installed on a fully assembled head (valve closed), measure the gap between the bottom face of the retainer and the top of the valve seal or the top of the valve guide boss \u2014 whichever is taller. A depth micrometer or small ruler works. This is the total travel available before the retainer contacts the seal.</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {rts > 0 ? (
                <>
                  <Card className="bg-[#1a1a1a] text-white">
                    <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-gray-400 text-sm">Clearance at Max Lift</p>
                        <p className="text-5xl font-bold text-primary">{retainerClearance.toFixed(3)}"</p>
                        <p className="text-gray-400 text-xs mt-1">Minimum recommended: 0.060"</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Max Safe Lift (0.060" margin)</p>
                        <p className="text-3xl font-bold">{(rts - 0.060).toFixed(3)}"</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className={`p-4 rounded-lg border ${retainerZone.bg}`}>
                    <p className={`font-bold text-lg ${retainerZone.color}`}>{retainerZone.label}</p>
                    <p className="text-sm mt-1 text-muted-foreground">{retainerZone.message}</p>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-sm">Enter your retainer-to-seal measurement to see results. This is a physical measurement taken on the assembled head.</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Why This Matters</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>When the valve opens, the retainer moves down toward the valve seal. If the retainer contacts the seal, it destroys the seal immediately \u2014 causing oil to pour down the valve guide into the combustion chamber. On high-lift cams this is a common and expensive oversight.</p>
                  <p>If clearance is too tight, your options are: shorter-body retainer (Comp, Manley make these), shorter valve seal, machined spring pocket (moves the retainer up), or less valve lift.</p>
                  <p className="font-medium text-foreground">This is a separate check from coil bind. A spring can have plenty of coil bind clearance and still have the retainer hit the seal.</p>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">clearance = retainer_to_seal - lift = {rts.toFixed(3)} - {rl.toFixed(3)} = {retainerClearance.toFixed(3)}</p>
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
          <CardTitle className="text-lg">Understanding Valve Springs</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Valve springs serve two critical jobs. Seat pressure keeps the valve sealed against combustion pressure when the valve is closed. Without adequate seat pressure, combustion gases leak past the valve seat, killing compression and power. Open pressure (sometimes called "over the nose" pressure) is the force the spring exerts at maximum lift. This pressure decelerates the valve as it opens and reaccelerates it on the closing side, preventing valve float at high RPM. If open pressure is too low for the cam profile, the valve can't follow the lobe at speed and floats open \u2014 causing misfires, lost power, and potentially catastrophic piston-to-valve contact.
          </p>
          <p>
            Coil bind occurs when all the coils in a valve spring are physically touching and the spring cannot compress any further. If the valve tries to open past the coil bind point, something in the valvetrain has to give: the pushrod bends, the rocker breaks, the retainer fails, or the spring itself fatigues catastrophically. Coil bind is one of the most destructive failures possible in an engine because it happens at RPM and causes cascading damage to multiple components. Every spring has a published coil bind height on its datasheet. The safety margin between compressed height at max lift and coil bind height depends on application: street engines need less margin than race engines because they see less RPM and thermal variation.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Why Pressure Ranges Matter</h3>
          <p>
            Under-sprung engines experience valve float at RPM, losing compression and risking piston contact. Over-sprung engines suffer accelerated cam lobe wear \u2014 this is especially critical on flat-tappet camshafts, where excessive spring pressure scuffs the lobe face and wipes the cam, often within the first 20 minutes of break-in. Hydraulic flat tappet cams are the most sensitive: the cam lobe relies on an oil film between the lifter face and lobe, and excessive pressure breaks through that film. Hydraulic lifters also have a finite load limit \u2014 over-sprung hydraulic lifters collapse under load, causing the lifter to "pump down" and lose lift at RPM, which looks like a dead miss that comes and goes.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Shimming Procedure</h3>
          <p>
            After assembling all 16 valves (on a V8), measure every installed height with a spring height micrometer. Find the shortest installed height in the set. Shim all other locations down to match that shortest height, using combinations of 0.015", 0.030", 0.060", and 0.090" shims. The goal is to get all 16 within 0.010" of each other. Equalization matters more than hitting a "perfect" spec number \u2014 inconsistent installed heights mean inconsistent seat pressures across cylinders, which causes uneven sealing, uneven valve float thresholds, and harmonic problems. A set of springs all at 1.810" is better than half at 1.800" and half at 1.830".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-0.5">{children}</p>;
}
