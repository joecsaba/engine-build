# Parts Catalog — Extraction Tasks

Self-contained brief for a Claude Code session (cloud or local) that extracts one
manufacturer's catalog into the shared parts record format. Read this whole file, then do
the ONE task named in your prompt. Background and grades: `PARTS_CATALOG_FEASIBILITY.md`
at the repo root. Working parsers and sample rows from the feasibility probes are under
`scripts/catalog-probes/<probe>/scripts/` and `.../samples/`; start from them.

## Ground rules

- Fetch `robots.txt` first and obey it, including `Crawl-delay`. One request at a time per
  host, at least 6 seconds apart (more if robots says so). User-Agent:
  `engine-build.com catalog research (contact: joecsaba@gmail.com)`.
- Never retry or bypass a 403, Cloudflare "Just a moment", or Incapsula page. Record it and stop
  that source.
- Manufacturer sites only. Never fetch summitracing.com, jegs.com, speedwaymotors.com or any
  retailer. Edelbrock Group sites (compcams.com, lunatipower.com, edelbrock.com): use only the
  published PDFs on their S3 bucket; do not crawl product pages.
- Store facts only: part number, dimensions, fitment, source. Do not copy marketing text.
  Write nothing in `desc` that is longer than a short factual phrase.
- Downloads are untrusted. Save them under `scripts/parts-catalog/dl/<task>/` (gitignored),
  keep your code in `scripts/parts-catalog/`, run Python with `-I`, never execute a download.
- Python 3.12. `pip install requests beautifulsoup4 pdfplumber pymupdf` (use `-X utf8` for
  console output on Windows).

## Output

- Extractor: `scripts/parts-catalog/extract_<task>.py` (re-runnable, resumable if it crawls,
  writes nothing outside `dl/` and `out/`).
- Data: `scripts/parts-catalog/out/<task>.json` = `{ "source": {...}, "extracted": "<ISO date>",
  "count": N, "parts": [ record, ... ] }`.
- Notes: `scripts/parts-catalog/out/<task>.md`: what was fetched, how many pages/requests,
  row count per family, rows skipped and why, anything that needs human QA.
- Validate before finishing: no duplicate `p` within a brand, every record has `m p cat fit.fam
  src`, numeric fields are numbers (inches as decimals, cc as numbers), no empty strings.
- Finish with one git commit on the current branch:
  `Parts catalog: extract <Brand> (<N> parts)` and the trailer
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not open a PR.

## Record format

```json
{
  "m": "Scat",
  "p": "9-350-3750-6000",
  "cat": "crank",
  "name": "4340 forged crank, 3.750 stroke, 2.100 rod journal",
  "fit": { "fam": "Small-block Chevy", "ci": [383], "cyl": 8, "y0": 1986, "y1": 2002,
           "notes": "1-pc rear main seal" },
  "spec": { "stroke": 3.75, "rodJournal": 2.1, "mainJournal": 2.45, "material": "4340 forged",
            "balance": "internal" },
  "src": { "doc": "scatcrankshafts.com WooCommerce Store API", "edition": "2026-10",
           "url": "https://www.scatcrankshafts.com/product/..." },
  "emissions": null
}
```

`cat` values: `crank rod piston pistonKit rotatingAssembly ring bearing cam lifter pushrod
spring retainer rocker head intake carb efi header gasket headGasket fastener damper oilPump
timingSet injector injectionPump liftPump turbo intercooler manifold tuner oilCooler`.

