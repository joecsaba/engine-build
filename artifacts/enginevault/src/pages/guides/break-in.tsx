import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BreakInGuide() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link href="/guides" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Guides
      </Link>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Beginner</span>
          <h1 className="text-4xl font-bold mt-2 mb-1">Engine Break-In Procedure</h1>
          <p className="text-muted-foreground">Flat-tappet AND roller cam break-in. The ZDDP controversy explained.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="w-4 h-4 mr-2" />Print</Button>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Flat Tappet Cam Owners — Read This First:</strong> Modern API SM and SN rated engine oils do NOT have sufficient ZDDP (zinc dialkyl dithiophosphate) to protect flat tappet cams during break-in. This is not a rumor — it is a documented fact. Using the wrong oil WILL wipe the lobes on a new flat tappet cam within the first 20 minutes of operation.
        </div>

        <h2 className="text-2xl font-bold">The ZDDP Story</h2>
        <p className="text-muted-foreground">Zinc dialkyldithiophosphate (ZDDP) is an anti-wear additive that protects metal surfaces under high pressure — exactly the situation at the cam lobe-to-lifter interface. Since the mid-2000s, the EPA required oil manufacturers to reduce ZDDP to protect catalytic converters in modern fuel-injected engines (which use roller cams and don't need it). The result: modern API SM/SN oils have ~600–800 ppm ZDDP. Flat tappet cams need ~1200–1500 ppm for safe break-in.</p>

        <h2 className="text-2xl font-bold">Approved Break-In Oils for Flat Tappet Cams</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-muted"><th className="p-2 border text-left">Product</th><th className="p-2 border text-left">ZDDP Level</th><th className="p-2 border text-left">Notes</th></tr></thead>
            <tbody>
              {[
                ["Driven HR3 (10W-30)", "~1,800 ppm", "Purpose-built break-in oil, excellent choice"],
                ["COMP Cams Break-In Oil", "~1,400 ppm", "Compatible with all cam manufacturers"],
                ["Valvoline VR1 Racing (20W-50)", "~1,300 ppm", "Available at most auto parts stores"],
                ["Joe Gibb's Break-In Oil", "~1,800 ppm", "Premium option for high-performance builds"],
                ["Brad Penn Grade 1 (20W-50)", "~1,500 ppm", "Pennsylvania-based, excellent flat tappet choice"],
                ["Modern API SN oil + ZDDP additive (ZDDPlus, Comp Cams Engine Break-In)", "~600 + 600 ppm", "Works but less ideal than purpose-built oil"],
              ].map(([prod, zddp, notes], i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <td className="p-2 border font-medium">{prod}</td>
                  <td className="p-2 border text-green-700 font-mono">{zddp}</td>
                  <td className="p-2 border text-muted-foreground">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold">Flat Tappet Cam Break-In Procedure</h2>
        <p className="text-muted-foreground">This is the most critical procedure in flat tappet engine assembly. There is NO second chance if you do it wrong.</p>

        <div className="space-y-4">
          {[
            { step: "Before First Start", content: "Prime the oil system. Use an oil priming tool (or a drill motor spinning the oil pump driveshaft) to circulate oil through the engine before it ever fires. You want oil pressure established before the first revolution. Minimum 15–30 seconds of pumping." },
            { step: "Fill with Break-In Oil", content: "Use one of the approved high-ZDDP oils listed above. Fill to the proper level. Check the filter and drain plug." },
            { step: "Pre-Set the Timing", content: "Set ignition timing conservatively — 10-12° BTDC for most street engines. You can dial it in later. Running too much advance during break-in causes heat and detonation stress." },
            { step: "Start the Engine — Immediately to 2,000–2,500 RPM", content: "DO NOT let the engine idle. The moment it fires, bring it to 2,000–2,500 RPM. This is not optional. At idle, the cam lobes receive insufficient oiling AND the spring pressure vs. lifter load ratio is worst at low RPM. Lobes wipe at idle on new flat tappet cams — this is why." },
            { step: "Vary the RPM Continuously for 20 Minutes", content: "For the next 20 minutes, continuously vary the RPM between 1,500 and 2,500 RPM. Do not hold a steady RPM. This varying load cycles the cam lobes and helps them seat properly against the lifters. Watch: oil pressure (should be 40+ PSI), coolant temperature (should stabilize under 220°F), and listen for any unusual noise." },
            { step: "What to Listen For", content: "You should hear: the normal sound of valvetrain that gradually quietens as it seats. You should NOT hear: a rapid ticking that gets louder (potential lobe failure), knocking (detonation — reduce timing), or falling oil pressure." },
            { step: "After 20 Minutes", content: "Shut down and let cool to ambient temperature. Change the oil and filter — the break-in oil has done its job and is now contaminated with cam/ring break-in debris. Install your regular (ZDDP-appropriate) running oil." },
            { step: "First 500 Miles", content: "Vary your driving. Avoid sustained RPM. Do a few moderate acceleration runs from 30–60 MPH. Change oil again at 500 miles — rings continue to seat and contaminate the oil." },
          ].map(({ step, content }, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-sm">{i + 1}</div>
              <div>
                <p className="font-bold mb-1">{step}</p>
                <p className="text-sm text-muted-foreground">{content}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold">Roller Cam Break-In</h2>
        <p className="text-muted-foreground">Hydraulic and solid roller cams are FAR easier to break in. Because the rolling element (wheel) contacts the lobe instead of a sliding flat surface, the high-pressure interface is completely different — no wiping risk, no ZDDP requirement.</p>

        <div className="space-y-3">
          {[
            ["Oil requirement", "Standard API SN or SP rated oil is fine. Any good synthetic is excellent."],
            ["RPM requirement", "Normal idle is acceptable for roller cams. No need to hold 2,000 RPM."],
            ["Duration", "30 minute warm-up cycle is sufficient. Listen and monitor gauges."],
            ["Ring break-in still matters", "Even with a roller cam, rings still need time to seat. Vary load and avoid sustained WOT for the first 500 miles. Change oil at 500 miles."],
          ].map(([label, content], i) => (
            <div key={i} className="flex gap-4 p-3 rounded-lg border">
              <span className="font-bold text-sm min-w-[160px] shrink-0">{label}:</span>
              <span className="text-sm text-muted-foreground">{content}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="font-bold mb-1">Long-Term ZDDP for Flat Tappet Engines</p>
          <p className="text-sm text-muted-foreground">For the life of a flat tappet engine, use either a dedicated high-ZDDP oil (Valvoline VR1, Brad Penn Grade 1) or add a ZDDP supplement to your normal oil change. The first oil change (after the 20-minute break-in) is the most critical — after that, maintaining ~1000+ ppm ZDDP is sufficient for ongoing wear protection.</p>
        </div>
      </div>
    </div>
  );
}
