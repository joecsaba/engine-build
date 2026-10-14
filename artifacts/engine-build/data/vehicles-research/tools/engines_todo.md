# Engines that need spec pages (user asked to keep this list, 2026-10-13)

Every engine a visitor selects should open that engine's own page, not the family list (user, 2026-10-13).
vehicle_engine_records.mjs builds a dated page per engine code from the verified vehicle rows plus the
family's verified bore/stroke; re-run it after adding vehicles. As of 2026-10-13: 4,781 of 5,357 vehicle
engine rows open a specific engine page, 274 still open a family page (families holding two different
engines of the same size: fix the family, then re-run), 191 have no page (listed below).

Vehicle pages list these engines, but there is no engine page with verified specs to link to.
Regenerate the live list with `node data/vehicles-research/tools/engine_gaps.mjs` (run from
artifacts/engine-build, with VEHICLE_DRAFTS=1 to include drafts). Source rule: 3 independent sources,
or 2 reputable sources that agree (second pass). Specs go in public/data/engines, sources in data/engine-sources.

## Missing (no page at all)
| Engine | Size | Used in |
|---|---|---|
| Ford 300 inline six (Big Six, EFI from 1987) | 4.9 L / 300 ci | F-100 1965–1983, F-150 1975–1996 — biggest gap |
| Ford FE 360 truck V8 | 5.9 L / 360 ci | F-100 1968–1976, F-150 1975–1976 |
| GM 6.2 diesel V8 (LH6) | 379 ci | C/K 1982–1993 |
| GM 6.5 diesel V8 (L49, L56 turbo) | 395 ci | C/K 1500 1994–1997 |
| Ford 6.2 Boss V8 | 379 ci | F-150 2010–2014 (Raptor) |
| Ford 3.3 Ti-VCT V6 | 204 ci | F-150 2018–2023 |
| Ford 5.2 Predator supercharged V8 | 317 ci | F-150 Raptor R 2023–2026 |
| Ford 4.2 Essex V6 (truck) | 256 ci | F-150 1997–2008 |
| Ford 3.0 Power Stroke V6 diesel (Lion) | 183 ci | F-150 2018–2021 |
| Buick 3.0 V6 (LK9, LN7) | 181 ci | Skylark, Cutlass 1982–1988 |
| GM 2.2 OHV (LN2) — specs verified 2026-10-13 (89 x 88 mm), page not built | 133 ci | Cutlass 1993–1996 |
| GM 3.9 V6 (LZ9, LZ8, LGD/LZG) | 237 ci | Impala 2006–2011, Monte Carlo 2006 |
| Ford/Jaguar 3.9 V8 (AJ-30) | 240 ci | Thunderbird 2002–2005 |
| Buick 322 Nailhead V8 — specs verified (4.00 x 3.20), page lost with the GMC family | 322 ci | Skylark 1953–1954 |
| Chrysler 3.2 Pentastar V6 | 198 ci | Cherokee 2014–2022 |
| Chrysler 2.4 PowerTech DOHC | 148 ci | Wrangler 2003–2006 |
| FCA 2.4 Tigershark MultiAir2 | 144–146 ci | Cherokee 2014–2023 |
| Renault 2.1 turbodiesel (J8S) | 126 ci | Cherokee 1985–1987 |
| Mercedes-Benz OM642 3.0 V6 diesel | 182 ci | Grand Cherokee 2007–2008 |
| Willys Go-Devil L-134 flathead four | 134 ci | CJ-2A, CJ-3A 1945–1952 |
| Perkins 4.192 diesel | 192 ci | CJ-5, CJ-6 1961–1965 |
| Ford 215 six, 239 flathead V8, 239 Y-block | 215 / 239 ci | F-100 1953–1955 |
| Ford 262 truck six | 262 ci | F-100 1964 |
| Mitsubishi 6DR5 4.0 diesel | 243 ci | Dodge D150 1978 |

## Batch 5 gaps (most-searched models) — popular engines, high priority
| Engine | Size | Used in |
|---|---|---|
| Toyota 3VZ-E 3.0 V6 | 181 ci | 4Runner, Pickup 1988–1995 |
| Toyota 5VZ-FE 3.4 V6 | 206 ci | 4Runner 1996–2002, Tacoma 1995–2004 |
| Toyota 1GR-FE 4.0 V6 | 241 ci | 4Runner 2003–2024, Tacoma 2005–2015 |
| Toyota 2TR-FE / 3RZ-FE / 2RZ-FE fours | 164 / 164 / 149 ci | 4Runner, Tacoma |
| Toyota 2GR-FKS 3.5 V6 | 211 ci | Tacoma 2016–2023 |
| Toyota F / 2F / 3F-E / 1FZ-FE sixes | 236 / 258 / 241 / 273 ci | Land Cruiser 1958–1997 |
| Toyota 4M-E / 5M-E / 5M-GE / 7M-GE / 7M-GTE sixes | 156 / 168 / 180 ci | Supra 1979–1992 |
| Toyota 3R / 8R / 18R / 20R fours, L / 2L / 2L-T diesels | | Toyota Pickup 1964–1988 |
| International 6.9 / 7.3 IDI diesels | 420 / 444 ci | F-250 1983–1994 (unlinked; not the Power Stroke) |
| Ford 6.4 Power Stroke, 6.2 Boss, 6.8 V8 (2023+) | 390 / 379 / 415 ci | Super Duty |
| Ford 215 six, 239 flathead/Y-block, 262 truck six, 300 six, FE 360 | | F-250 (also on the F-100 list) |

