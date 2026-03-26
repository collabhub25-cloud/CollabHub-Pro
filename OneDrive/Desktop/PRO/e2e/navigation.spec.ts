import { test, expect } from '@playwright/test';

test.describe('Navigation Guards', () => {
  test('unauthenticated access to /dashboard/founder redirects to /login', async ({ page }) => {
    // Clear all cookies to ensure no auth tokens
    await page.context().clearCookies();

    const response = await page.goto('/dashboard/founder');

    // Should either redirect to login page or the final URL should be /login
    const finalUrl = page.url();
    expect(finalUrl).toContain('/login');
  });

  test('unauthenticated access to /dashboard/investor redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/investor');
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated access to /dashboard/talent redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/talent');
    expect(page.url()).toContain('/login');
  });
});

test.describe('Static Pages', () => {
  test('privacy page loads', async ({ page }) => {
    const response = await page.goto('/privacy');
    expect(response?.status()).toBeLessThan(400);
  });

  test('terms page loads', async ({ page }) => {
    const response = await page.goto('/terms');
    expect(response?.status()).toBeLessThan(400);
  });

  test('signup founder page loads', async ({ page }) => {
    const response = await page.goto('/signup/founder');
    expect(response?.status()).toBeLessThan(400);
  });

  test('signup investor page loads', async ({ page }) => {
    const response = await page.goto('/signup/investor');
    expect(response?.status()).toBeLessThan(400);
  });

  test('signup talent page loads', async ({ page }) => {
    const response = await page.goto('/signup/talent');
    expect(response?.status()).toBeLessThan(400);
  });
});
