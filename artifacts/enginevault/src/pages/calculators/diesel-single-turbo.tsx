import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Info } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────

type DieselApplication = "tow" | "street" | "street-strip" | "drag-sled";
type IntercoolerType = "none" | "air-to-air" | "air-to-water";

// ── Engine platform data ────────────────────────────────────────────────────────

interface PlatformDef {
  label: string;
  cid: number;
  cylinders: number;
  maxRpm: number;
  stockTurbo: string;
  stockBoostPsi: number;
  stockHp: number;
  notes: string;
}

const PLATFORMS: Record<string, PlatformDef> = {
  "12v-cummins":     { label: "5.9L 12-Valve Cummins (6BT)",     cid: 359, cylinders: 6, maxRpm: 3200, stockTurbo: "Holset HX35",            stockBoostPsi: 20, stockHp: 215, notes: "Mechanical P-pump injection. Single turbo swaps are the most common mod — just swap turbo and turn up the fuel." },
  "24v-cummins":     { label: "5.9L 24-Valve Cummins (ISB)",     cid: 359, cylinders: 6, maxRpm: 3400, stockTurbo: "Holset HY35W / HE351CW", stockBoostPsi: 24, stockHp: 325, notes: "Common rail injection. ECU tuning + single turbo upgrade is the most popular path to 450-550 HP." },
  "6.7-cummins":     { label: "6.7L Cummins (ISB 6.7)",          cid: 408, cylinders: 6, maxRpm: 3600, stockTurbo: "Holset HE351VE / HE300VG", stockBoostPsi: 30, stockHp: 385, notes: "Stock VGT is effective to ~450 HP. Single fixed-geometry upgrade for 450-650 HP before considering compounds." },
  "duramax-early":   { label: "6.6L Duramax (LB7/LLY/LBZ/LMM)", cid: 403, cylinders: 8, maxRpm: 3400, stockTurbo: "Garrett GT3788VA",        stockBoostPsi: 22, stockHp: 360, notes: "Factory VGT can support mild tunes. Aftermarket single turbos are drop-in for LBZ/LMM." },
  "duramax-late":    { label: "6.6L Duramax (LML/L5P)",          cid: 403, cylinders: 8, maxRpm: 3500, stockTurbo: "Garrett VGT",              stockBoostPsi: 28, stockHp: 445, notes: "L5P stock turbo is very capable. Single upgrade mainly for 500+ HP builds." },
  "7.3-powerstroke": { label: "7.3L Powerstroke",                 cid: 444, cylinders: 8, maxRpm: 3300, stockTurbo: "Garrett GTP38",            stockBoostPsi: 15, stockHp: 275, notes: "HEUI injection. GTP38R upgrade or aftermarket non-VGT swap. Injectors are the bottleneck before turbo on most builds." },
  "6.0-powerstroke": { label: "6.0L Powerstroke",                 cid: 365, cylinders: 8, maxRpm: 3600, stockTurbo: "Garrett GT3782VA",         stockBoostPsi: 22, stockHp: 325, notes: "Head studs required before adding boost. VGT can support 400-450 HP with tuning before upgrading turbo." },
  "6.4-powerstroke": { label: "6.4L Powerstroke (single swap)",   cid: 390, cylinders: 8, maxRpm: 3600, stockTurbo: "Compound (factory)",       stockBoostPsi: 28, stockHp: 350, notes: "Factory compound. Some builders delete the compound and run a single larger turbo for simplicity. Requires custom exhaust manifold." },
  "6.7-powerstroke": { label: "6.7L Powerstroke",                 cid: 406, cylinders: 8, maxRpm: 3500, stockTurbo: "Garrett PowerMax VGT",     stockBoostPsi: 26, stockHp: 475, notes: "Stock VGT is strong. Single aftermarket upgrade for 500+ HP builds." },
  "custom":          { label: "Custom Diesel Engine",             cid: 0,   cylinders: 6, maxRpm: 3400, stockTurbo: "N/A",                      stockBoostPsi: 0,  stockHp: 0,   notes: "" },
};

// ── Application definitions ─────────────────────────────────────────────────────

interface DieselAppDef {
  label: string;
  short: string;
  arBias: "small" | "mid" | "large";
  desc: string;
  spoolPriority: "high" | "medium" | "low";
}

const APPLICATIONS: Record<DieselApplication, DieselAppDef> = {
  "tow":          { label: "Towing / Daily Driver",   short: "Tow/Daily",    arBias: "small", desc: "Smallest A/R — fast spool, low-RPM torque for loaded driving", spoolPriority: "high" },
  "street":       { label: "Street / Daily (no tow)", short: "Street",       arBias: "small", desc: "Small-mid A/R — fast spool for stoplight-to-stoplight fun",    spoolPriority: "high" },
  "street-strip": { label: "Street / Strip",          short: "Street/Strip", arBias: "mid",   desc: "Mid-range A/R — balanced spool with solid top-end",            spoolPriority: "medium" },
  "drag-sled":    { label: "Drag / Sled Pull",        short: "Drag/Sled",    arBias: "large", desc: "Largest A/R — max top-end flow, lag acceptable",               spoolPriority: "low" },
};

// ── Turbo database ──────────────────────────────────────────────────────────────
// Single-turbo options for diesel: Holset OEM/upgrade, BorgWarner S300/S400,
// Garrett diesel-specific, and common aftermarket options.

interface DieselTurboDef {
  name: string;
  series: string;
  compressorMm: number;
  minFlow: number;   // lb/min
  maxFlow: number;
  minHp: number;
  maxHp: number;
  arOptions: string;
  flange: string;
  bearing: "journal" | "ball" | "vgt";
  notes: string;
  approxPrice: string;
}

