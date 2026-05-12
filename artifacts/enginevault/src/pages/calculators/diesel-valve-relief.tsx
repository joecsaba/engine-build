import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Info, Wrench, Loader2 } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface CamProfile {
  id: number;
  label: string;
  manufacturer: string;
  partNumber: string;
  intakeDuration: number;
  exhaustDuration: number;
  intakeLift: number;
  exhaustLift: number;
  lsa: number;
  valveReliefRequired: boolean;
  reliefDepth: number;
  requiresUpgradedSprings: boolean;
  requiresUpgradedPushrods: boolean;
  maxPistonProtrusion: number | null;
  minValveFaceDepth: number | null;
  notes: string | null;
}

interface EnginePlatform {
  id: number;
  slug: string;
  label: string;
  manufacturer: string;
  platform: string;
  years: string;
  valveCount: string;
  stockPistonProtrusion: string;
  stockValveFaceDepth: string;
  cams: CamProfile[];
}

/* ── Fetch platforms from API ──────────────────────────────────── */

async function fetchPlatforms(): Promise<EnginePlatform[]> {
  const res = await fetch("/api/diesel-valve-relief/platforms");
  if (!res.ok) throw new Error("Failed to fetch diesel valve relief data");
  const data = await res.json();
  // Normalize numeric strings to numbers for cam profiles
  return data.map((p: any) => ({
    ...p,
    cams: p.cams.map((c: any) => ({
      ...c,
      intakeLift: Number(c.intakeLift),
      exhaustLift: Number(c.exhaustLift),
      reliefDepth: Number(c.reliefDepth),
      maxPistonProtrusion: c.maxPistonProtrusion != null ? Number(c.maxPistonProtrusion) : null,
      minValveFaceDepth: c.minValveFaceDepth != null ? Number(c.minValveFaceDepth) : null,
    })),
  }));
}

/* ── Clearance math ────────────────────────────────────────────── */

interface ClearanceResult {
  pistonToValve: number;
  needsRelief: boolean;
  reliefDepthNeeded: number;
  meetsDropIn: boolean;
  protrusionOk: boolean;
  valveDepthOk: boolean;
  headGasketOption: boolean;
  recommendation: string;
}

function calcClearance(
  pistonProtrusion: number,
  valveFaceDepth: number,
  headGasketThickness: number,
  cam: CamProfile,
): ClearanceResult {
  if (cam.valveReliefRequired) {
    return {
      pistonToValve: 0,
      needsRelief: true,
      reliefDepthNeeded: cam.reliefDepth,
      meetsDropIn: false,
      protrusionOk: false,
      valveDepthOk: false,
      headGasketOption: false,
      recommendation: `This cam requires ${cam.reliefDepth.toFixed(3)}" valve reliefs machined into the pistons — no exceptions. Upgraded valve springs and pushrods are also required.`,
    };
  }

  const maxProt = cam.maxPistonProtrusion ?? 0.020;
  const minDepth = cam.minValveFaceDepth ?? 0.050;

  const protrusionOk = pistonProtrusion <= maxProt;
  const valveDepthOk = valveFaceDepth >= minDepth;

  const estimatedClearance = headGasketThickness + valveFaceDepth - pistonProtrusion;
  const meetsDropIn = protrusionOk && valveDepthOk;

  let needsRelief = false;
  let reliefDepthNeeded = 0;
  let headGasketOption = false;

  if (!meetsDropIn) {
    const shortfall = Math.max(0, (maxProt - pistonProtrusion) * -1) +
                      Math.max(0, (minDepth - valveFaceDepth));
    if (shortfall <= 0.015) headGasketOption = true;
    if (shortfall > 0) {
      needsRelief = true;
      reliefDepthNeeded = Math.ceil((shortfall + 0.010) * 1000) / 1000;
    }
  }

  let recommendation = "";
  if (meetsDropIn) {
    recommendation = "This cam is a drop-in for your engine. No valve reliefs or oversized gasket needed. Install with upgraded valve springs per the cam manufacturer.";
  } else if (headGasketOption && needsRelief) {
    recommendation = `Your measurements are close but don't meet drop-in specs. Options: (1) Use an oversized head gasket to gain clearance, or (2) Machine ${reliefDepthNeeded.toFixed(3)}" valve reliefs into the pistons.`;
  } else if (needsRelief) {
    recommendation = `Valve reliefs are required. Machine at least ${reliefDepthNeeded.toFixed(3)}" reliefs into the pistons, or consider the thicker gasket + relief combination.`;
  }

  return { pistonToValve: estimatedClearance, needsRelief, reliefDepthNeeded, meetsDropIn, protrusionOk, valveDepthOk, headGasketOption, recommendation };
}

