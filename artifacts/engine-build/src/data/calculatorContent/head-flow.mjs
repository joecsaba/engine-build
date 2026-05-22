export default {
  slug: "head-flow",
  intro: "An internal combustion engine is fundamentally an air pump. More air ingested, mixed, and expelled = more power. Of all the engine's components, the cylinder heads are the single biggest restriction. Flow bench testing measures that restriction in CFM at a standardized pressure drop — typically 28 inches of water column in the US.",
  sections: [
    {
      heading: "How flow bench numbers translate to horsepower",
      body: `
        <p>The SuperFlow formula <strong>HP = CFM × 0.257 × Cylinders</strong> is a well-validated empirical relationship that converts a bench number to an HP estimate. It works because the relationship between airflow capacity and power output is remarkably linear for naturally aspirated engines up to about 700 HP.</p>
      `,
    },
    {
      heading: "Why peak CFM is misleading",
      body: `
        <p>When people compare heads, they almost always compare peak flow — CFM at max lift. But the engine doesn't spend most of its time at max lift. The valve opens, reaches peak, closes. The <em>flow across the entire lift curve</em> determines real-world power.</p>
        <p><strong>Example:</strong> Head A flows 280 CFM at 0.600" but only 180 CFM at 0.300". Head B flows 260 CFM at 0.600" but 220 CFM at 0.300". Head B will almost certainly make more mid-range torque and may even make more peak HP, because the <em>average</em> flow across the lift curve is higher.</p>
        <p>The valve spends most of its travel time below peak lift. Flow at 0.200"–0.400" lift is where the engine lives most of the time.</p>
      `,
    },
    {
      heading: "Port velocity — the size trade-off",
      body: `
        <p>Bigger ports flow more air — but only at high RPM and high valve lift. At low RPM and low lift, air velocity through an oversized port drops too low to maintain a strong pressure signal. That kills throttle response, idle quality, and low-RPM torque.</p>
        <p>This is why a 180cc runner SBC head often makes more power on a 350 than a 230cc runner head at street RPMs. The smaller runner maintains higher air velocity, keeping fuel atomized and intake charge moving efficiently. The bigger runner only pays off above 5,500–6,000 RPM where the engine can actually use the airflow.</p>
        <p><strong>Ideal port velocity at peak flow:</strong></p>
        <ul>
          <li><strong>Street (good idle + mid-range torque):</strong> 180–220 ft/sec</li>
          <li><strong>Street/strip:</strong> 220–260 ft/sec</li>
          <li><strong>Dedicated race:</strong> 250–320 ft/sec</li>
        </ul>
      `,
    },
    {
      heading: "Test pressure matters — don't compare numbers across pressures",
      body: `
        <p>Flow bench numbers at different test pressures are NOT directly comparable. A head tested at 28" H₂O shows higher CFM than the same head tested at 10" H₂O — not because the head flows more, but because higher pressure pushes more air through the same restriction.</p>
        <p>The correction follows the square root of the pressure ratio (Bernoulli's equation):</p>
        <p><strong>Corrected CFM = Measured CFM × √(28 ÷ Test Pressure)</strong></p>
        <p>A head flowing 150 CFM at 10" H₂O corrects to about 251 CFM at 28" — a 67% increase. Always check the test pressure on your flow sheet before comparing numbers.</p>
      `,
    },
    {
      heading: "The heads are only as good as the cam",
      body: `
        <p>A head that flows 300 CFM at 0.600" lift is wasted if your cam only opens 0.480". The head's peak potential is never reached because the valve never opens far enough.</p>
        <p>Look at your head's flow curve: where does the flow plateau? If it's still climbing at 0.500" and your cam only opens 0.480", you're leaving flow (and power) on the table. If the flow plateaus at 0.450" and your cam opens 0.550", you're carrying the cost and weight of a bigger cam profile without gaining any additional airflow.</p>
      `,
    },
  ],
  related: [
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "carb-cfm-sizing", title: "Carburetor CFM Sizing" },
    { slug: "hp-estimator", title: "HP & Torque Estimator" },
  ],
};
