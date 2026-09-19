import { createEmitter } from '@src/core/emitter';
import type { FlowContext } from '@src/core/flow/context';
import {
  compileCartItemAccessors,
  makeInitialState,
} from '@src/core/flow/helpers';
import { createStore } from '@src/core/store';
import type {
  CheckoutEvent,
  CheckoutFlowConfig,
  CheckoutFlowState,
  CheckoutStep,
} from '@src/core/types';
import type { BaseCartItem } from '@src/types';

export interface MakeCtxOptions<TState = unknown> {
  steps?: CheckoutStep[];
  config?: Partial<CheckoutFlowConfig<'stripe', TState>>;
  destroyed?: boolean;
}

export function makeCtx<TState = unknown>(
  options: MakeCtxOptions<TState> = {}
) {
  const steps = options.steps ?? [{ id: 'a' }, { id: 'b' }];
  const events = createEmitter<BaseCartItem>();
  const captured: CheckoutEvent[] = [];
  events.on((e) => captured.push(e));
  const store =
    createStore<CheckoutFlowState>(makeInitialState<BaseCartItem>());
  const config: CheckoutFlowConfig<'stripe', TState> = {
    provider: 'stripe',
    steps,
    onCreateSession: () =>
      Promise.resolve({
        clientSecret: 'cs_test_a_secret_x',
        publishableKey: 'pk_test',
      }),
    ...options.config,
  };
  let destroyed = options.destroyed ?? false;
  const ctx: FlowContext<'stripe', TState> = {
    config,
    steps,
    store,
    events,
    accessors: compileCartItemAccessors<BaseCartItem>(config.cartItemFields),
    isDestroyed: () => destroyed,
    emitError: (source, error, retry) => {
      events.emit({ type: 'error', source, error, retry });
    },
  };
  return {
    ctx,
    events: captured,
    setDestroyed: (v: boolean) => {
      destroyed = v;
    },
  };
}
