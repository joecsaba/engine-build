# Edelbrock — extraction notes

Extracted 2026-10-16 by `scripts/parts-catalog/extract_edelbrock.py`.

## What was fetched

One document: `https://edelbrock-files-v1.s3-us-west-1.amazonaws.com/catalogs/2025-Edelbrock-Catalog.pdf` (220 pages, 30 MB), downloaded once into `dl/edelbrock/` (gitignored) with UA `engine-build.com catalog research (contact: joecsaba@gmail.com)`. No edelbrock.com page was requested (the Edelbrock Group rule is PDFs on the S3 bucket only). The bucket has no `robots.txt` object (S3 answers 403 AccessDenied for it, which is not a crawl rule); the one PDF request is well inside the 6 s spacing. `--offline` re-parses the cached PDF without the network.

Requests made to the bucket in total: 2 (`robots.txt` → 403 AccessDenied, then the PDF → 200, 30,184,963 bytes), both during the first inspection with curl and the same UA; the extractor reuses that download. Log of this run:

- offline: parsed the cached PDF in dl/edelbrock/

Pages used (PDF page numbers; the printed page number is one less):

- cylinder heads: 90–109 (spec tables + companion part tables); 110 valve-spring table; 111 flow data @ 28" H2O
- intake manifolds: 30–77 and the flathead manifolds on 100; installation items (78–81), power packs / manifold+carb kits (114–121) and EFI systems (144–159) are kits or accessories and were not extracted
- the flow-data web page was not fetched (terms forbid robots); the catalog PDF carries the same flow table on p111 and the same spring table on p110, so `dl/edelbrock/flow-data.html` is not needed and was not looked for

## Records

| cat | records |
|---|---|
| head | 168 |
| intake | 321 |
| spring | 28 |
| **total** | 517 |

### Records per family

| cat | family | records |
|---|---|---|
| head | Small-block Chevy | 24 |
| head | Chevy Gen VI big block | 18 |
| head | Chevy Mark IV big block | 18 |
| head | GM LS | 17 |
| head | Small-block Ford (Windsor) | 17 |
| head | Pontiac V8 | 14 |
| head | Mopar B/RB big block | 10 |
| head | Ford 429/460 | 6 |
| head | Chrysler Gen III Hemi 5.7/6.1 | 5 |
| head | Ford FE | 5 |
| head | Chrysler 426 Hemi | 4 |
| head | Ford Flathead V8 | 4 |
| head | GM LT (Gen V) | 4 |
| head | Mopar LA small block | 4 |
| head | Oldsmobile V8 | 4 |
| head | Chrysler Gen III Hemi 6.2/6.4 | 3 |
| head | AMC V8 | 2 |
| head | AMC/Jeep inline-6 | 2 |
| head | Chevy W-series 348/409 | 2 |
| head | Ford 351C/351M/400 | 2 |
| head | Mopar Magnum 5.2/5.9 | 2 |
| head | Buick big block | 1 |
| intake | Small-block Chevy | 77 |
| intake | Small-block Ford (Windsor) | 44 |
| intake | Chevy Mark IV big block | 42 |
| intake | Chevy Gen VI big block | 31 |
| intake | GM LS | 31 |
| intake | Mopar B/RB big block | 16 |
| intake | Mopar LA small block | 12 |
| intake | Pontiac V8 | 10 |
| intake | Chevy W-series 348/409 | 7 |
| intake | Ford 429/460 | 7 |
| intake | Ford FE | 7 |
| intake | Oldsmobile V8 | 7 |
| intake | Ford 351C/351M/400 | 6 |
| intake | AMC V8 | 4 |
| intake | Chevy 90° V6 200/229/262 | 4 |
| intake | Ford Flathead V8 | 3 |
| intake | Buick big block | 2 |
| intake | Chevy 60° V6 2.8/3.1 | 2 |
| intake | Chrysler 426 Hemi | 2 |
| intake | Ford Modular | 2 |
| intake | Buick V6 181-252 | 1 |
| intake | Cadillac 368-500 | 1 |
| intake | Chrysler Gen III Hemi 5.7/6.1 | 1 |
| intake | Ford Godzilla 7.3 | 1 |
| intake | Mopar Magnum 5.2/5.9 | 1 |
| spring | Small-block Chevy | 5 |
| spring | Small-block Ford (Windsor) | 5 |
| spring | Chevy Gen VI big block | 2 |
| spring | Chevy Mark IV big block | 2 |
| spring | Ford 351C/351M/400 | 2 |
| spring | Ford FE | 2 |
| spring | Mopar LA small block | 2 |
| spring | Oldsmobile V8 | 2 |
| spring | Pontiac V8 | 2 |
| spring | AMC V8 | 1 |
| spring | Buick big block | 1 |
| spring | Ford 429/460 | 1 |
| spring | Mopar B/RB big block | 1 |

