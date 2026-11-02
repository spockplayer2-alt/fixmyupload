# v0.1.0 verification

Verified locally on November 2, 2026 with Node 24 and Chromium:

- Strict TypeScript, ESLint and Prettier checks passed.
- 81 unit/integration tests passed: format detection, dimensional planning, conservative parsing, conflicts, output validation, PDF operations and worker lifecycle, and parser UI confirmation.
- 16 desktop/mobile Chromium tests passed for conversions, downloads, sizing, transparency, EXIF orientation, compression, crop/pad and error handling. After release review, targeted Chromium regressions for EXIF-corrected image PDFs and privacy-dialog keyboard focus passed.
- Production build passed. Main JavaScript: 270.58 kB (85.92 kB gzip); CSS: 16.60 kB (4.38 kB gzip). PDF code is a separate 425.53 kB worker loaded only when needed.
- Dependency installation audited clean after overriding minimatch to the patched 11.x release. No runtime or development advisories remained at that check.
- Real screenshots captured from the running app are included in this directory, in light, dark and mobile views.

Automated browser coverage is Chromium only. Firefox and WebKit are not yet in CI. CI and deployment status are visible in GitHub Actions; local evidence is not a claim about a pending remote run.
