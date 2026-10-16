# Cometic 2026 automotive catalog — extraction notes

Task `COMETIC` from `scripts/parts-catalog/CLOUD_TASKS.md`. Extractor:
`scripts/parts-catalog/extract_cometic.py`. Output: `scripts/parts-catalog/out/cometic.json`.
Extracted 2026-10-16.

## Source and fetching

- `https://www.cometic.com/robots.txt` (HTTP 200): `User-agent: *`, `Crawl-delay: 30`, nothing
  disallowed. The website was not crawled (the brief says prefer the PDF; 30 s per request).
- `https://www.cometic.com/files/catalogs/CometicAB2026.pdf`: HTTP 200, `application/pdf`,
  47,308,751 bytes, `Last-Modified: Tue, 09 Dec 2025 14:49:22 GMT`, sha256
  `a6b098769b8d2325025ecb109dfa01019659bec66093e1dcb751d2e9b068e29d`. 180 letter pages, all with
  a text layer; InDesign 20.5, CreationDate 2025-11-07, ModDate 2025-11-07. Printed page numbers
  are PDF page − 5 (`src.page` is the PDF page, `src.printedPage` the printed one). Saved under
  `scripts/parts-catalog/dl/cometic/` (gitignored) with the response headers and robots.txt.
- Requests: 4 in total to `www.cometic.com`, one at a time, ≥30 s apart, project UA: robots.txt
  and the PDF once by hand (curl) to study the layout, then the hand-fetched copy was deleted and
  the extractor fetched robots.txt and the PDF itself (robots check, 30 s crawl-delay sleep);
  both downloads have the same sha256. No 403 / Cloudflare pages. No other hosts touched.
- Environment note: PyPI is unreachable from the cloud sandbox, so PyMuPDF could not be
  installed. The extractor takes word boxes from PyMuPDF when importable, otherwise poppler
  `pdftotext -tsv` (what produced the committed data: poppler 24.02.0), otherwise pdfplumber
  (works but ~15 s/page on this image-heavy file). Font-size thresholds are relative to each
  page's data-row box height, so the three backends should classify headings the same way;
  re-check the row count if a different backend is used.

## What was parsed

**Domestic section only, PDF pages 20–89 (printed 15–84: AMC, Buick, Cadillac, Chevrolet/GM,
Chrysler/Dodge, Cummins, Ford, Oldsmobile, Pontiac)**, plus the StreetPro diesel kit table on
PDF page 12 (printed 7) which is the only place the diesel kits' head-gasket bore / thickness /
series are stated. The import section (pages 90–177) is behind `--imports`; see below. Pages 10–11
(retail line: SBC/BBC/LS exhaust sets, carb gaskets, hardware), 13 (ProPack 10/20-pack bulk SKUs
`CP####`), 14–19 (generic timing-cover sets, rear main seals, ATI damper o-rings, crank seals,
transmission/turbo/carburetor/differential gaskets, valve-cover and valve-stem seals by dimension)
and 178–179 (Fel-Pro cross reference) were not parsed. The timing-cover sets and rear-main seals
on p14 are the same PNs that reappear under each engine, so nothing engine-specific is lost
except the hardware and the by-dimension seals.

Page structure: MAKE (large font) → engine heading (medium font, wraps, "(continued)") → section
heading centred on the page (`Head Gaskets` | `Individual Gaskets` | `Gasket Kits`) → small
tables, each a centred title, a `Bore Thickness Pkg Qty Part No. Retail` or
`Application Part No. Retail` header line and rows. Tables are found from their header lines;
every word is assigned to a table by x-range and y-span (two columns, titles end the table
above); rows are anchored on the part number with wrapped description lines attached to the
nearest part number (≤13 pt). Prices are read but not stored.

| Source | Tables | PNs → records | cat |
|---|---|---|---|
| Head gasket tables (bore/thickness rows) | 302 | 653 records | `headGasket` |
| Individual gasket tables | 428 | 622 records | `gasket` |
| Top / bottom end kit tables (`PRO####T/B`) + p12 StreetPro diesel table (24 rows, 1 new PN) | 73 + 1 | 106 records | `gasket` (`spec.kit`) |
| **Total** | | **1,381 records, 1,251 distinct PNs** | |

