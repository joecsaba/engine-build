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

export type CamPlatform =
  | "sbc" | "ls" | "bbc" | "sbf"
  | "mopar_sb" | "mopar_bb" | "pontiac" | "cleveland" | "ford_385";
export type CamLifter = "hyd_flat" | "hyd_roller" | "solid_flat" | "solid_roller";

export interface CamSpec {
  mfr: string;
  family: string;
  part: string;
  platform: CamPlatform;
  lifter: CamLifter;
  int050: number;
  exh050: number | null;   // null = manufacturer doesn't publish it (e.g. BTR "24X")
  liftInt: number;
  liftExh: number;
  lsa: number;
  rpmLo: number | null;    // null = not published
  rpmHi: number | null;
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

  // ── LS-specific makers (cathedral/rectangle/truck, all hyd roller) ────────
  // Brian Tooley Racing — NA street/strip. BTR does not publish exhaust @.050"
  // (prints it as "24X"), so exh050 is null; intake @.050", lift, and LSA are
  // published. Lift at LS 1.7 rocker.
  { mfr: "Brian Tooley Racing", family: "Stage 2 NA V2 (LS1/LS2)", part: "BTR-LS1STAGE2", platform: "ls", lifter: "hyd_roller", int050: 221, exh050: null, liftInt: 0.624, liftExh: 0.635, lsa: 112, rpmLo: null, rpmHi: null, use: "Street / strip NA (cathedral)" },
  { mfr: "Brian Tooley Racing", family: "Stage 2 NA V2 (LS3/L92)", part: "BTR-LS3STAGE2", platform: "ls", lifter: "hyd_roller", int050: 221, exh050: null, liftInt: 0.619, liftExh: 0.617, lsa: 113, rpmLo: null, rpmHi: null, use: "Street / strip NA (rectangle)" },
  { mfr: "Brian Tooley Racing", family: "Stage 3 NA V2 (LS1/LS2)", part: "BTR-LS1STAGE3", platform: "ls", lifter: "hyd_roller", int050: 227, exh050: null, liftInt: 0.636, liftExh: 0.636, lsa: 112, rpmLo: null, rpmHi: null, use: "Street / strip NA, wants stall (cathedral)" },
  { mfr: "Brian Tooley Racing", family: "Stage 3 NA V2 (LS3/L92)", part: "BTR-LS3STAGE3", platform: "ls", lifter: "hyd_roller", int050: 227, exh050: null, liftInt: 0.636, liftExh: 0.636, lsa: 112, rpmLo: null, rpmHi: null, use: "Street / strip NA (rectangle)" },
  // Texas Speed & Performance — cathedral-port street/strip
  { mfr: "Texas Speed", family: "224/228",           part: "TSP-224228R6112", platform: "ls", lifter: "hyd_roller", int050: 224, exh050: 228, liftInt: 0.600, liftExh: 0.600, lsa: 112, rpmLo: 1500, rpmHi: 6600, use: "Street / strip (streetable boost)" },
  { mfr: "Texas Speed", family: "228/232",           part: "25-TSP228232",    platform: "ls", lifter: "hyd_roller", int050: 228, exh050: 232, liftInt: 0.600, liftExh: 0.600, lsa: 112, rpmLo: null, rpmHi: null, use: "Street / strip, ~2800 stall" },
  { mfr: "Texas Speed", family: "228R",              part: "TSP-228R6110",    platform: "ls", lifter: "hyd_roller", int050: 228, exh050: 228, liftInt: 0.600, liftExh: 0.600, lsa: 110, rpmLo: 1800, rpmHi: 6800, use: "Street / strip, 3200+ stall" },
  { mfr: "Texas Speed", family: "MS3 (Magic Stick 3)", part: "25-TSPMS3112",  platform: "ls", lifter: "hyd_roller", int050: 238, exh050: 242, liftInt: 0.600, liftExh: 0.600, lsa: 112, rpmLo: null, rpmHi: null, use: "Street / strip, max-effort end" },
  // COMP Cams — additional LS street grinds
  { mfr: "COMP Cams", family: "XFI RPM XR259HR",     part: "54-408-11", platform: "ls", lifter: "hyd_roller", int050: 206, exh050: 212, liftInt: 0.515, liftExh: 0.522, lsa: 112, rpmLo: 800, rpmHi: 5800, use: "Mild street / performance" },
  { mfr: "COMP Cams", family: "XFI Xtreme Truck HR15", part: "54-451-11", platform: "ls", lifter: "hyd_roller", int050: 208, exh050: 212, liftInt: 0.554, liftExh: 0.558, lsa: 115, rpmLo: 1000, rpmHi: 5700, use: "Daily / tow truck" },
  { mfr: "COMP Cams", family: "LSR Cathedral 231/239", part: "54-459-11", platform: "ls", lifter: "hyd_roller", int050: 231, exh050: 239, liftInt: 0.617, liftExh: 0.624, lsa: 113, rpmLo: 2000, rpmHi: 7000, use: "Street / strip, wide powerband" },
  { mfr: "COMP Cams", family: "Big Mutha' Thumpr",   part: "54-602-11", platform: "ls", lifter: "hyd_roller", int050: 228, exh050: 230, liftInt: 0.573, liftExh: 0.558, lsa: 112, rpmLo: 2200, rpmHi: 7200, use: "Street / strip, aggressive lopey idle" },
  // Cam Motion / Trick Flow / Summit
  { mfr: "Cam Motion", family: "Hotrod",             part: "03-01-0075", platform: "ls", lifter: "hyd_roller", int050: 227, exh050: 237, liftInt: 0.595, liftExh: 0.587, lsa: 111, rpmLo: 3000, rpmHi: 6500, use: "Street / strip, lopey idle" },
  { mfr: "Trick Flow", family: "TrackMax LS",        part: "TFS-30602001", platform: "ls", lifter: "hyd_roller", int050: 216, exh050: 220, liftInt: 0.560, liftExh: 0.560, lsa: 114, rpmLo: 2000, rpmHi: 6000, use: "Street / strip, good idle" },
  { mfr: "Summit Racing", family: "Pro LS (truck swap)", part: "SUM-8712", platform: "ls", lifter: "hyd_roller", int050: 209, exh050: 217, liftInt: 0.500, liftExh: 0.500, lsa: 112, rpmLo: 1800, rpmHi: 6000, use: "Daily / tow, big low-end torque" },

