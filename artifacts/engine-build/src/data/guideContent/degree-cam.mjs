// Long-form body for /guides/degree-cam. See bearing-clearance.mjs for the
// markup contract shared by every guide content file.

export default {
  slug: "degree-cam",
  intro:
    "Degreeing a camshaft verifies that the cam is installed in the correct position relative to the crankshaft. Even cams marked \"straight up\" can be off by several degrees from the manufacturer. A few degrees of advance or retard shifts the power band significantly — degreeing it costs two hours and can be the difference between a good engine and a great one.",
  sections: [
    {
      heading: "Tools required",
      body: `
        <ul>
          <li>Degree wheel (at least 12" diameter &mdash; larger is more accurate)</li>
          <li>Dial indicator with magnetic base</li>
          <li>Piston stop (threaded into the spark plug hole)</li>
          <li>Stiff wire or light pointer for the degree wheel</li>
          <li>Cam card (spec sheet from the cam manufacturer)</li>
          <li>Socket and ratchet for rotating the engine</li>
        </ul>
      `,
    },
    {
      heading: "Step 1: Find true TDC",
      body: `
        <p>The timing mark on the harmonic balancer is NOT reliable for degreeing purposes &mdash; it can be off by several degrees. You must find true TDC (top dead center) using a piston stop.</p>
        <ol>
          <li>Thread a piston stop into the #1 spark plug hole. If you don't have a piston stop, drill a hole through an old spark plug and thread a bolt through it.</li>
          <li>Rotate the engine forward until the piston contacts the stop. Read the degree wheel and mark this number (e.g. 25&deg; BTDC).</li>
          <li>Rotate the engine BACKWARD until the piston contacts the stop on the other side. Read the degree wheel (e.g. 25&deg; ATDC if your timing marks are symmetric).</li>
          <li>True TDC is exactly halfway between these two numbers. Adjust your degree wheel pointer until the midpoint reads 0&deg;.</li>
          <li>Remove the piston stop before proceeding.</li>
        </ol>
        <p>Approach the stop slowly and by hand both times. Bumping it with a breaker bar loads the rod and gives a reading a degree or two off, which defeats the whole point of the exercise.</p>
      `,
    },
    {
      heading: "Step 2: Set up the dial indicator",
      body: `
        <p>Mount the dial indicator so the plunger contacts the top of an intake lifter on cylinder #1, perpendicular to the lifter travel. The lifter must be in the lifter bore (not floating) and the pushrod must be removed, or the indicator must sit on the lifter directly.</p>
        <p>Any angle between the plunger and the direction of lifter travel makes the indicator read low by the cosine of that angle. Get it square.</p>
      `,
    },
    {
      heading: "Step 3: Find maximum lift",
      body: `
        <p>Rotate the engine slowly and watch the dial indicator. Find the point where the indicator reads maximum &mdash; this is maximum cam lobe lift, the nose of the lobe. At this point, record the degree wheel reading. This reading, measured in degrees ATDC, is your intake centerline.</p>
        <p>Because the lobe nose is nearly flat, reading the exact peak is imprecise. The more repeatable method is to find the two crank positions at a fixed lift either side of peak (0.050" down from max is common) and take the midpoint &mdash; that is the true centerline.</p>
      `,
    },
    {
      heading: "Step 4: Compare to the cam card",
      body: `
        <p>The cam card specifies the intake centerline (ICL). Compare your measured ICL to the specified ICL:</p>
        <table>
          <thead>
            <tr><th>Your reading vs. cam card</th><th>Meaning</th><th>Effect</th></tr>
          </thead>
          <tbody>
            <tr><td>Reading = cam card ICL</td><td>Cam installed exactly as ground</td><td>Power band as designed</td></tr>
            <tr><td>Reading is LESS than cam card ICL</td><td>Cam is ADVANCED (shifted earlier)</td><td>More low-end torque, power band moves down in RPM</td></tr>
            <tr><td>Reading is MORE than cam card ICL</td><td>Cam is RETARDED (shifted later)</td><td>More top-end power, power band moves up in RPM, may hurt idle quality</td></tr>
          </tbody>
        </table>
      `,
    },
    {
      heading: "Step 5: Adjust with offset keys or an adjustable timing set",
      body: `
        <p>Most cam sprockets use a Woodruff key to lock the sprocket to the cam. Offset Woodruff keys allow 2&deg; of advance or retard adjustment. Adjustable timing sets, with multiple keyway positions, allow 4&deg; or more in 2&deg; increments. Repeat the degreeing process after any adjustment to verify.</p>
        <aside data-tone="warn">
          <p>Whenever you change cam timing, re-check piston-to-valve clearance. Advancing the cam moves the intake valve closer to the piston on the closing side; retarding does the same to the exhaust. A change that helps the power band can quietly eat your clearance margin.</p>
        </aside>
      `,
    },
    {
      heading: "When to advance or retard",
      body: `
        <aside data-tone="tip">
          <p>Most street performance builds run the cam straight up, as ground. If you're optimizing for low-RPM torque and drivability, advance 2&ndash;4&deg;. If you want to move the power band up for a high-RPM setup, retard 2&ndash;4&deg;. Don't chase big changes &mdash; 2&deg; makes a real difference, and 8&deg; is usually too much for street use.</p>
        </aside>
      `,
    },
  ],
  related: [
    { slug: "cam-degreeing", title: "Cam Degreeing Calculator" },
    { slug: "cam-selector", title: "Camshaft Selector" },
    { slug: "piston-to-valve", title: "Piston-to-Valve Clearance Calculator" },
  ],
};
