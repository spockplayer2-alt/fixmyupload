import { chromium } from '@playwright/test';
import path from 'node:path';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 1050 },
  colorScheme: 'light',
  deviceScaleFactor: 1,
});
await page.goto('http://127.0.0.1:5173');
await page.getByLabel('Choose files').setInputFiles(path.resolve('tests/fixtures/sample.png'));
await page.getByLabel('Maximum file size').fill('500');
await page.getByLabel('Maximum width').fill('800');
await page.getByRole('button', { name: 'Fix my file' }).click();
await page.getByRole('heading', { name: 'Ready for another try.' }).waitFor();
await page.screenshot({ path: 'docs/screenshot.png', fullPage: true });
await page.getByRole('button', { name: 'Back to requirements' }).click();
await page.getByRole('button', { name: 'Switch to dark theme' }).click();
await page.screenshot({ path: 'docs/screenshot-dark.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'docs/screenshot-mobile.png', fullPage: true });
await browser.close();
