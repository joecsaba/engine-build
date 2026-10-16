# BRODIX — cylinder heads (brodix.com series pages)

Extracted 2026-10-16 by `scripts/parts-catalog/extract_brodix.py`. Output `out/brodix.json`,
774 records (`cat: head`), one record per Brodix Easy Order number per engine family
(544 distinct Easy Order numbers; every big-block Chevy number is emitted twice, once for
`Chevy Mark IV big block` and once for `Chevy Gen VI big block`).

| family | records |
|---|---|
| Small-block Chevy | 221 |
| Chevy Mark IV big block | 230 |
| Chevy Gen VI big block | 230 |
| GM LS | 19 |
| Small-block Ford (Windsor) | 52 |
| Mopar B/RB big block | 8 |
| Mopar LA small block | 4 |
| Chevy 4.500 bore spacing small block (unknown family) | 4 |
| Chevy 5.0 bore spacing big block (unknown family) | 6 |

756 records carry a flow table, 496 a matched valve spring (seat/open lb, installed height,
max lift), 600 list valve sizes (bare castings have none), 187 are bare castings, 508 assembled
packages and 79 "Combo" numbers (pair of heads plus an intake manifold).

## What was fetched

- `robots.txt`: `User-agent: *` disallows only `/wp-content/cache/`; no `Crawl-delay`. SemrushBot
  is blocked by name. Requests were spaced 6 s apart; nothing returned a 403 or a challenge page.
- Discovery: the home page nav plus the category pages `/heads-2`,
  `/heads-2/small-block-chevrolet-compatible-heads`, `/heads-2/big-block-chevrolet-compatible-heads`,
  `/heads-2/ford-mopar`, `/ls-compatible-heads` and `/v6-chevy`. The nav shows 25 series; the
  category pages link 17 more (12°, 13°, 18 C, 18 X, 10 CX, AK, BD, 4.500 bore, PB 1200/1600/
  1800/2000/5000, DN-9, BB-3 XTRA, Dragon Slayer BB, Head Hunter BB, IK Ford, Spec, 90° V6).
  43 series pages in total, all fetched once and cached under `dl/brodix/` (gitignored).
- Request count: 59 GETs to brodix.com in total (10 during inspection, 49 in the first extractor
  run: robots, home, 5 category pages, 42 series pages; the 90° V6 pair was cached during
  inspection). The committed JSON came from a cache-only re-run (`requests=0 cached=50`).
