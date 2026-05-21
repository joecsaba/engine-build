import { usePreferences } from "@/hooks/usePreferences";
import { platformSpec, type PlatformSpec } from "@/data/platformSpecs";

/**
 * Returns the current user's default platform specs (bore/stroke/cylinders/etc.)
 * or null if no default is set. Calculators can fall back to their hardcoded
 * defaults when this returns null.
 *
 * Usage:
 *   const platform = useDefaultPlatform();
 *   const [bore, setBore] = useState(platform?.bore ?? "4.000");
 */
export function useDefaultPlatform(): PlatformSpec | null {
  const { prefs } = usePreferences();
  return platformSpec(prefs.defaultPlatform);
}
