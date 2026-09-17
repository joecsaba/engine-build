#!/usr/bin/env node
// =============================================================================
// Prerender script — generates a unique HTML file per known route so Google
// (and other crawlers) get per-page <title>, <meta description>, canonical,
// OG tags, JSON-LD, and a static SEO content block instead of one identical
// SPA shell for every URL.
//
// React's createRoot.render() replaces the SEO block on hydration, so users
// see no FOUC and the existing app behavior is untouched.
//
// Routes that aren't in the manifest still work via the existing CloudFront
// 404→/index.html fallback (e.g. /build-sheets/build/:id).
// =============================================================================

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import GUIDES from "../src/data/guides/manifest.mjs";
import { clampDesc, encodedLength, familyDescription, manufacturerDescription } from "../src/data/seoDescriptions.mjs";
import FAQ from "../src/data/faq.mjs";
import { loadEngineData, writeRuntimeData } from "./engineData.mjs";
import { loadCams, writeCamRuntime } from "./camData.mjs";
import CAM_GUIDE from "../src/data/pageContent/cam-guide.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "..", "dist", "public");
const CONTENT_DIR = resolve(__dirname, "..", "src", "data", "calculatorContent");
const GUIDE_CONTENT_DIR = resolve(__dirname, "..", "src", "data", "guideContent");
const SITE = "https://engine-build.com";
const SITE_NAME = "Engine-build.com";

// Convert "15 min" / "1h 30m" / "PT15M" into ISO 8601 duration for HowTo schema.
function toIsoDuration(input) {
  if (!input) return undefined;
  if (input.startsWith("PT")) return input;
  let h = 0, m = 0;
  const hMatch = input.match(/(\d+)\s*h/i);
  const mMatch = input.match(/(\d+)\s*(?:min|m)\b/i);
  if (hMatch) h = parseInt(hMatch[1], 10);
  if (mMatch) m = parseInt(mMatch[1], 10);
  if (!h && !m) return undefined;
  return `PT${h ? h + "H" : ""}${m ? m + "M" : ""}`;
}

// Strip HTML tags from a string — Google's FAQPage and HowTo schemas accept
// plain text for the answer/step text.
function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Try to load long-form content for a calculator slug. Returns null if no
// content file exists yet — most calcs are still in that state and just get
// the basic h1+description SEO block.
async function loadCalcContent(slug) {
  const path = resolve(CONTENT_DIR, `${slug}.mjs`);
  try {
    await access(path);
  } catch {
    return null;
  }
  const mod = await import(pathToFileURL(path).href);
  return mod.default ?? null;
}

function renderContentHtml(content) {
  if (!content) return "";
  const sections = content.sections.map((s) => `
      <h2>${escapeHtml(s.heading)}</h2>
      ${s.body}`).join("");
  return `
      <article style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e5e5;">
        <p>${escapeHtml(content.intro)}</p>
        ${sections}
      </article>`;
}

// Long-form body for a guide, from src/data/guideContent/<slug>.mjs. Mirrors
// loadCalcContent: the same file backs the React <GuideContent> component, so
// the prose a reader sees is the prose that gets indexed. Returns null when a
// guide has no content file yet, in which case the manifest steps[] still
// provide a basic (short) SEO block.
async function loadGuideContent(slug) {
  const path = resolve(GUIDE_CONTENT_DIR, `${slug}.mjs`);
  try {
    await access(path);
  } catch {
    return null;
  }
  const mod = await import(pathToFileURL(path).href);
  return mod.default ?? null;
}

function renderGuideContentHtml(content) {
  if (!content) return "";
  const note = content.note
    ? `\n      <p><strong>${escapeHtml(content.note.title)}:</strong> ${escapeHtml(content.note.body)}</p>`
    : "";
  const sections = content.sections.map((s) => `
      <h2>${escapeHtml(s.heading)}</h2>
      ${s.body}`).join("");
  const related = content.related?.length
    ? `
      <h2>Related calculators</h2>
      <ul>
        ${content.related.map((r) => `<li><a href="/calculators/${r.slug}">${escapeHtml(r.title)}</a></li>`).join("\n        ")}
      </ul>`
    : "";
  return `
      <article>
        <p>${escapeHtml(content.intro)}</p>${note}
        ${sections}
      </article>${related}`;
}

// ---------------------------------------------------------------------------
// Route manifest. Single source of truth for SEO copy per page.
// Keep `title` action-led ("Compression Ratio Calculator") and `description`
// 150-160 chars with a benefit. `category` and `relatedSlugs` drive the SEO
// block (breadcrumbs + internal links).
// ---------------------------------------------------------------------------

const CATEGORIES = {
  "short-block":     { label: "Short Block",         href: "/calculators/short-block" },
  "cam-valvetrain":  { label: "Cam & Valvetrain",    href: "/calculators/cam-valvetrain" },
  "power-fuel":      { label: "Power & Fuel",        href: "/calculators/power-fuel" },
  "drivetrain-shop": { label: "Drivetrain & Shop",   href: "/calculators/drivetrain-shop" },
  "diesel":          { label: "Diesel",              href: "/calculators/diesel" },
};

