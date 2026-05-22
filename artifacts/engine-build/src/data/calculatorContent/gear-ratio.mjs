export default {
  slug: "gear-ratio",
  intro: "Engine RPM at any given speed comes down to one relationship: gear ratio × axle ratio × tire diameter. Get the ratio wrong and your engine is either loafing on the highway out of its powerband, or screaming at redline so loud the radio doesn't help. Tire diameter is the silent third variable that everyone forgets.",
  sections: [
    {
      heading: "The formula",
      body: `
        <p><strong>RPM = (Speed × Gear Ratio × Axle Ratio × 336.13) ÷ Tire Diameter</strong></p>
        <p>The transmission gear ratio × the axle (ring and pinion) ratio gives the overall drive ratio. Tire diameter acts as the final reduction — taller tires effectively lower the ratio, shorter tires raise it.</p>
      `,
    },
    {
      heading: "The classic street/strip dilemma: 3.73 vs 4.10",
      body: `
        <p>With 3.73s and a 28" tire in a 1:1 top gear, 70 MPH puts the engine at about <strong>2,650 RPM</strong> — comfortable highway cruising, good fuel economy, lower engine wear.</p>
        <p>Switch to 4.10s and that same 70 MPH is now <strong>2,910 RPM</strong> — noticeably busier on the highway but significantly quicker off the line and through the gears, because the engine stays closer to its torque peak during acceleration.</p>
      `,
    },
    {
      heading: "Tire size changes your effective ratio",
      body: `
        <p>Tire diameter changes your effective gear ratio without touching the ring and pinion. Going from a 26" tire to a 28" tire with 3.73 gears drops highway RPM by about <strong>7%</strong> — equivalent to swapping from 3.73s to roughly 3.46s.</p>
        <p>This is why drag racers run small-diameter slicks (shorter tire = higher effective ratio for launch) and why tall off-road tires make trucks feel sluggish (lower effective ratio, engine below its torque peak).</p>
        <p>Always recalculate your cruise RPM when changing tire sizes, and consider a gear swap if you've moved more than 2" in tire diameter from stock.</p>
      `,
    },
  ],
  related: [
    { slug: "torque-converter-stall", title: "Torque Converter Stall Speed" },
    { slug: "hp-estimator", title: "HP & Torque Estimator" },
    { slug: "density-altitude", title: "Density Altitude / HP Correction" },
  ],
};
