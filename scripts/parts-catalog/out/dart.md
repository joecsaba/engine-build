# Dart — extraction notes

Extracted 2026-10-16 by `scripts/parts-catalog/extract_dart.py`.

## What was parsed

One local document, `Catalogs/DART VOLUME 23 - ISSUU - small.pdf` (Dart Machinery catalog Volume 23, © 2023, 126 PDF pages, text layer), saved by hand by the owner because dartheads.com blocks fetchers. No network request was made. The extractor takes `--pdf <path>` and defaults to that file. PDF page numbers below are 1-based PDF indexes; the printed page number is two less (`src.printedPage`).

Pages used:

- cylinder heads: 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 54, 55, 56, 57, 58, 59, 60, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 98, 99, 100, 101, 102, 103
- engine blocks: 14, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 46, 47, 48, 49, 50, 51, 52, 53, 64, 65, 66, 67, 68, 69, 94, 95, 96, 97
- intake manifolds: 43, 61, 90, 104
- not extracted: short blocks (15, 45, 92, 118), top-end kits (16, 63, 93), billet block/head brochure pages (106-107), accessories and service parts (44, 62, 91, 105, 108-117: head parts kits, valves, springs, retainers, sleeves, cam bearings, main caps, gaskets, studs), the LS and BBC crankshafts (119-120) and apparel (121). Cranks could be a follow-up `crank` extraction (8 rows: stroke, min rod length, main and rod journal).

## Method

- pdfplumber `extract_words` with x/y positions. Each product page keeps its tables in a left band (the `PART NO.` column through the last header word) and a SPECS box / `FLOW DATA @ 28" WATER` table / recommended-manifold list in a right sidebar that shares the same y positions. Words are assigned to the band or the sidebar by x, which is what makes the rows parseable (`extract_text` interleaves the two).
- Heads: series heading (`PRO1 23° 200cc - ALUMINUM (Straight Plug Heads) - 2.020"/1.600" VALVES`) → runner cc, valve angle, valve sizes, port shape, plug style, casting type, marine, LS style, bolt count, chamber bore; optional `64cc COMBUSTION CHAMBERS` sub-heading → chamber cc (and valves on the 18° page); header `PART NO. CONFIGURATION FOR USE MAX. LIFT [CHAMBER CC]` → column x positions; rows → part number, configuration text, max lift (from the MAX. LIFT column), chamber cc (CHAMBER CC column when present, else the sub-heading, else the page SPECS box when it prints one value). Valve sizes fall back to the SPECS box when the heading has none and the box prints a single size. Wrapped headings are re-joined (unbalanced parenthesis, trailing `-`, `Rockers)` / `x.xxx"/x.xxx" VALVES` continuation lines); wrapped configuration text (`... - Features` + `O Ring Ports & Fire Ring Deck`, `w/ steel` + `guides & seats`) is re-joined by its x position under the CONFIGURATION column.
- Split tokens from the text layer are repaired by x gap (≤ 5.5 pt): `18 17 503 0` → `18175030`, `128 111` → `128111`, `4 4 4 14 000` → `44414000`, `1.4 3 7 ”` → `1.437"`, `.8 50"` → `.850"`, `8 7` → `87`, `D ual` → `Dual`; merged tokens are split (`11010020Bare`, `110111221.290”`); the p38 heading artefact `FULL P+A34:I62ORT` is read as `FULL PORT`.
- Flow: every `lift cfm cfm[ cfm]` sequence on a head page is grouped under the nearest `FLOW DATA` label above it. Labels that name a runner size (`310cc`, `383cc`, `451CC CNC`), a valve pair (`w/ 2.500-1.850 valves`) or `(SMC)` are matched to the heads they describe; an unlabeled table applies to the rest of the page. Three-column tables are mapped per page: p36 intake / A-port exhaust / B-port exhaust, p85 18° intake / 14° intake / exhaust, p86 2.470 / 2.500 intake / exhaust. `spec.flowDepression` = 28 for all flow arrays.
- Blocks: rows `PART NO. DESCRIPTION [CAM LOC.] [CAM] [REAR SEAL] CAPS MAINS DECK BORE` are parsed from the right (deck/bore = first inch pair in range, then mains, caps, then rear seal / cam journal / cam location tokens, the rest is the description). `maxBore` is the page's `(max)` bore (or `bored to x.xxx` / `Cylinder Bores: a to b`), `material`, `lifterBore`, `rearSeal`, raised-cam offset and `maxStroke` ("Clearance for x.xxx stroke") come from the page SPECS box and features list. `mainJournal` and `camBore` are the standard sizes for the printed designation (`SBC 350` 2.449, `SBC 400` 2.649, LS 2.559, BBC 2.749, `SBF 302` 2.249, `351C` 2.749; cam `SBC` 1.869, `BBC` 1.949, `50mm` 1.969, `55mm`/LS 2.165), with the designation kept in `mains` / `camJournal`; Gen III Hemi and SBF cam bores are not derived. `mainCaps` = cap material from the row + the bolt pattern from the page (`4-bolt #2-4, 2-bolt #1 and #5` for SHP / Little M Sportsman, `4-bolt` or `4-bolt 1-5` otherwise).
- Intakes: `PART NO [USE WITH HEADS|DESCRIPTION] PORT ... DECK CARB [INJ. MACHINING] [CNC]` rows; `type` from the table title / description (Box Ram → `tunnel-ram` with `style`), `carbFlange` 4150 → square, 4500 → dominator, `deckHeight` as printed (`Std.` → 9.025 SBC / 9.240 LS, kept in `deckAsPrinted`), `portStyle`, LS injector-boss and CNC flags. Spacer kits, end-rail spacers and box-ram top plates are not manifolds and were skipped. `emissions` is `no_eo_race_only` for intakes (every page carries "Not intended for sale or use with pollution controlled vehicles").
- Families: pages 15-44 `Small-block Chevy` (4.500" bore-space blocks/heads → `Chevy 4.500 bore spacing small block`, as the Brodix extractor did), 45-62 `GM LS`, 63-91 both Chevy big-block families for heads and intakes (blocks: Big M / Big M2 / aluminum / Race Series = 2-pc rear seal → `Chevy Mark IV big block`; Big M Gen V / Gen VI = 1-pc seal → `Chevy Gen VI big block`; Big Chief 5.000" bore-space head → `Chevy 5.0 bore spacing big block`; the 8.1L manifold → `Chevy Gen VII 8.1L big block`), 92-105 `Small-block Ford (Windsor)`, p14 Gen III Hemi blocks → `Chrysler Gen III Hemi 5.7/6.1` (non-VVT) or both Gen III Hemi families (VVT).

