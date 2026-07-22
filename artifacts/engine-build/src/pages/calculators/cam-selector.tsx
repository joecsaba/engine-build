import { useState, useMemo } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import { HelpSidebar } from "@/components/calculators/HelpCard";
import camSelectorContent from "@/data/calculatorContent/cam-selector.mjs";
import { CAM_DATABASE, type CamSpec, type CamPlatform, type CamLifter } from "@/data/camDatabase";

/* ─────────────────────────────────────────────────────────────────────────
   Cam Selector — recommends duration @ 0.050", LSA, and lift from the
   engine + intended use. Methodology is sourced (see cam-selector.mjs):
   - LSA: David Vizard's "128-minus" rule (128 − (ci/cyl ÷ intake-valve-dia ×
     0.91)) with per-head-family base + 0.75°/CR-point over 10.5:1. Verified
     against our own cam-duration calc's points (350→108°, 383→106°).
   - Duration@050 → RPM: dsportmag "+10°≈+500 RPM" + COMP dyno-verified data.
   - Idle vacuum ← overlap (CarTech 5-cam dyno test shape).
   - Boost/nitrous → wider LSA (OnAllCylinders / Engine Builder / LSXMag).
   ───────────────────────────────────────────────────────────────────────── */

type Application = "economy" | "daily" | "mild" | "street" | "strip" | "drag" | "pro";
type Aspiration = "na" | "supercharged" | "turbo" | "nitrous";
type Transmission = "auto" | "manual";
type HeadFamily = "sbc" | "ls" | "sbf" | "bbc" | "import";
type LifterType = "hyd_roller" | "hyd_flat" | "solid_roller" | "solid_flat";

interface AppProfile {
  label: string;
  short: string;
  desc: string;
  baseDur: number;   // intake duration @0.050", 350ci-V8 baseline
  exhAdd: number;    // exhaust duration added over intake
  liftLo: number;
  liftHi: number;
  needsStall: number; // approx converter stall the cam wants to come alive (0 = n/a)
  minCR: number;      // static CR floor to keep the cam responsive on pump gas
}

const APPLICATIONS: Record<Application, AppProfile> = {
  economy:  { label: "Economy / Towing",        short: "Economy",     desc: "Max low-end torque, best mileage, tows well. Stock-like idle.", baseDur: 200, exhAdd: 6,  liftLo: 0.400, liftHi: 0.450, needsStall: 0,    minCR: 8.5 },
  daily:    { label: "Daily Driver / RV",       short: "Daily",       desc: "Smooth idle, strong low/mid torque, great street manners.",    baseDur: 210, exhAdd: 6,  liftLo: 0.440, liftHi: 0.490, needsStall: 0,    minCR: 9.0 },
  mild:     { label: "Mild Street",             short: "Mild",        desc: "Slight lope, noticeable power gain, still very drivable.",     baseDur: 218, exhAdd: 6,  liftLo: 0.470, liftHi: 0.520, needsStall: 2000, minCR: 9.5 },
  street:   { label: "Street Performance",      short: "Street",      desc: "Healthy lope, real power, wants a mild converter/gear.",       baseDur: 226, exhAdd: 8,  liftLo: 0.500, liftHi: 0.560, needsStall: 2600, minCR: 10.0 },
  strip:    { label: "Street / Strip",          short: "Strip",       desc: "Choppy idle, strong top end, needs converter + gear + comp.",  baseDur: 236, exhAdd: 8,  liftLo: 0.540, liftHi: 0.600, needsStall: 3200, minCR: 10.5 },
  drag:     { label: "Drag / Race",             short: "Drag",        desc: "Rough race idle, all top end. Race-oriented supporting parts.", baseDur: 248, exhAdd: 8,  liftLo: 0.580, liftHi: 0.680, needsStall: 4000, minCR: 11.0 },
  pro:      { label: "Pro / Comp",              short: "Pro",         desc: "Won't idle politely. Purpose-built race valvetrain required.",  baseDur: 262, exhAdd: 10, liftLo: 0.650, liftHi: 0.800, needsStall: 5000, minCR: 12.0 },
};

const HEAD_FAMILIES: Record<HeadFamily, { label: string; base: number }> = {
  sbc:    { label: "Small Block Chevy (SBC)",      base: 128 },
  ls:     { label: "GM LS / LT (Gen III–V)",       base: 128 },
  sbf:    { label: "Ford Windsor / SBF",           base: 127 },
  bbc:    { label: "BBC / canted-valve / Cleveland", base: 131 },
  import: { label: "Import 4/6-cyl / other",       base: 128 },
};

