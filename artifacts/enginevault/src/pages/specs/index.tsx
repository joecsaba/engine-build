import { Link } from "wouter";
import { useGetEngineFamilies } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "lucide-react";

export default function SpecsIndex() {
  const { data: families, isLoading } = useGetEngineFamilies();

  return (
    <div className="container mx-auto max-w-6xl py-10 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Engine Specs Database</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Factory and performance specifications for the most popular engine families. Torque specs, clearances, dimensions, and casting number identification.
        </p>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Disclaimer:</strong> Always verify specifications against your factory service manual. Specs may vary by production year, casting, and application.
        </div>
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
              <div className="group block p-6 rounded-lg border bg-card hover:border-primary/60 hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {family.engineCount} engine{family.engineCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{family.name}</h2>
                <p className="text-sm text-muted-foreground mb-2">{family.manufacturer}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{family.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
