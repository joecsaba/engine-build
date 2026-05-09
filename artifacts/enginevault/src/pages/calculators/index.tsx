import { Link } from "wouter";
import {
  Cylinder, Gauge, Circle, Settings2, ArrowDownUp,
  Zap, Timer, Flame, Ruler, MoveVertical,
  RotateCcw, ShieldAlert, Codesandbox, Wrench, ArrowRightLeft, Wind, Target, Droplet, Activity, Cog, Thermometer, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdBanner } from "@/components/ads/AdBanner";

const calculators: { title: string; href: string; desc: string; tags: string[]; icon: LucideIcon }[] = [
  {
    title: "Engine Displacement",
    href: "/calculators/displacement",
    desc: "Calculate displacement in cubic inches, liters, and CC. Includes piston speed and engine match lookup.",
    tags: ["Bore", "Stroke", "Cylinders"],
    icon: Cylinder,
  },
  {
    title: "Compression Ratio",
    href: "/calculators/compression-ratio",
    desc: "Static CR from your parts + dynamic CR from your cam + octane recommendation — all in one tool. Three IVC input methods, cranking pressure, reverse-solve mode, and cam advance slider.",
    tags: ["Static CR", "Dynamic CR", "Octane", "Cranking PSI"],
    icon: Gauge,
  },
  {
    title: "Piston Ring Gap Calculator",
    href: "/calculators/ring-gap-advanced",
    desc: "Application-specific ring gap for NA, nitrous, turbo, supercharged, and diesel. Per-ring outputs, material warnings, and file-gap workflow.",
    tags: ["Bore Size", "Application", "Ring Type", "Per-Ring"],
    icon: Circle,
  },
  {
    title: "Advanced Cam Calculator",
    href: "/calculators/cam-duration",
    desc: "Full cam analysis — valve events, overlap, recommended LSA, dynamic compression ratio, and rocker lift table.",
    tags: ["Cam Timing", "Overlap", "LSA", "Dynamic CR"],
    icon: Settings2,
  },
  {
    title: "Valvetrain RPM Builder",
    href: "/calculators/valvetrain-builder",
    desc: "Match cam, rockers, springs, and target RPM as a complete system. Enter your cam to find spring requirements — or enter your springs to find what cams they support. Valve float estimation, RPM safety graph, and cascade warnings.",
    tags: ["Cam + Springs", "Valve Float", "RPM Match", "Bidirectional"],
    icon: ArrowRightLeft,
  },
  {
    title: "Connecting Rod Ratio",
    href: "/calculators/rod-ratio",
    desc: "Calculate rod ratio with visual gauge. Compare against common engines. Explains piston dwell and friction.",
    tags: ["Stroke", "Rod Length"],
    icon: ArrowDownUp,
  },
  {
    title: "HP & Torque",
    href: "/calculators/hp-torque",
    desc: "Bidirectional HP↔Torque converter. Shows the formula, the 5252 crossover point, and unit conversions.",
    tags: ["HP", "Torque", "RPM"],
    icon: Zap,
  },
  {
    title: "Piston Speed",
    href: "/calculators/piston-speed",
    desc: "Mean and peak piston speed with color-coded safety zones. Reference table of common engine redlines.",
    tags: ["Stroke", "RPM", "FPM"],
    icon: Timer,
  },
  {
    title: "AFR / Lambda Converter",
    href: "/calculators/afr-lambda",
    desc: "Convert between Lambda, actual AFR, and gas-scale wideband AFR for any fuel. Variable E85 ethanol slider and injector sizing math.",
    tags: ["Lambda", "AFR", "E85", "Wideband"],
    icon: Flame,
  },
  {
    title: "Quench & Deck Height",
    href: "/calculators/quench-deck-height",
    desc: "Calculate piston-to-deck clearance, quench distance, and compression ratio simultaneously. Gasket quick-picker updates everything live.",
    tags: ["Quench", "Deck Height", "Gasket", "CR"],
    icon: Ruler,
  },
  {
    title: "Pushrod Length Calculator",
    href: "/calculators/pushrod-length",
    desc: "Determine correct pushrod length after head milling, cam swaps, or rocker changes. Stock lengths for SBC, BBC, LS, SBF, and Hemi platforms.",
    tags: ["Pushrod", "Valvetrain", "Rocker Geometry"],
    icon: MoveVertical,
  },
  {
    title: "Cam Degreeing",
    href: "/calculators/cam-degreeing",
    desc: "Step-by-step cam degreeing guide with intake centerline verification, advance/retard calculation, and dial indicator math.",
    tags: ["Cam Degreeing", "Intake Centerline", "Dial Indicator"],
    icon: RotateCcw,
  },
  {
    title: "Piston-to-Valve Clearance",
    href: "/calculators/piston-to-valve",
    desc: "Kinematic P2V simulation across the overlap region. Engine platform presets, live cam advance slider, clearance chart, and interference warnings.",
    tags: ["P2V", "Cam Advance", "Valve Relief", "Interference"],
    icon: ShieldAlert,
  },
  {
    title: "Valve Spring Calculator",
    href: "/calculators/valve-spring",
    desc: "Validate valve spring specs for your cam profile. Seat pressure, open pressure, coil bind clearance, and spring rate analysis.",
    tags: ["Valve Springs", "Seat Pressure", "Coil Bind", "Spring Rate"],
    icon: Codesandbox,
  },
  {
    title: "Torque Extension Calculator",
    href: "/calculators/torque-extension",
    desc: "Corrected torque wrench setting for crow's foot adapters, offset extensions, and wobble sockets. Interactive diagram shows how lever arm changes affect torque.",
    tags: ["Torque Spec", "Crow's Foot", "Extension", "Wobble Socket"],
    icon: Wrench,
  },
  {
    title: "HP & Torque Estimator",
    href: "/calculators/hp-estimator",
    desc: "Estimate horsepower and torque for your build. Pick your engine, heads, cam, intake, exhaust, and compression — get a data-backed estimate from real dyno results.",
    tags: ["HP Estimate", "Build Combo", "Dyno Data", "Heads & Cam"],
    icon: Zap,
  },
  {
    title: "Carburetor / CFM Sizing",
    href: "/calculators/carb-cfm-sizing",
    desc: "Calculate the right carburetor size for your engine. Uses the standard CFM formula with real carb sizes from Holley and Edelbrock. Street and race recommendations with overcarburetion warnings.",
    tags: ["CID", "RPM", "CFM", "Carb Size"],
    icon: Wind,
  },
  {
    title: "Fuel Injector Sizing",
    href: "/calculators/fuel-injector-sizing",
    desc: "Calculate what size fuel injectors you need based on target HP, fuel type, and aspiration. Duty cycle analysis, fuel pump sizing, and real injector size matching.",
    tags: ["Target HP", "Fuel Type", "Injector Size", "Duty Cycle"],
    icon: Droplet,
  },
  {
    title: "Cylinder Head Flow / CFM to HP",
    href: "/calculators/head-flow",
    desc: "Convert flow bench CFM to horsepower potential. Flow coefficient, intake/exhaust ratio, port velocity, full flow curve analysis, and comparison against 14 popular SBC, LS, BBC, and Ford heads.",
    tags: ["Intake CFM", "Exhaust CFM", "HP Potential", "Flow Coefficient"],
    icon: Activity,
  },
  {
    title: "Turbo Finder & Sizing",
    href: "/calculators/turbo-finder",
    desc: "Find the right turbocharger for your engine. Calculates required airflow, boost pressure, compressor outlet temp, and matches against Garrett, BorgWarner, and Precision turbos with fuel system sizing.",
    tags: ["Turbo Sizing", "CFM", "Boost", "Compressor Map", "A/R Ratio"],
    icon: Flame,
  },
  {
    title: "Gear Ratio / Final Drive",
    href: "/calculators/gear-ratio",
    desc: "Calculate RPM at speed for any axle ratio, tire size, and transmission. Compare gear ratios side by side, see highway cruise RPM, and find the right gears for your build.",
    tags: ["Axle Ratio", "Tire Size", "Transmission", "RPM vs Speed"],
    icon: Cog,
  },
  {
    title: "Bearing Clearance Calculator",
    href: "/calculators/bearing-clearance",
    desc: "Calculate main and rod bearing oil clearance from measurements or Plastigage. Engine platform specs, per-bearing tables, oil viscosity recommendations, and clearance assessment.",
    tags: ["Journal OD", "Bearing Clearance", "Oil Viscosity", "Block Material"],
    icon: Target,
  },
  {
    title: "MM ↔ Inch Converter",
    href: "/calculators/mm-inch-converter",
    desc: "High-precision millimeter to inch converter with selectable decimal places (1–8), fractional readout to 1/64\", and commonly used reference table. Bidirectional MM↔Inches.",
    tags: ["MM", "Inches", "Precision", "Fractions"],
    icon: Ruler,
  },
];

