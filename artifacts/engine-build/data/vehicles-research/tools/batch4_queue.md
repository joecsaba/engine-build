# Batch 4 research queue (user approved 2026-10-12): trucks, Jeeps, Nova Yenko Deuce

Same process as batch 2/3 (batch23_queue.md): extract2.py → research agents (verify_brief.md +
verify_brief_allyears.md + verify_brief_trucks.md) → spec → to_vehicle.py → draft → user review → publish.
Sources stay private. Half-ton / light-duty models only unless noted.

## Jeep (make slug "jeep")
- jeep-cj-1945-1986 → CJ (CJ-2A through CJ-8 Scrambler)
- jeep-wrangler-1987-2006 + jeep-wrangler-2007-2026 → Wrangler (YJ, TJ, JK, JL; 392 and 4xe)
- jeep-cherokee → Cherokee (SJ 1974–1983, XJ 1984–2001, KL 2014–2023)
- jeep-grand-cherokee-1993-2010 + jeep-grand-cherokee-2011-2026 → Grand Cherokee (SRT, Trackhawk)
- jeep-wagoneer-1963-1991 → Wagoneer (incl. Grand Wagoneer to 1991)
- jeep-gladiator → Gladiator (1963–1971 and 2020–2026)
- LATER: J-series pickups 1972–1988, Comanche 1986–1992, Liberty, Commander, Compass/Patriot/Renegade.

## Trucks
- chevrolet-ck-1960-1972, chevrolet-ck-1973-1987, chevrolet-ck-1988-1998 → "C/K Pickup" (C10/K10, C1500/K1500)
- chevrolet-silverado-1999-2013, chevrolet-silverado-2014-2026 → Silverado 1500
- ford-f100-1953-1983 → F-100; ford-f150-1975-1996, ford-f150-1997-2014, ford-f150-2015-2026 → F-150 (Lightning, Raptor)
- dodge-dseries-1961-1993 → D-Series (D100/D150, Li'l Red Express, Warlock)
- dodge-ram-1500-1994-2008, ram-1500-2009-2026 → Ram 1500 (Ram brand from 2011; SRT-10, TRX)
- LATER (wave 2): Chevrolet S-10, Ford Ranger, Dodge Dakota, GMC Sierra/C15 (shares Chevy engines),
  Ford Bronco, Chevrolet Blazer/K5, Syclone/Typhoon, Ford Ranchero.

## Nova
- 1970 Yenko Deuce (COPO 9010 LT1 350/360): treat as a factory COPO like the Camaro COPOs.
  DONE 2026-10-12 (eb37979): NHRA + Chevy Hardcore + Yenko registry + Wikipedia. Awaiting copy review / deploy.

## Engines still without a spec page (bore/stroke not yet verified by 3 sources)
- Buick 3.0 V6 (181 ci) — Skylark, Cutlass 1982–1988
- GM 2.2 LN2 (133 ci) — Cutlass 1993–1996
- GM 3.9 V6 LZ8/LZ9 (237 ci) — Impala 2006–2011, Monte Carlo 2006
- Ford/Jaguar 3.9 V8 AJ-30 (240 ci) — Thunderbird 2002–2005
- Renault 2.1 turbodiesel J8S (126 ci) — Cherokee XJ 1985–1987
- Chrysler 2.4 PowerTech DOHC (148 ci) — Wrangler TJ 2003–2006
- FCA 2.4 Tigershark MultiAir2 (144/146 ci) — Cherokee KL 2014–2023
- Mercedes-Benz OM642 3.0 V6 diesel (182 ci) — Grand Cherokee 2007–2008 (left unlinked; not the EcoDiesel)
- Willys Go-Devil L-134 flathead four — CJ-2A/CJ-3A 1945–1953 (left unlinked; Hurricane family is the F-head)
- Perkins 4.192 diesel (192 ci) — CJ-5/CJ-6 1961–1965
- GM 6.2 diesel LH6 (379 ci) — C/K 1982–1993
- GM 6.5 diesel L49/L56 (395 ci) — C/K 1500 1994–1998
- Ford 215 six (1952–1953), 239 flathead V8 (1953) — F-100
- Ford 262 truck six (1961–1964) — F-100 1964
- Ford 300 six (1965–1996) — F-100, F-150 (big gap: no page at all)
- Ford FE 360 truck V8 (1968–1976) — F-100
- Ford 4.2 Essex V6 (256 ci) — F-150 1997–2008 (left unlinked; the same-size page is the Cologne)
- Ford 3.0 Power Stroke V6 diesel (183 ci) — F-150 2018–2021 (left unlinked; not the Audi EA896)
- Ford 3.3 Ti-VCT V6 (204 ci), 6.2 Boss V8 (379 ci), 5.2 Predator supercharged V8 (317 ci) — F-150
- Mitsubishi 6DR5 4.0 diesel (243 ci) — Dodge D150 1978
- Chrysler 3.2 Pentastar V6 (198 ci) — Cherokee KL 2014–2022 (Pentastar page has only the 3.6)
- DONE 2026-10-13: Buick 350 V8 1968–1978 records (3.80 x 3.85) and Jeep Dauntless 350. Still unverified: 1971 4-bbl 260, 1972, 1974, 1979–80 ratings.
- DONE 2026-10-13 (geometry audit): Buick 300 / 340 / 400 records look wrong (bore 3.7992 on all; 300 stroke 3.311, 340 stroke 3.752, 400 bore 4.126 x 3.7992). Real: 300 = 3.75 x 3.40, 340 = 3.75 x 3.85, 400 = 4.04 x 3.90. Verify and fix with redirects.

## Other leftovers
- Dodge D-series: 1961, 1968, 1969 and 1989 have no engine with 3 sources yet (no brochures found) — retry.
- Two-source rows to retry for a third source: El Camino 1965–68 sixes, early-80s GM diesels/V6s,
  1949–54 Coronet sixes, 1956–57 D-500 rows.
- ford-429ci 2016 record (4.08 x 4.1) looks like a different engine (7.3 Godzilla?) — verify or drop.

## Geometry audit 2026-10-13 (data/engine-sources/geometry-audit-2026-10-13.json)
89 records corrected (3+ sources), 17 displacements recomputed, 12 withheld (bore/stroke null) until verified:
- Cadillac 2.0T LSY; Ecotec 2.4 LAF (record looks like the 1.4T LUV); Ecotec 2.2 L61 (Sunfire 2000-01 was the LN2);
  Saturn 1.9; Audi 3.2 CALA (needs its own record); Honda JNC1 (NSX 3.5TT 91 x 89.5 mm filed as a J30).
- Northstar "LK8" removed (no such code). Northstar LC3 4.4 = 91 x 84 mm (GM-only source so far).
- GMC-filed "Buick V8" family removed. Mazda rotary records carry meaningless bore/stroke (leave or blank).
- Families that mix unrelated engines under one name: check new ones with scratchpad audit_engines.mjs.
