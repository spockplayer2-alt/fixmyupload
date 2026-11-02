# Version 2.0 verification

Verified locally on November 2, 2026 with Node24 and Chromium.

- Strict TypeScript, ESLint and Prettier checks passed.
- 102 unit/integration tests passed, covering preserved operations plus batch limits, transforms, minimum-byte requirements, PDF rotation and immediate worker cancellation.
- Desktop/mobile browser coverage exercises real encoders, EXIF orientation, transparency, size search, downloads, batch ZIP contents, settings-only presets, native rotation/flip pixels, PDF previews, selected-page rotation, empty-selection errors, dialogs and tool routes. See CI for the final executed browser count and status.
- All14 production tool routes returned200 locally and displayed working inputs, correct titles and one matching canonical URL. No browser page errors occurred.
- Visual reviews inspected home, workspace, results and dark/mobile screenshots. Widths360,390,768,1024,1440 and1920px showed no horizontal overflow. A200% CSS-zoom layout check and360px long-filename/long-error check also showed no overflow; this is not a complete WCAG certification.
- Main JavaScript293.12kB (92.35kB gzip), CSS23.20kB (5.42kB gzip), and three locally bundled font weights. PDF processing425.80kB, PDF.js renderer444.23kB and its1.27MB worker load on demand. ZIP support is also lazy.
- Runtime dependency audit found zero advisories. Geist's SIL Open Font License is included with the distributed assets.

The compression browser test allows60seconds for the bounded quality/dimension search on contended machines; it still verifies actual bytes, dimensions and failed impossible constraints. Browser automation currently covers Chromium desktop and mobile emulation. Firefox/WebKit coverage remains future work.

GitHub Actions verifies the PR before normal merging. Deployment follows passing main-branch CI; release status must be checked on GitHub rather than inferred from local tests.
