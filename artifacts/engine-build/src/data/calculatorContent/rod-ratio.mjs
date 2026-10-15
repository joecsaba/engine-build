import { bookUrl } from "../attribution.mjs";

export default {
  slug: "rod-ratio",
  intro: "The connecting rod ratio (L/S) is the rod's center-to-center length divided by the crankshaft stroke. It affects three critical aspects of engine operation: piston dwell time at top dead center, piston side loading against the cylinder wall, and the rate of piston acceleration through the stroke.",
  sections: [
    {
      heading: "What rod ratio actually changes",
      body: `
        <p>A higher ratio means the rod operates at a smaller angle to the cylinder bore, reducing side thrust that pushes the piston against the wall and causes friction and wear. Higher ratio also gives the piston more dwell time at TDC, which can help combustion efficiency.</p>
        <p>The trade-off is packaging. A higher ratio at a given stroke means a longer rod, which means a shorter piston compression height to fit the same deck. That can run you out of room for adequate piston pin support or oil ring rail clearance.</p>
      `,
    },
    {
      heading: "Factory rod ratios for common engines",
      body: `
        <ul>
          <li><strong>SBC 350:</strong> 1.638 (5.700" rod ÷ 3.480" stroke)</li>
          <li><strong>LS1:</strong> 1.684 (6.098" ÷ 3.622")</li>
          <li><strong>Ford 302:</strong> 1.697 (5.090" ÷ 3.000")</li>
          <li><strong>Ford Coyote 5.0:</strong> 1.659 (6.052" ÷ 3.649")</li>
          <li><strong>Cummins 5.9:</strong> 1.692 (7.953" ÷ 4.724")</li>
        </ul>
        <p>Most performance engine builders target a ratio between 1.6 and 1.8, with the sweet spot around 1.65–1.75 for street engines.</p>
      `,
    },
    {
      heading: "The 383 stroker problem",
      body: `
        <p>When you stroke a 350 SBC to 383 ci using a 3.750" stroke crank but keep the stock 5.700" rods, the ratio drops to <strong>1.520</strong> — well below the ideal range. That increases side loading and piston wear and is one reason cheap 383 builds wear out faster than expected.</p>
        <p>The fix is upgrading to 6.000" rods, which brings the ratio back up to 1.600. Longer rods require a shorter compression height piston to fit in the same block deck. Plan for adequate pin support, ring rail clearance, and a compression height your piston manufacturer actually produces — don't assume the part exists.</p>
      `,
    },
  ],

  // Aimed at the People-Also-Ask questions Google shows for "rod ratio
  // calculator". The answers deliberately send the reader to the argument on
  // both sides — Reher-Morrison's "it barely matters" testing and the
  // long-rod case — rather than settling it for them.
  faq: [
    {
      q: "What is a good rod ratio?",
      a: `<p>Most production V8s fall between 1.55 and 1.80. Below about 1.55, rod angularity raises piston side-load and skirt wear; above roughly 1.80–1.85, piston motion near TDC slows enough that cam timing and intake sizing may need adjusting. Inside that band, the engine builders who have tested it most carefully say the number matters far less than people think — David Reher of Reher-Morrison has written that rod length "would rank about fiftieth" on his list of important specs. Others, Smokey Yunick and David Vizard among them, argue the effects on piston dwell and acceleration are real and worth designing for. Read both before you spend money chasing a ratio: <a href="https://rehermorrison.com/tech-talk-10-by-the-book/" target="_blank" rel="noopener">Reher-Morrison, Tech Talk #10</a> · <a href="https://www.enginebuildermag.com/2017/03/understanding-rod-ratios-2/" target="_blank" rel="noopener">Engine Builder Magazine, Understanding Rod Ratios</a>.</p>`,
    },
    {
      q: "Do longer rods make more power?",
      a: `<p>On the dyno, almost nothing you could measure. Reher-Morrison's back-to-back tests on a NASCAR 358, at piston speeds well past what a street engine sees, found no difference in average power or curve shape between the shortest and longest rods that fit. The argument for long rods is about what they change around the number — less side-load, lower peak piston acceleration, slightly longer dwell at TDC — which affects durability and what cam the engine wants more than it affects peak horsepower. Both positions are made by people with dynos: <a href="https://rehermorrison.com/tech-talk-10-by-the-book/" target="_blank" rel="noopener">Reher-Morrison, Tech Talk #10</a> · <a href="https://www.enginebuildermag.com/2017/03/understanding-rod-ratios-2/" target="_blank" rel="noopener">Engine Builder Magazine, Understanding Rod Ratios</a> · <a href="${bookUrl("horsepower")}" target="_blank" rel="noopener nofollow">David Vizard's <em>How to Build Horsepower</em></a>.</p>`,
    },
    {
      q: "What rod ratio for high RPM?",
      a: `<p>Longer. A higher ratio reduces piston acceleration around TDC and side-load on the cylinder wall, which is where high-RPM engines fail first — this is the one place the long-rod argument is least disputed. The practical ceiling is the piston: Darin Morgan of Reher-Morrison's advice is to take the stroke you have, put the wrist pin as high in the piston as the oil ring allows, and let whatever connects the two be your rod length, rather than picking a ratio and forcing the parts to fit it. <a href="https://www.speed-talk.com/forum/viewtopic.php?t=406" target="_blank" rel="noopener">that discussion on Speed-Talk</a> · <a href="https://rehermorrison.com/tech-talk-10-by-the-book/" target="_blank" rel="noopener">Reher-Morrison, Tech Talk #10</a>.</p>`,
    },
  ],
  related: [
    { slug: "piston-speed", title: "Piston Speed Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "quench-deck-height", title: "Quench & Deck Height Calculator" },
  ],
};
