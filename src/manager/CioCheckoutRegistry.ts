import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type { CheckoutFlowConfig, CheckoutFlowCore } from '@src/core/types';
import type { BuiltInPaymentProvider } from '@src/types';

class CioCheckoutRegistry {
  private flow: CheckoutFlowCore<string, unknown> | null = null;

  register<TProvider extends string, TState>(
    flow: CheckoutFlowCore<TProvider, TState>
  ): void {
    const erased = flow as unknown as CheckoutFlowCore<string, unknown>;
    if (this.flow && this.flow !== erased) {
      this.flow.destroy();
    }
    this.flow = erased;
  }

  getFlow<
    TProvider extends string = BuiltInPaymentProvider,
    TState = unknown,
  >(): CheckoutFlowCore<TProvider, TState> | null {
    return this.flow as unknown as CheckoutFlowCore<TProvider, TState> | null;
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

  resume<TProvider extends string = BuiltInPaymentProvider, TState = unknown>(
    config: CheckoutFlowConfig<TProvider, TState>
  ): CheckoutFlowCore<TProvider, TState> {
    const storage = config.storage ?? createSessionStorageAdapter();
    const flow = createCheckoutFlow<TProvider, TState>({ ...config, storage });
    this.register(flow);
    return flow;
  }
}

const cioCheckoutRegistry = new CioCheckoutRegistry();
export default cioCheckoutRegistry;
export { CioCheckoutRegistry };
