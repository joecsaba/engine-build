# Scat Crankshafts — extraction notes

- Extracted 2026-10-16 from the WooCommerce Store API, `https://www.scatcrankshafts.com/wp-json/wc/store/v1/products?per_page=100&page=N` (parents) and the same URL with `&type=variation` (variations).
- `robots.txt` fetched first: the endpoint is allowed, no `Crawl-delay`. Requests 6 s apart, one at a time: 1 robots.txt + 12 parent pages + 8 variation pages = 21 requests (one extra probe request was made while confirming the variation endpoint). Raw JSON is kept under `dl/scat/` (gitignored); the extractor is resumable from it.
- Store contents: 1128 parent products (2 apparel, 978 assembly, 79 crank, 18 damper, 51 rod) and 730 variations (640 used).
- 1837 records emitted: 406 crank (384 distinct part numbers), 323 rod (274 distinct part numbers), 1108 rotatingAssembly (978 distinct part numbers).
- A part that fits several families is emitted once per family with the same `p`, so the record count exceeds the part-number count.

## How the catalog maps to records

- **Rotating assemblies** are simple products (one SKU each). `spec` carries the component part numbers (`crankPn`, `rodPn`, `pistonPn`, `ringPn`, `mainBearingPn`, `rodBearingPn`, `damperPn`, `flexplatePn`), stroke, rod length, bore, oversize, piston top (`pistonTop`), piston dome cc (`domeCc`, negative = dish), the chamber cc the catalog quotes compression for (`chamberCc`), piston maker and class, balance, crank material, rod beam, pin end. The catalog does not state the compression ratio itself. `fit.ci` is the built displacement (the `CI` attribute).
- **Crankshafts**: 71 variable parents + 8 simple. One record per variation; `p` is the variation SKU (e.g. `4-350-3750-6000-20`), and the variation string (Stroke, Rod Length, Rod Journal, Engine, Rear Main Seal, Balance, Type) overrides the parent attributes. A parent attribute with several values that the variation does not resolve (often `Balance`, sometimes `Rear Main Seal`) is omitted rather than guessed. Scat's crank "Rod Length" is the rod-length designation in the part number (the crank is clearanced for that rod length); it is stored as `minRodLength`. `snout` is stored only when it is not "Standard" (`big block chevy`, `boss 429`, `dry sump`, `ls7`). No main-journal, bobweight, or flywheel-bolt data is published through the API.
- **Connecting rods**: 41 variable parents + 10 simple. One record per variation. `journal` is the crank rod-journal diameter the rod fits (Scat lists that, not the housing bore, so `bigEnd` is omitted); `bigEndWidth`, `pin`, `beam`, `material`, `bolt` (size + ARP grade + cap style), `pinEnd` (bushed/floating/pressed), `series` (Pro Sport / Pro Series / Pro Stock / Stock Replacement). Rod weight is not published.
- `fit.y0`/`fit.y1` are set only for the Chevy families where the rear-seal style implies them (SBC 2-pc 1955–85, 1-pc 1986–2002; Mark IV 1965–90; Gen V/VI 1991+).
- No prices, descriptions or images are stored. `name` is a short factual phrase built from the specs.

## Rows per category and family

