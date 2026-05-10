-- Diesel Valve Relief Calculator
-- Engine platforms and aftermarket cam profiles with clearance specs
-- Sources: Hamilton Cams, Industrial Injection, Kill Devil Diesel, Colt Cams,
--          SoCal Diesel, Callies, Diamond T Performance

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS diesel_engine_platforms (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(200) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    platform VARCHAR(200) NOT NULL,
    years VARCHAR(50) NOT NULL,
    valve_count VARCHAR(10) NOT NULL,
    stock_piston_protrusion NUMERIC(6,4) NOT NULL,
    stock_valve_face_depth NUMERIC(6,4) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diesel_cam_profiles (
    id SERIAL PRIMARY KEY,
    platform_id INTEGER NOT NULL REFERENCES diesel_engine_platforms(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    intake_duration INTEGER NOT NULL,
    exhaust_duration INTEGER NOT NULL,
    intake_lift NUMERIC(5,3) NOT NULL,
    exhaust_lift NUMERIC(5,3) NOT NULL,
    lsa INTEGER NOT NULL,
    valve_relief_required BOOLEAN NOT NULL DEFAULT FALSE,
    relief_depth NUMERIC(5,3) NOT NULL DEFAULT 0,
    requires_upgraded_springs BOOLEAN NOT NULL DEFAULT FALSE,
    requires_upgraded_pushrods BOOLEAN NOT NULL DEFAULT FALSE,
    max_piston_protrusion NUMERIC(6,4),
    min_valve_face_depth NUMERIC(6,4),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Cummins Platforms ────────────────────────────────────────────────────────

INSERT INTO diesel_engine_platforms (slug, label, manufacturer, platform, years, valve_count, stock_piston_protrusion, stock_valve_face_depth, sort_order)
VALUES
  ('cummins-12v-5.9',        '5.9L 12-Valve (6BT)',              'Cummins', 'Cummins 5.9L 12V',  '1989-1998',    '12V', 0.0120, 0.0600, 10),
  ('cummins-24v-5.9-vp44',   '5.9L 24-Valve VP44 (ISB)',         'Cummins', 'Cummins 5.9L 24V',  '1998.5-2002',  '24V', 0.0200, 0.0420, 20),
  ('cummins-24v-5.9-cr',     '5.9L 24-Valve Common Rail (ISB)',   'Cummins', 'Cummins 5.9L CR',   '2003-2007',    '24V', 0.0150, 0.0420, 30),
  ('cummins-24v-6.7',        '6.7L 24-Valve (ISB 6.7)',          'Cummins', 'Cummins 6.7L CR',   '2007.5-2018',  '24V', 0.0150, 0.0420, 40),
  ('cummins-4bt',            '3.9L 4BT',                         'Cummins', 'Cummins 4BT',       '1983-2002',    '8V',  0.0150, 0.0550, 50);

-- ─── Powerstroke Platforms ────────────────────────────────────────────────────

INSERT INTO diesel_engine_platforms (slug, label, manufacturer, platform, years, valve_count, stock_piston_protrusion, stock_valve_face_depth, sort_order)
VALUES
  ('powerstroke-7.3',        '7.3L Power Stroke',                'Ford',    'Ford 7.3L Power Stroke',  '1994-2003',  '16V', 0.0250, 0.0250, 60),
  ('powerstroke-6.0',        '6.0L Power Stroke',                'Ford',    'Ford 6.0L Power Stroke',  '2003-2007',  '32V', 0.0200, 0.0250, 70),
  ('powerstroke-6.4',        '6.4L Power Stroke',                'Ford',    'Ford 6.4L Power Stroke',  '2008-2010',  '32V', 0.0200, 0.0250, 80),
  ('powerstroke-6.7',        '6.7L Power Stroke (Scorpion)',     'Ford',    'Ford 6.7L Power Stroke',  '2011-2019',  '32V', 0.0180, 0.0220, 90);

-- ─── Duramax Platforms ────────────────────────────────────────────────────────

INSERT INTO diesel_engine_platforms (slug, label, manufacturer, platform, years, valve_count, stock_piston_protrusion, stock_valve_face_depth, sort_order)
VALUES
  ('duramax-lb7',            '6.6L Duramax LB7',                'GM',      'GM 6.6L Duramax LB7',     '2001-2004',  '32V', 0.0180, 0.0300, 100),
  ('duramax-lly',            '6.6L Duramax LLY',                'GM',      'GM 6.6L Duramax LLY',     '2004.5-2006','32V', 0.0180, 0.0300, 110),
  ('duramax-lbz',            '6.6L Duramax LBZ',                'GM',      'GM 6.6L Duramax LBZ',     '2006-2007',  '32V', 0.0180, 0.0300, 120),
  ('duramax-lmm',            '6.6L Duramax LMM',                'GM',      'GM 6.6L Duramax LMM',     '2007.5-2010','32V', 0.0180, 0.0300, 130),
  ('duramax-lml',            '6.6L Duramax LML',                'GM',      'GM 6.6L Duramax LML',     '2011-2016',  '32V', 0.0180, 0.0300, 140);

-- ─── Cummins 12V Cams ────────────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('Hamilton 178/208 (Towing)',          'Hamilton Cams',       '07-C-178/208',    178, 208, 0.420, 0.420, 108, false, 0.000, true,  false, 0.0200, 0.0550, 'Drop-in towing cam. Lowers EGTs, adds low-end torque.', 10),
  ('Hamilton 188/220 (Street/Race)',     'Hamilton Cams',       '07-C-188/220',    188, 220, 0.445, 0.445, 108, false, 0.000, true,  false, 0.0180, 0.0550, 'Aggressive street cam. Drop-in if protrusion and valve depth specs are met. Otherwise cut reliefs or use oversized gasket.', 20),
  ('Industrial Injection Stage 1 (188/220)', 'Industrial Injection', 'PDM-188/220', 188, 220, 0.445, 0.445, 108, false, 0.000, false, false, 0.0200, 0.0550, 'Drop-in performance cam. Works with stock springs on 12V. Lowers EGTs.', 30),
  ('Industrial Injection Stage 2 (210/220)', 'Industrial Injection', 'PDM-210/220', 210, 220, 0.480, 0.480, 108, true,  0.100, true,  true,  NULL,   NULL,   'Race cam. Requires .100" valve reliefs cut into pistons. Good for 2000-4800 RPM.', 40)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'cummins-12v-5.9';

-- ─── Cummins 24V VP44 Cams ───────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('Hamilton 178/208 (Towing)',          'Hamilton Cams',       '07-C-178/208-24V', 178, 208, 0.420, 0.420, 108, false, 0.000, true,  false, 0.0250, 0.0380, 'Drop-in towing cam for 24V. Lowers EGTs under load.', 10),
  ('Hamilton 188/220 (Street/Race)',     'Hamilton Cams',       '07-C-188/220-24V', 188, 220, 0.445, 0.445, 108, false, 0.000, true,  false, 0.0250, 0.0380, 'Aggressive street cam for 24V. Check piston protrusion carefully on VP44 trucks.', 20),
  ('Industrial Injection Stage 1 (188/220)', 'Industrial Injection', 'PDM-188/220-24V', 188, 220, 0.445, 0.445, 108, false, 0.000, true, false, 0.0250, 0.0380, 'Drop-in performance cam for 24V. Requires upgraded springs on 24V.', 30),
  ('Industrial Injection Stage 2 (210/220)', 'Industrial Injection', 'PDM-210/220-24V', 210, 220, 0.480, 0.480, 108, true,  0.100, true,  true,  NULL,   NULL,   'Race cam. Requires .100" valve reliefs. Good for 2000-4800 RPM.', 40)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'cummins-24v-5.9-vp44';

-- ─── Cummins 24V Common Rail Cams ────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('Hamilton 178/208 (Towing)',          'Hamilton Cams',       '07-C-178/208-CR',  178, 208, 0.420, 0.420, 108, false, 0.000, true,  false, 0.0180, 0.0380, 'Drop-in towing cam for CR 5.9. Lowers EGTs, improves turbo spool.', 10),
  ('Hamilton 188/220 (Street/Race)',     'Hamilton Cams',       '07-C-188/220-CR',  188, 220, 0.445, 0.445, 108, false, 0.000, true,  false, 0.0180, 0.0380, 'Aggressive cam for CR 5.9. Tight clearance tolerance — measure carefully.', 20),
  ('Industrial Injection Stage 1 (188/220)', 'Industrial Injection', 'PDM-188/220-CR', 188, 220, 0.445, 0.445, 108, false, 0.000, true, false, 0.0180, 0.0380, 'Drop-in for CR 5.9. Upgraded springs required.', 30),
  ('Industrial Injection Stage 2 (210/220)', 'Industrial Injection', 'PDM-210/220-CR', 210, 220, 0.480, 0.480, 108, true,  0.100, true,  true,  NULL,   NULL,   'Race cam. Requires .100" valve reliefs. Good for 2000-4800 RPM.', 40)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'cummins-24v-5.9-cr';

-- ─── Cummins 6.7L Cams ──────────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('Hamilton 178/208 (Towing)',          'Hamilton Cams',       '07-C-178/208-6.7', 178, 208, 0.420, 0.420, 108, false, 0.000, true,  false, 0.0180, 0.0380, 'Drop-in towing cam for 6.7. Lowers EGTs, improved turbo response.', 10),
  ('Hamilton 188/220 (Street/Race)',     'Hamilton Cams',       '07-C-188/220-6.7', 188, 220, 0.445, 0.445, 108, false, 0.000, true,  false, 0.0180, 0.0380, 'Aggressive cam for 6.7. Measure protrusion — 6.7 blocks vary.', 20),
  ('Industrial Injection Stage 1 (188/220)', 'Industrial Injection', 'PDM-188/220-6.7', 188, 220, 0.445, 0.445, 108, false, 0.000, true, false, 0.0180, 0.0380, 'Drop-in for 6.7 CR. Upgraded springs required.', 30),
  ('Industrial Injection Stage 2 (210/220)', 'Industrial Injection', 'PDM-210/220-6.7', 210, 220, 0.480, 0.480, 108, true,  0.100, true,  true,  NULL,   NULL,   'Race cam. Requires .100" valve reliefs. Good for 2000-4800 RPM.', 40)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'cummins-24v-6.7';

-- ─── Cummins 4BT Cams ───────────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('Industrial Injection Stage 1 (188/220)', 'Industrial Injection', 'PDM-4BRV',  188, 220, 0.445, 0.445, 108, false, 0.000, false, false, 0.0200, 0.0550, 'Drop-in for 4BT. R&R only — requires head removal.', 10),
  ('Industrial Injection Stage 2 (210/220)', 'Industrial Injection', 'PDM-4BHP',  210, 220, 0.480, 0.480, 108, true,  0.100, true,  true,  NULL,   NULL,   'Race cam for 4BT. Requires .100" valve reliefs. R&R only.', 20)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'cummins-4bt';

-- ─── Powerstroke 7.3L Cams ──────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('Diamond T Stage 1',                  'Diamond T Performance', 'DTP-73-S1',   188, 208, 0.430, 0.430, 108, false, 0.000, true,  false, 0.0340, 0.0200, 'Drop-in performance cam for 7.3. Improved low-end torque and reduced EGTs.', 10),
  ('Diamond T Stage 2',                  'Diamond T Performance', 'DTP-73-S2',   198, 220, 0.460, 0.460, 108, false, 0.000, true,  false, 0.0260, 0.0250, 'Aggressive street cam. Check protrusion and valve recession carefully.', 20),
  ('Colt Cams Stage 2',                  'Colt Cams',            'C.852.H',     200, 220, 0.470, 0.470, 108, true,  0.030, true,  true,  NULL,   NULL,   'Performance cam. Requires .030"+ exhaust valve relief in piston crown.', 30),
  ('RCD Stage 1',                        'RCD Performance',      'RCD-73-S1',   188, 208, 0.430, 0.430, 108, false, 0.000, true,  false, 0.0340, 0.0200, 'Drop-in performance cam. Improved spool and EGT reduction.', 40)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'powerstroke-7.3';

-- ─── Powerstroke 6.0L Cams ──────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('KDD Stage 1 (Stock Plus)',           'Kill Devil Diesel',    'KDD-60-S1',    185, 210, 0.425, 0.425, 108, false, 0.000, false, false, 0.0300, 0.0200, 'Drop-in factory replacement / towing cam. 1-2 MPG improvement reported. Idle-3500 RPM.', 10),
  ('KDD Stage 2 (Street Performance)',   'Kill Devil Diesel',    'KDD-60-S2',    195, 220, 0.450, 0.450, 108, false, 0.000, true,  false, 0.0300, 0.0200, 'Drop-in street performance cam. 1600-4000 RPM range. Stock to 330cc injectors.', 20),
  ('KDD Stage 3 (Competition)',          'Kill Devil Diesel',    'KDD-60-S3',    210, 230, 0.480, 0.480, 108, true,  0.100, true,  true,  NULL,   NULL,   'Competition cam. Requires .100" valve reliefs in pistons. Hot street or race only.', 30),
  ('Colt Cams Stage 2',                  'Colt Cams',            'COLT-60-S2',   198, 220, 0.460, 0.460, 108, true,  0.080, true,  true,  NULL,   NULL,   'Performance cam. Requires .080" fly-cut valve pockets and de-lip.', 40),
  ('Colt Cams Stage 4',                  'Colt Cams',            'COLT-60-S4',   220, 240, 0.510, 0.510, 108, true,  0.120, true,  true,  NULL,   NULL,   'Full race cam. Requires .120" fly-cut. Race pistons recommended.', 50)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'powerstroke-6.0';

-- ─── Powerstroke 6.4L Cams ──────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('KDD Stage 1 (Stock Plus)',           'Kill Devil Diesel',    'KDD-64-S1',    185, 210, 0.425, 0.425, 108, false, 0.000, false, false, 0.0300, 0.0200, 'Drop-in replacement cam for 6.4. Reduces cam/lifter failure risk. Idle-3500 RPM.', 10),
  ('KDD Stage 2 (Street Performance)',   'Kill Devil Diesel',    'KDD-64-S2',    195, 220, 0.450, 0.450, 108, false, 0.000, true,  false, 0.0300, 0.0200, 'Drop-in street performance. 1600-4000 RPM. Smooth Lobe Ramp Rate Technology.', 20),
  ('KDD Stage 3 (Competition)',          'Kill Devil Diesel',    'KDD-64-S3',    210, 230, 0.480, 0.480, 108, true,  0.100, true,  true,  NULL,   NULL,   'Competition cam. Requires .100" valve reliefs.', 30)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'powerstroke-6.4';

-- ─── Powerstroke 6.7L Cams ──────────────────────────────────────────────────

INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
SELECT p.id, v.label, v.manufacturer, v.part_number, v.intake_duration, v.exhaust_duration, v.intake_lift, v.exhaust_lift, v.lsa, v.valve_relief_required, v.relief_depth, v.requires_upgraded_springs, v.requires_upgraded_pushrods, v.max_piston_protrusion, v.min_valve_face_depth, v.notes, v.sort_order
FROM diesel_engine_platforms p
CROSS JOIN (VALUES
  ('KDD Stage 1 (Stock Plus)',           'Kill Devil Diesel',    'KDD-67F-S1',   185, 210, 0.425, 0.425, 108, false, 0.000, false, false, 0.0300, 0.0200, 'Drop-in replacement for 6.7 Scorpion. Reduced EGTs and improved efficiency.', 10),
  ('KDD Stage 2 (Street Performance)',   'Kill Devil Diesel',    'KDD-67F-S2',   195, 220, 0.450, 0.450, 108, false, 0.000, true,  false, 0.0300, 0.0200, 'Street performance cam. Fly-cut pistons available from Dynamic Diesel.', 20)
) AS v(label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
WHERE p.slug = 'powerstroke-6.7';

-- ─── Duramax LB7/LLY/LBZ/LMM/LML Cams (same cam fits all) ─────────────────
-- Insert the same cam set for each Duramax generation

DO $$
DECLARE
  plat RECORD;
BEGIN
  FOR plat IN SELECT id FROM diesel_engine_platforms WHERE slug LIKE 'duramax-%'
  LOOP
    INSERT INTO diesel_cam_profiles (platform_id, label, manufacturer, part_number, intake_duration, exhaust_duration, intake_lift, exhaust_lift, lsa, valve_relief_required, relief_depth, requires_upgraded_springs, requires_upgraded_pushrods, max_piston_protrusion, min_valve_face_depth, notes, sort_order)
    VALUES
      (plat.id, 'SoCal Diesel 9100 (Mild)',          'SoCal Diesel',       'SCD-9100',   180, 200, 0.420, 0.420, 108, false, 0.000, true,  false, 0.0200, 0.0280, 'Mild towing cam. No valve pockets required. Alternate fire order available.', 10),
      (plat.id, 'SoCal Diesel 6480 (Street)',         'SoCal Diesel',       'SCD-6480',   190, 215, 0.450, 0.450, 108, true,  0.050, true,  false, NULL,   NULL,   'Street performance cam. Requires .050" piston valve pockets. Alternate fire order available.', 20),
      (plat.id, 'SoCal Diesel 3388 (Aggressive)',     'SoCal Diesel',       'SCD-3388',   200, 225, 0.470, 0.470, 108, true,  0.075, true,  true,  NULL,   NULL,   'Aggressive performance cam. Requires .075" piston valve pockets.', 30),
      (plat.id, 'Callies Stage 1 (Alt Fire)',         'Callies',            'CAL-DUR-S1', 188, 210, 0.440, 0.440, 108, false, 0.000, true,  false, 0.0200, 0.0280, 'Drop-in alternate firing order cam. Comparable to SoCal 3388 profile but no reliefs needed. Idle to 3800+ RPM.', 40),
      (plat.id, 'Callies Stage 2 (Alt Fire)',         'Callies',            'CAL-DUR-S2', 200, 225, 0.470, 0.470, 108, true,  0.075, true,  true,  NULL,   NULL,   'High-performance alternate fire cam. Carburized 8620 steel core. Requires .075" valve pockets.', 50),
      (plat.id, 'Wagler Stage 1',                     'Wagler Competition', 'WAG-DUR-S1', 185, 208, 0.435, 0.435, 108, false, 0.000, true,  false, 0.0200, 0.0280, 'Mild performance cam. No valve reliefs required. Drop-in with upgraded springs.', 60),
      (plat.id, 'Wagler Stage 2',                     'Wagler Competition', 'WAG-DUR-S2', 200, 225, 0.470, 0.470, 108, true,  0.075, true,  true,  NULL,   NULL,   'Aggressive performance cam. Requires .075" piston valve pockets.', 70);
  END LOOP;
END $$;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_diesel_cam_profiles_platform ON diesel_cam_profiles(platform_id);
CREATE INDEX idx_diesel_engine_platforms_manufacturer ON diesel_engine_platforms(manufacturer);
