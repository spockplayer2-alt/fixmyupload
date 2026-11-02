import {
  LIMITS,
  type Check,
  type FileInfo,
  type Format,
  type Requirements,
} from '../../types/files';

const formats: Format[] = ['jpeg', 'png', 'webp', 'pdf'];
const dimensionKeys = [
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'width',
  'height',
] as const;
const integerKeys = ['minBytes', 'maxBytes', ...dimensionKeys, 'maxPages'] as const;
const positiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const positiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;
const hasDimensions = (r: Requirements) =>
  dimensionKeys.some((key) => r[key] !== undefined) || r.aspectRatio !== undefined;
const matchesAspect = (width: number, height: number, ratio: number) =>
  Math.abs(width - height * ratio) <= Math.max(1, ratio) / 2 + 1e-8;

/** Returns reasons that no reliable validation or conversion can be promised. */
export function conflicts(r: Requirements): string[] {
  const issues: string[] = [];
  if (!Array.isArray(r.formats) || r.formats.some((format) => !formats.includes(format))) {
    issues.push('Choose only JPEG, PNG, WebP or PDF formats.');
  }
  for (const key of integerKeys) {
    if (r[key] !== undefined && !positiveInteger(r[key])) {
      issues.push(`${key} must be a positive, finite whole number.`);
    }
  }
  if (r.aspectRatio !== undefined && !positiveNumber(r.aspectRatio)) {
    issues.push('Aspect ratio must be a positive, finite number.');
  }
  if (positiveInteger(r.minBytes)) {
    if (positiveInteger(r.maxBytes) && r.minBytes > r.maxBytes)
      issues.push('Minimum file size exceeds maximum file size.');
    if (r.minBytes > LIMITS.fileBytes)
      issues.push('Minimum file size exceeds the 30 MB safety limit.');
  }

  for (const side of ['Width', 'Height'] as const) {
    const min = r[`min${side}`];
    const max = r[`max${side}`];
    const exact = side === 'Width' ? r.width : r.height;
    if (positiveInteger(min) && positiveInteger(max) && min > max) {
      issues.push(`Minimum ${side.toLowerCase()} exceeds maximum ${side.toLowerCase()}.`);
    }
    if (
      positiveInteger(exact) &&
      ((positiveInteger(min) && exact < min) || (positiveInteger(max) && exact > max))
    ) {
      issues.push(`Exact ${side.toLowerCase()} is outside its minimum or maximum.`);
    }
  }
  const leastWidth = r.width ?? r.minWidth ?? 1;
  const leastHeight = r.height ?? r.minHeight ?? 1;
  if (
    positiveInteger(leastWidth) &&
    positiveInteger(leastHeight) &&
    leastWidth * leastHeight > LIMITS.pixels
  ) {
    issues.push('Required dimensions exceed the 12 megapixel safety limit.');
  }
  if (positiveNumber(r.aspectRatio)) {
    const ratio = r.aspectRatio;
    if (r.width && r.height && !matchesAspect(r.width, r.height, ratio)) {
      issues.push('Exact dimensions conflict with the aspect ratio.');
    }
    const width = Math.max(leastWidth, leastHeight * ratio);
    const height = width / ratio;
    if (width * height > LIMITS.pixels || ratio > LIMITS.pixels || ratio < 1 / LIMITS.pixels) {
      issues.push(
        'Required aspect ratio and minimum dimensions exceed the 12 megapixel safety limit.',
      );
    }
    if (
      (r.maxWidth !== undefined && width > r.maxWidth + 0.5) ||
      (r.maxHeight !== undefined && height > r.maxHeight + 0.5)
    ) {
      issues.push(
        'Minimum dimensions cannot fit the requested aspect ratio and maximum dimensions.',
      );
    }
    if (
      (r.width !== undefined && Math.abs(width - r.width) > 0.5) ||
      (r.height !== undefined && Math.abs(height - r.height) > 0.5)
    ) {
      issues.push('Exact dimensions cannot fit the requested aspect ratio and minimum dimensions.');
    }
  }
  if (Array.isArray(r.formats) && r.formats.length > 0) {
    if (r.formats.every((format) => format === 'pdf') && hasDimensions(r)) {
      issues.push('Pixel dimensions apply to images, not PDF documents.');
    }
    if (!r.formats.includes('pdf') && r.maxPages !== undefined) {
      issues.push('Page limits require PDF to be an allowed format.');
    }
  }
  return [...new Set(issues)];
}

