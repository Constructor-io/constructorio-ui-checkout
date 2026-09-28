// @vitest-environment node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import { build } from 'vite';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(__dirname, '../..');
const packageImportRe = /^@import\s+['"]([^'"]+)['"];?$/;

// Replace each package @import with that package's CSS, the way bundlers
// such as Turbopack do before they parse the stylesheet.
const inlinePackageImports = (css: string): string =>
  css
    .split('\n')
    .map((line) => {
      const match = packageImportRe.exec(line.trim());
      if (!match) return line;
      return fs.readFileSync(require.resolve(match[1]), 'utf8');
    })
    .join('\n');

const findImportAfterFirstRule = (css: string): string | undefined => {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const firstRule = withoutComments.search(/(^|[;}])\s*[^@\s;}][^{;]*\{/);
  if (firstRule === -1) return undefined;
  return /@import[^;]*;/.exec(withoutComments.slice(firstRule))?.[0];
};

describe('library build: dist/styles.css', () => {
  let outDir: string;
  let css: string;

  beforeAll(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cio-checkout-lib-'));
    await build({
      root: rootDir,
      configFile: path.join(rootDir, 'vite.lib.config.ts'),
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
    css = fs.readFileSync(path.join(outDir, 'styles.css'), 'utf8');
  }, 60_000);

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('keeps every @import before the first rule', () => {
    expect(findImportAfterFirstRule(css)).toBeUndefined();
  });

  it('keeps every @import before the first rule after package imports are inlined', () => {
    expect(findImportAfterFirstRule(inlinePackageImports(css))).toBeUndefined();
  });

  it('keeps the font @import', () => {
    expect(css).toContain(
      "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');"
    );
  });
});
