export interface ShopPayMoney {
  amount: number;
  currencyCode: string;
}

export interface ShopPayDeliveryMethod {
  code: string;
  label: string;
  amount: ShopPayMoney;
}

export interface ShopPayLineItem {
  label: string;
  quantity: number;
  originalItemPrice: ShopPayMoney;
  finalItemPrice: ShopPayMoney;
  originalLinePrice: ShopPayMoney;
  finalLinePrice: ShopPayMoney;
  requiresShipping: boolean;
}

/** What the Shop Pay popup shows. Shopify's browser `PaymentRequest`, money as numbers. */
export interface ShopPayPaymentRequest {
  lineItems: ShopPayLineItem[];
  shippingLines: ShopPayDeliveryMethod[];
  deliveryMethods: ShopPayDeliveryMethod[];
  totalShippingPrice: { finalTotal: ShopPayMoney };
  discountCodes: string[];
  subtotal: ShopPayMoney;
  total: ShopPayMoney;
  locale: string;
  presentmentCurrency: string;
}

/** What the server's Storefront `shopPayPaymentRequestSessionCreate` call returns. */
export interface ShopPaySessionResponse {
  token: string;
  checkoutUrl: string;
  sourceIdentifier: string;
}

export type ShopPayReceiptState =
  | 'processing'
  | 'completed'
  | 'action_required'
  | 'failed';

/** The receipt's processing status, from the server's Admin API lookup. */
export interface ShopPayReceiptStatus {
  state: ShopPayReceiptState;
  errorCode?: string;
  message?: string;
}

interface ShopPayUserError {
  type: 'generalError' | 'shippingAddressError';
  message: string;
}

interface ShopPayUpdate {
  updatedPaymentRequest?: ShopPayPaymentRequest;
  errors?: ShopPayUserError[];
}

export interface ShopPaySdkSession {
  paymentRequest?: { paymentMethod?: string };
  addEventListener: (
    name: string,
    listener: (event: unknown) => unknown
  ) => void;
  completeSessionRequest: (
    response: ShopPaySessionResponse & ShopPayUpdate
  ) => void;
  completeShippingAddressChange: (update: ShopPayUpdate) => void;
  completeDeliveryMethodChange: (update: ShopPayUpdate) => void;
  completePaymentConfirmationRequest: (update?: ShopPayUpdate) => void;
  close: () => void;
}

export interface ShopPaySdk {
  PaymentRequest: {
    configure: (options: Record<string, unknown>) => void;
    build: (request: ShopPayPaymentRequest) => ShopPayPaymentRequest;
    createButton: () => {
      render: (selector: string) => void;
    };
    createSession: (options: {
      paymentRequest: ShopPayPaymentRequest;
    }) => ShopPaySdkSession;
  };
}

declare global {
  interface Window {
    ShopPay?: ShopPaySdk;
  }
}
