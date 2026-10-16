# Parts Catalog — Manufacturer Data Feasibility (2026-10-15)

Follow-up to `BUILD_PLANNER_RESEARCH.md`. Decision taken that day: build the planner on
manufacturer data first, earn users, then approach Summit/JEGS. SEMA Data dropped.

Three probes actually fetched the sources (robots.txt honored, 6 s+ per host, descriptive
User-Agent, no 403 retried, nothing downloaded executed) and ran table extraction on real
pages. Evidence is in the repo:

- `scripts/catalog-probes/<probe>/samples/` — extracted rows (CSV/JSON), 55 files
- `scripts/catalog-probes/<probe>/scripts/` — polite fetchers and the parsers that produced them
- `Data/manufacturer-catalogs/<probe>/dl/` — the downloaded PDFs/HTML (gitignored, 430 MB)

Grades: **A** clean text PDF or JSON endpoint (hours) · **B** HTML tables / key-value pages (1–2 days) ·
**C** messy PDF needing manual QA (several days) · **D** blocked, JS-only or scanned.

## 1. Headline

- **Roughly 60% of the brands that matter are A or B grade.** Enough to cover every planner
  category for SBC, BBC, LS, SBF, Mopar and the diesel platforms without touching a retailer.
- **Diesel is easier than gas.** Most diesel manufacturers run Shopify or WooCommerce with
  public JSON product endpoints (`/products.json`, `/wp-json/wc/store/v1/products`). No PDF work.
- **The Cloudflare wall:** Manley, Wiseco, JE, Diamond, Dart, Texas Speed, Holley, Trick Flow,
  PAC, Lunati's JEGS mirror. AFR's robots.txt disallows everything. These need a one-time manual
  browser download of a catalog PDF, or an email asking for one. Not a blocker: the same categories
  are covered by MAHLE, Icon, Eagle, Scat, Callies, Edelbrock, Brodix, COMP, Crower, Isky.
- **Estimated effort, first wave (all A/B):** about 12–15 working days gas + 7–9 days diesel,
  plus 2–3 days for a shared normalizer and the fitment schema.

## 2. Gas: rotating assembly, bearings, gaskets, fasteners, rings

| Brand | What was found | Grade | Target-family PNs | Effort |
|---|---|---|---|---|
| **Scat** | WooCommerce Store API JSON (`/wp-json/wc/store/v1/products?per_page=100`) with Make, Engine, Stroke, Rod Length, Rod Journal, crank/rod PN attributes | **A** | 1,000–2,000 | ½ day |
| **MAHLE PowerPak** | 44-page text PDF; fill-down parser produced 99 clean rows from 2 pages (CID, bore, stroke, rod, CH, pin, dome cc, weight, CR at 3 chamber volumes, alloy, PN) | **A-** | ~650 (LS 200, SBC 150, SBF 90, BBC 45, Mopar 35, Ford Mod 30) | 4–8 h |
| **Callies** | 89 product pages, HTML tables Stroke / Main / Pin / Rod Length / PN; Crawl-delay 10 | **B** | 300–600 | ½ day |
| **Eagle** | 7,479 plain HTML item pages with full key/value specs (stroke, journals, bobweight, min rod length, snout, seal) + 92-page text PDF | **B** web / C PDF | ~2,500 (SBC 500, LS 480, BBC 420, SBF 400, Mopar 180, Hemi 95) | 1 day code + 13 h crawl |
| **UEM / Icon / KB** | Numerical listing PDF extracts perfectly (PN, make, disp, rod, description, ring pack); Icon catalog detail (CH, dome, pin) needs clipped text parsing; KB PDF not yet downloaded | **B** + C | 325–530 Icon | 2–3 days |
| **ARP** | 180-page text PDF, multi-column grid (application × 8 kit columns); x-position clustering works. Website kit pages are thin; search API is robots-disallowed | **B/C** | 1,500–2,000 engine kits | 2–4 days |
| **Cometic** | 180-page text PDF, dotted-leader rows parse; website has 7,271 SKU pages but Crawl-delay 30 (≈60 h) | **C** PDF / B web | 500–1,100 domestic | 2–4 days |
| **King Bearings** | Per-SKU HTML spec tables are good; discovery and engine search are robots-blocked | **C** partial | 2,687 total | 2–3 days |
| **Fel-Pro** | LS line card parses in an hour (23 PNs); no SKU pages; lookup is a third-party widget | **A** card / D site | 23 | 1 h |
| **Total Seal** | Catalog by bore + Shopify `products.json`; needs engine→bore mapping (we have bore data) | **B** | thousands by bore | 1 day |
| **Melling** | Brochure PDFs only (~40 PNs); lookup is MyPartFinder (licensed API) | **C** / D | ~40 | 1–2 days |
| Manley, Wiseco, JE, Diamond, Hastings | Cloudflare challenge / TLS failures | **D** | — | ask for catalogs |

