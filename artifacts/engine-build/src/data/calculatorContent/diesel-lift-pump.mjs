export default {
  slug: "diesel-lift-pump",
  intro: "A lift pump keeps the injection pump fed with positive fuel pressure (10–15 psi for most platforms). Cummins VP44 trucks need one to prevent pump failure. CP4 Powerstrokes and Duramaxes need one to prevent catastrophic pump explosion. Bosch CP3 Cummins trucks benefit from one for fueling headroom and water/air separation.",
  sections: [
    {
      heading: "Sizing by HP — the basic math",
      body: `
        <p>Rule of thumb: <strong>0.5 GPH per HP at the rail.</strong> A 600 HP target needs 300 GPH of fuel at the rail under load.</p>
        <ul>
          <li><strong>Stock / mild tune (~400 HP):</strong> 95–100 GPH pump is plenty (FASS 100, AirDog 100)</li>
          <li><strong>Mid-range (500–700 HP):</strong> 150 GPH (FASS 150, AirDog 165)</li>
          <li><strong>Big single / mild compound (700–900 HP):</strong> 165–220 GPH</li>
          <li><strong>Race compound (1000+ HP):</strong> 260 GPH or twin pumps</li>
        </ul>
        <p>Always oversize. A pump running at 80% capacity outlasts one running at 100%.</p>
      `,
    },
    {
      heading: "VP44 Cummins — the lift pump IS the engine's lifeline",
      body: `
        <p>1998.5–2002 Dodge Cummins VP44 trucks are famous for VP44 injection pump failures. The root cause is almost always the OEM in-tank lift pump failing or going weak. The VP44 is electronically controlled and lubricated by fuel — when supply pressure drops, the pump runs dry and the internal computer overheats.</p>
        <p>If you have a VP44 truck and the OEM lift pump hasn't been replaced with a FASS or AirDog, do it now. It's cheaper than a $1500 VP44.</p>
      `,
    },
    {
      heading: "CP4 Powerstroke / LML Duramax — different problem",
      body: `
        <p>2011+ Powerstroke and 2011–2016 LML Duramax use the Bosch CP4.2 injection pump. CP4s fail catastrophically — when they self-destruct, metal debris goes through the entire fuel system, requiring all injectors, lines, rails, and fuel tank to be replaced. A $10,000+ repair.</p>
        <p>A high-volume lift pump with proper filtration significantly reduces CP4 failure rate. Many builders also install a CP3 conversion kit to ditch the CP4 entirely.</p>
      `,
    },
    {
      heading: "Filtration matters as much as flow",
      body: `
        <p>FASS and AirDog don't just push fuel — they separate water, remove air bubbles, and filter to 2–3 micron. That filtration extends injector and pump life. Don't skimp on filter changes (every 15,000–30,000 miles depending on fuel quality).</p>
      `,
    },
  ],
  related: [
    { slug: "diesel-injector-nozzle-pop-pressure", title: "Diesel Nozzle & Pop Pressure" },
    { slug: "diesel-single-turbo", title: "Diesel Single Turbo Finder" },
    { slug: "diesel-egt-drive-pressure", title: "Diesel EGT & Drive Pressure" },
  ],
};
