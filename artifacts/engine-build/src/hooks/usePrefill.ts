import { useEffect, useRef } from "react";

/**
 * Seed a calculator's inputs from the URL query string, once, on first mount.
 *
 * This is what makes a calculator result shareable: the URL carries its own
 * inputs, so a link pasted into a forum thread lands on the answer rather than
 * an empty form. It is also how engine spec pages hand an engine's dimensions
 * to a calculator (see calcLinksFor in scripts/engineData.mjs, which owns the param names).
 *
 * Deliberately fires only once. Re-applying on every render would fight the
 * user the moment they typed over a prefilled value.
 *
 * @param setters  param name -> setter. A setter receives the raw string; it
 *                 decides how to parse. Params with no setter are ignored, so
 *                 unrelated query strings (utm_*, fbclid) are harmless.
 */
export function usePrefill(setters: Record<string, (value: string) => void>) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (![...params.keys()].length) return;

    for (const [key, setter] of Object.entries(setters)) {
      const raw = params.get(key);
      if (raw != null && raw !== "") setter(raw);
    }
    // setters is intentionally not a dependency — this runs once by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Parse a query param as a finite number, or return null. */
export function numParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
