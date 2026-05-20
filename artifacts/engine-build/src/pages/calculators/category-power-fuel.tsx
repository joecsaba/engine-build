import { Link } from "wouter";
import {
  Zap, Flame, Wind, Droplet, Gauge, Fuel, Timer, GaugeCircle, Pipette, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { AdBanner } from "@/components/ads/AdBanner";

interface Calc {
  title: string;
  href: string;
  desc: string;
  tags: string[];
  icon: LucideIcon;
}

const powerFuel: Calc[] = [
  {
    title: "HP & Torque Converter",
    href: "/calculators/hp-torque",
    desc: "Bidirectional HP/Torque converter. Shows the formula, the 5252 crossover point, and unit conversions.",
    tags: ["HP", "Torque", "RPM"],
    icon: Zap,
  },
  {
    title: "HP & Torque Estimator",
    href: "/calculators/hp-estimator",
    desc: "Estimate horsepower and torque for your build. Pick your engine, heads, cam, intake, exhaust, and compression for a data-backed estimate.",
    tags: ["HP Estimate", "Build Combo", "Dyno Data"],
    icon: Zap,
  },
  {
    title: "AFR / Lambda Converter",
    href: "/calculators/afr-lambda",
    desc: "Convert between Lambda, actual AFR, and gas-scale wideband AFR for any fuel. Variable E85 ethanol slider.",
    tags: ["Lambda", "AFR", "E85", "Wideband"],
    icon: Flame,
  },
  {
    title: "Carburetor / CFM Sizing",
    href: "/calculators/carb-cfm-sizing",
    desc: "Calculate the right carburetor size for your engine. Real carb sizes from Holley and Edelbrock with overcarburetion warnings.",
    tags: ["CID", "RPM", "CFM", "Carb Size"],
    icon: Wind,
  },
  {
    title: "Fuel Injector Sizing",
    href: "/calculators/fuel-injector-sizing",
    desc: "What size fuel injectors do you need? Duty cycle analysis, fuel pump sizing, and real injector size matching.",
    tags: ["Target HP", "Fuel Type", "Injector Size"],
    icon: Droplet,
  },
  {
    title: "Turbo Finder & Sizing",
    href: "/calculators/turbo-finder",
    desc: "Find the right turbocharger for your engine. Airflow, boost pressure, compressor sizing, and turbo recommendations by HP goal.",
    tags: ["Turbo Sizing", "CFM", "Boost", "A/R Ratio"],
    icon: Flame,
  },
  {
    title: "Boost / Effective CR",
    href: "/calculators/boost-compression",
    desc: "Calculate effective compression ratio under boost. Altitude correction, fuel-specific safety limits, and reverse-solve for max safe boost or CR.",
    tags: ["Boost", "ECR", "Turbo/SC", "Fuel Safety"],
    icon: Gauge,
  },
  {
    title: "Octane Mix Calculator",
    href: "/calculators/octane-mix",
    desc: "Blend two fuels to hit a target octane, or calculate E85/ethanol mix ratios with seasonal correction. Shows stoichiometric AFR and energy content.",
    tags: ["Octane Blend", "E85 Mix", "Ethanol %"],
    icon: Fuel,
  },
  {
    title: "Ignition Timing Advance Curve",
    href: "/calculators/ignition-timing-curve",
    desc: "Visualize your ignition advance curve. Input initial, mechanical, and vacuum advance to see total timing vs RPM at WOT, part throttle, and cruise.",
    tags: ["Timing Curve", "Advance", "Distributor", "Ignition"],
    icon: Timer,
  },
  {
    title: "Pressure Converter",
    href: "/calculators/pressure-converter",
    desc: "Convert between PSI, bar, kPa, atm, and inHg — for boost gauges, oil pressure, fuel rail, and vacuum measurements.",
    tags: ["PSI", "Bar", "kPa", "Boost", "Oil Pressure"],
    icon: GaugeCircle,
  },
  {
    title: "AN Fitting Size Chart",
    href: "/calculators/an-fitting-size",
    desc: "AN / JIC fitting dash sizes with tube OD, JIC 37° flare thread, and ORB thread. For fuel system, oil cooler, and turbo plumbing.",
    tags: ["AN", "JIC", "ORB", "Fuel Lines", "Hose Size"],
    icon: Pipette,
  },
];

function CalcCard({ calc }: { calc: Calc }) {
  return (
    <Link href={calc.href}>
      <div className="group block p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer h-full">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center text-[#E85D04] shrink-0 group-hover:bg-[#E85D04] group-hover:text-white transition-all">
            <calc.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold mb-1 group-hover:text-[#E85D04] transition-colors">{calc.title}</h3>
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
  );
}

export default function CategoryPowerFuel() {
  return (
    <div>
      <SEOHead
        title="Power, Fuel & Forced Induction Calculators"
        description="HP estimator, AFR/lambda converter, carburetor CFM sizing, fuel injector calculator, and turbo sizing tools for performance engine builds."
        canonical="/calculators/power-fuel"
        keywords="horsepower calculator, AFR lambda calculator, carburetor CFM calculator, fuel injector sizing calculator, turbo sizing calculator, engine power calculator"
      />

      <PageHeader
        eyebrow="Calculators"
        title="Power, Fuel & Forced Induction"
        subtitle="HP estimation, AFR/lambda tuning, carburetor and injector sizing, and turbo matching for your power goals."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <Link href="/calculators" className="text-sm text-[#E85D04] hover:underline">&larr; All Calculators</Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {powerFuel.map((calc) => (
            <CalcCard key={calc.href} calc={calc} />
          ))}
        </div>

        <div className="mt-10">
          <AdBanner slot="3333333333" format="horizontal" />
        </div>
      </div>
    </div>
  );
}
