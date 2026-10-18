# CLEVITE (MAHLE Aftermarket) engine bearings — extraction notes (2026-10-18)

## Source and method

- File: `Catalogs/eb-20-26_web.pdf` — MAHLE Aftermarket CLEVITE Engine Bearings Light Vehicle catalog EB-20-26
  (supersedes EB-20-18), 1,007 PDF pages, text layer (no OCR). Saved by hand into `Catalogs/`; no
  network used. The owner approved this catalog for the public site on 2026-10-17 (MAHLE's
  published catalog); the earlier shop-only restriction applied to the shop tool's copy.
- Parsed PDF pages 99-975 (printed 98-974, makes Acura → Volvo).
  The numerical listings (printed 975-1004) only map part number → make/block and list set
  contents, so they were used for a coverage cross-check, not as a data source. Front matter
  (failure analysis, clearance tables, legends on printed pp 26-27) supplied the suffix and
  material legends below.
- Shop extractor reuse: the brief pointed at `C:\Enoch Shop\lambda-shop\tools\clevite_extract.py`;
  the script actually lives at `C:\Enoch Shop\server\tools\clevite_extract.py` (output
  `C:\Enoch Shop\server\data\clevite-bearings.json`). Both were read, nothing there was modified.
  Its page logic was copied: column x positions from the `POSITION | MATERIAL | NUMBER | UNDERSIZES |
  DIAMETER | CLEARANCE | WALL | BORE | LENGTH` header labels, rows grouped by y (2.5 pt), block
  numbers as 9.8 pt digits left of the material column, engine lines as 9 pt bold, `NOTE:` lines
  attached to the row above, blocks continued across pages by maker + number. Added here:
  wrapped cells are joined to the row above (the shop version dropped `.7`+`5mm` undersizes and
  `2.10385/2.104`+`80` shaft ranges), bold vs regular part-number font decides set/pair vs
  individual shell, `For Years:` lines are kept per set, VIN-code lines with several year ranges
  give min/max years (the shop version took only the first range), engine lines that wrap are
  joined before parsing, and 9 pt headings (`8 CYL (cont.)`) no longer leak into position labels.
- `p` is the part number as printed with inner spaces removed: `CB-663P(8)` is the 8-cylinder set
  and `CB-663P` the pair; both are orderable numbers in the catalog and both are kept
  (`spec.pack` = `set`/`pair`/`individual`, `spec.pieces` from the label or the `(n)` qualifier).
  Individual main/cam shells and thrust washers printed under a set are kept in `spec.shells`
  (part, flanged, journal, clearance, thickness, housing, width), not as their own records.
- Shop data is printed in inches (also for metric engines): `journal` = max of the standard shaft
  diameter range (`journalMin` = min), `clearance` = [min, max] vertical oil clearance,
  `thickness` = max wall at crown, `housing` = max bearing OD / housing bore (`housingMin`),
  `width` = max bearing length. For a main set the top-level values come from the first shell
  that carries dimensions; thrust washer sets carry the washer's thickness as `thickness`.
- `spec.undersize` keeps the catalog tokens: `STD`, bare numbers are inch thousandths (`10` =
  .010 in, `1` = .001 in), `.25mm`/`.50mm`/`.75mm` metric.
- `spec.series` is the part-number suffix (legend printed p26): A = lead-free aluminum-silicon
  bimetal, P = copper-lead trimetal with lead-tin-copper overlay, G = copper matrix with babbitt
  infiltrant, AL = aluminum lining, AP = A and P mixed, C = copper-lead, S = set, W = thrust washer,
  `(F)` = flanged shell. `spec.material` is the printed designation (AL-5, TM-77, B-1, ...) with
  the p27 legend in `materialDesc`. This is the OE-replacement light-vehicle catalog: the H/HN/HX/
  V/K performance series are not listed in it (they are in the separate Clevite performance
  catalog), so no record carries those series. `coated: true` is set when a row note says
  coated (MAHLE polymer / F1 coated shells).
