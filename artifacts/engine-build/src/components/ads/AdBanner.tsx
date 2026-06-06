import { useEffect } from "react";

// Ezoic ad placement. Renders an empty placeholder div with the required
// id pattern `ezoic-pub-ad-placeholder-XXX`, then queues a showAds(XXX) call
// so Ezoic fills it when ready.
//
// Per Ezoic docs (https://docs.ezoic.com/docs/ezoicads/implementation/):
//   - DO NOT style the placeholder div (height, width, margins). Empty white
//     space appears if the ad doesn't fill.
//   - Wrapping the call in ezstandalone.cmd.push lets it queue safely until
//     sa.min.js finishes loading.
//
// Placement IDs must exist in your Ezoic dashboard before they'll fill.
// We're using a 100-series scheme: 101 = global footer, 102 = home mid-page,
// 103-107 = calc category page bottoms, 108 = sidebar, 109 = reserved.

interface AdBannerProps {
  slot?: string;                       // legacy AdSense slot (ignored)
  format?: string;                     // legacy (ignored)
  className?: string;
  label?: boolean;                     // legacy (ignored — Ezoic injects own label)
  placementId?: number;                // Ezoic placement ID
}

export function AdBanner({ placementId, className = "" }: AdBannerProps) {
  // If no placement ID is set yet, render nothing (silent during config).
  const id = placementId;

  useEffect(() => {
    if (!id) return;
    const ez = (window as any).ezstandalone;
    if (!ez) return;
    ez.cmd = ez.cmd || [];
    ez.cmd.push(function () {
      try { ez.showAds(id); } catch { /* no-op */ }
    });
  }, [id]);

  if (!id) return null;

  return (
    <div className={className}>
      {/* Per Ezoic: do NOT style this div. */}
      <div id={`ezoic-pub-ad-placeholder-${id}`} />
    </div>
  );
}
