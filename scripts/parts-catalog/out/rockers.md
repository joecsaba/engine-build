# ROCKERS extraction notes (Scorpion Racing Products + Harland Sharp)

Extracted 2026-10-16 by `extract_rockers.py`. Source: public Shopify `/products.json?limit=250&page=N` on both hosts. robots.txt fetched first for each host: neither disallows `/products.json` and neither sets a Crawl-delay; requests were spaced 6 s apart.

## Fetch

- `scorpionracingproducts.com`: 3 page request(s) + robots.txt, 538 products
- `harlandsharp.com`: 1 page request(s) + robots.txt, 103 products

## Records

Total records: **1015**

| brand | cat | records |
|---|---|---|
| Harland Sharp | fastener | 11 |
| Harland Sharp | rocker | 449 |
| Scorpion | fastener | 23 |
| Scorpion | rocker | 532 |

Rows per engine family (a part that fits several families is one record per family with the same `p`):

| brand | fit.fam | records |
|---|---|---|
| Harland Sharp | AMC V8 | 14 |
| Harland Sharp | AMC/Jeep inline-6 | 9 |
| Harland Sharp | BMC A-series 1275 *(not in cam-fitment.json)* | 6 |
| Harland Sharp | BMC A-series 948-1100 *(not in cam-fitment.json)* | 4 |
| Harland Sharp | BMC B-series (MGB) *(not in cam-fitment.json)* | 4 |
| Harland Sharp | Buick V6 181-252 | 6 |
| Harland Sharp | Buick big block | 3 |
| Harland Sharp | Chevy Corvair *(not in cam-fitment.json)* | 5 |
| Harland Sharp | Chevy Gen VI big block | 13 |
| Harland Sharp | Chevy Mark IV big block | 13 |
| Harland Sharp | Chevy inline-6 | 4 |
| Harland Sharp | Dodge Magnum 3.9 V6 *(not in cam-fitment.json)* | 4 |
| Harland Sharp | Dodge Viper V10 *(not in cam-fitment.json)* | 2 |
| Harland Sharp | Ford 240/300 inline-6 | 4 |
| Harland Sharp | Ford 3.8/4.2 V6 *(not in cam-fitment.json)* | 4 |
| Harland Sharp | Ford 351C/351M/400 | 12 |
| Harland Sharp | Ford 429/460 | 12 |
| Harland Sharp | Ford CVH 1.9 inline-4 *(not in cam-fitment.json)* | 4 |
| Harland Sharp | Ford FE | 5 |
| Harland Sharp | GM LS | 19 |
| Harland Sharp | Mopar B/RB big block | 43 |
| Harland Sharp | Mopar LA small block | 26 |
| Harland Sharp | Mopar Magnum 5.2/5.9 | 12 |
| Harland Sharp | Oldsmobile V8 | 14 |
| Harland Sharp | Pontiac V8 | 14 |
| Harland Sharp | Small-block Chevy | 78 |
| Harland Sharp | Small-block Ford (Windsor) | 101 |
| Harland Sharp | Triumph Spitfire/Herald 4-cyl *(not in cam-fitment.json)* | 6 |
| Harland Sharp | Triumph TR4 *(not in cam-fitment.json)* | 3 |
| Harland Sharp | Triumph TR6 inline-6 *(not in cam-fitment.json)* | 6 |
| Harland Sharp | Universal *(not in cam-fitment.json)* | 10 |
| Scorpion | AMC V8 | 24 |
| Scorpion | AMC/Jeep inline-6 | 4 |
| Scorpion | Chevy Gen VI big block | 35 |
| Scorpion | Chevy Mark IV big block | 35 |
| Scorpion | Ford 240/300 inline-6 | 1 |
| Scorpion | Ford 3.8/4.2 V6 *(not in cam-fitment.json)* | 2 |
| Scorpion | Ford 351C/351M/400 | 12 |
| Scorpion | Ford 429/460 | 23 |
| Scorpion | GM LS | 48 |
| Scorpion | Mopar Magnum 5.2/5.9 | 5 |
| Scorpion | Oldsmobile V8 | 26 |
| Scorpion | Pontiac V8 | 8 |
| Scorpion | Small-block Chevy | 210 |
| Scorpion | Small-block Ford (Windsor) | 99 |
| Scorpion | Universal *(not in cam-fitment.json)* | 23 |

