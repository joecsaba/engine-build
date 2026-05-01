import { useState, useMemo, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Thermometer, AlertTriangle, Gauge, Wind, HelpCircle, Info } from "lucide-react";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";

// ── Types ───────────────────────────────────────────────────────────────────────

type Mode = "check" | "estimate" | "drive-pressure";
type MeasurementLocation = "pre-turbo" | "post-turbo" | "not-sure";
type DrivingCondition = "idle" | "light" | "heavy" | "full-throttle";
type TurboSetup = "stock-single" | "upgraded-single" | "compound";
type TuningLevel = "stock" | "mild" | "moderate" | "aggressive";
type LoadCondition = "unloaded" | "light-tow" | "heavy-tow" | "max-tow";
type IntercoolerSetup = "stock" | "upgraded" | "none";

// ── Platform database ───────────────────────────────────────────────────────────

interface PlatformDef {
  id: string;
  label: string;
  family: "cummins" | "duramax" | "powerstroke";
  stockHp: number;
  factoryEgtSensorLocation: "pre-turbo" | "post-turbo";
  egtNotes: string;
  hasCompoundStock: boolean;
  /** Platform-specific EGT bias vs generic baseline. Positive = runs hotter. */
  egtBias: number;
}

const PLATFORMS: PlatformDef[] = [
  // ── Cummins ──
  { id: "cummins-12v-ve", label: "1989–1993 5.9L 12-valve Cummins (VE)", family: "cummins", stockHp: 160, factoryEgtSensorLocation: "pre-turbo", egtNotes: "Runs cool EGTs stock. No ECU fuel-limiting — EGTs climb fast with bigger injectors or pump mods.", hasCompoundStock: false, egtBias: -50 },
  { id: "cummins-12v-p", label: "1994–1998 5.9L 12-valve Cummins (P-pump)", family: "cummins", stockHp: 215, factoryEgtSensorLocation: "pre-turbo", egtNotes: "P7100 is mechanical with no ECU-based fuel limiting. EGTs climb proportionally with fueling mods.", hasCompoundStock: false, egtBias: -25 },
  { id: "cummins-24v-vp44", label: "1998.5–2002 5.9L 24-valve Cummins (VP44)", family: "cummins", stockHp: 235, factoryEgtSensorLocation: "pre-turbo", egtNotes: "VP44 electronic control limits fuel delivery, so EGTs are manageable stock. Aftermarket tuning can override limits and spike EGTs.", hasCompoundStock: false, egtBias: 0 },
  { id: "cummins-cr-early", label: "2003–2004.5 5.9L Cummins (CR early)", family: "cummins", stockHp: 305, factoryEgtSensorLocation: "pre-turbo", egtNotes: "ECU-controlled fuel with factory EGT-based derates. Removing derates via tuning can cause EGT spikes.", hasCompoundStock: false, egtBias: 0 },
  { id: "cummins-cr-59", label: "2004.5–2007 5.9L Cummins (CR)", family: "cummins", stockHp: 325, factoryEgtSensorLocation: "pre-turbo", egtNotes: "Common rail with factory EGT-based derates. Tuning that removes derates can cause dangerous EGT spikes.", hasCompoundStock: false, egtBias: 0 },
  { id: "cummins-67", label: "2007.5–2018 6.7L Cummins", family: "cummins", stockHp: 370, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT sensor is post-turbo. Aftermarket pyrometers should be pre-turbo for accurate readings. Factory has EGT-based derates.", hasCompoundStock: false, egtBias: 0 },
  { id: "cummins-67-19plus", label: "2019+ 6.7L Cummins", family: "cummins", stockHp: 400, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT sensor is post-turbo. Improved turbo helps but aggressive tuning still pushes limits.", hasCompoundStock: false, egtBias: -25 },
  // ── Duramax ──
  { id: "duramax-lb7", label: "2001–2004 6.6L Duramax LB7", family: "duramax", stockHp: 300, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT sensor is post-turbo. Aftermarket pyrometers should be installed pre-turbo for accurate safety readings.", hasCompoundStock: false, egtBias: 0 },
  { id: "duramax-lly", label: "2004.5–2005 6.6L Duramax LLY", family: "duramax", stockHp: 310, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT is post-turbo. Known for overheating under load due to intake restriction — high EGTs compound this.", hasCompoundStock: false, egtBias: 25 },
  { id: "duramax-lbz", label: "2006–2007 6.6L Duramax LBZ", family: "duramax", stockHp: 360, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT is post-turbo. One of the most reliable Duramax platforms. Handles tuning well.", hasCompoundStock: false, egtBias: 0 },
  { id: "duramax-lmm", label: "2007.5–2010 6.6L Duramax LMM", family: "duramax", stockHp: 365, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT is post-turbo. DPF-equipped — expect post-turbo EGTs of 1000–1200°F during active regen (this is normal).", hasCompoundStock: false, egtBias: 0 },
  { id: "duramax-lml", label: "2011–2016 6.6L Duramax LML", family: "duramax", stockHp: 397, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT is post-turbo. DPF regen temps are normal at 1000–1200°F post-turbo. CP4.2 concerns are separate from EGT.", hasCompoundStock: false, egtBias: 0 },
  { id: "duramax-l5p", label: "2017+ 6.6L Duramax L5P", family: "duramax", stockHp: 445, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory EGT is post-turbo. Strong stock turbo keeps EGTs reasonable. DPF regen temps are normal at 1000–1200°F post-turbo.", hasCompoundStock: false, egtBias: -25 },
  // ── Powerstroke ──
  { id: "powerstroke-73", label: "1999–2003 7.3L Powerstroke", family: "powerstroke", stockHp: 275, factoryEgtSensorLocation: "pre-turbo", egtNotes: "HEUI injection tends to run higher EGTs than common rail under the same conditions. No factory EGT gauge — aftermarket pyrometer strongly recommended.", hasCompoundStock: false, egtBias: 50 },
  { id: "powerstroke-60", label: "2003–2007 6.0L Powerstroke", family: "powerstroke", stockHp: 325, factoryEgtSensorLocation: "pre-turbo", egtNotes: "HEUI system runs hotter EGTs than common rail. Already has head gasket and EGR issues — high EGTs compound thermal stress on heads.", hasCompoundStock: false, egtBias: 50 },
  { id: "powerstroke-64", label: "2008–2010 6.4L Powerstroke", family: "powerstroke", stockHp: 350, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory compound turbos help keep EGTs lower. Factory EGT sensor is post-turbo. DPF regen temps are normal at 1000–1200°F post-turbo.", hasCompoundStock: true, egtBias: -25 },
  { id: "powerstroke-67", label: "2011+ 6.7L Powerstroke", family: "powerstroke", stockHp: 475, factoryEgtSensorLocation: "post-turbo", egtNotes: "Factory compound turbo keeps EGTs low, but aggressive tuning can still push limits. Factory EGT sensor is post-turbo.", hasCompoundStock: true, egtBias: -50 },
];

// ── EGT zone thresholds (pre-turbo baseline) ────────────────────────────────────
// Based on Banks Power published research and industry standards.
// Post-turbo thresholds shift down by POST_TURBO_OFFSET.

const POST_TURBO_OFFSET = 250; // °F — conservative midpoint of 200–400°F range

interface EgtZone {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

function getEgtZone(egtF: number, location: MeasurementLocation): EgtZone {
  // "not-sure" defaults to post-turbo (conservative — assumes worst case for user safety)
  const effective = location === "pre-turbo" ? egtF : egtF + POST_TURBO_OFFSET;

  if (effective < 800) return {
    label: "Normal",
    color: "#22c55e",
    bgClass: "bg-green-50",
    textClass: "text-green-800",
    borderClass: "border-green-300",
    description: "Normal operating range. No concerns.",
  };
  if (effective < 1000) return {
    label: "Moderate",
    color: "#eab308",
    bgClass: "bg-yellow-50",
    textClass: "text-yellow-800",
    borderClass: "border-yellow-300",
    description: "Moderate load range. Normal when towing. Monitor.",
  };
  if (effective < 1200) return {
    label: "High",
    color: "#f97316",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    borderClass: "border-orange-300",
    description: "High load range. Acceptable for short durations under heavy towing. Sustained operation here will reduce component life.",
  };
  if (effective < 1300) return {
    label: "WARNING",
    color: "#ef4444",
    bgClass: "bg-red-50",
    textClass: "text-red-800",
    borderClass: "border-red-300",
    description: "Approaching material limits. Back off throttle, downshift to increase RPM, or pull over to cool. Sustained operation risks damage to pistons, valves, and turbo.",
  };
  return {
    label: "DANGER",
    color: "#dc2626",
    bgClass: "bg-red-100",
    textClass: "text-red-900",
    borderClass: "border-red-500",
    description: "Component failure imminent. Reduce load immediately. Pistons, valves, and turbo seals are at risk of catastrophic failure.",
  };
}

// ── Drive pressure ratio zones ──────────────────────────────────────────────────

interface DpZone {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

function getDpZone(ratio: number): DpZone {
  if (ratio <= 1.0) return {
    label: "Ideal",
    color: "#22c55e",
    bgClass: "bg-green-50",
    textClass: "text-green-800",
    borderClass: "border-green-300",
    description: "Excellent. Drive pressure is at or below boost pressure. Turbo is well-sized for your power level.",
  };
  if (ratio <= 1.5) return {
    label: "Acceptable",
    color: "#eab308",
    bgClass: "bg-yellow-50",
    textClass: "text-yellow-800",
    borderClass: "border-yellow-300",
    description: "Acceptable range. Turbo is handling exhaust flow adequately. Monitor under sustained load.",
  };
  if (ratio <= 2.0) return {
    label: "Marginal",
    color: "#f97316",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    borderClass: "border-orange-300",
    description: "Turbo is restricting exhaust flow. Consider a larger turbine housing A/R or upgrading to a larger turbo or compound setup.",
  };
  return {
    label: "Excessive",
    color: "#ef4444",
    bgClass: "bg-red-50",
    textClass: "text-red-800",
    borderClass: "border-red-300",
    description: "Severe backpressure. Turbo is dangerously undersized. Exhaust valves overheat, power is lost to pumping losses, and turbo shaft seals are at risk from pressure differential.",
  };
}

// ── EGT estimation engine ───────────────────────────────────────────────────────

interface EgtEstimate {
  baseLow: number;
  baseHigh: number;
  platformBias: number;
  altitudeAdj: number;
  ambientAdj: number;
  tuningAdj: number;
  turboAdj: number;
  intercoolerAdj: number;
  totalLow: number;
  totalHigh: number;
}

function estimateEgt(
  platform: PlatformDef | null,
  turbo: TurboSetup,
  tuning: TuningLevel,
  ambientF: number,
  altitudeFt: number,
  load: LoadCondition,
  intercooler: IntercoolerSetup,
): EgtEstimate | null {
  if (!platform) return null;

  // Base EGT ranges by load condition (pre-turbo, stock tune, sea level, 70°F ambient)
  const baseRanges: Record<LoadCondition, [number, number]> = {
    "unloaded":  [400, 600],
    "light-tow": [700, 900],
    "heavy-tow": [900, 1100],
    "max-tow":   [1050, 1250],
  };

  const [baseLow, baseHigh] = baseRanges[load];

  // Platform-specific bias (HEUI Powerstrokes run hotter, factory compound trucks run cooler)
  const platformBias = platform.egtBias;

  // Tuning impact: more fuel = more EGT
  const tuningAdjs: Record<TuningLevel, number> = {
    "stock": 0,
    "mild": 75,
    "moderate": 175,
    "aggressive": 300,
  };
  const tuningAdj = tuningAdjs[tuning];

  // Turbo impact
  const turboAdjs: Record<TurboSetup, number> = {
    "stock-single": 0,
    "upgraded-single": -75,
    "compound": -225,
  };
  const turboAdj = turboAdjs[turbo];

  // Intercooler impact
  const intercoolerAdjs: Record<IntercoolerSetup, number> = {
    "stock": 0,
    "upgraded": -50,   // better charge cooling = lower EGTs
    "none": 75,        // no intercooler (some 12v trucks) = hotter intake = higher EGTs
  };
  const intercoolerAdj = intercoolerAdjs[intercooler];

  // Altitude: ~5°F per 1,000 ft
  const altitudeAdj = Math.round((altitudeFt / 1000) * 5);

  // Ambient temperature: ~3°F per 1°F above 70°F baseline
  const ambientAdj = Math.round((ambientF - 70) * 3);

  const totalLow = baseLow + platformBias + tuningAdj + turboAdj + intercoolerAdj + altitudeAdj + ambientAdj;
  const totalHigh = baseHigh + platformBias + tuningAdj + turboAdj + intercoolerAdj + altitudeAdj + ambientAdj;

  return {
    baseLow, baseHigh,
    platformBias,
    altitudeAdj, ambientAdj, tuningAdj, turboAdj, intercoolerAdj,
    totalLow: Math.max(200, totalLow),
    totalHigh: Math.max(300, totalHigh),
  };
}

// ── Contextual warnings ─────────────────────────────────────────────────────────

interface Warning {
  level: "red" | "yellow" | "blue";
  title: string;
  message: string;
}

function getCheckWarnings(
  egtF: number,
  location: MeasurementLocation,
  condition: DrivingCondition,
  turbo: TurboSetup,
  boostPsi: number,
  platform: PlatformDef | null,
): Warning[] {
  const warnings: Warning[] = [];
  const effective = location === "pre-turbo" ? egtF : egtF + POST_TURBO_OFFSET;

  // "Not sure" location warning
  if (location === "not-sure") {
    warnings.push({
      level: "yellow",
      title: "Probe location unknown — using conservative estimate",
      message: "We're treating your reading as post-turbo (adding ~250°F) to give you the safest assessment. If your probe is actually pre-turbo (in the exhaust manifold close to the head), your actual temps are exactly what you're reading — which may be better or worse than shown. Check where your pyrometer probe is installed to get an accurate assessment.",
    });
  }

  // High EGT with stock turbo
  if (effective > 1200 && turbo === "stock-single") {
    warnings.push({
      level: "red",
      title: "Stock turbo likely undersized",
      message: "Stock turbo is likely undersized for your power level. Upgrading to a larger single turbo or compound setup can reduce EGTs by 200–400°F.",
    });
  }

  // High EGT even with upgraded turbo
  if (effective > 1250 && turbo === "upgraded-single") {
    warnings.push({
      level: "red",
      title: "Single turbo may not be enough",
      message: "Even with an upgraded single turbo, EGTs above 1250°F suggest the turbine can't flow enough exhaust at this power level. A compound setup can reduce EGTs by another 150–250°F.",
    });
  }

  // Post-turbo reading above 1100
  if (location === "post-turbo" && egtF > 1100) {
    warnings.push({
      level: "yellow",
      title: "Unusually high post-turbo EGTs",
      message: "Post-turbo EGTs above 1100°F are unusual outside of DPF regeneration. If your truck has a DPF, check if a regen is active. If no DPF, your pre-turbo EGTs are dangerously high (estimated " + (egtF + POST_TURBO_OFFSET) + "°F).",
    });
  }

  // High EGT at idle/cruise — something is wrong
  if (effective > 800 && condition === "idle") {
    warnings.push({
      level: "yellow",
      title: "High EGTs at idle/cruise",
      message: "EGTs above 800°F (pre-turbo equivalent) at idle or unloaded cruise are abnormal. Check for: stuck injector, turbo seal leak, exhaust restriction, or pyrometer calibration issue.",
    });
  }

  // High EGT under light load
  if (effective > 1000 && condition === "light") {
    warnings.push({
      level: "yellow",
      title: "High EGTs for light load",
      message: "EGTs above 1000°F (pre-turbo equivalent) under light load suggest over-fueling from tuning, boost leak, or turbo issue. Check intercooler piping for leaks and consider reducing tune aggressiveness.",
    });
  }

  // EGT + boost context: high EGT with good boost = over-fueling, high EGT with low boost = airflow problem
  if (boostPsi > 0 && effective > 1000) {
    if (boostPsi >= 30 && effective > 1100) {
      warnings.push({
        level: "blue",
        title: "Plenty of boost, still hot — likely over-fueled",
        message: `You're making ${boostPsi} PSI boost, which is good airflow. But EGTs are still high, which points to over-fueling from your tune. Reducing fueling by 1–2 tune levels is the most effective fix.`,
      });
    } else if (boostPsi < 20 && effective > 1000) {
      warnings.push({
        level: "yellow",
        title: "Low boost + high EGTs — airflow problem",
        message: `Only ${boostPsi} PSI boost with high EGTs suggests an airflow issue: boost leak, worn turbo, or turbo that hasn't spooled. Check intercooler piping for leaks and verify turbo health.`,
      });
    }
  }

  // Platform-specific notes
  if (platform) {
    if (platform.family === "duramax" && location === "pre-turbo") {
      warnings.push({
        level: "blue",
        title: "Duramax factory sensor is post-turbo",
        message: "Note: the factory Duramax EGT sensor measures post-turbo. Your pre-turbo aftermarket pyrometer reads 200–400°F higher than what the factory gauge would show — this is expected, not a problem.",
      });
    }
    if (platform.id === "powerstroke-60" && effective > 1100) {
      warnings.push({
        level: "red",
        title: "6.0L Powerstroke thermal stress",
        message: "The 6.0L Powerstroke already has head gasket and EGR cooler thermal stress issues. Sustained high EGTs compound these problems significantly. Strongly recommend reducing EGTs.",
      });
    }
    if ((platform.id === "duramax-lmm" || platform.id === "duramax-lml" || platform.id === "duramax-l5p" || platform.id === "powerstroke-64" || platform.id === "powerstroke-67") && location === "post-turbo" && egtF >= 1000 && egtF <= 1200) {
      warnings.push({
        level: "blue",
        title: "Could be a DPF regen",
        message: "Post-turbo EGTs of 1000–1200°F are normal during active DPF regeneration on your truck. If the EGTs came up on their own (not under load) and drop back down after 10–20 minutes, it's just a regen cycle — not a problem.",
      });
    }
  }

  // Contextual fixes when EGTs are high
  if (effective > 1000) {
    warnings.push({
      level: "blue",
      title: "How to reduce EGTs",
      message: "Fixes ranked by cost: (1) back off throttle / downshift — free, (2) check intercooler piping for boost leaks — free, (3) reduce tune aggressiveness — free, (4) add water/methanol injection — $300–$600, (5) upgrade intercooler — $500–$1,500, (6) upgrade turbo — $800–$2,000, (7) add compound turbos — $2,000–$5,000.",
    });
  }

  return warnings;
}

function getDpWarnings(ratio: number, turbo: TurboSetup, egtF: number): Warning[] {
  const warnings: Warning[] = [];

  if (ratio > 2.0) {
    warnings.push({
      level: "red",
      title: "Severe backpressure",
      message: "Drive pressure is more than double your boost. Turbo is severely undersized. Exhaust valves and turbo shaft seals are at risk. " +
        (turbo === "stock-single"
          ? "A larger turbo or compound setup is strongly recommended."
          : turbo === "upgraded-single"
            ? "Consider compounds — the single turbo can't flow enough exhaust at this power level."
            : "Check for exhaust restrictions downstream (clogged DPF, crushed downpipe) or verify gauge calibration."),
    });
  }

  if (ratio > 1.5 && ratio <= 2.0 && turbo === "stock-single") {
    warnings.push({
      level: "yellow",
      title: "Stock turbo nearing flow limit",
      message: "Drive pressure ratio of " + ratio.toFixed(1) + ":1 with a stock turbo suggests it's nearing its flow limit. A turbo upgrade will reduce drive pressure, lower EGTs, and free up power that's currently wasted pushing exhaust out.",
    });
  }

  // Combined high drive pressure + high EGT
  if (ratio > 1.5 && egtF > 1000) {
    warnings.push({
      level: "red",
      title: "High drive pressure + high EGTs — compound risk",
      message: `Drive pressure ratio of ${ratio.toFixed(1)}:1 combined with ${egtF}°F EGTs means the turbo is both restricting flow and allowing heat to build. This accelerates damage to exhaust valves, turbo seals, and pistons. Addressing the turbo restriction will lower both drive pressure and EGTs.`,
    });
  }

  // Rough power loss estimate: ~1% HP loss per 0.1 ratio above 1.0
  if (ratio > 1.0) {
    const excessRatio = ratio - 1.0;
    const pctLoss = Math.round(excessRatio * 10);
    warnings.push({
      level: "blue",
      title: "Estimated pumping loss",
      message: `Roughly ${pctLoss}% of your engine's power is being used to push exhaust through the turbo (pumping losses). This is power that could be going to the wheels with a less restrictive turbine.`,
    });
  }

  return warnings;
}

// ── Collapsible section ─────────────────────────────────────────────────────────

function Section({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-8 border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold hover:bg-[#222] transition-colors"
        onClick={toggle}
      >
        <span>{title}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

// ── EGT Thermometer visual ──────────────────────────────────────────────────────

function EgtThermometer({ egtF, location }: { egtF: number; location: MeasurementLocation }) {
  const effective = location === "pre-turbo" ? egtF : egtF + POST_TURBO_OFFSET;
  const maxScale = 1500;
  const pct = Math.min(100, Math.max(0, (effective / maxScale) * 100));
  const zone = getEgtZone(egtF, location);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">
          {location !== "pre-turbo" ? `≈${effective}°F pre-turbo equivalent` : "Pre-turbo EGT"}
        </span>
        <span className="text-sm font-medium" style={{ color: zone.color }}>{zone.label}</span>
      </div>
      {/* Thermometer bar */}
      <div className="relative h-6 rounded-full overflow-hidden bg-gray-700">
        {/* Zone gradient background */}
        <div className="absolute inset-0 flex">
          <div className="h-full bg-green-600" style={{ width: `${(800/maxScale)*100}%` }} />
          <div className="h-full bg-yellow-500" style={{ width: `${(200/maxScale)*100}%` }} />
          <div className="h-full bg-orange-500" style={{ width: `${(200/maxScale)*100}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${(100/maxScale)*100}%` }} />
          <div className="h-full bg-red-700" style={{ flex: 1 }} />
        </div>
        {/* Needle */}
        <div
          className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-300"
          style={{ left: `${pct}%` }}
        />
      </div>
      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>0°F</span>
        <span>800</span>
        <span>1000</span>
        <span>1200</span>
        <span>1300</span>
        <span>1500°F</span>
      </div>
    </div>
  );
}

// ── Drive pressure ratio gauge ──────────────────────────────────────────────────

function DpRatioGauge({ ratio }: { ratio: number }) {
  const zone = getDpZone(ratio);
  const maxScale = 3.0;
  const pct = Math.min(100, Math.max(0, (ratio / maxScale) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">Drive Pressure Ratio</span>
        <span className="text-sm font-medium" style={{ color: zone.color }}>{zone.label}</span>
      </div>
      <div className="relative h-6 rounded-full overflow-hidden bg-gray-700">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-green-600" style={{ width: `${(1.0/maxScale)*100}%` }} />
          <div className="h-full bg-yellow-500" style={{ width: `${(0.5/maxScale)*100}%` }} />
          <div className="h-full bg-orange-500" style={{ width: `${(0.5/maxScale)*100}%` }} />
          <div className="h-full bg-red-500" style={{ flex: 1 }} />
        </div>
        <div
          className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-300"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span>1.0:1</span>
        <span>1.5:1</span>
        <span>2.0:1</span>
        <span>3.0:1</span>
      </div>
    </div>
  );
}

// ── Warning box ─────────────────────────────────────────────────────────────────

function WarningBox({ w }: { w: Warning }) {
  const styles = {
    red:    { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "text-red-600" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "text-yellow-600" },
    blue:   { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", icon: "text-blue-600" },
  }[w.level];

  const Icon = w.level === "blue" ? Info : AlertTriangle;

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${styles.icon}`} />
        <div>
          <p className={`font-semibold text-sm ${styles.text}`}>{w.title}</p>
          <p className={`text-sm mt-1 ${styles.text} opacity-90`}>{w.message}</p>
        </div>
      </div>
    </div>
  );
}

// ── Platform select helper ──────────────────────────────────────────────────────

function PlatformSelect({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select your engine…" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__cummins_header" disabled>── Cummins ──</SelectItem>
        {PLATFORMS.filter(p => p.family === "cummins").map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
        <SelectItem value="__duramax_header" disabled>── Duramax ──</SelectItem>
        {PLATFORMS.filter(p => p.family === "duramax").map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
        <SelectItem value="__powerstroke_header" disabled>── Powerstroke ──</SelectItem>
        {PLATFORMS.filter(p => p.family === "powerstroke").map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function DieselEgtDrivePressureCalculator() {
  const { setField } = useBuildContext();

  // Mode
  const [mode, setMode] = useState<Mode>("check");

  // ── Check My EGTs mode ──
  const [egtInput, setEgtInput] = useBuildField("diesel.egtReading", "");
  const [location, setLocation] = useState<MeasurementLocation>("pre-turbo");
  const [condition, setCondition] = useState<DrivingCondition>("light");
  const [checkTurbo, setCheckTurbo] = useState<TurboSetup>("stock-single");
  const [checkBoost, setCheckBoost] = useState("");
  const [checkPlatformId, setCheckPlatformId] = useBuildField("diesel.egtPlatform", "");

  // ── Estimate EGTs mode ──
  const [estPlatformId, setEstPlatformId] = useState("");
  const [turboSetup, setTurboSetup] = useState<TurboSetup>("stock-single");
  const [tuningLevel, setTuningLevel] = useState<TuningLevel>("stock");
  const [ambientTemp, setAmbientTemp] = useState("70");
  const [altitude, setAltitude] = useState("0");
  const [loadCondition, setLoadCondition] = useState<LoadCondition>("light-tow");
  const [intercooler, setIntercooler] = useState<IntercoolerSetup>("stock");

  // ── Drive Pressure mode ──
  const [boostPsi, setBoostPsi] = useBuildField("diesel.boostPsi", "");
  const [drivePsi, setDrivePsi] = useBuildField("diesel.drivePsi", "");
  const [dpTurboSetup, setDpTurboSetup] = useState<TurboSetup>("stock-single");
  const [dpEgt, setDpEgt] = useState("");

  // ── Collapsible sections ──
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Derived values ──
  const egtValue = parseFloat(egtInput) || 0;
  const checkBoostValue = parseFloat(checkBoost) || 0;
  const checkPlatform = PLATFORMS.find(p => p.id === checkPlatformId) ?? null;
  const estPlatform = PLATFORMS.find(p => p.id === estPlatformId) ?? null;
  const boostValue = parseFloat(boostPsi) || 0;
  const driveValue = parseFloat(drivePsi) || 0;
  const dpEgtValue = parseFloat(dpEgt) || 0;

  const egtZone = egtValue > 0 ? getEgtZone(egtValue, location) : null;
  const checkWarnings = egtValue > 0 ? getCheckWarnings(egtValue, location, condition, checkTurbo, checkBoostValue, checkPlatform) : [];

  const egtEstimate = useMemo(
    () => estimateEgt(estPlatform, turboSetup, tuningLevel, parseFloat(ambientTemp) || 70, parseFloat(altitude) || 0, loadCondition, intercooler),
    [estPlatform, turboSetup, tuningLevel, ambientTemp, altitude, loadCondition, intercooler],
  );

  const dpRatio = boostValue > 0 ? driveValue / boostValue : 0;
  const dpZone = dpRatio > 0 ? getDpZone(dpRatio) : null;
  const dpWarnings = dpRatio > 0 ? getDpWarnings(dpRatio, dpTurboSetup, dpEgtValue) : [];

  // ── Write computed values to build context (in useEffect to avoid render-loop) ──
  useEffect(() => {
    if (egtZone && egtValue > 0) {
      setField("computed.egtAssessment", egtZone.label);
    }
  }, [egtZone, egtValue, setField]);

  useEffect(() => {
    if (dpRatio > 0) {
      setField("computed.drivePressureRatio", dpRatio.toFixed(2));
    }
  }, [dpRatio, setField]);

  // ── Auto-set location from platform ──
  const handleCheckPlatformChange = (v: string) => {
    setCheckPlatformId(v);
    const p = PLATFORMS.find(pl => pl.id === v);
    if (p && location === "not-sure") {
      // If they selected "not sure", auto-fill from platform's factory sensor location
      setLocation(p.factoryEgtSensorLocation);
    }
  };

  // ── Mode buttons ──
  const modeButtons: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "check", label: "Check My EGTs", icon: <Thermometer className="w-4 h-4" /> },
    { key: "estimate", label: "Estimate EGTs", icon: <Gauge className="w-4 h-4" /> },
    { key: "drive-pressure", label: "Drive Pressure", icon: <Wind className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <SEOHead
        title="Diesel EGT & Drive Pressure Calculator"
        description="Check your diesel exhaust gas temperature against safe limits, estimate EGTs for your setup, and analyze drive pressure ratio. Pre-turbo vs post-turbo correction, platform-specific thresholds, and actionable recommendations for Cummins, Duramax, and Powerstroke."
        canonical="/calculators/diesel-egt-drive-pressure"
        keywords="diesel EGT calculator, exhaust gas temperature safe limit, drive pressure ratio diesel, what EGT is too high, diesel pyrometer guide, Cummins EGT limit, Duramax EGT safety"
      />

      <h1 className="text-3xl font-bold mb-1">Diesel EGT &amp; Drive Pressure Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Check your pyrometer readings against safe limits, estimate EGTs for your setup, or analyze your drive pressure ratio.
        Thresholds based on Banks Power published research.
      </p>

      {/* ── Mode toggle ── */}
      <div className="flex rounded-lg border overflow-hidden mb-8">
        {modeButtons.map(m => (
          <button
            key={m.key}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
              mode === m.key ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode(m.key)}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* CHECK MY EGTs MODE                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {mode === "check" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Thermometer className="w-5 h-5 text-[#E85D04]" /> Check My EGTs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* EGT input */}
              <div>
                <Label className="font-semibold">Current EGT Reading (°F)</Label>
                <Input
                  type="number"
                  step={25}
                  min={0}
                  max={2000}
                  placeholder="e.g. 1050"
                  value={egtInput}
                  onChange={e => setEgtInput(e.target.value)}
                  className="mt-1 text-2xl font-bold h-14 text-center"
                />
              </div>

              {/* Measurement location */}
              <div>
                <Label className="font-semibold">Where Is Your Pyrometer Probe?</Label>
                <p className="text-xs text-muted-foreground mb-2">This changes all safety thresholds. Getting this wrong can lead to false confidence.</p>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {([
                    ["pre-turbo", "Pre-turbo", "Exhaust manifold"],
                    ["post-turbo", "Post-turbo", "Downpipe"],
                    ["not-sure", "Not sure", "Conservative"],
                  ] as const).map(([val, label, sub]) => (
                    <button
                      key={val}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors text-center ${
                        location === val ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setLocation(val)}
                    >
                      <span className="block">{label}</span>
                      <span className={`block text-xs mt-0.5 ${location === val ? "text-gray-400" : "text-gray-400"}`}>{sub}</span>
                    </button>
                  ))}
                </div>
                {location === "not-sure" && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex gap-2">
                      <HelpCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">
                        <strong>How to tell:</strong> Look at your pyrometer wiring. If the probe goes into the exhaust manifold (between the head and turbo), it's pre-turbo.
                        If it goes into the downpipe (after the turbo), it's post-turbo. Most aftermarket pyrometers are pre-turbo. Factory gauges on Duramax and newer
                        Cummins/Powerstroke are post-turbo.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Driving condition */}
              <div>
                <Label className="font-semibold">Driving Condition When You Saw This Reading</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {([
                    ["idle", "Idle / cruising"],
                    ["light", "Highway towing"],
                    ["heavy", "Heavy towing uphill"],
                    ["full-throttle", "Full throttle / competition"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        condition === val ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setCondition(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turbo setup */}
              <div>
                <Label className="font-semibold">Turbo Setup</Label>
                <div className="flex rounded-lg border overflow-hidden mt-1">
                  {([
                    ["stock-single", "Stock"],
                    ["upgraded-single", "Upgraded"],
                    ["compound", "Compounds"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        checkTurbo === val ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setCheckTurbo(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Boost (optional) */}
              <div>
                <Label className="font-semibold">Current Boost (PSI) <span className="font-normal text-muted-foreground">— optional</span></Label>
                <p className="text-xs text-muted-foreground mb-1">If you have a boost gauge, entering your boost gives more specific advice.</p>
                <Input type="number" step={1} min={0} placeholder="e.g. 30" value={checkBoost} onChange={e => setCheckBoost(e.target.value)} className="mt-1" />
              </div>

              {/* Platform */}
              <div>
                <Label className="font-semibold">Engine Platform <span className="font-normal text-muted-foreground">— optional</span></Label>
                <div className="mt-1"><PlatformSelect value={checkPlatformId} onChange={handleCheckPlatformChange} /></div>
              </div>

              {/* Platform-specific note */}
              {checkPlatform && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">{checkPlatform.label}:</span>{" "}
                    {checkPlatform.egtNotes}
                  </p>
                  {location !== "not-sure" && checkPlatform.factoryEgtSensorLocation !== location && (
                    <p className="text-sm text-blue-800 mt-2 font-medium">
                      Note: The factory EGT sensor on this truck is {checkPlatform.factoryEgtSensorLocation === "post-turbo" ? "post-turbo" : "pre-turbo"},
                      but you selected {location === "post-turbo" ? "post-turbo" : "pre-turbo"}.
                      Make sure you know where your pyrometer probe is installed.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {egtValue > 0 && egtZone ? (
              <>
                {/* Big result card */}
                <Card className="bg-[#1a1a1a] text-white">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-1">EGT Safety Assessment</p>
                      <p className="text-5xl font-bold tabular-nums" style={{ color: egtZone.color }}>{egtValue}°F</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {location === "pre-turbo" ? "Pre-turbo" : location === "post-turbo" ? "Post-turbo" : "Location unknown"} reading
                      </p>
                      {location !== "pre-turbo" && (
                        <p className="text-sm text-gray-500 mt-1">≈ {egtValue + POST_TURBO_OFFSET}°F pre-turbo equivalent</p>
                      )}
                    </div>

                    <div className={`rounded-lg p-4 ${egtZone.bgClass} ${egtZone.borderClass} border`}>
                      <p className={`font-bold text-lg ${egtZone.textClass}`}>{egtZone.label}</p>
                      <p className={`text-sm mt-1 ${egtZone.textClass}`}>{egtZone.description}</p>
                    </div>

                    <EgtThermometer egtF={egtValue} location={location} />
                  </CardContent>
                </Card>

                {/* Warnings */}
                {checkWarnings.length > 0 && (
                  <div className="space-y-3">
                    {checkWarnings.map((w, i) => <WarningBox key={i} w={w} />)}
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-[#1a1a1a] text-white">
                <CardContent className="p-6 text-center">
                  <Thermometer className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Enter your EGT reading to see a safety assessment.</p>
                  <p className="text-gray-600 text-sm mt-2">Read the number from your pyrometer gauge or scan tool and type it above.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ESTIMATE EGTs MODE                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {mode === "estimate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5 text-[#E85D04]" /> Estimate EGTs for My Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Platform */}
              <div>
                <Label className="font-semibold">Engine Platform</Label>
                <div className="mt-1"><PlatformSelect value={estPlatformId} onChange={setEstPlatformId} /></div>
              </div>

              {/* Turbo setup */}
              <div>
                <Label className="font-semibold">Turbo Setup</Label>
                <div className="flex rounded-lg border overflow-hidden mt-1">
                  {([
                    ["stock-single", "Stock single"],
                    ["upgraded-single", "Upgraded single"],
                    ["compound", "Compounds"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        turboSetup === val ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setTurboSetup(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tuning level */}
              <div>
                <Label className="font-semibold">Tuning Level</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {([
                    ["stock", "Stock tune"],
                    ["mild", "Mild (+50–100 HP)"],
                    ["moderate", "Moderate (+100–200 HP)"],
                    ["aggressive", "Aggressive (+200+ HP)"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        tuningLevel === val ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setTuningLevel(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intercooler */}
              <div>
                <Label className="font-semibold">Intercooler</Label>
                <div className="flex rounded-lg border overflow-hidden mt-1">
                  {([
                    ["stock", "Stock intercooler"],
                    ["upgraded", "Upgraded / aftermarket"],
                    ["none", "No intercooler"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        intercooler === val ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setIntercooler(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Load condition */}
              <div>
                <Label className="font-semibold">Load Condition</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {([
                    ["unloaded", "Unloaded"],
                    ["light-tow", "Light tow (<10k lbs)"],
                    ["heavy-tow", "Heavy tow (10–20k lbs)"],
                    ["max-tow", "Max tow (20k+ / uphill)"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        loadCondition === val ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setLoadCondition(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient temp + Altitude side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Ambient Temp (°F)</Label>
                  <Input type="number" step={5} value={ambientTemp} onChange={e => setAmbientTemp(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold">Altitude (feet)</Label>
                  <Input type="number" step={500} value={altitude} onChange={e => setAltitude(e.target.value)} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estimate results */}
          <div className="space-y-4">
            {egtEstimate && estPlatform ? (
              <>
                <Card className="bg-[#1a1a1a] text-white">
                  <CardContent className="p-6 space-y-5">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-1">Estimated Pre-Turbo EGT Range</p>
                      <p className="text-4xl font-bold tabular-nums text-[#E85D04]">
                        {egtEstimate.totalLow}–{egtEstimate.totalHigh}°F
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Post-turbo equivalent: {Math.max(100, egtEstimate.totalLow - POST_TURBO_OFFSET)}–{Math.max(200, egtEstimate.totalHigh - POST_TURBO_OFFSET)}°F
                      </p>
                    </div>

                    <EgtThermometer egtF={Math.round((egtEstimate.totalLow + egtEstimate.totalHigh) / 2)} location="pre-turbo" />

                    {/* Breakdown */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-300">Breakdown</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-400">Base range (load):</span>
                        <span className="text-right tabular-nums">{egtEstimate.baseLow}–{egtEstimate.baseHigh}°F</span>

                        {egtEstimate.platformBias !== 0 && (
                          <>
                            <span className="text-gray-400">Platform bias ({estPlatform.label.split(" ").slice(-1)[0]}):</span>
                            <span className={`text-right tabular-nums ${egtEstimate.platformBias > 0 ? "text-red-400" : "text-green-400"}`}>
                              {egtEstimate.platformBias > 0 ? "+" : ""}{egtEstimate.platformBias}°F
                            </span>
                          </>
                        )}

                        <span className="text-gray-400">Tuning impact:</span>
                        <span className={`text-right tabular-nums ${egtEstimate.tuningAdj > 0 ? "text-red-400" : "text-gray-300"}`}>
                          {egtEstimate.tuningAdj > 0 ? "+" : ""}{egtEstimate.tuningAdj}°F
                        </span>

                        <span className="text-gray-400">Turbo impact:</span>
                        <span className={`text-right tabular-nums ${egtEstimate.turboAdj < 0 ? "text-green-400" : "text-gray-300"}`}>
                          {egtEstimate.turboAdj > 0 ? "+" : ""}{egtEstimate.turboAdj}°F
                        </span>

                        {egtEstimate.intercoolerAdj !== 0 && (
                          <>
                            <span className="text-gray-400">Intercooler:</span>
                            <span className={`text-right tabular-nums ${egtEstimate.intercoolerAdj < 0 ? "text-green-400" : "text-red-400"}`}>
                              {egtEstimate.intercoolerAdj > 0 ? "+" : ""}{egtEstimate.intercoolerAdj}°F
                            </span>
                          </>
                        )}

                        {egtEstimate.altitudeAdj !== 0 && (
                          <>
                            <span className="text-gray-400">Altitude correction:</span>
                            <span className="text-right tabular-nums text-yellow-400">
                              +{egtEstimate.altitudeAdj}°F
                            </span>
                          </>
                        )}

                        {egtEstimate.ambientAdj !== 0 && (
                          <>
                            <span className="text-gray-400">Ambient temp correction:</span>
                            <span className={`text-right tabular-nums ${egtEstimate.ambientAdj > 0 ? "text-yellow-400" : "text-blue-400"}`}>
                              {egtEstimate.ambientAdj > 0 ? "+" : ""}{egtEstimate.ambientAdj}°F
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 border-t border-gray-700 pt-3">
                      These are rough estimates based on typical behavior. Actual EGTs vary with exact tune calibration, turbo sizing, engine condition, and driving style.
                    </p>
                  </CardContent>
                </Card>

                {/* Altitude + aggressive tuning warning */}
                {(parseFloat(altitude) || 0) > 5000 && tuningLevel === "aggressive" && (
                  <WarningBox w={{ level: "yellow", title: "High altitude + aggressive tuning", message: "High altitude + aggressive tuning is a high-EGT combination. Consider reducing tune aggressiveness at altitude or adding water/methanol injection." }} />
                )}

                {/* High estimated EGT warning */}
                {egtEstimate.totalHigh > 1200 && turboSetup === "stock-single" && (
                  <WarningBox w={{ level: "red", title: "Estimated EGTs exceed safe limits with stock turbo", message: "Your estimated EGTs exceed 1200°F with a stock turbo. A turbo upgrade or compound setup can reduce EGTs by 200–400°F and is strongly recommended at this power level." }} />
                )}

                {/* No intercooler warning */}
                {intercooler === "none" && tuningLevel !== "stock" && (
                  <WarningBox w={{ level: "yellow", title: "No intercooler with added fueling", message: "Running any level of tune without an intercooler means hot compressed air is going directly into the engine. This significantly raises EGTs and reduces power. An intercooler should be the first upgrade before adding fuel." }} />
                )}

                {/* Platform note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">{estPlatform.label}:</span>{" "}
                    {estPlatform.egtNotes}
                  </p>
                </div>
              </>
            ) : (
              <Card className="bg-[#1a1a1a] text-white">
                <CardContent className="p-6 text-center">
                  <Gauge className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Select your engine platform to see EGT estimates.</p>
                  <p className="text-gray-600 text-sm mt-2">Don't have a pyrometer yet? This mode estimates what EGTs you'll see based on your mods and conditions.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* DRIVE PRESSURE MODE                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {mode === "drive-pressure" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wind className="w-5 h-5 text-[#E85D04]" /> Drive Pressure Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Boost (PSI)</Label>
                  <p className="text-xs text-muted-foreground mb-1">Intake manifold</p>
                  <Input type="number" step={1} min={0} placeholder="e.g. 35" value={boostPsi} onChange={e => setBoostPsi(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold">Drive Pressure (PSI)</Label>
                  <p className="text-xs text-muted-foreground mb-1">Exhaust manifold</p>
                  <Input type="number" step={1} min={0} placeholder="e.g. 50" value={drivePsi} onChange={e => setDrivePsi(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="font-semibold">Turbo Setup</Label>
                <div className="flex rounded-lg border overflow-hidden mt-1">
                  {([
                    ["stock-single", "Stock"],
                    ["upgraded-single", "Upgraded"],
                    ["compound", "Compounds"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        dpTurboSetup === val ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setDpTurboSetup(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-semibold">Current EGT (°F) <span className="font-normal text-muted-foreground">— optional</span></Label>
                <p className="text-xs text-muted-foreground mb-1">If you have an EGT reading at the same time, enter it for combined analysis.</p>
                <Input type="number" step={25} min={0} placeholder="e.g. 1100" value={dpEgt} onChange={e => setDpEgt(e.target.value)} className="mt-1" />
              </div>

              {/* What is drive pressure? */}
              <div className="p-3 bg-gray-50 border rounded-lg">
                <div className="flex gap-2">
                  <HelpCircle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold text-gray-700 mb-1">Don't have a drive pressure gauge?</p>
                    <p>Drive pressure requires a separate gauge tapped into the exhaust manifold (pre-turbo). It's not the same as boost. If you only have a boost gauge, check the "Check My EGTs" or "Estimate EGTs" modes instead — they don't require drive pressure data.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {dpRatio > 0 && dpZone ? (
              <>
                <Card className="bg-[#1a1a1a] text-white">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-1">Drive Pressure Ratio</p>
                      <p className="text-5xl font-bold tabular-nums" style={{ color: dpZone.color }}>
                        {dpRatio.toFixed(2)}:1
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{driveValue} PSI drive ÷ {boostValue} PSI boost</p>
                    </div>

                    <div className={`rounded-lg p-4 ${dpZone.bgClass} ${dpZone.borderClass} border`}>
                      <p className={`font-bold text-lg ${dpZone.textClass}`}>{dpZone.label}</p>
                      <p className={`text-sm mt-1 ${dpZone.textClass}`}>{dpZone.description}</p>
                    </div>

                    <DpRatioGauge ratio={dpRatio} />

                    {dpEgtValue > 0 && (
                      <div className="border-t border-gray-700 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">EGT at this reading:</span>
                          <span className="text-lg font-bold tabular-nums" style={{ color: getEgtZone(dpEgtValue, "pre-turbo").color }}>{dpEgtValue}°F</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {dpWarnings.length > 0 && (
                  <div className="space-y-3">
                    {dpWarnings.map((w, i) => <WarningBox key={i} w={w} />)}
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-[#1a1a1a] text-white">
                <CardContent className="p-6 text-center">
                  <Wind className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Enter your boost and drive pressure readings to see the analysis.</p>
                  <p className="text-gray-600 text-sm mt-2">Take these readings under load (towing or WOT) for the most meaningful results. Idle readings aren't useful.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* EDUCATIONAL SECTIONS                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}

      <Section title="What EGT Actually Measures" open={!!openSections["what-egt"]} toggle={() => toggleSection("what-egt")}>
        <div className="prose prose-sm max-w-none">
          <p>
            Exhaust gas temperature is the direct result of combustion. When fuel burns inside the cylinder, the
            energy that isn't converted to mechanical work leaves as heat — and that heat is what your pyrometer
            reads. Hotter combustion means higher EGTs. More fuel without enough air to burn it means hotter, less
            efficient combustion. This is why over-fueling — the same thing that causes black smoke — also drives
            EGTs up.
          </p>
          <p>
            EGT is the single most important gauge on a diesel truck because it tells you how close the combustion
            process is to exceeding the material limits of your pistons, valves, and turbo. Aluminum pistons begin
            losing structural integrity around 1200–1300°F. Exhaust valves start to glow at sustained temperatures
            above 1200°F. Turbo shaft seals can fail from the combination of heat and pressure differential.
          </p>
          <p>
            A pyrometer is cheap insurance. Without one, you have no way to know if your tune, your load, or your
            altitude is pushing your engine toward failure — until something breaks.
          </p>
        </div>
      </Section>

      <Section title="Pre-Turbo vs Post-Turbo — The Measurement Location Mistake" open={!!openSections["location"]} toggle={() => toggleSection("location")}>
        <div className="prose prose-sm max-w-none">
          <p>
            This is the #1 EGT misunderstanding in the diesel community. Many truck owners install their pyrometer
            probe in the downpipe (post-turbo) because it's easier to access than the exhaust manifold. The problem:
            post-turbo readings are typically <strong>200–400°F lower</strong> than pre-turbo.
          </p>
          <p>
            Here's why: the turbo extracts energy from the exhaust to spin the compressor wheel. That energy
            extraction cools the exhaust gas. So a post-turbo pyrometer reading of "800°F" doesn't mean your EGTs
            are a comfortable 800°F — it means your pre-turbo EGTs might be 1000–1200°F, which is getting into
            the high-load zone.
          </p>
          <p>
            The factory EGT sensors on most Duramax and newer Cummins trucks are post-turbo (for emissions
            monitoring). Aftermarket pyrometers should ideally be installed pre-turbo (in the exhaust manifold,
            as close to the head as possible) for the most accurate safety readings. If your probe is post-turbo,
            this calculator adjusts all thresholds accordingly — but pre-turbo is always preferred for safety
            monitoring.
          </p>
          <p>
            <strong>Rule of thumb:</strong> if someone on a forum says "my EGTs are fine at 1100°F" — ask them
            where their probe is. If it's post-turbo, their actual combustion temps might be 1350°F+, which is
            in the danger zone.
          </p>
        </div>
      </Section>

      <Section title="Why Drive Pressure Matters as Much as EGT" open={!!openSections["drive-pressure-edu"]} toggle={() => toggleSection("drive-pressure-edu")}>
        <div className="prose prose-sm max-w-none">
          <p>
            Drive pressure is the "other half" of turbo health that most people ignore. Drive pressure is the
            exhaust manifold pressure (measured pre-turbo, in PSI) — it's how hard the engine has to push to
            force exhaust through the turbo's turbine.
          </p>
          <p>
            The <strong>drive pressure ratio</strong> is drive pressure divided by boost pressure. Ideally, this
            ratio should be 1.0:1 or less — meaning the turbo isn't creating more backpressure than it's creating
            boost. When the ratio exceeds 1.5:1, the turbo is restricting exhaust flow. Above 2.0:1, you have a
            serious problem.
          </p>
          <p>
            Why does this matter? During the exhaust stroke, the piston pushes exhaust out of the cylinder. If
            drive pressure is high, the exhaust can't escape efficiently. During valve overlap (when both intake
            and exhaust valves are briefly open), high drive pressure pushes hot exhaust gas back into the cylinder,
            diluting the fresh air charge. This raises cylinder temperatures, reduces oxygen content, and kills power.
            The engine is literally spending horsepower just to push exhaust out — that's power that should be
            going to the wheels.
          </p>
          <p>
            High drive pressure also increases thrust load on the turbo shaft bearings and can cause the turbine-side
            shaft seal to fail, allowing oil to leak into the exhaust. On compound setups, both turbos contribute to
            total drive pressure, so the sizing of both the primary and atmospheric turbo matters.
          </p>
        </div>
      </Section>

      <Section title='The "Black Smoke = Power" Myth' open={!!openSections["smoke-myth"]} toggle={() => toggleSection("smoke-myth")}>
        <div className="prose prose-sm max-w-none">
          <p>
            Black smoke is unburned fuel. Period. It means the engine has more fuel than it has air to burn.
            Unburned fuel is wasted energy — energy that could have made power if there was enough oxygen to
            combust it. So black smoke doesn't mean power; it means <em>wasted potential power</em>.
          </p>
          <p>
            Here's the real problem: unburned fuel doesn't just leave as soot. The combustion process is still
            generating heat from the fuel that <em>does</em> burn, and the excess fuel raises EGTs because the
            combustion is inefficient (more heat per unit of useful work). So black smoke + high EGTs is a
            double warning: the engine is over-fueled and under-aired.
          </p>
          <p>
            The fix isn't more fuel — it's more air. A bigger turbo, a compound setup, or better intercooling
            gives the engine enough air to burn all the fuel cleanly. When combustion is complete, you get more
            power, lower EGTs, cleaner exhaust, and better fuel economy. The guys making 1,000+ HP on competition
            diesel trucks run very little visible smoke at peak power because their compound turbo setups supply
            enough air to burn every drop of fuel.
          </p>
        </div>
      </Section>

      <Section title="How to Reduce EGTs — Ranked by Cost" open={!!openSections["reduce-egt"]} toggle={() => toggleSection("reduce-egt")}>
        <div className="prose prose-sm max-w-none">
          <ol>
            <li>
              <strong>Back off the throttle / downshift (free)</strong> — The simplest and most effective immediate
              fix. Downshifting raises RPM, which increases turbo speed and boost, providing more air per combustion
              event. Higher RPM also reduces time for heat transfer to the piston crown.
            </li>
            <li>
              <strong>Check intercooler piping for boost leaks (free)</strong> — A loose clamp or cracked boot
              between the turbo and intake manifold leaks pressurized air. Less air in the cylinder means higher
              EGTs. This is extremely common and costs nothing to fix.
            </li>
            <li>
              <strong>Reduce tuning aggressiveness (free)</strong> — If you're running a tuner or custom tune,
              try a lower power level. Over-fueling is the #1 cause of high EGTs on modified trucks.
            </li>
            <li>
              <strong>Add water/methanol injection ($300–$600)</strong> — Water/methanol sprayed into the intake
              charge cools the incoming air (denser charge = more oxygen) and the water absorbs combustion heat.
              Can reduce EGTs by 100–200°F under load.
            </li>
            <li>
              <strong>Upgrade intercooler ($500–$1,500)</strong> — A larger or more efficient intercooler reduces
              intake air temperature, which directly reduces combustion temperature and EGTs. Especially important
              on trucks with aggressive tunes that generate high boost.
            </li>
            <li>
              <strong>Upgrade to larger turbo ($800–$2,000)</strong> — A larger turbine housing or a bigger turbo
              reduces drive pressure, allowing exhaust to exit the cylinder faster. Less residual exhaust in the
              cylinder means cooler combustion.
            </li>
            <li>
              <strong>Add compound turbos ($2,000–$5,000)</strong> — Compounds provide the most dramatic EGT
              reduction — typically 200–300°F at the same power level. The combined turbine flow area is much
              larger than any single turbo, drastically reducing drive pressure.
            </li>
          </ol>
        </div>
      </Section>

      <Section title="What Breaks at High EGTs — Failure Modes" open={!!openSections["failures"]} toggle={() => toggleSection("failures")}>
        <div className="prose prose-sm max-w-none">
          <p>These temperatures refer to <strong>pre-turbo EGT</strong> — the actual exhaust manifold temperature.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">EGT Range</th>
                <th className="text-left py-2">What Happens</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-orange-600">1200–1300°F</td>
                <td className="py-2">Exhaust valves begin to glow. Head gasket sealing surfaces weaken. Turbo oil begins to coke on the bearing surfaces.</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-red-600">1300–1400°F</td>
                <td className="py-2">Aluminum piston crown material approaches yield point. Oil coking begins on piston undercrown (oil spray cooling becomes less effective). Exhaust manifold bolts stretch.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-red-700 font-bold">1400°F+</td>
                <td className="py-2">Piston failure — melted crown, cracked ring lands, seized rings. Cracked exhaust manifold. Turbo shaft seal failure from heat. Potential catastrophic engine failure.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Cross-links */}
      <div className="mt-10 p-5 bg-gray-50 rounded-xl border">
        <p className="text-sm font-semibold text-gray-700 mb-2">Related Calculators</p>
        <div className="flex flex-wrap gap-3">
          <a href="/calculators/diesel-compound-turbo" className="text-sm text-[#E85D04] hover:underline font-medium">Diesel Compound Turbo Sizing →</a>
          <a href="/calculators/diesel-single-turbo" className="text-sm text-[#E85D04] hover:underline font-medium">Diesel Single Turbo Finder →</a>
          <a href="/calculators/diesel-lift-pump" className="text-sm text-[#E85D04] hover:underline font-medium">Diesel Lift Pump &amp; Fuel System →</a>
        </div>
      </div>
    </div>
  );
}
