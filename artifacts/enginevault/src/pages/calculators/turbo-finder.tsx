import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────

type FuelType = "pump93" | "pump91" | "e85" | "race" | "methanol" | "diesel";
type Application = "daily" | "street-strip" | "weekend" | "drag" | "road-course" | "tow";
type IntercoolerType = "none" | "air-to-air" | "air-to-water";

// ── Fuel data ───────────────────────────────────────────────────────────────────

interface FuelDef {
  label: string;
  short: string;
  stoichAfr: number;
  powerAfr: number;
  bsfc: number;        // lb/hp-hr for turbo applications
  bsfcNa: number;      // lb/hp-hr for naturally aspirated (lower — better thermal efficiency)
  powerAfrNa: number;  // NA power AFR (leaner than turbo — less detonation risk)
  maxSafeBoost: number; // rough PSI limit on pump-type fuel, 0 = no practical limit
}

const FUELS: Record<FuelType, FuelDef> = {
  "pump93":   { label: "Pump Gas (93 octane)",  short: "93 Pump",   stoichAfr: 14.7,  powerAfr: 11.5, bsfc: 0.58, bsfcNa: 0.47, powerAfrNa: 12.8, maxSafeBoost: 18 },
  "pump91":   { label: "Pump Gas (91 octane)",  short: "91 Pump",   stoichAfr: 14.7,  powerAfr: 11.5, bsfc: 0.58, bsfcNa: 0.47, powerAfrNa: 12.8, maxSafeBoost: 14 },
  "e85":      { label: "E85 (flex fuel)",       short: "E85",       stoichAfr: 9.76,  powerAfr: 7.5,  bsfc: 0.85, bsfcNa: 0.68, powerAfrNa: 8.2,  maxSafeBoost: 30 },
  "race":     { label: "Race Gas (100+ octane)", short: "Race Gas", stoichAfr: 14.7,  powerAfr: 12.0, bsfc: 0.55, bsfcNa: 0.45, powerAfrNa: 12.8, maxSafeBoost: 25 },
  "methanol": { label: "Methanol (M100)",       short: "Methanol",  stoichAfr: 6.47,  powerAfr: 4.5,  bsfc: 1.80, bsfcNa: 1.45, powerAfrNa: 5.0,  maxSafeBoost: 40 },
  "diesel":   { label: "Diesel (#2)",           short: "Diesel",    stoichAfr: 14.6,  powerAfr: 22.0, bsfc: 0.40, bsfcNa: 0.36, powerAfrNa: 25.0, maxSafeBoost: 50 },
};

// ── Application data ────────────────────────────────────────────────────────────

interface AppDef {
  label: string;
  short: string;
  arBias: "small" | "mid" | "large";
  arDesc: string;
  spoolPriority: "high" | "medium" | "low";
}

const APPLICATIONS: Record<Application, AppDef> = {
  "daily":       { label: "Daily Driver",              short: "Daily",       arBias: "small",  arDesc: "Smallest available — fast spool, best drivability", spoolPriority: "high" },
  "street-strip": { label: "Street / Strip",           short: "Street/Strip", arBias: "mid",   arDesc: "Mid-range A/R — good spool with solid top-end",    spoolPriority: "medium" },
  "weekend":     { label: "Weekend Warrior",           short: "Weekend",     arBias: "mid",    arDesc: "Mid-range A/R — balanced power band",               spoolPriority: "medium" },
  "drag":        { label: "Drag Racing",               short: "Drag",        arBias: "large",  arDesc: "Largest available — max top-end, lag acceptable",   spoolPriority: "low" },
  "road-course": { label: "Road Course / Autocross",   short: "Road Course", arBias: "small",  arDesc: "Smaller A/R — fast spool for on/off throttle",      spoolPriority: "high" },
  "tow":         { label: "Towing / Work Truck",       short: "Tow/Work",    arBias: "small",  arDesc: "Small A/R — low-RPM torque for loaded driving",     spoolPriority: "high" },
};

// ── Turbo size database ─────────────────────────────────────────────────────────

interface TurboDef {
  name: string;
  frame: string;
  inducer: number;    // mm compressor inducer
  minHp: number;
  maxHp: number;
  minFlow: number;    // lb/min
  maxFlow: number;
  bearing: "ball" | "journal" | "both";
  arOptions: string;
  tier: "budget" | "mid" | "high"; // price tier
  approxPrice: string;             // display only
}

