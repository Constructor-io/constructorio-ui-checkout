import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const rootClass = '.cio-checkout-root';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@src': path.resolve(dirname, 'src'),
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
