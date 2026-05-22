export default {
  slug: "header-sizing",
  intro: "When the exhaust valve opens, a high-pressure pulse travels down the primary tube at the speed of sound in hot exhaust gas (~1,700–2,000 ft/s). When that pulse reaches the collector, it reflects back as a low-pressure (negative) wave. Tune the tube length right and that negative wave arrives back at the exhaust port just as the valve closes — literally sucking residual exhaust out of the cylinder. Free power, no moving parts.",
  sections: [
    {
      heading: "How acoustic tuning actually works",
      body: `
        <p>The timing of the reflected wave depends on tube length, gas temperature, and engine RPM. At one specific RPM, the pulse makes a perfect round trip in the time available — that's the tuned RPM.</p>
        <p>The <strong>2nd harmonic</strong> gives the strongest scavenging because the reflected pulse has only made one round trip — it arrives with the most energy. Higher harmonics (3rd, 4th) work at shorter tube lengths but produce weaker scavenging since the pulse loses energy at each reflection.</p>
      `,
    },
    {
      heading: "Why the 2nd harmonic dominates long-tube headers",
      body: `
        <ul>
          <li><strong>2nd harmonic (long tubes):</strong> One full round trip during the exhaust event. Standard for long-tube headers.</li>
          <li><strong>3rd harmonic (mid-length):</strong> 1.5 round trips. A compromise between packaging and performance.</li>
          <li><strong>4th harmonic (shorty / block-hugger):</strong> ~Half the 2nd harmonic length. Used when space constraints prevent longer tubes. Some tuning benefit but significantly less than long-tubes.</li>
        </ul>
      `,
    },
    {
      heading: "Tube diameter and the torque curve",
      body: `
        <p>Primary tube diameter controls gas velocity:</p>
        <ul>
          <li><strong>Smaller tube</strong> keeps velocity high at low RPM — better low-end and mid-range torque. Ideal for street and towing.</li>
          <li><strong>Larger tube</strong> reduces low-RPM velocity (hurting bottom-end response) but flows enough for high-RPM power.</li>
        </ul>
        <p>Rule of thumb: 1-5/8" primary works well on a 350 making 300 HP. Push past 400 HP and you need 1-3/4" or 1-7/8". Oversized headers on a mild engine will feel lazy below 3,500 RPM.</p>
      `,
    },
    {
      heading: "Target gas velocity",
      body: `
        <p>Exhaust gas velocity in the primary tubes directly determines scavenging effectiveness:</p>
        <ul>
          <li><strong>Below 200 ft/s:</strong> Pulses too weak — no meaningful scavenging. Engine breathes through an oversized pipe with no tuning benefit.</li>
          <li><strong>200–240 ft/s:</strong> Marginal. Below ideal for most engines.</li>
          <li><strong>240–350 ft/s:</strong> Sweet spot. Street engines run the lower end, race engines the upper end.</li>
          <li><strong>Above 400 ft/s:</strong> Backpressure rises sharply. Engine works harder to push exhaust out.</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "head-flow", title: "Cylinder Head Flow / CFM to HP" },
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "carb-cfm-sizing", title: "Carburetor CFM Sizing" },
  ],
};
