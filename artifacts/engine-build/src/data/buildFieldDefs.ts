// ─── Build Wizard Field Definitions ──────────────────────────────────────────
// Organized into 3 tabs that match how engine builders think about a build:
//   Tab 1: Bottom End — block, machine work, rotating assembly
//   Tab 2: Top End   — heads, cam, valvetrain
//   Tab 3: Setup     — intake, fuel, build goals

export type FieldType = "number" | "text" | "select" | "textarea" | "boolean";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  suffix?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
};

export type SectionDef = {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
  calculatorLinks?: { label: string; href: string }[];
  helpChoose?: { label: string; href: string; description: string };
};

export type TabDef = {
  id: string;
  label: string;
  description: string;
  sections: SectionDef[];
};

// ─── Stock defaults per engine ───────────────────────────────────────────────

export const ENGINE_DEFAULTS: Record<string, Record<string, string>> = {
  sbc350: {
    "shortBlock.bore": "4.000",
    "shortBlock.stroke": "3.480",
    "shortBlock.deckHeight": "9.025",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "5.700",
    "rotatingAssembly.crankStroke": "3.480",
    "rotatingAssembly.rodLength": "5.700",
    "rotatingAssembly.compressionHeight": "1.560",
    "heads.intakeValveSize": "1.940",
    "heads.exhaustValveSize": "1.500",
    "heads.chamberVolume": "64",
    "valvetrain.rockerRatio": "1.5",
  },
  ls1: {
    "shortBlock.bore": "3.898",
    "shortBlock.stroke": "3.622",
    "shortBlock.deckHeight": "9.240",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.098",
    "rotatingAssembly.crankStroke": "3.622",
    "rotatingAssembly.rodLength": "6.098",
    "rotatingAssembly.compressionHeight": "1.304",
    "heads.intakeValveSize": "2.000",
    "heads.exhaustValveSize": "1.550",
    "heads.chamberVolume": "67",
    "valvetrain.rockerRatio": "1.7",
  },
  // Chevrolet
  chevrolet_ls1: {
    "shortBlock.bore": "3.898",
    "shortBlock.stroke": "3.622",
    "shortBlock.deckHeight": "9.240",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.098",
    "rotatingAssembly.crankStroke": "3.622",
    "rotatingAssembly.rodLength": "6.098",
    "rotatingAssembly.compressionHeight": "1.304",
    "heads.chamberVolume": "67",
    "valvetrain.rockerRatio": "1.7",
  },
  chevrolet_ls3: {
    "shortBlock.bore": "4.065",
    "shortBlock.stroke": "3.622",
    "shortBlock.deckHeight": "9.240",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.098",
    "rotatingAssembly.crankStroke": "3.622",
    "rotatingAssembly.rodLength": "6.098",
    "heads.chamberVolume": "68",
    "valvetrain.rockerRatio": "1.7",
  },
  bbc454: {
    "shortBlock.bore": "4.251",
    "shortBlock.stroke": "4.000",
    "shortBlock.deckHeight": "9.800",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.535",
    "rotatingAssembly.crankStroke": "4.000",
    "rotatingAssembly.rodLength": "6.535",
    "rotatingAssembly.compressionHeight": "1.645",
    "heads.chamberVolume": "118",
    "heads.intakeValveSize": "2.190",
    "heads.exhaustValveSize": "1.880",
    "valvetrain.rockerRatio": "1.7",
  },
  // Ford
  ford_302: {
    "shortBlock.bore": "4.000",
    "shortBlock.stroke": "3.000",
    "shortBlock.deckHeight": "8.206",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "5.090",
    "rotatingAssembly.crankStroke": "3.000",
    "rotatingAssembly.rodLength": "5.090",
    "heads.chamberVolume": "60",
    "valvetrain.rockerRatio": "1.6",
  },
  ford_351w: {
    "shortBlock.bore": "4.000",
    "shortBlock.stroke": "3.500",
    "shortBlock.deckHeight": "9.503",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "5.956",
    "rotatingAssembly.crankStroke": "3.500",
    "rotatingAssembly.rodLength": "5.956",
    "heads.chamberVolume": "64",
    "valvetrain.rockerRatio": "1.6",
  },
  ford_coyote_50: {
    "shortBlock.bore": "3.630",
    "shortBlock.stroke": "3.650",
    "shortBlock.deckHeight": "8.937",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "5.933",
    "rotatingAssembly.crankStroke": "3.650",
    "rotatingAssembly.rodLength": "5.933",
    "heads.chamberVolume": "51",
    "valvetrain.rockerRatio": "1.8",
  },
  ford_460: {
    "shortBlock.bore": "4.360",
    "shortBlock.stroke": "3.850",
    "shortBlock.deckHeight": "10.322",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.605",
    "rotatingAssembly.crankStroke": "3.850",
    "rotatingAssembly.rodLength": "6.605",
    "heads.chamberVolume": "75",
    "valvetrain.rockerRatio": "1.73",
  },
  // Dodge / Mopar
  mopar_318: {
    "shortBlock.bore": "3.910",
    "shortBlock.stroke": "3.310",
    "shortBlock.deckHeight": "9.600",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.123",
    "rotatingAssembly.crankStroke": "3.310",
    "rotatingAssembly.rodLength": "6.123",
    "heads.chamberVolume": "67",
    "valvetrain.rockerRatio": "1.5",
  },
  mopar_360: {
    "shortBlock.bore": "4.000",
    "shortBlock.stroke": "3.580",
    "shortBlock.deckHeight": "9.600",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.123",
    "rotatingAssembly.crankStroke": "3.580",
    "rotatingAssembly.rodLength": "6.123",
    "heads.chamberVolume": "67",
    "valvetrain.rockerRatio": "1.5",
  },
  mopar_440: {
    "shortBlock.bore": "4.320",
    "shortBlock.stroke": "3.750",
    "shortBlock.deckHeight": "10.725",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.768",
    "rotatingAssembly.crankStroke": "3.750",
    "rotatingAssembly.rodLength": "6.768",
    "heads.chamberVolume": "78",
    "valvetrain.rockerRatio": "1.5",
  },
  mopar_hemi_57: {
    "shortBlock.bore": "3.917",
    "shortBlock.stroke": "3.578",
    "shortBlock.deckHeight": "9.240",
    "shortBlock.cylinders": "8",
    "shortBlock.rodLength": "6.240",
    "rotatingAssembly.crankStroke": "3.578",
    "rotatingAssembly.rodLength": "6.240",
    "heads.chamberVolume": "84.7",
    "valvetrain.rockerRatio": "1.6",
  },
  // Custom engines start with blank fields — user fills everything in
  custom: {},
};

