import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, CircleAlert, RotateCcw } from 'lucide-react';
import { validate } from '../features/validation/requirements';
import type { FileInfo, Output, Requirements } from '../types/files';
import { formatBytes } from '../lib/format';
export function Results({
  outputs,
  originals,
  requirements,
  onReset,
}: {
  outputs: Output[];
  originals: FileInfo[];
  requirements: Requirements;
  onReset: () => void;
}) {
  const [error, setError] = useState('');
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const next = outputs.map((o) => URL.createObjectURL(o.blob));
    urls.current = next;
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [outputs]);
  const passed = outputs.every((o) => validate(o.info, requirements).every((c) => c.passed));
  function download(index: number) {
    try {
      if (!urls.current[index]) throw new Error();
      const a = document.createElement('a');
      a.href = urls.current[index];
      a.download = outputs[index].info.name;
      document.body.append(a);
      a.click();
      a.remove();
      setError('');
    } catch {
      setError('The download could not start. Please try the download button again.');
    }
  }
  return (
    <section className="results" aria-labelledby="result-title">
      <div className={`result-banner ${passed ? 'passed' : 'failed'}`}>
        <span className="result-icon">
          {passed ? <Check size={25} /> : <CircleAlert size={25} />}
        </span>
        <div>
          <div className="eyebrow">
            {passed ? 'ALL REQUIREMENTS CHECKED' : 'SOME REQUIREMENTS FAILED'}
          </div>
          <h2 id="result-title">
            {passed ? 'Ready for another try.' : 'This file still needs a change.'}
          </h2>
          <p>
            {passed
              ? 'Your corrected file is ready. Give it another go.'
              : 'Review the failed checks below and adjust your requirements.'}
          </p>
        </div>
      </div>
      {outputs.map((output, index) => {
        const checks = validate(output.info, requirements);
        const ok = checks.every((c) => c.passed);
        return (
          <div className="output-block" key={index}>
            <div className="output-summary">
              <strong>{output.info.name}</strong>
              <span>
                {formatBytes(originals.reduce((n, i) => n + i.size, 0))}{' '}
                <span aria-hidden="true">→</span> {formatBytes(output.info.size)}
                {output.info.width && (
                  <span data-testid="result-dimensions">
                    {' '}
                    · {output.info.width} × {output.info.height} px
                  </span>
                )}
                {output.info.pages && (
                  <span data-testid="result-pages">
                    {' '}
                    · {output.info.pages} page{output.info.pages === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <caption className="visually-hidden">Output requirement validation</caption>
                <thead>
                  <tr>
                    <th>Requirement</th>
                    <th>Required</th>
                    <th>Original</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => (
                    <tr key={check.label}>
                      <th scope="row">{check.label}</th>
                      <td>{check.required}</td>
                      <td>{originalValue(check.label, originals)}</td>
                      <td className={check.passed ? 'check-pass' : 'check-fail'}>
                        {check.passed ? <Check size={14} /> : <CircleAlert size={14} />}{' '}
                        {check.actual}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className={`button ${ok ? 'primary' : 'secondary'}`}
              onClick={() => download(index)}
            >
              <ArrowDownToLine size={17} />
              {ok ? 'Download file' : 'Download anyway · requirements not met'}
            </button>
          </div>
        );
      })}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <ul className="result-notes">
        {[...new Set(outputs.flatMap((o) => o.warnings))].map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <button className="text-button" onClick={onReset}>
        <RotateCcw size={15} /> Back to requirements
      </button>
    </section>
  );
}
function originalValue(label: string, infos: FileInfo[]): string {
  if (infos.length !== 1) return `${infos.length} files`;
  const i = infos[0];
  const l = label.toLowerCase();
  if (l.includes('format') || l.includes('type')) return i.format.toUpperCase();
  if (l.includes('size')) return formatBytes(i.size);
  if (l.includes('width')) return i.width ? `${i.width} px` : '—';
  if (l.includes('height')) return i.height ? `${i.height} px` : '—';
  if (l.includes('page')) return String(i.pages ?? '—');
  if (l.includes('ratio')) return i.width && i.height ? (i.width / i.height).toFixed(3) : '—';
  if (l.includes('pixel') && i.width && i.height)
    return (i.width * i.height).toLocaleString('en-US');
  return '—';
}