const TURBO_DB: DieselTurboDef[] = [
  // ── Holset OEM & upgrade turbos (Cummins-centric) ────────────────────────────
  { name: "Holset HX35",       series: "Holset",  compressorMm: 56, minFlow: 22, maxFlow: 42, minHp: 180, maxHp: 350,  arOptions: "0.70 / 0.83",         flange: "T3",      bearing: "journal", notes: "Stock 12-valve ('94-'98). Good to 350 HP with supporting mods.",                      approxPrice: "$200-500 (used)" },
  { name: "Holset HX40",       series: "Holset",  compressorMm: 60, minFlow: 30, maxFlow: 55, minHp: 300, maxHp: 500,  arOptions: "0.76 / 0.83 / 1.00",  flange: "T3 / T4", bearing: "journal", notes: "Most popular 12-valve upgrade. Fast spool, supports 450-500 HP.",                      approxPrice: "$300-700" },
  { name: "Holset HY35W",      series: "Holset",  compressorMm: 56, minFlow: 22, maxFlow: 45, minHp: 200, maxHp: 375,  arOptions: "0.83",                 flange: "T3",      bearing: "journal", notes: "Stock '03-'04 common rail 5.9. Responsive but limited on top-end.",                    approxPrice: "$200-400 (used)" },
  { name: "Holset HE351CW",    series: "Holset",  compressorMm: 58, minFlow: 25, maxFlow: 50, minHp: 250, maxHp: 425,  arOptions: "0.76 / 0.83",          flange: "T3",      bearing: "journal", notes: "Stock '04.5-'07 5.9. Very responsive, good to 400-425 HP with tuning.",                approxPrice: "$200-450 (used)" },
  { name: "Holset HE351VE",    series: "Holset",  compressorMm: 59, minFlow: 25, maxFlow: 48, minHp: 250, maxHp: 450,  arOptions: "VGT (variable)",       flange: "T3",      bearing: "vgt",     notes: "Stock '07.5+ 6.7. Variable geometry provides excellent spool + top-end. Good to 450 HP.", approxPrice: "$300-600 (used)" },
  { name: "Holset HE300VG",    series: "Holset",  compressorMm: 55, minFlow: 22, maxFlow: 45, minHp: 200, maxHp: 400,  arOptions: "VGT (variable)",       flange: "T3",      bearing: "vgt",     notes: "Stock current 6.7. Efficient VGT design. Good to ~400 HP.",                               approxPrice: "$400-700 (used)" },
  { name: "Holset HX40 Super", series: "Holset",  compressorMm: 62, minFlow: 32, maxFlow: 58, minHp: 325, maxHp: 550,  arOptions: "0.83 / 1.00",          flange: "T3 / T4", bearing: "journal", notes: "Popular aftermarket Holset build. Larger compressor wheel for more top-end.",            approxPrice: "$500-900" },

  // ── BorgWarner S300 series (most popular aftermarket for diesel) ──────────────
  { name: "BorgWarner S358",    series: "S300",   compressorMm: 58, minFlow: 25, maxFlow: 45, minHp: 250, maxHp: 400,  arOptions: "0.83 / 1.00",          flange: "T3 / T4", bearing: "journal", notes: "Entry-level S300. Quick spool for tow rigs, limited above 400 HP.",                     approxPrice: "$600-900" },
  { name: "BorgWarner S362",    series: "S300",   compressorMm: 62, minFlow: 30, maxFlow: 52, minHp: 300, maxHp: 500,  arOptions: "0.83 / 1.00 / 1.10",   flange: "T3 / T4", bearing: "journal", notes: "Sweet spot for 400-500 HP tow/street builds. Fast spool, great mid-range.",             approxPrice: "$650-950" },
  { name: "BorgWarner S363",    series: "S300",   compressorMm: 63, minFlow: 32, maxFlow: 55, minHp: 325, maxHp: 525,  arOptions: "0.83 / 1.00 / 1.10",   flange: "T3 / T4", bearing: "journal", notes: "Slightly larger than S362. Popular for 5.9 Cummins 450-525 HP builds.",                 approxPrice: "$650-1,000" },
  { name: "BorgWarner S366",    series: "S300",   compressorMm: 66, minFlow: 35, maxFlow: 62, minHp: 400, maxHp: 625,  arOptions: "0.83 / 1.00 / 1.10",   flange: "T3 / T4", bearing: "journal", notes: "The go-to for 500-600 HP single-turbo diesel builds. Great balance of spool and flow.", approxPrice: "$700-1,100" },
  { name: "BorgWarner S369",    series: "S300",   compressorMm: 69, minFlow: 40, maxFlow: 70, minHp: 450, maxHp: 700,  arOptions: "0.83 / 1.00 / 1.10",   flange: "T3 / T4", bearing: "journal", notes: "Aggressive single-turbo choice. Noticeable lag vs S366 but more top-end flow.",          approxPrice: "$750-1,100" },
  { name: "BorgWarner S372",    series: "S300",   compressorMm: 72, minFlow: 45, maxFlow: 80, minHp: 500, maxHp: 800,  arOptions: "0.83 / 1.00 / 1.10",   flange: "T3 / T4", bearing: "journal", notes: "Largest common S300. Significant lag as single turbo — most people go compound above this.", approxPrice: "$800-1,200" },

  // ── BorgWarner S400 series (large single-turbo, drag/sled use) ────────────────
  { name: "BorgWarner S467",    series: "S400",   compressorMm: 67, minFlow: 40, maxFlow: 72,  minHp: 400, maxHp: 650,  arOptions: "0.90 / 1.00 / 1.10",  flange: "T4 / T6", bearing: "journal", notes: "Smallest S400. Can work as single for high-HP with significant lag.",                    approxPrice: "$800-1,200" },
  { name: "BorgWarner S475",    series: "S400",   compressorMm: 75, minFlow: 55, maxFlow: 100, minHp: 550, maxHp: 900,  arOptions: "0.90 / 1.00 / 1.10 / 1.25", flange: "T4 / T6", bearing: "journal", notes: "Drag/sled single turbo. Massive lag but huge top-end. Usually better as atmospheric in compound.", approxPrice: "$900-1,400" },

  // ── Garrett diesel-specific ───────────────────────────────────────────────────
  { name: "Garrett GTP38R",     series: "Garrett", compressorMm: 60, minFlow: 28, maxFlow: 52, minHp: 275, maxHp: 475,  arOptions: "0.84 / 1.00",         flange: "T4",      bearing: "journal", notes: "7.3L Powerstroke upgrade (non-VGT). Direct replacement for stock GTP38.",                 approxPrice: "$500-900" },
  { name: "Garrett GT3788VA",   series: "Garrett", compressorMm: 59, minFlow: 25, maxFlow: 50, minHp: 250, maxHp: 440,  arOptions: "VGT (variable)",       flange: "T4",      bearing: "vgt",     notes: "Stock Duramax VGT. Good to ~440 HP with tuning. VGT provides excellent spool.",           approxPrice: "$800-1,500 (reman)" },
  { name: "Garrett GT3794VA",   series: "Garrett", compressorMm: 62, minFlow: 30, maxFlow: 55, minHp: 300, maxHp: 500,  arOptions: "VGT (variable)",       flange: "T4",      bearing: "vgt",     notes: "Upgraded Duramax VGT billet wheel. Better flow than stock GT3788VA.",                      approxPrice: "$1,200-2,000" },
  { name: "Garrett PowerMax",   series: "Garrett", compressorMm: 64, minFlow: 32, maxFlow: 60, minHp: 350, maxHp: 550,  arOptions: "VGT (variable)",       flange: "T4",      bearing: "vgt",     notes: "6.7L Powerstroke upgraded VGT. Drop-in replacement with larger compressor.",               approxPrice: "$1,500-2,500" },

  // ── Aftermarket / specialty ───────────────────────────────────────────────────
  { name: "Industrial Injection Phatshaft 62",  series: "Aftermarket", compressorMm: 62, minFlow: 30, maxFlow: 55, minHp: 325, maxHp: 525, arOptions: "0.83 / 1.00",  flange: "T3", bearing: "journal", notes: "Popular Cummins drop-in upgrade. Holset-based with larger billet compressor wheel.", approxPrice: "$800-1,200" },
  { name: "Industrial Injection Phatshaft 66",  series: "Aftermarket", compressorMm: 66, minFlow: 35, maxFlow: 62, minHp: 400, maxHp: 600, arOptions: "0.83 / 1.00",  flange: "T3", bearing: "journal", notes: "Larger Phatshaft for 500-600 HP Cummins. Drop-in with stock exhaust manifold.",      approxPrice: "$1,000-1,500" },
  { name: "Fleece Cheetah (63mm)",              series: "Aftermarket", compressorMm: 63, minFlow: 30, maxFlow: 55, minHp: 325, maxHp: 525, arOptions: "0.83 / 1.00",  flange: "T3", bearing: "ball",    notes: "Ball-bearing Cummins drop-in. Fastest spool in class due to ball bearing center.",    approxPrice: "$1,200-1,600" },
  { name: "Fleece Cheetah (68mm)",              series: "Aftermarket", compressorMm: 68, minFlow: 38, maxFlow: 65, minHp: 425, maxHp: 625, arOptions: "0.83 / 1.00",  flange: "T3", bearing: "ball",    notes: "Larger ball-bearing Cummins drop-in. Good spool for the size.",                       approxPrice: "$1,400-1,800" },
];

