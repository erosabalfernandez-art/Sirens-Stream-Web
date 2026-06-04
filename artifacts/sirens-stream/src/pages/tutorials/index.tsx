import { useListTutorials } from "@/lib/api-client";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useState } from "react";

export default function TutorialsList() {
  const { data: tutorials, isLoading } = useListTutorials();
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? tutorials : tutorials?.filter(t => t.category === filter);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tight mb-6">
            Creator <span className="text-primary">Academy</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
            Exclusive insights, guides, and technical tutorials from our industry experts to elevate your broadcast.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex gap-4 mb-12 overflow-x-auto pb-4">
            {["all", "setup", "monetization", "growth", "technical", "branding"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-full uppercase tracking-wider font-bold text-sm whitespace-nowrap transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl h-80 animate-pulse" />
              ))
            ) : filtered?.length === 0 ? (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No tutorials found in this category.
              </div>
            ) : (
              filtered?.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl overflow-hidden group hover:border-primary/50 transition-colors"
                >
                  <Link href={`/tutorials/${t.id}`} className="block h-full">
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      {t.imageUrl && <img src={t.imageUrl} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">{t.category}</span>
                        <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-secondary">{t.level}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{t.duration}</span>
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-wide mb-2 line-clamp-2">{t.title}</h3>
                      <p className="text-muted-foreground line-clamp-2">{t.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
