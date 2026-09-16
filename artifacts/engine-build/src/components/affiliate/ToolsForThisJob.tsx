import { CALCULATOR_TOOLS, GUIDE_TOOLS, toolUrl, type AffiliateTool } from "@/data/affiliateTools.mjs";

type Props =
  | { calculator: string; guide?: never }
  | { guide: string; calculator?: never };

/**
 * "Tools for this job" — the physical tools a page's result leads to, as
 * Amazon affiliate links.
 *
 * Placed directly under a calculator's result or a guide's steps: the moment
 * the reader has a number in hand and knows what they need. Renders nothing
 * for a page with no entry in affiliateTools.mjs, so it is safe to drop in
 * anywhere.
 *
 * Text only, no prices — both are Amazon Operating Agreement requirements for
 * placements that don't use their API. The disclosure sits inline with the
 * links, as the FTC expects and as SourceNote already does; the terms page
 * carries the full Associates statement. Links are rel="sponsored" so search
 * engines treat them as the paid links they are.
 */
export function ToolsForThisJob(props: Props) {
  const tools: AffiliateTool[] | undefined =
    "calculator" in props && props.calculator
      ? CALCULATOR_TOOLS[props.calculator]
      : "guide" in props && props.guide
        ? GUIDE_TOOLS[props.guide]
        : undefined;
  if (!tools?.length) return null;

  return (
    <aside
      aria-labelledby="tools-for-this-job"
      className="mt-6 rounded-lg border border-border bg-muted/30 p-4"
    >
      <h3 id="tools-for-this-job" className="text-sm font-semibold text-foreground mb-2">
        Tools for this job
      </h3>
      <ul className="space-y-1.5 text-sm">
        {tools.map((t) => (
          <li key={t.name} className="leading-snug">
            <a
              href={toolUrl(t)}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="text-[#E85D04] hover:underline font-medium"
            >
              {t.name}
            </a>
            <span className="text-muted-foreground"> — {t.why}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs italic text-muted-foreground">
        Amazon affiliate links — we earn a small commission at no extra cost to you.
      </p>
    </aside>
  );
}
