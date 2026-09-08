// Source attribution for third-party methods used by the calculators.
//
// Several calculators implement published methods rather than generic physics —
// most of them David Vizard's. His name appears across the cam, carb, head-flow
// and compression tools, and until now nothing on the site pointed a reader at
// the books those methods come from. Naming someone's work repeatedly while
// giving readers no way to reach the source is poor practice, and it denies the
// reader the only place the full method is actually explained.
//
// One definition, read by both the React pages and the prerenderer, so a link
// fixed here is fixed everywhere.
//
// ASINs are the ISBN-10s, which is what Amazon uses for print books.
//
// AMAZON_TAG is the site's existing Associates tag, already in use on the
// cam-duration page and already disclosed under "Affiliate Links Disclosure" in
// the terms. Centralising it means the tag is set once rather than baked into
// individual hrefs, and clean /dp/<asin> links replace the amzn.to shortlinks,
// which carried a page of search-session tracking parameters.

export const AMAZON_TAG = "enginebuild-20";

export const VIZARD_BOOKS = {
  horsepower: {
    title: "David Vizard's How to Build Horsepower",
    asin: "1934709174",
    isbn13: "9781934709177",
    covers: "LSA selection, the cubes-per-inch-of-valve method, rocker ratios, valvetrain",
  },
  smallBlock: {
    title: "David Vizard's How to Build Max-Performance Chevy Small-Blocks on a Budget",
    asin: "1932494847",
    isbn13: "9781932494846",
    covers: "camshaft selection, cylinder head modifications, part numbers",
  },
  heads: {
    title: "David Vizard's How to Port & Flow Test Cylinder Heads",
    asin: "1934709646",
    isbn13: "9781934709641",
    covers: "porting, flow bench testing, the flow-to-horsepower relationship",
  },
};

/** Amazon product URL for a book, with the Associates tag if one is set. */
export function bookUrl(key) {
  const b = VIZARD_BOOKS[key];
  if (!b) return null;
  return `https://www.amazon.com/dp/${b.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ""}`;
}

/**
 * Citation HTML for a calculator that implements part of a published method.
 * `context` names what this particular tool takes from the book.
 */
export function vizardCitationHtml(key, context) {
  const b = VIZARD_BOOKS[key];
  if (!b) return "";
  return (
    `<p><strong>Source:</strong> ${context} is from ` +
    `<a href="${bookUrl(key)}" target="_blank" rel="noopener nofollow"><em>${b.title}</em></a>` +
    ` (CarTech, ISBN ${b.isbn13}). The book sets out the full method, its assumptions and the ` +
    `dyno work behind it. This calculator implements one part of that and is no substitute for ` +
    `the explanation.</p>`
  );
}

export default VIZARD_BOOKS;
