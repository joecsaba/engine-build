# MAHLE Motorsport — extraction notes

Extracted 2026-10-16 by `scripts/parts-catalog/extract_mahle.py`.

## What was fetched

Two requests to `www.us.mahle.com` (robots.txt, then the PDF), 6 s apart, UA `engine-build.com catalog research (contact: joecsaba@gmail.com)`:
- GET https://www.us.mahle.com/robots.txt -> 200 197 bytes
- robots.txt: '*' group disallows ['/search', '/survey/']; crawl-delay None
- GET https://www.us.mahle.com/media/usa/motorsports/2026-mms-ap-guide-digital.pdf -> 200 2480138 bytes

robots.txt (`*` group) disallows only `/search` and `/survey/`, no Crawl-delay. The guide is one 44-page text PDF; no product pages were crawled. The PDF is kept in `dl/mahle/` (gitignored); `--offline` re-parses it without the network.

## What was parsed

PDF pages 6–34 (printed pages 1–29): every table line ending in a part number. 1189 rows parsed, 1080 in scope, 949 records. A record is one part number in one fitment family; a part number the catalog lists under several bore/stroke/rod combinations becomes one record whose `spec.stroke / rodLength / cr` are the first combination and `spec.applications` lists all of them.

Not extracted: pages 35–38 (ring sets, pins, rails, expanders: bore × description × PN tables, a possible follow-up as `ring` records), 39 (apparel), 40–44 (custom-order form, tech notes).

### Column mapping

Catalog columns: `Cubic Inches | Bore | Stroke | Rod | Comp Height | Pin Diam. | Crown Vol | Wght G | Compression Ratio (one column per chamber cc) | Alloy | Clearance Meas. | Min | Max | Guide Part No.`

