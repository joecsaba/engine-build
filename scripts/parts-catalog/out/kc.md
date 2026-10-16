# KC extraction notes (KC Turbos)

Extracted 2026-10-16 by `extract_kc.py`. Source: public Shopify `https://kcturbos.com/products.json?limit=250&page=N`.

## Fetch

- robots.txt: robots.txt fetched and parsed; /products.json is not disallowed (standard Shopify disallow list); robots Crawl-delay none, requests spaced 10 s.
- `kcturbos.com`: 7 page request(s) of 250 products, 1692 products in the listing; one request at a time. Pages cached under `dl/kc/`.
- Prices (USD) are not stored.

## Records

Total records: **1152** (one record per variant SKU per engine family)

| m (brand on the listing) | cat | records |
|---|---|---|
| BD Diesel | manifold | 2 |
| BorgWarner | turbo | 30 |
| Dorman | manifold | 3 |
| Exergy | injectionPump | 1 |
| Ford | injectionPump | 1 |
| Ford | turbo | 6 |
| Full Force Diesel | injector | 76 |
| Full Force Diesel | manifold | 2 |
| Garrett | turbo | 21 |
| H&S Motorsports | injectionPump | 1 |
| H&S Motorsports | manifold | 4 |
| KC Turbos | injectionPump | 2 |
| KC Turbos | manifold | 3 |
| KC Turbos | turbo | 684 |
| Nostrum | injectionPump | 1 |
| Nostrum | injector | 3 |
| ODawgs Diesel | manifold | 17 |
| PPE | manifold | 3 |
| Pure Power Technologies | injector | 1 |
| Pusher | manifold | 16 |
| River City Diesel | injectionPump | 5 |
| Rotomaster | turbo | 2 |
| S&S Diesel Motorsport | injectionPump | 14 |
| S&S Diesel Motorsport | injector | 216 |
| Turn14 | manifold | 3 |
| WDI | injector | 21 |
| XDP | injectionPump | 9 |
| Xtreme-DI | injectionPump | 5 |

| cat | records |
|---|---|
| injectionPump | 39 |
| injector | 317 |
| manifold | 53 |
| turbo | 743 |

Rows per engine family (a part that fits several families is one record per family with the same `p`):

| fit.fam | cat | records |
|---|---|---|
| Cummins 5.9 12V | injectionPump | 1 |
| Cummins 5.9 24V/CR | injectionPump | 3 |
| Cummins 5.9 24V/CR | injector | 56 |
| Cummins 6.7 | injectionPump | 1 |
| Cummins 6.7 | injector | 20 |
| Cummins 6.7 | turbo | 23 |
| Duramax 6.6 | injectionPump | 16 |
| Duramax 6.6 | injector | 127 |
| Duramax 6.6 | manifold | 3 |
| Duramax 6.6 | turbo | 14 |
| Ford EcoBoost *(not in cam-fitment.json)* | injectionPump | 6 |
| Ford EcoBoost *(not in cam-fitment.json)* | injector | 3 |
| Ford EcoBoost *(not in cam-fitment.json)* | manifold | 3 |
| Ford EcoBoost *(not in cam-fitment.json)* | turbo | 9 |
| Powerstroke 6.0 | injectionPump | 2 |
| Powerstroke 6.0 | injector | 21 |
| Powerstroke 6.0 | manifold | 3 |
| Powerstroke 6.0 | turbo | 195 |
| Powerstroke 6.4 | injector | 1 |
| Powerstroke 6.4 | manifold | 10 |
| Powerstroke 6.4 | turbo | 23 |
| Powerstroke 6.7 | injectionPump | 10 |
| Powerstroke 6.7 | injector | 13 |
| Powerstroke 6.7 | manifold | 29 |
| Powerstroke 6.7 | turbo | 55 |
| Powerstroke 7.3 | injector | 76 |
| Powerstroke 7.3 | manifold | 5 |
| Powerstroke 7.3 | turbo | 394 |
| Universal *(not in cam-fitment.json)* | turbo | 30 |

| emissions | records |
|---|---|
| `no_eo_race_only` | 876 |
| `unknown` | 185 |
| `oem_replacement` | 41 |
| `carb_eo:D-756-2` | 30 |
| `carb_eo:D-879` | 16 |
| `carb_eo:D-756-4` | 1 |
| `carb_eo:D-553-17` | 1 |
| `carb_eo:D-756-7` | 1 |
| `carb_eo:D-830-1` | 1 |

## How fields were derived