Completeness check: every token set in the part-number font on pages 20–89 (1,252 distinct)
is in the output except the two `Cylinder Head Dowels` PNs (C15147, C15148, p84–85), skipped on
purpose as hardware. Rows skipped: only those. Stray (unassigned) words: the "(*has steam
holes)" / "(continued)" suffixes of the SBC engine heading on p26–27, nothing else.

102 duplicate (PN, family) listings were merged: the same gasket printed under several engine
pages of one family (LS1/LS2/LS3, LS7, LS9, LSX all list C5170 etc.), the Jeep 4.0L page printed
under both AMC and Chrysler, continued pages, and 15 same-page repeats. The first record is
kept; the other listings' fitment notes are unioned, the year span widened (a bound missing on
either listing stays open), `ci` unioned, and the other pages recorded in `src.alsoPages`.

Validation (brief rules) passes: no duplicate `p` within a family, all records have
`m p cat fit.fam src`, inch/cc/mm values are numbers, no empty strings.

## Records per family

35 planner families (1,072 records) and 63 catalog headings with no planner family
(309 records, `fit.fam` = `MAKE: catalog heading`, see QA list).

| fit.fam | headGasket | gasket | total |
|---|---|---|---|
| Small-block Chevy | 43 | 69 | 112 |
| GM LS | 56 | 49 | 105 |
| Small-block Ford (Windsor) | 47 | 45 | 92 |
| Chevy Mark IV big block | 35 | 35 | 70 |
| Chevy Gen VI big block | 32 | 38 | 70 |
| Chrysler Gen III Hemi 5.7/6.1 | 49 | 19 | 68 |
| Ford Modular | 28 | 33 | 61 |
| Chrysler Gen III Hemi 6.2/6.4 | 47 | 13 | 60 |
| Mopar LA small block | 24 | 30 | 54 |
| Ford Coyote | 34 | 12 | 46 |
| Cummins 5.9 24V/CR | 2 | 20 | 22 |
| Duramax 6.6 | 7 | 14 | 21 |
| Mopar B/RB big block | 8 | 13 | 21 |
| Chrysler 426 Hemi | 6 | 14 | 20 |
| Ford FE | 6 | 14 | 20 |
| Pontiac V8 | 10 | 10 | 20 |
| Ford 429/460 | 7 | 11 | 18 |
| Buick V6 181-252 | 7 | 10 | 17 |
| Cummins 6.7 | 4 | 12 | 16 |
| Powerstroke 6.4 | 3 | 13 | 16 |
| Cummins 5.9 12V | 1 | 14 | 15 |
| Oldsmobile V8 | 4 | 11 | 15 |
| Buick big block | 3 | 11 | 14 |
| Mopar Magnum 5.2/5.9 | 3 | 11 | 14 |
| AMC V8 | 6 | 6 | 12 |
| Ford 351C/351M/400 | 1 | 11 | 12 |
| Powerstroke 6.0 | 2 | 10 | 12 |
| Powerstroke 7.3 | 2 | 10 | 12 |
| GM LT (Gen V) | 6 | 5 | 11 |
| Powerstroke 6.7 | 4 | 3 | 7 |
| Chevy W-series 348/409 | 3 | 3 | 6 |
| AMC/Jeep inline-6 | 3 | 2 | 5 |
| Ford Godzilla 7.3 | 2 | 2 | 4 |
| Chevy inline-6 | 1 | 2 | 3 |
| Buick 350 | 1 | 0 | 1 |

Head gaskets by series: MLS 396, MLX 196, DST 40, copper 14, HP 6, "ML" 1 (p40, DRCE/Pro Stock
page, kept as printed). 274 are handed (R 138 / L 136). 143 have a metric bore (`boreMm`,
converted to inches in `bore`). 7 carry the catalog's `*` = "has steam holes" (SBC).

Individual gaskets by `spec.type`: exhaust manifold 121, intake manifold 120, valve cover 64,
water pump 59, oil pan 54, timing cover 41, rear main seal 37, carburetor/throttle body 21,
valve stem seal 19, fuel pump 16, oil pump 13, thermostat 10, distributor 9, pushrod cover 5,
valley pan 4, exhaust pipe 4, oil cooler 4, timing cover seal 4, fuel injector seal 3, front
crank seal 3, HPOP 3, cam seal 2, and one each of seal/o-ring kit, cam plate, knock sensor
grommet, oil filter adapter, turbo mounting, oil cooler mounting. Kits: 61 top end, 45 bottom end.