const CALCS = [
  // ─── Short Block ────────────────────────────────────────────────────────
  { slug: "displacement",                  category: "short-block",     title: "Engine Displacement Calculator — Bore × Stroke", description: "Engine displacement from bore, stroke and cylinder count, in cubic inches, cc and litres, with 30+ engine specs and stroker combos." },
  { slug: "compression-ratio",             category: "short-block",     title: "Compression Ratio Calculator: Static + Dynamic", description: "Static and dynamic compression ratio from bore, stroke, chamber volume and gasket, with cranking pressure and an octane guide." },
  { slug: "ring-gap",                      category: "short-block",     title: "Piston Ring Gap Calculator (NA & Boost)",                     description: "Ring end gap for your exact bore, by application — NA, turbo, supercharged, nitrous or diesel. Per-ring targets in inches or mm, with material warnings." },
  { slug: "piston-speed",                  category: "short-block",     title: "Piston Speed Calculator",                        description: "Mean and peak piston speed in FPM with color-coded safety zones, a reference table of common engine redlines, and where rod ratio changes the peak." },
  { slug: "quench-deck-height",            category: "short-block",     title: "Quench & Deck Height Calculator — Squish",                description: "Piston-to-deck clearance, quench (squish) distance and compression ratio in one pass. Compare gasket thicknesses side by side and see all three update live." },
  { slug: "rod-ratio",                     category: "short-block",     title: "Rod Ratio Calculator — Compare 11 Engines",                description: "Enter rod length and stroke for your rod ratio instantly. Visual gauge shows where your combo lands, with 11 engines from LS1 to K24A to compare against." },
  { slug: "bearing-clearance",             category: "short-block",     title: "Bearing Clearance Calculator",                   description: "Main and rod bearing oil clearance from measurements or Plastigage. Per-bearing tables and oil viscosity recommendations." },
  { slug: "intake-manifold-milling",       category: "short-block",     title: "Intake Manifold Milling Calculator",             description: "How much to mill the intake manifold after surfacing heads or decking the block. Tells you when correction is needed and how much." },
  { slug: "bolt-spec-lookup",              category: "short-block",     title: "Head Bolt & Main Bolt Spec Lookup",              description: "Look up head bolt and main bolt thread sizes, diameters, torque specs, and ARP upgrade part numbers for any engine platform." },
  { slug: "cc-ci-converter",               category: "short-block",     title: "CC to Cubic Inch Converter",                     description: "Convert chamber volumes, piston dome/dish CCs, and displacement between cubic centimeters, cubic inches, liters, and fluid ounces." },

  // ─── Cam & Valvetrain ──────────────────────────────────────────────────
  { slug: "cam-selector",                  category: "cam-valvetrain",  title: "Camshaft Selector — What Cam Do I Need?", description: "Enter your engine, compression, transmission and goal. Get a recommended duration at 0.050 inch, LSA and lift, with matching real cams." },
  { slug: "cam-duration",                  category: "cam-valvetrain",  title: "Advanced Cam Timing Calculator",                 description: "Full cam analysis: valve events, overlap, recommended LSA, dynamic compression ratio and a rocker lift table. Works from the numbers on the cam card." },
  { slug: "cam-degreeing",                 category: "cam-valvetrain",  title: "Cam Degreeing Calculator",                       description: "Step-by-step cam degreeing guide with intake centerline verification, advance/retard calculation, and dial indicator math." },
  { slug: "valvetrain-builder",            category: "cam-valvetrain",  title: "Valvetrain RPM Builder",                         description: "Match cam, rockers, springs, and target RPM as a complete system. Valve float estimation, RPM safety graph, and cascade warnings." },
  { slug: "valve-spring",                  category: "cam-valvetrain",  title: "Valve Spring Calculator",                        description: "Validate valve spring specs for your cam profile. Seat pressure, open pressure, coil bind clearance, and spring rate analysis." },
  { slug: "valve-shim",                    category: "cam-valvetrain",  title: "Valve Shim Calculator",                          description: "Calculate replacement shim sizes for shim-over-bucket and shim-under-bucket valvetrains. Nearest available shim lookup." },
  { slug: "pushrod-length",                category: "cam-valvetrain",  title: "Pushrod Length Calculator",                      description: "Correct pushrod length after head milling, cam swaps, or rocker changes. Stock lengths for SBC, BBC, LS, SBF, and Hemi." },
  { slug: "piston-to-valve",               category: "cam-valvetrain",  title: "Piston-to-Valve Clearance Calculator",           description: "Kinematic P2V simulation across the overlap region. Engine platform presets, cam advance slider, and interference warnings." },
  { slug: "head-flow",                     category: "cam-valvetrain",  title: "Cylinder Head Flow / CFM to HP Calculator",      description: "Convert flow bench CFM to horsepower potential. Flow coefficient, intake/exhaust ratio, port velocity, and comparison against popular heads." },
  { slug: "head-milling",                  category: "cam-valvetrain",  title: "Head Milling Calculator",                        description: "Calculate chamber volume change, compression ratio shift, and intake manifold alignment when milling cylinder heads." },

  // ─── Power & Fuel ──────────────────────────────────────────────────────
  { slug: "hp-torque",                     category: "power-fuel",      title: "HP to Torque Calculator — Both Directions", description: "Bidirectional horsepower and torque calculator with the 5252 RPM crossover explained, plus Nm and kg-m conversions." },
  { slug: "hp-estimator",                  category: "power-fuel",      title: "HP and Torque Estimator",                        description: "Estimate horsepower and torque for your build. Pick your engine, heads, cam, intake, exhaust, and compression for a data-backed estimate." },
  { slug: "afr-lambda",                    category: "power-fuel",      title: "Lambda to AFR Converter — Both Directions",                         description: "Convert lambda to AFR or AFR to lambda for pump gas, E85, E98, methanol, propane and CNG. Instant result on both the gas scale and true AFR." },
  { slug: "header-sizing",                 category: "power-fuel",      title: "Exhaust Header Tube Length Calculator", description: "Header primary tube length and diameter from displacement and target RPM, with collector sizing and the tube sizes Hooker, Kooks and ARH actually ship." },
  { slug: "carb-cfm-sizing",               category: "power-fuel",      title: "Carburetor CFM Calculator",                      description: "Calculate the right carburetor size for your engine. Real carb sizes from Holley and Edelbrock with overcarburetion warnings." },
  { slug: "fuel-injector-sizing",          category: "power-fuel",      title: "Fuel Injector Sizing Calculator",                description: "What size fuel injectors do you need? Duty cycle analysis, fuel pump sizing and matching to real injector sizes, for pump gas, E85 and methanol." },
  { slug: "turbo-finder",                  category: "power-fuel",      title: "Turbo Finder & Sizing Calculator",               description: "Find the right turbocharger for your engine. Airflow, boost pressure, compressor sizing, and turbo recommendations by HP goal." },
  { slug: "boost-compression",             category: "power-fuel",      title: "Boost / Effective Compression Ratio Calculator", description: "Effective compression ratio under boost. Altitude correction, fuel-specific safety limits, and reverse-solve for max safe boost or CR." },
  { slug: "octane-mix",                    category: "power-fuel",      title: "Octane Mix Calculator — Blend 110 with 93",                          description: "Blend two fuels to hit a target octane — race gas with pump, or any E85 ratio. Shows mix percentage, resulting stoich AFR, BTU content and MPG impact." },
  { slug: "ignition-timing-curve",         category: "power-fuel",      title: "Ignition Timing Advance Curve Calculator",       description: "Visualize your ignition advance curve. Input initial, mechanical, and vacuum advance to see total timing vs RPM at WOT, part throttle, cruise." },
  { slug: "pressure-converter",            category: "power-fuel",      title: "Pressure Converter — PSI, Bar, kPa, atm", description: "Convert between PSI, bar, kPa, atm, and inHg — for boost gauges, oil pressure, fuel rail, and vacuum measurements." },
  { slug: "an-fitting-size",               category: "power-fuel",      title: "AN Fitting Size Chart",                          description: "AN / JIC fitting dash sizes with tube OD, JIC 37° flare thread, and ORB thread. For fuel system, oil cooler, and turbo plumbing." },

  // ─── Drivetrain & Shop ─────────────────────────────────────────────────
  { slug: "gear-ratio",                    category: "drivetrain-shop", title: "Gear Ratio & Final Drive Calculator",            description: "RPM at speed for any axle ratio, tire size and transmission. Compare gear ratios side by side and see what a taller tire does to your cruise RPM." },
  { slug: "torque-extension",              category: "drivetrain-shop", title: "Torque Wrench Extension Calculator",             description: "Corrected torque wrench setting for a crow's foot or extension, using the L/(L+E) lever arm formula, plus the cases where no correction is needed." },
  { slug: "mm-inch-converter",             category: "drivetrain-shop", title: "MM to Inch Converter",                           description: "High-precision metric to imperial conversion for engine builders. Includes machinist reference tables and fractional inch equivalents." },
  { slug: "wrench-size-converter",         category: "drivetrain-shop", title: "Wrench Size Converter — SAE to Metric", description: "Convert SAE wrench sizes to metric and back, or measure an unknown fastener with calipers to find the size you need." },
  { slug: "density-altitude",              category: "drivetrain-shop", title: "Density Altitude / HP Correction Calculator",    description: "Calculate density altitude, relative HP, and dyno correction factors for SAE J1349, J607, and DIN 70020. Dew point or RH input." },
  { slug: "torque-converter-stall",        category: "drivetrain-shop", title: "Torque Converter Stall Speed Calculator",        description: "Find the right converter stall speed for your build. Recommended stall range, converter diameter, launch analysis, and cruise RPM." },
  { slug: "decimal-fraction-inch",         category: "drivetrain-shop", title: "Decimal to Fraction Inch Converter + Chart", description: "Decimal to fraction inch converter with a full 1/64 inch chart, tap drill equivalents and SAE wrench sizes with metric equivalents." },
  { slug: "tap-drill-lookup",              category: "drivetrain-shop", title: "Tap Drill Size Lookup",                          description: "Pick a tap, get the drill. Imperial UNC/UNF and metric coarse/fine with 75% and 50% thread engagement sizes for any common tap." },
  { slug: "thread-pitch-converter",        category: "drivetrain-shop", title: "Thread Pitch Converter — TPI to Metric",         description: "Identify a thread when you have only TPI or only metric pitch. TPI × pitch (mm) = 25.4. Common UNC/UNF and metric pitches in quick reference." },
  { slug: "torque-units-converter",        category: "drivetrain-shop", title: "Torque Units Converter (ft-lb / Nm / in-lb)",    description: "Convert between ft-lb, Nm, in-lb and kgf-m, with common engine torque ranges alongside so you can sanity-check the spec you are converting." },
  { slug: "temperature-converter",         category: "drivetrain-shop", title: "Temperature Converter (°F / °C / K)",            description: "Fahrenheit, Celsius, and Kelvin with engine reference points: coolant, oil, EGT zones (cold / normal / hot / danger)." },

  // ─── Diesel ────────────────────────────────────────────────────────────
  { slug: "diesel-single-turbo",           category: "diesel",          title: "Diesel Single Turbo Finder",                     description: "Match Holset, BorgWarner, and Garrett turbos for Cummins, Duramax, and Powerstroke with airflow and drive pressure calculations." },
  { slug: "diesel-compound-turbo",         category: "diesel",          title: "Diesel Compound Turbo Sizing Calculator",        description: "Size compound twin turbo setups. Match S300/S400 and Holset turbos with pressure ratio split for Cummins, Duramax, and Powerstroke." },
  { slug: "diesel-lift-pump",              category: "diesel",          title: "Diesel Lift Pump & Fuel System Calculator",      description: "FASS and AirDog lift pump sizing from target horsepower, with platform-specific warnings across every Cummins, Duramax and Powerstroke generation." },
  { slug: "diesel-egt-drive-pressure",     category: "diesel",          title: "Diesel EGT & Drive Pressure Calculator",         description: "Check pyrometer readings against safe limits. Pre-turbo vs post-turbo correction for Cummins, Duramax, and Powerstroke." },
  { slug: "diesel-injector-nozzle-pop-pressure", category: "diesel",    title: "Diesel Nozzle & Pop Pressure Calculator",        description: "Nozzle sizing for Cummins P-pump, VE, and VP44. Pop pressure recommendations, shim sizing, and air/fuel match assessment." },
  { slug: "diesel-smoke-lambda",           category: "diesel",          title: "Diesel Smoke Limit & Lambda Calculator",         description: "Diesel lambda and AFR calculator with smoke prediction and boost-to-fuel balance analysis. Shows where you run out of air before you run out of fuel." },
  { slug: "diesel-valve-relief",           category: "diesel",          title: "Cummins Valve Relief Calculator",                description: "Determine if your Cummins needs valve reliefs when upgrading cams. Covers 5.9L 12V, 24V, 6.7L, and 4BT with clearance analysis." },
];

