import type { PdfInput, PdfOperation } from './pdf-engine';

export type PdfRequest =
  | { kind: 'inspect'; bytes: Uint8Array }
  | { kind: 'process'; inputs: PdfInput[]; operation: PdfOperation; selection: string };

export type PdfResponse = { ok: true; value: number | Uint8Array } | { ok: false; error: string };
