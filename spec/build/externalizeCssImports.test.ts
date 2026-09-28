// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Plugin } from 'vite';

import { externalizeCssImports } from '../../vite.lib.config';

type Transform = (code: string, id: string) => string | null;
type WriteBundle = (options: { dir: string }) => void;

// Run the plugin over one CSS source and return the rewritten source plus
// the stylesheet it writes after the bundle.
const runPlugin = (source: string) => {
  const plugin: Plugin = externalizeCssImports();
  const transformed =
    (plugin.transform as Transform)(source, 'styles.css') ?? source;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cio-checkout-plugin-'));
  try {
    fs.writeFileSync(path.join(dir, 'styles.css'), '.rule{}');
    (plugin.writeBundle as WriteBundle)({ dir });
    const output = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
    return { transformed, output };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe('externalizeCssImports', () => {
  it('keeps media conditions on url() imports', () => {
    const { transformed, output } = runPlugin(
      "@import url('https://example.com/a.css') screen and (min-width: 1px);\n.a{}"
    );
    expect(transformed).toBe('.a{}');
    expect(output).toBe(
      "@import url('https://example.com/a.css') screen and (min-width: 1px);\n.rule{}"
    );
  });

  it('keeps layer() and supports() conditions on package imports', () => {
    const { transformed, output } = runPlugin(
      "@import 'pkg/styles.css' layer(base) supports(display: grid);\n.a{}"
    );
    expect(transformed).toBe('.a{}');
    expect(output).toBe(
      "@import 'pkg/styles.css' layer(base) supports(display: grid);\n.rule{}"
    );
  });

  it('keeps imports without conditions unchanged', () => {
    const { output } = runPlugin(
      "@import url('https://example.com/a.css');\n@import 'pkg/styles.css';\n.a{}"
    );
    expect(output).toBe(
      "@import url('https://example.com/a.css');\n@import 'pkg/styles.css';\n.rule{}"
    );
  });

  it('handles a final import with no semicolon', () => {
    const { transformed, output } = runPlugin(".a{}\n@import 'pkg/styles.css'");
    expect(transformed).toBe('.a{}\n');
    expect(output).toBe("@import 'pkg/styles.css';\n.rule{}");
  });

  it('leaves relative imports in place', () => {
    const source = "@import './local.css' screen;\n.a{}";
    const { transformed } = runPlugin(source);
    expect(transformed).toBe(source);
  });
});
