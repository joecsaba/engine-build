import { Link } from "wouter";
import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdBanner } from "@/components/ads/AdBanner";

const calculators = [
  {
    title: "Engine Displacement",
    href: "/calculators/displacement",
    desc: "Calculate displacement in cubic inches, liters, and CC. Includes piston speed and engine match lookup.",
    tags: ["Bore", "Stroke", "Cylinders"],
  },
  {
    title: "Compression Ratio",
    href: "/calculators/compression-ratio",
    desc: "Static AND dynamic compression ratio with octane recommendations. Side-by-side comparison with detonation explanation.",
    tags: ["Static", "Dynamic", "Octane"],
  },
  {
    title: "Piston Ring End Gap",
    href: "/calculators/ring-gap",
    desc: "Recommended ring gap for any bore size, ring type, and application. Color-coded OK/too tight/too loose zones.",
    tags: ["Bore Size", "Application", "Ring Type"],
  },
  {
    title: "Camshaft Duration",
    href: "/calculators/cam-duration",
    desc: "Convert between advertised, 0.050\", and 0.200\" duration. Calculate lobe lift and gross valve lift.",
    tags: ["Duration", "Lift", "Rocker Ratio"],
  },
  {
    title: "Connecting Rod Ratio",
    href: "/calculators/rod-ratio",
    desc: "Calculate rod ratio with visual gauge. Compare against common engines. Explains piston dwell and friction.",
    tags: ["Stroke", "Rod Length"],
  },
  {
    title: "HP & Torque",
    href: "/calculators/hp-torque",
    desc: "Bidirectional HP↔Torque converter. Shows the formula, the 5252 crossover point, and unit conversions.",
    tags: ["HP", "Torque", "RPM"],
  },
  {
    title: "Piston Speed",
    href: "/calculators/piston-speed",
    desc: "Mean and peak piston speed with color-coded safety zones. Reference table of common engine redlines.",
    tags: ["Stroke", "RPM", "FPM"],
  },
];

export default function CalculatorsIndex() {
  return (
    <div>
      <SEOHead
        title="Engine Builder Calculator Suite"
        description="All engine building calculators in one place. Compression ratio, displacement, cam duration, piston ring gap, connecting rod ratio, HP/torque, and piston speed. Free, fast, and accurate."
        canonical="/calculators"
        keywords="engine calculators, compression ratio calculator, displacement calculator, cam duration, ring gap, rod ratio, horsepower calculator, engine builder tools"
      />
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
                    <Calculator className="w-5 h-5" />
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
