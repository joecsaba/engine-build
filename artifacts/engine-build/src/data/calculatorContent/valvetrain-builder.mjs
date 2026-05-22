export default {
  slug: "valvetrain-builder",
  intro: "The valvetrain is a mechanical chain: cam lobe → lifter → pushrod → rocker arm → valve. Every component affects final valve motion — change one part and you have to verify the rest still works. The most common surprise: changing rocker ratio is free lift, but it cascades into spring capacity, retainer clearance, and piston-to-valve checks.",
  sections: [
    {
      heading: "Rocker ratio multiplies cam lobe lift",
      body: `
        <p>A 0.300" lobe lift × 1.6:1 rocker = 0.480" valve lift. Switch to 1.7:1 rockers and you jump to 0.510" — a free 0.030" lift gain. But that triggers downstream checks:</p>
        <ul>
          <li>Does the spring still have coil bind clearance at the new max lift?</li>
          <li>Does the retainer-to-seal clearance still work?</li>
          <li>Does piston-to-valve clearance still meet minimums (0.080" intake, 0.100" exhaust)?</li>
        </ul>
      `,
    },
    {
      heading: "Valve float and why high-RPM engines need lighter parts",
      body: `
        <p>Valve float happens when the spring can't close the valve fast enough to follow the cam's closing ramp at high RPM. Inertia forces increase with the <strong>square</strong> of engine speed:</p>
        <p>From 5,500 to 6,500 RPM (an 18% increase) the inertia force on the valve increases by <strong>40%</strong>.</p>
        <p>This is why high-RPM engines need progressively stiffer springs, lighter valves, and lighter retainers. Titanium retainers (40–50% lighter than steel) can add 500–800 RPM of safe operating range on the same springs.</p>
      `,
    },
    {
      heading: "Flat tappet vs roller — the spring pressure ceiling",
      body: `
        <p><strong>Flat tappet cams</strong> have a practical seat pressure limit of approximately <strong>130 lbs</strong>. Above this, accelerated cam lobe wear becomes a serious concern — especially with modern low-ZDDP motor oils.</p>
        <p><strong>Roller cams</strong> eliminate this friction concern. The roller lifter rides on a needle bearing instead of sliding contact, allowing seat pressures of 170–400+ lbs without lobe wear. This is why roller cams dominate performance applications: they permit the aggressive lobe profiles and high spring pressures needed for serious RPM and power.</p>
        <p>If you're building a flat tappet engine: use a dedicated break-in oil with high ZDDP content and stay within the spring pressure limits recommended by the cam manufacturer.</p>
      `,
    },
  ],
  related: [
    { slug: "valve-spring", title: "Valve Spring Calculator" },
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "pushrod-length", title: "Pushrod Length Calculator" },
  ],
};
