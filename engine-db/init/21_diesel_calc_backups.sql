-- =============================================================================
-- 10_diesel_calc_backups.sql
-- DB mirror of hardcoded diesel calc data — calcs stay TSX-driven; this gives
-- us a source-of-truth backup for the values that ship in the React bundle.
--
-- Source files mirrored (verbatim values):
--   artifacts/engine-build/src/pages/calculators/diesel-single-turbo.tsx
--   artifacts/engine-build/src/pages/calculators/diesel-compound-turbo.tsx
--   artifacts/engine-build/src/pages/calculators/diesel-egt-drive-pressure.tsx
--   artifacts/engine-build/src/pages/calculators/diesel-smoke-lambda.tsx
--   artifacts/engine-build/src/pages/calculators/diesel-lift-pump.tsx
--   artifacts/engine-build/src/pages/calculators/diesel-injector-nozzle-pop-pressure.tsx
--
-- Notes on slug mapping:
--   The calc files use shorthand slugs (e.g. "12v-cummins") that don't match
--   the DB's canonical slugs (e.g. "cummins-59-12v-p"). We add a `calc_slug`
--   column to diesel_platforms so the calc front-end can join cleanly.
--
--   For aggregate calc slugs (`duramax-early` = LB7/LLY/LBZ/LMM,
--   `duramax-late` = LML/L5P) we attach the calc_slug to the most
--   representative existing row rather than create a new aggregate row:
--     - duramax-early  → duramax-lbz   (LBZ is the most reliable / common base)
--     - duramax-late   → duramax-l5p   (L5P is the current platform)
--
--   This is documented per the migration brief — DB stays normalized while
--   the calc gets a usable join key.
--
-- Safe to re-run: every INSERT uses ON CONFLICT DO NOTHING or DO UPDATE,
-- and every ALTER TABLE uses IF NOT EXISTS.
-- =============================================================================


-- =============================================================================
-- 1) EXTEND diesel_platforms with calc-only fields
-- =============================================================================

ALTER TABLE diesel_platforms ADD COLUMN IF NOT EXISTS max_rpm INT;
ALTER TABLE diesel_platforms ADD COLUMN IF NOT EXISTS max_rpm_modified INT;
ALTER TABLE diesel_platforms ADD COLUMN IF NOT EXISTS max_nop_psi INT;
ALTER TABLE diesel_platforms ADD COLUMN IF NOT EXISTS stock_nop_psi INT;
ALTER TABLE diesel_platforms ADD COLUMN IF NOT EXISTS stock_boost_psi INT;
ALTER TABLE diesel_platforms ADD COLUMN IF NOT EXISTS calc_slug VARCHAR(64);
ALTER TABLE diesel_platforms ADD COLUMN IF NOT EXISTS stock_turbo_notes TEXT;

-- Add a unique index on calc_slug so we can ON CONFLICT against it.
-- WHERE clause keeps the unique-index partial so multiple NULLs are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS diesel_platforms_calc_slug_uidx
  ON diesel_platforms (calc_slug)
  WHERE calc_slug IS NOT NULL;


-- =============================================================================
-- 2) UPSERT calc platforms by mapping calc_slug → existing diesel_platforms row
-- =============================================================================

-- ── Single-turbo / Compound-turbo calc slugs ────────────────────────────────
-- Values from HARDCODED_PLATFORMS in diesel-single-turbo.tsx (and matching
-- PLATFORMS in diesel-compound-turbo.tsx, where the data overlaps).

-- 12v-cummins → cummins-59-12v-p (P-pump 1994-1998)
UPDATE diesel_platforms SET
  calc_slug         = '12v-cummins',
  max_rpm           = 3200,
  max_rpm_modified  = 3400,
  stock_boost_psi   = 20,
  stock_nop_psi     = 3550,
  max_nop_psi       = 4930,
  stock_turbo_notes = 'Stock P-pump governor cuts at ~2700 RPM — 3200 RPM requires a governor spring kit. Single turbo swaps are the most common mod. Mechanical P-pump injection. Fuel system scales with P-pump mods + bigger nozzles, not ECU tuning.'
