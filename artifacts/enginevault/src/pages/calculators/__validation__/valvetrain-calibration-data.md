# Valvetrain RPM Builder — Calibration Data & Validation

Last updated: 2026-05-02

## Model Summary

**Formula:** `profileFactor = 0.55 + aggressiveness^2 * 1.47`
**Safety factor (requiredOpenPressure):** 1.10x (flat)
**Float estimation:** Uses raw inertia force (no safety), UI enforces 10% margin

## Primary Calibration: Vizard Spintron Data

Source: Trend Performance / David Vizard, published in "How to Build Horsepower"
Setup: SBC, 272 deg at 0.050" solid roller cam, 137 lbs seat / 580 lbs open springs

| Valve | Mass | Measured Float RPM | Predicted Float RPM | Error |
|-------|------|--------------------|---------------------|-------|
| Steel | 119g | 7,600 | 7,600 | +0.0% |
| Hollow-stem | 101g | 8,000 | 7,800 | -2.5% |
| Titanium | 89g | 8,300 | 8,000 | -3.6% |

## COMP Cams Spring Recommendations

### COMP 262H — Hydraulic Flat Tappet (mild street)
- Cam: 12-238-2, 0.462"/0.469" lift, 218/224 deg at 0.050"
- Spring: 981-16, 105 seat / 273 open
- RPM range: 1,300-5,600
- Model: 183 lbs required at 5,600 RPM, float at 7,150 RPM (28% margin)
- Note: COMP adds ~49% durability margin over physics minimum

### COMP 280H — Hydraulic Flat Tappet (street/strip)
- Cam: 12-212-2, 0.480"/0.480" lift, 230/230 deg at 0.050"
- Spring: 981-16, 105 seat / 273 open
- RPM range: 2,000-6,000