| cat | fit.fam | rows |
|---|---|---|
| crank | AMC/Jeep inline-6 | 1 |
| crank | Buick V6 181-252 | 2 |
| crank | Chevy 8.1L Vortec big block | 2 |
| crank | Chevy Gen VI big block | 7 |
| crank | Chevy Mark IV big block | 65 |
| crank | Chevy W-series 348/409 | 1 |
| crank | Chrysler 426 Hemi | 22 |
| crank | Chrysler Gen III Hemi 6.2/6.4 | 3 |
| crank | Ford 351C/351M/400 | 23 |
| crank | Ford 4.2L V6 | 1 |
| crank | Ford 429/460 | 21 |
| crank | Ford FE | 5 |
| crank | Ford Flathead V8 | 7 |
| crank | Ford Model A/B/T four | 13 |
| crank | Ford Modular | 1 |
| crank | GM LS | 29 |
| crank | GM LT (Gen V) | 4 |
| crank | GMC 6.5L diesel | 1 |
| crank | Holden V8 | 7 |
| crank | Honda | 1 |
| crank | Mopar B/RB big block | 24 |
| crank | Mopar LA small block | 16 |
| crank | Oldsmobile V8 | 2 |
| crank | Pontiac V8 | 5 |
| crank | Small-block Chevy | 110 |
| crank | Small-block Ford (Windsor) | 32 |
| crank | Subaru | 1 |
| rod | AMC V8 | 2 |
| rod | AMC/Jeep inline-6 | 2 |
| rod | Audi/VW | 2 |
| rod | Buick V6 181-252 | 2 |
| rod | Chevy Gen VI big block | 32 |
| rod | Chevy Mark IV big block | 32 |
| rod | Chevy inline-6 | 2 |
| rod | Chrysler 426 Hemi | 10 |
| rod | Chrysler Gen III Hemi 5.7/6.1 | 2 |
| rod | Chrysler Gen III Hemi 6.2/6.4 | 2 |
| rod | Fiat | 1 |
| rod | Ford 429/460 | 2 |
| rod | Ford FE | 2 |
| rod | Ford Flathead V8 | 3 |
| rod | Ford Kent / Cosworth four | 1 |
| rod | Ford Model A/B/T four | 3 |
| rod | Ford Modular | 8 |
| rod | Ford inline-6 turbo (Barra) | 1 |
| rod | GM LS | 12 |
| rod | Holden V8 | 5 |
| rod | Honda | 16 |
| rod | Mazda | 1 |
| rod | Mitsubishi | 2 |
| rod | Mopar B/RB big block | 12 |
| rod | Mopar LA small block | 5 |
| rod | Mopar Magnum 5.2/5.9 | 5 |
| rod | Nissan | 7 |
| rod | Oldsmobile V8 | 2 |
| rod | Peugeot | 1 |
| rod | Pontiac Le Mans / Daewoo | 1 |
| rod | Pontiac V8 | 4 |
| rod | Saturn | 1 |
| rod | Small-block Chevy | 102 |
| rod | Small-block Ford (Windsor) | 26 |
| rod | Subaru | 3 |
| rod | Toyota | 4 |
| rod | VW | 4 |
| rod | Vauxhall | 1 |
| rotatingAssembly | AMC/Jeep inline-6 | 4 |
| rotatingAssembly | Buick V6 181-252 | 2 |
| rotatingAssembly | Chevy Gen VI big block | 130 |
| rotatingAssembly | Chevy Mark IV big block | 130 |
| rotatingAssembly | Chevy W-series 348/409 | 8 |
| rotatingAssembly | Chrysler Gen III Hemi 5.7/6.1 | 18 |
| rotatingAssembly | Ford 351C/351M/400 | 10 |
| rotatingAssembly | Ford 429/460 | 48 |
| rotatingAssembly | Ford FE | 72 |
| rotatingAssembly | Ford Flathead V8 | 20 |
| rotatingAssembly | Ford Modular | 16 |
| rotatingAssembly | GM LS | 166 |
| rotatingAssembly | Mopar B/RB big block | 26 |
| rotatingAssembly | Mopar LA small block | 38 |
| rotatingAssembly | Pontiac V8 | 16 |
| rotatingAssembly | Small-block Chevy | 258 |
| rotatingAssembly | Small-block Ford (Windsor) | 146 |

## Skipped products

20 store items were skipped:

- **apparel** (2): `95076` Procar Hat; `95075` SCAT Crankshafts Hat
- **flexplate/damper/counterweight (not in SCAT task scope)** (18): `SCA9122` Counter weight for Oldsmobile V8; `SCA9114` Counter weight for ’72 – ’73 340 SB Chrysler; `SCA9113` Counter weight for ’93-’97 360 SB Chrysler; `SCA9112` Counter weight for ’71-’92 360 SB Chrysler; `SCA9107` Counter weight for late SB Ford (50 oz. In.); `SCA9106` Counter weight for early SB Ford (28.4 oz. In.); `SCA9105` Counter weight for Big Block 454/502; `SCA9103` Counter weight for Chevy SB 400 – 8″ Diameter; `SCA9101` Counter weight for SB 400 – 6 3/4″ Diameter; `SCA8108` Small Block Ford Spacer – 0.875″ Thick; `SCA8107` Small Block Ford Spacer (’80 and Later) – 0.95″ Thick; `SCA8106` Small Block Ford Spacer (’79 and Earlier) – 0.35″ Thick; `Reluctor-Wheel` Reluctor Wheel; `Timing-Chain-Sets` Timing Chain Sets for 351 Cleveland; `Ultra-LW-Alloy-Damper` Ultra Lightweight Alloy Damper (Neutral Balance); `Damper` SCAT Street Performance Damper; `Flex-Dbl-Welded-SFI` Extra Thick Material Double Welded Flexplate with SFI Sticker; `Flex-Dbl-Welded` Extra Thick Material Double Welded Flexplate

