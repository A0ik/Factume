import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales & CGU – Factu.me',
  description: 'Mentions légales, conditions générales et politique de confidentialité de Factu.me.',
  alternates: { canonical: 'https://factu.me/legal' },
  openGraph: {
    title: 'Mentions légales – Factu.me',
    description: 'Informations légales de Factu.me.',
    url: 'https://factu.me/legal',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Factu.me&description=Mentions%20legales&theme=blue', width: 1200, height: 630, alt: 'Factu.me Legal' }],
  },
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
