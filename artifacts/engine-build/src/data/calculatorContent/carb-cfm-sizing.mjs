export default {
  slug: "carb-cfm-sizing",
  intro: "Carb sizing is one of the most-misunderstood numbers in engine building. The formula gives you peak CFM demand at WOT, but a carb that big drives like trash on the street. Real engines run better with a slightly undersized carb because signal strength matters more than peak flow.",
  sections: [
    {
      heading: "How the formula works",
      body: `
        <p><strong>CFM = (CID × RPM × VE) ÷ 3456</strong></p>
        <p>The 3456 constant comes from two factors: a four-stroke engine completes one intake stroke every two crank revolutions (÷ 2), and there are 1,728 cubic inches in one cubic foot (÷ 1728). 2 × 1728 = 3456. The formula gives theoretical airflow demand in CFM at a given RPM.</p>
      `,
    },
    {
      heading: "Volumetric efficiency — the multiplier that changes everything",
      body: `
        <p><strong>VE</strong> is a correction factor for how completely the cylinders actually fill with air. Typical ranges:</p>
        <ul>
          <li><strong>75–80%:</strong> Stock engine, mild cam, cast-iron heads, factory intake</li>
          <li><strong>80–85%:</strong> Bolt-ons — headers, performance intake, mild cam</li>
          <li><strong>85–90%:</strong> Aftermarket aluminum heads, matched cam, good intake</li>
          <li><strong>90–100%:</strong> Full race — ported heads, big cam, optimized runners</li>
          <li><strong>Over 100%:</strong> Possible with tuned-runner resonance (acoustic wave tuning) but requires very specific header and runner lengths matched to a narrow RPM band</li>
        </ul>
      `,
    },
    {
      heading: "What actually drives VE",
      body: `
        <p><strong>Camshaft:</strong> Duration and LSA are the biggest VE factors. A longer-duration cam holds the intake valve open longer (more air at high RPM) but hurts low-RPM filling because the piston starts pushing air back out (reversion). LSA controls overlap — tighter LSA improves scavenging at high RPM but hurts idle quality.</p>
        <p><strong>Cylinder heads:</strong> Port flow capacity sets the ceiling on VE. If your heads flow 180 CFM per port but your engine demands 220 CFM per cylinder, the heads are the bottleneck and no cam or intake fixes that.</p>
        <p><strong>Intake manifold:</strong> A dual-plane splits the plenum, giving each side strong signal strength and good torque 1500–5500 RPM. A single-plane uses one open plenum — weaker low-RPM signal but better top-end flow. Single-planes typically add 2–5% VE at peak RPM.</p>
        <p><strong>Exhaust:</strong> Long-tube headers with properly-sized primaries can add 3–6% VE through scavenging. Primary diameter should match displacement and RPM range — too large and you lose low-RPM scavenging velocity.</p>
      `,
    },
    {
      heading: "Why bigger isn't better — the signal strength problem",
      body: `
        <p>A carburetor works by creating a pressure drop (vacuum signal) through its venturi bores. This signal pulls fuel from the boosters and mixes it with incoming air.</p>
        <p><strong>An oversized carb has larger venturi bores</strong>, so air moves slower at part throttle. Slower air = weaker signal = less fuel pulled from the boosters. Result: flat spot off idle, lazy throttle response, hesitation during tip-in, generally poor drivability.</p>
        <p>Holley's own guidance: street engines run best at <strong>90–95% of calculated CFM</strong>. A slightly "undersized" carb maintains signal strength and feels much more responsive.</p>
      `,
    },
    {
      heading: "Dual-quad and tunnel ram sizing",
      body: `
        <p>For dual-quad or tunnel ram setups, each carburetor handles half the total airflow. Calculate total CFM normally, divide by two for each carb. Dual-quad can improve mid-range because the primary carb provides strong signal at part throttle while the secondary opens under load.</p>
      `,
    },
    {
      heading: "Street vs race sizing strategy",
      body: `
        <p><strong>Street engines:</strong> Size for peak <em>torque</em> RPM, not peak power RPM — that's where you spend most of your driving time. A mild 350 making peak torque at 3,500 RPM only needs ~400 CFM at that speed. A 600 CFM carb handles this perfectly with headroom for higher pulls.</p>
        <p><strong>Race engines:</strong> Size for peak HP RPM plus a 200 RPM margin.</p>
        <p>When torn between two sizes on a street engine, <strong>always go smaller</strong>. Better signal, crisper throttle response, and cleaner part-throttle mixtures outweigh the theoretical peak-power advantage of a larger carb that can never be fully utilized on the street.</p>
      `,
    },
    {
      heading: "Common engine + carb combinations",
      body: `
        <p>Real-world carb sizes that work well for common builds:</p>
        <table>
          <thead><tr><th>Engine</th><th>CID</th><th>Typical Cam</th><th>Carb</th></tr></thead>
          <tbody>
            <tr><td>Stock 305 Chevy</td><td>305</td><td>~190° @ .050"</td><td>500–600 CFM</td></tr>
            <tr><td>Mild 350 Chevy</td><td>350</td><td>~210° @ .050"</td><td>600–650 CFM</td></tr>
            <tr><td>383 Stroker (street)</td><td>383</td><td>~218° @ .050"</td><td>650–750 CFM</td></tr>
            <tr><td>383 Stroker (race)</td><td>383</td><td>~236° @ .050"</td><td>750–850 CFM</td></tr>
            <tr><td>454 BBC (street)</td><td>454</td><td>~218° @ .050"</td><td>750–800 CFM</td></tr>
            <tr><td>454 BBC (race)</td><td>454</td><td>~242° @ .050"</td><td>850–950 CFM</td></tr>
            <tr><td>Ford 302 (street)</td><td>302</td><td>~204° @ .050"</td><td>500–600 CFM</td></tr>
            <tr><td>Ford 351W (hot street)</td><td>351</td><td>~224° @ .050"</td><td>650–750 CFM</td></tr>
          </tbody>
        </table>
        <p>A bone-stock 350 with a 2-barrel intake does fine with a 500 CFM 2-barrel. A 350 with heads, cam, and intake wants 600–650. Always match the carb to your actual build level — not just displacement.</p>
      `,
    },
  ],
  related: [
    { slug: "fuel-injector-sizing", title: "Fuel Injector Sizing Calculator" },
    { slug: "hp-estimator", title: "HP & Torque Estimator" },
    { slug: "head-flow", title: "Cylinder Head Flow / CFM to HP" },
  ],
};