## Needs human QA

- Families not in the cam-fitment vocabulary (catalog heading kept in `fit.fam`):
  - `Audi/VW` (2 PNs): `2-5670-1992-980-747`, `2-6457-2125-787-786`
  - `Chevy 8.1L Vortec big block` (2 PNs): `4-8.1-4375-6700-2200`, `4-8.1-4750-6700-2200`
  - `Fiat` (1 PNs): `2-5050-1915-1000-866`
  - `Ford 4.2L V6` (1 PNs): `9-4.2L-3740-6090`
  - `Ford Flathead V8` (30 PNs): `1-94602`, `1-94602BI`, `1-94603`, `1-94603BI`, `1-94604`, `1-94604BI`, `1-94606`, `1-94606BI` …
  - `Ford Kent / Cosworth four` (1 PNs): `2-4925-2082-812-635`
  - `Ford Model A/B/T four` (16 PNs): `2-A7500-1500`, `2-T6875-1500`, `2-T7000-1250`, `7-A-4250`, `7-A-4250-C`, `7-A-4250-C-H`, `7-A-4250-H`, `7-A-4250-S` …
  - `Ford inline-6 turbo (Barra)` (1 PNs): `2-6059-2242-993-867`
  - `GMC 6.5L diesel` (1 PNs): `9-6.5L-3819-6280`
  - `Holden V8` (12 PNs): `2-308-5627-2124`, `2-308-5627-2124A`, `2-308-5700-2124`, `2-308-5700-2124A`, `2-ICR308-5700-2124`, `4-308C-3480-5700-21`, `4-308C-3750-5700-20`, `4-308C-4000-5850-20` …
  - `Honda` (17 PNs): `2-5290-1771-935-827`, `2-5290-1771-935-827-L625`, `2-5394-1771-898-748`, `2-5394-1771-898-748-L625`, `2-5394-1771-935-827`, `2-5394-1771-935-827-L625`, `2-5430-1771-858-827`, `2-5430-1771-858-827-L625` …
  - `Mazda` (1 PNs): `2-5233-1770-787-860`
  - `Mitsubishi` (2 PNs): `2-5906-1771-1038-866`, `2-5906-1771-1115-827`
  - `Nissan` (7 PNs): `2-4783-1889-826-857`, `2-5365-1888-898-866`, `2-5677-2047-817-866`, `2-6002-2086-857-826`, `2-6002-2086-857-826S`, `2-6071-1967-817-866`, `2-6494-2086-974-827`
  - `Peugeot` (1 PNs): `2-5252-1915-940-767`
  - `Pontiac Le Mans / Daewoo` (1 PNs): `2-5110-1691-862-708`
  - `Saturn` (1 PNs): `2-5707-1850-966-767`
  - `Subaru` (4 PNs): `2-5138-2047-842-905`, `2-5138-2047-842-905-L625`, `2-5180-2047-842-905`, `88-SUBARU-83MM-2047`
  - `Toyota` (4 PNs): `2-4645-1693-818-709`, `2-5138-1693-818-709`, `2-5590-2047-1020-866`, `2-5819-2086-866-109`
  - `VW` (4 PNs): `2-5670-1992-981-787`, `2-5670-1992-981-787S`, `2-6260-1992-981-787`, `2-6260-1992-981-827`
  - `Vauxhall` (1 PNs): `2-VAUXHALL-1`
