# MAHLE Piston Rings Light Vehicle 2019 (PR-20-19) extraction notes

- Source: `pr-20-19.pdf` (247 pages, text layer; manual download under `Catalogs/`, no network). Edition 2019 (PR-20-19; PDF created 2019-06-18).
- Extracted 2026-10-18 with `extract_mahle_oe_rings.py` (PyMuPDF words; application pages PDF 26-220, set content listing PDF 221-242; printed page = PDF page - 1).
- 926 engine blocks under 67 make headings; 2036 set rows (one per PN per year row); 433 set numbers in the content listing.
- 1043 records, all `cat: ring`, one per (set PN, family); 440 distinct set PNs.
  - 233 records in 37 engine-build families (US domestic).
  - 606 records under 27 US make headings (engines with no engine-build family: GM 60/90-degree V6, 4-cylinders, Cadillac HT/Northstar, GM 6.2/6.5 diesel, 8.1L, Y-block, Viper V10, flatheads, nailheads ...).
  - 204 records under 23 import make headings (kept as the catalog heading).

## Method

- Application pages: each make heading opens with an engine index (skipped) and then numbered blocks `<no> <engine description> <no>`, a VIN/engine-code line, and set rows. Columns come from the page's `YEAR NOTES PREMIUM STANDARD REQ DIA COMP OIL` header (left and right pages are offset by 71 pt). A set row starts on a line with an integer in REQ and an inch bore in DIA; the following lines carry the oversize list, the material phrase, the mm bore and the second compression ring.
- PREMIUM and STANDARD columns each give a set PN (`spec.grade`). `S`-prefixed numbers are single-cylinder sets (`spec.style: single-cylinder`, `spec.setsPerEngine` = qty required, `spec.engineSetPn` = the matching engine set).
- Set content listing (PDF 221-242) gives, per set, bore in/mm and one line per ring: width, facing, material, MAHLE type code, Cm/Oil, radial wall, qty. These go to `spec.components` (positions top/second/[third]/oil); `spec.material`/`spec.face` are the top ring's; `spec.cylinders` is the ring qty per position. The application-page material phrase is kept in `spec.appMaterial`. Application widths are cross-checked against the listing (QA below).
- Widths: fractions to decimal inches (5/64 = 0.0781, 3/32 = 0.0938, 3/16 = 0.1875, 1/16 = 0.0625); metric widths stay in mm; `spec.units` is `in`, `mm` or `mixed`, `spec.widthsPrinted` the catalog text. `spec.oversizes` is a numeric list (0 = STD) in `spec.oversizeUnits`; metric European numbers print `N0(STD),N1(.25mm),N2(.50mm)` where the N-suffix replaces the N0 of the PN (`spec.oversizeSuffixes`).
- Family: from the engine manufacturer named at the end of the description (GM, FORD, CHRYSLER, AMC, CUMMINS ...; defaulting to the make), CID, cylinders, head type, bore and the row's years. The catalog identifies GM V8s by CID + bore only, so bore tables resolve Chevy/Olds/Pontiac/Buick/Cadillac (e.g. 350 CID: 4.000 SBC, 3.800 Buick 350, 3.875 Pontiac, 4.060 Olds, 3.898 LS1). Year splits: 5.3L 325 and 6.2L 376 sets whose earliest row starts in 2014 or later -> GM LT (Gen V) (42216CP, 42217CP), sets that also have earlier rows -> GM LS (e.g. 41859CP 1999-2014, 42082CP = LS3); BBC rows <=1990 Mark IV / >=1991 Gen VI (both when spanning); 318/360 rows <=1991/1992 LA, >=1992/1993 Magnum (both when spanning; the 318 rows that start in 1957 include the poly A years, rows ending <=1966 stay unmapped); Cummins 359 without a valve count split at 1998 (both when spanning); 7.3L 445 sets with rows starting before 1994 (IDI: 41548 with the .118" top ring) unmapped, the rest Powerstroke 7.3; 426 rows from 1966 -> 426 Hemi, <=1965 -> B/RB wedge. Ford 351 at 4.000 bore is emitted under both Windsor and 351C/351M/400 (the catalog does not separate them).
- Aggregation: engines of one family served by one set are merged (ci unioned, year span min/max, `fit.engineCodes` unioned, `fit.notes` = one entry per engine line/years with the makes that share it, the OE engine codes and the row note such as `Shallow Groove`). When the catalog prints only cc (most imports) `fit.ci` is derived from cc (or liters) and `fit.ciFromCc: true` is set.
- Skipped: technical/nomenclature pages 1-25, the per-make engine index tables, and the set-number index (PDF 243-247).

