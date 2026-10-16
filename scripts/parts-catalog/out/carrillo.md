# CP-Carrillo diesel brochure — extraction notes

Task `CARRILLO` from `scripts/parts-catalog/CLOUD_TASKS.md`. Extractor:
`scripts/parts-catalog/extract_carrillo.py`. Output: `scripts/parts-catalog/out/carrillo.json`.
Extracted 2026-10-16.

## Source and fetching

- `https://www.cp-carrillo.com/robots.txt` (HTTP 200, generated 2026-10-16): only cart, checkout,
  account, wishlist and search paths are disallowed; no `Crawl-delay`. `/files/` is allowed.
- `https://www.cp-carrillo.com/files/diesel-brochure-finalv3email.pdf`: HTTP 200, `application/pdf`,
  3,460,778 bytes, sha256 `a537243015d1d473432293141b540396b8acdcf154cbf8a41344945297c4c1dc`.
  Saved under `scripts/parts-catalog/dl/carrillo/` (gitignored).
- 2 requests total (robots.txt, then the PDF 6 s later). No HTML pages were crawled.
- **The brochure is undated.** Nothing on its pages carries an edition or year. PDF metadata
  gives CreationDate 2016-09-06 and ModDate 2016-09-07 (Adobe Illustrator CC 2015), and the
  Cummins piston table says "Coming Winter 2016", so treat it as a 2016 document. `src.edition`
  is recorded as `"undated"`; the metadata date is in the top-level `source.pdfCreationDate`.
  Current CP-Carrillo availability, part numbers and specs may differ.

## What was parsed

4 pages. Page 1 is artwork (no text), page 4 is the distributor footer. pdfplumber
`extract_tables()` on pages 2–3 returns the five `Part # | ID | description` tables cleanly
(blank spacer rows skipped):

| Brochure table | page | PNs | records | cat |
|---|---|---|---|---|
| GM Duramax Rods | 2 | 8 | 8 | rod |
| 5.9/6.7 Cummins Rods | 2 | 14 | 36 | rod |
| Ford Powerstroke Rods | 2 | 8 | 8 | rod |
| GM Duramax Pistons | 2 | 8 | 8 | piston |
| 5.9 Cummins Pistons | 2 | 4 | 5 | piston |
| Duramax 6.6 (hybrid kits) | 3 | 2 | 2 | pistonKit |
| Cummins 5.9 (hybrid kits) | 3 | 2 | 2 | pistonKit |
| **Total** | | **46** | **69** | |

46 distinct part numbers, identical to the set in
`scripts/catalog-probes/probe_diesel/samples/carrillo_rods.csv`. 69 records because a part that
fits several families is emitted once per family with the same `p` (the uniqueness check in the
extractor is on `(m, p, fit.fam)`). Rows skipped: none.

## How fields were derived

- **Rod length** is not a table column. It is encoded in the part number: the four digits before
  `B7H`/`B7S` (`..._6418B7H` → 6.418) or after `>-7` in the older Ford PNs (`F-PS60>-76929H` →
  6.929). Cross-checked against the brochure's own wording: 6.620 = Duramax 6.418 + 0.202
  ("0.202 longer", p3), 7.639 = Cummins 7.559 + 0.080 ("0.080 Longer"), 8.415 = 7.559 + 0.856
  ("0.856 longer", p3), 8.559 = 7.559 + 1.000 ("1 Longer Deck Plate Rod"). Stock lengths 6.418
  (Duramax), 7.559 (Cummins B), 6.929 (Powerstroke 6.0/6.4), 7.130 (7.3) and 6.969 (6.7) all match.
- **Bolt**: PN suffix `H` = WMC-H7 (H11, 220 ksi UTS), `S` = CARR-S7 (MP35N, 285 ksi UTS), per
  the rod text on p2. Stored in `spec.bolt`.
