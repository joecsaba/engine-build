// Long-form SEO content rendered below the temperature converter and also
// piped into the prerendered HTML for Google. Structured (not raw HTML) so
// React and the prerender script can each render it consistently.

export default {
  slug: "temperature-converter",
  // 1-2 sentence lead, shown right under the H1 on the prerendered SEO block
  // and at the top of the in-page article.
  intro: "Engine builders need temperature conversion constantly — coolant runs in °F on most dyno sheets but ECTs spec in °C on import platforms, oil temp on a stock gauge is one scale while the data logger is the other, and EGT pyrometers split by region.",

  // Article sections that appear in a Card below the calculator. Order matters.
  // `body` accepts HTML so we can include lists, em/strong, tables. We control
  // the source so dangerouslySetInnerHTML is safe.
  sections: [
    {
      heading: "Conversion formulas",
      body: `
        <ul>
          <li><strong>°F → °C:</strong> (°F − 32) × 5/9</li>
          <li><strong>°C → °F:</strong> (°C × 9/5) + 32</li>
          <li><strong>°C → K:</strong> °C + 273.15</li>
          <li><strong>K → °C:</strong> K − 273.15</li>
        </ul>
        <p>The 5/9 ratio (not 1.8 exactly) is what catches people — at high EGT numbers a rounding error compounds fast. 1400 °F is 760 °C, but 760 × 1.8 + 32 = 1400 (works) while 1500 / 1.8 - 32 = 801 (off by 1). Always do the conversion in one direction, don't try to verify by inverting.</p>
      `,
    },
    {
      heading: "Common reference points for engine builders",
      body: `
        <ul>
          <li><strong>Coolant — normal range:</strong> 195–220 °F · 90–104 °C</li>
          <li><strong>Coolant — danger zone:</strong> 240 °F+ · 116 °C+</li>
          <li><strong>Oil — normal:</strong> 220–250 °F · 104–121 °C</li>
          <li><strong>Oil — viscosity breakdown risk:</strong> 290 °F+ · 143 °C+</li>
          <li><strong>EGT — diesel safe sustained:</strong> &lt; 1250 °F · &lt; 677 °C</li>
          <li><strong>EGT — diesel danger:</strong> 1400 °F+ · 760 °C+ (drive pressure rises non-linearly past this)</li>
          <li><strong>EGT — gas N/A safe:</strong> &lt; 1550 °F · &lt; 843 °C</li>
          <li><strong>EGT — gas turbo safe:</strong> &lt; 1650 °F · &lt; 899 °C</li>
        </ul>
      `,
    },
    {
      heading: "Why builders need this often",
      body: `
        <p>Dyno sheets, OEM service manuals, and aftermarket loggers don't agree on units. Mahle and Mahle Motorsport publish ring gap specs at 200 °C for the chrome moly ones, but a US shop might be staring at 392 °F on a part data sheet. A piston coating limit might be 525 °F (273 °C) — but the same supplier in Europe lists it as 270 °C.</p>
        <p>The Kelvin column is mostly useful for combustion math (charge air temperature ratios, polytropic compression) since absolute zero matters in those formulas — but for everyday shop work, the °F/°C swap is what gets used 50 times a day.</p>
      `,
    },
  ],

  // Internal-link nudges Google + users toward related tools.
  related: [
    { slug: "diesel-egt-drive-pressure", title: "Diesel EGT & Drive Pressure Calculator" },
    { slug: "density-altitude", title: "Density Altitude / HP Correction Calculator" },
    { slug: "mm-inch-converter", title: "MM to Inch Converter" },
  ],
};
