import { useRef, useState } from 'react';
import { ArrowUp, FileImage, LockKeyhole } from 'lucide-react';
export function Upload({
  busy,
  pdf,
  onFiles,
}: {
  busy: boolean;
  pdf: boolean;
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <section
      className={`dropzone ${drag ? 'dragging' : ''}`}
      aria-label="Choose your files"
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDrag(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!busy) onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        aria-label="Choose files"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        disabled={busy}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <div className="upload-mark" aria-hidden="true">
        <FileImage size={32} strokeWidth={1.5} />
        <span>
          <ArrowUp size={14} />
        </span>
      </div>
      <h2>Drop your file{pdf ? 's' : ''} here</h2>
      <p>or choose {pdf ? 'files' : 'a file'} from your device</p>
      <button className="button primary" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? 'Reading files…' : 'Choose files'}
        <ArrowUp size={16} />
      </button>
      <span className="upload-formats">
        JPG, PNG, WebP & PDF <span>·</span> Up to 30 MB each
      </span>
      <span className="local-note">
        <LockKeyhole size={13} /> Files stay on your device
      </span>
    </section>
  );
}
