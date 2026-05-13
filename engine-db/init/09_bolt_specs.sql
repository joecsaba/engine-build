-- Engine head bolt and main bolt specifications
-- Diameter and thread pitch by engine platform

-- Platform display names for bolt spec lookup UI
CREATE TABLE IF NOT EXISTS bolt_spec_platforms (
    platform_slug VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

INSERT INTO bolt_spec_platforms (platform_slug, display_name, manufacturer, sort_order) VALUES
-- Chevrolet
('sbc',         'Small Block Chevy (262-400)',       'Chevrolet',    1),
('bbc',         'Big Block Chevy (396-454-502)',     'Chevrolet',    2),
('ls',          'LS / Gen III-IV',                   'Chevrolet',    3),
-- Ford
('sbf',         'Small Block Ford (221-351W)',       'Ford',         10),
('fe_ford',     'FE Ford (332-428)',                 'Ford',         11),
('mod_ford',    'Modular Ford (4.6/5.4)',            'Ford',         12),
('coyote',      'Coyote 5.0',                       'Ford',         13),
('voodoo',      'Voodoo 5.2 Flat-Plane',            'Ford',         14),
-- Mopar
('mopar_b',     'Mopar B (361/383/400)',             'Mopar',        20),
('mopar_rb',    'Mopar RB (413/426W/440)',           'Mopar',        21),
('mopar_hemi',  '426 Hemi',                          'Mopar',        22),
-- GM Orphans
('pontiac',     'Pontiac V8 (326-455)',              'Pontiac',      30),
('buick_v8',    'Buick V8 (300-455)',                'Buick',        31),
('olds_v8',     'Oldsmobile V8 (307-455)',           'Oldsmobile',   32),
-- Toyota
('toyota_jz',   '1JZ / 2JZ',                        'Toyota',       40),
-- Nissan
('nissan_rb',   'RB20 / RB25 / RB26',               'Nissan',       50),
('nissan_sr',   'SR20DET',                           'Nissan',       51),
('nissan_vq',   'VQ35 / VQ37',                      'Nissan',       52),
-- Honda
('honda_b',     'B-Series (B16/B18)',                'Honda',        60),
('honda_k',     'K-Series (K20/K24)',                'Honda',        61),
-- Subaru
('subaru_ej',   'EJ (EJ25/EJ257)',                  'Subaru',       70),
('subaru_fa',   'FA20DIT',                           'Subaru',       71),
-- BMW
('bmw_s',       'S54 (E46 M3)',                      'BMW',          80),
('bmw_n',       'N54',                               'BMW',          81),
('bmw_b',       'B58',                               'BMW',          82)
ON CONFLICT (platform_slug) DO NOTHING;


CREATE TABLE IF NOT EXISTS bolt_specs (
    id SERIAL PRIMARY KEY,
    platform_slug VARCHAR(50) NOT NULL,         -- matches platform_limits: sbc, bbc, ls, sbf, etc.
    location VARCHAR(20) NOT NULL,              -- 'head' or 'main'
    variant VARCHAR(100),                       -- e.g. '302', '351W', 'gen3', 'inner', 'outer', 'cross_bolt'
    diameter_in NUMERIC(6,4),                   -- bolt diameter in inches (NULL if metric-only)
    diameter_mm NUMERIC(6,2),                   -- bolt diameter in mm
    thread_pitch_tpi INTEGER,                   -- threads per inch (imperial)
    thread_pitch_mm NUMERIC(4,2),               -- thread pitch in mm (metric)
    thread_callout VARCHAR(30) NOT NULL,        -- display string: '7/16"-14' or 'M11x2.0'
    bolt_count INTEGER,                         -- qty per cylinder (head) or per cap (main)
    factory_type VARCHAR(30) DEFAULT 'bolt',    -- bolt, stud, torque_to_yield
    hex_size VARCHAR(20),                       -- wrench/socket size
    common_upgrade VARCHAR(100),                -- typical ARP or aftermarket part series
    notes TEXT,
    source VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bolt_specs_platform ON bolt_specs(platform_slug);
CREATE INDEX IF NOT EXISTS idx_bolt_specs_location ON bolt_specs(location);

-- =============================================================================
-- SMALL BLOCK CHEVY (SBC) — 262-400ci
-- =============================================================================
INSERT INTO bolt_specs (platform_slug, location, variant, diameter_in, diameter_mm, thread_pitch_tpi, thread_pitch_mm, thread_callout, bolt_count, factory_type, hex_size, common_upgrade, notes, source) VALUES

-- Head bolts
('sbc', 'head', 'standard', 0.3750, 9.53, 16, NULL, '3/8"-16', 17, 'bolt', '9/16"', 'ARP 134-3601', 'Most production SBC 1955-2000. 17 bolts per head.', 'GM service manual, ARP catalog'),
('sbc', 'head', 'high_perf_7/16', 0.4375, 11.11, 14, NULL, '7/16"-14', 17, 'bolt', '5/8"', 'ARP 134-3701', 'LT-1 (1970), ZZ4, and some high-perf factory heads use 7/16" head bolts. Requires matching block.', 'GM service manual'),

-- Main bolts
('sbc', 'main', '2_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 134-5001', 'All 2-bolt main SBC blocks.', 'GM service manual'),
('sbc', 'main', '4_bolt_inner', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 134-5202', 'Inner main bolts on 4-bolt blocks.', 'GM service manual'),
('sbc', 'main', '4_bolt_outer', 0.3750, 9.53, 16, NULL, '3/8"-16', 2, 'bolt', '9/16"', 'ARP 134-5202', 'Outer main bolts on 4-bolt blocks.', 'GM service manual'),

-- =============================================================================
-- BIG BLOCK CHEVY (BBC) — 396-454-502
-- =============================================================================

-- Head bolts
('bbc', 'head', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 17, 'bolt', '5/8"', 'ARP 135-3601', 'All production BBC heads. 17 bolts per head.', 'GM service manual, ARP catalog'),

-- Main bolts
('bbc', 'main', '2_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 135-5001', 'All 2-bolt main BBC blocks.', 'GM service manual'),
('bbc', 'main', '4_bolt_inner', 0.5000, 12.70, 13, NULL, '1/2"-13', 2, 'bolt', '3/4"', 'ARP 135-5201', 'Inner main bolts on 4-bolt BBC blocks.', 'GM service manual'),
('bbc', 'main', '4_bolt_outer', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 135-5201', 'Outer main bolts on 4-bolt BBC blocks.', 'GM service manual'),

-- =============================================================================
-- LS FAMILY — LS1 through LS9, Gen III/IV
-- =============================================================================

-- Head bolts
('ls', 'head', 'gen3_inner', NULL, 11.00, NULL, 2.00, 'M11x2.0', 10, 'torque_to_yield', '15mm', 'ARP 234-3711', 'LS1/LS6 Gen III cathedral port. 10 long M11 per head + 5 short M8.', 'GM service manual'),
('ls', 'head', 'gen3_outer', NULL, 8.00, NULL, 1.25, 'M8x1.25', 5, 'torque_to_yield', '13mm', 'ARP 234-3711', 'LS1/LS6 Gen III short outer head bolts.', 'GM service manual'),
('ls', 'head', 'gen4_inner', NULL, 11.00, NULL, 2.00, 'M11x2.0', 10, 'torque_to_yield', '15mm', 'ARP 234-3711', 'LS2/LS3/L92/LS7 Gen IV. Same M11 pattern.', 'GM service manual'),
('ls', 'head', 'gen4_outer', NULL, 8.00, NULL, 1.25, 'M8x1.25', 5, 'torque_to_yield', '13mm', 'ARP 234-3711', 'LS2/LS3/L92/LS7 Gen IV short outer head bolts.', 'GM service manual'),

-- Main bolts
('ls', 'main', 'inner', NULL, 10.00, NULL, 1.50, 'M10x1.5', 2, 'torque_to_yield', '15mm', 'ARP 234-5801', 'Inner main bolts, all Gen III/IV LS. 4-bolt from factory.', 'GM service manual'),
('ls', 'main', 'outer', NULL, 10.00, NULL, 1.50, 'M10x1.5', 2, 'torque_to_yield', '15mm', 'ARP 234-5801', 'Outer main bolts, all Gen III/IV LS.', 'GM service manual'),
('ls', 'main', 'cross_bolt', NULL, 8.00, NULL, 1.25, 'M8x1.25', 2, 'bolt', '13mm', NULL, 'Side cross-bolts on iron truck blocks (LQ4/LQ9 4.8/5.3/6.0). Not present on all LS blocks.', 'GM service manual'),

-- =============================================================================
-- SMALL BLOCK FORD (SBF) — 221-351W
-- =============================================================================

-- Head bolts
('sbf', 'head', '289_302', 0.4375, 11.11, 14, NULL, '7/16"-14', 14, 'bolt', '5/8"', 'ARP 154-3601', '289/302/5.0 head bolts. 14 per head.', 'Ford service manual, ARP catalog'),
('sbf', 'head', '351w', 0.5000, 12.70, 13, NULL, '1/2"-13', 14, 'bolt', '3/4"', 'ARP 154-3603', '351W uses larger 1/2" head bolts than 289/302.', 'Ford service manual'),

-- Main bolts
('sbf', 'main', '289_302', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 154-5001', '289/302 2-bolt main.', 'Ford service manual'),
('sbf', 'main', '302_4_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 4, 'bolt', '5/8"', 'ARP 154-5202', 'Boss 302 and some Mexican blocks have 4-bolt mains.', 'Ford service manual'),
('sbf', 'main', '351w', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 154-5003', '351W 2-bolt main. Same diameter as 302 despite larger head bolts.', 'Ford service manual'),

-- =============================================================================
-- FE FORD — 332-428
-- =============================================================================

-- Head bolts
('fe_ford', 'head', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 15, 'bolt', '5/8"', 'ARP 155-3601', 'All FE heads. 15 bolts per head.', 'Ford service manual'),

-- Main bolts
('fe_ford', 'main', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 155-5001', 'FE 2-bolt main (352, 360, 390).', 'Ford service manual'),
('fe_ford', 'main', '427_cross_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 155-5201', '427 side-oiler vertical main bolts.', 'Ford service manual'),
('fe_ford', 'main', '427_cross_bolt_side', 0.3750, 9.53, 16, NULL, '3/8"-16', 2, 'bolt', '9/16"', NULL, '427 side-oiler horizontal cross-bolts.', 'Ford service manual'),

-- =============================================================================
-- MODULAR FORD (4.6/5.4) & COYOTE (5.0)
-- =============================================================================

-- Mod motor head bolts
('mod_ford', 'head', '4.6_2v', NULL, 10.00, NULL, 1.50, 'M10x1.5', 10, 'torque_to_yield', '15mm', NULL, '4.6L 2V SOHC head bolts. 10 per head.', 'Ford service manual'),
('mod_ford', 'head', '4.6_4v', NULL, 10.00, NULL, 1.50, 'M10x1.5', 10, 'torque_to_yield', '15mm', NULL, '4.6L 4V DOHC (Cobra, Mach 1) head bolts.', 'Ford service manual'),

-- Mod motor main bolts
('mod_ford', 'main', 'standard', NULL, 10.00, NULL, 1.50, 'M10x1.5', 4, 'torque_to_yield', '15mm', NULL, '4.6/5.4 modular cross-bolted mains. 4 bolts per cap.', 'Ford service manual'),

-- Coyote head bolts
('coyote', 'head', 'gen1_gen2', NULL, 11.00, NULL, 1.50, 'M11x1.5', 10, 'torque_to_yield', '15mm', 'ARP 256-4301', 'Coyote Gen 1-2 (2011-2017). 10 per head.', 'Ford service manual, ARP catalog'),
('coyote', 'head', 'gen3', NULL, 11.00, NULL, 1.50, 'M11x1.5', 10, 'torque_to_yield', '15mm', 'ARP 256-4301', 'Coyote Gen 3 (2018+). Same thread spec.', 'Ford service manual'),

-- Coyote main bolts
('coyote', 'main', 'standard', NULL, 10.00, NULL, 1.50, 'M10x1.5', 4, 'bolt', '15mm', 'ARP 256-5801', 'Coyote cross-bolted mains. 4 bolts per cap.', 'Ford service manual'),

-- =============================================================================
-- MOPAR B/RB — 361-440
-- =============================================================================

-- Head bolts
('mopar_b', 'head', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 17, 'bolt', '5/8"', 'ARP 144-3601', 'Mopar B engine (361/383/400). 17 per head.', 'Chrysler service manual'),
('mopar_rb', 'head', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 17, 'bolt', '5/8"', 'ARP 145-3601', 'Mopar RB engine (413/426W/440). 17 per head.', 'Chrysler service manual'),

-- Main bolts
('mopar_b', 'main', '2_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 144-5001', 'Mopar B 2-bolt main.', 'Chrysler service manual'),
('mopar_rb', 'main', '2_bolt', 0.5000, 12.70, 13, NULL, '1/2"-13', 2, 'bolt', '3/4"', 'ARP 145-5001', 'Mopar RB 2-bolt main. Larger 1/2" bolts.', 'Chrysler service manual'),

-- =============================================================================
-- MOPAR HEMI — 426
-- =============================================================================

-- Head bolts
('mopar_hemi', 'head', '426', 0.4375, 11.11, 14, NULL, '7/16"-14', 16, 'stud', '5/8"', 'ARP 145-4001', '426 Hemi used studs from factory. 16 per head.', 'Chrysler service manual'),

-- Main bolts
('mopar_hemi', 'main', 'standard', 0.5000, 12.70, 13, NULL, '1/2"-13', 4, 'bolt', '3/4"', 'ARP 145-5201', '426 Hemi 4-bolt mains from factory. Cross-bolted.', 'Chrysler service manual'),

-- =============================================================================
-- PONTIAC V8 — 326-455
-- =============================================================================

-- Head bolts
('pontiac', 'head', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 14, 'bolt', '5/8"', 'ARP 194-3601', 'All Pontiac V8. 14 per head.', 'Pontiac service manual'),

-- Main bolts
('pontiac', 'main', '2_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', 'ARP 194-5001', 'Pontiac 2-bolt main.', 'Pontiac service manual'),
('pontiac', 'main', '4_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 4, 'bolt', '5/8"', 'ARP 194-5201', '455 SD/HO 4-bolt main.', 'Pontiac service manual'),

-- =============================================================================
-- BUICK V8 — 300-455
-- =============================================================================

-- Head bolts
('buick_v8', 'head', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 17, 'bolt', '5/8"', 'ARP 124-3601', 'Buick V8 (350, 400, 430, 455). 17 per head.', 'Buick service manual'),

-- Main bolts
('buick_v8', 'main', '2_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', NULL, 'Buick V8 2-bolt main.', 'Buick service manual'),

-- =============================================================================
-- OLDSMOBILE V8 — 307-455
-- =============================================================================

-- Head bolts
('olds_v8', 'head', 'standard', 0.4375, 11.11, 14, NULL, '7/16"-14', 17, 'bolt', '5/8"', 'ARP 180-3601', 'Olds V8 (307, 350, 403, 425, 455). 17 per head.', 'Oldsmobile service manual'),

-- Main bolts
('olds_v8', 'main', '2_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 2, 'bolt', '5/8"', NULL, 'Olds V8 2-bolt main.', 'Oldsmobile service manual'),
('olds_v8', 'main', '4_bolt', 0.4375, 11.11, 14, NULL, '7/16"-14', 4, 'bolt', '5/8"', NULL, 'Olds 455 4-bolt main (W-30, W-31).', 'Oldsmobile service manual'),

-- =============================================================================
-- TOYOTA JZ — 1JZ/2JZ
-- =============================================================================

-- Head bolts
('toyota_jz', 'head', '2jz', NULL, 11.00, NULL, 1.25, 'M11x1.25', 14, 'torque_to_yield', '14mm', 'ARP 203-4303', '2JZ-GTE head bolts. 14 per head. TTY from factory — stud upgrade critical above 600 HP.', 'Toyota service manual, ARP catalog'),
('toyota_jz', 'head', '1jz', NULL, 11.00, NULL, 1.25, 'M11x1.25', 14, 'torque_to_yield', '14mm', 'ARP 203-4301', '1JZ-GTE head bolts. Same thread spec as 2JZ.', 'Toyota service manual'),

-- Main bolts
('toyota_jz', 'main', '2jz', NULL, 12.00, NULL, 1.25, 'M12x1.25', 2, 'bolt', '17mm', 'ARP 203-5001', '2JZ main bolts. 2-bolt girdle-style main caps.', 'Toyota service manual'),

-- =============================================================================
-- NISSAN RB — RB20/RB25/RB26
-- =============================================================================

-- Head bolts
('nissan_rb', 'head', 'rb26', NULL, 11.00, NULL, 1.25, 'M11x1.25', 11, 'torque_to_yield', '14mm', 'ARP 202-4308', 'RB26DETT head bolts. 11 per head.', 'Nissan service manual'),
('nissan_rb', 'head', 'rb25', NULL, 11.00, NULL, 1.25, 'M11x1.25', 11, 'torque_to_yield', '14mm', 'ARP 202-4301', 'RB25DET head bolts. Same thread as RB26.', 'Nissan service manual'),

-- Main bolts
('nissan_rb', 'main', 'standard', NULL, 12.00, NULL, 1.25, 'M12x1.25', 2, 'bolt', '17mm', 'ARP 202-5001', 'RB main bolts, all variants. 2-bolt ladder frame.', 'Nissan service manual'),

-- =============================================================================
-- NISSAN SR20
-- =============================================================================

-- Head bolts
('nissan_sr', 'head', 'sr20det', NULL, 11.00, NULL, 1.25, 'M11x1.25', 10, 'torque_to_yield', '14mm', 'ARP 202-4701', 'SR20DET head bolts. 10 per head.', 'Nissan service manual'),

-- Main bolts
('nissan_sr', 'main', 'standard', NULL, 12.00, NULL, 1.25, 'M12x1.25', 2, 'bolt', '17mm', 'ARP 202-5401', 'SR20 2-bolt main.', 'Nissan service manual'),

-- =============================================================================
-- HONDA B SERIES — B16/B18
-- =============================================================================

-- Head bolts
('honda_b', 'head', 'b18c', NULL, 11.00, NULL, 1.50, 'M11x1.5', 10, 'torque_to_yield', '14mm', 'ARP 208-4303', 'B18C1/C5 head bolts. 10 per head.', 'Honda service manual, ARP catalog'),

-- Main bolts
('honda_b', 'main', 'standard', NULL, 10.00, NULL, 1.25, 'M10x1.25', 2, 'bolt', '14mm', 'ARP 208-5401', 'B-series 2-bolt main. Girdle-style lower block.', 'Honda service manual'),

-- =============================================================================
-- HONDA K SERIES — K20/K24
-- =============================================================================

-- Head bolts
('honda_k', 'head', 'k20', NULL, 11.00, NULL, 1.50, 'M11x1.5', 10, 'torque_to_yield', '14mm', 'ARP 208-4304', 'K20A/K20A2 head bolts. 10 per head.', 'Honda service manual'),
('honda_k', 'head', 'k24', NULL, 11.00, NULL, 1.50, 'M11x1.5', 10, 'torque_to_yield', '14mm', 'ARP 208-4304', 'K24 head bolts. Same spec as K20.', 'Honda service manual'),

-- Main bolts
('honda_k', 'main', 'standard', NULL, 10.00, NULL, 1.25, 'M10x1.25', 2, 'bolt', '14mm', 'ARP 208-5801', 'K-series 2-bolt main.', 'Honda service manual'),

-- =============================================================================
-- SUBARU EJ/FA
-- =============================================================================

-- Head bolts
('subaru_ej', 'head', 'ej257', NULL, 11.00, NULL, 1.25, 'M11x1.25', 8, 'torque_to_yield', '14mm', 'ARP 260-4701', 'EJ257 (STI) head bolts. 8 per head (boxer layout). ARP studs fix the notorious head gasket issue.', 'Subaru service manual'),

-- Main bolts
('subaru_ej', 'main', 'standard', NULL, 12.00, NULL, 1.25, 'M12x1.25', 2, 'bolt', '17mm', 'ARP 260-5401', 'EJ main bolts. Case-half bolts on boxer.', 'Subaru service manual'),

-- Head bolts - FA20
('subaru_fa', 'head', 'fa20dit', NULL, 11.00, NULL, 1.25, 'M11x1.25', 8, 'torque_to_yield', '14mm', NULL, 'FA20DIT head bolts. 8 per head.', 'Subaru service manual'),

-- =============================================================================
-- BMW S/N/B SERIES
-- =============================================================================

-- Head bolts
('bmw_s', 'head', 's54', NULL, 10.00, NULL, 1.50, 'M10x1.5', 14, 'torque_to_yield', '14mm', NULL, 'S54 (E46 M3) head bolts. 14 per head.', 'BMW TIS'),
('bmw_n', 'head', 'n54', NULL, 10.00, NULL, 1.50, 'M10x1.5', 14, 'torque_to_yield', '14mm', NULL, 'N54 head bolts. TTY — replace on removal.', 'BMW TIS'),
('bmw_b', 'head', 'b58', NULL, 10.00, NULL, 1.50, 'M10x1.5', 14, 'torque_to_yield', '14mm', NULL, 'B58 head bolts. 14 per head.', 'BMW TIS'),

-- Main bolts
('bmw_s', 'main', 's54', NULL, 10.00, NULL, 1.50, 'M10x1.5', 2, 'bolt', '16mm', NULL, 'S54 2-bolt main.', 'BMW TIS'),
('bmw_n', 'main', 'n54', NULL, 10.00, NULL, 1.50, 'M10x1.5', 2, 'bolt', '16mm', NULL, 'N54 2-bolt main with bedplate.', 'BMW TIS'),
('bmw_b', 'main', 'b58', NULL, 10.00, NULL, 1.50, 'M10x1.5', 2, 'bolt', '16mm', NULL, 'B58 main bolts with structural bedplate.', 'BMW TIS'),

-- =============================================================================
-- NISSAN VQ — VQ35/VQ37
-- =============================================================================

-- Head bolts
('nissan_vq', 'head', 'vq35de', NULL, 11.00, NULL, 1.25, 'M11x1.25', 10, 'torque_to_yield', '14mm', 'ARP 202-4305', 'VQ35DE head bolts. 10 per head.', 'Nissan service manual'),
('nissan_vq', 'head', 'vq37vhr', NULL, 11.00, NULL, 1.25, 'M11x1.25', 10, 'torque_to_yield', '14mm', NULL, 'VQ37VHR head bolts. Same thread spec.', 'Nissan service manual'),

-- Main bolts
('nissan_vq', 'main', 'standard', NULL, 12.00, NULL, 1.25, 'M12x1.25', 2, 'bolt', '17mm', NULL, 'VQ main bolts, all variants. Bedplate design.', 'Nissan service manual');
