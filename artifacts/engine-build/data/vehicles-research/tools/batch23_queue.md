# Batch 2+3 research queue (user approved 2026-10-12)

Each job: agent reads verify_brief.md + verify_brief_allyears.md, inputs nhra_<job>.json / epa_<job>.json,
writes verify_<job>.json. Same-maker material = one source. Then: specs via make_specs-style
spec → to_vehicle.py → data/vehicles/<make>/<model>.json (draft) → user review → publish.
Sources stay private (no source text on pages).

Wave 1 (launched): corvette-1953-1982, corvette-1984-2026, nova, impala-1958-1985, impala-modern, el-camino
Wave 2: challenger, cutlass-1961-1977, cutlass-1978-1999, skylark-1953-1972, skylark-1975-1998, regal
Wave 3: monte-carlo, fairlane, cougar, dart, coronet (incl. Super Bee), gtx
Wave 4: satellite (NHRA under BELVEDERE), duster, valiant (NHRA 1960-69 may be under other headings), galaxie, falcon, maverick
Wave 5: thunderbird-1955-1979, thunderbird-1980-2005, lemans (incl. Tempest), grand-prix-1962-1987, grand-prix-1988-2008, javelin-amx (two pages), vega-chevette (two pages)

Pages (model → files):
corvette ← corvette-1953-1982 + corvette-1984-2026; nova; impala ← impala-1958-1985 + impala-modern;
el-camino; challenger; cutlass ← both cutlass jobs (442 included); skylark ← both (Gran Sport included);
regal (Grand National included); monte-carlo; fairlane (+ Fairlane rows from verify_ford-torino-1968-1971.json);
cougar (Mercury); dart; coronet; gtx; satellite; duster; valiant; galaxie; falcon; thunderbird ← both;
maverick; lemans; grand-prix ← both; javelin + amx (AMC, make slug "amc"); vega + chevette.
DONE: impala-1958-1985, impala-modern, nova, corvette-1953-1982, el-camino.
Launched: challenger, cutlass-1961-1977, cutlass-1978-1999, skylark-1953-1972, skylark-1975-1998 (+ corvette-1984-2026 running).
Follow-up third-source pass needed: el-camino has 46 two-source rows (1960, 1965-68, 1975: no NHRA heading) —
search El Camino-specific independent sources (like third_source_needed.json pass). Nova 1970 Yenko Deuce LT1
(COPO 9010, factory-built) was marked dealer_conversion — decide at curation (Camaro COPOs are included).
Corvette 1960 FI: factory 275/315 vs Black Book 250/290 — note it.
DRAFT PAGES BUILT (make_specs2.py → to_vehicle.py): corvette, nova, impala, challenger, cutlass, skylark, regal, monte-carlo, gtx, coronet.
RESEARCH DONE also: el-camino (needs 3rd-source pass), monte-carlo/fairlane/cougar/dart/coronet/gtx pending.
Follow-up 3rd-source pass list: el-camino (46 rows), cutlass 1961-77 nhra_plus_one rows (~13), skylark 1983 2.5 / 1998 2.4, coronet 1949/1951/1952/1954 sixes + 1956-57 D-500 two-source rows.
Converter now: diesel flag (linker matches diesel records only), code_notes / trim_notes in specs,
262 resolved by entry text (V8 vs 4.3 V6). vehicleData ENGINE_MAKERS widened to all GM divisions, amc→american_motors.
Engines still needing spec pages (so far): GM 3.5 (213), 3.4 LA1 (204? check pontiac 3.4 family link), 3.9 (237),
2.5 Ecotec (152), 2.4 (146), Corvette LT6/LT7 (336).
Engine-data fixes from verify_cougar.json geometry block: mercury_fe.json 390 bore 4.1339->4.05, 427 bore 4.2283->4.2328?, 428 stroke 3.7874->3.98; mercury_385.json 429/460 bores ->4.36 (only 2 sources: get a 3rd). Redirects for moved slugs.
After pages: list engines with no spec page → engine research (engine_brief.md) → build_engines-style records.
