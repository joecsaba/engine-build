import { Link } from "wouter";
import { useGetArticles } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Clock, ChevronRight } from "lucide-react";

export default function ArticlesIndex() {
  const { data: articles, isLoading } = useGetArticles({ limit: 20 });

  return (
    <div>
      <PageHeader
        eyebrow="Knowledge Base"
        title="Articles & Resources"
        subtitle="Technical content for engine builders at every level."
      />

      <div className="container mx-auto max-w-5xl px-4 py-10">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {(articles ?? []).map((article) => (
              <Link key={article.slug} href={`/articles/${article.slug}`}>
                <div className="group flex items-start justify-between gap-4 p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-[#E85D04]/10 text-[#E85D04] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">{article.category}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime} min read</span>
                    </div>
                    <h2 className="text-xl font-bold mb-1 group-hover:text-[#E85D04] transition-colors">{article.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-2">{article.excerpt}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E85D04] shrink-0 mt-1 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
