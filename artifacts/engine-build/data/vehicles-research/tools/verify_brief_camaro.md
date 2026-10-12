# Camaro all-years addendum (read verify_brief.md first; this overrides where they differ)

NHRA source 1 for 1970 onward is `nhra_camaro_1970on.json` in the scratchpad
(year → NHRA heading → "CID ci / HP hp" → family codes). The 1967–69 work is done
(`verify_chevrolet-camaro-1967-1969.json`) — use it as the model for format and rigor.

## Extra source for 1984+: EPA
`epa_camaro.json` (year → list of [displacement L, cylinders, turbo "T", supercharger "S",
EPA model name, EPA engine description]) from fueleconomy.gov. The EPA is an official
source and counts as ONE independent source for "this displacement/cylinder count/induction
was sold in a Camaro that model year". It says nothing about horsepower or RPO, and it can't
tell two engines of the same size apart (L98 vs LT1, both 5.7). Cite it as
"EPA fueleconomy.gov vehicle data" with url https://www.fueleconomy.gov/feg/download.shtml.

## Ratings
Advertised SAE net HP from 1972. Where GM revised a rating mid-generation (e.g. LT1 275→285,
LS1 305→310→325, 2016+ SAE-certified figures), record the figure for that model year.

## Engines NHRA does not list
NHRA only lists engines that matter for drag classes; it often skips base sixes, fours and
turbo fours (e.g. 2.0T LTG, 3.6 V6 LFX/LGX, 2.5 Iron Duke years). Those still belong on the
page: confirm them with 3 independent sources (GM press release / GM media spec sheet /
GM Heritage kit / brochure, EPA, a reputable publication or Wikipedia) and mark
"three_sources_not_nhra".

## COPO race cars (2012+)
NHRA's 2012+ sheets include COPO Camaro factory drag cars (e.g. supercharged 327/350, the
427, the 572). These are not street-legal and were not offered in a road car. Record them
with status "race_only" with 2 sources, kept separate from the road-car engines.

## Generations
gen2 1970–1981 · gen3 1982–1992 · gen4 1993–2002 · gen5 2010–2015 · gen6 2016–2024.
Add `"gen": "gen2"` etc. to each engine entry.

Also record, per engine, the RPO and (where a source states it) the common name
(e.g. "LT1", "Iron Duke", "Tuned Port Injection"). Mid-year changes go in `note`.
