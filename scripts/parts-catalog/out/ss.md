# S&S Diesel Motorsport — extraction notes

- Extracted 2026-10-16 from the WooCommerce Store API, `https://ssdiesel.com/wp-json/wc/store/v1/products?per_page=100&page=N` (parents) and the same URL with `&type=variation` (variations). The bare host is used: the `www` certificate does not match.
- `robots.txt` fetched first: the endpoint is allowed, no `Crawl-delay`. Requests 6 s apart, one at a time: 1 robots.txt + 1 parent page + 3 variation pages = 5 requests, plus one 1-item probe request made while confirming the endpoint. Raw JSON is kept under `dl/ss/` (gitignored); `--parse-only` re-runs from it.
- Store contents: 33 parent products (6 electronics, 2 feed tubes, 1 filter head, 2 fuel filter / bypass kit, 1 fuel rail, 14 injector, 7 pump) and 291 variations (276 used).
- 290 records emitted: 63 injectionPump (50 distinct part numbers), 227 injector (227 distinct part numbers).
- Prices (integer cents, full-set prices for injectors) are not stored. No descriptions or images are stored; `name` is a short factual phrase built from the variation and the specs.

## How the catalog maps to records

- **Injectors** (`injector`): one record per variation; `p` is the variation SKU (e.g. `LB7-100SAC-SET`). `spec.pctOver` is the nozzle-flow increase over stock from the Application term (the sizing convention S&S states: "% increase in nozzle flow over stock"); `Stock` and `SAC00` are 0. TorqueMaster sizes carry `spec.grade: "TorqueMaster"` and no `pctOver` (the site gives no percentage; the SKU code `10SAC`/`10VCO` is not interpreted). `spec.tip` is the nozzle style from the SKU (`SAC` sac-type, `VCO` valve-covered orifice). `spec.body` is the New/Reman Type attribute where the line offers both. `spec.nozzleFlow` (cc/min) is set only where the page states it for that size (BMW M57 100% = 2,250; 6.7 Cummins 200% = 3,600; 5.9 Cummins 250% = 3,700; LLY/LBZ/LMM 250% = 3,200). `spec.set: true`: every price and SKU is a full engine set. No HP ratings are published.
- **High-pressure pumps and CP4 conversions** (`injectionPump`): one record per variation. `spec.pump` is `CP3` or `DCR`; `plungerMm` is the plunger size (10/12/14 mm); `displacementMm3` (mm³/rev) and `flowLph` (Ordnance 560/650 L/hr) are taken from the product's own description lines; `highSpeed`, `rotation: reverse`, `series` (SuperSport / Ordnance), `supplyPump: SP3000` (+ `supplyFlowLph` 3000) for the bundled mechanical supply pump, `gearPumpDeletePlate` for the GPD bundles, `replacesOem: CP4.2` for conversion kits, `tuningRequired`, `pumpIncluded: false` for kit-only SKUs, `driveRatio` (RAM kits overdrive the pump 1.5× engine speed).
- `emissions`: `carb_eo:D-756-2` (LB7 SAC00 injectors), `carb_eo:D-756-4` (50-state LML CP3 conversion), `carb_eo:D-756-5` (2019-2020 RAM No-Tune CP3 conversion), `carb_eo:D-756-7` (Ford 6.7 DCR conversion); the two LML competition conversion kits are `no_eo_race_only` (the page says they are for competition applications without after-treatment); everything else is `unknown` (the site makes no statement). Counts: 2 carb_eo:D-756-2, 1 carb_eo:D-756-4, 1 carb_eo:D-756-5, 1 carb_eo:D-756-7, 2 no_eo_race_only, 283 unknown.
- Year ranges come from the product titles (`2007.5-2018` → `y0` 2007, `y1` 2018, half-year kept in `fit.notes`; `2017+` → `y0` 2017 only). The LML CP3 conversion uses the LML years from the site's own LML injector title (2011-2016). Cummins and Duramax high-pressure pumps (not conversions) state no years.

## Rows per category and family

| cat | fit.fam | rows |
|---|---|---|
| injectionPump | Cummins 5.9 24V/CR | 13 |
| injectionPump | Cummins 6.7 | 18 |
| injectionPump | Duramax 6.6 | 20 |
| injectionPump | Powerstroke 6.7 | 1 |
| injectionPump | Reverse Rotation High Pressure Pumps | 11 |
| injector | BMW M57 | 1 |
| injector | Cummins 5.9 24V/CR | 56 |
| injector | Cummins 6.7 | 20 |
| injector | Duramax 6.6 | 129 |
| injector | Powerstroke 6.4 | 6 |
| injector | Powerstroke 6.7 | 15 |

## Skipped

21 store items / variations / attribute terms were skipped:

- **accessory (FCA mounting block, not a pump)** (1): `GF-BLOCK` Reverse Rotation High Pressure Pumps / gForce Block
- **attribute term with no variation** (7): `id 21181` 2019-2020 RAM CP3 Conversions / RAM-CP3-14HS; `id 17588` Cummins High Pressure Pumps / Cummins 6.7 CP3; `id 17434` Duramax High Pressure Pumps / Duramax CP3 - LBZ based; `id 17422` 6.4L Ford Power Stroke (2008-2010) / Stock Motorcraft 6.0F injector; `id 17422` 6.4L Ford Power Stroke (2008-2010) / 30% over Motorcraft 6.0F injector; `id 17254` 6.7L Cummins Injectors (2007.5-2018) / 135% over 6.7C injector; `id 17191` LML Duramax CP3 Conversions / LML CP3 H/O Pump Option
- **electronics (MoTeC/Bosch ECUs, dashes, harnesses; no specs, contact for price)** (6): `id 21127` MoTeC C127 Digital Dash & Datalogger; `id 21113` MoTeC M141 Standalone ECU; `id 17458` Custom Wiring Harnesses; `id 17457` MoTeC M142 Standalone ECU; `DDU10` Bosch Motorsport DDU10 Digital Dash & Datalogger; `MS25Sport` Bosch Motorsport MS25 Sport Standalone ECU
- **fuel filter housing / CP4 bypass kit (no record category)** (2): `id 66353` Ford 6.7L Fuel Leak Prevention Kit (LPK); `id 17431` Gen2.1 6.7L Ford Power Stroke CP4 Disaster Prevention Kit
- **fuel rail (no record category; no part number in the store)** (1): `id 66278` Double-Barrel Fuel Rail
- **injector feed tubes (no record category)** (2): `id 20682` 6.7L Cummins Injector Feed Tubes; `id 20680` 5.9L Cummins Injector Feed Tubes
- **regulated filter head (no record category)** (1): `FDS-RFH-ASM` Regulated Filter Head
- **variation without a part number** (1): `id 21098` BMW M57 Piezo Injector (2009-2013) / custom

## Needs human QA

- Families not in the cam-fitment vocabulary (catalog heading kept in `fit.fam`):
  - `BMW M57` (1 PNs): `BMW-M57-2250`
  - `Reverse Rotation High Pressure Pumps` (11 PNs): `CP3-RR-10`, `CP3-RR-10-HS`, `CP3-RR-12-HS`, `CP3-RR-12-HS-SP`, `CP3-RR-14-HS`, `CP3-RR-14-HS-SP`, `CP3-RR-SS`, `RR-CP3-ORD560-GPD`, `RR-CP3-ORD560-SP`, `RR-CP3-ORD650-GPD`, `RR-CP3-ORD650-SP`
- **Cummins High Pressure Pumps** (`CP3-CU-*`, `6.7C-CP3-ORD*`) state no engine years; they are emitted for both `Cummins 5.9 24V/CR` and `Cummins 6.7` (the CP3 is the stock pump on 2003-2018 common-rail Cummins). The Ordnance variants are described as "6.7L-based". The attribute term "Cummins 6.7 CP3" has no variation behind it.
- **Duramax High Pressure Pumps** (`CP3-DMX-*`, `LBZ-CP3-ORD*`) are LBZ-based CP3s with no years stated; `fit.y0/y1` are omitted. They fit CP3-equipped (LB7-LMM) trucks or LML/L5P trucks with a CP3 conversion.
- **Reverse Rotation High Pressure Pumps** are front-mount competition pumps with no engine stated; `fit.fam` keeps the product heading. The `GF-BLOCK` (gForce FCA mounting block) variation is skipped as an accessory.
- **Ford 6.7L DCR Pump Conversion**: the `Model Year` attribute says 2011-2024 but the description says "fits 2011 to 2026"; the description is used (`y1` 2026).
- **6.4L Ford Power Stroke (2008-2010)** lists two 6.0L Motorcraft injector terms in its Application attribute with no variations behind them; they are skipped (listed above), so no `Powerstroke 6.0` rows.
- **2019-2020 RAM CP3 Conversions**: the variation SKU fields are empty; the Applications terms (`RAM-CP3-NOTUNE`, `RAM-CP3-SS`, `RAM-CP3-10HS`, `RAM-CP3-12HS`, `RAM-CP3-KIT`) are used as `p`. `RAM-CP3-14HS` is listed in the attribute but has no variation.
- **LML Duramax CP3 Conversions** SKUs are hand-typed in the store and copied verbatim after entity decoding: `LML-CP3 w/o pump`, `LML-CP3-TuningReq'd`, `LML-CP3-NoTuningReq'd`, `LML-CP3-CARB`. The "H/O Pump Option" term has no variation.
- TorqueMaster injectors: the site gives no % over stock. The 2019-2021 6.7 Cummins line has Standard Output and High Output TorqueMaster sets (`-SO-`/`-HO-`), recorded in `fit.notes`.
- `emissions: unknown` on the over-stock injector sizes and competition pumps is the site's silence, not a statement; treat these as not emissions-certified when linking.
- part number taken from the Applications term (variation SKU field empty): `RAM-CP3-NOTUNE`, `RAM-CP3-SS`, `RAM-CP3-10HS`, `RAM-CP3-12HS`, `RAM-CP3-KIT`
- SKU contains spaces, copied verbatim: `LML-CP3 w/o pump`
- pctOver 45 inferred from the SAC45 name/SKU: `LB7-45SAC-SET`, `LB7-45SAC-R-SET`
- Validation passed: every record has `m p cat fit.fam src`, no duplicate `p` within a family, numeric fields are numbers, no empty strings, `emissions` values are from the allowed set.
