export function formatBytes(bytes: number): string {
  return bytes < 1000
    ? `${bytes} B`
    : bytes < 1_000_000
      ? `${+(bytes / 1000).toFixed(1)} KB`
      : `${+(bytes / 1_000_000).toFixed(2)} MB`;
}
export function outputName(name: string, extension: string): string {
  const base =
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N}._ -]/gu, '_')
      .slice(0, 100) || 'file';
  return `${base}-fixed.${extension === 'jpeg' ? 'jpg' : extension}`;
}
