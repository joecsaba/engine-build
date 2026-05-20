import { useState, useCallback, useEffect, useRef } from "react";
import { useBuildContext } from "@/context/BuildContext";

/**
 * Drop-in replacement for useState that integrates with the active engine build.
 *
 * - When no active build exists: behaves identically to useState.
 * - When an active build exists: initializes from the build's field value
 *   and writes changes back to the build context (which syncs to the API).
 *
 * Usage in calculators:
 *   const [bore, setBore] = useBuildField("shortBlock.bore", "4.000");
 */
export function useBuildField(
  fieldKey: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const { activeBuild, getField, setField } = useBuildContext();

  // Determine initial value: build field > default
  const buildValue = activeBuild ? getField(fieldKey) : undefined;
  const initialValue = buildValue ?? defaultValue;

  const [localValue, setLocalValue] = useState(initialValue);

  // Track whether this is the initial mount to avoid overwriting user edits
  const isInitialMount = useRef(true);

  // When the active build changes (e.g., user loads a different build),
  // update local state to reflect the new build's field value.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const val = activeBuild ? getField(fieldKey) : undefined;
    if (val !== undefined) {
      setLocalValue(val);
    }
  }, [activeBuild?.id, fieldKey, getField]);

  const setValue = useCallback(
    (value: string) => {
      setLocalValue(value);
      if (activeBuild) {
        setField(fieldKey, value);
      }
    },
    [activeBuild, fieldKey, setField],
  );

  return [localValue, setValue];
}