/** Checks measured output metadata, including the application's safety bounds. */
export function validate(info: FileInfo, r: Requirements): Check[] {
  const issues = conflicts(r);
  const allowed = Array.isArray(r.formats) && r.formats.length ? r.formats : formats;
  const maxBytes = positiveInteger(r.maxBytes)
    ? Math.min(r.maxBytes, LIMITS.fileBytes)
    : LIMITS.fileBytes;
  const checks: Check[] = [
    {
      label: 'File type',
      required: allowed.map((format) => format.toUpperCase()).join(', '),
      actual: String(info.format).toUpperCase(),
      passed: formats.includes(info.format) && allowed.includes(info.format),
    },
    {
      label: 'File size',
      required: `${positiveInteger(r.minBytes) ? `≥ ${r.minBytes.toLocaleString('en-US')}; ` : ''}≤ ${maxBytes.toLocaleString('en-US')} bytes`,
      actual: positiveInteger(info.size)
        ? `${info.size.toLocaleString('en-US')} bytes`
        : 'Unknown or invalid',
      passed:
        positiveInteger(info.size) &&
        info.size <= maxBytes &&
        (r.minBytes === undefined || (positiveInteger(r.minBytes) && info.size >= r.minBytes)),
    },
  ];
  if (issues.length) {
    checks.push({
      label: 'Requirements',
      required: 'Compatible, valid limits',
      actual: issues.join(' '),
      passed: false,
    });
  }
  for (const side of ['Width', 'Height'] as const) {
    const key = side === 'Width' ? 'width' : 'height';
    const actual = info[key];
    const exact = r[key];
    const min = r[`min${side}`];
    const max = r[`max${side}`];
    if (info.format !== 'pdf' || exact !== undefined || min !== undefined || max !== undefined) {
      const required =
        [
          exact !== undefined ? `= ${exact} px` : '',
          min !== undefined ? `≥ ${min} px` : '',
          max !== undefined ? `≤ ${max} px` : '',
        ]
          .filter(Boolean)
          .join('; ') || 'Known positive pixels';
      checks.push({
        label: side,
        required,
        actual: positiveInteger(actual) ? `${actual} px` : 'Unknown or invalid',
        passed:
          positiveInteger(actual) &&
          (exact === undefined || actual === exact) &&
          (min === undefined || actual >= min) &&
          (max === undefined || actual <= max),
      });
    }
  }
  if (info.format !== 'pdf') {
    const pixels =
      positiveInteger(info.width) && positiveInteger(info.height)
        ? info.width * info.height
        : undefined;
    checks.push({
      label: 'Pixel count',
      required: '≤ 12,000,000 pixels',
      actual:
        pixels === undefined ? 'Unknown or invalid' : `${pixels.toLocaleString('en-US')} pixels`,
      passed: pixels !== undefined && pixels <= LIMITS.pixels,
    });
  }
  if (r.aspectRatio !== undefined) {
    const known = positiveInteger(info.width) && positiveInteger(info.height);
    checks.push({
      label: 'Aspect ratio',
      required: `${r.aspectRatio.toFixed(4)}:1 (pixel rounding allowed)`,
      actual: known ? `${(info.width! / info.height!).toFixed(4)}:1` : 'Unknown or invalid',
      passed:
        known &&
        positiveNumber(r.aspectRatio) &&
        matchesAspect(info.width!, info.height!, r.aspectRatio),
    });
  }
  if (info.format === 'pdf' || r.maxPages !== undefined) {
    const maxPages = positiveInteger(r.maxPages)
      ? Math.min(r.maxPages, LIMITS.pages)
      : LIMITS.pages;
    checks.push({
      label: 'Page count',
      required: `≤ ${maxPages} pages`,
      actual: positiveInteger(info.pages) ? `${info.pages} pages` : 'Unknown or invalid',
      passed: positiveInteger(info.pages) && info.pages <= maxPages,
    });
  }
  return checks;
}
