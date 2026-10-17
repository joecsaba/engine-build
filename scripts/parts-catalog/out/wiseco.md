# Wiseco — extraction notes

Extracted 2026-10-17 by `scripts/parts-catalog/extract_wiseco.py` from `Catalogs\Wiseco22_Auto_catalog_Final web.pdf` (local file, no network).

## What was parsed

PDF pages 4–111 (printed page numbers are the same). The PDF prints every catalog page twice (page n and n+1 carry the same tables, a few with one row differing); rows are de-duplicated on part number + bore + stroke + rod + CH and the first page is cited. 1476 unique table rows parsed into 1435 records. A record is one part number in one fitment family; a part number printed under several stroke/rod rows becomes one record whose `spec.stroke / rodLength / deckHeight / cr` are the first row and `spec.applications` lists all rows (rows printed as `3.480 / 3.750` stroke with `6.125 / 6.000` rod, or `6.098/6.100` rod, are split the same way, with the second CR line attached to the second application).

Not extracted: pp 112–163 sport compact and 164–183 European (no fitment family in the list); 184+ rings, pins, locks, ring compressors, technology, apparel. The separate powersports catalog is ignored per the brief.

### Column mapping

K-series columns: `Kit Part # | Bore Size | Comp Ht. | Stroke | Rod | 0 Deck at | Std Deck Ht. | Avg Gram Wt. | Comp. Volume | Compression Ratio At <chamber cc>... | Wrist Pin # | Wrist Pin Specs | Ring Set | Ring Specs | Skirt | Valve Pocket (or Lock Part # | Lock Type) | Ring Comp. Sleeve | K1 Con. Rod | K1 Crankshaft Part #`. Pro Tru Street columns: `Kit Part # | Bore | Cubic Inch | Comp. Ht. | Stroke | Rod | Avg. Wt. | Volume | CR at <cc> | Wrist Pin # | Wrist Pin Specs | Ring Set | Ring Specs | Repl. Piston | Lock Part # | Lock Type | Ring Comp. Sleeve | K1 Con. Rod | K1 Crankshaft`.

- `spec.bore`, `ch`, `stroke`, `rodLength`, `weight` (grams), `domeCc` (Comp. Volume: negative = dish / reverse dome, positive = dome; `*` footnoted domes get `see section footnote on dome` in `fit.notes`) are the printed values. `spec.crownNote` keeps crown words printed in the volume column (`Hollow`, `Solid`, `FT`).
- `spec.deckHeight` = `Std Deck Ht.` (the stock block deck height), `spec.zeroDeckHeight` = `0 Deck at` (the deck height at which the piston is at zero deck); their difference is the piston-to-deck distance at a stock deck.
- Compression ratios are keyed by the chamber cc in the header block (`spec.cr = {"58": 11.6, "62": 10.9, ...}`); the Pro Tru Buick GN table keys them `Stage1` / `Stage2` as printed. Tables whose header labels the columns (`‘09+ 5.7L / All 6.1L`) carry the labels in `spec.crNote` together with the section's CR basis (`CR at 0 deck with .051” gasket`). Rows that print fewer CR values than the table has chamber columns cannot be aligned: they are stored unkeyed in `spec.crValues` with a `crNote`.
- `spec.pin` is read from the row's `Wrist Pin Specs` (`.927 x 2.250 x .173` → pin .927, `pinLength` 2.250, `pinWall` .173); when the row has none, from the section title (`• .927” Pin`, `9252” Pin` = .9252 LS7) or the bullet `.927” Pin Diameter`. `spec.pinPn` is the Wiseco pin part number.
  Pin sources over the records: {'row pin specs': 1312, 'none': 123}.
