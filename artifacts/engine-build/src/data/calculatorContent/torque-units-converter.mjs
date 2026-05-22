export default {
  slug: "torque-units-converter",
  intro: "US shops work in ft-lb; metric shops work in Nm; small fasteners spec in in-lb; some European specs use kgf·m. Get the unit wrong and you either over-torque (snap the bolt) or under-torque (leak / fail).",
  sections: [
    {
      heading: "The conversions",
      body: `
        <ul>
          <li><strong>1 ft-lb = 1.3558 Nm</strong> (or simpler: × 1.36 for shop math)</li>
          <li><strong>1 Nm = 0.7376 ft-lb</strong> (or simpler: × 0.74)</li>
          <li><strong>1 ft-lb = 12 in-lb</strong> (exact)</li>
          <li><strong>1 kgf·m = 9.807 Nm = 7.233 ft-lb</strong></li>
        </ul>
      `,
    },
    {
      heading: "Common engine torque ranges",
      body: `
        <ul>
          <li><strong>Spark plug:</strong> 15–25 ft-lb · 20–34 Nm</li>
          <li><strong>Valve cover:</strong> 7–10 ft-lb · 9–14 Nm (often spec'd in in-lb: 84–120 in-lb)</li>
          <li><strong>Intake manifold:</strong> 12–25 ft-lb · 16–34 Nm</li>
          <li><strong>Rod cap:</strong> 35–65 ft-lb · 47–88 Nm (then angle-torqued)</li>
          <li><strong>Head bolt (TTY):</strong> 22 ft-lb + 90° + 90° (typical LS-style sequence)</li>
          <li><strong>Main cap:</strong> 65–110 ft-lb · 88–149 Nm</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "torque-extension", title: "Torque Wrench Extension Calculator" },
    { slug: "bolt-spec-lookup", title: "Head Bolt & Main Bolt Specs" },
  ],
};
