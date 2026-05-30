-- Piston-to-Valve Clearance Minimums (manufacturer-published)
--
-- Source-tagged minimum P-to-V clearance recommendations by valve material
-- and application tier. Used by the piston-to-valve calculator to validate
-- a measured/computed clearance against what real builders publish.
--
-- KEY FINDING (research 2026-05-28): the conventional "titanium needs MORE
-- clearance" rule is wrong. No manufacturer publishes a higher Ti minimum —
-- in fact Reher-Morrison and JE allow TIGHTER values (0.060"/0.100" race)
-- because Ti's lower mass = less valvetrain bounce. The real "more
-- clearance" trigger is ALUMINUM RODS (+0.030" per Diamond Racing) due to
-- greater rod stretch at RPM.
--
-- Stored as one row per (mfr, valve_material, application). The calculator
-- collapses these into a minimum envelope per material × application.

CREATE TABLE IF NOT EXISTS piston_to_valve_minimums (
    id              SERIAL PRIMARY KEY,
    mfr             VARCHAR(60) NOT NULL,           -- 'JE Pistons', 'Wiseco', 'Diamond Racing', etc.
    valve_material  VARCHAR(40) NOT NULL,           -- 'steel', 'stainless', 'titanium', 'inconel', 'steel/stainless', 'any'
    application     VARCHAR(60) NOT NULL,           -- 'street', 'street-strip', 'race', 'drag-only', etc.
    intake_min      NUMERIC(5,3) NOT NULL,          -- inches
    exhaust_min     NUMERIC(5,3) NOT NULL,
    reason          TEXT,                            -- why this value
    rod_material    VARCHAR(20),                     -- 'steel', 'aluminum', NULL = any
    source_url      TEXT,
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptv_mfr      ON piston_to_valve_minimums(mfr);
CREATE INDEX IF NOT EXISTS idx_ptv_material ON piston_to_valve_minimums(valve_material);
CREATE INDEX IF NOT EXISTS idx_ptv_app      ON piston_to_valve_minimums(application);

INSERT INTO piston_to_valve_minimums
  (mfr, valve_material, application, intake_min, exhaust_min, reason, rod_material, source_url, notes, sort_order)
VALUES
  ('JE Pistons', 'steel/stainless', 'street-strip', 0.080, 0.100,
   'Thermal expansion + assembly safety margin; valve-pocket depths sized for popular cams',
   'steel', 'https://www.jepistons.com/je-auto-blog/how-to-check-piston-to-valve-clearance-with-clay/',
   'JE''s default published recommendation.', 10),

  ('JE Pistons', 'steel/stainless', 'race', 0.070, 0.100,
   'Acceptable if RPM controlled and every cylinder checked',
   'steel', 'https://www.jepistons.com/frequently-asked-questions-faqs/',
   NULL, 20),

  ('Wiseco', 'steel/stainless', 'street', 0.080, 0.100,
   'Universal safe minimum for street builds',
   'steel', 'http://blog.wiseco.com/how-to-check-radial-piston-to-valve-clearance', NULL, 30),

  ('Wiseco', 'steel/stainless', 'race', 0.060, 0.080,
   'Acceptable if camshaft supplier signs off',
   'steel', 'http://blog.wiseco.com/how-to-check-radial-piston-to-valve-clearance', NULL, 40),

  ('Wiseco', 'any', 'radial-floor', 0.050, 0.050,
   'Radial valve-to-pocket-wall minimum (different axis than P-to-V vertical)',
   NULL, 'http://blog.wiseco.com/how-to-check-radial-piston-to-valve-clearance',
   'Not a P-to-V vertical minimum — radial floor between valve edge and pocket wall.', 50),

  ('Diamond Racing', 'steel/stainless', 'street-strip', 0.080, 0.100,
   'Exhaust expands more due to combustion heat; popular consensus value',
   'steel', 'https://blog.diamondracing.net/checking-piston-to-valve-clearance-the-right-way',
   NULL, 60),

  ('Diamond Racing', 'any', 'race-aluminum-rod-conservative', 0.110, 0.130,
   'Conservative +0.030 over steel-rod baseline; Diamond cites RPM stretch as the mechanism (contested by MGP/GRP — see notes).',
   'aluminum', 'https://blog.diamondracing.net/checking-piston-to-valve-clearance-the-right-way',
   'Supported by Reher-Morrison deck-clearance guidance (+0.020-0.030 aluminum vs steel). Editorial sources (EngineLabs, StreetMuscle, RPM Mag) repeat this verbatim but appear to share a single origin, not independent confirmation.', 70),

  ('MGP Connecting Rods', 'any', 'race-aluminum-rod-modern', 0.090, 0.110,
   'MGP (primary aluminum rod mfr) says modern aerospace-grade aluminum has eliminated the rod stretch builders historically compensated for. Only ~0.010 thermal growth in practice.',
   'aluminum', 'https://www.mgpconnectingrods.com/mgp-tech/technical-advice/',
   'Contradicts conventional +0.030 adder. Primary mfr source — should outweigh editorial repeats.', 75),

  ('GRP Connecting Rods', 'any', 'race-aluminum-rod-modern', 0.090, 0.110,
   'GRP says aluminum rods stretch less than 0.010 more than steel. Mechanism is THERMAL expansion (CTE math: 6in rod, +280F = ~0.022in growth), NOT RPM stretch as Diamond claims.',
   'aluminum', 'https://www.dragzine.com/tech-stories/engine/debunking-aluminum-rod-myths-with-grp/',
   'Cross-validation source for MGP. Quote: "everyone is under the impression that aluminum rods permanently stretch, but this simply is not the case".', 76),

  ('Reher-Morrison', 'steel', 'pro-stock', 0.060, 0.120,
   'Published in R-M engine-building book; exhaust = 1.6-2x intake',
   'steel', 'https://rehermorrison.com/tech-talk-41-security-clearance-measuring-piston-to-valve-clearance-the-right-way/',
   NULL, 80),

  ('Reher-Morrison', 'steel', 'sportsman-drag', 0.075, 0.120,
   'Typical sportsman drag spec',
   'steel', 'https://rehermorrison.com/tech-talk-41-security-clearance-measuring-piston-to-valve-clearance-the-right-way/',
   NULL, 90),

  ('Reher-Morrison', 'titanium', 'drag-race', 0.055, 0.100,
   'Ti + good springs allow tight clearance if every cyl checked. Ti is LIGHTER so less rod stretch.',
   'steel', 'https://rehermorrison.com/tech-talk-41-security-clearance-measuring-piston-to-valve-clearance-the-right-way/',
   'Validates that Ti can run TIGHTER than steel, not looser.', 100),

  ('Crower', 'any', 'high-lift-cam-radial', 0.050, 0.050,
   'Minimum radial valve-to-retainer-or-seal-or-guide (not P-to-V vertical)',
   NULL, 'https://www.crower.com/media/pdf/valvespring.pdf',
   NULL, 110),

  ('Ross Pistons', 'steel/stainless', 'street-strip', 0.080, 0.100,
   'Industry consensus; Ross valve pockets custom-cut to cam',
   'steel', 'https://www.rosspistons.com/wp-content/uploads/2016/08/Piston-Install-Auto-Ross.pdf',
   NULL, 120),

  ('Engine Builder Mag', 'steel', 'conservative-street', 0.060, 0.080,
   'Safe minimum when valvetrain well-controlled at modest RPM',
   'steel', 'https://www.enginebuildermag.com/2024/01/degreeing-the-camshaft-and-checking-valve-to-piston-clearance/',
   NULL, 130),

  ('EngineLabs', 'steel', 'high-rpm-street', 0.100, 0.140,
   'Conservative standard for stock-rod street performance to absorb rod stretch',
   'steel', 'https://www.enginelabs.com/engine-tech/enginelabs-blueprint-series-checking-piston-to-valve-clearance/',
   NULL, 140),

  ('Street Muscle Mag', 'steel', 'sprint-car-floor', 0.035, 0.090,
   'Sprint-car steel-rod observed minimum — NOT a recommended general spec',
   'steel', 'https://www.streetmusclemag.com/tech-stories/clean-clear-measure-piston-valve-clearance/',
   'Reference only — below other mfr published minimums.', 150),

  ('Ferrea', 'titanium', 'street-strip', 0.080, 0.100,
   'Industry consensus; Ti needs bronze guides + steel lash caps separately',
   'steel', 'https://www.enginelabs.com/engine-tech/engine/titanium-tech-tuesday-the-skinny-on-titanium-valves-with-ferrea/',
   'Refutes "Ti needs MORE clearance" myth.', 160),

  ('Supertech', 'inconel', 'turbo-high-egt', 0.080, 0.100,
   'Inconel 751 has LOWER thermal expansion than stainless — no special bump',
   'steel', 'https://ipg-supertech.com/blogs/news/unleashing-power-and-reliability-the-advantages-of-inconel-exhaust-valves-for-high-performance-engines',
   'Refutes "Inconel exhaust needs 0.130" myth.', 170);
