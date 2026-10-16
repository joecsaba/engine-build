# LIFTERS — Morel (John Callies Inc.) + Johnson Lifters

Extracted 2026-10-16 by `scripts/parts-catalog/extract_lifters.py`. Output `out/lifters.json`,
429 records (`cat: lifter`), one record per part number per engine family.

| brand | records | distinct PNs | hydraulic roller | solid roller |
|---|---|---|---|---|
| Morel | 315 | 247 | 90 | 225 |
| Johnson Lifters | 114 | 91 | 101 | 13 |

## What was fetched

- `robots.txt` on both hosts: no `Crawl-delay` for our UA, product pages not disallowed. The
  extractor still spaces requests 6 s apart per host.
- **Morel**: one page, `https://www.johncalliesinc.com/morel_products.php` (111 KB, 41 HTML
  tables under `div.CatalogSectionHeader` headings, columns `Set# | Pair# | BodyD | RollD |
  Description | Avail`). The first request got **HTTP 409** with a one-line JavaScript
  cookie-setter (`humans_21909=1` + reload), i.e. a light bot gate. Per the ground rules it was
  not retried or bypassed with the cookie; a later plain GET from the same session returned the
  full page (200), which is what was parsed. The extractor treats a 409 / cookie-challenge
  response as "stop this source" and only re-fetches with `--refresh`, so a re-run uses the cached
  copy in `dl/lifters/`. Per-set `product.php?ProductNo=` pages exist (linked as `src.url`) but
  were not crawled; the table already carries every spec column.
- **Johnson**: the two listing pages (`/Products/Hydraulic-Roller-Lifters`, 22 tables;
  `/Products/Solid-Roller-Lifters`, 7 tables; columns `PN | (blank) | description | MSRP`) and the
  91 per-part pages they link to (`johnsonlifters.com/Products/<listing>/<PN>`; the `www` `.aspx`
  links 301 there). Request count: 8 during inspection + 93 in the extractor run (robots, 2
  listings, 91 detail pages). Everything is cached under `dl/lifters/` (gitignored); the
  committed JSON came from a cache-only re-run.

## Row counts per family

Morel (catalog heading → records): SBC mech 38, SBC hyd 8, SBC factory replacement 6 (2 PNs ×
SBC/LS/LT), LS mech 29, LS hyd 12, BBC mech 58 and BBC hyd 18 (each BBC PN emitted for both
`Chevy Mark IV big block` and `Chevy Gen VI big block`), AMC V8 5, Cadillac 1, Buick 401-425-455
3, Buick 350 1, Buick turbo V6 2, Olds 2, Holden 1, Chevy 348-409 5, Pontiac V8 13, Pontiac 4-cyl
1, NASCAR keyed 2, Chrysler mech 16, Chrysler hyd 10, Chrysler top alcohol 4, Viper 4, Ford SB mech
28 + 7 discontinued, Ford BB/FE mech 18 + 5 discontinued, Ford SB/BB hyd 18. Nine headings have
empty tables on the site (AMC I-6, Chevy I-6, Ford 300 I-6, BBC spread bore, and the
"- DISCONTINUED" sections) and produced nothing.

Johnson hydraulic (heading → PNs): GM drop-in 2, GM small block 8, GM big block 9, LS 6, LS 6-bolt
head 6, Buick V6 2, Olds/Pontiac 4, GM 409 2, Nailhead 2, Cadillac 500 4, Ford SB 4, Ford BB 4,
Chrysler SB 2, Chrysler BB 4, Gen III Hemi 4, Viper Gen 1-3 2, Viper Gen IV 6, Dodge Hemi 2,
DeSoto Hemi 2, AMC 2, Harley 1, Powerstroke 2. Johnson solid: GM SB 2, GM BB 2, Ford SB 2, Ford BB
2, Chrysler SB 1, Chrysler BB 1, AMC 1.

## Mapping decisions

- Morel `p` = **Set#** (16-lifter set). The pair number is kept in `spec.pairPn` (two numbers
  when a set mixes left/right offset pairs). Avail / MSRP are not stored.
- `spec.style` from the row text (`HYD` / `MECH`) and otherwise from the section heading.
  Under the "HYD & MECH" headings every row says which it is, except Morel's U/P, Black Mamba,
  Pro Sportsman, keyed and NASCAR lines, which are all mechanical-roller designs and are tagged
  `solid_roller`.
- Morel abbreviations decoded into `spec`: `T/B` → `linkBar: true` (`+.300 T/B` → `tieBarRaise`),
  `KEYED/KEYWAY` → `keyed: true, linkBar: false`, `O/C` → `offset: 0`, `(.150 L&R INT O/S)` →
  `offset`, `offsetSide`, `offsetValve`, `W/DLC` / `W/O DLC` → `dlc`, `LIMITED TRAVEL` →
  `travelType: limited`, `W/PUSHROD OIL` / `NO PUSHROD OIL` → `pushrodOil`, `BEARING/BUSHING UFRS` →
  `bushed`, `(2.00 BORE SPACE)` → `boreSpacing`, series names → `series`. `U/P` and `P/O` are
  not decoded (not confirmed what Morel means by them). The raw catalog line is kept verbatim in
  `spec.catalogDesc` so the decoding can be checked; it is spec shorthand, not marketing copy.
