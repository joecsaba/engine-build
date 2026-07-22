// ─── Camshaft database ──────────────────────────────────────────────────────
// Real, published cam specs from major manufacturers, used by the Cam Selector
// to surface shoppable grinds near the recommended spec.
//
// ACCURACY POLICY: every entry's duration @0.050", LSA, lift, and part number
// were pulled from a real manufacturer or retailer spec page. Cams whose
// @0.050" duration or LSA could not be verified were excluded (those two fields
// drive the matcher). Lift is at the platform's standard rocker ratio
// (SBC 1.5, BBC 1.7, Ford 1.6, LS 1.7). Specs and part numbers change — always
// confirm current data with the manufacturer before ordering. Sourced Jul 2026
// from cspracing.com, howardscams.com, winnerscircle.com, precisionintl.com,
// butlerperformance.com, thmotorsports.com, poormanmotorsports.com, and
// manufacturer listings.

export type CamPlatform = "sbc" | "ls" | "bbc" | "sbf";
export type CamLifter = "hyd_flat" | "hyd_roller" | "solid_flat" | "solid_roller";

export interface CamSpec {
  mfr: string;
  family: string;
  part: string;
  platform: CamPlatform;
  lifter: CamLifter;
  int050: number;
  exh050: number;
  liftInt: number;
  liftExh: number;
  lsa: number;
  rpmLo: number;
  rpmHi: number;
  use: string;
}

