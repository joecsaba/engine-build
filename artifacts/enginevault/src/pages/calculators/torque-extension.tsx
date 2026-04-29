import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function TorqueDiagram({ wrenchLength, extensionLength }: { wrenchLength: number; extensionLength: number }) {
  const total = wrenchLength + extensionLength;
  const scale = 340 / Math.max(total, 1);
  const wrenchPx = Math.max(wrenchLength * scale, 60);
  const extPx = Math.max(extensionLength * scale, 30);

  return (
    <svg viewBox="0 0 460 220" className="w-full max-w-[460px] mx-auto" aria-label="Torque extension diagram">
      {/* Pivot / fastener */}
      <circle cx={400} cy={110} r={10} fill="#E85D04" stroke="#fff" strokeWidth={2} />
      <text x={400} y={145} textAnchor="middle" className="fill-muted-foreground text-[11px]">Fastener</text>

      {/* Extension bar */}
      <rect x={400 - extPx} y={104} width={extPx} height={12} rx={3} fill="#E85D04" opacity={0.7} />
      {/* Extension dimension */}
      <line x1={400 - extPx} y1={170} x2={400} y2={170} stroke="#E85D04" strokeWidth={1.5} />
      <line x1={400 - extPx} y1={164} x2={400 - extPx} y2={176} stroke="#E85D04" strokeWidth={1.5} />
      <line x1={400} y1={164} x2={400} y2={176} stroke="#E85D04" strokeWidth={1.5} />
      <text x={400 - extPx / 2} y={186} textAnchor="middle" className="fill-[#E85D04] text-[11px] font-semibold">
        E = {extensionLength}"
      </text>

      {/* Torque wrench body */}
      <rect x={400 - extPx - wrenchPx} y={102} width={wrenchPx} height={16} rx={4} fill="#888" />
      {/* Handle grip area */}
      <rect x={400 - extPx - wrenchPx} y={100} width={40} height={20} rx={5} fill="#666" />
      {/* Arrow showing force at handle */}
      <line x1={400 - extPx - wrenchPx + 20} y1={90} x2={400 - extPx - wrenchPx + 20} y2={60} stroke="#3b82f6" strokeWidth={2} markerEnd="url(#arrowUp)" />
      <text x={400 - extPx - wrenchPx + 20} y={52} textAnchor="middle" className="fill-[#3b82f6] text-[11px] font-semibold">Force</text>

      {/* Wrench dimension */}
      <line x1={400 - extPx - wrenchPx} y1={40} x2={400 - extPx} y2={40} stroke="#888" strokeWidth={1.5} />
      <line x1={400 - extPx - wrenchPx} y1={34} x2={400 - extPx - wrenchPx} y2={46} stroke="#888" strokeWidth={1.5} />
      <line x1={400 - extPx} y1={34} x2={400 - extPx} y2={46} stroke="#888" strokeWidth={1.5} />
      <text x={400 - extPx - wrenchPx / 2} y={34} textAnchor="middle" className="fill-gray-400 text-[11px] font-semibold">
        L = {wrenchLength}"
      </text>

      {/* Total dimension */}
      <line x1={400 - extPx - wrenchPx} y1={205} x2={400} y2={205} stroke="#fff" strokeWidth={1} strokeDasharray="4 2" />
      <line x1={400 - extPx - wrenchPx} y1={199} x2={400 - extPx - wrenchPx} y2={211} stroke="#fff" strokeWidth={1} />
      <line x1={400} y1={199} x2={400} y2={211} stroke="#fff" strokeWidth={1} />
      <text x={400 - (extPx + wrenchPx) / 2} y={218} textAnchor="middle" className="fill-white text-[10px]">
        Total = {total}" (L + E)
      </text>

      {/* Junction indicator */}
      <line x1={400 - extPx} y1={96} x2={400 - extPx} y2={126} stroke="#fff" strokeWidth={1} strokeDasharray="3 2" />

      {/* Arrow marker */}
      <defs>
        <marker id="arrowUp" markerWidth={8} markerHeight={8} refX={4} refY={8} orient="auto">
          <path d="M0,8 L4,0 L8,8" fill="#3b82f6" />
        </marker>
      </defs>
    </svg>
  );
}

