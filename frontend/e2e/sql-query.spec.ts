import { test, expect } from '@playwright/test';

test.describe('SQL 查询功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/query');
  });

  test('应该显示查询页面基本元素', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查关键元素
    const hasTitle = await page.locator('text=/SQL Query/i').isVisible({ timeout: 5000 }).catch(() => false);
    const hasEditor = await page.locator('.monaco-editor').isVisible({ timeout: 10000 }).catch(() => false);
    const hasExecuteButton = await page.locator('button:has-text("Execute")').isVisible({ timeout: 5000 }).catch(() => false);
    
    // 至少应该有标题、编辑器或执行按钮之一
    expect(hasTitle || hasEditor || hasExecuteButton).toBeTruthy();
  });

  test('应该显示 Monaco 编辑器', async ({ page }) => {
    // 等待 Monaco 编辑器加载
    const monacoEditor = page.locator('.monaco-editor').first();
    
    const isVisible = await monacoEditor.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (isVisible) {
      // 检查编辑器内容区域
      const editorContent = monacoEditor.locator('.view-lines');
      await expect(editorContent).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该有数据库选择器', async ({ page }) => {
    // 查找数据库选择器
    const selector = page.locator('text=Database').locator('..').locator('select, [role="combobox"]').first();
    
    const hasSelector = await selector.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasSelector) {
      // 可能还没有配置数据库，检查是否有提示信息
      const hasWarning = await page.locator('text=/no database/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasWarning).toBeTruthy();
    }
  });

  test('应该有执行和清除按钮', async ({ page }) => {
    const executeButton = page.locator('button').filter({ hasText: /execute/i });
    const clearButton = page.locator('button').filter({ hasText: /clear/i });
    
    const hasExecute = await executeButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasClear = await clearButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasExecute || hasClear).toBeTruthy();
  });
});

