import { describe, expect, it } from 'vitest';
import { detectFormat } from '../../src/lib/detect';
import { planDimensions } from '../../src/features/image/dimensions';
import { parseError } from '../../src/features/parsing/parser';
import { conflicts, validate } from '../../src/features/validation/requirements';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('file signatures', () => {
  it('detects bytes rather than extensions or declared MIME', () => {
    expect(detectFormat(new Uint8Array([255, 216, 255, 224]))).toBe('jpeg');
    expect(detectFormat(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('png');
    expect(detectFormat(bytes('RIFF1234WEBP'))).toBe('webp');
    expect(detectFormat(bytes('%PDF-1.7'))).toBe('pdf');
    expect(detectFormat(bytes('%PDF-2.0'))).toBe('pdf');
    expect(detectFormat(bytes('<script>evil</script>'))).toBeNull();
  });
  it('rejects partial and unrelated signatures', () => {
    for (const input of [
      new Uint8Array(),
      bytes('PNG'),
      bytes('RIFF1234WAVE'),
      bytes('%PDF-'),
      bytes('%PDF-evil'),
    ]) {
      expect(detectFormat(input)).toBeNull();
    }
    expect(detectFormat(new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0]))).toBeNull();
  });
});

describe('dimensions', () => {
  it('preserves aspect ratio within maximum bounds', () => {
    expect(planDimensions(1600, 800, { formats: [], maxWidth: 800 }, 'contain')).toEqual({
      width: 800,
      height: 400,
      upscaled: false,
    });
  });
  it('fits minimum bounds and reports upscaling', () => {
    expect(
      planDimensions(300, 200, { formats: [], minWidth: 600, minHeight: 600 }, 'contain'),
    ).toEqual({ width: 900, height: 600, upscaled: true });
  });
  it('requires explicit crop or pad for incompatible exact dimensions', () => {
    expect(() =>
      planDimensions(800, 400, { formats: [], width: 600, height: 600 }, 'contain'),
    ).toThrow(/aspect ratio/i);
    expect(planDimensions(800, 400, { formats: [], width: 600, height: 600 }, 'crop')).toEqual({
      width: 600,
      height: 600,
      upscaled: true,
    });
    expect(planDimensions(800, 400, { formats: [], width: 600, height: 600 }, 'pad')).toEqual({
      width: 600,
      height: 600,
      upscaled: false,
    });
  });
  it('uses aspect constraints without stretching pixels', () => {
    expect(planDimensions(800, 400, { formats: [], aspectRatio: 1 }, 'crop')).toEqual({
      width: 400,
      height: 400,
      upscaled: false,
    });
    expect(planDimensions(800, 400, { formats: [], aspectRatio: 1 }, 'pad')).toEqual({
      width: 800,
      height: 800,
      upscaled: false,
    });
    expect(() => planDimensions(800, 400, { formats: [], aspectRatio: 1 }, 'contain')).toThrow(
      /aspect ratio/i,
    );
  });
  it('derives a missing exact side and rounds to real pixels', () => {
    expect(planDimensions(1200, 800, { formats: [], width: 500 }, 'contain')).toEqual({
      width: 500,
      height: 333,
      upscaled: false,
    });
    expect(
      planDimensions(800, 400, { formats: [], width: 600, aspectRatio: 1 }, 'pad'),
    ).toMatchObject({ width: 600, height: 600 });
  });
  it('rejects impossible constraints and unsafe allocations', () => {
    expect(() =>
      planDimensions(100, 100, { formats: [], minWidth: 900, maxHeight: 300 }, 'contain'),
    ).toThrow();
    expect(() =>
      planDimensions(100, 100, { formats: [], width: 100000, height: 100000 }, 'pad'),
    ).toThrow();
    expect(() => planDimensions(3000, 4000, { formats: [], minWidth: 3001 }, 'contain')).toThrow(
      /12|pixel|safe/i,
    );
  });
  it('rejects non-finite, fractional and non-positive dimensions', () => {
    for (const width of [NaN, Infinity, 0, -1, 1.5]) {
      expect(() => planDimensions(width, 100, { formats: [] }, 'contain')).toThrow();
    }
    expect(() => planDimensions(100, 100, { formats: [], maxWidth: NaN }, 'contain')).toThrow();
  });
});