// ── Altitude pressure ───────────────────────────────────────────────────────────

function getAtmosphericPressure(altFt: number): number {
  return 14.696 * Math.pow(1 - 0.0000068753 * altFt, 5.2559);
}

// ── Diesel VE estimation ────────────────────────────────────────────────────────

function estimateDieselVe(targetBoostPsi: number): number {
  // Stock turbo diesel: 90-97% VE. Modified with more boost: up to 100%.
  if (targetBoostPsi <= 20) return 0.92;
  if (targetBoostPsi <= 30) return 0.95;
  if (targetBoostPsi <= 40) return 0.97;
  return 0.98; // high-boost single turbo
}

// ── Calculation engine ──────────────────────────────────────────────────────────

interface CalcResults {
  // Airflow
  totalAirflowLbMin: number;
  totalAirflowCfm: number;
  // Boost
  boostPsi: number;
  pressureRatio: number;
  // Temps
  compressorOutletTempF: number;
  postIcTempF: number;
  // Drive pressure
  drivePressureEstPsi: number;
  drivePressureRatio: number;
  // Ideal turbo specs
  idealCompressorMm: number;
  idealFlowMin: number;
  idealFlowMax: number;
  // Matches
  matchedTurbos: DieselTurboDef[];
  // Misc
  atmosPsi: number;
  effectiveVe: number;
  estimatedEgtF: number;
  warnings: string[];
}

