# Isky — extraction notes

Extracted 2026-10-17 by `scripts/parts-catalog/extract_isky.py` from the manual PDFs in `Catalogs/` (no network).

## Sources

- `Catalogs\IskyCatalog.pdf`: 186 pp, text layer. The PDF was uploaded to iskycams.com in 2025-08 but its contents are the 2016 edition (copyright line on p5). Cam application pages 72–167, marine cams 168–171, Super-cam / Mega-cam summary tables 68–71, retainers 42–43, lifters 10, 13–15, 17–19, 21–25.
- `Catalogs\ISKY-Valve-Spring-Spec-Book.pdf`: 20 pp, text layer, dated August 2009 (cover). One ruled table per page, up to six springs per page, loads tabulated every 0.050".
- `Catalogs\ISKY-Master-Lobe-List.pdf`: 8 pp of scanned images with no text layer; not parsed (would need OCR).
- `Catalogs\Isky-Import-Catalog.pdf`: 19 pp; not parsed (import makes: BMC, BMW, Datsun, Honda, Jaguar, Mitsubishi, MG, Opel, Porsche/VW, Toyota, Triumph, Volvo; none in the fitment list). Pass --include-import to attempt it.

Records: 831 (cam 566, lifter 107, retainer 31, spring 127)

## How the cam pages were parsed

- Each engine section starts with a 24 pt make name (`CHEVROLET`, `FORD`, `CHRYS-PLYM-DODGE`...); the engine line to its right is the heading (`V-8 265-283-...-400 cu. in. engines (SMALL BLOCK) (1957-87)`). On pages where the engine line is printed elsewhere (p98, p100 style) the first 10–13 pt span naming an engine inside the section is used. Spec rows are anchored on the part-number span in the left column; the row band runs to the next part number. Inside a band the two spec lines are matched with `[RPM-RPM] lift lash adv° .050° [LC°]` (intake, then exhaust); the words between the part number and the numbers are the grind, the bold words on the exhaust line (`HYDRAULIC`, `SOLID`, `ROLLER`, `MECHANICAL`) give the lifter type. The APPLICATION prose column is not stored.
- `spec.type`: HYDRAULIC → hydraulic, SOLID/MECHANICAL → solid; ROLLER (row word, or grind `RR-...`) → roller. Rows with no type word (p118 Gen 6 style) take the section's sidebar words, then the lash (`.000` → hydraulic). Flagged below when the row's type word disagrees with the lash.
- `spec.rr` is the ratio printed in the section's `n:1 Rocker Ratio` banner (the lift column is valve lift at that ratio). Hemi p128 prints `1.57:1 INT.` / `1.52:1 EX.` → `rr`/`rrExh`; Iron Duke p166 prints one ratio for hydraulic & solid and another for roller cams. Sections without a banner (flathead p138, Hemi) have no `rr`.
- `spec.lsa` is the catalog's `Lobe Center` column (Isky uses the term for the lobe separation angle; no intake centerline is printed). `spec.lash` is the intake lash (hot); `lashExh` only when different. `spec.grind` is the Grind No./Type cell (`256-SUPERCAM`, `RR-640/56-60`, `262/270 HL`).
- Dual part-number columns (Chrysler B three-bolt/single-bolt p124–127, Ford V6 by year p132/134, flathead 21-A/8-BA p138, Iron Duke p166) give one record per part number with the column label in `fit.notes`.
- Kits: the facing odd page's `Recommended Valve Train Components` table is read by word position: the `P. nn` page references under each header give the column anchors and the header words give the kind (lifters, pushrods, springs, shims, retainers, poly locks / rocker studs / rocker arms, timing set, valve locks, valve seals, spring locators, rev kit, thrust bumper, lock plate, distributor gear). Kit rows are paired with the spec rows by order when the row counts agree, otherwise by part-number suffix (`201256` ↔ `200256`); mismatches are flagged. `spec.kitPn` = Cam & Complete Kit P/N, `spec.camLifterKitPn` = the CL- kit, `spec.kit` = the component part numbers (footnote letters stripped).
- `fit.ci` = the displacements in the section heading, `fit.y0/y1` its year range, `fit.cyl` from `V-8` / `6-Cyl` / `4 Cyl`. Family mapping is by make + heading keywords (see `families_for`); headings outside the fitment list keep the catalog's words and are listed below. The 2016 catalog has an LS-1 hydraulic roller section (p96, 1.7:1) → `GM LS`; no Ford Modular.
- The same part number printed in two sections of one family (e.g. 135125 for AMC 304/360 and 290-401, 201271 on p90 and p98, marine listings) is one record: the first listing's specs are kept and `spec.applications` lists every page/section with its RPM range and kit; differing durations/lift are flagged.
- Summary tables: p71 Mega-cams (cam-only PN + Cam & Kit PN) and p68–69 Super-cams (single and dual pattern, with lifter and timing-set PNs) were read as a supplement: 114 rows; they add `kitPn`/kit lifters to engine-page records and create records only for part numbers that have no engine-page listing (flagged in `fit.notes`).
- Material (`cast iron` / `steel billet`) and `series: oval track` come from the section sidebar when printed.
- Known kit-cell quirks left as printed: Buick pages 75/77/81 print pushrods with year qualifiers (`233 (1970 & UP) 1193-A (1968-69)`, `1033-A (CI)`); the Chrysler B kit pages 125/127 have a floating `TIMING SET three bolt / single bolt 1613 / 1623` block stored as `kit.timingSetByBoltPattern`; marine kit pages 169/171 (vertical lists) and the 409 (p83), Pinto (p131 first table), Y-block, 240-300 six and International kit tables are only partly or not readable, so those cams have no `kit`.
- Spring spec book pp 16–19 use a different (kit) layout and were not parsed (`1005-W/206-G`, `VWE-005`, `455/456`, `JA-005`... columns); the kit springs `625/626`, `1005-W`, `206-G`, `185-G`, `805-D` therefore have no spring record. Red Zone EZ-Roll variants on p21/p25 whose base part number is spelled differently (`372EZJR`, `376180904EZMAX`...) and three HPx Gold rows on p14 have no readable application and are `Universal`.

