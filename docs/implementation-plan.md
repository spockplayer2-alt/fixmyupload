# FixMyUpload implementation plan

Goal: a private, browser-only utility that produces and validates files against upload restrictions.

Architecture: React with small feature modules, Canvas image encoders, lazy pdf-lib, deterministic parsing, and one shared requirements contract. Native browser processing avoids a backend. A worker isolates PDF operations. Static GitHub Pages hosting is preferred.

Design: warm paper, dark ink, acid lime status accents; system typography with monospaced specifications. Three logo concepts considered: a repaired seam, opposing conversion folds, and a cutout F. Select opposing folds: a continuous document silhouette whose inner diagonal becomes an upward preparation arrow. It remains recognizable in one color at 16px.

Constraints: no file uploads, analytics, external fonts, paid services, unsupported success claims, or persisted documents. 30 MB per file, 60 MB batch, 12 megapixels per image, 100 PDF pages.

- [x] 1. Establish strict TypeScript, Vite, lint, formatting and test configurations.
- [x] 2. Test and implement magic-byte detection, dimensional planning, requirements parser and output validation. Test malformed, conflicting, ambiguous and non-finite values.
- [x] 3. Test and implement image encoding and bounded size search with orientation, transparency, crop/pad and honest failure.
- [x] 4. Test and implement image-to-PDF, merge, extract, remove and reorder operations; reject encrypted/malformed PDFs and invalid page selections.
- [x] 5. Test and build responsive upload, editor, parser confirmation and validated result/download UI. Ensure stale async results cannot replace newer selections.
- [x] 6. Inspect both themes and mobile layout. Run browser conversion/download/PDF flows. Capture real screenshot and render brand assets.
- [x] 7. Complete privacy, contribution, security, license, roadmap, CI and deployment documentation.
- [x] 8. Publish using verified spockplayer2-alt identity, verify CI/deployment and release only after checks pass.

The detailed user brief in this chat is the binding specification. User explicitly delegated design/implementation decisions and opted out of routine approval gates. Existing empty checkout is suitable; no unrelated work exists. Publication is authorized. GitHub connector identity verified; CLI authentication is expired and belongs to a different account.