- Each series page has three tables: **Details** ("Package Heads | Facts and Related
  Components", a bullet list), **Flow Chart** (`Part Number | Valve Size | 0.200 … 0.900`, intake
  row then exhaust row per head model, cfm @ 28" H2O) and **Easy Order Numbers**
  (`Part# | Easy Order # | Port Vol. | Cham. Vol. | Int/Exh Valve | Spring Seat Pressure |
  Spring Diam. | Ret. ST/TI | Per`). They normally sit in a Beaver Builder tab module; the 11 X
  page has broken `[tabs]` shortcodes, so tables are located by header signature instead.
- Not fetched: the Top End Combos page, instruction-sheet PDFs, photos, videos, the
  "Cylinder Head Recommendation Guide", and no retailer.

## Row counts per page (distinct Easy Order numbers → records)

Small-block Chevy: IK 35, Race-Rite 42, Dragon Slayer 225 8, Track 1 44, Head Hunter 23° 11,
11 X 10, 10 CX 1, 18 X 16, 18 C 8, 13° 7, 12° 19, AK 7, BD 7, ASCS/SUPR 6 (Chevy spec heads only).
LS: BR 7 12, BR 3 4, BR 1 13 / BR 5.3 3. Big-block Chevy (×2 families): BR X 5, BR X 18 2,
SR 20 3, Race-Rite 26° 32, Race-Rite 24° 13, BB-2 Plus 23, BB-2 X/XTRA 36, BB-3 XTRA 35,
Dragon Slayer BB 22, Head Hunter 24° 23, PB 1200 14, PB 1600 3, PB 1800 10, PB 2000 6, DN-9 3.
Ford: BF 4, LH 5, Head Hunter F 2, ST 5.0 13, Track 1 F 26, IK Ford 2. Mopar B1 12 (4 LA, 8 B/RB).
Flagged families: 4.500 bore spacing 4, PB 5000 (5.0 bore spacing) 6.

## Record mapping

- `p` = Brodix **Easy Order #** exactly as printed, e.g. `1173001`, `9992000-3` (combo), and
  `1010000 A` / `1010000 S` on the Race-Rite and Track 1 pages. The A/S suffix is kept inside `p`
  because the two rows are distinct orderable numbers; it is decoded to `spec.sparkPlug`
  `angle` / `straight` (the Race-Rite page says "Available With Straight or Angled Plugs").
- `name` is built from the row: model, Bare/Pkg/Combo, port cc, chamber cc, valves, seat lb,
  valve angle. The raw `Part#` text (e.g. `BP BR 3 PKG`) is kept in `spec.catalogDesc`.
- `spec` from the Easy Order row: `intakeRunnerCc` (Port Vol.), `chamberCc`, `intakeValve`,
  `exhaustValve` (+ `valveMaterial` when the cell says `TI`/`ST`), `seatLb` (Spring Seat
  Pressure), `springDia`, `retainer` (`steel`/`titanium`), `bare`, `package`
  (`assembled` / `combo (heads + intake manifold)`), `per`, and row flags: `popular`
  (`**` marks "most popular package"), `downNozzle` (`W/DN`), `lightened` (`L`),
  `cncMachinedBare`, `comboIntakeFor` (350/400 small-block combos), `comboRockers` (T&D).
- `spec.flow` = `[{lift, int, exh}]` from the Flow Chart row whose model name matches the Easy
  Order model (normalised: no spaces/hyphens, `Track 1` → `T1`, `STD` dropped as a fallback,
  port cc appended as a fallback, `BP` prefix dropped as a fallback, plus explicit aliases
  `HHX` → `BP HH BB X`, `BP LH 17 195` → `BP LH F 17 195`, `BF 201-202` → both). The matched
  label is kept in `spec.flowModel`; `flowDepression: 28`. Flow-chart header typos (`0.7000`,
  `7.000`, `8.000`, `9.000`) are read as .700/.800/.900. Valve seat angles printed in the flow
  chart (`2.250 Intake 50°`) go to `intakeSeatAngle` / `exhaustSeatAngle`; "(CNC Ported)" /
  "(CNC Combustion Chamber)" / "(Hand Ported)" go to `spec.porting`. When the flow chart's
  valve size differs from the row's valve size (optional larger valves in a package) the chart's
  size is recorded in `spec.flowValves` (38 records).
- `spec.spring` from the Details "Valve Springs" bullet: `{pn, od, seatLb, openLb, installedHt,
  maxLift}`; the option is chosen by model qualifier (when the bullet names models), then spring
  diameter within .021 of the row's `springDia`, then nearest closed pressure within 30 lb.
  `spec.maxLift` and `spec.camType` (`hydraulic_flat` for "Hydraulic Valve Spring",
  `hydraulic_roller`, `flat_tappet` for "Flat Tappet Valve Spring", `solid_roller` for "Roller
  Valve Spring") come from that spring. Rows whose seat pressure is not within 30 lb of any
  listed spring (e.g. PB 5000 400 lb / 1.670) have no `spring`.
- From Details, chosen per model where the bullet is qualified with model lists or the
  ASCS/Spec engine codes `(CH)/(FO)/(MO)`: `valveAngle` (+ `valveAngleExh`, `valveCant` for
  "26° and 4° Intake, 17° and 4° Exhaust"), `maxSpringPocket` (largest spring pocket allowed),
  `rockers` (`shaft` when a shaft system is required, `stud` for standard/stock rockers),
  `pistons` (`standard` / `special`), `minBore`, `boreRange`, and `spec.related` with the
  intake/exhaust valve lines, intake/head/exhaust gasket PNs, head studs/bolts and intake
  manifold PNs. Where a bullet has no model qualifier the whole value is kept.
- `valveAngle` falls back to the page title (`…/15°`) when Details has none and the title has a
  single angle; BF (9.5°/11°) and `FF 10 STD CNC Bare` therefore have none.
- `material: "A356 aluminum"` only on pages whose text says A-356 (549 records).
- `fit.notes`: port style for the LS pages, Windsor for the Ford pages, "exhaust ports in stock
  location" for Race-Rite BB, B1 sub-model facts, plus "shaft rockers required" /
  "special pistons" when the Details say so.
- Prices are not on the pages; nothing marketing is stored. Descriptions were used only to
  confirm facts (A-356, bore spacing, LS port style).

## Family decisions

- Small-block group → `Small-block Chevy`, except BR 7 / BR 3 / BR 1 13 / BR 5.3 → `GM LS`.
  The 12°, 13°, 18°, 10 CX, AK and BD race heads keep `Small-block Chevy` (Brodix's grouping,
  standard SBC bolt pattern) but their `fit.notes`/`spec` say shaft rockers / special pistons
  / offset lifters are required.
- Big-block group → both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same approach
  as the LIFTERS task; Brodix does not distinguish). PB 1200/1600/1800/2000, DN-9, BR X, BR X 18
  and SR 20 are Pro Stock style heads that still use the BBC head-bolt pattern (Details list
  head studs for cast-iron blocks) and are kept in those families with `fit.notes`.
- Ford pages (BF, LH, Head Hunter F, ST 5.0, Track 1 F, IK F) → `Small-block Ford (Windsor)`.
- B1 series by model: `B1 BA` / `B1 BA MC` → `Mopar LA small block` (Details: FEL-PRO 1008 head
  gasket, ARP 144-4204, small-block Chrysler or W-5/W-7 intake); `B1 BS`, `STS B1 BS`, `B1 MO`
  → `Mopar B/RB big block` (FEL-PRO 1009, ARP 145-4012/145-4007, big-block Chrysler or B1 intake).
- ASCS/SUPR page: only the Chevy spec heads (`11 SP C/X ASCS`, `11 SP X SUPR`) have Easy Order
  numbers → `Small-block Chevy`. Its flow chart also lists `27-223/T1 F STD X SUPR` (Ford) and
  `27-222/B1 BA SUPR` (Mopar) with no part numbers, so they are not emitted.
- Unknown families kept with the catalog's own heading and flagged: `Chevy 4.500 bore spacing
  small block` (WP BD 4510, WP FF 13 STD, FF 10/13 STD CNC bare; 4.500 bore-spacing Brodix
  aluminum block only) and `Chevy 5.0 bore spacing big block` (PB 5000/5001/5002).

## Rows skipped and why

- 36 "Special" lines (`Custom Order`, no specs), e.g. `T1 STD Special 1009000`.
- 10 rows on the 90° V6 page: the Easy Order # column is empty on the live page, so nothing
  can be keyed (V6 -8 194 cc / V6 -10 210 cc, 64/67 cc chambers, 2.080/1.600 valves).
- Spec Series page (`SP CH / SP FO / SP MO`): its "Easy Order" table has only
  `*SP CH | 67 Chamber | Custom Order` rows, no part numbers → nothing emitted.
- `9992009-3` appears twice on the BB-3 XTRA page (332 cc row and 351/365 cc row) — first kept.
- 17 bare castings have no flow-chart row (unported castings such as `12 SP P Bare`,
  `18 SP C BARE`, `AK 270 Bare`, `BD 2000 Bare`, `13 STD CNC Bare`, `LH F 17 Bare`,
  `11 SP C ASCS Bare`, `WP 12 SP B Pkg W/DN`, and the `BB-3 XTRA COMBO` with two port options);
  they are emitted without `flow`.
- Flow rows that exist for two versions of one casting (`RR 180` and `RR 180 (CNC Combustion
  Chamber)`, `PB 1802 4.600 Bore` and `PB 1802 (CNC Combustion Chamber)`, `BB-2 X` and
  `BB-2 X (CNC Combustion Chamber)`) are matched to the first listed; the other version is not
  distinguishable from the Easy Order table.

## Needs human QA

- `spec.per` is Brodix's "Per" column (2 on small-block pages, 1 on big-block pages and on all
  combos). It is most likely the quantity the Easy Order number covers (pair vs each/set), but
  the page does not define it.
- Brodix's listed seat pressures are nominal and do not always equal the spring's closed load in
  Details (240 lb rows → PAC 1941 255 lb; 250 lb / 1.625 rows → PAC 1224 270 lb). Both numbers
  are kept (`seatLb` from the row, `spring.seatLb` from Details).
- `camType` is inferred from the spring Brodix packages the head with; `flat_tappet` is not split
  into hydraulic/solid because the page does not say.
- Mislabeled rows on the site: `DS 320 Combo` 9992023-3 / 9992024-3 / 9992025-3 carry the
  DS 365 port volume and valves (flow taken from `DS 365`, flagged in the run log);
  `RR BB-3 XTRA 345 PKG 2061045` lists a 1.800 exhaust valve where the other rows say 1.880;
  `BP SR 20 Pkg 2208100` lists 1.880 exhaust where its flow chart and bare row say 1.800;
  `BP LH 17 195` (page typo for `BP LH F 17 195`). Values are stored as printed.
- 32 records have `flowValves` because the package valve size differs from the flow-chart
  valve (e.g. Track 1 packages with 2.055 valves, flow published with 2.080).
- BF series family: mapped to `Small-block Ford (Windsor)` from Brodix's "Small Block Ford
  Compatible" grouping; its Details list FEL-PRO 1022/1023 head gaskets, FEL-PRO 1265 intake and
  ARP 254-4312 studs — confirm the block bolt pattern before relying on the family.
- Big-block heads emitted for both Mark IV and Gen VI; Brodix does not state Gen V/VI coolant
  passage compatibility per casting.
- `related` strings are facts copied from the Details bullets (valve o.a.l. and PN, gasket and
  stud PNs, intake manifold PNs). Where Brodix qualified a bullet with model lists the matching
  segment was chosen (exact model match preferred over prefix match); unqualified bullets are
  stored whole and may list alternatives (e.g. 350 vs 400 head gaskets).
- `9992016-3` (`BB-3 XTRA COMBO`, port "345/366") and `9992009-3` (`BP BB-3 XTRA O COMBO`,
  "351 / 365") list two port volumes; stored in `spec.intakeRunnerCcOptions`.
