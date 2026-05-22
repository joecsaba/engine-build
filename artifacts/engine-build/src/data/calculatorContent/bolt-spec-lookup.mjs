export default {
  slug: "bolt-spec-lookup",
  intro: "Head bolt and main bolt specs vary by engine platform — and the difference matters because you're holding 100,000+ PSI of cylinder pressure with those fasteners. This lookup gives factory specs plus ARP upgrade part numbers for popular platforms.",
  sections: [
    {
      heading: "TTY vs reusable",
      body: `
        <p><strong>Torque-to-Yield (TTY)</strong> bolts (typical on modern OEM head bolts — LS, Coyote, Hemi, etc.) stretch into the plastic deformation zone for maximum clamping force. They cannot be reused — once stretched, they've yielded and re-torquing won't reach the same clamp load.</p>
        <p><strong>Reusable bolts</strong> (older engines, all ARP upgrades) stay in the elastic zone. Torque, untorque, re-torque — same clamp load every time. ARP head studs are the standard upgrade for any rebuild where the bolts will see multiple removals or higher-than-stock cylinder pressure.</p>
      `,
    },
    {
      heading: "When to upgrade to ARP",
      body: `
        <ul>
          <li><strong>Boost:</strong> Forced induction past stock boost levels. The 700+ HP LS guys are all running ARP head studs.</li>
          <li><strong>Multiple gasket changes expected:</strong> TTY bolts are one-time use. ARP studs let you pull heads without buying new bolts.</li>
          <li><strong>High RPM:</strong> Higher cylinder pressure peaks need more clamp load to keep gaskets sealed.</li>
          <li><strong>Aluminum block + iron heads:</strong> Thermal expansion mismatch loosens stock bolts over time. Studs maintain clamp load better.</li>
        </ul>
        <p>Always re-torque after the first heat cycle on any rebuild — stock or ARP.</p>
      `,
    },
  ],
  related: [
    { slug: "torque-units-converter", title: "Torque Units Converter" },
    { slug: "torque-extension", title: "Torque Wrench Extension" },
    { slug: "head-milling", title: "Head Milling Calculator" },
  ],
};