- Families: one record per (part number, family). GM/Ford/Chrysler engine lines are resolved from
  the description (CID/liters, cylinders, OHV/SOHC/DOHC, valve count, division name, RPO or
  engine code, years, diesel), then the block's own rod/main journal diameters (SBC 2.10/2.45,
  LS 2.10/2.559, BBC 2.20/2.75, Olds 2.125/2.50, Pontiac 2.25/3.00-3.25, Buick 350 2.00/3.00,
  Windsor 2.1228/2.2482, Cleveland 2.311/2.749, FE 2.4388/2.749, 429/460 2.4992/2.9994, LA 2.125/
  2.50-2.81, B/RB 2.375/2.625-2.75, Gen III Hemi 2.125/2.559, AMC V8 2.0955/2.7474), then bore x
  stroke for cam-bearing-only blocks (the GM 350s: Chevy 4.00 x 3.48, Olds 4.06 x 3.39, Pontiac
  3.88 x 3.75, Buick 3.80 x 3.85). A block whose engines span two families (an LS1 rod block
  shared with SBC, a 318/360 block spanning LA and Magnum years, a 1965-1999 big-block Chevy
  block) yields one record per family for the same part number. Engines with no engine-build
  family keep the catalog make heading as `fit.fam` (listed below).
  Catalog quirks handled on purpose: the 426 wedge and 426 Hemi share B/RB blocks (CB-527P rods),
  so 426 lines carry both families; unnamed 351 rod blocks (CB-831, 2.311 journal shared by the
  Windsor, Cleveland and Modified 351) carry both Ford 351 families while unnamed 351 main-only
  blocks stay under the make heading; the 7.3 International line spans 1988-2003 (IDI and Power
  Stroke share the bearings) and is filed as Powerstroke 7.3; the LS1 is printed as a 350 CID
  3.90 x 3.62 engine and resolved by its RPO code. No 7.3 Godzilla (445 CID, 2020+) line exists in
  this edition.
- `fit.y0/y1` span all VIN-code year ranges of the engines aggregated under the record; where a
  block prints a set-level `For Years:` line, that block's engines contribute those years instead
  and the line is quoted in `fit.notes` (`[set for years ...]`).
- Mixed blocks: a generic engine line such as `5.7L 350 CID V8 (1968-1974)` can head a block that
  lists Chevrolet, Pontiac, Oldsmobile and Buick rod and main sets side by side. Families are
  therefore resolved per part from the part's own journal (the block's journal is used for the
  other position only when the block has a single one); cam sets and thrust washers in a mixed
  block stay under the make heading rather than being guessed from bore x stroke.
- The maker named in the engine description (`General Motors`, `Ford`, `Chrysler`, `AMC`) decides
  the rule set, so GM engines under the ISUZU, SAAB TRUCK and AM GENERAL TRUCK headings resolve
  to GM LS / Small-block Chevy and merge into the same record as the GMC printing.
  `fit.notes` lists up to 12 engine descriptions with their VIN codes/years and bore x stroke.

## Counts

- Blocks parsed: 1360 across 61 make headings; engine lines: 2562;
  set/pair rows: 4763 (rod 2570, main 1213, cam 469,
  thrust 305, pin bushing 134, balance shaft 49,
  auxiliary shaft 23); distinct orderable part numbers: 722; distinct shell numbers
  inside sets: 584.
- Records (part number × family): 1840; in US engine-build families: 339 (236 distinct part
  numbers); left under a US make heading with no family: 806;
  under import make headings: 695.

### By position

| position | all records | US-family records |
|---|---:|---:|
| rod | 920 | 166 |
| main | 511 | 95 |
| cam | 159 | 57 |
| thrust | 157 | 5 |
| pinBushing | 56 | 15 |
| balanceShaft | 21 | 1 |
| auxShaft | 16 | 0 |

### By series (part-number suffix)

| series | all records | US-family records | legend |
|---|---:|---:|---|
| A | 948 | 123 | steel-backed lead-free aluminum-silicon alloy, no overlay |
| P | 465 | 132 | steel-backed copper-lead intermediate layer with electroplated lead-tin-copper overlay (TM-1/TM-77/TM-112) |
| S | 344 | 59 | set number |
| — | 65 | 19 | — |
| G | 9 | 2 | steel-backed copper matrix with lead-tin babbitt infiltrant |
| AL | 4 | 1 | solid cast aluminum (AL-1) or steel-backed aluminum alloy lining (AL-3/4/5/6) |
| AP | 3 | 3 | A and P materials in one set (see A and P) |
| C | 2 | 0 | steel-backed copper-lead lining |

### By material designation

