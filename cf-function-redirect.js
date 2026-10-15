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
    '/engines/chevrolet/chevrolet-427ci/427ci-4-125x4-14-9cr': '/engines/chevrolet/chevrolet-427ci/427ci-4-125x4',
    // Chrysler B 383: bore/stroke corrected to 4.25 x 3.375 (2026-10-12); the
    // 10:1 records now share one page.
    '/engines/plymouth/b/383-b-v8': '/engines/plymouth/b/e',
    // 385-series 429/460 bore/stroke corrected (2026-10-12): the pages merged
    // once their two bore figures became one.
    '/engines/mercury/385/429-10-5cr': '/engines/mercury/385/429',
    '/engines/mercury/385/460-low-comp': '/engines/mercury/385/460ci-4-36x3-85',
    '/engines/mercury/385/460-8cr': '/engines/mercury/385/460ci-4-36x3-85',
    // The Buick-built 225 V6 sold in the 1964 Oldsmobile F-85 now has its own page.
    '/engines/oldsmobile/oldsmobile-225ci': '/engines/buick/buick-225ci',
    '/engines/oldsmobile/oldsmobile-225ci/225ci-3-75x3-4': '/engines/buick/buick-225ci/225ci-3-75x3-4',
    // Buick 350: the one undated record (3.80 x 3.80, a copied bore) replaced by
    // verified 1968-1978 records at 3.80 x 3.85 (2026-10-13).
    '/engines/buick/buick-small-block-v8/350': '/engines/buick/buick-small-block-v8/350ci-3-8x3-85-10-25cr',
    // Family audit (2026-10-13): the Willys F-head four left the modern
    // Hurricane family; Duratec V6s misfiled under Zetec; the 2004 GTO LS1
    // was marked six-cylinder.
    '/engines/jeep/hurricane/f4-134': '/engines/jeep/hurricane-f-head/f4-134',
    '/engines/mercury/zetec/2-5l-v6': '/engines/mercury/duratec/155ci-3-244x3-13',
    '/engines/mercury/zetec/2-5l-duratec-v6': '/engines/mercury/duratec/155ci-3-244x3-13',
    '/engines/pontiac/pontiac-346ci/ponti-2004-346-350hp': '/engines/pontiac/pontiac-346ci/346ci-3-898x3-622',
    // Geometry audit (2026-10-13): bore/stroke corrected or withheld; the
    // GMC-filed Buick V8 family (all records wrong) and a made-up Northstar removed.
    '/engines/audi/ea837/auk-bkh-bpk-cala': '/engines/audi/ea837/cala',
    '/engines/cadillac/ecotec/20t-lsy': '/engines/cadillac/ecotec/lsy',
    '/engines/cadillac/ecotec/20t-lsv': '/engines/cadillac/ecotec/lsy',
    '/engines/cadillac/northstar/lk8': '/engines/cadillac/northstar',
    '/engines/ford/power-stroke-6-7/407ci-3-85x4-252': '/engines/ford/power-stroke-6-7/406ci-3-9x4-25',
    '/engines/gmc/buick-v8/430': '/engines/buick/buick-430ci',
    '/engines/gmc/buick-v8/425': '/engines/buick/buick-425ci',
    '/engines/gmc/buick-v8/401': '/engines/buick/buick-401ci',
    '/engines/gmc/buick-v8/400': '/engines/buick/buick-400ci',
    '/engines/gmc/buick-v8/364': '/engines/buick/buick-364ci',
    '/engines/gmc/buick-v8/350': '/engines/buick/buick-small-block-v8',
    '/engines/gmc/buick-v8/340': '/engines/buick/buick-340ci',
    '/engines/gmc/buick-v8/322': '/engines/buick/nailhead-v8',
    '/engines/gmc/buick-v8/300': '/engines/buick/buick-300ci',
    '/engines/gmc/buick-v8/264': '/engines/buick/nailhead-v8',
    '/engines/gmc/ecotec-i4/laf': '/engines/gmc/ecotec-i4/luv',
    '/engines/gmc/high-feature-v6/217ci-3-74x3-378': '/engines/gmc/high-feature-v6/223ci-3-74x3-378',
    '/engines/jeep/amc-v8/401-8-25cr': '/engines/jeep/amc-v8',
    '/engines/oldsmobile/oldsmobile-207ci/207ci-3-62x2-31': '/engines/oldsmobile/oldsmobile-207ci',
    '/engines/plymouth/rb/426-maxwedge': '/engines/plymouth/rb/426ci-4-25x3-75',
    '/engines/plymouth/rb/426-wedge': '/engines/plymouth/rb/426ci-4-25x3-75',
    '/engines/pontiac/pontiac-135ci/135ci-3-386x3-386': '/engines/chevrolet/chevrolet-134ci/ln2',
    // Pontiac 135ci removed 2026-10-15: NHRA's 1999-2001 rows carried the 2002+ L61; the
    // 2000-01 Sunfire 2.2 was the LN2.
    '/engines/pontiac/pontiac-135ci/135ci-3-386x3-724': '/engines/chevrolet/chevrolet-134ci/ln2',
    '/engines/pontiac/pontiac-135ci': '/engines/chevrolet/chevrolet-134ci/ln2',
    // 2026-10-15: the 1962-63 Fairlane 170 six had been given the 2.8 Cologne V6's
    // geometry; the corrected 1985 Chevrolet 262 folded the GMC LB4 page into Chevrolet's.
    '/engines/mercury/cologne/u-code': '/engines/ford/ford-170ci/u-code',
    '/engines/gmc/vortec-4300/lb4': '/engines/chevrolet/chevrolet-262ci/lb4',
    '/engines/pontiac/pontiac-207ci/207ci-3-62x2-31': '/engines/pontiac/pontiac-207ci',
    '/engines/subaru/fa/24-na': '/engines/subaru/fa',
    '/engines/subaru/fa/subaru-fa24t': '/engines/subaru/fa',
    '/engines/gmc/buick-v8': '/engines/buick',
    // Batch 5 (2026-10-13): pages named by their model-year span grew with the
    // Suburban's years; the GR V6 2GR page moved when its displacement was corrected.
    '/engines/chevrolet/chevrolet-283ci/283ci-1957-1966': '/engines/chevrolet/chevrolet-283ci/283ci-1957-1967',
    '/engines/chevrolet/chevrolet-305ci/305ci-1977-1978': '/engines/chevrolet/chevrolet-305ci/305ci-1976-1978',
    '/engines/chevrolet/chevrolet-307ci/307ci-1968-1970': '/engines/chevrolet/chevrolet-307ci/307ci-1968-1972',
    '/engines/chevrolet/chevrolet-327ci/327ci-1962-1966': '/engines/chevrolet/chevrolet-327ci/327ci-1962-1968',
    '/engines/chevrolet/chevrolet-396ci/396ci-1969': '/engines/chevrolet/chevrolet-396ci/396ci-1968-1969',
    '/engines/gmc/chevy-i6-194-292/292ci-1963-1966': '/engines/gmc/chevy-i6-194-292/292ci-1963-1971',
    '/engines/toyota/gr-v6/210ci-3-701x3-268': '/engines/toyota/gr-v6/2gr-fe'
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
