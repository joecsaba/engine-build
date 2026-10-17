# JE Pistons / SRP — extraction notes

Extracted 2026-10-16 by `scripts/parts-catalog/extract_je.py` from `Catalogs\JE22_catalog_FINAL_all pages - V2 - 09.09.25.pdf` (local file, no network).

## What was parsed

PDF pages 13–109 (printed page numbers are the same), skipping [32, 46, 58, 62, 64, 85, 86] (chapter intros, the NHRA Stock Eliminator PN list, SRP marketing). 3347 table rows parsed into 3082 records (JE: 1688, SRP: 1394). A record is one part number in one fitment family; a part number printed under several stroke/rod rows (e.g. 207419, 258200) becomes one record whose `spec.stroke / rodLength / cr / deckHeight` are the first row and `spec.applications` lists all rows.

Not extracted: p62 NHRA Approved Stock Eliminator (PN / model / year / HP / CID only, two interleaved columns, no dimensions); pp 110–153 sport compact / European (no fitment family in the list); pp 154–203 rings, pins, locks, gaskets, apparel, order forms. The separate powersports catalog is ignored per the brief.

### Column mapping

Catalog columns: `Part # | Cubic Inches | Bore Size | Stroke | Rod Length | Block Height (or Deck Dist.) | Comp. Distance | Compression Ratio at <chamber cc>... | Dome Volume | Gram Weight | [Deck Clearance] | Footnote | Oversize | [engine] | Recommended Ring Set | Pro Seal Head Gasket`. SRP Professional / SRP tables have no Block Height column; Top Fuel / Blown Alcohol rows carry only bore, CH, weight and ring set.

