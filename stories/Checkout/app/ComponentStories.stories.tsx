import { useRef } from 'react';

import {
  Button,
  ProductCard,
} from '@constructor-io/constructorio-ui-components';
import type { Meta, StoryObj } from '@storybook/react';

import CioCheckout from '@src/app';
import checkoutRegistry from '@src/registry/CheckoutRegistry';
import type { CioCheckoutHandle, CioCheckoutProps } from '@src/types';

import { argTypes } from '../utils/argTypes';

const meta: Meta = {
  title: 'Checkout/CioCheckout',
  component: CioCheckout,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

const demoSession = () =>
  Promise.resolve({
    clientSecret:
      'cs_test_REDACTED_secret_REDACTED',
    publishableKey:
      'pk_test_REDACTED',
  });

// ===================== Playground =====================

interface PlaygroundArgs {
  triggerLabel: string;
  displayMode: 'modal' | 'inline';
  uiMode: 'elements' | 'form';
  layout: 'expanded' | 'compact';
  loader: 'auto' | 'always' | 'never';
  theme: 'stripe' | 'night' | 'flat';
  colorPrimary: string;
  borderRadius: string;
  fontFamily: string;
}

export const Playground: StoryObj<PlaygroundArgs> = {
  parameters: {
    layout: 'padded',
    controls: { disable: false, expanded: true },
  },
  argTypes: argTypes as StoryObj<PlaygroundArgs>['argTypes'],
  args: {
    triggerLabel: 'Pay $49.99',
    displayMode: 'modal',
    uiMode: 'elements',
    layout: 'expanded',
    loader: 'auto',
    theme: 'stripe',
    colorPrimary: '#0f172a',
    borderRadius: '4px',
    fontFamily: 'system-ui, sans-serif',
  },
  render: (args) => (
    <CioCheckout
      triggerLabel={args.triggerLabel}
      displayMode={args.displayMode}
      uiMode={args.uiMode}
      layout={args.layout}
      loader={args.loader}
      appearance={{
        theme: args.theme,
        variables: {
          colorPrimary: args.colorPrimary,
          borderRadius: args.borderRadius,
          fontFamily: args.fontFamily,
        },
      }}
      session={demoSession}
      callbacks={{
        onComplete: (event) => console.log('Payment complete!', event),
        onClose: () => console.log('Checkout closed'),
        onError: (error) => console.error('Checkout error:', error),
      }}
    />
  ),
};

// ===================== Basic Usage =====================

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

// ===================== Display Modes (Modal vs Inline) =====================

export const Modal: Story = {
  name: 'Display Mode: Modal',
  render: () => (
    <CioCheckout
      session={demoSession}
      displayMode="modal"
      triggerLabel="Pay $49.99"
      callbacks={{
        onComplete: (event) => console.log('Complete', event),
        onClose: () => console.log('Closed'),
      }}
    />
  ),
};

export const Inline: Story = {
  name: 'Display Mode: Inline',
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <CioCheckout
        session={demoSession}
        displayMode="inline"
        triggerLabel="Pay $49.99"
        callbacks={{
          onComplete: (event) => console.log('Complete', event),
          onClose: () => console.log('Cancelled'),
        }}
      />
    </div>
  ),
};

// ===================== UI Modes (Elements vs Form) =====================

export const ElementsMode: Story = {
  name: 'UI Mode: Elements (Default)',
  render: () => (
    <CioCheckout
      session={demoSession}
      uiMode="elements"
      triggerLabel="Pay with Card"
      callbacks={{
        onComplete: (event) => console.log('Complete', event),
      }}
    />
  ),
};

export const FormMode: Story = {
  name: 'UI Mode: Form (Beta)',
  render: () => (
    <CioCheckout
      session={demoSession}
      uiMode="form"
      triggerLabel="Pay with Checkout Form"
      callbacks={{
        onComplete: (event) => console.log('Complete', event),
      }}
    />
  ),
};

// ===================== Session Prop Variations =====================

export const SessionFunction: Story = {
  name: 'Session: Async Function',
  render: () => (
    <CioCheckout session={demoSession} triggerLabel="Pay (Async Session)" />
  ),
};

export const SessionDirect: Story = {
  name: 'Session: Direct Object',
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

export const WithRegistry: Story = {
  name: 'Session: Registry Pattern',
  render: () => {
    checkoutRegistry.register(demoSession);
    return <CioCheckout triggerLabel="Pay via Registry - $39.99" />;
  },
};

// ===================== External Handle =====================

const WithImperativeHandle = () => {
  const ref = useRef<CioCheckoutHandle>(null);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Button onClick={() => ref.current?.open()}>Open Checkout</Button>
      <Button onClick={() => ref.current?.close()}>Close</Button>
      <Button onClick={() => ref.current?.reset()}>Reset</Button>
      <CioCheckout
        ref={ref}
        displayMode="inline"
        session={demoSession}
        triggerLabel="Default Trigger"
        callbacks={{
          onComplete: () => console.log('Done!'),
        }}
      />
    </div>
  );
};

export const ImperativeHandle: Story = {
  name: 'Imperative: Open/Close/Reset via Ref',
  render: WithImperativeHandle,
};

// ===================== Trigger Customization =====================

