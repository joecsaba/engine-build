export default {
  slug: "ring-gap",
  intro: "Piston ring end gap is the clearance between the two ends of a ring when installed in the bore. Rings expand as they heat up — if the gap is too tight, the ends butt together, scoring the cylinder walls, breaking ring lands, or seizing the piston. \"Ring butting\" is one of the most catastrophic and preventable failures in engine building.",
  sections: [
    {
      heading: "Standard rules of thumb",
      body: `
        <ul>
          <li><strong>Naturally aspirated street:</strong> 0.004" of gap per inch of bore</li>
          <li><strong>Forced induction (turbo/SC):</strong> 0.006" per inch</li>
          <li><strong>Nitrous:</strong> 0.006"–0.007" per inch</li>
        </ul>
        <p>For a 4.030" bore NA street engine, that's 0.016" minimum on the top ring. Most builders target 0.016"–0.020" for safety margin. Second rings are typically gapped 0.002"–0.004" wider than the top ring.</p>
      `,
    },
    {
      heading: "NA vs forced induction",
      body: `
        <p>Forced induction engines see significantly higher combustion temperatures, which means more thermal expansion. A turbo 4.030" bore engine needs 0.024"–0.026" on the top ring — nearly 50% more than the NA spec.</p>
        <p>Running too tight a gap on a boosted engine is a guaranteed path to ring butting, scuffed bores, and an expensive teardown. Always file-fit your rings to the actual measured bore diameter of <em>each cylinder</em>, not the nominal size.</p>
      `,
    },
    {
      heading: "Diesel is different — don't apply gasoline math",
      body: `
        <p>Diesel engines use fundamentally different ring gap ratios than gas. Most diesels run a second ring gap <strong>2–4× larger</strong> than the top ring to equalize inter-ring pressures and aid oil control.</p>
        <ul>
          <li><strong>Cummins 5.9L:</strong> top 0.010"–0.014", second 0.033"–0.045"</li>
          <li><strong>7.3L Powerstroke:</strong> second ring gap 0.062"–0.072" — extreme but correct</li>
        </ul>
        <p>Always use the engine's OEM service manual or aftermarket ring manufacturer specs for diesel. Don't apply gasoline ring gap multipliers.</p>
      `,
    },
    {
      heading: "Piston material affects ring gap — but not how you'd think",
      body: `
        <p><strong>Hypereutectic pistons</strong> (high-silicon cast aluminum, 16–19% Si) have <em>lower</em> thermal expansion than forged pistons and run tighter piston-to-wall clearance — but they need <em>larger</em> ring gaps. KB and UEM position the top ring land closer to the piston crown for better combustion sealing. That higher position exposes the ring to significantly more heat. KB recommends a flat 40% increase over standard ring gap for their hypereutectic pistons. Hypereutectics fail by <strong>shattering</strong> (brittle fracture) rather than deforming, so insufficient ring gap is especially dangerous.</p>
        <p><strong>Forged pistons</strong> come in two main alloys:</p>
        <ul>
          <li><strong>4032:</strong> Lower thermal expansion (similar to hypereutectic). Runs tighter piston-to-wall clearance (0.002"–0.003"). Quieter cold start. Best for street/strip.</li>
          <li><strong>2618:</strong> More expansion (0.0035"–0.005" clearance) but far more ductile. Deforms rather than shatters under detonation. Standard choice for forced induction, nitrous, and racing.</li>
        </ul>
        <p>Both forged alloys use the same ring gap multipliers — the difference is in piston-to-wall clearance and failure behavior, not ring gap.</p>
      `,
    },
  ],
  related: [
    { slug: "ring-gap", title: "Piston Ring Gap Calculator (simple)" },
    { slug: "boost-compression", title: "Boost / Effective CR Calculator" },
    { slug: "diesel-valve-relief", title: "Cummins Valve Relief Calculator" },
  ],
};
