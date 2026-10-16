# FLEECE extraction notes (Fleece Performance Engineering)

Extracted 2026-10-16 by `extract_fleece.py`. Source: `https://www.fleeceperformance.com/sitemap.xml` -> product pages (Magento, JSON-LD `Product` + Fitment / Interchange / Specifications / Certifications tabs) and the two lift-pump fitment PDFs linked from `/resources`.

## Fetch

- robots.txt: status cached; no Crawl-delay for any agent; `/catalog/product/view/`, `/catalog/category/view/`, `/index.php/` and the Magento system paths are disallowed and were never requested (products are reached by their clean root-level `.html` URLs, which are allowed). Requests spaced 6 s apart, one at a time, UA `engine-build.com catalog research (contact: joecsaba@gmail.com)`.
- Sitemap: 1 request, 616 product URLs (root-level `.html` entries with `<priority>1.0</priority>`; the 11 root-level category pages carry 0.5 and the ~430 nested `/dodge/...`, `/chevy-gmc/...`, `/ford/...` entries are category listings; neither were fetched).
- Product pages fetched: 616 parsed as products, 0 without a Product JSON-LD, 0 not retrieved. Fitment PDFs: 2 requests. Total requests logged in `dl/fleece/fetch_log.jsonl` across all runs: 616.
- Before the scripted crawl, the probe fetched robots.txt, the sitemap, the two PDFs, `/resources` and three product pages by hand with the same UA and spacing (8 requests, not in the log); the script reused those cached files. Three product pages failed once on a proxy disconnect (not a site refusal) and were fetched on the next run.
- Prices (USD, in the JSON-LD offers) are not stored. Pages are cached under `dl/fleece/pages/` (gitignored).

## Records

Total records: **114** (100 distinct part numbers; a part that fits several engine families is one record per family with the same `p`)

| cat | records |
|---|---|
| fastener | 6 |
| gasket | 2 |
| head | 19 |
| headGasket | 4 |
| injectionPump | 11 |
| intake | 1 |
| liftPump | 47 |
| lifter | 2 |
| pushrod | 2 |
| rocker | 2 |
| spring | 2 |
| turbo | 16 |

| fit.fam | cat | records |
|---|---|---|
| Cummins 5.9 12V | fastener | 2 |
| Cummins 5.9 12V | head | 1 |
| Cummins 5.9 12V | liftPump | 4 |
| Cummins 5.9 12V | turbo | 1 |
| Cummins 5.9 24V/CR | fastener | 2 |
| Cummins 5.9 24V/CR | head | 5 |
| Cummins 5.9 24V/CR | headGasket | 2 |
| Cummins 5.9 24V/CR | injectionPump | 3 |
| Cummins 5.9 24V/CR | liftPump | 6 |
| Cummins 5.9 24V/CR | lifter | 1 |
| Cummins 5.9 24V/CR | pushrod | 1 |
| Cummins 5.9 24V/CR | rocker | 1 |
| Cummins 5.9 24V/CR | spring | 1 |
| Cummins 5.9 24V/CR | turbo | 3 |
| Cummins 6.7 | fastener | 2 |
| Cummins 6.7 | gasket | 2 |
| Cummins 6.7 | head | 3 |
| Cummins 6.7 | headGasket | 2 |
| Cummins 6.7 | injectionPump | 3 |
| Cummins 6.7 | intake | 1 |
| Cummins 6.7 | liftPump | 12 |
| Cummins 6.7 | lifter | 1 |
| Cummins 6.7 | pushrod | 1 |
| Cummins 6.7 | rocker | 1 |
| Cummins 6.7 | spring | 1 |
| Cummins 6.7 | turbo | 3 |
| Cummins ISX/QSX *(not in cam-fitment.json)* | turbo | 2 |
| Duramax 6.6 | head | 10 |
| Duramax 6.6 | injectionPump | 5 |
| Duramax 6.6 | liftPump | 9 |
| Duramax 6.6 | turbo | 4 |
| Powerstroke 6.0 | liftPump | 2 |
| Powerstroke 6.0 | turbo | 2 |
| Powerstroke 6.7 | liftPump | 10 |
| Powerstroke 6.7 | turbo | 1 |
| Powerstroke 7.3 | liftPump | 2 |
| RAM 3.0 EcoDiesel *(not in cam-fitment.json)* | liftPump | 2 |