const ASPIRATION: Record<Aspiration, { label: string; lsaAdj: number; note: string }> = {
  na:            { label: "Naturally Aspirated", lsaAdj: 0,  note: "" },
  supercharged:  { label: "Supercharged",        lsaAdj: 4,  note: "Wider LSA — the blower fills the cylinder, so less overlap is needed and reversion against boost is reduced." },
  turbo:         { label: "Turbocharged",        lsaAdj: 4,  note: "Wider LSA + earlier exhaust close cuts reversion from exhaust backpressure during overlap." },
  nitrous:       { label: "Nitrous",             lsaAdj: 2,  note: "Slightly wider LSA so nitrous doesn't blow straight through the overlap unburned." },
};

const LIFTERS: Record<LifterType, { label: string; advDelta: number; liftCeiling: number }> = {
  hyd_roller:  { label: "Hydraulic Roller",       advDelta: 52, liftCeiling: 0.650 },
  hyd_flat:    { label: "Hydraulic Flat Tappet",  advDelta: 45, liftCeiling: 0.520 },
  solid_roller:{ label: "Solid Roller",           advDelta: 42, liftCeiling: 0.900 },
  solid_flat:  { label: "Solid Flat Tappet",      advDelta: 45, liftCeiling: 0.600 },
};

function round2(n: number) { return Math.round(n / 2) * 2; }
function round100(n: number) { return Math.round(n / 100) * 100; }
function clamp(lo: number, hi: number, n: number) { return Math.max(lo, Math.min(hi, n)); }

// Advanced (optional) inputs — when 0/empty, the calc falls back to its
// simple-mode assumptions.
interface AdvInputs {
  cfm: number;        // peak intake port flow @ 28" (0 = ignore)
  flowAdj: number;    // LSA nudge derived from flow (internal)
  manifold: string;   // "dual" | "single" | "efi" | ""
  targetRpm: number;  // target peak-HP RPM (0 = use application preset)
  stroke: number;     // for dynamic compression (0 = skip)
  rod: number;        // rod length for dynamic compression (0 = skip)
}

interface Result {
  int050: number;
  exh050: number;
  lsa: number;
  vizardLsa: number;
  crAdj: number;
  aspAdj: number;
  liftLo: number;
  liftHi: number;
  advInt: number;
  advExh: number;
  overlap: number;
  idleVac: number;
  idleChar: string;
  peakTq: number;
  peakHp: number;
  bandLo: number;
  bandHi: number;
  cubesPerIn: number;
  warnings: { level: "warn" | "info" | "ok"; text: string }[];
  // Advanced-only outputs (null when the relevant advanced input wasn't given)
  hpPotential: number | null;   // from head flow
  dcr: number | null;           // dynamic compression ratio
  crankingPsi: number | null;   // estimated cranking pressure, gauge
  ivc: number | null;           // intake valve closing, °ABDC (seat)
  pumpGasVerdict: string | null;
  advNotes: string[];           // advanced-mode explanatory notes
  targetRpmUsed: boolean;
}

