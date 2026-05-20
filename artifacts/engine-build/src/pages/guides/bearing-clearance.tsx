import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BearingClearanceGuide() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link href="/guides" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Guides
      </Link>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Beginner</span>
          <h1 className="text-4xl font-bold mt-2 mb-1">How to Check Bearing Clearance</h1>
          <p className="text-muted-foreground">The definitive guide to using Plastigage for main and rod bearings.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="w-4 h-4 mr-2" />Print</Button>
      </div>

      <div className="prose max-w-none text-foreground space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Safety Note:</strong> Bearing clearance is one of the most critical measurements in engine assembly. Too tight = bearing spun and engine destroyed. Too loose = insufficient oil pressure, premature wear. Take your time and measure correctly.
        </div>

        <h2 className="text-2xl font-bold">What is Plastigage?</h2>
        <p>Plastigage is a calibrated strip of crushable plastic used to measure the oil clearance between a bearing and its journal. When the cap is torqued down on the Plastigage, the plastic is crushed to a width proportional to the clearance. The width is then compared to the printed gauge on the Plastigage package to read the clearance in thousandths of an inch.</p>
        <p>Plastigage comes in three grades:
          <br />• <strong>PG-1 (Green):</strong> 0.001"–0.003" — Use for most main and rod bearings
          <br />• <strong>PG-2 (Red):</strong> 0.002"–0.006" — Use when you expect looser clearances
          <br />• <strong>PG-3 (Blue):</strong> 0.004"–0.009" — Use for very loose clearances or large diesels</p>

        <h2 className="text-2xl font-bold">What You Need</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Plastigage (appropriate grade)</li>
          <li>Torque wrench (capable of your specific torque values)</li>
          <li>Clean rags and brake cleaner or acetone</li>
          <li>Factory service manual or torque spec reference</li>
          <li>Scissors (to cut Plastigage strips)</li>
          <li>Feeler gauges (as a cross-check)</li>
        </ul>

        <h2 className="text-2xl font-bold">Step-by-Step Procedure</h2>

        <h3 className="text-xl font-bold">Step 1: Clean Everything</h3>
        <p>The journal (crank), bearing shells, and cap bore must be absolutely clean and DRY. Any oil, assembly lube, or debris will give you a false reading. Clean with brake cleaner and dry completely. This step matters — a film of oil can throw your reading off by 0.001".</p>

        <div className="p-4 bg-muted rounded-lg">
          <svg viewBox="0 0 400 120" className="w-full">
            <rect x="20" y="40" width="360" height="40" rx="4" fill="#e5e7eb" stroke="#9ca3af" />
            <ellipse cx="200" cy="60" rx="40" ry="30" fill="#374151" />
            <text x="200" y="65" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Crank Journal</text>
            <text x="200" y="25" textAnchor="middle" fill="#6b7280" fontSize="11">Bearing shell (installed, clean, dry)</text>
            <rect x="160" y="55" width="80" height="3" fill="#E85D04" />
            <text x="200" y="115" textAnchor="middle" fill="#E85D04" fontSize="11" fontWeight="bold">Plastigage strip placed along journal</text>
          </svg>
        </div>

        <h3 className="text-xl font-bold">Step 2: Install Lower Bearing Shell</h3>
        <p>Install the lower bearing shell (without any lubrication) in the connecting rod or main cap. Make sure it clicks into place — the tang on the bearing aligns with the notch in the cap. The bearing must be fully seated.</p>

        <h3 className="text-xl font-bold">Step 3: Place the Plastigage</h3>
        <p>Cut a strip of Plastigage approximately 1/2" shorter than the bearing width. Place it on the journal parallel to the crankshaft centerline. The strip goes on the crankshaft journal itself — NOT on the bearing. Position it at the widest part of the journal, avoiding the oil holes.</p>

        <h3 className="text-xl font-bold">Step 4: Install the Cap and Torque</h3>
        <p>Install the cap (and upper bearing shell if checking mains) carefully — DO NOT rotate the crankshaft. Any rotation will smear the Plastigage and invalidate the reading. Torque the bolts to specification in the correct sequence. For most applications, torque in three steps: 1/3 → 2/3 → full torque.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-muted"><th className="p-2 border text-left">Engine</th><th className="p-2 border text-left">Main Bearing Torque</th><th className="p-2 border text-left">Rod Bearing Torque</th></tr></thead>
            <tbody>
              {[
                ["Chevy 350 (SBC)", "70 ft-lbs (4-bolt outer: 65)", "45 ft-lbs"],
                ["GM LS1/LS2/LS3", "105 Nm (77 ft-lbs)", "58 Nm (43 ft-lbs)"],
                ["GM LS7", "120 Nm + 80° (outer studs)", "65 Nm + 75°"],
                ["Ford 302 Windsor", "95-105 ft-lbs", "19-24 ft-lbs (ARP)"],
                ["Ford 351 Windsor", "95-105 ft-lbs", "40-45 ft-lbs"],
                ["Toyota 2JZ-GTE", "90 Nm + 90°", "57 Nm + 90°"],
                ["Honda K20A", "74 Nm (55 ft-lbs)", "32 Nm + 90°"],
              ].map(([eng, main, rod], i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <td className="p-2 border font-medium">{eng}</td>
                  <td className="p-2 border">{main}</td>
                  <td className="p-2 border">{rod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-bold">Step 5: Remove the Cap and Read</h3>
        <p>Remove the cap carefully without rotating the crankshaft. You'll see the Plastigage has been crushed into a flat strip. Using the printed gauge on the Plastigage package, measure the widest point of the crushed strip. The package has two scales — use the one matching your Plastigage grade (mm or inches).</p>

        <div className="p-4 bg-muted rounded-lg">
          <svg viewBox="0 0 400 100" className="w-full">
            <rect x="50" y="20" width="300" height="60" rx="4" fill="#f9fafb" stroke="#e5e7eb" />
            <rect x="100" y="35" width="200" height="10" rx="2" fill="#E85D04" opacity="0.7" />
            <rect x="120" y="35" width="150" height="10" rx="2" fill="#E85D04" />
            <text x="200" y="75" textAnchor="middle" fill="#6b7280" fontSize="11">Measure widest point of crushed Plastigage</text>
            <line x1="120" y1="25" x2="120" y2="33" stroke="#374151" strokeWidth="1.5" />
            <line x1="270" y1="25" x2="270" y2="33" stroke="#374151" strokeWidth="1.5" />
            <text x="195" y="22" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="bold">Width = 0.002" clearance</text>
          </svg>
        </div>

        <h3 className="text-xl font-bold">Step 6: What to Do With the Reading</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-muted"><th className="p-2 border text-left">Application</th><th className="p-2 border text-left">Factory Spec</th><th className="p-2 border text-left">Performance Build</th></tr></thead>
            <tbody>
              {[
                ["Main Bearing Clearance", "0.0010\"–0.0025\"", "0.0020\"–0.0030\""],
                ["Rod Bearing Clearance", "0.0010\"–0.0025\"", "0.0020\"–0.0028\""],
                ["Camshaft Bearing Clearance", "0.0010\"–0.0030\"", "0.0015\"–0.0025\""],
              ].map(([app, fac, perf], i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <td className="p-2 border font-medium">{app}</td>
                  <td className="p-2 border text-green-700">{fac}</td>
                  <td className="p-2 border text-blue-700">{perf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p><strong>If clearance is too tight:</strong> Have the machine shop either use 0.001" undersize bearings or lightly polish the journal. DO NOT try to fix this yourself by grinding the crank — even 0.001" too tight will spin a bearing.</p>
        <p><strong>If clearance is too loose:</strong> The journal is undersized (worn or already ground). Have the machine shop regrind the crank to the next undersize and install matching undersize bearings (0.010", 0.020", or 0.030").</p>

        <h3 className="text-xl font-bold">Step 7: Clean Off the Plastigage</h3>
        <p>Plastigage is water-soluble. Wipe it off with a clean rag and a drop of assembly lube. Make sure every bit is removed from the journal and bearing surface before final assembly.</p>

        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="font-bold mb-1">Pro Tip: Measure All Journals</p>
          <p className="text-sm text-muted-foreground">Don't just check one bearing — check every main and every rod. Crankshaft journals wear unevenly, and a crank that measures in spec at journal #1 may be 0.003" worn at journal #4. A few minutes of checking now saves an engine rebuild later.</p>
        </div>
      </div>
    </div>
  );
}
