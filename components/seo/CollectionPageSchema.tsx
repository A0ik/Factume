interface CollectionPageSchemaProps {
  name: string;
  description: string;
  url: string;
  hasPart: {
    name: string;
    url: string;
    description?: string;
  }[];
}

/**
 * CollectionPage schema — établit des relations hasPart entre un hub
 * et ses pages enfants. Renforce la compréhension topique de Google.
 * Loi 4 : Autorité Topique Nucléaire.
 */
export function CollectionPageSchema({ name, description, url, hasPart }: CollectionPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    hasPart: hasPart.map(part => ({
      '@type': 'WebPage',
      name: part.name,
      url: part.url,
      ...(part.description ? { description: part.description } : {}),
      isPartOf: {
        '@type': 'CollectionPage',
        url,
        name,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