- `spec.alloy` is the section bullet (`2618 High Strength Alloy`); Pro Tru Street sections have no bullets and take the chapter statement on p94 (`forged from 4032 alloy`). Sources over the records: {'section bullet': 1016, 'none': 160, 'chapter statement (Pro Tru p94)': 259}.
- `spec.ringPack` is the row's Ring Specs (`1.5mm - 1.5mm - 3mm`, `1/16-1/16-3/16`, `.043 - .043 - 3.0mm`), else the section bullet; `spec.ringSet` the Wiseco ring set part number, `ringSetOptions` the Total Seal (`TS#`) / alternate (`W#`) sets printed on extra lines; `ringsIncluded` from the bullets (`Rings Included` / `Rings Sold Separately`).
- `spec.skirt` (`strutted` / `slab side`), `lock` / `lockType`, `ringCompressor` (RCS sleeve), `replacementPiston` (Pro Tru bare piston PN), `k1Rod` / `k1Crank` (companion K1 Technologies part numbers, only when printed cleanly; the overlapped `0 0 1 1 2 2 A A ...` strings are dropped). `fit.notes` carries the valve-pocket text (`LS1, 2, 3, 6, 92 (cathedral)`), the stock/aftermarket rod note and section notes.
- `cat` is `piston` for every record: Wiseco K kits are piston + pin + locks (rings per section), not piston + rod kits, so no `pistonKit` records. `emissions` is `null`.
- Known gap: in the BBC `12°-14° Solid Dome` and `18° Solid Dome` tables (pp 60–67) the volume / CR cells are two-line cells (`6cc Solid Dome` over `-6cc Cut to FT`, CRs for both) and the text layer overprints them into unreadable character soup; those rows keep bore / CH / stroke / rod / deck / pin / rings but no `domeCc` or `cr` (listed one per row under QA). Pages 60–67 need a manual pass or a rendered-image read.

### Family mapping

- By chapter (pp 4–41 LS/LT/SBC, 42–69 BBC, 70–81 Chrysler, 82–93 Ford, 94–111 Pro Tru) refined by title keywords: `GEN V` / `LT1` / `LT2` / `LT4` / `L83` → `GM LT (Gen V)`; `LS` → `GM LS`; 5.7L / 6.1L → `Chrysler Gen III Hemi 5.7/6.1`; 6.2L Hellcat / 6.4L → `Chrysler Gen III Hemi 6.2/6.4`; 318/340/360 → `Mopar LA small block`; 383/400/440 → `Mopar B/RB big block`; 426 → `Chrysler 426 Hemi`; 302 / 351 Windsor → `Small-block Ford (Windsor)`; 4.6 / 5.4 → `Ford Modular`; Coyote; Godzilla; Pro Tru AMC / Buick / Cadillac / Chevy / Chrysler / Ford / Jeep / Olds by name.
- Big-block Chevy sections are emitted under both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same convention as MAHLE / JE).
- `Buick 455 / Cadiliac 500` (sic) is emitted under both `Buick big block` and `Cadillac 368-500`.
- **Families not in the fitment list** (`fit.fam` = catalog heading or a descriptive name; needs a decision): `Chevy 3.8L L67 V6 3800 Series`, `Chevy 4.3L/262 V6`, `Chevy Vortec 8.1 (Gen VII)`, `Ford 2300 Pinto`, `Ford Flathead V8`.

## Spec coverage

| field | records with a value |
|---|---|
| stroke | 1435 / 1435 |
| rodLength | 1435 / 1435 |
| ch | 1435 / 1435 |
| pin | 1312 / 1435 |
| domeCc | 1272 / 1435 |
| cr | 1316 / 1435 |
| crValues | 10 / 1435 |
| weight | 713 / 1435 |
| ringPack | 1357 / 1435 |
| alloy | 1275 / 1435 |

## Informational counts (not QA items)

- duplicate rows dropped (every page is printed twice): 1471
- rows without ring specs in the row (ring pack from the section bullet where stated): 216
- dome / CR cell fragment lines ignored (multi-line cells of overprinted rows): 212
- rows with no dome volume printed: 202
- rows with no CR values printed: 100
- rows printing fewer CR values than chamber columns (stored unkeyed in spec.crValues): 20
- rows with CR values for a second stroke/rod combination (spec.applications): 9
- CR values printed with a doubled decimal point ('9..9'), read as 9.9: 6

## Rows per section (PDF page where the table starts)

