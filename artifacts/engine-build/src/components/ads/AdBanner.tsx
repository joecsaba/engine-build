// Ad placement component. No ad network is active right now (previous Ezoic /
// AdSense integrations were removed pending a new ad partner). Renders nothing.
// The call sites across the app stay in place so ads can be flipped back on by
// re-implementing this component once a network is approved.

interface AdBannerProps {
  slot?: string;
  format?: string;
  className?: string;
  label?: boolean;
  placementId?: number;
}

export function AdBanner(_props: AdBannerProps) {
  return null;
}
