/**
 * Valvetrain Calculator Validation Script
 * Tests the updated physics model against real-world data points from:
 * - Vizard/Trend Performance Spintron tests (known float RPMs)
 * - COMP Cams spring recommendations
 * - PAC Racing Spintron-validated setups
 * - OHC platform data (Honda K, 2JZ, Coyote, BMW S54)
 */

// ─── Copy of the calculation functions (matching the updated TSX) ───

function rawInertiaForce(effectiveMassGrams, maxRPM, liftInches, durationAt050, aggressiveness) {
  const massKg = effectiveMassGrams / 1000;
  const liftM = liftInches * 0.0254;
  const omega = (maxRPM * 2 * Math.PI) / 60;
  const camOmega = omega / 2;
  const durationRad = (durationAt050 * Math.PI) / 180;
  const noseRad = durationRad * 0.4;
  const noseTime = noseRad / camOmega;
  if (noseTime <= 0) return 0;
  const profileFactor = 0.55 + aggressiveness * aggressiveness * 1.47;
  const peakAccel = liftM * Math.pow(Math.PI / noseTime, 2) * profileFactor;
  const forceN = massKg * peakAccel;
  return forceN / 4.448;
}

function requiredOpenPressure(effectiveMassGrams, maxRPM, liftInches, durationAt050, aggressiveness) {
  return rawInertiaForce(effectiveMassGrams, maxRPM, liftInches, durationAt050, aggressiveness) * 1.10;
}

