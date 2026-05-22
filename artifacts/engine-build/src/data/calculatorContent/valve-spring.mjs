export default {
  slug: "valve-spring",
  intro: "Valve springs do two jobs: hold the lifter against the cam lobe on the base circle (seat pressure) and slam the valve closed against the inertia trying to throw it open (open pressure). Get either wrong and you get noise, wear, valve float, or worse — coil bind and a broken pushrod through the rocker.",
  sections: [
    {
      heading: "Seat pressure vs open pressure",
      body: `
        <p><strong>Seat pressure too low:</strong> Lifter bounces off the cam lobe — noise, accelerated wear, erratic valve motion.</p>
        <p><strong>Open pressure too low at high RPM:</strong> Valve float. The spring can't close the valve fast enough, the valve hangs open, you lose power, and you risk piston contact.</p>
      `,
    },
    {
      heading: "Coil bind — the most dangerous failure mode",
      body: `
        <p>When a spring compresses to its solid height (all coils touching), it instantly becomes a rigid column. The valve stops moving but the cam keeps pushing — bending the pushrod, breaking the rocker, or snapping the valve stem.</p>
        <p><strong>You need a minimum of 0.060" clearance between max valve lift and coil bind height.</strong> Always verify installed height, max lift, and coil bind height <em>before</em> assembly.</p>
      `,
    },
    {
      heading: "Mass matters more than spring pressure at high RPM",
      body: `
        <p>The force required to control the valve increases with the <strong>square</strong> of engine speed — double the RPM and inertia force quadruples. At some point, adding more spring pressure creates diminishing returns: extra pressure increases friction and cam lobe loading.</p>
        <p>The fix is reducing mass:</p>
        <ul>
          <li><strong>Titanium retainers:</strong> 40–50% lighter than steel</li>
          <li><strong>Titanium valves:</strong> even bigger savings</li>
        </ul>
        <p>Lighter valvetrain lets the same springs control valves at higher RPM, OR lets you run less spring pressure for the same RPM ceiling. The latter reduces flat-tappet cam lobe wear and improves engine longevity.</p>
      `,
    },
  ],
  related: [
    { slug: "valvetrain-builder", title: "Valvetrain RPM Builder" },
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "valve-shim", title: "Valve Shim Calculator" },
  ],
};