WHERE slug = 'cummins-59-12v-p';

-- 24v-cummins → cummins-59-24v-vp44 (VP44 1998.5-2002)
UPDATE diesel_platforms SET
  calc_slug         = '24v-cummins',
  max_rpm           = 3200,
  max_rpm_modified  = 3400,
  stock_boost_psi   = 24,
  stock_nop_psi     = 4350,
  max_nop_psi       = 4640,
  stock_turbo_notes = 'Stock factory governor is 3200 RPM (3400+ is modified valve-float ceiling, requires upgraded springs). Common rail injection. ECU tuning + single turbo upgrade is the most popular path to 450-550 HP. Compounds are bolt-on-and-tune.'
WHERE slug = 'cummins-59-24v-vp44';

-- 6.7-cummins → cummins-67
UPDATE diesel_platforms SET
  calc_slug         = '6.7-cummins',
  max_rpm           = 3600,
  max_rpm_modified  = 3800,
  stock_boost_psi   = 30,
  stock_turbo_notes = 'Stock VGT is effective to ~450 HP. Single fixed-geometry upgrade for 450-650 HP before considering compounds. Variable geometry stock turbo; compounds replace the VGT with a fixed-geometry primary.'
WHERE slug = 'cummins-67';

-- duramax-early → duramax-lbz (aggregate row representative of LB7/LLY/LBZ/LMM)
UPDATE diesel_platforms SET
  calc_slug         = 'duramax-early',
  max_rpm           = 3400,
  max_rpm_modified  = 3600,
  stock_boost_psi   = 22,
  stock_turbo_notes = 'Factory VGT can support mild tunes. Aftermarket single turbos are drop-in for LBZ/LMM. Compound kits require adapter plates and custom piping; more fabrication than Cummins. (Aggregate: LB7/LLY/LBZ/LMM — calc treats these as one platform.)'
WHERE slug = 'duramax-lbz';

-- duramax-late → duramax-l5p (aggregate row representative of LML/L5P)
UPDATE diesel_platforms SET
  calc_slug         = 'duramax-late',
  max_rpm           = 3500,
  max_rpm_modified  = 3700,
  stock_boost_psi   = 28,
  stock_turbo_notes = 'L5P stock turbo is very capable. Single upgrade mainly for 500+ HP builds. Compound kits require adapter plates and custom piping. Verify kit compatibility with year/model. (Aggregate: LML/L5P — calc treats these as one platform.)'
WHERE slug = 'duramax-l5p';

-- 7.3-powerstroke → powerstroke-73
UPDATE diesel_platforms SET
  calc_slug         = '7.3-powerstroke',
  max_rpm           = 3300,
  max_rpm_modified  = 3500,
  stock_boost_psi   = 15,
  stock_turbo_notes = 'HEUI injection. GTP38R upgrade or aftermarket non-VGT swap. Injectors are the bottleneck before turbo on most builds. Large displacement responds well to compounds but injector upgrades are essential.'
WHERE slug = 'powerstroke-73';

-- 6.0-powerstroke → powerstroke-60
UPDATE diesel_platforms SET
  calc_slug         = '6.0-powerstroke',
  max_rpm           = 3600,
  max_rpm_modified  = 3800,
  stock_boost_psi   = 22,
  stock_turbo_notes = 'Head studs required before adding boost. VGT can support 400-450 HP with tuning before upgrading turbo. Stock TTY head bolts fail at 25-30 PSI.'
WHERE slug = 'powerstroke-60';

-- 6.4-powerstroke → powerstroke-64 (single-swap version notes added here)
UPDATE diesel_platforms SET
  calc_slug         = '6.4-powerstroke',
  max_rpm           = 3600,
  max_rpm_modified  = 3800,
  stock_boost_psi   = 28,
  stock_turbo_notes = 'Factory compound. Some builders delete the compound and run a single larger turbo for simplicity (requires custom exhaust manifold). Already compound from factory — upgrading means bigger turbos in the same compound arrangement.'
