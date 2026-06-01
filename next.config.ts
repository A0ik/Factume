import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'canvas', 'pdf-lib'],

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  trailingSlash: false,

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
    ],
  },

  async redirects() {
    return [
      { source: '/facturation-plomberie', destination: '/modeles-facture/plombier', permanent: true },
      { source: '/facturation-electricien', destination: '/modeles-facture/electricien', permanent: true },
      { source: '/facturation-menuiserie', destination: '/modeles-facture/menuisier', permanent: true },
      { source: '/facturation-developpeur', destination: '/modeles-facture/developpeur', permanent: true },
      { source: '/facturation-designer', destination: '/modeles-facture/designer', permanent: true },
      { source: '/facturation-consultant', destination: '/modeles-facture/consultant', permanent: true },
      // Canvas + Copilot unified creation page redirects
      { source: '/documents/factures/new', destination: '/documents/create?type=invoice', permanent: false },
      { source: '/documents/devis/new', destination: '/documents/create?type=quote', permanent: false },
      { source: '/documents/avoirs/new', destination: '/documents/create?type=credit_note', permanent: false },
      { source: '/documents/acomptes/new', destination: '/documents/create?type=deposit', permanent: false },
      { source: '/documents/commandes/new', destination: '/documents/create?type=purchase_order', permanent: false },
      { source: '/documents/livraisons/new', destination: '/documents/create?type=delivery_note', permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ];
  },

  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'pdf-parse',
        'canvas',
      ];
    }
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  tunnelRoute: '/monitoring',
});
