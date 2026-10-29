export interface LoadScriptOptions {
  /** Id of the `<script>` tag. One tag per id, shared by every caller. */
  id: string;
  src: string;
  /** True once the script's global is usable. Skips the network when already loaded. */
  isReady: () => boolean;
}

const pending = new Map<string, Promise<void>>();

/** Loads an external SDK once. A failed load is forgotten so the next call retries. */
export function loadScript({
  id,
  src,
  isReady,
}: LoadScriptOptions): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error(`loadScript(${id}) needs a document`));
  }
  if (isReady()) return Promise.resolve();
  const existing = pending.get(id);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const existingTag = document.getElementById(id) as HTMLScriptElement | null;
    // A tag that already loaded will not fire `load` again.
    if (existingTag?.dataset.loaded) {
      pending.delete(id);
      reject(new Error(`Script ${src} loaded but is not ready`));
      return;
    }
    const script = existingTag ?? document.createElement('script');
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        pending.delete(id);
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      'error',
      () => {
        pending.delete(id);
        script.remove();
        reject(new Error(`Failed to load script ${src}`));
      },
      { once: true }
    );
    if (!existingTag) {
      script.id = id;
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  pending.set(id, promise);
  return promise;
}
