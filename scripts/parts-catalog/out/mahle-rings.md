# MAHLE Performance Piston Rings 2022 (PR-40-22) extraction notes

- Source: `pr-40-22.pdf` (84 pages, text layer; manual download under `Catalogs/`, no network). Edition 2022 (PR-40-22, supersedes PR-40-16; PDF created 2023-01-04).
- Extracted 2026-10-17 with `extract_mahle_rings.py` (PyMuPDF text; set pages 25-38, nitro page 24, open stock pages 41-78; printed page = PDF page - 1).
- 1510 records, all `cat: ring`, all `fit.fam: Universal` (the catalog lists rings by bore only; it names no engine families).
  - 284 engine ring sets (310-xxxx claimer, 315-xxxx performance) from the set tables.
  - 1226 open stock rings (300/301/302/303-xxxx, one position each), 10 repeated PNs collapsed.

## Set rows per catalog section

- Claimer Race Applications: 20
- PC479 Fire-Power Ring Sets: 26
- Gas Nitride Steel Ring Sets: 101
- Plasma-Moly Steel Ring Sets: 108
- Plasma-Moly Ductile Ring Sets: 13
- Metric Ring Sets: 16

## Field notes

- Set widths come from the table heading (top, second, oil). Fractions are converted to decimal inches (1/16 = 0.0625, 5/64 = 0.0781, 3/16 = 0.1875); metric widths stay in mm. `spec.units` is `in`, `mm` or `mixed`; `spec.widthUnits` gives the unit per ring and `spec.widthsPrinted` the catalog text.
- `spec.oversize` is the set PN suffix (.005/.030/.035/.065 over the series' nominal bore; 0 when there is no suffix). `spec.nominalBore` = bore - oversize for inch sets.
- `spec.style`: inch sets listed at +.005 over an oversize step (4.005, 4.035, 4.065 ...) are MAHLE's file-fit sets; sets at the plain oversize (4.000, 4.030, 4.060 ...) are standard-gap drop-in sets. This follows the catalog's selection guide (p20: 'Std Gap Sets' vs 'File Fit Sets') and the +.005 naming convention; the set tables themselves do not print the words. Metric sets get no style.
- `spec.components` holds the top/second/oil ring PNs and radial walls printed in the set row, plus material/face/ringType/tension joined from the open stock listing when the PN appears there. `spec.material`/`spec.face` are taken from the top ring's open stock entry, else from the heading.
- Open stock rings: `spec.position` top/second/oil (UCR/LCR/OCR), `spec.width` + `spec.widthUnits` (axial height as printed), `spec.radialWall`, `spec.ringType` (MAHLE type code, e.g. RF-13PF), oil `spec.tension`, `spec.style: open-stock`.
- Set size is not printed anywhere in the catalog, so no `cylinders` value is emitted.
- `«` discontinued marks are kept as `spec.discontinued: true`; `l` new-number bullets are dropped. A printed `B` suffix (bulk packaging) is stripped from `p` and kept in `spec.printedPn`.
- Skipped: technical pages, ring-code tables (PDF 39-40), Hastings interchange (79-82), measurement equivalents (83-84).

## Rows skipped (0)

- none

## Repeated open stock PNs (10)

- 300-0199: pages [24]
- 301-0060: pages [24]
- 301-0236: pages [24]
- 301-0271: pages [24]
- 301-0886: pages [24]
- 301-1273: pages [24]
- 303-0133: pages [24]
- 303-0186: pages [24]
- 303-0241: pages [65]
- 303-1000: pages [24]

## QA (29)

- 303-0241: repeated on p49 and p65 with different data; p49 kept (bore 4.0/4.187; width 4.0/3.0; radialWall 0.156/0.154; tension 'standard'/'low')
- 301-0271: repeated on p65 and p24 with different data; p65 kept (bore 4.187/4.19; width 0.0781/0.078; material 'ductile iron'/'PC479 hardened ductile iron'; face 'Plasma-Moly'/'PM251')
- 301-0236: repeated on p66 and p24 with different data; p66 kept (ringType 'PB-19'/'PB-18')
- 301-0886: repeated on p65 and p24 with different data; p65 kept (ringType 'PB-19'/'PB-18')
- 300-0199: repeated on p66 and p24 with different data; p66 kept (width 0.0781/0.078; position 'top'/'second')
- 303-1000: repeated on p65 and p24 with different data; p65 kept (ringType 'MCL-42NGAW'/'MCL-42NG-AW')
- 303-0133: repeated on p65 and p24 with different data; p65 kept (bore 4.185/4.19)
- 303-0186: repeated on p65 and p24 with different data; p65 kept (bore 4.187/4.19)
- 310-0003.030: heading material 'ductile iron' vs top ring 301-1105 open stock 'SAE 9254 carbon steel'; open stock kept, heading in spec.headingMaterial
- 315-0008.035: heading material 'PC479 hardened ductile iron' vs top ring 301-1217 open stock 'SAE 9254 carbon steel'; open stock kept, heading in spec.headingMaterial
- 315-0008.035: heading tension high vs oil ring 303-0162 open stock low
- 315-0014.005: heading material 'stainless steel' vs top ring 300-0180 open stock 'ductile iron'; open stock kept, heading in spec.headingMaterial
- 315-0014.005: heading tension ultra-low vs oil ring 303-0278 open stock low
- 315-0178.085: oil ring 303-0080 is listed in open stock for 4.070 bore, set bore 4.085
- 315-0107.005: heading tension low vs oil ring 303-0361 open stock standard
- 315-0120.065: heading tension low vs oil ring 303-0121 open stock standard
- 315-0080.025: heading tension standard vs oil ring 303-0749 open stock high
- 315-0066.065: heading tension ultra-low vs oil ring 303-0079 open stock low
- 315-0060.030: heading tension standard vs oil ring 303-0075 open stock low
- 315-0002.005: heading tension low vs oil ring 303-0134 open stock standard
- 315-0032.040: heading material 'SAE 9254 carbon steel' vs top ring 300-0111 open stock 'ductile iron'; open stock kept, heading in spec.headingMaterial
- 315-0029.005: heading material 'SAE 9254 carbon steel' vs top ring 300-0181 open stock 'ductile iron'; open stock kept, heading in spec.headingMaterial
- 315-0029.060: heading material 'SAE 9254 carbon steel' vs top ring 300-0180 open stock 'ductile iron'; open stock kept, heading in spec.headingMaterial
- 315-0034.045: heading material 'SAE 9254 carbon steel' vs top ring 300-0230 open stock 'ductile iron'; open stock kept, heading in spec.headingMaterial
- 315-0122.045: heading material 'ductile iron' vs top ring 301-1193 open stock 'stainless steel'; open stock kept, heading in spec.headingMaterial
- 315-0105.005: heading material 'ductile iron' vs top ring 301-1124 open stock 'SAE 9254 carbon steel'; open stock kept, heading in spec.headingMaterial
- 315-0028: heading material 'ductile iron' vs top ring 300-0214 open stock 'grey iron'; open stock kept, heading in spec.headingMaterial
- 315-0028.060: heading material 'ductile iron' vs top ring 300-0218 open stock 'grey iron'; open stock kept, heading in spec.headingMaterial
- set component PNs not found in open stock (material/face left to heading): {'top': 23, 'second': 27, 'oil': 12}

## Validation (0 errors)

- no duplicate (p, cat, fam); every record has m p cat fit.fam src; numeric fields numeric; no empty strings