// Static (non-calculator) pages.
// NOTE: "/" is intentionally excluded — the source index.html already ships
// rich homepage SEO content inside <div id="root"> (calculator listing, engine
// reference specs, etc.) which we want to preserve as-is.
//
// `noindex: true` means prerender the page (so direct visits still get good
// metadata) but EXCLUDE from sitemap.xml. Used for auth-gated pages with no
// public content for Google to index.
const STATIC_PAGES = [
  { path: "/calculators",       title: "All Engine Building Calculators",                            description: "Browse 47+ engine building calculators across short block, cam & valvetrain, power & fuel, drivetrain & shop, and diesel categories. All free.",     priority: 0.9 },
  { path: "/cam-guide",         title: "Camshaft Selection Guide",                                   description: "Systematic approach to selecting the right camshaft for your build. Duration, LSA, lift, and overlap explained for street, strip, and race.",         priority: 0.9 },
  { path: "/build-advisor",     title: "Build Advisor — HP Goal Planner",                            description: "Set a target HP, pick your engine platform, and dial in heads, cam, intake, and compression with live sliders. Data-backed HP estimates.",             priority: 0.8 },
  { path: "/build-sheets",      title: "Build Sheets",                                               description: "Plan and document your engine build.",                                                                                                                noindex: true },
  { path: "/build-sheets/new",  title: "Start a New Engine Build",                                   description: "Guided wizard to start a new engine build sheet. Pick your platform and target specs, then refine with the calculator suite.",                       noindex: true },
  { path: "/build-sheets/planner", title: "Build Planner",                                           description: "Plan your engine build component by component with live spec validation.",                                                                              noindex: true },
  { path: "/build-sheets/my-builds", title: "My Builds",                                             description: "Your saved engine builds. Resume any build, clone for a new project, or export specs.",                                                                 noindex: true },
  { path: "/engine-data",       title: "Engine Specs Database — 3,500+ Engines",                    description: "Bore, stroke, rod length, compression ratio, head data, valve sizes, and clearances for 3,500+ domestic and import engines. Searchable by manufacturer.", priority: 0.9 },
  // noindex until the torque dataset is repaired. Every one of the 1,315
  // torque_to_yield specs currently carries a single step with no angle and
  // reusable:true — i.e. the initial snug value recorded as if it were the
  // whole procedure. Publishing that to search is a safety problem, so the
  // page stays reachable by direct link but out of the index until fixed.
  { path: "/torque-specs",      title: "Torque Specs Quick Lookup",                                  description: "Head bolt, main bolt, and rod bolt torque sequences for popular engine platforms. Step-by-step with ARP upgrade specs.",                              noindex: true },
  { path: "/shop-tools/directory", title: "Machine Shop Directory",                                  description: "Find engine machine shops near you. Searchable by service (boring, decking, balancing) and radius from your zip code.",                              priority: 0.8 },
  { path: "/contact",           title: "Contact",                                                    description: "Send feature requests, calculator suggestions, corrections or feedback. Most tools here started as a request from a builder.",                                                                    priority: 0.5 },
  { path: "/privacy",           title: "Privacy Policy",                                             description: "How Engine-build.com handles your data. Google Analytics only, no advertising, and we don't sell your information.",                                                                              priority: 0.3 },
  { path: "/terms",             title: "Terms of Service",                                           description: "Terms of service for Engine-build.com calculators and engine data. Acceptable use, accuracy disclaimers and affiliate disclosure.",                                                                                   priority: 0.3 },
  { path: "/sign-in",         noindex: true,           title: "Sign In",                                                    description: "Sign in to sync favorites, saved presets, and engine builds across every device.",                                                                     priority: 0.5 },
  { path: "/sign-up",           title: "Create a Free Account",                                      description: "Create a free Engine-build.com account to sync favorites, calculator presets, and build sheets across phone, tablet, and shop laptop.",               priority: 0.6 },
  { path: "/me",                title: "Dashboard",                                                  description: "Your engine-building hub: favorites, recents, saved presets, builds, and defaults.",                                                                   noindex: true },
  { path: "/settings",          title: "Settings",                                                   description: "Manage your display name, default units, and default engine platform.",                                                                                noindex: true },
  // The body CloudFront serves for every real 404 (and S3 403), with a 404
  // status — see the distribution's custom error responses. Also written to
  // /404.html at the root, because CloudFront fetches the error page by key.
  { path: "/404",               title: "Page Not Found",                                             description: "That address does not exist on Engine-build.com. It may have a typo or the page may have moved. Start again from the calculators, engine specs or guides.", noindex: true },
];

