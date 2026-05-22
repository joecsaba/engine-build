import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import dieselNozzleContent from "@/data/calculatorContent/diesel-injector-nozzle-pop-pressure.mjs";

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = "mechanical" | "pop-pressure" | "common-rail";
type PrimaryUse = "daily" | "street" | "drag" | "competition";
type TurboSetup = "stock-single" | "upgraded-single" | "compound";
type PumpMod = "stock" | "mild" | "built" | "race";
type NozzleType = "SAC" | "VCO";
type HoleCount = 5 | 7;

type MechPlatform =
  | "cummins-12v-ve"
  | "cummins-12v-p"
  | "cummins-24v-vp44"
  | "other";

type CRPlatform =
  | "cummins-59-cr"
  | "cummins-67"
  | "duramax-lb7"
  | "duramax-lly-lmm"
  | "duramax-lml-l5p"
  | "powerstroke-60"
  | "powerstroke-64"
  | "powerstroke-67";

// ── Mechanical platform definitions ────────────────────────────────────────────

interface MechPlatformDef {
  label: string;
  stockNozzle: string;
  stockHoleCount: number;
  stockHoleDia: number;
  stockNopPsi: number;
  stockNopBar: number;
  pumpType: string;
  intercooledDefault: boolean;
  maxPumpHp: number;
  notes: string;
}

const MECH_PLATFORMS: Record<MechPlatform, MechPlatformDef> = {
  "cummins-12v-ve": {
    label: "5.9L 12-valve Cummins — VE pump (1989–1993)",
    stockNozzle: '5×0.012"',
    stockHoleCount: 5, stockHoleDia: 0.012,
    stockNopPsi: 3450, stockNopBar: 238,
    pumpType: "Bosch VE rotary",
    intercooledDefault: false,
    maxPumpHp: 350,
    notes: "The VE pump is a rotary distributor pump with limited fuel delivery capacity. Nozzle upgrades beyond 5×0.014\" usually require a P-pump conversion for adequate fuel supply.",
  },
  "cummins-12v-p": {
    label: "5.9L 12-valve Cummins — P7100 pump (1994–1998)",
    stockNozzle: '5×0.012"',
    stockHoleCount: 5, stockHoleDia: 0.012,
    stockNopPsi: 3550, stockNopBar: 245,
    pumpType: "Bosch P7100 inline",
    intercooledDefault: true,
    maxPumpHp: 800,
    notes: "The P7100 is the most upgradeable mechanical injection pump. With governor springs, delivery valves, and a fuel plate, it can support 800+ HP with appropriate nozzles.",
  },
  "cummins-24v-vp44": {
    label: "5.9L 24-valve Cummins — VP44 (1998.5–2002)",
    stockNozzle: '5×0.012"',
    stockHoleCount: 5, stockHoleDia: 0.012,
    stockNopPsi: 4350, stockNopBar: 300,
    pumpType: "Bosch VP44 electronic rotary",
    intercooledDefault: true,
    maxPumpHp: 500,
    notes: "The VP44 is electronically controlled with limited fuel delivery vs the P-pump. Nozzles larger than 5×0.016\" typically exceed VP44 capacity. Consider common rail conversion for higher HP targets.",
  },
  other: {
    label: "Other mechanical diesel (custom specs)",
    stockNozzle: "Varies",
    stockHoleCount: 5, stockHoleDia: 0.012,
    stockNopPsi: 3550, stockNopBar: 245,
    pumpType: "Varies",
    intercooledDefault: true,
    maxPumpHp: 600,
    notes: "Enter your engine's stock nozzle specs manually. These defaults use P-pump 12-valve baselines.",
  },
};

// ── Nozzle sizing table ────────────────────────────────────────────────────────
// HP ranges represent community consensus from Scheid Diesel, Industrial Injection,
// DAP, Dynomite Diesel, Power Driven Diesel, and cumminsforum.com.
// Assumes a 6-cylinder engine (5.9L Cummins). 4BT users should reduce HP by ~33%.

interface NozzleSize {
  holeCount: number;
  holeDia: number;
  label: string;
  flowAreaSqIn: number;
  flowAreaMm2: number;
  hpMin: number;
  hpMax: number;
  popPsiMin: number;
  popPsiMax: number;
  bestFor: string;
  turboMatch: string;
}

function calcFlowArea(holes: number, dia: number): { sqIn: number; mm2: number } {
  const r = dia / 2;
  const sqIn = holes * Math.PI * r * r;
  const diaMm = dia * 25.4;
  const rMm = diaMm / 2;
  const mm2 = holes * Math.PI * rMm * rMm;
  return { sqIn, mm2 };
}

function spread(holes: number, dia: number) {
  const a = calcFlowArea(holes, dia);
  return { flowAreaSqIn: a.sqIn, flowAreaMm2: a.mm2 };
}

// 5-hole nozzle table (standard Cummins)
const NOZZLE_5HOLE: NozzleSize[] = [
  { holeCount: 5, holeDia: 0.010, label: '5×0.010"', ...spread(5, 0.010), hpMin: 160, hpMax: 200, popPsiMin: 3450, popPsiMax: 3550, bestFor: "Mild upgrade over stock", turboMatch: "Stock HX35" },
  { holeCount: 5, holeDia: 0.012, label: '5×0.012" (stock)', ...spread(5, 0.012), hpMin: 180, hpMax: 250, popPsiMin: 3450, popPsiMax: 3550, bestFor: "Stock replacement", turboMatch: "Stock HX35" },
  { holeCount: 5, holeDia: 0.013, label: '5×0.013"', ...spread(5, 0.013), hpMin: 250, hpMax: 300, popPsiMin: 3550, popPsiMax: 3900, bestFor: "Mild daily upgrade", turboMatch: "HX35 / HX40" },
  { holeCount: 5, holeDia: 0.014, label: '5×0.014"', ...spread(5, 0.014), hpMin: 280, hpMax: 350, popPsiMin: 3900, popPsiMax: 4200, bestFor: "Tow build, first mods", turboMatch: "HX40 / 62–65mm" },
  { holeCount: 5, holeDia: 0.015, label: '5×0.015" (marine)', ...spread(5, 0.015), hpMin: 350, hpMax: 400, popPsiMin: 4000, popPsiMax: 4350, bestFor: "Tow / marine", turboMatch: "HX40 / 64–68mm" },
  { holeCount: 5, holeDia: 0.016, label: '5×0.016"', ...spread(5, 0.016), hpMin: 400, hpMax: 500, popPsiMin: 4200, popPsiMax: 4500, bestFor: "Street performance", turboMatch: "S362–S366 / 66–71mm" },
  { holeCount: 5, holeDia: 0.018, label: '5×0.018"', ...spread(5, 0.018), hpMin: 500, hpMax: 650, popPsiMin: 4500, popPsiMax: 4800, bestFor: "Street / strip", turboMatch: "S366–S400 / S467" },
  { holeCount: 5, holeDia: 0.020, label: '5×0.020"', ...spread(5, 0.020), hpMin: 600, hpMax: 800, popPsiMin: 4800, popPsiMax: 5000, bestFor: "Drag / sled pull", turboMatch: "S475+ / compounds" },
  { holeCount: 5, holeDia: 0.022, label: '5×0.022"', ...spread(5, 0.022), hpMin: 750, hpMax: 950, popPsiMin: 5000, popPsiMax: 5200, bestFor: "Race", turboMatch: "Compounds required" },
  { holeCount: 5, holeDia: 0.024, label: '5×0.024"', ...spread(5, 0.024), hpMin: 900, hpMax: 1200, popPsiMin: 5000, popPsiMax: 5500, bestFor: "Competition", turboMatch: "Large compounds" },
];

