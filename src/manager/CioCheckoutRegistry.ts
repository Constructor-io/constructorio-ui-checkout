import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type { CheckoutFlowConfig } from '@src/core/types';
import { CioCheckoutFlow } from '@src/manager/CioCheckoutFlow';

// Non-React singleton so any CIO library on the page (e.g. pia dispatching an
// add-to-cart mid-flow) can reach the active CioCheckoutFlow instance. resume()
// is the typical entry point for the standalone-bundle case — it creates a
// flow with the default sessionStorage adapter, registers it, and returns it.
// Stored as `CioCheckoutFlow<unknown>` for type erasure — the merchant asserts
// TState on read via getFlow/resume generics.
class CioCheckoutRegistry {
  private flow: CioCheckoutFlow<unknown> | null = null;

  register<TState>(flow: CioCheckoutFlow<TState>): void {
    const erased = flow as CioCheckoutFlow<unknown>;
    if (this.flow && this.flow !== erased) {
      this.flow.destroy();
    }
    this.flow = erased;
  }

  getFlow<TState = unknown>(): CioCheckoutFlow<TState> | null {
    return this.flow as CioCheckoutFlow<TState> | null;
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
  ): CioCheckoutFlow<TState> {
    const storage = config.storage ?? createSessionStorageAdapter();
    const flow = new CioCheckoutFlow<TState>({ ...config, storage });
    this.register(flow);
    return flow;
  }
}

const cioCheckoutRegistry = new CioCheckoutRegistry();
export default cioCheckoutRegistry;
export { CioCheckoutRegistry };
