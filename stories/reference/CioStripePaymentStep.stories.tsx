import type { Meta, StoryObj } from '@storybook/react';

import { CioStripePaymentStep } from '@src/app/components/CioStripePaymentStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';
import type { StripePaymentSession } from '@src/types';

const neverResolves = () => new Promise<StripePaymentSession>(() => undefined);
const alwaysFails = () =>
  Promise.reject<StripePaymentSession>(new Error('Session API down'));

const meta: Meta<typeof CioStripePaymentStep> = {
  title: 'Components & Utilities/CioStripePaymentStep',
  component: CioStripePaymentStep,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CioStripePaymentStep>;

export const Preparing: Story = {
  name: 'Preparing (loader)',
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={neverResolves}
    >
      <CioStripePaymentStep />
    </CioCheckoutProvider>
  ),
};

export const SessionError: Story = {
  name: 'Session error',
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={alwaysFails}
    >
      <CioStripePaymentStep onError={() => undefined} />
    </CioCheckoutProvider>
  ),
};

export const MissingHandler: Story = {
  name: 'No onCreateSession',
  render: () => (
    <CioCheckoutProvider provider="stripe" steps={[{ id: PAYMENT_STEP }]}>
      <CioStripePaymentStep onError={() => undefined} />
    </CioCheckoutProvider>
  ),
};

export const CustomLabels: Story = {
  name: 'Custom labels',
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={alwaysFails}
    >
      <CioStripePaymentStep
        onError={() => undefined}
        translations={{
          'CioCheckout.session.errorLabel': 'We could not start checkout.',
          'CioCheckout.session.retryLabel': 'Try again',
        }}
      />
    </CioCheckoutProvider>
  ),
};

export const CustomLoader: Story = {
  name: 'Custom loader',
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={neverResolves}
    >
      <CioStripePaymentStep
        componentOverrides={{
          loader: {
            reactNode: ({ label }) => (
              <div role="status" style={{ padding: 24, fontStyle: 'italic' }}>
                {label} (custom loader)
              </div>
            ),
          },
        }}
      />
    </CioCheckoutProvider>
  ),
};