// ─── Tab 1: Bottom End ──────────────────────────────────────────────────────

const bottomEndSections: SectionDef[] = [
  {
    id: "shortBlock",
    title: "Block Specs",
    description: "Core block dimensions — these feed into displacement, rod ratio, and compression calculators",
    fields: [
      { key: "shortBlock.bore", label: "Bore", type: "number", suffix: "in", placeholder: "4.000", required: true, hint: "Stock bore diameter" },
      { key: "shortBlock.stroke", label: "Stroke", type: "number", suffix: "in", placeholder: "3.480", required: true },
      { key: "shortBlock.deckHeight", label: "Block Deck Height", type: "number", suffix: "in", placeholder: "9.025", required: true, hint: "Measured from crank centerline to deck surface" },
      { key: "shortBlock.cylinders", label: "Cylinders", type: "number", placeholder: "8", required: true },
      { key: "shortBlock.rodLength", label: "Rod Length", type: "number", suffix: "in", placeholder: "5.700" },
    ],
    calculatorLinks: [
      { label: "Displacement", href: "/calculators/displacement" },
      { label: "Rod Ratio", href: "/calculators/rod-ratio" },
    ],
  },
  {
    id: "machineWork",
    title: "Machine Shop Work",
    description: "What was done to the block — overbore, deck cut, align hone",
    fields: [
      { key: "machineWork.overboreAmount", label: "Overbore Amount", type: "number", suffix: "in", placeholder: "0.030", hint: "How much the bore was enlarged" },
      { key: "machineWork.finalBore", label: "Final Bore Size", type: "number", suffix: "in", placeholder: "4.030", hint: "Auto-calculated if overbore is set" },
      { key: "machineWork.deckCutAmount", label: "Deck Cut Amount", type: "number", suffix: "in", placeholder: "0.005" },
      { key: "machineWork.finalDeckHeight", label: "Final Deck Height", type: "number", suffix: "in", placeholder: "9.020", hint: "Auto-calculated if deck cut is set" },
      { key: "machineWork.alignHone", label: "Align Hone", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]},
      { key: "machineWork.notes", label: "Machine Shop Notes", type: "textarea", placeholder: "Boring, honing crosshatch angle, valve job specs, etc." },
    ],
    calculatorLinks: [
      { label: "Ring Gap", href: "/calculators/ring-gap" },
      { label: "Quench / Deck Height", href: "/calculators/quench-deck-height" },
    ],
  },
  {
    id: "rotatingAssembly",
    title: "Rotating Assembly",
    description: "Crank, rods, pistons, and rings",
    fields: [
      { key: "rotatingAssembly.crankType", label: "Crank Type", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "cast", label: "Cast" },
        { value: "forged", label: "Forged" },
        { value: "billet", label: "Billet" },
      ]},
      { key: "rotatingAssembly.crankStroke", label: "Crank Stroke", type: "number", suffix: "in", placeholder: "3.480" },
      { key: "rotatingAssembly.rodType", label: "Rod Type", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "stock", label: "Stock / Reconditioned" },
        { value: "aftermarket-steel", label: "Aftermarket Steel (I-beam/H-beam)" },
        { value: "aluminum", label: "Aluminum" },
        { value: "titanium", label: "Titanium" },
      ]},
      { key: "rotatingAssembly.rodLength", label: "Rod Length", type: "number", suffix: "in", placeholder: "5.700" },
      { key: "rotatingAssembly.pistonType", label: "Piston Type", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "flat-top", label: "Flat Top" },
        { value: "dish", label: "Dish" },
        { value: "dome", label: "Dome" },
      ]},
      { key: "rotatingAssembly.pistonVolume", label: "Piston Volume", type: "number", suffix: "cc", placeholder: "-6.0", hint: "Negative for dish, positive for dome" },
      { key: "rotatingAssembly.compressionHeight", label: "Compression Height", type: "number", suffix: "in", placeholder: "1.560" },
      { key: "rotatingAssembly.ringSet", label: "Ring Set (brand/part#)", type: "text", placeholder: "Total Seal M9190-30" },
    ],
    calculatorLinks: [
      { label: "Piston Speed", href: "/calculators/piston-speed" },
      { label: "Rod Ratio", href: "/calculators/rod-ratio" },
      { label: "Ring Gap", href: "/calculators/ring-gap" },
    ],
  },
];