WHERE slug = 'powerstroke-64';

-- 6.7-powerstroke → powerstroke-67
UPDATE diesel_platforms SET
  calc_slug         = '6.7-powerstroke',
  max_rpm           = 3500,
  max_rpm_modified  = 3700,
  stock_boost_psi   = 26,
  stock_turbo_notes = 'Stock VGT is strong. Single aftermarket upgrade for 500+ HP builds. Single VGT from factory; compound kits available from aftermarket.'
WHERE slug = 'powerstroke-67';


-- ── Nozzle pop-pressure calc additional NOP fields ──────────────────────────
-- From MECH_PLATFORMS in diesel-injector-nozzle-pop-pressure.tsx
-- (The 12v-ve platform isn't in the single/compound calcs, but is used by
--  the nozzle pop-pressure + EGT + lift pump calcs.)

UPDATE diesel_platforms SET
  stock_nop_psi = 3450,
  max_nop_psi   = 3915,
  stock_turbo_notes = COALESCE(stock_turbo_notes, '') ||
    E'\n[nozzle calc] VE pump is the weakest mechanical pump Cummins used — PDD / Industrial Injection cap performance pop pressure at ~270 bar (3915 PSI). Nozzle upgrades beyond 5x0.014" usually require a P-pump conversion.'
WHERE slug = 'cummins-59-12v-ve';


-- =============================================================================
-- 3) INSERT INTO turbo_models — diesel turbos NOT already in the catalog
-- =============================================================================
-- Ensure (brand, model) is unique so ON CONFLICT works on subsequent runs.
-- Wrapped in a DO block so it's idempotent if the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'turbo_models_brand_model_key'
  ) THEN
    ALTER TABLE turbo_models
      ADD CONSTRAINT turbo_models_brand_model_key UNIQUE (brand, model);
  END IF;
END $$;

