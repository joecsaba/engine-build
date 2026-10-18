# KB Performance Pistons 2015 catalog — extraction notes

Extracted 2026-10-18 by `scripts/parts-catalog/extract_kb.py` from `Catalogs/product-catalog.pdf` (KB Performance Pistons Catalog, InDesign 2015-01-27, 48 pages, scanned images, no text layer).

## Method

- Each page rendered with PyMuPDF at 200 dpi and read with `rapidocr_onnxruntime` (RapidOCR, ONNX PP-OCR models); about 9 s per page. Raw results (box, text, confidence) cached once per page in `dl/kb/ocr/page_NN.json` (gitignored); `--no-ocr` re-parses from the cache.
- Spec boxes are found by their title line (`CHEVROLET 350 · 5.7 ROD · FLAT TOP`, large font, contains `ROD`); everything below a title down to the next title belongs to that box. Header values (bore, stroke, comp. height, O.E. deck height, lock-ring PN, alloy) are the line under the BORE/STROKE labels; OVERSIZES, PIN SIZE/PIN #, RINGSET PART# are the left column of the next lines, NOTES the right column (x >= 1040 px). Piston rows are the lines under the PISTON# header; columns are assigned by x-position against the header labels (ring pack, dish/dome, CR, weight, top land, valve relief depth/dia). CR values are matched to the chamber-cc header by x-position when the counts differ.
- Text boxes read below 0.85 confidence on the full page are re-OCR'd as 300-dpi crops (`refine_NN.json` in the cache) and replaced when the crop reads with clearly higher confidence; see *Re-OCR'd cells*.
- OCR repairs: `I`/`l`/`|` -> `1` and `O` -> `0` inside numeric runs (`990IHC`, `-I0cc`); merged cells split by regex (`13.913.012.7` -> 13.9 13.0 12.7, `567/107.254"` -> weight + top land).
- Sign convention: the catalog prints dome volume negative and dish / valve-relief volume positive (`.150" SD -4cc`, `Flat Top 7cc 4V`). `spec.domeCc` follows the shared format (dome positive, dish negative), so every printed value is negated; `spec.dishDome` keeps the printed text. `spec.crown` is the normalised head type.
- `spec.weight` / `spec.pinWeight` are the GRAM WEIGHT column (piston / pin). The small number in the LOCKRING header column (`93`, `PRG110-3`) is the lock-ring part number (`spec.lockRings`), not a weight.
- `spec.boreOptions` = bore + each listed oversize; a starred oversize (`*.080`) is given only to the starred part number.
- `spec.kitPn` = piston-and-ring kit numbers (`KT` + ring material: D ductile moly, M cast moly, S steel chrome).
- `spec.alloy` is written `Cast 390 Hypereutectic` (printed `HYPEREUTECTIC 390`) to match the KB rows in `out/uem.json`. `m` is `KB` for both the KB Hypereutectic and the Claimer series; `spec.series` tells them apart.
- Families from the title's make and displacement (`CHEVROLET 350` -> Small-block Chevy, `CHEVROLET 454/489` -> both big-block families, `FORD 408W/416W` -> Small-block Ford (Windsor), `CADILLAC 472/500` -> Cadillac 368-500, ...). Engines outside the brief's list keep a descriptive heading in `fit.fam` and are flagged below.

## Pages

