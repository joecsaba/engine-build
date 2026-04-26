import { useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useUser } from "@clerk/react";
import { useBuildContext } from "@/context/BuildContext";

const ENGINES = [
  {
    slug: "sbc350",
    title: "Small Block Chevy 350",
    subtitle: "GM Gen I — 5.7L / 350ci",
    details: "4.000\" bore × 3.480\" stroke — the most popular engine ever built. Vortec, LT1, and classic 350 builds.",
    image: "🔧",
  },
  {
    slug: "ls1",
    title: "LS1",
    subtitle: "GM Gen III — 5.7L / 346ci",
    details: "3.898\" bore × 3.622\" stroke — aluminum block, cathedral port heads. Corvette C5, Camaro, GTO swaps.",
    image: "⚡",
  },
];

export default function NewBuildPage() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useUser();
  const { loadBuild } = useBuildContext();
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [buildName, setBuildName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isSignedIn) {
    setLocation("/sign-in");
    return null;
  }

  const handleCreate = async () => {
    if (!selectedEngine) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: buildName.trim() || `My ${ENGINES.find(e => e.slug === selectedEngine)?.title} Build`,
          engineSlug: selectedEngine,
        }),
      });

      if (!res.ok) throw new Error("Failed to create build");
      const build = await res.json();

      // Load the build into context and navigate to the wizard
      await loadBuild(build.id);
      setLocation(`/build-sheets/build/${build.id}`);
    } catch (err) {
      console.error("Failed to create build:", err);
      setIsCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="New Build"
        title="Choose Your Engine"
        subtitle="Select the engine platform for your build. Stock specs will be pre-filled — you'll customize everything in the wizard."
      />

      <div className="container mx-auto max-w-3xl px-4 py-10">
        {/* Engine selection cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {ENGINES.map((engine) => (
            <Card
              key={engine.slug}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedEngine === engine.slug
                  ? "ring-2 ring-[#E85D04] border-[#E85D04]"
                  : "border-gray-200 hover:border-[#E85D04]/50"
              }`}
              onClick={() => setSelectedEngine(engine.slug)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{engine.image}</span>
                  {selectedEngine === engine.slug && (
                    <CheckCircle2 className="w-6 h-6 text-[#E85D04]" />
                  )}
                </div>
                <h3 className="text-xl font-bold mb-1">{engine.title}</h3>
                <p className="text-sm font-medium text-[#E85D04] mb-2">{engine.subtitle}</p>
                <p className="text-sm text-gray-500">{engine.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Build name + create */}
        {selectedEngine && (
          <div className="space-y-4 p-6 rounded-lg border border-gray-200 bg-white">
            <div>
              <Label htmlFor="buildName" className="text-sm font-medium mb-1.5 block">
                Build Name <span className="text-gray-400">(optional)</span>
              </Label>
              <Input
                id="buildName"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                placeholder={`My ${ENGINES.find(e => e.slug === selectedEngine)?.title} Build`}
                className="max-w-md"
              />
              <p className="text-xs text-gray-400 mt-1">Give it a name like "383 Stroker Street Build" or "LS Swap C10"</p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white px-8"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Start Build"
              )}
            </Button>
          </div>
        )}

        {/* Info note */}
        <div className="mt-8 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>More engines coming soon.</strong> We're starting with the two most popular platforms.
            Coyote 5.0, LS3, BBC 454, and more are on the roadmap.
          </p>
        </div>
      </div>
    </div>
  );
}
