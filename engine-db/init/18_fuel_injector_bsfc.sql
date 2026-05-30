-- Fuel Injector BSFC Recommendations (manufacturer-published)
--
-- Brake-Specific Fuel Consumption values per source per fuel/aspiration.
-- Used by the fuel-injector-sizing calculator to validate its hardcoded
-- BSFC defaults against what real injector mfrs publish.
--
-- KEY FINDING (research 2026-05-29):
-- Calc's methanol BSFC of 1.60/1.80/1.70 was significantly inflated vs
-- mfr consensus (Injector Dynamics + HP Academy + FIC + DeatschWerks
-- converge on ~0.95 NA / 1.35-1.40 turbo). Only EFI University publishes
-- the high end (1.90 forced). The DB-derived defaults bring methanol in
-- line with the majority of mfr-published values.

CREATE TABLE IF NOT EXISTS fuel_injector_bsfc_recommendations (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(60) NOT NULL,
    fuel            VARCHAR(20) NOT NULL,      -- 'gas-e10', 'gas-e0', 'e85', 'methanol', 'diesel'
    aspiration      VARCHAR(20) NOT NULL,      -- 'NA', 'turbo', 'supercharged', 'forced' (turbo or SC)
    bsfc            NUMERIC(4,2) NOT NULL,     -- lb/hp-hr
    bsfc_range_low  NUMERIC(4,2),
    bsfc_range_high NUMERIC(4,2),
    source_url      TEXT,
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fi_bsfc_source ON fuel_injector_bsfc_recommendations(source);
CREATE INDEX IF NOT EXISTS idx_fi_bsfc_fuel   ON fuel_injector_bsfc_recommendations(fuel);

INSERT INTO fuel_injector_bsfc_recommendations
  (source, fuel, aspiration, bsfc, bsfc_range_low, bsfc_range_high, source_url, notes, sort_order)
VALUES
  ('Injector Dynamics', 'gas-e10', 'NA',           0.50, 0.45, 0.50, 'https://injectordynamics.com/injector-selector/', NULL, 10),
  ('Injector Dynamics', 'gas-e10', 'turbo',        0.60, 0.55, 0.65, 'https://injectordynamics.com/injector-selector/', NULL, 20),
  ('Injector Dynamics', 'e85',     'NA',           0.65, 0.60, 0.70, 'https://injectordynamics.com/injector-selector/', NULL, 30),
  ('Injector Dynamics', 'e85',     'turbo',        0.77, 0.72, 0.82, 'https://injectordynamics.com/injector-selector/', NULL, 40),
  ('Fuel Injector Clinic', 'gas-e10', 'NA',        0.50, 0.40, 0.60, 'https://fuelinjectorclinic.com/pages/horsepower-calculator', NULL, 50),
  ('Fuel Injector Clinic', 'gas-e10', 'forced',    0.65, 0.60, 0.70, 'https://fuelinjectorclinic.com/pages/horsepower-calculator', NULL, 60),
  ('Fuel Injector Clinic', 'e85',     'NA',        0.65, 0.55, 0.75, 'https://fuelinjectorclinic.com/pages/horsepower-calculator', NULL, 70),
  ('Fuel Injector Clinic', 'e85',     'forced',    0.80, 0.75, 0.85, 'https://fuelinjectorclinic.com/pages/horsepower-calculator', NULL, 80),
  ('DeatschWerks', 'gas-e10', 'NA',                0.45, 0.45, 0.50, 'https://deatschwerks.com/pages/fuel-injector-calculator', NULL, 110),
  ('DeatschWerks', 'gas-e10', 'turbo',             0.50, 0.50, 0.60, 'https://deatschwerks.com/pages/fuel-injector-calculator', NULL, 120),
  ('DeatschWerks', 'gas-e10', 'supercharged',      0.55, 0.55, 0.65, 'https://deatschwerks.com/pages/fuel-injector-calculator', NULL, 130),
  ('DeatschWerks', 'e85',     'forced',            0.78, 0.75, 0.85, 'https://deatschwerks.com/pages/fuel-injector-calculator', NULL, 140),
  ('HP Academy', 'gas-e10', 'NA',                  0.50, 0.40, 0.60, 'https://www.hpacademy.com/forum/efi-tuning/show/bsfc-for-e85/', NULL, 210),
  ('HP Academy', 'gas-e10', 'forced',              0.65, 0.60, 0.70, 'https://www.hpacademy.com/forum/efi-tuning/show/bsfc-for-e85/', NULL, 220),
  ('HP Academy', 'e85',     'NA',                  0.65, 0.55, 0.75, 'https://www.hpacademy.com/forum/efi-tuning/show/bsfc-for-e85/', NULL, 230),
  ('HP Academy', 'e85',     'forced',              0.80, 0.75, 0.85, 'https://www.hpacademy.com/forum/efi-tuning/show/bsfc-for-e85/', NULL, 240),
  ('HP Academy', 'methanol', 'NA',                 0.95, 0.90, 1.00, 'https://www.hpacademy.com/forum/efi-tuning/show/bsfc-for-e85/', NULL, 250),
  ('HP Academy', 'methanol', 'forced',             1.35, 1.20, 1.50, 'https://www.hpacademy.com/forum/efi-tuning/show/bsfc-for-e85/', NULL, 260),
  ('EFI University', 'gas-e10', 'NA',              0.48, 0.45, 0.50, 'https://www.enginelabs.com/news/calculating-fuel-demands-and-injector-sizing-with-efi-university/', NULL, 310),
  ('EFI University', 'gas-e10', 'forced',          0.63, 0.60, 0.65, 'https://www.enginelabs.com/news/calculating-fuel-demands-and-injector-sizing-with-efi-university/', NULL, 320),
  ('EFI University', 'e85',     'forced',          0.88, 0.84, 0.91, 'https://www.enginelabs.com/news/calculating-fuel-demands-and-injector-sizing-with-efi-university/', NULL, 330),
  ('EFI University', 'methanol', 'forced',         1.90, 1.80, 2.00, 'https://www.enginelabs.com/news/calculating-fuel-demands-and-injector-sizing-with-efi-university/', 'Outlier on the high end vs other mfrs.', 340),
  ('CarTechBooks', 'diesel', 'turbo',              0.36, 0.34, 0.38, 'https://www.cartechbooks.com/blogs/techtips/fuel-system-math-in-racing-engine-design', 'Bosch reference, intercooled.', 410),
  ('CarTechBooks', 'diesel', 'turbo-noIC',         0.38, 0.36, 0.40, 'https://www.cartechbooks.com/blogs/techtips/fuel-system-math-in-racing-engine-design', 'Bosch reference, no intercooler.', 420),
  ('Snake Eater Performance', 'gas-e10', 'NA',     0.50, 0.45, 0.55, 'https://www.snakeeaterperformance.com/blogs/tech-help/fuel-injectors-how-to-determine-your-needs-when-purchasing-fuel-injectors', NULL, 510);