function compute(
  disp: number, cyl: number, valveDia: number, cr: number,
  app: Application, asp: Aspiration, trans: Transmission,
  head: HeadFamily, lifter: LifterType, stall: number,
  adv: AdvInputs,
): Result | null {
  if (disp <= 0 || cyl <= 0 || valveDia <= 0) return null;
  const p = APPLICATIONS[app];
  const dispPerCyl = disp / cyl;
  const cubesPerIn = dispPerCyl / valveDia;
  const advNotes: string[] = [];

  // ── Duration: application base scaled to cubes-per-cylinder ──────────────
  // Bigger engines swallow more cam at the same idle intent (they still make
  // idle torque); smaller engines get slightly less. ~0.35°/ci-per-cyl vs the
  // 43.75 ci/cyl (350 V8) baseline.
  const durNudge = (dispPerCyl - 43.75) * 0.35;
  let int050: number;
  let targetRpmUsed = false;
  if (adv.targetRpm > 0) {
    // Reverse-solve duration from a target peak-HP RPM:
    // peakHp = 3800 + 52·(int050 − 200)  ⇒  int050 = 200 + (targetRpm − 3800)/52
    int050 = round2(clamp(190, 290, 200 + (adv.targetRpm - 3800) / 52));
    targetRpmUsed = true;
    advNotes.push(`Duration set to hit your ~${adv.targetRpm.toLocaleString()} RPM peak-power target (overrides the application preset).`);
  } else {
    int050 = round2(clamp(190, 290, p.baseDur + durNudge));
  }
  const exh050 = int050 + p.exhAdd;

  // ── LSA: Vizard 128-minus rule + CR + aspiration + (advanced) flow ──────
  const base = HEAD_FAMILIES[head].base;
  const vizardRaw = base - cubesPerIn * 0.91;
  const crAdj = (cr - 10.5) * 0.75;         // +0.75°/point over 10.5, symmetric under
  const aspAdj = ASPIRATION[asp].lsaAdj;
  const flowAdj = adv.flowAdj;              // 0 unless CFM provided
  const vizardLsa = clamp(100, 118, Math.round(vizardRaw));
  const lsa = clamp(102, 120, Math.round(vizardRaw + crAdj + aspAdj + flowAdj));

  // ── Lift (bounded by lifter type ceiling) ───────────────────────────────
  const ceil = LIFTERS[lifter].liftCeiling;
  const liftLo = Math.min(p.liftLo, ceil);
  const liftHi = Math.min(p.liftHi, ceil);

  // ── Overlap (advertised) + idle vacuum ──────────────────────────────────
  const advDelta = LIFTERS[lifter].advDelta;
  const advInt = int050 + advDelta;
  const advExh = exh050 + advDelta;
  const overlap = Math.round((advInt + advExh) / 2 - 2 * lsa);
  // Idle vacuum tracks overlap (CarTech dyno-test shape): ~21 inHg at 0 overlap
  // falling ~0.13 inHg per degree of overlap.
  const idleVac = clamp(3, 21, Math.round((21 - overlap * 0.13) * 10) / 10);
  const idleChar =
    overlap < 35 ? "Smooth, stock-like idle" :
    overlap < 50 ? "Slight lope — you can hear it" :
    overlap < 65 ? "Noticeable lope — sounds healthy" :
    overlap < 80 ? "Choppy — aggressive street idle" :
    overlap < 95 ? "Rough race idle — needs high idle speed" :
                   "Barely idles — race-only";

  // ── Peak RPM estimates from intake duration @0.050" ─────────────────────
  const peakTq = round100(2000 + 52 * (int050 - 200));
  const peakHp = peakTq + 1800;
  // Intake manifold shifts the usable band: single-plane favors the top,
  // dual-plane favors low/mid and caps the top a bit.
  let bandShiftLo = 0, bandShiftHi = 0;
  if (adv.manifold === "single") { bandShiftLo = 200; bandShiftHi = 300; advNotes.push("Single-plane intake: powerband shifts up — favors 3,500 RPM and above, gives up a little bottom-end for top-end."); }
  else if (adv.manifold === "dual") { bandShiftHi = -200; advNotes.push("Dual-plane intake: strong low and mid-range, but it signs off up top — pair with cams under ~230° @ .050\" for best results."); }
  else if (adv.manifold === "efi") { advNotes.push("EFI intake: broad, flexible powerband — tune covers the transitions."); }
  const bandLo = round100(peakTq - 1400 + bandShiftLo);
  const bandHi = round100(peakHp + 400 + bandShiftHi);

  // ── Supporting-mod warnings ─────────────────────────────────────────────
  const warnings: Result["warnings"] = [];
  if (trans === "auto" && p.needsStall > 0) {
    const recStallLo = round100(bandLo);
    const recStallHi = round100(bandLo + 500);
    if (stall > 0 && stall < recStallLo - 300) {
      warnings.push({ level: "warn", text: `Your ${stall} RPM converter is too tight for this cam. It comes alive around ${bandLo} RPM — target a ${recStallLo}–${recStallHi} RPM stall converter or the car will feel flat off idle.` });
    } else {
      warnings.push({ level: "info", text: `Automatic: this cam wants roughly a ${recStallLo}–${recStallHi} RPM stall converter so it launches in its powerband.` });
    }
  }
  if (cr > 0 && cr < p.minCR) {
    warnings.push({ level: "warn", text: `At ${cr.toFixed(1)}:1 static compression, this cam will feel soft. A longer cam bleeds off cylinder pressure down low — bump static compression toward ${p.minCR.toFixed(1)}:1+ to restore snap and keep cranking pressure healthy.` });
  }
  if (liftHi > 0.550) {
    warnings.push({ level: "warn", text: `Peak lift near ${liftHi.toFixed(3)}" exceeds the ~0.550" ceiling most OE valvetrains tolerate. Verify piston-to-valve clearance and confirm your springs, retainers, and guides are rated for this lift.` });
  }
  if (app === "economy" || app === "daily") {
    warnings.push({ level: "ok", text: `This range works with stock springs on most engines and keeps enough idle vacuum (${idleVac} inHg est.) for power brakes.` });
  } else {
    warnings.push({ level: "info", text: `Plan on a matched valve-spring upgrade for this cam's lift and RPM — stock springs will float and can drop valves at the top of the band.` });
  }
  if (idleVac < 12 && trans === "manual") {
    warnings.push({ level: "info", text: `Estimated idle vacuum (${idleVac} inHg) is low — fine for a manual, but a vacuum-brake-boost car may need a vacuum canister or electric booster.` });
  }
  if (ASPIRATION[asp].note) {
    warnings.push({ level: "info", text: ASPIRATION[asp].note });
  }

  // ── Advanced analysis ────────────────────────────────────────────────────
  // HP potential from head flow (Vizard's flow-to-HP rule: ~0.257 hp per CFM
  // of peak intake flow at 28", per cylinder).
  let hpPotential: number | null = null;
  if (adv.cfm > 0) {
    hpPotential = Math.round(adv.cfm * 0.257 * cyl);
    // Is the head a bottleneck or over-cammed relative to flow? A rough guide:
    // the cam's usable peak-HP RPM wants flow of about disp × peakHp / 100000 CFM
    // per cylinder. We instead compare flow-per-cube to a ~2.2 CFM/ci street norm.
    const flowPerCube = adv.cfm / dispPerCyl;
    if (flowPerCube < 1.9) {
      warnings.push({ level: "warn", text: `At ${adv.cfm} CFM the heads may bottleneck this cam — the engine will run out of breath before the duration's RPM suggests. A bigger cam won't help until the heads flow more.` });
    } else if (flowPerCube > 2.6) {
      advNotes.push(`Strong head flow (${flowPerCube.toFixed(1)} CFM per cubic inch) supports this cam's top end — you could even step up in duration and the heads would keep feeding it.`);
    }
    advNotes.push(`Head-flow HP potential: about ${hpPotential} hp at the crank if the rest of the combo (cam, intake, exhaust, compression) is matched — heads flowing ${adv.cfm} CFM × 0.257 × ${cyl} cylinders.`);
  }

  // Dynamic compression + cranking pressure from the recommended cam's intake
  // valve closing point. DCR = 1 + (effective_stroke/stroke)·(SCR−1), which is
  // bore/chamber-independent. IVC (seat) from the recommended cam timing.
  let dcr: number | null = null, crankingPsi: number | null = null, ivc: number | null = null, pumpGasVerdict: string | null = null;
  if (adv.stroke > 0 && adv.rod > 0 && cr > 1) {
    const advance = 4; // typical ground-in intake advance
    const icl = lsa - advance;
    ivc = advInt / 2 + icl - 180; // °ABDC, seat timing
    if (ivc > 0 && ivc < 110) {
      const A = (ivc * Math.PI) / 180;
      const r = adv.stroke / 2;
      const R = adv.rod;
      const se = r + R + r * Math.cos(A) - Math.sqrt(R * R - Math.pow(r * Math.sin(A), 2));
      dcr = Math.round((1 + (se / adv.stroke) * (cr - 1)) * 100) / 100;
      crankingPsi = Math.round(14.7 * Math.pow(dcr, 1.2) - 14.7);
      pumpGasVerdict =
        crankingPsi <= 175 ? "Comfortable on pump gas (regular–premium)" :
        crankingPsi <= 195 ? "Pump-gas friendly on 91–93 octane with good tuning" :
        crankingPsi <= 210 ? "Right at the pump-gas edge — needs premium, good chambers, careful timing" :
                             "Race-gas territory — cranking pressure is high for pump gas";
      advNotes.push(`With this cam (intake closes ~${Math.round(ivc)}° ABDC) on your ${adv.stroke}" stroke / ${adv.rod}" rod and ${cr.toFixed(1)}:1 static, dynamic compression works out to ${dcr}:1 (~${crankingPsi} psi cranking).`);
    }
  }

  return {
    int050, exh050, lsa, vizardLsa, crAdj, aspAdj, liftLo, liftHi,
    advInt, advExh, overlap, idleVac, idleChar,
    peakTq, peakHp, bandLo, bandHi, cubesPerIn, warnings,
    hpPotential, dcr, crankingPsi, ivc, pumpGasVerdict, advNotes, targetRpmUsed,
  };
}

