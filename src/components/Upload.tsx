import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, FileImage, FileText, LockKeyhole, Plus, X } from 'lucide-react';
import type { FileInfo } from '../types/files';
import { formatBytes } from '../lib/format';
interface Props {
  files: File[];
  infos: FileInfo[];
  busy: boolean;
  pdf: boolean;
  onFiles: (files: File[]) => void;
  onClear: () => void;
}
export function Upload({ files, infos, busy, pdf, onFiles, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const previewRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (files[0] && infos[0] && infos[0].format !== 'pdf') {
      const url = URL.createObjectURL(files[0]);
      if (previewRef.current) previewRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [files, infos]);
  return (
    <section className="upload-section" aria-labelledby="file-heading">
      <div className="section-label">
        <span>01 / YOUR FILE{pdf ? 'S' : ''}</span>
        <span className="small-label">
          {files.length ? `${files.length} selected` : 'Start here'}
        </span>
      </div>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        aria-label="Choose files"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple={pdf}
        disabled={busy}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <div
        className={`dropzone ${drag ? 'dragging' : ''} ${files.length ? 'has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) onFiles(Array.from(e.dataTransfer.files));
        }}
      >
        {files.length ? (
          <>
            <div className="file-preview">
              {infos[0]?.format !== 'pdf' ? (
                <img ref={previewRef} alt="Original file preview" />
              ) : (
                <FileText size={64} strokeWidth={1} />
              )}
              <span className="preview-tag">ORIGINAL</span>
            </div>
            <div className="file-list">
              {infos.map((info, i) => (
                <div className="file-line" key={`${i}-${info.name}`}>
                  <div className="file-details">
                    <strong>{info.name}</strong>
                    <span>
                      {info.format.toUpperCase()} <b>·</b> {formatBytes(info.size)} <b>·</b>{' '}
                      {info.width
                        ? `${info.width} × ${info.height} px`
                        : `${info.pages} page${info.pages === 1 ? '' : 's'}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="file-actions">
              <button
                className="text-button"
                onClick={() => input.current?.click()}
                disabled={busy}
              >
                <Plus size={15} /> Replace {pdf ? 'files' : 'file'}
              </button>
              <button
                className="icon-button"
                onClick={onClear}
                disabled={busy}
                aria-label="Clear files"
              >
                <X size={17} />
              </button>
            </div>
          </>
        ) : (
          <button className="drop-trigger" onClick={() => input.current?.click()} disabled={busy}>
            <span className="file-illustration">
              <FileImage size={43} strokeWidth={1.25} />
              <span className="illustration-arrow">
                <ArrowUpRight size={23} />
              </span>
            </span>
            <h2 id="file-heading">Drop your file{pdf ? 's' : ''} here</h2>
            <span>
              or <u>browse files</u> on your device
            </span>
            <small>JPG, PNG, WebP or PDF · up to 30 MB each</small>
          </button>
        )}
      </div>
      <div className="local-note">
        <LockKeyhole size={14} />
        <span>Your files stay on this device. Always.</span>
      </div>
    </section>
  );
}
