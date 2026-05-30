-- Turbo Models Refresh (2026-05-29)
--
-- Replaces the prior 35-row turbo_models seed with a 64-row catalog of
-- currently-published manufacturer data: Garrett G-series, BorgWarner EFR
-- + S400 SX-E, Precision NEXT GEN, Comp Turbo Triplex (oil-less), Holset
-- diesel, Xona Rotor (race), Forced Performance (Subaru-spec), BullsEye.
--
-- All max_hp + inducer values are from the mfr-published spec or an
-- authorized distributor sell sheet (Garrett FAF/ATP/Walton, BorgWarner
-- EFR PDFs, Precision OEM, Xona OEM). For mfrs that don't publish full
-- compressor maps (Holset, BullsEye, some Comp Turbo), surge_flow is
-- estimated at ~25-30% of max_flow — calc UI should flag those rows
-- as "estimated surge".
--
-- This file deletes any prior rows for the affected brands first, so it
-- is safe to re-run.

DELETE FROM turbo_models WHERE brand IN
  ('Garrett', 'BorgWarner', 'Precision', 'Comp Turbo', 'Holset', 'Xona', 'Forced Performance', 'BullsEye');

-- ─── Garrett G-Series (current catalog) ────────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('Garrett', 'G25-550',        'G25', 48, 48, 49, 15, 51, 3.9, '0.49/0.72/0.92', 'T25/V-band',  'street to drag, 1.4-3.0L',         200,  550, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g25-550/'),
  ('Garrett', 'G25-660',        'G25', 54, 54, 49, 18, 58, 4.0, '0.49/0.72/0.92', 'T25/V-band',  'street to drag, 1.4-3.0L',         250,  660, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g25-660/'),
  ('Garrett', 'G30-660',        'G30', 54, 54, 55, 22, 60, 4.0, '0.61/0.72/0.83', 'T3/V-band',   'street/strip 1.4-3.0L',            250,  660, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g30-660/'),
  ('Garrett', 'G30-770',        'G30', 58, 58, 60, 24, 73, 4.2, '0.61/0.72/0.83/1.01', 'T3/V-band','street/strip 2.0-3.5L',           350,  770, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g30-770/'),
  ('Garrett', 'G30-900',        'G30', 62, 62, 60, 28, 82, 4.5, '0.83/1.01/1.21', 'T3/V-band',   'drag 2.0-3.5L',                    550,  900, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g30-900/'),
  ('Garrett', 'G35-900',        'G35', 62, 62, 62, 28, 82, 4.0, '0.61/0.83/1.06', 'T3/V-band',   'street/strip to drag 2.0-5.5L',    475,  900, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g35-900/'),
  ('Garrett', 'G35-1050',       'G35', 68, 68, 68, 32, 100,4.2, '0.61/0.83/1.01/1.06/1.21', 'T3/V-band', 'drag/road race 2.0-6.0L', 550, 1050, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g35-1050/'),
  ('Garrett', 'G40-900',        'G40', 62, 62, 77, 28, 75, 3.9, '0.85/0.95/1.06/1.19', 'V-band',  'drag/diesel 2.0-6.0L',             500,  900, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g40-900-62mm/'),
  ('Garrett', 'G40-1150',       'G40', 71, 71, 77, 35, 95, 4.2, '0.85/0.95/1.06/1.19', 'V-band',  'drag/pro mod 2.0-7.0L',            600, 1150, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g40-1150-71mm/'),
  ('Garrett', 'G42-1200',       'G42', 73, 73, 82, 35, 110,4.5, '0.85/1.01/1.15/1.28', 'V-band',  'drag/pro mod 2.0-7.0L',            475, 1200, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g42-1200/'),
  ('Garrett', 'G42-1450',       'G42', 79, 79, 82, 38, 132,4.5, '1.01/1.15/1.28/1.45', 'V-band',  'drag/pro mod 2.0-8.0L',            525, 1450, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g42-1450/'),
  ('Garrett', 'G45-1125',       'G45', 67, 67, 89, 35, 105,4.0, '1.01/1.15/1.28/1.44', 'V-band',  'drag/pro mod',                     550, 1125, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g45-1125/'),
  ('Garrett', 'G45-1350',       'G45', 72, 72, 89, 40, 125,4.2, '1.01/1.15/1.28/1.44', 'V-band',  'drag/pro mod',                     600, 1350, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g45-1350/'),
  ('Garrett', 'G45-1475',       'G45', 79, 79, 89, 42, 140,4.2, '1.01/1.15/1.28/1.44', 'V-band',  'pro mod/drag',                     650, 1475, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g45-1475-79mm/'),
  ('Garrett', 'G45-1500',       'G45', 76, 76, 89, 42, 140,4.5, '1.01/1.15/1.28/1.44', 'V-band',  'pro mod/drag',                     700, 1500, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g45-1500/'),
  ('Garrett', 'G45-1600',       'G45', 80, 80, 89, 45, 150,4.5, '1.01/1.15/1.28/1.44', 'V-band',  'pro mod top-end',                  750, 1600, 'gas', 'https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/g-series-g45-1600-80mm/');

-- ─── BorgWarner EFR + S400 SX-E ────────────────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('BorgWarner', 'EFR 6258',  'EFR',  49.6, 49.6, 58, 14, 44, 4.0, '0.64/0.85', 'T25/V-band', 'street, IWG/EWG',          180, 440, 'gas',    'https://www.borgwarner.com/docs/default-source/iam/boosting-technologies/efr-6258-a.pdf'),
  ('BorgWarner', 'EFR 6758',  'EFR',  53.9, 53.9, 58, 18, 53, 4.0, '0.64/0.85', 'T25/V-band', 'street/single small',      275, 525, 'gas',    'https://www.borgwarner.com/aftermarket/boosting-technologies/performance-turbochargers/efr-series-turbochargers'),
  ('BorgWarner', 'EFR 7064',  'EFR',  52.2, 52.2, 64, 18, 56, 4.0, '0.83/0.92', 'T3/V-band',  'street/strip',             250, 560, 'gas',    'https://www.borgwarner.com/aftermarket/boosting-technologies/performance-turbochargers/efr-series-turbochargers'),
  ('BorgWarner', 'EFR 7163',  'EFR',  57,   57,   63, 20, 60, 4.2, '0.83/0.85', 'T3/V-band',  'street/strip',             225, 600, 'gas',    'https://www.borgwarner.com/docs/default-source/iam/boosting-technologies/efr-7163-f.pdf'),
  ('BorgWarner', 'EFR 7670',  'EFR',  57.2, 57.2, 70, 24, 64, 4.2, '0.83/0.92/1.05', 'T3/V-band','street/strip to drag', 375, 650, 'gas',    'https://www.borgwarner.com/aftermarket/boosting-technologies/performance-turbochargers/efr-series-turbochargers'),
  ('BorgWarner', 'EFR 8374',  'EFR',  62.6, 62.6, 74, 30, 79, 4.5, '0.83/0.92/1.05/1.45', 'T4/V-band','drag/road race',  475, 750, 'gas',    'https://www.borgwarner.com/aftermarket/boosting-technologies/performance-turbochargers/efr-series-turbochargers'),
  ('BorgWarner', 'EFR 9174',  'EFR',  67.7, 67.7, 74, 35, 94, 4.5, '0.83/0.92/1.05/1.45', 'T4/V-band','drag/road race hybrid', 550, 900, 'gas', 'https://www.full-race.com/store/borg-warner-efr/turbos-efr-series/borgwarner-efr-9174-turbo-1/'),
  ('BorgWarner', 'EFR 9180',  'EFR',  67.7, 67.7, 80, 38, 95, 4.5, '0.83/0.92/1.05/1.45', 'T4/V-band','drag/big sportsman', 600, 1000, 'gas','https://www.borgwarner.com/aftermarket/boosting-technologies/performance-turbochargers/efr-series-turbochargers'),
  ('BorgWarner', 'S475 SX-E', 'S400', 75,   75,   88, 35, 100,3.8, '0.90/1.10/1.25', 'T4',     'diesel/drag single',       500, 850, 'diesel', 'https://us.bddiesel.com/blogs/r-d-blog/s400-turbo-master-guide-s471-s472-s475-s480-sizing-t4-vs-t6-sx-e-upgrades-compound-setups'),
  ('BorgWarner', 'S480 SX-E', 'S400', 80,   80,   96, 40, 135,3.8, '1.10/1.25/1.32', 'T4/T6',  'diesel/drag, compounds',   750, 1250,'diesel', 'https://www.maperformance.com/products/borg-warner-air-werks-s400sx4-80-s480-turbo-177287'),
  ('BorgWarner', 'S488 SX-E', 'S400', 88,   88,   96, 50, 160,3.8, '1.10/1.25/1.32', 'T4/T6',  'diesel big single/pro mod', 1000,1575,'diesel','https://us.bddiesel.com/blogs/r-d-blog/s400-turbo-master-guide-s471-s472-s475-s480-sizing-t4-vs-t6-sx-e-upgrades-compound-setups');

-- ─── Precision NEXT GEN ────────────────────────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('Precision', '5862 NEXT GEN',         '58mm', 58, 58, 62, 18, 60, 4.0, '0.63/0.82', 'T3',          'street/strip',                  250, 700,  'gas', 'https://www.precisionturbo.com/c254293-turbochargers-street-race-next-gen'),
  ('Precision', '6266 NEXT GEN',         '62mm', 62, 62, 66, 22, 78, 4.2, '0.63/0.82/0.96/1.00', 'T3/T4','street/strip drag',          300, 925,  'gas', 'https://www.precisionturbo.com/c254293-turbochargers-street-race-next-gen'),
  ('Precision', '6466 NEXT GEN',         '64mm', 64, 64, 74, 25, 86, 4.2, '0.84/0.96/1.00/1.12', 'T3/T4','drag/strip',                 350, 1000, 'gas', 'https://www.precisionturbo.com/c254293-turbochargers-street-race-next-gen'),
  ('Precision', '6766 NEXT GEN',         '67mm', 67, 67, 66, 28, 90, 4.2, '0.81/0.96/1.00', 'T3/T4',  'drag/road race',                400, 1075, 'gas', 'https://www.precisionturbo.com/c254293-turbochargers-street-race-next-gen'),
  ('Precision', '6870 NEXT GEN',         '68mm', 68, 68, 79, 30, 96, 4.2, '0.96/1.00/1.12', 'T4',     'drag/sportsman',                450, 1200, 'gas', 'https://www.precisionturbo.com/p372192-turbochargers-street-race-next-gen-next-gen-6870'),
  ('Precision', '7175 NEXT GEN',         '71mm', 71, 71, 75, 32, 105,4.2, '0.96/1.00/1.12', 'T4',     'sportsman drag',                500, 1275, 'gas', 'https://www.precisionturbo.com/en/p372198-turbochargers-street-race-next-gen-next-gen-sportsman-7175-s-21809216819'),
  ('Precision', '7675 NEXT GEN',         '76mm', 76, 76, 75, 38, 125,4.2, '0.96/1.12/1.28', 'T4',     'sportsman drag',                600, 1480, 'gas', 'https://www.precisionturbo.com/p502384-turbochargers-street-race-next-gen-next-gen-7675-s-52207212269'),
  ('Precision', '8085 NEXT GEN',         '80mm', 80, 80, 85, 42, 140,4.5, '1.00/1.12/1.32', 'T4',     'drag/pro mod sportsman',        800, 1600, 'gas', 'https://www.precisionturbo.com/en/p372206-turbochargers-street-race-next-gen-next-gen-sportsman-8085-s-27109219839'),
  ('Precision', '8891 NEXT GEN ProMod',  '88mm', 88.4,88.4,100,55,175,5.0, '0.96/1.08',     'T5',     'pro mod',                      1000, 2000, 'gas', 'https://www.realstreetperformance.com/precision-turbo-pro-mod-billet-88mm-8891-next-gen-ball-bearing-t5-aka-t6-96-a-r-v-band.html'),
  ('Precision', '9405 XPR ProMod',       '94mm', 94, 94, 105,65, 200,5.0, '1.10/1.24',     'T5',     'pro mod elite',                1200, 2400, 'gas', 'https://www.precisionturbo.com/en/p372215-turbochargers-street-race-next-gen-next-gen-xpr-9405-s-26816431539');

-- ─── Comp Turbo (oil-less ball-bearing) ────────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('Comp Turbo', 'CT3RX-5858',  'CT3',  58, 58, 58, 22, 65,  4.2, '0.63/0.82', 'T3', 'street/drag, oil-less ball bearing', 300,  775,  'gas', 'https://compturbochargers.com/products/ct3rx-5858-oil-less-air-cooled-turbocharger'),
  ('Comp Turbo', 'CT4X-6262',   'CT4',  62, 62, 62, 26, 80,  4.2, '0.82/0.96', 'T4', 'drag, oil-less',                     400,  950,  'gas', 'https://www.huronspeed.com/products/comp-billet-6262-ct-r-turbo'),
  ('Comp Turbo', 'CT43RX-7475', 'CT43', 74, 74, 75, 35, 120, 4.5, '0.96/1.10/1.32', 'T4', 'drag, oil-less',                500, 1400,  'gas', 'https://www.maperformance.com/products/comp-turbo-ct43x-series-4-inlet-3-outlet-oil-less-ball-bearing-turbocharger-4347475-758144'),
  ('Comp Turbo', 'CT5RX-8385',  'CT5',  83, 83, 85, 45, 150, 4.5, '1.10/1.32', 'T4/T5', 'pro mod, oil-less',                700, 1700,  'gas', 'https://compturbochargers.com/products/ct5rx-8388-oil-less-air-cooled-turbocharger'),
  ('Comp Turbo', 'CT5RX-8890',  'CT5',  88, 88, 90, 55, 175, 5.0, '1.10/1.32', 'T5',    'pro mod, oil-less',                800, 1950,  'gas', 'https://compturbochargers.com/products/ct5rx-8890-oil-less-air-cooled-turbocharger');

-- ─── Holset (diesel) ───────────────────────────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('Holset', 'HX35 (12V)',       'HX35',  56, 56, 69.5, 18, 62, 3.0, '12cm/16cm', 'T3', 'diesel street/tow Cummins 5.9',  200, 500, 'diesel', 'https://mopar1973man.com/cummins/articles.html/general-cummins/84_engine/89_air-exhaust/holset-turbo-specs-r156/'),
  ('Holset', 'HX40',             'HX40',  58, 58, 76,   22, 70, 3.2, '14cm/16cm/18cm', 'T3', 'diesel daily/tow',           300, 600, 'diesel', 'https://mopar1973man.com/cummins/articles.html/general-cummins/84_engine/89_air-exhaust/holset-turbo-specs-r156/'),
  ('Holset', 'HX55',             'HX55',  65, 65, 76,   28, 85, 3.5, '18cm/21cm', 'T4',  'diesel ISX, big rig',            400, 800, 'diesel', 'https://micturbo.com/products/holset-hx55-turbo-freightliner-cummins-isx1-diesel-14-0l'),
  ('Holset', 'HE351CW',          'HE351', 60, 60, 65,   18, 55, 3.2, 'fixed 9cm IWG', 'T3', 'OEM 5.9 24V swap',              200, 480, 'diesel', 'https://mopar1973man.com/cummins/articles.html/general-cummins/84_engine/89_air-exhaust/holset-turbo-specs-r156/'),
  ('Holset', 'HE351VE',          'HE351', 60, 60, 65,   18, 58, 3.2, 'VGT', 'T3',     '6.7 Cummins OEM VGT',                250, 525, 'diesel', 'https://mopar1973man.com/cummins/articles.html/general-cummins/84_engine/89_air-exhaust/holset-turbo-specs-r156/'),
  ('Holset', 'HE451VE (64mm)',   'HE451', 64, 64, 72,   25, 75, 3.5, 'VGT', 'T4',     'ISX VGT 12.9L',                       350, 700, 'diesel', 'https://hspdiesel.com/he400vg-he451ve-turbocharger-for-cummins-isx-64mm-fleece-performance'),
  ('Holset', 'HE451VE (67mm)',   'HE451', 67, 67, 72,   28, 88, 3.5, 'VGT', 'T4',     'ISX/X15 VGT diesel',                  450, 850, 'diesel', 'https://performancetruckproducts.com/fleece-performance-he400vg-he451ve-turbocharger-for-cummins-isx-67mm/');

-- ─── Xona Rotor (race) ─────────────────────────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('Xona', 'XR 49-48',     'X2C', 50,   50,   49, 12, 38, 3.5, 'various',           'V-band',  'small race',                150, 350,  'gas', 'https://www.fischermotorsports.com/fm-store/induction-system/xona-rotor-turbochargers/x2c-fitment/xona-rotor-49%E2%80%A248-ball-bearing-turbocharger/'),
  ('Xona', 'XR 61-56',     'X3C', 54.8, 54.8, 56, 18, 50, 4.0, 'various',           'V-band',  'race',                      200, 500,  'gas', 'https://www.fischermotorsports.com/fm-store/induction-system/xona-rotor-turbochargers/x3c-fitment/xona-rotor-61%E2%80%A256-ball-bearing-turbocharger-2/'),
  ('Xona', 'XR Blue 73HTZ','XR',  52.6, 52.6, 64, 20, 57, 4.0, '8cm/10cm Subaru',   'Subaru',  'Subaru WRX/STI race',       250, 525,  'gas', 'https://xonarotor.com/products/xr-blue-73htz-turbocharger-for-subaru-wrx-sti'),
  ('Xona', 'XRC 5964S',    'X3C', 59.3, 59.3, 64, 28, 80, 4.2, 'various',           'V-band',  'drag/road race',            370, 800,  'gas', 'https://xonarotor.com/products/xona-rotor-71-64s-ball-bearing-turbocharger'),
  ('Xona', 'XRE 6364S',    'X3C', 63,   63,   64, 30, 85, 4.2, 'various',           'V-band',  'drag/road race',            400, 850,  'gas', 'https://xonarotor.com/products/xre6364s-ball-bearing-turbocharger'),
  ('Xona', 'XRE 6569S',    'X4C', 64.9, 64.9, 69, 35, 100,4.5, 'various',           'T4',      'drag/road race',            500, 950,  'gas', 'https://www.irozmotorsport.com/products/xona-rotor-xre-6569s-x4c-ball-bearing-950r-turbocharger'),
  ('Xona', 'XRE 6869S',    'X4C', 67.9, 67.9, 69, 38, 108,4.5, 'various',           'T4',      'drag/road race',            600, 1050, 'gas', 'https://xonarotor.com/products/xre6869s-ball-bearing-turbocharger'),
  ('Xona', 'XR 78-67',     'X3C', 64,   64,   67, 32, 90, 4.2, 'various',           'V-band',  'race',                      450, 900,  'gas', 'https://www.fischermotorsports.com/fm-store/induction-system/xona-rotor-turbochargers/x3c-fitment/xona-rotor-78%E2%80%A267-ball-bearing-turbocharger/'),
  ('Xona', 'XR 95-67',     'X3C', 67,   67,   67, 35, 100,4.5, 'various',           'V-band',  'race',                      550, 1000, 'gas', 'https://www.fischermotorsports.com/fm-store/induction-system/xona-rotor-turbochargers/x3c-fitment/xona-rotor-95%E2%80%A267-ball-bearing-turbocharger/');

-- ─── Forced Performance (Subaru-specific) ─────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('Forced Performance', 'FP Green',          'Subaru', 56,   56,   64,   18, 61, 4.0, '8cm IWG',    'Subaru', 'Subaru WRX/STI street',     250, 500, 'gas', 'https://www.forcedperformance.shop/products/fp-green-for-subaru-wrx-sti'),
  ('Forced Performance', 'FP Red',            'Subaru', 57.3, 57.3, 67,   22, 65, 4.0, '8cm/10cm',   'Subaru', 'Subaru street/strip',        300, 575, 'gas', 'https://www.forcedperformance.shop/products/fp-red-for-subaru-wrx-sti'),
  ('Forced Performance', 'FP Black HTZ',      'Subaru', 59.1, 59.1, 67.3, 25, 71, 4.0, '8cm/10cm',   'Subaru', 'Subaru strip/race',          350, 625, 'gas', 'https://www.forcedperformance.shop/products/fp-black-for-subaru-wrx-sti'),
  ('Forced Performance', 'FP XR Black 82HTZ', 'Subaru', 59.1, 59.1, 67.3, 28, 75, 4.2, '8cm/10cm',   'Subaru', 'Subaru race ball-bearing',   400, 650, 'gas', 'https://www.forcedperformance.shop/products/xr-black-82htz-turbocharger-for-subaru-wrx-sti');

-- ─── BullsEye Power ────────────────────────────────────────────────────────

INSERT INTO turbo_models
  (brand, model, frame, compressor_wheel_mm, inducer_mm, turbine_wheel_mm,
   surge_flow_lbmin, max_flow_lbmin, max_pressure_ratio, ar_options, exhaust_flange,
   application, hp_range_min, hp_range_max, fuel_type, notes)
VALUES
  ('BullsEye', 'S480 BatMoWheel',         'S400',   80,   80,   96, 38, 130, 4.0, '1.10/1.32',  'T4', 'drag/diesel single',       700, 1250, 'diesel', 'https://bullseyepower.com/pages/batmowheel-series'),
  ('BullsEye', 'BMW GT4088 BatMoWheel',   'GT4088', 63.5, 63.5, 67, 25, 85,  4.0, 'drop-in',    'T4', 'diesel upgrade drop-in',   350, 750,  'diesel', 'https://rudysdiesel.com/products/bullseye-power-drop-in-batmowheel-for-gt4088-turbocharger-non-ball-bearing');
