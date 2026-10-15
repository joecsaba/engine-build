import { useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EngineFamilyDoc, EngineRecord, ManufacturerSummary } from "@/lib/engineTypes";

/**
 * Engine search plus manufacturer → family → engine picker that autofills a
 * calculator.
 *
 * Reads /data/engine-pages/, the merged dataset built by scripts/engineData.mjs
 * — the same one behind the engine spec pages. The older per-calculator pickers
 * read /data/engines/ directly, which is the raw import: `head` is null on every
 * record there, so chamber volume, rocker ratio, valve sizes and lifter type
 * were unreachable no matter which engine you picked.
 *
 * Hands the caller the whole EngineRecord and lets it decide what to fill, so
 * one component serves calculators with completely different inputs.
 *
 * Every engine stays selectable even when it is missing fields a given
 * calculator wants. Partial data beats no data: filling three of five inputs
 * still saves the reader three lookups, and hiding the engine would just make
 * the database look emptier than it is. The caller reports back which fields it
 * managed to fill and the picker names the rest, so nobody is left guessing
 * which boxes still need a number.
 *
 * Open by default with a search box first (2026-10-15): behind a collapsed
 * link and three dropdowns, finding a D16Z6 meant already knowing it lives
 * under Honda → D-series. The search reads /data/engine-pages/search.json,
 * loaded on first use.
 */
interface Props {
  /** Fill what you can; return the labels of the fields you filled. */
  onSelect: (engine: EngineRecord) => string[] | void;
  /** Labels this calculator can fill, used to report what was missing. */
  fills?: string[];
  label?: string;
  defaultOpen?: boolean;
}

interface SearchRow { n: string; f: string; s: string; k: string; y: string; d: number | null; p?: number; c?: number }

const MAX_RESULTS = 12;

