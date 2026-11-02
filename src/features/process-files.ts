import type { FileInfo, ImageOptions, Output, Requirements } from '../types/files';
import { LIMITS } from '../types/files';
import { processImage } from './image/process';
import { outputName } from '../lib/format';
export type PdfOperation =
  'images' | 'merge' | 'extract' | 'remove' | 'reorder' | 'split' | 'rotate';
interface ProcessRequest {
  files: File[];
  infos: FileInfo[];
  requirements: Requirements;
  options: ImageOptions;
  mode: 'image' | 'pdf';
  operation: PdfOperation;
  selection: string;
  pdfRotation?: 90 | 180 | 270;
  signal?: AbortSignal;
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
  pdfRotation,
  signal,
  onStatus,
}: ProcessRequest): Promise<Output[]> {
  const checkCancelled = () => {
    if (signal?.aborted) throw new DOMException('Processing cancelled.', 'AbortError');
  };
  checkCancelled();
  if (!files.length || files.length > LIMITS.files)
    throw new Error('Choose between 1 and 20 files.');
  if (files.some((file) => !file.size || file.size > LIMITS.fileBytes))
    throw new Error('Choose non-empty files up to 30 MB each.');
  if (files.reduce((sum, file) => sum + file.size, 0) > LIMITS.batchBytes)
    throw new Error('The selected files exceed the 60 MB batch limit.');
  let result: Output[];
  if (mode === 'image') {
    result = [];
    let totalBytes = 0;
    for (let index = 0; index < files.length; index++) {
      checkCancelled();
      onStatus(`Processing image ${index + 1} of ${files.length}: ${files[index].name}…`);
      checkCancelled();
      const output = await processImage(files[index], requirements, options, signal);
      checkCancelled();
      totalBytes += output.blob.size;
      if (totalBytes > LIMITS.batchBytes)
        throw new Error('Image results exceed 60 MB. Process fewer files at once.');
      if (output.blob.size > LIMITS.fileBytes)
        throw new Error(
          'An image result exceeds 30 MB. Choose smaller dimensions or lower quality.',
        );
      result.push(output);
    }
  } else {
    const { processPdfInWorker, inspectPdfInWorker } = await import('./pdf/pdf-client');
    const inputs = [];
    for (let index = 0; index < files.length; index++) {
      checkCancelled();
      onStatus(`Preparing file ${index + 1} of ${files.length}: ${files[index].name}…`);
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
            signal,
          )
        ).blob;
        format = format === 'jpeg' ? 'jpeg' : 'png';
      }
      inputs.push({ bytes: new Uint8Array(await blob.arrayBuffer()), format });
      checkCancelled();
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
        checkCancelled();
        onStatus(`Splitting page ${page + 1}…`);
        batches.push(await processPdfInWorker(inputs, 'extract', String(page + 1), 90, signal));
        checkCancelled();
        if (batches.reduce((sum, b) => sum + b.byteLength, 0) > LIMITS.batchBytes)
          throw new Error('Split results exceed 60 MB. Extract fewer pages at once.');
      }
    } else {
      checkCancelled();
      batches.push(
        operation === 'rotate'
          ? await processPdfInWorker(inputs, operation, selection, pdfRotation, signal)
          : await processPdfInWorker(inputs, operation, selection, 90, signal),
      );
      checkCancelled();
    }
    result = [];
    for (let index = 0; index < batches.length; index++) {
      checkCancelled();
      const bytes = batches[index];
      const pages = await inspectPdfInWorker(bytes, signal);
      checkCancelled();
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
