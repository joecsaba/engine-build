-- HP Reference Builds (verified dyno results)
--
-- 42 verified engine builds with PUBLISHED DYNO results across all major
-- popular platforms. Used by the hp-estimator calculator to surface
-- "similar verified builds" alongside its formula-based estimate.
--
-- All dyno_hp values are measured, not "should make" estimates. Factory
-- crate ratings (BluePrint, Mast, ATK, Roush, GM, Mopar) ship with a
-- dyno sheet and are highly reliable calibration anchors.
--
-- Cam specs (duration / lift / LSA) are missing on most crate-engine
-- entries because mfrs don't publish them. The Engine Builder Magazine
-- feature articles are the rows with complete cam data.

CREATE TABLE IF NOT EXISTS hp_reference_builds (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(80) NOT NULL,
    engine_family   VARCHAR(50) NOT NULL,
    cid             INTEGER NOT NULL,
    aspiration      VARCHAR(40) NOT NULL,      -- 'NA', 'turbo', 'twin-turbo', 'supercharged', 'nitrous'
    heads           VARCHAR(120),
    cam_dur050      INTEGER,                    -- @ 0.050"
    cam_lift        NUMERIC(5,3),
    lsa             INTEGER,
    intake          VARCHAR(120),
    exhaust         VARCHAR(80),
    cr              NUMERIC(4,1),               -- compression ratio
    fuel            VARCHAR(80),
    dyno_hp         INTEGER NOT NULL,           -- the key calibration number
    dyno_tq         INTEGER,
    peak_hp_rpm     INTEGER,
    tier            VARCHAR(40) NOT NULL,       -- 'baseline', 'street', 'street/strip', 'race', 'crate'
    is_rwhp         BOOLEAN NOT NULL DEFAULT FALSE,  -- if true, multiply ~1.15 to compare to engine dyno
    source_url      TEXT,
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hpref_family ON hp_reference_builds(engine_family);
CREATE INDEX IF NOT EXISTS idx_hpref_cid    ON hp_reference_builds(cid);
CREATE INDEX IF NOT EXISTS idx_hpref_asp    ON hp_reference_builds(aspiration);
CREATE INDEX IF NOT EXISTS idx_hpref_hp     ON hp_reference_builds(dyno_hp);

INSERT INTO hp_reference_builds
  (source, engine_family, cid, aspiration, heads, cam_dur050, cam_lift, lsa, intake, exhaust, cr, fuel, dyno_hp, dyno_tq, peak_hp_rpm, tier, source_url, sort_order)
VALUES
  -- SBC / BBC NA crate engines
  ('BluePrint Engines',        'SBC 383',   383, 'NA', 'BPE aluminum 64cc',     230, 0.544, 110, 'dual-plane',          NULL, 9.6, 'carb',           436, 443, 5500, 'street',       'https://blueprintengines.com/products/383-ci-stroker-crate-engine-small-block-gm-dressed-longblock-carburetor-bp38318ctc1', 10),
  ('BluePrint Engines',        'SBC 383',   383, 'NA', 'BPE aluminum 64cc',     230, 0.544, 110, 'dual-plane',          NULL, 9.6, 'EFI',            440, 455, 5500, 'street',       'https://blueprintengines.com/products/blueprint-engines-383-ci-sbc-stroker-crate-engine-small-block-gm-style-longblock-with-fuel-injection-aluminum-heads', 20),
  ('BluePrint Engines',        'BBC 496',   496, 'NA', 'BPE aluminum',          NULL,NULL,  NULL,'dual-plane',          NULL, 9.5, 'carb',           600, 568, 5500, 'street',       'https://blueprintengines.com/products/496-ci-stroker-crate-engine-big-block-gm-dressed-longblock-carburetor-bp4967ctc', 30),
  ('Skip White Performance',   'SBC 383',   383, 'NA', 'AFR aluminum',          NULL,NULL,  NULL,'single-plane',        NULL,10.5, 'Brawler carb',   505, NULL,NULL, 'street/strip', 'https://skipwhiteperformance.com/product/sbc-chevy-383-stroker-stage-2-0-crate-motor-afr-heads-505-hp-base-engine/', 40),
  ('HorsePower TV',            'SBC 383',   383, 'NA', 'iron',                  NULL,NULL,  NULL,NULL,                  NULL,NULL, 'carb',           405, 442, 5500, 'street',       'https://www.powernationtv.com/episode/HP2004-02/383-stroker', 50),
  ('CNC Motorsports',          'BBC 496',   496, 'NA', 'Brodix RaceRite',       NULL,NULL,  NULL,'Edelbrock',           NULL,NULL, '850 carb',       559, 591, 5500, 'street',       'https://www.youtube.com/watch?v=4DOXM9d0WvY', 60),
  ('JMac Performance',         'BBC 496',   496, 'NA', 'iron/alum',             NULL,NULL,  NULL,'dual-plane',          NULL, 9.5, 'carb',           549, 609, 5200, 'street',       'https://jmacperformance.com/496-big-block-chevy-550-horsepower-600-lb-ft-torque/', 70),
  ('Westech (Team Chevelle)',  'BBC 468',   468, 'NA', 'GM 781 oval port',      228, NULL,  108, 'Air-Gap',             NULL, 9.3, '850 carb',       600, 558, 6200, 'street',       'https://www.chevelles.com/threads/468-dyno-results.147901/', 80),
  ('Westech (Perf Boats)',     'BBC 496',   496, 'NA', 'AFR oval port',         NULL,NULL,  NULL,'single-plane',        NULL,NULL, 'carb',           607, 627, 6100, 'street/strip', 'https://www.performanceboats.com/threads/vortecpro-496-afr-oval-ports-dyno-data-sheets.70656/', 90),

  -- Coyote 5.0
  ('EngineLabs (Comp Cams)',   'Coyote 5.0',302, 'NA',           'stock Gen1 Coyote', NULL,NULL,NULL,'stock',           NULL,11.0,'EFI',            462, 411, 6600, 'baseline',     'https://www.enginelabs.com/news/comp-cams-xfi-nsr-stage-2-cams-for-ford-5-0l-coyote-tested/', 110),
  ('EngineLabs (Comp Cams)',   'Coyote 5.0',302, 'NA',           'stock Gen1 Coyote', NULL,NULL,NULL,'JLT CAI',         NULL,11.0,'EFI',            515, 451, 6500, 'street',       'https://www.enginelabs.com/news/comp-cams-xfi-nsr-stage-2-cams-for-ford-5-0l-coyote-tested/', 120),
  ('Roush Performance',        'Coyote 5.0',302, 'supercharged', 'stock',             NULL,NULL,NULL,'Roush 2.65L SC',  NULL,NULL,'EFI',            700, 610, NULL, 'street',       'https://www.autoevolution.com/news/50l-coyote-v8-pumped-to-700-hp-with-ford-performance-roush-supercharger-system-121429.html', 130),
  ('Roush Performance',        'Coyote 5.0 RSC',302,'supercharged','stock',           NULL,NULL,NULL,'TVS R2650',       NULL,NULL,'EFI',            600, NULL,NULL, 'crate',        'https://www.roushperformance.com/products/5-0l-rsc-coyote-crate-engine', 140),
  ('Nelson Racing Engines',    'Coyote 5.0',302, 'supercharged', 'NRE ported',        NULL,NULL,NULL,'NRE SC',          NULL,NULL,'EFI 91',        1000, 808, 7500, 'race',         'https://nelsonracingengines.com/products/nre-supercharged-gen-3-5-0-coyote', 150),

  -- LS3 / LS L92
  ('Edelbrock',                'LS3',       376, 'supercharged', 'stock LS3',         NULL,NULL,NULL,'E-Force Stage 1', NULL,10.7,'EFI',            554, 515, NULL, 'street',       'https://www.edelbrock.com/e-force-supercharger-for-2008-13-corvette-ls3-stage-1-1590.html', 210),
  ('Edelbrock',                'LS3',       376, 'supercharged', 'stock LS3',         NULL,NULL,NULL,'E-Force Stage 2', NULL,10.7,'EFI',            599, 547, NULL, 'street',       'https://www.edelbrock.com/e-force-supercharger-for-2008-13-corvette-ls3-stage-2-1591.html', 220),
  ('GM Performance',           'LS376/525', 376, 'NA',           'LS3 rect port',     NULL,NULL,NULL,'LS3',             NULL,11.0,'EFI',            525, 486, 6200, 'crate',        'https://www.westbenddyno.com/products/ls376-525-6-2l-ls3-engine-525-hp', 230),
  ('OnAllCylinders/Summit',    'LS L92 6.2',376, 'NA',           'L92 rect port',     NULL,NULL,NULL,'LS3',             NULL,10.7,'EFI',            445, NULL,NULL, 'baseline',     'https://www.onallcylinders.com/2019/12/26/dyno-test-120-hp-gains-and-no-low-end-loss-with-cam-swap-on-6-2l-ls-engine/', 240),
  ('OnAllCylinders/Summit',    'LS L92 6.2',376, 'NA',           'L92 rect port',     NULL,NULL,NULL,'LS3',             NULL,10.7,'EFI',            568, 510, 6700, 'street/strip', 'https://www.onallcylinders.com/2019/12/26/dyno-test-120-hp-gains-and-no-low-end-loss-with-cam-swap-on-6-2l-ls-engine/', 250),
  ('Brian Tooley Racing',      'LS3',       376, 'NA',           'stock LS3',         NULL,NULL,NULL,'LS3',             NULL,10.7,'EFI',            496, 491, 5900, 'baseline',     'https://briantooleyracing.com/btr-ls3-stage-3-v2-camshaft.html', 260),
  ('Brian Tooley Racing',      'LS3',       376, 'NA',           'stock LS3',         NULL,NULL,NULL,'LS3',             NULL,10.7,'EFI',            570, 522, 6500, 'street',       'https://briantooleyracing.com/btr-ls3-stage-3-v2-camshaft.html', 270),
  ('Brian Tooley Racing',      'LS3',       376, 'NA',           'ported LS3',        NULL,NULL,NULL,'short-runner',    NULL,11.0,'EFI',            600, NULL,NULL, 'street/strip', 'https://briantooleyracing.com/btr-ls3-stage-5-camshaft.html', 280),

  -- LS7 / LS race
  ('Mast Motorsports',         'LS7 427',   427, 'NA',           'LS7 305cc',         NULL,NULL,NULL,'LS7',             NULL,11.0,'EFI',            701, 518, NULL, 'street/race',  'https://www.lsxceleration.com/mast-motorsports-black-label-685hp-ls7-7-0l-427-long-block-4-125-x-4-000/', 310),
  ('Mast Motorsports',         'LS7 427',   427, 'NA',           'LS3 cnc',           NULL,NULL,NULL,'FAST LSXR',       NULL,11.0,'EFI',            693, 573, NULL, 'street/race',  'https://www.lsxceleration.com/mast-motorsports-black-label-685hp-ls7-7-0l-427-long-block-4-125-x-4-000/', 320),
  ('Mast Motorsports',         'LS7 427',   427, 'NA',           'Mast Black Label',  NULL,NULL,NULL,'Mast',            NULL,NULL,'EFI pump',       900, 800, NULL, 'race',         'https://www.mastmotorsports.com/blogs/news/mast-motorsports-900hp-pump-gas-ls7', 330),
  ('ATK High Performance',     'LS Dart 427',427,'NA',           'Dart LS Next',      NULL,NULL,NULL,NULL,              NULL,11.0,'EFI',            720, NULL,NULL, 'crate',        'https://atkhp.com/product/atk-hpe427na-dart-ls-next-427ci-720hp-long-block/', 340),
  ('Texas Speed',              'LS LQ9 408',408, 'NA',           'PRC 237cc',         NULL,NULL,NULL,'FAST 92',         NULL,10.5,'EFI',            620, NULL,NULL, 'street/strip', 'https://www.texas-speed.com/p-3574-tsp-408-cid-620-hp-lq9-turn-key-package.aspx', 350),
  ('Summit Project 1000',      'LS 408',    408, 'twin-turbo',   'Wegner LS7',        NULL,NULL,NULL,'sheet metal',     NULL,NULL,'EFI E85',       1202,1119, 6400, 'race',         'https://gm-efi.com/video-summit-racing-project-1000-1202hp-turbo-408-cid-ls-engine-parts-combos-now-available/', 360),
  ('Engine Builder Mag',       'LS 388',    388, 'NA on methanol','Wegner LS7',       NULL,NULL,NULL,NULL,              NULL,NULL,'methanol',       610, NULL,NULL, 'drag/drive',   'https://www.enginebuildermag.com/2026/03/twin-turbo-388-cid-ls-engine/', 370),
  ('Engine Builder Mag',       'LS 388',    388, 'twin-turbo',   'Wegner LS7',        NULL,NULL,NULL,'sheet metal',     NULL,NULL,'E85/meth',      1500, NULL,NULL, 'drag/drive',   'https://www.enginebuildermag.com/2026/03/twin-turbo-388-cid-ls-engine/', 380),
  ('Engine Builder Mag',       'LS 427',    427, 'twin-turbo',   NULL,                NULL,NULL,NULL,NULL,              NULL,NULL,'EFI 44psi',     2700, NULL,NULL, 'race',         'https://www.enginebuildermag.com/2020/06/eotw-2700-hp-427-cid-twin-turbo-ls-engine/', 390),
  ('Engine Builder Mag',       'LS 448 billet',448,'turbo',     NULL,                NULL,NULL,NULL,NULL,              NULL,NULL,'race',          2500, NULL,NULL, 'race',         'https://www.enginebuildermag.com/2023/09/harrell-engine-dynos-2500-hp-turbocharged-448-cid-billet-ls-engine/', 400),
  ('Van Gilder Racing',        'LS Dart 427',427,'nitrous',     'Frankenstein',      NULL,NULL,NULL,NULL,              NULL,NULL,'race NA',        870, NULL,NULL, 'race',         'https://www.enginebuildermag.com/2025/11/van-gilder-racing-engines-builds-a-1300-hp-427-cid-nitrous-ls-engine/', 410),
  ('Van Gilder Racing',        'LS Dart 427',427,'nitrous',     'Frankenstein',      NULL,NULL,NULL,NULL,              NULL,NULL,'race+N2O',      1300, NULL,NULL, 'race',         'https://www.enginebuildermag.com/2025/11/van-gilder-racing-engines-builds-a-1300-hp-427-cid-nitrous-ls-engine/', 420),

  -- SBF Windsor
  ('Engine Builder Mag',       'SBF 408W',  408, 'NA',           'AFR 205',           240, 0.570,NULL,'Holley Hi-Ram',   NULL,NULL,'EFI 102mm TB',  579, 532, 6500, 'street/strip', 'https://www.enginebuildermag.com/2019/01/408-cid-ford-windsor-stroker-engine/', 510),
  ('Keith Craft',              'SBF 427W',  427, 'NA',           'Brodix Trac II CNC',NULL,NULL,NULL,'Victor Jr',        NULL,NULL,'carb',           638, 605, NULL, 'street/strip', 'https://www.corral.net/threads/427-windsor-dyno.1377250/', 520),
  ('Prestige Motorsports',     'SBF 427W',  427, 'NA',           'CNC aluminum',      NULL,NULL,NULL,NULL,              NULL,NULL,'carb',           600, NULL,NULL, 'street/strip', 'https://prestigemoto.com/custom-engine/427-small-block-ford-2/', 530),
  ('Engine Builder Mag',       'SBF 347',   347, 'NA',           NULL,                NULL,NULL,NULL,NULL,              NULL,NULL,'carb',           530, 443, 7000, 'strip',        'https://www.enginebuildermag.com/2007/08/the-shermanator-347-a-530hp-gas-stroker-you-can-build/', 540),

  -- Hemi
  ('EngineLabs (Comp HRT)',    'Hemi 392',  392, 'NA',           'stock 6.4',         NULL,NULL,NULL,'stock',            NULL,10.9,'EFI',            475, 447, NULL, 'street',       'https://www.enginelabs.com/engine-tech/engine/dyno-testing-comps-stage-2-hrt-camshaft-kit-on-a-392-hemi/', 610),
  ('Mopar/SRT',                'Hellcat 6.2',376,'supercharged', 'Hellcat',           NULL,NULL,NULL,'2.4L IHI 12psi',   NULL, 9.5,'EFI 91',         707, 650, 6000, 'street',       'https://media.stellantisnorthamerica.com/newsrelease.do?id=16139', 620),
  ('Mopar/SRT',                'Hellcat Redeye 6.2',376,'supercharged','Hellcat',     NULL,NULL,NULL,'2.7L 14.5psi',     NULL, 9.5,'EFI 91',         797, 707, 6300, 'street',       'https://www.dodgegarage.com/news/article/how-to/2026/03/gen-iii-hemisup-sup-engine-quick-reference-guide-part-ii', 630),
  ('Mopar/SRT',                'Demon 6.2', 376, 'supercharged', 'Hellcat',           NULL,NULL,NULL,'2.7L SC',          NULL, 9.5,'100 octane',     840, 770, 6300, 'strip',        'https://www.dodgegarage.com/news/article/how-to/2026/03/gen-iii-hemisup-sup-engine-quick-reference-guide-part-ii', 640),

  -- BBC race / specialty
  ('Reher-Morrison',           'BBC 762 mountain',762,'NA',     'RM',                NULL,NULL,NULL,'tunnel ram',       NULL,NULL,'race fuel',     1595,1235, 7500, 'race',         'https://bangshift.com/bangshift1320/watch-a-naturally-aspirated-rehr-and-morrison-762ci-mountain-motor-make-nearly-1600hp-on-the-dyno/', 710),
  ('Reher-Morrison',           'BBC Dart Big M', 565,'NA',     'RM',                NULL,NULL,NULL,'tunnel ram',       NULL,NULL,'race fuel',     1200, 880, NULL, 'race',         'https://www.enginelabs.com/news/win-this-1200-horsepower-reher-morrison-race-engine/', 720),
  ('Steve Morris Engines',     'SMX 481X',  540, 'twin-turbo',   'SMX billet',        NULL,NULL,NULL,NULL,              NULL,NULL,'race',          4000, NULL,NULL, 'race',         'https://www.stevemorrisengines.com/videos/dyno-videos/smx-481x-dyno-videos/4000-hp-twin-turbo-smx-endurance-engine', 730);
