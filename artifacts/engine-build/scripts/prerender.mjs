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

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "..", "dist", "public");
const CONTENT_DIR = resolve(__dirname, "..", "src", "data", "calculatorContent");
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
  { slug: "ring-gap",                      category: "short-block",     title: "Piston Ring Gap Calculator",                     description: "Application-specific piston ring gap for NA, nitrous, turbo, supercharged, and diesel. Per-ring outputs with material warnings." },
  { slug: "piston-speed",                  category: "short-block",     title: "Piston Speed Calculator",                        description: "Mean and peak piston speed in FPM with color-coded safety zones. Reference table of common engine redlines." },
  { slug: "quench-deck-height",            category: "short-block",     title: "Quench & Deck Height Calculator",                description: "Piston-to-deck clearance, quench distance, and compression ratio in one tool. Gasket quick-picker updates everything live." },
  { slug: "rod-ratio",                     category: "short-block",     title: "Connecting Rod Ratio Calculator",                description: "Calculate rod ratio with a visual gauge. Compare against common engines. Explains piston dwell and side loading." },
  { slug: "bearing-clearance",             category: "short-block",     title: "Bearing Clearance Calculator",                   description: "Main and rod bearing oil clearance from measurements or Plastigage. Per-bearing tables and oil viscosity recommendations." },
  { slug: "intake-manifold-milling",       category: "short-block",     title: "Intake Manifold Milling Calculator",             description: "How much to mill the intake manifold after surfacing heads or decking the block. Tells you when correction is needed and how much." },
  { slug: "bolt-spec-lookup",              category: "short-block",     title: "Head Bolt & Main Bolt Spec Lookup",              description: "Look up head bolt and main bolt thread sizes, diameters, torque specs, and ARP upgrade part numbers for any engine platform." },
  { slug: "cc-ci-converter",               category: "short-block",     title: "CC to Cubic Inch Converter",                     description: "Convert chamber volumes, piston dome/dish CCs, and displacement between cubic centimeters, cubic inches, liters, and fluid ounces." },

  // ─── Cam & Valvetrain ──────────────────────────────────────────────────
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
  { slug: "afr-lambda",                    category: "power-fuel",      title: "AFR / Lambda Converter",                         description: "Convert between Lambda, actual AFR, and gas-scale wideband AFR for any fuel. Variable E85 ethanol slider." },
  { slug: "carb-cfm-sizing",               category: "power-fuel",      title: "Carburetor CFM Calculator",                      description: "Calculate the right carburetor size for your engine. Real carb sizes from Holley and Edelbrock with overcarburetion warnings." },
  { slug: "fuel-injector-sizing",          category: "power-fuel",      title: "Fuel Injector Sizing Calculator",                description: "What size fuel injectors do you need? Duty cycle analysis, fuel pump sizing, and real injector size matching." },
  { slug: "turbo-finder",                  category: "power-fuel",      title: "Turbo Finder & Sizing Calculator",               description: "Find the right turbocharger for your engine. Airflow, boost pressure, compressor sizing, and turbo recommendations by HP goal." },
  { slug: "boost-compression",             category: "power-fuel",      title: "Boost / Effective Compression Ratio Calculator", description: "Effective compression ratio under boost. Altitude correction, fuel-specific safety limits, and reverse-solve for max safe boost or CR." },
  { slug: "octane-mix",                    category: "power-fuel",      title: "Octane Mix Calculator",                          description: "Blend two fuels to hit a target octane, or calculate E85/ethanol mix ratios with seasonal correction. Shows stoich AFR and energy content." },
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
  { slug: "decimal-fraction-inch",         category: "drivetrain-shop", title: "Decimal to Fraction Inch Converter",             description: "Convert decimal caliper readings to fractional drill/wrench sizes and back. Choose precision down to 1/128. Fractional inch chart included." },
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
  { path: "/torque-specs",      title: "Torque Specs Quick Lookup",                                  description: "Head bolt, main bolt, and rod bolt torque sequences for popular engine platforms. Step-by-step with ARP upgrade specs.",                              priority: 0.8 },
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

function guideEntry(g) {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: g.title },
  ];
  const stepsHtml = (g.steps ?? []).map((s, i) => `
        <h3>Step ${i + 1}: ${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.text)}</p>`).join("");
  const seoBlock = `
      <nav aria-label="Breadcrumb" style="font-size:14px;color:#666;margin:24px 0;">
        ${breadcrumbHtml(crumbs)}
      </nav>
      <h1>${escapeHtml(g.title)}</h1>
      <p>${escapeHtml(g.description)}</p>
      ${g.totalTime ? `<p><strong>Time:</strong> ${escapeHtml(g.totalTime)}</p>` : ""}${stepsHtml}`;

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

  const allEntries = [
    ...STATIC_PAGES.map(staticEntry),
    ...CATEGORY_PAGES.map(categoryEntry),
    ...(await Promise.all(CALCS.map(calcEntry))),
    guidesIndexEntry(),
    ...GUIDES.map(guideEntry),
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
  console.log(`prerender: wrote ${written} HTML files (${CALCS.length} calculators, ${CATEGORY_PAGES.length} categories, ${STATIC_PAGES.length} static, ${GUIDES.length} guides, 1 FAQ)`);
  console.log(`prerender: ${withLongContent} / ${CALCS.length} calculators have long-form content`);
  console.log(`prerender: wrote sitemap.xml with ${indexableCount} URLs (noindex excluded)`);
}

main().catch((err) => {
  console.error("prerender failed:", err);
  process.exit(1);
});