## Records

| cat | records |
|---|---|
| block | 320 |
| head | 570 |
| intake | 57 |
| **total** | 947 |

### Records per family

| cat | family | records |
|---|---|---|
| block | Small-block Chevy | 125 |
| block | GM LS | 56 |
| block | Chevy 4.500 bore spacing small block | 51 |
| block | Chevy Mark IV big block | 46 |
| block | Small-block Ford (Windsor) | 24 |
| block | Chrysler Gen III Hemi 5.7/6.1 | 8 |
| block | Chevy Gen VI big block | 6 |
| block | Chrysler Gen III Hemi 6.2/6.4 | 4 |
| head | Chevy Gen VI big block | 182 |
| head | Chevy Mark IV big block | 182 |
| head | Small-block Chevy | 137 |
| head | GM LS | 36 |
| head | Small-block Ford (Windsor) | 30 |
| head | Chevy 5.0 bore spacing big block | 2 |
| head | Chevy 4.500 bore spacing small block | 1 |
| intake | Chevy Gen VI big block | 17 |
| intake | Chevy Mark IV big block | 17 |
| intake | Small-block Chevy | 15 |
| intake | Small-block Ford (Windsor) | 4 |
| intake | GM LS | 3 |
| intake | Chevy Gen VII 8.1L big block | 1 |

### Rows per page

