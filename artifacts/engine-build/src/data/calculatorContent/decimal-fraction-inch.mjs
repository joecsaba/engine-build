export default {
  slug: "decimal-fraction-inch",
  intro: "A caliper reads 0.265\" — what fraction is that? You need to drill a 23/64\" hole and the spec sheet is in thousandths. This converter goes both directions to any precision down to 1/128\" (roughly 7 thou), with mm equivalents alongside. Below the calculator, a full 1/64\" reference chart (0 to 1\") plus tap drill sizes, common wrench decimals, and typical engine-builder measurements — the numbers you actually reach for in the shop.",
  sections: [
    {
      heading: "How the conversion works",
      body: `
        <p><strong>Decimal → fraction:</strong> multiply the decimal by the denominator you want (16, 32, 64, 128), round to the nearest whole number, and put the result over the denominator. Then simplify by dividing top and bottom by their greatest common factor.</p>
        <p><strong>Worked example:</strong> Caliper reads 0.265". At 1/64" precision:</p>
        <ul>
          <li>0.265 × 64 = 16.96 → round to 17</li>
          <li>17/64" (already in simplest form — 17 is prime)</li>
          <li>Verify: 17 ÷ 64 = 0.265625 — off from the caliper by 0.0006", about half a thou</li>
        </ul>
        <p><strong>Fraction → decimal:</strong> divide numerator by denominator. Example: 23/64 = 23 ÷ 64 = 0.359375", or ~0.360" for practical shop use.</p>
        <p><strong>Round to what precision?</strong></p>
        <ul>
          <li><strong>Framing / rough carpentry:</strong> 1/16" (0.0625") — one row of tape-measure ticks between eighths</li>
          <li><strong>Finish carpentry / cabinetmaking:</strong> 1/32" (0.03125") — halfway between the sixteenths</li>
          <li><strong>Machinist general:</strong> 1/64" (0.015625") — the finest common fractional tick</li>
          <li><strong>Precision machining:</strong> 1/128" (0.0078125") — rare on rulers; usually you're in thousandths at this point</li>
          <li><strong>Engine building:</strong> stay in thousandths (.001") — bearing clearances, ring gaps, and piston-to-wall specs are ALWAYS in decimal, never fractions</li>
        </ul>
      `,
    },
    {
      heading: "Full 1/64\" reference chart (0 to 1\")",
      body: `
        <p>Every 64th from 0 to 1 inch, with the simplified fraction, decimal equivalent, and millimeter equivalent. Bookmark this one — it covers 99% of shop conversions.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Fraction</th><th>Decimal (in)</th><th>Millimeters</th></tr>
          </thead>
          <tbody>
            <tr><td>1/64"</td><td>0.015625"</td><td>0.397 mm</td></tr>
            <tr><td>1/32"</td><td>0.03125"</td><td>0.794 mm</td></tr>
            <tr><td>3/64"</td><td>0.046875"</td><td>1.191 mm</td></tr>
            <tr><td><strong>1/16"</strong></td><td><strong>0.0625"</strong></td><td>1.588 mm</td></tr>
            <tr><td>5/64"</td><td>0.078125"</td><td>1.984 mm</td></tr>
            <tr><td>3/32"</td><td>0.09375"</td><td>2.381 mm</td></tr>
            <tr><td>7/64"</td><td>0.109375"</td><td>2.778 mm</td></tr>
            <tr><td><strong>1/8"</strong></td><td><strong>0.125"</strong></td><td>3.175 mm</td></tr>
            <tr><td>9/64"</td><td>0.140625"</td><td>3.572 mm</td></tr>
            <tr><td>5/32"</td><td>0.15625"</td><td>3.969 mm</td></tr>
            <tr><td>11/64"</td><td>0.171875"</td><td>4.366 mm</td></tr>
            <tr><td><strong>3/16"</strong></td><td><strong>0.1875"</strong></td><td>4.763 mm</td></tr>
            <tr><td>13/64"</td><td>0.203125"</td><td>5.159 mm</td></tr>
            <tr><td>7/32"</td><td>0.21875"</td><td>5.556 mm</td></tr>
            <tr><td>15/64"</td><td>0.234375"</td><td>5.953 mm</td></tr>
            <tr><td><strong>1/4"</strong></td><td><strong>0.250"</strong></td><td>6.350 mm</td></tr>
            <tr><td>17/64"</td><td>0.265625"</td><td>6.747 mm</td></tr>
            <tr><td>9/32"</td><td>0.28125"</td><td>7.144 mm</td></tr>
            <tr><td>19/64"</td><td>0.296875"</td><td>7.541 mm</td></tr>
            <tr><td><strong>5/16"</strong></td><td><strong>0.3125"</strong></td><td>7.938 mm</td></tr>
            <tr><td>21/64"</td><td>0.328125"</td><td>8.334 mm</td></tr>
            <tr><td>11/32"</td><td>0.34375"</td><td>8.731 mm</td></tr>
            <tr><td>23/64"</td><td>0.359375"</td><td>9.128 mm</td></tr>
            <tr><td><strong>3/8"</strong></td><td><strong>0.375"</strong></td><td>9.525 mm</td></tr>
            <tr><td>25/64"</td><td>0.390625"</td><td>9.922 mm</td></tr>
            <tr><td>13/32"</td><td>0.40625"</td><td>10.319 mm</td></tr>
            <tr><td>27/64"</td><td>0.421875"</td><td>10.716 mm</td></tr>
            <tr><td><strong>7/16"</strong></td><td><strong>0.4375"</strong></td><td>11.113 mm</td></tr>
            <tr><td>29/64"</td><td>0.453125"</td><td>11.509 mm</td></tr>
            <tr><td>15/32"</td><td>0.46875"</td><td>11.906 mm</td></tr>
            <tr><td>31/64"</td><td>0.484375"</td><td>12.303 mm</td></tr>
            <tr><td><strong>1/2"</strong></td><td><strong>0.500"</strong></td><td>12.700 mm</td></tr>
            <tr><td>33/64"</td><td>0.515625"</td><td>13.097 mm</td></tr>
            <tr><td>17/32"</td><td>0.53125"</td><td>13.494 mm</td></tr>
            <tr><td>35/64"</td><td>0.546875"</td><td>13.891 mm</td></tr>
            <tr><td><strong>9/16"</strong></td><td><strong>0.5625"</strong></td><td>14.288 mm</td></tr>
            <tr><td>37/64"</td><td>0.578125"</td><td>14.684 mm</td></tr>
            <tr><td>19/32"</td><td>0.59375"</td><td>15.081 mm</td></tr>
            <tr><td>39/64"</td><td>0.609375"</td><td>15.478 mm</td></tr>
            <tr><td><strong>5/8"</strong></td><td><strong>0.625"</strong></td><td>15.875 mm</td></tr>
            <tr><td>41/64"</td><td>0.640625"</td><td>16.272 mm</td></tr>
            <tr><td>21/32"</td><td>0.65625"</td><td>16.669 mm</td></tr>
            <tr><td>43/64"</td><td>0.671875"</td><td>17.066 mm</td></tr>
            <tr><td><strong>11/16"</strong></td><td><strong>0.6875"</strong></td><td>17.463 mm</td></tr>
            <tr><td>45/64"</td><td>0.703125"</td><td>17.859 mm</td></tr>
            <tr><td>23/32"</td><td>0.71875"</td><td>18.256 mm</td></tr>
            <tr><td>47/64"</td><td>0.734375"</td><td>18.653 mm</td></tr>
            <tr><td><strong>3/4"</strong></td><td><strong>0.750"</strong></td><td>19.050 mm</td></tr>
            <tr><td>49/64"</td><td>0.765625"</td><td>19.447 mm</td></tr>
            <tr><td>25/32"</td><td>0.78125"</td><td>19.844 mm</td></tr>
            <tr><td>51/64"</td><td>0.796875"</td><td>20.241 mm</td></tr>
            <tr><td><strong>13/16"</strong></td><td><strong>0.8125"</strong></td><td>20.638 mm</td></tr>
            <tr><td>53/64"</td><td>0.828125"</td><td>21.034 mm</td></tr>
            <tr><td>27/32"</td><td>0.84375"</td><td>21.431 mm</td></tr>
            <tr><td>55/64"</td><td>0.859375"</td><td>21.828 mm</td></tr>
            <tr><td><strong>7/8"</strong></td><td><strong>0.875"</strong></td><td>22.225 mm</td></tr>
            <tr><td>57/64"</td><td>0.890625"</td><td>22.622 mm</td></tr>
            <tr><td>29/32"</td><td>0.90625"</td><td>23.019 mm</td></tr>
            <tr><td>59/64"</td><td>0.921875"</td><td>23.416 mm</td></tr>
            <tr><td><strong>15/16"</strong></td><td><strong>0.9375"</strong></td><td>23.813 mm</td></tr>
            <tr><td>61/64"</td><td>0.953125"</td><td>24.209 mm</td></tr>
            <tr><td>31/32"</td><td>0.96875"</td><td>24.606 mm</td></tr>
            <tr><td>63/64"</td><td>0.984375"</td><td>25.003 mm</td></tr>
            <tr><td><strong>1"</strong></td><td><strong>1.000"</strong></td><td>25.400 mm</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>Bolded rows</strong> are the everyday "clean" fractions — 1/16, 1/8, 3/16, 1/4, etc. If you're within 1/128" of one of these, round to it. The 1/64" values in between are for when you need finer precision on a caliper or drill.</p>
      `,
    },
    {
      heading: "Common tap drill sizes — decimal equivalents",
      body: `
        <p>Tap drill charts are typically in mixed notation (fraction, letter, or number). Here's the decimal equivalent for the 75%-thread standard tap drill of each common SAE thread — the numbers you punch into a boring bar or check against a drill chart.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Tap</th><th>Drill (75% thread)</th><th>Decimal (in)</th><th>Millimeters</th></tr>
          </thead>
          <tbody>
            <tr><td>4-40 UNC</td><td>#43</td><td>0.0890"</td><td>2.261 mm</td></tr>
            <tr><td>6-32 UNC</td><td>#36</td><td>0.1065"</td><td>2.705 mm</td></tr>
            <tr><td>8-32 UNC</td><td>#29</td><td>0.1360"</td><td>3.454 mm</td></tr>
            <tr><td>10-24 UNC</td><td>#25</td><td>0.1495"</td><td>3.797 mm</td></tr>
            <tr><td>10-32 UNF</td><td>#21</td><td>0.1590"</td><td>4.039 mm</td></tr>
            <tr><td>1/4-20 UNC</td><td>#7</td><td>0.2010"</td><td>5.105 mm</td></tr>
            <tr><td>1/4-28 UNF</td><td>#3</td><td>0.2130"</td><td>5.410 mm</td></tr>
            <tr><td>5/16-18 UNC</td><td>F letter</td><td>0.2570"</td><td>6.528 mm</td></tr>
            <tr><td>5/16-24 UNF</td><td>I letter</td><td>0.2720"</td><td>6.909 mm</td></tr>
            <tr><td><strong>3/8-16 UNC</strong></td><td>5/16"</td><td>0.3125"</td><td>7.938 mm</td></tr>
            <tr><td>3/8-24 UNF</td><td>Q letter</td><td>0.3320"</td><td>8.433 mm</td></tr>
            <tr><td>7/16-14 UNC</td><td>U letter</td><td>0.3680"</td><td>9.347 mm</td></tr>
            <tr><td><strong>7/16-20 UNF</strong> (SBC head bolt)</td><td>25/64"</td><td>0.3906"</td><td>9.922 mm</td></tr>
            <tr><td><strong>1/2-13 UNC</strong> (SBC main bolt)</td><td>27/64"</td><td>0.4219"</td><td>10.716 mm</td></tr>
            <tr><td>1/2-20 UNF</td><td>29/64"</td><td>0.4531"</td><td>11.509 mm</td></tr>
            <tr><td>9/16-12 UNC</td><td>31/64"</td><td>0.4844"</td><td>12.303 mm</td></tr>
            <tr><td>9/16-18 UNF</td><td>33/64"</td><td>0.5156"</td><td>13.097 mm</td></tr>
            <tr><td>5/8-11 UNC</td><td>17/32"</td><td>0.5313"</td><td>13.494 mm</td></tr>
            <tr><td>5/8-18 UNF</td><td>37/64"</td><td>0.5781"</td><td>14.684 mm</td></tr>
            <tr><td>3/4-10 UNC</td><td>21/32"</td><td>0.6563"</td><td>16.669 mm</td></tr>
            <tr><td>3/4-16 UNF</td><td>11/16"</td><td>0.6875"</td><td>17.463 mm</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>75% thread engagement</strong> is the standard for aluminum, cast iron, and mild steel. For hardened steel or if the drill will wander in a tough material, drop to 50% engagement — use the next drill up (about +0.010"). For softer aluminum or plastics, 100% engagement (a smaller drill, about −0.010") gives a tighter, stronger thread. For more, see our <a href="/calculators/tap-drill-lookup">Tap Drill Size Lookup</a> with UNC/UNF and metric coarse/fine at both 75% and 50%.</p>
      `,
    },
    {
      heading: "SAE wrench sizes — decimal & metric equivalents",
      body: `
        <p>When you know the wrench size and need the decimal (or vice versa), this is the table. Wrench sizes measure across the flats of the fastener head.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>SAE Wrench</th><th>Decimal (in)</th><th>Metric Equivalent</th><th>Common Fastener</th></tr>
          </thead>
          <tbody>
            <tr><td>1/4"</td><td>0.250"</td><td>6.35 mm (closest: 6mm)</td><td>#12 or 1/4-20</td></tr>
            <tr><td>5/16"</td><td>0.3125"</td><td>7.94 mm (≈ 8mm)</td><td>1/4-20 hex</td></tr>
            <tr><td>3/8"</td><td>0.375"</td><td>9.53 mm (closest: 10mm)</td><td>1/4-20 hex head</td></tr>
            <tr><td>7/16"</td><td>0.4375"</td><td>11.11 mm (≈ 11mm)</td><td>1/4-28 or 5/16-18</td></tr>
            <tr><td>1/2"</td><td>0.500"</td><td>12.70 mm (closest: 13mm)</td><td>5/16-18 hex head</td></tr>
            <tr><td>9/16"</td><td>0.5625"</td><td>14.29 mm (closest: 14mm)</td><td>3/8-16 hex head</td></tr>
            <tr><td>5/8"</td><td>0.625"</td><td>15.88 mm (≈ 16mm)</td><td>3/8-24 hex head</td></tr>
            <tr><td>11/16"</td><td>0.6875"</td><td>17.46 mm (closest: 17mm)</td><td>7/16-14 hex head</td></tr>
            <tr><td>3/4"</td><td>0.750"</td><td>19.05 mm (≈ 19mm)</td><td>1/2-13 hex head</td></tr>
            <tr><td>13/16"</td><td>0.8125"</td><td>20.64 mm (closest: 21mm)</td><td>1/2-20 hex head</td></tr>
            <tr><td>7/8"</td><td>0.875"</td><td>22.23 mm (≈ 22mm)</td><td>9/16-12 hex head</td></tr>
            <tr><td>15/16"</td><td>0.9375"</td><td>23.81 mm (closest: 24mm)</td><td>5/8-11 hex head</td></tr>
            <tr><td>1"</td><td>1.000"</td><td>25.40 mm (closest: 25mm)</td><td>5/8-18 hex head</td></tr>
            <tr><td>1-1/16"</td><td>1.0625"</td><td>26.99 mm (≈ 27mm)</td><td>3/4-10 hex head</td></tr>
            <tr><td>1-1/8"</td><td>1.125"</td><td>28.58 mm (closest: 28mm)</td><td>3/4-16 hex head</td></tr>
            <tr><td>1-1/4"</td><td>1.250"</td><td>31.75 mm (closest: 32mm)</td><td>7/8-9 hex head</td></tr>
          </tbody>
        </table>
        </div>
        <p>Pairs marked "≈" are true interchange (within 0.25 mm / 10 thou) — 5/16" ≈ 8mm, 7/16" ≈ 11mm, 5/8" ≈ 16mm, 3/4" ≈ 19mm, 7/8" ≈ 22mm. For the full compatibility analysis, see our <a href="/calculators/wrench-size-converter">Wrench Size Converter</a>.</p>
      `,
    },
    {
      heading: "Engine builder thousandths reference",
      body: `
        <p>These are the decimal values you'll actually measure with a caliper, micrometer, or feeler gauge on an engine. None of them convert cleanly to fractions — this is where you leave the fractional world entirely.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Measurement</th><th>Typical Range (in)</th><th>Metric (mm)</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr><td>Main bearing clearance</td><td>0.0015 – 0.0025"</td><td>0.038 – 0.064 mm</td><td>1.5 to 2.5 thou; higher for high-HP builds</td></tr>
            <tr><td>Rod bearing clearance</td><td>0.0020 – 0.0025"</td><td>0.051 – 0.064 mm</td><td>2 to 2.5 thou standard</td></tr>
            <tr><td>Piston-to-wall clearance (cast)</td><td>0.0010 – 0.0020"</td><td>0.025 – 0.051 mm</td><td>Cast pistons — daily driver</td></tr>
            <tr><td>Piston-to-wall clearance (forged)</td><td>0.0035 – 0.0050"</td><td>0.089 – 0.127 mm</td><td>Forged pistons — performance</td></tr>
            <tr><td>Top ring end gap</td><td>0.017 – 0.024"</td><td>0.43 – 0.61 mm</td><td>NA street; more for boost or nitrous</td></tr>
            <tr><td>Second ring end gap</td><td>0.020 – 0.030"</td><td>0.51 – 0.76 mm</td><td>Slightly wider than top ring</td></tr>
            <tr><td>Oil ring rail gap</td><td>0.015 – 0.055"</td><td>0.38 – 1.40 mm</td><td>Loose spec; not a sealing surface</td></tr>
            <tr><td>Deck clearance</td><td>0.000 – 0.020"</td><td>0.00 – 0.51 mm</td><td>Piston deck-to-block; affects quench + CR</td></tr>
            <tr><td>Quench distance</td><td>0.035 – 0.045"</td><td>0.89 – 1.14 mm</td><td>Piston deck to head at TDC</td></tr>
            <tr><td>Camshaft lift (at valve)</td><td>0.400 – 0.700"</td><td>10.2 – 17.8 mm</td><td>Rocker ratio applied</td></tr>
            <tr><td>Common overbore (SBC 350)</td><td>0.030" ("30 over")</td><td>0.76 mm</td><td>Also common: .040, .060</td></tr>
            <tr><td>Piston-to-valve clearance (min)</td><td>0.080 – 0.100"</td><td>2.03 – 2.54 mm</td><td>Intake; tighter for exhaust (0.100+)</td></tr>
            <tr><td>Crankshaft endplay</td><td>0.004 – 0.010"</td><td>0.10 – 0.25 mm</td><td>Between thrust bearing surfaces</td></tr>
            <tr><td>Head gasket (composition)</td><td>0.041" compressed</td><td>1.04 mm</td><td>Fel-Pro 1003 standard</td></tr>
            <tr><td>Head gasket (MLS)</td><td>0.027 – 0.051"</td><td>0.69 – 1.30 mm</td><td>Cometic MLS common sizes</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>Why engine builders stay in decimal:</strong> nobody says "the piston is one twenty-fifth of an inch below deck." They say "twenty thou down." Bearing clearance in fractions is meaningless — 0.0025" is not a tape-measure number. Precision below 1/128" (7 thou) is decimal territory, always. The fraction ↔ decimal converter above is for bolt heads, wrench sizes, and machining features 1/16" and larger.</p>
      `,
    },
    {
      heading: "Common mistakes",
      body: `
        <ul>
          <li><strong>Rounding too aggressively.</strong> "0.265 rounds to 1/4" is wrong — it's 17/64" (0.266"), just 0.6 thou off. Rounding to 1/4" (0.250") misses by 15 thou. If precision matters, don't round to a bigger denominator than you have to.</li>
          <li><strong>Confusing 1/32" and 1/2 inch on a caliper.</strong> 0.53125 = 17/32", not "half an inch plus a bit." A caliper reading 0.53" is 34/64" ≈ 17/32". Half-inch is exactly 0.500".</li>
          <li><strong>Mixing whole inches and decimals.</strong> 2.695" at 1/16" precision is 2-11/16", not "2.11/16" or "2 and 11 over 16." Always state the whole number, a space, then the fraction.</li>
          <li><strong>Not simplifying.</strong> 8/64" is 1/8"; 32/64" is 1/2". Machinists write in the simplest terms — a spec of "8/64" thickness" is a giveaway that whoever wrote it didn't check the reduction.</li>
          <li><strong>Assuming the fraction is exact.</strong> 17/64" = 0.265625". If your caliper reads 0.265", you're rounding by 0.6 thou. Fine for a bolt hole; not fine for a bearing clearance.</li>
          <li><strong>Using fractions for machining tolerances.</strong> A "±1/32" tolerance is 0.031" — enormous for a machined feature. Real machining tolerances are in thousandths: ±0.005" tight, ±0.001" precision, ±0.0005" ground.</li>
        </ul>
      `,
    },
    {
      heading: "Frequently asked questions",
      body: `
        <p><strong>What is 0.375" as a fraction?</strong><br>
        3/8". Exact. 0.375 × 8 = 3, so it's 3/8ths. Same trick works for 0.125 (1/8), 0.625 (5/8), 0.875 (7/8), etc.</p>
        <p><strong>What is 0.5 inches in fraction form?</strong><br>
        1/2". Exactly half an inch.</p>
        <p><strong>What is 0.25 in as a fraction?</strong><br>
        1/4". Also exact — the caliper reading of 0.250" and the wrench size 1/4" are the same number.</p>
        <p><strong>How do I convert 0.234375 to a fraction?</strong><br>
        15/64". Multiply 0.234375 × 64 = 15, and 15/64 doesn't simplify further (15 = 3×5, 64 = 2⁶, no common factors).</p>
        <p><strong>What's 3/8" in mm?</strong><br>
        9.525 mm. Formula: fraction as decimal × 25.4. 0.375 × 25.4 = 9.525 mm exactly.</p>
        <p><strong>What tap drill do I need for 1/2-13?</strong><br>
        27/64" (0.4219") for 75% thread — the standard. See the tap drill table above or use our <a href="/calculators/tap-drill-lookup">Tap Drill Size Lookup</a>.</p>
        <p><strong>Why does a 1/2" wrench not fit a 13mm bolt?</strong><br>
        Because 1/2" = 12.70 mm — the wrench is 0.30 mm undersize for a 13mm bolt. It'll rock and round the bolt head. The safe swap pairs (within 0.25 mm) are 5/16"↔8mm, 7/16"↔11mm, 5/8"↔16mm, 3/4"↔19mm, 7/8"↔22mm. For the full analysis see our <a href="/calculators/wrench-size-converter">Wrench Size Converter</a>.</p>
        <p><strong>How precise does my measurement need to be?</strong><br>
        Match precision to the task: 1/16" for framing carpentry, 1/32" for cabinetmaking, 1/64" for machine shop work, thousandths (0.001") for engine building. Never claim more precision than your measuring tool actually delivers. A tape measure can't read 1/64"; a dial caliper can't reliably resolve below 0.001".</p>
        <p><strong>What's the smallest fraction on a standard tape measure?</strong><br>
        1/16" on most residential tape measures. Machinist scales and steel rulers go to 1/32", occasionally 1/64". Below that, you need a caliper or micrometer — those read in decimals.</p>
        <p><strong>How do I read 0.578125" on a fractional ruler?</strong><br>
        37/64" — one tick past 9/16" (0.5625") toward 19/32" (0.59375"). If the ruler only marks 1/16", it's between 9/16" and 5/8" — closer to 9/16".</p>
        <p><strong>What's the relationship between inches and millimeters?</strong><br>
        Exactly 1 inch = 25.4 mm (defined by international standard since 1959). To convert: multiply inches by 25.4 for mm, or divide mm by 25.4 for inches.</p>
        <p><strong>Are "thou" and "mil" the same thing?</strong><br>
        Yes — "thou" is short for "thousandth of an inch" (0.001"), and "mil" is the same unit (from Latin <em>mille</em>). One mil = one thou = 0.001". Not to be confused with a millimeter (~40 thou) or a "mile" (a whole different thing).</p>
      `,
    },
  ],
  related: [
    { slug: "mm-inch-converter", title: "MM ↔ Inch Converter" },
    { slug: "tap-drill-lookup", title: "Tap Drill Size Lookup" },
    { slug: "wrench-size-converter", title: "Wrench Size Converter — SAE ↔ Metric" },
    { slug: "thread-pitch-converter", title: "Thread Pitch Converter — TPI ↔ Metric" },
    { slug: "bolt-spec-lookup", title: "Head Bolt & Main Bolt Spec Lookup" },
    { slug: "bearing-clearance", title: "Bearing Clearance Calculator" },
  ],
};
