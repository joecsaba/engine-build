import { Link } from "wouter";
import {
  Wind, Droplet, Thermometer, Target, Flame, Ruler,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { AdBanner } from "@/components/ads/AdBanner";
import { CalcCard, type Calc } from "@/components/calculators/CalcCard";

export const diesel: Calc[] = [
  {
    title: "Diesel Single Turbo Finder",
    href: "/calculators/diesel-single-turbo",
    desc: "Match Holset, BorgWarner, and Garrett turbos for Cummins, Duramax, and Powerstroke with airflow and drive pressure calculations.",
    tags: ["Diesel Turbo", "Holset", "S300"],
    icon: Wind,
  },
  {
    title: "Diesel Compound Turbo Sizing",
    href: "/calculators/diesel-compound-turbo",
    desc: "Size compound twin turbo setups. Match S300/S400 and Holset turbos with pressure ratio split for Cummins, Duramax, and Powerstroke.",
    tags: ["Compound Turbo", "S300/S400", "Drive Pressure"],
    icon: Wind,
  },
  {
    title: "Diesel Lift Pump & Fuel System",
    href: "/calculators/diesel-lift-pump",
    desc: "FASS and AirDog sizing based on target HP with platform-specific warnings for VP44 and CP4 trucks.",
    tags: ["Lift Pump GPH", "FASS", "AirDog"],
    icon: Droplet,
  },
  {
    title: "Diesel EGT & Drive Pressure",
    href: "/calculators/diesel-egt-drive-pressure",
    desc: "Check pyrometer readings against safe limits. Pre-turbo vs post-turbo correction for Cummins, Duramax, and Powerstroke.",
    tags: ["EGT", "Drive Pressure", "Pyrometer"],
    icon: Thermometer,
  },
  {
    title: "Diesel Nozzle & Pop Pressure",
    href: "/calculators/diesel-injector-nozzle-pop-pressure",
    desc: "Nozzle sizing for Cummins P-pump, VE, and VP44. Pop pressure recommendations, shim sizing, and air/fuel match assessment.",
    tags: ["Nozzle Size", "Pop Pressure", "Cummins"],
    icon: Target,
  },
  {
    title: "Diesel Smoke Limit / Lambda",
    href: "/calculators/diesel-smoke-lambda",
    desc: "Diesel-specific lambda and AFR calculator with smoke prediction and boost-to-fuel balance analysis.",
    tags: ["Diesel Lambda", "Smoke Limit", "Diesel AFR"],
    icon: Flame,
  },
  {
    title: "Diesel Valve Relief Calculator",
    href: "/calculators/diesel-valve-relief",
    desc: "Determine if your Cummins needs valve reliefs when upgrading cams. Covers 5.9L 12V, 24V, 6.7L, and 4BT with clearance analysis.",
    tags: ["Valve Relief", "Cam Upgrade", "Piston Protrusion", "Cummins"],
    icon: Ruler,
  },
];

export default function CategoryDiesel() {
  return (
    <div>
      <SEOHead
        title="Diesel Engine Calculators | Cummins, Duramax, Powerstroke"
        description="Diesel-specific calculators: turbo sizing, compound turbo setups, lift pump selection, EGT safety, nozzle sizing, smoke/lambda analysis, and valve relief for diesel engines."
        canonical="/calculators/diesel"
        keywords="diesel turbo calculator, compound turbo sizing, diesel lift pump calculator, diesel EGT calculator, Cummins calculator, Duramax calculator, Powerstroke calculator, diesel valve relief"
      />

      <PageHeader
        eyebrow="Calculators"
        title="Diesel Calculators"
        subtitle="Turbo sizing, compound setups, lift pump selection, EGT safety, nozzle sizing, smoke/lambda analysis, and valve relief for diesel engines."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <Link href="/calculators" className="text-sm text-[#E85D04] hover:underline">&larr; All Calculators</Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {diesel.map((calc) => (
            <CalcCard key={calc.href} calc={calc} />
          ))}
        </div>

        <div className="mt-10">
          <AdBanner placementId={107} />
        </div>
      </div>
    </div>
  );
}
