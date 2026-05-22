export default {
  slug: "intake-manifold-milling",
  intro: "On a 90° V-engine, each cylinder bank sits at 45° from vertical and the intake manifold sits in the valley between them. When you mill the head decks, the heads drop closer to the crank — and the intake manifold mounting surface on each head shifts inward toward the engine centerline. If you don't correct for that shift, the intake won't seal, won't bolt down, and the ports won't line up.",
  sections: [
    {
      heading: "The geometry — and the formula",
      body: `
        <p>How much the intake face shifts depends on the <strong>head angle</strong> — the angle between the deck surface and the intake face. If the intake face is perfectly perpendicular to the deck (0°), the shift is 1:1. If the face is angled (like SBC's 10°), the shift is amplified.</p>
        <p><strong>Factor = 0.707 ÷ sin(45° − head_angle)</strong></p>
        <p>Where 0.707 = sin(45°), the base geometry of a 90° V-engine. Multiply the total deck removal by this factor to get the required intake face correction.</p>
      `,
    },
    {
      heading: "The three surfaces involved",
      body: `
        <ul>
          <li><strong>Surface A — Head deck (gasket surface):</strong> Your input — the amount you milled off.</li>
          <li><strong>Surface B — Intake face of the head</strong> (or both sides of the intake manifold): Corrected using the head angle factor.</li>
          <li><strong>Surface C — Bottom of the intake manifold</strong> where it sits on the block valley rails: On some engines this needs correction too; on others (Pontiac, Chrysler B/RB) the manifold doesn't contact the block here.</li>
        </ul>
      `,
    },
    {
      heading: "Where to make the correction",
      body: `
        <p>Two choices: mill the intake face of the <strong>heads</strong>, or mill the rails of the <strong>intake manifold</strong>.</p>
        <p>Most experienced builders prefer milling the <strong>heads</strong> because it keeps the intake manifold at stock dimensions — so it can be used on other engines later. If you mill the manifold, it's married to that specific combination.</p>
      `,
    },
    {
      heading: "When correction is actually needed",
      body: `
        <ul>
          <li><strong>Under ~0.005" port shift:</strong> No correction needed. Intake gasket absorbs it and bolt holes line up fine.</li>
          <li><strong>0.005"–0.010" shift:</strong> Gray area. Dry-fit the intake without gaskets and check bolt hole alignment. A thicker intake gasket (.060"–.120") may absorb this.</li>
          <li><strong>0.010"–0.020" shift:</strong> Correction needed. Bolt holes won't line up, ports will be misaligned, sealing will fail.</li>
          <li><strong>Over 0.020" shift:</strong> Significant machining required. The manifold may "high center" on the block before seating on the heads.</li>
        </ul>
        <p>Rule of thumb: a light cleanup cut (0.005"–0.008" off the heads) almost certainly doesn't need intake correction. Above 0.010"–0.015" off the deck, start checking. Heavy cuts of 0.030"+ almost always require correction.</p>
      `,
    },
  ],
  related: [
    { slug: "head-milling", title: "Head Milling Calculator" },
    { slug: "quench-deck-height", title: "Quench & Deck Height Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
  ],
};
