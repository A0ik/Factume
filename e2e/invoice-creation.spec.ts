import { test, expect } from '@playwright/test';

test.describe('Invoice Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/);
  });

  test('should create a new invoice', async ({ page }) => {
    await page.click('text=Nouvelle facture');

    await expect(page).toHaveURL(/.*\/invoices\/new/);

    await page.fill('input[name="clientName"]', 'Client Test');
    await page.fill('input[name="clientEmail"]', 'client@example.com');

    await page.click('text=Ajouter une prestation');

    await page.fill('input[name="items.0.description"]', 'Développement web');
    await page.fill('input[name="items.0.quantity"]', '10');
    await page.fill('input[name="items.0.unitPrice"]', '50');

    const total = await page.locator('[data-testid="invoice-total"]').textContent();
    expect(total).toContain('500,00 €');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/invoices\/.*/);
    await expect(page.locator('text=Facture créée avec succès')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('text=Nouvelle facture');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Le nom du client est requis')).toBeVisible();
  });

  test('should allow voice input for invoice', async ({ page }) => {
    await page.click('text=Nouvelle facture');

    await page.click('[data-testid="voice-input-button"]');

    const voiceInput = page.locator('[data-testid="voice-input-modal"]');
    await expect(voiceInput).toBeVisible();

    // Simulate voice input (in real tests, this would use the actual voice API)
    await page.fill('[data-testid="voice-text-input"]', 'Facture 500 euros pour Martin, développement web');

    await page.click('[data-testid="voice-submit"]');

    await expect(page.locator('input[name="clientName"]')).toHaveValue('Martin');
  });
});