// Category landing pages
const CATEGORY_PAGES = [
  { path: "/calculators/short-block",     category: "short-block",     title: "Short Block & Bottom End Calculators",   description: "Displacement, compression ratio, ring gap, bearing clearance, piston speed, rod ratio and deck height calculators for the bottom end of your build." },
  { path: "/calculators/cam-valvetrain",  category: "cam-valvetrain",  title: "Cam, Valvetrain and Cylinder Head Calculators", description: "Cam timing, valve springs, pushrod length, piston-to-valve clearance, degreeing, head flow and head milling calculators." },
  { path: "/calculators/power-fuel",      category: "power-fuel",      title: "Power, Fuel & Forced Induction Calculators", description: "HP estimation, AFR and lambda, carburetor and injector sizing, turbo matching and boost analysis. Free tools for NA, turbo and supercharged builds." },
  { path: "/calculators/drivetrain-shop", category: "drivetrain-shop", title: "Drivetrain & Shop Tool Calculators",     description: "Gear ratio, torque wrench correction, precision conversion, thread and tap drill sizing, and shop reference tools, with the charts on the page." },
  { path: "/calculators/diesel",          category: "diesel",          title: "Diesel Engine Calculators",              description: "Single and compound turbo sizing, lift pump selection, EGT safety, nozzle sizing, smoke/lambda, and valve relief for Cummins, Duramax, Powerstroke." },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function pickRelated(cat, currentSlug, n = 3) {
  return CALCS.filter((c) => c.category === cat && c.slug !== currentSlug).slice(0, n);
}

function breadcrumbHtml(crumbs) {
  return crumbs
    .map((c, i) =>
      i === crumbs.length - 1
        ? `<span aria-current="page">${escapeHtml(c.label)}</span>`
        : `<a href="${c.href}">${escapeHtml(c.label)}</a>`
    )
    .join(' <span aria-hidden="true">›</span> ');
}

function breadcrumbJsonLd(crumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.href ? `${SITE}${c.href}` : undefined,
    })),
  };
}

function calcAppJsonLd({ title, description, path }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: title,
    url: `${SITE}${path}`,
    description,
    applicationCategory: "EngineeringApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

// Build a route entry for a calculator
async function calcEntry(c) {
  const cat = CATEGORIES[c.category];
  const related = pickRelated(c.category, c.slug);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Calculators", href: "/calculators" },
    { label: cat.label, href: cat.href },
    { label: c.title },
  ];
  const content = await loadCalcContent(c.slug);
  const longContentHtml = renderContentHtml(content);
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(c.title)}</h1>
      <p>${escapeHtml(c.description)}</p>
      ${related.length > 0 ? `
      <h2>Related calculators</h2>
      <ul>
        ${related.map((r) => `<li><a href="/calculators/${r.slug}">${escapeHtml(r.title)}</a></li>`).join("\n        ")}
      </ul>` : ""}
      <p><a href="/calculators">← All Engine Builder Calculators</a></p>${longContentHtml}`;
  return {
    path: `/calculators/${c.slug}`,
    title: c.title,
    description: c.description,
    seoBlock,
    jsonLd: [calcAppJsonLd({ title: c.title, description: c.description, path: `/calculators/${c.slug}` }), breadcrumbJsonLd(crumbs)],
    priority: 0.8,
    changefreq: "monthly",
    hasLongContent: !!content,
  };
}

function categoryEntry(cp) {
  const cat = CATEGORIES[cp.category];
  const calcs = CALCS.filter((c) => c.category === cp.category);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Calculators", href: "/calculators" },
    { label: cat.label },
  ];
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(cp.title)}</h1>
      <p>${escapeHtml(cp.description)}</p>
      <h2>Calculators in this category</h2>
      <ul>
        ${calcs.map((c) => `<li><a href="/calculators/${c.slug}">${escapeHtml(c.title)}</a> — ${escapeHtml(c.description)}</li>`).join("\n        ")}
      </ul>
      <p><a href="/calculators">← All Engine Builder Calculators</a></p>`;
  return {
    path: cp.path,
    title: cp.title,
    description: cp.description,
    seoBlock,
    jsonLd: [breadcrumbJsonLd(crumbs)],
    priority: 0.8,
    changefreq: "weekly",
  };
}

// Extra prerendered body for pages whose substance is client-side or, in the
// case of /build-advisor, inside an iframe. Both are top-level URLs, which is
// what Bing has crawled so far, and both were shipping under 40 words.
const STATIC_EXTRA = {
  "/cam-guide": () => `
      <p>${escapeHtml(CAM_GUIDE.intro)}</p>
      <h2>Understanding cam specs</h2>
      <dl>${CAM_GUIDE.terms.map((t) => `<dt><strong>${escapeHtml(t.term)}</strong></dt><dd>${escapeHtml(t.def)}</dd>`).join("")}</dl>
      <h2>Tools on this page</h2>
      ${CAM_GUIDE.tools.map((t) => `<h3>${escapeHtml(t.heading)}</h3><p>${escapeHtml(t.body)}</p>`).join("")}
      <p><a href="/calculators/cam-selector">Camshaft Selector</a> matches your combination against a database of real manufacturer grinds. <a href="/cams">Browse camshaft specs by manufacturer</a>.</p>`,

  // The advisor itself is an iframe, so none of its content is attributed to
  // this URL. Without a block here the page is a title and one sentence.
  "/build-advisor": () => `
      <p>Set a horsepower target, pick a platform, and adjust heads, cam, intake, compression and induction with live sliders to see what the combination is estimated to make. The advisor flags combinations that do not hold together — a cam that needs more compression than you have, a head that is the limiting factor, an intake mismatched to the RPM range.</p>
      <h2>What it estimates</h2>
      <ul>
        <li>Peak horsepower and torque for the combination, with the RPM they arrive at</li>
        <li>Whether each component is a limiter or has headroom left</li>
        <li>Static and dynamic compression, and the octane that implies</li>
        <li>Warnings where two choices contradict each other</li>
      </ul>
      <h2>Related tools</h2>
      <ul>
        <li><a href="/calculators/hp-estimator">HP and torque estimator</a> — power from component specs</li>
        <li><a href="/calculators/compression-ratio">Compression ratio calculator</a> — static and dynamic CR</li>
        <li><a href="/calculators/cam-selector">Camshaft selector</a> — match a grind to the build</li>
        <li><a href="/calculators/head-flow">Cylinder head flow calculator</a> — CFM to horsepower</li>
        <li><a href="/engines">Engine specs database</a> — bore, stroke and compression for 1,472 engines</li>
      </ul>`,

  // It is a normal prerendered page, so it still loads the app bundle. A
  // client-side route missing from the CloudFront function's allow-list
  // therefore degrades to "works for humans, 404 for crawlers" — the router
  // still renders the right page — rather than to a blank screen.
  "/404": () => `
      <p>Check the address for a typo. If you followed a link here, the page has moved or been retired. The main sections:</p>
      <ul>
        <li><a href="/calculators">Engine calculators</a> — compression ratio, displacement, ring gap, cam selection and 45 more</li>
        <li><a href="/engines">Engine specs</a> — bore, stroke, displacement and compression for 1,472 engines</li>
        <li><a href="/cams">Camshaft specs</a> — duration, lift and LSA for 81 grinds</li>
        <li><a href="/guides">Guides</a> — bearing clearance, ring gap, degreeing a cam, break-in</li>
      </ul>`,
};

