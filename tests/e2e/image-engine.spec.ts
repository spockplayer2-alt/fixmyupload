import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('real encoders preserve alpha, flatten JPEG and honor EXIF orientation', async ({ page }) => {
  await page.goto('/');
  const alpha = Array.from(await readFile('tests/fixtures/transparent.png'));
  const oriented = Array.from(await readFile('tests/fixtures/oriented.jpg'));
  const result = await page.evaluate(
    async ({ alpha, oriented }) => {
      const { processImage, inspectFile } = await import(String('/src/features/image/process.ts'));
      const file = new File([new Uint8Array(alpha)], 'alpha.png');
      const common = { quality: 0.9, fit: 'contain' as const, background: '#ffffff' };
      const png = await processImage(file, { formats: ['png'] }, { ...common, format: 'png' });
      const jpg = await processImage(file, { formats: ['jpeg'] }, { ...common, format: 'jpeg' });
      const webp = await processImage(file, { formats: ['webp'] }, { ...common, format: 'webp' });
      async function pixel(blob: Blob) {
        const b = await createImageBitmap(blob);
        const c = document.createElement('canvas');
        c.width = c.height = 1;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(b, 0, 0, 1, 1);
        b.close();
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      }
      return {
        png: await pixel(png.blob),
        jpg: await pixel(jpg.blob),
        webp: webp.blob.type,
        orientation: await inspectFile(new File([new Uint8Array(oriented)], 'rotated.jpg')),
      };
    },
    { alpha, oriented },
  );
  expect(result.png[3]).toBe(0);
  expect(result.jpg).toEqual([255, 255, 255, 255]);
  expect(result.webp).toBe('image/webp');
  expect(result.orientation).toMatchObject({ width: 80, height: 120 });
});
test('size search reduces a noisy photo and reports impossible sizes honestly', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');
  const noise = (await readFile('tests/fixtures/noise.png')).toString('base64');
  const result = await page.evaluate(async (noise) => {
    const { processImage } = await import(String('/src/features/image/process.ts'));
    const { validate } = await import(String('/src/features/validation/requirements.ts'));
    const file = new File([Uint8Array.from(atob(noise), (c) => c.charCodeAt(0))], 'noise.png');
    const options = {
      format: 'jpeg' as const,
      quality: 0.9,
      fit: 'contain' as const,
      background: '#ffffff',
    };
    const r = { formats: ['jpeg' as const], maxBytes: 30000, minWidth: 200, minHeight: 150 };
    const good = await processImage(file, r, options);
    const impossible = { ...r, maxBytes: 1, width: 800, height: 600 };
    const bad = await processImage(file, impossible, options);
    return {
      size: good.blob.size,
      checks: validate(good.info, r),
      bad: validate(bad.info, impossible),
      info: good.info,
    };
  }, noise);
  expect(result.size).toBeLessThanOrEqual(30000);
  expect(result.checks.every((c: { passed: boolean }) => c.passed)).toBe(true);
  expect(result.bad.some((c: { passed: boolean }) => !c.passed)).toBe(true);
  expect(result.info.width! / result.info.height!).toBeCloseTo(4 / 3, 2);
});
test('exact crop and padding never distort source and upscaling is disclosed', async ({ page }) => {
  await page.goto('/');
  const source = Array.from(await readFile('tests/fixtures/sample.png'));
  const result = await page.evaluate(async (source) => {
    const { processImage } = await import(String('/src/features/image/process.ts'));
    const f = new File([new Uint8Array(source)], 'sample.png');
    const crop = await processImage(
      f,
      { formats: ['png'], width: 200, height: 200 },
      { format: 'png', quality: 1, fit: 'crop', background: '#ffffff' },
    );
    const pad = await processImage(
      f,
      { formats: ['png'], width: 1000, height: 1000 },
      { format: 'png', quality: 1, fit: 'pad', background: '#ffffff' },
    );
    return { crop: crop.info, pad: pad.info, warnings: pad.warnings };
  }, source);
  expect(result.crop).toMatchObject({ width: 200, height: 200 });
  expect(result.pad).toMatchObject({ width: 1000, height: 1000 });
  expect(result.warnings.join(' ')).toMatch(/enlarged/);
});