// ─── Tab 2: Top End ─────────────────────────────────────────────────────────

const topEndSections: SectionDef[] = [
  {
    id: "heads",
    title: "Cylinder Heads",
    description: "Head specs, chamber volume, valves, and flow data",
    fields: [
      { key: "heads.brand", label: "Head Brand / Model", type: "text", placeholder: "Vortec 906, AFR 195, Trick Flow 225, etc." },
      { key: "heads.material", label: "Material", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "iron", label: "Cast Iron" },
        { value: "aluminum", label: "Aluminum" },
      ]},
      { key: "heads.chamberVolume", label: "Chamber Volume", type: "number", suffix: "cc", placeholder: "64", required: true, hint: "CC'd chamber volume — critical for compression ratio" },
      { key: "heads.intakeRunnerVolume", label: "Intake Runner Volume", type: "number", suffix: "cc", placeholder: "170" },
      { key: "heads.exhaustRunnerVolume", label: "Exhaust Runner Volume", type: "number", suffix: "cc", placeholder: "70" },
      { key: "heads.intakeValveSize", label: "Intake Valve Size", type: "number", suffix: "in", placeholder: "1.940" },
      { key: "heads.exhaustValveSize", label: "Exhaust Valve Size", type: "number", suffix: "in", placeholder: "1.500" },
      { key: "heads.portFlowCFM", label: "Port Flow (@ .500\" lift)", type: "number", suffix: "CFM", placeholder: "230" },
    ],
    calculatorLinks: [
      { label: "Compression Ratio", href: "/calculators/compression-ratio" },
      { label: "Piston-to-Valve", href: "/calculators/piston-to-valve" },
    ],
  },
  {
    id: "cam",
    title: "Camshaft",
    description: "Cam specs — or let us help you pick one",
    fields: [
      { key: "cam.type", label: "Cam Type", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "hydraulic_flat", label: "Hydraulic Flat Tappet" },
        { value: "hydraulic_roller", label: "Hydraulic Roller" },
        { value: "solid_flat", label: "Solid Flat Tappet" },
        { value: "solid_roller", label: "Solid Roller" },
      ]},
      { key: "cam.durationInt", label: "Duration Intake (@ .050)", type: "number", suffix: "\u00B0", placeholder: "224" },
      { key: "cam.durationExh", label: "Duration Exhaust (@ .050)", type: "number", suffix: "\u00B0", placeholder: "230" },
      { key: "cam.lsa", label: "Lobe Separation Angle", type: "number", suffix: "\u00B0", placeholder: "112" },
      { key: "cam.liftInt", label: "Lift Intake (at lobe)", type: "number", suffix: "in", placeholder: "0.525" },
      { key: "cam.liftExh", label: "Lift Exhaust (at lobe)", type: "number", suffix: "in", placeholder: "0.525" },
      { key: "cam.advance", label: "Installed Advance", type: "number", suffix: "\u00B0", placeholder: "4" },
      { key: "cam.brand", label: "Cam Brand", type: "text", placeholder: "COMP Cams, Lunati, etc." },
      { key: "cam.partNumber", label: "Cam Part Number", type: "text", placeholder: "CL12-600-4" },
    ],
    helpChoose: {
      label: "Help Me Choose a Cam",
      href: "/cam-guide",
      description: "Our cam guide will recommend duration, LSA, and lift ranges based on your build goals.",
    },
    calculatorLinks: [
      { label: "Cam Duration", href: "/calculators/cam-duration" },
      { label: "Cam Degreeing", href: "/calculators/cam-degreeing" },
      { label: "Dynamic CR", href: "/calculators/compression-ratio" },
    ],
  },
  {
    id: "valvetrain",
    title: "Valvetrain",
    description: "Rockers, pushrods, and valve springs",
    fields: [
      { key: "valvetrain.rockerRatio", label: "Rocker Ratio", type: "number", placeholder: "1.5" },
      { key: "valvetrain.rockerType", label: "Rocker Type", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "stamped", label: "Stamped Steel" },
        { value: "roller-tip", label: "Roller Tip" },
        { value: "full-roller", label: "Full Roller" },
      ]},
      { key: "valvetrain.pushrodLength", label: "Pushrod Length", type: "number", suffix: "in", placeholder: "7.800" },
      { key: "valvetrain.springSeatPressure", label: "Valve Spring Seat Pressure", type: "number", suffix: "lbs", placeholder: "130" },
      { key: "valvetrain.springOpenPressure", label: "Valve Spring Open Pressure", type: "number", suffix: "lbs", placeholder: "330" },
    ],
    helpChoose: {
      label: "Help Me Size My Valve Springs",
      href: "/calculators/valve-spring",
      description: "Enter your cam type, max RPM, and lift to get minimum seat and open pressure requirements — then validate your spring specs against them.",
    },
    calculatorLinks: [
      { label: "Pushrod Length", href: "/calculators/pushrod-length" },
      { label: "RPM-Based Spring Requirements", href: "/cam-guide" },
    ],
  },
];