- `spec.bore`, `stroke`, `rodLength`, `ch` (Comp. Distance), `domeCc` (Dome Volume: negative = dish / inverted dome, positive = dome), `weight` (grams) are the printed values. `spec.oversize` is the Oversize column (`STD` = 0). `spec.stdBore` is the sub-heading's `Std Bore:` when it names one bore.
- The Block Height column prints either the block deck height the CR was computed at (→ `spec.deckHeight`, e.g. 9.240 LS, 9.000/9.020 SBC, 9.780/10.180 BBC) or a signed piston-to-deck distance (`+.009` → `spec.deckDistance`, positive = crown above deck).
- Compression ratios are keyed by the chamber cc read from the rotated column header (PyMuPDF words between `Head Cubic Centimeters` and `Compression Ratio`): `spec.cr = {"64": 10.6, "68": 10.1, "70": 9.9}`. Headers that label the chambers (`42cc = (99+ PI 2V)`) are kept in `spec.crNote`. Tables that continue under a new sub-heading without a header inherit the previous chamber list.
- `spec.pin`: from the `.927 Pin` / `.945 Pin` footnote text, from footnote letters (C .927, D .912, E .990, H 1.094, K .945, P .975; F = 1.040 only in traditional domestic sections where the section's listed pins allow it, because JE also uses F for FSR), from the sub-heading `Pin Dia:`, or from the pin part number in the section's `Includes:` lines when that section names exactly one pin diameter (`Pin #927-2250-15-51C` → .927). Sections that list two pins (LS with .945 for 6.098 rods and .927 for 6.125 rods) get no pin unless the row says so.
  Pin sources over the records: {'footnote': 478, 'none': 2119, 'section pin part number': 413, 'sub-heading': 72}.
- `spec.alloy`: `2618` footnote or a section/sub-heading statement (`426 SERIES (4032 ALUMINUM ALLOY)`, `Forged from 4032 ...`) when present; otherwise the catalog's series default — JE shelf pistons 2618 (p9 'Shelf piston terminology', p3 Ultra Series), SRP and SRP Professional 4032 (p64 'The SRP difference'). Sources over the records: {'series default': 2138, 'section': 609, 'footnote': 335}. Treat `series default` as catalog-level, not row-level, information.
- `spec.ringPack` is the sub-heading's `Ring package designed for:` (`1/16, 1/16, 3/16`, `1.2, 1.5, 3.0mm`, `.043, .043, 3.0mm`); `spec.ringsIncluded` only when the section says so (SRP Professional: included; SRP: sold separately; JE: not stated → omitted). `spec.ringSet` / `spec.headGasket` are the recommended JE Pro Seal part numbers (two-line left/right Modular gaskets become a list).
- Footnotes → `spec.oilSupportRails` (B), `madeToOrder` (M), `limitedQuantity` (L), `strokeOptions` (A = fits 3.480 and 3.500), `series` (Ultra / SRP Pro 2618), other letters (J, S, T, V, W, X, BL, FSR) as text in `spec.note`.
- NASCAR 'any bore, made to order' rows (`265258 **`) have no bore: `spec.boreRange` = the bore span from the section note, `madeToOrder: true`.
- `cat` is `piston` for every record; the catalog sells no piston+rod kits (Boostline 'combo kits available' is only a footnote). `m` is `JE` for pp 13–63 and `SRP` for the SRP Professional / SRP chapters (JE-owned brand; flip `brand_for()` if one brand is preferred). `emissions` is `null`.

### Family mapping

- Heading keywords first (LS/LT/Vortec → `GM LS` / `GM LT (Gen V)`; 440 / 383 wedge → `Mopar B/RB big block`; S/B Chrysler, 318/340/360, W-2 → `Mopar LA small block`; Hellcat / 6.2L / 6.4L Hemi → `Chrysler Gen III Hemi 6.2/6.4`; 426 Hemi; Cleveland; FE; 460 → `Ford 429/460`; Boss 302 / Windsor / 331-347 / 351W / Twisted Wedge → `Small-block Ford (Windsor)`; Coyote / Voodoo → `Ford Coyote`; Modular / GT500 5.8 / 6.2 SOHC → `Ford Modular`; Pontiac; Oldsmobile; Buick Grand National → `Buick V6 181-252`), then the catalog chapter (table of contents page ranges) for headings like `23º TOUR SERIES GP` or `EDELBROCK® DOME`.
- Big-block Chevy sections are emitted under both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same convention as MAHLE; drop one if the consumer treats them as one family).
- `FORD 2013-2014 GT500 MODULAR 5.8L` and `FORD 2010-2017 MODULAR SOHC 6.2L` follow the catalog into `Ford Modular`; the 6.2 'Boss' is not a true Modular — decide whether it needs its own family.
- Years only where the heading states them (Coyote 2011-2017 / 2018+, GT500 2013-2014, 6.2L 2010-2017, EcoBoost 2010-2017 / 2017+).
- **Families not in the fitment list** (`fit.fam` = catalog heading or a descriptive name; needs a decision): `BLOWN ALCOHOL`, `Ford 2300 Pinto`, `Ford EcoBoost 2.3L`, `Ford EcoBoost 3.5L`, `Ford Flathead V8`, `TOP FUEL`.

## Spec coverage

| field | records with a value |
|---|---|
| stroke | 3077 / 3082 |
| rodLength | 3076 / 3082 |
| ch | 3081 / 3082 |
| pin | 963 / 3082 |
| domeCc | 3061 / 3082 |
| cr | 3052 / 3082 |
| weight | 2703 / 3082 |
| ringPack | 2864 / 3082 |

## Rows per section (PDF page where the table starts)

