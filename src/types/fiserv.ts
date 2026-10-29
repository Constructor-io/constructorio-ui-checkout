import type { BasePaymentSession } from './index';

/** What `onCreateSession` returns for `provider="fiserv"`: the credentials call's result plus the ids the SDK needs. */
export interface FiservPaymentSession extends BasePaymentSession {
  /** Fiserv PaymentSession id. The server charges it after the card is captured. */
  sessionId: string;
  accessToken: string;
  publicKey: string;
  keyId: string;
  /** The CommerceHub API key. Public; the secret stays on the server. */
  apiKey: string;
  merchantId: string;
  terminalId: string;
  environment: 'cert' | 'prod';
}

export interface FiservSubmitResult {
  isSuccessful?: boolean;
  gatewayResponse?: {
    transactionState?: string;
    transactionProcessingDetails?: { transactionId?: string };
  };
}

export interface FiservPaymentFields {
  submit: () => Promise<FiservSubmitResult>;
  destroyFields?: () => void;
}

export interface FiservSdk {
  init: (options: Record<string, unknown>) => Promise<void>;
  components: {
    paymentFields: (
      options: Record<string, unknown>
    ) => Promise<FiservPaymentFields>;
  };
}

declare global {
  interface Window {
    fiserv?: FiservSdk;
  }
}
