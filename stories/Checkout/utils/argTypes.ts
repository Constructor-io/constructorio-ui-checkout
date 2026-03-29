export const argTypes = {
  triggerLabel: {
    description: 'Label for the default checkout button',
    control: 'text',
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: 'Checkout' },
    },
  },
  displayMode: {
    description: 'How the checkout UI is displayed',
    control: 'radio',
    options: ['modal', 'inline'],
    table: {
      type: { summary: "'modal' | 'inline'" },
      defaultValue: { summary: 'modal' },
    },
  },
};

export const storiesControls = {
  expanded: true,
  hideNoControlsWarning: true,
};
