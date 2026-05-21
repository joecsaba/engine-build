import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences } from "@/hooks/usePreferences";

/**
 * State hook for converters that have a primary "direction" or "active unit"
 * tied to imperial vs metric. Reads the user's `defaultUnits` preference for
 * the initial value AND re-syncs when the preference changes — UNLESS the
 * user has manually toggled the control on this page (then we leave their
 * choice alone).
 *
 * Usage:
 *   const [direction, setDirection] = useUnitDirection({
 *     imperial: "mm-to-in",
 *     metric: "in-to-mm",
 *   });
 */
export function useUnitDirection<T>(map: { imperial: T; metric: T }): [T, (next: T) => void] {
  const { prefs } = usePreferences();
  const userTouchedRef = useRef(false);
  const [value, setValue] = useState<T>(prefs.defaultUnits === "metric" ? map.metric : map.imperial);

  useEffect(() => {
    if (userTouchedRef.current) return;
    setValue(prefs.defaultUnits === "metric" ? map.metric : map.imperial);
  }, [prefs.defaultUnits, map.imperial, map.metric]);

  const onChange = useCallback((next: T) => {
    userTouchedRef.current = true;
    setValue(next);
  }, []);

  return [value, onChange];
}