  // ── Pontiac V8 (326–455) ─────────────────────────────────────────────────
  // Lift shown at Pontiac 1.5 rocker (Lunati lists both 1.5 and 1.65).
  { mfr: "Lunati", family: "Voodoo (retrofit HR)", part: "20510712LK", platform: "pontiac", lifter: "hyd_roller", int050: 231, exh050: 239, liftInt: 0.535, liftExh: 0.550, lsa: 110, rpmLo: 2200, rpmHi: 6200, use: "High-perf street, ~2800 stall, 9.5:1" },
  { mfr: "Lunati", family: "Voodoo (retrofit HR)", part: "20510713",   platform: "pontiac", lifter: "hyd_roller", int050: 243, exh050: 251, liftInt: 0.560, liftExh: 0.565, lsa: 110, rpmLo: 2600, rpmHi: 6600, use: "Serious street / strip, 3200 stall, 10.5:1" },

  // ── Ford 351 Cleveland / 351M / 400M ─────────────────────────────────────
  { mfr: "Crane Cams", family: "Energizer H-284-2", part: "133052", platform: "cleveland", lifter: "hyd_flat", int050: 228, exh050: 228, liftInt: 0.554, liftExh: 0.554, lsa: 110, rpmLo: 2600, rpmHi: 6400, use: "Performance street (351C/M/400)" },

  // ── Mopar LA small block (318/340/360) ───────────────────────────────────
  // Lift at Mopar 1.5 rocker.
  { mfr: "COMP Cams", family: "Xtreme Energy XE262H", part: "20-222-3", platform: "mopar_sb", lifter: "hyd_flat", int050: 218, exh050: 224, liftInt: 0.462, liftExh: 0.470, lsa: 110, rpmLo: 1300, rpmHi: 5600, use: "Mild street, good mileage, stock converter" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE268H", part: "20-223-3", platform: "mopar_sb", lifter: "hyd_flat", int050: 224, exh050: 230, liftInt: 0.477, liftExh: 0.480, lsa: 110, rpmLo: 1600, rpmHi: 5800, use: "Street, biggest for stock converter" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE274H", part: "20-224-4", platform: "mopar_sb", lifter: "hyd_flat", int050: 230, exh050: 236, liftInt: 0.488, liftExh: 0.491, lsa: 110, rpmLo: 1800, rpmHi: 6000, use: "Street / strip, 2200+ stall" },
  { mfr: "Crower", family: "Hi-Draulic Hauler", part: "31204", platform: "mopar_sb", lifter: "hyd_flat", int050: 218, exh050: 227, liftInt: 0.474, liftExh: 0.480, lsa: 108, rpmLo: 2500, rpmHi: 6500, use: "Mid-range torque" },
  { mfr: "Crower", family: "Hi-Draulic Hauler", part: "31205", platform: "mopar_sb", lifter: "hyd_flat", int050: 224, exh050: 234, liftInt: 0.507, liftExh: 0.522, lsa: 108, rpmLo: 2700, rpmHi: 6500, use: "Mid-range acceleration" },

