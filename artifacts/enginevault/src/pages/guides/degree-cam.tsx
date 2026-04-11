import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DegreeCamGuide() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link href="/guides" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Guides
      </Link>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Intermediate</span>
          <h1 className="text-4xl font-bold mt-2 mb-1">How to Degree a Camshaft</h1>
          <p className="text-muted-foreground">Finding true TDC, using the degree wheel, and verifying cam timing.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="w-4 h-4 mr-2" />Print</Button>
      </div>

      <div className="space-y-6">
        <p className="text-muted-foreground text-lg">Degreeing a camshaft verifies that the cam is installed in the correct position relative to the crankshaft. Even cams marked "straight up" can be off by several degrees from the manufacturer. A few degrees of advance or retard shifts the power band significantly — degreeing it costs 2 hours and can be the difference between a good engine and a great one.</p>

        <h2 className="text-2xl font-bold">Tools Required</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Degree wheel (at least 12" diameter — larger = more accurate)</li>
          <li>Dial indicator with magnetic base</li>
          <li>Piston stop (threaded into spark plug hole)</li>
          <li>Stiff wire or light pointer for the degree wheel</li>
          <li>Cam card (spec sheet from cam manufacturer)</li>
          <li>Socket and ratchet for rotating engine</li>
        </ul>

        <h2 className="text-2xl font-bold">Step 1: Find True TDC</h2>
        <p className="text-muted-foreground">The timing mark on the harmonic balancer is NOT reliable for degreeing purposes — it can be off by several degrees. You must find true TDC (top dead center) using a piston stop.</p>
        <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>Thread a piston stop into the #1 spark plug hole. If you don't have a piston stop, drill a hole through a spark plug and thread a bolt through it.</li>
          <li>Rotate the engine forward until the piston contacts the stop. Read the degree wheel — mark this number (e.g., 25° BTDC).</li>
          <li>Rotate the engine BACKWARD until the piston contacts the stop on the other side. Read the degree wheel (e.g., 25° ATDC if your timing marks are symmetric).</li>
          <li>True TDC is exactly halfway between these two numbers. Adjust your degree wheel pointer until the midpoint reads 0° (TDC).</li>
          <li>Remove the piston stop before proceeding.</li>
        </ol>

        <h2 className="text-2xl font-bold">Step 2: Set Up the Dial Indicator</h2>
        <p className="text-muted-foreground">Mount the dial indicator so the plunger contacts the top of an intake lifter on cylinder #1, perpendicular to the lifter travel. The lifter must be in the lifter bore (not floating) and the pushrod must be removed or the indicator must be on the lifter directly.</p>

        <h2 className="text-2xl font-bold">Step 3: Find Maximum Lift</h2>
        <p className="text-muted-foreground">Rotate the engine slowly and watch the dial indicator. Find the point where the indicator reads maximum — this is maximum cam lobe lift (the "nose" of the lobe). At this point, record the degree wheel reading. This reading, measured in degrees ATDC, is your intake centerline.</p>

        <h2 className="text-2xl font-bold">Step 4: Compare to Cam Card</h2>
        <p className="text-muted-foreground">The cam card specifies the intake centerline (ICL). Compare your measured ICL to the specified ICL:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-muted"><th className="p-2 border text-left">Your Reading vs. Cam Card</th><th className="p-2 border text-left">Meaning</th><th className="p-2 border text-left">Effect</th></tr></thead>
            <tbody>
              {[
                ["Reading = Cam Card ICL", "Cam installed exactly as ground", "Power band as designed"],
                ["Reading is LESS than Cam Card ICL", "Cam is ADVANCED (shifted earlier)", "More low-end torque, power band moves down in RPM"],
                ["Reading is MORE than Cam Card ICL", "Cam is RETARDED (shifted later)", "More top-end power, power band moves up in RPM, may hurt idle quality"],
              ].map(([read, meaning, effect], i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <td className="p-2 border font-medium">{read}</td>
                  <td className="p-2 border">{meaning}</td>
                  <td className="p-2 border text-muted-foreground">{effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold">Step 5: Adjust with Offset Cam Keys or Adjustable Timing Set</h2>
        <p className="text-muted-foreground">Most cam sprockets use a Woodruff key to lock the sprocket to the cam. Offset Woodruff keys allow 2° advance or retard adjustment. Adjustable timing sets (multiple keyway positions) allow 4°+ adjustment in 2° increments. Repeat the degreeing process after any adjustment to verify.</p>

        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="font-bold mb-1">When to Advance or Retard</p>
          <p className="text-sm text-muted-foreground">Most street performance builds run the cam "straight up" (as ground). If you're optimizing for low-RPM torque and drivability, advance 2–4°. If you want to move the power band up for a high-RPM setup, retard 2–4°. Don't chase big changes — 2° makes a real difference, 8° is usually too much for street use.</p>
        </div>
      </div>
    </div>
  );
}
