import { test, expect } from '@playwright/test';

test.describe('Resizable Query Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/query');
    await page.evaluate(() => {
      localStorage.removeItem('tablechat_query_panel_ratio');
    });
    // Reload to ensure clean state
    await page.reload();
  });

  test('应该显示带有 ns-resize 光标的分隔条', async ({ page }) => {
    await page.goto('/query');

    // Find the divider element (8px height element between editor and results)
    const divider = page.locator('div').filter({
      has: page.locator('[style*="height: 8px"]'),
      has: page.locator('[style*="cursor: ns-resize"]')
    }).first();

    // Check if divider exists
    await expect(divider).toBeVisible();

    // Hover over divider and check cursor style
    await divider.hover();
    const cursorStyle = await divider.evaluate((el) =>
      window.getComputedStyle(el).cursor
    );
    expect(cursorStyle).toBe('ns-resize');
  });

  test('应该通过拖动分隔条改变面板高度', async ({ page }) => {
    await page.goto('/query');

    // Get initial heights of editor and results panels
    const editorPanel = page.locator('div').filter({
      has: page.locator('.ant-tabs')
    }).first();

    const initialEditorHeight = await editorPanel.evaluate((el) =>
      el.getBoundingClientRect().height
    );

    // Find the divider
    const divider = page.locator('div').filter({
      has: page.locator('[style*="height: 8px"]'),
      has: page.locator('[style*="cursor: ns-resize"]')
    }).first();

    // Get divider position
    const dividerBox = await divider.boundingBox();
    expect(dividerBox).not.toBeNull();

    if (dividerBox) {
      // Drag divider down by 100px
      await page.mouse.move(
        dividerBox.x + dividerBox.width / 2,
        dividerBox.y + dividerBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        dividerBox.x + dividerBox.width / 2,
        dividerBox.y + dividerBox.height / 2 + 100
      );
      await page.mouse.up();

      // Wait for the layout to update
      await page.waitForTimeout(200);

      // Check if editor height increased
      const newEditorHeight = await editorPanel.evaluate((el) =>
        el.getBoundingClientRect().height
      );

      expect(newEditorHeight).toBeGreaterThan(initialEditorHeight);
    }
  });

  test('应该在刷新后保持比例', async ({ page }) => {
    await page.goto('/query');

    // Get initial editor panel
    const editorPanel = page.locator('div').filter({
      has: page.locator('.ant-tabs')
    }).first();

    // Find and drag the divider
    const divider = page.locator('div').filter({
      has: page.locator('[style*="height: 8px"]'),
      has: page.locator('[style*="cursor: ns-resize"]')
    }).first();

    const dividerBox = await divider.boundingBox();
    expect(dividerBox).not.toBeNull();

    if (dividerBox) {
      // Drag divider down by 100px
      await page.mouse.move(
        dividerBox.x + dividerBox.width / 2,
        dividerBox.y + dividerBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        dividerBox.x + dividerBox.width / 2,
        dividerBox.y + dividerBox.height / 2 + 100
      );
      await page.mouse.up();

      await page.waitForTimeout(200);

      // Get height after drag
      const heightAfterDrag = await editorPanel.evaluate((el) =>
        el.getBoundingClientRect().height
      );

      // Reload the page
      await page.reload();
      await page.waitForTimeout(500);

      // Get height after reload
      const heightAfterReload = await editorPanel.evaluate((el) =>
        el.getBoundingClientRect().height
      );

      // Heights should be approximately equal (within 5px tolerance)
      expect(Math.abs(heightAfterReload - heightAfterDrag)).toBeLessThan(5);
    }
  });

  test('应该在首次访问时使用默认比例 (40:60)', async ({ page }) => {
    await page.goto('/query');

    // Get the container height
    const container = page.locator('div').filter({
      has: page.locator('.ant-tabs')
    }).first();

    const containerParent = container.locator('xpath=ancestor::div[@style and contains(@style, "height: 100%")]').first();

    const totalHeight = await containerParent.evaluate((el) =>
      el.getBoundingClientRect().height
    );

    const editorHeight = await container.evaluate((el) =>
      el.getBoundingClientRect().height
    );

    // Calculate ratio (should be approximately 0.4 or 40%)
    const ratio = editorHeight / totalHeight;

    // Allow for some rounding/layout differences (within 0.05 or 5%)
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.45);
  });

  test('应该在悬停时改变分隔条颜色', async ({ page }) => {
    await page.goto('/query');

    // Find the divider
    const divider = page.locator('div').filter({
      has: page.locator('[style*="height: 8px"]'),
      has: page.locator('[style*="cursor: ns-resize"]')
    }).first();

    // Get initial background color
    const initialBg = await divider.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Hover over divider
    await divider.hover();
    await page.waitForTimeout(100);

    // Get background color on hover
    const hoverBg = await divider.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Colors should be different on hover
    expect(hoverBg).not.toBe(initialBg);
  });
});
