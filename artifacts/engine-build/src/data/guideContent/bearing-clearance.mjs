// Long-form body for /guides/bearing-clearance.
//
// Single source of truth: rendered in React by <GuideContent> and emitted as
// static HTML by scripts/prerender.mjs, so what a reader sees and what
// Googlebot indexes are the same words. Bodies are trusted HTML written by us.
//
// Markup contract (styled by GuideContent, see that file):
//   <aside data-tone="warn|danger|tip"> — callout box
//   plain <p>/<ul>/<ol>/<table>/<svg>   — styled by the typography plugin
// SVG attributes must be HTML-cased (stroke-width, text-anchor), not React-cased.

export default {
  slug: "bearing-clearance",
  intro:
    "Bearing clearance is the oil film gap between a bearing shell and the journal it rides on. Too tight and the oil film collapses, the bearing seizes and the engine is destroyed. Too loose and oil pressure drops, the film goes thin at load, and the bearing wears out early. Plastigage measures this gap accurately with about ten dollars of materials.",
  note: {
    tone: "warn",
    title: "Safety Note",
    body: "Bearing clearance is one of the most critical measurements in engine assembly. Too tight = bearing spun and engine destroyed. Too loose = insufficient oil pressure, premature wear. Take your time and measure correctly.",
  },
  sections: [
    {
      heading: "What is Plastigage?",
      body: `
        <p>Plastigage is a calibrated strip of crushable plastic used to measure the oil clearance between a bearing and its journal. When the cap is torqued down on the Plastigage, the plastic is crushed to a width proportional to the clearance. The width is then compared to the printed gauge on the Plastigage package to read the clearance in thousandths of an inch.</p>
        <p>Plastigage comes in three grades:</p>
        <ul>
          <li><strong>PG-1 (Green):</strong> 0.001"&ndash;0.003" &mdash; use for most main and rod bearings</li>
          <li><strong>PG-2 (Red):</strong> 0.002"&ndash;0.006" &mdash; use when you expect looser clearances</li>
          <li><strong>PG-3 (Blue):</strong> 0.004"&ndash;0.009" &mdash; use for very loose clearances or large diesels</li>
        </ul>
      `,
    },
    {
      heading: "What you need",
      body: `
        <ul>
          <li>Plastigage (appropriate grade)</li>
          <li>Torque wrench (capable of your specific torque values)</li>
          <li>Clean rags and brake cleaner or acetone</li>
          <li>Factory service manual or torque spec reference</li>
          <li>Scissors (to cut Plastigage strips)</li>
          <li>Feeler gauges (as a cross-check)</li>
        </ul>
      `,
    },
    {
      heading: "Step 1: Clean everything",
      body: `
        <p>The journal (crank), bearing shells, and cap bore must be absolutely clean and DRY. Any oil, assembly lube, or debris will give you a false reading. Clean with brake cleaner and dry completely. This step matters &mdash; a film of oil can throw your reading off by 0.001".</p>
        <table>
          <thead>
            <tr><th>Correct placement</th><th>Wrong</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Strip runs <strong>parallel to the crank axis</strong></td>
              <td>Strip wrapped around the journal (circumferentially)</td>
            </tr>
            <tr>
              <td>Spans nearly the <strong>full bearing width</strong></td>
              <td>Tiny strip &mdash; won't crush evenly</td>
            </tr>
            <tr>
              <td>Held on the <strong>journal surface</strong> with a dab of grease</td>
              <td>On the bearing shell &mdash; will smear</td>
            </tr>
            <tr>
              <td><strong>Clear of the oil hole</strong></td>
              <td>Over the oil hole &mdash; no contact, no reading</td>
            </tr>
          </tbody>
        </table>
      `,
    },
    {
      heading: "Step 2: Install the lower bearing shell",
      body: `
        <p>Install the lower bearing shell (without any lubrication) in the connecting rod or main cap. Make sure it clicks into place &mdash; the tang on the bearing aligns with the notch in the cap. The bearing must be fully seated.</p>
      `,
    },
    {
      heading: "Step 3: Place the Plastigage",
      body: `
        <p>Cut a strip of Plastigage approximately 1/2" shorter than the bearing width. Place it on the journal parallel to the crankshaft centerline. The strip goes on the crankshaft journal itself &mdash; NOT on the bearing. Position it at the widest part of the journal, avoiding the oil holes.</p>
      `,
    },
    {
      heading: "Step 4: Install the cap and torque",
      body: `
        <p>Install the cap (and upper bearing shell if checking mains) carefully &mdash; DO NOT rotate the crankshaft. Any rotation will smear the Plastigage and invalidate the reading. Torque the bolts to specification in the correct sequence. For most applications, torque in three steps: 1/3 &rarr; 2/3 &rarr; full torque.</p>
        <aside data-tone="warn">
          <p><strong>Use your engine's published spec.</strong> Main and rod cap torque varies by engine family, by hardware (factory bolt versus ARP stud), and by procedure &mdash; many modern engines are torque-to-yield and finish on an angle rather than a value. Take the figure from the factory service manual or the fastener manufacturer's instruction sheet for your exact engine and hardware. Getting cap torque wrong distorts the bearing bore and changes the very clearance you are trying to measure.</p>
        </aside>
      `,
    },
    {
      heading: "Step 5: Remove the cap and read",
      body: `
        <p>Remove the cap carefully without rotating the crankshaft. You'll see the Plastigage has been crushed into a flat strip. Using the printed gauge on the Plastigage package, measure the widest point of the crushed strip. The package has two scales &mdash; use the one matching your Plastigage grade (mm or inches).</p>
        <svg viewBox="0 0 400 100" role="img" aria-label="Diagram: measure the widest point of the crushed Plastigage strip.">
          <rect x="50" y="20" width="300" height="60" rx="4" fill="#f9fafb" stroke="#e5e7eb" />
          <rect x="100" y="35" width="200" height="10" rx="2" fill="#E85D04" opacity="0.7" />
          <rect x="120" y="35" width="150" height="10" rx="2" fill="#E85D04" />
          <text x="200" y="75" text-anchor="middle" fill="#6b7280" font-size="11">Measure widest point of crushed Plastigage</text>
          <line x1="120" y1="25" x2="120" y2="33" stroke="#374151" stroke-width="1.5" />
          <line x1="270" y1="25" x2="270" y2="33" stroke="#374151" stroke-width="1.5" />
          <text x="195" y="22" text-anchor="middle" fill="#374151" font-size="10" font-weight="bold">Width = 0.002" clearance</text>
        </svg>
      `,
    },
    {
      heading: "Step 6: What to do with the reading",
      body: `
        <table>
          <thead>
            <tr><th>Application</th><th>Factory spec</th><th>Performance build</th></tr>
          </thead>
          <tbody>
            <tr><td>Main bearing clearance</td><td>0.0010"&ndash;0.0025"</td><td>0.0020"&ndash;0.0030"</td></tr>
            <tr><td>Rod bearing clearance</td><td>0.0010"&ndash;0.0025"</td><td>0.0020"&ndash;0.0028"</td></tr>
            <tr><td>Camshaft bearing clearance</td><td>0.0010"&ndash;0.0030"</td><td>0.0015"&ndash;0.0025"</td></tr>
          </tbody>
        </table>
        <p><strong>If clearance is too tight:</strong> have the machine shop either use 0.001" undersize bearings or lightly polish the journal. DO NOT try to fix this yourself by grinding the crank &mdash; even 0.001" too tight will spin a bearing.</p>
        <p><strong>If clearance is too loose:</strong> the journal is undersized (worn or already ground). Have the machine shop regrind the crank to the next undersize and install matching undersize bearings (0.010", 0.020", or 0.030").</p>
      `,
    },
    {
      heading: "Step 7: Clean off the Plastigage",
      body: `
        <p>Plastigage is water-soluble. Wipe it off with a clean rag and a drop of assembly lube. Make sure every bit is removed from the journal and bearing surface before final assembly.</p>
        <aside data-tone="tip">
          <p><strong>Pro tip: measure all journals.</strong> Don't just check one bearing &mdash; check every main and every rod. Crankshaft journals wear unevenly, and a crank that measures in spec at journal #1 may be 0.003" worn at journal #4. A few minutes of checking now saves an engine rebuild later.</p>
        </aside>
      `,
    },
  ],
  related: [
    { slug: "bearing-clearance", title: "Bearing Clearance Calculator" },
    { slug: "ring-gap", title: "Piston Ring Gap Calculator" },
    { slug: "bolt-spec-lookup", title: "Bolt Torque Spec Lookup" },
  ],
};