- **Scope**: the listing mixes KC Turbos' own turbos and manifolds with resold parts (XDP, Garrett, BorgWarner, Ford/Motorcraft, Holset, Full Force, WDI, ODawgs, H&S, Pusher, PPE, Dorman, River City Diesel, Exergy, Xtreme-DI, Nostrum, CNC Fabrication...). Only `turbo`, `manifold`, `injector` and `injectionPump` are emitted; `m` is the brand named on the listing (the vendor field, or the leading brand in the title when the vendor is a distributor such as XDP / Turn14 / Diesel Forward), and `src.doc` says it came from kcturbos.com.
- **Skipped by rule**: apparel/decals/lighting/additives/accessories; core-charge and core-return listings; garage-sale one-offs (used / open-box / discontinued units that duplicate a regular SKU with a `-GARnnnn` suffix); listings tagged `hidden` or titled `X-(Back End)...` (package components and back-end SKUs not shown on the storefront); DIY turbo kits, balanced assemblies and rebuild kits (turbo parts, not complete turbos); turbo hardware (install kits, housings, wheels, boots, clamps, gaskets); manifold sensors/gaskets/spacers and intake plenums; injector cups/sleeves; lift pumps (AirDog/FASS) and fuel-system kits; EGR parts; everything else outside the four categories is counted below by product type.
- **Fitment** comes from the title tail (`- 6.0 Powerstroke (2003-2007)`, `- 7.3 Powerstroke OBS (1994-1998)`, `(E99)`, `(L99-03)`, `- 6.6 Duramax (2004.5-2010)`, `- 6.7 Cummins (2007.5-2012)`, `- 3.5 EcoBoost (2013-2016)`), refined per variant by the Year/Style option (`2003 (10 blade)`, `2004+`, `2004.5-2006 - LLY`, `11-14`, `2017-19 - Cab N Chassis`); a `2004+` variant inside a 2003-2007 product gets 2004-2007. 7.3 Powerstroke sub-ranges go to `fit.notes` (`OBS` 1994-1997/98, `early 1999`, `late 1999 on`). Half-year breaks are floored (`2004.5` -> `y0: 2004`, `from 2004.5` in notes). Duramax engine codes (LLY/LBZ/LMM/LML) go to `fit.notes` and set the years when the title gives none. Cummins with no displacement map to 5.9 12V / 24V/CR by year (ends <= 1998 -> 12V; starts >= 1998.5 -> 24V/CR; spans 1998 -> one record per family). BorgWarner S300 SX-E supercores titled `Powerstroke, Cummins, Duramax` are filed under `Universal`; EcoBoost under `Ford EcoBoost` with the displacement in notes (both flagged below as not in cam-fitment.json).
- **Turbos**: `compressorInducer`/`turbineWheel` (mm) from the title `(66/73)` / `S362-SXE (62/68 Supercore)` / `PHATSHAFT 62`, else the body ('66mm 7x7 SXE style compressor wheel', 'Upgraded Billet 63.5mm Compressor Wheel', '61x88 single plane ... billet wheel' -> inducer 61 / `compressorExducer` 88, '73x66 quick spool turbine wheel' -> turbine 73 / `turbineExducer` 66, BorgWarner '61.44/83mm Billet Compressor Wheel', '68mm Turbine Wheel'); `turbineBlades` from the Turbine Wheel / Year option (`10 Blade`, `2003 (10 blade)`, `13 Blade (No Whistle)`) or the body; `ar` from the variant's Turbine Housing / A/R Size option (`.84ar`, `1.0 A/R`, `.91ar T4 Divided` -> also `turbineFlange`, `divided`) or the body's turbine housing ('0.91AR Turbine Housing', '1.00 A/R Turbine Housing'); `compressorAr` from '0.70AR Ported Compressor Cover'; `housingCm2` from '(12CM Housing)'; `vgt` from the `vgt` / `non vgt turbo` tags and VGT/VNT/AVNT/wastegate words; `bearing` ball/journal; `stage` (1, 1.5, 2, 3; `S2r` -> 2); `series` (Jetfire, KC300x G3, KC38r, TP38r, Whistler, Warlock, Cummander, Vortex, Fusion, Reaper, Stock Plus, Budget, PowerMax, SX-E, PhatShaft); `model` (GTP38R, GT3788VA, GT3794VA, GT4094VA, HE351VE, S362...); `whistler` from the Whistler / Non Whistler option; `finish` from the cover / powder-coat option (Polished, Chrome, Fire Truck Red...; KC uses a different base number for coated covers, e.g. 300132 standard vs 300957-(Pol)); `supercore` for the 'No Turbine housing' variant of a supercore; `kit` for conversion / retrofit kits (the kit's turbo sizes); `compound` with `lowPressureStage`/`highPressureStage` for the 6.4 Fusion set; `twin` for the EcoBoost Reaper pairs; `position` low-/high-pressure on the 6.4 singles; `maxInjectorCc`/`maxInjectorPct` from 'Supports: Up to 205cc/30% injectors'; `hpLow`/`hpHigh` from '450 to 550 HP with supporting mods'; `hpCapable` from 'Capable of 500whp' / 'Supports Up To 600RWHP' (as printed, wheel or crank); `hpGain` from 'supporting up to an additional 175HP'; `maxBoostPsi`; `mfrPn` (Garrett / Holset number printed on resold units); `replacesOem` (Ford cross-reference number); `condition` new/reman.
- **Injectors**: one record per variant SKU (Full Force lists the same injector under 'Send in First' / 'Send In After' core options with `-SF`/`-SA` suffixes; both are kept as listed). `nozzleCc` from the title/variant (`180CC`, `190cc`, `180cc/30`), `pctOver` from the Size / Nozzle Size option (`80%`, `30`, `Stock` -> 0), `stage`, `hybrid`, `plungerMm` (`7mm Hybrid`), `series` Legacy/Evolution, `set`, `hpCapable` ('capable of 600RWHP'), `flowGainPct` (Nostrum EcoBoost '11% Flow rate increase over stock'), `coreRequired`, `condition`.
- **Injection pumps**: `type` CP3/CP4/CP4.2/CPX/VP44/HPFP/HPOP (HEUI high-pressure oil pumps are filed as `injectionPump` with `type: HPOP`, as in the Industrial Injection extract); `strokerMm` (10 / 10.3 mm stroker); `pctOver` and `hpCapable` from the RCD CPX variant ('+25% Up to 700 RWHP'); `hpRating` ('235HP (Standard Output)'); `stage`; `minGpm` (CNC-Fab HPOP bench minimum); `dual`, `kit`; `replacesOem`; `condition`. The Xtreme-DI EcoBoost HPFP lists one SKU under 11 model-year options; the years are merged into one record (see shared SKUs).
- **Manifolds**: `type` intake/exhaust, `side`, `pair` (exhaust manifold sets), `material` cast/billet, `pieces`, `finish` (Pusher / PPE colour and coating options), `kit` (manifold + up-pipe kits, intake + turbo-inlet packages).
- **emissions**: `carb_eo:D-nnn[-nn]` when the body prints a CARB EO number (Pusher D-879, BD D-553-17); else `no_eo_race_only` when the product carries KC's `CARBs are bad for you` tag (the site's marker for parts without an EO); else `oem_replacement` for stock-replacement / OEM / reman-stock listings; else `unknown`. DPF/DOC/SCR/EGR delete parts: none in the four categories (fuel-bowl delete and turbo-resonator delete plugs are not emissions parts and are outside the categories anyway).

## Skipped

- **other: untyped**: 538
  - FD800241 Fluidampr Performance Diesel Series Damper - 6.7 Powerstroke (2011-2026)
  - FFD162 Full Force EBP Pedestal Actuator Isolator Pigtail - 7.3 Powerstroke (1994-1997)
  - NX16011 Nitrous Express Maximizer 6 Progressive Controller
  - SS-6.7F11-LPK S&S Fuel Leak Prevention Kit - 6.7 Powerstroke (2011-2026)
  - PHP-HS-M / 302877 PHP Medusa Interface for Hydra Chip - 7.3 Powerstroke (1994-2003)
  - 302856 KC Compressor Cover Outlet O-Ring Square - 7.3 Powerstroke (1994-1999)
  - 67ICR11161 No Limit Air To Water Intercooler Stage 1 - 6.7 Powerstroke (2011-2026)
  - wdi-hp-ipr WDI High Pressure IPR Valve - 6.0 Powerstroke (2003-2007)
  - ... 530 more
- **apparel / merch / lighting / additives / accessories**: 240
  - textilegraphix449183335 KC Halloween T-Shirt
  - textilegraphix584644401 "BOOst Season" T-Shirt
  - 302872 KC Turbos 4' x 2' Garage Series Banner
  - textilegraphix6928008 Haunting The Streets Since 2013 - T-Shirt
  - 120007XD Cataclean - Diesel Engine, Exhaust & DPF Cleaner - 16 oz.
  - 302695 "We The People" T-shirt - Swag Pack
  - XD757 XDP Stock+ Power Steering Gearbox - 7.3 Powerstroke (1997-2000)
  - XD739 XDP Power Steering Pump - 6.7 Powerstroke (2011-2016)
  - ... 232 more