| PDF page | printed | cat | records (distinct PNs) |
|---|---|---|---|
| 14 | 12 | block | 12 (8) |
| 17 | 15 | block | 7 (7) |
| 18 | 16 | block | 4 (4) |
| 19 | 17 | block | 1 (1) |
| 20 | 18 | block | 4 (4) |
| 21 | 19 | block | 4 (4) |
| 22 | 20 | block | 24 (24) |
| 23 | 21 | block | 30 (30) |
| 24 | 22 | block | 24 (24) |
| 25 | 23 | block | 51 (51) |
| 26 | 24 | block | 27 (27) |
| 27 | 25 | head | 16 (16) |
| 28 | 26 | head | 10 (10) |
| 29 | 27 | head | 6 (6) |
| 30 | 28 | head | 4 (4) |
| 31 | 29 | head | 12 (12) |
| 32 | 30 | head | 20 (20) |
| 33 | 31 | head | 18 (18) |
| 34 | 32 | head | 10 (10) |
| 35 | 33 | head | 3 (3) |
| 36 | 34 | head | 4 (4) |
| 37 | 35 | head | 4 (4) |
| 38 | 36 | head | 15 (15) |
| 39 | 37 | head | 7 (7) |
| 40 | 38 | head | 2 (2) |
| 41 | 39 | head | 5 (5) |
| 42 | 40 | head | 2 (2) |
| 43 | 41 | intake | 15 (15) |
| 46 | 44 | block | 2 (2) |
| 47 | 45 | block | 2 (2) |
| 48 | 46 | block | 4 (4) |
| 49 | 47 | block | 8 (8) |
| 50 | 48 | block | 10 (10) |
| 51 | 49 | block | 20 (20) |
| 52 | 50 | block | 10 (10) |
| 54 | 52 | head | 4 (4) |
| 55 | 53 | head | 6 (6) |
| 56 | 54 | head | 7 (7) |
| 57 | 55 | head | 5 (5) |
| 58 | 56 | head | 8 (8) |
| 59 | 57 | head | 2 (2) |
| 60 | 58 | head | 4 (4) |
| 61 | 59 | intake | 3 (3) |
| 64 | 62 | block | 6 (6) |
| 65 | 63 | block | 8 (8) |
| 66 | 64 | block | 8 (8) |
| 67 | 65 | block | 12 (12) |
| 68 | 66 | block | 6 (6) |
| 69 | 67 | block | 12 (12) |
| 70 | 68 | head | 42 (21) |
| 71 | 69 | head | 28 (14) |
| 72 | 70 | head | 26 (13) |
| 73 | 71 | head | 12 (6) |
| 74 | 72 | head | 16 (8) |
| 75 | 73 | head | 10 (5) |
| 76 | 74 | head | 10 (5) |
| 77 | 75 | head | 10 (5) |
| 78 | 76 | head | 12 (6) |
| 79 | 77 | head | 32 (16) |
| 80 | 78 | head | 36 (18) |
| 81 | 79 | head | 20 (10) |
| 82 | 80 | head | 16 (8) |
| 83 | 81 | head | 16 (8) |
| 84 | 82 | head | 16 (8) |
| 85 | 83 | head | 24 (12) |
| 86 | 84 | head | 16 (8) |
| 87 | 85 | head | 14 (7) |
| 88 | 86 | head | 8 (4) |
| 89 | 87 | head | 2 (2) |
| 90 | 88 | intake | 35 (18) |
| 94 | 92 | block | 4 (4) |
| 95 | 93 | block | 6 (6) |
| 96 | 94 | block | 4 (4) |
| 97 | 95 | block | 10 (10) |
| 98 | 96 | head | 6 (6) |
| 99 | 97 | head | 4 (4) |
| 100 | 98 | head | 6 (6) |
| 101 | 99 | head | 8 (8) |
| 102 | 100 | head | 3 (3) |
| 103 | 101 | head | 3 (3) |
| 104 | 102 | intake | 4 (4) |

## Families not in the fitment list (need a decision)

- `Chevy 4.500 bore spacing small block` (52 records)
- `Chevy 5.0 bore spacing big block` (2 records)
- `Chevy Gen VII 8.1L big block` (1 records)

## Rows skipped

- p27 11995555--8866: row before any heading/header
- p90 41114000: no carb column: 41114000 43144000 41616010

## Needs human QA

