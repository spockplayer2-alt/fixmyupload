import type { PdfInput, PdfOperation } from './pdf-engine';
import type { PdfRequest, PdfResponse } from './pdf-protocol';

function runPdfTask(request: PdfRequest): Promise<number | Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' });
    let settled = false;
    const timer = setTimeout(() => {
      finish(new Error('PDF processing took longer than 60 seconds. Try a smaller file.'));
    }, 60_000);

    function finish(error?: Error, value?: number | Uint8Array) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
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

export async function inspectPdfInWorker(bytes: Uint8Array): Promise<number> {
  const result = await runPdfTask({ kind: 'inspect', bytes });
  if (typeof result !== 'number') throw new Error('The PDF worker returned an invalid page count.');
  return result;
}

export async function processPdfInWorker(
  inputs: PdfInput[],
  operation: PdfOperation,
  selection: string,
): Promise<Uint8Array> {
  const result = await runPdfTask({ kind: 'process', inputs, operation, selection });
  if (!(result instanceof Uint8Array))
    throw new Error('The PDF worker returned an invalid document.');
  return result;
}