| material | records | legend |
|---|---:|---|
| AL-5 | 716 | steel-backed lead-free aluminum-silicon alloy without overlay |
| TM-77 | 369 | steel-backed copper-lead intermediate layer with electroplated lead-base overlay (trimetal) |
| AL-3 | 230 | steel-backed aluminum alloy without overlay |
| — | 197 | — |
| B-1 | 117 | steel-backed tin or lead base conventional babbitt (nominal .020 in) |
| TM-1 | 80 | steel-backed copper-lead matrix with overlay |
| Steel back/alloy | 55 | steel-backed alloy thrust washer |
| C-1 | 37 | steel-backed copper-lead matrix without overlay |
| B | 19 | rolled bronze |
| TM-112 | 11 | steel-backed copper-lead intermediate layer with electroplated lead-base overlay (trimetal) |
| B-2 | 5 | steel-backed tin or lead base micro-babbitt lining (nominal .006 in) |
| TM-78 | 2 | — |
| VP-3 | 1 | — |
| ERROR:# N/A | 1 | — |

### By family (US engine-build families)

| family | records | rod | main | cam | thrust | other |
|---|---:|---:|---:|---:|---:|---:|
| Small-block Chevy | 22 | 13 | 5 | 4 | 0 | 0 |
| Chevy Mark IV big block | 10 | 4 | 2 | 4 | 0 | 0 |
| Chevy Gen VI big block | 7 | 4 | 2 | 1 | 0 | 0 |
| Chevy W-series 348/409 | 5 | 4 | 0 | 1 | 0 | 0 |
| GM LS | 14 | 6 | 5 | 3 | 0 | 0 |
| GM LT (Gen V) | 7 | 6 | 1 | 0 | 0 | 0 |
| Small-block Ford (Windsor) | 17 | 9 | 7 | 1 | 0 | 0 |
| Ford 351C/351M/400 | 13 | 7 | 5 | 1 | 0 | 0 |
| Ford FE | 11 | 5 | 3 | 1 | 0 | 2 |
| Ford 429/460 | 6 | 4 | 1 | 1 | 0 | 0 |
| Ford Modular | 14 | 5 | 8 | 0 | 0 | 1 |
| Ford Coyote | 6 | 4 | 1 | 0 | 0 | 1 |
| Mopar LA small block | 16 | 5 | 8 | 2 | 0 | 1 |
| Mopar Magnum 5.2/5.9 | 12 | 5 | 4 | 2 | 0 | 1 |
| Mopar B/RB big block | 6 | 2 | 3 | 1 | 0 | 0 |
| Chrysler 426 Hemi | 5 | 2 | 2 | 1 | 0 | 0 |
| Chrysler Gen III Hemi 5.7/6.1 | 12 | 6 | 3 | 2 | 1 | 0 |
| Chrysler Gen III Hemi 6.2/6.4 | 9 | 6 | 1 | 1 | 1 | 0 |
| Pontiac V8 | 14 | 6 | 4 | 4 | 0 | 0 |
| Oldsmobile V8 | 13 | 5 | 3 | 5 | 0 | 0 |
| Buick big block | 3 | 1 | 1 | 1 | 0 | 0 |
| Buick 350 | 7 | 3 | 2 | 2 | 0 | 0 |
| Buick V6 181-252 | 15 | 8 | 3 | 1 | 0 | 3 |
| Cadillac 368-500 | 4 | 2 | 1 | 1 | 0 | 0 |
| AMC V8 | 6 | 4 | 1 | 1 | 0 | 0 |
| AMC/Jeep inline-6 | 7 | 3 | 3 | 1 | 0 | 0 |
| Chevy inline-6 | 15 | 11 | 2 | 2 | 0 | 0 |
| Ford 240/300 inline-6 | 9 | 5 | 2 | 2 | 0 | 0 |
| Mopar Slant Six | 7 | 4 | 0 | 2 | 0 | 1 |
| Cummins 5.9 12V | 5 | 1 | 1 | 2 | 0 | 1 |
| Cummins 5.9 24V/CR | 5 | 2 | 1 | 1 | 0 | 1 |
| Cummins 6.7 | 5 | 1 | 1 | 1 | 1 | 1 |
| Duramax 6.6 | 11 | 6 | 2 | 1 | 1 | 1 |
| Powerstroke 7.3 | 6 | 2 | 2 | 1 | 0 | 1 |
| Powerstroke 6.0 | 5 | 2 | 1 | 1 | 0 | 1 |
| Powerstroke 6.4 | 5 | 2 | 2 | 1 | 0 | 0 |
| Powerstroke 6.7 | 5 | 1 | 2 | 1 | 1 | 0 |

US families with no record: Ford Godzilla 7.3.

### US makes: engine lines left under the make heading (no engine-build family)

