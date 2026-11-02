import type { PdfInput, PdfOperation, PdfRotation } from './pdf-engine';
import type { PdfRequest, PdfResponse } from './pdf-protocol';

function runPdfTask(request: PdfRequest, signal?: AbortSignal): Promise<number | Uint8Array> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('PDF processing was cancelled.', 'AbortError'));
      return;
    }
    const worker = new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' });
    let settled = false;
    const onAbort = () => finish(new DOMException('PDF processing was cancelled.', 'AbortError'));
    const timer = setTimeout(() => {
      finish(new Error('PDF processing took longer than 60 seconds. Try a smaller file.'));
    }, 60_000);

    function finish(error?: Error, value?: number | Uint8Array) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      if (error) reject(error);
      else if (value !== undefined) resolve(value);
    }

    worker.onmessage = (event: MessageEvent<PdfResponse>) => {
      if (!event.data.ok) finish(new Error(event.data.error));
      else finish(undefined, event.data.value);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(new Error('The PDF worker stopped unexpectedly. Try a smaller file.'));
    };
    worker.onmessageerror = () => {
      finish(new Error('The PDF worker result could not be read. Please try again.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    try {
      const transfer: ArrayBuffer[] = [];
      const copyBytes = (bytes: Uint8Array) => {
        const copy = Uint8Array.from(bytes);
        transfer.push(copy.buffer);
        return copy;
      };
      const message: PdfRequest =
        request.kind === 'inspect'
          ? { ...request, bytes: copyBytes(request.bytes) }
          : {
              ...request,
              inputs: request.inputs.map((input) => ({ ...input, bytes: copyBytes(input.bytes) })),
            };
      worker.postMessage(message, transfer);
    } catch {
      finish(new Error('The PDF worker could not start. Please try again.'));
    }
  });
}

export async function inspectPdfInWorker(bytes: Uint8Array, signal?: AbortSignal): Promise<number> {
  const result = await runPdfTask({ kind: 'inspect', bytes }, signal);
  if (typeof result !== 'number') throw new Error('The PDF worker returned an invalid page count.');
  return result;
}

export async function processPdfInWorker(
  inputs: PdfInput[],
  operation: PdfOperation,
  selection: string,
  rotation: PdfRotation = 90,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const result = await runPdfTask(
    { kind: 'process', inputs, operation, selection, rotation },
    signal,
  );
  if (!(result instanceof Uint8Array))
    throw new Error('The PDF worker returned an invalid document.');
  return result;
}