| page | section | rows |
|---|---|---|
| 4 | Max Dome LS - Small Bore | 3 |
| 4 | LS 5.3L / 327ci “Drop In” Replacements • NA/Boost/Nitrous | 19 |
| 6 | GEN V Direct Injected L83 5.3L | 12 |
| 6 | LS 5.7L • NA/Boost/Nitrous | 9 |
| 7 | LS 5.7L • NA/Boost/Nitrous | 9 |
| 8 | LS Standard stroke • NA/Boost/Nitrous • 3.622 Stroke | 16 |
| 9 | LS Standard stroke • NA/Boost/Nitrous • 3.622 Stroke | 33 |
| 12 | LS • 3.900” Stroker • NA/Boost/Nitrous • .927” Pin | 76 |
| 16 | Max Dome LS / 408ci • 4.000” Stroker • NA/Nitrous • 927” Pin | 6 |
| 16 | TS=CSH4434060 012FAE400 / 012FAE40058/ | 7 |
| 17 | TS=CSH4434060 012FAE400 / 012FAE40058/ | 1 |
| 18 | Max Dome LS / 408ci • 4.000” Stroker • NA/Nitrous • 927” Pin | 2 |
| 18 | LS • 4.000” Stroker • NA/Boost/Nitrous • .927” Pin | 21 |
| 19 | Max Dome LS / 408ci • 4.000” Stroker • NA/Nitrous • 927” Pin | 1 |
| 19 | LS • 4.000” Stroker • NA/Boost/Nitrous • .927” Pin | 53 |
| 24 | LS • 4.100/4.125” Stroker • NA/Boost/Nitrous • .927” Pin | 22 |
| 26 | GEN V Direct Injected LT1 / LT2 6.2L | 20 |
| 26 | GEN V Direct Injected LT4 6.2L | 3 |
| 27 | GEN V Direct Injected LT4 6.2L | 3 |
| 28 | LS7 7.0L / 427ci • NA/Nitrous • 9252” Pin | 2 |
| 28 | Chevrolet • Small Block 305 Sprint Flat Top | 4 |
| 30 | 350 / 400 - 21° - 23° Two Barrel Flat Top | 15 |
| 30 | 350/400 - 21°-23° PRO Late Model Flat Top | 9 |
| 31 | 350/400 - 21°-23° PRO Late Model Flat Top | 15 |
| 32 | 350 23° Flat Top • Strutted High Strength | 10 |
| 33 | 350 23° Flat Top • Strutted High Strength | 5 |
| 34 | 350 23° Blower / Turbo Dish | 16 |
| 36 | 360 Sprint Car • Brodix 11X ASCS Head | 10 |
| 36 | 350 23° Hollow Dome • Strutted High Strength • Lil Quick 16 | 16 |
| 38 | 400 23° Blower / Turbo Dish | 9 |
| 38 | 400 18° Solid Dome • Strutted High Strength • “Lil Quick 16” | 15 |
| 39 | 400 18° Solid Dome • Strutted High Strength • “Lil Quick 16” | 9 |
| 40 | 400 23° Hollow Dome • Strutted High Strength • “Lil Quick 16” | 21 |
| 42 | Chevrolet Big Block • Turbo / Marine / Supercharger • Reverse Dome | 21 |
| 44 | Chevrolet Big Block • Hollow Dome • Light Weight Drag | 30 |
| 46 | Chevrolet Big Block • Nitrous • Hollow Dome | 24 |
| 46 | Chevrolet Big Block • Dome • 396/ 427/ 454/ 502 Series | 3 |
| 48 | Chevrolet Big Block • Dome • 396/ 427/ 454/ 502 Series | 45 |
| 50 | Chevrolet Big Block • Dome • 396/ 427/ 454/ 502 Series | 45 |
| 52 | Chevrolet Big Block • Dome • 396/ 427/ 454/ 502 Series | 22 |
| 52 | 1st Gen (Angle Milled Capable) • Semi-Hollow Dome • Gas Ported | 13 |
| 53 | 1st Gen (Angle Milled Capable) • Semi-Hollow Dome • Gas Ported | 91 |
| 58 | 2nd Gen • Hollow Dome (Lightweight) • Gas Ported | 64 |
| 60 | 12° - 14° Solid Dome • Nitrous • Gas Ported | 5 |
| 61 | 12° - 14° Solid Dome • Nitrous • Gas Ported | 30 |
| 64 | 18° Solid Dome • Nat. Aspirated or Nitrous • Gas Ported | 12 |
| 65 | 18° Solid Dome • Nat. Aspirated or Nitrous • Gas Ported | 28 |
| 68 | BBC • Hollow Dome • Brodix® SR20 • Strutted High Strength | 40 |
| 70 | 5.7L “Drop In” Replacements • NA/Boost/Nitrous • .945” Pin | 6 |
| 70 | 5.7L Stock Stroke • .927” Pin | 7 |
| 70 | 5.7L 366ci • 3.795” Stroke • .927” Pin | 7 |
| 72 | Chrysler 5.7L 392ci • 4.050” Stroker • .927” Pin | 9 |
| 72 | 5.7L 392ci • 4.080” Stroker • .866” Pin | 7 |
| 72 | 6.1L Hemi “Drop In” Replacements • NA/Boost/Nitrous • .984” Pin | 6 |
| 72 | 6.1L Hemi • Stock Stroke • .927” Pin | 4 |
| 74 | Chrysler 6.1L 392ci • 3.795” Stroker • .927” pin | 4 |
| 74 | 6.1L 426ci • 4.050” Stroker • .927” pin | 4 |
| 74 | 6.1L 426ci • 4.080” Stroker • .866” Pin | 6 |
| 74 | 6.2L Hemi Hellcat / Demon “Drop In” Replacements • Boost/Nitrous • .945” Pin | 3 |
| 74 | 6.4L Hemi Boost / Nitrous | 6 |
| 76 | 6.4L Hemi • N/A / Boost / Nitrous | 6 |
| 76 | 6.4L Hemi • Boost/Nitrous | 12 |
| 76 | Mopar • 318 / 340 / 360 • Reverse Dome • 4.000” Stroker | 6 |
| 78 | Mopar • 318 / 340 / 360 • Flat Top • 4.000” Stroker | 6 |
| 78 | Mopar • 340 / 360 • Nitrous Dome • 4.000” Stroker • Gas Ported | 10 |
| 78 | Chrysler Big Block • Mopar • 383 / 400 / 440 • Flat Top | 9 |
| 80 | Mopar • 383 / 400 / 440 • Reverse Dome | 7 |
| 80 | Chrysler Hemi • Mopar • 426 HEMI | 6 |
| 82 | Xtra Light Weight • Road Race & Circle Track | 5 |
| 82 | 2300 / Pinto Mini-Stock Race Piston • .200” Top Land • Lateral Gas Ports | 8 |
| 82 | 2300 / Pinto Flat Top • Turbo • Road Race & Circle Track | 8 |
| 84 | Ford Small Block • 302 Blower / Turbo Dish | 10 |
| 84 | 351 Windsor Blower / Turbo Dish | 7 |
| 84 | 302 / 351 Blower / Turbo Dish | 15 |
| 86 | 302 / 351 Windsor Flat Top | 15 |
| 86 | 302 / 351 Blower Turbo Dish | 15 |
| 87 | 302 / 351 Blower Turbo Dish | 15 |
| 88 | Ford Mod OHC V8 • 5.0L “Coyote” DOHC V8 4 Valve • NA/Boost/Nitrous | 12 |
| 90 | 4.6 SOHC V8 • OEM/PI 2 Valve • NA/Boost/Nitrous | 8 |
| 90 | 4.6 SOHC V8 • 2 Valve Trick Flow Twisted Wedge • NA/Boost/Nitrous | 8 |
| 90 | 4.6 SOHC V8 • 3 Valve • NA/Boost/Nitrous • Top Ring Down .300” | 8 |
| 90 | 4.6 DOHC V8 • 4 Valve • NA/Boost/Nitrous • Top ring down .300” | 8 |
| 92 | Ford 5.4L SOHC V8 • 2 Valve Trick Flow Twisted Wedge • NA/Boost/Nitrous | 8 |
| 92 | 5.4L SOHC V8 • OEM/PI 2 Valve • NA/Boost/Nitrous • Top ring down .300” | 8 |
| 92 | 5.4 SOHC V8 • 3 Valve • NA/Boost/Nitrous | 8 |
| 92 | 5.4 DOHC V8 • 4 Valve • NA/Boost/Nitrous • Top ring down .300” | 8 |
| 92 | 7.3L Godzilla V8 • Boosted | 2 |
| 94 | AMC 360 V8 Flat Top -8.6cc | 2 |
| 94 | AMC 360 V8 Reverse Dish -21cc | 2 |
| 94 | AMC 390 V8 Flat Top -8.6cc | 2 |
| 94 | AMC 390 V8 Reverse Dish -25cc | 2 |
| 94 | AMC 401 V8 Flat Top -8.6cc | 2 |
| 94 | AMC 401 V8 Reverse Dish -27cc | 2 |
| 94 | Buick Grand National 3.8L V6 Turbo | 2 |
| 96 | Buick 455 Flat top | 2 |
| 96 | Buick 455 Reverse Dome | 2 |
| 96 | Buick 455 / Cadiliac 500 | 4 |
| 96 | Chevy 4.3L/262 V6 | 6 |
| 96 | Chevy 3.8L L67 V6 3800 Series | 12 |
| 96 | Chevy 305 Small Block Flat Top • 2-Valve Pocket | 2 |
| 98 | Chevy 350 23° Small Block Flat Top • 2-Valve Pockets | 17 |
| 98 | Chevy 350 23° Small Block Reverse Dome | 12 |
| 98 | Chevy 350 23° Small Block • Hollow Dome | 6 |
| 100 | Chevy 400 23° Small Block Flat Top • 2-Valve Pockets | 10 |
| 100 | Chevy 400 23° Small Block • Hollow Dome | 3 |
| 100 | Chevy 400 23° Small Block • Reverse Dome | 10 |
| 100 | Chevy LS Series +4cc Domed • .945 OEM Pin Dia. • w/ 1/16 x 1/16 x3mm rings | 4 |
| 100 | Chevy 396 Big Block Domed • Closed Chamber | 5 |
| 102 | Chevy 427 Big Block Domed • Resto Mod | 3 |
| 102 | Chevy 427 Big Block Domed • Closed Chamber | 3 |
| 102 | Chevy 454 Big Block • Open Chamber Hollow Dome | 20 |
| 104 | Chevy 502 Big Block • Open Chamber Flat Top | 3 |
| 104 | Chevy 502 Big Block • Open Chamber Domed | 4 |
| 104 | Chevy Vortec 8.1 Flat Top • GEN 7 • Non-stock .990 pin dia. | 3 |
| 104 | Chevy 502 Cubic Inch • Mini Dome | 3 |
| 104 | Chevy Big Block 502 Dome | 2 |
| 104 | Chrysler 225 Slant 6 Flat Top (w/ 1.0, 1.2, 2.8mm rings) | 2 |
| 104 | Chrysler 318 Flat Top (w/ 5/64 x 5/64 x 3/16 rings) | 2 |
| 106 | Chrysler 360 Flat Top | 2 |
| 106 | Chrysler 340/360 Flat Top • 4.000 Stroker Crank | 3 |
| 106 | Chrysler 440 Flat Top | 3 |
| 106 | Chrysler 440 Flat Top • 4.150 Stroker Crank • OEM and Indy Cyl. Heads | 2 |
| 106 | Ford Windsor 289 / 302 Flat Top | 2 |
| 106 | Ford Windsor 302 Stroker Flat Top | 4 |
| 106 | Ford Windsor 289 / 302 Reverse Dome | 9 |
| 108 | Ford Windsor 351 Flat Top | 4 |
| 108 | Ford Windsor 351 Reverse Dome | 5 |
| 108 | Ford Cleveland 351 Flat Top | 2 |
| 108 | Ford 427 FE | 8 |
| 108 | Ford 460 Flat Top (also fits Marine appl.) 7.5L | 10 |
| 110 | Ford Flathead | 10 |
| 110 | Jeep 4.0L Inline 6 | 4 |
| 110 | Oldsmobile 455 Reverse Dome | 2 |

