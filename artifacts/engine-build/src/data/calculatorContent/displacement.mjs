export default {
  slug: "displacement",
  intro: "Engine displacement is the total volume swept by all pistons during one complete revolution of the crankshaft. It's the single most fundamental measurement of an engine — it drives airflow needs, fuel system sizing, cam selection, and ultimately power potential. Enter your bore, stroke, and cylinder count above; the calculator returns cubic inches (CID), cubic centimeters (cc), and liters instantly.",
  sections: [
    {
      heading: "The engine displacement formula",
      body: `
        <p><strong>Displacement = Bore² × Stroke × 0.7854 × Cylinders</strong></p>
        <p>The 0.7854 constant is π/4, converting bore <em>diameter</em> to the cross-sectional area of one cylinder. Multiply by stroke to get the swept volume of a single cylinder, then by cylinder count for total displacement.</p>
        <p><strong>Worked example — SBC 350:</strong></p>
        <p style="font-family: monospace; padding-left: 1em;">4.000² × 3.480 × 0.7854 × 8<br>= 16.000 × 3.480 × 0.7854 × 8<br>= 349.85 cubic inches (5.73 L)</p>
        <p><strong>Unit conversions:</strong></p>
        <ul>
          <li>Cubic inches → Liters: divide by 61.024</li>
          <li>Cubic inches → CC: multiply by 16.387</li>
          <li>Liters → Cubic inches: multiply by 61.024</li>
          <li>CC → Cubic inches: divide by 16.387</li>
        </ul>
      `,
    },
    {
      heading: "Common engine displacement chart",
      body: `
        <p>Bore, stroke, and displacement for the most common performance engines. All measurements are OEM factory specs at nominal (0.000") overbore.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Engine</th><th>Bore</th><th>Stroke</th><th>Cyl</th><th>Displacement</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>SBC 283</strong></td><td>3.875"</td><td>3.000"</td><td>8</td><td>283 ci (4.64 L)</td></tr>
            <tr><td><strong>SBC 305 (5.0L)</strong></td><td>3.736"</td><td>3.480"</td><td>8</td><td>305 ci (5.00 L)</td></tr>
            <tr><td><strong>SBC 327</strong></td><td>4.000"</td><td>3.250"</td><td>8</td><td>327 ci (5.36 L)</td></tr>
            <tr><td><strong>SBC 350 (5.7L)</strong></td><td>4.000"</td><td>3.480"</td><td>8</td><td>350 ci (5.73 L)</td></tr>
            <tr><td><strong>SBC 400</strong></td><td>4.125"</td><td>3.750"</td><td>8</td><td>400 ci (6.55 L)</td></tr>
            <tr><td><strong>LS1 5.7L</strong></td><td>3.898"</td><td>3.622"</td><td>8</td><td>346 ci (5.67 L)</td></tr>
            <tr><td><strong>LS2 6.0L</strong></td><td>4.000"</td><td>3.622"</td><td>8</td><td>364 ci (5.96 L)</td></tr>
            <tr><td><strong>LS3 6.2L</strong></td><td>4.065"</td><td>3.622"</td><td>8</td><td>376 ci (6.16 L)</td></tr>
            <tr><td><strong>LS7 7.0L</strong></td><td>4.125"</td><td>4.000"</td><td>8</td><td>428 ci (7.01 L)</td></tr>
            <tr><td><strong>LSX 454</strong></td><td>4.185"</td><td>4.125"</td><td>8</td><td>454 ci (7.44 L)</td></tr>
            <tr><td><strong>BBC 396</strong></td><td>4.094"</td><td>3.760"</td><td>8</td><td>396 ci (6.49 L)</td></tr>
            <tr><td><strong>BBC 427</strong></td><td>4.251"</td><td>3.760"</td><td>8</td><td>427 ci (7.00 L)</td></tr>
            <tr><td><strong>BBC 454 (7.4L)</strong></td><td>4.251"</td><td>4.000"</td><td>8</td><td>454 ci (7.44 L)</td></tr>
            <tr><td><strong>BBC 496</strong></td><td>4.310"</td><td>4.250"</td><td>8</td><td>496 ci (8.13 L)</td></tr>
            <tr><td><strong>Ford 289</strong></td><td>4.000"</td><td>2.870"</td><td>8</td><td>289 ci (4.73 L)</td></tr>
            <tr><td><strong>Ford 302 (5.0L)</strong></td><td>4.000"</td><td>3.000"</td><td>8</td><td>302 ci (4.95 L)</td></tr>
            <tr><td><strong>Ford 351W</strong></td><td>4.000"</td><td>3.500"</td><td>8</td><td>352 ci (5.77 L)</td></tr>
            <tr><td><strong>Ford 460</strong></td><td>4.360"</td><td>3.850"</td><td>8</td><td>460 ci (7.54 L)</td></tr>
            <tr><td><strong>Coyote 5.0L (Gen 1-3)</strong></td><td>3.630"</td><td>3.649"</td><td>8</td><td>302 ci (4.95 L)</td></tr>
            <tr><td><strong>Mopar 340</strong></td><td>4.040"</td><td>3.310"</td><td>8</td><td>340 ci (5.57 L)</td></tr>
            <tr><td><strong>Mopar 360</strong></td><td>4.000"</td><td>3.580"</td><td>8</td><td>360 ci (5.90 L)</td></tr>
            <tr><td><strong>Mopar 440</strong></td><td>4.320"</td><td>3.750"</td><td>8</td><td>440 ci (7.21 L)</td></tr>
            <tr><td><strong>Chrysler Hemi 5.7L</strong></td><td>3.917"</td><td>3.579"</td><td>8</td><td>345 ci (5.65 L)</td></tr>
            <tr><td><strong>Chrysler Hemi 6.4L</strong></td><td>4.090"</td><td>3.720"</td><td>8</td><td>391 ci (6.42 L)</td></tr>
            <tr><td><strong>Honda K20A2</strong></td><td>3.386"</td><td>3.386"</td><td>4</td><td>121.9 ci (2.00 L)</td></tr>
            <tr><td><strong>Honda K24A2</strong></td><td>3.428"</td><td>3.898"</td><td>4</td><td>143.7 ci (2.35 L)</td></tr>
            <tr><td><strong>Toyota 2JZ-GTE</strong></td><td>3.386"</td><td>3.386"</td><td>6</td><td>183 ci (3.00 L)</td></tr>
            <tr><td><strong>Cummins 5.9L 12V</strong></td><td>4.020"</td><td>4.720"</td><td>6</td><td>359 ci (5.88 L)</td></tr>
            <tr><td><strong>Cummins 6.7L</strong></td><td>4.213"</td><td>4.882"</td><td>6</td><td>408 ci (6.69 L)</td></tr>
            <tr><td><strong>Ford Powerstroke 7.3L</strong></td><td>4.110"</td><td>4.180"</td><td>8</td><td>444 ci (7.28 L)</td></tr>
            <tr><td><strong>GM Duramax 6.6L</strong></td><td>4.055"</td><td>3.897"</td><td>8</td><td>403 ci (6.60 L)</td></tr>
          </tbody>
        </table>
        </div>
      `,
    },
    {
      heading: "Popular stroker combinations",
      body: `
        <p>Stroker kits swap the crankshaft (and often rods and pistons) to increase stroke, which increases displacement without going any bigger on the bore. The math is the reason strokers dominate the aftermarket — you gain 25–100+ cubic inches from a bolt-in rotating assembly.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Base Engine</th><th>Stroker Combo</th><th>Bore × Stroke</th><th>New Displacement</th><th>Gain</th></tr>
          </thead>
          <tbody>
            <tr><td>SBC 350</td><td><strong>383 stroker</strong></td><td>4.030" × 3.750"</td><td>383 ci (6.28 L)</td><td>+33 ci</td></tr>
            <tr><td>SBC 350</td><td><strong>406 stroker</strong></td><td>4.155" × 3.750"</td><td>406 ci (6.65 L)</td><td>+56 ci</td></tr>
            <tr><td>SBC 400</td><td><strong>421 stroker</strong></td><td>4.155" × 3.875"</td><td>421 ci (6.90 L)</td><td>+21 ci</td></tr>
            <tr><td>SBC 400</td><td><strong>434 stroker</strong></td><td>4.155" × 4.000"</td><td>434 ci (7.11 L)</td><td>+34 ci</td></tr>
            <tr><td>LS 5.3L (LM7)</td><td><strong>383 stroker</strong></td><td>3.905" × 4.000"</td><td>383 ci (6.28 L)</td><td>+58 ci</td></tr>
            <tr><td>LS 5.3L (LM7)</td><td><strong>408 stroker</strong></td><td>4.030" × 4.000"</td><td>408 ci (6.68 L)</td><td>+83 ci</td></tr>
            <tr><td>LS 6.0L (LQ4/LQ9)</td><td><strong>408 stroker</strong></td><td>4.030" × 4.000"</td><td>408 ci (6.68 L)</td><td>+44 ci</td></tr>
            <tr><td>LS 6.0L (LQ4/LQ9)</td><td><strong>427 stroker</strong></td><td>4.125" × 4.000"</td><td>427 ci (7.00 L)</td><td>+63 ci</td></tr>
            <tr><td>LS3 6.2L</td><td><strong>416 stroker</strong></td><td>4.065" × 4.000"</td><td>415 ci (6.80 L)</td><td>+39 ci</td></tr>
            <tr><td>LS3 6.2L</td><td><strong>440 stroker</strong></td><td>4.185" × 4.000"</td><td>440 ci (7.21 L)</td><td>+64 ci</td></tr>
            <tr><td>BBC 454</td><td><strong>496 stroker</strong></td><td>4.310" × 4.250"</td><td>496 ci (8.13 L)</td><td>+42 ci</td></tr>
            <tr><td>BBC 454</td><td><strong>540 stroker</strong></td><td>4.500" × 4.250"</td><td>540 ci (8.85 L)</td><td>+86 ci</td></tr>
            <tr><td>BBC 454</td><td><strong>632 stroker</strong></td><td>4.600" × 4.750"</td><td>632 ci (10.36 L)</td><td>+178 ci</td></tr>
            <tr><td>Ford 302</td><td><strong>331 stroker</strong></td><td>4.030" × 3.250"</td><td>331 ci (5.43 L)</td><td>+29 ci</td></tr>
            <tr><td>Ford 302</td><td><strong>347 stroker</strong></td><td>4.030" × 3.400"</td><td>347 ci (5.68 L)</td><td>+45 ci</td></tr>
            <tr><td>Ford 351W</td><td><strong>408 stroker</strong></td><td>4.030" × 4.000"</td><td>408 ci (6.68 L)</td><td>+56 ci</td></tr>
            <tr><td>Ford 351W</td><td><strong>427 stroker</strong></td><td>4.125" × 4.000"</td><td>427 ci (7.00 L)</td><td>+75 ci</td></tr>
            <tr><td>Mopar 360</td><td><strong>408 stroker</strong></td><td>4.030" × 4.000"</td><td>408 ci (6.68 L)</td><td>+48 ci</td></tr>
            <tr><td>Mopar 440</td><td><strong>500 stroker</strong></td><td>4.375" × 4.150"</td><td>499 ci (8.18 L)</td><td>+59 ci</td></tr>
            <tr><td>Coyote 5.0L</td><td><strong>331 Coyote</strong></td><td>3.630" × 4.000"</td><td>331 ci (5.43 L)</td><td>+29 ci</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>The pattern:</strong> the 383 SBC (5.7L → 6.3L) and 408 LS (5.3/6.0 → 6.7L) are the two most popular strokers because they use readily available factory-based rotating assemblies. Bigger cubes = more torque at any RPM, cheaper than boost, and the parts availability makes them cost-effective compared to raising displacement through bore alone.</p>
      `,
    },
    {
      heading: "Overbore effect — how much displacement do you gain?",
      body: `
        <p>Every 0.010" of overbore adds a small but measurable amount of displacement. Here's what standard overbore steps do to popular V8s:</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Engine</th><th>+0.000"</th><th>+0.020"</th><th>+0.030"</th><th>+0.040"</th><th>+0.060"</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>SBC 350</strong> (3.480" stroke)</td><td>350 ci</td><td>353 ci</td><td>355 ci</td><td>357 ci</td><td>361 ci</td></tr>
            <tr><td><strong>SBC 400</strong> (3.750" stroke)</td><td>400 ci</td><td>404 ci</td><td>406 ci</td><td>408 ci</td><td>412 ci</td></tr>
            <tr><td><strong>LS3 6.2L</strong> (3.622" stroke)</td><td>376 ci</td><td>380 ci</td><td>381 ci</td><td>383 ci</td><td>387 ci</td></tr>
            <tr><td><strong>BBC 454</strong> (4.000" stroke)</td><td>454 ci</td><td>458 ci</td><td>461 ci</td><td>463 ci</td><td>467 ci</td></tr>
            <tr><td><strong>Ford 302</strong> (3.000" stroke)</td><td>302 ci</td><td>305 ci</td><td>307 ci</td><td>308 ci</td><td>311 ci</td></tr>
            <tr><td><strong>Ford 351W</strong> (3.500" stroke)</td><td>352 ci</td><td>355 ci</td><td>357 ci</td><td>359 ci</td><td>363 ci</td></tr>
          </tbody>
        </table>
        </div>
        <p>Rule of thumb: <strong>each 0.010" of overbore adds roughly 1.7 cubic inches on a V8 at 3.5" stroke</strong>. Rebores are typically done in 0.010" increments — +0.030" is the most common (clean-up bore for a rebuild), +0.060" is the practical limit for most cast iron blocks without sonic-testing wall thickness first.</p>
      `,
    },
    {
      heading: "Oversquare vs undersquare — bore-to-stroke ratio",
      body: `
        <p>Bore-to-stroke ratio classifies engines by their aspect ratio and predicts a lot about how they'll behave:</p>
        <ul>
          <li><strong>Oversquare</strong> (bore &gt; stroke) — Larger valves fit in the head, less piston travel per revolution, breathes better at high RPM. Peak torque and horsepower come at higher RPM. Most modern performance engines (LS3, LS7, Coyote, most F1) are oversquare.</li>
          <li><strong>Square</strong> (bore = stroke) — Balanced tradeoff. LS1 (3.898"×3.622" — nearly square), Ford 4.6L Modular (90.2×90.0 mm — exactly square), Honda K20 (3.386"×3.386" — exactly square).</li>
          <li><strong>Undersquare</strong> (bore &lt; stroke) — Longer stroke gives more low-RPM torque, higher piston speeds limit maximum RPM. Diesels are almost always undersquare (Cummins 5.9L: 4.02"×4.72", Duramax LB7: 4.055"×3.897"). Chrysler Slant Six: 3.41"×4.12".</li>
        </ul>
        <p>Bore/stroke ratio: divide bore by stroke. Ratios above 1.05 are strongly oversquare; below 0.95 is strongly undersquare. Neither is "better" — they're just optimized for different RPM ranges and applications.</p>
      `,
    },
    {
      heading: "Frequently asked questions",
      body: `
        <p><strong>Does connecting rod length affect displacement?</strong><br>
        No. Displacement is purely a function of bore, stroke, and cylinder count. Rod length affects piston motion characteristics (dwell at TDC/BDC, side loading, peak piston velocity), but the swept volume of the cylinder is fixed by the crank stroke — the rod just links piston to crank pin.</p>
        <p><strong>Why is a "5.7L" engine sometimes 346 ci, sometimes 350 ci, and sometimes 353 ci?</strong><br>
        Marketing rounding. GM calls both the SBC 350 (349.8 ci = 5.73 L) and the LS1 (346 ci = 5.67 L) "5.7 liter" engines despite being different displacements. Marine and truck variants sometimes get badged with slightly different numbers. Always calculate actual displacement from bore and stroke rather than trusting the badge.</p>
        <p><strong>How much does a 0.030" overbore actually add?</strong><br>
        About 5 cubic inches on an SBC V8, 6 ci on a BBC. See the overbore table above for specifics per engine.</p>
        <p><strong>Do you need to account for combustion chamber volume in displacement?</strong><br>
        No — displacement is <em>swept</em> volume only (BDC to TDC). Chamber volume is separate and only matters for compression ratio calculation. Use our <a href="/calculators/compression-ratio">Compression Ratio Calculator</a> for CR math.</p>
        <p><strong>What's the biggest street engine you can build in a specific block?</strong><br>
        Limited by cylinder wall thickness (max safe bore) and block deck height (max safe stroke without piston pin intersecting oil ring). Roughly: SBC → 434 ci, LS → 454 ci (with LSX or aftermarket block), BBC → 632 ci, Ford Windsor → 427 ci. Aftermarket race blocks push these numbers higher.</p>
        <p><strong>Should I calculate displacement in cubic inches or liters?</strong><br>
        Either is fine — 1 cubic inch = 16.387 cc, or 1 liter = 61.024 cubic inches. American V8 culture defaults to cubic inches, import culture defaults to liters. The math is identical.</p>
        <p><strong>How does displacement affect carb or injector sizing?</strong><br>
        Airflow demand scales with displacement × RPM × volumetric efficiency. A 383 ci engine at 6,000 RPM at 100% VE needs about 665 CFM; a 454 needs about 788 CFM. Recalculate your <a href="/calculators/carb-cfm-sizing">carb CFM</a> or <a href="/calculators/fuel-injector-sizing">injector size</a> anytime displacement changes.</p>
      `,
    },
  ],
  related: [
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "rod-ratio", title: "Connecting Rod Ratio Calculator" },
    { slug: "piston-speed", title: "Piston Speed Calculator" },
    { slug: "carb-cfm-sizing", title: "Carburetor CFM Calculator" },
    { slug: "fuel-injector-sizing", title: "Fuel Injector Sizing Calculator" },
    { slug: "quench-deck-height", title: "Quench & Deck Height Calculator" },
  ],
};
