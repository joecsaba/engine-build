import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Info } from "lucide-react";
import { useDieselPlatforms } from "@/hooks/useEngineData";

// ── Types ───────────────────────────────────────────────────────────────────────

type InjectorSetup = "stock" | "mild" | "performance" | "race";
type PrimaryUse = "daily" | "street" | "drag" | "competition";
type ExistingPump = "none" | "fass" | "airdog" | "other";
type FuelDistance = "standard" | "extended" | "custom";
type HpInputMode = "hp" | "mods";
type ModLevel = "stock" | "tuner" | "tuner-intake-exhaust" | "injectors-turbo" | "built";

// ── Mod-level HP estimation ─────────────────────────────────────────────────────
// Diesel truck owners often think in terms of mods rather than target HP.
// These multipliers approximate HP gains from common modification packages.

interface ModLevelDef {
  label: string;
  description: string;
  hpMultiplier: number;  // multiplier over stock HP
}

const MOD_LEVELS: Record<ModLevel, ModLevelDef> = {
  stock:                 { label: "Bone stock",                                       description: "No modifications — lift pump for reliability/preventive maintenance only", hpMultiplier: 1.0 },
  tuner:                 { label: "Tuner / programmer only",                          description: "Edge, Bully Dog, EFI Live, or similar — typically +50–100 HP",            hpMultiplier: 1.3 },
  "tuner-intake-exhaust": { label: "Tuner + intake + exhaust",                        description: "Programmer, cold air intake, 4\" or 5\" exhaust — typically +80–150 HP",  hpMultiplier: 1.5 },
  "injectors-turbo":     { label: "Upgraded injectors + turbo + tuner",               description: "Aftermarket turbo, larger injectors, full tune — typically +200–400 HP",  hpMultiplier: 2.0 },
  built:                 { label: "Built engine / compound turbos / race",            description: "Built bottom end, compounds, large injectors — 2.5×+ stock HP",           hpMultiplier: 2.8 },
};

// ── Platform database ───────────────────────────────────────────────────────────

interface PlatformDef {
  id: string;
  label: string;
  family: "cummins" | "duramax" | "powerstroke";
  displacement: number;  // liters
  stockHp: number;
  injectionPump: string;
  injectionPumpType: "ve" | "p-pump" | "vp44" | "cp3" | "cp4" | "heui";
  supplyPressurePsi: string;    // e.g. "8–12" or "14–17"
  supplyPressureMin: number;
  supplyPressureMax: number;
  stockFuelSystem: string;
  knownFailurePoints: string[];
  warningLevel: "none" | "caution" | "critical";
  warningText: string;
  fassPrefix: string;   // FASS vehicle code (e.g. "D08" for Dodge '98.5–'04.5)
  maxReasonableHp: number;
}

