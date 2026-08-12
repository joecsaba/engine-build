import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GuideContentSection {
  heading: string;
  body: string; // trusted HTML, written by us at build time
}

export interface GuideContentNote {
  tone: "warn" | "danger" | "tip";
  title: string;
  body: string;
}

export interface GuideContentRelated {
  slug: string;
  title: string;
}

export interface GuideContentData {
  slug: string;
  intro: string;
  note?: GuideContentNote;
  sections: GuideContentSection[];
  related?: GuideContentRelated[];
}

interface Props {
  data: GuideContentData;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

const LEVEL_STYLES: Record<Props["level"], string> = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-yellow-100 text-yellow-700",
  Advanced: "bg-orange-100 text-orange-700",
};

const NOTE_STYLES: Record<GuideContentNote["tone"], string> = {
  warn: "bg-amber-50 border-amber-200 text-amber-800",
  danger: "bg-red-50 border-red-200 text-red-800",
  tip: "bg-primary/5 border-primary/20 text-foreground",
};

/**
 * Renders a guide page from its shared content data.
 *
 * The same data file is consumed by scripts/prerender.mjs, so the prose a
 * reader sees and the prose Googlebot indexes are the same words. Before this
 * component existed the guide bodies lived inline in each page's JSX while the
 * prerenderer emitted only the short manifest steps[] — around 260 words of a
 * 600-900 word guide ever reached the crawler.
 *
 * Section bodies are trusted HTML authored by us in src/data/guideContent/.
 * Styling is driven from here (not from classes inside those strings) so the
 * Tailwind scanner always sees the class names it needs to emit.
 */
export function GuideContent({ data, title, description, level }: Props) {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link
        href="/guides"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Guides
      </Link>

      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${LEVEL_STYLES[level]}`}>
            {level}
          </span>
          <h1 className="text-4xl font-bold mt-2 mb-1">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">{data.intro}</p>

        {data.note && (
          <div className={`p-4 border rounded-lg text-sm ${NOTE_STYLES[data.note.tone]}`}>
            <strong>{data.note.title}:</strong> {data.note.body}
          </div>
        )}

        {data.sections.map((s) => (
          <section key={s.heading} className="space-y-3">
            <h2 className="text-2xl font-bold">{s.heading}</h2>
            <div
              className={[
                "prose prose-sm max-w-none text-muted-foreground",
                "prose-strong:text-foreground prose-li:marker:text-muted-foreground",
                // Tables: readable on mobile, light rules rather than prose defaults.
                "[&_table]:w-full [&_table]:text-sm [&_table]:my-4",
                "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left",
                "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top",
                // Inline diagrams.
                "[&_svg]:my-4 [&_svg]:mx-auto [&_svg]:w-full [&_svg]:max-w-sm",
                "[&_svg]:rounded-lg [&_svg]:bg-muted [&_svg]:p-3",
                // Callouts inside a section body.
                "[&_aside]:not-prose [&_aside]:my-4 [&_aside]:rounded-lg [&_aside]:border [&_aside]:p-4 [&_aside]:text-sm",
                "[&_aside[data-tone=warn]]:bg-amber-50 [&_aside[data-tone=warn]]:border-amber-200 [&_aside[data-tone=warn]]:text-amber-800",
                "[&_aside[data-tone=danger]]:bg-red-50 [&_aside[data-tone=danger]]:border-red-200 [&_aside[data-tone=danger]]:text-red-800",
                "[&_aside[data-tone=tip]]:bg-primary/5 [&_aside[data-tone=tip]]:border-primary/20 [&_aside[data-tone=tip]]:text-foreground",
                "[&_aside_p]:m-0",
              ].join(" ")}
              dangerouslySetInnerHTML={{ __html: s.body }}
            />
          </section>
        ))}

        {data.related && data.related.length > 0 && (
          <div className="mt-8 rounded-lg border p-4">
            <p className="font-bold mb-2 text-sm">Related calculators</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {data.related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/calculators/${r.slug}`}
                    className="text-[#E85D04] hover:underline"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