function staticEntry(sp) {
  const crumbs = sp.path === "/"
    ? [{ label: "Home" }]
    : [{ label: "Home", href: "/" }, { label: sp.title }];
  const extra = STATIC_EXTRA[sp.path]?.() ?? "";
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(sp.title)}</h1>
      <p>${escapeHtml(sp.description)}</p>${extra}`;
  return {
    path: sp.path,
    title: sp.title,
    description: sp.description,
    seoBlock,
    jsonLd: sp.path === "/" ? [] : [breadcrumbJsonLd(crumbs)],
    noindex: sp.noindex === true,
    priority: sp.priority,
  };
}

// ---------------------------------------------------------------------------
// Engine spec database entries
//
// The dataset was already in the repo but reached search as nothing: /specs/*
// had no route, so those URLs fell through to the SPA shell and Googlebot got
// the homepage title on every one of them. These entries give each engine,
// family and manufacturer real indexable HTML built from the same data the
// React pages render, via scripts/engineData.mjs.
//
// Torque specs are deliberately not emitted here — that dataset is on hold.
// ---------------------------------------------------------------------------


const fmtIn = (v) => (v == null ? null : `${v}"`);

function specRows(rows) {
  const body = rows
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<tr><th style="text-align:left;padding:4px 12px 4px 0;font-weight:400;color:#666;">${escapeHtml(k)}</th><td style="padding:4px 0;">${escapeHtml(String(v))}</td></tr>`)
    .join("");
  return body ? `<table>${body}</table>` : "";
}

function engineEntry(e) {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Engines", href: "/engines" },
    { label: e.manufacturerName, href: e.manufacturerUrl },
    { label: e.familyName, href: e.familyUrl },
    { label: e.displayName },
  ];

  const title = `${e.seoTitle ?? `${e.manufacturerName} ${e.displayName}`} Specs`;
  const descBits = [];
  if (e.displacement_ci != null) descBits.push(`${e.displacement_ci} ci${e.displacement_l != null ? ` (${e.displacement_l}L)` : ""}`);
  if (e.num_cylinders != null) descBits.push(`${e.num_cylinders}-cylinder`);
  if (e.bore_in != null && e.stroke_in != null) descBits.push(`${e.bore_in}" bore x ${e.stroke_in}" stroke`);
  if (e.compression_ratio != null) descBits.push(`${e.compression_ratio}:1 compression`);
  // Bing flagged 209 descriptions as too short. The spec list alone runs 90-100
  // characters on engines with few populated fields, so append what else the
  // page actually carries rather than padding it with adjectives.
  const extraBits = [];
  if (e.rod_ratio != null) extraBits.push(`${e.rod_ratio} rod ratio`);
  if (e.head?.head_cc != null) extraBits.push(`${e.head.head_cc}cc chambers`);
  if (e.head?.intake_valve_dia != null) extraBits.push(`${e.head.intake_valve_dia}" intake valves`);
  if (e.hpMin != null) extraBits.push(e.hpMin === e.hpMax ? `${e.hpMin} hp` : `${e.hpMin}-${e.hpMax} hp`);
  // The <title> already solved this: seoTitle strips the geometry suffix that
  // displayName carries ("Acura Honda B-series . 3.189" x 3.433" . 10:1") and
  // does not repeat the manufacturer. The description was still built from
  // displayName, so 444 of 1,472 engine pages stated bore, stroke and
  // compression twice and 298 named the manufacturer twice - in the one line a
  // searcher reads before deciding whether to click. The trailing compression
  // ratio goes too, because descBits states it again a few words later.
  const descName = (e.seoTitle ?? `${e.manufacturerName} ${e.displayName}`)
    .replace(/\s+\d+(?:\.\d+)?:1$/, "")
    .trim();
  const description = clampDesc([
    `${descName} engine specs: ${descBits.join(", ")}.`,
    // Shorter phrasings for each tail slot. Two inch marks cost ten characters
    // once escaped, so on a spec-heavy engine the long form will not fit and
    // without an alternative the slot is dropped whole.
    extraBits.length
      ? [`Plus ${extraBits.slice(0, 2).join(" and ")}.`, `Plus ${extraBits[0]}.`]
      : "",
    ["With piston speed and rod ratio worked out.",
     "With piston speed and rod ratio.",
     "With rod ratio worked out."],
  ]);

  const variantsHtml = e.variantCount > 1
    ? `<h2>Variants sharing these dimensions (${e.variantCount})</h2>
      <p>These records share identical bore, stroke, displacement and compression. They differ by model year and factory power rating.</p>
      <table><tr><th>Year</th><th>Advertised HP</th><th>Code</th></tr>${
        e.variants.map((v) => `<tr><td>${v.year ?? "—"}</td><td>${v.hp != null ? `${v.hp} hp` : "—"}</td><td>${escapeHtml(v.codes.join(", ") || "—")}</td></tr>`).join("")
      }</table>`
    : "";

  const vehiclesHtml = e.vehicles.length
    ? `<h2>Vehicles (${e.vehicles.length})</h2><ul>${
        e.vehicles.map((v) => `<li>${escapeHtml(v.name)}${v.year_start ? ` (${v.year_start}${v.year_end ? `–${v.year_end}` : "+"})` : ""}</li>`).join("")
      }</ul>`
    : "";

  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <h2>Dimensions</h2>
      ${specRows([
        ["Displacement", e.displacement_ci != null ? `${e.displacement_ci} ci${e.displacement_l != null ? ` / ${e.displacement_l} L` : ""}` : null],
        ["Bore", fmtIn(e.bore_in)],
        ["Stroke", fmtIn(e.stroke_in)],
        ["Cylinders", e.num_cylinders],
        ["Configuration", e.configuration],
        ["Compression ratio", e.compression_ratio != null ? `${e.compression_ratio}:1` : null],
        ["Rod length", fmtIn(e.rod_length_in)],
        ["Rod ratio", e.rod_ratio],
        ["Bore/stroke ratio", e.boreStrokeRatio],
        ["Deck height", fmtIn(e.deck_height_in)],
        ["Piston deck clearance", fmtIn(e.piston_deck_clearance)],
      ])}
      <h2>Construction</h2>
      ${specRows([
        ["Block material", e.block_material],
        ["Head material", e.head_material],
        ["Valvetrain", e.valvetrain],
        ["Valves per cylinder", e.valves_per_cylinder],
        ["Cam type", e.cam_type],
        ["Induction", e.induction],
        ["Fuel type", e.fuel_type],
        ["Firing order", e.firing_order],
        ["Advertised HP", e.hpMin != null ? (e.hpMin === e.hpMax ? `${e.hpMin} hp` : `${e.hpMin}–${e.hpMax} hp`) : null],
        ["Years", e.yearMin != null ? (e.yearMin === e.yearMax ? e.yearMin : `${e.yearMin}–${e.yearMax}`) : null],
        ["Oil capacity", e.oil_capacity_qt != null ? `${e.oil_capacity_qt} qt` : null],
        ["Coolant capacity", e.coolant_capacity_qt != null ? `${e.coolant_capacity_qt} qt` : null],
      ])}
      ${e.derived?.length ? `<h2>What these numbers mean</h2>
      ${specRows(e.derived.map((d) => [d.label, d.value]))}` : ""}
      ${e.head ? `<h2>Cylinder head</h2>
      ${specRows([
        ["Intake valve diameter", fmtIn(e.head.intake_valve_dia)],
        ["Exhaust valve diameter", fmtIn(e.head.exhaust_valve_dia)],
        ["Chamber volume", e.head.head_cc != null ? `${e.head.head_cc} cc` : null],
        ["Rocker ratio", e.head.rocker_ratio != null ? `${e.head.rocker_ratio}:1` : null],
        ["Lifter type", e.head.lifter_type],
      ])}` : ""}
      ${e.calcLinks?.length ? `<h2>Run the numbers for this engine</h2>
      <p>Each link opens the calculator with this engine's specs already filled in.</p>
      <ul>${e.calcLinks.map((c) => `<li><a href="${c.href}">${escapeHtml(c.label)}</a></li>`).join("")}</ul>` : ""}
      ${variantsHtml}
      ${vehiclesHtml}
      ${e.relatedEngines?.length ? `<h2>Similar engines</h2>
      <ul>${e.relatedEngines.map((r) => `<li><a href="${r.url}">${escapeHtml(r.manufacturerName + " " + r.displayName)}</a>${r.displacement_ci != null ? ` — ${r.displacement_ci} ci` : ""}</li>`).join("")}</ul>` : ""}
      ${e.sources?.length ? `<p>Source: ${escapeHtml(e.sources.join(", "))} — <a href="https://www.nhra.net/tech_specs/engine/blueprints/">nhra.net blueprints</a></p>` : ""}
      <p><a href="${e.familyUrl}">← All ${escapeHtml(e.familyName)} engines</a></p>`;

  return {
    path: e.url,
    title,
    description,
    seoBlock,
    jsonLd: [breadcrumbJsonLd(crumbs)],
    priority: 0.6,
    changefreq: "yearly",
  };
}

function engineFamilyEntry(fam) {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Engines", href: "/engines" },
    { label: fam.manufacturerName, href: fam.manufacturerUrl },
    { label: fam.familyName },
  ];
  // NHRA-created families are named "<Manufacturer> <displacement>ci", so
  // prepending the manufacturer again produced "American Motors American
  // Motors 195ci Engine Specs".
  const famTitleBase = fam.familyName.toLowerCase().startsWith(fam.manufacturerName.toLowerCase())
    ? fam.familyName
    : `${fam.manufacturerName} ${fam.familyName}`;
  // 65-char budget, 19 of it the site suffix. Drop a trailing parenthetical
  // before anything else — "(194/230/250/292)" is the least load-bearing part
  // of "GMC Chevy Straight-6 (194/230/250/292)".
  const title = (() => {
    const full = `${famTitleBase} Engine Specs`;
    if (encodedLength(full) <= 46) return full;
    const trimmed = `${famTitleBase.replace(/\s*\([^)]*\)\s*$/, "").trim()} Engine Specs`;
    if (encodedLength(trimmed) <= 46) return trimmed;
    return `${famTitleBase.replace(/\s*\([^)]*\)\s*$/, "").trim()} Specs`;
  })();
  // 193 families hold a single engine, so "all 1 engines, compared side by side"
  // needs a different sentence rather than a plural hack.
  const one = fam.engines.length === 1;
  const description = familyDescription(fam);

  const rows = fam.engines
    .map((e) => `<tr><td><a href="${e.url}">${escapeHtml(e.displayName)}</a></td><td>${e.displacement_ci != null ? `${e.displacement_ci} ci` : "—"}</td><td>${e.bore_in != null && e.stroke_in != null ? `${e.bore_in}&quot; × ${e.stroke_in}&quot;` : "—"}</td><td>${e.compression_ratio != null ? `${e.compression_ratio}:1` : "—"}</td><td>${e.hpMin != null ? (e.hpMin === e.hpMax ? e.hpMin : `${e.hpMin}–${e.hpMax}`) : "—"}</td></tr>`)
    .join("");

  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      ${fam.context?.facts?.length ? `<h2>At a glance</h2>
      ${specRows(fam.context.facts)}` : ""}
      <h2>${fam.engines.length === 1 ? "This engine" : "Engines in this family"}</h2>
      <table>
        <tr><th>Engine</th><th>Displacement</th><th>Bore × Stroke</th><th>CR</th><th>HP</th></tr>
        ${rows}
      </table>
      ${fam.context?.notes?.length ? `<h2>What varies across the family</h2>
      ${fam.context.notes.map((n) => `<p>${escapeHtml(n)}</p>`).join("")}` : ""}
      <p>Each engine page carries rod ratio, mean piston speed, bore/stroke character and cylinder head specs where published, and links into the calculators with its dimensions already filled in.</p>
      <p><a href="${fam.manufacturerUrl}">← All ${escapeHtml(fam.manufacturerName)} engines</a></p>`;

  return {
    path: fam.url,
    title,
    description,
    seoBlock,
    jsonLd: [breadcrumbJsonLd(crumbs)],
    priority: 0.7,
    changefreq: "monthly",
  };
}