- **hidden back-end / package-component listing (X-(Back End)...)**: 184
  - 302885 X-(Back End) 6.7 Turbo Install Kit - 6.7 Powerstroke (2015-2019)
  - spd-304-ssrd X-(Backend) 304 Stainless Steel Resonator Delete
  - PFP1519ISE_G X-(Backend) Pusher Powerflow Intake Manifold / Turbo Inlet Package - 6.7 Powerstroke (2015-2019)
  - GH400068 X-(Backend) Additional Tune Modifiers
  - JXB-TMT01A0-BSH-S X-(Backend) JXB Billet Transmission Mount - Additional Brushings
  - 302751 X-(Backend) KC300x G3 Stage 1 Conversion Kit - 7.3 Powerstroke OBS (1994-1998)
  - ss-150-core-charge X-(Back End) S&S Core Charge
  - Misc Product X-(Backend) 11-14 Price Difference
  - ... 176 more
- **turbo parts / hardware**: 104
  - 300869 KC Whistler Stage 1 Turbo - 6.7 Powerstroke (2011-2019)
  - 302819 KC Turbos 11 Blade Turbine Wheel - 6.0 Powerstroke, LBZ & LLY
  - 302813 KC Turbos 9 Blade Turbine Wheel - 6.0 Powerstroke, LBZ & LLY
  - 302795 Turbo Outlet Flange V-Band Clamp - 7.3 Powerstroke (1994-E1999)
  - 302791 Mahle Turbo Mounting Gasket Set - 6.7 CUMMINS (2007.5-2018)
  - 302481 Turbo Install Kit - 3.5 Ecoboost (2013-2016)
  - 300595-E99 Riffraff Complete Set CAC Boots - 7.3 Powerstroke (E99)
  - AP0165 AP Turbo Install Kit - 6.6 Duramax (2011-2016)
  - ... 96 more
- **other: Engine Parts**: 67
  - XD271 XDP Banjo Bolt Upgrade Kit - 6.0 Powerstroke (2003-2007)
  - 300953 ARP 625+ Head Studs - 6.0 Powerstroke (2003-2007)
  - 302666 Ford High Output Crankcase Oil Separator Filter - 6.7 Powerstroke (2011-2024)
  - AP63504 Alliant Power Water Pump - 6.4 Powerstroke (2008-2010)
  - XD723 XDP Performance Harmonic Balancer - 6.6 Duramax (2006-2010)
  - XD720 XDP Performance Harmonic Balancer - 6.4 Powerstroke (2008-2010)
  - XD714 XDP Performance Harmonic Balancer - 7.3 Powerstroke (1994-2003)
  - XD707 XDP Harmonic Balancer - 6.4 Powerstroke (2008-2010)
  - ... 59 more
- **hidden listing (not on the storefront)**: 66
  - 302862 KC Jetfire Turbo - No Lower Intake Manifold - 6.7 Powerstroke (2011-2014)
  - 302852 FOMOCO Clamps - 6.7 Powerstroke (2020+)
  - F81Z12B637EA 7.3L Powerstroke Engine Harness - 1999-2001 Ford F-Series
  - 302797 High Output Install Kit - 6.7 Powerstroke
  - 302775 Ashville 18mm Short Block Engine W/ Stage 2 Camshaft & Callie Rods
  - ap-maf-core-charge AP MAF Sensor Core Charge
  - BPD-FICM-CORE BPD FICM Core Charge
  - 302749 S488 Turbo - SKU 302749
  - ... 58 more
- **lift pump / fuel-system kit (not a task category)**: 62
  - XD613 XDP Fuel System Contamination Kit(No Pump/Stock Replacement) - 6.7 Powerstroke (2017-2019)
  - XD612 XDP Fuel System Contamination Kit(No Pump/Stock Replacement) - 6.7 Powerstroke (2015-2016)
  - XD611 XDP Fuel System Contamination Kit(No Pump/Stock Replacement) - 6.7 Powerstroke (2011-2014)
  - A7SABF590 AirDog II-5G Fuel System (165gph) - 6.7 Powerstroke(2017-2023)
  - A7SABC513 AirDog II-5G Fuel System (165gph) - 6.6 Duramax (2015-2016)
  - A7SABC510 AirDog II-5G Fuel System (165gph) - 6.6 Duramax (2011-2014)
  - A7SABD525 AirDog II-5G Fuel System (165gph) - 5.9 Cummins (1998.5-2004)
  - A7SABD524 AirDog II-5G Fuel System (165gph) - 5.9 Cummins (1994-1998)
  - ... 54 more
- **garage-sale one-off (used / open-box / discontinued unit, duplicate SKU with -GARnnnn suffix)**: 35
  - 300323-GAR0153 Upgraded Bellowed Up-Pipe Kit - 7.3 Powerstroke (L99-03)
  - 300323-GAR0154 Upgraded Bellowed Up-Pipe Kit - 7.3 Powerstroke (L99-03)
  - 300323-GAR0146 Upgraded Bellowed Up-Pipe Kit - 7.3 Powerstroke (L99-03)
  - 300323-GAR0145 Upgraded Bellowed Up-Pipe Kit - 7.3 Powerstroke (L99-03)
  - 300323-GAR0149 Upgraded Bellowed Up-Pipe Kit - 7.3 Powerstroke (L99-03)
  - 300323-GAR0150 Upgraded Bellowed Up-Pipe Kit - 7.3 Powerstroke (L99-03)
  - 300323-GAR0147 Upgraded Bellowed Up-Pipe Kit - 7.3 Powerstroke (L99-03)
  - 300299-GAR3784 Odawgs Diesel S2R Intake Manifold - 6.0 Powerstroke (2003-2007)
  - ... 27 more
- **other: Exhausts**: 29
  - W35F1516HFC-4-WB123 FTS SPD Turbo Whistle Package - 3.5 Ecoboost (2015-2016)
  - W35F1114HFC-4-WB126 FTS SPD Turbo Whistle Package - 3.5 Ecoboost (2011-2014)
  - 302656 KC Upgraded Exhaust Manifolds - 3.5 EcoBoost (2011-2016)
  - 301088 Odawgs Diesel Bellowed Up Pipes - 7.3 POWERSTROKE (E99)
  - MBS6212AL MBRP 4" Installer Series Turbo-Back Exhaust System - 6.0 Powerstroke (2003-2007)
  - XD230 XDP Exhaust Manifold Installation Bolt Kit - 5.9L/6.7L Cummins (1989 - 2018)
  - 302417 Upgraded Heavy Duty Exhaust Up-Pipe Assembly - 6.0 Powerstroke (2003-2007)
  - MBS6218AL MBRP 4" Series Turbo-Back Exhaust System - 7.3L Powerstroke (1994-1997)
  - ... 21 more