export function EnginePicker({ onSelect, fills = [], label = "Auto-fill from engine database", defaultOpen = true }: Props) {
  const [filled, setFilled] = useState<string[] | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [mfrs, setMfrs] = useState<ManufacturerSummary[] | null>(null);
  const [mfrUrl, setMfrUrl] = useState("");
  const [famUrl, setFamUrl] = useState("");
  const [engSlug, setEngSlug] = useState("");
  const [doc, setDoc] = useState<EngineFamilyDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchRow[] | null>(null);
  const [picked, setPicked] = useState<string>("");
  // a search result names its engine before its family doc has loaded
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!open || mfrs) return;
    fetch("/data/engine-pages/manufacturers.json")
      .then((r) => r.json())
      .then(setMfrs)
      .catch(() => setMfrs([]));
  }, [open, mfrs]);

  const indexRequested = useRef(false);
  const loadIndex = () => {
    if (index || indexRequested.current) return;
    indexRequested.current = true;
    fetch("/data/engine-pages/search.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  };

  useEffect(() => {
    if (!famUrl) { setDoc(null); return; }
    // famUrl is "/engines/<mfr>/<family>" — the JSON mirrors that path.
    const path = famUrl.replace(/^\/engines\//, "");
    setLoading(true);
    let cancelled = false;
    fetch(`/data/engine-pages/${path}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("missing"))))
      .then((d: EngineFamilyDoc) => !cancelled && setDoc(d))
      .catch(() => !cancelled && setDoc(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [famUrl]);

  const families = useMemo(
    () => mfrs?.find((m) => m.url === mfrUrl)?.families ?? [],
    [mfrs, mfrUrl]
  );

  const engines = doc?.engines ?? [];

  // A caller that returns nothing doesn't report what it filled; say nothing
  // rather than "No data available" over inputs that did fill.
  const fill = (e: EngineRecord) => {
    const got = onSelect(e);
    setFilled(Array.isArray(got) ? got : null);
  };

  const handleEngine = (slug: string) => {
    setEngSlug(slug);
    const e = engines.find((x) => x.slug === slug);
    if (e) fill(e);
  };

  // finish a search pick once its family doc arrives
  useEffect(() => {
    if (!doc || !pending.current) return;
    const e = doc.engines.find((x) => x.slug === pending.current);
    pending.current = null;
    if (e) { setEngSlug(e.slug); fill(e); }
    // fill reads the latest onSelect; doc is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!index || !words.length) return [];
    // Rank: a whole word in the engine's name beats a partial match in its
    // name, which beats a match only in its family or codes; then shorter
    // names, so "350" puts "Chevrolet 350" ahead of year-by-year variants.
    const score = (r: SearchRow) => {
      const name = r.n.toLowerCase();
      // "350ci" also counts as the word "350"
      const tokens = name.split(/[^a-z0-9.]+/).flatMap((t) => (/^\d+ci$/.test(t) ? [t, t.slice(0, -2)] : [t]));
      return words.reduce((s, w) => s + (tokens.includes(w) ? 3 : name.includes(w) ? 2 : 1), 0);
    };
    return index
      .filter((r) => words.every((w) => r.k.includes(w)))
      .map((r) => ({ r, s: score(r) }))
      .sort((a, b) => b.s - a.s || (b.r.c ?? 0) - (a.r.c ?? 0) || (b.r.p ?? 0) - (a.r.p ?? 0) || a.r.n.length - b.r.n.length)
      .slice(0, MAX_RESULTS)
      .map((x) => x.r);
  }, [index, query]);

  const pickResult = (r: SearchRow) => {
    setPicked(r.n);
    setQuery("");
    setMfrUrl(r.f.split("/").slice(0, 3).join("/"));
    if (r.f === famUrl && doc) {
      const e = doc.engines.find((x) => x.slug === r.s);
      if (e) { setEngSlug(e.slug); fill(e); }
      return;
    }
    pending.current = r.s;
    setEngSlug("");
    setFamUrl(r.f);
  };

  const missing = filled ? fills.filter((f) => !filled.includes(f)) : [];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm font-medium text-[#E85D04] hover:underline"
      >
        {open ? "Hide engine picker ↑" : `${label} ↓`}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="space-y-1 relative">
            <Label htmlFor="engine-search" className="text-xs">Search engines</Label>
            <Input
              id="engine-search"
              value={query}
              onFocus={loadIndex}
              onChange={(ev) => { loadIndex(); setQuery(ev.target.value); }}
              placeholder="Type an engine: D16Z6, LS1, Buick 455, 2JZ…"
              autoComplete="off"
            />
            {query.trim() && (
              <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md text-sm">
                {!index && <li className="px-3 py-2 text-muted-foreground">Loading…</li>}
                {index && !results.length && <li className="px-3 py-2 text-muted-foreground">No engine matches “{query.trim()}”.</li>}
                {results.map((r) => (
                  <li key={`${r.f}/${r.s}`}>
                    <button
                      type="button"
                      onClick={() => pickResult(r)}
                      className="w-full text-left px-3 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                    >
                      <span className="font-medium">{r.n}</span>
                      <span className="text-muted-foreground">
                        {r.d != null ? ` · ${Math.round(r.d)} ci` : ""}{r.y ? ` · ${r.y}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Or browse by maker:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Manufacturer</Label>
              <Select
                value={mfrUrl}
                onValueChange={(v) => { setMfrUrl(v); setFamUrl(""); setEngSlug(""); setPicked(""); }}
              >
                <SelectTrigger><SelectValue placeholder={mfrs ? "Select..." : "Loading..."} /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {(mfrs ?? []).map((m) => (
                    <SelectItem key={m.url} value={m.url}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Family</Label>
              <Select
                value={famUrl}
                onValueChange={(v) => { setFamUrl(v); setEngSlug(""); setPicked(""); }}
                disabled={!mfrUrl}
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {families.map((f) => (
                    <SelectItem key={f.url} value={f.url}>{f.familyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Engine</Label>
              <Select value={engSlug} onValueChange={(v) => { setPicked(""); handleEngine(v); }} disabled={!doc || loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : engines.length ? "Select..." : "None with this data"} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {engines.map((e) => (
                    <SelectItem key={e.slug} value={e.slug}>
                      {e.displayName}
                      {e.displacement_ci != null ? ` — ${e.displacement_ci}ci` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {open && filled && (
        <p className="mt-2 text-xs text-muted-foreground">
          {picked ? <><span className="text-foreground">{picked}</span>: </> : null}
          {filled.length
            ? <>Filled <span className="text-foreground">{filled.join(", ")}</span>.</>
            : <>No data available for this engine.</>}
          {missing.length ? <> We don&apos;t have {missing.join(", ")} for this one — enter {missing.length === 1 ? "it" : "them"} below.</> : null}
        </p>
      )}
    </div>
  );
}
