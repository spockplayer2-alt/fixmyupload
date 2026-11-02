# Visual system

FixMyUpload is a useful desk tool: quiet, readable and direct. The interface sits close to the work, with restrained borders and a source/editor split rather than a marketing page.

## Mark

Three concepts were considered: a repaired document seam, a folded preparation arrow, and a cutout F monogram. The folded preparation arrow was selected: one geometric page silhouette joins its folded corner to an internal upward stroke. The arrow is cut into the file, so the mark reads as a prepared document rather than two adjacent icons.

Source artwork lives in `assets/branding/`. Horizontal light/dark/monochrome lockups and standalone symbols are SVG. `public/favicon.svg` has a pale container for consistent visibility at tiny sizes. The apple icon and 1280×640 social preview are locally generated from editable vector sources with `node scripts/brand-assets.mjs`.

## Tokens

| Token      | Light     | Dark      |
| ---------- | --------- | --------- |
| Paper      | `#f4f5ef` | `#191e19` |
| Surface    | `#ffffff` | `#222822` |
| Ink        | `#242a24` | `#ebeee4` |
| Muted text | `#737a6f` | `#a4ad9c` |
| Border     | `#e0e4d9` | `#3b4436` |
| Accent     | `#d2ed83` | `#d2ed83` |
| Error text | `#a43825` | `#ffb39e` |

Typography uses locally available system sans-serif fonts with system monospace for specifications and section numbers. No font is fetched from another host. Main title 32–39px; body 14px; compact labels 10–12px. Small monospaced annotations are supplementary, never the only label on an interactive control.

Spacing is based on 4px increments, with 20–32px panel insets. Controls have 5px corners; the main workspace has 10px corners. Lucide icons use consistent 14–20px sizes and restrained strokes. Status includes both text and symbols, not color alone.

The source/editor columns stack below 600px. Focus rings use a visible olive outline with spacing. Reduced-motion preferences disable transitions and the loading spinner. Theme defaults to the operating system and can be changed for the current session.
