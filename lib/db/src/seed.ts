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

  // Engines — note: engines table has no slug column, use name as key
  const engines = await db.insert(enginesTable).values([
    // LS Series
    { familyId: familyMap.get("ls-series")!, name: "LS1 5.7L", years: "1997–2004", displacement: "5.7L (346 ci)", bore: "3.898\"", stroke: "3.622\"", compression: "10.1:1", horsepower: "350", torque: "365", firingOrder: "1-8-7-2-6-5-4-3", rodLength: "6.098\"", rodRatio: "3.37", deckHeight: "9.240\"", applications: "Corvette C5, Camaro (1998–2002), Firebird (1998–2002)", isPopular: 1 },
    { familyId: familyMap.get("ls-series")!, name: "LS3 6.2L", years: "2008–2017", displacement: "6.2L (376 ci)", bore: "4.065\"", stroke: "3.622\"", compression: "10.7:1", horsepower: "430", torque: "424", firingOrder: "1-8-7-2-6-5-4-3", rodLength: "6.098\"", rodRatio: "3.37", deckHeight: "9.240\"", applications: "Corvette C6 (2008+), Camaro SS (2010+)", isPopular: 1 },
    { familyId: familyMap.get("ls-series")!, name: "LS7 7.0L", years: "2006–2014", displacement: "7.0L (427 ci)", bore: "4.125\"", stroke: "4.000\"", compression: "11.0:1", horsepower: "505", torque: "470", firingOrder: "1-8-7-2-6-5-4-3", rodLength: "6.067\"", rodRatio: "3.03", deckHeight: "9.240\"", applications: "Corvette Z06 (2006–2014)", isPopular: 1 },
    // SBC
    { familyId: familyMap.get("gm-sbc")!, name: "SBC 350 (2-bolt main)", years: "1967–2003", displacement: "5.7L (350 ci)", bore: "4.000\"", stroke: "3.480\"", compression: "8.5:1", horsepower: "145", torque: "255", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "5.700\"", rodRatio: "3.28", deckHeight: "9.025\"", applications: "Chevrolet C/K Truck, Camaro, Monte Carlo, Nova", isPopular: 1 },
    { familyId: familyMap.get("gm-sbc")!, name: "SBC 350 (4-bolt main)", years: "1970–2003", displacement: "5.7L (350 ci)", bore: "4.000\"", stroke: "3.480\"", compression: "9.0:1", horsepower: "175", torque: "270", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "5.700\"", rodRatio: "3.28", deckHeight: "9.025\"", applications: "High-performance Camaros and Corvettes", isPopular: 1 },
    { familyId: familyMap.get("gm-sbc")!, name: "SBC 383 Stroker", years: "Custom Build", displacement: "6.3L (383 ci)", bore: "4.030\"", stroke: "3.750\"", compression: "9.5:1", horsepower: "400", torque: "430", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "6.000\"", rodRatio: "3.20", deckHeight: "9.025\"", applications: "Aftermarket/performance build — 350 block with custom crank" },
    // BBC
    { familyId: familyMap.get("gm-bbc")!, name: "BBC 454", years: "1970–2000", displacement: "7.4L (454 ci)", bore: "4.251\"", stroke: "4.000\"", compression: "8.5:1", horsepower: "360", torque: "500", firingOrder: "1-8-4-3-6-5-7-2", rodLength: "6.535\"", rodRatio: "3.27", deckHeight: "9.800\"", applications: "Chevrolet C/K Heavy Duty, Corvette (1970–1971), Chevelle", isPopular: 1 },
    // Ford SB
    { familyId: familyMap.get("ford-sb")!, name: "Ford 302 Windsor", years: "1968–2001", displacement: "4.9L (302 ci)", bore: "4.000\"", stroke: "3.000\"", compression: "9.0:1", horsepower: "220", torque: "300", firingOrder: "1-5-4-2-6-3-7-8", rodLength: "5.090\"", rodRatio: "3.39", deckHeight: "8.206\"", applications: "Mustang, F-150, Bronco, Maverick", isPopular: 1 },
    { familyId: familyMap.get("ford-sb")!, name: "Ford 351 Windsor", years: "1969–2004", displacement: "5.8L (351 ci)", bore: "4.000\"", stroke: "3.500\"", compression: "9.0:1", horsepower: "250", torque: "350", firingOrder: "1-3-7-2-6-5-4-8", rodLength: "5.956\"", rodRatio: "3.40", deckHeight: "9.503\"", applications: "Mustang, F-150, F-250, Bronco, Crown Victoria" },
    // Ford Modular
    { familyId: familyMap.get("ford-modular")!, name: "5.0L Coyote (Ti-VCT)", years: "2011–present", displacement: "5.0L (302 ci)", bore: "3.630\"", stroke: "3.660\"", compression: "11.0:1", horsepower: "412", torque: "390", firingOrder: "1-5-4-2-6-3-7-8", rodLength: "5.933\"", rodRatio: "3.24", deckHeight: "8.937\"", applications: "Mustang GT (2011+)", isPopular: 1 },
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
      excerpt: "The definitive guide to LS main and rod bearing clearances. What the factory spec is, what performance builders run, and why tighter isn't always better.",
      content: `Understanding oil clearances is fundamental to building a reliable LS engine. The factory spec for LS main bearing clearance is 0.0007"–0.0021" — a wide range by design that accommodates assembly line variation.

For performance street builds, most experienced builders target 0.0018"–0.0025" on the mains and 0.0018"–0.0025" on the rod bearings. This is slightly looser than factory minimum, which improves oil flow through the bearing at high RPM and temperatures.

WHY LOOSER IS OFTEN BETTER FOR PERFORMANCE

At high engine speeds, the oil film between the bearing and journal must sustain itself under tremendous centrifugal loading. A slightly looser clearance allows more oil volume through the bearing, ensuring the film never collapses. Too tight and you starve the bearing at high RPM.

For drag race applications (8,000+ RPM, short duty cycles), builders often run 0.003" on the mains. The wider gap allows generous oil flow for the brief high-RPM events. These engines need oil changes frequently.

For road race (sustained high RPM, high temperatures), clearances tend toward the tighter performance side (0.002"–0.0022") with high-quality synthetics to maintain film thickness.

THE CRITICAL MISTAKE: CONFUSING TIGHTER WITH BETTER

Many builders think tighter clearances are always better — this is wrong. Below minimum clearance, the oil film cannot establish itself under high load conditions. The result is bearing failure that looks like "spun bearings" — metal transferred from the bearing shell to the journal.

MEASURING CORRECTLY

Use a dial bore gauge to measure the bearing ID with the cap torqued (without the crank). Measure the journal OD with a micrometer. The difference is your clearance. Plastigage is useful for a quick check but dial bore measurement is the professional standard.`,
      category: "Specs & Clearances",
      readTime: 8,
      publishedAt: new Date("2024-03-15"),
      tags: ["LS", "Bearings", "Clearances", "Engine Building"],
      featured: true,
    },
    {
      slug: "flat-tappet-cam-survival-guide",
      title: "The Flat Tappet Cam Survival Guide",
      excerpt: "Modern engine oils are killing flat tappet cams. Here's exactly why, what to do about it, and the oil you should be running.",
      content: `Every year, thousands of freshly rebuilt engines with flat tappet camshafts are destroyed in the first 20 minutes of operation. The cause is almost always the same: wrong oil, or no break-in procedure.

THE ZDDP BACKSTORY

Zinc dialkyldithiophosphate (ZDDP) is the anti-wear additive that protects the high-contact-stress area between a flat tappet lifter and the cam lobe. When the engine is assembled and first started, the lobe and lifter surfaces are new and the contact stress is extreme until they break in.

In the early 2000s, the EPA required oil manufacturers to reduce ZDDP content. Modern API SM and SN oils have approximately 600–800 ppm of ZDDP — roughly half what flat tappet cams need for safe break-in (1,200–1,500 ppm).

WHAT HAPPENS WITHOUT ENOUGH ZDDP

At startup with a new flat tappet cam, the surface asperities on the lobe and lifter are extreme. Without adequate ZDDP forming a protective chemical film at these contact points, metal-to-metal welding occurs at a microscopic level. The result is accelerated wear that can wipe a lobe flat in 20 minutes.

THE BREAK-IN PROCEDURE

1. Pre-prime the oil system with a priming tool before first start.
2. Fill with high-ZDDP break-in oil (Driven HR3, COMP Cams Break-In, Valvoline VR1).
3. Start the engine and IMMEDIATELY bring to 2,000–2,500 RPM.
4. Continuously vary RPM between 1,500–2,500 for exactly 20 minutes.
5. Do not let the engine idle at any point during break-in.
6. Shut down, cool completely, change oil and filter.

FOR LONG-TERM FLAT TAPPET USE

After break-in, use either a dedicated high-ZDDP oil (Valvoline VR1, Brad Penn Grade 1) or add a ZDDP supplement to your regular oil. Approximately 1,000 ppm ZDDP is sufficient for long-term flat tappet protection in a broken-in engine.`,
      category: "Engine Building",
      readTime: 10,
      publishedAt: new Date("2024-02-20"),
      tags: ["Cam", "Flat Tappet", "Oil", "Break-In", "ZDDP"],
      featured: true,
    },
    {
      slug: "bore-hone-guide",
      title: "What Bore and Hone Actually Means",
      excerpt: "The difference between boring and honing, why surface finish matters, and how to tell if your machine shop did it right.",
      content: `Boring and honing are two distinct operations that are often confused. Understanding the difference helps you specify the right work from your machine shop and inspect the results.

BORING

Boring is the cutting operation that enlarges the cylinder to the correct oversize (e.g., +0.030"). A boring bar removes most of the material, leaving the cylinder close to the final size. However, boring alone leaves a rough surface finish and some out-of-roundness.

HONING

Honing is the finishing operation that brings the bore to its final size, roundness, and surface finish. Honing stones run up and down the bore at a specific angle to create the crosshatch pattern essential for ring seating.

THE CROSSHATCH: WHY IT MATTERS

The crosshatch pattern serves a critical function: it holds a thin film of oil to lubricate the rings and provides micro-pockets that the rings can ride in during break-in. The angle (typically 45°) and surface roughness (Ra value) are critical specifications.

Too aggressive: rings won't seat properly, oil consumption
Too smooth: rings can't retain oil, also won't seat
Correct crosshatch: rings seat within 500 miles, oil control is excellent

PLATEAU HONING

Modern performance machine shops use plateau honing — an additional finish pass that removes the high peaks of the crosshatch while leaving the valleys intact. This reduces initial ring-face friction and speeds ring break-in.

TORQUE PLATE HONING

For performance engines, honing should be done with a torque plate bolted to the block. The torque plate simulates the distortion that occurs when the cylinder head is bolted down, ensuring the bore is round under operating conditions.`,
      category: "Machine Shop",
      readTime: 9,
      publishedAt: new Date("2024-01-10"),
      tags: ["Machine Shop", "Boring", "Honing", "Engine Building"],
      featured: false,
    },
    {
      slug: "rod-ratio-explained",
      title: "Rod Ratio Explained: More Than a Number",
      excerpt: "What rod ratio actually affects, the relationship between stroke, rod length, and piston dwell, and what it means for your specific build.",
      content: `Rod ratio is one of those engine building concepts that sounds complicated but affects everything. The formula is simple: rod ratio = connecting rod length / (stroke / 2). The implications are not.

WHAT IS ROD RATIO?

The connecting rod ratio (L/R ratio) describes the geometric relationship between the rod length and the crank throw. A rod ratio of 1.7 means the rod is 1.7 times longer than the crank radius.

Most production engines fall between 1.5 and 1.8. Performance builds aim for 1.6–1.8 or higher.

WHAT IT ACTUALLY AFFECTS

Piston dwell at TDC: Longer rods keep the piston near TDC longer (more dwell time), giving combustion gases more time to push on the piston before it starts moving away rapidly. This generally improves combustion efficiency and power.

Piston velocity: Higher rod ratio produces smoother piston velocity through the stroke, reducing peak piston speed and the stress, friction, and noise that come with it.

Side loading: Lower rod ratio means the connecting rod forms a greater angle to the cylinder bore at maximum rod angularity. This increases the side force on the piston skirt, causing more friction and wear.

THE PRACTICAL LIMITS

You can't simply put any rod length in any engine. The connecting rod length is constrained by:
- Block deck height
- Piston compression height
- Wrist pin location
- Counterweight clearance

For most SBC 350 builds, the standard 5.700" rod (ratio: 1.636) is the baseline. Upgrading to 6.000" rods (ratio: 1.724) requires shorter compression-height pistons but improves the rod ratio significantly with minimal other changes.`,
      category: "Theory & Math",
      readTime: 7,
      publishedAt: new Date("2024-01-25"),
      tags: ["Rod Ratio", "Theory", "Engine Building"],
      featured: false,
    },
    {
      slug: "dynamic-compression-explained",
      title: "Dynamic Compression Ratio: The Number That Actually Matters",
      excerpt: "Why your static compression ratio doesn't predict detonation, and why the dynamic number — driven by your cam — is what really determines octane requirements.",
      content: `Compression ratio is one of the most misunderstood concepts in engine building. Countless builders have installed a pump-gas cam on an engine with 11:1 compression and been confused when it doesn't detonate. The key is understanding dynamic vs. static compression ratio.

STATIC COMPRESSION RATIO

Static CR is calculated using swept volume and clearance volume at BDC and TDC respectively. It's the number on the cam card and in the catalog. It's also not what causes detonation.

THE INTAKE VALVE STAYS OPEN PAST BDC

Here's the part most people miss: when the piston reaches BDC on the intake stroke, the intake valve is not yet closed. It continues flowing mixture into the cylinder while the piston starts moving upward. By the time the intake valve actually closes (IVC point on the cam), the piston is already significantly up the bore.

This means compression doesn't actually start from BDC — it starts from wherever the intake valve closes.

HOW TO CALCULATE DYNAMIC CR

The formula approximates how much cylinder filling occurs before IVC. A cam with late IVC (say, 65° ABDC) loses more effective compression than one with 45° IVC, because the piston has traveled further before the charge is trapped.

This is why high-lift, long-duration performance cams can run safely on pump gas in engines with 11:1 static compression. The late IVC reduces the dynamic compression ratio to the 7.5–8.5:1 range that pump gas can handle.

PRACTICAL IMPLICATIONS

If you're selecting a cam for a high-compression engine and want to run pump gas:
- Target dynamic CR of 7.5–8.0:1 for 91 octane
- Target dynamic CR of 8.0–8.5:1 for 93 octane
- Select a cam with IVC at 60–70° ABDC for maximum dynamic CR reduction

The EngineVault Compression Ratio Calculator computes both static and dynamic CR in real time.`,
      category: "Theory & Math",
      readTime: 8,
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
