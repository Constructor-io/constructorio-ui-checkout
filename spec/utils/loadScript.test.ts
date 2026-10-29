import { loadScript } from '@src/utils/loadScript';

const SRC = 'https://example.test/sdk.js';

describe(`${loadScript.name}: client`, () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('resolves without a tag when isReady is already true', async () => {
    await expect(
      loadScript({ id: 'ready', src: SRC, isReady: () => true })
    ).resolves.toBeUndefined();
    expect(document.getElementById('ready')).toBeNull();
  });

  it('adds one tag and shares the promise between callers', async () => {
    const a = loadScript({ id: 'shared', src: SRC, isReady: () => false });
    const b = loadScript({ id: 'shared', src: SRC, isReady: () => false });
    expect(a).toBe(b);
    const tags = document.querySelectorAll('script#shared');
    expect(tags).toHaveLength(1);
    expect((tags[0] as HTMLScriptElement).src).toBe(SRC);
    tags[0].dispatchEvent(new Event('load'));
    await expect(a).resolves.toBeUndefined();
  });

  it('rejects, removes the tag and retries on the next call', async () => {
    const first = loadScript({ id: 'flaky', src: SRC, isReady: () => false });
    document.getElementById('flaky')!.dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow('Failed to load script');
    expect(document.getElementById('flaky')).toBeNull();

    const second = loadScript({ id: 'flaky', src: SRC, isReady: () => false });
    expect(second).not.toBe(first);
    expect(document.getElementById('flaky')).not.toBeNull();
    document.getElementById('flaky')!.dispatchEvent(new Event('load'));
    await expect(second).resolves.toBeUndefined();
  });

  it('waits on a tag that is already in the document', async () => {
    const tag = document.createElement('script');
    tag.id = 'existing';
    document.head.appendChild(tag);
    const p = loadScript({ id: 'existing', src: SRC, isReady: () => false });
    expect(document.querySelectorAll('script#existing')).toHaveLength(1);
    tag.dispatchEvent(new Event('load'));
    await expect(p).resolves.toBeUndefined();
  });

  it('rejects when the tag already loaded but the global is missing', async () => {
    const first = loadScript({ id: 'stale', src: SRC, isReady: () => false });
    document.getElementById('stale')!.dispatchEvent(new Event('load'));
    await first;

    await expect(
      loadScript({ id: 'stale', src: SRC, isReady: () => false })
    ).rejects.toThrow('loaded but is not ready');
  });
});
