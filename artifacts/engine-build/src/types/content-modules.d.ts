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
