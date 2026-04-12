export type PartTier = "budget" | "mid" | "premium" | "race";

export type Part = {
  id: string;
  brand: string;
  name: string;
  partNumber?: string;
  price: number;
  retailer: string;
  tier: PartTier;
  notes?: string;
};

export type PartCategory = {
  id: string;
  name: string;
  group: string;
  description: string;
  required: boolean;
  parts: Part[];
};

export type EnginePlatform = {
  id: string;
  name: string;
  displacement: string;
  years: string;
  description: string;
  categories: PartCategory[];
};

const lsRotating: PartCategory[] = [
  {
    id: "crankshaft",
    name: "Crankshaft",
    group: "Rotating Assembly",
    description: "Stock forged steel cranks are strong for most street/strip builds. Aftermarket 4340 cranks are needed for high-boost or over 600 hp applications.",
    required: false,
    parts: [
      { id: "ls-crank-stock", brand: "GM", name: "Stock LS1 Crankshaft (reuse / reground)", price: 0, retailer: "—", tier: "budget", notes: "Adequate to 600 hp naturally aspirated if undamaged." },
      { id: "ls-crank-eagle", brand: "Eagle", name: "4340 Forged Steel LS Crankshaft 3.622\"", partNumber: "103521", price: 445, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-crank-scat", brand: "Scat", name: "4340 Forged LS1 Crankshaft 3.622\"", partNumber: "9-440-3875-6243", price: 540, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-crank-callies", brand: "Callies", name: "CompStar 4340 LS Crankshaft 3.622\"", partNumber: "3CS62218A2", price: 675, retailer: "Summit Racing", tier: "premium" },
    ],
  },
  {
    id: "rods",
    name: "Connecting Rods",
    group: "Rotating Assembly",
    description: "Stock powdered metal rods handle ~450 hp. H-beam forged 4340 rods are the go-to for any serious build. I-beam and X-beam for extreme power.",
    required: false,
    parts: [
      { id: "ls-rods-stock", brand: "GM", name: "Stock LS1 PM Rods (reuse)", price: 0, retailer: "—", tier: "budget", notes: "Good to ~450 hp. Inspect for cracks before reuse." },
      { id: "ls-rods-eagle", brand: "Eagle", name: "4340 H-Beam Rods 6.098\" (set of 8)", partNumber: "CRS6098C3D", price: 385, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-rods-scat", brand: "Scat", name: "4340 H-Beam LS Rods 6.098\" (set of 8)", partNumber: "2-LS1-6098-2100-8", price: 420, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-rods-manley", brand: "Manley", name: "Turbo-Tuff I-Beam LS Rods 6.098\" (set of 8)", partNumber: "14431-8", price: 640, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-rods-oliver", brand: "Oliver", name: "Billet Steel X-Beam LS Rods 6.098\" (set of 8)", partNumber: "6.098-X-LS8", price: 1380, retailer: "Oliver Racing Parts", tier: "race" },
    ],
  },
  {
    id: "pistons",
    name: "Pistons",
    group: "Rotating Assembly",
    description: "Hypereutectic pistons are fine for mild street builds. Forged aluminum is the choice for any power adder or sustained high rpm.",
    required: true,
    parts: [
      { id: "ls-piston-mahle-85", brand: "Mahle", name: "PowerPak LS1 8.5:1 Flat Top (set of 8)", partNumber: "930213830", price: 420, retailer: "Summit Racing", tier: "mid", notes: "Great all-around street/strip piston." },
      { id: "ls-piston-wiseco-90", brand: "Wiseco", name: "Forged LS1 9.0:1 Dish Top (set of 8)", partNumber: "K444X1", price: 585, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-piston-diamond-95", brand: "Diamond", name: "Forged LS1 9.5:1 Flat Top (set of 8)", partNumber: "11513-8", price: 755, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-piston-cp", brand: "CP-Carrillo", name: "Forged LS1 Custom Compression (set of 8)", partNumber: "SC7045", price: 920, retailer: "CP-Carrillo", tier: "race" },
    ],
  },
  {
    id: "rings",
    name: "Piston Rings",
    group: "Rotating Assembly",
    description: "Always use application-matched rings. File-fit rings let you dial in exact gap. Moly top rings run cooler than chrome.",
    required: true,
    parts: [
      { id: "ls-rings-hastings", brand: "Hastings", name: "Moly Ring Set LS1 3.898\" (set of 8)", partNumber: "2M-581", price: 65, retailer: "Summit Racing", tier: "budget" },
      { id: "ls-rings-mahle", brand: "Mahle", name: "LS1 Standard Ring Set 3.898\" (set of 8)", partNumber: "40768", price: 80, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-rings-totalseal", brand: "Total Seal", name: "Gapless LS1 Ring Set 3.898\" (set of 8)", partNumber: "TSN1509-35", price: 125, retailer: "Summit Racing", tier: "premium", notes: "Reduced blow-by, ideal for boost." },
    ],
  },
  {
    id: "main-bearings",
    name: "Main Bearings",
    group: "Rotating Assembly",
    description: "Replace all main and rod bearings on any rebuild. H-series tri-metal bearings are the gold standard for performance engines.",
    required: true,
    parts: [
      { id: "ls-mains-acl", brand: "ACL", name: "Race Series LS1 Main Bearings", partNumber: "7M2399H-STD", price: 82, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-mains-king", brand: "King", name: "HP Series LS1 Main Bearings", partNumber: "MB5276HP", price: 98, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-mains-clevite", brand: "Clevite 77", name: "H-Series LS1 Main Bearings", partNumber: "MS2199H", price: 112, retailer: "Summit Racing", tier: "premium" },
    ],
  },
  {
    id: "rod-bearings",
    name: "Rod Bearings",
    group: "Rotating Assembly",
    description: "Match rod bearings to your clearance spec. Tighter clearance = quieter, looser = more oiling but noisier.",
    required: true,
    parts: [
      { id: "ls-rodb-acl", brand: "ACL", name: "Race Series LS1 Rod Bearings", partNumber: "8B2399H-STD", price: 68, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-rodb-king", brand: "King", name: "HP Series LS1 Rod Bearings", partNumber: "CR819HP", price: 78, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-rodb-clevite", brand: "Clevite 77", name: "H-Series LS1 Rod Bearings", partNumber: "CB663H", price: 92, retailer: "Summit Racing", tier: "premium" },
    ],
  },
];

