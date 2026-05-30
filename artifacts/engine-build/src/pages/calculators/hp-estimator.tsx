import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown , Info } from "lucide-react";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import { HelpSidebar } from "@/components/calculators/HelpCard";
import hpEstimatorContent from "@/data/calculatorContent/hp-estimator.mjs";
import {
  enginePlatforms,
  componentCategories,
  referenceBuilds,
  headFlowToMultiplier,
  camDurationToMultiplier,
  valveLiftFactor,
  headerSizeToMultiplier,
  fuelSystemCfmCap,
  type EnginePlatform,
  type ComponentOption,
  type ReferenceBuild,
} from "@/data/hpEstimatorData";
import { useManufacturers, useFamilies, useFamilyEngines, useHpReferenceBuilds, type HpReferenceBuild } from "@/hooks/useEngineData";

// ── Estimation engine ──────────────────────────────────────────────────────────

interface CustomSpecs {
  headFlowCfm: string;
  camDuration050: string;
  valveLift: string;
  fuelCfm: string;
  headerSize: string;
}

interface Estimate {
  hp: number;
  hpLow: number;
  hpHigh: number;
  torque: number;
  tqLow: number;
  tqHigh: number;
  peakHpRpm: number;
  peakTqRpm: number;
  matchingBuilds: ReferenceBuild[];
  fuelCapFactor: number; // 1.0 = no restriction, <1.0 = carb is bottleneck
}