## How fields were derived

- **Scorpion**: one product = one SKU (every product has a single `Default Title` variant). Ratio, stud size, mount type, offset and set count are regexed from the title first, then from the body's lead-in sentence(s) (the body before the boilerplate 'Specific features include' / 'Rockers for this engine...'). Engine family from title tokens (SBC/BBC/SBF/BBF/LS/AMC/Jeep/Olds/Pontiac/SB Chrysler), then body, then tags. BBC rockers are emitted for both `Chevy Mark IV big block` and `Chevy Gen VI big block`; BBF rockers whose body lists 351C/351M/400 are also emitted for `Ford 351C/351M/400`.
- **Harland Sharp**: one product = one application group; each variant is a SKU with the ratio in the variant title (`1.6:1`, also the site's `1.6.1` typo form and split sets `1.5/1.6`). One record per variant SKU. Series (Original / Heavy Duty / Diamond) from the product-title prefix. Fitment years and the short `fit.notes` phrase come from the body's `Fits:` lead-in.
- `spec.type`: `stud` / `pedestal` / `shaft`. `spec.stud` is the stud or pedestal-bolt diameter in inches (8 mm bolts stored as 0.315 with `studMetric: "M8"`). Shaft-mount rockers have no `stud`.
- Extra `spec` keys beyond the brief's `ratio stud type material`: `ratioExh` (split-ratio sets; the intake ratio is in `ratio`), `series`, `adjustable`, `offset` (inches), `offsetSide` (`L`/`R`), `valve` (`intake`/`exhaust` when a single piece is valve-specific), `qty` (pieces, Scorpion) / `pack` (`set`/`pair`/`single`, Harland Sharp).
- Polylocks, rocker nuts, rocker/stand bolts and stud-girdle nuts are emitted as `fastener` with `fit.fam: "Universal"` (Harland Sharp BK7001 shaft bolts: `Mopar B/RB big block`).
- Prices are not stored. `emissions` is `null` throughout (internal parts).

## Skipped

- **Harland Sharp** — ball style adjusters (no category): 1
  - Ball Style Adjusters (2 variants)
- **Harland Sharp** — cup style adjusters (no category): 1
  - Cup Style Adjusters (4 variants)
- **Harland Sharp** — ford "fe" center stand set (no category): 1
  - Ford "FE" Center Stand Set- Bronze bushed Kits (1 variants)
- **Harland Sharp** — ford "fe" end stand set (no category): 1
  - Ford "FE" End Stand Set- Bronze Bushed Kit (1 variants)
- **Harland Sharp** — ford "fe" spacer kit (no category): 1
  - Ford "FE" Spacer Kits- Bronze Bushed Or Needle Bearing (2 variants)
- **Harland Sharp** — gift cards (no category): 1
  - Harland Sharp Gift Cards (7 variants)
- **Harland Sharp** — hold downs (no category): 1
  - Hold Downs (2 variants)
- **Harland Sharp** — ls1/ls6 conversion kit (no category): 1
  - LS1/LS6 Conversion Kit (8 variants)
- **Harland Sharp** — pedestal/bolt/adjuster/shaft variant inside rocker product: 14
  - 71620SK: 71620SK- 4 Pack replacement adjusters & jam nuts- $68.00
  - RS-7680: 9/16 OD X 11.75 Long, Single Hole, BMC 1275 Shaft- $82.00
  - BK7001: BK7001- BB Mopar Bolt Kit- $26.00
  - PD-5105: PD-5105- Individual Pedestal- $3.00 each (.750 Tall)
  - PD-5101: PD-5101- Individual Pedestal- $3.00 each (.570 Tall)
  - PD-5102: PD-5102- Individual Pedestals (.630 Tall)- $3.00 each
  - PD-5105: PD-5105- Individual Pedestal- $3.00 Each (.750 Tall)
  - PD-5105: PD-5105- Individual Pedestal- $3.00 each (.750 Tall)
  - PD-5201: PD-5201- Individual Pedestal- $3.00 Each (.600 Tall)
  - PD-5108: PD-5108- Individual Pedestal- $3.00 Each (.875 Tall)
  - PD-5131: PD-5131- Individual Pedestal- $3.00 Each (.560 Tall Cradle)
  - PD-5102: PD-5102- Individual Pedestal- $3.00 Each (.630 Tall)
  - ... 2 more
- **Harland Sharp** — shafts (no category): 1
  - Shafts (12 variants)
- **Harland Sharp** — spacers (no category): 1
  - Spacers For 7/8 Mopar Shaft Kits (8 variants)
- **Harland Sharp** — stands (no category): 1
  - Stands (3 variants)
- **Harland Sharp** — stud girdle (no category): 4
  - Big Block Ford Stud Girdle (2 variants)
  - Small Block Ford Stud Girdle (8 variants)
  - Big Block Chevy Stud Girdle (3 variants)
  - Small Block Chevy Stud Girdle (3 variants)
- **Harland Sharp** — t-shirts (no category): 1
  - Harland Sharp T-Shirts (12 variants)
- **Scorpion** — fuel rail (no category): 5
  - SCP7700-GRKT GM LS7 Intake Manifold Fuel Rail Kit Scorpion Racing Products
  - SCP7401-GRKT Big Block Chevy Fuel Rail Kit Scorpion Racing Products
  - SCP7400-GRKT SBC Fuel Rail Kit Edelbrock Victor EFI Manifold 29785 Scorpion Racing Products
  - SCP7300-GRKT GM-LS3, L76, L92 and L99 Fuel Rail Kit Scorpion Racing Products
  - SCP7000-GRKT Chevrolet LS1 and LS6 Fuel Rail Kit Scorpion Racing Products
- **Scorpion** — stud girdle (no category): 5
  - SCP9005-GRKT SBF Stud Girdle 3/8 Inch Clamp On Scorpion Racing Products
  - SCP9004-GRKT SBC Stud Girdle 3/8 Inch Scorpion Racing Products
  - SCP9002-GRKT SBF Stud Girdle 7/16 Inch Scorpion Racing Products
  - SCP9001-GRKT SBC Stud Girdle 7/16 Inch Scorpion Racing Products
  - SCP9000-GRKT BBC Stud Girdle 7/16 Inch Scorpion Racing Products
- **Scorpion** — valvetrain hardware (pedestal/shim/stand/shaft/adjuster/U-channel): 20
  - SCPUCHAN-8-GRKT U-Channels Sold as 8 Scorpion Racing Products
  - SCPUCHAN-1-GRKT U-Channels Sold As 1 Scorpion Racing Products
  - SCPSTND2301-1-GRKT Shaft Mount Rocker Arm Stand 23 Degree Head Scorpion Racing Products
  - SCPSHF2301-1-GRKT Rocker Arm Shaft 23 Degree Head 1 Shaft 4 Snap Rings Scorpion Racing Products
  - SCPLS1H-1-GRKT LS1 Hardware Kit 4140 Machined Steel Black Oxide Coating Scorpion Racing Products
  - SCPL92PED-4-GRKT L-92 Rocker Arm Pedestal Set of 4 Scorpion Racing Products
  - SCPL92PED-1-GRKT Chevy L92, LS3 Pedestal Mount Rocker Arms Scorpion Racing Products
  - SCPADJSMR-1-GRKT Rocker Arm Adjuster Assembly Scorpion Racing Products
  - SCP516PED-4-GRKT 5/16 Inch Rocker Arm Pedestal Sold as 4 Scorpion Racing Products
  - SCP516PED-16-GRKT 5/16 Inch Rocker Arm Pedestal Sold As 16 Scorpion Racing Products
  - SCP516PED-1-GRKT 5/16 Inch Rocker Arm Pedestal Mount Each Scorpion Racing Products
  - SCP3220SM-GRKT Rocker Arm Shims .20 Inch Scorpion Racing Products
  - ... 8 more

## Duplicate SKUs merged (same brand + part number + family; first occurrence kept)

Harland Sharp lists the same individual exhaust rocker (e.g. `L70015-1`) under several Big Block Mopar head products; Scorpion has a few near-duplicate listings with one SKU.

- Harland Sharp L70025W2-1 [Mopar LA small block]: kept '1.5 ratio roller rocker, shaft mount, intake, 0.775 offset L, single, W2 / W5 Race' / dropped '1.5 ratio roller rocker, shaft mount, intake, 0.775 offset L, single, Chrysler W2 Econo Heads'
- Harland Sharp R70025W2-1 [Mopar LA small block]: kept '1.5 ratio roller rocker, shaft mount, intake, 0.775 offset R, single, W2 / W5 Race' / dropped '1.5 ratio roller rocker, shaft mount, intake, 0.775 offset R, single, Chrysler W2 Econo Heads'
- Harland Sharp L70026W2-1 [Mopar LA small block]: kept '1.6 ratio roller rocker, shaft mount, intake, 0.775 offset L, single, W2 / W5 Race' / dropped '1.6 ratio roller rocker, shaft mount, intake, 0.775 offset L, single, Chrysler W2 Econo Heads'
- Harland Sharp R70026W2-1 [Mopar LA small block]: kept '1.6 ratio roller rocker, shaft mount, intake, 0.775 offset R, single, W2 / W5 Race' / dropped '1.6 ratio roller rocker, shaft mount, intake, 0.775 offset R, single, Chrysler W2 Econo Heads'
- Harland Sharp 70025-1 [Mopar LA small block]: kept '1.5 ratio roller rocker, shaft mount, exhaust, single, Chrysler W2 Econo Heads' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, single, Chrysler Trans Am Heads'
- Harland Sharp 70026-1 [Mopar LA small block]: kept '1.6 ratio roller rocker, shaft mount, exhaust, single, Chrysler W2 Econo Heads' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, single, Chrysler Trans Am Heads'
- Harland Sharp 70025-1 [Mopar LA small block]: kept '1.5 ratio roller rocker, shaft mount, single, Small Block Mopar V8' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, single, Chrysler W2 Econo Heads'
- Harland Sharp 70026-1 [Mopar LA small block]: kept '1.6 ratio roller rocker, shaft mount, single, Small Block Mopar V8' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, single, Chrysler W2 Econo Heads'
- Harland Sharp L70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, exhaust, left, single, Indy 440-1' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, left, single, Edelbrock Victor'
- Harland Sharp R70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, exhaust, right, single, Indy 440-1' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, right, single, Edelbrock Victor'
- Harland Sharp L70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, exhaust, left, single, Indy 440-1' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, left, single, Edelbrock Victor'
- Harland Sharp R70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, exhaust, right, single, Indy 440-1' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, right, single, Edelbrock Victor'
- Harland Sharp L70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, exhaust, left, single, Indy 440-1' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, left, single, Brodix B1BS'
- Harland Sharp R70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, exhaust, right, single, Indy 440-1' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, right, single, Brodix B1BS'
- Harland Sharp L70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, exhaust, left, single, Indy 440-1' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, left, single, Brodix B1BS'
- Harland Sharp R70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, exhaust, right, single, Indy 440-1' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, right, single, Brodix B1BS'
- Harland Sharp L70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, left, single, Stage IV - Stage VI Heads' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, left, single, Indy 440-1'
- Harland Sharp R70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, right, single, Stage IV - Stage VI Heads' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, right, single, Indy 440-1'
- Harland Sharp L70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, left, single, Stage IV - Stage VI Heads' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, left, single, Indy 440-1'
- Harland Sharp R70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, right, single, Stage IV - Stage VI Heads' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, right, single, Indy 440-1'
- Harland Sharp L70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, left, single, Stage IV - Stage VI Heads' / dropped '1.5 ratio roller rocker, shaft mount, left, single, Big Block Mopar V8'
- Harland Sharp R70015-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, right, single, Stage IV - Stage VI Heads' / dropped '1.5 ratio roller rocker, shaft mount, right, single, Big Block Mopar V8'
- Harland Sharp L70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, left, single, Stage IV - Stage VI Heads' / dropped '1.6 ratio roller rocker, shaft mount, left, single, Big Block Mopar V8'
- Harland Sharp R70016-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, right, single, Stage IV - Stage VI Heads' / dropped '1.6 ratio roller rocker, shaft mount, right, single, Big Block Mopar V8'
- Harland Sharp L70015E-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, left, single, Big Block Mopar V8' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, left, single, Edelbrock Victor- Max Wedge Heads'
- Harland Sharp R70015E-1 [Mopar B/RB big block]: kept '1.5 ratio roller rocker, shaft mount, right, single, Big Block Mopar V8' / dropped '1.5 ratio roller rocker, shaft mount, exhaust, right, single, Edelbrock Victor- Max Wedge Heads'
- Harland Sharp L70016E-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, left, single, Big Block Mopar V8' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, left, single, Edelbrock Victor- Max Wedge Heads'
- Harland Sharp R70016E-1 [Mopar B/RB big block]: kept '1.6 ratio roller rocker, shaft mount, right, single, Big Block Mopar V8' / dropped '1.6 ratio roller rocker, shaft mount, exhaust, right, single, Edelbrock Victor- Max Wedge Heads'
- Harland Sharp 4102-1 [Small-block Ford (Windsor)]: kept '1.6 ratio roller rocker, Original series, single, Small Block Ford Trickflow "R"' / dropped '1.6 ratio roller rocker, Original series, single, Small Block Ford Trickflow "R"'
- Harland Sharp 4103-1 [Small-block Ford (Windsor)]: kept '1.7 ratio roller rocker, Original series, single, Small Block Ford Trickflow "R"' / dropped '1.7 ratio roller rocker, Original series, single, Small Block Ford Trickflow "R"'
- Harland Sharp 4101-1 [Small-block Ford (Windsor)]: kept '1.5 ratio roller rocker, Original series, single, Small Block Ford Trickflow "R"' / dropped '1.5 ratio roller rocker, Original series, single, Small Block Ford Edelbrock Victor Jr.'
- Harland Sharp 4102-1 [Small-block Ford (Windsor)]: kept '1.6 ratio roller rocker, Original series, single, Small Block Ford Trickflow "R"' / dropped '1.6 ratio roller rocker, Original series, single, Small Block Ford Edelbrock Victor Jr.'
- Harland Sharp 4103-1 [Small-block Ford (Windsor)]: kept '1.7 ratio roller rocker, Original series, single, Small Block Ford Trickflow "R"' / dropped '1.7 ratio roller rocker, Original series, single, Small Block Ford Edelbrock Victor Jr.'
- Harland Sharp 1004-1 [Small-block Chevy]: kept '1.5 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes' / dropped '1.5 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.150 Offset Intakes'
- Harland Sharp 1005-1 [Small-block Chevy]: kept '1.6 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes' / dropped '1.6 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.150 Offset Intakes'
- Harland Sharp 1006-1 [Small-block Chevy]: kept '1.65 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes' / dropped '1.65 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.150 Offset Intakes'
- Harland Sharp 1004-1 [Small-block Chevy]: kept '1.5 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes' / dropped '1.5 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.050 Offset Intakes'
- Harland Sharp 1005-1 [Small-block Chevy]: kept '1.6 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes' / dropped '1.6 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.050 Offset Intakes'
- Harland Sharp 1006-1 [Small-block Chevy]: kept '1.65 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes' / dropped '1.65 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.050 Offset Intakes'
- Harland Sharp 1004-1 [Small-block Chevy]: kept '1.5 ratio roller rocker, 0.4375 stud, Original series, single, Small Block Chevrolet - 7/16 Stud' / dropped '1.5 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes'
- Harland Sharp 1005-1 [Small-block Chevy]: kept '1.6 ratio roller rocker, 0.4375 stud, Original series, single, Small Block Chevrolet - 7/16 Stud' / dropped '1.6 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes'
- Harland Sharp 1006-1 [Small-block Chevy]: kept '1.65 ratio roller rocker, 0.4375 stud, Original series, single, Small Block Chevrolet - 7/16 Stud' / dropped '1.65 ratio roller rocker, 0.4375 stud, Original series, exhaust, single, Small Block Chevrolet - 7/16 Stud w/.250 Offset Intakes'

## Needs human QA

Families not in `cam-fitment.json` (catalog heading kept in `fit.fam`):

- `BMC A-series 1275`: 6 record(s)
- `BMC A-series 948-1100`: 4 record(s)
- `BMC B-series (MGB)`: 4 record(s)
- `Chevy Corvair`: 5 record(s)
- `Dodge Magnum 3.9 V6`: 4 record(s)
- `Dodge Viper V10`: 2 record(s)
- `Ford 3.8/4.2 V6`: 6 record(s)
- `Ford CVH 1.9 inline-4`: 4 record(s)
- `Triumph Spitfire/Herald 4-cyl`: 6 record(s)
- `Triumph TR4`: 3 record(s)
- `Triumph TR6 inline-6`: 6 record(s)

Judgement calls:

- Scorpion 'SB Chrysler 5/16 pedestal mount' rockers are filed under `Mopar Magnum 5.2/5.9` (5/16 pedestal-bolt rockers are the Magnum head pattern; LA heads are shaft-mount). Verify.
- Split-ratio sets written without i/e letters (Scorpion `1.6/1.65 SBF Shaft Mount`, `1.7/1.8 Ratio` on the LS steel-body sets; Harland Sharp `1.5/1.6 Set`, `1.7/1.8 Set`, `Split Ratio Set`) are stored as `ratio` = first number, `ratioExh` = second. Verify the intake/exhaust order with each manufacturer.
- Harland Sharp `fit.y0/y1` span every year range in the `Fits:` line (e.g. '1997 to 2004 LS1/LS6 & 2005 to Present LS2/LS4' gives y0 1997 and no y1). Lines that mix several engines (Triumph/BMC, Chevy inline 6 + 153 four) keep the span of whatever years are printed; read `fit.notes` for the detail.
- Harland Sharp pedestal-mount products (Olds/AMC/Magnum/Viper/Ford V6) do not state the pedestal bolt size, so `stud` is omitted; `type: pedestal` comes from the site's Pedestal tag or body text.
- Harland Sharp series (`Original` / `Heavy Duty` / `Diamond`) is taken only from the product-title prefix. The site's vendor field is ignored: shaft systems carry vendor 'Original' and the Original Pontiac product carries vendor 'Diamond'.
- Scorpion LS shaft-rocker sets are tagged Chevrolet, General Motors, Holden and Pontiac on the site; they are filed under `GM LS` only.
- Harland Sharp SBF head-specific Original rockers (4101–4703 series) do not state stud size or mount type on the site; `type`/`stud` are omitted for them.
- Harland Sharp site data has SKU/title mismatches (variant SKU differs from the PN printed in the variant title). The SKU field was kept; each case is listed below.
- Scorpion `qty` is parsed from 'Set of N' / 'Pair' / singular 'Rocker Arm'; records without it had no count in title or body lead-in.

Per-record flags:

- Scorpion SCP1005-1-GRKT: mount type inferred from 0.4375 size: 1.3 SBC Race Series Rocker Arm 7/16 Inch Scorpion Racing Products
- Scorpion SCP0503-1-GRKT: mount type not stated: 1.7 Jeep Off-Road Series Rocker Arms Adjustable Scorpion Racing Products
- Harland Sharp L70016-1: ratio taken from same SKU elsewhere: 'L70016-1 $52.15' (Stage IV - Stage VI Heads)
- Harland Sharp R70016-1: ratio taken from same SKU elsewhere: 'R70016-1 $52.15' (Stage IV - Stage VI Heads)
- Harland Sharp: variant without SKU, PN taken from title: 'S40197- 1.7:1 4.0L Set- $553.00 (Non Adjustable)' (AMC/Jeep Inline 6)
- Harland Sharp: variant without SKU, PN taken from title: 'S40197A- 1.7:1 4.0L Set- $653.00 (Adjustable)' (AMC/Jeep Inline 6)
- Harland Sharp S4201: variant title starts with a different PN 'S4101' (ORIGINAL Small Block Ford Trickflow Highport)
- Harland Sharp 4201-1: variant title starts with a different PN '4101-1' (ORIGINAL Small Block Ford Trickflow Highport)
- Harland Sharp 4101-1: variant title starts with a different PN '4401-1' (ORIGINAL Small Block Ford Trickflow "R")
- Harland Sharp 4102-1: variant title starts with a different PN '4402-1' (ORIGINAL Small Block Ford Trickflow "R")
- Harland Sharp 4103-1: variant title starts with a different PN '4403-1' (ORIGINAL Small Block Ford Trickflow "R")

## Validation

Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src`, numeric fields are numbers, no empty strings.