- **Rod material** "4330M forged" and **piston alloy** "2618 forged, hard anodized" are blanket
  statements on p2 applied to every rod / piston. `spec.ringPack` ("1/16 or 2.0mm top, 2.0mm
  second, 3.0mm 2-pc oil") is likewise the p2 blanket statement for the piston line.
- **Pin**: only where the brochure states it. 1.156 on the Duramax TF rods and DHR7030 piston
  (stated). 1.358 on the CR_A59DM 8.415 rods is cross-referenced: the rod row says "with Duramx
  Pin", and the DH7100 piston/kit rows say "1.358 pin with 8.415 Carrillo rod". Other rods: omitted.
- **Beam type** is not stated anywhere in the brochure; `spec.beam` is omitted rather than
  guessed. Big-end diameter and rod weight are not given.
- **Pistons**: D7000–D7021 rows are `bore CH CR`. DHR7030 / DR7021 / DH7100 give bore, CR and a
  dish in inches (`-.410 Dish`), stored as `spec.dishDepth` (positive inches, not cc; `domeCc`
  is omitted because no volume is given). DH7101–DH7103 give `bore x CH CR`.
- **Compression ratio** is quoted unconditionally (diesel, no chamber-cc dependence), so `spec.cr`
  is a plain number rather than the chamber-keyed object used for gas pistons. Same convention as
  the MAHLE diesel sample.
- **Hybrid kits** (`DHR7030PRKH/S`, `DH7100PRKH/S`) are `cat: "pistonKit"` with
  `spec.components.piston` and `spec.components.rod`. The piston PN is in the kit name. The rod PN
  is inferred: the only 6.620 rod with a 1.156 pin is `GM_B66TF_0HS_6620B7H/S`, and the only
  8.415 rod is `CR_A59DM_1HS_8415B7H/S`; the kit's bolt letter picks H vs S.
- **Catalog ID** (the brochure's `ID` column, e.g. 9321) is stored as `src.id`. DH7101–DH7103 and
  the four kits have no ID in the brochure; the key is omitted for them.
- **Fitment families** (all in the shared family list):
  - "GM Duramax" → `Duramax 6.6` (ci 403, 8 cyl). LML / HD variants noted in `fit.notes`.
  - "Dodge/Cummins 5.9/6.7L" → `Cummins 5.9 12V`, `Cummins 5.9 24V/CR`, `Cummins 6.7`.
  - "Dodge/Cummins 5.9L" (8.415 hybrid rods) → `Cummins 5.9 12V` and `Cummins 5.9 24V/CR`.
  - "Cummins 6.4L — 5.9L crank in 6.7L block" → `Cummins 6.7` only, ci 390, noted.
  - DH7100 and its kits say "5.9L ISB-CR" → `Cummins 5.9 24V/CR` only.
  - DH7102 "Sleeved Down 6.7L" and DH7103 "6.7L" → `Cummins 6.7`.
  - Ford → `Powerstroke 7.3` / `6.0` / `6.4` / `6.7` by the litre figure in the description.
- `emissions` is `null` for all (internal parts).

## Needs human QA

1. **Cummins 12V vs 24V**: the brochure never distinguishes them. Every 5.9 rod and the DH7101
   piston are emitted for both families with a note. Confirm with CP-Carrillo whether the 12V
   (6BT) application is covered, especially for the 8.415 hybrid rods (DH7100 is ISB-CR only).
2. **Pin 1.358 on CR_A59DM rods** is cross-referenced from the DH7100 kit rows, not stated on
   the rod rows themselves.
3. **Kit rod PNs** are inferred from length + pin, not printed in the kit rows.
4. **DH7101–DH7103** were "Coming Winter 2016" with no ID when the brochure was made; verify they
   were released and the specs held.
5. **Dish values** (`-.410`, `-.440`, `-.420`) are read as dish depth in inches. The brochure gives
   no bowl volume.
6. **Date**: the brochure is undated (see above); every spec here may be superseded.
7. `cr` as a plain number and `dishDepth` / `rodLength` / `components` are keys outside the
   CLOUD_TASKS spec table; adjust downstream if a different convention is adopted.
