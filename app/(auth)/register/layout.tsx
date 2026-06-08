import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription – Factu.me',
  description: 'Créez votre compte Factu.me et commencez à facturer intelligemment avec l\'IA. Essai gratuit 7 jours, sans carte bancaire.',
  alternates: { canonical: 'https://factu.me/register' },
  openGraph: {
    title: 'Inscription – Factu.me',
    description: 'Créez votre compte Factu.me. Facturation vocale IA, devis et contrats. Essai gratuit 7 jours.',
    url: 'https://factu.me/register',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Factu.me&description=Inscription&theme=blue', width: 1200, height: 630, alt: 'Inscription Factu.me' }],
  },
  robots: { index: false, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