| page | section | rows |
|---|---|---|
| 13 | LS1 EXTREME DUTY FSR | 16 |
| 13 | GM LS7 FLAT TOP | 9 |
| 14 | GM LS7 INVERTED DOME | 6 |
| 14 | GM LS7 DOME | 9 |
| 14 | GM LS FLAT TOP | 83 |
| 16 | GM LS INVERTED DOME | 102 |
| 18 | GM LS DOME - 15° HEAD | 58 |
| 20 | GM LT1 (GEN V) | 21 |
| 20 | GM LT4 (GEN V) | 15 |
| 21 | 305 SMALL BLOCK 23º FLAT TOP | 4 |
| 21 | 305 RACE SAVER SPRINT CAR | 5 |
| 21 | LIGHTWEIGHT STOCK CAR 2/4 BARREL | 14 |
| 22 | 23º F.S.R. SUPERFLY GP (GAS PORTED) | 10 |
| 22 | 23º & 21º ULTRA-LIGHT GP (GAS PORTED) | 11 |
| 22 | 23º ULTRA-LIGHT FLAT TOP | 3 |
| 22 | 23º TOUR SERIES GP (GAS PORTED) | 14 |
| 23 | 23º F.S.R. TOUR SERIES GP (GAS PORTED) | 16 |
| 23 | 23º 350 / 400 STANDARD FLAT TOP | 44 |
| 24 | EXTREME DUTY 23º INV. DOME | 24 |
| 25 | 350 STANDARD & GP 23º INV. DOME | 5 |
| 25 | 23º NITROUS SERIES DOME | 11 |
| 25 | 23º 350 / 400 SMALL BLOCK DOME | 71 |
| 27 | 23º 350 & 400 F.S.R. HOLLOW DOME GP (GAS PORTED) | 37 |
| 28 | 350 / 400 18º FLAT TOP | 14 |
| 28 | 350 18º DOME | 1 |
| 28 | 400 SMALL BLOCK 18º DOME | 24 |
| 29 | 400 SMALL BLOCK GP (GAS PORTED) 18º DOME | 4 |
| 29 | 13º SERIES | 40 |
| 30 | 14º RHS/ PRO ACTION®/ PRO TOPLINE® | 1 |
| 30 | BRODIX® - 12 15º DOME | 19 |
| 30 | BRODIX® - 12 15º SOLID DOME | 5 |
| 30 | 350 BRODIX® 11X / 360 SPRINT CAR ASCS | 6 |
| 31 | 360 SPRINT CAR ASCS FSR SERIES | 5 |
| 31 | 360 SPRINT CAR ASCS / 11X ROUND SERIES | 18 |
| 31 | 400 BRODIX® 11X | 6 |
| 33 | BBC OPEN CHAMBER LIGHTWEIGHT FSR GP | 114 |
| 35 | BBC BLOWN ALCOHOL DOME | 7 |
| 35 | BIG BLOCK FLAT TOP - STANDARD DECK BLOCK | 43 |
| 36 | BIG BLOCK FLAT TOP - TALL DECK BLOCK | 23 |
| 37 | BIG BLOCK INVERTED DOME | 19 |
| 37 | BIG BLOCK TALL DECK INV. DOME | 11 |
| 38 | B/B OPEN CHAMBER DOME - STD DECK BLOCK | 70 |
| 39 | B/B OPEN CHAMBER DOME - TALL DECK BLOCK | 40 |
| 40 | B/B NITROUS SERIES DOME | 7 |
| 40 | NITROUS SERIES GP (GAS PORTED) | 10 |
| 41 | NITROUS SERIES GP (GAS PORTED) | 18 |
| 41 | OPEN CHAMBER DOME GP (GAS PORTED) | 16 |
| 42 | BIG BLOCK 427 APBA DOME | 6 |
| 42 | 396, 427, 454 CLOSED CHAMBER | 6 |
| 42 | BBC 24° SERIES | 20 |
| 43 | BBC 20° SERIES | 40 |
| 44 | BIG DUKE / BIG CHIEF GP 18º | 28 |
| 44 | PRO MOD STYLE GP 18º | 3 |
| 45 | 12º / 14º 632 FLAT TOP | 3 |
| 45 | 12º / 14º 632 NITROUS SERIES FLAT TOP | 9 |
| 47 | 4.6L MODULAR - 2V | 135 |
| 51 | COYOTE 5.0L MODULAR 2011-2017 | 22 |
| 52 | COYOTE 5.0L MODULAR GEN 3 DIRECT INJECTION 2018+ | 6 |
| 52 | GT350 VOODOO 5.2L MODULAR | 2 |
| 52 | FORD 2013-2014 GT500 MODULAR 5.8L | 1 |
| 53 | FORD 2010-2017 MODULAR SOHC 6.2L | 6 |
| 53 | 331/347 HEAVY DUTY FLAT TOP | 7 |
| 53 | 351W STROKER HEAVY DUTY FLAT TOPS | 13 |
| 54 | 302/331/347 HEAVY DUTY INVERTED DOME | 17 |
| 54 | 351W STROKER INVERTED DOME | 19 |
| 55 | 302/351W BIG BORE DOME | 18 |
| 55 | 351 N HEAD GAS PORTED FLAT TOP | 1 |
| 55 | FORD V6 ECOBOOST 2010-2017 | 9 |
| 56 | FORD V6 ECOBOOST 2017+ | 8 |
| 56 | FORD 2.3L ECOBOOST | 3 |
| 56 | 427/428 “FE” INVERTED DOME | 5 |
| 56 | 427/428 “FE” FLAT TOP | 3 |
| 56 | 427/428 “FE” DOME | 2 |
| 57 | 460 FLAT TOP | 15 |
| 57 | 460 INVERTED DOME | 11 |
| 57 | PINTO/MINI STOCK FLAT TOP | 2 |
| 59 | 6.2L HEMI GEN 3 HELLCAT | 3 |
| 59 | 6.4L HEMI GEN 3 APACHE | 6 |
| 59 | 440 INVERTED DOME | 3 |
| 59 | 400 / 440 WEDGE FLAT TOP | 5 |
| 59 | 440 WEDGE DOME | 2 |
| 60 | S/B CHRYSLER FLAT TOP | 2 |
| 60 | S/B CHRYSLER INVERTED DOME | 2 |
| 60 | 426 HEMI | 5 |
| 61 | TOP FUEL | 4 |
| 61 | BLOWN ALCOHOL | 1 |
| 61 | BUICK GRAND NATIONAL | 5 |
| 63 | SMALL BLOCK CHEVY | 4 |
| 63 | SMALL BLOCK FORD | 5 |
| 63 | CHRYSLER W-2 | 4 |
| 65 | LS LR4/LY2 4.8L VORTEC 4800 | 8 |
| 65 | LS GEN III & GEN IV 5.3L VORTEC 5300 | 16 |
| 66 | LS GEN III LS1 | 28 |
| 66 | 12° & 15º COMBO LS2 / LS3 / LS6 / L92 DOME | 6 |
| 67 | 15º LS2 / LS3 / LS6 / L92 INVERTED DOME | 54 |
| 68 | 15º LS2 / LS3 / LS6 / L92 FLAT TOP | 67 |
| 69 | 350 / 400 23º FLAT TOP | 142 |
| 72 | 350 / 400 23º DOME | 29 |
| 73 | 350 / 400 23º INVERTED DOME | 134 |
| 75 | 305 SPRINT CAR FLAT TOP | 5 |
| 76 | GM PERFORMANCE 602 & 604 CRATE ENGINE | 12 |
| 76 | WINDSOR FLAT TOP & INVERTED DOME | 312 |
| 82 | MODULAR 4.6L / 5.4L 2V | 20 |
| 83 | MODULAR 4.6L / 5.4L 4V | 21 |
| 84 | MODULAR COYOTE 5.0 2011-2017 | 6 |
| 84 | MODULAR COYOTE 5.0 GEN 3 DIRECT INJECTION 2018+ | 2 |
| 87 | 15º LS1 / LS2 / LS6 / L92 INVERTED DOME | 2 |
| 87 | 23° LATE MODEL STOCK | 9 |
| 87 | LATE MODEL STOCK - 4 VALVE | 4 |
| 87 | 350 FLAT TOP | 45 |
| 88 | 400 FLAT TOP | 37 |
| 89 | 350 / 400 DOME | 48 |
| 90 | 350 / 400 INVERTED DOME | 64 |
| 91 | GM 502 REPLACEMENT SERIES | 3 |
| 91 | GM 572 REPLACEMENT SERIES | 6 |
| 92 | FLAT TOP / INVERTED DOME | 37 |
| 93 | SMALL DOME PROFILE | 34 |
| 93 | EDELBROCK® DOME | 5 |
| 94 | 427 OPEN CHAMBER | 2 |
| 94 | HIGH COMPRESSION DOME | 39 |
| 95 | CLOSED CHAMBER SMALL DOME PROFILE | 10 |
| 95 | SMALL BLOCK 318 | 3 |
| 95 | SMALL BLOCK 340 / 360 | 20 |
| 96 | 383 WEDGE STROKER | 2 |
| 96 | 400 / 440 WEDGE | 25 |
| 97 | FORD FLAT HEAD V8 | 16 |
| 97 | 2300 PINTO | 6 |
| 97 | BOSS 302 DOME | 6 |
| 98 | WINDSOR DOME | 22 |
| 98 | TWISTED WEDGE WINDSOR DOME | 25 |
| 99 | WINDSOR FLAT TOP | 136 |
| 102 | TWISTED WEDGE WINDSOR FLAT TOP | 30 |
| 102 | WINDSOR DISH | 127 |
| 105 | TWISTED WEDGE WINDSOR DISH | 30 |
| 106 | BOSS 302 STROKER FLAT TOP | 8 |
| 106 | 351 CLEVELAND FLAT TOP | 34 |
| 107 | 351 CLEVELAND DISH | 20 |
| 107 | 460 FLAT TOP & INVERTED DOME | 26 |
| 108 | 390/428 “FE” FLAT TOP | 8 |
| 109 | PONTIAC 400-455 | 10 |
| 109 | OLDSMOBILE 455 | 6 |