### Rows per page

| PDF page | heads | intakes |
|---|---|---|
| 30 | 0 | 4 |
| 31 | 0 | 3 |
| 32 | 0 | 7 |
| 33 | 0 | 13 |
| 34 | 0 | 7 |
| 35 | 0 | 13 |
| 36 | 0 | 6 |
| 37 | 0 | 5 |
| 38 | 0 | 9 |
| 39 | 0 | 4 |
| 40 | 0 | 4 |
| 41 | 0 | 8 |
| 42 | 0 | 8 |
| 43 | 0 | 13 |
| 44 | 0 | 5 |
| 45 | 0 | 5 |
| 46 | 0 | 8 |
| 47 | 0 | 7 |
| 48 | 0 | 6 |
| 49 | 0 | 15 |
| 50 | 0 | 16 |
| 51 | 0 | 4 |
| 52 | 0 | 26 |
| 53 | 0 | 6 |
| 54 | 0 | 8 |
| 55 | 0 | 5 |
| 56 | 0 | 4 |
| 57 | 0 | 6 |
| 58 | 0 | 6 |
| 59 | 0 | 3 |
| 60 | 0 | 3 |
| 61 | 0 | 11 |
| 62 | 0 | 7 |
| 63 | 0 | 5 |
| 64 | 0 | 4 |
| 65 | 0 | 4 |
| 66 | 0 | 8 |
| 67 | 0 | 4 |
| 68 | 0 | 7 |
| 69 | 0 | 7 |
| 70 | 0 | 5 |
| 71 | 0 | 5 |
| 74 | 0 | 4 |
| 75 | 0 | 3 |
| 76 | 0 | 8 |
| 77 | 0 | 2 |
| 90 | 2 | 0 |
| 91 | 1 | 0 |
| 92 | 24 | 0 |
| 94 | 10 | 0 |
| 95 | 11 | 0 |
| 96 | 28 | 0 |
| 97 | 10 | 0 |
| 98 | 16 | 0 |
| 99 | 12 | 0 |
| 100 | 4 | 0 |
| 101 | 17 | 0 |
| 102 | 2 | 0 |
| 104 | 6 | 0 |
| 105 | 5 | 0 |
| 106 | 2 | 0 |
| 107 | 4 | 0 |
| 108 | 14 | 0 |

## Heads