## Records to fix
- Pontiac 135ci 2000–2001 140 hp: the 2000–01 Sunfire 2.2 was the 115 hp LN2; the 140 hp L61 is 2002+.
- Ratings removed pending verification: Audi 3.2 CALA, Acura NSX JNC1.
- Buick 350 ratings not yet verified: 1971 4-bbl 260, 1972, 1974, 1979–1980.
- Mazda rotary records carry meaningless bore/stroke.

## New trucks wave (added as their research comes in)
| Engine | Size | Used in |
|---|---|---|
| GM/Isuzu 1.9 four (LR1) | 119 ci | S-10 1982–1985 |
| GM 2.0 four (LQ2) | 121 ci | S-10 1983–1984 |
| Isuzu 2.2 diesel (LQ7) | 137 ci | S-10 1984–1985 |
| Ford 2.9 Cologne V6 | 177 ci | Ranger 1986–1992 |
| Ford 2.5 Lima four | 153 ci | Ranger 1998–2001 (left unlinked; the same-size page is a Duratec) |
| Perkins 4.135 2.2 diesel | 134 ci | Ranger 1983–1984 |
| Mitsubishi 4D55T 2.3 turbodiesel | 143 ci | Ranger 1985–1987 |

## Data to re-check
- Chevrolet 262ci 1985 130 hp gas record carries the Olds diesel 4.3 bore/stroke (4.057 x 3.385); the gas 4.3 is 4.00 x 3.48.
- Mercury "Cologne" family includes 1961-62 170 ci records (the Falcon six), which are not Cologne engines.
- C/K Pickup 1994 5.7 L05: page shows 200 hp; the K5 Blazer research found 210 hp for the same engine (Wikipedia Blazer article + Consumer Guide).
- K5 Blazer 1980: every engine has only 2 sources that don't fully agree — year left empty.

## Batch 5 (imports, GM SUVs, Ram HD) — no spec page yet
| Engine | Size | Used in |
|---|---|---|
| Honda B18A1 / B18B1 1.8 (1834 cc) and B17A1 1.7 VTEC | 112 / 102 ci | Integra 1990–2001 |
| Honda L15 1.5 turbo (L15B7, L15CA) and LEA 1.5 hybrid | 91 ci | Civic 2012–2026, Integra 2023+ |
| Honda EB / ED / EJ / EM / EV / EW CVCC fours | 71–91 ci | Civic 1973–1987 |
| Honda R18 1.8 (incl. GX CNG) and LDA 1.3 IMA hybrid | 110 / 82 ci | Civic 2003–2015 |
| Honda LFC2 2.0 two-motor hybrid | 122 ci | Civic 2025+ |
| Honda D15 / D17 records at their real sizes (D-series family has only 91.5 / 103.7) | 91 / 102 ci | Civic 1988–2005 (linked to the family) |
| Nissan L24 / L26 / L28E / L28ET sixes | 146 / 156 / 168 ci | Datsun/Nissan Z 1970–1983 |
| Mitsubishi 4G37 1.8; Chrysler 420A 2.0 | 107 / 122 ci | Eclipse 1990–1999 (420A unlinked; same-size page is the 4G63) |
| GM 6.2 / 6.5 diesels (LH6, L56, L65) | 379 / 395 ci | Suburban 1982–1999, Tahoe 1995–1999 |
| GM 8.1 Vortec L18 | 496 ci | Suburban 2001–2006 |
| Mazda 12A / 13B rotary dated records | 70 / 80 ci | RX-7 (linked to the rotary family page only) |

## Batch 5 ratings withheld (sources disagree; engine shown without hp)
- Miata 2006 LF-VE (170 vs 166), Tahoe 1996 L31 (255 vs 250), Tahoe 2008 L92 (one source), Eclipse 2001 6G72 (205 vs 200),
  Suburban 1968 396 and 1975–78 454, Ram HD 2006–08 5.7 Hemi (345 vs 330), Ram HD 2021 6.7 HO (420 vs 400), Z 1972–73, 1977–78, 1980 and 1988–89.
- Left off entirely (one or two sources): Civic 2007 GX, 2018–19 Sport/Type R years with one source, 2025 Type R; Z 1975 260Z; Suburban 2014 6.0; Ram HD 5.7 CNG 2015/2017–18, 2017 6.7 HO.

## Batch 6 — no spec page yet
| Engine | Size | Used in |
|---|---|---|
| Chrysler FirePower Hemi (first generation) 331 / 354 / 392 | 331 / 354 / 392 ci | Chrysler 300 letter cars 1955–1958 (392 unlinked: the same-size page is the modern 6.4) |
| International Comanche 4-152 / 4-152T / 4-196; IH V-266 / V-304 / V-345 | 152 / 196 / 266 / 304 / 345 ci | Scout 1961–1980 (no International engine pages yet) |
| Nissan SD33 / SD33T diesels | 198 ci | Scout 1976–1980 |
