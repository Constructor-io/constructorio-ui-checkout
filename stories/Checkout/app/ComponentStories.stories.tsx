import { ProductCard } from '@constructor-io/constructorio-ui-components';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
    clientSecret: 'cs_test_SECRET_REPLACE_secret_1234567890abcdefg',
    publishableKey: 'pk_test_REPLACE_1234567890abcdefg',
  });

// ---------- Basic ----------

const basicProps: CioCheckoutProps = {
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

export const Basic: Story = {
  render: () => <CioCheckout {...basicProps} />,
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
      session={{
        clientSecret: 'cs_test_REPLACE_ME',
        publishableKey: 'pk_test_REPLACE_ME',
      }}
      triggerLabel="Pay (Direct Session)"
    />
  ),
};

// ---------- Multiple Products (each with its own session) ----------

export const MultipleProducts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <CioCheckout session={demoSession} triggerLabel="Buy Rug Pad - $49.99" />
      <CioCheckout
        session={demoSession}
        triggerLabel="Buy Area Rug - $199.99"
      />
      <CioCheckout session={demoSession} triggerLabel="Buy Gripper - $12.99" />
    </div>
  ),
};

// ---------- Registry pattern ----------

export const WithRegistry: Story = {
  render: () => {
    checkoutRegistry.register(demoSession);

    return <CioCheckout triggerLabel="Buy via Registry - $39.99" />;
  },
};

// ---------- Custom trigger ----------

export const CustomTrigger: Story = {
  render: () => (
    <CioCheckout
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
      session={demoSession}
      triggerLabel="Conditionally Visible"
      triggerWhen={() => true}
    />
  ),
};
