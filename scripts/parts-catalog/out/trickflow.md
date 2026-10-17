# Trick Flow — extraction notes

Extracted 2026-10-17 by `scripts/parts-catalog/extract_trickflow.py`.

## What was read

No network access (Trick Flow is Summit-owned and blocks fetchers; the PDFs were saved by hand into `Catalogs/`):

- `TrickFlow-PRI-Catalog_26.pdf` — 2026 PRI catalog, 80 pages, text layer (PyMuPDF text + pdfplumber ruled tables). Pages used: heads 7, 8, 9, 10, 11, 16, 18, 19, 20, 21, 22, 23, 25, 28, 29, 32, 33, 38, 39, 40, 41, 49, 50, 52, 53, 56, 58; top-end kits 12, 17, 24, 31, 35, 42, 59; cams 62-63 and 34; springs 64-67; rockers 26, 30, 46, 51, 55, 60; pushrods 60-61; lifters 63; intakes 15, 27, 30, 43, 45, 48, 51, 54, 57, 59; MLS head gaskets 73 and 35.
- `tfs_dealer_sheets_rev12.pdf` — 2017 dealer cylinder-head comparison sheets, 12 pages. They hold one flow point per head (cfm @ .600"/.700"/.800" lift, 28"), not full curves; 43 product rows parsed, 21 used.

Not extracted: engine blocks (Trick Flow sells none, so no `block` records), bare-casting heads (the pages say bare castings exist but print no part number — every head here is `bare: false`), head `camType` (not printed; the spring package and max lift are recorded instead), advertised duration / lash / lobe numbers for cams (not printed), accessories, gasket sets, tools, dampers, timing sets, fuel injectors, headers, valve covers, pistons, retainers/locks/locators as stand-alone records (they appear as related PNs).

## Records

| cat | records | distinct part numbers |
|---|---|---|
| head | 193 | 178 |
| pushrod | 134 | 120 |
| spring | 97 | 82 |
| intake | 58 | 55 |
| headGasket | 51 | 43 |
| cam | 31 | 29 |
| rocker | 21 | 19 |
| lifter | 15 | 10 |
| **total** | 600 | 536 |

Top-end engine kits are `head` records with `spec.kit` (26 records, 25 part numbers). Parts that fit several families are repeated once per family with the same `p`.

### Records per family

| cat | family | records |
|---|---|---|
| cam | Small-block Chevy | 10 |
| cam | Ford Modular | 6 |
| cam | GM LS | 5 |
| cam | Small-block Ford (Windsor) | 5 |
| cam | Chevy Gen VI big block | 2 |
| cam | Chevy Mark IV big block | 2 |
| cam | Mopar B/RB big block | 1 |
| head | Small-block Chevy | 43 |
| head | Small-block Ford (Windsor) | 36 |
| head | GM LS | 34 |
| head | Ford 429/460 | 14 |
| head | Ford 351C/351M/400 | 12 |
| head | Chevy Gen VI big block | 11 |
| head | Chevy Mark IV big block | 11 |
| head | Ford Modular | 11 |
| head | Mopar B/RB big block | 10 |
| head | Mopar LA small block | 4 |
| head | Mopar Magnum 5.2/5.9 | 4 |
| head | Ford FE | 3 |
| headGasket | GM LS | 13 |
| headGasket | Small-block Ford (Windsor) | 8 |
| headGasket | Mopar B/RB big block | 6 |
| headGasket | Ford Modular | 4 |
| headGasket | Ford 429/460 | 3 |
| headGasket | Ford FE | 3 |
| headGasket | Small-block Chevy | 3 |
| headGasket | Chevy Gen VI big block | 2 |
| headGasket | Chevy Mark IV big block | 2 |
| headGasket | Ford Coyote | 2 |
| headGasket | Mopar LA small block | 2 |
| headGasket | Mopar Magnum 5.2/5.9 | 2 |
| headGasket | Ford 351C/351M/400 | 1 |
| intake | Small-block Ford (Windsor) | 36 |
| intake | Ford 429/460 | 4 |
| intake | Mopar B/RB big block | 4 |
| intake | Ford 351C/351M/400 | 3 |
| intake | Chevy Gen VI big block | 2 |
| intake | Chevy Mark IV big block | 2 |
| intake | Ford FE | 2 |
| intake | GM LS | 2 |
| intake | Mopar LA small block | 1 |
| intake | Mopar Magnum 5.2/5.9 | 1 |
| intake | Small-block Chevy | 1 |
| lifter | GM LS | 2 |
| lifter | Small-block Chevy | 2 |
| lifter | Small-block Ford (Windsor) | 2 |
| lifter | Chevy Gen VI big block | 1 |
| lifter | Chevy Mark IV big block | 1 |
| lifter | Chevy W-series 348/409 | 1 |
| lifter | Ford 351C/351M/400 | 1 |
| lifter | Ford 429/460 | 1 |
| lifter | Ford FE | 1 |
| lifter | Mopar B/RB big block | 1 |
| lifter | Mopar LA small block | 1 |
| lifter | Mopar Magnum 5.2/5.9 | 1 |
| pushrod | Universal | 84 |
| pushrod | Chevy Gen VI big block | 12 |
| pushrod | Chevy Mark IV big block | 12 |
| pushrod | Ford 429/460 | 11 |
| pushrod | Mopar B/RB big block | 7 |
| pushrod | Chrysler Gen III Hemi 5.7/6.1 | 2 |
| pushrod | Ford 351C/351M/400 | 2 |
| pushrod | Small-block Chevy | 2 |
| pushrod | Chrysler Gen III Hemi 6.2/6.4 | 1 |
| pushrod | GM LS | 1 |
| rocker | Small-block Chevy | 9 |
| rocker | Small-block Ford (Windsor) | 6 |
| rocker | Mopar B/RB big block | 2 |
| rocker | Chevy Gen VI big block | 1 |
| rocker | Chevy Mark IV big block | 1 |
| rocker | Ford 351C/351M/400 | 1 |
| rocker | Ford 429/460 | 1 |
| spring | Universal | 37 |
| spring | GM LS | 18 |
| spring | Ford Modular | 12 |
| spring | Small-block Ford (Windsor) | 12 |
| spring | Small-block Chevy | 7 |
| spring | Chevy Gen VI big block | 2 |
| spring | Chevy Mark IV big block | 2 |
| spring | Ford Coyote | 2 |
| spring | Buick big block | 1 |
| spring | Ford 429/460 | 1 |
| spring | Mopar B/RB big block | 1 |
| spring | Mopar LA small block | 1 |
| spring | Mopar Magnum 5.2/5.9 | 1 |

