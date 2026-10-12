import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import type { VehicleDoc, VehicleEngine } from "@/lib/vehicleTypes";
import { hpText, vehicleEngineLabel } from "@/data/vehicleText.mjs";

/**
 * Vehicle page: /vehicles/<make>/<model>
 *
 * Every factory engine the model offered, by model year, grouped by
 * generation. Data from public/data/vehicle-pages/<make>/<model>.json, built by
 * scripts/vehicleData.mjs from the curated, source-checked files in
 * data/vehicles/. The prerender emits the same tables from the same data.
 */
export default function VehicleModelPage() {
  const { make, model } = useParams<{ make: string; model: string }>();
  const [doc, setDoc] = useState<VehicleDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/data/vehicle-pages/${make}/${model}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d: VehicleDoc) => {
        if (cancelled) return;
        setDoc(d);
        setState("ready");
      })
      .catch(() => !cancelled && setState("missing"));
    return () => {
      cancelled = true;
    };
  }, [make, model]);

  // Land on the year in the URL (#1969) once the tables exist.
  useEffect(() => {
    if (state !== "ready" || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [state]);

  const byYear = useMemo(() => {
    const m = new Map<number, VehicleEngine[]>();
    for (const e of doc?.engines ?? []) {
      if (!m.has(e.year)) m.set(e.year, []);
      m.get(e.year)!.push(e);
    }
    return m;
  }, [doc]);

  if (state === "loading") {
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4">
        <Skeleton className="h-10 w-80 mb-4" />
        <Skeleton className="h-6 w-full max-w-2xl mb-8" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (state === "missing" || !doc) {
    return (
      <div className="container mx-auto max-w-5xl py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Vehicle not found</h1>
        <Link href="/vehicles" className="text-[#E85D04] hover:underline">
          Browse all vehicles
        </Link>
      </div>
    );
  }

  const years = [...byYear.keys()];
  const yearLabel = (y: number) => byYear.get(y)?.[0]?.yearLabel ?? String(y);
  const jump = (y: string) => {
    if (!y) return;
    history.replaceState(null, "", `#${y}`);
    document.getElementById(y)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <SEOHead title={doc.title} description={doc.description} canonical={doc.url} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6 flex flex-wrap gap-1.5">
        <Link href="/vehicles" className="hover:text-primary">Vehicles</Link>
        <span>/</span>
        <Link href={doc.makeUrl} className="hover:text-primary">{doc.make}</Link>
      </nav>

      <h1 className="text-4xl font-bold mb-4">{doc.make} {doc.model} Engines by Year</h1>
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/90 max-w-3xl mb-8">
        {doc.intro.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {/* Year picker: a select for quick jumps, and every year as a link so
          the page also works as a table of contents. */}
      <section aria-labelledby="pick-year" className="rounded-lg border bg-card p-4 mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 id="pick-year" className="text-base font-semibold">Find your year</h2>
          <label htmlFor="year-select" className="sr-only">Model year</label>
          <select
            id="year-select"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            defaultValue=""
            onChange={(e) => jump(e.target.value)}
          >
            <option value="" disabled>Choose a year</option>
            {years.map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {doc.generations.map((g) => {
            const ys = years.filter((y) => y >= g.years[0] && y <= g.years[1]);
            if (!ys.length) return null;
            return (
              <div key={g.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="text-muted-foreground min-w-[11rem]">{g.name}</span>
                {ys.map((y) => (
                  <a key={y} href={`#${y}`} className="tabular-nums text-[#E85D04] hover:underline">
                    {yearLabel(y)}
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {doc.generations.map((g) => {
        const ys = years.filter((y) => y >= g.years[0] && y <= g.years[1]);
        if (!ys.length) return null;
        return (
          <section key={g.key} className="mb-12">
            <h2 className="text-2xl font-bold mb-3">
              {g.name} <span className="text-muted-foreground font-normal">({g.years[0]}–{g.years[1]})</span>
            </h2>
            {g.intro?.length ? (
              <div className="space-y-3 text-[15px] leading-relaxed text-foreground/90 max-w-3xl mb-6">
                {g.intro.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            ) : null}
            {ys.map((y) => <YearTable key={y} year={y} label={yearLabel(y)} model={doc.model} engines={byYear.get(y)!} />)}
          </section>
        );
      })}

      <section className="mt-12 rounded-lg border p-5 text-sm">
        <h2 className="text-base font-semibold mb-2">How this page was checked</h2>
        <p className="text-muted-foreground mb-4 max-w-3xl">{doc.method} Engines the sources disagree on are left off.</p>
        <h3 className="font-semibold mb-2">Sources</h3>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {doc.sources.map((s) => (
            <li key={s.url} className="min-w-0">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#E85D04] hover:underline break-words">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function YearTable({ year, label, model, engines }: { year: number; label: string; model: string; engines: VehicleEngine[] }) {
  const road = engines.filter((e) => !e.race);
  const race = engines.filter((e) => e.race);
  return (
    <div id={String(year)} className="mb-8 scroll-mt-20">
      <h3 className="text-lg font-semibold mb-2">
        {label} {model} engines{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {road.length} engine{road.length === 1 ? "" : "s"} · {road[0]?.hpBasis === "net" ? "SAE net hp" : "gross hp"}
        </span>
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm min-w-[680px] table-fixed">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[17%]" />
            <col className="w-[27%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left py-2 px-3 font-medium">Engine</th>
              <th className="text-left py-2 px-3 font-medium">Rated</th>
              <th className="text-left py-2 px-3 font-medium">Offered in</th>
              <th className="text-left py-2 px-3 font-medium">Verified by</th>
            </tr>
          </thead>
          <tbody>
            {road.map((e) => (
              <tr key={`${e.cid}-${e.hp}-${e.code}`} className="border-b last:border-0 align-top">
                <td className="py-2 px-3">
                  {e.engineUrl || e.familyUrl ? (
                    <Link href={(e.engineUrl ?? e.familyUrl)!} className="font-medium text-[#E85D04] hover:underline">
                      {vehicleEngineLabel(e)}
                    </Link>
                  ) : (
                    <span className="font-medium">{vehicleEngineLabel(e)}</span>
                  )}
                  {e.note && <div className="text-xs text-muted-foreground mt-0.5">{e.note}</div>}
                </td>
                <td className="py-2 px-3 tabular-nums whitespace-nowrap">{hpText(e)}</td>
                <td className="py-2 px-3">{e.trims.join(", ") || "—"}</td>
                <td className="py-2 px-3">
                  <details>
                    <summary className="cursor-pointer text-muted-foreground whitespace-nowrap">
                      {e.sourceCount} sources
                    </summary>
                    <ul className="mt-1.5 space-y-1 text-xs">
                      {e.nhra && (
                        <li>
                          <a href="https://www.nhraracer.com/stockcarclassification" target="_blank" rel="noopener noreferrer" className="text-[#E85D04] hover:underline inline-flex items-center gap-1">
                            NHRA Stock Car Classification Guides <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </li>
                      )}
                      {e.sources.map((s) => (
                        <li key={s.url + s.name}>
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#E85D04] hover:underline inline-flex items-center gap-1">
                            {s.name} <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {race.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Factory race-only packages (not street legal):{" "}
          {race.map((e) => `${vehicleEngineLabel(e)}, ${hpText(e)}`).join("; ")}
        </p>
      )}
    </div>
  );
}
