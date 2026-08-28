import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import type { CamDoc, CamRecord } from "@/lib/camTypes";

/**
 * A single camshaft grind: /cams/<manufacturer>/<part>
 *
 * Aimed at part-number searches ("COMP Cams XE262H specs", "12-238-2"), which
 * identify one product exactly and are otherwise answered only by retailer
 * listings. What this page adds over a listing: duration at 0.050" for both
 * sides, LSA and the published RPM range in one table; the nearest grinds on the
 * same platform; and a link into the Cam Selector loaded with these numbers.
 */
export default function CamPage() {
  const { mfr, part } = useParams<{ mfr: string; part: string }>();
  const [doc, setDoc] = useState<CamDoc | null>(null);

  useEffect(() => {
    fetch("/data/cam-pages/index.json")
      .then((r) => r.json())
      .then(setDoc)
      .catch(() => setDoc({ cams: [], manufacturers: [] }));
  }, []);

  if (!doc) {
    return (
      <div className="container mx-auto max-w-3xl py-10 px-4">
        <Skeleton className="h-10 w-72 mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const cam: CamRecord | undefined = doc.cams.find((c) => c.url === `/cams/${mfr}/${part}`);
  if (!cam) {
    return (
      <div className="container mx-auto max-w-3xl py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Camshaft not found</h1>
        <Link href="/cams" className="text-[#E85D04] hover:underline">Browse all camshafts</Link>
      </div>
    );
  }

  const title = `${cam.mfr} ${cam.family} Cam Specs`;
  const description =
    `${cam.part} — ${cam.int050}${cam.exh050 != null ? `/${cam.exh050}` : ""} duration at 0.050", ` +
    `${cam.liftInt}"/${cam.liftExh}" lift, ${cam.lsa} LSA. ${cam.platformLabel}, ${cam.lifterLabel.toLowerCase()}.`;

  const selectorHref =
    `/calculators/cam-selector?platform=${encodeURIComponent(cam.platform)}` +
    `&int050=${cam.int050}&lsa=${cam.lsa}`;

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <SEOHead title={title} description={description} canonical={cam.url} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6 flex flex-wrap gap-1.5">
        <Link href="/cams" className="hover:text-primary">Camshafts</Link>
        <span>/</span>
        <Link href={cam.mfrUrl} className="hover:text-primary">{cam.mfr}</Link>
      </nav>

      <h1 className="text-4xl font-bold mb-1">{title}</h1>
      <p className="text-muted-foreground mb-6">
        Part {cam.part} · {cam.platformLabel} · {cam.lifterLabel}
      </p>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Specifications</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Part number" value={cam.part} />
              <Row label="Duration at 0.050″, intake" value={`${cam.int050}°`} />
              <Row label="Duration at 0.050″, exhaust" value={cam.exh050 != null ? `${cam.exh050}°` : "Not published"} />
              <Row label="Valve lift, intake" value={`${cam.liftInt}″`} />
              <Row label="Valve lift, exhaust" value={`${cam.liftExh}″`} />
              <Row label="Lobe separation angle" value={`${cam.lsa}°`} />
              <Row
                label="Published RPM range"
                value={cam.rpmLo != null && cam.rpmHi != null
                  ? `${cam.rpmLo.toLocaleString()}–${cam.rpmHi.toLocaleString()} RPM`
                  : "Not published"}
              />
              <Row label="Lifter type" value={cam.lifterLabel} />
              <Row label="Platform" value={cam.platformLabel} />
              <Row label="Intended use" value={cam.use} />
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-4">
            Lift is quoted at the platform's standard rocker ratio. Duration at 0.050″ and LSA are
            the specs the selector matches on.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6 print:hidden">
        <CardHeader className="pb-3"><CardTitle className="text-base">Is this the right cam?</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Open the Cam Selector with this grind's duration and LSA already entered, then set your
            compression, gearing and converter to see whether it suits your combination.
          </p>
          <Link href={selectorHref} className="text-[#E85D04] hover:underline text-sm font-medium">
            Check this cam against your build →
          </Link>
        </CardContent>
      </Card>

      {cam.similar.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Similar grinds for {cam.platformLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Closest by duration at 0.050″, the spec that most determines where the power lands.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Cam</th>
                    <th className="text-left py-2 pr-4 font-medium">Part</th>
                    <th className="text-left py-2 pr-4 font-medium">Dur @.050″</th>
                    <th className="text-left py-2 font-medium">LSA</th>
                  </tr>
                </thead>
                <tbody>
                  {cam.similar.map((s) => (
                    <tr key={s.url} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Link href={s.url} className="text-[#E85D04] hover:underline">
                          {s.mfr} {s.family}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 tabular-nums whitespace-nowrap">{s.part}</td>
                      <td className="py-2 pr-4 tabular-nums">{s.int050}°</td>
                      <td className="py-2 tabular-nums">{s.lsa}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-8">
        Specs and part numbers change. Always confirm current data with {cam.mfr} before ordering.
      </p>
    </div>
  );
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