const HARDCODED_PLATFORMS: PlatformDef[] = [
  {
    id: "cummins-12v-ve",
    label: "1989–1993 Dodge 5.9L 12-valve Cummins (VE pump)",
    family: "cummins", displacement: 5.9, stockHp: 160,
    injectionPump: "Bosch VE rotary", injectionPumpType: "ve",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Mechanical VE rotary injection pump, mechanical lift pump on block",
    knownFailurePoints: ["Mechanical lift pump diaphragm failure", "VE pump timing pin wear"],
    warningLevel: "caution",
    warningText: "The VE pump is mechanical and relatively robust, but the factory lift pump can fail without warning. A quality aftermarket lift pump ensures consistent supply pressure and adds fuel filtration.",
    fassPrefix: "D10", maxReasonableHp: 400,
  },
  {
    id: "cummins-12v-p",
    label: "1994–1998 Dodge 5.9L 12-valve Cummins (P-pump)",
    family: "cummins", displacement: 5.9, stockHp: 215,
    injectionPump: "Bosch P7100 inline", injectionPumpType: "p-pump",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Bosch P7100 inline injection pump, mechanical lift pump on block",
    knownFailurePoints: ["Mechanical lift pump diaphragm failure", "Delivery valve seal leaks at high HP"],
    warningLevel: "none",
    warningText: "The P7100 is the most robust injection pump Cummins ever used. A lift pump upgrade improves filtration and ensures consistent supply, especially above 400 HP.",
    fassPrefix: "D10", maxReasonableHp: 800,
  },
  {
    id: "cummins-24v-vp44",
    label: "1998.5–2002 Dodge 5.9L 24-valve Cummins (VP44)",
    family: "cummins", displacement: 5.9, stockHp: 235,
    injectionPump: "Bosch VP44 electronic rotary", injectionPumpType: "vp44",
    supplyPressurePsi: "14–17", supplyPressureMin: 14, supplyPressureMax: 17,
    stockFuelSystem: "Electric lift pump in fuel module, Bosch VP44 injection pump",
    knownFailurePoints: ["Factory lift pump failure (most common failure on these trucks)", "VP44 cavitation from low supply pressure", "VP44 internal wear from air in fuel"],
    warningLevel: "critical",
    warningText: "The VP44 injection pump is the #1 failure point on '98.5–'02 Cummins trucks. It uses fuel for internal lubrication. A quality lift pump with air separation (FASS or AirDog) is considered mandatory for reliability, not just performance. Below 5 PSI supply pressure, the VP44 cavitates and dies — a $2,000–$3,000 repair.",
    fassPrefix: "D08", maxReasonableHp: 500,
  },
  {
    id: "cummins-cr-early",
    label: "2003–2004.5 Dodge 5.9L Cummins (common rail, early)",
    family: "cummins", displacement: 5.9, stockHp: 305,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Factory electric lift pump, Bosch CP3 high-pressure pump, common rail injectors",
    knownFailurePoints: ["Factory lift pump aging", "Injector connector tube erosion"],
    warningLevel: "caution",
    warningText: "The CP3 is a reliable high-pressure pump, but it benefits from clean, air-free fuel supply. A lift pump upgrade is recommended for modified trucks and is good preventive maintenance on any common rail Cummins.",
    fassPrefix: "D08", maxReasonableHp: 800,
  },
  {
    id: "cummins-cr-59",
    label: "2004.5–2007 Dodge 5.9L Cummins (common rail)",
    family: "cummins", displacement: 5.9, stockHp: 325,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Factory electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: ["Factory lift pump aging"],
    warningLevel: "caution",
    warningText: "The CP3 is a reliable high-pressure pump, but it benefits from clean, air-free fuel supply. A lift pump upgrade is recommended for modified trucks.",
    fassPrefix: "D07", maxReasonableHp: 900,
  },
  {
    id: "cummins-67",
    label: "2007.5–2018 Dodge/Ram 6.7L Cummins",
    family: "cummins", displacement: 6.7, stockHp: 370,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Factory electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: ["Factory lift pump capacity limits at high HP"],
    warningLevel: "caution",
    warningText: "The 6.7 Cummins uses a reliable CP3 pump. A lift pump upgrade is recommended above 500 HP for consistent fuel supply and air separation.",
    fassPrefix: "D07", maxReasonableHp: 1200,
  },
  {
    id: "cummins-67-1920",
    label: "2019–2020 Ram 6.7L Cummins",
    family: "cummins", displacement: 6.7, stockHp: 400,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Factory electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: ["Factory lift pump capacity limits at high HP"],
    warningLevel: "caution",
    warningText: "The 2019–2020 Cummins uses an improved factory fuel system, but a lift pump upgrade is still recommended for modified trucks above 500 HP.",
    fassPrefix: "D12", maxReasonableHp: 1200,
  },
  {
    id: "cummins-67-21plus",
    label: "2021+ Ram 6.7L Cummins",
    family: "cummins", displacement: 6.7, stockHp: 420,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Factory electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: ["Factory lift pump capacity limits at high HP"],
    warningLevel: "caution",
    warningText: "The 2021+ Cummins uses an improved factory fuel system, but a lift pump upgrade is still recommended for modified trucks above 500 HP.",
    fassPrefix: "D07", maxReasonableHp: 1200,
  },
  {
    id: "duramax-lb7",
    label: "2001–2004 Chevy/GMC 6.6L Duramax LB7",
    family: "duramax", displacement: 6.6, stockHp: 300,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "In-tank electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: ["Injector failure (most common LB7 issue)", "Factory fuel filter housing leaks"],
    warningLevel: "caution",
    warningText: "The LB7 is notorious for injector failure. A quality lift pump with water separation helps protect the injectors and CP3 pump. This is considered essential preventive maintenance.",
    fassPrefix: "C10", maxReasonableHp: 700,
  },
  {
    id: "duramax-lly",
    label: "2004.5–2005 Chevy/GMC 6.6L Duramax LLY",
    family: "duramax", displacement: 6.6, stockHp: 310,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "In-tank electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: ["Overheating under load (intake restriction)"],
    warningLevel: "caution",
    warningText: "The LLY benefits from a lift pump for improved filtration and consistent supply pressure, especially for towing and modified applications.",
    fassPrefix: "C10", maxReasonableHp: 700,
  },
  {
    id: "duramax-lbz",
    label: "2006–2007 Chevy/GMC 6.6L Duramax LBZ",
    family: "duramax", displacement: 6.6, stockHp: 360,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "In-tank electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: [],
    warningLevel: "none",
    warningText: "The LBZ is one of the most reliable Duramax platforms. A lift pump upgrade is recommended for modified trucks above 500 HP.",
    fassPrefix: "C10", maxReasonableHp: 800,
  },
  {
    id: "duramax-lmm",
    label: "2007.5–2010 Chevy/GMC 6.6L Duramax LMM",
    family: "duramax", displacement: 6.6, stockHp: 365,
    injectionPump: "Bosch CP3", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "In-tank electric lift pump, Bosch CP3, common rail injectors",
    knownFailurePoints: [],
    warningLevel: "none",
    warningText: "The LMM uses a reliable CP3. A lift pump upgrade is recommended for modified trucks above 500 HP for consistent fuel supply.",
    fassPrefix: "C10", maxReasonableHp: 800,
  },
  {
    id: "duramax-lml",
    label: "2011–2016 Chevy/GMC 6.6L Duramax LML",
    family: "duramax", displacement: 6.6, stockHp: 397,
    injectionPump: "Bosch CP4.2", injectionPumpType: "cp4",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "In-tank electric lift pump, Bosch CP4.2, common rail injectors (piezo)",
    knownFailurePoints: ["CP4.2 catastrophic failure", "Metal debris contamination of entire fuel system"],
    warningLevel: "critical",
    warningText: "The CP4.2 injection pump can fail catastrophically, sending metal debris through the fuel rails, injectors, and lines — turning a $1,500 pump failure into an $8,000–$12,000 complete fuel system replacement. A FASS or AirDog with air separation is the most important reliability mod you can do.",
    fassPrefix: "C11", maxReasonableHp: 800,
  },
  {
    id: "duramax-l5p-early",
    label: "2017–2019 Chevy/GMC 6.6L Duramax L5P",
    family: "duramax", displacement: 6.6, stockHp: 445,
    injectionPump: "Bosch CP4", injectionPumpType: "cp4",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "In-tank electric lift pump, Bosch CP4, common rail injectors",
    knownFailurePoints: ["CP4 catastrophic failure risk", "Metal debris contamination"],
    warningLevel: "critical",
    warningText: "The CP4 injection pump can fail catastrophically, sending metal debris through the entire fuel system. A FASS or AirDog with air separation is the most important reliability mod for L5P trucks — this is preventive insurance against a potentially $10,000+ repair.",
    fassPrefix: "C13", maxReasonableHp: 900,
  },
  {
    id: "duramax-l5p-late",
    label: "2020+ Chevy/GMC 6.6L Duramax L5P",
    family: "duramax", displacement: 6.6, stockHp: 445,
    injectionPump: "Bosch CP4", injectionPumpType: "cp4",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "In-tank electric lift pump, Bosch CP4, common rail injectors",
    knownFailurePoints: ["CP4 catastrophic failure risk", "Metal debris contamination"],
    warningLevel: "critical",
    warningText: "The CP4 injection pump can fail catastrophically, sending metal debris through the entire fuel system. A FASS or AirDog with air separation is the most important reliability mod for L5P trucks — this is preventive insurance against a potentially $10,000+ repair.",
    fassPrefix: "C15", maxReasonableHp: 900,
  },
  {
    id: "powerstroke-73",
    label: "1999–2003 Ford 7.3L Powerstroke",
    family: "powerstroke", displacement: 7.3, stockHp: 275,
    injectionPump: "HEUI (Hydraulic Electronic Unit Injection)", injectionPumpType: "heui",
    supplyPressurePsi: "45–65", supplyPressureMin: 45, supplyPressureMax: 65,
    stockFuelSystem: "Mechanical cam-driven fuel pump, HEUI injectors (oil-fired), fuel bowl with filter/heater",
    knownFailurePoints: ["Cam position sensor", "ICP sensor", "Under-valve-cover harness"],
    warningLevel: "caution",
    warningText: "The HEUI fuel system operates at much higher supply pressures (45–65 PSI) than Cummins or Duramax. The injectors are hydraulically actuated by engine oil pressure (500–3,000 PSI). Ensure any aftermarket lift pump is specifically rated for HEUI supply pressure requirements.",
    fassPrefix: "F14", maxReasonableHp: 600,
  },
  {
    id: "powerstroke-60",
    label: "2003–2007 Ford 6.0L Powerstroke",
    family: "powerstroke", displacement: 6.0, stockHp: 325,
    injectionPump: "HEUI (Hydraulic Electronic Unit Injection)", injectionPumpType: "heui",
    supplyPressurePsi: "45–65", supplyPressureMin: 45, supplyPressureMax: 65,
    stockFuelSystem: "Electric fuel pump module, HEUI injectors (oil-fired), fuel conditioning module",
    knownFailurePoints: ["Oil cooler failure", "EGR cooler failure", "Head gasket failure", "FICM failure"],
    warningLevel: "caution",
    warningText: "The HEUI fuel system operates at much higher supply pressures (45–65 PSI) than Cummins or Duramax. The 6.0L has many known issues beyond the fuel system — a lift pump helps with fuel quality but won't address oil cooler, EGR, or head gasket problems.",
    fassPrefix: "F14", maxReasonableHp: 600,
  },
  {
    id: "powerstroke-64",
    label: "2008–2010 Ford 6.4L Powerstroke",
    family: "powerstroke", displacement: 6.4, stockHp: 350,
    injectionPump: "Siemens/Continental piezo common rail", injectionPumpType: "cp3",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Factory electric lift pump, compound turbo, high-pressure fuel pump, piezo injectors",
    knownFailurePoints: ["DPF clogging", "Radiator cracking", "Turbo actuator failure"],
    warningLevel: "caution",
    warningText: "The 6.4L uses a common-rail-style high-pressure pump. A lift pump upgrade improves filtration and supply consistency, especially for modified applications.",
    fassPrefix: "F16", maxReasonableHp: 700,
  },
  {
    id: "powerstroke-67",
    label: "2011–2019 Ford 6.7L Powerstroke",
    family: "powerstroke", displacement: 6.7, stockHp: 475,
    injectionPump: "Bosch CP4.2", injectionPumpType: "cp4",
    supplyPressurePsi: "8–12", supplyPressureMin: 8, supplyPressureMax: 12,
    stockFuelSystem: "Factory electric lift pump, Bosch CP4.2, common rail injectors",
    knownFailurePoints: ["CP4.2 catastrophic failure risk", "Metal debris contamination"],
    warningLevel: "critical",
    warningText: "The 6.7L Powerstroke uses a CP4.2 that can fail catastrophically, sending metal shrapnel through the fuel rails, injectors, and lines. A FASS or AirDog with air separation is the most important reliability mod — it's insurance against a potentially $8,000–$12,000 fuel system replacement.",
    fassPrefix: "F17", maxReasonableHp: 1000,
  },
];

