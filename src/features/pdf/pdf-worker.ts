import { inspectPdf, processPdf } from './pdf-engine';
import type { PdfRequest, PdfResponse } from './pdf-protocol';

interface PdfWorkerScope {
  onmessage: ((event: MessageEvent<PdfRequest>) => void) | null;
  postMessage(message: PdfResponse, transfer?: Transferable[]): void;
}

const scope = globalThis as unknown as PdfWorkerScope;
scope.onmessage = async ({ data }) => {
  try {
    if (data.kind === 'inspect') {
      scope.postMessage({ ok: true, value: await inspectPdf(data.bytes) });
    } else {
      const bytes = Uint8Array.from(await processPdf(data.inputs, data.operation, data.selection));
      scope.postMessage({ ok: true, value: bytes }, [bytes.buffer]);
    }
  } catch (error) {
    scope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'This PDF could not be processed.',
    });
  }
};
