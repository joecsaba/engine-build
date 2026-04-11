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
          <h2 className="text-xl font-bold mb-4">Torque Specifications</h2>
          {engine.torqueSpecs.length === 0 ? (
            <p className="text-muted-foreground">No torque specs available for this engine yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 border font-semibold">Fastener</th>
                    <th className="text-left p-3 border font-semibold">ft-lbs</th>
                    <th className="text-left p-3 border font-semibold">Nm</th>
                    <th className="text-left p-3 border font-semibold">Lubricant</th>
                    <th className="text-left p-3 border font-semibold">Sequence/Notes</th>
                    <th className="text-left p-3 border font-semibold">TTY</th>
                  </tr>
                </thead>
                <tbody>
                  {engine.torqueSpecs.map((spec, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      <td className="p-3 border font-medium">{spec.fastener}</td>
                      <td className="p-3 border">{spec.ftLbs}</td>
                      <td className="p-3 border">{spec.nm}</td>
                      <td className="p-3 border">{spec.lubricant}</td>
                      <td className="p-3 border text-muted-foreground">{spec.sequence ?? "—"}</td>
                      <td className="p-3 border">{spec.torqueToYield ? <span className="text-amber-600 font-semibold">TTY</span> : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">TTY = Torque-to-Yield bolt (one-time use, must be replaced)</p>
        </TabsContent>

        <TabsContent value="clearance">
          <h2 className="text-xl font-bold mb-4">Clearance Specifications</h2>
          {engine.clearanceSpecs.length === 0 ? (
            <p className="text-muted-foreground">No clearance specs available for this engine yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 border font-semibold">Measurement</th>
                    <th className="text-left p-3 border font-semibold">Factory Min</th>
                    <th className="text-left p-3 border font-semibold">Factory Max</th>
                    <th className="text-left p-3 border font-semibold">Performance Min</th>
                    <th className="text-left p-3 border font-semibold">Performance Max</th>
                    <th className="text-left p-3 border font-semibold">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {engine.clearanceSpecs.map((spec, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      <td className="p-3 border font-medium">{spec.name}</td>
                      <td className="p-3 border">{spec.factoryMin}</td>
                      <td className="p-3 border">{spec.factoryMax}</td>
                      <td className="p-3 border">{spec.performanceMin ?? "—"}</td>
                      <td className="p-3 border">{spec.performanceMax ?? "—"}</td>
                      <td className="p-3 border text-muted-foreground">{spec.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
