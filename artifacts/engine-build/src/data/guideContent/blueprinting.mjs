// Long-form body for /guides/blueprinting. See bearing-clearance.mjs for the
// markup contract shared by every guide content file.

export default {
  slug: "blueprinting",
  intro:
    "Blueprinting means building an engine to exact specifications — matching, balancing, and verifying every measurement to fall at the centre of its tolerance range rather than anywhere within it. A factory engine is built to spec. A blueprinted engine is built to the ideal specification. The difference is measured in thousandths of an inch, and in power, reliability and longevity at the limit.",
  sections: [
    {
      heading: "What is blueprinting?",
      body: `
        <p>The term comes from engineering blueprints &mdash; when builders say "I blueprinted it," they mean they built it exactly as the engineering specifications dictate, not as close as is economically practical on an assembly line.</p>
        <p>A production engine leaves the factory with every dimension somewhere inside its tolerance band. One bore might sit at the top of the range and the next at the bottom; one rod might be four grams heavier than its neighbour. Every one of those parts passes inspection. Blueprinting removes the scatter, so that every cylinder makes the same compression, every rod carries the same mass, and no single component is the one that gives up first.</p>
      `,
    },
    {
      heading: "What actually gets blueprinted",
      body: `
        <table>
          <thead>
            <tr><th>Component</th><th>What is done</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Cylinder bores</strong></td><td>All bores measured and honed to identical dimensions within 0.0001". Taper and out-of-round corrected to nearly zero.</td></tr>
            <tr><td><strong>Deck height</strong></td><td>Block decked so all cylinders are exactly the same height from deck to piston at TDC. Compression ratio equalized across all cylinders.</td></tr>
            <tr><td><strong>Crankshaft journals</strong></td><td>All main and rod journals measured and ground to identical dimensions. Roundness and taper verified. Journals polished to the correct surface finish for the bearing type.</td></tr>
            <tr><td><strong>Connecting rods</strong></td><td>Rods weighed and matched, all within 1 gram of each other. Pin bores and big-end bores checked for roundness and size.</td></tr>
            <tr><td><strong>Pistons</strong></td><td>All pistons weighed and matched. Pin fit verified. Piston-to-wall clearance set to the centre of the performance range.</td></tr>
            <tr><td><strong>Rotating assembly balance</strong></td><td>Complete rotating assembly &mdash; crank, rods, pistons, pins, rings, damper, flywheel &mdash; dynamically balanced to near-zero imbalance.</td></tr>
            <tr><td><strong>Port matching</strong></td><td>Intake ports, exhaust ports and gaskets matched so no ledges or lips exist at the port-to-gasket interface. Eliminates turbulence and improves flow.</td></tr>
            <tr><td><strong>Valve jobs</strong></td><td>Multi-angle valve job cut to specific geometry. Seat width and angles matched precisely. Valves lapped for perfect seating. Stem-to-guide clearance verified.</td></tr>
            <tr><td><strong>Cam degreeing</strong></td><td>Cam installed and verified against the cam card. Intake centerline set exactly as specified.</td></tr>
          </tbody>
        </table>
      `,
    },
    {
      heading: "Cost vs. benefit",
      body: `
        <table>
          <thead>
            <tr><th>Build type</th><th>What's included</th><th>Cost premium</th><th>Benefit</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Standard rebuild</strong></td>
              <td>Bore, hone, deck, valve job, new bearings</td>
              <td>$0</td>
              <td>Baseline &mdash; factory-spec performance</td>
            </tr>
            <tr>
              <td><strong>Performance rebuild</strong></td>
              <td>Above, plus clearances at performance spec and a decent balance job</td>
              <td>+$200&ndash;$500</td>
              <td>10&ndash;15% better reliability, marginal power gain</td>
            </tr>
            <tr>
              <td><strong>Partial blueprint</strong></td>
              <td>Above, plus port match, cam degree, exact clearances</td>
              <td>+$500&ndash;$1,500</td>
              <td>Consistent power, 15&ndash;25% more margin before failure</td>
            </tr>
            <tr>
              <td><strong>Full blueprint</strong></td>
              <td>Everything &mdash; matched rods and pistons, bore-to-bore identical, full balance, all ports matched, all clearances centre-spec</td>
              <td>+$2,000&ndash;$5,000+</td>
              <td>Maximum power, reliability and engine life. Required for serious race engines</td>
            </tr>
          </tbody>
        </table>
        <p>Prices are indicative of typical US machine shop rates and vary widely by region, engine family and how much of the work you can do yourself.</p>
      `,
    },
    {
      heading: "Is it worth it?",
      body: `
        <aside data-tone="tip">
          <p><strong>The honest answer.</strong> For a street car that sees 6,000 RPM occasionally, a standard good-quality rebuild with proper clearances and a balance job is 90% of the benefit at 30% of the cost. For a race engine that sees 7,500+ RPM regularly under competition loads, a full blueprint isn't optional &mdash; it's the price of reliability. Everything in between is a judgment call based on your budget, your goals, and how angry you'll be when it lets go at the worst possible moment.</p>
        </aside>
        <p>If the budget only stretches to part of the list, spend it on the balance job and on getting the clearances right. Those two protect the engine. Port matching and chamber cc work buy power, and power is worth very little attached to a bottom end that won't survive it.</p>
      `,
    },
  ],
  related: [
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "bearing-clearance", title: "Bearing Clearance Calculator" },
    { slug: "rod-ratio", title: "Rod Ratio Calculator" },
  ],
};
