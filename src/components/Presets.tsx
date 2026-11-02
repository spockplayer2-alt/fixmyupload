import { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import type { Requirements, ImageOptions } from '../types/files';
import { conflicts } from '../features/validation/requirements';
interface Preset {
  name: string;
  requirements: Requirements;
  options: ImageOptions;
}
const key = 'fixmyupload-presets-v2';
function read(): Preset[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is Preset =>
          p &&
          typeof p.name === 'string' &&
          p.requirements &&
          Array.isArray(p.requirements.formats) &&
          conflicts(p.requirements).length === 0 &&
          p.options &&
          ['jpeg', 'png', 'webp'].includes(p.options.format) &&
          ['contain', 'crop', 'pad'].includes(p.options.fit) &&
          typeof p.options.background === 'string' &&
          /^#[0-9a-f]{6}$/i.test(p.options.background) &&
          typeof p.options.quality === 'number' &&
          p.options.quality >= 0.2 &&
          p.options.quality <= 1,
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}
export function Presets({
  requirements,
  options,
  onApply,
  disabled,
}: {
  requirements: Requirements;
  options: ImageOptions;
  onApply: (r: Requirements, o: ImageOptions) => void;
  disabled: boolean;
}) {
  const [presets, setPresets] = useState(read),
    [name, setName] = useState(''),
    [message, setMessage] = useState('');
  function save() {
    if (!name.trim()) return;
    try {
      const next = [
        ...presets.filter((p) => p.name !== name.trim()),
        { name: name.trim().slice(0, 40), requirements, options },
      ].slice(-10);
      localStorage.setItem(key, JSON.stringify(next));
      setPresets(next);
      setName('');
      setMessage('Preset saved on this device. No files are stored.');
    } catch {
      setMessage('Your browser could not save settings. Check storage permissions.');
    }
  }
  function remove(index: number) {
    try {
      const next = presets.filter((_, i) => i !== index);
      localStorage.setItem(key, JSON.stringify(next));
      setPresets(next);
    } catch {
      setMessage('Could not remove this preset. Check browser storage permissions.');
    }
  }
  return (
    <details className="presets">
      <summary>
        <Bookmark size={15} /> Saved presets
      </summary>
      <p className="field-note">Save settings on this device. Your files are never saved.</p>
      <div className="preset-list">
        {presets.map((p, i) => (
          <div key={p.name}>
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => {
                onApply(p.requirements, p.options);
                setMessage(`Applied ${p.name}.`);
              }}
            >
              {p.name}
            </button>
            <button
              className="icon-button"
              aria-label={`Delete preset ${p.name}`}
              disabled={disabled}
              onClick={() => remove(i)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="preset-save">
        <input
          aria-label="Preset name"
          maxLength={40}
          placeholder="Preset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
        <button
          className="button secondary"
          disabled={disabled || !name.trim() || conflicts(requirements).length > 0}
          onClick={save}
        >
          Save preset
        </button>
      </div>
      <p role="status" className="field-note">
        {message}
      </p>
    </details>
  );
}
