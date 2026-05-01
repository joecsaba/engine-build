import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────

type DieselApplication = "tow" | "street-strip" | "drag-sled";
type IntercoolerType = "none" | "air-to-air" | "air-to-water";

// ── Engine platform data ────────────────────────────────────────────────────────

interface PlatformDef {
  label: string;
  cid: number;
  cylinders: number;
  maxRpm: number;
  stockTurbo: string;
  notes: string;
}

const PLATFORMS: Record<string, PlatformDef> = {
  "12v-cummins":    { label: "5.9L 12-Valve Cummins (6BT)",        cid: 359, cylinders: 6, maxRpm: 3200, stockTurbo: "Holset HX35",       notes: "Mechanical P-pump injection. Fuel system scales with P-pump mods + bigger nozzles, not ECU tuning." },
  "24v-cummins":    { label: "5.9L 24-Valve Cummins (ISB)",        cid: 359, cylinders: 6, maxRpm: 3400, stockTurbo: "Holset HY35W / HE351CW", notes: "Common rail injection. ECU tuning controls fuel delivery — compounds are bolt-on-and-tune." },
  "6.7-cummins":    { label: "6.7L Cummins (ISB 6.7)",             cid: 408, cylinders: 6, maxRpm: 3600, stockTurbo: "Holset HE351VE / HE300VG", notes: "Variable geometry stock turbo. Compounds replace the VGT with a fixed-geometry primary." },
  "duramax-early":  { label: "6.6L Duramax (LB7/LLY/LBZ/LMM)",    cid: 403, cylinders: 8, maxRpm: 3400, stockTurbo: "Garrett GT3788VA",   notes: "Compound kits require adapter plates and custom piping. More fabrication than Cummins." },
  "duramax-late":   { label: "6.6L Duramax (LML/L5P)",             cid: 403, cylinders: 8, maxRpm: 3500, stockTurbo: "Garrett GT3788VA / VGT", notes: "Compound kits require adapter plates and custom piping. Verify kit compatibility with year/model." },
  "7.3-powerstroke": { label: "7.3L Powerstroke",                   cid: 444, cylinders: 8, maxRpm: 3300, stockTurbo: "Garrett GTP38",      notes: "HEUI injection. Large displacement responds well to compounds but injector upgrades are essential." },
  "6.0-powerstroke": { label: "6.0L Powerstroke",                   cid: 365, cylinders: 8, maxRpm: 3600, stockTurbo: "Garrett GT3782VA",   notes: "Requires head studs before adding boost. Stock TTY head bolts fail at 25-30 PSI." },
  "6.4-powerstroke": { label: "6.4L Powerstroke",                   cid: 390, cylinders: 8, maxRpm: 3600, stockTurbo: "Compound (factory)",  notes: "Already compound from factory. Upgrading means bigger turbos in the same compound arrangement." },
  "6.7-powerstroke": { label: "6.7L Powerstroke",                   cid: 406, cylinders: 8, maxRpm: 3500, stockTurbo: "Garrett PowerMax VGT", notes: "Single VGT from factory. Compound kits available from aftermarket." },
  "custom":         { label: "Custom Engine",                       cid: 0,   cylinders: 6, maxRpm: 3400, stockTurbo: "N/A",                notes: "" },
};

// ── Application definitions ─────────────────────────────────────────────────────

interface DieselAppDef {
  label: string;
  short: string;
  arBiasPrimary: "small" | "mid";
  arBiasAtmo: "small" | "mid" | "large";
  desc: string;
  spoolPriority: "high" | "medium" | "low";
}

const APPLICATIONS: Record<DieselApplication, DieselAppDef> = {
  "tow":          { label: "Towing / Daily Driver", short: "Tow/Daily", arBiasPrimary: "small", arBiasAtmo: "small", desc: "Smallest A/R — fast spool, low-RPM torque for loaded driving", spoolPriority: "high" },
  "street-strip":  { label: "Street / Strip",       short: "Street/Strip", arBiasPrimary: "mid",   arBiasAtmo: "mid",   desc: "Mid-range A/R — balanced spool with solid top-end",         spoolPriority: "medium" },
  "drag-sled":     { label: "Drag / Sled Pull",     short: "Drag/Sled",    arBiasPrimary: "mid",   arBiasAtmo: "large", desc: "Largest A/R — max top-end flow, lag acceptable",            spoolPriority: "low" },
};

// ── Turbo databases ─────────────────────────────────────────────────────────────
// BorgWarner S-series and Holset — the dominant turbo families for diesel compounds.
// Flow numbers from published compressor maps and industry-standard references.

interface DieselTurboDef {
  name: string;
  series: "S300" | "S400" | "Holset";
  role: "primary" | "atmospheric" | "either";
  compressorMm: number;
  minFlow: number;   // lb/min
  maxFlow: number;
  minHp: number;     // as primary in a compound system
  maxHp: number;
  arOptions: string;
  flange: string;
  approxPrice: string;
}

