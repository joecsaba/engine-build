export default {
  slug: "compression-ratio",
  intro: "Compression ratio is the relationship between the total cylinder volume at bottom dead center and the remaining clearance volume at top dead center. Static compression ratio is calculated from fixed dimensions, but it's dynamic compression ratio that actually determines whether your engine will detonate on a given fuel.",
  sections: [
    {
      heading: "Static vs dynamic — why both matter",
      body: `
        <p>Static compression ratio comes from fixed dimensions — bore, stroke, head chamber volume, gasket thickness, piston dome or dish volume, and deck clearance. It's the headline number, but it doesn't tell you whether the engine will knock.</p>
        <p>Dynamic compression ratio accounts for how late the intake valve closes and how much charge escapes back out before the cylinder is truly sealed. That's the number that determines detonation risk on a given fuel. A cam with late intake valve closing (high IVC) dramatically lowers effective compression, allowing a higher static ratio without knock — this is how performance engines run 11:1 static CR on pump gas.</p>
        <p><strong>Ideal dynamic CR for pump gas:</strong> 7.5–8.5:1</p>
      `,
    },
    {
      heading: "What moves the number the most",
      body: `
        <p>A stock small block Chevy 350 with 64cc chamber heads and flat-top pistons runs approximately 10.8:1 static compression — too high for 87-octane pump gas without a cam that closes the intake valve late enough to bleed off effective pressure. Swap to 76cc Vortec heads and the same engine drops to roughly 8.5:1 static, safe on regular fuel with almost any cam.</p>
        <p>Chamber volume has the single largest effect on compression ratio, followed by piston dish/dome volume and gasket thickness. A difference of just 0.010" in compressed gasket thickness can shift CR by 0.1 to 0.2 points — measure your gasket bore and crush thickness with calipers, don't trust the spec sheet alone.</p>
      `,
    },
    {
      heading: "Pump gas compression limits",
      body: `
        <ul>
          <li><strong>87 octane (regular):</strong> Keep static CR below 9.5:1</li>
          <li><strong>91 octane (premium):</strong> 10.5:1 is generally safe with a street cam</li>
          <li><strong>93 octane + performance cam (IVC past 60° ABDC):</strong> Many builders safely run 11:1+ static because dynamic CR stays in the 7.5–8.5:1 range</li>
          <li><strong>E85:</strong> Effective octane around 105 — can support 13:1+ static with the right tune</li>
        </ul>
        <p>Always calculate dynamic CR before finalizing your head gasket and piston combination.</p>
      `,
    },
  ],
  related: [
    { slug: "dynamic-compression-ratio-v2", title: "Dynamic Compression Ratio Calculator" },
    { slug: "quench-deck-height", title: "Quench & Deck Height Calculator" },
    { slug: "boost-compression", title: "Boost / Effective CR Calculator" },
  ],
};