- **manifold hardware / gasket / sensor**: 21
  - fmc9C1Z-12A697-B Intake Manifold Temp Sensor - 7.3 Powerstroke (1999-2003)
  - TPP-MB-3001-BLK TPP Exhaust Manifold Blankets - 6.0 Powerstroke (2003-2007)
  - BD1041483 BD Exhaust Manifold Bolt & Spacer Kit - 6.0 Powerstroke (2003-2007)
  - XD1016 XDP Manifold Absolute Pressure (MAP) Sensor - 6.7 Powerstroke (2011-2019)
  - XD1015 XDP Manifold Absolute Pressure (MAP) Sensor - 6.6 Duramax (2010-2016)
  - XD1014 XDP Manifold Absolute Pressure (MAP) Sensor - 6.7 Cummins (2007.5-2018)
  - XD1012 XDP Manifold Absolute Pressure (MAP) Sensor - 6.6 Duramax (2017-2020)
  - XD1011 XDP Manifold Absolute Pressure (MAP) Sensor - 7.3 Powerstroke (1994-1997)
  - ... 13 more
- **other: Cold Air Intake**: 20
  - SBF 75-5085-1 S&B Cold Air Intake (Cleanable Filter) - 6.7 POWERSTROKE (2017-2019)
  - 302308 KC Turbos Intake Plenums - 7.3 Powerstroke (L1999-2003)
  - 423004 CNC Fab Billet Intake Plenums - 7.3 Powerstroke (1994-2003)
  - 75-5081 S&B Filters Cold Air Intake (Cleanable Filter) - 3.5 Ecoboost, Raptor, 2.7 Ecoboost (2015-2017)
  - CAFD No Limit Fabrications Air Filter (2003- 2020+)
  - 67CAIRD17 No Limit 6.7 Cold Air Intake (Stage 1) - 6.7 Powerstroke (2017-2019)
  - 60CAIBD03 No Limit Cold Air Intake - 6.0 Powerstroke (2003-2007)
  - 67CAIRD20 No Limit 6.7 Cold Air Intake (Stage 1) - 6.7 Powerstroke (2020)
  - ... 12 more
- **DIY turbo kit / balanced assembly / rebuild kit (turbo parts, not a complete turbo)**: 18
  - 300594 KC Powermax Balanced Assembly Turbo Kit - 6.0 Powerstroke (2003-2007)
  - 67SD11RDBLK DIY Battery Cable Set - 6.7 Powerstroke (2011-2022)
  - 302311 H2E 360 Turbo Rebuild Kit - 7.3 Powerstroke (1994-2003)
  - 301054 OEM DIY Rebuild Kit - 6.7 Powerstroke (2015-2019)
  - 300803 KC Complete Compound Turbo Rebuild kit - 6.4 Powerstroke (2008-2010)
  - 300802 High Pressure Turbo Rebuild kit - 6.4 Powerstroke
  - 300801 Low Pressure Turbo Rebuild kit - 6.4 Powerstroke
  - 300772 KC 360 Turbo Rebuild Kit - 6.7 Powerstroke (2015-2019)
  - ... 10 more
- **other: cooling**: 18
  - DD-FFCS Driven Diesel Fan Clutch Accelerator Switch - 6.0 Powerstroke (2003-2007)
  - 64FRCTR No Limit Aluminum Coolant Tank - 6.4 Powerstroke (2008-2010)
  - 67CLK No Limit Coolant Line Kit - 6.7 Powerstroke (2011-2021)
  - 67FRCTR1116 No Limit Coolant Tank - 6.7 Powerstroke (2011-2024)
  - 301051 Dorman Ford Degas Bottle - 6.0 Powerstroke (2003-2007)
  - 301052 Ford Degas Bottle - 6.0 Powerstroke (2003-2007)
  - XD215 XDP Coolant Recovery Tank Reservoir Cap - Powerstroke (2003-2016)
  - XD177 XDP 6.4L Coolant Filtration System - 6.4 Powerstroke (2008-2010)
  - ... 10 more
- **other: Programmers & Gauges**: 17
  - 302683 KC CTS3 Evolution Tuner Conversion - 6.0 Powerstroke (2003-2007)
  - 84140 Edge Insight+ Monitor and Custom Tuning Device - 6.7 Powerstroke (2011-2021)
  - 12713 Edge EZX Module - 6.7 Powerstroke (2023-2025)
  - 302664 KC CTS3 Evolution Tuner - 6.0 Powerstroke (2003-2007)
  - 98623 Edge EAS Street Diesel Kit - Powerstroke, Cummins, Duramax (1994-2020)
  - 302574 Custom SCT Tuning - 6.0 Powerstroke
  - 98604 EDGE Products Turbo Timer - Powerstroke, Duramax, Cummins (1994-2020)
  - EP98605 Edge Products 98605 EAS Universal Sensor Input (Expandable) - Powerstroke, Duramax, Cummins (1994-2020)
  - ... 9 more
- **emissions-system part (EGR cooler / gasket)**: 14
  - 90100033 BPD EGR Cooler Gasket Set - 6.0 Powerstroke (2003-2007)
  - AP63447 Alliant Power EGR Cooler Intake Gasket Kit - 6.0 Powerstroke (2003-2007)
  - 1900204 BD Power Square Tube EGR Gasket Kit - 6.0 Powerstroke (2004-2007)
  - 316129508 PPE EGR Cooler Tube - 6.4 Powerstroke (2008-2010)
  - AP63529 Exhaust Gas Recirculation (EGR) Pressure Sensor - 6.7 Powerstroke (2011-2017)
  - AP63470 Exhaust Gas Recirculation (EGR) Temperature Sensor - 6.4 Powerstroke (2008-2010)
  - AP63429 EGR (DPFE) Pressure Sensor - 7.3 Powerstroke (1994-1997)
  - 302767 / FO5C3Z-9F452-A Ford EGR Valve - 6.0 Powerstroke (2003-2007)
  - ... 6 more
- **other: oil components**: 12
  - 6000469 OEM Engine Oil Cooler - 6.0 Powerstroke (2003-2007)
  - 302302 RCD Thumper II HPOP - 6.0 Powerstroke (2005-2007)
  - 302109 Bosch HP032X High Pressure Oil Pump – 6.0 Powerstroke (2003-2004)
  - 300833 K&P Stainless Steel Micronic Oil Filter - 6.7 Powerstroke (2010-2019)
  - 300813 K&P Stainless Steel Micronic Oil Filter - 7.3 Powerstroke (1994-2003)
  - 300805 / 424020 CNC-Fab High Pressure Oil Pump (Stage 2) - 6.0 Powerstroke (2003-2004)
  - VK688-100 BPD Diesel OEM Oil Cooler Relocation kit - 6.0 Powerstroke (2003-2007)
  - 300319 / 424001 CNC-Fab Replacement HPOP Lines - 7.3 Powerstroke (1994-1997)
  - ... 4 more