function computeEstimate(
  platform: EnginePlatform,
  selections: Record<string, ComponentOption>,
  customSpecs?: CustomSpecs,
): Estimate {
  // ── Additive model with platform-aware dampening ─────────────────────────
  // Each component's gain (multiplier - 1) is summed additively rather than
  // multiplied. This prevents unrealistic compounding when many mods stack.
  // Gains are scaled by (1 - stockEfficiency) so that platforms with already-
  // good factory parts (LS3, Coyote) see smaller percentage gains per mod.

  const eff = platform.stockEfficiency;
  const scale = 1 - eff; // how much room for improvement each mod has

  // Build effective selections by overriding with custom specs where provided
  const effective = { ...selections };
  if (customSpecs) {
    const hfCfm = parseFloat(customSpecs.headFlowCfm);
    if (hfCfm > 0) effective.heads = headFlowToMultiplier(hfCfm);

    const camDur = parseFloat(customSpecs.camDuration050);
    if (camDur > 0) effective.cam = camDurationToMultiplier(camDur);

    const hdrOd = parseFloat(customSpecs.headerSize);
    if (hdrOd > 0) effective.exhaust = headerSizeToMultiplier(hdrOd);
  }

  // Valve lift adjustment — modifies the head/cam synergy
  let liftHpAdj = 1, liftTqAdj = 1;
  if (customSpecs) {
    const lift = parseFloat(customSpecs.valveLift);
    if (lift > 0) {
      const adj = valveLiftFactor(lift);
      liftHpAdj = adj.hp;
      liftTqAdj = adj.tq;
    }
  }

  const naKeys = ["heads", "cam", "intake", "fuel", "exhaust", "compression"] as const;
  const inductionOpt = effective.induction;

  // Sum scaled gains for NA components
  let hpGainSum = 0;
  let tqGainSum = 0;
  for (const key of naKeys) {
    const opt = effective[key];
    if (!opt) continue;
    hpGainSum += (opt.hpMultiplier - 1) * scale;
    tqGainSum += (opt.tqMultiplier - 1) * scale;
  }

  // Synergy bonus: heads + cam working together unlock more than the sum
  const headsHpGain = ((effective.heads?.hpMultiplier ?? 1) - 1) * scale;
  const camHpGain = ((effective.cam?.hpMultiplier ?? 1) - 1) * scale;
  const headsTqGain = ((effective.heads?.tqMultiplier ?? 1) - 1) * scale;
  const camTqGain = ((effective.cam?.tqMultiplier ?? 1) - 1) * scale;
  if (headsHpGain > 0.05 && camHpGain > 0.05) {
    // Apply valve lift adjustment to the synergy bonus
    hpGainSum += Math.min(headsHpGain, camHpGain) * 0.40 * liftHpAdj;
    tqGainSum += Math.min(headsTqGain, camTqGain) * 0.25 * liftTqAdj;
  }

  // Progress-based dampening: engines closer to their NA ceiling gain less
  const progress = platform.stockHp / platform.maxReasonableHp;
  const dampFactor = 1 - progress * 0.18;
  const naHpGain = hpGainSum * dampFactor;
  const naTqGain = tqGainSum * dampFactor;

  // NA estimate
  let naHp = platform.stockHp * (1 + naHpGain);
  let naTq = platform.stockTorque * (1 + naTqGain);

  // Fuel system CFM cap — if user entered a specific CFM, check if it restricts power
  let fuelCapFactor = 1.0;
  if (customSpecs) {
    const fCfm = parseFloat(customSpecs.fuelCfm);
    if (fCfm > 0) {
      const peakRpm = platform.peakHpRpm + (effective.cam?.peakRpmShift ?? 0);
      fuelCapFactor = fuelSystemCfmCap(fCfm, platform.displacement, peakRpm);
      naHp *= fuelCapFactor;
      naTq *= fuelCapFactor;
    }
  }

  // Forced induction: multiplies NA result, but dampened for built combos
  // (a heavily-modded NA motor gains less % from boost than a stock one)
  let estHp: number;
  let estTq: number;
  const inductionHpGain = (inductionOpt?.hpMultiplier ?? 1) - 1;
  const inductionTqGain = (inductionOpt?.tqMultiplier ?? 1) - 1;
  if (inductionHpGain > 0) {
    const boostEffHp = inductionHpGain / (1 + naHpGain * 1.5);
    const boostEffTq = inductionTqGain / (1 + naTqGain * 1.5);
    estHp = Math.round(naHp * (1 + boostEffHp));
    estTq = Math.round(naTq * (1 + boostEffTq));
  } else {
    estHp = Math.round(naHp);
    estTq = Math.round(naTq);
  }

  // RPM shift
  let rpmShift = 0;
  for (const opt of Object.values(effective)) {
    rpmShift += opt.peakRpmShift;
  }
  const peakHpRpm = Math.round((platform.peakHpRpm + rpmShift) / 100) * 100;
  const peakTqRpm = Math.round((platform.peakTqRpm + rpmShift * 0.6) / 100) * 100;

  // +/- 12% spread — reflects real variation between builds with the same parts
  const spread = 0.12;
  const hpLow = Math.round(estHp * (1 - spread));
  const hpHigh = Math.round(estHp * (1 + spread));
  const tqLow = Math.round(estTq * (1 - spread));
  const tqHigh = Math.round(estTq * (1 + spread));

  // Find matching reference builds (same platform, similar component choices)
  const matchingBuilds = referenceBuilds
    .filter((b) => b.platform === platform.id)
    .map((build) => {
      let score = 0;
      if (selections.heads?.id === build.heads) score += 3;
      if (selections.cam?.id === build.cam) score += 2;
      if (selections.intake?.id === build.intake) score += 1;
      if (selections.exhaust?.id === build.exhaust) score += 1;
      if (selections.induction?.id === build.induction) score += 2;
      if (selections.compression?.id === build.compression) score += 1;
      return { build, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.build);

  return { hp: estHp, hpLow, hpHigh, torque: estTq, tqLow, tqHigh, peakHpRpm, peakTqRpm, matchingBuilds, fuelCapFactor };
}

// ── Tier badge ─────────────────────────────────────────────────────────────────

const tierColors: Record<string, string> = {
  stock: "bg-gray-200 text-gray-700",
  mild: "bg-green-100 text-green-800",
  moderate: "bg-yellow-100 text-yellow-800",
  aggressive: "bg-orange-100 text-orange-800",
  race: "bg-red-100 text-red-800",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${tierColors[tier] ?? "bg-gray-100"}`}>
      {tier}
    </span>
  );
}

// ── Build level summary ────────────────────────────────────────────────────────

function getBuildLevel(selections: Record<string, ComponentOption>): { label: string; color: string; description: string } {
  const tiers = Object.values(selections).map((o) => o.tier);
  const tierRank: Record<string, number> = { stock: 0, mild: 1, moderate: 2, aggressive: 3, race: 4 };
  const maxTier = Math.max(...tiers.map((t) => tierRank[t] ?? 0));
  const avgTier = tiers.reduce((s, t) => s + (tierRank[t] ?? 0), 0) / tiers.length;

  if (maxTier <= 0) return { label: "Stock", color: "text-gray-500", description: "Factory configuration" };
  if (avgTier < 1) return { label: "Mild", color: "text-green-600", description: "Light bolt-ons, daily-driveable" };
  if (avgTier < 2) return { label: "Street Build", color: "text-yellow-600", description: "Solid street performance, weekend warrior" };
  if (avgTier < 3) return { label: "Street/Strip", color: "text-orange-600", description: "Serious build, may need supporting mods" };
  if (maxTier >= 4) return { label: "Race Build", color: "text-red-600", description: "Full-race combination, not for daily driving" };
  return { label: "Hot Street", color: "text-orange-500", description: "Aggressive street build, needs good tune" };
}

// ── Warnings ───────────────────────────────────────────────────────────────────

function getWarnings(
  selections: Record<string, ComponentOption>,
  platform: EnginePlatform,
  estimate: Estimate,
): string[] {
  const warnings: string[] = [];
  const heads = selections.heads;
  const cam = selections.cam;
  const intake = selections.intake;
  const induction = selections.induction;
  const compression = selections.compression;

  // Cam too big for heads
  if (cam && heads) {
    const camRank: Record<string, number> = { stock: 0, rv: 1, mild: 2, moderate: 3, "hot-st": 4, race: 5 };
    const headRank: Record<string, number> = { stock: 0, "ported-stock": 1, "budget-alum": 2, "mid-alum": 3, "cnc-alum": 4, "race-heads": 5 };
    if ((camRank[cam.id] ?? 0) - (headRank[heads.id] ?? 0) >= 2) {
      warnings.push("Your cam is significantly more aggressive than your heads can support. You'll lose low-end torque without gaining much up top. Upgrade heads first.");
    }
  }

  // Single-plane intake with mild cam
  if (intake?.id === "single-pln" && cam && ["stock", "rv", "mild"].includes(cam.id)) {
    warnings.push("A single-plane intake needs a bigger cam to work properly. With a mild cam you'll lose mid-range torque compared to a dual-plane.");
  }

  // High compression + boost
  if (compression && induction) {
    const highCR = ["high", "race"].includes(compression.id);
    const boosted = !["na", "nos-75"].includes(induction.id);
    if (highCR && boosted) {
      warnings.push("High compression + boost is a detonation risk. Lower compression (9.0-9.5:1) is strongly recommended for boosted builds unless running E85 or race fuel.");
    }
  }

  // Exceeding platform's reasonable NA ceiling
  if (induction?.id === "na" && estimate.hp > platform.maxReasonableHp) {
    warnings.push(`${estimate.hp} HP NA is at the practical ceiling for a ${platform.name}. Real-world results may be lower without extensive porting and tuning.`);
  }

  // Nitrous without exhaust
  if (induction && induction.id.startsWith("nos") && selections.exhaust?.id === "stock") {
    warnings.push("Stock exhaust manifolds will choke a nitrous setup. Long-tube headers are highly recommended.");
  }

  // Fuel system bottleneck
  const fuel = selections.fuel;
  if (fuel && ["tbi", "2bbl"].includes(fuel.id) && heads && heads.id !== "stock") {
    warnings.push(`Your ${fuel.label.split("(")[0].trim()} is a significant restriction with upgraded heads. A 4-barrel carb or multi-port EFI would unlock the potential of your breathing mods.`);
  }

  // Fuel system CFM cap from custom specs
  if (estimate.fuelCapFactor < 0.90) {
    const lostPct = Math.round((1 - estimate.fuelCapFactor) * 100);
    warnings.push(`Your fuel system is undersized — it's costing you ~${lostPct}% power. Consider a larger carburetor or throttle body.`);
  }

  return warnings;
}

// ── Component ──────────────────────────────────────────────────────────────────

// ── Smog / Emissions penalty ───────────────────────────────────────────────────
// Full emissions equipment (catalytic converters, EGR, AIR pump, restrictive
// factory exhaust manifolds, retarded timing for emissions) costs real power.
// The penalty varies by era and how much equipment is present.

interface SmogPenalty {
  hpPct: number;    // percentage HP loss
  tqPct: number;    // percentage torque loss
  label: string;
  items: string[];
}

function getSmogPenalty(platformId: string): SmogPenalty {
  // Pre-emissions / carbureted (SBC, BBC, SBF, Mopar LA)
  if (["sbc-350", "sbc-383", "bbc-454", "sbf-302", "sbc-lt1", "mopar-360"].includes(platformId)) {
    return {
      hpPct: 0.12,
      tqPct: 0.08,
      label: "Full smog equipment",
      items: ["Catalytic converters", "EGR valve", "AIR pump", "Restrictive cast exhaust manifolds", "Retarded ignition timing", "Thermal vacuum switches"],
    };
  }
  // Modern OBD-II engines (LS, Coyote, Hemi) — factory already optimized around emissions
  return {
    hpPct: 0.05,
    tqPct: 0.03,
    label: "Emissions equipment",
    items: ["Catalytic converters", "EGR system", "Secondary air injection", "Restrictive factory exhaust"],
  };
}

// ── Similar Verified Dyno Builds Card ────────────────────────────────────
// Surfaces real-world dyno results that match the user's platform + aspiration
// + estimated HP ballpark. Pulled live from /data/hp_reference_builds.json
// (45 verified builds, mostly published-dyno-sheet crate engines + Engine
// Builder Magazine feature articles).
function SimilarDynoBuildsCard({
  estimateHp,
  platformCid,
  platformFamily,
  aspiration,
}: {
  estimateHp: number;
  platformCid: number;
  platformFamily: string;
  aspiration: string;
}) {
  const { data: builds } = useHpReferenceBuilds();

  const matches = useMemo(() => {
    if (!builds || builds.length === 0 || estimateHp <= 0) return [];
    // Score each build by similarity. Lower score = closer match.
    const familyTokens = platformFamily.toLowerCase().split(/[\s/]+/).filter(t => t.length >= 2);
    const aspNormalized = aspiration === "na" ? "NA"
      : aspiration.includes("turbo") ? "turbo"
      : aspiration.includes("super") ? "supercharged"
      : aspiration.includes("nitrous") ? "nitrous"
      : aspiration.toUpperCase();

    const scored = builds.map(b => {
      let score = 0;
      // CID match: 1 pt per 10 CI of difference
      score += Math.abs(b.cid - platformCid) / 10;
      // HP match: 1 pt per 50 HP of difference
      score += Math.abs(b.dyno_hp - estimateHp) / 50;
      // Aspiration mismatch: heavy penalty unless matched
      const buildAsp = b.aspiration.toLowerCase();
      const matchesAsp = (aspNormalized === "NA" && buildAsp === "na")
                     || (aspNormalized === "turbo" && buildAsp.includes("turbo"))
                     || (aspNormalized === "supercharged" && buildAsp.includes("super"))
                     || (aspNormalized === "nitrous" && buildAsp.includes("nitrous"));
      if (!matchesAsp) score += 100;
      // Engine-family token match: each matched token is -2 pts (bonus)
      const buildFamily = b.engine_family.toLowerCase();
      for (const tok of familyTokens) {
        if (buildFamily.includes(tok)) score -= 2;
      }
      return { b, score };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 8).map(s => s.b);
  }, [builds, estimateHp, platformCid, platformFamily, aspiration]);

  if (matches.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="w-5 h-5 text-[#E85D04]" />
          Similar Verified Dyno Builds (~{estimateHp} HP target)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Real engines with published dyno results that match your platform and aspiration.
          Use these as a sanity check — if no published build is within ±20% of your estimate,
          your inputs may be outside the practical range.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-2 py-2 text-left font-semibold text-gray-700">Source / Engine</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">CID</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700">Asp.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">Dyno HP</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">TQ</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700">Heads</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700">Tier</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((b, i) => {
                const closeHp = Math.abs(b.dyno_hp - estimateHp) / estimateHp < 0.15;
                return (
                  <tr key={`${b.source}-${b.engine_family}-${i}`} className={`border-b hover:bg-gray-50 ${closeHp ? "bg-[#E85D04]/5" : ""}`}>
                    <td className="px-2 py-1.5">
                      <div className="font-semibold text-gray-800">
                        {b.source_url ? (
                          <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#E85D04] hover:underline">
                            {b.source}
                          </a>
                        ) : b.source}
                      </div>
                      <div className="text-[10px] text-gray-500">{b.engine_family}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{b.cid}</td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600">{b.aspiration}</td>
                    <td className={`px-2 py-1.5 text-right font-mono font-bold ${closeHp ? "text-[#E85D04]" : ""}`}>{b.dyno_hp}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{b.dyno_tq ?? "—"}</td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600 max-w-[180px]">{b.heads ?? "—"}</td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600">{b.tier}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
          <strong className="text-[#E85D04]">Orange-highlighted rows</strong> are within ±15% of your estimate. Click any source to view the dyno-sheet / article.
        </p>
      </CardContent>
    </Card>
  );
}

export default function HpEstimator() {
  // Engine picker state (from database)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMfr, setPickerMfr] = useState("");
  const [pickerFamily, setPickerFamily] = useState("");
  const [pickerEngine, setPickerEngine] = useState("");
  const { manufacturers } = useManufacturers();
  const { families } = useFamilies();
  const { familyData } = useFamilyEngines(pickerMfr, pickerFamily);
  const filteredFamilies = families.filter(f => f.manufacturer_slug === pickerMfr);

  const handlePickerEngine = (engineId: string) => {
    setPickerEngine(engineId);
    if (!familyData) return;
    const eng = familyData.engines.find(e => e.engine_id === engineId);
    if (!eng) return;
    // Try to match to the closest platform by displacement
    if (eng.displacement_ci) {
      const closest = enginePlatforms.reduce((best, p) =>
        Math.abs(p.displacement - (eng.displacement_ci || 0)) < Math.abs(best.displacement - (eng.displacement_ci || 0)) ? p : best
      );
      if (Math.abs(closest.displacement - eng.displacement_ci) < 50) {
        setPlatformId(closest.id);
      }
    }
  };

  const [platformId, setPlatformId] = useState<string>("sbc-350");
  const [selections, setSelections] = useState<Record<string, string>>({
    heads: "stock",
    cam: "stock",
    intake: "stock",
    fuel: "4bbl-street",
    exhaust: "stock",
    compression: "stock",
    induction: "na",
  });
  const [smogEquipped, setSmogEquipped] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [customSpecs, setCustomSpecs] = useState<CustomSpecs>({
    headFlowCfm: "", camDuration050: "", valveLift: "", fuelCfm: "", headerSize: "",
  });
  // Valve lift calculator helper
  const [lobeLift, setLobeLift] = useState("");
  const [rockerRatio, setRockerRatio] = useState("1.5");

  const platform = enginePlatforms.find((p) => p.id === platformId)!;

  // Resolve selections to full ComponentOption objects
  const resolvedSelections = useMemo(() => {
    const resolved: Record<string, ComponentOption> = {};
    for (const cat of componentCategories) {
      const selId = selections[cat.id];
      const opt = cat.options.find((o) => o.id === selId) ?? cat.options[0];
      resolved[cat.id] = opt;
    }
    return resolved;
  }, [selections]);

  const hasCustomSpecs = Object.values(customSpecs).some((v) => v !== "");
  const rawEstimate = useMemo(
    () => computeEstimate(platform, resolvedSelections, hasCustomSpecs ? customSpecs : undefined),
    [platform, resolvedSelections, customSpecs, hasCustomSpecs],
  );
  const smogPenalty = useMemo(() => getSmogPenalty(platformId), [platformId]);

  // Apply smog penalty if equipped
  const estimate = useMemo(() => {
    if (!smogEquipped) return rawEstimate;
    const hpHit = smogPenalty.hpPct;
    const tqHit = smogPenalty.tqPct;
    const hp = Math.round(rawEstimate.hp * (1 - hpHit));
    const torque = Math.round(rawEstimate.torque * (1 - tqHit));
    const spread = 0.12;
    return {
      ...rawEstimate,
      hp,
      torque,
      hpLow: Math.round(hp * (1 - spread)),
      hpHigh: Math.round(hp * (1 + spread)),
      tqLow: Math.round(torque * (1 - spread)),
      tqHigh: Math.round(torque * (1 + spread)),
    };
  }, [rawEstimate, smogEquipped, smogPenalty]);

  const buildLevel = useMemo(() => getBuildLevel(resolvedSelections), [resolvedSelections]);
  const warnings = useMemo(() => getWarnings(resolvedSelections, platform, rawEstimate), [resolvedSelections, platform, rawEstimate]);

  const handlePlatformChange = (value: string) => {
    setPlatformId(value);
    setSmogEquipped(false);
    setCustomSpecs({ headFlowCfm: "", camDuration050: "", valveLift: "", fuelCfm: "", headerSize: "" });
    setSelections({
      heads: "stock",
      cam: "stock",
      intake: "stock",
      fuel: "4bbl-street",
      exhaust: "stock",
      compression: "stock",
      induction: "na",
    });
  };

  const handleSelectionChange = (categoryId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [categoryId]: optionId }));
  };

  const gainHp = estimate.hp - platform.stockHp;
  const gainTq = estimate.torque - platform.stockTorque;
  const gainHpPct = ((gainHp / platform.stockHp) * 100).toFixed(0);
  const gainTqPct = ((gainTq / platform.stockTorque) * 100).toFixed(0);

  const smogHpLoss = smogEquipped ? Math.round(rawEstimate.hp * smogPenalty.hpPct) : 0;
  const smogTqLoss = smogEquipped ? Math.round(rawEstimate.torque * smogPenalty.tqPct) : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Engine Horsepower Calculator | HP Estimator"
        description="Estimate horsepower and torque for your engine build. Select heads, cam, intake, exhaust, and compression for a data-backed HP estimate."
        canonical="/calculators/hp-estimator"
        keywords="hp estimator, horsepower estimator, engine build hp calculator, dyno estimate, cam heads hp, engine power calculator, how much hp will I make"
      />

      <h1 className="text-3xl font-bold mb-2">HP &amp; Torque Estimator</h1>
      <p className="text-muted-foreground mb-8">
        Pick your engine and components — get a data-backed HP &amp; torque estimate based on real dyno results from similar builds.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

        {/* ── Left: Inputs ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Platform selector */}
          <Card>
            <CardHeader><CardTitle>Engine Platform</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="text-sm font-medium text-[#E85D04] hover:underline"
                >
                  {showPicker ? "Hide engine picker \u2191" : "Auto-fill from engine database \u2193"}
                </button>
                {showPicker && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Manufacturer</Label>
                      <Select value={pickerMfr} onValueChange={v => { setPickerMfr(v); setPickerFamily(""); setPickerEngine(""); }}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {manufacturers.map(m => (
                            <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Family</Label>
                      <Select value={pickerFamily} onValueChange={v => { setPickerFamily(v); setPickerEngine(""); }} disabled={!pickerMfr}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {filteredFamilies.map(f => (
                            <SelectItem key={f.family_slug} value={f.family_slug}>{f.family_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Engine</Label>
                      <Select value={pickerEngine} onValueChange={handlePickerEngine} disabled={!familyData}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {familyData?.engines.map(e => (
                            <SelectItem key={e.engine_id} value={e.engine_id}>
                              {e.displacement_ci ? `${e.displacement_ci}ci` : ""} {e.year || ""} {e.variants?.[0]?.code || e.engine_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Select your engine</Label>
                <Select value={platformId} onValueChange={handlePlatformChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {enginePlatforms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.displacement}ci / {p.stockHp} HP stock
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <p><strong>{platform.family}</strong> — {platform.displacement} ci, {platform.cylinders} cyl</p>
                <p className="mt-1">Stock: {platform.stockHp} HP @ {platform.peakHpRpm} / {platform.stockTorque} ft-lbs @ {platform.peakTqRpm}</p>
                <p className="mt-1 text-xs">{platform.notes}</p>
              </div>
            </CardContent>
          </Card>

          {/* Component selectors */}
          <Card>
            <CardHeader><CardTitle>Build Components</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {componentCategories.map((cat) => {
                const selected = cat.options.find((o) => o.id === selections[cat.id]) ?? cat.options[0];
                return (
                  <div key={cat.id} className="space-y-1">
                    <Label>{cat.name}</Label>
                    <Select value={selections[cat.id]} onValueChange={(v) => handleSelectionChange(cat.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {cat.options.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <TierBadge tier={selected.tier} />
                      {selected.description}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Smog / Emissions toggle */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Emissions / Smog Equipment</p>
                  <p className="text-xs text-muted-foreground">
                    {smogEquipped
                      ? `Full emissions equipment reduces output by ~${(smogPenalty.hpPct * 100).toFixed(0)}% HP / ~${(smogPenalty.tqPct * 100).toFixed(0)}% torque`
                      : "Most performance builds remove emissions equipment"
                    }
                  </p>
                </div>
                <div className="flex rounded-lg border overflow-hidden text-xs shrink-0 ml-4">
                  <button
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      !smogEquipped
                        ? "bg-[#1a1a1a] text-white"
                        : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setSmogEquipped(false)}
                  >
                    Removed
                  </button>
                  <button
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      smogEquipped
                        ? "bg-[#1a1a1a] text-white"
                        : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setSmogEquipped(true)}
                  >
                    Installed
                  </button>
                </div>
              </div>
              {smogEquipped && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100 text-xs text-yellow-800">
                  <p className="font-medium mb-1">Equipment penalizing output:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {smogPenalty.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-yellow-700">
                    Estimated loss: <strong>-{smogHpLoss} HP</strong> / <strong>-{smogTqLoss} ft-lbs</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Part Specs (collapsible) */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-[#E85D04]/10 font-medium text-sm hover:bg-[#E85D04]/20 transition-colors"
              onClick={() => setSpecsOpen(!specsOpen)}
            >
              <span>Enter Your Part Specs (optional — overrides dropdowns)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${specsOpen ? "rotate-180" : ""}`} />
            </button>
            {specsOpen && (
              <div className="p-5 space-y-5">
                <p className="text-xs text-muted-foreground">
                  Enter real numbers from your parts' spec sheets for a more precise estimate. Leave fields blank to use the dropdown selections above.
                </p>

                {/* Head flow */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Intake Port Flow (CFM @ 28" H2O)</Label>
                  <Input
                    type="number" step="5" min="100" max="450" placeholder="e.g. 230"
                    value={customSpecs.headFlowCfm}
                    onChange={(e) => setCustomSpecs((p) => ({ ...p, headFlowCfm: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Peak intake CFM per port — on the head manufacturer's spec sheet or flow bench report.
                  </p>
                  {customSpecs.headFlowCfm && parseFloat(customSpecs.headFlowCfm) > 0 && (
                    <p className="text-[11px] text-primary font-medium">
                      {parseFloat(customSpecs.headFlowCfm)} CFM maps to ~{((headFlowToMultiplier(parseFloat(customSpecs.headFlowCfm)).hpMultiplier - 1) * 100).toFixed(0)}% HP gain over stock heads
                    </p>
                  )}
                </div>

                {/* Cam duration */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Cam Duration @ .050" (intake, degrees)</Label>
                  <Input
                    type="number" step="2" min="170" max="280" placeholder="e.g. 224"
                    value={customSpecs.camDuration050}
                    onChange={(e) => setCustomSpecs((p) => ({ ...p, camDuration050: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Duration at .050" lift for the intake lobe — on the cam card or manufacturer's spec page. Use the intake number (first of the two).
                  </p>
                </div>

                {/* Valve lift with calculator */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Valve Lift — Intake (inches, at the valve)</Label>
                  <Input
                    type="number" step="0.005" min="0.300" max="0.800" placeholder="e.g. 0.530"
                    value={customSpecs.valveLift}
                    onChange={(e) => setCustomSpecs((p) => ({ ...p, valveLift: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Gross valve lift at the valve (with rocker ratio applied). If your cam card only shows lobe lift, use the calculator below.
                  </p>

                  {/* Mini valve lift calculator */}
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-[11px] font-medium text-muted-foreground">Valve Lift Calculator: Lobe Lift x Rocker Ratio</p>
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <Label className="text-[10px]">Lobe Lift</Label>
                        <Input type="number" step="0.005" placeholder=".330" value={lobeLift} onChange={(e) => setLobeLift(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Rocker Ratio</Label>
                        <Select value={rockerRatio} onValueChange={setRockerRatio}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1.5">1.5:1 (SBC, Pontiac, Mopar LA/B/RB/Hemi)</SelectItem>
                            <SelectItem value="1.55">1.55:1 (Buick 350/455)</SelectItem>
                            <SelectItem value="1.6">1.6:1 (SBF Windsor, Olds SB, Buick, AMC, Gen III Hemi)</SelectItem>
                            <SelectItem value="1.65">1.65:1 (Cadillac 472/500, Pontiac SD)</SelectItem>
                            <SelectItem value="1.7">1.7:1 (BBC, LS1/LS2/LS3/LS6)</SelectItem>
                            <SelectItem value="1.73">1.73:1 (Ford Cleveland/FE 390/428)</SelectItem>
                            <SelectItem value="1.76">1.76:1 (Ford FE 352/427)</SelectItem>
                            <SelectItem value="1.8">1.8:1 (LS7/LS9, Olds Rocket BB)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        {lobeLift && parseFloat(lobeLift) > 0 && (
                          <button
                            className="w-full h-9 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                            onClick={() => {
                              const result = (parseFloat(lobeLift) * parseFloat(rockerRatio)).toFixed(3);
                              setCustomSpecs((p) => ({ ...p, valveLift: result }));
                            }}
                          >
                            = {(parseFloat(lobeLift) * parseFloat(rockerRatio)).toFixed(3)}" → Use
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fuel system CFM */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Fuel System CFM</Label>
                  <Input
                    type="number" step="25" min="150" max="1200" placeholder="e.g. 750"
                    value={customSpecs.fuelCfm}
                    onChange={(e) => setCustomSpecs((p) => ({ ...p, fuelCfm: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    CFM rating of your carburetor or throttle body — printed on the carb or on the box.
                  </p>

                  {/* Carb CFM quick reference */}
                  <div className="mt-2 p-3 rounded-lg bg-muted/50">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Common Carb/TB CFM Reference</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>GM TBI (stock): <strong>220</strong></span>
                      <span>Rochester 2GC: <strong>350</strong></span>
                      <span>Holley 4160 (vacuum): <strong>600</strong></span>
                      <span>Edelbrock AVS2: <strong>650</strong></span>
                      <span>Q-Jet (spread bore): <strong>750</strong></span>
                      <span>Holley 4150: <strong>750</strong></span>
                      <span>Holley 4150 HP (DP): <strong>750</strong></span>
                      <span>Holley 4150 (DP): <strong>850</strong></span>
                      <span>Holley Dominator: <strong>1050</strong></span>
                      <span>LS throttle body: <strong>90mm = ~1000+</strong></span>
                    </div>
                  </div>
                </div>

                {/* Header primary size */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Header Primary Tube OD (inches)</Label>
                  <Input
                    type="number" step="0.125" min="1.25" max="2.5" placeholder='e.g. 1.75'
                    value={customSpecs.headerSize}
                    onChange={(e) => setCustomSpecs((p) => ({ ...p, headerSize: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Outside diameter of your header primary tubes — stamped on the tube or listed in the header specs.
                  </p>
                </div>

                {/* Clear all button */}
                {hasCustomSpecs && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setCustomSpecs({ headFlowCfm: "", camDuration050: "", valveLift: "", fuelCfm: "", headerSize: "" })}
                  >
                    Clear all custom specs (use dropdowns only)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Results ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Build level */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Build Level</p>
              <p className={`text-2xl font-bold ${buildLevel.color}`}>{buildLevel.label}</p>
              <p className="text-sm text-muted-foreground">{buildLevel.description}</p>
            </CardContent>
          </Card>

          {/* Estimated output */}
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader>
              <CardTitle>
                Estimated Output
                {smogEquipped && (
                  <span className="ml-2 text-xs font-normal text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                    with smog
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-gray-400 text-sm">Peak Horsepower</p>
                <p className="text-5xl font-bold text-primary">{estimate.hp} HP</p>
                <p className="text-sm text-gray-400">Range: {estimate.hpLow}–{estimate.hpHigh} HP @ ~{estimate.peakHpRpm} RPM</p>
                {smogEquipped && (
                  <p className="text-xs text-yellow-400 mt-1">Without smog: {rawEstimate.hp} HP (-{smogHpLoss} HP from emissions)</p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Peak Torque</p>
                <p className="text-5xl font-bold">{estimate.torque} ft-lbs</p>
                <p className="text-sm text-gray-400">Range: {estimate.tqLow}–{estimate.tqHigh} ft-lbs @ ~{estimate.peakTqRpm} RPM</p>
                {smogEquipped && (
                  <p className="text-xs text-yellow-400 mt-1">Without smog: {rawEstimate.torque} ft-lbs (-{smogTqLoss} from emissions)</p>
                )}
              </div>
              <div className="border-t border-gray-700 pt-3">
                <p className="text-sm text-gray-400">Gain over stock</p>
                <p className="text-lg font-semibold">
                  <span className={gainHp >= 0 ? "text-green-400" : "text-red-400"}>
                    {gainHp >= 0 ? "+" : ""}{gainHp} HP ({gainHpPct}%)
                  </span>
                  {" / "}
                  <span className={gainTq >= 0 ? "text-green-400" : "text-red-400"}>
                    {gainTq >= 0 ? "+" : ""}{gainTq} ft-lbs ({gainTqPct}%)
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Card className="border-orange-300 bg-orange-50">
              <CardHeader><CardTitle className="text-orange-800 text-sm">Build Warnings</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm text-orange-800">{w}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Similar builds */}
          {estimate.matchingBuilds.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Similar Real-World Builds</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {estimate.matchingBuilds.map((build, i) => (
                  <div key={i} className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-sm">{build.name}</p>
                    <p className="text-primary font-bold">{build.hp} HP / {build.torque} ft-lbs @ {build.rpm} RPM</p>
                    <p className="text-xs text-muted-foreground mt-1">{build.source}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      </div>{/* end left column */}

      <HelpSidebar className="xl:w-80 shrink-0 space-y-6">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-[#E85D04]" />
              Quick Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">How It Works</h4>
              <p>Component-modifier model calibrated against published dyno results. Each upgrade applies a real-world multiplier that compounds.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Accuracy</h4>
              <p>Realistic ballpark with +/- 8% range. Real output depends on tuning, builder skill, port work quality, and altitude.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Component Matching</h4>
              <p>Engine is an air pump. Heads, cam, intake, and exhaust must match the same performance level. Mismatched parts leave power on the table.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Flywheel vs Wheels</h4>
              <ul className="space-y-1 mt-1">
                <li><span className="font-medium text-foreground">Manual trans:</span> -12-15% loss</li>
                <li><span className="font-medium text-foreground">Auto trans:</span> -18-22% loss</li>
              </ul>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Altitude Effect</h4>
              <p>NA engines lose ~3% per 1,000 ft elevation. 400 HP at sea level = ~364 HP in Denver (5,280 ft).</p>
            </div>
          </CardContent>
        </Card>
      </HelpSidebar>

      </div>{/* end flex row */}

      <SimilarDynoBuildsCard
        estimateHp={estimate.hp}
        platformCid={platform.displacement}
        platformFamily={platform.family}
        aspiration={selections.induction || "na"}
      />

      <CalculatorContent data={hpEstimatorContent} title="HP & Torque Estimator" />
    </div>
  );
}
