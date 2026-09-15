import React, { useEffect, useRef } from 'react';

import { CheckoutFlowContext } from '@src/app/providers/CheckoutFlowContext';
import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type {
  CheckoutFlowConfig,
  CheckoutFlowCore,
  FlowState,
  Step,
} from '@src/core/types';

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
    const wrappedSteps: Step[] = props.steps.map((step) => ({
      ...step,
      guard: step.guard
        ? (state: FlowState) => {
            const latest = propsRef.current.steps.find(
              (s) => s.id === step.id
            );
            return latest?.guard ? latest.guard(state) : true;
          }
        : undefined,
    }));

    const hasOnUpdateSession = props.onUpdateSession !== undefined;
    const hasOnEvent = props.onEvent !== undefined;
    const hasAuthenticate = props.authenticate !== undefined;

    flowRef.current = createCheckoutFlow<TState>({
      ...props,
      steps: wrappedSteps,
      cart,
      onCreateSession: (state) => propsRef.current.onCreateSession(state),
      onUpdateSession: hasOnUpdateSession
        ? (patch) => propsRef.current.onUpdateSession!(patch)
        : undefined,
      onEvent: hasOnEvent
        ? (event) => propsRef.current.onEvent!(event)
        : undefined,
      authenticate: hasAuthenticate
        ? () => propsRef.current.authenticate!()
        : undefined,
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

  return (
    <CheckoutFlowContext.Provider value={flow as CheckoutFlowCore<unknown>}>
      {children}
    </CheckoutFlowContext.Provider>
  );
}
