import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { usePreferences } from "@/hooks/usePreferences";

// Path segments under /calculators/ that are NOT individual calculators (and
// should not be tracked as recents). Anything else under /calculators/ is
// treated as a calc slug.
const NON_CALC_SEGMENTS = new Set([
  "",
  "short-block",
  "cam-valvetrain",
  "power-fuel",
  "drivetrain-shop",
  "diesel",
]);

/**
 * Watches wouter location and records visits to individual calculator pages
 * in the user's recents list. Mount once at the layout root — no per-page
 * wiring needed.
 *
 * Guards against double-recording the same slug on rapid re-mounts (e.g.
 * React Strict Mode in dev) by tracking the last-recorded slug in a ref.
 */
export function RecentTracker() {
  const [location] = useLocation();
  const { addRecent } = usePreferences();
  const lastRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    const match = location.match(/^\/calculators\/([^/?#]+)/);
    if (!match) {
      lastRecordedRef.current = null;
      return;
    }
    const slug = match[1];
    if (NON_CALC_SEGMENTS.has(slug)) return;
    if (lastRecordedRef.current === slug) return;
    lastRecordedRef.current = slug;
    addRecent(slug);
  }, [location, addRecent]);

  return null;
}