- Spec tables are ruled; pdfplumber's `lines` strategy returns one row per catalog row. Columns are read from the two-row header (`Port Volume | Intake/Exhaust`, `Valve Sizes | Intake/Exhaust`, part-number columns `Complete (Single)`, `Complete | Pair`, `Bare (Single) | No Valves / With Valves`, `Single | Complete/Bare`...). Every non-blank part-number cell becomes one record: `spec.bare` (bare casting), `spec.bareWithValves`, `spec.per` (2 = sold as a pair; also for LS part numbers marked `*` = `* Sold in Pairs`).
- `spec`: `chamberCc`, `intakeRunnerCc`, `exhaustRunnerCc`, `intakeValve`, `exhaustValve` (inches), `maxLift`, `springDia`, `hpRange` (as printed) with `hpLow`/`hpHigh`, `camType` (`Flat Tappet` → `hydraulic_flat`, `Hyd. Roller` → `hydraulic_roller`, `Mech./Solid Roller` → `solid_roller`; the catalog's camshaft type is the valve-spring package the complete head ships with, so bare castings keep the row's value only as printed), `intakeFlange` (Standard/Vortec), `exhaustPortLocation` (Standard, +.125", Raised, Eagle...), `plugType` (Straight/Angled), `installNoteCodes` + `installNotes` (the page's `(A) Deck thickness...` lines), `emissionsCodes` (decoded icons, see below).
- `spec.related`: the page's companion table (`Head Part No. | Head Bolts | Head Gasket | Intake Gasket | Exhaust Gasket | Valve Cover Gasket | Pushrods | Valves | Springs | Retainers | Spark Plug`) matched by head part number; values are kept as printed (`Call Tech`, `See Instructions`, `8596 (Gen III) 8595 (Gen IV)`).
- `spec.flow`: p111 table, `[{lift, int, exh}]` cfm @ 28" (`flowDepression: 28`). The page notes that hydraulic-roller heads flow the same as the flat-tappet version, so a head without its own flow row takes the flow of the same product on the same page with identical chamber/port/valve sizes and records `flowSource` = that part number.
- `spec.spring`: p110 table keyed by head part number: `installedHt`, `seatLb` (load at installed height; `seatLbAt` when the quoted height differs), `openHt`/`openLb`, `coilBind`, `maxRpm` (`maxRpmNote` when the row gives one figure for Performer cams and one for Performer RPM cams).
- The same bare casting is listed on several rows (e.g. SBF 77169 under three Victor Jr. 20° rows); it is emitted once from its first row.
- Families from the uppercase section row of each table (`CHEVROLET 262-400 V8`, `LS3 (GEN III & IV) V8`, `383-440 V8 BIG-BLOCK`...), kept in `fit.notes`. 396-502 / big-block race heads are emitted for both Chevy big-block families; Gen III Hemi heads for the 5.7/6.1 and/or 6.2/6.4 family per the product name; Performer RPM Magnum heads under `Mopar Magnum 5.2/5.9`; p99's first table has no section row (page text: `426-572 GEN II HEMI V8`).
- `emissions` is `null` for heads (internal part); the catalog icon is kept in `spec.emissionsCodes`.

## Springs

- One `spring` record per spring part number named in a companion table's `Springs` column, with the p110 numbers of the heads that use it (`od` = the heads' valve spring diameter when they agree, `installedHt`, `seatLb`, `openHt`/`openLb`, `coilBind`, `maxRpm`, computed `maxLift` = installed height − coil bind − 0.050, `heads` = head part numbers). One record per family of those heads (`fit.notes` lists the head part numbers). Heads whose companion row lists two springs (`5823, 5745`) do not contribute.

## Intakes

