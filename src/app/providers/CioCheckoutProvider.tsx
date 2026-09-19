import React, { useEffect, useRef } from 'react';

import { CioCheckoutContext } from '@src/app/providers/CioCheckoutContext';
import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type {
  CheckoutFlowConfig,
  CheckoutFlowCore,
  FlowState,
  RouterAdapter,
  Step,
} from '@src/core/types';
import type { BuiltInPaymentProvider } from '@src/types';

import '@src/styles.css';

export interface CioCheckoutProviderProps<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
> extends CheckoutFlowConfig<TProvider, TState> {
  children?: React.ReactNode;
}

export function CioCheckoutProvider<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
>(props: CioCheckoutProviderProps<TProvider, TState>): React.ReactElement {
  const { children, cart } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const flowRef = useRef<CheckoutFlowCore<TProvider, TState> | null>(null);

  if (flowRef.current === null) {
    const wrappedSteps: Step[] = props.steps.map((step) => ({
      ...step,
      guard: step.guard
        ? (state: FlowState) => {
            const latest = propsRef.current.steps.find((s) => s.id === step.id);
            return latest?.guard ? latest.guard(state) : true;
          }
        : undefined,
    }));

    const wrappedRouter: RouterAdapter | undefined = props.router
      ? {
          getCurrentPath: () => propsRef.current.router!.getCurrentPath(),
          push: (path: string) => propsRef.current.router!.push(path),
          subscribe: props.router.subscribe
            ? (cb: (path: string) => void) =>
                propsRef.current.router!.subscribe!(cb)
            : undefined,
        }
      : undefined;

    flowRef.current = createCheckoutFlow<TProvider, TState>(
      {
        ...props,
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
      },
      { deferMount: true }
    );
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
    <CioCheckoutContext.Provider
      value={flow as unknown as CheckoutFlowCore<string, unknown>}
    >
      {children}
    </CioCheckoutContext.Provider>
  );
}