## Records per brand and family

| brand | family | records |
|---|---|---|
| JE | Small-block Chevy | 404 |
| JE | Chevy Gen VI big block | 324 |
| JE | Chevy Mark IV big block | 324 |
| JE | GM LS | 283 |
| JE | Ford Modular | 142 |
| JE | Small-block Ford (Windsor) | 57 |
| JE | GM LT (Gen V) | 36 |
| JE | Ford Coyote | 30 |
| JE | Ford EcoBoost 3.5L | 17 |
| JE | Ford 429/460 | 14 |
| JE | Ford FE | 10 |
| JE | Mopar B/RB big block | 10 |
| JE | Chrysler Gen III Hemi 6.2/6.4 | 9 |
| JE | Mopar LA small block | 8 |
| JE | Buick V6 181-252 | 5 |
| JE | Chrysler 426 Hemi | 5 |
| JE | TOP FUEL | 4 |
| JE | Ford EcoBoost 2.3L | 3 |
| JE | Ford 2300 Pinto | 2 |
| JE | BLOWN ALCOHOL | 1 |
| SRP | Small-block Chevy | 437 |
| SRP | Small-block Ford (Windsor) | 348 |
| SRP | GM LS | 157 |
| SRP | Chevy Gen VI big block | 136 |
| SRP | Chevy Mark IV big block | 136 |
| SRP | Ford 351C/351M/400 | 36 |
| SRP | Ford Modular | 29 |
| SRP | Mopar B/RB big block | 27 |
| SRP | Mopar LA small block | 19 |
| SRP | Ford 429/460 | 18 |
| SRP | Ford Flathead V8 | 16 |
| SRP | Ford Coyote | 8 |
| SRP | Ford FE | 8 |
| SRP | Pontiac V8 | 7 |
| SRP | Ford 2300 Pinto | 6 |
| SRP | Oldsmobile V8 | 6 |
| **total** | | 3082 |