| make heading | engine lines mapped to a family | engine lines unresolved | records under the heading |
|---|---:|---:|---:|
| AM GENERAL TRUCK | 8 | 6 | 11 |
| AMERICAN MOTORS | 28 | 6 | 14 |
| AVANTI | 3 | 0 | 0 |
| CHRYSLER | 89 | 78 | 73 |
| CHRYSLER TRUCK | 15 | 20 | 45 |
| DODGE | 99 | 79 | 76 |
| DODGE TRUCK | 75 | 44 | 83 |
| FORD | 92 | 123 | 103 |
| FORD TRUCK | 99 | 83 | 93 |
| GMC | 282 | 192 | 143 |
| GMC TRUCK | 151 | 91 | 95 |
| JEEP TRUCK | 30 | 42 | 60 |
| RAM TRUCK | 11 | 4 | 7 |
| SRT | 0 | 1 | 3 |
| STUDEBAKER | 2 | 0 | 0 |

Unresolved US engine descriptions (distinct, most frequent first):

- CHRYSLER: 3.5L 215 CID SOHC 24V V6 Chrysler (6)
- DODGE: 3.5L 215 CID SOHC 24V V6 Chrysler (6)
- FORD TRUCK: 2.8L 170 CID L6 (5)
- DODGE: 2.0L 122 CID SOHC 8V L4 Mitsubishi (4)
- GMC: 2.8L 173 CID OHV 12V V6 General Motors (4)
- CHRYSLER: 2.0L 122 CID DOHC 16V L4 Mitsubishi (3)
- CHRYSLER: 2.0L 122 CID SOHC 8V L4 Mitsubishi (3)
- CHRYSLER: 2.2L 135 CID L4 (3)
- CHRYSLER: 2.4L 148 CID DOHC 16V L4 Chrysler (3)
- CHRYSLER: 5.2L 318 CID V8 (3)
- DODGE: 5.2L 318 CID V8 (3)
- DODGE TRUCK: 2.0L 122 CID SOHC 8V L4 Mitsubishi (3)
- FORD: 2.0L 122 CID DOHC 16V L4 Ford (3)
- FORD: 2.3L 140 CID SOHC 8V L4 Ford (3)
- FORD: 3.3L 200 CID L6 (3)
- FORD: 3.3L 200 CID OHV 12V L6 Ford (3)
- FORD: 3.6L 223 CID OHV 12V L6 Ford (3)
- FORD: 3.8L 232 CID OHV 12V V6 Ford (3)
- FORD: 4.1L 250 CID OHV 12V L6 Ford (3)
- FORD: 3.9L 239 CID L-HEAD 16V V8 Ford (3)
- FORD TRUCK: 2.0L 122 CID DOHC 16V L4 Ford (3)
- FORD TRUCK: 2.3L 140 CID DOHC 16V L4 Ford (3)
- FORD TRUCK: 3.5L 213 CID DOHC 24V V6 Ford (3)
- FORD TRUCK: 3.8L 232 CID OHV 12V V6 Ford (3)
- GMC: 1.0L 61 CID SOHC 6V L3 Suzuki (3)
- GMC: 2.8L 173 CID OHV 12V V6 General Motors Chevrolet (3)
- GMC: 5.7L 350 CID OHV 16V V8 General Motors (3)
- GMC: 7.5L 455 CID V8 (3)
- GMC TRUCK: 3.4L 207 CID OHV 12V V6 General Motors LA1 (3)
- JEEP TRUCK: 2.2L 134 CID L4 (3)
- JEEP TRUCK: 2.2L 134 CID L-HEAD L4 Willys (3)
- AMERICAN MOTORS: 4.7L 287 CID OHV 16V V8 AMC (2)
- CHRYSLER: 1.6L 98 CID DOHC 16V L4 Mitsubishi (2)
- CHRYSLER: 1.8L 107 CID SOHC 8V L4 Mitsubishi (2)
- CHRYSLER: 2.4L 2351 CC SOHC 8V L4 Mitsubishi 4G64 (2)
- CHRYSLER: 2.6L 156 CID SOHC 8V L4 Mitsubishi (2)
- CHRYSLER: 5.2L 318 CID OHV 16V V8 Chrysler A318, MD2, P31, R31 (2)
- CHRYSLER: 4.5L 273 CID V8 (2)
- CHRYSLER: 4.9L 301 CID OHV 16V V8 Chrysler (2)
- CHRYSLER: 5.2L 318 CID OHV 16V V8 Chrysler A318, LD2, MD2, P31, R31, S31, T31 (2)
- CHRYSLER TRUCK: 2.0L 122 CID SOHC 8V L4 Mitsubishi (2)
- CHRYSLER TRUCK: 3.8L 231 CID OHV 12V V6 Chrysler (2)
- CHRYSLER TRUCK: 4.7L 287 CID SOHC 16V V8 Chrysler (2)
- DODGE: 2.0L 122 CID DOHC 16V L4 Chrysler (2)
- DODGE: 2.0L 122 CID SOHC 16V L4 Chrysler (2)
- DODGE: 2.6L 156 CID SOHC 8V L4 Mitsubishi (2)
- DODGE: 2.4L 144 CID DOHC 16V L4 Chrysler ED3, EDG (2)
- DODGE: 2.4L 144 CID DOHC 16V L4 Chrysler ED3 (2)
- DODGE: 2.4L 144 CID DOHC 16V L4 Chrysler EDG (2)
- DODGE: 2.4L 148 CID DOHC 16V L4 Chrysler (2)
- DODGE: 3.8L 230 CID L6 (2)
- DODGE TRUCK: 2.4L 2351 CC SOHC 8V L4 Mitsubishi 4G64 (2)
- DODGE TRUCK: 2.6L 156 CID SOHC 8V L4 Mitsubishi (2)
- DODGE TRUCK: 2.5L 153 CID OHV 8V L4 Chrysler Magnum (2)
- DODGE TRUCK: 3.8L 231 CID OHV 12V V6 Chrysler (2)
- DODGE TRUCK: 4.7L 287 CID SOHC 16V V8 Chrysler (2)
- FORD: 1.6L 98 CID OHV 8V L4 Ford (2)
- FORD: 1.6L 97 CID SOHC 8V L4 Ford (2)
- FORD: 2.0L 121 CID DOHC 16V L4 Ford (2)
- FORD: 2.0L 122 CID DOHC 16V L4 Ford Duratec (2)
- ... 549 more