- **pump hardware / kits without the pump**: 8
  - H086-1182 NHP High Pressure Fuel Pump Kit - 3.0 Ecoboost (2020+)
  - 424030 CNC Fab HPOP Reservoir Cover - 7.3 Powerstroke (1999.5-2003)
  - ISB-CH-001-1 Cummins 24V Cylinder Head VP44 Bare - 5.9 Cummins (1998-2002)
  - ISB-CH-101-1 KDD 24V Cylinder Head VP44 - Assembled - 5.9 Cummins (1998-2002)
  - XD269 XDP STC HPOP Fitting Update Kit - 6.0L Powerstroke (2004.5-2007)
  - XD134 XDP Injection Pump Gear Puller - 5.9L/6.7L Cummins (1989-2013)
  - 302039 Motorcraft STC HPOP Fitting Update Kit - 6.0 Powerstroke
  - 300355 / 424005 HPOP (HPx) Crossover Line - 7.3 Powerstroke (E99-2003)
- **other: performance parts**: 7
  - 67-street-package KC Jetfire Street Package - 6.7 Powerstroke
  - 73-hot-street Hot Street Package - 7.3 Powerstroke (1994.5-2003)
  - 73-tow-package Tow Package - 7.3 Powerstroke (1994.5-2003)
  - 73-street-performance Street Performance Package - 7.3 Powerstroke (1994.5-2003)
  - 60-street-package Street Performance Package - 6.0 Powerstroke (2003-2007)
  - 73-econ-package Economic Diesel Package - 7.3 Powerstroke (1994.5-2003)
  - 64p-ch-664-1 Kill Devil Diesel O-Ringed Cylinder Head Set - 6.4 Powerstroke (2008-2010)
- **other: Intercoolers**: 7
  - PFP1114HP_G Pusher HD 3" Hot Side Charge Tube - 6.7 Powerstroke (2011-2014)
  - 302518 KC Upgraded Intercooler - 3.5 & 2.7 EcoBoost (2015-2024)
  - PFP1522HP_G Pusher HD 3" Hot Side Charge Tube - 6.7 Powerstroke (2015+)
  - XD283 XDP Weldless Dual Radiator Coolant Y-Pipe - 6.7L Cummins (2014-2015)
  - 302291 KC Turbos Upgraded Intercooler - 6.0 Powerstroke (2003-2007)
  - 67SCL1114 Secondary Coolant Line - 6.7 Powerstroke (2011-2014)
  - banks-25970 Banks OBS Intercooler System - 7.3 Powerstroke (1994-1998)
- **delete part (skipped by rule)**: 5
  - XD241 XDP Fuel Filter Delete - 6.7 Cummins (2007-2009)
  - XD139 XDP Fuel Filter Delete - 5.9L Cummins (2003-2007)
  - XD137 XDP WIF Sensor Delete Plug - 6.6 Duramax (2001-2016)
  - XD163 XDP Fuel Filter Delete - 6.6L Duramax (2001 - 2016)
  - 423003 CNC Fabrication AIH Delete Plug - 7.3 Powerstroke (L1999-2003)
- **other: oil componenets**: 5
  - 301015 Heavy Duty High Pressure Oil Pump - 6.0 Powerstroke (2005-2007)
  - BSTIPR102 Bostech Reman Injection Pressure Regulator (IPR) Valve- 6.0 Powerstroke (2003-2006)
  - AP63417 Alliant Injection Pressure Regulator (IPR) Valve AP63417- 6.0 Powerstroke (2003-2007)
  - 302437 Ford Injection Pressure Regulator (IPR) - 6.0 Powerstroke (2003-2007)
  - 300122 / 424005 CNC-Fab HPOP Crossover Line - 7.3 Powerstroke (1994-1998)
- **intake plenum (not a manifold record)**: 4
  - 302793 KC Turbos Intake Plenums - 7.3 Powerstroke (1994-1998)
  - 423012 CNC Fab 8 Bolt Billet Intake Plenums - 7.3 Powerstroke (1994.5-1995)
  - 300992 RDP Plenum Reinforcing Inserts - 7.3 Powerstroke (1994-e99)
  - 300614 RiffRaff Plenum Reinforcing Inserts - 7.3 Powerstroke (L99-03)
- **injector hardware / cups / feed tubes / nozzle-only / core listings**: 4
  - FT-6.7 S&S Injector Feed Tubes Set - 6.7L Cummins
  - XD261 XDP Injector Pressure Regulator Socket - 6.0 Powerstroke
  - RDP-F4TZ9F538A Riff Raff Injector Cup Billet Stainless Steel Sleeve Set - 7.3 Powerstroke (1994-2003)
  - 300964 Injector Cups - 7.3 Powerstroke (1994-2003)
- **other: fuel system**: 4
  - XD200 XDP Push Lock Fuel Pressure Tee - Universal
  - XD171 XDP Cat Adapter W/ Filter, Bleeder Screw & Spacer - Duramax
  - TFT7021211 Titan Replacement Fuel Tank - 6.7 Powerstroke (2011-2016)
  - 300880 Marty's Diesel E-Fuel Conversion - 7.3 Powerstroke (1994-1997)
- **other: intake**: 4
  - 302055 6.7L Direct-Fit Intercooler Pipe Upgrade - 6.7 Powerstroke (2011-2016)
  - MPD-67-PSD-1121-HSP-BK-2 MPD Hot Side Intercooler Pipe - 6.7 Powerstroke (2011-2022)
  - 67UCHKR1116 No Limit Upper Coolant Hose Upgrade Kit - 6.7 Powerstroke (2011-2021)
  - RDPBLTPLNM-2-BLACK-OBS Billet Intake Manifold Plenums - 7.3 Powerstroke (1994-2003)
- **other: alternator**: 4
  - XD353 XDP Wrinkle Black HD High Output Alternator - 6.4 Powerstroke (2008-2010)
  - XD352 XDP Wrinkle Black HD High Output Alternator - 6.7 Powerstroke (2011-2022)
  - XD357 XDP Wrinkle Black HD High Output Alternator - 7.3 Powerstroke (1999-2003)
  - 302639 / XD362 XDP HD High Output Alternator - 6.0 Powerstroke (2003-2007)
- **other: Gaskets**: 4
  - 95-3784 Mahle Complete Gasket Kit - 6.4 Powerstroke (2008-2010)
  - 301003 / 302450 Mahle 6.0L 18mm Complete Gasket Set - 6.0 Powerstroke (2003-2005)
  - 301002 Mahle 6.0L 20mm Complete Gasket Set - 6.0 Powerstroke (2006-2007)
  - 300979 KC Turbo Install Kit - 6.4 Powerstroke (2008-2010)
- **other: Ecoboost**: 3
  - 302788 Motorcraft 3 Bar MAP Sensor - Ecoboost
  - 302787 Reische 170* Thermostat Ford-50 - Ecoboost
  - 302786 Reische 170* Thermostat FORD-4D - Ecoboost
- **other: air system**: 2
  - 302665 KC Upgraded Intercooler Retrofit Kit - 7.3 Powerstroke (1999-2003)
  - 60RHP No Limit HotSide Kit - 6.0 Powerstroke (2003-2007)
- **other: BPD Kit**: 2
  - 90100059 BPD Oil Cooler Mounting Bracket - 6.0 Powerstroke (2003-2007)
  - 90100024 BPD Power Steering Relocation Kit - 6.0 Powerstroke (2003-2007)
