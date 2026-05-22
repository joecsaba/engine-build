import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import octaneMixContent from "@/data/calculatorContent/octane-mix.mjs";

/* ─── Reference Data ──────────────────────────────────── */

const octanePresets = ["87", "89", "91", "93", "100", "105", "110", "116"];

const fuelOctaneRef = [
  { fuel: "Regular", aki: "87" },
  { fuel: "Mid-Grade", aki: "89" },
  { fuel: "Premium", aki: "91–93" },
  { fuel: "E85 (summer)", aki: "100–105" },
  { fuel: "E85 (winter)", aki: "94–100" },
  { fuel: "VP C12", aki: "108" },
  { fuel: "Sunoco 110", aki: "110" },
  { fuel: "VP C16", aki: "117" },
];

const seasonalE85 = [
  { season: "Summer", months: "Jun–Aug", pct: "79–83%" },
  { season: "Spring / Fall", months: "Apr–May, Sep–Oct", pct: "70–79%" },
  { season: "Late Fall / Early Spring", months: "Mar, Nov", pct: "60–70%" },
  { season: "Winter", months: "Dec–Feb", pct: "51–60%" },
];

const blendProps = [
  { blend: "E0", afr: "14.7:1", btu: "111,800", mpg: "Baseline" },
  { blend: "E10", afr: "14.1:1", btu: "108,230", mpg: "-3%" },
  { blend: "E30", afr: "12.9:1", btu: "101,090", mpg: "-10%" },
  { blend: "E50", afr: "11.4:1", btu: "93,950", mpg: "-16%" },
  { blend: "E85", afr: "9.8:1", btu: "81,540", mpg: "-27%" },
];

const ethTargets = ["E20", "E25", "E30", "E35", "E40", "E50", "E60", "E85", "Custom"];

/* ─── Helpers ─────────────────────────────────────────── */

function num(v: string): number {
  return parseFloat(v) || 0;
}

function fuelSystemWarning(ethPct: number): { label: string; color: string } {
  if (ethPct <= 15) return { label: "Stock fuel system OK", color: "text-green-400" };
  if (ethPct <= 30) return { label: "Stock system usually OK — verify fuel pump", color: "text-yellow-400" };
  if (ethPct <= 50) return { label: "Upgraded fuel pump recommended", color: "text-orange-400" };
  return { label: "Upgraded injectors + pump required; flex-fuel tune needed", color: "text-red-400" };
}

/* ─── Component ───────────────────────────────────────── */

