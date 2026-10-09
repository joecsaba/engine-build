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

  // 4b. Spec pages whose address changed when bad data was corrected
  // (2026-10-08). Engine slugs carry the compression ratio when it is what
  // separates two records, so fixing a wrong ratio moves the page.
  var CORRECTED = {
    // Olds 350 diesel: 23.5:1 corrected to 22.5:1.
    '/engines/oldsmobile/oldsmobile-350ci/350ci-4-057x3-385-23-5cr': '/engines/oldsmobile/oldsmobile-350ci/350ci-4-057x3-385-22-5cr',
    // Chevy 427 listed at an impossible 14.9:1; ratio removed, merged with its twin.
    '/engines/chevrolet/chevrolet-427ci/427ci-4-125x4-14-9cr': '/engines/chevrolet/chevrolet-427ci/427ci-4-125x4'
  };
  var corrected = CORRECTED[uri.replace(/\/$/, '')];
  if (corrected) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://engine-build.com' + corrected } }
    };
  }

  // 5. /ads.txt -> the file Mediavine hosts for this site.
  // Journey by Mediavine was installed 2026-09-16. Rather than copy their
  // ads.txt into S3, redirect to the version they maintain — it carries a
  // version stamp (v20260904 at install) and changes as demand partners come
  // and go, so a static copy would drift and Mediavine flags stale files. This
  // is what their WordPress plugin does. The IAB spec permits a single
  // off-domain redirect and requires crawlers to follow it.
  //
  // This rule also keeps /ads.txt from falling through to the SPA: the path has
  // a dot, so it would skip the rewrite below, miss in S3, and hit the
  // 404 -> /index.html error response — the homepage with a 200.
  if (uri === '/ads.txt') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://adstxt.mediavine.com/sites/9c5b9a80-e2da-4fa3-82c9-3db1731d9991/ads.txt' },
        'cache-control': { value: 'max-age=3600' }
      }
    };
  }

  // 6. Client-side-only routes.
  // These have no prerendered file and need the app shell so the client
  // router can render them. They are the ONLY paths that get /index.html with
  // a 200. Everything else that misses in S3 becomes a real 404 through the
  // distribution's custom error responses (403/404 -> /404.html, status 404).
  //
  // Before this list existed the error response was /index.html with a 200,
  // which made every mistyped or retired URL return the homepage as a
  // success — Google's "soft 404" — and turned WAF blocks into the homepage
  // too. Audited against App.tsx on 2026-09-17. When a new client-only route
  // ships, add it here; a miss degrades to "works for humans, 404 for
  // crawlers" because /404.html still boots the app, not to a broken page.
  var SPA_EXACT = ['/build-sheets/record'];
  var SPA_PREFIXES = ['/build-sheets/build/', '/articles', '/sign-in/', '/sign-up/', '/admin/'];
  var i;
  for (i = 0; i < SPA_EXACT.length; i++) {
    if (uri === SPA_EXACT[i] || uri === SPA_EXACT[i] + '/') {
      request.uri = '/index.html';
      return request;
    }
  }
  for (i = 0; i < SPA_PREFIXES.length; i++) {
    if (uri.startsWith(SPA_PREFIXES[i])) {
      request.uri = '/index.html';
      return request;
    }
  }

  // 7. Directory-style URL resolution.
  // Per-route prerendered HTML lives at /foo/bar/index.html. Without rewriting,
  // S3 returns 403 for /foo/bar (no list permission on the bucket) and the
  // prerender is never served. Rewrite extension-less paths to their
  // /index.html; a path with no prerendered file then misses in S3 and gets
  // the real 404 page.
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
