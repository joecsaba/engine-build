-- Valve Spring Pressure Ranges
-- Per-source recommended seat/open pressure ranges per cam type, plus
-- coil-bind and retainer-to-seal clearance recommendations.
--
-- Sources: COMP Cams Valve Spring Master Chart, Summit Racing tech sheets,
--          SB International recommended-pressures PDF, PAC Racing 2018 catalog,
--          PSI 1500 series, Manley NexTek product pages, Crower spring PDFs,
--          Engine Builder Magazine technical articles.
--
-- Design: each row is ONE (source, cam_type, sub_category) tuple with seat
-- and open pressure ranges and the spring's RPM / lift envelope. The
-- valve-spring calculator joins on cam_type and shows the user where each
-- source recommends operating.
--
-- cam_type values:
--   'hyd-flat', 'hyd-roller-street', 'hyd-roller-perf',
--   'solid-flat', 'solid-roller-street', 'solid-roller-race', 'solid-roller-extreme'

CREATE TABLE IF NOT EXISTS valve_spring_pressure_ranges (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(50) NOT NULL,         -- 'comp', 'summit', 'pac', 'psi', 'manley', 'sbintl', 'crower', 'eb-mag'
    source_detail   VARCHAR(200),                  -- e.g. "COMP Valve Spring Master Chart"
    cam_type        VARCHAR(40) NOT NULL,
    sub_category    VARCHAR(50),                   -- e.g. 'street', 'performance', 'race', 'drag-race'
    seat_min        INTEGER NOT NULL,              -- lbs
    seat_max        INTEGER NOT NULL,
    open_min        INTEGER NOT NULL,
    open_max        INTEGER NOT NULL,
    max_lift        NUMERIC(5,3),                  -- inches at valve
    max_rpm         INTEGER,
    coil_bind_min   NUMERIC(5,3),                  -- inches clearance at max lift
    source_url      TEXT,
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vs_press_source ON valve_spring_pressure_ranges(source);
CREATE INDEX IF NOT EXISTS idx_vs_press_camtype ON valve_spring_pressure_ranges(cam_type);

-- Specific spring kits (cross-checks) — same table, treat as
-- sub_category='kit-<part-number>' with concrete lift/RPM.
-- Pressure-RANGE rows have sub_category NOT starting with 'kit-'.

-- ─── Hydraulic flat tappet ──────────────────────────────────────────────────

INSERT INTO valve_spring_pressure_ranges
  (source, source_detail, cam_type, sub_category, seat_min, seat_max, open_min, open_max,
   max_lift, max_rpm, coil_bind_min, source_url, notes, sort_order)
VALUES
  ('summit', 'Summit Racing tech sheet HE-04784',
   'hyd-flat', 'street', 95, 110, 240, 280,
   0.500, 5500, 0.060,
   'https://help.summitracing.com/knowledgebase/article/HE-04784/en-us',
   'Below 95 risks float >4500 RPM.', 10),

  ('sbintl', 'SB International generally-recommended-pressures PDF',
   'hyd-flat', 'performance', 110, 130, 280, 330,
   0.550, 6000, 0.060,
   'https://sbintl.com/Content/uploads/generally_recommended_valve_spring_pressures.pdf',
   'Stay below 280 open to avoid loosening press-in studs.', 20);

-- ─── Hydraulic roller ───────────────────────────────────────────────────────

INSERT INTO valve_spring_pressure_ranges
  (source, source_detail, cam_type, sub_category, seat_min, seat_max, open_min, open_max,
   max_lift, max_rpm, coil_bind_min, source_url, notes, sort_order)
VALUES
  ('comp', 'COMP Cams Valve Springs 101',
   'hyd-roller-street', 'street', 120, 140, 300, 350,
   0.580, 6000, 0.060,
   'https://www.compcams.com/valve-springs-101/', NULL, 110),

  ('comp', 'COMP Cams Valve Spring Master Chart',
   'hyd-roller-perf', 'performance', 130, 150, 330, 380,
   0.625, 6500, 0.060,
   'https://edelbrock-files-v1.s3-us-west-1.amazonaws.com/catalogs/COMP-Valve-Spring-Master-Chart.pdf', NULL, 120),

  ('pac', 'PAC Racing 2018 Master Catalog',
   'hyd-roller-street', 'street-LS', 130, 140, 313, 348,
   0.600, 6500, 0.060,
   'https://www.racingsprings.com/media/wysiwyg/PAC-Racing-2018-Master-Catalog.pdf', NULL, 130),

  ('pac', 'PAC Racing 2018 Master Catalog',
   'hyd-roller-perf', 'performance-LS', 140, 160, 360, 410,
   0.625, 7000, 0.060,
   'https://www.racingsprings.com/media/wysiwyg/PAC-Racing-2018-Master-Catalog.pdf',
   'Over 410 lbs open typically needs billet/tool-steel lifters.', 140);

-- ─── Solid flat tappet ──────────────────────────────────────────────────────

INSERT INTO valve_spring_pressure_ranges
  (source, source_detail, cam_type, sub_category, seat_min, seat_max, open_min, open_max,
   max_lift, max_rpm, coil_bind_min, source_url, notes, sort_order)
VALUES
  ('summit', 'Summit Racing tech sheet HE-04786',
   'solid-flat', 'street', 130, 150, 300, 325,
   0.550, 6500, 0.060,
   'https://help.summitracing.com/knowledgebase/article/HE-04786/en-us', NULL, 210),

  ('sbintl', 'SB International recommended pressures',
   'solid-flat', 'performance', 140, 165, 320, 360,
   0.600, 7000, 0.070,
   'https://sbintl.com/Content/uploads/generally_recommended_valve_spring_pressures.pdf', NULL, 220);

-- ─── Solid roller ───────────────────────────────────────────────────────────

INSERT INTO valve_spring_pressure_ranges
  (source, source_detail, cam_type, sub_category, seat_min, seat_max, open_min, open_max,
   max_lift, max_rpm, coil_bind_min, source_url, notes, sort_order)
VALUES
  ('eb-mag', 'Engine Builder Magazine spring pressure article',
   'solid-roller-street', 'street-strip', 175, 200, 400, 450,
   0.600, 6500, 0.070,
   'https://www.enginebuildermag.com/2017/07/pressure-importance-getting-right-amount-spring-pressure/', NULL, 310),

  ('eb-mag', 'Engine Builder Magazine recommended pressures',
   'solid-roller-race', 'mild-race', 200, 235, 480, 560,
   0.650, 7000, 0.080,
   'https://www.enginebuildermag.com/2012/08/recommended-valve-spring-pressures/', NULL, 320),

  ('eb-mag', 'Engine Builder Magazine recommended pressures',
   'solid-roller-race', 'race', 250, 280, 600, 720,
   0.700, 7500, 0.080,
   'https://www.enginebuildermag.com/2012/08/recommended-valve-spring-pressures/', NULL, 330),

  ('psi', 'PSI 1500 series springs',
   'solid-roller-race', 'drag-race', 240, 280, 640, 834,
   0.900, 8000, 0.080,
   'https://www.psisprings.com/products/1500-series/', NULL, 340),

  ('eb-mag', 'Engine Builder Magazine pressure importance',
   'solid-roller-extreme', 'pro-extreme', 300, 400, 750, 1010,
   0.900, 9000, 0.100,
   'https://www.enginebuildermag.com/2017/07/pressure-importance-getting-right-amount-spring-pressure/', NULL, 350),

  ('manley', 'Manley NexTek 221424',
   'solid-roller-race', 'endurance', 250, 300, 800, 900,
   0.880, 8000, 0.080,
   'https://www.competitionproducts.com/Manley-NexTek-Roller-Valve-Springs-1640-OD-250-2000-800-1150/productinfo/MAN221424-16/', NULL, 360),

  ('manley', 'Manley NexTek 221448',
   'solid-roller-extreme', 'pro-drag', 350, 400, 895, 1010,
   0.900, 9500, 0.100,
   'https://www.competitionproducts.com/Manley-NexTek-Roller-Valve-Springs-1677-OD-350-2100-1010-1200/productinfo/MAN221448-16/', NULL, 370);

-- ─── Specific kit cross-checks (sub_category prefixed 'kit-') ───────────────

INSERT INTO valve_spring_pressure_ranges
  (source, source_detail, cam_type, sub_category, seat_min, seat_max, open_min, open_max,
   max_lift, max_rpm, coil_bind_min, source_url, notes, sort_order)
VALUES
  ('pac', 'PAC 1218', 'hyd-roller-perf', 'kit-1218',
   130, 130, 318, 318, 0.600, 6500, 0.060,
   'https://www.jegs.com/i/PAC-Racing-Springs/278/1218-1/10002/-1',
   'Beehive: 130@1.800 / 318@1.140', 510),

  ('pac', 'PAC 1219', 'hyd-roller-perf', 'kit-1219',
   135, 135, 348, 348, 0.625, 6800, 0.060,
   'https://www.summitracing.com/search/brand/pac-racing-springs/part-type/valve-springs',
   'Beehive: 135@1.800 / 348@1.175', 520),

  ('comp', 'COMP 26918', 'hyd-roller-perf', 'kit-26918',
   125, 125, 367, 367, 0.625, 6800, 0.060,
   'https://www.summitracing.com/parts/cca-26918-16',
   'LS Beehive: 125@1.800 / 367@1.150', 530),

  ('comp', 'COMP 26925', 'solid-roller-race', 'kit-26925',
   141, 141, 405, 405, 0.650, 7200, 0.060,
   'https://www.jegs.com/i/COMP-Cams/249/26925-16/10002/-1',
   'LS Dual: 141@1.810 / 405@1.150', 540),

  ('manley', 'Manley 221424 NexTek', 'solid-roller-race', 'kit-221424',
   250, 250, 800, 800, 0.880, 8000, 0.080,
   'https://www.competitionproducts.com/Manley-NexTek-Roller-Valve-Springs-1640-OD-250-2000-800-1150/productinfo/MAN221424-16/',
   'Dual race: 250@2.000 / 800@1.150', 550),

  ('manley', 'Manley 221448 NexTek', 'solid-roller-extreme', 'kit-221448',
   350, 350, 1010, 1010, 0.900, 9500, 0.100,
   'https://www.competitionproducts.com/Manley-NexTek-Roller-Valve-Springs-1677-OD-350-2100-1010-1200/productinfo/MAN221448-16/',
   'Triple Pro: 350@2.100 / 1010@1.200', 560),

  ('psi', 'PSI 1579-ML', 'solid-roller-extreme', 'kit-1579ml',
   240, 240, 834, 834, 0.900, 8500, 0.100,
   'https://vincentperformance.com/shop/psi-ct-1579-ml/',
   'Solid roller dual: 240@2.100 / 834@1.200', 570);
