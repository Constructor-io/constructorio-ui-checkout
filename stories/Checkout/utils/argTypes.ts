export const argTypes = {
  triggerLabel: {
    description: 'Label for the default checkout trigger button',
    control: 'text',
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: 'Checkout' },
    },
  },
  displayMode: {
    description: 'Render checkout in a modal dialog or inline in the page',
    control: 'radio',
    options: ['modal', 'inline'],
    table: {
      type: { summary: "'modal' | 'inline'" },
      defaultValue: { summary: 'modal' },
    },
  },
  uiMode: {
    description:
      'Stripe surface: "elements" (GA, full customization) or "form" (beta, Stripe-managed UI)',
    control: 'radio',
    options: ['elements', 'form'],
    table: {
      type: { summary: "'elements' | 'form'" },
      defaultValue: { summary: 'elements' },
    },
  },
  layout: {
    description:
      'Payment method layout for form mode: "expanded" shows all methods open, "compact" uses an accordion',
    control: 'radio',
    options: ['expanded', 'compact'],
    table: {
      type: { summary: "'expanded' | 'compact'" },
      defaultValue: { summary: 'expanded' },
    },
  },
  loader: {
    description: 'Controls skeleton loading UI while Stripe elements mount',
    control: 'select',
    options: ['auto', 'always', 'never'],
    table: {
      type: { summary: "'auto' | 'always' | 'never'" },
      defaultValue: { summary: 'auto' },
    },
  },
  theme: {
    description: 'Stripe Appearance API theme preset',
    control: 'select',
    options: ['stripe', 'night', 'flat'],
    table: {
      type: { summary: "'stripe' | 'night' | 'flat'" },
      defaultValue: { summary: 'stripe' },
    },
  },
  colorPrimary: {
    description: 'Primary color for buttons and accents',
    control: 'color',
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: '#0f172a' },
    },
  },
  borderRadius: {
    description: 'Border radius for Stripe form elements',
    control: 'text',
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: '4px' },
    },
  },
  fontFamily: {
    description: 'Font family for Stripe form elements',
    control: 'text',
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: 'system-ui, sans-serif' },
    },
  },
};

export const storiesControls = {
  expanded: true,
  hideNoControlsWarning: true,
};
