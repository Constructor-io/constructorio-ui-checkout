import type { createEmitter } from '../emitter';
import type { createStore } from '../store';
import type {
  CheckoutEventErrorSource,
  CheckoutFlowConfig,
  FlowState,
  Step,
} from '../types';

export interface FlowContext<TState = unknown> {
  config: CheckoutFlowConfig<TState>;
  steps: Step[];
  store: ReturnType<typeof createStore<FlowState>>;
  events: ReturnType<typeof createEmitter>;
  isDestroyed: (this: void) => boolean;
  emitError: (
    this: void,
    source: CheckoutEventErrorSource,
    error: Error,
    retry?: () => Promise<void>
  ) => void;
}
