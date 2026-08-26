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
import FAQ from "../src/data/faq.mjs";
import { loadEngineData, writeRuntimeData } from "./engineData.mjs";

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
  { slug: "displacement",                  category: "short-block",     title: "Engine Displacement Calculator — Bore × Stroke to Cubic Inches, CC & Liters", description: "Free engine displacement calculator with 30+ engine specs table (SBC, LS, BBC, Ford, Mopar, Coyote, Cummins), 20 popular stroker combos with displacement gain, and overbore effect chart. Cubic inches ↔ liters ↔ cc conversions." },
  { slug: "compression-ratio",             category: "short-block",     title: "Compression Ratio Calculator — Static & Dynamic CR with Octane Chart", description: "Free engine compression ratio calculator. Static + Dynamic (DCR) with three IVC methods, cranking pressure, and reverse-solve. Includes octane requirement chart, 22 popular engines with stock CR, head gasket thickness effect, and aluminum vs iron head adjustment." },
  { slug: "ring-gap",                      category: "short-block",     title: "Piston Ring Gap Calculator (NA & Boost)",                     description: "Ring end gap for your exact bore, by application — NA, turbo, supercharged, nitrous or diesel. Per-ring targets in inches or mm, with material warnings." },
  { slug: "piston-speed",                  category: "short-block",     title: "Piston Speed Calculator",                        description: "Mean and peak piston speed in FPM with color-coded safety zones. Reference table of common engine redlines." },
  { slug: "quench-deck-height",            category: "short-block",     title: "Quench & Deck Height Calculator — Squish",                description: "Piston-to-deck clearance, quench (squish) distance and compression ratio in one pass. Compare gasket thicknesses side by side and see all three update live." },
  { slug: "rod-ratio",                     category: "short-block",     title: "Rod Ratio Calculator — Compare 11 Engines",                description: "Enter rod length and stroke for your rod ratio instantly. Visual gauge shows where your combo lands, with 11 engines from LS1 to K24A to compare against." },
  { slug: "bearing-clearance",             category: "short-block",     title: "Bearing Clearance Calculator",                   description: "Main and rod bearing oil clearance from measurements or Plastigage. Per-bearing tables and oil viscosity recommendations." },
  { slug: "intake-manifold-milling",       category: "short-block",     title: "Intake Manifold Milling Calculator",             description: "How much to mill the intake manifold after surfacing heads or decking the block. Tells you when correction is needed and how much." },
  { slug: "bolt-spec-lookup",              category: "short-block",     title: "Head Bolt & Main Bolt Spec Lookup",              description: "Look up head bolt and main bolt thread sizes, diameters, torque specs, and ARP upgrade part numbers for any engine platform." },
  { slug: "cc-ci-converter",               category: "short-block",     title: "CC to Cubic Inch Converter",                     description: "Convert chamber volumes, piston dome/dish CCs, and displacement between cubic centimeters, cubic inches, liters, and fluid ounces." },

  // ─── Cam & Valvetrain ──────────────────────────────────────────────────
  { slug: "cam-selector",                  category: "cam-valvetrain",  title: "Camshaft Selector — What Cam Do I Need? Duration, LSA & Lift Calculator", description: "Free camshaft selector: enter your engine, compression, transmission, and goal and get recommended duration @ 0.050\", lobe separation angle (LSA), and valve lift — plus real matching cams from COMP, Brian Tooley Racing, Texas Speed, Lunati, Crane, Howards, Edelbrock & Summit, estimated powerband, and idle character. Advanced mode adds ported head flow, dynamic compression, and target-RPM inputs. Uses David Vizard's LSA method." },
  { slug: "cam-duration",                  category: "cam-valvetrain",  title: "Advanced Cam Timing Calculator",                 description: "Full cam analysis — valve events, overlap, recommended LSA, dynamic compression ratio, and rocker lift table." },
  { slug: "cam-degreeing",                 category: "cam-valvetrain",  title: "Cam Degreeing Calculator",                       description: "Step-by-step cam degreeing guide with intake centerline verification, advance/retard calculation, and dial indicator math." },
  { slug: "valvetrain-builder",            category: "cam-valvetrain",  title: "Valvetrain RPM Builder",                         description: "Match cam, rockers, springs, and target RPM as a complete system. Valve float estimation, RPM safety graph, and cascade warnings." },
  { slug: "valve-spring",                  category: "cam-valvetrain",  title: "Valve Spring Calculator",                        description: "Validate valve spring specs for your cam profile. Seat pressure, open pressure, coil bind clearance, and spring rate analysis." },
  { slug: "valve-shim",                    category: "cam-valvetrain",  title: "Valve Shim Calculator",                          description: "Calculate replacement shim sizes for shim-over-bucket and shim-under-bucket valvetrains. Nearest available shim lookup." },
  { slug: "pushrod-length",                category: "cam-valvetrain",  title: "Pushrod Length Calculator",                      description: "Correct pushrod length after head milling, cam swaps, or rocker changes. Stock lengths for SBC, BBC, LS, SBF, and Hemi." },
  { slug: "piston-to-valve",               category: "cam-valvetrain",  title: "Piston-to-Valve Clearance Calculator",           description: "Kinematic P2V simulation across the overlap region. Engine platform presets, cam advance slider, and interference warnings." },
  { slug: "head-flow",                     category: "cam-valvetrain",  title: "Cylinder Head Flow / CFM to HP Calculator",      description: "Convert flow bench CFM to horsepower potential. Flow coefficient, intake/exhaust ratio, port velocity, and comparison against popular heads." },
  { slug: "head-milling",                  category: "cam-valvetrain",  title: "Head Milling Calculator",                        description: "Calculate chamber volume change, compression ratio shift, and intake manifold alignment when milling cylinder heads." },

  // ─── Power & Fuel ──────────────────────────────────────────────────────
  { slug: "hp-torque",                     category: "power-fuel",      title: "HP to Torque Calculator — Horsepower ↔ Torque at Any RPM (lb-ft, Nm, kW)", description: "Free bidirectional HP↔Torque calculator with the 5252 RPM formula explained. Includes conversion tables (100–1500 HP), stock engine peak HP/torque for 24 popular V8s / imports / diesels, HP-per-liter benchmarks, and unit conversions between lb-ft, Nm, kg·m, HP, PS, and kW." },
  { slug: "hp-estimator",                  category: "power-fuel",      title: "HP and Torque Estimator",                        description: "Estimate horsepower and torque for your build. Pick your engine, heads, cam, intake, exhaust, and compression for a data-backed estimate." },
  { slug: "afr-lambda",                    category: "power-fuel",      title: "Lambda to AFR Converter — Both Directions",                         description: "Convert lambda to AFR or AFR to lambda for pump gas, E85, E98, methanol, propane and CNG. Instant result on both the gas scale and true AFR." },
  { slug: "carb-cfm-sizing",               category: "power-fuel",      title: "Carburetor CFM Calculator",                      description: "Calculate the right carburetor size for your engine. Real carb sizes from Holley and Edelbrock with overcarburetion warnings." },
  { slug: "fuel-injector-sizing",          category: "power-fuel",      title: "Fuel Injector Sizing Calculator",                description: "What size fuel injectors do you need? Duty cycle analysis, fuel pump sizing, and real injector size matching." },
  { slug: "turbo-finder",                  category: "power-fuel",      title: "Turbo Finder & Sizing Calculator",               description: "Find the right turbocharger for your engine. Airflow, boost pressure, compressor sizing, and turbo recommendations by HP goal." },
  { slug: "boost-compression",             category: "power-fuel",      title: "Boost / Effective Compression Ratio Calculator", description: "Effective compression ratio under boost. Altitude correction, fuel-specific safety limits, and reverse-solve for max safe boost or CR." },
  { slug: "octane-mix",                    category: "power-fuel",      title: "Octane Mix Calculator — Blend 110 with 93",                          description: "Blend two fuels to hit a target octane — race gas with pump, or any E85 ratio. Shows mix percentage, resulting stoich AFR, BTU content and MPG impact." },
  { slug: "ignition-timing-curve",         category: "power-fuel",      title: "Ignition Timing Advance Curve Calculator",       description: "Visualize your ignition advance curve. Input initial, mechanical, and vacuum advance to see total timing vs RPM at WOT, part throttle, cruise." },
  { slug: "pressure-converter",            category: "power-fuel",      title: "Pressure Converter (PSI / Bar / kPa / atm / inHg)", description: "Convert between PSI, bar, kPa, atm, and inHg — for boost gauges, oil pressure, fuel rail, and vacuum measurements." },
  { slug: "an-fitting-size",               category: "power-fuel",      title: "AN Fitting Size Chart",                          description: "AN / JIC fitting dash sizes with tube OD, JIC 37° flare thread, and ORB thread. For fuel system, oil cooler, and turbo plumbing." },

  // ─── Drivetrain & Shop ─────────────────────────────────────────────────
  { slug: "gear-ratio",                    category: "drivetrain-shop", title: "Gear Ratio & Final Drive Calculator",            description: "Calculate RPM at speed for any axle ratio, tire size, and transmission. Compare gear ratios side by side." },
  { slug: "torque-extension",              category: "drivetrain-shop", title: "Torque Wrench Extension Calculator",             description: "Corrected torque wrench setting for crow's foot adapters, offset extensions, and wobble sockets." },
  { slug: "mm-inch-converter",             category: "drivetrain-shop", title: "MM to Inch Converter",                           description: "High-precision metric to imperial conversion for engine builders. Includes machinist reference tables and fractional inch equivalents." },
  { slug: "wrench-size-converter",         category: "drivetrain-shop", title: "Wrench Size Converter — SAE to Metric + Measure with Calipers", description: "Convert SAE wrench sizes to metric and back, or measure the bolt head with calipers / tape and get the right wrench from either set. Exact gap and torque-safe interchange tiers." },
  { slug: "density-altitude",              category: "drivetrain-shop", title: "Density Altitude / HP Correction Calculator",    description: "Calculate density altitude, relative HP, and dyno correction factors for SAE J1349, J607, and DIN 70020. Dew point or RH input." },
  { slug: "torque-converter-stall",        category: "drivetrain-shop", title: "Torque Converter Stall Speed Calculator",        description: "Find the right converter stall speed for your build. Recommended stall range, converter diameter, launch analysis, and cruise RPM." },
  { slug: "decimal-fraction-inch",         category: "drivetrain-shop", title: "Decimal to Fraction Inch Converter — Full 1/64\" Chart + Tap Drill & Wrench Sizes", description: "Free decimal ↔ fraction inch converter with full 1/64\" reference chart (0 to 1\"), tap drill decimal equivalents (75% thread), SAE wrench sizes with metric equivalents, engine-builder thousandths reference (bearing clearance, ring gap, quench), and 12-question FAQ." },
  { slug: "tap-drill-lookup",              category: "drivetrain-shop", title: "Tap Drill Size Lookup",                          description: "Pick a tap, get the drill. Imperial UNC/UNF and metric coarse/fine with 75% and 50% thread engagement sizes for any common tap." },
  { slug: "thread-pitch-converter",        category: "drivetrain-shop", title: "Thread Pitch Converter — TPI to Metric",         description: "Identify a thread when you have only TPI or only metric pitch. TPI × pitch (mm) = 25.4. Common UNC/UNF and metric pitches in quick reference." },
  { slug: "torque-units-converter",        category: "drivetrain-shop", title: "Torque Units Converter (ft-lb / Nm / in-lb)",    description: "Convert between ft-lb, Nm, in-lb, and kgf·m. Common engine torque references included for spec lookup." },
  { slug: "temperature-converter",         category: "drivetrain-shop", title: "Temperature Converter (°F / °C / K)",            description: "Fahrenheit, Celsius, and Kelvin with engine reference points: coolant, oil, EGT zones (cold / normal / hot / danger)." },

  // ─── Diesel ────────────────────────────────────────────────────────────
  { slug: "diesel-single-turbo",           category: "diesel",          title: "Diesel Single Turbo Finder",                     description: "Match Holset, BorgWarner, and Garrett turbos for Cummins, Duramax, and Powerstroke with airflow and drive pressure calculations." },
  { slug: "diesel-compound-turbo",         category: "diesel",          title: "Diesel Compound Turbo Sizing Calculator",        description: "Size compound twin turbo setups. Match S300/S400 and Holset turbos with pressure ratio split for Cummins, Duramax, and Powerstroke." },
  { slug: "diesel-lift-pump",              category: "diesel",          title: "Diesel Lift Pump & Fuel System Calculator",      description: "FASS and AirDog sizing based on target HP with platform-specific warnings for VP44 and CP4 trucks." },
  { slug: "diesel-egt-drive-pressure",     category: "diesel",          title: "Diesel EGT & Drive Pressure Calculator",         description: "Check pyrometer readings against safe limits. Pre-turbo vs post-turbo correction for Cummins, Duramax, and Powerstroke." },
  { slug: "diesel-injector-nozzle-pop-pressure", category: "diesel",    title: "Diesel Nozzle & Pop Pressure Calculator",        description: "Nozzle sizing for Cummins P-pump, VE, and VP44. Pop pressure recommendations, shim sizing, and air/fuel match assessment." },
  { slug: "diesel-smoke-lambda",           category: "diesel",          title: "Diesel Smoke Limit & Lambda Calculator",         description: "Diesel-specific lambda and AFR calculator with smoke prediction and boost-to-fuel balance analysis." },
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
  { path: "/contact",           title: "Contact",                                                    description: "Send feature requests, calculator suggestions, or feedback. We read every message.",                                                                    priority: 0.5 },
  { path: "/privacy",           title: "Privacy Policy",                                             description: "How Engine-build.com handles your data. We don't sell your information.",                                                                              priority: 0.3 },
  { path: "/terms",             title: "Terms of Service",                                           description: "Terms of service for using Engine-build.com calculators and tools.",                                                                                   priority: 0.3 },
  { path: "/sign-in",           title: "Sign In",                                                    description: "Sign in to sync favorites, saved presets, and engine builds across every device.",                                                                     priority: 0.5 },
  { path: "/sign-up",           title: "Create a Free Account",                                      description: "Create a free Engine-build.com account to sync favorites, calculator presets, and build sheets across phone, tablet, and shop laptop.",               priority: 0.6 },
  { path: "/me",                title: "Dashboard",                                                  description: "Your engine-building hub: favorites, recents, saved presets, builds, and defaults.",                                                                   noindex: true },
  { path: "/settings",          title: "Settings",                                                   description: "Manage your display name, default units, and default engine platform.",                                                                                noindex: true },
];

