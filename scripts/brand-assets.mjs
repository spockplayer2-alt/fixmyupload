import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const symbol = (ink = '#242a24', accent = '#d2ed83', paper = '#f4f5ef') =>
  `<path d="M3 2h19l11 11v25H3V2Z" fill="${ink}"/><path d="M22 2v11h11" fill="none" stroke="${paper}" stroke-width="2"/><path d="m10 27 7-7 7 7M17 20v13" fill="none" stroke="${accent}" stroke-width="3"/>`;
const svg = (body, w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const lockup = (ink, accent, paper) =>
  svg(
    `${symbol(ink, accent, paper)}<text x="47" y="29" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="700" letter-spacing="-1" fill="${ink}">FixMyUpload<tspan fill="${accent}">.</tspan></text>`,
    220,
    40,
  );
await writeFile('assets/branding/symbol.svg', svg(symbol(), 36, 40));
await writeFile(
  'assets/branding/symbol-dark.svg',
  svg(symbol('#ebeee4', '#536d2f', '#191e19'), 36, 40),
);
await writeFile(
  'assets/branding/symbol-mono.svg',
  svg(symbol('#242a24', '#f4f5ef', '#f4f5ef'), 36, 40),
);
await writeFile('assets/branding/logo-light.svg', lockup('#242a24', '#8ba64d', '#f4f5ef'));
await writeFile('assets/branding/logo-dark.svg', lockup('#ebeee4', '#b5cc88', '#191e19'));
await writeFile('assets/branding/logo-mono.svg', lockup('#242a24', '#242a24', '#ffffff'));
await writeFile(
  'public/favicon.svg',
  svg(
    `<rect width="40" height="44" rx="7" fill="#f4f5ef"/><g transform="translate(2 2)">${symbol()}</g>`,
    40,
    44,
  ),
);
await sharp(
  Buffer.from(
    svg(
      `<rect width="180" height="180" rx="34" fill="#f4f5ef"/><g transform="translate(47 42) scale(2.4)">${symbol()}</g>`,
      180,
      180,
    ),
  ),
)
  .png()
  .toFile('public/apple-touch-icon.png');
const social = svg(
  `<rect width="1280" height="640" fill="#f4f5ef"/><path d="M70 480h1140" stroke="#d7ddce"/><g transform="translate(81 72) scale(2)">${symbol()}</g><text x="176" y="131" font-family="Arial,Helvetica,sans-serif" font-size="49" font-weight="700" letter-spacing="-2" fill="#242a24">FixMyUpload.</text><text x="80" y="292" font-family="Arial,Helvetica,sans-serif" font-size="72" font-weight="700" letter-spacing="-3" fill="#242a24">Wrong size. Wrong format.</text><text x="80" y="375" font-family="Arial,Helvetica,sans-serif" font-size="72" font-weight="700" letter-spacing="-3" fill="#72845b">Right place.</text><text x="83" y="544" font-family="Arial,Helvetica,sans-serif" font-size="24" fill="#737a6f">Convert. Compress. Resize. Validate.</text><rect x="866" y="512" width="343" height="46" rx="23" fill="#d2ed83"/><text x="897" y="542" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="#34451d">Your files stay on your device.</text>`,
  1280,
  640,
);
await writeFile('assets/branding/social-preview.svg', social);
await sharp(Buffer.from(social)).png().toFile('public/og-image.png');
