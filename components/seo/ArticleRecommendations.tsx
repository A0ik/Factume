import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface RecommendedArticle {
  href: string;
  title: string;
  description: string;
}

export function ArticleRecommendations({ articles }: { articles: RecommendedArticle[] }) {
  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Articles recommandés</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            className="group block p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
              {article.title}
            </h4>
            <p className="text-sm text-gray-600 line-clamp-2">{article.description}</p>
            <span className="inline-flex items-center gap-1 text-sm text-purple-600 mt-3 font-medium">
              Lire l'article <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
