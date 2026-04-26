// ─── Build Wizard Field Definitions ──────────────────────────────────────────
// Defines every field in the build wizard: its key, label, input type,
// options for selects, and stock defaults per engine.

export type FieldType = "number" | "text" | "select" | "textarea" | "boolean";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  suffix?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type SectionDef = {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  fields: FieldDef[];
  calculatorLinks?: { label: string; href: string }[];
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
};

// ─── Section definitions ─────────────────────────────────────────────────────

export const BUILD_SECTIONS: SectionDef[] = [
  {
    id: "shortBlock",
    title: "Short Block",
    description: "Core block dimensions — these feed most other calculators",
    icon: "Box",
    fields: [
      { key: "shortBlock.bore", label: "Bore", type: "number", suffix: "in", placeholder: "4.000", required: true },
      { key: "shortBlock.stroke", label: "Stroke", type: "number", suffix: "in", placeholder: "3.480", required: true },
      { key: "shortBlock.deckHeight", label: "Deck Height", type: "number", suffix: "in", placeholder: "9.025", required: true },
      { key: "shortBlock.cylinders", label: "Cylinders", type: "number", placeholder: "8", required: true },
      { key: "shortBlock.rodLength", label: "Rod Length", type: "number", suffix: "in", placeholder: "5.700" },
    ],
    calculatorLinks: [
      { label: "Displacement Calculator", href: "/calculators/displacement" },
      { label: "Rod Ratio Calculator", href: "/calculators/rod-ratio" },
    ],
  },
  {
    id: "machineWork",
    title: "Machine Shop Work",
    description: "What was done to the block at the machine shop",
    icon: "Factory",
    fields: [
      { key: "machineWork.overboreAmount", label: "Overbore Amount", type: "number", suffix: "in", placeholder: "0.030" },
      { key: "machineWork.finalBore", label: "Final Bore Size", type: "number", suffix: "in", placeholder: "4.030" },
      { key: "machineWork.deckCutAmount", label: "Deck Cut Amount", type: "number", suffix: "in", placeholder: "0.005" },
      { key: "machineWork.finalDeckHeight", label: "Final Deck Height", type: "number", suffix: "in", placeholder: "9.020" },
      { key: "machineWork.alignHone", label: "Align Hone", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]},
      { key: "machineWork.notes", label: "Machine Shop Notes", type: "textarea", placeholder: "Boring, honing crosshatch, valve job, etc." },
    ],
    calculatorLinks: [
      { label: "Ring Gap Calculator", href: "/calculators/ring-gap-advanced" },
      { label: "Quench / Deck Height", href: "/calculators/quench-deck-height" },
    ],
  },
  {
    id: "rotatingAssembly",
    title: "Rotating Assembly",
    description: "Crank, rods, pistons, and rings",
    icon: "RotateCw",
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
      { key: "rotatingAssembly.pistonVolume", label: "Piston Volume", type: "number", suffix: "cc", placeholder: "-6.0" },
      { key: "rotatingAssembly.compressionHeight", label: "Compression Height", type: "number", suffix: "in", placeholder: "1.560" },
      { key: "rotatingAssembly.ringSet", label: "Ring Set (brand/part#)", type: "text", placeholder: "Total Seal M9190-30" },
    ],
    calculatorLinks: [
      { label: "Piston Speed Calculator", href: "/calculators/piston-speed" },
      { label: "Rod Ratio Calculator", href: "/calculators/rod-ratio" },
      { label: "Ring Gap Calculator", href: "/calculators/ring-gap-advanced" },
    ],
  },
  {
    id: "cam",
    title: "Camshaft",
    description: "Cam specs — or use 'Help me choose' if you haven't picked one yet",
    icon: "Gauge",
    fields: [
      { key: "cam.type", label: "Cam Type", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "hydraulic_flat", label: "Hydraulic Flat Tappet" },
        { value: "hydraulic_roller", label: "Hydraulic Roller" },
        { value: "solid_flat", label: "Solid Flat Tappet" },
        { value: "solid_roller", label: "Solid Roller" },
      ]},
      { key: "cam.durationInt", label: "Duration Intake (@ .050)", type: "number", suffix: "°", placeholder: "224" },
      { key: "cam.durationExh", label: "Duration Exhaust (@ .050)", type: "number", suffix: "°", placeholder: "230" },
      { key: "cam.lsa", label: "Lobe Separation Angle", type: "number", suffix: "°", placeholder: "112" },
      { key: "cam.liftInt", label: "Lift Intake (at lobe)", type: "number", suffix: "in", placeholder: "0.525" },
      { key: "cam.liftExh", label: "Lift Exhaust (at lobe)", type: "number", suffix: "in", placeholder: "0.525" },
      { key: "cam.advance", label: "Installed Advance", type: "number", suffix: "°", placeholder: "4" },
      { key: "cam.brand", label: "Cam Brand", type: "text", placeholder: "COMP Cams, Lunati, etc." },
      { key: "cam.partNumber", label: "Cam Part Number", type: "text", placeholder: "CL12-600-4" },
    ],
    calculatorLinks: [
      { label: "Cam Duration Calculator", href: "/calculators/cam-duration" },
      { label: "Cam Degreeing Calculator", href: "/calculators/cam-degreeing" },
      { label: "Dynamic CR Calculator", href: "/calculators/compression-ratio" },
    ],
  },
  {
    id: "heads",
    title: "Cylinder Heads",
    description: "Head specs, chamber volume, valves, and flow data",
    icon: "Layers",
    fields: [
      { key: "heads.brand", label: "Head Brand / Model", type: "text", placeholder: "Vortec 906, AFR 195, etc." },
      { key: "heads.material", label: "Material", type: "select", options: [
        { value: "", label: "Select..." },
        { value: "iron", label: "Cast Iron" },
        { value: "aluminum", label: "Aluminum" },
      ]},
      { key: "heads.chamberVolume", label: "Chamber Volume", type: "number", suffix: "cc", placeholder: "64", required: true },
      { key: "heads.intakeRunnerVolume", label: "Intake Runner Volume", type: "number", suffix: "cc", placeholder: "170" },
      { key: "heads.exhaustRunnerVolume", label: "Exhaust Runner Volume", type: "number", suffix: "cc", placeholder: "70" },
      { key: "heads.intakeValveSize", label: "Intake Valve Size", type: "number", suffix: "in", placeholder: "1.940" },
      { key: "heads.exhaustValveSize", label: "Exhaust Valve Size", type: "number", suffix: "in", placeholder: "1.500" },
      { key: "heads.portFlowCFM", label: "Port Flow (@ .500\" lift)", type: "number", suffix: "CFM", placeholder: "230" },
    ],
    calculatorLinks: [
      { label: "Compression Ratio Calculator", href: "/calculators/compression-ratio" },
      { label: "Piston-to-Valve Calculator", href: "/calculators/piston-to-valve" },
    ],
  },
  {
    id: "valvetrain",
    title: "Valvetrain",
    description: "Rockers, pushrods, and valve springs",
    icon: "ArrowUpDown",
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
    calculatorLinks: [
      { label: "Pushrod Length Calculator", href: "/calculators/pushrod-length" },
      { label: "Valve Spring Calculator", href: "/calculators/valve-spring" },
    ],
  },
  {
    id: "intake",
    title: "Intake & Fuel",
    description: "Intake manifold, carburetor/throttle body, and fuel system",
    icon: "Wind",
    fields: [
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
      { label: "AFR / Lambda Calculator", href: "/calculators/afr-lambda" },
    ],
  },
  {
    id: "meta",
    title: "Build Goals & Notes",
    description: "What are you building this engine for?",
    icon: "Target",
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
      { label: "HP / Torque Calculator", href: "/calculators/hp-torque" },
    ],
  },
];

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
    // Sections with no required fields are "complete" if any field has a value
    const section = BUILD_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return false;
    return section.fields.some((f) => fields[f.key] && fields[f.key].trim() !== "");
  }
  return requiredKeys.every((key) => fields[key] && fields[key].trim() !== "");
}
