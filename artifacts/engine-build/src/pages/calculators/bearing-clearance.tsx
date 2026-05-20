import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useBuildField } from "@/hooks/useBuildField";
import { useBuildContext } from "@/context/BuildContext";
import { useEnginesWithClearances } from "@/hooks/useEngineData";

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = "measurements" | "lookup" | "plastigage";
type BearingType = "main" | "rod";
type BlockMaterial = "iron" | "aluminum";
type BuildLevel = "street" | "street-strip" | "race";
type CrankGrind = "standard" | "0.001" | "0.010" | "0.020" | "0.030";

interface BearingEntry {
  journalOD: string;
  housingBore: string;
}

interface EnginePlatform {
  label: string;
  mainJournalMin: number;
  mainJournalMax: number;
  rodJournalMin: number;
  rodJournalMax: number;
  numMains: number;
  numRods: number;
  blockMaterial: BlockMaterial;
  mainClearanceFactory: [number, number];
  rodClearanceFactory: [number, number];
}

interface ClearanceSpec {
  main: [number, number];
  rod: [number, number];
}

interface Warning {
  level: "red" | "yellow" | "blue";
  message: string;
}

// ── Engine Platform Data ───────────────────────────────────────────────────────
// Journal diameters from factory service manuals and Clevite catalogs

const enginePlatforms: Record<string, EnginePlatform> = {
  "sbc-350": {
    label: "Chevy Small Block 350",
    mainJournalMin: 2.4484, mainJournalMax: 2.4493,
    rodJournalMin: 2.0988, rodJournalMax: 2.0998,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0008, 0.0020],
    rodClearanceFactory: [0.0013, 0.0035],
  },
  "bbc-454": {
    label: "Chevy Big Block 454",
    mainJournalMin: 2.7481, mainJournalMax: 2.7490,
    rodJournalMin: 2.3248, rodJournalMax: 2.3258,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0008, 0.0020],
    rodClearanceFactory: [0.0009, 0.0025],
  },
  "ls1": {
    label: "GM LS1 / LS6 (5.7L)",
    mainJournalMin: 2.5580, mainJournalMax: 2.5590,
    rodJournalMin: 2.0991, rodJournalMax: 2.1000,
    numMains: 5, numRods: 8, blockMaterial: "aluminum",
    mainClearanceFactory: [0.0006, 0.0017],
    rodClearanceFactory: [0.0009, 0.0025],
  },
  "ls2": {
    label: "GM LS2 / LS3 / L92 (6.0–6.2L)",
    mainJournalMin: 2.5580, mainJournalMax: 2.5590,
    rodJournalMin: 2.0991, rodJournalMax: 2.1000,
    numMains: 5, numRods: 8, blockMaterial: "aluminum",
    mainClearanceFactory: [0.0006, 0.0017],
    rodClearanceFactory: [0.0009, 0.0025],
  },
  "ford-302": {
    label: "Ford 302 / 5.0L Windsor",
    mainJournalMin: 2.2482, mainJournalMax: 2.2490,
    rodJournalMin: 2.1228, rodJournalMax: 2.1236,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0005, 0.0015],
    rodClearanceFactory: [0.0008, 0.0026],
  },
  "ford-351w": {
    label: "Ford 351 Windsor",
    mainJournalMin: 2.9994, mainJournalMax: 3.0002,
    rodJournalMin: 2.3103, rodJournalMax: 2.3111,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0005, 0.0015],
    rodClearanceFactory: [0.0008, 0.0026],
  },
  "mopar-340": {
    label: "Mopar 340 / 360 LA",
    mainJournalMin: 2.4995, mainJournalMax: 2.5005,
    rodJournalMin: 2.1240, rodJournalMax: 2.1250,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0005, 0.0020],
    rodClearanceFactory: [0.0005, 0.0025],
  },
  "ford-mod-46": {
    label: "Ford 4.6L / 5.4L Modular",
    mainJournalMin: 2.6568, mainJournalMax: 2.6576,
    rodJournalMin: 2.0862, rodJournalMax: 2.0870,
    numMains: 5, numRods: 8, blockMaterial: "aluminum",
    mainClearanceFactory: [0.0009, 0.0019],
    rodClearanceFactory: [0.0010, 0.0025],
  },
  "ford-coyote": {
    label: "Ford 5.0L Coyote",
    mainJournalMin: 2.6568, mainJournalMax: 2.6576,
    rodJournalMin: 2.0862, rodJournalMax: 2.0870,
    numMains: 5, numRods: 8, blockMaterial: "aluminum",
    mainClearanceFactory: [0.0007, 0.0017],
    rodClearanceFactory: [0.0009, 0.0022],
  },
  "ford-fe": {
    label: "Ford FE (352–428)",
    mainJournalMin: 2.7484, mainJournalMax: 2.7494,
    rodJournalMin: 2.4378, rodJournalMax: 2.4388,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0008, 0.0025],
    rodClearanceFactory: [0.0008, 0.0025],
  },
  "mopar-brb": {
    label: "Mopar B/RB (383–440)",
    mainJournalMin: 2.6245, mainJournalMax: 2.6255,
    rodJournalMin: 2.3748, rodJournalMax: 2.3758,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0005, 0.0020],
    rodClearanceFactory: [0.0005, 0.0020],
  },
  "mopar-hemi": {
    label: "Mopar 426 Hemi",
    mainJournalMin: 2.7495, mainJournalMax: 2.7505,
    rodJournalMin: 2.3748, rodJournalMax: 2.3758,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0015, 0.0025],
    rodClearanceFactory: [0.0015, 0.0025],
  },
  "pontiac": {
    label: "Pontiac V8 (326–455)",
    mainJournalMin: 2.9990, mainJournalMax: 3.0000,
    rodJournalMin: 2.2480, rodJournalMax: 2.2490,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0005, 0.0021],
    rodClearanceFactory: [0.0005, 0.0025],
  },
  "oldsmobile": {
    label: "Oldsmobile V8 (260–455)",
    mainJournalMin: 2.4988, mainJournalMax: 2.4998,
    rodJournalMin: 2.1238, rodJournalMax: 2.1248,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0005, 0.0021],
    rodClearanceFactory: [0.0005, 0.0025],
  },
  "buick": {
    label: "Buick V8 (300–455)",
    mainJournalMin: 2.9990, mainJournalMax: 3.0000,
    rodJournalMin: 2.2487, rodJournalMax: 2.2497,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.0004, 0.0020],
    rodClearanceFactory: [0.0005, 0.0023],
  },
  "amc": {
    label: "AMC V8 (290–401)",
    mainJournalMin: 2.7474, mainJournalMax: 2.7484,
    rodJournalMin: 2.0934, rodJournalMax: 2.0944,
    numMains: 5, numRods: 8, blockMaterial: "iron",
    mainClearanceFactory: [0.001, 0.003],
    rodClearanceFactory: [0.001, 0.003],
  },
};