## Records per family (engine-build families first)

- Small-block Chevy: 27 (27 PNs)
- Chevy Mark IV big block: 9 (9 PNs)
- Chevy Gen VI big block: 10 (10 PNs)
- Chevy W-series 348/409: 4 (4 PNs)
- GM LS: 9 (9 PNs)
- GM LT (Gen V): 2 (2 PNs)
- Small-block Ford (Windsor): 9 (9 PNs)
- Ford 351C/351M/400: 7 (7 PNs)
- Ford FE: 12 (12 PNs)
- Ford 429/460: 6 (6 PNs)
- Ford Modular: 4 (4 PNs)
- Ford Coyote: 1 (1 PNs)
- Mopar LA small block: 10 (10 PNs)
- Mopar Magnum 5.2/5.9: 7 (7 PNs)
- Mopar B/RB big block: 8 (8 PNs)
- Chrysler 426 Hemi: 2 (2 PNs)
- Chrysler Gen III Hemi 5.7/6.1: 3 (3 PNs)
- Chrysler Gen III Hemi 6.2/6.4: 2 (2 PNs)
- Pontiac V8: 14 (14 PNs)
- Oldsmobile V8: 13 (13 PNs)
- Buick big block: 4 (4 PNs)
- Buick 350: 4 (4 PNs)
- Buick V6 181-252: 9 (9 PNs)
- Cadillac 368-500: 2 (2 PNs)
- AMC V8: 4 (4 PNs)
- AMC/Jeep inline-6: 10 (10 PNs)
- Chevy inline-6: 12 (12 PNs)
- Ford 240/300 inline-6: 5 (5 PNs)
- Mopar Slant Six: 3 (3 PNs)
- Cummins 5.9 12V: 2 (2 PNs)
- Cummins 5.9 24V/CR: 2 (2 PNs)
- Cummins 6.7: 4 (4 PNs)
- Duramax 6.6: 4 (4 PNs)
- Powerstroke 7.3: 3 (3 PNs)
- Powerstroke 6.0: 2 (2 PNs)
- Powerstroke 6.4: 2 (2 PNs)
- Powerstroke 6.7: 2 (2 PNs)
- families with no rows in this catalog: Ford Godzilla 7.3

## Records kept under the catalog make heading (no engine-build family)

US makes: AM General 3, American Motors 10, Buick 45, Cadillac 25, Checker 3, Chevrolet 78, Chrysler 23, Dodge 46, Eagle 15, Ford 63, Freightliner 1, GMC 48, Geo 7, Hummer 4, International 2, Jeep 35, Kenworth 2, Lincoln 12, Mercury 44, Merkur 3, Oldsmobile 41, Packard 2, Peterbilt Motor 2, Plymouth 25, Pontiac 50, Ram 4, Saturn 13

Import makes: Acura 12, Asuna 1, Audi 2, Bristol 2, Honda 18, Hyundai 4, Infiniti 5, Isuzu 19, Jaguar 2, Lexus 12, Lotus 1, Mazda 26, Mercedes-benz 1, Mitsubishi 18, Morgan 1, Nissan 16, Porsche 1, Saab 3, Scion 4, Subaru 2, Suzuki 5, Toyota 43, VW 6

## Families per make heading (set rows)

