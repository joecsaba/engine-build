# Trend Performance stocking pushrods — extraction notes

Task `TREND` from `scripts/parts-catalog/CLOUD_TASKS.md`. Extractor:
`scripts/parts-catalog/extract_trend.py`. Output: `scripts/parts-catalog/out/trend.json`.
Extracted 2026-10-16.

## Source and fetching

- `https://trendperform.com/robots.txt` (HTTP 200, generated 2026-10-16): only cart, checkout,
  account, wishlist and search paths are disallowed; no `Crawl-delay`. `/files/` is allowed.
- `https://trendperform.com/files/trend-2019-catalog-pdf.pdf`: HTTP 200, `application/pdf`,
  4,001,058 bytes, `Last-Modified: Wed, 02 Apr 2025 13:08:28 GMT`, sha256
  `d13fd6a1802890c537f293f47366162ceb0f81438cf6394facf05d6c7cf50e58`. 44 pages, PDF
  CreationDate 2018-10-26 (InDesign CC 14.0). Saved under `scripts/parts-catalog/dl/trend/`
  (gitignored). The extractor itself makes only these two requests.
- Eight further manual requests were made (one at a time, ≥6 s apart, same UA) to pin down
  the part-number construction, none of which is used by the extractor: `sitemap_index.xml`,
  `sitemap.xml.gz` (164 URLs, no product pages for stocking pushrods), the
  `c-1149673-push-rods-stocking-push-rods.html` category page ("This category is empty" but it
  carries a copy of the p7 table), `rt-4389-...price-sheets.html`, the 2019 Jobber Price List
  PDF, `rt-4388-...order-forms.html`, the Quick Ship category page and the Quick Ship order
  form PDF. 10 requests in total. No 403 / Cloudflare pages. No retailer sites were touched.
  Prices in the price list were not stored.

## What was parsed

Page 7 only ("STOCKING PUSHRODS"). pdfplumber `extract_tables()` returns the one ruled table
cleanly (header + 7 rows):

| Template | Diameter | Wall | Lengths (catalog) | Step | 210° clearance | Taper | Quick ship | Records |
|---|---|---|---|---|---|---|---|---|
| TXXX805 | 5/16 | .080 | 6" to 10" | .025 | optional | n/a | n/a | 161 |
| TXXX1055 | 5/16 | .105 | 7" to 9.8" | .025 | standard | n/a | n/a | 113 |
| TXXX803 | 3/8 | .080 | 6" to 12" | .025 | optional | optional | n/a | 241 |
| TXXX1353 | 3/8 | .135 | 7" to 9.8" | .025 | standard | optional | optional | 113 |
| TXXX1657DT | 7/16 | .165 | 7" to 11.5" | .025 | standard | stocked double-tapered | optional | 181 |
| TXX1657 | 7/16 | .165 | 7.4" to 11.5" | .025 | standard | optional | optional | 165 |
| TXXX2002 | 1/2 | .200 | 8" to 11" | **.050** | standard | optional | optional | 61 |
| **Total** | | | | | | | | **1,035** |

All 1,035 records are `cat: "pushrod"`, one per stocked length, 1,035 distinct part numbers.
Rows skipped: none. Nothing else in the catalog (Precision, BZ, Hard-Tip, V-40, H-13, diesel
pushrods, wrist pins, lifters, bushings, shims) is in scope for this task and none of it has a
tabulated part-number list on the stocking page.

## How fields were derived

