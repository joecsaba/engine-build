# FLUIDAMPR — Fluidampr viscous harmonic dampers

Extracted 2026-10-16 by `scripts/parts-catalog/extract_fluidampr.py`. Output `out/fluidampr.json`,
**106 records from 93 part numbers**, all `cat: damper`, one record per part number per engine
family. 64 records (52 PNs) land in shared families; 42 records (42 PNs) are imports, flathead,
early Hemi, GM 6.2/6.5 diesel, Iron Duke and tractor-pulling dampers that have no shared family
(see "Needs human QA"; 620101 appears in both groups).

| page | tables | shared families covered |
|---|---|---|
| `/dodge-cummins/` | 5 | Cummins 5.9 12V, Cummins 5.9 24V/CR, Cummins 6.7 |
| `/chevy-duramax/` | 8 | Duramax 6.6 (6 PNs); 2 PNs are GM 6.2/6.5 diesel (not shared) |
| `/ford-power-stroke/` | 6 | Powerstroke 7.3 / 6.0 / 6.4 / 6.7 |
| `/chevy-small-block/` | 13 | Small-block Chevy, Chevy W-series 348/409, GM LS, GM LT (Gen V) |
| `/chevy-big-block/` | 9 | Chevy Mark IV big block, Chevy Gen VI big block, GM LT (Gen V) (L8T/L87) |
| `/ford/` | 11 | Small-block Ford (Windsor), Ford 351C/351M/400, Ford FE, Ford 429/460, Ford 240/300 inline-6, Ford Coyote, Ford Godzilla 7.3 |
| `/chrysler/` | 6 | Mopar LA small block, Mopar B/RB big block, Chrysler 426 Hemi, Chrysler Gen III Hemi 5.7/6.1, Chrysler Gen III Hemi 6.2/6.4 |
| `/pontiac-oldsmobile/` | 1 | duplicate of SBC 620101 (no Pontiac V8 / Olds V8 dampers are listed) |
| `/competition-series/` | 5 | Cummins (2 PNs, one duplicated from the Cummins page); 3 tractor-pulling PNs |
| `/bmw/ /honda/ /mazda/ /mitsubishi/ /nissan/ /subaru/ /toyota/ /vw-audi/` | 33 | none (import families kept with their own labels) |

## What was fetched

- `robots.txt` (`www.fluidampr.com`, which 301s to the bare host): `User-Agent: *` / `Disallow:`
  (allow all), no `Crawl-delay`. Requests were spaced 6 s apart anyway.
- 17 platform pages, one request each, from the "Find your Fluidampr" nav. Every page is
  WordPress HTML with one `table#one-column-emphasis` key/value table per part number
  (PART # | Fitment | Bore Diameter | Degree Marking Range | Degree Markings | Engine Balance |
  Finish | Keyway | Length | Material | Mounting Hardware Included | Outside Diameter | Safety
  Rating | Weight / Rotating Weight, plus occasional Pulley Finish / Size / Bolt Pattern /
  Groove Quantity / Drive Belt Type / Fitment Note / Installation Note rows). 97 tables in all.
- Total requests: 20 (3 during inspection: robots, home page, `/dodge-cummins/`; 17 in the
  extractor run: robots + 16 pages, the Cummins page was already cached). No 403 / challenge
  pages. Everything is cached under `dl/fluidampr/` (gitignored); `--offline` re-parses the
  cache, `--dump` prints every raw table.
- Not fetched: `/accessories/` and `/diesel-accessories/` (bolt kits, drill-pin kits, sensor
  relocation kits, pulleys, hubs, spacers — no shared `cat`), `/find-your-fluidampr/` (a
  vehicle picker), blog/company pages. The WooCommerce Store API is disabled on this site.

## Mapping decisions

- **One record per part number per family** from an explicit PN → family table in the script
  (`FAMS`). The page's own `Fitment` text is kept verbatim at the end of `fit.notes`
  ("listed as: …") so every mapping can be checked against the source.
- **Displacements** (`fit.ci`) are the catalog's stated cubic inches, or the standard cubic-inch
  figure for a stated litre size (5.9 Cummins → 359, 6.7 → 408, 6.6 Duramax → 403, 7.3 PS → 444,
  6.0 → 365, 6.4 → 390, 6.7 PS → 406, 6.2/6.5 GM diesel → 379/395, LS1 → 346, LS3/L99/LSA/LT1/LT4/
  Hellcat 6.2 → 376, L8T → 401, 5.7/6.1/6.4 Hemi → 345/370/392, Coyote → 302, Godzilla → 445).
  Ranges like "262ci–350ci" are stored as their endpoints `[262, 350]` with the range repeated in
  `fit.notes`. Omitted where the page names no displacement (LS "custom applications", imports).
- **Years**: taken from the `Fitment` text; `1998.5-2002` → `y0: 1998`; `2007.5+`, `2020-present`,
  `1989 and Up` → `y0` only. Pages with several vehicle spans (EcoBoost, Hellcat, UZ V8, VQ35)
  use the earliest start and latest end. Parts with no years on the page (carburetor-era V8s,
  tractor pulling, some imports) have no `y0`.
