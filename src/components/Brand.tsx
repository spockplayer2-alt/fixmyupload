import { navigate, rootPath } from '../app/tools';
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className="brand"
      href={rootPath()}
      onClick={(e) => {
        e.preventDefault();
        navigate();
      }}
      aria-label="FixMyUpload home"
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M4 4h17v6H10v6h9v6h-9v6H4V4Z" fill="currentColor" />
        <path d="M24 4h4v24H14v-6h10V4Z" fill="var(--accent)" />
      </svg>
      {!compact && <span>FixMyUpload</span>}
    </a>
  );
}
