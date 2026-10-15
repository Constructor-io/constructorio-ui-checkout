// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { JSDOM } from 'jsdom';
import { build } from 'vite';

const rootDir = path.resolve(__dirname, '../..');

interface BundledWindow {
  CioCheckout: { resume: unknown; VERSION: unknown };
}

describe('bundled build: dist/constructorio-ui-checkout-bundled.js', () => {
  let outDir: string;
  let code: string;

  beforeAll(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cio-checkout-bundled-'));
    await build({
      root: rootDir,
      configFile: path.join(rootDir, 'vite.bundled.config.ts'),
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
    code = fs.readFileSync(
      path.join(outDir, 'constructorio-ui-checkout-bundled.js'),
      'utf8'
    );
  }, 60_000);

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('has no @import in the injected CSS', () => {
    expect(code.match(/@import[^;]*/g)).toBeNull();
  });

  it('exposes window.CioCheckout when loaded with a script tag', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'outside-only',
    });
    dom.window.eval(code);
    const { CioCheckout } = dom.window as unknown as BundledWindow;
    expect(typeof CioCheckout.resume).toBe('function');
    expect(typeof CioCheckout.VERSION).toBe('string');
    const { document } = dom.window;
    expect(document.getElementById('cio-checkout-styles')).not.toBeNull();
    expect(
      document.querySelectorAll('link[href^="https://fonts.googleapis.com/"]')
    ).toHaveLength(2);
    dom.window.close();
  });
});
