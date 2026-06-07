import type { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

export const metadata: Metadata = {
  title: 'Factu.me — Facture électronique avec IA vocale | Conforme loi 2026',
  description:
    'Dictez votre facture électronique Factur-X en français. Conforme EN 16931, prêt pour la loi septembre 2026. Essai gratuit sans CB.',
  alternates: {
    canonical: 'https://factu.me',
  },
  openGraph: {
    title: 'Factu.me — Facture électronique avec IA vocale',
    description:
      'Dictez votre facture électronique. Encaissez en 5 secondes. Conforme Factur-X / EN 16931.',
    url: 'https://factu.me',
    siteName: 'Factu.me',
    type: 'website',
    images: [
      {
        url: '/api/og?title=Factu.me&description=Facture%20electronique%20avec%20IA%20vocale&theme=blue',
        width: 1200,
        height: 630,
        alt: 'Factu.me — Facture électronique avec IA vocale',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factu.me — Facture électronique avec IA vocale',
    description:
      'Dictez votre facture électronique. Encaissez en 5 secondes.',
    images: ['/api/og?title=Factu.me&description=Facture%20electronique&theme=blue'],
  },
};

export default function Page() {
  return <LandingPageClient />;
}
