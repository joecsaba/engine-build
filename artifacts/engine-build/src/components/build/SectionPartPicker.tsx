import { ExternalLink, PackageSearch } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EnginePlatform } from "@/data/buildParts";
import { TIER_LABELS, TIER_COLORS } from "@/data/buildParts";
import { categoriesForSection, pickFields, pickKeys, summitSearchUrl } from "@/data/partsCatalog";

const NONE = "__none__";

/**
 * Part pickers for one build-sheet section.
 *
 * Shows a dropdown per catalog category that fits this engine (crank, rods,
 * pistons… on the Rotating Assembly section, and so on). A pick saves to the
 * build through setFields, the same path every typed field uses.
 *
 * When the catalog has nothing for this engine and section, it says so and
 * gets out of the way — the section's own fields still work, so nobody is
 * blocked from finishing a build.
 */
export function SectionPartPicker({
  sectionId,
  platform,
  fields,
  setFields,
}: {
  sectionId: string;
  platform: EnginePlatform | null;
  fields: Record<string, string>;
  setFields: (entries: Record<string, string>) => void;
}) {
  const categories = categoriesForSection(platform, sectionId);

  // No catalog for this engine at all: the build page shows one notice at the
  // top instead of repeating it in every section.
  if (!platform) return null;

  if (categories.length === 0) {
    return (
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
        <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <span>Part numbers for this section are coming. Keep building — enter what you're running below.</span>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-lg border border-[#E85D04]/20 bg-[#E85D04]/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <PackageSearch className="h-4 w-4 text-[#E85D04]" />
        <p className="text-sm font-semibold">Parts that fit your {platform?.name}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((cat) => {
          const keys = pickKeys(cat.id);
          const selectedId = fields[keys.id] || "";
          const selected = cat.parts.find((p) => p.id === selectedId) ?? null;
          return (
            <div key={cat.id} className="space-y-1">
              <label className="text-xs font-medium text-gray-700">{cat.name}</label>
              <Select
                value={selectedId || NONE}
                onValueChange={(v) => setFields(pickFields(cat.id, v === NONE ? null : cat.parts.find((p) => p.id === v) ?? null))}
              >
                <SelectTrigger className="bg-white text-left">
                  <SelectValue placeholder="Choose a part…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not chosen yet</SelectItem>
                  {cat.parts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.brand} {p.name}
                      {p.partNumber ? ` · #${p.partNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected ? (
                <div className="space-y-0.5 text-xs text-gray-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 font-medium ${TIER_COLORS[selected.tier]}`}>{TIER_LABELS[selected.tier]}</span>
                    {selected.partNumber && (
                      <a
                        href={summitSearchUrl(selected)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#E85D04] hover:underline"
                      >
                        Check current price <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {selected.notes && <p>{selected.notes}</p>}
                </div>
              ) : (
                <p className="text-xs text-gray-500">{cat.description}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        More part numbers are on the way. Don't see yours? Enter it in the fields below — it saves to your build either way.
      </p>
    </div>
  );
}
