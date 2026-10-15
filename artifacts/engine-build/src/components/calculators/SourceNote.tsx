import { VIZARD_BOOKS, bookUrl } from "@/data/attribution.mjs";

interface Props {
  /** Which book this calculator's method comes from. */
  book: keyof typeof VIZARD_BOOKS;
  /** What this particular calculator takes from it. */
  context: string;
}

/**
 * Citation for a calculator that implements a published method.
 *
 * These tools name David Vizard throughout — the LSA rule, the carburettor
 * correction factor, the flow-to-horsepower figure — and for a long time gave
 * readers no way to reach the source. A calculator implements one slice of a
 * method; the book is where the reasoning and its limits actually live.
 *
 * The link is a plain Amazon book link. It carried the site's Associates tag
 * (with an inline disclosure) until the account closed on 2026-10-15; if a tag
 * is set again in attribution.mjs, restore the disclosure here at the link.
 */
export function SourceNote({ book, context }: Props) {
  const b = VIZARD_BOOKS[book];
  if (!b) return null;
  return (
    <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
      <strong className="text-foreground">Source:</strong> {context} is from{" "}
      <a
        href={bookUrl(book)!}
        target="_blank"
        rel="noopener nofollow"
        className="text-[#E85D04] hover:underline"
      >
        <em>{b.title}</em>
      </a>{" "}
      (CarTech, ISBN {b.isbn13}). The book sets out the full method, its assumptions and the dyno
      work behind it. This calculator implements one part of that and is no substitute for the
      explanation.
    </p>
  );
}
