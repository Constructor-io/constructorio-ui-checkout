import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
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
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.resolve(dirname, '.storybook'),
          }),
        ],
        resolve: {
          alias: {
            '@src': path.resolve(dirname, 'src'),
            '@stories': path.resolve(dirname, 'stories'),
          },
        },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
