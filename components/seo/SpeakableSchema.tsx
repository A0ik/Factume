interface SpeakableSchemaProps {
  cssSelectors?: string[];
  xpaths?: string[];
  url?: string;
  name?: string;
  description?: string;
}

/**
 * SpeakableSpecification schema — marque les sections de la page
 * comme éligibles à la synthèse vocale (Google Assistant, Alexa, Siri).
 *
 * Loi 2 du Singularity : Speakable Domination.
 * Avantage concurrentiel massif — personne dans la niche n'utilise ce schema.
 */
export function SpeakableSchema({
  cssSelectors,
  xpaths,
  url,
  name,
  description,
}: SpeakableSchemaProps) {
  const speakableSpec: Record<string, unknown> = {
    '@type': 'SpeakableSpecification',
  };

  if (cssSelectors && cssSelectors.length > 0) {
    speakableSpec.cssSelector = cssSelectors;
  }
  if (xpaths && xpaths.length > 0) {
    speakableSpec.xpath = xpaths;
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
  };

  if (name) schema.name = name;
  if (url) schema.url = url;
  if (description) schema.description = description;

  schema.speakable = speakableSpec;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