- Big-block Chevy **rotating assemblies** (Engine "454 Main") do not state the rear-seal style, so each is emitted for both `Chevy Mark IV big block` and `Chevy Gen VI big block`; the crank PN in `spec.crankPn` decides which one is right. Cranks and rods are split by seal where the catalog gives it.
- Chrysler "426 Main" / "440 Main" assemblies sit in Scat's "RB Block Wedge and Hemi" category; they are emitted as `Mopar B/RB big block` only. Check the piston PN for 426 Hemi sets.
- Chrysler "Modern HEMI" cranks are emitted as `Chrysler Gen III Hemi 6.2/6.4` (392 / 426 stroker); Hemi rotating assemblies are split 5.7/6.1 vs 6.2/6.4 by bore (>= 4.080 = 6.2/6.4). Modern Hemi rods are emitted for both Gen III families.
- Chevy "LT1 8-Bolt" cranks are mapped to `GM LT (Gen V)`; confirm they are not meant for the 1992–97 LT1.
- Chrysler "RB Block Wedge + HEMI" cranks are emitted for both `Mopar B/RB big block` and `Chrysler 426 Hemi`; small-block Chrysler rods for both `Mopar LA small block` and `Mopar Magnum 5.2/5.9` (same 2.125 journal); Ford "460 and FE" rods are split by journal (2.438 FE, 2.500 429/460).
- Ford 351 rods (2.311 journal) are emitted as `Small-block Ford (Windsor)` only although the journal also matches 351C; Ford 351 cranks are split Windsor vs Cleveland by title.
- Catalog typos were left as data where harmless (`Chrylser`, `Hyperuetectic` normalised; one Ford 302 Pro Series rod parent is tagged Make=Chevy in the store and is mapped by its title).
- `crankPn` values such as `9-351-400-6200-2100W` are copied verbatim; they do not all match a crank record here because the assembly listing uses older/alternate crank numbering.
- 52 spec values that the attributes left unresolved (a parent listing several strokes or journals with no variation value) were filled from Scat's own part-number encoding (`main-stroke-rodLength[-journal]` for cranks, `length-journal` for rods). Where both were present they were compared; the attribute value was kept and the 20 conflicts are listed here for checking against the printed catalog:
  - 2-ICR6385-7/16A: length attribute 6.835 vs part number 6.385
  - 2-5670-1992-981-787: journal attribute 1.88 vs part number 1.992
  - 2-5707-1850-966-767: journal attribute 1.691 vs part number 1.85
  - 2-6260-1992-981-827: journal attribute 1.88 vs part number 1.992
  - 2-6260-1992-981-787: journal attribute 1.88 vs part number 1.992
  - 2-5670-1992-981-787S: journal attribute 1.88 vs part number 1.992
  - 2-6494-2086-974-827: length attribute 6.496 vs part number 6.494
  - 2-343-5885-2208A: journal attribute 2.095 vs part number 2.208
  - 2-343-5885-2208: journal attribute 2.095 vs part number 2.208
  - 4-351C-4250-6200-2: minRodLength attribute 6.25 vs part number 6.2
  - 7-T-4250-1625-H: rodJournal attribute 1.5 vs part number 1.625
  - 7-T-4250-1625: rodJournal attribute 1.5 vs part number 1.625
  - 7-T-4250-1590-H: rodJournal attribute 1.5 vs part number 1.59
  - 7-T-4250-1590: rodJournal attribute 1.5 vs part number 1.59
  - 4-426-4500-6800-2200: stroke attribute 4.25 vs part number 4.5
  - 4-LS1-4125-6125-58-C-2: minRodLength attribute 6.0 vs part number 6.125
  - 4-LS1-4125-6125-24-C-2: minRodLength attribute 6.0 vs part number 6.125
  - 4-LS1-4125-6125-58-C: minRodLength attribute 6.0 vs part number 6.125
  - 4-LS1-4125-6125-24-C: minRodLength attribute 6.0 vs part number 6.125
  - 4-HONDA-89MM-1771-2: rodJournal attribute 0.935 vs part number 1.771
- 447 assemblies list rings as "Incl with pistons": `ringPn` is omitted and `ringsIncluded` set true. Four assemblies list the piston PN as "TBD" (omitted).
- Validation passed: every record has `m p cat fit.fam src`, no duplicate `p` within a family, numeric fields are numbers, no empty strings.
