import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import { manufacturerDescription } from "@/data/seoDescriptions.mjs";
import type { ManufacturerSummary } from "@/lib/engineTypes";

/**
 * Serves two routes off one dataset:
 *   /engines            — index of every manufacturer
 *   /engines/<mfr>      — one manufacturer's families
 *
 * Both read public/data/engine-pages/manufacturers.json, which carries family
 * lists but no engine payload, so this stays small regardless of catalogue size.
 */
export default function EnginesIndexPage() {
  const { mfr } = useParams<{ mfr?: string }>();
  const [data, setData] = useState<ManufacturerSummary[] | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/data/engine-pages/manufacturers.json")
      .then((r) => r.json())
      .then((d: ManufacturerSummary[]) => !cancelled && setData(d))
      .catch(() => !cancelled && setData([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(
    () => (mfr && data ? data.find((m) => m.url === `/engines/${mfr}`) ?? null : null),
    [mfr, data]
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((m) => ({
        ...m,
        families: m.families.filter(
          (f) => f.familyName.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
        ),
      }))
      .filter((m) => m.families.length > 0);
  }, [data, filter]);

  if (!data) {
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4">
        <Skeleton className="h-10 w-72 mb-6" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // ---- single manufacturer -------------------------------------------------
  if (mfr) {
    if (!current) {
      return (
        <div className="container mx-auto max-w-5xl py-10 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Manufacturer not found</h1>
          <Link href="/engines" className="text-[#E85D04] hover:underline">
            Browse all engines
          </Link>
        </div>
      );
    }
    const title = `${current.name} Engine Specs`;
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4">
        <SEOHead
          title={title}
          description={manufacturerDescription(current)}
          canonical={current.url}
        />
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href="/engines" className="hover:text-primary">Engines</Link>
        </nav>
        <h1 className="text-4xl font-bold mb-1">{title}</h1>
        <p className="text-muted-foreground mb-8">
          {current.engineCount} engines across {current.families.length} famil
          {current.families.length === 1 ? "y" : "ies"}
          {current.country ? ` · ${current.country}` : ""}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {current.families.map((f) => (
            <Link key={f.url} href={f.url}>
              <Card className="h-full hover:border-[#E85D04] transition-colors">
                <CardContent className="pt-5">
                  <p className="font-semibold">{f.familyName}</p>
                  <p className="text-sm text-muted-foreground">
                    {f.engineCount} engine{f.engineCount === 1 ? "" : "s"}
                    {f.configuration ? ` · ${f.configuration}` : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ---- full index ----------------------------------------------------------
  const totalEngines = data.reduce((n, m) => n + m.engineCount, 0);
  const totalFamilies = data.reduce((n, m) => n + m.families.length, 0);

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <SEOHead
        title="Engine Specs Database"
        description={`Bore, stroke, displacement, compression and rod ratio for ${totalEngines} engines across ${data.length} manufacturers. Free reference for engine builders.`}
        canonical="/engines"
      />
      <h1 className="text-4xl font-bold mb-1">Engine Specs Database</h1>
      <p className="text-muted-foreground mb-6">
        {totalEngines} engines · {totalFamilies} families · {data.length} manufacturers
      </p>

      <Input
        placeholder="Filter by manufacturer or family…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-8 max-w-md"
      />

      <div className="space-y-6">
        {filtered.map((m) => (
          <Card key={m.url}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                <Link href={m.url} className="hover:text-[#E85D04]">
                  {m.name}
                </Link>
                <span className="ml-2 font-normal text-muted-foreground text-sm">
                  {m.engineCount} engines
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                {m.families.map((f) => (
                  <li key={f.url}>
                    <Link href={f.url} className="text-[#E85D04] hover:underline">
                      {f.familyName}
                    </Link>
                    <span className="text-muted-foreground"> ({f.engineCount})</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground">No manufacturers or families match “{filter}”.</p>
        )}
      </div>
    </div>
  );
}
