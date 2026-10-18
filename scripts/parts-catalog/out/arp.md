# ARP - extraction notes

Source: `Catalogs/ARPCatalog.pdf` (ARP 2026 catalog, 180 pages, text layer; file dated 2025-11-03; saved by hand, no network used). Printed page numbers match PDF page numbers.

Records: 2582 (2183 unique part numbers; a part that fits several families is repeated once per family, e.g. big-block Chevy rows are emitted for both `Chevy Mark IV big block` and `Chevy Gen VI big block`).

## Method

- Words from pdfplumber (`x_tolerance=1.5`); ZapfDingbats stock/warning icons dropped. Part numbers are the `ddd-dddd` words; each is assigned to the nearest column centre.
- Column centres come from the header phrases above the grid (`(complete)`/`(2-PC)`, `Hex`/`12-Point`, `Hex Nuts`/`U/C Studs`, `2-Bolt`/`4-Bolt`, `Part No.`, ...). Column meaning (product line, material, head/nut style, stud vs bolt kit, finish, 2-/4-bolt mains) is a fixed label list per table type, so an empty column on a page cannot shift the others. Page 74's LS-series sub-header (8740 190,000 psi / ARP2000 / Polished Inconel) overrides the page header for that section.
- Rows are the bands between horizontal rule lines and shaded row rectangles; bold capital lines are make/family section headings (carried across pages; `XXX - SEE ...` cross-references ignored). A band with several part-number lines is split by nearest line; multi-line application text is joined in reading order.
- Two-up pages (main studs 79-82, diesel 138-141) are split at x before line grouping.
- Inline dimension columns (UHL, thread size, socket size, qty, stud OAL / bolt UHL, rocker-stud lengths) are split off the application text by regex from the right; what cannot be split stays in `fit.notes` and is listed under QA.
- Aftermarket rod bolts (p43 SAE, p44 metric) have their own parsers; SAE thread size is derived from wrench and collar size because the size labels sit beside the groups (verified against the label positions). The rod bolt torque / stretch chart (pp55-57, ARP Ultra-Torque) is joined to rod-bolt records by part number.
- Material: column label, or the `Material` column on head-stud pages, or an ARP2000 / Custom Age 625+ / L19 token in the application text (then stripped from the text). Head and main studs without a stated material are 8740 chromoly per the section intro.
- Part numbers printed in bold/blue (the catalog's 'new kits for 2026 ... still in development' list) get `spec.status`.
- `fit.fam` uses the brief's family list; everything else carries the catalog heading as `<Heading> (catalog heading)`. `fit.ci` is taken from `cid` numbers / hyphen chains in the application text for the domestic families only; a pair like `265-400 cid` is a range in the catalog but is stored as the two printed numbers.

## Counts

| spec.application | records | unique PNs |
|---|---|---|
| head stud | 670 | 590 |
| rod bolt | 427 | 377 |
| main stud | 245 | 225 |
| head bolt | 221 | 191 |
| header | 145 | 115 |
| intake manifold | 130 | 95 |
| valve cover | 117 | 110 |
| oil pan | 111 | 75 |
| flywheel bolt | 67 | 55 |
| main bolt | 53 | 46 |
| rocker arm stud | 53 | 45 |
| bellhousing | 48 | 36 |
| harmonic damper bolt | 47 | 32 |
| front cover | 46 | 30 |
| cam bolt | 43 | 31 |
| water pump | 32 | 20 |
| exhaust manifold | 29 | 29 |
| flexplate bolt | 25 | 18 |
| front cover/water pump | 20 | 20 |
| oil pump driveshaft | 14 | 10 |
| harmonic damper bolt (square drive) | 12 | 8 |
| oil pump | 11 | 9 |
| cam tower stud | 6 | 6 |
| rear main seal plate | 4 | 4 |
| cam tower bolt | 4 | 4 |
| rocker pedestal stud | 1 | 1 |
| harmonic damper washer | 1 | 1 |

| fit.fam | records |
|---|---|
| Small-block Chevy | 260 |
| Universal | 240 |
| Small-block Ford (Windsor) | 214 |
| Chevy Mark IV big block | 212 |
| Chevy Gen VI big block | 211 |
| GM LS | 112 |
| Ford 4, 5 and 6-cylinder (catalog heading) | 63 |
| Toyota (catalog heading) | 52 |
| Mopar B/RB big block | 51 |
| Volkswagen/Audi (catalog heading) | 49 |
| Chevrolet V6 (catalog heading) | 48 |
| Pontiac V8 | 48 |
| Ford 351C/351M/400 | 46 |
| Mopar LA small block | 45 |
| BMW (catalog heading) | 40 |
| Nissan/Datsun (catalog heading) | 38 |
| Buick V6 181-252 | 35 |
| Ford FE | 35 |
| Mitsubishi (catalog heading) | 35 |
| Oldsmobile V8 | 35 |
| Ford 429/460 | 31 |
| Chrysler Gen III Hemi 5.7/6.1 | 30 |
| Top Fuel / KB Hemi (catalog heading) | 29 |
| GM LT (Gen V) | 27 |
| Honda/Acura (catalog heading) | 27 |
| Duramax 6.6 | 26 |
| Ford Modular | 25 |
| Ford (catalog heading) | 22 |
| Buick 350 | 20 |
| Holden (catalog heading) | 20 |
| Chrysler 426 Hemi | 19 |
| Mopar Magnum 5.2/5.9 | 18 |
| Powerstroke 6.0 | 17 |
| Porsche (catalog heading) | 17 |
| AMC V8 | 16 |
| Cummins 6.7 | 16 |
| Buick big block | 15 |
| Chrysler 4-cylinder (catalog heading) | 15 |
| Ford Coyote | 15 |
| BMC/Triumph (catalog heading) | 13 |
| AMC/Jeep inline-6 | 12 |
| Cummins 5.9 24V/CR | 11 |
| Opel/Vauxhall (catalog heading) | 11 |
| Subaru (catalog heading) | 11 |
| BMC/Triumph/Rover (catalog heading) | 9 |
| Buick/Rover 215 aluminum V8 (catalog heading) | 9 |
| Chevy W-series 348/409 | 9 |
| Powerstroke 6.7 | 9 |
| Cummins ISB/ISL/ISF industrial (catalog heading) | 9 |
| Chevrolet 4-cylinder (catalog heading) | 8 |
| Chrysler early Hemi 331-392 (catalog heading) | 8 |
| Cummins 5.9 12V | 8 |
| Ford 240/300 inline-6 | 8 |
| Pontiac 4-cylinder (catalog heading) | 8 |
| Powerstroke 6.4 | 7 |
| Powerstroke 7.3 | 7 |
| Mazda (catalog heading) | 7 |
| Suzuki (catalog heading) | 7 |
| Chevy 8.1L Vortec big block (catalog heading) | 6 |
| Chevy inline-6 | 6 |
| Mini (catalog heading) | 6 |
| Pontiac/Buick 3800 V6 (catalog heading) | 6 |
| Rover (catalog heading) | 6 |
| Chrysler (catalog heading) | 6 |
| Ford Y-block (catalog heading) | 5 |
| Renault (catalog heading) | 5 |
| Dodge Viper V10 (catalog heading) | 5 |
| Ford Flathead V8 (catalog heading) | 5 |
| Hyundai (catalog heading) | 5 |
| Chrysler Gen III Hemi 6.2/6.4 | 5 |
| Buick Nailhead 364-425 (catalog heading) | 4 |
| Cummins 3.9L 4BT (catalog heading) | 4 |
| Volvo (catalog heading) | 4 |
| Saturn (catalog heading) | 4 |
| Nissan (catalog heading) | 4 |
| Cadillac 368-500 | 3 |
| Mopar Slant Six | 3 |
| Ford Godzilla 7.3 | 3 |
| Lancia (catalog heading) | 3 |
| Oldsmobile Quad 4 (catalog heading) | 3 |
| Sea-doo (catalog heading) | 3 |
| Honda (catalog heading) | 3 |
| Nissan diesel (catalog heading) | 3 |
| Cadillac 331-429 (catalog heading) | 2 |
| Duramax 2.8L (catalog heading) | 2 |
| Ford/International IDI diesel (catalog heading) | 2 |
| Ford big block (catalog heading) | 2 |
| Polaris (catalog heading) | 2 |
| Caterpillar (catalog heading) | 2 |
| Harley Davidson Motorcycle (catalog heading) | 2 |
| MGB (catalog heading) | 2 |
| Cummins (catalog heading) | 2 |
| Alfa Romeo (catalog heading) | 1 |
| Peugeot (catalog heading) | 1 |
| Dodge (catalog heading) | 1 |
| Ford Model A/B 4-cylinder (catalog heading) | 1 |
| Oldsmobile DRCE (catalog heading) | 1 |
| Buick (catalog heading) | 1 |
| BMC (catalog heading) | 1 |
| GM 6.2L diesel (catalog heading) | 1 |
| Diesel (catalog heading) | 1 |

### Rows per page / section

| page | table | section headings seen | rows | PNs |
|---|---|---|---|---|
| 46 | rod bolt | ALFA ROMEO, AMC, BMC/TRIUMPH/ROVER | 13 | 14 |
| 47 | rod bolt | BMW, BUICK, CADILLAC, CHEVROLET, SMALL BLOCK | 29 | 50 |
| 48 | rod bolt | CHEVROLET, SMALL BLOCK, CHEVROLET, BIG BLOCK, CHEVROLET, 4 AND 6-CYLINDER, CHRYSLER, DIESEL, FORD, SMALL BLOCK | 29 | 65 |
| 49 | rod bolt | FORD, SMALL BLOCK, FORD, BIG BLOCK, FORD, GODZILLA, FORD, MODULAR, FORD, 4, 5 AND 6-CYLINDER, HOLDEN, HONDA/ACURA | 29 | 66 |
| 50 | rod bolt | HONDA/ACURA, JEEP, LANCIA, MAZDA, MINI, MITSUBISHI, NISSAN/DATSUN | 28 | 32 |
| 51 | rod bolt | NISSAN/DATSUN, OLDSMOBILE, OPEL/VAUXHALL, PEUGEOT, PONTIAC, PORSCHE, RENAULT, SEA-DOO | 27 | 34 |
| 52 | rod bolt | SUBARU, SUZUKI, TOYOTA, VOLKSWAGEN/AUDI, VOLVO | 26 | 30 |
| 59 | head stud | AMC, BMC/TRIUMPH, BMW, BUICK | 32 | 36 |
| 60 | head stud | BUICK, CADILLAC, CHEVROLET, SMALL BLOCK | 33 | 58 |
| 61 | head stud | CHEVROLET, SMALL BLOCK, CHEVROLET, SMALL BLOCK - LS SERIES | 35 | 51 |
| 62 | head stud | CHEVROLET, SMALL BLOCK - LS SERIES, CHEVROLET, SMALL BLOCK - LT SERIES, CHEVROLET, BIG BLOCK | 31 | 66 |
| 63 | head stud | CHEVROLET, BIG BLOCK, CHEVROLET, 4 AND 6-CYLINDER, CHRYSLER, SMALL BLOCK | 33 | 74 |
| 64 | head stud | CHRYSLER, SMALL BLOCK, CHRYSLER, BIG BLOCK, CHRYSLER, 4 AND 6-CYLINDER, DIESEL | 31 | 41 |
| 65 | head stud | DIESEL, DODGE, FORD, SMALL BLOCK | 33 | 45 |
| 66 | head stud | FORD, SMALL BLOCK, FORD, BIG BLOCK, FORD, COYOTE, FORD, FLATHEAD | 30 | 42 |
| 67 | head stud | FORD, GODZILLA, FORD, MODULAR, FORD, 4, 5 AND 6-CYLINDER, GENERAL MOTORS, HOLDEN | 30 | 38 |
| 68 | head stud | HONDA/ACURA, HYUNDAI, JEEP, LANCIA, MAZDA, MITSUBISHI, NISSAN/DATSUN | 31 | 33 |
| 69 | head stud | NISSAN/DATSUN, OLDSMOBILE, OPEL/VAUXHALL, POLARIS, PONTIAC | 31 | 44 |
| 70 | head stud | PORSCHE, RENAULT, ROVER, SATURN, SEA-DOO, SUBARU, SUZUKI, TOYOTA | 28 | 28 |
| 71 | head stud | TOYOTA, VOLKSWAGEN/AUDI, VOLVO | 33 | 39 |
| 73 | head bolt | AMC, BUICK, CATERPILLAR | 16 | 22 |
| 74 | head bolt | CHEVROLET, SMALL BLOCK, CHEVROLET, SMALL BLOCK - LS SERIES, CHEVROLET, SMALL BLOCK - LT SERIES, CHEVROLET, BIG BLOCK | 24 | 58 |
| 75 | head bolt | CHEVROLET, BIG BLOCK, CHEVROLET, 6-CYLINDER, CHRYSLER, SMALL BLOCK, CHRYSLER, BIG BLOCK | 26 | 51 |
| 76 | head bolt | CHRYSLER, BIG BLOCK, CHRYSLER, 4-CYLINDER, CUMMINS, FORD, 4, 5, & 6-CYLINDER, FORD, SMALL BLOCK, FORD, BIG BLOCK, HARLEY DAVIDSON MOTORCYCLE | 24 | 35 |
| 77 | head bolt | HARLEY DAVIDSON MOTORCYCLE, HOLDEN, JEEP, MINI, MITSUBISHI, OLDSMOBILE, PONTIAC, TOYOTA, VOLKSWAGEN/AUDI | 21 | 25 |
| 79 | main stud | BMC/TRIUMPH, BMW, BUICK, CADILLAC, CHEVROLET, SMALL BLOCK, CHEVROLET, SMALL BLOCK - LS SERIES, CHEVROLET, SMALL BLOCK - LT SERIES, CHEVROLET | 57 | 62 |
| 80 | main stud | CHEVROLET, BIG BLOCK, CHEVROLET, 6-CYLINDER, CHRYSLER, DIESEL, DODGE, FORD, SMALL BLOCK | 62 | 65 |
| 81 | main stud | FORD, BIG BLOCK, FORD, COYOTE (SIDE BOLTS INCLUDED), FORD, GODZILLA (SIDE BOLTS INCLUDED), FORD, MODULAR (SIDE BOLTS SOLD SEPARATELY), FORD, | 55 | 58 |
| 82 | main stud | NISSAN/DATSUN, OLDSMOBILE, OPEL/VAUXHALL, POLARIS, PONTIAC, RENAULT, ROVER, SATURN, SEA-DOO, SUZUKI, TOYOTA, VOLKSWAGEN/AUDI, VOLVO | 41 | 42 |
| 84 | main bolt | CHEVROLET, SMALL BLOCK, CHEVROLET, BIG BLOCK, CHEVROLET, 6-CYLINDER, CHRYSLER, FORD, SMALL BLOCK, FORD, BIG BLOCK, FORD, 4-, 5-, 6-CYLINDER | 27 | 32 |
| 85 | main bolt | FORD, 4-, 5-, 6-CYLINDER, HOLDEN, JEEP, MGB, MITSUBISHI, OLDSMOBILE, PORSCHE, ROVER, SUBARU, TOYOTA | 15 | 15 |
| 87 | rocker arm stud | UNIVERSAL | 32 | 48 |
| 89 | rocker pedestal stud | DODGE/RAM | 1 | 1 |
| 90 | valve cover | CHRYSLER, HYUNDAI, CAST ALUMINUM COVERS | 8 | 23 |
| 91 | valve cover | CAST ALUMINUM COVERS, STAMPED STEEL COVERS | 24 | 87 |
| 94 | header bolt/stud | BUICK, CHEVROLET, SMALL BLOCK, CHEVROLET, SMALL BLOCK - LS SERIES | 12 | 42 |
| 95 | header bolt/stud | CHEVROLET, SMALL BLOCK - LT SERIES, CHEVROLET, BIG BLOCK, CHRYSLER, FORD, OLDSMOBILE, UNIVERSAL | 24 | 77 |
| 96 | oil pan | CHEVROLET, SMALL BLOCK, CHEVROLET, BIG BLOCK, CHEVROLET, 6-CYLINDER, CHRYSLER, SMALL BLOCK | 10 | 45 |
| 97 | oil pan | CHRYSLER, BIG BLOCK, FORD, SMALL BLOCK, FORD, BIG BLOCK, HOLDEN, PONTIAC | 7 | 38 |
| 97 | oil pump | CHEVROLET, FORD | 4 | 9 |
| 98 | front cover/water pump | BUICK, CHEVROLET, CHRYSLER, FORD | 18 | 67 |
| 99 | front cover/water pump | FORD, PONTIAC | 6 | 21 |
| 104 | intake manifold | AMC, BUICK, CHEVROLET | 17 | 49 |
| 105 | intake manifold | CHRYSLER, FORD, HOLDEN, PONTIAC | 13 | 46 |
| 108 | harmonic damper bolt | BUICK, BMW, CHEVROLET | 10 | 10 |
| 109 | harmonic damper bolt | CHRYSLER, DIESEL, DODGE, FORD, HONDA, MITSUBISHI, NISSAN, OLDSMOBILE, PONTIAC, SUBARU | 24 | 24 |
| 110 | harmonic damper bolt (square drive) |  | 8 | 8 |
| 110 | oil pump driveshaft | CHEVROLET, FORD | 10 | 10 |
| 112 | cam bolt | BMW, BUICK, CHEVROLET, CHRYSLER, FORD, FORD, 4-CYLINDER | 19 | 25 |
| 113 | cam bolt | FORD, COYOTE, FORD, MODULAR, MITSUBISHI, PONTIAC, PORSCHE, TOP FUEL | 8 | 8 |
| 113 | cam tower bolt/stud | CHRYSLER, FORD, MODULAR, HYUNDAI, MITSUBISHI, VOLKSWAGEN/AUDI | 10 | 10 |
| 116 | flywheel bolt | BMC, BMW, CHEVROLET | 10 | 10 |
| 117 | flywheel bolt | CHRYSLER/DODGE, FORD, HONDA, HYUNDAI, JEEP, MINI, MITSUBISHI | 26 | 26 |
| 118 | flywheel bolt | MITSUBISHI, NISSAN, OPEL/VAUXHALL, PONTIAC, PORSCHE, ROVER, SUBARU, SUZUKI, TOP FUEL, TOYOTA | 20 | 20 |
| 119 | flexplate bolt | CHEVROLET, CHRYSLER/DODGE, FORD, JEEP, MITSUBISHI | 19 | 19 |
| 122 | bellhousing | CHEVROLET - BELLHOUSING TO ENGINE BLOCK BOLT KITS, CHRYSLER/DODGE - BELLHOUSING TO ENGINE BLOCK BOLT KITS, FORD - BELLHOUSING TO ENGINE BLOC | 11 | 36 |
| 138 | head stud | CATERPILLAR, CUMMINS, CHEVROLET/GMC, DODGE/RAM | 16 | 16 |
| 139 | head stud | DODGE/RAM, FORD, NISSAN, OLDSMOBILE, VOLKSWAGEN/AUDI | 14 | 14 |
| 139 | head bolt | CATERPILLAR, CUMMINS | 2 | 2 |
| 139 | rod bolt | CHEVROLET/GMC, DODGE/RAM, FORD, NISSAN | 8 | 8 |
| 140 | main stud | CHEVROLET/GMC, CUMMINS, DODGE/RAM, FORD, NISSAN, OLDSMOBILE | 18 | 18 |
| 140 | harmonic damper bolt | DIESEL | 6 | 6 |
| 141 | exhaust manifold | CHEVROLET/GMC, DODGE/RAM, FORD | 13 | 29 |
| 141 | valve cover | CHEVROLET/GMC | 4 | 8 |
| 142 | flywheel bolt | FLYWHEEL BOLTS, FLEXPLATE BOLTS | 9 | 9 |
| 142 | rocker pedestal stud | DODGE/RAM | 1 | 1 |
| 43 | rod bolt (aftermarket SAE) | Universal | 68 PN cells | 68 |
| 44 | rod bolt (aftermarket metric) | Universal | 37 | 37 |
| 55-57 | torque/stretch chart | - | 225 PNs | joined to 250 records |

## Skipped

- p92: accessory studs
- p93: header collector bolts (dimensional bulk hardware)
- p99 bottom: water pump pulley studs/bolts
- p100-103, 105-107, 111: motor mount, starter, fuel pump, seal plate, accessory cam drive, carburetor, air cleaner, distributor, carburetor float bowl, coil bracket, thermostat housing, blower, alternator, fuel pump pushrod
- p82 bottom: Porsche/Subaru/Toyota engine case kits
- p88-89 top: Perma-Loc rocker arm adjusters
- p114-115: engine & accessory kits
- p120-121, 123-127: torque converter, ring gear, carrier, rear end cover, clutch cover, pressure plate, transmission case/pan, lower pulley, drive plate, sprint car drive pins, brake hat
- p128-136: wheel studs, circle track
- p142 bottom: ring compressors
- p143: powersports
- p144-178: SAE/metric stainless bolts, nuts, washers, insert washers, weld bungs, bulk bins, lube, tools, apparel
- p37: general torque recommendations by diameter (not per part number)
- Rows whose application text names an alternator (inside the front cover / water pump table) are dropped as accessory hardware.
- Cross-reference headings (`DATSUN - SEE NISSAN, PAGE 50`) produce no rows.

## Unknown families (catalog heading kept in fit.fam)

- Ford 4, 5 and 6-cylinder (catalog heading): 64
- Toyota (catalog heading): 52
- Volkswagen/Audi (catalog heading): 49
- Chevrolet V6 (catalog heading): 48
- BMW (catalog heading): 40
- Nissan/Datsun (catalog heading): 39
- Mitsubishi (catalog heading): 35
- Top Fuel / KB Hemi (catalog heading): 29
- Honda/Acura (catalog heading): 27
- Ford (catalog heading): 22
- Holden (catalog heading): 20
- Porsche (catalog heading): 17
- Cummins ISB/ISL/ISF industrial (catalog heading): 17
- Chrysler 4-cylinder (catalog heading): 15
- BMC/Triumph (catalog heading): 13
- Opel/Vauxhall (catalog heading): 11
- Subaru (catalog heading): 11
- BMC/Triumph/Rover (catalog heading): 9
- Buick/Rover 215 aluminum V8 (catalog heading): 9
- Chevrolet 4-cylinder (catalog heading): 9
- Chrysler early Hemi 331-392 (catalog heading): 8
- Cummins 3.9L 4BT (catalog heading): 8
- Pontiac 4-cylinder (catalog heading): 8
- Mazda (catalog heading): 7
- Suzuki (catalog heading): 7
- Chevy 8.1L Vortec big block (catalog heading): 6
- Mini (catalog heading): 6
- Pontiac/Buick 3800 V6 (catalog heading): 6
- Rover (catalog heading): 6
- Chrysler (catalog heading): 6
- Ford Y-block (catalog heading): 5
- Renault (catalog heading): 5
- Dodge Viper V10 (catalog heading): 5
- Ford Flathead V8 (catalog heading): 5
- Hyundai (catalog heading): 5
- Buick Nailhead 364-425 (catalog heading): 4
- Volvo (catalog heading): 4
- Duramax 2.8L (catalog heading): 4
- Ford/International IDI diesel (catalog heading): 4
- Saturn (catalog heading): 4
- Nissan (catalog heading): 4
- Lancia (catalog heading): 3
- Oldsmobile Quad 4 (catalog heading): 3
- Sea-doo (catalog heading): 3
- Caterpillar (catalog heading): 3
- Honda (catalog heading): 3
- Nissan diesel (catalog heading): 3
- Cadillac 331-429 (catalog heading): 2
- Ford big block (catalog heading): 2
- Polaris (catalog heading): 2
- Harley Davidson Motorcycle (catalog heading): 2
- MGB (catalog heading): 2
- Cummins (catalog heading): 2
- Alfa Romeo (catalog heading): 1
- Peugeot (catalog heading): 1
- Dodge (catalog heading): 1
- Ford Model A/B 4-cylinder (catalog heading): 1
- Oldsmobile DRCE (catalog heading): 1
- Buick (catalog heading): 1
- BMC (catalog heading): 1
- GM 6.2L diesel (catalog heading): 1
- Diesel (catalog heading): 1

## QA

Validation: no duplicate (part, family), all records have m/p/cat/fit.fam/src, no empty strings, numeric fields numeric.

Things a human should check:
- `Chevy 8.1L Vortec big block`, `Buick/Rover 215`, `Buick Nailhead`, `Ford Y-block`, `Chrysler early Hemi 331-392`, `Top Fuel / KB Hemi`, Cummins 4BT / ISB / ISL / ISF and the import makes are not in the family list and carry the catalog heading.
- Big-block Chevy rows are duplicated to both Mark IV and Gen VI unless the text says Mark IV / Mark V-VI / 502; `348, 409` rows go to the W-series family.
- Chrysler `383-400-413-440 Wedge & 354-392 Hemi` rows are emitted for B/RB and the early-Hemi heading; `318-440 Wedge` intake rows for both LA and B/RB.
- Head-bolt page 74 LS rows use the LS sub-header materials; the 435-/434- stainless columns elsewhere are labelled `ARP Stainless` from the page header although the LS sub-header calls the same 4xx column Polished Inconel.
- Rocker-arm stud dimension letters B/C/D/E/F follow the page 86 drawing (B/C/D lengths, E top thread, F base thread); cells like `1.3, 0.820` (two alternatives) are stored as lists.
- Page 44 metric row `M10 X 1.25 ... 4.5 mm UHL` is printed as 4.5 (probably 44.5); stored as printed.
- Application text often names head castings / block brands (Brodix, Dart, World) that are not fitment families; they stay in `fit.notes`.
- 86 duplicate (part, family) rows merged into the first occurrence

### dup-application (2)

- 253-3602 Ford 4, 5 and 6-cylinder (catalog heading): head bolt vs main bolt
- 238-4201 Caterpillar (catalog heading): head stud vs head bolt

### fields (1)

- p109 harmonic damper bolt: no inline dimensions found for 'Chevy 6.6L Duramax - washer for 129-2503, as applicable'

### orphan (2)

- p91: '25mm'
- p91: '1.772 in.)'

### stray (5)

- p90 '5.7L & 6.1L Hemi': ['in .)']
- p90 'G4KF 2.0L': ['in .)']
- p91 'Chevy, Gen III/IV LS Series small block with 0.375': ['in .)']
- p91 'Chevy, Gen III/IV LS Series small block with 0.750': ['in .)']
- p91 'Chevy GEN V 6.2L (LT1/LT4)': ['in .)']