| emissions | records |
|---|---|
| `null` | 74 |
| `no_eo_race_only` | 8 |
| `unknown` | 8 |
| `carb_eo:D-834-8` | 3 |
| `carb_eo:D-834-28` | 2 |
| `carb_eo:D-834-10` | 2 |
| `carb_eo:D-834-22` | 2 |
| `carb_eo:D-834-21` | 2 |
| `oem_replacement` | 2 |
| `carb_eo:D-834-18` | 2 |
| `carb_eo:D-834-11` | 1 |
| `carb_eo:D-834-25` | 1 |
| `carb_eo:D-834-6` | 1 |
| `carb_eo:D-834-1` | 1 |
| `carb_eo:D-834-12` | 1 |
| `carb_eo:D-834-3` | 1 |
| `carb_eo:D-834-2` | 1 |
| `carb_eo:D-834-19` | 1 |
| `carb_eo:D-834-27` | 1 |

Fitment source: {'fitment tab': 103, 'breadcrumb': 2, 'description': 6, 'name': 3} (records).

## How fields were derived

- **Scope**: Fleece's own catalog only (`m` = Fleece Performance for every record; the JSON-LD brand on every page is 'Fleece Performance Engineering'). Emitted categories: `turbo` (Cheetah turbochargers), `liftPump` (PowerFlo in-tank lift pumps, SureFlo sending units, fuel-system kits built around a PowerFlo pump), `injectionPump` (CP3K, PowerFlo 750 / 1000 CP3 pumps, LML CP3 conversion kits that include the pump) and `head` (Freedom Series cylinder heads). Everything else on the site (fittings, hoses, pigtails, harnesses, billet caps and covers, coolant bypass kits, fuel lines, turbo drains and install kits, CP3 fittings and brackets, short/long blocks, fluids, apparel) is skipped and counted below.
- **Part number** `p` is the JSON-LD `sku` (identical to `mpn` on every page). `spec.upc` is the UPC from the Specifications tab. `spec.semaCert` is the SEMA Garage certificate number from the Certifications tab.
- **Fitment** comes from the page's Fitment tab, one line per model year (`2013 Ram 2500/3500 6.7L 24V Cummins`). Lines are grouped by engine family: `y0`/`y1` = min/max model year (half-year model breaks are floored and kept as `from 2007.5` in `fit.notes`), the vehicle wording (`Ram 2500/3500`) and Duramax engine codes go to `fit.notes`. `5.9L Cummins` lines resolve to `Cummins 5.9 12V` for 1998 and earlier and `Cummins 5.9 24V/CR` from 1998.5 unless the line says 12V/24V. Pages without a usable Fitment tab fall back to the year range and engine words in the product name, then to the breadcrumb (`Dodge (Cummins)` > `2013-2018 (6.7L)`); each such record is flagged below.
- **Turbos**: `compressorInducer` (mm) from `63mm FMW Compressor Wheel` / `63/67` in the name; `turbineWheel` when the page quotes a turbine size; `vgt` true for VGT/VNT/HE351VE/HE300VG/GT37xx units, false for HX35 / wastegated units; `model` the Holset/Garrett frame when named; `series` Cheetah / Cheetah Street; `compressorWheel` FMW (Fleece's forged-milled wheel); `turbineMaterial` Inconel when stated; `hpCapable` + `hpBasis` from 'Capable of supporting vehicle modifications up to 700 RWHP' (`hpBasis` is `RWHP` or `HP`, exactly as the page quotes it); `newActuator`, `exhaustBrake` (page says OEM exhaust-brake function is retained); `condition` 'new' when the name says Brand New, else 'remanufactured, core exchange' when a core charge is mentioned; `replacesOem` = the Interchange tab (OEM part numbers the unit replaces, max 30).
- **Lift pumps**: `type` in-tank / in-tank sending unit with pump (SureFlo) / frame-mounted; `hpCapable` ('up to 800 hp'); `psiLow`/`psiHigh` from 'Operating Pressure: 18-20 psi'; `gph` and `filtration` when quoted; `pumpType` dual gerotor; `biodieselMaxPct`; `bed`, `cab`, `tankGal`, `cabChassis`, `tankLocation` from the name; `retainsWif` (factory water-in-fuel sensor retained); `outletThread`; `kit` for the complete fuel-system kits; `replacesOem` = Interchange tab. `aftermarketTankFitment` lists the rows of the Titan / S&B fitment PDFs that name the pump (tank PN, cab, bed, years, locking-ring or tank gallons).
- **Injection pumps**: `type` CP3/CP4; `model` CP3K / PowerFlo 750 / PowerFlo 1000; `strokerMm` (10/12 mm stroker, from the text or the `-12MM-` SKU segment); `hpCapable` + `hpBasis`; `rpmHigh` ('full fuel delivery to 6,000+ RPM'); `kit` and `kitIncludesPump` for the LML conversion kits; `condition`; `fca` when the page says the FCA is new and unmodified; `replacesOem` = Interchange tab (Bosch / Mopar / GM numbers).
- **Heads**: `material`, `side` (L = driver), `injectorBore` cupless, `bare`, valve sizes / chamber cc only when the page quotes them, `series` Freedom Series.
- **emissions**: `carb_eo:D-xxx-xx` from the Certifications tab ('CARB EO# D-834-2'; Fleece holds EO D-834-* on most of its turbos, lift pumps and CP3 pumps). Turbos / injection pumps without an EO: `no_eo_race_only` if the page says race/competition use only, `oem_replacement` if described as a stock replacement with no performance claim, else `unknown`. Lift pumps and heads without an EO: `null` (internal / fuel-supply parts). No DPF/DOC/SCR/EGR delete products were found on the site; the 'Duramax turbo thermostat delete plug' is a coolant-thermostat plug, not an emissions part, and is skipped as hardware anyway.

## Lift-pump fitment PDFs

- `Fleece_and_Titan_Powerflo_Fitment.pdf`: 13 rows, 17 Fleece PNs; every PN, tank PN and year range verified present in the PDF text.
- `Fleece_SB_PF_SF_Fitment.pdf`: 6 rows, 8 Fleece PNs; every PN, tank PN and year range verified present in the PDF text.
- Both are one-page tables with merged cells (pdfplumber returns one row per table), so the rows are transcribed in `TITAN_FITMENT` / `SB_FITMENT` in the script and verified token-by-token against the PDF text on every run. The PDFs are undated.
- The MY2010 Cummins SureFlo is printed as `FPE-SF-CUMM-2010` in the Titan PDF and `FPE-SF-CUMM-10` in the S&B PDF; both are kept as printed (see QA). The S&B PDF prints the SureFlo PN in the PowerFlo column for the two Ford rows; kept as printed and noted on those rows.

## Skipped

- **electronics / pigtails / harnesses**: 105
  - FPE-HAR-RP-EXT 18" Rail Pressure Sensor Extension Harness
  - FPE-TAPSHIFTER12 2001-2002 GM/Allison TapShifter
  - FPE-TAPSHIFTER35 2003-2005 GM/Allison TapShifter
  - FPE-CP3X2 CP3X2 Harness for 2003-2018 Cummins
  - FPE-ALO All Lights On® (2007.5-Newer Select GM Vehicles)
  - FPE-ALO-TUNDRA-0717 All Lights On® for 2007-17' Toyota Tundra and 2008-18' Toyota Sequoia
  - FPE-ALO-TACOMA-1623 All Lights On® for 2016 - 2023 Toyota Tacoma
  - FPE-ALILKR AlliLocker
  - ... 97 more
- **engine dress / hardware (not a task category)**: 73
  - FPE-CLNT-HS-BRKT 2003-2007 Cummins Coolant Bypass Hose Brackets
  - FPE-34660-AL 2003-2012 Cummins Fan Drive Pulley (Bare Aluminum Finish)
  - FPE-34660-BLK 2003-2012 Cummins Fan Drive Pulley (Black Finish)
  - FPE-CLNTBYPS-CUMMINS-SER-KIT Coolant Bypass Service Kit
  - FPE-34657-BLK-SPK 2003-2018 Cummins Upper Fan Pulley Idler (Black Finish Contrast Cut)
  - FPE-34658-BLK-SPK 2003-2018 Upper Fan Idler for use with Electric Water Pumps (Black Finish Contrast Cut)
  - FPE-OC-CR-F Billet Oil Cap Cover for 2003-2018 Cummins
  - FPE-OC-CR-F-ORG (Orange) Billet Oil Cap Cover for 2003-2018 Cummins
  - ... 65 more
- **fittings / hoses / plumbing**: 63
  - FPE-34553-A 1/2" Hose Barb to 3/4"-16 O-ring (-8 AN)
  - FPE-NPT-12 1/2" NPT Hex Socket Plug Black
  - FPE-34874-A 1/2" NPT to -10AN Male
  - FPE-PLUG-12-QC 1/2" Fuel Line Quick Connect Male Plug
  - FPE-34781-A 1/2" Quick Connect to 3/4"-16 O-ring
  - FPE-34900-A 1/2" Quick Connect to 3/4"-16 O-ring - Short
  - FPE-NPT-14 1/4" NPT Hex Socket Plug Black
  - FPE-NPT-18 1/8" NPT Hex Socket Plug Black
  - ... 55 more
- **apparel / merchandise**: 50
  - FPE-DECAL-STARS 4" Stars and Stripes Fleece Decal
  - FPE-KEYCHAIN-FABRIC Fleece and Freedom Keytag - 5”x1”
  - FPE-DECAL-F-6X6 Fleece Performance 6x6" "F" Decal
  - FPE-DECAL-F-8x8 Fleece Performance 8X8" "F" Decal
  - FPE-TSHIRT-AM Fleece Performance American Made T-Shirt
  - FPE-HAT-BG-MC-SB Mesh Back, Black and Gray Snap Back Hat
  - FPE-HD-FLAG-BLK-CAMO Fleece Performance Black Camo Flag Hoodie
  - FPE-HD-FLAG-DB Fleece Performance Duck Brown Flag Hoodie
  - ... 42 more
- **fuel lines**: 40
  - FPE-FL-CUMM-6.7-1 07.5'-18' 6.7L Dodge Cummins #1 Injection line
  - FPE-FL-CUMM-6.7-23 07.5'-18' 6.7L Dodge Cummins #2 and #3 Injection Line
  - FPE-FL-CUMM-6.7-45 07.5'-18' 6.7L Dodge Cummins #4 and #5 Injection Line
  - FPE-FL-CUMM-6.7-6 07.5'-18' 6.7L Dodge Cummins #6 Injection line
  - FPE-FL-CUMM-6.7-SET 07.5'-18' 6.7L Dodge Cummins Fuel Injection Line Set
  - FPE-34200-11 11" High Pressure Fuel Line (8mm x 3.5mm Line, M14x1.5 Nuts)
  - FPE-34200-12 12" High Pressure Fuel Line (8mm x 3.5mm Line, M14x1.5 Nuts)
  - FPE-34200-13 13" High Pressure Fuel Line (8mm x 3.5mm Line, M14x1.5 Nuts)
  - ... 32 more
- **turbo hardware / plumbing / install kit**: 39
  - FPE-RES-04.5-10 2004.5-2010 Duramax Billet Turbo Resonator Plug (LLY/LBZ/LMM)
  - FPE-SH-3CAC 3" ID Silicone CAC hose kit
  - FPE-SH-3H 3" ID - Silicone hump hose kit
  - FPE-SH-3R 3" ID to 2.75" ID - Silicone reducing sleeve kit
  - FPE-CAC-UNV-0314 3" OD x 14" Universal CAC pipe with gloss black powder coat
  - FPE-6.7CR-COOL-PLUG 6.7 CR Stock VGT Turbo Coolant Plugs
  - FPE-TURBO-INST-KIT-CUMM59 Cummins S300-S400 Turbo Installation Kit (5.9L)
  - FPE-TURBO-INST-KIT-CUMM67 Cummins S300-S400 Turbo Installation Kit (6.7L)
  - ... 31 more
- **fuel filters / distribution blocks**: 35
  - FPE-GM-FFPD-0116 Fuel Primer Bulb Sealing Kit for 2001-2016 GM Duramax
  - FPE-FFD-RF-3G 2003-2007 - 3rd Gen Dodge/Cummins Fuel Distribution Block
  - FPE-FFD-RO-3G 2003-2007 - 3rd Gen Dodge/Cummins Fuel Filter Delete/Bypass
  - FPE-34783 Non-Heated Fuel Filter Conversion Kit for 2003-2018 Dodge Ram Cummins
  - FPE-FFD-RF-3G-67 2007.5-2009 - 3rd Gen Dodge/Cummins Fuel Distribution Block
  - FPE-FFD-RO-3G-67 2007.5-2009 - 3rd Gen Dodge/Cummins Fuel Filter Delete/Bypass
  - FPE-FFD-RF-4G 2010-2018 - 4th Gen Dodge/Cummins Fuel Distribution Block
  - FPE-FFD-RO-4G 2010-2018 - 4th Gen Dodge/Cummins Fuel Filter Delete/Bypass
  - ... 27 more
- **injection-pump hardware / kit without the pump**: 23
  - FPE-CP3-FEED 1/2" CP3 Feed Fitting
  - FPE-CUMM-CP3-CVR CP3 Nut Cover for 2003-2018 Cummins
  - FPE-LML-CP3-NP LML CP3 Conversion Hardware Kit (No Pump) for 2011-2016 Duramax
  - FPE-CP3-RTRN 3/8" CP3 Return Fitting
  - FPE-34610-PC 5.9L Dual Pump Bracket and Mounting Hardware
  - FPE-DPK-59-0307 Dual Pump Hardware Kit for 2003-2007 5.9L Cummins
  - FPE-34196 6.7L Cummins Dual Pump Kit Junction Block with Rail Sensor Port
  - FPE-DPK-67-0709 Dual Pump Hardware Kit for 2007.5-2009 6.7L Cummins
  - ... 15 more
- **transmission / chassis parts**: 16
  - FPE-TL-CUMM-1012 2010-2012 Cummins with 68RFE Replacement Transmission Line Kit
  - FPE-TL-LML-1114 2011-2014 LML Duramax Transmission Cooler Line Set
  - FPE-AC-KIT-1316 2013-2018 6.7L Cummins A/C Line Reroute Kit
  - FPE-TL-LML-1516 2015-2016 LML Duramax Transmission Cooler Line Set
  - FPE-TL-L5P-1719 2017-2019 L5P Duramax Transmission Cooler Line Set
  - FPE-TL-LB7-LLY Allison Transmission Cooler Lines for 2001-2005 (LB7-LLY)
  - FPE-TL-LBZ-LMM Allison Transmission Cooler Lines for 2006-2010 (LBZ-LMM)
  - FPE-TL-LB7-LLY-SHORT-SER Replacement Transmission Line LB7/LLY (short line)
  - ... 8 more
- **short / long block (no shared category)**: 8
  - FPE-CUMM-59E-LB-HD 2003-2004 Freedom Series® Street HD 5.9L Cummins Common Rail Long Block
  - FPE-CUMM-59E-LB 2003-2004 Freedom Series® Street 5.9L Cummins Common Rail Long Block
  - FPE-CUMM-59L-LB-HD 2004.5-2007 Freedom Series® Street HD 5.9L Cummins Common Rail Long Block
  - FPE-CUMM-59L-LB 2004.5-2007 Freedom Series® Street 5.9L Cummins Common Rail Long Block
  - FPE-CUMM-67E-LB-HD 2007.5-2012 Freedom Series® Street HD 6.7L Cummins Common Rail Long Block
  - FPE-CUMM-67E-LB 2007.5-2012 Freedom Series® Street 6.7L Cummins Common Rail Long Block
  - FPE-CUMM-67L-LB-HD 2013-2018 Freedom Series® Street HD 6.7L Cummins Common Rail Long Block
  - FPE-CUMM-67L-LB 2013-2018 Freedom Series® Street 6.7L Cummins Common Rail Long Block
- **other: Ford (Powerstroke) > 2011-2016 (6.7L) > Fuel System**: 5
  - FPE-FL-RC-FMC-14P Fuel Line Retaining Clips for the Ford Power Stroke - 14 Pack
  - FPE-FL-RC-FMC-4P Fuel Line Retaining Clips for the Ford Power Stroke - 4 Pack
  - FPE-FMC-FF-RLK-1116 Injector Return Line Repair Fitting for 2011-2016 6.7L Power Stroke
  - FPE-FMC-FF-RLK-1116-5P Injector Return Line Repair Fitting for 2011-2016 6.7L Power Stroke - 5 Pack
  - FPE-FMC-FF-RLK-1116-SER Service Kit for FPE-FMC-FF-RLK-1116
- **fluids / consumables**: 5
  - FPE-FD1030 Freedom Series 10W-30 Diesel Engine Oil
  - FPE-FD1540 Freedom Series 15W-40 Diesel Engine Oil
  - FPE-FD1550 Freedom Series 15W-50 Racing Oil
  - FPE-FD540 Freedom Series 5W-40 Diesel Engine Oil
  - FPE-FDBRK Freedom Series Break-In Oil
- **lift-pump hardware / pigtail / filter**: 4
  - FPE-QUCON-OE-38 3/8" Quick Connect to -8AN Male Adapter for OEM Dodge Ram Cummins Sending Unit
  - FPE-HAR-FMC-LP-1116 Lift Pump Pigtail for 2011-2016 Ford Powerstroke
  - FPE-HAR-FMC-LP-1724 Lift Pump Pigtail for 2017+ Ford Powerstroke
  - FPE-HAR-MU-PT-15 Sending Unit Pigtail for 99-07 Powerstroke
- **cylinder-head hardware**: 4
  - FPE-CUMM-CYLHD-KIT Fleece Performance Cylinder Head Dowels For 1989-2023 Cummins
  - FPE-61-10011-HD Freedom Series® HD Cylinder Head for the 6.0L PowerStroke - 18mm dowel
  - FPE-61-10012-HD Freedom Series® HD Cylinder Head for the 6.0L PowerStroke - 20mm dowel
  - FPE-CUMM-CYL-M22-PG M22 Thermostat Plug for Cummins Cylinder heads
- **other: Engines > Freedom Series LSR/LTR Builder Blocks**: 4
  - FPE-LSR-FMJ-SD10X Freedom Series® LSR Standard Deck Solid Aluminum Block
  - FPE-LSR-SD10X Freedom Series® LSR Standard Deck Wet Aluminum Block
  - FPE-LTR-FMJ-SD10X Freedom Series® LTR Standard Deck Solid Aluminum Block
  - FPE-LTR-SD10X Freedom Series® LTR Standard Deck Wet Aluminum Block
- **other: Fleece Gear > Outerwear**: 3
  - FPE-JACKET-SOFTSHELL Fleece Performance Embroidered Jacket
  - FPE-JACKET-HYBRID-MENS Mens Hybrid Jacket
  - FPE-JACKET-HYBRID-WOMEN Women's Hybrid Jacket
- **other: Turbos > Turbo Accessories > Intake Components**: 3
  - FPE-34133 Fleece Performance Replacement Air Filter
  - FPE-UNV-INTAKE-5 Molded plastic universal 5" intake manifold elbow
  - FPE-UNV-INTAKE-RUBBER-5 Molded rubber universal elbow for 5" intakes
- **other: Ford (Powerstroke) > 2017-2026 (6.7L) > Fuel System**: 3
  - FPE-FL-RC-FMC-6P Fuel Line Retaining Clips for the Ford Power Stroke - 6 Pack
  - FPE-FMC-FF-RLK-1724 Injector Return Line Repair Fitting for 2017-2026 6.7L Power Stroke
  - FPE-FMC-FF-RLK-1724-5P Injector Return Line Repair Fitting for 2017-2026 6.7L Power Stroke - 5 Pack
- **other: Dodge (Cummins) > 2019-2024 (6.7L) > Intake Components**: 2
  - FPE-CUMM-IAH-X2 Cold Weather Upgrade Kit for the Fleece Performance Intake
  - FPE-CUMM-IHK-0724 Fleece Performance Intake and Grid Heater Upgrade Kit
- **other: Dodge (Cummins) > 2003-2007 (5.9L) > Hardware/Fasteners **: 2
  - FPE-CUMM-OC-BOP Cummins Oil Cooler Block Off Plate
  - FPE-CUMM-FGHD-KIT Fleece Performance Front Gear Housing Dowels For 2003-2018 Cummins
- **valvetrain hardware (bridges / crossheads)**: 2
  - FPE-BRAB-C1 Fleece Performance Billet Rocker Arm Bridges for 1998.5 + 24v 5.9L/6.7L Cummins (set of 12)
  - FPE-BRAB-D1 GM Duramax Rocker Bridges
- **other: Chevy/GMC (Duramax) > 2011-2016 (LML) > Fuel System**: 2
  - FPE-FH-CUMM-GM Fuel Heater for Fleece Performance Cummins/GM Filter Bases
  - FPE-FPTP-GM-1116 Return Fuel Pressure Test Port for 2011-2016 LML Duramax
- **other: Dodge (Cummins) > 2003-2007 (5.9L) > Turbochargers > Turbo Accessories **: 2
  - FPE-AFPF-BLK Water Resistant Pre-Filter for use with Fleece Performance Replacement Air Filter (Black)
  - FPE-AFPF-ORG Water Resistant Pre-Filter for use with Fleece Performance Replacement Air Filter (Orange)
- **other: Dodge (Cummins) > 2007.5-2009 (6.7L) > Coolant Bypass Kits**: 1
  - FPE-CUMM-EBP-KIT-0712 2007.5-2012 Exhaust Back Pressure Relocation Kit for 6.7 Cummins
- **other: Dodge (Cummins) > 2010-2012 (6.7L) > Fuel System > Fuel Distribution Hose and Fitting Kits **: 1
  - FPE-HFFL-1018 1/2" High Flow Fuel Feed Line Kit for 2010-2018 Cummins
- **other: Fuel System > Dual Pump Kits > Replacement Parts**: 1
  - FPE-34197 6.7L Cummins Fuel Rail Adapter Fitting
- **other: Turbos > Turbo Accessories > Oil Feed Lines**: 1
  - FPE-APT-M12-06 Replacement Oil Feed Line Fitting with Sealing Washer
- **other: Dodge (Cummins) > 2010-2012 (6.7L) > Hardware/Fasteners **: 1
  - FPE-CCBT Cummins Crankshaft Barring Tool
- **other: Dodge (Cummins) > 2013-2018 (6.7L) > Fuel System > Dual Pump Accessories **: 1
  - FPE-CDPC Cummins Dual Pump Controller
- **other: Dodge (Cummins) > 2003-2007 (5.9L) > Fuel System > Fuel Block Off Plate **: 1
  - FPE-CUMM-FBOP Cummins Mechanical Fuel Pump Block Off Plate
- **other: Dodge (Cummins) > 1989-1998 (12V) > Hardware/Fasteners **: 1
  - FPE-MIDPLATE-5967 Mid-plate for Dodge 4x4
- **other: Chevy/GMC (Duramax) > 2011-2016 (LML) > Fuel System > CP3 Conversion Kits**: 1
  - FPE-LML-QCDT Dosing Injector Fuel Line Disconnect Tool for 2011-2016 Duramax
- **other: Chevy/GMC (Duramax) > 2001-2004 (LB7)**: 1
  - FPE-DMAX-OCADPT Duramax Oil Cooler Adapter
- **other: Fleece Gear > Freedom Racing Engines**: 1
  - FRE-LP-BLACK Freedom Racing Engines License Plate
- **other: Fuel System > Nissan Titan Fuel Pump Kit**: 1
  - FPE-LP-TITAN-1619 Fuel Pump Rebuild Kit for Nissan Titan XD with 5.0L Cummins
- **other: Dodge (Cummins) > 2019-2024 (6.7L) > Fuel System**: 1
  - FPE-FL-CUMM-67-5G-SET High Pressure Fuel Line Kit for the 2019-2024 6.7L Cummins
- **other: Turbos > Turbo Accessories**: 1
  - FPE-LML-RES LML Resonator Plate
- **other: Dodge (Cummins)**: 1
  - FPE-HBS-M820-M610 M8x1.25x20 Hex Bolt with M6x1.0x15 Stud
- **other: Dodge (Cummins) > 2013-2018 (6.7L) > Turbochargers > Turbo Accessories **: 1
  - FPE-34145 45 Degree Charge Air Hose
- **other: Dodge (Cummins) > 2013-2018 (6.7L) > Coolant Tank**: 1
  - FPE-CUMM-CLNT-TNK-1318 Replacement Coolant Tank for 2013-2018 Ram Pickups with 6.7L Cummins
- **other: Dodge (Cummins) > 1989-1998 (12V) > Heater Core Line Kit**: 1
  - FPE-CUMM-SSHCL-12V Replacement Heater Core Line Kit for 12-valve Cummins
- **other: Chevy/GMC (Duramax) > 2011-2016 (LML) > Tie Rod Sleeves**: 1
  - FPE-TIERODSLEEVES-LML Tie Rod Reinforcement Sleeves for 2011-2016 GM 2500-3500HD Pickups
- **other: Chevy/GMC (Duramax) > 2007.5-2010 (LMM) > Tie Rod Sleeves**: 1
  - FPE-TIERODSLEEVES Tie Rod Reinforcement Sleeves for 1999-2010 GM 2500-3500HD Pickups
- **other: Chevy/GMC (Duramax) > 2015-2021 Colorado/Canyon**: 1
  - FPE-TIERODSLEEVES-COL Tie Rod Sleeve Kit for 2015+ Colorado / Canyon
- **other: Chevy/GMC (Duramax) > 2004.5-2005 (LLY) > Hy-TufShafts**: 1
  - FPE-TUFSHAFTS TufShafts
- **other: Dodge (Cummins) > 2019-2024 (6.7L) > Coolant Tank**: 1
  - FPE-CUMM-CLNT-TNK-1924 Upgraded Replacement Coolant Tank for 2019-2024 Ram Pickups with 6.7L Cummins

## Needs human QA

Families not in `cam-fitment.json` (catalog wording kept in `fit.fam`):

- `Cummins ISX/QSX`: 2 record(s)
- `RAM 3.0 EcoDiesel`: 2 record(s)

Judgement calls:

- `hpCapable` is the vehicle power the page says the part supports (mostly quoted at the rear wheels, `hpBasis: RWHP`), not a rating of the part itself.
- Cheetah turbos are built on Holset / Garrett cores with Fleece's FMW compressor wheel; `condition` is 'remanufactured, core exchange' whenever the page carries a core charge, 'new' only when the name says Brand New.
- SureFlo 'performance sending units' are complete in-tank sending units with the PowerFlo pump built in; they are filed as `liftPump` with `type: in-tank sending unit with pump`.
- The LML 'CP3 conversion hardware kit (no pump)' is skipped; the conversion kits that include a CP3 are `injectionPump` with `kit: true`, `kitIncludesPump: true`.
- Heavy-duty Cummins ISX/QSX turbos are kept under `fit.fam: Cummins ISX/QSX` (not a shared family).

Per-record flags:

- FPE-34561: no usable Fitment tab; family from the breadcrumb: PowerFlo® Lift Pump for 2010 Dodge Ram Cummins -> ['Cummins 6.7']
- FPE-34771: no usable Fitment tab; family from the description: Fleece Performance Exhaust Manifold Stud Kit - 7mm External Hex Head -> ['Cummins 5.9 12V', 'Cummins 5.9 24V/CR', 'Cummins 6.7']
- FPE-34772: no usable Fitment tab; family from the description: Fleece Performance Exhaust Manifold Stud Kit - 4mm Allen Socket Head -> ['Cummins 5.9 12V', 'Cummins 5.9 24V/CR', 'Cummins 6.7']
- FPE-HE4-64: no usable Fitment tab; family from the name: Fleece Performance HE400VG / HE451VE Turbocharger for Cummins ISX/QSX - 64mm -> ['Cummins ISX/QSX']
- FPE-HE4-67: no usable Fitment tab; family from the name: Fleece Performance HE400VG / HE451VE Turbocharger for Cummins ISX/QSX - 67mm -> ['Cummins ISX/QSX']
- FPE-PF-CUMM-98-12V: no usable Fitment tab; family from the name: PowerFlo® Lift Pump for 1998 Dodge with 12-valve Cummins -> ['Cummins 5.9 12V']
- FPE-SF-CUMM-2010: no usable Fitment tab; family from the breadcrumb: SureFlo® Performance Sending Unit for 2010 Dodge Ram -> ['Cummins 6.7']

## Validation

Passed: no duplicate `p` within brand+family, every record has `m p cat name fit.fam src emissions`, numeric fields are numbers, years are integers, no empty strings or empty lists.
