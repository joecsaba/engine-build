import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Settings2, Clock, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AdBanner } from "@/components/ads/AdBanner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  { title: "Calculators", desc: "Displacement, compression ratio, ring gap, rod ratio, cam duration & more", icon: Calculator, href: "/calculators", live: true },
  { title: "Cam Guide", desc: "Systematic approach to selecting the right camshaft for your combo", icon: Settings2, href: "/cam-guide", live: true },
  { title: "Torque Specs", desc: "OEM clearance & torque specs for popular engine platforms", icon: Clock, href: "/specs", live: false },
  { title: "Build Sheets", desc: "Component selection, parts pricing, and a full build planner", icon: Clock, href: "/build-sheets", live: false },
];

const calculators = [
  { title: "Compression Ratio", href: "/calculators/compression-ratio", desc: "Static and dynamic compression" },
  { title: "Displacement", href: "/calculators/displacement", desc: "Bore, stroke, cylinder math" },
  { title: "Piston Ring Gap", href: "/calculators/ring-gap", desc: "Application-specific gap specs" },
  { title: "Cam Duration", href: "/calculators/cam-duration", desc: "Advertised to .050\" conversion + overlap" },
  { title: "Rod Ratio", href: "/calculators/rod-ratio", desc: "Stroke to rod length math" },
  { title: "HP / Torque", href: "/calculators/hp-torque", desc: "Power and torque conversion" },
  { title: "Piston Speed", href: "/calculators/piston-speed", desc: "Mean and peak piston velocity" },
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
      const res = await fetch(`${BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            Free, fast calculators for displacement, compression, cam specs, ring gap, rod ratio, and more. No fluff. Just the math.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/calculators">
              <Button className="bg-[#E85D04] hover:bg-[#d04f00] text-white font-bold text-lg px-8 py-6">
                Open Calculators
              </Button>
            </Link>
            <Link href="/cam-guide">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6">
                Cam Selection Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-4 bg-[#1a1a1a]">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <Link key={f.title} href={f.href}>
                <div className={`group h-full p-6 rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center space-y-3 relative ${f.live ? "border-[#2a2a2a] bg-[#242424] hover:border-[#E85D04] hover:shadow-lg hover:shadow-[#E85D04]/10" : "border-[#2a2a2a] bg-[#1e1e1e] opacity-70 cursor-default"}`}>
                  {!f.live && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-gray-400 border border-white/10">
                      Coming Soon
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${f.live ? "bg-[#E85D04]/10 text-[#E85D04] group-hover:bg-[#E85D04] group-hover:text-white" : "bg-white/5 text-gray-600"}`}>
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
              <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest mb-1">Live Now</p>
              <h2 className="text-3xl font-bold tracking-tight">Essential Calculators</h2>
              <p className="text-gray-500 mt-1">Built for engine builders, by engine builders.</p>
            </div>
            <Link href="/calculators">
              <Button variant="outline" className="hidden sm:flex border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white">View All</Button>
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
              <Button variant="outline" className="w-full">View All Calculators</Button>
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

      {/* Feedback section */}
      <section className="py-16 px-4 bg-[#1a1a1a]">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <p className="text-[#E85D04] text-sm font-semibold uppercase tracking-widest mb-3">We Love Your Input</p>
            <h2 className="text-3xl font-bold text-white mb-3">Got a Suggestion?</h2>
            <p className="text-gray-400">
              Want a calculator we don't have yet? Missing a spec or feature? We read every single message and build based on what you need.
            </p>
          </div>

          {submitted ? (
            <div className="bg-[#242424] border border-green-700/40 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-bold text-xl mb-2">Thanks for the suggestion!</h3>
              <p className="text-gray-400">We appreciate your input — it goes directly to the builder. We'll review it and get to work.</p>
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
        </div>
      </section>
    </div>
  );
}
