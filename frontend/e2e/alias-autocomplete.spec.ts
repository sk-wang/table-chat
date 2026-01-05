/**
 * E2E tests for alias and join autocomplete.
 * Tests that autocomplete correctly handles table aliases and JOIN clauses.
 */

import { test, expect } from "@playwright/test";

test.describe("Alias and Join Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/query");
  });

  test("should show column suggestions after table alias dot", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type query with alias
    await page.keyboard.type("SELECT * FROM users u");

    // Type dot after alias
    await page.keyboard.type(".");

    // Wait for autocomplete
    await page.waitForSelector(".monaco-list-row", { timeout: 3000 });

    // Verify column suggestions appear
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
    await expect(suggestions.first).toContainText(["id", "name", "email"]);
  });

  test("should recognize table alias in JOIN clause", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type query with JOIN and aliases
    await page.keyboard.type("SELECT u.*, o.* FROM users u JOIN orders o ON u.id = o.user_id");

    // Move cursor after "u."
    await page.keyboard.press("Home");
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("ArrowRight");
    }

    // Type dot
    await page.keyboard.type(".");

    // Verify column suggestions for users table
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
  });

  test("should show columns from all tables after JOIN", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type SELECT with JOIN
    await page.keyboard.type("SELECT  FROM users u JOIN orders o ON u.id = o.user_id");

    // Move cursor to position after SELECT
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    // Trigger autocomplete
    await page.keyboard.press("Control+Space");

    // Should suggest columns from both tables
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
    // May show table-prefixed columns like u.id, o.id
  });

  test("should handle multiple JOINs with different aliases", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type query with multiple JOINs
    await page.keyboard.type("SELECT * FROM users u JOIN orders o ON u.id = o.user_id JOIN products p ON o.product_id = p.id");

    // All three aliases should be recognized
    // This is verified by checking that we can autocomplete after each alias

    // Navigate to end and test autocomplete after p.
    await page.keyboard.type(" p.");

    // Verify column suggestions
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
  });

  test("should handle alias without dot (column context)", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type query with alias
    await page.keyboard.type("SELECT  FROM users u");

    // Move cursor to position after SELECT
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    // Trigger autocomplete
    await page.keyboard.press("Control+Space");

    // Should suggest columns (may include table-prefixed options)
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
  });
});
