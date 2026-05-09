import { Link } from "wouter";
import {
  Settings2, RotateCcw, ArrowRightLeft, Codesandbox, MoveVertical,
  ShieldAlert, Activity, Disc, type LucideIcon,
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

const camValvetrain: Calc[] = [
  {
    title: "Advanced Cam Calculator",
    href: "/calculators/cam-duration",
    desc: "Full cam analysis — valve events, overlap, recommended LSA, dynamic compression ratio, and rocker lift table.",
    tags: ["Cam Timing", "Overlap", "LSA", "Dynamic CR"],
    icon: Settings2,
  },
  {
    title: "Cam Degreeing",
    href: "/calculators/cam-degreeing",
    desc: "Step-by-step cam degreeing guide with intake centerline verification, advance/retard calculation, and dial indicator math.",
    tags: ["Cam Degreeing", "Intake Centerline", "Dial Indicator"],
    icon: RotateCcw,
  },
  {
    title: "Valvetrain RPM Builder",
    href: "/calculators/valvetrain-builder",
    desc: "Match cam, rockers, springs, and target RPM as a complete system. Valve float estimation, RPM safety graph, and cascade warnings.",
    tags: ["Cam + Springs", "Valve Float", "RPM Match"],
    icon: ArrowRightLeft,
  },
  {
    title: "Valve Spring Calculator",
    href: "/calculators/valve-spring",
    desc: "Validate valve spring specs for your cam profile. Seat pressure, open pressure, coil bind clearance, and spring rate analysis.",
    tags: ["Valve Springs", "Seat Pressure", "Coil Bind"],
    icon: Codesandbox,
  },
  {
    title: "Pushrod Length Calculator",
    href: "/calculators/pushrod-length",
    desc: "Correct pushrod length after head milling, cam swaps, or rocker changes. Stock lengths for SBC, BBC, LS, SBF, and Hemi.",
    tags: ["Pushrod", "Valvetrain", "Rocker Geometry"],
    icon: MoveVertical,
  },
  {
    title: "Piston-to-Valve Clearance",
    href: "/calculators/piston-to-valve",
    desc: "Kinematic P2V simulation across the overlap region. Engine platform presets, cam advance slider, and interference warnings.",
    tags: ["P2V", "Cam Advance", "Valve Relief"],
    icon: ShieldAlert,
  },
  {
    title: "Cylinder Head Flow / CFM to HP",
    href: "/calculators/head-flow",
    desc: "Convert flow bench CFM to horsepower potential. Flow coefficient, intake/exhaust ratio, port velocity, and comparison against popular heads.",
    tags: ["Intake CFM", "HP Potential", "Flow Coefficient"],
    icon: Activity,
  },
  {
    title: "Valve Shim Calculator",
    href: "/calculators/valve-shim",
    desc: "Calculate replacement shim sizes for shim-over-bucket and shim-under-bucket valvetrains. Supports mm/inch inputs, multi-valve entry, shim swap suggestions, and nearest available shim lookup.",
    tags: ["Valve Shims", "Bucket Shim", "SOB / SUB", "mm ↔ in"],
    icon: Disc,
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

export default function CategoryCamValvetrain() {
  return (
    <div>
      <SEOHead
        title="Cam, Valvetrain & Cylinder Head Calculators"
        description="Camshaft timing, valve spring, pushrod length, piston-to-valve clearance, cam degreeing, and cylinder head flow calculators for engine builders."
        canonical="/calculators/cam-valvetrain"
        keywords="cam timing calculator, valve spring calculator, pushrod length calculator, cam degreeing calculator, cylinder head flow calculator, P2V clearance calculator"
      />

      <PageHeader
        eyebrow="Calculators"
        title="Cam, Valvetrain & Cylinder Heads"
        subtitle="Cam timing, valve springs, pushrod length, P2V clearance, degreeing, and cylinder head flow analysis."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <Link href="/calculators" className="text-sm text-[#E85D04] hover:underline">← All Calculators</Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {camValvetrain.map((calc) => (
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
