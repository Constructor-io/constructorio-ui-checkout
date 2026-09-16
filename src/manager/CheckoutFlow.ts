import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type {
  CheckoutFlowConfig,
  CheckoutFlowCore,
  FlowState,
  SessionUpdatePatch,
  StepId,
} from '@src/core/types';
import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

// Imperative wrapper over createCheckoutFlow for non-React apps and the
// standalone bundle. Same behavior, class-shaped surface. All methods delegate
// to the framework-agnostic core built in src/core.
export class CheckoutFlow<TState = unknown> {
  private readonly core: CheckoutFlowCore<TState>;

  constructor(config: CheckoutFlowConfig<TState>) {
    this.core = createCheckoutFlow<TState>(config);
  }

  getState(): FlowState {
    return this.core.getState();
  }

  subscribe(listener: (state: FlowState) => void): () => void {
    return this.core.subscribe(listener);
  }

  start(): Promise<void> {
    return this.core.start();
  }

  next(opts?: { skip?: boolean }): Promise<void> {
    return this.core.next(opts);
  }

  back(): Promise<void> {
    return this.core.back();
  }

  goTo(stepId: StepId): Promise<void> {
    return this.core.goTo(stepId);
  }

  complete(): void {
    this.core.complete();
  }

  hydrate(state: FlowState): void {
    this.core.hydrate(state);
  }

  reset(): void {
    this.core.reset();
  }

  clearState(): Promise<void> {
    return this.core.clearState();
  }

  getSession(): CheckoutSessionResponse | null {
    return this.core.getSession();
  }

  createSession(): Promise<CheckoutSessionResponse | null> {
    return this.core.createSession();
  }

  updateSession(
    patch: SessionUpdatePatch
  ): Promise<CheckoutSessionResponse | null> {
    return this.core.updateSession(patch);
  }

  recreate(): Promise<CheckoutSessionResponse | null> {
    return this.core.recreate();
  }

  markExpired(): void {
    this.core.markExpired();
  }

  syncCart(items: CheckoutItem[]): Promise<CheckoutSessionResponse | null> {
    return this.core.syncCart(items);
  }

  setCart(items: CheckoutItem[]): void {
    this.core.setCart(items);
  }

  getIntegratorState(): TState {
    return this.core.getIntegratorState();
  }

  setIntegratorState(updater: (prev: TState) => TState): void {
    this.core.setIntegratorState(updater);
  }

  destroy(): void {
    this.core.destroy();
  }
}