  // ── Mopar B / RB big block (383/400/440) ─────────────────────────────────
  { mfr: "COMP Cams", family: "Xtreme Energy XE268H", part: "21-223-4", platform: "mopar_bb", lifter: "hyd_flat", int050: 224, exh050: 230, liftInt: 0.477, liftExh: 0.480, lsa: 110, rpmLo: 1600, rpmHi: 5800, use: "Street, works with stock converter" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE274H", part: "21-224-4", platform: "mopar_bb", lifter: "hyd_flat", int050: 230, exh050: 236, liftInt: 0.488, liftExh: 0.491, lsa: 110, rpmLo: 1800, rpmHi: 6000, use: "High-performance street" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE284H", part: "21-225-4", platform: "mopar_bb", lifter: "hyd_flat", int050: 240, exh050: 246, liftInt: 0.507, liftExh: 0.510, lsa: 110, rpmLo: 2300, rpmHi: 6500, use: "Street / strip, 2800+ stall, rough idle" },

  // ── Pontiac V8 (326–455) — additional ────────────────────────────────────
  { mfr: "COMP Cams", family: "Xtreme Energy XE262H", part: "51-222-4", platform: "pontiac", lifter: "hyd_flat", int050: 218, exh050: 224, liftInt: 0.462, liftExh: 0.470, lsa: 110, rpmLo: 1300, rpmHi: 5500, use: "Mild street, stock/1800 stall" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE268H", part: "51-223-4", platform: "pontiac", lifter: "hyd_flat", int050: 224, exh050: 230, liftInt: 0.477, liftExh: 0.480, lsa: 110, rpmLo: 1600, rpmHi: 5800, use: "Street, slightly rough idle, 2000+ stall" },
  { mfr: "Lunati", family: "Voodoo", part: "10510703", platform: "pontiac", lifter: "hyd_flat", int050: 227, exh050: 233, liftInt: 0.489, liftExh: 0.504, lsa: 110, rpmLo: 1600, rpmHi: 5800, use: "Street / strip, 2200–2400 stall" },

  // ── Ford 351 Cleveland — additional ──────────────────────────────────────
  // Lift at Cleveland 1.73 rocker.
  { mfr: "COMP Cams", family: "Xtreme Energy XE274H", part: "32-246-4", platform: "cleveland", lifter: "hyd_flat", int050: 230, exh050: 236, liftInt: 0.562, liftExh: 0.565, lsa: 110, rpmLo: 2000, rpmHi: 6000, use: "Street / perf, strong mid-range" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE284H", part: "32-250-4", platform: "cleveland", lifter: "hyd_flat", int050: 240, exh050: 246, liftInt: 0.584, liftExh: 0.588, lsa: 110, rpmLo: 2300, rpmHi: 6500, use: "Street / strip, 2800+ stall, 9.5:1" },
  { mfr: "Crower", family: "Ball Nose", part: "15172", platform: "cleveland", lifter: "hyd_flat", int050: 215, exh050: 221, liftInt: 0.519, liftExh: 0.514, lsa: 112, rpmLo: 1800, rpmHi: 5500, use: "Street" },
  { mfr: "Crower", family: "Ball Nose", part: "15173", platform: "cleveland", lifter: "hyd_flat", int050: 219, exh050: 225, liftInt: 0.530, liftExh: 0.524, lsa: 110, rpmLo: 2000, rpmHi: 5700, use: "Street / perf" },
  { mfr: "Crower", family: "Ball Nose", part: "15174", platform: "cleveland", lifter: "hyd_flat", int050: 227, exh050: 233, liftInt: 0.550, liftExh: 0.547, lsa: 110, rpmLo: 2100, rpmHi: 5900, use: "Performance" },

  // ── Ford 429 / 460 (385-series) ──────────────────────────────────────────
  // Lift at Ford 460 1.73 rocker.
  { mfr: "COMP Cams", family: "Xtreme Energy XE262H", part: "34-238-4", platform: "ford_385", lifter: "hyd_flat", int050: 218, exh050: 224, liftInt: 0.513, liftExh: 0.520, lsa: 110, rpmLo: 1300, rpmHi: 5600, use: "Street / tow, strong torque" },
  { mfr: "COMP Cams", family: "Xtreme Energy XE274H", part: "34-247-4", platform: "ford_385", lifter: "hyd_flat", int050: 230, exh050: 236, liftInt: 0.562, liftExh: 0.565, lsa: 110, rpmLo: 1800, rpmHi: 6000, use: "High-perf street, 2400+ stall, headers" },
  { mfr: "Crower", family: "Ball Nose", part: "22172", platform: "ford_385", lifter: "hyd_flat", int050: 215, exh050: 221, liftInt: 0.519, liftExh: 0.514, lsa: 112, rpmLo: 1600, rpmHi: 5000, use: "Street" },
  { mfr: "Crower", family: "Hi-Draulic Hauler", part: "22205", platform: "ford_385", lifter: "hyd_flat", int050: 222, exh050: 232, liftInt: 0.536, liftExh: 0.540, lsa: 108, rpmLo: 2700, rpmHi: 6500, use: "Torque / strip" },
];
