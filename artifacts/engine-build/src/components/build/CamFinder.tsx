import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { camToFields, type CatalogCam } from "@/components/build/CamPartPicker";
import { buildEngine, camFits, normPart, type CamFit } from "@/data/camFitment";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE = 12;

const TYPE_LABEL: Record<string, string> = {
  hydraulic_flat: "Hydraulic flat tappet",
  hydraulic_roller: "Hydraulic roller",
  solid_flat: "Solid flat tappet",
  solid_roller: "Solid roller",
};

type Row = { cam: CatalogCam; fit: CamFit };

let dataPromise: Promise<{ cams: CatalogCam[]; fits: CamFit[] }> | null = null;
function loadData() {
  dataPromise ??= Promise.all([
    fetch(`${BASE}/data/cam-catalog.json`).then((r) => (r.ok ? r.json() : { cams: [] })),
    fetch(`${BASE}/data/cam-fitment.json`).then((r) => (r.ok ? r.json() : [])),
  ])
    .then(([cat, fits]) => ({ cams: cat.cams as CatalogCam[], fits: fits as CamFit[] }))
    .catch(() => {
      dataPromise = null;
      return { cams: [], fits: [] };
    });
  return dataPromise;
}

const summitUrl = (c: CatalogCam) =>
  `https://www.summitracing.com/search?keyword=${encodeURIComponent(`${c.m} ${c.p}`)}`;

/**
 * "Cams that fit this engine" — the buying step for the cam section.
 *
 * Lists every catalog cam whose published fitment matches this build's
 * manufacturer, displacement, cylinder count and (when known) model year, so a
 * builder can compare real part numbers instead of searching blind. Picking one
 * fills the cam section through the same camToFields mapping the part-number
 * lookup uses, and each cam links to where to buy it.
 */
