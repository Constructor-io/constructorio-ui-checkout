import { renderToString } from 'react-dom/server';

import { useCioPayment } from '@src/app/hooks/useCioPayment';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${useCioPayment.name}: server`, () => {
  it('returns initial flow state on the server when wrapped in Provider', () => {
    let captured: ReturnType<typeof useCioPayment> | undefined;
    function Probe() {
      captured = useCioPayment();
      return null;
    }
    renderToString(
      <CioPaymentProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <Probe />
      </CioPaymentProvider>
    );
    expect(captured).toBeDefined();
    expect(captured?.state.currentStepId).toBeNull();
    expect(captured?.state.sessionStatus).toBe('idle');
  });
});
