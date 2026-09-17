import { renderToString } from 'react-dom/server';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CheckoutFlowProvider.name}: server`, () => {
  it('renders without throwing on the server', () => {
    const view = renderToString(
      <CheckoutFlowProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <span data-testid="child">child</span>
      </CheckoutFlowProvider>
    );
    expect(view).toContain('child');
  });

  it('CheckoutFlowStep renders nothing on the server when the flow has not started', () => {
    const view = renderToString(
      <CheckoutFlowProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <CheckoutFlowStep id="cart">
          <span data-testid="cart">cart</span>
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );
    expect(view).not.toContain('data-testid="cart"');
  });

  it('useCheckoutFlow returns state on the server', () => {
    function Probe() {
      const flow = useCheckoutFlow();
      return <div data-status={flow.state.sessionStatus} />;
    }
    const view = renderToString(
      <CheckoutFlowProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <Probe />
      </CheckoutFlowProvider>
    );
    expect(view).toContain('data-status="idle"');
  });

  it('does not reference sessionStorage during SSR when no storage adapter given', () => {
    // If any code path touched window.sessionStorage at import or render time,
    // this would fail because the server test setup does not need it — but
    // more importantly, we assert no exception surfaces.
    expect(() =>
      renderToString(
        <CheckoutFlowProvider
          steps={[{ id: 'cart' }, { id: 'pay' }]}
          onCreateSession={stubSession}
        >
          <span />
        </CheckoutFlowProvider>
      )
    ).not.toThrow();
  });
});
