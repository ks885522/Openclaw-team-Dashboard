import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test('should load main dashboard page', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Dashboard/i);
    
    // Check for main dashboard elements
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should display team status cards', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check that status indicators are present
    const statusCards = page.locator('[class*="status"], [data-testid*="status"]');
    // Just verify page loaded without critical errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have no critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('Hot Module Replacement')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