const TURBO_DB: TurboDef[] = [
  // Budget / entry-level — popular with first-time turbo builders
  { name: "T3/T4 .63 A/R (generic)", frame: "T3/T4",  inducer: 50, minHp: 200,  maxHp: 400,  minFlow: 20,  maxFlow: 40,  bearing: "journal", arOptions: "0.48 / 0.63",            tier: "budget", approxPrice: "$150–300" },
  { name: "T04E .57 trim (generic)",  frame: "T04E",   inducer: 50, minHp: 200,  maxHp: 380,  minFlow: 20,  maxFlow: 38,  bearing: "journal", arOptions: "0.57 / 0.63",            tier: "budget", approxPrice: "$120–250" },
  { name: "GT35 .82 A/R (generic)",   frame: "GT35",   inducer: 60, minHp: 350,  maxHp: 600,  minFlow: 35,  maxFlow: 60,  bearing: "journal", arOptions: "0.63 / 0.82",            tier: "budget", approxPrice: "$200–400" },
  { name: "GT45 1.05 A/R (generic)",  frame: "GT45",   inducer: 72, minHp: 500,  maxHp: 800,  minFlow: 50,  maxFlow: 80,  bearing: "journal", arOptions: "0.82 / 1.05",            tier: "budget", approxPrice: "$250–450" },
  { name: "CXRacing T76 (budget)",    frame: "T76",    inducer: 76, minHp: 600,  maxHp: 1000, minFlow: 60,  maxFlow: 100, bearing: "journal", arOptions: "0.81 / 0.96",            tier: "budget", approxPrice: "$300–500" },
  // Small frame — 4 cylinder / small displacement
  { name: "Garrett G25-550",     frame: "G25",   inducer: 48, minHp: 250,  maxHp: 550,  minFlow: 25,  maxFlow: 55,  bearing: "ball",    arOptions: "0.49 / 0.72 / 0.92",             tier: "mid",    approxPrice: "$900–1,200" },
  { name: "Garrett G25-660",     frame: "G25",   inducer: 48, minHp: 300,  maxHp: 660,  minFlow: 30,  maxFlow: 66,  bearing: "ball",    arOptions: "0.49 / 0.72 / 0.92",             tier: "mid",    approxPrice: "$900–1,200" },
  { name: "BorgWarner EFR 6258", frame: "EFR",   inducer: 49, minHp: 250,  maxHp: 500,  minFlow: 25,  maxFlow: 50,  bearing: "ball",    arOptions: "0.64 / 0.80",                    tier: "high",   approxPrice: "$1,400–1,800" },
  { name: "Precision 5431",      frame: "53mm",  inducer: 53, minHp: 350,  maxHp: 575,  minFlow: 35,  maxFlow: 58,  bearing: "both",    arOptions: "0.48 / 0.63 / 0.82",             tier: "mid",    approxPrice: "$800–1,100" },
  // Mid frame — 6 cylinder / small V8
  { name: "Garrett G30-660",     frame: "G30",   inducer: 54, minHp: 350,  maxHp: 660,  minFlow: 35,  maxFlow: 66,  bearing: "ball",    arOptions: "0.61 / 0.83 / 1.01",             tier: "mid",    approxPrice: "$1,100–1,500" },
  { name: "Garrett G30-770",     frame: "G30",   inducer: 54, minHp: 400,  maxHp: 770,  minFlow: 40,  maxFlow: 77,  bearing: "ball",    arOptions: "0.61 / 0.83 / 1.01",             tier: "mid",    approxPrice: "$1,100–1,500" },
  { name: "Garrett G30-900",     frame: "G30",   inducer: 58, minHp: 500,  maxHp: 900,  minFlow: 50,  maxFlow: 90,  bearing: "ball",    arOptions: "0.61 / 0.83 / 1.01",             tier: "mid",    approxPrice: "$1,200–1,600" },
  { name: "BorgWarner EFR 7163", frame: "EFR",   inducer: 57, minHp: 350,  maxHp: 650,  minFlow: 35,  maxFlow: 65,  bearing: "ball",    arOptions: "0.80 / 0.92",                    tier: "high",   approxPrice: "$1,600–2,000" },
  { name: "BorgWarner EFR 7670", frame: "EFR",   inducer: 62, minHp: 450,  maxHp: 800,  minFlow: 45,  maxFlow: 80,  bearing: "ball",    arOptions: "0.83 / 0.92 / 1.05",             tier: "high",   approxPrice: "$1,800–2,200" },
  { name: "Precision 6266",      frame: "62mm",  inducer: 62, minHp: 450,  maxHp: 750,  minFlow: 45,  maxFlow: 75,  bearing: "both",    arOptions: "0.63 / 0.82 / 1.00",             tier: "mid",    approxPrice: "$900–1,300" },
  { name: "Precision 6466",      frame: "64mm",  inducer: 64, minHp: 500,  maxHp: 850,  minFlow: 50,  maxFlow: 85,  bearing: "both",    arOptions: "0.63 / 0.82 / 1.00",             tier: "mid",    approxPrice: "$1,000–1,400" },
  // Large frame — V8
  { name: "Garrett G35-900",     frame: "G35",   inducer: 62, minHp: 550,  maxHp: 900,  minFlow: 55,  maxFlow: 90,  bearing: "ball",    arOptions: "0.61 / 0.83 / 1.01 / 1.21",      tier: "mid",    approxPrice: "$1,300–1,700" },
  { name: "Garrett G35-1050",    frame: "G35",   inducer: 68, minHp: 600,  maxHp: 1050, minFlow: 60,  maxFlow: 105, bearing: "ball",    arOptions: "0.61 / 0.83 / 1.01 / 1.21",      tier: "mid",    approxPrice: "$1,400–1,800" },
  { name: "BorgWarner EFR 8374", frame: "EFR",   inducer: 67, minHp: 550,  maxHp: 1000, minFlow: 55,  maxFlow: 100, bearing: "ball",    arOptions: "0.83 / 0.92 / 1.05",             tier: "high",   approxPrice: "$2,000–2,500" },
  { name: "Precision 6776",      frame: "67mm",  inducer: 67, minHp: 600,  maxHp: 1000, minFlow: 60,  maxFlow: 100, bearing: "both",    arOptions: "0.82 / 0.96 / 1.15",             tier: "mid",    approxPrice: "$1,100–1,500" },
  { name: "Precision 7175",      frame: "71mm",  inducer: 71, minHp: 700,  maxHp: 1150, minFlow: 70,  maxFlow: 115, bearing: "both",    arOptions: "0.82 / 0.96 / 1.15",             tier: "mid",    approxPrice: "$1,200–1,600" },
  // Big frame — high HP
  { name: "Garrett G40-1150",    frame: "G40",   inducer: 71, minHp: 750,  maxHp: 1150, minFlow: 75,  maxFlow: 115, bearing: "ball",    arOptions: "0.83 / 1.01 / 1.15 / 1.28",      tier: "high",   approxPrice: "$1,800–2,300" },
  { name: "Garrett G42-1200",    frame: "G42",   inducer: 73, minHp: 800,  maxHp: 1200, minFlow: 80,  maxFlow: 120, bearing: "ball",    arOptions: "1.01 / 1.15 / 1.28 / 1.44",      tier: "high",   approxPrice: "$2,000–2,500" },
  { name: "Garrett G42-1450",    frame: "G42",   inducer: 79, minHp: 900,  maxHp: 1450, minFlow: 90,  maxFlow: 145, bearing: "ball",    arOptions: "1.01 / 1.15 / 1.28 / 1.44",      tier: "high",   approxPrice: "$2,200–2,800" },
  { name: "Precision 7675",      frame: "76mm",  inducer: 76, minHp: 900,  maxHp: 1400, minFlow: 90,  maxFlow: 140, bearing: "both",    arOptions: "0.96 / 1.15 / 1.32",             tier: "mid",    approxPrice: "$1,400–1,800" },
  { name: "Precision 8085",      frame: "80mm",  inducer: 80, minHp: 1050, maxHp: 1600, minFlow: 105, maxFlow: 160, bearing: "both",    arOptions: "1.00 / 1.15 / 1.32",             tier: "high",   approxPrice: "$1,600–2,100" },
  // Monster — drag / pro mod
  { name: "Garrett G45-1500",    frame: "G45",   inducer: 80, minHp: 1000, maxHp: 1500, minFlow: 100, maxFlow: 150, bearing: "ball",    arOptions: "1.15 / 1.28 / 1.44",             tier: "high",   approxPrice: "$2,500–3,200" },
  { name: "Garrett G45-1580",    frame: "G45",   inducer: 88, minHp: 1100, maxHp: 1580, minFlow: 110, maxFlow: 158, bearing: "ball",    arOptions: "1.15 / 1.28 / 1.44",             tier: "high",   approxPrice: "$2,800–3,500" },
  { name: "Precision 8891",      frame: "88mm",  inducer: 88, minHp: 1300, maxHp: 2000, minFlow: 130, maxFlow: 200, bearing: "both",    arOptions: "1.15 / 1.32 / 1.53",             tier: "high",   approxPrice: "$2,000–2,800" },
  { name: "Precision 9405",      frame: "94mm",  inducer: 94, minHp: 1600, maxHp: 2500, minFlow: 160, maxFlow: 250, bearing: "journal", arOptions: "1.32 / 1.53 / 1.78",             tier: "high",   approxPrice: "$2,500–3,500" },
];

// ── VE estimation ──────────────────────────────────────────────────────────────
// VE depends on head design quality more than valve count alone. A modern LS
// (2-valve, 346ci, 8-cyl = 43ci/cyl) achieves ~87-95% VE, while a smog-era
// SBC 350 (also 2-valve, 44ci/cyl) only manages ~68%. We use valve count as
// the primary factor and displacement-per-cylinder as a secondary adjustment —
// this captures the old-vs-modern pushrod gap without requiring the user to
// know their VE.

const VE_BASE: Record<string, number> = {
  "2": 0.80,   // baseline for 2-valve (adjusted below by ci/cyl and RPM)
  "3": 0.88,
  "4": 0.92,
  "5": 0.95,
};

function estimateVe(valvesPerCyl: number, displacementCi: number, cylinders: number, peakRpm: number): number {
  const base = VE_BASE[String(valvesPerCyl)] ?? 0.82;
  if (valvesPerCyl > 2) return base; // multi-valve engines are already well-characterized

  // For 2-valve engines: adjust based on how modern the engine likely is.
  // Modern pushrod engines (LS, LT, Gen V Hemi) make peak power at higher RPM
  // and have much better port designs than classic pushrod engines.
  // Peak HP RPM is a strong proxy: stock SBC 350 peaks at ~4400, LS1 at ~5600.
  // Higher RPM capability = better breathing = higher VE.
  const rpmFactor = Math.min(1, Math.max(0, (peakRpm - 4000) / 3000)); // 0 at 4000, 1 at 7000
  const veAdjust = rpmFactor * 0.12; // up to +12% VE for high-revving 2-valve engines

  return Math.min(0.96, base + veAdjust);
}

// Keep a simple lookup for backward compatibility with code that reads VE_DEFAULTS
const VE_DEFAULTS: Record<string, number> = VE_BASE;

// ── Altitude pressure lookup ────────────────────────────────────────────────────

function getAtmosphericPressure(altFt: number): number {
  return 14.696 * Math.pow(1 - 0.0000068753 * altFt, 5.2559);
}

// ── Calculation engine ──────────────────────────────────────────────────────────

interface CalcResults {
  airflowLbMin: number;
  airflowPerTurbo: number;
  airflowCfm: number;
  boostPsi: number;
  pressureRatio: number;
  compressorOutletTempF: number;
  postIcTempF: number;
  densityRatio: number;
  injectorSizeCc: number;
  injectorSizeLbHr: number;
  fuelFlowLbHr: number;
  matchedTurbos: TurboDef[];
  warnings: string[];
  atmosPsi: number;
  naAirflowCfm: number;
  naHpEstimate: number;      // gross — engine breathing potential, no accessory losses
  naHpNet: number;            // net — after typical accessory and friction deductions
  accessoryLoss: number;      // HP deducted for accessories
  effectiveVe: number;
  headFlowUsed: boolean;
  camDurationUsed: boolean;
  exhaustFlowLbMin: number;
}

