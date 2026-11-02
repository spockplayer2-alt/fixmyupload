export type Format = 'jpeg' | 'png' | 'webp' | 'pdf';
export type ImageFormat = Exclude<Format, 'pdf'>;
export interface Requirements {
  formats: Format[];
  minBytes?: number;
  maxBytes?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  width?: number;
  height?: number;
  maxPages?: number;
  aspectRatio?: number;
}
export interface FileInfo {
  name: string;
  format: Format;
  size: number;
  width?: number;
  height?: number;
  pages?: number;
}
export interface Check {
  label: string;
  required: string;
  actual: string;
  passed: boolean;
}
export interface ImageOptions {
  format: ImageFormat;
  quality: number;
  fit: 'contain' | 'crop' | 'pad';
  background: string;
  rotation?: 0 | 90 | 180 | 270;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  /** Crop placement from the leading edge (0) to the trailing edge (1). */
  cropX?: number;
  cropY?: number;
}
export interface Output {
  blob: Blob;
  info: FileInfo;
  warnings: string[];
}
export const LIMITS = {
  fileBytes: 30_000_000,
  batchBytes: 60_000_000,
  pixels: 12_000_000,
  pages: 100,
  files: 20,
} as const;
export const MIME: Record<Format, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};
