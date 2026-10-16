# Callies extraction notes (2026-10-16)

## What was fetched

- `https://www.callies.com/robots.txt` (Crawl-delay 10, nothing disallowed), `upcp_product-sitemap.xml` (fetched once with curl before the script existed) and the 88 product pages it lists. Request log: 90 requests, statuses 200×90. User-Agent `engine-build.com catalog research (contact: joecsaba@gmail.com)`. No challenge pages.
- Pacing: the first crawl run was stopped after robots.txt and one page fetched 6 s apart, because RobotFileParser ignores the `Crawl-delay: 10` line that callies.com puts above its first `User-agent` line; the script now also reads Crawl-delay from the raw text, and every later request was 10 s apart (logged as 9-10 s with 1 s timestamp resolution).
- Pages are cached under `dl/callies/pages/<slug>.html` (gitignored); the crawl is resumable (existing files are not re-fetched). Request log: `dl/callies/fetch_log.jsonl`.
- Only the `ewd-upcp-product-page-large-screen` copy of each page is parsed; the mobile copy duplicates every table.

## Output

- 586 records: 356 crank, 230 rod. 72 duplicate rows dropped (same PN + family repeated on another page or under another heading; the first page in slug order wins).
- A PN that fits several families is emitted once per family with the same `p`.
- Prices are not published on the site; none stored.

## Rows per page (data rows with a part number)

- `apex-ls-lt`: 9
- `big-block-chevy-magnum`: 6
- `big-block-ford-magnum`: 4
- `compstar-big-block-chevy`: 9
- `compstar-big-block-chevy-spread-bore`: 1
- `compstar-big-block-mopar`: 5
- `compstar-comet-small-block-chevy`: 6
- `compstar-cummins`: 2
- `compstar-duramax`: 1
- `compstar-ford-coyote`: 5
- `compstar-ford-modular`: 5
- `compstar-gen-iii-hemi`: 9
- `compstar-h-beam`: 33
- `compstar-jeep`: 1
- `compstar-ls-lt`: 18
- `compstar-racesaver-sprint-car`: 1
- `compstar-small-block-chevy`: 12
- `compstar-small-block-ford`: 3
- `compstar-utv`: 5
- `compstar-viper-billet`: 6
- `compstar-xtreme`: 8
- `cummins-ultra-billet`: 3
- `dragonslayer-gen-ii-iv-ls1`: 6
- `ecoboost-line`: 14
- `enforcer`: 13
- `ford-godzilla-magnum`: 5
- `gen-iii-hemi-magnum-8-cwt`: 3
- `honda-b-series`: 10
- `honda-f-series`: 2
- `honda-k-series`: 9
- `ls-lt-magnum`: 10
- `ls-ultra-ud-billet`: 4
- `ls-ultra-ud-forged`: 4
- `magnum-billet-xb-small-block-chevy`: 6
- `magnum-xl-ls1-gen-iii-iv`: 4
- `magnum-xl-small-block-chevy`: 25
- `magnum-xl-small-block-ford`: 10
- `mitsubishi-4b11`: 6
- `mitsubishi-4g63`: 17
- `mopar-magnum`: 6
- `nissan-gt-r-ultra-billet`: 3
- `nissan-rb26`: 6
- `nissan-rb30`: 2
- `nissan-sr20`: 1
- `nissan-vg30`: 1
- `small-block-chevy-magnum`: 28
- `small-block-chevy-ultra-ud-billet`: 10
- `small-block-chevy-ultra-ud-forged`: 15
- `small-block-ford-magnum`: 15
- `small-block-ford-ultra-ud-billet`: 10
- `small-block-ford-ultra-ud-forged`: 10
- `sport-series`: 51
- `stock-eliminator`: 2
- `subaru-ej20-ej25`: 11
- `subaru_fa_20_copy`: 3
- `toyota-2jz`: 10
- `tractor-ultra-billet-ub`: 19
- `ultra-assassin`: 1
- `ultra-dirt-h-beam`: 6
- `ultra-enforcer`: 26
- `ultra-h-beam`: 61
- `ultra-sprint`: 4
- `ultra-xd`: 7

## Records per family

