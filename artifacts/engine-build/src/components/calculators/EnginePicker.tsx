import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EngineFamilyDoc, EngineRecord, ManufacturerSummary } from "@/lib/engineTypes";

/**
 * Manufacturer → family → engine picker that autofills a calculator.
 *
 * Reads /data/engine-pages/, the merged dataset built by scripts/engineData.mjs
 * — the same one behind the engine spec pages. The older per-calculator pickers
 * read /data/engines/ directly, which is the raw import: `head` is null on every
 * record there, so chamber volume, rocker ratio, valve sizes and lifter type
 * were unreachable no matter which engine you picked.
 *
 * Hands the caller the whole EngineRecord and lets it decide what to fill, so
 * one component serves calculators with completely different inputs.
 */
interface Props {
  onSelect: (engine: EngineRecord) => void;
  /** Only offer engines that have these fields — hides useless choices. */
  requires?: (keyof EngineRecord)[];
  label?: string;
}

export function EnginePicker({ onSelect, requires = [], label = "Auto-fill from engine database" }: Props) {
  const [open, setOpen] = useState(false);
  const [mfrs, setMfrs] = useState<ManufacturerSummary[] | null>(null);
  const [mfrUrl, setMfrUrl] = useState("");
  const [famUrl, setFamUrl] = useState("");
  const [engSlug, setEngSlug] = useState("");
  const [doc, setDoc] = useState<EngineFamilyDoc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || mfrs) return;
    fetch("/data/engine-pages/manufacturers.json")
      .then((r) => r.json())
      .then(setMfrs)
      .catch(() => setMfrs([]));
  }, [open, mfrs]);

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

  const engines = useMemo(() => {
    const all = doc?.engines ?? [];
    if (!requires.length) return all;
    return all.filter((e) =>
      requires.every((k) => {
        const v = e[k];
        return v != null && v !== "";
      })
    );
  }, [doc, requires]);

  const handleEngine = (slug: string) => {
    setEngSlug(slug);
    const e = engines.find((x) => x.slug === slug);
    if (e) onSelect(e);
  };

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
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Manufacturer</Label>
            <Select
              value={mfrUrl}
              onValueChange={(v) => { setMfrUrl(v); setFamUrl(""); setEngSlug(""); }}
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
              onValueChange={(v) => { setFamUrl(v); setEngSlug(""); }}
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
            <Select value={engSlug} onValueChange={handleEngine} disabled={!doc || loading}>
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
      )}
    </div>
  );
}
