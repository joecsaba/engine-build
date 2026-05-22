export default {
  slug: "density-altitude",
  intro: "Naturally aspirated engines lose roughly 3% of their power per 1,000 ft of elevation because air density drops. But altitude alone doesn't tell the whole story — temperature and humidity also affect density. Density altitude bundles all three into one number that tells you what your engine actually \"sees.\"",
  sections: [
    {
      heading: "The correction standards",
      body: `
        <ul>
          <li><strong>SAE J1349 (most common):</strong> 77°F · 29.234 inHg · 0% humidity. The "standard" dyno correction.</li>
          <li><strong>SAE J607:</strong> 60°F · 29.92 inHg · dry. Older SAE standard, gives higher numbers than J1349.</li>
          <li><strong>STP / DIN 70020:</strong> 0°C / 32°F · 29.92 inHg · dry. European standard, gives the highest "corrected" numbers.</li>
        </ul>
        <p>When comparing dyno numbers between cars, always check which correction factor was used. The same engine can read 380 HP on J1349 or 410 HP on DIN 70020 — same engine, different math.</p>
      `,
    },
    {
      heading: "Real-world impact",
      body: `
        <ul>
          <li><strong>Sea level, 60°F, dry:</strong> Baseline. 100% relative power.</li>
          <li><strong>Denver (5,280 ft), 85°F, 30% humidity:</strong> ~83% relative power. A 400 HP engine makes ~332 HP at the same throttle.</li>
          <li><strong>Phoenix (1,100 ft), 110°F, 20% humidity:</strong> ~92% relative power. Hot dry air kills less than thin air.</li>
          <li><strong>Trackside on a cool fall morning (sea level, 45°F, dry):</strong> ~103% relative power. Why fall and winter records get set.</li>
        </ul>
        <p>Forced induction engines are mostly immune to altitude (the turbo compensates), but intercooler efficiency drops at altitude due to higher inlet temps — they still lose 5–8% in Denver vs sea level.</p>
      `,
    },
  ],
  related: [
    { slug: "hp-estimator", title: "HP & Torque Estimator" },
    { slug: "boost-compression", title: "Boost / Effective CR" },
    { slug: "temperature-converter", title: "Temperature Converter" },
  ],
};
