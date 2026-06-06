import { useEffect, useState } from "react";
import { Link } from "wouter";

// Storage key for the user's consent decision. Values: "accepted" | "rejected".
// If absent, the banner is shown.
const CONSENT_KEY = "ebcom_cookie_consent_v1";
const GA_MEASUREMENT_ID = "G-624Z648DND";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadGtagScript() {
  // Only load once.
  if (document.querySelector('script[data-gtag-loaded="true"]')) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  s.setAttribute("data-gtag-loaded", "true");
  document.head.appendChild(s);
  // The gtag() function stub is already defined inline in index.html, so
  // dataLayer is ready. Fire the config call here, post-consent.
  window.gtag?.("config", GA_MEASUREMENT_ID);
}

export function CookieConsent() {
  const [decision, setDecision] = useState<"accepted" | "rejected" | "pending" | null>(null);

  useEffect(() => {
    // Read existing decision from localStorage (if any).
    const stored = (typeof localStorage !== "undefined"
      ? localStorage.getItem(CONSENT_KEY)
      : null) as "accepted" | "rejected" | null;

    if (stored === "accepted") {
      loadGtagScript();
      setDecision("accepted");
    } else if (stored === "rejected") {
      setDecision("rejected");
    } else {
      setDecision("pending");
    }
  }, []);

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch {}
    loadGtagScript();
    setDecision("accepted");
  }

  function reject() {
    try { localStorage.setItem(CONSENT_KEY, "rejected"); } catch {}
    setDecision("rejected");
  }

  if (decision !== "pending") return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] bg-[#1a1a1a] border-t-2 border-[#E85D04] text-white shadow-2xl"
    >
      <div className="container mx-auto max-w-6xl px-4 py-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 text-sm leading-relaxed">
          <p className="font-semibold mb-1">We use cookies</p>
          <p className="text-gray-300 text-xs md:text-sm">
            We use Google Analytics to understand how the site is used, and we'll be running display
            ads after our ad network goes live. You can accept all cookies or use the site
            without analytics. See our{" "}
            <Link href="/privacy" className="text-[#E85D04] hover:underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={reject}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Reject non-essential
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-bold rounded-md bg-[#E85D04] hover:bg-[#d04f00] text-white transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
