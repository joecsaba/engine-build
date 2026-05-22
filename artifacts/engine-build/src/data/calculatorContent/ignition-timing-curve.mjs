export default {
  slug: "ignition-timing-curve",
  intro: "An ignition advance curve plots total timing (degrees BTDC) against RPM and load. Get it wrong and you either pull power on top (too little advance) or detonate at part throttle (too much). The curve is the sum of three sources: initial (mechanical setting), mechanical advance (centrifugal weights), and vacuum advance.",
  sections: [
    {
      heading: "The three timing sources",
      body: `
        <ul>
          <li><strong>Initial timing:</strong> Where the distributor is locked. Set with the engine at idle and the vacuum advance disconnected. Typical: 8–14° BTDC for street SBC, 14–20° for performance combos.</li>
          <li><strong>Mechanical (centrifugal) advance:</strong> Adds with RPM as flyweights pivot out against springs. Should be fully "in" by 3,000–3,500 RPM. Typical: +20–24° total mechanical.</li>
          <li><strong>Vacuum advance:</strong> Adds only at part throttle when manifold vacuum is high (light load). Typical: +10–15° at cruise. Disappears under load when vacuum drops.</li>
        </ul>
      `,
    },
    {
      heading: "Typical total timing targets",
      body: `
        <ul>
          <li><strong>WOT (no vacuum):</strong> Initial + Mechanical. Target 32–36° for SBC, 32–34° for BBC, 24–28° for LS (smaller chambers).</li>
          <li><strong>Cruise (high vacuum):</strong> Initial + Mechanical + Vacuum. Often 45–55° total — sounds high but normal at light load because there's so little fuel to burn.</li>
          <li><strong>Detonation under load:</strong> Pull mechanical 2° at a time until knock stops. Don't reduce initial — that hurts idle quality and throttle response.</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "octane-mix", title: "Octane Mix Calculator" },
    { slug: "boost-compression", title: "Boost / Effective CR" },
  ],
};
