import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useBuildContext } from "@/context/BuildContext";
import {
  BUILD_TABS,
  BUILD_SECTIONS,
  BUILD_SHEET_GROUPS,
  ENGINE_DEFAULTS,
  isSectionComplete,
  getTabCompletion,
  type FieldDef,
  type SectionDef,
  type TabDef,
} from "@/data/buildFieldDefs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Printer,
  ClipboardList,
} from "lucide-react";

// ─── Engine label lookup ─────────────────────────────────────────────────────

const ENGINE_LABELS: Record<string, string> = {
  sbc350: "Small Block Chevy 350",
  ls1: "LS1 5.7L",
  coyote50: "Coyote 5.0",
  custom: "Custom Engine",
};

function formatEngineSlug(slug: string): string {
  if (ENGINE_LABELS[slug]) return ENGINE_LABELS[slug];
  // Format database slugs like "chevrolet_ls1" → "Chevrolet LS1"
  return slug
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ─── Field renderer ──────────────────────────────────────────────────────────

function BuildField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <div>
        <Label htmlFor={field.key} className="text-sm font-medium mb-1.5 block">
          {field.label}
          {field.required && <span className="text-[#E85D04] ml-0.5">*</span>}
        </Label>
        <Textarea
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
        {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div>
        <Label htmlFor={field.key} className="text-sm font-medium mb-1.5 block">
          {field.label}
          {field.required && <span className="text-[#E85D04] ml-0.5">*</span>}
        </Label>
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || "_empty"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={field.key} className="text-sm font-medium mb-1.5 block">
        {field.label}
        {field.required && <span className="text-[#E85D04] ml-0.5">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={field.key}
          type="text"
          inputMode={field.type === "number" ? "decimal" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={field.suffix ? "pr-12" : ""}
        />
        {field.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
            {field.suffix}
          </span>
        )}
      </div>
      {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
    </div>
  );
}

// ─── Section card ────────────────────────────────────────────────────────────

function SectionCard({
  section,
  fields,
  getField,
  setField,
  buildId,
}: {
  section: SectionDef;
  fields: Record<string, string>;
  getField: (key: string) => string | undefined;
  setField: (key: string, value: string) => void;
  buildId: number;
}) {
  const isComplete = isSectionComplete(section.id, fields);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">{section.title}</h3>
            {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {section.fields.map((field) => (
            <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
              <BuildField
                field={field}
                value={getField(field.key) ?? ""}
                onChange={(val) => setField(field.key, val)}
              />
            </div>
          ))}
        </div>

        {/* Help me choose */}
        {section.helpChoose && (
          <div className="mt-5 p-3 rounded-lg bg-[#E85D04]/5 border border-[#E85D04]/20 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-[#E85D04] shrink-0 mt-0.5" />
            <div>
              <Link href={`${section.helpChoose.href}?fromBuild=${buildId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E85D04] text-[#E85D04] hover:bg-[#E85D04] hover:text-white mb-1"
                >
                  {section.helpChoose.label}
                </Button>
              </Link>
              <p className="text-xs text-gray-500">{section.helpChoose.description}</p>
            </div>
          </div>
        )}

        {/* Calculator links */}
        {section.calculatorLinks && section.calculatorLinks.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Run Calculators</p>
            <p className="text-xs text-gray-400 mb-3">Your build data auto-fills these calculators. Results save back to this build.</p>
            <div className="flex flex-wrap gap-2">
              {section.calculatorLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#E85D04]/30 text-[#E85D04] hover:bg-[#E85D04] hover:text-white hover:border-[#E85D04] font-semibold gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auto-compute derived fields ─────────────────────────────────────────────

function useAutoCompute(
  fields: Record<string, string>,
  setField: (key: string, value: string) => void,
) {
  useEffect(() => {
    const bore = parseFloat(fields["shortBlock.bore"] || "0");
    const overbore = parseFloat(fields["machineWork.overboreAmount"] || "0");
    if (bore > 0 && overbore > 0) {
      const finalBore = (bore + overbore).toFixed(4);
      if (fields["machineWork.finalBore"] !== finalBore) {
        setField("machineWork.finalBore", finalBore);
      }
    }
  }, [fields["shortBlock.bore"], fields["machineWork.overboreAmount"]]);

  useEffect(() => {
    const deckHeight = parseFloat(fields["shortBlock.deckHeight"] || "0");
    const deckCut = parseFloat(fields["machineWork.deckCutAmount"] || "0");
    if (deckHeight > 0 && deckCut > 0) {
      const finalDeck = (deckHeight - deckCut).toFixed(4);
      if (fields["machineWork.finalDeckHeight"] !== finalDeck) {
        setField("machineWork.finalDeckHeight", finalDeck);
      }
    }
  }, [fields["shortBlock.deckHeight"], fields["machineWork.deckCutAmount"]]);
}

// ─── Main build wizard ───────────────────────────────────────────────────────

export default function BuildWizardPage() {
  const [, params] = useRoute("/build-sheets/build/:buildId");
  const [, setLocation] = useLocation();
  const {
    activeBuild,
    loadBuild,
    getField,
    setField,
    setFields,
    isSyncing,
    syncNow,
  } = useBuildContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTabRaw] = useState(() => {
    try {
      const saved = sessionStorage.getItem("buildWizardTab");
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const setActiveTab = (tab: number) => {
    setActiveTabRaw(tab);
    try { sessionStorage.setItem("buildWizardTab", String(tab)); } catch {}
  };

  const buildId = params?.buildId ? parseInt(params.buildId, 10) : null;

  // Load the build on mount
  useEffect(() => {
    if (!buildId || isNaN(buildId)) {
      setError("Invalid build ID");
      setIsLoading(false);
      return;
    }
    if (activeBuild?.id === buildId) {
      setIsLoading(false);
      return;
    }
    loadBuild(buildId)
      .then(() => setIsLoading(false))
      .catch(() => {
        setError("Build not found");
        setIsLoading(false);
      });
  }, [buildId]);

  // Auto-fill engine defaults on first load when fields are empty
  useEffect(() => {
    if (!activeBuild || isLoading) return;
    const hasAnyFields = Object.keys(activeBuild.fields).length > 0;
    if (hasAnyFields) return;

    // Check hardcoded defaults first
    const defaults = ENGINE_DEFAULTS[activeBuild.engineSlug];
    if (defaults && Object.keys(defaults).length > 0) {
      setFields(defaults);
      return;
    }

    // For database engines (slug like "chevrolet_ls1"), try to load specs from JSON
    const slug = activeBuild.engineSlug;
    if (slug && slug !== "custom" && slug.includes("_")) {
      const mfr = slug.split("_")[0];
      // Try to find this engine in our static JSON data
      fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/data/families.json`)
        .then((r) => r.json())
        .then((families: { family_slug: string; manufacturer_slug: string }[]) => {
          const family = families.find((f) => f.manufacturer_slug === mfr && slug.startsWith(mfr));
          if (!family) return;
          return fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/data/engines/${mfr}/${family.family_slug}.json`);
        })
        .then((r) => r?.json())
        .then((data) => {
          if (!data?.engines) return;
          const eng = data.engines.find((e: any) => e.engine_id === slug);
          if (!eng) return;
          const dbDefaults: Record<string, string> = {};
          if (eng.bore_in) dbDefaults["shortBlock.bore"] = String(eng.bore_in);
          if (eng.stroke_in) dbDefaults["shortBlock.stroke"] = String(eng.stroke_in);
          if (eng.deck_height_in) dbDefaults["shortBlock.deckHeight"] = String(eng.deck_height_in);
          if (eng.num_cylinders) dbDefaults["shortBlock.cylinders"] = String(eng.num_cylinders);
          if (eng.rod_length_in) dbDefaults["shortBlock.rodLength"] = String(eng.rod_length_in);
          if (eng.rod_length_in) dbDefaults["rotatingAssembly.rodLength"] = String(eng.rod_length_in);
          if (eng.stroke_in) dbDefaults["rotatingAssembly.crankStroke"] = String(eng.stroke_in);
          if (Object.keys(dbDefaults).length > 0) setFields(dbDefaults);
        })
        .catch(() => {}); // silent fail — custom engines just start empty
    }
  }, [activeBuild?.id, isLoading]);

  // Auto-compute derived fields
  useAutoCompute(activeBuild?.fields ?? {}, setField);

  const fields = activeBuild?.fields ?? {};
  const engineLabel = formatEngineSlug(activeBuild?.engineSlug ?? "");

  // Overall progress
  const totalSections = BUILD_SECTIONS.length;
  const completedSections = BUILD_SECTIONS.filter((s) => isSectionComplete(s.id, fields)).length;
  const progressPercent = Math.round((completedSections / totalSections) * 100);

  const currentTab = BUILD_TABS[activeTab];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85D04]" />
      </div>
    );
  }

  if (error || !activeBuild) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">{error ?? "Build not found"}</h2>
        <p className="text-gray-500 mb-6">This build may have been deleted or doesn't exist.</p>
        <Link href="/build-sheets/my-builds">
          <Button className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">Go to My Builds</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={engineLabel}
        title={activeBuild.name}
        subtitle="Fill in your build specs — data you enter here auto-populates the calculators."
      />

      {/* Tab navigation — sticky */}
      <div className="bg-[#1a1a1a] sticky top-16 z-30 border-b border-[#2a2a2a]">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 py-2 overflow-x-auto">
              {BUILD_TABS.map((tab, idx) => {
                const { completed, total } = getTabCompletion(tab.id, fields);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(idx)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                      activeTab === idx
                        ? "bg-[#E85D04] text-white shadow"
                        : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {tab.id === "build-sheet" && <ClipboardList className="w-3.5 h-3.5" />}
                    {tab.label}
                    {tab.id !== "build-sheet" && completed > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === idx
                          ? "bg-white/20"
                          : completed === total ? "bg-green-500/20 text-green-300" : "bg-white/10"
                      }`}>
                        {completed}/{total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Save indicator */}
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {isSyncing && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="text-gray-300 hover:text-white hover:bg-white/10 h-8"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Overall progress */}
        <div className="mb-6 flex items-center gap-3">
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span className="text-xs text-gray-400 shrink-0">
            {completedSections}/{totalSections} sections
          </span>
        </div>

        {/* Tab content */}
        {currentTab.id === "build-sheet" ? (
          /* ── Build Sheet tab ──────────────────────────────────────── */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Build Reference Sheet</h2>
                <p className="text-sm text-gray-500">All your specs and calculated values in one place. Print this and bring it to the shop.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-2 print:hidden"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>

            <div className="space-y-4 print:space-y-2">
              {BUILD_SHEET_GROUPS.map((group) => {
                const hasData = group.rows.some((r) => fields[r.key] && fields[r.key].trim());
                if (!hasData) return null;
                return (
                  <div key={group.title} className="rounded-xl border border-gray-200 bg-white overflow-hidden print:rounded-none print:border-gray-300">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">{group.title}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.rows.map((row) => {
                        const val = fields[row.key];
                        if (!val || !val.trim()) return null;
                        return (
                          <div key={row.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                            <span className="text-sm text-gray-600">{row.label}</span>
                            <span className={`text-sm font-mono font-semibold ${row.computed ? "text-[#E85D04]" : "text-gray-900"}`}>
                              {val}{row.suffix ?? ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {BUILD_SHEET_GROUPS.every((g) => !g.rows.some((r) => fields[r.key]?.trim())) && (
                <div className="text-center py-16">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-1">No data yet</h3>
                  <p className="text-gray-400 mb-4">Start filling in your build specs on the other tabs.</p>
                  <Button onClick={() => setActiveTab(0)} className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">
                    Go to Bottom End
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Normal section tabs ──────────────────────────────────── */
          <>
            <div className="space-y-5">
              {currentTab.sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  fields={fields}
                  getField={getField}
                  setField={setField}
                  buildId={activeBuild.id}
                />
              ))}
            </div>

            {/* Tab navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setActiveTab(activeTab - 1)}
                disabled={activeTab === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {activeTab > 0 ? BUILD_TABS[activeTab - 1].label : ""}
              </Button>

              {activeTab < BUILD_TABS.length - 1 ? (
                <Button
                  onClick={() => setActiveTab(activeTab + 1)}
                  className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white gap-2"
                >
                  {BUILD_TABS[activeTab + 1].label}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  All sections available
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
