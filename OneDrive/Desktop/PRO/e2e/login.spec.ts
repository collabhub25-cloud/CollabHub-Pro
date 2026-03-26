import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders sign-in heading', async ({ page }) => {
    await expect(page.getByText('Sign in to AlloySphere')).toBeVisible();
  });

  test('renders role selection buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /founder/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /investor/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /talent/i })).toBeVisible();
  });

  test('renders Google sign-in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('role selection buttons are clickable', async ({ page }) => {
    const investorBtn = page.getByRole('button', { name: /investor/i });
    await investorBtn.click();
    // After clicking investor, the "Create an account" link should update
    const signupLink = page.getByText('Create an account');
    await expect(signupLink).toBeVisible();
  });

  test('create account link is present', async ({ page }) => {
    const link = page.getByText('Create an account');
    await expect(link).toBeVisible();
  });

  test('privacy and terms links are present', async ({ page }) => {
    await expect(page.getByText('Privacy Policy')).toBeVisible();
    await expect(page.getByText('Terms of Service')).toBeVisible();
  });

  test('branding section is visible on desktop', async ({ page }) => {
    // Only visible on large screens (lg: breakpoint)
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(page.getByText(/Architecting the future/)).toBeVisible();
    }
  });

  test('select your role label is visible', async ({ page }) => {
    await expect(page.getByText(/select your role/i).first()).toBeVisible();
  });
});