export default function OctaneMixCalculator() {
  const [mode, setMode] = useState<"blend" | "e85">("blend");

  /* Mode 1 — Octane Blender */
  const [fuelAOctPreset, setFuelAOctPreset] = useState("91");
  const [fuelAOctCustom, setFuelAOctCustom] = useState("");
  const [fuelAVol, setFuelAVol] = useState("10");
  const [fuelBOctPreset, setFuelBOctPreset] = useState("100");
  const [fuelBOctCustom, setFuelBOctCustom] = useState("");
  const [fuelBVol, setFuelBVol] = useState("5");
  const [fuelAPrice, setFuelAPrice] = useState("");
  const [fuelBPrice, setFuelBPrice] = useState("");

  /* Mode 2 — E85 / Ethanol Blend */
  const [tankSize, setTankSize] = useState("16");
  const [currentFuel, setCurrentFuel] = useState("4");
  const [currentEthPct, setCurrentEthPct] = useState("10");
  const [e85EthPct, setE85EthPct] = useState("79");
  const [targetBlend, setTargetBlend] = useState("E30");
  const [customTargetPct, setCustomTargetPct] = useState("30");

  /* ─── Mode 1 Calculations ─────────────────────────── */
  const octA = num(fuelAOctCustom) || num(fuelAOctPreset);
  const octB = num(fuelBOctCustom) || num(fuelBOctPreset);
  const volA = num(fuelAVol);
  const volB = num(fuelBVol);
  const totalVol = volA + volB;
  const blendOctane = totalVol > 0 ? (volA * octA + volB * octB) / totalVol : 0;
  const pctA = totalVol > 0 ? ((volA / totalVol) * 100) : 0;
  const pctB = totalVol > 0 ? ((volB / totalVol) * 100) : 0;
  const priceA = num(fuelAPrice);
  const priceB = num(fuelBPrice);
  const hasPrices = fuelAPrice.trim() !== "" && fuelBPrice.trim() !== "" && priceA > 0 && priceB > 0;
  const blendCost = hasPrices && totalVol > 0 ? (volA * priceA + volB * priceB) / totalVol : 0;
  const blendValid = totalVol > 0 && octA > 0 && octB > 0;

  /* ─── Mode 2 Calculations ─────────────────────────── */
  const tank = num(tankSize);
  const curFuel = num(currentFuel);
  const curEth = num(currentEthPct) / 100;
  const e85Eth = num(e85EthPct) / 100;
  const targetEthPct = targetBlend === "Custom" ? num(customTargetPct) : parseInt(targetBlend.replace("E", ""), 10);
  const targetEth = targetEthPct / 100;
  const spaceInTank = Math.max(tank - curFuel, 0);
  const currentEthAmount = curFuel * curEth;
  const targetEthAmount = tank * targetEth;
  const ethNeeded = targetEthAmount - currentEthAmount;
  const gasEthPct = 0.10; // pump gas is E10

  const e85Gallons = (e85Eth - gasEthPct) !== 0
    ? (ethNeeded - spaceInTank * gasEthPct) / (e85Eth - gasEthPct)
    : 0;
  const gasGallons = spaceInTank - e85Gallons;

  const canReach = e85Gallons >= 0 && e85Gallons <= spaceInTank && gasGallons >= 0;

  const finalEthFraction = tank > 0
    ? (currentEthAmount + (canReach ? e85Gallons * e85Eth + gasGallons * gasEthPct : 0)) / tank
    : 0;
  const finalEthLabel = `E${Math.round(finalEthFraction * 100)}`;

  const estimatedOctane = 87 + (finalEthFraction - 0.10) * (100 - 87) / (0.85 - 0.10);
  const stoichAFR = 1 / ((finalEthFraction / 9.0) + ((1 - finalEthFraction) / 14.7));
  const btuBlend = (1 - finalEthFraction) * 111800 + finalEthFraction * 76100;
  const mpgReduction = (1 - btuBlend / 111800) * 100;

  const e85Valid = tank > 0 && curFuel >= 0 && curFuel <= tank && spaceInTank > 0;
  const warning = fuelSystemWarning(finalEthFraction * 100);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <SEOHead
        title="Octane Mix / Fuel Blending Calculator"
        description="Calculate blended octane from two fuels or determine E85/ethanol fill amounts. Includes stoichiometric AFR, BTU content, MPG impact, and fuel system warnings."
        canonical="/calculators/octane-mix"
        keywords="octane blending calculator, E85 ethanol blend, fuel mix octane, E30 E50 blend, race fuel mix, octane calculator"
      />
      <h1 className="text-3xl font-bold mb-2">Octane Mix / Fuel Blending Calculator</h1>
      <p className="text-muted-foreground mb-6">Blend two fuels by octane or calculate E85 / ethanol fill-up amounts with AFR, BTU, and fuel system guidance.</p>

      {/* ── Mode Toggle ─────────────────────────────── */}
      <div className="flex rounded-lg border overflow-hidden mb-8">
        <button
          className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${mode === "blend" ? "bg-[#E85D04] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          onClick={() => setMode("blend")}
        >
          Octane Blender
        </button>
        <button
          className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${mode === "e85" ? "bg-[#E85D04] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          onClick={() => setMode("e85")}
        >
          E85 / Ethanol Blend
        </button>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* MODE 1: Octane Blender                        */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "blend" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Fuel A</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Octane (AKI) Preset</Label>
                    <Select value={fuelAOctPreset} onValueChange={v => { setFuelAOctPreset(v); setFuelAOctCustom(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {octanePresets.map(o => <SelectItem key={o} value={o}>{o} AKI</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Custom Octane</Label>
                    <Input type="text" inputMode="decimal" placeholder="Override" value={fuelAOctCustom} onChange={e => setFuelAOctCustom(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Volume (gallons)</Label>
                    <Input type="text" inputMode="decimal" value={fuelAVol} onChange={e => setFuelAVol(e.target.value)} className="font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label>Price $/gal (optional)</Label>
                    <Input type="text" inputMode="decimal" placeholder="e.g. 4.29" value={fuelAPrice} onChange={e => setFuelAPrice(e.target.value)} className="font-mono" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Fuel B</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Octane (AKI) Preset</Label>
                    <Select value={fuelBOctPreset} onValueChange={v => { setFuelBOctPreset(v); setFuelBOctCustom(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {octanePresets.map(o => <SelectItem key={o} value={o}>{o} AKI</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Custom Octane</Label>
                    <Input type="text" inputMode="decimal" placeholder="Override" value={fuelBOctCustom} onChange={e => setFuelBOctCustom(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Volume (gallons)</Label>
                    <Input type="text" inputMode="decimal" value={fuelBVol} onChange={e => setFuelBVol(e.target.value)} className="font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label>Price $/gal (optional)</Label>
                    <Input type="text" inputMode="decimal" placeholder="e.g. 7.99" value={fuelBPrice} onChange={e => setFuelBPrice(e.target.value)} className="font-mono" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Blended Result</CardTitle></CardHeader>
              <CardContent>
                {blendValid ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Resulting Octane (AKI)</p>
                      <p className="text-5xl font-bold font-mono text-primary tracking-wide">{blendOctane.toFixed(1)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">Total Volume</p>
                        <p className="font-mono font-semibold text-lg">{totalVol.toFixed(1)} gal</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">Mix Ratio</p>
                        <p className="font-mono font-semibold text-lg">{pctA.toFixed(0)}% / {pctB.toFixed(0)}%</p>
                      </div>
                    </div>
                    {hasPrices && (
                      <div className="pt-3 border-t border-gray-700">
                        <p className="text-xs uppercase tracking-wider text-gray-500">Blended Cost</p>
                        <p className="font-mono font-semibold text-lg text-green-400">${blendCost.toFixed(2)} / gal</p>
                        <p className="text-xs text-gray-500 mt-1">Total: ${(blendCost * totalVol).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Enter fuel octane and volume values to see results</p>
                )}
              </CardContent>
            </Card>

            {/* Fuel Octane Reference */}
            <Card>
              <CardHeader><CardTitle>Common Fuel Octane (AKI)</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fuel</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">AKI</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {fuelOctaneRef.map(r => (
                      <tr key={r.fuel} className="border-b last:border-0">
                        <td className="py-1.5 font-sans text-muted-foreground">{r.fuel}</td>
                        <td className="py-1.5">{r.aki}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* MODE 2: E85 / Ethanol Blend                   */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "e85" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Your Tank</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Tank Size (gallons)</Label>
                    <Input type="text" inputMode="decimal" value={tankSize} onChange={e => setTankSize(e.target.value)} className="font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label>Current Fuel Level (gal)</Label>
                    <Input type="text" inputMode="decimal" value={currentFuel} onChange={e => setCurrentFuel(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Current Fuel Ethanol %</Label>
                  <Input type="text" inputMode="decimal" value={currentEthPct} onChange={e => setCurrentEthPct(e.target.value)} className="font-mono" />
                  <p className="text-xs text-muted-foreground">Most pump gas is E10 (10%)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>E85 &amp; Target</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Pump E85 Actual Ethanol %</Label>
                  <Input type="text" inputMode="decimal" value={e85EthPct} onChange={e => setE85EthPct(e.target.value)} className="font-mono" />
                  <p className="text-xs text-muted-foreground">Varies by season: summer 79–83%, winter as low as 51%</p>
                </div>
                <div className="space-y-1">
                  <Label>Target Ethanol Blend</Label>
                  <Select value={targetBlend} onValueChange={setTargetBlend}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ethTargets.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {targetBlend === "Custom" && (
                  <div className="space-y-1">
                    <Label>Custom Target Ethanol %</Label>
                    <Input type="text" inputMode="decimal" value={customTargetPct} onChange={e => setCustomTargetPct(e.target.value)} className="font-mono" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seasonal E85 Reference */}
            <Card>
              <CardHeader><CardTitle>Seasonal E85 Ethanol Content</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Season</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Months</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ethanol %</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {seasonalE85.map(r => (
                      <tr key={r.season} className="border-b last:border-0">
                        <td className="py-1.5 font-sans text-muted-foreground">{r.season}</td>
                        <td className="py-1.5 font-sans text-muted-foreground">{r.months}</td>
                        <td className="py-1.5">{r.pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <Card className="bg-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Fill-Up Plan</CardTitle></CardHeader>
              <CardContent>
                {e85Valid ? (
                  canReach ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Add E85</p>
                        <p className="text-5xl font-bold font-mono text-primary tracking-wide">{e85Gallons.toFixed(1)} <span className="text-2xl">gal</span></p>
                      </div>
                      <div className="pt-3 border-t border-gray-700">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Add Pump Gas (E10)</p>
                        <p className="text-2xl font-bold font-mono">{gasGallons.toFixed(1)} <span className="text-base">gal</span></p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500">Final Blend</p>
                          <p className="font-mono font-semibold text-lg text-amber-400">{finalEthLabel}</p>
                          <p className="text-xs text-gray-500">{(finalEthFraction * 100).toFixed(1)}% ethanol</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500">Est. Octane (AKI)</p>
                          <p className="font-mono font-semibold text-lg">{estimatedOctane.toFixed(1)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500">Stoich AFR</p>
                          <p className="font-mono font-semibold text-lg">{stoichAFR.toFixed(1)}:1</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500">Energy (BTU/gal)</p>
                          <p className="font-mono font-semibold text-lg">{Math.round(btuBlend).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-700">
                        <p className="text-xs uppercase tracking-wider text-gray-500">MPG Impact vs E0</p>
                        <p className="font-mono font-semibold text-lg text-orange-400">-{mpgReduction.toFixed(1)}%</p>
                      </div>

                      <div className="pt-3 border-t border-gray-700">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Fuel System</p>
                        <p className={`font-semibold text-sm ${warning.color}`}>{warning.label}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-red-400 font-semibold text-lg">Cannot reach target blend</p>
                      <p className="text-sm text-gray-400">
                        Not enough tank space or the existing fuel already exceeds the target ethanol percentage.
                        Try a lower target blend, start with less fuel in the tank, or use E85 with higher ethanol content.
                      </p>
                      <div className="pt-3 border-t border-gray-700 text-sm text-gray-500">
                        <p>Space in tank: {spaceInTank.toFixed(1)} gal</p>
                        <p>Ethanol needed: {ethNeeded.toFixed(2)} gal</p>
                        <p>E85 calc: {e85Gallons.toFixed(2)} gal (must be 0 to {spaceInTank.toFixed(1)})</p>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-gray-500 text-sm">Enter tank and fuel values to see results</p>
                )}
              </CardContent>
            </Card>

            {/* Ethanol Blend Properties */}
            <Card>
              <CardHeader><CardTitle>Ethanol Blend Properties</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Blend</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Stoich AFR</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">BTU/gal</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">MPG vs E0</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {blendProps.map(r => (
                      <tr key={r.blend} className="border-b last:border-0">
                        <td className="py-1.5 font-semibold">{r.blend}</td>
                        <td className="py-1.5">{r.afr}</td>
                        <td className="py-1.5">{r.btu}</td>
                        <td className="py-1.5">{r.mpg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Educational Content ──────────────────────── */}
      <Card className="mt-8">
        <CardHeader><CardTitle>Fuel Blending Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Octane blending is approximately linear by volume.</strong> Mixing
            equal parts 91 and 100 AKI fuel gives roughly 95.5 AKI. This holds well for gasoline-to-gasoline blends
            and is accurate enough for most street and mild race applications.
          </p>
          <p>
            <strong className="text-foreground">E85 is NOT always 85% ethanol.</strong> Federal regulations allow
            51–83% ethanol content, and refiners adjust seasonally for cold-start performance. Winter E85 can be
            as low as E51, which dramatically affects both octane and required fueling. Always verify with your
            supplier or test with an ethanol content gauge before tuning.
          </p>
          <p>
            <strong className="text-foreground">Small ethanol additions have disproportionate octane impact.</strong> Going
            from E10 to E30 adds roughly 6 AKI points (from ~87 to ~93), because ethanol's high octane rating (about
            108–113 AKI) raises the blend nonlinearly at low concentrations. This makes E30 a popular "sweet spot"
            for cars with upgraded fuel pumps.
          </p>
          <p>
            <strong className="text-foreground">Cost savings with partial E85 blends.</strong> E30–E50 blends often
            achieve higher effective octane than 93 premium at a lower cost per gallon, since E85 typically costs
            $0.50–$1.00 less than premium. The trade-off is a 10–16% reduction in fuel economy due to ethanol's
            lower energy density (76,100 BTU/gal vs gasoline's 111,800 BTU/gal).
          </p>
        </CardContent>
      </Card>

      <CalculatorContent data={octaneMixContent} title="Octane Mix" />
    </div>
  );
}
