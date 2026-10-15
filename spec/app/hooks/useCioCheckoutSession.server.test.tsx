import { renderToString } from 'react-dom/server';

import { useCioCheckoutSession } from '@src/app/hooks/useCioCheckoutSession';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

function Probe() {
  const { sessionStatus } = useCioCheckoutSession();
  return <span>{sessionStatus}</span>;
}

describe(`${useCioCheckoutSession.name}: server`, () => {
  it('is safe to render server-side', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'payment' }]}
        onCreateSession={stubSession}
      >
        <Probe />
      </CioCheckoutProvider>
    );
    expect(view).toContain('idle');
  });
});