### COMP Nostalgia Plus — Solid Flat Tappet
- Cam: 12-673-4, 0.504"/0.498" lift, 247/254 deg at 0.050"
- Spring: 986-16, 132 seat / 280 open
- RPM range: 2,300-6,900
- Model: 307 lbs required at 6,900 (+9.8% vs COMP's 280)

### COMP NSR/Drift — LS Hydraulic Roller
- Cam: 54-777-11, 0.541" lift, 233/243 deg at 0.050"
- Spring: 26906-16 beehive, 92 seat / 304 open
- RPM range: 3,000-7,500
- Note: NSR (No Springs Required) uses Low Shock Technology, beats generic model

### COMP LS Beehive Performance
- Spring: 26918-16, 125 seat / 367 open, up to 0.625" lift
- Spring: 26926-16, 129 seat / 470 open, up to 0.675" lift (505 lb/in rate)

### COMP 12-908-9 — Solid Roller Drag Race
- Cam: 0.630"/0.630" lift, 264/270 deg at 0.050"
- Spring: 954-16, 210 seat / 524 open (483 lb/in rate)
- RPM range: 4,200-7,200
- Model: 657 lbs required at 7,200 (+25%, conservative)

## Race Setups

### SB2.2 Circle Track
- Source: Yellow Bullet forums
- 0.755" valve lift, 1.8:1 rockers, Ti valves
- Crower springs: 265 seat / 655 open
- Peak RPM: 8,400

### SB2.2 High-RPM
- ~0.850" valve lift, 1.8:1 rockers
- ~300 seat / ~1,000 open
- Shift point: 9,600 RPM

### LS7 Stock Eliminator (SAM Tech, 825 HP)
- LS7 427ci, 258/276 at 0.050", 0.630" lift, 1.8:1 rockers
- PAC springs: 235 seat / 520 open
- Ti intake valves, Ti retainers
- Peak RPM: 8,300

### Project Spinal Tap (EngineLabs / COMP Cams)
- LS 358ci, COMP solid roller, 0.550" lobe lift
- Jesel shaft rockers at 1.9:1 (1.045" valve lift)
- PSI springs: 410 seat / 1,200 open
- Stable to ~10,000 RPM, loft ~0.040" at 10,000+
- System failure at ~11,300 RPM
- Total deflection: 0.046" at 1,230 lbs open load
- GSR (Godbold Stiffness Rating): 26,739 lbs/in

### Mountain Motor Pro Stock (Kaase 828ci)
- ~1.000"+ valve lift, Jesel rockers
- PSI triple springs: ~400 seat / 1,200-1,300 open
- Ti valves (7mm stems), Manton pushrods
- Peak RPM: 9,000+, 1,900+ HP NA

## OHC Engine Data

### Honda K-Series (DOHC Bucket)
- Skunk2 Pro XP: 100 seat / 255 open at 1.100", max 0.680", rated 11,000+ RPM
- Skunk2 Alpha: 60 seat / 220 open at 1.100", rated 10,000+ RPM
- Brian Crower Stage 2: 222/224 deg at 0.050", 0.520"/0.497" lift

### Toyota 2JZ-GTE (DOHC Bucket)
- Kelford KVS02-BT: 105 seat / 185 open at 11mm lift, 8,000 RPM
- Brian Crower BC0310: 98 seat / 226 open, max 0.470" lift
- Kelford 264/272 cams: 9.65mm lift
- Kelford 292/302 cams: 10.8mm lift (extreme drag)

### Ford Coyote 5.0 (DOHC Finger Follower)
- COMP 26125: 120 seat / 275 open at 1.020", max 0.600"
- MHS/PAC Stage 3: max 0.575", 30 psi boost
- MHS/PAC Stage 4: tested to 9,500 RPM

### BMW S54 (DOHC Finger Follower)
- Supertech dual: 82 seat / 186 open at 10mm lift, max 15.5mm
- Schrick 288/280 cams: 12.5mm or 14mm lift
- Stock valve weight: ~45-47g

## Spintron-Validated Findings

### Component Weight Effects (same cam, same springs)
- Ti valves (89g vs 119g steel): +700 RPM float threshold
- Ti retainers: +100-200 RPM additional
- Beehive springs vs cylindrical: +700 RPM (harmonic damping)
- Conical springs: +200 RPM (vs cylindrical, same pressure)

### Godbold Stiffness Rating (GSR)
- GSR = spring open load / total system deflection
- Minimum: ~20,000 lbs/in
- Good race: 25,000+ lbs/in
- Pro Stock/NASCAR: ~30,000 lbs/in

### Key Thresholds
- 0.015" valve bounce: threshold for measurable power loss
- 0.040" valve loft: typical at 10,000+ RPM on race builds
- Loft onset: ~800 RPM before total loss of control
- Spring surge: occurs below float RPM, causes power dip

## Cam Acceleration Data (Tilden Technologies)

### Nose Deceleration Limits (in/cam-deg^2)
- Flat tappet limit: ~0.000220 (radius-of-curvature constraint)
- Roller cams: can exceed flat tappet limits (no curvature constraint)
- Solid roller race: 0.000280-0.000350+

### Conversion to Linear Acceleration
```
accel (in/s^2) = accel (in/cam-deg^2) * (RPM * 3)^2
```

### Erson Rule of Thumb
100 lbs open pressure per 0.100" of valve lift (race applications)
Model matches within 0.1% at 7,500 RPM with 250g effective mass.

## Aggressiveness Values (Updated 2026-05-02)

| Cam Type | Old Value | New Value | Rationale |
|----------|-----------|-----------|-----------|
| Hydraulic flat tappet | 0.35 | 0.30 | Conservative; must protect hydraulic pump-up |
| Hydraulic roller | 0.55 | 0.35 | Typical profiles, not NSR/LST |
| Solid flat tappet | 0.50 | 0.45 | Velocity-limited by lifter diameter |
| Solid roller | 0.75 | 0.75 | Unchanged; calibrated to Spintron |
| SOHC hyd rocker | 0.60 | 0.35 | Hydraulic lash constraint |
| SOHC solid rocker | 0.65 | 0.45 | — |
| DOHC bucket | 0.68 | 0.25 | Bucket diameter limits aggressiveness |
| DOHC finger hyd | 0.78 | 0.35 | Hydraulic lash + finger follower |
| DOHC finger solid | 0.82 | 0.50 | Most aggressive OHC type |

## Sources

### Spintron Data
- EngineLabs: Project Spinal Tap I, II, 2.0
- Trend Performance: SpinTron Secrets blog
- Chevy DIY: Small-Block Chevy Valvetrain Dynamics

### Manufacturer Data
- COMP Cams: Valve Springs 101, Spring Master Chart
- PAC Racing Springs: FAQ, Spintron-validated product lines
- Isky Racing: SP/Endurance/Tool Room spring lines
- Kelford Cams: 2JZ spring specs
- Skunk2: K-series Pro XP / Alpha springs
- Supertech: BMW S54 dual springs

### Engineering References
- Tilden Technologies: Cam Design, Cam Springs
- Billy Godbold (COMP): Low Shock Technology, GSR metric
- Reher Morrison: Tech Talk #42, #86 (Spintron insights)
- Engine Builder Magazine: Spring pressure guidelines
- SAE Paper 660032: Cam profile synthesis
- Gordon Blair: Design and Simulation of Four-Stroke Engines

### Forum Data
- Yellow Bullet: SB2.2 spring specs, solid roller pressures
- Offshoreonly: Marine Spintron-tested spring pressures
- Speed-Talk: Cam acceleration calculations
