# Build Planner — Research & Plan (2026-10-15)

Two questions were asked before investing in the build planner: (1) where can a real
parts catalog come from, and (2) who else does this and what can we do better.
Findings below. Several retailer and manufacturer sites block fetchers, so some claims
rest on search snippets of the official page; those are marked.

## 0. Where the planner stands today

| Piece | State |
|---|---|
| `/build-sheets/planner` | Static hand-typed catalog: 191 gas parts (SBC 350, LS1, LS3, Ford 302) + 6 diesel platforms. Fixed prices, plain Summit search links, no affiliate tag, shopping-list total, no HP tie-in. |
| `/build-sheets/build/:id` wizard | Same catalog per section via `SectionPartPicker`; Howards cam picker (3,293 cams) with family/CI/cyl/year fitment (`cam-fitment.json`). Saves to the builds Lambda. |
| `/build-advisor` | Standalone 84 KB HTML in an iframe. JS-side HP estimate + 3 conflict checks. Not connected to anything. |
| Postgres `05_estimation_engine.sql` | `estimate_hp`, `validate_build` (9 checks), `advise_build`, CR/rod-ratio/header calcs. **Not reachable from any API** (0 references in `lambda-builds`). |
| Demand | Search Console already shows clicks for "engine builder online", "online engine builder", "build engine online". |

The cam fitment record (`fam`, `ci`, `cyl`, `y0/y1`, `ls`) is the right shape for every
other part category; the planner's `Part` type (brand, PN, price, retailer, tier) is not.

## 1. Parts catalog: data sources, ranked

### 1.1 Retailer affiliate programs (the revenue side)

| Retailer | Program | Rate / cookie | Feed or API | Notes |
|---|---|---|---|---|
| **Summit Racing** | impact.com, program 35994, live since 2025-08-21 (summitracing.com/summit-racing-affiliate) | **5%**; cookie unconfirmed | Unknown until approved | Pitched at creators "with a sizeable following"; apply anyway. Jobs-site FAQ still says "no affiliate program" (stale). |
| **JEGS** | Impact (jegs.com/AffiliateMarketing) | **1%** general, **3%** JEGS brand, **5-day** cookie | Unknown until approved | FlexOffers resells it at worse terms; go direct. |
| **eBay Motors** | eBay Partner Network, in-house | ~2.5–3% auto parts, **24-hour** cookie | **Yes: Buy Browse API** returns `itemAffiliateWebUrl` when the request carries `X-EBAY-C-ENDUSERCTX: affiliateCampaignId=…` | Only large retailer with a real public API. Listings churn; query live by brand+PN, do not store. |
| Speedway Motors | None found | — | — | ToS bans robots and copying. |
| Holley | None found (reseller questionnaire only) | — | — | |
| RockAuto | Informal 5% discount codes, no tracking | — | — | OE replacement; irrelevant. |
| Advance / AutoZone / CARiD / PartsGeek | Impact / CJ, 0.8–5% | — | CJ/FlexOffers feeds | OE/accessory; weak fit. |

**Scraping Summit / JEGS / Speedway is out.** Summit's Terms of Use (Autosales Inc., rev. 2026-04-30) allow personal non-commercial use only; JEGS (effective 2026-08-01) has an explicit anti-scraping clause; Speedway bans robots. All run bot interstitials. Affiliate terms separately forbid scraping the advertiser, so scraping would also forfeit the accounts that are the revenue path. Summit pages do embed product JSON-LD (see github.com/BrianLeishman/summitracing-mcp): technically trivial, contractually prohibited.

### 1.2 Industry data (ACES/PIES)

- **SEMA Data** (semadata.org) is the sanctioned aggregator of manufacturer ACES/PIES data. Reseller tiers: **Launch $0** (up to 3 approved brands, full-featured as of 2026-07), Accelerate $25 member / $75 non-member per month (10k API calls), Turbo $75/$150, Mach $150/$300. API v2 (`apps.semadata.org/sdapi/v2`) has products, attributes, pricing, images, and **fitment lookups by engine**. Each brand approves resellers individually. **Open question: will a content/affiliate site with no cart be approved?** The sign-up form asks for a retail URL and "distributors you buy from". Cheapest test: open a Launch account, request 3 brands (e.g. Edelbrock Group, ARP, Melling), email info@semadata.org asking which tier fits a content site.
- **DCi / CatalogRack**: same brand-approval model, free manual downloads, paid FTP/API. Same eligibility problem.
- **Auto Care VCdb/PCdb**: $2,500–4,410/yr; it is vocabulary, not a catalog (zero part numbers). Skip unless SEMA Data works out.
- **Turn 14 / Keystone / Meyer / Motor State** (distributors): dealer feeds with full pricing and fitment, but require a sales-tax license, resale certificate and an opening buy-in. Motor State has the best engine-builder coverage. Only relevant if a small reselling entity is ever formed.
- No open dataset of aftermarket engine parts with fitment exists (GitHub, Kaggle, Wikidata checked).

