import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePreferences } from "@/hooks/usePreferences";

export interface CalculatorContentSection {
  heading: string;
  body: string; // trusted HTML, written by us at build time
}

export interface CalculatorContentRelated {
  slug: string;
  title: string;
}

export interface CalculatorContentData {
  slug: string;
  intro: string;
  sections: CalculatorContentSection[];
  related?: CalculatorContentRelated[];
}

interface Props {
  data: CalculatorContentData;
  title: string;
}

/**
 * Renders the long-form SEO/explanation content under a calculator.
 * The same content data is consumed by the prerender script so what users see
 * matches what Googlebot indexes byte-for-byte.
 *
 * Hidden client-side when the user has Expert Mode enabled in settings — the
 * prerendered HTML still ships the content for crawlers, so SEO is preserved.
 */
export function CalculatorContent({ data, title }: Props) {
  const { expertMode } = usePreferences();
  if (expertMode) return null;
  return (
    <>
      {/* Related calculators — moved above the long-form content so users
          landing from search see the cross-links first, before scrolling
          through the reference material. */}
      {data.related && data.related.length > 0 && (
        <Card className="mt-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Related calculators</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {data.related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/calculators/${r.slug}`} className="text-[#E85D04] hover:underline">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Long-form SEO / educational content. Full container width — wrap the
          prose inside at a comfortable reading length (~70ch) so long-form
          text doesn't sprawl across the whole card. */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">{title}: What Engine Builders Need to Know</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-3xl space-y-6 text-muted-foreground">
            <p className="text-base leading-relaxed text-foreground">{data.intro}</p>

            {data.sections.map((s) => (
              <section key={s.heading} className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">{s.heading}</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: s.body }} />
              </section>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
