export default {
  slug: "diesel-injector-nozzle-pop-pressure",
  intro: "Diesel injector nozzles atomize fuel and control spray pattern. Pop pressure is the rail pressure at which the nozzle opens and fuel sprays. Get nozzle size wrong and you either run out of fuel (lean) or overfuel and smoke (rich). Get pop pressure wrong and atomization suffers — bigger droplets that burn poorly and dump unburned fuel into the exhaust.",
  sections: [
    {
      heading: "Nozzle sizing — flow rate to HP",
      body: `
        <p>Stock Cummins 5.9 (P-pump) injectors flow about 100 cc per 1000 strokes. Aftermarket nozzles are sold as percentage increases over stock — 50%, 75%, 100%, 150%, etc.</p>
        <ul>
          <li><strong>Stock 5.9L 12V (P7100):</strong> 100cc stock → good for ~250 HP</li>
          <li><strong>+50% nozzles:</strong> ~350–400 HP street</li>
          <li><strong>+75% nozzles:</strong> ~450–550 HP</li>
          <li><strong>+100% nozzles:</strong> ~550–650 HP</li>
          <li><strong>+150% nozzles:</strong> ~650–800 HP — smoke control becomes a challenge on street</li>
          <li><strong>+200% and beyond:</strong> Race-only territory</li>
        </ul>
      `,
    },
    {
      heading: "Pop pressure — what it controls",
      body: `
        <p>Pop pressure determines when the nozzle opens during the injection event. Higher pop pressure means the rail must reach higher pressure before atomization occurs — that creates a finer mist (smaller droplets) but delays injection slightly.</p>
        <ul>
          <li><strong>Stock pop pressure (~250 bar / 3600 psi):</strong> Good general-purpose atomization</li>
          <li><strong>Higher pop (300+ bar):</strong> Finer atomization, cleaner combustion, more complete burn. Better for high-HP race builds.</li>
          <li><strong>Lower pop (200 bar):</strong> Easier on injection pump but coarser spray, smokier.</li>
        </ul>
        <p>Pop pressure is set by shims inside the injector. Most aftermarket performance injectors come pre-shimmed for the appropriate pop pressure for their nozzle size.</p>
      `,
    },
    {
      heading: "Pump capacity must support nozzle flow",
      body: `
        <p>A 100% over nozzle that the pump can't supply makes no more power than a 75% over. P-pump trucks need to verify the pump can flow what the nozzles can spray. Stock P7100 pumps support up to ~150% nozzles before flow falls off; bigger nozzles need pump work (larger plungers/barrels, governor spring adjustment).</p>
      `,
    },
    {
      heading: "Match nozzle size to air supply",
      body: `
        <p>Nozzles fuel the engine; turbo and intake air the engine. Mismatched and you over-fuel (smoke) or under-fuel (lean and slow). Generally:</p>
        <ul>
          <li><strong>Stock turbo:</strong> Don't exceed +75% nozzles</li>
          <li><strong>62mm single:</strong> +100 to +150% nozzles</li>
          <li><strong>S300/S400 compound:</strong> +150 to +200% nozzles</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "diesel-smoke-lambda", title: "Diesel Smoke / Lambda Calculator" },
    { slug: "diesel-lift-pump", title: "Diesel Lift Pump & Fuel System" },
    { slug: "fuel-injector-sizing", title: "Fuel Injector Sizing (gasoline)" },
  ],
};
