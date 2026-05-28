#!/usr/bin/env node
/**
 * Internal validation: run the valvetrain calculator math against every
 * manufacturer-published cam+spring+RPM reference combo and report how
 * close each safety factor (1.00 / 1.15 / 1.30) lands vs. the published
 * max RPM.
 *
 * Used to tune the calculator's defaults. NOT user-facing.
 *
 *   node scripts/validate-valvetrain.mjs
 */

// ── Calculator math (mirrored from src/pages/calculators/valvetrain-builder.tsx) ──

function requiredOpenPressure(massG, maxRPM, liftIn, dur050, aggressiveness, safetyFactor) {
  const massKg = massG / 1000;
  const liftM = liftIn * 0.0254;
  const omega = (maxRPM * 2 * Math.PI) / 60;
  const camOmega = omega / 2;
  const durationRad = (dur050 * Math.PI) / 180;
  const noseRad = durationRad * 0.4;
  const noseTime = noseRad / camOmega;
  if (noseTime <= 0) return 0;
  const peakAccel = liftM * Math.pow(Math.PI / noseTime, 2) * (0.50 + aggressiveness * 0.15);
  const forceN = massKg * peakAccel;
  const forceLbs = forceN / 4.448;
  return forceLbs * safetyFactor;
}

function estimateValveFloatRPM(openLbs, massG, liftIn, dur050, aggressiveness, safetyFactor) {
  let lo = 2000, hi = 15000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const req = requiredOpenPressure(massG, mid, liftIn, dur050, aggressiveness, safetyFactor);
    if (req < openLbs) lo = mid;
    else               hi = mid;
  }
  return Math.round((lo + hi) / 2 / 50) * 50;
}

/** Effective mass at the valve for a pushrod 1.5:1 SBC-style valvetrain. */
function effectiveMassPushrod({ valve, retainer, lock, spring, rocker, R, lifter, pushrod }) {
  const R2 = R * R;
  return valve + retainer + lock + spring * (1/3)
       + rocker * (1/3) * R2
       + (lifter + pushrod * (1/3)) / R2;
}
/** Effective mass at the valve for a DOHC bucket. */
function effectiveMassBucket({ valve, retainer, lock, spring, bucket, shim }) {
  return valve + retainer + lock + spring * (1/3) + bucket + shim;
}

// Cam-type aggressiveness (matches CAM_TYPES in the calculator)
const AGG = {
  "hyd-flat":     0.35,
  "hyd-roller":   0.55,
  "sol-flat":     0.50,
  "sol-roller":   0.75,
  "DOHC-bucket":  0.68,
};

// Typical valvetrain mass presets per cam family. These are "what a typical
// builder using a name-brand SBC/BBC/LS kit would have" — not the user's exact
// build. Validation tolerance accounts for ±10-15g real-world spread.
const MASS_PRESETS = {
  // Pushrod SBC-style: 105g intake valve, 28g retainer, 8g lock, 95g rocker @1.5,
  //                    65g pushrod, 30g lifter (hyd flat) or 110g (hyd roller) or 90g (solid roller)
  "hyd-flat-sbc":   () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 30,  pushrod: 65 }),
  "hyd-roller-sbc": () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 110, pushrod: 65 }),
  "sol-roller-sbc": () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 90,  pushrod: 65 }),
  // Pushrod LS: 110g intake (heavier), R=1.7, similar component weights
  "hyd-roller-ls":  () => effectiveMassPushrod({ valve: 110, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.7, lifter: 115, pushrod: 65 }),
  // BBC: 130g intake valve, R=1.7
  "hyd-flat-bbc":   () => effectiveMassPushrod({ valve: 130, retainer: 30, lock: 8, spring: 55, rocker: 100, R: 1.7, lifter: 30,  pushrod: 75 }),
  "hyd-roller-bbc": () => effectiveMassPushrod({ valve: 130, retainer: 30, lock: 8, spring: 55, rocker: 100, R: 1.7, lifter: 115, pushrod: 75 }),
  "sol-roller-bbc": () => effectiveMassPushrod({ valve: 130, retainer: 30, lock: 8, spring: 55, rocker: 100, R: 1.7, lifter: 95,  pushrod: 75 }),
  // SBF: lighter valves, R=1.6 for roller cams
  "hyd-flat-sbf":   () => effectiveMassPushrod({ valve: 95,  retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 30,  pushrod: 65 }),
  "hyd-roller-sbf": () => effectiveMassPushrod({ valve: 95,  retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.6, lifter: 110, pushrod: 65 }),
  "sol-roller-sbf": () => effectiveMassPushrod({ valve: 95,  retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.6, lifter: 90,  pushrod: 65 }),
  // Pontiac / Mopar: ~105g valves like SBC
  "hyd-flat-misc":  () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 30,  pushrod: 65 }),
  "hyd-roller-misc":() => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 110, pushrod: 65 }),
  // DOHC bucket Coyote-style: light valve, no rocker
  "DOHC-bucket":    () => effectiveMassBucket({ valve: 55, retainer: 10, lock: 4, spring: 30, bucket: 28, shim: 4 }),
};

