# Crower — extraction notes

Extracted 2026-10-16 by `scripts/parts-catalog/extract_crower.py`.

## What was fetched

0 requests to `crower.com`, one at a time, >= 6 s apart, UA `engine-build.com catalog research (contact: joecsaba@gmail.com)`:
- offline: parsed cached PDFs in dl/crower/

`robots.txt` is an empty file (one newline): no Disallow, no Crawl-delay. The master-catalog page was fetched once to discover the PDF links; no product pages were crawled. The initial download session made 11 requests (robots.txt, master-catalog, nine PDFs); two PDF transfers (Ford, Oldsmobile) were cut off by connection resets and re-requested after a back-off. Downloads live in `dl/crower/` (gitignored); `--offline` re-parses them without the network.

## Documents

| key | url | pages |
|---|---|---|
| AMC | https://crower.com/media/pdf/2025/Camshafts/Domestic/AMC_120824_Final_Web.pdf | 3 |
| Buick | https://crower.com/media/pdf/2025/Camshafts/Domestic/Buick_120824_Final_Web.pdf | 5 |
| Chevrolet | https://crower.com/media/pdf/2025/Camshafts/Domestic/Chevrolet_120824_Final_Web.pdf | 41 |
| Ford | https://crower.com/media/pdf/2025/Camshafts/Domestic/Ford_120824_Final_Web.pdf | 24 |
| Mopar | https://crower.com/media/pdf/2025/Camshafts/Domestic/Mopar_120824_Final_Web.pdf | 11 |
| Oldsmobile | https://crower.com/media/pdf/2025/Camshafts/Domestic/Oldsmobile_120824_Final_Web.pdf | 2 |
| Pontiac | https://crower.com/media/pdf/2025/Camshafts/Domestic/Pontiac_120824_Final_Web.pdf | 3 |
| springs | https://crower.com/media/hexaattachment/products/attachments/Spring_Booklet_2024_V3.pdf | 24 |
| lifters | https://crower.com/media/pdf/2025/Lifters%20-Rollers%20119-132_Web.pdf | 14 |

## Records

| cat | records |
|---|---|
| cam | 604 |
| lifter | 492 |
| spring | 130 |
| **total** | 1226 |

### Cams per make PDF

| make | cam rows | part numbers (incl. S/LM/FI variants) |
|---|---|---|
| AMC | 20 | 20 |
| Buick | 30 | 30 |
| Chevrolet | 221 | 254 |
| Ford | 147 | 148 |
| Mopar | 66 | 69 |
| Oldsmobile | 13 | 13 |
| Pontiac | 17 | 17 |

### Records per family

| cat | family | records |
|---|---|---|
| cam | Small-block Chevy | 154 |
| cam | Chevy Gen VI big block | 61 |
| cam | Chevy Mark IV big block | 61 |
| cam | Small-block Ford (Windsor) | 51 |
| cam | Ford 429/460 | 25 |
| cam | Ford 351C/351M/400 | 21 |
| cam | Mopar B/RB big block | 21 |
| cam | Mopar LA small block | 19 |
| cam | Ford FE | 16 |
| cam | Pontiac V8 | 16 |
| cam | Ford Modular | 15 |
| cam | Chevy 90° V6 200/229/262 | 13 |
| cam | GM LS | 12 |
| cam | Buick 215/300/340 V8 | 11 |
| cam | Dodge Neon 2.0 / 420A | 11 |
| cam | Oldsmobile V8 | 11 |
| cam | AMC V8 | 10 |
| cam | AMC/Jeep inline-6 | 10 |
| cam | Chrysler 426 Hemi | 10 |
| cam | Ford 2300 OHC (Lima) | 9 |
| cam | Buick big block | 8 |
| cam | Buick 350 | 7 |
| cam | Chevy inline-6 | 7 |
| cam | Ford 240/300 inline-6 | 6 |
| cam | Chevy 60° V6 2.8/3.1 | 5 |
| cam | Buick V6 181-252 | 4 |
| cam | Ford/Mazda Duratec 2.0/2.3 | 4 |
| cam | Chrysler Gen III Hemi 5.7/6.1 | 3 |
| cam | Dodge Viper V10 | 3 |
| lifter | Small-block Chevy | 89 |
| lifter | Chevy Gen VI big block | 62 |
| lifter | Chevy Mark IV big block | 62 |
| lifter | Small-block Ford (Windsor) | 36 |
| lifter | Ford 429/460 | 34 |
| lifter | Pontiac V8 | 20 |
| lifter | Mopar B/RB big block | 17 |
| lifter | Mopar LA small block | 17 |
| lifter | Ford FE | 14 |
| lifter | Oldsmobile V8 | 14 |
| lifter | Chrysler 426 Hemi | 13 |
| lifter | Ford 351C/351M/400 | 13 |
| lifter | Buick 350 | 11 |
| lifter | Chevy inline-6 | 10 |
| lifter | GM LS | 10 |
| lifter | Ford 240/300 inline-6 | 9 |
| lifter | Buick V6 181-252 | 8 |
| lifter | Buick big block | 8 |
| lifter | AMC V8 | 7 |
| lifter | AMC/Jeep inline-6 | 7 |
| lifter | Chrysler Gen III Hemi 5.7/6.1 | 7 |
| lifter | Chrysler Gen III Hemi 6.2/6.4 | 7 |
| lifter | Chevy II 153 4-cyl | 4 |
| lifter | Mopar Magnum 5.2/5.9 | 4 |
| lifter | Chevy W-series 348/409 | 3 |
| lifter | Ford 144-250 inline-6 | 3 |
| lifter | Chevy 90° V6 200/229/262 | 2 |
| lifter | Dodge Viper V10 | 1 |
| spring | Universal | 60 |
| spring | Small-block Chevy | 7 |
| spring | Small-block Ford (Windsor) | 5 |
| spring | Ford 351C/351M/400 | 4 |
| spring | Ford 429/460 | 4 |
| spring | Pontiac V8 | 4 |
| spring | AMC/Jeep inline-6 | 3 |
| spring | Chevy Gen VI big block | 3 |
| spring | Chevy Mark IV big block | 3 |
| spring | Ford FE | 3 |
| spring | GM LS | 3 |
| spring | AMC V8 | 2 |
| spring | Buick 215/300/340 V8 | 2 |
| spring | Buick 350 | 2 |
| spring | Buick V6 181-252 | 2 |
| spring | Chevy 60° V6 2.8/3.1 | 2 |
| spring | Chevy 90° V6 200/229/262 | 2 |
| spring | Chevy inline-6 | 2 |
| spring | Ford 240/300 inline-6 | 2 |
| spring | Ford Modular | 2 |
| spring | Mopar B/RB big block | 2 |
| spring | Mopar LA small block | 2 |
| spring | Oldsmobile V8 | 2 |
| spring | Buick big block | 1 |
| spring | Chrysler 426 Hemi | 1 |
| spring | Chrysler Gen III Hemi 5.7/6.1 | 1 |
| spring | Dodge Neon 2.0 / 420A | 1 |
| spring | Dodge Viper V10 | 1 |
| spring | Ford 2300 OHC (Lima) | 1 |
| spring | Ford/Mazda Duratec 2.0/2.3 | 1 |