### Heads and flow

- 153 distinct assembled head part numbers; 80 carry a full catalog flow curve (28" H2O, ruled 'Airflow Results' table on the product page), 65 carry only the single 2017 dealer-sheet point (`src.flowSource` and `spec.flowNote` say so), 8 have no flow data: TFS-3261T004-CH1, TFS-5261T541-CH3, TFS-5261T641-CH3, TFS-5261T561-C04, TFS-5261T661-C04, TFS-5261T541-CH4, TFS-5261T641-CH4, TFS-5451T8T5-C03.
- Catalog pages 10 (GenX cathedral port), 29 (PowerPort 320/365) and 39 (Twisted Wedge 11R) print their flow charts as images, so those heads fall back to the dealer sheet where product, runner and chamber match.
- Flow tables are attached only to the variants they name: a table titled 'with 72cc chambers' or footnoted '61cc chambers' / 'intake valve: 2.350' goes only to those part numbers; 'GenX 220 for LS2' goes only to the LS2 (65cc) part numbers.

### How head variants were resolved

Each head page has one Specifications block whose lines carry variant codes (`C01:`, `M54:`, `01/02/03:`, `PowerPort 320:`, `10-C01:`, `T541-CH3/CH4:`). The extractor matches those codes against the part number's suffix, last 2/4 base digits and their combinations; chamber volume, runner volume, spring size and intake valve named in the listing line itself take precedence. The spring package (and so `maxLift`/`springDia`) is the package whose OD/type (or seat pressure, or rate) the listing names; `spec.spring` records it and `spec.springOptions` lists the other packages offered on that page. `spec.qa` flags any record where something was assumed.

## Transcribed (not parsed) values

Intake manifold types, carb flanges, RPM ranges and heights are written in prose on the catalog pages and were transcribed into the `INTAKES` table in the script (one entry per part number, with the page); the script only emits an entry when the part number is found on that page. EFI manifold figures come from the p45 specification table. Per-PN corrections for catalog typos are in `OVERRIDES` / `CAM_OVERRIDES` and are each flagged in `spec.qa`.

## Family notes

- Big-block Chevy parts are emitted for both `Chevy Mark IV big block` and `Chevy Gen VI big block`; PowerPort 190 and small-block Mopar parts for both `Mopar LA small block` and `Mopar Magnum 5.2/5.9` (the catalog says LA and Magnum).
- GM Gen II LT1 parts (GenX 185/195 heads, TFS-31402081 cam, LT1 kit and gaskets) are filed under `Small-block Chevy` with the note 'GM Gen II LT1/LT4 (1992-97 reverse-flow small block); no separate LT1 family in the fitment list'.
- Ford 4.6L/5.4L 2V/3V/4V parts are `Ford Modular`; 5.0L DOHC springs/gaskets are `Ford Coyote`. Springs and generated pushrods with no stated engine are `Universal`.

## QA

- p16 TFS-30410010: valve angle: Specifications block labels the 23° line '01' instead of '10'; page text says the GenX 195 retains the stock 23° valve angle
- p41 TFS-5171T010-C01: p41 Specifications block prints the 95cc exhaust port volume under a blank key and omits the intake valve diameter line
- p41 TFS-51710012-C01: p41 Specifications block prints the 95cc exhaust port volume under a blank key and omits the intake valve diameter line
- p41 TFS-5171T012-C01: p41 Specifications block prints the 95cc exhaust port volume under a blank key and omits the intake valve diameter line
- p41 TFS-5171T013-C01: p41 Specifications block prints the 95cc exhaust port volume under a blank key and omits the intake valve diameter line
- p41 TFS-5171T016-C02: p41 Specifications block prints the 95cc exhaust port volume under a blank key and omits the intake valve diameter line
- p41 TFS-5171T018-C02: p41 Specifications block prints the 95cc exhaust port volume under a blank key and omits the intake valve diameter line
- p63 TFS-61602003: p63 summary table prints 234/247 @ .050 and lift w/1.7 rockers; the product page (p60) prints 243/247 and lift w/1.5 rockers; p60 figures kept
- p66 TFS-16982-16: beehive printed with top OD 1.454 larger than bottom OD 1.25; kept as printed
- p12 TFS-K306-485-460: kit note cites head TFS-3060T001-C01; matched to listed TFS-3061T001-C01
- p12 TFS-K306-500-460: kit note cites head TFS-3060T001-C01; matched to listed TFS-3061T001-C01
- p12 TFS-K306-515-460: kit note cites head TFS-3060T001-C01; matched to listed TFS-3061T001-C01
- p12 TFS-K306-550-470: kit note cites head TFS-3060T001-C02; matched to listed TFS-3061T001-C02
- p12 TFS-K305-455-425: kit note cites head TFS-30500001-C00; matched to listed TFS-30510001-C00
- p24 TFS-K314-350-400: kit head TFS-30410001 is not a listed head part number
- p24 TFS-K314-420-395: kit head TFS-30410002 is not a listed head part number
- p24 TFS-K314-445-405: kit head TFS-30410003 is not a listed head part number
- p31 TFS-K413-580-560: kit note cites head TFS-41310001; matched to listed TFS-41310001-M13
- p35 TFS-K519-380-375: kit head inferred from product name and chamber volume: TFS-51910002-M44
- p35 TFS-K520-380-375: kit head inferred from product name and chamber volume: TFS-51910004-M44
- p35 TFS-K520-390-375: kit head inferred from product name and chamber volume: TFS-51910003-M38
- p61: 84 pushrod part numbers generated from the build-a-number rule (fit.fam Universal)
- p73 TFS-56494165-040: thickness .070 in text vs -040 suffix
- p22 TFS-32410006-C01: 2026 curve @ 0.7 = 310/235 cfm vs 2017 sheet 287/223 (Super 23 215); catalog kept
- p22 TFS-3241T006-C01: 2026 curve @ 0.7 = 310/235 cfm vs 2017 sheet 287/223 (Super 23 215); catalog kept
- p22 TFS-32410007-C01: 2026 curve @ 0.7 = 310/235 cfm vs 2017 sheet 287/223 (Super 23 215); catalog kept
- p22 TFS-3241T007-C01: 2026 curve @ 0.7 = 310/235 cfm vs 2017 sheet 287/223 (Super 23 215); catalog kept
- p41 TFS-51710012-C01: 2026 curve @ 0.6 = 322/247 cfm vs 2017 sheet 335/257 (High Port 225); catalog kept
- p41 TFS-5171T012-C01: 2026 curve @ 0.6 = 322/247 cfm vs 2017 sheet 335/257 (High Port 225); catalog kept
- p41 TFS-5171T013-C01: 2026 curve @ 0.6 = 322/247 cfm vs 2017 sheet 335/257 (High Port 225); catalog kept
- p41 TFS-5171T016-C02: 2026 curve @ 0.6 = 330/247 cfm vs 2017 sheet 343/257 (High Port 240); catalog kept
- p41 TFS-5171T018-C02: 2026 curve @ 0.6 = 330/247 cfm vs 2017 sheet 343/257 (High Port 240); catalog kept
- skipped: sheet p2 'GenX 220 LS2' 220cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p3 'GenX 260 LS7' 260cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p4 'GenX 185' 185cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p4 'GenX 195' 195cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p5 'Super 23 175' 175cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p5 'Super 23 195 with standard cast combustion chambers' 195cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p5 'Super 23 195 with CNC-profiled combustion chambers' 195cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p5 'Super 23 215' 215cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p5 'Super 23 230' 230cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p5 'Ultra 18 250' 250cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p6 'PowerOval 280' 280cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p7 'Twisted Wedge 185' 185cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p7 'Twisted Wedge Track Heat 185' 185cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p7 'Twisted Wedge Race 195' 195cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p8 'PowerPort Cleveland 225' 225cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p9 'Twisted Wedge Race 206' 206cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p9 'Twisted Wedge Race 225' 225cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p10 'High Port 192' 192cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p10 'High Port 225' 225cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p10 'High Port 240' 240cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p11 'PowerPort 290' 290cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
- skipped: sheet p11 'PowerPort A460 340' 340cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)
