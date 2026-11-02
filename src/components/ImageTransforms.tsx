import { FlipHorizontal2, FlipVertical2, RotateCw } from 'lucide-react';
import type { ImageOptions } from '../types/files';
export function ImageTransforms({
  options: o,
  onChange,
  disabled,
}: {
  options: ImageOptions;
  onChange: (o: ImageOptions) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="image-transforms" disabled={disabled}>
      <legend>Orientation</legend>
      <div className="transform-buttons">
        <button
          className="button secondary"
          onClick={() =>
            onChange({
              ...o,
              rotation: (((o.rotation ?? 0) + 90) % 360) as ImageOptions['rotation'],
            })
          }
        >
          <RotateCw size={16} /> Rotate {o.rotation ?? 0}°
        </button>
        <button
          className="button secondary"
          aria-pressed={!!o.flipHorizontal}
          onClick={() => onChange({ ...o, flipHorizontal: !o.flipHorizontal })}
        >
          <FlipHorizontal2 size={16} /> Flip horizontal
        </button>
        <button
          className="button secondary"
          aria-pressed={!!o.flipVertical}
          onClick={() => onChange({ ...o, flipVertical: !o.flipVertical })}
        >
          <FlipVertical2 size={16} /> Flip vertical
        </button>
      </div>
      {o.fit === 'crop' && (
        <div className="fields-grid crop-position">
          <label className="field">
            Horizontal crop position
            <input
              type="range"
              min="0"
              max="100"
              value={(o.cropX ?? 0.5) * 100}
              onChange={(e) => onChange({ ...o, cropX: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="field">
            Vertical crop position
            <input
              type="range"
              min="0"
              max="100"
              value={(o.cropY ?? 0.5) * 100}
              onChange={(e) => onChange({ ...o, cropY: Number(e.target.value) / 100 })}
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
