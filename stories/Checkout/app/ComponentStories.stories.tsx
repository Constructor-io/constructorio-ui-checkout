import type { Meta, StoryObj } from '@storybook/react';

import CioCheckout from '@src/app';
import type { CioCheckoutProps } from '@src/types';

import { argTypes, storiesControls } from '../utils/argTypes';
import { DEMO_PUBLISHABLE_KEY, DEMO_SESSION_URL } from '../utils/constants';

const meta: Meta<typeof CioCheckout> = {
  title: 'Checkout/CioCheckout',
  component: CioCheckout,
  parameters: {
    controls: storiesControls,
  },
  argTypes,
};

export default meta;

type Story = StoryObj<typeof CioCheckout>;

// ---------- Single Item (PIA-style per-item checkout) ----------

export const SingleItem: Story = {
  args: {
    source: 'items',
    items: {
      name: 'Premium Rug Pad',
      amountCents: 4999,
      currency: 'usd',
    },
    sessionUrl: DEMO_SESSION_URL,
    publishableKey: DEMO_PUBLISHABLE_KEY,
    triggerLabel: 'Buy Now - $49.99',
    callbacks: {
      onComplete: () => {
        console.log('Payment complete!');
      },
      onError: (error) => {
        console.error('Checkout error:', error);
      },
    },
  },
};

// ---------- Cart (multiple items) ----------

export const Cart: Story = {
  args: {
    source: 'items',
    items: [
      { name: 'Premium Rug Pad', amountCents: 4999, quantity: 1 },
      { name: 'Wool Area Rug 5x8', amountCents: 19999, quantity: 1 },
      { name: 'Rug Gripper Tape', amountCents: 1299, quantity: 2 },
    ],
    sessionUrl: DEMO_SESSION_URL,
    publishableKey: DEMO_PUBLISHABLE_KEY,
    triggerLabel: 'Checkout Cart - $285.96',
    callbacks: {
      onComplete: () => {
        console.log('Cart payment complete!');
      },
    },
  },
};

// ---------- Dynamic items via function ----------

export const DynamicItems: Story = {
  args: {
    source: 'function',
    getItems: async () => {
      // Simulates fetching cart items from an API
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
      return [
        { name: 'Dynamically Fetched Item', amountCents: 2500, quantity: 1 },
      ];
    },
    sessionUrl: DEMO_SESSION_URL,
    publishableKey: DEMO_PUBLISHABLE_KEY,
    triggerLabel: 'Checkout (Dynamic)',
    callbacks: {
      onComplete: () => {
        console.log('Dynamic payment complete!');
      },
    },
  },
};

// ---------- Session source (full control) ----------

export const SessionSource: Story = {
  args: {
    source: 'session',
    fetchSession: async () => {
      // In a real integration, this calls your backend
      console.log('Fetching session from custom endpoint...');
      return {
        clientSecret: 'cs_test_REPLACE_ME',
        publishableKey: DEMO_PUBLISHABLE_KEY,
      };
    },
    triggerLabel: 'Pay with Session',
    callbacks: {
      onComplete: () => {
        console.log('Session payment complete!');
      },
    },
  },
};

// ---------- Custom trigger ----------

function CustomTriggerTemplate(args: CioCheckoutProps) {
  return (
    <CioCheckout
      {...args}
      trigger={
        <div
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '8px',
            fontWeight: 600,
            textAlign: 'center',
          }}>
          Custom Checkout Button
        </div>
      }
    />
  );
}

export const CustomTrigger: Story = {
  args: {
    source: 'items',
    items: { name: 'Premium Rug Pad', amountCents: 4999 },
    sessionUrl: DEMO_SESSION_URL,
    publishableKey: DEMO_PUBLISHABLE_KEY,
  },
  render: (args) => <CustomTriggerTemplate {...args} />,
};
