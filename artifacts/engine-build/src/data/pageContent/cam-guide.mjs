// Shared content for /cam-guide.
//
// The page is 827 lines of interactive tooling, but it prerendered 29 words —
// so the third-best page on the site's best channel (Bing: 213 impressions,
// 18 clicks) was showing crawlers almost nothing. The glossary below is the
// substantive prose on that page and it was locked inside a component literal.
//
// Consumed by both src/pages/cam-guide.tsx and scripts/prerender.mjs, so the
// definitions a reader sees are the ones that get indexed.

/** The six specs that actually describe a camshaft. */
export const CAM_SPEC_TERMS = [
  {
    term: 'Duration at 0.050"',
    def: 'The industry-standard measurement of how many crankshaft degrees the valve is open more than 0.050" lift. This is the only number you can reliably compare between cam brands.',
  },
  {
    term: "Advertised Duration",
    def: 'Duration measured at a low lift point (varies by manufacturer — 0.004" to 0.006"). NOT comparable between brands. Used for marketing.',
  },
  {
    term: "Lift",
    def: "Maximum distance the valve opens, in inches. Determined by: lobe lift × rocker ratio. More lift generally means more airflow potential, but valve springs, geometry, and head port size all limit the useful lift.",
  },
  {
    term: "Lobe Separation Angle (LSA)",
    def: "The angle between the intake and exhaust lobe centerlines, measured in camshaft degrees. Affects overlap, idle quality, and power band. Narrow LSA = more overlap, peakier power, rough idle. Wide LSA = less overlap, smoother idle, better vacuum, broader power.",
  },
  {
    term: "Intake Centerline (ICL)",
    def: "The crankshaft degree position at which the intake lobe reaches maximum lift (after TDC). Installing a cam advanced or retarded from this spec shifts the power band up or down in RPM.",
  },
  {
    term: "Overlap",
    def: "The period in crankshaft degrees when both intake AND exhaust valves are simultaneously open. More overlap = more power potential at high RPM, worse idle, worse low-end torque, lower vacuum. The cam that sounds like a race car at idle has lots of overlap.",
  },
];

/** What each tool on the page does — the part an interactive page can't say for itself. */
export const CAM_GUIDE_TOOLS = [
  {
    heading: "Simple cam timing calculator",
    body: "Enter duration and lobe separation angle to get intake and exhaust centerlines, overlap, and the valve events in crankshaft degrees. Useful for checking a cam card before you buy, or working out what a grind will actually do in your engine.",
  },
  {
    heading: "Cam profile comparison",
    body: 'Put two cams side by side on duration at 0.050", lift, LSA and overlap, with dual-pattern support so intake and exhaust are compared separately. The specs that matter are rarely the ones printed largest on the box.',
  },
  {
    heading: "Cam selection recommender",
    body: "Describe the engine and what it is for — displacement, compression, gearing, converter, intended RPM range — and get a duration and LSA range that suits the combination, with the reasoning shown rather than just a number.",
  },
  {
    heading: "Valve spring requirements",
    body: "Work out the seat and open pressures a given lift and RPM demand, so the spring package matches the cam rather than being guessed at. Under-sprung valvetrains float; over-sprung ones eat lobes.",
  },
];

export default {
  intro:
    "Choosing a camshaft is the decision that most changes how an engine behaves, and the specs that describe one are easy to misread. This guide covers what each number means, a comparison tool for putting two grinds side by side, a recommender that works from your combination rather than a catalogue, and a valve spring calculator so the springs match the cam.",
  terms: CAM_SPEC_TERMS,
  tools: CAM_GUIDE_TOOLS,
};
