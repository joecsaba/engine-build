import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Platform = "ls-swap" | "sbc-350" | "sbc-383" | "ford-302" | "ford-351" | "2jz" | "honda-k";
type BuildLevel = "stock" | "mild-street" | "aggressive" | "full-race";
type CoreType = "new" | "reman" | "junkyard";

type LineItem = { item: string; low: number; high: number };

const buildCosts: Record<Platform, Record<BuildLevel, Record<CoreType, LineItem[]>>> = {
  "ls-swap": {
    "stock": {
      "new": [
        { item: "Long block (new)", low: 3200, high: 4500 },
        { item: "Gasket set", low: 80, high: 150 },
        { item: "Oil pump", low: 40, high: 80 },
        { item: "Timing chain kit", low: 60, high: 120 },
        { item: "Assembly supplies", low: 50, high: 100 },
      ],
      "reman": [
        { item: "Remanufactured long block", low: 1800, high: 2800 },
        { item: "Gasket set", low: 80, high: 150 },
        { item: "Oil pump", low: 40, high: 80 },
        { item: "Assembly supplies", low: 50, high: 100 },
      ],
      "junkyard": [
        { item: "Junkyard LS engine", low: 400, high: 900 },
        { item: "Machine shop work (bore/hone, deck, valve job)", low: 600, high: 1200 },
        { item: "Pistons & rings (OEM replacement)", low: 300, high: 600 },
        { item: "Bearings (main, rod, cam)", low: 80, high: 160 },
        { item: "Gasket set", low: 80, high: 150 },
        { item: "Oil pump", low: 40, high: 80 },
        { item: "Timing chain kit", low: 60, high: 120 },
        { item: "Assembly bolts/studs", low: 80, high: 200 },
        { item: "Assembly lube & supplies", low: 50, high: 100 },
      ],
    },
    "mild-street": {
      "junkyard": [
        { item: "Junkyard LS engine core", low: 400, high: 900 },
        { item: "Machine shop (bore/hone +.010, deck, valve job, balance)", low: 900, high: 1600 },
        { item: "Forged pistons & rings", low: 600, high: 1100 },
        { item: "Bearings (main, rod, cam)", low: 100, high: 200 },
        { item: "Gasket set", low: 100, high: 180 },
        { item: "Oil pump (high volume)", low: 60, high: 120 },
        { item: "Timing chain kit (double roller)", low: 80, high: 160 },
        { item: "Camshaft & lifters (mild 212/218)", low: 400, high: 900 },
        { item: "Pushrods (if applicable)", low: 100, high: 200 },
        { item: "ARP main & head studs", low: 200, high: 400 },
        { item: "Assembly lube & supplies", low: 60, high: 120 },
      ],
      "reman": [
        { item: "Remanufactured LS short block", low: 2000, high: 3200 },
        { item: "Machine shop (deck surface, valve job)", low: 300, high: 600 },
        { item: "Camshaft & lifters (mild 212/218)", low: 400, high: 900 },
        { item: "Pushrods (if applicable)", low: 100, high: 200 },
        { item: "Gasket set", low: 100, high: 180 },
        { item: "Oil pump (high volume)", low: 60, high: 120 },
        { item: "Timing chain kit (double roller)", low: 80, high: 160 },
        { item: "ARP main & head studs", low: 200, high: 400 },
        { item: "Assembly lube & supplies", low: 60, high: 120 },
      ],
      "new": [
        { item: "New LS1/LS3 short block", low: 3500, high: 5500 },
        { item: "Camshaft & lifters (mild 212/218)", low: 400, high: 900 },
        { item: "Pushrods (if applicable)", low: 100, high: 200 },
        { item: "Gasket set", low: 100, high: 180 },
        { item: "Timing chain kit (double roller)", low: 80, high: 160 },
        { item: "ARP main & head studs", low: 200, high: 400 },
        { item: "Assembly lube & supplies", low: 60, high: 120 },
      ],
    },
    "aggressive": {
      "junkyard": [
        { item: "Junkyard LS core (preferably LS3/L92)", low: 500, high: 1200 },
        { item: "Machine shop (bore +.030, deck, 3-angle valve job, balance, align hone)", low: 1400, high: 2400 },
        { item: "Forged pistons & rings (performance spec)", low: 900, high: 1600 },
        { item: "Bearings (main, rod, cam — performance clearance)", low: 150, high: 280 },
        { item: "Performance heads (ported or aftermarket)", low: 1200, high: 2800 },
        { item: "Gasket set (MLS head gaskets)", low: 200, high: 400 },
        { item: "Camshaft & lifters (228/235+ @ .050)", low: 700, high: 1400 },
        { item: "Pushrods (custom length)", low: 150, high: 300 },
        { item: "Valve springs (PAC or Comp)", low: 300, high: 600 },
        { item: "ARP main & head studs", low: 300, high: 500 },
        { item: "Oil pump (Melling HV)", low: 60, high: 120 },
        { item: "Timing chain kit (BTR/Comp)", low: 120, high: 250 },
        { item: "Assembly lube & supplies", low: 80, high: 150 },
      ],
      "reman": [
        { item: "Remanufactured LS short block", low: 2000, high: 3200 },
        { item: "Performance heads (ported or aftermarket)", low: 1200, high: 2800 },
        { item: "Gasket set (MLS head gaskets)", low: 200, high: 400 },
        { item: "Camshaft & lifters (228/235+ @ .050)", low: 700, high: 1400 },
        { item: "Pushrods (custom length)", low: 150, high: 300 },
        { item: "Valve springs (PAC or Comp)", low: 300, high: 600 },
        { item: "ARP main & head studs", low: 300, high: 500 },
        { item: "Oil pump (Melling HV)", low: 60, high: 120 },
        { item: "Timing chain kit", low: 120, high: 250 },
        { item: "Assembly lube & supplies", low: 80, high: 150 },
      ],
      "new": [
        { item: "New LS3/LSX block", low: 4500, high: 7000 },
        { item: "Performance heads (ported or aftermarket)", low: 1200, high: 2800 },
        { item: "Gasket set (MLS head gaskets)", low: 200, high: 400 },
        { item: "Camshaft & lifters (228/235+ @ .050)", low: 700, high: 1400 },
        { item: "Pushrods (custom length)", low: 150, high: 300 },
        { item: "Valve springs (PAC or Comp)", low: 300, high: 600 },
        { item: "ARP main & head studs", low: 300, high: 500 },
        { item: "Oil pump (Melling HV)", low: 60, high: 120 },
        { item: "Timing chain kit", low: 120, high: 250 },
        { item: "Assembly lube & supplies", low: 80, high: 150 },
      ],
    },
    "full-race": {
      "new": [
        { item: "LSX block or World/Dart block", low: 2500, high: 5000 },
        { item: "Billet/forged crank", low: 1500, high: 3500 },
        { item: "Machine shop (full blueprint)", low: 2500, high: 4500 },
        { item: "Race pistons & rings", low: 1200, high: 2500 },
        { item: "Bearings (main, rod, cam — race clearance)", low: 200, high: 400 },
        { item: "CNC-ported cylinder heads", low: 3000, high: 6000 },
        { item: "MLS head gaskets", low: 200, high: 400 },
        { item: "Race camshaft & lifters (solid roller)", low: 1200, high: 2400 },
        { item: "Titanium/chromoly pushrods", low: 300, high: 600 },
        { item: "Race valve springs (Pac 1218 or equivalent)", low: 500, high: 1000 },
        { item: "ARP2000 or L19 head studs", low: 400, high: 700 },
        { item: "Dry sump oil system", low: 2000, high: 4000 },
        { item: "Assembly lube & supplies", low: 100, high: 200 },
      ],
      "junkyard": [{ item: "See 'new' tab — race builds start from quality cores", low: 0, high: 0 }],
      "reman": [{ item: "See 'new' tab — race builds require known quality components", low: 0, high: 0 }],
    },
  },
  "sbc-350": {
    "stock": {
      "junkyard": [
        { item: "Junkyard SBC 350 core", low: 100, high: 400 },
        { item: "Machine shop (bore/hone, deck, valve job)", low: 500, high: 1000 },
        { item: "Pistons & rings (cast replacement)", low: 150, high: 350 },
        { item: "Bearings (main, rod, cam)", low: 60, high: 120 },
        { item: "Gasket set", low: 60, high: 120 },
        { item: "Oil pump", low: 30, high: 60 },
        { item: "Timing chain set", low: 30, high: 60 },
        { item: "Assembly supplies", low: 40, high: 80 },
      ],
      "reman": [
        { item: "Remanufactured SBC short block", low: 800, high: 1500 },
        { item: "Gasket set", low: 60, high: 120 },
        { item: "Oil pump", low: 30, high: 60 },
        { item: "Assembly supplies", low: 40, high: 80 },
      ],
      "new": [
        { item: "New GM performance SBC long block", low: 2000, high: 3500 },
        { item: "Gasket set", low: 60, high: 120 },
        { item: "Assembly supplies", low: 40, high: 80 },
      ],
    },
    "mild-street": {
      "junkyard": [
        { item: "Junkyard SBC 350 core", low: 100, high: 400 },
        { item: "Machine shop (bore/hone, deck, valve job, balance)", low: 700, high: 1300 },
        { item: "Hypereutectic pistons & rings", low: 200, high: 450 },
        { item: "Bearings (main, rod, cam)", low: 80, high: 150 },
        { item: "Gasket set", low: 80, high: 150 },
        { item: "Oil pump (high volume)", low: 40, high: 80 },
        { item: "Double roller timing chain set", low: 40, high: 80 },
        { item: "Camshaft & hydraulic lifters", low: 150, high: 400 },
        { item: "Assembly bolts", low: 80, high: 160 },
        { item: "Assembly supplies", low: 50, high: 100 },
      ],
      "reman": [{ item: "Reman SBC + mild cam/lifter set + machine work", low: 1500, high: 2800 }],
      "new": [{ item: "New GM SBC + mild cam upgrade", low: 2500, high: 4000 }],
    },
    "aggressive": {
      "junkyard": [
        { item: "SBC 4-bolt main core (350 or 400)", low: 200, high: 600 },
        { item: "Machine shop (bore +.030, deck, align hone, full balance)", low: 1000, high: 1800 },
        { item: "Forged pistons & rings", low: 450, high: 900 },
        { item: "Bearings (main, rod, cam)", low: 100, high: 200 },
        { item: "Vortec or aftermarket heads (ported)", low: 600, high: 1500 },
        { item: "Gasket set (Fel-Pro)", low: 100, high: 200 },
        { item: "Hydraulic roller camshaft & lifters", low: 400, high: 800 },
        { item: "Pushrods", low: 80, high: 160 },
        { item: "Oil pump (HV Melling)", low: 50, high: 100 },
        { item: "Double roller timing chain", low: 50, high: 100 },
        { item: "ARP head bolts/studs", low: 100, high: 250 },
        { item: "Assembly supplies", low: 60, high: 120 },
      ],
      "reman": [{ item: "Contact machine shop for quote on performance rebuild from reman core", low: 2500, high: 4500 }],
      "new": [{ item: "Contact machine shop for quote on new performance build", low: 3500, high: 6000 }],
    },
    "full-race": {
      "new": [
        { item: "Aftermarket SBC block (World, Dart)", low: 1500, high: 3500 },
        { item: "Forged crank", low: 600, high: 1500 },
        { item: "Machine shop (full blueprint)", low: 1800, high: 3500 },
        { item: "Race pistons & rings", low: 700, high: 1500 },
        { item: "Race bearings", low: 150, high: 300 },
        { item: "Aftermarket race heads", low: 2000, high: 5000 },
        { item: "Solid roller camshaft & lifters", low: 800, high: 1800 },
        { item: "Race valve springs & retainers", low: 400, high: 900 },
        { item: "Assembly lube & supplies", low: 80, high: 160 },
      ],
      "junkyard": [{ item: "Race builds require new or known-quality components", low: 0, high: 0 }],
      "reman": [{ item: "Race builds require new or known-quality components", low: 0, high: 0 }],
    },
  },
  "sbc-383": { "stock": { "new": [{ item: "383 Stroker kit (crank, rods, pistons)", low: 800, high: 1500 }, { item: "Machine shop (bore/hone, deck, balance)", low: 800, high: 1500 }, { item: "350 2-bolt core", low: 100, high: 400 }, { item: "Bearings", low: 100, high: 200 }, { item: "Gasket set", low: 80, high: 150 }, { item: "Oil pump", low: 40, high: 80 }, { item: "Timing chain set", low: 40, high: 80 }], "junkyard": [{ item: "See 'new' — 383 stroker requires custom forged crank", low: 0, high: 0 }], "reman": [{ item: "See 'new' — 383 stroker requires custom forged crank", low: 0, high: 0 }] }, "mild-street": { "new": [{ item: "383 Stroker kit (crank, rods, forged pistons)", low: 1000, high: 2000 }, { item: "Machine shop (bore/hone, deck, align hone, balance)", low: 1000, high: 1800 }, { item: "350 4-bolt main core", low: 200, high: 600 }, { item: "Bearings", low: 100, high: 200 }, { item: "Vortec heads (ported)", low: 600, high: 1200 }, { item: "Cam & lifters (220/228 hydraulic roller)", low: 400, high: 800 }, { item: "Gasket set, oil pump, timing set", low: 200, high: 400 }], "junkyard": [{ item: "See 'new' — 383 stroker requires custom parts", low: 0, high: 0 }], "reman": [{ item: "See 'new' — 383 stroker requires custom parts", low: 0, high: 0 }] }, "aggressive": { "new": [{ item: "383 Stroker kit (forged H-beam rods, custom pistons)", low: 1500, high: 2800 }, { item: "Machine shop (full prep, blueprint)", low: 1500, high: 2800 }, { item: "Performance heads (Dart, AFR)", low: 1500, high: 3000 }, { item: "Cam & lifters (230/238+)", low: 500, high: 1000 }, { item: "Bearings, gaskets, pump, timing, studs", low: 500, high: 1000 }], "junkyard": [{ item: "See 'new'", low: 0, high: 0 }], "reman": [{ item: "See 'new'", low: 0, high: 0 }] }, "full-race": { "new": [{ item: "Race 383 stroker (world/dart block, billet crank)", low: 5000, high: 12000 }], "junkyard": [{ item: "Race builds require new quality parts", low: 0, high: 0 }], "reman": [{ item: "Race builds require new quality parts", low: 0, high: 0 }] } },
  "ford-302": { "stock": { "junkyard": [{ item: "Junkyard 302 core", low: 100, high: 350 }, { item: "Machine shop", low: 500, high: 1000 }, { item: "Pistons & rings", low: 150, high: 350 }, { item: "Bearings", low: 60, high: 120 }, { item: "Gasket set", low: 60, high: 120 }, { item: "Oil pump", low: 30, high: 60 }, { item: "Timing chain", low: 30, high: 60 }, { item: "Assembly supplies", low: 40, high: 80 }], "reman": [{ item: "Reman Ford 302 short block", low: 800, high: 1600 }, { item: "Gasket set & supplies", low: 100, high: 200 }], "new": [{ item: "New Ford performance 302 long block", low: 2000, high: 3500 }, { item: "Gasket set & supplies", low: 100, high: 200 }] }, "mild-street": { "junkyard": [{ item: "302 4-bolt core", low: 150, high: 400 }, { item: "Machine shop", low: 700, high: 1300 }, { item: "Flat-top pistons & rings", low: 200, high: 450 }, { item: "Bearings", low: 80, high: 150 }, { item: "GT40P heads (ported)", low: 400, high: 900 }, { item: "Cam & lifters", low: 150, high: 400 }, { item: "Gasket set, pump, timing, studs", low: 200, high: 400 }], "reman": [{ item: "Reman + heads + cam package", low: 1800, high: 3200 }], "new": [{ item: "New Ford performance + heads + cam", low: 2800, high: 5000 }] }, "aggressive": { "junkyard": [{ item: "302 roller block core", low: 200, high: 600 }, { item: "Machine shop (full prep)", low: 1000, high: 1800 }, { item: "Forged pistons & rings", low: 450, high: 900 }, { item: "Bearings", low: 100, high: 200 }, { item: "GT40 or Edelbrock Victor Jr heads", low: 800, high: 2000 }, { item: "Hydraulic roller cam & lifters", low: 400, high: 800 }, { item: "Gasket set, pump, timing, studs", low: 300, high: 600 }], "reman": [{ item: "Contact shop for quote", low: 3000, high: 5500 }], "new": [{ item: "Contact shop for quote", low: 4000, high: 7000 }] }, "full-race": { "new": [{ item: "Dart Iron Eagle / World block + full race build", low: 5000, high: 12000 }], "junkyard": [{ item: "Race builds require quality components", low: 0, high: 0 }], "reman": [{ item: "Race builds require quality components", low: 0, high: 0 }] } },
  "ford-351": { "stock": { "junkyard": [{ item: "Junkyard 351W core", low: 150, high: 500 }, { item: "Machine shop", low: 600, high: 1100 }, { item: "Pistons & rings", low: 200, high: 400 }, { item: "Bearings", low: 70, high: 140 }, { item: "Gasket set", low: 80, high: 150 }, { item: "Oil pump", low: 40, high: 80 }, { item: "Timing chain", low: 40, high: 80 }, { item: "Assembly supplies", low: 50, high: 100 }], "reman": [{ item: "Reman 351W short block", low: 1000, high: 1800 }, { item: "Gasket set & supplies", low: 130, high: 250 }], "new": [{ item: "New Ford 351W performance long block", low: 2500, high: 4000 }, { item: "Gasket set & supplies", low: 130, high: 250 }] }, "mild-street": { "junkyard": [{ item: "351W core + machine + cam + heads package", low: 2000, high: 4000 }], "reman": [{ item: "Reman + performance upgrade package", low: 2500, high: 4500 }], "new": [{ item: "New crate + performance upgrade package", low: 4000, high: 7000 }] }, "aggressive": { "junkyard": [{ item: "351W 4-bolt core + full aggressive build", low: 4000, high: 7500 }], "reman": [{ item: "Reman + aggressive upgrade package", low: 4500, high: 8000 }], "new": [{ item: "New + aggressive upgrade package", low: 6000, high: 10000 }] }, "full-race": { "new": [{ item: "351W race build (Dart/World block)", low: 8000, high: 18000 }], "junkyard": [{ item: "Race builds require quality components", low: 0, high: 0 }], "reman": [{ item: "Race builds require quality components", low: 0, high: 0 }] } },
  "2jz": { "stock": { "junkyard": [{ item: "2JZ-GE or 2JZ-GTE JDM import core", low: 800, high: 2500 }, { item: "Machine shop", low: 700, high: 1400 }, { item: "Pistons & rings", low: 300, high: 700 }, { item: "Bearings", low: 100, high: 200 }, { item: "Gasket set", low: 150, high: 300 }, { item: "Oil pump", low: 80, high: 160 }, { item: "Timing belt kit", low: 100, high: 200 }, { item: "Assembly supplies", low: 60, high: 120 }], "reman": [{ item: "JDM 2JZ rebuild package", low: 2500, high: 4500 }], "new": [{ item: "OEM Toyota parts + machine shop", low: 3500, high: 6500 }] }, "mild-street": { "junkyard": [{ item: "2JZ core + machine + mild build", low: 3000, high: 6000 }], "reman": [{ item: "Reman + mild upgrade", low: 4000, high: 7000 }], "new": [{ item: "New parts + machine shop", low: 5000, high: 9000 }] }, "aggressive": { "junkyard": [{ item: "2JZ core + forged build (CP pistons, Manley rods)", low: 6000, high: 12000 }], "reman": [{ item: "Reman + forged upgrade package", low: 7000, high: 13000 }], "new": [{ item: "New + forged aggressive build", low: 9000, high: 16000 }] }, "full-race": { "new": [{ item: "2JZ race build (billet crank, Manley rods, CP pistons, ported head)", low: 12000, high: 25000 }], "junkyard": [{ item: "Race builds require quality components", low: 0, high: 0 }], "reman": [{ item: "Race builds require quality components", low: 0, high: 0 }] } },
  "honda-k": { "stock": { "junkyard": [{ item: "K-series core (K20A2/K24A)", low: 400, high: 1000 }, { item: "Machine shop", low: 500, high: 1000 }, { item: "Pistons & rings", low: 200, high: 500 }, { item: "Bearings", low: 80, high: 160 }, { item: "Gasket set", low: 100, high: 200 }, { item: "Oil pump", low: 80, high: 150 }, { item: "Timing chain kit", low: 100, high: 200 }, { item: "Assembly supplies", low: 50, high: 100 }], "reman": [{ item: "K-series reman short block", low: 1200, high: 2200 }, { item: "Gasket set & supplies", low: 150, high: 300 }], "new": [{ item: "New Honda/OEM K-series block + parts", low: 2000, high: 4000 }] }, "mild-street": { "junkyard": [{ item: "K-series core + mild build", low: 2000, high: 4000 }], "reman": [{ item: "Reman + mild upgrade", low: 2500, high: 5000 }], "new": [{ item: "New + mild performance upgrade", low: 3500, high: 6500 }] }, "aggressive": { "junkyard": [{ item: "K-series core + forged build + head work", low: 5000, high: 10000 }], "reman": [{ item: "Reman + aggressive upgrade package", low: 6000, high: 11000 }], "new": [{ item: "New + aggressive build", low: 8000, high: 14000 }] }, "full-race": { "new": [{ item: "K-series full race (Darton sleeves, CP pistons, Crower rods, Stage 3 head)", low: 12000, high: 22000 }], "junkyard": [{ item: "Race builds require quality components", low: 0, high: 0 }], "reman": [{ item: "Race builds require quality components", low: 0, high: 0 }] } },
};

