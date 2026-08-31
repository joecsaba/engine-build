#!/usr/bin/env node
// Full deploy: build -> S3 -> CloudFront invalidation -> IndexNow.
//
// This exists mainly so the IndexNow submission cannot be forgotten. Bing sends
// this site roughly three times the clicks Google does, and it is the only
// engine here that accepts a push — so a deploy that skips it leaves the larger
// channel waiting on a crawl that takes weeks.
//
// It deliberately runs on deploy rather than as part of `build`: a local build
// should never ping a search engine.
//
// Usage:
//   pnpm run deploy              build, upload, invalidate, submit
//   pnpm run deploy --skip-build reuse dist/ as-is
//   pnpm run deploy --dry-run    show each step without executing
//
// Ordering matters. IndexNow runs last and only if everything before it
// succeeded — telling Bing about URLs that failed to upload would be worse than
// telling it nothing.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist", "public");

const BUCKET = "s3://engine-build-com-site";
const DISTRIBUTION = "E19AA5JJA6WGT";
const SITE = "https://engine-build.com";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipBuild = args.includes("--skip-build");

const t0 = Date.now();
const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const fail = (msg) => { console.error(`\ndeploy failed: ${msg}`); process.exit(1); };

// On Windows pnpm is a .cmd shim, so spawnSync needs shell resolution to find
// it. That is safe for the "/*" invalidation path: Node's shell here is cmd.exe,
// which passes the argument through untouched. The mangling that turns "/*" into
// a Windows path is an MSYS behaviour and only applies when invoking from Git
// Bash, which this script bypasses.
const NEEDS_SHELL = process.platform === "win32";

function run(cmd, cmdArgs, opts = {}) {
  if (dryRun) { console.log(`    would run: ${cmd} ${cmdArgs.join(" ")}`); return { stdout: "", status: 0 }; }
  const r = spawnSync(cmd, cmdArgs, { encoding: "utf8", shell: NEEDS_SHELL, cwd: opts.cwd ?? ROOT, ...opts });
  if (r.error) fail(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) {
    process.stderr.write(r.stderr || r.stdout || "");
    fail(`${cmd} exited ${r.status}`);
  }
  return r;
}

const aws = (a) => run("aws", a).stdout.trim();

// ---- 1. build --------------------------------------------------------------
if (skipBuild) {
  step(1, "build skipped (--skip-build)");
  if (!existsSync(resolve(DIST, "sitemap.xml"))) fail("no dist/public/sitemap.xml — cannot skip the build");
} else {
  step(1, "building");
  run("pnpm", ["run", "build"], { stdio: dryRun ? "pipe" : "inherit" });
}

const urlCount = dryRun ? 0
  : (readFileSync(resolve(DIST, "sitemap.xml"), "utf8").match(/<loc>/g) ?? []).length;
if (!dryRun && !urlCount) fail("sitemap.xml has no URLs");
console.log(`    sitemap: ${urlCount} URLs`);

// ---- 2. upload -------------------------------------------------------------
step(2, "syncing to S3");
const sync = run("aws", ["s3", "sync", ".", BUCKET, "--delete"], { cwd: DIST });
const uploaded = (sync.stdout.match(/^upload:/gm) ?? []).length;
const deleted = (sync.stdout.match(/^delete:/gm) ?? []).length;
console.log(`    ${uploaded} uploaded, ${deleted} deleted`);

// ---- 3. invalidate ---------------------------------------------------------
step(3, "invalidating CloudFront");
const invId = aws(["cloudfront", "create-invalidation", "--distribution-id", DISTRIBUTION,
                   "--paths", "/*", "--query", "Invalidation.Id", "--output", "text"]);
console.log(`    ${invId}`);
if (!dryRun) {
  process.stdout.write("    waiting");
  for (;;) {
    const status = aws(["cloudfront", "get-invalidation", "--distribution-id", DISTRIBUTION,
                        "--id", invId, "--query", "Invalidation.Status", "--output", "text"]);
    if (status === "Completed") break;
    process.stdout.write(".");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000);
  }
  console.log(" done");
}

// ---- 4. smoke test ---------------------------------------------------------
// Cheap guard against shipping a broken deploy and then announcing it to Bing.
step(4, "checking key routes");
if (!dryRun) {
  const routes = ["/", "/calculators", "/engines", "/cams", "/sitemap.xml"];
  for (const path of routes) {
    const res = await fetch(SITE + path, { redirect: "manual" });
    const ok = res.status === 200;
    console.log(`    ${String(res.status).padStart(3)}  ${path}`);
    if (!ok) fail(`${path} returned ${res.status}`);
  }
}

// ---- 5. IndexNow -----------------------------------------------------------
step(5, "submitting to IndexNow");
// Relative path deliberately: cwd is ROOT, and an absolute path would break
// under shell resolution because "C:\Engine Website" contains a space.
run("node", ["scripts/indexnow.mjs", ...(dryRun ? ["--dry-run"] : [])], { stdio: "inherit" });

console.log(`\ndeploy complete in ${Math.round((Date.now() - t0) / 1000)}s`);
