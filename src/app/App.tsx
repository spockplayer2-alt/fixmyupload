import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CodeXml,
  Image,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Brand } from '../components/Brand';
import { Upload } from '../components/Upload';
import { RequirementsEditor } from '../components/RequirementsEditor';
import { Results } from '../components/Results';
import { PrivacyDialog } from '../components/PrivacyDialog';
import { processFiles, type PdfOperation } from '../features/process-files';
import { conflicts } from '../features/validation/requirements';
import { inspectFile } from '../features/image/process';
import {
  LIMITS,
  type FileInfo,
  type ImageOptions,
  type Output,
  type Requirements,
} from '../types/files';

export default function App() {
  const [mode, setMode] = useState<'image' | 'pdf'>('image');
  const [files, setFiles] = useState<File[]>([]);
  const [infos, setInfos] = useState<FileInfo[]>([]);
  const [requirements, setRequirements] = useState<Requirements>({ formats: [] });
  const [options, setOptions] = useState<ImageOptions>({
    format: 'jpeg',
    quality: 0.9,
    fit: 'contain',
    background: '#ffffff',
  });
  const [operation, setOperation] = useState<PdfOperation>('images');
  const [selection, setSelection] = useState('');
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const generation = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  const problems = conflicts(requirements);
  const effectiveRequirements: Requirements = {
    ...requirements,
    formats: requirements.formats.length
      ? requirements.formats
      : [mode === 'pdf' ? 'pdf' : options.format],
  };
  function clear() {
    generation.current++;
    setFiles([]);
    setInfos([]);
    setOutputs([]);
    setError('');
    setBusy(false);
    setStatus('');
  }
  function switchMode(next: 'image' | 'pdf') {
    clear();
    setMode(next);
    setRequirements({ formats: [] });
    setSelection('');
    setOperation('images');
  }
  async function selectFiles(next: File[]) {
    clear();
    if (!next.length) return;
    const token = generation.current;
    setBusy(true);
    setStatus('Reading your files…');
    try {
      if (mode === 'image' && next.length !== 1)
        throw new Error('Choose one image at a time. Use PDF tools to combine multiple files.');
      if (next.length > LIMITS.files || next.reduce((s, f) => s + f.size, 0) > LIMITS.batchBytes)
        throw new Error('Choose up to 20 files, with a combined size under 60 MB.');
      const metadata: FileInfo[] = [];
      for (const file of next) {
        metadata.push(await inspectFile(file));
        if (token !== generation.current) return;
      }
      if (mode === 'image' && metadata.some((i) => i.format === 'pdf'))
        throw new Error('For PDF documents, switch to PDF tools above.');
      if (mode === 'pdf') {
        if (metadata.some((i) => i.format === 'pdf') && metadata.some((i) => i.format !== 'pdf'))
          throw new Error('Choose either images or PDF documents in one batch.');
        setOperation(metadata[0].format === 'pdf' ? 'merge' : 'images');
      }
      setFiles(next);
      setInfos(metadata);
    } catch (e) {
      if (token === generation.current) setError(message(e));
    } finally {
      if (token === generation.current) {
        setBusy(false);
        setStatus('');
      }
    }
  }
  async function process() {
    if (!files.length || busy || problems.length) return;
    const token = ++generation.current;
    setBusy(true);
    setError('');
    setStatus(
      mode === 'image' ? 'Encoding and checking your image…' : 'Preparing and checking your PDF…',
    );
    try {
      const result = await processFiles({
        files,
        infos,
        requirements: effectiveRequirements,
        options,
        mode,
        operation,
        selection,
        onStatus: setStatus,
      });
      if (token === generation.current) {
        setOutputs(result);
        setStatus('Checks complete.');
      }
    } catch (e) {
      if (token === generation.current) setError(message(e));
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  const action =
    mode === 'image'
      ? 'Fix my file'
      : {
          images: 'Create PDF',
          merge: 'Merge PDFs',
          extract: 'Extract pages',
          remove: 'Remove pages',
          reorder: 'Reorder pages',
          split: 'Split PDF',
        }[operation];
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to file tool
      </a>
      <div className="app-shell">
        <header>
          <Brand />
          <div className="header-actions">
            <span className="free-label">FREE & OPEN SOURCE</span>
            <a
              className="icon-button"
              href="https://github.com/spockplayer2-alt/fixmyupload"
              aria-label="GitHub repository"
              target="_blank"
              rel="noreferrer"
            >
              <CodeXml size={19} />
            </a>
            <span className="header-divider" />
            <button
              className="icon-button"
              aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>
        <main id="main">
          <div className="intro">
            <div>
              <div className="eyebrow">
                <span className="status-dot" /> THE LITTLE TOOL THAT GETS FILES THROUGH
              </div>
              <h1>
                Wrong size. Wrong format.
                <br />
                <span>Right place.</span>
              </h1>
              <p>Meet the upload requirements. Get on with your day.</p>
            </div>
            <div className="privacy-stamp">
              <ShieldCheck size={22} strokeWidth={1.5} />
              <span>
                Entirely in your browser.
                <br />
                <strong>Nothing gets uploaded.</strong>
              </span>
            </div>
          </div>
          <div className="workspace">
            <div className="workspace-top">
              <div className="tabs" role="tablist" aria-label="File tools">
                <button
                  role="tab"
                  aria-selected={mode === 'image'}
                  onClick={() => {
                    if (mode !== 'image') switchMode('image');
                  }}
                  disabled={busy}
                >
                  <Image size={16} /> Image fixer
                </button>
                <button
                  role="tab"
                  aria-selected={mode === 'pdf'}
                  onClick={() => {
                    if (mode !== 'pdf') switchMode('pdf');
                  }}
                  disabled={busy}
                >
                  <span className="pdf-icon">PDF</span> PDF tools
                </button>
              </div>
              <span className="workspace-note">
                <span /> LOCAL WORKSPACE
              </span>
            </div>
            <div className="workspace-body">
              <div className="source-column">
                <Upload
                  files={files}
                  infos={infos}
                  busy={busy}
                  pdf={mode === 'pdf'}
                  onFiles={selectFiles}
                  onClear={clear}
                />
                <div className="how-it-works">
                  <span className="eyebrow">ONE LESS THING TO FIGURE OUT</span>
                  <div>
                    <span className="step-mark">1</span>
                    <p>Add a file that's being rejected.</p>
                  </div>
                  <div>
                    <span className="step-mark">2</span>
                    <p>Tell us what the website needs.</p>
                  </div>
                  <div>
                    <span className="step-mark">3</span>
                    <p>Download it, checked and ready.</p>
                  </div>
                </div>
                <div className="supported-note">
                  <Check size={14} /> No sign-up. No watermarks. No fuss.
                </div>
              </div>
              <div className="editor-column">
                {outputs.length ? (
                  <Results
                    outputs={outputs}
                    originals={infos}
                    requirements={effectiveRequirements}
                    onReset={() => setOutputs([])}
                  />
                ) : (
                  <>
                    <RequirementsEditor
                      value={requirements}
                      onChange={setRequirements}
                      options={options}
                      onOptions={setOptions}
                      pdf={mode === 'pdf'}
                      disabled={busy}
                    />
                    {mode === 'pdf' && (
                      <fieldset className="pdf-options" disabled={busy}>
                        <div className="fields-grid">
                          <label className="field">
                            PDF operation
                            <select
                              aria-label="PDF operation"
                              value={operation}
                              onChange={(e) => setOperation(e.target.value as PdfOperation)}
                            >
                              <option value="images">Images to PDF</option>
                              <option value="merge">Merge PDFs in file order</option>
                              <option value="extract">Extract selected pages</option>
                              <option value="remove">Remove selected pages</option>
                              <option value="reorder">Reorder all pages</option>
                              <option value="split">Split into individual pages</option>
                            </select>
                          </label>
                          {!['merge', 'images'].includes(operation) && (
                            <label className="field">
                              Page selection
                              <input
                                aria-label="Page selection"
                                placeholder={
                                  operation === 'split' ? 'Blank = every page' : 'e.g. 3, 1-2'
                                }
                                value={selection}
                                onChange={(e) => setSelection(e.target.value)}
                              />
                            </label>
                          )}
                        </div>
                        <p className="field-note">
                          Files follow selection order. Page numbers start at 1. Reordering requires
                          every page exactly once.
                        </p>
                      </fieldset>
                    )}
                    {problems.length > 0 && (
                      <div className="error-box" role="alert">
                        {problems.map((p) => (
                          <p key={p}>{p}</p>
                        ))}
                      </div>
                    )}
                    {error && (
                      <div className="error-box" role="alert">
                        {error}
                      </div>
                    )}
                    <div className="process-area">
                      <button
                        className="button primary process-button"
                        disabled={!files.length || busy || problems.length > 0}
                        onClick={process}
                      >
                        {busy ? (
                          <>
                            <LoaderCircle className="spinner" size={18} />
                            {status}
                          </>
                        ) : (
                          <>
                            {action}
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                      <span>We'll check the result before you download.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="trust-strip">
            <span>
              <ShieldCheck size={15} /> Private by design
            </span>
            <span>Works on your device</span>
            <span>Built for the “file not accepted” moment.</span>
          </div>
        </main>
        <footer>
          <span>A small fix. A little less friction.</span>
          <div>
            <button className="text-button" onClick={() => setPrivacy(true)}>
              Privacy & limits
            </button>
            <a
              href="https://github.com/spockplayer2-alt/fixmyupload"
              target="_blank"
              rel="noreferrer"
            >
              View source <ArrowRight size={12} />
            </a>
            <span className="version">v0.1.0</span>
          </div>
        </footer>
      </div>
      <div className="visually-hidden" role="status" aria-live="polite">
        {status}
      </div>
      {privacy && <PrivacyDialog onClose={() => setPrivacy(false)} />}
    </>
  );
}
function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Try another file or reload the page.';
}
