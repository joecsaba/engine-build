export default {
  slug: "mm-inch-converter",
  intro: "Engine builders bounce between metric and imperial constantly — service manuals are mm, US tooling is in thousandths, and most spec sheets mix both. This converter handles either direction at machinist precision.",
  sections: [
    {
      heading: "The conversion",
      body: `
        <p><strong>1 inch = 25.4 mm exactly</strong> (defined, not approximate, since 1959).</p>
        <ul>
          <li><strong>mm → inch:</strong> divide by 25.4</li>
          <li><strong>inch → mm:</strong> multiply by 25.4</li>
          <li><strong>thousandths to mm:</strong> 0.001" = 0.0254 mm. A 0.005" feeler gauge = 0.127 mm.</li>
        </ul>
      `,
    },
    {
      heading: "Where rounding bites you",
      body: `
        <p>A 4.000" bore is 101.6 mm exactly — but a 4-inch nominal piston is often 4.0008" (101.62 mm). A 0.001" rounding error matters when you're checking piston-to-wall clearance. Always keep at least 3 decimal places in inch values and 3 in mm.</p>
      `,
    },
  ],
  related: [
    { slug: "decimal-fraction-inch", title: "Decimal ↔ Fraction Inch" },
    { slug: "thread-pitch-converter", title: "Thread Pitch (TPI ↔ Metric)" },
    { slug: "torque-units-converter", title: "Torque Units Converter" },
  ],
};
