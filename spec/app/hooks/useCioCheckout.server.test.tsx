import { renderToString } from 'react-dom/server';

import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${useCioCheckout.name}: server`, () => {
  it('returns initial flow state on the server when wrapped in Provider', () => {
    let captured: ReturnType<typeof useCioCheckout> | undefined;
    function Probe() {
      captured = useCioCheckout();
      return null;
    }
    renderToString(
      <CioCheckoutProvider provider="stripe"
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <Probe />
      </CioCheckoutProvider>
    );
    expect(captured).toBeDefined();
    expect(captured?.state.currentStepId).toBeNull();
    expect(captured?.state.sessionStatus).toBe('idle');
  });
});
