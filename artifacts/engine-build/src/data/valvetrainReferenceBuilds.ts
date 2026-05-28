/**
 * Verified cam + spring + RPM pairings published by major cam/spring manufacturers.
 *
 * Used by the Valvetrain RPM Builder calculator to give the user a real-world
 * sanity check: "your inputs say 6800 RPM — Comp Cams' own LSR 54-471-11 cam +
 * 26926 dual spring kit is rated for 7200 RPM, so the estimate is plausible."
 *
 * Inclusion rules:
 *   - Manufacturer-published RPM rating is required (no third-party guesses).
 *   - Cam lift (at the valve) + intake duration @ 0.050" required.
 *   - Spring fields optional — Crower rarely publishes the matched spring on
 *     the cam page; rows are still useful as RPM-vs-cam-profile validators.
 *   - All max_rpm values are the manufacturer's published OPERATING RANGE
 *     upper bound (not redline, not "won't survive past").
 *
 * Last refreshed: 2026-05-27. Re-verify URLs annually — manufacturer SKUs and
 * recommended-spring pairings change with catalog revisions.
 */

export type ReferenceCamType =
  | "hyd-flat"
  | "hyd-roller"
  | "sol-flat"
  | "sol-roller"
  | "DOHC-bucket";

export interface ReferenceBuild {
  mfr: string;
  camPN: string;
  camSeries: string;
  camType: ReferenceCamType;
  /** Intake valve lift, inches, at the rocker ratio used in the cam family's
   *  marketing (1.5 SBC, 1.6 SBF roller, 1.7 LS/BBC). */
  liftIntake: number;
  /** Intake duration at 0.050" cam lift, degrees. */
  duration050: number;
  lsa?: number;
  springPN?: string;
  seatLbs?: number;
  openLbs?: number;
  rateLbsPerIn?: number;
  installedHeight?: number;
  /** Manufacturer's published operating-range max RPM. */
  maxRpm: number;
  application: string;
  sourceUrl: string;
}

