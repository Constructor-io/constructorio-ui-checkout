import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Remote @import lines (Google Fonts, from src/styles.css and the components
// package) would ship inside the JS-injected <style>. Strip them from the CSS
// and load each one with a <link> tag before the style is added.
const remoteImportRe =
  /@import\s*(?:url\(\s*)?['"]?(https?:\/\/[^'")\s]+)['"]?\s*\)?[^;]*;/g;
const styleId = 'cio-checkout-styles';
const remoteImports: string[] = [];

const stripRemoteImports = (css: string): string =>
  css.replace(remoteImportRe, (_, href: string) => {
    if (!remoteImports.includes(href)) remoteImports.push(href);
    return '';
  });

const injectWithLinks = (cssCode: string) =>
  `try{if(typeof document!='undefined'){${JSON.stringify(remoteImports)}.forEach(function(h){var l=document.createElement('link');l.rel='stylesheet';l.href=h;document.head.appendChild(l);});var s=document.createElement('style');s.id='${styleId}';s.appendChild(document.createTextNode(${cssCode}));document.head.appendChild(s);}}catch(e){console.error('vite-plugin-css-injected-by-js',e);}`;

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin({
      styleId,
      preRenderCSSCode: stripRemoteImports,
      injectCode: injectWithLinks,
    }),
  ],
  resolve: {
    alias: {
      '@src': path.resolve(dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(dirname, 'src/bundled.tsx'),
      name: 'CioCheckout',
      fileName: () => 'constructorio-ui-checkout-bundled.js',
      formats: ['umd'],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
