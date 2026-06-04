import { useParams, Link } from "wouter";
import { useGetTutorial, getGetTutorialQueryKey } from "@/lib/api-client";
import { ArrowLeft, Clock, BarChart } from "lucide-react";

export default function TutorialDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const { data: tutorial, isLoading, isError } = useGetTutorial(id, { query: { enabled: !!id, queryKey: getGetTutorialQueryKey(id) } });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (isError || !tutorial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold mb-4 uppercase tracking-wider">Tutorial Not Found</h1>
        <Link href="/tutorials" className="text-primary hover:underline uppercase font-bold tracking-wider">Back to Academy</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="bg-secondary border-b border-border">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <Link href="/tutorials" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors uppercase text-sm font-bold tracking-wider mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to list
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">{tutorial.category}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-6">{tutorial.title}</h1>
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {tutorial.duration}</div>
            <div className="flex items-center gap-2"><BarChart className="w-4 h-4" /> {tutorial.level}</div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {tutorial.videoUrl ? (
            <div className="aspect-video bg-black rounded-xl mb-12 flex items-center justify-center border border-border overflow-hidden">
              <span className="text-muted-foreground">Video Player Placeholder: {tutorial.videoUrl}</span>
            </div>
          ) : (
            <img src={tutorial.imageUrl} alt={tutorial.title} className="w-full rounded-xl mb-12 border border-border" />
          )}

          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">{tutorial.description}</p>
            {/* Extended content would go here, using description as placeholder */}
            <p>Welcome to this comprehensive guide from Eclipse Angels Agency. We'll walk you through the essential steps to master this topic, providing industry secrets used by top creators.</p>
          </div>
          
          {tutorial.tags && tutorial.tags.length > 0 && (
            <div className="mt-12 flex gap-2 flex-wrap">
              {tutorial.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-secondary rounded text-sm text-muted-foreground">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
