import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente – Factu.me',
  description: 'CGV de Factu.me. Modalités de vente, tarification, paiement, rétractation et remboursement des abonnements.',
  alternates: { canonical: 'https://factu.me/legal/cgv' },
  openGraph: {
    title: 'Conditions Générales de Vente – Factu.me',
    description: 'CGV Factu.me — tarification, paiement, rétractation et remboursement.',
    url: 'https://factu.me/legal/cgv',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Factu.me&description=CGV&theme=blue', width: 1200, height: 630, alt: 'CGV Factu.me' }],
  },
  robots: { index: true, follow: true },
};

export default function CGVLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