- Small-block Chevy: 152
- GM LS: 61
- Small-block Ford (Windsor): 53
- Chevy Mark IV big block: 45
- Chevy Gen VI big block: 32
- Mitsubishi 4G63: 20  *(not in the shared family list)*
- Subaru EJ20/EJ25: 19  *(not in the shared family list)*
- GM LT (Gen V): 16
- Chrysler Gen III Hemi 5.7/6.1: 13
- Chrysler Gen III Hemi 6.2/6.4: 13
- Mopar B/RB big block: 13
- Toyota 2JZ: 12  *(not in the shared family list)*
- Honda K-series: 11  *(not in the shared family list)*
- Honda B-series: 10  *(not in the shared family list)*
- Ford Coyote: 9
- Ford Godzilla 7.3: 9
- Navistar/International: 9  *(not in the shared family list)*
- Mitsubishi 4B11: 8  *(not in the shared family list)*
- Ford Modular: 7
- John Deere small block: 7  *(not in the shared family list)*
- Dodge Viper V10: 6  *(not in the shared family list)*
- Ford 429/460: 6
- Ford EcoBoost 2.3: 6  *(not in the shared family list)*
- Nissan RB26: 6  *(not in the shared family list)*
- Nissan VR38 (GT-R): 6  *(not in the shared family list)*
- Cummins 6.7: 5
- Ford EcoBoost 1.6: 3  *(not in the shared family list)*
- Ford EcoBoost 2.0: 3  *(not in the shared family list)*
- Ford EcoBoost 3.5: 3  *(not in the shared family list)*
- Subaru FA20: 3  *(not in the shared family list)*
- Duramax 6.6: 2
- Honda F-series: 2  *(not in the shared family list)*
- John Deere big block: 2  *(not in the shared family list)*
- Nissan RB30: 2  *(not in the shared family list)*
- Nissan VQ35: 2  *(not in the shared family list)*
- Polaris RZR XP1000: 2  *(not in the shared family list)*
- AMC/Jeep inline-6: 1
- Arctic Cat 951 V-Twin: 1  *(not in the shared family list)*
- Can-Am Maverick: 1  *(not in the shared family list)*
- Detroit Diesel 40 Series: 1  *(not in the shared family list)*
- Nissan SR20: 1  *(not in the shared family list)*
- Nissan VG30: 1  *(not in the shared family list)*
- Powerstroke 6.0: 1
- Yamaha YXZ 1000R: 1  *(not in the shared family list)*

## Pages without records

- `3513`: empty page (no title, no content)
- `alcohol-hemi-billet-aluminum-engine-block`: engine block
- `balancing-supplies`: tungsten heavy metal slugs, not a crank/rod
- `bbc-billet-aluminum-engine-blocks`: engine block
- `bbc-cast-iron-engine-block`: engine block
- `big-block-chevy-ultra-billet-ub`: Ultra Boost page lists capabilities (stroke/journal ranges) but no part numbers
- `big-block-mopar-ultra-billet`: Ultra Billet page lists capabilities but no part numbers
- `damper-studs`: damper stud kits (fastener; out of scope for this task)
- `finish-ground-camshafts-and-cores`: links to per-engine cam-list PDFs only, no tables
- `ford-460-ultra-billet-ub`: Ultra Boost page lists capabilities but no part numbers
- `gen-iii-hemi-ultra-billet-ub`: Ultra Boost page lists capabilities but no part numbers
- `head-and-main-studs`: head/main studs (fastener; out of scope for this task)
- `ls-billet-aluminum-engine-blocks`: engine block
- `ls-ultra-billet-ub`: Ultra Boost page lists capabilities but no part numbers
- `magnum-xl-big-block-chevy`: configured, but no data rows with part numbers
- `main-caps`: main caps
- `mopar-gen-ii-cast-iron-hemi-wedge-engine-blocks`: engine block
- `mopar-gen-iii-cast-aluminum-engine-block`: engine block
- `mopar-gen-iii-cast-iron-hemi`: engine block
- `reluctors`: reluctor wheels
- `rotating-assemblies`: prose only, no part numbers
- `sbf-billet-aluminum-engine-blocks-copy`: engine block
- `small-block-chevy-ultra-billet-ub`: Ultra Boost page lists capabilities but no part numbers
- `small-block-ford-ultra-billet-ub`: Ultra Boost page lists capabilities but no part numbers
- `ultra-i-beam-2`: prose only, no spec table on the page

## Rows skipped (1)

- `compstar-ls-lt` [LS Post Spacer CPP-0551] crank row without a numeric stroke: `3/16 x 1.348 Key | WR607`

## Conflicting specs for the same PN across pages

- `C22101-CA`: 5.291 / 1.89 on `sport-series`; 6.024 / 1.89 on `honda-b-series`
- `S27007`: 3.3071 / 1.8898 on `honda-f-series`; 3.3858 / 1.8878 on `toyota-2jz`
- `U14820-CA`: 5.8661 / 2.0472 on `ecoboost-line`; 5.879 / 2.047 on `sport-series`; 5.879 / 2.166 on `ultra-enforcer`
- `U14821-CA`: 5.879 / 2.047 on `sport-series`; 6.011 / 2.2047 on `ecoboost-line`; 6.011 / 2.205 on `ultra-enforcer`
- `U16720`: 5.659 / 2.165 on `sport-series`; 5.695 / 2.165 on `ultra-enforcer`

## Needs human QA