- **other: S&S Product**: 1
  - SS-RAIL-DBL-BRL S&S Diesel Double Barrel Fuel Rail - 6.7 Cummins
- **other: 1994-2003 7.3 Powerstroke**: 1
  - 302789 Gearhead Hydra Tunes - 7.3 Powerstroke (1994-2003)
- **other: Power Pack Packages**: 1
  - 302782 SCT X4 Power Pack Package - SHO/Flex/Explorer Sport (2010-2019)
- **other: Intake**: 1
  - MPD-67-PSD-1116-COOLHOSE-RAW-RAW MPD Upper Coolant Hose Kit - 6.7 Powerstroke (2011-2021)
- **other: Intake Manifolds**: 1
  - 301097 KC Intercooler Pipe Kit - 6.0 Powerstroke (2003-2007)
- **other: power pack**: 1
  - 60-hot-street Hot Street Performance Package - 6.0 Powerstroke (2003-2007)
- **other: Cooling**: 1
  - 64frpclk No Limit Passenger Coolant Line Fix - 6.4 Powerstroke (2008-2010)
- **other: package**: 1
  - 60-econ-package Economic Diesel Package - 6.0 Powerstroke (2003-2007)
- **other: exhausts**: 1
  - S6284AL MBRP 4"Installer Series Filter-Back Exhaust W/ Powerstroke- 6.7L (2011-2016)
- **other: Package**: 1
  - 60-tow-rig-package Tow Rig Package - 6.0 Powerstroke (2003-2007)
- **other: xd**: 1
  - XD213 High Pressure Oil Rail Ball Tubes - 6.0 Powerstroke
- **other: Gasket**: 1
  - 300906 Mahle Black Diamond Head Gasket (1 Gasket) - 6.0 Powerstroke (2003-2007)

## One SKU under several options on the same listing (first option's spec kept, years merged)

- Xtreme-DI XDI-E001-35: Xtreme-DI High Pressure Fuel Pump - 3.5 EcoBoost (2011-2021): 'Gen 1 3.5 Ecoboost / EVO / 2011' also listed as ['Gen 1 3.5 Ecoboost / EVO / 2012', 'Gen 1 3.5 Ecoboost / EVO / 2013', 'Gen 1 3.5 Ecoboost / EVO / 2014', 'Gen 1 3.5 Ecoboost / EVO / 2015', 'Gen 1 3.5 Ecoboost / EVO / 2016', 'Gen 1 3.5 Ecoboost / EVO / 2017'] ...
- Xtreme-DI XDI-B001-35: Xtreme-DI High Pressure Fuel Pump - 3.5 EcoBoost (2011-2021): 'Gen 1 3.5 Ecoboost / 60 / 2011' also listed as ['Gen 1 3.5 Ecoboost / 60 / 2012', 'Gen 1 3.5 Ecoboost / 60 / 2013', 'Gen 1 3.5 Ecoboost / 60 / 2014', 'Gen 1 3.5 Ecoboost / 60 / 2015', 'Gen 1 3.5 Ecoboost / 60 / 2016', 'Gen 1 3.5 Ecoboost / 60 / 2017'] ...
- Xtreme-DI XDI-E012-35: Xtreme-DI High Pressure Fuel Pump - 3.5 EcoBoost (2011-2021): 'Gen 2 3.5 Ecoboost / EVO / 2011' also listed as ['Gen 2 3.5 Ecoboost / EVO / 2012', 'Gen 2 3.5 Ecoboost / EVO / 2013', 'Gen 2 3.5 Ecoboost / EVO / 2014', 'Gen 2 3.5 Ecoboost / EVO / 2015', 'Gen 2 3.5 Ecoboost / EVO / 2016', 'Gen 2 3.5 Ecoboost / EVO / 2017'] ...
- Xtreme-DI XDI-B012-35: Xtreme-DI High Pressure Fuel Pump - 3.5 EcoBoost (2011-2021): 'Gen 2 3.5 Ecoboost / 60 / 2011' also listed as ['Gen 2 3.5 Ecoboost / 60 / 2012', 'Gen 2 3.5 Ecoboost / 60 / 2013', 'Gen 2 3.5 Ecoboost / 60 / 2014', 'Gen 2 3.5 Ecoboost / 60 / 2015', 'Gen 2 3.5 Ecoboost / 60 / 2016', 'Gen 2 3.5 Ecoboost / 60 / 2017'] ...

## Duplicate SKUs merged across listings (same brand + part number + family; first occurrence kept, years widened)

- KC Turbos 302671 [Powerstroke 6.7]: kept 'Super Spool VGT turbo, whistler, 2011-2014, Powerstroke 6.7' / dropped 'Super Spool turbo kit, whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- KC Turbos 302861 [Powerstroke 6.7]: kept 'Super Spool VGT turbo, whistler, 2011-2014, Powerstroke 6.7' / dropped 'Super Spool turbo kit, whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- KC Turbos 302670 [Powerstroke 6.7]: kept 'Super Spool VGT turbo, non-whistler, 2011-2014, Powerstroke 6.7' / dropped 'Super Spool turbo kit, non-whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- KC Turbos 302859 [Powerstroke 6.7]: kept 'Super Spool VGT turbo, non-whistler, 2011-2014, Powerstroke 6.7' / dropped 'Super Spool turbo kit, non-whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- KC Turbos 302853 [Powerstroke 6.7]: kept 'Jetfire VGT turbo, whistler, 2011-2014, Powerstroke 6.7' / dropped 'Jetfire turbo kit, whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- KC Turbos 302860 [Powerstroke 6.7]: kept 'Jetfire VGT turbo, whistler, 2011-2014, Powerstroke 6.7' / dropped 'Jetfire turbo kit, whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- KC Turbos 302854 [Powerstroke 6.7]: kept 'Jetfire VGT turbo, non-whistler, 2011-2014, Powerstroke 6.7' / dropped 'Jetfire turbo kit, non-whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- KC Turbos 302858 [Powerstroke 6.7]: kept 'Jetfire VGT turbo, non-whistler, 2011-2014, Powerstroke 6.7' / dropped 'Jetfire turbo kit, non-whistler, 2011-2014, Powerstroke 6.7' (src kc-warlock-retrofit-kit-6-7-powerstroke-2011-2015)
- Full Force Diesel 300489 [Powerstroke 7.3]: kept 'hybrid injector, Stage 3, 205 cc, 30% over, legacy, 1994-2003, Powerstroke 7.3' / dropped 'injector, 205 cc, 30% over, 1994-2003, Powerstroke 7.3' (src same-day-shipping-full-force-injectors-7-3-powerstroke-1994-2003)
- Full Force Diesel 300490 [Powerstroke 7.3]: kept 'hybrid injector, Stage 3, 238 cc, 80% over, legacy, 1994-2003, Powerstroke 7.3' / dropped 'injector, 238 cc, 80% over, 1994-2003, Powerstroke 7.3' (src same-day-shipping-full-force-injectors-7-3-powerstroke-1994-2003)
- Full Force Diesel 302634 [Powerstroke 7.3]: kept 'stock injector, legacy, 1999-2003, Powerstroke 7.3' / dropped 'stock injector, 1999-2003, Powerstroke 7.3' (src same-day-shipping-full-force-injectors-7-3-powerstroke-1994-2003)
- WDI wdi-stock-premium [Powerstroke 6.0]: kept 'stock injector set, 2003-2007, Powerstroke 6.0' / dropped 'stock injector set, 2003-2007, Powerstroke 6.0' (src wdi-6-0-stock-injectors)
- Full Force Diesel 300488 [Powerstroke 7.3]: kept 'injector, 180 cc, 30% over, 1994-2003, Powerstroke 7.3' / dropped 'injector, Stage 1.5, 180 cc, 30% over, legacy, 1994-2003, Powerstroke 7.3' (src 7-3-full-force-stage-1-5-injectors)

