import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, PenLine, Database } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { useBuildContext } from "@/context/BuildContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ───────────────────────────────────────────────────────────────────

interface Manufacturer {
  slug: string;
  name: string;
  country: string;
}

interface Family {
  family_slug: string;
  manufacturer_slug: string;
  manufacturer_name: string;
  family_name: string;
  engine_count: number;
}

interface EngineOption {
  engine_id: string;
  displacement_ci: number | null;
  displacement_l: number | null;
  num_cylinders: number | null;
  bore_in: number | null;
  stroke_in: number | null;
  rod_length_in: number | null;
  deck_height_in: number | null;
  compression_ratio: number | null;
  advertised_hp: number | null;
  cam_type: string | null;
  variants: { code: string; description: string | null }[];
}

// ─── Quick-pick engines (no API needed) ──────────────────────────────────────

const QUICK_PICKS = [
  // GM
  {
    slug: "sbc350",
    title: "Small Block Chevy 350",
    subtitle: "GM Gen I — 5.7L / 350ci",
    details: "4.000\" bore x 3.480\" stroke",
    group: "Chevrolet",
  },
  {
    slug: "chevrolet_ls1",
    title: "LS1",
    subtitle: "GM Gen III — 5.7L / 346ci",
    details: "3.898\" bore x 3.622\" stroke",
    group: "Chevrolet",
  },
  {
    slug: "chevrolet_ls3",
    title: "LS3",
    subtitle: "GM Gen IV — 6.2L / 376ci",
    details: "4.065\" bore x 3.622\" stroke",
    group: "Chevrolet",
  },
  {
    slug: "bbc454",
    title: "Big Block Chevy 454",
    subtitle: "GM Mark IV — 7.4L / 454ci",
    details: "4.251\" bore x 4.000\" stroke",
    group: "Chevrolet",
  },
  // Ford
  {
    slug: "ford_302",
    title: "Ford 302 Windsor",
    subtitle: "Small Block Ford — 5.0L / 302ci",
    details: "4.000\" bore x 3.000\" stroke",
    group: "Ford",
  },
  {
    slug: "ford_351w",
    title: "Ford 351 Windsor",
    subtitle: "Small Block Ford — 5.8L / 351ci",
    details: "4.000\" bore x 3.500\" stroke",
    group: "Ford",
  },
  {
    slug: "ford_coyote_50",
    title: "Coyote 5.0",
    subtitle: "Ford Modular — 5.0L / 302ci",
    details: "3.630\" bore x 3.650\" stroke",
    group: "Ford",
  },
  {
    slug: "ford_460",
    title: "Ford 460 Big Block",
    subtitle: "385 Series — 7.5L / 460ci",
    details: "4.360\" bore x 3.850\" stroke",
    group: "Ford",
  },
  // Dodge / Mopar
  {
    slug: "mopar_318",
    title: "Mopar 318 LA",
    subtitle: "Small Block Mopar — 5.2L / 318ci",
    details: "3.910\" bore x 3.310\" stroke",
    group: "Dodge / Mopar",
  },
  {
    slug: "mopar_360",
    title: "Mopar 360 LA",
    subtitle: "Small Block Mopar — 5.9L / 360ci",
    details: "4.000\" bore x 3.580\" stroke",
    group: "Dodge / Mopar",
  },
  {
    slug: "mopar_440",
    title: "Mopar 440 RB",
    subtitle: "Big Block Mopar — 7.2L / 440ci",
    details: "4.320\" bore x 3.750\" stroke",
    group: "Dodge / Mopar",
  },
  {
    slug: "mopar_hemi_57",
    title: "5.7 Hemi",
    subtitle: "Gen III Hemi — 5.7L / 345ci",
    details: "3.917\" bore x 3.578\" stroke",
    group: "Dodge / Mopar",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewBuildPage() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const { loadBuild } = useBuildContext();

  // Mode: "quick" for quick-pick cards, "database" for full dropdown selection
  const [mode, setMode] = useState<"quick" | "database" | "custom">("quick");
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [buildName, setBuildName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // Database selection state
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedMfr, setSelectedMfr] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [engines, setEngines] = useState<EngineOption[]>([]);
  const [selectedDbEngine, setSelectedDbEngine] = useState<EngineOption | null>(null);
  const [loadingEngines, setLoadingEngines] = useState(false);

  // Custom engine name
  const [customEngineName, setCustomEngineName] = useState("");

  if (!isSignedIn) {
    setLocation("/sign-in");
    return null;
  }

  // Load manufacturers + families on mount
  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/data/manufacturers.json`).then((r) => r.json()),
      fetch(`${BASE}/data/families.json`).then((r) => r.json()),
    ]).then(([mfrs, fams]) => {
      setManufacturers(mfrs);
      setFamilies(fams);
    }).catch(() => {});
  }, []);

  // Load engines when a family is selected
  useEffect(() => {
    if (!selectedMfr || !selectedFamily) {
      setEngines([]);
      setSelectedDbEngine(null);
      return;
    }
    setLoadingEngines(true);
    fetch(`${BASE}/data/engines/${selectedMfr}/${selectedFamily}.json`)
      .then((r) => r.json())
      .then((data) => {
        setEngines(data.engines || []);
        setSelectedDbEngine(null);
      })
      .catch(() => setEngines([]))
      .finally(() => setLoadingEngines(false));
  }, [selectedMfr, selectedFamily]);

  const filteredFamilies = families.filter((f) => f.manufacturer_slug === selectedMfr);

  function engineLabel(e: EngineOption): string {
    const parts: string[] = [];
    const code = e.variants?.length ? e.variants.map((v) => v.code).join("/") : "";
    if (code) parts.push(code);
    if (e.displacement_l) parts.push(`${e.displacement_l}L`);
    if (e.displacement_ci) parts.push(`(${e.displacement_ci}ci)`);
    if (e.advertised_hp) parts.push(`${e.advertised_hp}HP`);
    return parts.join(" ") || e.engine_id;
  }

  function getDefaultBuildName(): string {
    if (mode === "database" && selectedDbEngine) {
      const mfr = manufacturers.find((m) => m.slug === selectedMfr);
      return `${mfr?.name ?? ""} ${engineLabel(selectedDbEngine)} Build`.trim();
    }
    if (mode === "custom") {
      return customEngineName.trim() ? `${customEngineName} Build` : "Custom Engine Build";
    }
    const qp = QUICK_PICKS.find((e) => e.slug === selectedEngine);
    return qp ? `My ${qp.title} Build` : "New Engine Build";
  }

  function getEngineSlug(): string {
    if (mode === "database" && selectedDbEngine) return selectedDbEngine.engine_id;
    if (mode === "custom") return "custom";
    return selectedEngine ?? "";
  }

  function canCreate(): boolean {
    if (mode === "quick") return !!selectedEngine;
    if (mode === "database") return !!selectedDbEngine;
    if (mode === "custom") return true;
    return false;
  }

  const handleCreate = async () => {
    if (!canCreate()) return;

    const name = buildName.trim() || getDefaultBuildName();
    const engineSlug = getEngineSlug();

    setError("");
    setIsCreating(true);
    try {
      const res = await authFetch("/api/builds", {
        method: "POST",
        body: JSON.stringify({ name, engineSlug }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }
      const build = await res.json();
      await loadBuild(build.id);
      setLocation(`/build-sheets/build/${build.id}`);
    } catch (err: any) {
      console.error("Failed to create build:", err);
      setError(err.message || "Failed to create build. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="New Build"
        title="Choose Your Engine"
        subtitle="Pick a popular engine, browse our database, or start from scratch."
      />

      <div className="container mx-auto max-w-3xl px-4 py-10">

        {/* Mode selector tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "quick" as const, label: "Popular Engines" },
            { id: "database" as const, label: "Engine Database" },
            { id: "custom" as const, label: "Custom" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id); setSelectedEngine(null); setSelectedDbEngine(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === tab.id
                  ? "bg-[#E85D04] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Quick Pick Mode ───────────────────────────────────────── */}
        {mode === "quick" && (
          <div className="mb-8 space-y-6">
            {["Chevrolet", "Ford", "Dodge / Mopar"].map((group) => (
              <div key={group}>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">{group}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {QUICK_PICKS.filter((e) => e.group === group).map((engine) => (
                    <Card
                      key={engine.slug}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedEngine === engine.slug
                          ? "ring-2 ring-[#E85D04] border-[#E85D04] bg-[#E85D04]/5"
                          : "border-gray-200 hover:border-[#E85D04]/50"
                      }`}
                      onClick={() => setSelectedEngine(engine.slug)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold">{engine.title}</h4>
                          {selectedEngine === engine.slug && (
                            <CheckCircle2 className="w-4 h-4 text-[#E85D04] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#E85D04] font-medium mb-0.5">{engine.subtitle}</p>
                        <p className="text-xs text-gray-400">{engine.details}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Database Mode ─────────────────────────────────────────── */}
        {mode === "database" && (
          <Card className="mb-8">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-[#E85D04]" />
                <p className="text-sm font-semibold text-gray-700">Select from our engine database</p>
              </div>

              {/* Manufacturer */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Manufacturer</Label>
                <Select
                  value={selectedMfr}
                  onValueChange={(v) => { setSelectedMfr(v); setSelectedFamily(""); setSelectedDbEngine(null); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manufacturer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((m) => (
                      <SelectItem key={m.slug} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Engine Family */}
              {selectedMfr && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Engine Family</Label>
                  <Select
                    value={selectedFamily}
                    onValueChange={(v) => { setSelectedFamily(v); setSelectedDbEngine(null); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select engine family..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredFamilies.map((f) => (
                        <SelectItem key={f.family_slug} value={f.family_slug}>
                          {f.family_name} ({f.engine_count} engines)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Specific Engine */}
              {selectedFamily && !loadingEngines && engines.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Engine</Label>
                  <Select
                    value={selectedDbEngine?.engine_id ?? ""}
                    onValueChange={(v) => {
                      const eng = engines.find((e) => e.engine_id === v);
                      setSelectedDbEngine(eng ?? null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific engine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {engines.map((e) => (
                        <SelectItem key={e.engine_id} value={e.engine_id}>
                          {engineLabel(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loadingEngines && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading engines...
                </div>
              )}

              {/* Selected engine specs preview */}
              {selectedDbEngine && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Engine Specs (will pre-fill your build)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {selectedDbEngine.bore_in && (
                      <div>
                        <span className="text-gray-400 text-xs">Bore</span>
                        <p className="font-mono font-bold">{selectedDbEngine.bore_in}"</p>
                      </div>
                    )}
                    {selectedDbEngine.stroke_in && (
                      <div>
                        <span className="text-gray-400 text-xs">Stroke</span>
                        <p className="font-mono font-bold">{selectedDbEngine.stroke_in}"</p>
                      </div>
                    )}
                    {selectedDbEngine.displacement_ci && (
                      <div>
                        <span className="text-gray-400 text-xs">Displacement</span>
                        <p className="font-mono font-bold">{selectedDbEngine.displacement_ci} ci</p>
                      </div>
                    )}
                    {selectedDbEngine.num_cylinders && (
                      <div>
                        <span className="text-gray-400 text-xs">Cylinders</span>
                        <p className="font-mono font-bold">{selectedDbEngine.num_cylinders}</p>
                      </div>
                    )}
                    {selectedDbEngine.compression_ratio && (
                      <div>
                        <span className="text-gray-400 text-xs">Compression</span>
                        <p className="font-mono font-bold">{selectedDbEngine.compression_ratio}:1</p>
                      </div>
                    )}
                    {selectedDbEngine.rod_length_in && (
                      <div>
                        <span className="text-gray-400 text-xs">Rod Length</span>
                        <p className="font-mono font-bold">{selectedDbEngine.rod_length_in}"</p>
                      </div>
                    )}
                    {selectedDbEngine.advertised_hp && (
                      <div>
                        <span className="text-gray-400 text-xs">HP (stock)</span>
                        <p className="font-mono font-bold">{selectedDbEngine.advertised_hp}</p>
                      </div>
                    )}
                    {selectedDbEngine.cam_type && (
                      <div>
                        <span className="text-gray-400 text-xs">Cam Type</span>
                        <p className="font-mono font-bold text-xs">{selectedDbEngine.cam_type}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Custom Mode ───────────────────────────────────────────── */}
        {mode === "custom" && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <PenLine className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">Custom Engine</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    BBC, SBF, Mopar, import, diesel, or anything else — start with blank fields and enter your own specs.
                  </p>
                  <div>
                    <Label htmlFor="customEngine" className="text-xs font-medium text-gray-500 mb-1 block">
                      Engine Name
                    </Label>
                    <Input
                      id="customEngine"
                      value={customEngineName}
                      onChange={(e) => setCustomEngineName(e.target.value)}
                      placeholder="e.g. BBC 454, Ford 302, 2JZ-GTE..."
                      className="max-w-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Build name + create ───────────────────────────────────── */}
        {canCreate() && (
          <div className="space-y-4 p-6 rounded-lg border border-gray-200 bg-white">
            <div>
              <Label htmlFor="buildName" className="text-sm font-medium mb-1.5 block">
                Build Name
              </Label>
              <Input
                id="buildName"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                placeholder={getDefaultBuildName()}
                className="max-w-md"
              />
              <p className="text-xs text-gray-400 mt-1">e.g. "383 Stroker Street Build" or "LS Swap C10"</p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white px-8"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Start Build"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
