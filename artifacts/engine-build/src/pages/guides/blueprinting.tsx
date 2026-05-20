import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BlueprintingGuide() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link href="/guides" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Guides
      </Link>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Advanced</span>
          <h1 className="text-4xl font-bold mt-2 mb-1">Blueprinting an Engine</h1>
          <p className="text-muted-foreground">What it really means, what gets blueprinted, and whether it's worth the cost.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="w-4 h-4 mr-2" />Print</Button>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">What Is Blueprinting?</h2>
        <p className="text-muted-foreground">Blueprinting means building an engine to exact specifications — matching, balancing, and verifying every measurement to fall at the center of its tolerance range rather than anywhere within it. A factory engine is built to spec. A blueprinted engine is built to the ideal specification. The difference is measured in thousandths of an inch and in power, reliability, and longevity at the limit.</p>
        <p className="text-muted-foreground">The term comes from engineering blueprints — when builders say "I blueprinted it," they mean they built it exactly as the engineering specifications dictate, not as close as is economically practical on an assembly line.</p>

        <h2 className="text-2xl font-bold">What Actually Gets Blueprinted</h2>
        <div className="space-y-3">
          {[
            { component: "Cylinder Bores", what: "All bores measured and honed to identical dimensions within 0.0001\". Taper and out-of-round corrected to nearly zero." },
            { component: "Deck Height", what: "Block decked so all cylinders are exactly the same height from deck to piston at TDC. Compression ratio is equalized across all cylinders." },
            { component: "Crankshaft Journals", what: "All main and rod journals measured and ground to identical dimensions. Roundness and taper verified. Journals polished to correct surface finish for bearing type." },
            { component: "Connecting Rods", what: "Rods weighed and matched — all rods within 1 gram of each other. Pin bores and big-end bores checked for roundness and size." },
            { component: "Pistons", what: "All pistons weighed and matched. Pin fit verified. Piston-to-wall clearance set to the center of the performance range." },
            { component: "Rotating Assembly Balance", what: "Complete rotating assembly (crank, rods, pistons, pins, rings, damper, flywheel) dynamically balanced to near-zero imbalance." },
            { component: "Port Matching", what: "Intake ports, exhaust ports, and gaskets matched so no ledges or lips exist at the port-to-gasket interface. Eliminates turbulence and improves flow." },
            { component: "Valve Jobs", what: "Multi-angle valve job cut to specific geometry. Seat width and angles matched precisely. Valves lapped for perfect seating. Valve stem-to-guide clearance verified." },
            { component: "Cam Degreeing", what: "Cam installed and verified against cam card. Intake centerline set exactly as specified." },
          ].map(({ component, what }, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              <p className="font-bold mb-1">{component}</p>
              <p className="text-sm text-muted-foreground">{what}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold">Cost vs. Benefit</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-muted"><th className="p-2 border text-left">Build Type</th><th className="p-2 border text-left">What's Included</th><th className="p-2 border text-left">Cost Premium</th><th className="p-2 border text-left">Benefit</th></tr></thead>
            <tbody>
              {[
                ["Standard Rebuild", "Bore, hone, deck, valve job, new bearings", "$0", "Baseline — factory-spec performance"],
                ["Performance Rebuild", "Above + clearances at performance spec, decent balance job", "+$200–$500", "10-15% better reliability, marginal power gain"],
                ["Partial Blueprint", "Above + port match, cam degree, exact clearances", "+$500–$1,500", "Consistent power, 15-25% more margin before failure"],
                ["Full Blueprint", "Everything — matched rods, pistons, bore-to-bore identical, full balance, all ports matched, all clearances center-spec", "+$2,000–$5,000+", "Maximum power, reliability, and engine life. Required for serious race engines"],
              ].map(([build, included, cost, benefit], i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <td className="p-2 border font-medium">{build}</td>
                  <td className="p-2 border text-muted-foreground">{included}</td>
                  <td className="p-2 border font-bold">{cost}</td>
                  <td className="p-2 border">{benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="font-bold mb-1">The Honest Answer on "Is It Worth It?"</p>
          <p className="text-sm text-muted-foreground">For a street car that sees 6,000 RPM occasionally: a standard good-quality rebuild with proper clearances and a balance job is 90% of the benefit at 30% of the cost. For a race engine that sees 7,500+ RPM regularly under competition loads, a full blueprint isn't optional — it's the price of reliability. Everything in between is a judgment call based on your budget, goals, and how angry you'll be when it lets go at the worst possible moment.</p>
        </div>
      </div>
    </div>
  );
}
