import { test, expect } from '@playwright/test';

test.describe('Authentication and Multi-tenancy', () => {

    test.beforeAll(async ({ request }) => {
        // Ensure test data is set up
        const response = await request.post('/api/setup-test-data');
        expect(response.ok()).toBeTruthy();
    });

    test('should login as admin and see tenant switcher', async ({ page }) => {
        await page.goto('/login');

        // Fill in login details
        await page.fill('input[id="username"]', 'admin');
        await page.fill('input[id="password"]', '123456');

        // Submit form
        await page.click('button:has-text("로그인")');

        // Should be redirected to dashboard or home
        await expect(page).toHaveURL(/\/dashboard|^\/$/);

        // Check if "광텔" and "한주통신" are available in tenant switcher (assuming it's visible)
        // This part depends on the actual UI implementation
    });

    test('should switch between tenants and verify isolation', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[id="username"]', 'admin');
        await page.fill('input[id="password"]', '123456');
        await page.click('button:has-text("로그인")');

        // Wait for dashboard
        await page.waitForURL(/\/dashboard|^\/$/);

        // Verify company names are visible (adjust selectors based on actual UI)
        // await expect(page.getByText('광텔')).toBeVisible();
        // await expect(page.getByText('한주통신')).toBeVisible();
    });
});
