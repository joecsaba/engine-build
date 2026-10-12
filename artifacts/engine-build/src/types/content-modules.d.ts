// Ambient types for the long-form content data modules.
//
// The calculator and guide bodies live in plain .mjs files because
// scripts/prerender.mjs imports them directly at build time (Node, no
// transpile step). TypeScript can't infer a type across that boundary, so
// every `import content from "@/data/.../foo.mjs"` raised TS7016 and landed in
// the page as `any`. These declarations give both sets of imports their real
// shape, so a malformed content file fails typecheck instead of at runtime.

declare module "@/data/calculatorContent/*.mjs" {
  import type { CalculatorContentData } from "@/components/calculators/CalculatorContent";
  const content: CalculatorContentData;
  export default content;
}

declare module "@/data/guideContent/*.mjs" {
  import type { GuideContentData } from "@/components/guides/GuideContent";
  const content: GuideContentData;
  export default content;
}

// Shared content for individual pages whose substance would otherwise live only
// in a component literal — see src/data/pageContent/.
declare module "@/data/pageContent/cam-guide.mjs" {
  export interface CamSpecTerm {
    term: string;
    def: string;
  }
  export interface CamGuideTool {
    heading: string;
    body: string;
  }
  export const CAM_SPEC_TERMS: CamSpecTerm[];
  export const CAM_GUIDE_TOOLS: CamGuideTool[];
  const content: {
    intro: string;
    terms: CamSpecTerm[];
    tools: CamGuideTool[];
  };
  export default content;
}

declare module "@/data/attribution.mjs" {
  export interface VizardBook {
    title: string;
    asin: string;
    isbn13: string;
    covers: string;
  }
  export const AMAZON_TAG: string;
  export const VIZARD_BOOKS: Record<"horsepower" | "smallBlock" | "heads", VizardBook>;
  export function bookUrl(key: string): string | null;
  export function vizardCitationHtml(key: string, context: string): string;
  const books: Record<string, VizardBook>;
  export default books;
}

// Shared meta description builders — see src/data/seoDescriptions.mjs. Imported
// by both the React pages and scripts/prerender.mjs so the two cannot drift.
declare module "@/data/seoDescriptions.mjs" {
  export const DESC_MAX: number;
  export const DESC_MIN: number;
  export function clampDesc(parts: (string | string[] | null | undefined)[]): string;
  export function familyPhrase(manufacturerName: string, familyName: string): string;
  export function familyDescription(fam: {
    manufacturerName: string;
    familyName: string;
    engines: unknown[];
  }): string;
  export function manufacturerDescription(m: {
    name: string;
    engineCount: number;
    families: unknown[];
  }): string;
}

// Amazon affiliate "Tools for this job" placements — see src/data/affiliateTools.mjs.
declare module "@/data/affiliateTools.mjs" {
  export interface AffiliateTool {
    name: string;
    /** Amazon search terms; used unless `dp` is set. */
    q: string;
    /** One line on why this job needs it. */
    why: string;
    /** Optional pinned ASIN; takes precedence over the search. */
    dp?: string;
  }
  export function toolUrl(tool: AffiliateTool): string;
  export const CALCULATOR_TOOLS: Record<string, AffiliateTool[]>;
  export const GUIDE_TOOLS: Record<string, AffiliateTool[]>;
  const all: { CALCULATOR_TOOLS: typeof CALCULATOR_TOOLS; GUIDE_TOOLS: typeof GUIDE_TOOLS };
  export default all;
}

// Computed prose for engine spec pages — see src/data/engineNarrative.mjs.
declare module "@/data/engineNarrative.mjs" {
  export function engineNarrative(e: object): string[];
  export default engineNarrative;
}

// Shared wording for vehicle pages and "Factory cars" lists — see src/data/vehicleText.mjs.
declare module "@/data/vehicleText.mjs" {
  export function vehicleEngineLabel(e: { name: string; code: string | null }): string;
  export function hpText(e: { hp: number | null; hpBasis: string }): string;
  export function factoryCarLabel(r: { year: number; code: string | null; hp: number | null }): string;
}