### 1.3 Manufacturer catalogs (the parts themselves): the path that works

Facts (part number, bore, lift, "fits SBC 350") are not copyrightable (*Feist*; *ATC Distribution v. Whatever It Takes*, 6th Cir. 2005, specifically about an auto-parts catalog). Store structured facts, write our own descriptions, cite the catalog edition. Edelbrock Group ToS forbid robots and commercial use of the *site*, so for COMP/Lunati/Edelbrock use the published PDFs rather than crawling. The Howards crawl (robots honored, Crawl-delay respected) is the model.

Brands with the cleanest engine-family tables, roughly in order of payoff per day of extraction work:

| Category | Brand | Source |
|---|---|---|
| Oil pumps, timing sets, springs | **Melling** | melling.com/catalogs: SBC, BBC, LS/LT, Hemi, Ford Modular mini-catalogs (Dec 2025) |
| Pistons | **MAHLE Motorsport** | 2026 PowerPak Application Guide PDF (by bore/stroke/rod/CH) |
| Pistons | UEM (Icon/KB/Silv-O-Lite), Wiseco, JE, Diamond (web only) | uempistons.com/rt-5-catalogs; wiseco.com/product-catalogs; jepistons.com/product-catalogs |
| Fasteners | **ARP** | cdn.arp-bolts.com/ARPCatalog.pdf (2026) |
| Rods / cranks / rotating assemblies | **Manley**, **Eagle** (2024 PDF via nason.com.au), **Callies** (HTML catalog), Scat (print only) | |
| Bearings | **King** (online catalog by displacement/bore/stroke; ACES available), Clevite (shop-tool only per existing rule) | kingbearings.com/catalog |
| Gaskets | **Cometic** (AB23 PDF), Fel-Pro (line cards, Find My Part) | |
| Cams / lifters / springs | COMP, Lunati, Edelbrock PDFs; Isky PDF; Crower master catalog (HTML + PDF, with prices); Howards (done) | compcams.com/catalogs; iskycams.com/downloads; crower.com/master-catalog |
| Heads | Dart, Brodix (PDF), Trick Flow (2026 PDF), AFR (web only) | plus the head-flow sources already in `engine-db/DATA_SOURCES.md` |
| Intakes / carbs / EFI / headers | Holley group (per-SKU pages + documents.holley.com PDFs; engine landing pages), Edelbrock PDF | |
| Pushrods | Trend (2019 PDF); Morel/Johnson lifters have no catalog (dealer pages only) | |

Effort: about 1–3 days per brand (pdfplumber/Camelot + manual QA), roughly 25 brands in 6–10 weeks part-time, annual refresh. Cost $0.

### 1.4 Recommended data path

1. **Now, $0:** apply to Summit (impact.com), JEGS (Impact) and eBay Partner Network. Until approved, keep deep links to Summit/JEGS search-by-part-number; once approved, wrap them in tracking and check whether either publishes a product catalog inside Impact (that would give PN to price to deep link legitimately).
2. **Now, $0:** open a SEMA Data Launch account and request 3 brands to learn whether a content site gets approved. If yes, Accelerate at $75/mo gives ACES/PIES specs, images, MAP pricing and engine fitment for every approved brand through an API, which would replace most of step 3.
3. **In parallel:** build `parts-catalog.json` from manufacturer catalogs, one brand at a time, using the cam-fitment record shape. Start with the categories the planner already shows (pistons, rods, cranks, bearings, rings, oil pumps, gaskets, fasteners) for the engine families with the most traffic.
4. **Prices:** eBay Browse API for live prices (and a second buy button); Summit/JEGS prices only via affiliate feeds if offered. Otherwise show "check price at Summit / JEGS" rather than stale numbers. The current hard-coded prices will drift and look wrong.
5. **Do not scrape retailers.**

## 2. Competitive landscape

