#!/usr/bin/env node
/**
 * Pressure-direction validation: for each manufacturer reference combo,
 * ask "at the mfr's published max RPM with the published cam, what open
 * pressure does our calc recommend?" — and compare to the open pressure
 * of the spring the mfr actually pairs with that cam.
 *
 * If our calc says "you need 600 lbs" but the mfr pairs the cam with a
 * 1000-lb spring at the same RPM, the calc is under-recommending.
 */

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

function effectiveMassPushrod({ valve, retainer, lock, spring, rocker, R, lifter, pushrod }) {
  const R2 = R * R;
  return valve + retainer + lock + spring * (1/3)
       + rocker * (1/3) * R2
       + (lifter + pushrod * (1/3)) / R2;
}

const AGG = {
  "hyd-flat":     0.35,
  "hyd-roller":   0.55,
  "sol-flat":     0.50,
  "sol-roller":   0.75,
  "DOHC-bucket":  0.68,
};

const MASS_PRESETS = {
  "hyd-flat-sbc":   () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 30,  pushrod: 65 }),
  "hyd-roller-sbc": () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 110, pushrod: 65 }),
  "sol-roller-sbc": () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 90,  pushrod: 65 }),
  "hyd-roller-ls":  () => effectiveMassPushrod({ valve: 110, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.7, lifter: 115, pushrod: 65 }),
  "hyd-flat-bbc":   () => effectiveMassPushrod({ valve: 130, retainer: 30, lock: 8, spring: 55, rocker: 100, R: 1.7, lifter: 30,  pushrod: 75 }),
  "hyd-roller-bbc": () => effectiveMassPushrod({ valve: 130, retainer: 30, lock: 8, spring: 55, rocker: 100, R: 1.7, lifter: 115, pushrod: 75 }),
  "sol-roller-bbc": () => effectiveMassPushrod({ valve: 130, retainer: 30, lock: 8, spring: 55, rocker: 100, R: 1.7, lifter: 95,  pushrod: 75 }),
  "hyd-flat-sbf":   () => effectiveMassPushrod({ valve: 95,  retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 30,  pushrod: 65 }),
  "hyd-roller-sbf": () => effectiveMassPushrod({ valve: 95,  retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.6, lifter: 110, pushrod: 65 }),
  "hyd-flat-misc":  () => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 30,  pushrod: 65 }),
  "hyd-roller-misc":() => effectiveMassPushrod({ valve: 105, retainer: 28, lock: 8, spring: 55, rocker: 95, R: 1.5, lifter: 110, pushrod: 65 }),
};

function pickPreset(refCamType, application) {
  const app = application.toLowerCase();
  const suffix = app.includes("ls")    ? "ls"
              : app.includes("bbc")    ? "bbc"
              : app.includes("sbf") || app.includes("ford") ? "sbf"
              : app.includes("sbc") || app.includes("chevy") ? "sbc"
              : "misc";
  const key = `${refCamType}-${suffix}`;
  if (MASS_PRESETS[key]) return key;
  if (MASS_PRESETS[`${refCamType}-sbc`]) return `${refCamType}-sbc`;
  return null;
}

