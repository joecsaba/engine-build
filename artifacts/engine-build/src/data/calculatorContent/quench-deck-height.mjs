export default {
  slug: "quench-deck-height",
  intro: "The quench zone (also called the squish band) is the flat area of the piston top that comes very close to the flat area of the cylinder head at TDC. The narrow gap forces violent turbulence into the combustion chamber, promoting fast even combustion — and the cool surfaces on both sides actively suppress the end-gas detonation that destroys pistons and rings.",
  sections: [
    {
      heading: "Optimal quench distance by rod material",
      body: `
        <ul>
          <li><strong>Steel rods:</strong> 0.035"–0.045" (rods stretch less under load)</li>
          <li><strong>Aluminum rods:</strong> 0.050"–0.060" (more expansion with heat — need extra margin to avoid piston-to-head contact)</li>
        </ul>
        <p>Too tight and the piston can physically contact the head — especially at high RPM where rod stretch increases. Too loose (above 0.080") and the quench effect diminishes, offering little detonation resistance and poor combustion efficiency.</p>
      `,
    },
    {
      heading: "How deck height and gasket affect quench",
      body: `
        <p><strong>Quench distance = deck clearance + compressed gasket thickness</strong> (in the quench area).</p>
        <p>If the piston is 0.005" in the hole and the gasket compresses to 0.038", quench distance is 0.043". Milling the heads or block reduces the gasket's compressed thickness and changes quench — always recalculate after machine work.</p>
        <p><strong>Common street target:</strong> zero-deck pistons (flush with the block) with a 0.040" compressed gasket — good quench without contact risk.</p>
      `,
    },
    {
      heading: "Piston material also matters",
      body: `
        <p>Forged 2618 aluminum expands significantly more than cast or hypereutectic — requiring 0.0035"–0.005" piston-to-wall clearance vs just 0.0008"–0.0015" for hypereutectic. That extra expansion means 2618 pistons rock more in the bore at cold start (before expanding to fill the clearance), which is another reason to keep quench conservative on 2618 builds.</p>
        <p>4032 forging alloy splits the difference — moderate expansion, tighter fit, quieter cold operation — making it the preferred choice for street builds that don't need 2618's extreme ductility.</p>
      `,
    },
  ],
  related: [
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "head-milling", title: "Head Milling Calculator" },
    { slug: "piston-to-valve", title: "Piston-to-Valve Clearance Calculator" },
  ],
};
