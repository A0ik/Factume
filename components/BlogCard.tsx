import Link from 'next/link';
import { Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import type { BlogPost } from '@/lib/blog-data';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

const categoryColors: Record<string, string> = {
  Guide: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Reglementation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Pratique: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Gestion: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Outils: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Conseils: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  const colorClass = categoryColors[post.category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';

  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image placeholder */}
            <div className="relative h-64 md:h-full bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-primary" />
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                  {post.category}
                </span>
              </div>
            </div>
            {/* Content */}
            <div className="p-6 lg:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readTime}
                </span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                {post.description}
              </p>
              <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                Lire l&apos;article
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        {/* Image placeholder */}
        <div className="relative h-44 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Tag className="w-6 h-6 text-primary" />
          </div>
          <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {post.category}
          </span>
        </div>
        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 flex-1">
            {post.description}
          </p>
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
            Lire l&apos;article
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </article>
    </Link>
  );
}