## How the cam pages were parsed

- Each page is one engine heading (make, tappet type, years, displacement list) with one or two ruled spec tables (hydraulic and mechanical sections share a page). Text objects that sit outside the page box (stale layers of other pages, visible as doubled headings in a raw text dump) are dropped by cropping to the page box before reading words.
- Column headers vary by page, so values are read by position: the part-number column anchors each cam; a cam's row band is bounded by the horizontal rules that cross that column (sub-rows for displacement groups only rule the RPM columns). Degree values in the band are, left to right, LSA then the intake/exhaust pairs the header names (advertised, @ .050", and on the Pro55 pages @ .020"/.050"/.200"); lift values are the pairs the header names (lobe lift and/or gross lift at the printed rocker ratio(s)).
- `spec.rr` is the rocker ratio the catalog quotes gross lift at (page header `1.5 / 1.5`, `1.6 / 1.6`, `1.7 / 1.7`, `1.75 / 1.75`, `1.6 VL`, `(1.8)`); pages that print a second ratio put that pair in `spec.valveLiftAlt`. `rrExh` is only present when the two ratios differ (e.g. 290/220-series `1.6 / 1.5`, Hemi `1.57 / 1.52`). Lobe lift is stored only where printed (`lobeLiftInt/Exh`); it is not derived.
- Advertised duration is at Crower's standard point unless `spec.durAdvAt` says `0.02` (Pro55 290/220-series pages) or `0.01` (Duratec). Ford Modular pages print durations twice (measured at the lobe and at the valve with 1.8 rockers): the valve-measured values are `durAdv*`/`dur050*`, the lobe-measured ones `durAdvLobe*`/`dur050Lobe*`.
- Lash from the section's `Note: These cams use .022" intake, .024" exhaust valve lash.` line (`spec.lash` = intake, `spec.lashExh` only when different); hydraulic sections print `.000"`.
- `spec.type` from the section heading (HYDRAULIC/MECHANICAL × FLAT/ROLLER TAPPET); OHC pages (Duratec, Neon) have no tappet heading and are typed from the lash note (zero lash → hydraulic_flat).
- RPM: description-style pages give `RPM Power Range: a to b / Redline: c` → `rpmLow`, `rpmHigh`, `redline` (`Idle` → 0). Oval-track/420-series pages tabulate Low RPM / Peak Torque / Peak HP / Top RPM per displacement group: `rpmLow`/`rpmHigh` are the first group's Low and Top values and `spec.rpmByCid` keeps every group. `rpmHigh` from a two-column `RPM RPM` table is the Top value.
- `spec.level` = Crower performance level (`Performance Level 4`, `Stage 2`); `spec.line` = the product line printed before it (Compu-Pro, Beast, Hi-Draulic Hauler...). `spec.grind` = the lobe/grind designation.
- Component kits: the page's `ENGINEERED COMPONENT OPTIONS/KITS` table is parsed into option number (or kit part number) → lifter / spring / retainer / seal / keeper / pushrod / plug / seat-cup part numbers, assigned to columns by x position. The cam's `Option #` cell (`1 or 2`, `See Below`, `84583`) selects the rows: `spec.kit` is the first option's part numbers, `spec.kitOptions` lists all of them, `spec.kitRemark` the catalog's one-line remark for the first option. `See Below` = every option on the page.
- Variant part numbers printed in the same row (`00223S` small base circle, `00402LM` late-model step-nose core, `34414FI` fuel-injection core) become their own records with the same specs and a `fit.notes` entry. `MTO` → `spec.madeToOrder`. A `*` on the part number carries the page's `*Indicates ...` note into `fit.notes`.
- `fit.ci` = the displacements in the page heading when the C.I.D. cell says `ALL`, otherwise the displacement(s) in the cam's own C.I.D. cell (`283-327` style ranges are stored as their two end values; `spec.cidGroups` keeps the printed strings). `fit.y0/y1` from the heading's year range.
- Custom-grind listings (`Refer to www.crower.com for camshaft recommendation`: 00100H, 00047, 00055...) carry no specs and are skipped (listed below). O.E.M./Ford SVO reference rows (`Stock`, `E-303`, `B-303`) are not Crower parts and are skipped.
- A part number the catalog prints in several rows (one per displacement, each with its own performance level or RPM range, e.g. Olds 56263 for 400/425 and for 260; BBC 01241 on the two near-identical pages 48/49) is one record per family: `fit.ci` is the union and `spec.applications` lists each row's displacement, level and RPM range.
- Pages whose engine heading is unreadable (Ford p9: the first spec row is printed over the heading) take the engine line of the previous page of the same PDF, flagged below. Kit/option numbers that have no row in the page's table are looked up on the facing page (Mopar p7 → p8) or matched to a row whose part number extends the printed one (`84510` → `84510M`); what remains unresolved is flagged and kept as a bare `kitPn`/`option`.