const PRIMARY_TURBOS: DieselTurboDef[] = [
  // BorgWarner S300 series — primary (high-pressure) turbos
  { name: "BorgWarner S358",  series: "S300", role: "primary", compressorMm: 58, minFlow: 25, maxFlow: 45, minHp: 300, maxHp: 450,  arOptions: "0.83 / 1.00",        flange: "T3 / T4", approxPrice: "$600-900" },
  { name: "BorgWarner S362",  series: "S300", role: "primary", compressorMm: 62, minFlow: 30, maxFlow: 52, minHp: 350, maxHp: 550,  arOptions: "0.83 / 1.00 / 1.10", flange: "T3 / T4", approxPrice: "$650-950" },
  { name: "BorgWarner S363",  series: "S300", role: "primary", compressorMm: 63, minFlow: 32, maxFlow: 55, minHp: 375, maxHp: 575,  arOptions: "0.83 / 1.00 / 1.10", flange: "T3 / T4", approxPrice: "$650-1,000" },
  { name: "BorgWarner S366",  series: "S300", role: "primary", compressorMm: 66, minFlow: 35, maxFlow: 62, minHp: 425, maxHp: 700,  arOptions: "0.83 / 1.00 / 1.10", flange: "T3 / T4", approxPrice: "$700-1,100" },
  { name: "BorgWarner S369",  series: "S300", role: "primary", compressorMm: 69, minFlow: 40, maxFlow: 70, minHp: 500, maxHp: 800,  arOptions: "0.83 / 1.00 / 1.10", flange: "T3 / T4", approxPrice: "$750-1,100" },
  { name: "BorgWarner S372",  series: "S300", role: "primary", compressorMm: 72, minFlow: 45, maxFlow: 80, minHp: 550, maxHp: 950,  arOptions: "0.83 / 1.00 / 1.10", flange: "T3 / T4", approxPrice: "$800-1,200" },
  // Holset turbos — common Cummins primary options
  { name: "Holset HX35",     series: "Holset", role: "primary", compressorMm: 56, minFlow: 22, maxFlow: 42, minHp: 250, maxHp: 400, arOptions: "0.70 / 0.83",        flange: "T3",      approxPrice: "$200-500 (used)" },
  { name: "Holset HX40",     series: "Holset", role: "primary", compressorMm: 60, minFlow: 30, maxFlow: 55, minHp: 350, maxHp: 550, arOptions: "0.76 / 0.83 / 1.00", flange: "T3 / T4", approxPrice: "$300-700" },
  { name: "Holset HE351CW",  series: "Holset", role: "primary", compressorMm: 58, minFlow: 25, maxFlow: 50, minHp: 300, maxHp: 500, arOptions: "0.76 / 0.83",        flange: "T3",      approxPrice: "$200-450 (used)" },
  { name: "Holset HE351VE",  series: "Holset", role: "primary", compressorMm: 59, minFlow: 25, maxFlow: 48, minHp: 300, maxHp: 475, arOptions: "VGT (variable)",      flange: "T3",      approxPrice: "$250-500 (used)" },
];

const ATMOSPHERIC_TURBOS: DieselTurboDef[] = [
  // BorgWarner S400 series — atmospheric (low-pressure) turbos
  { name: "BorgWarner S467",  series: "S400", role: "atmospheric", compressorMm: 67, minFlow: 40, maxFlow: 72,  minHp: 400, maxHp: 600,  arOptions: "0.90 / 1.00 / 1.10", flange: "T4 / T6", approxPrice: "$800-1,200" },
  { name: "BorgWarner S471",  series: "S400", role: "atmospheric", compressorMm: 71, minFlow: 50, maxFlow: 85,  minHp: 500, maxHp: 750,  arOptions: "0.90 / 1.00 / 1.10", flange: "T4 / T6", approxPrice: "$850-1,300" },
  { name: "BorgWarner S475",  series: "S400", role: "atmospheric", compressorMm: 75, minFlow: 55, maxFlow: 100, minHp: 550, maxHp: 850,  arOptions: "0.90 / 1.00 / 1.10 / 1.25", flange: "T4 / T6", approxPrice: "$900-1,400" },
  { name: "BorgWarner S476",  series: "S400", role: "atmospheric", compressorMm: 76, minFlow: 60, maxFlow: 105, minHp: 600, maxHp: 900,  arOptions: "0.90 / 1.00 / 1.10 / 1.25", flange: "T4 / T6", approxPrice: "$950-1,400" },
  { name: "BorgWarner S480",  series: "S400", role: "atmospheric", compressorMm: 80, minFlow: 70, maxFlow: 120, minHp: 700, maxHp: 1100, arOptions: "1.00 / 1.10 / 1.25 / 1.32", flange: "T4 / T6", approxPrice: "$1,000-1,500" },
  { name: "BorgWarner S488",  series: "S400", role: "atmospheric", compressorMm: 88, minFlow: 90, maxFlow: 150, minHp: 900, maxHp: 1400, arOptions: "1.10 / 1.25 / 1.32",        flange: "T6",      approxPrice: "$1,200-1,800" },
];

// ── Altitude pressure ───────────────────────────────────────────────────────────

function getAtmosphericPressure(altFt: number): number {
  return 14.696 * Math.pow(1 - 0.0000068753 * altFt, 5.2559);
}

// ── Diesel VE estimation ────────────────────────────────────────────────────────
// Diesel VE ranges higher than gasoline — stock turbo diesel = 90-97%,
// modified = 95-100%, compound setups can push above 100% because the
// atmospheric charger pre-pressurizes intake for the primary.

function estimateDieselVe(application: DieselApplication, targetBoostPsi: number): number {
  // Base VE for turbo diesel
  let ve = 0.95;
  // Compound systems push VE higher with pre-pressurized intake
  if (targetBoostPsi > 40) ve = 0.98;
  if (targetBoostPsi > 60) ve = 1.00;
  if (targetBoostPsi > 80) ve = 1.02;
  if (targetBoostPsi > 100) ve = 1.04;
  // Application bias
  if (application === "drag-sled") ve += 0.02;
  return Math.min(1.05, ve);
}

// ── Calculation engine ──────────────────────────────────────────────────────────

interface CompoundCalcResults {
  // Airflow
  totalAirflowLbMin: number;
  totalAirflowCfm: number;
  // Boost & pressure ratios
  totalBoostPsi: number;
  totalPressureRatio: number;
  primaryPressureRatio: number;
  atmosphericPressureRatio: number;
  primaryBoostPsi: number;
  atmosphericBoostPsi: number;
  // Temps
  compressorOutletTempF: number;
  postIcTempF: number;
  atmoOutletTempF: number;
  primaryOutletTempF: number;
  // Intercooler
  intercoolerBtuMin: number;
  // Drive pressure
  drivePressureEstPsi: number;
  drivePressureRatio: number;
  // Ideal turbo specs (what to look for regardless of database)
  idealPrimaryMm: number;       // recommended compressor wheel diameter
  idealPrimaryFlowMin: number;  // min flow the primary should handle
  idealPrimaryFlowMax: number;  // max flow the primary should handle
  idealAtmoMm: number;
  idealAtmoFlowMin: number;
  idealAtmoFlowMax: number;
  // Turbo matches
  matchedPrimary: DieselTurboDef[];
  matchedAtmospheric: DieselTurboDef[];
  // Misc
  atmosPsi: number;
  effectiveVe: number;
  warnings: string[];
  // Recommended combos
  combos: CompoundCombo[];
}

