import React, { useEffect, useRef } from 'react';

import { CheckoutFlowContext } from '@src/app/providers/CheckoutFlowContext';
import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type {
  CheckoutFlowConfig,
  CheckoutFlowCore,
  FlowState,
  RouterAdapter,
  Step,
} from '@src/core/types';

import '@src/styles.css';

export interface CheckoutFlowProviderProps<
  TState = unknown,
> extends CheckoutFlowConfig<TState> {
  children?: React.ReactNode;
}

export function CheckoutFlowProvider<TState = unknown>(
  props: CheckoutFlowProviderProps<TState>
): React.ReactElement {
  const { children, cart } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const flowRef = useRef<CheckoutFlowCore<TState> | null>(null);

  if (flowRef.current === null) {
    // Wrap step guards and callbacks so merchants can change them across
    // rerenders without recreating the flow. Each shim reads the current prop
    // through propsRef at call time; presence at mount decides shape.
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

    flowRef.current = createCheckoutFlow<TState>(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cart === undefined) return;
    flow.setCart(cart);
  }, [cart, flow]);

  return (
    <CheckoutFlowContext.Provider value={flow as CheckoutFlowCore<unknown>}>
      {children}
    </CheckoutFlowContext.Provider>
  );
}
