import { renderToString } from 'react-dom/server';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CioCheckoutProvider.name}: server`, () => {
  it('renders without throwing on the server', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <span data-testid="child">child</span>
      </CioCheckoutProvider>
    );
    expect(view).toContain('child');
  });

  it('CioFlowStep renders nothing on the server when the flow has not started', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <CioFlowStep id="cart">
          <span data-testid="cart">cart</span>
        </CioFlowStep>
      </CioCheckoutProvider>
    );
    expect(view).not.toContain('data-testid="cart"');
  });

  it('useCioCheckout returns state on the server', () => {
    function Probe() {
      const flow = useCioCheckout();
      return <div data-status={flow.state.sessionStatus} />;
    }
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <Probe />
      </CioCheckoutProvider>
    );
    expect(view).toContain('data-status="idle"');
  });

  it('does not reference sessionStorage during SSR when no storage adapter given', () => {
    // If any code path touched window.sessionStorage at import or render time,
    // this would fail because the server test setup does not need it — but
    // more importantly, we assert no exception surfaces.
    expect(() =>
      renderToString(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: 'cart' }, { id: 'pay' }]}
          onCreateSession={stubSession}
        >
          <span />
        </CioCheckoutProvider>
      )
    ).not.toThrow();
  });
});
