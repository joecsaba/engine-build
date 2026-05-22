import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
 */
export function CalculatorContent({ data, title }: Props) {
  return (
    // Full container width — wrap the prose inside at a comfortable reading
    // length (~70ch) so long-form text doesn't sprawl across the whole card.
    <Card className="mt-8">
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

          {data.related && data.related.length > 0 && (
            <section className="pt-4 border-t">
              <h3 className="text-base font-semibold text-foreground mb-2">Related calculators</h3>
              <ul className="space-y-1 text-sm">
                {data.related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/calculators/${r.slug}`} className="text-[#E85D04] hover:underline">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