const REFS = [
  { mfr: "COMP", camPN: "54-455-11", camType: "hyd-roller", lift: 0.604, dur: 215, open: 367, maxRpm: 6500, app: "LS1/LS6" },
  { mfr: "COMP", camPN: "54-458-11", camType: "hyd-roller", lift: 0.614, dur: 227, open: 367, maxRpm: 7000, app: "LS1/LS2/LS6" },
  { mfr: "COMP", camPN: "54-459-11", camType: "hyd-roller", lift: 0.617, dur: 231, open: 367, maxRpm: 7000, app: "LS1/LS2/LS6" },
  { mfr: "COMP", camPN: "54-470-11", camType: "hyd-roller", lift: 0.621, dur: 235, open: 470, maxRpm: 7000, app: "LS3/L92/LS7" },
  { mfr: "COMP", camPN: "54-471-11", camType: "hyd-roller", lift: 0.624, dur: 239, open: 470, maxRpm: 7200, app: "LS3/L92" },
  { mfr: "COMP", camPN: "54-702-11", camType: "hyd-roller", lift: 0.553, dur: 226, open: 367, maxRpm: 6600, app: "LS truck" },
  { mfr: "COMP", camPN: "54-330-11", camType: "hyd-roller", lift: 0.598, dur: 223, open: 405, maxRpm: 7400, app: "LS turbo" },
  { mfr: "COMP", camPN: "12-242-2", camType: "hyd-flat", lift: 0.477, dur: 224, open: 273, maxRpm: 5800, app: "SBC" },
  { mfr: "COMP", camPN: "12-246-3", camType: "hyd-flat", lift: 0.490, dur: 230, open: 343, maxRpm: 6000, app: "SBC" },
  { mfr: "COMP", camPN: "12-250-3", camType: "hyd-flat", lift: 0.507, dur: 240, open: 355, maxRpm: 6500, app: "SBC" },
  { mfr: "COMP", camPN: "12-211-2", camType: "hyd-flat", lift: 0.470, dur: 224, open: 273, maxRpm: 5800, app: "SBC" },
  { mfr: "COMP", camPN: "12-326-4", camType: "hyd-flat", lift: 0.490, dur: 236, open: 355, maxRpm: 6200, app: "SBC" },
  { mfr: "COMP", camPN: "12-602-4", camType: "hyd-flat", lift: 0.522, dur: 243, open: 355, maxRpm: 6200, app: "SBC" },
  { mfr: "COMP", camPN: "12-600-4", camType: "hyd-flat", lift: 0.498, dur: 227, open: 273, maxRpm: 5600, app: "SBC" },
  { mfr: "COMP", camPN: "08-432-8", camType: "hyd-roller", lift: 0.510, dur: 230, open: 357, maxRpm: 5800, app: "SBC retrofit" },
  { mfr: "COMP", camPN: "08-422-8", camType: "hyd-roller", lift: 0.495, dur: 218, open: 357, maxRpm: 5500, app: "SBC retrofit" },
  { mfr: "COMP", camPN: "08-443-8", camType: "hyd-roller", lift: 0.540, dur: 248, open: 367, maxRpm: 6100, app: "SBC retrofit" },
  { mfr: "COMP", camPN: "11-433-8", camType: "hyd-roller", lift: 0.510, dur: 236, open: 367, maxRpm: 6000, app: "BBC" },
  { mfr: "COMP", camPN: "11-450-8", camType: "hyd-roller", lift: 0.578, dur: 230, open: 367, maxRpm: 6200, app: "BBC" },
  { mfr: "COMP", camPN: "11-770-8", camType: "sol-roller", lift: 0.639, dur: 236, open: 358, maxRpm: 6200, app: "BBC" },
  { mfr: "COMP", camPN: "11-601-4", camType: "hyd-flat",   lift: 0.510, dur: 235, open: 355, maxRpm: 5900, app: "BBC" },
  { mfr: "COMP", camPN: "11-602-4", camType: "hyd-flat",   lift: 0.522, dur: 243, open: 355, maxRpm: 6200, app: "BBC" },
  { mfr: "COMP", camPN: "11-318-4", camType: "hyd-flat",   lift: 0.556, dur: 244, open: 355, maxRpm: 6200, app: "BBC" },
  { mfr: "COMP", camPN: "31-238-3", camType: "hyd-flat",   lift: 0.493, dur: 218, open: 273, maxRpm: 5600, app: "SBF" },
  { mfr: "COMP", camPN: "35-349-8", camType: "hyd-roller", lift: 0.512, dur: 212, open: 367, maxRpm: 5500, app: "SBF EFI" },
  { mfr: "COMP", camPN: "51-423-11", camType: "hyd-roller", lift: 0.552, dur: 224, open: 367, maxRpm: 5600, app: "Pontiac" },
  { mfr: "COMP", camPN: "20-223-3",  camType: "hyd-flat",   lift: 0.477, dur: 224, open: 273, maxRpm: 5800, app: "Mopar" },
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
  { mfr: "TrickFlow", camPN: "K525-432-370", camType: "hyd-roller", lift: 0.499, dur: 221, open: 360, maxRpm: 5500, app: "SBF kit" },
  { mfr: "TrickFlow", camPN: "K514-360350B", camType: "hyd-roller", lift: 0.499, dur: 221, open: 313, maxRpm: 5500, app: "SBF kit" },
  { mfr: "TrickFlow", camPN: "K326-580-520", camType: "hyd-roller", lift: 0.625, dur: 230, open: 425, maxRpm: 6800, app: "LS3 kit" },
  { mfr: "Howards", camPN: "180245-10",   camType: "hyd-roller", lift: 0.512, dur: 215, open: 350, maxRpm: 5400, app: "SBC OE" },
  { mfr: "Howards", camPN: "CL180525-10", camType: "hyd-roller", lift: 0.560, dur: 227, open: 350, maxRpm: 6100, app: "SBC OE" },
  { mfr: "Howards", camPN: "CL186115-10", camType: "hyd-roller", lift: 0.600, dur: 230, open: 350, maxRpm: 6400, app: "SBC OE" },
  { mfr: "Howards", camPN: "CL110245-12", camType: "hyd-roller", lift: 0.525, dur: 225, open: 350, maxRpm: 6000, app: "SBC retrofit" },
  { mfr: "Howards", camPN: "CL111655-10", camType: "hyd-roller", lift: 0.600, dur: 243, open: 350, maxRpm: 6500, app: "SBC retrofit" },
  { mfr: "Howards", camPN: "120245-12",   camType: "hyd-roller", lift: 0.567, dur: 224, open: 350, maxRpm: 5400, app: "BBC retrofit" },
  { mfr: "Howards", camPN: "120405-12",   camType: "hyd-roller", lift: 0.524, dur: 218, open: 350, maxRpm: 6400, app: "BBC OE" },
];

