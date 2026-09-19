import type {
  BuiltInPaymentProvider,
  CheckoutItem,
  PaymentSessionFor,
} from '@src/types';

export type StepId = string;

export interface Step {
  id: StepId;
  path?: string;
  optional?: boolean;
  guard?: (state: FlowState) => boolean | Promise<boolean>;
}

export type SessionStatus =
  | 'idle'
  | 'creating'
  | 'active'
  | 'expired'
  | 'error';

export interface FlowState {
  currentStepId: StepId | null;
  completedStepIds: StepId[];
  cartSnapshot: CheckoutItem[];
  sessionId: string | null;
  sessionStatus: SessionStatus;
  /**
   * Persisted verbatim by the configured `storage` adapter. Do not place PII
   * here unless the adapter encrypts or omits it.
   */
  metadata: Record<string, unknown>;
  schemaVersion: 1;
}

export interface StorageAdapter {
  load(key: string): Promise<FlowState | null>;
  save(key: string, state: FlowState): Promise<void>;
  clear(key: string): Promise<void>;
}

export interface RouterAdapter {
  push(path: string): void;
  getCurrentPath(): string;
  subscribe?(cb: (path: string) => void): () => void;
}

export type SessionUpdateReason =
  | 'items'
  | 'address'
  | 'tax'
  | 'shipping'
  | 'coupon'
  | 'stock'
  | 'price'
  | 'manual';

export interface SessionDiff {
  added?: CheckoutItem[];
  removed?: CheckoutItem[];
  quantityChanges?: { id: string; from: number; to: number }[];
  totalChange?: { from: number; to: number };
}

export interface SessionUpdatePatch {
  items?: CheckoutItem[];
  metadata?: Record<string, unknown>;
  reason?: SessionUpdateReason;
}

export type CheckoutEventErrorSource =
  | 'session.create'
  | 'session.update'
  | 'session.recover'
  | 'storage'
  | 'router'
  | 'guard'
  | 'authenticate';

export type CheckoutEvent =
  | { type: 'flow.started' }
  | { type: 'flow.completed' }
  | { type: 'step.entered'; stepId: StepId; from: StepId | null }
  | { type: 'step.exited'; stepId: StepId; to: StepId | null }
  | { type: 'session.created'; sessionId: string }
  | {
      type: 'session.updated';
      sessionId: string;
      reason: SessionUpdateReason;
      diff: SessionDiff;
    }
  | { type: 'session.expired'; sessionId: string }
  | { type: 'session.recreated'; oldSessionId: string; newSessionId: string }
  | { type: 'state.changed'; state: FlowState }
  | {
      type: 'error';
      source: CheckoutEventErrorSource;
      error: Error;
      retry?: () => Promise<void>;
    };

export type CheckoutEventType = CheckoutEvent['type'];

export interface AuthResult {
  userId: string;
  [key: string]: unknown;
}

export interface CheckoutFlowConfig<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
> {
  provider: TProvider;
  steps: Step[];
  storageKey?: string;
  storage?: StorageAdapter;
  router?: RouterAdapter;
  authenticate?: () => Promise<AuthResult | null>;
  onCreateSession: (state: FlowState) => Promise<PaymentSessionFor<TProvider>>;
  onUpdateSession?: (
    patch: SessionUpdatePatch
  ) => Promise<PaymentSessionFor<TProvider>>;
  onEvent?: (event: CheckoutEvent) => void;
  cart?: CheckoutItem[];
  cartDebounceMs?: number;
  initialState?: TState;
  autoStart?: boolean;
  storageSaveDebounceMs?: number;
  storageAutoResume?: boolean;
}

export interface CreateCheckoutFlowOptions {
  deferMount?: boolean;
}

export interface CheckoutFlowCore<
  TProvider extends string = BuiltInPaymentProvider,
  TState = unknown,
> {
  readonly provider: TProvider;
  getState(): FlowState;
  subscribe(listener: (state: FlowState) => void): () => void;
  mount(): void;
  start(): Promise<void>;
  next(opts?: { skip?: boolean }): Promise<void>;
  back(): Promise<void>;
  goTo(stepId: StepId): Promise<void>;
  complete(): void;
  hydrate(state: FlowState): void;
  reset(): void;
  clearState(): Promise<void>;
  getIntegratorState(): TState;
  setIntegratorState(updater: (prev: TState) => TState): void;
  getSession(): PaymentSessionFor<TProvider> | null;
  createSession(): Promise<PaymentSessionFor<TProvider> | null>;
  updateSession(
    patch: SessionUpdatePatch
  ): Promise<PaymentSessionFor<TProvider> | null>;
  recreate(): Promise<PaymentSessionFor<TProvider> | null>;
  markExpired(): void;
  syncCart(items: CheckoutItem[]): Promise<PaymentSessionFor<TProvider> | null>;
  setCart(items: CheckoutItem[]): void;
  destroy(): void;
}

export const CREATE_SESSION_STEP: StepId = 'createSession';
export const PAYMENT_STEP: StepId = 'payment';
export const FLOW_SCHEMA_VERSION = 1 as const;