| page | OCR boxes | spec boxes | piston rows | banner |
|---|---|---|---|---|
| 1 | 3 | 0 | 0 |  |
| 2 | 46 | 0 | 0 | HEAD DESIGN LIGHTWEIGHTTOOLSTEELPINS |
| 3 | 334 | 0 | 0 | PISTONANDRINGKITS |
| 4 | 52 | 0 | 0 | KB HYPEREUTECTIC TECH TIPS |
| 5 | 143 | 0 | 0 | PISTON ORIENTATION |
| 6 | 72 | 0 | 0 | CLAIMERSERIES |
| 7 | 151 | 3 | 6 | CHEVROLET CLAIMER HYPEREUTECTIC |
| 8 | 171 | 4 | 5 | CHEVROLET 377· 5.7 ROD· FLATTOP COMP HT. STROKE BORE O.E.DEC |
| 9 | 123 | 3 | 3 | CHEVY 383· 6.000 ROD · FLAT TOP STROKE BORE COMP HT. O.E.DEC |
| 10 | 81 | 0 | 0 | KB SERIES |
| 11 | 176 | 3 | 7 | AMC HYPEREUTECTIC KB |
| 12 | 123 | 3 | 3 | CADILLAC KB HYPEREUTECTIC |
| 13 | 124 | 3 | 3 | CHEVROLET HYPEREUTECTIC KB SMALL BLOCK |
| 14 | 181 | 4 | 6 | CHEVROLET 305· 5.700 ROD· FLATTOP COMP HT. ALLOY BORE STROKE |
| 15 | 163 | 4 | 4 | CHEVROLET 327· 5.700 ROD· D-CUP STROKE BORE COMP HT. LOCKRIN |
| 16 | 162 | 3 | 6 | CHEVROLET 327· 6.000 ROD· SOLID DOME COMPHT. O.E. DECK HT. L |
| 17 | 229 | 3 | 13 | CHEVROLET 350· 5.700 ROD· FLAT TOP O.E. DECK HT. COMP HT. BO |
| 18 | 210 | 4 | 9 | CHEVROLET 350· 6.000 ROD· FLAT TOP BORE STROKE COMP HT. LOCK |
| 19 | 162 | 4 | 4 | CHEVROLET 377· 5.700 ROD· FLAT TOP BORE STROKE COMP HT. LOCK |
| 20 | 233 | 4 | 10 | CHEVROLET 377· 6.000 ROD · D-CUP BORE O.E.DECK HT. COMP HT.  |
| 21 | 169 | 4 | 5 | CHEVROLET 383· 6.000 ROD· D-CUP O.E. DECK HT. BORE STROKE CO |
| 22 | 192 | 4 | 7 | CHEVROLET 400· 5.565 ROD· FLAT TOP COMP HT. BORE STROKE O.E. |
| 23 | 184 | 4 | 7 | CHEVROLET 400· 5.700 ROD· DOME COMPHT. BORE STROKE O.E. DECK |
| 24 | 193 | 4 | 6 | CHEVROLET BIG BLOCK KB HYPEREUTECTIC |
| 25 | 202 | 4 | 8 | CHEVROLET 454· 6.135 ROD· FLAT TOP COMP HT. STROKE BORE O.E. |
| 26 | 164 | 4 | 4 | CHEVROLET 489· 6.385 ROD· FLAT TOP LOCKRING STROKE COMP HT.  |
| 27 | 160 | 4 | 4 | CHEVROLET 502·6.135 ROD·D-CUP STROKE COMP HT. BORE O.E. DECK |
| 28 | 120 | 3 | 3 | KB CHRYSLER 4 CYLINDER HYPEREUTECTIC |
| 29 | 179 | 4 | 5 | CHRYSLER SMALL BLOCK HYPEREUTECTIC KB |
| 30 | 198 | 4 | 6 | CHRYSLER 360· 6.123 ROD·FLAT TOP LOCKRING BORE COMP HT. O.E. |
| 31 | 167 | 4 | 4 | KB CHRYSLER BIG BLOCK HYPEREUTECTIC |
| 32 | 175 | 4 | 5 | CHRYSLER 440· 6.768 ROD · STEP HEAD BORE STROKE COMP HT. LOC |
| 33 | 138 | 3 | 4 | KB CHRYSLER HYPEREUTECTIC HEMI |
| 34 | 100 | 3 | 2 | FORD 2.3L & SMALL BLOCK KB HYPEREUTECTIC |
| 35 | 223 | 4 | 9 | FORD 302· 5.090 ROD· D-CUP COMP HT. BORE O.E. DECK HT. LOCKR |
| 36 | 177 | 4 | 5 | FORD 347· 5.400 ROD · STEP DISH BORE STROKE COMP HT. LOCKRIN |
| 37 | 198 | 3 | 5 | FORD 351C· 5.778ROD·FLATTOP LOCKRING BORE COMP HT. O.E. DECK |
| 38 | 197 | 4 | 6 | FORD 351W· 5.956 ROD·D-CUP BORE STROKE COMP HT. LOCKRING ALL |
| 39 | 168 | 4 | 4 | FORD 351WC· 5.956 ROD· SOLID DOME STROKE COMP HT. BORE O.E.D |
| 40 | 169 | 4 | 4 | FORD 408W· 6.200 ROD· D-CUP STROKE COMP HT. BORE O.E. DECK H |
| 41 | 128 | 3 | 3 | FORD BIG BLOCK KB HYPEREUTECTIC |
| 42 | 178 | 4 | 5 | FORD 428FE· 6.490 ROD· STEP DISH BORE STROKE O.E.DECK HT. CO |
| 43 | 169 | 4 | 4 | FORD 460· 6.605 ROD · SOLID DOME BORE COMP HT. O.E. DECK HT. |
| 44 | 127 | 3 | 3 | FORD 521· 6.800 ROD· STEP DISH ALLOY STROKE COMP HT. BORE O. |
| 45 | 123 | 3 | 3 | OLDSMOBILE HYPEREUTECTIC KB |
| 46 | 131 | 3 | 3 | KB PONTIAC HYPEREUTECTIC |
| 47 | 176 | 4 | 4 | PONTIAC 400· 6.630 ROD · D-CUP STROKE LOCKRING BORE COMP HT. |
| 48 | 134 | 3 | 3 | PONTIAC 455· 6.630 ROD · SOLID DOME STROKE COMP HT. O.E.DECK |

