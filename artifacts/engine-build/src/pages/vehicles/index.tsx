import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import type { VehicleSummary } from "@/lib/vehicleTypes";

/**
 * /vehicles and /vehicles/<make>: the models with verified engine-by-year
 * pages, grouped by make. Data from public/data/vehicle-pages/index.json.
 */
export default function VehiclesIndex() {
  const { make } = useParams<{ make?: string }>();
  const [all, setAll] = useState<VehicleSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/vehicle-pages/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: VehicleSummary[]) => !cancelled && setAll(d))
      .catch(() => !cancelled && setAll([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const list = (all ?? []).filter((v) => !make || v.makeSlug === make);
  const makes = [...new Set(list.map((v) => v.make))];
  const makeName = make ? list[0]?.make ?? make : null;

  const title = makeName ? `${makeName} Engines by Vehicle and Year` : "Factory Engines by Vehicle and Year";
  const description = makeName
    ? `Factory engines by model year for the ${makeName} ${list.map((v) => v.model).join(", ")}, with ratings and RPO or engine codes.`
    : "Which engines each car came with, year by year: displacement, rated horsepower and RPO or engine codes.";

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <SEOHead title={title} description={description} canonical={make ? `/vehicles/${make}` : "/vehicles"} />

      {make && (
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href="/vehicles" className="hover:text-primary">Vehicles</Link>
        </nav>
      )}

      <h1 className="text-4xl font-bold mb-3">{makeName ? `${makeName} engines by vehicle` : "Factory engines by vehicle"}</h1>
      <p className="text-muted-foreground max-w-3xl mb-8">
        Pick a car to see every engine it was offered with, year by year. Each engine links to
        its full specs.
      </p>

      {all == null ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : list.length === 0 ? (
        <p className="text-muted-foreground">No vehicles here yet.</p>
      ) : (
        <div className="space-y-8">
          {makes.map((m) => (
            <section key={m}>
              {!make && <h2 className="text-xl font-semibold mb-3">{m}</h2>}
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.filter((v) => v.make === m).map((v) => (
                  <li key={v.url}>
                    <Link href={v.url} className="block rounded-lg border p-4 hover:border-[#E85D04] transition-colors">
                      <span className="font-semibold">{v.make} {v.model}</span>
                      <span className="block text-sm text-muted-foreground tabular-nums">
                        {v.yearMin}–{v.yearMax} · {v.generations.length} generation{v.generations.length === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