// ─── Tab 3: Setup ───────────────────────────────────────────────────────────

const setupSections: SectionDef[] = [
  {
    id: "intake",
    title: "Intake & Fuel",
    description: "Intake manifold, carburetor/throttle body, and fuel system",
    fields: [
      { key: "intake.fuelDelivery", label: "Fuel Delivery", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "carb", label: "Carburetor" },
        { value: "efi", label: "Electronic Fuel Injection (EFI)" },
      ]},
      { key: "intake.manifoldType", label: "Intake Manifold", type: "text", placeholder: "Edelbrock Performer RPM, etc." },
      { key: "intake.carbSize", label: "Carb / Throttle Body Size", type: "number", suffix: "CFM", placeholder: "750" },
      { key: "intake.fuelType", label: "Fuel Type", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "pump-87", label: "Pump 87 Octane" },
        { value: "pump-91", label: "Pump 91 Octane" },
        { value: "pump-93", label: "Pump 93 Octane" },
        { value: "e85", label: "E85" },
        { value: "race", label: "Race Gas (100+)" },
      ]},
      { key: "intake.injectorSize", label: "Injector Size (EFI only)", type: "number", suffix: "cc", placeholder: "36" },
    ],
    calculatorLinks: [
      { label: "Carb CFM Sizing", href: "/calculators/carb-cfm-sizing" },
      { label: "Fuel Injector Sizing", href: "/calculators/fuel-injector-sizing" },
      { label: "AFR / Lambda", href: "/calculators/afr-lambda" },
    ],
  },
  {
    id: "meta",
    title: "Build Goals & Notes",
    description: "What are you building this engine for?",
    fields: [
      { key: "meta.targetHP", label: "Target Horsepower", type: "number", suffix: "HP", placeholder: "400" },
      { key: "meta.targetRPM", label: "Target Peak RPM", type: "number", suffix: "RPM", placeholder: "6000" },
      { key: "meta.intendedUse", label: "Intended Use", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "daily", label: "Daily Driver" },
        { value: "weekend", label: "Weekend / Street-Strip" },
        { value: "drag", label: "Drag Racing" },
        { value: "road-race", label: "Road Race / Autocross" },
        { value: "marine", label: "Marine" },
        { value: "off-road", label: "Off-Road / Mud" },
      ]},
      { key: "meta.aspiration", label: "Aspiration", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "na", label: "Naturally Aspirated" },
        { value: "turbo", label: "Turbocharged" },
        { value: "supercharged", label: "Supercharged" },
        { value: "nitrous", label: "Nitrous" },
      ]},
      { key: "meta.notes", label: "Build Notes", type: "textarea", placeholder: "Anything else about this build — vehicle, goals, budget, timeline..." },
    ],
    calculatorLinks: [
      { label: "HP / Torque", href: "/calculators/hp-torque" },
    ],
  },
];

