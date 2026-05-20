import { blogPosts } from '@/lib/blog-data';

export async function GET() {
  const baseUrl = 'https://factu.me';

  const items = blogPosts.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>contact@factu.me (Équipe Factu.me)</author>
      <category>${post.category}</category>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Factu.me — Blog Facturation &amp; Comptabilité</title>
    <link>${baseUrl}/blog</link>
    <description>Conseils, guides et actualités sur la facturation, la comptabilité et la gestion d'entreprise pour freelances, auto-entrepreneurs et TPE.</description>
    <language>fr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <copyright>Copyright ${new Date().getFullYear()} Factu.me</copyright>
    <managingEditor>contact@factu.me (Équipe Factu.me)</managingEditor>
    <webMaster>contact@factu.me (Équipe Factu.me)</webMaster>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
