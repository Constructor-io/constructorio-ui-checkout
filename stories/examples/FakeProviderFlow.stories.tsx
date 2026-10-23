import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import { CioFulfillmentStep } from '@src/app/components/CioFulfillmentStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { useCioCheckoutSession } from '@src/app/hooks/useCioCheckoutSession';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';

import {
  DEMO_CART,
  fakePayApi,
  type FakePaySession,
  FakePayWidget,
  formatCents,
} from './fakePay';

const meta: Meta = {
  title: 'Examples/Full Flow with a Custom Provider',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A complete flow with a fake provider named FakePay: cart, payment, fulfillment and a done screen. It runs with no network. The [Custom Payment Provider](?path=/docs/guides-custom-payment-provider--docs) guide walks through the same code.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

function StartButton() {
  const flow = useCioCheckout();
  if (flow.state.currentStepId !== null) return null;
  return (
    <button type="button" onClick={() => void flow.start()}>
      Start checkout
    </button>
  );
}

function CartStep() {
  const flow = useCioCheckout();
  return (
    <div>
      <h3>Cart</h3>
      <ul>
        {flow.state.cartSnapshot.map((item) => (
          <li key={item.id}>
            {item.name} x {item.quantity}
          </li>
        ))}
      </ul>
      <p>Subtotal: {formatCents(flow.state.cartTotal)}</p>
      <button type="button" onClick={() => void flow.next()}>
        Continue to payment
      </button>
    </div>
  );
}

function FakePayPaymentStep() {
  const flow = useCioCheckout<'fake-pay'>();
  const { session, sessionStatus, retry } = useCioCheckoutSession<'fake-pay'>();

  if (sessionStatus === 'error') {
    return (
      <div role="alert">
        <p>Could not start FakePay.</p>
        <button type="button" onClick={() => void retry()}>
          Retry
        </button>
      </div>
    );
  }
  if (!session) return <p role="status">Preparing FakePay...</p>;

  return (
    <div>
      <h3>Payment</h3>
      <FakePayWidget
        session={session as FakePaySession}
        amount={flow.state.cartTotal}
        onSubmit={() => flow.setPaymentInProgress(true)}
        onSuccess={() => {
          flow.setPaymentInProgress(false);
          void flow.next();
        }}
        onFailure={(error) => {
          flow.setPaymentInProgress(false);
          flow.emitError('payment.confirm', error);
        }}
      />
      <button
        type="button"
        onClick={() => void flow.back()}
        disabled={flow.state.paymentInProgress}
      >
        Back to cart
      </button>
    </div>
  );
}

function DoneStep() {
  const flow = useCioCheckout();
  return (
    <div>
      <h3>Thank you</h3>
      <button type="button" onClick={() => void flow.clearState()}>
        Start over
      </button>
    </div>
  );
}

export function FakePayCheckout() {
  return (
    <CioCheckoutProvider
      provider="fake-pay"
      steps={[
        { id: 'cart' },
        { id: PAYMENT_STEP },
        { id: 'fulfill' },
        { id: 'done' },
      ]}
      cart={DEMO_CART}
      onCreateSession={fakePayApi.createSession}
    >
      <StartButton />
      <CioCheckoutStep id="cart">
        <CartStep />
      </CioCheckoutStep>
      <CioCheckoutStep id={PAYMENT_STEP}>
        <FakePayPaymentStep />
      </CioCheckoutStep>
      <CioCheckoutStep id="fulfill">
        <CioFulfillmentStep
          onFulfill={fakePayApi.verifyOrder}
          recreateSessionOnRetry
        />
      </CioCheckoutStep>
      <CioCheckoutStep id="done">
        <DoneStep />
      </CioCheckoutStep>
    </CioCheckoutProvider>
  );
}

export const FullFlow: Story = {
  name: 'Full flow',
  render: () => <FakePayCheckout />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Start checkout' })
    );
    await expect(await canvas.findByText('Subtotal: $113.00')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Continue to payment' })
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Pay $113.00' })
    );
    await expect(
      await canvas.findByText('Thank you', {}, { timeout: 3000 })
    ).toBeVisible();
  },
};