- `small-block-chevy-magnum` CAM11A-MG lists a 5.211 rod journal; the PN code ("11") and the neighbouring rows say 2.100. Stored as printed (5.211); almost certainly a typo on the site.
- `compstar-cummins` S34002 lists a 2.27171 rod journal where S34000 has 2.7171 (69 mm). Stored as printed; almost certainly a typo on the site.
- `compstar-big-block-chevy` BBQ425 CS is printed with a space; normalised to BBQ425-CS like its neighbours.
- Cummins cranks (4.882 stroke = 124 mm) are filed under `Cummins 6.7`; the site does not say whether the 8-bolt-flange S34002 is meant for 5.9 blocks.
- Big-block Chevy cranks: rows marked "1 pc. seal" are filed under `Chevy Gen VI big block`, all others under `Chevy Mark IV big block`. BBC rods are emitted for both families.
- Gen III Hemi cranks/rods are emitted for both `Chrysler Gen III Hemi 5.7/6.1` and `6.2/6.4` (same 2.559 main).
- Compstar Ford Coyote/Modular H-beam rods (C24105, C24106) are emitted for both `Ford Coyote` and `Ford Modular`, as headed on the site.
- Small-block Ford cranks with "351C" or "351-2.750" mains are kept under `Small-block Ford (Windsor)` with the main label in `fit.notes`; they need a Cleveland-main block.
- `compstar-big-block-chevy-spread-bore` and the 5.000 bore-spacing row of `compstar-big-block-chevy` (BQ+426-CS) are for 5.000 in bore-spacing aftermarket blocks, not production Mark IV blocks (noted in `fit.notes`).
- Main-bearing labels were mapped to diameters: 350=2.450, 400=2.650, 283=2.300 (SBC); 302=2.249, 351=3.000, 351C=2.750 (Ford). "Honda" rod journal = 1.888 (Callies code 9, same as the 1.888 rows).
- Metric values (mm) were converted to inches and rounded to 4 decimals; where the site prints both, the inch figure is stored.
- `ultra-enforcer` has a "Mopar" section repeating the Viper rod row (U14345 6.200/2.123); skipped as a copy error.
- The same rod PN carries different lengths on different pages (see 'Conflicting specs' above); the first page in alphabetical slug order wins in the JSON. C22101-CA at 6.024 on `honda-b-series` (5.291 elsewhere) and S27007 used for both a Honda F crank and a Toyota 2JZ Honda-pin crank look like site errors.
- Rod `rodJournal` is the crank-pin diameter the rod is sized for (what Callies lists), not the housing bore; `pin` is the wrist-pin bore. Rods carry `beam` only where the page or section says H-Beam / I-Beam.
- `spec.cammedForRodLength` on cranks is Callies' "Cammed for rod length" column (counterweight profile), not a hard minimum.
- Material is only stored when the page states it (alloy and/or billet vs forged); a bare "4340" means the page did not say forged or billet. Rods with a `-CA` suffix are the Custom Age 625 bolt upgrade (site rule).
- Magnum XL Big Block Chevy lists only stroke/journal tiers, no part numbers; 0 rows.
- Families not in the shared list (kept as the catalog heading): `Arctic Cat 951 V-Twin` (compstar-utv); `Can-Am Maverick` (compstar-utv); `Detroit Diesel 40 Series` (tractor-ultra-billet-ub); `Dodge Viper V10` (compstar-h-beam, compstar-viper-billet, ultra-enforcer, ultra-h-beam); `Ford EcoBoost 1.6` (ecoboost-line, sport-series); `Ford EcoBoost 2.0` (ecoboost-line, sport-series); `Ford EcoBoost 2.3` (ecoboost-line, sport-series, ultra-enforcer); `Ford EcoBoost 3.5` (ecoboost-line, sport-series, ultra-enforcer); `Honda B-series` (honda-b-series, sport-series); `Honda F-series` (honda-f-series); `Honda K-series` (honda-k-series, sport-series, ultra-enforcer); `John Deere big block` (tractor-ultra-billet-ub); `John Deere small block` (tractor-ultra-billet-ub); `Mitsubishi 4B11` (enforcer, mitsubishi-4b11, sport-series, ultra-enforcer); `Mitsubishi 4G63` (enforcer, mitsubishi-4g63, sport-series, ultra-enforcer); `Navistar/International` (tractor-ultra-billet-ub); `Nissan RB26` (nissan-rb26); `Nissan RB30` (nissan-rb30); `Nissan SR20` (nissan-sr20); `Nissan VG30` (nissan-vg30); `Nissan VQ35` (sport-series); `Nissan VR38 (GT-R)` (nissan-gt-r-ultra-billet, sport-series, ultra-enforcer); `Polaris RZR XP1000` (compstar-utv); `Subaru EJ20/EJ25` (enforcer, sport-series, subaru-ej20-ej25, ultra-enforcer); `Subaru FA20` (sport-series, subaru_fa_20_copy); `Toyota 2JZ` (enforcer, sport-series, toyota-2jz, ultra-enforcer); `Yamaha YXZ 1000R` (compstar-utv)