export const CustomTrigger: Story = {
  name: 'Trigger: Custom Element',
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

export const TriggerWhen: Story = {
  name: 'Trigger: Conditional Visibility',
  render: () => (
    <CioCheckout
      session={demoSession}
      uiMode="form"
      triggerLabel="Visible when cart has items"
      triggerWhen={(state) => (state as { count: number }).count > 0}
      triggerState={{ count: 2 }}
    />
  ),
};

// ===================== Multiple Instances =====================

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

// ===================== Styling and Appearance =====================

export const CustomAppearance: Story = {
  name: 'Styling: Custom Appearance',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Styled Checkout"
      appearance={{
        theme: 'stripe',
        variables: {
          colorPrimary: '#0f172a',
          colorBackground: '#f8fafc',
          borderRadius: '8px',
          fontFamily: 'system-ui, sans-serif',
        },
      }}
      callbacks={{
        onComplete: (event) => console.log('Complete', event),
      }}
    />
  ),
};

export const DarkTheme: Story = {
  name: 'Styling: Night Theme',
  render: () => (
    <div style={{ background: '#1e293b', padding: 24, borderRadius: 8 }}>
      <CioCheckout
        session={demoSession}
        triggerLabel="Dark Mode Checkout"
        appearance={{
          theme: 'night',
          variables: {
            colorPrimary: '#818cf8',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  ),
};

export const CustomFonts: Story = {
  name: 'Styling: Custom Fonts',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Custom Font Checkout"
      fonts={[{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter' }]}
      appearance={{
        variables: {
          fontFamily: 'Inter, sans-serif',
        },
      }}
    />
  ),
};

// ===================== Pre-filled Customer =====================

export const PrefilledDetails: Story = {
  name: 'Pre-filled Customer Details',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Checkout (Pre-filled)"
      defaultValues={{
        email: 'jane@example.com',
        billingAddress: {
          name: 'Jane Smith',
          address: {
            country: 'US',
            postal_code: '94103',
            state: 'CA',
            city: 'San Francisco',
            line1: '123 Market St',
          },
        },
      }}
    />
  ),
};

// ===================== Component Overrides =====================

export const CustomPayButton: Story = {
  name: 'Override: Custom Pay Button',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Pay $49.99"
      componentOverrides={{
        payButton: {
          reactNode: (props) => (
            <button
              onClick={props.onClick}
              disabled={props.isDisabled}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 16,
                padding: '12px 24px',
                background: props.isDisabled ? '#94a3b8' : '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: props.isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {props.isSubmitting
                ? 'Processing...'
                : `Complete Purchase ${props.amount}`}
            </button>
          ),
        },
      }}
    />
  ),
};

export const CustomCheckoutStatus: Story = {
  name: 'Override: Custom Checkout Status',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Pay $49.99"
      callbacks={{
        onFulfill: async () => {
          await new Promise((r) => setTimeout(r, 2000));
          return { success: true, message: 'Order #1234 confirmed' };
        },
      }}
      componentOverrides={{
        checkoutStatus: {
          reactNode: (props) => (
            <div style={{ textAlign: 'center', padding: 24 }}>
              {props.fulfillmentStatus === 'pending' && (
                <p>Verifying your order...</p>
              )}
              {props.fulfillmentStatus === 'fulfilled' && (
                <>
                  <p>{props.fulfillmentResult?.message ?? 'Success!'}</p>
                  <button onClick={props.onDismiss}>Done</button>
                </>
              )}
              {props.fulfillmentStatus === 'failed' && (
                <>
                  <p>Verification failed</p>
                  <button onClick={props.onRetry}>Retry</button>
                  <button onClick={props.onDismiss}>Dismiss</button>
                </>
              )}
            </div>
          ),
        },
      }}
    />
  ),
};

// ===================== Localization =====================

export const CustomTranslations: Story = {
  name: 'Translations: Custom Labels',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Acheter"
      translations={{
        'CioCheckout.checkout.title': 'Finaliser la commande',
        'CioCheckout.checkout.cancelLabel': 'Annuler',
        'CioCheckout.checkout.closeLabel': 'Fermer',
        'CioCheckout.checkout.payButtonLabel': 'Payer',
        'CioCheckout.checkout.payButtonLoadingLabel': 'Traitement...',
        'CioCheckout.fulfillment.pending': 'Vérification...',
        'CioCheckout.fulfillment.success': 'Commande confirmée',
        'CioCheckout.fulfillment.dismissLabel': 'Terminé',
      }}
    />
  ),
};

// ===================== Fulfillment Flow =====================

export const WithFulfillment: Story = {
  name: 'Fulfillment: Success Flow',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Pay $49.99"
      callbacks={{
        onComplete: (event) => console.log('Payment complete', event),
        onFulfill: async (event) => {
          console.log('Verifying order...', event.sessionId);
          await new Promise((r) => setTimeout(r, 2000));
          return { success: true, message: 'Order #1234 confirmed!' };
        },
        onFulfillComplete: (event) => {
          console.log('Fulfillment done', event.result);
        },
      }}
    />
  ),
};

export const FulfillmentFailure: Story = {
  name: 'Fulfillment: Failure with Retry',
  render: () => (
    <CioCheckout
      session={demoSession}
      triggerLabel="Pay $49.99"
      callbacks={{
        onFulfill: async () => {
          await new Promise((r) => setTimeout(r, 1500));
          return { success: false, message: 'Could not verify order' };
        },
      }}
    />
  ),
};