// ── Lift pump product databases ─────────────────────────────────────────────────
// GPH ratings verified against fassride.com and pureflowairdog.com (2025).
// Not all GPH ratings are available for every platform — the calculator recommends
// the closest available size. Verify exact part numbers at the manufacturer's site.

interface LiftPumpDef {
  brand: "FASS" | "AirDog";
  model: string;
  gph: number;
  maxHpSupport: number;
  series: string;
  partNumberPattern: string;
  approxPrice: string;
}

const FASS_PUMPS: LiftPumpDef[] = [
  { brand: "FASS", model: "Titanium Signature 100 GPH",  gph: 100, maxHpSupport: 600,  series: "TS", partNumberPattern: "TS{PREFIX}100G",  approxPrice: "$670–$730" },
  { brand: "FASS", model: "Titanium Signature 165 GPH",  gph: 165, maxHpSupport: 900,  series: "TS", partNumberPattern: "TS{PREFIX}165G",  approxPrice: "$730–$800" },
  { brand: "FASS", model: "Titanium Signature 250 GPH",  gph: 250, maxHpSupport: 1200, series: "TS", partNumberPattern: "TS{PREFIX}250G",  approxPrice: "$800–$900" },
  { brand: "FASS", model: "Titanium Signature 290 GPH",  gph: 290, maxHpSupport: 1500, series: "TS", partNumberPattern: "TS{PREFIX}290G",  approxPrice: "$850–$1,000" },
];

const AIRDOG_PUMPS: LiftPumpDef[] = [
  { brand: "AirDog", model: "II-5G DF-100",  gph: 100, maxHpSupport: 600,  series: "II-5G", partNumberPattern: "DF-100-5G", approxPrice: "$750–$830" },
  { brand: "AirDog", model: "II-5G DF-165",  gph: 165, maxHpSupport: 900,  series: "II-5G", partNumberPattern: "DF-165-5G", approxPrice: "$790–$870" },
  { brand: "AirDog", model: "II-5G DF-220",  gph: 220, maxHpSupport: 1200, series: "II-5G", partNumberPattern: "DF-220-5G", approxPrice: "$870–$950" },
];

// ── Injector multipliers ────────────────────────────────────────────────────────

const INJECTOR_MULTIPLIERS: Record<InjectorSetup, { label: string; multiplier: number; description: string }> = {
  stock:       { label: "Stock injectors",                         multiplier: 1.0,  description: "Factory injectors, no modifications" },
  mild:        { label: "Mildly upgraded (up to 30% over stock)",  multiplier: 1.15, description: "SAC nozzles or mild over-size" },
  performance: { label: "Performance (30–60% over stock)",         multiplier: 1.35, description: "Larger nozzles, performance injectors" },
  race:        { label: "Race injectors (60%+ over stock)",        multiplier: 1.60, description: "Race-only injectors, dual-feed, or significantly oversized" },
};

// ── Use case adjustments ────────────────────────────────────────────────────────

const USE_CASES: Record<PrimaryUse, { label: string; safetyMargin: number; description: string }> = {
  daily:       { label: "Daily driver / towing",  safetyMargin: 1.25, description: "Reliability is priority — extra headroom for sustained loads" },
  street:      { label: "Street performance",     safetyMargin: 1.20, description: "Good balance of headroom and cost" },
  drag:        { label: "Drag / sled pull",        safetyMargin: 1.15, description: "Short-duration max effort — less headroom acceptable" },
  competition: { label: "Competition only",        safetyMargin: 1.10, description: "Minimum headroom — sized for peak demand" },
};

// ── Calculation engine ──────────────────────────────────────────────────────────