- Tables are ruled; one record per part-number cell. Finish columns (`Satin | Polished | Black Powder | Chrome Plasma | Black Plasma`) give `spec.finish` and `spec.variantOf` (the satin part number) on the variants.
- `spec.type` from the product line: Performer / Performer RPM / Air-Gap / C-26 / CH- → `dual-plane`; Torker II, Victor, Victor Jr., Super Victor, Glidden, C-357 and the flathead 4-barrel/Triple Deuce/Slingshot → `single-plane`; Street Tunnel Ram, Victor Ram, Victor Tunnel Ram, Cross-Ram → `tunnel-ram`; Pro-Flo XT, EFI, T.B.I., XTS → `efi`. `spec.carbFlange` from the Mount column (`Sq. Bore`/`4150`/`EPS/AVS2` → square; `Q-Jet`/`TQ` → spread; `4500` → dominator; throttle bodies → throttle-body; `Universal` = fits square- and spread-bore carbs, kept as `universal`); `carbMount` keeps the printed value.
- `rpmLow`/`rpmHigh` from `RPM Range` (`Idle` → 0); `heightFront` (A), `heightRear` (B), `dimC/D/E` (Pro-Flo and cross-ram measurement letters, E is an angle in degrees), `heightOverall`, `carbPadHeight`, `boltToRoof`/`boltToFloor`, `portWidth`/`portHeight`, `carbAngle` (degrees), `portExitW` × `portExitH` (or `portExitCatalog` when not `w x h`), `egr` (from `(EGR)` / `non-EGR` in the product name), `carbs` (dual-quad = 2), `catalogProduct`/`catalogMake`/`catalogEngine` as printed.
- `fit`: `ci` = the 3-digit displacements in the Engine cell; `y0`/`y1` from the Year cell (`1979-Later` → y0 only, `Early-1975` → y1 only, kept in `fit.notes`). Big-block Chevy manifolds whose catalog years end by 1990 are `Chevy Mark IV big block` only; the rest are emitted for both big-block families.
- Import makes (Holden, Honda/Acura B-series, Rover 215) are held back, listed below. Fuel-rail kits, gaskets, linkages, valley covers, spacers, brackets and other accessory rows are skipped (listed below).
- `emissions`: the catalog prints coloured icons (ZapfDingbats circles) whose colours match the page-footer legend (green 50-state legal, purple EPA legal, red racing only, blue pre-pollution controlled vehicles, black stock replacement, yellow engine swap). `spec.emissionsCodes` lists the decoded labels; `emissions` is `carb_eo:unlisted` when the row is 50-state legal (an EO exists but the table does not print its number), `no_eo_race_only` when the only icon is racing-only, `oem_replacement` for stock-replacement-only, otherwise `unknown`.

## Families not in the fitment list (need a decision)

- `Chevy 60° V6 2.8/3.1`
- `Chevy 90° V6 200/229/262`
- `Ford Flathead V8`

## Flow rows with no head record

Part numbers on the p111 flow page that are not in the 2025 head tables (older or discontinued numbers): 60179

## Rows skipped

