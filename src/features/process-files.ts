import type { FileInfo, ImageOptions, Output, Requirements } from '../types/files';
import { LIMITS } from '../types/files';
import { processImage } from './image/process';
import { outputName } from '../lib/format';
export type PdfOperation = 'images' | 'merge' | 'extract' | 'remove' | 'reorder' | 'split';
interface ProcessRequest {
  files: File[];
  infos: FileInfo[];
  requirements: Requirements;
  options: ImageOptions;
  mode: 'image' | 'pdf';
  operation: PdfOperation;
  selection: string;
  onStatus: (status: string) => void;
}
export async function processFiles({
  files,
  infos,
  requirements,
  options,
  mode,
  operation,
  selection,
  onStatus,
}: ProcessRequest): Promise<Output[]> {
  let result: Output[];
  if (mode === 'image') result = [await processImage(files[0], requirements, options)];
  else {
    const { processPdfInWorker, inspectPdfInWorker } = await import('./pdf/pdf-client');
    const inputs = [];
    for (let index = 0; index < files.length; index++) {
      let blob: Blob = files[index];
      let format = infos[index].format;
      if (format !== 'pdf') {
        blob = (
          await processImage(
            files[index],
            { formats: [format === 'jpeg' ? 'jpeg' : 'png'] },
            {
              ...options,
              quality: 0.95,
              format: format === 'jpeg' ? 'jpeg' : 'png',
              fit: 'contain',
            },
          )
        ).blob;
        format = format === 'jpeg' ? 'jpeg' : 'png';
      }
      inputs.push({ bytes: new Uint8Array(await blob.arrayBuffer()), format });
    }
    if (operation !== 'images' && inputs.some((i) => i.format !== 'pdf'))
      throw new Error('This operation requires PDF documents.');
    if (operation === 'images' && inputs.some((i) => i.format === 'pdf'))
      throw new Error('Choose image files to create a PDF.');
    const batches: Uint8Array[] = [];
    if (operation === 'split') {
      if (inputs.length !== 1) throw new Error('Split one PDF at a time.');
      const { parsePages } = await import('./pdf/page-selection');
      const pages = selection.trim()
        ? parsePages(selection, infos[0].pages ?? 0)
        : Array.from({ length: infos[0].pages ?? 0 }, (_, i) => i);
      for (const page of pages) {
        onStatus(`Splitting page ${page + 1}…`);
        batches.push(await processPdfInWorker(inputs, 'extract', String(page + 1)));
        if (batches.reduce((sum, b) => sum + b.byteLength, 0) > LIMITS.batchBytes)
          throw new Error('Split results exceed 60 MB. Extract fewer pages at once.');
      }
    } else batches.push(await processPdfInWorker(inputs, operation, selection));
    result = [];
    for (let index = 0; index < batches.length; index++) {
      const bytes = batches[index];
      const pages = await inspectPdfInWorker(bytes);
      const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' });
      const name =
        operation === 'split'
          ? outputName(files[0].name, `part-${index + 1}.pdf`)
          : outputName(files[0].name, 'pdf');
      result.push({
        blob,
        info: { name, format: 'pdf', size: blob.size, pages },
        warnings: [
          'Reorganized PDFs may lose digital signatures, interactive forms, bookmarks or accessibility structure. Keep your original.',
        ],
      });
    }
  }

  return result;
}
