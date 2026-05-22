export default {
  slug: "pushrod-length",
  intro: "Correct pushrod length puts the rocker arm tip on the valve stem in the right place — centered at mid-lift. Wrong length and the rocker tip sweeps too far to one side, causing uneven valve tip wear, accelerated valve guide wear, increased friction, and eventually oil consumption from worn guides.",
  sections: [
    {
      heading: "Anything that changes cam-to-valve geometry requires rechecking",
      body: `
        <ul>
          <li><strong>Head milling</strong> (moves the rocker closer to the cam)</li>
          <li><strong>Block decking</strong> (same effect)</li>
          <li><strong>Different gasket thickness</strong></li>
          <li><strong>Cam with different base circle diameter</strong></li>
          <li><strong>Different rocker arm ratio</strong> (1.5:1 → 1.6:1)</li>
          <li><strong>Switching from stamped to roller-tip rockers</strong></li>
        </ul>
        <p>Each shifts the geometric relationship, and the pushrod length must compensate.</p>
      `,
    },
    {
      heading: "LS engines: pushrod IS your only adjustment",
      body: `
        <p>LS engines use <strong>non-adjustable net-lash rocker arms</strong> with a fixed pivot. Unlike traditional small blocks with adjustable poly-lock nuts, there's no way to set preload or lash at the rocker.</p>
        <p><strong>The pushrod length is the sole means of controlling hydraulic lifter preload</strong> — target 0.030"–0.060" of preload (lifter plunger travel from the snap ring).</p>
        <p>If you install different heads, a different cam, or machine the block on an LS, you MUST determine the correct pushrod length using a <strong>checking pushrod</strong> before ordering your final set. Don't guess.</p>
      `,
    },
    {
      heading: "How to check geometry",
      body: `
        <ul>
          <li><strong>Bluing method:</strong> Coat the valve tip with machinist's blue dye. Run the engine through a few cycles. The rocker tip wear pattern should be a thin line down the center of the valve tip — about 1/3 the tip width, centered.</li>
          <li><strong>Sweep pattern wider than 1/3:</strong> Pushrod likely too long. Tip sweeps from one edge to the other.</li>
          <li><strong>Sweep pattern off-center:</strong> Pushrod likely too short. Tip rides on one side.</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "head-milling", title: "Head Milling Calculator" },
    { slug: "valve-spring", title: "Valve Spring Calculator" },
    { slug: "valvetrain-builder", title: "Valvetrain RPM Builder" },
  ],
};