// 7-hole nozzle table — finer atomization, cleaner burn, slightly higher flow
// per total area vs 5-hole at same hole diameter
const NOZZLE_7HOLE: NozzleSize[] = [
  { holeCount: 7, holeDia: 0.008, label: '7×0.008"', ...spread(7, 0.008), hpMin: 180, hpMax: 230, popPsiMin: 3450, popPsiMax: 3550, bestFor: "Stock-equivalent, cleaner burn", turboMatch: "Stock HX35" },
  { holeCount: 7, holeDia: 0.010, label: '7×0.010"', ...spread(7, 0.010), hpMin: 250, hpMax: 350, popPsiMin: 3550, popPsiMax: 4000, bestFor: "≈ 5×0.012 flow, better atomization", turboMatch: "HX35 / HX40" },
  { holeCount: 7, holeDia: 0.012, label: '7×0.012"', ...spread(7, 0.012), hpMin: 350, hpMax: 450, popPsiMin: 4000, popPsiMax: 4300, bestFor: "≈ 5×0.014 flow, finer spray", turboMatch: "HX40 / 64–68mm" },
  { holeCount: 7, holeDia: 0.014, label: '7×0.014"', ...spread(7, 0.014), hpMin: 450, hpMax: 600, popPsiMin: 4200, popPsiMax: 4600, bestFor: "≈ 5×0.017 flow, performance", turboMatch: "S362–S366 / 66–71mm" },
  { holeCount: 7, holeDia: 0.016, label: '7×0.016"', ...spread(7, 0.016), hpMin: 600, hpMax: 800, popPsiMin: 4500, popPsiMax: 5000, bestFor: "≈ 5×0.019 flow, race", turboMatch: "S400+ / compounds" },
];

// ── Turbo airflow capacity (approximate HP of airflow by setup) ────────────────

const TURBO_AIRFLOW_HP: Record<TurboSetup, number> = {
  "stock-single": 350,
  "upgraded-single": 600,
  compound: 1200,
};

// ── Pop pressure recommendation logic ──────────────────────────────────────────

function recommendPopPressure(
  platform: MechPlatform,
  holeDia: number,
  use: PrimaryUse,
  pumpMod: PumpMod,
): { psi: number; bar: number; shimNote: string } {
  const plat = MECH_PLATFORMS[platform];
  const stockPsi = plat.stockNopPsi;

  // Base: scale pop pressure with nozzle size increase
  const sizeRatio = holeDia / 0.012;
  let basePsi = stockPsi * (0.7 + 0.3 * sizeRatio);

  // Application bias
  const useBias: Record<PrimaryUse, number> = {
    daily: 200,
    street: 100,
    drag: -100,
    competition: -200,
  };
  basePsi += useBias[use];

  // Pump mod bias
  const pumpBias: Record<PumpMod, number> = {
    stock: 0,
    mild: 100,
    built: 250,
    race: 400,
  };
  basePsi += pumpBias[pumpMod];

  basePsi = Math.max(stockPsi, Math.min(5500, basePsi));
  basePsi = Math.round(basePsi / 50) * 50;

  const bar = Math.round(basePsi / 14.504);

  const psiDiff = basePsi - stockPsi;
  let shimNote: string;
  if (Math.abs(psiDiff) < 100) {
    shimNote = "Stock shim thickness is appropriate — no change needed.";
  } else {
    const shimMm = (psiDiff / 150) * 0.1;
    if (shimMm > 0) {
      shimNote = `Add approximately ${shimMm.toFixed(1)}mm shim thickness to increase NOP from stock ${stockPsi.toLocaleString()} PSI to recommended ${basePsi.toLocaleString()} PSI.`;
    } else {
      shimNote = `Remove approximately ${Math.abs(shimMm).toFixed(1)}mm shim thickness to decrease NOP from stock ${stockPsi.toLocaleString()} PSI to recommended ${basePsi.toLocaleString()} PSI.`;
    }
  }

  return { psi: basePsi, bar, shimNote };
}

// ── Common rail injector data ──────────────────────────────────────────────────

interface CRInjectorTier {
  name: string;
  hpRange: string;
  notes: string;
}

interface CRPlatformDef {
  label: string;
  stockHp: number;
  sizingConvention: string;
  tiers: CRInjectorTier[];
  brands: string[];
}