const dieselCalculators: { title: string; href: string; desc: string; tags: string[]; icon: LucideIcon }[] = [
  {
    title: "Diesel Single Turbo Finder",
    href: "/calculators/diesel-single-turbo",
    desc: "Find the right single turbo upgrade for your diesel. Match Holset, BorgWarner S-series, Garrett, and aftermarket turbos for Cummins, Duramax, and Powerstroke with airflow, EGT, and drive pressure calculations.",
    tags: ["Diesel Turbo", "Holset", "S300", "EGT", "Single Turbo"],
    icon: Wind,
  },
  {
    title: "Diesel Compound Turbo Sizing",
    href: "/calculators/diesel-compound-turbo",
    desc: "Size compound (twin) turbo setups for diesel engines. Match BorgWarner S300/S400 and Holset turbos with pressure ratio split, drive pressure, and intercooler calculations for Cummins, Duramax, and Powerstroke.",
    tags: ["Compound Turbo", "S300/S400", "Diesel Boost", "Drive Pressure"],
    icon: Wind,
  },
  {
    title: "Diesel Lift Pump & Fuel System",
    href: "/calculators/diesel-lift-pump",
    desc: "Calculate the right lift pump for your diesel. FASS and AirDog sizing based on target HP, platform-specific warnings for VP44 and CP4 trucks, fuel line sizing, and air separation guidance.",
    tags: ["Diesel Fuel System", "Lift Pump GPH", "FASS", "AirDog"],
    icon: Droplet,
  },
  {
    title: "Diesel EGT & Drive Pressure",
    href: "/calculators/diesel-egt-drive-pressure",
    desc: "Check your pyrometer readings against safe limits, estimate EGTs for your setup, or analyze drive pressure ratio. Pre-turbo vs post-turbo correction with platform-specific thresholds for Cummins, Duramax, and Powerstroke.",
    tags: ["EGT", "Drive Pressure", "Pyrometer", "Turbo Health"],
    icon: Thermometer,
  },
  {
    title: "Diesel Nozzle & Pop Pressure",
    href: "/calculators/diesel-injector-nozzle-pop-pressure",
    desc: "Size mechanical diesel nozzles for Cummins P-pump, VE, and VP44 engines. Nozzle flow area, pop pressure recommendation, shim sizing, air/fuel match assessment, and common rail injector reference table.",
    tags: ["Nozzle Size", "Pop Pressure", "Cummins Injector", "Flow Area"],
    icon: Target,
  },
  {
    title: "Diesel Smoke Limit / Lambda Calculator",
    href: "/calculators/diesel-smoke-lambda",
    desc: "Diesel-specific lambda and AFR calculator with smoke prediction, boost-to-fuel balance analysis, and operating range assessment for Cummins, Duramax, and Powerstroke. Three modes: assess your wideband reading, predict smoke from boost and fuel delivery, or find your air/fuel bottleneck.",
    tags: ["Diesel Lambda", "Smoke Limit", "Boost-to-Fuel", "Diesel AFR"],
    icon: Flame,
  },
];

