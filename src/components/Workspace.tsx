import { lazy, Suspense, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle, LockKeyhole, Check, FileText } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { navigate, type Tool } from '../app/tools';
import { Upload } from './Upload';
import { FileOverview } from './FileOverview';
import { RequirementsEditor } from './RequirementsEditor';
import { Results } from './Results';
import { ToolBrowser } from './ToolBrowser';
import { ImageTransforms } from './ImageTransforms';
import { Presets } from './Presets';
import type { PdfOperation } from '../features/process-files';
const PdfPreview = lazy(() => import('./PdfPreview').then((m) => ({ default: m.PdfPreview })));
export function Workspace({ tool }: { tool?: Tool }) {
  const w = useWorkspace(tool);
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasFiles = w.files.length > 0;
  const action =
    w.mode === 'image'
      ? w.files.length > 1
        ? 'Process images'
        : 'Fix my file'
      : {
          images: 'Create PDF',
          merge: 'Merge PDFs',
          extract: 'Extract pages',
          remove: 'Remove pages',
          reorder: 'Reorder pages',
          split: 'Split PDF',
          rotate: 'Rotate pages',
        }[w.operation];
  return (
    <>
      {!hasFiles ? (
        <>
          <section className="home-intro">
            <h1>{tool ? tool.title : 'Fix files that websites reject.'}</h1>
            <p>
              {tool ? tool.description : 'Convert, compress, resize, and check your files.'}
              <br />
              {tool
                ? 'Private, free, and entirely in your browser.'
                : 'Free, private, and entirely in your browser.'}
            </p>
          </section>
          <div className="home-uploader">
            <Upload busy={w.busy} pdf={w.mode === 'pdf'} onFiles={w.selectFiles} />
            {w.error && (
              <div role="alert" className="error-box">
                {w.error}
              </div>
            )}
          </div>
          <div className="home-benefits">
            <span>
              <LockKeyhole size={15} /> No uploads
            </span>
            <span>
              <Check size={15} /> No account
            </span>
            <span>
              <FileText size={15} /> No watermarks
            </span>
          </div>
          <ToolBrowser
            category={w.mode}
            onCategory={w.setMode}
            onSelect={(t) => navigate(t.slug)}
          />
          {tool && (
            <p className="tool-limit">
              Choose files above, set the requirements, and download a checked result. Up to 20
              files, 60 MB combined. PDFs are not compressed; image size targets may need smaller
              dimensions.
            </p>
          )}
        </>
      ) : (
        <section className="workspace" aria-label="File workspace">
          <div className="workspace-heading">
            <button className="text-button" onClick={w.clear} disabled={w.busy}>
              <ArrowLeft size={16} /> Start over
            </button>
            <div className="workflow-steps" aria-label="Workflow">
              <span className="complete">File selected</span>
              <ArrowRight size={12} />
              <span className={!w.outputs.length ? 'current' : 'complete'}>Requirements</span>
              <ArrowRight size={12} />
              <span className={w.outputs.length ? 'current' : ''}>Download</span>
            </div>
          </div>
          <div className="workspace-layout">
            <aside className="file-sidebar">
              <FileOverview
                files={w.files}
                infos={w.infos}
                busy={w.busy}
                onFiles={w.selectFiles}
                onClear={w.clear}
                onMove={w.moveFile}
              />
              <p className="sidebar-privacy">
                <LockKeyhole size={14} /> Only on your device
              </p>
              {w.mode === 'image' && (
                <p className="sidebar-hint">
                  All images use the same settings. Originals stay untouched.
                </p>
              )}
            </aside>
            <div className="workspace-editor">
              {w.outputs.length ? (
                <Results
                  outputs={w.outputs}
                  originals={w.infos}
                  files={w.files}
                  requirements={w.effectiveRequirements}
                  onReset={() => w.setOutputs([])}
                />
              ) : (
                <>
                  <div className="editor-heading">
                    <div>
                      <h1>
                        {tool?.title ??
                          (w.mode === 'pdf' ? 'Prepare your PDF.' : 'Make your file fit.')}
                      </h1>
                      <p>Tell us what the website needs. We’ll check the result.</p>
                    </div>
                  </div>
                  {w.mode === 'pdf' && (
                    <fieldset className="pdf-options" disabled={w.busy}>
                      <div className="fields-grid">
                        <label className="field">
                          PDF operation
                          <select
                            aria-label="PDF operation"
                            value={w.operation}
                            onChange={(e) => {
                              w.setOperation(e.target.value as PdfOperation);
                              w.setSelection('');
                            }}
                          >
                            <option value="images">Images to PDF</option>
                            <option value="merge">Merge PDFs in file order</option>
                            <option value="split">Split into individual pages</option>
                            <option value="extract">Extract selected pages</option>
                            <option value="remove">Remove selected pages</option>
                            <option value="reorder">Reorder all pages</option>
                            <option value="rotate">Rotate pages</option>
                          </select>
                        </label>
                        {!['images', 'merge'].includes(w.operation) && (
                          <label className="field">
                            Page selection
                            <input
                              aria-label="Page selection"
                              value={w.selection}
                              onChange={(e) => w.setSelection(e.target.value)}
                              placeholder={
                                ['split', 'rotate'].includes(w.operation)
                                  ? 'Blank = every page'
                                  : 'e.g. 3, 1-2'
                              }
                            />
                          </label>
                        )}
                        {w.operation === 'rotate' && (
                          <label className="field">
                            Rotation
                            <select
                              aria-label="PDF rotation"
                              value={w.pdfRotation}
                              onChange={(e) =>
                                w.setPdfRotation(Number(e.target.value) as 90 | 180 | 270)
                              }
                            >
                              <option value={90}>90° clockwise</option>
                              <option value={180}>180°</option>
                              <option value={270}>90° counterclockwise</option>
                            </select>
                          </label>
                        )}
                      </div>
                      {w.infos.length === 1 && w.infos[0].format === 'pdf' && (
                        <details
                          className="page-preview-disclosure"
                          onToggle={(e) => setPreviewOpen(e.currentTarget.open)}
                        >
                          <summary>Preview & select pages</summary>
                          <Suspense fallback={<p role="status">Loading page preview…</p>}>
                            {previewOpen && (
                              <PdfPreview
                                file={w.files[0]}
                                pages={w.infos[0].pages}
                                selection={
                                  w.selection ||
                                  (['split', 'rotate'].includes(w.operation)
                                    ? `1-${w.infos[0].pages}`
                                    : '')
                                }
                                selectable={w.operation !== 'merge'}
                                onSelection={(value) => w.setSelection(value || 'none')}
                                onReorder={w.operation === 'reorder' ? w.setSelection : undefined}
                              />
                            )}
                          </Suspense>
                        </details>
                      )}
                      <p className="field-note">
                        Page numbers start at 1. Reordering requires every page exactly once. Merge
                        follows the file order shown.
                      </p>
                    </fieldset>
                  )}
                  <RequirementsEditor
                    value={w.requirements}
                    onChange={w.setRequirements}
                    options={w.options}
                    onOptions={w.setOptions}
                    pdf={w.mode === 'pdf'}
                    disabled={w.busy}
                  />
                  {w.mode === 'image' && (
                    <>
                      <ImageTransforms
                        options={w.options}
                        onChange={w.setOptions}
                        disabled={w.busy}
                      />
                      <Presets
                        requirements={w.requirements}
                        options={w.options}
                        onApply={(r, o) => {
                          w.setRequirements(r);
                          w.setOptions(o);
                        }}
                        disabled={w.busy}
                      />
                    </>
                  )}
                  {w.selection === 'none' && (
                    <div className="error-box" role="alert">
                      Select at least one page. Clear the page selection field to use every page.
                    </div>
                  )}
                  {w.problems.length > 0 && (
                    <div className="error-box" role="alert">
                      {w.problems.map((p) => (
                        <p key={p}>{p}</p>
                      ))}
                    </div>
                  )}
                  {w.error && (
                    <div className="error-box" role="alert">
                      {w.error}
                    </div>
                  )}
                  <div className="process-area">
                    <button
                      className="button primary process-button"
                      disabled={w.busy || w.problems.length > 0 || w.selection === 'none'}
                      onClick={w.process}
                    >
                      {w.busy ? (
                        <>
                          <LoaderCircle size={17} className="spinner" />
                          {w.status}
                        </>
                      ) : (
                        <>
                          {action}
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                    {w.busy ? (
                      <button className="text-button" onClick={w.cancel}>
                        Cancel operation
                      </button>
                    ) : (
                      <span>Originals stay untouched. Every result is checked.</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}
      <div className="visually-hidden" role="status" aria-live="polite">
        {w.status}
      </div>
      {!w.busy && w.status.startsWith('Operation cancelled') && (
        <p className="notice" role="status">
          {w.status}
        </p>
      )}
    </>
  );
}
