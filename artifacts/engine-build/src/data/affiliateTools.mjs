// "Tools for this job" — Amazon affiliate placements, one list per page.
//
// A calculator's result is usually a number the reader now has to act on with
// a physical tool: a ring gap they must file to, a clearance they must measure,
// a cam they must degree. This maps each page to the two-to-four tools that
// job actually needs, with one line each on why. The box is rendered by
// ToolsForThisJob and is deliberately absent from engine spec pages — 1,472
// identical boxes is the scaled-content pattern, and Mediavine's in-content
// ads already occupy that space.
//
// Constraints from the Amazon Associates Operating Agreement that shape this:
//   - No prices unless they come live from the Product Advertising API, so
//     none are shown.
//   - No Amazon product images outside the API or SiteStripe, so text only.
//   - Disclosure at the link, not just on the terms page (ToolsForThisJob
//     renders it inline, as SourceNote does).
//
// Links go to Amazon SEARCHES by default, not specific products: a product
// link dies when that listing goes out of stock, and no ASIN here is invented.
// To pin a specific product, add `dp: "<ASIN>"` to a tool and it takes
// precedence over the search. Eight were pinned 2026-10-06 from products the
// owner chose; the ASINs were resolved from Amazon share links, which carry a
// 9-character token rather than the ASIN itself.
//
// The tag is the site's existing Associates ID, shared with the Vizard book
// citations in attribution.mjs.

import { AMAZON_TAG } from "./attribution.mjs";

/** Amazon URL for a tool: a pinned product if it has one, else a search. */
export function toolUrl(tool) {
  const tag = AMAZON_TAG ? `tag=${AMAZON_TAG}` : "";
  if (tool.dp) return `https://www.amazon.com/dp/${tool.dp}${tag ? `?${tag}` : ""}`;
  const q = encodeURIComponent(tool.q).replace(/%20/g, "+");
  return `https://www.amazon.com/s?k=${q}${tag ? `&${tag}` : ""}`;
}

// One definition per tool, so a better search term or a pinned ASIN is fixed
// in one place and every page that lists it follows.
const T = {
  ringFiler:       { dp: "B098MPLBW7", name: "Piston ring filer",              q: "piston ring filer",                     why: "File to the gap you just calculated, a thousandth at a time — never a Dremel." },
  feelerGauges:    { dp: "B0CGRZKT71", name: "Feeler gauge set",               q: "feeler gauge set",                      why: "Measure the gap with the ring squared in the bore." },
  ringSquarer:     { name: "Ring squaring tool",             q: "piston ring squaring tool",             why: "Seats the ring square in the bore so the reading is true." },
  plastigage:      { dp: "B004AFDTQ8", name: "Plastigage",                     q: "plastigage green red",                  why: "Green covers 0.001–0.003\", red 0.002–0.006\" — the ranges most mains and rods land in." },
  micrometers:     { name: "Outside micrometer set",         q: "outside micrometer set 0-4 inch",       why: "Journal diameter to a ten-thousandth; Plastigage only tells you the clearance, not why." },
  boreGauge:       { name: "Dial bore gauge",                q: "dial bore gauge 2-6 inch",              why: "Bore and bearing housing diameters, and taper and out-of-round in one sweep." },
  ccKit:           { name: "Burette cc kit",                 q: "combustion chamber cc kit burette",     why: "Measure chamber volume instead of trusting the casting number." },
  deckBridge:      { name: "Deck bridge with dial indicator", q: "piston deck height gauge bridge",      why: "Piston-to-deck at TDC — the input you probably estimated." },
  dialIndicator:   { dp: "B0DQ4Y1RVK", name: "Dial indicator with magnetic base", q: "dial indicator magnetic base",       why: "Lift, deck height, endplay — the one measuring tool that shows up in every job." },
  degreeWheel:     { dp: "B0002LJR6U", name: "Cam degree wheel kit",           q: "cam degree wheel kit",                  why: "Reads the crank position the cam card is written in." },
  pistonStop:      { name: "Piston stop",                    q: "piston stop tool spark plug",           why: "Finding true TDC is the step that makes every other reading valid." },
  pushrodChecker:  { name: "Adjustable pushrod length checker", q: "adjustable pushrod length checker",  why: "Measure the length; ordering from a chart guesses it." },
  clay:            { name: "Modeling clay",                  q: "modeling clay piston to valve clearance", why: "The clay method still catches what a calculator can't see." },
  checkingSprings: { name: "Light checking springs",         q: "valve checking springs",                why: "Turn the engine by hand through the overlap without fighting the real springs." },
  springTester:    { name: "Valve spring tester",            q: "valve spring tester",                   why: "Seat and open pressure on the actual springs, not the catalog figure." },
  springCompressor:{ name: "Valve spring compressor",        q: "valve spring compressor",               why: "Needed to get the springs off to test them." },
  torqueWrench:    { name: "1/2\" drive click torque wrench", q: "1/2 drive click torque wrench",        why: "Mains, rods and heads all live in its range." },
  inLbWrench:      { name: "Inch-pound torque wrench",       q: "inch pound torque wrench 3/8 drive",    why: "Anything under ~20 ft-lb — oil pans, valve covers, small fasteners — is an in-lb job." },
  angleGauge:      { name: "Torque angle gauge",             q: "torque angle gauge",                    why: "Torque-to-yield bolts finish on degrees, not ft-lb." },
  crowsFeet:       { name: "Crow's foot wrench set",         q: "crowfoot wrench set",                   why: "The adapter this calculator corrects for." },
  tapDie:          { name: "Tap and die set",                q: "tap and die set sae metric",            why: "Chasing threads before assembly is where most torque readings go right." },
  drillIndex:      { name: "Number and letter drill index",  q: "number letter drill bit set",           why: "Tap drill sizes are mostly number and letter drills, not fractions." },
  pitchGauge:      { name: "Thread pitch gauge",             q: "thread pitch gauge sae metric",         why: "Settles SAE-or-metric in seconds." },
  wrenchSet:       { name: "Combination wrench set, SAE and metric", q: "combination wrench set sae metric", why: "The sizes the converter says are interchangeable — and the ones that aren't." },
  calipers:        { dp: "B087N5N45G", name: "Digital calipers",               q: "digital caliper 6 inch",                why: "Reads decimal inches and millimeters directly." },
  wideband:        { name: "Wideband O2 gauge kit",          q: "wideband air fuel ratio gauge kit",     why: "Lambda from the exhaust, not from a chart." },
  timingLight:     { name: "Dial-back timing light",         q: "dial back timing light",                why: "Reads total advance without a degreed balancer." },
  anWrenches:      { name: "AN fitting wrench set",          q: "AN fitting wrench set aluminum",        why: "Aluminum jaws; open-end steel wrenches chew anodized fittings." },
  egtKit:          { name: "EGT gauge and pyrometer kit",    q: "EGT gauge kit pyrometer diesel",        why: "The number this calculator tells you to watch." },
  fass:            { dp: "B0B75N77BL", name: "FASS fuel lift pump",            q: "FASS fuel lift pump",                   why: "One of the two the calculator sizes." },
  airdog:          { name: "AirDog lift pump",               q: "AirDog lift pump",                      why: "The other one." },
  breakInOil:      { dp: "B0068C3C5O", name: "High-ZDDP break-in oil",         q: "engine break in oil zddp",              why: "Flat-tappet cams need 1,500+ ppm zinc for the first run; modern oils don't carry it." },
  oilPrimer:       { name: "Oil pump primer",                q: "oil pump primer tool",                  why: "Oil at every rocker before the engine ever turns over." },
  assemblyLube:    { name: "Engine assembly lube",           q: "engine assembly lube",                  why: "Bearings and cam lobes see it before they see oil." },
  straightedge:    { name: "Precision straightedge",         q: "precision straight edge 24 inch",       why: "Deck and head flatness with a feeler gauge underneath." },
  gramScale:       { name: "Digital gram scale",             q: "digital gram scale 0.1g 5000g",         why: "Piston and rod weights for balancing, to a tenth of a gram." },
};