// ── Clearance Recommendations by Build Level ───────────────────────────────────
// From Clevite/Mahle, King Bearings, and ACL technical bulletins

const clearanceSpecs: Record<BuildLevel, ClearanceSpec> = {
  "street":       { main: [0.0015, 0.0025], rod: [0.0015, 0.0022] },
  "street-strip": { main: [0.0025, 0.0030], rod: [0.0020, 0.0028] },
  "race":         { main: [0.0028, 0.0035], rod: [0.0025, 0.0032] },
};

const buildLevelLabels: Record<BuildLevel, string> = {
  "street": "Street / daily",
  "street-strip": "Street-strip",
  "race": "Dedicated race",
};

// ── Oil Viscosity Recommendations ──────────────────────────────────────────────
// Based on Clevite/Mahle bearing clearance-to-oil-viscosity chart

function getOilRecommendation(clearance: number): string {
  if (clearance <= 0.0015) return "0W-20 or 5W-20";
  if (clearance <= 0.0025) return "5W-30 or 10W-30";
  if (clearance <= 0.0030) return "10W-40 or 15W-40";
  return "20W-50";
}

// ── Assessment Logic ───────────────────────────────────────────────────────────

type Assessment = "good" | "tight" | "loose" | "danger-tight" | "danger-loose";

