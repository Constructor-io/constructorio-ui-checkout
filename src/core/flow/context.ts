import type { BaseCartItem } from '@src/types';

import type { createEmitter } from '../emitter';
import type { createStore } from '../store';
import type {
  CheckoutEventErrorSource,
  CheckoutFlowConfig,
  CheckoutFlowState,
  CheckoutStep,
  CompiledCartItemAccessors,
} from '../types';

export interface FlowContext<
  TProvider extends string = string,
  TState = unknown,
  TItem = BaseCartItem,
> {
  config: CheckoutFlowConfig<TProvider, TState, TItem>;
  steps: CheckoutStep<TItem>[];
  store: ReturnType<typeof createStore<CheckoutFlowState<TItem>>>;
  events: ReturnType<typeof createEmitter<TItem>>;
  accessors: CompiledCartItemAccessors<TItem>;
  isDestroyed(this: void): boolean;
  emitError(
    this: void,
    source: CheckoutEventErrorSource,
    error: Error,
    retry?: () => Promise<void>
  ): void;
}
