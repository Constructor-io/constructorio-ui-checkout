import { renderToString } from 'react-dom/server';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { useCioPayment } from '@src/app/hooks/useCioPayment';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CioPaymentProvider.name}: server`, () => {
  it('renders without throwing on the server', () => {
    const view = renderToString(
      <CioPaymentProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <span data-testid="child">child</span>
      </CioPaymentProvider>
    );
    expect(view).toContain('child');
  });

  it('CioFlowStep renders nothing on the server when the flow has not started', () => {
    const view = renderToString(
      <CioPaymentProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <CioFlowStep id="cart">
          <span data-testid="cart">cart</span>
        </CioFlowStep>
      </CioPaymentProvider>
    );
    expect(view).not.toContain('data-testid="cart"');
  });

  it('useCioPayment returns state on the server', () => {
    function Probe() {
      const flow = useCioPayment();
      return <div data-status={flow.state.sessionStatus} />;
    }
    const view = renderToString(
      <CioPaymentProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <Probe />
      </CioPaymentProvider>
    );
    expect(view).toContain('data-status="idle"');
  });

  it('does not reference sessionStorage during SSR when no storage adapter given', () => {
    // If any code path touched window.sessionStorage at import or render time,
    // this would fail because the server test setup does not need it — but
    // more importantly, we assert no exception surfaces.
    expect(() =>
      renderToString(
        <CioPaymentProvider
          steps={[{ id: 'cart' }, { id: 'pay' }]}
          onCreateSession={stubSession}
        >
          <span />
        </CioPaymentProvider>
      )
    ).not.toThrow();
  });
});