-- Existing 12 (skipped per migration brief):
--   S475 SX-E, S480 SX-E, S488 SX-E, BMW GT4088 BatMoWheel, S480 BatMoWheel,
--   HE351CW, HE351VE, HE451VE (64mm), HE451VE (67mm), HX35 (12V), HX40, HX55.
--
-- Mapped:
--   compressorMm → compressor_wheel_mm
--   maxFlow      → max_flow_lbmin
--   minHp        → hp_range_min
--   maxHp        → hp_range_max
--   arOptions    → ar_options
--   flange       → exhaust_flange
--   "diesel"     → fuel_type
--   notes        → notes (with bearing + price appended for context)

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, max_flow_lbmin, max_pressure_ratio,
   surge_flow_lbmin, turbine_wheel_mm, exhaust_flange, ar_options, application,
   hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  -- ── Holset (Cummins-centric) ──────────────────────────────────────────────
  ('Holset',    'HY35W',                   'HY35',     56, 45,  NULL, NULL, NULL, 'T3',      '0.83',                           'Cummins 5.9 CR (03-04) stock',          200, 375,  'diesel',
   'Stock ''03-''04 common rail 5.9. Responsive but limited on top-end. Journal bearing. Price $200-400 used.'),
  ('Holset',    'HE300VG',                 'HE300',    55, 45,  NULL, NULL, NULL, 'T3',      'VGT (variable)',                 'Cummins 6.7 stock VGT',                 200, 400,  'diesel',
   'Stock current 6.7 (stock 55mm wheel). With 64mm aftermarket wheel upgrade, supports 550-700 HP per Diesel Power Source tiered ratings. VGT bearing. Price $400-700 used.'),
  ('Holset',    'HX40 Super',              'HX40',     62, 58,  NULL, NULL, NULL, 'T3 / T4', '0.83 / 1.00',                    'aftermarket Holset build',              325, 550,  'diesel',
   'Popular aftermarket Holset build. Larger compressor wheel for more top-end. Journal bearing. Price $500-900.'),
  -- ── BorgWarner S300 series ────────────────────────────────────────────────
  ('BorgWarner','S358',                    'S300',     58, 45,  NULL, NULL, NULL, 'T3 / T4', '0.83 / 1.00',                    'entry diesel single',                   250, 450,  'diesel',
   'Entry-level S300. Quick spool for tow rigs, limited above 400 HP. Journal bearing. Price $600-900.'),
  ('BorgWarner','S362',                    'S300',     62, 52,  NULL, NULL, NULL, 'T3 / T4', '0.83 / 1.00 / 1.10',             'street/tow diesel single',              300, 550,  'diesel',
   'Sweet spot for 400-500 HP tow/street builds. Fast spool, great mid-range. Journal bearing. Price $650-950.'),
  ('BorgWarner','S363',                    'S300',     63, 55,  NULL, NULL, NULL, 'T3 / T4', '0.83 / 1.00 / 1.10',             'Cummins street single',                 325, 575,  'diesel',
   'Slightly larger than S362. Popular for 5.9 Cummins 450-525 HP builds. Journal bearing. Price $650-1,000.'),
  ('BorgWarner','S366',                    'S300',     66, 62,  NULL, NULL, NULL, 'T3 / T4', '0.83 / 1.00 / 1.10',             'diesel street/strip single',            400, 700,  'diesel',
   'The go-to for 500-600 HP single-turbo diesel builds. Great balance of spool and flow. Journal bearing. Price $700-1,100.'),
  ('BorgWarner','S369',                    'S300',     69, 70,  NULL, NULL, NULL, 'T3 / T4', '0.83 / 1.00 / 1.10',             'diesel aggressive single',              450, 800,  'diesel',
   'Aggressive single-turbo choice. Noticeable lag vs S366 but more top-end flow. Journal bearing. Price $750-1,100.'),
  ('BorgWarner','S372',                    'S300',     72, 80,  NULL, NULL, NULL, 'T3 / T4', '0.83 / 1.00 / 1.10',             'largest S300 single',                   500, 950,  'diesel',
   'Largest common S300. Significant lag as single turbo — most people go compound above this. Journal bearing. Price $800-1,200.'),
  -- ── BorgWarner S400 series ────────────────────────────────────────────────
  ('BorgWarner','S467',                    'S400',     67, 72,  NULL, NULL, NULL, 'T4 / T6', '0.90 / 1.00 / 1.10',             'diesel large single / atmo',            400, 650,  'diesel',
   'Smallest S400. Can work as single for high-HP with significant lag. Also used as compound atmospheric. Journal bearing. Price $800-1,200.'),
  ('BorgWarner','S471',                    'S400',     71, 85,  NULL, NULL, NULL, 'T4 / T6', '0.90 / 1.00 / 1.10',             'compound atmospheric',                  500, 750,  'diesel',
   'Atmospheric (low-pressure) compound turbo. Journal bearing. Price $850-1,300.'),
  ('BorgWarner','S476',                    'S400',     76, 105, NULL, NULL, NULL, 'T4 / T6', '0.90 / 1.00 / 1.10 / 1.25',      'compound atmospheric',                  600, 900,  'diesel',
   'Atmospheric compound turbo, slightly larger than S475. Journal bearing. Price $950-1,400.'),
  -- ── Garrett diesel-specific ───────────────────────────────────────────────
  ('Garrett',   'GTP38R',                  'GTP38',    60, 52,  NULL, NULL, NULL, 'T4',      '0.84 / 1.00',                    '7.3L Powerstroke upgrade',              275, 475,  'diesel',
   '7.3L Powerstroke upgrade (non-VGT). Direct replacement for stock GTP38. Journal bearing. Price $500-900.'),
  ('Garrett',   'GT3788VA',                'GT3788',   59, 50,  NULL, NULL, NULL, 'T4',      'VGT (variable)',                 'Duramax stock VGT',                     250, 440,  'diesel',
   'Stock Duramax VGT. Good to ~440 HP with tuning. VGT provides excellent spool. VGT bearing. Price $800-1,500 reman.'),
  ('Garrett',   'GT3794VA',                'GT3794',   62, 55,  NULL, NULL, NULL, 'T4',      'VGT (variable)',                 'Duramax upgraded VGT',                  300, 500,  'diesel',
   'Upgraded Duramax VGT billet wheel. Better flow than stock GT3788VA. VGT bearing. Price $1,200-2,000.'),
  ('Garrett',   'PowerMax',                'PowerMax', 64, 60,  NULL, NULL, NULL, 'T4',      'VGT (variable)',                 '6.7L Powerstroke upgraded VGT',         350, 550,  'diesel',
   '6.7L Powerstroke upgraded VGT. Drop-in replacement with larger compressor. VGT bearing. Price $1,500-2,500.'),
  -- ── Industrial Injection / Fleece (aftermarket) ──────────────────────────
  ('Industrial Injection','Phatshaft 62',  'PS62',     62, 55,  NULL, NULL, NULL, 'T3',      '0.83 / 1.00',                    'Cummins drop-in upgrade',               325, 525,  'diesel',
   'Popular Cummins drop-in upgrade. Holset-based with larger billet compressor wheel. Journal bearing. Price $800-1,200.'),
  ('Industrial Injection','Phatshaft 66',  'PS66',     66, 62,  NULL, NULL, NULL, 'T3',      '0.83 / 1.00',                    'Cummins 500-600 HP drop-in',            400, 600,  'diesel',
   'Larger Phatshaft for 500-600 HP Cummins. Drop-in with stock exhaust manifold. Journal bearing. Price $1,000-1,500.'),
  ('Fleece',    'Cheetah 63mm',            'Cheetah',  63, 55,  NULL, NULL, NULL, 'T3',      '0.83 / 1.00',                    'Cummins ball-bearing drop-in',          325, 525,  'diesel',
   'Ball-bearing Cummins drop-in. Fastest spool in class due to ball bearing center. Price $1,200-1,600.'),
  ('Fleece',    'Cheetah 68mm',            'Cheetah',  68, 65,  NULL, NULL, NULL, 'T3',      '0.83 / 1.00',                    'Cummins ball-bearing drop-in',          425, 625,  'diesel',
   'Larger ball-bearing Cummins drop-in. Good spool for the size. Price $1,400-1,800.')
