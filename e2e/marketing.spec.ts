import { test, expect } from '@playwright/test';

const marketingPages = [
  '/facturation-auto-entrepreneur',
  '/facturation-btp',
  '/facturation-freelances',
  '/logiciel-facture-gratuit',
  '/facturation-vocale',
  '/facturation-ocr',
];

test.describe('Marketing Pages', () => {
  for (const pagePath of marketingPages) {
    test(`should load ${pagePath} with proper SEO`, async ({ page }) => {
      await page.goto(pagePath);

      // Check page loads
      await expect(page.locator('h1')).toBeVisible();

      // Check meta description
      const description = await page.getAttribute('meta[name="description"]', 'content');
      expect(description).toBeTruthy();
      expect(description?.length).toBeGreaterThan(50);

      // Check canonical URL
      const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
      expect(canonical).toContain('https://factu.me');
    });

    test(`should have working CTA on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);

      const ctaButton = page.locator('a[href="/register"]').first();
      await expect(ctaButton).toBeVisible();

      await ctaButton.click();
      await expect(page).toHaveURL('/register');
    });
  }

  test('should render FAQ section correctly', async ({ page }) => {
    await page.goto('/facturation-auto-entrepreneur');

    await expect(page.locator('text=Questions fréquentes')).toBeVisible();

    const firstQuestion = page.locator('details').first();
    await firstQuestion.click();
    await expect(firstQuestion.locator('.text-gray-600')).toBeVisible();
  });

  test('should have Schema.org FAQPage markup', async ({ page }) => {
    await page.goto('/facturation-auto-entrepreneur');

    const schemaScript = await page.locator('script[type="application/ld+json"]').textContent();
    expect(schemaScript).toContain('"@type": "FAQPage"');
    expect(schemaScript).toContain('"@type": "Question"');
  });
});
