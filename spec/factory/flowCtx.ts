import { createEmitter } from '@src/core/emitter';
import type { FlowContext } from '@src/core/flow/context';
import { makeInitialState } from '@src/core/flow/helpers';
import { createStore } from '@src/core/store';
import type {
  CheckoutEvent,
  CheckoutFlowConfig,
  FlowState,
  Step,
} from '@src/core/types';

export interface MakeCtxOptions<TState = unknown> {
  steps?: Step[];
  config?: Partial<CheckoutFlowConfig<TState>>;
  destroyed?: boolean;
}

export function makeCtx<TState = unknown>(
  options: MakeCtxOptions<TState> = {}
) {
  const steps = options.steps ?? [{ id: 'a' }, { id: 'b' }];
  const events = createEmitter();
  const captured: CheckoutEvent[] = [];
  events.on((e) => captured.push(e));
  const store = createStore<FlowState>(makeInitialState());
  const config: CheckoutFlowConfig<TState> = {
    steps,
    onCreateSession: () =>
      Promise.resolve({
        clientSecret: 'cs_test_a_secret_x',
        publishableKey: 'pk_test',
      }),
    ...options.config,
  };
  let destroyed = options.destroyed ?? false;
  const ctx: FlowContext<TState> = {
    config,
    steps,
    store,
    events,
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
