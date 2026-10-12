# Vehicle pages: research and curation

The audit trail behind `data/vehicles/<make>/<model>.json`, which the site builds from.
Nothing in this folder is read by the build.

- `verify/verify_*.json` holds the per-model research. Every engine/year carries its sources, with what each source says, a status and a research note. NHRA rows came from the NHRA Stock Car Classification Guides (nhraracer.com/stockcarclassification), which `tools/scc_parse.py` parses from the guides' .xls files, plus EPA fueleconomy.gov data for 1984 on.
- `specs/<model>.json` is the curation for each page: page and generation copy, which disputed entries were resolved and how, rating ranges, notes, exclusions and link overrides. `tools/make_specs.py` writes the specs for every model except the Camaro, whose spec is hand-edited.
- `tools/to_vehicle.py` converts verify + spec into the site file:

      python tools/to_vehicle.py <dir with verify_*.json> ../vehicles specs/camaro.json

## Rules

- An engine/year goes on a page only when at least three independent sources confirm it.
  - Everything the manufacturer published counts as one source: info kits, brochures, press releases.
  - Several Wikipedia articles count as one source.
  - NHRA is one source and has its own errors.
- The rating shown is the factory figure. Where sources disagree, the row says so. Where no figure can be settled, the row shows the range of published ratings.
- SAE net from 1972 on.
- Never on a page: dealer conversions (SLP, Shelby GT/GT-H) and engines that were catalogued but not built (1970 LS6 Camaro, 1968 427 Mustang/Torino).
- Factory race-only cars (COPO, Cobra Jet, Drag Pak, Hemi Super Stock) are listed separately and need two sources.
- `"draft": true` in a site file keeps it out of deploys. It builds locally only with `VEHICLE_DRAFTS=1`.
