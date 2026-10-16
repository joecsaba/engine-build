# Fel-Pro LS line card — extraction notes

Task `FELPRO` from `scripts/parts-catalog/CLOUD_TASKS.md`. Extractor:
`scripts/parts-catalog/extract_felpro.py`. Output: `scripts/parts-catalog/out/felpro.json`.
Extracted 2026-10-16.

## Source and fetching

- `https://www.felpro.com/robots.txt` (HTTP 200): `User-agent: *`, `Allow: /`, only `/data.html`
  and `/data/` disallowed, no `Crawl-delay`. The PDF path under `/content/dam/` is allowed.
- `https://www.felpro.com/content/dam/marketing/North-America/felpro/pdfs/LS-Line-Card.pdf`:
  HTTP 200, `application/pdf`, 270,895 bytes, `Last-Modified: Mon, 10 Jul 2017 19:18:16 GMT`,
  sha256 `83418ea81755689330bfe107d66bf2dbce7dac6b2f81f903aad2f49239ce132c`. 2 pages, both with
  a text layer. PDF title "Fel-Pro LS Engine Perf Line Card", CreationDate 2015-02-11, ModDate
  2015-03-10 (InDesign CC 2014). Footer: "©2015 Federal-Mogul Motorparts Corporation …
  Form # 151011". Saved under `scripts/parts-catalog/dl/felpro/` (gitignored) together with the
  response headers and the robots.txt copy.
- Requests: 4 in total to `www.felpro.com`, one at a time, ≥6 s apart, with the project UA:
  robots.txt and the PDF once by hand to confirm the layout, then robots.txt and the PDF again
  by the extractor's own fetch (the hand-fetched copy was deleted first so the committed data
  comes from the script's download; both downloads have the same sha256). No 403 / Cloudflare
  pages. No other hosts and no retailer sites were touched.

## What was parsed

