# Contributing

Small, well-explained improvements are welcome. For a substantial feature, open an issue first so we can discuss the scope.

## Local setup

Use Node 22.12+ and npm:

```bash
npm ci
npm run dev
npx playwright install chromium
```

Before submitting:

```bash
npm run check
npm run format:check
npm run test:e2e
```

CI runs the same checks on Linux. Use a branch for your change and describe the problem, resulting behavior, and checks you ran in the pull request. Include screenshots for interface changes. Don't commit build outputs, credentials or personal documents.

## Where to work

Processing belongs in `src/features/`; keep UI behavior in `src/components/` and orchestration in `src/app/`. Parsing and validation share the `Requirements` type. Validation must inspect actual encoded results, never assume that a requested setting was achieved.

Add regression coverage for behavior changes. For file formats, include small, synthetic or appropriately licensed fixtures and explain their origin. Tests must exercise real processing rather than pretend success through mocks. Browser codecs need browser tests.

## Privacy is a design constraint

New functionality must work locally by default. Don't add analytics, remote parsers, uploaded-file storage or external fonts. Explain memory costs and supported formats honestly. Every processing promise needs a failure path.

## Branding assets

Editable SVG sources are in `assets/branding/`. Regenerate PNG derivatives with `node scripts/brand-assets.mjs`. The interface screenshot is captured from the running app; never replace it with a mockup.

By contributing, you agree that your contributions are licensed under this project's MIT license. Follow the [code of conduct](CODE_OF_CONDUCT.md).
