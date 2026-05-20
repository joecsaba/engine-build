import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Settings2, Clock, Send, CheckCircle2, Gauge, Database, Wrench } from "lucide-react";
import { useState } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { SEOHead } from "@/components/SEOHead";

const features = [
  { title: "Build Advisor", desc: "Set a target HP, pick your platform, and tune components with live sliders to plan your build", icon: Gauge, href: "/build-advisor" },
  { title: "40+ Calculators", desc: "Displacement, compression, ring gap, cam timing, turbo sizing, bearing clearance, and more", icon: Calculator, href: "/calculators" },
  { title: "Cam Guide", desc: "Systematic approach to selecting the right camshaft for your combination", icon: Settings2, href: "/cam-guide" },
  { title: "Engine Data", desc: "Specs, head data, clearances, and VIN decoder for 3,500+ engines", icon: Database, href: "/engine-data" },
  { title: "Build Sheets", desc: "Component selection, parts tracking, and a full build planner for your project", icon: Wrench, href: "/build-sheets" },
];

const calculators = [
  { title: "Compression Ratio", href: "/calculators/compression-ratio", desc: "Static and dynamic compression with Pat Kelley algorithm" },
  { title: "Piston Ring Gap", href: "/calculators/ring-gap", desc: "Application-specific gap for NA, turbo, nitrous, and diesel" },
  { title: "Cam Calculator", href: "/calculators/cam-duration", desc: "Duration, overlap, LSA, and Vizard analysis" },
  { title: "Quench & Deck Height", href: "/calculators/quench-deck-height", desc: "Gasket comparison with CR and quench side by side" },
  { title: "Turbo Finder", href: "/calculators/turbo-finder", desc: "Match a turbo to your engine by HP goal" },
  { title: "HP Estimator", href: "/calculators/hp-estimator", desc: "Estimate power from your head, cam, and intake combo" },
  { title: "Bearing Clearance", href: "/calculators/bearing-clearance", desc: "Main and rod bearing clearance with tolerance analysis" },
  { title: "Fuel Injector Sizing", href: "/calculators/fuel-injector-sizing", desc: "Duty cycle analysis and injector matching" },
];

