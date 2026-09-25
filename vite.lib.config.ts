import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prefixer from 'postcss-prefix-selector';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const rootClass = '.cio-checkout-root';

// Externalize CSS @import from node_modules and remote URLs in library builds.
// Strips those @imports before Vite inline them, then prepends them back in
// source order at the top of the final CSS output. url(...) imports must be
// collected too: left in place, they end up after the package @import, which
// consumers that inline the package (Turbopack, Lightning CSS) reject.
function externalizeCssImports(): Plugin {
  const importRe =
    /@import\s+(url\(\s*)?['"]((?:@[\w-]+\/)?[\w-][^'"]*)['"]\s*\)?\s*;?\s*/g;
  const collected: string[] = [];

  return {
    name: 'externalize-css-imports',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css')) return null;
      const result = code.replace(
        importRe,
        (match, url: string | undefined, specifier: string) => {
          if (specifier.startsWith('.') || specifier.startsWith('/'))
            return match;
          const statement = url
            ? `@import url('${specifier}');`
            : `@import '${specifier}';`;
          if (!collected.includes(statement)) collected.push(statement);
          return '';
        }
      );
      return result !== code ? result : null;
    },
    writeBundle(options) {
      if (!collected.length) return;
      const outDir = options.dir || 'dist';
      const cssPath = path.resolve(outDir, 'styles.css');
      if (fs.existsSync(cssPath)) {
        const imports = collected.join('\n');
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
