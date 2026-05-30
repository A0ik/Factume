import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://factu.me';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/blog',
          '/legal',
          '/demo',
          '/login',
          '/register',
          '/modeles-facture',
          '/comment-facturer',
          '/securite',
          '/experts',
          '/facture-gratuite',
          '/alternative-henrj',
          '/alternative-tiime',
          '/alternative-abby',
          '/mentions-obligatoires-facture',
          '/generateur-facture',
          '/blog',
        ],
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
