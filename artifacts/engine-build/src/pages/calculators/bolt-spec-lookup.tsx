import { useState, useMemo } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Info } from "lucide-react";
import { useBoltSpecs, type BoltSpecPlatform, type BoltSpecEntry } from "@/hooks/useEngineData";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import boltSpecContent from "@/data/calculatorContent/bolt-spec-lookup.mjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVariant(v: string | null): string {
  if (!v) return "Standard";
  return v
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Tty/g, "TTY")
    .replace(/Arp/g, "ARP")
    .replace(/7\/16/g, '7/16"')
    .replace(/Sr20det/gi, "SR20DET")
    .replace(/B18c/gi, "B18C")
    .replace(/K20/gi, "K20")
    .replace(/K24/gi, "K24");
}

function formatFactoryType(t: string): string {
  switch (t) {
    case "torque_to_yield": return "Torque-to-Yield";
    case "stud": return "Stud";
    case "bolt": return "Bolt";
    default: return t;
  }
}

function isTTY(bolts: BoltSpecEntry[] | null): boolean {
  return !!bolts?.some(b => b.factory_type === "torque_to_yield");
}

// ── Bolt Table ────────────────────────────────────────────────────────────────

function BoltTable({ bolts, label }: { bolts: BoltSpecEntry[]; label: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium">Variant</th>
                <th className="pb-2 pr-3 font-medium">Thread Size</th>
                <th className="pb-2 pr-3 font-medium">Diameter</th>
                <th className="pb-2 pr-3 font-medium text-center">Count</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Hex</th>
                <th className="pb-2 pr-3 font-medium">ARP Upgrade</th>
              </tr>
            </thead>
            <tbody>
              {bolts.map((b, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{formatVariant(b.variant)}</td>
                  <td className="py-2.5 pr-3 font-mono text-[#E85D04] font-semibold">{b.thread_callout}</td>
                  <td className="py-2.5 pr-3 text-gray-600">
                    {b.diameter_in ? `${b.diameter_in}"` : "—"}
                    {b.diameter_in && b.diameter_mm ? " / " : ""}
                    {b.diameter_mm ? `${b.diameter_mm} mm` : b.diameter_in ? "" : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-center">{b.bolt_count ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      b.factory_type === "torque_to_yield"
                        ? "bg-amber-100 text-amber-800"
                        : b.factory_type === "stud"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-700"
                    }`}>
                      {formatFactoryType(b.factory_type)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-600">{b.hex_size || "—"}</td>
                  <td className="py-2.5 pr-3 text-gray-600 font-mono text-xs">{b.common_upgrade || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes row */}
        {bolts.filter(b => b.notes).map((b, i) => (
          <div key={i} className="mt-3 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span><span className="font-medium">{formatVariant(b.variant)}:</span> {b.notes}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BoltSpecLookup() {
  const { data: platforms, loading } = useBoltSpecs();
  const [selectedSlug, setSelectedSlug] = useState("");

  // Group platforms by manufacturer for the dropdown
  const grouped = useMemo(() => {
    const groups: Record<string, BoltSpecPlatform[]> = {};
    for (const p of platforms) {
      if (!groups[p.manufacturer]) groups[p.manufacturer] = [];
      groups[p.manufacturer].push(p);
    }
    return groups;
  }, [platforms]);

  const selected = platforms.find(p => p.slug === selectedSlug);
  const hasTTY = selected && (isTTY(selected.head_bolts) || isTTY(selected.main_bolts));

  return (
    <div>
      <SEOHead
        title="Head Bolt & Main Bolt Spec Lookup | Engine-Build.com"
        description="Look up head bolt and main bolt thread sizes, diameters, pitch, and ARP upgrade part numbers for any engine platform. SBC, BBC, LS, SBF, Coyote, Mopar, JZ, RB, Honda, and more."
        canonical="/calculators/bolt-spec-lookup"
        keywords="head bolt size, main bolt size, engine bolt specs, head bolt thread pitch, ARP head studs, bolt diameter, torque to yield bolts"
      />

      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Link href="/calculators/short-block" className="text-sm text-[#E85D04] hover:underline">&larr; Short Block Calculators</Link>

        <div>
          <h1 className="text-3xl font-bold">Head Bolt &amp; Main Bolt Specs</h1>
          <p className="text-gray-500 mt-1">
            Select your engine platform to see head bolt and main cap bolt thread sizes, diameters, counts, and ARP upgrade part numbers.
          </p>
        </div>

        {/* Platform Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Engine Platform</CardTitle>
            <CardDescription>Bolt specs are per-platform — all engines in a family share the same thread sizes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedSlug} onValueChange={setSelectedSlug}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder={loading ? "Loading..." : "Choose your engine..."} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(grouped).map(([mfr, plats]) => (
                  <div key={mfr}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{mfr}</div>
                    {plats.map(p => (
                      <SelectItem key={p.slug} value={p.slug}>{p.display_name}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Results */}
        {selected && (
          <div className="space-y-4">
            {/* TTY Warning */}
            {hasTTY && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Torque-to-Yield Fasteners</p>
                  <p className="text-amber-700 text-sm mt-0.5">
                    This engine uses TTY (torque-to-yield) head bolts from the factory. TTY bolts are single-use — they stretch
                    permanently during installation and <span className="font-semibold">must be replaced every time they are removed</span>.
                    ARP studs are reusable and a common upgrade for any engine being rebuilt.
                  </p>
                </div>
              </div>
            )}

            {/* Head Bolts */}
            {selected.head_bolts && selected.head_bolts.length > 0 && (
              <BoltTable bolts={selected.head_bolts} label="Head Bolts" />
            )}

            {/* Main Bolts */}
            {selected.main_bolts && selected.main_bolts.length > 0 && (
              <BoltTable bolts={selected.main_bolts} label="Main Cap Bolts" />
            )}

            {/* Quick Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-3">
                <div>
                  <p className="font-medium text-gray-800 mb-1">Thread Callout Format</p>
                  <p><span className="font-mono bg-gray-100 px-1 rounded">7/16"-14</span> = 7/16 inch diameter, 14 threads per inch (imperial/UNC)</p>
                  <p><span className="font-mono bg-gray-100 px-1 rounded">M11x2.0</span> = 11 mm diameter, 2.0 mm thread pitch (metric)</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-1">Fastener Types</p>
                  <p><span className="font-medium">Bolt</span> — Standard hex head bolt, reusable if not damaged.</p>
                  <p><span className="font-medium">Stud</span> — Threaded on both ends, nut on top. More consistent clamping than bolts.</p>
                  <p><span className="font-medium">Torque-to-Yield (TTY)</span> — Stretches into the plastic zone during torque. Single-use — never reuse.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-1">Why Upgrade?</p>
                  <p>ARP studs provide higher clamping force, consistent stretch, and are reusable across multiple rebuilds. Essential for boosted, nitrous, or high-RPM applications.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!selected && !loading && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Select an engine platform above to view bolt specifications.</p>
          </div>
        )}

        <CalculatorContent data={boltSpecContent} title="Bolt Spec Lookup" />
      </div>
    </div>
  );
}
