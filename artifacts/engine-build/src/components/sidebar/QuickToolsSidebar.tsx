import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Wrench, X, ExternalLink, PinOff } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";
import { findCalcBySlug } from "@/data/calculatorsCatalog";
import { MiniMmInchConverter } from "./MiniMmInchConverter";

// Paths where the sidebar would clash with the page layout or content.
const HIDDEN_PATH_PREFIXES = ["/sign-in", "/sign-up", "/settings", "/admin"];

function pathHidden(path: string): boolean {
  return HIDDEN_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

export function QuickToolsSidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const { prefs, togglePinned } = usePreferences();

  if (pathHidden(location)) return null;

  const pinnedCalcs = prefs.sidebarTools
    .map(findCalcBySlug)
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  return (
    <>
      {/* Backdrop when expanded — click to collapse */}
      {expanded && (
        <div
          className="hidden md:block fixed inset-0 bg-black/20 z-40"
          onClick={() => setExpanded(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — hidden on mobile */}
      <aside
        className={`hidden md:flex fixed top-1/2 -translate-y-1/2 right-0 z-50 flex-col bg-white border border-gray-200 shadow-lg rounded-l-xl transition-all duration-200 ${
          expanded ? "w-80" : "w-12"
        }`}
        aria-label="Quick Tools sidebar"
      >
        {expanded ? (
          // Expanded panel
          <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#E85D04]" />
                <h2 className="text-sm font-bold">Quick Tools</h2>
              </div>
              <button
                type="button"
                aria-label="Collapse Quick Tools"
                onClick={() => setExpanded(false)}
                className="p-1 rounded hover:bg-muted text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Always-on mini mm/in converter */}
            <div className="pt-2 border-t border-gray-100">
              <MiniMmInchConverter />
            </div>

            {/* Pinned tools */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">
                Pinned Tools {pinnedCalcs.length > 0 && `(${pinnedCalcs.length})`}
              </p>
              {pinnedCalcs.length === 0 ? (
                <p className="text-xs text-gray-500 leading-relaxed">
                  Click the pin icon on any calculator to add it here. Stays visible on every page.
                </p>
              ) : (
                <ul className="space-y-1">
                  {pinnedCalcs.map((calc) => (
                    <li key={calc.href} className="group flex items-center gap-1">
                      <Link
                        href={calc.href}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm min-w-0"
                      >
                        <calc.icon className="w-4 h-4 text-[#E85D04] shrink-0" />
                        <span className="truncate">{calc.title}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Unpin ${calc.title}`}
                        onClick={() => togglePinned(calc.slug)}
                        className="p-1.5 rounded text-gray-400 hover:text-[#E85D04] hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <PinOff className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          // Collapsed vertical strip
          <button
            type="button"
            aria-label="Open Quick Tools"
            onClick={() => setExpanded(true)}
            className="w-12 py-4 flex flex-col items-center gap-3 hover:bg-muted transition-colors group"
          >
            <Wrench className="w-5 h-5 text-[#E85D04]" />
            <span
              className="text-[10px] uppercase tracking-wider text-gray-600 font-medium"
              style={{ writingMode: "vertical-rl" }}
            >
              Quick Tools
            </span>
            {pinnedCalcs.length > 0 && (
              <span className="text-[10px] font-bold bg-[#E85D04] text-white rounded-full w-5 h-5 flex items-center justify-center">
                {pinnedCalcs.length}
              </span>
            )}
          </button>
        )}
      </aside>
    </>
  );
}