function pickPreset(refCamType, application) {
  const app = application.toLowerCase();
  const suffix = app.includes("ls")    ? "ls"
              : app.includes("bbc")    ? "bbc"
              : app.includes("sbf") || app.includes("ford") || app.includes("coyote") ? "sbf"
              : app.includes("sbc") || app.includes("chevy") || app.includes("gm") ? "sbc"
              : "misc";
  const key = `${refCamType}-${suffix}`;
  if (MASS_PRESETS[key]) return key;
  // Fallbacks
  if (MASS_PRESETS[`${refCamType}-sbc`]) return `${refCamType}-sbc`;
  if (MASS_PRESETS[refCamType])           return refCamType;
  return null;
}

// ── Reference dataset (inlined — mirrors src/data/valvetrainReferenceBuilds.ts) ──
// Only includes rows with full spring data (need openLbs to estimate float RPM).

const REFS = [
  // COMP LS
  { mfr: "COMP", camPN: "54-455-11", camType: "hyd-roller", lift: 0.604, dur: 215, open: 367, maxRpm: 6500, app: "LS1/LS6" },
  { mfr: "COMP", camPN: "54-458-11", camType: "hyd-roller", lift: 0.614, dur: 227, open: 367, maxRpm: 7000, app: "LS1/LS2/LS6" },
  { mfr: "COMP", camPN: "54-459-11", camType: "hyd-roller", lift: 0.617, dur: 231, open: 367, maxRpm: 7000, app: "LS1/LS2/LS6" },
  { mfr: "COMP", camPN: "54-470-11", camType: "hyd-roller", lift: 0.621, dur: 235, open: 470, maxRpm: 7000, app: "LS3/L92/LS7" },
  { mfr: "COMP", camPN: "54-471-11", camType: "hyd-roller", lift: 0.624, dur: 239, open: 470, maxRpm: 7200, app: "LS3/L92" },
  { mfr: "COMP", camPN: "54-702-11", camType: "hyd-roller", lift: 0.553, dur: 226, open: 367, maxRpm: 6600, app: "LS truck" },
  { mfr: "COMP", camPN: "54-330-11", camType: "hyd-roller", lift: 0.598, dur: 223, open: 405, maxRpm: 7400, app: "LS turbo" },
  // COMP SBC flat tappet
  { mfr: "COMP", camPN: "12-242-2", camType: "hyd-flat", lift: 0.477, dur: 224, open: 273, maxRpm: 5800, app: "SBC" },
  { mfr: "COMP", camPN: "12-246-3", camType: "hyd-flat", lift: 0.490, dur: 230, open: 343, maxRpm: 6000, app: "SBC" },
  { mfr: "COMP", camPN: "12-250-3", camType: "hyd-flat", lift: 0.507, dur: 240, open: 355, maxRpm: 6500, app: "SBC" },
  { mfr: "COMP", camPN: "12-211-2", camType: "hyd-flat", lift: 0.470, dur: 224, open: 273, maxRpm: 5800, app: "SBC" },
  { mfr: "COMP", camPN: "12-326-4", camType: "hyd-flat", lift: 0.490, dur: 236, open: 355, maxRpm: 6200, app: "SBC" },
  { mfr: "COMP", camPN: "12-602-4", camType: "hyd-flat", lift: 0.522, dur: 243, open: 355, maxRpm: 6200, app: "SBC" },
  { mfr: "COMP", camPN: "12-600-4", camType: "hyd-flat", lift: 0.498, dur: 227, open: 273, maxRpm: 5600, app: "SBC" },
  // COMP SBC retrofit hyd-roller
  { mfr: "COMP", camPN: "08-432-8", camType: "hyd-roller", lift: 0.510, dur: 230, open: 357, maxRpm: 5800, app: "SBC retrofit" },
  { mfr: "COMP", camPN: "08-422-8", camType: "hyd-roller", lift: 0.495, dur: 218, open: 357, maxRpm: 5500, app: "SBC retrofit" },
  { mfr: "COMP", camPN: "08-443-8", camType: "hyd-roller", lift: 0.540, dur: 248, open: 367, maxRpm: 6100, app: "SBC retrofit" },
  // COMP BBC
  { mfr: "COMP", camPN: "11-433-8", camType: "hyd-roller", lift: 0.510, dur: 236, open: 367, maxRpm: 6000, app: "BBC" },
  { mfr: "COMP", camPN: "11-450-8", camType: "hyd-roller", lift: 0.578, dur: 230, open: 367, maxRpm: 6200, app: "BBC" },
  { mfr: "COMP", camPN: "11-770-8", camType: "sol-roller", lift: 0.639, dur: 236, open: 358, maxRpm: 6200, app: "BBC" },
  { mfr: "COMP", camPN: "11-601-4", camType: "hyd-flat",   lift: 0.510, dur: 235, open: 355, maxRpm: 5900, app: "BBC" },
  { mfr: "COMP", camPN: "11-602-4", camType: "hyd-flat",   lift: 0.522, dur: 243, open: 355, maxRpm: 6200, app: "BBC" },
  { mfr: "COMP", camPN: "11-318-4", camType: "hyd-flat",   lift: 0.556, dur: 244, open: 355, maxRpm: 6200, app: "BBC" },
  // COMP SBF
  { mfr: "COMP", camPN: "31-238-3", camType: "hyd-flat",   lift: 0.493, dur: 218, open: 273, maxRpm: 5600, app: "SBF" },
  { mfr: "COMP", camPN: "35-349-8", camType: "hyd-roller", lift: 0.512, dur: 212, open: 367, maxRpm: 5500, app: "SBF EFI" },
  { mfr: "COMP", camPN: "51-423-11", camType: "hyd-roller", lift: 0.552, dur: 224, open: 367, maxRpm: 5600, app: "Pontiac" },
  { mfr: "COMP", camPN: "20-223-3",  camType: "hyd-flat",   lift: 0.477, dur: 224, open: 273, maxRpm: 5800, app: "Mopar" },

  // Lunati
  { mfr: "Lunati", camPN: "10120701", camType: "hyd-flat", lift: 0.454, dur: 213, open: 339, maxRpm: 5500, app: "SBC" },
  { mfr: "Lunati", camPN: "10120702", camType: "hyd-flat", lift: 0.468, dur: 219, open: 339, maxRpm: 5700, app: "SBC" },
  { mfr: "Lunati", camPN: "10120703", camType: "hyd-flat", lift: 0.489, dur: 227, open: 339, maxRpm: 6200, app: "SBC" },
  { mfr: "Lunati", camPN: "10120102LK", camType: "hyd-flat", lift: 0.465, dur: 224, open: 339, maxRpm: 6000, app: "SBC" },
  { mfr: "Lunati", camPN: "10110701", camType: "hyd-flat", lift: 0.515, dur: 230, open: 339, maxRpm: 5500, app: "BBC" },
  { mfr: "Lunati", camPN: "10110703", camType: "hyd-flat", lift: 0.547, dur: 235, open: 339, maxRpm: 6200, app: "BBC" },
  { mfr: "Lunati", camPN: "10510703", camType: "hyd-flat", lift: 0.489, dur: 227, open: 339, maxRpm: 5800, app: "Pontiac" },
  { mfr: "Lunati", camPN: "20510712", camType: "hyd-roller", lift: 0.535, dur: 231, open: 400, maxRpm: 6200, app: "BBC" },
  { mfr: "Lunati", camPN: "20540712", camType: "hyd-roller", lift: 0.599, dur: 231, open: 400, maxRpm: 7000, app: "LS" },
  { mfr: "Lunati", camPN: "20540716", camType: "hyd-roller", lift: 0.625, dur: 219, open: 400, maxRpm: 6400, app: "LS" },

  // Trick Flow
  { mfr: "TrickFlow", camPN: "K525-432-370", camType: "hyd-roller", lift: 0.499, dur: 221, open: 360, maxRpm: 5500, app: "SBF kit" },
  { mfr: "TrickFlow", camPN: "K514-360350B", camType: "hyd-roller", lift: 0.499, dur: 221, open: 313, maxRpm: 5500, app: "SBF kit" },
  { mfr: "TrickFlow", camPN: "K326-580-520", camType: "hyd-roller", lift: 0.625, dur: 230, open: 425, maxRpm: 6800, app: "LS3 kit" },

  // Howards
  { mfr: "Howards", camPN: "180245-10",   camType: "hyd-roller", lift: 0.512, dur: 215, open: 350, maxRpm: 5400, app: "SBC OE" },
  { mfr: "Howards", camPN: "CL180525-10", camType: "hyd-roller", lift: 0.560, dur: 227, open: 350, maxRpm: 6100, app: "SBC OE" },
  { mfr: "Howards", camPN: "CL186115-10", camType: "hyd-roller", lift: 0.600, dur: 230, open: 350, maxRpm: 6400, app: "SBC OE" },
  { mfr: "Howards", camPN: "CL110245-12", camType: "hyd-roller", lift: 0.525, dur: 225, open: 350, maxRpm: 6000, app: "SBC retrofit" },
  { mfr: "Howards", camPN: "CL111655-10", camType: "hyd-roller", lift: 0.600, dur: 243, open: 350, maxRpm: 6500, app: "SBC retrofit" },
  { mfr: "Howards", camPN: "120245-12",   camType: "hyd-roller", lift: 0.567, dur: 224, open: 350, maxRpm: 5400, app: "BBC retrofit" },
  { mfr: "Howards", camPN: "120405-12",   camType: "hyd-roller", lift: 0.524, dur: 218, open: 350, maxRpm: 6400, app: "BBC OE" },
];

