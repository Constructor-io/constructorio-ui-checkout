import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type {
  CheckoutFlowConfig,
  CheckoutFlowCore,
  CheckoutFlowCoreBase,
} from '@src/core/types';
import type { BaseCartItem, BuiltInPaymentProvider } from '@src/types';

class CioCheckoutRegistry {
  private flow: CheckoutFlowCoreBase<string, unknown> | null = null;

  register<TProvider extends string, TState, TItem = BaseCartItem>(
    flow: CheckoutFlowCore<TProvider, TState, TItem>
  ): void {
    if (this.flow && this.flow !== flow) {
      this.flow.destroy();
    }
    this.flow = flow;
  }

  getFlow<
    TProvider extends string = BuiltInPaymentProvider,
    TState = unknown,
    TItem = BaseCartItem,
  >(): CheckoutFlowCore<TProvider, TState, TItem> | null {
    return this.flow as CheckoutFlowCore<TProvider, TState, TItem> | null;
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

  resume<
    TProvider extends string = BuiltInPaymentProvider,
    TState = unknown,
    TItem = BaseCartItem,
  >(
    config: CheckoutFlowConfig<TProvider, TState, TItem>
  ): CheckoutFlowCore<TProvider, TState, TItem> {
    const storage = config.storage ?? createSessionStorageAdapter<TItem>();
    const flow = createCheckoutFlow<TProvider, TState, TItem>({
      ...config,
      storage,
    });
    this.register(flow);
    return flow;
  }
}

const cioCheckoutRegistry = new CioCheckoutRegistry();
export default cioCheckoutRegistry;
export { CioCheckoutRegistry };