export function CamFinder({
  engineSlug,
  fields,
  setFields,
}: {
  engineSlug: string | undefined;
  fields: Record<string, string>;
  setFields: (entries: Record<string, string>) => void;
}) {
  const [data, setData] = useState<{ cams: CatalogCam[]; fits: CamFit[] } | null>(null);
  const [type, setType] = useState<string>(fields["cam.type"] || "all");
  const [shown, setShown] = useState(PAGE);
  const [yearInput, setYearInput] = useState("");

  useEffect(() => {
    loadData().then(setData);
  }, []);

  const engine = buildEngine(engineSlug, fields);
  const targetRpm = parseInt(fields["meta.targetRPM"] || "", 10);

  const matches: Row[] = useMemo(() => {
    if (!data) return [];
    const byPart = new Map(data.cams.map((c) => [normPart(c.p), c]));
    const rows: Row[] = [];
    for (const f of data.fits) {
      if (!camFits(f, engine)) continue;
      const cam = byPart.get(f.p);
      if (cam) rows.push({ cam, fit: f });
    }
    // Closest to the build's target peak RPM first; otherwise mildest first.
    const rpmScore = (c: CatalogCam) =>
      !Number.isFinite(targetRpm) || c.rl == null || c.rh == null
        ? 0
        : targetRpm < c.rl ? c.rl - targetRpm : targetRpm > c.rh ? targetRpm - c.rh : 0;
    return rows.sort((a, b) => rpmScore(a.cam) - rpmScore(b.cam) || a.cam.i - b.cam.i);
    // engine is derived from fields; depend on its parts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, engine.mfr, engine.ci, engine.cyl, engine.isLS, engine.yearFrom, engine.yearTo, targetRpm]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of matches) if (r.cam.ty) c[r.cam.ty] = (c[r.cam.ty] ?? 0) + 1;
    return c;
  }, [matches]);

  const filtered = type === "all" ? matches : matches.filter((r) => r.cam.ty === type);
  const chosen = normPart(fields["cam.partNumber"] || "");
  const buildRatio = parseFloat(fields["valvetrain.rockerRatio"] || "");

  function use(c: CatalogCam) {
    const r = camToFields(c, Number.isFinite(buildRatio) && buildRatio > 0 ? buildRatio : null);
    setFields(r.fields);
  }

  if (engine.ci == null) {
    return (
      <div className="mb-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
        Fill in bore, stroke and cylinders in <strong>Block Specs</strong> to see the cams that fit this engine.
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-lg border border-[#E85D04]/20 bg-[#E85D04]/5 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          <Search className="mr-1.5 inline h-4 w-4 text-[#E85D04]" />
          Cams that fit your {engine.ci} ci engine
          {data && <span className="font-normal text-gray-500"> · {matches.length.toLocaleString()} found</span>}
        </p>
        {Number.isFinite(targetRpm) && <span className="text-xs text-gray-500">Sorted by fit to your {targetRpm.toLocaleString()} RPM target</span>}
      </div>

      {engine.yearFrom == null && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span>Add your engine's year to narrow the list (roller and flat-tappet blocks differ by year):</span>
          <Input
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="e.g. 1987"
            className="h-8 w-24 bg-white"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={yearInput.length !== 4}
            onClick={() => setFields({ "engine.yearFrom": yearInput, "engine.yearTo": yearInput })}
          >
            Apply
          </Button>
        </div>
      )}
      {engine.yearFrom != null && (
        <p className="mb-3 text-xs text-gray-600">
          Showing cams listed for {engine.yearFrom === engine.yearTo ? engine.yearFrom : `${engine.yearFrom}–${engine.yearTo}`}.{" "}
          <button className="text-[#E85D04] hover:underline" onClick={() => setFields({ "engine.yearFrom": "", "engine.yearTo": "" })}>
            Show all years
          </button>
        </p>
      )}

      {!data ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading cams…
        </div>
      ) : matches.length === 0 ? (
        <p className="text-sm text-gray-600">
          No catalog cams are listed for this engine yet — more part numbers are on the way. Look one up by part number below, or enter your cam's specs by hand.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[["all", `All (${matches.length})`], ...Object.entries(TYPE_LABEL).filter(([k]) => counts[k]).map(([k, v]) => [k, `${v} (${counts[k]})`])].map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setType(k); setShown(PAGE); }}
                className={`rounded-full border px-3 py-1 text-xs ${type === k ? "border-[#E85D04] bg-[#E85D04] text-white" : "border-gray-300 bg-white text-gray-700 hover:border-[#E85D04]"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {filtered.slice(0, shown).map(({ cam, fit }) => {
              const isChosen = chosen && normPart(cam.p) === chosen;
              return (
                <div key={`${cam.m}|${cam.p}`} className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between ${isChosen ? "bg-green-50" : ""}`}>
                  <div className="min-w-0 text-xs text-gray-600">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">{cam.p}</span>
                      <span>{cam.m}{cam.f ? ` · ${cam.f}` : ""}</span>
                      {isChosen && <span className="inline-flex items-center gap-1 font-semibold text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> In your build</span>}
                    </div>
                    <div>
                      {cam.i}/{cam.e ?? "–"}° @ .050 · {cam.li ?? "–"}/{cam.le ?? "–"}″ lift · {cam.lsa}° LSA
                      {cam.rl && cam.rh ? ` · ${cam.rl.toLocaleString()}–${cam.rh.toLocaleString()} RPM` : ""}
                      {cam.ty ? ` · ${TYPE_LABEL[cam.ty] ?? cam.ty}` : ""}
                    </div>
                    <div className="text-gray-400">Fits: {fit.fit}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button size="sm" variant={isChosen ? "outline" : "default"} className={isChosen ? "" : "bg-[#E85D04] text-white hover:bg-[#E85D04]/90"} onClick={() => use(cam)}>
                      {isChosen ? "Selected" : "Use this cam"}
                    </Button>
                    <a href={cam.src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#E85D04] hover:underline">
                      Spec card <ExternalLink className="h-3 w-3" />
                    </a>
                    <a href={summitUrl(cam)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#E85D04] hover:underline">
                      Price <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > shown && (
            <button className="mt-2 text-xs font-medium text-[#E85D04] hover:underline" onClick={() => setShown(shown + PAGE)}>
              Show {Math.min(PAGE, filtered.length - shown)} more of {filtered.length - shown}
            </button>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Fitment and specs as published by the manufacturer. Check the spec card for your exact block — retrofit roller and flat-tappet versions share displacements.
          </p>
        </>
      )}
    </div>
  );
}
