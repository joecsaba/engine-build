// Single FAQ data file. Each entry becomes both a visible accordion item
// AND a Question/Answer pair in the FAQPage JSON-LD schema. Keep answers
// concise (~50–100 words) for Google's "people also ask" box format.

export default [
  {
    question: "What's the difference between static and dynamic compression ratio?",
    answer: `<strong>Static CR</strong> is geometry — bore, stroke, chamber volume, gasket, piston dish. <strong>Dynamic CR</strong> accounts for when the intake valve actually closes (which determines how much charge gets compressed). The intake valve stays open past BDC on every cam, so some mixture escapes before compression starts. Dynamic CR is what predicts detonation — not static. A 10:1 static engine with a big cam can have 7.5:1 dynamic and run safely on 87 octane.`,
  },
  {
    question: "What ring gap do I need for a turbocharged engine?",
    answer: `For most turbo gas builds, target <strong>0.006" of gap per inch of bore</strong> on the top ring. A 4.030" bore wants ~0.024". Naturally aspirated is tighter (0.004"/inch); nitrous is wider (0.007"/inch); diesel is different entirely. Always file-fit each ring to the actual measured bore — don't trust the spec on the box.`,
  },
  {
    question: "What turbo size do I need for [X] horsepower on a Cummins?",
    answer: `Rough single-turbo sizing on a 5.9L: <strong>62–64mm</strong> compressor for 400–500 HP, <strong>64–66mm</strong> for 500–650, <strong>68–72mm</strong> for 650–800, <strong>72–76mm</strong> for 800–1000. Above 1000 HP you're usually in compound territory. These shift with fueling and altitude — the <a href="/calculators/diesel-single-turbo">single turbo calculator</a> walks through the math.`,
  },
  {
    question: "How do I know if my cylinder heads can support more horsepower?",
    answer: `Flow capacity is the ceiling. The SuperFlow formula is <strong>HP = Peak CFM × 0.257 × Cylinders</strong>. Stock Vortec SBC heads flow ~218 CFM, capping a 350 at roughly 450 HP. Aftermarket AFR 195 heads flow ~270 CFM (550 HP). If you're trying to make more power than your heads can flow, no cam or intake will fix it — port the heads or buy bigger ones.`,
  },
  {
    question: "What's the difference between hypereutectic and forged pistons?",
    answer: `<strong>Hypereutectic</strong> is cast aluminum with 16–19% silicon. Tighter piston-to-wall clearance (0.0008–0.0015"), quieter cold start, cheaper. Fails by <em>shattering</em> under detonation — dangerous. <strong>Forged</strong> comes in two alloys: 4032 (lower expansion, tighter fit, street-friendly) and 2618 (higher expansion, looser fit, but ductile — deforms instead of shattering when pushed past its limit). 2618 is the standard for boost, nitrous, and racing.`,
  },
  {
    question: "Does my Cummins really need a lift pump?",
    answer: `If you have a <strong>VP44 truck (1998.5–2002)</strong>: yes, absolutely. The OEM in-tank pump is the #1 cause of $1,500 VP44 failures. Replace it with a FASS or AirDog before it bites you. <strong>CP4 trucks (2011+)</strong>: a lift pump dramatically reduces catastrophic CP4 failures (which scrap the entire fuel system, $10K+ repair). <strong>CP3 trucks (2003+)</strong>: lift pump is preventive maintenance — extends injector and pump life.`,
  },
  {
    question: "What's the safest sustained EGT on a diesel?",
    answer: `<strong>Pre-turbo</strong> (sensor in the manifold before the turbine): keep sustained EGTs <strong>under 1250°F</strong>. Brief peaks under 1400°F are acceptable. <strong>Post-turbo</strong> (in the downpipe): the same temperatures read 200–300°F lower, so the safe sustained limit is around <strong>1000°F</strong>. If your sensor location is unclear, assume post-turbo and add 200°F mentally.`,
  },
  {
    question: "How tight should main and rod bearing clearances be?",
    answer: `Rule of thumb: <strong>0.001" per inch of journal diameter</strong>. A 2.100" journal wants ~0.0021" clearance. Iron blocks run 0.0020–0.0025"; aluminum blocks need tighter cold clearances (0.0015–0.0020") because the housing bore grows more as it heats. Always measure with Plastigage or a bore gauge; never assume the bearing matches the published size.`,
  },
  {
    question: "Do I need ARP head studs?",
    answer: `If you're running stock boost on a stock-rebuilt engine: probably not. If any of these apply, yes: <strong>boost above stock</strong>, multiple gasket changes expected, aluminum block + iron heads, high RPM, or you plan to pull the heads more than once. TTY (torque-to-yield) bolts can't be reused. ARP studs maintain clamp load better through heat cycles and can be removed/reinstalled indefinitely.`,
  },
  {
    question: "What carburetor CFM do I need for my engine?",
    answer: `<strong>CFM = (CID × RPM × VE) ÷ 3456</strong>. A 350 SBC at 5500 RPM with 85% VE needs ~475 CFM. But you should size to <strong>90–95% of the calculated number</strong> for a street engine — an oversized carb kills signal strength and throttle response. Holley's own advice: bigger isn't better. A 600 CFM works perfectly on a mild 350; the 850 CFM you don't need will stumble off idle.`,
  },
  {
    question: "What size injectors do I need on E85?",
    answer: `E85 has stoichiometric AFR around 9.8:1 vs gasoline's 14.7:1 — you need <strong>~30% more fuel by volume</strong> for the same Lambda. If your build needs 42 lb/hr injectors on gas, plan for ~55 lb/hr on E85. Many builders size for E85 from the start since running gas just means lower duty cycles. Undersized injectors on E85 max out at 100% duty cycle and go lean under load — that destroys pistons in seconds.`,
  },
  {
    question: "What pushrod length do I need after milling my heads?",
    answer: `Milling lowers the rocker pivot, so the pushrod has to be <strong>shorter</strong> to keep correct rocker geometry. Rough rule: pushrod length decreases by approximately the amount you milled (1:1). But always verify with a checking pushrod — pivot height, rocker ratio, lifter preload, and base circle all interact. On LS engines especially, the pushrod is your only adjustment; get it wrong and the rocker tip sweeps off-center, wearing the valve guide.`,
  },
  {
    question: "What's a good connecting rod ratio?",
    answer: `Target <strong>1.6 to 1.8</strong> for street/strip — sweet spot around 1.65–1.75. SBC 350 is 1.638; LS1 is 1.684; Ford 302 is 1.697. The 383 stroker problem: stuffing a 3.750" crank in a 350 with stock 5.700" rods drops the ratio to 1.520 — too low. Upgrade to 6.000" rods to get back to 1.600 (and run a shorter compression-height piston).`,
  },
  {
    question: "Do I really need to degree my camshaft?",
    answer: `Yes. Even cams sold as "straight up" can be 2–4° off the spec on the card, due to variations in the cam core, keyway, and timing set. 2° of cam timing shifts dynamic compression noticeably and can be the difference between safe and detonation on a high-CR engine. Find true TDC with a piston stop, install a degree wheel, find the intake centerline at 0.050" lift, and adjust to the cam card spec ± your intended advance.`,
  },
  {
    question: "What's the difference between flat tappet and roller cams?",
    answer: `<strong>Flat tappet</strong> cams have ~130 lb practical spring pressure ceiling — above that, lobe wear accelerates fast (especially with modern low-ZDDP oils). Use a dedicated break-in oil. <strong>Roller cams</strong> ride on a needle bearing, eliminating the sliding-friction wear concern — they support 170–400+ lb spring pressures without lobe wear. Almost all performance builds use rollers now. Flat tappet survives in low-budget or vintage-correct builds.`,
  },
  {
    question: "What octane do I need for my compression ratio?",
    answer: `On a street cam, rough static CR limits: <strong>9.5:1 max on 87</strong>, <strong>10.5:1 on 91</strong>, <strong>11.0:1 on 93</strong>. With a performance cam that closes the intake valve past 60° ABDC, many builders run 11:1+ on 93 because the dynamic CR drops to a safe 7.5–8.5:1. E85 is the wildcard — its 105 effective octane supports 13:1+ static. Always calculate dynamic CR before finalizing pistons or gasket choice.`,
  },
  {
    question: "What's the right quench distance?",
    answer: `Steel rods: <strong>0.035–0.045"</strong>. Aluminum rods: <strong>0.050–0.060"</strong> (more thermal expansion needs more clearance). Too tight (under 0.025") and the piston can hit the head at high RPM. Above 0.080" you lose the squish/quench effect entirely and detonation resistance drops. Common street target: zero-deck pistons with a 0.040" compressed gasket.`,
  },
  {
    question: "What stall speed should my torque converter have?",
    answer: `Match it to your cam's powerband. A mild cam making torque at 2500 RPM works with a 2200–2500 RPM converter. A big cam that doesn't make power until 4000 needs a 3500–4000 RPM converter. Big-cam-with-stock-converter is the #1 mistake — the engine bogs at launch because it's forced to start below its powerband. Power adders (nitrous, boost) let you run a <em>lower</em> stall than the cam alone would suggest, since they add torque that flashes the converter harder.`,
  },
  {
    question: "What's the rule of thumb for valve spring pressure?",
    answer: `Match it to the cam manufacturer's spec, not a generic number. Hydraulic flat tappet: <strong>under 130 lb on the seat</strong>, or you'll wear the lobes off. Hydraulic roller: 130–180 lb seat is typical. Solid roller: 200–400+ lb. Always check coil bind clearance at max valve lift (need at least 0.060"). Mass matters as much as pressure — titanium retainers can add 500–800 RPM of safe operating range on the same springs.`,
  },
  {
    question: "Why do I need to retorque head bolts after the first heat cycle?",
    answer: `Head gaskets compress and bolts stretch when the engine heats up and cools down for the first time. After ~30 minutes of running and a full cooldown, clamp load drops slightly as the gasket finds its final compressed thickness. Retorquing restores even clamp load and prevents head gasket leaks. Applies to both stock bolts and ARP studs. If your gasket maker says "no retorque required," follow them — modern MLS gaskets often don't need it.`,
  },
];