- 14500000C (Small-block Chevy, p42): no flow table matched (none printed)
- 14500000C (p42): chamber cc not printed for this row (SPECS box lists several sizes)
- 14500000C (p42): valve sizes not resolved
- 14500001C (Chevy 4.500 bore spacing small block, p42): no flow table matched (none printed)
- 14500001C (p42): chamber cc not printed for this row (SPECS box lists several sizes)
- 14500001C (p42): valve sizes not resolved
- 19300030MMR (p74): valve sizes not resolved
- 19300030MMR (p74): valve sizes not resolved
- 19300132MMR (p74): valve sizes not resolved
- 19300132MMR (p74): valve sizes not resolved
- 19474030 (p75): valve sizes not resolved
- 19474030 (p75): valve sizes not resolved
- 19474136 (p75): valve sizes not resolved
- 19474136 (p75): valve sizes not resolved
- 19474139 (p75): valve sizes not resolved
- 19474139 (p75): valve sizes not resolved
- 19474030M (p75): valve sizes not resolved
- 19474030M (p75): valve sizes not resolved
- 19474136M (p75): valve sizes not resolved
- 19474136M (p75): valve sizes not resolved
- 19574030 (p76): valve sizes not resolved
- 19574030 (p76): valve sizes not resolved
- 19574136 (p76): valve sizes not resolved
- 19574136 (p76): valve sizes not resolved
- 19574139 (p76): valve sizes not resolved
- 19574139 (p76): valve sizes not resolved
- 19574030M (p76): valve sizes not resolved
- 19574030M (p76): valve sizes not resolved
- 19574136M (p76): valve sizes not resolved
- 19574136M (p76): valve sizes not resolved
- 19874080 (p77): valve sizes not resolved
- 19874080 (p77): valve sizes not resolved
- 19874186 (p77): valve sizes not resolved
- 19874186 (p77): valve sizes not resolved
- 19874189 (p77): valve sizes not resolved
- 19874189 (p77): valve sizes not resolved
- 19874080M (p77): valve sizes not resolved
- 19874080M (p77): valve sizes not resolved
- 19874186M (p77): valve sizes not resolved
- 19874186M (p77): valve sizes not resolved
- 19774080 (Chevy Mark IV big block, p79): no flow table matched (no flow table printed for this configuration)
- 19774080 (Chevy Gen VI big block, p79): no flow table matched (no flow table printed for this configuration)
- 19774186 (Chevy Mark IV big block, p79): no flow table matched (no flow table printed for this configuration)
- 19774186 (Chevy Gen VI big block, p79): no flow table matched (no flow table printed for this configuration)
- 19770000S (Chevy Mark IV big block, p79): no flow table matched (none printed)
- 19770000S (p79): chamber cc not printed for this row (SPECS box lists several sizes)
- 19770000S (p79): valve sizes not resolved
- 19770000S (Chevy Gen VI big block, p79): no flow table matched (none printed)
- 19770000S (p79): chamber cc not printed for this row (SPECS box lists several sizes)
- 19770000S (p79): valve sizes not resolved
- 19770000XS (Chevy Mark IV big block, p80): no flow table matched (none printed)
- 19770000XS (p80): chamber cc not printed for this row (SPECS box lists several sizes)
- 19770000XS (p80): valve sizes not resolved
- 19770000XS (Chevy Gen VI big block, p80): no flow table matched (none printed)
- 19770000XS (p80): chamber cc not printed for this row (SPECS box lists several sizes)
- 19770000XS (p80): valve sizes not resolved
- 18200000CS (Chevy Mark IV big block, p86): no flow table matched (none printed)
- 18200000CS (p86): chamber cc not printed for this row (SPECS box lists several sizes)
- 18200000CS (p86): valve sizes not resolved
- 18200000CS (Chevy Gen VI big block, p86): no flow table matched (none printed)
- 18200000CS (p86): chamber cc not printed for this row (SPECS box lists several sizes)
- 18200000CS (p86): valve sizes not resolved
- 18275179 (p86): assembled head without a max lift value
- 18275179 (p86): assembled head without a max lift value
- 18375189 (p86): assembled head without a max lift value
- 18375189 (p86): assembled head without a max lift value
- 18575070 (Chevy Mark IV big block, p87): no flow table matched (no flow table printed for this configuration)
- 18575070 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575070 (Chevy Gen VI big block, p87): no flow table matched (no flow table printed for this configuration)
- 18575070 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575179 (Chevy Mark IV big block, p87): no flow table matched (no flow table printed for this configuration)
- 18575179 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575179 (Chevy Gen VI big block, p87): no flow table matched (no flow table printed for this configuration)
- 18575179 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575090 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575090 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575090CN (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575090CN (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575199 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575199 (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575199CN (p87): chamber cc not printed for this row (chamber volume: call Dart)
- 18575199CN (p87): chamber cc not printed for this row (chamber volume: call Dart)
- p27: one flow table is applied to 2 runner/valve combinations (165cc 1.94/1.5, 165cc 2.02/1.6); the catalog prints only one
- p28: one flow table is applied to 3 runner/valve combinations (165cc 1.94/1.5, 170cc 1.94/1.5, 170cc 2.02/1.6); the catalog prints only one
- p37: one flow table is applied to 2 runner/valve combinations (245cc 2.15/1.6, 245cc 2.18/1.6); the catalog prints only one
- p38: one flow table is applied to 7 runner/valve combinations (250cc 2.15/1.6, 250cc 2.15/1.625, 250cc 2.18/1.6, 250cc 2.18/1.625, 272cc 2.18/1.6, 272cc 2.18/1.625, 272cc 2.2/1.625); the catalog prints only one
- p39: one flow table is applied to 3 runner/valve combinations (284cc 2.15/1.6, 284cc 2.18/1.6, 284cc 2.18/1.625); the catalog prints only one
- p41: one flow table is applied to 2 runner/valve combinations (296cc 2.15/1.6, 296cc 2.18/1.6); the catalog prints only one
- p70: one flow table is applied to 2 runner/valve combinations (275cc 2.19/1.88, 275cc 2.25/1.88); the catalog prints only one
- p71: one flow table is applied to 3 runner/valve combinations (310cc 2.19/1.88, 310cc 2.25/1.88, 310cc 2.3/1.88); the catalog prints only one
- p72: one flow table is applied to 2 runner/valve combinations (325cc 2.25/1.88, 325cc 2.3/1.88); the catalog prints only one
- p74: one flow table is applied to 4 runner/valve combinations (310cc 2.25/1.88, 325cc 2.25/1.88, 325cc 2.3/1.88, 345cc None/1.88); the catalog prints only one
- p81: one flow table is applied to 2 runner/valve combinations (380cc 2.3/1.88, 380cc 2.35/1.85); the catalog prints only one
- p82: one flow table is applied to 2 runner/valve combinations (340cc 2.25/1.88, 370cc 2.3/1.88); the catalog prints only one
- 19770000 (head) listed twice on p79/p79 with different data (`PRO1 20° 409CC CNC - ALUMINUM - 4.500" BORE CHAMBER - 2.350"/1.800" VALVES` vs `PRO1 20° 451CC CNC - ALUMINUM - 4.500 BORE CHAMBER - 2.400"1.800" VALVES`); first occurrence kept
- 19770000 (head) listed twice on p79/p79 with different data (`PRO1 20° 409CC CNC - ALUMINUM - 4.500" BORE CHAMBER - 2.350"/1.800" VALVES` vs `PRO1 20° 451CC CNC - ALUMINUM - 4.500 BORE CHAMBER - 2.400"1.800" VALVES`); first occurrence kept
- 31947111-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947111-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947112-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947112-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947211-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947211-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947212-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947212-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947121-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947121-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947122-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947122-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947221-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947221-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947222-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947222-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947142-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947142-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947242-WW1 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31947242-WW2 (block) listed twice on p51/p53 with different data (`LS NEXT² - GEN III - ALUMINUM FULLY SKIRTED (RACE BLOCK)` vs `LS NEXT² - GEN III - ALUMINUM (RACE BLOCK)`); first occurrence kept
- 31223345 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223355 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223395 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223445 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223455 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223495 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223545 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223555 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223595 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223645 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223655 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept
- 31223695 (block) listed twice on p67/p67 with different data (`M2 - IRON - DUCTILE CAP` vs `M2 - IRON - DUCTILE CAP`); first occurrence kept

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family and category; numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.

- passed
