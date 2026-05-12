import { ReactNode } from 'react';
import { getFAQsForPage } from '@/lib/faq-data';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}

export function generateJsonLd() {
  const faqs = getFAQsForPage('facturation-auto-entrepreneur');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