const CR_PLATFORMS: Record<CRPlatform, CRPlatformDef> = {
  "cummins-59-cr": {
    label: "5.9L Cummins Common Rail (2003–2007)",
    stockHp: 325,
    sizingConvention: "% over stock flow",
    tiers: [
      { name: "Stock", hpRange: "305–325 HP", notes: "Factory injectors" },
      { name: "50% over", hpRange: "400–500 HP", notes: "Good daily driver upgrade with tune" },
      { name: "100% over", hpRange: "500–650 HP", notes: "Requires supporting mods (turbo, lift pump)" },
      { name: "150% over", hpRange: "650–800 HP", notes: "Built transmission recommended" },
      { name: "200% over", hpRange: "800–1000 HP", notes: "Full build — compounds, built trans, lift pump" },
    ],
    brands: ["Industrial Injection", "Exergy Performance", "DDP (Dynomite Diesel)", "S&S Diesel"],
  },
  "cummins-67": {
    label: "6.7L Cummins (2007.5+)",
    stockHp: 370,
    sizingConvention: "% over stock flow",
    tiers: [
      { name: "Stock", hpRange: "350–400 HP", notes: "Factory injectors" },
      { name: "60% over", hpRange: "500–600 HP", notes: "Popular tow/street upgrade" },
      { name: "100% over", hpRange: "600–750 HP", notes: "Requires turbo upgrade and built trans" },
      { name: "150% over", hpRange: "750–900 HP", notes: "Full build required" },
      { name: "200% over", hpRange: "900–1100 HP", notes: "Competition — full build, compounds" },
    ],
    brands: ["Industrial Injection", "Exergy Performance", "S&S Diesel", "DDP"],
  },
  "duramax-lb7": {
    label: "6.6L Duramax LB7 (2001–2004)",
    stockHp: 300,
    sizingConvention: "% over stock flow",
    tiers: [
      { name: "Stock", hpRange: "300 HP", notes: "Factory injectors — prone to failure" },
      { name: "30% over", hpRange: "380–420 HP", notes: "Most common replacement upgrade" },
      { name: "50% over", hpRange: "420–500 HP", notes: "Requires supporting mods" },
      { name: "100% over", hpRange: "500–650 HP", notes: "Built trans, turbo upgrade required" },
    ],
    brands: ["Exergy Performance", "Industrial Injection", "Bosch reman"],
  },
  "duramax-lly-lmm": {
    label: "6.6L Duramax LLY/LBZ/LMM (2004.5–2010)",
    stockHp: 360,
    sizingConvention: "% over stock flow",
    tiers: [
      { name: "Stock", hpRange: "310–365 HP", notes: "Factory injectors" },
      { name: "30% over", hpRange: "420–480 HP", notes: "Mild performance upgrade" },
      { name: "45% over", hpRange: "480–550 HP", notes: "Requires supporting mods" },
      { name: "100% over", hpRange: "550–700 HP", notes: "Full build with turbo and trans upgrades" },
    ],
    brands: ["Exergy Performance", "Industrial Injection", "S&S Diesel"],
  },
  "duramax-lml-l5p": {
    label: "6.6L Duramax LML/L5P (2011+)",
    stockHp: 445,
    sizingConvention: "% over stock flow",
    tiers: [
      { name: "Stock", hpRange: "397–445 HP", notes: "Factory piezo injectors" },
      { name: "30% over", hpRange: "500–580 HP", notes: "Popular street upgrade" },
      { name: "45% over", hpRange: "580–650 HP", notes: "Turbo upgrade recommended" },
      { name: "100% over", hpRange: "650–850 HP", notes: "Full build — compounds, built trans" },
    ],
    brands: ["Exergy Performance", "S&S Diesel", "Industrial Injection"],
  },
  "powerstroke-60": {
    label: "6.0L Powerstroke (2003–2007)",
    stockHp: 325,
    sizingConvention: "cc rating",
    tiers: [
      { name: "Stock 175cc", hpRange: "325 HP", notes: "Factory HEUI injectors" },
      { name: "190cc", hpRange: "375–425 HP", notes: "Mild upgrade — no other changes needed" },
      { name: "205cc", hpRange: "425–475 HP", notes: "Turbo upgrade recommended" },
      { name: "225cc", hpRange: "475–525 HP", notes: "Requires turbo, head studs recommended" },
      { name: "238cc", hpRange: "525–575 HP", notes: "Built trans, head studs required" },
      { name: "250cc", hpRange: "575–650 HP", notes: "Full build — studs, turbo, trans" },
    ],
    brands: ["Full Force Diesel", "Swamp's Diesel", "Warren Diesel"],
  },
  "powerstroke-64": {
    label: "6.4L Powerstroke (2008–2010)",
    stockHp: 350,
    sizingConvention: "% over stock flow",
    tiers: [
      { name: "Stock", hpRange: "350 HP", notes: "Factory piezo injectors" },
      { name: "30% over", hpRange: "425–475 HP", notes: "Mild upgrade with tune" },
      { name: "50% over", hpRange: "475–550 HP", notes: "Turbo upgrade recommended" },
      { name: "75% over", hpRange: "550–650 HP", notes: "Full build recommended" },
    ],
    brands: ["Full Force Diesel", "Industrial Injection", "Warren Diesel"],
  },
  "powerstroke-67": {
    label: "6.7L Powerstroke (2011+)",
    stockHp: 475,
    sizingConvention: "% over stock flow",
    tiers: [
      { name: "Stock", hpRange: "440–475 HP", notes: "Factory piezo injectors" },
      { name: "30% over", hpRange: "550–625 HP", notes: "Popular street upgrade" },
      { name: "50% over", hpRange: "625–750 HP", notes: "Built trans recommended" },
      { name: "100% over", hpRange: "750–950 HP", notes: "Full build — compounds, trans, etc." },
    ],
    brands: ["Full Force Diesel", "Exergy Performance", "S&S Diesel", "Industrial Injection"],
  },
};

// ── Warning generation ─────────────────────────────────────────────────────────

interface Warning {
  level: "red" | "yellow" | "green";
  message: string;
}

function getMechWarnings(
  platform: MechPlatform,
  holeDia: number,
  turbo: TurboSetup,
  targetHp: number,
  nozzleType: NozzleType,
  intercooled: boolean,
  sprayAngle: number,
  pumpMod: PumpMod,
  nozzleTable: NozzleSize[],
): Warning[] {
  const warnings: Warning[] = [];
  const plat = MECH_PLATFORMS[platform];
  const turboHp = TURBO_AIRFLOW_HP[turbo];
  const nozzle = nozzleTable.find(n => n.holeDia === holeDia);
  const nozzleHpMax = nozzle?.hpMax ?? targetHp;

  // Air/fuel match
  if (nozzleHpMax > turboHp * 1.3) {
    warnings.push({
      level: "red",
      message: `These nozzles can deliver fuel for ~${nozzleHpMax} HP, but your ${turbo === "stock-single" ? "stock HX35 turbo" : turbo === "upgraded-single" ? "upgraded single turbo" : "compound turbos"} only supports ~${turboHp} HP of airflow. You'll make smoke, not power. Upgrade the turbo first.`,
    });
  } else if (nozzleHpMax > turboHp) {
    warnings.push({
      level: "yellow",
      message: `Your nozzles can deliver slightly more fuel than your turbo setup can efficiently burn. Expect mild smoke under full throttle until boost catches up.`,
    });
  } else {
    warnings.push({
      level: "green",
      message: `Air and fuel are well-matched. Your turbo setup should provide adequate airflow for these nozzles.`,
    });
  }

  // Spray angle mismatch warning
  if (sprayAngle === 155 && !intercooled) {
    warnings.push({
      level: "red",
      message: `155° (marine) spray angle nozzles in a non-intercooled engine will spray fuel outside the piston bowl, causing high EGTs, smoke, and poor combustion. Use 145° nozzles for non-intercooled engines.`,
    });
  }
  if (sprayAngle === 145 && intercooled && holeDia >= 0.016) {
    warnings.push({
      level: "yellow",
      message: `Intercooled engines typically benefit from 155° spray angle at this nozzle size for better air utilization with denser charge air. Consider 155° nozzles unless your piston bowl is specifically designed for 145°.`,
    });
  }

  // VCO durability at large sizes
  if (nozzleType === "VCO" && holeDia >= 0.016) {
    warnings.push({
      level: "yellow",
      message: `VCO nozzles at this size can have durability issues — the needle must seal each hole individually. SAC nozzles are more durable and widely preferred for performance applications above 5×0.014".`,
    });
  }

  // VP44 limit
  if (platform === "cummins-24v-vp44" && holeDia > 0.016) {
    warnings.push({
      level: "red",
      message: `The VP44 has limited fuel delivery capacity compared to a P-pump. Nozzles larger than 5×0.016" may exceed VP44 fueling ability. Consider a common rail conversion for higher HP targets.`,
    });
  }

  // VE pump limit
  if (platform === "cummins-12v-ve" && holeDia > 0.014) {
    warnings.push({
      level: "red",
      message: `The VE pump is a rotary distributor pump with very limited fuel output. Nozzles larger than 5×0.014" will likely exceed VE pump capacity. Consider a P7100 pump swap.`,
    });
  }

  // Stock turbo + big nozzles
  if (holeDia > 0.016 && turbo === "stock-single") {
    warnings.push({
      level: "yellow",
      message: `These nozzles will over-fuel a stock turbo. Upgrade to at minimum an HX40-class turbo before installing these nozzles.`,
    });
  }

  // Large nozzle lift pump warning
  if (holeDia >= 0.020) {
    warnings.push({
      level: "yellow",
      message: `Nozzles this large require significant fuel flow. Ensure you have a quality lift pump (FASS 165+ GPH or AirDog 165+ GPH) for reliable fuel supply.`,
    });
  }

  // Pump capacity vs pop pressure
  const popEst = recommendPopPressure(platform, holeDia, "street", pumpMod);
  if (popEst.psi > 4800 && pumpMod === "stock") {
    warnings.push({
      level: "yellow",
      message: `A stock injection pump may not reliably deliver fuel at the recommended pop pressure (${popEst.psi.toLocaleString()} PSI). Ensure your pump is in good condition or upgraded.`,
    });
  }

  // Pump capacity vs target HP
  if (targetHp > plat.maxPumpHp) {
    warnings.push({
      level: "yellow",
      message: `Target HP of ${targetHp} exceeds the typical maximum capacity of the ${plat.pumpType} (~${plat.maxPumpHp} HP). Ensure your pump is fully built for this power level.`,
    });
  }

  return warnings;
}

