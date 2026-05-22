export default {
  slug: "hp-torque",
  intro: "The relationship between horsepower and torque is defined by one formula: HP = Torque × RPM ÷ 5252. The constant 5252 comes from 33,000 ft-lbs/min (James Watt's definition of one horsepower) divided by 2π, which converts rotational speed to linear work. This is not an approximation — it's an exact mathematical relationship.",
  sections: [
    {
      heading: "Why HP and torque always cross at 5252 RPM",
      body: `
        <p>Because of the formula, horsepower and torque are always numerically equal at exactly 5252 RPM, regardless of the engine. Below 5252 RPM, torque is always the larger number. Above 5252 RPM, horsepower is always larger.</p>
        <p>This is why torque determines how hard the engine pulls at low and mid-range RPM, while horsepower — which accounts for how fast the engine can spin — determines peak potential. An engine that makes big torque at low RPM but falls off early will feel strong off the line but run out of steam on top. An engine that makes its peak power at high RPM but is soft below 4000 needs gearing and a converter to keep it in the powerband.</p>
      `,
    },
    {
      heading: "Real engine examples",
      body: `
        <p>The 1970 LT-1 350 was rated at 370 HP at 6000 RPM. Plugging into the formula: 370 × 5252 ÷ 6000 = 324 lb-ft at that RPM. Its peak torque of 380 lb-ft came at 4000 RPM, which equates to 289 HP at that RPM (380 × 4000 ÷ 5252).</p>
        <p>A modern LS3 makes 430 HP at 5900 RPM and 424 lb-ft at 4600 RPM — more power at lower stress levels thanks to better breathing and combustion efficiency. Understanding these relationships helps you choose the right cam, heads, and intake combination for your intended RPM range.</p>
      `,
    },
    {
      heading: "Unit conversions you'll actually use",
      body: `
        <ul>
          <li><strong>1 ft-lb</strong> = 1.3558 Nm = 12 in-lb</li>
          <li><strong>1 Nm</strong> = 0.7376 ft-lb</li>
          <li><strong>1 HP</strong> = 0.7457 kW (mechanical) — note: PS / metric HP is slightly different at 0.7355 kW</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "hp-estimator", title: "HP & Torque Estimator" },
    { slug: "density-altitude", title: "Density Altitude / HP Correction" },
    { slug: "torque-units-converter", title: "Torque Units Converter" },
  ],
};