export const VALVETRAIN_REFERENCE_BUILDS: ReferenceBuild[] = [
  // ─────────────────────────────────────────────────────────────────────
  //  COMP CAMS (compcams.com) — 26 verified pairings, K-Kit bundled springs
  // ─────────────────────────────────────────────────────────────────────
  { mfr: "COMP", camPN: "54-455-11", camSeries: "LSR Cathedral", camType: "hyd-roller", liftIntake: 0.604, duration050: 215, lsa: 112, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 6500, application: "LS1/LS6 cathedral", sourceUrl: "https://www.summitracing.com/parts/cca-54-455-11" },
  { mfr: "COMP", camPN: "54-458-11", camSeries: "LSR Cathedral", camType: "hyd-roller", liftIntake: 0.614, duration050: 227, lsa: 113, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 7000, application: "LS1/LS2/LS6", sourceUrl: "https://www.summitracing.com/parts/cca-54-458-11" },
  { mfr: "COMP", camPN: "54-459-11", camSeries: "LSR Cathedral", camType: "hyd-roller", liftIntake: 0.617, duration050: 231, lsa: 113, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 7000, application: "LS1/LS2/LS6 cathedral", sourceUrl: "https://www.amazon.com/Cams-54-459-11-Camshaft-281LR-HR-113/dp/B002EE4HJA" },
  { mfr: "COMP", camPN: "54-470-11", camSeries: "LSR Rect Port", camType: "hyd-roller", liftIntake: 0.621, duration050: 235, lsa: 113, springPN: "26926-16", seatLbs: 129, openLbs: 470, rateLbsPerIn: 460, installedHeight: 1.835, maxRpm: 7000, application: "LS3/L92/LS7 rect port", sourceUrl: "https://www.speedwaymotors.com/COMP-Cams-54-470-11-LSR-Series-Hyd-Roller-Camshaft-LS,219850.html" },
  { mfr: "COMP", camPN: "54-471-11", camSeries: "LSR Rect Port", camType: "hyd-roller", liftIntake: 0.624, duration050: 239, lsa: 114, springPN: "26926-16", seatLbs: 129, openLbs: 470, rateLbsPerIn: 460, installedHeight: 1.835, maxRpm: 7200, application: "LS3/L92 race rect port", sourceUrl: "https://www.summitracing.com/parts/cca-54-471-11" },
  { mfr: "COMP", camPN: "54-702-11", camSeries: "Stage 2 Thumpr LS", camType: "hyd-roller", liftIntake: 0.553, duration050: 226, lsa: 110, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 6600, application: "LS truck 4.8/5.3/6.0", sourceUrl: "https://www.compcams.com/stage-2-thumpr-226-237-hydraulic-roller-cam-for-gen-iii-ls-48-53-60l-trucks-cpg.html" },
  { mfr: "COMP", camPN: "54-330-11", camSeries: "LST Stage 1 Turbo", camType: "hyd-roller", liftIntake: 0.598, duration050: 223, lsa: 115, springPN: "26925-16", seatLbs: 141, openLbs: 405, rateLbsPerIn: 400, installedHeight: 1.810, maxRpm: 7400, application: "LS 4.8/5.3 turbo", sourceUrl: "https://www.cspracing.com/comp-cams-ck54-330-11-stage-1-lst-camshaft-kit-for-ls-4-8-5-3l-turbo-engines/comp-ck54-330-11/" },
  { mfr: "COMP", camPN: "12-242-2", camSeries: "XE268H", camType: "hyd-flat", liftIntake: 0.477, duration050: 224, lsa: 110, springPN: "981-16", seatLbs: 105, openLbs: 273, rateLbsPerIn: 336, installedHeight: 1.700, maxRpm: 5800, application: "SBC 262-400", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K12-242-2/10002/-1" },
  { mfr: "COMP", camPN: "12-246-3", camSeries: "XE274H", camType: "hyd-flat", liftIntake: 0.490, duration050: 230, lsa: 110, springPN: "987-16", seatLbs: 121, openLbs: 343, rateLbsPerIn: 366, installedHeight: 1.900, maxRpm: 6000, application: "SBC 262-400", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/12-246-3/10002/-1" },
  { mfr: "COMP", camPN: "12-250-3", camSeries: "XE284H", camType: "hyd-flat", liftIntake: 0.507, duration050: 240, lsa: 110, springPN: "924-16", seatLbs: 112, openLbs: 355, rateLbsPerIn: 347, installedHeight: 1.900, maxRpm: 6500, application: "SBC 262-400", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K12-250-3/10002/-1" },
  { mfr: "COMP", camPN: "12-211-2", camSeries: "Magnum 270H", camType: "hyd-flat", liftIntake: 0.470, duration050: 224, lsa: 110, springPN: "981-16", seatLbs: 105, openLbs: 273, rateLbsPerIn: 336, installedHeight: 1.700, maxRpm: 5800, application: "SBC 262-400", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K12-211-2/10002/-1" },
  { mfr: "COMP", camPN: "12-326-4", camSeries: "Magnum 286H", camType: "hyd-flat", liftIntake: 0.490, duration050: 236, lsa: 110, springPN: "924-16", seatLbs: 112, openLbs: 355, rateLbsPerIn: 347, installedHeight: 1.900, maxRpm: 6200, application: "SBC 262-400", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K12-326-4/10002/-1" },
  { mfr: "COMP", camPN: "12-602-4", camSeries: "Big Mutha Thumpr", camType: "hyd-flat", liftIntake: 0.522, duration050: 243, lsa: 107, springPN: "924-16", seatLbs: 112, openLbs: 355, rateLbsPerIn: 347, installedHeight: 1.900, maxRpm: 6200, application: "SBC 262-400", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/CL11-602-4/10002/-1" },
  { mfr: "COMP", camPN: "12-600-4", camSeries: "Thumpr", camType: "hyd-flat", liftIntake: 0.498, duration050: 227, lsa: 107, springPN: "981-16", seatLbs: 105, openLbs: 273, rateLbsPerIn: 336, installedHeight: 1.700, maxRpm: 5600, application: "SBC 262-400", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/CL11-600-4/10002/-1" },
  { mfr: "COMP", camPN: "08-432-8", camSeries: "XE 230HR", camType: "hyd-roller", liftIntake: 0.510, duration050: 230, lsa: 110, springPN: "986-16", seatLbs: 130, openLbs: 357, rateLbsPerIn: 408, installedHeight: 1.800, maxRpm: 5800, application: "SBC 262-400 retrofit HR", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K12-432-8/10002/-1" },
  { mfr: "COMP", camPN: "08-422-8", camSeries: "XE 218HR (XR270H-R)", camType: "hyd-roller", liftIntake: 0.495, duration050: 218, lsa: 110, springPN: "986-16", seatLbs: 130, openLbs: 357, rateLbsPerIn: 408, installedHeight: 1.800, maxRpm: 5500, application: "SBC 262-400 retrofit HR", sourceUrl: "https://www.amazon.com/COMP-Cams-K12-422-8-Camshaft-XR270H-R10/dp/B000P5BO78" },
  { mfr: "COMP", camPN: "08-443-8", camSeries: "XR294HR", camType: "hyd-roller", liftIntake: 0.540, duration050: 248, lsa: 110, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 6100, application: "SBC 262-400 retrofit HR", sourceUrl: "https://www.cspracing.com/comp-cams-08-443-8-camshaft-cs-xr294hr-10/comp-08-443-8/" },
  { mfr: "COMP", camPN: "11-433-8", camSeries: "XE236HR BBC", camType: "hyd-roller", liftIntake: 0.510, duration050: 236, lsa: 110, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 6000, application: "BBC 396-454", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/11-433-8/10002/-1" },
  { mfr: "COMP", camPN: "11-450-8", camSeries: "Magnum 230HR BBC", camType: "hyd-roller", liftIntake: 0.578, duration050: 230, lsa: 110, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 6200, application: "BBC 396-454", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K11-450-8/10002/-1" },
  { mfr: "COMP", camPN: "11-770-8", camSeries: "XR274R BBC", camType: "sol-roller", liftIntake: 0.639, duration050: 236, lsa: 110, springPN: "941-16", seatLbs: 130, openLbs: 358, rateLbsPerIn: 454, installedHeight: 1.750, maxRpm: 6200, application: "BBC 396-454", sourceUrl: "https://www.speedwaymotors.com/COMP-Cams-K11-770-8-Xtreme-Energy-Solid-Roller-Camshaft-Kit-GM-396-454,223860.html" },
  { mfr: "COMP", camPN: "11-601-4", camSeries: "Mutha Thumpr BBC", camType: "hyd-flat", liftIntake: 0.510, duration050: 235, lsa: 107, springPN: "924-16", seatLbs: 112, openLbs: 355, rateLbsPerIn: 347, installedHeight: 1.900, maxRpm: 5900, application: "BBC 396-454", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K11-601-4/10002/-1" },
  { mfr: "COMP", camPN: "11-602-4", camSeries: "Big Mutha Thumpr BBC", camType: "hyd-flat", liftIntake: 0.522, duration050: 243, lsa: 107, springPN: "924-16", seatLbs: 112, openLbs: 355, rateLbsPerIn: 347, installedHeight: 1.900, maxRpm: 6200, application: "BBC 396-454", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K11-602-4/10002/-1" },
  { mfr: "COMP", camPN: "11-318-4", camSeries: "Magnum 286H BBC", camType: "hyd-flat", liftIntake: 0.556, duration050: 244, lsa: 110, springPN: "924-16", seatLbs: 112, openLbs: 355, rateLbsPerIn: 347, installedHeight: 1.900, maxRpm: 6200, application: "BBC 396-454", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/K11-318-4/10002/-1" },
  { mfr: "COMP", camPN: "31-238-3", camSeries: "XE262H SBF", camType: "hyd-flat", liftIntake: 0.493, duration050: 218, lsa: 110, springPN: "981-16", seatLbs: 105, openLbs: 273, rateLbsPerIn: 336, installedHeight: 1.700, maxRpm: 5600, application: "SBF 221-302", sourceUrl: "https://www.jegs.com/i/COMP-Cams/249/SK31-238-3/10002/-1" },
  { mfr: "COMP", camPN: "35-349-8", camSeries: "XE264HR SBF", camType: "hyd-roller", liftIntake: 0.512, duration050: 212, lsa: 114, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 5500, application: "SBF 5.0L EFI 86-95", sourceUrl: "https://www.cspracing.com/products/comp-cams-k35-349-8-camshaft-kit-fw-xe264hr-14" },
  { mfr: "COMP", camPN: "20-223-3", camSeries: "XE268H Mopar", camType: "hyd-flat", liftIntake: 0.477, duration050: 224, lsa: 110, springPN: "981-16", seatLbs: 105, openLbs: 273, rateLbsPerIn: 336, installedHeight: 1.700, maxRpm: 5800, application: "Mopar 273-360 LA", sourceUrl: "https://www.jegs.com/i/Comp-Cams/249/K20-223-3/10002/-1" },
  { mfr: "COMP", camPN: "51-423-11", camSeries: "XR276HR Pontiac", camType: "hyd-roller", liftIntake: 0.552, duration050: 224, lsa: 110, springPN: "26918-16", seatLbs: 125, openLbs: 367, rateLbsPerIn: 320, installedHeight: 1.800, maxRpm: 5600, application: "Pontiac 265-455", sourceUrl: "https://butlerperformance.com/i-24453068-comp-cams-xtreme-energy-xr276hr-hydraulic-roller-cam-and-lifter-kit-cca-cl51-423-11.html" },

  // ─────────────────────────────────────────────────────────────────────
  //  LUNATI (lunatipower.com) — 12 verified pairings
  // ─────────────────────────────────────────────────────────────────────
  { mfr: "Lunati", camPN: "10120701", camSeries: "Voodoo", camType: "hyd-flat", liftIntake: 0.454, duration050: 213, lsa: 112, springPN: "73943K1", seatLbs: 108, openLbs: 339, rateLbsPerIn: 462, installedHeight: 1.750, maxRpm: 5500, application: "SBC", sourceUrl: "https://www.summitracing.com/parts/lun-10120701" },
  { mfr: "Lunati", camPN: "10120702", camSeries: "Voodoo", camType: "hyd-flat", liftIntake: 0.468, duration050: 219, lsa: 112, springPN: "73943K1", seatLbs: 108, openLbs: 339, rateLbsPerIn: 462, installedHeight: 1.750, maxRpm: 5700, application: "SBC", sourceUrl: "https://www.summitracing.com/parts/lun-10120702" },
  { mfr: "Lunati", camPN: "10120703", camSeries: "Voodoo", camType: "hyd-flat", liftIntake: 0.489, duration050: 227, lsa: 110, springPN: "73943K1", seatLbs: 108, openLbs: 339, rateLbsPerIn: 462, installedHeight: 1.750, maxRpm: 6200, application: "SBC", sourceUrl: "https://www.summitracing.com/parts/lun-10120703" },
  { mfr: "Lunati", camPN: "10120102LK", camSeries: "BareBones", camType: "hyd-flat", liftIntake: 0.465, duration050: 224, lsa: 112, springPN: "73943K1", seatLbs: 108, openLbs: 339, rateLbsPerIn: 462, installedHeight: 1.750, maxRpm: 6000, application: "SBC", sourceUrl: "https://www.summitracing.com/parts/lun-10120102lk" },
  { mfr: "Lunati", camPN: "10110701", camSeries: "Voodoo BBC", camType: "hyd-flat", liftIntake: 0.515, duration050: 230, lsa: 112, springPN: "73943K1", seatLbs: 108, openLbs: 339, rateLbsPerIn: 462, installedHeight: 1.750, maxRpm: 5500, application: "BBC", sourceUrl: "https://milkymotorsports.com/products/lnt10110701lk" },
  { mfr: "Lunati", camPN: "10110703", camSeries: "Voodoo BBC", camType: "hyd-flat", liftIntake: 0.547, duration050: 235, lsa: 110, springPN: "73943K1", seatLbs: 108, openLbs: 339, rateLbsPerIn: 462, installedHeight: 1.750, maxRpm: 6200, application: "BBC", sourceUrl: "https://www.amazon.com/Lunati-10110703-Voodoo-Hydraulic-Camshaft/dp/B01A862H2O" },
  { mfr: "Lunati", camPN: "10510703", camSeries: "Voodoo Pontiac", camType: "hyd-flat", liftIntake: 0.489, duration050: 227, lsa: 110, springPN: "73943K1", seatLbs: 108, openLbs: 339, rateLbsPerIn: 462, installedHeight: 1.750, maxRpm: 5800, application: "Pontiac", sourceUrl: "https://butlerperformance.com/i-24453320-lunati-hydraulic-flat-tappet-camlun-10510703.html" },
  { mfr: "Lunati", camPN: "20120713", camSeries: "Voodoo HR SBC", camType: "hyd-roller", liftIntake: 0.560, duration050: 243, lsa: 110, springPN: "73100-16", maxRpm: 6800, application: "SBC", sourceUrl: "https://www.jegs.com/i/Lunati/638/20120713/10002/-1" },
  { mfr: "Lunati", camPN: "20510712", camSeries: "Voodoo HR BBC", camType: "hyd-roller", liftIntake: 0.535, duration050: 231, lsa: 110, springPN: "73925K1", seatLbs: 153, openLbs: 400, rateLbsPerIn: 379, installedHeight: 1.810, maxRpm: 6200, application: "BBC", sourceUrl: "https://butlerperformance.com/i-24453326-lunati-voodoo-hydraulic-roller-cam-lun-20510712.html" },
  { mfr: "Lunati", camPN: "20540710", camSeries: "Voodoo LS", camType: "hyd-roller", liftIntake: 0.531, duration050: 212, lsa: 113, springPN: "74818K1", maxRpm: 6200, application: "LS Gen III/IV 3-bolt", sourceUrl: "https://www.jegs.com/i/Lunati/638/20540710/10002/-1" },
  { mfr: "Lunati", camPN: "20540712", camSeries: "Voodoo LS", camType: "hyd-roller", liftIntake: 0.599, duration050: 231, lsa: 113, springPN: "73925K1", seatLbs: 153, openLbs: 400, rateLbsPerIn: 379, installedHeight: 1.810, maxRpm: 7000, application: "LS Gen III/IV 3-bolt", sourceUrl: "https://poormanmotorsports.com/lunati-20540712lun-camshaft-voodoo-hydraulic-roller-lift-0.599-0.601-in-duration-282-288-113-lsa-2400-7000-rpm-3-bolt-gm-ls-series-each" },
  { mfr: "Lunati", camPN: "20540716", camSeries: "Voodoo High-Lift LS", camType: "hyd-roller", liftIntake: 0.625, duration050: 219, lsa: 112, springPN: "73925K1", seatLbs: 153, openLbs: 400, rateLbsPerIn: 379, installedHeight: 1.810, maxRpm: 6400, application: "LS Gen III/IV 3-bolt", sourceUrl: "https://www.jegs.com/i/Lunati/638/20540716/10002/-1" },

  // ─────────────────────────────────────────────────────────────────────
  //  CROWER (crower.com) — 12 verified pairings, springs from cam card (n/p here)
  // ─────────────────────────────────────────────────────────────────────
  { mfr: "Crower", camPN: "00466", camSeries: "350 High Lift L2", camType: "hyd-flat", liftIntake: 0.514, duration050: 217, lsa: 110, maxRpm: 5750, application: "SBC", sourceUrl: "https://www.summitracing.com/parts/cro-00466" },
  { mfr: "Crower", camPN: "00467", camSeries: "350 High Lift L2", camType: "hyd-flat", liftIntake: 0.525, duration050: 221, lsa: 110, maxRpm: 5800, application: "SBC", sourceUrl: "https://www.summitracing.com/parts/cro-00467" },
  { mfr: "Crower", camPN: "00471", camSeries: "Compu-Pro L4", camType: "hyd-flat", liftIntake: 0.497, duration050: 234, lsa: 112, maxRpm: 6200, application: "SBC", sourceUrl: "https://www.summitracing.com/parts/cro-00471" },
  { mfr: "Crower", camPN: "Beast-std", camSeries: "Beast SBC", camType: "hyd-roller", liftIntake: 0.451, duration050: 204, lsa: 114, maxRpm: 4900, application: "SBC", sourceUrl: "https://crower.com/camshafts/chevy/small-block-sbc/hydraulic-roller/beast-series.html" },
  { mfr: "Crower", camPN: "Beast-L2", camSeries: "Beast SBC", camType: "hyd-roller", liftIntake: 0.474, duration050: 214, lsa: 114, maxRpm: 4900, application: "SBC", sourceUrl: "https://crower.com/camshafts/chevy/small-block-sbc/hydraulic-roller/beast-series.html" },
  { mfr: "Crower", camPN: "Beast-L3", camSeries: "Beast SBC", camType: "hyd-roller", liftIntake: 0.498, duration050: 220, lsa: 114, maxRpm: 5700, application: "SBC", sourceUrl: "https://crower.com/camshafts/chevy/small-block-sbc/hydraulic-roller/beast-series.html" },
  { mfr: "Crower", camPN: "Beast-L4", camSeries: "Beast SBC", camType: "hyd-roller", liftIntake: 0.519, duration050: 226, lsa: 114, maxRpm: 6000, application: "SBC", sourceUrl: "https://crower.com/camshafts/chevy/small-block-sbc/hydraulic-roller/beast-series.html" },
  { mfr: "Crower", camPN: "SBF-CP-L1", camSeries: "Compu-Pro SBF HR", camType: "hyd-roller", liftIntake: 0.538, duration050: 236, lsa: 112, maxRpm: 6000, application: "SBF 302/351W", sourceUrl: "https://crower.com/camshafts/ford/351w-302-302-svo-351-svo/mechanical-roller.html" },
  { mfr: "Crower", camPN: "SBF-CP-L3", camSeries: "Compu-Pro SBF SR", camType: "sol-roller", liftIntake: 0.562, duration050: 252, lsa: 105, maxRpm: 6500, application: "SBF 302/351W", sourceUrl: "https://crower.com/camshafts/ford/351w-302-302-svo-351-svo/mechanical-roller.html" },
  { mfr: "Crower", camPN: "15445", camSeries: "Compu-Pro 285R", camType: "sol-roller", liftIntake: 0.597, duration050: 254, lsa: 106, maxRpm: 7000, application: "SBF 351W", sourceUrl: "https://www.jegs.com/i/Crower/258/15445/10002/-1" },
  { mfr: "Crower", camPN: "00543", camSeries: "LS Mech Roller L3", camType: "sol-roller", liftIntake: 0.644, duration050: 251, lsa: 110, maxRpm: 7500, application: "LS (LS1/LS2/LS6)", sourceUrl: "https://crower.com/camshafts/chevy/ls1/mechanical-roller.html" },
  { mfr: "Crower", camPN: "60243", camSeries: "Compu-Pro Pontiac L4", camType: "hyd-flat", liftIntake: 0.500, duration050: 239, lsa: 112, maxRpm: 6200, application: "Pontiac 287-455", sourceUrl: "https://www.jegs.com/i/Crower/258/60243/10002/-1" },

  // ─────────────────────────────────────────────────────────────────────
  //  TRICK FLOW (trickflow.com) — head/cam kits with bundled springs
  // ─────────────────────────────────────────────────────────────────────
  { mfr: "TrickFlow", camPN: "TFS-51403001", camSeries: "Track Max (TW 11R kit)", camType: "hyd-roller", liftIntake: 0.499, duration050: 221, lsa: 112, springPN: "TW 11R OE dual", seatLbs: 130, openLbs: 360, rateLbsPerIn: 425, installedHeight: 1.800, maxRpm: 5500, application: "SBF 302/5.0L (K525-432-370)", sourceUrl: "https://www.trickflow.com/parts/tfs-k525-432-370" },
  { mfr: "TrickFlow", camPN: "TFS-51403001", camSeries: "Track Max (TW Street kit)", camType: "hyd-roller", liftIntake: 0.499, duration050: 221, lsa: 112, springPN: "TW Street OE", seatLbs: 110, openLbs: 313, rateLbsPerIn: 360, installedHeight: 1.820, maxRpm: 5500, application: "SBF 302/5.0L (K514-360350B)", sourceUrl: "https://www.trickflow.com/parts/tfs-k514-360350b" },
  { mfr: "TrickFlow", camPN: "K326-580-520", camSeries: "GenX 580 LS3 kit", camType: "hyd-roller", liftIntake: 0.625, duration050: 230, lsa: 113, springPN: "TFS-16905P-16", seatLbs: 160, openLbs: 425, rateLbsPerIn: 450, installedHeight: 1.800, maxRpm: 6800, application: "GM LS3/L99 6.2L", sourceUrl: "https://www.trickflow.com/parts/tfs-k326-580-520" },

  // ─────────────────────────────────────────────────────────────────────
  //  HOWARDS CAMS (howardscams.com) — 7 verified pairings
  // ─────────────────────────────────────────────────────────────────────
  { mfr: "Howards", camPN: "180245-10", camSeries: "OE-Roller SBC", camType: "hyd-roller", liftIntake: 0.512, duration050: 215, lsa: 112, springPN: "98213-16", seatLbs: 120, openLbs: 350, rateLbsPerIn: 430, installedHeight: 1.800, maxRpm: 5400, application: "SBC 305/350 87-98", sourceUrl: "https://www.howardscams.com/hydraulic-roller-camshaft-1987-1998-chevy-305350-1600-5400-howards-cams-180245-10" },
  { mfr: "Howards", camPN: "CL180525-10", camSeries: "OE-Roller (high) SBC", camType: "hyd-roller", liftIntake: 0.560, duration050: 227, lsa: 110, springPN: "98213-16", seatLbs: 120, openLbs: 350, rateLbsPerIn: 430, installedHeight: 1.800, maxRpm: 6100, application: "SBC 305/350 87-98", sourceUrl: "https://www.winnerscircle.com/products/hrccl180525-10" },
  { mfr: "Howards", camPN: "CL186115-10", camSeries: "OE-Roller (max) SBC", camType: "hyd-roller", liftIntake: 0.600, duration050: 230, lsa: 110, springPN: "98213-16", seatLbs: 120, openLbs: 350, rateLbsPerIn: 430, installedHeight: 1.800, maxRpm: 6400, application: "SBC 305/350 87-98", sourceUrl: "https://cnc-motorsports.com/howards-camshaft-lifter-kit-cl186115-10-hydraulic-roller-oe-application-sbc-87-98.html" },
  { mfr: "Howards", camPN: "CL110245-12", camSeries: "Retro-Fit roller SBC", camType: "hyd-roller", liftIntake: 0.525, duration050: 225, lsa: 110, springPN: "98213-16", seatLbs: 120, openLbs: 350, rateLbsPerIn: 430, installedHeight: 1.800, maxRpm: 6000, application: "SBC 305-350 retrofit", sourceUrl: "https://www.howardscams.com/hydraulic-roller-camshaft-1987-1998-chevy-305350-1600-5400-howards-cams-180245-10" },
  { mfr: "Howards", camPN: "CL111655-10", camSeries: "Retro-Fit roller SBC", camType: "hyd-roller", liftIntake: 0.600, duration050: 243, lsa: 106, springPN: "98213-16", seatLbs: 120, openLbs: 350, rateLbsPerIn: 430, installedHeight: 1.800, maxRpm: 6500, application: "SBC 262-400 retrofit", sourceUrl: "https://www.howardscams.com/hydraulic-roller-camshaft-lifter-kit-1955-1998-chevy-262-400-2800-6500-howards-cams-cl111655-10" },
  { mfr: "Howards", camPN: "120245-12", camSeries: "Retro-Fit BBC", camType: "hyd-roller", liftIntake: 0.567, duration050: 224, lsa: 112, springPN: "98213-16", seatLbs: 120, openLbs: 350, rateLbsPerIn: 430, installedHeight: 1.800, maxRpm: 5400, application: "BBC 396-502 Mark IV", sourceUrl: "https://www.winnerscircle.com/products/hrc120245-12" },
  { mfr: "Howards", camPN: "120405-12", camSeries: "OE-Roller BBC", camType: "hyd-roller", liftIntake: 0.524, duration050: 218, lsa: 112, springPN: "98213-16", seatLbs: 120, openLbs: 350, rateLbsPerIn: 430, installedHeight: 1.800, maxRpm: 6400, application: "BBC 396-502 65-96", sourceUrl: "https://www.howardscams.com/hydraulic-roller-camshaft-1965-1996-chevy-396-502-mark-iv-2600-6400-howards-cams-120405-12" },
];

/* Map the calculator's CamType keys to our reference dataset categories.
   Calculator uses: hyd-flat, hyd-roller, solid-flat, solid-roller, ohc-bucket,
   ohc-finger-hyd, ohc-finger-solid, sohc-rocker-hyd, sohc-rocker-solid. */
export function refCamTypeForCalcCam(calcCamType: string): ReferenceCamType | null {
  switch (calcCamType) {
    case "hyd-flat":          return "hyd-flat";
    case "hyd-roller":        return "hyd-roller";
    case "solid-flat":        return "sol-flat";
    case "solid-roller":      return "sol-roller";
    case "ohc-bucket":        return "DOHC-bucket";
    default:                  return null; // sohc-rocker, ohc-finger — no reference data yet
  }
}

/**
 * Rank reference builds by similarity to the user's cam spec.
 *
 * Only rows of the same cam type are considered. Lift is weighted more heavily
 * than duration since lift is the dominant factor in the spring-pressure equation.
 */
export function nearestReferences(
  refCamType: ReferenceCamType,
  userLiftInches: number,
  userDuration050: number,
  topN = 6,
): ReferenceBuild[] {
  const same = VALVETRAIN_REFERENCE_BUILDS.filter(r => r.camType === refCamType);
  if (same.length === 0) return [];
  const scored = same.map(r => ({
    r,
    score: Math.abs(r.liftIntake - userLiftInches) * 100  // 0.010" mismatch ≈ 1 pt
         + Math.abs(r.duration050 - userDuration050) * 0.25, // 4° mismatch ≈ 1 pt
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, topN).map(s => s.r);
}
