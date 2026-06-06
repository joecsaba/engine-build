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

  // 2. Redirect /ads.txt to Ezoic's managed ads.txt (kept up to date by Ezoic
  //    as their advertising partners change). Per Ezoic ads.txt setup docs.
  if (uri === '/ads.txt') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://srv.adstxtmanager.com/19390/engine-build.com' }
      }
    };
  }

  // 3. Directory-style URL resolution.
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