function assessClearance(
  clearance: number,
  type: BearingType,
  buildLevel: BuildLevel,
  blockMaterial: BlockMaterial,
): { assessment: Assessment; label: string; color: string; bgColor: string; borderColor: string } {
  const spec = clearanceSpecs[buildLevel];
  const range = type === "main" ? spec.main : spec.rod;
  const [min, max] = range;

  // Aluminum block correction: assembled clearance is typically 0.0005" tighter
  // because aluminum expands more at operating temp, opening the clearance
  const aluminumOffset = blockMaterial === "aluminum" ? -0.0005 : 0;
  const adjMin = min + aluminumOffset;
  const adjMax = max + aluminumOffset;

  if (clearance < 0.001) {
    return { assessment: "danger-tight", label: "DANGER — too tight. Bearing will overheat and fail.", color: "text-red-800", bgColor: "bg-red-50", borderColor: "border-red-200" };
  }
  if (clearance > 0.004) {
    return { assessment: "danger-loose", label: "Clearance is excessive. Oil pressure will drop significantly.", color: "text-red-800", bgColor: "bg-red-50", borderColor: "border-red-200" };
  }
  if (clearance < adjMin) {
    return { assessment: "tight", label: "Tight — lower edge of acceptable. Use lighter oil weight.", color: "text-yellow-800", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" };
  }
  if (clearance > adjMax + 0.0005) {
    return { assessment: "loose", label: "Loose — upper edge. Use heavier oil weight.", color: "text-orange-800", bgColor: "bg-orange-50", borderColor: "border-orange-200" };
  }
  return { assessment: "good", label: "Within recommended range for your build level.", color: "text-green-800", bgColor: "bg-green-50", borderColor: "border-green-200" };
}

// ── Plastigage Scale Values ────────────────────────────────────────────────────

const plastigageValues = [
  { width: "Very wide", clearance: 0.001, label: "0.001\"" },
  { width: "Wide", clearance: 0.0015, label: "0.0015\"" },
  { width: "Medium-wide", clearance: 0.002, label: "0.002\"" },
  { width: "Medium", clearance: 0.0025, label: "0.0025\"" },
  { width: "Medium-narrow", clearance: 0.003, label: "0.003\"" },
  { width: "Narrow", clearance: 0.0035, label: "0.0035\"" },
  { width: "Very narrow", clearance: 0.004, label: "0.004\"" },
];

// ── Helper ─────────────────────────────────────────────────────────────────────

function formatClearance(val: number): string {
  return val.toFixed(4);
}

function formatThousandths(val: number): string {
  return (val * 1000).toFixed(1);
}

function makeEmptyEntry(): BearingEntry {
  return { journalOD: "", housingBore: "" };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BearingClearanceCalculator() {
  const [cylinders] = useBuildField("shortBlock.cylinders", "8");
  const { activeBuild, setField: setBuildField } = useBuildContext();

  // Load engine platforms from JSON data (supplements hardcoded presets)
  const { platforms: jsonPlatforms, loading: jsonLoading } = useEnginesWithClearances();

  // Merge JSON platforms into the hardcoded enginePlatforms
  const allPlatforms = useMemo(() => {
    const merged: Record<string, EnginePlatform> = { ...enginePlatforms };
    for (const jp of jsonPlatforms) {
      const key = `json-${jp.engineId}`;
      if (merged[key]) continue;
      // Skip if we already have a hardcoded entry for this family
      const alreadyCovered = Object.values(merged).some(
        p => Math.abs(p.mainJournalMin - jp.mainJournal) < 0.01 &&
             Math.abs(p.rodJournalMin - jp.rodJournal) < 0.01
      );
      if (alreadyCovered) continue;
      merged[key] = {
        label: jp.label,
        mainJournalMin: jp.mainJournal - 0.0005,
        mainJournalMax: jp.mainJournal + 0.0005,
        rodJournalMin: jp.rodJournal - 0.0005,
        rodJournalMax: jp.rodJournal + 0.0005,
        numMains: 5,
        numRods: jp.numCylinders,
        blockMaterial: (jp.blockMaterial?.toLowerCase().includes("alum") ? "aluminum" : "iron") as BlockMaterial,
        mainClearanceFactory: [jp.mainClearanceMin, jp.mainClearanceMax],
        rodClearanceFactory: [jp.rodClearanceMin, jp.rodClearanceMax],
      };
    }
    return merged;
  }, [jsonPlatforms]);

  // Mode
  const [mode, setMode] = useState<Mode>("measurements");

  // Shared
  const [blockMaterial, setBlockMaterial] = useState<BlockMaterial>("iron");
  const [buildLevel, setBuildLevel] = useState<BuildLevel>("street");
  const [crankGrind, setCrankGrind] = useState<CrankGrind>("standard");
  const [platform, setPlatform] = useState<string>("");

  // Measurement mode — single entry
  const [mainJournalOD, setMainJournalOD] = useState("");
  const [mainHousingBore, setMainHousingBore] = useState("");
  const [rodJournalOD, setRodJournalOD] = useState("");
  const [rodHousingBore, setRodHousingBore] = useState("");

  // Per-bearing mode
  const [perBearingMode, setPerBearingMode] = useState(false);
  const [numMains, setNumMains] = useState(5);
  const [numRods, setNumRods] = useState(parseInt(cylinders) || 8);
  const [mainEntries, setMainEntries] = useState<BearingEntry[]>(() =>
    Array.from({ length: 5 }, makeEmptyEntry)
  );
  const [rodEntries, setRodEntries] = useState<BearingEntry[]>(() =>
    Array.from({ length: 8 }, makeEmptyEntry)
  );

  // Plastigage mode
  const [plastigageClearance, setPlastigageClearance] = useState("");
  const [plastigageBearingType, setPlastigageBearingType] = useState<BearingType>("main");

  // Sync rod count from cylinders
  useEffect(() => {
    const c = parseInt(cylinders) || 8;
    setNumRods(c);
    setRodEntries(prev => {
      if (prev.length === c) return prev;
      const next = Array.from({ length: c }, (_, i) => prev[i] || makeEmptyEntry());
      return next;
    });
  }, [cylinders]);

  // Resize per-bearing arrays when counts change
  useEffect(() => {
    setMainEntries(prev => {
      if (prev.length === numMains) return prev;
      return Array.from({ length: numMains }, (_, i) => prev[i] || makeEmptyEntry());
    });
  }, [numMains]);

  useEffect(() => {
    setRodEntries(prev => {
      if (prev.length === numRods) return prev;
      return Array.from({ length: numRods }, (_, i) => prev[i] || makeEmptyEntry());
    });
  }, [numRods]);

  // Auto-fill from platform selection
  useEffect(() => {
    if (!platform) return;
    const p = allPlatforms[platform];
    if (!p) return;
    setBlockMaterial(p.blockMaterial);
    setNumMains(p.numMains);
    setNumRods(p.numRods);
    if (mode === "measurements" && !perBearingMode) {
      const mainMid = ((p.mainJournalMin + p.mainJournalMax) / 2).toFixed(4);
      const rodMid = ((p.rodJournalMin + p.rodJournalMax) / 2).toFixed(4);
      setMainJournalOD(mainMid);
      setRodJournalOD(rodMid);
    }
  }, [platform]);

  // ── Compute clearances (measurement mode) ──────────────────────────────────

  const singleMainClearance = useMemo(() => {
    const j = parseFloat(mainJournalOD) || 0;
    const h = parseFloat(mainHousingBore) || 0;
    if (j <= 0 || h <= 0) return 0;
    return h - j;
  }, [mainJournalOD, mainHousingBore]);

  const singleRodClearance = useMemo(() => {
    const j = parseFloat(rodJournalOD) || 0;
    const h = parseFloat(rodHousingBore) || 0;
    if (j <= 0 || h <= 0) return 0;
    return h - j;
  }, [rodJournalOD, rodHousingBore]);

  // Per-bearing clearances
  const mainClearances = useMemo(() => {
    if (!perBearingMode) return [];
    return mainEntries.map(e => {
      const j = parseFloat(e.journalOD) || 0;
      const h = parseFloat(e.housingBore) || 0;
      if (j <= 0 || h <= 0) return null;
      return h - j;
    });
  }, [mainEntries, perBearingMode]);

  const rodClearances = useMemo(() => {
    if (!perBearingMode) return [];
    return rodEntries.map(e => {
      const j = parseFloat(e.journalOD) || 0;
      const h = parseFloat(e.housingBore) || 0;
      if (j <= 0 || h <= 0) return null;
      return h - j;
    });
  }, [rodEntries, perBearingMode]);

  const mainStats = useMemo(() => {
    const valid = mainClearances.filter((c): c is number => c !== null && c > 0);
    if (valid.length === 0) return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const minIdx = mainClearances.indexOf(min);
    const maxIdx = mainClearances.indexOf(max);
    return { avg, min, max, minIdx, maxIdx, count: valid.length };
  }, [mainClearances]);

  const rodStats = useMemo(() => {
    const valid = rodClearances.filter((c): c is number => c !== null && c > 0);
    if (valid.length === 0) return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const minIdx = rodClearances.indexOf(min);
    const maxIdx = rodClearances.indexOf(max);
    return { avg, min, max, minIdx, maxIdx, count: valid.length };
  }, [rodClearances]);

  // Effective clearance for build context
  const effectiveMainClearance = perBearingMode && mainStats ? mainStats.avg : singleMainClearance;
  const effectiveRodClearance = perBearingMode && rodStats ? rodStats.avg : singleRodClearance;

  // Write computed values to build context
  useEffect(() => {
    if (activeBuild && mode === "measurements") {
      if (effectiveMainClearance > 0) {
        setBuildField("computed.mainBearingClearance", effectiveMainClearance.toFixed(4));
      }
      if (effectiveRodClearance > 0) {
        setBuildField("computed.rodBearingClearance", effectiveRodClearance.toFixed(4));
      }
    }
  }, [effectiveMainClearance, effectiveRodClearance, activeBuild?.id, mode]);

  // ── Warnings ───────────────────────────────────────────────────────────────

  const warnings = useMemo(() => {
    const w: Warning[] = [];

    if (mode === "measurements") {
      const checkClearance = (c: number, type: BearingType, label: string) => {
        if (c <= 0) return;
        if (c < 0.001) {
          w.push({ level: "red", message: `${label}: DANGER — clearance is ${formatClearance(c)}". Too tight. Bearing will overheat and fail. Recheck measurements or use a thinner bearing.` });
        }
        if (c > 0.004) {
          w.push({ level: "red", message: `${label}: Clearance is ${formatClearance(c)}" — excessive. Oil pressure will drop. Journal may need grinding and undersize bearings.` });
        }
        if (blockMaterial === "aluminum" && c > 0.003) {
          w.push({ level: "yellow", message: `${label}: Aluminum blocks expand when hot. ${formatClearance(c)}" cold clearance may be excessive at operating temperature.` });
        }
      };

      if (!perBearingMode) {
        checkClearance(singleMainClearance, "main", "Main bearings");
        checkClearance(singleRodClearance, "rod", "Rod bearings");
        if (singleRodClearance > 0 && singleMainClearance > 0 && singleRodClearance > singleMainClearance) {
          w.push({ level: "yellow", message: "Rod bearings typically run tighter than main bearings. Verify your measurements." });
        }
      } else {
        // Per-bearing warnings
        mainClearances.forEach((c, i) => {
          if (c !== null) checkClearance(c, "main", `Main #${i + 1}`);
        });
        rodClearances.forEach((c, i) => {
          if (c !== null) checkClearance(c, "rod", `Rod #${i + 1}`);
        });

        // Variation warnings
        if (mainStats && mainStats.count > 1) {
          const variation = mainStats.max - mainStats.min;
          if (variation > 0.001) {
            w.push({ level: "red", message: `Main bearing variation is ${formatClearance(variation)}". Significant variation detected — the crank may need grinding or the housings need align-honing.` });
          } else if (variation > 0.0005) {
            w.push({ level: "yellow", message: `Main #${mainStats.maxIdx + 1} is ${formatClearance(variation)}" looser than Main #${mainStats.minIdx + 1}. Check for taper or out-of-round on journal #${mainStats.maxIdx + 1}.` });
          }
        }
        if (rodStats && rodStats.count > 1) {
          const variation = rodStats.max - rodStats.min;
          if (variation > 0.001) {
            w.push({ level: "red", message: `Rod bearing variation is ${formatClearance(variation)}". Significant variation — check rod bores and journal diameters.` });
          } else if (variation > 0.0005) {
            w.push({ level: "yellow", message: `Rod #${rodStats.maxIdx + 1} is ${formatClearance(variation)}" looser than Rod #${rodStats.minIdx + 1}. Check for taper or out-of-round.` });
          }
        }
      }
    }

    if (mode === "plastigage") {
      const pc = parseFloat(plastigageClearance) || 0;
      if (pc > 0) {
        const val = pc / 1000; // convert thousandths to inches
        if (val < 0.001) {
          w.push({ level: "red", message: `Plastigage reading of ${formatClearance(val)}" is dangerously tight. Bearing will overheat and fail.` });
        }
        if (val > 0.004) {
          w.push({ level: "red", message: `Plastigage reading of ${formatClearance(val)}" is excessive. Journal may need grinding.` });
        }
      }
    }

    return w;
  }, [mode, singleMainClearance, singleRodClearance, mainClearances, rodClearances, mainStats, rodStats, blockMaterial, perBearingMode, plastigageClearance]);

  // ── Per-bearing entry updaters ─────────────────────────────────────────────

  function updateMainEntry(index: number, field: keyof BearingEntry, value: string) {
    setMainEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateRodEntry(index: number, field: keyof BearingEntry, value: string) {
    setRodEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // ── Lookup mode data ───────────────────────────────────────────────────────

  const selectedPlatform = platform ? allPlatforms[platform] : null;
  const selectedSpec = clearanceSpecs[buildLevel];

  // ── Plastigage assessment ──────────────────────────────────────────────────

  const plastigageValue = (parseFloat(plastigageClearance) || 0) / 1000;
  const plastigageAssessment = plastigageValue > 0
    ? assessClearance(plastigageValue, plastigageBearingType, buildLevel, blockMaterial)
    : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Bearing Clearance Calculator"
        description="Calculate main and rod bearing clearance from journal and housing bore measurements. Plastigage checker, oil viscosity recommendations, and specs for SBC, BBC, LS, Ford, and Mopar engines."
        canonical="/calculators/bearing-clearance"
        keywords="bearing clearance calculator, main bearing clearance, rod bearing clearance, Plastigage calculator, engine bearing specs, oil clearance chart, Clevite bearing clearance"
      />

      <h1 className="text-3xl font-bold mb-1">Bearing Clearance Calculator</h1>
      <p className="text-muted-foreground mb-6">
        Calculate main and rod bearing oil clearance from your measurements, look up factory specs, or check a Plastigage reading.
      </p>

      <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">

      {/* ── Mode Toggle ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 mb-8 w-fit">
        {([
          ["measurements", "I have measurements"],
          ["lookup", "Look up specs"],
          ["plastigage", "Check my Plastigage"],
        ] as [Mode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === key
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "text-muted-foreground hover:text-[#1a1a1a]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MEASUREMENT MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === "measurements" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* ── Inputs ────────────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Application settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Application</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label>Engine Platform</Label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger><SelectValue placeholder="Optional — auto-fills journals" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(allPlatforms).map(([key, p]) => (
                            <SelectItem key={key} value={key}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Block Material</Label>
                      <Select value={blockMaterial} onValueChange={v => setBlockMaterial(v as BlockMaterial)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iron">Cast Iron</SelectItem>
                          <SelectItem value="aluminum">Aluminum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Build Level</Label>
                      <Select value={buildLevel} onValueChange={v => setBuildLevel(v as BuildLevel)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(buildLevelLabels) as BuildLevel[]).map(key => (
                            <SelectItem key={key} value={key}>{buildLevelLabels[key]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Crank Grinding</Label>
                      <Select value={crankGrind} onValueChange={v => setCrankGrind(v as CrankGrind)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (no grind)</SelectItem>
                          <SelectItem value="0.001">0.001" under</SelectItem>
                          <SelectItem value="0.010">0.010" under</SelectItem>
                          <SelectItem value="0.020">0.020" under</SelectItem>
                          <SelectItem value="0.030">0.030" under</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-bearing toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPerBearingMode(!perBearingMode)}
                  className="flex items-center gap-1 text-sm font-medium text-[#E85D04] hover:underline"
                >
                  {perBearingMode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {perBearingMode ? "Use single entry for all bearings" : "Enter each bearing separately"}
                </button>
                {perBearingMode && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">Mains:</Label>
                      <Input type="number" className="w-14 h-7 text-xs" value={numMains} onChange={e => setNumMains(Math.max(1, Math.min(7, parseInt(e.target.value) || 5)))} />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">Rods:</Label>
                      <Input type="number" className="w-14 h-7 text-xs" value={numRods} onChange={e => setNumRods(Math.max(1, Math.min(16, parseInt(e.target.value) || 8)))} />
                    </div>
                  </div>
                )}
              </div>

              {!perBearingMode ? (
                /* Single entry mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Main Bearings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label>Main Journal OD (inches)</Label>
                        <Input type="number" step="0.0001" placeholder="e.g., 2.4490" value={mainJournalOD} onChange={e => setMainJournalOD(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Bearing ID (inches)</Label>
                        <Input type="number" step="0.0001" placeholder="e.g., 2.4510" value={mainHousingBore} onChange={e => setMainHousingBore(e.target.value)} />
                        <p className="text-xs text-muted-foreground mt-1">Measure with a snap gauge or bore mic inside the assembled bearing &mdash; not the empty saddle bore.</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Rod Bearings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label>Rod Journal OD (inches)</Label>
                        <Input type="number" step="0.0001" placeholder="e.g., 2.0990" value={rodJournalOD} onChange={e => setRodJournalOD(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Bearing ID (inches)</Label>
                        <Input type="number" step="0.0001" placeholder="e.g., 2.1010" value={rodHousingBore} onChange={e => setRodHousingBore(e.target.value)} />
                        <p className="text-xs text-muted-foreground mt-1">Measure with a snap gauge or bore mic inside the assembled bearing &mdash; not the empty rod big-end bore.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Per-bearing entry mode */
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Main Bearings — Individual Measurements</CardTitle>
                      <CardDescription>Measure each main journal and housing bore with bearing installed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="pb-2 pr-2 font-semibold w-20">Main</th>
                              <th className="pb-2 pr-2 font-semibold">Journal OD</th>
                              <th className="pb-2 pr-2 font-semibold">Bearing ID</th>
                              <th className="pb-2 pr-2 font-semibold text-right w-24">Clearance</th>
                              <th className="pb-2 font-semibold text-center w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mainEntries.map((entry, i) => {
                              const c = mainClearances[i];
                              const a = c !== null && c > 0 ? assessClearance(c, "main", buildLevel, blockMaterial) : null;
                              return (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-2 pr-2 font-medium">#{i + 1}</td>
                                  <td className="py-2 pr-2">
                                    <Input type="number" step="0.0001" className="h-8 text-xs" placeholder="e.g., 2.4490"
                                      value={entry.journalOD} onChange={e => updateMainEntry(i, "journalOD", e.target.value)} />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <Input type="number" step="0.0001" className="h-8 text-xs" placeholder="e.g., 2.4510"
                                      value={entry.housingBore} onChange={e => updateMainEntry(i, "housingBore", e.target.value)} />
                                  </td>
                                  <td className="py-2 pr-2 text-right font-mono">
                                    {c !== null && c > 0 ? `${formatClearance(c)}"` : "—"}
                                  </td>
                                  <td className="py-2 text-center">
                                    {a ? (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.bgColor} ${a.color}`}>
                                        {a.assessment === "good" ? "OK" : a.assessment === "tight" ? "Tight" : a.assessment === "loose" ? "Loose" : "BAD"}
                                      </span>
                                    ) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {mainStats && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Average: </span>
                            <span className="font-mono font-medium">{formatClearance(mainStats.avg)}"</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Min (#{mainStats.minIdx + 1}): </span>
                            <span className="font-mono font-medium">{formatClearance(mainStats.min)}"</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max (#{mainStats.maxIdx + 1}): </span>
                            <span className="font-mono font-medium">{formatClearance(mainStats.max)}"</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Rod Bearings — Individual Measurements</CardTitle>
                      <CardDescription>Measure each rod journal and housing bore with bearing installed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="pb-2 pr-2 font-semibold w-20">Rod</th>
                              <th className="pb-2 pr-2 font-semibold">Journal OD</th>
                              <th className="pb-2 pr-2 font-semibold">Bearing ID</th>
                              <th className="pb-2 pr-2 font-semibold text-right w-24">Clearance</th>
                              <th className="pb-2 font-semibold text-center w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rodEntries.map((entry, i) => {
                              const c = rodClearances[i];
                              const a = c !== null && c > 0 ? assessClearance(c, "rod", buildLevel, blockMaterial) : null;
                              return (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-2 pr-2 font-medium">#{i + 1}</td>
                                  <td className="py-2 pr-2">
                                    <Input type="number" step="0.0001" className="h-8 text-xs" placeholder="e.g., 2.0990"
                                      value={entry.journalOD} onChange={e => updateRodEntry(i, "journalOD", e.target.value)} />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <Input type="number" step="0.0001" className="h-8 text-xs" placeholder="e.g., 2.1010"
                                      value={entry.housingBore} onChange={e => updateRodEntry(i, "housingBore", e.target.value)} />
                                  </td>
                                  <td className="py-2 pr-2 text-right font-mono">
                                    {c !== null && c > 0 ? `${formatClearance(c)}"` : "—"}
                                  </td>
                                  <td className="py-2 text-center">
                                    {a ? (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.bgColor} ${a.color}`}>
                                        {a.assessment === "good" ? "OK" : a.assessment === "tight" ? "Tight" : a.assessment === "loose" ? "Loose" : "BAD"}
                                      </span>
                                    ) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {rodStats && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Average: </span>
                            <span className="font-mono font-medium">{formatClearance(rodStats.avg)}"</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Min (#{rodStats.minIdx + 1}): </span>
                            <span className="font-mono font-medium">{formatClearance(rodStats.min)}"</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max (#{rodStats.maxIdx + 1}): </span>
                            <span className="font-mono font-medium">{formatClearance(rodStats.max)}"</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* ── Results Panel ─────────────────────────────────────────────── */}
            <div className="space-y-4">
              {/* Main bearing result */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 font-medium">Main Bearing Clearance</CardTitle>
                </CardHeader>
                <CardContent>
                  {effectiveMainClearance > 0 ? (
                    <>
                      <p className="text-4xl font-bold text-[#E85D04] tabular-nums">{formatClearance(effectiveMainClearance)}"</p>
                      <p className="text-sm text-gray-400 mt-1">{formatThousandths(effectiveMainClearance)} thousandths</p>
                      {(() => {
                        const a = assessClearance(effectiveMainClearance, "main", buildLevel, blockMaterial);
                        return <p className={`text-xs mt-2 ${a.assessment === "good" ? "text-green-400" : a.assessment === "tight" ? "text-yellow-400" : a.assessment === "loose" ? "text-orange-400" : "text-red-400"}`}>{a.label}</p>;
                      })()}
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-gray-500">—</p>
                  )}
                </CardContent>
              </Card>

              {/* Rod bearing result */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 font-medium">Rod Bearing Clearance</CardTitle>
                </CardHeader>
                <CardContent>
                  {effectiveRodClearance > 0 ? (
                    <>
                      <p className="text-4xl font-bold text-[#E85D04] tabular-nums">{formatClearance(effectiveRodClearance)}"</p>
                      <p className="text-sm text-gray-400 mt-1">{formatThousandths(effectiveRodClearance)} thousandths</p>
                      {(() => {
                        const a = assessClearance(effectiveRodClearance, "rod", buildLevel, blockMaterial);
                        return <p className={`text-xs mt-2 ${a.assessment === "good" ? "text-green-400" : a.assessment === "tight" ? "text-yellow-400" : a.assessment === "loose" ? "text-orange-400" : "text-red-400"}`}>{a.label}</p>;
                      })()}
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-gray-500">—</p>
                  )}
                </CardContent>
              </Card>

              {/* Oil recommendation */}
              {(effectiveMainClearance > 0 || effectiveRodClearance > 0) && (
                <Card className="bg-[#1a1a1a] text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400 font-medium">Recommended Oil Viscosity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[#E85D04]">
                      {getOilRecommendation(Math.max(effectiveMainClearance, effectiveRodClearance))}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Based on the wider of your two clearances. Tighter clearances need thinner oil for adequate flow; wider clearances need thicker oil to maintain film strength.</p>
                  </CardContent>
                </Card>
              )}

              {/* Target range reference */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Target Range ({buildLevelLabels[buildLevel]})</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mains:</span>
                    <span className="font-mono">{formatClearance(selectedSpec.main[0])}" – {formatClearance(selectedSpec.main[1])}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rods:</span>
                    <span className="font-mono">{formatClearance(selectedSpec.rod[0])}" – {formatClearance(selectedSpec.rod[1])}"</span>
                  </div>
                  {blockMaterial === "aluminum" && (
                    <p className="text-xs text-muted-foreground mt-2">Aluminum block: assemble ~0.0005" tighter than iron — clearance opens at operating temp.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOOKUP MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === "lookup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Engine Platform</CardTitle>
              <CardDescription>Select your engine to see factory specs and recommended clearances.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Engine</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue placeholder="Select engine..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(allPlatforms).map(([key, p]) => (
                      <SelectItem key={key} value={key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Build Level</Label>
                <Select value={buildLevel} onValueChange={v => setBuildLevel(v as BuildLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(buildLevelLabels) as BuildLevel[]).map(key => (
                      <SelectItem key={key} value={key}>{buildLevelLabels[key]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedPlatform ? (
            <div className="space-y-4">
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader>
                  <CardTitle className="text-[#E85D04]">{selectedPlatform.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-400 font-medium mb-1">Main Journal Diameter</p>
                    <p className="font-mono text-lg">{selectedPlatform.mainJournalMin.toFixed(4)}" – {selectedPlatform.mainJournalMax.toFixed(4)}"</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium mb-1">Rod Journal Diameter</p>
                    <p className="font-mono text-lg">{selectedPlatform.rodJournalMin.toFixed(4)}" – {selectedPlatform.rodJournalMax.toFixed(4)}"</p>
                  </div>
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-400 font-medium mb-1">Factory Clearance Spec</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Mains</p>
                        <p className="font-mono">{formatClearance(selectedPlatform.mainClearanceFactory[0])}" – {formatClearance(selectedPlatform.mainClearanceFactory[1])}"</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Rods</p>
                        <p className="font-mono">{formatClearance(selectedPlatform.rodClearanceFactory[0])}" – {formatClearance(selectedPlatform.rodClearanceFactory[1])}"</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-400 font-medium mb-1">Recommended for {buildLevelLabels[buildLevel]}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Mains</p>
                        <p className="font-mono text-[#E85D04]">{formatClearance(selectedSpec.main[0])}" – {formatClearance(selectedSpec.main[1])}"</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Rods</p>
                        <p className="font-mono text-[#E85D04]">{formatClearance(selectedSpec.rod[0])}" – {formatClearance(selectedSpec.rod[1])}"</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-400 font-medium mb-1">Additional Info</p>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>Block material: {selectedPlatform.blockMaterial === "aluminum" ? "Aluminum" : "Cast Iron"}</p>
                      <p>{selectedPlatform.numMains} main bearings, {selectedPlatform.numRods} rod bearings</p>
                      <p>Undersize bearings available: 0.001", 0.010", 0.020", 0.030"</p>
                      {selectedPlatform.blockMaterial === "aluminum" && (
                        <p className="text-yellow-400 mt-1">Aluminum block — assemble ~0.0005" tighter than iron. Clearance opens at operating temperature.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex items-center justify-center">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Select an engine platform to see specs.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PLASTIGAGE MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === "plastigage" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Plastigage Reading</CardTitle>
              <CardDescription>Enter your Plastigage measurement or select the closest match from the strip width scale below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Clearance Reading (thousandths of an inch)</Label>
                <Input type="number" step="0.1" placeholder="e.g., 2.0" value={plastigageClearance}
                  onChange={e => setPlastigageClearance(e.target.value)} />
                <p className="text-xs text-muted-foreground">Enter the value from the Plastigage scale. 2.0 = 0.002"</p>
              </div>

              <div className="space-y-1">
                <Label>Bearing Type</Label>
                <div className="flex gap-2">
                  {(["main", "rod"] as BearingType[]).map(t => (
                    <button key={t} onClick={() => setPlastigageBearingType(t)}
                      className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${plastigageBearingType === t ? "bg-[#E85D04] text-white border-[#E85D04]" : "border-gray-200 hover:border-[#E85D04]"}`}>
                      {t === "main" ? "Main Bearing" : "Rod Bearing"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Block Material</Label>
                  <Select value={blockMaterial} onValueChange={v => setBlockMaterial(v as BlockMaterial)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iron">Cast Iron</SelectItem>
                      <SelectItem value="aluminum">Aluminum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Build Level</Label>
                  <Select value={buildLevel} onValueChange={v => setBuildLevel(v as BuildLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(buildLevelLabels) as BuildLevel[]).map(key => (
                        <SelectItem key={key} value={key}>{buildLevelLabels[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Plastigage visual scale */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">Quick-select from Plastigage scale:</p>
                <div className="space-y-1">
                  {plastigageValues.map(pv => (
                    <button
                      key={pv.clearance}
                      onClick={() => setPlastigageClearance((pv.clearance * 1000).toString())}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                        plastigageValue === pv.clearance ? "bg-[#E85D04]/10 font-medium" : ""
                      }`}
                    >
                      <div className="flex-shrink-0 h-3 bg-green-600 rounded-sm" style={{ width: `${Math.max(4, 80 - pv.clearance * 18000)}px` }} />
                      <span className="font-mono text-xs">{pv.label}</span>
                      <span className="text-xs text-muted-foreground">({pv.width})</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plastigage result */}
          <div className="space-y-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 font-medium">
                  {plastigageBearingType === "main" ? "Main" : "Rod"} Bearing Clearance (Plastigage)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {plastigageValue > 0 ? (
                  <>
                    <p className="text-5xl font-bold text-[#E85D04] tabular-nums">{formatClearance(plastigageValue)}"</p>
                    <p className="text-sm text-gray-400 mt-1">{formatThousandths(plastigageValue)} thousandths</p>
                    {plastigageAssessment && (
                      <p className={`text-sm mt-3 ${plastigageAssessment.assessment === "good" ? "text-green-400" : plastigageAssessment.assessment === "tight" ? "text-yellow-400" : plastigageAssessment.assessment === "loose" ? "text-orange-400" : "text-red-400"}`}>
                        {plastigageAssessment.label}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-500">Recommended oil: <span className="text-[#E85D04] font-medium">{getOilRecommendation(plastigageValue)}</span></p>
                    </div>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-gray-500">—</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Target Range ({buildLevelLabels[buildLevel]})</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{plastigageBearingType === "main" ? "Mains" : "Rods"}:</span>
                  <span className="font-mono">
                    {plastigageBearingType === "main"
                      ? `${formatClearance(selectedSpec.main[0])}" – ${formatClearance(selectedSpec.main[1])}"`
                      : `${formatClearance(selectedSpec.rod[0])}" – ${formatClearance(selectedSpec.rod[1])}"`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900">
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
              <p className="text-sm">Plastigage is accurate to approximately ±0.0005". For precision work, verify with a bore gauge and micrometer. Plastigage is a good screening tool but not a substitute for proper measurement instruments.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Warnings ───────────────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="space-y-3 mb-8">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border ${
              w.level === "red" ? "bg-red-50 border-red-200 text-red-800"
              : w.level === "blue" ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
            }`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                w.level === "red" ? "text-red-600" : w.level === "blue" ? "text-blue-600" : "text-yellow-600"
              }`} />
              <p className="text-sm font-medium">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Common Engine Bearing Clearance Reference ─────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Common Engine Bearing Clearance Reference</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Engine</th>
                <th className="pb-2 pr-4 font-semibold">Main Journals</th>
                <th className="pb-2 pr-4 font-semibold">Rod Journals</th>
                <th className="pb-2 pr-4 font-semibold">Factory Clearance (Main)</th>
                <th className="pb-2 pr-4 font-semibold">Factory Clearance (Rod)</th>
                <th className="pb-2 font-semibold">Block</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {Object.entries(allPlatforms).map(([key, p]) => {
                const isActive = key === platform;
                return (
                  <tr key={key} className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${isActive ? "bg-[#E85D04]/5 font-medium text-foreground" : ""}`}
                    onClick={() => setPlatform(key)}>
                    <td className="py-2 pr-4">{p.label}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{p.mainJournalMin.toFixed(4)}" – {p.mainJournalMax.toFixed(4)}"</td>
                    <td className="py-2 pr-4 font-mono text-xs">{p.rodJournalMin.toFixed(4)}" – {p.rodJournalMax.toFixed(4)}"</td>
                    <td className="py-2 pr-4 font-mono text-xs">{formatClearance(p.mainClearanceFactory[0])}" – {formatClearance(p.mainClearanceFactory[1])}"</td>
                    <td className="py-2 pr-4 font-mono text-xs">{formatClearance(p.rodClearanceFactory[0])}" – {formatClearance(p.rodClearanceFactory[1])}"</td>
                    <td className="py-2">{p.blockMaterial === "aluminum" ? "Alum" : "Iron"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Clearance by Build Level Reference ────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Recommended Clearance by Build Level</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="text-sm text-muted-foreground mb-4">
            Ranges from Clevite/Mahle, King Bearings, and ACL technical bulletins. Aluminum blocks should be assembled ~0.0005" tighter — clearance opens at operating temperature.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Build Level</th>
                <th className="pb-2 pr-4 font-semibold text-right">Main Clearance</th>
                <th className="pb-2 pr-4 font-semibold text-right">Rod Clearance</th>
                <th className="pb-2 font-semibold text-right">Oil Viscosity</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {(Object.keys(clearanceSpecs) as BuildLevel[]).map(key => {
                const spec = clearanceSpecs[key];
                const isActive = key === buildLevel;
                return (
                  <tr key={key} className={`border-b last:border-0 ${isActive ? "bg-[#E85D04]/5 font-medium text-foreground" : ""}`}>
                    <td className="py-2 pr-4">{buildLevelLabels[key]}</td>
                    <td className="py-2 pr-4 text-right font-mono">{formatClearance(spec.main[0])}" – {formatClearance(spec.main[1])}"</td>
                    <td className="py-2 pr-4 text-right font-mono">{formatClearance(spec.rod[0])}" – {formatClearance(spec.rod[1])}"</td>
                    <td className="py-2 text-right">{getOilRecommendation((spec.main[0] + spec.main[1]) / 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Oil Viscosity Chart ────────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Bearing Clearance to Oil Viscosity Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Based on Clevite/Mahle published guidance. Tighter clearances require thinner oil for adequate flow through the bearing; wider clearances require thicker oil to maintain hydrodynamic film strength.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Bearing Clearance</th>
                <th className="pb-2 font-semibold">Recommended Oil Weight</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b"><td className="py-2 pr-4 font-mono">0.0010" – 0.0015"</td><td className="py-2">0W-20, 5W-20</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono">0.0015" – 0.0025"</td><td className="py-2">5W-30, 10W-30</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono">0.0025" – 0.0030"</td><td className="py-2">10W-40, 15W-40</td></tr>
              <tr className="border-b last:border-0"><td className="py-2 pr-4 font-mono">0.0030" +</td><td className="py-2">20W-50</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

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
              <h4 className="font-semibold text-foreground mb-1">Oil Clearance</h4>
              <p>Clearance = Housing bore - Journal diameter. Too tight starves the bearing; too loose drops oil pressure.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">General Rule</h4>
              <p>0.001" per inch of journal diameter is a good starting point. Mains slightly looser than rods.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Typical Clearances</h4>
              <ul className="space-y-1 mt-1">
                <li><span className="font-medium text-foreground">SBC mains:</span> 0.0020-0.0025"</li>
                <li><span className="font-medium text-foreground">SBC rods:</span> 0.0018-0.0022"</li>
                <li><span className="font-medium text-foreground">LS mains:</span> 0.0015-0.0021"</li>
              </ul>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-foreground mb-1">Plastigage Colors</h4>
              <ul className="space-y-1 mt-1 text-xs">
                <li className="flex justify-between"><span>Green:</span><span className="font-mono">0.001-0.003"</span></li>
                <li className="flex justify-between"><span>Red:</span><span className="font-mono">0.002-0.006"</span></li>
                <li className="flex justify-between"><span>Blue:</span><span className="font-mono">0.004-0.009"</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end flex row */}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Engine Bearing Clearance Fundamentals</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Bearing clearance is the difference between the bearing inside diameter (with the bearing installed) and the crankshaft journal outside diameter. Despite what it might seem, the bearing never actually touches the crankshaft journal during normal operation. Instead, the journal rides on a pressurized film of oil that is maintained by the oil pump. This hydrodynamic oil film is what carries the load — the bearing simply provides the correct geometry and a sacrificial surface in case of oil film failure.
          </p>
          <p>
            Tighter clearances (smaller gap) result in higher oil pressure because the oil has less space to escape, and they provide better load-carrying capacity because the oil film is thinner and stiffer. Looser clearances allow more oil to flow through the bearing, which carries away more heat — important for high-output or sustained-load applications. The trade-off is that looser clearances reduce oil pressure and load capacity. The classic rule of thumb is "one thou per inch of journal diameter": a 2.100" journal gets approximately 0.0021" clearance.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Block Material Matters</h3>
          <p>
            Aluminum blocks expand significantly more than iron blocks as they reach operating temperature. This means aluminum block engines need tighter cold clearances to achieve the correct hot clearance. An iron block SBC might spec 0.0020"-0.0025" on the mains, while an aluminum LS block specs 0.0015"-0.0020" because the aluminum housing bore grows more as it heats up. Always measure clearances with the bearings torqued to spec using Plastigage or a bore gauge — never assume the bearing matches the published size.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
