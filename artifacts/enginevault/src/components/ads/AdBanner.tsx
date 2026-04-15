import { useEffect, useRef } from "react";

const PUBLISHER_ID = "ca-pub-XXXXXXXXXXXXXXXX";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "rectangle" | "vertical";
  className?: string;
  label?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdBanner({ slot, format = "auto", className = "", label = true }: AdBannerProps) {
  const initialized = useRef(false);
  const configured = !PUBLISHER_ID.includes("X");

  useEffect(() => {
    if (!configured || initialized.current) return;
    initialized.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [configured]);

  if (!configured) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded text-gray-400 text-xs py-3 px-4 ${className}`}>
        Advertisement — configure AdSense publisher ID to activate
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <p className="text-center text-[10px] uppercase tracking-widest text-gray-400 mb-1 select-none">
          Advertisement
        </p>
      )}
      <ins
        className="adsbygoogle block"
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