// Smart default intake valve diameter from displacement per cylinder.
function defaultValveDia(disp: number, cyl: number): number {
  if (disp <= 0 || cyl <= 0) return 2.02;
  const perCyl = disp / cyl;
  if (perCyl < 25) return 1.50;
  if (perCyl < 35) return 1.80;
  if (perCyl < 42) return 1.94;
  if (perCyl < 50) return 2.02;
  if (perCyl < 58) return 2.19;
  return 2.30;
}

export default function CamSelectorCalculator() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [disp, setDisp] = useState("350");
  const [cyl, setCyl] = useState("8");
  const [valveDia, setValveDia] = useState("2.02");
  const [valveTouched, setValveTouched] = useState(false);
  const [cr, setCr] = useState("10.0");
  const [app, setApp] = useState<Application>("street");
  const [asp, setAsp] = useState<Aspiration>("na");
  const [trans, setTrans] = useState<Transmission>("auto");
  const [head, setHead] = useState<HeadFamily>("sbc");
  const [lifter, setLifter] = useState<LifterType>("hyd_roller");
  const [stall, setStall] = useState("");
  // Advanced-only inputs
  const [cfm, setCfm] = useState("");
  const [manifold, setManifold] = useState("");
  const [targetRpm, setTargetRpm] = useState("");
  const [stroke, setStroke] = useState("");
  const [rod, setRod] = useState("");

  // Auto-fill valve diameter from displacement unless the user has set it.
  const effectiveValve = valveTouched ? valveDia : defaultValveDia(parseFloat(disp) || 0, parseInt(cyl) || 0).toFixed(2);

  // Advanced inputs bundle — zeroed out in simple mode so the calc uses its
  // assumptions. Flow → LSA nudge (Vizard: high-flow heads want wider LSA).
  const advInputs: AdvInputs = useMemo(() => {
    if (mode !== "advanced") return { cfm: 0, flowAdj: 0, manifold: "", targetRpm: 0, stroke: 0, rod: 0 };
    const cfmN = parseFloat(cfm) || 0;
    const dispPerCyl = (parseFloat(disp) || 0) / (parseInt(cyl) || 1);
    let flowAdj = 0;
    if (cfmN > 0 && dispPerCyl > 0) {
      const flowPerCube = cfmN / dispPerCyl;
      flowAdj = clamp(-1, 2, Math.round((flowPerCube - 2.2) * 2));
    }
    return {
      cfm: cfmN,
      flowAdj,
      manifold,
      targetRpm: parseInt(targetRpm) || 0,
      stroke: parseFloat(stroke) || 0,
      rod: parseFloat(rod) || 0,
    };
  }, [mode, cfm, manifold, targetRpm, stroke, rod, disp, cyl]);

  const result = useMemo(() => compute(
    parseFloat(disp) || 0, parseInt(cyl) || 0, parseFloat(effectiveValve) || 0,
    parseFloat(cr) || 0, app, asp, trans, head, lifter, parseInt(stall) || 0,
    advInputs,
  ), [disp, cyl, effectiveValve, cr, app, asp, trans, head, lifter, stall, advInputs]);

  // ── Match the recommendation against the real-cam database ───────────────
  // Head family maps directly to a cam platform (sbc/ls/bbc/sbf). "import" has
  // no database coverage yet. Score = weighted distance in the fields that
  // matter most: duration @0.050", then LSA, then lift-range fit, with a soft
  // penalty for a lifter-type mismatch. We only surface cams within a sane
  // duration window so we never recommend something wildly off.
  const matches = useMemo(() => {
    if (!result) return [];
    const platform = head as CamPlatform; // sbc|ls|bbc|sbf all exist in the DB
    if (!["sbc", "ls", "bbc", "sbf"].includes(platform)) return [];
    const scored = CAM_DATABASE
      .filter((c) => c.platform === platform)
      .map((c) => {
        const durDiff = Math.abs(c.int050 - result.int050);
        const lsaDiff = Math.abs(c.lsa - result.lsa);
        // lift fit: penalty only if the cam's peak lift is outside a tolerant band
        const camLift = Math.max(c.liftInt, c.liftExh);
        const liftPenalty =
          camLift < result.liftLo - 0.04 ? (result.liftLo - camLift) * 40 :
          camLift > result.liftHi + 0.06 ? (camLift - result.liftHi) * 40 : 0;
        const lifterPenalty = c.lifter === (lifter as CamLifter) ? 0 : 8;
        const score = durDiff * 3 + lsaDiff * 2 + liftPenalty + lifterPenalty;
        return { cam: c, score, durDiff };
      })
      .filter((m) => m.durDiff <= 16) // only reasonably-close cams
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
    return scored;
  }, [result, head, lifter]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Camshaft Selector — What Cam Do I Need? Duration, LSA & Lift Calculator"
        description="Free camshaft selector: enter your engine, compression, transmission, and goal and get recommended duration @ 0.050&quot;, lobe separation angle (LSA), and valve lift — plus real matching cams from COMP, Brian Tooley Racing, Texas Speed, Lunati, Crane, Howards, Edelbrock &amp; Summit. Advanced mode adds ported head flow, dynamic compression, and target-RPM inputs. Uses David Vizard's LSA method."
        canonical="/calculators/cam-selector"
        keywords="cam selector, camshaft selector, what cam do i need, camshaft calculator, cam duration calculator, LSA calculator, lobe separation angle, how to choose a camshaft, cam recommendation, camshaft finder, cam selection calculator, street cam, street strip cam, duration at 0.050"
      />

      <h1 className="text-3xl font-bold mb-2">Camshaft Selector — What Cam Do I Need?</h1>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Tell us about your engine and what you want it to do. We'll recommend a duration at 0.050&quot;, lobe separation angle, and lift range — then show the powerband it makes, how it idles, real matching cams, and the converter, compression, and springs it needs. Methodology follows David Vizard's LSA method and published cam-duration/RPM data.
      </p>

      {/* ── Simple / Advanced toggle ── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setMode("simple")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${mode === "simple" ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}
          >
            Simple
          </button>
          <button
            onClick={() => setMode("advanced")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l ${mode === "advanced" ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}
          >
            Advanced
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "simple"
            ? "Simple mode uses smart assumptions. Switch to Advanced to enter real head flow, dynamic-compression inputs, target RPM, and intake type."
            : "Advanced: override the assumptions. Any field you leave blank falls back to the simple-mode estimate."}
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── INPUTS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Engine</CardTitle>
                <CardDescription>Displacement drives cam size; valve diameter and head family set the LSA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Displacement (ci)</Label>
                    <Input type="number" step="1" value={disp} onChange={(e) => setDisp(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Cylinders</Label>
                    <Input type="number" step="1" value={cyl} onChange={(e) => setCyl(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Head Family</Label>
                  <Select value={head} onValueChange={(v) => setHead(v as HeadFamily)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(HEAD_FAMILIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Intake Valve Ø (in)</Label>
                    <Input
                      type="number" step="0.01"
                      value={effectiveValve}
                      onChange={(e) => { setValveTouched(true); setValveDia(e.target.value); }}
                    />
                    {!valveTouched && <p className="text-[10px] text-muted-foreground">Auto from displacement — edit to override</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Static Compression</Label>
                    <Input type="number" step="0.1" value={cr} onChange={(e) => setCr(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Goal</CardTitle>
                <CardDescription>What the car is for — this sets the cam size and idle character.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Intended Use</Label>
                  <Select value={app} onValueChange={(v) => setApp(v as Application)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPLICATIONS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{APPLICATIONS[app].desc}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Aspiration</Label>
                    <Select value={asp} onValueChange={(v) => setAsp(v as Aspiration)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ASPIRATION).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Lifter Type</Label>
                    <Select value={lifter} onValueChange={(v) => setLifter(v as LifterType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(LIFTERS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Transmission</Label>
                    <Select value={trans} onValueChange={(v) => setTrans(v as Transmission)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automatic</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {trans === "auto" && (
                    <div className="space-y-1">
                      <Label>Converter Stall (RPM)</Label>
                      <Input type="number" step="100" placeholder="stock ~1800" value={stall} onChange={(e) => setStall(e.target.value)} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── ADVANCED INPUTS ── */}
          {mode === "advanced" && (
            <Card className="border-[#E85D04]/30">
              <CardHeader>
                <CardTitle className="text-base">Advanced — Override the Assumptions</CardTitle>
                <CardDescription>Enter real numbers where you have them. Blank fields fall back to the simple-mode estimate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Intake port flow (CFM @ 28&quot;)</Label>
                    <Input type="number" step="5" placeholder="e.g. 265 ported" value={cfm} onChange={(e) => setCfm(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground">Peak intake flow. Refines LSA + shows HP potential + flags a head bottleneck.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Intake manifold</Label>
                    <Select value={manifold || "unset"} onValueChange={(v) => setManifold(v === "unset" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Not specified</SelectItem>
                        <SelectItem value="dual">Dual-plane (low/mid torque)</SelectItem>
                        <SelectItem value="single">Single-plane (top-end)</SelectItem>
                        <SelectItem value="efi">EFI / port injection</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Shifts the usable powerband.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Target peak-HP RPM</Label>
                    <Input type="number" step="100" placeholder="e.g. 6500" value={targetRpm} onChange={(e) => setTargetRpm(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground">Reverse-solves duration to hit your RPM target instead of the preset.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Stroke (in)</Label>
                      <Input type="number" step="0.01" placeholder="3.48" value={stroke} onChange={(e) => setStroke(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Rod length (in)</Label>
                      <Input type="number" step="0.01" placeholder="5.70" value={rod} onChange={(e) => setRod(e.target.value)} />
                    </div>
                    <p className="col-span-2 text-[10px] text-muted-foreground">Stroke + rod + your static compression → dynamic compression &amp; cranking pressure for the recommended cam (pump-gas check).</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── RESULT ── */}
          {result && (
            <>
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-[#E85D04]" />
                    Recommended Cam Specs
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    A starting-point spec for a {APPLICATIONS[app].label.toLowerCase()} {parseFloat(disp) || "?"}ci build.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Duration @ .050&quot;</p>
                      <p className="text-2xl font-bold font-mono text-primary">{result.int050}/{result.exh050}°</p>
                      <p className="text-[10px] text-gray-500">intake / exhaust</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Lobe Separation</p>
                      <p className="text-2xl font-bold font-mono text-primary">{result.lsa}°</p>
                      <p className="text-[10px] text-gray-500">LSA</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Valve Lift</p>
                      <p className="text-2xl font-bold font-mono text-primary">{result.liftLo.toFixed(3)}&quot;</p>
                      <p className="text-[10px] text-gray-500">to {result.liftHi.toFixed(3)}&quot;</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Advertised ≈</p>
                      <p className="text-2xl font-bold font-mono text-primary">{result.advInt}/{result.advExh}°</p>
                      <p className="text-[10px] text-gray-500">for shopping</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-4 border-t border-gray-700 pt-3">
                    Shop by the <strong className="text-white">duration @ 0.050&quot;</strong> and <strong className="text-white">LSA</strong> — those are the two cross-comparable numbers. Advertised duration varies by manufacturer checking height, so treat it as approximate.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Estimated Powerband</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Comes alive</span><span className="font-mono font-semibold">~{result.bandLo} RPM</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Peak torque</span><span className="font-mono font-semibold">~{result.peakTq} RPM</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Peak horsepower</span><span className="font-mono font-semibold">~{result.peakHp} RPM</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Usable to</span><span className="font-mono font-semibold">~{result.bandHi} RPM</span></div>
                    <p className="text-[11px] text-muted-foreground border-t pt-2">Centroid estimates from duration @ 0.050&quot;. Head flow and displacement shift the absolute peaks ±10% — a bigger, better-breathing engine peaks a little higher.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Idle & Overlap</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Overlap (advertised)</span><span className="font-mono font-semibold">{result.overlap}°</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Idle vacuum (est.)</span><span className="font-mono font-semibold">~{result.idleVac} inHg</span></div>
                    <div className="pt-1">
                      <p className="font-semibold text-foreground">{result.idleChar}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground border-t pt-2">Idle character comes from valve overlap, which is set by duration and LSA together. Power-brake cars generally want ≥ ~14 inHg at idle.</p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Advanced analysis (only when advanced inputs were given) ── */}
              {mode === "advanced" && (result.hpPotential !== null || result.dcr !== null || result.advNotes.length > 0) && (
                <Card className="border-[#E85D04]/30">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gauge className="w-4 h-4 text-[#E85D04]" />Advanced Analysis</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {(result.hpPotential !== null || result.dcr !== null) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {result.hpPotential !== null && (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Head-flow HP potential</p>
                            <p className="text-xl font-bold font-mono">{result.hpPotential} hp</p>
                          </div>
                        )}
                        {result.dcr !== null && (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dynamic compression</p>
                            <p className="text-xl font-bold font-mono">{result.dcr}:1</p>
                          </div>
                        )}
                        {result.crankingPsi !== null && (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cranking pressure (est.)</p>
                            <p className="text-xl font-bold font-mono">~{result.crankingPsi} psi</p>
                          </div>
                        )}
                      </div>
                    )}
                    {result.pumpGasVerdict && (
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-foreground font-medium">{result.pumpGasVerdict}</p>
                      </div>
                    )}
                    {result.advNotes.map((n, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                        <p className="text-muted-foreground">{n}</p>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground border-t pt-3">
                      Dynamic compression uses the recommended cam's intake-closing point (≈4° ground-in advance) with your stroke, rod, and static compression via the standard slider-crank effective-stroke method. HP potential uses ~0.257 hp per CFM of peak intake flow. Both are estimates — validate a final build on a dyno.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Supporting Parts & Cautions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {w.level === "warn" && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                      {w.level === "info" && <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />}
                      {w.level === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                      <p className={w.level === "warn" ? "text-amber-900" : "text-muted-foreground"}>{w.text}</p>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground border-t pt-3">
                    LSA math: Vizard base {HEAD_FAMILIES[head].base} − ({result.cubesPerIn.toFixed(1)} cubes/inch-of-valve × 0.91)
                    {result.crAdj !== 0 && <> {result.crAdj > 0 ? "+" : ""}{result.crAdj.toFixed(1)}° for compression</>}
                    {result.aspAdj !== 0 && <> +{result.aspAdj}° for the power adder</>}
                    {" "}= {result.lsa}° LSA. Verify final specs against your cam manufacturer's recommendation and always check piston-to-valve clearance.
                  </p>
                </CardContent>
              </Card>

              {/* ── Matching real cams from the database ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Closest Real Cams</CardTitle>
                  <CardDescription>
                    {matches.length > 0
                      ? `Published grinds from major manufacturers near your recommended spec, sorted by fit. These are shopping starting points — not an endorsement.`
                      : head === "import"
                        ? `No cam database coverage for import/other engines yet — use the recommended spec above to shop.`
                        : `No close database matches — your recommendation may be between common off-the-shelf grinds, or a custom cam is warranted. Use the spec above to shop.`}
                  </CardDescription>
                </CardHeader>
                {matches.length > 0 && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                            <th className="pb-2 pr-3 font-medium">Cam</th>
                            <th className="pb-2 pr-3 font-medium">Part #</th>
                            <th className="pb-2 pr-3 font-medium">@.050&quot; I/E</th>
                            <th className="pb-2 pr-3 font-medium">Lift I/E</th>
                            <th className="pb-2 pr-3 font-medium">LSA</th>
                            <th className="pb-2 pr-3 font-medium">Lifter</th>
                            <th className="pb-2 font-medium">RPM / Use</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((m, i) => {
                            const c = m.cam;
                            const lifterLabel: Record<CamLifter, string> = {
                              hyd_flat: "Hyd flat", hyd_roller: "Hyd roller",
                              solid_flat: "Solid flat", solid_roller: "Solid roller",
                            };
                            return (
                              <tr key={i} className="border-b last:border-0 align-top hover:bg-muted/40 transition-colors">
                                <td className="py-2 pr-3">
                                  <div className="font-semibold text-foreground">{c.mfr}</div>
                                  <div className="text-xs text-muted-foreground">{c.family}</div>
                                </td>
                                <td className="py-2 pr-3 font-mono text-xs">{c.part}</td>
                                <td className="py-2 pr-3 font-mono">{c.int050}/{c.exh050 ?? "—"}°</td>
                                <td className="py-2 pr-3 font-mono text-xs">{c.liftInt.toFixed(3)}/{c.liftExh.toFixed(3)}&quot;</td>
                                <td className="py-2 pr-3 font-mono">{c.lsa}°</td>
                                <td className="py-2 pr-3 text-xs">{lifterLabel[c.lifter]}</td>
                                <td className="py-2 text-xs text-muted-foreground">{c.rpmLo != null && c.rpmHi != null ? `${c.rpmLo.toLocaleString()}–${c.rpmHi.toLocaleString()} · ` : ""}{c.use}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3 border-t pt-3 leading-relaxed">
                      <strong>Verify before buying.</strong> Specs and part numbers change, and lift depends on your rocker ratio (listed at the platform's standard ratio). These are representative popular grinds pulled from published manufacturer/retailer data — confirm current specs, pricing, availability, and fitment with the manufacturer, and always check piston-to-valve clearance for your combination. Engine-build.com is not affiliated with any cam manufacturer.
                    </p>
                  </CardContent>
                )}
              </Card>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
                <p className="font-semibold mb-1">Next steps</p>
                <p>
                  Take these numbers to the <Link href="/calculators/cam-duration" className="underline font-medium">Advanced Cam Calculator</Link> to see full valve events and dynamic compression, then the <Link href="/calculators/piston-to-valve" className="underline font-medium">Piston-to-Valve Clearance</Link> and <Link href="/calculators/valve-spring" className="underline font-medium">Valve Spring</Link> calculators to validate the install.
                </p>
              </div>
            </>
          )}
        </div>

        <HelpSidebar className="xl:w-80 shrink-0 space-y-6">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E85D04]" />
                How to read the recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Duration @ 0.050&quot;</h4>
                <p>The one cross-comparable number. Bigger duration = higher RPM powerband, less low-end, choppier idle. Every +10° moves the powerband up roughly 500 RPM.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">LSA (lobe separation)</h4>
                <p>Tighter (106–110°) = more overlap, lopier idle, more peak torque, narrower band. Wider (112–116°) = smoother idle, more vacuum, broader band. Boost and nitrous want it wider.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">The #1 mistake</h4>
                <p>Buying more cam than the converter, gear, and compression can support. A big cam with a stock converter and 2.73 gears is slower than a right-sized cam. Match the whole combo.</p>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Duration by use (SBC-class)</h4>
                <ul className="space-y-1 mt-1 text-xs">
                  <li className="flex justify-between"><span>Economy/tow:</span><span className="font-mono">195–205°</span></li>
                  <li className="flex justify-between"><span>Daily:</span><span className="font-mono">205–215°</span></li>
                  <li className="flex justify-between"><span>Mild street:</span><span className="font-mono">214–222°</span></li>
                  <li className="flex justify-between"><span>Street perf:</span><span className="font-mono">222–232°</span></li>
                  <li className="flex justify-between"><span>Street/strip:</span><span className="font-mono">232–244°</span></li>
                  <li className="flex justify-between"><span>Drag/race:</span><span className="font-mono">244–260°</span></li>
                  <li className="flex justify-between"><span>Pro/comp:</span><span className="font-mono">260°+</span></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </HelpSidebar>
      </div>

      <CalculatorContent data={camSelectorContent} title="Camshaft Selection" />
    </div>
  );
}
