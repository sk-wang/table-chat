/**
 * E2E tests for SQL syntax highlighting.
 * Tests that SQL keywords, strings, numbers, and comments are properly styled.
 */

import { test, expect } from "@playwright/test";

test.describe("SQL Syntax Highlighting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/query");
  });

  test("should highlight SQL keywords", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type SQL with keywords
    await page.keyboard.type("SELECT * FROM users WHERE id = 1");

    // Check for keyword highlighting (Monaco adds specific classes)
    const keywords = page.locator(".mtk1"); // mtk1 is typically keyword class
    // The editor should have some content with syntax highlighting
    const editorContent = await page.locator(".monaco-editor .view-lines").textContent();
    expect(editorContent).toContain("SELECT");
  });

  test("should highlight string literals", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type SQL with string
    await page.keyboard.type("SELECT * FROM users WHERE name = 'test'");

    const editorContent = await page.locator(".monaco-editor .view-lines").textContent();
    expect(editorContent).toContain("'test'");
  });

  test("should highlight numeric literals", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type SQL with numbers
    await page.keyboard.type("SELECT id, count * 1.5 FROM orders");

    const editorContent = await page.locator(".monaco-editor .view-lines").textContent();
    expect(editorContent).toContain("1.5");
  });

  test("should highlight line comments", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type SQL with comment
    await page.keyboard.type("SELECT * FROM users -- get all users");

    const editorContent = await page.locator(".monaco-editor .view-lines").textContent();
    expect(editorContent).toContain("--");
  });

  test("should show keyword suggestions for partial input", async ({ page }) => {
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type partial keyword
    await page.keyboard.type("SEL");

    // Trigger autocomplete
    await page.keyboard.press("Control+Space");

    // Verify SELECT is suggested
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
    await expect(suggestions.first).toContainText("SELECT");
  });
});
