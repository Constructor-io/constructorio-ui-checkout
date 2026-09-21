import React, { useEffect, useRef } from 'react';

import { CioCheckoutContext } from '@src/app/providers/CioCheckoutContext';
import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type {
  CheckoutFlowConfig,
  CheckoutFlowCore,
  CheckoutFlowState,
  CheckoutRouterAdapter,
  CheckoutStep,
  RequireAccessorsIfNeeded,
} from '@src/core/types';
import type { BaseCartItem, BuiltInPaymentProvider } from '@src/types';

import '@src/styles.css';

export type CioCheckoutProviderProps<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
  TItem = BaseCartItem,
> = React.PropsWithChildren<
  Omit<CheckoutFlowConfig<TProvider, TState, TItem>, 'cartItemFields'> &
    RequireAccessorsIfNeeded<TItem>
>;

export function CioCheckoutProvider<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
  TItem = BaseCartItem,
>(
  props: CioCheckoutProviderProps<TProvider, TState, TItem>
): React.ReactElement {
  const { children, cart } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const flowRef = useRef<CheckoutFlowCore<TProvider, TState, TItem> | null>(
    null
  );

  if (flowRef.current === null) {
    const wrappedSteps: CheckoutStep<TItem>[] = props.steps.map((step) => ({
      ...step,
      guard: step.guard
        ? (state: CheckoutFlowState<TItem>) => {
            const latest = propsRef.current.steps.find((s) => s.id === step.id);
            return latest?.guard ? latest.guard(state) : true;
          }
        : undefined,
    }));

    const wrappedRouter: CheckoutRouterAdapter | undefined = props.router
      ? {
          getCurrentPath: () => propsRef.current.router!.getCurrentPath(),
          push: (path: string) => propsRef.current.router!.push(path),
          subscribe: props.router.subscribe
            ? (cb: (path: string) => void) =>
                propsRef.current.router!.subscribe!(cb)
            : undefined,
        }
      : undefined;

    const config: CheckoutFlowConfig<TProvider, TState, TItem> = {
      ...(props as unknown as CheckoutFlowConfig<TProvider, TState, TItem>),
      steps: wrappedSteps,
      cart,
      router: wrappedRouter,
      onCreateSession: (state) => propsRef.current.onCreateSession(state),
      onUpdateSession: props.onUpdateSession
        ? (patch) => propsRef.current.onUpdateSession!(patch)
        : undefined,
      onEvent: props.onEvent
        ? (event) => propsRef.current.onEvent!(event)
        : undefined,
      authenticate: props.authenticate
        ? () => propsRef.current.authenticate!()
        : undefined,
    };

    flowRef.current = createCheckoutFlow<TProvider, TState, TItem>(config, {
      deferMount: true,
    });
  }
  const flow = flowRef.current;

  useEffect(() => {
    flow.mount();
    return () => {
      flow.destroy();
      flowRef.current = null;
    };
  }, [flow]);

  useEffect(() => {
    if (cart === undefined) return;
    flow.setCart(cart);
  }, [cart, flow]);

  return (
    <CioCheckoutContext.Provider value={flow}>
      {children}
    </CioCheckoutContext.Provider>
  );
}
