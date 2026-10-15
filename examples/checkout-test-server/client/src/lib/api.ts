export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tier: "standard" | "vip";
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface ShippingRate {
  id: string;
  label: string;
  amount: number;
  etaDays: string;
}

export interface CheckoutSessionRequestItem {
  name: string;
  amount: number;
  quantity?: number;
}

export interface CheckoutSessionResponse {
  clientSecret: string;
  publishableKey: string;
  shippingApplied?: { id: string; label: string; amount: number } | null;
}

async function jsonFetch<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const hasBody = init?.body !== undefined && init?.body !== null;
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (hasBody && !headers["Content-Type"])
    headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(input, { ...init, headers });
  } catch (err) {
    throw new Error(
      `Network error calling ${method} ${String(input)}. ` +
        `Is the demo server running? Check PORT in .env and run \`npm run dev\`.`,
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error || `Request failed (${res.status})`,
    );
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    jsonFetch<{ user: AuthUser }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  listAddresses: () => jsonFetch<{ addresses: Address[] }>("/api/addresses"),

  listShippingRates: (addressId: string) =>
    jsonFetch<{ rates: ShippingRate[] }>(
      `/api/shipping-rates?addressId=${encodeURIComponent(addressId)}`,
    ),

  createCheckoutSession: (payload: {
    items: CheckoutSessionRequestItem[];
    addressId?: string;
    shippingId?: string;
    uiMode?: "elements" | "form";
  }) =>
    jsonFetch<CheckoutSessionResponse>("/api/checkout-session", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCheckoutSession: (payload: {
    items: CheckoutSessionRequestItem[];
    addressId?: string;
    shippingId?: string;
    uiMode?: "elements" | "form";
  }) =>
    jsonFetch<CheckoutSessionResponse>("/api/checkout-session/update", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  fulfill: (sessionId: string) =>
    jsonFetch<{ success: boolean; message: string }>(
      `/api/checkout-session/${encodeURIComponent(sessionId)}/fulfill`,
      { method: "POST" },
    ),

  loadFlowState: (userId: string) =>
    jsonFetch<{ state: unknown }>(
      `/api/flow-state?userId=${encodeURIComponent(userId)}`,
    ),

  saveFlowState: (userId: string, state: unknown) =>
    jsonFetch<{ ok: true }>(
      `/api/flow-state?userId=${encodeURIComponent(userId)}`,
      { method: "PUT", body: JSON.stringify(state) },
    ),

  clearFlowState: (userId: string) =>
    jsonFetch<{ ok: true }>(
      `/api/flow-state?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
};
