# All-years addendum (read verify_brief.md first; this overrides where they differ)

You are extending a model page to every production year. The Camaro is done and is the
model to follow: read `verify_chevrolet-camaro-1970-1981.json` and
`verify_chevrolet-camaro-1982-2002.json` in the scratchpad for format and rigor.

## Your inputs (scratchpad)
- `nhra_<job>.json` — NHRA Stock Car Classification Guide rows for your model and years
  (year → NHRA heading → "CID ci / HP hp" → family codes). NHRA headings can include
  sister models (Malibu, LeMans, Coronet, Satellite, Torino Cobra...) and race-only
  packages; keep only the model you were assigned, and use the rest as context.
- `epa_<job>.json` — EPA fueleconomy.gov rows, 1984+ only (year → [displacement L,
  cylinders, turbo "T", supercharger "S", EPA model name, EPA engine description]).
  The EPA counts as ONE independent source for "this displacement / cylinder count /
  induction was sold in this model that year". It says nothing about horsepower or codes
  and can't tell two engines of the same size apart. Cite it as "EPA fueleconomy.gov
  vehicle data", url https://www.fueleconomy.gov/feg/download.shtml.

## Rules
- At least 3 independent sources per engine and year. Several Wikipedia articles count as
  ONE source. Two sites that copy each other count once.
- HP: advertised gross through 1971, SAE net from 1972 (record what the source states for
  that model year; mid-generation re-ratings belong to their year).
- Engines NHRA skips (base fours and sixes, turbo fours, V6s) still belong on the page;
  status "three_sources_not_nhra" when 3 non-NHRA sources confirm them.
- Where sources disagree on a rating, record the factory figure as `hp`, mark status
  "disputed" only if you cannot tell which is right, and explain in `note`
  (e.g. "NHRA lists 165 hp, the prior year's figure; GM gives 175").
- Dealer conversions (SLP, Saleen, Roush, Hurst unless factory-built, Yenko, etc.) are not
  factory engines: record them with status "dealer_conversion". Shelby, factory COPO,
  factory Drag Pak and similar factory-built packages are factory; race-only (not street
  legal) packages get status "race_only" and need 2 sources.
- Engines listed in literature but never built: status "excluded_not_produced".
- Add `"gen"` (e.g. "gen2") to each entry, plus the RPO / engine code and common name
  (e.g. "Cobra Jet", "Hemi", "LS1", "Coyote") where a source states them, and the trims.
- Mid-year changes go in `note`.

## Good factory sources
- GM: GM Heritage vehicle information kits,
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/<make>/<year>-<Make>-<Model>.pdf`
  (Chevrolet has them; Pontiac does not). Scanned — OCR them. OCR tooling from earlier
  agents: scratchpad `ocrtool/` and `g2tool/ocr2.py` (fixes rotated/inverted pages);
  pillow and winocr are installed.
- Factory brochures: oldcarbrochures.org / oldcarbrochures.com (read page images).
- Ford / Stellantis (Dodge) / Chevrolet press releases (media sites often 403; reprints
  marked "Source - <maker>" on conceptcarz are acceptable, cite them as such).
- Not usable (blocked): allpar (402), Hemmings, MotorTrend, Car and Driver; Hagerty partly.

## Output
Write `verify_<job>.json` in the scratchpad, same schema as the Camaro files
(`vehicle`, `years`, `source_index`). Final message: compact year × engine × status table
and every disagreement, under 400 words. Load WebSearch/WebFetch with ToolSearch
("select:WebSearch,WebFetch") first. Work only in the scratchpad.
