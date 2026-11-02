import {
  LIMITS,
  MIME,
  type FileInfo,
  type ImageOptions,
  type Output,
  type Requirements,
} from '../../types/files';
import { detectFormat } from '../../lib/detect';
import { outputName } from '../../lib/format';
import { planDimensions } from './dimensions';

function headerPixels(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const format = detectFormat(bytes);
  if (format === 'png' && bytes.length >= 24) return view.getUint32(16) * view.getUint32(20);
  if (format === 'jpeg') {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i] !== 255) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const length = view.getUint16(i + 2);
      if (length < 2 || i + 2 + length > bytes.length) break;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      )
        return view.getUint16(i + 5) * view.getUint16(i + 7);
      i += length + 2;
    }
  }
  if (format === 'webp' && bytes.length >= 30) {
    const chunk = new TextDecoder().decode(bytes.subarray(12, 16));
    if (chunk === 'VP8X')
      return (
        (1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16)) *
        (1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16))
      );
    if (chunk === 'VP8 ')
      return (view.getUint16(26, true) & 0x3fff) * (view.getUint16(28, true) & 0x3fff);
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      const b = view.getUint32(21, true);
      return ((b & 0x3fff) + 1) * (((b >>> 14) & 0x3fff) + 1);
    }
  }
  throw new Error('This image is damaged or has an invalid header. Try exporting it again.');
}
export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const pixels = headerPixels(bytes);
  if (!pixels || pixels > LIMITS.pixels)
    throw new Error('Images must be at most 12 megapixels. Resize the source image first.');
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    if (bitmap.width * bitmap.height > LIMITS.pixels) {
      bitmap.close();
      throw new Error('Image is too large.');
    }
    return bitmap;
  } catch {
    throw new Error(
      'This image could not be read. It may be damaged or unsupported by this browser.',
    );
  }
}
export async function inspectFile(file: File): Promise<FileInfo> {
  if (!file.size || file.size > LIMITS.fileBytes)
    throw new Error('Choose a non-empty file up to 30 MB.');
  const format = detectFormat(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!format) throw new Error('File not supported. Choose a JPEG, PNG, WebP image or PDF.');
  if (format === 'pdf') {
    const { inspectPdfInWorker } = await import('../pdf/pdf-client');
    const pages = await inspectPdfInWorker(new Uint8Array(await file.arrayBuffer()));
    return { name: file.name, format, size: file.size, pages };
  }
  const bitmap = await decodeImage(file);
  const info = {
    name: file.name,
    format,
    size: file.size,
    width: bitmap.width,
    height: bitmap.height,
  };
  bitmap.close();
  return info;
}
function encode(canvas: HTMLCanvasElement, options: ImageOptions, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== MIME[options.format])
          reject(new Error('This browser cannot encode the selected format. Try JPEG or PNG.'));
        else resolve(blob);
      },
      MIME[options.format],
      quality,
    ),
  );
}
export async function processImage(
  file: File,
  r: Requirements,
  options: ImageOptions,
): Promise<Output> {
  const bitmap = await decodeImage(file);
  const canvas = document.createElement('canvas');
  try {
    const plan = planDimensions(bitmap.width, bitmap.height, r, options.fit);
    let width = plan.width,
      height = plan.height;
    const warnings = ['Image metadata is removed. Animated images use a single frame.'];
    if (plan.upscaled) warnings.push('This image was enlarged. Fine detail may look softer.');
    if (options.fit === 'crop')
      warnings.push('The image is center-cropped to fit the requested shape.');
    let blob: Blob | undefined;
    for (let resize = 0; resize < 14; resize++) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image processing is unavailable in this browser.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (options.format === 'jpeg' || options.fit === 'pad') {
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, width, height);
      }
      const scale =
        options.fit === 'crop'
          ? Math.max(width / bitmap.width, height / bitmap.height)
          : Math.min(width / bitmap.width, height / bitmap.height);
      const dw = bitmap.width * scale,
        dh = bitmap.height * scale;
      ctx.drawImage(bitmap, (width - dw) / 2, (height - dh) / 2, dw, dh);
      blob = await encode(canvas, options, options.quality);
      if (!r.maxBytes || blob.size <= r.maxBytes) break;
      if (options.format !== 'png') {
        let low = 0.2,
          high = options.quality;
        const smallest = await encode(canvas, options, low);
        if (smallest.size <= r.maxBytes) {
          blob = smallest;
          for (let attempt = 0; attempt < 8; attempt++) {
            const middle = (low + high) / 2;
            const candidate = await encode(canvas, options, middle);
            if (candidate.size <= r.maxBytes) {
              blob = candidate;
              low = middle;
            } else high = middle;
          }
          break;
        }
        blob = smallest;
      }
      if (r.width || r.height || r.aspectRatio || resize === 13) break;
      const nextWidth = Math.max(r.minWidth ?? 1, Math.floor(width * 0.8));
      const nextHeight = Math.round((nextWidth / width) * height);
      if (nextWidth >= width || nextHeight < (r.minHeight ?? 1)) break;
      width = nextWidth;
      height = nextHeight;
    }
    if (!blob) throw new Error('No output could be created.');
    const actualFormat = detectFormat(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
    if (actualFormat !== options.format)
      throw new Error('The browser returned an unexpected output format.');
    const output = await decodeImage(blob);
    const info: FileInfo = {
      name: outputName(file.name, options.format),
      format: actualFormat,
      size: blob.size,
      width: output.width,
      height: output.height,
    };
    output.close();
    return { blob, info, warnings };
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