## Springs

- Booklet pages 3–21: one spring per column, 76 columns parsed. `spec.od/id` from `O.D./I.D. Outer` (middle/inner coils in `odMiddle/idMiddle`, `odInner/idInner`), `installedHt`, `rate` (lb/in), `coilBind`, `freeLength`, `wireDia` (second value and `wireOvate` for ovate wire), `type` (single / dual / triple / beehive / conical), `dual`, `damper`, `colorCode`, `material`, `loads` = the booklet's load table keyed by height (inches, string keys like `cr`), `retainers` = retainer / seat-cup / seat-disc part numbers listed under the spring.
- `seatLb` = the tabulated load at the installed height (interpolated between the two neighbouring heights when that exact height is not tabulated; flagged below). `maxLift` = installed height − coil bind − 0.050" (computed, marked by `maxLiftNote`). No nose/open load is given in the booklet, so `openLb` is absent there.
- Cam pages quote `Seat: 1.700" @ 101 lbs / Nose: 1.200" @ 297 lbs / Coil bind: 1.130"` for the springs in their kits (34 distinct spring PNs): springs that are not in the booklet are emitted from those lines (`seatLb`, `openLb`, `openHt`, `coilBind`, `installedHt`; `src` = the cam PDF page); for booklet springs those numbers are added as `seatLbCatalog`/`openLb`/`openHt` when they differ from the booklet.
- The booklet gives no engine fitment. A spring's `fit.fam` is the set of families of the cams whose kits recommend it (one record per family, `fit.notes` names the source); springs no cam kit references are emitted once with `fit.fam` = `Universal` and flagged.
- Layout quirk: on several booklet pages the `Coil Bind` and `Retainers` cells of some columns print inside the load table rows (`1.050 | 1.320`, `1.000 | 87096 (5.5mm)`); those values are recognised by shape and flagged below.

## Lifters

