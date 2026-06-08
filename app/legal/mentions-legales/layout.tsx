import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions Légales – Factu.me',
  description: 'Mentions légales de Factu.me. Éditeur, hébergement, propriété intellectuelle et conformité légale.',
  alternates: { canonical: 'https://factu.me/legal/mentions-legales' },
  openGraph: {
    title: 'Mentions Légales – Factu.me',
    description: 'Mentions légales Factu.me — éditeur, hébergement, conformité.',
    url: 'https://factu.me/legal/mentions-legales',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Factu.me&description=Mentions+legales&theme=blue', width: 1200, height: 630, alt: 'Mentions légales Factu.me' }],
  },
  robots: { index: true, follow: true },
};

export default function MentionsLegalesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
