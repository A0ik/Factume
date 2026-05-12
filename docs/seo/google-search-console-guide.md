# Google Search Console Setup Guide for Factu.me

## Overview

This guide covers setting up Google Search Console (GSC) for Factu.me to monitor indexing, search performance, and SEO health.

## Prerequisites

- Google Account with admin access
- Factu.me domain verified in GSC
- sitemap.xml already generated

## Step 1: Verify Domain Ownership

### Option A: DNS Verification (Recommended)

1. Go to [Search Console](https://search.google.com/search-console)
2. Click "Add Property" → "URL Prefix"
3. Enter: `https://factu.me`
4. Choose "DNS verification"
5. Add TXT record to your DNS:

```
Type: TXT
Name: @
Value: google-site-verification=YOUR_VERIFICATION_CODE
```

### Option B: HTML File Upload

1. Download verification HTML file
2. Upload to `public/googleXXXXXXXXXXXXX.html`
3. Click "Verify"

## Step 2: Submit Sitemap

1. In GSC, go to **Sitemaps** in left sidebar
2. Enter sitemap URL: `https://factu.me/sitemap.xml`
3. Click **Submit**

### What's in the sitemap?

The `app/sitemap.ts` generates:
- Homepage
- App pages (with noindex)
- All marketing pages (40+)
- Blog articles (8+)
- Dynamic URLs as they're added

### Dynamic Sitemap Features

```typescript
// app/sitemap.ts generates:
- Core pages: /, /register, /login
- Marketing: /facturation-*, /logiciel-*, etc.
- Blog: /blog/* (slugs from lib/blog-data.ts)
- Products: /integrations, /pricing
```

## Step 3: Monitor Indexing

### Coverage Report

Check **Indexing → Coverage** to see:
- **Valid**: Pages successfully indexed
- **Excluded**: Pages with noindex or canonical tags
- **Error**: Pages that failed to index

### Expected Indexing Status

| Page Type | Expected Status | Reason |
|-----------|----------------|--------|
| Homepage | Valid | Main landing page |
| Marketing pages | Valid | SEO-focused content |
| Blog articles | Valid | Fresh content |
| App routes (dashboard, etc.) | Excluded | Protected by noindex |
| API routes | Excluded | Not content pages |

## Step 4: Request Indexing for New Pages

### Manual Indexing Request

For new marketing pages or blog posts:

1. Open **URL Inspection** tool in GSC
2. Enter full URL: `https://factu.me/facturation-ocr`
3. Click **Request indexing**
4. Google will crawl within 24-48 hours

### Bulk Indexing Requests

For multiple pages, use the API:

```bash
curl -X POST "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inspectionUrl": "https://factu.me/facturation-ocr",
    "siteUrl": "https://factu.me"
  }'
```

## Step 5: Monitor Core Web Vitals

### Page Experience Report

Check **Experience → Core Web Vitals** for:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Optimizations Already in Place

- Image optimization with Next.js Image
- Dynamic imports for code splitting
- Edge caching for marketing pages
- Font optimization

## Step 6: Mobile Usability

### Check Mobile Issues

1. Go to **Experience → Mobile Usability**
2. Fix any issues flagged:
   - Text too small
   - Clickable elements too close
   - Content wider than screen
   - Viewport not set

### Current Status

All marketing pages are mobile-responsive with Tailwind CSS.

## Step 7: Enhancements Tracking

### FAQPage Schema

Pages with FAQ sections include Schema.org markup:

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Question text?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Answer text"
      }
    }
  ]
}
```

This enables FAQ rich snippets in Google results.

### Rich Results Testing

1. Use [Rich Results Test](https://search.google.com/test/rich-results)
2. Enter page URL
3. Check for:
   - FAQPage markup
   - BreadcrumbList
   - Organization schema
   - Article schema (blog)

## Step 8: Performance Monitoring

### Search Performance Report

Track in **Performance** section:

| Metric | Good Target | Current Status |
|--------|-------------|----------------|
| CTR | > 3% | Monitor |
| Position | Top 10 | Monitor |
| Impressions | Growing | Monitor |
| Queries | Track keywords | Weekly |

### Key Queries to Track

- `logiciel facturation gratuit`
- `facture auto-entrepreneur`
- `facturation vocale`
- `facturation OCR`
- `logiciel facture freelance`

## Step 9: Security Issues

### Security Issues Report

Check **Security** section for:
- Hacked content
- Malware
- Spam

**Current Status**: All security headers in place (CSP, HSTS, etc.)

## Step 10: Manual Actions

### Manual Actions Report

Monitor for penalties from:
- Spammy structured markup
- Spammy structured markup on third-party sites
- Thin content
- Cloaking/sockpuppets

**Prevention**: Quality content, proper schema markup.

## Automation: API Integration

### Setup GSC API for Automated Monitoring

```typescript
// lib/google-search-console.ts
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const searchconsole = google.searchconsole({ version: 'v1', auth });

export async function getSearchAnalytics(
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: 100,
    },
  });
  return response.data.rows;
}
```

## Monitoring Checklist

### Daily (Automated)
- [ ] Coverage errors
- [ ] Security issues
- [ ] Manual actions

### Weekly
- [ ] Performance review (CTR, position, impressions)
- [ ] Mobile usability
- [ ] Core Web Vitals

### Monthly
- [ ] Index new pages
- [ ] Review top queries
- [ ] Check AMP pages (if any)
- [ ] Review rich results status

## Troubleshooting

### Pages Not Indexing

**Problem**: Page submitted but not indexed

**Solutions**:
1. Check robots.txt: `Disallow` rules
2. Check noindex meta tags
3. Verify canonical URLs
4. Check crawl stats in GSC
5. Ensure server returns 200 status

### Sitemap Errors

**Problem**: Sitemap shows errors

**Solutions**:
1. Validate XML at `sitemap.xml`
2. Check all URLs return 200 status
3. Verify UTF-8 encoding
4. Ensure sitemap < 50MB and < 50K URLs

### Drops in Rankings

**Problem**: Sudden traffic drop

**Solutions**:
1. Check Manual Actions report
2. Review algorithm updates
3. Check for technical SEO issues
4. Competitor analysis
5. Content refresh

## Resources

- [Google Search Console Help](https://support.google.com/webmasters/)
- [Schema.org Validators](https://validator.schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

## Next Steps

1. ✅ Verify domain in GSC
2. ✅ Submit sitemap
3. ✅ Request indexing for new marketing pages
4. ✅ Monitor performance weekly
5. ✅ Iterate on content based on query data
6. ✅ Fix any indexing issues promptly
