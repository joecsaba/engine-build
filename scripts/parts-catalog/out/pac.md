# PAC Racing Springs - extraction notes

Source: `Catalogs\PAC_CATALOG_VOL_24_05.06.24 REVISED ISSUU.pdf` (56 pages, catalog Vol. 24, revised 2024-05-06; saved by hand under `Catalogs/`, no network used). Printed page numbers match PDF page numbers.

Records: 479 (464 unique part numbers; a part listed for several engine families is repeated once per family).

## Counts

| cat | records |
|---|---|
| retainer | 291 |
| spring | 188 |

| cat / spec.type | records |
|---|---|
| retainer / lock | 106 |
| retainer / retainer | 115 |
| retainer / shim | 19 |
| retainer / shim kit | 4 |
| retainer / spring seat | 39 |
| retainer / step seat | 4 |
| retainer / tool steel seat | 4 |
| spring / beehive | 44 |
| spring / conical | 3 |
| spring / dual | 82 |
| spring / kit | 24 |
| spring / single | 10 |
| spring / triple | 25 |

| fit.fam | records |
|---|---|
| Universal | 365 |
| GM LS | 55 |
| Ford Modular | 14 |
| Chevy Mark IV big block | 7 |
| Chevy Gen VI big block | 7 |
| Chrysler Gen III Hemi 6.2/6.4 | 5 |
| Ford Godzilla 7.3 | 4 |
| Chrysler Gen III Hemi 5.7/6.1 | 3 |
| Ford Coyote | 3 |
| Harley V-Rod (catalog heading) | 3 |
| GM LT (Gen V) | 2 |
| Small-block Chevy | 2 |
| AMC V8 | 2 |
| Gen V Hemi (catalog heading) | 1 |
| Cummins 5.9 24V/CR | 1 |
| Powerstroke 6.0 | 1 |
| Powerstroke 6.4 | 1 |
| Duramax 6.6 | 1 |
| Dodge Viper V10 (catalog heading) | 1 |
| Mini Cooper Gen 2 (catalog heading) | 1 |

### Spring table rows per page

| page | series / group | rows |
|---|---|---|
| 9 | 1400 Conical | 3 |
| 10 | 1200 Drag Race | 10 |
| 12 | 1300 Drag Race Dual | 26 |
| 16 | 1300 Drag Race Triple | 19 |
| 20 | 1200 Circle Track Endurance | 12 |
| 22 | 1300 Circle Track Dual | 15 |
| 26 | 1400 Specialty & Class Specific | 11 |
| 28 | 1900 Hot Rod | 14 |
| 30 | Diesel Diesel | 3 |
| 32 | 1200 Ovate Beehive | 11 |
| 34 | RPM Beehive RPM | 18 |
| 36 | RPM Dual RPM | 10 |

Load-vs-height tables parsed for 150 part numbers; kits 29 rows; retainers 115; locks 106; seats/shims 70.

### Spec coverage (springs with a table row)

| key | springs with value | of |
|---|---|---|
| od | 163 | 164 |
| id | 163 | 164 |
| installedHt | 164 | 164 |
| seatLb | 164 | 164 |
| openLb | 164 | 164 |
| rate | 164 | 164 |
| coilBind | 164 | 164 |
| maxLift | 164 | 164 |
| loads | 162 | 164 |
| retainers | 153 | 164 |
| weight | 162 | 164 |

## Method

- Spring tables: one text row per spring (`PN  diameters  seat @ installed  open @ open-height  [PN]  rate  coil bind  max lift  retainers  seats  comment`). Diameter columns differ per page and are mapped by a per-page layout table in the script; wrapped retainer lists and comments are collected from the band between neighbouring rows, split at the x of the `Comments` header.
- Load tables (`Spring loads and heights`): one column per part number; each value is assigned to the nearest part-number column by x-position. Mass and natural frequency rows are kept (`weight`, `freqOuter/Middle/Inner`). Coil bind and the seat load at installed height are cross-checked against the spec row (differences are listed below).
- `maxLift` is PAC's own published value (not computed). `dual` is true for dual and triple springs; `damper` only where the page has a Damper column. Beehive/conical springs store the large end as `od`/`id` and the small end as `odTop`/`idTop`.
- Fitment: `Universal` unless the row comment names an engine or the p38 late-model cross reference lists the spring. Comment text is kept short in `spec.application`.
- Retainers: `cat: retainer`, `spec.type: retainer`; locks `spec.type: lock`; seats/shims `spec.type: step seat | spring seat | tool steel seat | shim | shim kit`. Retainer `fitsSprings` is PAC's own 'Fits 1211, 1215 ...' list.
- Spring kits (p41): `cat: spring`, `spec.type: kit`, component part numbers under `spec.kit`.

## Skipped

- PAC-KS04: Harley-Davidson kit (motorcycle), out of scope
- PAC-KS05: Harley-Davidson kit (motorcycle), out of scope
- p40 motorcycle springs (PAC-MX1xx/MX2xx, 12 rows): powersports, out of scope.
- p52 valvetrain tools (installed height gauges, calibration springs), p53-56 terms and order forms.
- Unknown-family headings kept verbatim in `fit.fam` with '(catalog heading)': see the family table above.

## QA (28 notes)

