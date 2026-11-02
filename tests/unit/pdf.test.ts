import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { inspectPdf, parsePages, processPdf } from '../../src/features/pdf/pdf-engine';
import { inspectPdfInWorker, processPdfInWorker } from '../../src/features/pdf/pdf-client';

async function fixture(widths = [300, 310, 320]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  widths.forEach((width, index) => {
    const page = doc.addPage([width, 600]);
    page.drawText(`Page ${index + 1}`, { x: 24, y: 550 });
  });
  return doc.save({ addDefaultPage: false });
}

async function encryptedFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.context.trailerInfo.Encrypt = doc.context.register(
    doc.context.obj({ Filter: PDFName.of('Standard') }),
  );
  return doc.save();
}

async function widthsOf(bytes: Uint8Array): Promise<number[]> {
  return (await PDFDocument.load(bytes)).getPages().map((page) => page.getWidth());
}

describe('PDF page selections', () => {
  it('converts one-based ranges to zero-based indexes in the requested order', () => {
    expect(parsePages(' 4, 1 - 2, 5 ', 5)).toEqual([3, 0, 1, 4]);
  });

  it.each([
    '',
    ' ',
    '0',
    '4',
    '1-4',
    '3-1',
    '1,1',
    '1-2,2',
    '1,,2',
    '1.5',
    '1e0',
    '-1',
    '1-',
    'all',
    'Infinity',
    '1;2',
    '1 2',
  ])('rejects invalid or duplicate page selections: %j', (selection) => {
    expect(() => parsePages(selection, 3)).toThrow();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid document page count: %j',
    (count) => {
      expect(() => parsePages('1', count)).toThrow();
    },
  );
});

describe('PDF inspection', () => {
  it('reads the page count from a real PDF', async () => {
    await expect(inspectPdf(await fixture())).resolves.toBe(3);
  });

  it('rejects empty and malformed documents', async () => {
    await expect(inspectPdf(new Uint8Array())).rejects.toThrow(/PDF|empty/i);
    await expect(inspectPdf(new TextEncoder().encode('%PDF-1.7\ninvalid\n%%EOF'))).rejects.toThrow(
      /PDF|malformed/i,
    );
  });

  it('rejects a truncated PDF rather than silently repairing it', async () => {
    const bytes = await fixture();
    await expect(inspectPdf(bytes.slice(0, -10))).rejects.toThrow(/PDF|truncated/i);
  });

  it('rejects encrypted PDFs without bypassing their encryption', async () => {
    await expect(inspectPdf(await encryptedFixture())).rejects.toThrow(/encrypted|password/i);
  });

  it('rejects PDFs with no pages', async () => {
    await expect(inspectPdf(await fixture([]))).rejects.toThrow(/page/i);
  });

  it('accepts 100 pages and rejects 101 pages', async () => {
    await expect(inspectPdf(await fixture(Array<number>(100).fill(300)))).resolves.toBe(100);
    await expect(inspectPdf(await fixture(Array<number>(101).fill(300)))).rejects.toThrow(/100/);
  });
});

describe('PDF page transformations', () => {
  it('merges all pages in input order', async () => {
    const result = await processPdf(
      [
        { bytes: await fixture([300, 310]), format: 'pdf' },
        { bytes: await fixture([400]), format: 'pdf' },
      ],
      'merge',
      '',
    );
    expect(await widthsOf(result)).toEqual([300, 310, 400]);
  });

  it('extracts pages in the requested order', async () => {
    const result = await processPdf([{ bytes: await fixture(), format: 'pdf' }], 'extract', '3,1');
    expect(await widthsOf(result)).toEqual([320, 300]);
  });

  it('removes only the selected pages and preserves the remaining order', async () => {
    const result = await processPdf([{ bytes: await fixture(), format: 'pdf' }], 'remove', '2');
    expect(await widthsOf(result)).toEqual([300, 320]);
  });

  it('reorders every page exactly once', async () => {
    const result = await processPdf(
      [{ bytes: await fixture(), format: 'pdf' }],
      'reorder',
      '3,1-2',
    );
    expect(await widthsOf(result)).toEqual([320, 300, 310]);
  });

  it('rejects an incomplete reorder and removal of every page', async () => {
    const input = [{ bytes: await fixture(), format: 'pdf' as const }];
    await expect(processPdf(input, 'reorder', '3,1')).rejects.toThrow(/every|all/i);
    await expect(processPdf(input, 'remove', '1-3')).rejects.toThrow(/one|empty/i);
  });

  it('rejects repeated or empty page selections before producing an output', async () => {
    const input = [{ bytes: await fixture(), format: 'pdf' as const }];
    await expect(processPdf(input, 'extract', '1,1')).rejects.toThrow(/once|duplicate/i);
    await expect(processPdf(input, 'extract', '')).rejects.toThrow(/page/i);
  });

  it('requires one PDF for page editing and PDF inputs for merge', async () => {
    const bytes = await fixture();
    await expect(
      processPdf(
        [
          { bytes, format: 'pdf' },
          { bytes, format: 'pdf' },
        ],
        'extract',
        '1',
      ),
    ).rejects.toThrow(/one|single/i);
    await expect(processPdf([{ bytes, format: 'png' }], 'merge', '')).rejects.toThrow(/PDF/i);
    await expect(processPdf([], 'merge', '')).rejects.toThrow(/file|PDF/i);
  });

  it('rejects encrypted input in transformations', async () => {
    await expect(
      processPdf([{ bytes: await encryptedFixture(), format: 'pdf' }], 'extract', '1'),
    ).rejects.toThrow(/encrypted|password/i);
  });

  it('enforces the merged output page limit', async () => {
    await expect(
      processPdf(
        [
          { bytes: await fixture(Array<number>(50).fill(300)), format: 'pdf' },
          { bytes: await fixture(Array<number>(51).fill(400)), format: 'pdf' },
        ],
        'merge',
        '',
      ),
    ).rejects.toThrow(/100/);
  });
});

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4EKABRwzIHACYmgtBRzfojwAAAABJRU5ErkJggg==',
    'base64',
  ),
);
const jpeg = Uint8Array.from(
  Buffer.from(
    '/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAABKADAAQAAAABAAAAAgAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAgAEAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8Ay6KKK/kM/wBTD//Z',
    'base64',
  ),
);

