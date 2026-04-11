import { Link } from "wouter";
import { useGetArticles } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChevronRight } from "lucide-react";

export default function ArticlesIndex() {
  const { data: articles, isLoading } = useGetArticles({ limit: 20 });

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Articles &amp; Resources</h1>
        <p className="text-muted-foreground text-lg">Technical content for engine builders at every level.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {(articles ?? []).map((article) => (
            <Link key={article.slug} href={`/articles/${article.slug}`}>
              <div className="group flex items-start justify-between gap-4 p-6 rounded-lg border bg-card hover:border-primary/60 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">{article.category}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime} min read</span>
                  </div>
                  <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{article.title}</h2>
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