## Records per family

| family | records |
|---|---|
| GM LS | 276 |
| Chevy Gen VI big block | 263 |
| Chevy Mark IV big block | 263 |
| Small-block Chevy | 217 |
| Small-block Ford (Windsor) | 94 |
| Chrysler Gen III Hemi 5.7/6.1 | 39 |
| GM LT (Gen V) | 38 |
| Ford Modular | 32 |
| Mopar LA small block | 29 |
| Chrysler Gen III Hemi 6.2/6.4 | 27 |
| Ford 2300 Pinto | 21 |
| Mopar B/RB big block | 21 |
| Chrysler 426 Hemi | 16 |
| AMC V8 | 12 |
| Chevy 3.8L L67 V6 3800 Series | 12 |
| Ford Coyote | 12 |
| Ford 429/460 | 10 |
| Ford Flathead V8 | 10 |
| Buick big block | 8 |
| Ford FE | 8 |
| Chevy 4.3L/262 V6 | 6 |
| AMC/Jeep inline-6 | 4 |
| Cadillac 368-500 | 4 |
| Chevy Vortec 8.1 (Gen VII) | 3 |
| Buick V6 181-252 | 2 |
| Ford 351C/351M/400 | 2 |
| Ford Godzilla 7.3 | 2 |
| Mopar Slant Six | 2 |
| Oldsmobile V8 | 2 |
| **total** | 1435 |

