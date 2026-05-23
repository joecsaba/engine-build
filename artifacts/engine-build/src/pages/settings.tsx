import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/hooks/usePreferences";

// Curated platform list. Backed by the builds/HP-estimation system; extend as
// more platforms gain validated data.
const PLATFORMS: Array<{ value: string; label: string }> = [
  { value: "sbc350", label: "Small Block Chevy 350" },
  { value: "bbc454", label: "Big Block Chevy 454" },
  { value: "ls1", label: "GM LS1 5.7L" },
  { value: "ls3", label: "GM LS3 6.2L" },
  { value: "lt1", label: "GM LT1 Gen V 6.2L" },
  { value: "coyote50", label: "Ford Coyote 5.0L" },
  { value: "godzilla", label: "Ford Godzilla 7.3L" },
  { value: "sbf302", label: "Ford 302 Windsor" },
  { value: "modular46", label: "Ford 4.6L Modular" },
  { value: "hemi57", label: "Mopar 5.7L Hemi" },
  { value: "hemi64", label: "Mopar 6.4L Hemi" },
  { value: "cummins59", label: "Cummins 5.9L 24V" },
  { value: "cummins67", label: "Cummins 6.7L ISB" },
  { value: "duramax66", label: "GM Duramax 6.6L" },
  { value: "powerstroke67", label: "Ford Power Stroke 6.7L" },
];

export default function SettingsPage() {
  const { isSignedIn, isLoaded, user } = useAuth();
  const { prefs, setPrefs, expertMode, setExpertMode } = usePreferences();

  // Local state for the display name so it can debounce — other prefs save
  // instantly because they're click-driven.
  const [nameDraft, setNameDraft] = useState(prefs.displayName ?? "");

  // Sync local draft when prefs load/change from elsewhere.
  useEffect(() => {
    setNameDraft(prefs.displayName ?? "");
  }, [prefs.displayName]);

  // Save displayName 600ms after the user stops typing.
  useEffect(() => {
    const current = prefs.displayName ?? "";
    if (nameDraft === current) return;
    const t = setTimeout(() => {
      setPrefs({ displayName: nameDraft.trim() || null });
    }, 600);
    return () => clearTimeout(t);
  }, [nameDraft, prefs.displayName, setPrefs]);

  if (isLoaded && !isSignedIn) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-2xl text-center">
        <SEOHead title="Settings" description="Sign in to manage your preferences." canonical="/settings" />
        <h1 className="text-3xl font-bold mb-3">Settings</h1>
        <p className="text-muted-foreground mb-6">
          Sign in to save your preferences across devices. Your favorites and recents will be migrated automatically.
        </p>
        <Link href="/sign-in" className="inline-block bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium px-6 py-2.5 rounded-md transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <SEOHead
        title="Settings"
        description="Manage your display name, default units, and default engine platform."
        canonical="/settings"
      />

      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Your preferences sync across every device you sign in on."
      />

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email is managed by your sign-in provider.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="How should we address you?"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">Saved automatically as you type.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Units</Label>
              <div className="flex rounded-lg border overflow-hidden max-w-sm">
                {(["imperial", "metric"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors capitalize ${
                      prefs.defaultUnits === u
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => setPrefs({ defaultUnits: u })}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sets the default direction for every dual-unit converter (mm/in, °F/°C, ft-lb/Nm, psi/bar, etc.).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Engine Platform</Label>
              <Select
                value={prefs.defaultPlatform ?? "__none__"}
                onValueChange={(v) => setPrefs({ defaultPlatform: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="No default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No default</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Build-aware calculators (compression ratio, P2V, bolt specs, etc.) will pre-fill this platform when you open them.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-start justify-between gap-4 max-w-sm">
                <div className="flex-1">
                  <Label htmlFor="expertMode" className="text-sm font-medium">Expert Mode</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hides the educational sections below calculators. Useful if you already know the math and just want the tool.
                  </p>
                </div>
                <button
                  type="button"
                  id="expertMode"
                  role="switch"
                  aria-checked={expertMode}
                  onClick={() => setExpertMode(!expertMode)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#E85D04] focus:ring-offset-2 ${
                    expertMode ? "bg-[#E85D04]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      expertMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Stuff</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-[#E85D04]">{prefs.favorites.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Favorites</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E85D04]">{prefs.recents.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Recents</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E85D04]">{prefs.sidebarTools.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Pinned tools</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Manage favorites from the <Link href="/calculators" className="text-[#E85D04] hover:underline">calculators page</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
