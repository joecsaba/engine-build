import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useBuildContext } from "@/context/BuildContext";
import { BUILD_SECTIONS, ENGINE_DEFAULTS, isSectionComplete, type FieldDef } from "@/data/buildFieldDefs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Save,
  HelpCircle,
  Box,
  Factory,
  RotateCw,
  Gauge,
  Layers,
  ArrowUpDown,
  Wind,
  Target,
} from "lucide-react";

// Map section icon names to actual components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Box, Factory, RotateCw, Gauge, Layers, ArrowUpDown, Wind, Target,
};

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
      </div>
    );
  }

  // Number or text input
  return (
    <div>
      <Label htmlFor={field.key} className="text-sm font-medium mb-1.5 block">
        {field.label}
        {field.required && <span className="text-[#E85D04] ml-0.5">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={field.key}
          type={field.type === "number" ? "text" : "text"}
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
    </div>
  );
}

// ─── Auto-compute derived fields ─────────────────────────────────────────────

function useAutoCompute(
  fields: Record<string, string>,
  setField: (key: string, value: string) => void,
) {
  // Auto-compute finalBore from bore + overbore
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

  // Auto-compute finalDeckHeight from deckHeight - deckCut
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
  const [openSections, setOpenSections] = useState<string[]>(["shortBlock"]);

  const buildId = params?.buildId ? parseInt(params.buildId, 10) : null;

  // Load the build on mount
  useEffect(() => {
    if (!buildId || isNaN(buildId)) {
      setError("Invalid build ID");
      setIsLoading(false);
      return;
    }

    // If already loaded, skip
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
    const defaults = ENGINE_DEFAULTS[activeBuild.engineSlug];
    if (!defaults) return;

    // Only fill if the build has no fields yet (fresh build)
    const hasAnyFields = Object.keys(activeBuild.fields).length > 0;
    if (hasAnyFields) return;

    setFields(defaults);
  }, [activeBuild?.id, isLoading]);

  // Auto-compute derived fields
  useAutoCompute(activeBuild?.fields ?? {}, setField);

  // Engine label
  const engineLabel = activeBuild?.engineSlug === "sbc350"
    ? "Small Block Chevy 350"
    : activeBuild?.engineSlug === "ls1"
    ? "LS1 5.7L"
    : activeBuild?.engineSlug ?? "";

  // Section completion tracking
  const fields = activeBuild?.fields ?? {};
  const completedCount = BUILD_SECTIONS.filter((s) => isSectionComplete(s.id, fields)).length;
  const progressPercent = Math.round((completedCount / BUILD_SECTIONS.length) * 100);

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
        subtitle="Fill in your build specs section by section. Data you enter here auto-populates the calculators."
      />

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8 p-4 rounded-lg bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              {completedCount} of {BUILD_SECTIONS.length} sections filled in
            </span>
            <div className="flex items-center gap-2">
              {isSyncing && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncNow()}
                disabled={isSyncing}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Now
              </Button>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Accordion sections */}
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-3"
        >
          {BUILD_SECTIONS.map((section) => {
            const Icon = ICON_MAP[section.icon] ?? Box;
            const isComplete = isSectionComplete(section.id, fields);

            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border border-gray-200 rounded-lg bg-white overflow-hidden"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isComplete
                        ? "bg-green-100 text-green-600"
                        : "bg-[#E85D04]/10 text-[#E85D04]"
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{section.title}</h3>
                      <p className="text-xs text-gray-500">{section.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  {/* Fields grid */}
                  <div className="grid gap-4 sm:grid-cols-2 mt-2">
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

                  {/* "Help me choose" for cam section */}
                  {section.id === "cam" && (
                    <div className="mt-4 p-3 rounded-lg bg-[#E85D04]/5 border border-[#E85D04]/20">
                      <Link href={`/cam-guide?fromBuild=${activeBuild.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#E85D04] text-[#E85D04] hover:bg-[#E85D04] hover:text-white"
                        >
                          <HelpCircle className="w-4 h-4 mr-2" />
                          Help Me Choose a Cam
                        </Button>
                      </Link>
                      <p className="text-xs text-gray-500 mt-2">
                        Our cam guide will recommend duration, LSA, and lift ranges based on your build goals.
                      </p>
                    </div>
                  )}

                  {/* Calculator links */}
                  {section.calculatorLinks && section.calculatorLinks.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                        Related Calculators
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {section.calculatorLinks.map((link) => (
                          <Link key={link.href} href={link.href}>
                            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-[#E85D04] h-7 px-2">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {link.label}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Computed values summary */}
        {(fields["computed.displacement"] || fields["computed.staticCR"] || fields["computed.rodRatio"]) && (
          <div className="mt-8 p-5 rounded-lg bg-gray-50 border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-600 mb-3 uppercase tracking-wide">Calculated Values</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {fields["computed.displacement"] && (
                <div>
                  <p className="text-xs text-gray-400">Displacement</p>
                  <p className="text-lg font-bold">{fields["computed.displacement"]} ci</p>
                </div>
              )}
              {fields["computed.staticCR"] && (
                <div>
                  <p className="text-xs text-gray-400">Static CR</p>
                  <p className="text-lg font-bold">{fields["computed.staticCR"]}:1</p>
                </div>
              )}
              {fields["computed.dynamicCR"] && (
                <div>
                  <p className="text-xs text-gray-400">Dynamic CR</p>
                  <p className="text-lg font-bold">{fields["computed.dynamicCR"]}:1</p>
                </div>
              )}
              {fields["computed.rodRatio"] && (
                <div>
                  <p className="text-xs text-gray-400">Rod Ratio</p>
                  <p className="text-lg font-bold">{fields["computed.rodRatio"]}</p>
                </div>
              )}
              {fields["computed.quenchDistance"] && (
                <div>
                  <p className="text-xs text-gray-400">Quench Distance</p>
                  <p className="text-lg font-bold">{fields["computed.quenchDistance"]}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

