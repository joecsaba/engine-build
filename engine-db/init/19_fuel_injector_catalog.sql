-- Fuel Injector Catalog (manufacturer-published flow + HP ratings)
--
-- Specific injector models from Injector Dynamics, FIC, DeatschWerks,
-- and Bosch Motorsport. All flow ratings @ 3 bar / 43.5 psi standard.
-- Used by the fuel-injector-sizing calculator to surface mfr-recommended
-- options once the user's required-flow is computed.

CREATE TABLE IF NOT EXISTS fuel_injector_catalog (
    id              SERIAL PRIMARY KEY,
    mfr             VARCHAR(60) NOT NULL,
    model           VARCHAR(80) NOT NULL,
    flow_lb_hr      NUMERIC(5,1) NOT NULL,      -- @ 3 bar
    flow_cc_min     INTEGER NOT NULL,
    max_hp          INTEGER NOT NULL,           -- mfr-rated max HP for the injector
    fuel_compat     VARCHAR(80) NOT NULL,       -- 'gas', 'gas/E85', 'gas/E85/methanol', etc.
    common_app      TEXT NOT NULL,
    source_url      TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fi_cat_mfr  ON fuel_injector_catalog(mfr);
CREATE INDEX IF NOT EXISTS idx_fi_cat_flow ON fuel_injector_catalog(flow_lb_hr);

INSERT INTO fuel_injector_catalog
  (mfr, model, flow_lb_hr, flow_cc_min, max_hp, fuel_compat, common_app, source_url, sort_order)
VALUES
  ('Injector Dynamics', 'ID725',          68,  715,   425, 'gas/E85/methanol', 'Honda K-series NA, mild turbo',                      'https://injectordynamics.com/injectors/', 10),
  ('Injector Dynamics', 'ID850',          84,  885,   525, 'gas/E85/methanol', 'LS1/LS6 NA, EVO/STI street',                          'https://injectordynamics.com/injectors/', 20),
  ('Injector Dynamics', 'ID1050-XDS',     101, 1065,  650, 'gas/E85/methanol', 'LS swap 600HP, EVO/STI E85',                          'https://injectordynamics.com/injectors/id1050-xds/', 30),
  ('Injector Dynamics', 'ID1300-XDS',     127, 1335,  800, 'gas/E85/methanol', 'Coyote E85, 2JZ street, ~150hp/inj on E85',           'https://injectordynamics.com/injectors/', 40),
  ('Injector Dynamics', 'ID1700-XDS',     164, 1725, 1050, 'gas/E85/methanol', '2JZ race E85, LSx high HP',                            'http://injectordynamics.com/injectors/id1700-xds/', 50),
  ('Injector Dynamics', 'ID2000',         190, 2000, 1200, 'gas/E85/methanol', 'Pro Mod, race turbo E85',                              'https://injectordynamics.com/injectors/', 60),
  ('Injector Dynamics', 'ID2600-XDS',     247, 2600, 1550, 'gas/E85/methanol', 'Methanol race, extreme boost',                         'http://injectordynamics.com/injectors/id2600-xds/', 70),
  ('Fuel Injector Clinic', 'FIC 525',     50,  525,   325, 'gas/E85',          'NA Honda B/H/D, mild boost',                           'https://fuelinjectorclinic.com/', 110),
  ('Fuel Injector Clinic', 'FIC 775',     74,  775,   475, 'gas/E85',          'Subaru EJ, LS street',                                 'https://fuelinjectorclinic.com/', 120),
  ('Fuel Injector Clinic', 'FIC 1200',    114, 1200,  725, 'gas/E85',          'SRT-4, EVO E85 600HP, K-series boost',                 'https://fuelinjectorclinic.com/IS151-1200H', 130),
  ('Fuel Injector Clinic', 'FIC 1440',    137, 1440,  875, 'gas/E85/race',     'E46 M3, BMW S65, EVO race',                            'https://fuelinjectorclinic.com/products/is403-1440h', 140),
  ('Fuel Injector Clinic', 'FIC 1650',    157, 1650, 1000, 'gas/E85/race',     'LSx race E85, 2JZ boosted',                            'https://fuelinjectorclinic.com/IS305-1650H', 150),
  ('Fuel Injector Clinic', 'FIC 2150',    205, 2150, 1300, 'gas/E85/race',     'LS truck high HP, Mustang race',                       'https://fuelinjectorclinic.com/IS305-2150H', 160),
  ('DeatschWerks', 'DW 42lb (440cc)',     42,  440,   260, 'gas/E85',          'Subaru EJ20 stock-replace, B-series',                  'https://deatschwerks.com/collections/injectors-1', 210),
  ('DeatschWerks', 'DW 50lb (550cc)',     52,  550,   325, 'gas/E85',          'EVO 8/9, K-series boost street',                       'https://deatschwerks.com/collections/injectors/flow-rate-550-cc-min', 220),
  ('DeatschWerks', 'DW 65lb (650cc)',     62,  650,   380, 'gas/E85',          'Focus ST/RS, mild EVO E85',                            'https://deatschwerks.com/collections/injectors-1', 230),
  ('DeatschWerks', 'DW 72lb (750cc)',     71,  750,   450, 'gas/E85',          'Coyote bolt-on, EVO X E85',                            'https://deatschwerks.com/collections/injectors/flow-rate-750-cc-min', 240),
  ('DeatschWerks', 'DW 95lb (1000cc)',    95,  1000,  600, 'gas/E85',          'LS swap 600HP, STI E85, 2JZ street',                   'https://deatschwerks.com/collections/injectors-1', 250),
  ('DeatschWerks', 'DW 1200cc',           114, 1200,  720, 'gas/E85',          'EVO/STI race E85, K-series race',                      'https://deatschwerks.com/collections/injectors-1', 260),
  ('DeatschWerks', 'DW 1500cc',           143, 1500,  900, 'gas/E85',          'LSx race E85, Coyote race',                            'https://deatschwerks.com/collections/injectors-1', 270),
  ('DeatschWerks', 'DW 2200cc',           209, 2200, 1300, 'gas/E85/methanol', 'Race turbo, methanol, Pro Mod',                        'https://deatschwerks.com/collections/injectors-1', 280),
  ('Bosch Motorsport', 'EV14 0280158040', 86,  900,   540, 'gas/E85/M100',     'Universal EV14 swap, LS/Coyote',                       'https://www.bosch-motorsport.com/media/catalog_content/downloads_catalog/pdf_catalog/data_sheet_67797771_injection_valve_ev_14.pdf', 310),
  ('Bosch Motorsport', 'EV14 0280158829', 96,  980,   600, 'gas/E85/M100',     'VW/Audi swap, turbo Subaru E85',                       'https://www.bosch-motorsport.com/products/fuel-and-spark/injection-valves/injection-valve-ev-14/', 320),
  ('Bosch Motorsport', 'EV14 0280158821', 210, 2200, 1300, 'gas/E85/methanol', 'LS3/LS7/LSA race, GM truck boost',                     'https://www.summitracing.com/parts/vsg-0280158821', 330);