export default function CalculatorsIndex() {
  return (
    <div>
      <PageHeader
        eyebrow="Tools"
        title="Calculator Suite"
        subtitle="Professional engine building calculators with real-time results. All calculations update instantly as you type."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {calculators.map((calc) => (
            <Link key={calc.href} href={calc.href}>
              <div className="group block p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center text-[#E85D04] shrink-0 group-hover:bg-[#E85D04] group-hover:text-white transition-all">
                    <calc.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold mb-1 group-hover:text-[#E85D04] transition-colors">{calc.title}</h2>
                    <p className="text-sm text-gray-500 mb-3">{calc.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {calc.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Diesel Section */}
        <div className="mt-12 mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-300" />
          <h2 className="text-lg font-bold text-[#1a1a1a] uppercase tracking-wide shrink-0">Diesel Calculators</h2>
          <div className="h-px flex-1 bg-gray-300" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {dieselCalculators.map((calc) => (
            <Link key={calc.href} href={calc.href}>
              <div className="group block p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center text-[#E85D04] shrink-0 group-hover:bg-[#E85D04] group-hover:text-white transition-all">
                    <calc.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold mb-1 group-hover:text-[#E85D04] transition-colors">{calc.title}</h2>
                    <p className="text-sm text-gray-500 mb-3">{calc.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {calc.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <AdBanner slot="3333333333" format="horizontal" />
        </div>
      </div>
    </div>
  );
}
