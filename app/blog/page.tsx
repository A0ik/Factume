import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ArrowRight, Zap, Search } from 'lucide-react';
import { blogPosts, getAllCategories } from '@/lib/blog-data';
import { BlogCard } from '@/components/BlogCard';

export const metadata: Metadata = {
  title: 'Blog Factu.me – Conseils Facturation, Devis & Gestion pour Freelances',
  description:
    'Retrouvez nos guides, conseils et actualites sur la facturation, les devis, la gestion freelance et la reglementation. Tout pour optimiser votre activite d\'auto-entrepreneur.',
  alternates: {
    canonical: 'https://factu.me/blog',
  },
  openGraph: {
    title: 'Blog Factu.me – Conseils Facturation & Gestion',
    description:
      'Guides, conseils et actualites sur la facturation pour freelances et auto-entrepreneurs.',
    url: 'https://factu.me/blog',
    type: 'website',
  },
};

export default function BlogPage() {
  const categories = getAllCategories();
  const [featured, ...rest] = blogPosts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Factu<span className="text-primary">.me</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            Retour
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
            <BookOpen className="w-4 h-4" />
            Blog Factu.me
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6">
            Conseils{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">
              Facturation
            </span>{' '}
            &amp; Gestion
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Guides pratiques, conseils d&#39;experts et actualites pour optimiser votre
            facturation de freelance ou auto-entrepreneur. Soyez paye plus vite et en regle.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Categories :</span>
          {categories.map((category) => (
            <span
              key={category}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
            >
              {category}
            </span>
          ))}
        </div>

        {/* Featured Post */}
        <section className="mb-16">
          <BlogCard post={featured} featured />
        </section>

        {/* Post Grid */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Tous les articles
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="mt-20 rounded-3xl bg-gradient-to-r from-primary to-primary-dark p-8 lg:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">
              Pret a simplifier votre facturation ?
            </h3>
            <p className="text-white/90 max-w-xl mx-auto mb-8 text-lg">
              Testez Factu.me gratuitement pendant 4 jours. Creation de factures par
              dictee vocale, relances automatisees, conformite garantie.
            </p>
            <Link
              href="/register?plan=solo&trial=4"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold bg-white text-primary hover:bg-gray-100 shadow-xl transition-all group"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Factu<span className="text-primary">.me</span>
            </span>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().getFullYear()} Factu.me – Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  );
}