function manufacturerEntry(m) {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Engines", href: "/engines" },
    { label: m.name },
  ];
  const title = `${m.name} Engine Specs`;
  const description = manufacturerDescription(m);
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      ${(() => {
        const all = m.families.flatMap((f) => f.engines);
        const disp = all.map((e) => e.displacement_ci).filter((v) => v != null);
        const cyl = [...new Set(all.map((e) => e.num_cylinders).filter((v) => v != null))].sort((a, b) => a - b);
        const yrs = [...all.map((e) => e.yearMin), ...all.map((e) => e.yearMax)].filter(Boolean);
        const r = [];
        if (disp.length) r.push(["Displacement range", `${Math.min(...disp)}-${Math.max(...disp)} ci`]);
        if (cyl.length) r.push(["Cylinder counts", cyl.join(", ")]);
        if (yrs.length) r.push(["Years covered", `${Math.min(...yrs)}-${Math.max(...yrs)}`]);
        r.push(["Families", String(m.families.length)], ["Engines", String(m.engineCount)]);
        const wh = all.filter((e) => e.head).length;
        if (wh) r.push(["With cylinder head data", `${wh} engines`]);
        return `<h2>At a glance</h2>${specRows(r)}`;
      })()}
      <h2>Engine families</h2>
      <ul>
        ${m.families.map((f) => `<li><a href="${f.url}">${escapeHtml(f.familyName)}</a> — ${f.engines.length} engine${f.engines.length === 1 ? "" : "s"}</li>`).join("\n        ")}
      </ul>
            <p>Every engine page lists bore, stroke, displacement, compression and rod ratio, with mean piston speed and bore/stroke character worked out, plus cylinder head specs where published. Each links into the calculators with its own dimensions filled in.</p>
      <p><a href="/engines">← All engine manufacturers</a></p>`;
  return {
    path: m.url,
    title,
    description,
    seoBlock,
    jsonLd: [breadcrumbJsonLd(crumbs)],
    priority: 0.7,
    changefreq: "monthly",
  };
}

function enginesIndexEntry(manufacturers) {
  const crumbs = [{ label: "Home", href: "/" }, { label: "Engines" }];
  const totalEngines = manufacturers.reduce((n, m) => n + m.engineCount, 0);
  const totalFamilies = manufacturers.reduce((n, m) => n + m.families.length, 0);
  const title = "Engine Specs Database";
  const description = `Bore, stroke, displacement, compression and rod ratio for ${totalEngines} engines across ${manufacturers.length} manufacturers. Free reference for engine builders.`;
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <p>${totalEngines} engines · ${totalFamilies} families · ${manufacturers.length} manufacturers</p>
      <ul>
        ${manufacturers.map((m) => `<li><a href="${m.url}">${escapeHtml(m.name)}</a> — ${m.engineCount} engines</li>`).join("\n        ")}
      </ul>`;
  return {
    path: "/engines",
    title,
    description,
    seoBlock,
    jsonLd: [breadcrumbJsonLd(crumbs)],
    priority: 0.9,
    changefreq: "monthly",
  };
}


// ---------------------------------------------------------------------------
// Camshaft database entries
// ---------------------------------------------------------------------------

