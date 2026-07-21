export default {
  slug: "compression-ratio",
  intro: "Compression ratio is the ratio of total cylinder volume at bottom dead center to the remaining clearance volume at top dead center. Static compression ratio (SCR) is calculated from fixed dimensions — bore, stroke, chamber cc, gasket, piston dome/dish, and deck. But it's dynamic compression ratio (DCR) that actually determines whether your engine will detonate on a given octane, because DCR accounts for how late the intake valve closes and how much charge escapes back out before the cylinder truly seals.",
  sections: [
    {
      heading: "The compression ratio formula",
      body: `
        <p><strong>SCR = (Vd + Vc) / Vc</strong></p>
        <p>where <strong>Vd</strong> = displacement volume of one cylinder, and <strong>Vc</strong> = clearance volume at TDC (the total space left above the piston).</p>
        <p>Clearance volume = combustion chamber cc + head gasket cc + deck clearance cc + piston dish cc (add) OR − piston dome cc (subtract).</p>
        <p><strong>Worked example — SBC 350 with 64cc heads and flat-top pistons:</strong></p>
        <ul>
          <li>Displacement/cyl: 4.000² × 3.480 × 0.7854 = 43.71 ci = 716.4 cc</li>
          <li>Chamber: 64.0 cc</li>
          <li>Head gasket (4.100" bore × 0.041" thick): 8.9 cc</li>
          <li>Deck clearance (piston 0.010" down at TDC): 2.2 cc</li>
          <li>Piston dish/dome: 0 cc (flat-top)</li>
          <li>Total clearance volume: 64.0 + 8.9 + 2.2 + 0 = 75.1 cc</li>
          <li>SCR = (716.4 + 75.1) / 75.1 = <strong>10.54:1</strong></li>
        </ul>
      `,
    },
    {
      heading: "Octane requirement by dynamic CR",
      body: `
        <p>DCR — not static — determines what octane your engine actually needs. A cam with late intake valve closing (IVC past 60° ABDC) can drop a 10.5:1 static CR down to ~8.0:1 dynamic, which is why big-cam builds run pump gas at compression ratios that would knock badly with a stock cam.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Dynamic CR</th><th>Fuel</th><th>Head Type</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr><td>&lt; 7.0:1</td><td>87 (Regular)</td><td>Any</td><td>Sluggish; poor throttle response, low vacuum</td></tr>
            <tr><td>7.0 – 7.7:1</td><td>87 (Regular)</td><td>Iron or Aluminum</td><td>Sweet spot for daily-driver / towing</td></tr>
            <tr><td>7.8 – 8.2:1</td><td>89 (Midgrade)</td><td>Aluminum preferred</td><td>Street performance; safe with good ignition/cooling</td></tr>
            <tr><td>8.3 – 8.6:1</td><td>91 (Premium)</td><td>Aluminum preferred</td><td>Aggressive street; iron heads require conservative timing</td></tr>
            <tr><td>8.7 – 9.0:1</td><td>93 (Premium)</td><td>Aluminum only</td><td>Borderline pump-gas ceiling; needs tuning</td></tr>
            <tr><td>9.0 – 9.5:1</td><td>93 + Race blend</td><td>Aluminum only</td><td>Race gas required for hot days / heavy loads</td></tr>
            <tr><td>9.5 – 10.5:1</td><td>100+ Race gas or E85</td><td>Aluminum, race-spec</td><td>Dedicated race engine territory</td></tr>
            <tr><td>10.5:1+</td><td>Methanol / E85 / 110+ AvGas</td><td>Race-spec only</td><td>Pro-level builds; not street-friendly</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>Aluminum head correction:</strong> Aluminum dissipates heat 3–4× faster than cast iron, tolerating roughly <strong>0.5 to 1.0 point higher DCR</strong> before detonation on the same fuel. A 8.5:1 DCR that knocks with iron heads may run clean with aluminum.</p>
      `,
    },
    {
      heading: "Common engine stock compression ratios",
      body: `
        <p>Factory static compression ratios for popular performance engines. Real-world builds often differ from these numbers because head gasket thickness, deck height, and piston selection vary between rebuilds.</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Engine</th><th>Stock SCR</th><th>Chamber (cc)</th><th>Piston Type</th><th>Compatible Fuel</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>SBC 350 (LT-1, '70)</strong></td><td>11.0:1</td><td>76</td><td>Domed</td><td>Premium (leaded era)</td></tr>
            <tr><td><strong>SBC 350 (L98)</strong></td><td>9.0:1</td><td>58 (aluminum)</td><td>Dished</td><td>91</td></tr>
            <tr><td><strong>SBC 350 crate GM 350</strong></td><td>8.5:1</td><td>76 (Vortec)</td><td>Flat</td><td>87 (regular)</td></tr>
            <tr><td><strong>SBC 350 HO 350 (crate)</strong></td><td>9.1:1</td><td>76 (Vortec)</td><td>Flat</td><td>87–89</td></tr>
            <tr><td><strong>LS1 5.7L</strong></td><td>10.1:1</td><td>66.7</td><td>Flat</td><td>91</td></tr>
            <tr><td><strong>LS2 6.0L</strong></td><td>10.9:1</td><td>65</td><td>Flat</td><td>91</td></tr>
            <tr><td><strong>LS3 6.2L</strong></td><td>10.7:1</td><td>68</td><td>Flat w/ valve reliefs</td><td>91–93</td></tr>
            <tr><td><strong>LS7 7.0L</strong></td><td>11.0:1</td><td>70</td><td>Flat w/ valve reliefs</td><td>93</td></tr>
            <tr><td><strong>LSA 6.2L (supercharged)</strong></td><td>9.1:1</td><td>68</td><td>Dished</td><td>91 + boost</td></tr>
            <tr><td><strong>LT4 6.2L (supercharged)</strong></td><td>10.0:1</td><td>65</td><td>Dished</td><td>93 + boost</td></tr>
            <tr><td><strong>Ford 302 HO ('87–'95)</strong></td><td>9.0:1</td><td>63</td><td>Dished</td><td>87</td></tr>
            <tr><td><strong>Ford 351W</strong></td><td>8.5–9.0:1</td><td>64</td><td>Flat</td><td>87</td></tr>
            <tr><td><strong>Coyote 5.0L (Gen 3)</strong></td><td>12.0:1</td><td>52</td><td>Dished</td><td>91–93</td></tr>
            <tr><td><strong>BBC 454 (LS6, '70)</strong></td><td>11.25:1</td><td>112</td><td>Domed</td><td>Premium (leaded era)</td></tr>
            <tr><td><strong>BBC 454 (marine/truck)</strong></td><td>8.5:1</td><td>119 (oval)</td><td>Dished</td><td>87</td></tr>
            <tr><td><strong>Mopar 340 (Six-Pack)</strong></td><td>10.5:1</td><td>66</td><td>Domed</td><td>Premium (leaded era)</td></tr>
            <tr><td><strong>Chrysler Hemi 5.7L (Gen 3)</strong></td><td>10.5:1</td><td>60</td><td>Flat</td><td>89–91</td></tr>
            <tr><td><strong>Chrysler Hemi 6.4L</strong></td><td>10.9:1</td><td>65</td><td>Dished</td><td>91</td></tr>
            <tr><td><strong>Honda K20A2</strong></td><td>11.0:1</td><td>50</td><td>Flat</td><td>91–93</td></tr>
            <tr><td><strong>Honda K24A2</strong></td><td>10.5:1</td><td>56</td><td>Dished</td><td>91</td></tr>
            <tr><td><strong>Toyota 2JZ-GTE (turbo)</strong></td><td>8.5:1</td><td>62</td><td>Dished</td><td>93 + boost</td></tr>
            <tr><td><strong>Cummins 5.9L 24V</strong></td><td>17.2:1</td><td>Direct-injection diesel</td><td>Bowl-in-piston</td><td>Diesel</td></tr>
          </tbody>
        </table>
        </div>
      `,
    },
    {
      heading: "How each component moves the number",
      body: `
        <p>Compression ratio is the sum of five volumes. Change any one and CR moves. Here's how much each affects a typical SBC 350 (rough magnitudes — actual delta depends on engine size):</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Change</th><th>Approx. CR Delta</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr><td>−10 cc chamber (76cc → 66cc heads)</td><td>+1.3 CR points</td><td>The single biggest lever — head swap is the fastest way to change CR</td></tr>
            <tr><td>+10 cc dish (flat → dished piston)</td><td>−1.0 CR points</td><td>Common way to drop static CR for boost/nitrous</td></tr>
            <tr><td>−10 cc dome (flat → domed piston)</td><td>+1.0 CR points</td><td>Racing pistons; watch valve clearance</td></tr>
            <tr><td>+0.010" gasket thickness</td><td>−0.15 CR points</td><td>0.028" vs 0.041" MLS gasket changes CR by ~0.2 pts</td></tr>
            <tr><td>+0.010" deck clearance (piston deeper)</td><td>−0.15 CR points</td><td>Also affects quench distance — 0.035–0.045" quench is ideal</td></tr>
            <tr><td>+0.030" overbore</td><td>+0.05 CR points</td><td>Very small effect — overbore mainly changes displacement, not CR</td></tr>
            <tr><td>+0.250" stroke (383 kit)</td><td>+0.30 CR points</td><td>Longer stroke = more swept volume compressed into same chamber</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>The takeaway:</strong> chamber volume dominates. If you need to move CR by more than 0.5 points, changing heads is almost always the answer. If you need fine adjustment (0.1–0.3 points), swap head gasket thickness or piston dish depth.</p>
      `,
    },
    {
      heading: "Head gasket thickness effect",
      body: `
        <p>Head gasket compressed thickness directly affects clearance volume. Popular gasket thicknesses and their CR impact on a typical 4.030" bore SBC:</p>
        <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Gasket</th><th>Compressed Thickness</th><th>Bore</th><th>Volume (cc)</th><th>Best Use</th></tr>
          </thead>
          <tbody>
            <tr><td>Fel-Pro 1003 (composition)</td><td>0.041"</td><td>4.166"</td><td>9.1 cc</td><td>Stock rebuilds, cast-iron heads</td></tr>
            <tr><td>Cometic MLS 0.030"</td><td>0.030"</td><td>4.100"</td><td>6.5 cc</td><td>Aluminum heads, tight quench</td></tr>
            <tr><td>Cometic MLS 0.040"</td><td>0.040"</td><td>4.100"</td><td>8.7 cc</td><td>Std replacement, aluminum heads</td></tr>
            <tr><td>Cometic MLS 0.051"</td><td>0.051"</td><td>4.100"</td><td>11.1 cc</td><td>Boosted / high-cylinder-pressure</td></tr>
            <tr><td>Cometic MLS 0.060"</td><td>0.060"</td><td>4.100"</td><td>13.0 cc</td><td>Race, decompressor for nitrous</td></tr>
          </tbody>
        </table>
        </div>
        <p><strong>Quench matters too:</strong> compressed head gasket + deck clearance = quench distance. Ideal quench for a street SBC is 0.035–0.045". Under 0.030" risks piston-to-head contact under thermal expansion; over 0.055" loses the combustion turbulence benefit that helps prevent detonation. Use our <a href="/calculators/quench-deck-height">Quench & Deck Height calculator</a> to dial this in.</p>
      `,
    },
    {
      heading: "Camshaft (IVC) effect on dynamic CR",
      body: `
        <p>Late intake valve closing (IVC) delays cylinder sealing on the compression stroke, bleeding pressure back into the intake and dropping effective compression. A 10.5:1 static CR engine with a mild street cam (IVC 42° ABDC) has ~8.5:1 DCR. Bolt in a bigger cam (IVC 65° ABDC) and the same engine drops to ~7.8:1 DCR — quiet on pump gas.</p>
        <p><strong>Typical IVC ranges:</strong></p>
        <ul>
          <li>Stock/RV cam: 30–45° ABDC — 90–92% of static CR</li>
          <li>Street/performance cam: 45–60° ABDC — 80–90% of static CR</li>
          <li>Race cam: 60–75° ABDC — 70–80% of static CR</li>
          <li>Pro Stock / long-duration race: 75°+ ABDC — under 70% of static CR</li>
        </ul>
        <p>This is why builders happily run 11:1 static CR on 93 octane with a hot cam — the effective dynamic compression is well within pump-gas territory. Use our <a href="/calculators/compression-ratio">dynamic CR calculator</a> (this page's calculator has IVC input) to plug in your cam's real IVC number and see the actual DCR.</p>
      `,
    },
    {
      heading: "Boost and altitude adjustments",
      body: `
        <p><strong>Boost:</strong> effective CR under boost = static CR × ((manifold pressure + atmospheric) / atmospheric). A 9.0:1 engine at 10 PSI boost has an <em>effective</em> CR of 9.0 × ((14.7 + 10) / 14.7) = ~15.1:1. This is why boosted engines run lower static CR (typically 8.0–9.5:1) — the boost multiplies cylinder pressure. Use our <a href="/calculators/boost-compression">Boost / Effective CR Calculator</a> for turbo/supercharger builds.</p>
        <p><strong>Altitude:</strong> higher elevation means lower atmospheric pressure and thinner intake charge, which reduces effective cylinder pressure. At 5,000 ft elevation (~12.2 PSI atmospheric vs 14.7 at sea level) an engine's <em>effective</em> compression drops by about 17% — a 10.5:1 CR at sea level acts like ~8.7:1 at 5,000 ft. Denver builds can run higher static CR than the same engine in Miami.</p>
      `,
    },
    {
      heading: "Frequently asked questions",
      body: `
        <p><strong>Can 12:1 static compression run on pump gas?</strong><br>
        Yes, with a large-duration cam. A cam with IVC 70°+ ABDC drops dynamic CR to ~8.0:1, which is safe on 93 octane with aluminum heads and good tuning. Iron heads on the same combo would knock — the +1 point aluminum head advantage matters here.</p>
        <p><strong>Do aluminum heads really let me run higher compression?</strong><br>
        Yes — roughly 0.5 to 1.0 CR points higher on the same fuel. Aluminum dissipates heat 3–4× faster than cast iron, so the piston crown and chamber stay cooler under load. Cooler surfaces = fewer hot spots = less detonation.</p>
        <p><strong>What's the ideal dynamic CR for pump gas?</strong><br>
        7.5–8.5:1 DCR is the safe range for street builds on 91–93 octane. Below 7.5:1 the engine feels lazy and torque suffers; above 8.5:1 you're on the edge of knock, especially in hot weather or with iron heads.</p>
        <p><strong>How much does 0.010" of gasket thickness change CR?</strong><br>
        On a 4.030" bore V8, about 0.15 CR points. Fine adjustment tool — swap a 0.041" gasket for a 0.030" and you'll gain roughly 0.2 CR points.</p>
        <p><strong>Does deck clearance matter beyond CR?</strong><br>
        Yes — deck clearance combined with head gasket thickness = <em>quench distance</em>. Ideal quench is 0.035–0.045". Too tight risks piston-to-head contact when the engine gets hot; too loose loses the turbulence benefit that fights detonation. A tight-quench 10.5:1 engine can be quieter on pump gas than a loose-quench 9.5:1 engine.</p>
        <p><strong>How is dynamic CR different from cranking pressure?</strong><br>
        DCR is a geometric ratio; cranking pressure is measured with a compression gauge and includes ring seal, cam timing, and starter RPM effects. Approximate cranking pressure ≈ DCR × 14.7 PSI × 1.2 (thermal factor). A 8.0:1 DCR reads roughly 141 PSI on a compression tester.</p>
        <p><strong>What CR do I need for boost?</strong><br>
        Rule of thumb: <strong>drop static CR by 0.5–1.0 points per 5 PSI of planned boost.</strong> A 9.0:1 engine handles 5–7 PSI safely on pump gas; for 15+ PSI, drop to 8.0–8.5:1 static. Our <a href="/calculators/boost-compression">boost compression calculator</a> does this math for you.</p>
        <p><strong>Does chamber CC vary between the same head part number?</strong><br>
        Yes — casting tolerances are typically ±1 cc, but valve job depth can move it ±3 cc. Always CC-check your actual heads with a burette + plexiglass plate rather than trusting the advertised number, especially on used or re-worked heads.</p>
        <p><strong>Should I calculate CR before or after machine work?</strong><br>
        Both. Calculate <em>target</em> CR before you buy parts to make sure the combination will land where you want. Then re-verify with actual measurements after machine work — decked block, milled heads, or valve job all shift the numbers.</p>
      `,
    },
  ],
  related: [
    { slug: "dynamic-compression-ratio-v2", title: "Dynamic Compression Ratio Calculator" },
    { slug: "quench-deck-height", title: "Quench & Deck Height Calculator" },
    { slug: "boost-compression", title: "Boost / Effective CR Calculator" },
    { slug: "displacement", title: "Engine Displacement Calculator" },
    { slug: "octane-mix", title: "Octane Blending Calculator" },
    { slug: "cam-duration", title: "Cam Duration & IVC Calculator" },
  ],
};
