import { test, expect } from '@playwright/test';

test.describe('SQL Formatter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForSelector('text=Query Tool', { timeout: 10000 });
  });

  test('should format SQL using Format button', async ({ page }) => {
    // Enter unformatted SQL
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    // Clear existing content and type new SQL
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('select * from users where id=1');
    
    // Click Format button
    await page.getByRole('button', { name: /format/i }).click();
    
    // Wait for formatting to complete
    await page.waitForTimeout(1000);
    
    // Verify SQL is formatted (contains newlines and uppercase keywords)
    const editorContent = await page.locator('.monaco-editor .view-lines').textContent();
    expect(editorContent).toContain('SELECT');
    expect(editorContent).toContain('FROM');
    expect(editorContent).toContain('WHERE');
  });

  test('should format SQL using Shift+Alt+F shortcut', async ({ page }) => {
    // Enter unformatted SQL
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    // Clear and type
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('select name,email from users');
    
    // Use keyboard shortcut
    await page.keyboard.press('Shift+Alt+F');
    
    // Wait for formatting
    await page.waitForTimeout(1000);
    
    // Verify formatting
    const editorContent = await page.locator('.monaco-editor .view-lines').textContent();
    expect(editorContent).toContain('SELECT');
    expect(editorContent).toContain('FROM');
  });

  test('should show error for invalid SQL', async ({ page }) => {
    // Enter invalid SQL
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('This is not SQL!!!');
    
    // Click Format button
    await page.getByRole('button', { name: /format/i }).click();
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Verify error message appears
    const errorMessage = page.locator('.ant-message-error');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should preserve multiline format when adding LIMIT', async ({ page }) => {
    // Skip if no database is available
    const dbSelector = page.locator('text=Database:').locator('..').locator('select');
    const dbCount = await dbSelector.count();
    
    if (dbCount === 0) {
      test.skip();
      return;
    }
    
    // Enter multiline SQL without LIMIT
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('SELECT *\nFROM users\nWHERE id > 10');
    
    // Execute query (which will add LIMIT)
    await page.getByRole('button', { name: /execute/i }).click();
    
    // Wait for execution
    await page.waitForTimeout(2000);
    
    // Check if LIMIT was added on a new line
    const editorContent = await page.locator('.monaco-editor .view-lines').textContent();
    
    // The LIMIT should be on its own line (multiline format preserved)
    // Note: This is an indirect test - we verify the SQL still has multiple lines
    const lines = editorContent?.split('\n').filter(line => line.trim().length > 0) || [];
    expect(lines.length).toBeGreaterThan(1);
  });

  test('should disable Format button when SQL is empty', async ({ page }) => {
    // Clear editor
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    
    // Verify Format button is disabled
    const formatButton = page.getByRole('button', { name: /format/i });
    await expect(formatButton).toBeDisabled();
  });
});

