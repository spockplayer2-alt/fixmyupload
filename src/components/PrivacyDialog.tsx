import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="privacy-dialog"
      aria-labelledby="privacy-title"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            e.currentTarget.close();
        }
      }}
    >
      <div className="dialog-header">
        <h2 id="privacy-title">Your files are your business.</h2>
        <button
          className="icon-button"
          aria-label="Close privacy information"
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </button>
      </div>
      <p>
        All file processing and error parsing happens in your browser. Files and pasted text are
        never sent to a conversion service, stored by this app, or used for analytics. Reloading
        clears them. Presets store settings only after you choose Save preset; you can delete them
        in the preset controls.
      </p>
      <p>
        The hosting provider receives normal page requests, such as your IP address. The GitHub link
        opens an external website. The Geist font and all processing libraries are served locally.
        No tracking scripts or advertising are loaded.
      </p>
      <p>
        Limits: 30 MB per file, 60 MB per batch, 20 input files, 12 megapixels per image and 100 PDF
        pages. JPEG, PNG, WebP and unencrypted PDF only. PDF compression, OCR and PDF-to-image
        conversion are not included.
      </p>
      <button className="button secondary" onClick={() => dialog.current?.close()}>
        Got it
      </button>
    </dialog>
  );
}
