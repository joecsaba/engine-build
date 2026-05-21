import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Star, Clock, Wrench, Settings, Calculator, PlusCircle, ArrowRight, Loader2,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CalcCard } from "@/components/calculators/CalcCard";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { usePreferences } from "@/hooks/usePreferences";
import { findCalcBySlug } from "@/data/calculatorsCatalog";
import { SignupBenefits } from "@/components/auth/SignupBenefits";

const DASHBOARD_MAX = 4;

const PLATFORM_LABELS: Record<string, string> = {
  sbc350: "Small Block Chevy 350",
  bbc454: "Big Block Chevy 454",
  ls1: "LS1 5.7L",
  ls3: "LS3 6.2L",
  lt1: "LT1 6.2L",
  coyote50: "Coyote 5.0L",
  godzilla: "Godzilla 7.3L",
  sbf302: "Ford 302 Windsor",
  modular46: "Ford 4.6L Modular",
  hemi57: "5.7L Hemi",
  hemi64: "6.4L Hemi",
  cummins59: "Cummins 5.9L 24V",
  cummins67: "Cummins 6.7L ISB",
  duramax66: "Duramax 6.6L",
  powerstroke67: "Power Stroke 6.7L",
};

interface BuildSummary {
  id: string;
  name: string;
  engineSlug: string;
  updatedAt: string;
}