function calculate(
  targetHp: number,
  displacementCi: number,
  numTurbos: number,
  fuel: FuelType,
  app: Application,
  peakRpm: number,
  intercooler: IntercoolerType,
  altitudeFt: number,
  ambientTempF: number,
  cylinders: number,
  valvesPerCyl: number,
  customVe: number | null,
  customBsfc: number | null,
  customAfr: number | null,
  headFlowCfm: number | null,
  headTestPressure: number | null,
  exhaustHeaderSize: number | null,
  currentNaHp: number | null,
  camDuration050: number | null,
  compressionRatio: number | null,
): CalcResults {
  const f = FUELS[fuel];
  const warnings: string[] = [];

  // Resolve overridable values
  const bsfc = customBsfc ?? f.bsfc;
  const afr = customAfr ?? f.powerAfr;
  let ve = customVe ?? estimateVe(valvesPerCyl, displacementCi, cylinders, peakRpm);

  // Cam duration adjusts VE: a bigger cam breathes better at peak RPM
  if (camDuration050 && camDuration050 > 0 && !customVe) {
    // Piecewise: stock 190° = 0%, mild 210° = +2%, mod 224° = +5%, hot 236° = +7%, race 252° = +10%
    let camVeBonus = 0;
    if (camDuration050 <= 190) camVeBonus = 0;
    else if (camDuration050 <= 210) camVeBonus = ((camDuration050 - 190) / 20) * 0.02;
    else if (camDuration050 <= 224) camVeBonus = 0.02 + ((camDuration050 - 210) / 14) * 0.03;
    else if (camDuration050 <= 236) camVeBonus = 0.05 + ((camDuration050 - 224) / 12) * 0.02;
    else if (camDuration050 <= 252) camVeBonus = 0.07 + ((camDuration050 - 236) / 16) * 0.03;
    else camVeBonus = 0.10;
    ve = Math.min(0.98, ve + camVeBonus);
  }

  // Step 1: Required airflow (Garrett formula)
  const airflowLbMin = (targetHp * bsfc * afr) / 60;
  const airflowPerTurbo = airflowLbMin / numTurbos;
  const airflowCfm = airflowLbMin / 0.0765; // lb/min to CFM at standard density

  // Step 2: Atmospheric pressure at altitude
  const atmosPsi = getAtmosphericPressure(altitudeFt);

  // Step 3: Estimate NA airflow capacity
  // If user provided head flow data, derive VE from it — much more accurate
  let headFlowUsed = false;
  let naCfm: number;

  if (headFlowCfm && headFlowCfm > 0) {
    headFlowUsed = true;
    // Correct flow bench CFM to actual test pressure (most benches test at 28" H2O)
    const testP = headTestPressure ?? 28;
    const correctedFlow = headFlowCfm * Math.sqrt(28 / testP); // normalize to 28" H2O

    // Engine CFM from head flow:
    // At peak RPM each intake valve opens once every 2 revolutions (4-stroke).
    // Theoretical max CFM = headFlow × (RPM / 2) / (CFM_bench_test_duration)
    // Simpler Vizard method: Engine CFM ≈ headFlow × cylinders × RPM / (testCyclesPerMin)
    // Industry standard: CFM_engine = (headFlow × cylinders × RPM) / 3456
    // But headFlow already accounts for port efficiency, so we can derive VE:
    // Max possible CFM at 100% VE = (CID × RPM) / 3456
    // headFlow per cyl in CFM = correctedFlow (this is per port at test pressure)
    // At peak RPM, each port flows for roughly half the cycle time.
    // Real engine airflow ≈ correctedFlow × (RPM / 1750) × 0.5 per cylinder
    // Or use the Superflow/Audie Technology correlation:
    // Engine CFM ≈ correctedFlow × cylinders × 0.257 × (RPM / 5252)^0.7
    //
    // Most accurate: derive VE from the head's flow capacity vs displacement demand
    // VE_derived = (headFlow_cfm × cylinders) / ((CID × RPM) / 3456) × correction
    // The correction is typically 0.85–0.95 depending on cam timing and RPM match.
    // We use 0.90 as a realistic street/performance cam correction.
    const maxTheoreticalCfm = (displacementCi * peakRpm) / 3456;
    const headCapacityCfm = correctedFlow * cylinders;
    // The head can physically flow headCapacityCfm at steady state, but the engine
    // only has the valve open ~40-50% of the cycle. Apply Mach index correction.
    const machIndexCorrection = 0.90;
    const derivedVe = Math.min(0.99, (headCapacityCfm / maxTheoreticalCfm) * machIndexCorrection);

    if (!customVe) {
      ve = derivedVe;
    }

    naCfm = maxTheoreticalCfm * ve;
  } else if (currentNaHp && currentNaHp > 0) {
    // User knows their current NA HP — back-calculate NA airflow from it
    const naLbMinFromHp = (currentNaHp * bsfc * afr) / 60;
    naCfm = naLbMinFromHp / 0.0765;
    // Also derive VE from this
    const maxTheoreticalCfm = (displacementCi * peakRpm) / 3456;
    if (!customVe && maxTheoreticalCfm > 0) {
      ve = Math.min(0.99, naCfm / maxTheoreticalCfm);
    }
  } else {
    // Default: estimate from displacement, RPM, and VE
    naCfm = (displacementCi * peakRpm * ve) / 3456;
  }

  const naLbMin = naCfm * 0.0765;
  // NA HP estimate for display only — use NA-specific BSFC and AFR which are
  // more accurate for naturally aspirated engines (lower BSFC = better thermal
  // efficiency without boost, leaner AFR = less detonation risk without boost).
  // The turbo sizing math above uses turbo BSFC/AFR for airflow calculations,
  // which is correct — this is just for the "Engine Baseline" display.
  const bsfcNa = customBsfc ?? f.bsfcNa;
  const afrNa = customAfr ?? f.powerAfrNa;
  const naHp = naLbMin / (bsfcNa * afrNa / 60);

  // Net HP: deduct typical accessory and friction losses.
  // Real engines lose power to the water pump, oil pump, alternator, power steering,
  // A/C compressor, and internal friction. This varies by era and equipment:
  //   - Modern engines (LS, Coyote, Hemi): ~4-6% loss (electric fans, efficient accessories)
  //   - Classic engines (SBC, BBC, SBF): ~7-9% loss (mechanical fan, heavy accessories)
  // We use peak RPM as a proxy for engine era (modern = higher peak RPM).
  // These are conservative estimates — the VE and BSFC calibration already
  // accounts for most real-world losses, so this is a small additional deduction.
  const rpmProxy = Math.min(1, Math.max(0, (peakRpm - 4000) / 3000));
  const accessoryPct = 0.09 - rpmProxy * 0.05; // 9% at 4000 RPM, 4% at 7000 RPM
  const accessoryLoss = naHp * accessoryPct;
  const naHpNet = naHp - accessoryLoss;

  // Boost required: rearrange MAP relationship
  // Target MAP = atmosPsi * (airflowLbMin / naLbMin)
  const targetMap = atmosPsi * (airflowLbMin / naLbMin);
  const boostPsi = Math.max(0, targetMap - atmosPsi);

  // Step 4: Pressure ratio (include typical system losses)
  const inletLoss = 1.0;  // PSI filter/piping
  const pipingLoss = 2.0; // PSI charge piping
  const pr = (atmosPsi + boostPsi + pipingLoss) / (atmosPsi - inletLoss);

  // Step 5: Compressor outlet temperature
  const tInR = ambientTempF + 459.67; // Rankine
  const compEff = 0.72; // Assume typical 72% compressor efficiency
  const tOutIdealR = tInR * Math.pow(pr, 0.283);
  const tempRiseIdeal = tOutIdealR - tInR;
  const tempRiseActual = tempRiseIdeal / compEff;
  const tOutR = tInR + tempRiseActual;
  const compressorOutletTempF = tOutR - 459.67;

  // Step 6: Post-intercooler temperature
  let icEff = 0;
  if (intercooler === "air-to-air") icEff = 0.70;
  if (intercooler === "air-to-water") icEff = 0.85;
  const postIcTempF = compressorOutletTempF - icEff * (compressorOutletTempF - ambientTempF);

  // Density ratio
  const tManifoldR = postIcTempF + 459.67;
  const densityRatio = pr / (tOutR / tInR);

  // Step 7: Fuel system sizing
  const fuelFlowLbHr = targetHp * bsfc;
  const injSizeLbHr = fuelFlowLbHr / (cylinders * 0.80); // 80% duty cycle
  const injSizeCc = injSizeLbHr * 10.5; // approximate conversion for gasoline density

  // Step 8: Match turbos (budget filter applied later in UI)
  const matched = TURBO_DB.filter((t) => {
    const flow = airflowPerTurbo;
    // Turbo should handle the required flow — allow some margin
    return flow >= t.minFlow * 0.85 && flow <= t.maxFlow * 1.05;
  }).sort((a, b) => {
    // Prefer turbos where the operating point is centered in the map
    const midA = (a.minFlow + a.maxFlow) / 2;
    const midB = (b.minFlow + b.maxFlow) / 2;
    return Math.abs(airflowPerTurbo - midA) - Math.abs(airflowPerTurbo - midB);
  });

  // Step 9: Warnings
  if (f.maxSafeBoost > 0 && boostPsi > f.maxSafeBoost) {
    warnings.push(`${boostPsi.toFixed(0)} PSI on ${f.short} is aggressive. Consider ${fuel === "pump91" ? "93 octane, " : ""}E85 or race fuel for better detonation resistance.`);
  }
  if (pr > 3.5) {
    warnings.push(`Pressure ratio of ${pr.toFixed(2)} is very high. Ensure your turbo's compressor map supports this without crossing the surge line.`);
  }
  if (compressorOutletTempF > 400 && intercooler === "none") {
    warnings.push(`Compressor outlet temperature of ${compressorOutletTempF.toFixed(0)}°F without intercooling is dangerously hot. An intercooler is strongly recommended.`);
  }
  if (postIcTempF > 160 && intercooler !== "none") {
    warnings.push(`Post-intercooler temp of ${postIcTempF.toFixed(0)}°F is warm. Consider a larger intercooler or air-to-water upgrade.`);
  }
  if (targetHp > 600 && numTurbos === 1 && displacementCi < 200) {
    warnings.push("A single turbo making this power on a small displacement engine will have significant lag. Consider twin turbos or compound staging.");
  }
  if (altitudeFt > 4000) {
    warnings.push(`At ${altitudeFt.toLocaleString()} ft elevation, the turbo works harder to compensate for thin air. Your PR is ${pr.toFixed(2)} vs. ${((atmosPsi + boostPsi + pipingLoss) / (14.7 - inletLoss)).toFixed(2)} at sea level.`);
  }
  if (matched.length === 0) {
    warnings.push("No turbos in the database match this airflow requirement. Your target may require a very specialized unit — consult a turbo manufacturer directly.");
  }
  if (peakRpm > 8000) {
    warnings.push("At this RPM, exhaust gas velocity is very high. Ensure the turbine housing can handle the exhaust flow without excessive backpressure.");
  }

  // Exhaust flow estimate (for header/downpipe sizing)
  // Exhaust mass = intake air + fuel
  const exhaustFlowLbMin = airflowLbMin * (1 + 1 / afr);

  // Exhaust header sizing warnings
  if (exhaustHeaderSize && exhaustHeaderSize > 0) {
    // Primary tube area in sq inches
    const tubeArea = Math.PI * Math.pow(exhaustHeaderSize / 2, 2);
    // Required area per cylinder ≈ exhaust flow / cylinders / velocity
    // Typical exhaust velocity target: 200–300 ft/s for turbo manifolds
    // Flow per cyl in CFM ≈ (exhaustFlowLbMin / 0.0455) / cylinders (hot exhaust is ~1.7× less dense)
    const exhaustCfmPerCyl = (exhaustFlowLbMin / 0.0455) / cylinders;
    // Required area for 250 ft/s velocity = CFM / (velocity × 60) × 144
    const requiredArea = (exhaustCfmPerCyl / (250 * 60)) * 144;
    if (tubeArea < requiredArea * 0.80) {
      warnings.push(`Your ${exhaustHeaderSize}" exhaust primaries may be restrictive for this power level. Consider ${(Math.sqrt(requiredArea / Math.PI) * 2).toFixed(3)}" or larger primaries.`);
    }
  }

  if (headFlowUsed && ve > 0.95) {
    warnings.push(`Derived VE of ${(ve * 100).toFixed(0)}% from head flow data is very high. Verify your flow bench number is per-port (not combined) and at the correct test pressure.`);
  }

  // Compression ratio vs boost safety
  if (compressionRatio && compressionRatio > 0 && boostPsi > 0) {
    // Safe boost limits (PSI) by CR and fuel type
    const safeBoostTable: Record<string, [number, number][]> = {
      // [CR threshold, max safe PSI] pairs — interpolated
      "pump93":   [[8.0, 22], [8.5, 20], [9.0, 16], [9.5, 14], [10.0, 10], [10.5, 8], [11.0, 5], [12.0, 3]],
      "pump91":   [[8.0, 18], [8.5, 16], [9.0, 12], [9.5, 10], [10.0, 7],  [10.5, 6], [11.0, 3], [12.0, 2]],
      "e85":      [[8.0, 35], [8.5, 30], [9.0, 28], [9.5, 25], [10.0, 20], [10.5, 18], [11.0, 12], [12.0, 8]],
      "race":     [[8.0, 30], [8.5, 28], [9.0, 25], [9.5, 22], [10.0, 18], [10.5, 15], [11.0, 10], [12.0, 7]],
      "methanol": [[8.0, 45], [8.5, 40], [9.0, 38], [9.5, 35], [10.0, 30], [10.5, 25], [11.0, 20], [12.0, 15]],
      "diesel":   [[15.0, 50], [16.0, 45], [17.0, 40], [18.0, 35], [20.0, 25]],
    };
    const table = safeBoostTable[fuel] ?? safeBoostTable["pump93"];
    // Interpolate safe boost for this CR
    let safeBoost = table[table.length - 1][1];
    for (let i = 0; i < table.length - 1; i++) {
      const [cr0, b0] = table[i], [cr1, b1] = table[i + 1];
      if (compressionRatio >= cr0 && compressionRatio <= cr1) {
        const t = (compressionRatio - cr0) / (cr1 - cr0);
        safeBoost = b0 + t * (b1 - b0);
        break;
      }
      if (compressionRatio < cr0) { safeBoost = b0; break; }
    }
    if (boostPsi > safeBoost) {
      warnings.push(`At ${compressionRatio.toFixed(1)}:1 compression on ${f.short}, safe boost is ~${safeBoost.toFixed(0)} PSI. Your target requires ${boostPsi.toFixed(0)} PSI — risk of detonation. Lower compression, switch to ${fuel.startsWith("pump") ? "E85 or race fuel" : "a higher-octane fuel"}, or reduce your HP target.`);
    }
  }

  return {
    airflowLbMin,
    airflowPerTurbo,
    airflowCfm,
    boostPsi,
    pressureRatio: pr,
    compressorOutletTempF,
    postIcTempF,
    densityRatio,
    injectorSizeCc: injSizeCc,
    injectorSizeLbHr: injSizeLbHr,
    fuelFlowLbHr,
    matchedTurbos: matched,
    warnings,
    atmosPsi,
    naAirflowCfm: naCfm,
    naHpEstimate: naHp,
    naHpNet,
    accessoryLoss,
    effectiveVe: ve,
    headFlowUsed,
    camDurationUsed: !!(camDuration050 && camDuration050 > 0),
    exhaustFlowLbMin,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(val: number, d: number): string {
  return val.toFixed(d);
}

function getArRecommendation(app: Application, displacement: number): string {
  const a = APPLICATIONS[app];
  if (displacement < 200) {
    if (a.arBias === "small") return "0.48 – 0.63";
    if (a.arBias === "mid") return "0.63 – 0.82";
    return "0.82 – 1.00";
  }
  if (displacement < 400) {
    if (a.arBias === "small") return "0.63 – 0.82";
    if (a.arBias === "mid") return "0.82 – 1.01";
    return "1.01 – 1.21";
  }
  // Big displacement
  if (a.arBias === "small") return "0.82 – 1.01";
  if (a.arBias === "mid") return "1.01 – 1.21";
  return "1.21 – 1.44";
}

function getWastegateSize(hp: number): string {
  if (hp < 400) return "38mm";
  if (hp < 700) return "44mm";
  if (hp < 1000) return "44-46mm";
  return "50mm+ or twin 44mm";
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function TurboFinderCalculator() {
  // Essential inputs
  const [targetHp, setTargetHp] = useState("500");
  const [displacement, setDisplacement] = useState("350");
  const [dispUnit, setDispUnit] = useState<"ci" | "liters">("ci");
  const [numTurbos, setNumTurbos] = useState("1");
  const [fuel, setFuel] = useState<FuelType>("pump93");
  const [application, setApplication] = useState<Application>("street-strip");
  const [peakRpm, setPeakRpm] = useState("6000");
  const [intercooler, setIntercooler] = useState<IntercoolerType>("air-to-air");
  const [altitude, setAltitude] = useState("0");
  const [ambientTemp, setAmbientTemp] = useState("80");
  const [cylinders, setCylinders] = useState("8");
  const [valvesPerCyl, setValvesPerCyl] = useState("2");

  // Known engine data (optional — improves accuracy)
  const [headFlowStr, setHeadFlowStr] = useState("");
  const [headTestPressureStr, setHeadTestPressureStr] = useState("28");
  const [exhaustHeaderStr, setExhaustHeaderStr] = useState("");
  const [currentNaHpStr, setCurrentNaHpStr] = useState("");
  const [camDuration050Str, setCamDuration050Str] = useState("");
  const [compressionRatioStr, setCompressionRatioStr] = useState("");
  const [knownDataOpen, setKnownDataOpen] = useState(false);

  // Mode: "target" = I want X HP, what turbo? | "explore" = I have this setup, what fits?
  const [mode, setMode] = useState<"target" | "explore">("target");
  const [boostTarget, setBoostTarget] = useState("8");

  // Budget filter
  const [maxBudget, setMaxBudget] = useState<"any" | "budget" | "mid" | "high">("any");

  // Advanced overrides
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customVeStr, setCustomVeStr] = useState("");
  const [customBsfcStr, setCustomBsfcStr] = useState("");
  const [customAfrStr, setCustomAfrStr] = useState("");

  // Collapsible sections
  const [formulasOpen, setFormulasOpen] = useState(false);
  const [fuelSystemOpen, setFuelSystemOpen] = useState(false);
  const [turboSizeRefOpen, setTurboSizeRefOpen] = useState(false);
  const [naDisplayMode, setNaDisplayMode] = useState<"net" | "gross">("net");

  // Parse inputs
  const disp = parseFloat(displacement) || 0;
  const dispCi = dispUnit === "liters" ? disp * 61.024 : disp;
  const turbos = parseInt(numTurbos) || 1;
  const rpm = parseInt(peakRpm) || 6000;
  const alt = parseInt(altitude) || 0;
  const temp = parseFloat(ambientTemp) || 80;
  const cyl = parseInt(cylinders) || 8;
  const vpc = parseInt(valvesPerCyl) || 2;
  const customVe = customVeStr ? parseFloat(customVeStr) / 100 : null;
  const customBsfc = customBsfcStr ? parseFloat(customBsfcStr) : null;
  const customAfr = customAfrStr ? parseFloat(customAfrStr) : null;
  const headFlowCfm = headFlowStr ? parseFloat(headFlowStr) : null;
  const headTestPressure = headTestPressureStr ? parseFloat(headTestPressureStr) : null;
  const exhaustHeader = exhaustHeaderStr ? parseFloat(exhaustHeaderStr) : null;
  const currentNaHp = currentNaHpStr ? parseFloat(currentNaHpStr) : null;
  const camDuration050 = camDuration050Str ? parseFloat(camDuration050Str) : null;
  const compressionRatio = compressionRatioStr ? parseFloat(compressionRatioStr) : null;

  // In "explore" mode, derive HP target from displacement + boost target
  let hp: number;
  if (mode === "explore") {
    // Estimate HP from displacement, boost, and VE
    const veEst = customVe ?? estimateVe(vpc, dispCi, cyl, rpm);
    const boost = parseFloat(boostTarget) || 8;
    const atmosEst = getAtmosphericPressure(alt);
    // NA airflow
    const naCfmEst = (dispCi * rpm * veEst) / 3456;
    const naLbMinEst = naCfmEst * 0.0765;
    // Boosted airflow = NA × (MAP / atmos)
    const mapEst = atmosEst + boost;
    const boostedLbMin = naLbMinEst * (mapEst / atmosEst);
    // HP = (airflow × 60) / (BSFC × AFR)
    const bsfcEst = customBsfc ?? FUELS[fuel].bsfc;
    const afrEst = customAfr ?? FUELS[fuel].powerAfr;
    hp = (boostedLbMin * 60) / (bsfcEst * afrEst);
  } else {
    hp = parseFloat(targetHp) || 0;
  }

  // Calculate
  const valid = hp > 0 && dispCi > 0 && rpm > 0;
  const results = valid
    ? calculate(hp, dispCi, turbos, fuel, application, rpm, intercooler, alt, temp, cyl, vpc, customVe, customBsfc, customAfr, headFlowCfm, headTestPressure, exhaustHeader, currentNaHp, camDuration050, compressionRatio)
    : null;

  const f = FUELS[fuel];
  const appDef = APPLICATIONS[application];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <SEOHead
        title="Turbo Finder & Sizing Calculator"
        description="Find the right turbocharger for your engine. Calculate required airflow, boost pressure, compressor sizing, fuel system requirements, and get specific turbo recommendations based on proven engineering formulas."
        canonical="/calculators/turbo-finder"
        keywords="turbo size calculator, turbo finder, turbocharger sizing, turbo CFM calculator, boost calculator, turbo selection, compressor map, turbo recommendation, turbo horsepower calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Turbo Finder & Sizing Calculator</h1>
      <p className="text-muted-foreground mb-8">Calculate your airflow requirements and get matched turbocharger recommendations based on Garrett's published sizing methodology.</p>

      {/* Mode Toggle */}
      <div className="flex rounded-lg border overflow-hidden mb-8 max-w-lg">
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "target"
              ? "bg-[#1a1a1a] text-white"
              : "bg-white text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setMode("target")}
        >
          I want a target HP
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "explore"
              ? "bg-[#1a1a1a] text-white"
              : "bg-white text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setMode("explore")}
        >
          What fits my setup?
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ──────────── LEFT COLUMN: INPUTS ──────────── */}
        <div className="space-y-4">

          {/* Engine & Target */}
          <Card>
            <CardHeader>
              <CardTitle>{mode === "target" ? "Engine & Power Target" : "Your Current Setup"}</CardTitle>
              <CardDescription>{mode === "target" ? "Enter your engine specs and horsepower goal." : "Tell us about your engine — we'll show what turbos fit and estimate the power."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "target" ? (
                <div className="space-y-2">
                  <Label>Target Crank Horsepower</Label>
                  <Input type="number" step="10" min="100" value={targetHp} onChange={(e) => setTargetHp(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>How much boost do you want to run? (PSI)</Label>
                  <div className="flex flex-wrap gap-2">
                    {["5", "8", "10", "12", "15", "18", "22"].map((b) => (
                      <button
                        key={b}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          boostTarget === b
                            ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                            : "bg-white text-muted-foreground border-gray-200 hover:border-[#E85D04]"
                        }`}
                        onClick={() => setBoostTarget(b)}
                      >
                        {b} PSI
                      </button>
                    ))}
                  </div>
                  <Input type="number" step="1" min="3" max="50" value={boostTarget} onChange={(e) => setBoostTarget(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Mild street: 5–8 PSI · Street/strip: 10–15 PSI · Serious: 18+ PSI</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Displacement ({dispUnit === "ci" ? "cubic inches" : "liters"})</Label>
                  <Input type="number" step="1" min="50" value={displacement} onChange={(e) => setDisplacement(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Units</Label>
                  <Select value={dispUnit} onValueChange={(v) => {
                    const newUnit = v as "ci" | "liters";
                    const d = parseFloat(displacement) || 0;
                    if (newUnit === "liters" && dispUnit === "ci") setDisplacement((d / 61.024).toFixed(1));
                    if (newUnit === "ci" && dispUnit === "liters") setDisplacement((d * 61.024).toFixed(0));
                    setDispUnit(newUnit);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ci">Cubic Inches</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cylinders</Label>
                  <Select value={cylinders} onValueChange={setCylinders}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["3", "4", "5", "6", "8", "10", "12"].map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valves per Cylinder</Label>
                  <Select value={valvesPerCyl} onValueChange={setValvesPerCyl}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2-valve</SelectItem>
                      <SelectItem value="3">3-valve</SelectItem>
                      <SelectItem value="4">4-valve</SelectItem>
                      <SelectItem value="5">5-valve</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Peak Power RPM</Label>
                <Input type="number" step="100" min="2000" max="12000" value={peakRpm} onChange={(e) => setPeakRpm(e.target.value)} />
                <p className="text-xs text-muted-foreground">The RPM where you expect to make peak power.</p>
              </div>
            </CardContent>
          </Card>

          {/* Turbo Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Turbo Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Number of Turbochargers</Label>
                <div className="flex rounded-lg border overflow-hidden">
                  {["1", "2"].map((n) => (
                    <button
                      key={n}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        numTurbos === n
                          ? "bg-[#1a1a1a] text-white"
                          : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setNumTurbos(n)}
                    >
                      {n === "1" ? "Single Turbo" : "Twin Turbo"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <div className="flex flex-wrap gap-2">
                  {(["pump93", "pump91", "e85", "race", "methanol", "diesel"] as FuelType[]).map((id) => (
                    <button
                      key={id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        fuel === id
                          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                          : "bg-white text-muted-foreground border-gray-200 hover:border-[#E85D04]"
                      }`}
                      onClick={() => setFuel(id)}
                    >
                      {FUELS[id].short}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {f.short}: Stoich {f.stoichAfr}:1 · Power AFR ~{f.powerAfr}:1 · BSFC {f.bsfc} lb/hp-hr
                </p>
              </div>

              <div className="space-y-2">
                <Label>Application</Label>
                <Select value={application} onValueChange={(v) => setApplication(v as Application)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(APPLICATIONS) as [Application, AppDef][]).map(([id, def]) => (
                      <SelectItem key={id} value={id}>{def.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {appDef.arDesc}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Intercooler</Label>
                <Select value={intercooler} onValueChange={(v) => setIntercooler(v as IntercoolerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Intercooler</SelectItem>
                    <SelectItem value="air-to-air">Air-to-Air (FMIC / TMIC)</SelectItem>
                    <SelectItem value="air-to-water">Air-to-Water</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Environment */}
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Altitude (ft)</Label>
                  <Select value={altitude} onValueChange={setAltitude}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["0", "1000", "2000", "3000", "4000", "5000", "6000", "7000", "8000", "9000", "10000"].map((a) => (
                        <SelectItem key={a} value={a}>{parseInt(a).toLocaleString()} ft ({getAtmosphericPressure(parseInt(a)).toFixed(1)} PSI)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ambient Temp (°F)</Label>
                  <Input type="number" step="5" value={ambientTemp} onChange={(e) => setAmbientTemp(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Known Engine Data */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-[#E85D04]/10 font-medium text-sm hover:bg-[#E85D04]/20 transition-colors"
              onClick={() => setKnownDataOpen(!knownDataOpen)}
            >
              <span>I Know My Engine Data (optional — improves accuracy)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${knownDataOpen ? "rotate-180" : ""}`} />
            </button>
            {knownDataOpen && (
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">If you have flow bench data or know your current power, enter it here. This replaces estimated VE with real data for more accurate turbo sizing.</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Intake Head Flow (CFM per port)</Label>
                    <Input type="number" step="1" min="50" max="500" placeholder="e.g. 220" value={headFlowStr} onChange={(e) => setHeadFlowStr(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Peak CFM from a flow bench, per intake port</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Test Pressure (in H2O)</Label>
                    <Select value={headTestPressureStr} onValueChange={setHeadTestPressureStr}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10" H2O</SelectItem>
                        <SelectItem value="20">20" H2O</SelectItem>
                        <SelectItem value="25">25" H2O</SelectItem>
                        <SelectItem value="28">28" H2O (standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Current NA Horsepower (dyno)</Label>
                    <Input type="number" step="5" min="50" placeholder="e.g. 350" value={currentNaHpStr} onChange={(e) => setCurrentNaHpStr(e.target.value)} />
                    <p className="text-xs text-muted-foreground">If you have a dyno pull, enter crank HP</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Exhaust Primary Size (inches)</Label>
                    <Input type="number" step="0.125" min="1" max="3" placeholder='e.g. 1.75"' value={exhaustHeaderStr} onChange={(e) => setExhaustHeaderStr(e.target.value)} />
                    <p className="text-xs text-muted-foreground">OD of your exhaust header primaries</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cam Duration @ .050" (intake)</Label>
                    <Input type="number" step="2" min="170" max="280" placeholder="e.g. 224" value={camDuration050Str} onChange={(e) => setCamDuration050Str(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Duration at .050" lift from your cam card — adjusts VE and spool estimate</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Compression Ratio</Label>
                    <Input type="number" step="0.1" min="7" max="14" placeholder="e.g. 9.5" value={compressionRatioStr} onChange={(e) => setCompressionRatioStr(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Static CR — determines safe boost. <a href="/calculators/compression-ratio" className="text-primary underline">Calculate CR</a>
                    </p>
                  </div>
                </div>

                {/* Show derived data when specs are entered */}
                {results && results.headFlowUsed && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                    Head flow data applied. Derived VE: <strong>{(results.effectiveVe * 100).toFixed(1)}%</strong> · Estimated NA HP: <strong>{results.naHpEstimate.toFixed(0)}</strong> · NA airflow: <strong>{results.naAirflowCfm.toFixed(0)} CFM</strong>
                  </div>
                )}
                {results && !results.headFlowUsed && currentNaHp && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                    Using your dyno data. Derived VE: <strong>{(results.effectiveVe * 100).toFixed(1)}%</strong> · NA airflow: <strong>{results.naAirflowCfm.toFixed(0)} CFM</strong>
                  </div>
                )}
                {results && results.camDurationUsed && !results.headFlowUsed && !currentNaHp && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                    Cam data applied. Adjusted VE: <strong>{(results.effectiveVe * 100).toFixed(1)}%</strong> · This cam favors a turbo that spools by ~{Math.round((rpm - 1500) / 100) * 100} RPM
                  </div>
                )}
                {compressionRatio && results && results.boostPsi > 0 && (
                  <div className={`p-3 rounded-lg border text-sm ${
                    results.warnings.some((w) => w.includes("compression"))
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-green-50 border-green-200 text-green-800"
                  }`}>
                    At <strong>{compressionRatio.toFixed(1)}:1</strong> on {f.short}, your target needs <strong>{results.boostPsi.toFixed(0)} PSI</strong>.
                    {results.warnings.some((w) => w.includes("compression"))
                      ? " — exceeds safe limit for this CR/fuel combo."
                      : " — within safe range for this CR and fuel."
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Overrides */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 font-medium text-sm hover:bg-muted transition-colors"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <span>Advanced Overrides (optional)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </button>
            {advancedOpen && (
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">Leave blank to use defaults for your configuration. Only override if you know your specific values.</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">VE % (default: {((customVe ?? estimateVe(vpc, dispCi, cyl, rpm)) * 100).toFixed(0)}%)</Label>
                    <Input type="number" step="1" min="50" max="100" placeholder={(estimateVe(vpc, dispCi, cyl, rpm) * 100).toFixed(0)} value={customVeStr} onChange={(e) => setCustomVeStr(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">BSFC (default: {f.bsfc})</Label>
                    <Input type="number" step="0.01" min="0.2" max="2.5" placeholder={f.bsfc.toString()} value={customBsfcStr} onChange={(e) => setCustomBsfcStr(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Power AFR (default: {f.powerAfr})</Label>
                    <Input type="number" step="0.1" min="3" max="30" placeholder={f.powerAfr.toString()} value={customAfrStr} onChange={(e) => setCustomAfrStr(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ──────────── RIGHT COLUMN: RESULTS ──────────── */}
        <div className="space-y-4">

          {!valid && (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center text-muted-foreground">
                {mode === "target" ? "Enter your engine specs and power target to see results." : "Enter your engine displacement and desired boost to see what fits."}
              </CardContent>
            </Card>
          )}

          {valid && results && (
            <>
              {/* Explore mode: show estimated power */}
              {mode === "explore" && (
                <Card className="bg-[#E85D04] text-white">
                  <CardContent className="p-5">
                    <p className="text-sm opacity-80">Estimated Power at {boostTarget} PSI on {FUELS[fuel].short}</p>
                    <p className="text-4xl font-bold">{hp.toFixed(0)} HP</p>
                    <p className="text-sm opacity-80 mt-1">
                      Based on {dispCi.toFixed(0)} CI · {rpm.toLocaleString()} RPM · {(results.effectiveVe * 100).toFixed(0)}% VE
                      {results.headFlowUsed ? " (from head flow data)" : currentNaHp ? " (from dyno data)" : ""}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Airflow & Boost */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Airflow & Boost Requirements</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Required Airflow</p>
                      <p className="text-3xl font-bold text-primary">{fmt(results.airflowLbMin, 1)}</p>
                      <p className="text-xs text-gray-500">lb/min total</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Per Turbo</p>
                      <p className="text-3xl font-bold">{fmt(results.airflowPerTurbo, 1)}</p>
                      <p className="text-xs text-gray-500">lb/min each</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Est. Boost Required</p>
                      <p className="text-3xl font-bold">{fmt(results.boostPsi, 1)}</p>
                      <p className="text-xs text-gray-500">PSI gauge</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Pressure Ratio</p>
                      <p className="text-3xl font-bold">{fmt(results.pressureRatio, 2)}</p>
                      <p className="text-xs text-gray-500">P2c / P1c</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Comp. Outlet</p>
                      <p className={`text-lg font-bold ${results.compressorOutletTempF > 400 ? "text-red-400" : "text-white"}`}>{fmt(results.compressorOutletTempF, 0)}°F</p>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">{intercooler === "none" ? "No Intercooler" : "Post-IC Temp"}</p>
                      <p className={`text-lg font-bold ${results.postIcTempF > 160 ? "text-yellow-400" : "text-green-400"}`}>{fmt(results.postIcTempF, 0)}°F</p>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Total CFM</p>
                      <p className="text-lg font-bold">{fmt(results.airflowCfm, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings */}
              {results.warnings.length > 0 && (
                <div className="space-y-2">
                  {results.warnings.map((w, i) => (
                    <div key={i} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                      <strong>Warning:</strong> {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Turbo Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Turbos</CardTitle>
                  <CardDescription>
                    Matched to {fmt(results.airflowPerTurbo, 1)} lb/min per turbo at PR {fmt(results.pressureRatio, 2)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Budget filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {([["any", "All"], ["budget", "Budget ($)"], ["mid", "Mid ($$)"], ["high", "Premium ($$$)"]] as const).map(([val, label]) => (
                      <button
                        key={val}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          maxBudget === val
                            ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                            : "bg-white text-muted-foreground border-gray-200 hover:border-[#E85D04]"
                        }`}
                        onClick={() => setMaxBudget(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const tierOrder = { budget: 0, mid: 1, high: 2 };
                    const maxTier = maxBudget === "any" ? 2 : tierOrder[maxBudget];
                    const filtered = results.matchedTurbos.filter((t) => tierOrder[t.tier] <= maxTier);

                    if (filtered.length === 0) {
                      return <p className="text-muted-foreground text-sm py-4">No matching turbos found{maxBudget !== "any" ? " in this price range" : ""}. Try adjusting your inputs{maxBudget !== "any" ? " or expanding the budget filter" : ""}.</p>;
                    }

                    return (
                      <div className="space-y-3">
                        {filtered.slice(0, 10).map((t, i) => {
                          const flow = results.airflowPerTurbo;
                          const pct = ((flow - t.minFlow) / (t.maxFlow - t.minFlow)) * 100;
                          const isBest = i === 0;
                          const tierColors = {
                            budget: "bg-green-100 text-green-700",
                            mid: "bg-blue-100 text-blue-700",
                            high: "bg-purple-100 text-purple-700",
                          };
                          return (
                            <div
                              key={t.name}
                              className={`p-4 rounded-lg border transition-colors ${
                                isBest ? "border-[#E85D04] bg-orange-50" : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-sm">{t.name}</p>
                                    {isBest && (
                                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E85D04] text-white">Best Match</span>
                                    )}
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tierColors[t.tier]}`}>
                                      {t.approxPrice}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t.inducer}mm inducer · {t.frame} frame · {t.bearing === "both" ? "BB or JB" : t.bearing === "ball" ? "Ball bearing" : "Journal bearing"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Flow range: {t.minFlow}–{t.maxFlow} lb/min · HP range: {t.minHp.toLocaleString()}–{t.maxHp.toLocaleString()} hp
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    A/R options: {t.arOptions}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Map position</p>
                                  <p className={`text-sm font-bold ${pct >= 30 && pct <= 70 ? "text-green-600" : pct >= 15 && pct <= 85 ? "text-yellow-600" : "text-red-600"}`}>
                                    {pct.toFixed(0)}%
                                  </p>
                                </div>
                              </div>
                              {/* Flow position bar */}
                              <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pct >= 30 && pct <= 70 ? "bg-green-500" : pct >= 15 && pct <= 85 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                                <span>{t.minFlow} lb/min</span>
                                <span>{t.maxFlow} lb/min</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Budget tier note */}
                  {maxBudget === "budget" && (
                    <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                      <strong>Budget turbo note:</strong> Generic T3/T4, T04E, and GT-series turbos from eBay/Amazon work fine for mild builds. Expect slower spool, lower compressor efficiency, and shorter lifespan vs. name-brand units. Journal bearings need proper oil supply and drain — use a restrictor and -10AN drain line. Not recommended above 15 PSI on pump gas without careful tuning.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Turbine Housing & Wastegate Recommendation */}
              <Card>
                <CardHeader><CardTitle>Turbine Housing & Support</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Recommended A/R Range</p>
                      <p className="text-xl font-bold">{getArRecommendation(application, dispCi)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{appDef.arDesc}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Wastegate Size</p>
                      <p className="text-xl font-bold">{getWastegateSize(hp)}</p>
                      <p className="text-xs text-muted-foreground mt-1">External wastegate recommendation</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <strong>A/R tip:</strong> Smaller A/R = faster spool + more low-end torque, but creates more backpressure at high RPM. Larger A/R = slower spool + better top-end power. For {appDef.short.toLowerCase()}, prioritize {appDef.spoolPriority === "high" ? "fast spool (smaller A/R)" : appDef.spoolPriority === "medium" ? "a balanced A/R" : "top-end flow (larger A/R)"}.
                  </div>
                </CardContent>
              </Card>

              {/* NA Baseline & Exhaust Data */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Engine Baseline</CardTitle>
                    <div className="flex rounded-lg border overflow-hidden text-xs">
                      <button
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          naDisplayMode === "net"
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-white text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => setNaDisplayMode("net")}
                      >
                        Net (at crank)
                      </button>
                      <button
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          naDisplayMode === "gross"
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-white text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => setNaDisplayMode("gross")}
                      >
                        Gross (engine only)
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 rounded bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">
                        {naDisplayMode === "net" ? "Est. NA Power (net)" : "Est. NA Power (gross)"}
                      </p>
                      <p className="text-lg font-bold">
                        {naDisplayMode === "net"
                          ? fmt(results.naHpNet, 0)
                          : fmt(results.naHpEstimate, 0)} hp
                      </p>
                      {naDisplayMode === "net" && (
                        <p className="text-[10px] text-muted-foreground">
                          ~{fmt(results.accessoryLoss, 0)} hp accessory loss
                        </p>
                      )}
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">NA Airflow</p>
                      <p className="text-lg font-bold">{fmt(results.naAirflowCfm, 0)} CFM</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Effective VE</p>
                      <p className="text-lg font-bold">{(results.effectiveVe * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-2 rounded bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Exhaust Flow (boosted)</p>
                      <p className="text-lg font-bold">{fmt(results.exhaustFlowLbMin, 1)} lb/min</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Power Multiplier</p>
                      <p className="text-lg font-bold">{results.naHpNet > 0 ? fmt(hp / (naDisplayMode === "net" ? results.naHpNet : results.naHpEstimate), 2) : "—"}×</p>
                    </div>
                  </div>
                  <div className="mt-3 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                    {naDisplayMode === "net"
                      ? <><strong>Net power</strong> deducts typical accessory losses (water pump, oil pump, alternator, A/C, power steering). This matches factory crank HP ratings and the HP Estimator tool.</>
                      : <><strong>Gross power</strong> is the engine's raw breathing potential before accessory and friction losses. Use this when comparing to engine dyno pulls with accessories removed.</>
                    }
                  </div>
                  {results.headFlowUsed && (
                    <p className="text-xs text-muted-foreground mt-2">VE derived from head flow bench data — more accurate than default estimates.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ──────────── COLLAPSIBLE: FUEL SYSTEM ──────────── */}
      {valid && results && (
        <Section title="Fuel System Requirements" open={fuelSystemOpen} toggle={() => setFuelSystemOpen(!fuelSystemOpen)}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Fuel Flow</p>
              <p className="text-2xl font-bold">{fmt(results.fuelFlowLbHr, 1)} lb/hr</p>
              <p className="text-xs text-muted-foreground">{fmt(results.fuelFlowLbHr / 6.0, 1)} GPH gasoline equivalent</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Min. Injector Size (per cyl at 80% DC)</p>
              <p className="text-2xl font-bold">{fmt(results.injectorSizeCc, 0)} cc/min</p>
              <p className="text-xs text-muted-foreground">{fmt(results.injectorSizeLbHr, 1)} lb/hr per injector</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Configuration</p>
              <p className="text-lg font-bold">{cyl} injectors × {fmt(results.injectorSizeCc, 0)} cc</p>
              <p className="text-xs text-muted-foreground">At 80% max duty cycle ({f.short})</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
            <strong>Note:</strong> Injector sizing assumes {fuel === "diesel" ? "diesel" : "gasoline"} density. {fuel === "e85" ? "E85 requires ~30% more flow than gasoline — size injectors accordingly or use flex-fuel compatible injectors." : fuel === "methanol" ? "Methanol requires roughly double the flow of gasoline. Ensure your fuel system can handle the volume." : "Always leave headroom — 80% duty cycle is the safe maximum."}
          </div>
        </Section>
      )}

      {/* ──────────── COLLAPSIBLE: TURBO SIZE REFERENCE ──────────── */}
      <Section title="Turbo Size Quick Reference" open={turboSizeRefOpen} toggle={() => setTurboSizeRefOpen(!turboSizeRefOpen)}>
        <p className="text-sm text-muted-foreground mb-4">Approximate single-turbo horsepower ranges by compressor inducer size on gasoline. Actual results depend on turbine housing, efficiency, and tuning.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Inducer</th>
                <th className="text-left py-2">Frame</th>
                <th className="text-right py-2">HP Range</th>
                <th className="text-right py-2">Flow (lb/min)</th>
                <th className="text-left py-2 pl-4">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ind: "48mm",  frame: "G25 / T25",     hp: "250–550",    flow: "25–55",   use: "4-cyl daily, small displacement" },
                { ind: "54mm",  frame: "G30 / T3",      hp: "350–770",    flow: "35–77",   use: "4-cyl performance, small V6" },
                { ind: "62mm",  frame: "G35 / T4",      hp: "450–900",    flow: "45–90",   use: "I6, V6, small V8" },
                { ind: "67mm",  frame: "EFR 8374 / 67mm", hp: "550–1050", flow: "55–105",  use: "V8 street/strip" },
                { ind: "71mm",  frame: "G40 / 71mm",    hp: "700–1200",   flow: "70–120",  use: "V8 performance, mild drag" },
                { ind: "76mm",  frame: "G42 / 76mm",    hp: "900–1450",   flow: "90–145",  use: "Big V8, serious drag" },
                { ind: "80mm",  frame: "G45 / 80mm",    hp: "1000–1600",  flow: "100–160", use: "Pro touring, drag" },
                { ind: "88mm+", frame: "88mm+",         hp: "1300–2500+", flow: "130–250+", use: "Pro mod, competition only" },
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-bold">{row.ind}</td>
                  <td className="py-2">{row.frame}</td>
                  <td className="text-right py-2">{row.hp} hp</td>
                  <td className="text-right py-2">{row.flow}</td>
                  <td className="text-left py-2 pl-4 text-muted-foreground">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ──────────── COLLAPSIBLE: FORMULAS ──────────── */}
      <Section title="Formulas & Methodology" open={formulasOpen} toggle={() => setFormulasOpen(!formulasOpen)}>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Required Airflow (Garrett Method)</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Airflow (lb/min) = (Target HP × BSFC × AFR) / 60
            </code>
            <p className="mt-1">BSFC is brake specific fuel consumption in lb/hp-hr. AFR is the air-fuel ratio at your power target, not stoichiometric.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Pressure Ratio</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              PR = (Atmospheric + Boost + Piping Loss) / (Atmospheric - Inlet Loss)
            </code>
            <p className="mt-1">This calculator uses 2 PSI piping loss and 1 PSI inlet depression as typical values.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Compressor Outlet Temperature</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              T_out = T_in × (1 + (PR^0.283 - 1) / Compressor_Efficiency)
            </code>
            <p className="mt-1">All temperatures in Rankine (°F + 459.67). This calculator uses 72% compressor efficiency as a conservative typical value.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Post-Intercooler Temperature</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              T_after_IC = T_compressor_out - IC_Efficiency × (T_compressor_out - T_ambient)
            </code>
            <p className="mt-1">Air-to-air: 70% efficiency. Air-to-water: 85% efficiency. These are typical values for quality aftermarket intercoolers.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Injector Sizing</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Injector (lb/hr) = (HP × BSFC) / (Cylinders × Max_Duty_Cycle)
            </code>
            <p className="mt-1">Max duty cycle of 80% leaves headroom for the ECU to manage fueling. Multiply lb/hr by 10.5 for approximate cc/min conversion.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">VE from Head Flow Data</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Corrected_Flow = Bench_CFM × sqrt(28 / Test_Pressure){"\n"}
              Head_Capacity = Corrected_Flow × Cylinders{"\n"}
              Theoretical_Max = (CID × RPM) / 3456{"\n"}
              VE = (Head_Capacity / Theoretical_Max) × 0.90
            </code>
            <p className="mt-1">The 0.90 factor accounts for valve timing losses — the bench flows air at steady state, but in a running engine the valve is only open ~40–50% of the cycle. Head flow data gives a much more accurate VE than generic estimates.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Atmospheric Pressure at Altitude</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              P_atm = 14.696 × (1 - 0.0000068753 × altitude_ft) ^ 5.2559
            </code>
            <p className="mt-1">Standard atmosphere model. At altitude the turbo must generate a higher pressure ratio for the same gauge boost reading.</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <strong>Sources:</strong> Garrett Motion turbo sizing guides, BorgWarner EFR technical documentation, HP Academy turbocharger selection methodology, Heywood <em>Internal Combustion Engine Fundamentals</em> Ch. 6.
        </div>
      </Section>

      {/* ──────────── EDUCATIONAL ──────────── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Turbo Sizing</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Turbo sizing comes down to one question: how much air does your engine need to make your target power? The turbocharger's job is to compress ambient air to a higher density so the engine can burn more fuel per cycle. The required airflow is determined by your horsepower target, the fuel type's energy density (BSFC), and the air-fuel ratio. Once you know the airflow in lb/min, you match it against compressor maps — graphs published by turbo manufacturers that show each turbo's airflow capacity and efficiency at various pressure ratios.
          </p>
          <p>
            The most common mistake in turbo selection is oversizing. A turbo that is too large will have terrible spool characteristics — the engine must produce enough exhaust energy to spin the turbine to operating speed, and a heavier, larger wheel requires more exhaust flow to get moving. For a street car, this means no boost until 4,000+ RPM, poor throttle response, and a lazy, on/off power delivery that makes the car difficult to drive. A slightly smaller turbo that operates in its peak efficiency island will make nearly the same peak power with dramatically better response and drivability.
          </p>
          <p>
            The pressure ratio — boost plus atmospheric divided by atmospheric — is what determines where your operating point sits on the compressor map's Y-axis. At sea level with 15 PSI of boost, your pressure ratio is about 2.0. At 5,000 feet elevation, the same 15 PSI of boost requires a pressure ratio of 2.2 because the atmosphere starts thinner. This is why turbo selection at altitude is different — the compressor must work harder and runs closer to its limits for the same gauge boost number.
          </p>
          <p>
            The turbine housing A/R ratio controls spool speed versus top-end flow. A smaller A/R accelerates exhaust velocity across the turbine wheel for quicker spool, but creates more backpressure at high RPM that fights the engine's exhaust stroke. A larger A/R does the opposite — slower spool but better exhaust scavenging and more power potential up top. For street cars, err toward the smaller end. For drag racing where you launch above 5,000 RPM on a transbrake, the largest A/R maximizes peak power.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Quick Rules of Thumb</h3>
          <p>
            Approximately 10 lb/min of airflow per 100 hp on gasoline. A stock small block Chevy 350 makes roughly 250 hp naturally aspirated — to hit 500 hp you need to roughly double the airflow, which requires about 8–10 PSI on a well-tuned setup. Each additional 100 hp on pump gas needs roughly 6–8 more PSI of boost depending on efficiency. E85 can safely run 30–50% more boost than pump gas due to its higher octane and charge-cooling properties, making it the fuel of choice for high-boost street builds.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function Section({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-8 border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold hover:bg-[#222] transition-colors"
        onClick={toggle}
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}
