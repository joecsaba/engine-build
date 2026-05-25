// Manifest of all engine-building guides. Read by:
//   - src/pages/guides/index.tsx — to render the guides listing
//   - scripts/prerender.mjs       — to generate per-guide HTML with unique
//                                   <title>/meta and HowTo JSON-LD, and to
//                                   add each /guides/<slug> to sitemap.xml
//
// Schema rationale:
//   level         — Beginner / Intermediate / Advanced (shown on index card)
//   totalTime     — display string (e.g. "15 min") used in HowTo JSON-LD too
//   steps         — optional. Each step becomes a HowToStep in JSON-LD. Keep
//                   each text 1-2 sentences. When empty, the page is still
//                   indexed normally; HowTo schema is just skipped.

export default [
  {
    slug: "bearing-clearance",
    level: "Beginner",
    title: "How to Check Bearing Clearance",
    description: "Using Plastigage to measure main and rod bearing clearances. Step-by-step with spec table.",
    totalTime: "15 min",
    steps: [
      { name: "Clean the journal and bearing", text: "Wipe the crank journal and bearing surface with a clean lint-free cloth. Any debris will throw off the reading." },
      { name: "Lay Plastigage across the journal", text: "Place a strip of Plastigage across the full width of the journal, parallel to the crankshaft axis. Don't get any oil on it." },
      { name: "Install the cap and torque to spec", text: "Install the bearing cap with the Plastigage in place. Torque the bolts to the engine's full main/rod cap spec — including angle if it's a TTY procedure. Do NOT rotate the crankshaft." },
      { name: "Remove the cap and measure", text: "Remove the cap. The Plastigage will be crushed into a flat strip. Match the width to the included gauge card — that's your bearing clearance in inches or mm." },
      { name: "Compare to spec", text: "Check against the engine's published clearance range. Iron blocks typically spec 0.0020–0.0025\"; aluminum blocks usually 0.0015–0.0020\". Out-of-spec means re-grind or re-bearing the journal." },
    ],
  },
  {
    slug: "ring-gap",
    level: "Beginner",
    title: "How to Set Piston Ring End Gap",
    description: "Proper filing technique, stagger positioning, and oil ring installation.",
    totalTime: "12 min",
    steps: [
      { name: "Calculate your target gap", text: "Use the ring-gap calculator. Rule of thumb: 0.004\"/inch of bore for NA, 0.006\"/inch for turbo, 0.007\"/inch for nitrous." },
      { name: "Clean the cylinder bore", text: "Wipe the bore with brake cleaner or denatured alcohol. Honing grit or oil will throw off the measurement." },
      { name: "Square the ring with a piston", text: "Drop the ring in the bore, then push it down ~1\" with the flat top of a piston so it sits perpendicular to the bore." },
      { name: "Measure with feeler gauges", text: "Find the largest feeler gauge that fits with light drag. That's your gap. Rotate the ring 90° and re-measure to check for out-of-round." },
      { name: "File rings that are too tight", text: "Use a dedicated ring filer (not a Dremel). File one end only, 0.001\" at a time. Deburr the edges with 600-grit. Never overshoot your target by more than 0.0005\"." },
      { name: "Repeat for every ring in every cylinder", text: "Top, second, oil rails — measure all of them. Track which ring went into which cylinder so the gap stays with it during assembly." },
    ],
  },
  {
    slug: "break-in",
    level: "Beginner",
    title: "Engine Break-In Procedure",
    description: "Complete flat-tappet AND roller cam break-in. The critical ZDDP requirements explained.",
    totalTime: "18 min",
    steps: [
      { name: "Use a high-ZDDP break-in oil", text: "Flat tappet cams require break-in oil with 1500+ ppm zinc (ZDDP). Modern SN-rated oils don't have enough. Brands: Brad Penn 30W, Driven BR30, COMP Cams break-in oil." },
      { name: "Prime the oiling system", text: "Spin the oil pump with a drill until you see oil at every rocker. Don't even crank the engine before you have oil flow." },
      { name: "First start: 20 minutes at 2000+ RPM", text: "For flat tappet cams, run the engine at 2000–2500 RPM for 20 minutes nonstop. This wears the cam lobes and lifters into compatibility. No idling, no shutdowns." },
      { name: "Watch coolant temp", text: "Keep an eye on temp. Pull the plug and let it cool if it climbs above 220°F." },
      { name: "Drain break-in oil at 500 miles", text: "After break-in, run for 500 miles on conventional oil, then drain. Switch to your regular oil only after that." },
    ],
  },
  {
    slug: "degree-cam",
    level: "Intermediate",
    title: "How to Degree a Camshaft",
    description: "Finding TDC, degree wheel setup, intake centerline, and lobe separation verification.",
    totalTime: "20 min",
    steps: [
      { name: "Find true TDC", text: "Install a piston stop in the spark plug hole. Rotate the crank forward until it stops, mark the degree wheel. Rotate backward until it stops, mark again. True TDC is halfway between the marks." },
      { name: "Set up the dial indicator", text: "Mount the dial indicator on the #1 intake lifter (or pushrod cup for OHC). Zero it at the base of the cam lobe." },
      { name: "Find maximum lift", text: "Rotate the crank slowly through the intake event. Note the degree wheel reading at maximum lift on the dial indicator. That's the intake centerline." },
      { name: "Compare to the cam card", text: "Your measured intake centerline should match the cam card spec (e.g. 106° ATDC). If higher (later), the cam is retarded. If lower (earlier), the cam is advanced." },
      { name: "Adjust with offset bushings or adjustable timing set", text: "If the cam is off the card by more than 1–2°, install an offset key, offset bushing, or adjustable timing set to correct it. Re-degree after adjustment and verify final position after torquing the cam bolt." },
    ],
  },
  {
    slug: "machine-shop-quality",
    level: "Intermediate",
    title: "How to Evaluate Machine Shop Work",
    description: "What to inspect when you get your block back. Red flags, measuring guide, questions to ask.",
    totalTime: "14 min",
    steps: [
      { name: "Inspect block surfaces", text: "Check the deck and main bore for scratches, gouges, or unfinished spots. Decks should be machined flat (verify with a precision straightedge and feeler gauges)." },
      { name: "Measure cylinder bores", text: "Use a bore gauge to measure each cylinder at top, middle, and bottom. Bores should all be within 0.0005\" of each other and round (no taper or out-of-round)." },
      { name: "Check main bore alignment", text: "Mains should be align-honed straight within 0.0005\" end to end. Lay a precision arbor in and rotate it — any binding means misalignment." },
      { name: "Inspect head surface and valve work", text: "Heads should be flat and clean. Valve seats should be 3-angle ground with no chatter marks. Test valve sealing with a vacuum tester or wet test." },
      { name: "Walk away if you find red flags", text: "Visible chatter marks, missed cuts, sloppy measurements, or 'good enough' attitudes are deal breakers. A bad rebuild costs more than a good one done right." },
    ],
  },
  {
    slug: "blueprinting",
    level: "Advanced",
    title: "Blueprinting an Engine",
    description: "What blueprinting actually means, what gets blueprinted, and whether it's worth the cost for your build.",
    totalTime: "22 min",
    steps: [
      { name: "Establish baseline specs", text: "Measure every component (bore, stroke, journal diameters, deck height, chamber volume) and record actual vs. published values." },
      { name: "Balance the rotating assembly", text: "Match piston weights, rod weights, and bobweights. Spin balance the assembled rotating mass to within 1 gram. This eliminates harmonic vibration that wastes power." },
      { name: "CC the combustion chambers", text: "Measure each chamber volume and equalize them to within 0.5 cc. Uneven chambers create uneven compression across cylinders — the cylinder with smallest chamber detonates first." },
      { name: "Match port volumes", text: "CC every intake and exhaust port. Match them to within 1–2 cc. The smallest port becomes the airflow ceiling for the entire engine." },
      { name: "Set bearing clearances individually", text: "Don't just spec a target — measure every journal and select bearings to hit exactly the same clearance at each position." },
      { name: "Decide if it's worth it", text: "Blueprinting adds 5–15 HP on a 500 HP engine and dramatically improves smoothness and longevity. For street builds, it's not always cost-effective. For race builds making 600+ HP, it's mandatory." },
    ],
  },
];