ON CONFLICT (brand, model) DO NOTHING;


-- =============================================================================
-- 4) diesel_egt_zones — verbatim from getEgtZone() in diesel-egt-drive-pressure.tsx
-- =============================================================================
-- Pre-turbo baselines. Post-turbo thresholds shift down by 250°F
-- (POST_TURBO_OFFSET — conservative midpoint of 200-400°F range).

CREATE TABLE IF NOT EXISTS diesel_egt_zones (
  zone_key         VARCHAR(32) PRIMARY KEY,
  label            VARCHAR(64) NOT NULL,
  threshold_min_f  INT NOT NULL,
  threshold_max_f  INT,
  color            VARCHAR(16) NOT NULL,
  description      TEXT NOT NULL,
  sort_order       INT NOT NULL
);

INSERT INTO diesel_egt_zones
  (zone_key, label, threshold_min_f, threshold_max_f, color, description, sort_order)
VALUES
  ('normal',   'Normal',
   0,    799,  '#22c55e',
   'Normal operating range. No concerns.',
   1),
  ('moderate', 'Moderate',
   800,  999,  '#eab308',
   'Moderate load range. Normal when towing. Monitor.',
   2),
  ('high',     'High',
   1000, 1249, '#f97316',
   'High load range. Acceptable for short durations under heavy towing. Sustained operation here will reduce component life. (Raised from 1200°F per cross-source consensus 2026-05-30: Banks Power, Dieselhub, HP Academy, Cummins forum, Duramax forum all converge on 1250°F pre-turbo as the practical sustained ceiling.)',
   3),
  ('warning',  'WARNING',
   1250, 1399, '#ef4444',
   'Approaching material limits. Back off throttle, downshift to increase RPM, or pull over to cool. Sustained operation risks damage to pistons, valves, and turbo. Note: factory DPF regen events on 6.7 Cummins / Duramax LMM/LML/L5P can briefly push 1400-1500°F — that''s by design (coated pistons).',
   4),
  ('danger',   'DANGER',
   1400, NULL, '#dc2626',
   'Component failure imminent. Reduce load immediately. Pistons, valves, and turbo seals are at risk of catastrophic failure.',
   5)