// Category landing pages
const CATEGORY_PAGES = [
  { path: "/calculators/short-block",     category: "short-block",     title: "Short Block & Bottom End Calculators",   description: "Displacement, compression, ring gap, bearings, and rotating assembly math for your short block build." },
  { path: "/calculators/cam-valvetrain",  category: "cam-valvetrain",  title: "Cam, Valvetrain & Cylinder Head Calculators", description: "Cam timing, valve springs, pushrod length, P2V clearance, degreeing, head flow, and head milling." },
  { path: "/calculators/power-fuel",      category: "power-fuel",      title: "Power, Fuel & Forced Induction Calculators", description: "HP estimation, AFR/lambda, carburetor and injector sizing, turbo matching, and boost analysis." },
  { path: "/calculators/drivetrain-shop", category: "drivetrain-shop", title: "Drivetrain & Shop Tool Calculators",     description: "Gear ratio, torque wrench correction, precision conversion, threading, and shop reference tools." },
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

function staticEntry(sp) {
  const crumbs = sp.path === "/"
    ? [{ label: "Home" }]
    : [{ label: "Home", href: "/" }, { label: sp.title }];
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(sp.title)}</h1>
      <p>${escapeHtml(sp.description)}</p>`;
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

  const title = `${e.manufacturerName} ${e.displayName} Specs`;
  const descBits = [];
  if (e.displacement_ci != null) descBits.push(`${e.displacement_ci} ci${e.displacement_l != null ? ` (${e.displacement_l}L)` : ""}`);
  if (e.num_cylinders != null) descBits.push(`${e.num_cylinders}-cylinder`);
  if (e.bore_in != null && e.stroke_in != null) descBits.push(`${e.bore_in}" bore x ${e.stroke_in}" stroke`);
  if (e.compression_ratio != null) descBits.push(`${e.compression_ratio}:1 compression`);
  const description = `${e.manufacturerName} ${e.displayName} engine specs: ${descBits.join(", ")}.`.slice(0, 300);

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
      ${e.head ? `<h2>Cylinder head</h2>
      ${specRows([
        ["Intake valve diameter", fmtIn(e.head.intake_valve_dia)],
        ["Exhaust valve diameter", fmtIn(e.head.exhaust_valve_dia)],
        ["Cam lift, intake", fmtIn(e.head.cam_intake_lift)],
        ["Cam lift, exhaust", fmtIn(e.head.cam_exhaust_lift)],
      ])}` : ""}
      ${e.calcLinks?.length ? `<h2>Run the numbers for this engine</h2>
      <p>Each link opens the calculator with this engine's specs already filled in.</p>
      <ul>${e.calcLinks.map((c) => `<li><a href="${c.href}">${escapeHtml(c.label)}</a></li>`).join("")}</ul>` : ""}
      ${variantsHtml}
      ${vehiclesHtml}
      ${e.relatedEngines?.length ? `<h2>Similar engines</h2>
      <ul>${e.relatedEngines.map((r) => `<li><a href="${r.url}">${escapeHtml(r.manufacturerName + " " + r.displayName)}</a>${r.displacement_ci != null ? ` — ${r.displacement_ci} ci` : ""}</li>`).join("")}</ul>` : ""}
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
  const title = `${fam.manufacturerName} ${fam.familyName} Engine Specs`;
  const description = `Bore, stroke, displacement and compression for all ${fam.engines.length} ${fam.manufacturerName} ${fam.familyName} engines. Compare variants side by side.`.slice(0, 300);

  const rows = fam.engines
    .map((e) => `<tr><td><a href="${e.url}">${escapeHtml(e.displayName)}</a></td><td>${e.displacement_ci != null ? `${e.displacement_ci} ci` : "—"}</td><td>${e.bore_in != null && e.stroke_in != null ? `${e.bore_in}&quot; × ${e.stroke_in}&quot;` : "—"}</td><td>${e.compression_ratio != null ? `${e.compression_ratio}:1` : "—"}</td><td>${e.hpMin != null ? (e.hpMin === e.hpMax ? e.hpMin : `${e.hpMin}–${e.hpMax}`) : "—"}</td></tr>`)
    .join("");

  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <table>
        <tr><th>Engine</th><th>Displacement</th><th>Bore × Stroke</th><th>CR</th><th>HP</th></tr>
        ${rows}
      </table>
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
  const description = `Bore, stroke, displacement and compression specs for ${m.engineCount} ${m.name} engines across ${m.families.length} families.`.slice(0, 300);
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <ul>
        ${m.families.map((f) => `<li><a href="${f.url}">${escapeHtml(f.familyName)}</a> — ${f.engines.length} engine${f.engines.length === 1 ? "" : "s"}</li>`).join("\n        ")}
      </ul>
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

  const allEntries = [
    ...STATIC_PAGES.map(staticEntry),
    enginesIndexEntry(engineData.manufacturers),
    ...engineData.manufacturers.map(manufacturerEntry),
    ...engineData.families.map(engineFamilyEntry),
    ...engineData.engines.map(engineEntry),
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
    written++;
  }

  // Generate sitemap.xml from the same manifest so it never drifts.
  const sitemap = generateSitemap(allEntries);
  await writeFile(resolve(DIST, "sitemap.xml"), sitemap, "utf8");
  const indexableCount = allEntries.filter((e) => !e.noindex).length + 1; // +1 for homepage

  const withLongContent = allEntries.filter((e) => e.hasLongContent).length;
  console.log(`prerender: engine DB — ${engineData.engines.length} engines, ${engineData.families.length} families, ${engineData.manufacturers.length} manufacturers`);
  console.log(`prerender: wrote ${written} HTML files (${CALCS.length} calculators, ${CATEGORY_PAGES.length} categories, ${STATIC_PAGES.length} static, ${GUIDES.length} guides, 1 FAQ)`);
  console.log(`prerender: ${withLongContent} / ${CALCS.length} calculators have long-form content`);
  console.log(`prerender: wrote sitemap.xml with ${indexableCount} URLs (noindex excluded)`);
}

main().catch((err) => {
  console.error("prerender failed:", err);
  process.exit(1);
});
