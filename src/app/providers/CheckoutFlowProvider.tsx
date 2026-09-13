import React, { useEffect, useRef } from 'react';

import { CheckoutFlowContext } from '@src/app/providers/CheckoutFlowContext';
import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type { CheckoutFlowConfig, CheckoutFlowCore } from '@src/core/types';

export interface CheckoutFlowProviderProps<
  TState = unknown,
> extends CheckoutFlowConfig<TState> {
  children?: React.ReactNode;
}

// The flow is constructed once per Provider instance and destroyed on unmount.
// Structural config (steps, callbacks, adapters) is captured at construction —
// remount the Provider with a `key` to reconfigure. Cart is reactive via prop.
export function CheckoutFlowProvider<TState = unknown>(
  props: CheckoutFlowProviderProps<TState>
): React.ReactElement {
  const { children, cart, autoStart, ...configRest } = props;
  const flowRef = useRef<CheckoutFlowCore<TState> | null>(null);

  if (flowRef.current === null) {
    flowRef.current = createCheckoutFlow<TState>({
      ...configRest,
      cart,
      autoStart,
    });
  }
  const flow = flowRef.current;

  useEffect(() => {
    return () => {
      flow.destroy();
      flowRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cart === undefined) return;
    flow.setCart(cart);
  }, [cart, flow]);

  useEffect(() => {
    if (!autoStart) return;
    void flow.start();
  }, [autoStart, flow]);

  return (
    <CheckoutFlowContext.Provider value={flow as CheckoutFlowCore<unknown>}>
      {children}
    </CheckoutFlowContext.Provider>
  );
}