interface CompoundCombo {
  label: string;
  primary: DieselTurboDef;
  atmospheric: DieselTurboDef;
  spoolRating: number;   // 1-5
  topEndRating: number;  // 1-5
  bestFor: string;
}

function calculateCompound(
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
  prSplitBias: number, // 0.0 = even split, positive = more work to primary, negative = more to atmospheric
): CompoundCalcResults {
  const warnings: string[] = [];

  // Atmospheric pressure at altitude
  const atmosPsi = getAtmosphericPressure(altitudeFt);

  // Diesel BSFC is much lower than gasoline — typically 0.38-0.42 lb/hp-hr
  const bsfc = 0.40;
  // Diesel AFR at power is much leaner than gasoline — 22:1 typical, 18:1 aggressive
  const afr = 22.0;

  // VE
  const ve = customVe ?? estimateDieselVe(application, targetBoostPsi);

  // Required airflow from HP target
  // Airflow (lb/min) = (HP x BSFC x AFR) / 60
  const totalAirflowLbMin = (targetHp * bsfc * afr) / 60;
  const totalAirflowCfm = totalAirflowLbMin / 0.0765;

  // Total pressure ratio
  // PR_total = (atmosPsi + boostPsi + pipingLoss) / (atmosPsi - inletLoss)
  const inletLoss = 0.5;   // PSI — compounds have shorter inlet path
  const pipingLoss = 3.0;  // PSI — compounds have more plumbing (inter-stage + charge pipe)
  const totalPR = (atmosPsi + targetBoostPsi + pipingLoss) / (atmosPsi - inletLoss);

  // Pressure ratio split: Total PR = PR_primary x PR_atmospheric
  // Default: roughly even split in PR terms (square root), biased by user slider
  const sqrtPR = Math.sqrt(totalPR);
  // Apply bias: positive = more work to primary (higher spool, less atmo work)
  const biasScale = 1 + prSplitBias * 0.15;
  let primaryPR = Math.max(1.2, sqrtPR * biasScale);
  let atmoPR = Math.max(1.1, totalPR / primaryPR);

  // Sanity: recalc so product matches
  primaryPR = totalPR / atmoPR;

  // Boost from each stage
  // Atmospheric stage: takes ambient air, compresses it
  // Atmospheric outlet pressure = atmosPsi * atmoPR
  const atmoOutletPsi = atmosPsi * atmoPR;
  const atmosphericBoostPsi = atmoOutletPsi - atmosPsi;

  // Primary stage: takes atmospheric outlet pressure, compresses further
  // Primary outlet pressure = atmoOutletPsi * primaryPR
  const primaryOutletPsi = atmoOutletPsi * primaryPR;
  const primaryBoostPsi = primaryOutletPsi - atmosPsi; // total gauge boost from primary's perspective
  // But the primary's contribution over the atmospheric stage is:
  const primaryContributionPsi = primaryOutletPsi - atmoOutletPsi;

  // Temperatures — isentropic compression with efficiency
  const tInR = ambientTempF + 459.67; // Rankine
  const compEffAtmo = 0.72;
  const compEffPrimary = 0.70; // primary runs at higher PR, slightly less efficient

  // Atmospheric stage outlet temp
  const atmoTempRiseIdeal = tInR * (Math.pow(atmoPR, 0.283) - 1);
  const atmoTempRiseActual = atmoTempRiseIdeal / compEffAtmo;
  const atmoOutletTempR = tInR + atmoTempRiseActual;
  const atmoOutletTempF = atmoOutletTempR - 459.67;

  // Primary stage outlet temp — takes atmospheric outlet temp as input
  const primaryTempRiseIdeal = atmoOutletTempR * (Math.pow(primaryPR, 0.283) - 1);
  const primaryTempRiseActual = primaryTempRiseIdeal / compEffPrimary;
  const primaryOutletTempR = atmoOutletTempR + primaryTempRiseActual;
  const primaryOutletTempF = primaryOutletTempR - 459.67;

  const compressorOutletTempF = primaryOutletTempF;

  // Post-intercooler temp
  let icEff = 0;
  if (intercooler === "air-to-air") icEff = 0.70;
  if (intercooler === "air-to-water") icEff = 0.85;
  const postIcTempF = compressorOutletTempF - icEff * (compressorOutletTempF - ambientTempF);

  // Intercooler capacity (BTU/min)
  // Q = mass_flow × Cp × delta_T
  // Cp for air ≈ 0.24 BTU/(lb·°F)
  const tempDropF = compressorOutletTempF - postIcTempF;
  const intercoolerBtuMin = totalAirflowLbMin * 0.24 * tempDropF;

  // Drive pressure estimate
  // Based on total exhaust flow through both turbine stages
  // Exhaust mass = intake air + fuel
  const exhaustFlowLbMin = totalAirflowLbMin * (1 + 1 / afr);
  // Drive pressure is roughly proportional to exhaust flow and inversely to turbine size
  // For a well-matched compound: drive pressure ≈ 0.8-1.2x boost pressure
  // For an undersized setup: can exceed 2x boost
  const drivePressureEstPsi = targetBoostPsi * (application === "tow" ? 1.1 : application === "street-strip" ? 0.95 : 0.85);
  const drivePressureRatio = targetBoostPsi > 0 ? drivePressureEstPsi / targetBoostPsi : 0;

  // Match turbos — primary (S300/Holset)
  const matchedPrimary = PRIMARY_TURBOS.filter((t) => {
    return totalAirflowLbMin >= t.minFlow * 0.80 && totalAirflowLbMin <= t.maxFlow * 1.10;
  }).sort((a, b) => {
    const midA = (a.minFlow + a.maxFlow) / 2;
    const midB = (b.minFlow + b.maxFlow) / 2;
    return Math.abs(totalAirflowLbMin - midA) - Math.abs(totalAirflowLbMin - midB);
  });

  // Match turbos — atmospheric (S400)
  // The atmospheric turbo must handle TOTAL system airflow at lower pressure
  const matchedAtmospheric = ATMOSPHERIC_TURBOS.filter((t) => {
    return totalAirflowLbMin >= t.minFlow * 0.80 && totalAirflowLbMin <= t.maxFlow * 1.10;
  }).sort((a, b) => {
    const midA = (a.minFlow + a.maxFlow) / 2;
    const midB = (b.minFlow + b.maxFlow) / 2;
    return Math.abs(totalAirflowLbMin - midA) - Math.abs(totalAirflowLbMin - midB);
  });

  // Build recommended combos
  const combos: CompoundCombo[] = [];

  // Street/tow combo — smaller primary, smaller atmospheric
  const streetPrimary = PRIMARY_TURBOS.filter(t => totalAirflowLbMin >= t.minFlow * 0.7 && totalAirflowLbMin <= t.maxFlow * 1.2)
    .sort((a, b) => a.compressorMm - b.compressorMm)[0];
  const streetAtmo = ATMOSPHERIC_TURBOS.filter(t => totalAirflowLbMin >= t.minFlow * 0.7 && totalAirflowLbMin <= t.maxFlow * 1.2)
    .sort((a, b) => a.compressorMm - b.compressorMm)[0];
  if (streetPrimary && streetAtmo) {
    combos.push({ label: "Street", primary: streetPrimary, atmospheric: streetAtmo, spoolRating: 5, topEndRating: 3, bestFor: "Towing + daily" });
  }

  // Balanced combo — middle of the range
  const balPrimary = matchedPrimary[0];
  const balAtmo = matchedAtmospheric[0];
  if (balPrimary && balAtmo && !(streetPrimary && balPrimary.name === streetPrimary.name && balAtmo.name === streetAtmo?.name)) {
    combos.push({ label: "Balanced", primary: balPrimary, atmospheric: balAtmo, spoolRating: 4, topEndRating: 4, bestFor: "Street / strip" });
  }

  // Power combo — larger primary, larger atmospheric
  const powerPrimary = PRIMARY_TURBOS.filter(t => totalAirflowLbMin >= t.minFlow * 0.6 && totalAirflowLbMin <= t.maxFlow * 1.3)
    .sort((a, b) => b.compressorMm - a.compressorMm)[0];
  const powerAtmo = ATMOSPHERIC_TURBOS.filter(t => totalAirflowLbMin >= t.minFlow * 0.6 && totalAirflowLbMin <= t.maxFlow * 1.3)
    .sort((a, b) => b.compressorMm - a.compressorMm)[0];
  if (powerPrimary && powerAtmo && !(balPrimary && powerPrimary.name === balPrimary.name && powerAtmo.name === balAtmo?.name)) {
    combos.push({ label: "Power", primary: powerPrimary, atmospheric: powerAtmo, spoolRating: 3, topEndRating: 5, bestFor: "Drag / sled pull" });
  }

  // ── Warnings ────────────────────────────────────────────────────────────────
  if (platformKey === "6.0-powerstroke" && targetHp > 500) {
    warnings.push("The 6.0L requires head studs before adding boost. Stock TTY head bolts fail at 25-30 PSI.");
  }
  if (targetBoostPsi > 80) {
    warnings.push("Above 80 PSI requires forged pistons, fire-ringed heads, and upgraded head studs/fasteners on most platforms.");
  }
  if (altitudeFt > 4000 && intercooler === "none") {
    warnings.push("At altitude, compressor outlet temps are significantly higher. An intercooler is strongly recommended.");
  }
  if (platformKey.startsWith("duramax")) {
    warnings.push("Compound kits for Duramax require adapter plates and custom piping. Verify kit compatibility with your year/model.");
  }
  if (compressorOutletTempF > 500 && intercooler === "none") {
    warnings.push(`Compressor outlet temperature of ${compressorOutletTempF.toFixed(0)}°F without intercooling is dangerously hot. An intercooler is required at this boost level.`);
  }
  if (postIcTempF > 180 && intercooler !== "none") {
    warnings.push(`Post-intercooler temp of ${postIcTempF.toFixed(0)}°F is high. Consider a larger intercooler or upgrade to air-to-water.`);
  }
  if (totalPR > 6.0) {
    warnings.push(`Total pressure ratio of ${totalPR.toFixed(2)} is extremely high. Verify your fueling and bottom-end can support this level of boost.`);
  }
  if (drivePressureRatio > 1.5) {
    warnings.push(`Estimated drive pressure ratio of ${drivePressureRatio.toFixed(1)}:1 is above ideal. Consider larger turbine housings to reduce backpressure.`);
  }
  if (matchedPrimary.length === 0) {
    warnings.push("No primary turbos in the database match this airflow requirement. Your target may require a very specialized unit.");
  }
  if (matchedAtmospheric.length === 0) {
    warnings.push("No atmospheric turbos in the database match this airflow requirement. Your target may require a very specialized unit.");
  }
  if (altitudeFt > 4000) {
    warnings.push(`At ${altitudeFt.toLocaleString()} ft elevation, the turbos work harder to compensate for thin air. Total PR is ${totalPR.toFixed(2)} vs. ${((14.696 + targetBoostPsi + pipingLoss) / (14.696 - inletLoss)).toFixed(2)} at sea level.`);
  }
  if (platformKey === "6.4-powerstroke") {
    warnings.push("The 6.4L is compound from factory. You are sizing upgraded replacement turbos for the existing compound arrangement.");
  }

  // Ideal turbo specs — derive recommended compressor wheel size from airflow
  // Approximate: compressor mm ≈ 20 + (flow_lb_min × 0.7) for S300 range,
  // with a practical range of ±15% flow window around the operating point.
  const idealPrimaryMm = Math.round(20 + totalAirflowLbMin * 0.7);
  const idealPrimaryFlowMin = totalAirflowLbMin * 0.75;
  const idealPrimaryFlowMax = totalAirflowLbMin * 1.30;
  // Atmospheric turbo should be larger — it flows the same mass at lower density
  const idealAtmoMm = Math.round(25 + totalAirflowLbMin * 0.75);
  const idealAtmoFlowMin = totalAirflowLbMin * 0.80;
  const idealAtmoFlowMax = totalAirflowLbMin * 1.40;

  return {
    totalAirflowLbMin,
    totalAirflowCfm,
    totalBoostPsi: targetBoostPsi,
    totalPressureRatio: totalPR,
    primaryPressureRatio: primaryPR,
    atmosphericPressureRatio: atmoPR,
    primaryBoostPsi: primaryContributionPsi,
    atmosphericBoostPsi,
    compressorOutletTempF,
    postIcTempF,
    atmoOutletTempF,
    primaryOutletTempF: primaryOutletTempF,
    intercoolerBtuMin,
    drivePressureEstPsi,
    drivePressureRatio,
    idealPrimaryMm,
    idealPrimaryFlowMin,
    idealPrimaryFlowMax,
    idealAtmoMm,
    idealAtmoFlowMin,
    idealAtmoFlowMax,
    matchedPrimary,
    matchedAtmospheric,
    atmosPsi,
    effectiveVe: ve,
    warnings,
    combos,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(val: number, d: number): string {
  return val.toFixed(d);
}

function stars(n: number): string {
  return "\u2605".repeat(n) + "\u2606".repeat(5 - n);
}

function getArRecommendation(bias: "small" | "mid" | "large", series: "S300" | "S400" | "Holset"): string {
  if (series === "S300" || series === "Holset") {
    if (bias === "small") return "0.83";
    return "1.00 - 1.10";
  }
  // S400
  if (bias === "small") return "0.90 - 1.00";
  if (bias === "mid") return "1.00 - 1.10";
  return "1.10 - 1.25";
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function DieselCompoundTurboCalculator() {
  // Required inputs
  const [platform, setPlatform] = useState("12v-cummins");
  const [customCid, setCustomCid] = useState("400");
  const [customCylinders, setCustomCylinders] = useState("6");
  const [targetHp, setTargetHp] = useState("600");
  const [targetBoost, setTargetBoost] = useState("50");
  const [maxRpm, setMaxRpm] = useState("3200");

  // Optional inputs
  const [altitude, setAltitude] = useState("0");
  const [ambientTemp, setAmbientTemp] = useState("80");
  const [application, setApplication] = useState<DieselApplication>("street-strip");
  const [intercooler, setIntercooler] = useState<IntercoolerType>("air-to-air");
  const [prSplitBias, setPrSplitBias] = useState("0");

  // Advanced
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customVeStr, setCustomVeStr] = useState("");

  // Collapsible sections
  const [comparisonOpen, setComparisonOpen] = useState(true);
  const [formulasOpen, setFormulasOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [referenceCombosOpen, setReferenceCombosOpen] = useState(false);

  // Resolve platform
  const plat = PLATFORMS[platform];
  const cid = platform === "custom" ? (parseFloat(customCid) || 400) : plat.cid;
  const rpm = platform === "custom" ? (parseInt(maxRpm) || 3400) : (parseInt(maxRpm) || plat.maxRpm);
  const hp = parseFloat(targetHp) || 0;
  const boost = parseFloat(targetBoost) || 0;
  const alt = parseInt(altitude) || 0;
  const temp = parseFloat(ambientTemp) || 80;
  const customVe = customVeStr ? parseFloat(customVeStr) / 100 : null;
  const bias = parseFloat(prSplitBias) || 0;

  // Auto-fill RPM on platform change
  const handlePlatformChange = (v: string) => {
    setPlatform(v);
    if (v !== "custom") {
      setMaxRpm(String(PLATFORMS[v].maxRpm));
    }
  };

  const valid = hp > 0 && cid > 0 && boost > 0 && rpm > 0;
  const results = valid
    ? calculateCompound(hp, cid, rpm, boost, application, intercooler, alt, temp, platform, customVe, bias)
    : null;

  const appDef = APPLICATIONS[application];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <SEOHead
        title="Diesel Compound Turbo Sizing Calculator"
        description="Size compound (twin) turbo setups for diesel engines. Match BorgWarner S300/S400 and Holset turbos with pressure ratio split, drive pressure, and intercooler calculations for Cummins, Duramax, and Powerstroke platforms."
        canonical="/calculators/diesel-compound-turbo"
        keywords="diesel compound turbo calculator, S300 S400 sizing, compound turbo sizing Cummins, diesel twin turbo calculator, BorgWarner S-series turbo match, Holset turbo sizing"
      />
      <h1 className="text-3xl font-bold mb-2">Diesel Compound Turbo Sizing Calculator</h1>
      <p className="text-muted-foreground mb-8">Size compound (twin) turbo setups for diesel engines. Match your primary and atmospheric turbos with real BorgWarner S-series and Holset compressor data.</p>

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
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Displacement:</span> <strong>{plat.cid} CI</strong></div>
                    <div><span className="text-muted-foreground">Cylinders:</span> <strong>{plat.cylinders}</strong></div>
                    <div><span className="text-muted-foreground">Max RPM:</span> <strong>{plat.maxRpm.toLocaleString()}</strong></div>
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
                <Input type="number" step="25" min="200" value={targetHp} onChange={(e) => setTargetHp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Target Boost (PSI)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["30", "40", "50", "60", "80", "100"].map((b) => (
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
                <Input type="number" step="5" min="20" max="150" value={targetBoost} onChange={(e) => setTargetBoost(e.target.value)} />
                <p className="text-xs text-muted-foreground">Mild compound: 30-50 PSI · Performance: 60-80 PSI · Race: 80-120+ PSI</p>
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
                <div className="flex rounded-lg border overflow-hidden">
                  {(Object.entries(APPLICATIONS) as [DieselApplication, DieselAppDef][]).map(([id, def]) => (
                    <button
                      key={id}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
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
                    <SelectItem value="air-to-air">Air-to-Air (recommended)</SelectItem>
                    <SelectItem value="air-to-water">Air-to-Water</SelectItem>
                    <SelectItem value="none">None (race only)</SelectItem>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ambient Temp (°F)</Label>
                  <Input type="number" step="5" value={ambientTemp} onChange={(e) => setAmbientTemp(e.target.value)} />
                </div>
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
                  <Label className="text-xs">Volumetric Efficiency % (default: {((customVe ?? estimateDieselVe(application, boost)) * 100).toFixed(0)}%)</Label>
                  <Input type="number" step="1" min="85" max="110" placeholder={((estimateDieselVe(application, boost)) * 100).toFixed(0)} value={customVeStr} onChange={(e) => setCustomVeStr(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Diesel compound VE: 95-105%. Compounds can exceed 100% because the atmospheric charger pre-pressurizes the primary's intake.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Pressure Ratio Split Bias</Label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.5"
                    value={prSplitBias}
                    onChange={(e) => setPrSplitBias(e.target.value)}
                    className="w-full accent-[#E85D04]"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>More atmospheric work</span>
                    <span>Even split</span>
                    <span>More primary work</span>
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
                Enter your engine platform, target HP, and boost to see compound turbo recommendations.
              </CardContent>
            </Card>
          )}

          {valid && results && (
            <>
              {/* System Summary */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader><CardTitle>System Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Total Airflow</p>
                      <p className="text-3xl font-bold text-primary">{fmt(results.totalAirflowLbMin, 1)}</p>
                      <p className="text-xs text-gray-500">lb/min ({fmt(results.totalAirflowCfm, 0)} CFM)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Total Pressure Ratio</p>
                      <p className="text-3xl font-bold">{fmt(results.totalPressureRatio, 2)}</p>
                      <p className="text-xs text-gray-500">PR_primary x PR_atmo</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Atmospheric Stage</p>
                      <p className="text-2xl font-bold">{fmt(results.atmosphericBoostPsi, 1)} PSI</p>
                      <p className="text-xs text-gray-500">PR: {fmt(results.atmosphericPressureRatio, 2)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400 text-xs">Primary Stage</p>
                      <p className="text-2xl font-bold">{fmt(results.primaryBoostPsi, 1)} PSI</p>
                      <p className="text-xs text-gray-500">PR: {fmt(results.primaryPressureRatio, 2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Comp. Outlet</p>
                      <p className={`text-lg font-bold ${results.compressorOutletTempF > 500 ? "text-red-400" : results.compressorOutletTempF > 350 ? "text-yellow-400" : "text-white"}`}>
                        {fmt(results.compressorOutletTempF, 0)}°F
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">{intercooler === "none" ? "No Intercooler" : "Post-IC Temp"}</p>
                      <p className={`text-lg font-bold ${results.postIcTempF > 180 ? "text-yellow-400" : "text-green-400"}`}>
                        {fmt(results.postIcTempF, 0)}°F
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Drive Pressure</p>
                      <p className={`text-lg font-bold ${results.drivePressureRatio > 1.5 ? "text-red-400" : results.drivePressureRatio > 1.0 ? "text-yellow-400" : "text-green-400"}`}>
                        {fmt(results.drivePressureRatio, 1)}:1
                      </p>
                    </div>
                  </div>

                  {intercooler !== "none" && (
                    <div className="mt-3 p-2 rounded bg-white/5 text-center">
                      <p className="text-gray-400 text-[10px]">Intercooler Capacity Required</p>
                      <p className="text-lg font-bold">{fmt(results.intercoolerBtuMin, 0)} BTU/min</p>
                    </div>
                  )}
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

              {/* Primary Turbo Match */}
              <Card>
                <CardHeader>
                  <CardTitle>Primary (High-Pressure) Turbo</CardTitle>
                  <CardDescription>
                    S300-series or Holset — handles total airflow at higher pressure ratio ({fmt(results.primaryPressureRatio, 2)} PR)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Ideal specs — what to look for */}
                  <div className="p-4 rounded-lg bg-[#E85D04]/10 border border-[#E85D04]/30 mb-4">
                    <p className="text-xs font-semibold text-[#E85D04] uppercase mb-2">What to look for</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Compressor Wheel</p>
                        <p className="text-lg font-bold">{results.idealPrimaryMm}mm</p>
                        <p className="text-[10px] text-muted-foreground">±3mm</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Flow Range</p>
                        <p className="text-lg font-bold">{fmt(results.idealPrimaryFlowMin, 0)}-{fmt(results.idealPrimaryFlowMax, 0)}</p>
                        <p className="text-[10px] text-muted-foreground">lb/min</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Pressure Ratio</p>
                        <p className="text-lg font-bold">{fmt(results.primaryPressureRatio, 2)}</p>
                        <p className="text-[10px] text-muted-foreground">this stage</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">A/R recommendation: {getArRecommendation(appDef.arBiasPrimary, "S300")} · Exhaust flange: T3 or T4</p>
                    <p className="text-xs text-muted-foreground">Use these specs to find any turbo that fits — the database matches below are suggestions, not your only options.</p>
                  </div>

                  {results.matchedPrimary.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No matching primary turbos in the database. Use the specs above to find a turbo from any manufacturer with a {results.idealPrimaryMm}mm class compressor wheel flowing {fmt(results.idealPrimaryFlowMin, 0)}-{fmt(results.idealPrimaryFlowMax, 0)} lb/min.</p>
                  ) : (
                    <div className="space-y-3">
                      {results.matchedPrimary.slice(0, 5).map((t, i) => {
                        const pct = ((results.totalAirflowLbMin - t.minFlow) / (t.maxFlow - t.minFlow)) * 100;
                        const isBest = i === 0;
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
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t.approxPrice}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t.compressorMm}mm compressor · {t.series} · {t.flange} flange
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Flow: {t.minFlow}-{t.maxFlow} lb/min · HP: {t.minHp.toLocaleString()}-{t.maxHp.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  A/R: {t.arOptions} · Rec: {getArRecommendation(appDef.arBiasPrimary, t.series)}
                                </p>
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

              {/* Atmospheric Turbo Match */}
              <Card>
                <CardHeader>
                  <CardTitle>Atmospheric (Low-Pressure) Turbo</CardTitle>
                  <CardDescription>
                    S400-series — handles total system airflow at lower pressure ratio ({fmt(results.atmosphericPressureRatio, 2)} PR)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Ideal specs — what to look for */}
                  <div className="p-4 rounded-lg bg-[#E85D04]/10 border border-[#E85D04]/30 mb-4">
                    <p className="text-xs font-semibold text-[#E85D04] uppercase mb-2">What to look for</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Compressor Wheel</p>
                        <p className="text-lg font-bold">{results.idealAtmoMm}mm</p>
                        <p className="text-[10px] text-muted-foreground">±4mm</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Flow Range</p>
                        <p className="text-lg font-bold">{fmt(results.idealAtmoFlowMin, 0)}-{fmt(results.idealAtmoFlowMax, 0)}</p>
                        <p className="text-[10px] text-muted-foreground">lb/min</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Pressure Ratio</p>
                        <p className="text-lg font-bold">{fmt(results.atmosphericPressureRatio, 2)}</p>
                        <p className="text-[10px] text-muted-foreground">this stage</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">A/R recommendation: {getArRecommendation(appDef.arBiasAtmo, "S400")} · Exhaust flange: T4 or T6</p>
                    <p className="text-xs text-muted-foreground">The atmospheric turbo must be larger than the primary — it handles total system airflow at intake pressure.</p>
                  </div>

                  {results.matchedAtmospheric.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No matching atmospheric turbos in the database. Use the specs above to find a turbo from any manufacturer with a {results.idealAtmoMm}mm class compressor wheel flowing {fmt(results.idealAtmoFlowMin, 0)}-{fmt(results.idealAtmoFlowMax, 0)} lb/min.</p>
                  ) : (
                    <div className="space-y-3">
                      {results.matchedAtmospheric.slice(0, 5).map((t, i) => {
                        const pct = ((results.totalAirflowLbMin - t.minFlow) / (t.maxFlow - t.minFlow)) * 100;
                        const isBest = i === 0;
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
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t.approxPrice}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t.compressorMm}mm compressor · {t.series} · {t.flange} flange
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Flow: {t.minFlow}-{t.maxFlow} lb/min · HP: {t.minHp.toLocaleString()}-{t.maxHp.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  A/R: {t.arOptions} · Rec: {getArRecommendation(appDef.arBiasAtmo, t.series)}
                                </p>
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

      {/* ──────────── COMPOUND COMBO COMPARISON TABLE ──────────── */}
      {valid && results && results.combos.length > 0 && (
        <Section title="Compound Combo Comparison" open={comparisonOpen} toggle={() => setComparisonOpen(!comparisonOpen)}>
          <p className="text-sm text-muted-foreground mb-4">Alternative compound combos ranked by application fit for {fmt(results.totalAirflowLbMin, 1)} lb/min total airflow.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Combo</th>
                  <th className="text-left py-2">Primary</th>
                  <th className="text-left py-2">Atmospheric</th>
                  <th className="text-center py-2">Spool</th>
                  <th className="text-center py-2">Top-End</th>
                  <th className="text-left py-2 pl-4">Best For</th>
                </tr>
              </thead>
              <tbody>
                {results.combos.map((combo, i) => (
                  <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                    <td className="py-2 font-bold">{combo.label}</td>
                    <td className="py-2">{combo.primary.name.replace("BorgWarner ", "").replace("Holset ", "")}</td>
                    <td className="py-2">{combo.atmospheric.name.replace("BorgWarner ", "")}</td>
                    <td className="py-2 text-center text-yellow-500">{stars(combo.spoolRating)}</td>
                    <td className="py-2 text-center text-yellow-500">{stars(combo.topEndRating)}</td>
                    <td className="py-2 pl-4 text-muted-foreground">{combo.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ──────────── REFERENCE COMBOS ──────────── */}
      <Section title="Common Diesel Compound Combos" open={referenceCombosOpen} toggle={() => setReferenceCombosOpen(!referenceCombosOpen)}>
        <p className="text-sm text-muted-foreground mb-4">Popular compound turbo combinations by platform and power level. These are starting points — exact sizing depends on altitude, fueling, and application.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Platform</th>
                <th className="text-right py-2">Target HP</th>
                <th className="text-left py-2 pl-4">Primary</th>
                <th className="text-left py-2 pl-4">Atmospheric</th>
                <th className="text-left py-2 pl-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { platform: "12-valve Cummins", hp: "500", primary: "S362", atmo: "S467", notes: "Tow rig — fast spool, reliable" },
                { platform: "12-valve Cummins", hp: "700", primary: "S366", atmo: "S475", notes: "Street/strip — most popular combo" },
                { platform: "5.9 Common Rail", hp: "600", primary: "S362", atmo: "S471", notes: "Daily + weekend warrior" },
                { platform: "6.7 Cummins",     hp: "800", primary: "S369", atmo: "S480", notes: "Performance street/strip" },
                { platform: "6.7 Cummins",     hp: "1000+", primary: "S372", atmo: "S488", notes: "Race / sled pull only" },
                { platform: "Duramax",         hp: "600", primary: "S362", atmo: "S471", notes: "With adapter — more fab required" },
                { platform: "Duramax",         hp: "1000+", primary: "S372", atmo: "S488", notes: "Race only — significant fabrication" },
                { platform: "6.4 Powerstroke", hp: "600", primary: "S362", atmo: "S471", notes: "Drop-in compound upgrade" },
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-medium">{row.platform}</td>
                  <td className="py-2 text-right font-bold">{row.hp}</td>
                  <td className="py-2 pl-4">{row.primary}</td>
                  <td className="py-2 pl-4">{row.atmo}</td>
                  <td className="py-2 pl-4 text-muted-foreground text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <p className="mt-1">Diesel BSFC is typically 0.38-0.42 lb/hp-hr (much lower than gasoline). Diesel power AFR is ~22:1 (much leaner than gasoline's ~11.5:1).</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Alternative: CFM from Displacement</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Required CFM = (CID x RPM x VE x (Boost PSI + Atmospheric PSI)) / (Atmospheric PSI x 3456)
            </code>
            <p className="mt-1">Diesel VE: stock turbo = 90-97%, modified = 95-100%, compound = 98-105%.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Compound Pressure Ratio Split</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Total PR = PR_primary x PR_atmospheric{"\n"}
              Example: 60 PSI total at sea level{"\n"}
              Total PR = (14.7 + 60 + 3) / (14.7 - 0.5) = 5.46{"\n"}
              Split: PR_atmo = sqrt(5.46) = 2.34, PR_primary = 2.34{"\n"}
              Atmo boost = 14.7 x (2.34 - 1) = ~19.7 PSI{"\n"}
              Primary adds another ~40 PSI on top of that
            </code>
            <p className="mt-1">The total pressure ratio is the product of both stages. This is more efficient than a single turbo at the same total ratio because each stage operates in a lower, more efficient region of its compressor map.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Compressor Outlet Temperature</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              T_out = T_in x (1 + (PR^0.283 - 1) / Compressor_Efficiency){"\n"}
              For compound: calculate each stage sequentially{"\n"}
              T_atmo_out = T_ambient x (1 + (PR_atmo^0.283 - 1) / 0.72){"\n"}
              T_primary_out = T_atmo_out x (1 + (PR_primary^0.283 - 1) / 0.70)
            </code>
            <p className="mt-1">At 60 PSI total boost and 70°F ambient, compound outlet can exceed 500°F before intercooling. This is why compounds need larger intercoolers than single-turbo setups.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Drive Pressure Ratio</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Drive Pressure Ratio = Exhaust Backpressure / Boost Pressure{"\n"}
              Ideal: {"<="} 1.0:1{"\n"}
              Acceptable: 1.0-1.5:1{"\n"}
              Too high: {">"} 2.0:1 (turbo too small, EGTs climb, power drops)
            </code>
          </div>
          <div>
            <p className="font-semibold text-foreground">Atmospheric Pressure at Altitude</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              P_atm = 14.696 x (1 - 0.0000068753 x altitude_ft) ^ 5.2559
            </code>
            <p className="mt-1">Denver at 5,280 ft loses ~17% atmospheric pressure. The turbos must generate a higher pressure ratio for the same gauge boost number.</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <strong>Sources:</strong> BorgWarner S-series compressor maps, Holset turbo technical data, Industrial Injection compound sizing guides, HP Academy Practical Diesel Tuning course, Diesel Power Source compound turbo tech articles.
        </div>
      </Section>

      {/* ──────────── EDUCATIONAL ──────────── */}
      <Section title="Understanding Compound Turbos for Diesel" open={educationOpen} toggle={() => setEducationOpen(!educationOpen)}>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-sm font-semibold text-foreground">How Compound Turbos Work</h3>
          <p>
            A compound turbo system uses two turbochargers in series — not parallel. The atmospheric (low-pressure) turbo takes in ambient air at ~14.7 PSI and compresses it to an intermediate pressure, say ~30 PSI. The primary (high-pressure) turbo then takes that pre-compressed 30 PSI air and compresses it further to the final target, say 60 PSI. This is fundamentally more efficient than a single turbo trying to achieve a 60 PSI pressure ratio in one stage, because each turbo operates at a lower, more efficient pressure ratio. A single turbo at 60 PSI would be operating at a pressure ratio over 5:1, which pushes most compressor maps into low-efficiency or surge regions. Two turbos splitting that work each operate around 2.3:1 — right in the heart of their efficiency islands.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Why Diesel Uses Compounds Instead of Parallel Twins</h3>
          <p>
            Gasoline engines use parallel twin-turbo setups (one turbo per bank on V-engines) because they make peak power at 6,000-8,000 RPM and need high airflow at high RPM. Diesel is different — diesel engines make peak power at 3,000-3,800 RPM and rely on massive torque rather than RPM for work. A compound setup lets the small primary turbo spool almost instantly for towing response (critical when you're pulling 15,000 lbs up a grade), while the large atmospheric turbo adds the airflow capacity needed for high horsepower at the top end. This sequential relationship gives you the best of both worlds: the drivability of a small turbo with the flow capacity of a large one.
          </p>

          <h3 className="text-sm font-semibold text-foreground">The S300/S400 Sizing Framework</h3>
          <p>
            BorgWarner's S-series naming convention makes turbo selection straightforward. The first digit is the frame size: S3XX = 300-series frame (smaller, for primary duty), S4XX = 400-series frame (larger, for atmospheric duty). The last two digits are the compressor wheel inducer diameter in millimeters. So an S366 is a 300-series frame turbo with a 66mm compressor wheel, and an S475 is a 400-series frame with a 75mm wheel. The S300 frame uses T3 or T4 exhaust flanges and is physically compact enough to fit close to the engine as the primary charger. The S400 frame uses T4 or T6 flanges and is physically larger — it mounts further from the engine as the atmospheric charger, usually with a crossover pipe connecting the two.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Drive Pressure Matters</h3>
          <p>
            Drive pressure is the exhaust backpressure upstream of the turbine. If the exhaust can't escape fast enough through the turbine housings, backpressure builds up. This pushes exhaust gas back into the cylinders during the overlap period, raises exhaust gas temperatures (EGTs), and kills power. The drive pressure ratio — exhaust backpressure divided by boost pressure — is the most important metric for compound turbo health. An ideal compound setup maintains drive pressure at or below boost pressure (1:1 ratio). A ratio of 1.0-1.5:1 is acceptable for street builds. Above 2:1 means the turbine housings are too small, EGTs will climb dangerously, and you're leaving power on the table. If your drive pressure is high, size up the turbine housings (larger A/R), not the compressor side.
          </p>

          <h3 className="text-sm font-semibold text-foreground">Platform-Specific Notes</h3>
          <div className="space-y-2">
            <p>
              <strong className="text-foreground">12-valve Cummins (6BT):</strong> Mechanical injection via the P-pump means the fuel system scales differently than common rail. You upgrade fueling with larger delivery valves, bigger nozzles, and governor spring kits — not ECU tuning. This makes 12-valve compounds a purely mechanical setup. The engine's simplicity and iron block make it extremely durable for high boost.
            </p>
            <p>
              <strong className="text-foreground">Common Rail Cummins (5.9/6.7):</strong> ECU tuning controls fuel delivery, so compounds are essentially "bolt on and tune." The common rail system provides precise fuel control that pairs well with compound boost. The 6.7L Cummins with a stock bottom end can reliably handle 700-800 HP with proper tuning and head studs.
            </p>
            <p>
              <strong className="text-foreground">Duramax:</strong> Compound kits exist but require more fabrication than Cummins. The engine's V8 layout means exhaust routing to a compound setup is more complex, and adapter plates are needed. Budget extra for custom piping and professional installation.
            </p>
            <p>
              <strong className="text-foreground">Powerstroke 6.4L:</strong> The 6.4L is already compound from the factory — it runs a small high-pressure turbo feeding into a larger low-pressure turbo from the factory. Upgrading means replacing one or both turbos with larger units in the same compound arrangement. This makes it the easiest Powerstroke to compound because the plumbing already exists.
            </p>
          </div>
        </div>
      </Section>

      {/* Cross-links */}
      <div className="mt-8 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <strong>Related calculators:</strong>{" "}
        <a href="/calculators/turbo-finder" className="text-primary underline hover:text-[#E85D04]">Turbo Finder (single turbo, gas applications)</a>
        {" · "}
        <a href="/calculators/afr-lambda" className="text-primary underline hover:text-[#E85D04]">AFR / Lambda Converter</a>
      </div>
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
