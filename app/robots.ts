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
          '/modeles-facture',
          // GATEKEEPER : /login et /register sont retirés du allow explicite.
          // Ce sont des funnels d'auth (noindex), pas des cibles SEO — les laisser
          // dans allow n'apportait rien. Ils restent crawlables (via allow '/') pour
          // que Google confirme le noindex, mais ne consomment plus de budget de crawl
          // déclaré.
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
          // GATEKEEPER — Loi des Paramètres : les URLs de transaction (?plan=,
          // &billing=, &trial=) ne sont JAMAIS des pages SEO distinctes — c'est la
          // même page /register avec des préférences utilisateur. On bloque leur
          // crawl pour préserver le budget de crawl Google et tuer le contenu
          // dupliqué paramétré ("Page en double" + bruit noindex dans GSC).
          // NB : /register nu reste crawlable (allow '/') pour que Google confirme
          // le noindex — on ne disallow JAMAIS une page qu'on a noindexée.
          '/register?*',
          '/login?*',
          '/*?plan=',
          '/*?billing=',
          '/*?trial=',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