## Springs

- Spring spec book pp 3–20: 90 columns (one spring each). `od`/`id` = O.D./I.D. Outer, `idInner`, `installedHt`, `maxLift` = Max Net Valve Lift (first value when two are printed, note kept), `rate`, `coilBind`, `type` (single/dual/triple), `dual`, `damper`, `colorCode`, `material`, `loads` = the load table keyed by height (string keys), `retainers` = the retainer / seat-cup / locator part numbers listed under the spring with their row label.
- `seatLb` = tabulated load at the installed height; `openLb` = load at installed height − max net lift (exact table value when that height is tabulated, otherwise linear interpolation between the two neighbouring 0.050" rows; `openLbNote`/`seatLbNote` say which).
- The spec book gives no engine fitment. A spring's `fit.fam` is the set of families of the cams whose kits recommend it (one record per family); springs no kit references are `Universal`.
- The main catalog's spring pages 27–41 are prose and kit blurbs (LS-1 beehives 165-A/195-A/4905, Honda kits...) and were not parsed; the spec book covers the catalog springs.

## Retainers and lifters

- Retainers pp 42–43: rows `PN | stem | spring application | inner/outer step dia | 7° lock | Super-7 lock`. `spec.stem` as a decimal (5/16, 11/32, 3/8; `ALL` → `stemNote`), `lockAngle` 7 or 10 (`/10 DEG`), `innerStepDia`/`outerStepDia`/`midStepDia`, `locks`, `fitsSprings` (the spring part numbers in the application cell). The small gram-weight table at the bottom of p42 is not parsed.
- Lifters: p10 flat tappets (`202-HY`, `222-HY`, `392-HY`, `432-HY`, `3912-HY`, `3912-A-HY`, `692-HY`, solids `202-H`, `3102-H`, `382-H`, special-oiling `SO 202H`/`SO 382H`) with families from the description; p13–14 HPx hydraulic rollers (application, pushrod, max seat/open load, RPM limit); p15 Durathon solid rollers; p17–19 Red Zone solid rollers and p21–25 their EZ-Roll X / EZ-Roll Max variants (`bodyDia`, `rollerDia`, body type, pushrod, length, rev kit; application from the page's left-hand label block or from the base part number on p17–19). Harley `100EZR/200EZR/300EZR` (p14) are not automotive and were left out.

## Families not in the fitment list (need a decision)

- `Buick 215/300/340 V8 (1961-67)` (4 records)
- `Buick V6 198-225 (1962-71)` (2 records)
- `Chevy 153 inline-4` (9 records)
- `Chevy 60-degree V6 2.8/3.1` (4 records)
- `Chevy 90-degree V6 200/229` (8 records)
- `Chevy 90-degree V6 4.3` (6 records)
- `Chevy Corvair flat-6` (5 records)
- `Ford 144-200 inline-6` (6 records)
- `Ford 2.0 OHC (Pinto)` (4 records)
- `Ford 2.3 OHC (Lima)` (6 records)
- `Ford 250 inline-6` (4 records)
- `Ford Cologne V6 2.6/2.8` (5 records)
- `Ford Essex V6 3.8` (7 records)
- `Ford Y-block V8` (5 records)
- `Ford flathead V8` (11 records)
- `International Harvester V8 304/345/392` (4 records)
- `Olds/Buick 215 aluminum V8` (4 records)
- `Pontiac Iron Duke 151` (17 records)

## Rows per family

| cat | family | records |
|---|---|---|
| cam | AMC V8 | 5 |
| cam | AMC/Jeep inline-6 | 6 |
| cam | Buick 215/300/340 V8 (1961-67) | 4 |
| cam | Buick 350 | 4 |
| cam | Buick V6 181-252 | 12 |
| cam | Buick V6 198-225 (1962-71) | 2 |
| cam | Buick big block | 4 |
| cam | Chevy 153 inline-4 | 6 |
| cam | Chevy 60-degree V6 2.8/3.1 | 3 |
| cam | Chevy 90-degree V6 200/229 | 5 |
| cam | Chevy 90-degree V6 4.3 | 5 |
| cam | Chevy Corvair flat-6 | 4 |
| cam | Chevy Gen VI big block | 5 |
| cam | Chevy Mark IV big block | 62 |
| cam | Chevy W-series 348/409 | 3 |
| cam | Chevy inline-6 | 16 |
| cam | Chrysler 426 Hemi | 8 |
| cam | Ford 144-200 inline-6 | 5 |
| cam | Ford 2.0 OHC (Pinto) | 3 |
| cam | Ford 2.3 OHC (Lima) | 5 |
| cam | Ford 240/300 inline-6 | 5 |
| cam | Ford 250 inline-6 | 4 |
| cam | Ford 351C/351M/400 | 21 |
| cam | Ford 429/460 | 24 |
| cam | Ford Cologne V6 2.6/2.8 | 4 |
| cam | Ford Essex V6 3.8 | 6 |
| cam | Ford FE | 14 |
| cam | Ford Y-block V8 | 4 |
| cam | Ford flathead V8 | 10 |
| cam | GM LS | 4 |
| cam | International Harvester V8 304/345/392 | 4 |
| cam | Mopar B/RB big block | 46 |
| cam | Mopar LA small block | 24 |
| cam | Olds/Buick 215 aluminum V8 | 4 |
| cam | Oldsmobile V8 | 13 |
| cam | Pontiac Iron Duke 151 | 14 |
| cam | Pontiac V8 | 22 |
| cam | Small-block Chevy | 130 |
| cam | Small-block Ford (Windsor) | 46 |
| lifter | Chevy 90-degree V6 200/229 | 1 |
| lifter | Chevy Mark IV big block | 6 |
| lifter | Chevy W-series 348/409 | 1 |
| lifter | Chevy inline-6 | 1 |
| lifter | Chrysler 426 Hemi | 1 |
| lifter | Ford 144-200 inline-6 | 1 |
| lifter | Ford 240/300 inline-6 | 1 |
| lifter | Ford 351C/351M/400 | 2 |
| lifter | Ford 429/460 | 3 |
| lifter | Ford FE | 2 |
| lifter | GM LS | 1 |
| lifter | Mopar B/RB big block | 2 |
| lifter | Mopar LA small block | 2 |
| lifter | Oldsmobile V8 | 2 |
| lifter | Pontiac V8 | 3 |
| lifter | Small-block Chevy | 57 |
| lifter | Small-block Ford (Windsor) | 4 |
| lifter | Universal | 17 |
| retainer | Universal | 31 |
| spring | AMC V8 | 1 |
| spring | AMC/Jeep inline-6 | 1 |
| spring | Buick big block | 1 |
| spring | Chevy 153 inline-4 | 3 |
| spring | Chevy 60-degree V6 2.8/3.1 | 1 |
| spring | Chevy 90-degree V6 200/229 | 2 |
| spring | Chevy 90-degree V6 4.3 | 1 |
| spring | Chevy Corvair flat-6 | 1 |
| spring | Chevy Gen VI big block | 2 |
| spring | Chevy Mark IV big block | 7 |
| spring | Chevy inline-6 | 2 |
| spring | Chrysler 426 Hemi | 2 |
| spring | Ford 2.0 OHC (Pinto) | 1 |
| spring | Ford 2.3 OHC (Lima) | 1 |
| spring | Ford 240/300 inline-6 | 1 |
| spring | Ford 351C/351M/400 | 3 |
| spring | Ford 429/460 | 3 |
| spring | Ford Cologne V6 2.6/2.8 | 1 |
| spring | Ford Essex V6 3.8 | 1 |
| spring | Ford FE | 1 |
| spring | Ford Y-block V8 | 1 |
| spring | Ford flathead V8 | 1 |
| spring | GM LS | 1 |
| spring | Mopar B/RB big block | 2 |
| spring | Mopar LA small block | 1 |
| spring | Oldsmobile V8 | 1 |
| spring | Pontiac Iron Duke 151 | 3 |
| spring | Pontiac V8 | 2 |
| spring | Small-block Chevy | 6 |
| spring | Small-block Ford (Windsor) | 4 |
| spring | Universal | 69 |

## Cam sections

| page | make | heading | rr | rows | kit rows matched |
|---|---|---|---|---|---|
| 72 | AMERICAN MOTORS | V-8 1966-and up 304 Jeep and 360 cu. in. engines only | 1.6 | 5 | 5 |
| 72 | AMERICAN MOTORS | V-8 1966-and up 290-343-390-401 cu. in. engines | 1.6 | 5 | 5 |
| 74 | AMERICAN MOTORS | 6-CYLINDER 199-232-258 cu. in. engines | 1.6 | 6 | 6 |
| 74 | BUICK SPECIAL | 300-340 cu.in. Cast Iron Engines V-8 1961-67 215 cu. in Aluminum Engin | 1.6 | 4 | 4 |
| 76 | BUICK | V-8 1968-and up 350 cu. in. engines (1977-and up # BUICK 350 ) | 1.6 | 4 | 4 |
| 76 | BUICK | V-6 1962-71 198-225 cu. in. engines (Also AMC Jeep V-6 1965-71) | 1.6 | 2 | 2 |
| 78 | BUICK | V-6 1975-77 231 cu. in. “ODD FIRE” Engines Only | 1.6 | 5 | 5 |
| 78 | BUICK | V-6 1978 and UP 196-231-252 cu. in. “EVEN FIRING” Engines | 1.6 | 5 | 5 |
| 80 | BUICK | V-8 1967-and up 400-430-455 cu. in. Engines | 1.6 | 4 | 4 |
| 80 | CORVAIR |  | 1.5 | 4 | 4 |
| 82 | CHEVY II | 1962-71 4 Cylinder 153 cu. in. Engines | 1.75 | 6 | 6 |
| 82 | CHEVROLET | 409 cu. in. V-8 (1958-65) | 1.7 | 3 | 0 |
| 84 | CHEVY II | 6 Cylinder 194-230-250 cu. in. Engines | 1.75 | 10 | 10 |
| 86 | CHEVROLET | # SEE FOOT NOTE 6-Cylinder 1963 and up 292 Truck Engines BELOW, 1971 & | 1.75 | 6 | 6 |
| 86 | CHEVROLET | 60° — V6 1980-UP • 173 cu. in. engines (2.8L) & (3.IL) | 1.5 | 3 | 3 |
| 88 | CHEVROLET | 90° — V-6 1978 and Up • 200-229 cu. in. (3.8L) Odd-Fire | 1.5 | 5 | 5 |
| 88 | CHEVROLET | 90° — V6 1985-86 • 4.3L (262 cu. in.) | 1.5 | 5 | 5 |
| 90 | CHEVROLET | V-8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (195 | 1.5 | 14 | 14 |
| 92 | CHEVROLET | V-8 265-283-302-307-327-350-400 cu. in. engines (SMALL BLOCK) (1957-87 | 1.5 | 13 | 13 |
| 94 | CHEVROLET | HYDRAULIC ROLLER CAMSHAFTS– DEEP HARDENED STEEL BILLET V-8 265-283-302 | 1.5 | 5 | 5 |
| 94 | CHEVROLET | HYDRAULIC ROLLER CAMSHAFTS– DEEP HARDENED STEEL BILLET V-8 305-350 cu. | 1.5 | 5 | 5 |
| 96 | CHEVROLET | HYDRAULIC ROLLER CAMSHAFTS– DEEP HARDENED STEEL BILLET V-8 305-350 cu. | 1.5 | 5 | 5 |
| 96 | CHEVROLET | HYDRAULIC ROLLER CAMSHAFTS– DEEP HARDENED STEEL BILLET V-8 350 cu. in. | 1.7 | 4 | 4 |
| 98 | CHEVROLET | V-8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (195 |  | 19 | 19 |
| 100 | CHEVROLET | V-8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (195 | 1.5 | 13 | 13 |
| 102 | CHEVROLET | V-8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (195 | 1.5 | 13 | 13 |
| 104 | CHEVROLET | V-8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (195 | 1.5 | 14 | 14 |
| 106 | CHEVROLET | V-8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (195 | 1.5 | 12 | 12 |
| 108 | CHEVROLET | V-8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (195 | 1.5 | 11 | 11 |
| 110 | CHEVROLET | V-8 396-402-427-454 (1967-95) cu. in. engines (BIG BLOCK) | 1.75 | 14 | 14 |
| 112 | CHEVROLET | V-8 396-402-427-454 (1967-95) cu. in. engines (BIG BLOCK) | 1.75 | 11 | 11 |
| 114 | CHEVROLET | V-8 396-402-427-454 cu. in. engines Big Block V-8 (1967-95) | 1.75 | 14 | 14 |
| 116 | CHEVROLET | V-8 396-402-427-454 cu. in. engines Big Block V-8 (1967-95) | 1.75 | 14 | 14 |
| 118 | CHEVROLET | V-8 396-402-427-454 cu. in. engines Big Block V-8 (1967-95) | 1.7 | 5 | 5 |
| 118 | CHEVROLET | V-8 1996-UP 454-502 cu. in. Gen 6 Big Block | 1.7 | 5 | 5 |
| 120 | CHRYS-PLYM-DODGE | V-8 1964-Up 273-340-360 cu. in. engines “A” ENGINE 318 cu. in. 1967 &  | 1.5 | 14 | 11 |
| 122 | CHRYS-PLYM | 318 cu. in. 1967 and Up MOPAR-DART-VALIANT-CUDA V-8 1964 and up 273-34 | 1.5 | 11 | 11 |
| 124 | CHRYSLER | Specify “Single Bolt” or “Three Bolt” Cam. Low Block 350-361-383 c.i.  | 1.5 | 13 | 13 |
| 126 | CHRYSLER | Specify “Single Bolt” or “Three Bolt” Cam. Low Block 350-361-383 c.i.  | 1.5 | 14 | 14 |
| 128 | MOPAR | 426 HEMI/KEITH BLACK ALUMINUM/MILODON 7 LITRE/JP-1 | 1.57/1.52 | 8 | 8 |
| 130 | FORD | 4 CYL. PINTO—CAPRI 1971-73 2000cc OHC Engines | 1.6 | 3 | 3 |
| 130 | FORD | MUSTANG-PINTO-CAPRI 4 CYL. 1974-87 2300cc OHC Engines | 1.6 | 5 | 5 |
| 132 | FORD FALCON - COMET | 6-CYLINDER OHV 144-170-200 cu. in Engines | 1.6 | 5 | 5 |
| 132 | FORD V6 | 1972-UP V6 Engines 2600cc — 2800cc | 1.6 | 2 | 2 |
| 134 | FORD V6 | 3.8L (232 cu. in.) 1982-87 | 1.6 | 3 | 3 |
| 134 | FORD - MERC - T-BIRD | (Y - BLOCK) V-8 272-292-312 cu. in. Engines | 1.5 | 4 | 4 |
| 136 | FORD | (Standard Gear-Drive from Factory) 6-CYLINDER 1965-and up OHV 240-300  | 1.6 | 5 | 5 |
| 136 | FORD | FALCON • MUSTANG • MAVERICK 6 Cyl. 250 cu. in Engines | 1.6 | 4 | 3 |
| 138 | FORD - MERCURY | V-8 1932-53 FLATHEAD |  | 5 | 5 |
| 140 | FORD | CLEVELAND 351-400 & 351M-400M, BOSS-351 | 1.75 | 14 | 14 |
| 142 | FORD | V-8 BOSS-351 Engine only | 1.75 | 7 | 7 |
| 144 | FORD BOSS | 302 V-8 | 1.75 | 11 | 11 |
| 146 | FORD | V-8 221-260-289-302 cu. in. engines | 1.6 | 12 | 10 |
| 148 | FORD | V-8 221-260-289-302 cu. in. engines | 1.6 | 13 | 13 |
| 150 | FORD | V-8 1969-UP 351- WINDSOR | 1.6/1.6 | 10 | 10 |
| 152 | FORD | V-8 352-360-361-390-406-427-428 cu. in. engines (1963 & up) | 1.75 | 14 | 14 |
| 154 | FORD | V-8 1968 and up 370-429-460 cu. in. (WEDGE ENGINES ONLY) | 1.75 | 14 | 14 |
| 156 | FORD | V-8 1968 and up 370-429-460 cu. in. (WEDGE ENGINES ONLY) | 1.75 | 8 | 8 |
| 158 | INTERNATIONAL | V-8 304-345-392 cu. in. engines | 1.6 | 4 | 0 |
| 158 | OLDSMOBILE F-85 | V-8 1961-63 Aluminum 215 cu. in. engines (Pontiac 1961-62) | 1.6 | 4 | 4 |
| 160 | OLDSMOBILE | see page 157 for ordering information on 1964-66 engines V-8 1967 and  | 1.6 | 12 | 11 |
| 162 | PONTIAC | (EXCEPT RAM AIR V ENGINES) V-8 1955 and up 265-287-301-350-389-421-428 | 1.5 | 12 | 12 |
| 164 | PONTIAC | (EXCEPT RAM AIR V ENGINES) V-8 1955 and up 265-287-301-350-389-421-428 | 1.5 | 10 | 10 |
| 166 | PONTIAC | 4 cyl. Super Duty 151 cu. in. “IRON DUKE,” 1979 and up ( HYDRAULIC & S | 1.7/1.55 | 14 | 14 |
| 168 | MARINE | Big Block Chevy V-8 | 1.75 | 12 | 0 |
| 170 | MARINE | Small Block Chevy V-8 | 1.5 | 5 | 0 |
| 170 | MARINE | Ford 429/460 C.I. V-8 | 1.75 | 2 | 0 |
| 170 | MARINE | Oldsmobile 455 C.I. V-8 | 1.6 | 1 | 0 |
| 70 | CHEVROLET | V8 265-283-302-305-307-327-350-400 cu. in. engines (SMALL BLOCK) (1957 | 1.5 | 6 | 0 |

## Cam spec coverage

566 cam records: durAdvInt 566, dur050Int 564, dur050Exh 559, valveLiftInt 566, valveLiftExh 561, lsa 562, lash 566, rr 556, rpmLow 551, type 566, grind 555, kitPn 525, kit 537

## Rows skipped

- none

## Needs human QA

- p82/83: 2 spec sections vs 1 kit sections; paired by make name
- p86 CHEVROLET 291462: only one spec line (intake) found; exhaust values left empty
- p88 CHEVROLET 131252: more than two spec lines in the row band; extra line ignored
- p88 CHEVROLET 131252/257: only one spec line (intake) found; exhaust values left empty
- p102/103 CHEVROLET: 13 cam rows vs 14 kit rows; matched 13 by part-number suffix
- p110 CHEVROLET 396286: only one spec line (intake) found; exhaust values left empty
- p120/121 CHRYS-PLYM-DODGE: 14 cam rows vs 12 kit rows; matched 11 by part-number suffix
- p136/137 FORD: 4 cam rows vs 3 kit rows; matched 3 by part-number suffix
- p146/147 FORD: 12 cam rows vs 13 kit rows; matched 10 by part-number suffix
- p158/159: 2 spec sections vs 1 kit sections; paired by make name
- p160/161 OLDSMOBILE: 12 cam rows vs 14 kit rows; matched 11 by part-number suffix
- p162/163 PONTIAC: 12 cam rows vs 14 kit rows; matched 12 by part-number suffix
- p164/165 PONTIAC: 10 cam rows vs 11 kit rows; matched 10 by part-number suffix
- p168 Big Block Chevy V-8 396281/292-14: only one spec line (intake) found; exhaust values left empty
- p168 Big Block Chevy V-8 396281/292-14: unparsed tokens before the spec numbers: ° 232° 114°
- p170 Small Block Chevy V-8 201042: only one spec line (intake) found; exhaust values left empty
- p170 Small Block Chevy V-8 201042: unparsed tokens before the spec numbers: ° 254° 110°
- p70: rocker ratio not printed on the page; 1.5:1 taken from the small-block Chevy section pages
- p150 FORD: several rocker ratios printed ([1.6, 1.6]); first used
- p166 PONTIAC: several rocker ratios printed ([1.7, 1.55]); first used
- 396271/281-14 (Chevy Mark IV big block): listed on p110 and p168 with different valveLiftInt (0.542 vs 0.543); first kept
- spring book p16: no 'Part No.' row; page skipped
- spring book p17: 'Coil Bind' row not where expected
- spring book p18: no 'Part No.' row; page skipped
- spring book p19: 'Coil Bind' row not where expected
- kit spring '625/626' not found in the spring spec book
- kit spring '1974' not found in the spring spec book
- kit spring '3402' not found in the spring spec book
- kit spring '1005-W' not found in the spring spec book
- kit spring '206-G' not found in the spring spec book
- kit spring '185-G' not found in the spring spec book
- kit spring '805-D' not found in the spring spec book
- p14 lifter 2075-HYRT: application column not read; family Universal
- p14 lifter 2078-HYRT: application column not read; family Universal
- p14 lifter 3975-HYRT: application column not read; family Universal
- p21 lifter 372EZJR: application label not found; family Universal
- p25 lifter 376180904EZMAX: application label not found; family Universal
- p25 lifter 376180937EZMAX: application label not found; family Universal
- p25 lifter 3772LO180EZMAX: application label not found; family Universal
- p25 lifter 3672RHEZMAX: application label not found; family Universal
- p25 lifter 3672RHMEZMAX: application label not found; family Universal
- p25 lifter 3972Y180/904EZMAX: application label not found; family Universal
- p25 lifter 3972Y180/937EZMAX: application label not found; family Universal
- p25 lifter 3172RH/904EZMAX: application label not found; family Universal
- p25 lifter 3172Y180/904EZMAX: application label not found; family Universal
- p25 lifter 3172Y180/937EZMAX: application label not found; family Universal

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a category and family; numeric spec fields are numbers (inches as decimals); no empty strings.

- passed