function calculate(
  targetHp: number,
  cid: number,
  maxRpm: number,
  targetBoostPsi: number,
  application: DieselApplication,
  intercooler: IntercoolerType,
  altitudeFt: number,
  ambientTempF: number,
  platformKey: string,
  customVe: number | null,
): CalcResults {
  const warnings: string[] = [];

  const atmosPsi = getAtmosphericPressure(altitudeFt);

  // Diesel BSFC: 0.38-0.42 lb/hp-hr (much better than gasoline)
  const bsfc = 0.40;
  // Diesel power AFR: ~22:1 (lean burn, excess air for diesel combustion)
  const afr = 22.0;

  const ve = customVe ?? estimateDieselVe(targetBoostPsi);

  // Required airflow from HP target
  const totalAirflowLbMin = (targetHp * bsfc * afr) / 60;
  const totalAirflowCfm = totalAirflowLbMin / 0.0765;

  // Pressure ratio
  const inletLoss = 0.5;
  const pipingLoss = 2.0;
  const pressureRatio = (atmosPsi + targetBoostPsi + pipingLoss) / (atmosPsi - inletLoss);

  // Compressor outlet temperature
  const tInR = ambientTempF + 459.67;
  const compEff = 0.72;
  const tOutIdealR = tInR * Math.pow(pressureRatio, 0.283);
  const tempRiseIdeal = tOutIdealR - tInR;
  const tempRiseActual = tempRiseIdeal / compEff;
  const tOutR = tInR + tempRiseActual;
  const compressorOutletTempF = tOutR - 459.67;

  // Post-intercooler temp
  let icEff = 0;
  if (intercooler === "air-to-air") icEff = 0.70;
  if (intercooler === "air-to-water") icEff = 0.85;
  const postIcTempF = compressorOutletTempF - icEff * (compressorOutletTempF - ambientTempF);

  // Drive pressure estimate
  const drivePressureEstPsi = targetBoostPsi * (application === "tow" ? 1.3 : application === "street" ? 1.2 : application === "street-strip" ? 1.1 : 0.95);
  const drivePressureRatio = targetBoostPsi > 0 ? drivePressureEstPsi / targetBoostPsi : 0;

  // EGT estimate — rough correlation
  // Base EGT rises with boost, drops with intercooling, rises with drive pressure
  let estimatedEgtF = 800 + targetBoostPsi * 12;
  if (intercooler === "air-to-air") estimatedEgtF -= 100;
  if (intercooler === "air-to-water") estimatedEgtF -= 150;
  if (drivePressureRatio > 1.5) estimatedEgtF += 100;

  // Ideal turbo specs
  const idealCompressorMm = Math.round(20 + totalAirflowLbMin * 0.72);
  const idealFlowMin = totalAirflowLbMin * 0.75;
  const idealFlowMax = totalAirflowLbMin * 1.30;

  // Match turbos
  const matchedTurbos = TURBO_DB.filter((t) => {
    return totalAirflowLbMin >= t.minFlow * 0.80 && totalAirflowLbMin <= t.maxFlow * 1.10;
  }).sort((a, b) => {
    // Prefer turbos where operating point is centered in the map
    const midA = (a.minFlow + a.maxFlow) / 2;
    const midB = (b.minFlow + b.maxFlow) / 2;
    return Math.abs(totalAirflowLbMin - midA) - Math.abs(totalAirflowLbMin - midB);
  });

  // ── Warnings ──────────────────────────────────────────────────────────────────
  if (platformKey === "6.0-powerstroke" && targetBoostPsi > 25) {
    warnings.push("The 6.0L requires head studs before adding boost beyond stock levels. Stock TTY head bolts fail at 25-30 PSI.");
  }
  if (targetBoostPsi > 45 && targetHp > 550) {
    warnings.push("Above 45 PSI on a single turbo will have significant lag at diesel RPM ranges. Consider a compound turbo setup for better spool + flow.");
  }
  if (targetHp > 650) {
    warnings.push("Single-turbo diesel builds above 650 HP require extremely large turbos with significant turbo lag. A compound setup is strongly recommended.");
  }
  if (compressorOutletTempF > 400 && intercooler === "none") {
    warnings.push(`Compressor outlet temperature of ${compressorOutletTempF.toFixed(0)}°F without intercooling is dangerously hot. An intercooler is required.`);
  }
  if (postIcTempF > 160 && intercooler !== "none") {
    warnings.push(`Post-intercooler temp of ${postIcTempF.toFixed(0)}°F is warm. Consider a larger intercooler or upgrade to air-to-water.`);
  }
  if (pressureRatio > 3.5) {
    warnings.push(`Pressure ratio of ${pressureRatio.toFixed(2)} is very high for a single turbo. The compressor may be operating near or past its surge line.`);
  }
  if (drivePressureRatio > 1.5) {
    warnings.push(`Estimated drive pressure ratio of ${drivePressureRatio.toFixed(1)}:1 is above ideal. Consider a larger turbine housing A/R.`);
  }
  if (estimatedEgtF > 1300) {
    warnings.push(`Estimated EGTs of ${estimatedEgtF.toFixed(0)}°F are in the danger zone. Sustained EGTs above 1,300°F will damage pistons and turbo. Add fueling or reduce boost.`);
  }
  if (altitudeFt > 4000) {
    warnings.push(`At ${altitudeFt.toLocaleString()} ft, the turbo works harder. PR is ${pressureRatio.toFixed(2)} vs ${((14.696 + targetBoostPsi + pipingLoss) / (14.696 - inletLoss)).toFixed(2)} at sea level.`);
  }
  if (matchedTurbos.length === 0) {
    warnings.push("No turbos in the database match this airflow. Use the ideal specs above to find a turbo from any manufacturer.");
  }
  if (platformKey === "6.4-powerstroke") {
    warnings.push("The 6.4L is compound from factory. Converting to a single turbo requires a custom exhaust manifold and may lose low-end response.");
  }
  if (platformKey === "12v-cummins" && targetHp > 400) {
    warnings.push("12-valve builds above 400 HP need P-pump upgrades (larger delivery valves, 5x0.018+ nozzles, governor springs). The fuel system is the bottleneck, not the turbo.");
  }
  if (platformKey.startsWith("duramax") && targetHp > 500) {
    warnings.push("Duramax single-turbo upgrades above 500 HP typically require CP3 fuel pump upgrade and larger injectors in addition to the turbo swap.");
  }

  return {
    totalAirflowLbMin,
    totalAirflowCfm,
    boostPsi: targetBoostPsi,
    pressureRatio,
    compressorOutletTempF,
    postIcTempF,
    drivePressureEstPsi,
    drivePressureRatio,
    idealCompressorMm,
    idealFlowMin,
    idealFlowMax,
    matchedTurbos,
    atmosPsi,
    effectiveVe: ve,
    estimatedEgtF,
    warnings,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(val: number, d: number): string {
  return val.toFixed(d);
}

function getArRecommendation(bias: "small" | "mid" | "large"): string {
  if (bias === "small") return "0.76 - 0.83";
  if (bias === "mid") return "0.83 - 1.00";
  return "1.00 - 1.10";
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function DieselSingleTurboCalculator() {
  // Required inputs
  const [platform, setPlatform] = useState("12v-cummins");
  const [customCid, setCustomCid] = useState("400");
  const [customCylinders, setCustomCylinders] = useState("6");
  const [targetHp, setTargetHp] = useState("450");
  const [targetBoost, setTargetBoost] = useState("30");
  const [maxRpm, setMaxRpm] = useState("3200");

  // Optional inputs
  const [altitude, setAltitude] = useState("0");
  const [ambientTemp, setAmbientTemp] = useState("80");
  const [application, setApplication] = useState<DieselApplication>("tow");
  const [intercooler, setIntercooler] = useState<IntercoolerType>("air-to-air");

  // Advanced
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customVeStr, setCustomVeStr] = useState("");

  // Collapsible sections
  const [formulasOpen, setFormulasOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [upgradePathOpen, setUpgradePathOpen] = useState(false);

  // Resolve platform
  const plat = PLATFORMS[platform];
  const cid = platform === "custom" ? (parseFloat(customCid) || 400) : plat.cid;
  const rpm = platform === "custom" ? (parseInt(maxRpm) || 3400) : (parseInt(maxRpm) || plat.maxRpm);
  const hp = parseFloat(targetHp) || 0;
  const boost = parseFloat(targetBoost) || 0;
  const alt = parseInt(altitude) || 0;
  const temp = parseFloat(ambientTemp) || 80;
  const customVe = customVeStr ? parseFloat(customVeStr) / 100 : null;

  const handlePlatformChange = (v: string) => {
    setPlatform(v);
    if (v !== "custom") {
      setMaxRpm(String(PLATFORMS[v].maxRpm));
    }
  };

  const valid = hp > 0 && cid > 0 && boost > 0 && rpm > 0;
  const results = valid
    ? calculate(hp, cid, rpm, boost, application, intercooler, alt, temp, platform, customVe)
    : null;

  const appDef = APPLICATIONS[application];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Diesel Single Turbo Finder & Sizing"
        description="Find the right single turbocharger for your diesel engine. Match Holset, BorgWarner S-series, Garrett, and aftermarket turbos for Cummins, Duramax, and Powerstroke platforms with airflow, boost, EGT, and drive pressure calculations."
        canonical="/calculators/diesel-single-turbo"
        keywords="diesel turbo sizing, diesel turbo finder, Holset turbo upgrade, HX40 upgrade, S366 diesel, Cummins turbo calculator, Duramax turbo upgrade, Powerstroke turbo sizing, diesel single turbo"
      />
      <h1 className="text-3xl font-bold mb-2">Diesel Single Turbo Finder</h1>
      <p className="text-muted-foreground mb-8">Find the right single turbo upgrade for your diesel engine. Matches Holset, BorgWarner S-series, Garrett, and aftermarket turbos with real compressor data.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ──────────── LEFT COLUMN: INPUTS ──────────── */}
        <div className="space-y-4">

          {/* Engine Platform */}
          <Card>
            <CardHeader>
              <CardTitle>Engine Platform</CardTitle>
              <CardDescription>Select your diesel engine or enter custom specs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Engine</Label>
                <Select value={platform} onValueChange={handlePlatformChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORMS).map(([key, p]) => (
                      <SelectItem key={key} value={key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {platform !== "custom" && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Displacement:</span> <strong>{plat.cid} CI</strong></div>
                    <div><span className="text-muted-foreground">Cylinders:</span> <strong>{plat.cylinders}</strong></div>
                    <div><span className="text-muted-foreground">Stock HP:</span> <strong>{plat.stockHp}</strong></div>
                    <div><span className="text-muted-foreground">Stock boost:</span> <strong>{plat.stockBoostPsi} PSI</strong></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Stock turbo: {plat.stockTurbo}</p>
                  {plat.notes && <p className="text-xs text-muted-foreground mt-1">{plat.notes}</p>}
                </div>
              )}

              {platform === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Displacement (CI)</Label>
                    <Input type="number" step="1" min="100" value={customCid} onChange={(e) => setCustomCid(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cylinders</Label>
                    <Select value={customCylinders} onValueChange={setCustomCylinders}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["4", "6", "8", "10", "12"].map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>RPM at Peak Power</Label>
                <Input type="number" step="100" min="2000" max="5000" value={maxRpm} onChange={(e) => setMaxRpm(e.target.value)} />
                <p className="text-xs text-muted-foreground">Most diesel trucks: 3,200-3,800 RPM</p>
              </div>
            </CardContent>
          </Card>

          {/* Power & Boost Target */}
          <Card>
            <CardHeader>
              <CardTitle>Power & Boost Target</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Wheel Horsepower</Label>
                <Input type="number" step="25" min="150" value={targetHp} onChange={(e) => setTargetHp(e.target.value)} />
                {platform !== "custom" && (
                  <p className="text-xs text-muted-foreground">Stock: {plat.stockHp} HP. Single turbo range: {plat.stockHp}-{Math.round(plat.stockHp * 2)} HP.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Target Boost (PSI)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["20", "25", "30", "35", "40", "45"].map((b) => (
                    <button
                      key={b}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        targetBoost === b
                          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                          : "bg-white text-muted-foreground border-gray-200 hover:border-[#E85D04]"
                      }`}
                      onClick={() => setTargetBoost(b)}
                    >
                      {b} PSI
                    </button>
                  ))}
                </div>
                <Input type="number" step="5" min="10" max="60" value={targetBoost} onChange={(e) => setTargetBoost(e.target.value)} />
                <p className="text-xs text-muted-foreground">Stock: {platform !== "custom" ? `${plat.stockBoostPsi} PSI` : "varies"} · Mild upgrade: 25-30 PSI · Performance: 35-45 PSI · Max single: 45-55 PSI</p>
              </div>
            </CardContent>
          </Card>

          {/* Application & Environment */}
          <Card>
            <CardHeader>
              <CardTitle>Application & Environment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Application</Label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border overflow-hidden">
                  {(Object.entries(APPLICATIONS) as [DieselApplication, DieselAppDef][]).map(([id, def]) => (
                    <button
                      key={id}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        application === id
                          ? "bg-[#1a1a1a] text-white"
                          : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setApplication(id)}
                    >
                      {def.short}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{appDef.desc}</p>
              </div>

              <div className="space-y-2">
                <Label>Intercooler</Label>
                <Select value={intercooler} onValueChange={(v) => setIntercooler(v as IntercoolerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="air-to-air">Air-to-Air (stock replacement or upgrade)</SelectItem>
                    <SelectItem value="air-to-water">Air-to-Water</SelectItem>
                    <SelectItem value="none">None (not recommended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Altitude</Label>
                <Select value={altitude} onValueChange={setAltitude}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sea Level (0 ft)</SelectItem>
                    <SelectItem value="1000">1,000 ft ({getAtmosphericPressure(1000).toFixed(1)} PSI)</SelectItem>
                    <SelectItem value="2000">2,000 ft ({getAtmosphericPressure(2000).toFixed(1)} PSI)</SelectItem>
                    <SelectItem value="3000">3,000 ft ({getAtmosphericPressure(3000).toFixed(1)} PSI)</SelectItem>
                    <SelectItem value="4226">Salt Lake City (4,226 ft — {getAtmosphericPressure(4226).toFixed(1)} PSI)</SelectItem>
                    <SelectItem value="5000">5,000 ft ({getAtmosphericPressure(5000).toFixed(1)} PSI)</SelectItem>
                    <SelectItem value="5280">Denver (5,280 ft — {getAtmosphericPressure(5280).toFixed(1)} PSI)</SelectItem>
                    <SelectItem value="5312">Albuquerque (5,312 ft — {getAtmosphericPressure(5312).toFixed(1)} PSI)</SelectItem>
                    <SelectItem value="7000">7,000 ft ({getAtmosphericPressure(7000).toFixed(1)} PSI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ambient Temp (°F)</Label>
                <Input type="number" step="5" value={ambientTemp} onChange={(e) => setAmbientTemp(e.target.value)} />
              </div>
            </CardContent>
          </Card>

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
                <div className="space-y-2">
                  <Label className="text-xs">Volumetric Efficiency % (default: {((customVe ?? estimateDieselVe(boost)) * 100).toFixed(0)}%)</Label>
                  <Input type="number" step="1" min="85" max="105" placeholder={((estimateDieselVe(boost)) * 100).toFixed(0)} value={customVeStr} onChange={(e) => setCustomVeStr(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Diesel single-turbo VE: 90-98%. Stock turbo diesel is typically 92-95%.</p>
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
                Enter your engine platform, target HP, and boost to see turbo recommendations.
              </CardContent>
            </Card>
          )}

          {valid && results && (
            <>
              {/* System Summary */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Airflow & Boost Requirements</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Required Airflow</p>
                      <p className="text-3xl font-bold text-primary">{fmt(results.totalAirflowLbMin, 1)}</p>
                      <p className="text-xs text-gray-500">lb/min ({fmt(results.totalAirflowCfm, 0)} CFM)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Pressure Ratio</p>
                      <p className="text-3xl font-bold">{fmt(results.pressureRatio, 2)}</p>
                      <p className="text-xs text-gray-500">P2c / P1c</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Target Boost</p>
                      <p className="text-3xl font-bold">{fmt(results.boostPsi, 0)}</p>
                      <p className="text-xs text-gray-500">PSI gauge</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Atmospheric</p>
                      <p className="text-3xl font-bold">{fmt(results.atmosPsi, 1)}</p>
                      <p className="text-xs text-gray-500">PSI at {alt.toLocaleString()} ft</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3">
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Comp. Outlet</p>
                      <p className={`text-lg font-bold ${results.compressorOutletTempF > 400 ? "text-red-400" : results.compressorOutletTempF > 300 ? "text-yellow-400" : "text-white"}`}>
                        {fmt(results.compressorOutletTempF, 0)}°F
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">{intercooler === "none" ? "No IC" : "Post-IC"}</p>
                      <p className={`text-lg font-bold ${results.postIcTempF > 160 ? "text-yellow-400" : "text-green-400"}`}>
                        {fmt(results.postIcTempF, 0)}°F
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Drive Pressure</p>
                      <p className={`text-lg font-bold ${results.drivePressureRatio > 1.5 ? "text-red-400" : results.drivePressureRatio > 1.0 ? "text-yellow-400" : "text-green-400"}`}>
                        {fmt(results.drivePressureRatio, 1)}:1
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Est. EGT</p>
                      <p className={`text-lg font-bold ${results.estimatedEgtF > 1300 ? "text-red-400" : results.estimatedEgtF > 1100 ? "text-yellow-400" : "text-green-400"}`}>
                        {fmt(results.estimatedEgtF, 0)}°F
                      </p>
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

              {/* Ideal Specs — what to look for */}
              <Card>
                <CardHeader>
                  <CardTitle>What to Look For</CardTitle>
                  <CardDescription>These are the ideal turbo specs for your setup — use them to evaluate any turbo, not just the ones in our database.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-[#E85D04]/10 border border-[#E85D04]/30">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Compressor Wheel</p>
                        <p className="text-2xl font-bold">{results.idealCompressorMm}mm</p>
                        <p className="text-[10px] text-muted-foreground">±3mm inducer</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Flow Range</p>
                        <p className="text-2xl font-bold">{fmt(results.idealFlowMin, 0)}-{fmt(results.idealFlowMax, 0)}</p>
                        <p className="text-[10px] text-muted-foreground">lb/min</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Pressure Ratio</p>
                        <p className="text-2xl font-bold">{fmt(results.pressureRatio, 2)}</p>
                        <p className="text-[10px] text-muted-foreground">must be in map</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Recommended A/R</p>
                        <p className="text-lg font-bold">{getArRecommendation(appDef.arBias)}</p>
                        <p className="text-[10px] text-muted-foreground">{appDef.desc}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Bearing Type</p>
                        <p className="text-lg font-bold">{appDef.spoolPriority === "high" ? "Ball bearing ideal" : "Journal or ball"}</p>
                        <p className="text-[10px] text-muted-foreground">{appDef.spoolPriority === "high" ? "Faster spool for towing response" : "Journal is fine for this application"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Turbo Matches */}
              <Card>
                <CardHeader>
                  <CardTitle>Turbo Matches</CardTitle>
                  <CardDescription>
                    Turbos matched to {fmt(results.totalAirflowLbMin, 1)} lb/min at PR {fmt(results.pressureRatio, 2)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {results.matchedTurbos.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">
                      No turbos in the database match this airflow. Use the ideal specs above to find a turbo with a ~{results.idealCompressorMm}mm compressor wheel flowing {fmt(results.idealFlowMin, 0)}-{fmt(results.idealFlowMax, 0)} lb/min.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {results.matchedTurbos.slice(0, 10).map((t, i) => {
                        const pct = ((results.totalAirflowLbMin - t.minFlow) / (t.maxFlow - t.minFlow)) * 100;
                        const isBest = i === 0;
                        const seriesColors: Record<string, string> = {
                          "Holset": "bg-green-100 text-green-700",
                          "S300": "bg-blue-100 text-blue-700",
                          "S400": "bg-purple-100 text-purple-700",
                          "Garrett": "bg-orange-100 text-orange-700",
                          "Aftermarket": "bg-yellow-100 text-yellow-700",
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
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${seriesColors[t.series] || "bg-gray-100 text-gray-700"}`}>
                                    {t.series}
                                  </span>
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {t.approxPrice}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t.compressorMm}mm compressor · {t.flange} flange · {t.bearing === "vgt" ? "VGT" : t.bearing === "ball" ? "Ball bearing" : "Journal bearing"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Flow: {t.minFlow}-{t.maxFlow} lb/min · HP: {t.minHp.toLocaleString()}-{t.maxHp.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  A/R: {t.arOptions} · Rec: {getArRecommendation(appDef.arBias)}
                                </p>
                                {t.notes && <p className="text-xs text-muted-foreground mt-1 italic">{t.notes}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">Map position</p>
                                <p className={`text-sm font-bold ${pct >= 30 && pct <= 70 ? "text-green-600" : pct >= 15 && pct <= 85 ? "text-yellow-600" : "text-red-600"}`}>
                                  {pct.toFixed(0)}%
                                </p>
                              </div>
                            </div>
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
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ──────────── UPGRADE PATH REFERENCE ──────────── */}
      <Section title="Single Turbo Upgrade Paths by Platform" open={upgradePathOpen} toggle={() => setUpgradePathOpen(!upgradePathOpen)}>
        <p className="text-sm text-muted-foreground mb-4">Common single-turbo upgrade paths. These are the turbos most people run at each power level — proven combos with good parts availability.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Platform</th>
                <th className="text-right py-2">HP Target</th>
                <th className="text-left py-2 pl-4">Turbo</th>
                <th className="text-left py-2 pl-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { platform: "12-valve Cummins", hp: "250-350", turbo: "Stock HX35",             notes: "Turn up the fuel, add a boost elbow. Done." },
                { platform: "12-valve Cummins", hp: "350-450", turbo: "Holset HX40",             notes: "The classic swap. P-pump mods + 5x0.014 nozzles." },
                { platform: "12-valve Cummins", hp: "450-550", turbo: "S362 / Phatshaft 62",     notes: "Need bigger nozzles (5x0.018+), 4K governor springs." },
                { platform: "12-valve Cummins", hp: "550-650", turbo: "S366 / Phatshaft 66",     notes: "Full-built P-pump, 5x0.020+ nozzles. Approaching single-turbo limit." },
                { platform: "5.9 Common Rail",  hp: "325-425", turbo: "Stock HE351CW + tune",    notes: "ECU tune is the first mod. Stock turbo handles it." },
                { platform: "5.9 Common Rail",  hp: "425-525", turbo: "S362 / Fleece 63mm",      notes: "Drop-in upgrade + tune. Best bang for the buck." },
                { platform: "5.9 Common Rail",  hp: "525-625", turbo: "S366 / Fleece 68mm",      notes: "Injectors + fuel pump + tune. Approaching compound territory." },
                { platform: "6.7 Cummins",      hp: "385-450", turbo: "Stock VGT + tune",        notes: "Stock turbo is capable. Just tune it." },
                { platform: "6.7 Cummins",      hp: "450-550", turbo: "S362 / aftermarket 62mm", notes: "Replace VGT with fixed-geometry. Add head studs." },
                { platform: "6.7 Cummins",      hp: "550-650", turbo: "S366 / S369",             notes: "Single-turbo limit on 6.7. Compounds recommended above this." },
                { platform: "Duramax",           hp: "360-450", turbo: "Stock VGT + tune",        notes: "LBZ/LMM stock turbo handles moderate tunes well." },
                { platform: "Duramax",           hp: "450-550", turbo: "Aftermarket 63-66mm",     notes: "Drop-in replacement. CP3 pump upgrade recommended." },
                { platform: "7.3 Powerstroke",   hp: "275-375", turbo: "GTP38R (non-VGT)",        notes: "Drop-in upgrade. Add injectors first — they're the bottleneck." },
                { platform: "7.3 Powerstroke",   hp: "375-475", turbo: "S362 / aftermarket 62mm", notes: "Requires pedestal adapter. Injectors (stage 2+) essential." },
                { platform: "6.0 Powerstroke",   hp: "325-425", turbo: "Stock VGT + tune",        notes: "Head studs first. Stock turbo can make 400-425 with tune." },
                { platform: "6.0 Powerstroke",   hp: "425-525", turbo: "Aftermarket 63-66mm VGT", notes: "Upgraded VGT or fixed-geometry swap. Injectors + FICM upgrade." },
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-medium text-xs">{row.platform}</td>
                  <td className="py-2 text-right font-bold text-xs">{row.hp}</td>
                  <td className="py-2 pl-4 text-xs">{row.turbo}</td>
                  <td className="py-2 pl-4 text-muted-foreground text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
          <strong>When to go compound:</strong> If your target HP exceeds the single-turbo range for your platform (typically 550-650 HP), a compound setup will deliver the same power with better spool, lower EGTs, and less stress on the turbo. See the <a href="/calculators/diesel-compound-turbo" className="underline font-medium">Compound Turbo Calculator</a>.
        </div>
      </Section>

      {/* ──────────── FORMULAS ──────────── */}
      <Section title="Formulas & Methodology" open={formulasOpen} toggle={() => setFormulasOpen(!formulasOpen)}>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Required Airflow (Diesel)</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Airflow (lb/min) = (Target HP x BSFC x AFR) / 60
            </code>
            <p className="mt-1">Diesel BSFC: 0.38-0.42 lb/hp-hr (much better than gasoline's ~0.55). Diesel power AFR: ~22:1 (lean burn — diesel always runs with excess air).</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Pressure Ratio</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              PR = (Atmospheric + Boost + Piping Loss) / (Atmospheric - Inlet Loss)
            </code>
            <p className="mt-1">Piping loss: 2 PSI typical. Inlet loss: 0.5 PSI (diesel air filters are usually less restrictive than gas).</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Compressor Outlet Temperature</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              T_out = T_in x (1 + (PR^0.283 - 1) / Compressor_Efficiency)
            </code>
            <p className="mt-1">Uses 72% compressor efficiency. At 30 PSI boost and 80°F ambient, expect ~280°F compressor outlet before intercooling.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Drive Pressure Ratio</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Drive Pressure Ratio = Exhaust Backpressure / Boost Pressure{"\n"}
              Ideal: {"<="} 1.0:1 · Acceptable: 1.0-1.5:1 · Too high: {">"} 2.0:1
            </code>
            <p className="mt-1">High drive pressure means the turbo is too small or the turbine housing A/R is too small. EGTs climb, power drops, turbo life shortens.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">EGT Danger Zones</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Safe: {"<"} 1,100°F · Caution: 1,100-1,300°F · Danger: {">"} 1,300°F{"\n"}
              Sustained {">"} 1,300°F will damage pistons, crack turbo housings, warp heads
            </code>
            <p className="mt-1">EGT is the most important gauge on a diesel truck. If your pyrometer hits 1,300°F under load, back off the throttle or downshift.</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <strong>Sources:</strong> BorgWarner S-series compressor maps, Holset turbo technical data, Industrial Injection turbo sizing guides, Diesel Power Source tech articles, HP Academy Practical Diesel Tuning course.
        </div>
      </Section>

      {/* ──────────── EDUCATIONAL ──────────── */}
      <Section title="Diesel Single Turbo Sizing Guide" open={educationOpen} toggle={() => setEducationOpen(!educationOpen)}>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-sm font-semibold text-foreground">How Diesel Turbo Sizing Differs from Gas</h3>
          <p>
            Diesel turbo sizing is fundamentally different from gasoline for three reasons. First, diesel engines run lean — the air-fuel ratio at full power is around 22:1, compared to 11.5:1 for gasoline. This means a diesel needs roughly double the airflow per pound of fuel. Second, diesel BSFC (brake specific fuel consumption) is much lower at 0.40 lb/hp-hr vs. 0.55 for gas — diesel converts fuel to power more efficiently. Third, diesel peak power RPM is 3,000-3,800, not 5,500-7,000. The turbo must flow all its air through a much narrower RPM window, which means spool characteristics are even more critical than on a gas engine.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Spool vs. Flow: The Diesel Tradeoff</h3>
          <p>
            Every turbo upgrade is a tradeoff between spool speed and top-end airflow. A smaller turbo (HX35, S358) spools almost instantly — perfect for towing where you need torque the moment you touch the throttle. But it runs out of air at higher power levels. A larger turbo (S366, S369) can flow enough air for 600+ HP but takes longer to spool, creating a "dead zone" below 2,000-2,500 RPM where you have no boost. For a tow rig, this dead zone is dangerous — merge onto a highway with 15,000 lbs behind you and you have no power for 2-3 seconds. For a drag truck that launches at 3,000+ RPM on the transbrake, it doesn't matter.
          </p>

          <h3 className="text-sm font-semibold text-foreground">The A/R Ratio on Diesel</h3>
          <p>
            The turbine housing A/R ratio controls how quickly exhaust gas velocity builds across the turbine wheel. Diesel engines produce massive exhaust flow at low RPM (big displacement, high VE), so they can spool larger turbos faster than a comparable gasoline engine. This is why a 66mm turbo that would be laggy on a 350ci gas V8 at 5,500 RPM can spool reasonably well on a 359ci Cummins at 3,200 RPM — the diesel has nearly 40% more exhaust energy per revolution due to higher cylinder pressure. For towing, use the smallest A/R available (0.83 on S300, 0.90 on S400). For drag/sled, go larger to reduce backpressure at peak flow.
          </p>

          <h3 className="text-sm font-semibold text-foreground">EGTs and Turbo Sizing</h3>
          <p>
            Exhaust Gas Temperature (EGT) is the primary health indicator for a diesel turbo setup. When the turbo is too small, exhaust backpressure builds up, trapping hot gas in the cylinders. This raises combustion temperatures, pushes EGTs toward 1,300°F+, and can crack pistons, warp heads, and destroy the turbo itself. An oversized turbo won't cause high EGTs (it flows more than enough), but it will have terrible spool. The goal is a turbo that flows just enough to keep EGTs under 1,100°F at your target power level while still spooling acceptably for your application.
          </p>

          <h3 className="text-sm font-semibold text-foreground">When to Go Compound</h3>
          <p>
            Single-turbo diesel builds typically max out around 550-650 HP depending on the platform. Above that, the turbo must be so large that spool time becomes unacceptable for anything other than drag racing or sled pulling. A compound (twin sequential) setup solves this by splitting the compression work between two stages — a small, fast-spooling primary and a large atmospheric turbo that adds top-end flow. If your target HP exceeds the single-turbo range, see the <a href="/calculators/diesel-compound-turbo" className="underline text-primary">Compound Turbo Calculator</a> for proper two-stage sizing.
          </p>
        </div>
      </Section>

      {/* Cross-links */}
      <div className="mt-8 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <strong>Related calculators:</strong>{" "}
        <a href="/calculators/diesel-compound-turbo" className="text-primary underline hover:text-[#E85D04]">Diesel Compound Turbo Sizing</a>
        {" · "}
        <a href="/calculators/turbo-finder" className="text-primary underline hover:text-[#E85D04]">Turbo Finder (single turbo, gas)</a>
        {" · "}
        <a href="/calculators/afr-lambda" className="text-primary underline hover:text-[#E85D04]">AFR / Lambda Converter</a>
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
              <h4 className="font-semibold text-foreground mb-1">Spool vs. Flow</h4>
              <p>Smaller turbos spool fast but run out of air. Larger turbos flow more but lag below 2,000-2,500 RPM. Tow rigs need spool; drag trucks need flow.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">EGT Safety</h4>
              <p>Safe: {"<"}1,100°F. Caution: 1,100-1,300°F. Danger: {">"}1,300°F. Sustained high EGTs crack pistons and warp heads.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">When to Go Compound</h4>
              <p>Single turbos max out around 550-650 HP. Above that, compound (twin sequential) setups split the work for better efficiency and spool.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Common Turbo Sizes</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>HX35 (stock 12v):</span><span className="font-mono">250-350 HP</span></li>
                <li className="flex justify-between"><span>HX40:</span><span className="font-mono">350-500 HP</span></li>
                <li className="flex justify-between"><span>S362:</span><span className="font-mono">400-550 HP</span></li>
                <li className="flex justify-between"><span>S366:</span><span className="font-mono">500-650 HP</span></li>
                <li className="flex justify-between"><span>S369:</span><span className="font-mono">550-700 HP</span></li>
                <li className="flex justify-between"><span>S372:</span><span className="font-mono">600-800 HP</span></li>
              </ul>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Boost Ranges</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>Stock tow:</span><span className="font-mono">20-30 PSI</span></li>
                <li className="flex justify-between"><span>Mild build:</span><span className="font-mono">30-40 PSI</span></li>
                <li className="flex justify-between"><span>Performance:</span><span className="font-mono">40-55 PSI</span></li>
                <li className="flex justify-between"><span>Race single:</span><span className="font-mono">55-70 PSI</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Diesel Single Turbo Selection</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Selecting a single turbo for a diesel engine is a balance between spool speed and top-end airflow. Diesel engines operate across a much wider fueling range than gasoline engines, and the turbo must provide adequate boost from loaded cruising at 1,800 RPM all the way through peak power at 3,000-3,500 RPM. A turbo that spools too slowly leaves the engine blowing black smoke under load while waiting for boost, which means high EGTs, wasted fuel, and accelerated wear on pistons and rings.
          </p>
          <p>
            For a Cummins 5.9L or 6.7L platform, common single turbo upgrades follow a well-established path. The stock HX35 on a 12-valve Cummins supports 250-350 HP reliably. Moving to an HX40 opens the door to 350-500 HP with good spool characteristics. The S362 and S366 BorgWarner-frame turbos push into 400-650 HP territory, with the S366 being the most popular "do everything" single turbo for tow-and-race trucks. Beyond 650 HP, single turbos struggle to maintain both spool and flow — that is where compound setups take over.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Boost and EGT Management</h3>
          <p>
            Safe exhaust gas temperatures for a diesel are below 1,100°F pre-turbo. Between 1,100-1,300°F you are in the caution zone, and above 1,300°F you risk cracking piston crowns and warping cylinder heads. Proper turbo sizing keeps EGTs manageable by ensuring the engine has enough air to burn the fuel completely. If your EGTs are high, the answer is more air (bigger turbo or compounds), not less fuel — though reducing fuel is the immediate safety measure while you plan the upgrade.
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
