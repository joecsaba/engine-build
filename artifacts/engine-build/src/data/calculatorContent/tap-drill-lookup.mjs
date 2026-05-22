export default {
  slug: "tap-drill-lookup",
  intro: "The drill size you use before tapping a hole determines how much material is left for the tap to cut. Too small a drill bit and the tap binds and breaks (or the threads tear). Too large and you have only weak threads holding nothing.",
  sections: [
    {
      heading: "75% vs 50% thread engagement",
      body: `
        <p><strong>75% thread engagement</strong> is the default — strong threads, but harder tapping, especially in tough materials like steel or stainless.</p>
        <p><strong>50% thread engagement</strong> is only ~5% weaker but ~30% easier to tap. Use it for:</p>
        <ul>
          <li>Hard materials (304/316 stainless, hardened steel)</li>
          <li>Thin sections where breakage risk is high</li>
          <li>Through-holes where strength is shared with other fasteners</li>
        </ul>
        <p>Don't use 50% for safety-critical fasteners — head bolts, main caps, rod bolts. Always 75%+ there.</p>
      `,
    },
    {
      heading: "Common engine taps",
      body: `
        <ul>
          <li><strong>1/4-20 (UNC):</strong> 75% → #7 drill (0.201") · 50% → #8 (0.199")</li>
          <li><strong>5/16-18 (UNC):</strong> 75% → letter F (0.257") · 50% → letter G (0.261")</li>
          <li><strong>3/8-16 (UNC):</strong> 75% → 5/16" (0.3125") · 50% → letter Q (0.332")</li>
          <li><strong>7/16-14 (UNC):</strong> 75% → letter U (0.368") · 50% → 3/8" (0.375")</li>
          <li><strong>1/2-13 (UNC):</strong> 75% → 27/64" (0.422") · 50% → 7/16" (0.4375")</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "thread-pitch-converter", title: "Thread Pitch (TPI ↔ Metric)" },
    { slug: "decimal-fraction-inch", title: "Decimal ↔ Fraction Inch" },
    { slug: "bolt-spec-lookup", title: "Head Bolt & Main Bolt Specs" },
  ],
};
