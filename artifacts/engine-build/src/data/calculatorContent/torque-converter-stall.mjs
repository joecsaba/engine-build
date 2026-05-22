export default {
  slug: "torque-converter-stall",
  intro: "Stall speed is the RPM at which the torque converter stops multiplying torque and begins to couple the engine directly to the transmission. Below stall, the converter is a fluid coupling that multiplies engine torque (1.8–2.5×). Above it, the converter locks and spins at nearly the same speed as the engine. The goal: match this transition point to the beginning of your engine's powerband so the car launches with the engine already making good torque.",
  sections: [
    {
      heading: "Flash stall vs footbrake stall",
      body: `
        <p>There are two ways to measure stall, and they give different numbers for the same converter:</p>
        <ul>
          <li><strong>Footbrake stall:</strong> Hold the brake and press throttle to WOT — the RPM where the engine stabilizes.</li>
          <li><strong>Flash stall:</strong> The RPM the engine flashes to during a full-throttle launch or trans-brake release. Always 300–800 RPM HIGHER than footbrake stall.</li>
        </ul>
        <p>When manufacturers advertise a stall speed, they may quote either number. A converter advertised at "3,000 stall" might flash to 3,500+. Always clarify which measurement they're using — <strong>flash stall is what actually matters for launch performance</strong>.</p>
      `,
    },
    {
      heading: "Cam timing is the #1 factor",
      body: `
        <p>The camshaft determines where your engine makes power. A big cam that makes no power below 4,000 RPM needs a converter that stalls at 4,000+ so the engine is already in its powerband when you launch.</p>
        <p>The most common mistake in street-strip builds: installing a big cam and using a stock or mild converter. The engine bogs off the line because it's forced to launch at 1,800 RPM in a powerband that doesn't start until 3,500.</p>
        <p><strong>Match the converter to the cam, not to the advertised horsepower number.</strong></p>
      `,
    },
    {
      heading: "How LSA affects converter behavior",
      body: `
        <p>Lobe Separation Angle affects idle vacuum, low-RPM torque, and how the engine loads the converter:</p>
        <ul>
          <li><strong>Tight LSA (106–110°):</strong> Choppy idle, lower vacuum, peakier torque curve. Engine doesn't make smooth torque at low RPM — needs HIGHER stall to get past the dead zone.</li>
          <li><strong>Wide LSA (114–116°):</strong> Smoother idle vacuum, broader torque curve. Makes usable torque at lower RPM — tolerates LOWER stall.</li>
        </ul>
        <p>Two cams with identical duration can need different converters — the tighter LSA needs more stall to compensate for its peaky low-end.</p>
      `,
    },
    {
      heading: "Power adders need LESS stall",
      body: `
        <p>Nitrous, turbos, and superchargers add torque that "flashes" the converter harder — the extra torque pushes the converter through its stall point faster.</p>
        <p>A naturally aspirated engine making 380 lb-ft might need a 3,200 RPM converter. The same engine with a 150-shot of nitrous or 10 psi of boost might need only <strong>2,500–2,800 RPM</strong> because the additional torque does the work of a higher-stall converter.</p>
        <ul>
          <li><strong>Roots/twin-screw superchargers:</strong> Most dramatic — make boost at idle, instant torque multiplication.</li>
          <li><strong>Centrifugal SC + turbos with lag:</strong> Need slightly more stall than positive-displacement equivalents — boost builds with RPM rather than being available immediately.</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "cam-duration", title: "Advanced Cam Calculator" },
    { slug: "gear-ratio", title: "Gear Ratio / Final Drive" },
    { slug: "hp-estimator", title: "HP & Torque Estimator" },
  ],
};
