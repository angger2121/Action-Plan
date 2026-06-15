const { test, expect } = require('@playwright/test');

test.describe('Client Portal Authentication & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    // Inject DUMMY DATA into localStorage before the page even loads.
    // This isolates our testing from production data ("pake data dummy aja").
    await page.addInitScript(() => {
      localStorage.setItem('mdi_clients', JSON.stringify([
        { name: 'Dummy Company', pin: '000000' }
      ]));
      localStorage.setItem('mdi_forms', JSON.stringify([
        { id: 'dummy_form_1', title: 'Dummy Leadership Training', clientName: 'Dummy Company', trainingDate: '10 - 11 Jan 2030' }
      ]));
      // Clear any saved sessions
      localStorage.removeItem('mdi_client_saved');
    });

    // Navigate to the client portal page.
    const path = require('path');
    const filePath = 'file://' + path.resolve(__dirname, '../clientportal.html');
    await page.goto(filePath);
  });

  test('should display error message on invalid login', async ({ page }) => {
    await page.fill('#login-username', 'WrongCompany');
    await page.fill('#login-pin', '123456');
    await page.click('button:has-text("Log in")');

    const errorMsg = page.locator('#login-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toHaveText('Username tidak ditemukan atau PIN salah. Silakan coba lagi.');
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    await page.fill('#login-username', 'Dummy Company');
    await page.fill('#login-pin', '000000');
    await page.click('button:has-text("Log in")');

    // Verify transition to profile view
    const profileView = page.locator('#profile-view');
    await expect(profileView).toBeVisible();

    // Verify company name is displayed in the header
    const brandName = page.locator('#pv-header-brand-name span');
    await expect(brandName).toContainText('Dummy Company');
  });

  test('Remember Me functionality should save and pre-fill credentials', async ({ page }) => {
    // 1. Login with Remember Me checked
    await page.fill('#login-username', 'Dummy Company');
    await page.fill('#login-pin', '000000');
    await page.check('#login-remember');
    await page.click('button:has-text("Log in")');

    // Wait for login to complete
    await expect(page.locator('#profile-view')).toBeVisible();

    // 2. Click Logout
    await page.click('button.logout-btn');

    // Wait for page to reload
    await page.waitForLoadState('domcontentloaded');

    // 3. Verify inputs are pre-filled after page reloads
    await expect(page.locator('#login-username')).toHaveValue('Dummy Company');
    await expect(page.locator('#login-pin')).toHaveValue('000000');
    await expect(page.locator('#login-remember')).toBeChecked();
  });

  test('should navigate to dashboard and back using SPA routing', async ({ page }) => {
    // Login
    await page.fill('#login-username', 'Dummy Company');
    await page.fill('#login-pin', '000000');
    await page.click('button:has-text("Log in")');
    await expect(page.locator('#profile-view')).toBeVisible();

    // Click on the Action Plan item to open dashboard
    // The dummy form we injected
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
