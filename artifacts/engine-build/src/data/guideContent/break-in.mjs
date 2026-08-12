// Long-form body for /guides/break-in. See bearing-clearance.mjs for the
// markup contract shared by every guide content file.

export default {
  slug: "break-in",
  intro:
    "Break-in is where a flat tappet camshaft either survives or is destroyed, and it happens inside the first twenty minutes of running. Roller cams are far more forgiving. The difference comes down to how the lobe meets the lifter, and it dictates which oil you use and how you run the engine on first start.",
  note: {
    tone: "warn",
    title: "Flat tappet cam owners — read this first",
    body: "Modern API SM and SN rated engine oils do NOT have sufficient ZDDP (zinc dialkyl dithiophosphate) to protect flat tappet cams during break-in. This is not a rumor — it is a documented fact. Using the wrong oil WILL wipe the lobes on a new flat tappet cam within the first 20 minutes of operation.",
  },
  sections: [
    {
      heading: "The ZDDP story",
      body: `
        <p>Zinc dialkyldithiophosphate (ZDDP) is an anti-wear additive that protects metal surfaces under high pressure &mdash; exactly the situation at the cam lobe-to-lifter interface. Since the mid-2000s, the EPA required oil manufacturers to reduce ZDDP to protect catalytic converters in modern fuel-injected engines (which use roller cams and don't need it). The result: modern API SM/SN oils have roughly 600&ndash;800 ppm ZDDP. Flat tappet cams need roughly 1,200&ndash;1,500 ppm for safe break-in.</p>
        <p>A flat tappet lifter does not roll on the lobe &mdash; it slides across it, and the whole load rides on a contact patch a few thousandths of an inch wide. That is a boundary-lubrication regime: the oil film alone cannot keep the surfaces apart, so the anti-wear additive has to form a sacrificial layer instead. Take the additive away and the lobe and lifter weld and tear rather than slide.</p>
      `,
    },
    {
      heading: "Approved break-in oils for flat tappet cams",
      body: `
        <table>
          <thead>
            <tr><th>Product</th><th>ZDDP level</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr><td>Driven HR3 (10W-30)</td><td>~1,800 ppm</td><td>Purpose-built break-in oil, excellent choice</td></tr>
            <tr><td>COMP Cams Break-In Oil</td><td>~1,400 ppm</td><td>Compatible with all cam manufacturers</td></tr>
            <tr><td>Valvoline VR1 Racing (20W-50)</td><td>~1,300 ppm</td><td>Available at most auto parts stores</td></tr>
            <tr><td>Joe Gibbs Break-In Oil</td><td>~1,800 ppm</td><td>Premium option for high-performance builds</td></tr>
            <tr><td>Brad Penn Grade 1 (20W-50)</td><td>~1,500 ppm</td><td>Pennsylvania-based, excellent flat tappet choice</td></tr>
            <tr><td>Modern API SN oil + ZDDP additive</td><td>~600 + 600 ppm</td><td>Works but less ideal than purpose-built oil</td></tr>
          </tbody>
        </table>
        <p>Verify the current additive package with the manufacturer before you buy &mdash; formulations change, and the figure printed on last year's tech sheet is not a guarantee about this year's bottle.</p>
      `,
    },
    {
      heading: "Flat tappet cam break-in procedure",
      body: `
        <p>This is the most critical procedure in flat tappet engine assembly. There is NO second chance if you do it wrong.</p>
        <ol>
          <li><strong>Before first start.</strong> Prime the oil system. Use an oil priming tool (or a drill motor spinning the oil pump driveshaft) to circulate oil through the engine before it ever fires. You want oil pressure established before the first revolution. Minimum 15&ndash;30 seconds of pumping, and confirm oil at every rocker.</li>
          <li><strong>Fill with break-in oil.</strong> Use one of the approved high-ZDDP oils listed above. Fill to the proper level. Check the filter and drain plug.</li>
          <li><strong>Pre-set the timing.</strong> Set ignition timing conservatively &mdash; 10&ndash;12&deg; BTDC for most street engines. You can dial it in later. Running too much advance during break-in causes heat and detonation stress.</li>
          <li><strong>Start the engine and go immediately to 2,000&ndash;2,500 RPM.</strong> DO NOT let the engine idle. The moment it fires, bring it up. This is not optional. At idle the cam lobes receive insufficient oiling AND the spring pressure versus lifter load ratio is at its worst. Lobes wipe at idle on new flat tappet cams &mdash; this is why.</li>
          <li><strong>Vary the RPM continuously for 20 minutes.</strong> Sweep between 1,500 and 2,500 RPM. Do not hold a steady RPM. The varying load cycles the lobes and helps them seat against the lifters. Watch oil pressure (40+ PSI), coolant temperature (stable, under 220&deg;F), and listen.</li>
          <li><strong>What to listen for.</strong> You should hear valvetrain noise that gradually quietens as it seats. You should NOT hear rapid ticking that gets louder (potential lobe failure), knocking (detonation &mdash; reduce timing), or notice falling oil pressure.</li>
          <li><strong>After 20 minutes.</strong> Shut down and let it cool to ambient. Change the oil and filter &mdash; the break-in oil has done its job and is now carrying cam and ring break-in debris. Install your regular running oil.</li>
          <li><strong>First 500 miles.</strong> Vary your driving. Avoid sustained RPM. Do a few moderate acceleration runs from 30&ndash;60 MPH. Change oil again at 500 miles as the rings continue to seat.</li>
        </ol>
        <aside data-tone="danger">
          <p><strong>Do not plan to stop.</strong> Have coolant in it, the timing set, a helper on the throttle, and a fire extinguisher within reach <em>before</em> you turn the key. A leak you stop to fix at minute six costs you the camshaft.</p>
        </aside>
      `,
    },
    {
      heading: "Roller cam break-in",
      body: `
        <p>Hydraulic and solid roller cams are FAR easier to break in. Because the rolling element contacts the lobe instead of a sliding flat surface, the high-pressure interface is completely different &mdash; no wiping risk, no ZDDP requirement.</p>
        <table>
          <thead>
            <tr><th>Requirement</th><th>Roller cam</th></tr>
          </thead>
          <tbody>
            <tr><td>Oil</td><td>Standard API SN or SP rated oil is fine. Any good synthetic is excellent.</td></tr>
            <tr><td>RPM</td><td>Normal idle is acceptable. No need to hold 2,000 RPM.</td></tr>
            <tr><td>Duration</td><td>A 30-minute warm-up cycle is sufficient. Listen and monitor gauges.</td></tr>
            <tr><td>Ring seating</td><td>Still matters. Vary load, avoid sustained WOT for the first 500 miles, change oil at 500 miles.</td></tr>
          </tbody>
        </table>
      `,
    },
    {
      heading: "Long-term ZDDP for flat tappet engines",
      body: `
        <aside data-tone="tip">
          <p>For the life of a flat tappet engine, use either a dedicated high-ZDDP oil (Valvoline VR1, Brad Penn Grade 1) or add a ZDDP supplement at every oil change. The first oil change, right after the 20-minute break-in, is the most critical &mdash; after that, maintaining roughly 1,000+ ppm ZDDP is sufficient for ongoing wear protection.</p>
        </aside>
      `,
    },
  ],
  related: [
    { slug: "cam-degreeing", title: "Cam Degreeing Calculator" },
    { slug: "valve-spring", title: "Valve Spring Pressure Calculator" },
    { slug: "ring-gap", title: "Piston Ring Gap Calculator" },
  ],
};
