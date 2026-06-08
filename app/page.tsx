import type { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

export const metadata: Metadata = {
  title: 'Factu.me — Facture Électronique IA Vocale | Devis & Contrats | Conforme 2026',
  description:
    'Assistant administratif IA : dictez vos factures électroniques Factur-X, créez devis et contrats CDI/CDD. Conforme réforme septembre 2026. Essai gratuit sans carte bancaire. Pour artisans, freelances et TPE.',
  alternates: {
    canonical: 'https://factu.me',
  },
  openGraph: {
    title: 'Factu.me — Facture Électronique avec Dictée Vocale IA',
    description:
      'Dictez votre facture électronique Factur-X, créez devis et contrats. Conforme réforme 2026. Essai gratuit sans CB.',
    url: 'https://factu.me',
    siteName: 'Factu.me',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/api/og?title=Factu.me&description=Facture%20electronique%20avec%20IA%20vocale&theme=blue',
        width: 1200,
        height: 630,
        alt: 'Factu.me — Assistant administratif IA pour artisans, freelances et TPE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factu.me — Facture Électronique IA Vocale | Conforme 2026',
    description:
      'Dictez vos factures électroniques. Créez devis et contrats. Essai gratuit.',
    images: ['/api/og?title=Factu.me&description=Facture%20electronique&theme=blue'],
  },
};

export default function Page() {
  return <LandingPageClient />;
}
