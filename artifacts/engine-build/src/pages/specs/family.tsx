import { Link, useParams } from "wouter";
import { useGetEngineFamily } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";

export default function EngineFamily() {
  const { slug } = useParams<{ slug: string }>();
  const { data: family, isLoading } = useGetEngineFamily(slug ?? "");

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-10 px-4">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 mb-3 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!family) {
    return (
      <div className="container mx-auto max-w-4xl py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Engine family not found</h1>
        <Link href="/specs"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Specs</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={family.manufacturer}
        title={family.name}
        subtitle={family.description ?? undefined}
        action={
          <Link href="/specs" className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Families
          </Link>
        }
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Disclaimer:</strong> Always verify specifications against your factory service manual. Specs may vary by production year, casting, and application.
        </div>

        <div className="space-y-3">
          {family.engines.map((engine) => (
            <Link key={engine.id} href={`/specs/${slug}/${engine.id}`}>
              <div className="group flex items-center justify-between p-5 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-sm transition-all cursor-pointer">
                <div>
                  <h2 className="font-bold text-lg group-hover:text-[#E85D04] transition-colors">{engine.name}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    <span>{engine.years}</span>
                    <span>{engine.displacement}</span>
                    {engine.horsepower && <span>{engine.horsepower} hp</span>}
                    {engine.applications && <span className="truncate max-w-xs">{engine.applications}</span>}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E85D04] transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
