import type { Meta, StoryObj } from '@storybook/react';

import { CioFiservPaymentStep } from '@src/app/components/CioFiservPaymentStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';
import type { FiservPaymentSession } from '@src/types';

const neverResolves = () => new Promise<FiservPaymentSession>(() => undefined);
const alwaysFails = () =>
  Promise.reject<FiservPaymentSession>(new Error('Session API down'));

const meta: Meta<typeof CioFiservPaymentStep> = {
  title: 'Components & Utilities/CioFiservPaymentStep',
  component: CioFiservPaymentStep,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CioFiservPaymentStep>;

export const Preparing: Story = {
  name: 'Preparing (loader)',
  render: () => (
    <CioCheckoutProvider
      provider="fiserv"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={neverResolves}
    >
      <CioFiservPaymentStep />
    </CioCheckoutProvider>
  ),
};

export const SessionError: Story = {
  name: 'Session error',
  render: () => (
    <CioCheckoutProvider
      provider="fiserv"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={alwaysFails}
    >
      <CioFiservPaymentStep onError={() => undefined} />
    </CioCheckoutProvider>
  ),
};

export const MissingHandler: Story = {
  name: 'No onCreateSession',
  render: () => (
    <CioCheckoutProvider provider="fiserv" steps={[{ id: PAYMENT_STEP }]}>
      <CioFiservPaymentStep onError={() => undefined} />
    </CioCheckoutProvider>
  ),
};

export const CustomLabels: Story = {
  name: 'Custom labels',
  render: () => (
    <CioCheckoutProvider
      provider="fiserv"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={alwaysFails}
    >
      <CioFiservPaymentStep
        onError={() => undefined}
        translations={{
          'CioCheckout.session.errorLabel': 'We could not start checkout.',
          'CioCheckout.session.retryLabel': 'Try again',
        }}
      />
    </CioCheckoutProvider>
  ),
};