Both pages, table column only. The right-hand marketing column (words at x ≥ 405 pt:
"LaserWeld stopper layer…", "High-temp conformable coating…", "Fel-Pro Performance intake
manifold gaskets for LS engines feature…" etc.) is excluded before parsing and nothing from it
is stored. pdfplumber `extract_tables()` finds only empty frames on these pages, so the parser
groups `extract_words()` by baseline and matches each part-number line with a regex.

| Page | Section | Columns | PNs | Records | cat |
|---|---|---|---|---|---|
| 1 | Cylinder Head Gaskets | Part Number, Bore, Thickness, Volume, Description | 31 | 31 | `headGasket` |
| 2 | Intake Manifold Gaskets | Part Number, Dimensions, Description | 9 | 9 | `gasket` |
| 2 | Exhaust Header Gaskets | Part Number, Dimensions, Description | 2 | 2 | `gasket` |
| 2 | Full Set | Part Number, Dimensions, Description | 2 | 2 | `gasket` |
| | **Total** | | **44** | **44** | |

44 distinct part numbers, one family each (`GM LS`), so no multi-family duplicates. Rows
skipped: none. The two footnotes (`*Suitable for Marine Applications`, `**For applications not
covered, use individual components`), the column headers and the section titles are consumed as
structure, not rows.

The task brief estimated "23 PNs" for this line card. The probe sample
(`felpro_ls_linecard_sample.csv`, 15 rows) came from a regex that only matched four-digit part
numbers; the 16 five-digit PNs (26472–26496) on page 1 were missed by the probe, and page 2 was
not sampled. All 15 sample rows agree with the extracted bore / thickness / volume.

## How fields were derived

### Head gaskets (p1)

- `bore`, `thickness` in decimal inches, `volumeCc` as a number (`9.4cc` → 9.4).
- **Construction / material.** Two sub-headings sit inside the table column and apply to the
  rows below them until the next heading: "Steel Core Laminate with pre-flattened wire ring"
  above PN 1041 → `material: "composite"`, `construction: "steel core laminate, pre-flattened
  wire ring"`; "PermaTorque® MLS" above 1160L-041 → `material: "MLS"`,
  `construction: "PermaTorque MLS"` for the remaining 30 PNs. The word positions were checked
  (both headings at x 110–174 pt, inside the Bore/Thickness columns, not in the marketing column).
- **`side`**: `L` / `R` from the part-number suffix (`1160L-041` → `L`). Where the description
  also says "Left-hand." / "Right-Hand." the parser asserts it agrees with the suffix. The RHS
  block rows (26494–26496) carry the hand only in the PN. `fit.notes` gets "one per bank".
- **"2 req."** (1041, 1185-041/-053, 26474-041/-053): one PN serves both banks →
  `qtyRequired: 2`, no `side`, `fit.notes` "2 required".
- **`*`** after a PN (every PN except 1041) → `marineSuitable: true`, from the footnote
  "*Suitable for Marine Applications".
- **Fitment**: all `fit.fam = "GM LS"`, `cyl: 8`. `fit.ci` is set only where the catalog names
  a production engine: "LS1/LS6" → `[346]`. The aftermarket-block applications get notes and no
  `ci`: "GM LSX" → "GM LSX block", "World Products Warhawk" → "World Products Warhawk block",
  "RHS Aluminum Block" → "RHS aluminum block".

### Intake manifold gaskets (p2)

- Dimensions `1.19˝ x 3.34˝ x .045˝ Thick` → `portWidth`, `portHeight`, `thickness`. The
  catalog does not label the two port axes; width × height is assumed (the LS1/LS6 cathedral
  port at 1.19 × 3.34 and the LS7 / L92 rectangle ports at 1.45 × 2.45 / 1.35 × 2.70 are only
  consistent with that order).
- "Composite with coating" → `coated: true`; "with Printoseal®" → `printoseal: true`;
  `material: "composite"`, `type: "intake manifold"`.
- Fitment: "LS7" → `ci [427]`, "L92" → `ci [376]`, "LS1/LS6" → `ci [346]`; the catalog's own
  engine name is kept in `fit.notes`.

### Exhaust header gaskets (p2)

- 1438 `1.75˝ x 1.55˝` → `portWidth` / `portHeight` (same width × height assumption);
  1440 `1.90˝ Dia.` → `portDia: 1.9`. Both LS1/LS6; "Stock exhaust ports" / "Large race ports"
  kept in `fit.notes` and `name`.
- Description line "Perforated steel core with anti-stick coating" → `antiStickCoating: true`;
  `material: "high-density fiber facing, perforated steel core"` (from the same table rows and
  the section text), `type: "exhaust header"`.
- The wrapped description lines are attached to the nearest PN row by vertical distance
  (≤ 12 pt); the three-line Full Set descriptions use the same rule.

### Full sets (p2)

- 2810 (3.945" bore) and 2817 (4.100" bore), LS1/LS6: `kit: "full set"`, `bore`,
  `headGasketIncluded: true`, `headGasketMaterial: "MLS"`, `includes` = the four items in the
  catalog sentence ("MLS cylinder head gaskets", "molded rubber valve cover and oil pan gaskets",
  "intake manifold gaskets", "gaskets and seals required to reassemble engine"). The `**`
  footnote ("for applications not covered, use individual components") goes to `fit.notes`.

`src` is `{doc, edition: "2015 (Form # 151011)", url, page}`; `emissions` is `null` for all.

## Needs human QA

1. **Age of the source.** The line card is the 2015 edition (last re-uploaded 2017). Fel-Pro's
   current performance range has grown since (more LS bore sizes, Gen V LT, etc.) and some of
   these PNs may have been superseded. The task named this PDF as the source; a current
   Fel-Pro performance catalog would be the place to refresh from.
2. **Intake / header port dimension order** (width × height) is an assumption, see above.
3. **`ci` values** (346 for LS1/LS6, 427 for LS7, 376 for L92) are the production
   displacements of the engines the catalog names, not stated in the PDF. The L92 intake gaskets
   (1222-x) very likely also fit the other rectangle-port LS3/L99/L76 heads and the LS1/LS6
   gaskets other cathedral-port engines, but only the catalog's own application is recorded.
4. **1041 material** is recorded as `"composite"` (steel core laminate with a wire ring) because
   the brief's `headGasket.material` enum is `MLS / composite / copper`; `construction` keeps the
   catalog wording.
5. **Full-set head gasket bores** 3.945 / 4.100 presumably correspond to the 1160 / 1161 head
   gaskets, but the catalog does not say which component PNs the sets contain.
6. Spec keys outside the brief's tables: `construction`, `qtyRequired`, `marineSuitable` on
   head gaskets; `type`, `portWidth`, `portHeight`, `portDia`, `coated`, `printoseal`,
   `antiStickCoating`, `kit`, `includes`, `headGasketIncluded`, `headGasketMaterial` on
   `gasket` records (the brief defines no `gasket` spec table; `kit` / `includes` /
   `headGasketIncluded` follow the convention already used in `hamilton.json`).