Total: 7578 OCR text boxes, 148 spec boxes, 210 piston rows, 222 records (222 after family fan-out and de-duplication).

## Counts

| series | records |
|---|---|
| KB Hypereutectic | 209 |
| Claimer Hypereutectic | 13 |

| family | records |
|---|---|
| Small-block Chevy | 84 |
| Small-block Ford (Windsor) | 28 |
| Chevy Mark IV big block | 20 |
| Chevy Gen VI big block | 20 |
| Mopar LA small block | 11 |
| Mopar B/RB big block | 9 |
| Ford 429/460 | 9 |
| Pontiac V8 | 7 |
| AMC V8 | 6 |
| Ford FE | 4 |
| Cadillac 368-500 | 3 |
| Oldsmobile V8 | 3 |
| Chrysler 2.2L | 2 |
| Chrysler 392 early Hemi | 2 |
| Chrysler 426 Hemi | 2 |
| Ford 2.3L | 2 |
| Ford 351C/351M/400 | 2 |
| Ford 351WC | 2 |
| Buick big block | 1 |
| Chrysler 2.0L | 1 |
| Holden 308 | 1 |
| Pontiac 151 Iron Duke | 1 |
| Suzuki 1.6L / 2 Valve | 1 |
| Toyota 22R | 1 |

### Spec coverage

| spec key | records |
|---|---|
| series | 222 |
| bore | 222 |
| boreOptions | 222 |
| oversizes | 222 |
| stroke | 222 |
| rodLength | 222 |
| ch | 222 |
| pin | 222 |
| pinPn | 222 |
| lockRings | 222 |
| crown | 222 |
| dishDome | 222 |
| alloy | 222 |
| weight | 222 |
| pinWeight | 222 |
| topLand | 222 |
| ringSetPn | 222 |
| kitPn | 221 |
| ringPack | 220 |
| cr | 216 |
| deckHeight | 215 |
| domeCc | 201 |
| valveReliefs | 199 |
| intValveReliefDepth | 195 |
| intValveReliefDia | 193 |
| exhValveReliefDepth | 143 |
| exhValveReliefDia | 141 |
| ringSetOptions | 94 |
| domeHeight | 65 |
| valveReliefDepth | 13 |
| valveReliefDia | 13 |
| applications | 10 |
| boreMm | 2 |
| crNote | 1 |