`fit.fam` uses the same strings as `artifacts/engine-build/public/data/cam-fitment.json`:
`Small-block Chevy`, `Chevy Mark IV big block`, `Chevy Gen VI big block`, `Chevy W-series 348/409`,
`GM LS`, `GM LT (Gen V)`, `Small-block Ford (Windsor)`, `Ford 351C/351M/400`, `Ford FE`,
`Ford 429/460`, `Ford Modular`, `Ford Coyote`, `Ford Godzilla 7.3`, `Mopar LA small block`,
`Mopar Magnum 5.2/5.9`, `Mopar B/RB big block`, `Chrysler 426 Hemi`, `Chrysler Gen III Hemi 5.7/6.1`,
`Chrysler Gen III Hemi 6.2/6.4`, `Pontiac V8`, `Oldsmobile V8`, `Buick big block`, `Buick 350`,
`Buick V6 181-252`, `Cadillac 368-500`, `AMC V8`, `AMC/Jeep inline-6`, `Chevy inline-6`,
`Ford 240/300 inline-6`, `Mopar Slant Six`, and for diesel `Cummins 5.9 12V`,
`Cummins 5.9 24V/CR`, `Cummins 6.7`, `Duramax 6.6`, `Powerstroke 7.3`, `Powerstroke 6.0`,
`Powerstroke 6.4`, `Powerstroke 6.7`. If a part fits several families, emit one record per
family with the same `p`. Unknown family: put the catalog's own heading in `fit.fam` and flag
it in the notes file.

