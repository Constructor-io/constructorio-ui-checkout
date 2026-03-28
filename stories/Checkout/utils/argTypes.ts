import type { ArgTypes } from '@storybook/react';

import type { CioCheckoutProps } from '@src/types';

export const argTypes: Partial<ArgTypes<CioCheckoutProps>> = {
  source: {
    description:
      'Discriminated key. "items" = provide items directly, "function" = provide async getter, "session" = provide session fetcher.',
    control: { type: 'select' },
    options: ['items', 'function', 'session'],
    table: {
      type: { summary: "'items' | 'function' | 'session'" },
      defaultValue: { summary: 'items' },
    },
  },
  triggerLabel: {
    description: 'Label for the default checkout button',
    control: 'text',
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: 'Checkout' },
    },
  },
};

export const storiesControls = {
  expanded: true,
  hideNoControlsWarning: true,
};