- `Lifters -Rollers 119-132` (master catalog pp 119–132): 309 table rows. Pages 1–2 hydraulic flat tappet, 3–4 mechanical flat tappet, 5 hydraulic roller (late-model drop-in and retro-fit link-bar), 7 original full-body solid roller, 9 severe-duty cutaway, 10 severe-duty oversized bearing, 11 raised-seat and big-inch/Hemi, 13–14 EnduraMax bushed rollers. Pages 6, 8, 12 are prose/diagrams.
- `spec.style`, `bodyDia`, `seatHeight` (pushrod seat height), `weight` (g), `rollerDia` (bearing O.D.), `springGroup` with the page-124 open-pressure band in `openPressureLb`, `intakeOffset`/`exhaustOffset`, pushrod-seat location counts (`seatLeft/Center/Right`), `tallBody` (+.300" body or 'Tall Block' column), `hippo` (high-pressure pin oiling; the `...H-16` column is its own record), `bushed` (EnduraMax `...E-16`), `oiling` (Cam Saver / Cool Face option), `linkBar` (true for solid rollers and retro-fit hydraulic rollers, false for drop-in), `qty` from the `-16/-12/-8/-20` suffix.
- Families from the row's description (`CHEVROLET V8 '55-up 262-400 cu. in.` → Small-block Chevy; `Big Block 396-454` → both Chevy big-block families; a bare `Chevrolet V8` flat-tappet lifter → SBC and both BBC families). `fit.notes` keeps the catalog's application text.

## Families not in the fitment list (need a decision)

- `Buick 215/300/340 V8`
- `Chevy 60° V6 2.8/3.1`
- `Chevy 90° V6 200/229/262`
- `Chevy II 153 4-cyl`
- `Dodge Neon 2.0 / 420A`
- `Dodge Viper V10`
- `Ford 144-250 inline-6`
- `Ford 2300 OHC (Lima)`
- `Ford/Mazda Duratec 2.0/2.3`
- `Universal`

## Held back (import makes inside the domestic PDFs)

- lifter PDF: 9 Holden rows

## Pages

| make | PDF page | printed page | heading | cam rows |
|---|---|---|---|---|
| AMC | 1 | 8 | HYDRAULIC FLAT TAPPET — 199 232 234 (Requires kit for 5/16" valves) 242 (4.0L) 258 (4.2L) 6 cy | 10 |
| AMC | 2 | 9 | HYDRAULIC FLAT TAPPET — 290 304 343 360 (5.9L) 390 401 V8 | 7 |
| AMC | 3 | 10 | MECHANICAL FLAT TAPPET — 290 304 343 360 (5.9L) 390 401 V8 | 3 |
| Buick | 1 | 11 | HYDRAULIC FLAT TAPPET — 196 (3.2L) 231 (3.8L) 252 (4.1L) V6 Evenfire | 4 |
| Buick | 2 | 12 | HYDRAULIC FLAT TAPPET — 215 300 340 V8 | 11 |
| Buick | 3 | 13 | HYDRAULIC FLAT TAPPET — BUICK 350 V8 | 7 |
| Buick | 4 | 14 | HYDRAULIC FLAT TAPPET — 400 430 455 V8 | 6 |
| Buick | 5 | 15 | MECHANICAL FLAT TAPPET — 400 430 455 V8 | 2 |
| Chevrolet | 1 | 16 | HYDRAULIC FLAT TAPPET — 194 230 250 inline 6 cylinder | 7 |
| Chevrolet | 2 | 17 | HYDRAULIC FLAT TAPPET — 173 60° (2.8L) 189 (3.1L) V6 | 5 |
| Chevrolet | 3 | 18 | HYDRAULIC FLAT TAPPET — 200 229 90° V6 (3.8L) | 6 |
| Chevrolet | 4 | 19 | HYDRAULIC FLAT TAPPET — 262 90° V6 (4.3L) | 7 |
| Chevrolet | 5 | 20 | HYDRAULIC FLAT TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block | 4 |
| Chevrolet | 6 | 21 | HYDRAULIC FLAT TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block | 5 |
| Chevrolet | 7 | 22 | HYDRAULIC FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 7 |
| Chevrolet | 8 | 23 | HYDRAULIC FLAT TAPPET — Fast Action HardCore Race 262 265 267 283 302 305 307 327 350 400 V8 S | 4 |
| Chevrolet | 9 | 24 | HYDRAULIC FLAT TAPPET — Non Roller 1957-1998 262 265 267 283 302 305 307 327 350 400 V8 SB | 4 |
| Chevrolet | 10 | 25 | MARINE HYDRAULIC FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 2 |
| Chevrolet | 11 | 26 | HYDRAULIC FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 6 |
| Chevrolet | 12 | 27 | HYDRAULIC FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 7 |
| Chevrolet | 13 | 28 | HYDRAULIC FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 6 |
| Chevrolet | 14 | 29 | HYDRAULIC ROLLER TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 8 |
| Chevrolet | 15 | 30 | HYDRAULIC ROLLER TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 4 |
| Chevrolet | 16 | 31 | HYDRAULIC ROLLER TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 7 |
| Chevrolet | 17 | 32 | HYDRAULIC ROLLER TAPPET — GM 350 LT1 - LT4 1993-1997 | 5 |
| Chevrolet | 18 | 33 | 3 BOLT HYDRAULIC ROLLER TAPPET — GM LS1/LS2/LS3/LS6/LS7/LS9/LSX V8 - ALL 3 BOLT CAM CORES | 6 |
| Chevrolet | 19 | 34 | MECHANICAL ROLLER TAPPET — GM LS1/LS2/LS3/LS6/LS7/LS9/LSX V8 - ALL 3 BOLT CAM CORES All New Profi | 3 |
| Chevrolet | 20 | 35 | MECHANICAL ROLLER TAPPET — All New Profiles CARBURATED GM LS1/LS2/LS3/LS6/LS7/LS9/LSX V8 - ALL 3  | 3 |
| Chevrolet | 21 | 36 | MECHANICAL FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 4 |
| Chevrolet | 22 | 37 | MECHANICAL FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block | 5 |
| Chevrolet | 23 | 38 | MECHANICAL FLAT TAPPET — 262 265 267 283 302 305 307 327 350 400 V8 Small Block twice as strong | 4 |
| Chevrolet | 24 | 39 | MECHANICAL FLAT TAPPET — twice as strong 262 267 283 302 305 307 327 350 400 V8 Small Block | 4 |
| Chevrolet | 25 | 40 | MECHANICAL FLAT TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block twice as strong | 4 |
| Chevrolet | 26 | 41 | MECHANICAL ROLLER TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block | 10 |
| Chevrolet | 27 | 42 | MECHANICAL ROLLER TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block | 7 |
| Chevrolet | 28 | 43 | MECHANICAL ROLLER TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block | 2 |
| Chevrolet | 29 | 44 | ROLLER TAPPET (MAX AREA PROFILE) — 262 267 283 302 305 307 327 350 400 V8 Small Block | 5 |
| Chevrolet | 30 | 45 | MECHANICAL ROLLER TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block | 5 |
| Chevrolet | 31 | 46 | 230 SERIES ROLLER TAPPET — 262 267 283 302 305 307 327 350 400 V8 Small Block | 6 |
| Chevrolet | 32 | 47 | BEAST HYDRAULIC FLAT TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 4 |
| Chevrolet | 33 | 48 | HYDRAULIC FLAT TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block CONTACT CROWER TECHNICIA | 8 |
| Chevrolet | 34 | 49 | HYDRAULIC FLAT TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 8 |
| Chevrolet | 35 | 50 | HYDRAULIC FLAT TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block CONTACT CROWER TECHNICIA | 6 |
| Chevrolet | 36 | 51 | HYDRAULIC ROLLER TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 4 |
| Chevrolet | 37 | 52 | MECHANICAL FLAT TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 4 |
| Chevrolet | 38 | 53 | MECHANICAL FLAT TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 6 |
| Chevrolet | 39 | 54 | MECHANICAL FLAT TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 4 |
| Chevrolet | 40 | 55 | MECHANICAL ROLLER TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 11 |
| Chevrolet | 41 | 56 | MECHANICAL ROLLER TAPPET — 366 396 402 427 454 502 & Rodeck V8 Big Block | 4 |
| Ford | 1 | 57 | HYDRAULIC ROLLER TAPPET — 4.6L/5.4L 2 CAMS MODULAR ( 2 VALVE ) | 3 |
| Ford | 2 | 58 | HYDRAULIC ROLLER TAPPET — 4.6L/5.4L 2 CAMS MODULAR (2 VALVE) | 6 |
| Ford | 3 | 59 | HYDRAULIC ROLLER TAPPET — 4.6L/5.4L QUAD CAM MODULAR (4 VALVE) | 6 |
| Ford | 4 | 60 | 2.0L & 2.3L DURATEC - TWIN CAM — FOCUS PZEV & ST, 4 CYL RANGER (2003-2007) | 4 |
| Ford | 5 | 61 | HYDRAULIC FLAT TAPPET — 2300cc 1974-up 1982-up (4 Bearing) | 9 |
| Ford | 6 | 62 | HYDRAULIC FLAT TAPPET — 240 300 Inline 6 Cylinder | 6 |
| Ford | 7 | 63 | HYDRAULIC FLAT TAPPET — 221 255 (4.2L) 260 289 302 V8 | 7 |
| Ford | 8 | 64 | HYDRAULIC FLAT TAPPET — 221 255 (4.2L) 260 289 302 V8 | 5 |
| Ford | 9 | 65 | HYDRAULIC ROLLER TAPPET — 221 255 (4.2L) 260 289 302 V8 | 5 |
| Ford | 10 | 66 | HYDRAULIC RETRO FIT ROLLER TAPPET — 221 255 (4.2L) 260 289 302 & Boss 302 V8 | 6 |
| Ford | 11 | 67 | MECHANICAL FLAT TAPPET — 221 255 (4.2L) 260 289 302 (5.0l) & Boss 302 V8 | 5 |
| Ford | 12 | 68 | MECHANICAL ROLLER TAPPET — 221 255 (4.2L) 260 289 302 (5.0l) & Boss 302 V8 , Cores not available  | 3 |
| Ford | 13 | 69 | HYDRAULIC FLAT TAPPET — 1969-1993 351W (5.8 L), 1982-1984 302 (5.0L), 302 SVO & 351 SVO | 11 |
| Ford | 14 | 70 | MECHANICAL FLAT TAPPET — 351W (5.8 L), 1982-1984 302 (5.0L), 302 SVO & 351 SVO | 4 |
| Ford | 15 | 71 | MECHANICAL ROLLER TAPPET — 1969-1993 351W (5.8 L), 1982-1984 302 (5.0L), 302 SVO & 351 SVO | 5 |
| Ford | 16 | 72 | HYDRAULIC FLAT TAPPET — 351C 351M 400 V8 | 11 |
| Ford | 17 | 73 | MECHANICAL FLAT TAPPET — 351C 351M 400 V8 | 5 |
| Ford | 18 | 74 | MECHANICAL ROLLER TAPPET — 351C 351M 400 V8 | 5 |
| Ford | 19 | 75 | HYDRAULIC FLAT TAPPET — 332 352 360 390 406 410 427 428 V8 FE | 10 |
| Ford | 20 | 76 | MECHANICAL FLAT TAPPET — 332 352 360 390 406 410 427 428 V8 FE | 6 |
| Ford | 21 | 77 | HYDRAULIC FLAT TAPPET — 370 429 460 V8 | 10 |
| Ford | 22 | 78 | 390 SERIES HYDRAULIC FLAT TAPPET — 370 429 460 V8 | 3 |
| Ford | 23 | 79 | 390 SERIES MECHANICAL FLAT TAPPET — 370 429 460 V8 | 5 |
| Ford | 24 | 80 | MECHANICAL ROLLER TAPPET — 370 429 460 V8 | 7 |
| Mopar | 1 | 89 | TWIN CAM (REAR EXHAUST) — DODGE NEON | 8 |
| Mopar | 2 | 90 | HYDRAULIC ROLLER TAPPET — DODGE VIPER/RT-10 & GTS | 3 |
| Mopar | 3 | 91 | HYDRAULIC ROLLER TAPPET — DODGE 5.7 & 6.1L HEMI & VVT 09-UP | 3 |
| Mopar | 4 | 92 | HYDRAULIC FLAT TAPPET — 273 340 360 & 1967-up 318 LA V8 | 12 |
| Mopar | 5 | 93 | MECHANICAL FLAT TAPPET — 273 340 360 & 1967-up 318 LA V8 | 4 |
| Mopar | 6 | 94 | MECHANICAL ROLLER TAPPET — 273 340 360 & 1967-up 318 LA V8 | 3 |
| Mopar | 7 | 95 | HYDRAULIC FLAT TAPPET — 350 361 383 400 413 426 440 B V8 | 8 |
| Mopar | 8 | 96 | HYDRAULIC FLAT TAPPET — 350 361 383 400 413 426 440 BV8 | 8 |
| Mopar | 9 | 97 | MECHANICAL FLAT TAPPET — 350 361 383 400 413 426 440 B V8 | 7 |
| Mopar | 10 | 98 | HYDRAULIC FLAT TAPPET — 426 Hemi V8 | 6 |
| Mopar | 11 | 99 | MECHANICAL ROLLER TAPPET — 426 Hemi V8 1966-1971 KB ALUMINUM JP1 TFX MILODON & RODECK | 4 |
| Oldsmobile | 1 | 103 | HYDRAULIC FLAT TAPPET — 260 307 (5.0L) 350 (5.7L) 400 403 425 455 (39° bank angle) | 12 |
| Oldsmobile | 2 | 104 | MECHANICAL FLAT TAPPET — 260 307 (5.0L) 350 (5.7L) 400 403 425 455 (39° bank angle) | 1 |
| Pontiac | 1 | 105 | HYDRAULIC FLAT TAPPET — 287 301 316 341 350 370 389 400 421 455 V8 | 5 |
| Pontiac | 2 | 106 | HYDRAULIC FLAT TAPPET — 287 301 316 341 350 370 389 400 421 455 V8 | 9 |
| Pontiac | 3 | 107 | MECHANICAL ROLLER TAPPET — 287 301 316 341 350 370 389 400 421 455 V8 | 3 |

## Rows skipped

- AMC PDF p1 00144H: custom-grind listing (no specs; 'Refer to www.crower.com')
- AMC PDF p1 00144M: custom-grind listing (no specs; 'Refer to www.crower.com')
- AMC PDF p2 00145H: custom-grind listing (no specs; 'Refer to www.crower.com')
- AMC PDF p3 00145M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p1 00154H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p1 00154M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p2 00151H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p2 00151M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p2 00060: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p3 00150H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p3 00150M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p4 00152H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Buick PDF p5 00152M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p1 00106H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p1 00102H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p1 00106M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p1 00106R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p1 00102M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p2 00107H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p2 00107M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p3 00108H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p3 00108M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p4 00109H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p4 00109M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p5 00100H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p6 00100H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p7 00100H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p7 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p7 00055: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p8 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p8 00055: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p9 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p9 00055: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p10 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p10 00055: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p11 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p11 00055: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p12 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p12 00055: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p13 00100H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p13 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p13 00055: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p14 00100HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p14 86085: no duration or lift values in row
- Chevrolet PDF p15 00100HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p15 00003: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p15 00050: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p15 66330H: no duration or lift values in row
- Chevrolet PDF p16 00100HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p16 00003: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p16 00050: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p16 86085: no duration or lift values in row
- Chevrolet PDF p16 66330H: no duration or lift values in row
- Chevrolet PDF p17 00003: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p17 00050: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p17 00052: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p18 00053HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p19 00053R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p20 00053R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p21 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p21 00056: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p22 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p22 00056: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p23 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p23 00056: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p24 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p24 00056: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p25 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p25 00056: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p28 00003: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p28 00050: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p28 00060: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p28 00100R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p29 00003: no duration or lift values in row
- Chevrolet PDF p29 00050: no duration or lift values in row
- Chevrolet PDF p29 00060: no duration or lift values in row
- Chevrolet PDF p29 00100R: no duration or lift values in row
- Chevrolet PDF p30 00003: no duration or lift values in row
- Chevrolet PDF p30 00050: no duration or lift values in row
- Chevrolet PDF p30 00060: no duration or lift values in row
- Chevrolet PDF p30 00100R: no duration or lift values in row
- Chevrolet PDF p31 00003: no duration or lift values in row
- Chevrolet PDF p31 00050: no duration or lift values in row
- Chevrolet PDF p31 00060: no duration or lift values in row
- Chevrolet PDF p31 00100R: no duration or lift values in row
- Chevrolet PDF p32 00047B: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p32 00057: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p32 00101H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p33 00047B: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p33 00057: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p33 00101H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p34 00047B: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p34 00057: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p34 00101H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p35 00047B: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p35 00057: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p35 00101H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 01405: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 01405LM: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 01406: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 01406LM: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 00003: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 00051: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 00060: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 00101HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p36 86086: no duration or lift values in row
- Chevrolet PDF p37 00047B: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p37 00057: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p37 00101M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p38 00047B: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p38 00057: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p38 00101M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p39 00047: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p39 00057: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p40 00003: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p40 00051: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p40 00060: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p40 00101R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p41 00003: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p41 00051: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p41 00060: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p41 00101R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Chevrolet PDF p41 86086: no duration or lift values in row
- Ford PDF p1 00080-2: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p2 00080-2: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p3 00084-4: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p4 00079-2: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p5 00125: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p5 00125: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p6 00119H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p6 00119M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p7 00115H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p8 00115H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p9 00115HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p10 00115HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p11 00115M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p12 00115R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p13 00117H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p14 00117M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p15 00117R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p15 00060: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p16 00114H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p17 00114M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p18 00114R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p18 00060: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p19 00116H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p20 00116M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p20 00116R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p21 00122H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p22 00122H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p23 00122M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Ford PDF p24 00122R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p1 00076-2: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p1 00077P-2: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p1 00077S-2: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p2 00136HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p2 00137HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p2 00131HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p2 00131HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p2 00139HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p3 00133HR: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p4 00131H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p5 00131M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p6 00131R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p7 00132H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p8 00132H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p9 00132M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p9 00132R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p10 00133H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p10 00133M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Mopar PDF p11 00133R: custom-grind listing (no specs; 'Refer to www.crower.com')
- Oldsmobile PDF p1 00156H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Oldsmobile PDF p2 00156M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Pontiac PDF p1 00160H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Pontiac PDF p2 00160H: custom-grind listing (no specs; 'Refer to www.crower.com')
- Pontiac PDF p2 00160M: custom-grind listing (no specs; 'Refer to www.crower.com')
- Pontiac PDF p3 00160R: custom-grind listing (no specs; 'Refer to www.crower.com')
- lifter PDF p3 66913-16: cannot split row: `Ford Flat Head 66913-16`
- lifter PDF p3 66913NA-16: cannot split row: `Ford Flat Head without Adjusters 66913NA-16`

## Needs human QA

- AMC PDF p1: component part number '87050-' (retainers, option/kit 1) is printed garbled (overprinted text); verify
- AMC PDF p1: component part number '87044-' (retainers, option/kit 2) is printed garbled (overprinted text); verify
- AMC PDF p1: component part number '87050-' (retainers, option/kit 3) is printed garbled (overprinted text); verify
- AMC PDF p2: component part number '87049-' (retainers, option/kit 4) is printed garbled (overprinted text); verify
- AMC PDF p2: component part number '87049-' (retainers, option/kit 5) is printed garbled (overprinted text); verify
- AMC PDF p2: component part number '87049-' (retainers, option/kit 6) is printed garbled (overprinted text); verify
- AMC PDF p2: component part number '87049-' (retainers, option/kit 7) is printed garbled (overprinted text); verify
- AMC PDF p3: component part number '68390X3-16A' (springs, option/kit 8) is printed garbled (overprinted text); verify
- AMC PDF p3: component part number '87049-' (retainers, option/kit 8) is printed garbled (overprinted text); verify
- AMC PDF p3: component part number '68390X3-16A' (springs, option/kit 9) is printed garbled (overprinted text); verify
- AMC PDF p3: component part number '87049-' (retainers, option/kit 9) is printed garbled (overprinted text); verify
- Chevrolet PDF p33: component part number '66000-J1-166' (lifters, option/kit 840101S) is printed garbled (overprinted text); verify
- Chevrolet PDF p33: component part number '66000-J1-166' (lifters, option/kit 841203) is printed garbled (overprinted text); verify
- Chevrolet PDF p34: component part number '6666000000-J1-616' (lifters, option/kit 840101S) is printed garbled (overprinted text); verify
- Chevrolet PDF p34: component part number '6666000000-J1-616' (lifters, option/kit 841203) is printed garbled (overprinted text); verify
- Chevrolet PDF p35: component part number '66000-J1-166' (lifters, option/kit 840101S) is printed garbled (overprinted text); verify
- Chevrolet PDF p35: component part number '66000-J1-166' (lifters, option/kit 841203) is printed garbled (overprinted text); verify
- Chevrolet PDF p39: component part number '66900XJX998800-1-166' (lifters, option/kit 843202X980) is printed garbled (overprinted text); verify
- Chevrolet PDF p39: component part number '66900XJX998800-1-166' (lifters, option/kit 843401X980) is printed garbled (overprinted text); verify
- Ford PDF p1 62813-2: expected 4 lift values, found 0 ([]); values kept in catalog order
- Ford PDF p5 00125R: expected 4 duration values, found 0 ([]); values kept in catalog order
- Ford PDF p5 00125R: no lobe-separation value found in the row
- Ford PDF p9: no readable engine heading (overprinted text); engine line taken from the previous page: `221 255 (4.2L) 260 289 302 V8`
- Ford PDF p9: the first spec row is overprinted with the page heading and cannot be read (one cam of this page is missing)
- Buick PDF p3 50260: references option/kit '3' which has no row in the page's component table
- Chevrolet PDF p1 03240: option 1 is not in this page's component table; taken from the facing page
- Chevrolet PDF p1 03241: option 1 is not in this page's component table; taken from the facing page
- Chevrolet PDF p1 03242: option 1 is not in this page's component table; taken from the facing page
- Chevrolet PDF p1 03243: option 1 is not in this page's component table; taken from the facing page
- Chevrolet PDF p33 01243: references option/kit '84103' which has no row in the page's component table
- Chevrolet PDF p34 01981: references option/kit '84103' which has no row in the page's component table
- Chevrolet PDF p40 01487: references option/kit '84512S' which has no row in the page's component table
- Chevrolet PDF p40 01488: references option/kit '84512S' which has no row in the page's component table
- Chevrolet PDF p40 01489: references option/kit '84512S' which has no row in the page's component table
- Ford PDF p12 15415: kit '84510' matched to table row '84510M'
- Ford PDF p12 15458: kit '84510' matched to table row '84510M'
- Ford PDF p12 15416: kit '84510' matched to table row '84510M'
- Ford PDF p12 15417: kit '84510' matched to table row '84510M'
- Ford PDF p17 15388: option 1 is not in this page's component table; taken from the facing page
- Ford PDF p17 15389: option 1 is not in this page's component table; taken from the facing page
- Ford PDF p17 15380: option 1 is not in this page's component table; taken from the facing page
- Ford PDF p17 15381: option 1 is not in this page's component table; taken from the facing page
- Ford PDF p17 15382: option 1 is not in this page's component table; taken from the facing page
- Ford PDF p20 16462: references option/kit '84525M' which has no row in the page's component table
- Ford PDF p20 16463: references option/kit '84525M' which has no row in the page's component table
- Ford PDF p20 16464: references option/kit '84525M' which has no row in the page's component table
- Mopar PDF p7 32915: references option/kit '1' which has no row in the page's component table
- Mopar PDF p7 32917: references option/kit '1' which has no row in the page's component table
- Mopar PDF p7 32918: references option/kit '1' which has no row in the page's component table
- Mopar PDF p7 32916: option 4 is not in this page's component table; taken from the facing page
- Mopar PDF p7 32919: option 4 is not in this page's component table; taken from the facing page
- Mopar PDF p7 32241: option 4 is not in this page's component table; taken from the facing page
- Mopar PDF p7 32242: option 4 is not in this page's component table; taken from the facing page
- Mopar PDF p7 32243: option 4 is not in this page's component table; taken from the facing page
- Mopar PDF p11 33470: references option/kit '84532' which has no row in the page's component table
- Mopar PDF p11 33471: references option/kit '84532' which has no row in the page's component table
- Mopar PDF p11 33472: references option/kit '84536' which has no row in the page's component table
- Mopar PDF p11 33473: references option/kit '84536' which has no row in the page's component table
- Mopar PDF p11 33473: references option/kit '84536' which has no row in the page's component table
- spring 68180 (booklet p3): coil bind 1.32 read from a mis-aligned cell in the load table
- spring 68180 (booklet p3): retainer '87096 (5.5mm)' read from a mis-aligned cell in the load table
- spring 68180: seat load 87 lb interpolated between 1.95 and 2.0 (installed height 1.975 not tabulated)
- spring 68194X2 (booklet p3): coil bind 0.87 read from a mis-aligned cell in the load table
- spring 68194X2 (booklet p3): retainer '87020' read from a mis-aligned cell in the load table
- spring 68194X2 (booklet p3): retainer '87020T' read from a mis-aligned cell in the load table
- spring 68194X2: seat load 116 lb interpolated between 1.45 and 1.5 (installed height 1.47 not tabulated)
- spring 68435 (booklet p3): rate printed as '.352'; stored as 352 lb/in
- spring 68194 (booklet p4): coil bind 0.806 read from a mis-aligned cell in the load table
- spring 68194 (booklet p4): retainer '87026 (7mm)' read from a mis-aligned cell in the load table
- spring 68194 (booklet p4): retainer '87026T (7mm)' read from a mis-aligned cell in the load table
- spring 68152 (booklet p4): coil bind 1.055 read from a mis-aligned cell in the load table
- spring 68152 (booklet p4): retainer '87057+' read from a mis-aligned cell in the load table
- spring 68152 (booklet p4): retainer '87029+' read from a mis-aligned cell in the load table
- spring 68190 (booklet p4): coil bind 0.92 read from a mis-aligned cell in the load table
- spring 68190 (booklet p4): retainer '87095 (6.5mm)' read from a mis-aligned cell in the load table
- spring 68189: seat load 84 lb interpolated between 1.55 and 1.6 (installed height 1.59 not tabulated)
- spring 68705 (booklet p16): coil bind 1.125 read from a mis-aligned cell in the load table
- spring 68100X200X1: not in the 2024 booklet; specs from the Chevrolet cam PDF p5 pressure line only
- spring 68806: not in the 2024 booklet; specs from the Chevrolet cam PDF p26 pressure line only
- spring 68385X2: not in the 2024 booklet; specs from the Chevrolet cam PDF p38 pressure line only
- spring 68365: not in the 2024 booklet; specs from the Chevrolet cam PDF p40 pressure line only
- spring 68860: not in the 2024 booklet; specs from the Chevrolet cam PDF p41 pressure line only
- spring 68555X1: not in the 2024 booklet; specs from the Ford cam PDF p18 pressure line only
- spring 68804: not in the 2024 booklet; specs from the Ford cam PDF p24 pressure line only
- spring 68363: not in the 2024 booklet; specs from the Mopar cam PDF p9 pressure line only
- spring 68803: not in the 2024 booklet; specs from the Mopar cam PDF p9 pressure line only
- lifter PDF p10 66278X903T-16: pushrod-seat location columns printed as '- 16'; read as left/right
- lifter PDF p13 66282X937E-16: pushrod-seat location columns printed as '8 8'; read as left/right
- lifter 66000-12: seat height printed '1.7-0”' read as 1.700

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family; numeric spec fields are numbers (inches as decimals); no empty strings.

- passed
