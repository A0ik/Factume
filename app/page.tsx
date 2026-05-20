import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const LandingPageClient = dynamic(() => import('./LandingPageClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Factu.me — Logiciel de facturation gratuit pour auto-entrepreneurs et TPE',
  description:
    "Créez et envoyez vos factures gratuitement en quelques clics. Logiciel de facturation conforme à la loi française pour auto-entrepreneurs, freelances et TPE. Essai gratuit, sans carte bancaire.",
  alternates: {
    canonical: 'https://factu.me',
  },
  openGraph: {
    title: 'Factu.me — Logiciel de facturation gratuit pour auto-entrepreneurs et TPE',
    description:
      "Créez et envoyez vos factures gratuitement en quelques clics. Logiciel de facturation conforme à la loi française pour auto-entrepreneurs, freelances et TPE.",
    url: 'https://factu.me',
    siteName: 'Factu.me',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Factu.me — Logiciel de facturation gratuit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factu.me — Logiciel de facturation gratuit pour auto-entrepreneurs et TPE',
    description:
      "Créez et envoyez vos factures gratuitement en quelques clics. Logiciel de facturation conforme à la loi française.",
    images: ['/og-image.png'],
  },
};

export default function Page() {
  return <LandingPageClient />;
}