function QuickAction({ to, icon: Icon, label, desc }: {
  to: string; icon: typeof Calculator; label: string; desc: string;
}) {
  return (
    <Link href={to}>
      <div className="group block p-4 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer h-full">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E85D04]/10 flex items-center justify-center text-[#E85D04] shrink-0 group-hover:bg-[#E85D04] group-hover:text-white transition-all">
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold group-hover:text-[#E85D04] transition-colors">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{desc}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MyDashboard() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const { prefs } = usePreferences();

  const [builds, setBuilds] = useState<BuildSummary[] | null>(null);
  const [buildsLoading, setBuildsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    authFetch("/api/builds")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setBuilds(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBuilds([]);
      })
      .finally(() => {
        if (!cancelled) setBuildsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  const favoriteCalcs = prefs.favorites
    .map(findCalcBySlug)
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
    .slice(0, DASHBOARD_MAX);

  const favoriteSet = new Set(prefs.favorites);
  const recentCalcs = prefs.recents
    .filter((r) => !favoriteSet.has(r.slug))
    .map((r) => findCalcBySlug(r.slug))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
    .slice(0, DASHBOARD_MAX);

  const buildCount = builds?.length ?? 0;
  const recentBuilds = (builds ?? []).slice(0, 3);
  const isEmpty = !buildsLoading && buildCount === 0 && favoriteCalcs.length === 0 && recentCalcs.length === 0;

  const greeting = prefs.displayName?.trim() || user?.name?.split(" ")[0] || "back";
  const platformLabel = prefs.defaultPlatform ? (PLATFORM_LABELS[prefs.defaultPlatform] ?? prefs.defaultPlatform) : "Not set";

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-2xl text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E85D04]" />
      </div>
    );
  }

  if (!isSignedIn) {
    const localFavCount = prefs.favorites.length;
    const localRecentCount = prefs.recents.length;
    const hasLocalActivity = localFavCount > 0 || localRecentCount > 0;
    return (
      <div>
        <SEOHead
          title="Dashboard | Sign in"
          description="Sign in to sync favorites, presets, builds, and defaults across every device."
          canonical="/me"
        />
        <PageHeader
          eyebrow="Dashboard"
          title="Your engine-building hub"
          subtitle="Sign in to sync favorites, saved presets, builds, and defaults across every device."
        />
        <div className="container mx-auto max-w-5xl px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 items-start">
          <Card>
            <CardContent className="p-6 space-y-5">
              {hasLocalActivity && (
                <div className="bg-[#E85D04]/10 border border-[#E85D04]/30 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">You already have local activity</p>
                  <p className="text-gray-600">
                    {localFavCount > 0 && <>{localFavCount} starred {localFavCount === 1 ? "calculator" : "calculators"}{localRecentCount > 0 && ", "}</>}
                    {localRecentCount > 0 && <>{localRecentCount} recently used</>}
                    {" "}— sign in and it’ll move with you to every device.
                  </p>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold mb-1">Sign in to unlock your dashboard</h2>
                <p className="text-sm text-gray-500">
                  Free account. Takes 30 seconds. Everything you’ve already done on this browser stays put.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/sign-up"
                  className="flex-1 text-center bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-semibold px-5 py-2.5 rounded-md transition-colors"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/sign-in"
                  className="flex-1 text-center border border-gray-300 hover:border-[#E85D04] hover:text-[#E85D04] font-semibold px-5 py-2.5 rounded-md transition-colors"
                >
                  Sign In
                </Link>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">No account needed for</p>
                <div className="grid grid-cols-1 gap-2">
                  <Link href="/calculators" className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#E85D04]">
                    <Calculator className="w-4 h-4" /> All 47+ calculators
                  </Link>
                  <Link href="/engine-data" className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#E85D04]">
                    <Wrench className="w-4 h-4" /> Engine specs database (3,500+ engines)
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
          <SignupBenefits />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SEOHead title="Dashboard" description="Your engine-building hub — favorites, recent calculators, builds, and defaults." canonical="/me" />

      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome ${greeting}`}
        subtitle="Your engine-building hub: favorites, recents, builds, and defaults."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-10">
        {/* Quick actions */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickAction to="/build-sheets/new" icon={PlusCircle} label="Start a New Build" desc="Guided wizard for a fresh engine build." />
            <QuickAction to="/calculators" icon={Calculator} label="Open Calculators" desc="All 47+ engine-building tools." />
            <QuickAction to="/settings" icon={Settings} label="Edit Defaults" desc="Display name, units, and platform." />
          </div>
        </section>

        {/* Empty state */}
        {isEmpty && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-2">Your dashboard is empty.</p>
              <p className="text-sm text-gray-500">
                Star a calculator on the <Link href="/calculators" className="text-[#E85D04] hover:underline">calculators page</Link> or
                start a <Link href="/build-sheets/new" className="text-[#E85D04] hover:underline">new build</Link> to fill it in.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Favorites + Recents */}
        {(favoriteCalcs.length > 0 || recentCalcs.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {favoriteCalcs.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#E85D04]" fill="currentColor" strokeWidth={0} />
                    <h2 className="text-xl font-bold">My Tools</h2>
                    <span className="text-sm text-gray-500">({prefs.favorites.length})</span>
                  </div>
                  {prefs.favorites.length > DASHBOARD_MAX && (
                    <Link href="/calculators" className="text-xs text-[#E85D04] hover:underline">View all →</Link>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {favoriteCalcs.map((calc) => (
                    <CalcCard key={calc.href} calc={calc} />
                  ))}
                </div>
              </section>
            )}

            {recentCalcs.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <h2 className="text-xl font-bold">Recently Used</h2>
                  </div>
                  <Link href="/calculators" className="text-xs text-[#E85D04] hover:underline">All calculators →</Link>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {recentCalcs.map((calc) => (
                    <CalcCard key={calc.href} calc={calc} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* My Builds + My Setup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#E85D04]" />
                  <h2 className="text-xl font-bold">My Builds</h2>
                </div>
                <Link href="/build-sheets/my-builds" className="text-xs text-[#E85D04] hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {buildsLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : buildCount === 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-3">No saved builds yet.</p>
                  <Link href="/build-sheets/new" className="inline-flex items-center gap-1.5 text-sm text-[#E85D04] hover:underline">
                    <PlusCircle className="w-4 h-4" /> Start your first build
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentBuilds.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/build-sheets/build/${b.id}`}
                        className="flex items-center justify-between p-2 -mx-2 rounded hover:bg-muted transition-colors text-sm group"
                      >
                        <span className="font-medium truncate">{b.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#E85D04] shrink-0" />
                      </Link>
                    </li>
                  ))}
                  {buildCount > 3 && (
                    <li className="text-xs text-gray-500 pt-1">+ {buildCount - 3} more</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#E85D04]" />
                  <h2 className="text-xl font-bold">My Setup</h2>
                </div>
                <Link href="/settings" className="text-xs text-[#E85D04] hover:underline flex items-center gap-1">
                  Edit <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <dl className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wider text-gray-500">Default units</dt>
                  <dd className="text-sm font-semibold capitalize">{prefs.defaultUnits}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wider text-gray-500">Default platform</dt>
                  <dd className={`text-sm font-semibold text-right truncate ${prefs.defaultPlatform ? "" : "text-gray-400"}`}>{platformLabel}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wider text-gray-500">Email</dt>
                  <dd className="text-sm font-mono text-gray-600 truncate">{user?.email}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  <div>
                    <p className="text-xl font-bold text-[#E85D04]">{prefs.favorites.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Favorites</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#E85D04]">{prefs.recents.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Recents</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#E85D04]">{prefs.sidebarTools.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Pinned</p>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
