# COMP Cams — extraction notes

Extracted 2026-10-16 by `scripts/parts-catalog/extract_comp.py`.

## What was fetched

0 HTTP requests to `https://edelbrock-files-v1.s3-us-west-1.amazonaws.com`, one at a time, >= 6 s apart, UA `engine-build.com catalog research (contact: joecsaba@gmail.com)` (this run: --offline, cached PDFs only):


The bucket publishes no `robots.txt` (S3 answers 403 AccessDenied for the missing key; the PDFs themselves return 200). Only the two catalog PDFs named in CLOUD_TASKS.md were downloaded; no compcams.com pages were requested. Downloads live in `dl/comp/` (gitignored); `--offline` re-parses them without the network.

| doc | url | pages | edition (PDF metadata) |
|---|---|---|---|
| lobes | https://edelbrock-files-v1.s3-us-west-1.amazonaws.com/catalogs/COMP-Lobe-Catalog.pdf | 180 | 2016-11 |
| catalog | https://edelbrock-files-v1.s3-us-west-1.amazonaws.com/catalogs/COMP-Catalog.pdf | 356 | 2018-11 |

## Records

| cat | records |
|---|---|
| lobe | 4151 |
| cam | 1531 |
| spring | 99 |
| **total** | 5781 |

### Cams per family

