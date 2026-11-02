import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const symbol = (ink = '#171717', accent = '#3560e8') =>
  `<path d="M4 4h17v6H10v6h9v6h-9v6H4V4Z" fill="${ink}"/><path d="M24 4h4v24H14v-6h10V4Z" fill="${accent}"/>`;
const svg = (body, w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const lockup = (ink, accent) =>
  svg(
    `${symbol(ink, accent)}<text x="44" y="25" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="600" letter-spacing="-.8" fill="${ink}">FixMyUpload</text>`,
    196,
    32,
  );
for (const [name, ink, accent] of [
  ['light', '#171717', '#3560e8'],
  ['dark', '#f5f5f5', '#8da6ff'],
  ['mono', '#171717', '#171717'],
]) {
  await writeFile(`assets/branding/logo-${name}.svg`, lockup(ink, accent));
  await writeFile(
    `assets/branding/symbol${name === 'light' ? '' : `-${name}`}.svg`,
    svg(symbol(ink, accent), 32, 32),
  );
}
await writeFile(
  'public/favicon.svg',
  svg(`<rect width="32" height="32" rx="6" fill="#fff"/>${symbol()}`, 32, 32),
);
await sharp(
  Buffer.from(
    svg(
      `<rect width="180" height="180" rx="32" fill="#fff"/><g transform="translate(28 28) scale(3.875)">${symbol()}</g>`,
      180,
      180,
    ),
  ),
)
  .png()
  .toFile('public/apple-touch-icon.png');
const social = svg(
  `<rect width="1280" height="640" fill="#fff"/><g transform="translate(80 64) scale(1.5)">${symbol()}</g><text x="144" y="103" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="600" fill="#171717">FixMyUpload</text><text x="80" y="286" font-family="Arial,Helvetica,sans-serif" font-size="70" font-weight="600" letter-spacing="-2" fill="#171717">Fix files that</text><text x="80" y="372" font-family="Arial,Helvetica,sans-serif" font-size="70" font-weight="600" letter-spacing="-2" fill="#171717">websites reject.</text><path d="M80 450h1120" stroke="#e5e5e5"/><text x="80" y="520" font-family="Arial,Helvetica,sans-serif" font-size="26" fill="#666">Convert. Compress. Resize. Check.</text><text x="80" y="560" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#666">Free, private, and entirely in your browser.</text><g transform="translate(980 230) scale(5)">${symbol('#171717', '#3560e8')}</g>`,
  1280,
  640,
);
await writeFile('assets/branding/social-preview.svg', social);
await sharp(Buffer.from(social)).png().toFile('public/og-image.png');
