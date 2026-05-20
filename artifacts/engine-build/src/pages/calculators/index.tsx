import { Link } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { AdBanner } from "@/components/ads/AdBanner";

const categories = [
  {
    title: "Short Block & Bottom End",
    href: "/calculators/short-block",
    subtitle: "Displacement, compression, ring gap, bearings, and rotating assembly math.",
    count: 10,
    tools: "Engine Displacement, Compression Ratio, Piston Ring Gap, Piston Speed, Quench & Deck Height, Rod Ratio, Bearing Clearance, Intake Manifold Milling, Bolt Spec Lookup, CC ↔ Cubic Inch",
  },
  {
    title: "Cam, Valvetrain & Cylinder Heads",
    href: "/calculators/cam-valvetrain",
    subtitle: "Cam timing, valve springs, pushrod length, P2V clearance, degreeing, head flow, and head milling.",
    count: 9,
    tools: "Advanced Cam Calculator, Cam Degreeing, Valvetrain RPM Builder, Valve Spring, Valve Shim, Pushrod Length, Piston-to-Valve Clearance, Cylinder Head Flow, Head Milling",
  },
  {
    title: "Power, Fuel & Forced Induction",
    href: "/calculators/power-fuel",
    subtitle: "HP estimation, AFR/lambda tuning, carb and injector sizing, turbo matching, and boost analysis.",
    count: 11,
    tools: "HP & Torque Converter, HP & Torque Estimator, AFR / Lambda, Carburetor CFM Sizing, Fuel Injector Sizing, Turbo Finder & Sizing, Boost / Effective CR, Octane Mix, Ignition Timing Curve, Pressure Converter, AN Fitting Size",
  },
  {
    title: "Drivetrain & Shop Tools",
    href: "/calculators/drivetrain-shop",
    subtitle: "Gear ratio planning, torque wrench correction, precision conversion, threading, and shop reference tools.",
    count: 10,
    tools: "Gear Ratio / Final Drive, Torque Extension, MM to Inch, Density Altitude / HP Correction, Torque Converter Stall, Decimal ↔ Fraction Inch, Tap Drill Lookup, Thread Pitch (TPI ↔ Metric), Torque Units (ft-lb/Nm/in-lb), Temperature",
  },
  {
    title: "Diesel",
    href: "/calculators/diesel",
    subtitle: "Turbo sizing, compound setups, lift pump selection, EGT safety, nozzle sizing, smoke/lambda, and valve relief.",
    count: 7,
    tools: "Single Turbo Finder, Compound Turbo Sizing, Lift Pump & Fuel System, EGT & Drive Pressure, Nozzle & Pop Pressure, Smoke Limit / Lambda, Valve Relief",
  },
];

export default function CalculatorsIndex() {
  return (
    <div>
      <SEOHead
        title="Engine Building Calculators | 47+ Free Tools"
        description="Professional engine building calculators for short blocks, camshafts, valvetrains, cylinder heads, power and fuel systems, drivetrain, and diesel engines. All free, all instant."
        canonical="/calculators"
        keywords="engine building calculators, compression ratio calculator, cam timing calculator, turbo sizing calculator, diesel calculator"
      />

      <PageHeader
        eyebrow="Tools"
        title="Calculator Suite"
        subtitle="Professional engine building calculators with real-time results. All calculations update instantly as you type."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <Link key={cat.href} href={cat.href}>
              <div className="group block p-6 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-gray-800 hover:border-[#E85D04] transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-bold text-white group-hover:text-[#E85D04] transition-colors">
                    {cat.title}
                  </h2>
                  <span className="shrink-0 ml-3 text-xs font-bold bg-[#E85D04] text-white px-2.5 py-1 rounded-full">
                    {cat.count} tools
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-4">{cat.subtitle}</p>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{cat.tools}</p>
                <span className="text-sm font-semibold text-[#E85D04] group-hover:underline">
                  View Calculators →
                </span>
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
