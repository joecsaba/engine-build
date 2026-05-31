import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronDown, ShoppingCart, Printer, ArrowLeft, Info, Check, BookOpen, X } from "lucide-react";
import { useBuildContext } from "@/context/BuildContext";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  PLATFORMS,
  TIER_LABELS,
  TIER_COLORS,
  type EnginePlatform,
  type Part,
  type PartCategory,
} from "@/data/buildParts";

type SelectionMap = Record<string, string | null>;

function PlatformCard({ platform, selected, onSelect }: {
  platform: EnginePlatform;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        selected
          ? "border-[#E85D04] bg-[#E85D04]/5"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-sm">{platform.name}</div>
          <div className="text-xs text-gray-500">{platform.displacement} · {platform.years}</div>
        </div>
        {selected && <Check className="w-4 h-4 text-[#E85D04] shrink-0 mt-0.5" />}
      </div>
    </button>
  );
}

function PartSelector({ category, selectedPartId, onSelect }: {
  category: PartCategory;
  selectedPartId: string | null;
  onSelect: (partId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedPart = category.parts.find(p => p.id === selectedPartId) ?? null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-all ${
          selectedPart
            ? "border-[#E85D04]/40 bg-white"
            : "border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300"
        }`}
      >
        <div className="flex-1 min-w-0">
          {selectedPart ? (
            <div>
              <span className="font-medium text-sm">{selectedPart.brand} — {selectedPart.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TIER_COLORS[selectedPart.tier]}`}>
                  {TIER_LABELS[selectedPart.tier]}
                </span>
                <span className="text-sm font-bold text-[#E85D04]">
                  {selectedPart.price === 0 ? "Reuse / $0" : `$${selectedPart.price.toLocaleString()}`}
                </span>
                {selectedPart.retailer !== "—" && (
                  <span className="text-xs text-gray-400">{selectedPart.retailer}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">{category.required ? "Select option (required)" : "Skip this category"}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[60vh] overflow-y-auto">
          {!category.required && (
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className="w-full px-4 py-2.5 text-sm text-left text-gray-400 hover:bg-gray-50 border-b border-gray-100"
            >
              — Skip this category —
            </button>
          )}
          {category.parts.map(part => (
            <button
              key={part.id}
              onClick={() => { onSelect(part.id); setOpen(false); }}
              className={`w-full px-4 py-3 text-sm text-left hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0 ${
                selectedPartId === part.id ? "bg-orange-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{part.brand} — {part.name}</div>
                  {part.partNumber && (
                    <div className="text-xs text-gray-400 mt-0.5">#{part.partNumber} · {part.retailer}</div>
                  )}
                  {part.notes && (
                    <div className="text-xs text-amber-700 mt-1 flex items-start gap-1">
                      <Info className="w-3 h-3 shrink-0 mt-0.5" />
                      {part.notes}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-[#E85D04]">
                    {part.price === 0 ? "$0" : `$${part.price.toLocaleString()}`}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TIER_COLORS[part.tier]}`}>
                    {TIER_LABELS[part.tier]}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, selectedPartId, onSelect }: {
  category: PartCategory;
  selectedPartId: string | null;
  onSelect: (partId: string | null) => void;
}) {
  const selectedPart = category.parts.find(p => p.id === selectedPartId) ?? null;
  return (
    <div className="py-5 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="font-bold text-base">
            {category.name}
            {category.required && <span className="ml-1 text-xs text-[#E85D04] font-semibold">Required</span>}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xl">{category.description}</p>
        </div>
        {selectedPart && (
          <div className="text-right shrink-0">
            <div className="font-bold text-[#E85D04] text-sm">
              {selectedPart.price === 0 ? "$0" : `$${selectedPart.price.toLocaleString()}`}
            </div>
          </div>
        )}
      </div>
      <PartSelector
        category={category}
        selectedPartId={selectedPartId}
        onSelect={onSelect}
      />
    </div>
  );
}

function ShoppingListModal({ platform, selections, total, onClose }: {
  platform: EnginePlatform;
  selections: SelectionMap;
  total: number;
  onClose: () => void;
}) {
  const selectedParts: Array<{ category: PartCategory; part: Part }> = [];
  for (const cat of platform.categories) {
    const partId = selections[cat.id];
    if (partId) {
      const part = cat.parts.find(p => p.id === partId);
      if (part) selectedParts.push({ category: cat, part });
    }
  }

  const byGroup: Record<string, typeof selectedParts> = {};
  for (const item of selectedParts) {
    if (!byGroup[item.category.group]) byGroup[item.category.group] = [];
    byGroup[item.category.group].push(item);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        <div className="bg-[#1a1a1a] text-white rounded-t-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[#E85D04] text-xs font-semibold uppercase tracking-widest mb-1">Shopping List</div>
              <h2 className="text-xl font-bold">{platform.name} Build</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {Object.entries(byGroup).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#E85D04] mb-3">{group}</h3>
              <table className="w-full text-sm">
                <tbody>
                  {items.map(({ category, part }) => (
                    <tr key={part.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{part.brand} — {part.name}</div>
                        <div className="text-xs text-gray-400">
                          {part.partNumber ? `#${part.partNumber} · ` : ""}{part.retailer}
                        </div>
                      </td>
                      <td className="py-2 text-right font-bold whitespace-nowrap">
                        {part.price === 0 ? <span className="text-gray-400">Reuse / $0</span> : `$${part.price.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="pt-4 border-t-2 border-[#1a1a1a] flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Estimated Parts Total</div>
              <div className="text-xs text-gray-400">Excludes tax, shipping, and machine work</div>
            </div>
            <div className="text-3xl font-bold text-[#E85D04]">${total.toLocaleString()}</div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
            <strong>Price Disclaimer:</strong> All prices are reference values. Verify current pricing at Summit Racing and Jegs before ordering. Prices may vary. Engine-build.com is not affiliated with any retailer.
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print List
          </Button>
          <Button onClick={onClose} className="bg-[#1a1a1a] hover:bg-black text-white ml-auto">
            Back to Planner
          </Button>
        </div>
      </div>
    </div>
  );
}

const DIESEL_PLATFORM_IDS = new Set(["cummins12v", "cummins67", "ford73ps", "ford60ps", "ford67ps", "duramax66"]);

export default function BuildPlanner() {
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [selections, setSelections] = useState<SelectionMap>({});
  const [showList, setShowList] = useState(false);
  const { camRecommendation, clearCamRecommendation } = useBuildContext();
  const isDiesel = selectedPlatformId ? DIESEL_PLATFORM_IDS.has(selectedPlatformId) : false;

  const platform = PLATFORMS.find(p => p.id === selectedPlatformId) ?? null;

  const handlePlatformSelect = (id: string) => {
    setSelectedPlatformId(id);
    setSelections({});
    setShowList(false);
  };

  const handlePartSelect = (categoryId: string, partId: string | null) => {
    setSelections(prev => ({ ...prev, [categoryId]: partId }));
  };

  const total = useMemo(() => {
    if (!platform) return 0;
    let sum = 0;
    for (const cat of platform.categories) {
      const partId = selections[cat.id];
      if (partId) {
        const part = cat.parts.find(p => p.id === partId);
        if (part) sum += part.price;
      }
    }
    return sum;
  }, [platform, selections]);

  const selectedCount = useMemo(() => {
    if (!platform) return 0;
    return platform.categories.filter(cat => selections[cat.id]).length;
  }, [platform, selections]);

  const groupedCategories = useMemo(() => {
    if (!platform) return [];
    const groups: Record<string, PartCategory[]> = {};
    for (const cat of platform.categories) {
      if (!groups[cat.group]) groups[cat.group] = [];
      groups[cat.group].push(cat);
    }
    return Object.entries(groups);
  }, [platform]);

  return (
    <div>
      <PageHeader
        eyebrow="Build Planner"
        title="Plan Your Engine Build"
        subtitle="Select a platform, pick your components, and get a complete shopping list with parts pricing."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10">

        {/* Platform Selection */}
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-1">1. Select Engine Platform</h2>
          <p className="text-sm text-gray-500 mb-4">Select a gas or diesel platform to start planning your build.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {PLATFORMS.map(p => (
              <PlatformCard
                key={p.id}
                platform={p}
                selected={selectedPlatformId === p.id}
                onSelect={() => handlePlatformSelect(p.id)}
              />
            ))}
          </div>
          {platform && (
            <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg text-sm text-gray-300">
              <strong className="text-white">{platform.name}:</strong> {platform.description}
            </div>
          )}
        </div>

        {platform && (
          <>
            {/* Sticky total bar */}
            <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-[#1a1a1a] border-b border-[#2a2a2a] mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm">{selectedCount} of {platform.categories.length} categories selected</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-gray-400">Estimated Total</div>
                  <div className="text-xl font-bold text-[#E85D04]">${total.toLocaleString()}</div>
                </div>
                <Button
                  onClick={() => setShowList(true)}
                  disabled={selectedCount === 0}
                  className="bg-[#E85D04] hover:bg-[#d04f00] text-white flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Shopping List</span>
                </Button>
              </div>
            </div>

            {/* Cam recommendation banner (gas engines only) */}
            {camRecommendation && !isDiesel && (
              <div className="mb-6 p-4 rounded-lg border border-[#E85D04]/40 bg-[#E85D04]/5 flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-[#E85D04] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#E85D04] mb-0.5">Cam Recommendation from Cam Guide</div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Duration:</span> {camRecommendation.durationRange} &nbsp;·&nbsp;
                    <span className="font-medium">LSA:</span> {camRecommendation.lsaRange} &nbsp;·&nbsp;
                    <span className="font-medium">Lift:</span> {camRecommendation.liftRange}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Use these specs to compare against camshafts in your parts selection below.</div>
                </div>
                <button onClick={clearCamRecommendation} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Cam guide prompt (gas engines only, no recommendation yet) */}
            {!camRecommendation && !isDiesel && (
              <div className="mb-6 p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                <div className="text-sm text-gray-500">
                  Not sure which camshaft to run?{" "}
                  <Link href="/cam-guide" className="text-[#E85D04] hover:underline font-medium">
                    Use the Cam Guide to get a recommendation
                  </Link>{" "}
                  — then save it here.
                </div>
                <Link href="/cam-guide">
                  <Button size="sm" variant="outline" className="shrink-0 flex items-center gap-1 text-xs">
                    <BookOpen className="w-3 h-3" /> Cam Guide
                  </Button>
                </Link>
              </div>
            )}

            {/* Parts Categories */}
            <h2 className="text-lg font-bold mb-6">2. Select Components</h2>
            <div className="space-y-8">
              {groupedCategories.map(([group, categories]) => (
                <div key={group} className="bg-white rounded-xl border border-gray-200">
                  <div className="bg-[#1a1a1a] px-6 py-3 rounded-t-xl">
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{group}</h3>
                  </div>
                  <div className="px-6">
                    {categories.map(cat => (
                      <CategorySection
                        key={cat.id}
                        category={cat}
                        selectedPartId={selections[cat.id] ?? null}
                        onSelect={(partId) => handlePartSelect(cat.id, partId)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            {selectedCount > 0 && (
              <div className="mt-10 p-6 bg-[#1a1a1a] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-white font-bold text-lg">{platform.name} Build</div>
                  <div className="text-gray-400 text-sm">{selectedCount} components selected</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Estimated Total</div>
                    <div className="text-2xl font-bold text-[#E85D04]">${total.toLocaleString()}</div>
                  </div>
                  <Button
                    onClick={() => setShowList(true)}
                    className="bg-[#E85D04] hover:bg-[#d04f00] text-white flex items-center gap-2 px-6"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    View Shopping List
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!platform && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🔧</div>
            <div className="text-lg font-medium">Select an engine platform above to start planning your build.</div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8">
          <Link href="/build-sheets" className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#E85D04] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Build Sheets
          </Link>
        </div>
      </div>

      {showList && platform && (
        <ShoppingListModal
          platform={platform}
          selections={selections}
          total={total}
          onClose={() => setShowList(false)}
        />
      )}
    </div>
  );
}