- p96 60549: same part number already emitted from p96 (bare casting shared by several rows)
- p99 61169: same part number already emitted from p99 (bare casting shared by several rows)
- p99 61189: same part number already emitted from p99 (bare casting shared by several rows)
- p101 77169: same part number already emitted from p101 (bare casting shared by several rows)
- p101 77169: same part number already emitted from p101 (bare casting shared by several rows)
- p105 60059: same part number already emitted from p105 (bare casting shared by several rows)
- p106 61379: held back (import make): Performer RPM
- p106 61389: held back (import make): Performer RPM
- p106 61379: held back (import make): Performer RPM
- p106 61385: held back (import make): Performer RPM
- p108 61569: same part number already emitted from p108 (bare casting shared by several rows)
- p108 60609: same part number already emitted from p108 (bare casting shared by several rows)
- p31 2198: held back (import make): Performer Rover 215 V8 (Non- EGR)
- p32 6942: accessory, not a manifold: Top Gasket (Included with top #3789)
- p36 1033: accessory, not a manifold: Progressive Linkage Kit (for 3-carbs only)
- p37 7097: accessory, not a manifold: Throttle Linkage for Forward Mounted Carbs
- p37 7071: accessory, not a manifold: Throttle Linkage for Sideways Mounted Carbs
- p37 6999: accessory, not a manifold: Gasket (included with base and top)
- p37 3627: accessory, not a manifold: Fuel Rail Kit for Small-Block Chevrolet (compatible with standard or compact injectors)
- p38 6940: accessory, not a manifold: Replacement Carb Base Gaskets for Victor Jr. Sportsman 2V (6 gaskets)
- p39 3630: accessory, not a manifold: Victor E EFI Fuel Rail Kit (compatible with standard or compact injectors)
- p39 7073: accessory, not a manifold: Victor Ram - 2 Standard-Flange, Sideways (top only)
- p39 7071: accessory, not a manifold: Throttle Linkage for Sideways Mounted Carbs
- p39 6988: accessory, not a manifold: Top Gasket (included with top)
- p42 3627: accessory, not a manifold: Fuel Rail Kit for Small-Block Chevrolet (compatible with standard or compact injectors)
- p42 3630: accessory, not a manifold: Victor E EFI Fuel Rail Kit (compatible with standard or compact injectors)
- p43 3629: accessory, not a manifold: Fuel Rail Kit for Pro-Flo XT LS Series Chevrolet (compatible with standard or compact injectors)
- p43 3638: accessory, not a manifold: Victor Jr. LS1 EFI Fuel Rail Kit (standard injectors with stands)
- p44 3638: accessory, not a manifold: Victor Jr. LS1 EFI Fuel Rail Kit (standard injectors with stands)
- p44 3648: accessory, not a manifold: Pro-Flo XT LS3 Fuel Rail Kit
- p45 3654: accessory, not a manifold: Cross-Ram LS3 Fuel Rail Kit (standard injectors, -6 AN ends)
- p45 3638: accessory, not a manifold: Victor Jr. LS1 EFI Fuel Rail Kit (standard injectors with stands)
- p45 7788: accessory, not a manifold: LS1/LS6 Valley Plate
- p46 3655: accessory, not a manifold: Super Victor LS3 EFI Fuel Rail Kit (standard injectors, -8AN ends)
- p46 3649: accessory, not a manifold: Super Victor LS7 EFI Fuel Rail Kit (standard injectors, -8AN ends)
- p50 6989: accessory, not a manifold: Top Gasket fits the #7115 (included with base and top)
- p50 7097: accessory, not a manifold: Throttle Linkage for Forward Mounted Carbs
- p50 3658: accessory, not a manifold: Fuel Rail Kit for Big-Block Chevrolet Rectangular-Port (compatible with standard or compact injectors)
- p50 3633: accessory, not a manifold: Victor Jr. 454-R & 454-O EFI Fuel Rail Kit (standard injectors with stands)
- p51 7086: accessory, not a manifold: Victor Tunnel Ram Top Only for 4500-series carb or throttle body (gasket and hardware)
- p51 3659: accessory, not a manifold: Victor Tunnel Ram Fuel Rail Kit (standard injectors)
- p51 7077: accessory, not a manifold: Side-Mount Throttle Linkage for Big-Block Chevrolet Victor 2-R Manifold
- p51 7355: accessory, not a manifold: Victor Tunnel Ram Base to Top Replacement Gasket (for #7085, #7086, #70855)
- p52 3633: accessory, not a manifold: Super Victor Big-Block Chevy EFI Fuel Rail Kit (standard injectors with stands)
- p55 3641: accessory, not a manifold: Super Victor EFI Fuel Rail Kit (Standard injectors with stands)
- p56 7799: accessory, not a manifold: Valley Cover for B-Series Big-Block Chrysler 383 or 400 Engines (required with Edelbrock Victor Series heads)
- p58 3644: accessory, not a manifold: Fuel Rail Kit for Big-Block Chrysler (compatible with standard or compact injectors)
- p58 7798: accessory, not a manifold: Valley Cover for RB Big-Block Chrysler Engines (413-440) (required w/ Edelbrock Victor Series heads)
- p58 3640: accessory, not a manifold: Victor 440 EFI Fuel Rail Kit (standard injectors with stands)
- p58 7798: accessory, not a manifold: Valley Cover for RB Big-Block Chrysler Engines (413-440) (required w/ Edelbrock Victor Series heads)
- p59 3660: accessory, not a manifold: Victor EFI Fuel Rail Kit (tall 60mm injectors or Edelbrock #3686)
- p59 8079: accessory, not a manifold: Coil Bracket (for use with Gen II HEMI, B and RB)
- p59 3647: accessory, not a manifold: Victor II EFI Fuel Rail Kit
- p60 8700: accessory, not a manifold: Slingshot Manifold Gasket (located between manifold top and bottom pieces)
- p60 1106: accessory, not a manifold: Carb Adapter Flange
- p60 1144: accessory, not a manifold: Generator Bracket (straight)
- p60 1145: accessory, not a manifold: Generator Bracket (offset)
- p60 1146: accessory, not a manifold: Generator Bracket and Water Neck 1-1/4" Kit (offset)
- p60 8506: accessory, not a manifold: Generator Bracket Stud Kit
- p63 3625: accessory, not a manifold: Victor Jr. Fuel Rail Kit (compact injectors with stands)
- p63 3620: accessory, not a manifold: Ford Fuel Rail Kit (standard injectors with stands)
- p64 3833: accessory, not a manifold: Performer Truck 5.0 L Gasket Set (includes base-to-upper and plenum cover gaskets)
- p64 7233: accessory, not a manifold: Performer RPM II 5.0 L Gasket Kit
- p64 3628: accessory, not a manifold: Fuel Rail Kit for #7123
- p64 3882: no engine, RPM or dimensions: Performer 5.8 L Upper Plenum Only (includes plenum cover)
- p64 3884: no engine, RPM or dimensions: Performer 5.8 L Base Only with Rear PCV (for 1986-93 Mustang 351W engine swaps with #3822 upper)
- p64 3833: accessory, not a manifold: Replacement Gasket Set (includes base-to-upper and plenum cover gaskets)
- p64 3835: accessory, not a manifold: Mustang Throttle Body Adapter for Edelbrock 5.0 L Manifolds #3821, #7123 & #7126
- p64 38353: accessory, not a manifold: Mustang Throttle Body Adapter for Edelbrock 5.0 L Manifolds #3821, #7123 & #7126
- p64 8025: accessory, not a manifold: 1994-95 Mustang EGR Supply Spacer for #7123 (use with #3835 or #38353)
- p67 3620: accessory, not a manifold: Ford Fuel Rail Kit (standard injectors with stands)
- p69 3639: accessory, not a manifold: Fuel Rail Kit for #28385
- p70 3632: accessory, not a manifold: Ford FE Fuel Rail Kit (standard injectors with stands)
- p71 3645: accessory, not a manifold: Victor Ford Fuel Rail Kit (compatible with standard and compact injectors)
- p71 8718: accessory, not a manifold: Cloverleaf 1" Spacer (for maximum performance with #2965)
- p71 74832: accessory, not a manifold: 85 mm Stock Orientation Adapter
- p72 2194: held back (import make): Performer Holden
- p72 2790: held back (import make): Torker 308
- p72 7594: held back (import make): RPM Air-Gap Holden Carbureted
- p72 75945: held back (import make): RPM Air-Gap Holden EFI
- p72 3504: held back (import make): Holden Fuel Rail Kit
- p73 2894: held back (import make): Victor Jr. Holden Carbureted Manifold
- p73 28945: held back (import make): Victor Jr. Holden EFI Manifold
- p73 3504: held back (import make): Holden Fuel Rail Kit
- p73 4760: held back (import make): Victor X
- p73 4764: held back (import make): Victor X
- p76 3637: accessory, not a manifold: Torker II Pontiac EFI Fuel Rail Kit (compact injectors only)
- p77 3634: accessory, not a manifold: Victor Pontiac EFI Fuel Rail Kit (standard or compact injectors)
- p77 2198: held back (import make): Performer Rover 215 V8 (Non- EGR)
- p100 1103: same part number already emitted from p60
- p100 1109: same part number already emitted from p60
- p100 1107: same part number already emitted from p60

## Needs human QA

- springs p110 #60229, #60259, #60329, #60379, #60399, : seat load quoted at 1.850" but installed height is 1.8"
- p95 Victor CNC 12° LS7: install note(s) ['B'] referenced but not found on the page
- p96 Performer RPM 454-R Marine: max lift cell holds several values `0.700" 0.650"`; first kept
- p96 Performer RPM 454-R Marine: spring diameter cell holds several values `1.55" 1.50"`; first kept
- p96 E-CNC 355: intake port volume cell holds several values `354 cc 334 cc`; first kept
- p99 Performer RPM for Early 5.7 L: spring diameter cell holds several values `1.066" 1.300"`; first kept
- p99 Performer RPM for Early 5.7 L: spring diameter cell holds several values `1.066" 1.300"`; first kept
- p99 Performer RPM for 6.1/6.2/6.4 L: spring diameter cell holds several values `1.066" 1.300"`; first kept
- p107 Performer RPM, Small-Block 350/403 c.i.: HP range `358` is not a range; kept as printed
- p107 Performer RPM, Small-Block 350/403 c.i.: HP range `358` is not a range; kept as printed
- head 60815: companion table lists springs `5821, 5792`; spring data not attributed to one spring part number
- head 60455: companion table lists springs `5823, 5745`; spring data not attributed to one spring part number
- head 60455: companion table lists springs `5823, 5745`; spring data not attributed to one spring part number
- head 60459: companion table lists springs `5823, 5745`; spring data not attributed to one spring part number
- head 60459: companion table lists springs `5823, 5745`; spring data not attributed to one spring part number
- head 60555: companion table lists springs `5823, 5745`; spring data not attributed to one spring part number
- head 60555: companion table lists springs `5823, 5745`; spring data not attributed to one spring part number
- head 61409: companion table lists springs `Call Tech`; spring data not attributed to one spring part number
- head 61409: companion table lists springs `Call Tech`; spring data not attributed to one spring part number
- head 61775: companion table lists springs `5845, 5767`; spring data not attributed to one spring part number
- head 61779: companion table lists springs `5845, 5767`; spring data not attributed to one spring part number
- spring 5745: heads using it list spring diameters [1.5, 1.55]; od omitted
- spring 5792: the spring-info page gives different installed heights/loads for the heads that use it (2 sets); kept per head group in spec.installations, no single value
- spring 5821: the spring-info page gives different installed heights/loads for the heads that use it (5 sets); kept per head group in spec.installations, no single value
- spring 5823: the spring-info page gives different installed heights/loads for the heads that use it (2 sets); kept per head group in spec.installations, no single value
- p32 3785: two port-exit sizes `1.00" x 1.28" 1.00" x 1.71"`; first kept
- p45 7141: Product/Engine/RPM cells are cut by the table ruling; re-joined as `Cross-Ram LS3 Manifold (red powder finish)` / `LS3, L92, L76` / `1500-7000`
- p45 71413: Product/Engine/RPM cells are cut by the table ruling; re-joined as `Cross-Ram LS3 Manifold (black powder finish)` / `LS3, L92, L76` / `1500-7000`
- p45 28457: Product/Engine/RPM cells are cut by the table ruling; re-joined as `Victor Jr. LS Series Gen IV Carbureted Manifold for LS3 Heads` / `LS3, L92, L76` / `3500-7500`
- p45 28455: Product/Engine/RPM cells are cut by the table ruling; re-joined as `Victor Jr. LS Series Gen IV EFI Manifold for LS3 Heads` / `LS3, L92, L76` / `3500-7500`
- p45 28456: Product/Engine/RPM cells are cut by the table ruling; re-joined as `Victor Jr. LS Series Gen IV EFI Manifold for LS3 Heads with Timing Control Module` / `LS3, L92, L76` / `3500-7500`
- p49 5061: two port-exit sizes `1.35" x 1.90" 1.60" x 1.90"`; first kept
- p58 2954: RPM range `35000-7500` has low > high; kept as printed
- p58 29545: RPM range `35000-7500` has low > high; kept as printed
- p67 2924: year `1938-53` cannot apply to 351W; years dropped
- p67 29245: year `1938-53` cannot apply to 351W; years dropped
- p69 2838: Engine cell says `351M, 400` but the product is the Ford 4.6 L SOHC Victor Jr.; family Ford Modular

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family and category; numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.

- passed
