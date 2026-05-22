export default {
  slug: "bearing-clearance",
  intro: "Bearing clearance is the difference between the bearing inside diameter (installed) and the crankshaft journal OD. Despite what it might seem, the bearing never actually touches the crank journal during normal operation — the journal rides on a pressurized film of oil. The bearing just provides correct geometry and a sacrificial surface if the oil film fails.",
  sections: [
    {
      heading: "Tight vs loose clearance trade-offs",
      body: `
        <p><strong>Tighter clearances</strong> (smaller gap) give higher oil pressure (oil has less space to escape) and better load-carrying capacity (oil film is thinner and stiffer).</p>
        <p><strong>Looser clearances</strong> allow more oil to flow through, which carries away more heat — important for high-output or sustained-load engines. The trade-off: less oil pressure and lower load capacity.</p>
        <p>The classic rule of thumb: <strong>one thou per inch of journal diameter</strong>. A 2.100" journal gets approximately 0.0021" clearance.</p>
      `,
    },
    {
      heading: "Block material matters",
      body: `
        <p>Aluminum blocks expand significantly more than iron blocks as they reach operating temperature. Aluminum block engines need <em>tighter</em> cold clearances to achieve the correct hot clearance.</p>
        <ul>
          <li><strong>Iron block SBC:</strong> 0.0020"–0.0025" on the mains</li>
          <li><strong>Aluminum LS:</strong> 0.0015"–0.0020" — the aluminum housing bore grows more as it heats up</li>
        </ul>
      `,
    },
    {
      heading: "How to actually measure",
      body: `
        <p>Always measure clearances with the bearings torqued to spec. Two ways:</p>
        <ul>
          <li><strong>Plastigage:</strong> cheap, fast, accurate to about ±0.0005". Lay a strip across the journal, torque the cap, remove and measure the crushed strip width.</li>
          <li><strong>Bore gauge + micrometer:</strong> measure bearing ID with the cap torqued, subtract crank journal OD. More accurate and lets you see taper/out-of-round.</li>
        </ul>
        <p>Never assume the bearing matches the published size. Manufacturing tolerances on bearings, blocks, and crankshafts all stack — actual installed clearance can be 0.0005"+ off the nominal calculation.</p>
      `,
    },
    {
      heading: "Oil viscosity should match clearance",
      body: `
        <ul>
          <li><strong>Tight clearance (under 0.0020"):</strong> 5W-20, 0W-20, even 0W-16 — thinner oil is fine and reduces parasitic drag</li>
          <li><strong>Standard clearance (0.0020"–0.0030"):</strong> 5W-30, 10W-30 — the OE-spec range for most modern engines</li>
          <li><strong>Loose clearance (over 0.0030"):</strong> 15W-40, 20W-50 — needed to maintain oil film and pressure at hot operating temp</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "rod-ratio", title: "Connecting Rod Ratio Calculator" },
    { slug: "piston-speed", title: "Piston Speed Calculator" },
    { slug: "bolt-spec-lookup", title: "Head Bolt & Main Bolt Specs" },
  ],
};
