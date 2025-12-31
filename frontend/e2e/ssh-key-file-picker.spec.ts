import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('SSH 私钥文件选择器', () => {
  // Create a temporary test file before tests
  let tempDir: string;
  let testKeyPath: string;
  let largeFilePath: string;

  test.beforeAll(async () => {
    // Create temp directory and test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssh-key-test-'));
    
    // Create a valid test private key file
    testKeyPath = path.join(tempDir, 'test_key');
    const testKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBHK2Ov8z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5zAAAAJgAAAAtzc2gt
ZWQyNTUxOQAAACBHK2Ov8z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5zAAAAQCBHK2Ov8z
-----END OPENSSH PRIVATE KEY-----`;
    fs.writeFileSync(testKeyPath, testKeyContent);

    // Create a large file (>100KB) for testing size limit
    largeFilePath = path.join(tempDir, 'large_file');
    const largeContent = 'x'.repeat(150 * 1024); // 150KB
    fs.writeFileSync(largeFilePath, largeContent);
  });

  test.afterAll(async () => {
    // Cleanup temp files
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('应该在密钥认证模式下显示文件选择按钮', async ({ page }) => {
    // Open Add Database modal
    const addButton = page.locator('button').filter({ hasText: /add database/i });
    await addButton.click();

    // Wait for modal
    await page.waitForSelector('.ant-modal', { timeout: 5000 });

    // Enable SSH tunnel
    const sshSwitch = page.locator('text=SSH Tunnel').locator('..').locator('button[role="switch"]');
    await sshSwitch.click();

    // Wait for SSH config to appear
    await page.waitForSelector('text=SSH Configuration', { timeout: 3000 });

    // Select Key pair authentication
    const keyRadio = page.locator('text=Key pair');
    await keyRadio.click();

    // Check for Browse button
    const browseButton = page.locator('button').filter({ hasText: /browse/i });
    await expect(browseButton).toBeVisible({ timeout: 3000 });

    // Check for private key textarea
    const privateKeyTextarea = page.locator('textarea[placeholder*="private key"]');
    await expect(privateKeyTextarea).toBeVisible();
  });

  test('应该能通过文件选择器导入私钥内容', async ({ page }) => {
    // Open Add Database modal
    const addButton = page.locator('button').filter({ hasText: /add database/i });
    await addButton.click();

    // Wait for modal
    await page.waitForSelector('.ant-modal', { timeout: 5000 });

    // Enable SSH tunnel
    const sshSwitch = page.locator('text=SSH Tunnel').locator('..').locator('button[role="switch"]');
    await sshSwitch.click();

    // Wait for SSH config to appear
    await page.waitForSelector('text=SSH Configuration', { timeout: 3000 });

    // Select Key pair authentication
    const keyRadio = page.locator('text=Key pair');
    await keyRadio.click();

    // Set up file chooser before clicking browse
    const fileChooserPromise = page.waitForEvent('filechooser');
    const browseButton = page.locator('button').filter({ hasText: /browse/i });
    await browseButton.click();

    // Handle file chooser
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testKeyPath);

    // Verify content is loaded into textarea
    const privateKeyTextarea = page.locator('textarea[placeholder*="private key"]');
    await expect(privateKeyTextarea).toHaveValue(/BEGIN OPENSSH PRIVATE KEY/, { timeout: 3000 });

    // Verify success message
    const successMessage = page.locator('.ant-message-success');
    await expect(successMessage).toBeVisible({ timeout: 3000 });
  });

  test('应该能手动粘贴私钥内容', async ({ page }) => {
    // Open Add Database modal
    const addButton = page.locator('button').filter({ hasText: /add database/i });
    await addButton.click();

    // Wait for modal
    await page.waitForSelector('.ant-modal', { timeout: 5000 });

    // Enable SSH tunnel
    const sshSwitch = page.locator('text=SSH Tunnel').locator('..').locator('button[role="switch"]');
    await sshSwitch.click();

    // Wait for SSH config
    await page.waitForSelector('text=SSH Configuration', { timeout: 3000 });

    // Select Key pair authentication
    const keyRadio = page.locator('text=Key pair');
    await keyRadio.click();

    // Manually paste content into textarea
    const privateKeyTextarea = page.locator('textarea[placeholder*="private key"]');
    const testContent = '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----';
    await privateKeyTextarea.fill(testContent);

    // Verify content
    await expect(privateKeyTextarea).toHaveValue(testContent);
  });

  test('应该在选择过大文件时显示错误提示', async ({ page }) => {
    // Open Add Database modal
    const addButton = page.locator('button').filter({ hasText: /add database/i });
    await addButton.click();

    // Wait for modal
    await page.waitForSelector('.ant-modal', { timeout: 5000 });

    // Enable SSH tunnel
    const sshSwitch = page.locator('text=SSH Tunnel').locator('..').locator('button[role="switch"]');
    await sshSwitch.click();

    // Wait for SSH config
    await page.waitForSelector('text=SSH Configuration', { timeout: 3000 });

    // Select Key pair authentication
    const keyRadio = page.locator('text=Key pair');
    await keyRadio.click();

    // Set up file chooser before clicking browse
    const fileChooserPromise = page.waitForEvent('filechooser');
    const browseButton = page.locator('button').filter({ hasText: /browse/i });
    await browseButton.click();

    // Handle file chooser with large file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(largeFilePath);

    // Verify error message appears
    const errorMessage = page.locator('.ant-message-error');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });

    // Verify textarea remains empty
    const privateKeyTextarea = page.locator('textarea[placeholder*="private key"]');
    await expect(privateKeyTextarea).toHaveValue('');
  });

  test('取消文件选择时应保持原有状态', async ({ page }) => {
    // Open Add Database modal
    const addButton = page.locator('button').filter({ hasText: /add database/i });
    await addButton.click();

    // Wait for modal
    await page.waitForSelector('.ant-modal', { timeout: 5000 });

    // Enable SSH tunnel
    const sshSwitch = page.locator('text=SSH Tunnel').locator('..').locator('button[role="switch"]');
    await sshSwitch.click();

    // Wait for SSH config
    await page.waitForSelector('text=SSH Configuration', { timeout: 3000 });

    // Select Key pair authentication
    const keyRadio = page.locator('text=Key pair');
    await keyRadio.click();

    // Pre-fill some content
    const privateKeyTextarea = page.locator('textarea[placeholder*="private key"]');
    const existingContent = '-----BEGIN TEST KEY-----\nexisting content\n-----END TEST KEY-----';
    await privateKeyTextarea.fill(existingContent);

    // Click browse and cancel (by not selecting any file)
    const fileChooserPromise = page.waitForEvent('filechooser');
    const browseButton = page.locator('button').filter({ hasText: /browse/i });
    await browseButton.click();

    // Cancel file chooser by setting empty array
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([]);

    // Verify original content is preserved
    await expect(privateKeyTextarea).toHaveValue(existingContent);
  });
});

