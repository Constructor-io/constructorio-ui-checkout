import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import prefixer from 'postcss-prefix-selector';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const rootClass = '.cio-checkout-root';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@src': path.resolve(dirname, 'src'),
    },
  },
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
      output: {
        assetFileNames: 'styles.css',
      },
    },
    outDir: 'dist',
    cssCodeSplit: false,
    cssMinify: false,
    write: true,
  },
});