const SAFETY_FACTORS = { race: 1.50, verified: 1.80, conservative: 2.30 };

const rows = [];
for (const ref of REFS) {
  const presetKey = pickPreset(ref.camType, ref.app);
  if (!presetKey) continue;
  const mass = MASS_PRESETS[presetKey]();
  const agg  = AGG[ref.camType];

  const result = { ref, mass: Math.round(mass) };
  for (const [name, sf] of Object.entries(SAFETY_FACTORS)) {
    const calcOpen = Math.round(requiredOpenPressure(mass, ref.maxRpm, ref.lift, ref.dur, agg, sf));
    result[name] = calcOpen;
    result[`${name}_pct`] = ((calcOpen - ref.open) / ref.open) * 100;
  }
  rows.push(result);
}

console.log("\nValvetrain calculator — REQUIRED OPEN PRESSURE vs. manufacturer's paired-spring open pressure");
console.log("=".repeat(125));
console.log("At the mfr's published max RPM and cam, what open pressure does our calc want? vs. what spring mfr actually pairs?\n");

const header = ["mfr/cam", "type", "lift", "dur", "rpm", "mass", "mfr_open", "race(1.00)", "verified(1.15)", "conserv(1.30)"];
console.log(header.map(h => h.padEnd(13)).join(""));
console.log("-".repeat(125));

for (const r of rows) {
  const sign = (n) => (n >= 0 ? `+${n.toFixed(0)}` : `${n.toFixed(0)}`);
  const fmt = (lbs, pct) => `${lbs} (${sign(pct)}%)`;
  console.log(
    [
      `${r.ref.mfr.slice(0, 4)} ${r.ref.camPN}`,
      r.ref.camType,
      r.ref.lift.toFixed(3),
      String(r.ref.dur),
      String(r.ref.maxRpm),
      String(r.mass),
      String(r.ref.open),
      fmt(r.race, r.race_pct),
      fmt(r.verified, r.verified_pct),
      fmt(r.conservative, r.conservative_pct),
    ].map(s => s.padEnd(13)).join("")
  );
}

console.log("\n" + "=".repeat(125));
console.log("Aggregate: how far off is the calc's open-pressure recommendation from what mfr actually pairs?");
for (const sf of ["race", "verified", "conservative"]) {
  const deltas = rows.map(r => r[`${sf}_pct`]).sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];
  const meanAbs = deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length;
  const under = deltas.filter(d => d < 0).length;
  const overUnder30 = deltas.filter(d => Math.abs(d) > 30).length;
  console.log(`  ${sf.padEnd(14)} median delta: ${median >= 0 ? "+" : ""}${median.toFixed(1)}%   mean |delta|: ${meanAbs.toFixed(1)}%   ${under}/${rows.length} rows UNDER-recommend   ${overUnder30}/${rows.length} rows ±>30% off`);
}
console.log("\nA negative % means calc UNDER-recommends spring pressure (the user's friend's problem).");
console.log("Goal: median near 0%, low fraction of UNDER-recommend rows.\n");
