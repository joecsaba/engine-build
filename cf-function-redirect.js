function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;
  var uri = request.uri;

  // 1. Redirect www → apex
  if (host.startsWith('www.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://engine-build.com' + uri }
      }
    };
  }

  // 2. Retired /specs URLs → the engine database that replaced them.
  // /specs and /specs/* were never routed in the app, so they fell through to
  // the SPA shell and served the homepage title with a 200. Search Console
  // logged those as soft 404s. The engine spec pages now live under /engines,
  // so send the old paths there and keep whatever equity they hold.
  if (uri === '/specs' || uri.startsWith('/specs/')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://engine-build.com/engines' }
      }
    };
  }

  // 3. /shop-directory → /shop-tools/directory
  // Both render the same page, but only /shop-tools/directory is prerendered
  // and in the sitemap. Collapsing them removes a duplicate and stops the nav
  // pointing crawlers at an unprerendered URL.
  if (uri === '/shop-directory' || uri === '/shop-directory/') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://engine-build.com/shop-tools/directory' }
      }
    };
  }

  // 4. Retire the superseded dynamic CR draft.
  // /calculators/compression-ratio already computes dynamic CR; the v2 page was
  // a parallel draft that was never prerendered or added to the sitemap, so it
  // served the homepage title with a 200 to any crawler that found it.
  // 3b. /calculators/ring-gap-advanced -> /calculators/ring-gap.
  // The advanced version became the only ring-gap calculator on 2026-05-28 and
  // the basic one was deleted. A comment in App.tsx claimed this redirect
  // already existed; it did not, so the old URL fell through to the SPA and
  // Google logged it as a soft 404 (200 status, no such route).
  if (uri === '/calculators/ring-gap-advanced' || uri === '/calculators/ring-gap-advanced/') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://engine-build.com/calculators/ring-gap' } }
    };
  }

  if (uri === '/calculators/dynamic-compression-ratio-v2' ||
      uri === '/calculators/dynamic-compression-ratio-v2/') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://engine-build.com/calculators/compression-ratio' }
      }
    };
  }

  // 5. /ads.txt must 404 rather than fall through to the SPA.
  // The file was removed when the ad-network code came out. Because it has a
  // dot it skips the rewrite below, misses in S3, and hits the 404 → /index.html
  // error response — which returns the homepage with a 200. That is a soft 404,
  // and it also means ads.txt crawlers get HTML instead of a clean "no file".
  if (uri === '/ads.txt') {
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: {
        'content-type': { value: 'text/plain' },
        'cache-control': { value: 'max-age=3600' }
      },
      body: 'Not Found'
    };
  }

  // 6. Directory-style URL resolution.
  // Per-route prerendered HTML lives at /foo/bar/index.html. Without rewriting,
  // S3 returns 404 for /foo/bar and CloudFront falls back to root /index.html,
  // which defeats the entire prerender. Rewrite extension-less paths to their
  // /index.html so prerendered files are served when present, and the existing
  // 404 → /index.html error response covers SPA-only routes (e.g.
  // /build-sheets/build/:id) that don't have a prerendered file.
  var lastSlash = uri.lastIndexOf('/');
  var lastSegment = uri.substring(lastSlash + 1);
  if (lastSegment.indexOf('.') === -1) {
    if (uri.charAt(uri.length - 1) === '/') {
      request.uri = uri + 'index.html';
    } else {
      request.uri = uri + '/index.html';
    }
  }

  return request;
}
