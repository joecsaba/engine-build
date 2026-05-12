import { Link } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { AdBanner } from "@/components/ads/AdBanner";

interface Category {
  title: string;
  subtitle: string;
  href: string;
  count: number;
  calculators: string;
}

const categories: Category[] = [
  {
    title: "Short Block & Bottom End",
    subtitle: "Displacement, compression, ring gap, bearings, and rotating assembly math for your short block build.",
    href: "/calculators/short-block",
    count: 8,
    calculators: "Engine Displacement, Compression Ratio, Piston Ring Gap, Piston Speed, Quench & Deck Height, Connecting Rod Ratio, Bearing Clearance, Intake Manifold Milling",
  },
  {
    title: "Cam, Valvetrain & Cylinder Heads",
    subtitle: "Cam timing, valve springs, pushrod length, P2V clearance, degreeing, and cylinder head flow analysis.",
    href: "/calculators/cam-valvetrain",
    count: 8,
    calculators: "Advanced Cam Calculator, Cam Degreeing, Valvetrain RPM Builder, Valve Spring Calculator, Valve Shim Calculator, Pushrod Length, Piston-to-Valve Clearance, Cylinder Head Flow / CFM to HP",
  },
  {
    title: "Power, Fuel & Forced Induction",
    subtitle: "HP estimation, AFR/lambda tuning, carburetor and injector sizing, and turbo matching for your power goals.",
    href: "/calculators/power-fuel",
    count: 6,
    calculators: "HP & Torque Converter, HP & Torque Estimator, AFR / Lambda Converter, Carburetor / CFM Sizing, Fuel Injector Sizing, Turbo Finder & Sizing",
  },
  {
    title: "Drivetrain & Shop Tools",
    subtitle: "Gear ratio planning and torque wrench correction tools for the shop.",
    href: "/calculators/drivetrain-shop",
    count: 2,
    calculators: "Gear Ratio / Final Drive, Torque Extension Calculator",
  },
  {
    title: "Diesel Calculators",
    subtitle: "Turbo sizing, compound setups, lift pump selection, EGT safety, nozzle sizing, and smoke/lambda analysis for diesel engines.",
    href: "/calculators/diesel",
    count: 6,
    calculators: "Diesel Single Turbo Finder, Diesel Compound Turbo Sizing, Diesel Lift Pump & Fuel System, Diesel EGT & Drive Pressure, Diesel Nozzle & Pop Pressure, Diesel Smoke Limit / Lambda",
  },
  {
    title: "MM ↔ Inch Converter",
    href: "/calculators/mm-inch-converter",
    desc: "High-precision millimeter to inch converter with selectable decimal places (1–8), fractional readout to 1/64\", and commonly used reference table. Bidirectional MM↔Inches.",
    tags: ["MM", "Inches", "Precision", "Fractions"],
    icon: Ruler,
  },
];

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={category.href}>
      <div className="group block p-8 rounded-xl bg-[#1a1a1a] hover:bg-[#242424] border border-gray-800 hover:border-[#E85D04] transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-2xl font-bold text-white group-hover:text-[#E85D04] transition-colors">
            {category.title}
          </h2>
          <span className="shrink-0 ml-4 text-sm font-bold bg-[#E85D04] text-white px-3 py-1 rounded-full">
            {category.count} tools
          </span>
        </div>
        <p className="text-gray-400 mb-4">{category.subtitle}</p>
        <p className="text-sm text-gray-500 mb-5">{category.calculators}</p>
        <span className="text-sm font-semibold text-[#E85D04] group-hover:underline">
          View Calculators →
        </span>
      </div>
    </Link>
  );
}

export default function CalculatorsIndex() {
  return (
    <div>
      <SEOHead
        title="Engine Building Calculators | 28+ Free Tools"
        description="Free engine building calculator suite: compression ratio, cam timing, ring gap, turbo sizing, bearing clearance, and 20+ more tools for machinists and builders."
        canonical="/calculators"
        keywords="engine building calculators, compression ratio calculator, cam timing calculator, piston ring gap calculator, turbo sizing calculator, engine build tools"
      />

      <PageHeader
        eyebrow="Tools"
        title="Calculator Suite"
        subtitle="Professional engine building calculators with real-time results. All calculations update instantly as you type."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-6">
        {categories.map((category) => (
          <CategoryCard key={category.href} category={category} />
        ))}

        <div className="mt-10">
          <AdBanner slot="3333333333" format="horizontal" />
        </div>
      </div>
    </div>
  );
}