// ── Nozzle recommendation logic ────────────────────────────────────────────────

function recommendNozzle(targetHp: number, use: PrimaryUse, table: NozzleSize[]): NozzleSize | null {
  const biasMap: Record<PrimaryUse, number> = {
    daily: -0.2,
    street: 0,
    drag: 0.2,
    competition: 0.3,
  };
  const bias = biasMap[use];

  for (const nozzle of table) {
    const mid = (nozzle.hpMin + nozzle.hpMax) / 2;
    const adjustedMid = mid * (1 + bias);
    if (targetHp <= adjustedMid || nozzle === table[table.length - 1]) {
      return nozzle;
    }
  }
  return table[table.length - 1];
}

// ── 5-hole to 7-hole equivalency ───────────────────────────────────────────────

function find7HoleEquivalent(fiveHoleNozzle: NozzleSize): NozzleSize | null {
  // Find the 7-hole nozzle with the closest total flow area
  let closest: NozzleSize | null = null;
  let closestDiff = Infinity;
  for (const n of NOZZLE_7HOLE) {
    const diff = Math.abs(n.flowAreaSqIn - fiveHoleNozzle.flowAreaSqIn);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = n;
    }
  }
  return closest;
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const USE_LABELS: Record<PrimaryUse, string> = {
  daily: "Daily driver / towing",
  street: "Street performance",
  drag: "Drag / sled pull",
  competition: "Competition only",
};

const TURBO_LABELS: Record<TurboSetup, string> = {
  "stock-single": "Stock single turbo (HX35 class)",
  "upgraded-single": "Upgraded single turbo (HX40 / S363–S366)",
  compound: "Compound turbos",
};

const PUMP_MOD_LABELS: Record<PumpMod, string> = {
  stock: "Stock pump",
  mild: "Mildly modified (fuel plate, springs)",
  built: "Built pump (4,000+ RPM governor, delivery valves)",
  race: "Race pump",
};