### OCR confidence (mean over the text boxes each record was read from)

| band | records |
|---|---|
| >=0.98 | 132 |
| 0.95-0.98 | 90 |
| 0.90-0.95 | 0 |
| 0.85-0.90 | 0 |
| <0.85 | 0 |

min 0.969, median 0.981, max 0.990.

## Cross-check against out/uem.json

KB part numbers in `out/uem.json` (2026 supplement): ['KB10177', 'KB10179', 'KB439C', 'KB443C']. In this catalog: none.

## Re-OCR'd cells

8 text boxes read below 0.85 on the full page were re-read as 300-dpi crops and replaced (page-level detection garbles small table cells that read cleanly in isolation):

| page | full-page read (conf) | crop read (conf) |
|---|---|---|
| 5 | `CHEVY302,305,327,334,350,377,383,400,434` (0.79) | `CHEVY 302,305,327,334,350,377,383,40,44` (0.93) |
| 18 | `KBI13` (0.85) | `KBI13` (0.95) |
| 24 | `66701111` (0.65) | `V 11.1 10.2 9.9` (0.90) |
| 25 | `66701011` (0.70) | `11.0 10.2 9.9` (1.00) |
| 25 | `66 0101` (0.62) | `11.0 10.2 9.9` (1.00) |
| 46 | `Illcc` (0.62) | `Illcc` (0.77) |
| 47 | `11lcc` (0.65) | `Illcc` (0.73) |
| 47 | `11lcc` (0.72) | `Illcc` (0.79) |

## Low-confidence OCR values (< 0.85)

10 values below 0.85 across 10 records; each is also listed in the record's `src.ocrLowConfidence`. Review these against the page image before trusting them.

| PN | page | field: text (confidence) |
|---|---|---|
| KB101 | 16 | pn: `KB101**` (0.83) |
| KB111 | 20 | pn: `KBIII` (0.83) |
| KB215 | 32 | title: `R 450·6.358 ROD·STEP HEAD` (0.97) |
| KB251 | 32 | title: `R 450·6.358 ROD·STEP HEAD` (0.97) |
| KB311 | 35 | pn: `*KB311` (0.84) |
| KB401 | 43 | dishDome: `SD-IIcc IV` (0.84) |
| KB370 | 46 | chambers: `Illcc` (0.77) |
| KB133 | 46 | chambers: `Ilcc` (0.75) |
| KB304 | 47 | chambers: `Illcc` (0.73) |
| KB371 | 47 | chambers: `Illcc` (0.79) |

## QA

Validation: OK (0 errors). Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family; numeric spec fields are numbers; no empty strings.

