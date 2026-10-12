# Vehicle engine availability — 3-source verification brief

You are verifying which factory engines were offered in a classic American car, by
model year, for an engine reference website (engine-build.com). The owner's rule:
**every vehicle–year–engine fact must be confirmed by at least 3 reputable sources.**

## Source 1 (already have): NHRA Stock Car Classification Guide
`nhra_vehicles.json` in the scratchpad directory
(C:\Users\ADMINI~1\AppData\Local\Temp\claude\c--Engine-Website\e3f7db2e-8ab6-44a0-b2b8-258b704e31ae\scratchpad\nhra_vehicles.json),
keyed by vehicle slug → year → NHRA model heading → "CID ci / HP hp" → NHRA engine family codes
("_bodies" lists body styles). Parsed from NHRA's own spreadsheets. Known weaknesses: NHRA
lists engines that matter for drag classes, so it can include low-volume/COPO/dealer engines,
can miss some (e.g. a base engine in a sub-trim), and has typos (1970 Plymouth lists a
"383 / 290 hp" column whose family code is a 340 — that is the 340 Six Pack, mislabeled).
Treat NHRA as one source, not the truth.

## Your job: find sources 2 and 3 for each engine
For each vehicle, for each model year, for each engine (displacement + advertised gross HP):
find **two independent reputable sources other than NHRA** that say that engine was a
factory/regular-production (or documented special-order, e.g. COPO) option in that car
that year. Also record any engine that 2+ reputable sources list but NHRA does not.

Reputable, in order of preference:
1. Manufacturer material: GM Heritage Center vehicle information kits / spec sheets
   (gm.com/heritage), factory brochures or dealer data books reproduced on archive sites
   (e.g. oldcarbrochures.com, lov2xlr8.no, oldcarmanualproject), Ford/Chrysler press material.
2. Marque registries and research groups: Camaro Research Group (camaros.org),
   Chevelle/El Camino registries, 442.com / Olds clubs, GTO Association, Pontiac Historic
   Services, Mustang Club of America / Mustang Attitude knowledge base, Shelby American
   Automobile Club, allpar.com (Mopar), Hemi/Mopar registries, Ford Torino/Cobra registries.
3. Established publications: Hemmings, MotorTrend / Hot Rod / Car Craft archive articles,
   Car and Driver archives, Standard Catalog of American Cars (Krause) excerpts, Haynes/Chilton.
4. Wikipedia counts as ONE source only if its claim matches another source; never as both.

NOT acceptable: forums, auction/for-sale listings, YouTube, AI-generated spec sites,
parts-store fitment pages, content farms. Two pages that copy each other count once.

Use WebSearch (mode "standard") and WebFetch. Be efficient: one good page (a GM spec
sheet, a registry's year-by-year engine chart, an allpar engine page) often confirms a
whole year's engine list at once — cite it for every engine it covers.

## Output
Write a JSON file to the scratchpad at `verify_<vehicle-slug>.json` (one per vehicle):

```json
{
  "vehicle": "chevrolet-camaro-1967-1969",
  "years": {
    "1969": [
      {"cid": 302, "hp": 290, "rpo": "Z28 / DZ302", "trims": ["Z/28"],
       "nhra": true,
       "sources": [{"name": "Camaro Research Group", "url": "...", "says": "302/290 Z28 only"},
                   {"name": "GM Heritage Center 1969 Camaro kit", "url": "...", "says": "..."}],
       "status": "confirmed",   // confirmed = NHRA + 2 others agree; or "nhra_only",
                                 // "two_sources_not_nhra", "disputed"
       "note": "short, factual; disagreements go here"}
    ]
  },
  "source_index": [{"name": "...", "url": "...", "type": "manufacturer|registry|publication|wikipedia"}]
}
```

Rules: record the advertised **gross** HP for the year (net HP from 1972 on — say which).
Give RPO / engine code when a source states it. Don't invent: if you cannot find two
non-NHRA sources, mark it `nhra_only` and say what you searched. Do not include torque,
bearing clearances or cam specs. Do not modify any file outside the scratchpad.

Final message: a compact table per vehicle (year × engine × status) and every
disagreement you found, in under 400 words.
