export default {
  slug: "diesel-smoke-lambda",
  intro: "Diesel lambda is different from gasoline. Diesel always runs lean (Lambda > 1.0) at part throttle and never reaches stoichiometric mixture under load because diesels don't throttle air — they meter fuel into all the available air. Black smoke happens when fuel is sprayed into too little air to burn completely.",
  sections: [
    {
      heading: "Diesel-specific stoichiometric AFR",
      body: `
        <p>Diesel stoich is approximately <strong>14.5:1</strong> by mass (very close to gasoline's 14.7). Lambda 1.0 = 14.5:1 AFR.</p>
        <p>But unlike gasoline, diesel engines almost never run at Lambda 1.0 under load. The smoke limit for diesel is typically Lambda 1.15–1.20 (16.7–17.4 AFR) — go richer and you start producing visible black smoke.</p>
      `,
    },
    {
      heading: "Why diesel smokes — and what's safe",
      body: `
        <p>Diesel black smoke is unburned carbon. It happens when:</p>
        <ul>
          <li>More fuel is injected than available oxygen can burn (over-fueling)</li>
          <li>Injection timing is too late (fuel doesn't have time to burn before the exhaust valve opens)</li>
          <li>Atomization is poor (big droplets don't mix well with air)</li>
        </ul>
        <p><strong>EPA-compliant Lambda range:</strong> 1.30+ (no visible smoke under most conditions)</p>
        <p><strong>Mild-tune street range:</strong> 1.20–1.30 (light haze under load)</p>
        <p><strong>Performance street:</strong> 1.10–1.20 (visible smoke during shifts/heavy load — illegal on road in most states)</p>
        <p><strong>Sled pull / race:</strong> 0.90–1.10 (heavy black smoke — competition only)</p>
      `,
    },
    {
      heading: "Boost-to-fuel balance",
      body: `
        <p>Diesel power is air-limited. Adding fuel without adding boost just makes more smoke. The relationship to remember: every additional pound of fuel needs about 14.5 pounds of air. So a 100 HP boost-fueling upgrade needs both:</p>
        <ul>
          <li>An injection upgrade (nozzles, pump capacity)</li>
          <li>A turbo upgrade or higher boost target on the existing turbo</li>
        </ul>
        <p>Skipping either side leaves power on the table and increases smoke and EGT.</p>
      `,
    },
    {
      heading: "EGT and smoke correlate",
      body: `
        <p>Black smoke and high EGT usually go together — both are symptoms of incomplete combustion. If you see climbing smoke output AND climbing EGT, the engine is over-fueled for the air available. Back off the tune, increase boost, or both.</p>
      `,
    },
  ],
  related: [
    { slug: "diesel-egt-drive-pressure", title: "Diesel EGT & Drive Pressure" },
    { slug: "afr-lambda", title: "AFR / Lambda Converter (gasoline)" },
    { slug: "diesel-injector-nozzle-pop-pressure", title: "Diesel Nozzle & Pop Pressure" },
  ],
};
