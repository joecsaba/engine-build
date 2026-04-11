import { db } from "./index";
import { enginesTable, torqueSpecsTable, clearanceSpecsTable } from "./schema";
import { inArray, eq } from "drizzle-orm";

async function seedLsSbc() {
  console.log("Seeding comprehensive LS1, LS3, and Chevy 350 specs...");

  // Get engine IDs
  const engines = await db.select({ id: enginesTable.id, name: enginesTable.name })
    .from(enginesTable)
    .where(inArray(enginesTable.name, ["LS1 5.7L", "LS3 6.2L", "SBC 350 (4-bolt main)", "SBC 350 (2-bolt main)"]));

  const id = (name: string) => {
    const e = engines.find(e => e.name === name);
    if (!e) throw new Error(`Engine not found: ${name}`);
    return e.id;
  };

  // ─── DELETE EXISTING SPECS FOR THESE ENGINES (fresh re-seed) ───────────────
  const targetIds = engines.map(e => e.id);
  await db.delete(torqueSpecsTable).where(inArray(torqueSpecsTable.engineId, targetIds));
  await db.delete(clearanceSpecsTable).where(inArray(clearanceSpecsTable.engineId, targetIds));
  console.log("Cleared existing torque & clearance specs for target engines.");

  // ─── TORQUE SPECS ──────────────────────────────────────────────────────────
  await db.insert(torqueSpecsTable).values([

    // ════════════════════════════════════════════════
    // LS1 5.7L (1997–2004) — Complete Fastener List
    // Source: GM Service Manual 12584723 / GM TSB 04-06-01-008
    // ════════════════════════════════════════════════

    // Main / Bottom End
    { engineId: id("LS1 5.7L"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts — Inner (M10)", ftLbs: "77", nm: "105", lubricant: "Engine oil on threads and under bolt head", sequence: "Tighten to spec in sequence, inner bolts first", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts — Outer (M10)", ftLbs: "37", nm: "50", lubricant: "Engine oil", sequence: "Tighten after inner bolts, front-to-rear sequence", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Main Bearing", fastener: "Main Bearing Cap Side Bolts (M8)", ftLbs: "18", nm: "24", lubricant: "Engine oil", sequence: "After main cap primary bolts are torqued", torqueToYield: false },

    // Connecting Rods
    { engineId: id("LS1 5.7L"), category: "Connecting Rod", fastener: "Connecting Rod Bolts (LS1 OEM powdered-metal)", ftLbs: "15 + 75°", nm: "20 + 75°", lubricant: "Engine oil on threads", sequence: "Snug to 15 ft-lbs, then rotate 75° in one smooth motion. Replace if removed.", torqueToYield: true },

    // Cylinder Head
    { engineId: id("LS1 5.7L"), category: "Cylinder Head", fastener: "Cylinder Head Bolts — Long (M11)", ftLbs: "22 + 90° + 90°", nm: "30 + 90° + 90°", lubricant: "Engine oil; apply to threads and underside of head", sequence: "Pass 1: 22 ft-lbs in GM sequence. Pass 2: +90°. Pass 3: +90° more. Total ~180° rotation.", torqueToYield: true },
    { engineId: id("LS1 5.7L"), category: "Cylinder Head", fastener: "Cylinder Head Bolts — Short (M8, outer)", ftLbs: "22", nm: "30", lubricant: "Engine oil", sequence: "Torque after M11 bolts, in sequence outward", torqueToYield: false },

    // Valvetrain
    { engineId: id("LS1 5.7L"), category: "Valvetrain", fastener: "Rocker Arm Bolts (Valve Rocker Arm Pivot)", ftLbs: "22", nm: "30", lubricant: "Engine oil", sequence: "Torque with camshaft lobe at base circle (valve fully closed). Tighten each individually.", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Valvetrain", fastener: "Camshaft Retainer Plate Bolts", ftLbs: "18", nm: "24", lubricant: "Threadlocker (medium strength)", sequence: "Apply threadlocker, tighten evenly", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Valvetrain", fastener: "Valley Cover Bolts", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry", sequence: "Tighten in a cross pattern", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Valvetrain", fastener: "Valve Cover Bolts", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry — do not use sealer on threads", sequence: "Work from center outward in a cross pattern. Do not overtighten.", torqueToYield: false },

    // Intake / Exhaust
    { engineId: id("LS1 5.7L"), category: "Intake", fastener: "Intake Manifold Bolts (8 bolts)", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry", sequence: "Three passes center-outward in a star pattern: 44 in-lbs > 89 in-lbs > final 89 in-lbs", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Exhaust", fastener: "Exhaust Manifold Bolts (Cast iron manifold)", ftLbs: "15", nm: "20", lubricant: "Anti-seize on threads — prevents galling", sequence: "Start center, work outward alternately. Re-torque when cold after first heat cycle.", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Exhaust", fastener: "O2 Sensor (Oxygen Sensor)", ftLbs: "31", nm: "42", lubricant: "Anti-seize if reusing. New sensors have anti-seize pre-applied.", sequence: "Hand-start to avoid cross-threading, then torque", torqueToYield: false },

    // Oiling System
    { engineId: id("LS1 5.7L"), category: "Oiling", fastener: "Oil Pan Bolts — Rear (6 bolts, M8)", ftLbs: "18", nm: "24", lubricant: "Dry. Apply RTV to corners of rear main seal carrier.", sequence: "Rear bolts first, work forward", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Oiling", fastener: "Oil Pan Bolts — Front/Side (M6)", ftLbs: "106 in-lbs", nm: "12", lubricant: "Dry", sequence: "Tighten after rear bolts are torqued", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Oiling", fastener: "Oil Pump Pick-Up Tube Bolt", ftLbs: "18", nm: "24", lubricant: "Dry", sequence: "One pass", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Oiling", fastener: "Oil Pump Bolts (to block)", ftLbs: "18", nm: "24", lubricant: "Engine oil", sequence: "Tighten evenly", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Oiling", fastener: "Oil Pressure Sender", ftLbs: "11", nm: "15", lubricant: "Thread sealant on threads", sequence: "Hand-start then torque", torqueToYield: false },

    // Front / Accessory Drive
    { engineId: id("LS1 5.7L"), category: "Accessory", fastener: "Harmonic Balancer / Crankshaft Damper Bolt", ftLbs: "240", nm: "325", lubricant: "Engine oil on threads", sequence: "Use a crank holding tool. One torque step. Do not use impact alone for final value.", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Accessory", fastener: "Flywheel / Flexplate Bolts (M10)", ftLbs: "74", nm: "100", lubricant: "Threadlocker (medium strength)", sequence: "Three-pass sequence in a star pattern", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Accessory", fastener: "Timing Chain Cover Bolts — Large (M8)", ftLbs: "18", nm: "24", lubricant: "Dry", sequence: "Work from center outward", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Accessory", fastener: "Timing Chain Cover Bolts — Small (M6)", ftLbs: "106 in-lbs", nm: "12", lubricant: "Dry", sequence: "Tighten after large bolts", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Accessory", fastener: "Water Pump Bolts", ftLbs: "11", nm: "15", lubricant: "Dry", sequence: "Tighten in a cross pattern", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Accessory", fastener: "Alternator Bracket Bolts", ftLbs: "37", nm: "50", lubricant: "Dry", sequence: "Lower bracket first", torqueToYield: false },
    { engineId: id("LS1 5.7L"), category: "Accessory", fastener: "Spark Plugs (AC Delco 41-932)", ftLbs: "11", nm: "15", lubricant: "Anti-seize on threads (if not pre-applied)", sequence: "Hand-start carefully in aluminum head. Torque wrench required — no impact.", torqueToYield: false },

    // ════════════════════════════════════════════════
    // LS3 6.2L (2008–2017) — Complete Fastener List
    // Source: GM Service Manual 25952647 / 2010 Corvette Service Manual
    // ════════════════════════════════════════════════

    // Main / Bottom End
    { engineId: id("LS3 6.2L"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts — Inner (M10, all 5 caps)", ftLbs: "77", nm: "105", lubricant: "Engine oil on threads and under bolt head", sequence: "Torque front-to-rear in two passes: 37 ft-lbs > 77 ft-lbs", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts — Outer (M10)", ftLbs: "37", nm: "50", lubricant: "Engine oil", sequence: "After inner bolts, tighten front-to-rear", torqueToYield: false },

    // Connecting Rods
    { engineId: id("LS3 6.2L"), category: "Connecting Rod", fastener: "Connecting Rod Bolts (LS3 OEM powder-metal, 11mm)", ftLbs: "15 + 75°", nm: "20 + 75°", lubricant: "Engine oil on threads and bolt face", sequence: "Snug to 15 ft-lbs, then 75° rotation. Torque-to-yield — replace after removal.", torqueToYield: true },

    // Cylinder Head
    { engineId: id("LS3 6.2L"), category: "Cylinder Head", fastener: "Cylinder Head Bolts — M11 (10 per head)", ftLbs: "22 + 90° + 90°", nm: "30 + 90° + 90°", lubricant: "Engine oil — coat threads and underside of head; no sealer", sequence: "Pass 1: 22 ft-lbs (GM sequence 1–10). Pass 2: rotate each +90°. Pass 3: rotate each another +90°. Replace if removed.", torqueToYield: true },
    { engineId: id("LS3 6.2L"), category: "Cylinder Head", fastener: "Cylinder Head Bolts — M8 (outer, 6 per head)", ftLbs: "22", nm: "30", lubricant: "Engine oil", sequence: "Torque after all M11 bolts, working outward from center", torqueToYield: false },

    // Valvetrain
    { engineId: id("LS3 6.2L"), category: "Valvetrain", fastener: "Rocker Arm Bolts (each arm independently)", ftLbs: "22", nm: "30", lubricant: "Engine oil", sequence: "Torque each rocker with camshaft lobe at base circle (valve closed). Turn engine by hand to position each lobe.", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Valvetrain", fastener: "Camshaft Retainer Plate Bolts (3 bolts)", ftLbs: "18", nm: "24", lubricant: "Medium threadlocker (GM P/N 12345493)", sequence: "Apply threadlocker, torque evenly", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Valvetrain", fastener: "Valve Cover Bolts", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry", sequence: "Center-outward cross pattern. Ensure gasket is properly seated before torquing.", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Valvetrain", fastener: "Valley Cover / Engine Appearance Cover Bolts", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry", sequence: "Cross pattern", torqueToYield: false },

    // Intake / Exhaust
    { engineId: id("LS3 6.2L"), category: "Intake", fastener: "Intake Manifold Bolts (8 bolts)", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry — no sealer on threads", sequence: "Three-pass star pattern: 44 in-lbs > 89 in-lbs > re-check 89 in-lbs", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Exhaust", fastener: "Exhaust Manifold Bolts (LS3 uses cast manifolds)", ftLbs: "15", nm: "20", lubricant: "Anti-seize on threads", sequence: "Center outward, alternating sides. Re-torque after first heat cycle when engine is cold.", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Exhaust", fastener: "Exhaust Manifold Heat Shield Bolts", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry", sequence: "Tighten snugly, do not overtighten", torqueToYield: false },

    // Oiling System
    { engineId: id("LS3 6.2L"), category: "Oiling", fastener: "Oil Pan Bolts — Rear (M8)", ftLbs: "18", nm: "24", lubricant: "Dry. Apply RTV to rear main seal carrier-to-pan interface.", sequence: "Rear bolts first, then front and sides", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Oiling", fastener: "Oil Pan Bolts — Side/Front (M6)", ftLbs: "106 in-lbs", nm: "12", lubricant: "Dry", sequence: "After rear bolts", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Oiling", fastener: "Oil Pump Bolts", ftLbs: "18", nm: "24", lubricant: "Engine oil", sequence: "Tighten evenly — do not over-torque", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Oiling", fastener: "Oil Pump Screen/Pick-Up Tube Bolt", ftLbs: "18", nm: "24", lubricant: "Dry", sequence: "One pass", torqueToYield: false },

    // Accessory / Front Drive
    { engineId: id("LS3 6.2L"), category: "Accessory", fastener: "Harmonic Balancer / Crank Damper Bolt", ftLbs: "240", nm: "325", lubricant: "Engine oil on threads", sequence: "Use a crankshaft holding fixture. Apply oil, snug, then torque. One step.", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Accessory", fastener: "Flywheel / Flexplate Bolts (M10 x 6)", ftLbs: "74", nm: "100", lubricant: "Medium threadlocker", sequence: "Star pattern, three passes", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Accessory", fastener: "Timing Chain Cover Bolts — M8", ftLbs: "18", nm: "24", lubricant: "Dry", sequence: "Center outward", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Accessory", fastener: "Timing Chain Cover Bolts — M6", ftLbs: "106 in-lbs", nm: "12", lubricant: "Dry", sequence: "After M8 bolts", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Accessory", fastener: "Water Pump Bolts", ftLbs: "11", nm: "15", lubricant: "Dry", sequence: "Cross pattern", torqueToYield: false },
    { engineId: id("LS3 6.2L"), category: "Accessory", fastener: "Spark Plugs (AC Delco 41-110)", ftLbs: "11", nm: "15", lubricant: "Anti-seize if threads are bare — many plugs have pre-applied coating", sequence: "Hand-start in aluminum head to avoid cross-threading. Do not use impact wrench.", torqueToYield: false },

    // ════════════════════════════════════════════════
    // SBC 350 (4-bolt main) — Complete Fastener List
    // Applies to 1967–2002 Gen I small block Chevy 350
    // Source: Chevrolet Service Manual / GM Performance Parts Assembly Guide
    // ════════════════════════════════════════════════

    // Main / Bottom End
    { engineId: id("SBC 350 (4-bolt main)"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts — Inner (3/8-16, 2-bolt caps 1,2,4,5)", ftLbs: "70", nm: "95", lubricant: "Engine oil on threads and under bolt head", sequence: "Two-pass sequence: 35 > 70 ft-lbs, front to rear", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts — Inner (#3 cap, 4-bolt)", ftLbs: "70", nm: "95", lubricant: "Engine oil", sequence: "Same as other inner bolts — two passes", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts — Outer (#3 cap, 4-bolt outer bolts)", ftLbs: "65", nm: "88", lubricant: "Engine oil", sequence: "Torque after inner bolts are at full spec", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Main Bearing", fastener: "Rear Main Seal Retainer Bolts", ftLbs: "96 in-lbs", nm: "11", lubricant: "Dry — RTV on mating surfaces only", sequence: "Tighten in X-pattern", torqueToYield: false },

    // Connecting Rods
    { engineId: id("SBC 350 (4-bolt main)"), category: "Connecting Rod", fastener: "Connecting Rod Bolts — Stock 3/8\" (small journal)", ftLbs: "45", nm: "61", lubricant: "Engine oil", sequence: "Two passes: 30 > 45 ft-lbs. Rotate nuts, not bolts.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Connecting Rod", fastener: "Connecting Rod Bolts — Stock 7/16\" (large journal, later blocks)", ftLbs: "50", nm: "68", lubricant: "Engine oil", sequence: "Two passes: 25 > 50 ft-lbs. Check stretch if using ARP.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Connecting Rod", fastener: "Connecting Rod Bolts — ARP 3/8\" (200,000 psi), performance", ftLbs: "45", nm: "61", lubricant: "ARP Ultra-Torque (moly)", sequence: "With ARP moly lube. Check bolt stretch (0.0055\"–0.0065\") if using stretch gauge.", torqueToYield: false },

    // Cylinder Head
    { engineId: id("SBC 350 (4-bolt main)"), category: "Cylinder Head", fastener: "Cylinder Head Bolts — Short (3/8-16, 4 per head, outer row)", ftLbs: "65", nm: "88", lubricant: "Engine oil or Permatex #2 on steam holes", sequence: "Dry threads: three passes (25 > 45 > 65). Steam holes get sealer.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Cylinder Head", fastener: "Cylinder Head Bolts — Long (3/8-16, inner row)", ftLbs: "65", nm: "88", lubricant: "Engine oil or sealer on any bolt entering water jacket", sequence: "Same three-pass sequence as short bolts per GM firing order pattern", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Cylinder Head", fastener: "Cylinder Head Bolts — ARP 3/8\" (L19 or 8740)", ftLbs: "65-70", nm: "88-95", lubricant: "ARP Ultra-Torque on threads and under head", sequence: "Three passes, ARP recommended torque sequence per their spec sheet", torqueToYield: false },

    // Valvetrain
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", fastener: "Rocker Arm Studs (pressed-in, stock)", ftLbs: "50", nm: "68", lubricant: "Threadlocker (Loctite 262 or equivalent)", sequence: "Press or thread-in depending on style. Screw-in studs: clean threads, apply threadlocker.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", fastener: "Rocker Arm Nuts (stamped steel rockers)", ftLbs: "20", nm: "27", lubricant: "Engine oil", sequence: "Preload adjustment: zero lash, then 1–1.5 turns additional", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", fastener: "Valve Cover Bolts (OEM stamped steel)", ftLbs: "48 in-lbs", nm: "5.4", lubricant: "Dry", sequence: "Just snug — overtightening warps cheap covers. Aluminum aftermarket: 89 in-lbs.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", fastener: "Pushrod Guide Plates (if screw-in studs)", ftLbs: "20", nm: "27", lubricant: "Dry", sequence: "Torque studs, then seat guide plates before installing rockers", torqueToYield: false },

    // Intake / Exhaust
    { engineId: id("SBC 350 (4-bolt main)"), category: "Intake", fastener: "Intake Manifold Bolts — Steel (3/8-16, 12 bolts)", ftLbs: "25", nm: "34", lubricant: "RTV silicone at four corners of block. Dry on bolts.", sequence: "Three-pass star from center out: 10 > 20 > 25 ft-lbs. Vortec heads: 11 ft-lbs on center bolts.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Intake", fastener: "Intake Manifold Bolts — Aluminum (3/8-16, if used)", ftLbs: "25", nm: "34", lubricant: "Anti-seize on threads into aluminum", sequence: "Same star pattern, reduce final torque by 10% for aluminum intake", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Exhaust", fastener: "Exhaust Manifold Bolts — Stock Cast Iron (5/16-18)", ftLbs: "20", nm: "27", lubricant: "Anti-seize compound — critical for iron-to-iron contact", sequence: "Center first, outward. Re-torque on first cold start after heat cycle.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Exhaust", fastener: "Exhaust Manifold Bolts — Long Outer (5/16-18)", ftLbs: "20", nm: "27", lubricant: "Anti-seize", sequence: "Same as above", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Exhaust", fastener: "Header Bolts — ARP (stainless into iron head)", ftLbs: "25", nm: "34", lubricant: "ARP Ultra-Torque", sequence: "Center outward alternating pattern. Re-torque after first 10 heat cycles.", torqueToYield: false },

    // Oiling System
    { engineId: id("SBC 350 (4-bolt main)"), category: "Oiling", fastener: "Oil Pan Bolts (1/4-20, 15 bolts)", ftLbs: "12", nm: "16", lubricant: "Dry. RTV on gasket at corners.", sequence: "Start at center, work outward. Very easy to strip — use torque wrench.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Oiling", fastener: "Oil Pump Bolt (one center bolt, 5/16-18)", ftLbs: "65", nm: "88", lubricant: "Engine oil on threads", sequence: "Single bolt through pump into block — critical, do not under-torque", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Oiling", fastener: "Oil Pump Pick-Up Tube (braze or bolt-on depending on year)", ftLbs: "22", nm: "30", lubricant: "Dry (if bolt style)", sequence: "Ensure pick-up is within 1/4\" to 3/8\" of pan floor", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Oiling", fastener: "Drain Plug (magnetic preferred)", ftLbs: "20", nm: "27", lubricant: "Dry — do not use sealant on oil drain plug", sequence: "Hand-start to avoid stripping aluminum pan threads", torqueToYield: false },

    // Accessory / Front Drive
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Harmonic Balancer Bolt (7/16-20 or 1/2-20 depending on year)", ftLbs: "60", nm: "81", lubricant: "Engine oil on threads", sequence: "Use crank-hold tool or starter method. Apply Loc-Tite on key slot area.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Flywheel Bolts — Manual (7/16-20, 6 bolts)", ftLbs: "60", nm: "81", lubricant: "Threadlocker (medium strength)", sequence: "Star pattern, two passes", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Flexplate Bolts — Automatic (7/16-20, 6 bolts)", ftLbs: "60", nm: "81", lubricant: "Threadlocker", sequence: "Star pattern", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Timing Cover Bolts — Large (5/16-18)", ftLbs: "96 in-lbs", nm: "11", lubricant: "Dry. RTV on cover-to-pan area.", sequence: "Center outward. Replace front lip seal before installing cover.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Timing Cover Bolts — Small", ftLbs: "72 in-lbs", nm: "8", lubricant: "Dry", sequence: "After large bolts", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Water Pump Bolts (5/16-18)", ftLbs: "30", nm: "41", lubricant: "Thread sealant (enters water jacket)", sequence: "Cross pattern. Use sealant on bolts that enter coolant passages.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Spark Plugs (tapered seat, AC Delco R44T)", ftLbs: "22", nm: "30", lubricant: "Anti-seize if threads are bare. Iron head — safe to torque normally.", sequence: "Hand-start. Correct plug gap: 0.035\". Torque to spec; do not over-tighten.", torqueToYield: false },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Accessory", fastener: "Distributor Hold-Down Clamp Bolt", ftLbs: "20", nm: "27", lubricant: "Dry", sequence: "Set timing before final tighten. Recheck timing after torquing.", torqueToYield: false },

    // ════════════════════════════════════════════════
    // SBC 350 (2-bolt main) — same as 4-bolt except main caps
    // ════════════════════════════════════════════════
    { engineId: id("SBC 350 (2-bolt main)"), category: "Main Bearing", fastener: "Main Bearing Cap Bolts (2-bolt, 3/8-16, all caps)", ftLbs: "70", nm: "95", lubricant: "Engine oil on threads and under head", sequence: "Two-pass: 35 > 70 ft-lbs, front to rear. 2-bolt caps on all 5 main journals.", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Connecting Rod", fastener: "Connecting Rod Bolts (3/8\", small journal stock)", ftLbs: "45", nm: "61", lubricant: "Engine oil", sequence: "Two passes: 30 > 45 ft-lbs", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Cylinder Head", fastener: "Cylinder Head Bolts (3/8-16)", ftLbs: "65", nm: "88", lubricant: "Engine oil or sealer (steam holes)", sequence: "Three-pass sequence: 25 > 45 > 65 ft-lbs in factory pattern", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Intake", fastener: "Intake Manifold Bolts", ftLbs: "25", nm: "34", lubricant: "RTV at four corners, dry on bolts", sequence: "Three-pass from center outward: 10 > 20 > 25 ft-lbs", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Exhaust", fastener: "Exhaust Manifold Bolts", ftLbs: "20", nm: "27", lubricant: "Anti-seize", sequence: "Center outward", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Valvetrain", fastener: "Rocker Arm Nuts", ftLbs: "20", nm: "27", lubricant: "Engine oil", sequence: "Zero lash, then 1–1.5 turns preload", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Oiling", fastener: "Oil Pan Bolts", ftLbs: "12", nm: "16", lubricant: "Dry, RTV at corners", sequence: "Center outward", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Oiling", fastener: "Oil Pump Bolt", ftLbs: "65", nm: "88", lubricant: "Engine oil", sequence: "Single bolt — critical torque", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Accessory", fastener: "Harmonic Balancer Bolt", ftLbs: "60", nm: "81", lubricant: "Engine oil", sequence: "Use crank holding tool", torqueToYield: false },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Accessory", fastener: "Spark Plugs", ftLbs: "22", nm: "30", lubricant: "Anti-seize on bare threads", sequence: "Hand-start, then torque to spec", torqueToYield: false },

  ]);

  console.log("✅ Torque specs inserted.");

  // ─── CLEARANCE SPECS ──────────────────────────────────────────────────────
  await db.insert(clearanceSpecsTable).values([

    // ════════════════════════════════════════════════
    // LS1 5.7L — Complete Clearance Specs
    // ════════════════════════════════════════════════

    // Bearings
    { engineId: id("LS1 5.7L"), category: "Main Bearing", name: "Main Bearing Oil Clearance", factoryMin: "0.0007", factoryMax: "0.0021", performanceMin: "0.0018", performanceMax: "0.0025", unit: "inches", notes: "Tighter factory spec for quiet operation. Performance builders target 0.0018\"–0.0022\" for street builds. Drag race may run 0.003\"." },
    { engineId: id("LS1 5.7L"), category: "Rod Bearing", name: "Rod Bearing Oil Clearance", factoryMin: "0.0009", factoryMax: "0.0025", performanceMin: "0.0018", performanceMax: "0.0025", unit: "inches", notes: "Street performance: 0.0018\"–0.0022\". High-RPM builds (7500+): 0.0022\"–0.0025\". Use Plastigage or mic to verify." },
    { engineId: id("LS1 5.7L"), category: "Main Bearing", name: "Crankshaft End Play (Thrust)", factoryMin: "0.0015", factoryMax: "0.0078", performanceMin: "0.003", performanceMax: "0.006", unit: "inches", notes: "Check with dial indicator. Excessive end play (>0.010\") causes transmission wear on manual cars." },

    // Pistons
    { engineId: id("LS1 5.7L"), category: "Pistons", name: "Piston-to-Wall Clearance (OEM hypereutectic)", factoryMin: "0.0007", factoryMax: "0.0014", performanceMin: "0.002", performanceMax: "0.003", unit: "inches", notes: "Factory hypereutectic pistons need tight clearance. Forged pistons (for boost/nitrous) require 0.004\"–0.006\" depending on manufacturer." },
    { engineId: id("LS1 5.7L"), category: "Pistons", name: "Piston-to-Wall Clearance (Forged, street)", factoryMin: "0.003", factoryMax: "0.005", performanceMin: "0.004", performanceMax: "0.005", unit: "inches", notes: "Forged pistons expand more. JE/Wiseco street forged: 0.004\"–0.005\". Measure piston 90° from wrist pin, at skirt bottom." },
    { engineId: id("LS1 5.7L"), category: "Pistons", name: "Piston Pin (Wrist Pin) Clearance", factoryMin: "0.0003", factoryMax: "0.0005", performanceMin: "0.0005", performanceMax: "0.0008", unit: "inches", notes: "Full-floating pin: slight push-fit at room temp. Check at 70°F." },
    { engineId: id("LS1 5.7L"), category: "Pistons", name: "Deck Clearance (Piston to Deck at TDC)", factoryMin: "0.000", factoryMax: "0.004", performanceMin: "0.000", performanceMax: "0.010", unit: "inches", notes: "Factory: near flush (0.000\"–0.004\" in hole). Performance: match measured deck with head gasket selection for target CR." },

    // Piston Rings
    { engineId: id("LS1 5.7L"), category: "Piston Rings", name: "Top Ring End Gap (file-to-fit, 3.898\" bore)", factoryMin: "0.010", factoryMax: "0.020", performanceMin: "0.016", performanceMax: "0.020", unit: "inches", notes: "Factory: 0.010\"–0.020\". Street: 0.016\"–0.018\". Boost/nitrous: add 0.005\" per 100hp of nitrous. File rings square to bore." },
    { engineId: id("LS1 5.7L"), category: "Piston Rings", name: "Second Ring End Gap (3.898\" bore)", factoryMin: "0.016", factoryMax: "0.027", performanceMin: "0.020", performanceMax: "0.026", unit: "inches", notes: "Second ring gap should be 0.005\" larger than top ring gap minimum. Prevents blow-by on seating." },
    { engineId: id("LS1 5.7L"), category: "Piston Rings", name: "Oil Ring End Gap (3-piece oil ring)", factoryMin: "0.010", factoryMax: "0.030", performanceMin: "0.015", performanceMax: "0.025", unit: "inches", notes: "Oil ring gap is generous by design. Ensure rails are not binding in groove." },
    { engineId: id("LS1 5.7L"), category: "Piston Rings", name: "Top Ring Side Clearance (ring-to-groove)", factoryMin: "0.0016", factoryMax: "0.0037", performanceMin: "0.0016", performanceMax: "0.003", unit: "inches", notes: "Excessive side clearance causes ring flutter and oil consumption at high RPM." },
    { engineId: id("LS1 5.7L"), category: "Piston Rings", name: "Second Ring Side Clearance", factoryMin: "0.0012", factoryMax: "0.0033", performanceMin: "0.0012", performanceMax: "0.0028", unit: "inches", notes: "Check with ring in bore and feeler gauge." },

    // Valvetrain
    { engineId: id("LS1 5.7L"), category: "Valvetrain", name: "Valve Stem-to-Guide Clearance (Intake)", factoryMin: "0.001", factoryMax: "0.0027", performanceMin: "0.0010", performanceMax: "0.0020", unit: "inches", notes: "LS heads use Viton valve seals and close guide tolerances. Replace guides if clearance exceeds 0.004\"." },
    { engineId: id("LS1 5.7L"), category: "Valvetrain", name: "Valve Stem-to-Guide Clearance (Exhaust)", factoryMin: "0.001", factoryMax: "0.0027", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", notes: "Exhaust runs slightly hotter — slightly looser spec acceptable. Over 0.004\" causes valve seal blowout." },
    { engineId: id("LS1 5.7L"), category: "Valvetrain", name: "Valve Seat Runout (TIR)", factoryMin: "0.000", factoryMax: "0.0020", performanceMin: "0.000", performanceMax: "0.001", unit: "inches", notes: "Measured with dial indicator. Performance valve jobs target under 0.001\" TIR." },
    { engineId: id("LS1 5.7L"), category: "Valvetrain", name: "Camshaft Journal Clearance", factoryMin: "0.0010", factoryMax: "0.0030", performanceMin: "0.001", performanceMax: "0.0025", unit: "inches", notes: "LS cam runs in block bearings. Excessive clearance causes cam walk and timing chain noise." },

    // Crankshaft / Block
    { engineId: id("LS1 5.7L"), category: "Crankshaft", name: "Crankshaft Main Journal Diameter (stock)", factoryMin: "2.5585", factoryMax: "2.5592", performanceMin: "2.5585", performanceMax: "2.5592", unit: "inches", notes: "Nominal: 2.5590\". Grind undersize if out of round by more than 0.0002\"." },
    { engineId: id("LS1 5.7L"), category: "Crankshaft", name: "Crankshaft Rod Journal Diameter (stock)", factoryMin: "2.0985", factoryMax: "2.0995", performanceMin: "2.0985", performanceMax: "2.0995", unit: "inches", notes: "Nominal: 2.0990\". Inspect for taper and out-of-round; regrind if worn." },
    { engineId: id("LS1 5.7L"), category: "Crankshaft", name: "Crankshaft Journal Out-of-Round (max)", factoryMin: "0.000", factoryMax: "0.0002", performanceMin: "0.000", performanceMax: "0.0001", unit: "inches", notes: "Out-of-round above 0.0002\" requires crank regrind." },

    // ════════════════════════════════════════════════
    // LS3 6.2L — Complete Clearance Specs
    // ════════════════════════════════════════════════

    // Bearings
    { engineId: id("LS3 6.2L"), category: "Main Bearing", name: "Main Bearing Oil Clearance", factoryMin: "0.0009", factoryMax: "0.0025", performanceMin: "0.0018", performanceMax: "0.0025", unit: "inches", notes: "LS3 factory spec is slightly looser than LS1 due to larger crank. Performance: 0.0020\"–0.0023\" for street use." },
    { engineId: id("LS3 6.2L"), category: "Rod Bearing", name: "Rod Bearing Oil Clearance", factoryMin: "0.0009", factoryMax: "0.0025", performanceMin: "0.0018", performanceMax: "0.0025", unit: "inches", notes: "Same as LS1 rod clearance. Street builds: 0.0020\". Race builds: 0.0025\"." },
    { engineId: id("LS3 6.2L"), category: "Main Bearing", name: "Crankshaft End Play (Thrust)", factoryMin: "0.0015", factoryMax: "0.0078", performanceMin: "0.003", performanceMax: "0.006", unit: "inches", notes: "Same spec as LS1. Check with dial indicator at #5 main bearing." },

    // Pistons
    { engineId: id("LS3 6.2L"), category: "Pistons", name: "Piston-to-Wall Clearance (OEM hypereutectic, 4.065\" bore)", factoryMin: "0.0008", factoryMax: "0.0016", performanceMin: "0.002", performanceMax: "0.003", unit: "inches", notes: "LS3 uses a 4.065\" bore. OEM hypereutectic pistons: 0.0008\"–0.0016\". Forged for boost: 0.004\"–0.006\"." },
    { engineId: id("LS3 6.2L"), category: "Pistons", name: "Piston-to-Wall Clearance (Forged aftermarket)", factoryMin: "0.003", factoryMax: "0.005", performanceMin: "0.004", performanceMax: "0.006", unit: "inches", notes: "Varies by piston manufacturer. Always follow piston maker's spec sheet." },
    { engineId: id("LS3 6.2L"), category: "Pistons", name: "Piston Pin Clearance (full-floating)", factoryMin: "0.0003", factoryMax: "0.0005", performanceMin: "0.0005", performanceMax: "0.0008", unit: "inches", notes: "Should push through at 70°F with thumb pressure. Shake fit at temperature." },
    { engineId: id("LS3 6.2L"), category: "Pistons", name: "Deck Clearance at TDC", factoryMin: "0.000", factoryMax: "0.004", performanceMin: "0.000", performanceMax: "0.008", unit: "inches", notes: "Measure with deck bridge and dial indicator. Combined with head gasket thickness sets compression ratio." },

    // Piston Rings
    { engineId: id("LS3 6.2L"), category: "Piston Rings", name: "Top Ring End Gap (4.065\" bore, file-to-fit)", factoryMin: "0.010", factoryMax: "0.020", performanceMin: "0.017", performanceMax: "0.022", unit: "inches", notes: "Use bore gauge to verify actual bore, calculate gap accordingly. Rule: 0.004\" per inch of bore diameter for street. 0.005–0.006\" for boost." },
    { engineId: id("LS3 6.2L"), category: "Piston Rings", name: "Second Ring End Gap (4.065\" bore)", factoryMin: "0.016", factoryMax: "0.027", performanceMin: "0.020", performanceMax: "0.028", unit: "inches", notes: "Second ring gap: top ring gap + 0.005\" minimum. Helps manage combustion gas pressure." },
    { engineId: id("LS3 6.2L"), category: "Piston Rings", name: "Oil Ring End Gap (3-piece expander)", factoryMin: "0.010", factoryMax: "0.030", performanceMin: "0.015", performanceMax: "0.025", unit: "inches", notes: "Rails should not butt together at minimum gap. Verify expander fits groove freely." },
    { engineId: id("LS3 6.2L"), category: "Piston Rings", name: "Top Ring Side Clearance", factoryMin: "0.0016", factoryMax: "0.0037", performanceMin: "0.0016", performanceMax: "0.003", unit: "inches", notes: "Measure with ring fully seated in groove. Tight grooves cause ring stick; loose causes flutter." },

    // Valvetrain
    { engineId: id("LS3 6.2L"), category: "Valvetrain", name: "Valve Stem-to-Guide Clearance (Intake)", factoryMin: "0.001", factoryMax: "0.0027", performanceMin: "0.0010", performanceMax: "0.0020", unit: "inches", notes: "LS3 rectangular-port heads. Aftermarket guides often run tighter for high-lift cam use." },
    { engineId: id("LS3 6.2L"), category: "Valvetrain", name: "Valve Stem-to-Guide Clearance (Exhaust)", factoryMin: "0.001", factoryMax: "0.0027", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", notes: "Exhaust side runs hotter. Performance seal spec." },
    { engineId: id("LS3 6.2L"), category: "Valvetrain", name: "Camshaft Bearing Clearance", factoryMin: "0.001", factoryMax: "0.003", performanceMin: "0.001", performanceMax: "0.0025", unit: "inches", notes: "LS3 camshaft runs in replaceable bearings in block. Use cam bearing driver for installation." },

    // Crankshaft
    { engineId: id("LS3 6.2L"), category: "Crankshaft", name: "Main Journal Diameter (nominal)", factoryMin: "2.5585", factoryMax: "2.5592", performanceMin: "2.5585", performanceMax: "2.5592", unit: "inches", notes: "Same main journal as LS1. LS3 has larger bore but same main journal diameter." },
    { engineId: id("LS3 6.2L"), category: "Crankshaft", name: "Rod Journal Diameter (nominal)", factoryMin: "2.0985", factoryMax: "2.0995", performanceMin: "2.0985", performanceMax: "2.0995", unit: "inches", notes: "Measure in two planes. Journal taper over 0.0002\" per inch requires grinding." },

    // ════════════════════════════════════════════════
    // SBC 350 (4-bolt main) — Complete Clearance Specs
    // ════════════════════════════════════════════════

    // Bearings
    { engineId: id("SBC 350 (4-bolt main)"), category: "Main Bearing", name: "Main Bearing Oil Clearance", factoryMin: "0.0008", factoryMax: "0.0020", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", notes: "Stock: 0.001\"–0.002\". Performance street: 0.0015\"–0.002\". High-RPM performance: 0.002\"–0.0025\". Use Plastigage or micrometer." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Rod Bearing", name: "Rod Bearing Oil Clearance", factoryMin: "0.0013", factoryMax: "0.0035", performanceMin: "0.0018", performanceMax: "0.0028", unit: "inches", notes: "Factory range is wide. Performance: 0.0018\"–0.0022\". Tighter clearance needs higher oil viscosity." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Main Bearing", name: "Crankshaft End Play (Thrust at #5 main)", factoryMin: "0.002", factoryMax: "0.006", performanceMin: "0.003", performanceMax: "0.005", unit: "inches", notes: "Measure with feeler gauge at #5 thrust bearing. Excessive end play from worn thrust faces." },

    // Pistons
    { engineId: id("SBC 350 (4-bolt main)"), category: "Pistons", name: "Piston-to-Wall Clearance (Cast iron stock piston)", factoryMin: "0.0007", factoryMax: "0.0017", performanceMin: "0.001", performanceMax: "0.002", unit: "inches", notes: "Stock cast iron pistons run tight. Hypereutectic: 0.001\"–0.002\". Forged pistons need 0.004\"–0.006\"." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Pistons", name: "Piston-to-Wall Clearance (Forged performance)", factoryMin: "0.004", factoryMax: "0.006", performanceMin: "0.004", performanceMax: "0.006", unit: "inches", notes: "Forged pistons expand significantly under heat. Always follow piston manufacturer spec — varies by alloy and design." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Pistons", name: "Piston Pin Clearance (press-fit, OEM)", factoryMin: "0.0000", factoryMax: "0.0003", performanceMin: "0.0000", performanceMax: "0.0002", unit: "inches", notes: "Stock SBC uses press-fit pin to rod. Full-float conversion (w/ wire locks) requires 0.0005\"–0.0008\" clearance." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Pistons", name: "Deck Clearance at TDC", factoryMin: "0.000", factoryMax: "0.025", performanceMin: "0.000", performanceMax: "0.010", unit: "inches", notes: "Stock: piston slightly below deck (0.010\"–0.025\" in hole). Performance: 0.005\" or zero deck for max compression." },

    // Piston Rings
    { engineId: id("SBC 350 (4-bolt main)"), category: "Piston Rings", name: "Top Ring End Gap (4.000\" bore, standard)", factoryMin: "0.010", factoryMax: "0.020", performanceMin: "0.016", performanceMax: "0.020", unit: "inches", notes: "Street rule: 0.004\" × bore diameter = minimum gap. 4.000\" bore → 0.016\". File-fit recommended for performance use." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Piston Rings", name: "Top Ring End Gap (4.030\" overbore)", factoryMin: "0.010", factoryMax: "0.020", performanceMin: "0.016", performanceMax: "0.022", unit: "inches", notes: "0.030\" overbore is most common SBC rebuild size. Use 0.016\"–0.018\" for naturally aspirated, 0.020\"–0.024\" for boost." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Piston Rings", name: "Second Ring End Gap (4.000\" bore)", factoryMin: "0.013", factoryMax: "0.023", performanceMin: "0.018", performanceMax: "0.024", unit: "inches", notes: "Second ring: wider gap than top ring. Helps combustion gases bypass top ring without blowing past second ring groove." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Piston Rings", name: "Oil Ring End Gap (3-piece expander)", factoryMin: "0.015", factoryMax: "0.055", performanceMin: "0.015", performanceMax: "0.035", unit: "inches", notes: "Wide factory spec. Rails must not butt together. Check both rails." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Piston Rings", name: "Top Ring Side Clearance (ring groove)", factoryMin: "0.0012", factoryMax: "0.0032", performanceMin: "0.0015", performanceMax: "0.003", unit: "inches", notes: "Worn grooves increase side clearance — causes ring flutter at high RPM and oil consumption." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Piston Rings", name: "Second Ring Side Clearance", factoryMin: "0.0012", factoryMax: "0.0032", performanceMin: "0.0012", performanceMax: "0.0028", unit: "inches", notes: "Check with new ring and feeler gauge." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Piston Rings", name: "Oil Ring Side Clearance", factoryMin: "0.0005", factoryMax: "0.0075", performanceMin: "0.0005", performanceMax: "0.004", unit: "inches", notes: "Rails should move freely in groove without binding." },

    // Valvetrain
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", name: "Valve Stem-to-Guide Clearance (Intake)", factoryMin: "0.001", factoryMax: "0.0027", performanceMin: "0.001", performanceMax: "0.002", unit: "inches", notes: "Iron SBC guides. Worn guide shows 0.006\"+ — causes blue smoke at idle. Use knurling or bronze insert to repair." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", name: "Valve Stem-to-Guide Clearance (Exhaust)", factoryMin: "0.001", factoryMax: "0.0037", performanceMin: "0.0015", performanceMax: "0.003", unit: "inches", notes: "Exhaust runs looser than intake due to heat expansion. Worn: 0.005\"+ on exhaust causes valve seal failure." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", name: "Valve Face-to-Seat Width (intake)", factoryMin: "0.060", factoryMax: "0.090", performanceMin: "0.060", performanceMax: "0.080", unit: "inches", notes: "Seat width affects heat transfer and flow. Narrow seat (0.040\"–0.060\") improves flow but reduces durability." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", name: "Valve Face-to-Seat Width (exhaust)", factoryMin: "0.070", factoryMax: "0.090", performanceMin: "0.070", performanceMax: "0.090", unit: "inches", notes: "Exhaust seats need wider contact for heat dissipation — exhaust valve runs hotter than intake." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", name: "Camshaft Journal-to-Bore Clearance", factoryMin: "0.001", factoryMax: "0.003", performanceMin: "0.001", performanceMax: "0.0025", unit: "inches", notes: "SBC cam runs in block bores (no separate bearing shells). Worn cam bores need bushing installation." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Valvetrain", name: "Pushrod Runout (max straight)", factoryMin: "0.000", factoryMax: "0.002", performanceMin: "0.000", performanceMax: "0.001", unit: "inches", notes: "Roll on a flat surface. Bent pushrods cause valvetrain noise and inconsistent rocker geometry." },

    // Crankshaft / Block
    { engineId: id("SBC 350 (4-bolt main)"), category: "Crankshaft", name: "Main Journal Diameter (standard, 1968+)", factoryMin: "2.4479", factoryMax: "2.4485", performanceMin: "2.4479", performanceMax: "2.4485", unit: "inches", notes: "Nominal 2.448\". Undersize bearings: 0.001\", 0.010\", 0.020\", 0.030\". Measure in-place with mic for taper/out-of-round." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Crankshaft", name: "Rod Journal Diameter (standard, 1968+)", factoryMin: "2.0978", factoryMax: "2.0988", performanceMin: "2.0978", performanceMax: "2.0988", unit: "inches", notes: "Nominal 2.098\". Measure in two perpendicular planes. Taper or out-of-round >0.0002\" requires grinding." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Crankshaft", name: "Crankshaft Journal Out-of-Round (max allowable)", factoryMin: "0.000", factoryMax: "0.0002", performanceMin: "0.000", performanceMax: "0.0001", unit: "inches", notes: "Factory: 0.0002\" max. Performance: must be within 0.0001\". Beyond this causes rapid bearing wear." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Crankshaft", name: "Crankshaft Journal Taper (max per inch)", factoryMin: "0.000", factoryMax: "0.0002", performanceMin: "0.000", performanceMax: "0.0001", unit: "inches", notes: "Taper causes uneven bearing load. Grind if beyond 0.0002\" per inch of journal length." },

    // Cylinder Bores
    { engineId: id("SBC 350 (4-bolt main)"), category: "Cylinder Bore", name: "Cylinder Bore Out-of-Round (max)", factoryMin: "0.000", factoryMax: "0.001", performanceMin: "0.000", performanceMax: "0.0005", unit: "inches", notes: "Measure in two perpendicular planes at top of bore. Out-of-round >0.001\" requires boring." },
    { engineId: id("SBC 350 (4-bolt main)"), category: "Cylinder Bore", name: "Cylinder Bore Taper (max top-to-bottom)", factoryMin: "0.000", factoryMax: "0.001", performanceMin: "0.000", performanceMax: "0.0005", unit: "inches", notes: "Taper at ring reversal point. Worn bores have ridge at top — remove before disassembly." },

    // SBC 350 (2-bolt main) — key clearances
    { engineId: id("SBC 350 (2-bolt main)"), category: "Main Bearing", name: "Main Bearing Oil Clearance", factoryMin: "0.0008", factoryMax: "0.0020", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", notes: "Same spec as 4-bolt. 2-bolt caps acceptable to ~400 hp normally aspirated." },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Rod Bearing", name: "Rod Bearing Oil Clearance", factoryMin: "0.0013", factoryMax: "0.0035", performanceMin: "0.0018", performanceMax: "0.0028", unit: "inches", notes: "Same rod journal and spec as 4-bolt version." },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Pistons", name: "Piston-to-Wall Clearance (cast stock)", factoryMin: "0.0007", factoryMax: "0.0017", performanceMin: "0.001", performanceMax: "0.002", unit: "inches", notes: "Identical piston clearance to 4-bolt — same bore, same pistons." },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Piston Rings", name: "Top Ring End Gap (4.000\" bore)", factoryMin: "0.010", factoryMax: "0.020", performanceMin: "0.016", performanceMax: "0.020", unit: "inches", notes: "Same bore size as 4-bolt. Standard file-fit gap rules apply." },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Valvetrain", name: "Valve Stem-to-Guide Clearance (Intake)", factoryMin: "0.001", factoryMax: "0.0027", performanceMin: "0.001", performanceMax: "0.002", unit: "inches", notes: "Iron guides — same as 4-bolt block heads." },
    { engineId: id("SBC 350 (2-bolt main)"), category: "Main Bearing", name: "Crankshaft End Play", factoryMin: "0.002", factoryMax: "0.006", performanceMin: "0.003", performanceMax: "0.005", unit: "inches", notes: "Same crankshaft as 4-bolt engine." },

  ]);

  console.log("✅ Clearance specs inserted.");
  console.log("Seeding complete!");
}

seedLsSbc().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
