import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import { familyDescription, familySeoTitle } from "@/data/seoDescriptions.mjs";
import type { EngineFamilyDoc } from "@/lib/engineTypes";
import { FactoryCars } from "@/components/vehicles/FactoryCars";

/**
 * Family hub: /engines/<mfr>/<family>
 *
 * A comparison table across every engine in the family — the view that answers
 * "which 350 do I have" or "how do the LS variants differ", which no single
 * engine page can.
 */
export default function EngineFamilyPage() {
  const { mfr, family } = useParams<{ mfr: string; family: string }>();
  const [doc, setDoc] = useState<EngineFamilyDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/data/engine-pages/${mfr}/${family}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d: EngineFamilyDoc) => {
        if (cancelled) return;
        setDoc(d);
        setState("ready");
      })
      .catch(() => !cancelled && setState("missing"));
    return () => {
      cancelled = true;
    };
  }, [mfr, family]);

  if (state === "loading") {
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4">
        <Skeleton className="h-10 w-72 mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (state === "missing" || !doc) {
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Engine family not found</h1>
        <Link href="/engines" className="text-[#E85D04] hover:underline">
          Browse all engines
        </Link>
      </div>
    );
  }

  const title = familySeoTitle(doc);
  const description = familyDescription(doc);

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <SEOHead title={title} description={description} canonical={doc.url} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6 flex flex-wrap gap-1.5">
        <Link href="/engines" className="hover:text-primary">Engines</Link>
        <span>/</span>
        <Link href={doc.manufacturerUrl} className="hover:text-primary">{doc.manufacturerName}</Link>
      </nav>

      <h1 className="text-4xl font-bold mb-1">{title}</h1>
      <p className="text-muted-foreground mb-8">
        {doc.engines.length} engine{doc.engines.length === 1 ? "" : "s"} in this family
        {doc.configuration ? ` · ${doc.configuration}` : ""}
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Engine</th>
                  <th className="text-left py-2 pr-4 font-medium">Displacement</th>
                  <th className="text-left py-2 pr-4 font-medium">Bore × Stroke</th>
                  <th className="text-left py-2 pr-4 font-medium">CR</th>
                  <th className="text-left py-2 font-medium">HP</th>
                </tr>
              </thead>
              <tbody>
                {doc.engines.map((e) => (
                  <tr key={e.slug} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={e.url} className="text-[#E85D04] hover:underline font-medium">
                        {e.displayName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 tabular-nums whitespace-nowrap">
                      {e.displacement_ci != null ? `${e.displacement_ci} ci` : "—"}
                    </td>
                    <td className="py-2 pr-4 tabular-nums whitespace-nowrap">
                      {e.bore_in != null && e.stroke_in != null ? `${e.bore_in}" × ${e.stroke_in}"` : "—"}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {e.compression_ratio != null ? `${e.compression_ratio}:1` : "—"}
                    </td>
                    <td className="py-2 tabular-nums whitespace-nowrap">
                      {e.hpMin != null ? (e.hpMin === e.hpMax ? `${e.hpMin}` : `${e.hpMin}–${e.hpMax}`) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <FactoryCars groups={doc.factoryCars} title={`Factory cars with a ${doc.familyName}`} />

      <p className="text-xs text-muted-foreground mt-8">
        Specs are for reference and build planning. Always verify against the factory service
        manual for your exact engine.
      </p>
    </div>
  );
}
