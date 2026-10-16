# DIESEL-SHOPIFY extraction notes (Wagler, Colt Cams, Manton, Dynomite, Banks, ATS, Bullet Proof Diesel, Stainless Diesel, Smeding)

Extracted 2026-10-16 by `extract_diesel_shopify.py`. Source: each store's public Shopify `/products.json?limit=250&page=N`. robots.txt fetched first per host; one request at a time, spaced 6 s (or the robots Crawl-delay) apart; 403 / challenge pages stop that host without retry. Prices are not stored.

## Fetch

| store | host | status | pages | products | note |
|---|---|---|---|---|---|
| Wagler | `www.waglercompetition.com` | ok | 1 | 56 | robots.txt read; /products.json allowed; request spacing 6 s |
| Colt Cams | `www.coltcams.com` | ok | 1 | 39 | robots.txt read; /products.json allowed; request spacing 6 s |
| Manton | `www.mantonpushrods.com` | ok | 1 | 193 | robots.txt read; /products.json allowed; request spacing 6 s |
| Dynomite Diesel | `www.dynomitediesel.com` | ok | 2 | 425 | robots.txt read; /products.json allowed; request spacing 6 s |
| Banks Power | `www.bankspower.com` | ok | 2 | 326 | robots.txt read; /products.json allowed; request spacing 6 s |
| ATS Diesel | `www.atsdiesel.com` | ok | 2 | 311 | robots.txt read; /products.json allowed; request spacing 6 s |
| Bullet Proof Diesel | `www.bulletproofdiesel.com` | ok | 3 | 582 | robots.txt read; /products.json allowed; request spacing 6 s |
| Stainless Diesel | `www.stainlessdiesel.com` | ok | 4 | 903 | robots.txt read; /products.json allowed; request spacing 6 s |
| Smeding Diesel | `www.smedingdiesel.com` | ok | 1 | 203 | robots.txt read; /products.json allowed; request spacing 6 s |

## Records

Total records: **2732** (one record per variant SKU per engine family; variants that differ only by color / finish are collapsed into one record with `spec.finishOptions`)

| m (brand on the listing) | cat | records |
|---|---|---|
| ARP | fastener | 5 |
| ATS Diesel | gasket | 36 |
| ATS Diesel | headGasket | 1 |
| ATS Diesel | manifold | 14 |
| ATS Diesel | turbo | 93 |
| Banks - Please Call | header | 1 |
| Banks Non-Sale | intake | 2 |
| Banks Power | gasket | 1 |
| Banks Power | header | 5 |
| Banks Power | intake | 59 |
| Banks Power | intercooler | 15 |
| Banks Power | manifold | 12 |
| Banks Power | oilCooler | 1 |
| Banks Power | tuner | 34 |
| Banks Power | turbo | 5 |
| Bullet Proof Baja | oilCooler | 4 |
| Bullet Proof Diesel | gasket | 2 |
| Bullet Proof Diesel | injector | 9 |
| Bullet Proof Diesel | intercooler | 3 |
| Bullet Proof Diesel | manifold | 3 |
| Bullet Proof Diesel | oilCooler | 12 |
| Bullet Proof Diesel | turbo | 1 |
| Colt Cams | cam | 23 |
| Colt Cams | lifter | 5 |
| Diamond Advantage | injector | 3 |
| Dynomite Diesel | injectionPump | 5 |
| Dynomite Diesel | injector | 56 |
| Exergy Performance | gasket | 9 |
| Exergy Performance | injectionPump | 43 |
| Exergy Performance | injector | 190 |
| Fleece Performance | injectionPump | 1 |
| Ford | gasket | 7 |
| Ford | headGasket | 3 |
| Ford | oilCooler | 2 |
| Ford | oilPump | 1 |
| Ford | rocker | 4 |
| Ford | turbo | 1 |
| G&R Diesel Inc. | injectionPump | 2 |
| G&R Diesel Inc. | manifold | 2 |
| G&R Diesel Inc. | rocker | 1 |
| GB Remanufacturing | injector | 3 |
| Garrett | turbo | 3 |
| HSP Diesel | crank | 1 |
| HSP Diesel | injectionPump | 1 |
| HSP Diesel | intake | 7 |
| HSP Diesel | manifold | 2 |
| Manton | head | 8 |
| Manton | pushrod | 8 |
| Manton | rocker | 22 |
| Manton Diesel | pushrod | 56 |
| Manton Diesel | spring | 12 |
| Mopar | oilCooler | 1 |
| Power Driven Diesel | head | 22 |
| Power Driven Diesel | pushrod | 8 |
| Power Driven Diesel | retainer | 2 |
| Power Driven Diesel | rocker | 3 |
| Power Driven Diesel | spring | 6 |
| S&S Diesel Motorsport | injectionPump | 18 |
| S&S Diesel Motorsport | injector | 117 |
| S&S Diesel Motorsports | injectionPump | 1 |
| Smeding Diesel | crank | 3 |
| Smeding Diesel | fastener | 2 |
| Smeding Diesel | gasket | 11 |
| Smeding Diesel | head | 1 |
| Smeding Diesel | injectionPump | 1 |
| Smeding Diesel | intake | 1 |
| Smeding Diesel | intercooler | 9 |
| Smeding Diesel | manifold | 335 |
| Smeding Diesel | pushrod | 2 |
| Smeding Diesel | rod | 1 |
| Smeding Diesel | spring | 4 |
| Smeding Diesel | turbo | 1147 |
| Stage V | head | 3 |
| Stainless Diesel | crank | 1 |
| Stainless Diesel | fastener | 3 |
| Stainless Diesel | gasket | 12 |
| Stainless Diesel | intake | 6 |
| Stainless Diesel | intercooler | 2 |
| Stainless Diesel | manifold | 11 |
| Stainless Diesel | turbo | 137 |
| Various | gasket | 6 |
| Various | injector | 4 |
| Wagler | cam | 2 |
| Wagler | crank | 2 |
| Wagler | head | 1 |
| Wagler | injectionPump | 4 |
| Wagler | lifter | 1 |
| Wagler | oilPump | 2 |
| Wagler | pistonKit | 5 |
| Wagler | pushrod | 2 |
| Wagler | rocker | 1 |
| Wagler | rod | 11 |
| Wagler | rotatingAssembly | 10 |
| Wagler | spring | 1 |
| atsdiesel | turbo | 1 |
| djprecisionmachine.com | head | 10 |

| cat | records |
|---|---|
| cam | 25 |
| crank | 7 |
| fastener | 10 |
| gasket | 84 |
| head | 45 |
| headGasket | 4 |
| header | 6 |
| injectionPump | 76 |
| injector | 382 |
| intake | 75 |
| intercooler | 29 |
| lifter | 6 |
| manifold | 379 |
| oilCooler | 20 |
| oilPump | 3 |
| pistonKit | 5 |
| pushrod | 76 |
| retainer | 2 |
| rocker | 31 |
| rod | 12 |
| rotatingAssembly | 10 |
| spring | 23 |
| tuner | 34 |
| turbo | 1388 |

Rows per engine family (a part that fits several families is one record per family with the same `p`):

| fit.fam | records |
|---|---|
| 2013 to Current GM 6.2L GEN V LT - Series 5 Performance Upgrade Pushrods *(not in cam-fitment.json)* | 1 |
| 2013 to Current GM 6.2L GEN V LT -Series 3 Pushrods *(not in cam-fitment.json)* | 1 |
| Chevy Gen VI big block | 5 |
| Chevy Mark IV big block | 5 |
| Chrysler Gen III Hemi 5.7/6.1 | 12 |
| Cummins *(not in cam-fitment.json)* | 61 |
| Cummins 4BT *(not in cam-fitment.json)* | 8 |
| Cummins 5.9 12V | 92 |
| Cummins 5.9 24V/CR | 454 |
| Cummins 6.7 | 515 |
| Cummins 8.3 ISC *(not in cam-fitment.json)* | 1 |
| Duramax 6.6 | 437 |
| Ford 351C/351M/400 | 6 |
| Ford 6.2 gas *(not in cam-fitment.json)* | 1 |
| Ford Godzilla 7.3 | 2 |
| Ford Modular | 1 |
| GM 2.8 Duramax *(not in cam-fitment.json)* | 1 |
| GM LS | 12 |
| Jeep 2.0 turbo *(not in cam-fitment.json)* | 2 |
| Jeep 3.6 Pentastar *(not in cam-fitment.json)* | 3 |
| Jeep 4.0 inline-6 *(not in cam-fitment.json)* | 4 |
| Manton Rocker Arm 1.7 Ratio *(not in cam-fitment.json)* | 1 |
| Manton's All Pro RE-13 Wide Pad Cylinder Head Shaft Mounted Rocker Arm System *(not in cam-fitment.json)* | 1 |
| Manton's CID LS-CR Cylinder Head Shaft Mounted Rocker Arm System *(not in cam-fitment.json)* | 1 |
| Manton's Kaase SR-71 Cylinder Head Shaft Mounted Rocker Arm System *(not in cam-fitment.json)* | 1 |
| Manton's LT - Rocker Arm System (LME Edelbrock ONLY) *(not in cam-fitment.json)* | 1 |
| Powerstroke 6.0 | 111 |
| Powerstroke 6.4 | 32 |
| Powerstroke 6.7 | 123 |
| Powerstroke 7.3 | 19 |
| RAM 3.0 EcoDiesel *(not in cam-fitment.json)* | 6 |
| Stage V by Manton - Exhaust Rocker Arm 1.6 Ratio - Aftermarket Racing Heads *(not in cam-fitment.json)* | 1 |
| Stage V by Manton - Intake Rocket Arm 1.7 Ratio - Aftermarket Racing Heads *(not in cam-fitment.json)* | 1 |
| Toyota *(not in cam-fitment.json)* | 1 |
| Universal *(not in cam-fitment.json)* | 7 |
| Unknown *(not in cam-fitment.json)* | 800 |
| Volkswagen air-cooled *(not in cam-fitment.json)* | 2 |

Fitment source: body 49, none 821, tags 144, title 1400, variant 208

Emissions flags: carb_eo 29, no_eo_race_only 44, oem_replacement 44, unknown 2246

## How fields were derived

- **Category** from the product title (skip words first: merch, tools / order forms / core charges, EGR/DPF/DOC/SCR parts and deletes, transmission / driveline, lines / brackets / seals / adapters, exhaust and piping, accessories), then category words. Everything skipped is counted below with examples.
- **Brand (`m`)** is the Shopify `vendor` (normalized); stores that resell other brands (Wagler: S&S Diesel kits; Colt Cams: Power Driven Diesel heads; Stainless Diesel: HSP Diesel) keep the maker's name.
- **Part number (`p`)** is the variant SKU. When a product has one variant and the body prints `Part Number: X`, X is used (HSP lists color SKUs like `602-HSP-RAW` and the base PN in the body). A listing with no SKU at all keeps the store handle as `p` with `src.skuMissing: true` (flagged below).
- **Fitment** from the variant title, then the product title, then the store's tags (Banks `Make_` / `Engine_` / `Year_`; ATS bare years + displacement + make; Colt `12v` / `24v` / `5.9L` / `Powerstroke`), then the body's first lines. Cummins 5.9 is split 12V / 24V-CR by text (12V, 24V, VP44, P7100, common rail) or by model years (<=1998 12V, >=1998.5 24V); 2007.5+ is `Cummins 6.7`. Duramax engine codes set the years when none are printed. GM gas trucks are `GM LT (Gen V)` from 2014 and `GM LS` before (judgement call).
- **Specs** are regex reads of the title / variant / body only: pushrod `diameter x wall`, standalone length (4-13.5 in), `Set of N`; cam `NNN/NNN` next to `.050` (or `advertised`), `.xxx/.xxx lift`, `LSA`, RPM range, stage, type words; lift pump GPH / psi; injector % over / HP / LPM; pump type / % over / mm stroker; turbo wheel mm, A/R, VGT, model code; piston bore / CR / CH / pin / dish; rod length / big end / pin / bolt. Missing numbers are left out and flagged under QA.
- **`emissions`** (injector, injectionPump, turbo, tuner, intake, manifold, intercooler, liftPump only): a CARB EO number in the body -> `carb_eo:D-xxx-xx`; Banks `CA-Exclusion` tag (not for sale in California, i.e. no EO) or race-only wording -> `no_eo_race_only`; stock / OEM replacement wording on a non-performance part -> `oem_replacement`; otherwise `unknown`. Internal parts are `null`.

## Skipped

- **ATS Diesel** - accessory with no task category: 2
  - ATS Diesel | Doomsday Device Dipstick Overflow Control Fits 2007.5 and Up 6.7L Cummins w/ Automatic Trans...
  - ATS Diesel | ATS Coolant Recirculation Kit Fits 2003-2007 Ford 6.0L Power Stroke
- **ATS Diesel** - apparel / merch: 7
  - ATS Diesel | ATS Black Trucker Hat One Size Fits All
  - ATS Diesel | ATS Hat, Black, Flex Fit, L/XL
  - ATS Diesel | ATS Hat, Gray, Flex Fit, S/M
  - ATS Diesel | ATS T-Shirt, Grey, Unisex, Clean Diesel Two Print
  - atsdiesel | ATS Hoodie, Charcoal Grey w/ Two Print Logo
  - atsdiesel | ATS Long Sleeve T-Shirt, Black w/ Two Print Logo
  - ATS Diesel | ATS Wastegate Solenoid Plug Cap Fits 2003-2007 5.9L Cummins
- **ATS Diesel** - emissions-system part or delete (skipped by rule): 1
  - ATS Diesel | ATS Aurora ti HE500VG, Drop-in Replacement HD Turbo for Cummins ISX07, ISX1, ISX-EGR, and...
- **ATS Diesel** - exhaust / piping / filters (no task category): 3
  - ATS Diesel | ATS AIR FILTER FOR ATS AIRBOX FITS 2003-2012 5.9 & 6.7L CUMMINS
  - ATS Diesel | ATS High Flow Air Filter Cone Style
  - ATS Diesel | ATS Cold Side Charge Pipe Fits 2011-2016 and 2017-2026 6.7L Power Stroke
- **ATS Diesel** - hardware (lines / brackets / seals / fasteners / adapters ...): 12
  - ATS Diesel | ATS CAN/PW Breakout Harness for Benchtop Calibrator
  - ATS Diesel | Analog Extension Harness Adapter for Benchtop Calibrator
  - ATS Diesel | ATS E4OD BASIC REBUILD KIT FITS 1996-1998 7.3L POWER STROKE
  - ATS Diesel | ATS E4OD BASIC REBUILD KIT FITS 1989-1995 7.3L POWER STROKE
  - atsdiesel | ATS Billet MAP Sensor Adapter, 2011-2019 Ford 6.7L Power Stroke
  - ATS Diesel | ATS Fuel Rail Pressure Plug Fits 2001-2004+ 6.6L Duramax
  - ATS Diesel | ATS Fuel Rail Pressure Plug Fits 2003-2007+ 5.9L / 6.7L Cummins
  - ATS Diesel | ATS E4Od Master Rebuild Kit Fits 1989-1998 7.3L Power Stroke
  - ... 4 more
- **ATS Diesel** - manifold hardware / gasket / sensor: 1
  - ATS Diesel | ATS Diesel Exhaust Manifold Stud and Fastener Set for 1994-2018 Dodge Cummins
- **ATS Diesel** - other: Fuel Pressure Regulator: 3
  - ATS Diesel | ATS Electronic Fuel Regulator Fits 2001-2010 6.6L Duramax
  - ATS Diesel | ATS Electronic Fuel Regulator Fits 1999-2007 7.3L 6.0L Power Stroke
  - ATS Diesel | ATS Electronic Fuel Regulator Fits 1998 - 2018 - 5.9L & 6.7L Cummins
- **ATS Diesel** - other: Injection Pump: 1
  - ATS Diesel | ATS 545Rfe Heavy Duty Pump Fits 2003+ 5.7L Hemi
- **ATS Diesel** - other: Transmission Control Module: 1
  - ATS Diesel | ATS 47REApps / TPS Signal Conditioner Fits 1998.5-2002 5.9L Cummins
