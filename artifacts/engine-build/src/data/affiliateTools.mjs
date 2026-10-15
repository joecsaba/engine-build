// "Tools for this job" — Amazon affiliate tool placements, one list per page.
//
// REMOVED 2026-10-15: the site's Amazon Associates account was closed, so every
// tool placement came off the calculators and guides. The lists below are empty
// and ToolsForThisJob renders nothing for a page with no list, so the component
// can stay in place on each page until it is wanted again. The Vizard book
// citations (attribution.mjs, SourceNote, the cam selector content) stay.
//
// The previous tool list (36 tools across 24 calculators and 6 guides, with the
// eight pinned ASINs) is in git history before this change.

import { AMAZON_TAG } from "./attribution.mjs";

/** Amazon URL for a tool: a pinned product if it has one, else a search. */
export function toolUrl(tool) {
  const tag = AMAZON_TAG ? `tag=${AMAZON_TAG}` : "";
  if (tool.dp) return `https://www.amazon.com/dp/${tool.dp}${tag ? `?${tag}` : ""}`;
  const q = encodeURIComponent(tool.q).replace(/%20/g, "+");
  return `https://www.amazon.com/s?k=${q}${tag ? `&${tag}` : ""}`;
}

/** Keyed by calculator slug (the part after /calculators/). */
export const CALCULATOR_TOOLS = {};

/** Keyed by guide slug (the part after /guides/). */
export const GUIDE_TOOLS = {};

export default { CALCULATOR_TOOLS, GUIDE_TOOLS };
