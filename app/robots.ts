import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://factu.me';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
              '/app/',
              '/api/',
              '/share/',
              '/sign/',
              '/client/',
              '/dashboard',
              '/invoices',
              '/documents',
              '/clients',
              '/settings',
              '/expenses',
              '/contracts',
              '/crm',
              '/recurring',
              '/notifications',
              '/accounting',
              '/activity',
              '/banking',
              '/capture',
              '/cabinet',
              '/products',
              '/calendar',
              '/workspace',
              '/paywall',
              '/trial',
              '/data-health',
              '/integrations',
            ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
