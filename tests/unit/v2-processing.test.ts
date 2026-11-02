import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processFiles } from '../../src/features/process-files';
import { processImage } from '../../src/features/image/process';
import type { ImageOptions, Output } from '../../src/types/files';

vi.mock('../../src/features/image/process', () => ({ processImage: vi.fn() }));

const options: ImageOptions = { format: 'png', quality: 1, fit: 'contain', background: '#ffffff' };
const file = (name = 'photo.png') => new File([new Uint8Array([1])], name);
const output = (name: string, size = 1): Output => ({
  blob: new Blob([new Uint8Array(size)], { type: 'image/png' }),
  info: { name, format: 'png', size, width: 4, height: 2 },
  warnings: [],
});
const request = (files = [file('a.png'), file('b.png')]) => ({
  files,
  infos: files.map((f) => ({
    name: f.name,
    format: 'png' as const,
    size: f.size,
    width: 4,
    height: 2,
  })),
  requirements: { formats: [] },
  options,
  mode: 'image' as const,
  operation: 'images' as const,
  selection: '',
  onStatus: vi.fn(),
});

describe('bounded image batches', () => {
  beforeEach(() => {
    vi.mocked(processImage).mockReset();
  });

  it('processes every file sequentially and reports actual file progress', async () => {
    const work = request();
    let active = 0;
    vi.mocked(processImage).mockImplementation(async (f) => {
      expect(active).toBe(0);
      active++;
      await Promise.resolve();
      active--;
      return output(f.name);
    });
    expect((await processFiles(work)).map((item) => item.info.name)).toEqual(['a.png', 'b.png']);
    expect(work.onStatus.mock.calls.flat().join(' ')).toMatch(/1.*2.*a\.png.*2.*2.*b\.png/);
  });

  it('rejects empty and over-limit batches before processing', async () => {
    await expect(processFiles(request([]))).rejects.toThrow(/file|choose/i);
    await expect(processFiles(request(Array.from({ length: 21 }, () => file())))).rejects.toThrow(
      /20/,
    );
    expect(processImage).not.toHaveBeenCalled();
  });

  it('stops when the combined encoded outputs exceed 60 MB', async () => {
    const work = request([file('a.png'), file('b.png'), file('c.png'), file('d.png')]);
    const large = output('large.png', 20_000_001);
    vi.mocked(processImage).mockResolvedValue(large);
    await expect(processFiles(work)).rejects.toThrow(/60 MB/);
    expect(processImage).toHaveBeenCalledTimes(3);
  });

  it('cancels between files and never starts the next file', async () => {
    const controller = new AbortController();
    vi.mocked(processImage).mockImplementation(async (f) => {
      controller.abort();
      return output(f.name);
    });
    await expect(processFiles({ ...request(), signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(processImage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(processImage).mock.calls[0][3]).toBe(controller.signal);
  });

  it('does no work for an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(processFiles({ ...request(), signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(processImage).not.toHaveBeenCalled();
  });
});

// Canvas and ImageBitmap are browser-only APIs. This harness records the real
// processing geometry and emits measurable PNG headers through the normal pipeline.
function png(width: number, height: number): Blob {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes], { type: 'image/png' });
}

function browserHarness() {
  const contexts: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const canvases: { width: number; height: number }[] = [];
  const closed: ReturnType<typeof vi.fn>[] = [];
  vi.stubGlobal('createImageBitmap', async (blob: Blob) => {
    const bytes = new DataView(await blob.arrayBuffer());
    const close = vi.fn();
    closed.push(close);
    return { width: bytes.getUint32(16), height: bytes.getUint32(20), close };
  });
  vi.stubGlobal('document', {
    createElement: () => {
      const ctx = Object.fromEntries(
        ['drawImage', 'translate', 'rotate', 'scale', 'fillRect', 'setTransform'].map((name) => [
          name,
          vi.fn(),
        ]),
      );
      contexts.push(ctx);
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ctx,
        toBlob: (callback: (blob: Blob) => void) => callback(png(canvas.width, canvas.height)),
      };
      canvases.push(canvas);
      return canvas;
    },
  });
  return { contexts, canvases, closed };
}

describe('image transforms', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rotates the oriented bitmap before planning dimensions and applies both flips', async () => {
    const browser = browserHarness();
    const { processImage: realProcessImage } = await vi.importActual<
      typeof import('../../src/features/image/process')
    >('../../src/features/image/process');
    const result = await realProcessImage(
      new File([png(4, 2)], 'source.png'),
      { formats: [], maxHeight: 2 },
      { ...options, rotation: 90, flipHorizontal: true, flipVertical: true },
    );
    expect(result.info).toMatchObject({ width: 1, height: 2 });
    expect(
      browser.contexts.some((ctx) =>
        ctx.rotate.mock.calls.some(([angle]) => angle === Math.PI / 2),
      ),
    ).toBe(true);
    expect(
      browser.contexts.some((ctx) => ctx.scale.mock.calls.some(([x, y]) => x === -1 && y === -1)),
    ).toBe(true);
    expect(browser.closed.every((close) => close.mock.calls.length === 1)).toBe(true);
    expect(browser.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(
      true,
    );
  });

  it('uses normalized crop placement, with the center as the default', async () => {
    const { processImage: realProcessImage } = await vi.importActual<
      typeof import('../../src/features/image/process')
    >('../../src/features/image/process');
    for (const [cropX, expectedX] of [
      [undefined, -1],
      [0, 0],
      [1, -2],
    ] as const) {
      const browser = browserHarness();
      await realProcessImage(
        new File([png(4, 2)], 'source.png'),
        { formats: [], width: 2, height: 2 },
        { ...options, fit: 'crop', cropX },
      );
      const last = browser.contexts.at(-1)!;
      const geometry = last.drawImage.mock.calls.at(-1)?.slice(1) as number[];
      [expectedX, 0, 4, 2].forEach((expected, index) =>
        expect(geometry[index]).toBeCloseTo(expected),
      );
    }
    const browser = browserHarness();
    await realProcessImage(
      new File([png(2, 4)], 'source.png'),
      { formats: [], width: 2, height: 2 },
      { ...options, fit: 'crop', cropY: 1 },
    );
    expect(browser.contexts.at(-1)!.drawImage.mock.calls.at(-1)?.slice(1)).toEqual([0, -2, 2, 4]);
  });

  it('rejects invalid transform values before creating output', async () => {
    browserHarness();
    const { processImage: realProcessImage } = await vi.importActual<
      typeof import('../../src/features/image/process')
    >('../../src/features/image/process');
    for (const change of [{ cropX: -0.1 }, { cropY: 1.1 }, { cropX: NaN }, { rotation: 45 }]) {
      await expect(
        realProcessImage(new File([png(4, 2)], 'source.png'), { formats: [] }, {
          ...options,
          ...change,
        } as ImageOptions),
      ).rejects.toThrow(/crop|rotation/i);
    }
  });

  it('does not decode when cancelled before processing starts', async () => {
    browserHarness();
    const decode = vi.spyOn(globalThis, 'createImageBitmap');
    const { processImage: realProcessImage } = await vi.importActual<
      typeof import('../../src/features/image/process')
    >('../../src/features/image/process');
    const controller = new AbortController();
    controller.abort();
    await expect(
      realProcessImage(
        new File([png(4, 2)], 'source.png'),
        { formats: [] },
        options,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(decode).not.toHaveBeenCalled();
  });
});
