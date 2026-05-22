export default {
  slug: "diesel-compound-turbo",
  intro: "Compound turbo setups use two turbos in series: a small high-pressure turbo that spools quickly for low-RPM response, feeding into a large low-pressure turbo (the atmospheric stage) that provides the airflow needed for big horsepower. Done right, you get the low-end torque of a small turbo and the top-end power of a much larger one.",
  sections: [
    {
      heading: "How the pressure ratio splits",
      body: `
        <p>In a compound setup, total boost is the product of each stage's pressure ratio (not the sum). For 60 psi total boost (PR ≈ 5.1):</p>
        <p><strong>HP turbo at PR 2.0 × Atm turbo at PR 2.55 = Total PR 5.1 (60 psi)</strong></p>
        <p>The HP turbo handles most of the heat work; the atmospheric turbo does most of the volume work. Match each to its job — don't oversize the HP turbo or it never spools.</p>
      `,
    },
    {
      heading: "Common compound combinations",
      body: `
        <ul>
          <li><strong>S300/S400:</strong> Classic Cummins compound. Small S300 (62–64mm) feeds large S400 (75–80mm). Good for 700–1000 HP street/strip.</li>
          <li><strong>S400/T6:</strong> Race-only compound. Huge atmospheric turbo for 1200+ HP.</li>
          <li><strong>HX35/HX55:</strong> 12V Cummins favorite. Stock HX35 feeds a 55mm. Tight-package, ~500–650 HP.</li>
        </ul>
      `,
    },
    {
      heading: "Drive pressure stacks too",
      body: `
        <p>Just like boost, drive pressure compounds. The HP turbo sees the highest drive pressure of any setup — sometimes 2× boost. That stresses the small turbo's shaft and bearings.</p>
        <p>This is why race compound builds use ceramic ball bearings and oil-only cooling. Cheap small turbos won't survive sustained compound use.</p>
      `,
    },
    {
      heading: "Lift pump and fueling must keep up",
      body: `
        <p>A compound turbo build that breathes 1000+ HP worth of air needs the fuel to match. CP3 alone caps around 700 HP; beyond that you need dual CP3, larger pistons, or a Stage 2 CP3 modification. Also size the lift pump for 0.5–0.6 gph per HP at the rail.</p>
      `,
    },
  ],
  related: [
    { slug: "diesel-single-turbo", title: "Diesel Single Turbo Finder" },
    { slug: "diesel-lift-pump", title: "Diesel Lift Pump & Fuel System" },
    { slug: "diesel-egt-drive-pressure", title: "Diesel EGT & Drive Pressure" },
  ],
};