ON CONFLICT (zone_key) DO UPDATE SET
  label           = EXCLUDED.label,
  threshold_min_f = EXCLUDED.threshold_min_f,
  threshold_max_f = EXCLUDED.threshold_max_f,
  color           = EXCLUDED.color,
  description     = EXCLUDED.description,
  sort_order      = EXCLUDED.sort_order;


-- =============================================================================
-- 5) diesel_lambda_zones — verbatim from getDieselLambdaZone() in
--    diesel-smoke-lambda.tsx (using the CURRENT edited labels, not the old ones)
-- =============================================================================

CREATE TABLE IF NOT EXISTS diesel_lambda_zones (
  zone_key     VARCHAR(32) PRIMARY KEY,
  label        VARCHAR(128) NOT NULL,
  lambda_min   NUMERIC(4,2) NOT NULL,
  lambda_max   NUMERIC(4,2),
  color        VARCHAR(16) NOT NULL,
  description  TEXT NOT NULL,
  sort_order   INT NOT NULL
);

INSERT INTO diesel_lambda_zones
  (zone_key, label, lambda_min, lambda_max, color, description, sort_order)
VALUES
  ('very-lean', 'Very lean — normal for idle and light cruise',
   2.00, NULL, '#166534',
   'Maximum fuel efficiency. Clean exhaust. Smoke: Clear.',
   1),
  ('lean', 'Lean — normal for moderate driving',
   1.50, 1.99, '#15803d',
   'Clean exhaust. Good efficiency. Normal under moderate load. Smoke: Clear.',
   2),
  ('moderate', 'Moderate — good power zone for diesel',
   1.30, 1.49, '#4d7c0f',
   'Normal under load. Slight haze possible on hard acceleration. Smoke: Slight haze on tip-in.',
   3),
  ('high-load-cruise', 'High-load cruise — acceptable under load',
   1.20, 1.29, '#a16207',
   'Cummins forum / HP Academy consensus puts lambda 1.24+ as no-smoke. Lambda 1.2 is the edge of smoke-free under load; tip-in puffs are normal here. Smoke: Possible tip-in puff under heavy load.',
   4),
  ('smoke-begins', 'Smoke begins — visible haze under load',
   1.10, 1.19, '#c2410c',
   'Per HP Academy / Schiller: visible haze begins here. Race builds with good atomization can still be clean; stock engines visibly smoke. Smoke: Visible haze; race builds may stay clean if injector timing + boost are right.',
   5),
  ('over-fueled', 'Over-fueled — heavy black smoke',
   1.00, 1.09, '#dc2626',
   'Wasting fuel. High EGTs. Power is air-limited, not fuel-limited. Smoke: Heavy black smoke.',
   6),
  ('danger', 'DANGER — excess fuel cannot burn',
   0.00, 0.99, '#991b1b',
   'Extreme smoke and EGTs. Engine damage risk. Reduce fuel immediately. Smoke: Extreme — unburned fuel in exhaust.',
   7)
