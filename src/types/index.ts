/**
 * Represents an item for checkout.
 */
export interface CheckoutItem {
  /** Product name displayed in checkout */
  name: string;
  /** Price as a float (e.g., 49.99) */
  amount: number;
  /** Currency sign (e.g., '$', '€', '£') */
  currencySign?: string;
  /** Quantity (defaults to 1) */
  quantity?: number;
  /** Optional Stripe Price ID. When provided, used instead of amount/name */
  priceId?: string;
  /** Optional image URL for display in the trigger */
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * The data needed to mount Stripe Embedded Checkout.
 */
export interface CheckoutSessionResponse {
  clientSecret: string;
  publishableKey: string;
}

/**
 * How the checkout session is obtained:
 * - The session response directly: `{ clientSecret, publishableKey }`
 * - A function that returns it: `() => Promise<{ clientSecret, publishableKey }>`
 */
export type CheckoutSession =
  | CheckoutSessionResponse
  | (() => Promise<CheckoutSessionResponse>);

// ---------------------------------------------------------------------------
// Checkout config
// ---------------------------------------------------------------------------

/**
 * Core checkout data — items + session + Stripe UI options.
 * CioCheckoutProps extends this with UI-specific fields.
 */
export interface CheckoutConfig {
  /** Items for checkout display — static value, array, or async function */
  items?:
    | CheckoutItem
    | CheckoutItem[]
    | (() => Promise<CheckoutItem | CheckoutItem[]>);
  /** How to get the checkout session — response object or function. Optional when using the registry. */
  session?: CheckoutSession;
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

export interface CheckoutCompleteEvent {
  /** Stripe Checkout Session ID — use this to retrieve transaction details from your backend */
  sessionId: string;
  /** The items passed to the checkout, resolved to an array (undefined if no items were provided) */
  items: CheckoutItem[] | undefined;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface CioCheckoutCallbacks {
  /** Called when payment completes successfully */
  onComplete?: (event: CheckoutCompleteEvent) => void;
  /** Called when the user closes/dismisses the checkout */
  onClose?: () => void;
  /** Called when an error occurs during session creation or payment */
  onError?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Imperative handle
// ---------------------------------------------------------------------------

export interface CioCheckoutHandle {
  reset: () => void;
}

export interface CioCheckoutProps<
  TState = Record<string, unknown>,
> extends CheckoutConfig {
  /** Callbacks for checkout lifecycle events */
  callbacks?: CioCheckoutCallbacks;
  /** Custom trigger element. If not provided, a default button is rendered. */
  trigger?: React.ReactNode;
  /** Custom label for the default trigger button */
  triggerLabel?: string;
  /**
   * Controls when the checkout trigger is visible.
   * Receives state from the integrating library and returns a boolean.
   * When omitted the trigger is always shown.
   */
  triggerWhen?: (state: TState) => boolean;
  /** State passed to triggerWhen — provided by the integrating library (PIA, search, etc.) */
  triggerState?: TState;
  /**
   * How the checkout UI is displayed:
   * - `'modal'` (default): renders in a dialog overlay
   * - `'inline'`: renders directly in the page with a cancel button
   */
  displayMode?: 'modal' | 'inline';
}