// ─── Exported tab definitions ───────────────────────────────────────────────

export const BUILD_TABS: TabDef[] = [
  {
    id: "bottom-end",
    label: "Bottom End",
    description: "Block, machine work, and rotating assembly",
    sections: bottomEndSections,
  },
  {
    id: "top-end",
    label: "Top End",
    description: "Cylinder heads, camshaft, and valvetrain",
    sections: topEndSections,
  },
  {
    id: "setup",
    label: "Setup & Goals",
    description: "Intake, fuel, and build targets",
    sections: setupSections,
  },
  {
    id: "build-sheet",
    label: "Build Sheet",
    description: "Your complete build reference — all specs and calculated values in one place",
    sections: [], // rendered specially in the wizard
  },
];

// ─── Build Sheet layout definition ──────────────────────────────────────────
// Groups of field keys to display on the build sheet, organized for quick reference

export type BuildSheetGroup = {
  title: string;
  rows: { label: string; key: string; suffix?: string; computed?: boolean }[];
};

export const BUILD_SHEET_GROUPS: BuildSheetGroup[] = [
  {
    title: "Block & Short Block",
    rows: [
      { label: "Bore", key: "shortBlock.bore", suffix: "\"" },
      { label: "Stroke", key: "shortBlock.stroke", suffix: "\"" },
      { label: "Deck Height (stock)", key: "shortBlock.deckHeight", suffix: "\"" },
      { label: "Cylinders", key: "shortBlock.cylinders" },
      { label: "Rod Length", key: "shortBlock.rodLength", suffix: "\"" },
    ],
  },
  {
    title: "Machine Work",
    rows: [
      { label: "Overbore", key: "machineWork.overboreAmount", suffix: "\"" },
      { label: "Final Bore", key: "machineWork.finalBore", suffix: "\"" },
      { label: "Deck Cut", key: "machineWork.deckCutAmount", suffix: "\"" },
      { label: "Final Deck Height", key: "machineWork.finalDeckHeight", suffix: "\"" },
      { label: "Align Hone", key: "machineWork.alignHone" },
      { label: "Notes", key: "machineWork.notes" },
    ],
  },
  {
    title: "Rotating Assembly",
    rows: [
      { label: "Crank Type", key: "rotatingAssembly.crankType" },
      { label: "Crank Stroke", key: "rotatingAssembly.crankStroke", suffix: "\"" },
      { label: "Rod Type", key: "rotatingAssembly.rodType" },
      { label: "Rod Length", key: "rotatingAssembly.rodLength", suffix: "\"" },
      { label: "Piston Type", key: "rotatingAssembly.pistonType" },
      { label: "Piston Volume", key: "rotatingAssembly.pistonVolume", suffix: " cc" },
      { label: "Compression Height", key: "rotatingAssembly.compressionHeight", suffix: "\"" },
      { label: "Ring Set", key: "rotatingAssembly.ringSet" },
    ],
  },
  {
    title: "Cylinder Heads",
    rows: [
      { label: "Brand / Model", key: "heads.brand" },
      { label: "Material", key: "heads.material" },
      { label: "Chamber Volume", key: "heads.chamberVolume", suffix: " cc" },
      { label: "Intake Runner", key: "heads.intakeRunnerVolume", suffix: " cc" },
      { label: "Exhaust Runner", key: "heads.exhaustRunnerVolume", suffix: " cc" },
      { label: "Intake Valve", key: "heads.intakeValveSize", suffix: "\"" },
      { label: "Exhaust Valve", key: "heads.exhaustValveSize", suffix: "\"" },
      { label: "Port Flow", key: "heads.portFlowCFM", suffix: " CFM" },
    ],
  },
  {
    title: "Camshaft",
    rows: [
      { label: "Cam Type", key: "cam.type" },
      { label: "Duration Intake", key: "cam.durationInt", suffix: "\u00B0 @ .050" },
      { label: "Duration Exhaust", key: "cam.durationExh", suffix: "\u00B0 @ .050" },
      { label: "LSA", key: "cam.lsa", suffix: "\u00B0" },
      { label: "Lift Intake", key: "cam.liftInt", suffix: "\"" },
      { label: "Lift Exhaust", key: "cam.liftExh", suffix: "\"" },
      { label: "Advance", key: "cam.advance", suffix: "\u00B0" },
      { label: "Brand", key: "cam.brand" },
      { label: "Part #", key: "cam.partNumber" },
    ],
  },
  {
    title: "Valvetrain",
    rows: [
      { label: "Rocker Ratio", key: "valvetrain.rockerRatio" },
      { label: "Rocker Type", key: "valvetrain.rockerType" },
      { label: "Pushrod Length", key: "valvetrain.pushrodLength", suffix: "\"" },
      { label: "Spring Seat Pressure", key: "valvetrain.springSeatPressure", suffix: " lbs" },
      { label: "Spring Open Pressure", key: "valvetrain.springOpenPressure", suffix: " lbs" },
    ],
  },
  {
    title: "Intake & Fuel",
    rows: [
      { label: "Intake Manifold", key: "intake.manifoldType" },
      { label: "Carb / TB Size", key: "intake.carbSize", suffix: " CFM" },
      { label: "Fuel Type", key: "intake.fuelType" },
      { label: "Injector Size", key: "intake.injectorSize", suffix: " cc" },
    ],
  },
  {
    title: "Calculated Values",
    rows: [
      { label: "Displacement", key: "computed.displacement", suffix: " ci", computed: true },
      { label: "Static CR", key: "computed.staticCR", suffix: ":1", computed: true },
      { label: "Dynamic CR", key: "computed.dynamicCR", suffix: ":1", computed: true },
      { label: "Rod Ratio", key: "computed.rodRatio", computed: true },
      { label: "Quench Distance", key: "computed.quenchDistance", suffix: "\"", computed: true },
      { label: "Top Ring Gap", key: "computed.ringGapTop", suffix: "\"", computed: true },
      { label: "Second Ring Gap", key: "computed.ringGapSecond", suffix: "\"", computed: true },
      { label: "Mean Piston Speed", key: "computed.pistonSpeedMean", suffix: " FPM", computed: true },
      { label: "Pushrod Length (calc)", key: "computed.pushrodLength", suffix: "\"", computed: true },
    ],
  },
  {
    title: "Build Goals",
    rows: [
      { label: "Target HP", key: "meta.targetHP", suffix: " HP" },
      { label: "Target RPM", key: "meta.targetRPM", suffix: " RPM" },
      { label: "Intended Use", key: "meta.intendedUse" },
      { label: "Aspiration", key: "meta.aspiration" },
      { label: "Notes", key: "meta.notes" },
    ],
  },
];