/** Keyed by calculator slug (the part after /calculators/). */
export const CALCULATOR_TOOLS = {
  "ring-gap":                   [T.ringFiler, T.feelerGauges, T.ringSquarer],
  "bearing-clearance":          [T.plastigage, T.micrometers, T.boreGauge],
  "compression-ratio":          [T.ccKit, T.deckBridge],
  "quench-deck-height":         [T.deckBridge, T.dialIndicator],
  "cc-ci-converter":            [T.ccKit],
  "displacement":               [T.boreGauge],
  "bolt-spec-lookup":           [T.torqueWrench, T.angleGauge],
  "cam-degreeing":              [T.degreeWheel, T.dialIndicator, T.pistonStop],
  "cam-duration":               [T.degreeWheel],
  "pushrod-length":             [T.pushrodChecker],
  "piston-to-valve":            [T.clay, T.checkingSprings, T.dialIndicator],
  "valve-spring":               [T.springTester, T.springCompressor],
  "torque-extension":           [T.crowsFeet, T.torqueWrench],
  "torque-units-converter":     [T.torqueWrench, T.inLbWrench],
  "tap-drill-lookup":           [T.tapDie, T.drillIndex],
  "thread-pitch-converter":     [T.pitchGauge],
  "wrench-size-converter":      [T.wrenchSet],
  "decimal-fraction-inch":      [T.calipers],
  "mm-inch-converter":          [T.calipers],
  "afr-lambda":                 [T.wideband],
  "ignition-timing-curve":      [T.timingLight],
  "an-fitting-size":            [T.anWrenches],
  "diesel-egt-drive-pressure":  [T.egtKit],
  "diesel-lift-pump":           [T.fass, T.airdog],
};

/** Keyed by guide slug (the part after /guides/). */
export const GUIDE_TOOLS = {
  "bearing-clearance":    [T.plastigage, T.micrometers],
  "ring-gap":             [T.ringFiler, T.feelerGauges],
  "degree-cam":           [T.degreeWheel, T.dialIndicator, T.pistonStop],
  "break-in":             [T.breakInOil, T.oilPrimer, T.assemblyLube],
  "machine-shop-quality": [T.straightedge, T.feelerGauges, T.boreGauge],
  "blueprinting":         [T.ccKit, T.gramScale, T.boreGauge],
};

export default { CALCULATOR_TOOLS, GUIDE_TOOLS };
