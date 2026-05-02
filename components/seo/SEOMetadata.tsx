'use client';

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

export function SEOMetadata({
  title = 'Factu.me – Facturation intelligente',
  description = 'Créez des factures, devis et avoirs en quelques secondes avec la dictée vocale et l\'IA. Solution idéale pour freelances, indépendants et petites entreprises.',
  ogImage = '/og-image.png',
  ogUrl,
  canonicalUrl,
  noIndex = false,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    // Update page title
    if (title) {
      document.title = title;
    }

    // Update or create meta description
    updateMetaTag('name', 'description', description);

    // Open Graph tags
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', ogImage);
    if (ogUrl) {
      updateMetaTag('property', 'og:url', ogUrl);
    }
    updateMetaTag('property', 'og:type', 'website');
    updateMetaTag('property', 'og:locale', 'fr_FR');

    // Twitter Card tags
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', ogImage);

    // Canonical URL
    if (canonicalUrl) {
      updateLinkTag('canonical', canonicalUrl);
    }

    // Robots meta
    if (noIndex) {
      updateMetaTag('name', 'robots', 'noindex, nofollow');
    }

    // JSON-LD structured data
    if (jsonLd) {
      updateJsonLd(jsonLd);
    }
  }, [title, description, ogImage, ogUrl, canonicalUrl, noIndex, jsonLd]);

  return null;
}

function updateMetaTag(attrName: string, attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function updateJsonLd(data: Record<string, unknown>) {
  let element = document.getElementById('structured-data') as HTMLScriptElement;

  if (!element) {
    element = document.createElement('script');
    element.id = 'structured-data';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

// Helper to generate organization JSON-LD
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Factu.me',
    description: 'Solution de facturation intelligente pour indépendants et petites entreprises',
    url: 'https://factu.me',
    logo: 'https://factu.me/icons/icon.svg',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'contact@factu.me',
      availableLanguage: 'French',
    },
    sameAs: [
      'https://twitter.com/factume',
      'https://linkedin.com/company/factume',
    ],
  };
}

// Helper to generate website JSON-LD
export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Factu.me',
    url: 'https://factu.me',
    description: 'Créez des factures, devis et avoirs en quelques secondes avec la dictée vocale et l\'IA',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://factu.me/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

// Helper to generate software application JSON-LD
export function generateSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Factu.me',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Gratuit jusqu\'à 5 factures par mois',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '250',
    },
  };
}