const stats = [
  { value: "40+", label: "Free Calculators" },
  { value: "3,500+", label: "Engines in Database" },
  { value: "5", label: "Calculator Categories" },
  { value: "0", label: "Cost to Use" },
];

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("https://formspree.io/f/xvzdknrj", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      setName(""); setEmail(""); setMessage("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="Free Engine Building Calculators & Specs | Engine-build.com"
        description="40+ free engine building calculators for machinists and DIY builders. Compression ratio, piston ring gap, cam timing, turbo sizing, bearing clearance, quench distance, and diesel-specific tools. Engine specs database with 3,500+ engines. All free, all instant."
        canonical="/"
        keywords="engine building calculators, engine build tools, engine specs database, compression ratio calculator, cam calculator, piston ring gap calculator, turbo sizing calculator, free engine tools, engine builder reference"
      />

      {/* Hero */}
      <section className="bg-[#1a1a1a] text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="container mx-auto max-w-4xl relative z-10 text-center space-y-6">
          <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest">Engine-build.com</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            The engine builder's<br /><span className="text-[#E85D04]">calculator toolkit.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            40+ free, instant calculators for displacement, compression, cam specs, ring gap, turbo sizing, bearing clearance, and more. Built for engine builders.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/calculators">
              <Button className="bg-[#E85D04] hover:bg-[#d04f00] text-white font-bold text-lg px-8 py-6">
                Open Calculators
              </Button>
            </Link>
            <Link href="/build-advisor">
              <Button variant="outline" className="border-[#E85D04]/40 text-[#E85D04] hover:bg-[#E85D04]/10 text-lg px-8 py-6">
                Build Advisor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-[#242424] border-y border-[#2a2a2a]">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-[#E85D04]">{s.value}</p>
                <p className="text-sm text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is Engine-build.com */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight mb-6 text-center">What is Engine-build.com?</h2>
          <div className="prose prose-lg max-w-none text-gray-600 space-y-4">
            <p>
              Engine-build.com is a free reference toolkit for anyone who builds, rebuilds, or modifies internal combustion engines. Whether you're a professional machinist checking bearing clearances, a weekend builder planning a stroker combination, or a diesel truck owner sizing a turbo upgrade, every calculator on this site is designed to give you accurate, instant answers without signing up, paying, or watching ads load.
            </p>
            <p>
              The site covers the full spectrum of engine building math: short block calculations like displacement, compression ratio (static and dynamic), piston ring gap, and quench distance; valvetrain tools for cam timing analysis, valve spring pressure, pushrod length, and piston-to-valve clearance; power and fuel system calculators for HP estimation, AFR/lambda conversion, carburetor sizing, fuel injector sizing, and turbo matching; and a dedicated diesel section with tools for Cummins, Duramax, and Powerstroke platforms including compound turbo sizing, EGT analysis, and nozzle/pop pressure calculations.
            </p>
            <p>
              Every calculator uses real engineering formulas &mdash; not generic rules of thumb. The compression ratio calculator uses the Pat Kelley dynamic compression algorithm with rod length correction. The cam calculator implements the David Vizard LSA determination method from his published book. The ring gap calculator pulls from a database of OEM, Cummins QuickServe, and Mahle specifications with per-engine, per-source data. When a formula has a source, we cite it. When specs come from a service manual, we say which one.
            </p>
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section className="py-16 px-4 bg-gray-50 border-y border-gray-100">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">Built for People Who Build Engines</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-xl bg-[#E85D04]/10 flex items-center justify-center mx-auto">
                <Wrench className="w-7 h-7 text-[#E85D04]" />
              </div>
              <h3 className="font-bold text-lg">Machine Shop Professionals</h3>
              <p className="text-sm text-gray-600">
                Quick-reference clearance specs, bearing tolerances, ring gap tables, and gasket comparison tools. Verify your work against factory specs before final assembly.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-xl bg-[#E85D04]/10 flex items-center justify-center mx-auto">
                <Settings2 className="w-7 h-7 text-[#E85D04]" />
              </div>
              <h3 className="font-bold text-lg">DIY Engine Builders</h3>
              <p className="text-sm text-gray-600">
                Planning a 383 stroker? Upgrading heads and cam? Use the build advisor to estimate HP, then dial in every spec with individual calculators. No guesswork.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-xl bg-[#E85D04]/10 flex items-center justify-center mx-auto">
                <Gauge className="w-7 h-7 text-[#E85D04]" />
              </div>
              <h3 className="font-bold text-lg">Performance &amp; Race Teams</h3>
              <p className="text-sm text-gray-600">
                Turbo sizing, injector duty cycle analysis, density altitude HP correction, octane blending, and ignition timing curve visualization for trackside tuning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-4 bg-[#1a1a1a]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest mb-2">Everything You Need</p>
            <h2 className="text-3xl font-bold text-white">Tools &amp; Resources</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {features.map((f) => (
              <Link key={f.title} href={f.href}>
                <div className="group h-full p-6 rounded-xl border border-[#2a2a2a] bg-[#242424] hover:border-[#E85D04] hover:shadow-lg hover:shadow-[#E85D04]/10 transition-all cursor-pointer flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#E85D04]/10 text-[#E85D04] group-hover:bg-[#E85D04] group-hover:text-white transition-all">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white">{f.title}</h3>
                  <p className="text-gray-400 text-sm">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator grid */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest mb-1">Most Popular</p>
              <h2 className="text-3xl font-bold tracking-tight">Essential Calculators</h2>
              <p className="text-gray-500 mt-1">Real engineering formulas with cited sources. No guesswork.</p>
            </div>
            <Link href="/calculators">
              <Button variant="outline" className="hidden sm:flex border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white">View All 40+</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {calculators.map(calc => (
              <Link key={calc.title} href={calc.href} className="block group">
                <div className="p-5 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-sm transition-all h-full flex flex-col">
                  <h3 className="font-semibold group-hover:text-[#E85D04] transition-colors">{calc.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{calc.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 sm:hidden">
            <Link href="/calculators" className="block w-full">
              <Button variant="outline" className="w-full">View All 40+ Calculators</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mid-page ad */}
      <section className="py-6 px-4 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto max-w-6xl">
          <AdBanner slot="2222222222" format="horizontal" />
        </div>
      </section>

      {/* Engine Data section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest mb-2">Reference Database</p>
            <h2 className="text-3xl font-bold tracking-tight">3,500+ Engine Specs</h2>
            <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
              Bore, stroke, rod length, compression ratio, head data, valve sizes, clearances, and more for domestic and import engines. Searchable by manufacturer, family, or VIN.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/engine-data" className="block group">
              <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all h-full">
                <h3 className="font-bold text-lg group-hover:text-[#E85D04] transition-colors mb-2">VIN Decoder &amp; Engine Specs</h3>
                <p className="text-sm text-gray-500">Enter a VIN or browse by manufacturer to find complete engine specifications, head data, and clearance values.</p>
              </div>
            </Link>
            <Link href="/calculators/bolt-spec-lookup" className="block group">
              <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all h-full">
                <h3 className="font-bold text-lg group-hover:text-[#E85D04] transition-colors mb-2">Hardware &amp; Bolt Specs</h3>
                <p className="text-sm text-gray-500">Head bolt and main bolt thread sizes, diameters, torque specs, and ARP upgrade part numbers for popular engine platforms.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Feedback section */}
      <section className="py-16 px-4 bg-[#1a1a1a]">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest mb-3">We Build What You Need</p>
            <h2 className="text-3xl font-bold text-white mb-3">Got a Suggestion?</h2>
            <p className="text-gray-400">
              Want a calculator we don't have yet? Missing a spec or feature? We read every single message and build based on what you need. Over half our calculators were built from user requests.
            </p>
          </div>

          {submitted ? (
            <div className="bg-[#242424] border border-green-700/40 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-bold text-xl mb-2">Thanks for the suggestion!</h3>
              <p className="text-gray-400">We appreciate your input. We'll review it and get to work.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-300 underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleFeedback} className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Your Name <span className="text-gray-600">(optional)</span></label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="First name"
                    className="bg-[#1a1a1a] border-[#3a3a3a] text-white placeholder:text-gray-600 focus-visible:ring-[#E85D04]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Email <span className="text-gray-600">(optional)</span></label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-[#1a1a1a] border-[#3a3a3a] text-white placeholder:text-gray-600 focus-visible:ring-[#E85D04]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Your Suggestion <span className="text-red-400">*</span></label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Tell us what calculator or feature you'd like to see..."
                  className="bg-[#1a1a1a] border-[#3a3a3a] text-white placeholder:text-gray-600 focus-visible:ring-[#E85D04] resize-none"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full bg-[#E85D04] hover:bg-[#d04f00] text-white font-semibold gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Sending..." : "Send Suggestion"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Or email us directly at <a href="mailto:joe@engine-build.com" className="text-[#E85D04] hover:underline">joe@engine-build.com</a>
            {" "}&bull;{" "}
            <Link href="/contact" className="text-[#E85D04] hover:underline">Contact page</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
