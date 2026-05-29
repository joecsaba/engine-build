-- Bearing Clearance Recommendations
-- Per-source build-level recommended clearance ranges for main & rod bearings.
-- Sources: King Bearings, ACL Race Series, Clevite/MAHLE Aftermarket,
--          Driven Racing Oil + Valvoline viscosity charts.
--
-- Design: each row is ONE (source, build_level, block_material) tuple with
-- recommended min/max ranges. The bearing-clearance calculator joins on
-- build_level + block_material and shows the user the spread across sources
-- so they see "King says X, ACL says Y" rather than a single hardcoded value.
--
-- block_material:
--   'iron'     — iron block; aluminum-only rows omitted
--   'aluminum' — aluminum block; iron-only rows omitted
--   'any'      — recommendation applies to both materials (rare; usually a
--                "per inch of journal" universal rule)

CREATE TABLE IF NOT EXISTS bearing_clearance_recommendations (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(50) NOT NULL,         -- 'king', 'acl', 'clevite', 'mahle', 'driven', 'valvoline'
    source_detail   VARCHAR(200),                  -- e.g. "King 2025-26 Racing Application Guide"
    build_level     VARCHAR(50) NOT NULL,          -- 'street', 'street-strip', 'race', 'race-endurance'
    block_material  VARCHAR(20) NOT NULL,          -- 'iron', 'aluminum', 'any'
    main_min        NUMERIC(7,5) NOT NULL,         -- inches
    main_max        NUMERIC(7,5) NOT NULL,
    rod_min         NUMERIC(7,5) NOT NULL,
    rod_max         NUMERIC(7,5) NOT NULL,
    oil_viscosity   VARCHAR(50),                   -- e.g. '10W-30', '20W-50'
    rule_of_thumb   TEXT,                          -- universal rule if applicable
    source_url      TEXT,
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bearing_clr_source ON bearing_clearance_recommendations(source);
CREATE INDEX IF NOT EXISTS idx_bearing_clr_build  ON bearing_clearance_recommendations(build_level);
CREATE INDEX IF NOT EXISTS idx_bearing_clr_block  ON bearing_clearance_recommendations(block_material);

-- ─── Clevite / MAHLE Aftermarket ────────────────────────────────────────────
-- Source: Clevite 77 catalog (CL77-1-205R) + MAHLE Aftermarket installation tips
-- Rule: "0.00075 to 0.0010 per inch of journal" + "add 0.0005 for HP"

INSERT INTO bearing_clearance_recommendations
  (source, source_detail, build_level, block_material, main_min, main_max, rod_min, rod_max,
   oil_viscosity, rule_of_thumb, source_url, notes, sort_order)
VALUES
  ('clevite', 'Clevite 77 Catalog CL77-1-205R',
   'street', 'iron',
   0.00150, 0.00250, 0.00150, 0.00220,
   '10W-30',
   '0.00075-0.0010 per inch of journal diameter',
   'https://www.mahle-aftermarket.com/media/local-media-north-america/pdfs-&-thumbnails/cl77-1-205r.pdf',
   'Baseline rule; SBC 2.45in main → 0.0018-0.0024 by rule. Add 0.0005 for HP.', 10),

  ('clevite', 'Clevite Race Bearing FAQ',
   'street-strip', 'iron',
   0.00200, 0.00280, 0.00180, 0.00250,
   '10W-30 to 10W-40',
   'add 0.0005 to street max for high-performance',
   'https://www.onallcylinders.com/2025/04/30/using-extra-clearance-main-and-rod-bearings-set-the-correct-oil-clearances/',
   'SBC 350 HP application example.', 20),

  ('clevite', 'Clevite Race Bearing FAQ',
   'race', 'iron',
   0.00250, 0.00300, 0.00220, 0.00280,
   '15W-50',
   NULL,
   'https://digital.allchevyperformance.com/issue/july-2024bu/setting-proper-bearing-clearance-in-a-high-performance-engine/',
   'BBC NASCAR-developed range; H-series bearings.', 30),

  ('clevite', 'Clevite Race Bearing FAQ',
   'race-endurance', 'iron',
   0.00280, 0.00350, 0.00250, 0.00320,
   '20W-50',
   NULL,
   'https://www.enginelabs.com/news/what-i-learned-today-bearing-clearances-vs-oil-viscosities/',
   'Large-journal BBC / endurance race; pairs with 20W-50.', 40);

-- ─── King Engine Bearings ───────────────────────────────────────────────────
-- Source: King FAQ + Racing Application Guide
-- Rule: 0.001 per inch of journal (classic King rule)

INSERT INTO bearing_clearance_recommendations
  (source, source_detail, build_level, block_material, main_min, main_max, rod_min, rod_max,
   oil_viscosity, rule_of_thumb, source_url, notes, sort_order)
VALUES
  ('king', 'King Bearings FAQ',
   'street', 'iron',
   0.00150, 0.00250, 0.00150, 0.00220,
   '10W-30',
   '0.001 per inch of journal diameter',
   'https://www.kingbearings.com/faq/how-much-clearance-should-my-bearings-have/',
   'Iron blocks: middle to min of factory range.', 110),

  ('king', 'King Bearings tech',
   'street', 'aluminum',
   0.00150, 0.00220, 0.00150, 0.00200,
   '5W-30 or 10W-30',
   'aluminum: stay at factory min (thermal growth opens it up)',
   'https://kingenginebuilders.com/news/how-to-check-and-set-main-bearing-clearances/',
   'Aluminum block runs ~0.0005 tighter on assembly to allow for thermal growth.', 120),

  ('king', 'King Bearings tech',
   'street-strip', 'iron',
   0.00200, 0.00280, 0.00180, 0.00250,
   '10W-40',
   NULL,
   'https://www.kingbearings.com/explore/faq/',
   NULL, 130),

  ('king', 'King 383 SBC drag test data',
   'race', 'iron',
   0.00250, 0.00280, 0.00220, 0.00250,
   '15W-50',
   NULL,
   'https://www.enginelabs.com/engine-tech/engine/clearing-the-air-on-bearing-clearances/',
   'King 383 SBC drag race published clearances; XP coated wall = uncoated, no clearance change.', 140),

  ('king', 'King Racing Application Guide 2025-26',
   'race', 'aluminum',
   0.00250, 0.00300, 0.00210, 0.00260,
   '10W-40 to 15W-50',
   NULL,
   'https://www.kingbearings.com/wp-content/uploads/2025/02/King-Racing-Application-Guide-2025-26-web.pdf',
   'LS-style large-journal aluminum race.', 150);

-- ─── ACL Race Series ────────────────────────────────────────────────────────
-- Source: ACL Race Series FAQ + ACL Bearing Race Series Guide US 2023
-- Rule: ACL adds 0.0005 to Clevite/King's per-inch rule for performance starter

INSERT INTO bearing_clearance_recommendations
  (source, source_detail, build_level, block_material, main_min, main_max, rod_min, rod_max,
   oil_viscosity, rule_of_thumb, source_url, notes, sort_order)
VALUES
  ('acl', 'ACL Race Series FAQ',
   'street', 'iron',
   0.00200, 0.00280, 0.00180, 0.00250,
   '10W-30 to 10W-40',
   '(0.00075-0.0010 per inch of journal) + 0.0005 starter',
   'https://aclraceseries.com/frequently-asked-questions/',
   'ACL ships extra 0.0005 vs Clevite/King for performance starter.', 210),

  ('acl', 'ACL Race Series guide',
   'race', 'iron',
   0.00240, 0.00300, 0.00210, 0.00260,
   '15W-50',
   NULL,
   'https://aclraceseries.com/wp-content/uploads/2023/09/85261_ACL_Bearing_Race_Series_Guide_US_Version_Web_Version.pdf',
   'SBC race (2.45 main / 2.10 rod).', 220),

  ('acl', 'ACL Race Series guide',
   'race', 'aluminum',
   0.00240, 0.00300, 0.00210, 0.00260,
   '10W-40',
   NULL,
   'https://aclraceseries.com/wp-content/uploads/2023/09/85261_ACL_Bearing_Race_Series_Guide_US_Version_Web_Version.pdf',
   'LS Gen III/IV race (2.559 main / 2.100 rod).', 230),

  ('acl', 'ACL HX extra-clearance shells',
   'race-endurance', 'iron',
   0.00350, 0.00400, 0.00320, 0.00360,
   '20W-50',
   'HX shells add 0.001 extra clearance',
   'https://briantooleyracing.com/acl-sbc-ls-rod-bearing-set-001-extra-clearance-8b663hx-std.html',
   'For builds that want extra oil flow at sustained high RPM.', 240);

-- ─── MAHLE Motorsports cam-bearing recommendations ──────────────────────────
-- Source: MAHLE Aftermarket cam bearing tech bulletin

INSERT INTO bearing_clearance_recommendations
  (source, source_detail, build_level, block_material, main_min, main_max, rod_min, rod_max,
   oil_viscosity, rule_of_thumb, source_url, notes, sort_order)
VALUES
  ('mahle', 'MAHLE Aftermarket cam bearing tips',
   'street-strip', 'iron',
   0.00200, 0.00280, 0.00180, 0.00250,
   '10W-30',
   NULL,
   'https://www.mahle-aftermarket.com/na/en/support/installation-tips/cam-bearings-perf-tips.jsp',
   'MAHLE main/rod target for performance street; cam bearing rec is separate.', 310);

-- ─── Driven Racing Oil / Valvoline viscosity tie-in ─────────────────────────
-- Source: Driven Racing Oil bearing-clearance / viscosity recommendation chart

INSERT INTO bearing_clearance_recommendations
  (source, source_detail, build_level, block_material, main_min, main_max, rod_min, rod_max,
   oil_viscosity, rule_of_thumb, source_url, notes, sort_order)
VALUES
  ('driven', 'Driven Racing Oil viscosity guide',
   'race', 'aluminum',
   0.00000, 0.00270, 0.00000, 0.00270,
   '10W-30 (XP3)',
   'tight clearances + aluminum = 10W-30',
   'https://www.drivenracingoil.com.au/pages/bearing-clearance-oil-viscosity-recommendations',
   'For total clearance under 0.0027 use lighter oil.', 410),

  ('driven', 'Driven Racing Oil viscosity guide',
   'race', 'iron',
   0.00270, 0.00500, 0.00270, 0.00500,
   '15W-50 (XP4)',
   'loose clearances = 15W-50',
   'https://www.drivenracingoil.com.au/pages/bearing-clearance-oil-viscosity-recommendations',
   'For total clearance over 0.0027 use heavier oil.', 420),

  ('valvoline', 'Valvoline VR1 application guide',
   'race', 'iron',
   0.00250, 0.00500, 0.00250, 0.00500,
   '20W-50',
   '>0.0025 clearance pairs with 20W-50',
   'https://www.enginelabs.com/news/what-i-learned-today-bearing-clearances-vs-oil-viscosities/',
   NULL, 510);
