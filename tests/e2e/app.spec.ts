import { test, expect } from '@playwright/test';
import path from 'node:path';

const fixture = path.resolve('tests/fixtures/sample.png');
test('converts, resizes, validates and downloads a real image', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose files').setInputFiles(fixture);
  await expect(page.getByText('sample.png', { exact: true })).toBeVisible();
  await page.getByLabel('Output format').selectOption('jpeg');
  await page.getByLabel('Maximum width').fill('400');
  await page.getByLabel('Maximum file size').fill('100');
  await page.getByRole('button', { name: 'Fix my file' }).click();
  await expect(page.getByRole('heading', { name: 'Your file is ready.' })).toBeVisible();
  await expect(page.getByTestId('result-dimensions')).toContainText('400 × 300');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('sample-fixed.jpg');
  const saved = await download.path();
  const fs = await import('node:fs/promises');
  const bytes = await fs.readFile(saved!);
  expect(bytes[0]).toBe(255);
  expect(bytes[1]).toBe(216);
  expect(bytes.length).toBeLessThanOrEqual(100000);
});
test('parser previews before applying and conflicts prevent processing', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose files', { exact: true }).setInputFiles(fixture);
  await page
    .getByLabel('Paste the upload error')
    .fill('Only JPG or PNG images under 500 KB, minimum 600x600 pixels.');
  await page.getByRole('button', { name: 'Read requirements' }).click();
  await expect(page.getByText('JPEG, PNG', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apply detected requirements' }).click();
  await expect(page.getByLabel('Minimum width')).toHaveValue('600');
  await page.getByLabel('Maximum width').fill('300');
  await expect(page.getByRole('button', { name: 'Fix my file' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText(/width/i);
});
test('images become a validated PDF', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'PDF tools' }).click();
  await page.getByLabel('Choose files').setInputFiles([fixture]);
  await page.getByRole('button', { name: 'Create PDF' }).click();
  await expect(page.getByRole('heading', { name: 'Your file is ready.' })).toBeVisible();
  await expect(page.getByTestId('result-pages')).toContainText('1 page');
});
test('unsupported and damaged files get meaningful errors', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose files').setInputFiles({
    name: 'fake.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });
  await expect(page.getByRole('alert')).toContainText(/supported|recognize/i);
  await page.getByLabel('Choose files').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  await expect(page.getByRole('alert')).toContainText(/damaged|invalid|read/i);
});
test('dark theme, reset and mobile width remain usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Choose files').setInputFiles(fixture);
  await page.getByRole('button', { name: 'Clear files' }).click();
  await expect(page.getByText('Drop your file here')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('privacy dialog contains keyboard focus and closes with Escape', async ({ page }) => {
  await page.goto('/');
  const privacy = page.getByRole('button', { name: 'Privacy & limits' });
  await privacy.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(privacy).toBeFocused();
});

test('image PDF uses the EXIF-corrected portrait orientation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'PDF tools' }).click();
  await page.getByLabel('Choose files').setInputFiles(path.resolve('tests/fixtures/oriented.jpg'));
  await page.getByRole('button', { name: 'Create PDF' }).click();
  await expect(page.getByRole('heading', { name: 'Your file is ready.' })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  const download = await downloadEvent;
  const fs = await import('node:fs/promises');
  const { PDFDocument, PDFRawStream, PDFName, PDFNumber } = await import('pdf-lib');
  const doc = await PDFDocument.load(await fs.readFile((await download.path())!));
  const image = doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .find(
      (object) =>
        object instanceof PDFRawStream &&
        object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
    );
  expect(image).toBeInstanceOf(PDFRawStream);
  if (!(image instanceof PDFRawStream)) throw new Error('PDF image missing');
  expect(image.dict.lookup(PDFName.of('Width'), PDFNumber).asNumber()).toBe(80);
  expect(image.dict.lookup(PDFName.of('Height'), PDFNumber).asNumber()).toBe(120);
});
