# Lunati rotating assemblies - extraction notes

Source: `Catalogs/Lunati-Rotating-Assemblies.pdf` (36 PDF pages; catalog dated 2013, PDF created 2013-11-25; saved by hand under `Catalogs/`, no network used). PDF page = printed page + 2. **The catalog is a 2013 edition**: part numbers and specs may have changed since; `src.edition` is `2013` on every record.

Records: 325 (313 unique part numbers; a part listed for several engine families is repeated once per family).

## Counts

| cat | records |
|---|---|
| crank | 128 |
| rod | 54 |
| rotatingAssembly | 143 |

| cat / series | records |
|---|---|
| crank / Signature Blower Series | 30 |
| crank / Signature Series | 73 |
| crank / Voodoo | 25 |
| rod / Racer Series | 15 |
| rod / Signature Series | 14 |
| rod / Voodoo | 25 |
| rotatingAssembly / Signature Series | 75 |
| rotatingAssembly / Voodoo | 68 |

| cat / fit.fam | records |
|---|---|
| crank / Chevy Gen VI big block | 3 |
| crank / Chevy Mark IV big block | 25 |
| crank / Ford 429/460 | 3 |
| crank / Ford Modular | 2 |
| crank / GM LS | 49 |
| crank / GM LT (Gen V) | 4 |
| crank / Small-block Chevy | 26 |
| crank / Small-block Ford (Windsor) | 16 |
| rod / Chevy Gen VI big block | 11 |
| rod / Chevy Mark IV big block | 11 |
| rod / Chrysler Gen III Hemi 5.7/6.1 | 1 |
| rod / Chrysler Gen III Hemi 6.2/6.4 | 1 |
| rod / Dodge Viper V10 (catalog heading) | 1 |
| rod / GM LS | 8 |
| rod / Small-block Chevy | 17 |
| rod / Small-block Ford (Windsor) | 4 |
| rotatingAssembly / Chevy Mark IV big block | 36 |
| rotatingAssembly / Ford 429/460 | 7 |
| rotatingAssembly / GM LS | 30 |
| rotatingAssembly / Small-block Chevy | 46 |
| rotatingAssembly / Small-block Ford (Windsor) | 24 |

Rows parsed: rotating assemblies 143, cranks 128, rods 45 (before de-duplication).

### Spec coverage

- **crank** (128 records): heatTreat 128, mainJournal 128, material 128, minRodLength 128, notes 128, rodJournal 128, rodJournalWidth 128, rodType 128, series 128, stroke 128, snout 56, rearSeal 54, reluctor 53, mainSize 45, blowerSnout 30, centerCounterweights 28, rodJournal283 3
- **rod** (54 records): beam 54, bigEnd 54, bigEndWidth 54, bolt 54, length 54, material 54, pin 54, series 54, setOf 54, weight 54, pinEnd 14, strokerClearance 1
- **rotatingAssembly** (143 records): balanced 143, bearingsIncluded 143, bore 143, chamberCc 143, cr 143, crankMaterial 143, crankPn 143, mainJournal 143, pistonAlloy 143, pistonClass 143, pistonMfg 143, pistonPn 143, pistonStyle 143, ringsIncluded 143, rodBeam 143, rodJournal 143, rodLength 143, rodMaterial 143, rodPn 143, series 143, stroke 143, pistonTop 142, deckHeight 97, rearSeal 82, mainSize 70, valveReliefs 39, reluctor 30

## Method

- Every PDF page's text layer holds the whole two-page spread (right half at x > 603 on the left page, left half at x < 0 on the right page). Spread tables (rotating assemblies, cranks) are read from the uncropped left page so each row is one joined line; x < 0 words are dropped.
- Rotating assemblies: section heading gives the application and the chamber cc the compression ratio is quoted at (`spec.cr` is keyed by that cc). Displacement (`fit.ci`) is the page's own 'engine size' label nearest the computed bore x stroke value (must agree within 1.2 %). Main and rod journal sizes are filled from the crank table by crank PN. Deck height / main-size cells and piston-style cells that wrap onto neighbouring lines are re-joined by column position.
- Cranks: the application comes from the part-number family code (digits 2-3: 01/02 SBC, 03/08 LS 24/58-tooth, 09/10 LS7 long snout, 55/15 LT1 short/long snout, 04 BBC with centre counterweights, 64/61 BBC without, 05 SBF 302 main, 06 SBF 351C main, 07 BBF 460 main, 12 4.6 Modular), cross-checked against the heading placed at the centre of each row group. `rearSeal`, `reluctor` and `mainSize` come from the notes column. Big-block cranks are filed under Mark IV (2-pc seal) or Gen VI (1-pc seal). `minRodLength` is Lunati's 'minimum rod length' (counterweight clearance), not a fitment constraint.
- Rods: `bigEnd` is the crank journal diameter (the brief's key), `bigEndWidth` the big-end width. Beam, bolt and bushing facts come from the series text (Voodoo H-beam ARP2000 7/16; Signature I-beam ARP2000 7/16 cap screws, Ampco 45 bushings; Racer Series I-beam). The p24 three-row preview duplicates p26 and is merged.
- Skipped: King/Clevite bearing cross-reference (p23, other brands), ARP rod bolts (p25), balancers, tools, apparel, stock rod-length reference tables.

## QA (0 notes)


## Validation

- OK: no duplicate part numbers within a family, all records have m/p/cat/fit.fam/src, numeric fields are numbers, no empty strings.
