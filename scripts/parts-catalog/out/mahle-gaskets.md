# MAHLE Performance Gaskets 2022 (GA-40-22) extraction notes

- Source: `ga-40-22_web.pdf` (63 pages, text layer; manual download under `Catalogs/`, no network). Edition 2022 (GA-40-22, supersedes GA-40-20; PDF created 2022-11-02).
- Extracted 2026-10-17 with `extract_mahle_gaskets.py` (PyMuPDF words placed into columns by x offset; product pages PDF 9-55, printed page = PDF page - 2).
- 157 tables parsed, 590 rows, 709 records (586 unique PNs; one record per family for BBC Mark IV / Gen VI).
- By cat: gasket 641, headGasket 68

## Records by family

- gasket / AMC V8: 7
- gasket / Buick V6 181-252: 5
- gasket / Buick big block: 10
- gasket / CHEVROLET V6: 173 Engines: 1
- gasket / CHEVROLET V6: 229, 262 Engines: 7
- gasket / Chevy Gen VI big block: 108
- gasket / Chevy Mark IV big block: 108
- gasket / Chevy inline-6: 2
- gasket / Chrysler 426 Hemi: 12
- gasket / Chrysler Gen III Hemi 5.7/6.1: 1
- gasket / Cummins 5.9 12V: 1
- gasket / Ford 240/300 inline-6: 1
- gasket / Ford 351C/351M/400: 14
- gasket / Ford 429/460: 31
- gasket / Ford Coyote: 1
- gasket / Ford FE: 13
- gasket / Ford Modular: 2
- gasket / Ford V6: 90 Degree 4.5L Engines: 1
- gasket / GM LS: 17
- gasket / Mopar B/RB big block: 29
- gasket / Mopar LA small block: 29
- gasket / Oldsmobile V8: 19
- gasket / PONTIAC L4: 151 Engines: 2
- gasket / Pontiac V8: 18
- gasket / Small-block Chevy: 114
- gasket / Small-block Ford (Windsor): 51
- gasket / Universal: 37
- headGasket / Buick big block: 1
- headGasket / Chevy Gen VI big block: 11
- headGasket / Chevy Mark IV big block: 11
- headGasket / Chrysler Gen III Hemi 5.7/6.1: 3
- headGasket / Ford 429/460: 1
- headGasket / Ford Coyote: 4
- headGasket / Ford Modular: 6
- headGasket / GM LS: 5
- headGasket / Mopar B/RB big block: 3
- headGasket / Mopar LA small block: 4
- headGasket / Oldsmobile V8: 1
- headGasket / Pontiac V8: 3
- headGasket / Small-block Chevy: 11
- headGasket / Small-block Ford (Windsor): 4

## Gasket types

- intake: 234
- valve cover: 147
- exhaust header: 122
- oil pan: 54
- timing cover: 16
- rear main seal: 15
- carb base: 12
- exhaust collector: 11
- water outlet: 9
- differential cover: 8
- intake sheet material: 5
- fuel pump: 4
- distributor: 3
- supercharger burst plate: 1

## Tables by title

- Intake Manifold Gasket Sets: 26
- Exhaust Header Gaskets: 25
- Valve Cover Gasket Sets: 21
- Cylinder Head Gaskets: 17
- Oil Pan Gasket Sets: 16
- Carb Base Gaskets: 11
- Exhaust Collector Gasket: 11
- Timing Cover Gasket: 8
- Rear Main Seal: 7
- Axle Housing Cover Diff Seal: 5
- Front Cover Sets: 2
- Water Outlet Gasket: 2
- Fuel Pump: 2
- Distributor Gasket: 2
- Intake Gasket Sheet Material: 1
- Supercharger Burst Plate: 1

## Field notes

- `headGasket.spec.material`: Multi-Layered Steel -> `MLS`; Graphite -> `composite`; the single-layer `Stainless Steel` .020 gaskets (1178BS etc.) -> `steel shim`. The printed text is kept in `spec.construction`; `spec.combustionSeal` = `stopper` where printed; `spec.volumeCc` from the Volume column; `spec.side` L/R from 'Left Side' / 'Right Side' in the notes.
- `gasket.spec.type` comes from the table title (intake, exhaust header, exhaust collector, valve cover, oil pan, timing cover, rear main seal, valley cover, carb base, distributor, thermostat housing, water outlet, fuel pump, differential cover, supercharger burst plate, intake sheet material). `spec.set` = true when the title says 'Sets'.
- `gasket.spec.material` is a keyword normalisation of the printed construction (fiber, steel-core composite, graphite composite, cork, molded rubber, rubberized fiber, viton, silicone); `spec.construction` keeps the printed text. Port size `1.100" x 2.200"` -> `portWidth`/`portHeight`; a single value -> `portDia`; `spec.portShape` as printed.
- `fit.fam`: make + engine heading mapped to the brief's family list. Chevrolet big block rows are emitted twice (Mark IV and Gen VI). `CHRYSLER V8 NITRO and ALCOHOL / 426 Hemi Engines` is mapped to `Chrysler 426 Hemi` (aftermarket nitro/alcohol Hemi blocks) and flagged below. `fit.ci` lists the displacements in the engine heading; `fit.y0/y1` only when the notes give a year range; `fit.notes` = catalog heading + application notes. Miscellaneous-section parts (PDF 50-55) are `Universal` with the sub-heading in `spec.application`.
- Years written '2015 - Present' give `y0` only. New-number bullets are dropped; the catalog has no discontinued marks.
- Skipped: technical pages 1-8 and the Fel-Pro / SCE / Cometic interchange tables (PDF 56-63).

## Families not in the brief's list (22 rows, catalog heading kept)

- CHEVROLET V6: 173 Engines: 1
- CHEVROLET V6: 229, 262 Engines: 7
- Chrysler 426 Hemi: 11
- Ford V6: 90 Degree 4.5L Engines: 1
- PONTIAC L4: 151 Engines: 2

## Lines skipped (0)

- none

## QA (0)

- none

## Validation (0 errors)

- no duplicate (p, cat, fam); every record has m p cat fit.fam src; numeric fields numeric; no empty strings
