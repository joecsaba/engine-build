export default {
  slug: "fuel-injector-sizing",
  intro: "Injector sizing is one of the few engine-build numbers where being slightly oversized is correct. Static flow ratings on the box and actual flow into a running engine are not the same number — dead time, voltage, and duty cycle all chip away at usable capacity.",
  sections: [
    {
      heading: "The sizing formula",
      body: `
        <p><strong>Injector Size (lb/hr) = (HP × BSFC) ÷ (Cylinders × Max Duty Cycle)</strong></p>
        <ul>
          <li><strong>BSFC</strong> (brake-specific fuel consumption): 0.45–0.50 for NA gas, 0.55–0.60 for boosted</li>
          <li><strong>Max duty cycle:</strong> 80% for street, 85% max for dedicated race</li>
        </ul>
        <p>Exceeding 85% duty cycle leaves no headroom for enrichment during transients or hot weather. That's where engines go lean and break.</p>
      `,
    },
    {
      heading: "Static rating ≠ actual delivery",
      body: `
        <p>Published injector flow ratings are <strong>static</strong> — measured at fixed fuel pressure with the injector held wide open. In a running engine, injectors pulse open/closed rapidly, and actual delivery is affected by:</p>
        <ul>
          <li><strong>Dead time:</strong> lag between the electrical signal and mechanical opening. Lower voltage = more dead time = less effective flow.</li>
          <li><strong>Battery voltage:</strong> at 12V vs 14V, the same injector behaves differently. Always datalog voltage during tuning.</li>
          <li><strong>Fuel pressure:</strong> roughly +3–4% flow per PSI above the rated pressure. A 42 lb/hr injector at 60 PSI (rated for 43.5 PSI) flows closer to 50 lb/hr.</li>
        </ul>
      `,
    },
    {
      heading: "E85 and alternative fuel sizing",
      body: `
        <p>E85 has a stoichiometric AFR of ~9.8:1 vs gasoline's 14.7:1 — it requires roughly <strong>30% more fuel by volume</strong> to hit the same Lambda. If your engine needs 42 lb/hr injectors on gas, you need ~55 lb/hr on E85.</p>
        <p>Many builders size for E85 from the start — running gasoline just means lower duty cycles, which is perfectly fine. Undersized injectors on E85 max out at 100% duty cycle and go lean under load. That destroys pistons and bearings in seconds.</p>
      `,
    },
  ],
  related: [
    { slug: "afr-lambda", title: "AFR / Lambda Converter" },
    { slug: "carb-cfm-sizing", title: "Carburetor CFM Sizing" },
    { slug: "turbo-finder", title: "Turbo Finder & Sizing" },
  ],
};
