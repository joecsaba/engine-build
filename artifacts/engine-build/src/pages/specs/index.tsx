import { Link } from "wouter";
import { useGetEngineFamilies } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Database } from "lucide-react";

export default function SpecsIndex() {
  const { data: families, isLoading } = useGetEngineFamilies();

  return (
    <div>
      <PageHeader
        eyebrow="Specs Database"
        title="Engine Specs Database"
        subtitle="Factory and performance specifications for the most popular engine families. Torque specs, clearances, dimensions, and casting number identification."
      />

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Disclaimer:</strong> Always verify specifications against your factory service manual. Specs may vary by production year, casting, and application.
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(families ?? []).map((family) => (
              <Link key={family.slug} href={`/specs/${family.slug}`}>
                <div className="group block p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center text-[#E85D04]">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium">
                      {family.engineCount} engine{family.engineCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-1 group-hover:text-[#E85D04] transition-colors">{family.name}</h2>
                  <p className="text-sm text-gray-500 mb-2 font-medium">{family.manufacturer}</p>
                  <p className="text-sm text-gray-400 line-clamp-2">{family.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
