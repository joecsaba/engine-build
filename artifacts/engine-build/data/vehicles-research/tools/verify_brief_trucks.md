# Trucks and Jeeps addendum (read verify_brief.md, then verify_brief_allyears.md, then this)

This overrides the earlier briefs where they differ.

## Scope
- Light-duty / half-ton models only. Chevrolet C10/K10 and C1500/K1500, Silverado 1500;
  Ford F-100 and F-150; Dodge D100/D150/W100/W150 and Ram 1500. Skip engines offered
  only in 3/4-ton and 1-ton trucks (2500/3500, F-250, D200). Record an engine as long as the
  half-ton offered it, including diesels (e.g. GM 6.2 diesel in the C10, Ram 1500 EcoDiesel,
  F-150 3.0 Power Stroke).
- Jeep: every civilian model in the job (CJ, Wrangler, Cherokee, Grand Cherokee,
  Wagoneer/Grand Wagoneer, Gladiator). Skip military-only (M38, MB) and export-only engines
  unless the vehicle was sold in the US with them; say which in `note` if sources mention them.
- Both 2WD and 4WD versions count as the same model. Note in `trims` when an engine was 2WD-only
  or 4WD-only.
- Special factory trucks belong on the page: 454 SS, Lightning, SVT Raptor/Raptor R, Li'l Red
  Express, Warlock, Ram SRT-10, TRX, Silverado ZR2, Trackhawk, SRT8, Wrangler 392, Cheyenne
  Super 10, etc. Electric drives (F-150 Lightning 2022+, Silverado EV) get `"electric": true`,
  `cid: null`, and the rated output as `hp`.

## Sources
- NHRA barely covers trucks and Jeeps, so most engines will be `three_sources_not_nhra`
  (3 independent non-NHRA sources). That is normal; don't spend effort hunting NHRA rows.
- The EPA file (1984+) is one source for displacement/cylinders/induction per year.
- Good factory material: truck sales brochures and data books on oldcarbrochures.org/.com
  (Chevrolet "Pickups" brochures, Ford "Ford Trucks" brochures, Dodge "Pickups" brochures,
  Jeep brochures), GM Heritage truck information kits if they exist for the year,
  Ford/Stellantis/GM press releases and spec sheets (reprints marked as maker-sourced are fine).
- Good registries/publications: 67-72chevytrucks.com, 73-87chevytrucks.com, ford-trucks.com
  tech articles (not its forum), fordification.com, the CJ-3B Page (cj3b.info), ewillys.com
  articles that reproduce factory literature, Jeep Wrangler/Cherokee owner clubs' spec pages,
  Haynes/Chilton, Standard Catalog of American Light-Duty Trucks (Krause) excerpts.
  Still no forums, auction listings, parts-store fitment, or content farms.

## Ratings
- Trucks often carried two ratings in a year (light-duty vs heavy-duty emissions, or
  California). Record the half-ton federal light-duty figure as `hp`, and put the others in
  `note`. Gross through 1971, SAE net from 1972; some truck makers used net earlier or later.
  Record what the source states for that model year and say which basis.
- Where a rating varies by cab/axle/GVWR within the half-ton, give the range in `note`
  and use the most common figure for `hp`.

## Output
Same schema as before (`vehicle`, `years`, `source_index`), written to `verify_<job>.json` in
the scratchpad. Keep each entry's `name` short, like "5.7L / 350 V8", plus `rpo` (engine code,
e.g. "L31", "LT1", "Windsor", "Magnum 5.9") and `common_name`.
