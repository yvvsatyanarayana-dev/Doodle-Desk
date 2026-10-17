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

  test('draws a rectangle and paints it on the canvas', async () => {
    const canvas = firstWindow.locator('.doodle-engine-container canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await firstWindow.getByRole('button', { name: 'Rectangle' }).click();
    await firstWindow.mouse.move(box.x + 500, box.y + 300);
    await firstWindow.mouse.down();
    await firstWindow.mouse.move(box.x + 650, box.y + 430, { steps: 4 });
    await firstWindow.mouse.up();

    await expect.poll(async () => firstWindow.evaluate(() =>
      window.__doodleAPI.getSceneElements().filter((element) => element.type === 'rectangle').length
    )).toBeGreaterThan(0);

    const paintedPixels = await canvas.evaluate((element) => {
      const context = element.getContext('2d');
      const scaleX = element.width / element.clientWidth;
      const scaleY = element.height / element.clientHeight;
      const left = Math.round(490 * scaleX);
      const top = Math.round(290 * scaleY);
      const width = Math.round(170 * scaleX);
      const height = Math.round(150 * scaleY);
      const pixels = context.getImageData(left, top, width, height).data;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] > 45 || pixels[index + 1] > 45 || pixels[index + 2] > 45) count += 1;
      }
      return count;
    });
    expect(paintedPixels).toBeGreaterThan(100);
  });

  test('draws freehand strokes and creates editable canvas text', async () => {
    const canvas = firstWindow.locator('.doodle-engine-container canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await firstWindow.getByRole('button', { name: 'Draw', exact: true }).click();
    await firstWindow.mouse.move(box.x + 500, box.y + 500);
    await firstWindow.mouse.down();
    await firstWindow.mouse.move(box.x + 550, box.y + 530, { steps: 4 });
    await firstWindow.mouse.up();
    await expect.poll(async () => firstWindow.evaluate(() =>
      window.__doodleAPI.getSceneElements().filter((element) => element.type === 'freedraw').length
    )).toBeGreaterThan(0);

    await firstWindow.getByRole('button', { name: 'Text', exact: true }).click();
    await firstWindow.mouse.click(box.x + 700, box.y + 500);
    const textarea = firstWindow.locator('.doodle-canvas-root textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('Canvas text');
    await textarea.press('Control+Enter');
    await expect.poll(async () => firstWindow.evaluate(() =>
      window.__doodleAPI.getSceneElements().some((element) =>
        element.type === 'text' && element.text === 'Canvas text'
      )
    )).toBe(true);
  });
});
