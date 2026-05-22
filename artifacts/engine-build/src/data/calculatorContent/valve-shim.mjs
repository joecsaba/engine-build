export default {
  slug: "valve-shim",
  intro: "OHC engines with bucket-and-shim valvetrains use thin metal discs to set the clearance between the cam lobe and the bucket (tappet). As the valve seat and face wear, clearance decreases. Exhaust valves tighten faster than intakes because they run hotter and seats wear more aggressively. If left unchecked, tight clearance leads to burned valves, lost compression, and expensive top-end repairs.",
  sections: [
    {
      heading: "The math",
      body: `
        <p>Same formula for shim-over-bucket and shim-under-bucket:</p>
        <p><strong>New Shim = Current Shim − (Measured Clearance − Desired Clearance)</strong></p>
        <ul>
          <li>Measured clearance LARGER than target (loose): the formula yields a bigger shim — you need thicker shim to take up slack.</li>
          <li>Measured clearance SMALLER than target (tight): you need a thinner shim to restore the gap.</li>
        </ul>
      `,
    },
    {
      heading: "Shim-Over-Bucket vs Shim-Under-Bucket",
      body: `
        <p><strong>Shim-Over-Bucket (SOB):</strong> Shim sits on top of the bucket, between cam lobe and tappet. You can change shims with a special depressor tool without removing the camshaft — push the bucket down, slide the shim out with a magnet or pick, drop the new one in. Fast to adjust. Used on most early Japanese sportbikes and many dirt bikes (Yamaha YZ/WR, Honda CRF, Kawasaki KX, Suzuki RM-Z).</p>
        <p><strong>Shim-Under-Bucket (SUB):</strong> Shim sits under the bucket, directly on the valve stem tip. You must remove the camshaft, lift out the bucket, swap the shim, reassemble. Significantly more work — which makes getting the math right the first time even more important. Used on most modern sportbikes (R6/R1, CBR, ZX) and many automotive OHC engines (Toyota, Honda K-series, Subaru).</p>
      `,
    },
    {
      heading: "Mistakes that ruin a shim job",
      body: `
        <ul>
          <li><strong>Trusting the stamped number:</strong> Shims wear. Always measure actual thickness with a micrometer.</li>
          <li><strong>Mixing units:</strong> Service manuals are in mm; American shops measure in imperial. Converting in your head is where most errors happen — let the calculator handle it.</li>
          <li><strong>Sign errors:</strong> Bigger gap needs thicker shim; smaller gap needs thinner. Formula handles this, but it's the most common hand-calc mistake.</li>
          <li><strong>Not at TDC:</strong> If the cam lobe is pushing on the bucket at all, your reading is wrong. Rotate to TDC on the compression stroke for the cylinder you're checking.</li>
          <li><strong>Measuring hot:</strong> Specs assume cold engine (room temp). Thermal expansion changes clearance — wait for the engine to cool.</li>
        </ul>
      `,
    },
    {
      heading: "Swap before ordering new shims",
      body: `
        <p>Before ordering new shims, check whether you can <strong>swap shims between valves</strong> to get multiple into spec at once. If one intake needs thicker and one exhaust needs thinner, the existing shims might be a better match swapped. Saves money and a second trip to the parts counter.</p>
      `,
    },
  ],
  related: [
    { slug: "valve-spring", title: "Valve Spring Calculator" },
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "torque-units-converter", title: "Torque Units Converter" },
  ],
};