describe('images to PDF', () => {
  it('places JPEG and PNG on sequential A4 pages inside margins without changing their aspect ratio', async () => {
    const bytes = await processPdf(
      [
        { bytes: jpeg, format: 'jpeg' },
        { bytes: png, format: 'png' },
      ],
      'images',
      '',
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    for (const [index, page] of doc.getPages().entries()) {
      expect(page.getWidth()).toBeCloseTo(595.28, 1);
      expect(page.getHeight()).toBeCloseTo(841.89, 1);
      const contents = page.node.Contents() as PDFArray;
      const stream = doc.context.lookup(contents.get(0)) as PDFRawStream;
      const text = new TextDecoder().decode(decodePDFRawStream(stream).decode());
      const scale = [...text.matchAll(/([\d.]+) 0 0 ([\d.]+) 0 0 cm/g)].find(
        (match) => Number(match[1]) > 1 && Number(match[2]) > 1,
      );
      expect(scale).toBeDefined();
      const width = Number(scale?.[1]);
      const height = Number(scale?.[2]);
      expect(width / height).toBeCloseTo(2);
      expect(width).toBeLessThanOrEqual(523.28);
      expect(height).toBeLessThanOrEqual(769.89);
      const images = page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
      const embedded = doc.context.lookup(images?.values()[0]) as PDFRawStream;
      expect(embedded.dict.get(PDFName.of('Filter'))?.toString()).toBe(
        index === 0 ? '/DCTDecode' : '/FlateDecode',
      );
    }
  });

  it('rejects unsupported image formats, empty input and malformed images', async () => {
    await expect(processPdf([{ bytes: png, format: 'webp' }], 'images', '')).rejects.toThrow(
      /JPEG|PNG/i,
    );
    await expect(processPdf([], 'images', '')).rejects.toThrow(/image|file/i);
    await expect(
      processPdf([{ bytes: new Uint8Array([1, 2]), format: 'png' }], 'images', ''),
    ).rejects.toThrow(/image|PNG/i);
  });

  it('rejects more than 100 image pages', async () => {
    await expect(
      processPdf(
        Array.from({ length: 101 }, () => ({ bytes: png, format: 'png' as const })),
        'images',
        '',
      ),
    ).rejects.toThrow(/100/);
  });
});

// Native browser workers are unavailable in the Node test environment. This
// harness preserves structured-clone/transfer semantics and emits worker events.
class WorkerHarness {
  static current: WorkerHarness;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  request: unknown;
  terminated = false;

  constructor() {
    WorkerHarness.current = this;
  }

  postMessage(message: unknown, transfer: Transferable[]) {
    this.request = structuredClone(message, { transfer });
  }

  terminate() {
    this.terminated = true;
  }

  respond(value: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: value }));
  }
}

describe('PDF worker lifecycle', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', WorkerHarness);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns inspection results, releases the worker and keeps the caller bytes intact', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    const pending = inspectPdfInWorker(bytes);
    const result = expect(pending).resolves.toBe(3);
    WorkerHarness.current?.respond({ ok: true, value: 3 });
    await result;
    expect(bytes).toEqual(new Uint8Array([37, 80, 68, 70]));
    expect(WorkerHarness.current.terminated).toBe(true);
  });

  it('returns output bytes and keeps inputs usable for subsequent operations', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    const pending = processPdfInWorker([{ bytes, format: 'pdf' }], 'extract', '1');
    const result = expect(pending).resolves.toEqual(new Uint8Array([1, 2, 3]));
    WorkerHarness.current?.respond({ ok: true, value: new Uint8Array([1, 2, 3]) });
    await result;
    expect(bytes.byteLength).toBe(4);
    expect(WorkerHarness.current.terminated).toBe(true);
  });

  it('forwards a processing failure and releases the worker', async () => {
    const pending = inspectPdfInWorker(new Uint8Array([1]));
    const result = expect(pending).rejects.toThrow(/encrypted/i);
    WorkerHarness.current?.respond({ ok: false, error: 'Encrypted PDF.' });
    await result;
    expect(WorkerHarness.current.terminated).toBe(true);
  });

  it('terminates a stalled task after 60 seconds', async () => {
    const pending = inspectPdfInWorker(new Uint8Array([1]));
    const result = expect(pending).rejects.toThrow(/60 seconds/i);
    await vi.advanceTimersByTimeAsync(60_000);
    await result;
    expect(WorkerHarness.current.terminated).toBe(true);
  });

  it('rejects a crashed worker and releases it', async () => {
    const pending = inspectPdfInWorker(new Uint8Array([1]));
    const result = expect(pending).rejects.toThrow(/stopped|worker/i);
    WorkerHarness.current?.onerror?.({ preventDefault() {} } as ErrorEvent);
    await result;
    expect(WorkerHarness.current.terminated).toBe(true);
  });

  it('rejects unreadable worker messages and releases the worker', async () => {
    const pending = inspectPdfInWorker(new Uint8Array([1]));
    const result = expect(pending).rejects.toThrow(/read|worker/i);
    WorkerHarness.current?.onmessageerror?.(new MessageEvent('messageerror'));
    await result;
    expect(WorkerHarness.current.terminated).toBe(true);
  });
});
