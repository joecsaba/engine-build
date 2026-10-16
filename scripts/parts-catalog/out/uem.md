# UEM (ICON / KB / Dualoy) — extraction notes

Extracted 2026-10-16 by `scripts/parts-catalog/extract_uem.py`.

## What was fetched

All requests to `www.uempistons.com`, one at a time, 6 s apart, UA `engine-build.com catalog research (contact: joecsaba@gmail.com)` (every network GET ever made by this script is appended to `dl/uem/fetch_log.jsonl`; this run's log follows):
- KB catalog: 50 pages, only 3 with a text layer (scanned images)

Downloads on record (`dl/uem/fetch_log.jsonl`):

| when (UTC) | url | status | bytes |
|---|---|---|---|
| 2026-10-16T05:30:09+00:00 | https://www.uempistons.com/robots.txt | 200 | 1392 |
| 2026-10-16T05:30:16+00:00 | https://www.uempistons.com/rt-5-catalogs | 200 | 203636 |
| 2026-10-16T05:30:23+00:00 | https://www.uempistons.com/rt-5-catalogs/themes/UEM/images/Listing%20Section%2012.20.20.pdf | 404 | 188024 |
| 2026-10-16T05:30:32+00:00 | https://www.uempistons.com/themes/UEM/images/Listing%20Section%2012.20.20.pdf | 200 | 133095 |
| 2026-10-16T05:30:39+00:00 | https://www.uempistons.com/themes/UEM/images/Icon_catalog.pdf | 200 | 10781265 |
| 2026-10-16T05:30:45+00:00 | https://www.uempistons.com/themes/UEM/images/ICON%20FHR%2012.20.20.pdf | 200 | 4167969 |
| 2026-10-16T05:30:52+00:00 | https://www.uempistons.com/themes/UEM/images/KB%2012.20.20%20%281%29.pdf | 200 | 12739579 |
| 2026-10-16T05:30:59+00:00 | https://www.uempistons.com/sites/default/files/2026-uem-supplement-final-v2-small.pdf | 200 | 3520119 |
| 2026-10-16T05:31:05+00:00 | https://www.uempistons.com/sites/default/files/2025-uem-supplement-rev-G-small.pdf | 200 | 3431223 |

robots.txt (`*` group) disallows Drupal admin/user/search paths and `?sort=/?page=/?combine=` query URLs; it explicitly allows `/themes/` and `/sites/default/files/` where the catalog PDFs live. No Crawl-delay. No product pages were crawled: one HTML page (the catalogs index) and the PDFs it links. PDFs are kept in `dl/uem/` (gitignored); `--offline` re-parses them without the network.

| file | pages | sha256 |
|---|---|---|
| listing_section.pdf | 6 | b08e2100a0075c3e… |
| icon_premium.pdf | 62 | 9b081554cbad4bc0… |
| icon_fhr.pdf | 18 | 13c99043abfcd3c5… |
| kb.pdf | 50 | 6ca07447719a42b9… |
| supplement_2026.pdf | 36 | d2c061b423a566ab… |
| supplement_2025.pdf | 36 | 181faba7a1de11b5… |

## What was parsed

| source | what | rows |
|---|---|---|
| Listing Section 12.20.20 (6 pp) | numerical listing rows (PN × application), pp 1–4 | 423 |
| Listing Section 12.20.20 | diametrical listing rows (bore, CH, PN, page), pp 5–6 | 344 |
| Icon_catalog.pdf (62 pp) + ICON FHR (18 pp) | per-application table rows (`PART # / KTD ROD C/H PIN DISH/DOME C/R …`) | 380 |
| Icon_catalog.pdf + ICON FHR | LS-style rows (one SKU per bore size, `IC551C.STD IC551CKTS.STD …`) | 168 |
| 2026 supplement pp 4–6, 13 | ICON Premium / KB rows (one SKU per bore size) | 156 |
| 2026 supplement pp 7–9 | ICON FHR rows (oversize list per PN) | 37 |
| 2026 supplement pp 18–19 | Dualoy diesel application rows | 54 |

Records: **575** (one per part number per fitment family). Listing part numbers matched to a detail row: 411; listing-only records (no detail row found): 0.

### How the sources combine

- The ICON Premium / FHR catalogs are the primary source: every table line becomes one record per family (`spec` = catalog columns). Each application block's header supplies bore, stroke, OE deck height, alloy, lock ring, oversizes, ring pack and ring-set PN; `spec.boreOptions` = standard bore + each listed oversize.
- LS pages (Icon pp 8–10, FHR pp 5–6) and the 2026 supplement list one SKU per bore size (`IC551C.STD`, `IC551C.030`, …). These collapse to one record per base PN; `spec.sizes[]` keeps every SKU with its bore, displacement, CR and ring-set PN, and `spec.bore` / `spec.cr` are the STD-bore row's.
- The numerical listing is an index of the same catalog: its rows are attached to the matching record as `spec.listingApplications[]` (displacement, rod length, description, ring pack, catalog page), with the listing PN in `spec.listingPn` (the listing prints `IC551` for the catalog's `IC551C`). A PN that only appears in the listing becomes a record with `spec.detailMissing: true`, bore and CH from the diametrical listing and the family from the catalog page the listing points to.
- Bore/CH from the diametrical listing are cross-checked against the detail row; differences are listed under QA.
- 2026 supplement FHR rows name the 2020 PN they supersede: `spec.supersedes` on the new record and `spec.supersededBy` on the old one.

### Column mapping

- `spec.ch` = catalog `C/H` (compression height); `spec.pin` / `pinLength` = `PIN` (`.927 x 2.750"`); `spec.weight` / `pinWeight` = `GRAM WEIGHT` piston/pin; `spec.topLand` = `TOP LAND`; `spec.valveReliefDepthInt/DiaInt/DepthExh/DiaExh` = `VALVE-RLF DEPTH-DIA. INT • EXH` (zeros dropped).
- **Sign convention:** UEM prints domes negative and dishes positive (`DOME -89.1cc`, `DISH 20cc`). The shared format wants `domeCc` positive for a dome and negative for a dish, so every 2020-catalog value is negated. The 2026 supplement's ICON Premium pages print the magnitude with a head-type column (`0.8 Dome`, `12.0 Dish`), so there dome = +cc and dish/flat = −cc; its FHR and KB pages keep the 2020 convention (`-6.1 Dome`) and are negated. `spec.crown` is the normalised head type (`flat top`, `dish`, `step-dish`, `d-cup`, `solid dome`, `hollow dome`, `open-chamber dome`, `dome`); `spec.domeHeight` is the dome height when printed (`.250" H/Dome`); `spec.valveReliefs` = the `2V`/`4V` count.
- `spec.cr` is keyed by the chamber cc printed in the column header (`58cc 64cc 76cc` → `{"58": 12.1, "64": 11.0, "76": 9.4}`). The catalog computes CR at zero deck with a .040" gasket unless the NOTES say otherwise. Rows that print fewer CR values than the header has chambers keep the values positionally in `spec.crValues` and are flagged.
- `spec.series`: `ICON Premium` (2618/4032 fully machined), `ICON Elite` (2618, LS and BBC drag pages), `ICON FHR` (4032 formed head relief), `KB Hypereutectic`, `Dualoy diesel`. `spec.kitSuffix` (`KTD`/`KTS`/`KTM`) is what the catalog appends to the PN for the piston-and-ring kit.
- Supplement rows sold only as a piston-and-ring kit (`N/A` / `Sold as kit only` in the piston-set column) carry `spec.kitOnly: true`; `spec.sizes[].sku` / `.kit` are the orderable numbers per bore size. A supplement size added to a 2020 PN (e.g. `IC9990C.007`) is merged into that record's `sizes` with `src.also` naming the supplement page.
- `spec.pinOffset` comes from the NOTES text (`Centered Pin.` / `Offset Pin.`); `fit.notes` carries the rest of the block's NOTES (head compatibility, block, rod requirements). The catalog prints notes in a second column interleaved with the RING PACK / RINGSET lines, so a few notes are joined out of order; treat them as hints.
- Dualoy rows carry only what the table gives: kit PN pattern (`DU10096-___K1`, `7208DKT`), oversizes in mm, reduced compression height, replaced OE piston PNs and MAHLE cross-reference numbers; `p` is the kit PN without its kit/oversize suffix.
- `emissions` is `null` throughout (internal engine parts).

### Family mapping

- Catalog sections → families: `CHEVROLET SBC` → Small-block Chevy; `CHEVROLET BBC` → both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same pistons, as in the MAHLE extract); `CHEVROLET W-HEAD` → Chevy W-series 348/409; `CHEVROLET LS ENGINE` / `GM LS` → GM LS; `CHRYSLER SB` → Mopar LA small block (not duplicated into Magnum); `CHRYSLER BB` → Mopar B/RB big block; `CHRYSLER 5.7L / 6.1L HEMI` → Chrysler Gen III Hemi 5.7/6.1; supplement `Hemi Gen III 6.4L` → Chrysler Gen III Hemi 6.2/6.4; `CHRYSLER BB HEMI` (472/528) → Chrysler 426 Hemi; `FORD MODULAR` (4.6L / 4.9L stroker / 5.4L) → Ford Modular; `FORD WINDSOR` → Small-block Ford (Windsor); `FORD CLEVELAND` → Ford 351C/351M/400; `FORD FE` → Ford FE; `FORD 460` → Ford 429/460; `OLDSMOBILE` → Oldsmobile V8; `PONTIAC` → Pontiac V8; `AMC / JEEP 4.6L INLINE 6` → AMC/Jeep inline-6.
- Listing-only rows use the family of the catalog page they point to; when the page is unmapped, MFG + displacement heuristics (CHEVY ≥ 396 ci → big block, FORD 390–428 → FE, ≥ 429 → 429/460, `C` suffix → Cleveland).
- Dualoy: `6.6L Duramax` (LB7 … L5P) → Duramax 6.6; `5.9L 12V` → Cummins 5.9 12V; `5.9L 24V` → Cummins 5.9 24V/CR; `6.7L 24V ISB` → Cummins 6.7; Power Stroke 7.3 / 6.0 / 6.4 / 6.7 by displacement.
- **Families not in the fitment list** (`fit.fam` = catalog heading; needs a decision): `Ford 6.2L Boss V8` (2); `Ford EcoBoost 2.7L` (2); `Ford EcoBoost 3.5L` (1); `Ford Flathead V8` (4); `GM 2.8 Duramax` (1); `GM 3.0 Duramax` (1); `GM 6.2/6.5 diesel` (1); `Mercedes Sprinter` (2); `Navistar MaxxForce 7` (2); `RAM 3.0 EcoDiesel` (1).

## Records per brand and family

| brand | family | records |
|---|---|---|
| Dualoy | Duramax 6.6 | 17 |
| Dualoy | Cummins 6.7 | 8 |
| Dualoy | Powerstroke 6.7 | 6 |
| Dualoy | Cummins 5.9 24V/CR | 5 |
| Dualoy | Powerstroke 6.0 | 4 |
| Dualoy | Powerstroke 7.3 | 3 |
| Dualoy | Powerstroke 6.4 | 2 |
| Dualoy | Navistar MaxxForce 7 | 2 |
| Dualoy | Mercedes Sprinter | 2 |
| Dualoy | GM 2.8 Duramax | 1 |
| Dualoy | GM 3.0 Duramax | 1 |
| Dualoy | GM 6.2/6.5 diesel | 1 |
| Dualoy | RAM 3.0 EcoDiesel | 1 |
| Dualoy | Cummins 5.9 12V | 1 |
| ICON | Small-block Chevy | 127 |
| ICON | Chevy Mark IV big block | 71 |
| ICON | Chevy Gen VI big block | 71 |
| ICON | Mopar B/RB big block | 38 |
| ICON | Small-block Ford (Windsor) | 36 |
| ICON | GM LS | 34 |
| ICON | Ford FE | 23 |
| ICON | Mopar LA small block | 20 |
| ICON | Ford 429/460 | 17 |
| ICON | Chrysler Gen III Hemi 5.7/6.1 | 15 |
| ICON | Pontiac V8 | 14 |
| ICON | Ford Modular | 9 |
| ICON | Ford 351C/351M/400 | 8 |
| ICON | AMC/Jeep inline-6 | 6 |
| ICON | Chrysler 426 Hemi | 6 |
| ICON | Chevy W-series 348/409 | 4 |
| ICON | Ford Flathead V8 | 4 |
| ICON | GM LT (Gen V) | 4 |
| ICON | Oldsmobile V8 | 2 |
| ICON | Ford EcoBoost 2.7L | 2 |
| ICON | Ford 6.2L Boss V8 | 2 |
| ICON | Chrysler Gen III Hemi 6.2/6.4 | 2 |
| ICON | Ford EcoBoost 3.5L | 1 |
| ICON | Ford Godzilla 7.3 | 1 |
| KB | AMC/Jeep inline-6 | 2 |
| KB | Ford 351C/351M/400 | 2 |
| **total** | | 575 |

## Rows per catalog section

| pdf | page | section / application | rows |
|---|---|---|---|
| icon_fhr.pdf | 5 | GM 4.7L / 5.3L BLOCK FLAT TOP 2V 15° VALVE ANGLE | 18 |
| icon_fhr.pdf | 5 | GM 5.7L LS1 / LS6 BLOCK FLAT TOP 2V 15° VALVE ANGLE | 9 |
| icon_fhr.pdf | 6 | GM 6.0L-6.2L LS2 / LS3 / LSA / LS9 / L99 BLOCK FLAT TOP 2V 15° VALVE ANGLE | 16 |
| icon_fhr.pdf | 7 | CHEVROLET 350-V8 Dish-4V FOR BOOSTED APPLICATIONS | 2 |
| icon_fhr.pdf | 7 | CHEVROLET 350-V8 FLAT TOP-4V | 2 |
| icon_fhr.pdf | 7 | CHEVROLET 350-V8 FLAT TOP-2V | 2 |
| icon_fhr.pdf | 7 | CHEVROLET 350-V8 DOME-2V | 2 |
| icon_fhr.pdf | 8 | CHEVROLET 377-V8 DISH-2V | 1 |
| icon_fhr.pdf | 8 | CHEVROLET 377-V8 FLAT TOP-2V | 2 |
| icon_fhr.pdf | 8 | CHEVROLET 377-V8 DOME-2V | 2 |
| icon_fhr.pdf | 8 | CHEVROLET 383-V8 DISH-4V | 2 |
| icon_fhr.pdf | 9 | CHEVROLET 383-V8 FLAT TOP-4V | 2 |
| icon_fhr.pdf | 9 | CHEVROLET 383-V8 FLAT TOP-2V | 2 |
| icon_fhr.pdf | 9 | CHEVROLET 383-V8 DOME-2V | 3 |
| icon_fhr.pdf | 10 | CHEVROLET 383-V8 DISH-4V GM Crate ZZ383 & HT383E | 1 |
| icon_fhr.pdf | 10 | CHEVROLET 383-V8 FLAT TOP-4V GM Crate ZZ383 & HT383E | 1 |
| icon_fhr.pdf | 10 | CHEVROLET 400-V8 DISH-2V | 1 |
| icon_fhr.pdf | 10 | CHEVROLET 400-V8 FLAT TOP-2V | 2 |
| icon_fhr.pdf | 11 | CHEVROLET 396 / 402-V8 DOME-1V | 2 |
| icon_fhr.pdf | 11 | CHEVROLET 434 - V8 DOME-1V 396 STROKER APPLICATION | 1 |
| icon_fhr.pdf | 11 | CHEVROLET 461-V8 DOME-1V | 1 |
| icon_fhr.pdf | 12 | CHEVROLET 427-V8 DOME-1V | 3 |
| icon_fhr.pdf | 12 | CHEVROLET 454-V8 FLAT TOP-1V | 1 |
| icon_fhr.pdf | 13 | CHEVROLET 454-V8 DOME-1V | 2 |
| icon_fhr.pdf | 13 | CHEVROLET 489-V8 FLAT TOP-1V | 1 |
| icon_fhr.pdf | 13 | CHEVROLET 489-V8 DOME-1V | 2 |
| icon_fhr.pdf | 14 | CHEVROLET 502-V8 FLAT TOP-1V | 1 |
| icon_fhr.pdf | 14 | CHEVROLET 540-V8 DOME-1V | 1 |
| icon_fhr.pdf | 15 | CHRYSLER 340 - V8 FLAT TOP - 2V | 1 |
| icon_fhr.pdf | 15 | CHRYSLER 360 - V8 FLAT TOP - 2V | 1 |
| icon_fhr.pdf | 15 | CHRYSLER 408 - V8 DISH-2V | 1 |
| icon_fhr.pdf | 15 | CHRYSLER 408 - V8 DISH - 2V | 1 |
| icon_fhr.pdf | 16 | CHRYSLER 440-V8 FLAT TOP-2V | 2 |
| icon_fhr.pdf | 16 | FORD 289-302-V8 DISH-4V | 1 |
| icon_fhr.pdf | 16 | FORD 289-302-V8 FLAT TOP-4V | 1 |
| icon_fhr.pdf | 16 | FORD 331-V8 FLAT TOP-4V | 1 |
| icon_fhr.pdf | 17 | FORD 347-V8 FLAT TOP-4V | 1 |
| icon_fhr.pdf | 17 | FORD 351-V8 FLAT TOP-4V | 1 |
| icon_fhr.pdf | 17 | FORD 393-V8 DISH-4V | 1 |
| icon_fhr.pdf | 17 | FORD 393-V8 FLAT TOP-4V | 1 |
| icon_fhr.pdf | 18 | FORD 408-V8 DISH-4V / FLAT TOP-4V | 2 |
| icon_fhr.pdf | 18 | PONTIAC 400-V8 FLAT TOP-4V | 1 |
| icon_fhr.pdf | 18 | PONTIAC 455-V8 FLAT TOP-4V | 1 |
| icon_premium.pdf | 8 | AMC / JEEP 4.6L - INLINE 6 CYL. 4.0 Stroker D-CUP DISH | 3 |
| icon_premium.pdf | 8 | GM 4.8L - 5.3L BLOCK 15° VALVE ANGLE 9.240" DECK | 20 |
| icon_premium.pdf | 8 | GM 5.7L LS1/LS6 BLOCK 15° VALVE ANGLE 9.240" DECK | 4 |
| icon_premium.pdf | 9 | GM 6.0L LS2 BLOCK 15° VALVE ANGLE 9.240" DECK | 27 |
| icon_premium.pdf | 9 | GM 5.7L LS1/LS6 BLOCK | 18 |
| icon_premium.pdf | 10 | GM 6.0L-6.2L LS2/LS3/LSA/LS9/L99 BLOCK 15° VALVE ANGLE 9.240" DECK | 56 |
| icon_premium.pdf | 11 | CHEVROLET 409-V8 DOME-2V | 2 |
| icon_premium.pdf | 11 | CHEVROLET 427-V8 DOME-2V 348 Stroker | 2 |
| icon_premium.pdf | 11 | CHEVROLET 302-V8 DOME-2V | 2 |
| icon_premium.pdf | 12 | CHEVROLET 305-V8 L/W FLAT TOP-2V | 3 |
| icon_premium.pdf | 12 | CHEVROLET 305-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 12 | CHEVROLET 305-V8 FLAT TOP-4V | 2 |
| icon_premium.pdf | 12 | CHEVROLET 327-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 13 | CHEVROLET 327-V8 DOME-2V | 4 |
| icon_premium.pdf | 13 | CHEVROLET 334-V8 STEP-DISH-2V | 2 |
| icon_premium.pdf | 13 | CHEVROLET 350-V8 STEP-DISH-2V | 2 |
| icon_premium.pdf | 13 | CHEVROLET 350-V8 L/W FLAT TOP-2V | 1 |
| icon_premium.pdf | 14 | CHEVROLET 350-V8 L/W FLAT TOP-2V | 2 |
| icon_premium.pdf | 14 | CHEVROLET 350-V8 FLAT TOP-2V OVAL TRACK | 4 |
| icon_premium.pdf | 14 | CHEVROLET 350-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 15 | CHEVROLET 350-V8 L/W DOME-2V | 2 |
| icon_premium.pdf | 15 | CHEVROLET 350-V8 DOME-2V | 6 |
| icon_premium.pdf | 15 | CHEVROLET 353-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 16 | CHEVROLET 363-V8 L/W DOME-2V | 1 |
| icon_premium.pdf | 16 | CHEVROLET 370-V8 L/W DOME-2V | 1 |
| icon_premium.pdf | 16 | CHEVROLET 377-V8 STEP-DISH-2V | 2 |
| icon_premium.pdf | 16 | CHEVROLET 377-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 17 | CHEVROLET 377-V8 DOME-2V | 2 |
| icon_premium.pdf | 17 | CHEVROLET 383-V8 STEP-DISH-2V | 2 |
| icon_premium.pdf | 17 | CHEVROLET 383-V8 FLAT TOP-2V OVAL TRACK | 1 |
| icon_premium.pdf | 17 | CHEVROLET 383-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 18 | CHEVROLET 383-V8 L/W DOME-2V | 2 |
| icon_premium.pdf | 18 | CHEVROLET 383-V8 DOME-2V | 6 |
| icon_premium.pdf | 18 | CHEVROLET 388-V8 L/W DOME-2V | 1 |
| icon_premium.pdf | 19 | CHEVROLET 395-V8 L/W FLAT TOP-2V | 1 |
| icon_premium.pdf | 19 | CHEVROLET 395-V8 L/W DOME-2V | 2 |
| icon_premium.pdf | 19 | CHEVROLET 400-V8 L/W DOME-2V | 2 |
| icon_premium.pdf | 20 | CHEVROLET 400-V8 STEP-DISH-2V | 4 |
| icon_premium.pdf | 20 | CHEVROLET 400-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 20 | CHEVROLET 400-V8 DOME-2V | 2 |
| icon_premium.pdf | 20 | CHEVROLET 421-V8 L/W DOME-2V | 1 |
| icon_premium.pdf | 21 | CHEVROLET 421-V8 L/W FLAT TOP-2V | 1 |
| icon_premium.pdf | 21 | CHEVROLET 434-V8 L/W DISH-2V | 1 |
| icon_premium.pdf | 21 | CHEVROLET 434-V8 L/W FLAT TOP-2V | 1 |
| icon_premium.pdf | 21 | CHEVROLET 434-V8 STEP-DISH-2V | 2 |
| icon_premium.pdf | 22 | CHEVROLET 434-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 22 | CHEVROLET 434-V8 DOME-2V | 2 |
| icon_premium.pdf | 22 | CHEVROLET 427-V8 FLAT TOP-1V | 2 |
| icon_premium.pdf | 22 | CHEVROLET 427-V8 DOME-1V | 3 |
| icon_premium.pdf | 23 | CHEVROLET 427-V8 DOME-1V | 4 |
| icon_premium.pdf | 23 | CHEVROLET 454-V8 FLAT TOP-1V | 2 |
| icon_premium.pdf | 23 | CHEVROLET 454-V8 CLOSED CHAMBER DOME-1V | 4 |
| icon_premium.pdf | 23 | CHEVROLET 454-V8 OPEN CHAMBER DOME-1V | 4 |
| icon_premium.pdf | 24 | CHEVROLET 489-V8 DISH-1V | 1 |
| icon_premium.pdf | 24 | CHEVROLET 489-V8 FLAT TOP-1V | 2 |
| icon_premium.pdf | 24 | CHEVROLET 489-V8 CLOSED CHAMBER DOME-1V | 4 |
| icon_premium.pdf | 24 | CHEVROLET 489-V8 OPEN CHAMBER DOME-1V | 4 |
| icon_premium.pdf | 25 | CHEVROLET 502-V8 DISH-1V | 1 |
| icon_premium.pdf | 25 | CHEVROLET 502-V8 FLAT TOP-1V | 3 |
| icon_premium.pdf | 25 | CHEVROLET 502-V8 CLOSED CHAMBER DOME-1V | 3 |
| icon_premium.pdf | 25 | CHEVROLET 502-V8 OPEN CHAMBER DOME-1V | 2 |
| icon_premium.pdf | 26 | CHEVROLET 540-V8 DISH-1V | 1 |
| icon_premium.pdf | 26 | CHEVROLET 540-V8 FLAT TOP-1V | 2 |
| icon_premium.pdf | 26 | CHEVROLET 540-V8 CLOSED CHAMBER DOME-1V | 3 |
| icon_premium.pdf | 26 | CHEVROLET 540-V8 OPEN CHAMBER DOME-1V | 3 |
| icon_premium.pdf | 27 | CHEVROLET 555-V8 DOME-1V | 1 |
| icon_premium.pdf | 27 | CHEVROLET 572-V8 DISH-1V | 2 |
| icon_premium.pdf | 27 | CHEVROLET 572-V8 FLAT TOP-1V | 1 |
| icon_premium.pdf | 27 | CHEVROLET 565-632 -V8 DOME-1V | 5 |
| icon_premium.pdf | 28 | CHRYSLER 318-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 28 | CHRYSLER 318-V8 DOME-2V | 1 |
| icon_premium.pdf | 28 | CHRYSLER 360-V8 DISH-2V | 1 |
| icon_premium.pdf | 28 | CHRYSLER 360-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 29 | CHRYSLER 360-V8 DOME-2V | 1 |
| icon_premium.pdf | 29 | CHRYSLER 390-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 29 | CHRYSLER 390-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 29 | CHRYSLER 408-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 30 | CHRYSLER 408-V8 STEP-DISH-2V | 3 |
| icon_premium.pdf | 30 | CHRYSLER 408-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 30 | CHRYSLER 408-V8 DOME-2V | 1 |
| icon_premium.pdf | 30 | CHRYSLER 383-V8 DOME - 2V | 1 |
| icon_premium.pdf | 31 | CHRYSLER 431/489-V8 DISH - 2V STROKER 383 | 1 |
| icon_premium.pdf | 31 | CHRYSLER 431/489-V8 DOME - 2V STROKER 383 | 1 |
| icon_premium.pdf | 31 | CHRYSLER 478-V8 DISH - 2V | 1 |
| icon_premium.pdf | 31 | CHRYSLER 478-V8 FLAT TOP - 2V | 1 |
| icon_premium.pdf | 32 | CHRYSLER 440-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 32 | CHRYSLER 440-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 32 | CHRYSLER 450-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 32 | CHRYSLER 450-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 33 | CHRYSLER 463-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 33 | CHRYSLER 463-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 33 | CHRYSLER 468-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 33 | CHRYSLER 468-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 34 | CHRYSLER 493-V8 STEP-DISH-2V | 2 |
| icon_premium.pdf | 34 | CHRYSLER 493-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 34 | CHRYSLER 498-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 34 | CHRYSLER 498-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 35 | CHRYSLER 505-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 35 | CHRYSLER 505-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 35 | CHRYSLER 512-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 35 | CHRYSLER 512-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 36 | CHRYSLER 520-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 36 | CHRYSLER 520-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 36 | CHRYSLER 541-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 36 | CHRYSLER 541-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 36 | CHRYSLER 572-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 37 | CHRYSLER 5.7L HEMI HEMI-2V 371 w/ 3.790" Stroke - 382 w/ 3.900" Stroke | 9 |
| icon_premium.pdf | 37 | CHRYSLER 6.1L HEMI HEMI-2V 391ci w/ 3.790" Stroke - 402ci w/ 3.900" Stroke | 6 |
| icon_premium.pdf | 37 | CHRYSLER 472-V8 HEMI-2V | 5 |
| icon_premium.pdf | 37 | CHRYSLER 528-V8 HEMI-2V | 1 |
| icon_premium.pdf | 38 | FORD / MERC FLATHEAD 258-293 V8 | 4 |
| icon_premium.pdf | 38 | FORD 4.6L-V8 SPHERICAL DISH | 3 |
| icon_premium.pdf | 38 | FORD 4.6L-V8 SPHERICAL DISH - 3V | 1 |
| icon_premium.pdf | 38 | FORD 4.6L-V8 FLAT TOP | 1 |
| icon_premium.pdf | 39 | FORD 4.9L-V8 SPHERICAL DISH - 2V or 4V STROKER 4.9L | 2 |
| icon_premium.pdf | 39 | FORD 4.9L-V8 DISH - 3V STROKER 4.9L | 2 |
| icon_premium.pdf | 39 | FORD 5.4L-V8 SPHERICAL DISH | 3 |
| icon_premium.pdf | 39 | FORD 5.4L-V8 SPHERICAL DISH - 3V | 1 |
| icon_premium.pdf | 40 | FORD 5.4L-V8 FLAT TOP | 1 |
| icon_premium.pdf | 40 | FORD 289-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 40 | FORD 289-V8 DOME-2V | 1 |
| icon_premium.pdf | 40 | FORD 302-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 41 | FORD 302-V8 DOME-2V | 2 |
| icon_premium.pdf | 41 | FORD 302-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 41 | FORD BOSS 302-V8 DOME-2V | 1 |
| icon_premium.pdf | 42 | FORD 331-V8 DISH-2V | 1 |
| icon_premium.pdf | 42 | FORD 331-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 42 | FORD 331-V8 DOME-2V | 1 |
| icon_premium.pdf | 42 | FORD 347-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 43 | FORD 347-V8 FLAT TOP LIGHTWEIGHT | 1 |
| icon_premium.pdf | 43 | FORD 347-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 43 | FORD 347-V8 DOME-2V | 1 |
| icon_premium.pdf | 43 | FORD 351W-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 44 | FORD 351W-V8 DOME-2V | 1 |
| icon_premium.pdf | 44 | FORD 369-V8 DOME-2V LIGHTWEIGHT | 1 |
| icon_premium.pdf | 44 | FORD 383-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 44 | FORD 383-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 45 | FORD 393-V8 STEP-DISH-2V | 2 |
| icon_premium.pdf | 45 | FORD 393-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 45 | FORD 393-V8 DOME-2V | 1 |
| icon_premium.pdf | 46 | FORD 393-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 46 | FORD 408-V8 DISH-2V | 1 |
| icon_premium.pdf | 46 | FORD 408-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 46 | FORD 408-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 47 | FORD 418-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 47 | FORD 418-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 47 | FORD 427-V8 DISH-2V | 1 |
| icon_premium.pdf | 48 | FORD 351C-V8 DISH-1V | 1 |
| icon_premium.pdf | 48 | FORD 351C-V8 FLAT TOP-1V | 2 |
| icon_premium.pdf | 48 | FORD 377-V8 STEP-DISH-1V | 2 |
| icon_premium.pdf | 48 | FORD 377-V8 FLAT TOP-1V | 1 |
| icon_premium.pdf | 49 | FORD 387-V8 STEP-DISH-1V | 1 |
| icon_premium.pdf | 49 | FORD 387-V8 FLAT TOP-1V | 1 |
| icon_premium.pdf | 49 | FORD 402-V8 STEP-DISH-1V | 2 |
| icon_premium.pdf | 49 | FORD 402-V8 FLAT TOP-1V | 1 |
| icon_premium.pdf | 50 | FORD 390-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 50 | FORD 410-V8 DISH-2V | 1 |
| icon_premium.pdf | 50 | FORD 427-V8 DISH-2V | 1 |
| icon_premium.pdf | 50 | FORD 427-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 51 | FORD 428-V8 DISH-2V | 1 |
| icon_premium.pdf | 51 | FORD 428-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 51 | FORD 438-V8 DISH-2V | 1 |
| icon_premium.pdf | 51 | FORD 444-V8 DISH-2V | 1 |
| icon_premium.pdf | 52 | FORD 444-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 52 | FORD 452-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 52 | FORD 452-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 52 | FORD 455-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 53 | FORD 482-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 53 | FORD 482-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 53 | FORD 429-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 53 | FORD 460-V8 STEP-DISH-1V | 3 |
| icon_premium.pdf | 54 | FORD 460-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 54 | FORD 502-V8 STEP-DISH-1V | 1 |
| icon_premium.pdf | 54 | FORD 502-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 54 | FORD 520-V8 STEP-DISH-1V | 2 |
| icon_premium.pdf | 55 | FORD 520-V8 DISH-1V | 2 |
| icon_premium.pdf | 55 | FORD 520-V8 STEP-DISH-1V | 2 |
| icon_premium.pdf | 55 | FORD 520-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 55 | FORD 520-V8 FLAT TOP-1V | 1 |
| icon_premium.pdf | 56 | FORD 520-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 56 | FORD 545-V8 STEP-DISH-1V | 4 |
| icon_premium.pdf | 56 | FORD 545-V8 DISH-1V | 2 |
| icon_premium.pdf | 57 | FORD 545-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 57 | FORD 545-V8 FLAT TOP-1V | 1 |
| icon_premium.pdf | 58 | FORD 545-V8 FLAT TOP-2V | 2 |
| icon_premium.pdf | 59 | PONTIAC 400-V8 DISH-2V | 1 |
| icon_premium.pdf | 59 | PONTIAC 400-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 59 | PONTIAC 428-V8 DISH-2V | 1 |
| icon_premium.pdf | 59 | PONTIAC 433-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 60 | PONTIAC 455-V8 DISH-2V | 1 |
| icon_premium.pdf | 60 | PONTIAC 455-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 60 | PONTIAC 468-V8 STEP-DISH-2V | 1 |
| icon_premium.pdf | 60 | PONTIAC 468-V8 DISH-2V | 1 |
| icon_premium.pdf | 61 | PONTIAC 468-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 61 | PONTIAC 495-V8 DISH-2V | 1 |
| icon_premium.pdf | 61 | PONTIAC 495-V8 FLAT TOP-2V | 1 |
| icon_premium.pdf | 61 | PONTIAC 505-V8 FLAT TOP-2V | 1 |

## Not extracted / skipped

- Before this script existed, the same robots.txt, catalogs page and PDFs (plus `Claimer 12.20.20.pdf`, which is the same 50-page KB/Claimer catalog) were fetched once by hand with curl on 2026-10-16, 6 s apart, same UA; the script's own downloads above returned byte-identical files. The one 404 in the log was a wrong relative-URL join on the first scripted run, fixed and not retried.
- **KB 12.20.20 (1).pdf (50 pp) and the Claimer PDF beside it are scanned images**: only the cover, contents and tech-tip pages have a text layer; the Claimer (pp 6–8) and Hypereutectic (pp 10–47) application pages and the KB numerical listing (pp 48–49) have none. There is no OCR engine in this environment (no tesseract, no PyMuPDF/OCR packages install without network), so the 2020 KB range is not extracted. KB rows come only from the 2026 supplement (p 13): AMC 4.6L stroker, Ford 351M/400 and a Holden 383 kit. Follow-up: OCR the KB PDF locally (or ask UEM for a text PDF) — expect several hundred KB part numbers.
- The 2025 supplement (rev G) was downloaded for a diff: it lists `KB438C` / `KB442C` (AMC 4.6L, KTM kits) that the 2026 supplement no longer shows; everything else in 2025 is in 2026. Only 2026 is parsed.
- ICON Sport Compact pages (catalog pp 77–85; Chrysler 2.4, Ford 2300, Honda, Mitsubishi, Nissan, Subaru, Toyota) are a separate PDF that was not downloaded; their listing rows are skipped: IC629C, IC637C, IC638C, IC679LCA, IC683LCA, IC684LCA, IC939, IC946, IC985, IC986, IC987, IC992C. The 2026 supplement sport-compact pages (10–12: BMW B48/B58, Ford Barra, Honda K24, Mitsubishi, Subaru) are skipped for the same reason (no import families in the fitment list).
- 2026 supplement pp 14–17 (Silvolite OEM-replacement cast pistons by year range), pp 20–21 (Speed of Air kits), pp 22–34 (ring sets by bore) and p 35 (Dualoy overhaul kits) are not extracted; rings would be a `ring` follow-up.
- Icon_catalog.pdf p 4 (piston-and-ring-kit PN table) and p 62 (notes) carry no piston specs.
- Marketing text (features, alloy descriptions) is not stored.

## Needs human QA

- IC695C (icon_premium.pdf p53): no crown volume printed ('FT-1V')
- IC959 (icon_premium.pdf p11): 1 CR values for chamber header []; kept positional
- IC979 (icon_premium.pdf p11): 1 CR values for chamber header []; kept positional
- IC958 (icon_premium.pdf p11): 1 CR values for chamber header []; kept positional
- IC960 (icon_premium.pdf p11): 1 CR values for chamber header []; kept positional
- IC9952 (icon_fhr.pdf p13): 1 CR values for chamber header ['96.5', '105', '119']; kept positional
- IC430CA (supplement p6): head type Dome with negative crown cc -0.6; stored as printed (net dish)
- IC802: diametrical listing CH 1.825 vs catalog CH 1.805; catalog kept
- IC803: diametrical listing CH 1.825 vs catalog CH 1.805; catalog kept
- IC829: diametrical listing bore 4.342 vs catalog bore 4.32 (Mopar B/RB big block); catalog kept
- IC837: diametrical listing bore 4.375 vs catalog bore 4.342 (Mopar B/RB big block); catalog kept
- IC843: diametrical listing bore 4.342 vs catalog bore 4.32 (Mopar B/RB big block); catalog kept
- IC848: diametrical listing CH 1.608 vs catalog CH 1.612; catalog kept
- IC856: diametrical listing CH 1.515 vs catalog CH 1.575; catalog kept
- IC959: diametrical listing CH 2.325 vs catalog CH 2.307; catalog kept
- IC960: diametrical listing CH 2.0 vs catalog CH 1.932; catalog kept
- IC970: diametrical listing CH 1.13 vs catalog CH 1.125; catalog kept
- IC972: diametrical listing CH 1.13 vs catalog CH 1.125; catalog kept
- IC9916: diametrical listing CH 1.425 vs catalog CH 1.433; catalog kept
- IC9941: diametrical listing CH 1.443 vs catalog CH 1.425; catalog kept
- IC9975: diametrical listing CH 1.27 vs catalog CH 1.812; catalog kept

## Validation

Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a brand and family (Dualoy: per family and year range); numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.

- passed
