export default {
  slug: "turbo-finder",
  intro: "Sizing a turbo for an engine is about matching airflow capacity and efficiency to the RPM range you actually use — not the headline horsepower number on the compressor map. A turbo that makes 700 HP at 7,500 RPM but is laggy below 5,000 is the wrong turbo for a street car that lives at 3,500–5,500.",
  sections: [
    {
      heading: "Calculating the airflow",
      body: `
        <p><strong>CFM = (CID × RPM × VE × PR) ÷ 3456</strong></p>
        <p>Where PR is the pressure ratio (absolute boost pressure ÷ atmospheric pressure). A 350ci engine at 6,000 RPM with 90% VE and 15 PSI boost (PR = 2.02) needs approximately <strong>1,100 CFM</strong>. The turbo's compressor map must show an efficiency island that covers your operating range at this flow rate and pressure ratio.</p>
      `,
    },
    {
      heading: "Reading the compressor map — surge vs choke",
      body: `
        <p>Compressor efficiency is critical. Operating in the <strong>surge zone</strong> (left side of the map, too little flow for the pressure ratio) causes the compressor to stall and reverse flow — violent oscillations that destroy the turbo shaft and bearings.</p>
        <p>Operating in the <strong>choke zone</strong> (right side, too much flow) means the compressor wheel can't accelerate the air any further, so adding RPM produces no additional boost. Ideal operating point: the center of the highest-efficiency island on the compressor map.</p>
      `,
    },
    {
      heading: "A/R ratio and the most common sizing mistake",
      body: `
        <p>The turbine housing <strong>A/R (area-over-radius)</strong> ratio controls spool characteristics. A smaller A/R (e.g. 0.63) increases exhaust gas velocity at the turbine wheel, spooling the turbo faster but restricting top-end flow. A larger A/R (e.g. 1.00) allows more exhaust flow at high RPM but spools slower.</p>
        <p>The most common turbo sizing mistake is choosing for maximum HP potential instead of the RPM range the engine will actually use. A street car spends 90% of its time below 5,000 RPM — size for the range you use, not the peak number on paper.</p>
      `,
    },
  ],
  related: [
    { slug: "boost-compression", title: "Boost / Effective CR Calculator" },
    { slug: "fuel-injector-sizing", title: "Fuel Injector Sizing Calculator" },
    { slug: "diesel-single-turbo", title: "Diesel Single Turbo Finder" },
  ],
};
