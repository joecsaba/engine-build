export default {
  slug: "piston-to-valve",
  intro: "Piston-to-valve (P2V) clearance is the minimum distance between the valve head and the piston top during the overlap period — the window when both the intake and exhaust valves are open simultaneously. If clearance is insufficient, the valve contacts the piston, bending the valve, cracking the piston, and potentially destroying the entire engine on the first revolution.",
  sections: [
    {
      heading: "Minimum safe clearances",
      body: `
        <ul>
          <li><strong>Intake valve:</strong> 0.080" minimum</li>
          <li><strong>Exhaust valve:</strong> 0.100" minimum</li>
        </ul>
        <p>Exhaust gets more margin because exhaust valves run hotter and grow more under thermal load. Pro race builds sometimes run tighter — but only with precision measurement and very stiff valvetrain.</p>
      `,
    },
    {
      heading: "What reduces P2V — recheck after any of these",
      body: `
        <ul>
          <li>Installing a cam with more <strong>duration or lift</strong></li>
          <li>Increasing <strong>rocker arm ratio</strong> (e.g., 1.5:1 → 1.6:1 rockers)</li>
          <li><strong>Milling cylinder heads</strong> (moves the valves closer to the piston — 1:1 relationship)</li>
          <li><strong>Advancing cam timing</strong> (moves intake events earlier — can eat into clearance that looked fine at "straight up")</li>
        </ul>
        <p>Valve reliefs (notches) machined into the piston crown provide clearance, but their depth must be verified against the actual valve position — not assumed from catalog specifications.</p>
      `,
    },
    {
      heading: "How to actually check P2V",
      body: `
        <p><strong>Clay check (most reliable):</strong></p>
        <ol>
          <li>Place modeling clay on the piston top in the valve pocket areas</li>
          <li>Assemble the engine with <strong>light checking springs</strong> (not full-rate)</li>
          <li>Rotate the engine through two full revolutions</li>
          <li>Disassemble and measure the clay thickness with a caliper</li>
        </ol>
        <p><strong>Dial indicator method:</strong> Through the spark plug hole while assembled with light springs, rotate slowly through the overlap zone (intake opening to exhaust closing).</p>
        <p><strong>Always check P2V with the cam degreed to its final installed position.</strong> A 4-degree advance moves the intake valve event earlier and can eat clearance that looked fine at "straight up."</p>
      `,
    },
  ],
  related: [
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "head-milling", title: "Head Milling Calculator" },
    { slug: "diesel-valve-relief", title: "Cummins Valve Relief Calculator" },
  ],
};
