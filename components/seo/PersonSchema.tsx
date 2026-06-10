interface PersonSchemaProps {
  name: string;
  jobTitle: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  description?: string;
  worksFor?: {
    name: string;
    url: string;
  };
  knowsAbout?: string[];
}

export function PersonSchema({ name, jobTitle, url, image, sameAs, description, worksFor, knowsAbout }: PersonSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle,
  };

  if (url) schema.url = url;
  if (image) schema.image = image;
  if (sameAs) schema.sameAs = sameAs;
  if (description) schema.description = description;
  if (worksFor) {
    schema.worksFor = {
      '@type': 'Organization',
      name: worksFor.name,
      url: worksFor.url,
    };
  }
  if (knowsAbout) schema.knowsAbout = knowsAbout;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