const MODE_LABELS: Record<Mode, string> = {
  mechanical: "Mechanical Nozzle Sizing",
  "pop-pressure": "Pop Pressure Calculator",
  "common-rail": "Common Rail Injector Reference",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function DieselInjectorNozzlePopPressureCalculator() {
  // Mode
  const [mode, setMode] = useState<Mode>("mechanical");

  // Shared state
  const [platform, setPlatform] = useState<MechPlatform>("cummins-12v-p");
  const [targetHp, setTargetHp] = useBuildField("diesel.targetHp", "400");
  const [use, setUse] = useState<PrimaryUse>("street");
  const { activeBuild, setField: setBuildField } = useBuildContext();

  // Mechanical mode
  const [turbo, setTurbo] = useState<TurboSetup>("upgraded-single");
  const [intercooled, setIntercooled] = useState(true);
  const [holeCount, setHoleCount] = useState<HoleCount>(5);
  const [nozzleType, setNozzleType] = useState<NozzleType>("SAC");
  const [pumpMod, setPumpMod] = useState<PumpMod>("mild");
  const [sprayAngle, setSprayAngle] = useState<145 | 155>(155);

  // Pop pressure mode
  const [popHoleCount, setPopHoleCount] = useState<HoleCount>(5);
  const [popNozzleSizeIdx, setPopNozzleSizeIdx] = useState("3"); // default 5×0.014
  const [popPumpMod, setPopPumpMod] = useState<PumpMod>("mild");

  // Common rail mode
  const [crPlatform, setCrPlatform] = useState<CRPlatform>("cummins-59-cr");

  // Collapsible sections
  const [sizingTableOpen, setSizingTableOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);

  // Auto-fill intercooled and spray angle based on platform
  useEffect(() => {
    const plat = MECH_PLATFORMS[platform];
    setIntercooled(plat.intercooledDefault);
    setSprayAngle(plat.intercooledDefault ? 155 : 145);
  }, [platform]);

  const hp = parseInt(targetHp) || 400;
  const platDef = MECH_PLATFORMS[platform];

  // Active nozzle table based on hole count selection
  const activeTable = holeCount === 7 ? NOZZLE_7HOLE : NOZZLE_5HOLE;
  const popTable = popHoleCount === 7 ? NOZZLE_7HOLE : NOZZLE_5HOLE;

  // ── Mechanical mode calculations ──
  const recommended = useMemo(() => recommendNozzle(hp, use, activeTable), [hp, use, activeTable]);

  const sevenHoleEquiv = useMemo(() => {
    if (!recommended || holeCount !== 5) return null;
    return find7HoleEquivalent(recommended);
  }, [recommended, holeCount]);

  const mechWarnings = useMemo(() => {
    if (!recommended) return [];
    return getMechWarnings(platform, recommended.holeDia, turbo, hp, nozzleType, intercooled, sprayAngle, pumpMod, activeTable);
  }, [platform, recommended, turbo, hp, nozzleType, intercooled, sprayAngle, pumpMod, activeTable]);

  const mechPopPressure = useMemo(() => {
    if (!recommended) return { psi: 0, bar: 0, shimNote: "" };
    return recommendPopPressure(platform, recommended.holeDia, use, pumpMod);
  }, [platform, recommended, use, pumpMod]);

  // ── Pop pressure mode calculations ──
  const popNozzle = popTable[parseInt(popNozzleSizeIdx)] || popTable[0];
  const popResult = useMemo(
    () => recommendPopPressure(platform, popNozzle.holeDia, use, popPumpMod),
    [platform, popNozzle, use, popPumpMod],
  );

  // Write computed values to build context
  useEffect(() => {
    if (activeBuild && recommended) {
      setBuildField("computed.dieselNozzleSize", recommended.label);
      setBuildField("computed.dieselPopPressure", `${mechPopPressure.psi} PSI`);
    }
  }, [recommended, mechPopPressure.psi, activeBuild?.id]);

  // ── Air/fuel match color ──
  function airFuelColor(warnings: Warning[]): string {
    const airFuel = warnings.find(w => w.message.includes("airflow") || w.message.includes("well-matched") || w.message.includes("slightly more"));
    if (!airFuel) return "border-gray-200";
    if (airFuel.level === "green") return "border-green-400 bg-green-50/30";
    if (airFuel.level === "yellow") return "border-yellow-400 bg-yellow-50/30";
    return "border-red-400 bg-red-50/30";
  }

  // Reset pop nozzle index when hole count changes to avoid out-of-bounds
  useEffect(() => {
    setPopNozzleSizeIdx("0");
  }, [popHoleCount]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Diesel Injector Nozzle & Pop Pressure Calculator"
        description="Diesel nozzle sizing calculator for Cummins P-pump, VE, and VP44 engines. 5-hole and 7-hole nozzle support, SAC vs VCO selection, pop pressure recommendation, turbo match, air/fuel assessment, and common rail injector reference."
        canonical="/calculators/diesel-injector-nozzle-pop-pressure"
        keywords="diesel nozzle sizing calculator, Cummins injector nozzle size, pop pressure calculator, 12 valve Cummins nozzle upgrade, diesel injector pop off pressure, 5x016 nozzle HP, P-pump nozzle sizing, 7 hole nozzle, SAC vs VCO nozzle"
      />

      <h1 className="text-3xl font-bold mb-1">Diesel Injector Nozzle & Pop Pressure</h1>
      <p className="text-muted-foreground mb-6">
        Size mechanical diesel nozzles, calculate pop-off pressure, or look up common rail injector sizing. Built for Cummins P-pump, VE, and VP44 builders.
      </p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      {/* ── Mode Toggle ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 bg-muted rounded-lg p-1 mb-8 w-fit">
        {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "text-muted-foreground hover:text-[#1a1a1a]"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MECHANICAL NOZZLE SIZING MODE
         ══════════════════════════════════════════════════════════════════ */}
      {mode === "mechanical" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* ── Inputs ── */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Engine Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as MechPlatform)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MECH_PLATFORMS) as MechPlatform[]).map(k => (
                      <SelectItem key={k} value={k}>{MECH_PLATFORMS[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Stock: {platDef.stockNozzle} · NOP: {platDef.stockNopPsi.toLocaleString()} PSI ({platDef.stockNopBar} bar)
                </p>
              </div>

              <div className="space-y-1">
                <Label>Target Horsepower</Label>
                <Input type="number" step={25} value={targetHp} onChange={e => setTargetHp(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Primary Use</Label>
                <Select value={use} onValueChange={(v) => setUse(v as PrimaryUse)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(USE_LABELS) as PrimaryUse[]).map(k => (
                      <SelectItem key={k} value={k}>{USE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Hole Count</Label>
                <div className="flex gap-2">
                  {([5, 7] as HoleCount[]).map(h => (
                    <button
                      key={h}
                      onClick={() => setHoleCount(h)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                        holeCount === h ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {h}-hole
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {holeCount === 5
                    ? "Standard for Cummins — coarser spray, burns well at lower RPM"
                    : "Finer atomization, cleaner burn — popular on higher-RPM and performance builds"}
                </p>
              </div>

              <div className="space-y-1">
                <Label>Nozzle Type</Label>
                <div className="flex gap-2">
                  {(["SAC", "VCO"] as NozzleType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setNozzleType(t)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                        nozzleType === t ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {nozzleType === "SAC"
                    ? "Sac hole — fuel reservoir below needle, better flow, preferred for performance"
                    : "Valve covered orifice — cleaner cutoff at idle, stock-type design"}
                </p>
              </div>

              <div className="space-y-1">
                <Label>Spray Angle</Label>
                <div className="flex gap-2">
                  {([145, 155] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setSprayAngle(a)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                        sprayAngle === a ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {a}°
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sprayAngle === 145
                    ? "Standard — narrower spray cone, for non-intercooled or stock piston bowls"
                    : "Marine / intercooled — wider spray cone, better air utilization with dense charge air"}
                </p>
              </div>

              <div className="space-y-1">
                <Label>Current Turbo Setup</Label>
                <Select value={turbo} onValueChange={(v) => setTurbo(v as TurboSetup)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TURBO_LABELS) as TurboSetup[]).map(k => (
                      <SelectItem key={k} value={k}>{TURBO_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Injection Pump Modifications</Label>
                <Select value={pumpMod} onValueChange={(v) => setPumpMod(v as PumpMod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PUMP_MOD_LABELS) as PumpMod[]).map(k => (
                      <SelectItem key={k} value={k}>{PUMP_MOD_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Affects pop pressure recommendation — built pumps can support higher NOP</p>
              </div>

              <div className="space-y-1">
                <Label>Intercooled</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIntercooled(true)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      intercooled ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setIntercooled(false)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      !intercooled ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Results ── */}
          <div className="lg:col-span-2 space-y-4">
            {recommended && (
              <>
                {/* Main recommendation */}
                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Recommended Nozzle Setup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Nozzle Size</p>
                        <p className="text-2xl font-bold text-[#E85D04]">{recommended.label}</p>
                        <p className="text-xs text-gray-400">{nozzleType} · {sprayAngle}°</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">HP Support</p>
                        <p className="text-xl font-bold">{recommended.hpMin}–{recommended.hpMax} HP</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Turbo Match</p>
                        <p className="text-lg font-bold">{recommended.turboMatch}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Flow Area</p>
                        <p className="text-lg font-bold tabular-nums">{recommended.flowAreaSqIn.toFixed(6)} sq.in.</p>
                        <p className="text-xs text-gray-400">{recommended.flowAreaMm2.toFixed(3)} mm²</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Pop Pressure</p>
                        <p className="text-lg font-bold tabular-nums text-[#E85D04]">{mechPopPressure.psi.toLocaleString()} PSI</p>
                        <p className="text-xs text-gray-400">{mechPopPressure.bar} bar</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Best For</p>
                        <p className="text-lg font-bold">{recommended.bestFor}</p>
                      </div>
                    </div>

                    {/* 7-hole equivalency note */}
                    {sevenHoleEquiv && (
                      <div className="mt-4 pt-3 border-t border-gray-700">
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold text-[#E85D04]">7-hole equivalent:</span> {sevenHoleEquiv.label} has similar total flow area ({sevenHoleEquiv.flowAreaSqIn.toFixed(6)} sq.in.) with finer atomization and a cleaner burn pattern.
                        </p>
                      </div>
                    )}

                    {/* Shim note */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold text-white">Shim Adjustment:</span> {mechPopPressure.shimNote}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Pop pressure should be verified using a nozzle pop tester. Set all injectors to within ±50 PSI of each other for even cylinder balance.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Air/Fuel Match + Warnings */}
                <Card className={airFuelColor(mechWarnings)}>
                  <CardHeader>
                    <CardTitle className="text-base">Warnings & Advisories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {mechWarnings.map((w, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded text-sm ${
                          w.level === "red"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : w.level === "yellow"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-green-50 text-green-800 border border-green-200"
                        }`}
                      >
                        {w.level === "green" ? (
                          <Info className="w-4 h-4 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        )}
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Platform notes */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Platform Notes:</span> {platDef.notes}
                    </p>
                  </CardContent>
                </Card>

                {/* Cross-links */}
                <div className="flex flex-wrap gap-2 text-sm">
                  <Link href="/calculators/diesel-lift-pump" className="text-[#E85D04] hover:underline">Lift Pump Calculator →</Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/calculators/diesel-compound-turbo" className="text-[#E85D04] hover:underline">Compound Turbo Sizing →</Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/calculators/diesel-egt-drive-pressure" className="text-[#E85D04] hover:underline">EGT & Drive Pressure →</Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          POP PRESSURE CALCULATOR MODE
         ══════════════════════════════════════════════════════════════════ */}
      {mode === "pop-pressure" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Engine Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as MechPlatform)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MECH_PLATFORMS) as MechPlatform[]).map(k => (
                      <SelectItem key={k} value={k}>{MECH_PLATFORMS[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Hole Count</Label>
                <div className="flex gap-2">
                  {([5, 7] as HoleCount[]).map(h => (
                    <button
                      key={h}
                      onClick={() => setPopHoleCount(h)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                        popHoleCount === h ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {h}-hole
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Current Nozzle Size</Label>
                <Select value={popNozzleSizeIdx} onValueChange={setPopNozzleSizeIdx}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {popTable.map((n, i) => (
                      <SelectItem key={i} value={String(i)}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Application</Label>
                <Select value={use} onValueChange={(v) => setUse(v as PrimaryUse)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(USE_LABELS) as PrimaryUse[]).map(k => (
                      <SelectItem key={k} value={k}>{USE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Injection Pump Modifications</Label>
                <Select value={popPumpMod} onValueChange={(v) => setPopPumpMod(v as PumpMod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PUMP_MOD_LABELS) as PumpMod[]).map(k => (
                      <SelectItem key={k} value={k}>{PUMP_MOD_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader>
                <CardTitle className="text-lg">Pop Pressure Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Nozzle</p>
                    <p className="text-xl font-bold">{popNozzle.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Stock NOP</p>
                    <p className="text-xl font-bold">{platDef.stockNopPsi.toLocaleString()} PSI ({platDef.stockNopBar} bar)</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Recommended NOP</p>
                    <p className="text-3xl font-bold text-[#E85D04]">{popResult.psi.toLocaleString()} PSI</p>
                    <p className="text-sm text-gray-400">{popResult.bar} bar</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-white">Shim Adjustment:</span> {popResult.shimNote}
                  </p>
                </div>

                <div className="mt-3 p-3 rounded bg-gray-800 text-xs text-gray-400">
                  <span className="font-semibold text-gray-300">Testing Procedure:</span> Pop pressure should be verified using a nozzle pop tester. Set all injectors to within ±50 PSI of each other for even cylinder balance. Adjust by adding or removing shims — thicker shim = higher pop pressure.
                </div>
              </CardContent>
            </Card>

            {/* Pop pressure explanation */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#E85D04]" />
                    <p><strong className="text-foreground">Higher pop pressure</strong> = fuel enters at higher velocity = better atomization = cleaner burn with less smoke. Recommended when increasing nozzle size to maintain spray quality.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#E85D04]" />
                    <p><strong className="text-foreground">Too-high pop pressure</strong> = injection pump works harder = increased pump wear and potential cavitation if the lift pump can't keep up with demand.</p>
                  </div>
                  {popResult.psi > 4800 && popPumpMod === "stock" && (
                    <div className="flex items-start gap-2 p-2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>A stock injection pump may not reliably deliver fuel at this pop pressure. Ensure your pump is in good condition or upgraded.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          COMMON RAIL REFERENCE MODE
         ══════════════════════════════════════════════════════════════════ */}
      {mode === "common-rail" && (
        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Platform</CardTitle></CardHeader>
            <CardContent>
              <Select value={crPlatform} onValueChange={(v) => setCrPlatform(v as CRPlatform)}>
                <SelectTrigger className="max-w-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CR_PLATFORMS) as CRPlatform[]).map(k => (
                    <SelectItem key={k} value={k}>{CR_PLATFORMS[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {(() => {
            const crDef = CR_PLATFORMS[crPlatform];
            return (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{crDef.label}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Stock HP: {crDef.stockHp} · Sizing convention: {crDef.sizingConvention}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-semibold">Injector Size</th>
                            <th className="text-left py-2 font-semibold">HP Range</th>
                            <th className="text-left py-2 font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crDef.tiers.map((tier, i) => (
                            <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                              <td className="py-2 font-bold">{tier.name}</td>
                              <td className="py-2">{tier.hpRange}</td>
                              <td className="py-2 text-muted-foreground">{tier.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Available from:</span> {crDef.brands.join(", ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#E85D04]" />
                      <p>
                        Common rail injectors are complete sealed assemblies — you cannot change just the nozzle tip. Upgrading requires installing a complete injector set and tuning the ECU to match the new injector flow. Always purchase from a reputable diesel injector manufacturer and have the ECU tuned by a qualified tuner.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}

          {/* All platforms quick reference */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reference — All Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Platform</th>
                      <th className="text-left py-2 font-semibold">Stock</th>
                      <th className="text-left py-2 font-semibold">Mild</th>
                      <th className="text-left py-2 font-semibold">Performance</th>
                      <th className="text-left py-2 font-semibold">Race</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(CR_PLATFORMS) as CRPlatform[]).map((k, i) => {
                      const p = CR_PLATFORMS[k];
                      const t = p.tiers;
                      return (
                        <tr key={k} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                          <td className="py-2 font-bold text-xs">{p.label}</td>
                          <td className="py-2 text-xs">{t[0]?.hpRange ?? "—"}</td>
                          <td className="py-2 text-xs">{t[1]?.name} ({t[1]?.hpRange ?? "—"})</td>
                          <td className="py-2 text-xs">{t[2]?.name} ({t[2]?.hpRange ?? "—"})</td>
                          <td className="py-2 text-xs">{t[t.length - 1]?.name} ({t[t.length - 1]?.hpRange ?? "—"})</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <CalculatorContent data={dieselNozzleContent} title="Diesel Nozzle & Pop Pressure" />

      {/* ══════════════════════════════════════════════════════════════════
          NOZZLE SIZING PROGRESSION TABLE (all modes)
         ══════════════════════════════════════════════════════════════════ */}
      {false && (<>
      <Section title="Nozzle Sizing Progression Table" open={sizingTableOpen} toggle={() => setSizingTableOpen(!sizingTableOpen)}>
        <p className="text-sm text-muted-foreground mb-4">
          HP ranges are approximate for 5.9L 6-cylinder Cummins and assume adequate turbo, pump, and fuel supply. 4BT (4-cylinder) owners: reduce HP estimates by ~33%.
        </p>

        <p className="text-xs font-semibold text-foreground mb-2">5-Hole Nozzles (Standard Cummins)</p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Nozzle</th>
                <th className="text-right py-2">Flow Area</th>
                <th className="text-right py-2">HP Range</th>
                <th className="text-right py-2">Pop Pressure</th>
                <th className="text-left py-2 pl-4">Turbo Match</th>
                <th className="text-left py-2 pl-4">Best For</th>
              </tr>
            </thead>
            <tbody>
              {NOZZLE_5HOLE.map((n, i) => (
                <tr
                  key={i}
                  className={`border-b ${i % 2 !== 0 ? "bg-muted/30" : ""} ${
                    recommended && n.holeDia === recommended.holeDia && n.holeCount === recommended.holeCount && mode === "mechanical"
                      ? "ring-2 ring-[#E85D04] bg-orange-50/50"
                      : ""
                  }`}
                >
                  <td className="py-2 font-bold">{n.label}</td>
                  <td className="text-right py-2 tabular-nums">{n.flowAreaSqIn.toFixed(6)}</td>
                  <td className="text-right py-2">{n.hpMin}–{n.hpMax}</td>
                  <td className="text-right py-2">{n.popPsiMin.toLocaleString()}–{n.popPsiMax.toLocaleString()}</td>
                  <td className="py-2 pl-4 text-muted-foreground text-xs">{n.turboMatch}</td>
                  <td className="py-2 pl-4 text-muted-foreground text-xs">{n.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs font-semibold text-foreground mb-2">7-Hole Nozzles (Finer Atomization)</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Nozzle</th>
                <th className="text-right py-2">Flow Area</th>
                <th className="text-right py-2">HP Range</th>
                <th className="text-right py-2">Pop Pressure</th>
                <th className="text-left py-2 pl-4">Turbo Match</th>
                <th className="text-left py-2 pl-4">5-Hole Equivalent</th>
              </tr>
            </thead>
            <tbody>
              {NOZZLE_7HOLE.map((n, i) => {
                const equiv5 = NOZZLE_5HOLE.reduce((best, s) =>
                  Math.abs(s.flowAreaSqIn - n.flowAreaSqIn) < Math.abs(best.flowAreaSqIn - n.flowAreaSqIn) ? s : best
                );
                return (
                  <tr key={i} className={`border-b ${i % 2 !== 0 ? "bg-muted/30" : ""}`}>
                    <td className="py-2 font-bold">{n.label}</td>
                    <td className="text-right py-2 tabular-nums">{n.flowAreaSqIn.toFixed(6)}</td>
                    <td className="text-right py-2">{n.hpMin}–{n.hpMax}</td>
                    <td className="text-right py-2">{n.popPsiMin.toLocaleString()}–{n.popPsiMax.toLocaleString()}</td>
                    <td className="py-2 pl-4 text-muted-foreground text-xs">{n.turboMatch}</td>
                    <td className="py-2 pl-4 text-muted-foreground text-xs">≈ {equiv5.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="p-3 rounded bg-muted/30">
            <p className="font-semibold text-foreground mb-1">5-hole vs 7-hole Nozzles</p>
            <p>5-hole is standard for Cummins — larger hole diameter per hole for same total flow, coarser spray pattern. Burns well at lower RPM and lower injection pressure. 7-hole provides finer atomization and a cleaner burn with less smoke at equivalent power, but requires adequate injection pressure. Many builders run 7-hole for street builds where clean combustion matters.</p>
          </div>
          <div className="p-3 rounded bg-muted/30">
            <p className="font-semibold text-foreground mb-1">SAC vs VCO Nozzle Tips</p>
            <p>SAC (Sac Hole) has a small fuel reservoir below the needle seat — more fuel available at crack opening, more durable at large sizes, preferred for performance. VCO (Valve Covered Orifice) needle directly covers the spray holes — cleaner cutoff and less idle smoke, but can have durability issues at larger sizes. Most builders choose SAC above 5×0.014".</p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          EDUCATIONAL SECTION
         ══════════════════════════════════════════════════════════════════ */}
      <Section title="Understanding Diesel Nozzles & Pop Pressure" open={educationOpen} toggle={() => setEducationOpen(!educationOpen)}>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mt-0">What a Diesel Nozzle Does</h3>
            <p>
              Unlike gasoline port injectors that spray fuel into the intake manifold, diesel nozzles spray fuel directly into the combustion chamber at extreme pressure — typically 3,000–5,000 PSI on mechanical systems and up to 29,000 PSI on modern common rail engines. The fuel must atomize into a fine mist and mix with compressed air in milliseconds. The nozzle's hole count, hole size, spray angle, and opening pressure all determine how well this happens. A nozzle with more or larger holes flows more fuel per injection event, which is how mechanical diesel engines make more power — by delivering more fuel per combustion cycle.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Why Nozzle Size and Pop Pressure Go Together</h3>
            <p>
              A bigger nozzle flows more fuel, but if the pop pressure stays the same, the fuel exits at lower velocity and doesn't atomize as well. It's like putting a bigger nozzle on a garden hose — you get more water but less spray force. Increasing pop pressure compensates by forcing fuel out at higher velocity through the larger holes, restoring proper atomization. This is why every nozzle upgrade should be paired with a pop pressure increase — the two are a matched set. Run big nozzles with stock pop pressure and you'll get poor atomization, incomplete combustion, black smoke, and carbon buildup on the nozzle tips themselves.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">The Smoke vs Power Tradeoff</h3>
            <p>
              Bigger nozzles don't automatically make more power. They make more fuel available, but power only happens when that fuel burns completely. If the turbo can't supply enough air to burn the extra fuel, the result is black smoke (unburned fuel particles), higher EGTs (the fuel that does burn generates more heat trying to compensate), and wasted money. The turbo, nozzles, and injection pump must be matched as a system. A truck rolling coal with 5×0.018" nozzles and a stock HX35 turbo is leaving power on the table and cooking its engine — the same nozzles behind an HX40 or compound setup would make significantly more power with far less smoke.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">The 12-Valve Cummins Nozzle Upgrade Path</h3>
            <p>
              The typical progression for a P-pump 12-valve Cummins:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Stock truck → 280–320 HP:</strong> 5×0.014" nozzles + fuel plate + 3" exhaust + boost elbow. The stock HX35 turbo can still keep up at this level.</li>
              <li><strong>Mild build → 400–450 HP:</strong> 5×0.016" nozzles + 4,200 PSI pop + governor springs + HX40 turbo. Sweet spot for a street/tow truck that makes real power without being a smoke machine.</li>
              <li><strong>Performance build → 550–650 HP:</strong> 5×0.018" nozzles + 4,500 PSI pop + built P-pump (4K governor springs, delivery valves) + compound turbos. Transmission and drivetrain upgrades required.</li>
              <li><strong>Race build → 700+ HP:</strong> 5×0.020"+ nozzles + 5,000 PSI pop + race pump + big compounds. Sled-pull and drag-strip territory. Not a daily driver.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">5-Hole vs 7-Hole: Which Should You Run?</h3>
            <p>
              5-hole nozzles are the Cummins standard — each hole is larger for a given total flow area, producing a coarser spray pattern that burns well at lower RPM and injection pressure. 7-hole nozzles split the same total fuel flow across more, smaller holes, creating finer atomization and a more complete burn with less visible smoke. The tradeoff is that 7-hole nozzles need adequate injection pressure to atomize well through the smaller holes. For a street/tow truck where clean combustion and low smoke matter, 7-hole nozzles are increasingly popular. For race applications where maximum fuel delivery per injection event matters more than spray quality, 5-hole is still preferred.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Mechanical vs Common Rail — Different Worlds</h3>
            <p>
              This calculator is split into mechanical and common rail sections because these are fundamentally different injection systems. On a mechanical diesel (P-pump or VE-pump Cummins), the nozzle is a replaceable tip that you can physically swap out as a bolt-on modification. You pop the injector out, unscrew the old nozzle, screw on a bigger one, adjust the pop pressure with shims, and put it back in. It's something a home mechanic can do in a few hours.
            </p>
            <p>
              Common rail engines (2003+ Cummins, all Duramax, 6.0L+ Powerstroke) are completely different. The injectors are sealed, electronically controlled assemblies — you can't just "put bigger nozzles" on them. Upgrading requires installing a complete injector set from a manufacturer like Industrial Injection or Exergy, and then having the ECU reprogrammed by a qualified tuner to match the new injector flow characteristics. This is why common rail injectors are sold as "50% over" or "100% over" complete assemblies, not as individual nozzle tips.
            </p>
          </div>
        </div>
      </Section>
      </>)}

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
              <h4 className="font-semibold text-foreground mb-1">Nozzle Sizing Rule</h4>
              <p>Bigger nozzles need higher pop pressure and more turbo airflow. Nozzles without matching turbo = smoke, not power.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">5-Hole vs 7-Hole</h4>
              <p>5-hole: coarser spray, better at low RPM/pressure. 7-hole: finer atomization, cleaner burn, less smoke at equal power.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">SAC vs VCO</h4>
              <p>SAC: fuel reservoir below needle, more durable at large sizes. VCO: cleaner cutoff, less idle smoke but fragile when oversized.</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">12V Cummins Nozzle Path</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>280-320 HP:</span><span className="font-mono">5x0.014"</span></li>
                <li className="flex justify-between"><span>400-450 HP:</span><span className="font-mono">5x0.016"</span></li>
                <li className="flex justify-between"><span>550-650 HP:</span><span className="font-mono">5x0.018"</span></li>
                <li className="flex justify-between"><span>700+ HP:</span><span className="font-mono">5x0.020"+</span></li>
              </ul>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Pop Pressure Ranges</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>Stock:</span><span className="font-mono">3,100-3,300 PSI</span></li>
                <li className="flex justify-between"><span>Mild (0.014"):</span><span className="font-mono">3,600-3,800 PSI</span></li>
                <li className="flex justify-between"><span>Perf (0.016"):</span><span className="font-mono">4,000-4,200 PSI</span></li>
                <li className="flex justify-between"><span>Race (0.018"+):</span><span className="font-mono">4,500-5,000 PSI</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Diesel Injector Nozzles and Pop Pressure</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            On mechanical diesel engines like the 12-valve Cummins, fuel injector nozzles are replaceable tips that control fuel spray pattern, atomization, and flow rate. The nozzle's orifice size (measured in thousandths of an inch) and number of holes determine how much fuel can be delivered per injection event. A stock 12-valve Cummins uses a 5x0.012" nozzle (five holes at 0.012" each). Upgrading to 5x0.014" nozzles increases fuel flow to support 280-320 HP, while 5x0.016" nozzles push to 400-450 HP.
          </p>
          <p>
            Pop pressure (also called nozzle opening pressure or NOP) is the fuel pressure at which the nozzle needle lifts off its seat and fuel begins spraying. Higher pop pressure produces finer atomization and a cleaner burn but requires the injection pump to work harder. Stock pop pressure is 3,100-3,300 PSI. When upgrading nozzles, pop pressure must increase proportionally — larger nozzle orifices at stock pop pressure produce poor atomization, excessive smoke, and no power gain. A 0.016" nozzle typically needs 4,000-4,200 PSI pop pressure.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Mechanical vs. Common Rail</h3>
          <p>
            Common rail diesel engines (2003+ Cummins, all Duramax, 6.0L+ Powerstroke) use sealed, electronically controlled injector assemblies. You cannot simply swap nozzle tips — upgrading requires purchasing complete injector sets rated as "50% over," "100% over," or larger from manufacturers like Industrial Injection or Exergy. The ECU must then be reprogrammed by a qualified tuner to match the new injector flow characteristics, pulse width, and timing. This is a fundamentally different approach than the bolt-on nozzle swaps possible on mechanical engines.
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
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}
