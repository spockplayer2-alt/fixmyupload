import console from 'node:console';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import tools from '../src/app/tool-catalog.json' with { type: 'json' };
const html = await readFile('dist/index.html', 'utf8');
const base = 'https://spockplayer2-alt.github.io/fixmyupload/';
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const tool of tools) {
  await mkdir(`dist/${tool.slug}`, { recursive: true });
  const page = html
    .replaceAll('./assets/', '../assets/')
    .replaceAll('./favicon.svg', '../favicon.svg')
    .replaceAll('./apple-touch-icon.png', '../apple-touch-icon.png')
    .replace(/<title>.*?<\/title>/, `<title>${escape(tool.title)} — FixMyUpload</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/,
      `$1${escape(tool.description)} Free, local file processing.$2`,
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${base}${tool.slug}/"/>`,
    );
  await writeFile(`dist/${tool.slug}/index.html`, page);
}
await writeFile(
  'dist/404.html',
  html
    .replaceAll('./assets/', `${base}assets/`)
    .replaceAll('./favicon.svg', `${base}favicon.svg`)
    .replaceAll('./apple-touch-icon.png', `${base}apple-touch-icon.png`),
);
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', ...tools.map((t) => `${t.slug}/`)].map((path) => `<url><loc>${base}${path}</loc></url>`).join('')}</urlset>`,
);
console.log(`Generated ${tools.length} functional tool pages, 404 and sitemap.`);
