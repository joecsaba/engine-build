import { Link } from "wouter";
import {
  Zap, Flame, Wind, Droplet, Gauge, Fuel, Timer, GaugeCircle, Pipette,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { AdBanner } from "@/components/ads/AdBanner";
import { CalcCard, type Calc } from "@/components/calculators/CalcCard";

export const powerFuel: Calc[] = [
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
          <AdBanner placementId={105} />
        </div>
      </div>
    </div>
  );
}