### Catalog headings used as fit.fam (import / other)

ACURA (22), ACURA TRUCK (8), AM GENERAL TRUCK (11), AMERICAN MOTORS (14), AUDI (11), AUSTIN (1), CHRYSLER (73), CHRYSLER TRUCK (45), DAEWOO (1), DODGE (76), DODGE TRUCK (83), FORD (103), FORD TRUCK (93), FREIGHTLINER TRUCK (5), GMC (143), GMC TRUCK (95), HONDA (27), HONDA TRUCK (21), HYUNDAI (16), HYUNDAI TRUCK (4), INFINITI (15), INFINITI TRUCK (13), ISUZU (5), ISUZU TRUCK (48), JAGUAR (5), JEEP TRUCK (60), KIA (12), KIA TRUCK (6), LAND ROVER TRUCK (4), LEXUS (27), LEXUS TRUCK (19), LOTUS (1), MAZDA (28), MAZDA TRUCK (43), MERCEDES-BENZ (1), MERCEDES-BENZ TRUCK (6), MG (1), MITSUBISHI (20), MITSUBISHI TRUCK (31), NISSAN (40), NISSAN TRUCK (30), PEUGEOT (1), RAM TRUCK (7), RENAULT (2), RENAULT TRUCK (1), SAAB (8), SAAB TRUCK (10), SCION (13), SRT (3), SUBARU (4), SUBARU TRUCK (4), SUZUKI (7), SUZUKI TRUCK (13), TOYOTA (53), TOYOTA TRUCK (56), TRIUMPH (4), VOLKSWAGEN (21), VOLKSWAGEN TRUCK (25), VOLVO (2)

## Skipped / parser log

- Engine-data and model tables at the start of each make (8 pt rows: engine → block number) were
  skipped; they are a cross-reference to the blocks, which were parsed in full.
- Numerical listings (printed 975-1004) and front matter were not turned into records.
- wrapped cell joined to the row above: 606
- page without bearing rows (index tables): 390
- engine-size text at the right (ignored): 86
- trailing 'in' stripped from a part number: 15
- page with two column headers (two makes): 6
- part cell not part-like: 6
- row before any block on the page (skipped): 1
- Unclassified lines (first 25 of 6):
  - PDF p582 [part]: MB
  - PDF p584 [part]: MB
  - PDF p607 [part]: MB
  - PDF p738 [part]: MB
  - PDF p915 [part]: MB
  - PDF p916 [part]: MB

