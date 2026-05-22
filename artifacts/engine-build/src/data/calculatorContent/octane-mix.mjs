export default {
  slug: "octane-mix",
  intro: "Blending two fuels to hit a target octane is straightforward math — but \"octane\" in the US is the average of two different ratings (RON and MON), and E85 changes seasonally. The right blend depends on both inputs.",
  sections: [
    {
      heading: "Octane numbers — what the pump label means",
      body: `
        <p>The US pump number is <strong>(R+M)/2</strong> — the average of Research Octane (RON) and Motor Octane (MON). Europe lists RON only, which is always 4–6 points higher than the US number for the same fuel.</p>
        <ul>
          <li><strong>US 87:</strong> ≈ RON 91 (Europe)</li>
          <li><strong>US 93:</strong> ≈ RON 98</li>
          <li><strong>E85 (summer blend):</strong> ≈ R+M/2 of 105–108</li>
          <li><strong>Race gas (110):</strong> ≈ R+M/2 of 110</li>
          <li><strong>Methanol:</strong> ≈ R+M/2 of 110, but very different combustion characteristics</li>
        </ul>
      `,
    },
    {
      heading: "Blending math",
      body: `
        <p>The result is a <strong>volume-weighted average</strong>:</p>
        <p><strong>Result Octane = (Vol₁ × Octane₁ + Vol₂ × Octane₂) ÷ Total Vol</strong></p>
        <p>So blending 5 gal of 93 + 5 gal of 110 → (5×93 + 5×110)/10 = <strong>101.5 octane</strong>. Effective and cheap compared to running full race gas.</p>
      `,
    },
    {
      heading: "E85 seasonal warning",
      body: `
        <p>Summer E85 is 70–85% ethanol; winter E85 in cold-climate states drops to 51–70% ethanol to help cold start. Your octane (and AFR target!) shifts with the seasonal blend. If you're running E85 for the octane, datalog AFR after every fuel-up in winter or you'll go lean.</p>
      `,
    },
  ],
  related: [
    { slug: "afr-lambda", title: "AFR / Lambda Converter" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "boost-compression", title: "Boost / Effective CR" },
  ],
};
