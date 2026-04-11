import { Link, useParams } from "wouter";
import { useGetArticle } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock } from "lucide-react";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useGetArticle(slug ?? "");

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-10 px-4">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-6 w-48 mb-8" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto max-w-3xl py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Article not found</h1>
        <Link href="/articles" className="text-primary hover:underline">Back to Articles</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Link href="/articles" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> All Articles
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">{article.category}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime} min read</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">{article.title}</h1>
        <p className="text-lg text-muted-foreground">{article.excerpt}</p>
        <p className="text-sm text-muted-foreground mt-2">{new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {article.tags.map(tag => (
              <span key={tag} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="prose prose-neutral max-w-none text-foreground">
        <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>') }} />
      </div>

      <div className="mt-12 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        <strong>Disclaimer:</strong> Always verify specifications and procedures against your factory service manual. Engine building procedures involve significant safety risks. When in doubt, consult a qualified professional engine builder.
      </div>
    </div>
  );
}
