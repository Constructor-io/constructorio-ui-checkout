import type {
  BaseCartItem,
  BuiltInPaymentProvider,
  CartItemAccessors,
  PaymentSessionFor,
} from '@src/types';

export type CheckoutStepId = string;

export interface CheckoutStep<TItem = BaseCartItem> {
  id: CheckoutStepId;
  path?: string;
  optional?: boolean;
  guard?: (state: CheckoutFlowState<TItem>) => boolean | Promise<boolean>;
}

export type CheckoutSessionStatus =
  | 'idle'
  | 'creating'
  | 'active'
  | 'expired'
  | 'error';

export interface CheckoutFlowState<TItem = BaseCartItem> {
  currentStepId: CheckoutStepId | null;
  completedStepIds: CheckoutStepId[];
  cartSnapshot: TItem[];
  currency: string | null;
  sessionId: string | null;
  sessionStatus: CheckoutSessionStatus;
  metadata: Record<string, unknown>;
  schemaVersion: 1;
}

export interface CheckoutStorageAdapter<TItem = BaseCartItem> {
  load(key: string): Promise<CheckoutFlowState<TItem> | null>;
  save(key: string, state: CheckoutFlowState<TItem>): Promise<void>;
  clear(key: string): Promise<void>;
}

export interface CheckoutRouterAdapter {
  push(path: string): void;
  getCurrentPath(): string;
  subscribe?(cb: (path: string) => void): () => void;
}

export type CheckoutSessionUpdateReason =
  | 'items'
  | 'address'
  | 'tax'
  | 'shipping'
  | 'coupon'
  | 'stock'
  | 'price'
  | 'manual';

export interface CheckoutSessionDiff<TItem = BaseCartItem> {
  added?: TItem[];
  removed?: TItem[];
  quantityChanges?: { id: string; from: number; to: number }[];
  totalChange?: { from: number; to: number };
}

export interface CheckoutSessionUpdatePatch<TItem = BaseCartItem> {
  items?: TItem[];
  metadata?: Record<string, unknown>;
  reason?: CheckoutSessionUpdateReason;
}

export type CheckoutEventErrorSource =
  | 'session.create'
  | 'session.update'
  | 'payment.confirm'
  | 'storage'
  | 'router'
  | 'guard'
  | 'authenticate';

export type CheckoutEvent<TItem = BaseCartItem> =
  | { type: 'flow.started' }
  | { type: 'flow.completed' }
  | {
      type: 'step.entered';
      stepId: CheckoutStepId;
      from: CheckoutStepId | null;
    }
  | { type: 'step.exited'; stepId: CheckoutStepId; to: CheckoutStepId | null }
  | { type: 'session.created'; sessionId: string }
  | {
      type: 'session.updated';
      sessionId: string;
      reason: CheckoutSessionUpdateReason;
      diff: CheckoutSessionDiff<TItem>;
    }
  | { type: 'session.expired'; sessionId: string }
  | { type: 'session.recreated'; oldSessionId: string; newSessionId: string }
  | { type: 'state.changed'; state: CheckoutFlowState<TItem> }
  | {
      type: 'error';
      source: CheckoutEventErrorSource;
      error: Error;
      retry?: () => Promise<void>;
    };

export type CheckoutEventType = CheckoutEvent['type'];

export interface CheckoutAuthResult {
  userId: string;
  [key: string]: unknown;
}

export interface CompiledCartItemAccessors<TItem> {
  getId: (item: TItem) => string;
  getQuantity: (item: TItem) => number;
  getUnitAmount: (item: TItem) => number;
  getName: ((item: TItem) => string) | null;
}

export interface CheckoutFlowConfig<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
  TItem = BaseCartItem,
> {
  provider: TProvider;
  steps: CheckoutStep<TItem>[];
  storageKey?: string;
  storage?: CheckoutStorageAdapter<TItem>;
  router?: CheckoutRouterAdapter;
  authenticate?: () => Promise<CheckoutAuthResult | null>;
  onCreateSession: (
    state: CheckoutFlowState<TItem>
  ) => Promise<PaymentSessionFor<TProvider>>;
  onUpdateSession?: (
    patch: CheckoutSessionUpdatePatch<TItem>
  ) => Promise<PaymentSessionFor<TProvider>>;
  onEvent?: (event: CheckoutEvent<TItem>) => void;
  cart?: TItem[];
  currency?: string;
  cartDebounceMs?: number;
  initialState?: TState;
  autoStart?: boolean;
  storageSaveDebounceMs?: number;
  storageAutoResume?: boolean;
  cartItemFields?: CartItemAccessors<TItem>;
}

export interface CreateCheckoutFlowOptions {
  deferMount?: boolean;
}

export interface CheckoutFlowCoreBase<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
> {
  readonly provider: TProvider;
  mount(): void;
  start(): Promise<void>;
  next(opts?: { skip?: boolean }): Promise<void>;
  back(): Promise<void>;
  goTo(stepId: CheckoutStepId): Promise<void>;
  complete(): void;
  clearState(): Promise<void>;
  getIntegratorState(): TState;
  setIntegratorState(updater: (prev: TState) => TState): void;
  getSession(): PaymentSessionFor<TProvider> | null;
  createSession(): Promise<PaymentSessionFor<TProvider> | null>;
  recreate(): Promise<PaymentSessionFor<TProvider> | null>;
  markExpired(): void;
  destroy(): void;
  isDestroyed(): boolean;
  emitError(
    source: CheckoutEventErrorSource,
    error: Error,
    retry?: () => Promise<void>
  ): void;
}

export interface CheckoutFlowCore<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
  TItem = BaseCartItem,
> extends CheckoutFlowCoreBase<TProvider, TState> {
  getState(): CheckoutFlowState<TItem>;
  subscribe(listener: (state: CheckoutFlowState<TItem>) => void): () => void;
  hydrate(state: CheckoutFlowState<TItem>): void;
  updateSession(
    patch: CheckoutSessionUpdatePatch<TItem>
  ): Promise<PaymentSessionFor<TProvider> | null>;
  syncCart(items: TItem[]): Promise<PaymentSessionFor<TProvider> | null>;
  setCart(items: TItem[]): void;
  on(listener: (event: CheckoutEvent<TItem>) => void): () => void;
}

export type RequireAccessorsIfNeeded<TItem> = TItem extends BaseCartItem
  ? { cartItemFields?: CartItemAccessors<TItem> }
  : { cartItemFields: CartItemAccessors<TItem> };

export const CREATE_SESSION_STEP: CheckoutStepId = 'createSession';
export const PAYMENT_STEP: CheckoutStepId = 'payment';
export const FLOW_SCHEMA_VERSION = 1 as const;
