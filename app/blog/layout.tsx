import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog Factu.me – Conseils Facturation, Devis & Gestion pour Freelances',
  description:
    "Retrouvez nos guides, conseils et actualités sur la facturation, les devis, la gestion freelance et la réglementation. Tout pour optimiser votre activité d'auto-entrepreneur.",
  alternates: {
    canonical: 'https://factu.me/blog',
  },
  openGraph: {
    title: 'Blog Factu.me – Conseils Facturation & Gestion',
    description:
      'Guides, conseils et actualités sur la facturation pour freelances et auto-entrepreneurs.',
    url: 'https://factu.me/blog',
    type: 'website',
    images: [
      {
        url: '/api/og?title=Blog%20Factu.me&description=Conseils%20facturation%20freelances&theme=blue',
        width: 1200,
        height: 630,
        alt: 'Blog Factu.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog Factu.me – Conseils Facturation & Gestion',
    description: 'Guides, conseils et actualités sur la facturation pour freelances et auto-entrepreneurs.',
    images: ['/api/og?title=Blog%20Factu.me&description=Conseils%20facturation&theme=blue'],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