// ── Run validation ──

const SAFETY_FACTORS = { race: 1.00, verified: 1.15, conservative: 1.30 };

const rows = [];

for (const ref of REFS) {
  const presetKey = pickPreset(ref.camType, ref.app);
  if (!presetKey) {
    console.warn(`No mass preset for ${ref.mfr} ${ref.camPN} (${ref.camType}, ${ref.app})`);
    continue;
  }
  const mass = MASS_PRESETS[presetKey]();
  const agg  = AGG[ref.camType];

  const result = { ref, mass: Math.round(mass) };
  for (const [name, sf] of Object.entries(SAFETY_FACTORS)) {
    const calcRPM = estimateValveFloatRPM(ref.open, mass, ref.lift, ref.dur, agg, sf);
    result[name] = calcRPM;
    result[`${name}_pct`] = ((calcRPM - ref.maxRpm) / ref.maxRpm) * 100;
  }
  rows.push(result);
}

// ── Print summary table ──

console.log("\nValvetrain calculator vs. manufacturer-published RPM");
console.log("=".repeat(110));
console.log("calc_rpm @ safety factor — should be NEAR (within ±10%) the manufacturer's published RPM ceiling\n");

const header = ["mfr/cam", "type", "lift", "dur", "open", "mass", "mfr_rpm", "race(1.00)", "verified(1.15)", "conserv(1.30)"];
console.log(header.map(h => h.padEnd(13)).join(""));
console.log("-".repeat(110));

