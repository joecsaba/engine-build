export default {
  slug: "pressure-converter",
  intro: "Boost gauges read PSI in the US, bar everywhere else, kPa on factory dashboards, inHg for vacuum, atm in some engineering specs. They're all the same physics — just different units.",
  sections: [
    {
      heading: "Conversions to remember",
      body: `
        <ul>
          <li><strong>1 atm = 14.696 PSI = 1.013 bar = 101.3 kPa = 29.92 inHg</strong> (standard atmosphere at sea level)</li>
          <li><strong>1 bar = 14.504 PSI</strong> (close enough to 14.5 for shop math)</li>
          <li><strong>1 PSI = 6.895 kPa</strong></li>
          <li><strong>1 inHg ≈ 0.491 PSI</strong> (vacuum gauges)</li>
        </ul>
      `,
    },
    {
      heading: "Engine pressure references",
      body: `
        <ul>
          <li><strong>Vacuum (idle, healthy engine):</strong> 18–22 inHg · ~9 PSI vacuum</li>
          <li><strong>Oil pressure (warm idle):</strong> 20–40 PSI · 1.4–2.8 bar</li>
          <li><strong>Oil pressure (under load):</strong> 50–80 PSI · 3.4–5.5 bar</li>
          <li><strong>Fuel rail (port injection):</strong> 43.5 PSI · 3 bar</li>
          <li><strong>Fuel rail (direct injection):</strong> 2,000–3,000 PSI · 138–207 bar</li>
          <li><strong>Boost (mild street):</strong> 8–15 PSI · 0.55–1.0 bar</li>
          <li><strong>Diesel rail (modern common rail):</strong> 28,000+ PSI · 1900+ bar</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "boost-compression", title: "Boost / Effective CR Calculator" },
    { slug: "turbo-finder", title: "Turbo Finder & Sizing" },
    { slug: "diesel-egt-drive-pressure", title: "Diesel EGT & Drive Pressure" },
  ],
};
