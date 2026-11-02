// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { RequirementsEditor } from '../../src/components/RequirementsEditor';
import type { ImageOptions, Requirements } from '../../src/types/files';
afterEach(cleanup);
function Editor() {
  const [r, setR] = useState<Requirements>({ formats: [] });
  const [o, setO] = useState<ImageOptions>({
    format: 'jpeg',
    quality: 0.9,
    fit: 'contain',
    background: '#ffffff',
  });
  return (
    <RequirementsEditor
      value={r}
      onChange={setR}
      options={o}
      onOptions={setO}
      pdf={false}
      disabled={false}
    />
  );
}
it('requires explicit confirmation when parsed instructions are ambiguous', () => {
  render(<Editor />);
  fireEvent.change(screen.getByLabelText(/Paste the upload error/), {
    target: { value: 'PNG should be around 2 MB and 600x600' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Read requirements' }));
  const apply = screen.getByRole('button', { name: 'Apply detected requirements' });
  expect(apply).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(apply).toBeEnabled();
  fireEvent.click(apply);
  expect(screen.getByLabelText('Maximum file size')).toHaveValue(null);
});
it('applies recognized limits only after review', () => {
  render(<Editor />);
  fireEvent.change(screen.getByLabelText(/Paste the upload error/), {
    target: { value: 'JPEG only, maximum 2 MB, minimum 600x600 pixels' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Read requirements' }));
  expect(screen.getByLabelText('Maximum file size')).toHaveValue(null);
  fireEvent.click(screen.getByRole('button', { name: 'Apply detected requirements' }));
  expect(screen.getByLabelText('Maximum file size')).toHaveValue(2000);
  expect(screen.getByLabelText('Minimum width')).toHaveValue(600);
});