function camEntry(c) {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Camshafts", href: "/cams" },
    { label: c.mfr, href: c.mfrUrl },
    { label: c.family },
  ];
  // Budget: 65 chars total, and " | Engine-build.com" costs 19. Drop the word
  // "Cam" first, then trim the family — never the manufacturer or part, which
  // are what people search.
  const title = (() => {
    const full = `${c.mfr} ${c.family} Cam Specs`;
    if (encodedLength(full) <= 46) return full;
    const short = `${c.mfr} ${c.family} Specs`;
    if (encodedLength(short) <= 46) return short;
    // Trim at a boundary, never mid-token: drop a trailing parenthetical first
    // ("Stage 2 NA V2 (LS1/LS2)" -> "Stage 2 NA V2"), then whole words.
    let fam = c.family.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (`${c.mfr} ${fam} Specs`.length <= 46) return `${c.mfr} ${fam} Specs`;
    const words = fam.split(/\s+/);
    while (words.length > 1 && `${c.mfr} ${words.join(" ")} Specs`.length > 46) words.pop();
    return `${c.mfr} ${words.join(" ")} Specs`;
  })();
  const description = clampDesc([
    `${c.part} — ${c.int050}${c.exh050 != null ? `/${c.exh050}` : ""} duration at 0.050", ${c.liftInt}"/${c.liftExh}" lift, ${c.lsa} LSA.`,
    `${c.platformLabel}, ${c.lifterLabel.toLowerCase()}.`,
    c.rpmLo != null && c.rpmHi != null ? `${c.rpmLo}-${c.rpmHi} RPM.` : "",
    c.use ? `${c.use}.` : "",
  ]);

  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <h2>Specifications</h2>
      ${specRows([
        ["Part number", c.part],
        ["Duration at 0.050 intake", `${c.int050}&deg;`],
        ["Duration at 0.050 exhaust", c.exh050 != null ? `${c.exh050}&deg;` : "Not published"],
        ["Valve lift intake", `${c.liftInt}"`],
        ["Valve lift exhaust", `${c.liftExh}"`],
        ["Lobe separation angle", `${c.lsa}&deg;`],
        ["Published RPM range", c.rpmLo != null && c.rpmHi != null ? `${c.rpmLo}-${c.rpmHi} RPM` : "Not published"],
        ["Lifter type", c.lifterLabel],
        ["Platform", c.platformLabel],
        ["Intended use", c.use],
      ])}
      ${c.similar?.length ? `<h2>Similar grinds for ${escapeHtml(c.platformLabel)}</h2>
      <ul>${c.similar.map((s) => `<li><a href="${s.url}">${escapeHtml(`${s.mfr} ${s.family}`)}</a> — ${s.part}, ${s.int050}&deg; at 0.050", ${s.lsa}&deg; LSA</li>`).join("")}</ul>` : ""}
      <p><a href="${c.mfrUrl}">&larr; All ${escapeHtml(c.mfr)} camshafts</a></p>`;

  return { path: c.url, title, description, seoBlock, jsonLd: [breadcrumbJsonLd(crumbs)], priority: 0.6, changefreq: "yearly" };
}

function camMfrEntry(m) {
  const crumbs = [{ label: "Home", href: "/" }, { label: "Camshafts", href: "/cams" }, { label: m.name }];
  const title = `${m.name} Camshaft Specs`;
  const description = clampDesc([
    `Duration at 0.050", lift, LSA and RPM range for ${m.cams.length} ${m.name} camshaft grind${m.cams.length === 1 ? "" : "s"}, with part numbers.`,
    ["Compare each against similar grinds on the same platform, free and with no signup.",
     "Compare each against similar grinds on the same platform.",
     "Compare against similar grinds on the same platform.",
     "Free reference, no signup."],
  ]);
  const rows = m.cams.map((c) => `<tr><td><a href="${c.url}">${escapeHtml(c.family)}</a></td><td>${escapeHtml(c.part)}</td><td>${escapeHtml(c.platformLabel)}</td><td>${c.int050}${c.exh050 != null ? `/${c.exh050}` : ""}</td><td>${c.lsa}</td></tr>`).join("");
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <table><tr><th>Cam</th><th>Part</th><th>Platform</th><th>Dur @.050</th><th>LSA</th></tr>${rows}</table>
      <p><a href="/cams">&larr; All camshaft manufacturers</a></p>`;
  return { path: m.url, title, description, seoBlock, jsonLd: [breadcrumbJsonLd(crumbs)], priority: 0.7, changefreq: "monthly" };
}

function camsIndexEntry(cams, manufacturers) {
  const crumbs = [{ label: "Home", href: "/" }, { label: "Camshafts" }];
  const title = "Camshaft Specs Database";
  const description = clampDesc([
    `Duration at 0.050", lift, LSA and RPM range for ${cams.length} camshaft grinds across ${manufacturers.length} manufacturers.`,
    ["Part numbers included, with similar grinds cross-linked on each page.",
     "Part numbers included, with similar grinds cross-linked.",
     "Part numbers included."],
  ]);
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      ${(() => {
        const d = cams.map((c) => c.int050).filter((v) => v != null);
        const l = cams.map((c) => c.lsa).filter((v) => v != null);
        const lift = cams.map((c) => c.liftInt).filter((v) => v != null);
        const plats = [...new Set(cams.map((c) => c.platformLabel))];
        const lifters = [...new Set(cams.map((c) => c.lifterLabel))];
        const r = [];
        if (d.length) r.push(["Duration at 0.050\"", `${Math.min(...d)}-${Math.max(...d)}°`]);
        if (lift.length) r.push(["Valve lift", `${Math.min(...lift)}"-${Math.max(...lift)}"`]);
        if (l.length) r.push(["Lobe separation", `${Math.min(...l)}-${Math.max(...l)}°`]);
        r.push(["Platforms", `${plats.length}`], ["Lifter types", lifters.join(", ")]);
        return `<h2>At a glance</h2>${specRows(r)}`;
      })()}
      <h2>By manufacturer</h2>
      <ul>
        ${manufacturers.map((m) => `<li><a href="${m.url}">${escapeHtml(m.name)}</a> — ${m.cams.length} grinds</li>`).join("")}
      </ul>
      <h2>Platforms covered</h2>
      <p>${escapeHtml([...new Set(cams.map((c) => c.platformLabel))].sort().join(", "))}.</p>
      <p>Every grind lists duration at 0.050" for both intake and exhaust, valve lift, lobe separation angle and the manufacturer's published RPM range, with the nearest alternatives on the same platform for comparison. Duration at 0.050" is the only figure comparable between brands — advertised duration is measured at different lift points by different makers.</p>
      <p><a href="/calculators/cam-selector">Match a cam to your build</a> or read the <a href="/cam-guide">camshaft selection guide</a>.</p>`;
  return { path: "/cams", title, description, seoBlock, jsonLd: [breadcrumbJsonLd(crumbs)], priority: 0.9, changefreq: "monthly" };
}

// ---------------------------------------------------------------------------
// Guides + FAQ entries
// ---------------------------------------------------------------------------

function guidesIndexEntry() {
  const crumbs = [{ label: "Home", href: "/" }, { label: "Guides" }];
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>Engine Building Guides</h1>
      <p>Step-by-step walkthroughs of the procedures every builder needs to get right.</p>
      <ul>
        ${GUIDES.map((g) => `<li><a href="/guides/${g.slug}">${escapeHtml(g.title)}</a> — ${escapeHtml(g.description)}</li>`).join("\n        ")}
      </ul>`;
  return {
    path: "/guides",
    title: "Engine Building Guides",
    description: "Step-by-step engine building tutorials — ring gap, cam degreeing, piston-to-valve, bearing clearance, turbo sizing, blueprinting, and more.",
    seoBlock,
    jsonLd: [breadcrumbJsonLd(crumbs)],
    priority: 0.9,
    changefreq: "monthly",
  };
}

