# Architecture and limits

## Data flow

Selection → byte signature → metadata decode → requirements/conflicts → processing → re-inspection → validation → download.

`Requirements` is the common contract. The parser proposes values; it does not mutate settings. The editor requires review, and ambiguous parsing requires an additional acknowledgement. Manual fields use the same validation module. A generation token prevents a stale asynchronous result from replacing a newer selection.

## Images

JPEG/PNG/WebP headers are inspected before allocating a decoded image. Input and output are limited to 12 megapixels. `createImageBitmap` handles orientation; Canvas draws without stretching. Crop centers the image; pad fills the selected background. PNG and WebP retain alpha when no padding is applied. JPEG is flattened onto a selected background.

Encoding begins at the selected quality. When a byte limit is missed, JPEG/WebP try 20% quality and use eight binary-search iterations to find a better fitting quality. If no quality fits, dimensions reduce by 20% per attempt, up to 14 attempts, without passing minimum bounds. Exact dimensions and explicit aspect-ratio output are not silently reduced. PNG has no lossy-quality setting. Every result is decoded and measured again; failure is visible even if the file can be downloaded.

Canvas encoding is asynchronous; drawing and decoding can still occupy the browser's main thread briefly. Processing one image at a time and keeping explicit pixel limits bounds memory. Metadata and source color-profile preservation are not provided.

## PDFs

A module worker loads pdf-lib only on demand. A task gets copied byte buffers so transfer doesn't detach the original. Each worker terminates on success, error, malformed response, or after 60 seconds. Parsed page numbers are one-based in the UI and zero-based internally; order is meaningful, duplicates are rejected, and reordering requires all pages.

A PDF may contain up to 100 pages; combined output is checked too. Image PDFs place one image on each A4 page, inside margins. WebP is converted to PNG locally first. Splitting creates one PDF per selected page and individual download buttons. It does not create a ZIP archive.

PDF operations are structural, not advanced compression or sanitization. Forms, signatures, bookmarks and accessibility structure may not survive copying pages. Original files should be retained.

## Limits

30,000,000 bytes per file; 60,000,000 bytes combined input or split results; 20 input files; 12,000,000 pixels per decoded image; 100 pages per PDF/output. KB and MB are decimal (1,000 and 1,000,000 bytes). The parser also recognizes KiB/MiB. “Under 500 KB” becomes 499,999 bytes rather than an inclusive 500,000.

The application makes no network requests carrying file contents. It has no backend, service worker, persistence, accounts or telemetry. The static host delivers code and assets. Browser APIs are required; unsupported codecs fail explicitly.

## Build size

See `docs/verification.md` for measured release-build sizes and executed checks. Source files and the worker are separate chunks. No preloading of pdf-lib occurs on the initial page.
