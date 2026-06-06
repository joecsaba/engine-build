// Ad placement component. No active ad network during the Ezoic onboarding
// transition — renders nothing. The call sites stay in place so we can flip
// ads back on (Ezoic-injected slots) without re-threading the layout.

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "rectangle" | "vertical";
  className?: string;
  label?: boolean;
}

export function AdBanner(_props: AdBannerProps) {
  return null;
}