**Nobody has built "PCPartPicker for engines."** A PCPartPicker forum thread asked for it nine years ago; the answer was "you'd need a database of every engine configuration", which this site has.

| Segment | Who | What they have | What they lack |
|---|---|---|---|
| Desktop simulators | Performance Trends Engine Analyzer ($140–$500, v3.4B 2024, still maintained); Motion Software DynoSim6 ($150–$200) / Dynomation-6 ($600, slow-moving, 2023 footer); Virtual Engine Dyno (likely dead); Desktop Dyno (superseded) | Real physics; 7,000 lobe profiles (DynoSim) | No part numbers, no prices, no fitment; Windows only; forums say "trends only, ±5–10%, overstates installed power" |
| 2025–26 AI planners | LifeStyle Racing "AI Build Planner 2.0" (vehicle-centric, own affiliate program, "planning notes, not fitment approvals"); MotorMia app ($8M raised, 3.6 stars, bolt-on mods); Rev Advisor app (solo dev, Claude API, $5–15/mo); Tuner Guild (hobby alpha with test junk in the parts list) | Links, chat, build lists | No bore/stroke/chamber math; disclaim fitment outright; vehicle-mod scope, not engine internals |
| Cam selectors | COMP CamQuest (folded into compcams.com, COMP-only, "optimistic"); Lunati "Find a Cam" (human-reviewed questionnaire) | Brand funnels | Single brand, no springs/pushrod/converter logic across brands |
| Retailers | Summit Pro Packs / Top End Kits / Combos / Project 1000; JEGS master kits; Speedway "Toolbox" 383 recipes in 400/500/600 hp tiers; **Holley Swap Essentials (Apr 2026)**: GM only, 300+ "validated component combinations", configurator-driven | Pre-matched kits, the industry's answer to compatibility | No planning tool; kits only; Holley's is swap hardware, not internals |
| Crate / short-block builders | BluePrint (3-dropdown finder), Mast (Airtable form), Borowski ("from $39,995, call"), Texas Speed (dropdown options, many sold out), LME (phone), Butler Performance (the one real rotating-assembly configurator, Pontiac) | | Phone/quote driven |
| Build-list apps | Wheelwell (dead, DNS gone); The Buildsheet, Pocket Garage, RevMatch, Tinker Tracker (mod logs, handful of ratings); Mortec (casting numbers + eBay links) | Logging | No engineering |

### 2.1 What enthusiasts actually complain about (the feature list, straight from forums)
- Cam too big for the converter: XE268 "stalled once in gear"; stock converter is about a 220° @ .050 limit; 2,800+ stall won't lock at cruise.
- Pushrods: etched length wrong; planned 6.700" measured 6.500"; base-circle change alters length.
- Springs: "turning it by hand is not a failsafe check for coil bind"; rocker sweep.
- Intake/head patterns: three SBC intake bolt patterns; Vortec 8-bolt; grinding holes caused leaks.
- Head lift limits: "have to cut the valve guides to run that much lift."
- P-V clearance: published guidelines disagree; "most guys on any forum aren't qualified to give cam suggestions."
- Outcome variance: budget 383 made 290 hp on the chassis dyno.
- Kit gotchas: cam-only excludes springs/pushrods; AFM/DOD and VVT engines need delete kits.
- Recipes are scattered across back issues of Hot Rod / Car Craft (Car Craft died 2019); Holdener's dyno data has no database.

### 2.2 PCPartPicker lessons
Won on: cross-retailer price comparison, automatic compatibility warnings, saved/permalinked lists, completed-build gallery, parametric filters, price alerts, affiliate funding only. Translates: all of those. Does not translate: PC compatibility is boolean on fixed fields; engine fitment is dimensional and conditional (chamber + dome + deck + gasket gives CR; lift + reliefs + ratio gives P-V; installed height vs coil bind; pushrod depends on machining; reused parts are normal; clearances must be measured). That difficulty is exactly why the middle of the market is empty.

## 3. What would make ours clearly the best

The field is empty where it matters: simulators have physics without parts, AI apps have links without physics, retailers have kits without planning. The winning product is a **deterministic, explainable compatibility engine** built on the spec database and cam catalog, wrapped in PCPartPicker mechanics, ending in a **printable build sheet with mandatory "measure this" gates**.