// Flat list of all sections (for progress tracking)
export const BUILD_SECTIONS: SectionDef[] = BUILD_TABS.flatMap((t) => t.sections);

/**
 * Returns the required field keys for a section.
 */
export function getSectionRequiredKeys(sectionId: string): string[] {
  const section = BUILD_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return [];
  return section.fields.filter((f) => f.required).map((f) => f.key);
}

/**
 * Check if a section is "complete" — all required fields have non-empty values.
 */
export function isSectionComplete(
  sectionId: string,
  fields: Record<string, string>,
): boolean {
  const requiredKeys = getSectionRequiredKeys(sectionId);
  if (requiredKeys.length === 0) {
    const section = BUILD_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return false;
    return section.fields.some((f) => fields[f.key] && fields[f.key].trim() !== "");
  }
  return requiredKeys.every((key) => fields[key] && fields[key].trim() !== "");
}

/**
 * Get completion stats for a tab.
 */
export function getTabCompletion(tabId: string, fields: Record<string, string>): { completed: number; total: number } {
  const tab = BUILD_TABS.find((t) => t.id === tabId);
  if (!tab) return { completed: 0, total: 0 };
  const total = tab.sections.length;
  const completed = tab.sections.filter((s) => isSectionComplete(s.id, fields)).length;
  return { completed, total };
}
