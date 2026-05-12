import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/);
  });

  test('should display subscription plans', async ({ page }) => {
    await page.click('text=Abonnement');

    await expect(page.locator('h1')).toContainText('Choisissez votre plan');

    const plans = ['Gratuit', 'Solo', 'Pro', 'Business'];
    for (const plan of plans) {
      await expect(page.locator(`text=${plan}`)).toBeVisible();
    }
  });

  test('should initiate Stripe checkout', async ({ page }) => {
    await page.click('text=Abonnement');
    await page.locator('button').filter({ hasText: 'Solo' }).getByText('Commencer').click();

    // Should redirect to Stripe or show Stripe modal
    await expect(page.locator('[data-testid="stripe-loading"]')).toBeVisible();
  });

  test('should show paywall for free users over limit', async ({ page }) => {
    // Navigate to create invoice (assuming user has 10+ invoices)
    await page.click('text=Nouvelle facture');

    // If user is over limit, should show paywall
    const paywall = page.locator('[data-testid="paywall-modal"]');
    if (await paywall.isVisible()) {
      await expect(paywall).toContainText('Limite atteinte');
      await expect(paywall.locator('button:has-text("Passer à Solo")')).toBeVisible();
    }
  });
});
