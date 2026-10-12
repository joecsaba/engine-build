# Engine spec verification brief

We are adding engine spec pages to engine-build.com. The owner's rule: every published
spec must be confirmed by at least 3 independent reputable sources. Sources are kept in
private files; they are never shown on the site.

## Fields to verify, per engine
displacement (ci and L), cylinders, configuration (V8 / inline-six / V6 ...),
bore (in), stroke (in), rod length (in) where published, compression ratio(s),
firing order, valvetrain (OHV / SOHC / DOHC, valves per cylinder), block material,
head material, induction (carb / TBI / port injection / direct injection; turbo or
supercharger), fuel type, and the production years.

Also list the factory ratings the engine carried, as variants: year, advertised hp
(gross through 1971, SAE net from 1972), compression ratio for that version if it differs,
and the code/RPO/name of that version. Variants need the same 3-source rule; if a variant's
rating can't reach 3 sources, list it under "unverified_variants" with what you found.

DO NOT collect torque specs, bearing clearances, or cam lift — the site does not publish them.

## Sources
Independent and reputable, in order of preference:
1. Manufacturer material: GM Heritage Center info kits
   (gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/...),
   factory brochures/spec sheets (oldcarbrochures.org — read page images), service manuals,
   Ford/Stellantis/GM press releases and media spec sheets (all of one maker = ONE source).
2. Established references and publications: Hot Rod / Car Craft / Engine Masters articles
   if reachable, Hagerty, Old Cars Weekly, Mac's Motor City Garage, Ate Up With Motor,
   Curbside Classic, Standard Catalog excerpts, Haynes/Chilton excerpts, marque registries,
   EPA (for displacement/cylinders/induction only), NHRA engine blueprints
   (nhra.net/tech_specs/engine/blueprints — one source; the site's own NHRA blueprint data
   is in C:\Engine Website\workflows\data\nhra_blueprints\<MAKE>-<YY>.json, read-only).
3. Wikipedia counts as ONE source total, and only where another source agrees.
Not acceptable: forums, for-sale listings, parts-store fitment pages, AI spec sites,
content farms. Two pages copying each other count once.

Bore/stroke published in mm by the maker: convert to inches (4 decimals) and keep the mm
figure in the note.

## Output (scratchpad)
`engine_specs_<job>.json`:
```json
{"engines": [{
  "id": "chevrolet-348",
  "name": "Chevrolet 348 W-series V8",
  "fields": {
    "bore_in": {"value": 4.125, "sources": [{"name": "...", "url": "...", "says": "..."}, ...], "note": ""},
    "stroke_in": {...}, "displacement_ci": {...}, "displacement_l": {...}, "num_cylinders": {...},
    "configuration": {...}, "rod_length_in": {...}, "firing_order": {...}, "valvetrain": {...},
    "block_material": {...}, "head_material": {...}, "induction": {...}, "fuel_type": {...},
    "years": {"value": "1958-1961 (cars), 1958-1964 (trucks)", ...}
  },
  "variants": [{"year": 1958, "hp": 250, "hp_basis": "gross", "compression_ratio": 9.5,
                "code": "...", "induction": "4-bbl", "sources": [...]}],
  "unverified": {"field": "what was found"},
  "unverified_variants": [...]
}]}
```
A field with fewer than 3 independent sources goes under "unverified" instead of "fields".
Load WebSearch/WebFetch with ToolSearch ("select:WebSearch,WebFetch") first. Work only in
the scratchpad. Final message: per engine, which fields and variants verified, what didn't,
and any disagreements — under 350 words.