interface CalcResults {
  requiredGph: number;
  requiredGphRaw: number;
  estimatedHp: number;
  bsfc: number;
  safetyMargin: number;
  recommendedFass: LiftPumpDef | null;
  recommendedAirdog: LiftPumpDef | null;
  fassHeadroomHp: number;
  airdogHeadroomHp: number;
  fuelLineSize: string;
  fuelLineSizeAn: string;
  returnLineNote: string;
  supplyPressure: string;
  needsReturnUpgrade: boolean;
  warnings: string[];
  existingPumpSufficient: boolean | null;
  existingPumpGph: number;
  platform: PlatformDef;
}

function calculate(
  platform: PlatformDef,
  targetHp: number,
  injectorSetup: InjectorSetup,
  primaryUse: PrimaryUse,
  existingPump: ExistingPump,
  existingPumpGph: number,
  fuelDistance: FuelDistance,
): CalcResults {
  const warnings: string[] = [];

  // BSFC for turbodiesel — varies by injection pump type
  const bsfcMap: Record<string, number> = {
    "ve": 0.42,
    "p-pump": 0.40,
    "vp44": 0.40,
    "cp3": 0.38,
    "cp4": 0.37,
    "heui": 0.40,
  };
  const bsfc = bsfcMap[platform.injectionPumpType] ?? 0.39;

  // Diesel fuel density: ~7.1 lb/gallon
  const fuelDensity = 7.1;

  // Base required GPH = (Target HP × BSFC) / fuelDensity
  const baseGph = (targetHp * bsfc) / fuelDensity;

  // Injector multiplier — bigger injectors demand more supply volume
  const injMultiplier = INJECTOR_MULTIPLIERS[injectorSetup].multiplier;
  const adjustedGph = baseGph * injMultiplier;

  // Safety margin based on use case
  const safetyMargin = USE_CASES[primaryUse].safetyMargin;

  // Fuel line distance penalty
  const distanceMultiplier = fuelDistance === "standard" ? 1.0 : fuelDistance === "extended" ? 1.05 : 1.10;

  const requiredGph = adjustedGph * safetyMargin * distanceMultiplier;

  // Match FASS pump — smallest pump that exceeds required GPH
  const recommendedFass = FASS_PUMPS.find(p => p.gph >= requiredGph) ?? FASS_PUMPS[FASS_PUMPS.length - 1];
  const recommendedAirdog = AIRDOG_PUMPS.find(p => p.gph >= requiredGph) ?? AIRDOG_PUMPS[AIRDOG_PUMPS.length - 1];

  // Headroom — max HP the recommended pump supports (without safety margin)
  const fassHeadroomHp = recommendedFass ? Math.round((recommendedFass.gph * fuelDensity) / (bsfc * injMultiplier * distanceMultiplier)) : 0;
  const airdogHeadroomHp = recommendedAirdog ? Math.round((recommendedAirdog.gph * fuelDensity) / (bsfc * injMultiplier * distanceMultiplier)) : 0;

  // Fuel line sizing
  let fuelLineSize: string;
  let fuelLineSizeAn: string;
  if (requiredGph <= 50) {
    fuelLineSize = 'Stock 3/8"';
    fuelLineSizeAn = "AN-6";
  } else if (requiredGph <= 75) {
    fuelLineSize = '1/2"';
    fuelLineSizeAn = "AN-8";
  } else if (requiredGph <= 100) {
    fuelLineSize = '5/8"';
    fuelLineSizeAn = "AN-10";
  } else {
    fuelLineSize = '3/4"';
    fuelLineSizeAn = "AN-12";
  }

  // Return line
  const needsReturnUpgrade = requiredGph > 60;
  const returnLineNote = needsReturnUpgrade
    ? `At ${Math.round(requiredGph)} GPH flow, upgrade the return line to at least 3/8" (AN-6). Stock 5/16" return lines will create backpressure.`
    : "Stock return line is sufficient at this flow rate.";

  // Check existing pump
  let existingPumpSufficient: boolean | null = null;
  if (existingPump !== "none" && existingPumpGph > 0) {
    existingPumpSufficient = existingPumpGph >= requiredGph;
    if (existingPumpSufficient) {
      const headroomPct = ((existingPumpGph - requiredGph) / requiredGph * 100).toFixed(0);
      warnings.push(`Your existing ${existingPumpGph} GPH pump is sufficient — ${headroomPct}% headroom above calculated requirement.`);
    } else {
      const shortfallPct = ((requiredGph - existingPumpGph) / requiredGph * 100).toFixed(0);
      warnings.push(`Your existing ${existingPumpGph} GPH pump is undersized by ~${shortfallPct}%. Upgrade recommended.`);
    }
  }

  // HP vs stock warnings
  if (targetHp > platform.stockHp * 3 && injectorSetup === "stock") {
    warnings.push(`Your stock injectors will max out well before ${targetHp} HP. Upgrade injectors before sizing a lift pump for this power level.`);
  }

  if (targetHp > platform.maxReasonableHp) {
    warnings.push(`${targetHp} HP exceeds the practical limit (~${platform.maxReasonableHp} HP) for this platform. Verify your target and ensure supporting mods (built transmission, compound turbos, built engine) are in place.`);
  }

  // VP44 no-pump warning
  if (platform.injectionPumpType === "vp44" && existingPump === "none") {
    warnings.push("CRITICAL: Running a VP44 without a quality lift pump risks pump failure ($2,000–$3,000 repair). This is the single most important mod for '98.5–'02 Cummins reliability.");
  }

  // CP4 no-pump warning
  if (platform.injectionPumpType === "cp4" && existingPump === "none") {
    warnings.push("CRITICAL: CP4-equipped trucks without a quality lift pump risk catastrophic pump failure that can contaminate the entire fuel system ($8,000–$12,000 repair).");
  }

  // High HP + stock fuel lines
  if (targetHp > 600 && fuelLineSize === 'Stock 3/8"') {
    warnings.push('Stock fuel lines will restrict flow at this power level. Upgrade to minimum 1/2" (AN-8) supply lines.');
  }

  // AirDog max GPH warning
  if (requiredGph > 220) {
    warnings.push("AirDog's largest single pump (II-5G 220 GPH) may not be sufficient. Consider FASS 250/290 GPH or a dual-pump setup.");
  }

  return {
    requiredGph,
    requiredGphRaw: adjustedGph,
    estimatedHp: targetHp,
    bsfc,
    safetyMargin,
    recommendedFass,
    recommendedAirdog,
    fassHeadroomHp,
    airdogHeadroomHp,
    fuelLineSize,
    fuelLineSizeAn,
    returnLineNote,
    supplyPressure: platform.supplyPressurePsi,
    needsReturnUpgrade,
    warnings,
    existingPumpSufficient,
    existingPumpGph,
    platform,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(val: number, d: number): string {
  return val.toFixed(d);
}

function getFassPartNumber(pump: LiftPumpDef, platform: PlatformDef): string {
  return pump.partNumberPattern.replace("{PREFIX}", platform.fassPrefix);
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function DieselLiftPumpCalculator() {
  const { data: jsonDieselPlatforms } = useDieselPlatforms();

  const PLATFORMS = useMemo(() => {
    const merged: PlatformDef[] = [...HARDCODED_PLATFORMS];
    for (const jp of jsonDieselPlatforms) {
      if (merged.find(m => m.id === jp.slug)) continue;
      merged.push({
        id: jp.slug,
        label: jp.name,
        family: (jp.engine_family?.toLowerCase().includes("cummins") ? "cummins"
          : jp.engine_family?.toLowerCase().includes("duramax") ? "duramax"
          : "powerstroke") as "cummins" | "duramax" | "powerstroke",
        displacement: (jp.displacement_ci || 0) / 61.024,
        stockHp: jp.stock_hp || 0,
        injectionPump: jp.injection_type || "Unknown",
        injectionPumpType: "cp3",
        supplyPressurePsi: jp.supply_pressure_min && jp.supply_pressure_max
          ? `${jp.supply_pressure_min}–${jp.supply_pressure_max}`
          : "8–12",
        supplyPressureMin: jp.supply_pressure_min || 8,
        supplyPressureMax: jp.supply_pressure_max || 12,
        stockFuelSystem: jp.injection_type || "Unknown",
        knownFailurePoints: [],
        warningLevel: "none",
        warningText: jp.notes || "",
        fassPrefix: "D07",
        maxReasonableHp: (jp.stock_hp || 300) * 3,
      });
    }
    return merged;
  }, [jsonDieselPlatforms]);

  const [platformId, setPlatformId] = useState(HARDCODED_PLATFORMS[2].id); // default VP44
  const [hpInputMode, setHpInputMode] = useState<HpInputMode>("mods");
  const [targetHp, setTargetHp] = useState("");
  const [modLevel, setModLevel] = useState<ModLevel>("tuner");
  const [injectorSetup, setInjectorSetup] = useState<InjectorSetup>("stock");
  const [primaryUse, setPrimaryUse] = useState<PrimaryUse>("daily");
  const [existingPump, setExistingPump] = useState<ExistingPump>("none");
  const [existingPumpGph, setExistingPumpGph] = useState("");
  const [fuelDistance, setFuelDistance] = useState<FuelDistance>("standard");

  // Collapsible sections
  const [sizingGuideOpen, setSizingGuideOpen] = useState(false);
  const [formulasOpen, setFormulasOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);

  // Resolve platform
  const platform = PLATFORMS.find(p => p.id === platformId) ?? PLATFORMS[2];

  // Resolve effective HP — from direct input or mod-level estimation
  let hp: number;
  if (hpInputMode === "hp") {
    hp = targetHp ? parseFloat(targetHp) : platform.stockHp + 100;
  } else {
    hp = Math.round(platform.stockHp * MOD_LEVELS[modLevel].hpMultiplier);
  }

  const existGph = existingPumpGph ? parseFloat(existingPumpGph) : 0;

  const valid = hp > 0;
  const results = valid
    ? calculate(platform, hp, injectorSetup, primaryUse, existingPump, existGph, fuelDistance)
    : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Diesel Lift Pump & Fuel System Sizing Calculator"
        description="Calculate the right diesel lift pump size for your Cummins, Duramax, or Powerstroke. FASS and AirDog sizing with GPH recommendations, fuel line sizing, and platform-specific warnings for VP44 and CP4 trucks."
        canonical="/calculators/diesel-lift-pump"
        keywords="diesel lift pump calculator, FASS sizing calculator, AirDog sizing, what size lift pump Cummins, diesel fuel system sizing, VP44 lift pump, CP4 lift pump, FASS Titanium Signature, diesel fuel system calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Diesel Lift Pump & Fuel System Sizing Calculator</h1>
      <p className="text-muted-foreground mb-8">Size a FASS or AirDog lift pump for your diesel truck. Pick your platform — we'll auto-fill the specs and warn you about known fuel system issues.</p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ──────────── LEFT COLUMN: INPUTS ──────────── */}
        <div className="space-y-4">

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Your Truck</CardTitle>
              <CardDescription>Select your year, make, and engine — we auto-fill injection pump type, supply pressure, and known issues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle / Engine Platform</Label>
                <Select value={platformId} onValueChange={(v) => { setPlatformId(v); setTargetHp(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__cummins_header" disabled>── Cummins ──</SelectItem>
                    {PLATFORMS.filter(p => p.family === "cummins").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                    <SelectItem value="__duramax_header" disabled>── Duramax ──</SelectItem>
                    {PLATFORMS.filter(p => p.family === "duramax").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                    <SelectItem value="__powerstroke_header" disabled>── Powerstroke ──</SelectItem>
                    {PLATFORMS.filter(p => p.family === "powerstroke").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-filled platform info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Stock HP</p>
                  <p className="font-bold">{platform.stockHp} HP</p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Injection Pump</p>
                  <p className="font-bold text-xs">{platform.injectionPump}</p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Supply Pressure</p>
                  <p className="font-bold">{platform.supplyPressurePsi} PSI</p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Displacement</p>
                  <p className="font-bold">{platform.displacement}L</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Power Target */}
          <Card>
            <CardHeader>
              <CardTitle>How Much Power?</CardTitle>
              <CardDescription>Tell us your target HP or your current mods — either works.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    hpInputMode === "mods"
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-white text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setHpInputMode("mods")}
                >
                  I know my mods
                </button>
                <button
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    hpInputMode === "hp"
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-white text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setHpInputMode("hp")}
                >
                  I know my target HP
                </button>
              </div>

              {hpInputMode === "mods" ? (
                <div className="space-y-2">
                  <Label>Modification Level</Label>
                  {(Object.entries(MOD_LEVELS) as [ModLevel, ModLevelDef][]).map(([key, val]) => (
                    <label key={key} className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${modLevel === key ? "border-[#E85D04] bg-[#E85D04]/5" : "border-gray-200 hover:border-gray-300"}`}>
                      <input
                        type="radio" name="modLevel" value={key}
                        checked={modLevel === key}
                        onChange={() => setModLevel(key)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{val.label}</span>
                        <p className="text-xs text-muted-foreground">{val.description}</p>
                      </div>
                      <span className="text-sm font-bold text-[#E85D04] whitespace-nowrap">~{Math.round(platform.stockHp * val.hpMultiplier)} HP</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Target Wheel Horsepower (with all mods)</Label>
                  <Input
                    type="number" step="25" min="100"
                    placeholder={String(platform.stockHp + 100)}
                    value={targetHp}
                    onChange={(e) => setTargetHp(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Stock: {platform.stockHp} HP · Default: {platform.stockHp + 100} HP</p>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Estimated HP for sizing</p>
                <p className="text-2xl font-bold">{hp} HP</p>
                {hpInputMode === "mods" && (
                  <p className="text-[10px] text-muted-foreground">{platform.stockHp} stock × {MOD_LEVELS[modLevel].hpMultiplier}× ({MOD_LEVELS[modLevel].label.toLowerCase()})</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Injectors & Use Case */}
          <Card>
            <CardHeader>
              <CardTitle>Fuel Demand Details</CardTitle>
              <CardDescription>Injector size and use case fine-tune the flow requirement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Injector Setup</Label>
                <Select value={injectorSetup} onValueChange={(v) => setInjectorSetup(v as InjectorSetup)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(INJECTOR_MULTIPLIERS) as [InjectorSetup, typeof INJECTOR_MULTIPLIERS[InjectorSetup]][]).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{INJECTOR_MULTIPLIERS[injectorSetup].description}</p>
              </div>

              <div className="space-y-2">
                <Label>Primary Use</Label>
                <Select value={primaryUse} onValueChange={(v) => setPrimaryUse(v as PrimaryUse)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(USE_CASES) as [PrimaryUse, typeof USE_CASES[PrimaryUse]][]).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{USE_CASES[primaryUse].description}</p>
              </div>

              <div className="space-y-2">
                <Label>Existing Lift Pump</Label>
                <Select value={existingPump} onValueChange={(v) => setExistingPump(v as ExistingPump)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / factory only</SelectItem>
                    <SelectItem value="fass">FASS (specify GPH)</SelectItem>
                    <SelectItem value="airdog">AirDog (specify GPH)</SelectItem>
                    <SelectItem value="other">Other aftermarket</SelectItem>
                  </SelectContent>
                </Select>
                {existingPump !== "none" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Current Pump GPH Rating</Label>
                    <Input
                      type="number" step="5" min="50" max="500"
                      placeholder="e.g. 150"
                      value={existingPumpGph}
                      onChange={(e) => setExistingPumpGph(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Fuel Tank to Engine Distance</Label>
                <Select value={fuelDistance} onValueChange={(v) => setFuelDistance(v as FuelDistance)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (stock location, ≤10 ft)</SelectItem>
                    <SelectItem value="extended">Extended (long bed, ≤15 ft)</SelectItem>
                    <SelectItem value="custom">Custom (flatbed/chassis cab, 15+ ft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ──────────── RIGHT COLUMN: RESULTS ──────────── */}
        <div className="space-y-4">
          {valid && results && (
            <>
              {/* Primary Result */}
              <Card className="border-2 border-[#E85D04]">
                <CardHeader className="bg-[#E85D04]/5">
                  <CardTitle>Recommended Lift Pump</CardTitle>
                  <CardDescription>Based on ~{hp} HP on {platform.label.split(" ").slice(0, 4).join(" ")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">Required Fuel Flow</p>
                    <p className="text-3xl font-bold text-[#E85D04]">{fmt(results.requiredGph, 1)} GPH</p>
                    <p className="text-xs text-muted-foreground mt-1">({fmt(results.requiredGphRaw, 1)} GPH base × {fmt(results.safetyMargin, 2)} safety margin)</p>
                  </div>

                  {/* FASS recommendation */}
                  {results.recommendedFass && (
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-blue-800">FASS</p>
                          <p className="text-lg font-bold">{results.recommendedFass.model}</p>
                          <p className="text-xs text-muted-foreground">~{getFassPartNumber(results.recommendedFass, platform)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{results.recommendedFass.gph} GPH</p>
                          <p className="text-xs text-muted-foreground">{results.recommendedFass.approxPrice}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Supports up to ~{results.fassHeadroomHp} HP before needing to step up</p>
                    </div>
                  )}

                  {/* AirDog recommendation */}
                  {results.recommendedAirdog && (
                    <div className="p-3 rounded-lg border border-green-200 bg-green-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-green-800">AirDog</p>
                          <p className="text-lg font-bold">{results.recommendedAirdog.model}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{results.recommendedAirdog.gph} GPH</p>
                          <p className="text-xs text-muted-foreground">{results.recommendedAirdog.approxPrice}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Supports up to ~{results.airdogHeadroomHp} HP before needing to step up</p>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground text-center">Part numbers are approximate — verify exact fitment for your year/model at fassride.com or pureflowairdog.com</p>
                </CardContent>
              </Card>

              {/* Fuel System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>Fuel System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Supply Pressure Required</p>
                      <p className="text-lg font-bold">{results.supplyPressure} PSI</p>
                      {platform.injectionPumpType === "vp44" && (
                        <p className="text-[10px] text-red-600 font-semibold">Below 5 PSI = VP44 death</p>
                      )}
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Recommended Supply Line</p>
                      <p className="text-lg font-bold">{results.fuelLineSize}</p>
                      <p className="text-[10px] text-muted-foreground">{results.fuelLineSizeAn}</p>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Return Line</p>
                    <p className="text-sm">{results.returnLineNote}</p>
                  </div>
                  {(platform.injectionPumpType === "vp44" || platform.injectionPumpType === "cp4") && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                      <strong>Air Separation Note:</strong> For {platform.injectionPumpType === "vp44" ? "VP44" : "CP4"}-equipped trucks, air separation is the primary reason for a lift pump — not just flow rate. Both FASS and AirDog remove air and vapor before fuel reaches the injection pump, preventing cavitation damage.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Platform Warning */}
              {platform.warningLevel !== "none" && (
                <Card className={platform.warningLevel === "critical" ? "border-red-300 bg-red-50/30" : "border-amber-300 bg-amber-50/30"}>
                  <CardHeader>
                    <CardTitle className={`text-base ${platform.warningLevel === "critical" ? "text-red-800" : "text-amber-800"}`}>
                      {platform.warningLevel === "critical" ? "Critical Platform Warning" : "Platform Advisory"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm ${platform.warningLevel === "critical" ? "text-red-700" : "text-amber-700"}`}>
                      {platform.warningText}
                    </p>
                    {platform.knownFailurePoints.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">Known failure points:</p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {platform.knownFailurePoints.map((fp, i) => (
                            <li key={i}>- {fp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Existing Pump Assessment */}
              {results.existingPumpSufficient !== null && (
                <Card className={results.existingPumpSufficient ? "border-green-300 bg-green-50/30" : "border-red-300 bg-red-50/30"}>
                  <CardHeader>
                    <CardTitle className={`text-base ${results.existingPumpSufficient ? "text-green-800" : "text-red-800"}`}>
                      {results.existingPumpSufficient ? "Your Existing Pump Is Sufficient" : "Your Existing Pump Is Undersized"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm ${results.existingPumpSufficient ? "text-green-700" : "text-red-700"}`}>
                      Your {results.existingPumpGph} GPH pump vs. {fmt(results.requiredGph, 1)} GPH required.
                      {results.existingPumpSufficient
                        ? " You have adequate headroom for this power level."
                        : " Upgrade to the recommended pump above for reliable fuel supply."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {results.warnings.length > 0 && (
                <Card className="border-amber-300">
                  <CardHeader>
                    <CardTitle className="text-base text-amber-800">Warnings & Advisories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {results.warnings.map((w, i) => (
                      <div key={i} className={`p-2 rounded text-sm ${w.startsWith("CRITICAL") ? "bg-red-50 text-red-800 border border-red-200" : w.includes("sufficient") ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                        {w}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* ──────────── COLLAPSIBLE: SIZING GUIDE ──────────── */}
      <Section title="Lift Pump Sizing Guide" open={sizingGuideOpen} toggle={() => setSizingGuideOpen(!sizingGuideOpen)}>
        <p className="text-sm text-muted-foreground mb-4">General sizing guidelines for diesel lift pumps. These are approximate — use the calculator above for your specific setup.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Target HP</th>
                <th className="text-right py-2">Required GPH</th>
                <th className="text-left py-2 pl-4">FASS Model</th>
                <th className="text-left py-2 pl-4">AirDog Model</th>
                <th className="text-left py-2 pl-4">Fuel Line</th>
              </tr>
            </thead>
            <tbody>
              {[
                { hp: "Stock–500",  gph: "25–40",  fass: "TS 100 GPH",    airdog: "II-5G DF-100",  line: 'Stock 3/8"' },
                { hp: "500–700",    gph: "40–55",  fass: "TS 165 GPH",    airdog: "II-5G DF-165",  line: 'Stock or 1/2"' },
                { hp: "700–1000",   gph: "55–80",  fass: "TS 165–250 GPH", airdog: "II-5G DF-220", line: '1/2" (AN-8)' },
                { hp: "1000–1200",  gph: "80–100", fass: "TS 250 GPH",    airdog: "Dual pump",     line: '5/8" (AN-10)' },
                { hp: "1200+",      gph: "100+",   fass: "TS 290 GPH",    airdog: "Custom",        line: '3/4" (AN-12)' },
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                  <td className="py-2 font-bold">{row.hp}</td>
                  <td className="text-right py-2">{row.gph}</td>
                  <td className="py-2 pl-4">{row.fass}</td>
                  <td className="py-2 pl-4">{row.airdog}</td>
                  <td className="py-2 pl-4 text-muted-foreground">{row.line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">FASS and AirDog GPH ratings represent pump capacity, not what the engine consumes. A 100 GPH pump on a stock truck recirculates most of its flow — the excess returns to the tank via the return line. Oversizing by one step is common practice for headroom.</p>
      </Section>

      {/* ──────────── COLLAPSIBLE: FORMULAS ──────────── */}
      <Section title="Formulas & Methodology" open={formulasOpen} toggle={() => setFormulasOpen(!formulasOpen)}>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Required Fuel Flow</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Required GPH = (Target HP x BSFC) / Fuel Density
            </code>
            <p className="mt-1">BSFC (Brake Specific Fuel Consumption) for turbodiesel engines is typically 0.37–0.42 lb/hp-hr depending on injection system efficiency. Diesel fuel density is approximately 7.1 lb/gallon.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Safety Margin</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Final GPH = Base GPH x Injector Multiplier x Safety Margin x Distance Factor
            </code>
            <p className="mt-1">Daily driver/towing adds 25% margin for sustained loads. Competition use reduces to 10% since peak demand is short-duration. Larger injectors increase fuel demand proportionally.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">BSFC by Injection Pump Type</p>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/30 rounded">VE/P-pump: 0.40–0.42</div>
              <div className="p-2 bg-muted/30 rounded">VP44: 0.40</div>
              <div className="p-2 bg-muted/30 rounded">CP3: 0.38</div>
              <div className="p-2 bg-muted/30 rounded">CP4: 0.37</div>
            </div>
            <p className="mt-1">Modern common rail systems (CP3/CP4) are more fuel-efficient than older mechanical systems, requiring slightly less fuel flow per HP.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Pump Headroom Calculation</p>
            <code className="block bg-muted/50 p-3 rounded mt-1 text-xs font-mono">
              Max HP = (Pump GPH x Fuel Density) / (BSFC x Injector Multiplier x Distance Factor)
            </code>
            <p className="mt-1">This tells you the maximum HP a given pump can support before it runs at 100% capacity with no safety margin.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Industry Rule of Thumb</p>
            <p className="mt-1">A commonly cited approximation is ~10 HP per GPH for diesel lift pump sizing. This calculator uses the more precise BSFC method above, but the 10:1 rule is a reasonable quick check.</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <strong>Sources:</strong> FASS fuel system sizing guidelines (fassride.com), AirDog/PureFlow technical documentation (pureflowairdog.com), Industrial Injection fuel system guides, Diesel Power Products technical articles, HP Academy diesel fuel system fundamentals.
        </div>
      </Section>

      {/* ──────────── EDUCATIONAL ──────────── */}
      <Section title="Understanding Diesel Fuel Systems" open={educationOpen} toggle={() => setEducationOpen(!educationOpen)}>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mt-0">Why Diesel Fuel Systems Are Different From Gas</h3>
            <p>
              Diesel injection pumps generate 3,000–29,000 PSI internally — the lift pump's job is to deliver a steady, clean, air-free supply of fuel at low pressure (8–15 PSI) so the injection pump can do its job. On gasoline cars, the fuel pump IS the high-pressure delivery system. On a diesel, it's a multi-stage system: the lift pump (Stage 1) supplies the injection pump (Stage 2), which pressurizes fuel and sends it to the injectors (Stage 3). The calculator above sizes Stage 1 based on the demands of Stages 2 and 3.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Air in Fuel Kills Diesel Injection Pumps</h3>
            <p>
              Air bubbles in diesel fuel collapse under the extreme pressures inside injection pumps, creating micro-pitting on internal surfaces through a process called cavitation. Over thousands of cycles per minute, this destroys the pump's precision-machined internals. FASS and AirDog systems are not just fuel pumps — they are Fuel Air Separation Systems that remove entrained air and water vapor before fuel reaches the injection pump. This is their primary value, especially on VP44 and CP4 platforms where the injection pump is the most expensive and failure-prone component.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">The VP44 Story</h3>
            <p>
              The '98.5–'02 Cummins trucks are legendary for VP44 injection pump failures. The factory electric lift pump lives inside the fuel tank and often fails silently — there's no dashboard warning when supply pressure drops below safe levels. When this happens, the VP44 runs on partial fuel supply, overheats internally (it uses fuel as both lubricant and coolant), and eventually dies. A VP44 replacement costs $2,000–$3,000 installed. A quality lift pump costs $650–$900. This is the single most important reliability modification for '98.5–'02 Cummins trucks, and the reason FASS and AirDog built their businesses on this platform.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">CP4 Catastrophic Failure</h3>
            <p>
              The Bosch CP4.2 injection pump (used in Duramax LML/L5P and 6.7L Powerstroke) has a known failure mode that is far worse than a typical pump failure. When a CP4 fails, it often disintegrates internally, sending metal shrapnel through the high-pressure fuel rails, into every injector, and back through the return lines. This contaminates the entire fuel system — rails, injectors, lines, and even the fuel tank. What would be a $1,500 pump replacement becomes an $8,000–$12,000 complete fuel system replacement. A quality lift pump with air and water separation significantly reduces CP4 failure risk by ensuring the pump always receives clean, air-free fuel.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">FASS vs AirDog</h3>
            <p>
              Both FASS and AirDog are proven, reputable diesel fuel system manufacturers. FASS (Fuel Air Separation System) uses a gear-driven pump design and offers models up to 290 GPH, making it the go-to for high-HP applications. AirDog (by PureFlow Technologies) uses a diaphragm pump with their patented air separation technology, with models up to 220 GPH. Both effectively remove air, water, and particulates from diesel fuel. The choice typically comes down to brand preference, specific model availability for your platform, and budget. For most applications under 700 HP, either brand will serve you well. Above 700 HP, FASS's higher-flow models give them an edge in available options.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">HEUI Systems (7.3L & 6.0L Powerstroke)</h3>
            <p>
              The 7.3L and 6.0L Powerstroke engines use a fundamentally different injection system called HEUI (Hydraulic Electronic Unit Injection). These engines use high-pressure engine oil (500–3,000 PSI via the ICP system) to hydraulically actuate the fuel injectors — the fuel supply side operates at a comparatively modest 45–65 PSI. This is much higher than the 8–15 PSI supply pressure on Cummins and Duramax trucks, so any aftermarket fuel system components must be specifically designed for HEUI applications. Both FASS and AirDog make HEUI-compatible models.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Do You Actually Need a Lift Pump?</h3>
            <p>
              Not every diesel truck needs an aftermarket lift pump. If you're running a bone-stock truck that doesn't tow heavy and you trust the factory fuel system, you may be fine with the factory pump. However, there are three scenarios where a lift pump goes from "nice to have" to "essential": (1) VP44-equipped trucks where the factory lift pump is the known weak link, (2) CP4-equipped trucks where a lift pump is insurance against catastrophic pump failure, and (3) any truck making significantly more power than stock, where the factory fuel supply can't keep up with demand. Even on stock trucks, many owners install a lift pump as preventive maintenance — the improved filtration and air separation extend the life of the injection pump and injectors.
            </p>
          </div>
        </div>
      </Section>

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
              <h4 className="font-semibold text-foreground mb-1">GPH Sizing Rule</h4>
              <p>~10 HP per GPH is the quick rule. A 500 HP truck needs at least a 50 GPH pump. Always size 20-30% over actual demand.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">VP44 Warning</h4>
              <p>98.5-02 Cummins: factory lift pump fails silently. VP44 replacement costs $2,000-$3,000. A $700 lift pump is cheap insurance.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">CP4 Catastrophic Failure</h4>
              <p>Duramax LML/L5P and 6.7L Powerstroke: CP4 failure sends metal shrapnel through the entire fuel system. $8,000-$12,000 repair vs $700-$900 lift pump.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">FASS vs AirDog</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>FASS max:</span><span className="font-mono">290 GPH</span></li>
                <li className="flex justify-between"><span>AirDog max:</span><span className="font-mono">220 GPH</span></li>
                <li className="flex justify-between"><span>FASS type:</span><span className="font-mono">Gear-driven</span></li>
                <li className="flex justify-between"><span>AirDog type:</span><span className="font-mono">Diaphragm</span></li>
              </ul>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Supply Pressure Targets</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>Cummins:</span><span className="font-mono">8-12 PSI</span></li>
                <li className="flex justify-between"><span>Duramax:</span><span className="font-mono">8-12 PSI</span></li>
                <li className="flex justify-between"><span>HEUI (7.3/6.0):</span><span className="font-mono">45-65 PSI</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Diesel Lift Pump and Fuel System Sizing</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            A lift pump's job is to supply clean, air-free fuel at a consistent pressure to the injection pump (IP). The quick sizing rule is approximately 10 HP per gallon per hour (GPH) of flow — a 500 HP truck needs at least 50 GPH. Always size 20-30% over your actual demand to account for return fuel flow and to keep the pump from running at maximum capacity, which reduces pump life and increases heat in the fuel.
          </p>
          <p>
            The two dominant aftermarket lift pump brands are FASS (gear-driven, up to 290 GPH) and AirDog (diaphragm-style, up to 220 GPH). Both include fuel filtration and air/vapor separation, which is arguably more important than the fuel delivery itself. Dissolved air and vapor in diesel fuel cause erratic injection timing, reduce power, and accelerate wear on precision injection pump components. A quality lift pump with a water separator and 2-micron filter extends the life of injectors and the injection pump significantly.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Platform-Specific Considerations</h3>
          <p>
            On 1998.5-2002 Cummins trucks with the VP44 injection pump, the factory lift pump is the notorious weak point. When it fails — often silently — the VP44 runs dry and self-destructs, costing $2,000-$3,000 to replace. A $700 aftermarket lift pump is the cheapest insurance available. On 2011+ Duramax (LML/L5P) and 2011+ Powerstroke platforms with the CP4 injection pump, a lift pump failure can lead to catastrophic CP4 disintegration, sending metal debris through the entire fuel system. That repair runs $8,000-$12,000 with new injectors, lines, rails, and tank cleaning. Again, a lift pump is inexpensive insurance against a devastating failure.
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