- ACURA: Acura 16
- AMERICAN MOTORS: American Motors 10, AMC/Jeep inline-6 10, AMC V8 8
- AM General: AMC/Jeep inline-6 4, AM General 3
- ASUNA: Asuna 1
- AUDI: Audi 2
- AVANTI: Small-block Chevy 7
- BIZZARRINI: Small-block Chevy 4
- BRICKLIN: Small-block Ford (Windsor) 5, Ford 351C/351M/400 5
- BRISTOL: Bristol 2, Mopar LA small block 2
- BUICK: Buick 58, Small-block Chevy 21, Buick 350 10, Buick V6 181-252 9, Chevy inline-6 8, Pontiac V8 7, Buick big block 5, Oldsmobile V8 3, GM LS 1
- CADILLAC: Cadillac 28, Small-block Chevy 12, GM LS 9, Oldsmobile V8 3, Cadillac 368-500 3, GM LT (Gen V) 1
- CHECKER: Small-block Chevy 13, Chevy inline-6 9, Checker 3
- CHEVROLET: Chevrolet 101, Small-block Chevy 54, Chevy inline-6 16, Chevy Mark IV big block 15, GM LS 12, Chevy Gen VI big block 10, Duramax 6.6 6, Buick V6 181-252 5, Chevy W-series 348/409 4, Oldsmobile V8 2, GM LT (Gen V) 2
- CHRYSLER: Chrysler 41, Mopar LA small block 9, Mopar B/RB big block 9, Mopar Slant Six 3, Chrysler Gen III Hemi 5.7/6.1 3, Chrysler Gen III Hemi 6.2/6.4 1
- DESOTO: Mopar B/RB big block 3
- DE TOMASO: Small-block Ford (Windsor) 10, Ford 351C/351M/400 10
- DODGE: Dodge 70, Mopar B/RB big block 12, Mopar Slant Six 10, Mopar LA small block 10, Mopar Magnum 5.2/5.9 5, Cummins 6.7 4, Chrysler Gen III Hemi 5.7/6.1 3, Cummins 5.9 12V 3, Cummins 5.9 24V/CR 2, Chrysler Gen III Hemi 6.2/6.4 1
- EAGLE: Eagle 15
- EDSEL: Ford FE 4
- EXCALIBUR: Small-block Chevy 5
- FACEL VEGA: Mopar B/RB big block 2
- FARGO: Mopar LA small block 2
- FORD: Ford 88, Ford FE 23, Small-block Ford (Windsor) 21, Ford Modular 20, Ford 351C/351M/400 12, Ford 429/460 10, Ford 240/300 inline-6 9, Powerstroke 7.3 3, Cummins 5.9 12V 2, Powerstroke 6.0 2, Powerstroke 6.4 2, Cummins 6.7 2, Powerstroke 6.7 2, Ford Coyote 1, Cummins 5.9 24V/CR 1
- FREIGHTLINER: Freightliner 1
- GEO: Geo 12
- GMC: GMC 51, Small-block Chevy 39, Chevy inline-6 12, Chevy Mark IV big block 12, GM LS 8, Chevy Gen VI big block 7, Duramax 6.6 6, Buick V6 181-252 3, Oldsmobile V8 3, GM LT (Gen V) 2
- HONDA: Honda 33
- HUMMER: Hummer 4, GM LS 3, Duramax 6.6 2
- HYUNDAI: Hyundai 4
- INFINITI: Infiniti 7
- INTERNATIONAL: International 8, AMC/Jeep inline-6 5
- ISO: Small-block Chevy 4, Chevy Mark IV big block 2
- ISUZU: Isuzu 24, Small-block Chevy 5, GM LS 2
- JAGUAR: Jaguar 2
- JEEP: Jeep 45, AMC/Jeep inline-6 30, AMC V8 8, Mopar Magnum 5.2/5.9 6, Buick V6 181-252 3, Chrysler Gen III Hemi 5.7/6.1 3, Buick 350 2, Chrysler Gen III Hemi 6.2/6.4 1
- JENSEN: Mopar B/RB big block 2
- KENWORTH: Kenworth 2
- LEXUS: Lexus 15
- LINCOLN: Small-block Ford (Windsor) 16, Ford 351C/351M/400 14, Lincoln 12, Ford Modular 7, Ford 429/460 4
- LOTUS: Lotus 1
- MAZDA: Mazda 46
- MERCEDES-BENZ: Mercedes-benz 1
- MERCURY: Mercury 58, Small-block Ford (Windsor) 26, Ford 351C/351M/400 15, Ford FE 12, Ford Modular 4, Ford 429/460 4
- MERKUR: Merkur 3
- MITSUBISHI: Mitsubishi 26
- MORGAN: Morgan 1
- NISSAN: Nissan 27
- OLDSMOBILE: Oldsmobile 49, Small-block Chevy 17, Oldsmobile V8 15, Buick V6 181-252 10, Chevy inline-6 8, Pontiac V8 7
- PACKARD: Packard 2
- PETERBILT MOTOR: Peterbilt Motor 2
- PLYMOUTH: Plymouth 29, Mopar Slant Six 15, Mopar B/RB big block 12, Mopar LA small block 10, Chrysler 426 Hemi 2
- PONTIAC: Pontiac 64, Small-block Chevy 34, Chevy inline-6 14, Pontiac V8 14, Chevy Mark IV big block 8, GM LS 7, Chevy W-series 348/409 6, Buick V6 181-252 5, Oldsmobile V8 4
- PORSCHE: Porsche 3
- RAM: Ram 4, Cummins 6.7 3, Chrysler Gen III Hemi 6.2/6.4 2, Chrysler Gen III Hemi 5.7/6.1 1
- SAAB: Saab 3, GM LS 2
- SATURN: Saturn 21
- SCION: Scion 4
- SHELBY: Small-block Ford (Windsor) 7, Ford FE 4
- STUDEBAKER: Small-block Chevy 2
- STUTZ: Small-block Chevy 2
- SUBARU: Subaru 2
- SUNBEAM: Small-block Ford (Windsor) 5
- SUZUKI: Suzuki 9
- TOYOTA: Toyota 60
- TVR: Small-block Ford (Windsor) 5
- VW: VW 12
- WORKHORSE: Small-block Chevy 2

