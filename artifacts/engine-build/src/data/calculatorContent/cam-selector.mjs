export default {
  slug: "cam-selector",
  intro: "\"What cam do I need?\" is the most-asked question in engine building — and the most-botched. The answer isn't a part number, it's a set of specs (duration at 0.050\", lobe separation angle, and lift) that match your displacement, compression, transmission, and goal. Pick the specs above and this tool recommends a cam and shows the powerband it makes, how it idles, and the converter, gear, and compression it needs to actually work. The LSA math follows David Vizard's published method; the duration-to-RPM mapping follows dyno-verified manufacturer data.",
  sections: [
    {
      heading: "The three numbers that define a camshaft",
      body: `
        <p>Every cam recommendation comes down to three specs. Get these right and the part number sorts itself out.</p>
        <ul>
          <li><strong>Duration at 0.050&quot;</strong> — how long the valve is meaningfully open, measured at 0.050&quot; of lifter rise. This is the <em>only</em> cross-comparable duration number (every manufacturer measures it the same way), so it's what you shop by. More duration moves the powerband up in RPM at the cost of low-end torque and idle quality.</li>
          <li><strong>Lobe Separation Angle (LSA)</strong> — the angle in cam degrees between the intake and exhaust lobe peaks. It sets valve overlap, which controls idle quality, vacuum, and how wide the powerband is. Tighter LSA = more overlap = lopier idle + more peak torque; wider LSA = smoother idle + broader band.</li>
          <li><strong>Valve lift</strong> — how far the valve opens. More lift helps only if the cylinder head can flow the extra — past a head's useful lift, you're just stressing the valvetrain. Most OE valvetrains top out around 0.550&quot;.</li>
        </ul>
        <p><strong>Advertised duration</strong> (the bigger number on the cam card) is measured at different checking heights by different makers (COMP at 0.006&quot;, others at 0.004&quot; or 0.007&quot;), so two cams with the same advertised duration can be very different. Only use it to cross-check — always compare the 0.050&quot; number.</p>
      `,
    },
    {
      heading: "Duration @ 0.050\" by application",
      body: `
        <p>These ranges are for an SBC-class V8 (~350ci). Bigger engines can run a bit more duration for the same drivability because they still make idle torque; smaller engines want a little less. The calculator scales the recommendation to your displacement automatically.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Application</th><th>Duration @ .050&quot;</th><th>Powerband</th><th>Idle</th><th>Needs</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Economy / Towing</strong></td><td>195–205°</td><td>idle–4,500</td><td>Stock, smooth</td><td>Nothing — stock supporting parts</td></tr>
            <tr><td><strong>Daily Driver / RV</strong></td><td>205–215°</td><td>idle–5,000</td><td>Smooth, strong vacuum</td><td>Stock converter OK</td></tr>
            <tr><td><strong>Mild Street</strong></td><td>214–222°</td><td>1,500–5,500</td><td>Slight lope</td><td>~2,000 stall helps (auto)</td></tr>
            <tr><td><strong>Street Performance</strong></td><td>222–232°</td><td>2,200–5,800</td><td>Noticeable lope</td><td>2,500 stall, 3.42+ gear, 10:1+</td></tr>
            <tr><td><strong>Street / Strip</strong></td><td>232–244°</td><td>2,800–6,200</td><td>Choppy</td><td>3,000+ stall, 3.73+ gear, 10.5:1+</td></tr>
            <tr><td><strong>Drag / Race</strong></td><td>244–260°</td><td>3,500–6,800</td><td>Rough race</td><td>4,000+ stall, 4.10+ gear, 11:1+</td></tr>
            <tr><td><strong>Pro / Comp</strong></td><td>260°+</td><td>4,500–8,000+</td><td>Won't idle politely</td><td>Full race valvetrain + fuel</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>Rule of thumb:</strong> every +10° of duration at 0.050&quot; moves the powerband up roughly 500 RPM (about 50 RPM per degree). Dyno testing of COMP's XR-HR hydraulic rollers on a 460 big-block confirmed the shape — going from 224° to 236° at 0.050&quot; pushed the HP peak from 5,500 to 5,800 RPM (<a href="https://www.streetmusclemag.com/tech-stories/the-duration-game/" target="_blank" rel="noopener nofollow">Street Muscle, "The Duration Game"</a>).</p>
      `,
    },
    {
      heading: "How LSA is chosen — Vizard's method",
      body: `
        <p>Lobe separation angle isn't guesswork. David Vizard's widely-used method sets the ideal LSA from <strong>cylinder displacement divided by intake valve diameter</strong> — valve size stands in for how well the head flows. His "128 rule" for parallel-valve V8s:</p>
        <p style="font-family: monospace; padding-left: 1em;">LSA = 128 − ( (CID ÷ cylinders ÷ intake-valve-diameter) × 0.91 )</p>
        <p>The base constant changes by head architecture: <strong>128</strong> for SBC / LS / parallel-valve, <strong>127</strong> for Ford Windsor, <strong>131–132</strong> for BBC / canted-valve / Cleveland (<a href="https://www.speed-talk.com/forum/viewtopic.php?t=45639" target="_blank" rel="noopener nofollow">Speed-Talk cam theory thread</a>). Then Vizard adds <strong>+0.75° of LSA for every point of compression over 10.5:1</strong> (and correspondingly less below), because the base formula assumes about a 10.5:1 engine.</p>
        <p><strong>Worked example — 350 SBC, 2.02&quot; intake valve, 10.0:1:</strong></p>
        <ul>
          <li>350 ÷ 8 ÷ 2.02 = 21.66 cubes per inch of valve</li>
          <li>128 − (21.66 × 0.91) = 128 − 19.71 = 108.3° base LSA</li>
          <li>Compression is under 10.5, so essentially no adjustment → ~108° LSA</li>
        </ul>
        <p>A 383 with the same heads works out to ~106° (more cubes per inch of valve = tighter LSA). These match the values our <a href="/calculators/cam-duration">Advanced Cam Calculator</a> produces. Vizard's own caveat: the real relationship is a gentle curve, not a perfectly straight line, so treat the output as a strong starting point, not gospel.</p>
      `,
    },
    {
      heading: "What LSA does to idle, vacuum, and powerband",
      body: `
        <p>LSA controls overlap — the moment when both valves are open near TDC. More overlap (tighter LSA) is what makes a cam sound lopey, and it costs idle vacuum. A CarTech dyno test of five cams (identical except LSA) on one engine measured idle vacuum at 1,000 RPM:</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>LSA</th><th>Idle vacuum</th><th>Idle character</th><th>Effect on power</th></tr>
          </thead>
          <tbody>
            <tr><td>106°</td><td>10.2 inHg</td><td>Rough / lopey</td><td>Peak torque lowest RPM, most peak torque, narrow band</td></tr>
            <tr><td>108°</td><td>11.9 inHg</td><td>Choppy</td><td>Highest peak torque in test (435 lb-ft)</td></tr>
            <tr><td>110°</td><td>13.1 inHg</td><td>Moderate lope</td><td>Balanced</td></tr>
            <tr><td>112°</td><td>14.5 inHg</td><td>Smooth</td><td>Broader band, torque peak higher RPM</td></tr>
            <tr><td>114°</td><td>14.9 inHg</td><td>Smoothest</td><td>Broadest, flattest curve, best drivability</td></tr>
          </tbody>
        </table>
        </div>
        <p>Source: <a href="https://www.cartechbooks.com/blogs/techtips/camshafts1" target="_blank" rel="noopener nofollow">CarTech, "Camshafts Demystified"</a>. Peak HP RPM barely moved (6,200–6,400) across all five — <strong>LSA moves the torque peak and idle, not the HP peak.</strong> A power-brake car generally wants ≥ ~14 inHg at idle, which lines up with 112°+ LSA. Values scale with the engine, so treat the numbers as a representative shape (about +1 inHg per +2° LSA in the street range), not universal constants.</p>
      `,
    },
    {
      heading: "Vizard's overlap targets by use",
      body: `
        <p>Vizard actually treats <em>overlap</em> — not duration or LSA directly — as the primary design variable. You pick a target overlap for your application, then duration and LSA are chosen to hit it. His published overlap chart (seat-to-seat, in degrees):</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Overlap</th><th>Application</th></tr>
          </thead>
          <tbody>
            <tr><td>10–40°</td><td>Towing / maximum low-end torque</td></tr>
            <tr><td>30–60°</td><td>Ordinary street</td></tr>
            <tr><td>50–75°</td><td>Street performance</td></tr>
            <tr><td>70–90°</td><td>Street / strip</td></tr>
            <tr><td>85–100°</td><td>Race</td></tr>
            <tr><td>95–115°</td><td>Pro race</td></tr>
          </tbody>
        </table>
        </div>
        <p>The relationship: <strong>Overlap = (intake duration + exhaust duration) ÷ 2 − (2 × LSA)</strong> using advertised (seat) durations. Overlap increases about 2° for every 1° you tighten the LSA. Multiple sources corroborate this chart (<a href="https://www.enginebuildermag.com/2016/02/theres-no-simple-formula-to-choosing-the-perfect-camshaft/" target="_blank" rel="noopener nofollow">Engine Builder</a>, Speed-Talk, JEGS).</p>
      `,
    },
    {
      heading: "Intake valve closing — the master variable",
      body: `
        <p>Of all four valve events, the <strong>intake valve closing (IVC) point</strong> matters most, because it defines how much charge is actually trapped and compressed — it sets the dynamic compression ratio and therefore the low-end torque and detonation behavior.</p>
        <ul>
          <li><strong>Early IVC (~30–50° ABDC):</strong> high dynamic compression, strong low-to-mid torque, broad powerband, higher cranking pressure. This is where street and towing cams live.</li>
          <li><strong>Late IVC (~65–80° ABDC):</strong> bleeds cylinder pressure back into the intake at low RPM (killing low-end torque and dropping dynamic compression) but lets the engine keep filling at high RPM. Race territory.</li>
          <li><strong>Past ~75° ABDC:</strong> most of the engine's low-speed torque is gone (<a href="https://www.enginebuildermag.com/2016/04/valve-timing-events-and-the-order-of-importance/" target="_blank" rel="noopener nofollow">Engine Builder, "Valve Timing Events and the Order of Importance"</a>).</li>
        </ul>
        <p>This is why a big cam feels lazy in a low-compression engine: the late intake close drops dynamic compression, and there's not enough static compression to make up for it. The fix is more static compression — which is why the calculator flags a compression bump when you pick a big cam for a low-compression engine. Target dynamic compression around 7.5–8.0:1 and cranking pressure of roughly 165–190 psi for pump gas; over ~200 psi trends toward needing race fuel (<a href="https://www.chevydiy.com/chevy-small-block-engine-guide-cams-and-valvetrains/" target="_blank" rel="noopener nofollow">Vizard via ChevyDIY</a>). Check yours with our <a href="/calculators/compression-ratio">dynamic compression calculator</a>.</p>
      `,
    },
    {
      heading: "The #1 cam-selection mistake: buying too much cam",
      body: `
        <p>The single most common error is choosing a cam bigger than the rest of the combination can support. A cam only works inside its powerband — if the converter, gears, and compression don't put the engine into that band, the car is <em>slower</em> than it would be with a smaller cam.</p>
        <p><strong>The whole combo has to agree:</strong></p>
        <ul>
          <li><strong>Converter stall (automatics):</strong> the stall speed should put the engine into the cam's powerband off the line. A cam that comes alive at 3,000 RPM behind a stock 1,800-RPM converter feels flat and bogs. Rule: stall near where the cam "comes on."</li>
          <li><strong>Rear gear:</strong> more cam wants more gear to keep the engine spinning in its band. Street cams like 3.42–3.73; strip cams want 3.73–4.10+.</li>
          <li><strong>Compression:</strong> a bigger cam bleeds cylinder pressure — raise static compression to compensate, or the engine feels soft and lazy down low.</li>
          <li><strong>Cylinder heads:</strong> lift past the head's useful flow does nothing. A big cam on stock heads is wasted; matched heads/cam/intake (an "HCI" package) is how you actually make power.</li>
          <li><strong>Valve springs:</strong> every performance cam needs springs matched to its lift and RPM. Stock springs float at high RPM and can drop a valve.</li>
        </ul>
        <p>The calculator flags these based on your inputs. The lesson from decades of dyno testing: a right-sized cam in a matched combo beats a big cam in a mismatched one, every time.</p>
      `,
    },
    {
      heading: "Boost and nitrous change the rules",
      body: `
        <p>Forced induction and nitrous want <strong>wider LSA than an equivalent naturally-aspirated cam</strong>, because the power adder does the cylinder-filling work — you need less overlap, and wide LSA reduces reversion against boost backpressure.</p>
        <ul>
          <li><strong>Supercharged / Turbocharged:</strong> add roughly 4° of LSA vs the NA number. Turbos especially benefit from earlier exhaust closing to cut reversion from exhaust backpressure during overlap (<a href="https://www.onallcylinders.com/2025/12/21/overlapping-boost-a-supercharged-camshaft-test/" target="_blank" rel="noopener nofollow">OnAllCylinders supercharged cam test</a>).</li>
          <li><strong>Nitrous:</strong> add about 2° of LSA and often more exhaust duration. Too much overlap sends nitrous straight out the tailpipe unburned (<a href="https://www.lsxmag.com/tech-stories/engine/nitrous-cam-101-dyno-testing-four-comp-cams/" target="_blank" rel="noopener nofollow">LSXMag nitrous cam test</a>).</li>
        </ul>
        <p>The calculator applies these LSA adjustments automatically when you set the aspiration.</p>
      `,
    },
    {
      heading: "Frequently asked questions",
      body: `
        <p><strong>What cam do I need for a stock 350?</strong><br>
        For a stock or mildly-modified 350 you want a mild-street grind: roughly 218–224° duration at 0.050&quot;, around 110–112° LSA, and 0.500&quot;-ish lift. This keeps a slight lope, works with a stock or low-stall converter, and doesn't require compression or head changes. A classic example is a 224°/230° hydraulic roller on a 110–112° LSA.</p>
        <p><strong>How do I choose duration at 0.050&quot;?</strong><br>
        Match it to your target RPM band. Street engines live in the 214–232° range; street/strip in the 232–244° range; race above that. Every +10° moves the whole powerband up about 500 RPM. Pick the duration whose powerband centers on where you actually drive or race.</p>
        <p><strong>What does LSA (lobe separation angle) do?</strong><br>
        It sets valve overlap, which controls idle character and powerband width. Tighter LSA (106–110°) = lopier idle, more peak torque, narrower band. Wider LSA (112–116°) = smoother idle, more vacuum, broader band. It moves the torque peak and idle, but barely affects where peak horsepower lands.</p>
        <p><strong>Should I run a tight or wide LSA?</strong><br>
        Tight (108–110°) for a track-focused or torque-monster build that doesn't need a smooth idle or power brakes. Wide (112–114°) for a street car that needs vacuum, a smooth-ish idle, and a broad, forgiving powerband — and always wider for boost or nitrous.</p>
        <p><strong>Does a bigger cam need more compression?</strong><br>
        Yes. A longer-duration cam closes the intake valve later, which bleeds off cylinder pressure at low RPM and drops dynamic compression. Raising static compression restores the lost cylinder pressure and keeps the engine responsive. As a rule, step compression up as you step cam duration up — a 236° street/strip cam wants 10.5:1+, not 9:1.</p>
        <p><strong>What converter stall do I need for my cam?</strong><br>
        The stall speed should put the engine into the cam's powerband off the line — roughly where the cam "comes alive." A mild-street 220° cam is happy with ~2,000–2,400 RPM; a 236° street/strip cam wants 3,000+ RPM. Too tight and the car bogs; the calculator estimates the range for your cam.</p>
        <p><strong>How much lift is too much?</strong><br>
        Lift past the cylinder head's useful flow range does nothing but stress the valvetrain. Most OE valvetrains (springs, retainers, guides) top out around 0.550&quot; lift. Above that you need upgraded springs and a piston-to-valve clearance check. More lift only helps if the head can flow the extra air.</p>
        <p><strong>Hydraulic roller, solid roller, or flat tappet?</strong><br>
        Hydraulic roller is the modern default: no lash adjustment, good RPM capability, less wear than flat tappet, and works on the street. Flat tappet is cheaper but needs careful break-in and is being phased out. Solid roller is for serious race engines that spin past ~6,500 RPM and don't mind periodic lash checks.</p>
        <p><strong>What's the difference between advertised duration and duration at 0.050&quot;?</strong><br>
        Advertised duration is measured at a small checking height (often 0.006&quot;), so it captures the slow opening ramps; duration at 0.050&quot; is measured after the valve is meaningfully open. The gap is typically 45–55°, but because each manufacturer advertises at a different height, advertised numbers aren't cross-comparable. Always shop by the 0.050&quot; number.</p>
        <p><strong>Will this cam idle rough?</strong><br>
        It depends on overlap, which the calculator estimates. Under ~35° overlap is a smooth idle; 50–65° is a noticeable healthy lope; 80°+ is a rough race idle that needs a high idle speed and won't pull much vacuum. The idle-vacuum estimate tells you whether power brakes will still work.</p>
      `,
    },
  ],
  related: [
    { slug: "cam-duration", title: "Advanced Cam Calculator (valve events + DCR)" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
    { slug: "piston-to-valve", title: "Piston-to-Valve Clearance Calculator" },
    { slug: "valve-spring", title: "Valve Spring Calculator" },
    { slug: "valvetrain-builder", title: "Valvetrain RPM Builder" },
    { slug: "torque-converter-stall", title: "Torque Converter Stall Speed Calculator" },
  ],
};