## How fields were derived

### Fitment

`fit` comes from the engine heading via a hand-written map of all 150 domestic headings
(`ENGINES` in the extractor): family string, `ci` (the displacements the heading names; for
"18/23 Degree Small Block V8 262-400ci" the common 283/302/305/327/350/400 list), `cyl`, and
`y0`/`y1` from the heading's years. Sub-families are kept in `fit.notes` ("Gen-2", "5.2L Voodoo",
"24v VP44 1998.5-02", "LSX race block, 6-bolt"). Head-gasket table titles contribute the
application after the series ("Vortec Head", "Brodix BD2000", "non SVO Round Bore", "Mercury
8.1L 496"), any "Fits: …" line and the side notes printed next to the table ("Fits standard
7/16 studs, and 1/2" studs") to `fit.notes` and the record name. For individual gaskets and
kits a year range in the catalog description ("1986-02 Center Bolt", "6.6L Duramax 2001-04",
"97-05 5.7L"; two-digit years ≥30 → 19xx) overrides the heading's years (467 records); "Up" /
"Present" leaves `y1` open.

Two catalog pages serve two planner families and are emitted once per family with the same
`p`: "Big Block V8 - Aftermarket, Race, & Marine Blocks" → `Chevy Mark IV big block` and
`Chevy Gen VI big block` (49 PNs each); "DART Hemi Gen3 Iron Eagle Block" → both Gen III Hemi
families (27 PNs each).

### Head gaskets (`headGasket`)

`bore` (inches; `100mm` → `boreMm: 100`, `bore: 3.937`), `thickness`, `pkgQty` (635 of 653
rows print it), `material` = `MLS` for the MLS / MLX / HP / DST / ML series and `copper` for the
copper series, `construction` = the catalog series, `side` R/L from the title ("Right Side",
"RHS", "Right Hand Side"; `fit.notes` gets "one per bank"), `steamHoles: true` for `*` rows.
Name: "MLX head gasket, 4.000 bore, .040 thick, left, <application>".

### Individual gaskets (`gasket`)

`spec.type` is mapped from the table title (28 keyword rules, all 428 titles mapped);
`set: true` when the title says Set/Kit, `soldIndividually: true` for "(sold individually)".
From the description text, where present: `portWidth` × `portHeight` ("1.754” x 2.505”",
width × height assumed as in the Fel-Pro file), `portDia` ("1.920” Round"), `thickness`
(".060”"), `material` (the catalog's own code: MLS, KF, AM, AFM, HTS, Fiber, Molded Rubber, SN,
Viton, Silicone, Graphite, FC — only MLS/HTS/AFM/Fiber/Copper are defined on the catalog's
materials pages; KF, AM, SN, FC are not), `qtyRequired` ("Req 2", "need 16"). `spec.desc` keeps
the catalog's application phrase (max 72 characters) and the name is "<type> gasket, <desc>".

### Kits (`gasket`, `spec.kit`)

`PRO####T` → `kit: "top end"`, `PRO####B` → `"bottom end"`. Every top-end kit gets
`headGasketIncluded: true`, `headGasketMaterial: "MLS"` (Cometic's kit definition on p7/p12;
all top-end descriptions that mention a gasket name an MLS/MLX head gasket). `bore` from
"4.275” Bore" / "96mm Bore" in the description. For the 24 diesel kits the p12 StreetPro table
adds `headGasketThickness`, `headGasketConstruction` (MLS/MLX) and `dowelsMm` (6.0 Power Stroke
18 mm vs 20 mm kits). PRO3011T (LMM/LLY Duramax top end) is only on p12 and is emitted from
there with its own fitment map.

`src` = `{doc, edition: "2026 (PDF created 2025-11-07)", url, page, printedPage[, alsoPages]}`;
`emissions` is `null` for all.

## Needs human QA

