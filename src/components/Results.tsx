import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  TriangleAlert,
  ArrowRight,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { validate } from '../features/validation/requirements';
import type { FileInfo, Output, Requirements } from '../types/files';
import { formatBytes } from '../lib/format';
import { Thumbnail } from './FileOverview';
export function Results({
  outputs,
  originals,
  files,
  requirements,
  onReset,
}: {
  outputs: Output[];
  originals: FileInfo[];
  files: File[];
  requirements: Requirements;
  onReset: () => void;
}) {
  const [error, setError] = useState(''),
    [zipping, setZipping] = useState(false);
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const next = outputs.map((o) => URL.createObjectURL(o.blob));
    urls.current = next;
    return () => next.forEach(URL.revokeObjectURL);
  }, [outputs]);
  const passed = outputs.every((o) => validate(o.info, requirements).every((c) => c.passed));
  function trigger(url: string, name: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
  }
  function download(index: number) {
    try {
      if (!urls.current[index]) throw new Error();
      trigger(urls.current[index], outputs[index].info.name);
    } catch {
      setError('Download could not start. Try the download button again.');
    }
  }
  async function zip() {
    setZipping(true);
    try {
      const { zip: archive } = await import('fflate');
      const entries: Record<string, Uint8Array> = {};
      for (let i = 0; i < outputs.length; i++) {
        const o = outputs[i];
        entries[`${String(i + 1).padStart(2, '0')}-${o.info.name}`] = new Uint8Array(
          await o.blob.arrayBuffer(),
        );
      }
      const bytes = await new Promise<Uint8Array>((resolve, reject) =>
        archive(entries, { level: 0 }, (e, b) => (e ? reject(e) : resolve(b))),
      );
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(bytes).buffer], { type: 'application/zip' }),
      );
      trigger(url, 'fixmyupload-files.zip');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError('The ZIP could not be created. Download files individually instead.');
    } finally {
      setZipping(false);
    }
  }
  return (
    <section className="results" aria-labelledby="result-title">
      <div className={`result-banner ${passed ? 'passed' : 'failed'}`}>
        <span className="result-icon">
          {passed ? <Check size={22} /> : <TriangleAlert size={22} />}
        </span>
        <div>
          <h2 id="result-title">
            {passed
              ? outputs.length > 1
                ? 'Your files are ready.'
                : 'Your file is ready.'
              : 'Some requirements need a change.'}
          </h2>
          <p>
            {passed
              ? 'Checked against your requirements. Ready to download.'
              : 'Review the failed limits below. Adjust your settings and try again.'}
          </p>
        </div>
      </div>
      {outputs.length > 1 && (
        <button className="button primary zip-button" onClick={zip} disabled={zipping}>
          <Archive size={17} />
          {zipping
            ? 'Creating ZIP…'
            : passed
              ? 'Download all as ZIP'
              : 'Download ZIP · contains files that failed checks'}
        </button>
      )}
      {outputs.map((o, i) => {
        const checks = validate(o.info, requirements),
          ok = checks.every((c) => c.passed);
        const original = originals.length === outputs.length ? originals[i] : originals[0];
        const before = files[originals.length === outputs.length ? i : 0];
        return (
          <article className="output-block" key={i}>
            <div className="output-heading">
              <div>
                <strong>{o.info.name}</strong>
                <span>
                  {o.info.format.toUpperCase()}
                  {o.info.width && (
                    <span data-testid="result-dimensions">
                      {' '}
                      · {o.info.width} × {o.info.height} px
                    </span>
                  )}
                  {o.info.pages && (
                    <span data-testid="result-pages">
                      {' '}
                      · {o.info.pages} page{o.info.pages === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
              </div>
              <span className={ok ? 'status-success' : 'status-warning'}>
                {ok ? <Check size={14} /> : <TriangleAlert size={14} />}{' '}
                {ok ? 'Passed' : 'Needs adjustment'}
              </span>
            </div>
            {o.info.format !== 'pdf' && (
              <div className="comparison-previews">
                <div>
                  <Thumbnail file={before} image />
                  <span>Original</span>
                </div>
                <div>
                  <Thumbnail file={o.blob} image />
                  <span>Processed</span>
                </div>
              </div>
            )}
            <div className="size-comparison">
              <div>
                <span>Original</span>
                <strong>
                  {formatBytes(
                    originals.length === outputs.length
                      ? original.size
                      : originals.reduce((n, f) => n + f.size, 0),
                  )}
                </strong>
                <small title={original.name}>
                  {originals.length === outputs.length
                    ? original.name
                    : `${originals.length} source file${originals.length > 1 ? 's' : ''}`}
                </small>
              </div>
              <ArrowRight size={18} />
              <div>
                <span>Result</span>
                <strong>{formatBytes(o.info.size)}</strong>
                <small>{o.info.format.toUpperCase()}</small>
              </div>
            </div>
            {!ok && (
              <div className="result-failures" role="alert">
                {checks
                  .filter((c) => !c.passed)
                  .map((c) => (
                    <p key={c.label}>
                      <TriangleAlert size={15} />
                      <span>
                        <strong>
                          {c.label}: {c.actual}.
                        </strong>{' '}
                        Required: {c.required}.
                        {c.label === 'File size' &&
                        requirements.maxBytes &&
                        o.info.size > requirements.maxBytes
                          ? ` ${formatBytes(o.info.size - requirements.maxBytes)} above the limit. Try lower quality or smaller dimensions.`
                          : ''}
                      </span>
                    </p>
                  ))}
              </div>
            )}
            <button
              className={`button ${ok ? 'primary' : 'secondary'}`}
              onClick={() => download(i)}
            >
              <ArrowDownToLine size={17} />
              {ok ? 'Download file' : 'Download anyway · requirements not met'}
            </button>
            <details className="validation-details">
              <summary>View {checks.length} validation checks</summary>
              <div className="table-scroll">
                <table>
                  <caption className="visually-hidden">Output requirement validation</caption>
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Required</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((c) => (
                      <tr key={c.label}>
                        <th scope="row">{c.label}</th>
                        <td>{c.required}</td>
                        <td className={c.passed ? 'check-pass' : 'check-fail'}>
                          {c.passed ? <Check size={13} /> : <TriangleAlert size={13} />} {c.actual}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </article>
        );
      })}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <details className="result-notes">
        <summary>About your output</summary>
        <ul>
          {[...new Set(outputs.flatMap((o) => o.warnings))].map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </details>
      <button className="button secondary" onClick={onReset}>
        <RotateCcw size={15} /> Adjust requirements
      </button>
    </section>
  );
}
