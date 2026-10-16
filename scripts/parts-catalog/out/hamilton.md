# HAMILTON — Hamilton Cams (Cummins diesel valvetrain)

Extracted 2026-10-16 by `scripts/parts-catalog/extract_hamilton.py`. Output `out/hamilton.json`,
59 records from 37 part numbers, one record per part number per engine family.

| cat | records | PNs | note |
|---|---|---|---|
| cam | 26 | 13 | 7 bare cams + 4 cam combos + 2 flat-tappet conversion kits (combos carry `spec.kit`) |
| headGasket | 7 | 7 | 5 fire-ring gaskets with thickness/wire OD, 1 fire-ring "coming soon", 1 OEM replacement |
| gasket | 4 | 4 | top-end gasket kits (`spec.includes`, `headGasketIncluded`) |
| spring | 6 | 4 | 103 lb / 110 lb 24V, 155 lb beehive 12V, 12V dual kit |
| pushrod | 3 | 2 | 12 mm (24V) and 10.5 mm (12V), both .120 wall |
| lifter | 6 | 2 | 1.45" flat tappets, cast and DLC steel |
| rocker | 2 | 1 | 24V OE-style rockers |
| bearing | 3 | 1 | HC-1 cam bearing set |
| retainer | 2 | 1 | 24V tool steel retainers |
| fastener | 0 | 0 | Hamilton sells no studs/bolts; nothing to emit |

## What was fetched

- `robots.txt`: only `/wp-admin/` and `?add-to-cart=` disallowed, no `Crawl-delay`; the extractor
  spaces requests 6 s apart anyway.
- Store API: `https://hamiltoncams.com/wp-json/wc/store/v1/products?per_page=100&page=1` —
  **52 products in one page** (`x-wp-total: 52`, the task brief said 51). Fields used: `name`,
  `sku`, `categories` (engine-year groups), `short_description`, `description`, `permalink`.
  `attributes` (Engine Model / Engine Type / "Type (Street Only)") are filter facets that
  duplicate the categories and were not used.
- Product pages: one per product that produces a record (37 pages), for the **Vehicle Fitment**
  tab (`table#ymm_applicable_list`: Make | Model | Year, stored as `fit.vehicles`) and the JSON-LD
  `Product` block (SKU cross-check; no mismatches). 35 pages had the table (2–4 rows each); the
  two newest listings (`07-g-6.7+19TE-H` top-end kit without head gasket, `07-c-188/220S-1` 188/220
  cast cam) have none, so those records carry no `fit.vehicles`. Pages for tools, apparel and the
  other skipped products were not fetched.
- Request count: 2 (robots + API) + 2 inspection pages + 1 robots + 35 pages in the extractor run
  = 40 requests. No 403 / challenge pages. Everything is cached under `dl/hamilton/`
  (gitignored); `--offline` re-parses the cache.

## Mapping decisions

- **Families** come from the Store API engine-year categories: `1989–1998 12-Valve 5.9L` →
  `Cummins 5.9 12V`; `1998.5–2002 5.9L` and `2003–2007 5.9L` → `Cummins 5.9 24V/CR` (y0 1998,
  sub-ranges "24V VP44" / "common rail" kept in `fit.notes`); `2007.5–2018`, `2019–2024`, `2025+ 6.7L`
  → `Cummins 6.7` (y1 omitted when the 2025+ group is present). `ci` 359 / 408, `cyl` 6.
- `fit.vehicles` is the page's Make/Model/Year table verbatim (Dodge/Ram 2500/3500/4500/5500 with
  year spans). It is truck fitment, broader than the engine categories (e.g. "1989 - 2026" on a
  cam whose categories stop at 2018); the categories drive `y0/y1`.
- **Cams** are `type: solid_flat` (Cummins mechanical flat tappets) except the 2019+ roller cam
  (`hydraulic_roller`, runs on the factory lifters). `material` from the title (cast / steel /
  forged steel). Duration at .050 from the "Duration at .050″ of lift" bullet, the "220° intake /
  240° exhaust on a 110° LSA" line, or the roller cam's spec block. Lift is stored as
  `liftInt`/`liftExh` because Hamilton says only "lift" (178/208: .290/.310; roller: .270/.310)
  without stating lobe vs valve — not mapped to `lobeLift`/`valveLift`. Lash `.010/.020` only
  where the listing states it. "RPM Range: Idle-4,000" → `rpmHigh: 4000, rpmLowText: "idle"`.
