import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import FAQ from "@/data/faq.mjs";

interface FaqEntry {
  question: string;
  answer: string;
}

export default function FaqPage() {
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div>
      <SEOHead
        title="Engine Building FAQ"
        description="Common questions about compression ratio, ring gap, turbo sizing, diesel tuning, head bolts, and other engine building topics — answered briefly and clearly."
        canonical="/faq"
        keywords="engine building FAQ, engine builder questions, compression ratio FAQ, turbo sizing FAQ, diesel tuning FAQ"
      />

      <PageHeader
        eyebrow="Reference"
        title="Engine Building FAQ"
        subtitle="Quick answers to the questions we see most often. Click any to expand."
      />

      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="space-y-3">
          {(FAQ as FaqEntry[]).map((item, i) => {
            const isOpen = open.has(i);
            return (
              <Card key={i} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  <h2 className="text-base font-semibold text-foreground flex-1">{item.question}</h2>
                  <ChevronDown
                    className={`w-5 h-5 text-[#E85D04] shrink-0 transition-transform mt-0.5 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <CardContent className="px-5 pb-5 pt-0">
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: item.answer }}
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
