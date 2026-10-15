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
          'Introduction',
          'Guides',
          [
            'Integration Guide',
            'Steps',
            'Sessions',
            'Cart',
            'Auth',
            'Events',
            'Custom State',
            'Routing',
            'Persistence',
            'Hook-only Composition',
            'Payment Providers',
          ],
          'Components & Utilities',
          ['CioCheckoutProvider', 'CioFulfillmentStep'],
          'Examples',
        ],
      },
    },
  },
};

export default preview;
