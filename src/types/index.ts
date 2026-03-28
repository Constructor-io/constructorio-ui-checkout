/**
 * Represents an item for checkout.
 * Flexible enough for PIA single-item or cart-level multi-item use.
 */
export interface CheckoutItem {
  /** Product name displayed in checkout */
  name: string;
  /** Price in cents (e.g., 4999 = $49.99) */
  amountCents: number;
  /** Quantity (defaults to 1) */
  quantity?: number;
  /** Currency code (defaults to 'usd') */
  currency?: string;
  /** Optional Stripe Price ID. When provided, used instead of amountCents/name */
  priceId?: string;
  /** Optional image URL for display in the trigger */
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Session fetch configuration
// ---------------------------------------------------------------------------

/**
 * Response shape from the checkout session endpoint.
 * The library needs clientSecret and publishableKey to mount Stripe Embedded Checkout.
 */
export interface CheckoutSessionResponse {
  clientSecret: string;
  publishableKey: string;
}

// ---------------------------------------------------------------------------
// Discriminated union: `source` is the divergent key
// ---------------------------------------------------------------------------

interface BaseCheckoutConfig {
  /** Stripe redirect behavior after payment */
  redirectOnCompletion?: 'if_required' | 'never' | 'always';
  /** Custom return URL for redirect-based payment methods */
  returnUrl?: string;
}

/**
 * source: 'items' — you provide items directly.
 * The library owns the fetch to create a checkout session.
 */
export interface ItemsSourceConfig extends BaseCheckoutConfig {
  source: 'items';
  /** A single item or array of items for checkout */
  items: CheckoutItem | CheckoutItem[];
  /** Your backend endpoint that creates a Stripe Checkout Session */
  sessionUrl: string;
  /** Optional headers to send with the session fetch (e.g., auth tokens) */
  sessionHeaders?: Record<string, string>;
  /** Stripe publishable key — required for items source */
  publishableKey: string;
}

/**
 * source: 'function' — you provide a function that resolves items.
 * The library calls the function, then owns the fetch to create a checkout session.
 */
export interface FunctionSourceConfig extends BaseCheckoutConfig {
  source: 'function';
  /** Async function that returns a single item or array of items */
  getItems: () => Promise<CheckoutItem | CheckoutItem[]>;
  /** Your backend endpoint that creates a Stripe Checkout Session */
  sessionUrl: string;
  /** Optional headers to send with the session fetch (e.g., auth tokens) */
  sessionHeaders?: Record<string, string>;
  /** Stripe publishable key — required for function source */
  publishableKey: string;
}

/**
 * source: 'session' — you fully control session creation.
 * Provide either fetchSession or sessionUrl+headers; the library just mounts Stripe.
 */
export interface SessionSourceConfig extends BaseCheckoutConfig {
  source: 'session';
  /** Async function that returns { clientSecret, publishableKey } */
  fetchSession: () => Promise<CheckoutSessionResponse>;
}

/**
 * The checkout source config — discriminated on the `source` field.
 * TypeScript narrows the type based on which `source` value is provided.
 */
export type CheckoutSourceConfig =
  | ItemsSourceConfig
  | FunctionSourceConfig
  | SessionSourceConfig;

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface CioCheckoutCallbacks {
  /** Called when payment completes successfully */
  onComplete?: () => void;
  /** Called when the user closes/dismisses the checkout */
  onClose?: () => void;
  /** Called when an error occurs during session creation or payment */
  onError?: (error: Error) => void;
}

export interface CioCheckoutProps extends CheckoutSourceConfig {
  /** Callbacks for checkout lifecycle events */
  callbacks?: CioCheckoutCallbacks;
  /** Custom trigger element. If not provided, a default button is rendered. */
  trigger?: React.ReactNode;
  /** Custom label for the default trigger button */
  triggerLabel?: string;
}
