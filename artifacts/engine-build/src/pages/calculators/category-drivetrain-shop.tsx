import { Link } from "wouter";
import {
  Cog, Wrench, Ruler, CloudSun, Divide, Drill, Hash, Thermometer, type LucideIcon,
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

const drivetrainShop: Calc[] = [
  {
    title: "Gear Ratio / Final Drive",
    href: "/calculators/gear-ratio",
    desc: "Calculate RPM at speed for any axle ratio, tire size, and transmission. Compare gear ratios side by side.",
    tags: ["Axle Ratio", "Tire Size", "Transmission"],
    icon: Cog,
  },
  {
    title: "Torque Extension Calculator",
    href: "/calculators/torque-extension",
    desc: "Corrected torque wrench setting for crow's foot adapters, offset extensions, and wobble sockets.",
    tags: ["Crow's Foot", "Extension", "Wobble Socket"],
    icon: Wrench,
  },
  {
    title: "MM to Inch Converter",
    href: "/calculators/mm-inch-converter",
    desc: "High-precision metric to imperial conversion for engine builders. Includes common machinist reference tables and fractional inch equivalents.",
    tags: ["Metric", "Imperial", "Conversion", "Precision"],
    icon: Ruler,
  },
  {
    title: "Density Altitude / HP Correction",
    href: "/calculators/density-altitude",
    desc: "Calculate density altitude, relative HP, and dyno correction factors for SAE J1349, J607, and DIN 70020. Dew point or RH input for trackside accuracy.",
    tags: ["Density Altitude", "HP Correction", "SAE J1349"],
    icon: CloudSun,
  },
  {
    title: "Torque Converter Stall Speed",
    href: "/calculators/torque-converter-stall",
    desc: "Find the right converter stall speed for your build. Recommended stall range, converter diameter, launch analysis, and cruise RPM based on your cam and engine specs.",
    tags: ["Stall Speed", "Converter", "Cam Match"],
    icon: Cog,
  },
  {
    title: "Decimal ↔ Fraction Inch",
    href: "/calculators/decimal-fraction-inch",
    desc: "Convert decimal caliper readings to fractional drill/wrench sizes and back. Choose precision down to 1/128. Standard fractional inch chart included.",
    tags: ["Decimal", "Fraction", "Machinist", "Caliper"],
    icon: Divide,
  },
  {
    title: "Tap Drill Size Lookup",
    href: "/calculators/tap-drill-lookup",
    desc: "Pick a tap, get the drill. Imperial UNC/UNF and metric coarse/fine with 75% and 50% thread engagement sizes for any common tap.",
    tags: ["Tap Drill", "UNC", "UNF", "Metric", "75% Thread"],
    icon: Drill,
  },
  {
    title: "Thread Pitch Converter — TPI ↔ Metric",
    href: "/calculators/thread-pitch-converter",
    desc: "Identify a thread when you have only TPI or only metric pitch. TPI × pitch (mm) = 25.4. Common UNC/UNF and metric pitches in a quick reference.",
    tags: ["TPI", "Metric Pitch", "Threads", "Identification"],
    icon: Hash,
  },
  {
    title: "Torque Units Converter",
    href: "/calculators/torque-units-converter",
    desc: "Convert between ft-lb, Nm, in-lb, and kgf·m. Common engine torque references included for spec lookup.",
    tags: ["ft-lb", "Nm", "in-lb", "Torque"],
    icon: Wrench,
  },
  {
    title: "Temperature Converter",
    href: "/calculators/temperature-converter",
    desc: "Fahrenheit, Celsius, and Kelvin with engine reference points: coolant, oil, EGT zones (cold / normal / hot / danger).",
    tags: ["°F", "°C", "Kelvin", "Coolant", "EGT"],
    icon: Thermometer,
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

export default function CategoryDrivetrainShop() {
  return (
    <div>
      <SEOHead
        title="Drivetrain & Shop Tool Calculators"
        description="Gear ratio calculator, crow's foot torque wrench correction, and precision metric-imperial conversion for the engine builder's shop."
        canonical="/calculators/drivetrain-shop"
        keywords="gear ratio calculator, RPM at speed calculator, crow's foot torque calculator, torque wrench extension calculator, final drive calculator, mm to inch converter"
      />

      <PageHeader
        eyebrow="Calculators"
        title="Drivetrain & Shop Tools"
        subtitle="Gear ratio planning, torque wrench correction, and precision conversion tools for the shop."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <Link href="/calculators" className="text-sm text-[#E85D04] hover:underline">&larr; All Calculators</Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {drivetrainShop.map((calc) => (
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
