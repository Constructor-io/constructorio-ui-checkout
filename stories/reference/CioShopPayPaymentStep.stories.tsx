import type { Meta, StoryObj } from '@storybook/react';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import { CioShopPayPaymentStep } from '@src/app/components/CioShopPayPaymentStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';
import type {
  ShopPayPaymentRequest,
  ShopPaySdk,
  ShopPaySdkSession,
} from '@src/types';

const money = (amount: number) => ({ amount, currencyCode: 'USD' });

const paymentRequest: ShopPayPaymentRequest = {
  lineItems: [
    {
      label: 'Linen shirt',
      quantity: 1,
      originalItemPrice: money(49.99),
      finalItemPrice: money(49.99),
      originalLinePrice: money(49.99),
      finalLinePrice: money(49.99),
      requiresShipping: true,
    },
  ],
  shippingLines: [],
  deliveryMethods: [],
  totalShippingPrice: { finalTotal: money(0) },
  discountCodes: [],
  subtotal: money(49.99),
  total: money(49.99),
  locale: 'en',
  presentmentCurrency: 'USD',
};

// Shopify's real SDK only renders on the store's allowed origins, so these
// stories install a stand-in. Its button runs the popup's events in order.
function installFakeSdk({ failConfigure = false } = {}) {
  let session: (ShopPaySdkSession & { emit: (name: string) => void }) | null =
    null;
  const sdk: ShopPaySdk = {
    PaymentRequest: {
      configure: () => {
        if (failConfigure) throw new Error('Shop Pay is not available');
      },
      build: (request) => request,
      createSession: () => {
        const listeners = new Map<string, (event: unknown) => unknown>();
        const next = {
          addEventListener: (
            name: string,
            listener: (event: unknown) => unknown
          ) => {
            listeners.set(name, listener);
          },
          emit: (name: string) => void listeners.get(name)?.({}),
          completeSessionRequest: () =>
            next.emit('paymentconfirmationrequested'),
          completeShippingAddressChange: () => undefined,
          completeDeliveryMethodChange: () => undefined,
          completePaymentConfirmationRequest: () =>
            next.emit('paymentcomplete'),
          close: () => undefined,
        };
        session = next;
        return next;
      },
      createButton: () => ({
        render: (selector: string) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Buy with Shop (fake)';
          button.onclick = () => session?.emit('sessionrequested');
          document.querySelector(selector)?.replaceChildren(button);
        },
      }),
    },
  };
  window.ShopPay = sdk;
}

const sessionResponse = {
  token: 'fake-session',
  checkoutUrl: 'https://shop.app/checkout/fake',
  sourceIdentifier: 'fake-source',
};

const meta: Meta<typeof CioShopPayPaymentStep> = {
  title: 'Components & Utilities/CioShopPayPaymentStep',
  component: CioShopPayPaymentStep,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CioShopPayPaymentStep>;

export const Ready: Story = {
  name: 'Ready (fake SDK)',
  render: () => {
    installFakeSdk();
    return (
      <CioCheckoutProvider
        provider="shop-pay"
        steps={[{ id: PAYMENT_STEP }, { id: 'done' }]}
        autoStart
      >
        <CioCheckoutStep id={PAYMENT_STEP}>
          <CioShopPayPaymentStep
            shopId="1"
            clientId="fake"
            paymentRequest={paymentRequest}
            onSessionRequest={() => Promise.resolve(sessionResponse)}
            onSubmitPayment={() => Promise.resolve('fake-receipt')}
            onCheckReceipt={() =>
              new Promise((resolve) => {
                setTimeout(() => resolve({ state: 'completed' }), 1500);
              })
            }
          />
        </CioCheckoutStep>
        <CioCheckoutStep id="done">
          <p>Order placed.</p>
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );
  },
};

export const PaymentFailed: Story = {
  name: 'Payment failed',
  render: () => {
    installFakeSdk();
    return (
      <CioCheckoutProvider
        provider="shop-pay"
        steps={[{ id: PAYMENT_STEP }]}
        autoStart
      >
        <CioShopPayPaymentStep
          shopId="1"
          clientId="fake"
          paymentRequest={paymentRequest}
          onSessionRequest={() => Promise.resolve(sessionResponse)}
          onSubmitPayment={() => Promise.resolve('fake-receipt')}
          onCheckReceipt={() =>
            Promise.resolve({ state: 'failed', message: 'Card declined.' })
          }
          onError={() => undefined}
        />
      </CioCheckoutProvider>
    );
  },
};

export const LoadError: Story = {
  name: 'SDK error',
  render: () => {
    installFakeSdk({ failConfigure: true });
    return (
      <CioCheckoutProvider provider="shop-pay" steps={[{ id: PAYMENT_STEP }]}>
        <CioShopPayPaymentStep
          shopId="1"
          clientId="fake"
          paymentRequest={paymentRequest}
          onSessionRequest={() => Promise.resolve(sessionResponse)}
          onSubmitPayment={() => Promise.resolve('fake-receipt')}
          onCheckReceipt={() => Promise.resolve({ state: 'completed' })}
          onError={() => undefined}
        />
      </CioCheckoutProvider>
    );
  },
};

export const CustomLabels: Story = {
  name: 'Custom labels',
  render: () => {
    installFakeSdk({ failConfigure: true });
    return (
      <CioCheckoutProvider provider="shop-pay" steps={[{ id: PAYMENT_STEP }]}>
        <CioShopPayPaymentStep
          shopId="1"
          clientId="fake"
          paymentRequest={paymentRequest}
          onSessionRequest={() => Promise.resolve(sessionResponse)}
          onSubmitPayment={() => Promise.resolve('fake-receipt')}
          onCheckReceipt={() => Promise.resolve({ state: 'completed' })}
          onError={() => undefined}
          translations={{
            'CioCheckout.session.errorLabel': 'Shop Pay is unavailable.',
            'CioCheckout.session.retryLabel': 'Try again',
          }}
        />
      </CioCheckoutProvider>
    );
  },
};
