export default {
  slug: "diesel-valve-relief",
  intro: "When you upgrade the camshaft in a Cummins, you're moving the valves farther into the cylinder during the overlap period. With high-protrusion diesel pistons that already sit near the head, that extra valve movement can hit the piston. Valve reliefs (notches machined into the piston crown) prevent the contact — but you have to know when you need them.",
  sections: [
    {
      heading: "Why diesels are tight on P2V",
      body: `
        <p>Diesel pistons protrude above the deck at TDC (typically 0.020"–0.060") to maximize compression in the small combustion chamber. Gasoline engines have most of their compression in the cylinder head; diesels have it stacked in the piston bowl. That means the piston comes much closer to the valves than in a typical gasoline engine.</p>
        <p>Stock cams clear easily. Bigger cams reduce clearance fast.</p>
      `,
    },
    {
      heading: "When you need reliefs — the rule",
      body: `
        <p>Calculate the valve lift at TDC overlap (the lift at the moment the piston is closest to the valve). If that number plus the piston protrusion approaches the head gasket thickness, you need reliefs.</p>
        <ul>
          <li><strong>Stock cam (any Cummins):</strong> Almost never needs reliefs</li>
          <li><strong>"Stage 1" cam (~0.295" lift / 220° duration):</strong> Usually fine with stock pistons + gasket</li>
          <li><strong>"Stage 2" cam (~0.330" / 230°+):</strong> Marginal — clay-check before assembly</li>
          <li><strong>Race cam (0.400"+ lift, big duration):</strong> Reliefs required</li>
        </ul>
      `,
    },
    {
      heading: "Cummins-specific notes",
      body: `
        <ul>
          <li><strong>12V (1989–98 5.9L):</strong> Most tolerant — taller deck height. Many stage 1/2 cams clear stock pistons.</li>
          <li><strong>24V (1998.5–07 5.9L):</strong> Tighter than 12V. Stage 2+ cams typically need reliefs.</li>
          <li><strong>6.7L (2007+):</strong> Tightest of all. Many performance cams need reliefs even at the modest end.</li>
          <li><strong>4BT:</strong> Same family as 12V — generally accommodating.</li>
        </ul>
      `,
    },
    {
      heading: "Always clay-check before final assembly",
      body: `
        <p>Calculator output is a starting point. The only way to confirm clearance is to place modeling clay on the piston in the valve pocket area, install the head with checking springs (not full-rate), rotate the engine two full revolutions, then disassemble and measure.</p>
        <p>Minimum safe clearance: <strong>0.080" intake, 0.100" exhaust.</strong></p>
      `,
    },
  ],
  related: [
    { slug: "piston-to-valve", title: "Piston-to-Valve Clearance (gasoline)" },
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "ring-gap", title: "Piston Ring Gap Calculator" },
  ],
};