for (const r of rows) {
  const sign = (n) => (n >= 0 ? `+${n.toFixed(0)}` : `${n.toFixed(0)}`);
  const fmt = (rpm, pct) => `${rpm} (${sign(pct)}%)`;
  console.log(
    [
      `${r.ref.mfr.slice(0, 4)} ${r.ref.camPN}`,
      r.ref.camType,
      r.ref.lift.toFixed(3),
      String(r.ref.dur),
      String(r.ref.open),
      String(r.mass),
      String(r.ref.maxRpm),
      fmt(r.race, r.race_pct),
      fmt(r.verified, r.verified_pct),
      fmt(r.conservative, r.conservative_pct),
    ].map(s => s.padEnd(13)).join("")
  );
}

// ── Aggregate stats per safety factor ──

console.log("\n" + "=".repeat(110));
console.log("Aggregate accuracy (median absolute % deviation from mfr's published RPM):");
for (const sf of ["race", "verified", "conservative"]) {
  const deltas = rows.map(r => r[`${sf}_pct`]).sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];
  const meanAbs = deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length;
  const over    = deltas.filter(d => d > 0).length;
  const under   = deltas.filter(d => d < 0).length;
  console.log(`  ${sf.padEnd(14)} median delta: ${median >= 0 ? "+" : ""}${median.toFixed(1)}%   mean |delta|: ${meanAbs.toFixed(1)}%   ${over} rows over mfr RPM, ${under} under  (n=${rows.length})`);
}
console.log("\nGoal: median delta closest to 0% is the best default safety factor.\n");
