export default {
  slug: "wrench-size-converter",
  intro: "Most modern engines are a mix of SAE and metric fasteners — a Chevy LS uses metric head bolts on an SAE block, a Cummins swap drops a metric engine into an SAE chassis. When the right wrench isn't on the bench, knowing which size from the other system will actually fit (and which will round the bolt) is the difference between finishing the job and a trip to the parts store.",
  sections: [
    {
      heading: "How the conversion works",
      body: `
        <p><strong>1 inch = 25.4 mm exactly.</strong> Multiply a fractional SAE size by 25.4 to get its mm equivalent. The question isn't the math — it's whether the closest standard wrench in the other system is close enough to actually grip the fastener without slipping.</p>
        <ul>
          <li><strong>SAE wrench sets</strong> step in 1/16" or 1/32" — about 1.59 mm or 0.79 mm per size.</li>
          <li><strong>Metric wrench sets</strong> step in 1 mm (sometimes 0.5 mm at the small end) — finer resolution above 13 mm.</li>
        </ul>
        <p>Because the two systems use different step sizes, some fasteners land between standard wrenches in one system but exactly on a wrench in the other. That's why a 19 mm wrench is a near-perfect 3/4", but 1/2" has no clean metric equivalent (12.7 mm — and your closest metric is 13 mm, which is 0.30 mm too big).</p>
      `,
    },
    {
      heading: "Which swaps are actually safe?",
      body: `
        <p>This calculator classifies each pairing by the size gap:</p>
        <ul>
          <li><strong style="color:#15803d">Same (Δ ≤ 0.20 mm / 8 thou):</strong> Functionally identical. Either wrench fits with no risk.</li>
          <li><strong style="color:#b45309">Close (0.20–0.40 mm):</strong> Workable on a hand-tight fastener. <em>Will round the bolt</em> if you torque hard against the gap — the wrench rocks before the fastener turns.</li>
          <li><strong style="color:#c2410c">Loose (0.40–0.80 mm):</strong> Don't. The wrench will slip and round the head before the bolt breaks loose.</li>
          <li><strong style="color:#991b1b">No equivalent:</strong> Use the correct size.</li>
        </ul>
        <p>The "Same" pairs are the ones most mechanics actually memorize: <strong>5/16" ≈ 8 mm, 7/16" ≈ 11 mm, 5/8" ≈ 16 mm, 3/4" ≈ 19 mm, 7/8" ≈ 22 mm, 1-1/16" ≈ 27 mm.</strong> Those are the only six SAE↔metric pairs where the wrenches truly interchange under load.</p>
      `,
    },
    {
      heading: "Why this matters under torque",
      body: `
        <p>A wrench that's 0.30 mm oversize fits over the bolt head with visible play. With light hand torque, you can wiggle it onto the flats and turn the bolt. With real torque, the flats start to deform — the corners of the bolt head get squeezed, the wrench rotates a few degrees before the bolt does, and one of two things happens: the wrench slips off and rounds the head, or the corners shear and you're now looking at extractors.</p>
        <p>This is especially bad on aluminum heads, soft brass plugs, or any bolt that was already torqued once before. <strong>Use the right size for anything you're tightening to spec.</strong> The "close enough" swaps are for breaking loose a bolt you're going to replace anyway.</p>
      `,
    },
    {
      heading: "Six-point vs twelve-point matters too",
      body: `
        <p>Even when the size matches, a twelve-point wrench or socket grips less of the bolt head than a six-point — only the corners actually carry load. On a size that's slightly off, a twelve-point will round the corners much faster than a six-point. If you're forced into a "Close" swap, use six-point if you have it.</p>
      `,
    },
  ],
  related: [
    { slug: "mm-inch-converter", title: "MM ↔ Inch Converter" },
    { slug: "decimal-fraction-inch", title: "Decimal ↔ Fraction Inch" },
    { slug: "tap-drill-lookup", title: "Tap Drill Size Lookup" },
    { slug: "thread-pitch-converter", title: "Thread Pitch (TPI ↔ Metric)" },
  ],
};