describe('English upload errors', () => {
  it('parses common format, size and minimum dimension instructions', () => {
    const result = parseError('Only JPG or PNG images under 500 KB, minimum 600x600 pixels.');
    expect(result.requirements).toMatchObject({
      formats: ['jpeg', 'png'],
      maxBytes: 499999,
      minWidth: 600,
      minHeight: 600,
    });
    expect(result.ambiguities).toEqual([]);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
  it('parses maximum dimensions and page counts', () => {
    expect(parseError('PDF only. Maximum 3 pages, at most 2 MB.').requirements).toMatchObject({
      formats: ['pdf'],
      maxPages: 3,
      maxBytes: 2000000,
    });
    expect(parseError('Maximum dimensions 1920 × 1080 pixels').requirements).toMatchObject({
      maxWidth: 1920,
      maxHeight: 1080,
    });
    expect(parseError('Must be exactly 800 x 600 pixels.').requirements).toMatchObject({
      width: 800,
      height: 600,
    });
  });
  it('distinguishes inclusive limits, strict limits and binary units', () => {
    expect(parseError('No more than 2 MB').requirements.maxBytes).toBe(2000000);
    expect(parseError('File size must not exceed 1.5 MiB').requirements.maxBytes).toBe(1572864);
    expect(parseError('Less than 1 KB').requirements.maxBytes).toBe(999);
    expect(parseError('2 MB maximum').requirements.maxBytes).toBe(2000000);
    expect(parseError('Fewer than 4 pages').requirements.maxPages).toBe(3);
  });
  it('parses named dimensions and aspect ratios', () => {
    expect(
      parseError('Minimum width 640 px and maximum height 1080 px. Aspect ratio 16:9.')
        .requirements,
    ).toMatchObject({ minWidth: 640, maxHeight: 1080, aspectRatio: 16 / 9 });
  });
  it('does not invent limits for ambiguous text', () => {
    const result = parseError('Image should be 600x600 and around 2 MB');
    expect(result.requirements).toEqual({ formats: [] });
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(0.8);
    expect(parseError('An unexpected error occurred.').confidence).toBe(0);
  });
  it('excludes negated formats while preserving affirmative instructions', () => {
    const result = parseError('PNG is not supported; use JPEG instead.');
    expect(result.requirements.formats).toEqual(['jpeg']);
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(parseError('No PDF files allowed. Only PNG.').requirements.formats).toEqual(['png']);
    expect(parseError('PDF must not exceed 2 MB.').requirements).toMatchObject({
      formats: ['pdf'],
      maxBytes: 2000000,
    });
  });
  it('does not reverse minimum language or treat maximum wording as exact', () => {
    expect(parseError('No less than 600x400 pixels').requirements).toMatchObject({
      minWidth: 600,
      minHeight: 400,
    });
    expect(parseError('No smaller than 600x400 pixels').requirements).toMatchObject({
      minWidth: 600,
      minHeight: 400,
    });
    expect(parseError('Maximum dimensions must be 800x600 pixels').requirements).toMatchObject({
      maxWidth: 800,
      maxHeight: 600,
    });
  });
  it('does not accept instructions explicitly prohibiting a format', () => {
    for (const text of [
      'Do not use PNG; use JPEG.',
      'PNG cannot be uploaded; JPEG only.',
      'Neither PNG nor PDF is allowed; use JPEG.',
    ]) {
      expect(parseError(text).requirements.formats).toEqual(['jpeg']);
      expect(parseError(text).ambiguities.length).toBeGreaterThan(0);
    }
  });
  it('uses the conversion destination without whitelisting the source', () => {
    expect(parseError('Convert PNG to JPEG').requirements.formats).toEqual(['jpeg']);
    expect(parseError('Please convert from PNG to JPG or WebP.').requirements.formats).toEqual([
      'jpeg',
      'webp',
    ]);
    expect(parseError('Save the PNG image as JPEG.').requirements.formats).toEqual(['jpeg']);
  });
  it('ignores mentioned source formats when the allowed formats are explicit', () => {
    const result = parseError('Your PNG file is too large. Only JPG accepted under 500 KB.');
    expect(result.requirements).toMatchObject({ formats: ['jpeg'], maxBytes: 499999 });
    expect(parseError('Your PNG file must be converted to JPEG.').requirements.formats).toEqual([
      'jpeg',
    ]);
    expect(
      parseError('The uploaded PNG file is invalid; accepted formats: JPEG or WebP.').requirements
        .formats,
    ).toEqual(['jpeg', 'webp']);
  });
  it('does not invent an allowed format from an uncertain mention', () => {
    for (const text of [
      'Your PNG file is too large.',
      'PNG and JPEG conversion failed.',
      'PNG or JPEG?',
      'We received a PNG file under 2 MB.',
    ]) {
      const result = parseError(text);
      expect(result.requirements.formats).toEqual([]);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8);
    }
  });
  it('retains explicit allowed, required and format-only lists', () => {
    for (const text of [
      'Accepted formats: JPG or PNG.',
      'JPG and PNG are supported.',
      'File must be JPG or PNG.',
      'Use JPG or PNG.',
      'JPG or PNG only.',
    ]) {
      expect(parseError(text).requirements.formats).toEqual(['jpeg', 'png']);
    }
    expect(parseError('PDF only').ambiguities).toEqual([]);
  });
  it('does not hide unsupported color or print-density conditions behind parsed limits', () => {
    for (const text of [
      'JPEG only, RGB color required',
      'No more than 3 MB, 300dpi',
      'PNG only; must use CMYK color space.',
      'JPEG only; resolution must be 300 ppi.',
    ]) {
      const result = parseError(text);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8);
    }
  });
  it('flags dimensional instructions that cannot be represented safely', () => {
    for (const text of [
      'JPEG only; width must never fall below 600 px.',
      'JPEG only; must be 600 pixels wide.',
      'JPEG only; dimensions must not be exactly 600x600 pixels.',
    ]) {
      const result = parseError(text);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8);
    }
  });
  it('inverts negated dimensional comparisons inclusively', () => {
    expect(
      parseError('JPEG only. Dimensions must not be smaller than 600x600 pixels.').requirements,
    ).toMatchObject({ minWidth: 600, minHeight: 600 });
    expect(
      parseError('JPEG only. Dimensions must not be greater than 600x600 pixels.').requirements,
    ).toMatchObject({ maxWidth: 600, maxHeight: 600 });
    expect(parseError('JPEG only; width must not be less than 600 px.').requirements).toMatchObject(
      { minWidth: 600 },
    );
  });
  it('keeps the tightest compatible bounds and flags contradictions', () => {
    expect(parseError('At most 2 MB; maximum 1 MB').requirements.maxBytes).toBe(1000000);
    expect(
      parseError('Minimum 800x800 pixels. Maximum 600x600 pixels.').ambiguities.length,
    ).toBeGreaterThan(0);
    expect(
      parseError('Exactly 800x600 pixels. Exactly 900x600 pixels.').ambiguities.length,
    ).toBeGreaterThan(0);
  });
  it('never accepts invalid numeric restrictions', () => {
    for (const text of [
      'Maximum -2 MB',
      'Maximum 0 pages',
      'Exactly 0x600 pixels',
      'Maximum Infinity MB',
    ]) {
      const result = parseError(text);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(conflicts(result.requirements)).toEqual([]);
    }
  });
});