ON CONFLICT (zone_key) DO UPDATE SET
  label       = EXCLUDED.label,
  lambda_min  = EXCLUDED.lambda_min,
  lambda_max  = EXCLUDED.lambda_max,
  color       = EXCLUDED.color,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;


-- =============================================================================
-- 6) diesel_lift_pump_psi_specs — one row per injection_type the lift-pump
--    calc branches on. Values verbatim from diesel-lift-pump.tsx
-- =============================================================================

CREATE TABLE IF NOT EXISTS diesel_lift_pump_psi_specs (
  injection_type    VARCHAR(16) PRIMARY KEY,
  cruise_psi_min    NUMERIC(5,1) NOT NULL,
  cruise_psi_max    NUMERIC(5,1) NOT NULL,
  hard_floor_psi    NUMERIC(5,1),
  hard_ceiling_psi  NUMERIC(5,1),
  notes             TEXT NOT NULL
);

INSERT INTO diesel_lift_pump_psi_specs
  (injection_type, cruise_psi_min, cruise_psi_max, hard_floor_psi, hard_ceiling_psi, notes)
VALUES
  ('p-pump',
   25.0, 35.0, NULL, NULL,
   '25+ PSI at filter inlet (P7100 inline pump; will pull harder if fed too low — gives up timing precision). Per Mopar1973man P-pump spec / Pure Diesel Power. The P7100 is the most robust injection pump Cummins ever used; lift pump upgrade improves filtration and ensures consistent supply, especially above 400 HP.'),
  ('ve',
   8.0, 12.0, NULL, NULL,
   'Bosch VE rotary. Stock mechanical lift pump on block; aftermarket lift pump ensures consistent supply pressure and adds fuel filtration. The VE pump is mechanical and relatively robust, but the factory lift pump can fail without warning.'),
  ('vp44',
   14.0, 17.0, 10.0, NULL,
   'Bosch VP44; 14-17 PSI cruise, never below 10 PSI under load — low pressure = pump death (primary failure mode). Below 5 PSI supply pressure the VP44 cavitates and dies — a $2,000-$3,000 repair. Quality lift pump with air separation (FASS or AirDog) is considered mandatory for reliability, not just performance. Mopar1973man VP44 spec / Pure Diesel Power.'),
  ('cp3',
   8.0, 12.0, NULL, NULL,
   'Bosch CP3 common rail — adequate supply supports CP3 longevity. The CP3 is a reliable high-pressure pump, but it benefits from clean, air-free fuel supply. Lift pump upgrade recommended for modified trucks and good preventive maintenance on any common rail Cummins / Duramax.'),
  ('cp4',
   8.0, 12.0, NULL, NULL,
   'Bosch CP4.2 — even more sensitive to fuel quality than CP3. The CP4 can fail catastrophically, sending metal debris through the fuel rails, injectors, and lines — turning a $1,500 pump failure into an $8,000-$12,000 complete fuel system replacement. A FASS or AirDog with air separation is the most important reliability mod for CP4-equipped trucks (LML / L5P / 6.7 Powerstroke).'),
  ('heui',
   55.0, 65.0, 8.0, NULL,
   '55-65 PSI to HPOP system, 8-12 PSI at lift pump output. HEUI uses oil-driven high-pressure injection (injectors hydraulically actuated by engine oil pressure at 500-3,000 PSI). HEUI fuel system operates at much higher supply pressures than Cummins or Duramax. Ensure any aftermarket lift pump is specifically rated for HEUI supply pressure requirements. (7.3L & 6.0L Powerstroke.)')
ON CONFLICT (injection_type) DO UPDATE SET
  cruise_psi_min   = EXCLUDED.cruise_psi_min,
  cruise_psi_max   = EXCLUDED.cruise_psi_max,
  hard_floor_psi   = EXCLUDED.hard_floor_psi,
  hard_ceiling_psi = EXCLUDED.hard_ceiling_psi,
  notes            = EXCLUDED.notes;


-- =============================================================================
-- END 10_diesel_calc_backups.sql
-- =============================================================================
