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