/* ── Component ─────────────────────────────────────────────────── */

export default function DieselValveReliefCalculator() {
  const { data: platforms, isLoading, error } = useQuery<EnginePlatform[]>({
    queryKey: ["diesel-valve-relief-platforms"],
    queryFn: fetchPlatforms,
    staleTime: 30 * 60 * 1000, // 30 min cache
  });

  const [engineSlug, setEngineSlug] = useState("");
  const [camIndex, setCamIndex] = useState<string>("");
  const [pistonProtrusion, setPistonProtrusion] = useState("");
  const [valveFaceDepth, setValveFaceDepth] = useState("");
  const [headGasketThickness, setHeadGasketThickness] = useState("0.070");

  const engine = platforms?.find(p => p.slug === engineSlug) ?? null;
  const cam = engine && camIndex !== "" ? engine.cams[parseInt(camIndex)] : null;

  function handleEngineChange(slug: string) {
    setEngineSlug(slug);
    setCamIndex("");
    const e = platforms?.find(p => p.slug === slug);
    if (e) {
      setPistonProtrusion(e.stockPistonProtrusion);
      setValveFaceDepth(e.stockValveFaceDepth);
    }
  }

  const result = useMemo(() => {
    if (!cam) return null;
    const prot = parseFloat(pistonProtrusion) || 0;
    const depth = parseFloat(valveFaceDepth) || 0;
    const gasket = parseFloat(headGasketThickness) || 0.070;
    return calcClearance(prot, depth, gasket, cam);
  }, [cam, pistonProtrusion, valveFaceDepth, headGasketThickness]);

  // Group platforms by manufacturer for the dropdown
  const platformsByMfr = useMemo(() => {
    if (!platforms) return new Map<string, EnginePlatform[]>();
    const map = new Map<string, EnginePlatform[]>();
    for (const p of platforms) {
      const existing = map.get(p.manufacturer) ?? [];
      existing.push(p);
      map.set(p.manufacturer, existing);
    }
    return map;
  }, [platforms]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <SEOHead
        title="Diesel Valve Relief Calculator — Cummins, Powerstroke, Duramax Cam Upgrade Tool"
        description="Calculate valve relief depth for diesel cam upgrades. Covers Cummins 12V/24V/5.9/6.7/4BT, Ford Powerstroke 7.3/6.0/6.4/6.7, and GM Duramax LB7/LLY/LBZ/LMM/LML with aftermarket cam profiles from Hamilton Cams, Industrial Injection, Kill Devil Diesel, SoCal Diesel, Callies, and more."
        canonical="/calculators/diesel-valve-relief"
        keywords="valve relief calculator, diesel cam upgrade, piston relief depth, Cummins cam, Powerstroke cam, Duramax cam, Hamilton Cams, Industrial Injection, Kill Devil Diesel, SoCal Diesel, Callies, valve clearance"
      />

      <h1 className="text-3xl font-bold mb-2">Diesel Valve Relief Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Determine whether your diesel engine needs valve reliefs cut when upgrading to an aftermarket camshaft.
        Enter your measurements or use the stock defaults — the calculator checks against each cam's drop-in requirements.
      </p>

      {/* Loading / error states */}
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading engine and cam data...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">Failed to load cam data from the server. Please refresh the page or try again later.</p>
        </div>
      )}

      {platforms && (
      <div className="flex flex-col xl:flex-row gap-8">
        {/* ── Left: Inputs + Results ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Engine & Cam Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#E85D04]" />
                Engine & Cam Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Engine Platform</Label>
                  <Select value={engineSlug} onValueChange={handleEngineChange}>
                    <SelectTrigger><SelectValue placeholder="Select your engine..." /></SelectTrigger>
                    <SelectContent>
                      {Array.from(platformsByMfr.entries()).map(([mfr, pList]) => (
                        <div key={mfr}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{mfr}</div>
                          {pList.map(p => (
                            <SelectItem key={p.slug} value={p.slug}>
                              {p.label} ({p.years})
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aftermarket Cam</Label>
                  <Select value={camIndex} onValueChange={setCamIndex} disabled={!engine}>
                    <SelectTrigger><SelectValue placeholder={engine ? "Select cam..." : "Select engine first"} /></SelectTrigger>
                    <SelectContent>
                      {engine?.cams.map((c, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cam specs card */}
              {cam && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{cam.label}</h3>
                    <span className="text-xs text-muted-foreground">{cam.manufacturer} — {cam.partNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Intake Duration</p>
                      <p className="font-mono font-semibold">{cam.intakeDuration}°</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Exhaust Duration</p>
                      <p className="font-mono font-semibold">{cam.exhaustDuration}°</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lift (Int/Exh)</p>
                      <p className="font-mono font-semibold">{cam.intakeLift}" / {cam.exhaustLift}"</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">LSA</p>
                      <p className="font-mono font-semibold">{cam.lsa}°</p>
                    </div>
                  </div>
                  {cam.notes && <p className="text-xs text-muted-foreground italic">{cam.notes}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle>Your Measurements</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                All values in inches. Stock defaults are loaded when you select an engine — replace with your actual measurements for best results.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Piston Protrusion (in)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={pistonProtrusion}
                    onChange={e => setPistonProtrusion(e.target.value)}
                    placeholder="0.015"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">How far piston extends above the deck at TDC</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Valve Face Depth (in)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={valveFaceDepth}
                    onChange={e => setValveFaceDepth(e.target.value)}
                    placeholder="0.055"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Recession of the valve face below the head's fire deck</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Head Gasket Thickness (in)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={headGasketThickness}
                    onChange={e => setHeadGasketThickness(e.target.value)}
                    placeholder="0.070"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Compressed thickness — stock is typically .067"–.072"</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Results ── */}
          {result && cam && (
            <Card className={`overflow-hidden ${
              result.meetsDropIn
                ? "border-green-500"
                : result.headGasketOption
                  ? "border-yellow-500"
                  : "border-red-500"
            }`}>
              <div className={`px-4 py-3 text-white font-semibold flex items-center gap-2 ${
                result.meetsDropIn
                  ? "bg-green-600"
                  : result.needsRelief && !result.headGasketOption
                    ? "bg-red-600"
                    : "bg-yellow-600"
              }`}>
                {result.meetsDropIn ? (
                  <><CheckCircle className="w-5 h-5" /> Drop-In — No Valve Reliefs Needed</>
                ) : result.needsRelief && !result.headGasketOption ? (
                  <><AlertTriangle className="w-5 h-5" /> Valve Reliefs Required</>
                ) : (
                  <><AlertTriangle className="w-5 h-5" /> Clearance Issue — Options Available</>
                )}
              </div>
              <CardContent className="pt-4 space-y-4">
                {/* Measurement check grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`rounded-lg p-4 border ${result.protrusionOk ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.protrusionOk
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <AlertTriangle className="w-4 h-4 text-red-600" />
                      }
                      <span className="text-sm font-semibold">Piston Protrusion</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Your measurement</p>
                        <p className="font-mono font-bold text-lg">{pistonProtrusion || "—"}"</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max allowed</p>
                        <p className="font-mono font-bold text-lg">{(cam.maxPistonProtrusion ?? 0.020).toFixed(3)}"</p>
                      </div>
                    </div>
                    {!result.protrusionOk && (
                      <p className="text-xs text-red-600 mt-2 font-semibold">
                        Over by {((parseFloat(pistonProtrusion) || 0) - (cam.maxPistonProtrusion ?? 0.020)).toFixed(3)}"
                      </p>
                    )}
                  </div>

                  <div className={`rounded-lg p-4 border ${result.valveDepthOk ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.valveDepthOk
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <AlertTriangle className="w-4 h-4 text-red-600" />
                      }
                      <span className="text-sm font-semibold">Valve Face Depth</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Your measurement</p>
                        <p className="font-mono font-bold text-lg">{valveFaceDepth || "—"}"</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Min required</p>
                        <p className="font-mono font-bold text-lg">{(cam.minValveFaceDepth ?? 0.050).toFixed(3)}"</p>
                      </div>
                    </div>
                    {!result.valveDepthOk && (
                      <p className="text-xs text-red-600 mt-2 font-semibold">
                        Short by {((cam.minValveFaceDepth ?? 0.050) - (parseFloat(valveFaceDepth) || 0)).toFixed(3)}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Relief depth needed */}
                {result.needsRelief && result.reliefDepthNeeded > 0 && (
                  <div className="bg-[#1a1a1a] text-white rounded-lg p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Valve Relief Depth Needed</p>
                    <p className="text-4xl font-bold font-mono text-[#E85D04]">
                      {result.reliefDepthNeeded.toFixed(3)}"
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      ({(result.reliefDepthNeeded * 25.4).toFixed(2)} mm) — machine this depth into each piston's valve pockets
                    </p>
                  </div>
                )}

                {/* Estimated P2V */}
                {!cam.valveReliefRequired && (
                  <div className="flex items-center justify-between text-sm border-t pt-3">
                    <span className="text-muted-foreground">Estimated piston-to-valve clearance (rough)</span>
                    <span className="font-mono font-bold text-lg">
                      {result.pistonToValve.toFixed(3)}"
                    </span>
                  </div>
                )}

                {/* Recommendation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">{result.recommendation}</p>
                </div>

                {/* Additional requirements */}
                {(cam.requiresUpgradedSprings || cam.requiresUpgradedPushrods) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-1">Additional Requirements for This Cam:</p>
                    <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
                      {cam.requiresUpgradedSprings && <li>Upgraded valve springs required</li>}
                      {cam.requiresUpgradedPushrods && <li>Upgraded pushrods required</li>}
                    </ul>
                  </div>
                )}

                {/* Solutions if not drop-in */}
                {!result.meetsDropIn && !cam.valveReliefRequired && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3">Solutions (least to most invasive)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.headGasketOption && (
                        <div className="rounded-lg border p-3 bg-green-50 border-green-200">
                          <p className="text-sm font-semibold text-green-800">1. Oversized Head Gasket</p>
                          <p className="text-xs text-green-700 mt-1">
                            Use a thicker gasket (.080"–.090") to gain clearance. Slightly lowers compression ratio. Easiest option for marginal cases.
                          </p>
                        </div>
                      )}
                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{result.headGasketOption ? "2." : "1."} Recut Valve Seats</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Have a machine shop cut the valve seats deeper into the head to increase valve face depth. Target .045"–.055" recession.
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{result.headGasketOption ? "3." : "2."} Machine Valve Reliefs</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cut valve pockets into the piston crowns. Common for aggressive cams. Requires piston removal.
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{result.headGasketOption ? "4." : "3."} Fly-Cut Pistons</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Remove material from the piston crown. Used for .060"–.100"+ cuts on race builds.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Cam comparison table ── */}
          {engine && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Available Cams for {engine.label}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Quick comparison based on your measurements. Select any cam above for detailed analysis.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cam</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Duration</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Lift</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Relief?</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Depth</th>
                        <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Your Status</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {engine.cams.map((c, i) => {
                        const prot = parseFloat(pistonProtrusion) || 0;
                        const depth = parseFloat(valveFaceDepth) || 0;
                        const gasket = parseFloat(headGasketThickness) || 0.070;
                        const r = calcClearance(prot, depth, gasket, c);
                        return (
                          <tr
                            key={i}
                            className={`border-b last:border-0 cursor-pointer transition-colors ${camIndex === String(i) ? "bg-[#E85D04]/10" : "hover:bg-muted/50"}`}
                            onClick={() => setCamIndex(String(i))}
                          >
                            <td className="py-2.5 pr-3 font-sans text-sm font-medium">{c.label}</td>
                            <td className="py-2.5 pr-3 text-xs">{c.intakeDuration}/{c.exhaustDuration}</td>
                            <td className="py-2.5 pr-3 text-xs">{c.intakeLift}"</td>
                            <td className="py-2.5 pr-3">
                              {c.valveReliefRequired ? (
                                <span className="text-xs font-semibold text-red-600">Required</span>
                              ) : (
                                <span className="text-xs font-semibold text-green-600">Drop-in*</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-xs">
                              {c.valveReliefRequired ? `${c.reliefDepth.toFixed(3)}"` : "—"}
                            </td>
                            <td className="py-2.5">
                              {r.meetsDropIn ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3" /> Good
                                </span>
                              ) : r.headGasketOption ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="w-3 h-3" /> Marginal
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3 h-3" /> Needs work
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  *Drop-in if your piston protrusion and valve face depth meet the cam manufacturer's requirements. Click any row for details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="xl:w-80 shrink-0 space-y-6">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E85D04]" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Why Valve Reliefs?</h4>
                <p className="text-xs">
                  Aftermarket cams open the valves further and longer than stock. If the piston is too close to the valve at TDC during the overlap period, the valve can contact the piston — catastrophic engine damage. Valve reliefs (pockets machined into the piston crown) provide the extra clearance.
                </p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Piston Protrusion</h4>
                <p className="text-xs">
                  Measured with a dial indicator at TDC. Place the indicator base on the deck surface and measure how far the piston extends above (positive protrusion) or sits below (negative / in the hole). Diesel pistons typically protrude .010"–.030" above the deck.
                </p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Valve Face Depth</h4>
                <p className="text-xs">
                  How far the valve face sits below the head's fire deck surface. Measured with a straight edge and depth mic across the head. Deeper = more clearance. As valves and seats wear, this depth <span className="font-semibold">increases</span> — so a higher-mileage head may actually have more clearance than a freshly machined one.
                </p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Minimum Clearance Rules</h4>
                <p className="text-xs">General rule of thumb for diesel engines:</p>
                <ul className="text-xs list-disc pl-4 mt-1 space-y-1">
                  <li><span className="font-semibold">Intake:</span> .030" minimum</li>
                  <li><span className="font-semibold">Exhaust:</span> .060" minimum</li>
                </ul>
                <p className="text-xs mt-1">Exhaust needs more clearance because exhaust valves run hotter and expand more.</p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Head Gasket Trick</h4>
                <p className="text-xs">
                  If you're only marginally out of spec, a thicker head gasket (.080"–.090" vs stock .067"–.072") can provide the extra clearance without machining pistons. Trade-off: slightly lower compression ratio.
                </p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Always Measure</h4>
                <p className="text-xs">
                  Stock values vary from engine to engine. Never assume your protrusion matches the factory spec — always measure with a dial indicator. Diesel pistons are graded at the factory, so two identical engines can have different protrusion numbers.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      )}

      {/* ── Educational content ── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Diesel Valve Relief for Cam Upgrades</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            When you install an aftermarket camshaft in a diesel engine, the increased valve lift and duration can cause the valves to extend further into the combustion chamber — potentially contacting the piston crown at top dead center during the overlap period. This is when both intake and exhaust valves are slightly open simultaneously as the piston passes TDC on the exhaust-to-intake stroke transition.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Drop-In vs. Relief-Required Cams</h3>
          <p>
            Most mild performance cams are designed as "drop-in" replacements — they work with the stock piston geometry <span className="font-semibold">as long as</span> your piston protrusion and valve face depth are within the manufacturer's specified range. More aggressive cams unconditionally require valve reliefs — typically .050"–.120" deep pockets machined into the piston crown at each valve location.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Cummins, Powerstroke & Duramax</h3>
          <p>
            All three major diesel platforms share the same fundamental valve relief issue when upgrading cams. Cummins uses Hamilton Cams and Industrial Injection as the main aftermarket suppliers. Ford Powerstroke builds commonly use Kill Devil Diesel (KDD) and Colt Cams. GM Duramax builders turn to SoCal Diesel, Callies, and Wagler Competition. The drop-in vs. relief-required threshold varies by platform but typically falls at the Stage 2/3 boundary.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Measurement Procedure</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-semibold">Piston protrusion:</span> Remove the head. Place a dial indicator on the deck surface with the plunger on the piston crown. Rotate the engine to TDC and record the reading. Check all cylinders — they will vary. Use the highest reading for your calculation.</li>
            <li><span className="font-semibold">Valve face depth:</span> With the head on the bench and valves installed, lay a precision straight edge across the fire deck surface over each valve. Use a depth micrometer or feeler gauges to measure the gap. Check all valves — use the shallowest reading.</li>
            <li><span className="font-semibold">Head gasket:</span> Measure the compressed thickness of your gasket. Stock gaskets typically run .067"–.072". Aftermarket oversized gaskets run .080"–.090".</li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4">Sources</h3>
          <p className="text-xs">
            Cam specifications sourced from Hamilton Cams, Industrial Injection, Kill Devil Diesel, Colt Cams, SoCal Diesel, Callies, Wagler Competition, Diamond T Performance, and RCD Performance product documentation. Clearance rules of thumb from Cummins Forum, PowerStrokeArmy, and DuramaxForum community knowledge bases. Always verify with your cam manufacturer for the latest specifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
