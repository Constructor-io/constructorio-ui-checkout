import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        resolve: {
          alias: {
            '@src': path.resolve(dirname, 'src'),
            '@spec': path.resolve(dirname, 'spec'),
            '@stories': path.resolve(dirname, 'stories'),
          },
        },
        test: {
          name: 'unit',
          environment: 'jsdom',
          server: {
            deps: { inline: ['@constructor-io/constructorio-ui-components'] },
          },
          css: false,
          setupFiles: ['./spec/setup.ts', './spec/__mocks__/stripe.tsx'],
          include: ['spec/**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            'stories/**/*.stories.{ts,tsx}',
            'stories/**/*.stories.{js,jsx}',
          ],
          globals: true,
        },
      },
    ],
  },
});