- p10 PAC-1250: open height printed as '.200' (typo); stored null
- p11 load table: PAC-1250 @ 1.100 = 668 is off the load line (~1198); dropped as a merged/truncated digit string
- p14 load table: PAC-1322 @ 1.650 = 10 is off the load line (~1100); dropped as a merged/truncated digit string
- p14 load table: PAC-1336 @ 1.450 = 12 is off the load line (~1122); dropped as a merged/truncated digit string
- p14 load table: PAC-1357 @ 1.150 = 15 is off the load line (~1155); dropped as a merged/truncated digit string
- p14 load table: PAC-1361 @ 1.600 = 10 is off the load line (~1100); dropped as a merged/truncated digit string
- p14 load table: PAC-1361H @ 1.600 = 16 is off the load line (~1166); dropped as a merged/truncated digit string
- p18 load table: PAC-1364 @ 1.550 = 15 is off the load line (~1155); dropped as a merged/truncated digit string
- p18 load table: PAC-1364M @ 1.100 = 567 is off the load line (~1483); dropped as a merged/truncated digit string
- p18 load table: PAC-1379 @ 1.150 = 18 is off the load line (~1188); dropped as a merged/truncated digit string
- p26 PAC-1280X: 1 diameter tokens ['NA'] for layout ['od', 'id', 'idInner']; diameters read from wrapped cells where possible
- p27 load table: PAC-1421 @ 1.150 = 5434 is off the load line (~434); dropped as a merged/truncated digit string
- PAC-1421: load table repeated on p9 and p27 with different values; p9 kept
- p28 PAC-1902: 2 diameter tokens ['No', 'NA'] for layout ['od', 'id', 'damper', 'idInner']; diameters read from wrapped cells where possible
- p28 PAC-1902: diameters [1.295, 0.859, 1.45, 1.014] read as top/bottom OD/ID pairs (beehive printed over two lines); verify
- p33 load table: PAC-1213 @ 0.950 = 607 is off the load line (~208); dropped as a merged/truncated digit string
- p33 load table: PAC-1215 @ 1.100 = 456 is off the load line (~312); dropped as a merged/truncated digit string
- p35 load table: column header PAC-1275X printed twice; second column ignored (catalog error)
- p50 PAC-S161: spring ID printed as '.0870' (typo); stored null
- PAC-1354L: max lift 1.0 exceeds installed height - coil bind (0.870)
- PAC-1326H: seat load 300 @ 2.000 in the spec row but the load table says 275
- PAC-D100: catalog says 'Cummins 5.9/6.4L 24V'; there is no 6.4L Cummins (6.7 probable) - mapped to Cummins 5.9 24V/CR only
- coil bind differs between the spec row and the load table (spec row / table; spec row kept in coilBind, table value in coilBindLoadTable) for 49 springs: PAC-1423 (1.136 / 1.15), PAC-1331 (1.16 / 1.15), PAC-1332 (1.16 / 1.15), PAC-1335 (0.985 / 0.99), PAC-1361H (1.215 / 1.22), PAC-1364 (1.115 / 1.1), PAC-1364L (1.115 / 1.1), PAC-1364M (1.115 / 1.1), PAC-1366 (1.146 / 1.15), PAC-1200 (1.09 / 1.075), PAC-1201 (1.115 / 1.13), PAC-1201X (1.115 / 1.13), PAC-1202 (1.1 / 1.075), PAC-1227 (1.11 / 1.13), PAC-1244 (1.055 / 1.035), PAC-1294 (1.185 / 1.18), PAC-1297 (1.11 / 1.13), PAC-1326H (1.15 / 1.137), PAC-1340 (1.195 / 1.18), PAC-1344 (1.055 / 1.035), PAC-1371 (1.175 / 1.19), PAC-1373 (1.152 / 1.16), PAC-1373L (1.152 / 1.16), PAC-1385 (1.145 / 1.14), PAC-1386 (1.14 / 1.15), PAC-1427 (1.175 / 1.19), PAC-1427H (1.175 / 1.19), PAC-1529 (1.09 / 1.085), PAC-1216L (1.13 / 1.048), PAC-1900 (1.1 / 1.115), PAC-1903 (1.06 / 1.05), PAC-1914 (1.1 / 1.075), PAC-1916 (1.135 / 1.09), PAC-1940 (1.12 / 1.15), PAC-1950 (1.115 / 1.13), PAC-1213 (1.02 / 0.964), PAC-1214 (1.04 / 1.03), PAC-1215 (1.14 / 1.093), PAC-1218 (1.115 / 1.096), PAC-1219 (1.115 / 1.1), PAC-1223 (0.88 / 0.85), PAC-1235 (1.13 / 1.1), PAC-1286 (1.06 / 1.08), PAC-1217X (0.975 / 0.965), PAC-1218X (1.115 / 1.14), PAC-1219X (1.115 / 1.1), PAC-1220X (1.165 / 1.21), PAC-1223X (0.88 / 0.9), PAC-1237X (1.045 / 1.05)
- PAC-KS23: kit listed twice on p41 (second time under 'RPM Series - Beehive Spring Kits'); first row kept
- PAC-KS24: kit listed twice on p41 (second time under 'RPM Series - Beehive Spring Kits'); first row kept
- PAC-KS25: kit listed twice on p41 (second time under 'RPM Series - Beehive Spring Kits'); first row kept
- PAC-1221X: appears in a load table (p37) but has no spec row
- PAC-1912: appears in a load table (p29) but has no spec row

## Validation

- OK: no duplicate part numbers within a family, all records have m/p/cat/fit.fam/src, numeric fields are numbers, no empty strings.
