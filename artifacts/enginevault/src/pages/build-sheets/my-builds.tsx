import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Trash2, Wrench, Calendar, ChevronRight } from "lucide-react";
import { useBuildContext } from "@/context/BuildContext";
import { BUILD_SECTIONS, isSectionComplete } from "@/data/buildFieldDefs";

type BuildSummary = {
  id: number;
  name: string;
  engineSlug: string;
  createdAt: string;
  updatedAt: string;
};

const ENGINE_LABELS: Record<string, string> = {
  sbc350: "Small Block Chevy 350",
  ls1: "LS1 5.7L",
  coyote50: "Coyote 5.0",
};

export default function MyBuildsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const { loadBuild } = useBuildContext();

  const [builds, setBuilds] = useState<BuildSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation("/sign-in");
      return;
    }
    fetchBuilds();
  }, [isLoaded, isSignedIn]);

  async function fetchBuilds() {
    try {
      const res = await fetch("/api/builds");
      if (res.ok) {
        const data = await res.json();
        setBuilds(data);
      }
    } catch (err) {
      console.error("Failed to fetch builds:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this build? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/builds/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBuilds((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete build:", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleContinue(id: number) {
    await loadBuild(id);
    setLocation(`/build-sheets/build/${id}`);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85D04]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="My Builds"
        title="Your Engine Builds"
        subtitle="Continue where you left off or start a new build."
      />

      <div className="container mx-auto max-w-3xl px-4 py-10">
        {/* Start new build CTA */}
        <Link href="/build-sheets/new">
          <div className="group flex items-center gap-4 p-5 rounded-lg border-2 border-dashed border-[#E85D04]/40 hover:border-[#E85D04] bg-[#E85D04]/5 hover:bg-[#E85D04]/10 transition-all cursor-pointer mb-8">
            <PlusCircle className="w-8 h-8 text-[#E85D04]" />
            <div>
              <h2 className="text-lg font-bold text-[#E85D04]">Start a New Build</h2>
              <p className="text-sm text-gray-500">Pick an engine platform and start filling in your specs</p>
            </div>
          </div>
        </Link>

        {/* Builds list */}
        {builds.length === 0 ? (
          <div className="text-center py-16">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No builds yet</h3>
            <p className="text-gray-400">Start your first engine build above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {builds.map((build) => (
              <Card key={build.id} className="border-gray-200 hover:border-[#E85D04]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleContinue(build.id)}>
                      <h3 className="text-lg font-bold truncate hover:text-[#E85D04] transition-colors">
                        {build.name}
                      </h3>
                      <p className="text-sm text-[#E85D04] font-medium mb-2">
                        {ENGINE_LABELS[build.engineSlug] ?? build.engineSlug}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created {formatDate(build.createdAt)}
                        </span>
                        <span>
                          Updated {formatDate(build.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500 h-8 w-8"
                        onClick={() => handleDelete(build.id)}
                        disabled={deletingId === build.id}
                      >
                        {deletingId === build.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
                        onClick={() => handleContinue(build.id)}
                      >
                        Continue
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
