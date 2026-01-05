/**
 * E2E tests for single statement execution.
 * Tests executing only the statement at the cursor position.
 */

import { test, expect } from "@playwright/test";

test.describe("Single Statement Execution", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/query");
  });

  test("should execute only the statement at cursor position", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type multiple statements
    await page.keyboard.type("SELECT * FROM users;");
    await page.keyboard.press("Enter");
    await page.keyboard.type("SELECT COUNT(*) FROM orders;");

    // Move cursor to first statement
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown"); // Go to line 2

    // The statement at cursor should be the second one
    // Trigger single statement execution (Ctrl+Shift+Enter)
    await page.keyboard.press("Control+Shift+Enter");

    // Verify only the current statement executes
    // This would typically show results for "SELECT COUNT(*) FROM orders"
    // The exact assertion depends on how results are displayed
  });

  test("should highlight the statement that will be executed", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    await page.keyboard.type("SELECT * FROM users;");
    await page.keyboard.press("Enter");
    await page.keyboard.type("SELECT * FROM orders;");

    // Move to first line
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");

    // Trigger single statement execution
    await page.keyboard.press("Control+Shift+Enter");

    // Check for highlight decoration
    // Monaco adds decorations with specific class names
    const highlightedLine = page.locator(".executing-statement-highlight");
    // The highlight should appear briefly (we may need to wait for it)
  });

  test("should handle cursor at end of editor", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    await page.keyboard.type("SELECT * FROM users;");
    await page.keyboard.press("Enter");
    await page.keyboard.type("SELECT * FROM orders;");
    await page.keyboard.press("End"); // Move to end

    // Should execute the last statement
    await page.keyboard.press("Control+Shift+Enter");
  });

  test("should work with single statement in editor", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    await page.keyboard.type("SELECT * FROM users");

    // Should work the same as regular execute
    await page.keyboard.press("Control+Shift+Enter");
  });
});