1. **63 catalog headings have no planner family** (309 records, `fit.fam` = "MAKE: heading"):
   Ford Flathead V8 (37), Chrysler 392 early Hemi (16), Cummins 3.9L 4BT (15), Ford 2.3L "2300"
   (15), Ford Pro Stock V8 (15), Chrysler 2.0L DOHC 420A (14), Chevrolet 4.3L 262 V6 (13), Viper
   V10s (28 across four headings), Chevrolet Pro Stock / DRCE (11), Ford 2.0L Zetec (17), Ford
   Y-Block (10), Ecotec/Duratec/EcoBoost/Northstar/Pentastar/PowerTech 4.7/3.7, GM 60° and
   High-Feature V6s, Cadillac LTG, LT6 5.5L, Ford 6.2L Raptor, 6.8L V10, FR9/RY45/R07 race
   engines, Olds J-2, 6.5L GM diesel, Polyspherical 318. Add families to `cam-fitment.json` or
   leave them unmapped; the 4BT and the V10s are the ones most likely to be wanted.
2. **Family choices worth a look**: Buick 3800 Series II/III → `Buick V6 181-252` (ci 231);
   LT1/LT4/L8T page → `GM LT (Gen V)` with ci [376, 400]; L83 → `GM LT (Gen V)` ci 325;
   "7.0L Hemi Drag Pak" → `Chrysler Gen III Hemi 6.2/6.4` ci 426; Mopar A8/A4 and R3/R4/R6 race
   blocks → `Mopar LA small block`; LSX race block pages → `GM LS`; the dual-family pages above.
   Gen 5/6 BBC is a single catalog page mapped to `Chevy Gen VI big block` (notes "Gen 5/6").
3. **Ten head-gasket rows print a thickness that disagrees with the PN suffix** (recorded as
   printed; the suffix normally encodes the thickness): C15758-054 and C15757-054 (.040”,
   p52 Dart Hemi), C5210-045 / C5211-045 (.040”, p57 Viper), C15556-054 / C15557-054 (.052”,
   p69 4.6/5.4 Modular), C5018-051 (.030”), C5857-040 / C5859-040 (.030”, p74 Darton-sleeve
   Modular), C15400-049 (.040”, p82 Ford 429/460). Likely catalog typos in one of the two columns.
4. **PRO3007T bore**: the 6.4L Power Stroke page says "99mm Bore", the p12 StreetPro table says
   "103mm Bore". The engine-page value (3.898) is stored and the p12 value is in `fit.notes`.
5. **`fit.ci` lists** are the displacements the catalog heading names (or the common SBC list),
   not a statement that every PN fits every displacement; bore in the head-gasket row is the
   real selector. The "Fits: …" sub-lists on the AMC V8 page (290/304/343/360 vs 390/401 vs
   INDY 401) are in `fit.notes` only.
6. **Year overrides from descriptions** are regex-derived ("1986-02", "97-05", "2001-10 4.8/5.3L");
   spot-check a few kits. Strings like "1998.5-02" and "2007.5-18" are not parsed (the heading
   years apply).
7. **`material` codes KF, AM, SN, FC** on individual gaskets are the catalog's abbreviations and
   are not defined in its materials pages; MLS/HTS/HTG/AFM/Fiber/MP/Copper are.
8. **Spec keys outside the brief's tables**: `construction`, `pkgQty`, `boreMm`, `steamHoles` on
   head gaskets; `type`, `set`, `soldIndividually`, `portWidth`, `portHeight`, `portDia`,
   `qtyRequired`, `desc`, `kit`, `headGasketIncluded`, `headGasketMaterial`,
   `headGasketThickness`, `headGasketConstruction`, `dowelsMm` on `gasket` records (`kit` /
   `headGasketIncluded` follow the Hamilton / Fel-Pro convention).
9. **Imports** (`--imports`, PDF pages 90–177) were trial-run but not committed: 2,717 records,
   312 catalog headings, 28 skipped rows (CFM-20 / rubber-coated-stainless head-gasket titles
   now recognised, "PRO####C" complete kits now recognised, a few "0.03”" / "040”" thickness
   typos). None of those engines are planner families; enable only if the catalog is wanted
   whole.
10. The brief's probe sample (`cometic_ab23_p37_sample.csv`, from the 2023 catalog) listed "SEG"
    head gaskets for the Hellcat / Apache; the 2026 edition no longer has an SEG series (the
    Hellcat page now lists MLS, MLX and DST).
