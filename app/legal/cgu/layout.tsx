import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation – Factu.me',
  description: 'CGU de la plateforme Factu.me. Conditions d\'utilisation du service de facturation IA, devis, contrats et gestion d\'entreprise.',
  alternates: { canonical: 'https://factu.me/legal/cgu' },
  openGraph: {
    title: 'Conditions Générales d\'Utilisation – Factu.me',
    description: 'CGU de la plateforme Factu.me — facturation IA, devis et contrats.',
    url: 'https://factu.me/legal/cgu',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Factu.me&description=CGU&theme=blue', width: 1200, height: 630, alt: 'CGU Factu.me' }],
  },
  robots: { index: true, follow: true },
};

export default function CGULayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
