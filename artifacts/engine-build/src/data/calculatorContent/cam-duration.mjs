export default {
  slug: "cam-duration",
  intro: "The cam controls when valves open and close relative to piston position, and those timing events determine where in the RPM range the engine makes power. Duration at 0.050\" lift is the industry-standard measurement — it ignores the slow opening and closing ramps and measures only the aggressive portion of the lobe profile.",
  sections: [
    {
      heading: "Overlap, LSA, and what they actually do",
      body: `
        <p><strong>Overlap</strong> is the period (measured in crankshaft degrees) when both intake and exhaust valves are open simultaneously. More overlap improves high-RPM scavenging but hurts idle quality and low-RPM vacuum.</p>
        <p><strong>LSA (Lobe Separation Angle)</strong> is the angle in <em>camshaft</em> degrees between the intake and exhaust lobe centerlines.</p>
        <ul>
          <li><strong>Tighter LSA (108°):</strong> More overlap, peaky power band, lopey idle, sub-15" vacuum</li>
          <li><strong>Wider LSA (114°):</strong> Less overlap, broader power band, better idle and vacuum, brake booster–friendly</li>
        </ul>
      `,
    },
    {
      heading: "Real-world cam example",
      body: `
        <p>A popular street performance cam like the <strong>COMP Cams XE274H</strong>:</p>
        <ul>
          <li>274°/286° advertised duration</li>
          <li>~224°/230° at 0.050"</li>
          <li>110° LSA with roughly 60° of overlap</li>
        </ul>
        <p>For a 350ci SBC with 2.02"/1.60" valves, a recommended LSA is approximately 108°–112° depending on whether the build favors low-end torque (wider) or top-end horsepower (tighter).</p>
      `,
    },
    {
      heading: "Cam is only half the equation",
      body: `
        <p>The cam must be matched to the cylinder heads' flow capabilities and the engine's intended RPM range. A 250° @ .050" cam in heads that flow 220 CFM peaks below the cam's design RPM and you leave power on the table. The same cam in heads that flow 280 CFM lights up perfectly. Always look at cam + head + intake + compression as a system.</p>
      `,
    },
  ],
  related: [
    { slug: "cam-degreeing", title: "Cam Degreeing Calculator" },
    { slug: "piston-to-valve", title: "Piston-to-Valve Clearance Calculator" },
    { slug: "valvetrain-builder", title: "Valvetrain RPM Builder" },
  ],
};
