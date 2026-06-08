import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité – Factu.me',
  description: 'Politique de confidentialité Factu.me. Protection des données personnelles, RGPD, sécurité et droits des utilisateurs.',
  alternates: { canonical: 'https://factu.me/legal/confidentialite' },
  openGraph: {
    title: 'Politique de Confidentialité – Factu.me',
    description: 'Protection des données personnelles Factu.me — RGPD, sécurité, droits.',
    url: 'https://factu.me/legal/confidentialite',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Factu.me&description=Confidentialite&theme=blue', width: 1200, height: 630, alt: 'Confidentialité Factu.me' }],
  },
  robots: { index: true, follow: true },
};

export default function ConfidentialiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
