import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import { LIMITS } from '../../types/files';
import type { Format } from '../../types/files';

export type PdfOperation = 'merge' | 'extract' | 'remove' | 'reorder' | 'rotate' | 'images';
export type PdfRotation = 90 | 180 | 270;
export interface PdfInput {
  bytes: Uint8Array;
  format: Format;
}

export { parsePages } from './page-selection';
import { parsePages } from './page-selection';

async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  const header = new TextDecoder().decode(bytes.subarray(0, 8));
  const tail = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
  if (!/^%PDF-\d\.\d/.test(header) || !tail.includes('%%EOF')) {
    throw new Error('This PDF is malformed or truncated. Choose a complete PDF file.');
  }

  let doc: PDFDocument;
  let count: number;
  try {
    doc = await PDFDocument.load(bytes, {
      throwOnInvalidObject: true,
      updateMetadata: false,
      capNumbers: false,
    });
    count = doc.getPageCount();
  } catch (error) {
    // pdf-lib's transpiled Error subclasses do not preserve instanceof.
    if (error instanceof Error && /encrypted/i.test(error.message)) {
      throw new Error('Encrypted or password-protected PDFs are not supported.', { cause: error });
    }
    throw new Error('This PDF is malformed or could not be read.', { cause: error });
  }
  if (count < 1) throw new Error('The PDF must contain at least one page.');
  if (count > LIMITS.pages) throw new Error(`PDFs are limited to ${LIMITS.pages} pages.`);
  return doc;
}

export async function inspectPdf(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}

export async function processPdf(
  inputs: PdfInput[],
  operation: PdfOperation,
  selection: string,
  rotation: PdfRotation = 90,
): Promise<Uint8Array> {
  if (inputs.length === 0) throw new Error('Choose at least one file.');
  const output = await PDFDocument.create();

  if (operation === 'images') {
    if (inputs.length > LIMITS.pages) throw new Error(`PDFs are limited to ${LIMITS.pages} pages.`);
    if (inputs.some(({ format }) => format !== 'jpeg' && format !== 'png')) {
      throw new Error('Image-to-PDF accepts JPEG and PNG images.');
    }
    const [pageWidth, pageHeight] = PageSizes.A4;
    const margin = 36;
    for (const { bytes, format } of inputs) {
      try {
        const image =
          format === 'jpeg' ? await output.embedJpg(bytes) : await output.embedPng(bytes);
        const scale = Math.min(
          (pageWidth - margin * 2) / image.width,
          (pageHeight - margin * 2) / image.height,
        );
        const width = image.width * scale;
        const height = image.height * scale;
        output.addPage(PageSizes.A4).drawImage(image, {
          x: (pageWidth - width) / 2,
          y: (pageHeight - height) / 2,
          width,
          height,
        });
      } catch {
        throw new Error('An image could not be read. Choose a valid JPEG or PNG.');
      }
    }
  } else {
    if (inputs.some(({ format }) => format !== 'pdf'))
      throw new Error('This operation requires PDF files.');
    if (operation !== 'merge' && inputs.length !== 1)
      throw new Error('Choose one PDF for this operation.');
    if (!['merge', 'extract', 'remove', 'reorder', 'rotate'].includes(operation))
      throw new Error('Choose a supported PDF operation.');
    if (operation === 'rotate' && ![90, 180, 270].includes(rotation))
      throw new Error('Choose a rotation of 90, 180 or 270 degrees.');

    for (const { bytes } of inputs) {
      const source = await loadPdf(bytes);
      let indexes = source.getPageIndices();
      let rotated: Set<number> | undefined;
      if (operation === 'rotate') {
        rotated = new Set(
          selection.trim() ? parsePages(selection, source.getPageCount()) : indexes,
        );
      } else if (operation !== 'merge') {
        const selected = parsePages(selection, source.getPageCount());
        if (operation === 'remove') {
          const removed = new Set(selected);
          indexes = indexes.filter((index) => !removed.has(index));
          if (indexes.length === 0) throw new Error('Keep at least one page in the PDF.');
        } else {
          if (operation === 'reorder' && selected.length !== indexes.length) {
            throw new Error('A reorder must include every page exactly once.');
          }
          indexes = selected;
        }
      }
      if (output.getPageCount() + indexes.length > LIMITS.pages) {
        throw new Error(`The combined PDF exceeds ${LIMITS.pages} pages.`);
      }
      const pages = await output.copyPages(source, indexes);
      pages.forEach((page, position) => {
        if (rotated?.has(indexes[position])) {
          page.setRotation(degrees((((page.getRotation().angle + rotation) % 360) + 360) % 360));
        }
        output.addPage(page);
      });
    }
  }

  return output.save({ addDefaultPage: false });
}