## Needs human QA

Families not in `cam-fitment.json` (catalog heading kept in `fit.fam`):

- `Ford EcoBoost`: 21 record(s)
- `Universal`: 30 record(s)

Judgement calls:

- `p` is the site SKU with whitespace tightened around hyphens (`300957 - (Pol)` -> `300957-(Pol)`, `302149 - LLY` -> `302149-LLY`). KC's 30xxxx numbers are KC's own SKUs. When a resold part's SKU pairs a manufacturer number with a KC number (`901654-5001W / 302623`, `300885 / 424018-SA`), the manufacturer number is `p` and the KC number goes to `spec.sellerSku`; resold Garrett/Holset units listed only under a KC SKU keep that SKU as `p` with the manufacturer number in `spec.mfrPn`.
- KC resells the S&S Diesel Motorsport injector and CP3 lines (about 230 records here). The SS task extracts the same lines from ssdiesel.com, but KC's SKUs differ in form (`SS-325-30SAC-R-SET` vs S&S's own `325-30SAC-SET` style; only the 6.7 Power Stroke / 2019+ Cummins SKUs coincide), so the merge will show them as separate parts under the same brand. Prefer the SS extract where both exist.
- Model years missing from a title are filled from the site's year tags (`2003`, `2005-2007`, `obs`, `e99`, `l99-03`) when present; otherwise the record has no years.
- KC's `CARBs are bad for you` tag is read as 'no CARB EO' -> `no_eo_race_only`. A hidden listing 'CARB EO KC Jetfire Stage 1 Turbo - 6.0 Powerstroke' (SKU 300021C) says 'Carb EO Approved for sale in California with stock injectors ONLY' but prints no EO number and is not on the storefront; it is skipped with the other hidden items. Verify the EO with KC before marking any Jetfire Stage 1 as CARB-exempt.
- Turbine wheel sizes written as `73x66` / `72.5x66` are read as inducer x exducer (the larger figure first, as the site writes them). Compressor `61x88` is inducer x exducer with 'extended tips to 93mm' ignored.
- Year options such as `2003` vs `2004+` on 6.0 Powerstroke turbos select the pedestal/mounting style (10-blade 2003 vs 13-blade 2004-2007 stock turbine); the record's `y0`/`y1` follow the option and the blade count is in `spec.turbineBlades`. The site says the 2003 version bolts to 2004-2007 trucks with one less bolt; that is not encoded.
- `hpCapable` is whatever the listing prints ('500whp', '600RWHP', '600HP') without converting between wheel and crank figures.
- Full Force injector SKUs differ only by the core option (`-SF` send-in-first / `-SA` send-in-after); both are kept because the site lists them as separate SKUs. WDI SKUs are slugs (`wdi-190-30-premium`), not part numbers.
- Warlock retrofit kits for 2011-2014 6.7 Powerstroke bundle a 2017-style turbo with pedestal and lower intake manifold; variants that supply a Garrett turbo instead of a KC one carry `variantNote`.

- 20 stock-replacement turbo record(s) carry no wheel sizes (the listing gives only the OEM/Garrett/Holset part number); they are not listed individually below.

Per-listing flags:

- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Jetfire Turbo - 6.7 Powerstroke (2011-2014) [302671, 302861, 302853, 302860, 302670, 302859 ... (8 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Jetfire Turbo - 6.7 Powerstroke (2011-2019) [302673, 302673-(Pol), 302673-(Chr), 302673-(Rd), 302673-(Grn), 302673-(Blu) ... (18 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Warlock Retrofit Kit - 6.7 Powerstroke (2011-2014) [302242, 302250, 302671, 302861, 302670, 302859 ... (10 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 3 Conversion Kit - 7.3 Powerstroke OBS (1994-1998) [302753, 302753-(Pol), 302753-(Chr), 302753-(Rd), 302753-(Grn), 302753-(Blu) ... (18 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 2 Conversion Kit - 7.3 Powerstroke OBS (1994-1998) [302752, 302752-(Pol), 302752-(Chr), 302752-(Rd), 302752-(Grn), 302752-(Blu) ... (18 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 1 Conversion Kit - 7.3 Powerstroke OBS (1994-1998) [302751, 302751-(Pol), 302751-(Chr), 302751-(Rd), 302751-(Grn), 302751-(Blu) ... (18 SKUs)]
- Nostrum: injector without a % over figure: Nostrum Stage 3 Injectors - 3.0 Ecoboost (2020+) [H750-1531 (Default Title)]
- Nostrum: injector without a % over figure: Nostrum Stage 2 Injectors - 3.0 Ecoboost (2019+) [H720-1368 (Default Title)]
- Nostrum: injector without a % over figure: Nostrum Stage 1 Injectors - 3.0 Ecoboost (2019+) [H703-1255 (Default Title)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 3 Turbo - 7.3 Powerstroke (E99) [302678, 302678-(Pol), 302678-(Chr), 302678-(Rd), 302678-(Grn), 302678-(Blu) ... (9 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 2 Turbo - 7.3 Powerstroke (E99) [302677, 302677-(Pol), 302677-(Chr), 302677-(Rd), 302677-(Grn), 302677-(Blu) ... (9 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 1 Turbo - 7.3 Powerstroke (E99) [302676, 302676-(Pol), 302676-(Chr), 302676-(Rd), 302676-(Grn), 302676-(Blu) ... (9 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Jetfire 2020 Turbo - 6.7 Powerstroke (2020+) [302675, 302550, 302675-(Pol), 302551-(Pol), 302675-(Chr), 302551-(Chr) ... (18 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 3 Turbo - 7.3 Powerstroke (L99-03) [302615, 302615-(Pol), 302615-(Chr), 302615-(Grn), 302615-(Rd), 302615-(Pur) ... (9 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 2 Turbo - 7.3 Powerstroke (L99-03) [302524, 302524-(Pol), 302524-(Chr), 302524-(Rd), 302524-(Blu), 302524-(Grn) ... (9 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC300x G3 Stage 1 Turbo - 7.3 Powerstroke (L99-03) [302523, 302523-(Pol), 302523-(Chr), 302523-(Rd), 302523-(Grn), 302523-(Blu) ... (9 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Reaper 500 Twin Turbos + KC Intercooler Package - 3.5 EcoBoost (2015-2016) [302520]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Reaper 500 Twin Turbos - 3.5 EcoBoost (2011-2016) [302579, 302475]
- KC Turbos: variant marked 'Coming Soon' on the site: KC Reaper 500 Twin Turbos - 3.5 EcoBoost (2011-2016) [302579 (2011-2012 (Coming Soon))]
- KC Turbos: listing marked discontinued on the site: KC38r Stage 3 Dual Ball Bearing Turbo - 7.3 Powerstroke (L99-2003) [300254, 300301-(Pol), 300301-(Rd), 300301-(Grn), 300301-(Blu), 300301-(Blk) ... (7 SKUs)]
- KC Turbos: listing marked discontinued on the site: KC38r "Tiger Turbo" Stage 2 Dual Ball Bearing Turbo - 7.3 Powerstroke (L99-2003) [300242, 300246-(Pol), 300246-(Rd), 300246-(Grn), 300246-(Blu), 300246-(Blk) ... (7 SKUs)]
- KC Turbos: listing marked discontinued on the site: TP38r Stage 3 Dual Ball Bearing Turbo - 7.3 Powerstroke OBS (1994-1998) [300277, 300285-(Pol), 300285-(Rd), 300285-(Grn), 300285-(Blu), 300285-(Blk) ... (21 SKUs)]
- KC Turbos: variant marked 'Coming Soon' on the site: KC Vortex Stage 2 Turbo (64/66) - 6.6 Duramax (2004.5-2010) [302152 (2011-2016 - LML - COMING SOON)]
- KC Turbos: variant marked 'Coming Soon' on the site: KC Vortex Stage 1 Turbo (63.5/64) - 6.6 Duramax (2004.5-2010) [302151 (2011-2016 - LML - COMING SOON)]
- Xtreme-DI: SKU looks like a placeholder: Xtreme-DI High Pressure Fuel Pump - 2.7 EcoBoost (2011-2021) [XDI-A0xx-27]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Fusion Compound Turbos - (Stage 1 High Pressure & Stage 1 & 2 Low Pressure Turbos) - 6.4 Powerstroke (2008-2010) [302446, 302447-(Pol), 302447-(Chr), 302447-(Rd), 302447-(Grn), 302447-(Blu) ... (18 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Fusion Stage 1 High Pressure Turbo - 6.4 Powerstroke (2008-2010) [302241]
- Garrett: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Turbocharger Upgrade (Rightside) - 3.5 Ecoboost (2013-2017) [881028-5002S / 302652]
- Garrett: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Turbocharger Upgrade (Left Side) - 3.5 Ecoboost (2013-2017) [881027-5002S / 302651]
- Garrett: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Turbocharger Upgrade (Right Side) - 3.5 Ecoboost (2011-2012) [881028-5001S / 302650]
- Garrett: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Turbocharger Upgrade (Left Side) - 3.5 Ecoboost (2011-2012) [881027-5001S / 302649]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Stock Plus Billet Turbo (Garrett) - 6.0 Powerstroke (2003-2007) [302003, 302002]
- Garrett: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax GT4094VA Stage 2 AVNT Turbo - 6.6 Duramax (2004.5-2010) [773542-5001S]
- Garrett: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax GT3794VA Stage 1 AVNT Turbo - 6.6L Duramax (2004.5-2010) [302555]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: Upgraded HE351VE Turbo with Holset VGT (Remanufactured) - 6.7 Cummins (2013-2018) [300971]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: Upgraded HE351VE Turbo with Holset VGT (Remanufactured) - 6.7 Cummins (2007.5-2012) [300265]
- KC Turbos: listing marked discontinued on the site: KC300x Stage 3 Turbo (66/73) - 7.3 Powerstroke (L99-03) [300232, 300931-(Pol), 300931-(Rd), 300931-(Grn), 300931-(Blu), 300931-(Blk) ... (16 SKUs)]
- KC Turbos: listing marked discontinued on the site: KC300x Stage 2 Turbo (63/73) - 7.3 Powerstroke (L99-03) [300223, 300926-(Pol), 300926-(Rd), 300926-(Grn), 300926-(Blu), 300926-(Gld) ... (16 SKUs)]
- KC Turbos: listing marked discontinued on the site: KC300x Stage 1 Turbo (63/68) - 7.3 Powerstroke (L99-03) [300235, 300920-(Pol), 300920-(Rd), 300920-(Grn), 300920-(Blu), 300920-(Blk) ... (16 SKUs)]
- WDI: injector without a % over figure: WDI 205cc Injector (Set of 8) - 6.0 Powerstroke (2003-2007) [wdi-205 (Default Title)]
- WDI: injector without a % over figure: WDi 190cc Injectors - 6.0 Powerstroke (2003-2007) [wdi-190 (Default Title)]
- WDI: injector without a % over figure: WDi 175cc Injector (Set of 8) 6.0 Powerstroke (2003-2007) [wdi-175- (Default Title)]
- WDI: injector without a % over figure: WDI 155cc Injector (Set of 8) 6.0 Powerstroke (2003-2007) [wdi-155-coreafter (Default Title)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Stock Plus Billet Turbo - 7.3 Powerstroke (E99) [300133, 300956-(Pol), 300956-(Chr), 300956-(Rd), 300956-(Grn), 300956-(Blu) ... (8 SKUs)]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Stock Plus Billet Turbo - 7.3 Powerstroke (L99-2003) [300132, 300957-(Pol), 300957-(Chr), 300957-(Rd), 300957-(Grn), 300957-(Blu) ... (8 SKUs)]
- BorgWarner: compressor exducer 74 mm is implausibly close to the inducer 62.99 mm (site figure kept as printed): Borg Warner S363-SXE (63/73 Supercore) - Powerstroke, Cummins, Duramax [300424, 300423, 300422]
- KC Turbos: performance turbo without compressor wheel size in title/variant/body: KC Stock Plus Billet Turbo - 7.3 Powerstroke OBS (1994-1998) [300410, 300713-(Pol), 300713-(Chr), 300713-(Rd), 300713-(Grn), 300713-(Blu) ... (8 SKUs)]
- Garrett: performance turbo without compressor wheel size in title/variant/body: Garrett Powermax Stage 1 Turbocharger - 6.0 Powerstroke (2003-2007) [300258, 300125]
- KC Turbos: listing marked discontinued on the site: KC Stage 1.5 Turbo (63.5/72.5) - 6.0 Powerstroke (2003-2007) [300013, 300011-(Pol), 300012, 300010-(Pol), 300011-(Rd), 300011-(Grn) ... (14 SKUs)]

## Validation

Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src emissions`, numeric fields are numbers, years are integers, no empty strings.
