export default {
  slug: "hp-estimator",
  intro: "Horsepower estimates from calculators are approximations based on airflow, displacement, and VE assumptions. Real-world output depends heavily on tuning, fuel calibration, ignition timing, and exhaust design. Use estimates for planning — the only way to know actual output is a chassis or engine dyno.",
  sections: [
    {
      heading: "Tuning quality is the wild card",
      body: `
        <p>A well-tuned engine can make <strong>10–15% more power</strong> than a poorly calibrated one with identical parts. The same combination on a worn-out tune vs a fresh dyno tune can swing 50+ HP at the wheels. Don't over-index on the estimate number — it assumes a competent tune.</p>
      `,
    },
    {
      heading: "Altitude correction",
      body: `
        <p>Naturally aspirated engines lose approximately <strong>3% per 1,000 feet</strong> of elevation as air density decreases. An engine making 400 HP at sea level produces roughly <strong>340 HP in Denver</strong> (5,280 ft).</p>
        <p>Forced induction engines are less affected because the turbo or supercharger compensates for thinner air. Intercooler efficiency does suffer at altitude (higher intake temps), so boost compensation doesn't fully restore the loss — usually 5–8% off vs sea level.</p>
      `,
    },
    {
      heading: "Drivetrain losses and historical ratings",
      body: `
        <p>Chassis dyno numbers are always lower than engine dyno numbers due to drivetrain losses:</p>
        <ul>
          <li><strong>Manual transmission:</strong> ~15% loss</li>
          <li><strong>Automatic:</strong> 18–22% loss depending on converter + transmission</li>
        </ul>
        <p>When comparing published ratings, remember <strong>pre-1972 "gross" HP</strong> was measured on a bare engine — no accessories, no exhaust, no emissions. Modern "net" ratings include all of that and are 15–25% lower for equivalent engines. A 1970 Chevelle rated at 450 gross HP likely made 360–380 net HP. Still impressive, but not directly comparable to a modern crate engine rating.</p>
      `,
    },
  ],
  related: [
    { slug: "hp-torque", title: "HP & Torque Converter" },
    { slug: "density-altitude", title: "Density Altitude / HP Correction" },
    { slug: "turbo-finder", title: "Turbo Finder & Sizing" },
  ],
};
