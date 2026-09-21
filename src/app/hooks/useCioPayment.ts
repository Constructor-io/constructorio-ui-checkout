import { useCallback, useContext } from 'react';

import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { CioPaymentContext } from '@src/app/providers/CioPaymentContext';
import type { CheckoutFlowCore, FlowState } from '@src/core/types';

export type UseCioPaymentReturn<TState = unknown> = CheckoutFlowCore<TState> & {
  state: FlowState;
};

// Context stores CheckoutFlowCore<unknown> for type erasure; the merchant
// asserts TState at the hook boundary. Single documented cast on read.
export function useCioPayment<TState = unknown>(): UseCioPaymentReturn<TState> {
  const untyped = useContext(CioPaymentContext);
  if (!untyped) {
    throw new Error('useCioPayment: must be used inside <CioPaymentProvider>');
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
