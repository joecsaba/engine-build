# BD extraction notes (BD Diesel)

Extracted 2026-10-16 by `extract_bd.py`. Source: public Shopify `https://ca.bddiesel.com/products.json?limit=250&page=N` (the Canadian storefront; the US hosts fail TLS chain verification, as the brief says).

## Fetch

- robots.txt: robots.txt fetched and parsed (`User-agent: *` / `Allow: /`, no Crawl-delay; /products.json is not disallowed); requests spaced 6 s apart, one at a time.
- `ca.bddiesel.com`: 4 page request(s) of up to 250 products, 849 products in the listing. Pages cached under `dl/bd/`.
- Prices (CAD on this storefront) are not stored.

## Records

Total records: **244** (one record per variant SKU per engine family)

| m (brand) | cat | records |
|---|---|---|
| Alliant Power | injector | 3 |
| BD Diesel | injector | 90 |
| BD Diesel | manifold | 63 |
| BD Diesel | turbo | 70 |
| BorgWarner | turbo | 5 |
| Bosch | injector | 4 |
| Garrett | turbo | 9 |

| cat | records |
|---|---|
| injector | 97 |
| manifold | 63 |
| turbo | 84 |

Rows per engine family (a part that fits several families is one record per family with the same `p`):

| fit.fam | cat | records |
|---|---|---|
| Caterpillar 3406E/C15 *(not in cam-fitment.json)* | manifold | 2 |
| Caterpillar 3406E/C15 *(not in cam-fitment.json)* | turbo | 2 |
| Caterpillar C12 *(not in cam-fitment.json)* | turbo | 1 |
| Chrysler Gen III Hemi 5.7/6.1 | manifold | 5 |
| Chrysler Gen III Hemi 6.2/6.4 | manifold | 3 |
| Cummins 5.9 12V | injector | 3 |
| Cummins 5.9 12V | manifold | 2 |
| Cummins 5.9 12V | turbo | 4 |
| Cummins 5.9 24V/CR | injector | 31 |
| Cummins 5.9 24V/CR | manifold | 8 |
| Cummins 5.9 24V/CR | turbo | 20 |
| Cummins 6.7 | injector | 29 |
| Cummins 6.7 | manifold | 14 |
| Cummins 6.7 | turbo | 18 |
| Cummins ISX *(not in cam-fitment.json)* | turbo | 5 |
| Detroit Diesel *(not in cam-fitment.json)* | turbo | 2 |
| Duramax 6.6 | injector | 26 |
| Duramax 6.6 | manifold | 3 |
| Duramax 6.6 | turbo | 9 |
| Ford 6.2 Boss *(not in cam-fitment.json)* | manifold | 3 |
| Ford EcoBoost *(not in cam-fitment.json)* | manifold | 6 |
| Ford EcoBoost *(not in cam-fitment.json)* | turbo | 2 |
| GM 6.2/6.5 diesel *(not in cam-fitment.json)* | turbo | 1 |
| GM LS | manifold | 3 |
| Powerstroke 6.0 | injector | 2 |
| Powerstroke 6.0 | manifold | 3 |
| Powerstroke 6.0 | turbo | 5 |
| Powerstroke 6.4 | injector | 1 |
| Powerstroke 6.4 | manifold | 3 |
| Powerstroke 6.4 | turbo | 3 |
| Powerstroke 6.7 | injector | 1 |
| Powerstroke 6.7 | manifold | 5 |
| Powerstroke 6.7 | turbo | 11 |
| Powerstroke 7.3 | injector | 4 |
| Powerstroke 7.3 | manifold | 3 |
| Powerstroke 7.3 | turbo | 1 |

| emissions | records |
|---|---|
| `oem_replacement` | 127 |
| `unknown` | 117 |

## How fields were derived