## Rows skipped

- none

## Needs human QA

- p36 338236: unexpected token 'U' in footnote column (line: `338236 604 4.500 4.750 6.700 10.195 1.120 11.1 10.4 10.0 -3.0 569 M, B, U .034 J100F8-4500-5 GM1010-039**`)
- p36 338237: unexpected token 'U' in footnote column (line: `338237 612 4.530 4.750 6.700 10.195 1.120 11.2 10.5 10.1 -3.0 579 M, B, U .064 J100F8-4530-5 GM1011-039**`)
- p36 338238: unexpected token 'U' in footnote column (line: `338238 621 4.560 4.750 6.700 10.195 1.120 11.3 10.6 10.2 -3.0 592 M, B, U .094 J100S8-4560-5 GM1011-039**`)
- p36 281959: unexpected token 'U' in footnote column (line: `281959 632 4.600 4.750 6.700 10.195 1.120 11.4 10.7 10.3 -3.0 585 B, U .134 J100U8-4600-5 GM1011-039**`)
- p36 281960: unexpected token 'U' in footnote column (line: `281960 634 4.610 4.750 6.700 10.195 1.120 11.4 10.8 10.4 -3.0 590 M, B, U .144 J100H8-4610-5`)
- p36 281961: unexpected token 'U' in footnote column (line: `281961 638 4.625 4.750 6.700 10.195 1.120 11.5 10.8 10.4 -3.0 592 M, B, U .159 J100F8-4625-5`)
- p43 377854: unexpected token 'CSH40105' in footnote column (line: `377854 582 4.600 4.375 6.535 9.783 1.060 14.5 18.0 572 B .100 CSH40105`)
- p43 377855: unexpected token 'CSH40105' in footnote column (line: `377855 583 4.605 4.375 6.535 9.783 1.060 14.5 18.0 573 B .105 CSH40105`)
- p43 377856: unexpected token 'CSH401015' in footnote column (line: `377856 584 4.610 4.375 6.535 9.783 1.060 14.5 18.0 574 B .110 CSH401015`)
- p43 377857: unexpected token 'CSH401015' in footnote column (line: `377857 585 4.615 4.375 6.535 9.783 1.060 14.5 18.0 575 B .115 CSH401015`)
- p43 377858: unexpected token 'CSH401030' in footnote column (line: `377858 588 4.625 4.375 6.535 9.783 1.060 14.5 18.0 576 B .125 CSH401030`)
- p43 377886: unexpected token 'CSH40105' in footnote column (line: `377886 565 4.600 4.250 6.535 9.780 1.120 14.0 18.0 599 B .100 CSH40105`)
- p43 377889: unexpected token 'CSH40105' in footnote column (line: `377889 566 4.605 4.250 6.535 9.780 1.120 14.0 18.0 600 B .105 CSH40105`)
- p43 377890: unexpected token 'CSH401015' in footnote column (line: `377890 568 4.610 4.250 6.535 9.780 1.120 14.0 18.0 601 B .110 CSH401015`)
- p43 377887: unexpected token 'CSH401015' in footnote column (line: `377887 569 4.615 4.250 6.535 9.780 1.120 14.0 18.0 602 B .115 CSH401015`)
- p43 377888: unexpected token 'CSH401030' in footnote column (line: `377888 571 4.625 4.250 6.535 9.780 1.120 14.0 18.0 603 B .125 CSH401030`)
- p43 377891: unexpected token 'CSH40105' in footnote column (line: `377891 598 4.600 4.500 6.385 9.790 1.155 14.8 18.0 614 B .100 CSH40105`)
- p43 377892: unexpected token 'CSH40105' in footnote column (line: `377892 600 4.605 4.500 6.385 9.790 1.155 14.8 18.0 615 B .105 CSH40105`)
- p43 377893: unexpected token 'CSH401015' in footnote column (line: `377893 601 4.610 4.500 6.385 9.790 1.155 14.8 18.0 616 B .110 CSH401015`)
- p43 377894: unexpected token 'CSH401015' in footnote column (line: `377894 602 4.615 4.500 6.385 9.790 1.155 14.8 18.0 617 B .115 CSH401015`)
- p43 377895: unexpected token 'CSH401030' in footnote column (line: `377895 605 4.625 4.500 6.385 9.790 1.155 14.8 18.0 618 B .125 CSH401030`)
- p43 377896: unexpected token 'CSH40105' in footnote column (line: `377896 565 4.600 4.250 6.385 9.780 1.270 14.0 18.0 653 B .100 CSH40105`)
- p43 377897: unexpected token 'CSH40105' in footnote column (line: `377897 566 4.605 4.250 6.385 9.780 1.270 14.0 18.0 654 B .105 CSH40105`)
- p43 377898: unexpected token 'CSH401015' in footnote column (line: `377898 568 4.610 4.250 6.385 9.780 1.270 14.0 18.0 655 B .110 CSH401015`)
- p43 377899: unexpected token 'CSH401015' in footnote column (line: `377899 569 4.615 4.250 6.385 9.780 1.270 14.0 18.0 656 B .115 CSH401015`)
- p43 377900: unexpected token 'CSH401030' in footnote column (line: `377900 571 4.625 4.250 6.385 9.780 1.270 14.0 18.0 657 B .125 CSH401030`)
- p52 371782: no cubic-inch column printed (line: `371782 3.681 4.165 6.657 10.060 1.320 9.5:1 -22.0 STD JG1001-3681`)
- p65 366438: weight printed as 0 g, dropped (line: `366438 313 3.905 3.268 6.278 1.314 10.5 10.1 9.6 4.6 0 2618, K, M .010 JG6001-3905 GM1015-051`)
- p66 372203: 0 CR values but 3 chamber headers ['64', '66', '72'] (line: `372203 416 4.005 4.125 6.125 1.050 -5.0 C, M JG3108-4000-7 GM1016-051`)
- p66 372205: 0 CR values but 3 chamber headers ['64', '66', '72'] (line: `372205 421 4.030 4.125 6.125 1.050 -5.0 C, M JG31F8-4030-2 GM1016-051`)
- p83 329383: no cubic-inch column printed (line: `329383 3.552 4.165 6.657 1.220 10.7 -3.0 336 4032 STD JG3208-3551-0 FD1011-039*`)
- p83 271106: no cubic-inch column printed (line: `271106 3.572 4.165 6.657 1.220 10.8 -3.0 341 4032 .020 JG3208-3571-0 FD1011-039*`)
- p83 378037: no cubic-inch column printed (line: `378037 3.552 4.165 6.657 1.320 11.0 -16.0 2618 STD JG3208-3551-0 FD1011-039*`)
- p83 378038: no cubic-inch column printed (line: `378038 3.562 4.165 6.657 1.320 11.0 -16.0 2618 .010 JG3208-3571-0 FD1011-039*`)
- p83 378039: no cubic-inch column printed (line: `378039 3.572 4.165 6.657 1.320 11.0 -16.0 2618 .020 JG3208-3571-0 FD1011-039*`)
- p83 329384: no cubic-inch column printed (line: `329384 3.552 4.165 6.657 1.220 9.0 -17.0 347 4032 STD JG3208-3551-0 FD1011-039*`)
- p83 271108: no cubic-inch column printed (line: `271108 3.572 4.165 6.657 1.220 9.0 -17.0 349 4032 .020 JG3208-3571-0 FD1011-039*`)
- p83 329383: no cubic-inch column printed (line: `329383 3.552 4.165 6.657 1.220 9.4 -3.0 336 4032 STD JG3208-3551-0 FD1011-039*`)
- p83 271106: no cubic-inch column printed (line: `271106 3.572 4.165 6.657 1.220 9.4 -3.0 341 4032 .020 JG3208-3571-0 FD1011-039*`)
- p83 378053: no cubic-inch column printed (line: `378053 3.552 4.165 6.657 1.320 11.5 -3.0 2618 STD JG3208-3551-0 FD1011-039*`)
- p83 378054: no cubic-inch column printed (line: `378054 3.562 4.165 6.657 1.320 11.5 -3.0 2618 .010 JG3208-3571-0 FD1011-039*`)
- p83 329384: no cubic-inch column printed (line: `329384 3.552 4.165 6.657 1.220 8.0 -17.0 347 4032 STD JG3208-3551-0 FD1011-039*`)
- p83 271108: no cubic-inch column printed (line: `271108 3.572 4.165 6.657 1.220 8.0 -17.0 349 4032 .020 JG3208-3571-0 FD1011-039*`)
- p83 378056: no cubic-inch column printed (line: `378056 3.552 4.165 6.657 1.320 9.5 -18.0 2618 STD JG3208-3551-0 FD1011-039*`)
- p83 378057: no cubic-inch column printed (line: `378057 3.562 4.165 6.657 1.320 9.5 -18.0 2618 .010 JG3208-3571-0 FD1011-039*`)
- p83 378058: no cubic-inch column printed (line: `378058 3.572 4.165 6.657 1.320 9.5 -18.0 2618 .020 JG3208-3571-0 FD1011-039*`)
- p93 212149: 0 CR values but 3 chamber headers ['112', '118', '124'] (line: `212149 489 4.280 4.250 6.135 1.520 10.5 10..0 9.5 17.0 592 .030 S100S8-4280-5 GM1009-039**`)
- p93 212149: unexpected token '10..0' in footnote column (line: `212149 489 4.280 4.250 6.135 1.520 10.5 10..0 9.5 17.0 592 .030 S100S8-4280-5 GM1009-039**`)
- p93 212149: unexpected token '9.5' in footnote column (line: `212149 489 4.280 4.250 6.135 1.520 10.5 10..0 9.5 17.0 592 .030 S100S8-4280-5 GM1009-039**`)
- p93 212149: unexpected token '17.0' in footnote column (line: `212149 489 4.280 4.250 6.135 1.520 10.5 10..0 9.5 17.0 592 .030 S100S8-4280-5 GM1009-039**`)
- p93 212149: unexpected token '592' in footnote column (line: `212149 489 4.280 4.250 6.135 1.520 10.5 10..0 9.5 17.0 592 .030 S100S8-4280-5 GM1009-039**`)
- p97 148221: 2 CR values printed for 3 chamber headers ['54', '58', '62']; keyed to the first headers (line: `148221 142 3.810 3.126 5.205 1.590 9.5 9.0 -1.0 412 N/A D .030 J64004-3810 FD1004-039`)
- p97 148222: 2 CR values printed for 3 chamber headers ['54', '58', '62']; keyed to the first headers (line: `148222 143 3.820 3.126 5.205 1.590 9.5 9.0 -1.0 415 N/A D, L .040 J640F4-3820`)
- p97 148223: 2 CR values printed for 3 chamber headers ['54', '58', '62']; keyed to the first headers (line: `148223 144 3.830 3.126 5.205 1.590 9.5 9.1 -1.0 420 N/A D .050 J616F4-3830`)
- p97 148218: 2 CR values printed for 3 chamber headers ['54', '58', '62']; keyed to the first headers (line: `148218 142 3.810 3.126 5.700 1.090 9.5 9.0 -1.0 337 N/A B, C .030 J64004-3810 FD1004-039`)
- p97 148219: 2 CR values printed for 3 chamber headers ['54', '58', '62']; keyed to the first headers (line: `148219 143 3.820 3.126 5.700 1.090 9.5 9.0 -1.0 342 N/A B, C .040 J640F4-3820`)
- p97 148220: 2 CR values printed for 3 chamber headers ['54', '58', '62']; keyed to the first headers (line: `148220 144 3.830 3.126 5.700 1.090 9.5 9.1 -1.0 344 N/A B, C, M .050 J616F4-3830`)
- p103 206067: unexpected token '.STD' in footnote column (line: `206067 326 4.000 3.250 5.400 1.165 9.0 8.5 8.0 -15.0 408 -0.010 B, C .STD S100S8-4000-5 FD1000-039`)
- p103 151867: unexpected token '.STD' in footnote column (line: `151867 341 4.000 3.400 5.400 1.100 9.8 9.2 8.7 -12.5 392 0.000 B, C, M .STD S100S8-4000-5 FD1000-039`)
- p104 151867: unexpected token '.STD' in footnote column (line: `151867 427 4.000 4.250 6.250 1.100 11.4 10.7 10.0 -12.5 392 -0.025 B, C, M .STD S100S8-4000-5 FD1000-039`)
- PN 213103 p28: catalog CID 400 vs computed 428 (4.125 bore x 4.0 stroke x 8) — check row
- PN 243313 p44: catalog CID 565 vs computed 582 (4.6 bore x 4.375 stroke x 8) — check row
- PN 243313 p44: catalog CID 565 vs computed 582 (4.6 bore x 4.375 stroke x 8) — check row
- PN 243314 p44: catalog CID 568 vs computed 584 (4.61 bore x 4.375 stroke x 8) — check row
- PN 243314 p44: catalog CID 568 vs computed 584 (4.61 bore x 4.375 stroke x 8) — check row
- PN 345870 p52: catalog CID 302 vs computed 315 (3.701 bore x 3.661 stroke x 8) — check row
- PN 345871 p52: catalog CID 302 vs computed 315 (3.701 bore x 3.661 stroke x 8) — check row
- PN 188704 p53: catalog CID 408 vs computed 418 (4.03 bore x 4.1 stroke x 8) — check row
- PN 337924 p56: catalog CID 129 vs computed 138 (3.445 bore x 3.701 stroke x 4) — check row
- PN 337925 p56: catalog CID 131 vs computed 140 (3.465 bore x 3.701 stroke x 4) — check row
- PN 337926 p56: catalog CID 132 vs computed 141 (3.485 bore x 3.701 stroke x 4) — check row
- PN 345653 p91: catalog CID 404 vs computed 430 (4.135 bore x 4.0 stroke x 8) — check row
- PN 213453 p96: catalog CID 462 vs computed 451 (4.375 bore x 3.75 stroke x 8) — check row
- PN 371839 p97: catalog CID 271 vs computed 263 (3.187 bore x 4.125 stroke x 8) — check row
- PN 149607 p103: catalog CID 388 vs computed 359 (4.04 bore x 3.5 stroke x 8) — check row

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a brand and family; numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.

- passed
