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
  related: [
    { slug: "piston-speed", title: "Piston Speed Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "quench-deck-height", title: "Quench & Deck Height Calculator" },
  ],
};