1. **Compatibility checks nobody else does** (each one answers a complaint above): block × head bolt/intake pattern and chamber cc; piston dome/CH + rod + deck + gasket, giving static/dynamic CR and implied octane; cam (from the 3,293-SKU catalog) × spring installed height / coil bind / open pressure vs lifter type; rocker ratio × lift vs the head's max lift; P-V *risk flag* (never "clearance OK"); cam duration vs converter stall vs gear vs weight; head flow vs displacement × target RPM; rod ratio; lifter type vs block casting; AFM/VVT delete required; pushrod "measure required" with a starting length. Status vocabulary: **no known conflict / possible conflict / known conflict**, never "approved."
2. **Real SKUs priced across Summit / JEGS / eBay**, with "kit vs à la carte" and "what this kit is missing" (cam-only vs springs vs pushrods).
3. **Printable build sheet / machine-shop handoff** pre-filled from our own torque specs, ring-gap-by-application, bolt specs and bearing clearances, plus a measurement checklist that cannot be dismissed. Doubles as the shop-directory lead ("send this sheet to a shop near you").
4. **Recipe library as seeded, forkable builds** (383 Vortec, LS cam-only, 5.0 top-end, Cummins tow) with permalinks, plus a completed-build gallery with dyno sheets.
5. **Transparent HP model** with ranges and "what's limiting you" explanations: the existing `estimate_hp` / `validate_build` SQL, finally exposed through the API, with the advisor iframe retired.

### 3.1 Liability posture
Every output is a planning estimate with a range, not a guarantee. Hard MEASURE-REQUIRED gates for P-V, coil bind, pushrod length, bearing and ring clearances. Manufacturer specs cited as the authority; the 3-source rule applies to any spec that drives a check. Terms get a reliance disclaimer. Fitment is never shown as "approved."

### 3.2 Monetization without Amazon
Summit 5% + JEGS 1–3% + eBay ~3% affiliate on the parts list; Mediavine already on the pages; shop-directory leads from the build sheet; later, manufacturer-sponsored "validated combos" (Holley's 300-combination model shows brands will pay to be the validated path); optional premium (PDF export, unlimited saved builds) at the $2–15/mo price points the apps use.

## 4. Phased plan

**Phase 0: applications (this week, no code).** Summit on impact.com, JEGS on Impact, eBay Partner Network + developer keys, SEMA Data Launch account with 3 brand requests, email to info@semadata.org. These gate everything on the pricing side and cost nothing.

**Phase 1: catalog foundation (2–4 weeks).** Define one `Part` record with fitment in the cam-fitment shape (`fam`, `ci`, `cyl`, `y0/y1`) plus category-specific spec fields (piston: bore, CH, dome cc, pin; rod: length, journal; spring: installed height, coil bind, pressures; head: chamber cc, intake pattern, max lift; and so on). Build `scripts/partsCatalog.mjs` like `camCatalog.mjs`. Extract Melling, MAHLE, ARP, Manley, Eagle, King, Cometic, UEM first (cleanest tables). Replace the hand-typed `buildParts.ts` prices with "check price" links; keep the records as seed data.

**Phase 2: compatibility engine (3–5 weeks).** Port the useful parts of `validate_build` into a TypeScript module the planner and wizard share (client-side, deterministic, unit-tested against known recipes). Add the checks in §3 one at a time, each with a plain-English explanation and the source of the rule. Expose `estimate_hp`/`advise_build` through the builds Lambda; retire the iframe advisor.

**Phase 3: PCPartPicker mechanics (3–4 weeks).** Merge planner and wizard into one flow: choose engine, set goal, pick parts with live conflict status, see a priced list with affiliate links (eBay live, Summit/JEGS tracked links), print the build sheet with measurement gates. Permalinks for anonymous builds; saved builds for signed-in users (already exists). Seed 10–15 recipes as forkable builds.

**Phase 4: gallery and growth.** Completed-build gallery with dyno sheets, "send to a shop" lead button into the shop directory, price alerts, sponsored validated combos.

## 5. Open questions for the owner
- Apply to Summit's Impact program as engine-build.com? (Creator-focused wording; traffic is the argument.)
- Open the SEMA Data Launch account now? Is forming a small reselling entity (sales-tax license) ever on the table? It would unlock SEMA brand approvals and Turn 14 / Motor State feeds.
- Which engine families first? Traffic says SBC, LS, SBF; the diesel platforms already have the most parts data.
- Clevite stays shop-only (existing rule); King Bearings would be the public-site bearing source.