- p18 KB260: 3 CR values for 4 chamber columns; mapped by position -> {'58': 11.1, '62': 10.5, '64': 10.3}
- p20 KB253: 2 CR values for 4 chamber columns; mapped by position -> {'58': 11.7, '62': 11.1}
- p20 KB301: 3 CR values for 4 chamber columns; mapped by position -> {'62': 14.2, '64': 13.8, '76': 11.7}
- p21 KB302: 3 CR values for 4 chamber columns; mapped by position -> {'62': 14.2, '64': 13.8, '76': 11.7}
- p23 KB376: 3 CR values for 4 chamber columns; mapped by position -> {'62': 14.9, '64': 14.5, '76': 12.3}
- p23 KB375: 3 CR values for 4 chamber columns; mapped by position -> {'62': 14.9, '64': 14.5, '76': 12.3}
- p24 KB227: 1 CR values for 4 chamber columns; mapped by position -> {'119': 9.7}
- p25 KB207: 1 CR values for 4 chamber columns; mapped by position -> {'119': 10.2}
- p25 KB257: 1 CR values for 4 chamber columns; mapped by position -> {'119': 10.2}
- p25 KB245: 1 CR values for 4 chamber columns; mapped by position -> {'119': 12.0}
- p29 KB362: 1 CR values for 4 chamber columns; mapped by position -> {'72': 9.1}
- p32 title `R 450·6.358 ROD·STEP HEAD` has no make (OCR cut the title); read as `CHRYSLER 450` from the previous box
- p34 'FORD 289· 5.155 ROD·USE 302CIPISTONS': table header (PISTON#) not found; box skipped
- p35 KB311: 1 CR values for 4 chamber columns; mapped by position -> {'64': 9.5}
- p35 KB312: 1 CR values for 4 chamber columns; mapped by position -> {'64': 10.4}
- p36 KB332: 3 CR values for 4 chamber columns; mapped by position -> {'60': 13.4, '64': 12.6, '69': 11.7}
- p38 KB314: 1 CR values for 4 chamber columns; mapped by position -> {'64': 12.4}
- p46 'PONTIAC 400· 6.630 ROD · FLAT TOP': chamber header `11cc` is not larger than the column to its left (OCR dropped a digit); its CR values are keyed `col4`
- p48 'TOYOTA 22R· 5.825 ROD· DISH': no chamber-cc header found above COMP RATIO
- p8 9907HC: CH 1.565 + rod 5.7 + stroke/2 = 9.005 vs O.E. deck 1.565; one of them is mis-read (or the piston sits far out of the hole)
- p31 KB184: CH 1.992 + rod 6.768 + stroke/2 = 10.635 vs O.E. deck 10.725; one of them is mis-read (or the piston sits far out of the hole)
- p35 KB116: compression ratio(s) {'54': 1.5} out of range; dropped, check OCR
- PN 9907HC: listed under more than one engine; merged into `spec.applications` (p8, p9)
- PN KB159: listed under more than one engine; merged into `spec.applications` (p18, p21)
- PN KB172: listed under more than one engine; merged into `spec.applications` (p19, p22)
- PN KB182: listed under more than one engine; merged into `spec.applications` (p19, p22)
- PN KB224: listed under more than one engine; merged into `spec.applications` (p25, p26)
- PN KB397: listed under more than one engine; merged into `spec.applications` (p25, p26)
- PN KB364: `weight` differs between p35 (549) and p39 (551); first kept, check OCR / catalog
- PN KB364: listed under more than one engine; merged into `spec.applications` (p35, p39)
- PN KB402: listed under more than one engine; merged into `spec.applications` (p44, p44)
- family not in the brief's list: `Chrysler 2.0L` (title `CHRYSLER 2.0L`); catalog heading kept in fit.fam
- family not in the brief's list: `Chrysler 2.2L` (title `CHRYSLER 2.2L`); catalog heading kept in fit.fam
- family not in the brief's list: `Chrysler 392 early Hemi` (title `CHRYSLER 392 HEMI`); catalog heading kept in fit.fam
- family not in the brief's list: `Ford 2.3L` (title `FORD 2.3L`); catalog heading kept in fit.fam
- family not in the brief's list: `Ford 351WC` (title `FORD 351WC`); catalog heading kept in fit.fam
- family not in the brief's list: `Holden 308` (title `HOLDEN 308`); catalog heading kept in fit.fam
- family not in the brief's list: `Pontiac 151 Iron Duke` (title `PONTIAC 151`); catalog heading kept in fit.fam
- family not in the brief's list: `Suzuki 1.6L / 2 Valve` (title `SUZUKI 1.6L / 2 VALVE`); catalog heading kept in fit.fam
- family not in the brief's list: `Toyota 22R` (title `TOYOTA 22R`); catalog heading kept in fit.fam

## Log

- PDF C:\Engine Website\Catalogs\product-catalog.pdf: 48 pages
- re-OCR of low-confidence boxes (< 0.85) as 300-dpi crops: 2 boxes, 1 replaced
- OCR cache: 48 pages, 7578 text boxes
