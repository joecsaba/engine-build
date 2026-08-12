// Long-form body for /guides/ring-gap. See bearing-clearance.mjs for the
// markup contract shared by every guide content file.

export default {
  slug: "ring-gap",
  intro:
    "Piston ring end gap is the clearance between the two ends of a ring installed in the bore. Rings grow as they heat. Get the gap wrong in the tight direction and the ends butt, the ring buckles, and it takes the ring land, piston and bore with it. This is a measurement you set by hand, one ring at a time, and it cannot be undone once you file too far.",
  note: {
    tone: "warn",
    title: "Critical",
    body: "Setting ring gap is one of the few engine assembly steps where you cannot undo a mistake. File too little — you can remove more. File too much — the ring is ruined. Take your time and sneak up on the spec.",
  },
  sections: [
    {
      heading: "Why ring gap matters",
      body: `
        <p>As the engine heats to operating temperature, the piston rings expand. If the ring ends butt together (zero gap), the ring buckles outward and destroys the ring land &mdash; often taking the piston and cylinder wall with it. Too much gap allows combustion gases to blow by, reducing power and contaminating the oil. The gap must fall within a specific range for your bore size and application.</p>
        <table>
          <thead>
            <tr><th>Application</th><th>Top ring gap</th><th>Example, 4.030" bore</th></tr>
          </thead>
          <tbody>
            <tr><td>Naturally aspirated street</td><td>0.004" per inch of bore</td><td>0.016"</td></tr>
            <tr><td>Forced induction (turbo/supercharged)</td><td>0.006" per inch of bore</td><td>0.024"</td></tr>
            <tr><td>Nitrous</td><td>0.006"&ndash;0.007" per inch of bore</td><td>0.024"&ndash;0.028"</td></tr>
          </tbody>
        </table>
        <p>Second rings are typically gapped 0.002"&ndash;0.004" wider than the top ring. Always file-fit to the actual measured diameter of <em>each</em> cylinder, not the nominal bore size.</p>
      `,
    },
    {
      heading: "Tools required",
      body: `
        <ul>
          <li>Ring filing tool (hand file or dedicated ring filer &mdash; ring filer preferred for consistency)</li>
          <li>Feeler gauges (0.001"&ndash;0.050" set)</li>
          <li>Piston (used as a deck tool to square the ring in the bore)</li>
          <li>Sharpie marker (to mark ring orientation)</li>
          <li>Clean rags</li>
          <li>Calipers (optional, for confirmation)</li>
        </ul>
      `,
    },
    {
      heading: "Step 1: Identify each ring",
      body: `
        <p>Most ring sets include: top compression ring (usually marked "1" or "TOP"), second compression ring (marked "2"), and oil control assembly (3 pieces: two thin rails and an expander). The top ring is typically thinner and may have a different face coating. The second ring often has a slight bevel on the inner face &mdash; this must face upward.</p>
      `,
    },
    {
      heading: "Step 2: Square the ring in the bore",
      body: `
        <p>Drop the ring into the cylinder bore. Use the piston (upside down) to push the ring down approximately 1" below the deck surface. This ensures the ring is square to the bore &mdash; critical for an accurate gap measurement. Do NOT just drop the ring in by hand; it will tilt and give a false reading.</p>
        <svg viewBox="0 0 300 160" role="img" aria-label="Diagram: a piston used upside down to push a ring one inch down the bore so it sits square.">
          <rect x="50" y="10" width="200" height="140" rx="4" fill="#f3f4f6" stroke="#9ca3af" />
          <rect x="65" y="10" width="170" height="130" rx="2" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="4,2" />
          <rect x="65" y="50" width="170" height="6" rx="2" fill="#374151" />
          <rect x="125" y="50" width="15" height="6" fill="#f3f4f6" />
          <text x="150" y="44" text-anchor="middle" fill="#E85D04" font-size="11" font-weight="bold">Ring (squared)</text>
          <line x1="133" y1="53" x2="133" y2="56" stroke="#E85D04" stroke-width="2" />
          <line x1="140" y1="53" x2="140" y2="56" stroke="#E85D04" stroke-width="2" />
          <text x="150" y="85" text-anchor="middle" fill="#6b7280" font-size="11">1" from top of bore</text>
          <rect x="100" y="10" width="100" height="20" rx="2" fill="#9ca3af" />
          <text x="150" y="23" text-anchor="middle" fill="white" font-size="10" font-weight="bold">Piston (upside down)</text>
        </svg>
      `,
    },
    {
      heading: "Step 3: Measure the gap",
      body: `
        <p>Insert feeler gauges into the ring gap. The correct size is the largest gauge that passes through the gap with light, even drag &mdash; not tight, not loose. Record this measurement. Compare it to your target gap (use the Ring Gap Calculator for your bore and application).</p>
        <p>Rotate the ring 90&deg; in the bore and re-measure. A meaningful change between positions means the bore is out of round, which is a machining problem, not a ring problem.</p>
      `,
    },
    {
      heading: "Step 4: File the ring to spec",
      body: `
        <p>If the gap is too tight (almost all fresh rings will be), you must file the ends. Mount the ring file (or use a fine-cut file) and file with smooth, even strokes perpendicular to the ring face. Never file at an angle &mdash; this creates a bevel that causes the ring to catch on the ring land.</p>
        <ul>
          <li>File 2&ndash;3 strokes, then re-measure. Removing 0.001" at a time gives you control.</li>
          <li>Always file from the OUTSIDE of the ring inward (toward the inside diameter). This prevents chipping the face coating.</li>
          <li>After filing, deburr the sharp edge with a fine stone or 400-grit paper &mdash; one light pass each side.</li>
          <li>Blow out all filing debris with compressed air and wipe the ring with a clean rag before re-measuring.</li>
        </ul>
        <aside data-tone="danger">
          <p><strong>Warning:</strong> moly-faced (grey) rings and nitrided rings CANNOT be filed with a standard file. Use only a proper ring grinding setup. Filing a moly ring with a hand file destroys the face coating and the ring is worthless. When in doubt, check with your ring manufacturer.</p>
        </aside>
      `,
    },
    {
      heading: "Step 5: Stagger the ring gaps",
      body: `
        <p>With all rings filed and checked, the gaps must be positioned around the piston to minimize blowby. No two ring gaps should be lined up.</p>
        <svg viewBox="0 0 200 210" role="img" aria-label="Diagram: typical ring gap stagger positions around a piston — top ring at 12 o'clock, second ring at the right, oil rails at the bottom and left.">
          <circle cx="100" cy="100" r="85" fill="#f9fafb" stroke="#e5e7eb" stroke-width="2" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#e5e7eb" stroke-width="2" />
          <circle cx="100" cy="100" r="35" fill="none" stroke="#e5e7eb" stroke-width="2" />
          <text x="100" y="104" text-anchor="middle" fill="#6b7280" font-size="10">Piston</text>
          <rect x="95" y="13" width="10" height="5" fill="#22c55e" rx="1" />
          <text x="100" y="10" text-anchor="middle" fill="#22c55e" font-size="9">TOP (12 o'clock)</text>
          <rect x="155" y="95" width="10" height="5" fill="#3b82f6" rx="1" />
          <text x="178" y="100" text-anchor="middle" fill="#3b82f6" font-size="9">2nd</text>
          <rect x="95" y="182" width="10" height="5" fill="#f97316" rx="1" />
          <text x="100" y="198" text-anchor="middle" fill="#f97316" font-size="9">Oil Rail 1</text>
          <rect x="35" y="95" width="10" height="5" fill="#a855f7" rx="1" />
          <text x="15" y="100" text-anchor="middle" fill="#a855f7" font-size="9">Oil Rail 2</text>
        </svg>
        <p>A good rule: position the top ring gap at 12 o'clock (toward the thrust side), second ring at 4&ndash;5 o'clock, and oil rails at 8 o'clock and 2 o'clock. Keep all gaps away from the pin bore (3 and 9 o'clock positions).</p>
      `,
    },
    {
      heading: "Step 6: Oil ring assembly",
      body: `
        <p>The three-piece oil ring assembly requires special care:</p>
        <ol>
          <li>Install the expander first, in the oil ring groove. Do NOT overlap the expander ends &mdash; they must butt together, not overlap.</li>
          <li>Install the lower oil rail. Coil it into the groove working around the piston. The gap goes at your chosen stagger position.</li>
          <li>Install the upper oil rail similarly, with its gap positioned 120&deg;&ndash;180&deg; away from the lower rail gap.</li>
          <li>Verify neither oil rail bridges the expander gap (check by rotating each rail &mdash; it should slide freely).</li>
        </ol>
        <aside data-tone="tip">
          <p><strong>Pro tip: use ring pliers.</strong> Always use ring installation pliers when installing rings on the piston &mdash; never by hand. Ring pliers expand the ring evenly, preventing the ring from being distorted or the ends from digging into the ring land. One distorted ring can cause a compression or oil consumption issue.</p>
        </aside>
      `,
    },
    {
      heading: "Track every ring to its cylinder",
      body: `
        <p>Gaps are filed to a specific bore. Once a ring is fitted, it belongs to that cylinder and no other. Lay the rings out in a marked tray or tape them to a labelled card as you go &mdash; mixing up a set after filing means measuring all of them again, and a ring that ends up in a smaller bore than it was cut for is the exact failure this whole procedure exists to prevent.</p>
      `,
    },
  ],
  related: [
    { slug: "ring-gap", title: "Piston Ring Gap Calculator" },
    { slug: "bearing-clearance", title: "Bearing Clearance Calculator" },
    { slug: "displacement", title: "Engine Displacement Calculator" },
  ],
};
