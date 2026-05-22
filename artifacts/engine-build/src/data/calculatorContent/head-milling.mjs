export default {
  slug: "head-milling",
  intro: "Cylinder head milling — removing material from the deck surface — is one of the most common machine shop operations. On a pushrod engine the consequences are mostly compression and intake alignment. But on overhead-cam engines, milling has a hidden side effect that catches a lot of builders: it retards cam timing.",
  sections: [
    {
      heading: "Why milling retards OHC cam timing",
      body: `
        <p>On any engine where the camshaft lives in the cylinder head, removing material from the head deck lowers the cam closer to the crankshaft. The timing chain or belt stays the same length. With less distance between the crank and cam centers, slack develops on the drive side of the chain — effectively rotating the cam sprocket backward relative to the crank. Every cam event (intake open, intake close, exhaust open, exhaust close) shifts later in the cycle.</p>
      `,
    },
    {
      heading: "The formula",
      body: `
        <p><strong>Retard (°) = Milling Depth × 360 ÷ (π × Sprocket Pitch Diameter)</strong></p>
        <p>A smaller sprocket means more retard per unit milled. A Honda D16 with its ~100mm cam gear sees about 1° of retard per 0.012" (0.30mm) milled. A 2JZ with its larger ~110mm sprocket sees slightly less. At 0.010" (0.25mm), most engines see 0.5–1.0° of retard — noticeable on a dyno but usually acceptable. Beyond 0.020" (0.50mm), correction is recommended.</p>
      `,
    },
    {
      heading: "The flat/boxer problem",
      body: `
        <p>On a flat (boxer) engine like a Subaru EJ25, EZ30, or Porsche flat-6, the problem is compounded. Both cylinder heads are on opposite sides of the block, each driven by separate chain runs from the crankshaft. The chain routing geometry means the two banks are <em>not</em> affected equally — one bank typically sees roughly 3× the retard of the other.</p>
        <p>On a Subaru, the driver-side cams can see 0.7° of retard while the passenger side sees only 0.24° from the same 0.010" cut. This asymmetric retard creates a bank-to-bank timing split that cannot be corrected with a single adjustment.</p>
      `,
    },
    {
      heading: "Other side effects to recalculate",
      body: `
        <ul>
          <li><strong>Compression ratio:</strong> Milling removes chamber volume, raising CR. A 4" bore engine loses ~1 cc per 0.006" milled. For NA, usually desirable. For turbo, can push ECR dangerously high — recalculate.</li>
          <li><strong>Valve-to-piston clearance:</strong> 1:1 relationship. Mill 0.020" off the head and you lose 0.020" of P2V. Minimum intake P2V is 0.080" (2.0mm); exhaust 0.100" (2.5mm). Clay-check after milling more than 0.010".</li>
          <li><strong>Intake manifold alignment:</strong> On V-engines (V6/V8), milling closes the angle between heads. Intake port and bolt-hole alignment shifts — recalculate intake milling.</li>
        </ul>
      `,
    },
    {
      heading: "When to correct cam timing",
      body: `
        <ul>
          <li><strong>Under 0.5°</strong> (roughly 0.005–0.008" milled): no correction needed.</li>
          <li><strong>0.5–2.0°:</strong> adjustable cam gears or offset dowels recommended, especially for performance builds where timing is dialed in.</li>
          <li><strong>Over 2.0°:</strong> correction is mandatory. Cheapest fix is often a thicker head gasket that restores the original deck height — fixes both timing retard and compression increase at once.</li>
          <li><strong>Boxer engines:</strong> adjustable cam gears are the only way to handle the asymmetric retard. You must degree each cam independently.</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "intake-manifold-milling", title: "Intake Manifold Milling Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "piston-to-valve", title: "Piston-to-Valve Clearance Calculator" },
  ],
};
