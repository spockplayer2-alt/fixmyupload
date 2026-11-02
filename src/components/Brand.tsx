export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className="brand" href="./" aria-label="FixMyUpload home">
      <svg width="36" height="40" viewBox="0 0 36 40" fill="none" aria-hidden="true">
        <path d="M3 2h19l11 11v25H3V2Z" fill="currentColor" />
        <path d="M22 2v11h11" stroke="var(--paper)" strokeWidth="2" />
        <path
          d="m10 27 7-7 7 7M17 20v13"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinejoin="miter"
        />
      </svg>
      {!compact && (
        <span>
          FixMyUpload<span className="brand-dot">.</span>
        </span>
      )}
    </a>
  );
}
