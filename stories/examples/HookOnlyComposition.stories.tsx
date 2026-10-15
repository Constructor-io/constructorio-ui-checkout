import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

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
  title: 'Examples/Hook-only Composition',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The same FakePay checkout built from `useCioCheckout()` and `useCioCheckoutSession()` alone. No `CioCheckoutStep` and no built-in step components. See [Hook-only Composition](?path=/docs/guides-hook-only-composition--docs).',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

function Payment() {
  const flow = useCioCheckout<'fake-pay'>();
  const { session } = useCioCheckoutSession<'fake-pay'>();
  if (!session) return <p role="status">Preparing FakePay...</p>;
  return (
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
  );
}

// One component reads the hook and decides what to render for each step.
function CheckoutScreens() {
  const flow = useCioCheckout<'fake-pay'>();
  const { currentStepId, cartTotal } = flow.state;

  if (currentStepId === null) {
    return (
      <button type="button" onClick={() => void flow.start()}>
        Buy now
      </button>
    );
  }
  if (currentStepId === 'review') {
    return (
      <div>
        <p>Order total: {formatCents(cartTotal)}</p>
        <button type="button" onClick={() => void flow.next()}>
          Go to payment
        </button>
      </div>
    );
  }
  if (currentStepId === PAYMENT_STEP) return <Payment />;
  return <p>Paid. Thank you.</p>;
}

export const HookOnly: Story = {
  name: 'Hook-only flow',
  render: () => (
    <CioCheckoutProvider
      provider="fake-pay"
      steps={[{ id: 'review' }, { id: PAYMENT_STEP }, { id: 'done' }]}
      cart={DEMO_CART}
      onCreateSession={fakePayApi.createSession}
    >
      <CheckoutScreens />
    </CioCheckoutProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Buy now' })
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Go to payment' })
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Pay $113.00' })
    );
    await expect(
      await canvas.findByText('Paid. Thank you.', {}, { timeout: 3000 })
    ).toBeVisible();
  },
};