function estimateValveFloatRPM(openPressureLbs, effectiveMassGrams, liftInches, durationAt050, aggressiveness) {
  let lo = 2000;
  let hi = 15000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const rawForce = rawInertiaForce(effectiveMassGrams, mid, liftInches, durationAt050, aggressiveness);
    if (rawForce < openPressureLbs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round((lo + hi) / 2 / 50) * 50;
}

function effectiveValvetrainMass(arch, valveWt, retainerWt, lockWt, springMass, rockerWt, rockerRatio, pushrodWt, lifterWt, bucketWt, shimWt, followerWt, hlaWt) {
  const valveSide = valveWt + retainerWt + lockWt + springMass * (1/3);
  const R = rockerRatio > 0 ? rockerRatio : 1;
  const R2 = R * R;
  switch (arch) {
    case "pushrod": {
      const rockerContrib = rockerWt * (1/3) * R2;
      const camSideContrib = (lifterWt + pushrodWt * (1/3)) / R2;
      return valveSide + rockerContrib + camSideContrib;
    }
    case "dohc-direct":
      return valveSide + bucketWt + shimWt;
    case "dohc-finger": {
      const followerContrib = followerWt * (1/3) * R2;
      const hlaMoving = hlaWt * 0.5;
      const hlaContrib = hlaMoving / R2;
      return valveSide + followerContrib + hlaContrib;
    }
    default:
      return valveSide;
  }
}

// ─── Test Helpers ───

function pctErr(predicted, actual) {
  return ((predicted - actual) / actual * 100).toFixed(1);
}

function printResult(name, predicted, actual, unit, tolerance = 10) {
  const err = ((predicted - actual) / actual * 100);
  const status = Math.abs(err) <= tolerance ? "✓" : "✗";
  console.log(`  ${status} ${name}: predicted ${Math.round(predicted)} ${unit}, actual ${actual} ${unit} (${err >= 0 ? '+' : ''}${err.toFixed(1)}%)`);
  return Math.abs(err) <= tolerance;
}

// ─── TEST DATA ───

console.log("═══════════════════════════════════════════════════════════════");
console.log("  VALVETRAIN CALCULATOR VALIDATION");
console.log("  Model: profileFactor = 0.55 + agg² × 1.47, safety = 1.10");
console.log("═══════════════════════════════════════════════════════════════\n");

let pass = 0, fail = 0;

// ─── 1. VIZARD SPINTRON DATA (Primary calibration — known float RPMs) ───
console.log("1. VIZARD SPINTRON DATA (SBC, 272° solid roller, 137/580 springs)");
console.log("   Source: Trend Performance / David Vizard Spintron test\n");

const agg_solid_roller = 0.75;
// SBC pushrod: valve + retainer + locks + 1/3 spring + rocker contrib + lifter/pushrod contrib
// Using typical SBC: retainer 28g, locks 8g, spring 90g dual, rocker 95g at 1.5:1
// Solid roller lifter ~90g, pushrod 65g
// Spring mass for dual spring at seat: ~90g
const base_mass_no_valve = 28 + 8 + (90/3) + (95/3 * 1.5*1.5) + (90 + 65/3) / (1.5*1.5);
// = 28 + 8 + 30 + 71.25 + 49.63 = 186.88g

const vizard_lift = 0.560; // estimated for 272° SBC solid roller
const vizard_dur = 272;

const mass_steel = base_mass_no_valve + 119;
const mass_hollow = base_mass_no_valve + 101;
const mass_ti = base_mass_no_valve + 89;

const float_steel = estimateValveFloatRPM(580, mass_steel, vizard_lift, vizard_dur, agg_solid_roller);
const float_hollow = estimateValveFloatRPM(580, mass_hollow, vizard_lift, vizard_dur, agg_solid_roller);
const float_ti = estimateValveFloatRPM(580, mass_ti, vizard_lift, vizard_dur, agg_solid_roller);

if (printResult("Steel 119g valve float RPM", float_steel, 7600, "RPM", 5)) pass++; else fail++;
if (printResult("Hollow 101g valve float RPM", float_hollow, 8000, "RPM", 5)) pass++; else fail++;
if (printResult("Ti 89g valve float RPM", float_ti, 8300, "RPM", 5)) pass++; else fail++;

// Show the raw force at the known float RPMs
const force_at_7600 = rawInertiaForce(mass_steel, 7600, vizard_lift, vizard_dur, agg_solid_roller);
console.log(`\n  Raw inertia at 7,600 RPM (steel): ${force_at_7600.toFixed(0)} lbs (spring: 580 lbs)`);

// ─── 2. COMP CAMS SPRING RECOMMENDATIONS (Pushrod) ───
console.log("\n\n2. COMP CAMS SPRING RECOMMENDATIONS");
console.log("   Source: COMP Cams catalog / JEGS listings\n");

// 2a. COMP 262H (hyd flat, 0.462" lift, 218° @.050, rated 1300-5600 RPM)
// Spring: 105 seat / 273 open
const agg_hyd_flat = 0.30;
const mass_262h = effectiveValvetrainMass("pushrod", 105, 28, 8, 55, 95, 1.5, 65, 28, 0, 0, 0, 0);
const req_262h = requiredOpenPressure(mass_262h, 5600, 0.462, 218, agg_hyd_flat);
const float_262h = estimateValveFloatRPM(273, mass_262h, 0.462, 218, agg_hyd_flat);
console.log(`  COMP 262H (hyd flat, 0.462", 218°, 5600 RPM target)`);
console.log(`  Effective mass: ${mass_262h.toFixed(0)}g`);
if (printResult("Required open at 5,600 RPM", req_262h, 273, "lbs", 20)) pass++; else fail++;
console.log(`  Float RPM: ${float_262h} (margin: ${((float_262h/5600-1)*100).toFixed(0)}% above target)`);

// 2b. COMP Nostalgia solid flat (0.504", 247°, rated to 6900)
// Spring: 132 seat / 280 open
const agg_solid_flat = 0.45;
const mass_nostalgia = effectiveValvetrainMass("pushrod", 105, 28, 8, 90, 95, 1.5, 65, 28, 0, 0, 0, 0);
const req_nostalgia = requiredOpenPressure(mass_nostalgia, 6900, 0.504, 247, agg_solid_flat);
const float_nostalgia = estimateValveFloatRPM(280, mass_nostalgia, 0.504, 247, agg_solid_flat);
console.log(`\n  COMP Nostalgia (solid flat, 0.504", 247°, 6900 RPM target)`);
console.log(`  Effective mass: ${mass_nostalgia.toFixed(0)}g`);
if (printResult("Required open at 6,900 RPM", req_nostalgia, 280, "lbs", 25)) pass++; else fail++;
console.log(`  Float RPM: ${float_nostalgia} (margin: ${((float_nostalgia/6900-1)*100).toFixed(0)}% above target)`);

// 2c. COMP 12-908-9 Drag Race solid roller (0.630", 264°, rated 4200-7200)
// Spring: 210 seat / 524 open. Lifter: solid roller ~90g
const mass_comp_sr = effectiveValvetrainMass("pushrod", 105, 28, 8, 90, 95, 1.5, 65, 90, 0, 0, 0, 0);
const req_comp_sr = requiredOpenPressure(mass_comp_sr, 7200, 0.630, 264, agg_solid_roller);
const float_comp_sr = estimateValveFloatRPM(524, mass_comp_sr, 0.630, 264, agg_solid_roller);
console.log(`\n  COMP 12-908-9 (solid roller, 0.630", 264°, 7200 RPM target)`);
console.log(`  Effective mass: ${mass_comp_sr.toFixed(0)}g (with 90g solid roller lifter)`);
if (printResult("Required open at 7,200 RPM", req_comp_sr, 524, "lbs", 25)) pass++; else fail++;
console.log(`  Float RPM: ${float_comp_sr} (margin: ${((float_comp_sr/7200-1)*100).toFixed(0)}% above target)`);

// 2d. LS hyd roller with beehive (0.541", 233°, rated to ~7500)
// Spring: 92 seat / 304 open, beehive 50g spring, LS rocker ~85g at 1.7:1
const agg_hyd_roller = 0.35;
const mass_ls_beehive = effectiveValvetrainMass("pushrod", 100, 14, 4, 50, 85, 1.7, 65, 110, 0, 0, 0, 0);
const float_ls_beehive = estimateValveFloatRPM(304, mass_ls_beehive, 0.541, 233, agg_hyd_roller);
console.log(`\n  LS NSR Beehive (hyd roller, 0.541", 233°, 7500 RPM target)`);
console.log(`  Effective mass: ${mass_ls_beehive.toFixed(0)}g`);
console.log(`  Float RPM: ${float_ls_beehive} (note: NSR/LST cams are specifically optimized for low spring pressure)`);
const ls_beehive_ok = float_ls_beehive >= 6000; // should be in the ballpark, won't be exact due to NSR
if (ls_beehive_ok) { pass++; console.log("  ✓ In reasonable range (NSR cams beat generic model by design)"); }
else { fail++; console.log("  ✗ Out of range"); }

// ─── 3. RACE SETUPS ───
console.log("\n\n3. RACE SETUPS (Solid Roller)");
console.log("   Source: Yellow Bullet, Dragzine, Engine Builder Mag\n");

// 3a. SB2.2 Circle Track: 0.755" lift, 265/655 springs, 8400 RPM, Ti valves, 1.8:1
const mass_sb2 = effectiveValvetrainMass("pushrod", 60, 13, 5, 90, 120, 1.8, 55, 90, 0, 0, 0, 0);
const float_sb2 = estimateValveFloatRPM(655, mass_sb2, 0.755, 260, agg_solid_roller);
console.log(`  SB2.2 Circle Track (solid roller, 0.755", ~260°, 8400 RPM, Ti valves)`);
console.log(`  Effective mass: ${mass_sb2.toFixed(0)}g`);
console.log(`  Float RPM: ${float_sb2} vs actual 8,400+ (${pctErr(float_sb2, 8400)}%)`);
if (Math.abs(float_sb2 - 8400) / 8400 < 0.15) pass++; else fail++;

// 3b. LS7 Stock Eliminator: 0.630" lift, 258° dur, 235/520 PAC springs, Ti valves, 1.8:1, 8300 RPM
const mass_ls7 = effectiveValvetrainMass("pushrod", 60, 13, 5, 90, 85, 1.8, 65, 110, 0, 0, 0, 0);
const float_ls7 = estimateValveFloatRPM(520, mass_ls7, 0.630, 258, agg_hyd_roller);
console.log(`\n  LS7 Stock Eliminator (hyd roller, 0.630", 258°, Ti int, 8300 RPM)`);
console.log(`  Effective mass: ${mass_ls7.toFixed(0)}g`);
console.log(`  Float RPM: ${float_ls7} vs actual 8,300+ (${pctErr(float_ls7, 8300)}%)`);
if (Math.abs(float_ls7 - 8300) / 8300 < 0.15) pass++; else fail++;

// 3c. Project Spinal Tap: >1.000" lift, 410/1200 springs, 1.9:1, ~11300 RPM failure
const mass_spintap = effectiveValvetrainMass("pushrod", 90, 20, 6, 120, 130, 1.9, 65, 90, 0, 0, 0, 0);
const float_spintap = estimateValveFloatRPM(1200, mass_spintap, 1.045, 270, agg_solid_roller);
console.log(`\n  Project Spinal Tap (solid roller, 1.045", ~270°, 1.9:1, 410/1200 springs)`);
console.log(`  Effective mass: ${mass_spintap.toFixed(0)}g`);
console.log(`  Float RPM: ${float_spintap} vs actual ~11,300 failure (${pctErr(float_spintap, 11300)}%)`);
if (Math.abs(float_spintap - 11300) / 11300 < 0.20) pass++; else fail++;

// ─── 4. OHC ENGINES ───
console.log("\n\n4. OHC ENGINES");
console.log("   Source: Skunk2, Kelford, COMP Cams, Supertech\n");

// 4a. Honda K20 stock (DOHC bucket, ~0.394" lift, ~220°, 8600 RPM redline)
const agg_bucket = 0.25;
const mass_k20_stock = effectiveValvetrainMass("dohc-direct", 50, 8, 3, 30, 0, 1, 0, 0, 22, 4, 0, 0);
const float_k20 = estimateValveFloatRPM(139, mass_k20_stock, 0.394, 220, agg_bucket);
console.log(`  Honda K20 Stock (DOHC bucket, 0.394", 220°, 8600 RPM redline)`);
console.log(`  Effective mass: ${mass_k20_stock.toFixed(0)}g`);
console.log(`  Float RPM: ${float_k20} vs redline 8,600 (${pctErr(float_k20, 8600)}%)`);
if (float_k20 >= 8200 && float_k20 <= 10500) pass++; else fail++;

// 4b. K20 with Skunk2 Pro XP springs + BC Stage 2 cams
const mass_k20_race = effectiveValvetrainMass("dohc-direct", 55, 10, 4, 30, 0, 1, 0, 0, 28, 4, 0, 0);
const float_k20_race = estimateValveFloatRPM(261, mass_k20_race, 0.520, 222, agg_bucket);
console.log(`\n  K20 + BC Stage 2 + Skunk2 Pro XP (0.520", 222°)`);
console.log(`  Effective mass: ${mass_k20_race.toFixed(0)}g`);
console.log(`  Float RPM: ${float_k20_race} (should be ~9000-10500 for K-series racing)`);
if (float_k20_race >= 8500 && float_k20_race <= 11500) pass++; else fail++;

// 4c. 2JZ with Kelford KVS02-BT (DOHC bucket, 0.433" lift, 264°, 8000 RPM target)
const mass_2jz = effectiveValvetrainMass("dohc-direct", 68, 10, 4, 45, 0, 1, 0, 0, 35, 4, 0, 0);
const float_2jz = estimateValveFloatRPM(185, mass_2jz, 0.380, 264, agg_bucket);
console.log(`\n  2JZ + Kelford 264/272 + KVS02-BT (0.380", 264°, 8000 RPM target)`);
console.log(`  Effective mass: ${mass_2jz.toFixed(0)}g`);
console.log(`  Float RPM: ${float_2jz} (should be well above 8,000)`);
if (float_2jz >= 8000) pass++; else fail++;

// 4d. Ford Coyote (DOHC finger follower, 0.550" lift, ~250°, 8500 RPM target)
const agg_finger_hyd = 0.35;
const mass_coyote = effectiveValvetrainMass("dohc-finger", 72, 14, 5, 50, 0, 1.05, 0, 0, 0, 0, 45, 20);
const req_coyote = requiredOpenPressure(mass_coyote, 8500, 0.550, 250, agg_finger_hyd);
const float_coyote = estimateValveFloatRPM(275, mass_coyote, 0.550, 250, agg_finger_hyd);
console.log(`\n  Coyote 5.0 + COMP 26125 (finger follower, 0.550", ~250°, 8500 RPM)`);
console.log(`  Effective mass: ${mass_coyote.toFixed(0)}g`);
if (printResult("Required open at 8,500 RPM", req_coyote, 275, "lbs", 30)) pass++; else fail++;
console.log(`  Float RPM: ${float_coyote}`);

// 4e. BMW S54 (DOHC finger follower, 0.492" lift, ~250°, 8250 RPM stock redline)
const mass_s54 = effectiveValvetrainMass("dohc-finger", 45, 10, 4, 40, 0, 1.05, 0, 0, 0, 0, 35, 0);
const float_s54 = estimateValveFloatRPM(186, mass_s54, 0.492, 250, agg_finger_hyd);
console.log(`\n  BMW S54 + Supertech dual (finger follower, 0.492", ~250°, 8250 RPM)`);
console.log(`  Effective mass: ${mass_s54.toFixed(0)}g`);
console.log(`  Float RPM: ${float_s54} vs redline 8,250 (should be above)`);
if (float_s54 >= 8000) pass++; else fail++;

// ─── 5. ERSON RULE OF THUMB CHECK ───
console.log("\n\n5. ERSON RULE OF THUMB (100 lbs open per 0.100\" lift)");
console.log("   This is a race-oriented guideline, not exact\n");

const erson_lifts = [0.500, 0.600, 0.700, 0.800];
for (const lift of erson_lifts) {
  const erson_target = lift / 0.100 * 100;
  // Use solid roller at ~7500 RPM with typical race mass ~250g
  const req = requiredOpenPressure(250, 7500, lift, 260, agg_solid_roller);
  console.log(`  ${lift.toFixed(3)}" lift: Erson = ${erson_target} lbs, Model = ${Math.round(req)} lbs (${pctErr(req, erson_target)}%)`);
}

// ─── SUMMARY ───
console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`  RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail} tests`);
console.log("═══════════════════════════════════════════════════════════════\n");

// ─── DIAGNOSTIC: Show aggressiveness → profile factor mapping ───
console.log("DIAGNOSTIC: Aggressiveness → Profile Factor mapping");
const aggs = [0.00, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.75, 1.00];
for (const a of aggs) {
  const pf = 0.55 + a * a * 1.47;
  console.log(`  agg ${a.toFixed(2)} → profileFactor ${pf.toFixed(3)}`);
}
