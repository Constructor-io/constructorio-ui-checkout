import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type { CheckoutFlowConfig } from '@src/core/types';
import { CheckoutFlow } from '@src/manager/CheckoutFlow';

// Non-React singleton so any CIO library on the page (e.g. pia dispatching an
// add-to-cart mid-flow) can reach the active CheckoutFlow instance. resume()
// is the typical entry point for the standalone-bundle case — it creates a
// flow with the default sessionStorage adapter, registers it, and returns it.
// Stored as `CheckoutFlow<unknown>` for type erasure — the merchant asserts
// TState on read via getFlow/resume generics.
class CheckoutRegistry {
  private flow: CheckoutFlow<unknown> | null = null;

  register<TState>(flow: CheckoutFlow<TState>): void {
    const erased = flow as CheckoutFlow<unknown>;
    if (this.flow && this.flow !== erased) {
      this.flow.destroy();
    }
    this.flow = erased;
  }

  getFlow<TState = unknown>(): CheckoutFlow<TState> | null {
    return this.flow as CheckoutFlow<TState> | null;
  }

  hasFlow(): boolean {
    return this.flow !== null;
  }

  clear(): void {
    if (this.flow) {
      this.flow.destroy();
      this.flow = null;
    }
  }

  resume<TState = unknown>(
    config: CheckoutFlowConfig<TState>
  ): CheckoutFlow<TState> {
    const storage = config.storage ?? createSessionStorageAdapter();
    const flow = new CheckoutFlow<TState>({ ...config, storage });
    this.register(flow);
    return flow;
  }
}

const checkoutRegistry = new CheckoutRegistry();
export default checkoutRegistry;
export { CheckoutRegistry };
