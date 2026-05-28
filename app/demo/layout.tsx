import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Démo Factu.me – Essayez la facturation vocale IA en direct',
  description: 'Testez la démo interactive de Factu.me : dictez une facture et voyez l\'IA la générer en temps réel. Gratuit, sans inscription.',
  alternates: { canonical: 'https://factu.me/demo' },
  openGraph: {
    title: 'Démo Factu.me – Facturation vocale IA',
    description: 'Testez la facturation vocale IA en direct. Dictez, générez, téléchargez.',
    url: 'https://factu.me/demo',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Demo%20Factu.me&description=Testez%20la%20facturation%20vocale%20IA&theme=purple', width: 1200, height: 630, alt: 'Démo Factu.me' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Démo Factu.me – Facturation vocale IA',
    description: 'Testez la facturation vocale IA en direct.',
    images: ['/api/og?title=Demo%20Factu.me&description=Facturation%20vocale%20IA&theme=purple'],
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