- **ATS Diesel** - other: Transmissions Upgrade Components: 1
  - ATS Diesel | ATS E4OD OVERHAUL KIT FITS 1989-1995 7.3L POWER STROKE
- **ATS Diesel** - tool / service / order form: 6
  - ATS Diesel | Generic 3-Year Warranty (1 Year for Electronics and Refurbished ATS Products)
  - atsdiesel | ATS HE300VG Benchtop Turbo Calibration Tool, Complete Kit W/ All Adapters (US Style Power Plug)
  - ATS Diesel | ATS HE300VG Benchtop Turbo Calibration Tool Fits 2007.5-Current Dodge RAM 6.7L Cummins (US...
  - ATS Diesel | ATS Benchtop Turbo Calibration Tool, Box And Power Wiring Only, No Adapters (US Style Power Plug)
  - ATS Diesel | ATS G56 Performance Manual Transmission Fits 2005.5-2018 5.9L 6.7L Cummins
  - ATS Diesel | ATS Nv5600 2WD 4WD Performance Manual Transmission Fits 2000-Early 2005 5.9L Cummins
- **ATS Diesel** - transmission / driveline: 202
  - ATS Diesel | ATS Billet Thermal Bypass Valve Insert for 2019-Current 3.6L / 2.0L Jeep Wrangler JL &...
  - ATS Diesel | ATS Thermal Bypass Valve Mounting Bracket for 2019-2024 RAM 6.7L Cummins
  - ATS Diesel | ATS Thermal Bypass Valve O-ring Kit (Includes 4 O-Rings)
  - ATS Diesel | ATS NAG1 / 722.6 / W5A580 Thermal Bypass Valve Upgrade for 2002-2018 Jeep / 2005-Current...
  - ATS Diesel | ATS 7.3L Allison Conversion for 1999-2003 Ford 7.3L Power Stroke
  - ATS Diesel | ATS 47RE 48RE Billet Channel Plate Valve Body Upgrade Fits 1996-2007 Dodge 5.9L Cummins
  - ATS Diesel | ATS 47RE 48RE Billet Channel Plate Performance Valve Body Fits 1996-2007 Dodge 5.9L Cummins
  - ATS Diesel | ATS Thermal Bypass Valve Up-Grade for 2010-2012 6.7L Cummins
  - ... 194 more
- **ATS Diesel** - turbo hardware / plumbing: 15
  - ATS Diesel | ATS Harness Adapter for Benchtop Calibrator Fits 2019-Current GM 2.7L L3B I-4 Turbo
  - ATS Diesel | ATS Harness Adapter for Benchtop Calibrator Fits Isuzu IHI RHF55V Turbocharger Actuators
  - ATS Diesel | ATS Harness Adapter for Benchtop Calibrator Fits Hella Turbocharger Actuators
  - ATS Diesel | ATS Harness Adapter for Benchtop Calibrator Fits VGT DT466 I313 Turbocharger Actuators
  - ATS Diesel | ATS Harness Adapter for Benchtop Calibrator Fits VGT Iveco FTP Turbocharger Actuators
  - ATS Diesel | Harness Adapter for Benchtop Calibrator, VGT - Duramax LP5 Adapter
  - ATS Diesel | ATS Harness Adapter for Benchtop Calibrator Fits VT Hino Jideco Mitsuba Turbocharger Actuators
  - ATS Diesel | ATS Harness Adapter for Benchtop Calibrator Fits VGT - Ford 6.4L Adapter Turbocharger Actuators
  - ... 7 more
- **Banks Power** - accessory with no task category: 72
  - Banks Power | iDash Stealth Pod
  - Banks Power | iDash Stealth Pod
  - Banks Power | iDash Stealth Pod Mount
  - Banks Power | Pre-Filter
  - Banks Power | Pre-Filter
  - Banks Power | iDash Stealth Pod Mount
  - Banks Non-Sale | Banks iDash Classic DataMonster
  - Banks Non-Sale | Banks iDash Classic DataMonster
  - ... 64 more
- **Banks Power** - apparel / merch: 19
  - Banks Power | Banks Engine Cover with Revolver Billet Oil Cap
  - Banks Power | Banks Revolver Billet Diesel Oil Cap
  - Banks Power | Banks Power Gift Card
  - Banks Power | Banks Revolver Billet Diesel & DEF Caps
  - Banks Power | Banks Revolver Billet Diesel & DEF Caps
  - Banks Power | Monster-Ram® Intake and Killer Grid Heater Upgrade (Chassis Cab)
  - Banks Power | Monster-Ram® Intake and Killer Grid Heater Upgrade (Chassis Cab)
  - Banks Power | Monster-Ram Intake and Killer Grid Heater Upgrade (Chassis Cab)
  - ... 11 more
- **Banks Power** - bundle / package of several categories: 27
  - Banks Power | Tuning Bundle for 2024-2026 Duramax 6.6L
  - Banks Power | Tuning Bundle for 2020-2022 Duramax 6.6L
  - Banks Power | Tuning Bundle for 2023 Duramax 6.6L
  - Fast Bundle | PowerPack Bundle for 2023 Duramax 6.6L
  - Fast Bundle | Ultimate Fluid Cooling Bundle for 2020-2026 Chevy/GMC 6.6L Duramax
  - Fast Bundle | Fluid Cooling Bundle for 2020-2026 Chevy/GMC 6.6L Duramax
  - Fast Bundle | Ultimate Fluid Cooling Bundle for 2017-2019 Chevy/GMC 6.6L Duramax
  - Fast Bundle | Fluid Cooling Bundle for 2017-2019 Chevy/GMC 6.6L Duramax
  - ... 19 more
- **Banks Power** - emissions-system part or delete (skipped by rule): 1
  - Banks Power | Straight Pipe Kit
- **Banks Power** - exhaust / piping / filters (no task category): 43
  - Banks Power | Air Filter Element
  - Banks Power | Boost Tube Upgrade Kit
  - Banks Power | Monster Exhaust System
  - Banks Power | Boost Tube Upgrade Kit
  - Banks Power | Air Filter Element
  - Banks Power | Boost Tube System (High Output)
  - Banks Power | Boost Tube System
  - Banks Power | Boost Tube System
  - ... 35 more
- **Banks Power** - hardware (lines / brackets / seals / fasteners / adapters ...): 22
  - Banks Power | iDash Pro® Mounting Sleeve Kit
  - Banks Power | MAP Sensor Relocation Kit (Lower Sensor Only)
  - Banks Power | Dual MAP Sensor Relocation Kit
  - Banks Power | MAP Sensor Relocation Kit
  - Banks Power | MAP Sensor Relocation Kit
  - Banks Power | MAP Sensor Relocation Kit
  - Banks Power | MAP Sensor Relocation Kit
  - Banks Power | MAP Sensor - GM ACDelco 12707766
  - ... 14 more
- **Banks Power** - not released yet (Coming Soon / In_Development): 35
  - Banks Power | Monster-Ram® Turbo Inlet Elbow
  - Banks Power | Boost Tube Upgrade Kit
  - Banks Power | Intercooler Upgrade
  - Banks Power | CoolRunner Oil Pan
  - Banks Power | Banks Ram-Air®
  - Banks Power | Monster Exhaust System
  - Banks Power | MAP Sensor Relocation Kit
  - Banks Power | Derringer® High Output
  - ... 27 more
- **Banks Power** - other: Decal: 1
  - Banks Power | Banks Urocal
- **Banks Power** - other: Differential Fluid: 4
  - Banks Power | AMSOIL 75w140 First Fill 5-Qt Easy Pack
  - Banks Power | AMSOIL 75w90 First Fill 5-Qt Easy Pack
  - Banks Power | AMSOIL 75w140 First Fill 4-Qt Easy Pack
  - Banks Power | AMSOIL 75w90 First Fill 4-Qt Easy Pack
- **Banks Power** - other: Intake Elbow: 1
  - Banks Power | Banks 750W or 1500W Billet Heater Kit
- **Banks Power** - other: Sensor: 1
  - Banks Power | Thermocouple
- **Banks Power** - other: Sensor Accessory: 7
  - Banks Power | Weld Bung
  - Banks Power | 4-Pin OBD-II Cable
  - Banks Power | 6-Pin Y-Splitter
  - Banks Power | Frequency Input Pigtail
  - Banks Power | Universal Analog Input Pigtail
  - Banks Power | Jumper, in Cab
  - Banks Power | Universal OBD-II Splitter
- **Banks Power** - other: Sunglasses: 2
  - Banks Power | Banks Lazer Face Sunglasses
  - Banks Power | Banks Heatwave Vise Sunglasses
- **Banks Power** - other: Transmission Management: 2
  - Banks Power | TransCommand
  - Banks Power | TransCommand
- **Banks Power** - transmission / driveline: 14
  - Banks Power | Ram-Air Transmission Pan
  - Banks Power | AMSOIL Signature Series ULV Transmission Fluid, 13-Qt Easy-Packs
  - Banks Power | Ram-Air® Differential Cover Kit
  - Banks Power | Ram-Air Differential Cover Kit
  - Banks Power | AMSOIL Signature Series Multi-Vehicle Transmission Fluid, 14-Qt Easy-Packs
  - Banks Power | Ram-Air Transmission Pan
  - Banks Power | 68RFE Ram-Air Transmission Pan
  - Banks Power | Ram-Air Transmission Pan
  - ... 6 more
- **Banks Power** - tune with emissions deletes (skipped by rule): 1
  - Banks Power | Derringer® High Output
- **Bullet Proof Diesel** - accessory with no task category: 150
  - Bullet Proof Diesel | Third Brake Light Dual Antenna Mount - 2014 - 2018 Chevrolet/GMC 1500 Trucks
  - Bullet Proof Diesel | Third Brake Light Dual Antenna Mount - 2015 - 2019 Chevrolet/GMC 2500/3500 Trucks
  - Bullet Proof Diesel | Third Brake Light Dual Antenna Mount - 2020 - 2026 Chevrolet/GMC 1500/2500/3500 W/T...
  - Bullet Proof Diesel | Third Brake Light TRIPLE Antenna Mount - 2022-2026 Ford Maverick - With Tomar LED Lights
  - Bullet Proof Diesel | Third Brake Light Triple Antenna Mount - 2019-2026 Ford Ranger - With Tomar LED Lights
  - Bullet Proof Diesel | Third Brake Light TRIPLE Antenna Mount - 2017-2026 Ford Super Duty - With Tomar LED...
  - Bullet Proof Diesel | Third Brake Light TRIPLE Antenna Mount - 2015-2026 Ford F150 - With Tomar LED Lights
  - Bullet Proof Diesel | Third Brake Light TRIPLE Antenna Mount - 2017-2026 Ford Raptor - With Tomar LED Lights
  - ... 142 more
- **Bullet Proof Diesel** - apparel / merch: 45
  - Neal Technologies, Inc. | Bullet Proof Diesel Front License Vanity Plate
  - Bullet Proof Diesel | Sippy Cups for kids in Silicone by Bullet Proof Diesel
  - Neal Technologies, Inc. | No Trespassing Sign - Excavator
  - Hat Sack | HAT SACK 2.0 - Off-Road Edition
  - Bullet Proof Diesel | Bullet Proof Diesel State T-Shirt - Navy
  - Bullet Proof Diesel | Bullet Proof Long Sleeve T-Shirt - Chevron, Black
  - Bullet Proof Diesel | Bullet Proof Diesel Womens Lightning Tank Top
  - Bullet Proof Diesel | Billet NMO Rain Cap
  - ... 37 more
- **Bullet Proof Diesel** - bundle / package of several categories: 18
  - Bullet Proof Diesel | 2007-2010 6.0L Van, E-Series, Professional Package - BPD Oil System
  - Bullet Proof Diesel | 2005-2006 6.0L Van, E-Series, Professional Package - BPD Oil System
  - Bullet Proof Diesel | 2003-2004 6.0L Van, E-Series, Professional Package - BPD Oil System
  - Bullet Proof Diesel | 2007-2010 6.0L Van, E-Series, Professional Package - OEM Oil Filter
  - Bullet Proof Diesel | 2005-2006 6.0L Van, E-Series, Professional Package - OEM Oil Filter
  - Bullet Proof Diesel | 2003-2004 6.0L Van, E-Series, Professional Package - OEM Oil Filter
  - Bullet Proof Diesel | 2007 6.0L F-Series, Professional Package - BPD Oil System
  - Bullet Proof Diesel | 2005-2006 6.0L F-Series, Professional Package - BPD Oil System
  - ... 10 more
- **Bullet Proof Diesel** - emissions-system part or delete (skipped by rule): 99
  - Bullet Proof Diesel | Cummins EGR Cooler X-15 & ISX-15 / Round Body - Short End Flange
  - Bullet Proof Diesel | BulletProof EGR Cooler, Duramax L5P
  - General Motors | EGR Cooler Gasket Kit, GM, Duramax L5P
  - OEM | EGR Cooler Gasket Set - Detroit Diesel DD13, DD15 & DD16
  - Bullet Proof Diesel | Cummins EGR Cooler X-15 & ISX-15 / Round Body - Long End Flange
  - Bullet Proof Diesel | BulletProof EGR Cooler With Gaskets - Detroit Diesel DD13, DD15 & DD16 - Hose Clamp...
  - Bullet Proof Diesel | BulletProof EGR Cooler With Gaskets, Detroit DD13, DD15 & DD16 - O-Ring Style
  - Bullet Proof Diesel | Cummins EGR Cooler X 15 Gen 4 | 5405901
  - ... 91 more
- **Bullet Proof Diesel** - exhaust / piping / filters (no task category): 2
  - Visteon | Air Filter, Replacement for Visteon Air Cleaner
  - Motorcraft | Air Filter - Ford 6.7L Power Stroke 2011-2016
- **Bullet Proof Diesel** - hardware (lines / brackets / seals / fasteners / adapters ...): 64
  - Misc | Starlink Mini Car Adapter 30V Female DC Coupler
  - Bullet Proof Diesel | BulletProof 6.0L & 6.4L Anti Drain Back Valve
  - Misc | StarLink Mini DC Female to Female Coupler
  - Bullet Proof Diesel | Starlink Mini NMO Mount With UHF Power Adapter
  - Max Gain Systems | UHF Female to SMA Male Adapter
  - Max Gain Systems | UHF Female to Mini UHF Male Adapter
  - Ford | Ford Injection Control Pressure Sensor (ICP), 2004 - 2010 6.0L, 4C3Z-9F838-B
  - Ford | Ford Injection Control Pressure Sensor (ICP), 2003 - Early 2004, 3C3Z-9F838-A
  - ... 56 more
- **Bullet Proof Diesel** - injection-pump hardware / kit without the pump: 2
  - Ford | Fuel Line - High Pressure Fuel Pump, Driver Side, Ford 6.4L, 8C3Z-9A332-B
  - Ford | Fuel Line - High Pressure Fuel Pump, Passenger Side, Ford 6.4L
- **Bullet Proof Diesel** - injector hardware / lines: 1
  - Ford | Fuel Injector O-Ring Kit, 3C3Z-9229-AA
- **Bullet Proof Diesel** - intercooler piping / hardware: 2
  - Ford | Intercooler Pipe, Charge Air Cooler - Outlet 6.7L
  - Ford | Ford F-Series 6.0L CAC Tube (Intercooler Pipe), 6C3Z-6C640-AA, OEM, Metal
- **Bullet Proof Diesel** - manifold hardware / gasket / sensor: 1
  - Bullet Proof Diesel | Titanium Exhaust Manifold Bolts, Cross-Drilled, Ford 6.0L, Pack of 16
- **Bullet Proof Diesel** - oil-cooler hardware: 5
  - Bullet Proof Diesel | Oil Cooler Adapter, Remote Mount, Ford 6.4L, Without Oil Cooler
  - Bullet Proof Diesel | Oil Cooler Adapter, Remote Mount, Ford 6.4L, With Oil Cooler
  - Bullet Proof Diesel | Oil Cooler Mounting Bracket, Original OEM Condenser, Ford 6.0L
  - Misc | Oil Cooler Seal Kit, Ford 6.7L Diesel
  - Bullet Proof Diesel | Oil Cooler Mounting Bracket, Non Traditional Condenser, Ford 6.0L
- **Bullet Proof Diesel** - other: Accessory: 2
  - Bullet Proof Diesel | Fire Extinguisher Mount - Flat Bottom
  - EDGE | EDGE Insight EGT Probe Kit with EAS
- **Bullet Proof Diesel** - other: Antenna Mount: 11
  - Bullet Proof Diesel | 2019‑26 Chevy Silverado | GMC Sierra Dual Antenna Mount
  - Misc | Starlink Mini Extension Cable, Male to Female Power Cord
  - Misc | 3-In-1 Boost Cable For Starlink Mini
  - Misc | Car Charger to DC Female Power Cable
  - Bullet Proof Diesel | 10' Co-Axial Extension - UHF Female to UHF Male
  - Bullet Proof Diesel | 5' Co-Axial Extension - UHF Female to UHF Male
  - Max Gain Systems | UHF Female to SMA Male 10" Jumper
  - Bullet Proof Diesel | 2019‑26 Chevy Silverado | GMC Sierra Antenna Mount
  - ... 3 more
- **Bullet Proof Diesel** - other: BPD Cooling: 1
  - Bullet Proof Diesel | Supplemental Cooling System 2021-2023 Jeep Gladiator/Wrangler Diesel
- **Bullet Proof Diesel** - other: CORE Charge: 4
  - Bullet Proof Diesel | CORE: Contamination System - 6000515
  - Bullet Proof Diesel | CORE: Contamination System - 6000517
  - Bullet Proof Diesel | CORE: Contamination System - 6000516
  - Bullet Proof Diesel | CORE: Contamination System - 6000514
- **Bullet Proof Diesel** - other: Fuel System: 4
  - Alliant Power | Fuel System Contamination Kit, Ford 6.7L 2015-2016
  - Alliant Power | Fuel System Contamination Kit, Ford 6.7L 2020-2022
  - Alliant Power | Fuel System Contamination Kit, Ford 6.7L 2017-2019
  - Alliant Power | Fuel System Contamination Kit, Ford 6.7L 2011-2014
- **Bullet Proof Diesel** - other: Hardware: 1
  - Bullet Proof Diesel | Bullet Proof Diesel EZ Latch Lever Replacement
- **Bullet Proof Diesel** - other: OEM: 6
  - Ford | Ford Oil/Air Separator, 2011-2025 6.7L, PC3Z-6A785-A
  - Ford | E-Series Ford 6.0L Fuel Pressure Regulator Kit w/ Upgraded Blue Spring, 4C2Z-9T517-AA
  - Ford | Ford 6.0L OEM 3C3Z-9T517-AG Fuel Pressure Regulator Kit w/ Upgraded Blue Spring
  - Ford | Motorcraft Silicone Sealant, TA-31
  - Ford | Ford 6.0L F-Series OEM 6C3Z8A080B Degas Bottle
  - Ford | Oil Pressure Switch, Ford 6.0L Diesel, F81Z-9278-AA
- **Bullet Proof Diesel** - other: Oil Cooler: 1
  - Bullet Proof Diesel | BulletProof Engine Oil System Upgrade for International 4200 Vehicles
- **Bullet Proof Diesel** - other: Promotional Item: 3
  - Bullet Proof Diesel | BulletProof Point of Sale Kit
  - Bullet Proof Diesel | Bullet Proof Diesel Diamond Patch
  - Bullet Proof Diesel | Bullet Proof Diesel Chevron Patch
- **Bullet Proof Diesel** - other: Tool: 3
  - Bullet Proof Diesel | BulletProof Boost Leak Detector
  - Neal Technologies, Inc. | Trophy Jack
  - HHC | HHC Diesel Leakproof Nipple Cup Master Kit, Ford 6.0L
- **Bullet Proof Diesel** - other: untyped: 2
  - Bullet Proof Diesel | Starlink Mini DC to DC Power Cable - 6.6 ft
  - Bullet Proof Diesel | Spare Tire Mount for Can-Am X3
- **Bullet Proof Diesel** - tool / service / order form: 70
  - Bullet Proof Diesel | RV Slide Out Manual Controller - For Lippert 697096
  - Bullet Proof Diesel | Core: Cummins X-15 Core Charge - 90201217
  - Bullet Proof Diesel | Core: Cummins X-15 Core Charge - 90201215
  - Bullet Proof Diesel | Core: Cummins ISL Core Charge - 6700105
  - Bullet Proof Diesel | Core: John Deere Core Charge
  - Bullet Proof Diesel | Core: 6.6L Duramax L5P Core Charge - 6700015
  - Bullet Proof Diesel | Core: Detroit DD15 Core Charge - 6800018, 90201214
  - Bullet Proof Diesel | Volvo D13, Mack MP8 EGR Core Charge
  - ... 62 more
- **Bullet Proof Diesel** - transmission / driveline: 8
  - Misc | Starlink Mini 12V/24V to 30V DC Boost Converter
  - Banks Power | Banks Ram-Air Differential Cover Kit -1985-2024 Ford Sterling 10.25
  - Banks Power | Banks Ram-Air Differential Cover Kit 2003-2024 Ram Truck
  - Bullet Proof Diesel | BulletProof Billet Aluminum Transmission Pan 10R80/10R60
  - Bullet Proof Diesel | Hayden 6.0L Mechanical Fan Clutch with Bullet Proof Diesel Adapter
  - Bullet Proof Diesel | Fan Clutch Wire Harness Saver, Ford 6.0L
  - Hayden | Fan Clutch, Mechanical, 1997 7.3L Ford Diesel
  - Bullet Proof Diesel | BulletProof 6.0L-to-7.3L Fan Clutch Adapter
- **Bullet Proof Diesel** - turbo hardware / plumbing: 4
  - Bullet Proof Diesel | Titanium Turbo Bolts, Ford 6.0L, Pack of 3
  - Bullet Proof Diesel | Turbo Oil Feed Adapter, Ford 6.0L Diesel
  - Ford | Turbo Oil Feed Tube, Ford 6.0L Diesel, 3C3Z-9T516-A
  - Ford | Ford 6.0L Turbo Oil Drain Tube With O'Rings - OEM P/N 6C3Z-9T515-B
- **Colt Cams** - apparel / merch: 2
  - Colt Cams | Colt Cams T-Shirt
  - Colt Cams | Colt Cams Hoodie
- **Colt Cams** - hardware (lines / brackets / seals / fasteners / adapters ...): 3
  - Colt Cams | Cam Gear Retainer for 89-02 Cummins
  - Power Driven Diesel | Power Driven Cam Gear Retainer for 89-02 Cummins
  - Power Driven Diesel | Power Driven Bronze Cam Thrust Plate Retainer
- **Dynomite Diesel** - apparel / merch: 27
  - Dynomite Diesel | UNISEX Pin-Up Hybrid Shirt
  - Dynomite Diesel | Women's Pin-Up Hybrid Tank
  - Dynomite Diesel | Men's Pin-Up Hybrid Shirt
  - Dynomite Diesel | Flag Logo Snapback Hat Black
  - Dynomite Diesel | Vintage spin-off Logo Front Men's T-Shirt
  - Dynomite Diesel | Color Flag Logo Snapback Trucker Hat (Black/Black)
  - Dynomite Diesel | Color Flag Logo Snapback Trucker Hat (Black/White/Black)
  - Dynomite Diesel | Color Flag Logo Snapback Trucker Hat (Charcoal/Black)
  - ... 19 more
- **Dynomite Diesel** - emissions-system part or delete (skipped by rule): 1
  - Dynomite Diesel | DPF Clean
- **Dynomite Diesel** - hardware (lines / brackets / seals / fasteners / adapters ...): 17
  - Dynomite Diesel | Duramax 2017+ L5P Fuel Injection Line Set
  - Dynomite Diesel | Upgraded 240 MPA Pressure Relief Valve 5.9L Cummins (34,810psi)
  - Dynomite Diesel | Upgraded 270 MPa Pressure Relief Valve 6.7L Cummins, LLY, LBZ, & LMM (39,160psi)
  - Dynomite Diesel | Upgraded 240 MPa Pressure Relief Valve 6.7L Cummins, LLY, LBZ, & LMM (34,810psi)
  - Dynomite Diesel | Upgraded 03-07 Ram 5.9L Cummins 280MPa Rail Pressure Sensor (40,611psi)
  - Dynomite Diesel | Upgraded 03-07 Ram 5.9L Cummins 260MPa Rail Pressure Sensor (37,710psi)
  - Dynomite Diesel | Dodge 07.5-18 6.7L Cummins Oversized Injection Line Set
  - Dynomite Diesel | Universal High Pressure Oversized Injection Lines (Multiple Lengths)
  - ... 9 more
- **Dynomite Diesel** - injector hardware / lines: 11
  - Dynomite Diesel | Duramax LLY, LBZ, & LMM Injector Return Line Kit
  - Dynomite Diesel | 2011-2021 Power Stroke 6.7L Injector Line Set
  - Dynomite Diesel | 2006-2007 Duramax LBZ Injector Line Set
  - Dynomite Diesel | 2019-2024 Cummins 6.7L Injector Line Set
  - Dynomite Diesel | 2003-2007 Cummins 5.9L Injector Line Set
  - Dynomite Diesel | Chevy Duramax 01-04 LB7 Fuel Injector Install Kit - BASIC
  - Dynomite Diesel | Dodge Cummins 98.5-02 24v 125HP Injector Nozzle Set
  - Dynomite Diesel | Dodge Cummins 98.5-02 24v 100HP Injector Nozzle Set
  - ... 3 more
- **Dynomite Diesel** - other: Diesel Fuel Injector Nozzle: 1
  - Dynomite Diesel | Nozzle Hone Service
- **Dynomite Diesel** - other: Fuel Additives: 4
  - Dynomite Diesel | Archoil Diesel Fuel Treatment 40oz (Treats 400 Gallons)
  - Dynomite Diesel | Archoil Diesel Fuel System Cleaner 12oz (Treats 40 Gallons)
  - Dynomite Diesel | Archoil Diesel Winter Fuel System Treatment 41.3oz (Treats 275 Gallons)
  - Dynomite Diesel | Injection System Cleaner
- **Dynomite Diesel** - other: Fuel System Upgrades: 1
  - Dynomite Diesel | Injection Component Ultrasonic Cleaning
- **Dynomite Diesel** - other: Oil System Cleaning Kit: 1
  - Dynomite Diesel | Oil System Cleaner / Decarbonizer
- **Dynomite Diesel** - other: Shipping Add-On: 1
  - Dynomite Diesel | Signature Required
- **Dynomite Diesel** - other: untyped: 2
  - Dynomite Diesel | __Customized-Items
  - Dynomite Diesel | Master Class Registration 1-Person
- **Dynomite Diesel** - tool / service / order form: 303
  - Dyrect | Common Rail Injector Set of 6 Extended Warranty
  - Dyrect | Common Rail Single Injector Extended Warranty
  - Dynomite Diesel | Chevy Duramax 17+ L5P Custom Injector Set Dynomite Diesel
  - Dynomite Diesel | Dodge Ram 07.5-12 6.7L Cummins Stock Patriot Series™ Reman Injector - Dynomite Diesel
  - Dynomite Diesel | RAM 2019-2021 6.7L Brand New Custom Injector Set Dynomite Diesel
  - Dynomite Diesel | RAM 2019-2021 6.7L Brand New 150% Over Injector Set Dynomite Diesel
  - Dynomite Diesel | RAM 2022-2024 6.7L Brand New Injector Set 45% Over Dynomite Diesel
  - Dynomite Diesel | RAM 2022-2024 6.7L Brand New Injector Set 30% Over Dynomite Diesel
  - ... 295 more
- **Manton** - apparel / merch: 1
  - Manton | Manton Pushrods Black T-Shirt - Large
- **Manton** - bundle / package of several categories: 2
  - Manton Diesel | 2003-10 6.0L / 6.4L Ford Powerstroke - Stage 2 Kit - Series 3 Pushrods & Performance Valve...
  - Manton Diesel | 2003-10 6.0L / 6.4L Ford Powerstroke - Stage 1 Kit - One Piece Pushrods & Performance...
- **Manton** - hardware (lines / brackets / seals / fasteners / adapters ...): 22
  - Manton Diesel | 2001-24 6.6L Duramax Billet Alloy Valve Bridge - 1 Set of 16
  - Manton | 3/8-24 x .568 O.D. 12 pt. Jam Nut (851s)
  - Manton | Manton GM - LS Raw Billet Aluminum Valve Covers with Coil Mounts
  - Manton | Spark Plug Tube -Fathead Hemi Top Alcohol Head , 7.700 Long, Large Hole
  - Manton | 3/8-24 x .620 O.D. 12 pt. Jam Nut (851)
  - Manton | Manton's Gen 3 Hemi 6.2L Hellcat Billet Aluminum Valve Cover Set, Black Anodized
  - Manton | Spark Plug Tube -Street Hemi 5.980 Long
  - Manton | M10-1.25 x .620 O.D. 12 pt. Jam Nut (852)
  - ... 14 more
- **Manton** - other: Engine Rocker Arm Adjusting Screw: 3
  - Manton | 5/16 Ball 3/8-24 x 1.300 with Pressure Fed Side Hole H-13 (815)
  - Manton | .281 Ball 7/16-20 Thread with Through Oil Hole H-13 (816)
  - Manton | .281 Ball 7/16-20 Thread with Pressure Fed Side Oil Hole H-13 (817)
- **Manton** - rocker hardware (adjusters / shafts / stands / trunnions): 53
  - Manton | Rocker Arm Adjusting Screw H-13 (830) 13/32 Ball 7/16-20 x 1.300 Thread, Pressure Fed Side Hole
  - Manton | Rocker Arm Adjusting Screw H-13 (822) 3/8 Ball 7/16-20 x 1.300 Thread, Through Oil Hole
  - Manton | LS7 Manton Rocker Arm System ( Bolt on )
  - Manton | Rocker Arm Adjusting Screw H-13 (827) 5/16 Ball 7/16-20 x 1.300 Thread, Through Oil Hole
  - Manton | 2003 to Present 5.7L, 6.1L, 6.2L & 6.4L Gen 3 Hemi - Rocker Arm Shaft
  - Manton | Rocker Arm Adjusting Screw H-13 (828-L) 3/8 Ball 3/8-24 x 1.600 Thread, Through Oil Hole
  - Manton Diesel | 1989-98 5.9L 12 Valve Cummins Rocker Arm Adjusting Screw H-13 (D-828)
  - Manton | Manton's 360 Brodex ASCS Sprint Car Shaft Mounted Rocker Arm System
  - ... 45 more
- **Manton** - tool / service / order form: 29
  - Manton | Custom Pushrod Order Form
  - Manton | Pushrod Checking Tool Clearance Sleeve Add On - 1/2 Diameter Sleeve for 3/8 Diameter Checking Tool
  - Manton | Pushrod Checking Tool Clearance Sleeve Add On - 7/16 Diameter Sleeve for 3/8 Diameter Checking Tool
  - Manton | Manton's Gen 3 Hemi, 5.7L, 6.2L, 6.4L - Pushrod Length Checking Tool Kit
  - Manton | Pushrod Checking Tool 4 Piece Clearance Sleeve Add On - 7/16, 1/2, 9/16 & 5/8 Diameter Sleeves...
  - Manton | Pushrod Checking Tool Clearance Sleeve Add On - 9/16 Diameter Sleeve for 3/8 Diameter Checking Tool
  - Manton Diesel | 1989-98 5.9L 12 Valve Cummins - Tool Steel Rocker Arm ( Exhaust )
  - Manton Diesel | 2001-17 6.6L Duramax - Rocker Arm Adjusting Screw, H-13 Tool Steel
  - ... 21 more
- **Smeding Diesel** - accessory with no task category: 7
  - Smeding Diesel | Cummins 6.7L CCV Reroute Kit
  - Smeding Diesel | Smeding Diesel Billet Coolant Block Off Plate for 6.6L Duramax 2001-2025
  - Smeding Diesel | -12 universal catch can
  - Smeding Diesel | CCV Baffle/Internal Catch Can for 2011-2020 6.7L Powerstroke
  - Smeding Diesel | 6.7 Cummins Coolant Riser to Block Reroute
  - Smeding Diesel | Smeding Diesel 08-10 CCV Ford 6.4L Engine Ventilation Kit
  - Smeding Diesel | 11-19 Ford 6.7L Fuel Filter Conversion Kit
- **Smeding Diesel** - apparel / merch: 8
  - Smeding Diesel | Billet Oil Cap Cover 5.9 / 6.7 Cummins
  - Smeding Diesel | Miami Vice Tee
  - Smeding Diesel | Compound Kit Tee
  - Smeding Diesel | Flat Bill Trucker Hat
  - Smeding Diesel | Snapback Trucker Hat
  - Smeding Diesel | Smeding Diesel Short Sleeve T-Shirt
  - Smeding Diesel | Smeding Diesel Koozie
  - Smeding Diesel | Smeding Diesel Compressor Wheel Valve Cover Cap
- **Smeding Diesel** - bundle / package of several categories: 2
  - Smeding Diesel | Smeding Diesel 2007.5-18 6.7L Cummins HighFLow Bundle
  - Smeding Diesel | Smeding Diesel TrueFlow Bundle
- **Smeding Diesel** - emissions-system part or delete (skipped by rule): 1
  - Smeding Diesel | Smeding Diesel 6.7 Cummins grid heater delete 07.5-24
- **Smeding Diesel** - exhaust / piping / filters (no task category): 5
  - Smeding Diesel | 5 inch air filter
  - Smeding Diesel | 4.5 inch air filter
  - Smeding Diesel | 4 inch air filter
  - Smeding Diesel | 5 inch air filter
  - Smeding Diesel | Aluminum Dual Radiator Coolant Y-Pipe for Dodge Ram Cummins 6.7L 2013-2018 Diesel
- **Smeding Diesel** - hardware (lines / brackets / seals / fasteners / adapters ...): 11
  - Smeding Diesel | 2003-2018 5.9/6.7 Cummins Billet Rear Main Seal Housing
  - Smeding Diesel | 1989-2002 5.9 Cummins Billet Rear Main Seal Housing
  - Smeding Diesel | Smeding Diesel 2003-2018 5.9L/6.7L Cummins Rear Freeze Plug
  - Smeding Diesel | Smeding Diesel Billet Timing Cover for 5.9L/6.7L Cummins 03-18
  - Smeding Diesel | 2017-2019 6.7L Powerstroke Passenger Side Battery Relocation Bracket
  - Smeding Diesel | Smeding Diesel Upper Radiator Hose 6.7L Powerstroke
  - Smeding Diesel | -10 cummins block fitting
  - Smeding Diesel | TPP CRF110F Triple Clamps
  - ... 3 more
- **Smeding Diesel** - intercooler piping / hardware: 7
  - Smeding Diesel | Smeding Diesel Complete Intercooler Pipe Kit for 2017-19 Ford Powerstroke 6.7L
  - Smeding Diesel | Smeding Diesel 6.7 Ford Intercooler Pipe Fix 2011-16
  - Smeding Diesel | Smeding Diesel 6.7 Ford Intercooler Pipe Fix 11-16 for TUNED trucks
  - Smeding Diesel | Smeding Diesel 3rd Gen Forward Facing Turbo Cover TO 2nd Gen Intercooler Pipe
  - Smeding Diesel | Smeding Diesel Complete Intercooler Pipe Kit for 2015-16 Ford Powerstroke 6.7L
  - Smeding Diesel | Smeding Diesel 6.7 Ford Intercooler Pipe Fix 2017-19 for TUNED trucks
  - Smeding Diesel | Smeding Diesel Complete Intercooler Pipe Kit for 2011-14 Ford Powerstroke 6.7L
- **Smeding Diesel** - manifold hardware / gasket / sensor: 2
  - Smeding Diesel | 630 Stainless Steel Exhaust Manifold Studs
  - Smeding Diesel | 304 Stainless Steel Exhaust Manifold Studs
- **Smeding Diesel** - other: untyped: 7
  - Smeding Diesel | Smeding Diesel 2020-2025 Duramax L5P Max Flow Kit
  - Smeding Diesel | Smeding Diesel Regulated Fuel Return Kit for Ford Powerstroke 7.3L
  - Smeding Diesel | Smeding EZ drop in 03-07 5.9l Cummins
  - Smeding Diesel | Smeding EZ drop in 94-02 5.9l Cummins
  - Smeding Diesel | 6.7 Ford 11-24 Engine Ventilation Kit
  - Smeding Diesel | Smeding Diesel Steel 360* Thrust Bearing Upgrade
  - Smeding Diesel | Smeding Diesel Regulated Fuel Return Kit for Ford Powerstroke 6.0L
- **Smeding Diesel** - transmission / driveline: 5
  - Smeding Diesel | 2020-25 L5P Duramax Transmission Pan
  - Smeding Diesel | 2003-13 Dodge/ Ram Front Differential Cover
  - Smeding Diesel | 2001-19 Duramax 2001-18 Ram Rear Differential Cover
  - Smeding Diesel | 2011-2025 Duramax Front Differential Cover
  - Smeding Diesel | 2020-2024 L5P Duramax Differential Cover
- **Smeding Diesel** - turbo hardware / plumbing: 20
  - Smeding Diesel | Smeding Diesel Oil Feed Line Kit for S300/S400 Turbos 2003-2024 5.9L / 6.7L Cummins
  - Smeding Diesel | Smeding Diesel Oil Drain Line Kit for S300/S400 Turbos 2003-2024 5.9L / 6.7L Cummins
  - Smeding Diesel | Dodge Cummins 5.9 & 6.7 Oil Feed Line Adapter for S300 and s400 Turbocharger
  - Smeding Diesel | S400 90* 4 Inch Elbow, Clamp and O-ring
  - Smeding Diesel | Smeding Diesel S300 Direct Bolt In Turbo 04.5-10 Duramax
  - Smeding Diesel | S400 weld on flange
  - Smeding Diesel | -10 turbo oil drain flange
  - Smeding Diesel | HX40 downpipe with clamp
  - ... 12 more
- **Stainless Diesel** - accessory with no task category: 24
  - HSP Diesel | HSP Diesel Factory Replacement Coolant Tank for 2015-2016 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Factory Replacement Coolant Tank for 2011-2014 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Factory Replacement Coolant Tank for 2007.5-2010 Chevrolet and GMC LMM Duramax
  - HSP Diesel | Factory Replacement Coolant Tank for 2001-2007 LB7 / LLY / LBZ Duramax
  - G&R Diesel Inc. | G&R Diesel CAT Fuel Filter Conversion Kit | 2019-2020 Dodge Ram 6.7 Cummins
  - G&R Diesel Inc. | G&R Diesel Bottom Sump w/ Integrated Return
  - G&R Diesel Inc. | Fuel Filter/ Water Separator Conversion Kit | 2013-2018 Dodge Ram 6.7 Cummins
  - G&R Diesel Inc. | CAT Fuel Filter Conversion Kit | 2011-2016 Ford 6.7 Powerstroke
  - ... 16 more
- **Stainless Diesel** - apparel / merch: 14
  - Merch | Tattoo T-Shirt
  - Merch | None Given T-Shirt
  - Merch | Diesel Diva T-Shirt
  - Merch | Western T-Shirt
  - Merch | Only Diesels T-Shirt
  - Merch | King of Spades T-Shirt
  - Merch | Find Out T-Shirt
  - Merch | Pinky T-Shirt
  - ... 6 more
- **Stainless Diesel** - bundle / package of several categories: 24
  - HSP Diesel | HSP Diesel Deluxe Max Air Flow Bundle for 2015-2016 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Deluxe Max Air Flow Bundle for 2013-2014 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Deluxe Max Air Flow Bundle for 2011-2012 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Max Air Flow Bundle for 2013-2016 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Max Air Flow Bundle for 2011-2012 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Deluxe Max Air Flow Bundle for 2007.5-2010 Chevrolet and GMC LMM Duramax
  - HSP Diesel | HSP Diesel Max Air Flow Bundle for 2007.5-2010 Chevrolet and GMC LMM Duramax
  - HSP Diesel | HSP Diesel Cold Air Intake Bundle for 2007.5-2010 Chevrolet and GMC LMM Duramax
  - ... 16 more
- **Stainless Diesel** - emissions-system part or delete (skipped by rule): 1
  - G&R Diesel Inc. | G&R Diesel 10 AN EGR Riser Fitting - GRD67CM3016
- **Stainless Diesel** - engine / block / head assembly (no task category): 5
  - djprecisionmachine.com | D&J Precision Heavy Hauler Long Block | 2003-2007 Dodge Ram 5.9 Cummins
  - djprecisionmachine.com | D&J Precision Reman Precision Plus Long Block | 2003-2007 Dodge Ram 5.9 Cummins
  - djprecisionmachine.com | D&J Precision Reman Precision Plus Long Block | 2007.5-2018 Dodge Ram 6.7 Cummins
  - djprecisionmachine.com | Heavy Hauler 6.7 Cummins Common Rail Long Block
  - djprecisionmachine.com | Street Performance 6.7 Cummins Common Rail Long Block
- **Stainless Diesel** - exhaust / piping / filters (no task category): 32
  - HSP Diesel | HSP Diesel Upper Coolant Tube for 2017-2019 Chevrolet and GMC L5P Duramax
  - HSP Diesel | HSP Diesel Cold Side Tube for 2017-2019 Chevrolet and GMC L5P Duramax
  - HSP Diesel | HSP Diesel Hot Side Tube for 2017-2019 Chevrolet and GMC L5P Duramax
  - Stainless Diesel | 4.00" Make Your Own Down Pipe | 1994-2002 Dodge Ram 5.9 Cummins
  - HSP Diesel | HSP Diesel Upper Coolant Tube for 2015-2016 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Upper Coolant Tube for 2011-2014 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Diesel Hot Side Tube for 2011-2016 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Max Flow Bridge and Cold Side Tube Over Alt | 2006-2007 Chevrolet 6.6 Duramax LBZ
  - ... 24 more
- **Stainless Diesel** - hardware (lines / brackets / seals / fasteners / adapters ...): 141
  - HSP Diesel | HSP Diesel Billet Valve Covers for 2011-2016 Chevrolet and GMC LML Duramax
  - Stainless Diesel | T4 EXHAUST TO BEARING CARTRIDGE CLAMP
  - HSP Diesel | HSP Billet Valve Covers | 2001-2004 Chevrolet 6.6 Duramax LB7
  - HSP Diesel | HSP Billet Valve Covers | 2004.5-2010 Chevrolet 6.6 Duramax LBZ LLY LMM
  - HSP Diesel | One Piece Thermostat Housing Kit For 2006-2010 LBZ / LMM Duramax
  - HSP Diesel | HSP Billet Thermostat Housing Kit W/Coolant return | 2006-2010 Chevrolet 6.6 Duramax LBZ LMM
  - HSP Diesel | One Piece Thermostat Housing Kit For 2001-2005 LB7 / LLY Duramax
  - HSP Diesel | HSP Billet Thermostat Housing Kit W/Coolant return | 2001-2005 Chevrolet 6.6 Duramax LB7 LLY
  - ... 133 more
- **Stainless Diesel** - injection-pump hardware / kit without the pump: 8
  - G&R Diesel Inc. | G&R Diesel 1/2" CP3 Fitting - GRD00169
  - Exergy Performance | Exergy CP4.2 - 6AN Supply/Return Fitting Kit | 2011-2019 Ford 6.7 Powerstroke
  - Exergy Performance | Exergy M12x1.5 to -6an High Flow CP3 Supply Fitting - 1-018-148
  - Exergy Performance | Exergy M12x1.5 to -8anHigh Flow CP3 Supply Fitting - 1-018-149
  - Exergy Performance | Exergy CP3 Rear Outlet Fitting and Plug Kit - 1-018-124
  - Exergy Performance | Exergy Sportsman CP3 Pump (LBZ Based w/ LB7 FCA) | 2001-2004 Chevrolet 6.6 Duramax LB7
  - Exergy Performance | Exergy 10mm Stroker CP3 Pump (LBZ Based w/ LB7 FCA) | 2001-2004 Chevrolet 6.6 Duramax LB7
  - S&S Diesel Motorsport | S&S Diesel CP3 Conversion Kit without Pump | 2019-2020 Dodge Ram 6.7 Cummins
- **Stainless Diesel** - injector hardware / lines: 3
  - Exergy Performance | Exergy Stainless 9th Fuel Injector Plug w/ O-Ring | 2011-2016 Chevrolet 6.6 Duramax LML
  - Exergy Performance | Exergy Fuel Injector Line Set (Per Side) | 2001-2004 Chevrolet 6.6 Duramax LB7
  - S&S Diesel Motorsport | S&S Diesel Injector Feed Tubes - Set | 2007.5-2018 Dodge Ram 6.7 Cummins
- **Stainless Diesel** - intercooler piping / hardware: 9
  - HSP Diesel | HSP Diesel Intercooler Charge Pipe Bundle for 2011-2016 Chevrolet and GMC LML Duramax
  - HSP Diesel | HSP Intercooler Charge Pipe Bundle | 2004.5-2005 Chevrolet 6.6 Duramax LLY
  - HSP Diesel | Intercooler Charge Pipe Bundle For 2006-2010 LBZ / LMM Duramax
  - HSP Diesel | Hot Side Intercooler Tube For 2001-2010 LB7 / LLY / LBZ / LMM Duramax
  - Stainless Diesel | 3.00" 5.9 Intercooler Pipe (S4 V-Band Cover) | 2003-2010 Dodge Ram 5.9 6.7 Cummins
  - Stainless Diesel | Intercooler Pipe Driver Side 3.00" | 2004.5-2010 Chervrolet 6.6 Duramax LLY LBZ LMM
  - Stainless Diesel | 2G Twin Intercooler Pipe | 1994-2002 Dodge Ram 5.9 Cummins
  - Stainless Diesel | 3.00" SXES300/ S400 Hose Outlet "J" Intercooler Pipe | 2003-2010 Dodge Ram 5.9 6.7 Cummins
  - ... 1 more
- **Stainless Diesel** - lift-pump hardware / filters: 1
  - G&R Diesel Inc. | Fuel Line Quick-Connect Plug (AirDog or Fass)
- **Stainless Diesel** - lifter hardware: 2
  - G&R Diesel Inc. | G&R Diesel Billet Aluminum Tappet Cover | 1989-2002 Dodge Ram 5.9 Cummins
  - G&R Diesel Inc. | Tappet Cover w/ Oil Separator
- **Stainless Diesel** - manifold hardware / gasket / sensor: 1
  - Stainless Diesel | MOUNTING STUDS - TURBO TO MANIFOLD/ M10X1.5 THREAD
- **Stainless Diesel** - other: Air Filter Cleaning Kit: 1
  - Stainless Diesel | Precision II: Cleaning & Oil Kit (Red Oil)
- **Stainless Diesel** - other: Air Filter Wrap: 1
  - Stainless Diesel | Prefilter Wrap - Black
- **Stainless Diesel** - other: Blow Off Valve: 1
  - Stainless Diesel | REPLACEMENT SPRING
- **Stainless Diesel** - other: Bypass Kit: 1
  - Stainless Diesel | SD Cummins Water By-Pass Kit
- **Stainless Diesel** - other: CCV: 1
  - HSP Diesel | HSP PCV Reroute Kit | 2004.5-2010 Chervrolet 6.6 Duramax LLY LBZ LMM
- **Stainless Diesel** - other: CYLINDER HEADS: 1
  - djprecisionmachine.com | D&J Precision Performance Head | 2007.5-2018 Dodge Ram 6.7 Cummins
- **Stainless Diesel** - other: Diesel Fuel Additive: 6
  - Exergy Performance | Exergy Diesel Additive 4oz- Case of 12 - E09 00005
  - Exergy Performance | Exergy Diesel Additive 16oz Winter Blend - Case of 12 - E09 00017
  - Exergy Performance | Exergy Diesel Additive 4oz Winter Blend- Case of 12 - E09 00015
  - Exergy Performance | Exergy Diesel Additive 16oz - E09 00006
  - Exergy Performance | Exergy Diesel Additive 16oz - Case of 12 - E09 00007
  - Exergy Performance | Exergy Diesel Additive 16oz Winter Blend - E09 00016
- **Stainless Diesel** - other: Exhaust Manifolds: 1
  - HSP Diesel | HSP Diesel 01-16 Chevy / GMC Duramax Ceramic Billet Manifolds
- **Stainless Diesel** - other: Exhaust Pipe: 1
  - Stainless Diesel | Exhaust Reducer, 4.00" to 5.00" x 6.00" L
- **Stainless Diesel** - other: Fuel Fitting: 4
  - Exergy Performance | Exergy M18x1.5 Rail End to M14x1.5 - 1-018-132
  - Exergy Performance | Exergy M14x1.5 Union - 1-018-129
  - Exergy Performance | Exergy Rail End to M14x1.5 | 2001-2004 Chevrolet 6.6 Duramax LB7
  - Exergy Performance | Exergy Port to Female M18x1.5 - 1-018-167
- **Stainless Diesel** - other: Fuel Rail Sensor: 1
  - Exergy Performance | Exergy Electronic Pressure Regulator DRV | 2011-2016 Chevrolet 6.6 Duramax LML
- **Stainless Diesel** - other: Grid Heater: 1
  - G&R Diesel Inc. | G&R Diesel Grid Heater | 2007.5-2018 Dodge Ram 6.7 Cummins
- **Stainless Diesel** - other: Intake Elbow: 1
  - HSP Diesel | HSP Diesel Max Flow Intake Mouthpiece For 2004.5-2010 Chevrolet And GMC LLY / LBZ / LMM...
- **Stainless Diesel** - other: Intake Horn: 1
  - G&R Diesel Inc. | G&R Diesel Intake Conversion Plate | 1989-2002 Dodge Ram 5.9 Cummins
- **Stainless Diesel** - other: Leak Rail: 3
  - Exergy Performance | Exergy Leak Rail Asembly | 2011-2019 Ford 6.7 Powerstroke
  - Exergy Performance | Exergy Leak Rail Assembly (Driver Side) | 2004.5-2010 Chervrolet 6.6 Duramax LLY LBZ LMM
  - Exergy Performance | Exergy Leak Rail Assembly (Passenger Side) | 2004.5-2010 Chervrolet 6.6 Duramax LLY...
- **Stainless Diesel** - other: Reducer: 3
  - Stainless Diesel | Silicone Reducer 2.75" - 3.5" X 5.00" - BH2.75_3.5x5RH
  - Stainless Diesel | Silicone Reducer 2.75" - 3.00" X 6.00" - BH2.75_3x6RH
  - Stainless Diesel | Silicone Reducer 2.75" - 3.00" X 4.00" - BH2.75_3x4RH
- **Stainless Diesel** - other: Turbine Wheel: 1
  - Stainless Diesel | OEM GTX55 Turbine Wheel Replacement
- **Stainless Diesel** - other: Turbo Spacer: 2
  - Stainless Diesel | GATE PLATE T-4
  - Stainless Diesel | GATE PLATE T-3
- **Stainless Diesel** - other: Turbocharger: 8
  - Stainless Diesel | SD55 88mm 5 blade
  - Stainless Diesel | GT55 88mm - Journal Bearing
  - Stainless Diesel | Late '99 7.3 Powerstroke 6 Blade Billet 66/68
  - Stainless Diesel | Late '99 7.3 Powerstroke 6 Blade Billet 60/68
  - Stainless Diesel | Late '99 7.3 Powerstroke 60/68
  - Stainless Diesel | Haul Boss Stg 1 Detroit Series 60
  - Stainless Diesel | GT55 98mm - Journal Bearing
  - Stainless Diesel | GT55 107mm - Journal Bearing
- **Stainless Diesel** - other: Wastegate: 1
  - Turbosmart | Turbosmart Hyper-Gate 45mm
- **Stainless Diesel** - other: untyped: 2
  - Stainless Diesel | Titanium Exhaust Heat Wrap - 20' Roll
  - Rush Fee | Rush Fee
- **Stainless Diesel** - tool / service / order form: 16
  - G&R Diesel Inc. | G&R Engine Balancer Puller | 2007.5-2018 Dodge Ram 6.7 Cummins
  - Stainless Diesel | S&S/XRG Duramax Injector Core
  - Stainless Diesel | S&S/XRG Cummins Injector Core
  - Stainless Diesel | 3G Cummins HE351 Boost Leak Tester Kit
  - Stainless Diesel | 2G Cummins HX35 Boost Leak Tester Kit | 1994-2002 Dodge Ram 5.9 Cummins
  - Stainless Diesel | LLY-LML Duramax Boost Leak Tester Kit
  - Stainless Diesel | HE300 Boost Leak Tester Kit | 2019+ Dodge Ram 6.7 Cummins
  - Stainless Diesel | 4G Cummins HE351VE/HE300 Boost Leak Tester Kit
  - ... 8 more
- **Stainless Diesel** - transmission / driveline: 2
  - HSP Diesel | HSP Diesel 70 Inch Bolt On Traction Bars for 4 Inch Axle Diameter 2011-2019 Chevrolet and GMC...
  - HSP Diesel | HSP Diesel 58 Inch Bolt On Traction Bars for 4 Inch Axle Diameter 2011-2019 Chevrolet and GMC...
- **Stainless Diesel** - turbo hardware / plumbing: 85
  - HSP Diesel | HSP Diesel VGT Intake Mouthpiece for 2011-2016 Chevrolet and GMC LML Duramax
  - Stainless Diesel | S400 T-4 Marmon Flange - 4.62 - 4 5/8"
  - Stainless Diesel | S400 Compressor Outlet O-Ring Flange
  - Stainless Diesel | 90* S400 Aluminum Elbow
  - HSP Diesel | HSP VGT Intake Mouthpiece PCV Reroute Add-On | 2006-2010 Chevrolet 6.6 Duramax LBZ LMM
  - Stainless Diesel | V-BAND S400 COVER CLAMP
  - Stainless Diesel | HE351 VBand Clamp (4 3/8")
  - Stainless Diesel | S300/S400 Steel Oil Drain Flange Kit
  - ... 77 more
- **Wagler** - accessory with no task category: 1
  - Wagler | Wagler Duramax Used Upper Oil Pan
- **Wagler** - apparel / merch: 10
  - Wagler | Wagler Main Cap Thrust Setting Tool
  - Wagler | Wagler Logo Flag Front/IN Back Hoodie
  - Wagler | Wagler Logo Flag Front/IN Back
  - Wagler | Wagler Logo Front T-shirt
  - Wagler | Wagler 24v Cummins Billet Main Caps
  - Wagler | Wagler Duramax Billet Main Caps, 2001-2016 LB7/LLY/LBZ/LMM/LML
  - Wagler | Wagler 2011-2019 Ford 6.7 Powerstroke Billet Main Caps
  - Wagler | Wagler Billet Block Design T-Shirt
  - ... 2 more
- **Wagler** - hardware (lines / brackets / seals / fasteners / adapters ...): 6
  - Wagler | Wagler Duramax Rear Cover Used
  - Wagler | Wagler Duramax Front Cover Used
  - Wagler | Triple Nitrous Solenoid Assembly
  - Wagler | Wagler Billet CX Race Series Valve Cover
  - Wagler | Wagler Duramax (LML) Mechanical Belt Tensioner
  - Wagler | Wagler Duramax (LLY/LBZ/LMM) Mechanical Belt Tensioner
- **Wagler** - injection-pump hardware / kit without the pump: 1
  - Wagler | Wagler Cummins Dual CP3 Front Cover Assembly with Power Steering Mount
- **Wagler** - other: untyped: 7
  - Wagler | Wagler Cummins 24v Girdle Kit
  - Wagler | Wagler Duramax Street Intake
  - Wagler | Wagler Duramax Engine Lifting Plate
  - Wagler | N20/H20 Nitrous Rail
  - Wagler | Wagler Cummins Side Draft Street Intake
  - Wagler | Wagler Duramax (LB7/LLY/LBZ/LMM) Street Main Girdle
  - Wagler | Wagler Duramax (LML) Street Main Girdle
- **Wagler** - tool / service / order form: 3
  - Wagler | Wagler Competition LB7 Duramax Injector Cup Install Tool
  - Wagler | Wagler Duramax Engine Shipping Stand
  - Wagler | Wagler Duramax Compession Tester

## Duplicate SKUs merged (same brand + part number + family; the record with more spec keys kept)

- Dynomite Diesel SESVC-ISP [Unknown]: kept 'new injector' (https://www.dynomitediesel.com/products/piezo-injector-testing-and-inspection) / dropped 'new injector' (https://www.dynomitediesel.com/products/mechanical-injector-testing-and-inspection)
- Dynomite Diesel SESVC-ISP [Unknown]: kept 'new injector' (https://www.dynomitediesel.com/products/piezo-injector-testing-and-inspection) / dropped 'new injector' (https://www.dynomitediesel.com/products/common-rail-injector-testing-and-inspection)
- Smeding Diesel CS3667391MSTDCR [Cummins 5.9 24V/CR]: kept 'SXE S366 turbo, 66 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s366-73-sxe-turbocharger) / dropped 'SXE S366 turbo, 66 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s366-73-sxe-turbocharger)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla [Duramax 6.6]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang [Duramax 6.6]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla [Duramax 6.6]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang [Duramax 6.6]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m [Cummins 5.9 24V/CR]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h [Cummins 5.9 24V/CR]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m [Cummins 5.9 24V/CR]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h [Cummins 5.9 24V/CR]: kept 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy) / dropped 'Billet S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-cast-s363-68-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla [Duramax 6.6]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang [Duramax 6.6]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla [Duramax 6.6]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang [Duramax 6.6]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m [Cummins 5.9 24V/CR]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h [Cummins 5.9 24V/CR]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m [Cummins 5.9 24V/CR]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h [Cummins 5.9 24V/CR]: kept 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy) / dropped 'Billet S364 turbo, 64 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s364-5-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger-copy)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-2-7-8-v-band-outlet-1-0-marmon-flange-st [Unknown]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-duramax-style-v-band-inlet-91-marmon-fla [Duramax 6.6]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-duramax-style-v-band-inlet-91-hx40-flang [Duramax 6.6]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-duramax-style-v-band-inlet-1-0-marmon-fl [Duramax 6.6]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-duramax-style-v-band-inlet-1-0-hx40-flan [Duramax 6.6]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-common-rail-cummins-style-90-outlet-91-m [Cummins 5.9 24V/CR]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-common-rail-cummins-style-90-outlet-91-h [Cummins 5.9 24V/CR]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s372-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger) / dropped 'SXE S372 turbo, 72 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s372-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-2-7-8-v-band-outlet-1-0-marmon-flange-st [Unknown]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-duramax-style-v-band-inlet-91-marmon-fla [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-duramax-style-v-band-inlet-91-hx40-flang [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-duramax-style-v-band-inlet-1-0-marmon-fl [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-duramax-style-v-band-inlet-1-0-hx40-flan [Duramax 6.6]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-common-rail-cummins-style-90-outlet-91-m [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-common-rail-cummins-style-90-outlet-91-h [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s363-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger) / dropped 'SXE S363 turbo, 63 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s363-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-2-7-8-v-band-outlet-1-0-marmon-flange-st [Unknown]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-duramax-style-v-band-inlet-91-marmon-fla [Duramax 6.6]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-duramax-style-v-band-inlet-91-hx40-flang [Duramax 6.6]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-duramax-style-v-band-inlet-1-0-marmon-fl [Duramax 6.6]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-duramax-style-v-band-inlet-1-0-hx40-flan [Duramax 6.6]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-common-rail-cummins-style-90-outlet-91-m [Cummins 5.9 24V/CR]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-common-rail-cummins-style-90-outlet-91-h [Cummins 5.9 24V/CR]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)
- Smeding Diesel smeding-diesel-s369-sxe-turbocharger-common-rail-cummins-style-90-outlet-1-0- [Cummins 5.9 24V/CR]: kept 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger) / dropped 'SXE S369 turbo, 69 mm compressor' (https://www.smedingdiesel.com/products/smeding-diesel-s369-sxe-turbocharger)

## Needs human QA

Families not in `cam-fitment.json` (catalog heading kept in `fit.fam`):

- `2013 to Current GM 6.2L GEN V LT - Series 5 Performance Upgrade Pushrods`: 1 record(s)
- `2013 to Current GM 6.2L GEN V LT -Series 3 Pushrods`: 1 record(s)
- `Cummins`: 61 record(s)
- `Cummins 4BT`: 8 record(s)
- `Cummins 8.3 ISC`: 1 record(s)
- `Ford 6.2 gas`: 1 record(s)
- `GM 2.8 Duramax`: 1 record(s)
- `Jeep 2.0 turbo`: 2 record(s)
- `Jeep 3.6 Pentastar`: 3 record(s)
- `Jeep 4.0 inline-6`: 4 record(s)
- `Manton Rocker Arm 1.7 Ratio`: 1 record(s)
- `Manton's All Pro RE-13 Wide Pad Cylinder Head Shaft Mounted Rocker Arm System`: 1 record(s)
- `Manton's CID LS-CR Cylinder Head Shaft Mounted Rocker Arm System`: 1 record(s)
- `Manton's Kaase SR-71 Cylinder Head Shaft Mounted Rocker Arm System`: 1 record(s)
- `Manton's LT - Rocker Arm System (LME Edelbrock ONLY)`: 1 record(s)
- `RAM 3.0 EcoDiesel`: 6 record(s)
- `Stage V by Manton - Exhaust Rocker Arm 1.6 Ratio - Aftermarket Racing Heads`: 1 record(s)
- `Stage V by Manton - Intake Rocket Arm 1.7 Ratio - Aftermarket Racing Heads`: 1 record(s)
- `Toyota`: 1 record(s)
- `Universal`: 7 record(s)
- `Unknown`: 805 record(s)
- `Volkswagen air-cooled`: 2 record(s)

No engine named anywhere (`fit.fam: "Unknown"`), 805 record(s):

- Dynomite Diesel SESVC-ISP: Piezo Injector Testing and Inspection [injector]
- Dynomite Diesel SESVC-PZ: Piezo Injector Testing and Inspection [injector]
- Dynomite Diesel SESVC-ISP: Mechanical Injector Testing and Inspection [injector]
- Dynomite Diesel SESVC-MI: Mechanical Injector Testing and Inspection [injector]
- Dynomite Diesel SESVC-ISP: Common Rail Injector Testing and Inspection [injector]
- Dynomite Diesel SESVC-CR: Common Rail Injector Testing and Inspection [injector]
- Banks Power 93152: Molded Rubber Inlet Gasket [gasket]
- Banks Power 49197: Torque Tubes® Exhaust Header System [header]
- Banks Power 41888: Banks Ram-Air® [intake]
- Banks Power 41888-D: Banks Ram-Air® [intake]
- Banks Power 41884: Banks Ram-Air® [intake]
- Banks Power 41884-D: Banks Ram-Air® [intake]
- Banks - Please Call 49196: Torque Tubes® Exhaust Header System [header]
- Banks Power 49175: Torque Tubes® Exhaust Header System [header]
- Banks Power 49191: Banks Ram-Air® [intake]
- Banks Power 49170: Torque Tubes® Exhaust Header System [header]
- Banks Power 66062: AutoMind Programmer [tuner]
- ATS Diesel 202-920-1000: ATS Aurora ti GTA5518B Drop-in Replacement HD Turbo for Caterpillar C15 Low... [turbo]
- ATS Diesel 202-919-1000: ATS Aurora ti GTA4294BS Drop-in Replacement HD Turbo for Caterpillar C15... [turbo]
- ATS Diesel 202-917-1000: ATS Aurora ti C130 GT4088BS Drop-in Replacement HD Turbo for Caterpillar C13... [turbo]
- ATS Diesel 202-923-1000: ATS Aurora ti S430SX Drop-in Replacement HD Turbo for Engines [turbo]
- ATS Diesel 202-921-1000: ATS Aurora ti S410G GT5008BS Drop-in Replacement HD Turbo for Caterpillar... [turbo]
- ATS Diesel 202-925-1000: ATS Aurora ti S410SX Drop-in Replacement HD Turbo for Caterpillar 3046E Engines [turbo]
- ATS Diesel 202-926-1000: ATS Aurora ti S410G Drop-in Replacement HD Turbo for Caterpillar 3456 Engines [turbo]
- ATS Diesel 202-922-1000: ATS Aurora ti S410SX Drop-in Replacement HD Turbo for 15L Engines [turbo]
- ATS Diesel 202-932-1000: ATS Aurora ti HY55V Drop-in Replacement HD Turbo for Iveco Cursor 13, Astra,... [turbo]
- ATS Diesel 202-912-1000: ATS Aurora ti HE531 Drop-in Replacement HD Turbo for Paccar MX13, EPA10, and... [turbo]
- ATS Diesel 202-913-1000: ATS Aurora ti HE531 Drop-in Replacement HD Turbo for Paccar and Peterbuilt... [turbo]
- ATS Diesel 202-931-1000: ATS Aurora ti HE431V Drop-in Replacement HD Turbo for Mack and Volvo MD13... [turbo]
- ATS Diesel 202-908-1000: ATS Aurora ti HE431V Drop-in Replacement HD Turbo for Iveco CUrsor 8 Engines [turbo]
- ATS Diesel 202-916-1000: ATS Aurora ti B1UG Drop-in Replacement HD Turbo for International DT570 and... [turbo]
- ATS Diesel 202-918-1000: ATS Aurora ti GT4702B Drop-in Replacement HD Turbo for Caterpillar C9 and... [turbo]
- Bullet Proof Baja 90405003: Oil Cooler Kit Remote | Upgrade for Can-Am X3 [oilCooler]
- Bullet Proof Baja 90405001: Oil Cooler Kit Remote | Upgrade for Can-Am X3 [oilCooler]
- Bullet Proof Baja 90405002: Oil Cooler Kit Remote | Upgrade for Can-Am X3 [oilCooler]
- Bullet Proof Baja 90405000: Oil Cooler Kit Remote | Upgrade for Can-Am X3 [oilCooler]
- Exergy Performance DJPEXE0420315: Exergy Reverse Rotation Sportsman CP3 Pump - E04 20315 [injectionPump]
- Exergy Performance DJPEXE0420317: Exergy Reverse Rotation 12mm Stroker CP3 Pump - E04 20317 [injectionPump]
- Exergy Performance DJPEXE0420318: Exergy Reverse Rotation 14mm Stroker CP3 Pump - Race Series - E04 20318 [injectionPump]
- Exergy Performance DJPEXE0420316: Exergy Reverse Rotation 10mm Stroker CP3 Pump - E04 20316 [injectionPump]
- Stainless Diesel CTS480-C-VB-1: S480/96 T6 TURBO [turbo]
- Stainless Diesel CTS480-C-VB-2: S480/96 T6 TURBO [turbo]
- Stainless Diesel CTS475.96.132BW-1: S475/96 T6 1.32 TURBO [turbo]
- Stainless Diesel CTS465.T4-.90: S465 T-4 TURBO [turbo]
- Stainless Diesel CTS465.T4-1.00: S465 T-4 TURBO [turbo]
- Stainless Diesel CTS465.T4-1.10: S465 T-4 TURBO [turbo]
- Stainless Diesel CTS465.T4-2.5-1.00: S465 /T-4 2.5 PULLING TURBO [turbo]
- Stainless Diesel CTS465.T4-2.5-1.10: S465 /T-4 2.5 PULLING TURBO [turbo]
- Stainless Diesel TSG-SB77-3002: 6.00" Turbo Screen Guard [turbo]
- Stainless Diesel TSG-SB77-3001: 5.00" Turbo Screen Guard [turbo]
- Stainless Diesel TSG-SB77-3000: 4.00" Turbo Screen Guard [turbo]
- Stainless Diesel SD5BTD4954IN: 5 Blade S495 THA DONK [turbo]
- Stainless Diesel SD5BGF485.T6: 5 Blade S485 Godfather Turbo [turbo]
- Stainless Diesel SD5BGF485.T6-1: 5 Blade S485 Godfather Turbo [turbo]
- Stainless Diesel SD5B480.T6-115: 5 Blade S480 T-6 Turbo [turbo]
- Stainless Diesel SD5B480.T6-132: 5 Blade S480 T-6 Turbo [turbo]
- Stainless Diesel T6_T4ADK: T6 Manifold to T4 Turbo Adapter Kit [manifold]
- Stainless Diesel T4_T6ADK: T4 Manifold to T6 Turbo Adapter Kit [manifold]
- Stainless Diesel T4_T3ADK: T4 Manifold to T3 Turbo Adapter Kit [manifold]
- Stainless Diesel T3_T4ADK: T3 Manifold to T4 Turbo Adapter Kit [manifold]
- Stainless Diesel E25004: 5.00" Twin Downpipe -- 3G Twin S400 [turbo]
- Stainless Diesel E2006S-1: 5.00" Twin Air Intake PIPE ONLY [intake]
- Stainless Diesel A2221: 5.00" Single Air Intake PIPE ONLY [intake]
- Stainless Diesel TTODL-formed-1: Oil Drain Line - Twin Turbocharger [turbo]
- Stainless Diesel T6GASK: T-6 Gasket [gasket]
- Stainless Diesel T4GASK: T-4 Gasket [gasket]
- Stainless Diesel T3GASK: T-3 Gasket [gasket]
- Stainless Diesel TODG: Turbo Oil Drain Gasket [gasket]
- Stainless Diesel SD5B472/87.T4-1.00: Performance 5B472/87 T-4 Turbo [turbo]
- Stainless Diesel SD5B472/87.T4-1.10: Performance 5B472/87 T-4 Turbo [turbo]
- Stainless Diesel SD5B472/87.T4-SC: Performance 5B472/87 T-4 Turbo [turbo]
- Stainless Diesel SD5B472/83.T4-1.00: Performance 5B472/83 T-4 Turbo [turbo]
- Stainless Diesel SD5B472/83.T4-1.10: Performance 5B472/83 T-4 Turbo [turbo]
- Stainless Diesel SD5B472/83.T4-SC: Performance 5B472/83 T-4 Turbo [turbo]
- Stainless Diesel SD5B468/83.T4-1.00: Performance 5B468/83 T-4 Turbo [turbo]
- Stainless Diesel SD5B468/83.T4-1.10: Performance 5B468/83 T-4 Turbo [turbo]
- Stainless Diesel SD5B468/83.T4-SC: Performance 5B468/83 T-4 Turbo [turbo]
- Stainless Diesel TODG-bolts: OIL DRAIN BOLTS / GASKET SET [gasket]
- Stainless Diesel CTS478.96.132-SEMI-C-1: S478/96/1.32 CAT SEMI Turbo [turbo]
- Stainless Diesel CTS478.96.132-SEMI-C-2: S478/96/1.32 CAT SEMI Turbo [turbo]
- ... 725 more

Judgement calls:

- Banks `CA-Exclusion` is stored as `no_eo_race_only` (the enum's only 'no CARB EO' value); these are street parts that Banks does not ship to California, not race-only parts. Revisit if the enum grows a `no_eo` value.
- Cam type is recorded only when the text says hydraulic/solid roller/flat; Cummins cams with no type words have no `type` (they are flat-tappet by design, but the listing did not say so).
- Cam durations read next to the word 'duration' or 'cam' without an explicit `.050` marker are stored as `dur050` and flagged below; verify against the maker's cam card.
- Upgraded EGR coolers (Bullet Proof Diesel) are skipped: an emissions-system component with no task category. They are not deletes; add a category if wanted.
- ATS is mostly transmissions / torque converters / thermal bypass valves; only engine parts (turbo kits, manifolds, injectors, pumps) are emitted.
- Cold-air intake systems (Banks Ram-Air, HSP) are emitted as `intake` with no manifold-type spec; Monster-Ram / intake elbows / intake horns are `manifold` type `intake`.

Per-record flags:

- Wagler CRD5.9/6.7+1.00: no numeric rod dimension found (Wagler Cummins HD +1 Deckplate Rod)
- Wagler CRD5.9/6.7: no numeric rod dimension found (Wagler 5.9/6.7 Cummins HD Rods)
- Wagler WCPC66150-STD: no numeric piston dimension found (Wagler Duramax Delipped Mahle Pistons with Rings)
- Wagler WCPC66150(.25): no numeric piston dimension found (Wagler Duramax Delipped Mahle Pistons with Rings)
- Wagler WCPC66150(.50): no numeric piston dimension found (Wagler Duramax Delipped Mahle Pistons with Rings)
- Wagler WCPC66150(.75): no numeric piston dimension found (Wagler Duramax Delipped Mahle Pistons with Rings)
- Wagler WCPC66150(1.00): no numeric piston dimension found (Wagler Duramax Delipped Mahle Pistons with Rings)
- Wagler: listing has no SKU; `p` is the store handle 'zz-std' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'zz-010' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'zz-020' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'zz-030' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'zz-040' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'wagler-duramax-streetfighter-1-000-hp-rotating-assembly-std' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'wagler-duramax-streetfighter-1-000-hp-rotating-assembly-010' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'wagler-duramax-streetfighter-1-000-hp-rotating-assembly-020' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'wagler-duramax-streetfighter-1-000-hp-rotating-assembly-030' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler: listing has no SKU; `p` is the store handle 'wagler-duramax-streetfighter-1-000-hp-rotating-assembly-040' (Wagler Duramax STREETFIGHTER 1,000 HP Rotating Assembly with...)
- Wagler CRF6.7: no numeric rod dimension found (Wagler 6.7 Ford Rods)
- Wagler CRF6.7.1: no numeric rod dimension found (Wagler 6.7 Ford Rods)
- Wagler CRF6.7.2: no numeric rod dimension found (Wagler 6.7 Ford Rods)
- Wagler CRCL5P: no numeric rod dimension found (Wagler L5P Duramax Billet Connecting Rods)
- Wagler WCPC6686-2: no numeric cam spec found in title/body (Wagler Duramax Alternate Fire Stage 2 Camshaft)
- Wagler WCPC6686-1: no numeric cam spec found in title/body (Wagler Duramax Alternate Fire Stage 1 Camshaft)
- Wagler CRF6.4: no numeric rod dimension found (Wagler 6.4 Ford Rods)
- Wagler CRF6.0: no numeric rod dimension found (Wagler 6.0 Ford Rods)
- Wagler CRC6.6ST: no numeric rod dimension found (Wagler Duramax Street Fighter Connecting Rods)
- Wagler CRD5.9/6.7ST.1: no numeric rod dimension found (Wagler 2019+ 6.7 Cummins Street Fighter Rods)
- Wagler CRD5.9/6.7: no numeric rod dimension found (Wagler Cummins Street Fighter Connecting Rods)
- Wagler WCPD6618: rocker ratio not stated (Wagler Billet Duramax Rocker Bridges)
- Colt Cams: listing has no SKU; `p` is the store handle '12v-cam-combo-street-conical-2' (12v Cummins Cam Combo | Big Stick)
- Colt Cams 12v-cam-combo-street-conical-2: no numeric cam spec found in title/body (12v Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '12v-cam-combo-street-conical-3' (12v Cummins Cam Combo | Big Stick)
- Colt Cams 12v-cam-combo-street-conical-3: no numeric cam spec found in title/body (12v Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '12v-cam-combo-race-conical-2' (12v Cummins Cam Combo | Big Stick)
- Colt Cams 12v-cam-combo-race-conical-2: no numeric cam spec found in title/body (12v Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '12v-cam-combo-race-conical-3' (12v Cummins Cam Combo | Big Stick)
- Colt Cams 12v-cam-combo-race-conical-3: no numeric cam spec found in title/body (12v Cummins Cam Combo | Big Stick)
- Power Driven Diesel 51816181306: rocker ratio not stated (Power Driven “Batwing” Rocker Pedestals SET for 89-98...)
- Power Driven Diesel 51816181307: rocker ratio not stated (Power Driven Doweled Batwing Rocker Pedestals for 89-98...)
- Power Driven Diesel 51816181304: rocker ratio not stated (Power Driven Batwing Rocker Pedestals 89-98 8v/4BT Cummins)
- Colt Cams: listing has no SKU; `p` is the store handle 'vp44-cummins-cam-combo-big-stick-1' (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams vp44-cummins-cam-combo-big-stick-1: no numeric cam spec found in title/body (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle 'vp44-cummins-cam-combo-big-stick-2' (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams vp44-cummins-cam-combo-big-stick-2: no numeric cam spec found in title/body (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle 'vp44-cummins-cam-combo-big-stick-2-5' (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams vp44-cummins-cam-combo-big-stick-2-5: no numeric cam spec found in title/body (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle 'vp44-cummins-cam-combo-big-stick-3' (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams vp44-cummins-cam-combo-big-stick-3: no numeric cam spec found in title/body (VP44 Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '4bt-cummins-cam-combo-stage-3-2-24v' (4BT Cummins Cam Combo | Big Stick)
- Colt Cams 4bt-cummins-cam-combo-stage-3-2-24v: no numeric cam spec found in title/body (4BT Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '4bt-cummins-cam-combo-stage-3-3-24v' (4BT Cummins Cam Combo | Big Stick)
- Colt Cams 4bt-cummins-cam-combo-stage-3-3-24v: no numeric cam spec found in title/body (4BT Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '24v-cummins-cam-combo-1' (Commonrail Cummins Cam Combo | Big Stick)
- Colt Cams 24v-cummins-cam-combo-1: no numeric cam spec found in title/body (Commonrail Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '24v-cummins-cam-combo-2' (Commonrail Cummins Cam Combo | Big Stick)
- Colt Cams 24v-cummins-cam-combo-2: no numeric cam spec found in title/body (Commonrail Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '24v-cummins-cam-combo-2-5' (Commonrail Cummins Cam Combo | Big Stick)
- Colt Cams 24v-cummins-cam-combo-2-5: no numeric cam spec found in title/body (Commonrail Cummins Cam Combo | Big Stick)
- Colt Cams: listing has no SKU; `p` is the store handle '24v-cummins-cam-combo-3' (Commonrail Cummins Cam Combo | Big Stick)
- Colt Cams 24v-cummins-cam-combo-3: no numeric cam spec found in title/body (Commonrail Cummins Cam Combo | Big Stick)
- Power Driven Diesel 52002219003: no numeric spring spec found (PDD 24v Cummins Valve Springs)
- Power Driven Diesel RES0001: no numeric spring spec found (PDD 24v Cummins Valve Springs)
- Power Driven Diesel 56001010012: pushrod diameter not stated (Power Driven 4BT Cummins Pushrod Set)
- Power Driven Diesel 56001010013: pushrod diameter not stated (Power Driven 4BT Cummins Pushrod Set)
- Power Driven Diesel 56001010003: pushrod diameter not stated (Power Driven Pushrods for 89-98 12v Cummins)
- Power Driven Diesel 56001010004: pushrod diameter not stated (Power Driven Pushrods for 89-98 12v Cummins)
- Colt Cams C.856.H: duration 192/209 read next to 'duration'/'cam' without an explicit .050 marker (Stage 3 Camshaft for 6.0L/6.4L Ford Powerstroke)
- Colt Cams C.343.S-4BT: duration 181/210 read next to 'duration'/'cam' without an explicit .050 marker (Stage 3 Camshaft for 4BT Cummins)
- Colt Cams C.849.H: no numeric cam spec found in title/body (Stage 2 Camshaft for 6.0L/6.4L Ford Powerstroke)
- Colt Cams C.349.S-S5: duration 199/218 read next to 'duration'/'cam' without an explicit .050 marker (Stage 5 Camshaft for Cummins 5.9L/6.7L)
- Colt Cams C.346.S-S4: no numeric cam spec found in title/body (Stage 4 Camshaft for Cummins 5.9L/6.7L)
- Colt Cams C.343.S-S3: no numeric cam spec found in title/body (Stage 3 "Big Stick" Camshaft for Cummins 5.9L/6.7L)
- Colt Cams C.852.H: no numeric cam spec found in title/body (Stage 2 Camshaft for 7.3L Ford Powerstroke)
- Manton RA RKR-165-120R: engine heading 'Manton Rocker Arm 1.7 Ratio' not mapped to a family (Manton Rocker Arm 1.7 Ratio, Offset .120 Right for...)
- Manton RA 4900-NI: rocker ratio not stated (Manton 4.900 Noonan Hemi - Rocker Arm ( Intake ))
- Manton RA 4900-NE: rocker ratio not stated (Manton 4.900 Noonan Hemi - Rocker Arm ( Exhaust ))
- Manton RA 410-RKR-SYS-WIDE: engine heading 'Manton's All Pro RE-13 Wide Pad Cylinder Head Shaft Mounted Rocker Arm System' not mapped to a family (Manton's All Pro RE-13 Wide Pad Cylinder Head Shaft...)
- Manton RA RKR-165-STD: rocker ratio not stated (Big Block Chevy Rocker Arm Non Offset for Manton, T & D...)
- Stage V RA STGV-IR4: engine heading 'Stage V by Manton - Intake Rocket Arm 1.7 Ratio - Aftermarket Racing Heads' not mapped to a family (Stage V by Manton - Intake Rocket Arm 1.7 Ratio -...)
- Stage V RA STGV-ER7: engine heading 'Stage V by Manton - Exhaust Rocker Arm 1.6 Ratio - Aftermarket Racing Heads' not mapped to a family (Stage V by Manton - Exhaust Rocker Arm 1.6 Ratio -...)
- Manton RA LS3-RKR-SYS: rocker ratio not stated (Manton's LS3/LSA - Rocker Arm System (Factory Head))
- Manton RA GEN3-E: rocker ratio not stated (Gen 3 Hemi - Exhaust Rocker Arm ( Non Adjustable ))
- Manton RA LSN-RKR-KIT: rocker ratio not stated (Manton's - Noonan LS Edge - Rocker Arm Kit (Stands Not...)
- Manton RA GEN3-I: rocker ratio not stated (Gen 3 Hemi - Intake Rocker Arm ( Non Adjustable ))
- Manton RA SR71-RKR-SYS: engine heading 'Manton's Kaase SR-71 Cylinder Head Shaft Mounted Rocker Arm System' not mapped to a family (Manton's Kaase SR-71 Cylinder Head Shaft Mounted Rocker...)
- Manton GEN3-KIT-F: rocker ratio not stated (Gen 3 Hemi - Rocker Arm System ( Non Adjustable ))
- Manton RA LS-CR-RKR-SYS: engine heading 'Manton's CID LS-CR Cylinder Head Shaft Mounted Rocker Arm System' not mapped to a family (Manton's CID LS-CR Cylinder Head Shaft Mounted Rocker...)
- Manton RA LT-RKR-SYS: engine heading 'Manton's LT - Rocker Arm System (LME Edelbrock ONLY)' not mapped to a family (Manton's LT - Rocker Arm System (LME Edelbrock ONLY))
- Manton RA LT-RKR-SYS: rocker ratio not stated (Manton's LT - Rocker Arm System (LME Edelbrock ONLY))
- Manton 304-LT-16: engine heading '2013 to Current GM 6.2L GEN V LT -Series 3 Pushrods' not mapped to a family (2013 to Current GM 6.2L GEN V LT -Series 3 Pushrods, 3/8...)
- Manton RA 2700R: rocker ratio not stated (Fathead Hemi - High Ratio Rocker Arm ( Exhaust ))
- Manton 503-LT-16: engine heading '2013 to Current GM 6.2L GEN V LT - Series 5 Performance Upgrade Pushrods' not mapped to a family (2013 to Current GM 6.2L GEN V LT - Series 5 Performance...)
- Dynomite Diesel SE9498-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge 94-98 5.9L 12v Custom Injector...)
- Dynomite Diesel DDPNFD6720-SM: injector size (% over / HP) not stated (2020-2022 Ford Powerstroke 6.7L BRAND NEW Custom...)
- Dynomite Diesel SEISB-DFV2: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge Cummins 98.5-02 24v Custom Dual...)
- Dynomite Diesel SE9498-5X25DF: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge 94-98 5.9L 12v Dual Feed 5x25...)
- Dynomite Diesel SESVC-6722MOD: injector size (% over / HP) not stated (RAM 2022-2024 6.7L Cummins Injector Modification Service)
- Dynomite Diesel SE8993-COMP: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge Cummins 89-93 5.9L 12V Custom...)
- Dynomite Diesel SE4BTVE-COMP: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Cummins VE Pump 4BT Custom Injector...)
- Dynomite Diesel SE4BTP-COMP: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Cummins P-Pump 4BT Custom Injector (SOLD...)
- Dynomite Diesel SENLMM-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Chevy Duramax 08-10 LMM Custom Injector...)
- Dynomite Diesel SENLML-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Chevy Duramax 11-16 LML Custom Injector...)
- Dynomite Diesel SENLBZ-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Chevy Duramax 06-07 6.6L LBZ Custom...)
- Dynomite Diesel SENLB7-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Chevy Duramax 01-04 LB7 Custom Injector...)
- Dynomite Diesel SENFD67-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Ford 11-14 6.7L Powerstroke Custom...)
- Dynomite Diesel SENFD6715-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Ford 15-19 6.7L Powerstroke Custom...)
- Dynomite Diesel SEN67-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge 07.5-18 6.7L Cummins Custom...)
- Dynomite Diesel SEN325-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge Cummins 04.5-07 Custom Injector...)
- Dynomite Diesel SEN305-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge Cummins 03-04 Custom Injector...)
- Dynomite Diesel SEISB-TF-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Cummins 24v Custom TOP FEED Injector...)
- Dynomite Diesel SEISB-TF-DF-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Cummins 24v Custom TOP FEED / DUAL FEED...)
- Dynomite Diesel SEISB-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- Dodge Cummins 98.5-02 24v Custom...)
- Dynomite Diesel SEFD64-SM: injector size (% over / HP) not stated (SHOP EXCLUSIVE- 08-10 Powerstroke 6.4L Custom Injector &...)
- Dynomite Diesel SESVC-PZMOD: injector size (% over / HP) not stated (Piezo Injector Modification Service (Ford 6.7L 2011+,...)
- Dynomite Diesel SESVC-ISP: injector size (% over / HP) not stated (Piezo Injector Testing and Inspection)
- Dynomite Diesel SESVC-PZ: injector size (% over / HP) not stated (Piezo Injector Testing and Inspection)
- Dynomite Diesel SESVC-ISP: injector size (% over / HP) not stated (Mechanical Injector Testing and Inspection)
- Dynomite Diesel SESVC-MI: injector size (% over / HP) not stated (Mechanical Injector Testing and Inspection)
- Dynomite Diesel SESVC-ISP: injector size (% over / HP) not stated (Common Rail Injector Testing and Inspection)
- Dynomite Diesel SESVC-CR: injector size (% over / HP) not stated (Common Rail Injector Testing and Inspection)
- Dynomite Diesel DDP8993-COMP: injector size (% over / HP) not stated (Dodge Cummins 89-93 5.9L 12 Valve Clean Custom Injector Set)
- Dynomite Diesel SESVC-ECOMOD: injector size (% over / HP) not stated (RAM & JEEP EcoDiesel Injector Modification Service)
- Dynomite Diesel DDPN325-SM: injector size (% over / HP) not stated (Dodge Cummins 04.5-07 Brand New Clean Custom Injector...)
- Banks Power 24458: no wheel size / model / A/R found (Turbo Upgrade Kit)
- Banks Power 24440: no wheel size / model / A/R found (Turbo Upgrade)
- Banks Power 24457: no wheel size / model / A/R found (Turbo Upgrade)
- Banks Power 24456: no wheel size / model / A/R found (Turbo Upgrade)
- Banks Power 24450: no wheel size / model / A/R found (Turbo Upgrade)
- ATS Diesel 202-307-3368: no wheel size / model / A/R found (ATS AURORA VNT TURBOCHARGER KIT FITS 2011-2016 FORD CAB...)
- atsdiesel 202-306-3368: no wheel size / model / A/R found (ATS AURORA VNT TURBOCHARGER KIT FITS 2011-2014 FORD...)
- ATS Diesel 202-406-3368: no wheel size / model / A/R found (ATS Aurora 4000 VNT Stage 2 Turbocharger Kit, 2011-2014...)
- ATS Diesel 202-407-3368: no wheel size / model / A/R found (ATS Aurora 4000 VNT Stage 2 Turbocharger Kit, 2011-2016...)
- ATS Diesel 202-920-1000: no wheel size / model / A/R found (ATS Aurora ti GTA5518B Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-919-1000: no wheel size / model / A/R found (ATS Aurora ti GTA4294BS Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-923-1000: no wheel size / model / A/R found (ATS Aurora ti S430SX Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-925-1000: no wheel size / model / A/R found (ATS Aurora ti S410SX Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-926-1000: no wheel size / model / A/R found (ATS Aurora ti S410G Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-922-1000: no wheel size / model / A/R found (ATS Aurora ti S410SX Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-910-1000: no wheel size / model / A/R found (ATS Aurora ti HE500VG Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-924-1000: no wheel size / model / A/R found (ATS Aurora ti HE561VE Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-914-1000: no wheel size / model / A/R found (ATS Aurora ti HE561VE Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-932-1000: no wheel size / model / A/R found (ATS Aurora ti HY55V Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-901-1000: no wheel size / model / A/R found (ATS Aurora ti HE551V Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-912-1000: no wheel size / model / A/R found (ATS Aurora ti HE531 Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-913-1000: no wheel size / model / A/R found (ATS Aurora ti HE531 Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-906-1000: no wheel size / model / A/R found (ATS Aurora ti HE400VG Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-930-1000: no wheel size / model / A/R found (ATS Aurora ti HE400VG Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-929-1000: no wheel size / model / A/R found (ATS Aurora ti HE400VG Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-905-1000: no wheel size / model / A/R found (ATS Aurora ti HE400VG Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-928-1000: no wheel size / model / A/R found (ATS Aurora ti HE451VE Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-915-1000: no wheel size / model / A/R found (ATS Aurora ti HE451VE Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-931-1000: no wheel size / model / A/R found (ATS Aurora ti HE431V Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-927-1000: no wheel size / model / A/R found (ATS Aurora ti HE431V Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-909-1000: no wheel size / model / A/R found (ATS Aurora ti HE431V Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-908-1000: no wheel size / model / A/R found (ATS Aurora ti HE431V Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-902-1000: no wheel size / model / A/R found (ATS Aurora ti H300VC Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-903-1000: no wheel size / model / A/R found (ATS Aurora ti HE300VG Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-904-1000: no wheel size / model / A/R found (ATS Aurora ti HE351VE Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-916-1000: no wheel size / model / A/R found (ATS Aurora ti B1UG Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-918-1000: no wheel size / model / A/R found (ATS Aurora ti GT4702B Drop-in Replacement HD Turbo for...)
- ATS Diesel 202-302-2464: no wheel size / model / A/R found (ATS Aurora VFR 3000 - 4000 Stage 1 - 2 Turbocharger...)
- ATS Diesel 202-402-2464: no wheel size / model / A/R found (ATS Aurora VFR 3000 - 4000 Stage 1 - 2 Turbocharger...)
- ATS Diesel 202-A35-2164: no wheel size / model / A/R found (ATS Aurora 3000/5000 | 4000/7500 Compound Turbo System...)
- ATS Diesel 202-A35-2218: no wheel size / model / A/R found (ATS Aurora 3000/5000 | 4000/7500 Compound Turbo System...)
- ATS Diesel 202-A35-2272: no wheel size / model / A/R found (ATS Aurora 3000/5000 | 4000/7500 Compound Turbo System...)
- ATS Diesel 202-A47-2272: no wheel size / model / A/R found (ATS Aurora 3000/5000 | 4000/7500 Compound Turbo System...)
- ATS Diesel 202-952-2326: no wheel size / model / A/R found (ATS Aurora Plus 5000 / 6000 / 7500 Compound Turbo System...)
- ATS Diesel 202-952-2356: no wheel size / model / A/R found (ATS Aurora Plus 5000 / 6000 / 7500 Compound Turbo System...)
- ATS Diesel 202-962-2356: no wheel size / model / A/R found (ATS Aurora Plus 5000 / 6000 / 7500 Compound Turbo System...)
- ATS Diesel 202-972-2326: no wheel size / model / A/R found (ATS Aurora Plus 5000 / 6000 / 7500 Compound Turbo System...)
- ATS Diesel 202-972-2362: no wheel size / model / A/R found (ATS Aurora Plus 5000 / 6000 / 7500 Compound Turbo System...)
- ATS Diesel 202-952-2392: no wheel size / model / A/R found (ATS Aurora Plus 5000 / 6000 Vortex Compound Turbo System...)
- ATS Diesel 202-962-2392: no wheel size / model / A/R found (ATS Aurora Plus 5000 / 6000 Vortex Compound Turbo System...)
- ATS Diesel 202-302-2326: no wheel size / model / A/R found (ATS Aurora VFR VGT Turbo Fits 2007.5-2018 6.7L Cummins -...)
- ATS Diesel 202-302-2392: no wheel size / model / A/R found (ATS Aurora VFR VGT Turbo Fits 2007.5-2018 6.7L Cummins -...)
- ATS Diesel 202-402-2326: no wheel size / model / A/R found (ATS Aurora VFR VGT Turbo Fits 2007.5-2018 6.7L Cummins -...)
- ATS Diesel 202-402-2392: no wheel size / model / A/R found (ATS Aurora VFR VGT Turbo Fits 2007.5-2018 6.7L Cummins -...)
- Ford 6000041: rocker ratio not stated (Rocker Carrier Gasket, Ford 6.0L)
- Various 90201233: injector size (% over / HP) not stated (Set of 8 - Early Model 6.0L Fuel Injectors)
- Various 90201234: injector size (% over / HP) not stated (Set of 8 - Late Model 6.0L Fuel Injectors)
- GB Remanufacturing 6000362: injector size (% over / HP) not stated (Cummins 5.9L Injectors, 2003-2004.5 Dodge/Ram Truck,...)
- GB Remanufacturing 6000363: injector size (% over / HP) not stated (Cummins 5.9L Injector, 2004.5-2009 Dodge/Ram Truck, Six Pack)
- GB Remanufacturing 6000364: injector size (% over / HP) not stated (Duramax 6.6L Injector, 2001-2004 LB7 - 4 Pack of Injectors)
- Bullet Proof Diesel DSC-21: injector size (% over / HP) not stated (CORE: Cummins 5.9L Injector - 6000363)
- Bullet Proof Diesel DSC-20: injector size (% over / HP) not stated (CORE: Cummins 5.9L Injector - 6000362)
- Bullet Proof Diesel DSC-22: injector size (% over / HP) not stated (CORE: Duramax LB7 6.6L Injector - 6000364)
- Bullet Proof Diesel DSC-207: injector size (% over / HP) not stated (CORE: Duramax LLY 6.6L Injector - 6000432)
- Diamond Advantage 6000432: injector size (% over / HP) not stated (Duramax 6.6L Injector, 2004-2006 LLY)
- Bullet Proof Diesel DSC-203: injector size (% over / HP) not stated (CORE: Ford 6.4L Injector - 6000463)
- Bullet Proof Diesel DSC-202: injector size (% over / HP) not stated (CORE: Duramax LBZ 6.6L Injector - 6000431)
- Diamond Advantage 6000431: injector size (% over / HP) not stated (Duramax 6.6L Injector, 2006-2007 LBZ)
- Diamond Advantage 6000400: injector size (% over / HP) not stated (Cummins 6.7L Injector, 2007-2012 Dodge/Ram Truck)
- Bullet Proof Diesel DSC-200: injector size (% over / HP) not stated (CORE: Cummins 6.7L Injector - 6000400)
- Bullet Proof Diesel DSC-201: no wheel size / model / A/R found (CORE: Cummins 6.7L Turbo - 6000403)
- Ford 6000114: rocker ratio not stated (Rocker and Valve Cover Set, Driver Side, Ford 6.4L,...)
- Ford 6000113: rocker ratio not stated (Rocker and Valve Cover Set, Passenger Side, Ford 6.4L,...)
- Ford 6000047: rocker ratio not stated (Ford Rocker Arm Clip, Plastic, 6.0L Diesel, W302193)
- Ford 6000045: no wheel size / model / A/R found (Ford VGT Turbo Control Solenoid Pigtail Harness,...)
- HSP Diesel: listing has no SKU; `p` is the store handle '2001-2016-chevrolet-gmc-billet-valve-covers-crank-case-ventilation-kit' (HSP Billet Valve Cover Crank Case Ventilation Kit | 2001-2016...)
- Stainless Diesel: listing has no SKU; `p` is the store handle 's300-vgt-turbocbarger-replacement-kit-s363-68-t4-91' (S300 VGT Turbocharger Replacement Kit | 2007.5-2018 Dodge Ram 6.7...)
- Stainless Diesel: listing has no SKU; `p` is the store handle 's300-vgt-turbocbarger-replacement-kit-s366-74-t4-91' (S300 VGT Turbocharger Replacement Kit | 2007.5-2018 Dodge Ram 6.7...)
- G&R Diesel Inc. GRD67CM3015: rocker ratio not stated (G&R Diesel Billet Rocker Box | 2006-2018 Dodge Ram 5.9...)
- Stainless Diesel 5G6710BDIW: no wheel size / model / A/R found (10 Blade Drop In VGT Turbine | 2019+ Dodge Ram 6.7 Cummins)
- Stainless Diesel L6710BDIW: no wheel size / model / A/R found (10 Blade Drop In VGT Turbine | 2013-2018 Dodge Ram 6.7...)
- Stainless Diesel SDCR003: no wheel size / model / A/R found (Reman Drop-in VGT Turbocharger | 2019+ Dodge Ram 6.7 Cummins)
- Stainless Diesel SDCR002: no wheel size / model / A/R found (Reman Drop-in Cummins VGT Turbocharger | 2013-2018 Dodge...)
- Stainless Diesel SDCR001: no wheel size / model / A/R found (Reman VGT Turbocharger | 2007.5-2012 Dodge Ram 6.7 Cummins)
- S&S Diesel Motorsport LB7-10VCO-SET: injector size (% over / HP) not stated (S&S Diesel TorqueMaster Injector New | 2001-2004...)
- S&S Diesel Motorsport LB7-00SAC-SET: injector size (% over / HP) not stated (S&S Diesel SAC00® Injector New | 2001-2004 Chevrolet 6.6...)
- S&S Diesel Motorsport LB7-500SAC-SET: injector size (% over / HP) not stated (S&S Diesel 500% Over Injector New | 2001-2004 Chevrolet...)
- S&S Diesel Motorsport LB7-450SAC-SET: injector size (% over / HP) not stated (S&S Diesel 450% Over Injector New | 2001-2004 Chevrolet...)
- S&S Diesel Motorsport LLY-500SAC-SET: injector size (% over / HP) not stated (S&S Diesel 500% Over Injector New | 2004.5-2005...)
- S&S Diesel Motorsport LLY-450SAC-SET: injector size (% over / HP) not stated (S&S Diesel 450% Over Injector New | 2004.5-2005...)
- S&S Diesel Motorsport LBZ-450SAC-SET: injector size (% over / HP) not stated (S&S Diesel 450% Over Injector New | 2006-2007 Chevrolet...)
- S&S Diesel Motorsport LBZ-500SAC-SET: injector size (% over / HP) not stated (S&S Diesel 500% Over Injector New | 2006-2007 Chevrolet...)
- S&S Diesel Motorsport LMM-500SAC-SET: injector size (% over / HP) not stated (S&S Diesel 500% Over Injector New | 2007.5-2010...)
- S&S Diesel Motorsport LMM-450SAC-SET: injector size (% over / HP) not stated (S&S Diesel 450% Over Injector New | 2007.5-2010...)
- Exergy Performance DJPEXE01 10264: injector size (% over / HP) not stated (Exergy Reman Fuel Injectors 500% Over w/Internal...)
- Exergy Performance EXE0210264: injector size (% over / HP) not stated (Exergy New Fuel Injectors 500% Over w/Internal...)
- Exergy Performance EXE0220364: injector size (% over / HP) not stated (Exergy New Fuel injectors 500% Over w/Internal...)
- Exergy Performance DJPEXE0110464: injector size (% over / HP) not stated (Exergy Reman Fuel Injectors 500% Over w/Internal...)
- Exergy Performance EXE0210364: injector size (% over / HP) not stated (Exergy New Fuel Injectors 500% Over w/Internal...)
- Exergy Performance EXE0220264: injector size (% over / HP) not stated (Exergy New Fuel Injectors 500% Over w/Internal...)
- Exergy Performance DJPEXE0110164: injector size (% over / HP) not stated (Exergy Reman SAC Fuel Injectors 500% Over w/ Internal...)
- Exergy Performance DJPEXE0510510: injector size (% over / HP) not stated (Exergy Fuel Injector Leak Rail Assembly | 2011-2016...)
- Exergy Performance DJPEXE0120364: injector size (% over / HP) not stated (Exergy Reman Fuel injectors 500% Over w/Internal...)
- Exergy Performance EXE0210464: injector size (% over / HP) not stated (Exergy New Fuel Injectors 500% Over w/Internal...)
- Exergy Performance DJPEXE0110364: injector size (% over / HP) not stated (Exergy Reman Fuel Injectors 500% Over w/Internal...)
- Exergy Performance EXE0510012: injector size (% over / HP) not stated (Exergy Fuel Injector Leak Rail Retaining Clip (Set of 8)...)
- S&S Diesel Motorsport 6.7C-500SAC-SET: injector size (% over / HP) not stated (S&S Diesel 500% Over Injector Kit New | 2007.5-2018...)
- S&S Diesel Motorsport 6.7C-450SAC-SET: injector size (% over / HP) not stated (S&S Diesel 450% Over Injector Kit New | 2007.5-2018...)
- S&S Diesel Motorsport 325-500SAC-SET: injector size (% over / HP) not stated (S&S Diesel 500% Over Injector Kit New | 2004.5-2007...)
- S&S Diesel Motorsport 325-450SAC-SET: injector size (% over / HP) not stated (S&S Diesel 450% Over Injector Kit New | 2004.5-2007...)
- S&S Diesel Motorsport 305-500SAC-SET: injector size (% over / HP) not stated (S&S Diesel 500% Over Injector Kit New | 2003-2004 Dodge...)
- S&S Diesel Motorsport 305-450SAC-SET: injector size (% over / HP) not stated (S&S Diesel 450% Over Injector Kit New | 2003-2004 Dodge...)
- Stainless Diesel W2858: no wheel size / model / A/R found (3G Twin Kit Water Line with extension 7/8" | 2003-2005...)
- Stainless Diesel TSG-SB77-3002: no wheel size / model / A/R found (6.00" Turbo Screen Guard)
- Stainless Diesel TSG-SB77-3001: no wheel size / model / A/R found (5.00" Turbo Screen Guard)
- Stainless Diesel TSG-SB77-3000: no wheel size / model / A/R found (4.00" Turbo Screen Guard)
- Stainless Diesel SDDN027: no wheel size / model / A/R found (5 Blade 65mm Turbocharger | 2011-2016 Chevrolet 6.6...)
- Stainless Diesel SDDN026: no wheel size / model / A/R found (5 Blade 65mm Turbocharger | 2011-2016 Chevrolet 6.6...)
- Stainless Diesel SDDN019: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2011-2016 Chevrolet 6.6...)
- Stainless Diesel SDDN018: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2011-2016 Chevrolet 6.6...)
- Stainless Diesel SDDN025: no wheel size / model / A/R found (5 Blade 65mm Turbocharger | 2007.5-2010 Chevrolet 6.6...)
- Stainless Diesel SDDN024: no wheel size / model / A/R found (5 Blade 65mm Turbocharger | 2007.5-2010 Chevrolet 6.6...)
- Stainless Diesel SDDN017: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2007.5-2010 Chevrolet 6.6...)
- Stainless Diesel SDDN016: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2007.5-2010 Chevrolet 6.6...)
- Stainless Diesel SDDN021: no wheel size / model / A/R found (5 Blade 65mm Turbocharger | 2004.5-2005 Chevrolet 6.6...)
- Stainless Diesel SDDN020: no wheel size / model / A/R found (5 Blade 65mm Turbocharger | 2004.5-2005 Chevrolet 6.6...)
- Stainless Diesel SDDN013: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2004.5-2005 Chevrolet 6.6...)
- Stainless Diesel SDDN012: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2004.5-2005 Chevrolet 6.6...)
- Stainless Diesel SDDN015: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2006-2007 Chevrolet 6.6...)
- Stainless Diesel SDDN014: no wheel size / model / A/R found (5 Blade 63mm Turbocharger | 2006-2007 Chevrolet 6.6...)
- Stainless Diesel S3_BH/EXH_2C: fastener application not stated (S3 EXHAUST CLAMP & BOLT KIT)
- Stainless Diesel S3_CC/BH_4C: fastener application not stated (S3 COVER CLAMP & BOLT KIT)
- Smeding Diesel SDVGT1719: no wheel size / model / A/R found (Smeding Diesel VGT for 2017-19 6.7 L Powerstroke)
- Smeding Diesel: listing has no SKU; `p` is the store handle '6-7-cummins-head' (Smeding Diesel 6.7 Cummins 2007.5-2018 Cylinder Head)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-crankshaft-for-qsb-6-7l-cummins' (Smeding Diesel Crankshaft for QSB 6.7L Cummins)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-crankshaft-for-qsb-5-9l-cummins' (Smeding Diesel Crankshaft for QSB 5.9L Cummins)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-marmon-flange-sta' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-marmon-flange-ste' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-hx40-flange-stand' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-hx40-flange-steel' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-marmon-flange-sta' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-marmon-flange-ste' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-hx40-flange-stand' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-hx40-flange-steel' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-91-marmon-flange-standard' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-91-marmon-flange-steel-36' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-91-hx40-flange-standard-b' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-91-hx40-flange-steel-360-' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-83-marmon-flange-standard' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-83-marmon-flange-steel-36' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-83-hx40-flange-standard-b' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-long-45-outlet-83-hx40-flange-steel-360-' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-91-marmon-flange-standar' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-91-marmon-flange-steel-3' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-91-hx40-flange-standard-' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-91-hx40-flange-steel-360' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-83-marmon-flange-standar' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-83-marmon-flange-steel-3' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-83-hx40-flange-standard-' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-cast-s363-68-sxe-turbocharger-copy-short-45-outlet-83-hx40-flange-steel-360' (Smeding Diesel Billet S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-marmon-flange-sta' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-marmon-flange-ste' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-hx40-flange-stand' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-hx40-flange-steel' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-marmon-flange-sta' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-marmon-flange-ste' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-hx40-flange-stand' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-hx40-flange-steel' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-91-marmon-flange-standard' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-91-marmon-flange-steel-36' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-91-hx40-flange-standard-b' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-91-hx40-flange-steel-360-' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-83-marmon-flange-standard' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-83-marmon-flange-steel-36' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-83-hx40-flange-standard-b' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-long-45-outlet-83-hx40-flange-steel-360-' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-91-marmon-flange-standar' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-91-marmon-flange-steel-3' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-91-hx40-flange-standard-' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-91-hx40-flange-steel-360' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-83-marmon-flange-standar' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-83-marmon-flange-steel-3' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-83-hx40-flange-standard-' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s364-5-sxe-turbocharger-copy-short-45-outlet-83-hx40-flange-steel-360' (Smeding Diesel Billet S364.5/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-marmon-flange-sta' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-marmon-flange-ste' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-hx40-flange-stand' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-91-hx40-flange-steel' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-marmon-flange-sta' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-marmon-flange-ste' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-hx40-flange-stand' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-2-7-8-v-band-outlet-83-hx40-flange-steel' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-marmon-fla' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-91-hx40-flang' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-marmon-fla' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-duramax-style-v-band-inlet-83-hx40-flang' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-m' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-91-h' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-m' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-common-rail-cummins-style-90-outlet-83-h' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-91-marmon-flange-standard' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-91-marmon-flange-steel-36' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-91-hx40-flange-standard-b' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-91-hx40-flange-steel-360-' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-83-marmon-flange-standard' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-83-marmon-flange-steel-36' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-83-hx40-flange-standard-b' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-long-45-outlet-83-hx40-flange-steel-360-' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-91-marmon-flange-standar' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-91-marmon-flange-steel-3' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-91-hx40-flange-standard-' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-91-hx40-flange-steel-360' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-83-marmon-flange-standar' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-83-marmon-flange-steel-3' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-83-hx40-flange-standard-' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s363-sxe-turbocharger-copy-short-45-outlet-83-hx40-flange-steel-360' (Smeding Diesel Cast S363/68 SXE Turbocharger)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'billet-bottle-opener' (Billet Connecting Rod Bottle Opener)
- Smeding Diesel billet-bottle-opener: no numeric rod dimension found (Billet Connecting Rod Bottle Opener)
- Smeding Diesel: listing has no SKU; `p` is the store handle '6-7l-cummins-intake-horn-throttle-body-gasket' (6.7L Cummins Intake Horn/Throttle Body Gasket)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-t4-2nd-gen-location-3-pc-exhaust-manifold-1-no-standard-allen-head-bolts' (Smeding Diesel T4 2nd Gen Location 3 PC Exhaust Manifold)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-t4-2nd-gen-location-3-pc-exhaust-manifold-1-no-304-stainless-steel-studs' (Smeding Diesel T4 2nd Gen Location 3 PC Exhaust Manifold)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-t4-2nd-gen-location-3-pc-exhaust-manifold-1-no-630-stainless-steel-studs' (Smeding Diesel T4 2nd Gen Location 3 PC Exhaust Manifold)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-t4-2nd-gen-location-3-pc-exhaust-manifold-1-yes-standard-allen-head-bolts' (Smeding Diesel T4 2nd Gen Location 3 PC Exhaust Manifold)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-t4-2nd-gen-location-3-pc-exhaust-manifold-1-yes-304-stainless-steel-studs' (Smeding Diesel T4 2nd Gen Location 3 PC Exhaust Manifold)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-t4-2nd-gen-location-3-pc-exhaust-manifold-1-yes-630-stainless-steel-studs' (Smeding Diesel T4 2nd Gen Location 3 PC Exhaust Manifold)
- Smeding Diesel C61VG0410: no wheel size / model / A/R found (Smeding Diesel VGT for 04.5-10 6.6L Duramax)
- Smeding Diesel B61VG0410: no wheel size / model / A/R found (Smeding Diesel VGT for 04.5-10 6.6L Duramax)
- Smeding Diesel B63VG0410: no wheel size / model / A/R found (Smeding Diesel VGT for 04.5-10 6.6L Duramax)
- Smeding Diesel C61VG1116: no wheel size / model / A/R found (Smeding Diesel VGT for 11-16 6.6L Duramax)
- Smeding Diesel B61VG1116: no wheel size / model / A/R found (Smeding Diesel VGT for 11-16 6.6L Duramax)
- Smeding Diesel B63VG1116: no wheel size / model / A/R found (Smeding Diesel VGT for 11-16 6.6L Duramax)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'cummins-6-7l-intake-plenum-gasket' (Cummins 6.7L Intake Plenum Gasket)
- Smeding Diesel: listing has no SKU; `p` is the store handle 's300-t4i-housing' (S300 T4I housing)
- Smeding Diesel 8073HXMG: no wheel size / model / A/R found (.80 73mm HX40 MID GATE)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'cummins-6-7l-intake-horn-gasket' (Cummins 6.7L Intake Horn Gasket)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s400-kit-with-turbo-and-manifold-for-the-2019-2022-6-7l-cummins-90-s464-83-cast-extreme-duty-steel-360-b' (Smeding Diesel S400 Kit with Turbo and Manifold for the 2019-2024...)
- Smeding Diesel: listing has no SKU; `p` is the store handle 'smeding-diesel-s400-kit-with-turbo-and-manifold-for-the-2019-2022-6-7l-cummins-90-s464-83-billet-extreme-duty-steel-360' (Smeding Diesel S400 Kit with Turbo and Manifold for the 2019-2024...)
- ... 174 more

## Validation

Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src`, numeric fields are numbers, no empty strings.
