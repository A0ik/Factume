import type { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

export const metadata: Metadata = {
  title: 'Factu.me — Facturation gratuite auto-entrepreneurs & TPE',
  description:
    "Créez vos factures gratuitement en quelques clics. Logiciel conforme loi française pour auto-entrepreneurs, freelances et TPE. Essai gratuit, sans CB.",
  alternates: {
    canonical: 'https://factu.me',
  },
  openGraph: {
    title: 'Factu.me — Facturation gratuite auto-entrepreneurs & TPE',
    description:
      'Créez vos factures gratuitement. Logiciel conforme loi française pour auto-entrepreneurs, freelances et TPE.',
    url: 'https://factu.me',
    siteName: 'Factu.me',
    type: 'website',
    images: [
      {
        url: '/api/og?title=Factu.me&description=Facturation%20gratuite%20auto-entrepreneurs%20%26%20TPE&theme=blue',
        width: 1200,
        height: 630,
        alt: 'Factu.me — Logiciel de facturation gratuit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factu.me — Facturation gratuite auto-entrepreneurs & TPE',
    description:
      'Créez vos factures gratuitement. Logiciel conforme pour auto-entrepreneurs et TPE.',
    images: ['/api/og?title=Factu.me&description=Facturation%20gratuite&theme=blue'],
  },
};

export default function Page() {
  return <LandingPageClient />;
}
