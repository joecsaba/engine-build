export default {
  slug: "cam-degreeing",
  intro: "Even camshafts marked \"straight up\" from the manufacturer can be off by 2–4 degrees from the intended grind due to variations in the cam core, keyway slot, and timing set. Two degrees may not sound like much, but it changes the intake valve closing point (IVC) by 2 crankshaft degrees, which directly affects dynamic compression ratio and shifts the power band. On a high-compression engine, this can be the difference between clean combustion and destructive detonation.",
  sections: [
    {
      heading: "The degreeing process",
      body: `
        <ol>
          <li><strong>Find true TDC</strong> using a piston stop — never trust the timing mark on the balancer.</li>
          <li><strong>Install a degree wheel</strong> on the crankshaft snout.</li>
          <li><strong>Mount a dial indicator</strong> on the #1 intake lifter.</li>
          <li><strong>Rotate the engine</strong> and record the opening and closing points of the intake lobe at 0.050" lift.</li>
          <li><strong>The midpoint between opening and closing is the intake centerline</strong> — compare to the cam card spec.</li>
        </ol>
      `,
    },
    {
      heading: "Advance vs retard",
      body: `
        <p><strong>Measured centerline LATER (higher number) than cam card:</strong> cam is <em>retarded</em>. Shifts power band upward in RPM.</p>
        <p><strong>Measured centerline EARLIER (lower number) than cam card:</strong> cam is <em>advanced</em>. More low-end torque, earlier falloff on top.</p>
        <p>Most street engines benefit from <strong>2–4 degrees of advance</strong> for better throttle response. Use an offset bushing in the cam gear or an adjustable timing set to dial in the exact centerline you want.</p>
        <p>Always verify the final position <em>after</em> torquing the cam bolt — the torque can shift the cam a degree or two.</p>
      `,
    },
  ],
  related: [
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "piston-to-valve", title: "Piston-to-Valve Clearance Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
  ],
};