- **Multi-family parts** (same `p`, several records): 960341 (Cummins 5.9 12V + 24V/CR, "1989
  and Up"); 980301 (Cummins 5.9 24V/CR + 6.7, both carrying the page's combined 2003–2018 span);
  620101 / 720101 (SBC 262–350 + W-series 409; 620101 also the Pontiac Iron Duke 151);
  800111 / 800121 / 800181 (454–502 external balance → Mark IV `[454]` + Gen VI `[454, 502]`);
  650211 (SBF 289/302/351 + 351C/351M/400 — the page says "289, 302, 351, 400"); 650231 (SBF
  302/351 + Ford 300 I6 "if 0.250 in machined from the hub"); 720201 (Ford 429/460 + Ford FE
  360, with the FE 332–428 modification note from the Keyway row); 720311 (Mopar B/RB + 426 Hemi);
  720361 (Gen III Hemi 5.7/6.1 + 6.2/6.4).
- **Parts on two pages**: 620101 (SBC + Pontiac/Olds), 960341 (Cummins + Competition), 571101
  and 571111 (Subaru + Toyota). Each is emitted once with `src.alsoOn` listing the second page.
  571111's two tables differ only in the Fitment wording (Subaru page lists every Subaru model,
  Toyota page says "2018+ Toyota / Subaru FA24 engine 2022+ Toyota GR86"); the Subaru version is
  kept.
- **`spec`** (inches, lb): `diameter` (Outside Diameter; fractions like `9-3/4"`, `12-13/32"`
  converted), `balance` (`internal` / `external`), `balanceOz` where stated (26, 28, 34.5, 50),
  `weight` and `rotatingWeight` (the two figures of "Weight / Rotating Weight"), `length`, `bore`
  (hub bore; omitted when the page says NA — the Cummins and 6.0 Power Stroke hubs bolt to the
  crank flange), `timingMarks` ("none", or the markings type + the Degree Marking Range text),
  `material`, `finish`, `keyway` (first sentence; "Drill pin kit … recommended" on the Cummins
  parts means no keyway → `none`), `sfi` ("18.1" on every part), `hardwareIncluded` (bool from
  "Mounting Hardware Included"), `pulley` {finish, material, grooves, belt, size, boltPattern}
  where the page has pulley rows, `relatedPns` (Fluidampr accessory PNs named in the table:
  300002 drill pin kit, 300003 sensor relocation kit, 300007/300008/300010/300016 bolt kits,
  717656 pulley spacer, 400018 dry sump adapter, 400309 crank trigger adapter, 300023 hub adapter).
- `name` is built from the spec ("viscous damper, 9.75 in, internal balance, SFI 18.1").
  No marketing text is copied. Prices are not on these pages. `emissions` is `null` throughout.

## Rows skipped

None. All 97 tables parsed; the 4 cross-page duplicates collapse to 93 part numbers, every one
mapped. Accessories (bolt kits, pin kits, pulleys, hubs, spacers) were never fetched.

## Needs human QA

- **42 PNs in non-shared families** (`fit.fam` is a short label from the page heading / engine
  code, flagged in the run summary): GM 6.2/6.5 diesel (800191, 800141), Pontiac Iron Duke 151
  (620101), Ford Flathead V8 (550201, 550203), Ford Barra 4.0 I6 (610201), Ford EcoBoost 2.0/2.3
  (610211), Chrysler early Hemi 331/354/392 (720321), tractor pulling (1243101, 1243111,
  1243121), and the 31 BMW / Honda / Mazda / Mitsubishi / Nissan / Subaru / Toyota / VW-Audi
  parts. Decide whether these labels become shared families or the records are filtered out.
- **620101 / 720101 fitment** says "GM / Chevy / Buick / Pontiac small block. 262ci-350ci, 409ci
  V8". Mapped to Small-block Chevy and Chevy W-series 348/409 only; no Buick 350 or Pontiac V8
  record was emitted (the Pontiac/Olds page lists only this same SBC part). Confirm the 409
  fitment and whether Fluidampr means the corporate SBC in Buick/Pontiac cars.
- **980301** (Competition, "2003-2018 5.9L / 6.7L Cummins common rail"): both the 5.9 24V/CR and
  6.7 records carry 2003–2018 as printed; the real split is 5.9 to 2007, 6.7 from 2007.5.
- **920301** is listed "2003-2009 Dodge. 5.9L Cummins" although the 5.9 ended in 2007; kept as
  printed.
- **800241** (6.7 Power Stroke) `bore: 0.63` and **551231** (EA888) `bore: 0.646`: both are
  bolt-on hubs, so the "Bore Diameter" row is probably the bolt hole, not a crank snout bore.
- **570801** (Toyota UZ V8): Bore Diameter is printed `0.1.38"` (typo) → `bore` omitted; the page
  has a "Popular Fitments" row instead of "Fitment".
- **760111 / 760121** fitment says "6.2L LS3/L99. Camaro SS. GM/Chevy LS1 truck" — the "LS1
  truck" phrase is odd (trucks used LM7/LQ4 etc.); recorded as printed in `fit.notes`.
- **760151** is headed "Chevy Late Model LT" on the big-block page and its fitment says "Big
  Block. 6.6L L8T & 6.2L L87"; mapped to GM LT (Gen V).
- **800191** includes a spacer and the base damper 800141 (page PN cell reads
  "800191 *Includes - Spacer & Base damper: Part# 800141").
- Years for parts with several vehicle spans are the overall min/max, not per-vehicle.
- `timingMarks` is the page's wording (e.g. "engraved, 50 BTDC to 10 ATDC. Additional
  timing/degree marks at 90, 180 and 270"), not normalised to a number of marks.