export default function TorqueExtensionCalculator() {
  const [desiredTorque, setDesiredTorque] = useState("80");
  const [wrenchLength, setWrenchLength] = useState("18");
  const [extensionLength, setExtensionLength] = useState("3");

  const torqueNum = parseFloat(desiredTorque) || 0;
  const wrenchNum = parseFloat(wrenchLength) || 0;
  const extNum = parseFloat(extensionLength) || 0;

  const totalLength = wrenchNum + extNum;
  const adjustedTorque = totalLength > 0 ? torqueNum * (wrenchNum / totalLength) : 0;
  const adjustedNm = adjustedTorque * 1.35582;
  const torqueReduction = torqueNum > 0 ? ((torqueNum - adjustedTorque) / torqueNum) * 100 : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <SEOHead
        title="Torque Extension Calculator — Crow's Foot & Wobble Adapter Correction"
        description="Calculate corrected torque wrench settings when using crow's foot adapters, extensions, or wobble sockets that change the effective lever arm. Free engine builder tool."
        canonical="/calculators/torque-extension"
        keywords="torque extension calculator, crow's foot torque correction, wobble socket torque, torque wrench adapter correction, torque extension formula"
      />
      <h1 className="text-3xl font-bold mb-2">Torque Extension Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Calculate the corrected torque wrench setting when using a crow's foot, extension, or wobble adapter that adds to the effective lever arm.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Desired Torque (ft-lbs)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={desiredTorque}
                  placeholder="e.g. 80"
                  onChange={e => setDesiredTorque(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">The torque spec from your service manual</p>
              </div>
              <div className="space-y-1">
                <Label>Torque Wrench Length — L (inches)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={wrenchLength}
                  placeholder="e.g. 18"
                  onChange={e => setWrenchLength(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Measured from the center of the handle to the square drive</p>
              </div>
              <div className="space-y-1">
                <Label>Extension Length — E (inches)</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={extensionLength}
                  placeholder="e.g. 3"
                  onChange={e => setExtensionLength(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Length the adapter adds to the lever arm (crow's foot, wobble adapter, etc.)</p>
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                <p className="font-mono font-medium">Wrench Setting = Spec &times; L / (L + E)</p>
                <p className="text-muted-foreground text-xs">
                  The extension increases the effective lever arm. Since the wrench measures torque at its own length, you must set it <em>lower</em> so the fastener sees the correct torque.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
            <CardContent>
              <TorqueDiagram wrenchLength={wrenchNum || 18} extensionLength={extNum || 3} />
              <div className="mt-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">L</strong> (gray) is your torque wrench — the distance from where you grip to the square drive.
                </p>
                <p>
                  <strong className="text-[#E85D04]">E</strong> (orange) is the extension or crow's foot that adds length beyond the square drive toward the fastener.
                </p>
                <p>
                  The wrench "thinks" the lever arm is <strong>L</strong>, but the actual lever arm is <strong>L + E</strong>. If you set the wrench to the full spec, you'll over-torque the fastener. The correction reduces your wrench setting proportionally.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-[#1a1a1a] text-white">
            <CardHeader><CardTitle>Set Your Wrench To</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Corrected Wrench Setting</p>
                <p className="text-5xl font-bold text-primary">{adjustedTorque.toFixed(1)} ft-lbs</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">In Newton-meters</p>
                <p className="text-2xl font-bold">{adjustedNm.toFixed(1)} Nm</p>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <p className="text-gray-400 text-sm">Torque Reduction</p>
                <p className="text-lg font-bold">{torqueReduction.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Calculation Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Desired torque (spec)</span>
                <span className="font-bold">{torqueNum.toFixed(1)} ft-lbs</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Wrench length (L)</span>
                <span className="font-bold">{wrenchNum}" </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Extension length (E)</span>
                <span className="font-bold">{extNum}"</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Total lever arm (L + E)</span>
                <span className="font-bold">{totalLength}"</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Formula</span>
                <span className="font-mono text-xs">{torqueNum} &times; {wrenchNum} / {totalLength} = {adjustedTorque.toFixed(1)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>When Do You Need This?</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong className="text-foreground">Yes — adjust torque when:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Crow's foot oriented <strong>in-line (0&deg;)</strong> with the wrench handle — extends the lever arm</li>
                <li>Any adapter that <strong>lengthens the distance</strong> from your hand to the fastener along the wrench axis</li>
                <li>Crow's foot at 180&deg; (pointing back toward you) — <em>shortens</em> the lever arm, use a negative E</li>
              </ul>
              <p className="mt-3"><strong className="text-foreground">No — no adjustment needed when:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Crow's foot at <strong>90&deg;</strong> to the wrench — the lever arm stays the same</li>
                <li>Using a standard <strong>in-line extension bar</strong> (same axis, pivot doesn't move)</li>
                <li>Using a <strong>wobble socket</strong> that stays on the same centerline</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Torque Extension Correction</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Torque is force multiplied by distance. A torque wrench is calibrated to measure force at a specific lever arm length — the distance from your hand to the square drive. When you attach a crow's foot or offset adapter, you extend that lever arm. The wrench still reads the same, but the fastener now sees more torque because the effective distance is longer. If you set the wrench to the full spec, you'll over-torque the fastener.
          </p>
          <p>
            The correction formula is straightforward: <strong>Wrench Setting = Desired Torque &times; (L / (L + E))</strong>. For example, if your wrench is 18 inches long and you add a 3-inch crow's foot, the correction factor is 18/21 = 0.857. To achieve 80 ft-lbs at the fastener, you set the wrench to 68.6 ft-lbs. The wrench under-reads by design — the extra lever arm makes up the difference.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">Crow's Foot Angle Matters</h3>
          <p>
            This formula applies when the crow's foot is oriented <strong>in-line (0&deg;)</strong> with the torque wrench handle — pointing straight away from you, extending the lever arm. If the crow's foot is at <strong>90 degrees</strong> to the wrench handle, no correction is needed because the extension goes sideways, not along the lever arm, so the effective distance from your hand to the fastener doesn't change. If the crow's foot points back toward you (180&deg;), the lever arm actually shortens and you'd need to <em>increase</em> the wrench setting. The easiest approach in tight spaces is to orient the crow's foot at 90&deg; and skip the math entirely.
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-4">In-Line Extensions Don't Need Correction</h3>
          <p>
            A standard extension bar or wobble socket that stays on the same axis as the torque wrench does <em>not</em> change the effective lever arm. The pivot point is still at the square drive. The correction only applies when an adapter changes the lever arm length along the axis of the wrench handle — i.e., when it changes the distance between where you grip and where the fastener is, measured along the direction of force.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
