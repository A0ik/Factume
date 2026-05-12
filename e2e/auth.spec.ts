import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow user to sign up', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('h1')).toContainText('Créez votre compte');

    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.fill('input[name="fullName"]', 'Test User');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Tableau de bord');
  });

  test('should show validation errors for invalid signup', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Email invalide')).toBeVisible();
  });

  test('should allow user to login', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('Connexion');

    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Email ou mot de passe incorrect')).toBeVisible();
  });
});
