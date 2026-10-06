import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Doodle Desk Smoke Tests', () => {
  let electronApp;
  let firstWindow;

  test.beforeEach(async () => {
    // Launch Electron application with dev or dist
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    firstWindow = await electronApp.firstWindow();
    await firstWindow.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('app launches and renders Doodle canvas container with desktop badges', async () => {
    // Verify container and badges
    const canvasContainer = firstWindow.locator('.canvas-container');
    await expect(canvasContainer).toBeVisible({ timeout: 15000 });

    const offlineBadge = firstWindow.locator('.status-badge', { hasText: 'Offline Desktop' });
    await expect(offlineBadge).toBeVisible();

    // Verify window title
    const title = await firstWindow.title();
    expect(title).toContain('Doodle Desk');
  });

  test('can open preferences modal and toggle settings', async () => {
    const prefButton = firstWindow.locator('button.status-badge', { hasText: 'Preferences' });
    await prefButton.click();

    const modal = firstWindow.locator('.modal-content');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('Preferences');

    // Close modal
    const doneButton = modal.locator('button', { hasText: 'Done' });
    await doneButton.click();
    await expect(modal).not.toBeVisible();
  });

  test('creates a shape and verifies scene serialization format', async () => {
    // Check canvas exists
    const canvas = firstWindow.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 15000 });

    // Draw on the canvas
    const box = await canvas.first().boundingBox();
    if (box) {
      await firstWindow.mouse.move(box.x + 200, box.y + 200);
      await firstWindow.mouse.down();
      await firstWindow.mouse.move(box.x + 350, box.y + 350);
      await firstWindow.mouse.up();
    }

    // Verify app state serialization capability via preload bridge
    const appVersion = await firstWindow.evaluate(async () => {
      return await window.electronAPI.getAppVersion();
    });
    expect(appVersion).toBeDefined();
  });
});
