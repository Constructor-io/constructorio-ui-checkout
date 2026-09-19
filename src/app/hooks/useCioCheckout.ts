import { useCallback, useContext } from 'react';

import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { CioCheckoutContext } from '@src/app/providers/CioCheckoutContext';
import type { CheckoutFlowCore, FlowState } from '@src/core/types';
import type { BuiltInPaymentProvider } from '@src/types';

export type UseCioCheckoutReturn<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
> = CheckoutFlowCore<TProvider, TState> & {
  state: FlowState;
};

export function useCioCheckout<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
>(): UseCioCheckoutReturn<TProvider, TState> {
  const untyped = useContext(CioCheckoutContext);
  if (!untyped) {
    throw new Error('useCioCheckout: must be used inside <CioCheckoutProvider>');
  }
  const flow = untyped as unknown as CheckoutFlowCore<TProvider, TState>;
  const subscribe = useCallback(
    (listener: () => void) => flow.subscribe(listener),
    [flow]
  );
  const getSnapshot = useCallback(() => flow.getState(), [flow]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...flow, state };
}