- **Part numbers are generated, not printed.** The PART # column is a template; the page says
  "use your desired length to replace XXX" with the single worked example
  `T625805 = a pushrod with a length of 6.25", .080 wall, 5/16"`, and "for lengths longer than
  10" use TT to preface part # instead of the single T". Rule implemented (`length_digits()`):
  length in thousandths, trailing zeros stripped, padded back to at least 3 digits (4 digits
  at 10.000" and over), `TT` prefix for lengths strictly over 10.000". Examples:
  6.000 → `T600805`, 6.025 → `T6025805`, 6.250 → `T625805` (matches the catalog), 7.400 →
  `T7401657`, 10.000 → `T1000803`, 10.025 → `TT10025803`, 10.500 → `TT1050803`, 11.000 →
  `TT11002002`. The extractor asserts that the rule reproduces the catalog example. The rule
  is recorded in `source.partNumberRule`, and every record carries `spec.pnTemplate` and
  `spec.length`, so SKUs can be regenerated under a different convention without re-parsing.
- **Lengths** are stepped with exact integer thousandths (no float drift); `spec.lengthStep`
  is 0.025 or 0.05.
- **.050" step for TXXX2002**: the PDF footnote `*Lengths available in .050" increments` has
  no matching asterisk in any table cell (checked at character level). The manufacturer's
  web copy of the same table lists the 1/2" TXXX2002 row under its own "Lengths in .050"
  increments" heading, so that series is generated at .050 (61 lengths) and the other six at
  .025 as the column header says. Hard-coded in `STEP_OVERRIDE` with the source in a comment.
- **Taper**: `**Standard` on the TXXX1657DT row + footnote "**Pushrods are stocked
  double-tapered" → `spec.taper: "double"`. All other series `spec.taper: "straight"`, with
  `spec.taperOptional: true` where the taper column says Optional (3/8, 7/16 straight, 1/2);
  omitted where it says N/A (both 5/16 series).
- **210° clearance** column → `spec.clearance210: "standard" | "optional"`.
- **Quick ship** column → `spec.quickShip` true for Optional, false for N/A.
- **Diameter** as decimal inches (5/16 → 0.3125, 3/8 → 0.375, 7/16 → 0.4375, 1/2 → 0.5),
  `wall` as decimal inches.
- **Blanket statements** from the p7 text applied to every record: `material` "4130 chromoly,
  one-piece, centerless ground" (the site copy of the text says 4130 explicitly; the p7
  paragraph says "chromoly", the quick-ship bullet says "SAE 4130 seamless tubing"), `ends`
  "5/16 ball-ball", `finish` "black oxide".
- **Fitment**: the catalog gives no engine family (text says oval track, drag, hot rods,
  sport compacts, marine). `fit.fam` is `"Universal"`, the convention already used in
  `rockers.json` / `lifters.json`; it is *not* a family in `cam-fitment.json`. `fit.notes`
  says the part is length-selected.
- `src.page` is 7; `emissions` is `null` for all (internal parts).

## Needs human QA

1. **Part-number digit convention (most important).** Only one example exists in the catalog
   (`T625805`). Trend's other product lines use fixed-width thousandths with trailing zeros
   kept (fuel-pump pushrod `FP6050BS` = 6.050, pin `H9902930225` = .990 × 2.930 × .225), under
   which 6.250 would be `T6250805`, not `T625805`. The catalog example was followed. Confirm
   with Trend or a current listing which form is real and, if needed, regenerate `p` from
   `spec.pnTemplate` + `spec.length` (one-line change in `length_digits()`).
2. **Lengths of exactly 10.000"** keep the single `T` prefix ("longer than 10" read strictly);
   `T1000805` / `T1000803` could also be `TT1000…`.
3. **`TXX1657` has two X's** in the catalog and on the website (the straight 7/16 series);
   treated as the same template as the others (a length such as 7.400 cannot fit in two digits).
4. **Stocking ranges differ in the 2019 Jobber Price List** (dated 2019-05-21, on the same
   site), which was *not* used for the data: it lists 5/16 .080 6–10" in .025 **plus
   10.000–11.000 in .050**; 5/16 .105 7.000–9.650 in .025 plus 9.700–12.250 in .050; 3/8 .080
   6.000–9.700 in .025 plus 9.750–12.250 in .050; 3/8 .135 **9.900–11.000 in .050 only**;
   7/16 straight 7.400–11.500 and 7/16 double-taper 7.000–11.500 in .025; 1/2 .200 8.000–11.900
   in .050. The catalog p7 table (the task's named source) was used as-is; the 3/8 .135 range is
   the biggest disagreement.
5. **Catalog age**: the file is the 2019 catalog (built 2018-10, re-uploaded 2025-04). The site's
   stocking category page shows the same table in 2026, so the series are still current, but
   availability of individual lengths is not verifiable without an order.
6. `spec.taper`, `taperOptional`, `clearance210`, `quickShip`, `finish`, `lengthStep` and
   `pnTemplate` are keys outside the CLOUD_TASKS `pushrod` spec table (`diameter, wall, length,
   material, ends`); adjust downstream if a different convention is adopted.