export const CAM_DATABASE: CamSpec[] = [
  // ── COMP Cams — SBC ──────────────────────────────────────────────────────
  { mfr: "COMP Cams", family: "High Energy 260H",   part: "12-206-2", platform: "sbc", lifter: "hyd_flat", int050: 212, exh050: 212, liftInt: 0.440, liftExh: 0.440, lsa: 110, rpmLo: 1200, rpmHi: 5200, use: "Economy / RV / towing" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE262H", part: "12-238-2", platform: "sbc", lifter: "hyd_flat", int050: 218, exh050: 224, liftInt: 0.462, liftExh: 0.469, lsa: 110, rpmLo: 1300, rpmHi: 5600, use: "Mild street" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE268H", part: "12-242-2", platform: "sbc", lifter: "hyd_flat", int050: 224, exh050: 230, liftInt: 0.477, liftExh: 0.480, lsa: 110, rpmLo: 1600, rpmHi: 5800, use: "Street performance" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE274H", part: "12-246-3", platform: "sbc", lifter: "hyd_flat", int050: 230, exh050: 236, liftInt: 0.487, liftExh: 0.490, lsa: 110, rpmLo: 1800, rpmHi: 6000, use: "Street performance" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE284H", part: "12-250-3", platform: "sbc", lifter: "hyd_flat", int050: 240, exh050: 246, liftInt: 0.507, liftExh: 0.510, lsa: 110, rpmLo: 2300, rpmHi: 6500, use: "Street / strip" },
  { mfr: "COMP Cams", family: "Magnum 280H",         part: "12-212-2", platform: "sbc", lifter: "hyd_flat", int050: 230, exh050: 230, liftInt: 0.480, liftExh: 0.480, lsa: 110, rpmLo: 2000, rpmHi: 6000, use: "Street / strip" },
  { mfr: "COMP Cams", family: "Magnum 292H",         part: "12-213-3", platform: "sbc", lifter: "hyd_flat", int050: 244, exh050: 244, liftInt: 0.501, liftExh: 0.501, lsa: 110, rpmLo: 2500, rpmHi: 6500, use: "Street / strip (rough idle)" },
  { mfr: "COMP Cams", family: "Thumpr",              part: "12-600-4", platform: "sbc", lifter: "hyd_flat", int050: 227, exh050: 241, liftInt: 0.479, liftExh: 0.465, lsa: 107, rpmLo: 2000, rpmHi: 5800, use: "Street (thumpy idle)" },
  { mfr: "COMP Cams", family: "Mutha' Thumpr",       part: "12-601-4", platform: "sbc", lifter: "hyd_flat", int050: 235, exh050: 249, liftInt: 0.489, liftExh: 0.476, lsa: 107, rpmLo: 2200, rpmHi: 6100, use: "Street / strip" },
  { mfr: "COMP Cams", family: "Big Mutha' Thumpr",   part: "12-602-4", platform: "sbc", lifter: "hyd_flat", int050: 243, exh050: 257, liftInt: 0.500, liftExh: 0.486, lsa: 107, rpmLo: 2500, rpmHi: 6400, use: "Street / strip (very rough idle)" },
  // ── COMP Cams — BBC ──────────────────────────────────────────────────────
  { mfr: "COMP Cams", family: "Xtreme Energy XE268H", part: "11-242-3", platform: "bbc", lifter: "hyd_flat", int050: 224, exh050: 230, liftInt: 0.515, liftExh: 0.520, lsa: 110, rpmLo: 1600, rpmHi: 5800, use: "Street performance" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE274H", part: "11-246-3", platform: "bbc", lifter: "hyd_flat", int050: 230, exh050: 236, liftInt: 0.552, liftExh: 0.555, lsa: 110, rpmLo: 1800, rpmHi: 6000, use: "Street performance" },
  // ── COMP Cams — SBF ──────────────────────────────────────────────────────
  { mfr: "COMP Cams", family: "Xtreme Energy XE262H (351W)", part: "35-238-3", platform: "sbf", lifter: "hyd_flat", int050: 218, exh050: 224, liftInt: 0.493, liftExh: 0.500, lsa: 110, rpmLo: 1300, rpmHi: 5600, use: "Mild street (351W)" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE264HR (5.0L)", part: "35-349-8", platform: "sbf", lifter: "hyd_roller", int050: 212, exh050: 218, liftInt: 0.512, liftExh: 0.512, lsa: 114, rpmLo: 1500, rpmHi: 5500, use: "Mild street (5.0L roller)" },
  // ── COMP Cams — LS ───────────────────────────────────────────────────────
  { mfr: "COMP Cams", family: "XFI Xtreme Truck HR15", part: "54-450-11", platform: "ls", lifter: "hyd_roller", int050: 206, exh050: 212, liftInt: 0.513, liftExh: 0.520, lsa: 115, rpmLo: 800, rpmHi: 5000, use: "Truck / towing" },
  { mfr: "COMP Cams", family: "XFI RPM XR265HR",     part: "54-424-11", platform: "ls", lifter: "hyd_roller", int050: 212, exh050: 218, liftInt: 0.558, liftExh: 0.563, lsa: 115, rpmLo: 1400, rpmHi: 6700, use: "Street performance" },
  { mfr: "COMP Cams", family: "XFI RPM XR275HR",     part: "54-426-11", platform: "ls", lifter: "hyd_roller", int050: 222, exh050: 224, liftInt: 0.566, liftExh: 0.568, lsa: 112, rpmLo: 1800, rpmHi: 6800, use: "Street / strip" },
  { mfr: "COMP Cams", family: "XFI 286R",            part: "54-502-11", platform: "ls", lifter: "solid_roller", int050: 251, exh050: 256, liftInt: 0.660, liftExh: 0.655, lsa: 113, rpmLo: 2400, rpmHi: 7000, use: "Race / high-RPM strip" },

  // ── Lunati — SBC ─────────────────────────────────────────────────────────
  { mfr: "Lunati", family: "Voodoo",                part: "60102",     platform: "sbc", lifter: "hyd_flat", int050: 219, exh050: 227, liftInt: 0.468, liftExh: 0.489, lsa: 112, rpmLo: 1400, rpmHi: 5800, use: "Mild street" },
  { mfr: "Lunati", family: "Voodoo",                part: "10120703",  platform: "sbc", lifter: "hyd_flat", int050: 227, exh050: 233, liftInt: 0.489, liftExh: 0.504, lsa: 110, rpmLo: 1800, rpmHi: 6200, use: "Street / strip" },
  // ── Lunati — BBC ─────────────────────────────────────────────────────────
  { mfr: "Lunati", family: "Voodoo",                part: "10110705LK", platform: "bbc", lifter: "hyd_flat", int050: 241, exh050: 249, liftInt: 0.572, liftExh: 0.590, lsa: 110, rpmLo: 2500, rpmHi: 6600, use: "Hot street / bracket" },
  // ── Lunati — SBF ─────────────────────────────────────────────────────────
  { mfr: "Lunati", family: "Voodoo",                part: "20350713",  platform: "sbf", lifter: "hyd_roller", int050: 241, exh050: 249, liftInt: 0.600, liftExh: 0.600, lsa: 110, rpmLo: 2800, rpmHi: 6600, use: "Serious street / strip (302/351W)" },
  // ── Lunati — LS ──────────────────────────────────────────────────────────
  { mfr: "Lunati", family: "Voodoo",                part: "20540715",  platform: "ls", lifter: "hyd_roller", int050: 237, exh050: 243, liftInt: 0.600, liftExh: 0.600, lsa: 113, rpmLo: 2600, rpmHi: 7200, use: "Street / strip LS" },
  { mfr: "Lunati", family: "Voodoo",                part: "20540716",  platform: "ls", lifter: "hyd_roller", int050: 219, exh050: 223, liftInt: 0.625, liftExh: 0.625, lsa: 112, rpmLo: 1800, rpmHi: 6400, use: "High-lift street LS" },

  // ── Crane Cams — SBC ─────────────────────────────────────────────────────
  { mfr: "Crane Cams", family: "PowerMax",          part: "119651",    platform: "sbc", lifter: "hyd_roller", int050: 240, exh050: 248, liftInt: 0.558, liftExh: 0.558, lsa: 110, rpmLo: 3500, rpmHi: 7000, use: "Hot street / strip roller" },
  { mfr: "Crane Cams", family: "Energizer",         part: "100052",    platform: "sbc", lifter: "hyd_flat", int050: 216, exh050: 216, liftInt: 0.454, liftExh: 0.454, lsa: 110, rpmLo: 1600, rpmHi: 5400, use: "Torque / mid-range" },
  { mfr: "Crane Cams", family: "Z-Series Z-262-2",  part: "113512",    platform: "sbc", lifter: "hyd_flat", int050: 212, exh050: 218, liftInt: 0.446, liftExh: 0.459, lsa: 114, rpmLo: 1600, rpmHi: 5400, use: "Mild street" },
  // ── Crane Cams — BBC ─────────────────────────────────────────────────────
  { mfr: "Crane Cams", family: "PowerMax H-286-2",  part: "134241",    platform: "bbc", lifter: "hyd_flat", int050: 226, exh050: 236, liftInt: 0.534, liftExh: 0.553, lsa: 112, rpmLo: 2500, rpmHi: 5500, use: "Street / strip torque" },
  { mfr: "Crane Cams", family: "PowerMax H-272-2",  part: "133942",    platform: "bbc", lifter: "hyd_flat", int050: 216, exh050: 228, liftInt: 0.515, liftExh: 0.510, lsa: 112, rpmLo: 2000, rpmHi: 5000, use: "Street / mild perf" },

  // ── Howards Cams — SBC ───────────────────────────────────────────────────
  { mfr: "Howards Cams", family: "Rattler",         part: "118001-09", platform: "sbc", lifter: "hyd_flat", int050: 227, exh050: 235, liftInt: 0.480, liftExh: 0.488, lsa: 109, rpmLo: 1800, rpmHi: 5600, use: "Choppy idle, throttle response" },
  { mfr: "Howards Cams", family: "Big Daddy Rattler", part: "118085-09", platform: "sbc", lifter: "hyd_roller", int050: 243, exh050: 251, liftInt: 0.530, liftExh: 0.515, lsa: 109, rpmLo: 2400, rpmHi: 6200, use: "Rough idle, street / strip" },
  { mfr: "Howards Cams", family: "Retro-Fit HR",    part: "110245-12", platform: "sbc", lifter: "hyd_roller", int050: 225, exh050: 231, liftInt: 0.500, liftExh: 0.510, lsa: 112, rpmLo: 1800, rpmHi: 5400, use: "Street & mild perf" },
  { mfr: "Howards Cams", family: "Retro-Fit HR",    part: "110355-10", platform: "sbc", lifter: "hyd_roller", int050: 251, exh050: 257, liftInt: 0.555, liftExh: 0.555, lsa: 110, rpmLo: 3000, rpmHi: 6800, use: "Rough idle, top-end" },
  // ── Howards Cams — BBC ───────────────────────────────────────────────────
  { mfr: "Howards Cams", family: "Retro-Fit HR",    part: "120245-12", platform: "bbc", lifter: "hyd_roller", int050: 225, exh050: 231, liftInt: 0.567, liftExh: 0.578, lsa: 112, rpmLo: 1800, rpmHi: 5400, use: "Street / mild perf" },
  // ── Howards Cams — LS ────────────────────────────────────────────────────
  { mfr: "Howards Cams", family: "Rattler",         part: "198035-09", platform: "ls", lifter: "hyd_roller", int050: 226, exh050: 234, liftInt: 0.525, liftExh: 0.525, lsa: 109, rpmLo: 2200, rpmHi: 6500, use: "Choppy idle, HP street" },
  { mfr: "Howards Cams", family: "American Muscle", part: "197715-10", platform: "ls", lifter: "hyd_roller", int050: 226, exh050: 236, liftInt: 0.525, liftExh: 0.525, lsa: 110, rpmLo: 2000, rpmHi: 7400, use: "GM ASA-style street / resto" },

  // ── Edelbrock — SBC ──────────────────────────────────────────────────────
  { mfr: "Edelbrock", family: "Performer-Plus",     part: "2102",      platform: "sbc", lifter: "hyd_flat", int050: 204, exh050: 214, liftInt: 0.420, liftExh: 0.442, lsa: 112, rpmLo: 800, rpmHi: 5500, use: "Smooth idle, daily driver" },
  { mfr: "Edelbrock", family: "Performer RPM",      part: "7102",      platform: "sbc", lifter: "hyd_flat", int050: 234, exh050: 244, liftInt: 0.488, liftExh: 0.510, lsa: 112, rpmLo: 1500, rpmHi: 6500, use: "Street / strip, RPM manifold" },
  // ── Edelbrock — SBF ──────────────────────────────────────────────────────
  { mfr: "Edelbrock", family: "Performer RPM",      part: "7122",      platform: "sbf", lifter: "hyd_flat", int050: 224, exh050: 234, liftInt: 0.496, liftExh: 0.520, lsa: 112, rpmLo: 1500, rpmHi: 6500, use: "Street / strip (289/302)" },

  // ── Summit Racing — SBC ──────────────────────────────────────────────────
  { mfr: "Summit Racing", family: "Classic",        part: "SUM-1102",  platform: "sbc", lifter: "hyd_flat", int050: 204, exh050: 214, liftInt: 0.421, liftExh: 0.444, lsa: 112, rpmLo: 1500, rpmHi: 4800, use: "Smooth idle, towing" },
  { mfr: "Summit Racing", family: "Classic",        part: "SUM-1103",  platform: "sbc", lifter: "hyd_flat", int050: 214, exh050: 224, liftInt: 0.444, liftExh: 0.466, lsa: 112, rpmLo: 1800, rpmHi: 5000, use: "Fair idle, biggest w/ stock converter" },
  { mfr: "Summit Racing", family: "Classic",        part: "SUM-1105",  platform: "sbc", lifter: "hyd_flat", int050: 224, exh050: 234, liftInt: 0.466, liftExh: 0.487, lsa: 114, rpmLo: 2400, rpmHi: 6000, use: "Fair idle, strong mid-range" },
  { mfr: "Summit Racing", family: "Pro (Stage 3)",  part: "SUM-8802",  platform: "sbc", lifter: "hyd_roller", int050: 218, exh050: 227, liftInt: 0.525, liftExh: 0.520, lsa: 112, rpmLo: 1800, rpmHi: 6300, use: "Street / strip roller" },
];