## QA

- Validation problems: 0
- Rows that print no shop data (undersize-only rows, some pair/set twins) filled from another printing
  of the same bearing number (`spec.dimsFrom`): 6; materials filled the same way: 10.
- Part numbers whose shop data differs between blocks (first occurrence kept): 0
- rod/main part without standard shaft diameter: 106
- rod/main part without material designation: 99
- (housing-journal)/2 differs from max wall by > .012: 57
- shop-data cell not parsed as a number: 6
- housing <= journal (print or parse error): 5
  - wall mismatch: CB-1385A, CB-1385A(6), CB-1634A, CB-1634A(8), CB-1657P, CB-1860P, CB-1905P, CB-527P, CB-745A, CB-745A(4), CB-745A(6), CB-745A(8)
  - no journal: CB-1794P(6), CB-1876P, CB-1879A, CB-1879A(6), CB-1915P(6), CB-1947A(6), CB-1948A(4), CB-1961A(4), CB-1998A(4), CB-465C, MS-1329A, MS-1545A
  - no material: CB-1794P(6), CB-1795A(6), CB-1839A, CB-1879A, CB-1879A(6), CB-1998A(4), CB-465C, MS-1329A, MS-1545A, MS-178P, MS-1803A, MS-1821A
  - housing <= journal: 223-3653, CB-527P, MS-2200P
  - unparsed cell: MS-2232A, MS-2276A
- Coverage against the numerical listings (part numbers printed there vs. seen in the
  application blocks; a number only in the listing means a block was missed or the listing
  carries a number no block prints):
  - rod sets/pairs: listing 331, blocks 331, only in listing 0, only in blocks 0
  - main sets: listing 232, blocks 221, only in listing 11 (MS-1802AL, MS-1950P, MS-2014AL, MS-2015P, MS-2261P, MS-2299, MS-2334A, MS-2335AL, MS-2341P, MS2268AL, MS2559P), only in blocks 0
  - cam sets: listing 72, blocks 82, only in listing 1 (SH567S), only in blocks 11 (SH-1094S, SH-1095S, SH-1429S, SH-1469S, SH-1526S, SH-1798S, SH-1977S, SH-1997S, SH-2000S, SH-2002S, SH-2008S)
  - thrust washer sets: listing 59, blocks 59, only in listing 0, only in blocks 0
  - pin bushings: listing 26, blocks 26, only in listing 0, only in blocks 0
  - individual main bearings: listing 347, blocks 403, only in listing 0, only in blocks 56 (MB1739WL, MB1739WU, MB2746W, MB2753W, MB2925WL, MB2925WU, MB2965WL, MB2965WU, MB3061W, MB3108WL, MB3108WU, MB3172W...)
- Cross-check with the shop tool's extraction of the same PDF (read only):
  - shop: 1333 blocks, 2506 engines, 4616 set/pair rows,
    695 distinct set/pair numbers, 528 distinct shell numbers;
    here: 1360 blocks, 2562 engines, 4763 rows, 722 set/pair
    numbers, 584 shell numbers.
  - set/pair numbers only in the shop file: 0
  - set/pair numbers only here: 27 — 223-3349, 223-3451, 223-3484, 223-3501, 223-3512, 223-3546, 223-3576, 223-3608, 223-3609, 223-3611, 223-3612, 223-3647, 223-3648, 223-3651, 223-3653, 223-3654, 223-3665, 223-3671, 223-3672, 223-3679
  - shell numbers only in the shop file: 0
  - shell numbers only here: 40 — MB2267AL, MB2925WL, MB2925WU, MB2981P(F), MB2981P1(F), MB3061W, MB3139W, MB3172W, MB3201WL, MB3201WU, MB3343W, MB3348W, MB3350W, MB3474W, MB3477WL, MB3477WU, MB3478W, MB3544W, MB3551W, MB3591AZ
- Catalog misprints are kept as printed and flagged in the QA counts above (housing ranges printed
  max/min reversed such as `2.6530/2.6522`, a material printed as `ERROR:#`, an occasional
  `0.0005/0.0005` clearance). Nothing was corrected by hand.
- Year spans are model years from the catalog's VIN-code lists; engines without a printed year
  have no `y0`/`y1`. Rod sets shared across many engines carry the widest span.
- Family assignment for GM 350/400/455 V8s without a division name relies on the block's journal
  diameters and bore x stroke as described above; the unresolved list shows what was left under
  the make heading rather than guessed.