- `Clearance Meas.` is where piston-to-wall clearance is measured (inches up from the bottom of the skirt), **not** a ring width; the feasibility sample had mislabeled it `ring_pack_in`. Stored as `spec.clearanceMeasure`, `clearanceMin`, `clearanceMax` (inches, over the skirt coating).
- Ring pack comes from the section header (`1.0, 1.0, 2.0mm File Fit Performance Ring Set Included`) → `spec.ringPack`, `spec.ringsIncluded`; diesel sections name the ring-set PN → `spec.ringSet`.
- Compression-ratio columns are keyed by the chamber cc printed in the section header: `spec.cr = {"58": 11.1, "64": 10.3, "70": 9.6}`. Sections that state their deck/gasket assumption carry it in `spec.crNote` (a per-combination override, e.g. Hemi 5.7 `3.800 / 6.125`, sits on that entry of `spec.applications`); otherwise the catalog default applies (zero deck, 0.040" gasket). NHRA-legal rows print `Dependent Upon Bore Size` → `spec.crDependsOnBore: true` and no `cr`; where one NHRA part number covers several bores, `spec.boreOptions` lists them.
- Continuation rows (CID, bore, weight, CR, PN only) inherit stroke / rod / CH / pin / crown volume / alloy / clearance from the previous full row (fill-down), as the catalog lays them out. Partial rows that restate only some columns are classified by count and magnitude (rod ≥ 5", stroke ≥ 3", CH < 3").
- Compression heights printed with `R` include oil support rails → `spec.oilSupportRails: true`; `B` (Top Alcohol Hemi) = pin retaining buttons → `spec.pinButtons`.
- `Crown Vol` → `spec.domeCc`: negative = dish / valve reliefs / diesel bowl, positive = dome.
- Stroke or rod printed as `3.480/3.500` → `spec.stroke` = first value, `spec.strokeOptions` = both (same for `rodLengthOptions`).
- Custom-order diesel rows (`made to order`) carry only bore, alloy and clearance → `spec.madeToOrder: true`.
- Sport-compact rows are metric; stored in inches (4 dp) with the catalog mm values in `spec.metric`.
- `spec.weight` = catalog `Wght G` (grams, per piston). `spec.note` = the row's `*`/`**` footnote (alloy, gas ports, hard-anodized groove, deck height). `fit.notes` = the section's factual sub-lines (head compatibility, pin honing, deck, drop-in notes) plus the sub-heading.
- `cat` is `piston` for every record (the brief's piston spec carries `ringPack`); `ringsIncluded: false` marks the sets sold without rings (NHRA-legal, Elite Sportsman, GM 604 crate).
- `emissions` is `null` (internal engine parts).

### Family mapping

- `BIG BLOCK CHEVY` sections are emitted under both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same pistons; the generations share bore spacing and deck heights). Drop one if the catalog consumer treats them as one family.
- `CUMMINS 5.9L ... 12V or 24V (Custom Order)` is emitted under both `Cummins 5.9 12V` and `Cummins 5.9 24V/CR`.
- `FORD 5.0L MODULAR ...`, `COYOTE`, `VOODOO` → `Ford Coyote`; `FORD MODULAR 4.6 / 5.4` → `Ford Modular`; `SMALL BLOCK FORD CLEVELAND` → `Ford 351C/351M/400`.
- `NHRA LEGAL COPO CAMARO` (LS-based 302 / 350 / 396 / 427) → `GM LS`; `GM 602 / 604 crate` → `Small-block Chevy`.
- `HEMI 5.7L` / `6.1L` → `Chrysler Gen III Hemi 5.7/6.1`; `6.4L` → `Chrysler Gen III Hemi 6.2/6.4`.
- `SMALL BLOCK MOPAR (LA) 340, 360` → `Mopar LA small block` only; not duplicated into `Mopar Magnum 5.2/5.9` (catalog requires aftermarket rods, Magnum fit not stated).
- Years (`fit.y0` / `y1`) only where the catalog states them: Cobra Jet and COPO model years, Coyote `2018+`, Olds `'65-67`, Cummins `03-04` / `04.5-07` bowls, Duramax LB7–LML = 2001–2016, L5P = 2017+.
- **Families not in the fitment list** (`fit.fam` = catalog heading; needs a decision): `Ford EcoBoost 1.6L`, `Ford EcoBoost 2.0L`, `Ford EcoBoost 2.3L`, `Ford Zetec 2.0L`, `Top Alcohol Hemi`.

## Rows per section (PDF page where the section starts)

| page | section | rows |
|---|---|---|
| 6 | SMALL BLOCK CHEVY FLAT TOP | 42 |
| 6 | SMALL BLOCK CHEVY 2bbl LIGHT WEIGHT FLAT TOP Asymmetrical Valve Pockets | 12 |
| 7 | SMALL BLOCK CHEVY HIGH OUTPUT 2bbl 22º/23º FLAT TOP Gasported / Asymmetrical Valve Pockets | 14 |
| 7 | SMALL BLOCK CHEVY 4-VALVE POCKET FLAT TOP | 4 |
| 7 | SMALL BLOCK CHEVY WISSOTA CONCEPT ENGINE | 4 |
| 7 | SBC 23° USRA Factory Stock Rules Forged Piston - PRESS-FIT Pin | 5 |
| 7 | GM 604 Crate Engine Drop-In Forged Replacement - PRESS-FIT Pin | 8 |
| 7 | GM 602 Crate Engine Drop-In Forged Replacement - PRESS-FIT Pin | 4 |
| 7 | SMALL BLOCK CHEVY 22º/23º FLAT TOP Gasported | 9 |
| 8 | SMALL BLOCK CHEVY 21° FLAT TOP Gasported / Asymmetrical Valve Pockets | 25 |
| 8 | SMALL BLOCK CHEVY 305ci FLAT TOP | 3 |
| 8 | SMALL BLOCK CHEVY 305ci FLAT TOP Gasported / Asymmetrical Valve Pockets | 4 |
| 9 | SMALL BLOCK CHEVY 23° DOME | 36 |
| 10 | SMALL BLOCK CHEVY 23° DOME Gasported / Asymmetrical Valve Pockets | 74 |
| 11 | SMALL BLOCK CHEVY 22° ASCS 360 SPRINT DOME Gasported / Asymmetrical Valve Pockets | 19 |
| 11 | SMALL BLOCK CHEVY INVERTED DOME | 29 |
| 12 | LS 5.3L FLAT TOP - compatible with LS1/2/6 style cathedral port heads | 11 |
| 12 | LS 5.3L DOME - compatible with LS1/2/6 style cathedral port heads | 14 |
| 12 | LS 5.3L DISH - compatible with LS1/2/6 style cathedral port heads | 2 |
| 12 | LS 5.3L (Gen 4) FLAT TOP DROP-IN FORGED REPLACMENT ASSEMBLY - compatible with LS1/2/6 style cathedral port heads | 3 |
| 12 | LS 5.7L FLAT TOP & DISH - compatible with LS1/2/6 style cathedral port heads | 15 |
| 13 | LS 6.0L FLAT TOP | 28 |
| 13 | LS 6.0L DISH | 19 |
| 13 | LS3 FLAT TOP TransAm TA2 Homologation Gasported | 3 |
| 13 | LS 6.2L FLAT TOP - Drop-In replacement and oversize for GM CT525 / DR525 Crate Engines | 3 |
| 14 | LS 6.2L FLAT TOP | 28 |
| 14 | LS 6.2L DISH | 19 |
| 14 | LS 6.2L DISH (LSA / LS9) - compatible with all LS Heads | 4 |
| 15 | LS 6.0L & 6.2L DOME - compatible with LS3 / L92 rectangular port heads | 12 |
| 15 | LS COMBO DOME - compatible with LS1/2/6 style cathedral port heads & LS3 / L92 style rectangular port heads | 8 |
| 15 | LS 7.0L FLAT TOP & DISH - compatible with LS7 style heads | 7 |
| 15 | LSX Large Bore FLAT TOP, DISH & DOME | 27 |
| 16 | LT 5.3L DI DROP-IN FORGED REPLACMENT ASSEMBLY NO BALANCING, NO COMP RATIO CHANGE | 3 |
| 16 | LT 6.2L FLAT TOP & DOME - compatible with GM LT1 / L86 / LT4 heads | 7 |
| 16 | LT 6.2L INVERTED DOME - compatible with GM LT1 / L86 / LT4 heads | 4 |
| 16 | NHRA LEGAL COPO CAMARO | 5 |
| 17 | BIG BLOCK CHEVY FLAT TOP (STD DECK 9.800) | 14 |
| 17 | BIG BLOCK CHEVY DOME (STD DECK 9.800) | 26 |
| 17 | BIG BLOCK CHEVY DISH (STD DECK 9.800) | 1 |
| 17 | BIG BLOCK CHEVY 502 MARINE “DROP IN” REPLACEMENT | 1 |
| 17 | BIG BLOCK CHEVY FLAT TOP (TALL DECK 10.200) | 17 |
| 18 | BIG BLOCK CHEVY DOME (TALL DECK 10.200) | 34 |
| 18 | BIG BLOCK CHEVY DISH (TALL DECK 10.200) | 2 |
| 18 | BIG BLOCK CHEVY ELITE SPORTSMAN DRAG SERIES 24°/25° | 24 |
| 19 | BIG BLOCK CHEVY ELITE SPORTSMAN DRAG SERIES 24°/25° | 24 |
| 19 | BIG BLOCK CHEVY ELITE SPORTSMAN DRAG SERIES 20° | 32 |
| 20 | SMALL BLOCK FORD FLAT TOP | 56 |
| 20 | SMALL BLOCK FORD SEALED RACE ENGINES | 11 |
| 21 | SMALL BLOCK FORD WISSOTA CONCEPT PISTON | 4 |
| 21 | SMALL BLOCK FORD FLAT TOP TransAm TA2 Homologation Gasported PowerPak Plus | 3 |
| 21 | SMALL BLOCK FORD DOME | 3 |
| 21 | SMALL BLOCK FORD INVERTED DOME | 46 |
| 22 | SMALL BLOCK FORD FLAT TOP for the TWISTED WEDGE® CYL HEAD | 7 |
| 22 | SMALL BLOCK FORD FLAT TOP for the TWISTED WEDGE® 11R CYL HEAD | 2 |
| 22 | SMALL BLOCK FORD CLEVELAND | 4 |
| 22 | FORD MODULAR 4.6 2-VALVE or 4-VALVE | 5 |
| 22 | NHRA LEGAL FORD MODULAR 5.4L 4-VALVE (2008, 2010, 2012 COBRA JET) | 3 |
| 22 | FORD MODULAR 5.4 2-VALVE or 4 VALVE | 5 |
| 22 | FORD 5.0L MODULAR 4-VALVE COYOTE | 2 |
| 22 | FORD 5.0L MODULAR 4-VALVE COYOTE / VOODOO (Combined Dome/Pocket Geometry) | 5 |
| 22 | FORD 5.0L MODULAR COYOTE Gen 3 Direct Injected (2018+) DROP-IN FORGED REPLACEMENT ASSEMBLY | 1 |
| 23 | FORD 5.0L MODULAR COYOTE Gen 3 Direct Injected (2018+) | 1 |
| 23 | NHRA LEGAL FORD 5.0L MODULAR 4-VALVE (2014, 2015 COBRA JET) | 7 |
| 23 | NHRA LEGAL FORD 5.0L MODULAR 4-VALVE (2016 COBRA JET) | 7 |
| 23 | FORD 5.2L VOODOO DROP-IN FORGED REPLACMENT ASSEMBLY NO BALANCING, NO COMP RATIO CHANGE | 1 |
| 23 | FORD GODZILLA 7.3L | 4 |
| 23 | BIG BLOCK FORD for Std Valve Location CYLINDER HEADS (FoMoCo, Edelbrock, TFS, Blue Thunder, Etc.) | 10 |
| 23 | BIG BLOCK FORD for the SCJ, KAASE P-51 / SR-71® & AFR 14° BULLIT CYLINDER HEADS | 15 |
| 24 | BIG BLOCK FORD for the KAASE BOSS NINE® CYLINDER HEAD | 4 |
| 24 | FORD FE FLAT TOP | 10 |
| 24 | FORD FE DISH | 11 |
| 24 | SMALL BLOCK MOPAR (LA) / 340, 360 FLAT TOP | 6 |
| 24 | SMALL BLOCK MOPAR (LA) / 340, 360 DISH | 6 |
| 24 | BIG BLOCK MOPAR (B) / 383, 400 FLAT TOP | 6 |
| 24 | BIG BLOCK MOPAR (RB) / 440 FLAT TOP | 9 |
| 25 | BIG BLOCK MOPAR (RB) / 440 DISH | 2 |
| 25 | HEMI 5.7L - compatible with all 5.7L and 6.1L heads | 14 |
| 25 | HEMI 6.1L DROP-IN FORGED REPLACMENT ASSEMBLY NO BALANCING, NO COMP RATIO CHANGE | 1 |
| 25 | HEMI 6.1L | 5 |
| 25 | NHRA LEGAL 6.1L HEMI | 3 |
| 25 | HEMI 6.4L DROP-IN FORGED REPLACMENT ASSEMBLY NO BALANCING, NO COMP RATIO CHANGE | 3 |
| 25 | NHRA LEGAL 6.4L HEMI | 1 |
| 25 | TOP ALCOHOL HEMI | 1 |
| 26 | SMALL BLOCK OLDSMOBILE 350 FLAT TOP | 2 |
| 26 | BIG BLOCK OLDSMOBILE 400E (early ‘65-67) FLAT TOP | 1 |
| 26 | BIG BLOCK OLDSMOBILE 425 FLAT TOP | 1 |
| 26 | BIG BLOCK OLDSMOBILE 455 Stroker DISH | 2 |
| 26 | BIG BLOCK PONTIAC 455 Stroker FLAT TOP | 4 |
| 27 | AUDI DAZA / DNWA RS3 TTRS 2.5L TURBO | 1 |
| 27 | BMW N14 1.6L MINI COOPER S | 1 |
| 27 | BMW M54 B30 3.0L E46 (0.005” oversize) | 1 |
| 27 | BMW N54 B30 3.0L | 4 |
| 27 | BMW S55 3.0L F80, M3, M4 | 1 |
| 27 | BMW B58 3.0L (2020+ Toyota Supra) | 1 |
| 27 | BMW S52 B32 3.2L E36 M3 | 1 |
| 27 | BMW S54 B32 3.2L E46 M3 | 6 |
| 27 | BMW S65 B40 4.0L | 4 |
| 27 | BMW S85 B50 5.0L (V10) | 4 |
| 28 | FORD EcoBoost 1.6L | 1 |
| 28 | FORD ST EcoBoost 2.0L | 4 |
| 28 | FORD Zetec 2.0L SCCA | 1 |
| 28 | FORD EcoBoost 2.3L | 4 |
| 28 | HONDA / ACURA B16, A1, A2, A3 DOHC VTEC 1.6L | 2 |
| 28 | HONDA / ACURA B18C1 DOHC VTEC 1.8L | 2 |
| 28 | HONDA / ACURA RSX K20 2.0L | 2 |
| 28 | HONDA / ACURA K24 2.4L | 5 |
| 28 | HONDA H22 GOLD SERIES 2.2L- FOR USE IN FACTORY FRM (FIBER REINFORCED MATRIX) CYLINDERS ONLY | 6 |
| 29 | HONDA S2000 F20C 2.0L GOLD SERIES - FOR USE IN FACTORY FRM (FIBER REINFORCED MATRIX) CYLINDERS ONLY | 4 |
| 29 | HONDA S2000 F22C 2.2L GOLD SERIES - FOR USE IN FACTORY FRM (FIBER REINFORCED MATRIX) CYLINDERS ONLY | 4 |
| 29 | MAZDA MZR 2.3L DISI | 4 |
| 29 | MITSUBISHI 4G63 2.0L 93-02 ECLIPSE 03-09 LANCER EVO | 5 |
| 29 | MITSUBISHI 4B11T EVO X 2.0L | 2 |
| 29 | NISSAN SR20DET (SILVIA) 2.0L | 2 |
| 29 | NISSAN RB25DET (SKYLINE) 2.5L | 1 |
| 29 | NISSAN RB26DETT (SKYLINE) 2.6L | 2 |
| 29 | NISSAN VR30DDTT | 1 |
| 30 | NISSAN VR38DETT (GT-R) 3.8L | 1 |
| 30 | NISSAN VR38DETT (GT-R) Stroker 4.1L | 1 |
| 30 | SUBARU 2.0L EJ20 | 5 |
| 30 | SUBARU 2.2L EJ20 STROKER | 5 |
| 30 | SUBARU FA20 TURBO | 2 |
| 30 | SUBARU WRX 2.5L STI, FORESTER, LEGACY | 6 |
| 30 | SUBARU WRX 2.5L STI, BOXED STRUT CONSTRUCTION | 3 |
| 30 | TOYOTA 2ZZ-GE (CELICA GT-S) 1.8L | 2 |
| 30 | TOYOTA 3S-GTE 2.0L 90-95 MR2 TURBO | 1 |
| 30 | TOYOTA 2JZ-GTE (SUPRA) 3.0L | 3 |
| 31 | VOLKSWAGEN/AUDI EA113 (95-2000) 1.8L TURBO | 1 |
| 31 | VOLKSWAGEN/AUDI B5 S4 2.7L 6-cyl. 5V Turbo | 1 |
| 31 | VOLKSWAGEN TFSi EA113 (2006-2009) 2.0L TURBO | 3 |
| 31 | VOLKSWAGEN TSi EA888 (2010+) 2.0L TURBO | 2 |
| 31 | VOLKSWAGEN TSi EA888 Gen 3 (2015-2018) 2.0L TURBO | 2 |
| 31 | VOLKSWAGEN VR6 3.2L 4V | 1 |
| 31 | VOLKSWAGEN BEETLE Type I, II, III | 4 |
| 32 | CUMMINS 5.9L B-Series Cast Performance Pistons - 12V | 6 |
| 32 | CUMMINS 5.9L B-Series Cast Performance Pistons - 12V w/ 0.150” deep valve pockets | 6 |
| 32 | CUMMINS 5.9L B-Series Forged Aluminum Race Pistons - 12V w/ 0.150” deep valve pockets | 6 |
| 32 | CUMMINS 5.9L B-Series Forged Aluminum Race Pistons - 24V w/ 0.100” deep valve pockets | 12 |
| 32 | CUMMINS 5.9L B-Series Forged Aluminum Race Pistons - 12V or 24V (Custom Order) | 3 |
| 32 | CUMMINS 5.9L B-Series Forged Steel MONOTHERM - 24V 03-07 Commonrail (using 04.5-07 Injectors) | 3 |
| 32 | CUMMINS 6.7L B-Series Forged Aluminum Race Pistons - 24V w/ 0.200” deep valve pockets | 3 |
| 33 | Ford 6.0L Powerstroke Cast Performance Pistons | 5 |
| 33 | Ford 6.0L Powerstroke Cast Performance Pistons - w/ 0.100” deep valve pockets | 5 |
| 33 | Ford 6.4L Powerstroke Cast Performance Pistons | 4 |
| 33 | Ford 6.4L Powerstroke Cast Performance Pistons - w/ 0.100” deep valve pockets | 4 |
| 33 | FORD 6.0L Powerstroke Forged Aluminum Race Pistons (Custom Order) | 3 |
| 33 | FORD 6.4L Powerstroke Forged Aluminum Race Pistons (Custom Order) | 3 |
| 33 | FORD 6.7L Powerstroke Forged Aluminum Race Pistons (Custom Order) | 3 |
| 33 | FORD 7.3L Powerstroke Forged Aluminum Race Pistons (Custom Order) | 3 |
| 33 | GM 6.6L Duramax Cast Performance Pistons | 3 |
| 33 | GM 6.6L Duramax Cast Performance Pistons w/ 0.075” Deep Valve Pockets | 3 |
| 34 | GM 6.6L Duramax L5P Cast Performance Pistons | 3 |
| 34 | GM 6.6L Duramax L5P Cast Performance Pistons w/ 0.075” Deep Valve Pockets | 3 |
| 34 | GM 6.6L Duramax Forged Aluminum Race Pistons w/ 0.075” Deep Valve Pockets | 3 |
| 34 | GM 6.6L Duramax Forged Aluminum Race Pistons (Custom Order) | 3 |

## Rows and records per family

| family | rows | records |
|---|---|---|
| Small-block Chevy | 292 | 229 |
| GM LS | 208 | 208 |
| Small-block Ford (Windsor) | 132 | 91 |
| Chevy Gen VI big block | 175 | 86 |
| Chevy Mark IV big block | 175 | 86 |
| Ford Coyote | 24 | 24 |
| Cummins 5.9 12V | 21 | 21 |
| Ford FE | 21 | 21 |
| Chrysler Gen III Hemi 5.7/6.1 | 23 | 18 |
| Cummins 5.9 24V/CR | 18 | 18 |
| Duramax 6.6 | 18 | 18 |
| Mopar B/RB big block | 17 | 17 |
| Ford 429/460 | 29 | 15 |
| GM LT (Gen V) | 14 | 14 |
| Powerstroke 6.0 | 13 | 13 |
| Mopar LA small block | 12 | 12 |
| Powerstroke 6.4 | 11 | 11 |
| Ford Modular | 13 | 6 |
| Oldsmobile V8 | 6 | 5 |
| Chrysler Gen III Hemi 6.2/6.4 | 4 | 4 |
| Ford 351C/351M/400 | 4 | 4 |
| Ford EcoBoost 2.0L | 4 | 4 |
| Ford EcoBoost 2.3L | 4 | 4 |
| Ford Godzilla 7.3 | 4 | 4 |
| Pontiac V8 | 4 | 4 |
| Cummins 6.7 | 3 | 3 |
| Powerstroke 6.7 | 3 | 3 |
| Powerstroke 7.3 | 3 | 3 |
| Ford EcoBoost 1.6L | 1 | 1 |
| Ford Zetec 2.0L | 1 | 1 |
| Top Alcohol Hemi | 1 | 1 |
| **total** | 1258 | 949 |

## Rows skipped

- 109 import sport-compact rows (PDF pp 27–31) parse cleanly but are not emitted: the brief's gas list stops at EcoBoost and the fitment family list has no import engines. `--include-imports` emits them with `fit.fam` = catalog heading. Sections: AUDI DAZA / DNWA RS3 TTRS 2.5L TURBO (1); BMW N14 1.6L MINI COOPER S (1); BMW M54 B30 3.0L E46 (0.005” oversize) (1); BMW N54 B30 3.0L (4); BMW S55 3.0L F80, M3, M4 (1); BMW B58 3.0L (2020+ Toyota Supra) (1); BMW S52 B32 3.2L E36 M3 (1); BMW S54 B32 3.2L E46 M3 (6); BMW S65 B40 4.0L (4); BMW S85 B50 5.0L (V10) (4); HONDA / ACURA B16, A1, A2, A3 DOHC VTEC 1.6L (2); HONDA / ACURA B18C1 DOHC VTEC 1.8L (2); HONDA / ACURA RSX K20 2.0L (2); HONDA / ACURA K24 2.4L (5); HONDA H22 GOLD SERIES 2.2L- FOR USE IN FACTORY FRM (FIBER REINFORCED MATRIX) CYLINDERS ONLY (6); HONDA S2000 F20C 2.0L GOLD SERIES - FOR USE IN FACTORY FRM (FIBER REINFORCED MATRIX) CYLINDERS ONLY (4); HONDA S2000 F22C 2.2L GOLD SERIES - FOR USE IN FACTORY FRM (FIBER REINFORCED MATRIX) CYLINDERS ONLY (4); MAZDA MZR 2.3L DISI (4); MITSUBISHI 4G63 2.0L 93-02 ECLIPSE 03-09 LANCER EVO (5); MITSUBISHI 4B11T EVO X 2.0L (2); NISSAN SR20DET (SILVIA) 2.0L (2); NISSAN RB25DET (SKYLINE) 2.5L (1); NISSAN RB26DETT (SKYLINE) 2.6L (2); NISSAN VR30DDTT (1); NISSAN VR38DETT (GT-R) 3.8L (1); NISSAN VR38DETT (GT-R) Stroker 4.1L (1); SUBARU 2.0L EJ20 (5); SUBARU 2.2L EJ20 STROKER (5); SUBARU FA20 TURBO (2); SUBARU WRX 2.5L STI, FORESTER, LEGACY (6); SUBARU WRX 2.5L STI, BOXED STRUT CONSTRUCTION (3); TOYOTA 2ZZ-GE (CELICA GT-S) 1.8L (2); TOYOTA 3S-GTE 2.0L 90-95 MR2 TURBO (1); TOYOTA 2JZ-GTE (SUPRA) 3.0L (3); VOLKSWAGEN/AUDI EA113 (95-2000) 1.8L TURBO (1); VOLKSWAGEN/AUDI B5 S4 2.7L 6-cyl. 5V Turbo (1); VOLKSWAGEN TFSi EA113 (2006-2009) 2.0L TURBO (3); VOLKSWAGEN TSi EA888 (2010+) 2.0L TURBO (2); VOLKSWAGEN TSi EA888 Gen 3 (2015-2018) 2.0L TURBO (2); VOLKSWAGEN VR6 3.2L 4V (1); VOLKSWAGEN BEETLE Type I, II, III (4).

## Needs human QA

- p25: part number '9299871' is not 9 digits as printed (line: `370 4.055 3.580 6.200 1.262 0.927 10.5cc 524 DEPENDENT 2618 0.250 0.0046 0.0054 9299871*`)
- PN 930200630 (Small-block Chevy): `cmin` differs between p6 (0.0025) and p6 (0.0003) — catalog inconsistency, first value kept
- PN 930200640 (Small-block Chevy): `cmin` differs between p6 (0.0025) and p6 (0.0003) — catalog inconsistency, first value kept
- PN 930200660 (Small-block Chevy): `cmin` differs between p6 (0.0025) and p6 (0.0003) — catalog inconsistency, first value kept
- PN 197740100 (Ford Modular): catalog lists one NHRA part number for bores [3.552, 3.572] (made to order, CR depends on bore); recorded as `spec.boreOptions`, `spec.bore` = first
- PN 197740100 (Ford Modular): catalog lists one NHRA part number for bores [3.552, 3.572, 3.622] (made to order, CR depends on bore); recorded as `spec.boreOptions`, `spec.bore` = first
- PN 197729300 (Chrysler Gen III Hemi 5.7/6.1): catalog lists one NHRA part number for bores [4.055, 4.06] (made to order, CR depends on bore); recorded as `spec.boreOptions`, `spec.bore` = first
- PN 197754775 p10: catalog CID 397 vs computed 424 (4.175 bore x 3.875 stroke x 8) — check row
- PN 930245140 (Small-block Ford (Windsor)): weight printed as [440, 441] g in different rows; first kept
- PN 930249540 (Small-block Ford (Windsor)): weight printed as [420, 438] g in different rows; first kept
- PN 197740100 p22: catalog CID 343 vs computed 330 (3.552 bore x 4.165 stroke x 8) — check row
- PN 197740100 (Ford Modular): weight printed as [364, 371, 389] g in different rows; first kept

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family; numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.

- passed
