import { Link } from "wouter";
import {
  Cylinder, Gauge, Circle, Timer, Ruler, ArrowDownUp, Target, Wrench, Bolt, FlaskConical,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { AdBanner } from "@/components/ads/AdBanner";
import { CalcCard, type Calc } from "@/components/calculators/CalcCard";

export const shortBlock: Calc[] = [
  {
    title: "Engine Displacement",
    href: "/calculators/displacement",
    desc: "Calculate displacement in cubic inches, liters, and CC from bore, stroke, and cylinder count.",
    tags: ["Bore", "Stroke", "Cylinders"],
    icon: Cylinder,
  },
  {
    title: "Compression Ratio",
    href: "/calculators/compression-ratio",
    desc: "Static and dynamic compression ratio with octane recommendations. Three IVC input methods, cranking pressure, and reverse-solve mode.",
    tags: ["Static CR", "Dynamic CR", "Octane", "Cranking PSI"],
    icon: Gauge,
  },
  {
    title: "Piston Ring Gap Calculator",
    href: "/calculators/ring-gap",
    desc: "Application-specific ring gap for NA, nitrous, turbo, supercharged, and diesel. Per-ring outputs and material warnings.",
    tags: ["Bore Size", "Application", "Ring Type", "Per-Ring"],
    icon: Circle,
  },
  {
    title: "Piston Speed",
    href: "/calculators/piston-speed",
    desc: "Mean and peak piston speed with color-coded safety zones. Reference table of common engine redlines.",
    tags: ["Stroke", "RPM", "FPM"],
    icon: Timer,
  },
  {
    title: "Quench & Deck Height",
    href: "/calculators/quench-deck-height",
    desc: "Piston-to-deck clearance, quench distance, and compression ratio in one tool. Gasket quick-picker updates everything live.",
    tags: ["Quench", "Deck Height", "Gasket", "CR"],
    icon: Ruler,
  },
  {
    title: "Connecting Rod Ratio",
    href: "/calculators/rod-ratio",
    desc: "Calculate rod ratio with visual gauge. Compare against common engines. Explains piston dwell and side loading.",
    tags: ["Stroke", "Rod Length"],
    icon: ArrowDownUp,
  },
  {
    title: "Bearing Clearance Calculator",
    href: "/calculators/bearing-clearance",
    desc: "Main and rod bearing oil clearance from measurements or Plastigage. Per-bearing tables, oil viscosity recommendations, and clearance assessment.",
    tags: ["Journal OD", "Bearing Clearance", "Oil Viscosity"],
    icon: Target,
  },
  {
    title: "Intake Manifold Milling",
    href: "/calculators/intake-manifold-milling",
    desc: "Calculate how much to mill the intake manifold after surfacing heads or decking the block. Tells you when correction is needed.",
    tags: ["Head Surfacing", "Intake Alignment", "Block Decking"],
    icon: Wrench,
  },
  {
    title: "Head Bolt & Main Bolt Specs",
    href: "/calculators/bolt-spec-lookup",
    desc: "Look up head bolt and main bolt thread sizes, diameters, and ARP upgrade part numbers for any engine platform.",
    tags: ["Thread Size", "Bolt Diameter", "ARP Upgrade", "TTY"],
    icon: Bolt,
  },
  {
    title: "CC ↔ Cubic Inch Converter",
    href: "/calculators/cc-ci-converter",
    desc: "Convert chamber volumes, piston dome/dish CCs, and displacement between cubic centimeters and cubic inches. Bonus liters and fluid ounces.",
    tags: ["Chamber CC", "Piston Dome", "Displacement", "CR Math"],
    icon: FlaskConical,
  },
];

export default function CategoryShortBlock() {
  return (
    <div>
      <SEOHead
        title="Short Block & Bottom End Calculators | Engine-Build.com"
        description="Engine building calculators for your short block: compression ratio, displacement, piston ring gap, piston speed, quench distance, rod ratio, bearing clearance, and intake manifold milling."
        canonical="/calculators/short-block"
        keywords="short block calculator, compression ratio calculator, piston ring gap calculator, engine displacement calculator, bearing clearance calculator, rod ratio calculator"
      />

      <PageHeader
        eyebrow="Calculators"
        title="Short Block & Bottom End"
        subtitle="Displacement, compression, ring gap, bearings, and rotating assembly math for your short block build."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <Link href="/calculators" className="text-sm text-[#E85D04] hover:underline">&larr; All Calculators</Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {shortBlock.map((calc) => (
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
