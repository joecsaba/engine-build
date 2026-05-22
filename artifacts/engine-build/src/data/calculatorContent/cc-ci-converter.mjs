export default {
  slug: "cc-ci-converter",
  intro: "Chamber volume is in CCs, piston dome/dish CCs are in CCs, but engine displacement is in cubic inches (in the US) or liters. You'll convert these constantly when calculating compression ratio.",
  sections: [
    {
      heading: "The conversion",
      body: `
        <ul>
          <li><strong>1 cubic inch = 16.387 cc</strong> (exact)</li>
          <li><strong>1 cc = 0.0610 cubic inch</strong></li>
          <li><strong>1 liter = 1,000 cc = 61.024 cubic inches</strong></li>
        </ul>
        <p>So a 350 cubic inch engine is 350 × 16.387 = 5,735 cc = 5.7 L. (Which is why "5.7L" is the standard nickname for the SBC 350.)</p>
      `,
    },
    {
      heading: "Where you'll use it",
      body: `
        <ul>
          <li><strong>Chamber volume:</strong> spec'd in CCs (e.g. "64cc Vortec heads"). Stays in CCs for CR math.</li>
          <li><strong>Piston dish/dome:</strong> spec'd in CCs. Negative number = dome (adds compression), positive = dish (loses compression).</li>
          <li><strong>Cylinder volume:</strong> calculated from bore × stroke; convert to CCs to combine with chamber + piston for CR.</li>
          <li><strong>Total displacement:</strong> usually published in cubic inches or liters. Convert as needed.</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "displacement", title: "Engine Displacement Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "quench-deck-height", title: "Quench & Deck Height" },
  ],
};
