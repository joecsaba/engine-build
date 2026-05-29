-- Header Sizing Recommendations (manufacturer-published)
--
-- Hooker / Hedman / Stainless Works / Kooks / ARH / Doug's / Patriot / JBA /
-- Pacesetter / BBK / Stainless Headers Mfg published primary tube + collector
-- sizes per engine family + application tier. Used by the header-sizing
-- calculator to validate the formula-derived tube size against what real
-- exhaust manufacturers actually ship.
--
-- KEY FINDINGS (research 2026-05-28):
--   - LS/Coyote collector is universally 3.0" through 700+ HP (no 3.5" until
--     >700 HP). Calc was incorrectly recommending 3.5" at 350-500 HP.
--   - BBC street/strip is 1-3/4" / 3.0", not 1-7/8"-2" as the calc had at
--     350-500 HP. Mfrs reserve 2.0" primary for 600+ HP race builds.
--   - 2.0" primary is a race-only threshold across all mfrs.
--   - Primary length is NOT a customer-facing spec at any major mfr —
--     length is chassis-driven. Treat the calc's length output as theoretical
--     scavenging-tuned only, not a "what you can buy" recommendation.

CREATE TABLE IF NOT EXISTS header_sizing_recommendations (
    id              SERIAL PRIMARY KEY,
    mfr             VARCHAR(40) NOT NULL,           -- 'Hooker', 'Kooks', 'ARH', 'Doug''s', etc.
    engine_family   VARCHAR(60) NOT NULL,           -- 'SBC 350', 'BBC 396-502', 'LS3', 'Coyote 5.0', 'Hemi 5.7', etc.
    app_tier        VARCHAR(30) NOT NULL,           -- 'street', 'street-strip', 'race'
    primary_od_min  NUMERIC(5,3) NOT NULL,          -- inches; primary_od_min == primary_od_max for single-size
    primary_od_max  NUMERIC(5,3) NOT NULL,
    collector_id    NUMERIC(4,2),                   -- inches (NULL for turbo manifolds)
    primary_length_in INTEGER,                       -- inches; usually NULL — mfrs don't publish
    hp_min          INTEGER,                         -- recommended HP range
    hp_max          INTEGER,
    header_type     TEXT NOT NULL,                   -- 'long-tube 4-into-1', 'Tri-Y', 'shorty', 'turbo manifold', etc.
    source_url      TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hdr_mfr     ON header_sizing_recommendations(mfr);
CREATE INDEX IF NOT EXISTS idx_hdr_family  ON header_sizing_recommendations(engine_family);
CREATE INDEX IF NOT EXISTS idx_hdr_tier    ON header_sizing_recommendations(app_tier);

-- ─── Hooker ──────────────────────────────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('Hooker',  'SBC 350',          'street',       1.625, 1.625, 3.0, NULL, 250, 400, 'Competition long-tube 16ga 4-into-1', 'https://hooker-headers.com/hooker-super-comp-headers/', 110),
  ('Hooker',  'SBC 350',          'street-strip', 1.750, 1.750, 3.0, NULL, 350, 500, 'Super Comp long-tube 4-into-1', 'https://www.summitracing.com/search/part-type/headers/product-line/hooker-super-competition-headers', 120),
  ('Hooker',  'BBC 396-454',      'street-strip', 2.000, 2.000, 3.5,   30, 450, 650, 'Super Comp long-tube 4-into-1', 'https://www.jegs.com/i/Hooker-Headers/520/2241/10002/-1', 130),
  ('Hooker',  'BBC 396-502',      'race',         2.375, 2.500, 4.5,   28, 650,NULL, 'Super Comp Pro Stock stepped', 'https://www.jegs.com/i/Hooker-Headers/520/2217/10002/-1', 140),
  ('Hooker',  'LS swap (LS1/5.3-6.0)', 'street',  1.750, 1.750, 3.0, NULL, 350, 500, 'BlackHeart 304SS long-tube', 'https://www.holley.com/products/ls_power/ls_exhaust/ls_headers/', 150),
  ('Hooker',  'LS swap (LS3/LS7)','street-strip', 1.875, 1.875, 3.0, NULL, 450, 650, 'BlackHeart 304SS long-tube', 'https://www.hawksmotorsports.com/hooker-blackheart-ls-swap-long-tube-header-304ss-stainless-1-7-8-x-3-collector-67-69-f-body-68-74-x-body-ls-swap-ls1-ls6-ls2-or-5-3l-6-0l-vortec/', 160),
  ('Hooker',  'Coyote 5.0 swap',  'street-strip', 1.750, 1.750, 3.0, NULL, 400, 550, 'BlackHeart long-tube', 'https://www.holley.com/blog/post/hooker_blackheart_releases_1996-2004_mustang_coyote_swap_long_tube_headers/', 170);

-- ─── Hedman ──────────────────────────────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('Hedman',  'BBC 396-502 (truck)','street',     1.750, 1.750, 3.0, NULL, 350, 500, 'Std-duty long-tube ball/socket', 'https://www.hedman.com/product-detail/69110', 210),
  ('Hedman',  'BBC 396-502 (Chevelle)','street-strip', 1.750, 1.750, 3.0, NULL, 350, 550, 'Elite Ultra-Duty long-tube', 'https://www.hedman.com/product-detail/68190', 220),
  ('Hedman',  'BBC 454SS',        'street',       1.750, 1.750, 3.0, NULL, 350, 450, 'Std-duty long-tube', 'https://www.cspracing.com/products/hedman-hedders-69450-standard-duty-uncoated-headers-1-3-4-in-tube-3-in-collector-full-length-design-88-95-chevrolet-gmc-2wd-3-4-1-ton-truck-7-4l-1990-93-chevrolet-1-2-ton-454-ss-header', 230),
  ('Hedman',  'BBF 460 (truck)',  'street',       1.750, 1.750, 3.0, NULL, 300, 450, 'Long-tube ball/socket', 'https://www.hedman.com/product-detail/89510', 240),
  ('Hedman',  'BBF 460',          'street-strip', 1.750, 1.750, 3.0, NULL, 350, 500, 'Elite Ultra-Duty HTC long-tube', 'https://www.jegs.com/i/Hedman/500/89840/10002/-1', 250);

-- ─── Stainless Works ─────────────────────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('Stainless Works', 'LS swap (universal)','street-strip', 1.875, 1.875, 3.0, NULL, 450, 650, '304SS mandrel long-tube slip-fit', 'https://stainlessworks.net/headers-1970-camaro-ls/', 310),
  ('Stainless Works', 'LS1/LSX turbo',     'race',         1.875, 1.875, NULL,NULL,600,NULL, 'Up-and-forward turbo manifold', 'https://stainlessworks.net/gm-ls1-lsx-turbo-headers-1-7-8-up-and-forward/', 320),
  ('Stainless Works', 'Coyote 5.0 (S550)', 'street-strip', 1.750, 1.750, 3.0, NULL, 400, 550, '304SS long-tube', 'https://www.sstubes.com/products/2015-2025-mustang-5-0-coyote-stainless-1-3-4-long-tube-headers', 330),
  ('Stainless Works', 'Coyote 5.0 (S550)', 'race',         1.875, 1.875, 3.0, NULL, 500, 700, '304SS long-tube catted-X', 'https://www.cspracing.com/products/stainless-works-sm15h3catlg-sp-ford-mustang-gt-2015-17-headers-1-7-8in-catted-aftermarket-connect', 340);

-- ─── Kooks ───────────────────────────────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('Kooks',   'LS1 F-body (98-02)','street-strip',1.875, 1.875, 3.0, NULL, 450, 650, '304SS long-tube TIG', 'https://kooksheaders.com/products/2241h430', 410),
  ('Kooks',   'LS2/LS3 C6 Corvette','street',     1.750, 1.750, 3.0, NULL, 350, 470, '304SS long-tube', 'https://gwatneyperformance.com/kooks-1-34-long-tube-headers-2005-2008-chevy-corvette-c6-ls2-ls3/', 420),
  ('Kooks',   'LS2/LS3 C6 Corvette','street-strip',1.875,1.875, 3.0, NULL, 450, 650, '304SS long-tube (cammed/N2O/boost)', 'https://gwatneyperformance.com/kooks-1-78-long-tube-headers-2005-08-chevy-corvette-c6-ls2-ls3/', 430),
  ('Kooks',   'LS3/L99 5th-gen Camaro','street-strip',1.875,1.875,3.0,NULL,450,650, '304SS long-tube', 'https://kooksheaders.com/products/22502410', 440),
  ('Kooks',   'LS3/L99 5th-gen Camaro','race',    1.750, 1.875, 3.0, NULL, 500, 700, '304SS stepped long-tube', 'https://kooksheaders.com/products/22502310', 450),
  ('Kooks',   'LS7/LS9 Z06/ZR1',  'race',         2.000, 2.000, 3.0, NULL, 550, 750, '304SS long-tube merge', 'https://kooksheaders.com/headers/long-tube/2-x-3-ss-headers-2006-2013-z06zr1-corvette', 460),
  ('Kooks',   'LS7 C7 Z06',       'race',         2.000, 2.000, 3.0, NULL, 600, 800, '304SS long-tube', 'https://www.lingenfelter.com/2014-c7-corvette-kooks-stainless-long-tube-2-inch-primary-headers', 470),
  ('Kooks',   'Hemi 5.7 LX',      'street-strip', 1.875, 1.875, 3.0, NULL, 400, 550, '304SS long-tube D-port', 'https://fasthemis.com/products/kooks-long-tube-headers-mid-pipes-chrysler-300c-dodge-challenger-charger-5-7l-hemi-2009-2024', 480),
  ('Kooks',   'Hemi 6.1/6.4 SRT', 'street-strip', 1.875, 1.875, 3.0, NULL, 470, 650, '304SS long-tube', 'https://kooksheaders.com/products/31002402', 490),
  ('Kooks',   'Hemi 5.7 (06-08)', 'street',       1.750, 1.750, 3.0, NULL, 350, 470, '304SS long-tube', 'https://www.americanmuscle.com/kooks-charger-1-3-4-inch-long-tube-headers-catted-oem-connections-3100h220.html', 500),
  ('Kooks',   'Coyote 5.0 (15-26 GT)','street-strip',1.875,1.875,3.0,NULL,450,700, '304SS long-tube venturi merge', 'https://kooksheaders.com/products/11512402', 510),
  ('Kooks',   'Coyote 5.0 (15-18 GT)','street',   1.750, 1.750, 3.0, NULL, 400, 500, '304SS long-tube', 'https://www.tpsmotorsports.com/kooks-1-3-4-longtube-headers-catted-extensions-5.0-15-18-mustang-gt.html', 520),
  ('Kooks',   'Coyote 5.0 (S550)','race',         2.000, 2.000, 3.0, NULL, 600,NULL, '304SS large-tube long-tube', 'https://www.fordmuscle.com/news/new-products/kooks-long-large-tube-headers-now-available-for-your-coyote-mustang/', 530);

-- ─── American Racing Headers (ARH) ───────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('ARH',     'Coyote 5.0 (11-14 GT)','street-strip',1.750,1.750,3.0,NULL,400,550, '304SS long-tube', 'https://www.americanmuscle.com/american-racing-headers-13-4-long-tube-headers-w-catted-hpipe-1114-gt.html', 610),
  ('ARH',     'Coyote 5.0 (15-23 GT)','street-strip',1.875,1.875,3.0,NULL,450,700, '304SS long-tube Bottle-Neck Elim', 'https://www.americanmuscle.com/arh-catted-178-lt-headers-xpipe-3in-2015gt.html', 620),
  ('ARH',     'Coyote 5.0 (15+)', 'race',         2.000, 2.000, 3.0, NULL, 600, 850, '304SS long-tube', 'https://americanracingheaders.com/products/mustang-5-0l-coyote-2015-up-long-system', 630),
  ('ARH',     'LS3/L99 5th-gen Camaro','street-strip',1.875,1.875,3.0,NULL,450,650, '304SS long-tube X-pipe', 'https://americanracingheaders.com/products/camaro-v8-2010-2015-long-system', 640),
  ('ARH',     'LS3/LSA/ZL1 5th-gen Camaro','race',2.000,2.000, 3.0, NULL, 600, 850, '304SS long-tube', 'https://weaponxmotorsports.com/products/american-racing-2-headers-camaro-gen-5-ss-zl1-1le', 650),
  ('ARH',     'LS swap (universal)','street-strip',1.750,1.875,2.5,NULL,400,700, '304SS .065 wall universal w/ V-band', 'https://americanracingheaders.com/collections/ls-swap-headers', 660),
  ('ARH',     'BBC 396-502 G-body','street-strip',1.875,2.000, 3.5, NULL, 450, 700, '304SS long-tube', 'https://americanracingheaders.com/products/chevy-g-body-big-block-1978-1985-headers', 670);

-- ─── Doug''s ─────────────────────────────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('Doug''s', 'SBF 260-351W (Mustang II susp)','street-strip',1.750,1.750,3.0,NULL,300,450, '304SS long-tube 4-into-1', 'https://pertronixbrands.com/products/dougs-headers-d623-ss-304-stainless-long-tube-header-48-77-ford-260-351w-sbf-mustang-ii-type-suspension-1-3-4-primary-3-collector', 710),
  ('Doug''s', 'SBF 351W (66-70 Mustang)','street',1.750,1.750,NULL,NULL,275,400, '304SS Tri-Y', 'https://pertronixbrands.com/products/dougs-headers-d669y-ss-66-70-ford-351w-tri-y-304ss', 720),
  ('Doug''s', 'BBC 396-502 (A/F-body)','street-strip',1.750,1.750,3.0,NULL,400,550, '304SS long-tube', 'https://pertronixbrands.com/products/dougs-headers-d313-ss-304-stainless-long-tube-header-64-77-gm-f-a-body-396-502-bbc-1-3-4-primary-3-collector', 730),
  ('Doug''s', 'BBC 396-502 (F/X-body w/PS)','race',2.000,2.000,3.5,NULL,550,750, '304SS long-tube', 'https://pertronixbrands.com/products/dougs-headers-d320-ss-304-stainless-long-tube-header-67-69-f-body-68-74-x-body-396-502-bbc-2-primary-3-1-2-collector', 740),
  ('Doug''s', 'BBC 396-502 (A/F/G-body)','race',  2.000, 2.000, 3.5, NULL, 550, 800, '304SS long-tube', 'https://pertronixbrands.com/products/dougs-headers-d322-ss-304-stainless-long-tube-header-67-74-gm-a-f-g-body-bbc-396-502-bbc-2-primary-3-1-2-collector', 750);

-- ─── Patriot / JBA / Pacesetter / BBK ────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('Patriot', 'SBC 350 (A/B/F/X-body)','street', 1.625, 1.625, 3.0, NULL, 250, 400, '18ga mild-steel long-tube', 'https://pertronixbrands.com/products/patriot-exhaust-h8049-1-1-5-8-header-chevrolet-truck-small-block-chevrolet-67-87-metallic-ceramic-coating', 810),
  ('Patriot', 'SBC Tri-5 (55-57)','street',     1.625, 1.625, 2.5, NULL, 250, 350, '18ga mild-steel long-tube', 'https://www.jegs.com/p/Patriot-Exhaust/Patriot-Tri-5-Headers/751304/10002/-1', 820),
  ('JBA',     'Coyote 5.0 (F-150 truck)','street',1.625,1.625, 2.5, NULL, 360, 450, 'Cat4ward 409SS shorty Firecone', 'https://poormanmotorsports.com/jba-performance-exhaust-1688s-headers-cat4ward-shorty-style-1-5-8-in-primary-2-1-2-in-collector-stainless-natural-5.0-l-coyote-ford-fullsize-truck-2011-14-pair', 830),
  ('JBA',     'Coyote 5.0 (11-14 Mustang)','street-strip',1.875,1.875,NULL,NULL,450,600, 'Firecone 304SS long-tube', 'https://www.americanmuscle.com/jba-longheaders-1112gt.html', 840),
  ('JBA',     'SBF 351W (65-73 Mustang)','street-strip',1.750,1.750,NULL,NULL,300,450, 'Silver-ctd long-tube', 'https://www.certifiedperformanceparts.com/products/jba-65-73-ford-mustang-351w-sbf-1-3-4in-primary-silver-ctd-long-tube-header', 850),
  ('Pacesetter','LS1 F-body (98-02 Camaro)','street',1.750,1.750,3.0,NULL,350,475, 'Painted long-tube', 'https://www.jegs.com/i/Pace-Setter/766/70-2256/10002/-1', 860),
  ('Pacesetter','LT1 F-body (93-97 Camaro)','street',1.625,1.625,3.0,NULL,275,400, 'Painted long-tube', 'https://www.jegs.com/i/Pace-Setter/766/70-2239/10002/-1', 870),
  ('BBK',     'SBF 5.0 Fox-body (79-93)','street-strip',1.625,1.750,2.5,NULL,275,450, 'CNC mandrel ball/socket long-tube', 'https://www.andersonfordmotorsport.com/15940-bbk-long-tube-headers-1-3-4-ceramic-fits-79-93-5-0l/', 880),
  ('BBK',     '4.6 2V/3V Mustang (96-04)','street',1.625,1.625,3.0,NULL,260,400, 'CNC mandrel long-tube ball/socket', 'https://bbkperformance.com/products/ford-mustang-gt-4-6-1-5-8-long-tube-exhaust-headers-titanium-ceramic-96-04', 890),
  ('BBK',     '4.6 3V Mustang (05-10)','street',1.625,1.625,2.5,NULL,300,425, 'CNC mandrel long-tube', 'https://bbkperformance.com/products/ford-mustang-gt-1-5-8-long-tube-exhaust-headers-titanium-ceramic-05-10', 900),
  ('BBK',     'Coyote 5.0 (11-23 GT, GT350)','street-strip',1.875,1.875,NULL,NULL,450,650, 'CNC mandrel long-tube titanium-ceramic', 'https://bbkperformance.com/products/bbk-1856-1-7-8-long-tube-headers-titanium-ceramic-11-23-ford-mustang-gt-16-20-gt350-5-2', 910);

-- ─── Diesel ──────────────────────────────────────────────────────────────────

INSERT INTO header_sizing_recommendations
  (mfr, engine_family, app_tier, primary_od_min, primary_od_max, collector_id, primary_length_in, hp_min, hp_max, header_type, source_url, sort_order)
VALUES
  ('Stainless Headers Mfg','Cummins 5.9 12v (diesel)','street-strip',1.625,1.750,3.0,NULL,350,600, '304SS T3/T4 turbo log build-kit', 'https://www.stainlessheaders.com/i-30499206-5-9l-12v-cummins-turbo-manifold-build-kit.html', 1010),
  ('aFe Sinister','Cummins 5.9 24v (diesel)','street-strip',1.750,2.000,NULL,NULL,400,700, '304SS T3 divided stepped manifold', 'https://sinisterdiesel.com/manifolds-headersfor-cummins.html', 1020);
