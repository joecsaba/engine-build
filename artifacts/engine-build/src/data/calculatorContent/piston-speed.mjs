export default {
  slug: "piston-speed",
  intro: "Mean piston speed (MPS) is the average velocity of the piston as it travels up and down the bore, calculated as (2 × Stroke × RPM) ÷ 12 in feet per minute. It's the primary factor limiting how fast an engine can safely rev — pistons, rings, rod bearings, and wrist pins all have material limits, and exceeding safe piston speeds leads to ring flutter, bearing failure, and ultimately catastrophic rod failure.",
  sections: [
    {
      heading: "Safe piston speed zones",
      body: `
        <ul>
          <li><strong>&lt; 3,500 FPM:</strong> Comfortable for street engines with standard components</li>
          <li><strong>3,500–4,500 FPM:</strong> Performance range — quality forged rods, pistons, and pins required</li>
          <li><strong>4,500–5,000 FPM:</strong> Race territory — best aftermarket parts, regular inspection</li>
          <li><strong>&gt; 5,000 FPM:</strong> Pro race only — billet rods, custom pistons, short service interval</li>
        </ul>
        <p>A Chevy 350 with its 3.480" stroke reaches 3,480 FPM at 6,000 RPM — right at the street limit. Push it to 7,000 RPM and you're at 4,060 FPM, firmly in performance territory.</p>
      `,
    },
    {
      heading: "Why short strokes rev higher",
      body: `
        <p>A shorter stroke means less piston travel per revolution, which directly reduces mean piston speed at any given RPM. The Ford 302 with its 3.000" stroke only reaches 3,250 FPM at 6,500 RPM — well within safe limits. This is why short-stroke engines like the 302, Honda B16, and Ferrari flat-plane V8s can safely rev to 7,000–9,000 RPM.</p>
        <p>Long-stroke torque motors like the BBC 454 (4.000" stroke) hit 4,000 FPM at just 6,000 RPM. When planning your rev limit, calculate MPS first and work backward to a safe RPM ceiling for your components.</p>
      `,
    },
    {
      heading: "Peak piston speed vs mean — what to watch",
      body: `
        <p>Mean piston speed is an average. Peak piston speed — the maximum velocity the piston actually reaches around 75° ATDC — is typically <strong>1.6×</strong> the mean speed. A 4,000 FPM mean piston speed translates to ~6,400 FPM peak. Peak is what actually breaks parts; mean is just the convenient number to compare engines.</p>
        <p>Rod ratio also affects peak piston speed: a higher rod ratio gives a smoother acceleration curve and lower peak speed for the same mean. Another reason long-rod combos are easier on parts at high RPM.</p>
      `,
    },
  ],
  related: [
    { slug: "rod-ratio", title: "Connecting Rod Ratio Calculator" },
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "valve-spring", title: "Valve Spring Calculator" },
  ],
};
