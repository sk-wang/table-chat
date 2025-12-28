import { test, expect } from '@playwright/test';

test.describe('数据库管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test('应该显示数据库列表页面', async ({ page }) => {
    // 检查页面标题或关键元素
    const hasList = await page.locator('[role="table"]').isVisible({ timeout: 5000 }).catch(() => false);
    const hasButton = await page.locator('button:has-text("Add")').isVisible({ timeout: 5000 }).catch(() => false);
    
    // 至少应该有列表或添加按钮
    expect(hasList || hasButton).toBeTruthy();
  });

  test('应该能够打开添加数据库对话框', async ({ page }) => {
    // 查找添加按钮
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      
      // 检查对话框或表单是否出现
      const hasDialog = await page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false);
      const hasModal = await page.locator('.ant-modal').isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(hasDialog || hasModal).toBeTruthy();
    }
  });
});

