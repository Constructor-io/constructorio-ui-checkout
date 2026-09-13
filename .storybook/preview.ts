import type { Preview } from '@storybook/react-vite';

import './storybook-styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'General',
          ['Introduction', 'Integration Guide', 'Routing'],
          'Components',
          'Hooks',
        ],
      },
    },
  },
};

export default preview;
