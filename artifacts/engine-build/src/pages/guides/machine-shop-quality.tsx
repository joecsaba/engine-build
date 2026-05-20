import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MachineShopQualityGuide() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link href="/guides" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Guides
      </Link>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Intermediate</span>
          <h1 className="text-4xl font-bold mt-2 mb-1">How to Evaluate Machine Shop Work</h1>
          <p className="text-muted-foreground">What to inspect, red flags to catch, and questions to ask before paying.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="w-4 h-4 mr-2" />Print</Button>
      </div>
      <div className="space-y-6">
        <p className="text-muted-foreground text-lg">Not all machine shops do equal work. Some are excellent. Some will take your money, do substandard work, and hand it back in a box. Here's how to inspect what you got and catch problems before you button up an engine that will fail at 5,000 miles.</p>

        <h2 className="text-2xl font-bold">What to Do When You Pick Up Your Block</h2>
        <p className="text-muted-foreground">Don't just take the bag of parts and leave. Spend 15 minutes at the shop asking for a walkthrough of what was done and the measurements taken. A good shop will have documentation. A bad shop will be defensive.</p>

        <h2 className="text-2xl font-bold">Inspecting the Block</h2>
        <div className="space-y-3">
          {[
            { check: "Bore surface finish", what: "The cylinder walls should show a uniform crosshatch pattern at approximately 45° angle. The crosshatch should be visible but fine — not too aggressive, not too faint. There should be NO longitudinal scratches (lines running up and down the bore). Smooth shiny spots indicate the hone didn't cut evenly." },
            { check: "Bore size measurement", what: "Ask for the bore measurement sheet. Verify all bores are within 0.0002\" of each other. The taper (difference between top and bottom of bore) should be under 0.0001\". If they can't provide measurements, that's a problem." },
            { check: "Deck surface finish", what: "Run your fingertip across the deck. A properly decked surface should feel perfectly flat with a fine, uniform machine finish. Any waves, high spots, or rough patches indicate a problem. Use a straight edge if you have one — there should be zero light gap anywhere." },
            { check: "Oil passages", what: "All oil passages must be thoroughly cleaned. Stick a bent piece of wire into every oil gallery. Blow compressed air through all passages. Even one small casting chip or carbon deposit left in a gallery can destroy a bearing within the first hour." },
            { check: "Main bearing bores", what: "Visually inspect each main bearing bore. They should be perfectly smooth and round. Any fretting, scoring, or debris indicates a problem." },
          ].map(({ check, what }, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              <p className="font-bold mb-1">{check}</p>
              <p className="text-sm text-muted-foreground">{what}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold">Inspecting the Cylinder Heads</h2>
        <div className="space-y-3">
          {[
            { check: "Valve seating", what: "Each valve should be seated uniformly. Blue Dykem on the seat, install the valve, and rotate 45° — the Dykem should be wiped uniformly all the way around. Any gap indicates the seat is not concentric or the valve face is not flat." },
            { check: "Deck flatness", what: "A warped head deck causes blown head gaskets. Use a machinist's straight edge and feeler gauges. Maximum allowable warp for most applications is 0.002\". A properly surfaced head should be 0.001\" or better." },
            { check: "Guide clearance", what: "Grab each valve stem and wiggle it side-to-side. There should be minimal movement — 0.001\"–0.003\" for intake, 0.002\"–0.004\" for exhaust (application-dependent). Excessive slop means worn guides that weren't repaired." },
            { check: "Combustion chamber volume", what: "For a performance build, chambers should ideally be cc'd and matched within 0.5 cc. Volume difference between chambers changes the compression ratio and balances power output cylinder-to-cylinder." },
          ].map(({ check, what }, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              <p className="font-bold mb-1">{check}</p>
              <p className="text-sm text-muted-foreground">{what}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold">Red Flags — Walk Away or Get It Redone</h2>
        <div className="space-y-2">
          {[
            "Shop can't provide measurements — \"we set it to spec\" without documentation",
            "Block returned with visible casting flash or debris in the bore",
            "Deck or bore shows witness marks from previous machining that weren't cleaned up",
            "Head gasket surface shows waviness when you hold a straight edge against it",
            "No crosshatch pattern visible in the bores (under-honed = rings won't seat)",
            "Oil passages have not been thoroughly cleaned (evidence: discoloration, debris)",
            "Work was done faster than it should physically take (a proper bore and hone takes time)",
            "No torque plates used when honing for performance applications",
            "Price was dramatically below market rates (quality costs — cheap machining is expensive in the long run)",
          ].map((flag, i) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="text-red-600 font-bold shrink-0">✗</span>
              <p className="text-sm text-red-800">{flag}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold">Questions to Ask Every Machine Shop</h2>
        <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>"Do you use a torque plate when honing?" (Essential for performance builds — simulates head bolt stress on the bore)</li>
          <li>"What is your bore-to-bore consistency spec?" (Answer should be within 0.0002")</li>
          <li>"Do you provide a written measurement sheet?" (If no: warning sign)</li>
          <li>"What equipment do you use for boring and honing?" (CNC equipment is a good sign)</li>
          <li>"How do you clean the block after machining?" (Answer: hot tank or jet wash — NOT just a spray with the garden hose)</li>
          <li>"What is your normal turnaround time?" (Rushed work cuts corners)</li>
        </ol>
      </div>
    </div>
  );
}