export default function BuildCostCalculator() {
  const [platform, setPlatform] = useState<Platform>("ls-swap");
  const [buildLevel, setBuildLevel] = useState<BuildLevel>("mild-street");
  const [coreType, setCoreType] = useState<CoreType>("junkyard");

  const items = buildCosts[platform]?.[buildLevel]?.[coreType] ?? [];
  const totalLow = items.reduce((sum, i) => sum + i.low, 0);
  const totalHigh = items.reduce((sum, i) => sum + i.high, 0);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Engine Build Cost Estimator</h1>
      <p className="text-muted-foreground mb-8">Itemized cost breakdown for popular engine platforms. Prices are approximate and vary by region and shop.</p>

      <Card className="mb-6">
        <CardHeader><CardTitle>Build Configuration</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Engine Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ls-swap">LS Swap (LS1/LS3)</SelectItem>
                <SelectItem value="sbc-350">SBC Chevy 350</SelectItem>
                <SelectItem value="sbc-383">SBC 383 Stroker</SelectItem>
                <SelectItem value="ford-302">Ford 302 Windsor</SelectItem>
                <SelectItem value="ford-351">Ford 351 Windsor</SelectItem>
                <SelectItem value="2jz">Toyota 2JZ</SelectItem>
                <SelectItem value="honda-k">Honda K-Series</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Build Level</Label>
            <Select value={buildLevel} onValueChange={(v) => setBuildLevel(v as BuildLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock Rebuild</SelectItem>
                <SelectItem value="mild-street">Mild Street Performance</SelectItem>
                <SelectItem value="aggressive">Aggressive Street</SelectItem>
                <SelectItem value="full-race">Full Race</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Starting Point</Label>
            <Select value={coreType} onValueChange={(v) => setCoreType(v as CoreType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="junkyard">Junkyard / Core</SelectItem>
                <SelectItem value="reman">Remanufactured</SelectItem>
                <SelectItem value="new">New Parts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left p-3">Item</th>
                    <th className="text-right p-3">Low</th>
                    <th className="text-right p-3">High</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? "border-b" : "bg-muted/30 border-b"}>
                      <td className="p-3">{item.item}</td>
                      <td className="text-right p-3">{item.low > 0 ? `$${item.low.toLocaleString()}` : "—"}</td>
                      <td className="text-right p-3">{item.high > 0 ? `$${item.high.toLocaleString()}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#1a1a1a] text-white">
                    <td className="p-3 font-bold">TOTAL (Parts + Machine Work)</td>
                    <td className="text-right p-3 font-bold text-primary text-lg">${totalLow.toLocaleString()}</td>
                    <td className="text-right p-3 font-bold text-primary text-lg">${totalHigh.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Labor for removal/installation not included. Machine shop prices vary significantly by region (up to 2x between rural and metro areas). These are estimates based on typical 2024 market pricing. Always get quotes from local shops.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