`spec` keys by category (inches unless noted; omit what the source doesn't give):

| cat | keys |
|---|---|
| crank | stroke, mainJournal, rodJournal, rodJournalWidth, material, balance, bobweight (g), rearSeal (`1-pc`/`2-pc`), snout, flywheelBolts, minRodLength |
| rod | length, bigEnd, pin, beam (`H`/`I`/`X`), material, bolt, weight (g) |
| piston | bore, stroke, rodLength, ch (compression height), pin, domeCc (negative = dish), alloy, weight (g), cr (object keyed by chamber cc, e.g. `{"64": 11.1, "70": 10.3}`), ringPack, valveReliefs |
| ring | bore, topWidth, secondWidth, oilWidth, material, style |
| bearing | position (`main`/`rod`/`cam`), journal, housing, undersize, series |
| cam | durAdvInt, durAdvExh, dur050Int, dur050Exh, lobeLiftInt, lobeLiftExh, valveLiftInt, valveLiftExh, rr (rocker ratio lift quoted at), lsa, icl, lash, type (`hydraulic_flat`/`solid_flat`/`hydraulic_roller`/`solid_roller`), rpmLow, rpmHigh, grind, lobeNoInt, lobeNoExh, kit (object: lifters, springs, pushrods, retainers, timingSet PNs) |
| lobe | lobeNo, durAdv, dur050, dur200, lobeLift, valveLift15, valveLift16, valveLift17, type |
| lifter | style (as cam type), bodyDia, rollerDia, linkBar (bool), travel |
| pushrod | diameter, wall, length, material, ends |
| spring | od, id, installedHt, coilBind, seatLb, openLb, rate, maxLift, dual (bool), damper (bool) |
| rocker | ratio, stud, type (`stud`/`shaft`/`pedestal`), material |
| head | chamberCc, intakeRunnerCc, exhaustRunnerCc, intakeValve, exhaustValve, maxLift, springDia, intakePattern, exhaustPattern, camType, hpRange, flow (array of `{lift, int, exh}` cfm at 28"), material, bare (bool) |
| intake | type (`dual-plane`/`single-plane`/`tunnel-ram`/`efi`), carbFlange (`square`/`spread`/`dominator`/`throttle-body`), rpmLow, rpmHigh, heightFront, heightRear, portMatch, egr (bool) |
| headGasket | bore, thickness, material (`MLS`/`composite`/`copper`), volumeCc, side (`L`/`R`) |
| fastener | application (`head stud`/`head bolt`/`main stud`/`rod bolt`/...), diameter, material, torque (ft-lb if given) |
| damper | diameter, balance, weight (lb), timingMarks |
| injector | pctOver, hpRating, nozzleFlow, tip |
| turbo | compressorInducer (mm), compressorExducer (mm), turbineWheel (mm), ar, wastegatePsi, vgt (bool), replacesOem, carbEo |
| liftPump | gph, psi, filtration |

`emissions`: `null` for internal parts. For injectors, turbos, tuners, intakes: `"oem_replacement"`,
`"carb_eo:D-xxx-xx"`, `"no_eo_race_only"` or `"unknown"`. Never record or link DPF/DOC/SCR/EGR
delete parts or delete tunes; skip them.

## Tasks

### SCAT  (grade A, ~½ day)
WooCommerce Store API: `https://www.scatcrankshafts.com/wp-json/wc/store/v1/products?per_page=100&page=N`
(public, not disallowed; ~1,000–2,000 products in `product-sitemap.xml` + `product-sitemap2.xml`).
Each item has `sku`, `categories`, `attributes` (Make, Engine, Type, Material, Rear Main Seal,
Balance, Snout, Stroke, Rod Length, Rod Journal, Crank Part #, Rod Part #...). Emit `crank`,
`rod`, `rotatingAssembly` (with component PNs in `spec`). Sample:
`scripts/catalog-probes/probe_rotating/samples/scat_store_api_sample.json`.

### MAHLE  (grade A-, 4–8 h)
PDF `https://www.us.mahle.com/media/usa/motorsports/2026-mms-ap-guide-digital.pdf` (44 pp, text).
Gas pistons: sections SBC, BBC, LS, SBF, Ford Modular/Coyote/Godzilla, BBF, FE, Mopar SB/BB,
Olds, Pontiac, EcoBoost. Diesel pistons pp 33–34 (Cummins, Duramax, Powerstroke 6.0/6.4).
`extract_text()` rows are regular: full rows end in the 9-digit PN; continuation rows inherit
stroke/rod/CH/pin/dome/alloy from the row above (fill-down). Keep the CR values at each chamber
cc from the column headers. Parser that already works:
`scripts/catalog-probes/probe_rotating/scripts/samples.py`; 99-row sample
`.../samples/mahle_powerpak_sample.csv`; diesel 69-row sample
`scripts/catalog-probes/probe_diesel/samples/mahle_diesel_pistons.csv`.

### CALLIES  (grade B, ½ day)
`https://www.callies.com/upcp_product-sitemap.xml` → 89 product pages. Crawl-delay 10.
HTML tables `Stroke | Main | Pins | Cammed for Rod Length | Part #` under series × engine family
(Compstar, Magnum, Ultra, Apex; SBC, BBC, LS/LT, SBF, BBF, Coyote, Modular, Gen III Hemi,
BB Mopar, Godzilla, Duramax, Cummins). Emit `crank` and `rod`. Sample
`.../probe_rotating/samples/callies_product_tables_sample.csv`.

### EAGLE  (grade B, 1 day code + ~13 h crawl; run LOCALLY, not in a cloud session)
`https://www.eaglerod.com/sitemaps/d109_a_1.xml` → 7,479 `/item/<id>-<slug>` pages, plain HTML
"Highlights" key:value list. 6 s per request. Resumable script required. Sample
`.../probe_rotating/samples/eagle_item_page_sample.json`.

### UEM  (grade B, 1–2 days)
`https://www.uempistons.com/rt-5-catalogs`: download the numerical listing PDF ("Listing Section")
whose `extract_tables()` is clean (`PART# | MFG | DISP | ROD | DESCRIPTION | RING PACK | PG`), then
the Icon catalog PDF for CH/dome/pin per PN (clip text to x<540, regex lines). Also the KB
hypereutectic PDF. Samples `.../probe_rotating/samples/uem_icon_*`.

### COMP  (lobes + springs grade A, cams grade B; 1–2 days)
PDFs only, from `https://edelbrock-files-v1.s3-us-west-1.amazonaws.com/catalogs/`:
`COMP-Lobe-Catalog.pdf` (180 pp, ruled; pdfplumber `lines` strategy gives full rows →
`lobe` records, ~2,060), `COMP-Catalog.pdf` (356 pp): springs master chart pp 298–307 (ruled,
one spring per column, loads at 11 heights → `spring`), cam application pages (shaded bands,
use `extract_words` x/y binning; columns: application, valve setting, RPM range, cam PN, grind,
adv duration, .050 duration, lift @1.5, LSA, then kit/lifter/timing/rocker/pushrod/spring/
retainer/lock/seal PNs → `cam` with `kit`). Samples `scripts/catalog-probes/probe_topend/samples/comp_*`.

### CROWER  (grade A, hours per make)
`https://crower.com/master-catalog` lists per-make 2025 cam PDFs (AMC, Buick, Chevrolet, Ford,
Mopar, Oldsmobile, Pontiac) plus `Spring_Booklet_2024_V3.pdf` and a roller-lifter PDF. Ruled
tables: `PN | CID | grind | LSA | adv in/ex | .050 in/ex | lift in/ex | option #`; the page's
"Option # / Lifters / Springs" table maps options to PNs; description has RPM range and redline.
Samples `.../probe_topend/samples/crower_*`.

### EDELBROCK  (heads grade A, intakes grade B; 1 day)
PDF only: `https://edelbrock-files-v1.s3-us-west-1.amazonaws.com/catalogs/2025-Edelbrock-Catalog.pdf`
(220 pp). Heads pp 88–110 and 126–134, ruled (Description | Chamber | Port Int/Exh | HP Range |
Exh Port Location | Valves | Cam Type | Max Lift | Spring Dia | Emissions | PN complete/bare).
Intakes pp 6–85: text rows (Year, Make, Engine, Carb Mount, RPM Range, heights, PN). Do NOT
fetch the flow-data web page (terms forbid robots); if
`scripts/parts-catalog/dl/edelbrock/flow-data.html` exists (saved manually), parse its 9 tables
into `head.spec.flow` and spring data. Samples `.../probe_topend/samples/edelbrock_*`.

### BRODIX  (grade A-, hours)
WordPress series pages under `https://brodix.com/heads-2/...` (~30 in the nav). Each has 3 tables:
specs (valves, spring PN, seat/open lb, installed height, max lift), flow chart (int/exh CFM by
lift), easy-order (PN, port cc, chamber cc, valves, seat pressure, spring dia, retainer). Emit
`head` with `flow`. Sample `.../probe_topend/samples/brodix_br3_head_page_tables.csv`.

### ISKY  (cams grade C, springs A; several days with QA)
`https://www.iskycams.com/wp-content/uploads/2025/08/IskyCatalog.pdf` (186 pp) and
`ISKY-Valve-Spring-Spec-Book.pdf`. Robots disallows ClaudeBot/GPTBot by name; our UA is not
listed, Crawl-delay only for meta-webindexer. Cam pages interleave prose and spec lines; parse
`PN grind RPMrange lift lash advDur dur050 LC` lines with QA. Samples `.../probe_topend/samples/isky_*`.

### LIFTERS  (Morel + Johnson, grade A, hours)
Morel: `https://www.johncalliesinc.com/morel_products.php`, 41 HTML tables
(`Set# | Pair# | BodyD | RollD | Description | Avail`). Johnson:
`https://www.johnsonlifters.com/Products/Hydraulic-Roller-Lifters` and `.../Solid-Roller-Lifters`
(PN, description, MSRP; no body dia). Samples `.../probe_topend/samples/{morel,johnson}_*`.

### ROCKERS  (Scorpion + Harland Sharp, grade A, hours)
Shopify `https://scorpionracingproducts.com/products.json?limit=250&page=N` and
`https://harlandsharp.com/products.json?limit=250&page=N`. Ratio and stud size by regex on
title/body; make from collections/tags. Samples `.../probe_topend/samples/*products_json_sample.json`.

### TREND  (grade A, hours)
`https://trendperform.com/files/trend-2019-catalog-pdf.pdf` p7 stocking table (diameter, wall,
length range); PN = prefix + length in .025" steps, generate SKUs. Sample
`.../probe_topend/samples/trend_stocking_pushrods_p7.csv`.

### ARP  (grade B/C, 2–4 days)
`https://cdn.arp-bolts.com/ARPCatalog.pdf` (180 pp). Application × 8 kit columns grid; cluster
`ddd-dddd` part numbers by x-position into columns (rod bolts pp 47–49, head studs 60–67, head
bolts 74–76, mains...). Do not call arp-bolts.com `/api/` (robots-disallowed). Sample
`.../probe_rotating/samples/arp_rod_bolts_p48_sample.csv`.

### COMETIC  (grade C, 2–4 days; website crawl-delay 30 so prefer the PDF)
`https://www.cometic.com/files/catalogs/CometicAB2026.pdf` (180 pp). PyMuPDF text is clean;
dotted-leader rows under engine headings: description, bore, thickness, qty, PN, retail. Gas and
diesel (16 diesel pages: PRO kits, MLX). Emit `headGasket` and `gasket`. Samples
`.../probe_rotating/samples/cometic_ab23_p37_sample.csv`.

### FELPRO  (grade A, 1 h)
`https://www.felpro.com/content/dam/marketing/North-America/felpro/pdfs/LS-Line-Card.pdf`
(2 pp, 23 PNs: bore, thickness, volume cc, side). Sample `.../probe_rotating/samples/felpro_ls_linecard_sample.csv`.

### INDUSTRIAL  (Industrial Injection, grade A, 1.5 days)
Shopify `https://www.industrialinjection.com/products.json?limit=250&page=N` (Crawl-delay 10 for
named bots; honor 10 s). Variants = % over with HP; fitment in tags (`cummins 2003 - 2004 5.9l`);
turbo wheel mm in body. Emit `injector`, `injectionPump`, `turbo`, `manifold` with `emissions`.
Skip apparel and heavy-duty. Samples `scripts/catalog-probes/probe_diesel/samples/industrial_injection_*`.

### SS  (S&S Diesel Motorsport, grade A-, ½ day)
`https://ssdiesel.com/wp-json/wc/store/v1/products?per_page=100&page=N` (bare host, the `www`
cert mismatches). Prices are integer cents. Variants are an "Application" attribute (% over).
Strip WPBakery shortcodes. Sample `.../probe_diesel/samples/ss_diesel_wc_store_api.csv`.

### HAMILTON  (grade A-, ½ day)
`https://hamiltoncams.com/wp-json/wc/store/v1/products?per_page=100` (51 products). Duration @.050,
RPM range and spring lb in description bullets; product pages have a Make/Model/Year table and
JSON-LD. Emit `cam`, `spring`, `pushrod`, `headGasket`, `fastener`. Sample
`.../probe_diesel/samples/hamilton_wc_store_api.csv`.

### FLEECE  (grade B, 1.5 days)
Magento, no JSON endpoint; clean `.html` URLs allowed, `/catalog/product/view/` disallowed.
Sitemap ~1,060 URLs; JSON-LD Product per page (sku, mpn, price); specs in description (wheel mm,
wastegate psi, RWHP, CARB EO number, replaced OEM PNs). Fitment PDF
`Fleece_and_Titan_Powerflo_Fitment.pdf` for lift pumps by cab/bed. Samples `.../probe_diesel/samples/fleece_*`.

### BD  (BD Diesel, grade A-, 1 day)
US hosts fail TLS chain verification; use `https://ca.bddiesel.com/products.json?limit=250&page=N`
(CAD prices: do not store prices). Fitment tags `2013/dodge-ram/ram-3500/6-7`. Emit `injector`,
`turbo`, `manifold`, with `emissions` (BD holds CARB EOs on several lines). Sample
`.../probe_diesel/samples/` (bddiesel products.json sample).

### KC  (KC Turbos, grade A-, ½ day)
Shopify `https://kcturbos.com/products.json?limit=250&page=N` (Crawl-delay 10). Wheel sizes and
A/R in text; variants by year/blade count. Powerstroke depth. Sample `.../probe_diesel/samples/kc_turbos_product.json`.

### CARRILLO  (grade A-, ¼ day)
`https://www.cp-carrillo.com/files/diesel-brochure-finalv3email.pdf`: rod tables (PN, bolt type,
pin, rod length) and hybrid piston+rod kits (bore, CR, dish, pin). 46 rows already parsed:
`.../probe_diesel/samples/carrillo_rods.csv`. Convert to records and note the brochure is undated.

### FLUIDAMPR  (grade B, ¼ day)
Platform pages on `https://www.fluidampr.com/` with one HTML key/value table per PN (diameter,
balance, fitment years). Store API is disabled. Sample `.../probe_diesel/samples/fluidampr_cummins.csv`.

### DIESEL-SHOPIFY  (Wagler, Colt Cams, Manton, Dynomite, Banks, ATS, Bullet Proof Diesel, Stainless, Smeding; grade A-/B, ¼–½ day each)
Each is Shopify `/products.json`. Specs are mostly in prose; extract what regex can get
(diameter/wall for pushrods, duration for cams, GPH/psi for pumps) and leave the rest out
rather than guessing. Banks tags carry `CA-Exclusion`; map to `emissions`.

## Cloud environment network allowlist

If this runs in a Claude Code cloud environment, its network access must be Custom (or Full)
with at least these hosts:

```
www.us.mahle.com
edelbrock-files-v1.s3-us-west-1.amazonaws.com
www.scatcrankshafts.com
www.callies.com
www.eaglerod.com
www.uempistons.com
uempistons.com
cdn.arp-bolts.com
www.cometic.com
crower.com
www.iskycams.com
brodix.com
www.briantooleyracing.com
www.johncalliesinc.com
www.johnsonlifters.com
johnsonlifters.com
scorpionracingproducts.com
harlandsharp.com
trendperform.com
www.felpro.com
www.industrialinjection.com
ssdiesel.com
hamiltoncams.com
www.fleeceperformance.com
ca.bddiesel.com
kcturbos.com
www.fluidampr.com
fluidampr.com
www.cp-carrillo.com
www.totalseal.com
store.totalseal.com
www.waglercompetition.com
www.coltcams.com
www.mantonpushrods.com
www.dynomitediesel.com
www.bankspower.com
www.atsdiesel.com
www.bulletproofdiesel.com
www.stainlessdiesel.com
www.smedingdiesel.com
```

The last nine (DIESEL-SHOPIFY) were missing from this list when the task was first run in a
cloud session: every host was refused by the environment's network policy (403 on CONNECT at
the egress proxy), so `extract_diesel_shopify.py` could not fetch and wrote no output. Add them
(or run the task locally) before rerunning that task.

## Manual PDFs (downloaded by the owner into `Catalogs/` at the repo root; LOCAL tasks, no network)

These sites block fetchers, so the catalogs were saved by hand. Extractors take `--pdf <path>`
and default to the file named below. Add `block` to the `cat` list for Dart/Trick Flow blocks
(spec: bore, maxBore, deckHeight, mainJournal, mainCaps, camBore, material).

### DART  (grade C, 1-2 days)
`Catalogs/DART VOLUME 23 - ISSUU - small.pdf` (2023, 126 pp). Heads are grouped under series
headings (`IRON EAGLE S/S 23 165cc`), then chamber/valve sub-headings (`72cc CHAMBERS -
1.940"/1.500" VALVES`), then text rows `<8-digit PN> <spring size> <description> <max lift>`.
Runner cc lives in the series heading, chamber cc in the sub-heading. Also blocks (SHP, Iron
Eagle, Little M, Big M) with bore/deck/main specs, and intakes. Emit `head`, `block`, `intake`.
Layout reference: `scripts/catalog-probes/probe_topend/samples/dart2019_thirdparty_p25_p27_textrows.csv`.

### JE  (grade B/C, 1 day)
`Catalogs/JE22_catalog_FINAL_all pages - V2 - 09.09.25.pdf` (2025 edition, 204 pp). Shelf
pistons by engine family: PN, bore, stroke, rod length, compression height, dome/dish cc, pin,
CR, ring pack. Same record shape as MAHLE (`extract_mahle.py` is the template). Skip the
powersports catalog.

### WISECO  (grade B/C, 1 day)
`Catalogs/Wiseco22_Auto_catalog_Final web.pdf` (2022, 220 pp). Same approach as JE.
Skip the powersports catalog.

### PAC  (grade A/B, half day)
`Catalogs/PAC_CATALOG_VOL_24_05.06.24 REVISED ISSUU.pdf` (2024, 56 pp). Valve springs: PN,
OD, ID, installed height, seat and open loads, rate, coil bind, max lift, dual/beehive/conical;
plus retainers, locks, seats. Emit `spring`, `retainer`. Fitment is usually "Universal" unless a
page names an engine or head.

### TRICKFLOW  (grade B, 1 day)
`Catalogs/TrickFlow-PRI-Catalog_26.pdf` (2026, 80 pp) plus `Catalogs/tfs_dealer_sheets_rev12.pdf`
(2017 dealer spec sheets, 12 pp; flow tables). Heads (chamber, runner, valves, max lift, flow),
intakes, top-end kits, cams, rockers, pushrods, blocks. Trick Flow is Summit-owned; the PDF is
the only sanctioned source.

### LUNATI-RA  (grade B, half day)
`Catalogs/Lunati-Rotating-Assemblies.pdf` (2013, 36 pp). Cranks, rods and rotating assemblies
by family, like Scat. Emit `crank`, `rod`, `rotatingAssembly`. Note the edition is 2013.

### EAGLE-PDF  (grade C, 1-2 days; replaces the 13 h web crawl)
`Catalogs/ACFrOgCQO6X8rCjLnqlbaAuBcHoKeYOowo2zFNkrAXH048tiispxaf26zLoo9EEh8CJtb8Zjdhq1CwnznBj5pc8h6RUHhwHhWw7xv_MQ6Qvmp08PROhnTSweLqu8BPPnIL8v9_lFA4pBJ1Rek34C.pdf`
= Eagle Specialty Products 2024 rev. 4 catalog (92 pp, text). Cranks, rods, rotating assemblies
by family (SBC, BBC, LS, SBF, FE, BBF, Modular/Coyote, Mopar, Pontiac, Olds, Buick, AMC).
Sample: `scripts/catalog-probes/probe_rotating/samples/eagle_ls_assemblies_p28_sample.csv`.

### MAHLE-PERF  (grade B, half day each)
`Catalogs/pr-40-22.pdf` = MAHLE Aftermarket Performance Piston Rings 2022 (84 pp): ring sets by
bore, widths, material/face; emit `ring`. `Catalogs/ga-40-22_web.pdf` = MAHLE Performance
Gaskets 2022 (63 pp): head gaskets by engine with bore/thickness, intake and valve-cover
gaskets; emit `headGasket`, `gasket`.

### HELD / OUT OF SCOPE (also in `Catalogs/`)
- `eb-20-26_web.pdf` MAHLE/Clevite Engine Bearings light vehicle 2026 (1,007 pp): **held**.
  Project rule: Clevite crank/bearing specs are shop-tool only, never on the public site.
  Needs an explicit owner decision before any extraction for the public catalog.
- `pr-20-19.pdf` (OE piston rings 2019, 247 pp), `ga-21-17.pdf` (OE gaskets 2017, 1,080 pp),
  `ga-20-26_web.pdf` (gaskets 2000+, 52 pp): OE-replacement catalogs; low value for the
  planner, skipped for now.
- `ap-37-16-hd-commercial-vehicle-catalog.pdf`, `overhaul-and-in-frame-engine-kits-listing-hd-1-224.pdf`,
  `ap-90-12-web-final.pdf`, `th-20-16.pdf`: heavy-duty truck and thermostat catalogs, out of scope.
- `product-catalog.pdf` = KB Performance Pistons 2015: scanned images, no text layer (grade D).
- `ISKY-Master-Lobe-List.pdf`: scanned, no text layer (grade D).
