import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-onboarding',
    '@chromatic-com/storybook',
  ],
  framework: '@storybook/react-vite',
  viteFinal: (config) => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@src': path.resolve(dirname, '../src'),
      '@stories': path.resolve(dirname, '../stories'),
    };
    return config;
  },
};
export default config;
