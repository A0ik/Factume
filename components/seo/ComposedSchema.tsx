interface SchemaDefinition {
  '@context'?: string;
  '@type': string;
  [key: string]: unknown;
}

/**
 * ComposedSchema — empile plusieurs schemas JSON-LD en un seul bloc @graph.
 * Loi 6 : Schema Layering.
 * Usage: <ComposedSchema schemas={[faqSchema, howToSchema, breadcrumbSchema]} />
 */
export function ComposedSchema({ schemas }: { schemas: SchemaDefinition[] }) {
  // Strip @context from individual schemas, we'll add it at the top level
  const cleanedSchemas = schemas.map(({ '@context': _, ...rest }) => rest);

  const graph = {
    '@context': 'https://schema.org',
    '@graph': cleanedSchemas,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