const lsValvetrain: PartCategory[] = [
  {
    id: "camshaft",
    name: "Camshaft",
    group: "Valvetrain",
    description: "The single most impactful power modification. Cam selection depends on compression ratio, converter stall, rear gear, and intended use.",
    required: false,
    parts: [
      { id: "ls-cam-stock", brand: "GM", name: "Stock LS1 Camshaft (reuse)", price: 0, retailer: "—", tier: "budget", notes: "218/218 .460/.460 on 116 LSA. Fine for daily driver." },
      { id: "ls-cam-btr1", brand: "BTR", name: "Stage 1 NA Cam (218/224 .560/.558 112+3)", partNumber: "BTR-Stage1", price: 285, retailer: "Brian Tooley Racing", tier: "mid", notes: "Best all-around mild cam for stock heads." },
      { id: "ls-cam-btr2", brand: "BTR", name: "Stage 2 NA Cam (224/228 .585/.588 112+3)", partNumber: "BTR-Stage2", price: 315, retailer: "Brian Tooley Racing", tier: "mid", notes: "Popular LS swap cam. Mild idle, big midrange." },
      { id: "ls-cam-tsp3", brand: "Texas Speed", name: "Stage 3 Cam (228/233 .600/.600 112+3)", partNumber: "TSP-Stage3", price: 355, retailer: "Texas Speed", tier: "premium", notes: "Requires good heads, headers, and 3.73+ gears." },
      { id: "ls-cam-comp", brand: "COMP Cams", name: "LSR Stage 2 (227/233 .608/.598 112+3)", partNumber: "54-455-11", price: 370, retailer: "Summit Racing", tier: "premium" },
    ],
  },
  {
    id: "lifters",
    name: "Lifters",
    group: "Valvetrain",
    description: "LS engines use hydraulic roller lifters. OEM lifters are known to fail. Aftermarket units are strongly recommended for any performance build.",
    required: false,
    parts: [
      { id: "ls-lifters-melling", brand: "Melling", name: "LS Replacement Lifters (set of 16)", partNumber: "LIF1004", price: 175, retailer: "Summit Racing", tier: "budget" },
      { id: "ls-lifters-comp", brand: "COMP Cams", name: "LS Retrofit Hydraulic Roller Lifters (16)", partNumber: "819-16", price: 385, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-lifters-tick", brand: "Tick Performance", name: "Street/Strip LS Lifters (set of 16)", partNumber: "TP-LSL-16", price: 410, retailer: "Tick Performance", tier: "premium" },
      { id: "ls-lifters-johnson", brand: "Johnson", name: "Ultra EFT Roller Lifters LS (set of 16)", partNumber: "EFT-LS-16", price: 660, retailer: "Summit Racing", tier: "race" },
    ],
  },
  {
    id: "pushrods",
    name: "Pushrods",
    group: "Valvetrain",
    description: "Pushrod length depends on rocker arm ratio and head milling. Always verify length after assembly with a checking pushrod.",
    required: false,
    parts: [
      { id: "ls-pr-stock", brand: "GM", name: "Stock LS1 Pushrods 7.400\" (reuse)", price: 0, retailer: "—", tier: "budget" },
      { id: "ls-pr-btr", brand: "BTR", name: "5/16\" Wall Pushrods 7.400\" (set of 16)", partNumber: "BTR-PR-7400", price: 98, retailer: "Brian Tooley Racing", tier: "mid" },
      { id: "ls-pr-trend", brand: "Trend Performance", name: "7.400\" 5/16\" Wall Pushrods (set of 16)", partNumber: "T73280716-16", price: 125, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-pr-smith", brand: "Smith Brothers", name: "Custom 7.400\" Chromoly Pushrods (set of 16)", partNumber: "SBS-7400-16", price: 165, retailer: "Smith Brothers", tier: "race" },
    ],
  },
  {
    id: "rocker-arms",
    name: "Rocker Arms",
    group: "Valvetrain",
    description: "Stock LS rockers use trunnion bearings that fail under sustained high-lift use. At minimum, install a trunnion upgrade kit. Full roller rockers are the right call for any cam upgrade.",
    required: false,
    parts: [
      { id: "ls-rockers-btr-tuk", brand: "BTR", name: "Trunnion Upgrade Kit for Stock LS Rockers", partNumber: "BTR-TUK", price: 95, retailer: "Brian Tooley Racing", tier: "budget", notes: "Fixes the stock rocker failure point. Minimum recommended." },
      { id: "ls-rockers-btr17", brand: "BTR", name: "1.7 Ratio Roller Rockers LS1 (set of 16)", partNumber: "BTR-1.7-LS", price: 435, retailer: "Brian Tooley Racing", tier: "mid" },
      { id: "ls-rockers-hs", brand: "Harland Sharp", name: "1.7 Ratio Roller Rockers LS1 (set of 16)", partNumber: "HS8505-1", price: 485, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-rockers-comp", brand: "COMP Cams", name: "Ultra Gold 1.7 Roller Rockers LS (set of 16)", partNumber: "1622-16", price: 550, retailer: "Summit Racing", tier: "premium" },
    ],
  },
  {
    id: "valve-springs",
    name: "Valve Springs & Retainers",
    group: "Valvetrain",
    description: "Springs must be matched to cam lift and rpm range. Stock LS springs max out around .550\" lift and 6500 rpm. Beehive springs reduce retainer mass.",
    required: false,
    parts: [
      { id: "ls-springs-stock", brand: "GM", name: "Stock LS1 Springs (reuse with mild cam)", price: 0, retailer: "—", tier: "budget", notes: "Only usable with Stage 1 cams under .560\" lift." },
      { id: "ls-springs-btr", brand: "BTR", name: "LS1 Beehive Spring Kit 220lb/in (complete)", partNumber: "BTR-SK-220", price: 225, retailer: "Brian Tooley Racing", tier: "mid", notes: "Good to .600\" lift, 7000 rpm." },
      { id: "ls-springs-comp", brand: "COMP Cams", name: "Beehive Spring Kit LS1 (26921-KIT-16)", partNumber: "26921-16", price: 265, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-springs-pac", brand: "PAC Racing", name: "LS1 High-Performance Spring Package", partNumber: "PAC-1218-KIT", price: 385, retailer: "Summit Racing", tier: "race" },
    ],
  },
  {
    id: "timing-chain",
    name: "Timing Chain Kit",
    group: "Valvetrain",
    description: "Replace the timing chain on any rebuild. Double-roller chains eliminate slack from worn OEM chains.",
    required: true,
    parts: [
      { id: "ls-timing-cloyes", brand: "Cloyes", name: "Hex-A-Plus LS Timing Set", partNumber: "9-0391", price: 78, retailer: "Summit Racing", tier: "budget" },
      { id: "ls-timing-comp", brand: "COMP Cams", name: "LS Timing Chain Set", partNumber: "3120", price: 98, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-timing-btr", brand: "BTR", name: "LS Billet Timing Chain Kit", partNumber: "BTR-TCK-LS", price: 115, retailer: "Brian Tooley Racing", tier: "premium" },
    ],
  },
];

const lsHeads: PartCategory[] = [
  {
    id: "heads",
    name: "Cylinder Heads",
    group: "Cylinder Heads",
    description: "Heads are the biggest restriction on an LS engine. Upgraded heads consistently deliver 40–80+ hp over stock. Sold in pairs.",
    required: false,
    parts: [
      { id: "ls-heads-stock", brand: "GM", name: "LS1/LS6 Heads Reconditioned (pair, 200cc)", price: 450, retailer: "Reman shop", tier: "budget", notes: "Machine work included in price estimate. Flow ~210 cfm." },
      { id: "ls-heads-afr195", brand: "AFR", name: "195cc Mongoose LS Heads (pair, assembled)", partNumber: "1425", price: 1295, retailer: "Summit Racing", tier: "mid", notes: "~260 cfm. Best value in class." },
      { id: "ls-heads-tfs215", brand: "Trick Flow", name: "GenX 215 LS Heads (pair, assembled)", partNumber: "TFS-32410001-C01", price: 1150, retailer: "Summit Racing", tier: "mid", notes: "~255 cfm. Excellent intake port." },
      { id: "ls-heads-edel215", brand: "Edelbrock", name: "Victor Jr. LS 215cc Heads (pair, bare)", partNumber: "61699", price: 1220, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-heads-mast255", brand: "Mast Motorsports", name: "255cc Black Label LS Heads (pair, assembled)", partNumber: "MMBL-255", price: 2100, retailer: "Mast Motorsports", tier: "race", notes: "~330 cfm. For 700+ hp builds." },
    ],
  },
];

const lsInduction: PartCategory[] = [
  {
    id: "intake",
    name: "Intake Manifold",
    group: "Induction",
    description: "Stock LS1 intake flows well for mild builds. Aftermarket high-rise intakes unlock top-end power with upgraded heads and cam.",
    required: false,
    parts: [
      { id: "ls-intake-stock", brand: "GM", name: "Stock LS1 Intake Manifold (reuse)", price: 0, retailer: "—", tier: "budget", notes: "Excellent intake for mild builds. 80mm throttle body opening." },
      { id: "ls-intake-fast", brand: "FAST", name: "LSXR 102mm Intake Manifold", partNumber: "146202B", price: 855, retailer: "Summit Racing", tier: "mid", notes: "Adds 30–50 hp over stock with matching heads." },
      { id: "ls-intake-holley", brand: "Holley", name: "Hi-Ram LS 105mm EFI Intake", partNumber: "300-133", price: 715, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-intake-wilson", brand: "Wilson Manifolds", name: "Fabricated LS 102mm Intake", partNumber: "WM-1026", price: 760, retailer: "Wilson Manifolds", tier: "premium" },
    ],
  },
  {
    id: "throttle-body",
    name: "Throttle Body",
    group: "Induction",
    description: "Stock LS1 78mm throttle body is a restriction above 450 hp. A larger unit pairs with an aftermarket intake.",
    required: false,
    parts: [
      { id: "ls-tb-stock", brand: "GM", name: "Stock LS1 78mm Throttle Body (reuse)", price: 0, retailer: "—", tier: "budget" },
      { id: "ls-tb-holley92", brand: "Holley", name: "92mm LS Throttle Body", partNumber: "112-580", price: 255, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-tb-nw102", brand: "Nick Williams", name: "102mm CNC Billet Throttle Body", partNumber: "NW1024", price: 555, retailer: "Nick Williams", tier: "premium", notes: "Best flow numbers available." },
    ],
  },
];

const lsOiling: PartCategory[] = [
  {
    id: "oil-pump",
    name: "Oil Pump",
    group: "Oiling System",
    description: "Always replace the oil pump on a rebuild. High-volume pumps flow more oil but do not raise pressure — they ensure the system doesn't starve at idle.",
    required: true,
    parts: [
      { id: "ls-op-melling", brand: "Melling", name: "High-Volume LS Oil Pump", partNumber: "M295", price: 88, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-op-moroso", brand: "Moroso", name: "High-Volume LS Oil Pump", partNumber: "22100", price: 125, retailer: "Summit Racing", tier: "premium" },
      { id: "ls-op-btr", brand: "BTR", name: "LS7 Replacement Gerotor Oil Pump", partNumber: "BTR-LS7-OP", price: 150, retailer: "Brian Tooley Racing", tier: "premium", notes: "Larger gerotor from LS7 — direct fit LS1 block." },
    ],
  },
  {
    id: "oil-pan",
    name: "Oil Pan",
    group: "Oiling System",
    description: "Stock LS oil pans are application-specific. For swaps you'll need an aftermarket pan matched to the chassis.",
    required: false,
    parts: [
      { id: "ls-pan-stock", brand: "GM", name: "Stock LS1 Oil Pan (reuse if OEM install)", price: 0, retailer: "—", tier: "budget" },
      { id: "ls-pan-holley", brand: "Holley", name: "Stock-Style Replacement LS Pan", partNumber: "302-3", price: 185, retailer: "Summit Racing", tier: "budget" },
      { id: "ls-pan-moroso", brand: "Moroso", name: "Street/Strip Baffled LS Pan", partNumber: "20140", price: 225, retailer: "Summit Racing", tier: "mid", notes: "Windage tray and kickout baffles included." },
    ],
  },
];

const lsGaskets: PartCategory[] = [
  {
    id: "head-gaskets",
    name: "Head Gaskets",
    group: "Gaskets & Seals",
    description: "MLS (multi-layer steel) gaskets are mandatory for performance builds. Match compressed thickness to your target compression ratio.",
    required: true,
    parts: [
      { id: "ls-hg-felprostock", brand: "Fel-Pro", name: "LS1 MLS Head Gaskets .040\" (pair)", partNumber: "26370PT", price: 95, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-hg-cometic40", brand: "Cometic", name: "LS1 MLS Head Gaskets .040\" (pair)", partNumber: "C5471-040-2", price: 165, retailer: "Summit Racing", tier: "premium", notes: "Choose thickness based on quench and compression target." },
      { id: "ls-hg-cometic36", brand: "Cometic", name: "LS1 MLS Head Gaskets .036\" (pair)", partNumber: "C5471-036-2", price: 165, retailer: "Summit Racing", tier: "premium" },
    ],
  },
  {
    id: "head-fasteners",
    name: "Head Bolts / Studs",
    group: "Gaskets & Seals",
    description: "OEM LS TTY head bolts should not be reused. ARP studs are the standard for any performance build — they clamp more evenly and can be reused.",
    required: true,
    parts: [
      { id: "ls-hb-oem", brand: "GM", name: "OEM LS TTY Head Bolts (set of 10, new)", partNumber: "11589417-10", price: 55, retailer: "GM Dealer", tier: "budget", notes: "Torque-to-yield — single use only." },
      { id: "ls-hb-arp-bolts", brand: "ARP", name: "LS1 Head Bolt Kit", partNumber: "134-3601", price: 122, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-hb-arp-studs", brand: "ARP", name: "LS1 Head Stud Kit", partNumber: "234-4317", price: 188, retailer: "Summit Racing", tier: "premium", notes: "Required if running power adder over 500 hp." },
    ],
  },
  {
    id: "gasket-kit",
    name: "Complete Gasket Kit",
    group: "Gaskets & Seals",
    description: "A complete set covers the full engine. Saves money vs. buying individual gaskets and ensures nothing is missed.",
    required: true,
    parts: [
      { id: "ls-gk-felpro", brand: "Fel-Pro", name: "LS1 Complete Engine Overhaul Gasket Set", partNumber: "HS26163PT1", price: 185, retailer: "Summit Racing", tier: "mid" },
      { id: "ls-gk-victor", brand: "Victor Reinz", name: "LS1 Master Engine Gasket Set", partNumber: "95-3626VR", price: 225, retailer: "Summit Racing", tier: "premium" },
    ],
  },
];

const lsMachineWork: PartCategory[] = [
  {
    id: "machine-work",
    name: "Machine Shop Work",
    group: "Machine Work",
    description: "Estimated costs for common machine operations. Prices vary by region and shop. Get quotes from at least two shops.",
    required: false,
    parts: [
      { id: "ls-mw-basic", brand: "Machine Shop", name: "Basic Package: Hot tank, Bore & hone, Deck block", price: 450, retailer: "Local machine shop", tier: "budget", notes: "Minimum for a proper rebuild." },
      { id: "ls-mw-full", brand: "Machine Shop", name: "Full Package: Tank, Bore, Deck, Cam bearings, Gallery plugs, Freeze plugs", price: 700, retailer: "Local machine shop", tier: "mid", notes: "Recommended for performance street builds." },
      { id: "ls-mw-blueprint", brand: "Machine Shop", name: "Blueprint Package: Full + balance assembly + blueprint all clearances", price: 1100, retailer: "Local machine shop", tier: "premium", notes: "For race or high-boost engines where every .0001\" matters." },
    ],
  },
];

export const LS1_PLATFORM: EnginePlatform = {
  id: "ls1",
  name: "GM LS1 5.7L",
  displacement: "5.7L (346 ci)",
  years: "1997–2004",
  description: "The original LS. Used in C5 Corvettes, F-body Camaros, and Firebirds. Aluminum block and heads with a cast iron crankshaft on 1997–98 models (steel from 1999+). The most popular engine swap platform in existence.",
  categories: [
    ...lsRotating,
    ...lsValvetrain,
    ...lsHeads,
    ...lsInduction,
    ...lsOiling,
    ...lsGaskets,
    ...lsMachineWork,
  ],
};

export const LS3_PLATFORM: EnginePlatform = {
  id: "ls3",
  name: "GM LS3 6.2L",
  displacement: "6.2L (376 ci)",
  years: "2008–2017",
  description: "The top naturally-aspirated small block in Gen IV. 430 hp stock with 6-bolt mains and excellent flowing rectangle-port heads. A more capable platform than LS1 in stock form.",
  categories: [
    {
      id: "crankshaft",
      name: "Crankshaft",
      group: "Rotating Assembly",
      description: "The LS3 ships with a forged steel crank — it is already superior to the LS1's cast iron unit and handles well over 600 hp.",
      required: false,
      parts: [
        { id: "ls3-crank-stock", brand: "GM", name: "Stock LS3 Forged Steel Crank (reuse)", price: 0, retailer: "—", tier: "budget", notes: "Good to 700+ hp. Always magnaflux inspect before reuse." },
        { id: "ls3-crank-eagle", brand: "Eagle", name: "4340 Forged LS3/LSx Crank 3.622\"", partNumber: "103523", price: 455, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-crank-callies", brand: "Callies", name: "CompStar 4340 LS3 Crankshaft", partNumber: "3CS62218B2", price: 690, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "rods",
      name: "Connecting Rods",
      group: "Rotating Assembly",
      description: "Stock LS3 powdered metal rods handle ~550 hp before they become the weak link in forced induction builds.",
      required: false,
      parts: [
        { id: "ls3-rods-stock", brand: "GM", name: "Stock LS3 PM Rods (reuse)", price: 0, retailer: "—", tier: "budget", notes: "Good to ~550 hp NA. Do not reuse for boost builds." },
        { id: "ls3-rods-eagle", brand: "Eagle", name: "4340 H-Beam LS3 Rods 6.125\" (set of 8)", partNumber: "CRS6125C3D", price: 395, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-rods-manley", brand: "Manley", name: "Turbo-Tuff I-Beam LS3 Rods 6.125\" (set of 8)", partNumber: "14436-8", price: 650, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "pistons",
      name: "Pistons",
      group: "Rotating Assembly",
      description: "LS3 bore is 4.065\". Stock compression is 10.7:1. Dropping to 9.0–9.5:1 allows pump gas with a hotter cam.",
      required: true,
      parts: [
        { id: "ls3-piston-mahle", brand: "Mahle", name: "PowerPak LS3 10.0:1 Flat Top (set of 8)", partNumber: "930214030", price: 445, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-piston-wiseco", brand: "Wiseco", name: "Forged LS3 9.5:1 Dish (set of 8)", partNumber: "K454X1", price: 600, retailer: "Summit Racing", tier: "premium" },
        { id: "ls3-piston-diamond", brand: "Diamond", name: "Forged LS3 10.5:1 Flat Top (set of 8)", partNumber: "11515-8", price: 780, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "rings", name: "Piston Rings", group: "Rotating Assembly",
      description: "LS3 bore 4.065\". Use matched ring set for your bore size.",
      required: true,
      parts: [
        { id: "ls3-rings-mahle", brand: "Mahle", name: "LS3 Standard Ring Set 4.065\" (set of 8)", partNumber: "40780", price: 82, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-rings-totalseal", brand: "Total Seal", name: "Gapless LS3 Ring Set 4.065\" (set of 8)", partNumber: "TSN1510-35", price: 128, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "main-bearings", name: "Main Bearings", group: "Rotating Assembly",
      description: "LS3 uses 6-bolt mains for superior crankshaft support.", required: true,
      parts: [
        { id: "ls3-mains-king", brand: "King", name: "HP Series LS3 Main Bearings", partNumber: "MB5280HP", price: 102, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-mains-clevite", brand: "Clevite 77", name: "H-Series LS3 Main Bearings", partNumber: "MS2201H", price: 118, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "rod-bearings", name: "Rod Bearings", group: "Rotating Assembly",
      description: "Always replace on a rebuild.", required: true,
      parts: [
        { id: "ls3-rodb-king", brand: "King", name: "HP Series LS3 Rod Bearings", partNumber: "CR821HP", price: 80, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-rodb-clevite", brand: "Clevite 77", name: "H-Series LS3 Rod Bearings", partNumber: "CB665H", price: 96, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    ...lsValvetrain,
    {
      id: "heads",
      name: "Cylinder Heads",
      group: "Cylinder Heads",
      description: "Stock LS3 rectangular-port heads flow ~310 cfm and are excellent. Aftermarket heads unlock power above 600 hp.",
      required: false,
      parts: [
        { id: "ls3-heads-stock", brand: "GM", name: "Stock LS3 Rectangle-Port Heads (pair, reconditioned)", price: 600, retailer: "Reman shop", tier: "budget", notes: "~310 cfm stock. Good to 550 hp." },
        { id: "ls3-heads-afr235", brand: "AFR", name: "235cc LS3 Mongoose Heads (pair, assembled)", partNumber: "1432", price: 1450, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-heads-tfs225", brand: "Trick Flow", name: "GenX 225 LS3 Heads (pair, assembled)", partNumber: "TFS-32410002-C01", price: 1250, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-heads-mast265", brand: "Mast Motorsports", name: "265cc Black Label LS3 Heads (pair)", partNumber: "MMBL-265", price: 2350, retailer: "Mast Motorsports", tier: "race" },
      ],
    },
    ...lsInduction,
    ...lsOiling,
    {
      id: "head-gaskets", name: "Head Gaskets", group: "Gaskets & Seals",
      description: "LS3 bore 4.065\". Use proper bore-size MLS gaskets.", required: true,
      parts: [
        { id: "ls3-hg-felpro", brand: "Fel-Pro", name: "LS3 MLS Head Gaskets .040\" (pair)", partNumber: "26371PT", price: 98, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-hg-cometic", brand: "Cometic", name: "LS3 MLS Head Gaskets .040\" (pair)", partNumber: "C5488-040-2", price: 168, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "head-fasteners", name: "Head Bolts / Studs", group: "Gaskets & Seals",
      description: "ARP studs are required for any boosted LS3 build.", required: true,
      parts: [
        { id: "ls3-hb-arp-bolts", brand: "ARP", name: "LS3 Head Bolt Kit", partNumber: "134-3603", price: 125, retailer: "Summit Racing", tier: "mid" },
        { id: "ls3-hb-arp-studs", brand: "ARP", name: "LS3 Head Stud Kit", partNumber: "234-4319", price: 192, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "gasket-kit", name: "Complete Gasket Kit", group: "Gaskets & Seals",
      description: "Complete overhaul set for LS3.", required: true,
      parts: [
        { id: "ls3-gk-felpro", brand: "Fel-Pro", name: "LS3 Complete Engine Overhaul Gasket Set", partNumber: "HS26165PT1", price: 192, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    ...lsMachineWork,
  ],
};

export const SBC350_PLATFORM: EnginePlatform = {
  id: "sbc350",
  name: "GM Small Block Chevy 350",
  displacement: "5.7L (350 ci)",
  years: "1967–2002",
  description: "The most produced V8 engine in history. Prolific aftermarket support at every price point. The 4-bolt main block (casting 10051182 and others) is preferred for performance builds.",
  categories: [
    {
      id: "crankshaft", name: "Crankshaft", group: "Rotating Assembly",
      description: "Stock SBC 350 cast cranks handle mild street builds. The 1969 forged Corvette crank (casting 3941184) is prized for performance. Aftermarket 4340 cranks for serious power.",
      required: false,
      parts: [
        { id: "sbc-crank-stock", brand: "GM", name: "Stock SBC 350 Cast Crank 3.480\" (reuse)", price: 0, retailer: "—", tier: "budget", notes: "Good to ~400 hp. Inspect journals for wear." },
        { id: "sbc-crank-eagle", brand: "Eagle", name: "4340 Forged SBC 350 Crank 3.480\"", partNumber: "10004003", price: 385, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-crank-scat", brand: "Scat", name: "4340 Forged SBC 3.480\" Crank", partNumber: "9-350-3480-5700", price: 420, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-crank-callies", brand: "Callies", name: "CompStar 4340 SBC Crankshaft 3.480\"", partNumber: "3CS34818A2", price: 580, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "rods", name: "Connecting Rods", group: "Rotating Assembly",
      description: "SBC 350 uses 5.700\" rods (stock). H-beam 4340 rods are mandatory for any serious power build.",
      required: false,
      parts: [
        { id: "sbc-rods-stock", brand: "GM", name: "Stock SBC PM Rods (reuse)", price: 0, retailer: "—", tier: "budget", notes: "Good to ~350 hp with new rod bolts." },
        { id: "sbc-rods-eagle", brand: "Eagle", name: "4340 H-Beam SBC Rods 5.700\" (set of 8)", partNumber: "CRS5700B3D", price: 335, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-rods-scat", brand: "Scat", name: "4340 H-Beam SBC Rods 5.700\" (set of 8)", partNumber: "2-350-5700-2100-8", price: 365, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-rods-manley", brand: "Manley", name: "Turbo-Tuff I-Beam SBC Rods 5.700\" (8)", partNumber: "14051-8", price: 580, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "pistons", name: "Pistons", group: "Rotating Assembly",
      description: "SBC 350 bore is 4.030\". Most builds run 4.030\" or 4.040\" oversize. Compression ratio depends on head combustion chamber volume.",
      required: true,
      parts: [
        { id: "sbc-piston-srp85", brand: "SRP", name: "Forged SBC 9.0:1 Flat Top 4.030\" (set of 8)", partNumber: "138086-030", price: 285, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-piston-wiseco85", brand: "Wiseco", name: "Forged SBC 8.5:1 Dish 4.030\" (set of 8)", partNumber: "K395X1", price: 435, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-piston-diamond95", brand: "Diamond", name: "Forged SBC 9.5:1 Flat Top 4.030\" (set of 8)", partNumber: "11005-8", price: 625, retailer: "Summit Racing", tier: "premium" },
        { id: "sbc-piston-jep", brand: "JE Pistons", name: "Forged SBC 10.0:1 Flat Top 4.030\" (set of 8)", partNumber: "182311", price: 780, retailer: "Summit Racing", tier: "race" },
      ],
    },
    {
      id: "rings", name: "Piston Rings", group: "Rotating Assembly",
      description: "Match ring set to bore size. Moly top rings are standard for performance.",
      required: true,
      parts: [
        { id: "sbc-rings-hastings", brand: "Hastings", name: "SBC 4.030\" Moly Ring Set (set of 8)", partNumber: "2M-120", price: 55, retailer: "Summit Racing", tier: "budget" },
        { id: "sbc-rings-mahle", brand: "Mahle", name: "SBC 4.030\" Ring Set (set of 8)", partNumber: "40524", price: 72, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-rings-totalseal", brand: "Total Seal", name: "Gapless SBC 4.030\" Ring Set (8)", partNumber: "A5990-35", price: 115, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "main-bearings", name: "Main Bearings", group: "Rotating Assembly", required: true,
      description: "SBC 350 uses 5 main journals. Replace all bearings on every rebuild.",
      parts: [
        { id: "sbc-mains-acl", brand: "ACL", name: "Race Series SBC Main Bearings", partNumber: "5M1663H-STD", price: 65, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-mains-clevite", brand: "Clevite 77", name: "H-Series SBC Main Bearings", partNumber: "MS909P", price: 88, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "rod-bearings", name: "Rod Bearings", group: "Rotating Assembly", required: true,
      description: "Replace with new bearings every time.",
      parts: [
        { id: "sbc-rodb-acl", brand: "ACL", name: "Race Series SBC Rod Bearings", partNumber: "8B663H-STD", price: 58, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-rodb-clevite", brand: "Clevite 77", name: "H-Series SBC Rod Bearings", partNumber: "CB663H", price: 75, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "camshaft", name: "Camshaft", group: "Valvetrain",
      description: "SBC flat tappet or hydraulic roller cam. Roller cams require a roller-compatible block (1987+ with roller lifter bosses) or a retrofit kit.",
      required: false,
      parts: [
        { id: "sbc-cam-comp270h", brand: "COMP Cams", name: "270H Hydraulic Flat Tappet (270/270 .480/.480 110)", partNumber: "12-600-4", price: 155, retailer: "Summit Racing", tier: "budget", notes: "Classic mild street cam. Good idle, excellent driveability." },
        { id: "sbc-cam-comp280h", brand: "COMP Cams", name: "280H Hydraulic Flat Tappet (280/280 .480/.480 110)", partNumber: "12-602-4", price: 165, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-cam-comp292h", brand: "COMP Cams", name: "High Energy 292H (292/292 .501/.501 110)", partNumber: "12-222-4", price: 185, retailer: "Summit Racing", tier: "mid", notes: "Big idle lope. Requires 3.08+ rear gear, 2500+ stall." },
        { id: "sbc-cam-comp-xtreme", brand: "COMP Cams", name: "Xtreme Energy HR 236/242 .553/.559 110+4", partNumber: "12-432-8", price: 285, retailer: "Summit Racing", tier: "premium", notes: "Hydraulic roller retrofit. Requires lifter retrofit kit." },
      ],
    },
    {
      id: "lifters", name: "Lifters", group: "Valvetrain",
      description: "Must match cam profile — flat tappet lifters for flat tappet cams, roller lifters for roller cams. ZDDP oil additive is mandatory for flat tappet break-in.",
      required: true,
      parts: [
        { id: "sbc-lifters-comp-ft", brand: "COMP Cams", name: "High Energy SBC Flat Tappet Lifters (set of 16)", partNumber: "818-16", price: 48, retailer: "Summit Racing", tier: "budget" },
        { id: "sbc-lifters-comp-hr", brand: "COMP Cams", name: "SBC Hydraulic Roller Lifters (retrofit, set of 16)", partNumber: "819-16", price: 375, retailer: "Summit Racing", tier: "premium", notes: "For roller cam retrofit builds." },
      ],
    },
    {
      id: "pushrods", name: "Pushrods", group: "Valvetrain",
      description: "SBC 350 stock pushrod length varies by block deck height. Verify with a pushrod length checker after mocking up.",
      required: false,
      parts: [
        { id: "sbc-pr-comp", brand: "COMP Cams", name: "SBC Pushrods 7.800\" 3/8\" (set of 16)", partNumber: "7830-16", price: 75, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-pr-trend", brand: "Trend Performance", name: "SBC 7.800\" 5/16\" Wall Pushrods (16)", partNumber: "T51280783-16", price: 110, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "rocker-arms", name: "Rocker Arms", group: "Valvetrain",
      description: "Stock SBC stamped rockers are fine for mild builds. Full-roller stud-mount rockers provide consistent geometry and reduce valvetrain heat.",
      required: false,
      parts: [
        { id: "sbc-rockers-stock", brand: "GM", name: "Stock Stamped Steel Rockers (reuse)", price: 0, retailer: "—", tier: "budget" },
        { id: "sbc-rockers-crane15", brand: "Crane Cams", name: "1.5 Ratio Roller Rockers SBC (set of 16)", partNumber: "11750-16", price: 285, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-rockers-comp15", brand: "COMP Cams", name: "Ultra Pro Magnum 1.5 SBC Rollers (16)", partNumber: "1418-16", price: 335, retailer: "Summit Racing", tier: "premium" },
        { id: "sbc-rockers-comp16", brand: "COMP Cams", name: "Ultra Pro Magnum 1.6 SBC Rollers (16)", partNumber: "1419-16", price: 355, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "valve-springs", name: "Valve Springs & Retainers", group: "Valvetrain",
      description: "Must match cam lift. Never run a cam above the spring's bind coil height. Include retainers and keepers when ordering spring kits.",
      required: false,
      parts: [
        { id: "sbc-springs-comp980", brand: "COMP Cams", name: "SBC Beehive Spring Kit .500\" max lift", partNumber: "26918-16", price: 145, retailer: "Summit Racing", tier: "budget" },
        { id: "sbc-springs-comp1015", brand: "COMP Cams", name: "SBC Spring Kit .550\" max lift", partNumber: "26921-16", price: 215, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-springs-pac", brand: "PAC Racing", name: "SBC Performance Spring Package .600\" lift", partNumber: "PAC-1206-16", price: 345, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "timing-chain", name: "Timing Chain Kit", group: "Valvetrain",
      description: "Always replace with a quality double-roller set. Worn OEM chains add degrees of slop affecting ignition and cam timing.",
      required: true,
      parts: [
        { id: "sbc-timing-cloyes", brand: "Cloyes", name: "SBC Double-Roller Timing Set", partNumber: "9-3100", price: 55, retailer: "Summit Racing", tier: "budget" },
        { id: "sbc-timing-comp", brand: "COMP Cams", name: "SBC High-Energy Timing Chain Set", partNumber: "2100", price: 78, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-timing-crane", brand: "Crane Cams", name: "SBC Billet Double-Roller Timing Set", partNumber: "80300", price: 95, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "heads", name: "Cylinder Heads", group: "Cylinder Heads",
      description: "The SBC head market is massive. Vortec iron heads are the best bang-for-buck upgrade from pre-Vortec castings. Aftermarket aluminum heads unlock serious power.",
      required: false,
      parts: [
        { id: "sbc-heads-vortec", brand: "GM", name: "Vortec Iron Heads 64cc (pair, reconditioned)", price: 380, retailer: "Reman shop", tier: "budget", notes: "Stock or reman. 64cc chamber, ~195 cfm. Excellent value." },
        { id: "sbc-heads-edel-perf", brand: "Edelbrock", name: "Performer SBC Aluminum Heads 170cc (pair)", partNumber: "5089", price: 785, retailer: "Summit Racing", tier: "mid", notes: "170cc intake. Good mid-range power." },
        { id: "sbc-heads-dart-iron", brand: "Dart", name: "Iron Eagle SBC Heads 200cc (pair, bare)", partNumber: "10024261", price: 895, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-heads-afr190", brand: "AFR", name: "190cc SBC Street/Strip Aluminum Heads (pair)", partNumber: "1035", price: 1350, retailer: "Summit Racing", tier: "premium", notes: "~255 cfm. Top street performer." },
        { id: "sbc-heads-dart-pro1", brand: "Dart", name: "Pro 1 200cc SBC Aluminum Heads (pair, bare)", partNumber: "10024264", price: 1100, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "intake", name: "Intake Manifold", group: "Induction",
      description: "Dual-plane intakes favor low/mid rpm. Single-plane high-rise intakes favor top-end power above 5500 rpm.",
      required: false,
      parts: [
        { id: "sbc-intake-edel-perf", brand: "Edelbrock", name: "Performer SBC Dual-Plane Intake (street)", partNumber: "2101", price: 215, retailer: "Summit Racing", tier: "budget", notes: "Best idle quality and low-end torque." },
        { id: "sbc-intake-edel-rpm", brand: "Edelbrock", name: "Performer RPM SBC Dual-Plane High-Rise", partNumber: "7101", price: 280, retailer: "Summit Racing", tier: "mid", notes: "Excellent all-around street/strip intake." },
        { id: "sbc-intake-holley-strip", brand: "Holley", name: "Strip Dominator SBC Single-Plane", partNumber: "300-36", price: 355, retailer: "Summit Racing", tier: "premium", notes: "Best power above 5500 rpm. Rough idle." },
        { id: "sbc-intake-weiand-team", brand: "Weiand", name: "Team G SBC Single-Plane", partNumber: "8150WND", price: 265, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    {
      id: "carburetor", name: "Carburetor", group: "Induction",
      description: "Match CFM to engine size and rpm range. 650 cfm is ideal for most 350 street builds; 750 cfm for 383+ stroked or race applications.",
      required: false,
      parts: [
        { id: "sbc-carb-edel750", brand: "Edelbrock", name: "Performer 750 CFM Carburetor", partNumber: "1407", price: 345, retailer: "Summit Racing", tier: "budget", notes: "Great driveability. Tunable jetting." },
        { id: "sbc-carb-holley650", brand: "Holley", name: "Street HP 650 CFM Carburetor", partNumber: "80541-1", price: 455, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-carb-holley750", brand: "Holley", name: "Street HP 750 CFM Carburetor", partNumber: "80508-1", price: 520, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-carb-holley750dp", brand: "Holley", name: "HP Double-Pumper 750 CFM", partNumber: "0-3310C", price: 645, retailer: "Summit Racing", tier: "premium", notes: "For race/strip use. Poor low-speed fuel control." },
      ],
    },
    {
      id: "oil-pump", name: "Oil Pump", group: "Oiling System", required: true,
      description: "Replace the oil pump on every rebuild. High-volume pumps are recommended for any performance build.",
      parts: [
        { id: "sbc-op-melling-hv", brand: "Melling", name: "High-Volume SBC Oil Pump", partNumber: "M55HV", price: 48, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-op-moroso", brand: "Moroso", name: "High-Volume SBC Oil Pump", partNumber: "22100", price: 82, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "head-gaskets", name: "Head Gaskets", group: "Gaskets & Seals", required: true,
      description: "SBC bore 4.030\". Compressed gasket thickness affects final compression ratio.",
      parts: [
        { id: "sbc-hg-felpro", brand: "Fel-Pro", name: "SBC Permatorque MLS Gaskets .041\" (pair)", partNumber: "1094", price: 58, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-hg-cometic", brand: "Cometic", name: "SBC MLS Head Gaskets .040\" (pair)", partNumber: "C5503-040-2", price: 145, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "head-fasteners", name: "Head Bolts / Studs", group: "Gaskets & Seals", required: true,
      description: "SBC head bolts must be replaced on every rebuild. ARP bolts and studs are the performance standard.",
      parts: [
        { id: "sbc-hf-arp-bolts", brand: "ARP", name: "SBC Head Bolt Kit", partNumber: "134-3601", price: 105, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-hf-arp-studs", brand: "ARP", name: "SBC Head Stud Kit", partNumber: "234-4317", price: 155, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "gasket-kit", name: "Complete Gasket Kit", group: "Gaskets & Seals", required: true,
      description: "Complete gasket set for the rebuild.",
      parts: [
        { id: "sbc-gk-felpro", brand: "Fel-Pro", name: "SBC 350 Complete Overhaul Gasket Set", partNumber: "HS7733PT1", price: 145, retailer: "Summit Racing", tier: "mid" },
        { id: "sbc-gk-victor", brand: "Victor Reinz", name: "SBC 350 Master Gasket Set", partNumber: "95-3580VR", price: 185, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    ...lsMachineWork,
  ],
};

export const FORD302_PLATFORM: EnginePlatform = {
  id: "ford302",
  name: "Ford 302 / 5.0L Windsor",
  displacement: "5.0L (302 ci)",
  years: "1968–1995",
  description: "Ford's small block in its original form. Used in Mustangs, F-150s, and countless other vehicles. The 5.0 HO from 1987–1995 has roller cams and better heads. Massive aftermarket from Windsor to Coyote.",
  categories: [
    {
      id: "crankshaft", name: "Crankshaft", group: "Rotating Assembly",
      description: "Factory 302 cranks are cast or forged (\"C\" code 1969 Boss 302 crank is prized). Aftermarket 4340 cranks for any serious build.",
      required: false,
      parts: [
        { id: "f302-crank-stock", brand: "Ford", name: "Stock 302 Cast Crank 3.000\" (reuse)", price: 0, retailer: "—", tier: "budget" },
        { id: "f302-crank-eagle", brand: "Eagle", name: "4340 Forged 302 Crank 3.000\"", partNumber: "10003003", price: 365, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-crank-scat", brand: "Scat", name: "4340 Forged 302 Crank 3.000\"", partNumber: "9-302-3000-5400", price: 395, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    {
      id: "rods", name: "Connecting Rods", group: "Rotating Assembly",
      description: "Ford 302 uses 5.090\" rods. Stock rods are adequate to ~350 hp.",
      required: false,
      parts: [
        { id: "f302-rods-stock", brand: "Ford", name: "Stock 302 Rods (reuse, new bolts)", price: 0, retailer: "—", tier: "budget" },
        { id: "f302-rods-eagle", brand: "Eagle", name: "4340 H-Beam Ford 302 Rods 5.090\" (set of 8)", partNumber: "CRS5090B3D", price: 360, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-rods-manley", brand: "Manley", name: "Turbo-Tuff I-Beam Ford 302 Rods 5.090\" (8)", partNumber: "14023-8", price: 545, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "pistons", name: "Pistons", group: "Rotating Assembly",
      description: "Ford 302 bore is 4.000\". Most builds run 4.000\" or 4.030\" over. Dish pistons help control compression with big-chamber heads.",
      required: true,
      parts: [
        { id: "f302-piston-srp", brand: "SRP", name: "Forged Ford 302 9.0:1 Flat Top 4.000\" (set of 8)", partNumber: "141068-030", price: 275, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-piston-wiseco", brand: "Wiseco", name: "Forged Ford 302 9.5:1 Flat Top 4.000\" (set of 8)", partNumber: "K561X1", price: 420, retailer: "Summit Racing", tier: "premium" },
        { id: "f302-piston-je", brand: "JE Pistons", name: "Forged Ford 302 10.5:1 Flat Top 4.030\" (8)", partNumber: "200051", price: 720, retailer: "Summit Racing", tier: "race" },
      ],
    },
    {
      id: "rings", name: "Piston Rings", group: "Rotating Assembly", required: true,
      description: "Match to bore size. Moly rings recommended for all performance builds.",
      parts: [
        { id: "f302-rings-hastings", brand: "Hastings", name: "Ford 302 4.000\" Moly Ring Set (8)", partNumber: "2M-305", price: 52, retailer: "Summit Racing", tier: "budget" },
        { id: "f302-rings-mahle", brand: "Mahle", name: "Ford 302 4.000\" Ring Set (8)", partNumber: "40489", price: 68, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-rings-totalseal", brand: "Total Seal", name: "Gapless Ford 302 4.000\" Ring Set (8)", partNumber: "A2110-35", price: 110, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "main-bearings", name: "Main Bearings", group: "Rotating Assembly", required: true,
      description: "Ford 302 uses 5 main journals. Always replace on a rebuild.",
      parts: [
        { id: "f302-mains-clevite", brand: "Clevite 77", name: "H-Series Ford 302 Main Bearings", partNumber: "MS590P", price: 78, retailer: "Summit Racing", tier: "premium" },
        { id: "f302-mains-acl", brand: "ACL", name: "Race Series Ford 302 Main Bearings", partNumber: "5M1039H-STD", price: 68, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    {
      id: "rod-bearings", name: "Rod Bearings", group: "Rotating Assembly", required: true,
      description: "Replace all rod bearings every rebuild.",
      parts: [
        { id: "f302-rodb-clevite", brand: "Clevite 77", name: "H-Series Ford 302 Rod Bearings", partNumber: "CB503HNK", price: 72, retailer: "Summit Racing", tier: "premium" },
        { id: "f302-rodb-acl", brand: "ACL", name: "Race Series Ford 302 Rod Bearings", partNumber: "8B1039H-STD", price: 62, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    {
      id: "camshaft", name: "Camshaft", group: "Valvetrain",
      description: "1987+ 5.0 HO blocks have provisions for hydraulic roller cams. Pre-1987 blocks can use flat tappet or roller retrofit kits.",
      required: false,
      parts: [
        { id: "f302-cam-comp270h", brand: "COMP Cams", name: "High Energy 270H Flat Tappet SBF (262/270 .477/.477 110)", partNumber: "35-490-8", price: 150, retailer: "Summit Racing", tier: "budget" },
        { id: "f302-cam-comp-xe270", brand: "COMP Cams", name: "Xtreme Energy 218/224 .555/.565 Roller SBF", partNumber: "35-422-8", price: 270, retailer: "Summit Racing", tier: "mid", notes: "1987+ roller cam block required." },
        { id: "f302-cam-comp-xe292", brand: "COMP Cams", name: "Xtreme Energy 224/232 .566/.573 Roller SBF", partNumber: "35-424-8", price: 285, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "heads", name: "Cylinder Heads", group: "Cylinder Heads",
      description: "The E7TE head on 1987–1995 5.0 is a major restriction. GT40 heads from Explorers and aftermarket aluminum heads dramatically improve power.",
      required: false,
      parts: [
        { id: "f302-heads-e7", brand: "Ford", name: "E7TE Stock Iron Heads (pair, reconditioned)", price: 300, retailer: "Reman shop", tier: "budget", notes: "~161 cfm. Minimum stock. Upgrade if possible." },
        { id: "f302-heads-gt40p", brand: "Ford", name: "GT40P Explorer Iron Heads (pair, used)", price: 200, retailer: "Junkyard / eBay", tier: "budget", notes: "~185 cfm. Clearance issues with 1.6 rockers. Best cheap upgrade." },
        { id: "f302-heads-edel-perf", brand: "Edelbrock", name: "Performer SBF 170cc Aluminum Heads (pair)", partNumber: "5029", price: 825, retailer: "Summit Racing", tier: "mid", notes: "~210 cfm. Easy bolt-on for most builds." },
        { id: "f302-heads-afr165", brand: "AFR", name: "165cc Renegade SBF Aluminum Heads (pair)", partNumber: "1380", price: 1225, retailer: "Summit Racing", tier: "premium", notes: "~240 cfm. Top street performer." },
        { id: "f302-heads-dart-sbf", brand: "Dart", name: "170cc SBF Aluminum Heads (pair, bare)", partNumber: "10310010", price: 865, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    {
      id: "intake", name: "Intake Manifold", group: "Induction",
      description: "Lower intake only on EFI cars (factory lower stays). Upper intake or full carb intake for carbureted builds.",
      required: false,
      parts: [
        { id: "f302-intake-edel-perf", brand: "Edelbrock", name: "Performer 5.0 Dual-Plane Carb Intake", partNumber: "2665", price: 235, retailer: "Summit Racing", tier: "budget" },
        { id: "f302-intake-edel-rpm", brand: "Edelbrock", name: "Performer RPM 5.0 High-Rise Intake", partNumber: "7165", price: 295, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-intake-holley-low", brand: "Holley", name: "Systemax EFI Lower Intake 5.0", partNumber: "300-539", price: 425, retailer: "Summit Racing", tier: "premium", notes: "Pairs with Holley upper. EFI only." },
      ],
    },
    {
      id: "oil-pump", name: "Oil Pump", group: "Oiling System", required: true,
      description: "Always replace the Ford 302 oil pump. Stock pumps are known to wear quickly.",
      parts: [
        { id: "f302-op-melling", brand: "Melling", name: "High-Volume Ford 302 Oil Pump", partNumber: "M68HV", price: 52, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-op-moroso", brand: "Moroso", name: "High-Volume Ford 302 Oil Pump", partNumber: "22110", price: 88, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "head-gaskets", name: "Head Gaskets", group: "Gaskets & Seals", required: true,
      description: "Ford 302 bore 4.000\". Always use fresh gaskets on a rebuild.",
      parts: [
        { id: "f302-hg-felpro", brand: "Fel-Pro", name: "Ford 302 MLS Head Gaskets .040\" (pair)", partNumber: "1011-2", price: 55, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-hg-cometic", brand: "Cometic", name: "Ford 302 MLS Head Gaskets .040\" (pair)", partNumber: "C5400-040-2", price: 138, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "head-fasteners", name: "Head Bolts / Studs", group: "Gaskets & Seals", required: true,
      description: "ARP fasteners for any performance build.",
      parts: [
        { id: "f302-hf-arp-bolts", brand: "ARP", name: "Ford 302 Head Bolt Kit", partNumber: "154-3601", price: 98, retailer: "Summit Racing", tier: "mid" },
        { id: "f302-hf-arp-studs", brand: "ARP", name: "Ford 302 Head Stud Kit", partNumber: "254-4317", price: 145, retailer: "Summit Racing", tier: "premium" },
      ],
    },
    {
      id: "gasket-kit", name: "Complete Gasket Kit", group: "Gaskets & Seals", required: true,
      description: "Complete overhaul gasket set for Ford 302.",
      parts: [
        { id: "f302-gk-felpro", brand: "Fel-Pro", name: "Ford 302 Complete Overhaul Gasket Set", partNumber: "HS9010PT1", price: 135, retailer: "Summit Racing", tier: "mid" },
      ],
    },
    ...lsMachineWork,
  ],
};

export const PLATFORMS: EnginePlatform[] = [
  LS1_PLATFORM,
  LS3_PLATFORM,
  SBC350_PLATFORM,
  FORD302_PLATFORM,
];

export const TIER_LABELS: Record<PartTier, string> = {
  budget: "Budget",
  mid: "Mid-Range",
  premium: "Premium",
  race: "Race",
};

export const TIER_COLORS: Record<PartTier, string> = {
  budget: "bg-gray-100 text-gray-600",
  mid: "bg-blue-50 text-blue-700",
  premium: "bg-amber-50 text-amber-700",
  race: "bg-red-50 text-red-700",
};
