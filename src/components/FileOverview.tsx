import { useEffect, useRef } from 'react';
import { FileText, Replace, Trash2 } from 'lucide-react';
import type { FileInfo } from '../types/files';
import { formatBytes } from '../lib/format';
export function FileOverview({
  files,
  infos,
  busy,
  onFiles,
  onClear,
  onMove,
}: {
  files: File[];
  infos: FileInfo[];
  busy: boolean;
  onFiles: (files: File[]) => void;
  onClear: () => void;
  onMove: (index: number, direction: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="file-overview" aria-label="Selected files">
      <div className="file-overview-head">
        <h2>{files.length === 1 ? 'Your file' : `${files.length} files`}</h2>
        <div>
          <button
            className="icon-button"
            title="Replace files"
            aria-label="Replace files"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <Replace size={17} />
          </button>
          <button
            className="icon-button destructive"
            aria-label="Clear files"
            title="Remove files"
            onClick={onClear}
            disabled={busy}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        aria-label="Choose files"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={busy}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <div className="file-rows">
        {infos.map((info, i) => (
          <div className="file-row" key={`${i}-${info.name}`}>
            <Thumbnail file={files[i]} image={info.format !== 'pdf'} />
            <div className="file-details">
              <strong title={info.name}>{info.name}</strong>
              <span>
                {info.format.toUpperCase()} · {formatBytes(info.size)}
              </span>
              <span>
                {info.width
                  ? `${info.width} × ${info.height} px`
                  : `${info.pages} page${info.pages === 1 ? '' : 's'}`}
              </span>
            </div>
            {files.length > 1 && (
              <div className="file-order">
                <button
                  className="icon-button"
                  aria-label={`Move file ${i + 1} up`}
                  disabled={busy || i === 0}
                  onClick={() => onMove(i, -1)}
                >
                  ↑
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move file ${i + 1} down`}
                  disabled={busy || i === files.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
export function Thumbnail({ file, image }: { file: Blob; image: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, image]);
  return image ? (
    <img ref={ref} className="file-thumb" alt="Image preview" />
  ) : (
    <span className="file-thumb pdf-thumb">
      <FileText size={26} />
    </span>
  );
}
