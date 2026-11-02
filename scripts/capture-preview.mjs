import { chromium } from '@playwright/test';
import path from 'node:path';
import console from 'node:console';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  colorScheme: 'light',
  deviceScaleFactor: 1,
});
await page.goto('http://127.0.0.1:5173');
await page.screenshot({ path: 'docs/screenshot.png', fullPage: true, animations: 'disabled' });
const checks = [];
for (const width of [360, 390, 768, 1024, 1440, 1920]) {
  await page.setViewportSize({ width, height: 1050 });
  checks.push({
    width,
    overflow: await page.evaluate('document.documentElement.scrollWidth>innerWidth'),
  });
}
await page.setViewportSize({ width: 1440, height: 1050 });
await page
  .getByLabel('Choose files', { exact: true })
  .setInputFiles(path.resolve('tests/fixtures/sample.png'));
await page.getByLabel('Maximum file size', { exact: true }).fill('500');
await page.getByLabel('Maximum width', { exact: true }).fill('800');
await page.screenshot({
  path: 'docs/screenshot-workspace.png',
  fullPage: true,
  animations: 'disabled',
});
await page.getByRole('button', { name: 'Fix my file', exact: true }).click();
await page.getByRole('heading', { name: 'Your file is ready.' }).waitFor();
await page.screenshot({
  path: 'docs/screenshot-result.png',
  fullPage: true,
  animations: 'disabled',
});
await page.getByRole('button', { name: 'Switch to dark theme' }).click();
await page.screenshot({ path: 'docs/screenshot-dark.png', fullPage: true, animations: 'disabled' });
await page.getByRole('button', { name: 'Start over', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: 'docs/screenshot-mobile.png',
  fullPage: true,
  animations: 'disabled',
});
console.log(JSON.stringify(checks));
await browser.close();
