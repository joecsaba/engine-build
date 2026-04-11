import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RingGapGuide() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link href="/guides" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Guides
      </Link>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Beginner</span>
          <h1 className="text-4xl font-bold mt-2 mb-1">How to Set Piston Ring End Gap</h1>
          <p className="text-muted-foreground">Proper ring filing technique, stagger positions, and oil ring installation.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="w-4 h-4 mr-2" />Print</Button>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Critical:</strong> Setting ring gap is one of the few engine assembly steps where you cannot undo a mistake. File too little — you can remove more. File too much — the ring is ruined. Take your time and sneak up on the spec.
        </div>

        <h2 className="text-2xl font-bold">Why Ring Gap Matters</h2>
        <p className="text-muted-foreground">As the engine heats to operating temperature, the piston rings expand. If the ring ends butt together (zero gap), the ring buckles outward and destroys the ring land — often taking the piston and cylinder wall with it. Too much gap allows combustion gases to blow by, reducing power and contaminating the oil. The gap must fall within a specific range for your bore size and application.</p>

        <h2 className="text-2xl font-bold">Tools Required</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Ring filing tool (hand file or dedicated ring filer — ring filer preferred for consistency)</li>
          <li>Feeler gauges (0.001"–0.050" set)</li>
          <li>Piston (to use as a deck tool to square the ring in the bore)</li>
          <li>Sharpie marker (to mark ring orientation)</li>
          <li>Clean rags</li>
          <li>Calipers (optional, for confirmation)</li>
        </ul>

        <h2 className="text-2xl font-bold">Step 1: Identify Each Ring</h2>
        <p className="text-muted-foreground">Most ring sets include: top compression ring (usually marked "1" or "TOP"), second compression ring (marked "2"), and oil control assembly (3 pieces: two thin rails and an expander). The top ring is typically thinner and may have a different face coating. The second ring often has a slight bevel on the inner face — this must face upward.</p>

        <h2 className="text-2xl font-bold">Step 2: Square the Ring in the Bore</h2>
        <p className="text-muted-foreground">Drop the ring into the cylinder bore. Use the piston (upside down) to push the ring down approximately 1" below the deck surface. This ensures the ring is square to the bore — critical for an accurate gap measurement. Do NOT just drop the ring in by hand; it will tilt and give a false reading.</p>

        <div className="p-4 bg-muted rounded-lg">
          <svg viewBox="0 0 300 160" className="w-full max-w-xs mx-auto">
            <rect x="50" y="10" width="200" height="140" rx="4" fill="#f3f4f6" stroke="#9ca3af" />
            <rect x="65" y="10" width="170" height="130" rx="2" fill="none" stroke="#6b7280" strokeWidth="2" strokeDasharray="4,2" />
            <rect x="65" y="50" width="170" height="6" rx="2" fill="#374151" />
            <rect x="125" y="50" width="15" height="6" fill="#f3f4f6" />
            <text x="150" y="44" textAnchor="middle" fill="#E85D04" fontSize="11" fontWeight="bold">Ring (squared)</text>
            <line x1="133" y1="53" x2="133" y2="56" stroke="#E85D04" strokeWidth="2" />
            <line x1="140" y1="53" x2="140" y2="56" stroke="#E85D04" strokeWidth="2" />
            <text x="150" y="85" textAnchor="middle" fill="#6b7280" fontSize="11">↑ 1" from top of bore</text>
            <rect x="100" y="10" width="100" height="20" rx="2" fill="#9ca3af" />
            <text x="150" y="23" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Piston (upside down)</text>
          </svg>
        </div>

        <h2 className="text-2xl font-bold">Step 3: Measure the Gap</h2>
        <p className="text-muted-foreground">Insert feeler gauges into the ring gap. The correct size is the largest gauge that passes through the gap with light, even drag — not tight, not loose. Record this measurement. Compare it to your target gap (use the Ring Gap Calculator for your bore and application).</p>

        <h2 className="text-2xl font-bold">Step 4: File the Ring to Spec</h2>
        <p className="text-muted-foreground">If the gap is too tight (almost all fresh rings will be), you must file the ends. Mount the ring file (or use a fine-cut file) and file with smooth, even strokes perpendicular to the ring face. Never file at an angle — this creates a bevel that causes the ring to catch on the ring land.</p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>File 2–3 strokes, then re-measure. Removing 0.001" at a time gives you control.</li>
          <li>Always file from the OUTSIDE of the ring inward (toward the inside diameter). This prevents chipping the face coating.</li>
          <li>After filing, deburr the sharp edge with a fine stone or 400-grit paper — one light pass each side.</li>
          <li>Blow out all filing debris with compressed air and wipe the ring with a clean rag before re-measuring.</li>
        </ul>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <strong>Warning:</strong> Moly-faced (grey) rings and nitrided rings CANNOT be filed with a standard file. Use only a proper ring grinding setup. Filing a moly ring with a hand file destroys the face coating and the ring is worthless. When in doubt, check with your ring manufacturer.
        </div>

        <h2 className="text-2xl font-bold">Step 5: Stagger Ring Gaps</h2>
        <p className="text-muted-foreground">With all rings filed and checked, the gaps must be positioned around the piston to minimize blowby. No two ring gaps should be lined up. A common stagger for an 8-cylinder engine:</p>

        <div className="p-4 bg-muted rounded-lg">
          <svg viewBox="0 0 200 200" className="w-48 mx-auto">
            <circle cx="100" cy="100" r="85" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#e5e7eb" strokeWidth="2" />
            <circle cx="100" cy="100" r="35" fill="none" stroke="#e5e7eb" strokeWidth="2" />
            <text x="100" y="104" textAnchor="middle" fill="#6b7280" fontSize="10">Piston</text>
            <rect x="95" y="13" width="10" height="5" fill="#22c55e" rx="1" />
            <text x="100" y="10" textAnchor="middle" fill="#22c55e" fontSize="9">TOP (12 o'clock)</text>
            <rect x="155" y="95" width="10" height="5" fill="#3b82f6" rx="1" />
            <text x="178" y="100" textAnchor="middle" fill="#3b82f6" fontSize="9">2nd</text>
            <rect x="95" y="182" width="10" height="5" fill="#f97316" rx="1" />
            <text x="100" y="198" textAnchor="middle" fill="#f97316" fontSize="9">Oil Rail 1</text>
            <rect x="35" y="95" width="10" height="5" fill="#a855f7" rx="1" />
            <text x="15" y="100" textAnchor="middle" fill="#a855f7" fontSize="9">Oil Rail 2</text>
          </svg>
          <p className="text-center text-xs text-muted-foreground mt-2">Typical gap stagger positions</p>
        </div>

        <p className="text-muted-foreground">A good rule: position the top ring gap at 12 o'clock (toward the thrust side), second ring at 4–5 o'clock, and oil rails at 8 o'clock and 2 o'clock. Keep all gaps away from the pin bore (3 and 9 o'clock positions).</p>

        <h2 className="text-2xl font-bold">Step 6: Oil Ring Assembly</h2>
        <p className="text-muted-foreground">The three-piece oil ring assembly requires special care:</p>
        <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>Install the expander first, in the oil ring groove. Do NOT overlap the expander ends — they must butt together, not overlap.</li>
          <li>Install the lower oil rail. Coil it into the groove working around the piston. The gap goes at your chosen stagger position.</li>
          <li>Install the upper oil rail similarly, with its gap positioned 120°–180° away from the lower rail gap.</li>
          <li>Verify neither oil rail bridges the expander gap (check by rotating each rail — it should slide freely).</li>
        </ol>

        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="font-bold mb-1">Pro Tip: Use Ring Pliers</p>
          <p className="text-sm text-muted-foreground">Always use ring installation pliers when installing rings on the piston — never by hand. Ring pliers expand the ring evenly, preventing the ring from being distorted or the ends from digging into the ring land. One distorted ring can cause a compression or oil consumption issue.</p>
        </div>
      </div>
    </div>
  );
}
