import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { parsePages } from '../features/pdf/page-selection';
import { LIMITS } from '../types/files';

interface Props {
  file: File;
  selection: string;
  onSelection: (text: string) => void;
  onReorder?: (text: string) => void;
  pages?: number;
  selectable?: boolean;
}

interface Thumbnail {
  page: number;
  url?: string;
  error?: string;
}

interface DocumentState {
  file: File;
  document?: PDFDocumentProxy;
  error?: string;
}

const WINDOW_SIZE = 12;
let renderer: Promise<typeof import('pdfjs-dist')> | undefined;

function loadRenderer() {
  renderer ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return renderer;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The page thumbnail could not be created.'));
    }, 'image/png');
  });
}

export function PdfPreview({
  file,
  selection,
  onSelection,
  onReorder,
  pages,
  selectable = true,
}: Props) {
  const titleId = useId();
  const [documentState, setDocumentState] = useState<DocumentState>({ file });
  const [windowState, setWindowState] = useState({ file, start: 0 });
  const [thumbnailState, setThumbnailState] = useState<{
    document?: PDFDocumentProxy;
    key: string;
    items: Thumbnail[];
  }>({ key: '', items: [] });
  const renderTasks = useRef(new Set<RenderTask>());
  const current = documentState.file === file ? documentState : undefined;
  const pdf = current?.document;
  const pageCount = pdf?.numPages ?? 0;
  const start = windowState.file === file ? windowState.start : 0;

  useEffect(() => {
    let stale = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    let passwordRequired = false;

    async function load() {
      try {
        const [pdfjs, buffer] = await Promise.all([loadRenderer(), file.arrayBuffer()]);
        if (stale) return;
        loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useWorkerFetch: false,
          useWasm: false,
          enableXfa: false,
          stopAtErrors: true,
          canvasMaxAreaInBytes: 16 * 1024 * 1024,
        });
        loadingTask.onPassword = () => {
          if (stale) return;
          passwordRequired = true;
          setDocumentState({ file, error: 'Password-protected PDFs cannot be previewed.' });
          void loadingTask?.destroy().catch(() => {});
        };
        const document = await loadingTask.promise;
        if (stale) return;
        if (document.numPages < 1 || document.numPages > LIMITS.pages) {
          throw new Error(`Preview supports PDFs with 1 to ${LIMITS.pages} pages.`);
        }
        setDocumentState({ file, document });
      } catch (error) {
        if (stale) return;
        setDocumentState({
          file,
          error:
            passwordRequired || (error instanceof Error && /password/i.test(error.message))
              ? 'Password-protected PDFs cannot be previewed.'
              : 'This PDF could not be previewed. Try a complete, unencrypted PDF.',
        });
        void loadingTask?.destroy().catch(() => {});
      }
    }

    void load();
    const tasks = renderTasks.current;
    return () => {
      stale = true;
      tasks.forEach((task) => task.cancel());
      tasks.clear();
      void loadingTask?.destroy().catch(() => {});
    };
  }, [file]);

  const selected = useMemo(() => {
    if (!pageCount || !selection.trim()) return [];
    try {
      return parsePages(selection, pageCount).map((page) => page + 1);
    } catch {
      return [];
    }
  }, [selection, pageCount]);
  const selectedSet = new Set(selected);
  const order = useMemo(() => {
    const all = Array.from({ length: pageCount }, (_, index) => index + 1);
    if (!onReorder) return all;
    const present = new Set(selected);
    return [...selected, ...all.filter((page) => !present.has(page))];
  }, [onReorder, selected, pageCount]);
  const windowPages = order.slice(start, start + WINDOW_SIZE);
  const windowKey = windowPages.join(',');

  useEffect(() => {
    if (!pdf) return;
    let stale = false;
    const urls = new Set<string>();
    const tasks = renderTasks.current;
    const pageNumbers = windowKey.split(',').filter(Boolean).map(Number);

    async function renderPages() {
      const thumbnails: Thumbnail[] = [];
      for (const pageNumber of pageNumbers) {
        if (stale) break;
        const canvas = document.createElement('canvas');
        let page;
        let renderTask: RenderTask | undefined;
        try {
          page = await pdf!.getPage(pageNumber);
          if (stale) break;
          const original = page.getViewport({ scale: 1 });
          const scale = Math.min(160 / original.width, 220 / original.height);
          const viewport = page.getViewport({ scale });
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          if (!canvas.getContext('2d')) throw new Error('Canvas is unavailable.');
          renderTask = page.render({ canvas, viewport, background: '#ffffff' });
          tasks.add(renderTask);
          await renderTask.promise;
          if (stale) break;
          const blob = await canvasBlob(canvas);
          if (stale) break;
          const url = URL.createObjectURL(blob);
          urls.add(url);
          thumbnails.push({ page: pageNumber, url });
        } catch {
          if (stale) break;
          thumbnails.push({ page: pageNumber, error: 'Preview unavailable for this page.' });
        } finally {
          if (renderTask) tasks.delete(renderTask);
          page?.cleanup();
          canvas.width = 0;
          canvas.height = 0;
        }
        if (!stale) {
          setThumbnailState({ document: pdf, key: windowKey, items: [...thumbnails] });
        }
      }
    }

    void renderPages();
    return () => {
      stale = true;
      tasks.forEach((task) => task.cancel());
      tasks.clear();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pdf, windowKey]);

  const thumbnails =
    thumbnailState.document === pdf && thumbnailState.key === windowKey ? thumbnailState.items : [];
  const complete = thumbnails.length === windowPages.length;

  function togglePage(page: number) {
    const next = selectedSet.has(page)
      ? selected.filter((value) => value !== page)
      : [...selected, page];
    onSelection(next.join(', '));
  }

  function movePage(index: number, direction: -1 | 1) {
    if (!onReorder) return;
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.join(', '));
  }

  return (
    <section className="pdf-preview" aria-labelledby={titleId}>
      <div className="pdf-preview-header">
        <h3 id={titleId}>Page preview</h3>
        {pdf && (
          <span>
            {pageCount} pages{selectable ? ` · ${selected.length} selected` : ''}
          </span>
        )}
      </div>
      {current?.error ? (
        <p className="pdf-preview-error" role="alert">
          {current.error}
        </p>
      ) : !pdf ? (
        <p className="pdf-preview-status" role="status">
          Loading {pages ? `${pages}-page PDF` : 'PDF'} preview…
        </p>
      ) : (
        <>
          <div className="pdf-preview-grid" aria-busy={!complete}>
            {windowPages.map((page, index) => {
              const thumbnail = thumbnails.find((item) => item.page === page);
              const position = start + index;
              return (
                <div
                  className={`pdf-page${selectable && selectedSet.has(page) ? ' pdf-page-selected' : ''}`}
                  key={page}
                >
                  <label className="pdf-page-label">
                    <div className="pdf-page-image">
                      {thumbnail?.url ? (
                        <img
                          src={thumbnail.url}
                          alt={`Preview of page ${page}`}
                          width={160}
                          height={220}
                        />
                      ) : (
                        <span
                          className={thumbnail?.error ? 'pdf-preview-error' : 'pdf-preview-status'}
                        >
                          {thumbnail?.error ?? 'Rendering page…'}
                        </span>
                      )}
                    </div>
                    <span>
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={selectedSet.has(page)}
                          onChange={() => togglePage(page)}
                          aria-label={`Select page ${page}`}
                        />
                      )}
                      Page {page}
                    </span>
                  </label>
                  {onReorder && (
                    <div className="pdf-page-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Move page ${page} left`}
                        disabled={position === 0}
                        onClick={() => movePage(position, -1)}
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                      </button>
                      <span>Position {position + 1}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Move page ${page} right`}
                        disabled={position === pageCount - 1}
                        onClick={() => movePage(position, 1)}
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="pdf-preview-more">
            <span className="pdf-preview-status" role="status">
              {complete ? 'Showing' : 'Rendering'} pages {start + 1}–
              {Math.min(start + WINDOW_SIZE, pageCount)} of {pageCount}
            </span>
            {start > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setWindowState({ file, start: Math.max(0, start - WINDOW_SIZE) })}
              >
                Previous pages
              </button>
            )}
            {start + WINDOW_SIZE < pageCount && (
              <button
                type="button"
                className="text-button"
                onClick={() => setWindowState({ file, start: start + WINDOW_SIZE })}
              >
                Load more pages
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
