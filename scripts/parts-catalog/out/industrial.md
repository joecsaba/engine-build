# INDUSTRIAL extraction notes (Industrial Injection)

Extracted 2026-10-16 by `extract_industrial.py`. Source: public Shopify `https://www.industrialinjection.com/products.json?limit=250&page=N`.

## Fetch

- robots.txt: robots.txt could not be read (www redirects it to the bare host, which this environment's network allowlist blocks); proceeded on the brief's stated Crawl-delay 10 and Shopify's standard disallow list (which does not cover /products.json).
- `www.industrialinjection.com`: 9 page request(s) of 250 products, 2029 products in the listing; requests spaced 10 s apart (one request at a time). Pages cached under `dl/industrial/`.
- Prices (USD) are not stored.

## Records

Total records: **710** (one record per variant SKU per engine family)

| m (brand on the listing) | cat | records |
|---|---|---|
| Alliant Power | injector | 6 |
| BD Diesel | manifold | 6 |
| BorgWarner | turbo | 79 |
| Bosch | injectionPump | 15 |
| Bosch | injector | 33 |
| Denso | injectionPump | 1 |
| Denso | injector | 1 |
| Garrett | turbo | 69 |
| H&S Motorsports | manifold | 10 |
| Holset | turbo | 7 |
| Industrial Injection | injectionPump | 110 |
| Industrial Injection | injector | 202 |
| Industrial Injection | turbo | 170 |
| S&S Diesel | injectionPump | 1 |

| cat | records |
|---|---|
| injectionPump | 127 |
| injector | 242 |
| manifold | 16 |
| turbo | 325 |

Rows per engine family (a part that fits several families is one record per family with the same `p`):

| fit.fam | cat | records |
|---|---|---|
| Audi/VW *(not in cam-fitment.json)* | injector | 1 |
| Audi/VW *(not in cam-fitment.json)* | turbo | 8 |
| BMW *(not in cam-fitment.json)* | injector | 1 |
| BMW *(not in cam-fitment.json)* | turbo | 1 |
| Chevy Cruze *(not in cam-fitment.json)* | turbo | 1 |
| Cummins 4BT *(not in cam-fitment.json)* | injector | 1 |
| Cummins 5.9 12V | injectionPump | 13 |
| Cummins 5.9 12V | injector | 11 |
| Cummins 5.9 12V | manifold | 1 |
| Cummins 5.9 12V | turbo | 32 |
| Cummins 5.9 24V/CR | injectionPump | 22 |
| Cummins 5.9 24V/CR | injector | 49 |
| Cummins 5.9 24V/CR | manifold | 3 |
| Cummins 5.9 24V/CR | turbo | 89 |
| Cummins 6.7 | injectionPump | 25 |
| Cummins 6.7 | injector | 57 |
| Cummins 6.7 | manifold | 1 |
| Cummins 6.7 | turbo | 12 |
| Duramax 6.6 | injectionPump | 51 |
| Duramax 6.6 | injector | 78 |
| Duramax 6.6 | manifold | 1 |
| Duramax 6.6 | turbo | 28 |
| Ford 6.9/7.3 IDI *(not in cam-fitment.json)* | injectionPump | 6 |
| Ford EcoBoost *(not in cam-fitment.json)* | turbo | 20 |
| GM 2.8 Duramax *(not in cam-fitment.json)* | turbo | 2 |
| GM 6.2/6.5 diesel *(not in cam-fitment.json)* | injectionPump | 5 |
| GM 6.2/6.5 diesel *(not in cam-fitment.json)* | injector | 1 |
| Mercedes Sprinter *(not in cam-fitment.json)* | injector | 1 |
| Mercedes Sprinter *(not in cam-fitment.json)* | turbo | 1 |
| Polaris RZR *(not in cam-fitment.json)* | turbo | 1 |
| Porsche 911/944 *(not in cam-fitment.json)* | turbo | 16 |
| Powerstroke 6.0 | injector | 7 |
| Powerstroke 6.0 | turbo | 15 |
| Powerstroke 6.4 | injectionPump | 1 |
| Powerstroke 6.4 | injector | 2 |
| Powerstroke 6.4 | turbo | 5 |
| Powerstroke 6.7 | injectionPump | 4 |
| Powerstroke 6.7 | injector | 13 |
| Powerstroke 6.7 | manifold | 10 |
| Powerstroke 6.7 | turbo | 15 |
| Powerstroke 7.3 | injector | 19 |
| Powerstroke 7.3 | turbo | 9 |
| RAM 3.0 EcoDiesel *(not in cam-fitment.json)* | injector | 1 |
| Universal *(not in cam-fitment.json)* | turbo | 70 |

| emissions | records |
|---|---|
| `unknown` | 282 |
| `no_eo_race_only` | 280 |
| `oem_replacement` | 138 |
| `carb_eo:D-871-6` | 4 |
| `carb_eo:D-871-1` | 2 |
| `carb_eo:D-711-4` | 1 |
| `carb_eo:D-871-2` | 1 |
| `carb_eo:D-711-1` | 1 |
| `carb_eo:D-711-3` | 1 |

## How fields were derived

- **Scope**: the listing mixes Industrial Injection's own performance products with a bulk-imported distribution catalog (Bosch, Garrett, BorgWarner, Holset, Alliant Power, Denso, Delphi, Stanadyne, PAI, BD Diesel, H&S Motorsports, FASS...). Only `injector`, `injectionPump`, `turbo` and `manifold` are emitted; `m` is the brand named in the listing's vendor field (so a BD manifold or Bosch stock injector resold by Industrial Injection is filed under BD Diesel / Bosch), and `src.doc` says it came from industrialinjection.com.
- **Skipped by rule**: apparel/decals/gift cards/additives/tools; heavy-duty (tags `heavy duty`, `Cat Heavy Duty`, `Detroit Heavy Duty`, `Navistar Heavy Duty`, ISX/N14/X15/C15/3406E/DT466/Series 60, vendor `Industrial Injection HD`, product type `Heavy Duty Turbocharger`, and bulk-catalog items whose `Fits X applications` lead-in names Cat/Detroit/Navistar/Paccar/Volvo/Mack/Komatsu/Mercedes...); emissions-system parts (EGR valves/adapters) and anything titled 'delete'. Nozzles, lift pumps (FASS), injector lines/kits, turbo parts (actuators, CHRAs, super cores, install kits, piping), engine parts, pistons, heads and blocks are outside the task's four categories and are counted below.
- **Fitment** comes from the site's fitment tags (`cummins 2004.5 - 2007 5.9l`, `duramax 2006 - 2007 6.6l lly-lbz`, `power stroke 2011 - 2022 6.7L`...). Several tags on one product that resolve to the same family are merged into one record spanning min(y0)..max(y1) (`2019+` style tags leave `y1` unset); the Duramax engine codes (LB7/LLY/LBZ/LMM/LGH/LML/L5P) go to `fit.notes`. Half-year model breaks are floored (`2004.5` -> `y0: 2004`, `from 2004.5` in notes). Cummins 5.9 tags map to `Cummins 5.9 12V` when the range ends by 1998 and to `Cummins 5.9 24V/CR` from 1998.5. Products without a fitment tag fall back to the title (year range + engine words), and each such record is flagged below; a product with no fitment at all is skipped unless it is a universal performance turbo (BorgWarner S200/S300/S400/EFR, Garrett G-Series/G-XRace/GTX super cores), which is filed under `Universal`.
- **Injectors**: one record per variant. `pctOver` from the variant title (`25% Over`, `R3 40%`), `hpRating` from `100HP` / `50-60Hp` (upper bound; `hpRatingLow` keeps the lower one), `nozzleCc` from `120CC`/`145cc` (7.3/6.0 Power Stroke), `nozzleFlow` in LPM from the variant title or the per-stage 'Choosing the Right Injector' accordion in the body, which also gives `fuelRec` (the CP3 / fuel-system recommendation printed for that stage), `turboUpgrade` and `hpCapable`. `stage` is the II grade code (DFLY, R1..R6) from the SKU suffix. Stock/OEM listings get `pctOver: 0`. `condition` new/reman.
- **Injection pumps**: `type` CP3/CP4/VP44/P7100/VE/DB2/HPOP/HP4/DCR/K16 from the title; `pctOver` from the variant (`33% Over`, `Modified 42 CP3` -> 42, `Double Dragon 120` -> 120); `strokerMm` (10/12 mm stroker); `grade` Modified / Dragon Fire / Double Dragon / Hot Rod (from the variant or the SHO/DF/DD SKU suffix); `hpRating` for P7100/VP44 listings; `dual`, `kit` (dual-CP3 kits, CP3 conversion/retrofit kits with pump). HEUI high-pressure oil pumps (Power Stroke HPOP) are filed as `injectionPump` with `type: HPOP`.
- **Turbos**: `compressorInducer`/`turbineWheel` (mm) from `64mm/64mm`, `64.5MM/72MM`, kit variants `62/68`, BorgWarner `S464`/`S467.7`/`S364.5`, `Boxer 58`, and the body ('64mm Billet Blade Technology compressor wheel', '68mm turbine wheel', Garrett 'Compressor: Inducer: 73.9mm Exducer: 102mm Trim: 52 A/R: 0.85' -> also `compressorExducer`, `compressorTrim`, `compressorAr`, `turbineExducer`, `turbineTrim`); `ar` from `.91 A/R`, `1.00 Turbine`, `0.83 A/R V-Band Inlet`; `housingCm2` from '14 cm exhaust housing'; `vgt` true for HE300VG/HE351VE/AVNT/GT3788VA/B2BV/variable-geometry units, false for wastegated PhatShaft/S300/S400/HX35/HY35/TP38; `model` is the turbo frame (HE351VGT, GT3788VA, S300SX-E, K03...); `series` XR1/XR2/PhatShaft/Silver Bullet/Viper/Boxer/SX-E/PowerMax/G-Series; `kit`, `compound`, `polished` (variant), `side` L/R (twin-turbo gas applications), `hpCapable` ('supports up to 600 horsepower'), `hpLow`/`hpHigh` (Garrett 'HP : 750-1550'), `replacesOem` (the listing's OEM / cross reference part numbers, max 25), `replacesModel` ('Replaces the factory HE300VG').
- **Manifolds**: `type` intake/exhaust, `pieces`, `flange` (T3/T4), `side`, `material`, `finish` (H&S powder-coat variants), `mfrPn` (BD's own number when the SKU carries a prefix).
- **emissions**: `carb_eo:D-xxx-x` when the body prints a CARB EO number; else `oem_replacement` for stock/OEM/genuine/direct-replacement listings; else `no_eo_race_only` when the body carries Industrial Injection's 'Not Legal For On-Road... Dedicated Competition Use Only' disclaimer or 'CAN NOT SHIP TO CALIFORNIA'; else `unknown`. DPF/DOC/SCR/EGR delete parts: none found in the four categories (the only 'delete' item is a FASS fuel-filter delete kit, skipped).

## Skipped

- **heavy-duty (Cat / Detroit / Navistar / ISX / industrial)**: 436
  - R-5237045 Reman EUI Injector for Detroit Series 60 | R-5237045
  - PRKCAT-0016P Pump Solenoid for CAT and Perkins C6.6, 1100 Series, C4.2 and C6.4 | PRKCAT-0016P
  - PRKCAT-0005 Pump Solenoid for CAT and Perkins C6.6, 1100 Series, C4.2 and C6.4 | PRKCAT-0005
  - PAI-DDPS60102E-033 PAI Engine Kit for Detroit Series 60 | DDC23514673
  - PAI-DDP692071 PAI Injector Kit for Detroit | PAI-DDP692071
  - PAI-DDP631337 PAI Injector Seal for Detroit | PAI-DDP631337
  - PAI-DDP621242 PAI N3 Injector Kit for Detroit Series 60 | 23537111
  - PAI-CUPISX111-113 PAI Engine Kit for Cummins ISX | 4352362
  - ... 428 more
- **turbo parts / hardware**: 351
  - FT-40090 Cummins 0199X Turbocharger Oil Line Adapter | FT-40090
  - CU-3331924 Cummins Turbocharger Gasket | 3331924
  - 838946-5001S Garrett GT1749V Upgrade Turbocharger Service Unit | 838946-5001S
  - 712371-5109S Garrett GTA5518B Turbocharger CHRA | 712371-5109S
  - 5550398H Holset HE300VG Turbocharger Install Kit for 2007.5-2018 6.7L Cummins | 5550398H
  - 5266419H Holset HE300 Turbocharger Turbine Side Gasket | 5266419H
  - 5263924H Holset Turbocharger Gasket | 5263924H
  - 442821-0003R II Reman Turbocharger Compressor Housing for TV7512 | 442821-0003R
  - ... 343 more
- **other: untyped**: 266
  - PDM-4961 Cummins 4BT Fire Ring Head Gasket Kit 4.550
  - CU-3959031 Cummins Oil Cooler 03-07 5.9
  - PAI-CUP136126 PAI 89-18 5.9L/6.7L Cummins Rear Main Crank Seal w/ Speedy Sleeve
  - PAI-CUP136084 PAI 89-18 5.9L/6.7L Cummins Front Crank Seal w/ Speedy Sleeve
  - CU-4995602 Cummins Rocker Arm Assembly 98.5-18
  - HTSER45-275-300-BLK 45 DEGREE SILICONE ELBOW REDUCER 2.75"-3.00"
  - DE8TZ-9A555-C 6.9L/7.3L Ford Fuel Injection Line Cyl. #3
  - DE8TZ-9A555-D 6.9L/7.3L Ford Fuel Injection Line Cyl. #4 - Van/Bus/Cargo Only
  - ... 258 more
- **fuel-system hardware / pump parts / kits**: 112
  - PAI-CUP131793 PAI Pump Gasket for Cummins | 4898301
  - PAI-CUP131461 PAI VE Pump to Gear Housing Mounting Gasket for Cummins | 3931607
  - D3069103 Pump Mount Gasket | D3069103
  - AP0157 Alliant Power Fuel Injection Pump Installation Kit for 2011-2014 Ford 6.7L Power Stroke | AP0157
  - 9412038419 Bosch Pump Element | 9412038419
  - 512505-61 Delphi Pump Element | 512505-61
  - AP0071 ALLIANT POWER AP0071 2008-2010 FORD NEW FUEL INJECTION PUMP INSTALLATION KIT
  - AP54822 L5P Fuel Contamination Kit - 2020-23 Duramax L5P
  - ... 104 more
- **injector hardware / line / kit**: 76
  - PAI-CUP045006 PAI Injector Roller Pin for Cummins | 3013330
  - HTK117 Delphi Injector Seal Kit | HTK117
  - F00RJ02704 Bosch 520 Injector Solenoid for 6.6L Duramax LMM | F00RJ02704
  - DPE73120 7.3L Power Stroke Injector Return Line Kit | DPE73120
  - DE8HZ-9F596-A Injector O-Ring for 6.6L and 7.8L | DE8HZ-9F596-A
  - DC5NE9F596A Injector Dust Seal | DC5NE9F596A
  - D8-94125859-1 Injector Taper Washer | D8-94125859-1
  - D5-15315003-0 Injector Taper Washer | D5-15315003-0
  - ... 68 more
- **other: Engine Parts**: 66
  - MPE-844R Engine Freeze Plug Kit for 2001-2016 6.6L Duramax | MPE-844R
  - 97216175 GM Engine Oil Cooler Gasket | 97216175
  - 94399639 GM Engine Block Freeze Plug for 2001-2019 Duramax | 94399639
  - PAI-CUP131869 2007.5-2024 6.7L Cummins Lower Engine Gasket Set OEM: 4955355
  - CU-3900068 1989-2024 Cummins 5.9L / 6.7L Rear Block Alignment Dowel To Adapter Plate
  - CU-3931623 1989-1998 Dodge Cummins 12 Valve Tappet
  - CU-3947759 2003-2018 Dodge Cummins Common Rail Tappet
  - PDM-180-1484S-24 Industrial Injection 120LB Upgraded Valve Springs - 1998.5-2018 24V Cummins
  - ... 58 more
- **apparel / merch / consumables**: 63
  - 191283 Industrial Injection Deadwood Camo Hoodie
  - C45101 Industrial Injection Heavy-Duty Parts Catalog | Printed Edition
  - 191344 Gray/Black Snapback Leather Patch Logo Hat
  - 191277 Industrial Injection Duck Camo Hoodie
  - 191271 Industrial Injection All Star Hoodie
  - AP0069 Alliant Power AP0069 – High-Pressure Oil Rail Socket Ford 6.0L Power Stroke / VT365
  - 191265 Industrial Injection Heather Gray Hoodie
  - 191360 Industrial Injection Green Camo Tech Hat - Performance Fabric Trucker
  - ... 55 more
- **lift pump / fuel-system pump (not a task category)**: 46
  - PAI-CUP141297 PAI Lube Pump for Cummins 6C | 3930338
  - PAI-CUP131532 PAI Mechanical Fuel Transfer Lift Pump Gasket for 1989-1998 Dodge Cummins 12V | 3939258
  - MRY-CP6158 Murray Engine Water Pump for 1989-2018 Dodge Cummins 5.9L and 6.7L | CP6158
  - CU-3939258 Cummins Mechanical Fuel Transfer Lift Pump Gasket for 1989-1998 Dodge 12V | 3939258
  - 7139-541 Delphi Transfer Pump Liner | 7139-541
  - 15699 Stanadyne Transfer Pump Blade Spring | 15699
  - 152200-5320 Priming Pump | 152200-5320
  - 12725092 GM Water Pump Housing to Oil Cooler Pipe for 2001+ 6.6L Duramax | 12725092
  - ... 38 more
- **other: Short Block**: 41
  - PDM-59STKSB-3 Industrial Injection 5.9 Cummins Stock Short Block (2003-2004)
  - PDM-59STKSB-5 Industrial Injection 5.9 Cummins Stock Short Block (2004.5-2007)
  - PDM-67STKSB-E Industrial Injection 6.7 Cummins Stock Short Block (2007.5-2018)
  - PDM-67STKBB-E Industrial Injection 6.7 Cummins Stock Builder Box (2007.5-2018)
  - PDM-59STKBB-5 Industrial Injection 5.9 Cummins Stock Builder Box (2004.5-2007)
  - PDM-59STKBB-3 Industrial Injection 5.9 Cummins Stock Builder Box (2003-2004)
  - PDM-24VRBB Industrial Injection 5.9 Cummins Stage 2 Builder Box (1998.5-2002)
  - PDM-24VSTBB Industrial Injection 5.9 Cummins Stage 1 Builder Box (1998.5-2002)
  - ... 33 more
- **other: Long Block**: 35
  - PDM-LMLSTKLB-E Industrial Injection LML Duramax Stock Long Block Engine (2011-2015)
  - PDM-LMMSTKLB-E Industrial Injection LMM Duramax Stock Long Block Engine (2007.5-2010)
  - PDM-LBZSTKLB-E Industrial Injection LBZ Duramax Stock Long Block Engine (2006-2007)
  - PDM-LB7STKLB-E Industrial Injection LB7 Duramax Stock Long Block Engine (2001-2004)
  - PDM-LLYSTKLB-E Industrial Injection LLY Duramax Stock Long Block Engine (2004.5-2005)
  - PDM-59STKLB-3HS Industrial Injection 5.9 Cummins Stock Long Block Engine w/ ARP Head Studs (2003-2004)
  - PDM-59STKLB-5HS Industrial Injection 5.9L Cummins CR Stock Long Block w/ ARP Head Studs (2004.5-2007)
  - PDM-67STKLB-EHS Industrial Injection 6.7 Cummins Stock Long Block Engine W/ ARP Head Studs (2007.5-2018)
  - ... 27 more
- **other: Cylinder Head**: 31
  - PDM-LLYSHN Industrial Injection 2004.5-2005 LLY Duramax NEW Premium Stock Plus Cylinder Heads (RH & LH Set)
  - PDM-24VSTKH-FR Industrial Injection 5.9L Cummins Premium Stock Plus Cylinder Head with Fire Rings (1998.5-2002)
  - PDM-4BTRH Cummins 4BT Fire Ring & Ported Head
  - PDM-4BSTH Cummins 4BT Stage 1 Head
  - PDM-4BSTKH 3.9L 4BT Cummins Premium Stock Plus Head Loaded W/Valves
  - PDM-LMLRH Industrial Injection 2011-2016 LML Duramax Ported & Polished Cylinder Heads (RH & LH Set)
  - PDM-LMLSH Industrial Injection 2011-2016 LML Duramax Premium Stock Plus Cylinder Heads (RH & LH Set)
  - PDM-LBZ/LMMRH Industrial Injection 2006-2010 LBZ/LMM Duramax Ported & Polished Cylinder Heads (RH & LH Set)
  - ... 23 more
- **other: Pistons**: 17
  - 24T117 2007.5-2018 6.7L Cummins 24V QSB X-Series Piston Kit
  - 24S101 2019-2024 6.7L Cummins 24V ISB X-Series Piston Kit
  - 344106 2008-2010 6.4L Power Stroke X-Series Piston Kit
  - 347106 2004.5-2007 6.0L Power Stroke X-Series Piston Kit
  - 346106 2003-2004 6.0L Power Stroke X-Series Piston Kit
  - 345107 2011-2016 6.7L Power Stroke X-Series Piston Kit
  - 34I106 2017-2019 6.7L Power Stroke X-Series Piston Kit
  - 34H101 2020-2022 6.7L Power Stroke X-Series Piston Kit
  - ... 9 more
- **no fitment in tags, title or body**: 14
  - B03303A Delphi Injector | B03303A
  - 6760524 Delphi POD Injector | 6760524
  - 32262 Stanadyne New Pencil Injector | 32262
  - 26993 Stanadyne New Pencil Injector | 26993
  - 0R3586 Reman Fuel Injector | 0R3586
  - 0432191632 Bosch Fuel Injector | 0432191632
  - 0432133879 Bosch Fuel Injector | 0432133879
  - 0432133878 Bosch Fuel Injector | 0432133878
  - ... 6 more
- **pump kit without the pump / parts bag**: 13
  - 4G6105 2011-16 6.6L Duramax LML Bosch Disaster Kit With CP3 Conversion Kit Only. No CP3
  - 4G6103 2011-2016 6.6 Duramax LML Bosch Disaster Kit Without CP4
  - 438403 Industrial Injection 6.6L LBZ/LMM Duramax CP3 Bag of Parts
  - 438402 2006 - 2010 Duramax LBZ/LMM Dual Cp3 Kit (W/O Pump)
  - 433403 Industrial Injection 6.6L LLY Duramax CP3 Bag of Parts
  - 433402 2004 - 2005 Duramax LLY Dual Cp3 Kit (W/O Pump)
  - 432403 Industrial Injection 6.6L LB7 Duramax CP3 Bag of Parts
  - 432402 2001 - 2004 Duramax LB7 Dual Cp3 Kit (W/O Pump)
  - ... 5 more
- **other: fuel line**: 11
  - 217601 217601 Industrial Injection 2003-07 5.9L Cummins Common Rail Fuel Line Kit
  - 21T504 21T504 Industrial Injection 2007.5-2018 Cummins 6.7L Fuel Line #6
  - 21T503 21T503 Industrial Injection 2007.5-2018 Cummins 6.7L Fuel Line #4 & #5
  - 21T502 21T502 Industrial Injection 2007.5-2018 Cummins 6.7L Fuel Line #2 & #3
  - 21T501 21T501 Industrial Injection 2007.5-2018 Cummins 6.7L Fuel Line #1
  - 217507 217507 Industrial Injection 2003-07 5.9L Cummins Common Rail Fuel Line Cyl# 6
  - 217506 217506 Industrial Injection 2003-07 5.9L Cummins Common Rail Fuel Line Cyl# 5
  - 217505 217505 Industrial Injection 2003-07 5.9L Cummins Common Rail Fuel Line Cyl# 4
  - ... 3 more
- **manifold hardware / gasket / sensor**: 9
  - 248611 Industrial Injection Exhaust Manifold Bolt and Gasket Kit - 1998.5-2024 24V Cummins 5.9L-6.7L
  - 24G606 Industrial Injection Exhaust Manifold Bolt and Gasket Kit - 1989-1998 12V Cummins 5.9L
  - PAI-CUP131467 PAI CUP131467 Exhaust Manifold Gasket for Cummins 5.9L 12-Valve Engines
  - CU-5264566 Cummins 6.7L OEM Intake Manifold Gasket
  - MS19225 Cummins 24 Valve Exhaust Manifold to Cylinder Head Gaskets 98.5-2018
  - AP63543 6.7 PowerStroke Manifold Absolute Pressure (MAP) Sensor
  - AP63476 Manifold Absolute Pressure (MAP) Sensor
  - AP63463 Intake Manifold Air Temperature (IAT) Sensor
  - ... 1 more
- **other: Piston Ring Kit**: 6
  - 24Q101 1989-2007 5.9L Cummins X-Series Piston Ring Kit
  - 344112 2008-2010 6.4L Power Stroke X-Series Piston Ring Kit
  - 343101 2003-2007 6.0L Power Stroke X-Series Piston Ring Kit
  - 24T132 2007.5-2024 6.7L Cummins 24V ISB X-Series Piston Ring Kit
  - 345113 2011-2019 6.7L Power Stroke X-Series Piston Ring Kit
  - 44B113 2001-2024 6.6L Duramax LB7-L5P X-Series Piston Ring Kit
- **emissions-system part (EGR valve / adapter / gasket)**: 5
  - 795496-0001 Garrett 795496-0001 – EGR Adapter
  - AP63447 Exhaust Gas Recirculation (EGR) Cooler Intake Gasket Kit
  - AP0130 High-Pressure Fuel Pump/EGR Valve Installation Kit
  - AP0129 High-Pressure Fuel Pump/EGR Valve Installation Kit
  - AP0128 High-Pressure Fuel Pump/EGR Valve Installation Kit
- **other: Accessories**: 2
  - 1C1605 Industrial Injection Billet Brake Reservoir Cap – Black Anodized (1994–2024 RAM Cummins)
  - 2cc601 2013-2018 RAM 2500/3500 6.7L Cummins Aluminum Radiator Cover (Upper Seal Upgrade)
- **variant without SKU (phantom 'Default Title' variant)**: 2
  - Performance LBZ / LMM Duramax CP3 Injection Pump: Default Title
  - Industrial Injection Reman Performance 6.6 LMM Duramax Injectors: Default Title
- **other: Fuel Rail**: 2
  - F00R001505 LLY Duramax Fuel Rail- Left Hand
  - F00R001512 LLY Duramax Fuel Rail- Right Hand
- **other: Billet Accessories**: 2
  - 4CD602 Industrial Injection Billet Hood Drain Ring - Black | 2017-2019 Duramax L5P | 4CD602
  - 4CD601 Industrial Injection Billet Hood Drain Ring - Clear Anodized | 2017-2019 Duramax L5P | 4CD601
- **injector nozzle (no category)**: 1
  - 0433175510 Bosch Injector Nozzle for 0986435597 Injector | 0433175510
- **delete part (skipped by rule)**: 1
  - FAS-DFD4000 FASS Fuel Systems Duramax Factory Fuel Filter Delete Kit 2001-2016
- **other: Cooling System Parts**: 1
  - 2GT101 2007.5-18 6.7 Cummins Coolant Leak Test Kit
- **other: Injector Nozzle**: 1
  - 0433171860DFLY Industrial Injection Performance 6.6L LLY Duramax Extrude Honed Nozzles
- **other: Injector Sealing Washer**: 1
  - F00RJ01086 2004.5-2010 Duramax Copper Washer

## Duplicate SKUs merged (same brand + part number + family; first occurrence kept)

- H&S Motorsports 122018-15 [Powerstroke 6.7]: kept 'intake manifold, raw, 2011-2022, Powerstroke 6.7' / dropped 'intake manifold, custom powder, 2011-2022, Powerstroke 6.7'
- H&S Motorsports 122018 [Powerstroke 6.7]: kept 'intake manifold, raw, 2011-2022, Powerstroke 6.7' / dropped 'intake manifold, custom powder, 2011-2022, Powerstroke 6.7'
- Industrial Injection 227436 [Cummins 5.9 24V/CR]: kept 'SX-E S300 turbo kit, 62 mm compressor, 74 mm turbine, 1.00 A/R, 2003-2007, Cummins 5.9 24V/CR' / dropped 'SX-E S300 turbo kit, 64 mm compressor, 68 mm turbine, 1.00 A/R, 2003-2007, Cummins 5.9 24V/CR'

## Needs human QA

Families not in `cam-fitment.json` (catalog heading kept in `fit.fam`):

- `Audi/VW`: 9 record(s)
- `BMW`: 2 record(s)
- `Chevy Cruze`: 1 record(s)
- `Cummins 4BT`: 1 record(s)
- `Ford 6.9/7.3 IDI`: 6 record(s)
- `Ford EcoBoost`: 20 record(s)
- `GM 2.8 Duramax`: 2 record(s)
- `GM 6.2/6.5 diesel`: 6 record(s)
- `Mercedes Sprinter`: 2 record(s)
- `Polaris RZR`: 1 record(s)
- `Porsche 911/944`: 16 record(s)
- `RAM 3.0 EcoDiesel`: 1 record(s)
- `Universal`: 70 record(s)

Judgement calls:

- The www host answers `/products.json` directly but 301s `/robots.txt` to the bare host; see Fetch above.
- `m` is the listing's vendor, so resold Bosch/Garrett/BorgWarner/Holset/BD/H&S parts are filed under those brands with `src.doc` = industrialinjection.com. Industrial Injection's own SKUs for Bosch-based reman injectors/pumps (`0986435505SE-R1`, `-IIS` suffixes) stay under the vendor the site names for that listing (some stock Bosch reman listings carry vendor `Bosch`, their II-reman twins vendor `Industrial Injection`).
- Injector `hpRating` is the gain the site quotes for that stage ('100HP 20% Over'), not engine output. 7.3L Power Stroke stages quote `120CC/15% 50-60Hp`: `nozzleCc` 120, `pctOver` 15, `hpRating` 60, `hpRatingLow` 50.
- Injection-pump `pctOver` for `Modified 42 CP3` / `Dragon Fire 85` / `Double Dragon 120` variants is taken from the bare number (the site writes `42% Over` on sibling listings).
- `Cummins 5.9 12V` vs `24V/CR` for products that only say '5.9 Cummins' is decided by the year range (ends <= 1998 -> 12V; starts >= 1998.5 -> 24V/CR; spans 1998 -> one record per family).
- Turbo `compressorInducer` for XR units is the billet wheel size the title quotes (e.g. `64.5mm BBT`); for PhatShaft variants it is the variant's `62mm/64mm/66mm/69mm` option; `turbineWheel` comes from the body.
- The S300 SX-E single turbo kit lists SKU 227436 for two different variants (62/74 1.0 A/R and 64/68 1.0 A/R) on the site; the first is kept and the duplicate is listed above. Verify with Industrial Injection.
- Universal BorgWarner S200/S300/S400/EFR and Garrett G-Series/G-XRace/GTX turbos have no vehicle fitment on the site and are filed under `fit.fam: "Universal"`.
- Turbo 'kits' (PhatShaft/S300/S400/Boxer swap kits, compound kits) are `turbo` records with `spec.kit: true`; the compressor/turbine sizes are those of the kit's turbo. Install-only kits (no turbo) are skipped.

- 91 stock-replacement turbo record(s) carry no wheel sizes (the listing gives only the OEM/Garrett/Holset/BorgWarner part number); they are not listed individually below.

Per-record flags:

- BorgWarner RL3E6K682BBN: fitment from title (no fitment tag): BorgWarner Right Side Turbocharger for 2021-2024 Ford F-150 3.5L EcoBoost | RL3E6K682BBN -> ['Ford EcoBoost']
- BorgWarner ML3E6C879BCN: fitment from title (no fitment tag): BorgWarner Left Side Turbocharger for 2021-2024 Ford F-150 3.5L EcoBoost | ML3E6C879BCN -> ['Ford EcoBoost']
- Industrial Injection DANVILLE 68MMR: SKU looks like an internal placeholder: II Reman GT3788 XR Series 68mm Turbocharger for 2011-2016 LML Duramax | DANVILLE 68MMR
- Industrial Injection DANVILLE 68MMR: fitment from title (no fitment tag): II Reman GT3788 XR Series 68mm Turbocharger for 2011-2016 LML Duramax | DANVILLE 68MMR -> ['Duramax 6.6']
- BorgWarner BW-54399880084: fitment from title (no fitment tag): BorgWarner BV39 Turbocharger for 1.9L TDI Euro 4 Industrial | 54399880084 -> ['Audi/VW']
- Alliant Power AP63903AD: fitment from title (no fitment tag): Alliant Power Reman HEUI Injector for 1999.5-2002 Ford 7.3L Power Stroke | AP63903AD -> ['Powerstroke 7.3']
- Alliant Power AP63901AB: fitment from title (no fitment tag): Alliant Power Reman HEUI Injector for Ford 7.3L and T444 | AP63901AB -> ['Powerstroke 7.3']
- Garrett 917056-5002S: performance turbo without compressor wheel size in title/variant/body: Garrett PowerMax GT2260S Turbocharger for 2022+ VW and Audi 2.0L EA888 EVO4 | 917056-5002S
- Garrett 917056-5002S: fitment from title (no fitment tag): Garrett PowerMax GT2260S Turbocharger for 2022+ VW and Audi 2.0L EA888 EVO4 | 917056-5002S -> ['Audi/VW']
- Industrial Injection 8973077111CSE: fitment from title (no fitment tag): II Shop Exchange RHG6 Turbocharger for 2001-2004 LB7 Duramax | 8973077111CSE -> ['Duramax 6.6']
- Industrial Injection 3022792SE: fitment from title (no fitment tag): II Shop Exchange K03 PRO Turbocharger for 2016-2021 Polaris RZR | 3022792SE -> ['Polaris RZR']
- Industrial Injection 23U303: fitment from title (no fitment tag): Industrial Injection Reman 10mm Stroker CP3 Injection Pump for 2021-2024 6.7L Cummins | 23U303 -> ['Cummins 6.7']
- Industrial Injection 1037769-SRV: fitment from title (no fitment tag): 100% Over Injectors for 6.4L Power Stroke | 1037769-SRV -> ['Powerstroke 6.4']
- Bosch 0986435432-IIS: fitment from title (no fitment tag): Bosch Common Rail Injector for 2013-2016 VW and Audi | 0986435432 -> ['Audi/VW']
- Bosch 0986435359-IIS: fitment from title (no fitment tag): Bosch Common Rail Injector CR3-16 for 2003-2013 BMW 306D 3.0L | 0986435359 -> ['BMW']
- Bosch 0445116059: fitment from title (no fitment tag): Bosch New Common Rail Injector for RAM 3.0L EcoDiesel | 0445116059 -> ['RAM 3.0 EcoDiesel']
- Bosch 0445010874-IIS: fitment from title (no fitment tag): Bosch High Pressure CP4 Fuel Pump for 2019-2020 RAM 6.7L Cummins | 0445010874 -> ['Cummins 6.7']
- Industrial Injection 0432193635SE-IIS: fitment from title (no fitment tag): II Reman 40HP Injector for 1998.5-2002 5.9L Cummins 24V | 0432193635SE -> ['Cummins 5.9 24V/CR']
- BorgWarner BW-53039881469: performance turbo without compressor wheel size in title/variant/body: 3.5L Ecoboost K0CG PERFORMANCE Turbo F-150 13-16 Exp/Nav 15-17 LS
- BorgWarner BW-53039881469: fitment from title (no fitment tag): 3.5L Ecoboost K0CG PERFORMANCE Turbo F-150 13-16 Exp/Nav 15-17 LS -> ['Ford EcoBoost']
- BorgWarner BW-53039881470: performance turbo without compressor wheel size in title/variant/body: 3.5L Ecoboost K0CG PERFORMANCE Turbo F-150 13-16 Exp/Nav RS
- BorgWarner BW-53039881470: fitment from title (no fitment tag): 3.5L Ecoboost K0CG PERFORMANCE Turbo F-150 13-16 Exp/Nav RS -> ['Ford EcoBoost']
- Industrial Injection 227456: performance turbo without compressor wheel size in title/variant/body: 5.9 Cummins Quick Spool Compound Turbo Kit (2003-2007)
- BorgWarner BW-53039880015: fitment from title (no fitment tag): K03 Turbocharger VW 1.9 TDI -> ['Audi/VW']
- Garrett 934124-5003S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G35-1150 Turbochargers
- Garrett 934124-5004S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G35-1150 Turbochargers
- Garrett 934124-5001S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G35-990 Turbochargers
- Garrett 934124-5002S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G35-990 Turbochargers
- Garrett 934118-5005S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G30-965 Turbochargers
- Garrett 934118-5006S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G30-965 Turbochargers
- Garrett 934118-5003S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G30-825 Turbochargers
- Garrett 934118-5004S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G30-825 Turbochargers
- Garrett 934118-5001S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G30-725 Turbochargers
- Garrett 934118-5002S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G30-725 Turbochargers
- Garrett 934076-5004S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-700 Turbochargers
- Garrett 934076-5005S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-700 Turbochargers
- Garrett 934076-5006S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-700 Turbochargers
- Garrett 934115-5003S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-700 Turbochargers
- Garrett 934115-5004S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-700 Turbochargers
- Garrett 934076-5001S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-585 Turbochargers
- Garrett 934076-5002S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-585 Turbochargers
- Garrett 934076-5003S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-585 Turbochargers
- Garrett 934115-5001S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-585 Turbochargers
- Garrett 934115-5002S: performance turbo without compressor wheel size in title/variant/body: Garrett G-Series II G25-585 Turbochargers
- Garrett 914155-5001: fitment from title (no fitment tag): Garrett Stock Replacement Turbo Duramax 2.8L 19-22 Colorado/ Canyon -> ['GM 2.8 Duramax']
- BorgWarner BW-53049980334: fitment from title (no fitment tag): 2017-2019 Porsche 911.2 Turbo S 3.8 Turbocharger (Right) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980333: fitment from title (no fitment tag): 2017-2019 Porsche 911.2 Turbo S 3.8 Turbocharger (Left) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980336: fitment from title (no fitment tag): 2014-2019 Porsche 911 3.8 Turbocharger (Right) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980335: fitment from title (no fitment tag): 2014-2019 Porsche 911 3.8 Turbocharger (Left) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980342: fitment from title (no fitment tag): 2010-2013 Porsche 911 3.8 Turbocharger (Right) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980341: fitment from title (no fitment tag): 2010-2013 Porsche 911 3.8 Turbocharger (Left) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980340: fitment from title (no fitment tag): 2008-2011 Porsche 911 3.6 Turbocharger (Right) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980339: fitment from title (no fitment tag): 2008-2011 Porsche 911 3.6 Turbocharger (Left) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980338: fitment from title (no fitment tag): 2007-2009 Porsche 911 3.6 Turbocharger (Right) | BorgWarner -> ['Porsche 911/944']
- BorgWarner BW-53049980337: fitment from title (no fitment tag): 2007-2009 Porsche 911 3.6 Turbocharger (Left) | BorgWarner -> ['Porsche 911/944']
- Garrett 857260-5001S: fitment from title (no fitment tag): Garrett Direct Replacement 2.0L EcoBoost Ford 2013-2018 -> ['Ford EcoBoost']
- Garrett 886195-5001S: fitment from title (no fitment tag): Garrett Powermax Performance Turbocharger 2013-2018 2.0L EcoBoost -> ['Ford EcoBoost']
- Industrial Injection 54399880089-XR: performance turbo without compressor wheel size in title/variant/body: KP39 XR SERIES R2S UPGRADED TURBO BMW 335D 54399880089-XR
- Industrial Injection 54399880089-XR: fitment from title (no fitment tag): KP39 XR SERIES R2S UPGRADED TURBO BMW 335D 54399880089-XR -> ['BMW']
- Garrett 921474-5001S: performance turbo without compressor wheel size in title/variant/body: GT2563S POWERMAX Turbocharger AUDI/VW GOLF R 2.0L
- Garrett 921474-5001S: fitment from title (no fitment tag): GT2563S POWERMAX Turbocharger AUDI/VW GOLF R 2.0L -> ['Audi/VW']
- Industrial Injection 227457: performance turbo without compressor wheel size in title/variant/body: Cummins 3rd Gen 5.9L Compound Stock Add-A-Turbo Updated Kit (2003-2007)
- Industrial Injection 479514SE: performance turbo without compressor wheel size in title/variant/body: Industrial Injection 2008-2010 6.4 PowerStroke Reman Stock Replacement Compound Turbos
- Garrett 886976-5004S: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Turbo Upgrade for Duramax LML Engine
- Garrett 901654-5001W: fitment from title (no fitment tag): Garrett Powermax Performance Turbocharger 2017+ Ford F-150 3.5L Ecoboost & RAPTOR (Left) -> ['Ford EcoBoost']
- Garrett 901655-5001W: fitment from title (no fitment tag): Garrett Powermax Performance Turbocharger 2017+ Ford F-150 3.5L Ecoboost & RAPTOR (Right) -> ['Ford EcoBoost']
- Garrett 901994-5001S: fitment from title (no fitment tag): 2014+ 2.8L Chevy Colorado New Stock Replacement Turbocharger -> ['GM 2.8 Duramax']
- Industrial Injection 3622307111: fitment from title (no fitment tag): 5.9 Cummins Super PhatShaft Turbo (1994-2002) -> ['Cummins 5.9 12V', 'Cummins 5.9 24V/CR']
- Industrial Injection 3642307111: fitment from title (no fitment tag): 5.9 Cummins Super PhatShaft Turbo (1994-2002) -> ['Cummins 5.9 12V', 'Cummins 5.9 24V/CR']
- Industrial Injection 3662307111: fitment from title (no fitment tag): 5.9 Cummins Super PhatShaft Turbo (1994-2002) -> ['Cummins 5.9 12V', 'Cummins 5.9 24V/CR']
- Garrett 761154-5007S: fitment from title (no fitment tag): 2007-2011 3.0L MERCEDES-BENZ SPRINTER New Stock Replacement Turbocharger -> ['Mercedes Sprinter']
- Industrial Injection 227456K: performance turbo without compressor wheel size in title/variant/body: 5.9 Cummins Compound Turbo Kit - Kit Only (2003-2007)
- Industrial Injection 743250-0024-XR: performance turbo without compressor wheel size in title/variant/body: 2004.5-2007 6.0L Power Stroke XR Turbo
- Garrett 855563-5002S: fitment from title (no fitment tag): Garrett Direct Service Replacement 3.5L Ecoboost Turbocharger 2013-2016 (Right) -> ['Ford EcoBoost']
- Garrett 855563-5001S: fitment from title (no fitment tag): Garrett Direct Replacement 3.5L Ecoboost Turbo 2011-2012 F-150 (Right) -> ['Ford EcoBoost']
- Garrett 855562-5001S: fitment from title (no fitment tag): Garrett Direct Replacement 3.5L Ecoboost Turbo 2011-2012 F-150 (Left) -> ['Ford EcoBoost']
- Garrett 881028-5001S: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Performance Turbocharger 2011-2012 Ford F-150 3.5L Ecoboost (Right)
- Garrett 881028-5001S: fitment from title (no fitment tag): Garrett Powermax Performance Turbocharger 2011-2012 Ford F-150 3.5L Ecoboost (Right) -> ['Ford EcoBoost']
- Garrett 881027-5001S: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Performance Turbocharger 2011-2012 Ford F-150 3.5L Ecoboost (Left)
- Garrett 881027-5001S: fitment from title (no fitment tag): Garrett Powermax Performance Turbocharger 2011-2012 Ford F-150 3.5L Ecoboost (Left) -> ['Ford EcoBoost']
- Garrett 855562-5002S: fitment from title (no fitment tag): Garrett Direct Service Replacement 3.5L Ecoboost Turbocharger 2013-2016 (Left) -> ['Ford EcoBoost']
- Garrett 881028-5002S: fitment from title (no fitment tag): Garrett Powermax Performance Turbocharger 3.5L Ecoboost 2013-2016 (Right) -> ['Ford EcoBoost']
- Garrett 881027-5002S: fitment from title (no fitment tag): Garrett Powermax Performance Turbocharger 3.5L Ecoboost 2013-2016 (Left) -> ['Ford EcoBoost']
- BorgWarner BW-53039901005: fitment from title (no fitment tag): 2011-2012 Ford F-150 3.5L Ecoboost Borgwarner Replacement Turbocharger (Right) -> ['Ford EcoBoost']
- BorgWarner BW-53039901004: fitment from title (no fitment tag): 2011-2012 Ford F-150 3.5L Ecoboost Borgwarner Replacement Turbocharger (Left) -> ['Ford EcoBoost']
- BorgWarner BW-53039900470: fitment from title (no fitment tag): 3.5L Ecoboost Borgwarner Replacement Turbocharger 13-16 (Right) -> ['Ford EcoBoost']
- BorgWarner BW-53039900469: fitment from title (no fitment tag): 3.5L Ecoboost Borgwarner Replacement Turbocharger 13-16 (Left) -> ['Ford EcoBoost']
- Industrial Injection 0986435508SE-IIS: fitment from title (no fitment tag): Industrial Injection Re-manufactured 4B Common Rail Fuel Injector -> ['Cummins 4BT']
- Industrial Injection 0986435109-IIS: fitment from title (no fitment tag): 2004-06 Sprinter 2.7L CDI Engine Bosch Reman Injector -> ['Mercedes Sprinter']
- Garrett 781504-5013S: fitment from title (no fitment tag): Garrett Turbocharger for Chevrolet Cruze 2011-2018 -> ['Chevy Cruze']
- Industrial Injection 520COBRA0275: performance injector without a % over figure: 6.6L Duramax Competition Injector. (Call for Max Output) / Default Title
- Industrial Injection 521COBRA5175: performance injector without a % over figure: 6.6L Duramax Competition Injector (Call for Max Output) / Default Title
- Industrial Injection 504COBRA5175: performance injector without a % over figure: LLY 6.6L Duramax Competition Injector (Call for Max Output) / Default Title
- Industrial Injection 502KINGCOBRA0308: performance injector without a % over figure: 6.6L Duramax Competition Injector (Call for Max Output) / Default Title
- Garrett 739619-5004S: compressor wheel 88 mm quoted on a pickup turbo; probably the exducer/major diameter: Garrett Power Max Ball-Bearing Turbo Kit GTP38R Powerstroke 7.3
- Industrial Injection BW-479514: performance turbo without compressor wheel size in title/variant/body: 2008-2010 6.4 PowerStroke Factory Reman Stock Replacement Compound Turbos
- Industrial Injection 229402: performance turbo without compressor wheel size in title/variant/body: Cummins Quick Spool Compound Turbo Kit (1994-2002)
- Industrial Injection 229401: performance turbo without compressor wheel size in title/variant/body: Cummins PhatShaft Add-A-Turbo Kit (1994-2002)
- Industrial Injection 518KINGCOBRA0308: performance injector without a % over figure: 2007.5-2018 6.7 Cummins King Cobra Competition Injector / Default Title
- Industrial Injection 505KINGCOBRA0308: performance injector without a % over figure: 2004.5-2007 5.9 Cummins King Cobra Competition Injector (Call for Max Output) / Default Title
- Industrial Injection 503KINGCOBRA0308: performance injector without a % over figure: 2003-2004 5.9 Cummins King Cobra Competition Injector (Call for Max Output) / Default Title
- Bosch 0432193635-IIS: performance injector without a % over figure: 98.5-02 5.9 Cummins Injector | New 40 HP RV275 (VCO) / Default Title
- Industrial Injection 0432193635-R1: performance injector without a % over figure: New 1998.5-2002 5.9 Cummins 24v Performance Injectors / R1 - 85 HP
- Industrial Injection 0432193635-R2: performance injector without a % over figure: New 1998.5-2002 5.9 Cummins 24v Performance Injectors / R2 - 120 HP
- Industrial Injection 0432193635-R3: performance injector without a % over figure: New 1998.5-2002 5.9 Cummins 24v Performance Injectors / R3 - 150 HP
- Industrial Injection 0432193635-R4: performance injector without a % over figure: New 1998.5-2002 5.9 Cummins 24v Performance Injectors / R4 - 250 HP
- Industrial Injection 0432193635-R5: performance injector without a % over figure: New 1998.5-2002 5.9 Cummins 24v Performance Injectors / R5- 300 HP
- Industrial Injection 0432193635-R6: performance injector without a % over figure: New 1998.5-2002 5.9 Cummins 24v Performance Injectors / R6- 350 HP
- Industrial Injection 0432193635-2: performance injector without a % over figure: 98.5-02 5.9 Cummins Injector | New 75 HP (VCO) / Default Title
- Industrial Injection 0432131715-R1: performance injector without a % over figure: New Bosch 94-98 5.9 Cummins Injector | Performance R1 100hp / Default Title
- Industrial Injection 131602: fitment from title (no fitment tag): Cummins Dual CP3 Machined Wheel -> ['Cummins 5.9 24V/CR']
- BorgWarner BW-177282: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300 Turbo 177282
- BorgWarner BW-13009097051: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300SX-E Turbo - 13009097051
- BorgWarner BW-13009097053: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300SX-E Turbo - 13009097053
- BorgWarner BW-53279887200: fitment from title (no fitment tag): BorgWarner Porsche 911 Turbo Replacement 53279887200 K27 -> ['Porsche 911/944']
- BorgWarner BW-53049980302: fitment from title (no fitment tag): BorgWarner BV50 Porsche 911 Replacement Turbo -> ['Porsche 911/944']
- BorgWarner BW-53049880064: performance turbo without compressor wheel size in title/variant/body: BorgWarner 53049880064 Audi S3/TTS Upgrade Turbo K04
- BorgWarner BW-53049880064: fitment from title (no fitment tag): BorgWarner 53049880064 Audi S3/TTS Upgrade Turbo K04 -> ['Audi/VW']
- BorgWarner BW-53049980301: fitment from title (no fitment tag): BorgWarner BV50 Porsche 911 Replacement Turbo (Left Side) -> ['Porsche 911/944']
- BorgWarner BW-53049980304: performance turbo without compressor wheel size in title/variant/body: BorgWarner BV50 Porsche 911 Upgrade Turbo (Right Side)
- BorgWarner BW-53049980304: fitment from title (no fitment tag): BorgWarner BV50 Porsche 911 Upgrade Turbo (Right Side) -> ['Porsche 911/944']
- BorgWarner BW-53049980303: performance turbo without compressor wheel size in title/variant/body: BorgWarner BV50 Porsche 911 Upgrade Turbo (Left Side)
- BorgWarner BW-53049980303: fitment from title (no fitment tag): BorgWarner BV50 Porsche 911 Upgrade Turbo (Left Side) -> ['Porsche 911/944']
- BorgWarner BW-53269887042: fitment from title (no fitment tag): BorgWarner Porsche 944 Turbo Replacement 53269887042 K26 -> ['Porsche 911/944']
- BorgWarner BW-177274: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300 Turbo 177274
- BorgWarner BW-177276: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300 Turbo 177276
- BorgWarner BW-177277: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300 Turbo 177277
- BorgWarner BW-177279: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300 Turbo 177279
- BorgWarner BW-177278: performance turbo without compressor wheel size in title/variant/body: BorgWarner S300 Turbo 177278
- BorgWarner BW-177285: performance turbo without compressor wheel size in title/variant/body: BorgWarner S400 Turbo 177285
- BorgWarner BW-177286: performance turbo without compressor wheel size in title/variant/body: BorgWarner S400 Turbo 177286
- BorgWarner BW-53039880105: fitment from title (no fitment tag): BorgWarner Audi/VW 2.0 TFSI K03 Turbo -> ['Audi/VW']
- BorgWarner BW-53049880026: performance turbo without compressor wheel size in title/variant/body: BorgWarner 53049880026 Audi RS4 Upgrade Turbo K04
- BorgWarner BW-53049880026: fitment from title (no fitment tag): BorgWarner 53049880026 Audi RS4 Upgrade Turbo K04 -> ['Audi/VW']
- BorgWarner BW-177288: performance turbo without compressor wheel size in title/variant/body: BorgWarner S400 Turbo 177288
- BorgWarner BW-53049880025: performance turbo without compressor wheel size in title/variant/body: BorgWarner 53049880025 Audi RS4 Upgrade Turbo K04
- BorgWarner BW-53049880025: fitment from title (no fitment tag): BorgWarner 53049880025 Audi RS4 Upgrade Turbo K04 -> ['Audi/VW']

## Validation

Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src emissions`, numeric fields are numbers, years are integers, no empty strings.
