import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';
const fixture = path.resolve('tests/fixtures/sample.png');
test('batch ZIP contains actual encoded outputs and presets store settings only', async ({
  page,
}) => {
  await page.goto('/batch-images/');
  await page
    .getByLabel('Choose files', { exact: true })
    .setInputFiles([fixture, path.resolve('tests/fixtures/oriented.jpg')]);
  await page.getByLabel('Maximum width', { exact: true }).fill('300');
  await page.locator('summary').filter({ hasText: 'Saved presets' }).click();
  await page.getByLabel('Preset name').fill('Small images');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  const storage = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fixmyupload-presets-v2')!),
  );
  expect(storage[0].requirements.maxWidth).toBe(300);
  expect(Object.keys(storage[0]).sort()).toEqual(['name', 'options', 'requirements']);
  await page.getByRole('button', { name: 'Process images', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your files are ready.' })).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP', exact: true }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe('fixmyupload-files.zip');
  const { unzipSync } = await import('fflate');
  const zip = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(zip)).toHaveLength(2);
  for (const bytes of Object.values(zip)) {
    expect(bytes[0]).toBe(255);
    expect(bytes[1]).toBe(216);
  }
  await page.reload();
  await page.getByLabel('Choose files', { exact: true }).setInputFiles(fixture);
  await page.locator('summary').filter({ hasText: 'Saved presets' }).click();
  await page.getByRole('button', { name: 'Small images', exact: true }).click();
  await expect(page.getByLabel('Maximum width', { exact: true })).toHaveValue('300');
});
test('native Canvas rotation and flips preserve the expected pixels', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { processImage } = await import(String('/src/features/image/process.ts'));
    const c = document.createElement('canvas');
    c.width = 3;
    c.height = 2;
    const ctx = c.getContext('2d')!;
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#00ffff', '#ff00ff', '#ffff00'];
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(i % 3, Math.floor(i / 3), 1, 1);
    });
    const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), 'image/png'));
    const f = new File([blob], 'colors.png');
    async function pixels(rotation: number, flipHorizontal = false) {
      const o = await processImage(
        f,
        { formats: ['png'] },
        { format: 'png', quality: 1, fit: 'contain', background: '#fff', rotation, flipHorizontal },
      );
      const bitmap = await createImageBitmap(o.blob);
      c.width = bitmap.width;
      c.height = bitmap.height;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      return {
        width: c.width,
        height: c.height,
        data: Array.from(ctx.getImageData(0, 0, c.width, c.height).data).filter(
          (_, i) => i % 4 !== 3,
        ),
      };
    }
    return { rotated: await pixels(90), flipped: await pixels(0, true) };
  });
  expect(result.rotated).toMatchObject({
    width: 2,
    height: 3,
    data: [0, 255, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255, 255, 0, 0, 0, 255],
  });
  expect(result.flipped.data.slice(0, 9)).toEqual([0, 0, 255, 0, 255, 0, 255, 0, 0]);
});
test('PDF previews select pages and rotation changes only the selected page', async ({ page }) => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    const p = doc.addPage([200, 250]);
    p.drawRectangle({ x: 20, y: 20, width: 100, height: 150, color: rgb(i / 3, 0.5, 0.3) });
  }
  const bytes = await doc.save();
  await page.goto('/rotate-pdf/');
  await page
    .getByLabel('Choose files', { exact: true })
    .setInputFiles({ name: 'three.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  await page.locator('summary').filter({ hasText: 'Preview & select pages' }).click();
  await expect(page.getByRole('img', { name: 'Preview of page 1', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByLabel('Page selection', { exact: true }).fill('2');
  await page.getByLabel('Select page 2', { exact: true }).uncheck();
  await expect(page.getByRole('button', { name: 'Rotate pages', exact: true })).toBeDisabled();
  await page.getByLabel('Select page 2', { exact: true }).check();
  await expect(page.getByLabel('Page selection', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Rotate pages', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your file is ready.' })).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file', exact: true }).click();
  const output = await PDFDocument.load(await readFile((await (await event).path())!));
  expect(output.getPages().map((p) => p.getRotation().angle)).toEqual([0, 90, 0]);
});
test('tool routes work, mobile workspace fits and impossible output remains failed', async ({
  page,
}) => {
  await page.goto('/compress-to-500kb/');
  await expect(page).toHaveTitle('Compress to 500 KB — FixMyUpload');
  await page.getByLabel('Choose files', { exact: true }).setInputFiles(fixture);
  await expect(page.getByLabel('Maximum file size', { exact: true })).toHaveValue('500');
  await page.getByLabel('Maximum file size', { exact: true }).fill('.001');
  await page.getByRole('button', { name: 'Fix my file', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Some requirements need a change.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Download anyway · requirements not met' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
