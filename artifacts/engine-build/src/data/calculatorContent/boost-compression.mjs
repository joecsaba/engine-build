export default {
  slug: "boost-compression",
  intro: "Effective compression ratio (ECR) is the actual compression ratio your engine sees under boost. When a turbo or supercharger forces additional air into the cylinder above atmospheric pressure, the charge is already pre-compressed before the piston even starts its compression stroke. The result is an ECR significantly higher than the static number stamped on the piston box.",
  sections: [
    {
      heading: "The relationship",
      body: `
        <p><strong>ECR = Static CR × (Manifold Pressure + Atmospheric Pressure) ÷ Atmospheric Pressure</strong></p>
        <p>At sea level with 10 PSI of boost and a 9:1 static CR, your engine sees an effective <strong>15.1:1</strong> compression ratio. That's well above what 93-octane pump gas can handle without detonation — which is why most turbocharged street engines run lower static CRs in the 8.0–8.5:1 range.</p>
      `,
    },
    {
      heading: "Why dynamic CR matters more than static CR",
      body: `
        <p>Static CR is measured from BDC to TDC, but the intake valve doesn't close at BDC. On most performance cams, the intake closes 50–70° after BDC. Until that valve closes, the cylinder isn't sealed and some charge escapes.</p>
        <p>Dynamic CR accounts for this by calculating the effective stroke — the piston travel <em>after</em> the intake valve actually closes. This is a much better predictor of detonation than static CR, especially with aggressive cam profiles that close the intake valve very late.</p>
      `,
    },
    {
      heading: "Altitude effects",
      body: `
        <p>A boost gauge reads pressure above ambient. So 10 PSI of boost in Denver (where ambient is about 12.1 PSI) produces less total manifold pressure than 10 PSI in Miami (14.7 PSI ambient).</p>
        <p>But here's the trap: effective compression ratio is actually <em>higher</em> at altitude for the same gauge boost, because the denominator in the ECR formula (atmospheric pressure) is smaller. Builders at altitude should account for this when selecting CR and boost target.</p>
      `,
    },
    {
      heading: "Rule of thumb by fuel",
      body: `
        <ul>
          <li><strong>93 octane pump gas:</strong> Keep ECR under 12.5:1 with modern EFI and good intercooling</li>
          <li><strong>E85:</strong> ECR up to 15:1 in well-tuned setups (high octane + charge cooling effect)</li>
          <li><strong>Race gas (110+):</strong> 17:1+ is achievable on a tuned engine</li>
        </ul>
        <p>If you want more boost on pump gas, lower static CR. If you want to keep high-comp pistons, switch fuels.</p>
      `,
    },
  ],
  related: [
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "dynamic-compression-ratio-v2", title: "Dynamic CR Calculator" },
    { slug: "turbo-finder", title: "Turbo Finder & Sizing" },
  ],
};
