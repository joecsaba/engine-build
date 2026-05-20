import type { EnginePlatform, PartCategory } from "./buildParts";

const machineWorkDiesel: PartCategory[] = [
  {
    id: "machine-work",
    name: "Machine Shop Work",
    group: "Machine Work",
    description: "Estimated costs for common diesel machine operations. Diesels require precise deck surfacing and fire ring installation in most performance builds.",
    required: false,
    parts: [
      { id: "d-mw-basic", brand: "Machine Shop", name: "Basic: Hot tank, pressure test block, deck surface", price: 400, retailer: "Local machine shop", tier: "budget", notes: "Minimum for any diesel rebuild." },
      { id: "d-mw-full", brand: "Machine Shop", name: "Full: Tank, deck, bore/hone, align bore, cam bearings", price: 750, retailer: "Local machine shop", tier: "mid", notes: "Recommended for performance builds." },
      { id: "d-mw-head", brand: "Machine Shop", name: "Head work: Surface, pressure test, valve job, fire ring grooves", price: 500, retailer: "Local machine shop", tier: "mid", notes: "Budget separately from block work." },
    ],
  },
];

export const CUMMINS_12V_PLATFORM: EnginePlatform = {
  id: "cummins12v",
  name: "Cummins 5.9L 12-Valve",
  displacement: "5.9L (359 ci)",
  years: "1989–1998",
  description: "The legendary mechanical injection 6BT. Beloved for its simplicity, durability, and P7100 inline injection pump. The 12-valve is the foundation of virtually every extreme diesel build and the platform most resistant to emissions compliance. No ECU — fully mechanical injection. 160–215 hp stock.",
  categories: [
    {
      id: "injection-pump",
      name: "Injection Pump (P7100)",
      group: "Fuel System",
      description: "The Bosch P7100 inline injection pump is the 12-valve's most critical performance component. Governor spring and timing advance work extract power without modifications anywhere else. Full rebuild or replacement for worn pumps.",
      required: false,
      parts: [
        { id: "c12v-pump-stock", brand: "Bosch", name: "Stock P7100 Pump (reuse / rebuilt)", price: 0, retailer: "—", tier: "budget", notes: "Get it tested before assuming it is good. A worn pump loses power fast." },
        { id: "c12v-pump-3200", brand: "Industrial Injection", name: "P7100 3,200 RPM Governor Spring Kit", partNumber: "II-GS-3200", price: 85, retailer: "Industrial Injection", tier: "budget", notes: "Raises fuel delivery cutoff from 2,700 to 3,200 RPM. Easy install, significant gain." },
        { id: "c12v-pump-stage1", brand: "Dynomite Diesel", name: "P7100 Stage 1 Rebuilt Pump (4K spring, timing advance)", partNumber: "DDP-P7100-S1", price: 1150, retailer: "Dynomite Diesel", tier: "mid", notes: "4,000 RPM spring + PSG kit + timing advance. Bolt-on 200+ hp potential." },
        { id: "c12v-pump-stage2", brand: "Industrial Injection", name: "P7100 Stage 2 Rebuilt Pump (ported, 4K, full PSG)", partNumber: "II-P7100-S2", price: 1600, retailer: "Industrial Injection", tier: "premium", notes: "Ported fuel galleries, full PSG modification, 4K spring. 400+ hp capable." },
      ],
    },
    {
      id: "injectors",
      name: "Injectors",
      group: "Fuel System",
      description: "12-valve injectors are mechanical lift-piston units. Larger nozzle orifices flow more fuel. Smoke must be managed with supporting mods — more injector without more air = soot.",
      required: false,
      parts: [
        { id: "c12v-inj-stock", brand: "Bosch", name: "Stock Replacement Injectors (set of 6)", partNumber: "BDSP-0-432-193-635-6", price: 480, retailer: "Summit Racing", tier: "budget" },
        { id: "c12v-inj-60hp", brand: "Dynomite Diesel", name: "+60HP Nozzles (set of 6)", partNumber: "DDP-12V-60", price: 680, retailer: "Dynomite Diesel", tier: "mid", notes: "Good street/daily combo. Requires 3,200 RPM spring at minimum." },
        { id: "c12v-inj-100hp", brand: "Dynomite Diesel", name: "+100HP Nozzles (set of 6)", partNumber: "DDP-12V-100", price: 820, retailer: "Dynomite Diesel", tier: "premium", notes: "Requires full P7100 Stage 1+ pump. Will smoke without turbo upgrade." },
        { id: "c12v-inj-150hp", brand: "Industrial Injection", name: "+150HP 7x0.009 Nozzles (set of 6)", partNumber: "II-12V-150", price: 1080, retailer: "Industrial Injection", tier: "race", notes: "Race-level nozzles. Requires compound turbo or large single, full pump." },
      ],
    },
    {
      id: "turbocharger",
      name: "Turbocharger",
      group: "Forced Induction",
      description: "Stock HX35 turbo is adequate to ~250 hp. Swap to HX35W or single-shot for 350+ hp. Compound turbos (a larger charger driving the HX35) are the path to 700+ hp.",
      required: false,
      parts: [
        { id: "c12v-turbo-stock", brand: "Holset", name: "HX35W Drop-In Upgrade (61mm compressor)", partNumber: "HX35W-61", price: 650, retailer: "BD Diesel", tier: "mid", notes: "Best upgrade from stock HX35. Spools quickly, adds top-end power." },
        { id: "c12v-turbo-hx40", brand: "Holset", name: "HX40 Single Turbo Kit (66mm)", partNumber: "HX40-66", price: 1100, retailer: "Industrial Injection", tier: "mid", notes: "Large single. Good for 350–500 hp range." },
        { id: "c12v-turbo-compound", brand: "BD Diesel", name: "Compound Turbo Kit (HX40 + HX35 twins)", partNumber: "BD-1045750", price: 2800, retailer: "BD Diesel", tier: "premium", notes: "Compounds allow 500–800 hp while maintaining spool. Best for daily/performance." },
        { id: "c12v-turbo-s400", brand: "Precision", name: "S400/S300 Compound Kit (race level)", partNumber: "PRC-S400-CMPD-C12V", price: 4200, retailer: "Precision Turbo", tier: "race", notes: "1,000+ hp capable. Full manifold/charge pipe fabrication required." },
      ],
    },
    {
      id: "head-studs",
      name: "Head Studs",
      group: "Head & Sealing",
      description: "The 12-valve head bolts are the #1 mechanical failure mode under boost or hard use. ARP studs are not optional for any performance 12-valve.",
      required: true,
      parts: [
        { id: "c12v-studs-arp", brand: "ARP", name: "Cummins 5.9L 12-Valve Head Stud Kit", partNumber: "247-4201", price: 285, retailer: "Summit Racing", tier: "premium", notes: "Required for any boosted or hot 12-valve. Drill the block first if using 3/4\" studs." },
      ],
    },
    {
      id: "head-gasket",
      name: "Head Gasket / Fire Rings",
      group: "Head & Sealing",
      description: "Fire rings (copper O-rings in the head gasket sealing surface) are the performance standard for diesel head sealing. Require machine work to install fire ring groove in head.",
      required: false,
      parts: [
        { id: "c12v-hg-oem", brand: "Cummins", name: "OEM Head Gasket 5.9L 12V", partNumber: "3919697", price: 125, retailer: "Cummins dealer", tier: "budget", notes: "OEM is fine with ARP studs on mild builds." },
        { id: "c12v-hg-felpro", brand: "Fel-Pro", name: "MLS Head Gasket 5.9L 12V", partNumber: "26354PT", price: 155, retailer: "Summit Racing", tier: "mid" },
        { id: "c12v-hg-fire", brand: "Mahle", name: "Fire Ring Head Gasket Set (grooved head required)", partNumber: "54574", price: 220, retailer: "Summit Racing", tier: "premium", notes: "Best sealing for high-boost builds. Requires head to be machined for fire ring groove." },
      ],
    },
    {
      id: "intercooler",
      name: "Intercooler (CAC)",
      group: "Induction & Cooling",
      description: "The stock 12-valve charge air cooler is undersized for performance applications. An upgraded intercooler reduces intake charge temperature for more power and less detonation.",
      required: false,
      parts: [
        { id: "c12v-ic-banks", brand: "Banks Power", name: "Techni-Cooler Intercooler Kit 12V", partNumber: "25970", price: 720, retailer: "Summit Racing", tier: "mid", notes: "Significant temperature reduction. Bolt-on kit." },
        { id: "c12v-ic-mishimoto", brand: "Mishimoto", name: "Performance Intercooler 12V Cummins", partNumber: "MMINT-RAM-94", price: 580, retailer: "Summit Racing", tier: "mid" },
        { id: "c12v-ic-custom", brand: "Precision", name: "Bar-and-Plate Custom Intercooler (fab required)", partNumber: "PRC-IC-12V-CORE", price: 1200, retailer: "Precision", tier: "premium", notes: "For compound turbo builds. Custom piping required." },
      ],
    },
    {
      id: "bottom-end",
      name: "Pistons & Bearings",
      group: "Bottom End",
      description: "Stock 12-valve pistons are extremely strong cast units. For 700+ hp or power adder builds, forged replacements reduce risk. Always replace bearings on any rebuild.",
      required: false,
      parts: [
        { id: "c12v-pistons-stock", brand: "Cummins", name: "Stock Cast Pistons (reuse, inspect)", price: 0, retailer: "—", tier: "budget", notes: "Handle 500+ hp in stock form if undamaged." },
        { id: "c12v-pistons-mahle", brand: "Mahle", name: "Forged Steel Pistons 5.9L 12V (set of 6)", partNumber: "224706", price: 980, retailer: "Summit Racing", tier: "premium" },
        { id: "c12v-bearings-clevite", brand: "Clevite 77", name: "H-Series Main & Rod Bearing Set 5.9L", partNumber: "MS2299-MB", price: 175, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    ...machineWorkDiesel,
  ],
};

export const CUMMINS_67_PLATFORM: EnginePlatform = {
  id: "cummins67",
  name: "Cummins 6.7L ISB",
  displacement: "6.7L (408 ci)",
  years: "2007–Present",
  description: "The modern common-rail Cummins. High-pressure Bosch injection (up to 29,000 psi), variable geometry turbocharger, and a robust bottom end. Highly tunable via ECU and extremely popular in Ram 2500/3500 trucks. 350–400 hp stock in later variants.",
  categories: [
    {
      id: "injectors",
      name: "Injectors",
      group: "Fuel System",
      description: "The 6.7L uses Bosch piezo common-rail injectors. Larger injectors flow more fuel at the same rail pressure. Must be paired with a tune and adequate fuel supply.",
      required: false,
      parts: [
        { id: "c67-inj-stock", brand: "Bosch", name: "OEM Replacement Injectors (set of 6)", partNumber: "0-445-120-231-6", price: 1800, retailer: "Bosch dealer", tier: "budget" },
        { id: "c67-inj-30", brand: "Dynomite Diesel", name: "+30% Injectors 6.7L (set of 6)", partNumber: "DDP-67-30", price: 2200, retailer: "Dynomite Diesel", tier: "mid", notes: "Good for 500–600 hp with tune and CP3." },
        { id: "c67-inj-60", brand: "Dynomite Diesel", name: "+60% Injectors 6.7L (set of 6)", partNumber: "DDP-67-60", price: 2700, retailer: "Dynomite Diesel", tier: "premium", notes: "600–700 hp range. Requires large CP3 and quality lift pump." },
        { id: "c67-inj-90", brand: "Industrial Injection", name: "+90% Injectors 6.7L (set of 6)", partNumber: "II-67-90", price: 3400, retailer: "Industrial Injection", tier: "race", notes: "Race-level. 800+ hp with supporting mods." },
      ],
    },
    {
      id: "cp3-pump",
      name: "CP3 Injection Pump",
      group: "Fuel System",
      description: "The 6.7L uses a Bosch CP3 high-pressure fuel pump. Upgraded pumps flow more volume at higher rail pressure — critical for supporting larger injectors.",
      required: false,
      parts: [
        { id: "c67-cp3-stock", brand: "Bosch", name: "Stock CP3 Pump (reuse / OEM replacement)", price: 0, retailer: "—", tier: "budget" },
        { id: "c67-cp3-exergy", brand: "Exergy Performance", name: "Upgraded CP3 +30% Flow 6.7L", partNumber: "E01-00-0100", price: 1100, retailer: "Exergy Performance", tier: "mid", notes: "Keeps rail pressure up under high-demand builds." },
        { id: "c67-cp3-ii", brand: "Industrial Injection", name: "Reman Sportsman CP3 +50% Flow 6.7L", partNumber: "II-67-CP3-50", price: 1500, retailer: "Industrial Injection", tier: "premium" },
        { id: "c67-cp3-dual", brand: "Exergy Performance", name: "Dual CP3 Kit (twin high-pressure pump setup)", partNumber: "E01-D67-DK", price: 2800, retailer: "Exergy Performance", tier: "race", notes: "Maximum fuel supply for 900+ hp builds." },
      ],
    },
    {
      id: "lift-pump",
      name: "Lift Pump / Fuel Supply",
      group: "Fuel System",
      description: "A quality lift pump is critical to protect the CP3 from fuel starvation cavitation. This is the most important reliability modification on any performance 6.7 Cummins.",
      required: true,
      parts: [
        { id: "c67-lift-fass", brand: "FASS", name: "FASS Titanium 150GPH Diesel Fuel System", partNumber: "TS C12 150G", price: 625, retailer: "Summit Racing", tier: "mid", notes: "Most popular lift pump. Separates air and water." },
        { id: "c67-lift-airdog", brand: "AirDog", name: "AirDog II-4G 165GPH Fuel Pump", partNumber: "A4SPBC329", price: 680, retailer: "Summit Racing", tier: "mid", notes: "Excellent air/vapor separation." },
        { id: "c67-lift-fass220", brand: "FASS", name: "FASS Titanium Signature 220GPH", partNumber: "TS C12 220G", price: 850, retailer: "Summit Racing", tier: "premium", notes: "For large injector / dual CP3 builds." },
      ],
    },
    {
      id: "turbocharger",
      name: "Turbocharger",
      group: "Forced Induction",
      description: "Stock VGT (variable geometry turbo) HE351VGT is capable to ~500 hp. Aftermarket fixed-geometry singles and compound setups unlock more power.",
      required: false,
      parts: [
        { id: "c67-turbo-stock", brand: "Holset", name: "Stock HE351VGT Reman (reuse/replace)", price: 0, retailer: "—", tier: "budget", notes: "Good to 450–500 hp with tune and injectors." },
        { id: "c67-turbo-he400", brand: "Holset", name: "HE400VG Drop-In Upgrade", partNumber: "HE400VG-67", price: 1800, retailer: "Industrial Injection", tier: "mid", notes: "Best single-turbo upgrade for street/strip 500–700 hp." },
        { id: "c67-turbo-compound", brand: "BD Diesel", name: "Twin Turbo Compound Kit 6.7L", partNumber: "BD-1045997", price: 3200, retailer: "BD Diesel", tier: "premium", notes: "600–900 hp. Low-boost spool with massive top-end." },
      ],
    },
    {
      id: "tune",
      name: "Performance Tune",
      group: "Engine Management",
      description: "The ECU tune is the most important modification on any common-rail diesel. A quality tune unlocks the full potential of your hardware.",
      required: false,
      parts: [
        { id: "c67-tune-efilvie", brand: "EFI Live", name: "EFI Live Autocal Tuning Package 6.7L", partNumber: "EFL-AC3-67", price: 895, retailer: "Calibrated Power", tier: "premium", notes: "Best data-logging and tune flexibility. Used by most pro tuners." },
        { id: "c67-tune-ezlynk", brand: "EZ Lynk", name: "EZ Lynk AutoAgent 3.0 with Tunes", partNumber: "EZL-AA3-67", price: 580, retailer: "Summit Racing", tier: "mid", notes: "Good plug-and-play option. OBD2 interface." },
        { id: "c67-tune-bullydog", brand: "Bully Dog", name: "BDX Tuner with Tunes 6.7L Cummins", partNumber: "BDX-40420", price: 625, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    {
      id: "head-studs",
      name: "Head Studs",
      group: "Head & Sealing",
      description: "ARP head studs are the first reliability upgrade for any boosted 6.7L. OEM head bolts TTY and are single-use.",
      required: true,
      parts: [
        { id: "c67-studs-arp", brand: "ARP", name: "Cummins 6.7L ISB Head Stud Kit", partNumber: "247-4202", price: 295, retailer: "Summit Racing", tier: "premium", notes: "Replace before any hard use or power upgrades." },
      ],
    },
    {
      id: "intercooler",
      name: "Intercooler",
      group: "Induction & Cooling",
      description: "Stock CAC is adequate to ~450 hp. Upgraded intercoolers reduce charge temps for more power and knock margin.",
      required: false,
      parts: [
        { id: "c67-ic-mishimoto", brand: "Mishimoto", name: "Performance Intercooler 6.7L Cummins 07–18", partNumber: "MMINT-RAM-07", price: 610, retailer: "Summit Racing", tier: "mid" },
        { id: "c67-ic-banks", brand: "Banks Power", name: "Techni-Cooler Intercooler Kit 6.7L", partNumber: "25985", price: 780, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    ...machineWorkDiesel,
  ],
};

export const FORD_73_PLATFORM: EnginePlatform = {
  id: "ford73ps",
  name: "Ford Power Stroke 7.3L",
  displacement: "7.3L (444 ci)",
  years: "1994–2003",
  description: "The most beloved Power Stroke. HEUI (Hydraulic Electronic Unit Injector) system — engine oil at high pressure actuates each injector. Extremely robust bottom end that handles 500+ hp without internal engine work. The 7.3L is the diesel equivalent of the LS swap engine for its combination of simplicity, parts availability, and tuning potential.",
  categories: [
    {
      id: "injectors",
      name: "Injectors",
      group: "Fuel System",
      description: "7.3L injectors are HEUI — they use high-pressure oil, not fuel pressure, to actuate. Larger nozzle size increases fuel delivery per stroke. Must be matched to HPOP output.",
      required: false,
      parts: [
        { id: "f73-inj-stock", brand: "Ford / Motorcraft", name: "OEM Replacement Injectors (set of 8)", partNumber: "F4TZ-9E527-ARM-8", price: 1600, retailer: "Ford dealer / Rosewood", tier: "budget" },
        { id: "f73-inj-160", brand: "Swamps Diesel", name: "160cc High Output Injectors (set of 8)", partNumber: "SDP-7.3-160-8", price: 2100, retailer: "Swamps Diesel", tier: "mid", notes: "~50 hp over stock. Great street performance injector." },
        { id: "f73-inj-238", brand: "Swamps Diesel", name: "238cc Stage 2 Injectors (set of 8)", partNumber: "SDP-7.3-238-8", price: 2600, retailer: "Swamps Diesel", tier: "premium", notes: "350–400 hp range. Requires HPOP upgrade and tune." },
        { id: "f73-inj-300", brand: "Unlimited Diesel", name: "300cc Stage 3 Injectors (set of 8)", partNumber: "UDP-7.3-300-8", price: 3200, retailer: "Unlimited Diesel", tier: "race", notes: "500+ hp. Race use. Requires full HPOP, tune, and compound turbo." },
      ],
    },
    {
      id: "hpop",
      name: "High Pressure Oil Pump (HPOP)",
      group: "Fuel System",
      description: "The HPOP is unique to 7.3L — it pressurizes engine oil to 500–3,000 psi to actuate injectors. Larger HPOP = more injector actuation = more fuel delivery ceiling.",
      required: false,
      parts: [
        { id: "f73-hpop-stock", brand: "Ford", name: "OEM HPOP (reuse or OEM replacement)", price: 0, retailer: "—", tier: "budget", notes: "Stock is adequate to 160cc injectors if in good condition." },
        { id: "f73-hpop-ds125", brand: "Diesel Site", name: "12.5° HPOP Reman (25% flow increase)", partNumber: "DS-HPOP-125", price: 680, retailer: "Diesel Site", tier: "mid", notes: "Best upgrade for 160–238cc injectors." },
        { id: "f73-hpop-ts22", brand: "TS Performance", name: "22° HPOP Billet (50% flow increase)", partNumber: "TSP-HPOP-22", price: 1100, retailer: "TS Performance", tier: "premium", notes: "Required for 238cc+ injectors. Maximizes ICP pressure." },
      ],
    },
    {
      id: "turbocharger",
      name: "Turbocharger",
      group: "Forced Induction",
      description: "Stock TP38 / GTP38 turbo is a 60mm unit — adequate for mild builds. Many aftermarket options exist for larger singles and compound setups.",
      required: false,
      parts: [
        { id: "f73-turbo-gtp38", brand: "Garrett", name: "GTP38 Rebuilt / Upgraded Turbo (stock replacement)", partNumber: "GTP38R-73", price: 650, retailer: "Bullet Proof Diesel", tier: "budget", notes: "Factory replacement. Good base for mild to 300 hp builds." },
        { id: "f73-turbo-tc45", brand: "Garrett", name: "TC45R Single Turbo Drop-In (68mm)", partNumber: "TC45R-68", price: 1200, retailer: "Summit Racing", tier: "mid", notes: "Best single turbo option for 300–450 hp street builds." },
        { id: "f73-turbo-compound", brand: "BD Diesel", name: "Compound Turbo Kit 7.3L (GTP38 + large outer)", partNumber: "BD-1045799", price: 2800, retailer: "BD Diesel", tier: "premium", notes: "Best for 500+ hp. Great spool with big top end." },
      ],
    },
    {
      id: "tune",
      name: "Performance Tune",
      group: "Engine Management",
      description: "7.3L ECU tuning unlocks ICP table, injection timing, fuel tables, and rev limiter. A custom tune is the best return on investment after injectors.",
      required: false,
      parts: [
        { id: "f73-tune-ts", brand: "TS Performance", name: "TS Performance 6-Position Chip 7.3L", partNumber: "TSP-73-6POS", price: 385, retailer: "TS Performance", tier: "mid", notes: "6 power levels. Best bang-for-buck for stock to mild injectors." },
        { id: "f73-tune-sct", brand: "SCT", name: "SCT BDX Custom Tuner 7.3L", partNumber: "SCT-40460", price: 490, retailer: "Summit Racing", tier: "mid" },
        { id: "f73-tune-efilive", brand: "EFI Live", name: "EFI Live FlashScan V2 + Custom Tune 7.3L", partNumber: "EFL-FS2-73", price: 950, retailer: "Calibrated Power", tier: "premium", notes: "Maximum data logging and tuning flexibility." },
      ],
    },
    {
      id: "head-studs",
      name: "Head Studs",
      group: "Head & Sealing",
      description: "Stock 7.3L head bolts are TTY. ARP studs provide more clamping force and can be reused.",
      required: true,
      parts: [
        { id: "f73-studs-arp", brand: "ARP", name: "7.3L Power Stroke Head Stud Kit", partNumber: "145-4202", price: 275, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "up-pipe",
      name: "Up-Pipe Gaskets / EBP Delete",
      group: "Exhaust & Intake",
      description: "Stock 7.3L up-pipe gaskets (at the turbo inlet) fail and leak exhaust. Replacement is critical. The EBP (exhaust backpressure) valve restricts flow — deleting it adds 10–20 hp.",
      required: false,
      parts: [
        { id: "f73-up-gaskets", brand: "Diesel Site", name: "Up-Pipe Gasket Kit 7.3L (both sides)", partNumber: "DS-UP-GASK", price: 45, retailer: "Diesel Site", tier: "budget", notes: "Common failure item. Replace on every engine-out job." },
        { id: "f73-ebp-delete", brand: "Diesel Site", name: "EBP Delete Kit 7.3L (bung plug + tune required)", partNumber: "DS-EBP-DEL", price: 28, retailer: "Diesel Site", tier: "budget", notes: "Delete the backpressure sensor plug. Requires a tune that removes EBP tables." },
        { id: "f73-up-billet", brand: "Bullet Proof Diesel", name: "Billet Up-Pipes with Bellowed Flex 7.3L", partNumber: "BPD-UP-73", price: 385, retailer: "Bullet Proof Diesel", tier: "premium", notes: "Eliminates the root cause of up-pipe leaks permanently." },
      ],
    },
    ...machineWorkDiesel,
  ],
};

export const FORD_60_PLATFORM: EnginePlatform = {
  id: "ford60ps",
  name: "Ford Power Stroke 6.0L",
  displacement: "6.0L (365 ci)",
  years: "2003–2007",
  description: "The most problematic Power Stroke — and when properly built, one of the most capable. The 6.0L suffers from a flawed oil cooler design, EGR cooler failures, and head gasket issues under stock head bolts. A 'bulletproofed' 6.0L (ARP studs, bulletproof oil cooler, EGR cooler delete/replace) is extremely reliable and tunable to 500+ hp.",
  categories: [
    {
      id: "head-studs",
      name: "Head Studs",
      group: "Head & Sealing",
      description: "Head studs are #1 on the 6.0L. OEM TTY head bolts cannot clamp the head adequately under boost. Every performance 6.0L should have ARP studs. This is the single most important modification.",
      required: true,
      parts: [
        { id: "f60-studs-arp", brand: "ARP", name: "6.0L Power Stroke Head Stud Kit", partNumber: "145-4203", price: 285, retailer: "Summit Racing", tier: "premium", notes: "Non-negotiable for any 6.0L build. Install before any other performance work." },
      ],
    },
    {
      id: "oil-cooler",
      name: "Oil Cooler",
      group: "Cooling & EGR",
      description: "The stock 6.0L oil cooler has very small passages that clog with coolant deposits, causing oil temperatures to spike and EGR cooler failures. Replacement is essential.",
      required: true,
      parts: [
        { id: "f60-oc-bpd", brand: "Bullet Proof Diesel", name: "Bulletproof Oil Cooler Kit 6.0L", partNumber: "BPD-OC-6.0", price: 1650, retailer: "Bullet Proof Diesel", tier: "premium", notes: "Industry standard solution. Uses remote-mounted external oil cooler that never clogs." },
        { id: "f60-oc-oem", brand: "Motorcraft", name: "OEM Oil Cooler Replacement 6.0L", partNumber: "BC3Z-6A642-E", price: 420, retailer: "Ford dealer", tier: "budget", notes: "Will clog again if coolant isn't maintained and EGR is still active. Temporary fix." },
        { id: "f60-oc-mispro", brand: "Mishimoto", name: "Performance Oil Cooler 6.0L", partNumber: "MMOC-F2D-03", price: 585, retailer: "Summit Racing", tier: "mid", notes: "Larger passages than OEM. Good budget alternative to BPD if EGR is deleted." },
      ],
    },
    {
      id: "egr-cooler",
      name: "EGR Cooler / Delete",
      group: "Cooling & EGR",
      description: "The EGR cooler is the 6.0L's other notorious failure — it cracks and pushes coolant into the intake or combustion chamber. Delete (off-road only) or upgrade with an improved cooler.",
      required: false,
      parts: [
        { id: "f60-egr-bpd", brand: "Bullet Proof Diesel", name: "Bulletproof EGR Cooler Upgrade 6.0L", partNumber: "BPD-EGR-6.0", price: 680, retailer: "Bullet Proof Diesel", tier: "premium", notes: "Much larger, stronger construction. Best choice for on-road use." },
        { id: "f60-egr-del", brand: "DP-Tuner", name: "EGR Delete Kit 6.0L (off-road/race use only)", partNumber: "DPT-EGR-DEL-60", price: 220, retailer: "DP-Tuner", tier: "budget", notes: "Off-road/race use only. Eliminates the EGR system. Requires tune." },
      ],
    },
    {
      id: "injectors",
      name: "Injectors",
      group: "Fuel System",
      description: "6.0L uses HEUI injectors similar to 7.3L but with different sizing. Performance injectors unlock significant power gains when paired with a tune.",
      required: false,
      parts: [
        { id: "f60-inj-stock", brand: "Motorcraft", name: "OEM Reman Injectors 6.0L (set of 8)", partNumber: "CM5247-8", price: 2400, retailer: "Ford dealer", tier: "budget" },
        { id: "f60-inj-swamps", brand: "Swamps Diesel", name: "Stage 2 Performance Injectors 6.0L (set of 8)", partNumber: "SDP-60-S2-8", price: 2900, retailer: "Swamps Diesel", tier: "mid", notes: "~50–80 hp gain over OEM. Reliable street injector." },
        { id: "f60-inj-dynomite", brand: "Dynomite Diesel", name: "+50% Injectors 6.0L (set of 8)", partNumber: "DDP-60-50-8", price: 3500, retailer: "Dynomite Diesel", tier: "premium" },
      ],
    },
    {
      id: "tune",
      name: "Performance Tune",
      group: "Engine Management",
      description: "A quality tune is essential to get the most out of the 6.0L and to properly delete the EGR/DPF for off-road use.",
      required: false,
      parts: [
        { id: "f60-tune-ts", brand: "TS Performance", name: "6-Position Chip 6.0L Power Stroke", partNumber: "TSP-60-6POS", price: 380, retailer: "TS Performance", tier: "mid" },
        { id: "f60-tune-sct", brand: "SCT", name: "BDX Performance Tuner 6.0L", partNumber: "SCT-40460-60", price: 495, retailer: "Summit Racing", tier: "mid" },
        { id: "f60-tune-efilive", brand: "EFI Live", name: "EFI Live Custom Tune Package 6.0L", partNumber: "EFL-60-PKG", price: 940, retailer: "DP-Tuner", tier: "premium" },
      ],
    },
    {
      id: "coolant-filter",
      name: "Coolant Filtration Kit",
      group: "Cooling & EGR",
      description: "Dirty coolant is what kills the 6.0L oil cooler. A coolant filter removes silicate deposits and contamination before they reach the oil cooler passages.",
      required: true,
      parts: [
        { id: "f60-cf-bpd", brand: "Bullet Proof Diesel", name: "Coolant Filter Kit 6.0L Power Stroke", partNumber: "BPD-CF-6.0", price: 125, retailer: "Bullet Proof Diesel", tier: "mid", notes: "Change filter annually or at every coolant flush." },
        { id: "f60-cf-ford", brand: "Motorcraft", name: "Coolant Flush + DCA4 Additive Service", partNumber: "VC-7-B", price: 45, retailer: "Ford dealer", tier: "budget" },
      ],
    },
    ...machineWorkDiesel,
  ],
};

export const FORD_67_PLATFORM: EnginePlatform = {
  id: "ford67ps",
  name: "Ford Power Stroke 6.7L",
  displacement: "6.7L (406 ci)",
  years: "2011–Present",
  description: "Ford's first in-house designed diesel. Compacted graphite iron block, reverse-flow cooling, and a twin-entry turbocharger mounted in the engine valley. Very strong bottom end and highly tunable. Later versions (2015+) make 440–500 hp stock. The CP4 injection pump is a known weak point — CP3 conversion is the #1 reliability upgrade.",
  categories: [
    {
      id: "cp3-conv",
      name: "CP4 → CP3 Conversion",
      group: "Fuel System",
      description: "The 6.7L Power Stroke uses a Bosch CP4 high-pressure pump which can catastrophically fail by ingesting metal into the fuel system. Conversion to a CP3 eliminates this failure mode — considered the most important reliability mod.",
      required: true,
      parts: [
        { id: "f67-cp3-conv-unlimited", brand: "Unlimited Diesel", name: "CP3 Conversion Kit 6.7L PS (includes pump, lines, bracket)", partNumber: "UDP-67PS-CP3-KIT", price: 1400, retailer: "Unlimited Diesel", tier: "premium", notes: "Eliminates CP4 failure risk. Requires tune update." },
        { id: "f67-cp3-conv-sump", brand: "Fleece Performance", name: "CP3 Conversion Kit with Sump 6.7L PS", partNumber: "FPE-67PS-CP3", price: 1650, retailer: "Fleece Performance", tier: "premium", notes: "Adds fuel sump to prevent lean starvation at high demand." },
      ],
    },
    {
      id: "injectors",
      name: "Injectors",
      group: "Fuel System",
      description: "6.7L PS uses Bosch common-rail injectors. Performance injectors unlock significant power with a tune.",
      required: false,
      parts: [
        { id: "f67-inj-dynomite", brand: "Dynomite Diesel", name: "Stage 2 Injectors 6.7L PS (set of 8, +30%)", partNumber: "DDP-67PS-S2-8", price: 2600, retailer: "Dynomite Diesel", tier: "mid" },
        { id: "f67-inj-unlimited", brand: "Unlimited Diesel", name: "+60% Injectors 6.7L PS (set of 8)", partNumber: "UDP-67PS-60-8", price: 3100, retailer: "Unlimited Diesel", tier: "premium" },
      ],
    },
    {
      id: "lift-pump",
      name: "Lift Pump / Fuel Supply",
      group: "Fuel System",
      description: "A quality lift pump is essential to keep the high-pressure pump supplied and protected.",
      required: true,
      parts: [
        { id: "f67-lift-fass", brand: "FASS", name: "FASS Titanium 150GPH 6.7L PS", partNumber: "TS F17 150G", price: 640, retailer: "Summit Racing", tier: "mid" },
        { id: "f67-lift-airdog", brand: "AirDog", name: "AirDog II-4G 165GPH 6.7L PS", partNumber: "A4SPBF321", price: 695, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    {
      id: "turbocharger",
      name: "Turbocharger",
      group: "Forced Induction",
      description: "The stock twin-entry turbo is capable to ~500 hp. Aftermarket turbos and compound setups unlock more power.",
      required: false,
      parts: [
        { id: "f67-turbo-stock", brand: "BorgWarner", name: "Stock Reman Turbo 6.7L PS", price: 0, retailer: "—", tier: "budget", notes: "Stock is capable to 500 hp with tune and injectors." },
        { id: "f67-turbo-bd", brand: "BD Diesel", name: "BorgWarner S300SX Single Turbo Kit 6.7L", partNumber: "BD-1047120", price: 2600, retailer: "BD Diesel", tier: "premium", notes: "Large single for 600–800 hp. Requires custom manifold." },
        { id: "f67-turbo-compound", brand: "Fleece Performance", name: "Compound Turbo Kit 6.7L PS", partNumber: "FPE-67PS-CMPD", price: 4500, retailer: "Fleece Performance", tier: "race", notes: "800+ hp potential with supporting mods." },
      ],
    },
    {
      id: "tune",
      name: "Performance Tune",
      group: "Engine Management",
      description: "Custom tuning is required when modifying the 6.7L. ECU tuning controls fuel delivery, boost targets, and transmission shift points.",
      required: false,
      parts: [
        { id: "f67-tune-sct", brand: "SCT", name: "SCT BDX Tuner 6.7L PS (pre-loaded tunes)", partNumber: "SCT-40470", price: 510, retailer: "Summit Racing", tier: "mid" },
        { id: "f67-tune-efilive", brand: "EFI Live", name: "EFI Live FlashScan V2 Custom Package 6.7L PS", partNumber: "EFL-67PS-PKG", price: 1100, retailer: "Calibrated Power", tier: "premium" },
      ],
    },
    {
      id: "head-studs",
      name: "Head Studs",
      group: "Head & Sealing",
      description: "ARP head studs provide superior clamping vs TTY OEM bolts for boosted builds.",
      required: false,
      parts: [
        { id: "f67-studs-arp", brand: "ARP", name: "6.7L Power Stroke Head Stud Kit", partNumber: "145-4204", price: 295, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    ...machineWorkDiesel,
  ],
};

export const DURAMAX_PLATFORM: EnginePlatform = {
  id: "duramax66",
  name: "GM Duramax 6.6L",
  displacement: "6.6L (403 ci)",
  years: "2001–Present",
  description: "GM's workhorse V8 diesel. The LBZ and LMM generations (2006–2010) are widely considered the sweet spot — strong bottom ends, fully tunable, and excellent aftermarket support. The LML and L5P use a CP4 injection pump that requires a CP3 conversion for reliability. All Duramax engines respond exceptionally to fuel and turbo upgrades.",
  categories: [
    {
      id: "injectors",
      name: "Injectors",
      group: "Fuel System",
      description: "Duramax injectors are Bosch common-rail solenoid units (LB7) or piezo units (LLY+). LB7 injectors are notorious for leaking and require replacement around 100k miles. Upgraded injectors pair with a CP3 and tune for big power.",
      required: false,
      parts: [
        { id: "dm-inj-lb7-oem", brand: "Bosch", name: "LB7 OEM Reman Injectors (set of 8)", partNumber: "0-986-435-503-8", price: 2200, retailer: "Summit Racing", tier: "budget", notes: "LB7 (2001–2004) injectors have known leaking problems. Replace at 100k+ miles." },
        { id: "dm-inj-30pct", brand: "Dynomite Diesel", name: "+30% Performance Injectors Duramax (set of 8)", partNumber: "DDP-DM-30-8", price: 2800, retailer: "Dynomite Diesel", tier: "mid", notes: "Good street/tow injector. Pairs well with upgraded CP3 and tune." },
        { id: "dm-inj-60pct", brand: "Dynomite Diesel", name: "+60% Performance Injectors Duramax (set of 8)", partNumber: "DDP-DM-60-8", price: 3400, retailer: "Dynomite Diesel", tier: "premium", notes: "600–700 hp range with tune and fuel system." },
        { id: "dm-inj-100pct", brand: "Industrial Injection", name: "+100% Race Injectors Duramax (set of 8)", partNumber: "II-DM-100-8", price: 4500, retailer: "Industrial Injection", tier: "race", notes: "800+ hp. Requires dual CP3 and full fuel system." },
      ],
    },
    {
      id: "cp3-pump",
      name: "CP3 Injection Pump / Conversion",
      group: "Fuel System",
      description: "LLY, LBZ, LMM use a CP3. LML and L5P use a CP4 — which must be converted to a CP3 for reliability. Upgraded CP3s flow more volume to support larger injectors.",
      required: false,
      parts: [
        { id: "dm-cp3-exergy", brand: "Exergy Performance", name: "Upgraded CP3 +30% Flow Duramax", partNumber: "E01-00-0101", price: 1150, retailer: "Exergy Performance", tier: "mid", notes: "Keeps rail pressure up under high-demand builds." },
        { id: "dm-cp3-lml-conv", brand: "Fleece Performance", name: "CP4 → CP3 Conversion Kit LML/L5P Duramax", partNumber: "FPE-LML-CP3-KIT", price: 1550, retailer: "Fleece Performance", tier: "premium", notes: "Critical reliability upgrade for 2011+ LML/L5P. Eliminates catastrophic CP4 failure." },
        { id: "dm-cp3-dual", brand: "Exergy Performance", name: "Dual CP3 Kit (twin pump) Duramax", partNumber: "E01-D-DM-DK", price: 3000, retailer: "Exergy Performance", tier: "race", notes: "Maximum fuel supply for 900+ hp builds." },
      ],
    },
    {
      id: "lift-pump",
      name: "Lift Pump / Fuel Supply",
      group: "Fuel System",
      description: "A quality lift pump prevents fuel starvation at the CP3, especially important in performance and towing applications.",
      required: true,
      parts: [
        { id: "dm-lift-fass", brand: "FASS", name: "FASS Titanium 150GPH Duramax", partNumber: "TS D08 150G", price: 620, retailer: "Summit Racing", tier: "mid" },
        { id: "dm-lift-airdog", brand: "AirDog", name: "AirDog II-4G 150GPH Duramax", partNumber: "A4SPBG107", price: 665, retailer: "Summit Racing", tier: "mid" },
        { id: "dm-lift-fass220", brand: "FASS", name: "FASS Titanium 220GPH Duramax (for dual CP3)", partNumber: "TS D08 220G", price: 835, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "turbocharger",
      name: "Turbocharger",
      group: "Forced Induction",
      description: "Stock LBZ/LLY turbo is a LLY-series Garrett unit good for ~500 hp. Larger singles and compound setups unlock 600–1,000+ hp.",
      required: false,
      parts: [
        { id: "dm-turbo-stock", brand: "Garrett", name: "Stock Duramax Turbo Reman LLY/LBZ", price: 0, retailer: "—", tier: "budget", notes: "Good to 450–500 hp with tune and injectors." },
        { id: "dm-turbo-bd", brand: "BD Diesel", name: "Screamer Performance Turbo LBZ/LMM 64mm", partNumber: "BD-1045825", price: 1600, retailer: "BD Diesel", tier: "mid", notes: "Best single-turbo option for 500–650 hp street builds." },
        { id: "dm-turbo-compound", brand: "BD Diesel", name: "Twin Turbo Compound Kit Duramax", partNumber: "BD-1045802", price: 3500, retailer: "BD Diesel", tier: "premium", notes: "800–1,000 hp capable. Daily-driver spool with massive top end." },
        { id: "dm-turbo-s480", brand: "Precision / Fleece", name: "S480 Single Turbo Full Kit Duramax", partNumber: "FPE-DM-S480-KIT", price: 4800, retailer: "Fleece Performance", tier: "race", notes: "1,000+ hp. Full manifold, clamp, and intercooler piping required." },
      ],
    },
    {
      id: "tune",
      name: "Performance Tune",
      group: "Engine Management",
      description: "Duramax responds extremely well to ECU tuning. HP Tuners and EFI Live are the two dominant platforms used by professional tuners.",
      required: false,
      parts: [
        { id: "dm-tune-dtx", brand: "Duramax Tuner", name: "Spade Tuner DSP5 Duramax (pre-loaded, 5 tunes)", partNumber: "DTX-DSP5-DM", price: 580, retailer: "Duramax Tuner", tier: "mid", notes: "Best plug-and-play option. No laptop required." },
        { id: "dm-tune-efilive", brand: "EFI Live", name: "EFI Live FlashScan V2 Custom Tune Package", partNumber: "EFL-DM-PKG", price: 950, retailer: "Calibrated Power", tier: "premium", notes: "Best for custom and data logging. Used by Duramax Tuner professionals." },
        { id: "dm-tune-hptuners", brand: "HP Tuners", name: "MPVI3 + Custom Tune Credits Duramax", partNumber: "HPT-MPVI3-DM", price: 850, retailer: "HP Tuners", tier: "premium" },
      ],
    },
    {
      id: "head-studs",
      name: "Head Studs",
      group: "Head & Sealing",
      description: "ARP head studs are the standard reliability upgrade for any boosted Duramax.",
      required: false,
      parts: [
        { id: "dm-studs-arp", brand: "ARP", name: "Duramax 6.6L Head Stud Kit (set of 20)", partNumber: "230-4201", price: 320, retailer: "Summit Racing", tier: "premium", notes: "Required for any compound turbo or high-boost build." },
      ],
    },
    {
      id: "intercooler",
      name: "Intercooler",
      group: "Induction & Cooling",
      description: "Upgraded intercoolers reduce intake charge temps for more power and less knock margin consumption.",
      required: false,
      parts: [
        { id: "dm-ic-mishimoto", brand: "Mishimoto", name: "Performance Intercooler Duramax 6.6L", partNumber: "MMINT-DMAX-01", price: 625, retailer: "Summit Racing", tier: "mid" },
        { id: "dm-ic-banks", brand: "Banks Power", name: "Techni-Cooler Intercooler Duramax 6.6L", partNumber: "25980", price: 790, retailer: "Summit Racing", tier: "premium" },
        { id: "dm-ic-bd", brand: "BD Diesel", name: "High Flow Intercooler Duramax 6.6L", partNumber: "BD-1042620", price: 580, retailer: "BD Diesel", tier: "mid" },
      ],
    },
    ...machineWorkDiesel,
  ],
};