- **Scope**: the listing is BD Diesel's full catalog (transmissions, converters, exhaust brakes, injection pumps, lift pumps, manifolds, turbos, injectors, hardware, apparel). Only `injector`, `turbo` and `manifold` are emitted, as the brief asks. Injection pumps (P7100 / VP44 / CP3 / VE, about 30 products) are in the catalog but outside this task's three categories; they are counted under Skipped and could be added as `injectionPump` later.
- **Brand** (`m`): the Shopify `vendor` field on this store is just the SKU, so the brand is taken from the product type (Garrett, BorgWarner, Alliant Power, Bosch) or the SKU shape (Bosch `0445…`/`0986…` numbers, Garrett `nnnnnn-nnnnS`, Alliant `APnnnnn`); everything else is `BD Diesel`. Resold Garrett/Bosch/Alliant Power stock parts therefore keep their own brand, with `src.doc` saying they came from bddiesel.com.
- **Fitment** comes from BD's application tags (`Dodge / 5.9L Cummins 04.5-07`, `Chevy/GM / Duramax 6.6L 11-16 LML-LGH`, `Ford / 6.7L Powerstroke 17-up`, ...) mapped to the shared family strings; the year range is then taken from the per-year fit tags (`2013/dodge-ram/ram-3500/6-7`) for that family's displacement, clipped to the application tag's window (so the 94-98 12-valve and 98.5-02 24-valve tags, which share the `5-9` code, get separate ranges). A product with both `07.5-12` and `13-18` tags becomes one `Cummins 6.7` record spanning both. Half-year breaks are floored into `y0` with `from 2004.5` in `fit.notes`; `19-up` / `17-up` tags leave `y1` as the last model year the fit tags list, noted as `listed through 2024`. Duramax engine codes (LB7/LLY/LBZ/LMM/LML/LGH/L5P) go to `fit.notes`, as do pickup vs cab & chassis, with/without SCR and 'non-California spec' from the title. Gasoline applications (`Ford / Gasoline`, `Dodge / Gasoline`, `Chevy/GM / Gasoline`) are resolved from the engine named in the title (3.5L EcoBoost, 6.2L Boss, 5.7L / 6.4L Hemi, Silverado 1500 V8 -> `GM LS`). Heavy-duty applications (Cummins ISX, Cat 3406E/C15/C12, Detroit) keep the catalog heading and are flagged.
- **Injectors**: one record per variant. `pctOver` and `hpRating` from the variant title (`33% (60hp)`, `50 HP`, `StockPlus 5-15 HP` -> `hpRatingLow` 5 / `hpRating` 15 with `grade: StockPlus`); plain `Stock` and stock replacement listings get `pctOver: 0`; the Ram 2019+ Bosch injectors carry `oemRating` Standard/High Output. `variantNote: Premium option` marks BD's Premium variant (the listing does not say what it adds). `stage` for the CP3-pump + injector packages (`package` says what is included). `type` common rail / HEUI / ISB / P7100 mechanical from the title; `diCode` and `cylinders` for the 7.3L HEUI DI-code injectors; `replacesOem` from the Bosch / Navistar numbers in the title; `tip` for the 12-valve VCO nozzles; `condition` new/reman (UpTime and Alliant Power 'refreshed' units are reman, exchange injectors are reman).
- **Turbos**: `compressorInducer` / `turbineWheel` (mm) and `ar` from the Iron Horn variant codes (`S364SXE/80 0.91 AR` -> 64 / 80 / 0.91, model `S364 SX-E`), the title (`S400 78/96 1.32`, `75mm / 96mm / 1.32 A/R`) or the body ('61.5mm billet compressor wheel', '13-blade 66mm turbine wheel', '66.2mm compressor and 67mm turbine wheels', '0.84 A/R turbine housing'); `model` is the turbo frame (HE351CW, HE300VG, HX35, GT37, GTP38, AVNT3788, GT3788VA, S400SX4, S478, S363 SX-E...); `vgt` true for VGT / AVNT / GT37 / HE300VG units, false for wastegated HX35 / S300 / S400 / GTP38 frames; `series` Screamer / Super B / Iron Horn / Howler / Turbo Thruster II; `stage`; `kit` and `includesManifold` for turbo + manifold packages; `compound` / `pair` for the 6.4L twins and EcoBoost pairs; `flange` T3/T4/T6; `hpCapable` from 'up to 690 horsepower'; `hpLow`/`hpHigh` from '600hp-750hp'; `flowLbMin`, `boostPsi`; `billetCompressor`; `cartridge` BorgWarner SX-E; `replacesOem` from the Ford number in the title; `condition` new / reman (exchange and remanufactured units).
- **Manifolds**: all exhaust. `side` driver / passenger / single / both (kits for V8s), `flange` T3/T4/T6 or `HE351 (OEM)`, `mount: stock` for stock-mount replacements, `angleDeg` for the 20/40-degree Cummins manifolds, `wastegated`, `pulse` (divided pulse manifold), `pieces`, `material` (high-silicon ductile iron), `wallThickness` (inches, from '0.275" thick-walled'), `coating`, `kit` (gaskets + hardware included), `includesUpPipes`, `egrCompatible`, `egtPort`, `flowGainPct` (BD's quoted flow gain over stock).
- **emissions**: no CARB EO number is printed anywhere in this listing, so `carb_eo:` is never emitted. `oem_replacement` for stock-rated injectors (`pctOver: 0`), stock / OEM / exchange / service-replacement turbos (and the 'Stock Replacement' tag), and exhaust manifolds that keep the stock turbo flange (BD's thicker replacement castings); `no_eo_race_only` would come from a race-only / not-for-California disclaimer (none found); everything else (performance injectors, StockPlus, Screamer / Super B / Iron Horn / Howler turbos, T4 / T6 / wastegated manifolds) is `unknown`. Two turbos claim '50-state legal' / 'C.A.R.B. compliant' without a number: `spec.carbClaim` records the wording and they are flagged below for a human to look up the EO. Delete parts: none in the three categories (the only 'delete' items are transmission cooler-bypass deletes).

## Skipped

- **transmission / converter / driveline**: 302
  - 1041223 Flexplate AS69RC Ram 3500/4500/5500 6.7L Cummins 2013-2018
  - 1064784SS TOWMASTER TRANSMISSION & CONVERTER PACKAGE ALLISON 1000 CHEVROLET SILVERADO/ GMC SIERRA 6.6L DURAMAX 2017-2019
  - 1064884SS ROADMASTER TRANSMISSION & CONVERTER PACKAGE ALLISON 1000 CHEVROLET SILVERADO & GMC SIERRA 2500HD/3500HD 6.6L LML DURAMAX 2011-2016
  - 1064874SS ROADMASTER TRANSMISSION & CONVERTER PACKAGE ALLISON 1000 CHEVROLET SILVERADO & GMC SIERRA 2500HD/3500HD 6.6L LMM DURAMAX 2007.5-2010
  - 1064864SS ROADMASTER TRANSMISSION & CONVERTER PACKAGE ALLISON 1000 CHEVROLET SILVERADO & GMC SIERRA 2500HD/3500HD 6.6L LBZ DURAMAX 2006-2007
  - 1064854SS ROADMASTER TRANSMISSION & CONVERTER PACKAGE ALLISON 1000 CHEVROLET SILVERADO & GMC SIERRA 2500HD/3500HD 6.6L LB7 DURAMAX 2001-2004
  - 1064794SS ROADMASTER TRANSMISSION & CONVERTER PACKAGE ALLISON 1000 CHEVROLET SILVERADO / GMC SIERRA 6.6L L5P DURAMAX 2017-2019
  - 1065024SM TORQUEMASTER TRANSMISSION & CONVERTER PACKAGE AISIN AS69RC RAM 3500/4500/5500 6.7L 2019-2024
  - ... 294 more
- **other: Large Parcel**: 61
  - DJPLB100111 PRECISION PLUS LONG BLOCK ENGINE CHEVROLET/GMC SILVERADO/SIERRA 6.6L LML DURAMAX 2011-2016
  - DJPLB100116 ESSENTIAL LONG BLOCK ENGINE CHEVROLET/GMC SILVERADO/SIERRA 6.6L LML DURAMAX 2011-2016
  - DJPSB100022 ESSENTIAL SHORT BLOCK ENGINE DODGE/RAM 6.7L CUMMINS 2013-2018
  - DJPSB100021 ESSENTIAL SHORT BLOCK ENGINE DODGE/RAM 6.7L CUMMINS 2007.5-2012
  - DJPSB100020 ESSENTIAL SHORT BLOCK ENGINE DODGE/RAM 5.9L CUMMINS 2004.5-2007
  - DJPSB100019 ESSENTIAL SHORT BLOCK ENGINE DODGE/RAM 5.9L CUMMINS 2003-2004
  - DJPSB100018 PRECISION PLUS SHORT BLOCK ENGINE DODGE/RAM 5.9L CUMMINS 2003-2004
  - DJPSB100008 PRECISION PLUS SHORT BLOCK ENGINE DODGE/RAM 6.7L CUMMINS 2013-2018
  - ... 53 more
- **exhaust brake (not a task category)**: 39
  - 1027349 ELECTRONIC EXHAUST BRAKE 5.0-INCH RAM 2500/3500 6.7L CUMMINS 2013-2024
  - 1027348 ELECTRONIC EXHAUST BRAKE 4.0IN RAM 2500/3500 6.7L CUMMINS 2013-2024
  - 1027347 ELECTRONIC EXHAUST BRAKE 5.0IN RAM 2500/3500 6.7L CUMMINS 2007.5-2012
  - 1027346 ELECTRONIC EXHAUST BRAKE 4.0IN RAM 2500/3500 6.7L CUMMINS 2007.5-2012
  - 1027344 EXHAUST BRAKE (REMOTE) w/NON-VGT TURBO & 4-INCH EXHAUST KIT c/w AIR COMPRESSOR DODGE 6.7L CUMMINS 2007.5-2017
  - 1027345 EXHAUST BRAKE (REMOTE) w/NON-VGT TURBO & 5-INCH EXHAUST KIT c/w AIR COMPRESSOR DODGE 6.7L CUMMINS 2007.5-2017
  - 1230100 Replacement Exhaust Brake Vacuum Spool Control Valve
  - 1409591 Clamp V-Band Exhaust Brake/System
  - ... 31 more
- **turbo parts / hardware / accessories**: 37
  - 1043060 TURBO INSTALL KIT FORD F150 3.5L ECOBOOST 2017-2020
  - 1045819 Turbo Mounting Gasket Kit Ford 6.0L Power Stroke 2003-2007
  - 1045999 HE300 TURBO MOUNTING KIT RAM 6.7L CUMMINS 2019-2024
  - 1045630 TURBO INTAKE HORN CHEVY/GM 2500HD & 3500HD 6.6L DURAMAX 2017-2022
  - 1048010 Turbo Mounting Kit (T6 Turbo)
  - 1047137 Coolant Tube Relocation Kit, Howler Turbo - Dodge Automatic 2003-2005 5.9L
  - 1045923 Turbo Actuator HE300VG Dodge 6.7L Cummins 2013-2024
  - 1045922 Turbo Actuator HE351 Dodge/ram 2500/3500 6.7L Cummins 2007.5-2012 (Non-Corded w/ Adapter)
  - ... 29 more
- **injection pump (not in this task's categories)**: 33
  - 1050496 Venom CP3 Conversion Kit c/w Standard Pump - Chevy/GMC Duramax 6.6L 2011-2016 2500/3500
  - 1500068 Return Spring Bracket for Bosch P7100 Mechanical Inline Injection Pump Dodge 5.9L Cummins 1994-1998
  - 1050112 Injection Pump Stock Exchange CP3 Chevy LBZ/LMM Duramax 2006-2010
  - 0986437421 Duramax CP4 Pump - Chevy 2011-2016 6.6L LGM/LML
  - 1040181 P7100 AFC Spring Kit Dodge 12-valve 5.9L Cummins 1994-1998
  - 1052913 High Power Injection Pump P7100 400hp 3200rpm Dodge Cummins 5-speed Manual Transmission 1996-1998
  - 1052911 High Power Injection Pump P7100 400hp 3200rpm Dodge Cummins Automatic Transmission 1996-1998
  - 1051913 High Power Injection Pump P7100 300hp 3000rpm Dodge Cummins 5-speed Manual Transmission 1996-1998
  - ... 25 more
- **other: Suspension/Steering**: 28
  - 1302038 TRACK BAR BUSHING KIT 1032018 2013+ DODGE CUMMINS
  - 1032160 STEERING UPGRADE KIT CHEVY/GM DURAMAX 1500HD 2001-2003 & 2005-2007 & 2500 HD/3500HD SILVERADO / SIERRA 2001-2010
  - 1302074 Sector Shaft Bolt 30mm Flange - Dodge/RAM 2003-up
  - 1032018 Track Bar Kit RAM 4wd 2500 2014-2025 / 3500 2013-2025
  - 1032113 TRACK BAR BRACKET Ford SuperDuty F250/F350 4wd 2008-2022
  - 1032124 TIE ROD KIT CHEVY/GM DURAMAX 2500 HD / 3500HD SILVERADO/SIERRA 2011-2024
  - 1312068 Sway Bar End Link Bushing Kit Dodge Cummins 2013+
  - 1312062 Sway Bar End Link Bushing Kit Dodge Cummins 2010-2012
  - ... 20 more
- **lift pump / fuel-system hardware**: 25
  - 1050335 VENOM FUEL LIFT PUMP C/W FILTER & SEPARATOR DODGE 5.9L CUMMINS 2003-2004.5
  - 1050334 VENOM FUEL LIFT PUMP C/W FILTER & SEPARATOR DODGE 6.7L CUMMINS 2013-2022
  - 1050333 VENOM FUEL LIFT PUMP C/W FILTER & SEPARATOR DODGE 5.9L/6.7L CUMMINS 2005-2012
  - 1050323 VENOM DURAMAX FUEL LIFT PUMP c/w FILTER & SEPARATOR CHEVY 6.6L DURAMAX 2011-2016
  - 1050322 VENOM FUEL LIFT PUMP C/W FILTER & SEPARATOR CHEVY 6.6L DURAMAX 2001-2010
  - 1031319 LED Kit Transmission Pressure Controller Ford 6.7L Power Stroke 6R140 2011-2019
  - 1050231 Lift Pump OEM Replacement Dodge 5.9L Cummins 2003-2004.5
  - 1500388 SPRING Fuel Pressure Control BLUE Ford 6.0L Power Stroke 2003-2007
  - ... 17 more
- **other: Hose & Clamp**: 20
  - 1045218 INTERCOOLER HOSE & CLAMP KIT RAM 2500/3500/4500/5500 6.7L CUMMINS 2013-2018
  - 1452225 V-Band Clamp S300 Compressor Half Marmon Flange
  - 1405222 Big Daddy Intercooler Hose (/Inch) 4in
  - 1405213 Constant Tension Hose Clamp 4in High Torque
  - 1405212 Constant Tension Hose Clamp 3.5in High Torque
  - 1405211 Constant Tension Hose Clamp 3in High Torque
  - 1405209 Constant Tension Hose Clamp 2.75in High Torque
  - 1405208 Constant Tension Hose Clamp 2.59in-2.94in High Torque
  - ... 12 more
- **manifold hardware / gasket / tool**: 14
  - 1041660 EXHAUST MANIFOLD BRACKET / BOLT & SPACER KIT RAM/DODGE/JEEP 5.7L HEMI: 1500 09-26 / 2500-3500 09-18 / DURANGO 11-26 / GRAND CHEROKEE & WAGONEER 11-24
  - 1045998 EXHAUST MANIFOLD GASKET SET STOCK MOUNT RAM 3500/4500/5500 CAB & CHASSIS 6.7L CUMMINS 2019-2024
  - 1045997 EXHAUST MANIFOLD GASKET SET STOCK MOUNT RAM 2500/3500 PICKUP 6.7L CUMMINS 2019-2024
  - 1045994 Exhaust Manifold Gasket Set Cummins 6.7L RAM 2013-2018 Cab & Chassis
  - 1041483 Exhaust Manifold Bolt & Spacer Kit - Ford F250/F350 6.0L Power Stroke 2003-2007
  - 1045982 Exhaust Manifold Bolt and Spacer Kit Dodge 5.9L/6.7L Cummins 1998.5-2024
  - 1048008 ISX Exhaust Manifold T6 Upgrade 10mm Studs Cummins Pre-2002
  - 1045992-T4 Exhaust Manifold Gasket Set T4 Mount Dodge 6.7L Cummins 2007.5-2018
  - ... 6 more
- **injector hardware / lines / install kit (no injectors)**: 14
  - 1050170 INJECTOR LINE SET CHEVY/GM 6.6L DURAMAX LML 2011-2016
  - 1050458 INJECTOR CONNECTOR W/PIGTAIL CHEVY/GM DURAMAX L5P 2017-2022 (4-PACK)
  - 1050457 INJECTOR CONNECTOR W/PIGTAIL CHEVY/GM DURAMAX L5P 2017-2022 (SINGLE)
  - 1050157 INJECTOR INSTALL KIT DODGE 6.7L CR CUMMINS 2007-2018
  - 1050156 INJECTOR INSTALL KIT DODGE 5.9L CR CUMMINS 2006-2007
  - 1050155 INJECTOR INSTALL KIT DODGE 5.9L CR CUMMINS 2003-2005
  - 1050141 INJECTOR INSTALL KIT GMC 6.6L LB7 DURAMAX 2001-2004
  - 1050165 INJECTOR LINE SET FORD 6.7L POWER STROKE 2011-2021
  - ... 6 more
- **other: High Idle**: 12
  - 1036616 HIGH IDLE CONTROL FORD F250 / F350 / F450 / F550 / F600 6.2L/6.8L/7.3L GASOLINE 2017-2022
  - 1036613 HIGH IDLE CONTROL FORD F-SERIES SUPERDUTY F250 / F350 / F450 / F550 / F600 2023+
  - 1036627 High Idle Kit Duramax 2500 HD/3500 HD 2008-2019 & 4500 HD/5500 HD/6500 HD 2019
  - 1036622 High Idle Kit Dodge/RAM 5.9L-6.7L Cummins / Chevy-GMC Duramax
  - 1036621 High Idle Kit Dodge 5.9L Cummins 2005-2006
  - 1036620 High Idle Kit Dodge 5.9L Cummins 24-valve & CR w/ Bell Rank mounted APPS 1998.5-2004
  - 1036612 High Idle Control Ford 6.7L Power Stroke F-Series SuperDuty F250 / F350 / F450 / F550 / F600 2017-2022
  - 1036610 High Idle Switch Ford 6.0L/6.4L/6.7L Power Stroke F250/F350/F450/F550 2005-2016 & 6.7L/6.8L/7.3L F650/F750 2016-2024
  - ... 4 more
- **other: Throttle Controls**: 12
  - 1057942 TS BOOSTER V3.0 VW/AUDI/PORSCHE
  - 1057932 TS Booster V3.0 Chevy/Dodge/Ford/GMC/Jeep (Check application listings)
  - 1057938 TS Booster V3.0 Chevy/GMC/Dodge/Jeep/Fiat/Nissan (Check application listings)
  - 1057934 TS Booster V3.0 Ford (Check application listings)
  - 1057931 TS Booster v3.0 Dodge/Jeep (Check application listings)
  - 1057939 TS Booster V3.0 Toyota (Check application listings)
  - 1057941 TS BOOSTER V3.0 BMW
  - 1057940 TS Booster V3.0 Toyota/Subaru (Check application listings)
  - ... 4 more
- **apparel / merch**: 8
  - 2870141 BD PERFORMANCE MFG GREY PULLOVER HOODIE
  - 2827011 BD PERFORMANCE MANUFACTURING GRAPHIC T-SHIRT BLACK
  - 2802011 BD T-SHIRT "SIZE MATTERS" TURBO GRAPHIC BLACK
  - 2934001 Multifunctional Gaiter - BD Diesel Black 3-Layer
  - 2904010 Beanie Black w/Cuff and Pom-Pom - One Size
  - 2901010 Beanie Black - One Size
  - 2906270 Retro Hat Curve Bill/Mesh Back
  - 2933001 Multifunctional Gaiter BD Diesel Black
- **other: Air Horn**: 7
  - 1041566 X-Flow Power Intake Elbow Dodge 6.7L Cummins 2013-2018
  - 1041564 Open Grid X-Intake Dodge 2500/3500 6.7L Cummins 2007.5-2018
  - 1041563 X-Flow Air Intake Heater Kit Dodge 2500/3500 6.7L Cummins 2007.5-2018
  - 1041561 X-Flow Power Intake Elbow Dodge 6.7L Cummins 2010-2012
  - 1041560 X-Flow Power Intake Elbow Dodge 6.7L Cummins 2007.5-2009
  - 1041555 X-Flow Power Intake Elbow Dodge 5.9L Cummins 2003-2007
  - 1041550 X-Flow Power Intake Elbow Dodge 24-valve 5.9L Cummins 1998-2002
- **delete part (skipped by rule)**: 5
  - 1061530 COOLER BYPASS DELETE GM 6L80 2014-2018
  - 1061532 COOLER BYPASS DELETE CHEVY/GM ALLISON 2017-2019
  - 1061531 COOLER BYPASS DELETE CHEVY SILVERADO/GMC SIERRA 1500 8L90 1/2" COOLER LINES 2019-2023
  - 1061527 Cooler Bypass Delete Dodge 2500/3500/4500/5500 6.7L Cummins 68RFE/AS69RC 2019-2024
  - 1061528 Cooler Bypass Delete Dodge RAM 2500/3500/4500/5500 68RFE/AS69RC 2013-2018 & 66RFE/AS66RC 2014-2018
- **emissions-system part (EGR / DPF / SCR)**: 5
  - 1043909 UP-PIPES KIT W/EGR CONNECTOR FORD F250/F350/F450/F550 SUPERDUTY 6.4L POWER STROKE 2008-2010
  - 1043917 UP-PIPES KIT w/EGR CONNECTOR FORD 6.0L POWER STROKE 2003-2004
  - 1043918 Up-Pipes Kit w/EGR Connector Ford 6.0L Power Stroke 2004.5-2007
  - FLOSS868NB Stainless Steel Exhaust Race DPF Pipes Dodge Cummins 2013-2018 6.7L 4-inch No-Bungs
  - 1090201 EGR Cooler Replacement w/Round Tube Ford 6.0L Power Stroke 2003-2004 (up to 09/22/2003)
- **other: Bosch**: 5
  - F00RC00647 Bosch 6.7L Cummins Common Rail Supply Connector Tube - Cummins 6.7L Dodge 2007-2018
  - F00RJ01572 BOSCH COMMON RAIL SUPPLY CONNECTOR TUBE DODGE/RAM 5.9L CUMMINS 2003-2007
  - 1110010011 Bosch Common Rail Pressure Relief Valve - Chevy 2004.5-2005 Duramax 6.6L
  - 0445226044 Bosch 6.7L Cummins CR Fuel Rail Dodge 2007.5-2012
  - 0445226014 Bosch 5.9L Cummins CR Fuel Rail Dodge 2003-2007
- **other: Turbo Accessories**: 5
  - 99800-0450 V-Band Clamp - S400 Compressor Outlet Half Marmon
  - 1453602 V-Band Clamp S400 Full Marmon Turbine/S300 SX-E (Non-Cobra)
  - 1405926 Clamp Exhaust V-Band Super B/HX40
  - 1045911 Turbine Housing (16cm) Dodge 5.9L Cummins 1988-1993
  - 1040310 HX35 Boost Elbow Dodge 5.9L Cummins 1994-2002
- **other: Flo-Pro Exhaust**: 3
  - FLOSS860 Stainless Steel Exhaust Kit Chevy Duramax 2011-2015 6.6L LML 4-inch 2500/3500 EC-CC/SB-LB-Dually
  - FLOSS862 Stainless Steel Exhaust Race Pipe Set Chevy Duramax 2011-2015 6.6L LML 2500/3500 4-inch EC-CC/SB-LB w/o 4-Bolt Flange
  - FLOSS857NB Stainless Steel Exhaust Race Pipes Ford Powerstroke 2011-2019 6.7L F250/F350/F450 Pick-up 4-inch No-Bungs
- **other: BorgWarner**: 3
  - 14961019007 Borg Warner Performance Turbine Housing S400SX4 - 96mm 1.15 A/R Twin Volute T6
  - 13009097049 Borg Warner S300SX-E Super-Core - 66mm/80mm FMW
  - 13009097047 Borg Warner S300SX-E Super-Core - 63mm/80mm FMW
- **up-pipe kit (not a manifold)**: 3
  - 1043803 PASSENGER SIDE UP-PIPE CHEVY/GMC LB7 DURAMAX 2001-2004
  - 1043900 Up-Pipes Kit Ford 7.3L Power Stroke 1999.5-2003 F-250 / F-350 / Excursion / E-350
  - 1043800 UP-PIPES KIT CHEVY/GMC LB7 DURAMAX 2001-2004
- **other: Intake Pipe**: 3
  - 1047038 Cold Side Intercooler Pipe Kit Ford 6.7L Power Stroke 2011-2016
  - 1042595 Intercooler Intake Pipe Dodge 6.7L Cummins 2007-2009
  - 1042590 Intercooler Intake Pipe Dodge 5.9L Cummins 2003-2007
- **other: CCV Filter**: 3
  - CV52001FLG CRANKCASE VENTILATION FILTER DODGE/RAM 2500/3500/4500/5500 6.7L CUMMINS 2007.5-2024
  - 1302171 CCV Replacement Filter Element
  - 1032170 Crank Case Vent Filter Kit - Ford 7.3L Power Stroke 1999-2003
- **other: Bully Dog**: 3
  - BUL42214 Bully Dog Unlock Cable - Dodge 2013-up
  - BUL40420 Bully Dog GT Platinum Tuner
  - BUL40384 Bully Dog Sensor Station w/Pyro Probe
- **other: Bostech**: 3
  - BOSHPOP-123X High Pressure Oil Pump Ford 6.0L DI 2003-2004 BOSTECH
  - BOSHPOP-122X High Pressure Oil Pump Ford 6.0L DI 2004.5-2008 BOSTECH
  - BOSHPOP-008X High Press Oil Pump Ford 7.3L DI 1999.5-2003 BOSTECH
- **other: Valve Cover**: 2
  - DJPCNC100360 BILLET BREATHER COVER DODGE/RAM 2500/3500 PICKUP & 2500/3500/4500/5500 CAB & CHASSIS 6.7L CUMMINS 2007.5-2024
  - DJPCNC100068 Billet Valve Cover Dodge/Ram 5.9L/6.7L Cummins 2006-2024
- **other: PMD**: 2
  - 1036533 PMD (Grey) Extension Cable 72-inch - Chevy/GMC 6.5L 1994-2000
  - 1036530 PMD (Black) Extension Cable 40-inch - Chevy/GMC 6.5L 1994-2000
- **other: Exhaust Manifolds**: 2
  - 1462434 Stud Install Tool M8x1.25
  - 1045996-WGK Waste Gate Regulator Kit
- **other: Garrett**: 2
  - 792593-0001 Vane Control Valve Solenoid, Garrett VGT - Ford 2003-2007 6.0L Powerstroke – GM 2004-2016 6.6L Duramax (OE# 5C3Z6F089BA)
  - 763527-0712 Vane Position Sensor, Garrett GT37 - Chevy Duramax 6.6L 2004.5-2016 (LLY Require Adapter Cable 771864-0001)
- **other: Screamer Turbos**: 2
  - 1047136 Howler VGT Complete Install Kit c/w Controller Dodge 5.9L Cummins 2003-2007
  - 1047135 Howler VGT Controller Kit Dodge 5.9L Cummins 2003-2007
- **other: FICM**: 2
  - P554685 Replacement Filter Cartridge - Coolant Filter - Ford 6.0L Power Stroke 2003-2007
  - 1059700-A 58-VOLT FUEL INJECTION CONTROL MODULE (FICM) FORD 6.0L POWER STROKE 2003-2007
- **other: Wastegate**: 2
  - 1057020 Boost Fooler Ford 7.3L Power Stroke 1999.5-2003
  - 1047160 DTurbo Boost Control Adjustable Waste Gate Kit Chevy LB7 Duramax 2001-2004
- **other: CR Injectors**: 2
  - 1050071 FUEL RAIL PLUG CHEVY 2500/3500 6.6L DURAMAX 2004.5-2010 / DODGE 2500/3500 6.7L CUMMINS 2007.5-2018
  - 1050070 FUEL RAIL PLUG DODGE 5.9L CUMMINS 2003-2007
- **other: KDP**: 2
  - 1040183 Killer Dowel Pin (KDP) Dodge 24-valve 5.9L Cummins 1998-2002
  - 1040182 Killer Dowel Pin (KDP) Dodge 12-valve 5.9L Cummins 1994-1998
- **other: Frost Plug**: 2
  - 1040023 Killer Frost Plug Plate Dodge 5.9L/6.7L Cummins 2003-2018
  - 1040022 Killer Frost Plug Plate Dodge 5.9L Cummins 1989-2002
- **other: Engines**: 1
  - DJPCNC100098 BILLET BRIDGES DODGE/RAM 2500-5500 5.9L/6.7L CUMMINS 1998-2018
- **other: Valve Covers**: 1
  - DJPCNC100071 Billet Valve Cover Dodge Cummins 2003-2005
- **other: OIL LINE**: 1
  - 1453104 OIL DRAIN DODGE/RAM 6.7L CUMMINS 2007.5-2018
- **other: REBUILD IT**: 1
  - 1064048 TRANSMISSION FILTER SERVICE KIT RAM AISIN AS69RC 2013-2024
- **other: FLOPRO**: 1
  - FLO20811-BD Downpipe Aluminized 4-Inch Replacement Dodge 2004.5-2007 5.9L
- **other: Upgrade Kit**: 1
  - 1041520 KILLER GRID HEATER UPGRADE KIT DODGE/RAM 6.7L CUMMINS 2500/3500 PICK-UP 3500/4500/5500 CAB & CHASSIS 2007-2024
- **other: Steering/Suspension**: 1
  - 1032126 END LINKS (PAIR) CHEVY/GM DURAMAX 2500 HD / 3500HD SILVERADO/SIERRA 2001-2019
- **other: Venom**: 1
  - 1050341 Venom Lift Pump Replacement Filter Dual-Pack - Fuel & Water Separator
- **other: OEM Turbos**: 1
  - 1045921 Wastegate Control Valve Dodge 5.9L Cummins (4036054) 2004.5-2007
- **other: Fuel Cap**: 1
  - 1050073 Patriot Fuel Plug Cap Ram 6.7L Cummins 2013-2018 / Ram 3.0L EcoDiesel 2014-2018
- **other: Alliant Power**: 1
  - AP63458 Accelerator Pedal Position Sensor (APPS) - Dodge 1998-2004 5.9L
- **other: Cool Down Timer**: 1
  - 1081160 Cool Down Timer Kit v2.0
- **other: Low Pressure Alarm**: 1
  - 1081130 Low Fuel Pressure Light & Alarm Kit Dodge 24-valve 5.9L Cummins 1998-2007
- **injector nozzle set (no category)**: 1
  - 1075831 Nozzle Set 5.9L Cummins 24-valve
- **other: Race Turbos**: 1
  - 1045240 Downpipe Kit - S400 4in Aluminized Full Marmon 4.2
- **other: Super B Turbos**: 1
  - 1045223 Down Pipe Kit, 4in HX40/Super B Dodge 5.9L Cummins 1994-2002
- **other: Coolant Filter**: 1
  - 1032121 Coolant Filter Kit Ford 6.0L Power Stroke 2003-2007

## Needs human QA

Families not in `cam-fitment.json` (catalog heading kept in `fit.fam`):

- `Caterpillar 3406E/C15`: 4 record(s)
- `Caterpillar C12`: 1 record(s)
- `Cummins ISX`: 5 record(s)
- `Detroit Diesel`: 2 record(s)
- `Ford 6.2 Boss`: 3 record(s)
- `Ford EcoBoost`: 8 record(s)
- `GM 6.2/6.5 diesel`: 1 record(s)

Judgement calls:

- The brief says BD holds CARB EOs on several lines; the products.json bodies never print an EO number, so every record is `unknown` or `oem_replacement`. The EO numbers would have to come from BD's CARB documentation page (not fetched: not part of the products.json source).
- Injector `hpRating` is the gain BD quotes for that variant ('33% (60hp)'), not engine output; 'StockPlus 5-15 HP' is a 5-15 HP gain with no % figure.
- 'INJECTORS & INSTALL KIT' listings include a set of BD-Built stock injectors plus lines and tubes: `injector` with `set` and `kit`. 'INJECTOR INSTALL KIT' (no injectors) is skipped.
- 'Performance CR Pump & Injectors Package' (Stage 1/2/3) bundles a 12 mm stroker CP3 with injectors; filed as `injector` with `spec.package` so the pump is not lost, since `injectionPump` is outside this task.
- 'Screamer Turbo Manifold Package' and 'Iron Horn Turbo Manifold Package' are `turbo` records with `includesManifold`; the Iron Horn 5.9L kit's 11 variants are the BorgWarner SX-E frame / turbine / A/R options.
- The 5.9L Super B and Iron Horn kits are tagged for both 94-98 12-valve and 98.5-02 24-valve, so they appear once per family with the same `p`.
- Howler 'VGT Turbo Kit' and 'Howler Stock VGT Turbo Kit' include the HE351VE-type turbo; the Howler controller and install kits (no turbo) are skipped.
- The 'Replacement S400SX4 Turbo' listed under product type `Turbo` with Cummins ISX / Detroit tags is filed under those heavy-duty headings; its BorgWarner twin (product type `BorgWarner`) is filed under brand BorgWarner.
- Exhaust manifold `side: both` is set for V8 'kit' / 'set' listings whose body says the set includes both sides; Cummins inline-6 kits are single manifolds with hardware.

- 26 stock-replacement turbo record(s) carry no wheel sizes (the listing gives only the frame / OEM number); they are not listed individually below.

Per-record flags:

- BD Diesel 1045872: performance turbo without compressor wheel size in title/variant/body: SCREAMER TURBO MANIFOLD PACKAGE RAM 2500/3500 6.7L CUMMINS 2019-2024 / Default Title
- BD Diesel 1045818: body claims '50-state legal' but prints no CARB EO number; emissions left 'unknown': SCREAMER STAGE 1 PERFORMANCE GT37 TURBO FORD F250/F350 6.0L POWER STROKE 2003-2007
- BD Diesel 1045850: performance turbo without compressor wheel size in title/variant/body: SCREAMER TURBOCHARGERS FORD F-250/F-350/F450 6.7L POWERSTROKE 2020-2022 / Default Title
- BD Diesel 1045758: performance turbo without compressor wheel size in title/variant/body: Screamer HX35 Turbo Dodge 5.9L 24 Valve Cummins 2500/3500 1999-2002 / Default Title
- BD Diesel 1047621: performance turbo without compressor wheel size in title/variant/body: Screamer Turbochargers Ford 3.5L EcoBoost F-150 2013-2016 / Default Title
- BD Diesel 1047620: performance turbo without compressor wheel size in title/variant/body: Screamer Turbochargers Ford 3.5L EcoBoost F-150 2011-2012 / Default Title
- BD Diesel 1045871: performance turbo without compressor wheel size in title/variant/body: Screamer Turbo Manifold Package RAM 6.7L Cummins 2013-2018 / Default Title
- BD Diesel 1045870: performance turbo without compressor wheel size in title/variant/body: Screamer Turbo Manifold Package Dodge 6.7L Cummins 2007.5-2012 / Default Title
- BD Diesel 1045772: performance turbo without compressor wheel size in title/variant/body: Screamer HE300VG Turbo RAM 6.7L Cummins 2019-2024 / Default Title
- BD Diesel 1045852: performance turbo without compressor wheel size in title/variant/body: Iron Horn Turbo Kit 6.7L Power Stroke 2011-2014 / Default Title
- BD Diesel 1045768: performance turbo without compressor wheel size in title/variant/body: Screamer HE351CW Turbo Dodge Pick-up 5.9L Cummins 2003-2007 / Default Title
- BD Diesel 1047083: performance turbo without compressor wheel size in title/variant/body: 6.4L PowerStroke Screamer V2S Twin Turbo Kit Ford 2008-2010 / W/O Intake System
- BD Diesel 1047082: performance turbo without compressor wheel size in title/variant/body: 6.4L PowerStroke Screamer V2S Twin Turbo Kit Ford 2008-2010 / C/W Intake System
- BD Diesel 1045837: performance turbo without compressor wheel size in title/variant/body: SCREAMER TURBO CHEVY/GM LB7 6.6L DURAMAX 2001-2004 / Default Title
- BD Diesel 1047511: body claims 'C.A.R.B. compliant' but prints no CARB EO number; emissions left 'unknown': Turbo Thruster II Kit Ford 7.3L Power Stroke (Pick-up only/No E-Series) 1999.5-2003
- BD Diesel 1045828: performance turbo without compressor wheel size in title/variant/body: Screamer Turbo Ford Pick-up 6.7L Power Stroke F250 / F350 2015-2016 / Default Title
- BD Diesel 1045827: performance turbo without compressor wheel size in title/variant/body: Screamer Turbo Ford 6.7L Power Stroke F250 / F350 / F450 / F550 Pick-up & Cab-Chassis 2017-2019 / Default Title
- BD Diesel 1045825: performance turbo without compressor wheel size in title/variant/body: Screamer Stage 2 GT37 Retrofit Turbo Kit - Ford 6.7L Power Stroke F250/F350 2011-2014 & F450/F550 2011-2016 / Default Title
- BD Diesel 1045824: performance turbo without compressor wheel size in title/variant/body: Screamer Stage 1 GT37 Retrofit Turbo Kit Ford 6.7L Power Stroke F250/350 2011-14 & F450/550 2011-16 / Default Title
- BD Diesel 1045770: performance turbo without compressor wheel size in title/variant/body: Screamer HE351 Turbo Dodge Pick-up 6.7L Cummins 2007.5-2012 / Default Title
- BD Diesel 1047140: performance turbo without compressor wheel size in title/variant/body: Howler VGT Turbo Kit Dodge 5.9L Cummins 2003-2007 / Default Title
- BD Diesel 1045840: performance turbo without compressor wheel size in title/variant/body: Screamer Turbo Chevy LLY/LBZ/LMM Duramax 2004.5-2010 / Default Title
- BD Diesel 1045830: performance turbo without compressor wheel size in title/variant/body: Screamer Turbo Chevy LML Duramax 2011-2016 / Default Title
- BD Diesel 1045821: performance turbo without compressor wheel size in title/variant/body: Screamer Stage 2 Performance GT37 Turbo Ford 6.0L Power Stroke 2003-2007 / Default Title
- BD Diesel 1045771: performance turbo without compressor wheel size in title/variant/body: Screamer HE300VG Turbo Dodge 6.7L Cummins 2013-2018 / Default Title

## Validation

Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src emissions`, numeric fields are numbers, years are integers, no empty strings.