- Morel fitment notes in `fit.notes` only where the row states them (5/6-bolt head pattern,
  lifter-bore bushings required, 302 head removal, Magnum + early LA, race only, 5W-40 limit,
  discontinued date).
- Family mapping worth knowing: Morel "BBC" → both Mark IV and Gen VI (same lifter bore and
  spacing; Morel does not distinguish). "LS & GEN V-LT" → `GM LS` + `GM LT (Gen V)`; plain "LS" →
  `GM LS` only. "SBC STK REP 87-93 5.0/5.7/4.3 & LS, LT" → SBC (y 1987–1993) + LS + LT. Ford
  "WIND" → Windsor, "CLEV" → 351C/351M/400, "WIND & CLEV" → both; "BB 429-460" → Ford 429/460,
  "(FE)" → Ford FE, "BB & FE" → both. "MOPAR A" → `Mopar LA small block` only; `Mopar Magnum
  5.2/5.9` is added only where Morel says "FITS MAGNUM ENGS". "BUICK 401-425-455" → `Buick big
  block` with `ci [401,425,455]` (401/425 are Nailheads; Morel sells one set for all three).
  Johnson "GM Big Block" → both BBC families; "Chrysler Gen.III Hemi" → both Gen III Hemi families
  (same drop-in lifter); "Olds/Pontiac" → both families; "Chrysler Big Block" sets whose detail
  page says "& late style Hemi 426" also get `Chrysler 426 Hemi`.
- Johnson `spec`: `travelType` (reduced / short / standard) from the description, `tall: 0.3` for
  ".300 Tall", `axleOiling`, `reducedSeatHeight`, `dropIn` (+ `linkBar: false`), `bodyDia` only
  where the text states .842/.903 etc. Johnson gives no body or roller diameter for most parts,
  so those keys are absent rather than guessed.
- Johnson detail pages: APPLICATION tab is stored in `fit.applications` when it is a single line
  (8 parts) or for the GM drop-in parts (2110R lists 14 GM engines 1985–2005+; families SBC
  1994–1999, LS 1997+, Buick V6 1987–1999 derived from it). The DESCRIPTION tab is mostly a
  restated title and was used only for `.400 Max Lobe Lift` (drop-in), `.300 taller`, and
  "Centered Pushrod Seat".

## Rows skipped / de-duplicated

- Morel 7717 and 7790 appear in both "CHEVY SB HYD ROLLER FACTORY REPLACEMENT" and "CHEVY LS HYD
  ROLLER" tables — one record per family kept (6 duplicate rows dropped).
- 13 Morel records are marked `spec.discontinued: true` (`Avail = N\A` or "DISCONTINUED" in the
  row or heading); they are kept because the part numbers still circulate.
- Nothing else was skipped; every Morel row parsed with numeric body/roller diameters and every
  Johnson row has a part number matching `[A-Z]{0,2}\d{4}...`.

## Needs human QA

- **Unknown families** (catalog's own name kept in `fit.fam`): Morel — `Holden V8` (5337),
  `Pontiac 4-cyl Super Duty` (7774), `Chevrolet R07 (NASCAR)` (7755, 7754), `CHRY TOP ALCOHOL
  MECHANICAL ROLLER LIFTERS` (5446 2.00" bore-space alcohol, 4849 Pro Mod 1.000" body, 4552 Top
  Fuel 1.063" body), `Dodge Viper V10` (6434, 6633, 6436, 6438). Johnson — `Buick Nailhead`
  (2112NHR, ST2112NHR), `Dodge Viper V10 Gen 1-3` / `Gen IV` (8 PNs), `Dodge early Hemi 315/325`,
  `DeSoto Hemi 330/341/345`, `Harley-Davidson` (2412, motorcycle), `Powerstroke Diesel` (6200,
  ST6200 — the site never says 7.3 / 6.0 / 6.4; 7.3 is likely but not stated).
- Johnson detail pages contain copy-paste errors: 2136SBR (a .903 tie-bar SBC set) shows the
  2110R drop-in application list and ".400 max lobe lift" (ignored, flagged by the script);
  2510R's page shows Gen III Hemi 2326 text; 3116BB's page is titled 3116SB; ST2311DG's page says
  "2311DG326". None of that was carried into records, but the listing-level descriptions are the
  only trusted Johnson text.
- Johnson 2110R ("Dog Bone/Trays") is assigned to SBC + LS + Buick V6 from its application list;
  the list also names the Pontiac 2.5 Iron Duke, Olds-based Cadillac 5.0/5.7 and the 4.3 V6, which
  have no family in the shared list and live only in `fit.applications`.
- Johnson 2510R ("Dog Bone BBC") is mapped to `Chevy Gen VI big block` only (OE drop-in style
  implies a factory roller block).
- Morel "SBC/BUICK" sets (4914, 6697, 6481, 4989, 6715, 6657) are SBC records with
  `fit.notes: also listed for Buick`; Morel does not say which Buick.
- Morel 4.3 V6 in the stock-replacement rows (7717, 7790) has no family in the shared list.
- Johnson prices are a 2021-04-01 price table; `src.doc` says so. Not stored.
