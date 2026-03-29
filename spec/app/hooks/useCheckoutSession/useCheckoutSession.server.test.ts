import { renderHookServerSide } from '@spec/__tests__/utils.server';
import * as factories from '@spec/factory';

import useCheckoutSession from '@src/app/hooks/useCheckoutSession';
import type { CioCheckoutProps } from '@src/types';

describe(`${useCheckoutSession.name}: server`, () => {
  const props: CioCheckoutProps = factories.checkoutProps.build();

  it('returns initial state on the server', () => {
    const { result } = renderHookServerSide(() => useCheckoutSession(props), {
      initialProps: props,
    });

    expect(result.isOpen).toBe(false);
    expect(result.isLoading).toBe(false);
    expect(result.session).toBeNull();
    expect(result.error).toBeNull();
  });
});