## Rows skipped

- p52: row without a part number: `4.610 1.120 4.250 6.535 9.780 9.800 2cc 11.5 11.0 9.8 9.6 CS25 Spirolox® RCS46100`
- p53: row without a part number: `4.610 1.120 4.250 6.535 9.780 9.800 2cc 11.5 11.0 9.8 9.6 CS25 Spirolox® RCS46100`
- p108: part number printed without data: `PT568AS`
- p109: part number printed without data: `PT568AS`

## Needs human QA

- p9 K0431XS: duplicate page prints a different line (kept p8): `K0431XS 4.000 1.320 3.622 6.098 9.230 9.240 -3.2cc 11.4 10.8 10.3 10.0 S749 .943 x 2.250 4007GFX 1.2mm - 1.2mm - 3mm LS1, 2, 3, 6, 92 (cathedral) RCS40000 012FAE362 / 012FAE36224 /`
- p11 K0432XS: duplicate page prints a different line (kept p10): `K0432XS 4.000 1.321 3.622 6.098 9.230 9.240 -3.2cc 11.4 10.8 10.3 10.0 S718 .927 x 2.250 x .527 4007GFX 1.2mm-1.2mm-3mm LS1, 2, 3, 6, 92 (cathedral) RCS40000 012AE25613 012FAE362 / 012FAE36224 /`
- p15 K0422X130: duplicate page prints a different line (kept p14): `K0422X130 4.130 1.165 3.900 6.125 9.240 9.240 -12cc 10.6 10.5 10.2 10 S812 .927 x .2.250 x .185 4132GFX 1.2mm - 1.2mm - 3mm LS1, 2, 3, 6 7, 92 012AE25613 012FAE390 / 012FAE39024 /`
- p17 K0426X2: duplicate page prints a different line (kept p16): `K0426X2 4.020 1.165 3.900 6.125 9.240 9.240 10cc 13.1 13.0 12.6 12.3 S812 .927 x .2.250 x .185 4022GFX 1.2mm - 1.2mm - 3mm LS1, 2, 3, 6 7, 92 RCS40200 012AE25613 012FAE390 / 012FAE39024 /`
- p17 K0426X7: duplicate page prints a different line (kept p16): `K0426X7 4.070 1.165 3.900 6.125 9.240 9.240 10cc 13.4 13.2 12.9 12.5 S812 .927 x .2.250 x .185 4072GFX 1.2mm - 1.2mm - 3mm LS1, 2, 3, 6 7, 92 RCS40700 012AE25613 012FAE390 / 012FAE39024 /`
- p17 K0433B1: duplicate page prints a different line (kept p16): `K0433B1 4.010 1.110 4.000 6.125 9.235 9.240 467 11.8cc 12.8 12.5 S691 .927 x 2.250 LS1, 2, 3, 6, 7, 92 012AE25613`
- p21 K394X65: duplicate page prints a different line (kept p20): `K394X65 4.065 1.115 4.000 6.125 9.240 9.240 -8cc 11 10.7 10.6 10.4 .927 x 2.250 4067GFX (x8) 1.2mm - 1.2mm - 3mm LS1,2,3,6,92 RCS40650 012AE25610 / 012AE25613`
- p64 K498B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B6 4.560 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p64 K498B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B100 4.600 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p64 K498B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B105 4.605 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p64 K498B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B110 4.610 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p64 K498B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B115 4.615 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p64 K498B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B125 4.625 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p64 K497B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B100 4.600 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p64 K497B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B105 4.605 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p64 K497B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B110 4.610 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p64 K497B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B115 4.615 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p64 K497B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B125 4.625 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p64 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p65 K498B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B6 4.560 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p65 K498B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B100 4.600 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p65 K498B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B105 4.605 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p65 K498B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B110 4.610 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p65 K498B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B115 4.615 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p65 K498B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K498B125 4.625 1.215 4.375 6.385 9.788 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p65 K497B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B100 4.600 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p65 K497B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B105 4.605 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p65 K497B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B110 4.610 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p65 K497B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B115 4.615 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p65 K497B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K497B125 4.625 1.155 4.500 6.385 9.790 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 . 4 D .6 o m FT e / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p65 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p66 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p66 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p66 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.250 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p66 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p66 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p66 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p66 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p66 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p66 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p66 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p66 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p66 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p66 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p66 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p66 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p66 K495B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B100 4.600 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p66 K495B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B105 4.605 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K495B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B110 4.610 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p66 K495B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B115 4.615 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p66 K495B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B125 4.625 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p67 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p67 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p67 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.250 4.250 6.535 9.780 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 3 1 o . 7 m 6 . 0 e F T / 1 D 2 1 o . 4 m 2 . 9 e F T / 1 D / F 4 1 T o 1 . m 3 .8 e 14 11 D .6 o m FT e / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p67 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p67 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p67 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p67 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.120 4.375 6.480 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 7 m 0 . 5 e F T / 1 D 2 1 o . 5 m 6 . 4 e F T / 1 D / F 4 1 T o . 2 m 7 . 2 e D 1 1 o 2 4 m F .5 e T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p67 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p67 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p67 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p67 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.120 4.500 6.800 10.170 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 1 D 4 1 o . 6 m 6 . 0 e F T / 1 D 3 1 o . 5 m 0 . 8 e F T / 1 D / F 5 1 T o . 2 m 1 . 6 e 1 D 2 1 o . 4 m 4 . 8 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p67 K496B6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B6 4.560 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4560-5 .043-.043-3mm Strutted CS25 Spirolox® RCS45600`)
- p67 K496B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B100 4.600 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p67 K496B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B105 4.605 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B110 4.610 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p67 K496B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B115 4.615 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K496B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K496B125 4.625 1.120 4.750 6.700 10.195 10.200 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut D 1 1 o 5 9 m F .0 e T / 1 D 3 1 o . 6 m 6 . 6 e F T / 1 D / F 5 1 T o . 3 m 9 . 1 e 1 D 2 1 o . 5 m 9 . 5 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p67 K495B100: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B100 4.600 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46000`)
- p67 K495B105: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B105 4.605 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4600-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K495B110: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B110 4.610 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46100`)
- p67 K495B115: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B115 4.615 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4610-5 .043-.043-3mm Strutted CS25 Spirolox®`)
- p67 K495B125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K495B125 4.625 1.065 4.375 6.535 9.787 9.800 Do 1 m 5. e 6 t o c / c - F 4 S T c o c l i C d ut 18 1 4 D .3 o m FT e / 1 D 2 1 o . 5 m 9 . 7 e F T / 1 D / F 5 1 T o 2 m .5 e 1 D 2 1 o . 4 m 2 . 7 e F T / S726 .990 x 2.930 x .180 JG7708-4625-5 .043-.043-3mm Strutted CS25 Spirolox® RCS46250`)
- p86 K0166X3: compression ratio printed as 112.0 (typo), stored as missing (line: `K0166X3 4.030 1.280 4.000 6.200 9.480 9.500 -7.5cc 12.6 112.0 11.7 11.5 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Slipper or Slab CS24 Spirolox® RCS40300`)
- p86 K0166X4: compression ratio printed as 112.0 (typo), stored as missing (line: `K0166X4 4.040 1.280 4.000 6.200 9.480 9.500 -7.5cc 12.6 112.0 11.7 11.5 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Slipper or Slab CS24 Spirolox® RCS40400`)
- p86 K0166X6: compression ratio printed as 112.0 (typo), stored as missing (line: `K0166X6 4.060 1.280 4.000 6.200 9.480 9.500 -7.5cc 12.6 112.0 11.7 11.5 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Slipper or Slab CS24 Spirolox® RCS40600`)
- p86 K0167X3: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X3 4.030 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.5 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40300`)
- p86 K0167X4: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X4 4.040 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.5 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40400`)
- p86 K0167X6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X6 4.060 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.5 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40600`)
- p86 K0167X125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X125 4.125 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- p86 K0167X155: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X155 4.155 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.6 9.2 9.0 8.5 S424 .927 X 2.500 x .150 4158GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox®`)
- p86 K0168X3: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X3 4.030 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40300`)
- p86 K0168X4: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X4 4.040 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40400`)
- p86 K0168X6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X6 4.060 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40600`)
- p86 K0168X125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X125 4.125 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 8.9 8.7 8.5 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- p86 K0168X155: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X155 4.155 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.6 9.1 8.8 8.6 S424 .927 X 2.500 x .150 4158GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox®`)
- p86 K0169X3: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X3 4.030 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.0 9.8 9.3 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40300`)
- p86 K0169X4: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X4 4.040 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.0 9.8 9.3 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40400`)
- p86 K0169X6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X6 4.060 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.0 9.8 9.3 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40600`)
- p86 K0169X125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X125 4.125 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.2 10.1 9.4 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- p86 K0169X155: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X155 4.155 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.7 10.3 10.2 9.5 S424 .927 X 2.500 x .150 4158GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox®`)
- p87 K0166X3: compression ratio printed as 112.0 (typo), stored as missing (line: `K0166X3 4.030 1.280 4.000 6.200 9.480 9.500 -7.5cc 12.6 112.0 11.7 11.5 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Slipper or Slab CS24 Spirolox® RCS40300`)
- p87 K0166X4: compression ratio printed as 112.0 (typo), stored as missing (line: `K0166X4 4.040 1.280 4.000 6.200 9.480 9.500 -7.5cc 12.6 112.0 11.7 11.5 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Slipper or Slab CS24 Spirolox® RCS40400`)
- p87 K0166X6: compression ratio printed as 112.0 (typo), stored as missing (line: `K0166X6 4.060 1.280 4.000 6.200 9.480 9.500 -7.5cc 12.6 112.0 11.7 11.5 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Slipper or Slab CS24 Spirolox® RCS40600`)
- p87 K0167X3: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X3 4.030 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.5 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40300`)
- p87 K0167X4: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X4 4.040 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.5 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40400`)
- p87 K0167X6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X6 4.060 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.5 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40600`)
- p87 K0167X125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X125 4.125 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- p87 K0167X155: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0167X155 4.155 1.090 3.400 5.400 8.190 8.200 - 2 1 1 7 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 9.6 9.2 9.0 8.5 S424 .927 X 2.500 x .150 4158GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox®`)
- p87 K0168X3: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X3 4.030 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40300`)
- p87 K0168X4: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X4 4.040 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40400`)
- p87 K0168X6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X6 4.060 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 9.1 8.9 8.4 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40600`)
- p87 K0168X125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X125 4.125 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.5 8.9 8.7 8.5 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- p87 K0168X155: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0168X155 4.155 1.165 3.250 5.400 8.190 8.200 -13( ( 4 4 . . 0 1 3 2 0 5 ) ) -17 9.6 9.1 8.8 8.6 S424 .927 X 2.500 x .150 4158GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox®`)
- p87 K0169X3: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X3 4.030 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.0 9.8 9.3 S424 .927 X 2.500 x .150 4037GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40300`)
- p87 K0169X4: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X4 4.040 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.0 9.8 9.3 S424 .927 X 2.500 x .150 4047GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40400`)
- p87 K0169X6: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X6 4.060 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.0 9.8 9.3 S424 .927 X 2.500 x .150 4067GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS40600`)
- p87 K0169X125: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X125 4.125 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.5 10.2 10.1 9.4 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- p87 K0169X155: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `K0169X155 4.155 1.280 4.000 6.200 9.480 9.500 - 2 2 5 0 ( ( 4 4 . . 1 0 2 3 5 0 ) )- 10.7 10.3 10.2 9.5 S424 .927 X 2.500 x .150 4158GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox®`)
- p88 K0172X125: compression ratio printed as 112.000 (typo), stored as missing (line: `K0172X125 4.125 1.280 4.000 6.200 9.480 9.500 -9cc 12.900 12.300 112.000 11.700 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- p89 K0172X125: compression ratio printed as 112.000 (typo), stored as missing (line: `K0172X125 4.125 1.280 4.000 6.200 9.480 9.500 -9cc 12.900 12.300 112.000 11.700 S424 .927 X 2.500 x .150 4127GFX 1.2mm-1.2mm-3mm Strutted CS24 Spirolox® RCS41250`)
- PN K427B110 (Chevy Mark IV big block): `bore` differs between p46 (4.61) and p46 (4.6) — catalog inconsistency, first value kept
- PN K427B110 (Chevy Gen VI big block): `bore` differs between p46 (4.61) and p46 (4.6) — catalog inconsistency, first value kept
- PN K427B110 (Chevy Mark IV big block): `bore` differs between p46 (4.61) and p46 (4.6) — catalog inconsistency, first value kept
- PN K427B110 (Chevy Gen VI big block): `bore` differs between p46 (4.61) and p46 (4.6) — catalog inconsistency, first value kept
- PN K496B125 (Chevy Mark IV big block): `ch` differs between p66 (1.25) and p66 (1.12) — catalog inconsistency, first value kept
- PN K496B125 (Chevy Gen VI big block): `ch` differs between p66 (1.25) and p66 (1.12) — catalog inconsistency, first value kept
- PN K496B125 (Chevy Mark IV big block): `ch` differs between p66 (1.25) and p66 (1.12) — catalog inconsistency, first value kept
- PN K496B125 (Chevy Gen VI big block): `ch` differs between p66 (1.25) and p66 (1.12) — catalog inconsistency, first value kept
- PN K496B125 (Chevy Mark IV big block): `ch` differs between p66 (1.25) and p66 (1.12) — catalog inconsistency, first value kept
- PN K496B125 (Chevy Gen VI big block): `ch` differs between p66 (1.25) and p66 (1.12) — catalog inconsistency, first value kept
- PN PTS503AS p98: catalog CID 300 vs computed 350 (4.0 bore x 3.48 stroke x 8) — check row
- PN PTS523A6 p100: catalog CID 347 vs computed 375 (4.06 bore x 3.622 stroke x 8) — check row

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family; numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.

- passed
