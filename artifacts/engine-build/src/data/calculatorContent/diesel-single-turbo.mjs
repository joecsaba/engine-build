export default {
  slug: "diesel-single-turbo",
  intro: "Sizing a single turbo for a Cummins, Duramax, or Powerstroke comes down to matching airflow capacity to your target HP and keeping drive pressure at or below boost pressure. The most common mistake is going too big — a turbo sized for 800 HP feels laggy on the street and overworks the small one you replaced.",
  sections: [
    {
      heading: "Airflow rules of thumb by HP",
      body: `
        <ul>
          <li><strong>400–500 HP:</strong> 62–64mm compressor (S363, HE351 upgrade)</li>
          <li><strong>500–650 HP:</strong> 64–66mm (S364.5, S366)</li>
          <li><strong>650–800 HP:</strong> 68–72mm (S366 SX-E, S369)</li>
          <li><strong>800–1000 HP:</strong> 72–76mm (S371, S472)</li>
          <li><strong>1000+ HP:</strong> 75mm+ (S475, S480) — usually compound territory</li>
        </ul>
        <p>Numbers shift with platform and tune quality, but these are honest street-truck baselines.</p>
      `,
    },
    {
      heading: "Drive pressure should match (or beat) boost",
      body: `
        <p>Ideal boost-to-drive ratio is approximately <strong>1:1</strong>. If your boost gauge reads 40 psi and your drive pressure reads 70 psi, the turbo is choking. Exhaust can't escape fast enough — EGTs climb and you lose power.</p>
        <p>Fix: larger turbine wheel, larger turbine housing A/R, or both. A 1.10 A/R is common for 550+ HP single turbo Cummins builds.</p>
      `,
    },
    {
      heading: "Surge zone — read the compressor map",
      body: `
        <p>Every compressor has a <strong>surge line</strong> on its map. Operate left of that line and the compressor stalls — the wheel rapidly reverses direction repeatedly, creating violent oscillations that destroy the shaft and bearings.</p>
        <p>Symptoms: a fluttering or "stuttering" sound on lift-throttle. If you hear it, the turbo is too big OR the housing is too tight for your engine's airflow at that point. Lots of compounds get surge on the atmospheric turbo at part-throttle highway cruising.</p>
      `,
    },
    {
      heading: "Spool vs top-end is the trade-off",
      body: `
        <p><strong>Smaller exhaust housing A/R (0.91, 1.00):</strong> Faster spool, more low-end torque. Restricts top-end.</p>
        <p><strong>Larger A/R (1.10, 1.32):</strong> Slower spool, more top-end. Better for big-HP race builds.</p>
        <p>Street trucks with stock-ish weight should err on the smaller side. Dedicated tow rigs benefit from earlier spool too. Drag-only trucks running through the lights at 6000+ RPM want the bigger A/R.</p>
      `,
    },
  ],
  related: [
    { slug: "diesel-compound-turbo", title: "Diesel Compound Turbo Sizing" },
    { slug: "turbo-finder", title: "Turbo Finder & Sizing (gasoline)" },
    { slug: "diesel-egt-drive-pressure", title: "Diesel EGT & Drive Pressure" },
  ],
};
