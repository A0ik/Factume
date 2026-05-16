import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog Factu.me – Conseils Facturation, Devis & Gestion pour Freelances',
  description:
    "Retrouvez nos guides, conseils et actualites sur la facturation, les devis, la gestion freelance et la reglementation. Tout pour optimiser votre activite d'auto-entrepreneur.",
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

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
