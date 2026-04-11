import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useSearchTorqueSpecs } from "@workspace/api-client-react";
import { Search, Bookmark } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function TorqueSpecs() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const { data: results, isLoading } = useSearchTorqueSpecs(
    { q: debouncedQuery },
    { query: { enabled: debouncedQuery.length >= 1 } }
  );

  return (
    <div className="container mx-auto max-w-4xl py-10 px-4">
      <div className="bg-[#1a1a1a] text-white rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold">Torque Specs Quick Lookup</h1>
            <p className="text-gray-400 text-sm mt-1">Fast reference for the shop. Search by engine or fastener.</p>
          </div>
          <button
            onClick={() => window.alert("Bookmark this page (Ctrl+D / Cmd+D) for quick shop access!")}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Bookmark className="w-4 h-4" /> Bookmark This
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search: 'LS main cap bolts' or 'Chevy 350 head bolts'"
            className="w-full pl-12 pr-4 py-5 text-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        </div>
      </div>

      {!query && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-xl">Type an engine name or fastener to search</p>
          <p className="text-sm mt-2">Examples: "LS head bolts", "SBC main caps", "Chevy 350", "Honda K20"</p>
        </div>
      )}

      {query && isLoading && (
        <div className="text-center py-8 text-muted-foreground">Searching...</div>
      )}

      {query && !isLoading && results && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl font-medium mb-2">No results for "{query}"</p>
          <p className="text-muted-foreground text-sm">Try searching by engine name (e.g., "LS1", "350") or fastener type (e.g., "head bolt", "main cap")</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""} for "{query}"</p>
          {results.map((spec) => (
            <div key={spec.id} className="p-5 rounded-xl border bg-card">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div>
                  <p className="font-bold text-lg">{spec.fastener}</p>
                  <Link href={`/specs/${spec.familySlug}/${spec.engineId}`} className="text-sm text-primary hover:underline">{spec.engine}</Link>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{spec.ftLbs} <span className="text-lg font-normal text-muted-foreground">ft-lbs</span></p>
                  <p className="text-lg text-muted-foreground">{spec.nm} Nm</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-muted px-3 py-1 rounded-full">Lube: <strong>{spec.lubricant}</strong></span>
                {spec.sequence && <span className="bg-muted px-3 py-1 rounded-full">{spec.sequence}</span>}
                {spec.torqueToYield && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">Torque-to-Yield — Replace after removal</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        <strong>Disclaimer:</strong> Always verify torque specifications against your factory service manual. Torque values may vary by production year, casting, head bolt thread condition, and thread lubricant used. EngineVault torque specs are provided for reference only.
      </div>
    </div>
  );
}