- **Combos** (`07-cc-*`) are `cam` records with `spec.components` (the "What's included"
  bullets verbatim) and `spec.kit` with component PNs **inferred** by matching the bullet to the
  standalone listing: "103 Valve Springs" → 07-s-003, "155 … springs" → 07-s-001 (retainers and
  locks included with it), 12V "Extreme duty pushrods" → 07-p-002, 24V "Heavy duty pushrods" →
  07-p-004. Tappets are only "1.45 in tappets (PN not stated)" since the bullet does not say cast
  (07-t-001) or DLC steel (07-t-002). The 2019+ flat tappet conversion kits (07-cc-24v19+,
  07-cc-24v25-26) use parts not sold separately: descriptive strings only, no PNs.
- `07-C-OEMCR` (2003–2018 OEM replacement cam) states no numbers; `161/191` is taken from the
  `07-cc-OEMCR` combo that lists "161/191 Camshaft (fits 07.5-2018)". Flagged in `fit.notes`.
- **Head gaskets**: fire-ring gaskets store `thickness`, `bore` (= the 4.560" wire O.D., which
  is how Hamilton quotes it), `wireDia` .105, `grooveDepth` [min, max], `initialTorqueFtLb` 130,
  `material: composite`, `style: fire ring`. `07-g-6.7f20`'s page says ".017–.018 groove radius"
  where the other pages say "groove depth" — stored as `grooveDepth` like the rest; QA below.
- **Springs**: `seatLb` from the title/spec sentence (not the 103 page's "stock springs … 80 lbs"
  sentence), `installedHt` only for the 155 lb beehive (155 @ 1.880), `rpmHigh` from "up to N
  RPM", `maxBoostPsi` where stated, `retainersIncluded`, `dual`. The 12V dual kit gives no seat
  pressure, only "up to .700 lift".
- **Pushrods**: metric diameter kept in `diameterMm`, `diameter` converted to inches (12 mm →
  0.472, 10.5 mm → 0.413), `wall` .120, `bucklingLb` from the text.
- **Lifters**: `faceDia: 1.45` (the 1.45" is the tappet face, not the body diameter), `style:
  solid_flat`, `linkBar: false`, `dlc` true/false.
- **Rocker** `07-r-003`: `type: pedestal` (24V ISB rocker on pedestal/trunnion), no ratio stated.
- **Bearing** `07-C-HC1`: `journal` 2.124, `housing` 2.333 (the required cam bore), `qty` 7.
- Prices are not stored. `emissions` is `null` throughout (internal parts); Hamilton's "49-state
  EPA / SEMA certified, not for sale in CA" statements are kept in `fit.notes` on the cams
  that carry them.
- Names are short factual phrases built from the spec; no marketing text is copied.

## Rows skipped

15 of 52 products: 8 tools (barring tool, spring compressors, injector holder, gear puller,
two tool kits, DNR cam-removal tray), T-shirt, zinc additive, 6.7 solid engine block (no shared
cat), forged 24V valve bridges (no shared cat), straight cam key, bolt-on cam gear retainer and
bronze cam thrust plate (no shared cat). Nothing else was dropped; every remaining product has at
least one engine-year category.

## Needs human QA

- **No SKU on three products** — `p` is `wc-<product id>` and `src.skuMissing: true`:
  `wc-99812` (2019–2024 STD thickness head gasket), `wc-9201` (1998–2002 5.9L OEM replacement
  cam), `wc-8809` (220/240/110 LSA steel cam). The JSON-LD `sku` on those pages is just the
  numeric product id.
- **`07-c-174-204-105.5` (2019+ roller cam)**: title and SKU say 174/204, the description's spec
  block says 178° intake three times. Stored as 178/204 with the conflict in `fit.notes`.
- **`07-cc-24v25-26` (2025–2026 conversion kit)**: only "178 steel cams" is stated, so
  `dur050Exh` is absent (the 2019–2024 kit is 178/208).
- **Categories vs. text**: the three flat-tappet cams (178/208, 188/220 cast and steel, 220/240)
  are categorised for 2019–2024 and 2025+ too, although the 188/220 cast cam's own "Application
  and Fitment Coverage" stops at 2007.5–2018 and those engines need the flat-tappet conversion
  parts. Recorded as the categories say, with the 6.7 record open-ended. `07-t-001` tappets:
  text says 1989–2016, categories say through 2018. `07-g-6.719+TE` (2019–2024 top-end kit) is
  also categorised 2025+. `07-s-004` retainers: categories 1998.5–2025+, attributes only
  2003–2018.
- `07-g-6.719+FR` (2019+ fire ring gasket) is listed "coming soon" with no thickness.
- `07-g-6.7f20` groove figure is labelled "radius" on its page (see above).
- Combo `kit` PNs are inferences (see mapping); the tappet PN inside combos is not stated.
- `liftInt`/`liftExh` on the 178/208 and roller cams: lobe vs valve lift unspecified.
- `07-r-003` rocker type `pedestal` is my classification of the ISB rocker; Hamilton does not
  say.
