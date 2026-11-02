import { LIMITS, type ImageOptions, type Requirements } from '../../types/files';
import { conflicts } from '../validation/requirements';

/** Plans a safe integer canvas; crop/pad alter the frame, never the source ratio. */
export function planDimensions(
  sourceWidth: number,
  sourceHeight: number,
  r: Requirements,
  fit: ImageOptions['fit'],
): { width: number; height: number; upscaled: boolean } {
  if (![sourceWidth, sourceHeight].every((value) => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('Image dimensions must be positive, finite whole pixels.');
  }
  if (sourceWidth * sourceHeight > LIMITS.pixels) {
    throw new Error('Image exceeds the 12 megapixel safety limit.');
  }
  if (!['contain', 'crop', 'pad'].includes(fit)) throw new Error('Choose contain, crop or pad.');
  const issues = conflicts(r);
  if (issues.length) throw new Error(issues.join(' '));

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = r.aspectRatio ?? (r.width && r.height ? r.width / r.height : sourceRatio);
  if (
    fit === 'contain' &&
    r.aspectRatio !== undefined &&
    Math.abs(sourceWidth - sourceHeight * targetRatio) > Math.max(1, targetRatio) / 2 + 1e-8
  ) {
    throw new Error('The aspect ratio requires explicit crop or pad.');
  }
  if (
    fit === 'contain' &&
    r.width &&
    r.height &&
    Math.round((sourceHeight * r.width) / sourceWidth) !== r.height
  ) {
    throw new Error('Exact dimensions change the aspect ratio. Choose crop or pad.');
  }

  let baseWidth = sourceWidth;
  let baseHeight = sourceHeight;
  if (fit !== 'contain') {
    const useWidth = fit === 'crop' ? targetRatio >= sourceRatio : targetRatio <= sourceRatio;
    if (useWidth) baseHeight = baseWidth / targetRatio;
    else baseWidth = baseHeight * targetRatio;
  }
  const lower = Math.max((r.minWidth ?? 1) / baseWidth, (r.minHeight ?? 1) / baseHeight);
  const upper = Math.min(
    (r.maxWidth ?? Infinity) / baseWidth,
    (r.maxHeight ?? Infinity) / baseHeight,
  );
  let scale = Math.max(lower, Math.min(1, upper));
  if (r.width !== undefined) scale = r.width / baseWidth;
  else if (r.height !== undefined) scale = r.height / baseHeight;
  if (lower > upper + 1e-10 || scale < lower - 1e-10 || scale > upper + 1e-10) {
    throw new Error('These dimension bounds cannot preserve the requested aspect ratio.');
  }
  const width = r.width ?? Math.round(baseWidth * scale);
  const height = r.height ?? Math.round(baseHeight * scale);
  if (
    ![width, height].every((value) => Number.isSafeInteger(value) && value > 0) ||
    width * height > LIMITS.pixels
  ) {
    throw new Error('Output dimensions exceed the 12 megapixel safety limit.');
  }
  if (
    width < (r.minWidth ?? 1) ||
    height < (r.minHeight ?? 1) ||
    width > (r.maxWidth ?? Infinity) ||
    height > (r.maxHeight ?? Infinity)
  ) {
    throw new Error('The dimension bounds cannot be met with whole pixels.');
  }
  const drawScale =
    fit === 'crop'
      ? Math.max(width / sourceWidth, height / sourceHeight)
      : Math.min(width / sourceWidth, height / sourceHeight);
  return { width, height, upscaled: drawScale > 1 + 1e-10 };
}
