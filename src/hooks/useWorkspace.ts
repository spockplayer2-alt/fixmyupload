import { useEffect, useRef, useState } from 'react';
import { inspectFile } from '../features/image/process';
import { processFiles, type PdfOperation } from '../features/process-files';
import { conflicts } from '../features/validation/requirements';
import {
  LIMITS,
  type FileInfo,
  type ImageOptions,
  type Output,
  type Requirements,
} from '../types/files';
import type { Tool } from '../app/tools';
export const defaultOptions: ImageOptions = {
  format: 'jpeg',
  quality: 0.9,
  fit: 'contain',
  background: '#ffffff',
};
export function useWorkspace(tool?: Tool) {
  const [mode, setMode] = useState<'image' | 'pdf'>(tool?.category ?? 'image');
  const [files, setFiles] = useState<File[]>([]),
    [infos, setInfos] = useState<FileInfo[]>([]);
  const [requirements, setRequirements] = useState<Requirements>({
    formats: [],
    ...(tool?.slug === 'compress-to-500kb' ? { maxBytes: 500000 } : {}),
    ...(tool?.slug === 'crop-image' ? { aspectRatio: 1 } : {}),
  });
  const [options, setOptions] = useState<ImageOptions>({
    ...defaultOptions,
    ...(tool?.slug === 'crop-image' ? { fit: 'crop' as const } : {}),
    ...(tool?.slug === 'remove-metadata' ? { format: 'png' as const, quality: 1 } : {}),
  });
  const [operation, setOperation] = useState<PdfOperation>(tool?.operation ?? 'images');
  const [selection, setSelection] = useState('');
  const [pdfRotation, setPdfRotation] = useState<90 | 180 | 270>(90);
  const [outputs, setOutputs] = useState<Output[]>([]),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  const generation = useRef(0),
    controller = useRef<AbortController>(undefined);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  const effectiveRequirements: Requirements = {
    ...requirements,
    formats: requirements.formats.length
      ? requirements.formats
      : [mode === 'pdf' ? 'pdf' : options.format],
  };
  const problems = conflicts(effectiveRequirements);
  function cancel() {
    controller.current?.abort();
    generation.current++;
    setBusy(false);
    setStatus('Operation cancelled. You can adjust the settings and try again.');
  }
  function clear() {
    cancel();
    setFiles([]);
    setInfos([]);
    setOutputs([]);
    setError('');
    setStatus('');
  }
  async function selectFiles(next: File[]) {
    clear();
    if (!next.length) return;
    const token = generation.current;
    setBusy(true);
    setStatus('Reading files…');
    const abort = new AbortController();
    controller.current = abort;
    try {
      if (next.length > LIMITS.files || next.reduce((n, f) => n + f.size, 0) > LIMITS.batchBytes)
        throw new Error('Choose up to 20 files, with a combined size under 60 MB.');
      const metadata: FileInfo[] = [];
      for (const file of next) {
        metadata.push(await inspectFile(file, abort.signal));
        if (token !== generation.current) return;
      }
      const hasPdf = metadata.some((i) => i.format === 'pdf');
      if (hasPdf && metadata.some((i) => i.format !== 'pdf'))
        throw new Error('Choose either images or PDF documents in one batch.');
      if (tool?.category === 'image' && hasPdf)
        throw new Error(
          'This tool works with images. Choose a JPEG, PNG or WebP, or open PDF tools.',
        );
      if (
        tool?.category === 'pdf' &&
        ((tool.operation === 'images' && hasPdf) || (tool.operation !== 'images' && !hasPdf))
      )
        throw new Error(
          tool.operation === 'images'
            ? 'Choose images for Images to PDF.'
            : 'Choose PDF documents for this tool.',
        );
      const nextMode = hasPdf || tool?.category === 'pdf' || mode === 'pdf' ? 'pdf' : 'image';
      setMode(nextMode);
      if (nextMode === 'pdf')
        setOperation(
          hasPdf
            ? tool?.operation && tool.operation !== 'images'
              ? tool.operation
              : 'merge'
            : 'images',
        );
      if (tool?.slug === 'remove-metadata' && !hasPdf) {
        setOptions((o) => ({ ...o, format: metadata[0].format as ImageOptions['format'] }));
      }
      setFiles(next);
      setInfos(metadata);
    } catch (e) {
      if (token === generation.current) setError(errorMessage(e));
    } finally {
      if (token === generation.current) {
        setBusy(false);
        setStatus('');
      }
    }
  }
  async function process() {
    if (!files.length || busy || problems.length) return;
    const token = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError('');
    setStatus('Processing and checking your files…');
    try {
      const result = await processFiles({
        files,
        infos,
        requirements: effectiveRequirements,
        options,
        mode,
        operation,
        selection,
        pdfRotation,
        signal: abort.signal,
        onStatus: (s) => {
          if (token === generation.current) setStatus(s);
        },
      });
      if (token === generation.current) {
        setOutputs(result);
        setStatus('Processing complete.');
      }
    } catch (e) {
      if (token === generation.current) setError(errorMessage(e));
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function moveFile(index: number, direction: number) {
    setOutputs([]);
    const next = [...files],
      nextInfo = [...infos];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    [nextInfo[index], nextInfo[index + direction]] = [nextInfo[index + direction], nextInfo[index]];
    setFiles(next);
    setInfos(nextInfo);
  }
  return {
    mode,
    setMode,
    files,
    infos,
    requirements,
    setRequirements,
    options,
    setOptions,
    operation,
    setOperation,
    selection,
    setSelection,
    pdfRotation,
    setPdfRotation,
    outputs,
    setOutputs,
    busy,
    status,
    error,
    problems,
    effectiveRequirements,
    selectFiles,
    clear,
    cancel,
    process,
    moveFile,
  };
}
function errorMessage(e: unknown) {
  return e instanceof Error
    ? e.message
    : 'The file could not be processed. Try a smaller file or export a new copy.';
}