| family | records |
|---|---|
| Small-block Chevy | 327 |
| Chevy Mark IV big block | 170 |
| Small-block Ford (Windsor) | 160 |
| Mopar LA small block | 88 |
| GM LS | 84 |
| Mopar B/RB big block | 71 |
| Ford 429/460 | 69 |
| Pontiac V8 | 50 |
| Ford 351C/351M/400 | 43 |
| Ford FE | 43 |
| Ford Modular | 37 |
| Chevy Gen VI big block | 32 |
| Oldsmobile V8 | 32 |
| Chrysler 426 Hemi | 27 |
| AMC V8 | 25 |
| CHEVROLET 4.3L 262 C.I. 90° 6 CYL. 1980-1997 | 17 |
| Ford Coyote | 16 |
| Harley-Davidson BIG TWIN EVOLUTION 1984-2006 | 15 |
| Cadillac 368-500 | 12 |
| Buick V6 181-252 | 10 |
| Chrysler Gen III Hemi 5.7/6.1 | 9 |
| Chevy W-series 348/409 | 9 |
| GM ECOTEC 2.2L 4 CYL. | 8 |
| Chevy inline-6 | 8 |
| AMC/Jeep inline-6 | 7 |
| FORD 2000-2300 OHC 4 CYL. (4 JOURNAL) 1971-1991 | 7 |
| Buick big block | 7 |
| Buick 350 | 6 |
| CHEVROLET 4.3L 262 C.I. 90° WITH BALANCE SHAFT 6 CYL. 1992-PRESENT | 6 |
| GM 8100/8.1L 8 CYL. 2001-PRESENT | 6 |
| HOLDEN V8 252-308 1970-1988 w/ 1.5 ROCKERS | 6 |
| FORD 3.8L & 4.2L 6 CYL. 1989-2004 | 5 |
| PONTIAC 151 C.I. (2.5L IRON DUKE) 4 CYL. 1978-1989 | 5 |
| NISSAN 1595-1952CC L16, 18, 20B 4 CYL. 1960-1980 | 5 |
| CHRYSLER 2.2L, 2.5L SOHC 4 CYL. 1981-1987 | 4 |
| Mopar Slant Six | 4 |
| GM LT (Gen V) | 4 |
| HONDA/ACURA TWIN CAM VTEC B16A, B17A, B18C, B18C5 1992-2000 | 4 |
| MITSUBISHI 4G63 2.0L DOHC 4 CYL. 1989-1999 | 4 |
| TOYOTA 20R AND 22R 4 CYL. 1974-1989 | 4 |
| VOLKSWAGEN 1200-1600CC TYPE 1 4 CYL. 1955-1971 | 4 |
| Chrysler Gen III Hemi 6.2/6.4 | 3 |
| CHRYSLER 392 HEMI 8 CYL. 1957-1958 | 3 |
| FORD ZETEC 2.0L DOHC 4 CYL. 1995-1997 AND 2000-2003 | 3 |
| Ford 240/300 inline-6 | 3 |
| FORD 2600-2800 OHV 6 CYL. 1972-1980 PASSENGER CARS | 3 |
| FORD 2800 OHV 6 CYL. 1983-1986 BRONCO II/RANGER | 3 |
| FLATHEAD FORD (2 GEAR) 239, 255 C.I. 8 CYL. 1949-1953 | 3 |
| FORD Y-BLOCK 292, 312 C.I. 8 CYL. 1955-1962 | 3 |
| BUICK 198-225 C.I. ODD FIRE 6 CYL. 1962-1967 | 3 |
| BUICK NAILHEAD 364, 401, 425 C.I. 8 CYL. 1957-1966 | 3 |
| CHEVROLET 173-207 C.I. (2.8L-3.4L) 60° 6 CYL. 1979-1994 | 3 |
| CHEVROLET 200-229 C.I. (3.8L) 90° 6 CYL. 1978-1984 | 3 |
| GM 3800/3.8 6 CYL. 1996-PRESENT | 3 |
| Duramax 6.6 | 3 |
| INTERNATIONAL HARVESTER 304-392 C.I. 8 CYL. 1970-1978 | 3 |
| MITSUBISHI 4G63 EVOLUTION VIII 2.0L DOHC 4 CYL. 2003-2005 | 3 |
| NISSAN 2400-2800CC 6 CYL. 1970-1984 | 3 |
| DODGE NEON SOHC 2.0L 4 CYL. 1995-2003 | 2 |
| DODGE VIPER 10 CYL. 1992-2002 | 2 |
| DODGE VIPER 10 CYL. 2003-PRESENT | 2 |
| FORD 144-250 C.I. 6 CYL. 1960-1983 (7.808" DECK) | 2 |
| FORD 4.0L 6 CYL. 1990-2001 | 2 |
| FORD 427 C.I. SOHC 8 CYL. 1963-1965 | 2 |
| CHEVROLET 153 C.I. CHEVY II 4 CYL. 1962-1970 | 2 |
| PONTIAC 151 C.I. 4 CYL. 1977-1993 | 2 |
| HONDA D16Z6 1.6 LITER SOHC 4 CYL. W/ VTEC 1992-1995 CIVIC EX, 1993-1995 DEL SOL SI | 2 |
| HONDA D16Y8 1.6L SOHC 4 CYL. W/ VTEC 1996-2000 | 2 |
| NISSAN Z20, Z22, Z24 4 CYL. 1981-1989 | 2 |
| CHEVROLET V6 ODD FIRE RACE ENGINE | 2 |
| VOLKSWAGEN 1457-1788CC SOHC 4 CYL.1974-1989 | 2 |
| DODGE R5 BLOCK w/ P7 HEADS | 1 |
| FORD L4 2000, 2300 OHC 1983-1987 (SEE FOOTNOTE #53) | 1 |
| FORD L6 240-300 1965-1995 W/ 1.6 ROCKERS | 1 |
| FORD V6 SVO EVEN FIRE w/ 1.6 ROCKERS | 1 |

### Lobes per section

| type | records |
|---|---|
| solid_roller | 1877 |
| hydraulic_roller | 949 |
| solid_flat | 674 |
| ohc_follower | 377 |
| hydraulic_flat | 174 |
| ohc_direct | 100 |

## How each source was parsed

- **Lobes** (`COMP-Lobe-Catalog.pdf`, catalog pp 11-159): pdfplumber `lines` strategy on every ruled table. The two header rows map columns to keys (rated/advertised duration, duration @ .006/.010/.020/.050/.200, lobe lift, tappet lift @ TDC at 106/110/114 deg, theoretical valve lift at the three rocker ratios printed for that table). `valveLift15/16/17` are filled when those ratios are printed; every ratio column is also kept in `valveLiftByRatio`. The merged first column (family, rated-duration tappet lift, minimum tappet diameter, journal suffix codes) is read from the words inside the cell and stored in `spec.family`; header-less continuation tables (112) inherit the previous table's layout. `type` comes from the catalog section (hydraulic flat tappet pp 11-17, hydraulic roller 18-47, solid flat tappet 48-70, solid roller 71-141, OHC pivoting follower 142-154 = `ohc_follower`, OHC direct acting 155-159 = `ohc_direct`). Lobes for intake/exhaust pairs keep the printed pair number as `p` (e.g. `8374-8375`). Rated duration strings such as `240-4` are kept in `ratedDur` with `durAdv` = 240. The index pages (160-176) are not parsed.
- **Springs** (`COMP-Catalog.pdf`): master chart catalog pp 297-307 (one spring per column: type, installed height, OD/ID, inner ID, rate, damper, loads at each height, maximum coil bind height, retainer/seat/locator/shim part numbers) merged with the quick reference table on p 289 (max lift, installed load = `seatLb`, open load/height, coil bind, rate, application group). Beehive/conical `a/b` diameters are stored as top (`odTop`/`idTop`) and base (`od`/`id`); triple springs store `idMiddle`/`idInner`. `seatLb` is the load at installed height. The single/dual/triple listing tables on pp 291-296 were not used (same data, and the even pages' ruled columns merge under pdfplumber).
- **Cams** (`COMP-Catalog.pdf`, catalog pp 8-225 + specialty pp 226-231): each even PDF page carries the words of the whole two-page spread (specs on the left page, kit components on the right page at x >= 621 pt). Words are binned by x to anchors derived from the header words of each engine section (valve setting in/ex, RPM range, part #, grind #, advertised in/ex, @ .050 in/ex, valve lift in/ex at the rocker ratio printed in the header = `rr`, LSA; centerline in/ex on the import pages). Entries are vertical bands of lines closer than 7.5 pt. Component columns are clustered from the right-page data words and labelled with the header words above them; known labels map to `kit.kKit/skKit/clKit/rpKit/lifters/timingSet/rockers/pushrods/springs/retainers/locks/seals/...`, others keep a camel-case slug of the printed label. Every kit value is a list because many entries print two component rows (e.g. a standard and a Magnum rocker/pushrod/spring set). Footnote superscripts (font size < 6) are dropped. The description text left of the valve-setting column is not stored (marketing text). Cam type is read from the series heading (Hydraulic/Mechanical x Flat Tappet/Roller/Follower), falling back to the grind suffix and valve setting.

## Skipped rows and QA items

- Cam entry bands without a part number (e.g. LS truck identification tables, core notes): 418.
- Cam rows repeated under the same family (same PN listed again, e.g. marine/towing re-listings with another RPM range; first kept): 53.
- Cam rows with no engine heading above them (dropped): 0.
- Cam spec cells with several untagged values (first kept): 152.
- Catalog pages parsed as stand-alone spec pages (no components page facing them): [222, 223, 224, 225].
- Lobe rows kept raw (`spec.rawValues`) because the table header does not line up with the values: 34 (Ford Modular XE follower lobes, catalog pp 145-147).
- Lobe tables skipped because no column layout could be inherited: 0.
- Cross-check against the catalog's bold part-number words on the spec pages: 0 not matched by a record.
- Cross-check against the lobe catalog's own index (pp 160-176): 4152 lobe numbers indexed; not extracted: ['13943']; extracted but not indexed: none.
- Multi-value cell samples (catalog page, part, column, values): p42 108100 lsa [112, 112]; p42 108200 lsa [112, 112]; p42 108300 lsa [112, 112]; p76 35-561-44 durAdvInt [271, 269]; p76 35-561-44 durAdvExh [283, 281]; p76 35-561-44 dur050Int [219, 217]; p76 35-561-44 dur050Exh [229, 227]; p76 35-561-44 valveLiftInt [0.603, 0.6]; p76 35-561-44 lsa [108.5, 107.5]; p76 35-562-44 durAdvInt [283, 281]; p76 35-562-44 durAdvExh [295, 293]; p76 35-562-44 dur050Int [231, 229]
- Lobe numbers listed twice with identical specs (second dropped): 25.
- Lobe numbers listed twice with different specs (first kept; QA): 5128 (pp 12/12), 13942 (pp 25/25)
- Lobe cells that were not numeric and were dropped: dur050='@ .050', dur200='@ .200'
- Springs: 98 part numbers in the master chart, 42 in the quick reference, 4 value conflicts between the two (listed on the records).
- master chart p300: part number '269751' read as '26975' (trailing footnote digit)
- spring 26113: installedHt: chart 1.64 vs quick-ref 1.57
- spring 7228: rate: chart 440 vs quick-ref 438
- spring 928: installedHt: chart 1.85 vs quick-ref 1.88
- spring 7245: installedHt: chart 2.05 vs quick-ref 2.0
- `specVariants` on GM AFM/VVT cams: the catalog prints two spec rows per cam tagged D and N (the two lobe sets); the first printed row fills the main keys, both are kept under `specVariants` for QA.
- 4-pattern cams (e.g. 35-561-44, catalog p 76) print two untagged spec rows (the two lobe patterns); only the first row is stored (counted above as multi-value cells). QA if per-pattern specs are wanted.
- Honda/Acura B-series VTEC cams (57100-57400, catalog p 222) print VTEC/primary/secondary lobe columns for intake and exhaust; those columns are not parsed, so the records carry only lash, RPM range and type.
- `sharesSpecsWith`: a second part number printed inside an entry (same cam on another core, e.g. 12-246-20 under 12-246-3) gets a record with the entry's specs and kit.
- Lobe 13943 (catalog p 25) is printed as a second `13942` row in the PDF text, so it is missing; lobe 5128 is printed twice on p 12 with rated duration 265 and 273 (first kept).
- Lobe `type` values `ohc_follower` / `ohc_direct` are outside the four planner cam types (overhead-cam lobes); springs and lobes use `fit.fam = Universal`.
- `fit.ciRange` (e.g. `[262, 400]`) is used when the heading gives a displacement range; `fit.ci` only when it lists displacements.
- Mopar 273-360 (1964-2002) is filed under `Mopar LA small block` only (the Magnum 5.2/5.9 shares the heading but needs the roller cams); Chevrolet 396-454 (1967-1996) under `Chevy Mark IV big block` only; GM LT1/LT4 1995-1997 under `Small-block Chevy`.
- Cams: `emissions` is null; C.A.R.B.-approved series headings are noted in `fit.notes` only. No delete parts exist in these documents.

### Engine headings outside the planner vocabulary (kept as `fit.fam`)

| heading | cam records |
|---|---|
| CHEVROLET 4.3L 262 C.I. 90° 6 CYL. 1980-1997 | 17 |
| Harley-Davidson BIG TWIN EVOLUTION 1984-2006 | 15 |
| GM ECOTEC 2.2L 4 CYL. | 8 |
| FORD 2000-2300 OHC 4 CYL. (4 JOURNAL) 1971-1991 | 7 |
| CHEVROLET 4.3L 262 C.I. 90° WITH BALANCE SHAFT 6 CYL. 1992-PRESENT | 6 |
| GM 8100/8.1L 8 CYL. 2001-PRESENT | 6 |
| HOLDEN V8 252-308 1970-1988 w/ 1.5 ROCKERS | 6 |
| FORD 3.8L & 4.2L 6 CYL. 1989-2004 | 5 |
| PONTIAC 151 C.I. (2.5L IRON DUKE) 4 CYL. 1978-1989 | 5 |
| NISSAN 1595-1952CC L16, 18, 20B 4 CYL. 1960-1980 | 5 |
| CHRYSLER 2.2L, 2.5L SOHC 4 CYL. 1981-1987 | 4 |
| HONDA/ACURA TWIN CAM VTEC B16A, B17A, B18C, B18C5 1992-2000 | 4 |
| MITSUBISHI 4G63 2.0L DOHC 4 CYL. 1989-1999 | 4 |
| TOYOTA 20R AND 22R 4 CYL. 1974-1989 | 4 |
| VOLKSWAGEN 1200-1600CC TYPE 1 4 CYL. 1955-1971 | 4 |
| CHRYSLER 392 HEMI 8 CYL. 1957-1958 | 3 |
| FORD ZETEC 2.0L DOHC 4 CYL. 1995-1997 AND 2000-2003 | 3 |
| FORD 2600-2800 OHV 6 CYL. 1972-1980 PASSENGER CARS | 3 |
| FORD 2800 OHV 6 CYL. 1983-1986 BRONCO II/RANGER | 3 |
| FLATHEAD FORD (2 GEAR) 239, 255 C.I. 8 CYL. 1949-1953 | 3 |
| FORD Y-BLOCK 292, 312 C.I. 8 CYL. 1955-1962 | 3 |
| BUICK 198-225 C.I. ODD FIRE 6 CYL. 1962-1967 | 3 |
| BUICK NAILHEAD 364, 401, 425 C.I. 8 CYL. 1957-1966 | 3 |
| CHEVROLET 173-207 C.I. (2.8L-3.4L) 60° 6 CYL. 1979-1994 | 3 |
| CHEVROLET 200-229 C.I. (3.8L) 90° 6 CYL. 1978-1984 | 3 |
| GM 3800/3.8 6 CYL. 1996-PRESENT | 3 |
| INTERNATIONAL HARVESTER 304-392 C.I. 8 CYL. 1970-1978 | 3 |
| MITSUBISHI 4G63 EVOLUTION VIII 2.0L DOHC 4 CYL. 2003-2005 | 3 |
| NISSAN 2400-2800CC 6 CYL. 1970-1984 | 3 |
| DODGE NEON SOHC 2.0L 4 CYL. 1995-2003 | 2 |
| DODGE VIPER 10 CYL. 1992-2002 | 2 |
| DODGE VIPER 10 CYL. 2003-PRESENT | 2 |
| FORD 144-250 C.I. 6 CYL. 1960-1983 (7.808" DECK) | 2 |
| FORD 4.0L 6 CYL. 1990-2001 | 2 |
| FORD 427 C.I. SOHC 8 CYL. 1963-1965 | 2 |
| CHEVROLET 153 C.I. CHEVY II 4 CYL. 1962-1970 | 2 |
| PONTIAC 151 C.I. 4 CYL. 1977-1993 | 2 |
| HONDA D16Z6 1.6 LITER SOHC 4 CYL. W/ VTEC 1992-1995 CIVIC EX, 1993-1995 DEL SOL SI | 2 |
| HONDA D16Y8 1.6L SOHC 4 CYL. W/ VTEC 1996-2000 | 2 |
| NISSAN Z20, Z22, Z24 4 CYL. 1981-1989 | 2 |
| CHEVROLET V6 ODD FIRE RACE ENGINE | 2 |
| VOLKSWAGEN 1457-1788CC SOHC 4 CYL.1974-1989 | 2 |
| DODGE R5 BLOCK w/ P7 HEADS | 1 |
| FORD L4 2000, 2300 OHC 1983-1987 (SEE FOOTNOTE #53) | 1 |
| FORD L6 240-300 1965-1995 W/ 1.6 ROCKERS | 1 |
| FORD V6 SVO EVEN FIRE w/ 1.6 ROCKERS | 1 |

Validation: no duplicate (part, family) within the brand, every record has m/p/cat/fit.fam/src, numeric fields are numbers, no empty strings.
