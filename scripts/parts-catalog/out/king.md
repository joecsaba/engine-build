# King Engine Bearings — extraction notes (2026-10-17)

## Source and method

- File: `Catalogs/King-catalog-201-2018-Europe-2.pdf` — King Engine Bearings catalog 2017-2018, Europe edition, 983 PDF pages,
  text layer (no OCR). Saved by hand into `Catalogs/`; no network used.
- Parsed PDF pages 372-920 (printed application pages 1-549, makes Acura → Volvo).
  The Numerical Listing (printed 589+) only maps set number → make/panel and the Interchange
  (printed 550-588) maps competitor numbers, so neither was needed; the "King Racing Line"
  pages (CLIV-CLXIX) are graphics with no text layer and contain no data to extract.
- Each page's columns are calibrated from its `King Set No. | Part No. | Qty. | Position |
  Crankshaft | Housing | Length | Wall` header; words are assigned to columns by x position
  (PyMuPDF `get_text("words")`). The catalog prints ghost letters from a hidden layer on top
  of engine descriptions; they are removed by bounding-box overlap.
- A panel = engine description line(s) (`NNN CID ... years cc bore X stroke cyl`) followed by
  set rows. Set rows start with `CR` (rod), `MB` (main), `CS` (cam) or `TW` (thrust washer);
  undersizes follow the set number; shell part numbers, qty, crank positions and dimensions
  (inch line, mm line) are paired to shells by vertical proximity. Panels and sets continue
  across page breaks.
- `p` is the King set number with the catalog's inner space removed (`CR 439AM` → `CR439AM`).
- `spec.journal`/`housing` are the maximum (nominal) inch values of the printed min/max crank
  and housing diameters; `journalMin`/`housingMin` keep the minimum; `*Mm` keys carry the mm
  values. `width` is the catalog's bearing length and `thickness` the wall at crown (inches).
  Thrust washers have no length in the catalog (printed 0.000); for a thrust washer set
  `journal` is the crank thrust-face diameter range and `housing` the washer's outer seat.
  Flanged main sets carry the flange shell (`F...`) as an extra entry in `spec.shells`;
  when the catalog lists undersizes only as rows of the flange-length table,
  `undersizeFromFlangeTable: true` is set.
- `spec.undersize` keeps the catalog tokens: decimals are mm (`0.25`, `0.5`), three-digit
  tokens are inch thousandths (`010` = .010"), `STDX`/`...X` = extra clearance, `STDG`/`STDR`
  as printed. `flangeLengthMm` is the catalog's "crank flange length mm" table by undersize.
- `spec.series` is the set-number suffix; `material` comes from the catalog's material legend
  (pp XI-XIV) for the base code (AM, SI, SM, CA, CP, XA, SX, SV, SP, HP, XP, GP). Composite
  racing suffixes (XPC, XPN, XPND, XPNC, XPG, HPN, HPND, HPT) are mapped by their first two
  letters; what the extra letters mean is only given by the row notes (`narrow`, `narrow,
  with dowel hole`, `(high performance, coated)`), which are kept in `spec.notes`. The catalog
  never prints the trade name pMaxKote; `coated: true` is set when the row note says coated.
  `BB`/`BX`/`BBX` (cam bearings) are not in the legend → material null.
- Families: one record per (set, family). GM/Mopar/Jeep V8 and six families that the
  catalog does not name (Chevy vs Olds vs Pontiac vs Buick 350; slant six vs Buick 225 V6 in
  Jeeps) are resolved from the panel's own main/rod journal diameters; big-block Chevy
  panels spanning 1965-1999 get both Mark IV and Gen VI records; Chrysler 318/360 panels
  spanning 1992+ get both LA and Magnum records. Engines with no engine-build family keep
  the catalog make heading as `fit.fam` (listed below).

## Counts

- Panels parsed: 1498 across 75 makes; set occurrences: 5483;
  distinct set numbers: 1942; records (set × family): 3213.
- Records in US engine-build families: 295 (227 distinct set numbers);
  records left under a US make heading with no family: 588;
  records under European/import make headings: 2330.

### By position

| position | all records | US-family records |
|---|---:|---:|
| main | 1286 | 119 |
| rod | 1435 | 116 |
| cam | 158 | 59 |
| thrust | 334 | 1 |

### By series (set-number suffix)

| series | all records | US-family records | material (legend) |
|---|---:|---:|---|
| AM | 1450 | 34 | K-783 aluminum bimetal (Al20Sn1Cu, no overlay) |
| SI | 497 | 99 | K-788 aluminum-silicon bimetal (Al12Sn2.5Si1Cu, no overlay) |
| CP | 428 | 9 | K-794 copper-lead trimetal (Cu23Pb3.5Sn, Pb10Sn3Cu overlay) |
| XP | 242 | 20 | K-798 pMax Black copper-lead trimetal (racing) |
| BB | 133 | 43 | — |
| SP | 105 | 0 | upper K-624 sputter-overlay trimetal / lower K-794/795/796 |
| SM | 61 | 1 | K-789 aluminum bimetal (Al7Sn2Si1.5CuMnCr, no overlay) |
| SV | 61 | 0 | upper K-796 silver-overlay lead-free trimetal / lower K-794/795/796 |
| CA | 59 | 8 | upper K-794 copper-lead trimetal / lower K-783 aluminum bimetal |
| XA | 43 | 0 | upper K-795 copper-lead trimetal / lower K-788 aluminum bimetal |
| HP | 35 | 25 | K-787 Alecular aluminum bimetal (racing) |
| SX | 16 | 0 | K-795 copper-lead trimetal (Cu21Pb4.5Sn, Pb10Sn3Cu overlay) |
| XPN | 15 | 13 | K-798 pMax Black copper-lead trimetal (racing) |
| HPN | 12 | 10 | K-787 Alecular aluminum bimetal (racing) |
| XPNC | 12 | 9 | K-798 pMax Black copper-lead trimetal (racing) |
| XPC | 10 | 7 | K-798 pMax Black copper-lead trimetal (racing) |
| HPND | 9 | 7 | K-787 Alecular aluminum bimetal (racing) |
| XPND | 8 | 7 | K-798 pMax Black copper-lead trimetal (racing) |
| BX | 7 | 0 | — |
| XPG | 6 | 0 | K-798 pMax Black copper-lead trimetal (racing) |
| HPT | 3 | 3 | K-787 Alecular aluminum bimetal (racing) |
| BBX | 1 | 0 | — |

### By family (US engine-build families)

| family | records | main | rod | cam | thrust |
|---|---:|---:|---:|---:|---:|
| Small-block Chevy | 29 | 16 | 10 | 3 | 0 |
| Chevy Mark IV big block | 18 | 8 | 7 | 3 | 0 |
| Chevy Gen VI big block | 18 | 8 | 7 | 3 | 0 |
| Chevy W-series 348/409 | 8 | 0 | 7 | 1 | 0 |
| GM LS | 21 | 7 | 5 | 9 | 0 |
| Small-block Ford (Windsor) | 21 | 11 | 8 | 2 | 0 |
| Ford 351C/351M/400 | 12 | 9 | 2 | 1 | 0 |
| Ford FE | 4 | 2 | 1 | 1 | 0 |
| Ford 429/460 | 8 | 3 | 2 | 3 | 0 |
| Ford Modular | 23 | 13 | 7 | 3 | 0 |
| Ford Coyote | 5 | 0 | 5 | 0 | 0 |
| Mopar LA small block | 14 | 7 | 4 | 3 | 0 |
| Mopar Magnum 5.2/5.9 | 12 | 5 | 4 | 3 | 0 |
| Mopar B/RB big block | 8 | 2 | 4 | 2 | 0 |
| Chrysler 426 Hemi | 5 | 1 | 3 | 1 | 0 |
| Chrysler Gen III Hemi 5.7/6.1 | 7 | 2 | 3 | 1 | 1 |
| Pontiac V8 | 8 | 4 | 2 | 2 | 0 |
| Oldsmobile V8 | 5 | 1 | 2 | 2 | 0 |
| Buick 350 | 3 | 1 | 1 | 1 | 0 |
| Buick V6 181-252 | 15 | 7 | 4 | 4 | 0 |
| AMC V8 | 4 | 1 | 2 | 1 | 0 |
| AMC/Jeep inline-6 | 6 | 2 | 3 | 1 | 0 |
| Chevy inline-6 | 5 | 1 | 2 | 2 | 0 |
| Ford 240/300 inline-6 | 6 | 1 | 2 | 3 | 0 |
| Mopar Slant Six | 6 | 2 | 2 | 2 | 0 |
| Cummins 5.9 12V | 6 | 1 | 5 | 0 | 0 |
| Cummins 5.9 24V/CR | 9 | 2 | 7 | 0 | 0 |
| Cummins 6.7 | 3 | 0 | 3 | 0 | 0 |
| Duramax 6.6 | 1 | 0 | 0 | 1 | 0 |
| Powerstroke 7.3 | 3 | 1 | 1 | 1 | 0 |
| Powerstroke 6.4 | 2 | 1 | 1 | 0 | 0 |

US families with no King set in this edition: GM LT (Gen V), Ford Godzilla 7.3, Chrysler Gen III Hemi 6.2/6.4, Buick big block, Cadillac 368-500, Powerstroke 6.0, Powerstroke 6.7.

### US makes: engines left under the make heading (no engine-build family)

| make | engine lines mapped to a family | records left under the make heading |
|---|---:|---:|
| American Motors | 35 | 20 |
| Chrysler | 280 | 122 |
| Cummins | 10 | 14 |
| Ford | 540 | 227 |
| General Motors | 801 | 128 |
| Hummer | 1 | 0 |
| International | 0 | 29 |
| International Truck | 13 | 4 |
| Jeep | 63 | 44 |

Notable US engines deliberately left under the make heading because the engine-build family
list has no slot for them: Ford Y-block 239-312 and 6.9/7.3 IDI diesels, Ford 144-250 small
sixes, 2.3 Lima/HSC, Vulcan/Essex/Duratec V6; Chrysler poly A 277-326 (shares the LA panel),
3.9 Magnum V6, 4.7 PowerTech, Viper V10, 2.7/3.2/3.5 V6; GM 2.5 Iron Duke, Chevy 90-degree V6
(200-262), 6.2/6.5 Detroit diesel, 8.1 Vortec (Gen VII), Northstar, Cadillac HT4100/4.5/4.9,
Buick/Olds 215 aluminum V8, stovebolt 235/261; AMC 150 four; Jeep 134/226/230 and 3.7;
International/International Truck IDI 6.9/7.3 and tractor diesels; Cummins 4B, ISF and C/8.3.

### Catalog headings used as fit.fam (European / import / other)

Acura (35), Alfa Romeo (30), American Motors (20), Audi (73), Austin (31), Autobianchi (12), BMW (37), Bedford (29), Bolinder Munktell (6), Caterpillar (3), Chrysler (122), Citroen (54), Cummins (14), Dacia (6), Daewoo (22), Daf (16), Daihatsu (9), David Brown (10), Deutz (20), Fendt (4), Fiat (101), Ford (227), General Motors (128), Holden (11), Honda (48), Hyundai (55), Infiniti (16), International (29), International Truck (4), Isuzu (92), Iveco (62), Jaguar (13), Jeep (44), John Deere (40), Kia (37), Lada (4), Lancia (47), Land Rover (36), Lexus (10), Leyland (35), Lombardini (8), MAN (24), MG (30), MWM (15), Massey Ferguson (6), Mazda (64), Mercedes-Benz (113), Mini (7), Mitsubishi (73), New Holland (6), Nissan (131), Opel (67), Pegaso (4), Perkins (41), Peugeot (74), Porsche (9), RVI (10), Renault (65), Rover (25), Ruggerini (5), Saab (17), Same (5), Scania (8), Seat (60), Skoda (40), Smart (8), Ssangyong (3), Steyr (7), Subaru (31), Suzuki (39), Toyota (140), Vauxhall (32), Volkswagen (94), Volvo (65)

## Skipped / parser log

- Engine Index lines skipped (engine → panel cross-reference, redundant with the panels): 4679.
- page without header (reused previous columns): 40
- dims line could not be attached to a shell: 5

## QA

- Validation problems: 0
- Set numbers whose dimensions differ between panels (first occurrence kept): 15 — CS422BB, MB558SI, MB5534SI, MB517SI, MB593AM, MB5283XP, MB5280HP, MB5280XP, MB562AM, MB5549AM, CR4232AM, CS305BB, MB5382XPG, MB5740XPG, MB7029AM
- series without material legend (BB): 133
- main/rod set without crank diameter: 95
- no undersize list: 67
- (housing-journal)/2 differs from wall by > .012: 10
- housing <= journal (print or parse error): 9
- series without material legend (BX): 7
- series without material legend (BBX): 1
- wall thickness > 0.25 in (misprint, e.g. 0.7990): 1
  - no journal: CR1288SI, CR1289SI, CR1290SI, CR1296CP, CR1302SI, CR1686SP, CR222SV, CR339AM, CR357SV, CR359SV, CR4333CP, CR4349CP
  - housing <= journal: MB4017SI, MB5234AM, MB5666SI, MB7063AM, MB7063XP, TW120AM, TW237AM
  - wall mismatch: CR524SP, MB4017SI, MB4507SI, MB4524SI, MB4524XP, MB5234AM, MB5666SI, MB7063AM, MB7063XP, MB7713CP
  - wall > 0.25: CR524SP
- Catalog misprints are kept as printed (e.g. a cam-shell wall of 0.7990 in / 20.295 mm on the
  GM Gen III/IV CS5171 rows, a 2.6500/2.1670 crank range on CS5503); see the QA counts above.
- `spec.shells` for multi-shell sets (upper/lower halves, flange shell, thrust washers listed
  under one set number, e.g. MB5283XP) is best-effort: wrapped position lists and lower-half
  rows without dimensions can appear as extra entries. Top-level journal/housing/width/
  thickness always come from the first shell that carries dimensions.
- Year spans come from the catalog's month/year ranges per engine; open-ended ranges drop `y1`.
- Edition is European 2017-2018: US coverage ends around model year 2010-2012, so there are no
  Gen V LT, Coyote Gen 2+, Godzilla, Gen III Hemi 6.4, Powerstroke 6.7 or Cummins 6.7 (2013+) rows
  unless listed in the family table above.
