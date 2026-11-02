# Visual system, version 2

FixMyUpload is a restrained file utility. The homepage gives the file input priority; selected files open a focused workspace. Primary actions are neutral, with cobalt reserved for the brand, focus and selected controls. Uppercase numbered labels and the original warm green palette have been removed.

## Tokens

| Role              | Light   | Dark    |
| ----------------- | ------- | ------- |
| Page              | #ffffff | #111111 |
| Secondary surface | #f9f9f9 | #181818 |
| Elevated surface  | #f5f5f5 | #202020 |
| Primary text      | #171717 | #f5f5f5 |
| Secondary text    | #666666 | #a3a3a3 |
| Border            | #e5e5e5 | #303030 |
| Accent/focus      | #3560e8 | #8da6ff |

Geist Sans is bundled locally at weights 400, 500 and 600, under the SIL Open Font License in `public/Geist-OFL.txt`. Sizes: 12px metadata, 13px labels, 14–16px body, 20–24px sections, 28px workspace titles, and a responsive 34–48px homepage title. Tabular figures align measurements without using a decorative monospace family.

Spacing uses 4/8/12/16/20/24/32/40/48/64px. Controls are 40px on desktop, with principal mobile controls at 44px. Radii are 6/8/12/16px for small elements, controls, panels and dialogs. Only segmented controls and dialogs use elevation. Icons use 14–20px Lucide strokes consistently. Hover changes take120ms; reduced motion disables animation and transitions.

Breakpoints at600,900 and1440px change navigation density, file-rail placement and container width. A visible 2px accent focus ring has a 3px offset. Status uses words and icons as well as color. Native modal dialogs preserve focus and Escape behavior. File inputs and PDF page operations have keyboard alternatives to dragging.

## Mark

The new symbol uses two interlocking right-angle shapes. The left shape defines an F; the opposing bracket closes the shape into a compatible pair. It is built on a32px grid with a6px structural stroke and works in one color. It avoids the previous document-and-arrow motif. Light, dark and monochrome SVG sources, favicon, touch icon and social preview are stored locally. Regenerate derivatives with `node scripts/brand-assets.mjs`.

## Review

Two focused visual reviews compare the original deployed screen with the new desktop home/workspace/results and mobile dark theme. Representative widths are360,390,768,1024,1440 and1920px. No horizontal overflow was observed in the first pass. PDF thumbnail layout and explicit selection states were corrected during review. See `docs/v2-design.md` for the design references and `docs/verification.md` for executed checks.
