import { Link } from "wouter";
import {
  Settings2, RotateCcw, ArrowRightLeft, Codesandbox, Ruler, MoveVertical,
  ShieldAlert, Activity, Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { AdBanner } from "@/components/ads/AdBanner";
import { CalcCard, type Calc } from "@/components/calculators/CalcCard";

export const camValvetrain: Calc[] = [
  {
    title: "Camshaft Selector — What Cam Do I Need?",
    href: "/calculators/cam-selector",
    desc: "Enter your engine, compression, transmission, and goal — get a recommended duration @ 0.050\", LSA, and lift, plus the powerband, idle character, and converter/compression/spring upgrades it needs. Uses David Vizard's LSA method.",
    tags: ["Cam Selector", "What Cam", "Duration", "LSA"],
    icon: Settings2,
  },
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
    title: "Valve Shim Calculator",
    href: "/calculators/valve-shim",
    desc: "Calculate replacement shim sizes for shim-over-bucket and shim-under-bucket valvetrains. Nearest available shim lookup.",
    tags: ["Valve Shims", "Bucket Shim", "SOB / SUB", "mm"],
    icon: Ruler,
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
    title: "Head Milling Calculator",
    href: "/calculators/head-milling",
    desc: "Calculate chamber volume change, compression ratio shift, and intake manifold alignment when milling cylinder heads. Includes OHC cam timing retard correction.",
    tags: ["Head Milling", "Chamber CC", "CR Change", "Cam Timing"],
    icon: Wrench,
  },
];

export default function CategoryCamValvetrain() {
  return (
    <div>
      <SEOHead
        title="Cam, Valvetrain & Cylinder Head Calculators"
        description="Camshaft timing, valve spring, pushrod length, piston-to-valve clearance, cam degreeing, valve shim, and cylinder head flow calculators for engine builders."
        canonical="/calculators/cam-valvetrain"
        keywords="cam timing calculator, valve spring calculator, pushrod length calculator, cam degreeing calculator, cylinder head flow calculator, P2V clearance calculator, valve shim calculator"
      />

      <PageHeader
        eyebrow="Calculators"
        title="Cam, Valvetrain & Cylinder Heads"
        subtitle="Cam timing, valve springs, pushrod length, P2V clearance, degreeing, and cylinder head flow analysis."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <Link href="/calculators" className="text-sm text-[#E85D04] hover:underline">&larr; All Calculators</Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {camValvetrain.map((calc) => (
            <CalcCard key={calc.href} calc={calc} />
          ))}
        </div>

        <div className="mt-10">
          <AdBanner placementId={104} />
        </div>
      </div>
    </div>
  );
}
