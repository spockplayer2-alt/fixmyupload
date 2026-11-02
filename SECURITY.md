# Security

## Supported version

Security fixes target the latest released version. This is an early project; there is no long-term support policy yet.

## Report a vulnerability privately

Use [GitHub's private vulnerability reporting](https://github.com/spockplayer2-alt/fixmyupload/security/advisories/new) when enabled. If it is unavailable, open an issue asking for a private contact without describing the exploit or attaching files, and wait for the maintainer's response.

Include affected versions, reproducible steps, browser details, and a small synthetic example where possible. Do not attach passwords, personal documents or real identification. Please allow time to investigate before public disclosure; no response-time guarantee is offered.

## Boundaries

Files are processed in the browser with bounded sizes. This reduces file disclosure risk but does not make malformed files harmless. Dependencies and browser decoders remain part of the trust boundary. The app is not a malware scanner or PDF sanitizer. Reorganized PDFs may retain embedded content from their originals.

No server secrets are needed. Report unexpected network requests carrying file content as a security issue. Dependency updates are checked through Dependabot and npm audit.
