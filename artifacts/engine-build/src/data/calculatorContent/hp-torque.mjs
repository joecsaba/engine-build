export default {
  slug: "hp-torque",
  intro: "Horsepower and torque are linked by one exact formula: HP = Torque × RPM ÷ 5252. Enter any two values above and the calculator returns the third — bidirectional, with Nm, kg·m, and PS conversions. The 5252 constant isn't an approximation; it comes from 33,000 ft-lbs/min (James Watt's original definition of one horsepower) divided by 2π to convert rotational speed to linear work. Below 5252 RPM, torque is always the larger number. Above 5252 RPM, horsepower is.",
  sections: [
    {
      heading: "The formula (both directions)",
      body: `
        <p><strong>Solve for HP:</strong> HP = (Torque × RPM) ÷ 5252</p>
        <p><strong>Solve for Torque:</strong> Torque = (HP × 5252) ÷ RPM</p>
        <p><strong>Solve for RPM:</strong> RPM = (HP × 5252) ÷ Torque</p>
        <p><strong>Worked example — LS3 at peak power:</strong> the factory rating is 430 HP at 5900 RPM. To find peak-power torque: (430 × 5252) ÷ 5900 = <strong>382.7 lb-ft</strong> at that RPM. Note this is lower than the engine's peak torque of 424 lb-ft (which comes at 4600 RPM) — engines make peak torque and peak HP at different RPMs, and only at 5252 RPM will HP and torque numbers be equal.</p>
        <p><strong>Worked example — LT-1 350 at peak torque:</strong> 380 lb-ft at 4000 RPM. HP at that RPM: (380 × 4000) ÷ 5252 = <strong>289 HP</strong> — even though the engine is rated at 370 HP total (at 6000 RPM).</p>
      `,
    },
    {
      heading: "HP to Torque conversion table",
      body: `
        <p>Reference chart for common HP levels across the typical automotive RPM band. Read across a row to see the torque a given HP produces at each RPM. Notice that at 5252 RPM, the HP and torque numbers are identical — that's the mathematical crossover point.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>HP</th><th>@ 2000 RPM</th><th>@ 3000 RPM</th><th>@ 4000 RPM</th><th>@ 5252 RPM</th><th>@ 6000 RPM</th><th>@ 7000 RPM</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>100 HP</strong></td><td>263 lb-ft</td><td>175 lb-ft</td><td>131 lb-ft</td><td>100 lb-ft</td><td>88 lb-ft</td><td>75 lb-ft</td></tr>
            <tr><td><strong>200 HP</strong></td><td>525 lb-ft</td><td>350 lb-ft</td><td>263 lb-ft</td><td>200 lb-ft</td><td>175 lb-ft</td><td>150 lb-ft</td></tr>
            <tr><td><strong>300 HP</strong></td><td>788 lb-ft</td><td>525 lb-ft</td><td>394 lb-ft</td><td>300 lb-ft</td><td>263 lb-ft</td><td>225 lb-ft</td></tr>
            <tr><td><strong>400 HP</strong></td><td>1,050 lb-ft</td><td>700 lb-ft</td><td>525 lb-ft</td><td>400 lb-ft</td><td>350 lb-ft</td><td>300 lb-ft</td></tr>
            <tr><td><strong>500 HP</strong></td><td>1,313 lb-ft</td><td>875 lb-ft</td><td>657 lb-ft</td><td>500 lb-ft</td><td>438 lb-ft</td><td>375 lb-ft</td></tr>
            <tr><td><strong>600 HP</strong></td><td>1,576 lb-ft</td><td>1,050 lb-ft</td><td>788 lb-ft</td><td>600 lb-ft</td><td>525 lb-ft</td><td>450 lb-ft</td></tr>
            <tr><td><strong>700 HP</strong></td><td>1,838 lb-ft</td><td>1,225 lb-ft</td><td>919 lb-ft</td><td>700 lb-ft</td><td>613 lb-ft</td><td>525 lb-ft</td></tr>
            <tr><td><strong>800 HP</strong></td><td>2,101 lb-ft</td><td>1,401 lb-ft</td><td>1,050 lb-ft</td><td>800 lb-ft</td><td>700 lb-ft</td><td>601 lb-ft</td></tr>
            <tr><td><strong>1000 HP</strong></td><td>2,626 lb-ft</td><td>1,751 lb-ft</td><td>1,313 lb-ft</td><td>1,000 lb-ft</td><td>876 lb-ft</td><td>751 lb-ft</td></tr>
            <tr><td><strong>1500 HP</strong></td><td>3,939 lb-ft</td><td>2,626 lb-ft</td><td>1,970 lb-ft</td><td>1,500 lb-ft</td><td>1,313 lb-ft</td><td>1,126 lb-ft</td></tr>
          </tbody>
        </table>
        </div>
      `,
    },
    {
      heading: "Torque to HP conversion table",
      body: `
        <p>Same math, the other direction. Common torque numbers across common RPMs — read across to find HP at each RPM.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Torque</th><th>@ 2000 RPM</th><th>@ 3000 RPM</th><th>@ 4000 RPM</th><th>@ 5252 RPM</th><th>@ 6000 RPM</th><th>@ 7000 RPM</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>200 lb-ft</strong></td><td>76 HP</td><td>114 HP</td><td>152 HP</td><td>200 HP</td><td>229 HP</td><td>267 HP</td></tr>
            <tr><td><strong>300 lb-ft</strong></td><td>114 HP</td><td>171 HP</td><td>229 HP</td><td>300 HP</td><td>343 HP</td><td>400 HP</td></tr>
            <tr><td><strong>400 lb-ft</strong></td><td>152 HP</td><td>229 HP</td><td>305 HP</td><td>400 HP</td><td>457 HP</td><td>533 HP</td></tr>
            <tr><td><strong>500 lb-ft</strong></td><td>190 HP</td><td>286 HP</td><td>381 HP</td><td>500 HP</td><td>571 HP</td><td>667 HP</td></tr>
            <tr><td><strong>600 lb-ft</strong></td><td>229 HP</td><td>343 HP</td><td>457 HP</td><td>600 HP</td><td>686 HP</td><td>800 HP</td></tr>
            <tr><td><strong>700 lb-ft</strong></td><td>267 HP</td><td>400 HP</td><td>533 HP</td><td>700 HP</td><td>800 HP</td><td>933 HP</td></tr>
            <tr><td><strong>800 lb-ft</strong></td><td>305 HP</td><td>457 HP</td><td>609 HP</td><td>800 HP</td><td>914 HP</td><td>1,067 HP</td></tr>
            <tr><td><strong>1000 lb-ft</strong></td><td>381 HP</td><td>571 HP</td><td>762 HP</td><td>1,000 HP</td><td>1,143 HP</td><td>1,334 HP</td></tr>
          </tbody>
        </table>
        </div>
      `,
    },
    {
      heading: "Common engine peak HP and torque",
      body: `
        <p>Factory-rated peak HP and peak torque for popular performance engines, plus the RPMs where they occur. Peak torque and peak HP virtually never happen at the same RPM — the gap between them is your usable powerband.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Engine</th><th>Peak HP @ RPM</th><th>Peak Torque @ RPM</th><th>HP/L</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>SBC 350 (crate GM 350)</strong></td><td>290 HP @ 5100</td><td>326 lb-ft @ 3750</td><td>50.6</td></tr>
            <tr><td><strong>SBC 350 HO (crate)</strong></td><td>333 HP @ 5100</td><td>381 lb-ft @ 3500</td><td>58.1</td></tr>
            <tr><td><strong>LS1 5.7L</strong></td><td>305 HP @ 5200</td><td>335 lb-ft @ 4400</td><td>53.8</td></tr>
            <tr><td><strong>LS2 6.0L</strong></td><td>400 HP @ 6000</td><td>400 lb-ft @ 4400</td><td>67.1</td></tr>
            <tr><td><strong>LS3 6.2L</strong></td><td>430 HP @ 5900</td><td>424 lb-ft @ 4600</td><td>69.8</td></tr>
            <tr><td><strong>LS7 7.0L</strong></td><td>505 HP @ 6300</td><td>470 lb-ft @ 4800</td><td>72.1</td></tr>
            <tr><td><strong>LSA 6.2L (supercharged)</strong></td><td>556 HP @ 6100</td><td>551 lb-ft @ 3800</td><td>89.7</td></tr>
            <tr><td><strong>LT4 6.2L (supercharged)</strong></td><td>650 HP @ 6400</td><td>650 lb-ft @ 3600</td><td>104.8</td></tr>
            <tr><td><strong>Ford 5.0L Coyote Gen 3</strong></td><td>460 HP @ 7250</td><td>420 lb-ft @ 4600</td><td>92.0</td></tr>
            <tr><td><strong>Ford 5.0L Coyote Gen 4</strong></td><td>480 HP @ 7150</td><td>415 lb-ft @ 4900</td><td>96.0</td></tr>
            <tr><td><strong>Ford 5.2L Predator (GT500)</strong></td><td>760 HP @ 7300</td><td>625 lb-ft @ 4500</td><td>146.2</td></tr>
            <tr><td><strong>Ford 5.4L GT500 ('07-'12)</strong></td><td>550 HP @ 6200</td><td>510 lb-ft @ 4500</td><td>101.9</td></tr>
            <tr><td><strong>Hemi 5.7L (Gen 3)</strong></td><td>395 HP @ 5600</td><td>410 lb-ft @ 4200</td><td>69.9</td></tr>
            <tr><td><strong>Hemi 6.4L (Scat Pack)</strong></td><td>485 HP @ 6100</td><td>475 lb-ft @ 4300</td><td>75.8</td></tr>
            <tr><td><strong>Hemi 6.2L Hellcat</strong></td><td>707 HP @ 6000</td><td>650 lb-ft @ 4800</td><td>114.0</td></tr>
            <tr><td><strong>Hemi 6.2L Demon 170</strong></td><td>1,025 HP @ 6500</td><td>945 lb-ft @ 4200</td><td>165.3</td></tr>
            <tr><td><strong>Honda K20A Type R</strong></td><td>221 HP @ 8000</td><td>159 lb-ft @ 7000</td><td>110.5</td></tr>
            <tr><td><strong>Honda K24A2 (TSX)</strong></td><td>205 HP @ 7000</td><td>164 lb-ft @ 4500</td><td>87.2</td></tr>
            <tr><td><strong>Toyota 2JZ-GTE (turbo)</strong></td><td>320 HP @ 5600</td><td>315 lb-ft @ 4000</td><td>106.7</td></tr>
            <tr><td><strong>BMW S65 (E92 M3)</strong></td><td>414 HP @ 8300</td><td>295 lb-ft @ 3900</td><td>103.5</td></tr>
            <tr><td><strong>Cummins 5.9L 12V (1998)</strong></td><td>235 HP @ 2500</td><td>460 lb-ft @ 1600</td><td>39.9</td></tr>
            <tr><td><strong>Cummins 6.7L (2023 HO)</strong></td><td>420 HP @ 2800</td><td>1,075 lb-ft @ 1800</td><td>62.7</td></tr>
            <tr><td><strong>Powerstroke 7.3L (2020+ gas)</strong></td><td>430 HP @ 5500</td><td>475 lb-ft @ 4000</td><td>59.0</td></tr>
            <tr><td><strong>Duramax L5P 6.6L</strong></td><td>445 HP @ 2800</td><td>910 lb-ft @ 1600</td><td>67.4</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>Takeaway:</strong> street V8s peak around 60–100 HP/L naturally aspirated. Turbo/supercharged builds hit 100–165 HP/L. Import 4-cylinders (K20, S2000 F20C, Honda B18C) reach 100+ HP/L in NA form — the highest specific output achievable without boost. Diesels prioritize torque per liter, not HP per liter: modern 6.7L Cummins makes 160 lb-ft/L (vs 68 lb-ft/L for the LS7 gas engine of similar displacement).</p>
      `,
    },
    {
      heading: "Why HP and torque always cross at 5252 RPM",
      body: `
        <p>The formula forces it: at RPM = 5252, the numerator and denominator cancel. HP = (Torque × 5252) ÷ 5252 = Torque. This is a mathematical identity, not a physical property of the engine — it happens even if you plot a hypothetical engine that couldn't reach 5252 RPM.</p>
        <p><strong>What it actually means for tuning:</strong></p>
        <ul>
          <li><strong>Below 5252 RPM:</strong> torque is always the larger number. Pulling power from a stop, towing, drag launches, and low-gear acceleration all live down here.</li>
          <li><strong>Above 5252 RPM:</strong> HP is always the larger number. Sustained high-speed pulls, road racing, and top-end acceleration in tall gears live up here.</li>
          <li><strong>The gap between peak torque RPM and peak HP RPM</strong> is your usable powerband. Modern LS3: peak torque at 4600, peak HP at 5900 = 1300 RPM band. That's why LS engines make so much street-usable power — the powerband is wide.</li>
          <li><strong>Diesel powerbands are narrow but low:</strong> 6.7L Cummins peaks torque at 1800 and HP at 2800 = 1000 RPM band, all under 3000 RPM. That's why diesels need many transmission gears and a fast-shifting converter.</li>
        </ul>
      `,
    },
    {
      heading: "Torque or HP — which matters for what?",
      body: `
        <p>Common misconception: bigger horsepower always wins. Reality: what matters depends on the application.</p>
        <ul>
          <li><strong>Drag racing:</strong> HP wins the top end, torque wins the launch. A 700 HP engine that only makes 400 lb-ft at 6000 RPM will run high 10s. A 500 HP engine with 650 lb-ft at 4500 will run mid 10s with the same car and gearing. HP under the curve area matters more than peak.</li>
          <li><strong>Towing:</strong> torque, torque, torque. Diesel 6.7L Cummins pulls 20K trailers with only 420 HP because it makes 1,075 lb-ft at 1800 RPM — 3× the peak torque of a Coyote 5.0L making similar HP.</li>
          <li><strong>Road racing:</strong> mid-range HP and torque. Engines living at 4000–7000 RPM need broad, flat torque curves. Peak HP at 8000 RPM is less useful than 90% of that HP from 4500–7500.</li>
          <li><strong>Street cruising:</strong> torque at 1500–3000 RPM. Nothing beats a big-cube V8 with good breathing for a street cruiser. Small displacement engines have to spin to make their HP, which means shifting and downshifting to accelerate.</li>
          <li><strong>Drifting / rock crawling:</strong> torque, and lots of it, low. Same reason as towing.</li>
        </ul>
      `,
    },
    {
      heading: "Unit conversions",
      body: `
        <p><strong>Torque units:</strong></p>
        <ul>
          <li>1 lb-ft = 1.3558 Nm = 12 in-lb = 0.1383 kg·m</li>
          <li>1 Nm = 0.7376 lb-ft = 8.851 in-lb = 0.10197 kg·m</li>
          <li>1 kg·m = 7.2330 lb-ft = 9.8067 Nm</li>
          <li>1 in-lb = 0.0833 lb-ft = 0.1130 Nm</li>
        </ul>
        <p><strong>Power units:</strong></p>
        <ul>
          <li>1 HP (mechanical / US) = 0.7457 kW = 745.7 W = 1.014 PS (metric HP)</li>
          <li>1 PS (metric HP, "Pferdestärke") = 0.9863 HP = 0.7355 kW = 735.5 W</li>
          <li>1 kW = 1.3410 HP = 1.3596 PS = 1000 W</li>
        </ul>
        <p><strong>Metric formula equivalent</strong> (Nm and kW): kW = (Nm × RPM) ÷ 9549. The 9549 constant is the metric equivalent of 5252 — it's (60 × 1000) ÷ (2π) rounded to whole numbers.</p>
      `,
    },
    {
      heading: "Frequently asked questions",
      body: `
        <p><strong>Why is 5252 the magic number?</strong><br>
        Because 33,000 ft-lb/min (Watt's definition of 1 HP) divided by 2π = 5252.11. The 2π converts rotational RPM into linear feet per minute for the formula to work out to power in units of ft-lb/min. It's not arbitrary — it's a units-conversion factor with real dimensional meaning.</p>
        <p><strong>Do HP and torque ever cross at other RPMs?</strong><br>
        No, mathematically impossible. The formula guarantees they cross at exactly 5252 RPM if you draw both curves. Every dyno chart of every engine ever built has the two curves crossing at 5252 RPM (or would if extended that far).</p>
        <p><strong>Why do diesels make so much torque but low HP?</strong><br>
        Because HP requires RPM. Diesels are limited to ~3000–4500 RPM by their heavy internals and long strokes. Even huge torque (1,075 lb-ft on a modern 6.7L Cummins) at 1800 RPM only equates to (1075 × 1800) / 5252 = 368 HP at that RPM. Peak HP typically comes at 2800–3200 RPM, capping the number.</p>
        <p><strong>What's the difference between crank HP, flywheel HP, and wheel HP?</strong><br>
        Crank/flywheel HP is measured at the engine output before drivetrain losses. Wheel HP (WHP) is measured on a chassis dyno at the wheels after transmission, drivetrain, and tire scrub take their cut. Rule of thumb: 15% loss for manuals, 20–25% for automatics, 12% for a dedicated race car with light drivetrain.</p>
        <p><strong>How do I calculate HP from a quarter-mile time?</strong><br>
        Use trap speed: HP ≈ (weight × MPH³) / 234, where weight is in pounds. A 3,500 lb car trapping 125 MPH ≈ (3,500 × 1,953,125) / 234 ≈ 29 million / 234 ≈ 125 MPH → 375 HP at the wheels. This is the "trap speed method" originally derived by Roger Huntington.</p>
        <p><strong>How do I convert Nm to HP directly?</strong><br>
        Use the metric-friendly formula: kW = Nm × RPM / 9549. Then convert kW to HP by multiplying by 1.341. Example: 500 Nm at 6000 RPM = 500 × 6000 / 9549 = 314 kW = 421 HP.</p>
        <p><strong>Why does peak torque come at lower RPM than peak HP?</strong><br>
        Volumetric efficiency (how well the engine fills its cylinders) peaks at a specific RPM based on cam timing, intake runner length, and header design. That RPM is where torque peaks. HP keeps climbing above that point because HP = torque × RPM, and RPM keeps rising even as torque starts to fall — until torque falls off faster than RPM rises, which is where HP peaks.</p>
        <p><strong>Is a torque-heavy or HP-heavy engine better for daily driving?</strong><br>
        Torque-heavy, generally. Big torque at low RPM means the engine feels responsive without downshifting. This is why 5.7L Hemi trucks feel effortless despite being outclassed on paper by high-revving small engines. HP-heavy small engines need to be revved to make power, which is fine at a track but tedious in traffic.</p>
        <p><strong>What HP/L is achievable naturally aspirated on pump gas?</strong><br>
        Around 100 HP per liter is the practical NA pump-gas ceiling. Honda's K20A Type R (110 HP/L) and Ferrari's 458 (127 HP/L) push higher with high-comp exotic-fuel tuning. For street V8s, 80–95 HP/L is excellent (Coyote 5.0L makes 92–96). Boost extends this to 120–170 HP/L on pump gas without exotic materials.</p>
      `,
    },
  ],
  related: [
    { slug: "hp-estimator", title: "HP Estimator (from displacement + heads + cam)" },
    { slug: "density-altitude", title: "Density Altitude / HP Correction" },
    { slug: "torque-units-converter", title: "Torque Units Converter (ft-lb ↔ Nm ↔ kg·m)" },
    { slug: "displacement", title: "Engine Displacement Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "gear-ratio", title: "Gear Ratio / Final Drive Calculator" },
  ],
};
