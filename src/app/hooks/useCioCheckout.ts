import { useCallback, useContext } from 'react';

import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { CioCheckoutContext } from '@src/app/providers/CioCheckoutContext';
import type { CheckoutFlowCore, CheckoutFlowState } from '@src/core/types';
import type { BaseCartItem, BuiltInPaymentProvider } from '@src/types';

export type UseCioCheckoutReturn<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
  TItem = BaseCartItem,
> = CheckoutFlowCore<TProvider, TState, TItem> & {
  state: CheckoutFlowState<TItem>;
};

export function useCioCheckout<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
  TItem = BaseCartItem,
>(): UseCioCheckoutReturn<TProvider, TState, TItem> {
  const base = useContext(CioCheckoutContext);
  if (!base) {
    throw new Error(
      'useCioCheckout: must be used inside <CioCheckoutProvider>'
    );
  }
  const flow = base as CheckoutFlowCore<TProvider, TState, TItem>;
  const subscribe = useCallback(
    (listener: () => void) => flow.subscribe(listener),
    [flow]
  );
  const getSnapshot = useCallback(() => flow.getState(), [flow]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...flow, state };
}
