import { Link, useParams } from "wouter";
import { useGetEngineSpec } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export default function EngineDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const engineId = parseInt(id ?? "0", 10);
  const { data: engine, isLoading } = useGetEngineSpec(engineId, {
    query: { enabled: !!engineId },
  });

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-80 mb-8" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!engine) {
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Engine not found</h1>
        <Link href="/specs"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
      </div>
    );
  }

  const torqueByCategory = groupByCategory(engine.torqueSpecs ?? []);
  const clearanceByCategory = groupByCategory(engine.clearanceSpecs ?? []);

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <div className="mb-6">
        <Link href={`/specs/${slug}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> {engine.familyName}
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{engine.name}</h1>
            <p className="text-muted-foreground mt-1">{engine.years} {engine.applications && `· ${engine.applications}`}</p>
          </div>
          <Button variant="outline" onClick={handlePrint} className="print:hidden">
            <Printer className="w-4 h-4 mr-2" />Print / Save PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {engine.displacement && <StatBox label="Displacement" value={engine.displacement} />}
          {engine.bore && <StatBox label="Bore" value={engine.bore} />}
          {engine.stroke && <StatBox label="Stroke" value={engine.stroke} />}
          {engine.compression && <StatBox label="Compression" value={engine.compression} />}
          {engine.horsepower && <StatBox label="Horsepower" value={engine.horsepower + " hp"} />}
          {engine.torque && <StatBox label="Torque" value={engine.torque + " lb-ft"} />}
          {engine.firingOrder && <StatBox label="Firing Order" value={engine.firingOrder} />}
          {engine.rodRatio && <StatBox label="Rod Ratio" value={engine.rodRatio} />}
        </div>
      </div>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Disclaimer:</strong> Always verify specifications against your factory service manual. Specs may vary by production year, casting, and application.
      </div>

      <Tabs defaultValue="torque">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          <TabsTrigger value="torque">Torque Specs</TabsTrigger>
          <TabsTrigger value="clearance">Clearance Specs</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="identification">Identification</TabsTrigger>
        </TabsList>

        <TabsContent value="torque">
          <h2 className="text-xl font-bold mb-1">Torque Specifications</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {engine.torqueSpecs.length} fasteners across {Object.keys(torqueByCategory).length} categories
          </p>
          {engine.torqueSpecs.length === 0 ? (
            <p className="text-muted-foreground">No torque specs available for this engine yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(torqueByCategory).map(([category, specs]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E85D04] mb-2 pb-1 border-b border-orange-100">
                    {category}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left p-3 border font-semibold">Fastener</th>
                          <th className="text-left p-3 border font-semibold w-20">ft-lbs</th>
                          <th className="text-left p-3 border font-semibold w-20">Nm</th>
                          <th className="text-left p-3 border font-semibold w-32">Lubricant</th>
                          <th className="text-left p-3 border font-semibold">Sequence / Notes</th>
                          <th className="text-left p-3 border font-semibold w-14">TTY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specs.map((spec, i) => (
                          <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                            <td className="p-3 border font-medium">{spec.fastener}</td>
                            <td className="p-3 border font-mono">{spec.ftLbs}</td>
                            <td className="p-3 border font-mono">{spec.nm}</td>
                            <td className="p-3 border text-sm">{spec.lubricant}</td>
                            <td className="p-3 border text-muted-foreground text-sm">{spec.sequence ?? "—"}</td>
                            <td className="p-3 border text-center">
                              {spec.torqueToYield
                                ? <span className="text-amber-600 font-semibold text-xs">TTY</span>
                                : <span className="text-muted-foreground text-xs">No</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-6">TTY = Torque-to-Yield bolt (single-use — must be replaced after removal)</p>
        </TabsContent>

        <TabsContent value="clearance">
          <h2 className="text-xl font-bold mb-1">Clearance Specifications</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {engine.clearanceSpecs.length} measurements across {Object.keys(clearanceByCategory).length} categories
          </p>
          {engine.clearanceSpecs.length === 0 ? (
            <p className="text-muted-foreground">No clearance specs available for this engine yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(clearanceByCategory).map(([category, specs]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E85D04] mb-2 pb-1 border-b border-orange-100">
                    {category}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left p-3 border font-semibold">Measurement</th>
                          <th className="text-left p-3 border font-semibold">Factory Min</th>
                          <th className="text-left p-3 border font-semibold">Factory Max</th>
                          <th className="text-left p-3 border font-semibold">Perf. Min</th>
                          <th className="text-left p-3 border font-semibold">Perf. Max</th>
                          <th className="text-left p-3 border font-semibold w-20">Unit</th>
                          <th className="text-left p-3 border font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specs.map((spec, i) => (
                          <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                            <td className="p-3 border font-medium">{spec.name}</td>
                            <td className="p-3 border font-mono">{spec.factoryMin}</td>
                            <td className="p-3 border font-mono">{spec.factoryMax}</td>
                            <td className="p-3 border font-mono text-blue-700">{spec.performanceMin ?? "—"}</td>
                            <td className="p-3 border font-mono text-blue-700">{spec.performanceMax ?? "—"}</td>
                            <td className="p-3 border text-muted-foreground text-xs">{spec.unit}</td>
                            <td className="p-3 border text-muted-foreground text-xs max-w-xs">{spec.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-6">Blue values indicate typical performance/race clearances — always consult your machinist.</p>
        </TabsContent>

        <TabsContent value="dimensions">
          <h2 className="text-xl font-bold mb-4">Engine Dimensions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {engine.bore && <DimRow label="Bore" value={engine.bore} />}
            {engine.stroke && <DimRow label="Stroke" value={engine.stroke} />}
            {engine.displacement && <DimRow label="Displacement" value={engine.displacement} />}
            {engine.rodLength && <DimRow label="Connecting Rod Length" value={engine.rodLength} />}
            {engine.rodRatio && <DimRow label="Rod Ratio" value={engine.rodRatio} />}
            {engine.deckHeight && <DimRow label="Deck Height" value={engine.deckHeight} />}
            {engine.firingOrder && <DimRow label="Firing Order" value={engine.firingOrder} />}
            {engine.compression && <DimRow label="Compression Ratio" value={engine.compression} />}
          </div>
        </TabsContent>

        <TabsContent value="identification">
          <h2 className="text-xl font-bold mb-4">Casting Numbers &amp; Identification</h2>
          {engine.castingNumbers.length === 0 ? (
            <p className="text-muted-foreground">No casting numbers available for this engine yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 border font-semibold">Casting #</th>
                    <th className="text-left p-3 border font-semibold">Type</th>
                    <th className="text-left p-3 border font-semibold">Years</th>
                    <th className="text-left p-3 border font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {engine.castingNumbers.map((c, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      <td className="p-3 border font-mono font-bold">{c.casting}</td>
                      <td className="p-3 border">{c.type}</td>
                      <td className="p-3 border">{c.years}</td>
                      <td className="p-3 border">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function groupByCategory<T extends { category?: string | null }>(items: T[]): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const cat = item.category ?? "General";
    if (!result[cat]) result[cat] = [];
    result[cat].push(item);
  }
  return result;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}

function DimRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded border bg-card">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
