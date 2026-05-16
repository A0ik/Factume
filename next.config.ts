import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Keep pdf-parse and html-pdf-node (puppeteer/chrome) out of the webpack bundle
  serverExternalPackages: ['pdf-parse', 'canvas', 'pdf-lib', 'html-pdf-node', 'puppeteer', 'puppeteer-core'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
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
      // Prevent webpack from trying to bundle native node modules
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'pdf-parse',
        'canvas',
        'html-pdf-node',
        'puppeteer',
        'puppeteer-core',
        'emitter',
        'inline-css',
        'extract-css',
        'batch',
      ];
    }
    return config;
  },
};

// Export with Sentry configuration
export default withSentryConfig(nextConfig, {
  silent: true,
  tunnelRoute: '/monitoring',
});