## Lines not understood (0)

- none

## QA (18)

- spec 41856CP: listed twice on p228; first kept, second has bore ['3.780"', '96.0mm'] vs ['3.780"', '95.8mm']
- spec 50668CP: listed twice on p237; first kept, second has bore ['3.750"', '95.3mm'] vs ['3.750"', '94.2mm']
- spec 51497CP: listed twice on p240; first kept, second has bore ['4.000"', '101.6mm'] vs ['4.000"', '100.1mm']
- 50668CP: oversize lists differ across rows ['STD,.020",.030",.040",.060"', '.040"']; most common kept, union in spec.oversizesAllRows
- 030 90 N0: application widths [1.75, 1.2, 3.0] vs spec listing [1.75, 2.0, 3.0]
- 41858CP: oversize lists differ across rows ['STD,.020",.030",.040"', 'STD']; most common kept, union in spec.oversizesAllRows
- 42300CP: application widths [1.0, 1.0, 2.0] vs spec listing [1.0, 1.2, 2.0]
- 41909: oversize lists differ across rows ['STD', 'STD,.010",.020",.030",.040"']; most common kept, union in spec.oversizesAllRows
- 41856CP: oversize lists differ across rows ['STD,.010",.020",.030",.040"', '.010",.030",.040"']; most common kept, union in spec.oversizesAllRows
- S41940: application widths [2.3, 2.0, 3.44] vs spec listing [2.31, 2.0, 3.46]
- 41768: application widths [3.0, 2.0, 2.5] vs spec listing [3.0, 2.0, 3.46]
- S41768: application widths [3.0, 2.0, 2.5] vs spec listing [3.0, 2.0, 3.46]
- spec S42104: facing printed 'Plasme-Moly', read as Plasma-Moly
- spec S42104: radial wall printed '00.169"', read as 0.169
- spec S42104: radial wall printed '00.172"', read as 0.172
- spec S42104: radial wall printed '00.155"', read as 0.155
- 028 25 N0: application widths [1.2, 1.5, 1.2] vs spec listing [1.2, 1.5, 2.0]
- 7 set numbers not in the content listing (widths from the application columns, no per-ring material): 42047CP, 42097, 42284CP, S41883, S42097, S42170, S42221

## Validation (0 errors)

- no duplicate (p, cat, fam); every record has m p cat fit.fam src; numeric fields numeric; no empty strings
