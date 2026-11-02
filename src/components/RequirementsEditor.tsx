import { useState } from 'react';
import { ArrowDown, Check, ScanText } from 'lucide-react';
import { parseError } from '../features/parsing/parser';
import { formatBytes } from '../lib/format';
import type { Format, ImageOptions, Requirements } from '../types/files';
interface Props {
  value: Requirements;
  onChange: (r: Requirements) => void;
  options: ImageOptions;
  onOptions: (o: ImageOptions) => void;
  pdf: boolean;
  disabled: boolean;
}
export function RequirementsEditor({
  value: r,
  onChange,
  options,
  onOptions,
  pdf,
  disabled,
}: Props) {
  const [errorText, setErrorText] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseError>>();
  const [confirmed, setConfirmed] = useState(false);
  const [unit, setUnit] = useState(1000);
  const number = (key: keyof Requirements, label: string, hint?: string) => (
    <label className="field">
      {label}
      <span className="number-wrap">
        <input
          aria-label={label}
          type="number"
          min="1"
          max="100000"
          step="1"
          placeholder="—"
          value={(r[key] as number | undefined) ?? ''}
          onChange={(e) =>
            onChange({ ...r, [key]: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
        <span>{hint ?? 'px'}</span>
      </span>
    </label>
  );
  function apply() {
    if (!parsed) return;
    onChange(parsed.requirements);
    const target = parsed.requirements.formats.find((f) => f !== 'pdf');
    if (target) onOptions({ ...options, format: target });
    setParsed(undefined);
  }
  return (
    <section className="requirements" aria-label="Requirements editor">
      <div className="section-label">
        <span>Requirements</span>
        <span className="small-label">Editable limits</span>
      </div>
      <fieldset disabled={disabled}>
        <div className="parser-panel">
          <label className="parser-title" htmlFor="upload-error">
            <ScanText size={17} /> Paste the upload error <span>Optional</span>
          </label>
          <textarea
            id="upload-error"
            rows={2}
            placeholder="e.g. Only JPG or PNG under 500 KB, minimum 600×600 pixels."
            value={errorText}
            onChange={(e) => {
              setErrorText(e.target.value);
              setParsed(undefined);
              setConfirmed(false);
            }}
          />
          <button
            className="text-button parser-button"
            disabled={!errorText.trim()}
            onClick={() => {
              setParsed(parseError(errorText));
              setConfirmed(false);
            }}
          >
            Read requirements <ArrowDown size={14} />
          </button>
          {parsed && (
            <div className="parsed-result" aria-live="polite">
              <strong>Review detected requirements</strong>
              <ul>
                {Object.entries(parsed.requirements)
                  .filter(([key, v]) =>
                    key === 'formats' ? (v as Format[]).length > 0 : v !== undefined,
                  )
                  .map(([key, v]) => (
                    <li key={key}>
                      <span>
                        {
                          (
                            {
                              formats: 'Accepted formats',
                              maxBytes: 'Maximum size',
                              minBytes: 'Minimum size',
                              minWidth: 'Minimum width',
                              minHeight: 'Minimum height',
                              maxWidth: 'Maximum width',
                              maxHeight: 'Maximum height',
                              width: 'Exact width',
                              height: 'Exact height',
                              maxPages: 'Maximum pages',
                              aspectRatio: 'Aspect ratio',
                            } as Record<string, string>
                          )[key]
                        }
                      </span>
                      <b>
                        {key === 'formats'
                          ? (v as Format[]).map((f) => f.toUpperCase()).join(', ')
                          : key === 'maxBytes' || key === 'minBytes'
                            ? formatBytes(v as number)
                            : String(v)}
                      </b>
                    </li>
                  ))}
              </ul>
              {parsed.ambiguities.length > 0 && (
                <>
                  <p className="warning-text">{parsed.ambiguities.join(' ')}</p>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{' '}
                    I've checked these values; I'll enter anything missing.
                  </label>
                </>
              )}
              <button
                className="button secondary"
                disabled={parsed.ambiguities.length > 0 && !confirmed}
                onClick={apply}
              >
                <Check size={15} /> Apply detected requirements
              </button>
            </div>
          )}
        </div>
        <div className="manual-heading">File requirements</div>
        <div className="fields-grid">
          <label className="field">
            Output format
            <select
              aria-label="Output format"
              value={pdf ? 'pdf' : options.format}
              disabled={pdf}
              onChange={(e) => {
                const format = e.target.value as ImageOptions['format'];
                onOptions({ ...options, format });
                onChange({ ...r, formats: [format] });
              }}
            >
              {pdf ? (
                <option value="pdf">PDF document</option>
              ) : (
                <>
                  <option value="jpeg">JPG / JPEG</option>
                  <option value="png">PNG · keeps transparency</option>
                  <option value="webp">WebP</option>
                </>
              )}
            </select>
          </label>
          <label className="field">
            Maximum file size
            <span className="size-wrap">
              <input
                aria-label="Maximum file size"
                type="number"
                min="0.001"
                step="any"
                placeholder="No limit"
                value={r.maxBytes === undefined ? '' : +(r.maxBytes / unit).toFixed(5)}
                onChange={(e) =>
                  onChange({
                    ...r,
                    maxBytes:
                      e.target.value === '' ? undefined : Math.floor(Number(e.target.value) * unit),
                  })
                }
              />
              <select
                aria-label="File size unit"
                value={unit}
                onChange={(e) => setUnit(Number(e.target.value))}
              >
                <option value={1000}>KB</option>
                <option value={1000000}>MB</option>
              </select>
            </span>
          </label>
        </div>
        <details className="accepted-formats">
          <summary>Accepted formats & minimum size</summary>
          <div className="format-checkboxes">
            {(['jpeg', 'png', 'webp', 'pdf'] as Format[]).map((f) => (
              <label key={f}>
                <input
                  type="checkbox"
                  checked={r.formats.includes(f)}
                  onChange={(e) =>
                    onChange({
                      ...r,
                      formats: e.target.checked
                        ? [...r.formats, f]
                        : r.formats.filter((v) => v !== f),
                    })
                  }
                />
                {f.toUpperCase()}
              </label>
            ))}
          </div>
          <label className="field">
            Minimum file size (KB)
            <input
              aria-label="Minimum file size"
              type="number"
              min="0.001"
              step="any"
              value={r.minBytes === undefined ? '' : r.minBytes / 1000}
              placeholder="No minimum"
              onChange={(e) =>
                onChange({
                  ...r,
                  minBytes: e.target.value ? Math.ceil(Number(e.target.value) * 1000) : undefined,
                })
              }
            />
          </label>
          <p className="field-note">
            A minimum is checked after processing. We do not add artificial padding to inflate file
            size.
          </p>
        </details>
        {pdf ? (
          <>
            <div className="fields-grid">{number('maxPages', 'Maximum pages', 'pages')}</div>
            <p className="field-note">
              PDFs are reorganized without rasterizing pages. Advanced PDF compression isn't
              included.
            </p>
          </>
        ) : (
          <>
            <div className="fields-grid">
              {number('maxWidth', 'Maximum width')}
              {number('maxHeight', 'Maximum height')}
            </div>
            <details
              className="advanced"
              open={!!(r.minWidth || r.minHeight || r.width || r.height || r.aspectRatio)}
            >
              <summary>Dimensions & image quality</summary>
              <div className="fields-grid">
                {number('minWidth', 'Minimum width')}
                {number('minHeight', 'Minimum height')}
                {number('width', 'Exact width')}
                {number('height', 'Exact height')}
              </div>
              <label className="field">
                Aspect ratio
                <select
                  aria-label="Aspect ratio"
                  value={r.aspectRatio ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...r,
                      aspectRatio: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Keep original shape</option>
                  <option value="1">Square · 1:1</option>
                  <option value={4 / 3}>Landscape · 4:3</option>
                  <option value={16 / 9}>Widescreen · 16:9</option>
                  <option value={3 / 4}>Portrait · 3:4</option>
                </select>
              </label>
              <div className="fields-grid">
                <label className="field">
                  Resize behavior
                  <select
                    value={options.fit}
                    onChange={(e) =>
                      onOptions({ ...options, fit: e.target.value as ImageOptions['fit'] })
                    }
                  >
                    <option value="contain">Maintain aspect ratio</option>
                    <option value="crop">Center crop to fit</option>
                    <option value="pad">Pad with background</option>
                  </select>
                </label>
                <label className="field">
                  Background
                  <span className="color-control">
                    <input
                      aria-label="Background color"
                      type="color"
                      value={options.background}
                      onChange={(e) => onOptions({ ...options, background: e.target.value })}
                    />
                    <span>{options.background.toUpperCase()}</span>
                  </span>
                </label>
              </div>
              <label className="field quality-label">
                Starting quality <span>{Math.round(options.quality * 100)}%</span>
                <input
                  aria-label="Starting quality"
                  type="range"
                  min="20"
                  max="100"
                  value={options.quality * 100}
                  disabled={options.format === 'png'}
                  onChange={(e) => onOptions({ ...options, quality: Number(e.target.value) / 100 })}
                />
              </label>
              <p className="field-note">
                Size limits may lower quality or dimensions. PNG is lossless. Enlarging cannot
                restore detail.
              </p>
            </details>
          </>
        )}
      </fieldset>
    </section>
  );
}
