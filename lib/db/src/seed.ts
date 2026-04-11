import { db } from "./index.js";
import {
  engineFamiliesTable, enginesTable, torqueSpecsTable, clearanceSpecsTable,
  castingNumbersTable, articlesTable, shopsTable, shopPricingTable
} from "./schema/index.js";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Clear in reverse dependency order
  await db.execute(sql`TRUNCATE shop_pricing, shops, articles, casting_numbers, clearance_specs, torque_specs, engines, engine_families RESTART IDENTITY CASCADE`);

  // Engine Families
  const families = await db.insert(engineFamiliesTable).values([
    { slug: "ls-series", name: "GM LS Series", manufacturer: "General Motors", description: "The modern small-block V8 from GM, produced from 1997 to present. The LS platform is the dominant choice for performance swaps due to its power density, lightweight aluminum construction, and extensive aftermarket support." },
    { slug: "gm-sbc", name: "GM Small Block Chevy", manufacturer: "General Motors", description: "The original small block, produced from 1955 to 2003. The most produced engine in history with over 100 million units built. Unmatched aftermarket depth." },
    { slug: "gm-bbc", name: "GM Big Block Chevy", manufacturer: "General Motors", description: "Produced from 1958 to 2009, the big block Chevy is the torque-first choice for heavy vehicles, boats, and high-powered drag applications. Available in many displacements from 366 to 572 CID." },
    { slug: "ford-sb", name: "Ford Small Block Windsor / Cleveland", manufacturer: "Ford Motor Company", description: "The Ford small block series, produced from 1962 to 2004. The Windsor and Cleveland variants share the same block architecture. Known for excellent head flow potential and extensive aftermarket." },
    { slug: "ford-modular", name: "Ford Modular / Coyote", manufacturer: "Ford Motor Company", description: "Ford's overhead-cam V8 family produced from 1991 to present. The 4.6L and 5.4L modular engines power millions of Mustangs, F-150s, and police vehicles. The 5.0 Coyote (2011+) is the high-performance variant." },
    { slug: "toyota-jz", name: "Toyota JZ Series", manufacturer: "Toyota Motor Corporation", description: "Toyota's inline-6 family produced from 1990 to 2007. The 2JZ-GTE in particular is renowned for its strength and tuning potential, having powered many high-profile drag and time-attack builds." },
    { slug: "honda-k", name: "Honda K-Series", manufacturer: "Honda Motor Company", description: "Honda's modern 4-cylinder DOHC i-VTEC engine family, produced from 2001 to present. The K20 and K24 variants are favorites for track builds due to their revving capability and aftermarket support." },
  ]).returning();

  const familyMap = new Map(families.map(f => [f.slug, f.id]));

  // Engines
  const engines = await db.insert(enginesTable).values([
    // LS Series
    { familyId: familyMap.get("ls-series")!, name: "LS1 5.7L", slug: "ls1", years: "1997–2004", displacement: "5.7L (346 ci)", bore: "3.898\"", stroke: "3.622\"", compression: "10.1:1", horsepower: "350", torque: "365", firingOrder: "1-8-7-2-6-5-4-3", rodLength: "6.098\"", rodRatio: "3.37", deckHeight: "9.240\"", applications: "Corvette C5, Camaro (1998–2002), Firebird (1998–2002)", isPopular: 1 },
    { familyId: familyMap.get("ls-series")!, name: "LS3 6.2L", years: "2008–2017", displacement: "6.2L (376 ci)", bore: "4.065\"", stroke: "3.622\"", compression: "10.7:1", horsepower: "430", torque: "424", firingOrder: "1-8-7-2-6-5-4-3", rodLength: "6.098\"", rodRatio: "3.37", deckHeight: "9.240\"", applications: "Corvette C6 (2008+), Camaro SS (2010+)", isPopular: 1 },
    { familyId: familyMap.get("ls-series")!, name: "LS7 7.0L", years: "2006–2014", displacement: "7.0L (427 ci)", bore: "4.125\"", stroke: "4.000\"", compression: "11.0:1", horsepower: "505", torque: "470", firingOrder: "1-8-7-2-6-5-4-3", rodLength: "6.067\"", rodRatio: "3.03", deckHeight: "9.240\"", applications: "Corvette Z06 (2006–2014)", isPopular: 1 },
    // SBC
    { familyId: familyMap.get("gm-sbc")!, name: "SBC 350 (2-bolt main)", years: "1967–2003", displacement: "5.7L (350 ci)", bore: "4.000\"", stroke: "3.480\"", compression: "8.5:1", horsepower: "145", torque: "255", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "5.700\"", rodRatio: "3.28", deckHeight: "9.025\"", applications: "Chevrolet C/K Truck, Camaro, Monte Carlo, Nova", isPopular: 1 },
    { familyId: familyMap.get("gm-sbc")!, name: "SBC 350 (4-bolt main)", slug: "sbc350", years: "1970–2003", displacement: "5.7L (350 ci)", bore: "4.000\"", stroke: "3.480\"", compression: "9.0:1", horsepower: "175", torque: "270", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "5.700\"", rodRatio: "3.28", deckHeight: "9.025\"", applications: "High-performance Camaros and Corvettes", isPopular: 1 },
    { familyId: familyMap.get("gm-sbc")!, name: "SBC 383 Stroker", years: "Custom Build", displacement: "6.3L (383 ci)", bore: "4.030\"", stroke: "3.750\"", compression: "9.5:1", horsepower: "400", torque: "430", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "6.000\"", rodRatio: "3.20", deckHeight: "9.025\"", applications: "Aftermarket/performance build — 350 block with custom crank" },
    // BBC
    { familyId: familyMap.get("gm-bbc")!, name: "BBC 454", years: "1970–2000", displacement: "7.4L (454 ci)", bore: "4.251\"", stroke: "4.000\"", compression: "8.5:1", horsepower: "360", torque: "500", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "6.535\"", rodRatio: "3.27", deckHeight: "9.800\"", applications: "Chevrolet C/K Heavy Duty, Corvette (1970–1971), Chevelle", isPopular: 1 },
    // Ford SB
    { familyId: familyMap.get("ford-sb")!, name: "Ford 302 Windsor", years: "1968–2001", displacement: "4.9L (302 ci)", bore: "4.000\"", stroke: "3.000\"", compression: "9.0:1", horsepower: "220", torque: "300", firingOrder: "1-5-4-2-6-3-7-8", rodLength: "5.090\"", rodRatio: "3.39", deckHeight: "8.206\"", applications: "Mustang, F-150, Bronco, Maverick", isPopular: 1 },
    { familyId: familyMap.get("ford-sb")!, name: "Ford 351 Windsor", years: "1969–2004", displacement: "5.8L (351 ci)", bore: "4.000\"", stroke: "3.500\"", compression: "9.0:1", horsepower: "250", torque: "350", firingOrder: "1-3-7-2-6-5-4-8", rodLength: "5.956\"", rodRatio: "3.40", deckHeight: "9.503\"", applications: "Mustang, F-150, F-250, Bronco, Crown Victoria" },
    // Ford Modular
    { familyId: familyMap.get("ford-modular")!, name: "5.0L Coyote (Ti-VCT)", slug: "coyote50", years: "2011–present", displacement: "5.0L (302 ci)", bore: "3.630\"", stroke: "3.660\"", compression: "11.0:1", horsepower: "412", torque: "390", firingOrder: "1-5-4-2-6-3-7-8", rodLength: "5.933\"", rodRatio: "3.24", deckHeight: "8.937\"", applications: "Mustang GT (2011+)", isPopular: 1 },
    // Toyota JZ
    { familyId: familyMap.get("toyota-jz")!, name: "2JZ-GTE", years: "1991–2007", displacement: "3.0L (183 ci)", bore: "3.386\"", stroke: "3.386\"", compression: "8.5:1", horsepower: "320", torque: "315", firingOrder: "1-5-3-6-2-4", rodLength: "5.709\"", rodRatio: "3.37", applications: "Toyota Supra A80 (JDM 1993–2002), Aristo", isPopular: 1 },
    // Honda K
    { familyId: familyMap.get("honda-k")!, name: "K20A2", years: "2002–2005", displacement: "2.0L (122 ci)", bore: "3.386\"", stroke: "3.386\"", compression: "11.0:1", horsepower: "200", torque: "142", firingOrder: "1-3-4-2", rodLength: "5.394\"", rodRatio: "3.19", applications: "Acura RSX Type-S (2002–2005)", isPopular: 1 },
  ]).returning();

  const engineMap = new Map(engines.map(e => [e.name, e.id]));

  // Torque Specs
  await db.insert(torqueSpecsTable).values([
    // LS1
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Main Bearing Cap Bolts (inner)", ftLbs: "77", nm: "105", lubricant: "Engine Oil", sequence: "Torque in sequence", torqueToYield: false, category: "Main" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Main Bearing Cap Bolts (outer)", ftLbs: "37", nm: "50", lubricant: "Engine Oil", sequence: "After inner bolts", torqueToYield: false, category: "Main" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Connecting Rod Bolts", ftLbs: "15 + 75°", nm: "20 + 75°", lubricant: "Engine Oil", sequence: "15 ft-lbs then 75° turn", torqueToYield: true, category: "Connecting Rod" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Cylinder Head Bolts (large / M11)", ftLbs: "22 + 90° + 90°", nm: "30 + 90° + 90°", lubricant: "Engine Oil", sequence: "22 ft-lbs, then 90°, then another 90°", torqueToYield: true, category: "Cylinder Head" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Cylinder Head Bolts (small / M8)", ftLbs: "22", nm: "30", lubricant: "Engine Oil", sequence: "After M11 bolts", torqueToYield: false, category: "Cylinder Head" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Intake Manifold Bolts", ftLbs: "89 in-lbs", nm: "10", lubricant: "Dry", sequence: "Three passes, center outward", torqueToYield: false, category: "Intake" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Exhaust Manifold Bolts", ftLbs: "15", nm: "20", lubricant: "Dry", sequence: "Tighten from center outward", torqueToYield: false, category: "Exhaust" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Rocker Arm Bolts (Valve Cover side)", ftLbs: "22", nm: "30", lubricant: "Engine Oil", sequence: "Torque with lifter on base circle", torqueToYield: false, category: "Valvetrain" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Oil Pan Bolts", ftLbs: "18", nm: "24", lubricant: "Dry", sequence: "Outer bolts first", torqueToYield: false, category: "Oiling" },
    { engineId: engineMap.get("LS1 5.7L")!, fastener: "Harmonic Balancer Bolt", ftLbs: "240", nm: "325", lubricant: "Engine Oil", sequence: "One torque step", torqueToYield: false, category: "Accessory" },
    // SBC 350
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Main Bearing Cap Bolts (2-bolt)", ftLbs: "70", nm: "95", lubricant: "Engine Oil", sequence: "Torque evenly", torqueToYield: false, category: "Main" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Main Bearing Cap Bolts (4-bolt outer)", ftLbs: "65", nm: "88", lubricant: "Engine Oil", sequence: "After inner bolts", torqueToYield: false, category: "Main" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Connecting Rod Bolts", ftLbs: "45", nm: "61", lubricant: "Engine Oil", sequence: "Two passes", torqueToYield: false, category: "Connecting Rod" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Cylinder Head Bolts", ftLbs: "65", nm: "88", lubricant: "Engine Oil or Sealer (steam holes)", sequence: "Three-pass sequence: 25 > 45 > 65", torqueToYield: false, category: "Cylinder Head" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Intake Manifold Bolts", ftLbs: "25", nm: "34", lubricant: "RTV at corners, no sealer on bolts", sequence: "Three passes from center", torqueToYield: false, category: "Intake" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Exhaust Manifold Bolts", ftLbs: "20", nm: "27", lubricant: "Anti-seize", sequence: "Center outward", torqueToYield: false, category: "Exhaust" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Harmonic Balancer Bolt", ftLbs: "60", nm: "81", lubricant: "Engine Oil", sequence: "One pass with thread-locker on balancer key area", torqueToYield: false, category: "Accessory" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, fastener: "Oil Pan Bolts", ftLbs: "12", nm: "16", lubricant: "Dry", sequence: "Do not overtighten — strip easily", torqueToYield: false, category: "Oiling" },
    // Ford 302
    { engineId: engineMap.get("Ford 302 Windsor")!, fastener: "Main Bearing Cap Bolts", ftLbs: "95-105", nm: "129-142", lubricant: "Engine Oil", sequence: "Torque in sequence", torqueToYield: false, category: "Main" },
    { engineId: engineMap.get("Ford 302 Windsor")!, fastener: "Connecting Rod Bolts", ftLbs: "19-24", nm: "26-33", lubricant: "Engine Oil", sequence: "Two passes", torqueToYield: false, category: "Connecting Rod" },
    { engineId: engineMap.get("Ford 302 Windsor")!, fastener: "Cylinder Head Bolts", ftLbs: "65-72", nm: "88-98", lubricant: "Engine Oil", sequence: "Three-pass sequence", torqueToYield: false, category: "Cylinder Head" },
    { engineId: engineMap.get("Ford 302 Windsor")!, fastener: "Intake Manifold Bolts", ftLbs: "23-25", nm: "31-34", lubricant: "Engine oil or sealant on coolant passage bolts", sequence: "Star pattern from center", torqueToYield: false, category: "Intake" },
    { engineId: engineMap.get("Ford 302 Windsor")!, fastener: "Harmonic Balancer Bolt", ftLbs: "70-90", nm: "95-122", lubricant: "Engine Oil", sequence: "One pass", torqueToYield: false, category: "Accessory" },
    // 2JZ-GTE
    { engineId: engineMap.get("2JZ-GTE")!, fastener: "Main Bearing Cap Bolts", ftLbs: "66", nm: "90", lubricant: "Engine Oil", sequence: "Three passes: 22 > 44 > 66 ft-lbs", torqueToYield: false, category: "Main" },
    { engineId: engineMap.get("2JZ-GTE")!, fastener: "Connecting Rod Bolts", ftLbs: "42", nm: "57", lubricant: "Engine Oil", sequence: "Two passes", torqueToYield: false, category: "Connecting Rod" },
    { engineId: engineMap.get("2JZ-GTE")!, fastener: "Cylinder Head Bolts", ftLbs: "22 + 90°", nm: "29 + 90°", lubricant: "Engine Oil", sequence: "22 ft-lbs then 90° turn (TTY — replace after removal)", torqueToYield: true, category: "Cylinder Head" },
    { engineId: engineMap.get("2JZ-GTE")!, fastener: "Intake Manifold Bolts", ftLbs: "20", nm: "27", lubricant: "Dry", sequence: "Cross pattern", torqueToYield: false, category: "Intake" },
    { engineId: engineMap.get("2JZ-GTE")!, fastener: "Camshaft Cap Bolts (M8)", ftLbs: "14", nm: "19", lubricant: "Engine Oil", sequence: "Tighten in steps, uniformly", torqueToYield: false, category: "Valvetrain" },
  ]);

  // Clearance Specs
  await db.insert(clearanceSpecsTable).values([
    // LS1
    { engineId: engineMap.get("LS1 5.7L")!, name: "Main Bearing Clearance", factoryMin: "0.0007", factoryMax: "0.0021", performanceMin: "0.0018", performanceMax: "0.0025", unit: "inches", category: "Main Bearing" },
    { engineId: engineMap.get("LS1 5.7L")!, name: "Rod Bearing Clearance", factoryMin: "0.0009", factoryMax: "0.0025", performanceMin: "0.0018", performanceMax: "0.0025", unit: "inches", category: "Rod Bearing" },
    { engineId: engineMap.get("LS1 5.7L")!, name: "Crankshaft End Play", factoryMin: "0.0015", factoryMax: "0.0078", performanceMin: "0.003", performanceMax: "0.006", unit: "inches", category: "Crankshaft" },
    { engineId: engineMap.get("LS1 5.7L")!, name: "Piston-to-Wall Clearance", factoryMin: "0.0007", factoryMax: "0.0014", performanceMin: "0.002", performanceMax: "0.003", unit: "inches", category: "Pistons" },
    { engineId: engineMap.get("LS1 5.7L")!, name: "Top Ring End Gap", factoryMin: "0.010", factoryMax: "0.020", performanceMin: "0.016", performanceMax: "0.020", unit: "inches", category: "Piston Rings" },
    { engineId: engineMap.get("LS1 5.7L")!, name: "Oil Ring End Gap", factoryMin: "0.010", factoryMax: "0.030", performanceMin: "0.015", performanceMax: "0.025", unit: "inches", category: "Piston Rings" },
    // SBC 350
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, name: "Main Bearing Clearance", factoryMin: "0.0008", factoryMax: "0.0020", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", category: "Main Bearing" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, name: "Rod Bearing Clearance", factoryMin: "0.0013", factoryMax: "0.0035", performanceMin: "0.0018", performanceMax: "0.0028", unit: "inches", category: "Rod Bearing" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, name: "Crankshaft End Play", factoryMin: "0.002", factoryMax: "0.006", performanceMin: "0.003", performanceMax: "0.005", unit: "inches", category: "Crankshaft" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, name: "Piston-to-Wall Clearance (stock cast)", factoryMin: "0.0007", factoryMax: "0.0017", performanceMin: "0.003", performanceMax: "0.005", unit: "inches", category: "Pistons" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, name: "Top Ring End Gap (4.000\" bore)", factoryMin: "0.010", factoryMax: "0.020", performanceMin: "0.016", performanceMax: "0.022", unit: "inches", category: "Piston Rings" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, name: "Valve Stem-to-Guide (intake)", factoryMin: "0.001", factoryMax: "0.0027", performanceMin: "0.001", performanceMax: "0.002", unit: "inches", category: "Valvetrain" },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, name: "Valve Stem-to-Guide (exhaust)", factoryMin: "0.001", factoryMax: "0.0037", performanceMin: "0.0015", performanceMax: "0.003", unit: "inches", category: "Valvetrain" },
    // Ford 302
    { engineId: engineMap.get("Ford 302 Windsor")!, name: "Main Bearing Clearance", factoryMin: "0.0005", factoryMax: "0.0015", performanceMin: "0.0010", performanceMax: "0.0020", unit: "inches", category: "Main Bearing" },
    { engineId: engineMap.get("Ford 302 Windsor")!, name: "Rod Bearing Clearance", factoryMin: "0.0008", factoryMax: "0.0015", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", category: "Rod Bearing" },
    { engineId: engineMap.get("Ford 302 Windsor")!, name: "Piston-to-Wall Clearance", factoryMin: "0.0018", factoryMax: "0.0026", performanceMin: "0.003", performanceMax: "0.004", unit: "inches", category: "Pistons" },
    // 2JZ
    { engineId: engineMap.get("2JZ-GTE")!, name: "Main Bearing Clearance", factoryMin: "0.0006", factoryMax: "0.0013", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", category: "Main Bearing" },
    { engineId: engineMap.get("2JZ-GTE")!, name: "Rod Bearing Clearance", factoryMin: "0.0008", factoryMax: "0.0016", performanceMin: "0.0015", performanceMax: "0.0025", unit: "inches", category: "Rod Bearing" },
    { engineId: engineMap.get("2JZ-GTE")!, name: "Piston-to-Wall Clearance", factoryMin: "0.001", factoryMax: "0.002", performanceMin: "0.003", performanceMax: "0.004", unit: "inches", category: "Pistons" },
    { engineId: engineMap.get("2JZ-GTE")!, name: "Crankshaft End Play", factoryMin: "0.002", factoryMax: "0.010", performanceMin: "0.003", performanceMax: "0.006", unit: "inches", category: "Crankshaft" },
  ]);

  // Casting Numbers
  await db.insert(castingNumbersTable).values([
    // SBC Blocks
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, type: "Block", casting: "3970010", years: "1969–1979", description: "The holy grail SBC block. 4-bolt main, excellent wall thickness, excellent for performance builds up to 400+ ci." },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, type: "Block", casting: "14010207", years: "1986–2002", description: "One-piece rear main seal block. Excellent foundation for stroker builds. 4-bolt available." },
    { engineId: engineMap.get("SBC 350 (2-bolt main)")!, type: "Block", casting: "3956618", years: "1968–1969", description: "2-bolt main SBC 350 block. Adequate for stock or mild builds. Not recommended for high-HP builds." },
    // SBC Heads
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, type: "Cylinder Head", casting: "461", years: "1971–1972", description: "76cc chamber. Decent flow but large chamber hurts compression. Common in trucks." },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, type: "Cylinder Head", casting: "492", years: "1971–1980", description: "76cc oval port head. Large chamber. Good port flow on the intake. Avoid for performance." },
    { engineId: engineMap.get("SBC 350 (4-bolt main)")!, type: "Cylinder Head", casting: "193", years: "1996–2002", description: "Vortec head. Excellent factory flow numbers. 170cc intake port, 1.94/1.50 valves. Bolt pattern incompatible with older intakes." },
    // LS Blocks
    { engineId: engineMap.get("LS1 5.7L")!, type: "Block", casting: "12561168", years: "1997–2004", description: "LS1 aluminum block. Standard bore. Used in all C5 Corvettes and F-body 1998–2002." },
    { engineId: engineMap.get("LS3 6.2L")!, type: "Block", casting: "12601239", years: "2008–2013", description: "LS3 aluminum block. 4.065\" bore. Used in Corvette C6 LS3 and Camaro SS." },
    { engineId: engineMap.get("LS7 7.0L")!, type: "Block", casting: "12601561", years: "2006–2014", description: "LS7 block with titanium connecting rods and dry-sump provisions. 4.125\" bore spacing, 9.240\" deck." },
    // 2JZ
    { engineId: engineMap.get("2JZ-GTE")!, type: "Block", casting: "11400-46040", years: "1991–1998", description: "Early 2JZ-GTE block. Cast iron, sequential twin turbos. Strong cast iron foundation." },
    { engineId: engineMap.get("2JZ-GTE")!, type: "Block", casting: "11400-49395", years: "1998–2002", description: "Late 2JZ-GTE block. Same basic architecture as early. Sought after for JDM content." },
  ]);

  // Articles
  await db.insert(articlesTable).values([
    {
      slug: "ls-oil-clearances-guide",
      title: "LS Engine Oil Clearances: Street vs. Race",
      excerpt: "LS main and rod bearing clearances by application: street, street/strip, drag race, and road race — with measurement technique and quality bearing brands.",
      content: `## Why Oil Clearance Is the Most Misunderstood LS Spec

Every LS engine builder eventually confronts the same decision: how tight should the bearing clearances be? The factory General Motors specification for LS main bearing clearance is 0.0007"–0.0021" — a deliberately wide range that accommodates the tolerances of mass-production assembly. That range is not a performance target. It is a manufacturing envelope, and confusing the two has cost many builders a perfectly good short block.

This guide covers the physics behind hydrodynamic oil films, the clearance targets experienced builders actually use for street, street/strip, and all-out race applications, how journal surface finish interacts with clearance, proper measurement technique, and a review of the bearing brands worth buying.

## The Physics of Hydrodynamic Lubrication

A plain bearing — the type used in every automotive crankshaft — operates on a principle called hydrodynamic lubrication. When the journal rotates inside the bearing shell, it drags oil into the converging gap between the journal and bore. If rotation speed and oil viscosity are sufficient, the oil film develops enough pressure to carry the full load of the journal without metal-to-metal contact.

The key variables are clearance, oil viscosity, journal surface speed, and load. Clearance directly controls how thick the oil film can grow and how much volume flows through. Too little clearance and the film cannot establish itself under high dynamic loads. Too much clearance and the film loses the pressure gradient it needs to carry load, resulting in metal contact at low speeds and heavy loads.

For a typical LS main journal (2.558"–2.559" diameter on Gen III/IV), the hydrodynamic regime requires approximately 0.0015"–0.0028" clearance to operate safely across the temperature range of street and performance use.

## Factory Spec Rationale

General Motors designed the LS family for 100,000-mile durability with conventional petroleum-based 5W-30 oil. The 0.0007"–0.0021" main bearing clearance spec reflects that goal. At the tight end, a freshly manufactured engine with perfectly sized journals sits near 0.0007"–0.0010", which works with the low-viscosity factory oil at normal highway temperatures where oil pressure is adequate.

The wide tolerance allows GM to avoid scrapping blocks and cranks that fall anywhere within the dimensional range. An engine that assembles at 0.0018" is equally factory-correct as one at 0.0010". The spec is not a recommendation to build at either extreme — it is a pass/fail threshold.

## Street Performance Clearance Targets

For a performance street LS build — an engine that sees regular driving, occasional hard use, and quality synthetic oil — experienced builders target:

- Main bearings: 0.0018"–0.0022"
- Rod bearings: 0.0018"–0.0022"

This range puts the engine firmly in the hydrodynamic regime at street temperatures, allows adequate oil flow at high RPM, and is compatible with 0W-40 or 5W-50 full synthetic oil. At these clearances, a Gen III or Gen IV LS running a quality bearing like Clevite H-series or King XP will run reliably for well over 100,000 miles with appropriate oil changes.

Tighter than 0.0015" on a street engine with a high-flow oil pump is asking for trouble at sustained highway cruise — the film gets thinner as temperature rises and viscosity drops. Looser than 0.0025" on a daily driver increases oil consumption and reduces oil pressure at idle.

## Street/Strip and Naturally Aspirated Race Clearances

For engines that see regular track days, bracket racing, or open-track events — engines that spin 6,500–7,500 RPM under real load — clearances open up:

- Main bearings: 0.0022"–0.0026"
- Rod bearings: 0.0022"–0.0026"

The wider clearance at these RPM levels serves two purposes. First, it allows the higher oil volume flow needed to carry heat away from the bearing at sustained high speeds. Second, it provides margin against thermal growth — as the journal heats up it expands, and a tighter engine can close to minimum clearance under hard use.

At this clearance level, a 10W-40 or 15W-50 racing synthetic like Motul 300V or Royal Purple Racing maintains adequate film thickness at temperature.

## Drag Race Clearances

All-out drag race LS engines — 8,000+ RPM, nitrous or large supercharger, short duty cycles — push clearances further:

- Main bearings: 0.0026"–0.0032"
- Rod bearings: 0.0026"–0.0030"

The logic here is maximum oil flow. A drag motor spends most of its life at idle in the staging lanes and then sees 8–10 seconds of full load. The wider clearance ensures bearings are never oil-starved during that brief brutal event, even if oil pressure momentarily drops under high centrifugal loading.

These clearances require a dedicated racing oil (typically 20W-50 or straight 60 weight during the event) and frequent inspection. They are not suitable for a street car.

## Road Race Clearances

Road race applications are the most demanding — sustained high RPM, high load, elevated temperatures for 20–60 minutes at a stretch. Clearances for dedicated road race LS builds tend to be tighter than drag race, but looser than street:

- Main bearings: 0.0020"–0.0024"
- Rod bearings: 0.0020"–0.0024"

Paired with a high-capacity dry sump system and a thermostatic oil cooler to maintain 180°–210°F oil temperature, this range provides excellent film strength over a race stint. A dry sump eliminates windage and guarantees oil delivery during sustained cornering loads that would starve a wet sump.

## How Temperature and Viscosity Affect Optimal Clearance

Oil viscosity is not a fixed number — it drops dramatically as temperature rises. SAE 30 oil at 40°C has roughly 100 cSt viscosity; at 100°C that drops to about 10 cSt. An oil film that is 0.0005" thick at cold start may be only 0.0001" at full operating temperature.

This means tight clearances that feel adequate at startup become marginal at temperature. For high-performance use, the operating temperature viscosity matters more than the cold viscosity. A 0W-40 synthetic and a straight 40-weight petroleum oil both have similar hot viscosity — but the synthetic resists viscosity shear and maintains film strength at sustained high temperatures much better.

The practical takeaway: if you are building tight (0.0012"–0.0015"), you must use a premium full synthetic with high HTHS (high temperature high shear) viscosity. Mobil 1 0W-40, Amsoil Signature Series 5W-50, and Motul 8100 X-Power 0W-40 all have HTHS ratings above 3.5 mPa·s, which is the minimum for performance bearings.

## Journal Surface Finish: Ra Values Matter

The bearing does not run directly on the journal — it runs on an oil film. But surface finish affects how that film establishes itself at startup and under shock loading. The accepted target for crankshaft main and rod journals is:

- Ra 8–16 microinches (0.2–0.4 µm): Standard finish, acceptable for most applications
- Ra 4–8 microinches (0.1–0.2 µm): Improved finish, appropriate for performance builds

A journal polished below Ra 4 microinches can actually hurt bearing life — the surface becomes too smooth to retain the micro-oil pockets that help the film establish during transient loading. There is a reason professional engine builders polish to spec, not to "as smooth as possible."

Have your machine shop measure and report Ra values after grinding. If they cannot, find a shop that can.

## Measuring Technique: Bore Gauge vs. Plastigage

### Dial Bore Gauge Method (Professional Standard)

The correct procedure for measuring oil clearance requires two measurements:
1. Measure the bearing ID with the cap torqued to spec (without the crankshaft installed) using a dial bore gauge
2. Measure the journal OD at two positions 90° apart using a micrometer
3. Subtract journal OD from bearing ID to get clearance

The dial bore gauge must be calibrated against a precision ring gauge or set of gauge blocks before use. A quality bore gauge (Mitutoyo, Fowler, or equivalent) and proper technique are accurate to 0.0001".

### Plastigage Method

Plastigage is a soft plastic thread that compresses between the bearing shell and journal when the cap is torqued. The width of the compressed strip is compared to a reference card that reads in clearance.

Plastigage is useful for a quick field check and requires no special instruments. It is not as accurate as the dial bore gauge method — accuracy is approximately ±0.0005" — and it only measures clearance at the narrow point of contact, not the full bore geometry. Use it for verification, not as your primary measurement.

## Common Bearing Failure Modes

### Spun Bearing

Metal transferred from the bearing shell to the journal surface, often with the shell rotating in the bore. Caused by: oil starvation, clearance too tight (film collapse), or oil contamination. Look for: scoring on the journal, discoloration, and the shell rotated from its original position.

### Fatigue Cracking

Radial cracks emanating from the bearing surface. Caused by excessive loading, inadequate clearance (too-high load per unit area), or incorrect bearing crush. Look for: fine cracks running perpendicular to the bearing surface, usually starting at the overlay layer.

### Cavitation Erosion

Pitting on the bearing surface resembling small craters. Caused by air bubbles in the oil film collapsing under pressure. Often seen in high-RPM engines with inadequate oil viscosity or aeration from windage. Reduce with a windage tray, good oil, and ensuring the oil pickup is below the surface in all operating conditions.

## Bearing Brand Guide

### Clevite H-Series (TriMetal)

The industry standard for performance LS builds. The H-series uses a copper-lead intermediate layer with a babbitt overlay, providing excellent conformability and fatigue resistance. Available in standard, 0.001", 0.010", 0.020", and 0.030" undersizes. Correct part numbers for Gen III LS: CB-663H (rods), MS-909H (mains).

### King XP Series

King's XP line uses a bi-metal construction with an aluminum-tin alloy running surface that provides better fatigue resistance than copper-lead at sustained high loads. Excellent choice for boosted LS applications where load spikes are higher. Available in a wide range of undersizes and in HP (high-performance) versions with tighter dimensional tolerance.

### Mahle PowerPak

Mahle bearings are OEM supplier quality with performance options. Their performance main and rod sets for LS engines use the same material grades as Clevite H but with slightly different tolerance stacking. A solid third option, widely available, and competitively priced.

## Summary: Clearance by Application

For a quick reference, here are the practical clearance targets used by professional LS builders:

Street driver (under 6,500 RPM, quality synthetic): 0.0018"–0.0022" mains, 0.0018"–0.0022" rods

Street/strip (to 7,500 RPM, track days): 0.0022"–0.0026" mains, 0.0022"–0.0026" rods

Drag race (8,000+ RPM, short cycles): 0.0026"–0.0032" mains, 0.0026"–0.0030" rods

Road race (sustained high RPM, dry sump): 0.0020"–0.0024" mains, 0.0020"–0.0024" rods

Always measure with a calibrated dial bore gauge, verify journal surface finish with your machine shop, and match your oil viscosity to your clearance and operating conditions.`,
      category: "Specs & Clearances",
      readTime: 12,
      publishedAt: new Date("2024-03-15"),
      tags: ["LS", "Bearings", "Clearances", "Engine Building"],
      featured: true,
    },
    {
      slug: "flat-tappet-cam-survival-guide",
      title: "The Flat Tappet Cam Survival Guide",
      excerpt: "ZDDP chemistry, why modern API oils kill flat tappet cams, full break-in procedure with RPM targets, and a comparison of oils with actual zinc ppm values.",
      content: `## The Epidemic Nobody Talks About

Every year, thousands of freshly rebuilt engines with flat tappet camshafts are destroyed in the first 20 minutes of operation. The engines look right, the parts are new, and the builder followed every other procedure correctly. Then they start the engine and within one heat cycle, the camshaft lobes are wiped flat. The culprit is modern API-rated motor oil — and understanding why requires a short chemistry lesson.

## What ZDDP Is and Why It Matters

Zinc dialkyldithiophosphate (ZDDP) is an organometallic anti-wear additive that has been in engine oil since the 1940s. Under extreme pressure and heat — exactly the conditions present between a flat tappet lifter and a camshaft lobe — ZDDP decomposes and forms a protective iron sulfide and zinc phosphate tribofilm on the metal surfaces.

This tribofilm is critical because the flat tappet interface operates in the boundary lubrication regime. Unlike a crankshaft bearing that runs on a full hydrodynamic oil film, the cam lobe and lifter heel contact each other directly at the edge of the lobe. The contact stress at this interface can exceed 200,000 psi. No oil film can survive that load — only a chemical protective layer formed by ZDDP can.

## The History: Why ZDDP Was Removed

From the 1940s through the late 1990s, API-rated motor oils contained 1,400–1,600 ppm of zinc (and matching phosphorus) as ZDDP. This was more than adequate for flat tappet cam protection.

In the early 2000s, the EPA and automakers pressured API to reduce phosphorus content in motor oil because phosphorus poisons catalytic converters. The API responded with the SL specification in 2001, which reduced phosphorus to a maximum of 0.10% (approximately 800–900 ppm zinc). The SN specification introduced in 2010 further tightened limits to 0.08% phosphorus maximum (approximately 600–700 ppm zinc).

Modern API SN and SP oils contain roughly 600–800 ppm ZDDP. Research by the Valvetrain Engineering group at STLE (Society of Tribologists and Lubrication Engineers) has established that flat tappet cams require a minimum of 1,200 ppm ZDDP for safe break-in. Modern API-rated oils fall approximately 40–50% short of that threshold.

## The Boundary Lubrication Chemistry

To understand why ZDDP concentration matters so precisely, it helps to understand what happens during break-in at a molecular level.

When new cam lobes and lifters contact, the surface asperities — microscopic peaks and valleys on each metal surface — interlock and make metal-to-metal contact. The contact stress at these asperity peaks is enormous. Without ZDDP present in adequate concentration, this contact causes adhesive wear: microscopic cold welding at the peaks, followed by material transfer from one surface to the other.

ZDDP prevents this through a process called thermal decomposition. At the high temperatures generated by asperity contact, ZDDP molecules break down and the sulfur and phosphorus atoms bond chemically with the iron at the metal surface, forming a glassy protective layer approximately 50–200 nm thick. This layer shears preferentially under load, protecting the underlying metal.

The critical detail: ZDDP is consumed in this process. The protective layer must be continuously replenished from fresh oil. If ZDDP concentration is too low, the layer cannot form fast enough to protect against the wear rate during initial break-in, and you lose the cam.

## Elastohydrodynamic vs. Boundary Lubrication

Modern automotive components are designed to operate in the elastohydrodynamic (EHD) lubrication regime wherever possible. In EHD lubrication, a pressurized oil film separates the surfaces even under high contact loads because the contact pressure elastically deforms both surfaces slightly, increasing the film load capacity. This is how roller lifters, ball bearings, and gear teeth survive high loads without ZDDP.

Flat tappet lifters were designed before EHD theory was fully applied to valvetrain geometry. The flat heel of a flat tappet lifter cannot generate a hydrodynamic wedge under the contact loads generated by aggressive cam profiles. This is why flat tappet cam design is inherently more constrained than roller cam design — the lobe profile ramp rates must be gentler to limit contact stress to what boundary lubrication can handle.

## ZDDP Oils and Supplements: Actual ppm Values

Not all high-ZDDP claims are equal. Here are measured or published ZDDP concentrations for commonly used flat tappet cam oils and supplements:

**Break-In Oils (1,200–2,000 ppm ZDDP):**
- Driven Racing Oil HR3 15W-50: ~1,600 ppm zinc, ~1,600 ppm phosphorus — purpose-built for break-in
- COMP Cams Engine Break-In Oil: ~1,400 ppm zinc — widely available, correctly formulated
- Brad Penn Grade 1 Racing 20W-50: ~1,500 ppm zinc — petroleum-based, excellent for break-in

**Long-Term High-ZDDP Street/Track Oils (900–1,200 ppm ZDDP):**
- Valvoline VR1 Racing 20W-50: ~1,100 ppm zinc, ~1,100 ppm phosphorus — readily available, correct for broken-in flat tappet engines
- Pennzoil Z-7 Racing: ~1,050 ppm zinc
- Royal Purple Max-Cycle (motorcycle): ~1,200 ppm zinc — motorcycle oils are exempt from API phosphorus limits

**ZDDP Supplements (added to any oil):**
- COMP Cams ZDDP Engine Break-In Oil Additive (1 qt bottle): adds ~2,000 ppm zinc when mixed per directions in a 5-quart fill
- Driven Racing Oil ZDDP Plus: adds ~1,800 ppm zinc per directions
- ZDDPlus: adds approximately 800 ppm zinc per treatment — often not enough alone for break-in, use with a higher baseline oil

**Modern API SP Oils (do not use for flat tappet cam break-in):**
- Most major brand 5W-30, 10W-30 SM/SN/SP: 600–750 ppm zinc, 600–700 ppm phosphorus

## The Complete Break-In Procedure

A successful flat tappet cam break-in requires preparation before the engine starts. Rushing any step increases your risk significantly.

### Before First Start

Pre-assembly lubrication is mandatory. Apply a dedicated assembly lube or moly paste directly to each cam lobe and the corresponding lifter heel. Comp Cams Pro-Film, Crane Assembly Lube, or a similar product with molybdenum disulfide provides boundary protection during the critical first seconds of rotation before oil pressure builds.

Pre-prime the oil system using a drill-driven oil pump priming tool. Remove the distributor (on distributor-equipped engines) or use a dedicated priming shaft, and spin the pump until oil pressure registers on a mechanical gauge and oil flows from the rocker arms. This process typically takes 30–60 seconds with a 350-watt drill at full speed. Do not skip this step.

Verify that the oil pan is filled to the correct level with your high-ZDDP break-in oil. Double-check that all lifters rotate freely in their bores — each flat tappet lifter must rotate during operation to spread wear evenly around the heel circumference.

### First Start Procedure

Start the engine and bring it to 2,000–2,500 RPM within the first 5 seconds. Do not let it idle. Idle RPM is insufficient to generate the oil flow and splash that lubricates the valvetrain on most pushrod engines. At idle, the cam lobes receive lubrication primarily from splash and gravity — barely enough for a broken-in engine, not remotely enough for a new one.

Continuously vary the RPM between 1,500 and 2,500 RPM for exactly 20 minutes. Do not hold a steady RPM. The variation changes the load on each lobe, preventing a localized wear pattern from establishing. It also prevents heat buildup at any single point.

Watch the oil pressure gauge. If pressure drops suddenly below 20 psi, shut down immediately and investigate. Normal oil pressure at 2,000 RPM on a healthy LS or small block should be 45–65 psi.

Monitor coolant temperature. The engine should not overheat during a 20-minute break-in — if it does, you have a cooling system issue that needs to be resolved separately.

Do not adjust the carburetor or ignition timing during break-in. These can be set correctly before first start. Chasing a rich stumble or idle quality issue while the cam is breaking in takes your attention away from monitoring critical parameters.

### After Break-In

At the 20-minute mark, shut down the engine and let it cool completely to ambient temperature — at least 2 hours. Do not restart until the oil is cold.

Drain the break-in oil and replace the oil filter. Inspect the drained oil for metal particles using a white paper towel. A small amount of very fine grey metallic sheen is normal — visible flakes or chunks are not.

Refill with your long-term oil (high-ZDDP street oil or premium synthetic with ZDDP supplement). Start the engine and verify all parameters are normal.

## Inspecting the Cam and Lifters Post Break-In

After 500 miles of normal street driving, pull the valve covers and inspect the rocker arms and pushrods. Everything should look identical to new. If any rocker shows wear at the pushrod seat or if a pushrod is bent, you likely have a lifter that is not rotating — investigate immediately.

If accessible, pull a lifter after break-in and inspect the heel. A correctly broken-in flat tappet lifter heel will show a smooth, slightly polished wear pattern centered on the contact zone. The wear should be even around the circumference of the heel, confirming the lifter rotated properly.

A wiped lifter heel — one that shows a flat, deeply worn area rather than a polished contact zone — indicates cam/lifter failure. The corresponding lobe will be worn or wiped as well. At this point, the only correct repair is a new cam and full set of lifters. Running an engine with a wiped lobe spreads metal contamination through the entire oiling system.

## What a Wiped Lobe Looks Like

A new cam lobe has a gentle convex crown across the lobe face — this slight convexity is what causes the lifter to rotate. The base circle is a perfectly smooth arc. The nose (maximum lift point) is a smoothly machined radius.

A wiped lobe has a flat, polished area where the crown used to be. In severe cases, the flat extends across most of the lobe face and is noticeably lower than the surrounding lobe profile. The lifter heel will show matching flat wear. Under any circumstances, do not continue to run an engine with a wiped lobe.

## Long-Term Flat Tappet Oil Strategy

After a successful break-in, flat tappet cams require approximately 1,000 ppm ZDDP for ongoing protection. This is lower than break-in requirements because the surfaces are now smoothly mated and operating in a partially EHD regime rather than full boundary lubrication.

The best long-term options are:
- Valvoline VR1 Racing 20W-50 (street/track): petroleum-based, correctly formulated, available everywhere
- Brad Penn Grade 1 10W-30 or 20W-50: high ZDDP, petroleum-based
- Any quality synthetic plus one treatment of Driven ZDDP Plus or ZDDPlus per oil change

Change oil at 3,000–5,000 mile intervals. ZDDP is consumed in use — an oil that started with 1,000 ppm may be at 700 ppm by 5,000 miles. More frequent changes maintain the protective reserve.`,
      category: "Engine Building",
      readTime: 14,
      publishedAt: new Date("2024-02-20"),
      tags: ["Cam", "Flat Tappet", "Oil", "Break-In", "ZDDP"],
      featured: true,
    },
    {
      slug: "bore-hone-guide",
      title: "What Bore and Hone Actually Means",
      excerpt: "Boring vs. honing explained: stone selection, crosshatch angle, Ra/Rz specs by ring type, plateau honing mechanics, and when torque plate honing is required.",
      content: `## Two Operations, Two Purposes

Boring and honing are the two fundamental machining operations that prepare a cylinder block for engine assembly. They are often mentioned together, sometimes confused, and occasionally skipped — with consequences that range from slow ring seating to catastrophic failure. Understanding what each operation does, what the specifications mean, and how to verify the work gives you the knowledge to specify and inspect machine shop work intelligently.

## The Boring Process

Boring is a turning operation performed inside the cylinder bore. A rigid boring bar — typically mounted in a precision boring machine bolted to the block deck — rotates a single-point carbide cutting tool through the bore at a controlled feed rate. The tool removes material in a precise, repeatable path, enlarging the bore to within 0.002"–0.005" of final size.

### Boring Bar Setup and Rigidity

The most important factor in boring accuracy is rigidity. A boring bar that deflects under cutting load produces a bore that is tapered, bell-mouthed, or out-of-round. Premium boring machines (Sunnen, Rottler, or equivalent CNC boring mills) use very short, stiff boring bars that minimize overhang and deflection.

The block must be deck-bolted to the boring machine fixture in exactly the same way it will be mounted in operation. Any temperature difference between block and machine — from sunlight, a nearby heater, or inadequate soak time — causes thermal growth that shows up as dimensional error after the block cools. Professional shops allow blocks to thermal-soak to shop temperature before machining.

### Overbore Limits

Every engine block has a maximum overbore limit beyond which the cylinder walls become dangerously thin. Common limits are:

- Small block Chevy 350: typically +0.060" maximum, though most builders stop at +0.030" for street use
- LS Gen III (iron block): +0.040" is common; aluminum LS blocks (LS2, LS3) are more limited, typically +0.010"–0.020" depending on casting
- Ford 302/5.0: +0.030" standard, +0.060" possible with sonic checking
- Ford 5.0 Coyote (aluminum): factory overbore limited; typically +0.010"–0.020"
- Mopar 440: iron block allows +0.060" readily

Always sonic-check iron blocks before boring beyond +0.030". A sonic checker measures wall thickness at 8 points around each bore at 3 depths, identifying thin spots from casting variation. A wall under 0.150" is too thin for most applications; under 0.120" is dangerous.

## The Honing Process

Honing brings the bore to final size, correct geometry (roundness and cylindricity), and the surface finish required for ring seating. A honing machine uses abrasive stones mounted on an expanding mandrel that rotates while stroking up and down the bore. The stones maintain contact with the bore surface under spring or hydraulic pressure.

### Stone Selection: Silicon Carbide vs. Diamond

**Silicon carbide stones** are the traditional choice for most engine honing. They cut aggressively, load up less with soft aluminum than diamond on some alloys, and produce a surface texture with the sharp peaks and valleys that cast iron and some moly rings need to seat. Grit selection ranges from 80 (rough, after boring) through 220 (finish honing) and 400 (plateau).

**Diamond stones** cut harder materials more efficiently and wear more slowly. For very hard cylinder liners or hard-chromed bores, diamond is preferred. Diamond honing tends to produce a different surface texture — the peaks are harder and less prone to breaking off during ring seating, which can extend ring break-in time if not followed by a plateau process.

For most passenger car and performance engine applications on iron or steel sleeves, silicon carbide stones produce excellent results. Diamond stones shine in high-wear applications where the running surface must be extremely consistent.

### Crosshatch Angle and Its Purpose

The honing crosshatch is not decorative — it is a functional feature that serves three purposes:

1. **Oil retention**: The angled grooves form tiny reservoirs that hold oil against the cylinder wall, providing lubrication for the rings on both the upstroke and downstroke
2. **Ring seating**: The surface peaks provide controlled abrasion that wears the ring face to conform to the bore during break-in
3. **Gas sealing**: After rings seat, the valleys in the crosshatch provide a tortuous path that limits gas blow-by

The standard crosshatch angle is 45° (measured from horizontal, giving an included angle of 90° between the crossing grooves). Some builders prefer 30–35° for oil-ring control or 60° for faster ring seating on chrome rings.

### Surface Finish Specifications: Ra and Rz

Surface finish is quantified using profilometry — a diamond stylus dragged across the surface that measures the height variation of peaks and valleys. The two most relevant parameters are:

**Ra (arithmetic mean roughness)**: The average absolute deviation of peaks and valleys from the mean line. Measured in microinches (µin) or micrometers (µm). Ra describes the average roughness character of the surface.

**Rz (mean roughness depth)**: The average of the five highest peaks and five deepest valleys in the measurement. Rz is more sensitive to individual extreme features and better predicts wear behavior.

Correct surface finish targets vary by ring material:

**Cast iron rings (conventional or ductile):**
- Ra: 40–80 µin (1.0–2.0 µm)
- Rz: 200–350 µin (5.0–9.0 µm)
- These are traditional rings found in many stock rebuilds. They require an aggressive enough surface to wear in quickly.

**Moly-faced rings (plasma-sprayed molybdenum):**
- Ra: 20–50 µin (0.5–1.25 µm)
- Rz: 150–250 µin (3.8–6.3 µm)
- Moly rings are used in most performance and OEM applications today. The plasma-sprayed face is harder and less conformable than cast iron, requiring a slightly finer but still defined surface.

**Napier second rings and thin steel oil rings (modern performance sets):**
- Ra: 15–35 µin (0.4–0.9 µm)
- Rz: 100–200 µin (2.5–5.0 µm)
- Thin steel rings have extremely low tension and conform well. Too rough a surface scores the thin faces and defeats the low-friction benefit.

**Diamond-like carbon (DLC) coated rings:**
- Ra: 8–20 µin (0.2–0.5 µm)
- Rz: 50–100 µin (1.25–2.5 µm)
- DLC rings require a very smooth, precise bore surface. These are high-end racing applications.

## Plateau Honing: The Modern Standard

Plateau honing (also called "plateauing") is an additional finishing step that transforms a conventional honed surface into an optimized running surface. After regular honing, the surface has sharp peaks that will wear rapidly in the first miles of operation. This initial wear period produces metal debris that can contaminate oil.

In the plateau honing process, a very fine-grit brush or flexible abrasive is run through the bore under controlled pressure. This removes the sharp peaks while leaving the valleys intact. The result is a surface with a flat plateau top (the actual running surface) and deep valleys for oil retention and ring seating.

The benefit is twofold: the plateau surface means less material is removed during break-in (the rings immediately contact a well-defined surface rather than wearing peaks down), and the valleys retain their depth and oil-holding capacity. Engines with plateau-honed bores typically seat rings in 200–500 miles, versus 1,000–3,000 miles for non-plateaued bores.

Specify plateau honing explicitly when talking to your machine shop. Ask what grit they use for the plateau step — 400 grit silicon carbide or equivalent is appropriate for most applications.

## Torque Plate Honing: When It Is Non-Negotiable

When a cylinder head is bolted to an engine block, it distorts the bores. The clamping force from the head bolts, combined with the different coefficients of thermal expansion between the head and block (particularly critical in aluminum head/iron block combinations), causes each bore to change shape. In a typical small block, the bore can distort by 0.0003"–0.0008" when the head is torqued — enough to cause measurable ring sealing problems.

Torque plate honing uses a steel plate — machined to the same thickness and bolt pattern as the cylinder head — bolted to the block deck with the same torque specification as the production head bolts. The block is honed with this plate in place, so the bore achieves its final shape with the distortion already applied. When the actual head is installed, the bore returns to the shape it was honed in.

### When Torque Plate Honing Is Required

- Any performance build where ring sealing is critical
- Aluminum blocks (distortion is greater than iron)
- Any block that will use aluminum heads (mismatch in thermal expansion amplifies distortion)
- Engines with high cylinder pressure (forced induction, nitrous, high compression)

### What Bore Distortion Looks Like Without a Torque Plate

Without torque plate honing, bores that measure perfectly round on the machine can be out-of-round by 0.0005" or more after head installation. The rings cannot conform to this shape, resulting in:
- Elevated oil consumption, especially on the #1 and #4 cylinders (closest to the end head bolts, which distort most)
- Slow ring seating despite correct surface finish
- Higher-than-expected blow-by at full throttle

## Inspecting Your Machine Shop's Work

### Visual Inspection of the Crosshatch

Under good lighting, the crosshatch should be clearly visible as a uniform angular pattern. The groove angle should be consistent. Look for:
- Consistent groove spacing across the full bore
- No areas where the pattern fades (indicates uneven stone pressure or spool-shaped bore)
- No vertical chatter marks from the stone stroking
- No areas where the pattern reverses or becomes parallel (indicates a worn-out machine or improper setup)

### Measuring the Bore

Your machine shop should provide measurements for each bore at minimum top, middle, and bottom positions, at two orientations 90° apart. Roundness should be within 0.0002" across a full diameter. Taper (difference between top and bottom) should be 0.0001"–0.0002" maximum, with the bore very slightly larger at the top to account for the slightly higher temperatures there.

### Asking About Surface Finish

Ask your machine shop what Ra/Rz values they target for your specific ring combination and whether they have a profilometer to verify. A shop that cannot answer this question — or that gives you a generic "we hone to spec" answer — may not be equipped for high-performance work. The measurement takes 30 seconds with a portable profilometer and should be part of their standard quality check.`,
      category: "Machine Shop",
      readTime: 13,
      publishedAt: new Date("2024-01-10"),
      tags: ["Machine Shop", "Boring", "Honing", "Engine Building"],
      featured: false,
    },
    {
      slug: "rod-ratio-explained",
      title: "Rod Ratio Explained: More Than a Number",
      excerpt: "Rod ratio formula with worked examples for SBC 350, LS3, Ford 302, 5.0 Coyote, and Mopar 440 — covering dwell time, side loading, and practical upgrade paths.",
      content: `## What Rod Ratio Actually Is

The connecting rod ratio — also called the L/R ratio — describes the geometric relationship between the connecting rod center-to-center length and the stroke. The industry-standard formula uses stroke, not crank throw radius:

Rod Ratio = Connecting Rod Length ÷ Stroke

A ratio of 1.7 means the rod is 1.7 times longer than the stroke. Most production engines fall between 1.5 and 1.8. High-performance builds frequently target 1.7 or higher. Understanding why requires looking at what this ratio actually changes in engine behavior.

## The Physics: Piston Motion and Kinematics

The rod ratio controls how the piston moves through the stroke. A piston connected to a crankshaft does not travel at constant velocity — it accelerates from TDC, reaches maximum velocity at approximately 70° of crank rotation, decelerates back to near-zero velocity at BDC, and repeats in reverse. The shape of this velocity curve is directly affected by rod ratio.

### Piston Velocity Curves: 1.5 vs. 1.7 vs. 2.0 Rod Ratio

For a hypothetical engine with 3.5" stroke (1.75" crank radius), the peak piston velocity at different rod ratios varies significantly. Longer rods produce lower peak piston velocity for the same stroke, because the rod angle changes more gradually. The velocity curve is also more sinusoidal — more symmetrical between acceleration and deceleration phases.

- Rod ratio 1.5: Higher peak velocity, more asymmetric velocity curve, faster rise toward TDC
- Rod ratio 1.7: Moderate peak velocity, improved symmetry, good compromise for most applications
- Rod ratio 2.0: Lower peak velocity, nearly sinusoidal motion, maximum smoothness — but requires packaging compromises that typically limit this to purpose-built race engines

Lower peak piston velocity directly reduces piston-to-wall friction (proportional to velocity squared), ring-to-cylinder friction, and the inertia loads that the rod and piston assembly must absorb at reversal.

## Piston Dwell Time at TDC and Combustion Efficiency

The most significant power-related effect of rod ratio is on piston dwell time near TDC. "Dwell" refers to how long the piston spends within a small window of crank angle near top dead center before it begins moving downward at significant velocity.

A longer connecting rod keeps the piston geometrically closer to TDC for more degrees of crank rotation. In practical terms, a rod ratio of 2.0 might keep the piston within 5% of TDC for 30° of crank rotation, while a 1.5 ratio keeps it within 5% of TDC for only 22°.

Why does this matter? The combustion event following the spark occurs over approximately 40–60° of crank rotation (depending on burn rate, compression, and engine speed). If the piston starts retreating rapidly before combustion pressure peaks, the expanding gases do less work because the volume is increasing faster than pressure can build. More dwell time means the combustion pressure acts on a nearly constant volume, allowing pressure to build higher before the piston begins extracting work.

This is why high rod ratio engines can show improved thermal efficiency and combustion quality — the pressure-volume relationship through the combustion and early expansion phase is more favorable.

## Side Loading Force: Where Rod Ratio Affects Engine Life

When the connecting rod is not perfectly vertical — which is nearly always, except at exactly TDC and BDC — it exerts a lateral force on the piston. This side force pushes the piston against the cylinder wall on the thrust side and creates friction.

Side loading force is proportional to the sine of the rod angle. At a given point in the stroke, a shorter rod makes a greater angle with the cylinder bore than a longer rod covering the same geometry. Greater angle means greater sine value means greater side load.

For a concrete example: at 90° of crank rotation (where the piston is at midstroke and the rod angle is maximum), a rod ratio of 1.5 produces approximately 12% more lateral piston force than a rod ratio of 1.75. Multiplied over millions of cycles, this difference affects piston skirt wear, bore wear, and friction losses.

## Worked Examples for Common Engine Families

The formula is rod length ÷ stroke. All values below use center-to-center rod length and standard stroke.

**SBC 350:** Rod 5.700" ÷ Stroke 3.480" = **1.638** — the baseline, adequate for street use
Upgraded to 6.000" rods: 6.000 ÷ 3.480 = **1.724** — significant improvement, requires shorter compression-height pistons

**LS3 (Gen IV):** Rod 6.098" ÷ Stroke 3.622" = **1.684** — a respectable factory ratio; most LS builds keep stock rods for street use

**Ford 302 (5.0 pushrod):** Rod 5.090" ÷ Stroke 3.000" = **1.697** — an above-average factory ratio; a key reason the 302 is smooth and reliable at high RPM
Stroked 347 with stock rods: 5.090 ÷ 3.400 = **1.497** — drops significantly; upgrade to 5.700" rods for a ratio of 1.676

**Ford 5.0 Coyote (Gen 1/2):** Rod 5.933" ÷ Stroke 3.650" = **1.625** — conservative for a modern DOHC design; aftermarket 6.100" rods improve to 1.671

**Mopar 440 B/RB:** Rod 6.768" ÷ Stroke 3.750" = **1.805** — an outstanding factory ratio; one reason the 440 is known for smooth torque delivery and long-term durability

## How Rod Ratio Interacts With Bore-Stroke Ratio

Rod ratio does not exist in isolation — it interacts with the bore-stroke relationship to determine the overall character of the engine. An undersquare engine (stroke > bore, like the Mopar 440 at 4.32" bore × 3.75" stroke) with a long rod has very different behavior from an oversquare engine (bore > stroke, like the LS7 at 4.125" bore × 4.000" stroke) with the same rod ratio.

In undersquare engines, the longer stroke already increases piston velocity and side loading. A higher rod ratio is especially beneficial here to moderate these effects. In oversquare engines, the shorter stroke produces lower peak piston velocity even at a modest rod ratio, so the absolute benefit of improving rod ratio is somewhat smaller — though still positive.

For stroker builds where you are increasing stroke beyond factory spec, maintaining or improving the rod ratio is critical. Many budget stroker kits use factory-length rods with the longer stroke crank, which drops the rod ratio and partially negates the displacement gain with increased friction and wear.

## Practical Upgrade Paths by Engine Family

### SBC 350 and 383 Stroker

The most popular SBC performance upgrade is a 383 stroker using a 3.750" stroke crank. With factory 5.700" rods, the rod ratio drops to 5.700 ÷ 3.750 = 1.520 — borderline for a performance engine. Upgrading to 6.000" rods (ratio 1.600) or 6.125" rods (ratio 1.633) on a 383 significantly improves the engine's durability and smoothness at sustained RPM. The trade-off is a compression height change in the piston — shorter CH is required to maintain the same deck height.

### LS Family

LS engines already have decent factory rod ratios (1.65–1.69 depending on variant). The most popular LS stroker is the LSX454 or similar 4.0" stroke builds. These engines benefit from 6.125"–6.200" aftermarket rods that maintain a ratio above 1.60.

### Ford 302/347 Stroker

The 347 stroker with factory 5.090" rods (ratio 1.497) is one of the worst-ratio combinations in common use. This is acceptable for a mild street engine but shows its limitations at sustained high RPM with increased friction and heat. Upgrading to 5.700" connecting rods (ratio 1.676) transforms the engine's character at high RPM.

### Mopar 440 and 500 Stroker

The 440's already-excellent 1.805 ratio gives limited reason to deviate. 500" stroker kits using 4.150" stroke cranks with factory 6.768" rods drop to ratio 1.631 — upgrade to 7.100" rods (ratio 1.71) if available in the budget.

## Constraints That Limit Rod Length

You cannot simply choose any rod ratio — physics and geometry set hard limits.

**Block deck height**: The block deck height (distance from crank centerline to deck surface) equals the sum of the crank throw radius + rod length + compression height + deck clearance. For a given block, any change in rod length must be offset by a change in piston compression height to maintain the correct deck clearance.

**Piston compression height**: Compression height (CH) is the distance from the wrist pin centerline to the top of the piston crown. Shorter CH allows longer rods in the same block. Custom pistons can be ordered with any CH, but very short CH values (under 1.00") create piston structural challenges and limit the pin bore design.

**Wrist pin location and strength**: Moving the pin up (reducing CH) affects piston skirt length and may bring the pin closer to the oil ring groove — a structural concern in highly stressed applications.

**Counterweight clearance**: Very long rods on a stroker crank may contact the counterweights at the bottom of the stroke. This must be checked during mockup — most reputable rotating assembly suppliers do this clearance check as part of the kit assembly process, but verify it yourself.

## Summary: Rod Ratio in Practice

Rod ratio is a real variable with measurable effects on piston velocity, side loading, combustion dwell time, and ultimately engine efficiency and longevity. For most builders, the practical decision is whether to upgrade from a factory-length rod to the longest rod that fits within the block's geometry — usually a gain of 0.05–0.10 in ratio. This is most impactful in stroker builds where the factory rod ratio drops below 1.55.

For reference, here are the ratios by application:
- Under 1.50: avoid in high-performance applications
- 1.50–1.60: acceptable for mild street use; upgrade if building for sustained high RPM
- 1.60–1.70: good compromise for street/strip
- 1.70–1.80: excellent for performance use; most builders' target range
- 1.80+: exceptional; typical of purpose-built race engines or fortunate factory designs like the Mopar 440`,
      category: "Theory & Math",
      readTime: 12,
      publishedAt: new Date("2024-01-25"),
      tags: ["Rod Ratio", "Theory", "Engine Building"],
      featured: false,
    },
    {
      slug: "dynamic-compression-explained",
      title: "Dynamic Compression Ratio: The Number That Actually Matters",
      excerpt: "Why static compression ratio doesn't predict detonation — IVC timing does. The DCR formula, a worked example, cam reference table, and a pump-gas build guide.",
      content: `## The Most Misunderstood Number in Engine Building

Compression ratio is cited on every engine spec sheet, catalog description, and build thread — and it is routinely misinterpreted. Builders install aggressive camshafts in 10:1 engines and wonder why they run fine on 87 octane. Others install mild cams in 9:1 engines and complain of detonation. The explanation is dynamic compression ratio, and understanding it will fundamentally change how you select camshafts and compression ratios for any build.

## Static Compression Ratio: What It Is and What It Doesn't Tell You

Static compression ratio (SCR) is the ratio of cylinder volume at BDC to cylinder volume at TDC. The formula is:

SCR = (Swept Volume + Clearance Volume) ÷ Clearance Volume

Where swept volume is the displacement of one cylinder and clearance volume is the volume above the piston at TDC (the combustion chamber plus piston dome or dish). A 10:1 static ratio means the volume at BDC is 10 times the volume at TDC.

Static CR is easy to calculate, appears on cam cards and piston catalogs, and is the number most builders fixate on. It is also not the number that determines detonation tendency, octane requirement, or effective cylinder pressure. That number is the dynamic compression ratio.

## Why Intake Valve Closing Time Changes Everything

Here is the crucial fact that static CR misses: the intake valve does not close at BDC.

On the intake stroke, the piston travels from TDC to BDC while the intake valve is open. Cylinder filling occurs. But as the piston begins moving back upward on the compression stroke, the intake valve is still open — it does not close until some number of degrees after BDC.

The crank angle at which the intake valve closes is called the intake valve closing (IVC) point, measured in degrees after bottom dead center (ABDC). A mild hydraulic flat tappet cam might close the intake at 40° ABDC. A more aggressive street/strip cam closes at 55–65° ABDC. A full-race cam closes at 70–80° ABDC.

During those degrees of crank rotation after BDC — while the intake valve is still open — the piston is already moving upward. Some of the fresh charge is being pushed back out through the still-open intake valve. Only when the intake valve closes is the charge fully trapped, and compression in the thermodynamic sense begins.

This means the effective compression stroke does not start from BDC — it starts from the point where the intake valve closes. And if the piston has already traveled significantly upward by the time IVC occurs, the effective starting volume for compression is much smaller than the full BDC cylinder volume.

## The Dynamic Compression Ratio Formula

The approximate formula for DCR accounts for IVC timing:

DCR ≈ [(Swept Volume × Correction Factor) + Clearance Volume] ÷ Clearance Volume

Where the correction factor accounts for the volume of charge pushed back through the intake valve before IVC. A precise calculation requires using the piston position at IVC to determine the effective cylinder volume at that point, then computing the ratio between that volume and the TDC clearance volume.

The exact piston position at IVC can be calculated from:

Piston Position from BDC = r × (1 - cos θ) + l × (1 - cos φ)

Where r = crank throw radius, l = rod length, θ = crank angle from BDC, and φ = corresponding rod angle. This is the full kinematic equation; in practice, most builders use calculator tools (like the EngineVault DCR Calculator) that compute this directly.

## Worked Example: 10:1 Engine With a Street/Strip Cam

Let's build a concrete example:
- Engine: Small block Chevy 355 cubic inch
- Bore: 4.030", Stroke: 3.480"
- Compression ratio (static): 10.0:1
- Clearance volume: 64.0 cc
- Swept volume per cylinder: 44.55 cubic inches (730 cc)

With a stock or mild cam (IVC at 40° ABDC), the piston has traveled only about 3% of the stroke when the intake valve closes. The effective cylinder volume at IVC is approximately 97% of full BDC volume. DCR in this case is very close to static CR — roughly 9.7:1. This engine needs premium fuel.

Now install a street/strip cam with IVC at 60° ABDC. At 60° ABDC, the piston has traveled approximately 13% of the stroke. The effective cylinder volume at IVC is about 87% of BDC volume. The DCR drops to approximately 8.5:1 — now the engine can run reliably on 93 octane.

With a more aggressive cam, IVC at 70° ABDC. At 70° ABDC, the piston is about 21% up the bore. Effective volume at IVC is 79% of BDC. DCR drops to approximately 7.7:1 — this engine can safely run 91 octane even at 10:1 static compression.

This is exactly why so many "high-compression" performance engines run without detonation on pump gas: the aggressive cam profile they require has late IVC timing that substantially reduces the dynamic compression ratio.

## Common Cam Profiles and Resulting DCR on a 10:1 Engine

The following reference values are approximate, based on typical IVC timing for each cam category on a 10:1 SCR small block:

**Mild hydraulic flat tappet (230° duration @ 0.050"):**
IVC approximately 40–45° ABDC → DCR approximately 9.5–9.7:1
Octane requirement: 93–94 octane (premium mandatory, 91 marginal)

**Moderate hydraulic roller (240° duration @ 0.050"):**
IVC approximately 48–55° ABDC → DCR approximately 8.8–9.2:1
Octane requirement: 93 octane (premium)

**Aggressive street/strip hydraulic roller (250° duration @ 0.050"):**
IVC approximately 55–65° ABDC → DCR approximately 8.2–8.7:1
Octane requirement: 91–93 octane (91 is typically fine)

**Solid roller street/strip (260° duration @ 0.050"):**
IVC approximately 65–72° ABDC → DCR approximately 7.6–8.1:1
Octane requirement: 87–91 octane (pump gas, 87 on mild builds)

**Full-race solid roller (270°+ duration @ 0.050"):**
IVC approximately 72–80° ABDC → DCR approximately 7.0–7.5:1
Octane requirement: 87 octane or less (limited by other factors like mechanical octane and combustion efficiency, not compression)

These values assume correct cam degreeing, proper quench clearance, and a modern combustion chamber design. Older open-chamber heads, sluggish spark advance curves, or elevated coolant temperature all increase effective octane requirement regardless of DCR.

## Octane Requirement vs. DCR: The Relationship

The relationship between dynamic compression ratio and minimum octane requirement is not perfectly linear, but the following guidelines are well-established in engine building practice:

DCR below 7.5:1 → 87 octane (regular) is safe in most applications
DCR 7.5–8.0:1 → 87–89 octane; 91 octane provides margin
DCR 8.0–8.5:1 → 91–93 octane recommended
DCR 8.5–9.0:1 → 93 octane required; ethanol blends helpful
DCR above 9.0:1 → race fuel or E85 required in most applications

These targets assume a cast iron or aluminum combustion chamber of modern design (pentroof or semi-hemispherical). Flat-top combustion chambers (open chambers like older big block Chevys) add approximately 0.3–0.5 points of effective octane requirement. Tight quench (0.035"–0.045") reduces octane requirement by approximately 0.5–1.0 points by improving mixture turbulence and reducing the end-gas zone.

## Combustion Chamber Shape and Quench Area

DCR captures most of the compression-related octane requirement, but it does not tell the whole story. The geometry of the combustion chamber significantly affects detonation tendency through two mechanisms:

**Quench area**: The flat area of the combustion chamber that comes very close to the flat top of the piston (or the quench land on a dome piston) near TDC. As the piston approaches TDC, the charge in the quench zone is violently squeezed sideways into the main chamber, creating turbulence that improves charge mixing and reduces the end-gas zone where detonation initiates. Tight quench (0.035"–0.040" clearance) can allow 0.5–1.0 points of additional compression.

**Chamber surface area**: A combustion chamber with a large surface-to-volume ratio transfers more heat out of the charge and into the head, reducing the temperature of the end gas. Compact, efficient chambers (like the pent-roof design in most modern engines) have better surface-to-volume ratios than large, irregular open chambers.

**Spark plug location**: A centrally located spark plug minimizes the distance the flame front must travel to consume the charge. With a central plug, the end gas zone (the last area to be consumed, where detonation is most likely to occur) is minimized. Engines with off-center plugs have a larger end gas region and typically require lower DCR for the same octane.

## Detonation Warning Signs

Running an engine at excessive DCR for the available fuel will eventually produce detonation — uncontrolled spontaneous ignition of the end gas before the flame front arrives. At low intensity, detonation is inaudible. At higher intensity, it produces the characteristic sharp pinging under load. Severe detonation is audible as a harsh rattling under hard acceleration, especially at lower RPM where the combustion event is slower.

Signs of detonation damage on teardown include:
- Pitting or cratering of the piston crown, especially in the area farthest from the spark plug
- Pitting of the combustion chamber, particularly at the squish band edges
- Fatigue cracks in the ring land area above the top ring
- Spalling or erosion of ring land material in severe cases

If you hear pinging under load with proper ignition timing, your DCR is too high for the fuel available. Options: reduce static compression ratio, select a cam with later IVC timing to reduce DCR, add ignition retard (sacrifices power), or use higher-octane fuel.

## Using the EngineVault DCR Calculator

The EngineVault Dynamic Compression Ratio Calculator takes your engine's bore, stroke, clearance volume, rod length, and cam card IVC value and computes both static and dynamic compression ratio in real time. The calculator uses the full kinematic piston position equation rather than a simplified approximation, giving you accurate DCR for any cam and compression combination.

When entering IVC from a cam card, use the intake closing value at 0.050" lift, measured in degrees after BDC. This is the standard reference point used by virtually all cam manufacturers and eliminates ambiguity from different measurement thresholds.

## Cam Selection Decision Guide for High-Compression Pump-Gas Builds

If you are building an engine with static compression above 9.5:1 and want to run 91 or 93 octane pump gas, use this decision process:

**Step 1**: Calculate your SCR with the intended pistons, head gasket, and chamber volume. Verify it is what you expect.

**Step 2**: Determine your target DCR for the fuel you will use. For 91 octane: target 7.8–8.2:1 DCR. For 93 octane: target 8.0–8.5:1 DCR.

**Step 3**: Use the EngineVault DCR Calculator to find the IVC timing (in degrees ABDC at 0.050" lift) required to reach your target DCR with your engine's geometry.

**Step 4**: Select a camshaft with IVC at or later than the required value. Most cam manufacturers list IVC on the spec card. Hydraulic roller grinds in the 240–255° duration range will typically have IVC in the range needed for 10:1 engines on pump gas.

**Step 5**: Verify that the cam's other characteristics (lift, LSA, RPM range) match your engine's intended operating range. A cam with correct IVC but wrong RPM range will deliver poor results in a different way.

**Step 6**: After building and tuning the engine, verify safe operation by monitoring for detonation under full load at operating temperature. A knock sensor or audio monitoring on the first few pulls is worthwhile insurance.

The EngineVault DCR Calculator is available in the Calculators section and handles all the geometry for you — enter your specs and read the result directly.`,
      category: "Theory & Math",
      readTime: 14,
      publishedAt: new Date("2024-03-01"),
      tags: ["Compression Ratio", "Cam", "Theory"],
      featured: false,
    },
  ]);

  // Shops
  const shops = await db.insert(shopsTable).values([
    { name: "Reher-Morrison Racing Engines", city: "Arlington", state: "TX", phone: "(817) 467-1177", website: "https://www.rehermorrison.com", specialties: ["SBC", "BBC", "Full Engine Assembly"], turnaroundTime: "3-4 weeks", description: "World-renowned engine builders. Multiple NHRA records. One of the most respected shops in drag racing." },
    { name: "Jon Kaase Racing Engines", city: "Winder", state: "GA", website: "https://jonkaase.com", specialties: ["Ford", "Full Engine Assembly"], turnaroundTime: "4-6 weeks", description: "Multiple Engine Masters Challenge wins. Specializes in Ford small and big block high-performance builds." },
    { name: "BluePrint Engines", city: "Kearney", state: "NE", phone: "(800) 483-4263", website: "https://www.bpengines.com", specialties: ["SBC", "BBC", "LS", "Ford"], turnaroundTime: "1-2 weeks", description: "High-volume performance crate engine manufacturer. Good quality control for budget-conscious builders." },
    { name: "PAC Racing Springs / Comp Engineering", city: "Memphis", state: "TN", phone: "(800) 999-0853", specialties: ["SBC", "BBC", "LS", "Ford", "Mopar"], turnaroundTime: "2-3 weeks", description: "Full machine shop work alongside their parts business. Reputation for accuracy and customer service." },
    { name: "Mast Motorsports", city: "Bossier City", state: "LA", website: "https://www.mastmotorsports.com", specialties: ["LS", "Full Engine Assembly"], turnaroundTime: "3-4 weeks", description: "Premium LS and LT engine specialists. Known for top-tier LS builds for swap and racing applications." },
  ]).returning();

  // Shop Pricing
  await db.insert(shopPricingTable).values([
    { service: "Bore and Hone (per cylinder)", category: "Block Work", unit: "per cylinder", lowPrice: 35, avgPrice: 55, highPrice: 90, notes: "Includes boring to +.010/.020/.030, hone to final size" },
    { service: "Bore and Hone (complete engine, 8 cyl)", category: "Block Work", unit: "complete V8", lowPrice: 280, avgPrice: 450, highPrice: 700, notes: "Volume discount. Includes all 8 cylinders" },
    { service: "Deck Resurfacing", category: "Block Work", unit: "per deck", lowPrice: 75, avgPrice: 120, highPrice: 200, notes: "Price per block deck face. Aluminum typically more expensive" },
    { service: "Align Boring Main Journals", category: "Block Work", unit: "complete", lowPrice: 150, avgPrice: 250, highPrice: 400, notes: "Required after 4-bolt cap work or saddle damage repair" },
    { service: "Camshaft Bearing Replacement", category: "Block Work", unit: "complete set", lowPrice: 80, avgPrice: 150, highPrice: 250, notes: "Includes pressing out old, pressing in new bearings" },
    { service: "Freeze Plug Replacement", category: "Block Work", unit: "complete set", lowPrice: 40, avgPrice: 80, highPrice: 150, notes: "All plugs, typically 8-12 per V8 block" },
    { service: "Cylinder Head Resurfacing", category: "Head Work", unit: "per head", lowPrice: 75, avgPrice: 120, highPrice: 200, notes: "Mill to flat. Aluminum heads more expensive" },
    { service: "3-Angle Valve Job", category: "Head Work", unit: "per head", lowPrice: 120, avgPrice: 200, highPrice: 350, notes: "Includes grinding seats, lapping valves, checking guides" },
    { service: "Valve Guide Replacement", category: "Head Work", unit: "per guide", lowPrice: 15, avgPrice: 25, highPrice: 45, notes: "Includes knurling or bronze liner. Pressed inserts cost more" },
    { service: "Valve Seat Replacement", category: "Head Work", unit: "per seat", lowPrice: 20, avgPrice: 40, highPrice: 75, notes: "Required when seats are cracked or excessively worn" },
    { service: "Full Balance (rotating assembly)", category: "Balancing", unit: "complete V8", lowPrice: 200, avgPrice: 350, highPrice: 600, notes: "Includes bobweight calculation, crank, rods, pistons, flywheel, balancer" },
    { service: "Crank Balance Only", category: "Balancing", unit: "crankshaft only", lowPrice: 100, avgPrice: 175, highPrice: 300, notes: "Crank only, no reciprocating mass calculation" },
    { service: "Crankshaft Grind and Polish (main + rod journals)", category: "Crankshaft", unit: "complete V8 crank", lowPrice: 175, avgPrice: 300, highPrice: 500, notes: "One undersize. Includes measuring and polishing to target finish" },
    { service: "Hot Tank / Jet Wash (block)", category: "Cleaning", unit: "per block", lowPrice: 60, avgPrice: 100, highPrice: 175, notes: "Full chemical cleaning including galleries" },
    { service: "Magnaflux / Crack Inspection (block)", category: "Inspection", unit: "per block", lowPrice: 50, avgPrice: 90, highPrice: 150, notes: "Magnetic particle inspection for cracks. Essential for used blocks" },
    { service: "Magnaflux (heads)", category: "Inspection", unit: "per head", lowPrice: 40, avgPrice: 70, highPrice: 120, notes: "Dye penetrant or magnetic particle crack inspection" },
  ]);

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
