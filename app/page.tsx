import type { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

export const metadata: Metadata = {
  title: 'Facture IA & Facture Voix — Créez vos factures par intelligence artificielle | Factu.me',
  description:
    'Facture IA : générez vos factures électroniques par intelligence artificielle. Facture voix : dictez vos factures à voix haute. Conforme Factur-X et réforme 2026. Essai gratuit sans CB.',
  alternates: {
    canonical: 'https://factu.me',
  },
  openGraph: {
    title: 'Factu.me — Facture IA & Facture Voix : dictez vos factures par intelligence artificielle',
    description:
      'Facture IA et facture voix : créez vos factures électroniques par IA ou dictée vocale. Conforme réforme 2026. Essai gratuit sans CB.',
    url: 'https://factu.me',
    siteName: 'Factu.me',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/api/og?title=Factu.me&description=Facture%20IA%20et%20Facture%20Voix&theme=blue',
        width: 1200,
        height: 630,
        alt: 'Factu.me — Facture IA et Facture Voix pour artisans, freelances et TPE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factu.me — Facture IA & Facture Voix | Conforme 2026',
    description:
      'Facture IA : intelligence artificielle pour vos factures. Facture voix : dictez à voix haute. Essai gratuit.',
    images: ['/api/og?title=Factu.me&description=Facture%20IA%20Facture%20Voix&theme=blue'],
  },
};

export default function Page() {
  return <LandingPageClient />;
}
