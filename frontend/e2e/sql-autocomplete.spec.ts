/**
 * E2E tests for SQL autocomplete functionality.
 * Tests the complete flow of table and column autocomplete in the SQL editor.
 */

import { test, expect } from "@playwright/test";

test.describe("SQL Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the query page
    await page.goto("/query");
  });

  test("should show table suggestions after FROM keyword", async ({ page }) => {
    // Select a database first
    await page.selectOption("select[name='database']", "test-db");

    // Click on SQL editor
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type "SELECT * FROM "
    await page.keyboard.type("SELECT * FROM ");

    // Wait for autocomplete suggestions to appear
    const suggestions = page.locator(".monaco-list-rows");
    await expect(suggestions).toBeVisible();

    // Verify table names are shown
    await expect(page.locator(".monaco-list-row")).toContainText(["users", "orders"]);
  });

  test("should filter table suggestions while typing", async ({ page }) => {
    await page.selectOption("select[name='database']", "test-db");
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type "SELECT * FROM use"
    await page.keyboard.type("SELECT * FROM use");

    // Verify filtered suggestions
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toContainText("users");
    // Should not contain "orders"
    const allText = await suggestions.allTextContents();
    expect(allText.join(" ")).not.toContain("orders");
  });

  test("should show column suggestions after table name", async ({ page }) => {
    await page.selectOption("select[name='database']", "test-db");
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type "SELECT  FROM users"
    await page.keyboard.type("SELECT  FROM users");

    // Move cursor back after SELECT
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");

    // Trigger autocomplete manually
    await page.keyboard.press("Control+Space");

    // Verify column suggestions
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
    await expect(suggestions.first).toContainText(["id", "name", "email"]);
  });

  test("should insert selected suggestion on Enter", async ({ page }) => {
    await page.selectOption("select[name='database']", "test-db");
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type "SELECT * FROM "
    await page.keyboard.type("SELECT * FROM ");

    // Wait for suggestions
    await page.waitForSelector(".monaco-list-row");

    // Press Enter to select first suggestion
    await page.keyboard.press("Enter");

    // Verify table name was inserted
    const editorContent = await page.locator(".monaco-editor .view-line").first().textContent();
    expect(editorContent).toContain("users");
  });

  test("should dismiss suggestions on Escape", async ({ page }) => {
    await page.selectOption("select[name='database']", "test-db");
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type to trigger suggestions
    await page.keyboard.type("SELECT * FROM ");

    // Wait for suggestions
    await page.waitForSelector(".monaco-list-row");

    // Press Escape
    await page.keyboard.press("Escape");

    // Verify suggestions are hidden
    const suggestions = page.locator(".monaco-list-rows");
    await expect(suggestions).not.toBeVisible();
  });

  test("should show keyword suggestions at query start", async ({ page }) => {
    await page.selectOption("select[name='database']", "test-db");
    const editor = page.locator(".monaco-editor-container");
    await editor.click();

    // Type "SEL"
    await page.keyboard.type("SEL");

    // Verify keyword suggestions
    const suggestions = page.locator(".monaco-list-row");
    await expect(suggestions.first).toBeVisible();
    await expect(suggestions.first).toContainText("SELECT");
  });
});
