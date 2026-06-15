const { test, expect } = require('@playwright/test');

test.describe('Client Portal Authentication & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the client portal page.
    // For local testing without a web server, we use the file:// protocol.
    const path = require('path');
    const filePath = 'file://' + path.resolve(__dirname, '../clientportal.html');
    await page.goto(filePath);
  });

  test('should display error message on invalid login', async ({ page }) => {
    await page.fill('#login-username', 'WrongCompany');
    await page.fill('#login-pin', '0101');
    await page.click('button:has-text("Log in")');

    const errorMsg = page.locator('#login-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toHaveText('Username tidak ditemukan atau PIN salah. Silakan coba lagi.');
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    // Using one of the mock credentials: Yusen Logistic / 0101
    await page.fill('#login-username', 'Yusen Logistic');
    await page.fill('#login-pin', '0101');
    await page.click('button:has-text("Log in")');

    // Verify transition to profile view
    const profileView = page.locator('#profile-view');
    await expect(profileView).toBeVisible();

    // Verify company name is displayed in the header
    const brandName = page.locator('#pv-header-brand-name span');
    await expect(brandName).toContainText('Yusen Logistic');
  });

  test('Remember Me functionality should save and pre-fill credentials', async ({ page, context }) => {
    // 1. Login with Remember Me checked
    await page.fill('#login-username', 'Yusen Logistic');
    await page.fill('#login-pin', '0101');
    await page.check('#login-remember');
    await page.click('button:has-text("Log in")');

    // Wait for login to complete
    await expect(page.locator('#profile-view')).toBeVisible();

    // 2. Click Logout
    // Since our logout calls location.reload(), we can intercept it or just reload the page to simulate.
    await page.click('button.logout-btn');

    // 3. Verify inputs are pre-filled after page reloads
    await expect(page.locator('#login-username')).toHaveValue('Yusen Logistic');
    await expect(page.locator('#login-pin')).toHaveValue('0101');
    await expect(page.locator('#login-remember')).toBeChecked();
  });

  test('should navigate to dashboard and back using SPA routing', async ({ page }) => {
    // Login
    await page.fill('#login-username', 'Yusen Logistic');
    await page.fill('#login-pin', '0101');
    await page.click('button:has-text("Log in")');
    await expect(page.locator('#profile-view')).toBeVisible();

    // Click on the Action Plan item to open dashboard
    // Wait for the dynamic list to render
    const apItem = page.locator('.ap-item').first();
    await apItem.waitFor({ state: 'visible' });
    await apItem.click();

    // Verify dashboard is visible and profile is hidden
    await expect(page.locator('#dashboard-view')).toBeVisible();
    await expect(page.locator('#profile-view')).toBeHidden();

    // Click the back button
    await page.click('#back-btn');

    // Verify profile is back
    await expect(page.locator('#profile-view')).toBeVisible();
    await expect(page.locator('#dashboard-view')).toBeHidden();
  });
});
