import { ProductCard } from '@constructor-io/constructorio-ui-components';
import type { Meta, StoryObj } from '@storybook/react';

import CioCheckout from '@src/app';
import checkoutRegistry from '@src/registry/CheckoutRegistry';
import type { CioCheckoutProps } from '@src/types';

import { storiesControls } from '../utils/argTypes';

const meta: Meta = {
  title: 'Checkout/CioCheckout',
  component: CioCheckout,
  parameters: {
    controls: storiesControls,
  },
};

export default meta;

type Story = StoryObj;

// Demo session function — replace with a real backend call
const demoSession = () =>
  Promise.resolve({
    clientSecret:
      'cs_test_SECRET_REPLACE_secret_1234567890abcdefg',
    publishableKey:
      'pk_test_REPLACE_1234567890abcdefg',
  });

// ---------- Single Item ----------

const singleItemProps: CioCheckoutProps = {
  items: {
    name: 'Premium Rug Pad',
    amount: 49.99,
    currencySign: '$',
  },
  session: demoSession,
  triggerLabel: 'Buy Now - $49.99',
  callbacks: {
    onComplete: (event) => {
      console.log('Payment complete!', event);
    },
    onError: (error: Error) => {
      console.error('Checkout error:', error);
    },
  },
};

export const SingleItem: Story = {
  render: () => <CioCheckout {...singleItemProps} />,
};

// ---------- Cart ----------

const cartProps: CioCheckoutProps = {
  items: [
    { name: 'Premium Rug Pad', amount: 49.99, quantity: 1 },
    { name: 'Wool Area Rug 5x8', amount: 199.99, quantity: 1 },
    { name: 'Rug Gripper Tape', amount: 12.99, quantity: 2 },
  ],
  session: demoSession,
  triggerLabel: 'Checkout Cart - $285.96',
};

export const Cart: Story = {
  render: () => <CioCheckout {...cartProps} />,
};

// ---------- Dynamic items (function) ----------

const dynamicItemsProps: CioCheckoutProps = {
  items: async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    return [{ name: 'Dynamically Fetched Item', amount: 25.0, quantity: 1 }];
  },
  session: demoSession,
  triggerLabel: 'Checkout (Dynamic)',
};

export const DynamicItems: Story = {
  render: () => <CioCheckout {...dynamicItemsProps} />,
};

// ---------- Session function ----------

export const SessionFunction: Story = {
  render: () => (
    <CioCheckout
      session={() =>
        Promise.resolve({
          clientSecret: 'cs_test_REPLACE_ME',
          publishableKey: 'pk_test_REPLACE_ME',
        })
      }
      triggerLabel="Pay with Session"
    />
  ),
};

// ---------- Session response directly ----------

export const SessionDirect: Story = {
  render: () => (
    <CioCheckout
      items={{ name: 'Direct Session Item', amount: 9.99 }}
      session={{
        clientSecret: 'cs_test_REPLACE_ME',
        publishableKey: 'pk_test_REPLACE_ME',
      }}
      triggerLabel="Pay (Direct Session)"
    />
  ),
};

// ---------- Multiple Items (each with its own session) ----------

export const MultipleProducts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <CioCheckout
        items={{ name: 'Rug Pad', amount: 49.99 }}
        session={demoSession}
        triggerLabel="Buy Rug Pad - $49.99"
      />
      <CioCheckout
        items={{ name: 'Area Rug', amount: 199.99 }}
        session={demoSession}
        triggerLabel="Buy Area Rug - $199.99"
      />
      <CioCheckout
        items={{ name: 'Gripper Tape', amount: 12.99 }}
        session={demoSession}
        triggerLabel="Buy Gripper - $12.99"
      />
    </div>
  ),
};

// ---------- Registry pattern ----------

export const WithRegistry: Story = {
  render: () => {
    checkoutRegistry.register(demoSession);

    return (
      <CioCheckout
        items={{ name: 'Registry Item', amount: 39.99 }}
        triggerLabel="Buy via Registry - $39.99"
      />
    );
  },
};

// ---------- Custom trigger ----------

export const CustomTrigger: Story = {
  render: () => (
    <CioCheckout
      items={{ name: 'Premium Rug Pad', amount: 49.99 }}
      session={demoSession}
      trigger={
        <ProductCard
          product={{
            id: 'rug-pad-001',
            name: 'Premium Rug Pad',
            price: 49.99,
            imageUrl: 'https://placehold.co/300x300/e2e8f0/475569?text=Rug+Pad',
            description: 'Non-slip cushioned rug pad for any surface',
          }}
          priceCurrency="$"
          addToCartText="Buy Now"
        />
      }
    />
  ),
};

// ---------- Inline Mode ----------

export const InlineMode: Story = {
  render: () => (
    <CioCheckout
      items={{ name: 'Premium Rug Pad', amount: 49.99 }}
      session={demoSession}
      triggerLabel="Buy Now - $49.99"
      displayMode="inline"
      callbacks={{
        onComplete: (event) => {
          console.log('Payment complete!', event);
        },
        onClose: () => {
          console.log('Checkout cancelled');
        },
      }}
    />
  ),
};

// ---------- triggerWhen ----------

export const WithTriggerWhen: Story = {
  render: () => (
    <CioCheckout
      items={{ name: 'Conditional Item', amount: 19.99 }}
      session={demoSession}
      triggerLabel="Conditionally Visible"
      triggerWhen={() => true}
    />
  ),
};
