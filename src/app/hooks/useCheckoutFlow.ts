import { useCallback, useContext, useSyncExternalStore } from 'react';

import { CheckoutFlowContext } from '@src/app/providers/CheckoutFlowContext';
import type { CheckoutFlowCore, FlowState } from '@src/core/types';

export type UseCheckoutFlowReturn<TState = unknown> =
  CheckoutFlowCore<TState> & { state: FlowState };

// Context stores CheckoutFlowCore<unknown> for type erasure; the merchant
// asserts TState at the hook boundary. Single documented cast on read.
export function useCheckoutFlow<
  TState = unknown,
>(): UseCheckoutFlowReturn<TState> {
  const untyped = useContext(CheckoutFlowContext);
  if (!untyped) {
    throw new Error(
      'useCheckoutFlow: must be used inside <CheckoutFlowProvider>'
    );
  }
  const flow = untyped as CheckoutFlowCore<TState>;
  const subscribe = useCallback(
    (listener: () => void) => flow.subscribe(listener),
    [flow]
  );
  const getSnapshot = useCallback(() => flow.getState(), [flow]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...flow, state };
}