async function guideEntry(g) {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: g.title },
  ];
  // Prefer the full long-form body. The manifest steps[] are a condensed
  // summary written for HowTo schema — emitting them as the page body was
  // shipping ~260 words of a 600-900 word guide to the crawler. They remain the
  // fallback for any guide that has no content file yet.
  const content = await loadGuideContent(g.slug);
  const bodyHtml = content
    ? renderGuideContentHtml(content)
    : (g.steps ?? []).map((s, i) => `
        <h3>Step ${i + 1}: ${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.text)}</p>`).join("");
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(g.title)}</h1>
      <p>${escapeHtml(g.description)}</p>
      ${g.totalTime ? `<p><strong>Time:</strong> ${escapeHtml(g.totalTime)}</p>` : ""}${bodyHtml}`;

  const jsonLd = [breadcrumbJsonLd(crumbs)];
  // HowTo schema only if the manifest provides steps[].
  if (g.steps?.length) {
    const iso = toIsoDuration(g.totalTime);
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: g.title,
      description: g.description,
      url: `${SITE}/guides/${g.slug}`,
      ...(iso ? { totalTime: iso } : {}),
      step: g.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.name,
        text: stripHtml(s.text),
        url: `${SITE}/guides/${g.slug}#step-${i + 1}`,
      })),
    });
  }
  return {
    path: `/guides/${g.slug}`,
    title: g.title,
    description: g.description,
    seoBlock,
    jsonLd,
    priority: 0.8,
    changefreq: "monthly",
  };
}

function faqEntry() {
  const crumbs = [{ label: "Home", href: "/" }, { label: "FAQ" }];
  const questionsHtml = FAQ.map((q) => `
        <h3>${escapeHtml(q.question)}</h3>
        <p>${stripHtml(q.answer)}</p>`).join("");
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>Engine Building FAQ</h1>
      <p>Common questions about compression ratio, ring gap, turbo sizing, diesel tuning, and more — answered briefly and clearly.</p>
      ${questionsHtml}`;
  return {
    path: "/faq",
    title: "Engine Building FAQ",
    description: "Common engine builder questions on compression ratio, ring gap, turbo sizing, diesel tuning, head bolts, and more — short answers, no fluff.",
    seoBlock,
    jsonLd: [
      breadcrumbJsonLd(crumbs),
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: stripHtml(q.answer),
          },
        })),
      },
    ],
    priority: 0.8,
    changefreq: "monthly",
  };
}

// ---------------------------------------------------------------------------
// Per-route HTML generation
// ---------------------------------------------------------------------------

function generateHtml(template, entry) {
  const { path, title, description, seoBlock, jsonLd = [], noindex = false } = entry;
  const fullTitle = path === "/" ? `${title} | ${SITE_NAME}` : `${title} | ${SITE_NAME}`;
  const canonical = `${SITE}${path}`;

  let html = template;

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);

  // <meta name="robots"> — flip to noindex,follow for auth-gated/private pages
  // so Google doesn't index them even if it finds them via a link.
  if (noindex) {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="noindex, follow" />`
    );
  }

  // <meta name="description">
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  // <link rel="canonical">
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );

  // OG tags
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`
  );

  // Twitter tags
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );

  // Inject per-page JSON-LD blocks before </head>
  if (jsonLd.length > 0) {
    const jsonLdHtml = jsonLd
      .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
      .join("\n    ");
    html = html.replace("</head>", `    ${jsonLdHtml}\n  </head>`);
  }

  // Replace contents of <div id="root">...</div> with per-route SEO block.
  // The source index.html ships with homepage-flavored SEO content here; we
  // overwrite that for non-homepage routes. React's createRoot.render() wipes
  // #root on mount, so this content disappears instantly on hydration.
  // Regex is anchored on </body> to handle nested divs inside #root.
  const seoContainer = `<div id="seo-prerender" style="max-width:1200px;margin:0 auto;padding:24px;font-family:Inter,system-ui,sans-serif;color:#1a1a1a;">${seoBlock}\n    </div>`;
  html = html.replace(
    /<div\s+id="root">[\s\S]*?<\/div>\s*<\/body>/,
    `<div id="root">${seoContainer}</div>\n  </body>`
  );

  return html;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// sitemap.xml generation
// ---------------------------------------------------------------------------

function generateSitemap(entries) {
  const today = new Date().toISOString().slice(0, 10);
  const indexable = entries.filter((e) => !e.noindex);
  // Homepage is excluded from STATIC_PAGES so add it explicitly with priority 1.0
  const all = [
    { path: "/", priority: 1.0, changefreq: "weekly" },
    ...indexable,
  ];
  const urls = all.map((e) => {
    const loc = `${SITE}${e.path}`;
    const priority = (e.priority ?? 0.7).toFixed(1);
    const changefreq = e.changefreq ?? "monthly";
    return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const templatePath = resolve(DIST, "index.html");
  const template = await readFile(templatePath, "utf8");

  // Engine spec database: build the route set and the runtime JSON the React
  // pages fetch, from one pass over public/data/engines/.
  const engineData = loadEngineData();
  writeRuntimeData(engineData);
  const camData = loadCams();
  writeCamRuntime(camData);

  const allEntries = [
    ...STATIC_PAGES.map(staticEntry),
    enginesIndexEntry(engineData.manufacturers),
    ...engineData.manufacturers.map(manufacturerEntry),
    ...engineData.families.map(engineFamilyEntry),
    ...engineData.engines.map(engineEntry),
    camsIndexEntry(camData.cams, camData.manufacturers),
    ...camData.manufacturers.map(camMfrEntry),
    ...camData.cams.map(camEntry),
    ...CATEGORY_PAGES.map(categoryEntry),
    ...(await Promise.all(CALCS.map(calcEntry))),
    guidesIndexEntry(),
    ...(await Promise.all(GUIDES.map(guideEntry))),
    faqEntry(),
  ];

  let written = 0;
  for (const entry of allEntries) {
    const html = generateHtml(template, entry);
    // "/" → dist/public/index.html, "/foo" → dist/public/foo/index.html
    const outDir = entry.path === "/" ? DIST : resolve(DIST, entry.path.replace(/^\//, ""));
    const outFile = resolve(outDir, "index.html");
    await mkdir(outDir, { recursive: true });
    await writeFile(outFile, html, "utf8");
    // CloudFront fetches its custom error page by object key, so the
    // not-found page also lives at the root as /404.html.
    if (entry.path === "/404") await writeFile(resolve(DIST, "404.html"), html, "utf8");
    written++;
  }

  // Generate sitemap.xml from the same manifest so it never drifts.
  const sitemap = generateSitemap(allEntries);
  await writeFile(resolve(DIST, "sitemap.xml"), sitemap, "utf8");
  const indexableCount = allEntries.filter((e) => !e.noindex).length + 1; // +1 for homepage

  const withLongContent = allEntries.filter((e) => e.hasLongContent).length;
  console.log(`prerender: cam DB — ${camData.cams.length} cams, ${camData.manufacturers.length} manufacturers`);
  console.log(`prerender: engine DB — ${engineData.engines.length} engines, ${engineData.families.length} families, ${engineData.manufacturers.length} manufacturers`);
  console.log(`prerender: wrote ${written} HTML files (${CALCS.length} calculators, ${CATEGORY_PAGES.length} categories, ${STATIC_PAGES.length} static, ${GUIDES.length} guides, 1 FAQ)`);
  console.log(`prerender: ${withLongContent} / ${CALCS.length} calculators have long-form content`);
  console.log(`prerender: wrote sitemap.xml with ${indexableCount} URLs (noindex excluded)`);
}

main().catch((err) => {
  console.error("prerender failed:", err);
  process.exit(1);
});
