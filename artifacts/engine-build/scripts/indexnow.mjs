#!/usr/bin/env node
// Submit every sitemap URL to IndexNow.
//
// IndexNow is a push protocol: instead of waiting for a crawler to rediscover
// the site, we tell participating engines directly which URLs exist or changed.
// Bing, Yandex, Seznam and Naver consume it; Google does not. That makes this
// worth running here specifically because GA4 reports far more organic sessions
// than Search Console reports Google clicks, so a meaningful share of the
// site's search traffic is likely coming from engines that DO honour IndexNow.
//
// The key is self-generated (the spec allows any 8-128 hex characters) and must
// be readable at https://engine-build.com/<key>.txt containing exactly the key.
// Bing Webmaster Tools offers to mint one, but waiting for it is unnecessary.
//
// Usage:
//   node scripts/indexnow.mjs            # submit every sitemap URL
//   node scripts/indexnow.mjs --dry-run  # show what would be sent
//
// Re-run after any deploy that adds or changes URLs.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST = "engine-build.com";
const SITEMAP = resolve(__dirname, "..", "dist", "public", "sitemap.xml");
const KEYFILE = resolve(__dirname, "..", "..", "..", ".indexnow-key");
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10000; // protocol maximum per POST

const dryRun = process.argv.includes("--dry-run");

function fail(msg) {
  console.error(`indexnow: ${msg}`);
  process.exit(1);
}

if (!existsSync(KEYFILE)) fail(`no key at ${KEYFILE}. Generate one and host it at /<key>.txt`);
const key = readFileSync(KEYFILE, "utf8").trim();
if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) fail("key must be 8-128 characters of a-z, A-Z, 0-9 or dashes");

if (!existsSync(SITEMAP)) fail(`no sitemap at ${SITEMAP}. Run the build first.`);
const urls = [...readFileSync(SITEMAP, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) fail("sitemap contained no <loc> entries");

// A URL outside the host is rejected with 422 and takes the whole batch with it.
const offHost = urls.filter((u) => !u.startsWith(`https://${HOST}/`) && u !== `https://${HOST}`);
if (offHost.length) fail(`${offHost.length} sitemap URLs are not on ${HOST}, e.g. ${offHost[0]}`);

console.log(`indexnow: ${urls.length} URLs from sitemap.xml`);
console.log(`indexnow: key ${key.slice(0, 8)}… verified at https://${HOST}/${key}.txt`);

if (dryRun) {
  console.log("indexnow: --dry-run, nothing sent. First 5 URLs:");
  urls.slice(0, 5).forEach((u) => console.log(`  ${u}`));
  process.exit(0);
}

let sent = 0;
for (let i = 0; i < urls.length; i += BATCH) {
  const urlList = urls.slice(i, i + BATCH);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList }),
  });

  // 200 accepted, 202 accepted pending key validation — both are successes.
  if (res.status === 200 || res.status === 202) {
    sent += urlList.length;
    console.log(`indexnow: batch of ${urlList.length} -> ${res.status} ${res.status === 202 ? "(pending key validation)" : "OK"}`);
  } else {
    const body = await res.text().catch(() => "");
    const why = {
      400: "invalid request format",
      403: "key not valid — check the key file is reachable and matches",
      422: "URLs do not match the host, or the key schema is wrong",
      429: "rate limited — wait and retry",
    }[res.status] ?? "unexpected response";
    fail(`batch of ${urlList.length} -> ${res.status} (${why}) ${body.slice(0, 200)}`);
  }
}

console.log(`indexnow: submitted ${sent} URLs`);
