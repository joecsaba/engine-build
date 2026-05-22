export default {
  slug: "displacement",
  intro: "Engine displacement is the total volume swept by all pistons during one complete revolution of the crankshaft. It is the single most fundamental measurement of an engine and determines airflow requirements, fuel system sizing, cam selection, and ultimately power potential.",
  sections: [
    {
      heading: "The formula",
      body: `
        <p><strong>Bore² × Stroke × 0.7854 × Cylinders</strong></p>
        <p>The 0.7854 constant is simply π/4, converting bore diameter into the area of the cylinder. Multiply by stroke to get the swept volume of one cylinder, then by cylinder count for total displacement.</p>
      `,
    },
    {
      heading: "Common engine examples",
      body: `
        <ul>
          <li><strong>SBC 350:</strong> 4.000" bore × 3.480" stroke × 8 = 349.8 ci (5.7 L)</li>
          <li><strong>LS1 5.7L:</strong> 3.898" bore × 3.622" stroke × 8 = 346 ci (despite being called "5.7L," it's actually 5.67 L)</li>
          <li><strong>Ford 302:</strong> 4.000" bore × 3.000" stroke × 8 = 302 ci (4.95 L)</li>
          <li><strong>BBC 454:</strong> 4.251" bore × 4.000" stroke × 8 = 454 ci (7.44 L)</li>
          <li><strong>Mopar 440:</strong> 4.320" bore × 3.750" stroke × 8 = 440 ci (7.21 L)</li>
          <li><strong>Coyote 5.0L:</strong> 3.629" bore × 3.649" stroke × 8 = 302 ci (4.95 L)</li>
        </ul>
      `,
    },
    {
      heading: "Overbores and stroker combos",
      body: `
        <p>Boring a 350 SBC +0.030" (to 4.030") adds about 5 cubic inches, bringing it to 355ci. The popular <strong>383 stroker</strong> takes that same +0.030" overbore and pairs it with a 3.750" stroke crankshaft from a 400 SBC, producing 383 cubic inches — a 33ci gain over stock.</p>
        <p>To convert cubic inches to liters, divide by 61.024. A 383ci engine is 6.27 liters; a stock 350 is 5.73 liters. Every displacement change shifts the engine's appetite for air and fuel, so recalculate your carb or injector sizing whenever bore or stroke changes.</p>
      `,
    },
  ],
  related: [
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "rod-ratio", title: "Connecting Rod Ratio Calculator" },
    { slug: "piston-speed", title: "Piston Speed Calculator" },
  ],
};
