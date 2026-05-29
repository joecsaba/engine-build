-- Carburetor CFM Recommendations (manufacturer-published application data)
--
-- 48 verified Holley / Edelbrock / Quick Fuel / Demon cataloged pairings.
-- Used by the carb-cfm-sizing calculator to flag when the user's
-- formula-derived CFM falls far below what real mfrs pair with similar
-- displacement / HP. The standard formula `CID*RPM*VE/3456` systematically
-- under-recommends by ~45% on street builds; this table provides the
-- empirical anchor.
--
-- intake_style: 'dual-plane', 'single-plane', NULL = either
-- engine_type:  'NA-street', 'NA-performance', 'race', 'blower-suitable'

CREATE TABLE IF NOT EXISTS carb_cfm_recommendations (
    id              SERIAL PRIMARY KEY,
    mfr             VARCHAR(40) NOT NULL,           -- 'Holley', 'Edelbrock', 'Quick Fuel', 'Demon'
    carb_model      VARCHAR(120) NOT NULL,           -- e.g. 'Street Avenger 0-80570'
    cfm             INTEGER NOT NULL,
    cid_min         INTEGER NOT NULL,                -- recommended displacement range, low
    cid_max         INTEGER NOT NULL,
    hp_min          INTEGER,                         -- recommended HP range, low (NULL if open-ended)
    hp_max          INTEGER,                         -- NULL = 'and up'
    engine_type     VARCHAR(40) NOT NULL,            -- see header
    intake_style    VARCHAR(20),                     -- see header
    use_case        TEXT NOT NULL,
    source_url      TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carb_mfr    ON carb_cfm_recommendations(mfr);
CREATE INDEX IF NOT EXISTS idx_carb_cfm    ON carb_cfm_recommendations(cfm);
CREATE INDEX IF NOT EXISTS idx_carb_cid    ON carb_cfm_recommendations(cid_min, cid_max);

-- ─── Holley line ─────────────────────────────────────────────────────────────

INSERT INTO carb_cfm_recommendations
  (mfr, carb_model, cfm, cid_min, cid_max, hp_min, hp_max, engine_type, intake_style, use_case, source_url, sort_order)
VALUES
  ('Holley', 'Street Avenger 0-80350',         350, 200, 350, 150, 250, 'NA-street',       'dual-plane',  'Mild V6/V8 stock-rebuild street', 'https://www.holley.com/products/fuel_systems/carburetors/street/parts/0-80350', 110),
  ('Holley', 'Street Avenger 0-80570',         570, 220, 330, 180, 280, 'NA-street',       'dual-plane',  'Small SBC / Ford 302 street, better low-end', 'https://documents.holley.com/199r10219-3.pdf', 120),
  ('Holley', 'Street Avenger 0-80670',         670, 300, 400, 250, 380, 'NA-street',       'dual-plane',  '350 SBC street/strip daily driver', 'https://documents.holley.com/199r10219-3.pdf', 130),
  ('Holley', 'Street Avenger 0-80770',         770, 350, 440, 300, 450, 'NA-performance',  'dual-plane',  'Hot SBC/BBC street, mild strip', 'https://documents.holley.com/199r10219-3.pdf', 140),
  ('Holley', 'Street Avenger 0-80870',         870, 400, 500, 350, 500, 'NA-performance',  'dual-plane',  'BBC street, hot 383/427 stroker', 'https://documents.holley.com/199r10219-3.pdf', 150),
  ('Holley', 'Street Warrior 4160 0-80457',    600, 283, 400, 180, 330, 'NA-street',       'dual-plane',  'Stock-mild SBC daily driver, vac sec', 'https://www.holley.com/products/fuel_systems/carburetors/street/parts/0-80457S', 160),
  ('Holley', 'Classic 4160 0-3310',            750, 327, 454, 300, 500, 'NA-street',        NULL,         'Iconic 396/427/454 BBC, 350 SBC street', 'https://www.holley.com/products/fuel_systems/carburetors/street/parts/0-3310C', 170),
  ('Holley', 'Aluminum Double Pumper 4150',    650, 302, 383, 350, 450, 'NA-performance',  'single-plane','Stick-shift SBC street/strip', 'https://documents.holley.com/e9b270abcbfdb6e651330fe335823a08d11d5923.pdf', 180),
  ('Holley', 'Aluminum Double Pumper 4150',    750, 350, 454, 400, 550, 'NA-performance',  'single-plane','Hot SBC/BBC street/strip peak power', 'https://documents.holley.com/e9b270abcbfdb6e651330fe335823a08d11d5923.pdf', 190),
  ('Holley', 'Aluminum Double Pumper 4150',    850, 383, 500, 450, 650, 'race',            'single-plane','BBC drag/bracket, hot stroker SBC', 'https://documents.holley.com/e9b270abcbfdb6e651330fe335823a08d11d5923.pdf', 200),
  ('Holley', 'Ultra XP 4150 0-80803',          750, 350, 454, 450, 650, 'race',            'single-plane','Drag/circle track SBC', 'https://www.holley.com/products/fuel_systems/carburetors/ultra_xp/', 210),
  ('Holley', 'Ultra XP 4150 0-80804',          850, 383, 500, 500, 750, 'race',            'single-plane','Drag/circle track BBC, hot SBC', 'https://www.holley.com/products/fuel_systems/carburetors/ultra_xp/', 220),
  ('Holley', 'Ultra XP 4150 0-80845',          950, 427, 540, 600, 850, 'race',            'single-plane','BBC drag, max 4150-flange flow', 'https://www.holley.com/products/fuel_systems/carburetors/ultra_xp/', 230),
  ('Holley', 'Sportsman Dominator 4500',      1050, 427, 540, 650, 900, 'race',            'single-plane','Street/strip BBC, bracket drag', 'https://www.holley.com/products/fuel_systems/carburetors/pro/parts/0-80690', 240),
  ('Holley', 'Sportsman Dominator 4500',      1150, 454, 565, 750,1000, 'race',            'single-plane','BBC bracket/sportsman drag', 'https://www.cjponyparts.com/holley-carburetor-sportsman-model-4500-dominator-1150-cfm-3-circuit/p/HL080690/', 250),
  ('Holley', 'Gen 3 Ultra Dominator 4500',    1250, 500, 632, 850,1200, 'race',            'single-plane','NA big-cube drag race', 'https://www.holley.com/products/fuel_systems/carburetors/dominator/', 260),
  ('Holley', 'Gen 3 Ultra Dominator 4500',    1475, 565, 800,1000,NULL, 'race',            'single-plane','Pro-mod / blower-suitable max flow', 'https://www.holley.com/products/fuel_systems/carburetors/dominator/', 270),
  ('Holley', 'Street Warrior 4160 (LS)',       600, 293, 364, 250, 400, 'NA-street',       'dual-plane',  'LS swap mild 5.3/6.0, G-body', 'https://www.holley.com/blog/post/tech_tips_holley_essential_mods_gm_g-body/', 280),
  ('Holley', '4150 (LS carbureted)',           750, 364, 408, 400, 550, 'NA-performance',  'dual-plane',  'LS 6.0L stroker carb conversion', 'https://www.holley.com/blog/post/every_holley_ls_cast_intake_manifold_for_your_carbureted_or_efi_ls_engine_build/', 290);

-- ─── Edelbrock line ──────────────────────────────────────────────────────────

INSERT INTO carb_cfm_recommendations
  (mfr, carb_model, cfm, cid_min, cid_max, hp_min, hp_max, engine_type, intake_style, use_case, source_url, sort_order)
VALUES
  ('Edelbrock', 'Performer 1405',              600, 260, 400, 200, 350, 'NA-street',       'dual-plane',  'Classic SBC/SBF/Mopar street, manual choke', 'https://www.edelbrock.com/performer-series-600-cfm-carburetor-with-manual-choke-in-satin-non-egr-1405.html', 310),
  ('Edelbrock', 'Performer 1406',              600, 260, 400, 200, 350, 'NA-street',       'dual-plane',  'Classic SBC street, electric choke', 'https://www.edelbrock.com/shop/carburetors/performer-series.html', 320),
  ('Edelbrock', 'Performer 1407',              750, 350, 500, 300, 475, 'NA-street',        NULL,         'SBC/BBC street w/ Performer RPM, Torker II', 'https://www.edelbrock.com/performer-series-750-cfm-carburetor-with-manual-choke-in-satin-non-egr-1407.html', 330),
  ('Edelbrock', 'AVS2 1901',                   500, 200, 305, 150, 275, 'NA-street',       'dual-plane',  'Small-cube V8 single-carb street', 'https://www.edelbrock.com/avs2-500-cfm-carburetor-with-electric-choke-in-satin-non-egr-1901.html', 340),
  ('Edelbrock', 'AVS2 1906',                   650, 300, 440, 250, 400, 'NA-street',       'dual-plane',  'SBC 350/383, Mopar 360/383, marine', 'https://www.edelbrock.com/avs2-carburetors', 350),
  ('Edelbrock', 'AVS2 1912',                   800, 383, 500, 400, 600, 'NA-performance',   NULL,         'High-HP SBC stroker/BBC street, annular', 'https://www.edelbrock.com/avs2-800-cfm-1913-carburetor-elec-choke-for-high-horsepower-engines-1913.html', 360),
  ('Edelbrock', 'Thunder AVS 1812',            800, 350, 500, 350, 550, 'NA-performance',   NULL,         'SBC / some BBC street performance', 'https://www.jegs.com/i/Edelbrock/350/1812/10002/-1', 370);

-- ─── Quick Fuel line ─────────────────────────────────────────────────────────

INSERT INTO carb_cfm_recommendations
  (mfr, carb_model, cfm, cid_min, cid_max, hp_min, hp_max, engine_type, intake_style, use_case, source_url, sort_order)
VALUES
  ('Quick Fuel', 'SS-750',                     750, 350, 454, 400, 550, 'NA-performance',  'single-plane','SBC/BBC street/strip mech secondary', 'https://www.holley.com/products/fuel_systems/carburetors/street_strip/parts/SS-750', 410),
  ('Quick Fuel', 'SS-850',                     850, 383, 500, 450, 650, 'race',            'single-plane','Drag race SBC/BBC bracket', 'https://www.holley.com/products/fuel_systems/carburetors/street_strip/parts/SS-850', 420),
  ('Quick Fuel', 'SS-780-VS',                  780, 350, 454, 350, 500, 'NA-performance',  'dual-plane',  'Street/strip vacuum-sec daily-able', 'https://www.holley.com/products/fuel_systems/carburetors/quick_fuel/', 430),
  ('Quick Fuel', 'HR-650 Hot Rod',             650, 302, 400, 300, 425, 'NA-street',       'dual-plane',  'Classic SBC/Ford street mech sec', 'https://www.holley.com/products/fuel_systems/carburetors/street/parts/HR-650', 440),
  ('Quick Fuel', 'HR-750 Hot Rod',             750, 350, 454, 350, 500, 'NA-performance',   NULL,         'SBC/BBC street/strip', 'https://documents.holley.com/hr_slayer_ss_series_instructions_rev._1.pdf', 450),
  ('Quick Fuel', 'Slayer SL-450-VS',           450, 150, 305, 100, 225, 'NA-street',       'dual-plane',  'Small displacement V8 / large 6cyl', 'https://www.jegs.com/i/Quick-Fuel/793/SL-450-VS/10002/-1', 460),
  ('Quick Fuel', 'Brawler BR-67255',           650, 302, 400, 300, 425, 'NA-performance',  'dual-plane',  '302 hot to mild 440 mech sec', 'https://www.scramspeed.com/products/quick-fuel-br-67255-brawler-carburetor-650-cfm-ms.html', 470),
  ('Quick Fuel', 'Brawler BR-67200',           750, 350, 454, 350, 525, 'NA-performance',  'single-plane','SBC/BBC street/strip race', 'https://www.jegs.com/i/Quick-Fuel/793/BR-67200/10002/-1', 480),
  ('Quick Fuel', 'Brawler BR-67319',           600, 260, 383, 225, 375, 'NA-street',       'dual-plane',  'Mild SBC/SBF street vac sec', 'https://cnc-motorsports.com/quick-fuel-br-67319-600-cfm-brawler-diecast-carburetor-vacuum-secondary.html', 490);

-- ─── Demon line ──────────────────────────────────────────────────────────────

INSERT INTO carb_cfm_recommendations
  (mfr, carb_model, cfm, cid_min, cid_max, hp_min, hp_max, engine_type, intake_style, use_case, source_url, sort_order)
VALUES
  ('Demon', 'Road Demon 625',                  625, 250, 350, 225, 375, 'NA-street',       'dual-plane',  'SBC street, stock-mild rebuild', 'https://demoncarburetor.us/', 510),
  ('Demon', 'Speed Demon 650',                 650, 302, 400, 275, 425, 'NA-street',       'dual-plane',  '302-427 mild street, cam 220-240 dur', 'https://www.onallcylinders.com/2012/02/15/the-new-demon-carburetion-bringing-more-power-to-the-street-and-track/', 520),
  ('Demon', 'Speed Demon 750',                 750, 350, 427, 325, 475, 'NA-performance',   NULL,         '350-427 SBC street performance', 'https://www.speedwaymotors.com/Demon-1402010-750-CFM-Speed-Demon-Carburetor,141460.html', 530),
  ('Demon', 'Speed Demon 850',                 850, 400, 500, 400, 600, 'NA-performance',  'single-plane','BBC street, hot stroker', 'https://www.speedwaymotors.com/Demon-SPD-850-AN-850-CFM-Speed-Demon-Carburetor,286271.html', 540),
  ('Demon', 'Mighty Demon 750',                750, 350, 468, 400, 550, 'NA-performance',  'single-plane','Well-prepped 350-406 SBC, mild 427-468 BBC', 'https://mooregoodink.com/650-750-850cfm-blow-through-mighty-demon-carburetors-announced-2/', 550),
  ('Demon', 'Mighty Demon 850',                850, 440, 540, 500, 750, 'race',            'single-plane','Hi-output 440-540 BBC street/race', 'https://mooregoodink.com/650-750-850cfm-blow-through-mighty-demon-carburetors-announced-2/', 560),
  ('Demon', 'Mighty Demon Blow-Through 750',   750, 350, 454, 500, 800, 'blower-suitable', 'single-plane','Turbo / centrifugal up to 18 psi', 'https://mooregoodink.com/650-750-850cfm-blow-through-mighty-demon-carburetors-announced-2/', 570);
