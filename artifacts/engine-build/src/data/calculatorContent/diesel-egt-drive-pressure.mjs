export default {
  slug: "diesel-egt-drive-pressure",
  intro: "EGT is the single most important gauge on a diesel truck. It tells you how close combustion is to exceeding the material limits of your pistons, valves, and turbo. Without a pyrometer you have no way to know if your tune, load, or altitude is pushing the engine toward failure — until something breaks.",
  sections: [
    {
      heading: "What EGT actually measures",
      body: `
        <p>Exhaust gas temperature is the direct result of combustion. When fuel burns inside the cylinder, the energy that isn't converted to mechanical work leaves as heat — and that's what your pyrometer reads. More fuel without enough air to burn it = hotter, less efficient combustion. That's why over-fueling (the same thing that causes black smoke) drives EGTs up.</p>
        <ul>
          <li><strong>Aluminum pistons:</strong> Lose structural integrity around 1200–1300°F</li>
          <li><strong>Exhaust valves:</strong> Start to glow at sustained temps above 1200°F</li>
          <li><strong>Turbo shaft seals:</strong> Fail from the combination of heat and pressure differential</li>
        </ul>
      `,
    },
    {
      heading: "Pre-turbo vs post-turbo — the location mistake",
      body: `
        <p>Pyrometer location matters enormously. Pre-turbo (in the manifold, before the turbine) reads the actual combustion temperature. Post-turbo (downpipe) reads a temperature that's already dropped 200–300°F across the turbo.</p>
        <p><strong>Safe limits are different for each:</strong></p>
        <ul>
          <li><strong>Pre-turbo sustained:</strong> &lt; 1250°F · &lt; 677°C</li>
          <li><strong>Pre-turbo peak (brief):</strong> &lt; 1400°F · &lt; 760°C</li>
          <li><strong>Post-turbo sustained:</strong> &lt; 1000°F · &lt; 538°C</li>
        </ul>
        <p>If you don't know which side your sensor is on, assume post-turbo and add 200°F mentally — or move it pre-turbo for accurate readings.</p>
      `,
    },
    {
      heading: "Drive pressure and the 1:1 rule",
      body: `
        <p>Drive pressure is exhaust manifold pressure pushing on the turbine wheel. The ideal ratio is roughly <strong>1:1 boost-to-drive</strong> (10 psi boost = 10 psi drive). When drive pressure significantly exceeds boost, the turbo is choking — exhaust can't escape fast enough, EGTs climb, and you lose efficiency.</p>
        <p>If you see 30 psi boost but 60 psi drive pressure, the turbo is too small or the exhaust housing A/R is too restrictive. A bigger turbine wheel or larger A/R fixes it.</p>
      `,
    },
    {
      heading: "Driving habits that save your engine",
      body: `
        <ul>
          <li><strong>Watch EGTs on long grades:</strong> Sustained high load + reduced airflow at altitude = climbing EGTs. Drop a gear or back off.</li>
          <li><strong>Cool down before shutdown:</strong> Idle 2–3 minutes after a hard pull. Hot turbo + sudden oil stop = coked bearings.</li>
          <li><strong>Trans temp matters too:</strong> EGT spikes often come with trans temp spikes. Aux trans coolers and EGT-aware tunes prevent both.</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "diesel-single-turbo", title: "Diesel Single Turbo Finder" },
    { slug: "diesel-smoke-lambda", title: "Diesel Smoke / Lambda Calculator" },
    { slug: "temperature-converter", title: "Temperature Converter" },
  ],
};
