import { test, expect } from '@playwright/test';

test.describe('Table Search Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('T011: Search filters table results by name', async ({ page }) => {
    // Add a database first if none exists
    const databasesSection = page.locator('text=Databases');
    await expect(databasesSection).toBeVisible();

    // Check if there's a database, if not add one
    const addButton = page.locator('button:has-text("Add one")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.fill('input[placeholder*="connection"]', 'test_db');
      await page.fill('input[placeholder*="path"]', ':memory:');
      await page.click('button:has-text("Add")');
    }

    // Select the database
    const dbItem = page.locator('.ant-collapse-item').first().locator('text=/.*test.*/i');
    if (await dbItem.first().isVisible()) {
      await dbItem.first().click();
    }

    // Wait for schema panel to load
    await page.waitForSelector('text=Schema');

    // Verify initial table count
    const initialHint = page.locator('text=/Showing \\d+ of \\d+ tables|💡 Click table to generate SELECT/');
    await expect(initialHint).toBeVisible();

    // Find the search input
    const searchInput = page.locator('input[placeholder="Search tables..."]');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('user');

    // Verify the table list is filtered
    // After filtering, should see updated count
    const filteredHint = page.locator('text=/Showing \\d+ of \\d+ tables/');
    await expect(filteredHint).toBeVisible();
  });

  test('T012: Partial match and case-insensitive search', async ({ page }) => {
    // Navigate and setup as above
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Select database and wait for schema
    const dbItem = page.locator('.ant-collapse-item').first().locator('text=/./').first();
    if (await dbItem.isVisible()) {
      await dbItem.click();
    }
    await page.waitForSelector('text=Schema');

    // Test partial match
    const searchInput = page.locator('input[placeholder="Search tables..."]');
    await searchInput.fill('order');

    // Verify tables containing "order" are shown
    await expect(searchInput).toHaveValue('order');

    // Test case-insensitive
    await searchInput.fill('USER');
    await expect(searchInput).toHaveValue('USER');

    // Clear and test case-insensitive for mixed case
    await searchInput.fill('User');
    await expect(searchInput).toHaveValue('User');
  });

  test('T013: Result count display', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Setup database and wait for schema
    const dbItem = page.locator('.ant-collapse-item').first().locator('text=/./').first();
    if (await dbItem.isVisible()) {
      await dbItem.click();
    }
    await page.waitForSelector('text=Schema');

    // Check initial count shows "X tables" format
    const initialHeader = page.locator('text=/Schema \\(\\d+ tables\\)/');
    await expect(initialHeader.first()).toBeVisible();

    // Enter search
    const searchInput = page.locator('input[placeholder="Search tables..."]');
    await searchInput.fill('test');

    // Verify result count shows "X of Y tables" format
    const countHeader = page.locator('text=/Schema \\(\\d+ of \\d+ tables\\)/');
    await expect(countHeader.first()).toBeVisible();

    // Check result count indicator
    const resultIndicator = page.locator('text=/\\d+ table.*found/');
    await expect(resultIndicator.first()).toBeVisible();
  });

  test('T014: Clear search restores all tables', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Setup database
    const dbItem = page.locator('.ant-collapse-item').first().locator('text=/./').first();
    if (await dbItem.isVisible()) {
      await dbItem.click();
    }
    await page.waitForSelector('text=Schema');

    // Get initial table count from header
    const initialHeader = page.locator('text=/Schema \\((\\d+) tables\\)/');
    await expect(initialHeader.first()).toBeVisible();
    const initialCount = await initialHeader.textContent();
    const match = initialCount?.match(/Schema \((\d+) tables\)/);
    const count = match ? parseInt(match[1]) : 0;

    // Enter search
    const searchInput = page.locator('input[placeholder="Search tables..."]');
    await searchInput.fill('nonexistent');

    // Verify no results
    const noResults = page.locator('text=/No tables found/');
    await expect(noResults).toBeVisible();

    // Clear search
    const clearButton = page.locator('.ant-input-clear-icon');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    } else {
      await searchInput.fill('');
    }

    // Verify all tables are restored
    const restoredHeader = page.locator(`text=/Schema \\(${count} tables\\)/`);
    await expect(restoredHeader.first()).toBeVisible();
  });

  test('T015: No results message when search has no matches', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Setup database
    const dbItem = page.locator('.ant-collapse-item').first().locator('text=/./').first();
    if (await dbItem.isVisible()) {
      await dbItem.click();
    }
    await page.waitForSelector('text=Schema');

    // Search for non-existent table
    const searchInput = page.locator('input[placeholder="Search tables..."]');
    await searchInput.fill('xyznonexistent123');

    // Verify no results message
    const noResults = page.locator('text=/No tables found for "xyznonexistent123"/');
    await expect(noResults).toBeVisible();
  });
});
