import { renderToString } from 'react-dom/server';

import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${useCheckoutFlow.name}: server`, () => {
  it('returns initial flow state on the server when wrapped in Provider', () => {
    let captured: ReturnType<typeof useCheckoutFlow> | undefined;
    function Probe() {
      captured = useCheckoutFlow();
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
