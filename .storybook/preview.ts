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
          'Getting Started',
          ['Introduction', 'Integration Guide', 'Hook-only Composition'],
          'Core',
          ['Steps', 'Sessions', 'Cart', 'Auth', 'Events', 'Custom State'],
          'Adapters',
          ['Routing', 'Persistence'],
          'Components',
          'Hooks',
        ],
      },
    },
  },
};

export default preview;