describe('validation', () => {
  it('never passes an output that fails one restriction', () => {
    const result = validate(
      { name: 'x.jpg', format: 'jpeg', size: 600000, width: 800, height: 800 },
      { formats: ['jpeg'], maxBytes: 500000, minWidth: 600 },
    );
    expect(result.some((check) => !check.passed)).toBe(true);
    expect(result.find((check) => check.label === 'File size')?.passed).toBe(false);
  });
  it('detects contradictory and invalid requirements', () => {
    for (const requirements of [
      { formats: [], minWidth: 800, maxWidth: 600 },
      { formats: [], maxBytes: NaN },
      { formats: [], maxPages: 0 },
      { formats: ['pdf' as const], minWidth: 600 },
      { formats: ['png' as const], maxPages: 2 },
      { formats: [], width: 600, minWidth: 700 },
      { formats: [], width: 600, height: 600, aspectRatio: 2 },
      { formats: [], minWidth: 4000, minHeight: 4000 },
      { formats: [], width: 1.5 },
      { formats: [], aspectRatio: Infinity },
    ]) {
      expect(conflicts(requirements).length).toBeGreaterThan(0);
    }
  });
  it('fails dimensions and page restrictions when metadata is missing', () => {
    expect(
      validate(
        { name: 'x.pdf', format: 'pdf', size: 10, pages: 1 },
        { formats: [], minWidth: 600 },
      ).find((check) => check.label === 'Width')?.passed,
    ).toBe(false);
    expect(
      validate({ name: 'x.pdf', format: 'pdf', size: 10 }, { formats: ['pdf'], maxPages: 3 }).find(
        (check) => check.label === 'Page count',
      )?.passed,
    ).toBe(false);
  });
  it('requires actual finite image metadata and enforces safe output limits', () => {
    for (const info of [
      { name: 'x.png', format: 'png' as const, size: 100, width: NaN, height: 600 },
      { name: 'x.png', format: 'png' as const, size: 100, width: 4000, height: 4000 },
      { name: 'x.png', format: 'png' as const, size: Infinity, width: 100, height: 100 },
      { name: 'x.pdf', format: 'pdf' as const, size: 100, pages: 101 },
    ]) {
      expect(validate(info, { formats: [] }).some((check) => !check.passed)).toBe(true);
    }
  });
  it('reports every exact dimension and aspect restriction', () => {
    const checks = validate(
      { name: 'x.png', format: 'png', size: 100, width: 800, height: 400 },
      { formats: ['png'], width: 800, height: 400, aspectRatio: 2 },
    );
    expect(checks.every((check) => check.passed)).toBe(true);
    expect(checks.map((check) => check.label)).toEqual(
      expect.arrayContaining(['File type', 'File size', 'Width', 'Height', 'Aspect ratio']),
    );
    expect(
      validate(
        { name: 'x.png', format: 'png', size: 100, width: 600, height: 400 },
        { formats: ['png'], aspectRatio: 2 },
      ).find((check) => check.label === 'Aspect ratio')?.passed,
    ).toBe(false);
  });
  it('cannot pass when the requirements themselves are invalid', () => {
    expect(
      validate(
        { name: 'x.jpg', format: 'jpeg', size: 100, width: 100, height: 100 },
        { formats: [], maxBytes: NaN },
      ).some((check) => !check.passed),
    ).toBe(true);
  });
});