## 3. Gas: cams, valvetrain, heads, induction

| Brand | What was found | Grade | Target-family PNs | Effort |
|---|---|---|---|---|
| **COMP Cams** (public S3 PDFs, no crawling) | Lobe catalog: ruled, 2,060 lobe rows extract clean. Springs master chart: clean (installed height, rate, loads at 11 heights). Cam application tables: duration @.050, lift, LSA, RPM range **and recommended lifter/spring/pushrod/retainer PNs per cam**, but shaded bands not rules, so needs coordinate parsing | lobes **A**, springs **A**, cams **B** | ~1,020 cam/kit PNs (GM 388, Ford 280, Chrysler 133, AMC 15) | 1–2 days cams, hours for lobes/springs |
| **Edelbrock** (PDF + one manual page save) | Head tables ruled and clean: chamber cc, runner cc, HP range, valve sizes, cam type, max lift, spring dia, PN. Flow-data HTML page: int/exh CFM .100–.900 per head PN plus a spring table (installed height, rate, coil bind). Intake tables: year/make/engine, carb flange, RPM range, heights | heads **A**, flow **A**, intakes **B** | heads 60–80, intakes several hundred | hours heads/flow, 1 day intakes |
| **Crower** | Per-make 2025 cam PDFs ruled and clean (PN, CID, grind, LSA, adv/.050 duration, lift, option # → lifter & spring PNs, RPM range, redline). Spring booklet clean. Magento SKU pages have full spec block + price | PDFs **A**, HTML B | Chevrolet PDF 229 PNs; other makes similar | hours per make |
| **Brodix** | WordPress series pages with 3 HTML tables each: specs, **flow chart**, easy-order (PN, port cc, chamber cc, valves, seat pressure) + 106-page text PDF | **A-** | ~30 series, 186 PNs | hours |
| **Isky** | 186-page text PDF but interleaved prose; spring spec book clean; lobe list is scanned images | cams **C**, springs **A** | ~1,030 (no LS/Modular) | several days + QA |
| **Brian Tooley Racing** | 5,714 product URLs in sitemap; attribute table has engine/type, numeric specs live in description text (`224/24X .618"/.618" 114 LSA`) | **B-** | 1,110 BTR SKUs (LS/LT/Gen3 Hemi/Godzilla) | 1–2 days |
| **Morel lifters** | 41 HTML tables on johncalliesinc.com: set #, pair #, body dia, roller dia, description | **A** | ~290 | hours |
| **Johnson lifters** | ~22 HTML tables with PN, description, MSRP | **A-** | ~100 | hours |
| **Scorpion rockers** / **Harland Sharp** | Shopify `products.json`; ratio and stud size in titles | **A** | hundreds | hours each |
| **Trend pushrods** | 2019 PDF stocking table clean; PN encodes length | **A** | 7 families, generated SKUs | hours |
| Lunati | No cam catalog on Edelbrock Group site; JEGS mirror behind Cloudflare | **D** | — | manual PDF |
| Dart, Trick Flow, Texas Speed, Holley, AFR, PAC, Manley | Cloudflare / Incapsula / robots `Disallow: /` / timeout | **D** | — | ask for catalogs |

## 4. Diesel

Platform codes: C12 Cummins 12V, C24 24V/CR 5.9, C67 Cummins 6.7, DMX Duramax LB7–L5P, PS Powerstroke.

| Source | Categories | Platforms | Format | Grade | SKUs | Effort |
|---|---|---|---|---|---|---|
| **Industrial Injection** | injectors (% over + HP per variant, CP3 size recommendation), pumps, turbos (wheel mm), manifolds, kits | all | Shopify JSON, fitment in tags | **A** | 2–4k pickup | 1.5 days |
| **MAHLE PowerPak diesel** | pistons (bore, stroke, rod, CH, pin, bowl cc, CR, alloy) | C12/C24/C67, DMX LB7–L5P, PS 6.0/6.4 | text PDF | **A** | 69 — **already parsed** | done |
| **Hamilton Cams** | cams (duration @.050, RPM range), springs, pushrods, fire rings, studs | C12/C24/C67 | WC Store API + JSON-LD | **A-** | ~50 | ½ day |
| **S&S Diesel Motorsport** | injectors (% over, flow method), CP3 conversions, rails | C24/C67, DMX, PS 6.4/6.7 | WC Store API | **A-** | ~40 / 150 variants | ½ day |
| **CP-Carrillo** | rods, hybrid piston+rod kits (bore, CR, dish, pin) | DMX, C, PS 6.7 | PDF tables | **A-** | 46 — **already parsed** | done |
| **BD Diesel** | injectors, turbos, manifolds, brakes | all | Shopify JSON on `ca.bddiesel.com` (US hosts fail TLS chain) | **A-** | 2–3k | 1 day |
| **Fleece** | turbos (with CARB EO numbers), lift pumps, CP3/CP4 kits | C 03–24, DMX, PS 11–24 | JSON-LD + fitment PDF | **B** | 600–800 | 1.5 days |
| **KC Turbos** | turbos (wheel sizes, A/R), manifolds, Smith Bros pushrods | PS 7.3–6.7 | Shopify JSON | **A-** | ~150 | ½ day |
| **Fluidampr** | dampers | C, DMX, PS | HTML tables | **B** | ~15 | ¼ day |
| **Callies** | cranks | DMX, C67 | HTML table | **B** | ~4 | done with gas |
| **Cometic** | head gaskets, top/bottom kits | C, DMX, PS | catalog PDF | **B/C** | 40–60 | ½ day |
| Wagler, Colt Cams, Manton, Dynomite, Banks, ATS, PPEI, Bullet Proof Diesel, Stainless, Smeding | rods/pistons, cams, pushrods, injectors, intercoolers, tuners, coolers, turbos | mixed | Shopify JSON, specs in prose | **A-/B** | 20–300 each | ¼–½ day each |
| ARP diesel studs | — | all | search API robots-disallowed | **D** | ~30 kits | take from the gas ARP PDF |
| Diamond, Manley, Wiseco, PAC | pistons, rods, springs | | Cloudflare | **D** | | ask |

**Coverage gap:** Powerstroke 7.3 has no piston/rod/cam source with numeric specs reachable
(KC Turbos, Fleece pumps, Cometic and Bullet Proof Diesel cover the rest). Needs a vendor ask
(Diesel Site, Riffraff, Manley).

**Diesel retailers for later:** none of XDP, Diesel Power Products, Thoroughbred, Pure Diesel
Power, Sinister, DAP, Rudy's, Power Driven, Dieselsite, Riffraff, Strictly Diesel or Merchant
has a public affiliate program. Diesel Power Products and DAP have explicit anti-scraping terms.
The only diesel affiliate programs found are delete-oriented sellers and must be avoided.

### 4.1 Emissions line (must be built into the schema)

EPA civil enforcement against delete sellers continued into 2026 (XDP $1.1M, Rudy's $2.4M
criminal + $7M civil, CB Tuning Jan 2026); DOJ said in Jan 2026 it would stop criminal
prosecutions but civil enforcement continues, and CARB enforces independently. Mediavine's
content policy also applies.

- Internal parts (pistons, rods, cranks, bearings, cams, springs, pushrods, studs, gaskets,
  dampers, oil pumps/coolers, lift pumps, intercoolers, replacement manifolds): catalog freely.
- Injectors, turbos, tuners, intakes: store `emissions_status` per SKU:
  `oem_replacement` | `carb_eo:<number>` | `no_eo_race_only` | `unknown`. The advisor
  auto-recommends only the first two for street builds; race-only parts get a badge and no
  purchase link. Banks' `CA-Exclusion` tags, PPEI's `EPA:` tags and Fleece's EO numbers seed this.
- Never list, link or describe DPF/DOC/SCR/EGR deletes or delete tunes.

## 5. Shared record shape

One record type for every category, modeled on the existing `cam-fitment.json`:

```
{
  "m": "Scat",                 // brand
  "p": "9-350-3750-6000",      // part number
  "cat": "crank",              // crank | rod | piston | ring | bearing | cam | lifter | pushrod |
                               // spring | rocker | head | intake | carb | efi | header | gasket |
                               // fastener | damper | oilpump | injector | turbo | liftpump | ...
  "fit": { "fam": "SBC", "ci": [350, 383], "cyl": 8, "y0": 1955, "y1": 2002, "notes": "2-pc RMS" },
  "spec": { "stroke": 3.75, "rodJournal": 2.1, "mainJournal": 2.45, "material": "4340 forged" },
  "src": { "doc": "scatcrankshafts.com Store API", "edition": "2026-10", "url": "..." },
  "emissions": "oem_replacement" | "carb_eo:D-834-19" | "no_eo_race_only" | null
}
```

`spec` keys are per-category and are exactly the inputs the compatibility checks need:
piston `bore, ch, domeCc, pin, rodLen`; rod `len, bigEnd, pin`; spring `installedHt,
coilBind, seatLb, openLb, od`; head `chamberCc, runnerCc, valves, maxLift, intakePattern,
flow[]`; cam already defined. No prices are stored; prices are a later, retailer-fed layer.

## 6. Extraction order

**Wave 1 — gas, all A/B (≈12–15 days):** Scat API → MAHLE PowerPak (gas pages) → Callies →
Eagle item pages → UEM listing PDF → COMP lobe catalog + springs chart → Crower per-make PDFs +
spring booklet → Edelbrock heads + flow page + intakes → Brodix series pages → Morel + Johnson
tables → Scorpion + Harland Sharp JSON → Trend → Fel-Pro LS card → BTR descriptions.

**Wave 1 — diesel, all A/B (≈7–9 days):** Industrial Injection → S&S → Hamilton → Fleece →
BD (CA mirror) → KC Turbos → Fluidampr → Cometic diesel pages → Wagler/Colt/Manton/Dynomite/Banks.

**Wave 2 — QA-heavy (≈8–10 days):** COMP cam application tables, ARP grid, Eagle PDF
cross-check, Cometic gas PDF, Icon detail pages, King SKU pages, Isky cams, Total Seal by bore.

**Vendor asks (one email each, in parallel):** Manley, Wiseco, JE, Diamond, Dart, Trick Flow,
AFR, Lunati, PAC, Texas Speed, Holley. Ask for a current catalog PDF or price-sheet export for
reference use with attribution. Manufacturers gain from accurate downstream data; several
already ship catalogs to distributors in Australia that host them publicly.

## 7. Rules carried forward

- Store facts only (PN, dimensions, fitment). Write our own descriptions. Cite source and edition
  per record. Facts are not copyrightable (*Feist*; *ATC Distribution*, 6th Cir. 2005).
- Honor robots.txt and Crawl-delay; one request at a time; descriptive User-Agent; never bypass
  a challenge. Edelbrock Group sites: PDFs only, no crawling.
- Fitment status vocabulary stays **no known conflict / possible conflict / known conflict**.
- Clevite stays shop-only; King is the public bearing source.
- The 3-source rule applies to any spec that drives a compatibility check; a single
  manufacturer catalog is authoritative for its own part numbers.
