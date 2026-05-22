export default {
  slug: "torque-extension",
  intro: "When you attach an extension like a crow's foot adapter to a torque wrench, you change the effective lever arm length. The wrench dial reading no longer matches the torque actually delivered to the fastener — and the correction depends on how the extension is oriented.",
  sections: [
    {
      heading: "The correction formula",
      body: `
        <p><strong>Set Torque = Desired Torque × (L ÷ (L + E))</strong></p>
        <p>Where <strong>L</strong> is the wrench handle length (pivot to grip center) and <strong>E</strong> is the extension offset distance.</p>
        <p>If the extension positions the fastener further from the wrench pivot, actual torque is <em>higher</em> than the dial reads. If the extension shortens the effective arm, you under-torque.</p>
      `,
    },
    {
      heading: "When you need to correct — and when you don't",
      body: `
        <p>The correction only applies when the extension is at 90° to the torque wrench handle, creating a true lever arm change. If you mount a crow's foot straight in line with the wrench (0°), or use a standard socket extension that keeps the fastener on the same axis as the wrench drive, no correction is needed — the lever arm length hasn't changed.</p>
      `,
    },
    {
      heading: "When this matters most",
      body: `
        <p>Crow's foot adapters are commonly needed for exhaust manifold bolts, oil pan bolts on installed engines, and intake manifold fasteners where a socket can't reach.</p>
        <p><strong>On critical engine fasteners — head bolts, main caps, rod bolts — always use the proper socket.</strong> Never a crow's foot. A 10% torque error on a head bolt spec of 65 ft-lbs is 6.5 ft-lbs — enough to cause uneven clamp load and a head gasket leak.</p>
        <p>For less critical fasteners where a crow's foot is acceptable, apply the correction and verify with a second pass.</p>
      `,
    },
  ],
  related: [
    { slug: "torque-units-converter", title: "Torque Units Converter" },
    { slug: "bolt-spec-lookup", title: "Head Bolt & Main Bolt Specs" },
  ],
};
