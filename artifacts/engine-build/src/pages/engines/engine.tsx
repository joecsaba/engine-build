import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import type { EngineFamilyDoc, EngineRecord } from "@/lib/engineTypes";

/**
 * Engine spec page: /engines/<mfr>/<family>/<engine>
 *
 * Data comes from public/data/engine-pages/<mfr>/<family>.json, generated at
 * build time by scripts/engineData.mjs. That same generator feeds the
 * prerenderer, so the specs here and the specs Googlebot indexes come from one
 * source and cannot drift.
 *
 * Torque specs are deliberately absent — that dataset is on hold and must not
 * be surfaced anywhere. See scripts/engineData.mjs.
 */
export default function EnginePage() {
  const { mfr, family, engine } = useParams<{ mfr: string; family: string; engine: string }>();
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
        setState(d.engines.some((e) => e.slug === engine) ? "ready" : "missing");
      })
      .catch(() => !cancelled && setState("missing"));
    return () => {
      cancelled = true;
    };
  }, [mfr, family, engine]);

  const rec = doc?.engines.find((e) => e.slug === engine) ?? null;

  if (state === "loading") {
    return (
      <div className="container mx-auto max-w-4xl py-10 px-4">
        <Skeleton className="h-10 w-72 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (state === "missing" || !rec || !doc) {
    return (
      <div className="container mx-auto max-w-4xl py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Engine not found</h1>
        <p className="text-muted-foreground mb-6">
          We don't have a spec page at this address.
        </p>
        <Link href="/engines">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Browse all engines
          </Button>
        </Link>
      </div>
    );
  }

  const title = `${rec.manufacturerName} ${rec.displayName} Specs`;
  const description = specDescription(rec);
  const calcLinks = rec.calcLinks ?? [];

  return (
    <div className="container mx-auto max-w-4xl py-10 px-4">
      <SEOHead
        title={`${title} — Bore, Stroke, Compression`}
        description={description}
        canonical={rec.url}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6 flex flex-wrap gap-1.5">
        <Link href="/engines" className="hover:text-primary">Engines</Link>
        <span>/</span>
        <Link href={rec.manufacturerUrl} className="hover:text-primary">{rec.manufacturerName}</Link>
        <span>/</span>
        <Link href={rec.familyUrl} className="hover:text-primary">{rec.familyName}</Link>
      </nav>

      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-1">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <SpecTable rec={rec} />

      {calcLinks.length > 0 && (
        <Card className="mt-6 print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Run the numbers for this engine</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Each link opens the calculator with this engine's specs already filled in.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {calcLinks.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="text-[#E85D04] hover:underline">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}


      {rec.head && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cylinder head</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm max-w-md">
              <tbody>
                <Row label="Intake valve diameter" value={rec.head.intake_valve_dia != null ? `${rec.head.intake_valve_dia}"` : null} />
                <Row label="Exhaust valve diameter" value={rec.head.exhaust_valve_dia != null ? `${rec.head.exhaust_valve_dia}"` : null} />
                <Row label="Cam lift, intake" value={rec.head.cam_intake_lift != null ? `${rec.head.cam_intake_lift}"` : null} />
                <Row label="Cam lift, exhaust" value={rec.head.cam_exhaust_lift != null ? `${rec.head.cam_exhaust_lift}"` : null} />
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {rec.variantCount > 1 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Variants sharing these dimensions ({rec.variantCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              These records share identical bore, stroke, displacement and compression.
              They differ by model year and factory power rating.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Year</th>
                    <th className="text-left py-2 pr-4 font-medium">Advertised HP</th>
                    <th className="text-left py-2 font-medium">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.variants.map((v) => (
                    <tr key={v.engine_id} className="border-b last:border-0">
                      <td className="py-2 pr-4 tabular-nums">{v.year ?? "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">{v.hp != null ? `${v.hp} hp` : "—"}</td>
                      <td className="py-2">{v.codes.length ? v.codes.join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {rec.vehicles.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vehicles ({rec.vehicles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {rec.vehicles.map((v, i) => (
                <li key={i}>
                  {v.name}
                  {v.year_start ? ` (${v.year_start}${v.year_end ? `–${v.year_end}` : "+"})` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}


      {rec.relatedEngines?.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Similar engines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {rec.relatedEngines.map((r) => (
                <li key={r.url}>
                  <Link href={r.url} className="text-[#E85D04] hover:underline">
                    {r.manufacturerName} {r.displayName}
                  </Link>
                  {r.displacement_ci != null && (
                    <span className="text-muted-foreground"> — {r.displacement_ci} ci</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-8">
        Specs are for reference and build planning. Always verify against the factory service
        manual for your exact engine — dimensions vary by production year, casting and application.
      </p>
    </div>
  );
}

function specDescription(rec: EngineRecord) {
  const bits: string[] = [];
  if (rec.displacement_ci != null) {
    bits.push(`${rec.displacement_ci} ci${rec.displacement_l != null ? ` (${rec.displacement_l}L)` : ""}`);
  }
  if (rec.num_cylinders != null) bits.push(`${rec.num_cylinders}-cylinder`);
  if (rec.bore_in != null && rec.stroke_in != null) {
    bits.push(`${rec.bore_in}" bore × ${rec.stroke_in}" stroke`);
  }
  if (rec.compression_ratio != null) bits.push(`${rec.compression_ratio}:1 compression`);
  return bits.join(", ") + ".";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{label}</td>
      <td className="py-2 font-medium tabular-nums">{value}</td>
    </tr>
  );
}

function SpecTable({ rec }: { rec: EngineRecord }) {
  const cap = (s: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : null);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dimensions</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Displacement" value={rec.displacement_ci != null ? `${rec.displacement_ci} ci${rec.displacement_l != null ? ` / ${rec.displacement_l} L` : ""}` : null} />
              <Row label="Bore" value={rec.bore_in != null ? `${rec.bore_in}"${rec.bore_mm != null ? ` / ${rec.bore_mm} mm` : ""}` : null} />
              <Row label="Stroke" value={rec.stroke_in != null ? `${rec.stroke_in}"${rec.stroke_mm != null ? ` / ${rec.stroke_mm} mm` : ""}` : null} />
              <Row label="Cylinders" value={rec.num_cylinders} />
              <Row label="Configuration" value={rec.configuration} />
              <Row label="Compression ratio" value={rec.compression_ratio != null ? `${rec.compression_ratio}:1` : null} />
              <Row label="Rod length" value={rec.rod_length_in != null ? `${rec.rod_length_in}"` : null} />
              <Row label="Rod ratio" value={rec.rod_ratio} />
              <Row label="Bore/stroke ratio" value={rec.boreStrokeRatio} />
              <Row label="Deck height" value={rec.deck_height_in != null ? `${rec.deck_height_in}"` : null} />
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Construction</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Block material" value={cap(rec.block_material)} />
              <Row label="Head material" value={cap(rec.head_material)} />
              <Row label="Valvetrain" value={rec.valvetrain} />
              <Row label="Valves per cylinder" value={rec.valves_per_cylinder} />
              <Row label="Cam type" value={cap(rec.cam_type)} />
              <Row label="Induction" value={cap(rec.induction)} />
              <Row label="Fuel type" value={cap(rec.fuel_type)} />
              <Row label="Firing order" value={rec.firing_order} />
              <Row
                label="Advertised HP"
                value={rec.hpMin != null ? (rec.hpMin === rec.hpMax ? `${rec.hpMin} hp` : `${rec.hpMin}–${rec.hpMax} hp`) : null}
              />
              <Row
                label="Years"
                value={rec.yearMin != null ? (rec.yearMin === rec.yearMax ? rec.yearMin : `${rec.yearMin}–${rec.yearMax}`) : null}
              />
              <Row label="Oil capacity" value={rec.oil_capacity_qt != null ? `${rec.oil_capacity_qt} qt` : null} />
              <Row label="Coolant capacity" value={rec.coolant_capacity_qt != null ? `${rec.coolant_capacity_qt} qt` : null} />
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
