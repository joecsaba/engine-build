export default {
  slug: "afr-lambda",
  intro: "Lambda is universal across fuels; AFR is not. A wideband sensor measures exhaust oxygen and reports Lambda — but most consumer gauges multiply that by gasoline's stoichiometric AFR (14.7) before displaying. That's fine on gas, misleading on E85 or anything else.",
  sections: [
    {
      heading: "What Lambda actually means",
      body: `
        <p><strong>Lambda = actual AFR ÷ stoichiometric AFR for the fuel.</strong> Lambda 1.000 always means stoichiometric, regardless of fuel type. That's what makes it universal.</p>
        <p>The wideband controller takes the measured Lambda and multiplies by 14.7 (gasoline stoich) to display the familiar "AFR" number on gas-scale gauges. That display is correct on gasoline and wrong on every other fuel.</p>
      `,
    },
    {
      heading: "Why gas-scale AFR misleads on E85",
      body: `
        <p>E85 has a stoichiometric AFR of approximately <strong>9.8:1</strong>, not 14.7. When your wideband reads "12.5:1" on E85, it's not telling you the actual air-fuel ratio — it's showing Lambda 0.85 multiplied by 14.7. The actual AFR is approximately <strong>8.3:1</strong>.</p>
        <p>This is why professional tuners work in Lambda rather than AFR: target Lambda stays the same regardless of fuel, while AFR changes with every fuel blend.</p>
      `,
    },
    {
      heading: "Practical tuning targets (in Lambda)",
      body: `
        <ul>
          <li><strong>Power (WOT):</strong> Lambda 0.85–0.88 (AFR 12.5–12.9 on gas)</li>
          <li><strong>Cruise:</strong> Lambda 1.00–1.05 (AFR 14.7–15.4 on gas)</li>
          <li><strong>Idle:</strong> Lambda 0.95–1.00 (AFR 14.0–14.7 on gas)</li>
        </ul>
        <p>When switching from gasoline to E85, target the <strong>same Lambda values</strong>, not the same AFR numbers. E85 at Lambda 0.85 still reads ~12.5 on a gas-scale display, but the actual mixture is ~8.3:1 by mass — roughly 30% more fuel flow. That's why injector and fuel pump upgrades are mandatory for E85 conversions.</p>
      `,
    },
  ],
  related: [
    { slug: "fuel-injector-sizing", title: "Fuel Injector Sizing Calculator" },
    { slug: "octane-mix", title: "Octane Mix Calculator" },
    { slug: "diesel-smoke-lambda", title: "Diesel Smoke / Lambda Calculator" },
  ],
};
