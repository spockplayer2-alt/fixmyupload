# FixMyUpload 2.0 design and implementation

The existing React/Vite pipeline supports image conversion, bounded compression, contain/crop/pad resizing, orientation, PDF structural operations and conservative parsing. Preserve these contracts and all existing safety limits. The original screenshot and live interface show too many competing micro-labels, a large permanent split layout, small supporting type and settings before selection.

## Direction

A white/neutral utility with locally bundled Geist, natural sentence-case labels and a sparing cobalt accent. A custom compatibility symbol uses two opposing brackets whose interlocking center forms an F. No document/checkmark motif. Home is an upload-first canvas and compact tool directory. Once selected, a file rail and focused controls replace the home; results lead with preview, size change and download, with detailed validation in disclosure.

Tokens: font sizes 12/13/14/16/20/24/32/48; weights400/500/600; line heights1.2/1.4/1.6; spacing4/8/12/16/20/24/32/40/48/64; control heights40/44; radii6/8/12/16. Neutral surfaces white/#f9f9f9/#f5f5f5 and dark #111/#181818/#202020; text #171717/#666 and dark #f5f5f5/#a3a3a3; borders #e5e5e5/#303030. Focus cobalt outline; semantic status text and icons. Motion120/180ms, disabled under reduced motion. Breakpoints600/900/1200.

## Reference observations

Reviewed current official pages: [ChatGPT](https://chatgpt.com/overview/), [Linear](https://linear.app/features), [Raycast](https://www.raycast.com/), [Geist](https://vercel.com/geist/introduction), [Apple controls](https://developer.apple.com/design/human-interface-guidelines/controls), [Stripe docs](https://docs.stripe.com/), [Primer buttons](https://primer.style/product/components/button/). Apply clear neutral hierarchy, concise task labels, precise segmented controls, selected states and predictable keyboard interactions. Do not copy brand assets, decorative marketing effects or proprietary controls.

## Execution

- [ ] Rebuild home/workspace/results, brand assets, tokens and responsive controls.
- [ ] Add image rotation/flipping, crop position, batch+ZIP, opt-in settings presets, cancellation and before/after previews.
- [ ] Add PDF rotation and local page previews with selection/reordering.
- [ ] Extend deterministic requirements with minimum bytes and preserve ambiguity handling.
- [ ] Generate real static tool routes with per-page titles/descriptions/canonicals for Pages.
- [ ] Run existing and changed behavior tests; inspect actual desktop/mobile renders twice.
- [ ] Update docs/screenshots, push branch, open PR, wait for CI, merge normally, verify Pages, publish2.0.

All processing stays local. Presets store settings only following an explicit Save action. No AI, analytics, external fonts or document persistence. Advanced PDF compression and PDF-to-image export remain out of scope unless reliable implementation fits; real PDF preview uses local PDF.js. Existing public repository protections remain active.
