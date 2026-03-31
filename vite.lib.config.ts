import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prefixer from 'postcss-prefix-selector';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const rootClass = '.cio-checkout-root';

// Externalize CSS @import from node_modules in library builds.
// Strips package @imports before Vite inline them, then prepends them back
// as bare @import statements in the final CSS output.
function externalizeCssImports(): Plugin {
  const importRe = /@import\s+['"]((?:@[\w-]+\/)?[\w-][^'"]*)['"]\s*;?\s*/g;
  const collected: string[] = [];

  return {
    name: 'externalize-css-imports',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css')) return null;
      const result = code.replace(importRe, (match, specifier: string) => {
        if (specifier.startsWith('.') || specifier.startsWith('/'))
          return match;
        if (!collected.includes(specifier)) collected.push(specifier);
        return '';
      });
      return result !== code ? result : null;
    },
    writeBundle(options) {
      if (!collected.length) return;
      const outDir = options.dir || 'dist';
      const cssPath = path.resolve(outDir, 'styles.css');
      if (fs.existsSync(cssPath)) {
        const imports = collected.map((s) => `@import '${s}';`).join('\n');
        const css = fs.readFileSync(cssPath, 'utf8');
        if (!css.includes(imports)) {
          fs.writeFileSync(cssPath, imports + '\n' + css);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), externalizeCssImports()],
  resolve: { alias: { '@src': path.resolve(dirname, 'src') } },
  css: {
    postcss: {
      plugins: [
        prefixer({
          prefix: rootClass,
          exclude: [':root', 'html', 'body', rootClass],
          transform(_, selector, prefixedSelector, filePath) {
            if (filePath.includes('node_modules')) {
              return selector;
            }
            return prefixedSelector;
          },
        }),
      ],
    },
  },
  build: {
    lib: {
      entry: path.resolve(dirname, 'src/index.ts'),
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@constructor-io/constructorio-ui-components',
        '@stripe/stripe-js',
        '@stripe/react-stripe-js',
      ],
      output: { assetFileNames: 'styles.css' },
    },
    outDir: 'dist',
    cssCodeSplit: false,
    cssMinify: false,
    write: true,
  },
});
