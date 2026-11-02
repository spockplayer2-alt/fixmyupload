import type { Format } from '../types/files';

/** Identifies supported containers. A decoder must still validate their contents. */
export function detectFormat(bytes: Uint8Array): Format | null {
  const startsWith = (signature: readonly number[], offset = 0) =>
    bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp';
  }
  if (
    startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]) &&
    bytes.length >= 8 &&
    (bytes[5] === 0x31 || bytes[5] === 0x32) &&
    bytes[6] === 0x2e &&
    bytes[7] >= 0x30 &&
    bytes[7] <= 0x39
  )
    return 'pdf';
  return null;
}
